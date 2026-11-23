import { SLOTS_MAX } from './screen';
import { parseDevView } from './dev';
/**
 * Aktionen auf der ganzen Arbeitsfläche. Panels und Tabs gelten überall, die Anordnung je
 * Bildschirm-Einstellung (F-03). Jede Area kann mehrere Panels tragen und ist dann ein Stapel
 * (F-08, F-09); jedes Panel hat Tabs (F-21, F-22).
 */
import {
  type Lines,
  type Orientation,
  type ScreenClassId,
  type ScreenSetup,
  type ScreenSpec,
  allowsTwoLines,
  layoutKey,
  linesKey,
  parseLayoutKey,
  slotSize,
  specOf,
} from './screen';
import { LOOK_DEFAULT } from './look';
import * as T from './tree';
import type { Arrangement, PanelMeta, Area, RulerSettings, Slot, Tab, Workspace } from './types';

/** Mindestgröße, wenn die Oberfläche keine eigene angibt (Anteil der Fläche). */
export const DEFAULT_MIN: T.Min = { w: 0.08, h: 0.12 };

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function newTab(): Tab {
  return { id: newId() };
}

/** F-27: Panel einem Fenster zuordnen ('' = Hauptfenster). */
function inWin(p: PanelMeta, win = ''): PanelMeta {
  return win ? { ...p, win } : p;
}

export function newPanel(name: string): PanelMeta {
  const tab = newTab();
  return { id: newId(), name, tabs: [tab], activeTab: tab.id };
}

export function defaultWorkspace(): Workspace {
  const panels = [1, 2, 3].map((n) => newPanel(`Portal ${n}`));
  return { panels, layouts: {}, preferred: {}, lines: {}, nextNumber: 4, spheres: [], scenarios: [], embed: {}, bookmarks: [], categories: [], ruler: { ...RULER_DEFAULT }, areaNames: [], nextArea: 1, look: { ...LOOK_DEFAULT }, windows: [], winSetup: {} };
}

/** Einstellung aus Klasse und Ausrichtung, ergänzt um die gespeicherte Wahl ein-/zweizeilig. */
export function setupFor(ws: Workspace, cls: ScreenClassId, orientation: Orientation, win = ''): ScreenSetup {
  const lines: Lines = allowsTwoLines(cls) ? (ws.lines[linesKey(cls, orientation)] ?? 2) : 1;
  return win ? { cls, orientation, lines, win } : { cls, orientation, lines };
}

/** F-27: Panels eines Fensters ('' = Hauptfenster). */
export function panelsIn(panels: PanelMeta[], win = ''): PanelMeta[] {
  return panels.filter((p) => (p.win ?? '') === win);
}

export function setLines(ws: Workspace, cls: ScreenClassId, orientation: Orientation, lines: Lines): Workspace {
  return { ...ws, lines: { ...ws.lines, [linesKey(cls, orientation)]: lines } };
}

// ---------------------------------------------------------------- F-26 Ampel

/** Ab dieser Zahl je Area bzw. Panel (Tabs) nehmen Fokus und Übersicht ab. */
export const FOCUS_WARN = 5;
/** Höchstzahl der Panels je Area. */
export const STACK_MAX = 9;
/** Höchstzahl der Tabs je Panel. */
export const TAB_MAX = 9;

const mix = (a: number[], b: number[], t: number) =>
  `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(', ')})`;

/**
 * Farbe nach Anzahl (F-26): 1–5 von Dunkelgrün zu Neongrün in 20-%-Schritten,
 * 6 Gelb, 7 Orange, 8–9 Rot.
 */
export function loadColor(n: number): string {
  if (n <= 5) return mix([22, 92, 44], [57, 255, 20], (Math.max(1, n) - 1) / 4);
  if (n === 6) return 'rgb(255, 214, 10)';
  if (n === 7) return 'rgb(255, 140, 0)';
  return n === 8 ? 'rgb(255, 59, 48)' : 'rgb(208, 0, 0)';
}

// ---------------------------------------------------------------- Anordnung prüfen und herstellen

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Prüft eine gespeicherte Anordnung (Baum und Areas) auf ihre Form. */
export function isArrangement(v: unknown): v is Arrangement {
  if (!isObj(v) || !T.isNode(v.tree) || !isObj(v.areas)) return false;
  return Object.values(v.areas).every(
    (p) =>
      isObj(p) &&
      typeof p.id === 'string' &&
      typeof p.front === 'string' &&
      Array.isArray(p.panels) &&
      p.panels.every((x) => typeof x === 'string'),
  );
}

/**
 * Kennung für eine neue Area. Sie leitet sich vom ersten Panel ab, damit dieselbe Anordnung
 * bei jedem Anzeigen dieselben Areas ergibt (sonst würden Seiten neu geladen).
 */
function newAreaId(panelId: string, taken: Record<string, Area>): string {
  let id = `area-${panelId}`;
  for (let n = 2; taken[id]; n++) id = `area-${panelId}-${n}`;
  return id;
}

/** Area, auf der ein Panel liegt. */
export function areaIn(arr: Arrangement | null | undefined, panelId: string): string | null {
  if (!arr) return null;
  for (const p of Object.values(arr.areas)) if (p.panels.includes(panelId)) return p.id;
  return null;
}

/** Erste Anordnung: alle Panels gleich verteilt, überzählige als Stapel auf der letzten Area. */
function initial(panels: PanelMeta[], spec: ScreenSpec): Arrangement | null {
  if (panels.length === 0) return null;
  const cap = spec.capacity;
  const ids = panels.map((p) => p.id);
  const groups = ids.length <= cap ? ids.map((id) => [id]) : [...ids.slice(0, cap - 1).map((id) => [id]), ids.slice(cap - 1)];
  const areas: Record<string, Area> = {};
  for (const g of groups) {
    const id = newAreaId(g[0], areas);
    areas[id] = { id, panels: g, front: g[0] };
  }
  const tree = T.standard(Object.keys(areas), spec.lines, spec.perLine, spec.orientation);
  return tree ? { tree, areas } : null;
}

