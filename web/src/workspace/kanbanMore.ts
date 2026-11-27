/**
 * V121 (F-231, Bauplan K3 und K1): Kanban mindestens wie Trello – Spalten archivieren, wiederherstellen und
 * kopieren, alle Karten einer Spalte in ein anderes Sheet; Karten kopieren (mit Auswahl, was mitkommt),
 * archivieren und wiederherstellen, Kartenvorlagen. Reine Funktionen, Bauteile in KanbanSheet.tsx / KanbanArchive.tsx.
 */
import type { Note, NoteColumn, NoteView, Workspace } from './types';
import * as No from './notes';
import * as Sh from './sheets';
import { newId } from './workspace';

type Act = No.Act & { makeId?: () => string };

function patchView(ws: Workspace, id: string, fn: (v: NoteView) => NoteView): Workspace {
  return { ...ws, noteViews: No.viewsOf(ws).map((v) => (v.id === id ? fn(v) : v)) };
}

// ---------- K3 Spalten ----------

export type ColResult = { ok: true; ws: Workspace; id: string } | { ok: false; reason: 'missing' | 'last' | 'full' };

/** Spalte archivieren (wie Trello „Liste archivieren“): Spalte samt Karten aus dem Board ins Archiv; die letzte bleibt. */
export function archiveColumn(ws: Workspace, viewId: string, colId: string, now = Date.now()): ColResult {
  const v = No.viewById(ws, viewId);
  const cols = v?.cols ?? [];
  const i = cols.findIndex((c) => c.id === colId);
  if (!v || i < 0) return { ok: false, reason: 'missing' };
  if (cols.length <= 1) return { ok: false, reason: 'last' };
  const col: NoteColumn = { ...cols[i], archivedAt: now, archivedFrom: i };
  return {
    ok: true,
    id: colId,
    ws: patchView(ws, viewId, (x) => ({ ...x, cols: cols.filter((c) => c.id !== colId), archivedCols: [col, ...(x.archivedCols ?? [])].slice(0, No.ARCHIVED_COL_MAX) })),
  };
}

/** Archivierte Spalte zurück an ihre alte Stelle (bzw. ans Ende); Karten kommen mit. */
export function restoreColumn(ws: Workspace, viewId: string, colId: string): ColResult {
  const v = No.viewById(ws, viewId);
  const arch = v?.archivedCols ?? [];
  const a = arch.find((c) => c.id === colId);
  if (!v || !a) return { ok: false, reason: 'missing' };
  const cols = v.cols ?? [];
  if (cols.length >= No.COLUMN_MAX) return { ok: false, reason: 'full' };
  const { archivedAt: _a, archivedFrom, ...col } = a;
  const at = Math.min(cols.length, archivedFrom ?? cols.length);
  const rest = arch.filter((c) => c.id !== colId);
  return {
    ok: true,
    id: colId,
    ws: patchView(ws, viewId, (x) => {
      const out: NoteView = { ...x, cols: [...cols.slice(0, at), col, ...cols.slice(at)] };
      if (rest.length) out.archivedCols = rest;
      else delete out.archivedCols;
      return out;
    }),
  };
}

/** Name einer Kopie: „Name (Kopie)“, bei Bedarf mit Nummer. */
export function copyName(name: string, taken: readonly string[]): string {
  const base = `${name} (Kopie)`;
  if (!taken.includes(base)) return base;
  for (let k = 2; ; k++) if (!taken.includes(`${name} (Kopie ${k})`)) return `${name} (Kopie ${k})`;
}

