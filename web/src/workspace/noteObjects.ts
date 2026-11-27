/**
 * F-206 (Datenmodell v8, V65): Pads, Projekte, Personen, Verbindungen zu Sources und Desk-
 * Einstellungen für Notes & Tasks. Hier nur Lesen und Prüfen beim Laden sowie der Umstieg aus v7;
 * die Oberfläche folgt ab Bau-Schritt 3. Reine Funktionen.
 */
import type {
  BaselineTask,
  FocusView,
  Note,
  NoteCheck,
  NoteRemind,
  NoteType,
  Pad,
  PadDesk,
  PadPlace,
  Person,
  PersonRight,
  PlanActual,
  Project,
  ProjectBaseline,
  SheetOwner,
  SheetRange,
  SourceLink,
  SourceSpot,
} from './types';
import { type Node, isNode, leaves, removeLeaf } from './tree';
import { parseFeedbackForm } from './feedback';
import { parseChange, parseRisk } from './risks';
import { parseCheckGpm, parsePersonGpm, parseProcure, parseProjectGpm, parseResults, parseRoleAkv, parseUses, parseWp } from './gpm';
import { parseProjectForms } from './formKit';
import { cleanCover } from './covers';
import { cleanFieldValues, cleanVotes } from './cardFields';
import { cleanWatch } from './watch';
import { parseForeign } from './foreign';
import { parseCalendar } from './calendar';

/** Höchstens so viele Sheets je Pad (Antwort 20). */
export const PAD_SHEETS_MAX = 9;
export const NOTE_TYPES: readonly NoteType[] = ['requirement', 'risk', 'stakeholder', 'procurement', 'change', 'minutes'];
export const FOCUS_VIEWS: readonly FocusView[] = ['line', 'week', 'ring', 'grid'];
const PROJECT_STATES: readonly NonNullable<Project['state']>[] = ['idea', 'planned', 'running', 'paused', 'done', 'stopped'];
const PERSON_KINDS: readonly Person['kind'][] = ['person', 'team', 'role'];
const RIGHTS: readonly PersonRight[] = ['release', 'spend', 'decide', 'accept', 'feedback'];
const REPEATS: readonly NonNullable<NoteRemind['repeat']>[] = ['day', 'week', 'month', 'year'];
const EDGES: readonly NonNullable<PadDesk['dock']>['edge'][] = ['left', 'right', 'top', 'bottom'];

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isTime = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v));
const text = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v : undefined);
const share = (v: unknown): v is number => isNum(v) && v >= 0 && v <= 1;

// ---------------------------------------------------------------- Felder an Note und Sheet

/** Stelle in einer Quelle; leer = undefined. */
function parseSpot(v: unknown): SourceSpot | undefined {
  if (!isObj(v)) return undefined;
  const at: SourceSpot = {};
  if (isNum(v.time) && v.time >= 0) at.time = v.time;
  if (text(v.section)) at.section = v.section as string;
  if (isNum(v.page) && v.page >= 1) at.page = Math.floor(v.page);
  return Object.keys(at).length ? at : undefined;
}

/** Verbindungen zu Sources (Titel und Adresse bleiben als Kopie, auch wenn die Source fehlt). */
export function parseSourceLinks(v: unknown): SourceLink[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: SourceLink[] = [];
  for (const l of v) {
    if (!isObj(l) || typeof l.id !== 'string' || !l.id || typeof l.url !== 'string') continue;
    const at = parseSpot(l.at);
    // dieselbe Source an derselben Stelle nur einmal
    const key = JSON.stringify([l.id, at ?? null]);
    if (out.some((x) => JSON.stringify([x.id, x.at ?? null]) === key)) continue;
    out.push({ id: l.id, title: typeof l.title === 'string' ? l.title : '', url: l.url, ...(at ? { at } : {}) });
  }
  return out.length ? out : undefined;
}

function parsePlanActual(v: unknown): PlanActual | undefined {
  if (!isObj(v)) return undefined;
  const out: PlanActual = {};
  if (isNum(v.plan) && v.plan >= 0) out.plan = v.plan;
  if (isNum(v.actual) && v.actual >= 0) out.actual = v.actual;
  return Object.keys(out).length ? out : undefined;
}

/** V100 (K1): längste Dauer eines Vorgangs in Arbeitstagen (rund 8 Jahre). */
export const DURATION_MAX = 2000;