/**
 * Bringt eine gespeicherte Anordnung in einen gültigen Zustand: entfernt geschlossene Panels und
 * leere Areas, gibt neuen Panels eine eigene Area, solange die Bildschirmklasse noch eine
 * zeigt, und legt sie sonst auf die Area ganz rechts (F-08).
 */
export function normalize(panels: PanelMeta[], stored: Arrangement | null | undefined, spec: ScreenSpec): Arrangement | null {
  if (panels.length === 0) return null;
  if (!stored || !isArrangement(stored)) return initial(panels, spec);
  const exists = new Set(panels.map((p) => p.id));
  const seen = new Set<string>();
  let tree: T.Node | null = stored.tree;
  const areas: Record<string, Area> = {};
  for (const id of T.leaves(stored.tree)) {
    const old = stored.areas[id];
    const members = (old?.panels ?? []).filter((m) => exists.has(m) && !seen.has(m));
    members.forEach((m) => seen.add(m));
    if (members.length === 0 || areas[id]) {
      tree = tree && T.removeLeaf(tree, id);
      continue;
    }
    areas[id] = { id, panels: members, front: members.includes(old.front) ? old.front : members[0] };
  }
  // F-52: Mehr Slots als die Klasse vorsieht (nach „Grenzen aufheben“) bleiben stehen; neu verteilt
  // wird nur bei unsinnigen Mengen. Neue Portale kommen dann in den Stack ganz rechts.
  if (!tree || T.leaves(tree).length > Math.max(spec.capacity, SLOTS_MAX)) return initial(panels, spec);
  for (const p of panels) {
    if (seen.has(p.id)) continue;
    if (T.leaves(tree).length < spec.capacity) {
      const id = newAreaId(p.id, areas);
      areas[id] = { id, panels: [p.id], front: p.id };
      tree = T.addToLargest(tree, id, spec.aspect);
    } else {
      const right = areas[T.rightmost(tree)];
      areas[right.id] = { ...right, panels: [...right.panels, p.id] };
    }
  }
  return { tree, areas };
}

export interface View {
  key: string;
  spec: ScreenSpec;
  arrangement: Arrangement | null;
  tree: T.Node | null;
  /** Areas auf der Fläche mit ihren Panels. */
  slots: Slot[];
}

/** Areas mit Lage und Panels zu einer Anordnung. */
export function describe(ws: Workspace, key: string, spec: ScreenSpec, arrangement: Arrangement | null): View {
  const byId = new Map(ws.panels.map((p) => [p.id, p]));
  const tree = arrangement?.tree ?? null;
  const slots: Slot[] = [];
  for (const [id, rect] of T.rects(tree)) {
    const area = arrangement!.areas[id];
    const panels = (area?.panels ?? []).map((m) => byId.get(m)).filter((m): m is PanelMeta => !!m);
    if (panels.length === 0) continue;
    slots.push({ id, rect, panels, front: panels.find((m) => m.id === area.front) ?? panels[0] });
  }
  return { key, spec, arrangement, tree, slots };
}

export function viewOf(ws: Workspace, setup: ScreenSetup): View {
  const key = layoutKey(setup);
  const spec = specOf(setup);
  return describe(ws, key, spec, normalize(panelsIn(ws.panels, setup.win), ws.layouts[key], spec));
}

/** Area, auf der ein Panel in dieser Ansicht liegt. */
export function areaOf(view: View, panelId: string): string | null {
  return areaIn(view.arrangement, panelId);
}

function commit(ws: Workspace, key: string, arr: Arrangement | null): Workspace {
  const layouts = { ...ws.layouts };
  if (arr) layouts[key] = arr;
  else delete layouts[key];
  return { ...ws, layouts };
}

/** Wendet eine Änderung auf die Anordnung einer Einstellung an; null = nichts ändern. */
function change(ws: Workspace, setup: ScreenSetup, fn: (arr: Arrangement, v: View) => Arrangement | null): Workspace {
  const v = viewOf(ws, setup);
  if (!v.arrangement) return ws;
  const after = fn(v.arrangement, v);
  if (!after || JSON.stringify(after) === JSON.stringify(v.arrangement)) return ws;
  return commit(ws, v.key, after);
}

const withArea = (arr: Arrangement, area: Area): Arrangement => ({ ...arr, areas: { ...arr.areas, [area.id]: area } });
const withTree = (arr: Arrangement, tree: T.Node): Arrangement => ({ ...arr, tree });

// ---------------------------------------------------------------- F-09, F-10 anlegen und schließen

/**
 * Panel anlegen. Ohne Angabe der Area teilt es sich das größte Panel; zeigt die Bildschirmklasse
 * keine Area mehr, kommt es auf die Area ganz rechts. Mit Angabe der Area (F-09) kommt es dort
 * obendrauf. Liegt es in einem Stapel, wird es dort angezeigt. Mehr als STACK_MAX Panels je
 * Area gehen nicht (F-26): dann bleibt alles, wie es ist.
 */
