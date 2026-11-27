/**
 * F-206 Schritt 7 (V86): To-do, Kanban, Eisenhower – Logik der Sheets.
 *
 * Entscheidungen im Claude Doc „F-206 V86 – To-do, Kanban, Eisenhower (Schritt 7)“ (an Trello und
 * unserer UX/UI ausgerichtet). Alles reine Funktionen: Workspace rein, neuer Workspace raus.
 */
import type { ColState, Note, NoteColumn, NoteState, NoteView, Workspace } from './types';
import * as No from './notes';
import * as ND from './noteDoc';
import * as RS from './ruleSet';
import * as CFd from './cardFields';
import * as Mi from './mirrors';

// ---------- Kanban: Spalte ↔ Zustand (K2) ----------

/** Bedeutung einer Spalte: gesetzt, sonst aus dem Namen geraten (alte Boards), sonst „offen“. */
export function colStateOf(c: Pick<NoteColumn, 'name' | 'state'>): ColState {
  if (c.state) return c.state;
  const n = c.name.toLowerCase();
  if (/erledigt|fertig|done|abgeschlossen/.test(n)) return 'done';
  if (/prüf|review|abnahme|test/.test(n)) return 'review';
  if (/arbeit|doing|läuft|progress/.test(n)) return 'doing';
  return 'open';
}

export const COL_STATE_NAME: Record<ColState, string> = { open: 'offen', doing: 'in Arbeit', review: 'in Prüfung', done: 'erledigt' };

/** Zustand, den eine Karte in dieser Spalte bekommt (Abnahme macht aus „erledigt“ „in Prüfung“ – setState). */
const stateFor = (c: ColState): NoteState => c;

export function setColState(ws: Workspace, viewId: string, colId: string, state: ColState): Workspace {
  const v = No.viewById(ws, viewId);
  if (!v || v.kind !== 'kanban') return ws;
  const views = No.viewsOf(ws).map((x) => (x.id !== viewId ? x : { ...x, cols: (x.cols ?? []).map((c) => (c.id === colId ? { ...c, state } : c)) }));
  return { ...ws, noteViews: views };
}

/** WIP-Limit setzen (0 bzw. leer = ohne). */
export function setWip(ws: Workspace, viewId: string, colId: string, wip: number | undefined): Workspace {
  const v = No.viewById(ws, viewId);
  if (!v || v.kind !== 'kanban') return ws;
  const n = wip && wip > 0 ? Math.min(99, Math.floor(wip)) : undefined;
  const views = No.viewsOf(ws).map((x) =>
    x.id !== viewId
      ? x
      : {
          ...x,
          cols: (x.cols ?? []).map((c) => {
            if (c.id !== colId) return c;
            const out: NoteColumn = { ...c };
            if (n) out.wip = n;
            else delete out.wip;
            return out;
          }),
        },
  );
  return { ...ws, noteViews: views };
}

/** Karten einer Spalte, die zählen (Unter-Notizen zählen mit – sie liegen bewusst einzeln dort). */
/** Karten einer Spalte; mit `ws` ohne archivierte (V122: wie der Zähler am Spaltenkopf). */
export const cardsIn = (c: NoteColumn, ws?: Workspace): number => (ws ? c.ids.filter((id) => No.noteById(ws, id)?.state !== 'archived').length : c.ids.length);

/** Würde eine weitere Karte das WIP-Limit überschreiten? (K3: fragen, nicht sperren) */
export function overWip(c: NoteColumn, adding = 1, ws?: Workspace): boolean {
  return !!c.wip && cardsIn(c, ws) + adding > c.wip;
}

export function colOf(v: NoteView, noteId: string): NoteColumn | undefined {
  return (v.cols ?? []).find((c) => c.ids.includes(noteId));
}

/** Erste Spalte mit dieser Bedeutung. */
export function firstCol(v: NoteView, state: ColState): NoteColumn | undefined {
  return (v.cols ?? []).find((c) => colStateOf(c) === state);
}

export type CardResult = { ok: true; ws: Workspace } | { ok: false; reason: 'missing' | 'full' };

/**
 * Karte in eine Spalte legen (neu, verschieben innerhalb, oder aus einem anderen Sheet mit `from`) und den
 * Zustand der Notiz nach der Bedeutung der Spalte setzen (K2).
 */
