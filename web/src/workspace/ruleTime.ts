/**
 * F-231 K10c (V131): Regeln nach der Uhr – Entscheidungen B5/B6 (Claude Doc „F-231 V128 – K10 Butler“).
 *
 * Zeitplan (wie Trello-Kalenderbefehle): täglich, an Arbeitstagen (Mo–Fr ohne Feiertage und freie Tage aus dem
 * Arbeitskalender, ICB4/MS Project), wöchentlich an einem Wochentag, monatlich an einem Tag (in kürzeren Monaten am
 * letzten Tag); optional mit Uhrzeit. Fälligkeit (wie Trello-Fälligkeitsbefehle): n Tage oder Stunden vor bzw. nach
 * „fällig“ einer Karte.
 *
 * E-Sources läuft nur, wenn es offen ist (B6): Verpasste Termine holt `runCheck` beim Start einmal nach – je
 * Zeitplan-Regel höchstens die letzte Wiederholung. Der Stand steht in `ruleSet.ran` (abgeglichen); eine
 * wiederkehrende Karte bekommt die feste Kennung „Regel~Termin“, so legt ein zweites Gerät sie nicht noch einmal an.
 * Beim Speichern bzw. Einschalten wird eine Regel „scharf“ gestellt (`arm`): nur Termine danach zählen – sonst würde
 * eine neue Regel sofort Vergangenes nachholen. Alles hier ist rein.
 */
import * as No from './notes';
import { isOffDay } from './calendar';
import { type KitRule, type Trig, isSchedule, isTimed, kitOf } from './ruleKit';
import { RAN_MAX, ruleSetOf, withRan } from './ruleSet';
import type { Note, Workspace } from './types';

const p2 = (n: number) => String(n).padStart(2, '0');

/** Ortszeit eines Tages „JJJJ-MM-TT“ mit Uhrzeit „HH:MM“ in ms. */
export function momentOf(day: string, time?: string): number {
  const [y, m, d] = day.split('-').map(Number);
  const [h, mi] = (time || '00:00').split(':').map(Number);
  return new Date(y, m - 1, d, h || 0, mi || 0).getTime();
}
/** Stempel „JJJJ-MM-TTTHH:MM“ (lexikalisch sortierbar). */
export const stampOf = (day: string, time?: string) => `${day}T${time || '00:00'}`;
export const stampAt = (ms: number) => {
  const d = new Date(ms);
  return stampOf(No.dayOf(ms), `${p2(d.getHours())}:${p2(d.getMinutes())}`);
};
export const momentOfStamp = (s: string) => momentOf(s.slice(0, 10), s.slice(11, 16));

/** Wochentag 1–7 (Montag = 1). */
export const weekdayOf = (day: string) => {
  const g = new Date(`${day}T12:00:00Z`).getUTCDay();
  return g === 0 ? 7 : g;
};
const lastDayOf = (day: string) => new Date(Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)), 0)).getUTCDate();

/** Fällt der Zeitplan auf diesen Tag? */
export function onDay(t: Pick<Trig, 'k' | 'n'>, day: string): boolean {
  switch (t.k) {
    case 'daily':
      return true;
    case 'workdays':
      return weekdayOf(day) <= 5 && !isOffDay(day);
    case 'weekly':
      return weekdayOf(day) === (t.n ?? 1);
    case 'monthly':
      return Number(day.slice(8, 10)) === Math.min(t.n ?? 1, lastDayOf(day));
    default:
      return false;
  }
}

export interface Occurrence {
  day: string;
  stamp: string;
  at: number;
}

/** Letzte Wiederholung bis einschließlich `now` (höchstens gut ein Jahr zurück). */
export function lastOccurrence(t: Trig, now: number): Occurrence | null {
  if (!isSchedule(t.k)) return null;
  let day = No.dayOf(now);
  for (let i = 0; i < 400; i++, day = No.shiftDay(day, -1)) {
    if (!onDay(t, day)) continue;
    const at = momentOf(day, t.b);
    if (at <= now) return { day, stamp: stampOf(day, t.b), at };
  }
  return null;
}

