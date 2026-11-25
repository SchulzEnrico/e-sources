/**
 * F-210 Schritt 5 (V91): Notizen-Layouts – Entscheidungen Z1–Z4 (Claude Doc „F-210 V89 – Lageplan,
 * freie Anordnung im Notizen-Modus, Boards auf dem Desk (BL4)“).
 *
 * Z1 Ein Notizen-Layout speichert die Anordnung der Pads im Notizen-Modus (Teilungsbaum aus
 *    noteTree.ts) und welche Pads mit welchen Sheets darin liegen – wie ein Desk-Layout Portale mit
 *    Tabs. Beim Wechsel wandern die Pads des alten Layouts in den Vorrat, die des neuen erscheinen
 *    (nie gelöscht, F-50). Die Sheets selbst bleiben immer in der Library (`noteViews`).
 * Z2 Der Baum gilt je Bildschirm-Einstellung (Klasse + Ausrichtung, wie `linesKey`).
 * Z3 Name „Notizen-Layouts“ – Gruppe im Cockpit „Layouts“ zwischen Desk-Layouts und Board-Vorlagen.
 * Z4 Mitgeliefert: „Fokus“ (Kanban groß, To-do schmal daneben) und „Tagesplanung“ (To-do, Matrix,
 *    Notizblock) – sie stehen im Code und werden beim Anlegen als eigenes Layout mit leeren Sheets
 *    erzeugt.
 *
 * Aufbau wie deskLayouts.ts: Die Pads des aktiven Layouts stehen wie bisher direkt in `ws.pads`;
 * nur nicht aktive Layouts tragen `saved`. Die Bäume liegen bei jedem Layout (`trees`), auch beim
 * aktiven – so werden sie mit abgeglichen (Dateiformat 8). Vor V91 lag der Baum geräteeigen in
 * `padDesks[desk].notes`; `adoptOldTree` übernimmt ihn beim Laden.
 */
import { NOTES_LAYOUT_TEXT } from './terms';
import * as T from './tree';
import type { NoteViewKind, Pad, PadDesk, Workspace } from './types';
import { createView, defaultViewName, viewById, viewsOf } from './notes';
import { newId } from './workspace';
import { PAD_SHEETS_MAX } from './noteObjects';

/** Gespeicherte Pads eines nicht aktiven Layouts (ohne Desk). */
export interface NotesLayoutContent {
  pads: Omit<Pad, 'desk'>[];
}

export interface NotesLayout {
  id: string;
  name: string;
  /** Z2: Baum je Bildschirm-Einstellung (Schlüssel wie `linesKey`: „laptop:landscape“). */
  trees?: Record<string, T.Node>;
  /** Nur bei nicht aktiven Layouts. */
  saved?: NotesLayoutContent;
}

export interface NotesLayouts {
  active: string;
  list: NotesLayout[];
}

/** Höchstzahl je Desk – wie Desk-Layouts. */
export const NOTES_LAYOUT_MAX = 12;
const FIRST = 'first';

/** Layouts eines Desks; ohne Eintrag genau eins („Notizen-Layout 1“) mit den heutigen Pads. */
export function notesLayoutsOf(ws: Workspace, desk = ''): NotesLayouts {
  return ws.deskNotes?.[desk]?.board ?? { active: FIRST, list: [{ id: FIRST, name: `${NOTES_LAYOUT_TEXT.defaultName} 1` }] };
}

export function activeNotesLayout(ws: Workspace, desk = ''): NotesLayout {
  const d = notesLayoutsOf(ws, desk);
  return d.list.find((l) => l.id === d.active) ?? d.list[0];
}

function withBoard(ws: Workspace, desk: string, board: NotesLayouts): Workspace {
  const dn = ws.deskNotes?.[desk] ?? {};
  return { ...ws, deskNotes: { ...ws.deskNotes, [desk]: { ...dn, board } } };
}

const patchLayout = (d: NotesLayouts, id: string, fn: (l: NotesLayout) => NotesLayout): NotesLayouts => ({
  ...d,
  list: d.list.map((l) => (l.id === id ? fn(l) : l)),
});

// ---------------------------------------------------------------- Bäume (Z2)

/**
 * Baum des aktiven Layouts für diese Einstellung. Fehlt er, gilt der zuletzt gespeicherte Baum
 * eines anderen Bildschirms (Blätter sind Pad-Ids, die Teilung ist anteilig) – sonst keiner
 * (dann Raster, F2).
 */
