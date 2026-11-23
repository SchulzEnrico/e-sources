import { CATEGORY_ICONS } from './icons';
import { parseFit, parseZoom } from './zoom';
import type { Arrangement, Bookmark, BookmarkOrigin, Category, Closed, OriginVia, Named, PanelMeta, Tab, Workspace } from './types';
import { parseDeskLooks, parseLook } from './look';
import { parseTint } from './tint';
import { PAUSE_CHOICES, SHOWN_CHOICES } from './pause';
import { ENGINE_DEFAULT, isEngine } from './websearch';
import { parseProfile } from './profile';
import { parseDevView } from './dev';
import { parseActiveCase, parseCases, parseLayoutCases, parseSpaces } from './cases';
import { type FocusRule, fixRule } from './focus';
import { RULER_COLORS, RULER_DEFAULT, defaultWorkspace, isArrangement, newId } from './workspace';
import { demoWorkspace } from './demo';
import { PROBE, probeWorkspace } from './probe';
import { parseLayoutKey } from './screen';
import type { DeskLayout, DeskLayouts } from './deskLayouts';

/**
 * Stufe 1: Die Arbeitsfläche liegt nur im Browser (localStorage). Später kommt der Server dazu.
 * v7: Plätze heißen Areas (`areas` statt `places`) und haben Namen (F-128).
 * v6: dazu Lesezeichen und Kategorien (F-30 bis F-32). Ältere Stände werden beim ersten Laden
 * umgewandelt: v6 bekommt `areas`, v5 eine leere Sammlung; bei v4 bleiben Panels und Seiten, die
 * Anordnung entsteht neu.
 */
const KEY = 'esource.workspace.v7';
/** F-27: Schlüssel, auf dessen Änderung andere Fenster hören (storage-Ereignis). */
export const WORKSPACE_KEY = KEY;
const OLD_KEYS = ['esource.workspace.v6', 'esource.workspace.v5', 'esource.workspace.v4'];

const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const optStr = (x: unknown) => x === undefined || typeof x === 'string';
const strList = (v: unknown) => Array.isArray(v) && v.every((h) => typeof h === 'string');

/** Seite mit Verlauf; gilt für Tabs und für Panels aus v4 (dort lag die Seite direkt am Panel). */
function pageOf(v: Record<string, unknown>): Omit<Tab, 'id'> | null {
  if (!optStr(v.url) || !(v.pos === undefined || isNum(v.pos)) || !(v.history === undefined || strList(v.history))) return null;
  const page: Omit<Tab, 'id'> = {};
  if (typeof v.url === 'string') page.url = v.url;
  if (v.history) page.history = v.history as string[];
  if (isNum(v.pos)) page.pos = v.pos as number;
  return page;
}

function parseTab(v: unknown): Tab | null {
  if (!isObj(v) || typeof v.id !== 'string') return null;
  const page = pageOf(v);
  return page && { id: v.id, ...page, ...(v.keep === true ? { keep: true } : {}) };
}

/** Panel im Format v5 oder v4 (ohne Tabs: die Seite wird zum ersten Tab). */
function parsePanel(v: unknown): PanelMeta | null {
  if (!isObj(v) || typeof v.id !== 'string' || typeof v.name !== 'string' || !optStr(v.home)) return null;
  let tabs: Tab[];
  if (Array.isArray(v.tabs)) {
    const parsed = v.tabs.map(parseTab);
    if (parsed.length === 0 || parsed.some((t) => !t)) return null;
    tabs = parsed as Tab[];
  } else {
    const page = pageOf(v);
    if (!page) return null;
    tabs = [{ id: newId(), ...page }];
  }
  const panel: PanelMeta = {
    id: v.id,
    name: v.name,
    tabs,
    activeTab: typeof v.activeTab === 'string' && tabs.some((t) => t.id === v.activeTab) ? v.activeTab : tabs[0].id,
  };
  if (typeof v.home === 'string') panel.home = v.home;
  // F-116: bis V08 hieß die Sphere „area“
  const sphere = v.sphere ?? v.area;
  if (typeof sphere === 'string') panel.sphere = sphere;
  if (typeof v.scenario === 'string') panel.scenario = v.scenario;
  if (typeof v.ruler === 'boolean') panel.ruler = v.ruler;
  if (v.dev === true) panel.dev = true;
  if (typeof v.areaName === 'string') panel.areaName = v.areaName;
  if (typeof v.win === 'string' && v.win) panel.win = v.win;
  const tint = parseTint(v.tint);
  if (tint) panel.tint = tint;
  if (typeof v.category === 'string') panel.category = v.category;
  if (v.keep === true) panel.keep = true;
  const zoom = parseZoom(v.zoom);
  if (zoom) panel.zoom = zoom;
  const fit = parseFit(v.fit);
  if (fit) panel.fit = fit;
  if (panel.dev) {
    const dv = parseDevView(v.devView);
    if (dv) panel.devView = dv;
  }
  if (panel.dev && v.devKeep && typeof v.devKeep === 'object') {
    const k = v.devKeep as Record<string, unknown>;
    const kz = parseZoom(k.zoom);
    const kf = parseFit(k.fit);
    if (kz || kf) panel.devKeep = { ...(kz ? { zoom: kz } : {}), ...(kf ? { fit: kf } : {}) };
  }
  return panel;
}

