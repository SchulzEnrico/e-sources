/**
 * F-231 K10a (V129): Regel-Baukasten wie Trello Butler – Entscheidungen B1–B4, B9 (Claude Doc „F-231 V128 – K10
 * Butler“, Enrico: „Wir gehen nach deinen Vorschlägen vor.“).
 *
 * B1 Satz-Baukasten „Wenn [Auslöser] und [Bedingung] dann [Aktion], [Aktion] …“ aus festen Bausteinen, als Daten.
 * B2 Jede Regel gilt für ein Board oder „alle Kanbans“; Liste im Cockpit „Regeln“ (Gruppe Notizen) und am Board
 *    ⋮ › „Automatisierung“ (dieselbe Liste, gefiltert).
 * B3 W1–W4 werden mitgelieferte Bausteinregeln (bearbeitbar, kopierbar); Ein/Aus bleibt erhalten.
 * B4 Regeln dürfen Regeln auslösen (höchstens 3 Stufen, jede Regel einmal je Änderung) – Ausführung in ruleRun.ts.
 *
 * Gespeichert in `Workspace.ruleSet.rules` (abgeglichen, Dateiformat 13). Fehlt `rules`, gelten die vier
 * mitgelieferten Regeln mit Ein/Aus aus dem alten Feld `when` (Umzug ohne Verlust). Spalten, Tags und Felder stehen
 * wie bei Trello Butler mit ihrem Namen in der Regel – so gilt eine Regel für „alle Kanbans“ in jedem Board mit
 * einer Spalte dieses Namens. Alles hier ist rein.
 */
import type { Workspace } from './types';

/** Grenzen (Doc: bis 5 Bedingungen, bis 10 Aktionen je Regel). */
export const IF_MAX = 5;
export const THEN_MAX = 10;
export const RULES_MAX = 100;
export const CHAIN_MAX = 3;
const TEXT_MAX = 500;
const NAME_MAX = 80;

/** Art der Lücke im Satz (bestimmt das Eingabefeld). */
export type ArgKind = 'col' | 'board' | 'tag' | 'person' | 'field' | 'text' | 'days' | 'sort' | 'state' | 'pos' | 'value';

export type TrigKind =
  | 'colIn' | 'colOut' | 'created' | 'arrive' | 'done' | 'reopen' | 'tagAdd' | 'tagDel' | 'assignSet' | 'assignDel'
  | 'dueSet' | 'checksDone' | 'checkTick' | 'comment' | 'field' | 'check';
export type CondKind = 'inCol' | 'onBoard' | 'state' | 'hasTag' | 'assignee' | 'dueIn' | 'overdue' | 'noDue' | 'checks' | 'field' | 'titleHas' | 'doneSince' | 'urgent';
export type ActKind =
  | 'toCol' | 'nextCol' | 'sortCol' | 'toBoard' | 'copyBoard' | 'mirrorBoard' | 'setDone' | 'reopen' | 'archive'
  | 'tagAdd' | 'tagDel' | 'assign' | 'unassign' | 'dueSet' | 'dueShift' | 'dueDel' | 'notBefore' | 'checkAll' | 'uncheckAll'
  | 'comment' | 'fieldSet' | 'fieldClear' | 'titlePre' | 'titleSuf' | 'urgentSet' | 'urgentDel' | 'notice';

/** Ein Baustein: Art plus bis zu zwei Angaben (`a` Text/Id, `b` zweite Angabe) bzw. Zahl `n`; `not` = verneint. */
export interface Part<K extends string> { k: K; a?: string; b?: string; n?: number; not?: true }
export type Trig = Part<TrigKind>;
export type Cond = Part<CondKind>;
export type Act = Part<ActKind>;

/** Mitgelieferte Regeln (B3) – dieselben Kennungen wie die alten Schalter. */
export type BuiltIn = 'doneChecks' | 'checksNext' | 'archiveOld' | 'dueUrgent';
export const BUILT_INS: readonly BuiltIn[] = ['doneChecks', 'checksNext', 'archiveOld', 'dueUrgent'];
const BUILT_NO: Record<BuiltIn, string> = { doneChecks: 'W1', checksNext: 'W2', archiveOld: 'W3', dueUrgent: 'W4' };

export interface KitRule {
  id: string;
  /** Laufende Nummer eigener Regeln (R1, R2 …); mitgelieferte tragen W1–W4. */
  no: number;
  name: string;
  on: boolean;
  /** Board (Id eines Kanbans); fehlt = alle Kanbans. */
  board?: string;
  when: Trig;
  ifs: Cond[];
  then: Act[];
  /** Mitgeliefert (Umzug W1–W4). */
  w?: BuiltIn;
}

/** Angaben je Baustein: welche Lücken er hat. `opt` = Angabe darf leer sein (Auslöser: „beliebige“). */
interface Spec { a?: ArgKind; b?: ArgKind; n?: 'days'; opt?: true; not?: true; anyBoard?: true }