export function moveCard(ws: Workspace, viewId: string, noteId: string, colId: string, index?: number, opts: No.Act & { from?: string; also?: boolean } = {}): CardResult {
  const v = No.viewById(ws, viewId);
  const col = v?.cols?.find((c) => c.id === colId);
  if (!v || !col) return { ok: false, reason: 'missing' };
  const before = colOf(v, noteId);
  // V127 (F-231 K9): auf einem Spiegel-Board ist die Spalte nur Anordnung – der Zustand folgt dem Heimat-Board
  const mirror = Mi.isMirror(ws, v, noteId);
  const r = No.placeNote(ws, noteId, { view: viewId, col: colId, index }, opts);
  if (!r.ok) return r;
  let next = r.ws;
  if (mirror) return { ok: true, ws: next };
  const n = No.noteById(next, noteId);
  const want = stateFor(colStateOf(col));
  if (n && (before?.id !== colId || !matches(n.state, want))) next = No.setState(next, noteId, want, opts);
  return { ok: true, ws: next };
}

/** V88 (F/K4 „V“): Ziele für „Verschieben nach …“ – alle anderen Sheets außer der Matrix (die ordnet nach wichtig/dringend). */
export function moveTargets(ws: Workspace, from: string): NoteView[] {
  return No.viewsOf(ws).filter((v) => v.id !== from && v.kind !== 'eisenhower');
}

/**
 * V88: Notiz aus einem Sheet in ein anderes verschieben. Im Kanban landet sie in der ersten Spalte,
 * die zu ihrem Zustand passt (erledigt → erste Erledigt-Spalte, in Arbeit → erste In-Arbeit-Spalte),
 * sonst in der ersten Spalte; der Zustand bleibt dabei, wo er passt.
 */
export function moveToSheet(ws: Workspace, noteId: string, from: string, to: string, act: No.Act = {}): CardResult {
  const n = No.noteById(ws, noteId);
  const v = No.viewById(ws, to);
  if (!n || !v) return { ok: false, reason: 'missing' };
  if (v.kind !== 'kanban') return No.placeNote(ws, noteId, { view: to }, { ...act, from });
  const cols = v.cols ?? [];
  const st: ColState = n.state === 'done' || n.state === 'archived' ? 'done' : n.state === 'review' ? 'review' : n.state === 'doing' ? 'doing' : 'open';
  const col = cols.find((c) => colStateOf(c) === st) ?? (st === 'review' ? cols.find((c) => colStateOf(c) === 'done') : undefined) ?? cols[0];
  if (!col) return { ok: false, reason: 'missing' };
  // V127 (K9): ein Spiegel bleibt beim Verschieben in ein anderes Kanban ein Spiegel (seine Heimat bleibt)
  const wasMirror = Mi.isMirror(ws, No.viewById(ws, from), noteId);
  const r = moveCard(ws, to, noteId, col.id, undefined, { ...act, from });
  return r.ok ? { ok: true, ws: Mi.carryMark(r.ws, wasMirror, to, noteId) } : r;
}

/** „in Prüfung“ zählt in einer Erledigt-Spalte als passend (Abnahme läuft). */
function matches(state: NoteState, want: NoteState): boolean {
  return state === want || (want === 'done' && state === 'review');
}

/**
 * Notiz wurde anderswo erledigt bzw. wieder geöffnet → in jedem Kanban, auf dem sie liegt, in die erste
 * passende Spalte wandern (K2). Liegt sie schon in einer passenden Spalte, bleibt sie.
 */
export function syncBoards(ws: Workspace, noteId: string): Workspace {
  const n = No.noteById(ws, noteId);
  if (!n) return ws;
  let next = ws;
  for (const v of No.viewsWith(ws, noteId)) {
    if (v.kind !== 'kanban' || Mi.isMirror(ws, v, noteId)) continue; // V127 (K9): Spiegel bleiben, wo sie liegen
    const cur = colOf(v, noteId);
    if (!cur) continue;
    const cs = colStateOf(cur);
    const want: ColState | null = n.state === 'done' || n.state === 'review' ? (cs === 'done' || cs === 'review' ? null : 'done') : cs === 'done' ? 'open' : null;
    if (!want) continue;
    const to = firstCol(v, want);
    if (!to || to.id === cur.id) continue;
    const r = No.placeNote(next, noteId, { view: v.id, col: to.id });
    if (r.ok) next = r.ws;
  }
  return next;
}

