/**
 * V123 (F-231 K13, T6): Zeitleiste als Ansicht desselben Kanban-Sheets (Rad „Ansicht“ › Zeitleiste).
 *
 * Wie Trello „Zeitleiste“: jede Karte ist ein Balken von „nicht beginnen vor“ (Start) bis „fällig“; fehlt eins von
 * beiden, ist der Balken einen Tag lang. Gruppen nach Spalte, Person oder Tag (eine Karte mit zwei Tags steht wie bei
 * Trello in beiden Gruppen). Dazu – Rangfolge ICB4 vor Trello – die Vorgänger als Pfeile und, wenn das Board zu einem
 * Projekt gehört, der kritische Pfad aus dem Projekt-Gantt (gantt.ts). Ziehen und Tastatur ändern Start und „fällig“
 * (Uhrzeit bleibt). Alles hier ist rein.
 */
import type { Note, NoteView, Workspace } from './types';
import * as No from './notes';
import { assigneeOf, personById } from './persons';
import { colorOf, fold } from './tags';
import { ganttOf } from './gantt';
import { shiftDay } from './kanbanViews';

export type TlScale = 'day' | 'week' | 'month';
export const TL_SCALES: readonly TlScale[] = ['day', 'week', 'month'];
export type TlGroup = 'col' | 'who' | 'tag';
export const TL_GROUPS: readonly TlGroup[] = ['col', 'who', 'tag'];
/** Breite eines Tages in Pixeln je Maßstab. */
export const TL_DAY_W: Record<TlScale, number> = { day: 28, week: 10, month: 3.4 };

const DAY = 86400000;
const num = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / DAY;
};
/** Tage von `a` bis `b` (b − a). */
export const daysBetween = (a: string, b: string): number => Math.round(num(b) - num(a));

export interface TlBar {
  start: string;
  end: string;
  /** woher der Balken kommt: beide Felder, nur „fällig“, nur Start */
  from: 'both' | 'due' | 'start';
  /** Start liegt nach „fällig“ – gezeigt wird ein Tag am Start, Hinweis an der Karte */
  bad?: boolean;
}

/** Balken einer Karte (Entwurf zählt wie in Tabelle/Kalender); ohne Datum `null`. */
export function barOf(n: Note): TlBar | null {
  const s = No.shownNote(n);
  const a = s.notBefore;
  const b = s.due;
  if (a && b) return a <= b ? { start: a, end: b, from: 'both' } : { start: a, end: a, from: 'both', bad: true };
  if (b) return { start: b, end: b, from: 'due' };
  if (a) return { start: a, end: a, from: 'start' };
  return null;
}

export interface TlGroupOf {
  key: string;
  name: string;
  /** Tag-Farbe (nur Gruppe nach Tag) */
  color?: string;
  notes: Note[];
}

/**
 * Karten in Gruppen (Board-Reihenfolge innerhalb der Gruppe). Spalte: alle Spalten, auch leere; Person: nach Name,
 * „Ohne Zuständigen“ hinten; Tag: alphabetisch, „Ohne Tag“ hinten. `noTag`/`noOne` sind die Namen dieser Gruppen.
 */
export function groupsOf(ws: Workspace, v: NoteView, notes: readonly Note[], by: TlGroup, names: { noOne: string; noTag: string }): TlGroupOf[] {
  if (by === 'col') {
    const ids = new Set(notes.map((n) => n.id));
    return (v.cols ?? []).map((c) => ({ key: c.id, name: c.name, notes: c.ids.filter((id) => ids.has(id)).map((id) => notes.find((n) => n.id === id)!) }));
  }
  const map = new Map<string, TlGroupOf>();
  const put = (key: string, name: string, n: Note, color?: string) => {
    const g = map.get(key) ?? { key, name, notes: [], ...(color ? { color } : {}) };
    g.notes.push(n);
    map.set(key, g);
  };
  const hidden = new Set(v.hiddenTags ?? []);
  for (const n of notes) {
    if (by === 'who') {
      const p = personById(ws, assigneeOf(n) ?? '');
      put(p ? p.id : '', p ? p.name : names.noOne, n);
    } else {
      const tags = (n.tags ?? []).filter((t) => !hidden.has(fold(t)));
      if (!tags.length) put('', names.noTag, n);
      const seen = new Set<string>();
      for (const t of tags) if (!seen.has(fold(t))) (seen.add(fold(t)), put(fold(t), t, n, colorOf(ws, t)));
    }
  }
  return [...map.values()].sort((a, b) => (a.key === '' ? 1 : b.key === '' ? -1 : a.name.localeCompare(b.name, 'de')));
}

