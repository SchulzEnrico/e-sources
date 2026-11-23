/**
 * F-206: Notizen und Ansichten – Datenmodell (Schritt 1).
 *
 * Eine Notiz ist ein eigenes Objekt (Workspace.notes); ein Tab zeigt nur darauf (Tab.note).
 * Ansichten (Notizblock, To-do-Liste, Kanban-Board, Eisenhower-Matrix) ordnen Notizen nur an
 * (Workspace.noteViews); eine Notiz kann in mehreren Ansichten zugleich liegen, ohne Kopie.
 * Alles hier sind reine Funktionen: Workspace rein, neuer Workspace raus.
 */
import type {
  Note,
  NoteAttachment,
  NoteColumn,
  NoteEvent,
  NoteEventKind,
  NoteLink,
  NoteLinkKind,
  NoteOrigin,
  NoteState,
  NoteView,
  NoteViewKind,
  PanelMeta,
  Workspace,
} from './types';
import { newId } from './workspace';

/** Höchstens so viele Notizen je Ansicht (Unter-Notizen zählen nicht). */
export const VIEW_MAX = 200;
/** Höchstens so viele Spalten je Kanban-Board. */
export const COLUMN_MAX = 8;
/** Höchstens so viele Einträge in der Spur einer Notiz (älteste fallen weg). */
export const TRAIL_MAX = 200;
/** Textänderungen derselben Person innerhalb dieser Zeit ergeben einen Spur-Eintrag. */
export const EDIT_MERGE_MS = 10 * 60 * 1000;
/** Länge des Titel-Vorschlags aus der ersten Zeile. */
export const TITLE_MAX = 80;

export const NOTE_STATES: readonly NoteState[] = ['open', 'waiting', 'doing', 'review', 'done', 'archived'];
export const VIEW_KINDS: readonly NoteViewKind[] = ['block', 'todo', 'kanban', 'eisenhower'];
/** Spalten eines neuen Kanban-Boards. */
export const KANBAN_START = ['Offen', 'In Arbeit', 'Erledigt'] as const;

/** Wer und wann – für die Spur. */
export interface Act {
  now?: number;
  by?: string;
}

export const notesOf = (ws: Workspace): Note[] => ws.notes ?? [];
export const viewsOf = (ws: Workspace): NoteView[] => ws.noteViews ?? [];
export const noteById = (ws: Workspace, id: string): Note | undefined => notesOf(ws).find((n) => n.id === id);
export const viewById = (ws: Workspace, id: string): NoteView | undefined => viewsOf(ws).find((v) => v.id === id);

/** Erledigt im Sinne von Vorgängern und Fortschritt. */
export const isFinished = (s: NoteState) => s === 'done' || s === 'archived';

