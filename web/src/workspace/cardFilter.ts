/**
 * V122 (F-231 K4): Kartenfilter wie bei Trello – nach Tag, Fälligkeit, Zustand und Person, kombiniert.
 *
 * „ODER“ (Trello: „Beliebige Treffer“): eine Karte bleibt, wenn sie mindestens ein gewähltes Merkmal hat.
 * „UND“ (Trello: „Exakte Treffer“): sie muss alle gewählten Merkmale haben. Leerer Filter = alles sichtbar.
 * Gilt in jeder Ansicht des Kanbans (Board, Tabelle, Kalender) gleich – „weitestgehend gleicher Aufbau“.
 */
import type { Note, NoteState, Workspace } from './types';
import * as No from './notes';
import { assigneeOf } from './persons';
import { dueKind } from './kanbanMore';
import { fold } from './tags';

export type DueFilter = 'over' | 'soon' | 'week' | 'none' | 'done';
export type StateFilter = Exclude<NoteState, 'archived'>;
export type FilterMode = 'any' | 'all';

export interface CardFilter {
  /** klein geschriebene Tag-Namen; '' = „ohne Tag“ */
  tags: string[];
  due: DueFilter[];
  states: StateFilter[];
  /** Personen-Ids; '' = „ohne Zuständigen“ */
  persons: string[];
  mode: FilterMode;
}

export const FILTER_EMPTY: CardFilter = { tags: [], due: [], states: [], persons: [], mode: 'any' };
export const DUE_FILTERS: readonly DueFilter[] = ['over', 'soon', 'week', 'none', 'done'];
export const STATE_FILTERS: readonly StateFilter[] = ['open', 'doing', 'waiting', 'review', 'done'];

/** Zahl der gewählten Merkmale (für „Filter (3)“). */
export const filterCount = (f: CardFilter): number => f.tags.length + f.due.length + f.states.length + f.persons.length;

const WEEK = 7 * 24 * 3600 * 1000;

function dueHit(n: Note, d: DueFilter, now: number): boolean {
  const k = dueKind(n, now);
  if (d === 'none') return !n.due;
  if (d === 'done') return k === 'done';
  if (d === 'over') return k === 'over';
  if (d === 'soon') return k === 'soon';
  // „diese Woche“ = in den nächsten 7 Tagen fällig und noch offen (wie Trello „Fällig in der nächsten Woche“)
  if (k !== 'soon' && k !== 'later') return false;
  const at = new Date(`${n.due}T${n.dueTime ?? '23:59'}:00`).getTime();
  return at - now <= WEEK;
}

/** Erfüllt die Karte den Filter? */
export function passes(ws: Workspace, n: Note, f: CardFilter, now = Date.now()): boolean {
  if (!filterCount(f)) return true;
  const tags = (n.tags ?? []).map(fold);
  const st = No.stateOf(ws, n).state;
  const who = assigneeOf(n) ?? '';
  const hits: boolean[] = [
    ...f.tags.map((t) => (t === '' ? !tags.length : tags.includes(t))),
    ...f.due.map((d) => dueHit(n, d, now)),
    ...f.states.map((s) => st === s),
    ...f.persons.map((p) => who === p),
  ];
  return f.mode === 'all' ? hits.every(Boolean) : hits.some(Boolean);
}

/** Ein Merkmal an- bzw. abwählen. */
export function toggle<K extends 'tags' | 'due' | 'states' | 'persons'>(f: CardFilter, key: K, val: CardFilter[K][number]): CardFilter {
  const list = f[key] as string[];
  const v = val as string;
  return { ...f, [key]: list.includes(v) ? list.filter((x) => x !== v) : [...list, v] };
}

/** Gemerkten Stand prüfen (sheetPrefs): nur bekannte Werte. */
export function parseCardFilter(raw: unknown): CardFilter | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const r = raw as Record<string, unknown>;
  const strs = (x: unknown) => (Array.isArray(x) ? [...new Set(x.filter((s): s is string => typeof s === 'string'))] : []);
  const f: CardFilter = {
    tags: strs(r.tags).map((t) => (t ? fold(t) : '')),
    due: strs(r.due).filter((d): d is DueFilter => (DUE_FILTERS as readonly string[]).includes(d)),
    states: strs(r.states).filter((s): s is StateFilter => (STATE_FILTERS as readonly string[]).includes(s)),
    persons: strs(r.persons),
    mode: r.mode === 'all' ? 'all' : 'any',
  };
  return filterCount(f) || f.mode === 'all' ? f : undefined;
}
