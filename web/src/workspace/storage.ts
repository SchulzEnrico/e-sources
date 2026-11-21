import type { Arrangement, Bookmark, Named, PanelMeta, Tab, Workspace } from './types';
import { parseLook } from './look';
import { RULER_COLORS, RULER_DEFAULT, defaultWorkspace, isArrangement, newId } from './workspace';

/**
 * Stufe 1: Die Arbeitsfläche liegt nur im Browser (localStorage). Später kommt der Server dazu.
 * v7: Plätze heißen Areas (`areas` statt `places`) und haben Namen (F-128).
 * v6: dazu Lesezeichen und Kategorien (F-30 bis F-32). Ältere Stände werden beim ersten Laden
 * umgewandelt: v6 bekommt `areas`, v5 eine leere Sammlung; bei v4 bleiben Panels und Seiten, die
 * Anordnung entsteht neu.
 */
const KEY = 'esource.workspace.v7';
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
  return page && { id: v.id, ...page };
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
  if (typeof v.areaName === 'string') panel.areaName = v.areaName;
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
    out.push(item);
  }
  return out;
}

/**
 * Prüft gespeicherte oder importierte Daten (F-121); null, wenn es keine Arbeitsfläche ist.
 * Nimmt auch Stände v4/v5 (Datei-Version 1/2) an und wandelt sie um.
 */
export function parseWorkspace(data: unknown): Workspace | null {
  if (!isObj(data) || !Array.isArray(data.panels)) return null;
  const panels = data.panels.map(parsePanel);
  if (panels.some((p) => !p)) return null;
  const embed: Record<string, boolean> = {};
  if (isObj(data.embed)) for (const [k, v] of Object.entries(data.embed)) if (typeof v === 'boolean') embed[k] = v;
  const lines: Record<string, 1 | 2> = {};
  if (isObj(data.lines)) for (const [k, v] of Object.entries(data.lines)) if (v === 1 || v === 2) lines[k] = v;
  const categories = namedList(data.categories);
  const bookmarks = bookmarkList(
    data.bookmarks,
    new Set((panels as PanelMeta[]).map((p) => p.id)),
    new Set(categories.map((c) => c.id)),
  );
  // F-128: Namen der Areas; Zuordnungen zu unbekannten Namen fallen weg.
  const areaNames = namedList(data.areaNames);
  const nameIds = new Set(areaNames.map((a) => a.id));
  for (const p of panels as PanelMeta[]) if (p.areaName && !nameIds.has(p.areaName)) delete p.areaName;
  return {
    panels: panels as PanelMeta[],
    layouts: arrangements(data.layouts),
    preferred: arrangements(data.preferred),
    lines,
    nextNumber: isNum(data.nextNumber) ? (data.nextNumber as number) : panels.length + 1,
    spheres: namedList(data.spheres ?? data.areas),
    scenarios: namedList(data.scenarios),
    embed,
    bookmarks,
    categories,
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
  };
}

export function loadWorkspace(): Workspace {
  try {
    let raw = localStorage.getItem(KEY);
    for (const k of OLD_KEYS) raw ??= localStorage.getItem(k);
    if (!raw) return defaultWorkspace();
    return parseWorkspace(JSON.parse(raw)) ?? defaultWorkspace();
  } catch {
    return defaultWorkspace();
  }
}

/**
 * Eine in einem Panel eingebettete E-Source (F-18) liest dieselbe Arbeitsfläche, speichert aber
 * nicht: Sonst überschreiben sich äußere und innere E-Source gegenseitig.
 */
const EMBEDDED = typeof window !== 'undefined' && window.self !== window.top;

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
