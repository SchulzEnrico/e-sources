/**
 * Aktionen auf der ganzen Arbeitsfläche. Panels und Tabs gelten überall, die Anordnung je
 * Bildschirm-Einstellung (F-03). Jeder Platz kann mehrere Panels tragen und ist dann ein Stapel
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
import * as T from './tree';
import type { Arrangement, PanelMeta, Place, Slot, Tab, Workspace } from './types';

/** Mindestgröße, wenn die Oberfläche keine eigene angibt (Anteil der Fläche). */
export const DEFAULT_MIN: T.Min = { w: 0.08, h: 0.12 };

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function newTab(): Tab {
  return { id: newId() };
}

export function newPanel(name: string): PanelMeta {
  const tab = newTab();
  return { id: newId(), name, tabs: [tab], activeTab: tab.id };
}

export function defaultWorkspace(): Workspace {
  const panels = [1, 2, 3].map((n) => newPanel(`Panel ${n}`));
  return { panels, layouts: {}, preferred: {}, lines: {}, nextNumber: 4, areas: [], scenarios: [], embed: {} };
}

/** Einstellung aus Klasse und Ausrichtung, ergänzt um die gespeicherte Wahl ein-/zweizeilig. */
export function setupFor(ws: Workspace, cls: ScreenClassId, orientation: Orientation): ScreenSetup {
  const lines: Lines = allowsTwoLines(cls) ? (ws.lines[linesKey(cls, orientation)] ?? 2) : 1;
  return { cls, orientation, lines };
}

export function setLines(ws: Workspace, cls: ScreenClassId, orientation: Orientation, lines: Lines): Workspace {
  return { ...ws, lines: { ...ws.lines, [linesKey(cls, orientation)]: lines } };
}

// ---------------------------------------------------------------- F-26 Ampel

/** Ab dieser Zahl je Platz bzw. Panel (Tabs) nehmen Fokus und Übersicht ab. */
export const FOCUS_WARN = 5;
/** Höchstzahl der Panels je Platz. */
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

/** Prüft eine gespeicherte Anordnung (Baum und Plätze) auf ihre Form. */
export function isArrangement(v: unknown): v is Arrangement {
  if (!isObj(v) || !T.isNode(v.tree) || !isObj(v.places)) return false;
  return Object.values(v.places).every(
    (p) =>
      isObj(p) &&
      typeof p.id === 'string' &&
      typeof p.front === 'string' &&
      Array.isArray(p.panels) &&
      p.panels.every((x) => typeof x === 'string'),
  );
}

/**
 * Kennung für einen neuen Platz. Sie leitet sich vom ersten Panel ab, damit dieselbe Anordnung
 * bei jedem Anzeigen dieselben Plätze ergibt (sonst würden Seiten neu geladen).
 */
function placeId(panelId: string, taken: Record<string, Place>): string {
  let id = `place-${panelId}`;
  for (let n = 2; taken[id]; n++) id = `place-${panelId}-${n}`;
  return id;
}

/** Platz, auf dem ein Panel liegt. */
export function placeIn(arr: Arrangement | null | undefined, panelId: string): string | null {
  if (!arr) return null;
  for (const p of Object.values(arr.places)) if (p.panels.includes(panelId)) return p.id;
  return null;
}

/** Erste Anordnung: alle Panels gleich verteilt, überzählige als Stapel auf dem letzten Platz. */
function initial(panels: PanelMeta[], spec: ScreenSpec): Arrangement | null {
  if (panels.length === 0) return null;
  const cap = spec.capacity;
  const ids = panels.map((p) => p.id);
  const groups = ids.length <= cap ? ids.map((id) => [id]) : [...ids.slice(0, cap - 1).map((id) => [id]), ids.slice(cap - 1)];
  const places: Record<string, Place> = {};
  for (const g of groups) {
    const id = placeId(g[0], places);
    places[id] = { id, panels: g, front: g[0] };
  }
  const tree = T.standard(Object.keys(places), spec.lines, spec.perLine, spec.orientation);
  return tree ? { tree, places } : null;
}

/**
 * Bringt eine gespeicherte Anordnung in einen gültigen Zustand: entfernt geschlossene Panels und
 * leere Plätze, gibt neuen Panels einen eigenen Platz, solange die Bildschirmklasse noch einen
 * zeigt, und legt sie sonst auf den Platz ganz rechts (F-08).
 */
