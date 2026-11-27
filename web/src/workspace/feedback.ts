/**
 * F-221 (V102, Entscheidungs-Doc V101 FB1–FB12): Feedback – Fehler melden, Wünsche hinterlassen, Fragen
 * stellen, Lob. Eigenes Objekt `Workspace.feedback` (FB11, Dateiformat 11), Bedienung wie Kanban/Notiz.
 * Problemstellung nach Enricos Vorlage in zwei Stufen (FB3): Schnell erfassen (Titel + Art, Ort und
 * Umgebung automatisch) und Ausarbeiten (Felder freiwillig, „noch offen: …“). Zustand Neu · Gesichtet ·
 * Geplant · Erledigt · Verworfen (FB8), Vermerke und Spur (FB9), Ausgabe Markdown + JSON (FB10).
 * Reine Funktionen, Tests in workspace.test.ts („F-221 Feedback“).
 */
import type {
  Feedback,
  FeedbackEnv,
  FeedbackFieldDef,
  FeedbackFieldType,
  FeedbackFormRaw,
  FeedbackKind,
  FeedbackMark,
  FeedbackPlace,
  FeedbackSeverity,
  FeedbackState,
  Workspace,
} from './types';

/** App-Stand für die Meldung (FB6) – bei jedem Chat mitzählen. */
export const APP_VERSION = 'V128';
export const FEEDBACK_MAX = 2000;
export const TITLE_MAX = 200;
export const TEXT_MAX = 8000;
export const MARKS_MAX = 200;
export const PICS_MAX = 6;

export type FeedbackStateName = FeedbackState;
export const FEEDBACK_KINDS: readonly FeedbackKind[] = ['bug', 'wish', 'question', 'praise'];
/** Reihenfolge wie die Spalten des Boards. */
export const FEEDBACK_STATES: readonly FeedbackState[] = ['new', 'seen', 'planned', 'done', 'dropped'];
export const FEEDBACK_SEVERITIES: readonly FeedbackSeverity[] = ['minor', 'hinders', 'blocks'];

/** Textfelder der Stufe „Ausarbeiten“ in der Reihenfolge der Problemstellung. */
export const FEEDBACK_TEXTS = [
  'what', 'steps', 'expected', 'actual', 'affected', 'workaround', 'goals', 'nonGoals', 'impact', 'guess', 'open', 'decision',
] as const;
export type FeedbackText = (typeof FEEDBACK_TEXTS)[number];

/** Welche Felder je Art „noch offen“ zählen (FB3). Lob braucht nichts weiter. */
export const WANTED: Record<FeedbackKind, readonly (FeedbackText | 'severity')[]> = {
  bug: ['what', 'steps', 'expected', 'actual', 'severity'],
  wish: ['what', 'goals', 'affected'],
  question: ['what'],
  praise: [],
};

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isIso = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v));
const clean = (s: string, max: number) => s.replace(/\s+/g, ' ').trim().slice(0, max);
const cleanText = (s: string) => s.replace(/\r\n?/g, '\n').trim().slice(0, TEXT_MAX);
const fold = (s: string) => s.toLocaleLowerCase('de').normalize('NFD').replace(/[̀-ͯ]/g, '');

export const feedbackOf = (ws: Workspace): Feedback[] => ws.feedback ?? [];
export const feedbackById = (ws: Workspace, id: string | undefined): Feedback | undefined =>
  id ? feedbackOf(ws).find((f) => f.id === id) : undefined;

function withFeedback(ws: Workspace, list: Feedback[]): Workspace {
  if (list.length) return { ...ws, feedback: list };
  const { feedback: _f, ...rest } = ws; // eslint-disable-line @typescript-eslint/no-unused-vars
  return rest;
}

function put(ws: Workspace, f: Feedback): Workspace {
  return withFeedback(ws, feedbackOf(ws).map((x) => (x.id === f.id ? f : x)));
}

function mark(f: Feedback, m: FeedbackMark): Feedback {
  const marks = [...(f.marks ?? []), m];
  return { ...f, marks: marks.slice(-MARKS_MAX) };
}

/** Bezug Lastenheft „F-206“, „f 221“, „NF-08“ → „F-206“, „F-221“, „NF-08“; Unsinn = null. */
export function parseRef(s: string): string | null {
  const m = /^\s*(NF|F)\s*-?\s*(\d{1,4})\s*$/i.exec(s);
  return m ? `${m[1].toUpperCase()}-${m[2].padStart(2, '0')}` : null;
}

/** Bezüge aus freier Eingabe „F-206, F-221; NF-08“ – doppelte und Unsinn fallen weg. */
export function parseRefs(s: string): { refs: string[]; bad: string[] } {
  const refs: string[] = [];
  const bad: string[] = [];
  for (const part of s.split(/[,;\s]+(?=[A-Za-z])|[,;]/).map((x) => x.trim()).filter(Boolean)) {
    const r = parseRef(part);
    if (!r) bad.push(part);
    else if (!refs.includes(r)) refs.push(r);
  }
  return { refs, bad };
}

/** FB6: Umgebung aus Browserkennung und Maßen (rein, für den Test). */
export function envOf(o: { ua: string; touch?: boolean; screen?: { w: number; h: number }; win?: { w: number; h: number }; device?: string }): FeedbackEnv {
  const size = (s?: { w: number; h: number }) => (s && s.w > 0 && s.h > 0 ? `${Math.round(s.w)} × ${Math.round(s.h)}` : undefined);
  const env: FeedbackEnv = { version: APP_VERSION };
  if (o.device) env.device = o.device;
  const b = browserOf(o.ua);
  if (b) env.browser = b;
  const sc = size(o.screen);
  if (sc) env.screen = sc;
  const wi = size(o.win);
  if (wi) env.window = wi;
  return env;
}

/** Browser mit Hauptversion aus der Kennung, z. B. „Safari 18“, „Chrome 131“. */
export function browserOf(ua: string): string | undefined {
  const tests: [RegExp, string][] = [
    [/Edg\/(\d+)/, 'Edge'],
    [/OPR\/(\d+)/, 'Opera'],
    [/Firefox\/(\d+)/, 'Firefox'],
    [/CriOS\/(\d+)/, 'Chrome'],
    [/Chrome\/(\d+)/, 'Chrome'],
    [/Version\/(\d+)[.\d]* .*Safari/, 'Safari'],
  ];
  for (const [re, name] of tests) {
    const m = re.exec(ua);
    if (m) return `${name} ${m[1]}`;
  }
  return undefined;
}