/** Neue Felder einer Note (v8) – Bezüge auf Projekte und Personen prüft cleanRefs. */
export function parseNoteExtras(v: Record<string, unknown>): Partial<Note> {
  const out: Partial<Note> = {};
  if (NOTE_TYPES.includes(v.type as NoteType)) out.type = v.type as NoteType;
  const foreign = parseForeign(v.foreign);
  if (foreign) out.foreign = foreign;
  // F-225 P8 (V107): Angaben als Risiko bzw. Änderungsantrag – nur passend zur Art
  if (out.type === 'risk') {
    const r = parseRisk(v.risk);
    if (r) out.risk = r;
  }
  if (out.type === 'change') {
    const c = parseChange(v.change);
    if (c) out.change = c;
  }
  // V121 (F-231 K5, K1): Uhrzeit zu „fällig“, Kartenvorlage
  if (typeof v.dueTime === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v.dueTime)) out.dueTime = v.dueTime;
  if (v.template === true) out.template = true;
  // V124/V125 (F-231 K6, K8): Titelbild (fehlte beim Laden bis V124), eigene Felder, Stimmen
  const cover = cleanCover(v.cover);
  if (cover) out.cover = cover;
  const fields = cleanFieldValues(v.fields);
  if (fields) out.fields = fields;
  const votes = cleanVotes(v.votes);
  if (votes) out.votes = votes;
  // V132 (F-231 K10d): Beobachter der Karte
  const watch = cleanWatch(v.watch);
  if (watch) out.watch = watch;
  if (typeof v.project === 'string' && v.project) out.project = v.project;
  if (typeof v.assignee === 'string' && v.assignee) out.assignee = v.assignee;
  const effort = parsePlanActual(v.effort);
  if (effort) out.effort = effort;
  const cost = parsePlanActual(v.cost);
  if (cost) out.cost = cost;
  if (v.milestone === true) out.milestone = true;
  // F-226 (V109): Phase, Einsätze, Ergebnisse, Beschaffung (Phase prüft cleanGpmRefs)
  if (typeof v.phase === 'string' && v.phase) out.phase = v.phase;
  const use = parseUses(v.use);
  if (use) out.use = use;
  const results = parseResults(v.results);
  if (results) out.results = results;
  const wp = parseWp(v.wp);
  if (wp) out.wp = wp;
  if (out.type === 'procurement') {
    const pr = parseProcure(v.procure);
    if (pr) out.procure = pr;
  }
  // V100 (Dateiformat 10, K1/K2): Dauer in ganzen Arbeitstagen, Planungsart
  if (isNum(v.duration) && v.duration >= 0) out.duration = Math.min(DURATION_MAX, Math.round(v.duration));
  if (v.manual === true) out.manual = true;
  if (isObj(v.remind) && isTime(v.remind.at)) {
    out.remind = {
      at: v.remind.at,
      ...(REPEATS.includes(v.remind.repeat as NonNullable<NoteRemind['repeat']>) ? { repeat: v.remind.repeat as NoteRemind['repeat'] } : {}),
      ...(isTime(v.remind.snooze) ? { snooze: v.remind.snooze } : {}),
    };
  }
  if (typeof v.place === 'string' && v.place.trim()) out.place = v.place;
  if (Array.isArray(v.accept)) {
    const accept: NoteCheck[] = v.accept
      .filter((c): c is Record<string, unknown> => isObj(c) && !!text(c.text))
      .map((c) => ({ text: c.text as string, ...(c.ok === true ? { ok: true } : {}), ...parseCheckGpm(c) }));
    if (accept.length) out.accept = accept;
  }
  const sources = parseSourceLinks(v.sources);
  if (sources) out.sources = sources;
  return out;
}

/** Besitzer und Bereich eines Sheets (Bezüge prüft der Aufrufer nicht – fehlt das Ziel, zeigt die Oberfläche „ohne“). */
export function parseSheetExtras(v: Record<string, unknown>): { owner?: SheetOwner; range?: SheetRange; check?: boolean; sources?: SourceLink[] } {
  const out: { owner?: SheetOwner; range?: SheetRange; check?: boolean; sources?: SourceLink[] } = {};
  if (isObj(v.owner) && ['person', 'project', 'scope'].includes(v.owner.kind as string) && typeof v.owner.id === 'string' && v.owner.id)
    out.owner = { kind: v.owner.kind as SheetOwner['kind'], id: v.owner.id };
  if (isObj(v.range) && ['project', 'scope', 'space', 'all'].includes(v.range.kind as string)) {
    const kind = v.range.kind as SheetRange['kind'];
    if (kind === 'all') out.range = { kind };
    else if (typeof v.range.id === 'string' && v.range.id) out.range = { kind, id: v.range.id };
  }
  if (v.check === true) out.check = true;
  const sources = parseSourceLinks(v.sources);
  if (sources) out.sources = sources;
  return out;
}

