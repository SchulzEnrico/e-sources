/**
 * Kachel-Modell (F-01, F-02, F-11): Die Arbeitsfläche ist ein Teilungsbaum.
 * Ein Knoten teilt seine Fläche nebeneinander ('row') oder übereinander ('col') in Anteile auf,
 * ein Blatt ist ein Panel oder der Stapel. Dadurch ist die Fläche per Konstruktion lückenlos.
 * Alle Funktionen sind rein: Sie ändern nichts, sondern liefern einen neuen Baum.
 */

/** 'row' = Kinder nebeneinander, 'col' = Kinder übereinander. */
export type Dir = 'row' | 'col';
export interface Leaf {
  id: string;
}
export interface Split {
  dir: Dir;
  children: Node[];
  /** Anteile der Kinder an der Fläche des Knotens, Summe 1. */
  sizes: number[];
}
export type Node = Leaf | Split;

export type Side = 'left' | 'right' | 'top' | 'bottom';
/** Ziel beim Ablegen: Mitte = tauschen, Rand = andocken. */
export type Zone = 'center' | Side;

/** Rechteck als Anteil der Arbeitsfläche (0 bis 1). */
export interface FRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Mindestgröße eines Panels als Anteil von Breite und Höhe der Arbeitsfläche. */
export interface Min {
  w: number;
  h: number;
}

export const FULL: FRect = { x: 0, y: 0, w: 1, h: 1 };
const EPS = 1e-9;

export const isLeaf = (n: Node): n is Leaf => 'id' in n;
const dirOf = (s: Side): Dir => (s === 'left' || s === 'right' ? 'row' : 'col');

// ---------------------------------------------------------------- Lesen

/** Ids aller Blätter in Baum-Reihenfolge (links nach rechts, oben nach unten). */
export function leaves(n: Node | null): string[] {
  if (!n) return [];
  if (isLeaf(n)) return [n.id];
  return n.children.flatMap(leaves);
}

export function hasLeaf(n: Node | null, id: string): boolean {
  return leaves(n).includes(id);
}

/** Rechteck jedes Blatts als Anteil der Fläche. */
export function rects(n: Node | null, r: FRect = FULL): Map<string, FRect> {
  const out = new Map<string, FRect>();
  const walk = (m: Node, box: FRect) => {
    if (isLeaf(m)) {
      out.set(m.id, box);
      return;
    }
    let off = 0;
    m.children.forEach((c, i) => {
      const s = m.sizes[i];
      const cb =
        m.dir === 'row'
          ? { x: box.x + off * box.w, y: box.y, w: s * box.w, h: box.h }
          : { x: box.x, y: box.y + off * box.h, w: box.w, h: s * box.h };
      off += s;
      walk(c, cb);
    });
  };
  if (n) walk(n, r);
  return out;
}

/** NF-07: Blätter, deren Breite oder Höhe sich zwischen zwei Anordnungen ändert. */
export function resizedLeaves(before: Node | null, after: Node | null, eps = 1e-4): Set<string> {
  const a = rects(before);
  const out = new Set<string>();
  for (const [id, r] of rects(after)) {
    const o = a.get(id);
    if (!o || Math.abs(o.w - r.w) > eps || Math.abs(o.h - r.h) > eps) out.add(id);
  }
  return out;
}

/** Blätter in Lesereihenfolge nach ihrer Lage auf der Fläche (oben vor unten, links vor rechts). */
export function readingOrder(n: Node | null): string[] {
  const r = rects(n);
  return [...r.entries()]
    .sort(([, a], [, b]) => (Math.abs(a.y - b.y) > EPS ? a.y - b.y : a.x - b.x))
    .map(([id]) => id);
}

// ---------------------------------------------------------------- Aufräumen

/**
 * Bringt einen Baum in Normalform: Knoten mit einem Kind fallen weg, gleich gerichtete
 * verschachtelte Knoten werden zusammengelegt, Anteile summieren sich zu 1.
 */
export function tidy(n: Node): Node {
  if (isLeaf(n)) return { id: n.id };
  const kids: Node[] = [];
  const sizes: number[] = [];
  n.children.forEach((c, i) => {
    const t = tidy(c);
    const s = n.sizes[i] ?? 0;
    if (!isLeaf(t) && t.dir === n.dir) {
      t.children.forEach((g, j) => {
        kids.push(g);
        sizes.push(s * t.sizes[j]);
      });
    } else {
      kids.push(t);
      sizes.push(s);
    }
  });
  if (kids.length === 1) return kids[0];
  const sum = sizes.reduce((a, b) => a + b, 0);
  const norm = sum > EPS ? sizes.map((s) => s / sum) : sizes.map(() => 1 / sizes.length);
  return { dir: n.dir, children: kids, sizes: norm };
}