/** Sichtbarer Zeitraum: alle Balken und heute, mit Rand; mindestens 4 Wochen (Tag), 12 Wochen (Woche), 6 Monate (Monat). */
export function rangeOf(bars: readonly TlBar[], today: string, scale: TlScale): { from: string; to: string; days: number } {
  let lo = today;
  let hi = today;
  for (const b of bars) {
    if (b.start < lo) lo = b.start;
    if (b.end > hi) hi = b.end;
  }
  const pad = scale === 'day' ? 3 : scale === 'week' ? 7 : 14;
  const min = scale === 'day' ? 28 : scale === 'week' ? 84 : 183;
  let from = shiftDay(lo, -pad);
  if (scale !== 'day') from = shiftDay(from, -((new Date(`${from}T00:00:00Z`).getUTCDay() + 6) % 7)); // ab Montag
  if (scale === 'month') from = `${from.slice(0, 8)}01`;
  let to = shiftDay(hi, pad);
  if (daysBetween(from, to) + 1 < min) to = shiftDay(from, min - 1);
  return { from, to, days: daysBetween(from, to) + 1 };
}

export interface TlTick {
  day: string;
  /** Tage ab Beginn des Zeitraums */
  at: number;
  label: string;
}

/** Striche der Zeitachse: Tag = jeder Tag, Woche = jeder Montag (KW), Monat = jeder Monatserste. */
export function ticksOf(from: string, to: string, scale: TlScale, kw: (iso: string) => number): TlTick[] {
  const out: TlTick[] = [];
  for (let d = from, i = 0; d <= to; d = shiftDay(d, 1), i++) {
    const wd = (new Date(`${d}T00:00:00Z`).getUTCDay() + 6) % 7;
    if (scale === 'day') out.push({ day: d, at: i, label: String(Number(d.slice(8, 10))) });
    else if (scale === 'week' && wd === 0) out.push({ day: d, at: i, label: `KW ${kw(d)}` });
    else if (scale === 'month' && d.endsWith('-01')) out.push({ day: d, at: i, label: new Date(`${d}T00:00:00Z`).toLocaleDateString('de-DE', { month: 'short', year: '2-digit', timeZone: 'UTC' }) });
  }
  return out;
}

/** Monate über den Strichen (nur Maßstab Tag/Woche): Name, Beginn, Länge in Tagen. */
export function monthsOf(from: string, to: string): { label: string; at: number; days: number }[] {
  const out: { label: string; at: number; days: number }[] = [];
  for (let d = from, i = 0; d <= to; d = shiftDay(d, 1), i++) {
    const m = d.slice(0, 7);
    const last = out[out.length - 1];
    if (last && last.label === m) last.days++;
    else out.push({ label: m, at: i, days: 1 });
  }
  return out.map((x) => ({ ...x, label: new Date(`${x.label}-01T00:00:00Z`).toLocaleDateString('de-DE', { month: 'long', year: 'numeric', timeZone: 'UTC' }) }));
}

export type TlEdit = Pick<Note, 'notBefore' | 'due'>;

/** Balken verschieben: Start und „fällig“ um gleich viele Tage (was fehlt, bleibt leer). */
export function moveBy(n: Note, days: number): TlEdit {
  const s = No.shownNote(n);
  if (!s.notBefore && !s.due) return {};
  return { notBefore: s.notBefore ? shiftDay(s.notBefore, days) : undefined, due: s.due ? shiftDay(s.due, days) : undefined };
}

/**
 * Ende („fällig“) bzw. Anfang (Start) ziehen; nie über das andere Ende hinaus. Fehlt das Feld, entsteht es aus dem
 * anderen Ende (Ende ziehen an einer Karte nur mit Start setzt „fällig“).
 */
export function resizeBy(n: Note, edge: 'start' | 'end', days: number): TlEdit {
  const b = barOf(n);
  if (!b) return {};
  const s = No.shownNote(n);
  if (edge === 'end') {
    let due = shiftDay(b.end, days);
    if (due < b.start) due = b.start;
    // nur „fällig“: der Balken wird länger, der bisherige Tag wird zum Start
    return { notBefore: s.notBefore ?? (due !== b.start ? b.start : undefined), due };
  }
  let start = shiftDay(b.start, days);
  if (start > b.end) start = b.end;
  // nur „fällig“ und Anfang nach rechts gezogen bis zum Ende = kein Start nötig
  return { notBefore: start === b.end && !s.notBefore ? undefined : start, due: s.due ?? b.end };
}

/** Karte ohne Datum auf einen Tag legen: „fällig“ = dieser Tag (wie im Kalender). */
export const placeAt = (day: string): TlEdit => ({ due: day });

export interface TlArrow {
  from: string;
  to: string;
  critical: boolean;
}

/** Vorgänger zwischen sichtbaren Karten (Netzplan); kritisch, wenn beide Enden im Projekt-Gantt kritisch sind. */
export function arrowsOf(notes: readonly Note[], critical: ReadonlySet<string>): TlArrow[] {
  const ids = new Set(notes.map((n) => n.id));
  const out: TlArrow[] = [];
  for (const n of notes) for (const l of n.after ?? []) if (ids.has(l.id) && l.id !== n.id) out.push({ from: l.id, to: n.id, critical: critical.has(l.id) && critical.has(n.id) });
  return out;
}

/** Kritische Karten aus dem Projekt-Gantt, wenn das Board einem Projekt gehört (sonst leer). */
export function criticalOf(ws: Workspace, v: NoteView): Set<string> {
  if (v.owner?.kind !== 'project') return new Set();
  try {
    return new Set(ganttOf(ws, v.owner.id).critical);
  } catch {
    return new Set();
  }
}
