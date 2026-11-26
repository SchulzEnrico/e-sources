/**
 * V123 (F-231 K13): Kennzahlen als Ansicht desselben Kanban-Sheets (Rad „Ansicht“ › Kennzahlen).
 *
 * Wie Trello „Dashboard“ (Karten je Liste, je Mitglied, je Label, nach Fälligkeit), dazu aus dem Kanban Guide und
 * ICB4 (Kontrolle des Fortschritts): WIP-Limit je Spalte, Fortschritt der Checklisten und das Alter offener Karten
 * („Work Item Age“, ab dem Anlegen). Es zählen die sichtbaren Karten (Suche, „Nur meine“, Filter), ohne archivierte.
 * Alles hier ist rein.
 */
import type { Note, NoteView, Workspace } from './types';
import * as No from './notes';
import { assigneeOf, personById } from './persons';
import { colorOf, fold } from './tags';
import { checklistOf } from './sheets';
import { dueKind } from './kanbanMore';

export type DueBucket = 'over' | 'soon' | 'week' | 'later' | 'none' | 'done';
export const DUE_BUCKETS: readonly DueBucket[] = ['over', 'soon', 'week', 'later', 'none', 'done'];

export interface StatCol {
  id: string;
  name: string;
  count: number;
  wip?: number;
  /** über dem WIP-Limit */
  over: boolean;
}
export interface StatItem {
  /** Personen-Id bzw. Tag klein geschrieben; '' = ohne */
  key: string;
  name: string;
  count: number;
  /** davon noch offen (nicht erledigt) */
  open: number;
  color?: string;
}
export interface BoardStats {
  total: number;
  open: number;
  done: number;
  cols: StatCol[];
  persons: StatItem[];
  tags: StatItem[];
  due: Record<DueBucket, number>;
  check: { done: number; all: number; cards: number };
  /** Alter offener Karten in Tagen (ab dem Anlegen) – Durchschnitt und älteste */
  age: { avg: number; max: number; oldest?: string } | null;
}

const WEEK = 7 * 86400000;

/** Fälligkeit einer Karte in einem Fach (wie der Kartenfilter, „7 Tage“ ohne die „bald“). */
export function dueBucket(n: Note, now = Date.now()): DueBucket {
  const s = No.shownNote(n);
  const k = dueKind({ ...s, state: n.state }, now);
  if (!k) return 'none';
  if (k !== 'later') return k;
  const at = new Date(`${s.due}T${s.dueTime ?? '23:59'}:00`).getTime();
  return at - now <= WEEK ? 'week' : 'later';
}

const createdAt = (n: Note): number | undefined => n.trail.find((e) => e.what === 'created')?.at ?? n.trail[0]?.at;

export function boardStats(ws: Workspace, v: NoteView, keep: (n: Note) => boolean = () => true, now = Date.now(), names = { noOne: 'Ohne Zuständigen', noTag: 'Ohne Tag' }): BoardStats {
  const due = Object.fromEntries(DUE_BUCKETS.map((b) => [b, 0])) as Record<DueBucket, number>;
  const persons = new Map<string, StatItem>();
  const tags = new Map<string, StatItem>();
  const hidden = new Set(v.hiddenTags ?? []);
  const check = { done: 0, all: 0, cards: 0 };
  const ages: { d: number; id: string }[] = [];
  let total = 0;
  let done = 0;
  const cols: StatCol[] = [];
  const bump = (m: Map<string, StatItem>, key: string, name: string, fin: boolean, color?: string) => {
    const it = m.get(key) ?? { key, name, count: 0, open: 0, ...(color ? { color } : {}) };
    it.count++;
    if (!fin) it.open++;
    m.set(key, it);
  };
  for (const c of v.cols ?? []) {
    let count = 0;
    for (const id of c.ids) {
      const n = No.noteById(ws, id);
      if (!n || n.state === 'archived' || !keep(n)) continue;
      count++;
      total++;
      const fin = No.isFinished(No.stateOf(ws, n).state);
      if (fin) done++;
      due[dueBucket(n, now)]++;
      const p = personById(ws, assigneeOf(n) ?? '');
      bump(persons, p ? p.id : '', p ? p.name : names.noOne, fin);
      const ts = (n.tags ?? []).filter((t) => !hidden.has(fold(t)));
      if (!ts.length) bump(tags, '', names.noTag, fin);
      const seen = new Set<string>();
      for (const t of ts) if (!seen.has(fold(t))) (seen.add(fold(t)), bump(tags, fold(t), t, fin, colorOf(ws, t)));
      const cl = checklistOf(No.shownNote(n));
      if (cl) (check.done += cl.done, (check.all += cl.all), check.cards++);
      const at = createdAt(n);
      if (!fin && at) ages.push({ d: Math.max(0, Math.floor((now - at) / 86400000)), id: n.id });
    }
    cols.push({ id: c.id, name: c.name, count, ...(c.wip ? { wip: c.wip } : {}), over: !!c.wip && count > c.wip });
  }
  const sortItems = (m: Map<string, StatItem>) => [...m.values()].sort((a, b) => (a.key === '' ? 1 : b.key === '' ? -1 : b.count - a.count || a.name.localeCompare(b.name, 'de')));
  const oldest = ages.reduce<{ d: number; id: string } | null>((a, x) => (!a || x.d > a.d ? x : a), null);
  return {
    total,
    open: total - done,
    done,
    cols,
    persons: sortItems(persons),
    tags: sortItems(tags),
    due,
    check,
    age: oldest ? { avg: Math.round((ages.reduce((s, x) => s + x.d, 0) / ages.length) * 10) / 10, max: oldest.d, oldest: oldest.id } : null,
  };
}

/** Breite eines Balkens in Prozent des größten Werts (mindestens 2 %, damit 1 sichtbar bleibt; 0 = leer). */
export const barPct = (n: number, max: number): number => (n <= 0 || max <= 0 ? 0 : Math.max(2, Math.round((n / max) * 100)));