function mapLeaves(n: Node, fn: (id: string) => Node): Node {
  if (isLeaf(n)) return fn(n.id);
  return { dir: n.dir, children: n.children.map((c) => mapLeaves(c, fn)), sizes: [...n.sizes] };
}

// ---------------------------------------------------------------- Aufbauen

/**
 * Standard-Anordnung: Panels in Reihen (Querformat: Zeilen, Hochformat: Spalten),
 * höchstens `lines` Reihen mit höchstens `perLine` Panels, möglichst gleich voll.
 */
export function standard(ids: string[], lines: number, perLine: number, orientation: 'landscape' | 'portrait'): Node | null {
  if (ids.length === 0) return null;
  const count = Math.max(1, Math.min(lines, Math.ceil(ids.length / Math.max(1, perLine))));
  const per = Math.ceil(ids.length / count);
  const groups: string[][] = [];
  for (let i = 0; i < ids.length; i += per) groups.push(ids.slice(i, i + per));
  const inner: Dir = orientation === 'landscape' ? 'row' : 'col';
  const outer: Dir = inner === 'row' ? 'col' : 'row';
  const lineNodes: Node[] = groups.map((g) =>
    g.length === 1 ? { id: g[0] } : { dir: inner, children: g.map((id) => ({ id })), sizes: g.map(() => 1 / g.length) },
  );
  return tidy({ dir: outer, children: lineNodes, sizes: lineNodes.map(() => 1 / lineNodes.length) });
}

/** Alle Anteile gleich groß, die Anordnung bleibt. */
export function equalize(n: Node): Node {
  if (isLeaf(n)) return { id: n.id };
  return { dir: n.dir, children: n.children.map(equalize), sizes: n.children.map(() => 1 / n.children.length) };
}

// ---------------------------------------------------------------- Ändern

export function replaceLeaf(n: Node, id: string, next: string): Node {
  return mapLeaves(n, (l) => ({ id: l === id ? next : l }));
}

/** F-11: Zwei Blätter tauschen Platz und Größe. */
export function swapLeaves(n: Node, a: string, b: string): Node {
  return mapLeaves(n, (l) => ({ id: l === a ? b : l === b ? a : l }));
}

/**
 * Blatt entfernen. Der Nachbar davor (links bzw. oben), sonst der danach, übernimmt den Platz.
 * Liefert null, wenn kein Blatt übrig bleibt.
 */
export function removeLeaf(n: Node, id: string): Node | null {
  if (isLeaf(n)) return n.id === id ? null : { id: n.id };
  const kids: Node[] = [];
  const sizes: number[] = [];
  const freed: { at: number; size: number }[] = [];
  n.children.forEach((c, i) => {
    const r = removeLeaf(c, id);
    if (r) {
      kids.push(r);
      sizes.push(n.sizes[i]);
    } else freed.push({ at: kids.length, size: n.sizes[i] });
  });
  if (kids.length === 0) return null;
  for (const f of freed) sizes[f.at > 0 ? f.at - 1 : 0] += f.size;
  return tidy({ dir: n.dir, children: kids, sizes });
}

/** Neues Blatt neben `target` einfügen; es bekommt den Anteil `frac` von dessen Fläche. */
export function insertAt(n: Node, target: string, newId: string, side: Side, frac = 0.5): Node {
  const dir = dirOf(side);
  const before = side === 'left' || side === 'top';
  const leaf: Leaf = { id: newId };
  const split = (m: Leaf): Node => ({
    dir,
    children: before ? [leaf, { id: m.id }] : [{ id: m.id }, leaf],
    sizes: before ? [frac, 1 - frac] : [1 - frac, frac],
  });
  return tidy(mapLeaves(n, (l) => (l === target ? split({ id: l }) : { id: l })));
}

/** F-11: Blatt `id` an die Seite `side` von `target` andocken. */
export function dock(n: Node, id: string, target: string, side: Side): Node {
  if (id === target || !hasLeaf(n, id) || !hasLeaf(n, target)) return n;
  const without = removeLeaf(n, id);
  return without ? insertAt(without, target, id, side) : n;
}

/** Ziel „ganze Arbeitsfläche“: am Rand der Fläche ablegen. */
export const AREA = '__area__';

/**
 * F-11: Blatt an einen Rand der ganzen Arbeitsfläche andocken, z. B. als breite untere Reihe
 * unter allen anderen. Es bekommt so viel Platz wie eine der vorhandenen Reihen.
 */