/** Spalte kopieren (wie Trello „Liste kopieren“): neue Spalte rechts daneben, Karten als Kopien (alles kommt mit). */
export function copyColumn(ws: Workspace, viewId: string, colId: string, name?: string, act: Act = {}): ColResult & { cards?: number } {
  const v = No.viewById(ws, viewId);
  const cols = v?.cols ?? [];
  const i = cols.findIndex((c) => c.id === colId);
  if (!v || i < 0) return { ok: false, reason: 'missing' };
  if (cols.length >= No.COLUMN_MAX) return { ok: false, reason: 'full' };
  const make = act.makeId ?? newId;
  const src = cols[i];
  const r = No.addColumn(ws, viewId, (name ?? '').trim() || copyName(src.name, cols.map((c) => c.name)), { index: i + 1, makeId: make });
  if (!r.ok) return { ok: false, reason: 'full' };
  let next = patchView(r.ws, viewId, (x) => ({ ...x, cols: (x.cols ?? []).map((c) => (c.id === r.id ? { ...c, ...(src.state ? { state: src.state } : {}), ...(src.wip ? { wip: src.wip } : {}) } : c)) }));
  let cards = 0;
  for (const id of src.ids) {
    const n = No.noteById(next, id);
    if (!n || n.state === 'archived') continue;
    const c = copyNote(next, id, ALL_KEEP, { ...act, id: make() });
    if (!c) continue;
    const m = Sh.moveCard(c.ws, viewId, c.id, r.id, undefined, act);
    if (m.ok) (next = m.ws), cards++;
  }
  return { ok: true, id: r.id, ws: next, cards };
}

/** Alle Karten einer Spalte in ein anderes Sheet (Kanban: erste Spalte, die zum Zustand passt; wie Trello „Liste verschieben“). */
export function moveColumnCards(ws: Workspace, viewId: string, colId: string, toView: string, act: No.Act = {}): { ws: Workspace; moved: number } {
  const col = No.viewById(ws, viewId)?.cols?.find((c) => c.id === colId);
  if (!col || toView === viewId || !No.viewById(ws, toView)) return { ws, moved: 0 };
  let next = ws;
  let moved = 0;
  for (const id of col.ids) {
    const r = Sh.moveToSheet(next, id, viewId, toView, act);
    if (r.ok) (next = r.ws), moved++;
  }
  return { ws: next, moved };
}

// ---------- K1 Karten ----------

/** Was beim Kopieren mitkommt (wie Trello: Checklisten, Labels, Mitglieder, Termine, Anhänge). */
export interface CopyKeep {
  checklist: boolean;
  tags: boolean;
  persons: boolean;
  dates: boolean;
  sources: boolean;
}
export const ALL_KEEP: CopyKeep = { checklist: true, tags: true, persons: true, dates: true, sources: true };
export const KEEP_KEYS: readonly (keyof CopyKeep)[] = ['checklist', 'tags', 'persons', 'dates', 'sources'];