/**
 * Anordnungen ab Format v5; bis v6 hießen die Areas `places`. Ältere (reiner Baum) entfallen und
 * entstehen beim Anzeigen neu.
 */
function arrangements(v: unknown): Record<string, Arrangement> {
  const out: Record<string, Arrangement> = {};
  if (!isObj(v)) return out;
  for (const [k, a] of Object.entries(v)) {
    const arr = isObj(a) && a.areas === undefined && isObj(a.places) ? { tree: a.tree, areas: a.places } : a;
    if (isArrangement(arr)) out[k] = arr;
  }
  return out;
}

function namedList(v: unknown): Named[] {
  return Array.isArray(v) ? v.filter((n): n is Named => isObj(n) && typeof n.id === 'string' && typeof n.name === 'string') : [];
}

/** Lesezeichen (F-30); fehlerhafte Einträge fallen weg, statt die ganze Arbeitsfläche zu verwerfen. */
const VIAS: OriginVia[] = ['hand', 'launcher', 'import', 'sample', 'workspace'];

/** F-185: Herkunft aus gespeicherten Daten; Unbrauchbares fällt weg. */
function originFrom(v: unknown): BookmarkOrigin | undefined {
  if (!isObj(v) || !VIAS.includes(v.via as OriginVia) || typeof v.at !== 'string' || Number.isNaN(Date.parse(v.at))) return undefined;
  const o: BookmarkOrigin = { via: v.via as OriginVia, at: v.at };
  for (const k of ['by', 'from', 'folder'] as const) if (typeof v[k] === 'string' && v[k]) o[k] = v[k] as string;
  return o;
}

function bookmarkList(v: unknown, panelIds: Set<string>, categoryIds: Set<string>): Bookmark[] {
  if (!Array.isArray(v)) return [];
  const out: Bookmark[] = [];
  for (const b of v) {
    if (!isObj(b) || typeof b.id !== 'string' || typeof b.url !== 'string' || !b.url) continue;
    const item: Bookmark = {
      id: b.id,
      title: typeof b.title === 'string' ? b.title : b.url,
      url: b.url,
      category: typeof b.category === 'string' && categoryIds.has(b.category) ? b.category : '',
      tags: strList(b.tags) ? (b.tags as string[]) : [],
      panels: strList(b.panels) ? (b.panels as string[]).filter((id) => panelIds.has(id)) : [],
    };
    if (typeof b.note === 'string' && b.note) item.note = b.note;
    const origin = originFrom(b.origin);
    if (origin) item.origin = origin;
    if (b.keep === true) item.keep = true;
    out.push(item);
  }
  return out;
}

/**
 * Prüft gespeicherte oder importierte Daten (F-121); null, wenn es keine Arbeitsfläche ist.
 * Nimmt auch Stände v4/v5 (Datei-Version 1/2) an und wandelt sie um.
 */
/**
 * F-51: Layouts je Desk. Nur bekannte Desks; das aktive Layout hat keinen Vorrat, alle anderen
 * brauchen einen gültigen. Ist etwas kaputt, fällt der ganze Eintrag des Desks weg (die aktuelle
 * Belegung bleibt ja in der Arbeitsfläche).
 */