export function addPanel(ws: Workspace, setup: ScreenSetup, onArea?: string, id?: string): Workspace {
  // F-114: Mit `id` lässt sich vorher durchrechnen, welches Portal entsteht (Hinweis an genau diesem Portal).
  const made = newPanel(`Portal ${ws.nextNumber}`);
  const meta = inWin(id ? { ...made, id } : made, setup.win);
  const v = viewOf(ws, setup);
  const next: Workspace = { ...ws, panels: [...ws.panels, meta], nextNumber: ws.nextNumber + 1 };
  const target = onArea ? v.arrangement?.areas[onArea] : undefined;
  let arr: Arrangement | null;
  if (target && v.arrangement) {
    arr = withArea(v.arrangement, { ...target, panels: [...target.panels, meta.id], front: meta.id });
  } else {
    arr = normalize(panelsIn(next.panels, setup.win), v.arrangement, v.spec);
  }
  const pid = areaIn(arr, meta.id);
  const area = pid ? arr!.areas[pid] : null;
  if (!arr || !area) return ws;
  if (area.panels.length > STACK_MAX) return ws;
  if (area.panels.length > 1) arr = withArea(arr, { ...area, front: meta.id });
  // F-128: Wer auf eine Area gelegt wird, gehört zu ihr; ein neuer Stapel bekommt einen Namen.
  return ensureAreaNames(commit(next, v.key, arr), setup);
}

/** F-134: True, wenn auf dem Bildschirm noch Platz für eine weitere Area ist. */
export function canAddArea(ws: Workspace, setup: ScreenSetup): boolean {
  const v = viewOf(ws, setup);
  return !v.arrangement || T.leaves(v.arrangement.tree).length < (v.spec.max ?? v.spec.capacity);
}

/**
 * F-134 „+ Area“: neue Area mit leerem Panel als Spalte rechts oder Zeile unten. Ist der
 * Bildschirm voll, bleibt alles, wie es ist – Panels kommen dann nur über die Areas dazu.
 */
export function addArea(ws: Workspace, setup: ScreenSetup, side: 'right' | 'bottom'): Workspace {
  if (!canAddArea(ws, setup)) return ws;
  const meta = inWin(newPanel(`Portal ${ws.nextNumber}`), setup.win);
  const v = viewOf(ws, setup);
  const next: Workspace = { ...ws, panels: [...ws.panels, meta], nextNumber: ws.nextNumber + 1 };
  if (!v.arrangement) return ensureAreaNames(commit(next, v.key, normalize(panelsIn(next.panels, setup.win), null, v.spec)), setup);
  const id = newAreaId(meta.id, v.arrangement.areas);
  const arr: Arrangement = {
    tree: T.addAtEdge(v.arrangement.tree, id, side),
    areas: { ...v.arrangement.areas, [id]: { id, panels: [meta.id], front: meta.id } },
  };
  return ensureAreaNames(commit(next, v.key, arr), setup);
}

/** True, wenn kein weiteres Panel mehr dazukommen kann (F-26). */
export function stackFull(ws: Workspace, setup: ScreenSetup, onArea?: string): boolean {
  return addPanel(ws, setup, onArea) === ws;
}

/** Nimmt ein Panel aus einer Anordnung. Wird eine Area leer, übernimmt der Nachbar die Fläche (F-02). */
function takeOut(arr: Arrangement, panelId: string): Arrangement | null {
  const pid = areaIn(arr, panelId);
  if (!pid) return arr;
  const area = arr.areas[pid];
  const rest = area.panels.filter((m) => m !== panelId);
  if (rest.length === 0) {
    const tree = T.removeLeaf(arr.tree, pid);
    if (!tree) return null;
    const areas = { ...arr.areas };
    delete areas[pid];
    return { tree, areas };
  }
  const i = area.panels.indexOf(panelId);
  const front = area.front === panelId ? rest[Math.min(i, rest.length - 1)] : area.front;
  return withArea(arr, { ...area, panels: rest, front });
}

/** Panel schließen – in allen Bildschirm-Einstellungen. Im Stapel rückt das nächste Panel nach vorn. */
export function removePanel(ws: Workspace, id: string): Workspace {
  if (!ws.panels.some((p) => p.id === id)) return ws;
  const panels = ws.panels.filter((p) => p.id !== id);
  const layouts: Workspace['layouts'] = {};
  for (const [key, stored] of Object.entries(ws.layouts)) {
    const setup = parseLayoutKey(key);
    if (!setup || !isArrangement(stored)) continue;
    const fixed = normalize(panelsIn(panels, setup.win), takeOut(stored, id), specOf(setup));
    if (fixed) layouts[key] = fixed;
  }
  // F-32: Lesezeichen bleiben in der Gesamtsammlung, nur die Zuordnung zum Panel entfällt.
  const bookmarks = ws.bookmarks.map((b) => (b.panels.includes(id) ? { ...b, panels: b.panels.filter((x) => x !== id) } : b));
  return pruneAreaNames({ ...ws, panels, layouts, bookmarks });
}

export function renamePanel(ws: Workspace, id: string, name: string): Workspace {
  const trimmed = name.trim();
  if (!trimmed) return ws;
  return mapPanel(ws, id, (p) => ({ ...p, name: trimmed }));
}

// ---------------------------------------------------------------- F-14, F-21, F-22 Tabs und Verlauf

/**
 * Macht aus einer Eingabe eine aufrufbare Adresse: ohne Schema wird https:// ergänzt,
 * bei localhost und 127.0.0.1 http://. Leere Eingabe = keine Seite.
 */
export function normalizeUrl(input: string): string {
  const t = input.trim();
  if (!t) return '';
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(t)) return t;
  if (/^(localhost|127\.0\.0\.1)(:|\/|$)/i.test(t)) return `http://${t}`;
  return `https://${t}`;
}

/** Höchstzahl der Einträge im Verlauf eines Tabs. */
export const HISTORY_MAX = 50;

function mapPanel(ws: Workspace, id: string, f: (p: PanelMeta) => PanelMeta): Workspace {
  let changed = false;
  const panels = ws.panels.map((p) => {
    if (p.id !== id) return p;
    const n = f(p);
    changed = n !== p;
    return n;
  });
  return changed ? { ...ws, panels } : ws;
}