// ---------- Kanban: Spalten-Menü (K1, V87) ----------

export type ColSort = 'due' | 'important' | 'title' | 'votes' | `f:${string}`;
export const COL_SORTS: readonly ColSort[] = ['due', 'important', 'title'];
export const COL_SORT_NAME: Record<'due' | 'important' | 'title' | 'votes', string> = { due: 'Fälligkeit', important: 'Wichtigkeit', title: 'Titel (A–Z)', votes: 'Stimmen (meiste zuerst)' };

/** Spalte einmal sortieren (wie Trello „Liste sortieren nach …“): ändert die Reihenfolge der Karten dauerhaft. */
export function sortCol(ws: Workspace, viewId: string, colId: string, by: ColSort): Workspace {
  const v = No.viewById(ws, viewId);
  const col = v?.cols?.find((c) => c.id === colId);
  if (!v || !col) return ws;
  const list = col.ids.map((id) => No.noteById(ws, id)).filter((n): n is Note => !!n);
  // V125 (F-231 K8): nach Stimmen bzw. nach einem eigenen Feld
  const fdef = by.startsWith('f:') ? CFd.fieldById(v, by.slice(2)) : undefined;
  if (by.startsWith('f:') && !fdef) return ws;
  const sorted =
    by === 'title'
      ? [...list].sort((a, b) => (No.titleOf(No.shownNote(a)) || '').localeCompare(No.titleOf(No.shownNote(b)) || '', 'de'))
      : by === 'votes'
        ? CFd.sortByVotes(list)
        : fdef
          ? CFd.sortByField(list, fdef)
          : sortNotes(list, by as 'due' | 'important');
  const ids = [...sorted.map((n) => n.id), ...col.ids.filter((id) => !list.some((n) => n.id === id))];
  const views = No.viewsOf(ws).map((x) => (x.id !== viewId ? x : { ...x, cols: (x.cols ?? []).map((c) => (c.id === colId ? { ...c, ids } : c)) }));
  return { ...ws, noteViews: views };
}

/** „Alle Karten dieser Spalte verschieben …“ (wie Trello): ans Ende der Ziel-Spalte, Zustand nach deren Bedeutung. */
export function moveAllCards(ws: Workspace, viewId: string, fromCol: string, toCol: string, act: No.Act = {}): Workspace {
  const v = No.viewById(ws, viewId);
  const from = v?.cols?.find((c) => c.id === fromCol);
  if (!v || !from || fromCol === toCol || !v.cols?.some((c) => c.id === toCol)) return ws;
  let next = ws;
  for (const id of from.ids) {
    const r = moveCard(next, viewId, id, toCol, undefined, act);
    if (r.ok) next = r.ws;
  }
  return next;
}

/** Platz einer Karte für Ansagen: Spalte, Platz (ab 1) und Zahl der Karten dort. */
export function cardPlace(v: NoteView, noteId: string): { col: NoteColumn; pos: number; of: number } | null {
  const col = colOf(v, noteId);
  return col ? { col, pos: col.ids.indexOf(noteId) + 1, of: col.ids.length } : null;
}

// ---------- Schloss (L1) ----------

/** Sheets, die über „erledigt“ bestimmen: Kanbans und Sheets mit Abnahme, auf denen die Notiz liegt. */
export function flowsOf(ws: Workspace, noteId: string): NoteView[] {
  // V127 (K9): Spiegel-Boards bestimmen nicht – dort ist der Haken gesperrt, erledigt wird in der Heimat gesetzt
  return No.viewsWith(ws, noteId).filter((v) => (v.kind === 'kanban' ? !Mi.isMirror(ws, v, noteId) : !!v.review));
}

/**
 * Ist der Haken hier gesperrt? Ja, wenn die Notiz auf einem Ablauf-Sheet liegt und `here` keins davon ist.
 * Rückgabe: die Sheets, in denen erledigt gesetzt wird (leer = frei).
 */