export function dockArea(n: Node, id: string, side: Side): Node {
  if (!hasLeaf(n, id)) return n;
  const rest = removeLeaf(n, id);
  if (!rest) return n;
  const dir = dirOf(side);
  const lines = !isLeaf(rest) && rest.dir === dir ? rest.children.length : 1;
  const frac = 1 / (lines + 1);
  const before = side === 'left' || side === 'top';
  return tidy({
    dir,
    children: before ? [{ id }, rest] : [rest, { id }],
    sizes: before ? [frac, 1 - frac] : [1 - frac, frac],
  });
}

/**
 * F-134: neues Blatt als ganze Spalte rechts bzw. ganze Zeile unten anfügen; es bekommt so viel
 * Platz wie eine der vorhandenen Spalten bzw. Zeilen.
 */
export function addAtEdge(n: Node | null, id: string, side: 'right' | 'bottom'): Node {
  if (!n) return { id };
  const dir = dirOf(side);
  const lines = !isLeaf(n) && n.dir === dir ? n.children.length : 1;
  const frac = 1 / (lines + 1);
  return tidy({ dir, children: [n, { id }], sizes: [1 - frac, frac] });
}

/** Ablegen: Mitte tauscht, Rand dockt an; Ziel AREA = am Rand der ganzen Fläche. */
export function drop(n: Node, id: string, target: string, zone: Zone): Node {
  if (id === target) return n;
  if (target === AREA) return zone === 'center' ? n : dockArea(n, id, zone);
  return zone === 'center' ? swapLeaves(n, id, target) : dock(n, id, target, zone);
}

/** Größtes Blatt (nach Fläche in Pixeln); bei Gleichstand das erste. */
export function largestLeaf(n: Node, aspect: number): string {
  let best = '';
  let area = -1;
  for (const [id, r] of rects(n)) {
    const a = r.w * aspect * r.h;
    if (a > area + EPS) {
      best = id;
      area = a;
    }
  }
  return best;
}

/** F-10: Neues Panel bekommt die Hälfte des größten Blatts, geteilt an dessen längerer Seite. */
export function addToLargest(n: Node | null, id: string, aspect: number): Node {
  if (!n) return { id };
  const target = largestLeaf(n, aspect);
  const r = rects(n).get(target)!;
  return insertAt(n, target, id, r.w * aspect >= r.h ? 'right' : 'bottom');
}

/** Blatt ganz rechts (bei Gleichstand das untere) – dort entsteht der Stapel. */
export function rightmost(n: Node): string {
  const all = [...rects(n).entries()];
  all.sort(([, a], [, b]) => b.x + b.w - (a.x + a.w) || b.y + b.h - (a.y + a.h));
  return all[0][0];
}

// ---------------------------------------------------------------- F-02 Kanten ziehen

/** Weg von der Wurzel zum Blatt: an jedem Knoten der Index des Kindes. */
function pathTo(n: Node, id: string): number[] | null {
  if (isLeaf(n)) return n.id === id ? [] : null;
  for (let i = 0; i < n.children.length; i++) {
    const p = pathTo(n.children[i], id);
    if (p) return [i, ...p];
  }
  return null;
}

/** Kleinste mögliche Ausdehnung eines Teilbaums in Richtung `dir`, als Anteil der Fläche. */
function minExtent(n: Node, dir: Dir, min: Min): number {
  if (isLeaf(n)) return dir === 'row' ? min.w : min.h;
  const parts = n.children.map((c) => minExtent(c, dir, min));
  return n.dir === dir ? parts.reduce((a, b) => a + b, 0) : Math.max(...parts);
}

interface EdgeHit {
  /** Weg zum teilenden Knoten. */
  path: number[];
  /** Die beiden Kinder an der Kante. */
  i: number;
  j: number;
  /** Ausdehnung des Knotens in Teilungsrichtung (Anteil der Fläche). */
  extent: number;
}

/** Sucht den nächsten Vorfahren, an dem die Kante `edge` des Blatts zwischen zwei Kindern liegt. */
function findEdge(n: Node, id: string, edge: Side): EdgeHit | null {
  const path = pathTo(n, id);
  if (!path) return null;
  const dir = dirOf(edge);
  const after = edge === 'right' || edge === 'bottom';
  const boxes: { node: Split; rect: FRect }[] = [];
  let node: Node = n;
  let box = FULL;
  for (const idx of path) {
    const s = node as Split;
    boxes.push({ node: s, rect: box });
    const off = s.sizes.slice(0, idx).reduce((a, b) => a + b, 0);
    box =
      s.dir === 'row'
        ? { x: box.x + off * box.w, y: box.y, w: s.sizes[idx] * box.w, h: box.h }
        : { x: box.x, y: box.y + off * box.h, w: box.w, h: s.sizes[idx] * box.h };
    node = s.children[idx];
  }
  for (let d = path.length - 1; d >= 0; d--) {
    const { node: s, rect } = boxes[d];
    const idx = path[d];
    if (s.dir !== dir) continue;
    if (after && idx < s.children.length - 1) return { path: path.slice(0, d), i: idx, j: idx + 1, extent: dir === 'row' ? rect.w : rect.h };
    if (!after && idx > 0) return { path: path.slice(0, d), i: idx - 1, j: idx, extent: dir === 'row' ? rect.w : rect.h };
  }
  return null;
}

