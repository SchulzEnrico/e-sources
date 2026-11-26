/**
 * F-226 Stufe 2 (V113): Rechnungen für die GPM-Formulare – Fortschrittsgrad je Arbeitspaket nach der gewählten
 * Fortschrittsmessmethode (GPM: 0/100, 50/50, 20/80, aufwandsproportional, Meilensteine, Schätzung), Stand des
 * Projekts für den Statusbericht (Termin, Kosten, Leistung; Plan und Ist), Kosten- und Aufwandsganglinie je Monat
 * mit Summenlinie (ICB4 4.5.7) und die Lage der Stakeholder in den Portfolios (ICB4 4.5.12).
 * Reine Funktionen; Tests in gpm.test.ts („Stufe 2“).
 */
import type { Note, Project, ProgressMethod, Stakeholder, StatusReport, Workspace } from './types';
import { ganttOf, type Gantt } from './gantt';
import { planCost, planHours, useTotals } from './gpm';
import { notesOf } from './notes';
import { projectById } from './projects';
import { addDays, isWorkday, workdaysBetween } from './schedule';

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const round = (v: number, d = 0) => Math.round(v * 10 ** d) / 10 ** d;

/** Notizen eines Projekts, die Vorgänge sind (keine Register-Einträge, keine Sammelvorgänge im Gantt). */
const leafTasks = (ws: Workspace, pid: string, g: Gantt): Note[] => {
  const byId = new Map(notesOf(ws).map((n) => [n.id, n]));
  return g.rows.filter((r) => r.node.kind === 'task' && !r.node.summary && r.node.owner === pid).map((r) => byId.get(r.id)).filter((n): n is Note => !!n);
};

/** Ist-Aufwand eines Vorgangs (h) – von Hand. */
const actHours = (n: Note): number | undefined => n.effort?.actual;
const actCost = (n: Note): number | undefined => n.cost?.actual;

// ---------------------------------------------------------------- Fortschrittsgrad (L12)

export const PROGRESS_DEFAULT: ProgressMethod = 'effort';
/** Fertigstellungsgrad eines Arbeitspakets in % nach seiner Methode; erledigt = 100. */
export function progressOf(ws: Workspace, n: Note): number {
  if (n.state === 'done' || n.state === 'archived') return 100;
  const m = n.wp?.method ?? PROGRESS_DEFAULT;
  const started = n.state === 'doing' || n.state === 'review' || (actHours(n) ?? 0) > 0;
  switch (m) {
    case 'zero':
      return 0;
    case 'half':
      return started ? 50 : 0;
    case 'twenty':
      return started ? 20 : 0;
    case 'steps': {
      // Teilschritte: Abnahmekriterien bzw. Unter-Vorgänge
      const checks = n.accept ?? [];
      if (checks.length) return round((checks.filter((c) => c.ok).length / checks.length) * 100);
      const kids = notesOf(ws).filter((x) => x.parent === n.id && x.state !== 'archived');
      return kids.length ? round((kids.filter((x) => x.state === 'done').length / kids.length) * 100) : started ? 50 : 0;
    }
    case 'estimate':
      return n.wp?.progress ?? 0;
    case 'effort':
    default: {
      if (isNum(n.wp?.progress)) return n.wp!.progress;
      const plan = planHours(ws, n);
      const act = actHours(n);
      return plan && plan > 0 && isNum(act) ? Math.min(99, round((act / plan) * 100)) : started ? 10 : 0;
    }
  }
}

// ---------------------------------------------------------------- Stand für den Statusbericht (L12)

export interface ProjectStatus {
  /** Plan und Ist über alle Arbeitspakete */
  planHours: number;
  actHours: number;
  planCost: number;
  actCost: number;
  /** Fortschrittsgrad in %: Leistung (gewichtet mit dem Plan-Aufwand), Termin (Zeit verstrichen), Kosten (Ist/Plan) */
  progWork: number;
  progTime?: number;
  progCost?: number;
  /** Fertigstellungswert in € (Earned Value, ICB4 4.5.7) */
  earned: number;
  /** Arbeitspakete: offen, laufend, erledigt */
  open: number;
  doing: number;
  done: number;
  /** Rest-Aufwand in h */
  restHours: number;
}