function cleanPlace(p: FeedbackPlace | undefined): FeedbackPlace | undefined {
  if (!p) return undefined;
  const out: FeedbackPlace = {};
  for (const k of ['view', 'mode', 'menu'] as const) {
    const v = p[k];
    if (typeof v === 'string' && v.trim()) out[k] = clean(v, 120);
  }
  if (typeof p.desk === 'string') out.desk = clean(p.desk, 120);
  return Object.keys(out).length ? out : undefined;
}

export type NewFeedback = { kind: FeedbackKind; title: string; place?: FeedbackPlace; env?: FeedbackEnv; project?: string; to?: string } & Partial<Pick<Feedback, FeedbackText | 'severity' | 'refs'>>;

/** Stufe 1 „Schnell erfassen“ (FB3): Titel + Art, Ort und Umgebung kommen mit. Leerer Titel = null. */
export function addFeedback(ws: Workspace, v: NewFeedback, opts: { id: string; now?: Date }): { ws: Workspace; id: string } | null {
  const title = clean(v.title ?? '', TITLE_MAX);
  if (!title || !FEEDBACK_KINDS.includes(v.kind) || feedbackOf(ws).length >= FEEDBACK_MAX) return null;
  if (feedbackById(ws, opts.id)) return null;
  const at = (opts.now ?? new Date()).toISOString();
  let f: Feedback = { id: opts.id, kind: v.kind, title, state: 'new', at };
  const place = cleanPlace(v.place);
  if (place) f.place = place;
  if (v.env && Object.keys(v.env).length) f.env = { ...v.env };
  // F-225 (P2/P3): Projektmeldung an eine Instanz
  if (typeof v.project === 'string' && v.project) {
    f.project = v.project;
    if (typeof v.to === 'string' && v.to) f.to = v.to;
  }
  const { kind: _k, title: _t, place: _p, env: _e, project: _pr, to: _to, ...rest } = v; // eslint-disable-line @typescript-eslint/no-unused-vars
  f = applyPatch(f, rest);
  return { ws: withFeedback(ws, [...feedbackOf(ws), f]), id: f.id };
}

export type FeedbackPatch = Partial<Pick<Feedback, FeedbackText | 'title' | 'kind' | 'severity' | 'refs' | 'related' | 'pics' | 'fixedIn'>> & { ease?: number | null; extra?: Record<string, string | number | boolean | null> };

function applyPatch(f: Feedback, patch: FeedbackPatch): Feedback {
  const out: Feedback = { ...f };
  for (const k of FEEDBACK_TEXTS) {
    if (!(k in patch)) continue;
    const v = patch[k];
    const t = typeof v === 'string' ? cleanText(v) : '';
    if (t) out[k] = t;
    else delete out[k];
  }
  if (typeof patch.title === 'string') {
    const t = clean(patch.title, TITLE_MAX);
    if (t) out.title = t;
  }
  if (patch.kind && FEEDBACK_KINDS.includes(patch.kind)) out.kind = patch.kind;
  if ('severity' in patch) {
    if (patch.severity && FEEDBACK_SEVERITIES.includes(patch.severity)) out.severity = patch.severity;
    else delete out.severity;
  }
  if ('refs' in patch) {
    const refs = [...new Set((patch.refs ?? []).map((r) => parseRef(r)).filter((r): r is string => !!r))];
    if (refs.length) out.refs = refs;
    else delete out.refs;
  }
  if ('related' in patch) {
    const rel = [...new Set((patch.related ?? []).filter((r) => typeof r === 'string' && r && r !== f.id))];
    if (rel.length) out.related = rel;
    else delete out.related;
  }
  if ('pics' in patch) {
    const pics = [...new Set((patch.pics ?? []).filter((p) => typeof p === 'string' && p))].slice(0, PICS_MAX);
    if (pics.length) out.pics = pics;
    else delete out.pics;
  }
  if ('fixedIn' in patch) {
    const m = /^\s*V?(\d{1,4})\s*$/i.exec(patch.fixedIn ?? '');
    if (m) out.fixedIn = `V${m[1]}`;
    else delete out.fixedIn;
  }
  // F-225 (V106): eigene Felder – null bzw. leer entfernt den Wert
  if (patch.extra) {
    const ex: Record<string, string | number | boolean> = { ...(f.extra ?? {}) };
    for (const [k, v] of Object.entries(patch.extra)) {
      if (!/^[a-zA-Z0-9_-]{1,40}$/.test(k)) continue;
      const c = extraValue(v);
      if (c === undefined) delete ex[k];
      else ex[k] = c;
    }
    if (Object.keys(ex).length) out.extra = ex;
    else delete out.extra;
  }
  if ('ease' in patch) {
    const e = patch.ease;
    if (typeof e === 'number' && Number.isInteger(e) && e >= 1 && e <= 5) out.ease = e as Feedback['ease'];
    else delete out.ease;
  }
  return out;
}

/** Stufe 2 „Ausarbeiten“: Felder ändern; leere Felder fallen weg. Unbekannte Id = unverändert. */
export function editFeedback(ws: Workspace, id: string, patch: FeedbackPatch, now = new Date()): Workspace {
  const f = feedbackById(ws, id);
  if (!f) return ws;
  const next = applyPatch(f, patch);
  if (JSON.stringify(next) === JSON.stringify(f)) return ws;
  let out: Feedback = { ...next, changed: now.toISOString() };
  // FB9: „behoben in Vxx“ als Vermerk in der Spur
  if (next.fixedIn && next.fixedIn !== f.fixedIn) out = mark(out, { at: now.toISOString(), kind: 'fixed', text: next.fixedIn });
  return put(ws, out);
}

/** FB8/FB9: Zustand wechseln – mit Spur; optional Begründung (z. B. bei Verworfen). */
export function setFeedbackState(ws: Workspace, id: string, state: FeedbackState, opts: { now?: Date; why?: string; by?: string } = {}): Workspace {
  const f = feedbackById(ws, id);
  if (!f || f.state === state || !FEEDBACK_STATES.includes(state)) return ws;
  const at = (opts.now ?? new Date()).toISOString();
  const why = opts.why ? clean(opts.why, 500) : '';
  const text = `${f.state} → ${state}${why ? `: ${why}` : ''}`;
  return put(ws, mark({ ...f, state, changed: at }, { at, kind: 'state', text, ...(opts.by ? { by: opts.by } : {}) }));
}

