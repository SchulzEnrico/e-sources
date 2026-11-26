/**
 * F-225 P8 (V107): Risiken und Änderungsanträge (Change Requests) nach IPMA ICB4 – Steuerungsobjekte
 * eines Projekts, keine Arbeit. Gespeichert als Notiz mit `type: 'risk'` bzw. `'change'` und Projekt;
 * sie zählen nicht als Vorgänge (`isTask`). Erst die Maßnahme bzw. die genehmigte Änderung wird ein
 * Vorgang („Vorgang anlegen …“, R6). Reine Funktionen, Tests in workspace.test.ts („F-225 P8“).
 */
import type { ChangeState, Feedback, Note, NoteChange, NoteRisk, Project, RiskLevel, RiskState, RiskStrategy, Workspace } from './types';
import { createNote, noteById, notesOf } from './notes';
import { isTask, projectById, rolesOf } from './projects';
import { feedbackById, restoreFeedbackItem, setBecame } from './feedback';
import { decisionsOf } from './decisions';
import { parseMeasures, parseRiskGpm } from './gpm';

export { isTask } from './projects';
export const isSteering = (n: Pick<Note, 'type'>): boolean => !isTask(n);

export const RISK_LEVELS: readonly RiskLevel[] = [1, 2, 3, 4, 5];
export const RISK_STRATEGIES: readonly RiskStrategy[] = ['avoid', 'reduce', 'transfer', 'accept'];
export const RISK_STATES: readonly RiskState[] = ['open', 'doing', 'occurred', 'closed'];
export const CHANGE_STATES: readonly ChangeState[] = ['asked', 'review', 'approved', 'rejected', 'parked'];
/** R4: Zustände, die eine Entscheidung sind (Datum, Begründung, wer). */
export const DECIDED: readonly ChangeState[] = ['approved', 'rejected', 'parked'];
export const TEXT_MAX = 2000;

export type SteerType = 'risk' | 'change';
type Act = { now?: number; by?: string; id?: string };

const clean = (s: string | undefined, max = TEXT_MAX) => (s ?? '').replace(/\r\n?/g, '\n').trim().slice(0, max);
const isLevel = (v: unknown): v is RiskLevel => typeof v === 'number' && RISK_LEVELS.includes(v as RiskLevel);

// ---------- Bewertung ----------

/** R2: Risikowert = Eintrittswahrscheinlichkeit × Auswirkung (1–25); fehlt eine Angabe = nicht bewertet. */
export function riskScore(r: Pick<NoteRisk, 'p' | 'i'> | undefined): number | undefined {
  return r?.p && r?.i ? r.p * r.i : undefined;
}
export type RiskTone = 'calm' | 'warn' | 'alert' | 'none';
/** R2: ruhig bis 7, gelb 8–14, rot ab 15. */
export function riskTone(score: number | undefined): RiskTone {
  if (!score) return 'none';
  return score >= 15 ? 'alert' : score >= 8 ? 'warn' : 'calm';
}
/** Abgeschlossene Risiken bzw. entschiedene Änderungen zählen nicht mehr als offen. */
export const riskOpen = (r: NoteRisk | undefined): boolean => (r?.state ?? 'open') !== 'closed';
export const changeOpen = (c: NoteChange | undefined): boolean => !DECIDED.includes(c?.state ?? 'asked');

// ---------- Lesen ----------

const ofType = (ws: Workspace, project: string, t: SteerType) => notesOf(ws).filter((n) => n.project === project && n.type === t && n.state !== 'archived');

/** R3: Risiken eines Projekts – höchster Wert zuerst, nicht bewertete danach, geschlossene zuletzt; sonst nach Nummer. */
export function risksOf(ws: Workspace, project: string): Note[] {
  return ofType(ws, project, 'risk').sort((a, b) => {
    const ca = riskOpen(a.risk) ? 0 : 1;
    const cb = riskOpen(b.risk) ? 0 : 1;
    if (ca !== cb) return ca - cb;
    const d = (riskScore(b.risk) ?? 0) - (riskScore(a.risk) ?? 0);
    return d || (a.risk?.no ?? 0) - (b.risk?.no ?? 0);
  });
}
/** Änderungen eines Projekts – offene zuerst, dann nach Nummer. */
export function changesOf(ws: Workspace, project: string): Note[] {
  return ofType(ws, project, 'change').sort((a, b) => {
    const ca = changeOpen(a.change) ? 0 : 1;
    const cb = changeOpen(b.change) ? 0 : 1;
    return ca - cb || (a.change?.no ?? 0) - (b.change?.no ?? 0);
  });
}