export function lockOf(ws: Workspace, noteId: string, here?: string): NoteView[] {
  if (RS.switchOf(ws, 'lock') === 'off') return []; // F-218 A3 (V92): Schloss ausgeschaltet
  const flows = flowsOf(ws, noteId);
  if (here && flows.some((v) => v.id === here)) return [];
  return flows;
}

/** Haken setzen/lösen (frei abhakbar); Kanbans ziehen nach (K2). Gesperrt → unverändert. */
export function toggleDone(ws: Workspace, noteId: string, here: string | undefined, act: No.Act = {}): Workspace {
  const n = No.noteById(ws, noteId);
  if (!n || lockOf(ws, noteId, here).length) return ws;
  const done = n.state === 'done' || n.state === 'review';
  const next = No.setState(ws, noteId, done ? 'open' : 'done', act);
  return syncBoards(next, noteId);
}

// ---------- To-do (T2, T3) ----------

/** Neue Aufgabe: Titel als Überschrift H1 im Text (wie die Vorlagen des Steuerknopfs, V71). */
export const headText = (title: string) => `# ${ND.escInline(title.trim())}`;

/** Titel ändern (F2): steht oben eine Überschrift, wird sie umgeschrieben, sonst das Titelfeld gesetzt. */
export function renameTask(ws: Workspace, noteId: string, title: string, act: No.Act = {}): Workspace {
  const n = No.noteById(ws, noteId);
  const t = title.trim();
  if (!n || !t) return ws;
  const lines = n.text.split('\n');
  const i = lines.findIndex((l) => l.trim() !== '');
  if (!n.title && i >= 0 && /^#{1,6}\s/.test(lines[i])) {
    lines[i] = lines[i].replace(/^(#{1,6}\s+).*$/, `$1${ND.escInline(t)}`);
    return No.updateNote(ws, noteId, { text: lines.join('\n') }, act);
  }
  return No.updateNote(ws, noteId, { title: t }, act);
}

export type TodoOrder = 'own' | 'due' | 'important';
export const TODO_ORDERS: readonly TodoOrder[] = ['own', 'due', 'important'];
export const TODO_ORDER_NAME: Record<TodoOrder, string> = { own: 'Eigene', due: 'Fällig', important: 'Wichtig' };

export interface Row {
  note: Note;
  depth: number;
}

const finished = (n: Note) => n.state === 'done' || n.state === 'archived' || n.state === 'review';

/**
 * Zeilen eines To-do-Sheets: oben die Notizen des Sheets in der gewählten Ordnung, darunter eingerückt
 * ihre Unter-Notizen (die nicht selbst im Sheet liegen). `open` = Erledigte weglassen.
 */
export function todoRows(ws: Workspace, v: NoteView, order: TodoOrder = 'own', show: 'open' | 'all' = 'open', now = Date.now()): { rows: Row[]; done: Note[] } {
  const ids = No.idsIn(v);
  const inSheet = new Set(ids);
  let top = ids.map((id) => No.noteById(ws, id)).filter((n): n is Note => !!n && !(n.parent && inSheet.has(n.parent)));
  top = sortNotes(top, order);
  const rows: Row[] = [];
  const done: Note[] = [];
  const walk = (n: Note, depth: number) => {
    if (show === 'open' && finished(n) && RS.foldsDone(ws, n, now)) {
      if (depth === 0) done.push(n);
      return;
    }
    rows.push({ note: n, depth });
    for (const c of No.childrenOf(ws, n.id)) if (!inSheet.has(c.id)) walk(c, depth + 1);
  };
  for (const n of top) walk(n, 0);
  return { rows, done };
}

const prio = (n: Note) => (n.important ? 0 : 2) + (n.urgent ? 0 : 1);

export function sortNotes(list: Note[], order: TodoOrder): Note[] {
  if (order === 'own') return list;
  const idx = new Map(list.map((n, i) => [n.id, i]));
  return [...list].sort((a, b) => {
    if (order === 'due') {
      const da = a.due ?? '9999', db = b.due ?? '9999';
      if (da !== db) return da < db ? -1 : 1;
    } else {
      const d = prio(a) - prio(b);
      if (d) return d;
    }
    return idx.get(a.id)! - idx.get(b.id)!;
  });
}

/** Neue Aufgabe im Sheet (oben im To-do am Ende; Kanban in Spalte; Matrix ungeordnet). */
export function addTask(ws: Workspace, viewId: string, title: string, opts: No.Act & { col?: string; index?: number; id?: string } = {}): { ws: Workspace; id: string } | null {
  const v = No.viewById(ws, viewId);
  if (!v || !title.trim()) return null;
  // V120: Karten auf dem Kanban eines Projekts gehören zum Projekt
  const pj = v.owner?.kind === 'project' ? { project: v.owner.id } : {};
  const c = No.createNote(ws, { title: '', text: headText(title), ...pj }, opts);
  if (v.kind === 'kanban') {
    const col = opts.col ?? v.cols?.[0]?.id;
    if (!col) return null;
    const r = moveCard(c.ws, viewId, c.id, col, opts.index, opts);
    return r.ok ? { ws: r.ws, id: c.id } : null;
  }
  const r = No.placeNote(c.ws, c.id, { view: viewId, index: opts.index }, opts);
  return r.ok ? { ws: r.ws, id: c.id } : null;
}

/** Eintrag innerhalb des Sheets um `by` Plätze verschieben (Tastatur Alt+Pfeil bzw. Aufnehmen + Pfeil). */
export function shiftIn(ws: Workspace, viewId: string, noteId: string, by: number): Workspace {
  const v = No.viewById(ws, viewId);
  if (!v) return ws;
  if (v.kind === 'kanban') {
    const c = colOf(v, noteId);
    if (!c) return ws;
    const i = c.ids.indexOf(noteId) + by;
    const r = No.placeNote(ws, noteId, { view: viewId, col: c.id, index: Math.max(0, Math.min(c.ids.length - 1, i)) });
    return r.ok ? r.ws : ws;
  }
  const i = v.ids.indexOf(noteId);
  if (i < 0) return ws;
  const r = No.placeNote(ws, noteId, { view: viewId, index: Math.max(0, Math.min(v.ids.length - 1, i + by)) });
  return r.ok ? r.ws : ws;
}

// ---------- Checkliste (T1, wie Trello) ----------

/** Fortschritt der Checkliste im Text (`null` = keine Checkliste). */
export function checklistOf(n: Pick<Note, 'text'>): { done: number; all: number } | null {
  const t = ND.taskCount(n.text);
  return t.all ? t : null;
}

/** Text der n-ten Checklisten-Zeile (0-basiert über alle Aufgaben-Zeilen). */
export function checklistItems(n: Pick<Note, 'text'>): { text: string; done: boolean }[] {
  return ND.parseDoc(n.text)
    .filter((b) => b.k === 'task')
    .map((b) => ({ text: ND.plainOf(ND.parseInline(b.text)), done: !!b.done }));
}

/**
 * „In Aufgabe umwandeln“: Punkt `index` der Checkliste wird eine eigene Notiz im selben Sheet (Kanban: dieselbe
 * Spalte, direkt unter der Karte; sonst direkt darunter) und verschwindet aus der Checkliste.
 */
export function checklistToTask(ws: Workspace, noteId: string, index: number, viewId: string | undefined, act: No.Act & { id?: string } = {}): { ws: Workspace; id: string } | null {
  const n = No.noteById(ws, noteId);
  if (!n) return null;
  const blocks = ND.parseDoc(n.text);
  let k = -1;
  const at = blocks.findIndex((b) => b.k === 'task' && ++k === index);
  if (at < 0) return null;
  const item = blocks[at];
  const title = ND.plainOf(ND.parseInline(item.text)).trim() || 'Aufgabe';
  let next = No.updateNote(ws, noteId, { text: ND.serializeDoc(blocks.filter((_, i) => i !== at)) }, act);
  const c = No.createNote(next, { title: '', text: headText(title), state: item.done ? 'done' : 'open' }, act);
  next = c.ws;
  const from = `${No.titleOf(n)} (Checkliste)`;
  next = { ...next, notes: No.notesOf(next).map((x) => (x.id === c.id ? { ...x, trail: [{ ...x.trail[0], detail: from }] } : x)) };
  const v = viewId ? No.viewById(next, viewId) : undefined;
  if (v) {
    if (v.kind === 'kanban') {
      const col = colOf(v, noteId) ?? v.cols?.[0];
      if (col) {
        const r = moveCard(next, v.id, c.id, col.id, col.ids.includes(noteId) ? col.ids.indexOf(noteId) + 1 : undefined, act);
        if (r.ok) next = r.ws;
      }
    } else {
      const i = v.ids.indexOf(noteId);
      const r = No.placeNote(next, c.id, { view: v.id, index: i >= 0 ? i + 1 : undefined }, act);
      if (r.ok) next = r.ws;
    }
  }
  return { ws: next, id: c.id };
}

// ---------- Eisenhower (E1–E4) ----------

/** Felder: 1 erledigen · 2 planen · 3 delegieren · 4 ablegen (V87: Lage wie im Original, siehe QUAD_CELL). */
export type Quad = 1 | 2 | 3 | 4;
export const QUAD_NAME: Record<Quad, string> = { 1: 'erledigen', 2: 'planen', 3: 'delegieren', 4: 'ablegen' };
export const QUAD_HINT: Record<Quad, string> = {
  1: 'wichtig und dringend – selbst und sofort erledigen',
  2: 'wichtig, nicht dringend – Termin setzen und planen',
  3: 'dringend, nicht wichtig – an jemand anderen geben',
  4: 'weder wichtig noch dringend – Vorentscheidung zum Löschen; endgültig erst im Mülleimer',
};
/**
 * Lage im Raster: [Zeile, Spalte] – wie im Original (V87, Enrico): oben wichtig, links dringend.
 * Oben links erledigen, oben rechts planen, unten links delegieren, unten rechts ablegen (mit Mülleimer).
 */
export const QUAD_CELL: Record<Quad, [number, number]> = { 1: [0, 0], 2: [0, 1], 3: [1, 0], 4: [1, 1] };
export const quadAt = (row: number, col: number): Quad => (row === 0 ? (col === 0 ? 1 : 2) : col === 0 ? 3 : 4);

/** Noch nie eingeordnet (E2)? */
export const unsorted = (n: Pick<Note, 'important' | 'urgent'>) => n.important === undefined && n.urgent === undefined;

/**
 * Inhalt der Matrix (E3): hineingelegte Notizen plus alle offenen Notizen mit gesetztem wichtig oder dringend.
 * `show` wie überall: offen bzw. alle.
 */
export function matrixOf(ws: Workspace, v: NoteView, show: 'open' | 'all' = 'open'): { unsorted: Note[]; quads: Record<Quad, Note[]>; done: number } {
  const own = new Set(No.idsIn(v));
  const seen = new Set<string>();
  const list: Note[] = [];
  for (const id of v.ids) {
    const n = No.noteById(ws, id);
    if (n && !seen.has(n.id)) list.push(n), seen.add(n.id);
  }
  for (const n of No.notesOf(ws)) if (!seen.has(n.id) && !own.has(n.id) && (n.important || n.urgent) && !finished(n) && !n.unsaved) list.push(n), seen.add(n.id);
  const out = { unsorted: [] as Note[], quads: { 1: [], 2: [], 3: [], 4: [] } as Record<Quad, Note[]>, done: 0 };
  for (const n of list) {
    if (finished(n)) {
      out.done++;
      if (show === 'open') continue;
    }
    if (unsorted(n)) out.unsorted.push(n);
    else out.quads[No.quadrantOf(n)].push(n);
  }
  return out;
}

/** In ein Feld legen = Schalter setzen (E4: sonst geschieht nichts); liegt sie noch nicht im Sheet, wird sie hineingelegt. */
export function setQuad(ws: Workspace, viewId: string, noteId: string, q: Quad, act: No.Act = {}): Workspace {
  const important = q === 1 || q === 2;
  const urgent = q === 1 || q === 3;
  let next = No.updateNote(ws, noteId, { important, urgent }, act);
  const v = No.viewById(next, viewId);
  if (v && !v.ids.includes(noteId)) {
    const r = No.placeNote(next, noteId, { view: viewId }, act);
    if (r.ok) next = r.ws;
  }
  return next;
}

/** Die eine Matrix (E3: genau eine je Person – lokal gibt es nur „mich“). */
export function theMatrix(ws: Workspace): NoteView | undefined {
  return No.viewsOf(ws).find((v) => v.kind === 'eisenhower');
}

// ---------- Filter (S3) ----------

/** Filtern im Sheet: Titel, Text, Tags (wie die Suche im Notizblock). */
export const matchesFilter = (n: Note, q: string) => !q.trim() || No.noteMatches(n, q);

// ---------- Abbild im Cockpit (V87, Entscheidung BC1–BC3) ----------

export interface ColSummary { id: string; name: string; state: ColState; count: number; wip?: number; over: boolean; review: number; /** V126 (K11) */ color?: string }

/** BC1: Mini-Board – je Spalte Bedeutung, Zahl der Karten, WIP und wie viele auf die Abnahme warten. */
export function boardSummary(ws: Workspace, v: NoteView): ColSummary[] {
  return (v.cols ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    state: colStateOf(c),
    count: cardsIn(c, ws),
    ...(c.wip ? { wip: c.wip } : {}),
    over: overWip(c, 0, ws),
    review: c.ids.filter((id) => No.noteById(ws, id)?.state === 'review').length,
    ...(c.color ? { color: c.color } : {}),
  }));
}