function parseDeskLayouts(v: unknown, winIds: Set<string>): Record<string, DeskLayouts> | undefined {
  if (!isObj(v)) return undefined;
  const out: Record<string, DeskLayouts> = {};
  for (const [win, d] of Object.entries(v)) {
    if ((win !== '' && !winIds.has(win)) || !isObj(d) || typeof d.active !== 'string' || !Array.isArray(d.list)) continue;
    const list: DeskLayout[] = [];
    let ok = true;
    for (const l of d.list) {
      if (!isObj(l) || typeof l.id !== 'string' || typeof l.name !== 'string' || list.some((x) => x.id === l.id)) { ok = false; break; }
      if (l.id === d.active) { list.push({ id: l.id, name: l.name }); continue; }
      const c = l.saved;
      if (!isObj(c) || !Array.isArray(c.panels)) { ok = false; break; }
      const panels = c.panels.map(parsePanel);
      if (panels.length === 0 || panels.some((p) => !p)) { ok = false; break; }
      const areaNames = namedList(c.areaNames).map((a) => {
        const tint = parseTint((a as { tint?: unknown }).tint);
        return tint ? { id: a.id, name: a.name, tint } : { id: a.id, name: a.name };
      });
      const ps = (panels as PanelMeta[]).map(({ win: _w, ...p }) => p);
      list.push({ id: l.id, name: l.name, saved: { panels: ps, layouts: arrangements(c.layouts), preferred: arrangements(c.preferred), areaNames } });
    }
    if (ok && list.some((l) => l.id === d.active) && list.length > 1) out[win] = { active: d.active, list };
  }
  return Object.keys(out).length ? out : undefined;
}