export function noteTreeFor(ws: Workspace, desk: string, key: string): T.Node | undefined {
  const trees = activeNotesLayout(ws, desk).trees ?? {};
  return trees[key] ?? Object.values(trees).at(-1);
}

/** Baum des aktiven Layouts für diese Einstellung setzen (`null` entfernt ihn). */
export function setNoteTreeFor(ws: Workspace, desk: string, key: string, tree: T.Node | null): Workspace {
  const d = notesLayoutsOf(ws, desk);
  const act = d.list.find((l) => l.id === d.active) ?? d.list[0];
  const { [key]: _old, ...rest } = act.trees ?? {};
  const trees = tree ? { ...rest, [key]: tree } : rest;
  const next = patchLayout({ ...d, active: act.id }, act.id, (l) => {
    const { trees: _t, ...base } = l;
    return Object.keys(trees).length ? { ...base, trees } : base;
  });
  return withBoard(ws, desk, next);
}

/**
 * Umzug aus V90: Baum aus `padDesks[desk].notes` (geräteeigen) in das aktive Notizen-Layout,
 * wenn dort noch keiner liegt. `keyOf` nennt den Schlüssel der Einstellung dieses Desks.
 */
export function adoptOldTree(ws: Workspace, keyOf: (desk: string) => string): Workspace {
  let next = ws;
  for (const [desk, pd] of Object.entries(ws.padDesks ?? {})) {
    if (!pd.notes) continue;
    if (!Object.keys(activeNotesLayout(next, desk).trees ?? {}).length) next = setNoteTreeFor(next, desk, keyOf(desk), pd.notes);
    const { notes: _n, ...rest } = pd;
    next = { ...next, padDesks: { ...next.padDesks, [desk]: rest as PadDesk } };
  }
  return next;
}

// ---------------------------------------------------------------- Pads heraus- und hineinnehmen

/** Alle Pads des Desks heraus (auch die aus dem Dock – im Notizen-Modus zählen alle, V81 D12). */
export function takeOutPads(ws: Workspace, desk: string): { rest: Workspace; content: NotesLayoutContent } {
  const pads = (ws.pads ?? []).filter((p) => p.desk === desk);
  const others = (ws.pads ?? []).filter((p) => p.desk !== desk);
  const rest: Workspace = { ...ws, pads: others };
  if (!others.length) delete rest.pads;
  return { rest, content: { pads: pads.map(({ desk: _d, ...p }) => p) } };
}

/**
 * Gespeicherte Pads einsetzen. Ein Sheet liegt höchstens in einem Pad: Sheets, die inzwischen in
 * einem anderen Pad liegen (auch in `taken`, den eben in den Vorrat gelegten Pads – dorthin hat der
 * Anwender das Sheet zuletzt geholt) oder gelöscht sind, fallen hier weg; ein Pad ohne Sheets entfällt.
 */
export function putInPads(ws: Workspace, desk: string, c: NotesLayoutContent, taken: readonly string[] = []): Workspace {
  const used = new Set([...(ws.pads ?? []).flatMap((p) => p.sheets), ...taken]);
  const add: Pad[] = [];
  for (const p of c.pads) {
    const sheets = p.sheets.filter((s) => !used.has(s) && viewById(ws, s));
    if (!sheets.length) continue;
    for (const s of sheets) used.add(s);
    add.push({ ...p, desk, sheets, active: sheets.includes(p.active) ? p.active : sheets[0] });
  }
  const pads = [...(ws.pads ?? []), ...add];
  return pads.length ? { ...ws, pads } : ws;
}

// ---------------------------------------------------------------- Bedienung

/** Freier Name „Notizen-Layout n“ bzw. „Name (Kopie)“. */
export function freeNotesName(d: NotesLayouts, base?: string): string {
  const taken = new Set(d.list.map((l) => l.name));
  if (base) {
    let name = base;
    if (taken.has(name)) name = `${base} ${NOTES_LAYOUT_TEXT.copySuffix}`;
    for (let i = 2; taken.has(name); i++) name = `${base} ${NOTES_LAYOUT_TEXT.copySuffix} ${i}`;
    return name;
  }
  let n = d.list.length + 1;
  while (taken.has(`${NOTES_LAYOUT_TEXT.defaultName} ${n}`)) n++;
  return `${NOTES_LAYOUT_TEXT.defaultName} ${n}`;
}

