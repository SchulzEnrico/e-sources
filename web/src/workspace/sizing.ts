import * as T from './tree';

/**
 * F-155 Größe per Tastatur (Größen-Modus): Befehle für die aktive Area. Schrittweite 5 % der
 * Arbeitsfläche; Zahlen setzen Breite und Höhe zugleich (Entscheidung Enrico 22.11.2026).
 */
export const SIZE_STEP = 0.05;

export type SizeCmd =
  /**
   * Pfeil: Kante in Pfeilrichtung verschieben – die rechte bzw. untere, liegt sie am Rand der
   * Fläche, die linke bzw. obere. Mit Umschalt (`other`) die jeweils andere Kante.
   * So macht ← ein → rückgängig und ↑ ein ↓.
   */
  | { kind: 'edge'; dir: T.Side; other: boolean }
  /** + / −: entlang der Diagonalen, Breite und Höhe zugleich. */
  | { kind: 'diag'; grow: boolean }
  /** 1–9, 0: Breite und Höhe auf diesen Anteil (0,1 … 1). */
  | { kind: 'set'; f: number };

const SIGN: Record<T.Side, number> = { left: -1, right: 1, top: -1, bottom: 1 };

/** Welche Kante ein Pfeil bewegt; null = in dieser Richtung gibt es keine bewegliche Kante. */
export function edgeFor(tree: T.Node, leaf: string, dir: T.Side, other: boolean): T.Side | null {
  const horizontal = dir === 'left' || dir === 'right';
  const far: T.Side = horizontal ? 'right' : 'bottom';
  const near: T.Side = horizontal ? 'left' : 'top';
  const canFar = T.canResize(tree, leaf, far);
  const canNear = T.canResize(tree, leaf, near);
  const main = canFar ? far : canNear ? near : null;
  if (!other) return main;
  const alt = main === far ? near : far;
  return main && T.canResize(tree, leaf, alt) ? alt : null;
}

/** Neuer Teilungsbaum nach einem Befehl; ohne mögliche Wirkung derselbe Baum. */
export function sizeStep(tree: T.Node, leaf: string, cmd: SizeCmd, min: T.Min, step = SIZE_STEP): T.Node {
  if (!T.hasLeaf(tree, leaf)) return tree;
  switch (cmd.kind) {
    case 'edge': {
      const edge = edgeFor(tree, leaf, cmd.dir, cmd.other);
      return edge ? T.resizeEdge(tree, leaf, edge, SIGN[cmd.dir] * step, min) : tree;
    }
    case 'diag': {
      const r = T.rects(tree).get(leaf);
      if (!r) return tree;
      const d = cmd.grow ? step : -step;
      const clamp = (v: number) => Math.min(1, Math.max(0.01, v));
      return T.setLeafSize(tree, leaf, clamp(r.w + d), clamp(r.h + d), min);
    }
    case 'set':
      return T.setLeafSize(tree, leaf, cmd.f, cmd.f, min);
  }
}

/** Taste → Befehl im Größen-Modus; null = keine Größen-Taste. */
export function sizeCmdOf(e: { key: string; code: string; shiftKey: boolean }): SizeCmd | null {
  const sides: Record<string, T.Side> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'top', ArrowDown: 'bottom' };
  const side = sides[e.key];
  if (side) return { kind: 'edge', dir: side, other: e.shiftKey };
  if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') return { kind: 'diag', grow: true };
  if (e.key === '-' || e.key === '−' || e.code === 'NumpadSubtract') return { kind: 'diag', grow: false };
  const m = /^(?:Digit|Numpad)(\d)$/.exec(e.code);
  if (m && !e.shiftKey) return { kind: 'set', f: m[1] === '0' ? 1 : Number(m[1]) / 10 };
  return null;
}