export const TRIGS: Record<TrigKind, Spec> = {
  colIn: { a: 'col', opt: true },
  colOut: { a: 'col', opt: true },
  created: {},
  arrive: {},
  done: {},
  reopen: {},
  tagAdd: { a: 'tag', opt: true },
  tagDel: { a: 'tag', opt: true },
  assignSet: { a: 'person', opt: true },
  assignDel: {},
  dueSet: {},
  checksDone: {},
  checkTick: {},
  comment: { a: 'text', opt: true },
  field: { a: 'field' },
  check: {},
};
export const TRIG_KINDS = Object.keys(TRIGS) as TrigKind[];

export const CONDS: Record<CondKind, Spec> = {
  inCol: { a: 'col', not: true },
  onBoard: { a: 'board', not: true },
  state: { a: 'state' },
  hasTag: { a: 'tag', not: true },
  assignee: { a: 'person', opt: true, not: true },
  dueIn: { n: 'days' },
  overdue: { not: true },
  noDue: { not: true },
  checks: { a: 'state' },
  field: { a: 'field', b: 'value', not: true },
  titleHas: { a: 'text', not: true },
  doneSince: { n: 'days' },
  urgent: { not: true },
};
export const COND_KINDS = Object.keys(CONDS) as CondKind[];

export const ACTS: Record<ActKind, Spec> = {
  toCol: { a: 'col', b: 'pos' },
  nextCol: {},
  sortCol: { a: 'sort' },
  toBoard: { a: 'board' },
  copyBoard: { a: 'board' },
  mirrorBoard: { a: 'board' },
  setDone: {},
  reopen: {},
  archive: {},
  tagAdd: { a: 'tag' },
  tagDel: { a: 'tag' },
  assign: { a: 'person' },
  unassign: {},
  dueSet: { n: 'days' },
  dueShift: { n: 'days' },
  dueDel: {},
  notBefore: { n: 'days' },
  checkAll: {},
  uncheckAll: {},
  comment: { a: 'text' },
  fieldSet: { a: 'field', b: 'value' },
  fieldClear: { a: 'field' },
  titlePre: { a: 'text' },
  titleSuf: { a: 'text' },
  urgentSet: {},
  urgentDel: {},
  notice: { a: 'text' },
};
export const ACT_KINDS = Object.keys(ACTS) as ActKind[];

/** Feste Wahlen einzelner Lücken. */
export const STATE_CHOICES = ['open', 'done'] as const;
export const POS_CHOICES = ['bottom', 'top'] as const;
export const SORT_CHOICES = ['due', 'important', 'title'] as const;

// ---------------------------------------------------------------- mitgelieferte Regeln (B3)

/** Die vier mitgelieferten Regeln als Bausteine – dasselbe Verhalten wie W1–W4 bis V128. */
export function builtIn(w: BuiltIn, on = false): KitRule {
  const base = { id: `w-${w}`, no: 0, on, w };
  switch (w) {
    case 'doneChecks':
      return { ...base, name: 'Erledigt hakt ab', when: { k: 'done' }, ifs: [], then: [{ k: 'checkAll' }] };
    case 'checksNext':
      return { ...base, name: 'Checkliste fertig rückt weiter', when: { k: 'checksDone' }, ifs: [{ k: 'state', a: 'open' }], then: [{ k: 'nextCol' }] };
    case 'archiveOld':
      return { ...base, name: 'Altes Erledigtes archivieren', when: { k: 'check' }, ifs: [{ k: 'doneSince', n: 30 }], then: [{ k: 'archive' }] };
    case 'dueUrgent':
      return { ...base, name: 'Fälliges wird dringend', when: { k: 'check' }, ifs: [{ k: 'dueIn', n: 1 }, { k: 'state', a: 'open' }, { k: 'urgent', not: true }], then: [{ k: 'urgentSet' }] };
  }
}

/** Alle Regeln: gespeicherte Liste, sonst die mitgelieferten mit Ein/Aus aus `when` (Umzug). */
export function kitOf(ws: Workspace): KitRule[] {
  const rs = ws.ruleSet;
  if (rs?.rules) return rs.rules;
  return BUILT_INS.map((w) => builtIn(w, !!rs?.when?.includes(w)));
}

/** Kennung in Liste und Spur: W1–W4 bzw. R1, R2 … */
export const ruleTag = (r: Pick<KitRule, 'w' | 'no'>) => (r.w ? BUILT_NO[r.w] : `R${r.no}`);
/** Für die Spur (RG7): „Regel R3 · Name“. */
export const ruleLabel = (r: Pick<KitRule, 'w' | 'no' | 'name'>) => `Regel ${ruleTag(r)} · ${r.name}`;