/** Nächste Wiederholung nach `now` – für „Nächster Termin“ in der Liste. */
export function nextOccurrence(t: Trig, now: number): Occurrence | null {
  if (!isSchedule(t.k)) return null;
  let day = No.dayOf(now);
  for (let i = 0; i < 400; i++, day = No.shiftDay(day, 1)) {
    if (!onDay(t, day)) continue;
    const at = momentOf(day, t.b);
    if (at > now) return { day, stamp: stampOf(day, t.b), at };
  }
  return null;
}

/** Fälligkeit: Zeitpunkt, zu dem die Regel für diese Karte auslöst (null = Karte ohne „fällig“). */
export function dueMoment(t: Trig, n: Pick<Note, 'due' | 'dueTime'>): number | null {
  if (t.k !== 'dueNear' || !n.due) return null;
  const base = momentOf(n.due, n.dueTime);
  const ms = (t.n ?? 0) * (t.b === 'h' ? 36e5 : 864e5);
  return t.a === 'after' ? base + ms : base - ms;
}
/** Termin einer Karte als Stempel – ändert sich „fällig“, darf die Regel für die Karte wieder auslösen. */
export const dueStamp = (n: Pick<Note, 'due' | 'dueTime'>) => `${n.due ?? ''}T${n.dueTime ?? ''}`;
export const ranKey = (ruleId: string, noteId: string) => `${ruleId}|${noteId}`;
/** Feste Kennung der wiederkehrenden Karte (B6): Regel + Termin, nur sichere Zeichen. */
export const recurId = (ruleId: string, stamp: string) => `${ruleId}~${stamp.replace(/[^0-9A-Za-z-]/g, '')}`;

/**
 * Regel scharf stellen: Zeitplan → letzte Wiederholung gilt als erledigt; Fälligkeit → nur Zeitpunkte ab jetzt.
 * Einträge für Karten dieser Regel fallen weg (die Regel kann sich geändert haben).
 */
export function arm(ws: Workspace, ruleId: string, now: number): Workspace {
  const r = kitOf(ws).find((x) => x.id === ruleId);
  const ran = { ...(ruleSetOf(ws).ran ?? {}) };
  for (const k of Object.keys(ran)) if (k === ruleId || k.startsWith(`${ruleId}|`)) delete ran[k];
  if (r && isTimed(r.when.k)) ran[ruleId] = isSchedule(r.when.k) ? (lastOccurrence(r.when, now)?.stamp ?? stampAt(now)) : stampAt(now);
  return withRan(ws, ran);
}

/** Nach dem Speichern/Einschalten: scharf stellen, wenn die Regel neu ist, ihr Auslöser sich geändert hat oder sie an ging. */
export function armIfNeeded(ws: Workspace, old: KitRule | undefined, ruleId: string, now: number): Workspace {
  const r = kitOf(ws).find((x) => x.id === ruleId);
  if (!r || !isTimed(r.when.k)) return old && isTimed(old.when.k) ? arm(ws, ruleId, now) : ws;
  const same = old && JSON.stringify(old.when) === JSON.stringify(r.when) && old.on === r.on;
  if (same && ruleSetOf(ws).ran?.[ruleId]) return ws;
  return r.on ? arm(ws, ruleId, now) : ws;
}

/** Aufräumen: Einträge gelöschter Regeln und Karten fallen weg; höchstens RAN_MAX. */
export function pruneRan(ws: Workspace, ran: Record<string, string>): Record<string, string> {
  const rules = new Set(kitOf(ws).map((r) => r.id));
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(ran)) {
    const [rule, note] = k.split('|');
    if (!rules.has(rule)) continue;
    if (note && !No.noteById(ws, note)) continue;
    out[k] = v;
  }
  const keys = Object.keys(out);
  if (keys.length > RAN_MAX) for (const k of keys.filter((x) => x.includes('|')).sort((a, b) => out[a].localeCompare(out[b])).slice(0, keys.length - RAN_MAX)) delete out[k];
  return out;
}