/** Stand des Projekts zum Stichtag `day` (JJJJ-MM-TT). */
export function projectStatus(ws: Workspace, pid: string, day: string, g: Gantt = ganttOf(ws, pid, day)): ProjectStatus {
  const p = projectById(ws, pid);
  const tasks = leafTasks(ws, pid, g).filter((n) => !n.milestone);
  let ph = 0;
  let ah = 0;
  let pc = 0;
  let ac = 0;
  let weighted = 0;
  let weight = 0;
  let earned = 0;
  let open = 0;
  let doing = 0;
  let done = 0;
  let rest = 0;
  for (const n of tasks) {
    const h = planHours(ws, n) ?? 0;
    const c = planCost(ws, n) ?? 0;
    const prog = progressOf(ws, n);
    ph += h;
    pc += c;
    ah += actHours(n) ?? 0;
    ac += actCost(n) ?? 0;
    const w = h > 0 ? h : 1;
    weighted += w * prog;
    weight += w;
    earned += (c * prog) / 100;
    rest += Math.max(0, h - (h * prog) / 100);
    if (n.state === 'done') done++;
    else if (prog > 0 || n.state === 'doing' || n.state === 'review') doing++;
    else open++;
  }
  const start = p?.start ?? g.start;
  const end = p?.end ?? g.end;
  let progTime: number | undefined;
  if (start && end && end > start) {
    const all = workdays(start, end);
    const gone = day < start ? 0 : workdays(start, day < end ? day : end);
    progTime = all ? round((gone / all) * 100) : undefined;
  }
  return {
    planHours: round(ph, 2),
    actHours: round(ah, 2),
    planCost: round(pc, 2),
    actCost: round(ac, 2),
    progWork: weight ? round(weighted / weight) : 0,
    ...(progTime !== undefined ? { progTime } : {}),
    ...(pc > 0 ? { progCost: round((ac / pc) * 100) } : {}),
    earned: round(earned, 2),
    open,
    doing,
    done,
    restHours: round(rest, 2),
  };
}
// ---------------------------------------------------------------- Earned Value (ICB4 4.5.7)

export interface EvRow {
  id: string;
  /** Plan-Kosten gesamt (BAC), Planwert (PV), Fertigstellungswert (EV), Ist-Kosten (AC) in € */
  bac: number;
  pv: number;
  ev: number;
  ac: number;
  /** Abweichungen in € (SV = EV − PV, CV = EV − AC) und Kennzahlen (SPI = EV ÷ PV, CPI = EV ÷ AC) */
  sv: number;
  cv: number;
  spi?: number;
  cpi?: number;
  /** Prognose Kosten bei Abschluss (EAC = BAC ÷ CPI), sonst BAC */
  eac: number;
}
export interface EarnedValue {
  day: string;
  rows: EvRow[];
  total: EvRow;
}
const evRow = (id: string, bac: number, pv: number, ev: number, ac: number): EvRow => {
  const spi = pv > 0 ? round(ev / pv, 2) : undefined;
  const cpi = ac > 0 ? round(ev / ac, 2) : undefined;
  return { id, bac: round(bac, 2), pv: round(pv, 2), ev: round(ev, 2), ac: round(ac, 2), sv: round(ev - pv, 2), cv: round(ev - ac, 2), ...(spi !== undefined ? { spi } : {}), ...(cpi !== undefined ? { cpi } : {}), eac: round(cpi ? bac / cpi : bac, 2) };
};
/** Earned Value je Arbeitspaket zum Stichtag `day`: PV = Plan-Kosten × verstrichener Anteil der Arbeitstage im Gantt, EV = Plan-Kosten × Fertigstellungsgrad. */
export function earnedValue(ws: Workspace, pid: string, day: string, g: Gantt = ganttOf(ws, pid, day)): EarnedValue {
  const rows: EvRow[] = [];
  let tb = 0, tp = 0, te = 0, ta = 0;
  for (const n of leafTasks(ws, pid, g).filter((x) => !x.milestone)) {
    const bac = planCost(ws, n) ?? 0;
    const r = g.byId.get(n.id);
    let share = 0;
    if (r?.planned && r.start && r.end) {
      if (day >= r.end) share = 1;
      else if (day >= r.start) {
        const all = workdays(r.start, r.end);
        share = all ? workdays(r.start, day) / all : 0;
      }
    }
    const pv = bac * share;
    const ev = (bac * progressOf(ws, n)) / 100;
    const ac = actCost(n) ?? 0;
    tb += bac; tp += pv; te += ev; ta += ac;
    rows.push(evRow(n.id, bac, pv, ev, ac));
  }
  return { day, rows, total: evRow('', tb, tp, te, ta) };
}

function workdays(a: string, b: string): number {
  let n = 0;
  for (let d = a; d <= b && n < 5000; d = addDays(d, 1)) if (isWorkday(d)) n++;
  return n;
}

