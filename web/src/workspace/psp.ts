/**
 * F-206 Schritt 10 (V100): Projektstrukturplan (PSP) – Vorbild PSP nach IPMA ICB4 und Gliederung/PSP-Code
 * in MS Project / iTaskX. K6: eigene Ordnung `Project.order` je Ebene (ändert keine anderen Ansichten),
 * Code aus Präfix + Stelle (1, 1.2, 1.2.3) in der gewählten Gliederungsart. Ebenen: Teilprojekte (oben)
 * und Vorgänge (Notizen mit `project`), Unter-Notizen = Arbeitspakete darunter. Reine Funktionen.
 */
import type { Note, Project, Workspace } from './types';
import { createNote, isFinished, notesOf, setParent, titleOf, type Act } from './notes';
import { headText } from './sheets';
import { projectById, projectsOf } from './projects';
import { durationOf } from './schedule';

export type PspStyle = NonNullable<NonNullable<Project['psp']>['style']>;

export interface PspNode {
  kind: 'task' | 'project';
  id: string;
  /** PSP-Code mit Präfix, z. B. „WEB-1.2“. */
  code: string;
  title: string;
  /** 0 = oberste Ebene. */
  depth: number;
  /** Projekt, dem die Ebene gehört (Teilprojekt bzw. Projekt). */
  owner: string;
  /** Schlüssel der Ebene in `order`: '' oder Id der Eltern-Notiz. */
  level: string;
  children: PspNode[];
  /** Sammelvorgang (hat Kinder). */
  summary: boolean;
  milestone: boolean;
  done: boolean;
  /** Dauer in Arbeitstagen (nur Vorgänge; Sammelvorgänge rechnet der Gantt). */
  duration: number;
  /** Plan-Aufwand in h, bei Sammelvorgängen samt Kindern. */
  effort: number;
}

/** Ids in der Ordnung `order`; was dort fehlt, kommt hinten in der bisherigen Reihenfolge dazu. */
export function ordered(ids: readonly string[], order: readonly string[] | undefined): string[] {
  if (!order?.length) return [...ids];
  const set = new Set(ids);
  const head = order.filter((id) => set.has(id));
  const inHead = new Set(head);
  return [...head, ...ids.filter((id) => !inHead.has(id))];
}

function letters(i: number, lower: boolean): string {
  let s = '';
  let n = i + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return lower ? s.toLowerCase() : s;
}

/** Stelle einer Ebene: num 1 · alpha A · mixed A, 1, a, 1, a … (Ebene 0 = A). */
export function pspSegment(i: number, depth: number, style: PspStyle = 'num'): string {
  if (style === 'alpha') return letters(i, false);
  if (style === 'mixed') return depth === 0 ? letters(i, false) : depth % 2 === 1 ? String(i + 1) : letters(i, true);
  return String(i + 1);
}

/** Präfix vor den Code setzen – mit „-“, wenn das Präfix nicht schon auf ein Trennzeichen endet. */
export function withPrefix(prefix: string | undefined, code: string): string {
  const p = prefix?.trim();
  if (!p) return code;
  return /[-./ _:]$/.test(p) ? `${p}${code}` : `${p}-${code}`;
}

/** Vorgänge eines Projekts auf oberster Ebene (ohne Eltern-Notiz im selben Projekt). */
function topTasks(notes: Note[], owner: string): Note[] {
  const mine = new Set(notes.filter((n) => n.project === owner).map((n) => n.id));
  return notes.filter((n) => n.project === owner && (!n.parent || !mine.has(n.parent)) && n.state !== 'archived');
}

/**
 * PSP eines Projekts als Baum. Teilprojekte erscheinen auf der obersten Ebene mit ihren eigenen Vorgängen
 * darunter; Präfix und Gliederungsart nimmt der ganze Baum vom gewählten Projekt.
 */
