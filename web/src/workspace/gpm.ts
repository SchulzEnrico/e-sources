/**
 * F-226 (V109, Stufe 1): Projektdaten nach GPM-Leitfaden Z01D Rev. 09 / IPMA ICB4 – Steckbrief-Felder,
 * Ziele und Zielkonflikte, Stakeholder, Phasen, Risiken und Chancen quantitativ, Ressourcen je Vorgang
 * mit Stundensatz, Beschaffung. Reine Funktionen; die Formulare (formKit.ts) lesen und schreiben nur hier.
 * Alle Felder sind optional, Dateiformat 11 bleibt. Tests in workspace.test.ts („F-226“).
 */
import type {
  ChangeItem,
  CommItem,
  DocItem,
  Lesson,
  ProjectClose,
  QualityCheck,
  RuleItem,
  GoalConflict,
  GoalKind,
  GoalLevel,
  Note,
  NoteProcure,
  NoteRisk,
  NoteUse,
  NoteWp,
  Person,
  ProgressMethod,
  ProcureState,
  Project,
  ProjectCharter,
  ProjectGoal,
  ProjectPhase,
  RiskLevel,
  RiskMeasure,
  StakeStrategy,
  Stakeholder,
  StatusReport,
  Workspace,
} from './types';

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
export const GPM_TEXT_MAX = 2000;
const txt = (v: unknown, max = GPM_TEXT_MAX): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const s = v.replace(/\r\n?/g, '\n').trim().slice(0, max);
  return s || undefined;
};
const id = (v: unknown): string | undefined => (typeof v === 'string' && v ? v.slice(0, 120) : undefined);
const pick = <T extends string>(v: unknown, list: readonly T[]): T | undefined => (list.includes(v as T) ? (v as T) : undefined);
const int = (v: unknown, lo: number, hi: number): number | undefined => (isNum(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : undefined);
const money = (v: unknown): number | undefined => (isNum(v) && v >= 0 ? Math.round(v * 100) / 100 : undefined);
const pct = (v: unknown): number | undefined => (isNum(v) && v >= 0 && v <= 100 ? Math.round(v * 10) / 10 : undefined);
/** Objekt ohne `undefined`-Felder. */
function tidy<T extends object>(o: T): T {
  for (const k of Object.keys(o) as (keyof T)[]) if (o[k] === undefined) delete o[k];
  return o;
}

export const GOAL_KINDS: readonly GoalKind[] = ['perf', 'social', 'non'];
export const GOAL_LEVELS: readonly GoalLevel[] = ['must', 'should', 'can'];
export const STAKE_STRATEGIES: readonly StakeStrategy[] = ['participative', 'informative', 'discursive', 'repressive'];
export const PROCURE_STATES: readonly ProcureState[] = ['open', 'asked', 'offered', 'ordered', 'delivered'];
export const MODELS: readonly NonNullable<ProjectCharter['model']>[] = ['classic', 'agile', 'hybrid'];
/** Höchstzahl je Liste am Projekt. */
export const GPM_LIST_MAX = 200;
export const USE_MAX = 20;

// ---------------------------------------------------------------- Lesen (Speicher)

const CHARTER_TEXT = ['no', 'kind', 'client', 'clientAddress', 'benefit', 'benefitMeasure', 'businessCase', 'reporting', 'special', 'success', 'tailoring'] as const;
const CHARTER_MONEY = ['ownEffort', 'extEffort', 'costPm', 'costStaff', 'costMaterial', 'reserve'] as const;

export function sanitizeCharter(v: unknown): ProjectCharter | undefined {
  if (!isObj(v)) return undefined;
  const out: ProjectCharter = {};
  for (const k of CHARTER_TEXT) out[k] = txt(v[k], k === 'no' || k === 'kind' ? 60 : GPM_TEXT_MAX);
  for (const k of CHARTER_MONEY) out[k] = money(v[k]);
  out.clientKind = pick(v.clientKind, ['in', 'ex'] as const);
  out.model = pick(v.model, MODELS);
  out.complexity = int(v.complexity, 1, 5);
  if (isDay(v.releasePl)) out.releasePl = v.releasePl;
  if (isDay(v.releaseAg)) out.releaseAg = v.releaseAg;
  tidy(out);
  return Object.keys(out).length ? out : undefined;
}

function list<T extends { id: string }>(v: unknown, one: (o: Record<string, unknown>) => T | undefined): T[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: T[] = [];
  for (const r of v) {
    if (!isObj(r) || !id(r.id) || out.some((x) => x.id === r.id)) continue;
    const x = one(r);
    if (x) out.push(x);
    if (out.length >= GPM_LIST_MAX) break;
  }
  return out.length ? out : undefined;
}

export const parseGoal = (r: Record<string, unknown>): ProjectGoal | undefined => {
  const text = txt(r.text);
  if (!text || !id(r.id)) return undefined;
  return tidy({ id: id(r.id)!, code: txt(r.code, 20), text, measure: txt(r.measure), level: pick(r.level, GOAL_LEVELS), owner: txt(r.owner, 120), consequence: txt(r.consequence), kind: pick(r.kind, GOAL_KINDS), parent: id(r.parent) });
};
export const parseConflict = (r: Record<string, unknown>): GoalConflict | undefined => {
  const a = id(r.a);
  const b = id(r.b);
  if (!id(r.id) || !a || !b || a === b) return undefined;
  return tidy({ id: id(r.id)!, a, b, text: txt(r.text), measure: txt(r.measure), first: pick(r.first, ['a', 'b'] as const) });
};
export const parseStakeholder = (r: Record<string, unknown>): Stakeholder | undefined => {
  const name = txt(r.name, 120);
  if (!name || !id(r.id)) return undefined;
  return tidy({
    id: id(r.id)!,
    code: txt(r.code, 20),
    name,
    person: id(r.person),
    side: pick(r.side, ['in', 'ex'] as const),
    area: pick(r.area, ['fact', 'social'] as const),
    interests: txt(r.interests),
    fears: txt(r.fears),
    strategy: pick(r.strategy, STAKE_STRATEGIES),
    measures: txt(r.measures),
    attitude: int(r.attitude, -2, 2),
    conflict: int(r.conflict, 1, 3),
    power: int(r.power, 1, 3),
  });
};
export const parsePhase = (r: Record<string, unknown>): ProjectPhase | undefined => {
  const name = txt(r.name, 120);
  if (!name || !id(r.id)) return undefined;
  return tidy({ id: id(r.id)!, name, focus: txt(r.focus), goal: txt(r.goal), start: isDay(r.start) ? r.start : undefined, end: isDay(r.end) ? r.end : undefined, share: pct(r.share), release: isDay(r.release) ? r.release : undefined });
};

// ---------------------------------------------------------------- Stufe 2 (V113): DKI-Matrix, Statusbericht, Arbeitspaket, AKV

export const COMM_STRATEGIES = ['push', 'pull'] as const;
export const REPORT_LIGHTS = ['green', 'yellow', 'red'] as const;
export const PROGRESS_METHODS: readonly ProgressMethod[] = ['zero', 'half', 'twenty', 'effort', 'steps', 'estimate'];
export const parseComm = (r: Record<string, unknown>): CommItem | undefined => {
  const content = txt(r.content, 300);
  if (!content || !id(r.id)) return undefined;
  return tidy({ id: id(r.id)!, content, sender: txt(r.sender, 200), receiver: txt(r.receiver, 300), strategy: pick(r.strategy, COMM_STRATEGIES), doc: txt(r.doc, 300), info: txt(r.info, 300), freq: txt(r.freq, 120) });
};
export const parseReport = (r: Record<string, unknown>): StatusReport | undefined => {
  if (!id(r.id) || !isDay(r.date)) return undefined;
  return tidy({
    id: id(r.id)!,
    date: r.date,
    from: isDay(r.from) ? r.from : undefined,
    to: isDay(r.to) ? r.to : undefined,
    light: pick(r.light, REPORT_LIGHTS),
    progTime: pct(r.progTime),
    progCost: pct(r.progCost),
    progWork: pct(r.progWork),
    planHours: money(r.planHours),
    actHours: money(r.actHours),
    planCost: money(r.planCost),
    actCost: money(r.actCost),
    done: txt(r.done),
    next: txt(r.next),
    measures: txt(r.measures),
    note: txt(r.note),
    ms: parseDayMap(r.ms),
  });
};
/** V115 (MTA): Notiz-Id → Tag; höchstens 200 Einträge. */
function parseDayMap(v: unknown): Record<string, string> | undefined {
  if (!isObj(v)) return undefined;
  const out: Record<string, string> = {};
  for (const [k, d] of Object.entries(v).slice(0, 200)) if (id(k) && isDay(d)) out[k] = d;
  return Object.keys(out).length ? out : undefined;
}

// ---------------------------------------------------------------- V115: Listen der Stufe 2 (Rest)

/** Feldart für einfache Listen: Text kurz/lang, Tag, Ja/Nein, Id, Auswahl. */
type SimpleKind = 'short' | 'long' | 'day' | 'bool' | 'ref' | readonly string[];
function parseSimple<T>(r: Record<string, unknown>, need: string, spec: Record<string, SimpleKind>): T | undefined {
  const first = txt(r[need], 300);
  if (!first || !id(r.id)) return undefined;
  const out: Record<string, unknown> = { id: id(r.id) };
  for (const [k, kind] of Object.entries(spec)) {
    const v = r[k];
    out[k] =
      k === need ? first
      : kind === 'short' ? txt(v, 300)
      : kind === 'long' ? txt(v)
      : kind === 'day' ? (isDay(v) ? v : undefined)
      : kind === 'bool' ? (v === true ? true : undefined)
      : kind === 'ref' ? id(v)
      : pick(v, kind);
  }
  return tidy(out) as T;
}
export const DOC_STATES = ['draft', 'review', 'released', 'archived'] as const;
export const CHECK_METHODS = ['visual', 'measure', 'test', 'review', 'accept'] as const;
export const CHECK_RESULTS = ['open', 'passed', 'defects', 'failed'] as const;
export const LESSON_KINDS = ['good', 'bad', 'improve'] as const;
export const CHANGE_RESIST = ['low', 'mid', 'high'] as const;
export const CHANGE_STATES = ['planned', 'running', 'done'] as const;
export const RULE_SOURCES = ['law', 'norm', 'contract', 'internal', 'authority'] as const;
export const RULE_STATES = ['open', 'met', 'na'] as const;
export const parseDoc = (r: Record<string, unknown>) => parseSimple<DocItem>(r, 'title', { code: 'short', title: 'short', kind: 'short', owner: 'ref', version: 'short', date: 'day', state: DOC_STATES, place: 'short', dist: 'short' });
export const parseQCheck = (r: Record<string, unknown>) => parseSimple<QualityCheck>(r, 'object', { object: 'short', task: 'short', criterion: 'long', method: CHECK_METHODS, date: 'day', by: 'ref', result: CHECK_RESULTS, defects: 'long', action: 'long', due: 'day' });
export const parseLesson = (r: Record<string, unknown>) => parseSimple<Lesson>(r, 'topic', { topic: 'short', kind: LESSON_KINDS, phase: 'ref', what: 'long', cause: 'long', advice: 'long', owner: 'ref', shared: 'bool' });
export const parseChange = (r: Record<string, unknown>) => parseSimple<ChangeItem>(r, 'area', { area: 'short', today: 'long', target: 'long', affected: 'short', resistance: CHANGE_RESIST, measure: 'long', owner: 'ref', due: 'day', state: CHANGE_STATES });
export const parseRule = (r: Record<string, unknown>) => parseSimple<RuleItem>(r, 'title', { code: 'short', title: 'short', source: RULE_SOURCES, authority: 'short', duty: 'long', proof: 'short', due: 'day', owner: 'ref', state: RULE_STATES });
/** Abschluss: alles optional; leer = undefined. */
export function sanitizeClose(v: unknown): ProjectClose | undefined {
  if (!isObj(v)) return undefined;
  const c: ProjectClose = tidy({
    date: isDay(v.date) ? v.date : undefined,
    result: txt(v.result),
    goals: txt(v.goals),
    acceptedBy: txt(v.acceptedBy, 300),
    acceptedOn: isDay(v.acceptedOn) ? v.acceptedOn : undefined,
    handover: txt(v.handover),
    open: txt(v.open),
    team: txt(v.team),
    archived: v.archived === true ? true : undefined,
    thanks: txt(v.thanks),
  });
  return Object.keys(c).length ? c : undefined;
}
export function parseWp(v: unknown): NoteWp | undefined {
  if (!isObj(v)) return undefined;
  const out = tidy<NoteWp>({
    goal: txt(v.goal),
    activities: txt(v.activities),
    inputs: txt(v.inputs),
    risks: txt(v.risks),
    method: pick(v.method, PROGRESS_METHODS),
    progress: pct(v.progress),
    releasePl: isDay(v.releasePl) ? v.releasePl : undefined,
    releaseOwner: isDay(v.releaseOwner) ? v.releaseOwner : undefined,
  });
  return Object.keys(out).length ? out : undefined;
}
/** AKV an einer Instanz (L10). */
export function parseRoleAkv(r: Record<string, unknown>): { tasks?: string; powers?: string; duty?: string } {
  return tidy({ tasks: txt(r.tasks), powers: txt(r.powers), duty: txt(r.duty) });
}
/** Abnahmekriterium mit Angaben (L11). */
export function parseCheckGpm(c: Record<string, unknown>): { due?: string; by?: string; acceptor?: string; doc?: string } {
  return tidy({ due: isDay(c.due) ? c.due : undefined, by: txt(c.by, 200), acceptor: txt(c.acceptor, 200), doc: txt(c.doc, 300) });
}

/** Liest die GPM-Teile eines Projekts; Bezüge (Oberziel, Konfliktziele, Personen) werden bereinigt. */
type GpmPart = 'charter' | 'goals' | 'conflicts' | 'stakeholders' | 'phases' | 'comms' | 'reports' | 'docs' | 'checks' | 'lessons' | 'changes' | 'rules' | 'close';
export function parseProjectGpm(r: Record<string, unknown>): Pick<Project, GpmPart> {
  const out: Pick<Project, GpmPart> = {};
  const charter = sanitizeCharter(r.charter);
  if (charter) out.charter = charter;
  const goals = list(r.goals, parseGoal);
  if (goals) {
    const ids = new Set(goals.map((g) => g.id));
    for (const g of goals) if (g.parent && (g.parent === g.id || !ids.has(g.parent))) delete g.parent;
    breakGoalLoops(goals);
    out.goals = goals;
    const conflicts = list(r.conflicts, parseConflict)?.filter((c) => ids.has(c.a) && ids.has(c.b));
    if (conflicts?.length) out.conflicts = conflicts;
  }
  const sh = list(r.stakeholders, parseStakeholder);
  if (sh) out.stakeholders = sh;
  const ph = list(r.phases, parsePhase);
  if (ph) out.phases = ph;
  const comms = list(r.comms, parseComm);
  if (comms) out.comms = comms;
  const reports = list(r.reports, parseReport);
  if (reports) out.reports = reports;
  const docs = list(r.docs, parseDoc);
  if (docs) out.docs = docs;
  const checks = list(r.checks, parseQCheck);
  if (checks) out.checks = checks;
  const lessons = list(r.lessons, parseLesson);
  if (lessons) out.lessons = lessons;
  const changes = list(r.changes, parseChange);
  if (changes) out.changes = changes;
  const rules = list(r.rules, parseRule);
  if (rules) out.rules = rules;
  const close = sanitizeClose(r.close);
  if (close) out.close = close;
  return out;
}

function breakGoalLoops(goals: ProjectGoal[]): void {
  const by = new Map(goals.map((g) => [g.id, g]));
  for (const g of goals) {
    const seen = new Set([g.id]);
    let cur = g;
    while (cur.parent) {
      if (seen.has(cur.parent)) {
        delete cur.parent;
        break;
      }
      seen.add(cur.parent);
      cur = by.get(cur.parent)!;
    }
  }
}

export function parseUses(v: unknown): NoteUse[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: NoteUse[] = [];
  for (const u of v) {
    if (!isObj(u) || !id(u.person) || out.some((x) => x.person === u.person)) continue;
    out.push(tidy({ person: id(u.person)!, hours: money(u.hours), cost: money(u.cost) }));
    if (out.length >= USE_MAX) break;
  }
  return out.length ? out : undefined;
}
export function parseResults(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v.map((x) => txt(x, 300)).filter((x): x is string => !!x).slice(0, 50);
  return out.length ? out : undefined;
}
export function parseProcure(v: unknown): NoteProcure | undefined {
  if (!isObj(v)) return undefined;
  const out = tidy<NoteProcure>({ make: pick(v.make, ['make', 'buy'] as const), supplier: txt(v.supplier, 200), offer: money(v.offer), contract: txt(v.contract, 300), state: pick(v.state, PROCURE_STATES) });
  return Object.keys(out).length ? out : undefined;
}
export function parseMeasures(v: unknown): RiskMeasure[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: RiskMeasure[] = [];
  for (const m of v) {
    if (!isObj(m) || !id(m.id) || out.some((x) => x.id === m.id)) continue;
    const kind = pick(m.kind, ['prev', 'corr'] as const);
    const text = txt(m.text);
    if (!kind || !text) continue;
    out.push(tidy({ id: id(m.id)!, kind, text, cost: money(m.cost), decided: m.decided === true ? true : undefined, ewAfter: pct(m.ewAfter), impactAfter: money(m.impactAfter) }));
    if (out.length >= 10) break;
  }
  return out.length ? out : undefined;
}
/** F-226 (G5/G6/L4): neue Felder an `Note.risk`. */
export function parseRiskGpm(o: Record<string, unknown>): Pick<NoteRisk, 'chance' | 'ew' | 'impact' | 'measures'> {
  return tidy({ chance: o.chance === true ? true : undefined, ew: pct(o.ew), impact: money(o.impact), measures: parseMeasures(o.measures) });
}
/** Felder an Personen. */
export function parsePersonGpm(r: Record<string, unknown>): Pick<Person, 'rate' | 'org' | 'qual'> {
  return tidy({ rate: money(r.rate), org: txt(r.org, 200), qual: txt(r.qual, 300) });
}

/** Bezüge der Notiz-Felder prüfen: Phase muss es im Projekt geben, Einsätze nur bekannte Personen. */
export function cleanGpmRefs(n: Note, projects: ReadonlyMap<string, Project>, persons: ReadonlySet<string>): Note {
  let out = n;
  if (n.phase && !(n.project && projects.get(n.project)?.phases?.some((p) => p.id === n.phase))) {
    out = { ...out };
    delete out.phase;
  }
  if (n.use?.some((u) => !persons.has(u.person))) {
    const use = n.use.filter((u) => persons.has(u.person));
    out = { ...out, use };
    if (!use.length) delete out.use;
  }
  return out;
}

// ---------------------------------------------------------------- Risiken und Chancen quantitativ (G5)

/** W 1–5 aus der Eintrittswahrscheinlichkeit: ≤ 10 % → 1, ≤ 30 % → 2, ≤ 50 % → 3, ≤ 70 % → 4, darüber 5. */
export function levelFromEw(ew: number | undefined): RiskLevel | undefined {
  if (!isNum(ew)) return undefined;
  return ew <= 10 ? 1 : ew <= 30 ? 2 : ew <= 50 ? 3 : ew <= 70 ? 4 : 5;
}
/** A 1–5 aus der Tragweite im Verhältnis zum Budget: ≤ 1 % → 1, ≤ 5 % → 2, ≤ 10 % → 3, ≤ 25 % → 4, darüber 5. */
export function levelFromImpact(impact: number | undefined, budget: number | undefined): RiskLevel | undefined {
  if (!isNum(impact) || !isNum(budget) || budget <= 0) return undefined;
  const r = (impact / budget) * 100;
  return r <= 1 ? 1 : r <= 5 ? 2 : r <= 10 ? 3 : r <= 25 ? 4 : 5;
}
/** W/A eines Risikos: aus den Zahlen gerechnet, ohne Zahlen von Hand (G5). */
export function riskLevels(r: NoteRisk | undefined, budget: number | undefined): { p?: RiskLevel; i?: RiskLevel; pAuto: boolean; iAuto: boolean } {
  const p = levelFromEw(r?.ew);
  const i = levelFromImpact(r?.impact, budget);
  return { p: p ?? r?.p, i: i ?? r?.i, pAuto: p !== undefined, iAuto: i !== undefined };
}
/** Risikowert in € = EW × Tragweite (fehlt eine Zahl: undefined). */
export function riskValue(r: Pick<NoteRisk, 'ew' | 'impact'> | undefined): number | undefined {
  return isNum(r?.ew) && isNum(r?.impact) ? Math.round((r.ew / 100) * r.impact * 100) / 100 : undefined;
}
/** Risikowert nach den beschlossenen präventiven Maßnahmen (letzter Wert zählt). */
export function riskValueAfter(r: NoteRisk | undefined): number | undefined {
  if (!r) return undefined;
  const done = (r.measures ?? []).filter((m) => m.kind === 'prev' && m.decided);
  if (!done.length) return riskValue(r);
  const last = done[done.length - 1];
  return riskValue({ ew: last.ewAfter ?? r.ew, impact: last.impactAfter ?? r.impact });
}
/** Summen vor und nach Maßnahmen, Kosten der beschlossenen Maßnahmen – getrennt nach Risiken und Chancen. */
export function riskSums(risks: Note[]): { before: number; after: number; measures: number; chances: number } {
  let before = 0;
  let after = 0;
  let measures = 0;
  let chances = 0;
  for (const n of risks) {
    const r = n.risk;
    if (!r || r.state === 'closed') continue;
    if (r.chance) {
      chances += riskValue(r) ?? 0;
      continue;
    }
    before += riskValue(r) ?? 0;
    after += riskValueAfter(r) ?? 0;
    measures += (r.measures ?? []).filter((m) => m.decided).reduce((s, m) => s + (m.cost ?? 0), 0);
  }
  return { before, after, measures, chances };
}

// ---------------------------------------------------------------- Ressourcen und Kosten (G7)

const personsById = (ws: Workspace) => new Map((ws.persons ?? []).map((p) => [p.id, p]));

/** Kosten eines Einsatzes: Hand-Eingabe geht vor, sonst Stunden × Stundensatz. */
export function useCost(u: NoteUse, rate: number | undefined): number | undefined {
  if (isNum(u.cost)) return u.cost;
  return isNum(u.hours) && isNum(rate) ? Math.round(u.hours * rate * 100) / 100 : undefined;
}
/** Summe der Einsätze eines Vorgangs (Stunden und Kosten); ohne Einsätze undefined. */
export function useTotals(ws: Workspace, n: Pick<Note, 'use'>): { hours: number; cost: number; missingRate: string[] } | undefined {
  if (!n.use?.length) return undefined;
  const by = personsById(ws);
  let hours = 0;
  let cost = 0;
  const missingRate: string[] = [];
  for (const u of n.use) {
    hours += u.hours ?? 0;
    const c = useCost(u, by.get(u.person)?.rate);
    if (c === undefined && isNum(u.hours) && u.hours > 0) missingRate.push(u.person);
    cost += c ?? 0;
  }
  return { hours, cost, missingRate };
}
/** Plan-Aufwand eines Vorgangs: Hand-Eingabe (`effort.plan`) geht vor, sonst Summe der Einsätze. */
export function planHours(ws: Workspace, n: Note): number | undefined {
  return n.effort?.plan ?? useTotals(ws, n)?.hours;
}
/** Plan-Kosten eines Vorgangs: Hand-Eingabe (`cost.plan`) geht vor, sonst Summe der Einsätze. */
export function planCost(ws: Workspace, n: Note): number | undefined {
  return n.cost?.plan ?? useTotals(ws, n)?.cost;
}
/** V110: Wirkt eine der Personen am Vorgang mit? Mit Einsätzen zählen die Einsätze, sonst der Zuständige (bzw. delegiert an). */
export function involves(n: Note, who: ReadonlySet<string>): boolean {
  if (n.use?.length) return n.use.some((u) => who.has(u.person));
  const a = n.assignee ?? n.delegated?.person;
  return !!a && who.has(a);
}
/** V110: Plan-Stunden der Personen `who` am Vorgang – Einsätze; ohne Einsätze der ganze Aufwand des Zuständigen. */
export function hoursFor(n: Note, who: ReadonlySet<string>): number | undefined {
  if (n.use?.length) {
    const own = n.use.filter((u) => who.has(u.person));
    if (!own.length) return undefined;
    const h = own.reduce((s, u) => s + (u.hours ?? 0), 0);
    return h > 0 ? Math.round(h * 100) / 100 : undefined;
  }
  const a = n.assignee ?? n.delegated?.person;
  return a && who.has(a) ? n.effort?.plan : undefined;
}
/** Stunden einer Person an einem Vorgang (Einsatz; ohne Einsätze der Zuständige mit dem ganzen Aufwand). */
export function hoursOf(n: Note, person: string): number {
  if (n.use?.length) return n.use.find((u) => u.person === person)?.hours ?? 0;
  return n.assignee === person ? (n.effort?.plan ?? 0) : 0;
}

// ---------------------------------------------------------------- Bearbeiten

/** Listen am Projekt, die die Formulare bearbeiten. */
export type GpmList = 'goals' | 'conflicts' | 'stakeholders' | 'phases' | 'comms' | 'reports' | 'docs' | 'checks' | 'lessons' | 'changes' | 'rules';
type ItemOf<L extends GpmList> = NonNullable<Project[L]>[number];
const PARSE: { [L in GpmList]: (r: Record<string, unknown>) => ItemOf<L> | undefined } = { goals: parseGoal, conflicts: parseConflict, stakeholders: parseStakeholder, phases: parsePhase, comms: parseComm, reports: parseReport, docs: parseDoc, checks: parseQCheck, lessons: parseLesson, changes: parseChange, rules: parseRule };

function withProject(ws: Workspace, pid: string, fn: (p: Project) => Project | null, now: number): Workspace {
  const list = ws.projects ?? [];
  const i = list.findIndex((p) => p.id === pid);
  if (i < 0) return ws;
  const next = fn(list[i]);
  if (!next || JSON.stringify(next) === JSON.stringify(list[i])) return ws;
  const projects = [...list];
  projects[i] = { ...next, changed: now };
  return { ...ws, projects };
}
function setList<L extends GpmList>(p: Project, l: L, items: ItemOf<L>[]): Project {
  const out = { ...p } as Project;
  if (items.length) (out as unknown as Record<string, unknown>)[l] = items;
  else delete out[l];
  return out;
}

/** Eintrag anlegen (an Stelle `at`, sonst hinten); ungültig oder voll = unverändert. */
export function addItem<L extends GpmList>(ws: Workspace, pid: string, l: L, item: ItemOf<L>, at?: number, now = Date.now()): Workspace {
  const x = PARSE[l](item as unknown as Record<string, unknown>);
  if (!x) return ws;
  return withProject(
    ws,
    pid,
    (p) => {
      const items = [...((p[l] ?? []) as ItemOf<L>[])];
      if (items.length >= GPM_LIST_MAX || items.some((y) => y.id === x.id)) return null;
      if (l === 'conflicts' && !validConflict(p, x as GoalConflict)) return null;
      items.splice(at === undefined ? items.length : Math.max(0, Math.min(items.length, at)), 0, x as ItemOf<L>);
      return setList(p, l, items);
    },
    now,
  );
}
const validConflict = (p: Project, c: GoalConflict) => !!p.goals?.some((g) => g.id === c.a) && !!p.goals?.some((g) => g.id === c.b);

/** Felder ändern; `null` oder '' löscht ein Feld. Pflichtfelder (Text, Name) bleiben, wenn leer gegeben. */
export function editItem<L extends GpmList>(ws: Workspace, pid: string, l: L, itemId: string, patch: Record<string, unknown>, now = Date.now()): Workspace {
  return withProject(
    ws,
    pid,
    (p) => {
      const items = [...((p[l] ?? []) as ItemOf<L>[])];
      const i = items.findIndex((y) => y.id === itemId);
      if (i < 0) return null;
      const merged: Record<string, unknown> = { ...items[i] };
      for (const [k, v] of Object.entries(patch)) {
        if (k === 'id') continue;
        if (v === null || v === '') delete merged[k];
        else if (v !== undefined) merged[k] = v;
      }
      const x = PARSE[l](merged);
      if (!x) return null;
      if (l === 'goals') {
        const g = x as ProjectGoal;
        if (g.parent && (g.parent === g.id || !p.goals?.some((y) => y.id === g.parent) || goalLoops(p.goals ?? [], g.id, g.parent))) delete g.parent;
      }
      if (l === 'conflicts' && !validConflict(p, x as GoalConflict)) return null;
      items[i] = x as ItemOf<L>;
      return setList(p, l, items);
    },
    now,
  );
}
function goalLoops(goals: ProjectGoal[], id: string, parent: string): boolean {
  const by = new Map(goals.map((g) => [g.id, g]));
  let cur: string | undefined = parent;
  const seen = new Set<string>();
  while (cur && !seen.has(cur)) {
    if (cur === id) return true;
    seen.add(cur);
    cur = by.get(cur)?.parent;
  }
  return false;
}

/** Rückgängig für das Löschen eines Eintrags (mit abhängigen Bezügen). */
export interface GpmUndo {
  pid: string;
  list: GpmList;
  item: ItemOf<GpmList>;
  index: number;
  /** mitgelöschte Zielkonflikte (beim Löschen eines Ziels) */
  conflicts?: { item: GoalConflict; index: number }[];
  /** Unterziele, deren Oberziel entfiel */
  children?: string[];
  /** Notizen, deren Phase entfiel */
  notes?: string[];
}

/** Eintrag löschen; ein Ziel nimmt seine Konflikte mit und löst Unterziele, eine Phase löst ihre Vorgänge. */
export function removeItem(ws: Workspace, pid: string, l: GpmList, itemId: string, now = Date.now()): { ws: Workspace; undo: GpmUndo } | null {
  const p = (ws.projects ?? []).find((x) => x.id === pid);
  const items = (p?.[l] ?? []) as ItemOf<GpmList>[];
  const index = items.findIndex((y) => y.id === itemId);
  if (!p || index < 0) return null;
  const undo: GpmUndo = { pid, list: l, item: items[index], index };
  let q = setList(p, l, items.filter((y) => y.id !== itemId) as ItemOf<typeof l>[]);
  if (l === 'goals') {
    const cs = (p.conflicts ?? []).map((item, i) => ({ item, index: i })).filter((c) => c.item.a === itemId || c.item.b === itemId);
    if (cs.length) {
      undo.conflicts = cs;
      q = setList(q, 'conflicts', (p.conflicts ?? []).filter((c) => c.a !== itemId && c.b !== itemId));
    }
    const kids = (q.goals ?? []).filter((g) => g.parent === itemId).map((g) => g.id);
    if (kids.length) {
      undo.children = kids;
      q = setList(q, 'goals', (q.goals ?? []).map((g) => (g.parent === itemId ? tidy({ ...g, parent: undefined }) : g)));
    }
  }
  let notes = ws.notes;
  if (l === 'phases') {
    const hit = (ws.notes ?? []).filter((n) => n.project === pid && n.phase === itemId).map((n) => n.id);
    if (hit.length) {
      undo.notes = hit;
      notes = (ws.notes ?? []).map((n) => (hit.includes(n.id) ? tidy({ ...n, phase: undefined, changed: now }) : n));
    }
  }
  const projects = (ws.projects ?? []).map((x) => (x.id === pid ? { ...q, changed: now } : x));
  return { ws: { ...ws, projects, ...(notes ? { notes } : {}) }, undo };
}
export function undoRemoveItem(ws: Workspace, u: GpmUndo, now = Date.now()): Workspace {
  let out = withProject(
    ws,
    u.pid,
    (p) => {
      const items = [...((p[u.list] ?? []) as ItemOf<GpmList>[])];
      if (items.some((y) => y.id === u.item.id)) return null;
      items.splice(Math.min(u.index, items.length), 0, u.item);
      let q = setList(p, u.list, items as ItemOf<typeof u.list>[]);
      if (u.conflicts) {
        const cs = [...(q.conflicts ?? [])];
        for (const c of u.conflicts) if (!cs.some((y) => y.id === c.item.id)) cs.splice(Math.min(c.index, cs.length), 0, c.item);
        q = setList(q, 'conflicts', cs);
      }
      if (u.children) q = setList(q, 'goals', (q.goals ?? []).map((g) => (u.children!.includes(g.id) && !g.parent ? { ...g, parent: u.item.id } : g)));
      return q;
    },
    now,
  );
  if (u.notes) out = { ...out, notes: (out.notes ?? []).map((n) => (u.notes!.includes(n.id) && n.project === u.pid && !n.phase ? { ...n, phase: u.item.id, changed: now } : n)) };
  return out;
}

/** Eintrag verschieben (Tastatur: Alt+↑/↓). */
export function moveItem(ws: Workspace, pid: string, l: GpmList, itemId: string, to: number, now = Date.now()): Workspace {
  return withProject(
    ws,
    pid,
    (p) => {
      const items = [...((p[l] ?? []) as ItemOf<GpmList>[])];
      const i = items.findIndex((y) => y.id === itemId);
      if (i < 0) return null;
      const [x] = items.splice(i, 1);
      items.splice(Math.max(0, Math.min(items.length, to)), 0, x);
      return setList(p, l, items as ItemOf<typeof l>[]);
    },
    now,
  );
}

/** Steckbrief-Felder ändern; `null` oder '' löscht. */
export function editCharter(ws: Workspace, pid: string, patch: Record<string, unknown>, now = Date.now()): Workspace {
  return withProject(
    ws,
    pid,
    (p) => {
      const merged: Record<string, unknown> = { ...p.charter };
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === '') delete merged[k];
        else if (v !== undefined) merged[k] = v;
      }
      const charter = sanitizeCharter(merged);
      const q = { ...p };
      if (charter) q.charter = charter;
      else delete q.charter;
      return q;
    },
    now,
  );
}