/** Lässt sich diese Kante ziehen? (Am Rand der Arbeitsfläche nicht.) */
export function canResize(n: Node | null, id: string, edge: Side): boolean {
  return !!n && !!findEdge(n, id, edge);
}

function clone(n: Node): Node {
  return isLeaf(n) ? { id: n.id } : { dir: n.dir, children: n.children.map(clone), sizes: [...n.sizes] };
}

/**
 * F-02: Kante eines Blatts um `delta` verschieben (Anteil der Fläche, positiv = nach rechts
 * bzw. unten). Die beiden angrenzenden Bereiche wachsen bzw. schrumpfen; die Mindestgröße
 * aller Panels darin bleibt erhalten.
 */
export function resizeEdge(n: Node, id: string, edge: Side, delta: number, min: Min): Node {
  const hit = findEdge(n, id, edge);
  if (!hit || hit.extent <= EPS) return n;
  const out = clone(n);
  let s = out as Split;
  for (const idx of hit.path) s = s.children[idx] as Split;
  const mins = s.children.map((c) => minExtent(c, s.dir, min) / hit.extent);
  const want = delta / hit.extent;
  // Wachsen auf Kosten der Nachbarn in Zugrichtung: erst der direkte Nachbar, ist er an seiner
  // Mindestgröße, schiebt die Kante weiter in den nächsten (wie bisher in F-02).
  const order =
    want > 0
      ? Array.from({ length: s.sizes.length - hit.j }, (_, k) => hit.j + k)
      : Array.from({ length: hit.i + 1 }, (_, k) => hit.i - k);
  const grower = want > 0 ? hit.i : hit.j;
  let rest = Math.abs(want);
  let moved = 0;
  for (const k of order) {
    const take = Math.max(0, Math.min(rest, s.sizes[k] - mins[k]));
    s.sizes[k] -= take;
    rest -= take;
    moved += take;
    if (rest <= EPS) break;
  }
  if (moved <= EPS) return n;
  s.sizes[grower] += moved;
  return out;
}

/** Zieht bis zu zwei Kanten gleichzeitig (Ecke = waagrechte und senkrechte Kante). */
export function resizeEdges(
  n: Node,
  id: string,
  edges: { x?: 'left' | 'right'; dx?: number; y?: 'top' | 'bottom'; dy?: number },
  min: Min,
): Node {
  let t = n;
  if (edges.x && edges.dx) t = resizeEdge(t, id, edges.x, edges.dx, min);
  if (edges.y && edges.dy) t = resizeEdge(t, id, edges.y, edges.dy, min);
  return t;
}

/**
 * F-12: Blatt auf eine Wunschgröße bringen (Anteil von Breite/Höhe der Fläche), so weit
 * die Nachbarn es zulassen. Erst die rechte bzw. untere Kante, dann die linke bzw. obere.
 */
export function setLeafSize(n: Node, id: string, wf: number | null, hf: number | null, min: Min): Node {
  let t = n;
  const adjust = (want: number, far: Side, near: Side, key: 'w' | 'h') => {
    const cur = () => rects(t).get(id)?.[key] ?? 0;
    t = resizeEdge(t, id, far, want - cur(), min);
    const rest = want - cur();
    if (Math.abs(rest) > EPS) t = resizeEdge(t, id, near, -rest, min);
  };
  if (!hasLeaf(t, id)) return n;
  if (wf !== null) adjust(wf, 'right', 'left', 'w');
  if (hf !== null) adjust(hf, 'bottom', 'top', 'h');
  return t;
}

// ---------------------------------------------------------------- Prüfen

/** Prüft gespeicherte Daten: gültiger Baum, Anteile positiv, keine doppelten Blätter. */
export function isNode(v: unknown): v is Node {
  const check = (x: unknown): boolean => {
    if (!x || typeof x !== 'object') return false;
    const o = x as Record<string, unknown>;
    if (typeof o.id === 'string') return true;
    if (o.dir !== 'row' && o.dir !== 'col') return false;
    if (!Array.isArray(o.children) || !Array.isArray(o.sizes)) return false;
    if (o.children.length < 2 || o.children.length !== o.sizes.length) return false;
    if (!o.sizes.every((s) => typeof s === 'number' && Number.isFinite(s) && s > 0)) return false;
    return o.children.every(check);
  };
  if (!check(v)) return false;
  const ids = leaves(v as Node);
  return new Set(ids).size === ids.length;
}