/** Zum Layout `id` wechseln; die aktuellen Pads gehen vorher in den Vorrat des aktiven Layouts. */
export function switchNotesLayout(ws: Workspace, desk: string, id: string): Workspace {
  const d = notesLayoutsOf(ws, desk);
  const target = d.list.find((l) => l.id === id);
  if (!target || id === d.active || !target.saved) return ws;
  const { rest, content } = takeOutPads(ws, desk);
  const list = d.list.map((l) => {
    if (l.id === d.active) return { ...l, saved: content };
    if (l.id === id) {
      const { saved: _s, ...on } = l;
      return on;
    }
    return l;
  });
  // Plätze der Pads (geräteeigen) bleiben liegen – beim Zurückwechseln stehen sie wieder dort.
  return withBoard(putInPads(rest, desk, target.saved, content.pads.flatMap((p) => p.sheets)), desk, { active: id, list });
}

/** Kopie eines Sheets (neue Id, gleiche Notizen und Spalten) – damit eine Layout-Kopie eigene Sheets hat. */
function cloneSheet(ws: Workspace, sheetId: string, make: () => string): { ws: Workspace; id: string } | null {
  const v = viewById(ws, sheetId);
  if (!v) return null;
  const id = make();
  const copy = { ...JSON.parse(JSON.stringify(v)), id, name: uniqueSheetName(ws, v.name) };
  return { ws: { ...ws, noteViews: [...viewsOf(ws), copy] }, id };
}

/** „Name (Kopie)“, solange der Name schon vergeben ist. */
function uniqueSheetName(ws: Workspace, base: string): string {
  const taken = new Set(viewsOf(ws).map((v) => v.name.toLowerCase()));
  let name = `${base} ${NOTES_LAYOUT_TEXT.copySuffix}`;
  for (let i = 2; taken.has(name.toLowerCase()); i++) name = `${base} ${NOTES_LAYOUT_TEXT.copySuffix} ${i}`;
  return name;
}

/** Pads mit kopierten Sheets und neuen Ids; die Bäume werden auf die neuen Ids umgeschrieben. */
function cloneContent(ws: Workspace, c: NotesLayoutContent, trees: Record<string, T.Node> | undefined, make: () => string): { ws: Workspace; content: NotesLayoutContent; trees?: Record<string, T.Node> } {
  let next = ws;
  const pid = new Map<string, string>();
  const pads: Omit<Pad, 'desk'>[] = [];
  for (const p of c.pads) {
    const sheets: string[] = [];
    let active = '';
    for (const s of p.sheets) {
      const r = cloneSheet(next, s, make);
      if (!r) continue;
      next = r.ws;
      sheets.push(r.id);
      if (s === p.active) active = r.id;
    }
    if (!sheets.length) continue;
    const id = make();
    pid.set(p.id, id);
    const { recent: _r, from: _f, ...base } = p;
    pads.push({ ...base, id, sheets, active: active || sheets[0] });
  }
  const mapTree = (t: T.Node): T.Node | null => {
    let out: T.Node | null = t;
    for (const leaf of T.leaves(t)) {
      if (!out) break;
      const to = pid.get(leaf);
      out = to ? T.replaceLeaf(out, leaf, to) : T.removeLeaf(out, leaf);
    }
    return out;
  };
  const mapped = trees ? Object.fromEntries(Object.entries(trees).flatMap(([k, t]) => {
    const m = mapTree(t);
    return m ? [[k, m]] : [];
  })) : undefined;
  return { ws: next, content: { pads }, ...(mapped && Object.keys(mapped).length ? { trees: mapped } : {}) };
}

/** Pads eines Layouts (aktiv: aus der Arbeitsfläche, sonst der Vorrat). */
export function notesContentOf(ws: Workspace, desk: string, id: string): NotesLayoutContent | null {
  const d = notesLayoutsOf(ws, desk);
  const l = d.list.find((x) => x.id === id);
  if (!l) return null;
  return id === d.active ? takeOutPads(ws, desk).content : (l.saved ?? null);
}

// ---------------------------------------------------------------- Z4 mitgelieferte Layouts

export type BuiltinNotes = 'focus' | 'day';
export const BUILTIN_NOTES: readonly BuiltinNotes[] = ['focus', 'day'];

/** Aufbau eines mitgelieferten Layouts: Sheets (Art) und Baum über deren Platz-Nummern. */
interface BuiltinSpec {
  kinds: NoteViewKind[];
  tree: (ids: string[]) => T.Node;
}

