/**
 * F-40 bis F-42, F-149: Launcher – ein schwebendes Menü ohne Seiten-Anzeige für Sources, die sich
 * nicht in einem Portal anzeigen lassen (F-43). Hinein kommt automatisch jedes Lesezeichen der
 * Library, dessen Domain gesperrt ist (eingebaute Liste oder eigene Markierung). Ein Klick öffnet
 * die Source in einem neuen Browser-Tab oder -Fenster; die letzte Wahl gilt als Voreinstellung.
 *
 * Lage, Größe (offen / eingeklappt) und Wahl gehören zum Browser, nicht zur Arbeitsfläche: sie
 * liegen je Desk im localStorage und werden nicht exportiert.
 */
import { type Group, groups } from './bookmarks';
import type { Bookmark, Workspace } from './types';
import { isBlocked } from './workspace';

/** Wie eine Source außerhalb von E-Sources aufgeht (F-123). */
export type How = 'tab' | 'window';
/** Reihenfolge in den Kategorien: wie in der Library oder alphabetisch. */
export type Sort = 'library' | 'az';

export interface LauncherState {
  open: boolean;
  /** Eingeklappt zum Symbol (F-41). */
  min: boolean;
  /** Linke obere Ecke in Pixeln; negativ = Vorgabe (oben rechts). */
  x: number;
  y: number;
  how: How;
  sort: Sort;
}

export const LAUNCHER_DEFAULT: LauncherState = { open: false, min: false, x: -1, y: -1, how: 'tab', sort: 'library' };

export const HOW_NAME: Record<How, string> = { tab: 'neuer Tab', window: 'neues Fenster' };
/** „öffnet in …“ */
export const HOW_IN: Record<How, string> = { tab: 'neuem Tab', window: 'neuem Fenster' };

/** Gehört dieses Lesezeichen in den Launcher? */
export const inLauncher = (ws: Workspace, b: Bookmark): boolean => isBlocked(ws, b.url);

/** Wie viele Sources im Launcher stehen. */
export const launcherCount = (ws: Workspace): number => ws.bookmarks.reduce((n, b) => n + (inLauncher(ws, b) ? 1 : 0), 0);

/**
 * F-42: Sources des Launchers nach Kategorien (Reihenfolge der Library, „Ohne Kategorie“ zuletzt),
 * gefiltert wie die Suche der Library; leere Kategorien fallen weg.
 */
export function launcherGroups(ws: Workspace, query = '', sort: Sort = 'library'): Group[] {
  const out: Group[] = [];
  for (const g of groups(ws, null, query)) {
    let items = g.items.filter((b) => inLauncher(ws, b));
    if (!items.length) continue;
    if (sort === 'az') items = [...items].sort((a, b) => a.title.localeCompare(b.title, 'de', { sensitivity: 'base' }));
    out.push({ category: g.category, items });
  }
  return out;
}

/** Gespeicherten Stand lesen; Unbekanntes fällt auf die Vorgabe zurück. */
export function parseLauncher(raw: unknown): LauncherState {
  const d: Record<string, unknown> = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const num = (v: unknown, def: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : def);
  return {
    open: d.open === true,
    min: d.min === true,
    x: num(d.x, -1),
    y: num(d.y, -1),
    how: d.how === 'window' ? 'window' : 'tab',
    sort: d.sort === 'az' ? 'az' : 'library',
  };
}

/** Nur was von der Vorgabe abweicht – hält den gespeicherten Eintrag klein. */
export function launcherDiff(s: LauncherState): Partial<LauncherState> {
  const out: Partial<LauncherState> = {};
  for (const k of Object.keys(LAUNCHER_DEFAULT) as (keyof LauncherState)[]) if (s[k] !== LAUNCHER_DEFAULT[k]) (out as Record<string, unknown>)[k] = s[k];
  return out;
}

/**
 * Lage so begrenzen, dass das Fenster (w × h) ganz im sichtbaren Bereich (vw × vh) bleibt, mit
 * Rand `m`; ist es größer als der Bereich, bleibt die linke obere Ecke sichtbar.
 */
export function clampPos(x: number, y: number, w: number, h: number, vw: number, vh: number, m = 8): { x: number; y: number } {
  const fit = (v: number, size: number, view: number) => Math.max(m, Math.min(v, view - size - m));
  return { x: Math.round(fit(x, w, vw)), y: Math.round(fit(y, h, vh)) };
}

/** F-123: Seite außerhalb von E-Sources öffnen – als Browser-Tab oder als eigenes Fenster. */
export function openOutside(url: string, how: How): void {
  if (how === 'tab') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  const w = Math.min(1280, Math.round(window.screen.availWidth * 0.8));
  const h = Math.min(900, Math.round(window.screen.availHeight * 0.85));
  const left = Math.round((window.screen.availWidth - w) / 2);
  const top = Math.round((window.screen.availHeight - h) / 2);
  window.open(url, '_blank', `popup,noopener,noreferrer,width=${w},height=${h},left=${left},top=${top}`);
}

// ---------------------------------------------------------------- Speichern je Desk

const KEY = 'esource.launcher.v1';
const keyOf = (win: string) => (win ? `${KEY}.${win}` : KEY);

export function loadLauncher(win: string): LauncherState {
  try {
    return parseLauncher(JSON.parse(localStorage.getItem(keyOf(win)) ?? 'null'));
  } catch {
    return { ...LAUNCHER_DEFAULT };
  }
}

export function saveLauncher(win: string, s: LauncherState): void {
  try {
    const d = launcherDiff(s);
    if (Object.keys(d).length) localStorage.setItem(keyOf(win), JSON.stringify(d));
    else localStorage.removeItem(keyOf(win));
  } catch {
    // Speicher voll oder gesperrt: Launcher läuft weiter, nur ohne Merken.
  }
}