/** Lokales Datum JJJJ-MM-TT. */
export function dayOf(now: number = Date.now()): string {
  const d = new Date(now);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Titel oder Vorschlag aus der ersten Zeile mit Inhalt (ohne Markdown-Zeichen am Anfang). */
export function titleOf(n: Pick<Note, 'title' | 'text'>): string {
  const own = n.title.trim();
  if (own) return own;
  const line = n.text
    .split('\n')
    .map((l) => l.replace(/^\s*(#{1,6}\s+|[-*+]\s+(\[[ xX]\]\s+)?|\d+[.)]\s+|>\s*)/, '').replace(/\\(.)/g, '$1').replace(/[*_`~]/g, '').trim())
    .find((l) => l.length > 0);
  if (!line) return '';
  return line.length > TITLE_MAX ? `${line.slice(0, TITLE_MAX - 1).trimEnd()}…` : line;
}

/** Leere Notiz (wird beim Schließen des Tabs still verworfen). */
export function isEmptyNote(ws: Workspace, n: Note): boolean {
  return !n.title.trim() && !n.text.trim() && !(n.attach?.length) && !notesOf(ws).some((c) => c.parent === n.id);
}

function withNotes(ws: Workspace, notes: Note[]): Workspace {
  return { ...ws, notes };
}

function withViews(ws: Workspace, views: NoteView[]): Workspace {
  return { ...ws, noteViews: views };
}

/** Spur um einen Eintrag ergänzen; Textänderungen derselben Person werden zusammengefasst. */
export function addEvent(trail: readonly NoteEvent[], what: NoteEventKind, act: Act = {}, detail?: string): NoteEvent[] {
  const at = act.now ?? Date.now();
  const last = trail[trail.length - 1];
  if (what === 'edited' && last && last.what === 'edited' && last.by === act.by && at - last.at < EDIT_MERGE_MS) {
    return [...trail.slice(0, -1), { ...last, at }];
  }
  const ev: NoteEvent = { at, what, ...(act.by ? { by: act.by } : {}), ...(detail ? { detail } : {}) };
  const out = [...trail, ev];
  return out.length > TRAIL_MAX ? out.slice(out.length - TRAIL_MAX) : out;
}

function patchNote(ws: Workspace, id: string, fn: (n: Note) => Note): Workspace {
  let hit = false;
  const notes = notesOf(ws).map((n) => {
    if (n.id !== id) return n;
    hit = true;
    return fn(n);
  });
  return hit ? withNotes(ws, notes) : ws;
}

function note(ws: Workspace, id: string, ev: NoteEventKind, act: Act, detail: string | undefined, fn: (n: Note) => Note): Workspace {
  const at = act.now ?? Date.now();
  return patchNote(ws, id, (n) => ({ ...fn(n), changed: at, trail: addEvent(n.trail, ev, act, detail) }));
}

// ---------- Anlegen und ändern ----------

export type NoteInit = Partial<Omit<Note, 'id' | 'trail' | 'created' | 'changed'>>;

/** Neue Notiz (am Ende der Library). */
export function createNote(ws: Workspace, init: NoteInit = {}, act: Act & { id?: string; via?: NoteOrigin['via'] } = {}): { ws: Workspace; id: string } {
  const at = act.now ?? Date.now();
  const id = act.id ?? newId();
  const n: Note = {
    title: '',
    text: '',
    state: 'open',
    ...init,
    id,
    trail: addEvent([], 'created', act),
    created: at,
    changed: at,
  };
  if (!n.origin) n.origin = { via: act.via ?? 'hand', at: new Date(at).toISOString(), ...(act.by ? { by: act.by } : {}) };
  if (n.parent && !noteById(ws, n.parent)) delete n.parent;
  return { ws: withNotes(ws, [...notesOf(ws), n]), id };
}

/** Felder, die sich frei ändern lassen (Zustand, Eltern und Vorgänger haben eigene Funktionen). */
export type NotePatch = Partial<
  Pick<Note, 'title' | 'text' | 'category' | 'tags' | 'important' | 'urgent' | 'notBefore' | 'due' | 'waitReason' | 'attach' | 'delegated'>
>;

/** Notiz ändern; `undefined` im Patch entfernt das Feld. */
export function updateNote(ws: Workspace, id: string, patch: NotePatch, act: Act = {}): Workspace {
  const keys = Object.keys(patch) as (keyof NotePatch)[];
  if (keys.length === 0) return ws;
  const ev: NoteEventKind = 'delegated' in patch ? 'delegated' : 'attach' in patch ? 'attached' : 'edited';
  const detail = ev === 'delegated' ? patch.delegated?.to : undefined;
  return note(ws, id, ev, act, detail, (n) => {
    const out: Note = { ...n };
    for (const k of keys) {
      const v = patch[k];
      if (v === undefined || (k !== 'title' && k !== 'text' && v === '')) delete (out as unknown as Record<string, unknown>)[k];
      else (out as unknown as Record<string, unknown>)[k] = v;
    }
    return out;
  });
}

/** Weitergeleitet an … (Teilen-Menü, anderes Gerät, eigenes Board). */
export function markForwarded(ws: Workspace, id: string, to: string, act: Act = {}): Workspace {
  const at = act.now ?? Date.now();
  return note(ws, id, 'forwarded', act, to, (n) => ({ ...n, forwarded: [...(n.forwarded ?? []), { at, to }] }));
}

// ---------- Zustand ----------

/** Liegt die Notiz in einer Ansicht mit Regel „Abnahme nötig“? */
export function needsReview(ws: Workspace, id: string): boolean {
  return viewsWith(ws, id).some((v) => v.review);
}

/**
 * Zustand setzen. Bei Regel „Abnahme nötig“ wird aus „erledigt“ erst „in Prüfung“
 * (bestätigen mit confirmReview). „wartet“ ohne Grund ist erlaubt.
 */
export function setState(ws: Workspace, id: string, state: NoteState, act: Act = {}, reason?: string): Workspace {
  const n = noteById(ws, id);
  if (!n) return ws;
  const next: NoteState = state === 'done' && n.state !== 'review' && needsReview(ws, id) ? 'review' : state;
  if (next === n.state && (next !== 'waiting' || reason === n.waitReason)) return ws;
  return note(ws, id, 'state', act, next, (x) => {
    const out: Note = { ...x, state: next };
    if (next === 'waiting' && reason?.trim()) out.waitReason = reason.trim();
    else delete out.waitReason;
    return out;
  });
}

/** „in Prüfung“ bestätigen → erledigt. */
export function confirmReview(ws: Workspace, id: string, act: Act = {}): Workspace {
  const n = noteById(ws, id);
  if (!n || n.state !== 'review') return ws;
  return note(ws, id, 'state', act, 'done', (x) => ({ ...x, state: 'done' }));
}

export type WaitCause = 'hand' | 'after' | 'date' | 'notBefore';

export interface StateInfo {
  state: NoteState;
  /** Warum „wartet“ (nur bei wartet). */
  cause?: WaitCause;
  /** Grund von Hand bzw. Ids der offenen Vorgänger. */
  reason?: string;
  blockers?: string[];
  /** Frühester Beginn (JJJJ-MM-TT), wenn er in der Zukunft liegt. */
  from?: string;
}

/** Frühester Beginn: „nicht beginnen vor“ und „fällig am“ der Vorgänger mit Art „bestimmt den Termin“. */
export function earliestStart(ws: Workspace, n: Note): string | undefined {
  let best = n.notBefore;
  for (const l of n.after ?? []) {
    if (l.kind !== 'date') continue;
    const p = noteById(ws, l.id);
    if (p?.due && !isFinished(p.state) && (!best || p.due > best)) best = p.due;
  }
  return best;
}

/** Angezeigter Zustand: „offen“ wird von selbst zu „wartet“ bei offenem Vorgänger oder vor dem frühesten Beginn. */
export function stateOf(ws: Workspace, n: Note, today: string = dayOf()): StateInfo {
  if (n.state === 'waiting') return { state: 'waiting', cause: 'hand', ...(n.waitReason ? { reason: n.waitReason } : {}) };
  if (n.state !== 'open') return { state: n.state };
  const blockers = (n.after ?? [])
    .filter((l) => l.kind === 'done')
    .map((l) => noteById(ws, l.id))
    .filter((p): p is Note => !!p && !isFinished(p.state))
    .map((p) => p.id);
  if (blockers.length) return { state: 'waiting', cause: 'after', blockers };
  const from = earliestStart(ws, n);
  if (from && from > today) return { state: 'waiting', cause: from === n.notBefore ? 'notBefore' : 'date', from };
  return { state: 'open' };
}

// ---------- Unter-Notizen ----------

export const childrenOf = (ws: Workspace, id: string): Note[] => notesOf(ws).filter((n) => n.parent === id);

/** Alle Nachkommen (Tiefensuche, in Reihenfolge der Library). */
export function descendantsOf(ws: Workspace, id: string): Note[] {
  const out: Note[] = [];
  const seen = new Set<string>([id]);
  const walk = (pid: string) => {
    for (const c of childrenOf(ws, pid)) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      out.push(c);
      walk(c.id);
    }
  };
  walk(id);
  return out;
}

/** Fortschritt über die direkten Unter-Notizen. */
export function progress(ws: Workspace, id: string): { done: number; total: number } {
  const kids = childrenOf(ws, id).filter((c) => c.state !== 'archived');
  return { done: kids.filter((c) => c.state === 'done').length, total: kids.length };
}

/** Die nächsten offenen Unter-Notizen (für die Karte, schrittweise blasser). */
export function nextOpenChildren(ws: Workspace, id: string, max = 3): Note[] {
  return childrenOf(ws, id)
    .filter((c) => !isFinished(c.state))
    .slice(0, max);
}

export type LinkResult = { ok: true; ws: Workspace } | { ok: false; reason: 'self' | 'missing' | 'circle'; path?: string[] };

/**
 * Eltern-Notiz setzen (genau eine) oder mit `undefined` lösen. Kreise (Notiz unter ihre eigene
 * Unter-Notiz) werden verhindert; `path` zeigt den Weg von der Notiz bis zur gewünschten Eltern-Notiz.
 */
export function setParent(ws: Workspace, id: string, parent: string | undefined, act: Act = {}): LinkResult {
  const n = noteById(ws, id);
  if (!n) return { ok: false, reason: 'missing' };
  if (parent === undefined) {
    if (!n.parent) return { ok: true, ws };
    return { ok: true, ws: note(ws, id, 'parent', act, undefined, (x) => {
      const { parent: _p, ...rest } = x;
      return rest;
    }) };
  }
  if (parent === id) return { ok: false, reason: 'self' };
  if (!noteById(ws, parent)) return { ok: false, reason: 'missing' };
  // Weg nach oben von der gewünschten Eltern-Notiz – trifft er die Notiz selbst, wäre es ein Kreis
  const up: string[] = [parent];
  let cur = noteById(ws, parent);
  while (cur?.parent && up.length <= notesOf(ws).length) {
    if (cur.parent === id) return { ok: false, reason: 'circle', path: [id, ...up.reverse()] };
    up.push(cur.parent);
    cur = noteById(ws, cur.parent);
  }
  if (n.parent === parent) return { ok: true, ws };
  return { ok: true, ws: note(ws, id, 'parent', act, parent, (x) => ({ ...x, parent })) };
}

// ---------- Vorgänger (Netzplan) ----------

/** Nachfolger: Notizen, die `id` als Vorgänger haben. */
export function successorsOf(ws: Workspace, id: string): { note: Note; kind: NoteLinkKind }[] {
  const out: { note: Note; kind: NoteLinkKind }[] = [];
  for (const n of notesOf(ws)) {
    const l = n.after?.find((x) => x.id === id);
    if (l) out.push({ note: n, kind: l.kind });
  }
  return out;
}

/** Weg über Vorgänger von `from` zurück bis `to` (Breitensuche), sonst null. */
function predPath(ws: Workspace, from: string, to: string): string[] | null {
  const prev = new Map<string, string>();
  const queue = [from];
  const seen = new Set([from]);
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === to) {
      const path = [cur];
      let k = cur;
      while (prev.has(k)) {
        k = prev.get(k)!;
        path.push(k);
      }
      return path.reverse();
    }
    for (const l of noteById(ws, cur)?.after ?? []) {
      if (seen.has(l.id)) continue;
      seen.add(l.id);
      prev.set(l.id, cur);
      queue.push(l.id);
    }
  }
  return null;
}

/**
 * Vorgänger `pred` für `id` eintragen (pred kommt vor id). Gibt es den Bezug schon, ändert sich
 * nur die Art. Kreise werden verhindert: `path` ist der Kreis in Reihenfolge „kommt vor“,
 * beginnend und endend mit `id` (z. B. [id, pred, …, id]).
 */
export function addLink(ws: Workspace, id: string, pred: string, kind: NoteLinkKind, act: Act = {}): LinkResult {
  if (id === pred) return { ok: false, reason: 'self' };
  const n = noteById(ws, id);
  if (!n || !noteById(ws, pred)) return { ok: false, reason: 'missing' };
  // Kreis, wenn id schon (über Vorgänger) vor pred kommt: Weg pred → … → id rückwärts über „after“
  const back = predPath(ws, pred, id);
  if (back) return { ok: false, reason: 'circle', path: [...back.reverse(), id] };
  const had = n.after?.find((l) => l.id === pred);
  if (had?.kind === kind) return { ok: true, ws };
  const after: NoteLink[] = had ? (n.after ?? []).map((l) => (l.id === pred ? { id: pred, kind } : l)) : [...(n.after ?? []), { id: pred, kind }];
  return { ok: true, ws: note(ws, id, 'link', act, pred, (x) => ({ ...x, after })) };
}

export function removeLink(ws: Workspace, id: string, pred: string, act: Act = {}): Workspace {
  const n = noteById(ws, id);
  if (!n?.after?.some((l) => l.id === pred)) return ws;
  return note(ws, id, 'unlink', act, pred, (x) => {
    const after = (x.after ?? []).filter((l) => l.id !== pred);
    const out: Note = { ...x, after };
    if (after.length === 0) delete out.after;
    return out;
  });
}

// ---------- Ansichten ----------

export function createView(ws: Workspace, kind: NoteViewKind, name: string, opts: { id?: string; category?: string; makeId?: () => string } = {}): { ws: Workspace; id: string } {
  const make = opts.makeId ?? newId;
  const id = opts.id ?? make();
  const v: NoteView = { id, kind, name: name.trim() || defaultViewName(ws, kind), ids: [] };
  if (opts.category) v.category = opts.category;
  if (kind === 'kanban') v.cols = KANBAN_START.map((c) => ({ id: make(), name: c, ids: [] }));
  return { ws: withViews(ws, [...viewsOf(ws), v]), id };
}

const VIEW_BASE: Record<NoteViewKind, string> = { block: 'Notizblock', todo: 'To-do-Liste', kanban: 'Kanban-Board', eisenhower: 'Eisenhower-Matrix' };

/** „To-do-Liste“, „To-do-Liste 2“ … */
export function defaultViewName(ws: Workspace, kind: NoteViewKind): string {
  const base = VIEW_BASE[kind];
  const taken = new Set(viewsOf(ws).map((v) => v.name.toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  let n = 2;
  while (taken.has(`${base} ${n}`.toLowerCase())) n++;
  return `${base} ${n}`;
}

function patchView(ws: Workspace, id: string, fn: (v: NoteView) => NoteView): Workspace {
  let hit = false;
  const views = viewsOf(ws).map((v) => {
    if (v.id !== id) return v;
    hit = true;
    return fn(v);
  });
  return hit ? withViews(ws, views) : ws;
}

export function updateView(ws: Workspace, id: string, patch: Partial<Pick<NoteView, 'name' | 'category' | 'review'>>): Workspace {
  return patchView(ws, id, (v) => {
    const out: NoteView = { ...v };
    if (patch.name !== undefined && patch.name.trim()) out.name = patch.name.trim();
    if ('category' in patch) {
      if (patch.category) out.category = patch.category;
      else delete out.category;
    }
    if ('review' in patch) {
      if (patch.review) out.review = true;
      else delete out.review;
    }
    return out;
  });
}

/** Alle Ids einer Ansicht (Kanban: über alle Spalten). */
export function idsIn(v: NoteView): string[] {
  return v.kind === 'kanban' ? (v.cols ?? []).flatMap((c) => c.ids) : v.ids;
}

/** Zählt für die Grenze VIEW_MAX – Unter-Notizen zählen nicht. */
export function countIn(ws: Workspace, v: NoteView): number {
  return idsIn(v).filter((id) => !noteById(ws, id)?.parent).length;
}

export const viewsWith = (ws: Workspace, noteId: string): NoteView[] => viewsOf(ws).filter((v) => idsIn(v).includes(noteId));

function without(v: NoteView, noteId: string): NoteView {
  if (v.kind === 'kanban') return { ...v, cols: (v.cols ?? []).map((c) => (c.ids.includes(noteId) ? { ...c, ids: c.ids.filter((x) => x !== noteId) } : c)) };
  return v.ids.includes(noteId) ? { ...v, ids: v.ids.filter((x) => x !== noteId) } : v;
}

function insertAt(list: string[], id: string, index?: number): string[] {
  const i = index === undefined ? list.length : Math.max(0, Math.min(list.length, Math.floor(index)));
  return [...list.slice(0, i), id, ...list.slice(i)];
}

export interface PlaceTarget {
  view: string;
  /** Kanban: Spalte; fehlt = erste Spalte (bzw. die bisherige, wenn die Notiz schon im Board liegt). */
  col?: string;
  /** Position; fehlt = am Ende. */
  index?: number;
}

export type PlaceResult = { ok: true; ws: Workspace } | { ok: false; reason: 'missing' | 'full' };

/**
 * Notiz in eine Ansicht legen. Mit `from` wird sie dort herausgenommen (Verschieben); mit
 * `also` bleibt sie dort (Alt/⌥ bzw. „Auch hier zeigen …“). Liegt sie schon in der Ziel-Ansicht,
 * ändert sich nur der Platz (Grenze greift dann nicht).
 */
export function placeNote(ws: Workspace, noteId: string, to: PlaceTarget, opts: Act & { from?: string; also?: boolean } = {}): PlaceResult {
  const n = noteById(ws, noteId);
  const target = viewById(ws, to.view);
  if (!n || !target) return { ok: false, reason: 'missing' };
  const already = idsIn(target).includes(noteId);
  if (!already && !n.parent && countIn(ws, target) >= VIEW_MAX) return { ok: false, reason: 'full' };
  let next = ws;
  if (opts.from && opts.from !== to.view && !opts.also) next = patchView(next, opts.from, (v) => without(v, noteId));
  next = patchView(next, to.view, (v) => {
    if (v.kind !== 'kanban') {
      const ids = v.ids.filter((x) => x !== noteId);
      // Index bezieht sich auf die Liste ohne die Notiz selbst
      return { ...v, ids: insertAt(ids, noteId, to.index) };
    }
    const cols = v.cols ?? [];
    if (cols.length === 0) return v;
    const current = cols.find((c) => c.ids.includes(noteId));
    const colId = to.col && cols.some((c) => c.id === to.col) ? to.col : (current?.id ?? cols[0].id);
    return {
      ...v,
      cols: cols.map((c) => {
        const ids = c.ids.filter((x) => x !== noteId);
        return c.id === colId ? { ...c, ids: insertAt(ids, noteId, to.index) } : ids.length === c.ids.length ? c : { ...c, ids };
      }),
    };
  });
  const moved = !!opts.from && opts.from !== to.view && !opts.also;
  if (!already || moved) next = note(next, noteId, moved ? 'moved' : 'placed', opts, target.name, (x) => x);
  return { ok: true, ws: next };
}

/** Notiz aus einer Ansicht nehmen (die Notiz selbst bleibt in der Library). */
export function removeFromView(ws: Workspace, noteId: string, viewId: string, act: Act = {}): Workspace {
  const v = viewById(ws, viewId);
  if (!v || !idsIn(v).includes(noteId)) return ws;
  return note(patchView(ws, viewId, (x) => without(x, noteId)), noteId, 'removed', act, v.name, (x) => x);
}

export type ColumnResult = { ok: true; ws: Workspace; id: string } | { ok: false; reason: 'missing' | 'full' | 'last' };

export function addColumn(ws: Workspace, viewId: string, name: string, opts: { index?: number; makeId?: () => string } = {}): ColumnResult {
  const v = viewById(ws, viewId);
  if (!v || v.kind !== 'kanban') return { ok: false, reason: 'missing' };
  const cols = v.cols ?? [];
  if (cols.length >= COLUMN_MAX) return { ok: false, reason: 'full' };
  const id = (opts.makeId ?? newId)();
  const col: NoteColumn = { id, name: name.trim() || `Spalte ${cols.length + 1}`, ids: [] };
  const i = opts.index === undefined ? cols.length : Math.max(0, Math.min(cols.length, opts.index));
  return { ok: true, id, ws: patchView(ws, viewId, (x) => ({ ...x, cols: [...cols.slice(0, i), col, ...cols.slice(i)] })) };
}

export function renameColumn(ws: Workspace, viewId: string, colId: string, name: string): Workspace {
  if (!name.trim()) return ws;
  return patchView(ws, viewId, (v) => ({ ...v, cols: (v.cols ?? []).map((c) => (c.id === colId ? { ...c, name: name.trim() } : c)) }));
}

/** Spalte an neue Stelle (Tastatur: eins nach links/rechts). */
export function moveColumn(ws: Workspace, viewId: string, colId: string, index: number): Workspace {
  return patchView(ws, viewId, (v) => {
    const cols = v.cols ?? [];
    const c = cols.find((x) => x.id === colId);
    if (!c) return v;
    const rest = cols.filter((x) => x.id !== colId);
    const i = Math.max(0, Math.min(rest.length, index));
    return { ...v, cols: [...rest.slice(0, i), c, ...rest.slice(i)] };
  });
}

/** Spalte löschen – ihre Karten gehen an den linken Nachbarn (ganz links: an den rechten). Die letzte Spalte bleibt. */
export function removeColumn(ws: Workspace, viewId: string, colId: string): ColumnResult {
  const v = viewById(ws, viewId);
  const cols = v?.cols ?? [];
  const i = cols.findIndex((c) => c.id === colId);
  if (!v || i < 0) return { ok: false, reason: 'missing' };
  if (cols.length <= 1) return { ok: false, reason: 'last' };
  const to = i > 0 ? i - 1 : 1;
  const out = cols.map((c, k) => (k === to ? { ...c, ids: [...c.ids, ...cols[i].ids] } : c)).filter((_, k) => k !== i);
  return { ok: true, id: cols[to].id, ws: patchView(ws, viewId, (x) => ({ ...x, cols: out })) };
}

/** Eisenhower: Feld aus wichtig/dringend (1 = wichtig und dringend … 4 = weder noch). */
export function quadrantOf(n: Pick<Note, 'important' | 'urgent'>): 1 | 2 | 3 | 4 {
  if (n.important) return n.urgent ? 1 : 2;
  return n.urgent ? 3 : 4;
}

// ---------- Löschen und Rückgängig ----------

export interface NoteUndo {
  /** Gelöschte Notizen mit ihrer alten Stelle in der Library. */
  notes: { note: Note; index: number }[];
  /** Ansichten vor dem Löschen (nur die betroffenen). */
  views: NoteView[];
  /** Vorgänger-Listen anderer Notizen vor dem Löschen. */
  links: { id: string; after: NoteLink[] }[];
  /** Eltern der Unter-Notizen vor dem Hochziehen (nur bei keepChildren). */
  parents?: { id: string; parent?: string }[];
  /** Tabs, die auf eine gelöschte Notiz zeigten. */
  tabs: { panel: string; tab: string; note: string }[];
}

function clearTabRefs(panels: PanelMeta[], ids: Set<string>, key: 'note' | 'view', hit: { panel: string; tab: string; note: string }[]): PanelMeta[] {
  return panels.map((p) => {
    if (!p.tabs.some((t) => t[key] && ids.has(t[key]!))) return p;
    return {
      ...p,
      tabs: p.tabs.map((t) => {
        if (!t[key] || !ids.has(t[key]!)) return t;
        hit.push({ panel: p.id, tab: t.id, note: t[key]! });
        const { [key]: _x, ...rest } = t;
        return rest;
      }),
    };
  });
}

/** Unter-Notizen (alle Ebenen), die noch nicht erledigt oder archiviert sind. */
export function openDescendants(ws: Workspace, id: string): Note[] {
  return descendantsOf(ws, id).filter((d) => d.state !== 'done' && d.state !== 'archived');
}

/**
 * Notiz löschen – samt Unter-Notizen, oder mit `keepChildren` ohne sie: Die direkten
 * Unter-Notizen rutschen dann eine Ebene hoch (Eltern = Eltern der gelöschten Notiz).
 * Bezüge (Ansichten, Vorgänger, Anhänge, Tabs) werden gelöst; `undo` holt alles mit
 * restoreNotes zurück.
 */
export function deleteNote(ws: Workspace, id: string, opts: { keepChildren?: boolean } = {}): { ws: Workspace; undo: NoteUndo } | null {
  const n = noteById(ws, id);
  if (!n) return null;
  const gone = new Set([id, ...(opts.keepChildren ? [] : descendantsOf(ws, id).map((d) => d.id))]);
  const all = notesOf(ws);
  const undo: NoteUndo = { notes: [], views: [], links: [], tabs: [] };
  all.forEach((x, index) => gone.has(x.id) && undo.notes.push({ note: x, index }));
  const notes = all
    .filter((x) => !gone.has(x.id))
    .map((x) => {
      let out = x;
      if (x.parent === id) {
        (undo.parents ??= []).push({ id: x.id, parent: x.parent });
        out = { ...out };
        if (n.parent) out.parent = n.parent;
        else delete out.parent;
      }
      if (x.after?.some((l) => gone.has(l.id))) {
        undo.links.push({ id: x.id, after: x.after });
        const after = x.after.filter((l) => !gone.has(l.id));
        out = { ...out, after };
        if (after.length === 0) delete out.after;
      }
      if (x.attach?.some((a) => a.kind === 'note' && gone.has(a.ref))) {
        out = { ...out, attach: x.attach.filter((a) => !(a.kind === 'note' && gone.has(a.ref))) };
        if (!out.attach?.length) delete out.attach;
      }
      return out;
    });
  const views = viewsOf(ws).map((v) => {
    if (!idsIn(v).some((x) => gone.has(x))) return v;
    undo.views.push(v);
    let out = v;
    for (const g of gone) out = without(out, g);
    return out;
  });
  const panels = clearTabRefs(ws.panels, gone, 'note', undo.tabs);
  return { ws: { ...ws, panels, notes, noteViews: views }, undo };
}

/** Rückgängig für deleteNote. Zwischenzeitliche Änderungen an genau diesen Bezügen gehen dabei verloren. */
export function restoreNotes(ws: Workspace, undo: NoteUndo, act: Act = {}): Workspace {
  const notes = [...notesOf(ws)];
  const back = new Set(undo.notes.map((x) => x.note.id));
  for (const { note: n, index } of [...undo.notes].sort((a, b) => a.index - b.index)) {
    if (notes.some((x) => x.id === n.id)) continue;
    notes.splice(Math.min(index, notes.length), 0, { ...n, trail: addEvent(n.trail, 'restored', act) });
  }
  const links = new Map(undo.links.map((l) => [l.id, l.after]));
  const parents = new Map((undo.parents ?? []).map((p) => [p.id, p.parent]));
  const fixed = notes.map((x) => {
    let out = x;
    if (parents.has(x.id) && back.has(parents.get(x.id)!)) out = { ...out, parent: parents.get(x.id) };
    const after = links.get(x.id);
    if (after) out = { ...out, after: after.filter((l) => l.id === x.id || notes.some((y) => y.id === l.id)) };
    return out;
  });
  const before = new Map(undo.views.map((v) => [v.id, v]));
  const views = viewsOf(ws).map((v) => before.get(v.id) ?? v);
  const tabRefs = new Map(undo.tabs.map((t) => [`${t.panel}|${t.tab}`, t.note]));
  const panels = ws.panels.map((p) =>
    p.tabs.some((t) => tabRefs.has(`${p.id}|${t.id}`))
      ? { ...p, tabs: p.tabs.map((t) => (tabRefs.has(`${p.id}|${t.id}`) && !t.url && !t.view && back.has(tabRefs.get(`${p.id}|${t.id}`)!) ? { ...t, note: tabRefs.get(`${p.id}|${t.id}`)! } : t)) }
      : p,
  );
  return { ...ws, panels, notes: fixed, noteViews: views };
}

export interface ViewUndo {
  view: NoteView;
  index: number;
  tabs: { panel: string; tab: string; note: string }[];
}

/** Ansicht löschen – die Notizen darin bleiben in der Library. */
export function deleteView(ws: Workspace, id: string): { ws: Workspace; undo: ViewUndo } | null {
  const all = viewsOf(ws);
  const index = all.findIndex((v) => v.id === id);
  if (index < 0) return null;
  const tabs: ViewUndo['tabs'] = [];
  const panels = clearTabRefs(ws.panels, new Set([id]), 'view', tabs);
  const notes = notesOf(ws).map((n) => (n.delegated?.view === id ? { ...n, delegated: { to: n.delegated.to } } : n));
  return { ws: { ...ws, panels, notes, noteViews: all.filter((v) => v.id !== id) }, undo: { view: all[index], index, tabs } };
}

export function restoreView(ws: Workspace, undo: ViewUndo): Workspace {
  const views = [...viewsOf(ws)];
  if (views.some((v) => v.id === undo.view.id)) return ws;
  const known = new Set(notesOf(ws).map((n) => n.id));
  const keep = (ids: string[]) => ids.filter((x) => known.has(x));
  const v: NoteView = { ...undo.view, ids: keep(undo.view.ids), ...(undo.view.cols ? { cols: undo.view.cols.map((c) => ({ ...c, ids: keep(c.ids) })) } : {}) };
  views.splice(Math.min(undo.index, views.length), 0, v);
  const refs = new Map(undo.tabs.map((t) => [`${t.panel}|${t.tab}`, t.note]));
  const panels = ws.panels.map((p) => ({
    ...p,
    tabs: p.tabs.map((t) => (refs.has(`${p.id}|${t.id}`) && !t.url && !t.note ? { ...t, view: refs.get(`${p.id}|${t.id}`)! } : t)),
  }));
  return { ...ws, panels, noteViews: views };
}

// ---------- Speicher (parse) ----------

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const EVENT_KINDS = new Set<NoteEventKind>(['created', 'edited', 'state', 'parent', 'link', 'unlink', 'placed', 'moved', 'removed', 'delegated', 'forwarded', 'attached', 'restored']);
const ORIGIN_VIA = new Set<NoteOrigin['via']>(['hand', 'quick', 'voice', 'slot', 'import']);

function parseNote(v: unknown, catIds: Set<string>): Note | null {
  if (!isObj(v) || typeof v.id !== 'string' || !v.id) return null;
  const now = Date.now();
  const n: Note = {
    id: v.id,
    title: typeof v.title === 'string' ? v.title : '',
    text: typeof v.text === 'string' ? v.text : '',
    state: NOTE_STATES.includes(v.state as NoteState) ? (v.state as NoteState) : 'open',
    trail: Array.isArray(v.trail)
      ? v.trail
          .filter((e): e is Record<string, unknown> => isObj(e) && isNum(e.at) && EVENT_KINDS.has(e.what as NoteEventKind))
          .map((e) => ({ at: e.at as number, what: e.what as NoteEventKind, ...(typeof e.by === 'string' ? { by: e.by } : {}), ...(typeof e.detail === 'string' ? { detail: e.detail } : {}) }))
          .slice(-TRAIL_MAX)
      : [],
    created: isNum(v.created) ? v.created : now,
    changed: isNum(v.changed) ? v.changed : isNum(v.created) ? v.created : now,
  };
  if (n.state === 'waiting' && typeof v.waitReason === 'string' && v.waitReason.trim()) n.waitReason = v.waitReason;
  if (typeof v.parent === 'string' && v.parent !== n.id) n.parent = v.parent;
  if (Array.isArray(v.after)) {
    const after = v.after
      .filter((l): l is Record<string, unknown> => isObj(l) && typeof l.id === 'string' && l.id !== n.id && (l.kind === 'done' || l.kind === 'date'))
      .map((l) => ({ id: l.id as string, kind: l.kind as NoteLinkKind }));
    if (after.length) n.after = after;
  }
  if (typeof v.category === 'string' && catIds.has(v.category)) n.category = v.category;
  if (Array.isArray(v.tags)) {
    const tags = [...new Set(v.tags.filter((t): t is string => typeof t === 'string' && !!t.trim()).map((t) => t.trim()))];
    if (tags.length) n.tags = tags;
  }
  if (isObj(v.origin) && ORIGIN_VIA.has(v.origin.via as NoteOrigin['via']) && typeof v.origin.at === 'string') {
    n.origin = { via: v.origin.via as NoteOrigin['via'], at: v.origin.at, ...(typeof v.origin.by === 'string' ? { by: v.origin.by } : {}), ...(typeof v.origin.from === 'string' ? { from: v.origin.from } : {}) };
  }
  if (v.important === true) n.important = true;
  if (v.urgent === true) n.urgent = true;
  if (Array.isArray(v.attach)) {
    const attach = v.attach
      .filter((a): a is Record<string, unknown> => isObj(a) && (a.kind === 'file' || a.kind === 'note' || a.kind === 'source') && typeof a.ref === 'string')
      .map((a) => ({ kind: a.kind as NoteAttachment['kind'], ref: a.ref as string, ...(typeof a.name === 'string' ? { name: a.name } : {}) }));
    if (attach.length) n.attach = attach;
  }
  if (isObj(v.delegated) && typeof v.delegated.to === 'string' && v.delegated.to.trim())
    n.delegated = { to: v.delegated.to, ...(typeof v.delegated.view === 'string' ? { view: v.delegated.view } : {}) };
  if (Array.isArray(v.forwarded)) {
    const fw = v.forwarded.filter((f): f is Record<string, unknown> => isObj(f) && isNum(f.at) && typeof f.to === 'string').map((f) => ({ at: f.at as number, to: f.to as string }));
    if (fw.length) n.forwarded = fw;
  }
  if (isDay(v.notBefore)) n.notBefore = v.notBefore;
  if (isDay(v.due)) n.due = v.due;
  return n;
}

/** Notizen prüfen: Doppelte Ids fallen weg, Bezüge auf Unbekanntes werden gelöst, Eltern-Kreise aufgebrochen. */
export function parseNotes(v: unknown, catIds: Set<string>): Note[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const notes: Note[] = [];
  for (const raw of v) {
    const n = parseNote(raw, catIds);
    if (!n || seen.has(n.id)) continue;
    seen.add(n.id);
    notes.push(n);
  }
  const byId = new Map(notes.map((n) => [n.id, n]));
  for (const n of notes) {
    if (n.parent && !byId.has(n.parent)) delete n.parent;
    if (n.after) {
      n.after = n.after.filter((l, i, a) => byId.has(l.id) && a.findIndex((x) => x.id === l.id) === i);
      if (!n.after.length) delete n.after;
    }
  }
  // Eltern-Kreise (nur durch kaputte Daten möglich): am Kreis lösen
  for (const n of notes) {
    const path = new Set<string>([n.id]);
    let cur = n;
    while (cur.parent) {
      if (path.has(cur.parent)) {
        delete cur.parent;
        break;
      }
      path.add(cur.parent);
      cur = byId.get(cur.parent)!;
    }
  }
  // Vorgänger-Kreise: Bezug, der einen Kreis schließt, fällt weg
  const ws = { notes } as Workspace;
  for (const n of notes) {
    if (!n.after) continue;
    n.after = n.after.filter((l) => {
      const keep = !predPath(ws, l.id, n.id);
      return keep;
    });
    if (!n.after.length) delete n.after;
  }
  return notes;
}

/** Ansichten prüfen: nur bekannte Notizen, jede höchstens einmal je Ansicht, Grenzen eingehalten. */
export function parseNoteViews(v: unknown, noteIds: Set<string>, catIds: Set<string>): NoteView[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: NoteView[] = [];
  const clean = (ids: unknown, used: Set<string>) =>
    (Array.isArray(ids) ? ids : []).filter((x): x is string => typeof x === 'string' && noteIds.has(x) && !used.has(x) && !!used.add(x));
  for (const raw of v) {
    if (!isObj(raw) || typeof raw.id !== 'string' || seen.has(raw.id) || !VIEW_KINDS.includes(raw.kind as NoteViewKind)) continue;
    seen.add(raw.id);
    const kind = raw.kind as NoteViewKind;
    const used = new Set<string>();
    const view: NoteView = { id: raw.id, kind, name: typeof raw.name === 'string' && raw.name.trim() ? raw.name : VIEW_BASE[kind], ids: [] };
    if (kind === 'kanban') {
      const colIds = new Set<string>();
      const cols = (Array.isArray(raw.cols) ? raw.cols : [])
        .filter((c): c is Record<string, unknown> => isObj(c) && typeof c.id === 'string' && !colIds.has(c.id) && !!colIds.add(c.id))
        .slice(0, COLUMN_MAX)
        .map((c) => ({ id: c.id as string, name: typeof c.name === 'string' && c.name.trim() ? c.name : 'Spalte', ids: clean(c.ids, used) }));
      view.cols = cols.length ? cols : [{ id: `${raw.id}-1`, name: KANBAN_START[0], ids: [] }];
    } else view.ids = clean(raw.ids, used);
    if (typeof raw.category === 'string' && catIds.has(raw.category)) view.category = raw.category;
    if (raw.review === true) view.review = true;
    out.push(view);
  }
  // Delegiert an ein Board, das es nicht mehr gibt → nur der Name bleibt (Aufrufer setzt das an den Notizen)
  return out;
}

/** Nach dem Laden: Board-Bezüge in „delegiert“ auf bekannte Ansichten beschränken. */
export function fixDelegated(notes: Note[], viewIds: Set<string>): Note[] {
  return notes.map((n) => (n.delegated?.view && !viewIds.has(n.delegated.view) ? { ...n, delegated: { to: n.delegated.to } } : n));
}

// ---------- Slot-Datei (F-158) ----------

/** Notizen und Ansichten, auf die die Tabs dieser Portale zeigen (Notizen samt Unter-Notizen, Ansichten samt ihrer Notizen). */
export function notesForPanels(ws: Workspace, panels: readonly PanelMeta[]): { notes: Note[]; views: NoteView[] } {
  const viewIds = new Set(panels.flatMap((p) => p.tabs.map((t) => t.view).filter((x): x is string => !!x)));
  const views = viewsOf(ws).filter((v) => viewIds.has(v.id));
  const roots = new Set([...panels.flatMap((p) => p.tabs.map((t) => t.note).filter((x): x is string => !!x)), ...views.flatMap(idsIn)]);
  const ids = new Set<string>();
  for (const r of roots) {
    if (!noteById(ws, r)) continue;
    ids.add(r);
    for (const d of descendantsOf(ws, r)) ids.add(d.id);
  }
  return { notes: notesOf(ws).filter((n) => ids.has(n.id)), views };
}

/**
 * Notizen und Ansichten aus einer Datei mit neuen Ids übernehmen. Bezüge nach draußen
 * (Eltern, Vorgänger, Anhänge auf Notizen, Boards) fallen weg, wenn das Ziel nicht mitkam.
 * `catMap` ordnet Kategorie-Ids der Datei denen dieses Geräts zu.
 */
export function importNotes(
  ws: Workspace,
  notes: readonly Note[],
  views: readonly NoteView[],
  catMap: ReadonlyMap<string, string>,
  makeId: () => string = newId,
): { ws: Workspace; noteIds: Map<string, string>; viewIds: Map<string, string> } {
  const noteIds = new Map(notes.map((n) => [n.id, makeId()]));
  const viewIds = new Map(views.map((v) => [v.id, makeId()]));
  const mapIds = (ids: string[]) => ids.map((x) => noteIds.get(x)).filter((x): x is string => !!x);
  const outNotes: Note[] = notes.map((n) => {
    const out: Note = { ...n, id: noteIds.get(n.id)! };
    if (n.parent) {
      const p = noteIds.get(n.parent);
      if (p) out.parent = p;
      else delete out.parent;
    }
    if (n.after) {
      const after = n.after.filter((l) => noteIds.has(l.id)).map((l) => ({ ...l, id: noteIds.get(l.id)! }));
      if (after.length) out.after = after;
      else delete out.after;
    }
    if (n.attach) {
      const attach = n.attach.filter((a) => a.kind !== 'note' || noteIds.has(a.ref)).map((a) => (a.kind === 'note' ? { ...a, ref: noteIds.get(a.ref)! } : a));
      if (attach.length) out.attach = attach;
      else delete out.attach;
    }
    if (n.category) {
      const c = catMap.get(n.category);
      if (c) out.category = c;
      else delete out.category;
    }
    if (n.delegated?.view) out.delegated = viewIds.has(n.delegated.view) ? { to: n.delegated.to, view: viewIds.get(n.delegated.view)! } : { to: n.delegated.to };
    return out;
  });
  const outViews: NoteView[] = views.map((v) => {
    const out: NoteView = { ...v, id: viewIds.get(v.id)!, ids: mapIds(v.ids) };
    if (v.cols) out.cols = v.cols.map((c) => ({ ...c, id: makeId(), ids: mapIds(c.ids) }));
    if (v.category) {
      const c = catMap.get(v.category);
      if (c) out.category = c;
      else delete out.category;
    }
    return out;
  });
  return { ws: { ...ws, notes: [...notesOf(ws), ...outNotes], noteViews: [...viewsOf(ws), ...outViews] }, noteIds, viewIds };
}