/** Text ohne Checklisten (Aufgaben-Zeilen und „### ☑ Name“-Köpfe). */
export function withoutChecklists(text: string): string {
  return text
    .split('\n')
    .filter((l) => !/^\s*[-*+] \[[ xX]\] /.test(l) && !/^#{1,6} ☑/.test(l))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
}

/**
 * Notiz kopieren: gleicher Inhalt, Art, Projekt, Kategorie, wichtig/dringend, Aufwand; je nach `keep` Checkliste,
 * Tags, Personen (zuständig, Einsatz, delegiert), Termine (nicht vor, fällig, Erinnerung) und Quellen/Anhänge.
 * Nicht mit: Spur (neu), Vorgänger, Eltern, Entwurf, Fremddaten, Vorlage-Kennzeichen. Zustand „offen“.
 */
export function copyNote(ws: Workspace, id: string, keep: CopyKeep = ALL_KEEP, act: No.Act & { id?: string; title?: string } = {}): { ws: Workspace; id: string } | null {
  const src = No.noteById(ws, id);
  if (!src) return null;
  const n = No.shownNote(src);
  const init: No.NoteInit = {
    title: act.title !== undefined ? act.title.trim() : n.title,
    text: keep.checklist ? n.text : withoutChecklists(n.text),
    state: 'open',
  };
  if (act.title !== undefined && !n.title && act.title.trim()) init.text = retitle(init.text ?? '', act.title.trim());
  if (act.title !== undefined && !n.title) init.title = '';
  const same = ['category', 'important', 'urgent', 'type', 'project', 'effort', 'cost', 'milestone', 'phase', 'duration', 'results', 'accept', 'risk', 'change', 'procure', 'wp', 'cover'] as const;
  for (const k of same) if (n[k] !== undefined) (init as Record<string, unknown>)[k] = structuredCopy(n[k]);
  if (!('project' in init)) init.project = undefined;
  if (keep.tags && n.tags?.length) init.tags = [...n.tags];
  if (keep.persons) {
    if (n.assignee) init.assignee = n.assignee;
    if (n.use?.length) init.use = structuredCopy(n.use);
    if (n.delegated) init.delegated = { ...n.delegated };
  }
  if (keep.dates) {
    if (n.notBefore) init.notBefore = n.notBefore;
    if (n.due) init.due = n.due;
    if (n.dueTime) init.dueTime = n.dueTime;
    if (n.remind) init.remind = structuredCopy(n.remind);
  }
  if (keep.sources) {
    if (n.sources?.length) init.sources = structuredCopy(n.sources);
    if (n.attach?.length) init.attach = structuredCopy(n.attach);
  }
  if (init.project === undefined) delete init.project;
  const c = No.createNote(ws, init, { ...act, id: act.id });
  return c;
}

/** Titel einer Notiz ohne eigenen Titel steckt in der ersten Überschrift – die wird ersetzt. */
function retitle(text: string, title: string): string {
  const lines = text.split('\n');
  const i = lines.findIndex((l) => l.trim());
  if (i >= 0 && /^#{1,6} /.test(lines[i])) lines[i] = `# ${title}`;
  else lines.unshift(`# ${title}`);
  return lines.join('\n');
}

function structuredCopy<T>(v: T): T {
  return v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T);
}

/**
 * Karte kopieren und ablegen: im selben Kanban direkt unter dem Original (bzw. in `col` an `index`), in einem
 * anderen Sheet wie „Verschieben nach …“ in die Spalte, die zum Zustand passt.
 */
export function copyCard(
  ws: Workspace,
  noteId: string,
  fromView: string,
  opts: { to?: string; col?: string; index?: number; keep?: CopyKeep; title?: string; asTemplate?: boolean } & No.Act & { id?: string } = {},
): { ws: Workspace; id: string } | null {
  const c = copyNote(ws, noteId, opts.keep ?? ALL_KEEP, { by: opts.by, now: opts.now, id: opts.id, title: opts.title });
  if (!c) return null;
  let next = c.ws;
  if (opts.asTemplate) next = setTemplate(next, c.id, true);
  const to = opts.to ?? fromView;
  const v = No.viewById(next, to);
  if (!v) return { ws: next, id: c.id };
  if (v.kind === 'kanban') {
    const here = to === fromView ? Sh.colOf(v, noteId) : undefined;
    const col = opts.col ?? here?.id;
    if (col) {
      const index = opts.index ?? (here && here.id === col ? here.ids.indexOf(noteId) + 1 : undefined);
      const r = Sh.moveCard(next, to, c.id, col, index, opts);
      return r.ok ? { ws: r.ws, id: c.id } : null;
    }
    const r = Sh.moveToSheet(next, c.id, '', to, opts);
    return r.ok ? { ws: r.ws, id: c.id } : null;
  }
  const i = v.ids.indexOf(noteId);
  const r = No.placeNote(next, c.id, { view: to, index: i >= 0 ? i + 1 : undefined }, opts);
  return r.ok ? { ws: r.ws, id: c.id } : null;
}

/** Kartenvorlage (wie Trello „Card template“) ein- bzw. ausschalten. */
export function setTemplate(ws: Workspace, id: string, on: boolean): Workspace {
  return { ...ws, notes: No.notesOf(ws).map((n) => (n.id !== id ? n : on ? { ...n, template: true as const } : (({ template: _t, ...rest }) => rest)(n))) };
}

/** Kartenvorlagen: zuerst die dieses Boards, dann die anderer Sheets (ohne archivierte). */
export function templatesFor(ws: Workspace, viewId: string): { here: Note[]; other: Note[] } {
  const v = No.viewById(ws, viewId);
  const mine = new Set(v ? No.idsIn(v) : []);
  const all = No.notesOf(ws).filter((n) => n.template && n.state !== 'archived');
  return { here: all.filter((n) => mine.has(n.id)), other: all.filter((n) => !mine.has(n.id)) };
}

/** „+ Karte aus Vorlage“: Kopie der Vorlage (alles kommt mit), ohne Vorlage-Kennzeichen, oben oder unten in der Spalte. */
export function cardFromTemplate(ws: Workspace, tplId: string, viewId: string, colId: string, opts: No.Act & { id?: string; top?: boolean; title?: string } = {}): { ws: Workspace; id: string } | null {
  const v = No.viewById(ws, viewId);
  if (!v?.cols?.some((c) => c.id === colId)) return null;
  return copyCard(ws, tplId, viewId, { ...opts, to: viewId, col: colId, index: opts.top ? 0 : undefined });
}

// ---------- K1 Archiv ----------

export interface ArchiveList {
  cards: Note[];
  cols: { col: NoteColumn; cards: number }[];
}

/** Archiv eines Boards: archivierte Karten (auch in archivierten Spalten) und archivierte Spalten, gefiltert nach `q`. */
export function archiveOf(ws: Workspace, viewId: string, q = ''): ArchiveList {
  const v = No.viewById(ws, viewId);
  if (!v) return { cards: [], cols: [] };
  const cards = (v.cols ?? [])
    .flatMap((c) => c.ids)
    .map((id) => No.noteById(ws, id))
    .filter((n): n is Note => !!n && n.state === 'archived' && Sh.matchesFilter(No.shownNote(n), q))
    .sort((a, b) => b.changed - a.changed);
  const ql = q.trim().toLowerCase();
  const cols = (v.archivedCols ?? []).filter((c) => !ql || c.name.toLowerCase().includes(ql)).map((col) => ({ col, cards: col.ids.length }));
  return { cards, cols };
}

/** Zahl der Einträge im Archiv (für „Archiv (n)“). */
export function archiveCount(ws: Workspace, viewId: string): number {
  const a = archiveOf(ws, viewId);
  return a.cards.length + a.cols.length;
}

/** Karte archivieren: Zustand „archiviert“; sie verschwindet aus dem Board und steht im Archiv. */
export function archiveCard(ws: Workspace, noteId: string, act: No.Act = {}): Workspace {
  const n = No.noteById(ws, noteId);
  if (!n || n.state === 'archived') return ws;
  return No.setState(ws, noteId, 'archived', act);
}

/** Karte wiederherstellen: zurück in ihre Spalte, Zustand nach deren Bedeutung (wie beim Ablegen). */
export function restoreCard(ws: Workspace, viewId: string, noteId: string, act: No.Act = {}): Workspace {
  const v = No.viewById(ws, viewId);
  const n = No.noteById(ws, noteId);
  if (!v || !n || n.state !== 'archived') return ws;
  const col = Sh.colOf(v, noteId) ?? v.cols?.[0];
  if (!col) return No.setState(ws, noteId, 'open', act);
  const r = Sh.moveCard(ws, viewId, noteId, col.id, undefined, act);
  return r.ok ? r.ws : No.setState(ws, noteId, 'open', act);
}

// ---------- K5 Termine ----------

export type DueKind = 'done' | 'over' | 'soon' | 'later';

/** Zeitpunkt von „fällig“ (lokal): mit Uhrzeit genau, ohne Uhrzeit Ende des Tages. */
export function dueAt(n: Pick<Note, 'due' | 'dueTime'>): Date | null {
  if (!n.due) return null;
  const d = new Date(`${n.due}T${n.dueTime ?? '23:59'}:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Wie Trello: erledigt (grün), überfällig (rot), bald fällig = in den nächsten 24 Stunden (gelb), sonst ohne Farbe. */
export function dueKind(n: Pick<Note, 'due' | 'dueTime' | 'state'>, now = Date.now()): DueKind | null {
  const at = dueAt(n);
  if (!at) return null;
  if (n.state === 'done' || n.state === 'review' || n.state === 'archived') return 'done';
  const ms = at.getTime() - now;
  if (ms < 0) return 'over';
  return ms <= 24 * 3600 * 1000 ? 'soon' : 'later';
}

/** Vorschlag für die Erinnerung: 1 Tag vor „fällig“ (gleiche Uhrzeit, ohne Uhrzeit 9:00); `null`, wenn das schon vorbei ist. */
export function remindBeforeDue(n: Pick<Note, 'due' | 'dueTime'>, now = Date.now()): string | null {
  if (!n.due) return null;
  const d = new Date(`${n.due}T${n.dueTime ?? '09:00'}:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() - 1);
  return d.getTime() > now ? d.toISOString() : null;
}