/**
 * F-225 (V106, P9): Projektmeldung an eine andere Instanz weitergeben (Eskalation nach ICB4) – mit Spur
 * „Projektleitung → Lenkungskreis“. Nur Projektmeldungen; gleiche Instanz = unverändert.
 */
export function forwardFeedback(ws: Workspace, id: string, to: string, names: { from: string; to: string }, opts: { now?: Date; by?: string } = {}): Workspace {
  const f = feedbackById(ws, id);
  if (!f || !f.project || !to || f.to === to) return ws;
  const at = (opts.now ?? new Date()).toISOString();
  const text = `${clean(names.from, 60)} → ${clean(names.to, 60)}`;
  return put(ws, mark({ ...f, to, changed: at }, { at, kind: 'to', text, ...(opts.by ? { by: opts.by } : {}) }));
}

/** FB9: Vermerk anhängen (Notiz, Entscheidung, Bezug). Entscheidung setzt zusätzlich `decision`. */
export function addMark(ws: Workspace, id: string, kind: 'note' | 'decision' | 'ref', text: string, opts: { now?: Date; by?: string } = {}): Workspace {
  const f = feedbackById(ws, id);
  const t = cleanText(text);
  if (!f || !t) return ws;
  const at = (opts.now ?? new Date()).toISOString();
  let out = mark({ ...f, changed: at }, { at, kind, text: t, ...(opts.by ? { by: opts.by } : {}) });
  if (kind === 'decision') out = { ...out, decision: t };
  if (kind === 'ref') {
    const { refs } = parseRefs(t);
    if (refs.length) out = { ...out, refs: [...new Set([...(out.refs ?? []), ...refs])] };
  }
  return put(ws, out);
}

/**
 * F-225 P8 (V107, R7): Meldung wurde zu Risiko bzw. Änderungsantrag – merkt die Notiz und schreibt einen
 * Vermerk „Wurde zu Risiko CG-R-3“ in die Spur (Bezug, ohne Lastenheft-Nummern auszulesen).
 */
export function setBecame(ws: Workspace, id: string, became: NonNullable<Feedback['became']>, text: string, opts: { now?: Date; by?: string } = {}): Workspace {
  const f = feedbackById(ws, id);
  if (!f) return ws;
  const at = (opts.now ?? new Date()).toISOString();
  return put(ws, mark({ ...f, became, changed: at }, { at, kind: 'ref', text: clean(text, 200), ...(opts.by ? { by: opts.by } : {}) }));
}

/** R7: Rückgängig – Meldung so, wie sie vorher war. */
export const restoreFeedbackItem = (ws: Workspace, f: Feedback): Workspace => (feedbackById(ws, f.id) ? put(ws, f) : ws);

export type FeedbackUndo = { item: Feedback; index: number; related: { id: string; related?: string[] }[] };

/** Löschen mit Rückgängig; Bezüge „ähnlich“ anderer Meldungen auf diese fallen weg. */
export function removeFeedback(ws: Workspace, id: string): { ws: Workspace; undo: FeedbackUndo } | null {
  const list = feedbackOf(ws);
  const index = list.findIndex((f) => f.id === id);
  if (index < 0) return null;
  const related = list.filter((f) => f.related?.includes(id)).map((f) => ({ id: f.id, related: f.related }));
  const rest = list
    .filter((f) => f.id !== id)
    .map((f) => {
      if (!f.related?.includes(id)) return f;
      const r = f.related.filter((x) => x !== id);
      const { related: _r, ...g } = f; // eslint-disable-line @typescript-eslint/no-unused-vars
      return r.length ? { ...g, related: r } : g;
    });
  return { ws: withFeedback(ws, rest), undo: { item: list[index], index, related } };
}

export function undoRemoveFeedback(ws: Workspace, u: FeedbackUndo): Workspace {
  if (feedbackById(ws, u.item.id)) return ws;
  const list = [...feedbackOf(ws)];
  list.splice(Math.min(u.index, list.length), 0, u.item);
  const back = new Map(u.related.map((r) => [r.id, r.related]));
  return withFeedback(ws, list.map((f) => (back.has(f.id) ? { ...f, ...(back.get(f.id) ? { related: back.get(f.id) } : {}) } : f)));
}

/** FB3: noch offene Felder je Art (für „noch offen: …“ und den Hinweis an der Karte). */
export function missingOf(f: Feedback, form?: FeedbackForm): (FeedbackText | 'severity')[] {
  // F-225 (P4): im Projekt zählen zusätzlich die Pflichtfelder, ausgeschaltete Felder nie
  const want = [...new Set([...(form?.required ?? []), ...WANTED[f.kind]])].filter((k) => !form?.off?.includes(k as FeedbackText));
  return want.filter((k) => (k === 'severity' ? !f.severity : !f[k as FeedbackText]));
}

/** F-225 (V105, P4): Formular eines Projekts – Felder aus, Pflichtfelder (nur bekannte Felder). */
export interface FeedbackForm {
  off: FeedbackText[];
  required: (FeedbackText | 'severity')[];
}
const FORM_KEYS: readonly (FeedbackText | 'severity')[] = [...FEEDBACK_TEXTS, 'severity'];
export function formOf(raw: FeedbackFormRaw | undefined): FeedbackForm {
  const off = FEEDBACK_TEXTS.filter((k) => raw?.off?.includes(k) && k !== 'what');
  const required = FORM_KEYS.filter((k) => raw?.required?.includes(k) && !off.includes(k as FeedbackText));
  return { off, required };
}
/** F-225 (P4): Feld an/aus bzw. Pflicht umschalten – „Was ist passiert“ bleibt immer an. */
export function toggleForm(raw: FeedbackFormRaw | undefined, key: FeedbackText | 'severity', what: 'off' | 'required'): FeedbackFormRaw | undefined {
  const f = formOf(raw);
  if (what === 'off') {
    if (key === 'severity' || key === 'what') return raw;
    f.off = f.off.includes(key) ? f.off.filter((k) => k !== key) : [...f.off, key];
    f.required = f.required.filter((k) => !f.off.includes(k as FeedbackText));
  } else {
    f.required = f.required.includes(key) ? f.required.filter((k) => k !== key) : [...f.required, key];
  }
  return packForm({ ...raw, off: f.off, required: f.required });
}

// ---- F-225 Rest (V106, P4): eigene Felder und Arten umbenennen ----

export const CUSTOM_TYPES: readonly FeedbackFieldType[] = ['text', 'number', 'date', 'choice', 'bool'];
export const CUSTOM_MAX = 12;
export const OPTIONS_MAX = 12;
export const CUSTOM_NAME_MAX = 60;

