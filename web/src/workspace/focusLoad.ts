/**
 * F-206 Schritt 8 (V94): Projektfokus – Auslastung je Person und Woche (Einsatzmittelganglinie
 * nach IPMA ICB4, Vorbild Auslastungsgrafik in MS Project). Entscheidungs-Doc V94, P10–P14, P22.
 *
 * P10: Plan-Aufwand offener Aufgaben gleichmäßig auf die Werktage zwischen „nicht beginnen vor“ und
 * „fällig am“; nur Fälligkeit → die fünf Werktage bis zum Fälligkeitstag; ohne Termin → Topf
 * „ohne Termin“; ohne Aufwand → Anzahl. Entwürfe (F-213 S10) zählen getrennt als „vorläufig“.
 * Liegt eine Aufgabe ganz vor dem Zeitraum (überfällig), zählt ihr voller Aufwand in der ersten Woche.
 * P11: dringend zählt für den Ton ×1,5, die Stunden bleiben echt. P12: unter 80 % ruhig, ab 80 %
 * gelb, über 100 % rot.
 */
import type { Note, Person, Workspace } from './types';
import { notesOf, isFinished, shownNote, hasDraft } from './notes';
import { assigneeOf, capacityOn, personById } from './persons';

export const URGENT_WEIGHT = 1.5;
export const WARN_AT = 0.8;
export const ONLY_DUE_DAYS = 5;

export type Tone = 'calm' | 'warn' | 'over';

export interface WeekLoad {
  /** Montag der Woche (JJJJ-MM-TT). */
  week: string;
  hours: number;
  /** davon dringend */
  urgent: number;
  /** vorläufig (Entwürfe), nicht in `hours` */
  draft: number;
  capacity: number;
  /** Aufgaben ohne Aufwand in dieser Woche */
  noEffort: number;
  /** Aufgaben-Ids dieser Woche */
  notes: string[];
}

export interface FocusLoad {
  weeks: WeekLoad[];
  /** Aufgaben ohne Termin */
  noDate: { hours: number; count: number; notes: string[] };
}

// ---------- Tage ----------

const toDay = (d: Date): string => d.toISOString().slice(0, 10);
const parse = (day: string): Date => new Date(`${day}T00:00:00Z`);
export function addDays(day: string, n: number): string {
  const d = parse(day);
  d.setUTCDate(d.getUTCDate() + n);
  return toDay(d);
}
const isWorkday = (day: string): boolean => {
  const w = parse(day).getUTCDay();
  return w !== 0 && w !== 6;
};
/** Montag der Woche. */
export function mondayOf(day: string): string {
  const w = parse(day).getUTCDay();
  return addDays(day, w === 0 ? -6 : 1 - w);
}
/** Werktage zwischen a und b (einschließlich). */
export function workdays(a: string, b: string): string[] {
  const out: string[] = [];
  if (a > b) return out;
  for (let d = a; d <= b && out.length < 2000; d = addDays(d, 1)) if (isWorkday(d)) out.push(d);
  return out;
}
/** Kalenderwoche nach ISO 8601. */
export function isoWeek(day: string): number {
  const d = parse(day);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const y = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - y.getTime()) / 86400000 + 1) / 7);
}

/** P10: Werktage, auf die eine Aufgabe fällt (leer = ohne Termin). */
export function spanOf(n: Pick<Note, 'notBefore' | 'due'>): string[] {
  if (n.notBefore && n.due) {
    const d = workdays(n.notBefore, n.due);
    return d.length ? d : workdays(n.due, n.due).length ? [n.due] : [n.notBefore];
  }
  if (n.due) {
    const out: string[] = [];
    for (let d = n.due; out.length < ONLY_DUE_DAYS && out.length < 30; d = addDays(d, -1)) if (isWorkday(d)) out.unshift(d);
    return out.length ? out : [n.due];
  }
  if (n.notBefore) return [n.notBefore];
  return [];
}

// ---------- Rechnung ----------

export interface LoadOpts {
  /** Montag der ersten Woche */
  from: string;
  weeks: number;
  /** Entwürfe als „vorläufig“ zeigen (P: abschaltbar) */
  drafts?: boolean;
}

/** Wer zählt zu einer Person? Team = Mitglieder (eine Ebene tief) plus das Team selbst. */
export function membersOf(ws: Workspace, p: Person): Set<string> {
  const ids = new Set([p.id]);
  if (p.kind === 'team') for (const m of p.members ?? []) {
    ids.add(m);
    for (const mm of personById(ws, m)?.members ?? []) ids.add(mm);
  }
  return ids;
}

