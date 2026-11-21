import { isNode, type Node } from './tree';
import type { PanelMeta, Workspace } from './types';
import { defaultWorkspace } from './workspace';

/**
 * Stufe 1: Die Arbeitsfläche liegt nur im Browser (localStorage). Später kommt der Server dazu.
 * v4: Anordnung als Teilungsbaum (Kachel-Modell). Ältere Stände werden nicht übernommen.
 */
const KEY = 'esource.workspace.v4';

const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

function isMeta(v: unknown): v is PanelMeta {
  const optStr = (x: unknown) => x === undefined || typeof x === 'string';
  return (
    isObj(v) &&
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    optStr(v.url) &&
    optStr(v.home) &&
    (v.pos === undefined || isNum(v.pos)) &&
    (v.history === undefined || (Array.isArray(v.history) && v.history.every((h) => typeof h === 'string')))
  );
}

function treeMap(v: unknown): Record<string, Node> {
  const out: Record<string, Node> = {};
  if (!isObj(v)) return out;
  for (const [k, t] of Object.entries(v)) if (isNode(t)) out[k] = t;
  return out;
}

/** Prüft gespeicherte oder importierte Daten (F-121); null, wenn es keine Arbeitsfläche ist. */
export function parseWorkspace(data: unknown): Workspace | null {
  if (!isObj(data) || !Array.isArray(data.panels) || !data.panels.every(isMeta)) return null;
  const stackFront: Record<string, string> = {};
  if (isObj(data.stackFront)) for (const [k, v] of Object.entries(data.stackFront)) if (typeof v === 'string') stackFront[k] = v;
  const lines: Record<string, 1 | 2> = {};
  if (isObj(data.lines)) for (const [k, v] of Object.entries(data.lines)) if (v === 1 || v === 2) lines[k] = v;
  return {
    panels: data.panels,
    layouts: treeMap(data.layouts),
    preferred: treeMap(data.preferred),
    stackFront,
    lines,
    nextNumber: isNum(data.nextNumber) ? (data.nextNumber as number) : data.panels.length + 1,
  };
}

export function loadWorkspace(): Workspace {
  try {
    const raw = localStorage.getItem(KEY);
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