/** Leere Teile weglassen – ganz leer = kein Formular (undefined). */
function packForm(f: FeedbackFormRaw): FeedbackFormRaw | undefined {
  const out: FeedbackFormRaw = {
    ...(f.off?.length ? { off: [...f.off] } : {}),
    ...(f.required?.length ? { required: [...f.required] } : {}),
    ...(f.custom?.length ? { custom: f.custom } : {}),
    ...(f.kinds && Object.keys(f.kinds).length ? { kinds: f.kinds } : {}),
  };
  return Object.keys(out).length ? out : undefined;
}

/** Wert eines eigenen Felds säubern: Text gekürzt, Zahl endlich, Ja/Nein; leer = undefined. */
function extraValue(v: unknown): string | number | boolean | undefined {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (typeof v === 'string') {
    const t = cleanText(v).slice(0, 2000);
    return t || undefined;
  }
  return undefined;
}

const cleanName = (v: unknown, max = CUSTOM_NAME_MAX): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

function cleanOptions(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    const n = cleanName(x);
    if (n && !out.some((o) => o.toLowerCase() === n.toLowerCase())) out.push(n);
  }
  return out.slice(0, OPTIONS_MAX);
}

/** Eigene Felder des Formulars (Reihenfolge wie angelegt). */
export const customOf = (raw: FeedbackFormRaw | undefined): FeedbackFieldDef[] => raw?.custom ?? [];

/** Eigenes Feld anlegen; Auswahl ohne Möglichkeiten bekommt „Ja“/„Nein“ nicht – sie braucht mind. 2. */
export function addCustom(raw: FeedbackFormRaw | undefined, def: { name: string; type: FeedbackFieldType; options?: string[] }, id: string): { form: FeedbackFormRaw | undefined; error?: 'name' | 'full' | 'options' | 'twice' } {
  const list = customOf(raw);
  const name = cleanName(def.name);
  if (!name) return { form: raw, error: 'name' };
  if (list.length >= CUSTOM_MAX) return { form: raw, error: 'full' };
  if (list.some((c) => c.name.toLowerCase() === name.toLowerCase())) return { form: raw, error: 'twice' };
  const type = CUSTOM_TYPES.includes(def.type) ? def.type : 'text';
  const options = cleanOptions(def.options);
  if (type === 'choice' && options.length < 2) return { form: raw, error: 'options' };
  const field: FeedbackFieldDef = { id, name, type, ...(type === 'choice' ? { options } : {}) };
  return { form: packForm({ ...raw, custom: [...list, field] }) };
}

/** Eigenes Feld ändern (Name, Pflicht, Möglichkeiten); der Typ bleibt, damit vorhandene Werte stimmen. */
export function editCustom(raw: FeedbackFormRaw | undefined, id: string, patch: { name?: string; required?: boolean; options?: string[] }): FeedbackFormRaw | undefined {
  const list = customOf(raw);
  const i = list.findIndex((c) => c.id === id);
  if (i < 0) return raw;
  const c = { ...list[i] };
  if (patch.name !== undefined) {
    const n = cleanName(patch.name);
    if (n && !list.some((o) => o.id !== id && o.name.toLowerCase() === n.toLowerCase())) c.name = n;
  }
  if (patch.required !== undefined) {
    if (patch.required) c.required = true;
    else delete c.required;
  }
  if (patch.options !== undefined && c.type === 'choice') {
    const o = cleanOptions(patch.options);
    if (o.length >= 2) c.options = o;
  }
  const next = [...list];
  next[i] = c;
  return packForm({ ...raw, custom: next });
}

/** Eigenes Feld entfernen – gibt es zurück (für Rückgängig); Werte in den Meldungen bleiben liegen. */
export function removeCustom(raw: FeedbackFormRaw | undefined, id: string): { form: FeedbackFormRaw | undefined; removed?: { field: FeedbackFieldDef; index: number } } {
  const list = customOf(raw);
  const index = list.findIndex((c) => c.id === id);
  if (index < 0) return { form: raw };
  return { form: packForm({ ...raw, custom: list.filter((c) => c.id !== id) }), removed: { field: list[index], index } };
}
export function restoreCustom(raw: FeedbackFormRaw | undefined, r: { field: FeedbackFieldDef; index: number }): FeedbackFormRaw | undefined {
  const list = customOf(raw);
  if (list.some((c) => c.id === r.field.id) || list.length >= CUSTOM_MAX) return raw;
  const next = [...list];
  next.splice(Math.min(r.index, next.length), 0, r.field);
  return packForm({ ...raw, custom: next });
}
/** Eigenes Feld eine Stelle nach oben (-1) oder unten (+1). */
export function moveCustom(raw: FeedbackFormRaw | undefined, id: string, by: -1 | 1): FeedbackFormRaw | undefined {
  const list = [...customOf(raw)];
  const i = list.findIndex((c) => c.id === id);
  const j = i + by;
  if (i < 0 || j < 0 || j >= list.length) return raw;
  [list[i], list[j]] = [list[j], list[i]];
  return packForm({ ...raw, custom: list });
}