/** V115: Abschluss-Felder ändern; `null` oder '' löscht. */
export function editClose(ws: Workspace, pid: string, patch: Record<string, unknown>, now = Date.now()): Workspace {
  return withProject(
    ws,
    pid,
    (p) => {
      const merged: Record<string, unknown> = { ...p.close };
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === '' || v === false) delete merged[k];
        else if (v !== undefined) merged[k] = v;
      }
      const close = sanitizeClose(merged);
      const q = { ...p };
      if (close) q.close = close;
      else delete q.close;
      return q;
    },
    now,
  );
}

/** Nächster freier Code mit Präfix, z. B. „SH-EX “ → „SH-EX 03“, „L“ → „L3“. */
export function nextCode(used: (string | undefined)[], prefix: string, pad = 0): string {
  let max = 0;
  for (const c of used) {
    if (!c?.startsWith(prefix)) continue;
    const m = /^(\d+)/.exec(c.slice(prefix.length));
    if (m) max = Math.max(max, Number(m[1]));
  }
  return prefix + String(max + 1).padStart(pad, '0');
}

/** Einsätze eines Vorgangs ändern: Person hinzu (Stunden/Kosten), ändern, `null` = entfernen. */
export function setUse(ws: Workspace, noteId: string, person: string, v: { hours?: number | null; cost?: number | null } | null, now = Date.now()): Workspace {
  let hit = false;
  const notes = (ws.notes ?? []).map((n) => {
    if (n.id !== noteId) return n;
    const use = [...(n.use ?? [])];
    const i = use.findIndex((u) => u.person === person);
    if (v === null) {
      if (i < 0) return n;
      use.splice(i, 1);
    } else {
      if (i < 0 && use.length >= USE_MAX) return n;
      const cur: NoteUse = i < 0 ? { person } : { ...use[i] };
      if (v.hours === null) delete cur.hours;
      else if (v.hours !== undefined && money(v.hours) !== undefined) cur.hours = money(v.hours);
      if (v.cost === null) delete cur.cost;
      else if (v.cost !== undefined && money(v.cost) !== undefined) cur.cost = money(v.cost);
      if (i < 0) use.push(cur);
      else use[i] = cur;
    }
    hit = true;
    const out: Note = { ...n, changed: now };
    if (use.length) out.use = use;
    else delete out.use;
    return out;
  });
  return hit ? { ...ws, notes } : ws;
}

/** Phase eines Vorgangs setzen (nur Phasen des eigenen Projekts). */
export function setPhase(ws: Workspace, noteId: string, phase: string | undefined, now = Date.now()): Workspace {
  const n = (ws.notes ?? []).find((x) => x.id === noteId);
  if (!n) return ws;
  if (phase && !(ws.projects ?? []).find((p) => p.id === n.project)?.phases?.some((x) => x.id === phase)) return ws;
  if ((n.phase ?? undefined) === phase) return ws;
  return { ...ws, notes: (ws.notes ?? []).map((x) => (x.id === noteId ? tidy({ ...x, phase, changed: now }) : x)) };
}

/** Vorgänge und Meilensteine einer Phase. */
export const notesOfPhase = (ws: Workspace, pid: string, phase: string): Note[] => (ws.notes ?? []).filter((n) => n.project === pid && n.phase === phase && n.state !== 'archived');

/** F-226 (ICB4 4.5.2): Ziele nach Art (Leistung, Sozial, Nicht-Ziel). */
export const goalsOf = (p: Project | undefined, kind?: GoalKind): ProjectGoal[] => (p?.goals ?? []).filter((g) => !kind || (g.kind ?? 'perf') === kind);
