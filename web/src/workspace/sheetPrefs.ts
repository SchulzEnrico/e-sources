/**
 * V88 (F-206 Schritt 7, kleiner Punkt): Rad-Wahl „Zeigen“ (Offen · Alle) und „Ordnung“ (Eigene · Fällig ·
 * Wichtig) je Sheet und Gerät merken – nur lokal (wie die Anzeige-Einstellungen), nicht abgeglichen.
 */
import { type CardFilter, parseCardFilter } from './cardFilter';

export const SHEET_PREFS_KEY = 'esource.sheetPrefs.v1';
/** Höchstens so viele Sheets merken (älteste fallen weg). */
export const SHEET_PREFS_MAX = 200;

export interface SheetPref {
  show?: 'open' | 'all';
  order?: 'own' | 'due' | 'important';
  /** V122 (F-231 K4): Kartenfilter des Kanbans (Tag, Fälligkeit, Zustand, Person, UND/ODER). */
  filter?: CardFilter;
  /** V122 (F-231 K13): Ansicht des Kanbans. */
  kview?: KView;
  /** V123 (F-231 K13): Zeitleiste – Maßstab und Gruppen. */
  tlScale?: 'day' | 'week' | 'month';
  tlGroup?: 'col' | 'who' | 'tag';
}

/** V122 (F-231 K13, T6): Ansichten desselben Kanban-Sheets über das Rad „Ansicht“. */
export type KView = 'board' | 'table' | 'calendar' | 'timeline' | 'stats';
export const KVIEWS: readonly KView[] = ['board', 'table', 'calendar', 'timeline', 'stats'];

/** Gespeicherten Stand prüfen: nur bekannte Werte. */
export function parseSheetPrefs(raw: unknown): Record<string, SheetPref> {
  const out: Record<string, SheetPref> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== 'object') continue;
    const p = v as Record<string, unknown>;
    const pref: SheetPref = {};
    if (p.show === 'open' || p.show === 'all') pref.show = p.show;
    if (p.order === 'own' || p.order === 'due' || p.order === 'important') pref.order = p.order;
    const f = parseCardFilter(p.filter);
    if (f) pref.filter = f;
    if (typeof p.kview === 'string' && (KVIEWS as readonly string[]).includes(p.kview)) pref.kview = p.kview as KView;
    if (p.tlScale === 'day' || p.tlScale === 'week' || p.tlScale === 'month') pref.tlScale = p.tlScale;
    if (p.tlGroup === 'col' || p.tlGroup === 'who' || p.tlGroup === 'tag') pref.tlGroup = p.tlGroup;
    if (Object.keys(pref).length) out[id] = pref;
  }
  return out;
}

/** Wahl setzen; der zuletzt geänderte Eintrag steht hinten, über SHEET_PREFS_MAX fällt der älteste weg. */
export function withSheetPref(all: Record<string, SheetPref>, id: string, patch: SheetPref): Record<string, SheetPref> {
  const { [id]: old, ...rest } = all;
  const next = { ...rest, [id]: { ...old, ...patch } };
  const keys = Object.keys(next);
  return keys.length > SHEET_PREFS_MAX ? Object.fromEntries(keys.slice(keys.length - SHEET_PREFS_MAX).map((k) => [k, next[k]])) : next;
}

export function loadSheetPref(id: string): SheetPref {
  try {
    return parseSheetPrefs(JSON.parse(localStorage.getItem(SHEET_PREFS_KEY) ?? '{}'))[id] ?? {};
  } catch {
    return {};
  }
}

export function saveSheetPref(id: string, patch: SheetPref): void {
  try {
    const all = parseSheetPrefs(JSON.parse(localStorage.getItem(SHEET_PREFS_KEY) ?? '{}'));
    localStorage.setItem(SHEET_PREFS_KEY, JSON.stringify(withSheetPref(all, id, patch)));
  } catch {
    /* privates Fenster o. Ä. – dann nur bis zum Neuladen */
  }
}