/** Wert eines eigenen Felds als Text (Karte, Datei). */
export function extraText(def: FeedbackFieldDef, v: string | number | boolean | undefined): string {
  if (v === undefined) return '';
  if (def.type === 'bool') return v === true ? FILE_LABELS.yes : FILE_LABELS.no;
  if (def.type === 'date' && typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return `${v.slice(8, 10)}.${v.slice(5, 7)}.${v.slice(0, 4)}`;
  return String(v);
}

/** Pflichtfelder unter den eigenen Feldern, die noch leer sind (für „noch offen: …“). */
export const missingCustom = (f: Feedback, raw: FeedbackFormRaw | undefined): FeedbackFieldDef[] =>
  customOf(raw).filter((c) => c.required && (f.extra?.[c.id] === undefined || (c.type === 'bool' ? false : f.extra?.[c.id] === '')));

/** Name einer Art im Projekt – umbenannt oder wie ab Werk. */
export const kindName = (raw: FeedbackFormRaw | undefined, k: FeedbackKind): string => raw?.kinds?.[k] || FILE_LABELS.kind[k];
/** Art im Projekt umbenennen; leer oder wie ab Werk = zurück auf Werk. */
export function renameKind(raw: FeedbackFormRaw | undefined, k: FeedbackKind, name: string): FeedbackFormRaw | undefined {
  const n = cleanName(name, 30);
  const kinds = { ...(raw?.kinds ?? {}) };
  if (!n || n === FILE_LABELS.kind[k]) delete kinds[k];
  else kinds[k] = n;
  return packForm({ ...raw, kinds });
}

/** F-225 Rest (V106, P6): Vorlagen fürs Formular – Standard (alles an), IPMA-Problemmeldung (ICB4), Kurz. */
export type FormTemplateId = 'standard' | 'ipma' | 'short';
export const FORM_TEMPLATES: readonly FormTemplateId[] = ['standard', 'ipma', 'short'];
const TEMPLATE_DEFS: Record<FormTemplateId, { off: FeedbackText[]; required: (FeedbackText | 'severity')[]; custom: Omit<FeedbackFieldDef, 'id'>[] }> = {
  standard: { off: [], required: [], custom: [] },
  ipma: {
    off: ['nonGoals'],
    required: ['what', 'affected', 'impact', 'severity'],
    custom: [
      { name: 'Vorgang / Arbeitspaket', type: 'text' },
      { name: 'Auswirkung auf', type: 'choice', options: ['Termin', 'Kosten', 'Leistung/Qualität', 'Umfang'], required: true },
      { name: 'Entscheidung nötig bis', type: 'date' },
    ],
  },
  short: { off: ['steps', 'expected', 'actual', 'workaround', 'goals', 'nonGoals', 'impact', 'guess', 'open', 'decision'], required: [], custom: [] },
};
/**
 * Vorlage übernehmen: Felder an/aus und Pflicht wie in der Vorlage, ihre eigenen Felder kommen dazu (gleichnamige
 * bleiben, wie sie sind); vorhandene eigene Felder und umbenannte Arten bleiben. `ids` liefert neue Ids.
 */
export function applyTemplate(raw: FeedbackFormRaw | undefined, t: FormTemplateId, ids: () => string): FeedbackFormRaw | undefined {
  const d = TEMPLATE_DEFS[t];
  const list = [...customOf(raw)];
  for (const c of d.custom) {
    if (list.length >= CUSTOM_MAX || list.some((x) => x.name.toLowerCase() === c.name.toLowerCase())) continue;
    list.push({ id: ids(), ...c, ...(c.options ? { options: [...c.options] } : {}) });
  }
  return packForm({ ...raw, off: [...d.off], required: [...d.required], custom: list });
}
/** Welche Vorlage das Formular gerade genau trifft (für die Anzeige) – sonst null („angepasst“). */
export function templateOf(raw: FeedbackFormRaw | undefined): FormTemplateId | null {
  const f = formOf(raw);
  const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x) => b.includes(x));
  for (const t of FORM_TEMPLATES) {
    const d = TEMPLATE_DEFS[t];
    if (!same(f.off, d.off) || !same(f.required, d.required)) continue;
    const names = customOf(raw).map((c) => c.name.toLowerCase());
    if (same(names, d.custom.map((c) => c.name.toLowerCase()))) return t;
  }
  return null;
}

/** Formular eines Projekts aus der Datei lesen (Format 11, nur optionale Felder). */
export function parseFeedbackForm(v: unknown): FeedbackFormRaw | undefined {
  if (!isObj(v)) return undefined;
  const keys = (x: unknown) => (Array.isArray(x) ? [...new Set(x.filter((y): y is string => typeof y === 'string' && /^[a-zA-Z]{2,20}$/.test(y)))] : []);
  const custom: FeedbackFieldDef[] = [];
  if (Array.isArray(v.custom)) {
    for (const c of v.custom) {
      if (custom.length >= CUSTOM_MAX) break;
      if (!isObj(c) || typeof c.id !== 'string' || !/^[a-zA-Z0-9_-]{1,40}$/.test(c.id) || custom.some((x) => x.id === c.id)) continue;
      const name = cleanName(c.name);
      const type = CUSTOM_TYPES.includes(c.type as FeedbackFieldType) ? (c.type as FeedbackFieldType) : null;
      if (!name || !type) continue;
      const options = cleanOptions(c.options);
      if (type === 'choice' && options.length < 2) continue;
      custom.push({ id: c.id, name, type, ...(type === 'choice' ? { options } : {}), ...(c.required === true ? { required: true } : {}) });
    }
  }
  const kinds: Partial<Record<FeedbackKind, string>> = {};
  if (isObj(v.kinds)) for (const k of FEEDBACK_KINDS) {
    const n = cleanName(v.kinds[k], 30);
    if (n) kinds[k] = n;
  }
  return packForm({ off: keys(v.off), required: keys(v.required), custom, kinds });
}