/** P10/P14: Auslastung einer Person oder eines Teams über `weeks` Wochen ab `from`. */
export function loadOf(ws: Workspace, personId: string, o: LoadOpts): FocusLoad {
  const p = personById(ws, personId);
  const weeks: WeekLoad[] = [];
  for (let i = 0; i < o.weeks; i++) {
    const week = addDays(mondayOf(o.from), 7 * i);
    const cap = p ? [0, 1, 2, 3, 4].reduce((s, k) => s + capacityOn(ws, p, addDays(week, k)), 0) : 0;
    weeks.push({ week, hours: 0, urgent: 0, draft: 0, capacity: round(cap), noEffort: 0, notes: [] });
  }
  const noDate = { hours: 0, count: 0, notes: [] as string[] };
  if (!p) return { weeks, noDate };
  const who = membersOf(ws, p);
  const first = weeks[0]?.week ?? o.from;
  const end = addDays(first, 7 * o.weeks - 1);
  for (const raw of notesOf(ws)) {
    const draft = hasDraft(raw);
    if (draft && !o.drafts && raw.unsaved) continue;
    const n = draft && o.drafts ? shownNote(raw) : raw;
    if (isFinished(n.state)) continue;
    const a = assigneeOf(n);
    if (!a || !who.has(a)) continue;
    const plan = n.effort?.plan;
    const tentative = draft && o.drafts && (raw.unsaved || JSON.stringify(raw.effort) !== JSON.stringify(n.effort) || raw.assignee !== n.assignee);
    const days = spanOf(n);
    if (!days.length) {
      noDate.count++;
      noDate.notes.push(n.id);
      if (plan && !tentative) noDate.hours = round(noDate.hours + plan);
      continue;
    }
    // ganz vor dem Zeitraum (überfällig, noch offen): voller Aufwand in der ersten Woche
    const overdue = days[days.length - 1] < first;
    const inside = overdue ? [first] : days.filter((d) => d >= first && d <= end);
    if (!inside.length) continue;
    const per = plan ? (overdue ? plan : plan / days.length) : 0;
    const touched = new Set<number>();
    for (const d of inside) {
      const wi = Math.floor((parse(d).getTime() - parse(first).getTime()) / (7 * 86400000));
      const w = weeks[wi];
      if (!w) continue;
      touched.add(wi);
      if (!per) continue;
      if (tentative) w.draft = round(w.draft + per);
      else {
        w.hours = round(w.hours + per);
        if (n.urgent) w.urgent = round(w.urgent + per);
      }
    }
    for (const wi of touched) {
      weeks[wi].notes.push(n.id);
      if (!plan) weeks[wi].noEffort++;
    }
  }
  return { weeks, noDate };
}

const round = (x: number) => Math.round(x * 100) / 100;

/** P11/P12: Ton einer Woche. */
export function toneOf(w: Pick<WeekLoad, 'hours' | 'urgent' | 'capacity'>): Tone {
  if (w.capacity <= 0) return w.hours > 0 ? 'over' : 'calm';
  if (w.hours > w.capacity) return 'over';
  const weighted = w.hours + w.urgent * (URGENT_WEIGHT - 1);
  return weighted / w.capacity >= WARN_AT ? 'warn' : 'calm';
}

/** Auslastung in Prozent (gerundet), ohne Kapazität undefined. */
export const percentOf = (w: Pick<WeekLoad, 'hours' | 'capacity'>): number | undefined => (w.capacity > 0 ? Math.round((w.hours / w.capacity) * 100) : undefined);

/** Stunden deutsch: 1,5 h · 40 h. */
export const hoursText = (h: number): string => `${String(round(h)).replace('.', ',')} h`;

/** P13: Fokus-Zeile „Diese Woche 32 von 40 h · 3 dringend · +2 ohne Aufwand“. */
export function focusLine(ws: Workspace, w: WeekLoad): string {
  const parts = [`Diese Woche ${hoursText(w.hours).replace(' h', '')} von ${hoursText(w.capacity)}`];
  const urgent = w.notes.filter((id) => notesOf(ws).find((n) => n.id === id)?.urgent).length;
  if (urgent) parts.push(`${urgent} dringend`);
  if (w.noEffort) parts.push(`+${w.noEffort} ohne Aufwand`);
  if (w.draft) parts.push(`${hoursText(w.draft)} vorläufig`);
  return parts.join(' · ');
}

// ---------- V95 (Bau 5): Cockpit „Fokus“ ----------

export const FOCUS_WEEKS = 6;

/** P14: Team = Summe mit Balken je Mitglied. Rest = Aufgaben, die dem Team selbst zugewiesen sind. */
export function teamSplit(ws: Workspace, teamId: string, o: LoadOpts): { id: string; hours: number[] }[] {
  const p = personById(ws, teamId);
  if (!p || p.kind !== 'team' || !p.members?.length) return [];
  const total = loadOf(ws, teamId, o).weeks.map((w) => w.hours);
  const parts = p.members.map((m) => ({ id: m, hours: loadOf(ws, m, o).weeks.map((w) => w.hours) }));
  const rest = total.map((h, i) => round(Math.max(0, h - parts.reduce((s, x) => s + (x.hours[i] ?? 0), 0))));
  return rest.some((h) => h > 0) ? [...parts, { id: teamId, hours: rest }] : parts;
}

/** Skala für die Balken: Kapazität mit Luft, mindestens die höchste Woche. */
export function scaleOf(weeks: Pick<WeekLoad, 'hours' | 'draft' | 'capacity'>[]): number {
  const top = Math.max(1, ...weeks.map((w) => Math.max(w.capacity * 1.25, w.hours + w.draft)));
  return Math.ceil(top / 4) * 4;
}