/** WIP-Limit einer Kanban-Spalte (ganze Zahl ab 1). */
export const parseWip = (v: unknown): number | undefined => (isNum(v) && v >= 1 ? Math.floor(v) : undefined);

// ---------------------------------------------------------------- Projekte

/** Projekte prüfen: doppelte Ids fallen weg, unbekannte Scopes und Eltern werden gelöst, Kreise aufgebrochen. */
export function parseProjects(v: unknown, scopeIds: ReadonlySet<string>): Project[] {
  if (!Array.isArray(v)) return [];
  const now = Date.now();
  const out: Project[] = [];
  for (const r of v) {
    if (!isObj(r) || typeof r.id !== 'string' || !r.id || out.some((p) => p.id === r.id)) continue;
    const p: Project = {
      id: r.id,
      name: text(r.name) ?? 'Projekt',
      created: isNum(r.created) ? r.created : now,
      changed: isNum(r.changed) ? r.changed : isNum(r.created) ? r.created : now,
    };
    if (typeof r.scope === 'string' && scopeIds.has(r.scope)) p.scope = r.scope;
    if (typeof r.parent === 'string' && r.parent !== p.id) p.parent = r.parent;
    if (isObj(r.psp)) {
      const psp = {
        ...(text(r.psp.prefix) ? { prefix: r.psp.prefix as string } : {}),
        ...(['num', 'alpha', 'mixed'].includes(r.psp.style as string) ? { style: r.psp.style as 'num' | 'alpha' | 'mixed' } : {}),
      };
      if (Object.keys(psp).length) p.psp = psp;
    }
    if (isObj(r.brief)) {
      const brief = {
        ...(text(r.brief.goal) ? { goal: r.brief.goal as string } : {}),
        ...(text(r.brief.approach) ? { approach: r.brief.approach as string } : {}),
        ...(text(r.brief.org) ? { org: r.brief.org as string } : {}),
      };
      if (Object.keys(brief).length) p.brief = brief;
    }
    // F-225 (V105): Instanzen und Formular für Projektmeldungen
    if (Array.isArray(r.roles)) {
      const roles = r.roles
        .filter((x): x is Record<string, unknown> => isObj(x) && typeof x.id === 'string' && !!x.id && !!text(x.name))
        .slice(0, 12)
        .map((x) => ({ id: x.id as string, name: (x.name as string).slice(0, 60), ...(typeof x.person === 'string' && x.person ? { person: x.person } : {}), ...parseRoleAkv(x) }))
        .filter((x, i, a) => a.findIndex((y) => y.id === x.id) === i);
      if (roles.length) p.roles = roles;
    }
    const form = parseFeedbackForm(r.feedbackForm);
    if (form) p.feedbackForm = form;
    if (isDay(r.start)) p.start = r.start;
    if (isDay(r.end)) p.end = r.end;
    if (isNum(r.budget) && r.budget >= 0) p.budget = r.budget;
    if (isNum(r.priority) && r.priority >= 1 && r.priority <= 5) p.priority = Math.round(r.priority);
    if (PROJECT_STATES.includes(r.state as NonNullable<Project['state']>)) p.state = r.state as Project['state'];
    if (isNum(r.points) && r.points > 0) p.points = r.points;
    if (isNum(r.taskLimit) && r.taskLimit >= 1) p.taskLimit = Math.min(99, Math.floor(r.taskLimit));
    if (typeof r.accent === 'string' && /^#[0-9a-f]{6}$/i.test(r.accent)) p.accent = r.accent.toLowerCase();
    const sources = parseSourceLinks(r.sources);
    if (sources) p.sources = sources;
    const baseline = parseBaseline(r.baseline);
    if (baseline) p.baseline = baseline;
    const order = parseOrder(r.order);
    if (order) p.order = order;
    // F-226 (V109): Steckbrief-Felder, Ziele, Konflikte, Stakeholder, Phasen
    Object.assign(p, parseProjectGpm(r));
    const forms = parseProjectForms(r.forms);
    if (forms) p.forms = forms;
    // V118 (F-230): eigener Kalender (auch leer) und mitgeführte Fremddaten
    if (r.calendar && typeof r.calendar === 'object') p.calendar = parseCalendar(r.calendar) ?? {};
    const foreign = parseForeign(r.foreign);
    if (foreign) p.foreign = foreign;
    out.push(p);
  }
  const byId = new Map(out.map((p) => [p.id, p]));
  for (const p of out) if (p.parent && !byId.has(p.parent)) delete p.parent;
  // Kreise (nur durch kaputte Daten): am Kreis lösen
  for (const p of out) {
    const path = new Set([p.id]);
    let cur = p;
    while (cur.parent) {
      if (path.has(cur.parent)) {
        delete cur.parent;
        break;
      }
      path.add(cur.parent);
      cur = byId.get(cur.parent)!;
    }
  }
  return out;
}

/** V100 (K5): Soll eines Vorgangs; leer = undefined. */
function parseBaselineTask(v: unknown): BaselineTask | undefined {
  if (!isObj(v)) return undefined;
  const t: BaselineTask = {};
  if (isDay(v.start)) t.start = v.start;
  if (isDay(v.end)) t.end = v.end;
  if (isNum(v.duration) && v.duration >= 0) t.duration = Math.min(DURATION_MAX, Math.round(v.duration));
  if (isNum(v.effort) && v.effort >= 0) t.effort = v.effort;
  if (isNum(v.cost) && v.cost >= 0) t.cost = v.cost;
  return Object.keys(t).length ? t : undefined;
}

/** V100 (K4/K5, Dateiformat 10): Basisplan am Projekt – ohne gültigen Zeitpunkt fällt er weg. */
export function parseBaseline(v: unknown): ProjectBaseline | undefined {
  if (!isObj(v) || !isTime(v.at)) return undefined;
  const tasks: Record<string, BaselineTask> = {};
  if (isObj(v.tasks))
    for (const [id, t] of Object.entries(v.tasks)) {
      const x = parseBaselineTask(t);
      if (id && x) tasks[id] = x;
    }
  return {
    at: v.at,
    ...(isDay(v.start) ? { start: v.start } : {}),
    ...(isDay(v.end) ? { end: v.end } : {}),
    ...(isNum(v.budget) && v.budget >= 0 ? { budget: v.budget } : {}),
    tasks,
  };
}

/** V100 (K6, Dateiformat 10): PSP-Ordnung – je Ebene Ids ohne Doppelte; leere Ebenen fallen weg. */
export function parseOrder(v: unknown): Record<string, string[]> | undefined {
  if (!isObj(v)) return undefined;
  const out: Record<string, string[]> = {};
  for (const [k, ids] of Object.entries(v)) {
    if (!Array.isArray(ids)) continue;
    const list = [...new Set(ids.filter((x): x is string => typeof x === 'string' && !!x && x !== k))];
    if (list.length) out[k] = list;
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * V100 (K6): PSP-Ordnung auf Bekanntes beschränken – Ebenen nur für bekannte Eltern-Notizen, Einträge nur
 * bekannte Notizen bzw. Projekte; jede Id nur auf einer Ebene (erste gewinnt). Der Basisplan bleibt
 * unverändert (gelöschte Vorgänge zeigt der Bericht als „entfallen“).
 */
export function cleanProjectRefs(projects: Project[], noteIds: ReadonlySet<string>): Project[] {
  const projectIds = new Set(projects.map((p) => p.id));
  return projects.map((p) => {
    if (!p.order) return p;
    const seen = new Set<string>();
    const order: Record<string, string[]> = {};
    for (const [k, ids] of Object.entries(p.order)) {
      if (k !== '' && !noteIds.has(k)) continue;
      const list = ids.filter((id) => !seen.has(id) && (noteIds.has(id) || (k === '' && projectIds.has(id) && id !== p.id)));
      list.forEach((id) => seen.add(id));
      if (list.length) order[k] = list;
    }
    const out: Project = { ...p };
    if (Object.keys(order).length) out.order = order;
    else delete out.order;
    return out;
  });
}

// ---------------------------------------------------------------- Personen

/** Personen prüfen: doppelte Ids fallen weg, Mitglieder und Vertretungen nur auf bekannte Personen, höchstens ein „ich“. */
export function parsePersons(v: unknown): Person[] {
  if (!Array.isArray(v)) return [];
  const out: Person[] = [];
  for (const r of v) {
    if (!isObj(r) || typeof r.id !== 'string' || !r.id || !text(r.name) || out.some((p) => p.id === r.id)) continue;
    const p: Person = { id: r.id, name: (r.name as string).trim(), kind: PERSON_KINDS.includes(r.kind as Person['kind']) ? (r.kind as Person['kind']) : 'person' };
    if (Array.isArray(r.members)) p.members = r.members.filter((m): m is string => typeof m === 'string');
    if (isNum(r.capacity) && r.capacity >= 0) p.capacity = r.capacity;
    if (isObj(r.limit)) {
      const limit = {
        ...(isNum(r.limit.total) && r.limit.total >= 1 ? { total: Math.floor(r.limit.total) } : {}),
        ...(isNum(r.limit.perProject) && r.limit.perProject >= 1 ? { perProject: Math.floor(r.limit.perProject) } : {}),
      };
      if (Object.keys(limit).length) p.limit = limit;
    }
    if (Array.isArray(r.rights)) {
      const rights = RIGHTS.filter((x) => (r.rights as unknown[]).includes(x));
      // V95: „ich“ ohne Befugnisse = [] (leer hieße sonst „alle“)
      if (rights.length || r.me === true) p.rights = rights;
    }
    if (Array.isArray(r.stand)) {
      p.stand = r.stand
        .filter((s): s is Record<string, unknown> => isObj(s) && typeof s.by === 'string' && !!s.by)
        .map((s) => ({ by: s.by as string, ...(isDay(s.from) ? { from: s.from } : {}), ...(isDay(s.to) ? { to: s.to } : {}) }));
    }
    if (r.me === true && !out.some((x) => x.me)) p.me = true;
    if (isNum(r.color) && Number.isInteger(r.color) && r.color >= 0 && r.color < 8) p.color = r.color;
    if (Array.isArray(r.away)) {
      const away = r.away
        .filter((a): a is Record<string, unknown> => isObj(a) && isDay(a.from) && isDay(a.to) && (a.from as string) <= (a.to as string))
        .map((a) => ({ from: a.from as string, to: a.to as string, ...(text(a.why) ? { why: (a.why as string).trim() } : {}) }));
      if (away.length) p.away = away;
    }
    if (text(r.account)) p.account = r.account as string;
    Object.assign(p, parsePersonGpm(r));
    const foreign = parseForeign(r.foreign);
    if (foreign) p.foreign = foreign;
    out.push(p);
  }
  const ids = new Set(out.map((p) => p.id));
  for (const p of out) {
    if (p.members) {
      p.members = [...new Set(p.members)].filter((m) => m !== p.id && ids.has(m));
      if (!p.members.length) delete p.members;
    }
    if (p.stand) {
      p.stand = p.stand.filter((s) => s.by !== p.id && ids.has(s.by));
      if (!p.stand.length) delete p.stand;
    }
  }
  return out;
}

/** Feste Id für eine Person aus einem Namen – gleicher Name auf jedem Gerät = dieselbe Person. */
export function personIdFor(name: string): string {
  let h = 0;
  for (const ch of name.trim().toLowerCase()) h = (Math.imul(h, 31) + ch.codePointAt(0)!) >>> 0;
  return `pn-${h.toString(36)}`;
}

/**
 * Umstieg v7 → v8: „delegiert an“ mit freiem Namen bekommt eine Person (gleicher Name = dieselbe
 * Person, Groß-/Kleinschreibung egal); der Name bleibt zur Anzeige stehen. Läuft bei jedem Laden,
 * ändert aber nur Notes ohne Person.
 */
export function personsFromDelegated(notes: Note[], persons: Person[]): { notes: Note[]; persons: Person[] } {
  const byName = new Map(persons.map((p) => [p.name.trim().toLowerCase(), p.id]));
  const ids = new Set(persons.map((p) => p.id));
  const added: Person[] = [];
  const out = notes.map((n) => {
    const d = n.delegated;
    if (!d) return n;
    if (d.person && ids.has(d.person)) return n;
    const name = d.to.trim();
    if (!name) return n;
    let id = byName.get(name.toLowerCase());
    if (!id) {
      id = personIdFor(name);
      while (ids.has(id)) id = `${id}x`;
      byName.set(name.toLowerCase(), id);
      ids.add(id);
      added.push({ id, name, kind: 'person' });
    }
    return { ...n, delegated: { ...d, person: id } };
  });
  return { notes: out, persons: added.length ? [...persons, ...added] : persons };
}

/** Bezüge der Notes auf Projekte und Personen auf Bekanntes beschränken. */
export function cleanRefs(notes: Note[], projectIds: ReadonlySet<string>, personIds: ReadonlySet<string>): Note[] {
  return notes.map((n) => {
    if ((!n.project || projectIds.has(n.project)) && (!n.assignee || personIds.has(n.assignee)) && (!n.delegated?.person || personIds.has(n.delegated.person))) return n;
    const out: Note = { ...n };
    if (out.project && !projectIds.has(out.project)) delete out.project;
    if (out.assignee && !personIds.has(out.assignee)) delete out.assignee;
    if (out.delegated?.person && !personIds.has(out.delegated.person)) {
      const { person: _p, ...rest } = out.delegated;
      out.delegated = rest;
    }
    return out;
  });
}

// ---------------------------------------------------------------- Pads

/** Pads prüfen: nur bekannte Desks und Sheets, jedes Sheet höchstens in einem Pad, bis 9 je Pad; leere Pads fallen weg. */
export function parsePads(v: unknown, sheetIds: ReadonlySet<string>, deskIds: ReadonlySet<string>): Pad[] {
  if (!Array.isArray(v)) return [];
  const used = new Set<string>();
  const out: Pad[] = [];
  for (const r of v) {
    if (!isObj(r) || typeof r.id !== 'string' || !r.id || out.some((p) => p.id === r.id)) continue;
    const desk = typeof r.desk === 'string' && (r.desk === '' || deskIds.has(r.desk)) ? r.desk : '';
    const sheets = (Array.isArray(r.sheets) ? r.sheets : [])
      .filter((s): s is string => typeof s === 'string' && sheetIds.has(s) && !used.has(s))
      .slice(0, PAD_SHEETS_MAX);
    if (!sheets.length) continue;
    for (const s of sheets) used.add(s);
    out.push({
      id: r.id,
      desk,
      sheets,
      active: typeof r.active === 'string' && sheets.includes(r.active) ? r.active : sheets[0],
      ...(r.docked === true ? { docked: true } : {}),
      ...(r.notes === true && r.docked !== true ? { notes: true as const } : {}),
      ...(typeof r.from === 'string' && r.from ? { from: r.from } : {}),
      ...(Array.isArray(r.recent) && r.recent.length
        ? { recent: r.recent.filter((x): x is string => typeof x === 'string' && /^[ns]:./.test(x)).slice(0, 5) }
        : {}),
    });
  }
  return out;
}

/** Pad-Plätze und Dock je Desk (geräteeigen): nur bekannte Desks und Pads, Anteile 0…1. */
export function parsePadDesks(v: unknown, padIds: ReadonlySet<string>, deskIds: ReadonlySet<string>): Record<string, PadDesk> | undefined {
  if (!isObj(v)) return undefined;
  const out: Record<string, PadDesk> = {};
  for (const [desk, d] of Object.entries(v)) {
    if (!(desk === '' || deskIds.has(desk)) || !isObj(d)) continue;
    const places: Record<string, PadPlace> = {};
    if (isObj(d.places)) {
      for (const [id, p] of Object.entries(d.places)) {
        if (padIds.has(id) && isObj(p) && share(p.x) && share(p.y) && share(p.w) && share(p.h) && p.w > 0 && p.h > 0) places[id] = { x: p.x, y: p.y, w: p.w, h: p.h };
      }
    }
    const pd: PadDesk = { places };
    if (isObj(d.dock) && EDGES.includes(d.dock.edge as NonNullable<PadDesk['dock']>['edge']) && share(d.dock.at))
      pd.dock = {
        edge: d.dock.edge as NonNullable<PadDesk['dock']>['edge'],
        at: d.dock.at,
        ...(typeof d.dock.w === 'number' && Number.isFinite(d.dock.w) && d.dock.w > 0 ? { w: Math.round(d.dock.w) } : {}),
        ...(d.dock.folded === false ? { folded: false } : {}),
      };
    if (d.dockOff === true) pd.dockOff = true;
    // V90 (F1): Baum der Pads im Notizen-Modus – nur bekannte Pads, jedes einmal
    if (isNode(d.notes)) {
      const ids = leaves(d.notes);
      if (ids.length === new Set(ids).size) {
        let t: Node | null = d.notes;
        for (const id of ids) if (t && !padIds.has(id)) t = removeLeaf(t, id);
        if (t) pd.notes = t;
      }
    }
    if (Object.keys(places).length || pd.dock || pd.dockOff || pd.notes) out[desk] = pd;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Gewählte Darstellungen des Projektfokus (Reihenfolge wie FOCUS_VIEWS). */
export function parseFocusViews(v: unknown): FocusView[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = FOCUS_VIEWS.filter((x) => v.includes(x));
  return out.length ? out : undefined;
}
