/**
 * V122 (F-231 K13, Entscheidung T6): Ansichten desselben Kanban-Sheets – Board | Tabelle | Kalender (Monat/Woche).
 *
 * Reine Logik: Zeilen der Tabelle (Reihenfolge wie im Board, sortierbar wie Trello „Tabelle“) und das Raster des
 * Kalenders (Woche beginnt am Montag), Karten nach „fällig“ je Tag. Ziehen im Kalender ändert „fällig“ (Uhrzeit bleibt).
 */
import type { Note, NoteColumn, NoteView, Workspace } from './types';
import * as No from './notes';
import { assigneeOf, personById } from './persons';

export interface TableRow {
  note: Note;
  col: NoteColumn;
}
export type TableSort = 'board' | 'title' | 'col' | 'due' | 'who' | 'state' | 'tags';
export const TABLE_SORTS: readonly TableSort[] = ['title', 'col', 'tags', 'who', 'due', 'state'];

/** Karten des Boards in Board-Reihenfolge (Spalte für Spalte), ohne archivierte; `keep` filtert (Suche, Filter …). */
export function tableRows(ws: Workspace, v: NoteView, keep: (n: Note) => boolean = () => true): TableRow[] {
  const out: TableRow[] = [];
  for (const col of v.cols ?? [])
    for (const id of col.ids) {
      const n = No.noteById(ws, id);
      if (n && n.state !== 'archived' && keep(n)) out.push({ note: n, col });
    }
  return out;
}

const STATE_ORDER: Record<string, number> = { open: 0, doing: 1, waiting: 2, review: 3, done: 4, archived: 5 };

/** Sortieren; gleiche Werte behalten die Board-Reihenfolge, Leeres (ohne Datum, ohne Person) steht hinten. */
export function sortRows(ws: Workspace, v: NoteView, rows: readonly TableRow[], by: TableSort, desc = false): TableRow[] {
  if (by === 'board') return desc ? [...rows].reverse() : [...rows];
  const colIx = new Map((v.cols ?? []).map((c, i) => [c.id, i]));
  const key = (r: TableRow): string | number | null => {
    const n = No.shownNote(r.note);
    if (by === 'title') return (No.titleOf(n) || '').toLocaleLowerCase('de');
    if (by === 'col') return colIx.get(r.col.id) ?? 0;
    if (by === 'due') return n.due ? `${n.due} ${n.dueTime ?? '23:59'}` : null;
    if (by === 'who') return personById(ws, assigneeOf(r.note) ?? '')?.name.toLocaleLowerCase('de') ?? null;
    if (by === 'tags') return r.note.tags?.length ? [...r.note.tags].sort((a, b) => a.localeCompare(b, 'de')).join(' ').toLocaleLowerCase('de') : null;
    return STATE_ORDER[No.stateOf(ws, r.note).state] ?? 0;
  };
  const withIx = rows.map((r, i) => ({ r, i, k: key(r) }));
  withIx.sort((a, b) => {
    if (a.k === null && b.k === null) return a.i - b.i;
    if (a.k === null) return 1;
    if (b.k === null) return -1;
    const c = typeof a.k === 'number' && typeof b.k === 'number' ? a.k - b.k : String(a.k).localeCompare(String(b.k), 'de');
    return (desc ? -c : c) || a.i - b.i;
  });
  return withIx.map((x) => x.r);
}

// ---------- Kalender ----------

const parse = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const fmt = (d: Date) => d.toISOString().slice(0, 10);

/** Datum als JJJJ-MM-TT (Ortszeit). */
export function isoDay(at: Date | number = Date.now()): string {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function shiftDay(iso: string, days: number): string {
  const d = parse(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return fmt(d);
}

/** Monat verschieben; der Tag wird auf das Monatsende gekürzt (31.01. + 1 → 28.02.). */
export function shiftMonth(iso: string, months: number): string {
  const d = parse(iso);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return fmt(d);
}

/** Montag der Woche. */
export function weekStart(iso: string): string {
  const wd = (parse(iso).getUTCDay() + 6) % 7; // Mo = 0
  return shiftDay(iso, -wd);
}

/** Die sieben Tage der Woche (Mo–So). */
export const weekDays = (iso: string): string[] => Array.from({ length: 7 }, (_, i) => shiftDay(weekStart(iso), i));

/** Raster eines Monats: ganze Wochen (Mo–So) vom ersten bis zum letzten Tag. */
export function monthDays(iso: string): string[] {
  const first = `${iso.slice(0, 8)}01`;
  const d = parse(first);
  const last = fmt(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
  const out: string[] = [];
  for (let x = weekStart(first); x <= last || out.length % 7; x = shiftDay(x, 1)) out.push(x);
  return out;
}

/** ISO-Kalenderwoche. */
export function isoWeek(iso: string): number {
  const d = parse(iso);
  const wd = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - wd + 3); // Donnerstag dieser Woche
  const jan1 = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - jan1) / 86400000 + 1) / 7);
}

/** Karten je Tag nach „fällig“ (mit Uhrzeit zuerst, dann ganztägig), dazu die ohne Datum. */
export function byDay(notes: readonly Note[]): { days: Map<string, Note[]>; none: Note[] } {
  const days = new Map<string, Note[]>();
  const none: Note[] = [];
  for (const n of notes) {
    const d = No.shownNote(n).due;
    if (!d) none.push(n);
    else days.set(d, [...(days.get(d) ?? []), n]);
  }
  for (const [k, list] of days)
    days.set(
      k,
      [...list].sort((a, b) => (No.shownNote(a).dueTime ?? '99').localeCompare(No.shownNote(b).dueTime ?? '99')),
    );
  return { days, none };
}