export function parseWorkspace(data: unknown): Workspace | null {
  if (!isObj(data) || !Array.isArray(data.panels)) return null;
  const panels = data.panels.map(parsePanel);
  if (panels.some((p) => !p)) return null;
  const embed: Record<string, boolean> = {};
  if (isObj(data.embed)) for (const [k, v] of Object.entries(data.embed)) if (typeof v === 'boolean') embed[k] = v;
  const lines: Record<string, 1 | 2> = {};
  if (isObj(data.lines)) for (const [k, v] of Object.entries(data.lines)) if (v === 1 || v === 2) lines[k] = v;
  // F-163: Farben der Kategorie prüfen; Unbrauchbares fällt weg
  // F-183 Stufe 2: Zeichen nur aus dem Satz
  const categories: Category[] = namedList(data.categories).map((c) => {
    const tint = parseTint((c as { tint?: unknown }).tint);
    const icon = (c as { icon?: unknown }).icon;
    return {
      id: c.id,
      name: c.name,
      ...(tint ? { tint } : {}),
      ...(typeof icon === 'string' && (CATEGORY_ICONS as readonly string[]).includes(icon) ? { icon } : {}),
    };
  });
  const catIds = new Set(categories.map((c) => c.id));
  for (const p of panels as PanelMeta[]) if (p.category && !catIds.has(p.category)) delete p.category;
  const siteCategory: Record<string, string> = {};
  if (isObj(data.siteCategory)) for (const [k, v] of Object.entries(data.siteCategory)) if (typeof v === 'string' && (v === '' || catIds.has(v))) siteCategory[k] = v;
  // F-164: ausgeschaltete Regeln – nur bekannte Arten, ohne Doppelte
  const rulesOff = Array.isArray(data.rulesOff)
    ? [...new Set((data.rulesOff as unknown[]).filter((x): x is string => typeof x === 'string' && ((x.startsWith('tint:') && catIds.has(x.slice(5))) || /^site:./.test(x) || ['ask', 'collect'].includes(x))))]
    : [];
  const rulesOn = Array.isArray(data.rulesOn) ? [...new Set((data.rulesOn as unknown[]).filter((x): x is string => x === 'offer'))] : [];
  // F-51: Desks früh prüfen, damit Sammlungen von Portalen in gespeicherten Layouts erhalten bleiben
  const winIdsEarly = new Set(namedList(data.windows).map((w) => w.id));
  const deskLayouts = parseDeskLayouts(data.deskLayouts, winIdsEarly);
  // F-116: Spaces (früher Spheres/areas) und Cases; Cases ohne gültigen Space fallen weg
  const spheres = parseSpaces(data.spheres ?? data.areas);
  const scenarios = parseCases(data.scenarios, spheres);
  const layoutCases = parseLayoutCases(data.layoutCases, scenarios);
  const activeCase = parseActiveCase(data.activeCase, scenarios);
  const storedIds = Object.values(deskLayouts ?? {}).flatMap((d) => d.list.flatMap((l) => l.saved?.panels.map((p) => p.id) ?? []));
  const bookmarks = bookmarkList(
    data.bookmarks,
    new Set([...(panels as PanelMeta[]).map((p) => p.id), ...storedIds]),
    new Set(categories.map((c) => c.id)),
  );
  // F-128: Namen der Areas; Zuordnungen zu unbekannten Namen fallen weg.
  // F-154: alte Standardnamen („NewArea 3“, „NewSlot 3“) heißen jetzt „Slot 3“.
  const areaNames = namedList(data.areaNames).map((a) => {
    const m = /^New(?:Area|Slot) (\d+)$/.exec(a.name);
    // F-162: Farben des Slots prüfen; Unbrauchbares fällt weg
    const tint = parseTint((a as { tint?: unknown }).tint);
    const entry = { id: a.id, name: m ? `Slot ${m[1]}` : a.name };
    return tint ? { ...entry, tint } : entry;
  });
  const nameIds = new Set(areaNames.map((a) => a.id));
  for (const p of panels as PanelMeta[]) if (p.areaName && !nameIds.has(p.areaName)) delete p.areaName;
  // F-27: Panels in unbekannten Fenstern kommen ins Hauptfenster.
  const windows = namedList(data.windows);
  const winIds = new Set(windows.map((w) => w.id));
  for (const p of panels as PanelMeta[]) if (p.win && !winIds.has(p.win)) delete p.win;
  // F-28: Einstellung je Fenster; nur bekannte Fenster und gültige Schlüssel des Fensters.
  const winSetup: Record<string, string> = {};
  if (isObj(data.winSetup))
    for (const [k, v] of Object.entries(data.winSetup))
      if ((k === '' || winIds.has(k)) && typeof v === 'string' && (parseLayoutKey(v)?.win ?? '') === k) winSetup[k] = v;
  // F-24: Zuletzt geschlossen – nur gültige Einträge, Desks wie oben.
  const closed: Closed[] = [];
  if (Array.isArray(data.closed))
    for (const c of data.closed) {
      if (!isObj(c) || typeof c.id !== 'string' || !isNum(c.at)) continue;
      const win = typeof c.win === 'string' && winIds.has(c.win) ? c.win : '';
      if (c.kind === 'portal') {
        const panel = parsePanel(c.panel);
        if (panel) closed.push({ id: c.id, kind: 'portal', win, at: c.at as number, panel, ...(typeof c.area === 'string' ? { area: c.area } : {}) });
      } else if (c.kind === 'tab' && isObj(c.tab) && typeof c.tab.id === 'string' && typeof c.panelId === 'string') {
        const tab = parseTab(c.tab);
        if (tab) closed.push({ id: c.id, kind: 'tab', win, at: c.at as number, tab, index: isNum(c.index) ? (c.index as number) : 0, panelId: c.panelId, panelName: typeof c.panelName === 'string' ? c.panelName : '' });
      }
    }
  return {
    ...(closed.length ? { closed } : {}),
    ...(isObj(data.focus) ? { focus: fixRule(data.focus as Partial<FocusRule>) } : {}),
    ...(parseProfile(data.profile) ? { profile: parseProfile(data.profile) } : {}),
    panels: panels as PanelMeta[],
    layouts: arrangements(data.layouts),
    preferred: arrangements(data.preferred),
    lines,
    nextNumber: isNum(data.nextNumber) ? (data.nextNumber as number) : panels.length + 1,
    spheres,
    scenarios,
    ...(layoutCases ? { layoutCases } : {}),
    ...(activeCase ? { activeCase } : {}),
    embed,
    bookmarks,
    categories,
    ...(Object.keys(siteCategory).length ? { siteCategory } : {}),
    ...(rulesOff.length ? { rulesOff } : {}),
    ...(rulesOn.length ? { rulesOn } : {}),
    ruler: isObj(data.ruler)
      ? {
          on: data.ruler.on === true,
          labels: data.ruler.labels !== false,
          color: isNum(data.ruler.color) && (data.ruler.color as number) >= 0 && (data.ruler.color as number) < RULER_COLORS.length ? Math.floor(data.ruler.color as number) : 0,
        }
      : { ...RULER_DEFAULT },
    areaNames,
    nextArea: isNum(data.nextArea) && (data.nextArea as number) >= 1 ? Math.floor(data.nextArea as number) : areaNames.length + 1,
    look: parseLook(data.look),
    windows,
    winSetup,
    deskLooks: parseDeskLooks(data.deskLooks, winIds),
    ...(deskLayouts ? { deskLayouts } : {}),
    ...(isNum(data.pause) && (PAUSE_CHOICES as readonly number[]).includes(data.pause as number) ? { pause: data.pause as number } : {}),
    ...(isNum(data.pauseShown) && (SHOWN_CHOICES as readonly number[]).includes(data.pauseShown as number) ? { pauseShown: data.pauseShown as number } : {}),
    ...(isEngine(data.engine) && data.engine !== ENGINE_DEFAULT ? { engine: data.engine } : {}),
  };
}

