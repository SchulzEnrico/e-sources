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
import type { FocusView, Note, Person, Workspace } from './types';
import { FOCUS_VIEWS } from './noteObjects';
import { isOffDay } from './calendar';
import { notesOf, isFinished, shownNote, hasDraft } from './notes';
import { capacityOn, personById, personList } from './persons';
import { hoursFor, involves } from './gpm';

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
// V116 (K7): Feiertage und freie Tage des Arbeitskalenders zählen nicht
const isWorkday = (day: string): boolean => {
  const w = parse(day).getUTCDay();
  return w !== 0 && w !== 6 && !isOffDay(day);
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
  /** V117 (Projekt-Desk, PD5): nur Vorgänge dieses Projekts */
  project?: string;
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
    if (o.project && n.project !== o.project) continue;
    // V110 (F-226 G7): mehrere Ressourcen je Vorgang – jede zählt mit ihren Einsatz-Stunden
    if (!involves(n, who)) continue;
    const plan = hoursFor(n, who);
    const tentative = draft && o.drafts && (raw.unsaved || JSON.stringify(raw.effort) !== JSON.stringify(n.effort) || JSON.stringify(raw.use) !== JSON.stringify(n.use) || raw.assignee !== n.assignee);
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

// ---------- V96 (Bau 7, P13/C2): Darstellungen, Fokus-Ring, Auslastungs-Raster ----------

/** Darstellungen, die die Wochen zeigen – eine davon bleibt immer an. */
export const FOCUS_CHARTS: readonly FocusView[] = ['week', 'ring', 'grid'];

/** Gewählte Darstellungen; fehlt = Werk = alle (Lastenheft: „alle wählbar und kombinierbar“). */
export const focusViewsOf = (ws: Workspace): FocusView[] => ws.focusViews ?? [...FOCUS_VIEWS];
export const showsView = (ws: Workspace, v: FocusView): boolean => focusViewsOf(ws).includes(v);

/** Darstellung ein-/ausschalten. null = abgelehnt (die letzte Wochen-Darstellung bleibt an). Werk wird nicht gespeichert. */
export function setFocusView(ws: Workspace, v: FocusView, on: boolean): Workspace | null {
  const cur = focusViewsOf(ws);
  const next = FOCUS_VIEWS.filter((x) => (x === v ? on : cur.includes(x)));
  if (!next.some((x) => FOCUS_CHARTS.includes(x))) return null;
  if (next.length === FOCUS_VIEWS.length) {
    const { focusViews: _f, ...rest } = ws; // eslint-disable-line @typescript-eslint/no-unused-vars
    return rest;
  }
  return { ...ws, focusViews: next };
}

export type RingKind = 'hours' | 'urgent' | 'member' | 'draft';
export interface RingArc { kind: RingKind; id?: string; from: number; to: number }
export interface Ring {
  /** Bögen als Anteil des Kreises (0–1); voller Kreis = Kapazität */
  arcs: RingArc[];
  /** Überlast als zweiter, äußerer Bogen (0–1 = bis doppelte Kapazität) */
  over: number;
  pct?: number;
}

/**
 * Fokus-Ring (wie ein Füllstand): voller Kreis = Kapazität der Woche. Reihenfolge geplant → dringend
 * (bzw. je Mitglied) → vorläufig. Was über die Kapazität geht, läuft als äußerer Bogen weiter.
 */
export function ringOf(w: Pick<WeekLoad, 'hours' | 'urgent' | 'draft' | 'capacity'>, members?: { id: string; hours: number }[]): Ring {
  const parts: { kind: RingKind; id?: string; value: number }[] = members?.length
    ? members.map((m) => ({ kind: 'member' as const, id: m.id, value: m.hours }))
    : [{ kind: 'hours', value: w.hours - w.urgent }, { kind: 'urgent', value: w.urgent }];
  parts.push({ kind: 'draft', value: w.draft });
  const total = w.capacity > 0 ? w.capacity : Math.max(1, w.hours + w.draft);
  const arcs: RingArc[] = [];
  let at = 0;
  for (const x of parts) {
    if (x.value <= 0 || at >= 1) continue;
    const to = Math.min(1, at + x.value / total);
    arcs.push({ kind: x.kind, ...(x.id ? { id: x.id } : {}), from: round(at), to: round(to) });
    at = to;
  }
  const over = w.capacity > 0 && w.hours > w.capacity ? Math.min(1, round((w.hours - w.capacity) / w.capacity)) : w.capacity <= 0 && w.hours > 0 ? 1 : 0;
  return { arcs, over, pct: percentOf(w) };
}

export interface GridCell { hours: number; capacity: number; draft: number; count: number; noEffort: number; tone: Tone; pct?: number }
export interface GridRow {
  /** Person bzw. Team; null = Summe aller Zeilen */
  id: string | null;
  /** Summenzeile (Team selbst bzw. „Summe“) */
  sum: boolean;
  cells: GridCell[];
}

const cellOf = (w: WeekLoad): GridCell => ({ hours: w.hours, capacity: w.capacity, draft: w.draft, count: w.notes.length, noEffort: w.noEffort, tone: toneOf(w), pct: percentOf(w) });

/**
 * Auslastungs-Raster (wie „Ressource: Einsatz“ in MS Project bzw. die Ressourcen-Auslastung in iTaskX):
 * Zeilen = Personen, Spalten = Wochen, Zelle im Ton. Gewähltes Team mit Mitgliedern → Mitglieder + Team als
 * Summenzeile; sonst alle Personen und Rollen mit Kapazität oder Last (P2) + „Summe“ (ab zwei Zeilen).
 */
export function gridOf(ws: Workspace, selId: string, o: LoadOpts): GridRow[] {
  const sel = personById(ws, selId);
  if (sel?.kind === 'team' && sel.members?.length) {
    const rows = sel.members.filter((m) => personById(ws, m)).map((m) => ({ id: m, sum: false, cells: loadOf(ws, m, o).weeks.map(cellOf) }));
    return [...rows, { id: sel.id, sum: true, cells: loadOf(ws, sel.id, o).weeks.map(cellOf) }];
  }
  const rows: GridRow[] = personList(ws)
    .filter((p) => p.kind !== 'team')
    .map((p) => ({ id: p.id, sum: false, cells: loadOf(ws, p.id, o).weeks.map(cellOf) }))
    .filter((r) => r.cells.some((c) => c.capacity > 0 || c.hours > 0 || c.count > 0));
  if (rows.length < 2) return rows;
  const cells = rows[0].cells.map((_, i) => {
    const w = { hours: 0, urgent: 0, capacity: 0, draft: 0, noEffort: 0, count: 0 };
    for (const r of rows) {
      const c = r.cells[i];
      w.hours = round(w.hours + c.hours);
      w.capacity = round(w.capacity + c.capacity);
      w.draft = round(w.draft + c.draft);
      w.noEffort += c.noEffort;
      w.count += c.count;
    }
    return { ...w, tone: toneOf(w), pct: percentOf(w) };
  });
  return [...rows, { id: null, sum: true, cells: cells.map(({ urgent: _u, ...c }) => c) }]; // eslint-disable-line @typescript-eslint/no-unused-vars
}