/** Weicht eine mitgelieferte Regel vom Werk ab (außer Ein/Aus)? */
export function changedBuiltIn(r: KitRule): boolean {
  if (!r.w) return false;
  const f = builtIn(r.w, r.on);
  const key = (x: KitRule) => JSON.stringify([x.name, x.board ?? '', x.when, x.ifs, x.then]);
  return key(r) !== key(f);
}

// ---------------------------------------------------------------- Ändern

/** Liste setzen; `when` entfällt, sobald es eine Liste gibt. */
export function withKit(ws: Workspace, rules: KitRule[]): Workspace {
  const { when: _w, rules: _r, ...rest } = ws.ruleSet ?? {};
  return { ...ws, ruleSet: { ...rest, rules } };
}

export const nextNo = (rules: readonly KitRule[]) => rules.reduce((m, r) => Math.max(m, r.no), 0) + 1;

/** Prüfen, ob eine Regel vollständig ist; Rückgabe = erste fehlende Stelle oder null. */
export type Missing = { where: 'when' | 'if' | 'then' | 'name'; i?: number; what: 'arg' | 'none' } | null;
export function missingOf(r: Pick<KitRule, 'name' | 'when' | 'ifs' | 'then'>): Missing {
  if (!r.name.trim()) return { where: 'name', what: 'arg' };
  if (!partOk(TRIGS[r.when.k], r.when)) return { where: 'when', what: 'arg' };
  for (let i = 0; i < r.ifs.length; i++) if (!partOk(CONDS[r.ifs[i].k], r.ifs[i])) return { where: 'if', i, what: 'arg' };
  if (!r.then.length) return { where: 'then', what: 'none' };
  for (let i = 0; i < r.then.length; i++) if (!partOk(ACTS[r.then[i].k], r.then[i])) return { where: 'then', i, what: 'arg' };
  return null;
}
function partOk(s: Spec | undefined, p: Part<string>): boolean {
  if (!s) return false;
  if (s.a && !s.opt && !p.a?.trim()) return false;
  if (s.b === 'pos' && p.b && !(POS_CHOICES as readonly string[]).includes(p.b)) return false;
  if (s.n && (typeof p.n !== 'number' || !Number.isFinite(p.n))) return false;
  return true;
}

/** Leerer Baustein einer Art mit sinnvollen Vorgaben. */
export function blank<K extends string>(k: K, spec: Spec): Part<K> {
  const p: Part<K> = { k };
  if (spec.a === 'state') p.a = 'open';
  if (spec.a === 'sort') p.a = 'due';
  if (spec.a === 'person' && !spec.opt) p.a = 'me';
  if (spec.b === 'pos') p.b = 'bottom';
  if (spec.n) p.n = k === 'doneSince' ? 30 : k === 'dueShift' ? 7 : 1;
  return p;
}

/** Neue eigene Regel (Vorgabe: Wenn Karte in Spalte … dann …). */
export function newRule(rules: readonly KitRule[], id: string, board?: string): KitRule {
  return { id, no: nextNo(rules), name: '', on: true, ...(board ? { board } : {}), when: { k: 'colIn', a: '' }, ifs: [], then: [] };
}

/** Regel speichern (neu oder ändern); mitgelieferte behalten `w`. */
export function saveRule(ws: Workspace, r: KitRule): Workspace {
  const list = kitOf(ws);
  const clean = cleanRule(r);
  if (!clean) return ws;
  const i = list.findIndex((x) => x.id === r.id);
  if (i < 0 && list.length >= RULES_MAX) return ws;
  return withKit(ws, i < 0 ? [...list, clean] : list.map((x, j) => (j === i ? { ...clean, ...(x.w ? { w: x.w } : {}) } : x)));
}

export function setOn(ws: Workspace, id: string, on: boolean): Workspace {
  const list = kitOf(ws);
  const r = list.find((x) => x.id === id);
  if (!r || r.on === on) return ws;
  // Nur mitgelieferte und noch keine Liste: altes Feld `when` pflegen (wie bis V128)
  if (!ws.ruleSet?.rules && r.w) {
    const when = BUILT_INS.filter((w) => (w === r.w ? on : list.find((x) => x.w === w)?.on));
    const { when: _w, ...rest } = ws.ruleSet ?? {};
    const rs = when.length ? { ...rest, when } : rest;
    return Object.keys(rs).length ? { ...ws, ruleSet: rs } : (({ ruleSet: _x, ...o }) => o)(ws);
  }
  return withKit(ws, list.map((x) => (x.id === id ? { ...x, on } : x)));
}