/** BC3: To-do als Fortschritt – erledigt von allen (ohne archivierte). */
export function todoSummary(ws: Workspace, v: NoteView): { done: number; all: number } {
  const list = No.idsIn(v).map((id) => No.noteById(ws, id)).filter((n): n is Note => !!n && n.state !== 'archived');
  return { done: list.filter((n) => n.state === 'done').length, all: list.length };
}

/** BC3 (Enrico): Übersicht der Matrizen – offene Karten je Feld, noch nicht eingeordnet, erledigt. */
export function matrixSummary(ws: Workspace, v: NoteView): { quads: Record<Quad, number>; unsorted: number; open: number; done: number } {
  const m = matrixOf(ws, v, 'open');
  const quads = { 1: m.quads[1].length, 2: m.quads[2].length, 3: m.quads[3].length, 4: m.quads[4].length } as Record<Quad, number>;
  return { quads, unsorted: m.unsorted.length, open: m.unsorted.length + quads[1] + quads[2] + quads[3] + quads[4], done: m.done };
}

/** Alle Matrizen (heute genau eine; mit Personen in Schritt 8 mehrere). */
export const matricesOf = (ws: Workspace): NoteView[] => No.viewsOf(ws).filter((v) => v.kind === 'eisenhower');

// ---------- F-218 (V92): Wenn-dann-Regeln W1/W2 nach jeder Änderung ----------

