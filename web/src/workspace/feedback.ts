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
  FeedbackKind,
  FeedbackMark,
  FeedbackPlace,
  FeedbackSeverity,
  FeedbackState,
  Workspace,
} from './types';

/** App-Stand für die Meldung (FB6) – bei jedem Chat mitzählen. */
export const APP_VERSION = 'V102';
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

export type NewFeedback = { kind: FeedbackKind; title: string; place?: FeedbackPlace; env?: FeedbackEnv } & Partial<Pick<Feedback, FeedbackText | 'severity' | 'refs'>>;

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
  const { kind: _k, title: _t, place: _p, env: _e, ...rest } = v; // eslint-disable-line @typescript-eslint/no-unused-vars
  f = applyPatch(f, rest);
  return { ws: withFeedback(ws, [...feedbackOf(ws), f]), id: f.id };
}

export type FeedbackPatch = Partial<Pick<Feedback, FeedbackText | 'title' | 'kind' | 'severity' | 'refs' | 'related' | 'pics' | 'fixedIn'>> & { ease?: number | null };

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
export function missingOf(f: Feedback): (FeedbackText | 'severity')[] {
  return WANTED[f.kind].filter((k) => (k === 'severity' ? !f.severity : !f[k]));
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
}

export function matches(f: Feedback, flt: FeedbackFilter): boolean {
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

/** Zahl neuer Meldungen (Abzeichen am Knopf „Feedback“). */
export const newCount = (ws: Workspace): number => feedbackOf(ws).filter((f) => f.state === 'new').length;

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
export function feedbackMarkdown(f: Feedback, all: Feedback[] = []): string {
  const L = FILE_LABELS;
  const out: string[] = [`## ${L.kind[f.kind]}: ${f.title}`, ''];
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
  const head = { note: 'Vermerk', decision: 'Entscheidung', ref: 'Bezug', fixed: 'Behoben in', state: 'Zustand' }[m.kind];
  return `${head}: ${m.text}`;
}

export interface ExportOpts {
  onlyNew?: boolean;
  now?: Date;
}

const pickExport = (ws: Workspace, o: ExportOpts) => feedbackOf(ws).filter((f) => !o.onlyNew || f.state === 'new');

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
  return [...head, ...order.flatMap((f) => ['', feedbackMarkdown(f, feedbackOf(ws))]), ''].join('\n');
}

export const FEEDBACK_FILE_FORMAT = 'e-sources-feedback';

/** FB10: dasselbe als JSON (maschinenlesbar). */
export function feedbackFileJson(ws: Workspace, o: ExportOpts = {}): string {
  const now = o.now ?? new Date();
  return JSON.stringify({ format: FEEDBACK_FILE_FORMAT, version: 1, app: APP_VERSION, savedAt: now.toISOString(), onlyNew: !!o.onlyNew, feedback: pickExport(ws, o) }, null, 2);
}

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

const MARK_KINDS: readonly FeedbackMark['kind'][] = ['note', 'decision', 'ref', 'fixed', 'state'];

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
