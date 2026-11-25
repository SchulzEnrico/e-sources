/**
 * F-206 Schritt 10 (V100): Grundlagen der Terminplanung für PSP, Gantt und Netzplan.
 * Entscheidungen K1–K8 (Claude Doc „F-206 V98 – Projekte: Datenmodell …“, alle Vorschläge gelten):
 * K1 Dauer in Arbeitstagen (`duration`), fehlt = Abstand „nicht beginnen vor“ bis „fällig am“, sonst 1 Tag,
 * Meilenstein 0 · K2 je Vorgang automatisch oder manuell (`manual`), neu = automatisch · K7 Arbeitskalender
 * Mo–Fr ohne Feiertage für alle. Vorbild MS Project / iTaskX. Reine Funktionen, Tests in workspace.test.ts.
 */
import type { Note, Workspace } from './types';
import { DURATION_MAX } from './noteObjects';

// ---------------------------------------------------------------- Arbeitskalender (K7)

const toDate = (day: string) => new Date(`${day}T12:00:00Z`);
const toDay = (d: Date) => d.toISOString().slice(0, 10);
const isDayText = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Arbeitstag? Vorerst Mo–Fr ohne Feiertage (K7). */
export function isWorkday(day: string): boolean {
  const wd = toDate(day).getUTCDay();
  return wd !== 0 && wd !== 6;
}

/** Tage weiterzählen (Kalendertage, auch negativ). */
export function addDays(day: string, n: number): string {
  const d = toDate(day);
  d.setUTCDate(d.getUTCDate() + n);
  return toDay(d);
}

/** Der Tag selbst, wenn Arbeitstag, sonst der nächste (bzw. mit `back` der vorige). */
export function workdayFrom(day: string, back = false): string {
  let d = day;
  while (!isWorkday(d)) d = addDays(d, back ? -1 : 1);
  return d;
}

/**
 * Arbeitstage weiterzählen: `addWorkdays(Mo, 1)` = Di. Startet am nächsten Arbeitstag, wenn `day` keiner ist;
 * negative Zahl zählt zurück.
 */
export function addWorkdays(day: string, n: number): string {
  let d = workdayFrom(day, n < 0);
  const step = n < 0 ? -1 : 1;
  for (let i = 0; i < Math.abs(Math.round(n)); i++) d = workdayFrom(addDays(d, step), n < 0);
  return d;
}

/** Arbeitstage von `a` bis `b` einschließlich (0, wenn `b` vor `a` liegt). */
export function workdaysBetween(a: string, b: string): number {
  if (b < a) return 0;
  let n = 0;
  for (let d = a; d <= b; d = addDays(d, 1)) if (isWorkday(d)) n++;
  return n;
}

/** Ende eines Vorgangs mit `duration` Arbeitstagen ab `start` (Meilenstein: Ende = Start). */
export function endOf(start: string, duration: number): string {
  const s = workdayFrom(start);
  return duration <= 0 ? s : addWorkdays(s, duration - 1);
}

/**
 * V101 (Gantt): Arbeitstage fortlaufend zählen – Nummer eines Tages = Arbeitstage vor ihm seit Mo 05.01.1970.
 * Sa/So bekommen die Nummer des nächsten Montags. Rechnen in ganzen Arbeitstagen ohne Schleifen.
 */
const EPOCH = Date.UTC(1970, 0, 5);
export function workdayNo(day: string): number {
  const d = Math.round((toDate(day).getTime() - 12 * 3600e3 - EPOCH) / 864e5);
  const w = Math.floor(d / 7);
  const r = d - w * 7;
  return w * 5 + Math.min(r, 5);
}
/** Gegenstück zu workdayNo: der Arbeitstag mit dieser Nummer. */
export function dayOfWorkdayNo(n: number): string {
  const w = Math.floor(n / 5);
  const r = n - w * 5;
  return toDay(new Date(EPOCH + (w * 7 + r) * 864e5 + 12 * 3600e3));
}

// ---------------------------------------------------------------- Dauer und Planungsart (K1, K2)

export type DurationFrom = 'milestone' | 'set' | 'dates' | 'default';

/** Dauer in Arbeitstagen und woher sie kommt (K1) – die Oberfläche zeigt „gerechnet“ für dates/default. */
export function durationInfo(n: Pick<Note, 'milestone' | 'duration' | 'notBefore' | 'due'>): { days: number; from: DurationFrom } {
  if (n.milestone) return { days: 0, from: 'milestone' };
  if (typeof n.duration === 'number') return { days: n.duration, from: 'set' };
  if (n.notBefore && n.due && n.due >= n.notBefore) return { days: Math.max(1, workdaysBetween(n.notBefore, n.due)), from: 'dates' };
  return { days: 1, from: 'default' };
}
export const durationOf = (n: Pick<Note, 'milestone' | 'duration' | 'notBefore' | 'due'>): number => durationInfo(n).days;

/** K2: manuell geplant? Fehlt = automatisch (auch für neue Vorgänge im Projekt). */
export const isManual = (n: Pick<Note, 'manual'>): boolean => n.manual === true;

/** Eingabe der Dauer lesen: „3“, „3 T“, „3 Tage“, „0,5“ → ganze Tage; leer = null (entfernen); sonst undefined. */
export function parseDurationInput(s: string): number | null | undefined {
  const t = s.trim().toLocaleLowerCase('de').replace(/\s*(t|tg|tag|tage|d|days?)\.?$/, '').replace(',', '.');
  if (!t) return null;
  if (!/^\d+(\.\d+)?$/.test(t)) return undefined;
  return Math.min(DURATION_MAX, Math.round(Number(t)));
}

export interface TaskPlan {
  /** Arbeitstage; `null` entfernt das Feld (dann gilt K1-Ersatz). */
  duration?: number | null;
  manual?: boolean;
  milestone?: boolean;
}

/**
 * Planungsfelder eines Vorgangs setzen – wirkt sofort wie Projekt und Quellen (nicht Teil des Entwurfs,
 * F-213). Meilenstein an = Dauer entfällt (0); Dauer > 0 nimmt den Meilenstein weg (wie MS Project).
 */
export function setTaskPlan(ws: Workspace, id: string, plan: TaskPlan, now = Date.now()): Workspace {
  const notes = ws.notes ?? [];
  const i = notes.findIndex((n) => n.id === id);
  if (i < 0) return ws;
  const out: Note = { ...notes[i] };
  if ('duration' in plan) {
    const d = plan.duration;
    if (d === null || d === undefined) delete out.duration;
    else if (Number.isFinite(d) && d >= 0) {
      out.duration = Math.min(DURATION_MAX, Math.round(d));
      if (out.duration > 0) delete out.milestone;
    }
  }
  if ('manual' in plan) {
    if (plan.manual) out.manual = true;
    else delete out.manual;
  }
  if ('milestone' in plan) {
    if (plan.milestone) {
      out.milestone = true;
      delete out.duration;
    } else delete out.milestone;
  }
  const same = (['duration', 'manual', 'milestone'] as const).every((k) => out[k] === notes[i][k]);
  if (same) return ws;
  out.changed = now;
  const next = notes.slice();
  next[i] = out;
  return { ...ws, notes: next };
}

/** Ist der Text ein Datum JJJJ-MM-TT? (für Aufrufer ohne eigene Prüfung) */
export const isDay = isDayText;