/**
 * Nach einer Änderung: W1 – eine Notiz ist erledigt geworden → Kästchen abhaken; W2 – die letzte offene Kästchen
 * wurde gerade abgehakt → in jedem Kanban eine Spalte weiter (bei „Abnahme nötig“ landet sie über setState in
 * „in Prüfung“). Nur Übergänge zählen (vorher nicht erledigt bzw. nicht alle abgehakt) – so rückt eine Karte je
 * fertiger Checkliste genau einmal weiter. Rein; `prev` = Arbeitsfläche vor der Änderung.
 */
export function applyWhenRules(prev: Workspace, next: Workspace, now = Date.now()): Workspace {
  if (prev.notes === next.notes) return next;
  const w1 = RS.whenOn(next, 'doneChecks');
  const w2 = RS.whenOn(next, 'checksNext');
  if (!w1 && !w2) return next;
  const old = new Map(No.notesOf(prev).map((n) => [n.id, n]));
  let out = next;
  for (const n of No.notesOf(next)) {
    const o = old.get(n.id);
    if (!o || o === n) continue;
    if (w1 && n.state === 'done' && o.state !== 'done') out = RS.onDone(out, n.id, now);
    const cur = No.noteById(out, n.id);
    if (w2 && cur && RS.allChecked(cur.text ?? '') && !RS.allChecked(o.text ?? '') && RS.shouldAdvance(out, cur)) {
      for (const v of No.viewsWith(out, n.id)) {
        if (v.kind !== 'kanban') continue;
        const cols = v.cols ?? [];
        const i = cols.findIndex((c) => c.ids.includes(n.id));
        if (i < 0 || i >= cols.length - 1) continue;
        const r = moveCard(out, v.id, n.id, cols[i + 1].id, undefined, { by: RS.ruleBy('checksNext'), now });
        if (r.ok) out = r.ws;
      }
    }
  }
  return out;
}