/** Neuer Statusbericht mit eingefrorenem Stand; Zeitraum = seit dem letzten Bericht (sonst Projektstart). */
export function newReport(ws: Workspace, pid: string, id: string, day: string): StatusReport {
  const p = projectById(ws, pid);
  const s = projectStatus(ws, pid, day);
  const last = [...(p?.reports ?? [])].filter((r) => r.date < day).sort((a, b) => (a.date < b.date ? -1 : 1)).at(-1);
  const from = last ? addDays(last.date, 1) : p?.start;
  const behind = s.progTime !== undefined && s.progWork + 10 < s.progTime;
  const over = s.progCost !== undefined && s.progCost > s.progWork + 10;
  return {
    id,
    date: day,
    ...(from && from <= day ? { from } : {}),
    to: day,
    light: behind && over ? 'red' : behind || over ? 'yellow' : 'green',
    ...(s.progTime !== undefined ? { progTime: s.progTime } : {}),
    ...(s.progCost !== undefined ? { progCost: s.progCost } : {}),
    progWork: s.progWork,
    planHours: s.planHours,
    actHours: s.actHours,
    planCost: s.planCost,
    actCost: s.actCost,
    ...(() => {
      const ms = milestoneEnds(ws, pid, day);
      return Object.keys(ms).length ? { ms } : {};
    })(),
  };
}

// ---------------------------------------------------------------- Meilenstein-Trendanalyse (V115, ICB4 4.5.4)