/** R8: nächste freie Nummer je Projekt und Art (gelöschte Nummern werden nicht wieder vergeben, solange die Notiz im Papierkorb liegt). */
export function nextNo(ws: Workspace, project: string, t: SteerType): number {
  let max = 0;
  for (const n of notesOf(ws)) if (n.project === project && n.type === t) max = Math.max(max, (t === 'risk' ? n.risk?.no : n.change?.no) ?? 0);
  return max + 1;
}

/**
 * R8: Nummer mit dem Kürzel des Projekts aus dem PSP-Präfix – „CG-R-3“, „CG-Ä-1“. Vom Präfix zählt nur das
 * Kürzel vorn (aus „CG-1.“ wird „CG“), damit die Nummer nicht wie ein PSP-Code aussieht.
 */
export function steerCodeFor(p: Pick<Project, 'psp'> | undefined, t: SteerType, no: number): string {
  const raw = (p?.psp?.prefix ?? '').trim().replace(/[-./ _:]+$/, '');
  const short = raw.match(/^[\p{L}]+/u)?.[0] ?? raw;
  const code = `${t === 'risk' ? 'R' : 'Ä'}-${no}`;
  return short ? `${short}-${code}` : code;
}
export function steerCode(ws: Workspace, n: Note): string {
  const no = n.type === 'risk' ? n.risk?.no : n.type === 'change' ? n.change?.no : undefined;
  if (!no) return '';
  return steerCodeFor(projectById(ws, n.project), n.type as SteerType, no);
}

/** R3: Risikomatrix 5 × 5 – Zeile = Eintrittswahrscheinlichkeit (5 oben), Spalte = Auswirkung (1 links); nur offene Risiken. */
export function riskMatrix(ws: Workspace, project: string): { p: RiskLevel; cells: { i: RiskLevel; score: number; ids: string[] }[] }[] {
  const open = risksOf(ws, project).filter((n) => riskOpen(n.risk));
  return [...RISK_LEVELS].reverse().map((p) => ({
    p,
    cells: RISK_LEVELS.map((i) => ({ i, score: p * i, ids: open.filter((n) => n.risk?.p === p && n.risk?.i === i).map((n) => n.id) })),
  }));
}
/** Nicht bewertete offene Risiken (stehen neben der Matrix). */
export const unratedRisks = (ws: Workspace, project: string): Note[] => risksOf(ws, project).filter((n) => riskOpen(n.risk) && !riskScore(n.risk));

/** Kennzahlen für Steckbrief und später den Projektbericht. */
export function steerCounts(ws: Workspace, project: string): { risks: number; high: number; changes: number } {
  const r = risksOf(ws, project).filter((n) => riskOpen(n.risk));
  return { risks: r.length, high: r.filter((n) => riskTone(riskScore(n.risk)) === 'alert').length, changes: changesOf(ws, project).filter((n) => changeOpen(n.change)).length };
}

// ---------- Anlegen und ändern ----------

function patch(ws: Workspace, id: string, fn: (n: Note) => Note, now: number): Workspace {
  let hit = false;
  const notes = notesOf(ws).map((n) => {
    if (n.id !== id) return n;
    const next = fn(n);
    if (JSON.stringify(next) === JSON.stringify(n)) return n;
    hit = true;
    return { ...next, changed: now };
  });
  return hit ? { ...ws, notes } : ws;
}

/** Entscheider ab Werk: Instanz „Lenkungskreis“ (`steering`), sonst die erste Instanz. */
export function defaultDecider(p: Project | undefined): string | undefined {
  const roles = rolesOf(p);
  return (roles.find((r) => r.id === 'steering') ?? roles[0])?.id;
}