export function pspTree(ws: Workspace, projectId: string): PspNode[] {
  const root = projectById(ws, projectId);
  if (!root) return [];
  const notes = notesOf(ws);
  const style = root.psp?.style ?? 'num';
  const byId = new Map(notes.map((n) => [n.id, n]));
  const seen = new Set<string>();

  const taskNode = (n: Note, owner: Project, code: string, depth: number): PspNode => {
    seen.add(n.id);
    const kids = notes.filter((c) => c.parent === n.id && c.project === owner.id && c.state !== 'archived' && !seen.has(c.id));
    const children = ordered(kids.map((c) => c.id), owner.order?.[n.id]).map((id, i) => taskNode(byId.get(id)!, owner, `${code}.${pspSegment(i, depth + 1, style)}`, depth + 1));
    const own = n.effort?.plan ?? 0;
    return {
      kind: 'task',
      id: n.id,
      code,
      title: titleOf(n),
      depth,
      owner: owner.id,
      level: n.parent && byId.get(n.parent)?.project === owner.id ? n.parent : '',
      children,
      summary: children.length > 0,
      milestone: !!n.milestone,
      done: isFinished(n.state),
      duration: durationOf(n),
      effort: own + children.reduce((s, c) => s + c.effort, 0),
    };
  };

  const levelOf = (owner: Project, prefixCode: string, depth: number, path: Set<string>): PspNode[] => {
    const tasks = topTasks(notes, owner.id).filter((n) => !seen.has(n.id));
    const subs = projectsOf(ws).filter((p) => p.parent === owner.id && !path.has(p.id));
    const ids = ordered([...tasks.map((n) => n.id), ...subs.map((p) => p.id)], owner.order?.['']);
    return ids.map((id, i) => {
      const seg = pspSegment(i, depth, style);
      const code = prefixCode ? `${prefixCode}.${seg}` : seg;
      const n = byId.get(id);
      if (n) return taskNode(n, owner, code, depth);
      const p = projectById(ws, id)!;
      const children = levelOf(p, code, depth + 1, new Set([...path, p.id]));
      return {
        kind: 'project' as const,
        id,
        code,
        title: p.name,
        depth,
        owner: owner.id,
        level: '',
        children,
        summary: children.length > 0,
        milestone: false,
        done: p.state === 'done' || p.state === 'stopped',
        duration: 0,
        effort: children.reduce((s, c) => s + c.effort, 0),
      };
    });
  };

  const tree = levelOf(root, '', 0, new Set([root.id]));
  const prefix = root.psp?.prefix;
  if (prefix) {
    const fix = (ns: PspNode[]) => ns.forEach((x) => { x.code = withPrefix(prefix, x.code); fix(x.children); });
    fix(tree);
  }
  return tree;
}

/** Baum flach in Anzeige-Reihenfolge; `closed` = eingeklappte Ids (deren Kinder fehlen). */
export function pspRows(tree: readonly PspNode[], closed: ReadonlySet<string> = new Set()): PspNode[] {
  const out: PspNode[] = [];
  const walk = (ns: readonly PspNode[]) => ns.forEach((n) => { out.push(n); if (!closed.has(n.id)) walk(n.children); });
  walk(tree);
  return out;
}

/** Knoten im Baum finden – mit seinen Geschwistern. */
export function findPsp(tree: readonly PspNode[], id: string): { node: PspNode; siblings: PspNode[]; parent?: PspNode } | null {
  const walk = (ns: PspNode[], parent?: PspNode): ReturnType<typeof findPsp> => {
    for (const n of ns) {
      if (n.id === id) return { node: n, siblings: ns, parent };
      const r = walk(n.children, n);
      if (r) return r;
    }
    return null;
  };
  return walk(tree as PspNode[]);
}

function withOrder(ws: Workspace, owner: string, level: string, ids: string[], now: number): Workspace {
  const projects = projectsOf(ws).map((p) => (p.id === owner ? { ...p, order: { ...(p.order ?? {}), [level]: ids }, changed: now } : p));
  return { ...ws, projects };
}

/** Auf der eigenen Ebene um `by` Plätze verschieben (Alt+Pfeil) – ändert nur `order` (K6). */
export function movePsp(ws: Workspace, rootId: string, id: string, by: number, now = Date.now()): Workspace {
  const f = findPsp(pspTree(ws, rootId), id);
  if (!f) return ws;
  const ids = f.siblings.map((s) => s.id);
  const i = ids.indexOf(id);
  const j = Math.max(0, Math.min(ids.length - 1, i + by));
  if (i === j) return ws;
  ids.splice(i, 1);
  ids.splice(j, 0, id);
  return withOrder(ws, f.node.owner, f.node.level, ids, now);
}

export type PspShiftResult = { ok: true; ws: Workspace } | { ok: false; reason: 'first' | 'top' | 'project' | 'circle' | 'missing' };

/**
 * Tiefer stufen (Alt+Umschalt+→ wie MS Project): Vorgang wird Unter-Notiz des Vorgangs davor auf
 * seiner Ebene. Teilprojekte lassen sich nicht stufen (Hierarchie über „übergeordnetes Projekt“).
 */