export function loadWorkspace(): Workspace {
  if (PROBE) return probeWorkspace();
  try {
    let raw = localStorage.getItem(KEY);
    for (const k of OLD_KEYS) raw ??= localStorage.getItem(k);
    // F-133: erster Besuch – Beispiel-Layout statt leerer Panels.
    if (!raw) return demoWorkspace();
    return parseWorkspace(JSON.parse(raw)) ?? defaultWorkspace();
  } catch {
    return defaultWorkspace();
  }
}

/**
 * Eine in einem Panel eingebettete E-Source (F-18) liest dieselbe Arbeitsfläche, speichert aber
 * nicht: Sonst überschreiben sich äußere und innere E-Source gegenseitig.
 */
// Testbelegung (?test=voll) speichert ebenfalls nichts.
const EMBEDDED = (typeof window !== 'undefined' && window.self !== window.top) || PROBE;

/** Zeitpunkte für die Abgleich-Regel (F-121), in Millisekunden. */
export interface SyncMeta {
  /** Letzte Änderung der Arbeitsfläche auf diesem Gerät. */
  changedAt: number;
  /** Letzter Export oder Import auf diesem Gerät. */
  syncedAt: number;
}
const META_KEY = 'esource.sync.v1';

export function loadSyncMeta(): SyncMeta {
  try {
    const m: unknown = JSON.parse(localStorage.getItem(META_KEY) ?? 'null');
    if (isObj(m) && isNum(m.changedAt) && isNum(m.syncedAt)) return { changedAt: m.changedAt as number, syncedAt: m.syncedAt as number };
  } catch {
    // unlesbar: wie neu
  }
  return { changedAt: 0, syncedAt: 0 };
}

export function saveSyncMeta(m: SyncMeta): void {
  if (EMBEDDED) return;
  try {
    localStorage.setItem(META_KEY, JSON.stringify(m));
  } catch {
    // ohne Speicher keine Regel, Arbeitsfläche läuft weiter
  }
}

/**
 * F-121: Importierte Arbeitsfläche speichern und als abgeglichen markieren. Danach findet das
 * automatische Speichern keinen Unterschied mehr und zählt den Import nicht als Änderung.
 */
export function storeImported(ws: Workspace): void {
  if (EMBEDDED) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(ws));
    const now = Date.now();
    saveSyncMeta({ changedAt: now, syncedAt: now });
  } catch {
    // ohne Speicher läuft die Arbeitsfläche trotzdem weiter
  }
}

export function saveWorkspace(ws: Workspace): void {
  if (EMBEDDED) return;
  try {
    const next = JSON.stringify(ws);
    const prev = localStorage.getItem(KEY);
    if (prev === next) return; // nichts geändert (z. B. direkt nach dem Laden)
    localStorage.setItem(KEY, next);
    // Der allererste Stand (leeres Gerät) zählt nicht als Änderung, sonst fragt der erste Import unnötig.
    if (prev !== null) saveSyncMeta({ ...loadSyncMeta(), changedAt: Date.now() });
  } catch {
    // Speicher voll oder gesperrt (z. B. privater Modus): Arbeitsfläche läuft weiter, nur ohne Speichern.
  }
}