const row = (a: T.Node, b: T.Node, share: number): T.Node => ({ dir: 'row', children: [a, b], sizes: [share, 1 - share] });
const col = (a: T.Node, b: T.Node, share: number): T.Node => ({ dir: 'col', children: [a, b], sizes: [share, 1 - share] });

export const BUILTIN_SPEC: Record<BuiltinNotes, BuiltinSpec> = {
  // „Fokus“: ein Kanban groß (zwei Drittel), To-do schmal daneben
  focus: { kinds: ['kanban', 'todo'], tree: ([k, t]) => row({ id: k }, { id: t }, 2 / 3) },
  // „Tagesplanung“: To-do links über die ganze Höhe, rechts Matrix oben und Notizblock unten
  day: { kinds: ['todo', 'eisenhower', 'block'], tree: ([t, m, b]) => row({ id: t }, col({ id: m }, { id: b }, 0.6), 0.4) },
};

/** Pads (je ein neues, leeres Sheet) und Baum eines mitgelieferten Layouts. */
function builtinContent(ws: Workspace, which: BuiltinNotes, make: () => string): { ws: Workspace; content: NotesLayoutContent; tree: T.Node } {
  const spec = BUILTIN_SPEC[which];
  let next = ws;
  const pads: Omit<Pad, 'desk'>[] = [];
  for (const kind of spec.kinds) {
    const r = createView(next, kind, defaultViewName(next, kind), { makeId: make });
    next = r.ws;
    pads.push({ id: make(), sheets: [r.id], active: r.id });
  }
  return { ws: next, content: { pads }, tree: spec.tree(pads.map((p) => p.id)) };
}

/** Woraus ein neues Notizen-Layout entsteht. */
export type NotesFrom = 'current' | 'empty' | BuiltinNotes;

/**
 * Neues Notizen-Layout anlegen und gleich dorthin wechseln. `current` = Kopie der aktuellen Pads
 * (mit kopierten Sheets), `empty` = ohne Pads (der Notizen-Modus legt dann ein Pad an), sonst ein
 * mitgeliefertes. `key` = Einstellung, für die der Baum eines mitgelieferten Layouts gilt.
 * Gibt dieselbe Arbeitsfläche zurück, wenn NOTES_LAYOUT_MAX erreicht ist.
 */
export function addNotesLayout(ws: Workspace, desk: string, from: NotesFrom, opts: { key: string; name?: string; id?: string; makeId?: () => string }): Workspace {
  const make = opts.makeId ?? newId;
  const d = notesLayoutsOf(ws, desk);
  if (d.list.length >= NOTES_LAYOUT_MAX) return ws;
  const id = opts.id ?? make();
  let next = withBoard(ws, desk, d);
  let layout: NotesLayout;
  const base = opts.name?.trim();
  if (from === 'current') {
    const act = activeNotesLayout(ws, desk);
    const c = cloneContent(next, takeOutPads(next, desk).content, act.trees, make);
    next = c.ws;
    layout = { id, name: base || freeNotesName(d, act.name), saved: c.content, ...(c.trees ? { trees: c.trees } : {}) };
  } else if (from === 'empty') {
    layout = { id, name: base || freeNotesName(d), saved: { pads: [] } };
  } else {
    const b = builtinContent(next, from, make);
    next = b.ws;
    layout = { id, name: base || freeNotesName(d, NOTES_LAYOUT_TEXT.builtin[from]), saved: b.content, trees: { [opts.key]: b.tree } };
  }
  const now = notesLayoutsOf(next, desk);
  next = withBoard(next, desk, { active: now.active, list: [...now.list, layout] });
  return switchNotesLayout(next, desk, id);
}

/** Kopie eines Layouts (aktiv oder nicht) mit eigenen Sheets; bleibt beim aktiven Layout. */
export function copyNotesLayout(ws: Workspace, desk: string, id: string, opts: { makeId?: () => string } = {}): Workspace {
  const make = opts.makeId ?? newId;
  const d = notesLayoutsOf(ws, desk);
  const src = d.list.find((l) => l.id === id);
  const content = notesContentOf(ws, desk, id);
  if (!src || !content || d.list.length >= NOTES_LAYOUT_MAX) return ws;
  const c = cloneContent(ws, content, src.trees, make);
  const copy: NotesLayout = { id: make(), name: freeNotesName(d, src.name), saved: c.content, ...(c.trees ? { trees: c.trees } : {}) };
  const at = d.list.indexOf(src) + 1;
  return withBoard(c.ws, desk, { active: d.active, list: [...d.list.slice(0, at), copy, ...d.list.slice(at)] });
}