export function normalize(panels: PanelMeta[], stored: Arrangement | null | undefined, spec: ScreenSpec): Arrangement | null {
  if (panels.length === 0) return null;
  if (!stored || !isArrangement(stored)) return initial(panels, spec);
  const exists = new Set(panels.map((p) => p.id));
  const seen = new Set<string>();
  let tree: T.Node | null = stored.tree;
  const places: Record<string, Place> = {};
  for (const id of T.leaves(stored.tree)) {
    const old = stored.places[id];
    const members = (old?.panels ?? []).filter((m) => exists.has(m) && !seen.has(m));
    members.forEach((m) => seen.add(m));
    if (members.length === 0 || places[id]) {
      tree = tree && T.removeLeaf(tree, id);
      continue;
    }
    places[id] = { id, panels: members, front: members.includes(old.front) ? old.front : members[0] };
  }
  if (!tree || T.leaves(tree).length > spec.capacity) return initial(panels, spec);
  for (const p of panels) {
    if (seen.has(p.id)) continue;
    if (T.leaves(tree).length < spec.capacity) {
      const id = placeId(p.id, places);
      places[id] = { id, panels: [p.id], front: p.id };
      tree = T.addToLargest(tree, id, spec.aspect);
    } else {
      const right = places[T.rightmost(tree)];
      places[right.id] = { ...right, panels: [...right.panels, p.id] };
    }
  }
  return { tree, places };
}

export interface View {
  key: string;
  spec: ScreenSpec;
  arrangement: Arrangement | null;
  tree: T.Node | null;
  /** Plätze auf der Fläche mit ihren Panels. */
  slots: Slot[];
}

/** Plätze mit Lage und Panels zu einer Anordnung. */
export function describe(ws: Workspace, key: string, spec: ScreenSpec, arrangement: Arrangement | null): View {
  const byId = new Map(ws.panels.map((p) => [p.id, p]));
  const tree = arrangement?.tree ?? null;
  const slots: Slot[] = [];
  for (const [id, rect] of T.rects(tree)) {
    const place = arrangement!.places[id];
    const panels = (place?.panels ?? []).map((m) => byId.get(m)).filter((m): m is PanelMeta => !!m);
    if (panels.length === 0) continue;
    slots.push({ id, rect, panels, front: panels.find((m) => m.id === place.front) ?? panels[0] });
  }
  return { key, spec, arrangement, tree, slots };
}

export function viewOf(ws: Workspace, setup: ScreenSetup): View {
  const key = layoutKey(setup);
  const spec = specOf(setup);
  return describe(ws, key, spec, normalize(ws.panels, ws.layouts[key], spec));
}

/** Platz, auf dem ein Panel in dieser Ansicht liegt. */
export function placeOf(view: View, panelId: string): string | null {
  return placeIn(view.arrangement, panelId);
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

const withPlace = (arr: Arrangement, place: Place): Arrangement => ({ ...arr, places: { ...arr.places, [place.id]: place } });
const withTree = (arr: Arrangement, tree: T.Node): Arrangement => ({ ...arr, tree });

// ---------------------------------------------------------------- F-09, F-10 anlegen und schließen

/**
 * Panel anlegen. Ohne Platzangabe teilt es sich das größte Panel; zeigt die Bildschirmklasse
 * keinen Platz mehr, kommt es auf den Platz ganz rechts. Mit Platzangabe (F-09) kommt es dort
 * obendrauf. Liegt es in einem Stapel, wird es dort angezeigt. Mehr als STACK_MAX Panels je
 * Platz gehen nicht (F-26): dann bleibt alles, wie es ist.
 */
export function addPanel(ws: Workspace, setup: ScreenSetup, onPlace?: string): Workspace {
  const meta = newPanel(`Panel ${ws.nextNumber}`);
  const v = viewOf(ws, setup);
  const next: Workspace = { ...ws, panels: [...ws.panels, meta], nextNumber: ws.nextNumber + 1 };
  const target = onPlace ? v.arrangement?.places[onPlace] : undefined;
  let arr: Arrangement | null;
  if (target && v.arrangement) {
    arr = withPlace(v.arrangement, { ...target, panels: [...target.panels, meta.id], front: meta.id });
  } else {
    arr = normalize(next.panels, v.arrangement, v.spec);
  }
  const pid = placeIn(arr, meta.id);
  const place = pid ? arr!.places[pid] : null;
  if (!arr || !place) return ws;
  if (place.panels.length > STACK_MAX) return ws;
  if (place.panels.length > 1) arr = withPlace(arr, { ...place, front: meta.id });
  return commit(next, v.key, arr);
}

/** True, wenn kein weiteres Panel mehr dazukommen kann (F-26). */
export function stackFull(ws: Workspace, setup: ScreenSetup, onPlace?: string): boolean {
  return addPanel(ws, setup, onPlace) === ws;
}

/** Nimmt ein Panel aus einer Anordnung. Wird ein Platz leer, übernimmt der Nachbar die Fläche (F-02). */
function takeOut(arr: Arrangement, panelId: string): Arrangement | null {
  const pid = placeIn(arr, panelId);
  if (!pid) return arr;
  const place = arr.places[pid];
  const rest = place.panels.filter((m) => m !== panelId);
  if (rest.length === 0) {
    const tree = T.removeLeaf(arr.tree, pid);
    if (!tree) return null;
    const places = { ...arr.places };
    delete places[pid];
    return { tree, places };
  }
  const i = place.panels.indexOf(panelId);
  const front = place.front === panelId ? rest[Math.min(i, rest.length - 1)] : place.front;
  return withPlace(arr, { ...place, panels: rest, front });
}

/** Panel schließen – in allen Bildschirm-Einstellungen. Im Stapel rückt das nächste Panel nach vorn. */
export function removePanel(ws: Workspace, id: string): Workspace {
  if (!ws.panels.some((p) => p.id === id)) return ws;
  const panels = ws.panels.filter((p) => p.id !== id);
  const layouts: Workspace['layouts'] = {};
  for (const [key, stored] of Object.entries(ws.layouts)) {
    const setup = parseLayoutKey(key);
    if (!setup || !isArrangement(stored)) continue;
    const fixed = normalize(panels, takeOut(stored, id), specOf(setup));
    if (fixed) layouts[key] = fixed;
  }
  return { ...ws, panels, layouts };
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
  return KNOWN_BLOCKED.some((d) => covers(host, d));
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
    const pid = placeIn(arr, panelId);
    return pid ? withPlace(arr, { ...arr.places[pid], front: panelId }) : null;
  });
}