/** Kopie (eigene Regel, neue Nummer, aus). */
export function copyRule(ws: Workspace, id: string, newId: string, suffix = ' (Kopie)'): Workspace {
  const list = kitOf(ws);
  const r = list.find((x) => x.id === id);
  if (!r || list.length >= RULES_MAX) return ws;
  const { w: _w, ...rest } = r;
  const copy: KitRule = { ...rest, id: newId, no: nextNo(list), name: `${r.name}${suffix}`.slice(0, NAME_MAX), on: false };
  const i = list.indexOf(r);
  return withKit(ws, [...list.slice(0, i + 1), copy, ...list.slice(i + 1)]);
}

export type RuleUndo = { rule: KitRule; index: number };
/** Löschen (mitgelieferte nicht – die lassen sich ausschalten und auf Werk zurückstellen). */
export function removeRule(ws: Workspace, id: string): { ws: Workspace; undo: RuleUndo } | null {
  const list = kitOf(ws);
  const index = list.findIndex((x) => x.id === id);
  if (index < 0 || list[index].w) return null;
  return { ws: withKit(ws, list.filter((x) => x.id !== id)), undo: { rule: list[index], index } };
}
export function restoreRule(ws: Workspace, u: RuleUndo): Workspace {
  const list = kitOf(ws);
  if (list.some((x) => x.id === u.rule.id)) return ws;
  return withKit(ws, [...list.slice(0, u.index), u.rule, ...list.slice(u.index)]);
}
/** Mitgelieferte Regel auf Werk zurück (Ein/Aus bleibt). */
export function resetBuiltIn(ws: Workspace, id: string): Workspace {
  const list = kitOf(ws);
  const r = list.find((x) => x.id === id);
  if (!r?.w) return ws;
  return withKit(ws, list.map((x) => (x.id === id ? builtIn(r.w!, r.on) : x)));
}
export function moveRule(ws: Workspace, id: string, dir: -1 | 1): Workspace {
  const list = [...kitOf(ws)];
  const i = list.findIndex((x) => x.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return ws;
  [list[i], list[j]] = [list[j], list[i]];
  return withKit(ws, list);
}

/** Regeln eines Boards (B2: „Automatisierung“ am Board) – dieses Board und „alle Kanbans“. */
export const rulesFor = (rules: readonly KitRule[], board?: string) => (board ? rules.filter((r) => !r.board || r.board === board) : rules);

// ---------------------------------------------------------------- Lesen (Abgleich, Datei)

const str = (v: unknown, max = TEXT_MAX) => (typeof v === 'string' ? v.slice(0, max) : undefined);

function cleanPart<K extends string>(raw: unknown, specs: Record<K, Spec>): Part<K> | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const k = r.k as K;
  const s = typeof k === 'string' ? specs[k] : undefined;
  if (!s) return null;
  const p: Part<K> = { k };
  const a = str(r.a);
  const b = str(r.b);
  if (s.a && a !== undefined) p.a = a;
  if (s.b && b !== undefined) p.b = b;
  if (s.n && typeof r.n === 'number' && Number.isFinite(r.n)) p.n = Math.max(-3650, Math.min(3650, Math.round(r.n)));
  if (s.not && r.not === true) p.not = true;
  return p;
}

/** Eine Regel prüfen; unbekannte Bausteine fallen weg (eine Regel ohne Aktion bleibt erhalten, aber aus). */
export function cleanRule(raw: unknown): KitRule | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = str(r.id, 60);
  const when = cleanPart(r.when, TRIGS);
  if (!id || !when) return null;
  const ifs = (Array.isArray(r.ifs) ? r.ifs : []).map((x) => cleanPart(x, CONDS)).filter((x): x is Cond => !!x).slice(0, IF_MAX);
  const then = (Array.isArray(r.then) ? r.then : []).map((x) => cleanPart(x, ACTS)).filter((x): x is Act => !!x).slice(0, THEN_MAX);
  const w = BUILT_INS.find((x) => x === r.w);
  const out: KitRule = {
    id,
    no: typeof r.no === 'number' && Number.isFinite(r.no) ? Math.max(0, Math.round(r.no)) : 0,
    name: (str(r.name, NAME_MAX) ?? '').trim() || (w ? builtIn(w).name : ''),
    on: r.on === true && then.length > 0,
    when,
    ifs,
    then,
  };
  const board = str(r.board, 60);
  if (board) out.board = board;
  if (w) out.w = w;
  return out;
}

export function parseRules(raw: unknown): KitRule[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const seen = new Set<string>();
  const out: KitRule[] = [];
  for (const x of raw.slice(0, RULES_MAX + BUILT_INS.length)) {
    const r = cleanRule(x);
    if (!r || seen.has(r.id) || (r.w && out.some((o) => o.w === r.w))) continue;
    seen.add(r.id);
    out.push(r);
  }
  // fehlende mitgelieferte ergänzen (aus) – sie gehören immer dazu
  for (const w of BUILT_INS) if (!out.some((r) => r.w === w)) out.push(builtIn(w));
  return out;
}