/** Umbenennen; leer oder schon vergeben = keine Änderung. */
export function renameNotesLayout(ws: Workspace, desk: string, id: string, name: string): Workspace {
  const d = notesLayoutsOf(ws, desk);
  const t = name.trim();
  if (!t || d.list.some((l) => l.id !== id && l.name === t) || !d.list.some((l) => l.id === id)) return ws;
  return withBoard(ws, desk, patchLayout(d, id, (l) => ({ ...l, name: t })));
}

export const notesNameTaken = (ws: Workspace, desk: string, name: string, except = '') =>
  notesLayoutsOf(ws, desk).list.some((l) => l.id !== except && l.name === name.trim());

/** Für Rückgängig: gelöschtes Layout mit Pads und Stelle. */
export interface DeletedNotesLayout {
  desk: string;
  index: number;
  layout: NotesLayout & { saved: NotesLayoutContent };
}

/**
 * Löschen; das letzte bleibt. Ist es aktiv, wechselt der Desk vorher zum Nachbarn. Die Sheets des
 * gelöschten Layouts bleiben in der Library (F-50) – gelöscht wird nur die Anordnung.
 */
export function deleteNotesLayout(ws: Workspace, desk: string, id: string): { ws: Workspace; deleted: DeletedNotesLayout | null } {
  let d = notesLayoutsOf(ws, desk);
  const index = d.list.findIndex((l) => l.id === id);
  if (index < 0 || d.list.length < 2) return { ws, deleted: null };
  let next = ws;
  if (d.active === id) {
    next = switchNotesLayout(ws, desk, d.list[index === 0 ? 1 : index - 1].id);
    d = notesLayoutsOf(next, desk);
  }
  const gone = d.list[index] as NotesLayout & { saved: NotesLayoutContent };
  next = withBoard(next, desk, { active: d.active, list: d.list.filter((l) => l.id !== id) });
  return { ws: next, deleted: { desk, index, layout: gone } };
}

/** Rückgängig: Layout kommt an seine Stelle zurück (nicht aktiv). */
export function restoreNotesLayout(ws: Workspace, del: DeletedNotesLayout): Workspace {
  const d = notesLayoutsOf(ws, del.desk);
  if (d.list.some((l) => l.id === del.layout.id)) return ws;
  const list = [...d.list];
  list.splice(Math.min(del.index, list.length), 0, del.layout);
  return withBoard(ws, del.desk, { active: d.active, list });
}

// ---------------------------------------------------------------- Vorschau im Cockpit

/** Ein Pad eines Layouts für das Mini-Abbild: Lage, Name, Art des sichtbaren Sheets, Zahl der Sheets. */
export interface NotesTile {
  id: string;
  rect: T.FRect;
  name: string;
  kind: NoteViewKind;
  sheets: number;
}

/** Anordnung eines Layouts für diese Einstellung (ohne Baum: Raster wie F2). */
export function notesLayoutView(ws: Workspace, desk: string, id: string, key: string): NotesTile[] {
  const l = notesLayoutsOf(ws, desk).list.find((x) => x.id === id);
  const c = notesContentOf(ws, desk, id);
  if (!l || !c) return [];
  const pads = c.pads.filter((p) => p.sheets.some((s) => viewById(ws, s)));
  const ids = [...pads].map((p) => p.id).sort();
  const stored = l.trees?.[key] ?? Object.values(l.trees ?? {}).at(-1);
  let tree: T.Node | null = stored ?? null;
  for (const leaf of T.leaves(tree)) if (tree && !ids.includes(leaf)) tree = T.removeLeaf(tree, leaf);
  for (const pid of ids) if (!tree || !T.hasLeaf(tree, pid)) tree = tree ? T.addToLargest(tree, pid, 16 / 10) : { id: pid };
  const rects = T.rects(tree);
  return T.readingOrder(tree).map((pid) => {
    const p = pads.find((x) => x.id === pid)!;
    const v = viewById(ws, p.active) ?? viewById(ws, p.sheets[0]);
    return { id: pid, rect: rects.get(pid)!, name: v?.name ?? 'Pad', kind: v?.kind ?? 'block', sheets: Math.min(PAD_SHEETS_MAX, p.sheets.length) };
  });
}