/** Wechselt im Stapel eines Platzes um `step` Panels weiter (−1 = zurück); am Ende geht es vorne weiter. */
export function stepStack(ws: Workspace, setup: ScreenSetup, place: string, step: number): Workspace {
  return change(ws, setup, (arr) => {
    const p = arr.places[place];
    if (!p || p.panels.length < 2) return null;
    const i = Math.max(0, p.panels.indexOf(p.front));
    return withPlace(arr, { ...p, front: p.panels[(i + step + p.panels.length * 9) % p.panels.length] });
  });
}

// ---------------------------------------------------------------- F-11, F-12

/** Zwei Panels tauschen (Knopf ⇄): Jedes nimmt die Stelle des anderen ein, auch im Stapel. */
export function swapPanels(ws: Workspace, setup: ScreenSetup, a: string, b: string): Workspace {
  return change(ws, setup, (arr) => {
    const pa = placeIn(arr, a);
    const pb = placeIn(arr, b);
    if (!pa || !pb || a === b || pa === pb) return null;
    const put = (p: Place, out: string, inn: string): Place => ({
      ...p,
      panels: p.panels.map((m) => (m === out ? inn : m)),
      front: p.front === out ? inn : p.front,
    });
    return withPlace(withPlace(arr, put(arr.places[pa], a, b)), put(arr.places[pb], b, a));
  });
}

/** Ziehen & Ablegen eines Platzes samt Stapel: Mitte = tauschen, Rand = andocken. */
export function dropSlot(ws: Workspace, setup: ScreenSetup, place: string, target: string, zone: T.Zone): Workspace {
  return change(ws, setup, (arr) => withTree(arr, T.drop(arr.tree, place, target, zone)));
}

/** Übernimmt einen fertigen Teilungsbaum, z. B. nach dem Ziehen einer Kante. */
export function setLayout(ws: Workspace, setup: ScreenSetup, tree: T.Node): Workspace {
  return change(ws, setup, (arr) => withTree(arr, tree));
}

/** F-12: Voreingestellte Größe als Anteil von Breite und Höhe der Arbeitsfläche. */
export function setPanelSize(ws: Workspace, setup: ScreenSetup, id: string, wf: number, hf: number, min = DEFAULT_MIN): Workspace {
  return change(ws, setup, (arr) => {
    const pid = placeIn(arr, id);
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
 * Es werden keine Panels gelöscht; neu dazugekommene landen auf einem freien Platz oder im Stapel.
 */
export function resetLayout(ws: Workspace, setup: ScreenSetup): Workspace {
  const key = layoutKey(setup);
  const pref = ws.preferred[key];
  return commit(ws, key, pref ? normalize(ws.panels, pref, specOf(setup)) : null);
}

/** Einzelnes Panel zurücksetzen: auf die Größe seines Platzes in der Wunsch-Anordnung, sonst auf Platzgröße. */
export function resetPanel(ws: Workspace, setup: ScreenSetup, id: string, min = DEFAULT_MIN): Workspace {
  const pref = ws.preferred[layoutKey(setup)];
  return change(ws, setup, (arr, v) => {
    const pid = placeIn(arr, id);
    if (!pid) return null;
    const target = (pref && isArrangement(pref) && T.rects(pref.tree).get(pid)) || slotSize(v.spec);
    return withTree(arr, T.setLeafSize(arr.tree, pid, target.w, target.h, min));
  });
}

/** F-13: Splitscreen – der aktive und die folgenden Plätze in Lesereihenfolge. */
export function splitSelection(view: View, activePlace: string | null, count: number): string[] {
  const ordered = T.readingOrder(view.tree);
  if (ordered.length <= count) return ordered;
  const start = Math.max(0, ordered.indexOf(activePlace ?? ''));
  return Array.from({ length: count }, (_, k) => ordered[(start + k) % ordered.length]);
}
