/**
 * F-153/F-187: Anordnen von Slots – gemeinsam für das Radar im Cockpit und den Layout-Modus.
 * Reine Rechnungen ohne Oberfläche: Rand beim Ziehen, Nachbar in einer Richtung, Alt+Pfeil.
 */
import * as T from './tree';
import { radarResize } from './focus';
import { ARRANGE_TEXT } from './terms';

/** Schrittweite für Alt+Umschalt+Pfeil (Anteil der Fläche). */
export const ARRANGE_STEP = 0.05;
/** Randstreifen einer Kachel (Anteil), in dem Loslassen „dort einsetzen“ heißt; innen = Mitte. */
export const DOCK_BAND = 0.28;
/** Randstreifen der ganzen Karte in Pixeln: dort ablegen = an den Rand der ganzen Fläche. */
export const MAP_BAND_PX = 7;

export const ARROWS: Record<string, [number, number, T.Side]> = {
  ArrowRight: [1, 0, 'right'],
  ArrowLeft: [-1, 0, 'left'],
  ArrowDown: [0, 1, 'bottom'],
  ArrowUp: [0, -1, 'top'],
};

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

/** Nächster Rand eines Kastens zu einem Punkt; `rel` = Abstand als Anteil statt in Pixeln. */
export function nearestSide(x: number, y: number, b: Box, rel = false): [T.Side, number] {
  const d: [T.Side, number][] = rel
    ? [
        ['left', (x - b.left) / b.width],
        ['right', (b.right - x) / b.width],
        ['top', (y - b.top) / b.height],
        ['bottom', (b.bottom - y) / b.height],
      ]
    : [
        ['left', x - b.left],
        ['right', b.right - x],
        ['top', y - b.top],
        ['bottom', b.bottom - y],
      ];
  d.sort((m, n) => m[1] - n[1]);
  return d[0];
}

/** Nächstes Blatt in einer Richtung (Mitte zu Mitte, quer dazu zählt doppelt). */
export function neighbourLeaf(rects: Map<string, T.FRect>, from: string, dx: number, dy: number): string | null {
  const c = (r: T.FRect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
  const fr = rects.get(from);
  if (!fr) return null;
  const o = c(fr);
  let best: string | null = null;
  let score = Infinity;
  for (const [id, r] of rects) {
    if (id === from) continue;
    const v = c(r);
    const along = (v.x - o.x) * dx + (v.y - o.y) * dy;
    if (along <= 0.001) continue;
    const s = along + 2 * (Math.abs((v.x - o.x) * dy) + Math.abs((v.y - o.y) * dx));
    if (s < score) {
      score = s;
      best = id;
    }
  }
  return best;
}

/**
 * F-153 Tastatur: Alt+Pfeil setzt den Slot hinter den Nachbarn in dieser Richtung (ohne Nachbarn
 * an den ganzen Rand), Alt+Umschalt+Pfeil macht ihn breiter/schmaler bzw. höher/flacher.
 * `nb` = Nachbar, wenn der Aufrufer ihn selbst bestimmt; sonst aus dem Baum. Unverändert → `none`.
 */
export function arrangeStep(tree: T.Node, leaf: string, key: string, resize: boolean, min: T.Min, title: string, nb?: string | null): { next: T.Node; none: string } {
  const [dx, dy, side] = ARROWS[key];
  if (resize) {
    const axis = dx ? 'w' : 'h';
    const grow = dx > 0 || dy > 0;
    return { next: radarResize(tree, leaf, axis, grow, ARRANGE_STEP, min), none: ARRANGE_TEXT.noResize(title, axis, grow) };
  }
  const rects = T.rects(tree);
  const other = nb === undefined ? neighbourLeaf(rects, leaf, dx, dy) : nb;
  const r = rects.get(leaf) ?? T.FULL;
  const spans = dx ? r.h > 0.999 && (dx > 0 ? r.x + r.w > 0.999 : r.x < 0.001) : r.w > 0.999 && (dy > 0 ? r.y + r.h > 0.999 : r.y < 0.001);
  const next = other ? T.dock(tree, leaf, other, side) : spans ? tree : T.dockArea(tree, leaf, side);
  return { next, none: ARRANGE_TEXT.atEdge(title, side) };
}

/** Gleicher Baum? (Vergleich über den Inhalt.) */
export const sameTree = (a: T.Node | null, b: T.Node | null) => JSON.stringify(a) === JSON.stringify(b);