/** R9: Risiko bzw. Änderungsantrag anlegen (Titel Pflicht). */
export function addSteer(
  ws: Workspace,
  project: string,
  t: SteerType,
  init: { title: string; text?: string; risk?: Partial<Omit<NoteRisk, 'no'>>; change?: Partial<Omit<NoteChange, 'no'>> },
  act: Act = {},
): { ws: Workspace; id: string } | null {
  const p = projectById(ws, project);
  const title = clean(init.title, 200);
  if (!p || !title) return null;
  const no = nextNo(ws, project, t);
  const extra: Partial<Note> =
    t === 'risk'
      ? { risk: { no, state: 'open', ...sanitizeRisk(init.risk ?? {}) } }
      : { change: { no, state: 'asked', ...(defaultDecider(p) ? { decider: defaultDecider(p) } : {}), ...sanitizeChange(init.change ?? {}) } };
  return createNote(ws, { title, text: clean(init.text), type: t, project, ...extra }, { now: act.now, by: act.by, id: act.id });
}

function sanitizeRisk(r: Partial<Omit<NoteRisk, 'no'>>): Partial<NoteRisk> {
  const out: Partial<NoteRisk> = {};
  for (const k of ['cause', 'event', 'effect', 'measure'] as const) {
    const s = clean(r[k]);
    if (s) out[k] = s;
  }
  if (isLevel(r.p)) out.p = r.p;
  if (isLevel(r.i)) out.i = r.i;
  if (r.strategy && RISK_STRATEGIES.includes(r.strategy)) out.strategy = r.strategy;
  if (r.state && RISK_STATES.includes(r.state)) out.state = r.state;
  for (const k of ['owner', 'from', 'task'] as const) if (typeof r[k] === 'string' && r[k]) out[k] = r[k];
  // F-226 (V109, G5/G6/L4): Chance, EW %, Tragweite €, Maßnahmen
  if (r.chance === true) out.chance = true;
  if (typeof r.ew === 'number' && r.ew >= 0 && r.ew <= 100) out.ew = Math.round(r.ew * 10) / 10;
  if (typeof r.impact === 'number' && r.impact >= 0) out.impact = Math.round(r.impact * 100) / 100;
  const ms = parseMeasures(r.measures);
  if (ms) out.measures = ms;
  return out;
}
function sanitizeChange(c: Partial<Omit<NoteChange, 'no'>>): Partial<NoteChange> {
  const out: Partial<NoteChange> = {};
  for (const k of ['why', 'perf', 'scope'] as const) {
    const s = clean(c[k]);
    if (s) out[k] = s;
  }
  if (typeof c.days === 'number' && Number.isFinite(c.days)) out.days = Math.max(-2000, Math.min(2000, Math.round(c.days)));
  if (typeof c.cost === 'number' && Number.isFinite(c.cost)) out.cost = Math.round(c.cost * 100) / 100;
  if (c.state && CHANGE_STATES.includes(c.state)) out.state = c.state;
  for (const k of ['by', 'decider', 'from', 'task'] as const) if (typeof c[k] === 'string' && c[k]) out[k] = clean(c[k], 120);
  if (c.decided && typeof c.decided.at === 'string') out.decided = { at: c.decided.at, ...(clean(c.decided.text) ? { text: clean(c.decided.text) } : {}), ...(c.decided.who ? { who: clean(c.decided.who, 120) } : {}) };
  return out;
}

export type RiskPatch = { [K in keyof Omit<NoteRisk, 'no'>]?: NoteRisk[K] | null };
export type ChangePatch = { [K in keyof Omit<NoteChange, 'no' | 'state' | 'decided'>]?: NoteChange[K] | null };

/** R2: Angaben eines Risikos ändern; `null` entfernt die Angabe. */
export function editRisk(ws: Workspace, id: string, p: RiskPatch, now = Date.now()): Workspace {
  return patch(
    ws,
    id,
    (n) => {
      if (n.type !== 'risk' || !n.risk) return n;
      const merged: Record<string, unknown> = { ...n.risk };
      for (const [k, v] of Object.entries(p)) {
        if (v === null || v === '') delete merged[k];
        else if (v !== undefined) merged[k] = v;
      }
      return { ...n, risk: { no: n.risk.no, ...sanitizeRisk(merged as Partial<NoteRisk>) } };
    },
    now,
  );
}