/** FB3: Ähnliche Meldungen nach gemeinsamen Wörtern im Titel (≥ 4 Zeichen, mind. die Hälfte). */
export function similarFeedback(ws: Workspace, title: string, except?: string): Feedback[] {
  const words = (s: string) => new Set(fold(s).split(/[^a-z0-9äöüß]+/).filter((w) => w.length >= 4));
  const q = words(title);
  if (!q.size) return [];
  return feedbackOf(ws)
    .filter((f) => f.id !== except)
    .map((f) => {
      const w = words(f.title);
      let hit = 0;
      for (const x of q) if (w.has(x)) hit++;
      return { f, score: hit / Math.max(1, Math.min(q.size, w.size)) };
    })
    .filter((x) => x.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((x) => x.f);
}

export interface FeedbackFilter {
  kinds?: FeedbackKind[];
  severities?: FeedbackSeverity[];
  /** Suche in Titel und Texten */
  q?: string;
  /** F-225 (P7): Id = nur dieses Projekt, null = nur Meldungen an E-Sources, fehlt = alle */
  project?: string | null;
}

export function matches(f: Feedback, flt: FeedbackFilter): boolean {
  if (flt.project !== undefined && (f.project ?? null) !== flt.project) return false;
  if (flt.kinds?.length && !flt.kinds.includes(f.kind)) return false;
  if (flt.severities?.length && (!f.severity || !flt.severities.includes(f.severity))) return false;
  if (flt.q && flt.q.trim()) {
    const hay = fold([f.title, ...FEEDBACK_TEXTS.map((k) => f[k] ?? ''), ...(f.refs ?? [])].join(' '));
    if (!fold(flt.q).trim().split(/\s+/).every((w) => hay.includes(w))) return false;
  }
  return true;
}

const SEV_RANK: Record<FeedbackSeverity, number> = { blocks: 0, hinders: 1, minor: 2 };

/** FB8: Board – Spalten je Zustand; innen blockiert vor behindert vor stört kaum, dann neueste zuerst. */
export function feedbackBoard(ws: Workspace, flt: FeedbackFilter = {}): { state: FeedbackState; items: Feedback[] }[] {
  const list = feedbackOf(ws).filter((f) => matches(f, flt));
  return FEEDBACK_STATES.map((state) => ({
    state,
    items: list
      .filter((f) => f.state === state)
      .sort((a, b) => (SEV_RANK[a.severity ?? 'minor'] + (a.severity ? 0 : 0.5)) - (SEV_RANK[b.severity ?? 'minor'] + (b.severity ? 0 : 0.5)) || b.at.localeCompare(a.at)),
  }));
}

/** V104 (Enrico): Liste „Meine Meldungen“ für Anwender – ohne Zustand, neueste oben. */
export function feedbackList(ws: Workspace, flt: FeedbackFilter = {}): Feedback[] {
  return feedbackOf(ws)
    .filter((f) => matches(f, flt))
    .sort((a, b) => b.at.localeCompare(a.at));
}

/** Zahl neuer Meldungen (Abzeichen am Knopf „Feedback“). */
export const newCount = (ws: Workspace): number => feedbackOf(ws).filter((f) => f.state === 'new' && !f.project).length;
/** F-225: neue Projektmeldungen eines Projekts. */
export const newCountOf = (ws: Workspace, project: string): number => feedbackOf(ws).filter((f) => f.state === 'new' && f.project === project).length;

/** FB12: Soll „War das Melden einfach?“ gefragt werden? */
export const askEase = (ws: Workspace): boolean => ws.feedbackPrefs?.askEase !== false;
export function setAskEase(ws: Workspace, on: boolean): Workspace {
  if (on) {
    const { feedbackPrefs: _p, ...rest } = ws; // eslint-disable-line @typescript-eslint/no-unused-vars
    return rest;
  }
  return { ...ws, feedbackPrefs: { askEase: false } };
}

// ——— Ausgabe (FB10) ———

/** Beschriftungen für die Datei (nicht für die Oberfläche – die Texte stehen in terms.ts). */
export const FILE_LABELS = {
  kind: { bug: 'Fehler', wish: 'Wunsch', question: 'Frage', praise: 'Lob' } as Record<FeedbackKind, string>,
  state: { new: 'Neu', seen: 'Gesichtet', planned: 'Geplant', done: 'Erledigt', dropped: 'Verworfen' } as Record<FeedbackState, string>,
  severity: { minor: 'stört kaum', hinders: 'behindert', blocks: 'blockiert' } as Record<FeedbackSeverity, string>,
  field: {
    what: 'Was passiert bzw. fehlt',
    steps: 'Schritte zum Nachstellen',
    expected: 'Erwartet',
    actual: 'Tatsächlich',
    affected: 'Betroffen',
    workaround: 'Umgehung',
    goals: 'Ziele',
    nonGoals: 'Nicht-Ziele',
    impact: 'Folgen',
    guess: 'Vermutung',
    open: 'Noch offen',
    decision: 'Entscheidung',
    severity: 'Schweregrad',
  } as Record<FeedbackText | 'severity', string>,
  yes: 'Ja',
  no: 'Nein',
};

const dt = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

function placeLine(f: Feedback): string {
  const p = f.place;
  const e = f.env;
  const parts = [
    p?.mode && `Modus ${p.mode}`,
    p?.view && `Ansicht ${p.view}`,
    p?.menu && `Menü ${p.menu}`,
    p?.desk !== undefined && (p.desk ? `Desk ${p.desk}` : 'Main Desk'),
  ].filter(Boolean);
  const env = [e?.version, e?.device, e?.browser, e?.screen && `Bildschirm ${e.screen}`, e?.window && `Fenster ${e.window}`].filter(Boolean);
  return [parts.join(' · '), env.join(' · ')].filter(Boolean).join(' — ');
}

/** Eine Meldung als Problemstellung (Gliederung nach Enricos Vorlage). */
export function feedbackMarkdown(f: Feedback, all: Feedback[] = [], form?: FeedbackFormRaw): string {
  const L = FILE_LABELS;
  const out: string[] = [`## ${kindName(form, f.kind)}: ${f.title}`, ''];
  out.push(`- **Zustand:** ${L.state[f.state]}${f.fixedIn ? ` (behoben in ${f.fixedIn})` : ''}`);
  out.push(`- **Gemeldet:** ${dt(f.at)}${f.changed ? ` · geändert ${dt(f.changed)}` : ''}`);
  const pl = placeLine(f);
  if (pl) out.push(`- **Ort:** ${pl}`);
  if (f.ease) out.push(`- **Melden war einfach:** ${f.ease} von 5`);
  out.push(`- Id: \`${f.id}\``);
  const sec = (head: string, keys: (FeedbackText | 'severity')[]) => {
    const lines = keys
      .map((k) => {
        const v = k === 'severity' ? (f.severity ? L.severity[f.severity] : '') : f[k];
        return v ? `**${L.field[k]}:** ${v.includes('\n') ? `\n\n${v}\n` : v}` : '';
      })
      .filter(Boolean);
    if (lines.length) out.push('', `### ${head}`, '', ...lines.flatMap((l) => [l, '']).slice(0, -1));
  };
  sec('Anlass & Kontext', ['what']);
  sec('Hintergrund', ['steps', 'expected', 'actual', 'affected', 'workaround']);
  sec('Lösungsansatz', ['goals', 'nonGoals']);
  sec('Relevanz', ['severity', 'impact']);
  sec('Hypothesen', ['guess']);
  // F-225 (V106): eigene Felder des Projekts
  const extra = customOf(form).filter((c) => f.extra?.[c.id] !== undefined).map((c) => `- **${c.name}:** ${extraText(c, f.extra?.[c.id])}`);
  if (extra.length) out.push('', '### Angaben für das Projekt', '', ...extra);
  const notes: string[] = [];
  if (f.refs?.length) notes.push(`- Bezug: ${f.refs.join(', ')}`);
  const rel = (f.related ?? []).map((id) => all.find((x) => x.id === id)).filter((x): x is Feedback => !!x);
  if (rel.length) notes.push(`- Ähnlich: ${rel.map((r) => `„${r.title}“`).join(', ')}`);
  if (f.decision) notes.push(`- Entscheidung: ${f.decision}`);
  if (f.open) notes.push(`- Noch offen: ${f.open}`);
  if (f.pics?.length) notes.push(`- Bilder: ${f.pics.length} (nur auf dem Gerät)`);
  for (const m of f.marks ?? []) notes.push(`- ${dt(m.at)} ${markLabel(m)}${m.by ? ` (${m.by})` : ''}`);
  if (notes.length) out.push('', '### Vermerke zur Weiterverarbeitung', '', ...notes);
  return out.join('\n');
}

function markLabel(m: FeedbackMark): string {
  if (m.kind === 'state') {
    const [, from, to, why] = /^(\w+) → (\w+)(?:: (.*))?$/.exec(m.text) ?? [];
    if (from && to) return `Zustand ${FILE_LABELS.state[from as FeedbackState] ?? from} → ${FILE_LABELS.state[to as FeedbackState] ?? to}${why ? `: ${why}` : ''}`;
  }
  const head = { note: 'Vermerk', decision: 'Entscheidung', ref: 'Bezug', fixed: 'Behoben in', state: 'Zustand', to: 'Weiter an' }[m.kind];
  return `${head}: ${m.text}`;
}

export interface ExportOpts {
  onlyNew?: boolean;
  now?: Date;
  /** F-225: Id = nur dieses Projekt, null = nur an E-Sources, fehlt = alle */
  project?: string | null;
}

const pickExport = (ws: Workspace, o: ExportOpts) =>
  feedbackOf(ws).filter((f) => (!o.onlyNew || f.state === 'new') && (o.project === undefined || (f.project ?? null) === o.project));

/** FB10: alle (bzw. nur neue) Meldungen als Markdown – Claude liest die Datei zu Beginn eines Chats. */
export function feedbackFileMarkdown(ws: Workspace, o: ExportOpts = {}): string {
  const list = pickExport(ws, o);
  const now = o.now ?? new Date();
  const head = [
    `# Feedback E-Sources`,
    '',
    `Gespeichert ${dt(now.toISOString())} · ${APP_VERSION} · ${list.length} ${list.length === 1 ? 'Meldung' : 'Meldungen'}${o.onlyNew ? ' (nur neue)' : ''}`,
  ];
  const counts = FEEDBACK_STATES.map((s) => [s, list.filter((f) => f.state === s).length] as const).filter(([, n]) => n);
  if (counts.length) head.push('', counts.map(([s, n]) => `${FILE_LABELS.state[s]} ${n}`).join(' · '));
  const order = feedbackBoard({ ...ws, feedback: list }).flatMap((c) => c.items);
  const formFor = (f: Feedback) => (f.project ? ws.projects?.find((p) => p.id === f.project)?.feedbackForm : undefined);
  return [...head, ...order.flatMap((f) => ['', feedbackMarkdown(f, feedbackOf(ws), formFor(f))]), ''].join('\n');
}

export const FEEDBACK_FILE_FORMAT = 'e-sources-feedback';

/** FB10: dasselbe als JSON (maschinenlesbar). */
export function feedbackFileJson(ws: Workspace, o: ExportOpts = {}): string {
  const now = o.now ?? new Date();
  return JSON.stringify({ format: FEEDBACK_FILE_FORMAT, version: 1, app: APP_VERSION, savedAt: now.toISOString(), onlyNew: !!o.onlyNew, feedback: pickExport(ws, o) }, null, 2);
}

/**
 * F-224 R7 (V106): Feedback-Datei eines Anwenders einlesen und nach Id zusammenführen. Neue Meldungen kommen dazu;
 * bekannte nur, wenn die Datei neuer ist – dann gelten ihre Angaben (Titel, Art, Texte, Schweregrad, eigene Felder,
 * Bilder-Verweise), unsere Bearbeitung bleibt (Zustand, Instanz, Bezüge, Vermerke, Entscheidung, „Behoben in“),
 * Vermerke beider Seiten werden vereint. Gibt die neue Liste und Zahlen zurück – oder einen Fehler.
 */
export type MergeResult = { ok: true; list: Feedback[]; added: number; updated: number; same: number; full: number } | { ok: false; error: 'json' | 'format' | 'empty' };
export function mergeFeedbackFile(ws: Workspace, text: string): MergeResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'json' };
  }
  if (!isObj(raw) || raw.format !== FEEDBACK_FILE_FORMAT) return { ok: false, error: 'format' };
  const incoming = parseFeedback(raw.feedback);
  if (!incoming.length) return { ok: false, error: 'empty' };
  const list = [...feedbackOf(ws)];
  let added = 0, updated = 0, same = 0, full = 0;
  const stamp = (f: Feedback) => f.changed ?? f.at;
  for (const g of incoming) {
    const i = list.findIndex((f) => f.id === g.id);
    if (i < 0) {
      if (list.length >= FEEDBACK_MAX) {
        full++;
        continue;
      }
      list.push(g);
      added++;
      continue;
    }
    const f = list[i];
    if (stamp(g) <= stamp(f)) {
      same++;
      continue;
    }
    const keys = new Set((f.marks ?? []).map((m) => `${m.at}|${m.kind}|${m.text}`));
    const marks = [...(f.marks ?? []), ...(g.marks ?? []).filter((m) => !keys.has(`${m.at}|${m.kind}|${m.text}`))].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0)).slice(-MARKS_MAX);
    const theirs: Feedback = { ...g };
    for (const k of ['state', 'to', 'refs', 'related', 'decision', 'fixedIn', 'marks'] as const) delete theirs[k];
    const ours: Partial<Feedback> = {};
    for (const k of ['state', 'to', 'refs', 'related', 'decision', 'fixedIn', 'became'] as const) if (f[k] !== undefined) (ours as Record<string, unknown>)[k] = f[k];
    list[i] = { ...theirs, ...ours, ...(f.project ? { project: f.project } : {}), ...(marks.length ? { marks } : {}) };
    updated++;
  }
  return { ok: true, list, added, updated, same, full };
}
/** Liste nach dem Einlesen übernehmen bzw. für Rückgängig zurücksetzen. */
export const setFeedbackList = (ws: Workspace, list: Feedback[]): Workspace => withFeedback(ws, list.slice(0, FEEDBACK_MAX));