/** Sichtbarer Tab eines Panels. */
export function activeTab(p: PanelMeta): Tab {
  return p.tabs.find((t) => t.id === p.activeTab) ?? p.tabs[0];
}

/** Adresse des sichtbaren Tabs. */
export function panelUrl(p: PanelMeta): string | undefined {
  return activeTab(p)?.url;
}

/** Ändert den sichtbaren Tab eines Panels. */
function mapActive(ws: Workspace, id: string, f: (t: Tab, p: PanelMeta) => Tab): Workspace {
  return mapPanel(ws, id, (p) => {
    const t = activeTab(p);
    const n = f(t, p);
    return n === t ? p : { ...p, tabs: p.tabs.map((x) => (x.id === t.id ? n : x)) };
  });
}

function go(t: Tab, url: string): Tab {
  if (url === t.url) return t;
  const past = (t.history ?? []).slice(0, (t.pos ?? -1) + 1);
  const history = [...past, url].slice(-HISTORY_MAX);
  return { ...t, url, history, pos: history.length - 1 };
}

/**
 * Seite im sichtbaren Tab öffnen (Adresszeile, F-14). Legt einen Verlaufseintrag an; Einträge
 * „vorwärts“ entfallen wie im Browser. Leere Eingabe = keine Seite (Verlauf bleibt).
 * Die erste geöffnete Adresse wird Startseite des Panels.
 */
export function navigatePanel(ws: Workspace, id: string, input: string): Workspace {
  const url = normalizeUrl(input);
  const after = mapActive(ws, id, (t) => {
    if (url) return go(t, url);
    if (t.url === undefined) return t;
    const next = { ...t };
    delete next.url;
    return next;
  });
  return url ? mapPanel(after, id, (p) => (p.home ? p : { ...p, home: url })) : after;
}

export function canGoBack(p: PanelMeta): boolean {
  const t = activeTab(p);
  return !!t?.history && (t.pos ?? 0) > 0;
}
export function canGoForward(p: PanelMeta): boolean {
  const t = activeTab(p);
  return !!t?.history && (t.pos ?? 0) < t.history.length - 1;
}

/** Im Verlauf des sichtbaren Tabs zurück (−1) oder vor (+1). */
export function historyStep(ws: Workspace, id: string, step: number): Workspace {
  return mapActive(ws, id, (t) => {
    if (!t.history?.length) return t;
    const pos = Math.max(0, Math.min(t.history.length - 1, (t.pos ?? 0) + step));
    return pos === t.pos ? t : { ...t, pos, url: t.history[pos] };
  });
}

/** Zur Startseite des Panels (Home-Knopf), im sichtbaren Tab. */
export function goHome(ws: Workspace, id: string): Workspace {
  const home = ws.panels.find((p) => p.id === id)?.home;
  return home ? navigatePanel(ws, id, home) : ws;
}

/** Aktuelle Seite als Startseite des Panels festlegen. */
export function setHome(ws: Workspace, id: string): Workspace {
  return mapPanel(ws, id, (p) => {
    const url = panelUrl(p);
    return url && url !== p.home ? { ...p, home: url } : p;
  });
}

/** Neuer Tab am Ende, wird gleich angezeigt; optional mit Adresse. Höchstens TAB_MAX (F-26). */
export function addTab(ws: Workspace, id: string, input = ''): Workspace {
  const p = ws.panels.find((x) => x.id === id);
  if (!p || p.tabs.length >= TAB_MAX) return ws;
  const tab = newTab();
  const added = mapPanel(ws, id, (x) => ({ ...x, tabs: [...x.tabs, tab], activeTab: tab.id }));
  return input ? navigatePanel(added, id, input) : added;
}

/** Tab schließen; der Nachbar wird sichtbar. Der letzte Tab wird nur geleert, das Panel bleibt. */
export function closeTab(ws: Workspace, id: string, tabId: string): Workspace {
  return mapPanel(ws, id, (p) => {
    const i = p.tabs.findIndex((t) => t.id === tabId);
    if (i < 0) return p;
    if (p.tabs.length === 1) {
      const fresh = newTab();
      return { ...p, tabs: [fresh], activeTab: fresh.id };
    }
    const tabs = p.tabs.filter((t) => t.id !== tabId);
    const activeId = p.activeTab === tabId ? tabs[Math.min(i, tabs.length - 1)].id : p.activeTab;
    return { ...p, tabs, activeTab: activeId };
  });
}

/** F-22: Tab anzeigen. */
export function selectTab(ws: Workspace, id: string, tabId: string): Workspace {
  return mapPanel(ws, id, (p) => (p.activeTab === tabId || !p.tabs.some((t) => t.id === tabId) ? p : { ...p, activeTab: tabId }));
}

/** F-22: Tab an eine andere Stelle ziehen (Index in der neuen Reihenfolge). */
export function moveTab(ws: Workspace, id: string, tabId: string, to: number): Workspace {
  return mapPanel(ws, id, (p) => {
    const from = p.tabs.findIndex((t) => t.id === tabId);
    const target = Math.max(0, Math.min(p.tabs.length - 1, to));
    if (from < 0 || from === target) return p;
    const tabs = [...p.tabs];
    const [tab] = tabs.splice(from, 1);
    tabs.splice(target, 0, tab);
    return { ...p, tabs };
  });
}

/** Beschriftung eines Tabs: Domain ohne „www.“, sonst „Neuer Tab“. */
export function tabLabel(t: Tab): string {
  if (!t.url) return 'Neuer Tab';
  try {
    return new URL(t.url).hostname.replace(/^www\./, '') || t.url;
  } catch {
    return t.url;
  }
}