/** R4: Angaben eines Änderungsantrags ändern (Zustand und Entscheidung über `decideChange`). */
export function editChange(ws: Workspace, id: string, p: ChangePatch, now = Date.now()): Workspace {
  return patch(
    ws,
    id,
    (n) => {
      if (n.type !== 'change' || !n.change) return n;
      const merged: Record<string, unknown> = { ...n.change };
      for (const [k, v] of Object.entries(p)) {
        if (v === null || v === '') delete merged[k];
        else if (v !== undefined) merged[k] = v;
      }
      return { ...n, change: { no: n.change.no, ...sanitizeChange(merged as Partial<NoteChange>) } };
    },
    now,
  );
}

/**
 * R4/R5: Zustand eines Änderungsantrags setzen. Genehmigt, abgelehnt, zurückgestellt = Entscheidung mit
 * Zeitpunkt, Begründung und wer (Befugnis „Entscheiden“ prüft die Oberfläche). Zurück auf beantragt bzw.
 * in Prüfung nimmt die Entscheidung weg.
 */
export function decideChange(ws: Workspace, id: string, state: ChangeState, o: { text?: string; who?: string; now?: number } = {}): Workspace {
  const now = o.now ?? Date.now();
  return patch(
    ws,
    id,
    (n) => {
      if (n.type !== 'change' || !n.change || !CHANGE_STATES.includes(state)) return n;
      const { decided: _d, ...rest } = n.change; // eslint-disable-line @typescript-eslint/no-unused-vars
      const c: NoteChange = { ...rest, state };
      if (DECIDED.includes(state)) c.decided = { at: new Date(now).toISOString(), ...(clean(o.text) ? { text: clean(o.text) } : {}), ...(o.who ? { who: o.who } : {}) };
      return { ...n, change: c };
    },
    now,
  );
}

/** R6: Darf „Vorgang anlegen …“? Risiko: mit Maßnahme; Änderung: nur genehmigt; noch kein Vorgang da. */
export function canMakeTask(ws: Workspace, n: Note): boolean {
  if (n.type === 'risk') return !!n.risk && !(n.risk.task && noteById(ws, n.risk.task)) && riskOpen(n.risk);
  if (n.type === 'change') return !!n.change && n.change.state === 'approved' && !(n.change.task && noteById(ws, n.change.task));
  return false;
}

/**
 * R6: Vorgang aus Maßnahme bzw. genehmigter Änderung – neue Notiz im Projekt (ein Vorgang, steht damit in
 * PSP und Gantt), Titel „Maßnahme R-3: …“ bzw. „Änderung Ä-1: …“, verknüpft in beide Richtungen über
 * `task` und den Text des Vorgangs. Nicht automatisch – die Oberfläche fragt nicht, der Knopf ist die Entscheidung.
 */
export function makeTask(ws: Workspace, id: string, act: Act & { id: string }): { ws: Workspace; id: string } | null {
  const n = noteById(ws, id);
  if (!n || !n.project || !canMakeTask(ws, n)) return null;
  const code = steerCode(ws, n);
  const title = n.type === 'risk' ? `Maßnahme ${code}: ${n.risk?.measure ? firstLine(n.risk.measure) : n.title}` : `Änderung ${code}: ${n.title}`;
  const text = n.type === 'risk' ? clean(n.risk?.measure) : clean(n.text);
  const c = createNote(ws, { title: title.slice(0, 200), text, project: n.project }, act);
  const out = n.type === 'risk' ? editRisk(c.ws, id, { task: c.id }, act.now) : editChange(c.ws, id, { task: c.id }, act.now);
  return { ws: out, id: c.id };
}
const firstLine = (s: string) => s.split('\n')[0].slice(0, 120);

// ---------- R7: aus einer Meldung ----------