/** Dateiname „Feedback-2026-12-07-1830.md“ bzw. „.json“. */
export function feedbackFileName(now: Date, ext: 'md' | 'json'): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `Feedback-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}.${ext}`;
}

// ——— Laden (Dateiformat 11) ———

const str = (v: unknown, max: number): string | undefined => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);

function parsePlace(v: unknown): FeedbackPlace | undefined {
  if (!isObj(v)) return undefined;
  const p: FeedbackPlace = {};
  for (const k of ['view', 'mode', 'menu'] as const) {
    const s = str(v[k], 120);
    if (s) p[k] = s;
  }
  if (typeof v.desk === 'string') p.desk = v.desk.slice(0, 120);
  return Object.keys(p).length ? p : undefined;
}

function parseEnv(v: unknown): FeedbackEnv | undefined {
  if (!isObj(v)) return undefined;
  const e: FeedbackEnv = {};
  for (const k of ['version', 'device', 'browser', 'screen', 'window'] as const) {
    const s = str(v[k], 80);
    if (s) e[k] = s;
  }
  return Object.keys(e).length ? e : undefined;
}

const MARK_KINDS: readonly FeedbackMark['kind'][] = ['note', 'decision', 'ref', 'fixed', 'state', 'to'];

/** Liest `Workspace.feedback` – Unbrauchbares fällt weg, Bezüge nur auf Vorhandenes. */
export function parseFeedback(v: unknown): Feedback[] {
  if (!Array.isArray(v)) return [];
  const out: Feedback[] = [];
  for (const r of v) {
    if (out.length >= FEEDBACK_MAX) break;
    if (!isObj(r) || typeof r.id !== 'string' || !r.id || out.some((f) => f.id === r.id)) continue;
    const title = str(r.title, TITLE_MAX);
    if (!title || !FEEDBACK_KINDS.includes(r.kind as FeedbackKind) || !isIso(r.at)) continue;
    const f: Feedback = {
      id: r.id,
      kind: r.kind as FeedbackKind,
      title,
      state: FEEDBACK_STATES.includes(r.state as FeedbackState) ? (r.state as FeedbackState) : 'new',
      at: r.at,
    };
    if (isIso(r.changed)) f.changed = r.changed;
    if (typeof r.project === 'string' && r.project) {
      f.project = r.project;
      if (typeof r.to === 'string' && r.to) f.to = r.to;
    }
    if (isObj(r.extra)) {
      const ex: Record<string, string | number | boolean> = {};
      for (const [k, v] of Object.entries(r.extra)) {
        const c = /^[a-zA-Z0-9_-]{1,40}$/.test(k) ? extraValue(v) : undefined;
        if (c !== undefined) ex[k] = c;
      }
      if (Object.keys(ex).length) f.extra = ex;
    }
    const place = parsePlace(r.place);
    if (place) f.place = place;
    const env = parseEnv(r.env);
    if (env) f.env = env;
    for (const k of FEEDBACK_TEXTS) {
      const s = typeof r[k] === 'string' ? cleanText(r[k] as string) : '';
      if (s) f[k] = s;
    }
    if (FEEDBACK_SEVERITIES.includes(r.severity as FeedbackSeverity)) f.severity = r.severity as FeedbackSeverity;
    if (Array.isArray(r.refs)) {
      const refs = [...new Set(r.refs.map((x) => (typeof x === 'string' ? parseRef(x) : null)).filter((x): x is string => !!x))];
      if (refs.length) f.refs = refs;
    }
    if (Array.isArray(r.related)) {
      const rel = [...new Set(r.related.filter((x): x is string => typeof x === 'string' && !!x && x !== r.id))];
      if (rel.length) f.related = rel;
    }
    if (Array.isArray(r.pics)) {
      const pics = [...new Set(r.pics.filter((x): x is string => typeof x === 'string' && !!x))].slice(0, PICS_MAX);
      if (pics.length) f.pics = pics;
    }
    if (typeof r.ease === 'number' && Number.isInteger(r.ease) && r.ease >= 1 && r.ease <= 5) f.ease = r.ease as Feedback['ease'];
    if (typeof r.fixedIn === 'string' && /^V\d{1,4}$/.test(r.fixedIn)) f.fixedIn = r.fixedIn;
    if (Array.isArray(r.marks)) {
      const marks = r.marks
        .filter((m): m is Record<string, unknown> => isObj(m) && isIso(m.at) && MARK_KINDS.includes(m.kind as FeedbackMark['kind']) && !!str(m.text, TEXT_MAX))
        .map((m) => ({ at: m.at as string, kind: m.kind as FeedbackMark['kind'], text: str(m.text, TEXT_MAX)!, ...(str(m.by, 120) ? { by: str(m.by, 120) } : {}) }))
        .slice(-MARKS_MAX);
      if (marks.length) f.marks = marks;
    }
    // F-225 P8 (V107): Meldung wurde zu Risiko bzw. Änderungsantrag
    if (isObj(r.became) && typeof r.became.note === 'string' && r.became.note && (r.became.type === 'risk' || r.became.type === 'change' || r.became.type === 'decision'))
      f.became = { note: r.became.note, type: r.became.type };
    out.push(f);
  }
  // „ähnlich“ nur auf vorhandene Meldungen
  const ids = new Set(out.map((f) => f.id));
  return out.map((f) => {
    if (!f.related) return f;
    const rel = f.related.filter((x) => ids.has(x));
    const { related: _r, ...g } = f; // eslint-disable-line @typescript-eslint/no-unused-vars
    return rel.length ? { ...g, related: rel } : g;
  });
}

export function parseFeedbackPrefs(v: unknown): Workspace['feedbackPrefs'] {
  return isObj(v) && v.askEase === false ? { askEase: false } : undefined;
}

/** F-220 (R5): Ordnung der Umschalt-Räder lesen – nur Listen aus Ids, ohne Doppelte. */
export function parseWheels(v: unknown): Workspace['wheels'] {
  if (!isObj(v)) return undefined;
  const ids = (x: unknown) => (Array.isArray(x) ? [...new Set(x.filter((y): y is string => typeof y === 'string' && !!y))].slice(0, 50) : []);
  const out: NonNullable<Workspace['wheels']> = {};
  for (const [k, w] of Object.entries(v)) {
    if (!k || !isObj(w)) continue;
    const e: NonNullable<Workspace['wheels']>[string] = {};
    const pinned = ids(w.pinned);
    const hidden = ids(w.hidden).filter((x) => !pinned.includes(x));
    const order = ids(w.order);
    if (pinned.length) e.pinned = pinned;
    if (hidden.length) e.hidden = hidden;
    if (order.length) e.order = order;
    if (w.auto === false) e.auto = false;
    if (Object.keys(e).length) out[k] = e;
  }
  return Object.keys(out).length ? out : undefined;
}