/** Ende aller Meilensteine des Projekts laut Gantt (Notiz-Id → Tag). */
export function milestoneEnds(ws: Workspace, pid: string, day?: string, g: Gantt = ganttOf(ws, pid, day)): Record<string, string> {
  const out: Record<string, string> = {};
  for (const n of leafTasks(ws, pid, g)) {
    const r = g.byId.get(n.id);
    if (n.milestone && r?.planned) out[n.id] = r.end;
  }
  return out;
}
export interface MtaRow {
  id: string;
  /** Soll aus dem Basisplan */
  base?: string;
  /** Prognose je Berichtszeitpunkt (gleiche Reihenfolge wie `points`), zuletzt heute */
  series: (string | undefined)[];
  /** heute laut Gantt */
  now?: string;
  /** Abweichung heute gegen Basisplan bzw. erste Prognose in Arbeitstagen (+ = später) */
  delta?: number;
  /** Richtung seit dem letzten Bericht */
  trend?: 'earlier' | 'same' | 'later';
  /** schon erreicht (erledigt) */
  done: boolean;
}
export interface Mta {
  /** Berichtszeitpunkte (Stichtage, aufsteigend; der Basisplan zählt als erster, heute als letzter) */
  points: { day: string; label: string }[];
  rows: MtaRow[];
}
const signedDays = (a: string, b: string) => (a === b ? 0 : a < b ? workdaysBetween(addDays(a, 1), b) : -workdaysBetween(addDays(b, 1), a));
/** MTA: je Meilenstein die Prognose aus Basisplan, jedem Statusbericht und heute. */
export function mtaOf(ws: Workspace, pid: string, day: string): Mta {
  const p = projectById(ws, pid);
  const g = ganttOf(ws, pid, day);
  const now = milestoneEnds(ws, pid, day, g);
  const reps = [...(p?.reports ?? [])].filter((r) => r.date <= day).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const dmy = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.`;
  const points: Mta['points'] = [];
  const cols: (Record<string, string> | undefined)[] = [];
  const bl = p?.baseline;
  if (bl) {
    points.push({ day: bl.at.slice(0, 10) || (p?.start ?? day), label: 'Basisplan' });
    cols.push(Object.fromEntries(Object.entries(bl.tasks ?? {}).filter(([, t]) => t.end).map(([k, t]) => [k, t.end as string])));
  }
  for (const r of reps) {
    points.push({ day: r.date, label: dmy(r.date) });
    cols.push(r.ms);
  }
  // Spalten bis hier sind Soll bzw. festgehaltene Prognosen; „heute“ zählt nicht als erste Prognose
  const fixed = cols.length;
  if (!reps.some((r) => r.date === day)) {
    points.push({ day, label: 'heute' });
    cols.push(now);
  }
  const notes = new Map(notesOf(ws).map((n) => [n.id, n]));
  const rows: MtaRow[] = [];
  for (const r of g.rows) {
    const n = notes.get(r.id);
    if (!n?.milestone || (n.project !== pid && r.node.owner !== pid)) continue;
    const series = cols.map((c) => c?.[r.id]);
    const base = bl?.tasks?.[r.id]?.end;
    const first = base ?? series.slice(0, fixed).find((x) => x);
    const cur = now[r.id];
    const known = series.filter((x): x is string => !!x);
    const prev = known.length >= 2 ? known[known.length - 2] : undefined;
    rows.push({
      id: r.id,
      ...(base ? { base } : {}),
      series,
      ...(cur ? { now: cur } : {}),
      ...(first && cur ? { delta: signedDays(first, cur) } : {}),
      ...(prev && cur ? { trend: cur < prev ? 'earlier' : cur > prev ? 'later' : 'same' } : {}),
      done: n.state === 'done',
    });
  }
  return { points, rows };
}

// ---------------------------------------------------------------- Kosten- und Aufwandsganglinie (ICB4 4.5.7)

export interface CurveMonth {
  /** JJJJ-MM */
  month: string;
  cost: number;
  hours: number;
  /** Summenlinie */
  costSum: number;
  hoursSum: number;
}
export interface CostCurve {
  months: CurveMonth[];
  total: number;
  hours: number;
  /** Vorgänge mit Kosten, aber ohne Termin (zählen nicht in der Linie) */
  unplanned: number;
  /** Ist-Kosten bisher (Summe) */
  actual: number;
  budget?: number;
}
/** Plan-Kosten und -Aufwand je Monat: jedes Arbeitspaket gleichmäßig über seine Arbeitstage verteilt. */
export function costCurve(ws: Workspace, pid: string, g: Gantt = ganttOf(ws, pid)): CostCurve {
  const p = projectById(ws, pid);
  const cost = new Map<string, number>();
  const hours = new Map<string, number>();
  let total = 0;
  let totalH = 0;
  let unplanned = 0;
  let actual = 0;
  for (const n of leafTasks(ws, pid, g)) {
    const c = planCost(ws, n) ?? 0;
    const h = planHours(ws, n) ?? 0;
    actual += actCost(n) ?? 0;
    if (!c && !h) continue;
    const row = g.byId.get(n.id);
    if (!row?.planned || !row.start) {
      unplanned++;
      continue;
    }
    const days: string[] = [];
    for (let d = row.start; d <= row.end && days.length < 5000; d = addDays(d, 1)) if (isWorkday(d)) days.push(d);
    if (!days.length) days.push(row.start);
    for (const d of days) {
      const m = d.slice(0, 7);
      cost.set(m, (cost.get(m) ?? 0) + c / days.length);
      hours.set(m, (hours.get(m) ?? 0) + h / days.length);
    }
    total += c;
    totalH += h;
  }
  const keys = [...new Set([...cost.keys(), ...hours.keys()])].sort();
  const months: CurveMonth[] = [];
  if (keys.length) {
    // lückenlos vom ersten bis zum letzten Monat
    let [y, mo] = keys[0].split('-').map(Number);
    const last = keys[keys.length - 1];
    let cs = 0;
    let hs = 0;
    for (let i = 0; i < 240; i++) {
      const k = `${y}-${String(mo).padStart(2, '0')}`;
      const c = cost.get(k) ?? 0;
      const h = hours.get(k) ?? 0;
      cs += c;
      hs += h;
      months.push({ month: k, cost: round(c, 2), hours: round(h, 1), costSum: round(cs, 2), hoursSum: round(hs, 1) });
      if (k === last) break;
      mo++;
      if (mo > 12) (mo = 1), y++;
    }
  }
  return { months, total: round(total, 2), hours: round(totalH, 1), unplanned, actual: round(actual, 2), ...(isNum(p?.budget) ? { budget: p!.budget } : {}) };
}

// ---------------------------------------------------------------- Portfolios (ICB4 4.5.12)

export interface PortfolioDot {
  id: string;
  code: string;
  name: string;
  /** Umfeld-Portfolio: Quadrant */
  side?: 'in' | 'ex';
  area?: 'fact' | 'social';
  /** Stakeholder-Portfolio: Einstellung −2…+2 (x), Macht 1–3 (y), Konfliktpotenzial 1–3 (Größe) */
  attitude?: number;
  power?: number;
  conflict?: number;
}
export const portfolioOf = (p: Project | undefined): PortfolioDot[] =>
  (p?.stakeholders ?? []).map((s: Stakeholder) => ({
    id: s.id,
    code: s.code ?? '',
    name: s.name,
    ...(s.side ? { side: s.side } : {}),
    ...(s.area ? { area: s.area } : {}),
    ...(isNum(s.attitude) ? { attitude: s.attitude } : {}),
    ...(isNum(s.power) ? { power: s.power } : {}),
    ...(isNum(s.conflict) ? { conflict: s.conflict } : {}),
  }));

/** Kosten aus Einsätzen ohne Stundensatz (Hinweis in der Ganglinie). */
export function missingRates(ws: Workspace, pid: string): number {
  return notesOf(ws).filter((n) => n.project === pid && n.state !== 'archived' && (useTotals(ws, n)?.missingRate.length ?? 0) > 0).length;
}