export type BecomeUndo = { feedback: Feedback; note: string };

/**
 * R7: Projektmeldung wird zu Risiko bzw. Änderungsantrag. Übernimmt Titel, „Was ist passiert“ (Text),
 * Folgen (Risiko: Auswirkung; Änderung: Leistung), Vermutung (Risiko: Ursache), Betroffen (Änderung:
 * Umfang); Meldung bekommt `became` und den Vermerk „Wurde zu Risiko CG-R-3“. Nur einmal je Meldung.
 */
export function becomeFromFeedback(ws: Workspace, fbId: string, t: SteerType, act: Act & { id: string; label: string }): { ws: Workspace; id: string; code: string; undo: BecomeUndo } | null {
  const f = feedbackById(ws, fbId);
  if (!f || !f.project || !projectById(ws, f.project)) return null;
  if (f.became && (f.became.type === 'decision' ? decisionsOf(ws).some((d) => d.id === f.became!.note) : noteById(ws, f.became.note))) return null;
  const r =
    t === 'risk'
      ? addSteer(ws, f.project, 'risk', { title: f.title, text: f.what, risk: { effect: f.impact, cause: f.guess, event: f.what ? undefined : f.title, from: f.id } }, act)
      : addSteer(ws, f.project, 'change', { title: f.title, text: f.what, change: { why: [f.goals, f.impact].filter(Boolean).join('\n\n'), scope: f.affected, by: act.by, from: f.id } }, act);
  if (!r) return null;
  const code = steerCode(r.ws, noteById(r.ws, r.id)!);
  const ws2 = setBecame(r.ws, fbId, { note: r.id, type: t }, `${act.label} ${code}`, { now: act.now ? new Date(act.now) : undefined, by: act.by });
  return { ws: ws2, id: r.id, code, undo: { feedback: f, note: r.id } };
}

/** R7: Rückgängig – Notiz entfernen (ohne Papierkorb, sie war neu) und Meldung wie vorher. */
export function undoBecome(ws: Workspace, u: BecomeUndo): Workspace {
  const notes = notesOf(ws).filter((n) => n.id !== u.note);
  const out = notes.length === notesOf(ws).length ? ws : { ...ws, notes };
  return restoreFeedbackItem(out, u.feedback);
}

// ---------- Speichern ----------

const str = (v: unknown, max = TEXT_MAX) => (typeof v === 'string' ? clean(v, max) : '');

/** Liest `Note.risk` (Dateiformat 11, nur optional). */
export function parseRisk(v: unknown): NoteRisk | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const o = v as Record<string, unknown>;
  if (typeof o.no !== 'number' || !Number.isInteger(o.no) || o.no < 1) return undefined;
  return { no: o.no, ...sanitizeRisk({ cause: str(o.cause), event: str(o.event), effect: str(o.effect), measure: str(o.measure), p: o.p as RiskLevel, i: o.i as RiskLevel, strategy: o.strategy as RiskStrategy, state: o.state as RiskState, owner: str(o.owner, 120), from: str(o.from, 120), task: str(o.task, 120), ...parseRiskGpm(o) }) };
}
/** Liest `Note.change`. */
export function parseChange(v: unknown): NoteChange | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const o = v as Record<string, unknown>;
  if (typeof o.no !== 'number' || !Number.isInteger(o.no) || o.no < 1) return undefined;
  const d = o.decided && typeof o.decided === 'object' ? (o.decided as Record<string, unknown>) : undefined;
  return {
    no: o.no,
    ...sanitizeChange({
      why: str(o.why),
      perf: str(o.perf),
      scope: str(o.scope),
      days: typeof o.days === 'number' ? o.days : undefined,
      cost: typeof o.cost === 'number' ? o.cost : undefined,
      state: o.state as ChangeState,
      by: str(o.by, 120),
      decider: str(o.decider, 120),
      from: str(o.from, 120),
      task: str(o.task, 120),
      decided: d && typeof d.at === 'string' && !Number.isNaN(Date.parse(d.at)) ? { at: d.at, text: str(d.text), who: str(d.who, 120) } : undefined,
    }),
  };
}