/**
 * True, wenn die Adresse E-Source selbst ist (würde sich endlos verschachteln).
 * `base` ist die Adresse der App, z. B. https://schulzenrico.github.io/e-sources/ (F-120):
 * Das Portfolio unter derselben Domain ist dann nicht E-Source.
 */
export function isSelfUrl(url: string, base: string): boolean {
  try {
    const u = new URL(url);
    const b = new URL(base);
    const path = b.pathname.endsWith('/') ? b.pathname : `${b.pathname}/`;
    return u.origin === b.origin && `${u.pathname.replace(/\/$/, '')}/`.startsWith(path);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- F-43 gesperrte Seiten

/**
 * Domains, die das Einbetten in fremde Seiten bekanntlich verbieten (X-Frame-Options bzw.
 * frame-ancestors). Der Browser verrät E-Source das nicht, deshalb diese Liste plus die eigene
 * Markierung des Nutzers. Gilt auch für Subdomains.
 */
export const KNOWN_BLOCKED = [
  'claude.ai',
  'chatgpt.com',
  'openai.com',
  'github.com',
  'google.com',
  'google.de',
  'youtube.com',
  'linkedin.com',
  'facebook.com',
  'instagram.com',
  'x.com',
  'twitter.com',
  'amazon.de',
  'amazon.com',
  'paypal.com',
  'apple.com',
  'microsoft.com',
  'live.com',
  'notion.so',
];

/** Domain einer Adresse ohne „www.“; leer, wenn keine gültige Adresse. */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

const covers = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

/** True, wenn die Seite voraussichtlich nicht im Panel angezeigt werden kann (F-43). */
export function isBlocked(ws: Workspace, url: string): boolean {
  const host = hostOf(url);
  if (!host) return false;
  // Eigene Wahl: die genaueste passende Domain zählt.
  const own = Object.keys(ws.embed)
    .filter((d) => covers(host, d))
    .sort((a, b) => b.length - a.length)[0];
  if (own) return !ws.embed[own];
  // F-201: Eingebettete Player (z. B. youtube.com/embed/…) sind gerade fürs Einbetten da.
  if (isEmbedPlayer(url)) return false;
  return KNOWN_BLOCKED.some((d) => covers(host, d));
}

/** F-201: Adressen, die ausdrücklich zum Einbetten gedacht sind, obwohl die Domain sonst sperrt. */
export function isEmbedPlayer(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    return (covers(host, 'youtube.com') || covers(host, 'youtube-nocookie.com')) && u.pathname.startsWith('/embed/');
  } catch {
    return false;
  }
}

/** Merkt sich für die Domain einer Adresse, ob sie sich einbetten lässt. */
export function setEmbed(ws: Workspace, url: string, ok: boolean): Workspace {
  const host = hostOf(url);
  if (!host) return ws;
  return { ...ws, embed: { ...ws.embed, [host]: ok } };
}

// ---------------------------------------------------------------- F-08, F-09 Stapel

/** Panel in seinem Stapel nach vorn holen. */
export function setStackFront(ws: Workspace, setup: ScreenSetup, panelId: string): Workspace {
  return change(ws, setup, (arr) => {
    const pid = areaIn(arr, panelId);
    return pid ? withArea(arr, { ...arr.areas[pid], front: panelId }) : null;
  });
}

/** Wechselt im Stapel einer Area um `step` Panels weiter (−1 = zurück); am Ende geht es vorne weiter. */
export function stepStack(ws: Workspace, setup: ScreenSetup, area: string, step: number): Workspace {
  return change(ws, setup, (arr) => {
    const p = arr.areas[area];
    if (!p || p.panels.length < 2) return null;
    const i = Math.max(0, p.panels.indexOf(p.front));
    return withArea(arr, { ...p, front: p.panels[(i + step + p.panels.length * 9) % p.panels.length] });
  });
}

// ---------------------------------------------------------------- F-128 Area-Namen

/** Standardname neuer Areas, immer mit laufender Nummer: „NewArea 1“, „NewArea 2“ … */
export const AREA_DEFAULT = 'Slot';

/**
 * Name-Id einer Area: die, zu der die meisten ihrer Panels gehören; bei Gleichstand die des
 * sichtbaren Panels, sonst die des vordersten. So bleibt der Name auch nach Tauschen stabil.
 */
function nameIdOf(ws: Workspace, members: string[], front: string): string | undefined {
  const known = new Set(ws.areaNames.map((n) => n.id));
  const byId = new Map(ws.panels.map((p) => [p.id, p]));
  const of = (m: string) => {
    const a = byId.get(m)?.areaName;
    return a && known.has(a) ? a : undefined;
  };
  const count = new Map<string, number>();
  for (const m of members) {
    const a = of(m);
    if (a) count.set(a, (count.get(a) ?? 0) + 1);
  }
  if (count.size === 0) return undefined;
  const best = Math.max(...count.values());
  const f = of(front);
  if (f && count.get(f) === best) return f;
  return members.map(of).find((a) => a && count.get(a) === best);
}

/** F-162: Name-Id eines Slots (für seine Farben). */
export const slotNameId = (ws: Workspace, members: string[], front: string): string | undefined => nameIdOf(ws, members, front);

/** F-162: Slot bekommt einen Namen, falls er noch keinen hat (Grundlage für Slot-Farben). */
export const claimSlot = (ws: Workspace, members: string[], front: string): Workspace => claimArea(ws, members, front);

/** Name der Area, auf der eine Anzeige-Stelle liegt; leer bei nur einem Panel oder noch ohne Namen. */
export function areaLabel(ws: Workspace, slot: Slot): string {
  if (slot.panels.length < 2) return '';
  const id = nameIdOf(
    ws,
    slot.panels.map((p) => p.id),
    slot.front.id,
  );
  return ws.areaNames.find((n) => n.id === id)?.name ?? '';
}

/**
 * Ordnet die Panels einer Area ihrem Namen zu; gibt es noch keinen, entsteht einer (`name` oder
 * der nächste „NewArea n“). Panels, die schon zu einer anderen Area gehören, behalten ihre –
 * sonst würde z. B. der Stapel auf dem Smartphone die Namen vom großen Bildschirm überschreiben.
 */
function claimArea(ws: Workspace, members: string[], front: string, name?: string): Workspace {
  let id = nameIdOf(ws, members, front);
  let next = ws;
  if (!id) {
    id = newId();
    let n = ws.nextArea;
    let label = name;
    if (label === undefined) {
      const taken = new Set(ws.areaNames.map((a) => a.name));
      while (taken.has(`${AREA_DEFAULT} ${n}`)) n++;
      label = `${AREA_DEFAULT} ${n}`;
      n++;
    }
    next = { ...ws, areaNames: [...ws.areaNames, { id, name: label }], nextArea: n };
  } else if (name !== undefined) {
    const nid = id;
    if (ws.areaNames.some((a) => a.id === nid && a.name !== name))
      next = { ...ws, areaNames: ws.areaNames.map((a) => (a.id === nid ? { ...a, name } : a)) };
  }
  const known = new Set(next.areaNames.map((a) => a.id));
  const set = new Set(members);
  if (next.panels.some((p) => set.has(p.id) && !(p.areaName && known.has(p.areaName)))) {
    const nid = id;
    next = { ...next, panels: next.panels.map((p) => (set.has(p.id) && !(p.areaName && known.has(p.areaName)) ? { ...p, areaName: nid } : p)) };
  }
  return next;
}

/**
 * F-128: Jeder Stapel in dieser Einstellung bekommt einen Namen, falls er noch keinen hat
 * (z. B. alte Stände oder ein Stapel, der erst durch einen kleineren Bildschirm entsteht).
 * Ändert sich nichts, kommt dieselbe Arbeitsfläche zurück.
 */
export function ensureAreaNames(ws: Workspace, setup: ScreenSetup): Workspace {
  let next = ws;
  for (const s of viewOf(ws, setup).slots) {
    if (s.panels.length < 2) continue;
    next = claimArea(
      next,
      s.panels.map((p) => p.id),
      s.front.id,
    );
  }
  return next;
}

/** F-128: Area umbenennen (gilt für alle Bildschirm-Einstellungen). Leerer Name = keine Änderung. */
export function renameArea(ws: Workspace, setup: ScreenSetup, areaId: string, name: string): Workspace {
  const trimmed = name.trim();
  const area = viewOf(ws, setup).arrangement?.areas[areaId];
  if (!trimmed || !area) return ws;
  return claimArea(ws, area.panels, area.front, trimmed);
}

/** Namen, zu denen kein Panel mehr gehört, entfallen. */
function pruneAreaNames(ws: Workspace): Workspace {
  const used = new Set(ws.panels.map((p) => p.areaName).filter(Boolean));
  return ws.areaNames.every((a) => used.has(a.id)) ? ws : { ...ws, areaNames: ws.areaNames.filter((a) => used.has(a.id)) };
}

// ---------------------------------------------------------------- F-11, F-12

/** Zwei Panels tauschen (Knopf ⇄): Jedes nimmt die Stelle des anderen ein, auch im Stapel. */
export function swapPanels(ws: Workspace, setup: ScreenSetup, a: string, b: string): Workspace {
  return change(ws, setup, (arr) => {
    const pa = areaIn(arr, a);
    const pb = areaIn(arr, b);
    if (!pa || !pb || a === b || pa === pb) return null;
    const put = (p: Area, out: string, inn: string): Area => ({
      ...p,
      panels: p.panels.map((m) => (m === out ? inn : m)),
      front: p.front === out ? inn : p.front,
    });
    return withArea(withArea(arr, put(arr.areas[pa], a, b)), put(arr.areas[pb], b, a));
  });
}

/**
 * F-187: Slot schließen – seine Portale wandern in einen Nachbar-Slot (in Lesereihenfolge erst
 * der davor, dann der danach), der Slot fällt weg. Passt der Stapel nirgends (STACK_MAX), kommt null.
 */
export function closeSlot(ws: Workspace, setup: ScreenSetup, area: string): { ws: Workspace; into: string } | null {
  const v = viewOf(ws, setup);
  const arr = v.arrangement;
  const src = arr?.areas[area];
  if (!arr || !src || T.leaves(arr.tree).length < 2) return null;
  const order = T.readingOrder(arr.tree);
  const at = order.indexOf(area);
  const near = order
    .filter((id) => id !== area)
    .sort((a, b) => {
      const da = Math.abs(order.indexOf(a) - at) * 2 + (order.indexOf(a) > at ? 1 : 0);
      const db = Math.abs(order.indexOf(b) - at) * 2 + (order.indexOf(b) > at ? 1 : 0);
      return da - db;
    });
  for (const target of near) {
    const next = tryPlace(ws, setup, [...src.panels], target);
    if (next) return { ws: next, into: target };
  }
  return null;
}

/** Ziehen & Ablegen einer Area samt Stapel: Mitte = tauschen, Rand = andocken. */
export function dropSlot(ws: Workspace, setup: ScreenSetup, area: string, target: string, zone: T.Zone): Workspace {
  return change(ws, setup, (arr) => withTree(arr, T.drop(arr.tree, area, target, zone)));
}

/** Übernimmt einen fertigen Teilungsbaum, z. B. nach dem Ziehen einer Kante. */
export function setLayout(ws: Workspace, setup: ScreenSetup, tree: T.Node): Workspace {
  return change(ws, setup, (arr) => withTree(arr, tree));
}

/** F-12: Voreingestellte Größe als Anteil von Breite und Höhe der Arbeitsfläche. */
export function setPanelSize(ws: Workspace, setup: ScreenSetup, id: string, wf: number, hf: number, min = DEFAULT_MIN): Workspace {
  return change(ws, setup, (arr) => {
    const pid = areaIn(arr, id);
    return pid ? withTree(arr, T.setLeafSize(arr.tree, pid, wf, hf, min)) : null;
  });
}

// ---------------------------------------------------------------- F-05

/** Alle Anteile gleich groß; die Anordnung bleibt. */
export function distribute(ws: Workspace, setup: ScreenSetup): Workspace {
  return change(ws, setup, (arr) => withTree(arr, T.equalize(arr.tree)));
}

export function savePreferred(ws: Workspace, setup: ScreenSetup): Workspace {
  const v = viewOf(ws, setup);
  if (!v.arrangement) return ws;
  return { ...ws, preferred: { ...ws.preferred, [v.key]: v.arrangement } };
}

export function clearPreferred(ws: Workspace, setup: ScreenSetup): Workspace {
  const preferred = { ...ws.preferred };
  delete preferred[layoutKey(setup)];
  return { ...ws, preferred };
}

/**
 * Ganze Anordnung zurücksetzen: auf die Wunsch-Anordnung, sonst auf die Standard-Verteilung.
 * Es werden keine Panels gelöscht; neu dazugekommene landen auf einer freien Area oder im Stapel.
 */
export function resetLayout(ws: Workspace, setup: ScreenSetup): Workspace {
  const key = layoutKey(setup);
  const pref = ws.preferred[key];
  return commit(ws, key, pref ? normalize(panelsIn(ws.panels, setup.win), pref, specOf(setup)) : null);
}

/**
 * F-52: Auf die empfohlene Zahl Slots zurück – gleich verteilt wie beim ersten Anzeigen; was nicht
 * auf einen eigenen Slot passt, liegt im Stack ganz rechts.
 */
export function fitSlots(ws: Workspace, setup: ScreenSetup): Workspace {
  return commit(ws, layoutKey(setup), initial(panelsIn(ws.panels, setup.win), specOf(setup)));
}

/** F-52: Anordnung direkt setzen (Rückgängig für fitSlots). */
export function setArrangement(ws: Workspace, setup: ScreenSetup, arr: Arrangement): Workspace {
  return commit(ws, layoutKey(setup), arr);
}

/** Einzelnes Panel zurücksetzen: auf die Größe seiner Area in der Wunsch-Anordnung, sonst auf Area-Größe. */
export function resetPanel(ws: Workspace, setup: ScreenSetup, id: string, min = DEFAULT_MIN): Workspace {
  const pref = ws.preferred[layoutKey(setup)];
  return change(ws, setup, (arr, v) => {
    const pid = areaIn(arr, id);
    if (!pid) return null;
    const target = (pref && isArrangement(pref) && T.rects(pref.tree).get(pid)) || slotSize(v.spec);
    return withTree(arr, T.setLeafSize(arr.tree, pid, target.w, target.h, min));
  });
}

/** F-13: Splitscreen – der aktive und die folgenden Areas in Lesereihenfolge. */
export function splitSelection(view: View, activePlace: string | null, count: number): string[] {
  const ordered = T.readingOrder(view.tree);
  if (ordered.length <= count) return ordered;
  const start = Math.max(0, ordered.indexOf(activePlace ?? ''));
  return Array.from({ length: count }, (_, k) => ordered[(start + k) % ordered.length]);
}

// ---------------------------------------------------------------- F-15, F-125 Lineal

/** Strichfarben wie im alten Lineal; gewechselt per Klick oder Mausrad. */
export const RULER_COLORS = ['#ffffff', '#ffd84d', '#ff9a3c', '#ff5a4d', '#4dd97a', '#4da3ff', '#c08a5a', '#000000', '#8a8a92'];
export const RULER_DEFAULT: RulerSettings = { on: false, labels: true, color: 0 };

/** Zeigt dieses Panel das Lineal? Die Wahl am Panel geht vor der für alle. */
export function rulerShown(ws: Workspace, p: PanelMeta): boolean {
  return p.ruler ?? ws.ruler.on;
}

/** F-125: Lineal für alle Panels ein- oder ausschalten; die Wahl einzelner Panels wird dabei aufgehoben. */
export function toggleRulerAll(ws: Workspace): Workspace {
  const on = !ws.ruler.on;
  return {
    ...ws,
    ruler: { ...ws.ruler, on },
    panels: ws.panels.map((p) => {
      if (p.ruler === undefined) return p;
      const { ruler: _drop, ...rest } = p;
      return rest;
    }),
  };
}

/** F-15: Lineal nur für dieses Panel umschalten. Stimmt die Wahl wieder mit „alle“ überein, entfällt sie. */
export function toggleRulerPanel(ws: Workspace, id: string): Workspace {
  return mapPanel(ws, id, (p) => {
    const want = !rulerShown(ws, p);
    const { ruler: _drop, ...rest } = p;
    return want === ws.ruler.on ? rest : { ...rest, ruler: want };
  });
}

/** F-200: Entwickler-Modus für dieses Portal ein/aus. */
export function toggleDevPanel(ws: Workspace, id: string): Workspace {
  // Entscheidung Enrico (V52): Entwickler-Modus zeigt die Seite unverzerrt – Zoom 100 %, „Breite halten“ aus;
  // beides kommt beim Ausschalten zurück.
  return mapPanel(ws, id, (p) => {
    if (!p.dev) {
      const { zoom, fit, ...rest } = p;
      const keep = { ...(zoom !== undefined ? { zoom } : {}), ...(fit !== undefined ? { fit } : {}) };
      return { ...rest, dev: true, ...(zoom !== undefined || fit !== undefined ? { devKeep: keep } : {}) };
    }
    const { dev: _drop, devKeep, devView: _view, ...rest } = p; // eslint-disable-line @typescript-eslint/no-unused-vars
    return { ...rest, ...(devKeep?.zoom !== undefined && rest.zoom === undefined ? { zoom: devKeep.zoom } : {}), ...(devKeep?.fit !== undefined && rest.fit === undefined ? { fit: devKeep.fit } : {}) };
  });
}

/** F-200 Stufe 2: Gerät, Drehen oder Zoom-Test der Entwickler-Leiste ändern (nur im Entwickler-Modus). */
export function setDevView(ws: Workspace, id: string, change: { device?: string | null; turned?: boolean; scale?: number }): Workspace {
  return mapPanel(ws, id, (p) => {
    if (!p.dev) return p;
    const cur = p.devView ?? {};
    const next = parseDevView({
      device: change.device === null ? undefined : (change.device ?? cur.device),
      // neues Gerät: in seiner üblichen Lage (Drehen nur, wenn ausdrücklich mitgegeben)
      turned: change.device !== undefined ? (change.turned ?? false) : (change.turned ?? cur.turned),
      scale: change.scale ?? cur.scale,
    });
    const { devView: _old, ...rest } = p; // eslint-disable-line @typescript-eslint/no-unused-vars
    return next ? { ...rest, devView: next } : rest;
  });
}

/** Beschriftung oder Farbe ändern (gilt für alle Lineale). Die Farbe läuft im Kreis. */
export function setRulerStyle(ws: Workspace, change: { labels?: boolean; color?: number }): Workspace {
  const n = RULER_COLORS.length;
  const color = change.color === undefined ? ws.ruler.color : ((Math.round(change.color) % n) + n) % n;
  return { ...ws, ruler: { ...ws.ruler, labels: change.labels ?? ws.ruler.labels, color } };
}

// ---------------------------------------------------------------- F-28 Verschieben und Gruppieren

/** Ziel in einer Anordnung: Id einer vorhandenen Area oder 'new' = eigene neue Area. */
export type PlaceTarget = string;
export const NEW_AREA = 'new';

/**
 * F-28: Legt Panels in einer Einstellung auf eine Area (obendrauf, das erste vorn) oder auf eine
 * eigene neue Area (`NEW_AREA`). Die Panels müssen schon in diesem Fenster liegen. Geht es nicht –
 * Ziel unbekannt, schon dort, mehr als STACK_MAX im Stapel, keine freie Area mehr –, kommt null.
 * `fresh`: Die Panels sind gerade erst in dieses Fenster gekommen; wo sie vorläufig liegen, zählt nicht.
 */
export function tryPlace(ws: Workspace, setup: ScreenSetup, ids: string[], target: PlaceTarget, fresh = false): Workspace | null {
  const v = viewOf(ws, setup);
  const arr = v.arrangement;
  if (!arr || ids.length === 0 || new Set(ids).size !== ids.length) return null;
  const from = ids.map((id) => areaIn(arr, id));
  if (from.some((a) => !a)) return null;
  let out: Arrangement | null = arr;
  let clear = ids;
  if (target !== NEW_AREA) {
    const t0 = arr.areas[target];
    if (!t0 || (!fresh && ids.some((id) => t0.panels.includes(id)))) return null;
    for (const id of ids) out = out && takeOut(out, id);
    const t = out?.areas[target];
    if (!out || !t || t.panels.length + ids.length > STACK_MAX) return null;
    out = withArea(out, { ...t, panels: [...t.panels, ...ids], front: ids[0] });
    // Eine ganze Gruppe auf ein einzelnes Panel: Der Name der Gruppe bleibt, sonst gilt der des Ziels.
    if (ids.length > 1 && t.panels.length === 1) clear = t.panels;
    // Ein einzelnes Ziel-Panel kann noch den Namen einer anderen Area tragen (unsichtbar, solange
    // es allein liegt). Gehört der hier noch einer anderen Area, gilt er nicht für den neuen Stapel.
    else if (t.panels.length === 1) {
      const own = ws.panels.find((p) => p.id === t.panels[0])?.areaName;
      const others = new Set(Object.values(out.areas).filter((a) => a.id !== target).flatMap((a) => a.panels));
      if (own && ws.panels.some((p) => others.has(p.id) && p.areaName === own)) clear = [...ids, ...t.panels];
    }
  } else {
    // Wer allein auf seiner Area liegt, hat schon eine eigene.
    const sources = new Set(from as string[]);
    if (!fresh && [...sources].every((a) => arr.areas[a].panels.every((m) => ids.includes(m)))) return null;
    for (const id of ids) out = out && takeOut(out, id);
    if (!out || T.leaves(out.tree).length >= (v.spec.max ?? v.spec.capacity)) return null;
    const id = newAreaId(ids[0], out.areas);
    out = { tree: T.addToLargest(out.tree, id, v.spec.aspect), areas: { ...out.areas, [id]: { id, panels: [...ids], front: ids[0] } } };
  }
  const drop = new Set(clear);
  const panels = ws.panels.map((p): PanelMeta => {
    if (!drop.has(p.id) || !p.areaName) return p;
    const { areaName: _old, ...rest } = p;
    return rest;
  });
  return pruneAreaNames(ensureAreaNames(commit({ ...ws, panels }, v.key, out), setup));
}

export function placePanels(ws: Workspace, setup: ScreenSetup, ids: string[], target: PlaceTarget): Workspace {
  return tryPlace(ws, setup, ids, target) ?? ws;
}
