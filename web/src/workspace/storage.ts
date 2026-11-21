import type { Arrangement, Named, PanelMeta, Tab, Workspace } from './types';
import { defaultWorkspace, isArrangement, newId } from './workspace';

/**
 * Stufe 1: Die Arbeitsfläche liegt nur im Browser (localStorage). Später kommt der Server dazu.
 * v5: Panels mit Tabs, Plätze mit eigenem Stapel (F-09, F-21). Ein Stand v4 wird beim ersten
 * Laden umgewandelt: Panels und Seiten bleiben, die Anordnung entsteht neu.
 */
const KEY = 'esource.workspace.v5';
const OLD_KEY = 'esource.workspace.v4';

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
  if (typeof v.area === 'string') panel.area = v.area;
  if (typeof v.scenario === 'string') panel.scenario = v.scenario;
  return panel;
}

/** Anordnungen im Format v5; ältere (reiner Baum) entfallen und entstehen beim Anzeigen neu. */
function arrangements(v: unknown): Record<string, Arrangement> {
  const out: Record<string, Arrangement> = {};
  if (!isObj(v)) return out;
  for (const [k, a] of Object.entries(v)) if (isArrangement(a)) out[k] = a;
  return out;
}

function namedList(v: unknown): Named[] {
  return Array.isArray(v) ? v.filter((n): n is Named => isObj(n) && typeof n.id === 'string' && typeof n.name === 'string') : [];
}

/**
 * Prüft gespeicherte oder importierte Daten (F-121); null, wenn es keine Arbeitsfläche ist.
 * Nimmt auch Stände v4 (Datei-Version 1) an und wandelt sie um.
 */
export function parseWorkspace(data: unknown): Workspace | null {
  if (!isObj(data) || !Array.isArray(data.panels)) return null;
  const panels = data.panels.map(parsePanel);
  if (panels.some((p) => !p)) return null;
  const embed: Record<string, boolean> = {};
  if (isObj(data.embed)) for (const [k, v] of Object.entries(data.embed)) if (typeof v === 'boolean') embed[k] = v;
  const lines: Record<string, 1 | 2> = {};
  if (isObj(data.lines)) for (const [k, v] of Object.entries(data.lines)) if (v === 1 || v === 2) lines[k] = v;
  return {
    panels: panels as PanelMeta[],
    layouts: arrangements(data.layouts),
    preferred: arrangements(data.preferred),
    lines,
    nextNumber: isNum(data.nextNumber) ? (data.nextNumber as number) : panels.length + 1,
    areas: namedList(data.areas),
    scenarios: namedList(data.scenarios),
    embed,
  };
}

export function loadWorkspace(): Workspace {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(OLD_KEY);
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