export function indentPsp(ws: Workspace, rootId: string, id: string, act: Act = {}): PspShiftResult {
  const f = findPsp(pspTree(ws, rootId), id);
  if (!f) return { ok: false, reason: 'missing' };
  if (f.node.kind === 'project') return { ok: false, reason: 'project' };
  const i = f.siblings.findIndex((s) => s.id === id);
  const prev = f.siblings[i - 1];
  if (!prev) return { ok: false, reason: 'first' };
  const now = act.now ?? Date.now();
  if (prev.kind === 'project') {
    // unter ein Teilprojekt = Vorgang wechselt in dieses Projekt
    const notes = notesOf(ws).map((n) => (n.id === id ? (() => { const { parent: _p, ...rest } = n; return { ...rest, project: prev.id, changed: now }; })() : n));
    return { ok: true, ws: withOrder({ ...ws, notes }, prev.id, '', [...prev.children.map((c) => c.id), id], now) };
  }
  const r = setParent(ws, id, prev.id, act);
  // wie MS Project: der gestufte Vorgang steht danach als letzter unter dem Vorgang davor
  return r.ok ? { ok: true, ws: withOrder(r.ws, prev.owner, prev.id, [...prev.children.map((c) => c.id), id], now) } : { ok: false, reason: r.reason === 'circle' ? 'circle' : 'missing' };
}

/** Höher stufen (Alt+Umschalt+←): Vorgang steht danach direkt hinter seiner bisherigen Eltern-Notiz. */
export function outdentPsp(ws: Workspace, rootId: string, id: string, act: Act = {}): PspShiftResult {
  const tree = pspTree(ws, rootId);
  const f = findPsp(tree, id);
  if (!f) return { ok: false, reason: 'missing' };
  if (f.node.kind === 'project') return { ok: false, reason: 'project' };
  if (!f.parent) return { ok: false, reason: 'top' };
  const up = findPsp(tree, f.parent.id)!;
  const now = act.now ?? Date.now();
  let next: Workspace;
  if (f.parent.kind === 'project') {
    // aus dem Teilprojekt heraus: Vorgang gehört dann dem Projekt darüber
    next = { ...ws, notes: notesOf(ws).map((n) => (n.id === id ? { ...n, project: up.node.owner, changed: now } : n)) };
  } else {
    const r = setParent(ws, id, up.node.level || undefined, act);
    if (!r.ok) return { ok: false, reason: 'missing' };
    next = r.ws;
  }
  const ids = up.siblings.map((s) => s.id).filter((x) => x !== id);
  ids.splice(ids.indexOf(f.parent.id) + 1, 0, id);
  return { ok: true, ws: withOrder(next, up.node.owner, up.node.level, ids, now) };
}

/**
 * Neuer Vorgang im PSP: auf der Ebene von `after` direkt dahinter (sonst oben am Ende), Titel als Überschrift
 * wie in den Sheets. `parent` = unter diesen Vorgang (Umschalt+Enter).
 */
export function addPspTask(ws: Workspace, rootId: string, title: string, opts: Act & { id?: string; after?: string; under?: string } = {}): { ws: Workspace; id: string } | null {
  if (!title.trim() || !projectById(ws, rootId)) return null;
  const tree = pspTree(ws, rootId);
  const anchor = opts.under ?? opts.after;
  const f = anchor ? findPsp(tree, anchor) : null;
  let owner = rootId;
  let parent: string | undefined;
  let level = '';
  let siblings = tree.map((s) => s.id);
  if (f && opts.under) {
    if (f.node.kind === 'project') owner = f.node.id;
    else {
      owner = f.node.owner;
      parent = f.node.id;
      level = f.node.id;
    }
    siblings = f.node.children.map((c) => c.id);
  } else if (f) {
    owner = f.node.owner;
    level = f.node.level;
    parent = level || undefined;
    siblings = f.siblings.map((s) => s.id);
  }
  const c = createNote(ws, { title: '', text: headText(title), project: owner, ...(parent ? { parent } : {}) }, opts);
  const at = f && !opts.under ? siblings.indexOf(f.node.id) + 1 : siblings.length;
  const ids = [...siblings];
  ids.splice(at, 0, c.id);
  return { ws: withOrder(c.ws, owner, level, ids, opts.now ?? Date.now()), id: c.id };
}
