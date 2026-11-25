/**
 * F-210 (V89): Lageplan – ein Baustein für „Platz wählen …“ (neues Pad, Pad an anderen Platz),
 * NewSlot und den Notizen-Modus. Entschieden in V66 (P1, Weg C) und V89 (L1–L6, F1–F5):
 * Jede Kachel (Slot bzw. Pad) hat fünf Zonen – Ränder oben/unten/links/rechts und die Mitte (ganz);
 * ein schmaler Streifen rund um den Plan ist der Desk-Rand.
 *
 * Alles hier ist rein: Koordinaten in Anteilen (0 bis 1), keine Oberfläche.
 */
import type { FRect } from './tree';
import { PLAN_TEXT } from './terms';

export type PlanSide = 'top' | 'bottom' | 'left' | 'right';
export type PlanZone = PlanSide | 'full';
/** Wozu der Plan gerade dient – bestimmt nur Beschriftung und Vorschau. */
export type PlanKind = 'pad' | 'slot' | 'notes';

export interface PlanTile {
  id: string;
  name: string;
  /** Lage auf dem Desk als Anteil der Desk-Fläche. */
  rect: FRect;
}

/** Gewählte Stelle: `tile` = Kachel, `null` = Desk-Rand (bzw. ganzer Desk bei `full`). */
export interface PlanPick {
  tile: string | null;
  zone: PlanZone;
}

/** Breite des Außenrands (Desk-Rand) als Anteil des Plans. */
export const PLAN_RIM = 0.06;
/** Breite der Randzonen einer Kachel als Anteil der Kachel. */
export const PLAN_BAND = 0.3;

export const PLAN_SIDES: readonly PlanSide[] = ['top', 'right', 'bottom', 'left'];

const FULL_RECT: FRect = { x: 0, y: 0, w: 1, h: 1 };
const EPS = 1e-6;

export const tileOf = (tiles: readonly PlanTile[], id: string | null): PlanTile | undefined => (id ? tiles.find((t) => t.id === id) : undefined);

/** Zone innerhalb einer Kachel an der Stelle (x, y) (Desk-Anteile). */
export function zoneIn(r: FRect, x: number, y: number): PlanZone {
  const u = r.w > 0 ? (x - r.x) / r.w : 0.5;
  const v = r.h > 0 ? (y - r.y) / r.h : 0.5;
  const d: Record<PlanSide, number> = { left: u, right: 1 - u, top: v, bottom: 1 - v };
  let best: PlanSide = 'left';
  for (const s of PLAN_SIDES) if (d[s] < d[best]) best = s;
  return d[best] >= PLAN_BAND ? 'full' : best;
}

/** Wahl an einer Stelle des Plans (`px`, `py` = Anteile des ganzen Plans mit Außenrand). */
export function pickAt(tiles: readonly PlanTile[], px: number, py: number): PlanPick {
  const inner = 1 - 2 * PLAN_RIM;
  const x = (px - PLAN_RIM) / inner;
  const y = (py - PLAN_RIM) / inner;
  if (x < 0 || x > 1 || y < 0 || y > 1) {
    const d: Record<PlanSide, number> = { left: x, right: 1 - x, top: y, bottom: 1 - y };
    let best: PlanSide = 'left';
    for (const s of PLAN_SIDES) if (d[s] < d[best]) best = s;
    return { tile: null, zone: best };
  }
  const t = tiles.find((k) => x >= k.rect.x - EPS && x <= k.rect.x + k.rect.w + EPS && y >= k.rect.y - EPS && y <= k.rect.y + k.rect.h + EPS);
  if (!t) return { tile: null, zone: 'full' };
  return { tile: t.id, zone: zoneIn(t.rect, x, y) };
}

/** Hälfte eines Rechtecks zur Seite `side` (bzw. Anteil `frac`). */
export function halfOf(r: FRect, zone: PlanZone, frac = 0.5): FRect {
  switch (zone) {
    case 'left':
      return { x: r.x, y: r.y, w: r.w * frac, h: r.h };
    case 'right':
      return { x: r.x + r.w * (1 - frac), y: r.y, w: r.w * frac, h: r.h };
    case 'top':
      return { x: r.x, y: r.y, w: r.w, h: r.h * frac };
    case 'bottom':
      return { x: r.x, y: r.y + r.h * (1 - frac), w: r.w, h: r.h * frac };
    default:
      return { ...r };
  }
}

/**
 * Vorschau-Rahmen der Wahl auf dem Desk. `edgeFrac` = Anteil am Desk-Rand
 * (NewSlot: so viel wie eine vorhandene Spalte bzw. Zeile; sonst die Hälfte).
 */
export function pickRect(tiles: readonly PlanTile[], pick: PlanPick, edgeFrac = 0.5): FRect {
  const t = tileOf(tiles, pick.tile);
  if (t) return halfOf(t.rect, pick.zone);
  return halfOf(FULL_RECT, pick.zone, edgeFrac);
}

/** Liegt die Kachel an diesem Rand des Desks? */
export function touchesEdge(r: FRect, side: PlanSide): boolean {
  switch (side) {
    case 'left':
      return r.x <= EPS;
    case 'right':
      return r.x + r.w >= 1 - EPS;
    case 'top':
      return r.y <= EPS;
    default:
      return r.y + r.h >= 1 - EPS;
  }
}

const centre = (r: FRect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/** Nächste Kachel in Richtung `dir` (Pfeiltasten); keine = `null`. */
export function neighbour(tiles: readonly PlanTile[], from: string, dir: PlanSide): string | null {
  const a = tileOf(tiles, from);
  if (!a) return tiles[0]?.id ?? null;
  const c = centre(a.rect);
  let best: { id: string; score: number } | null = null;
  for (const t of tiles) {
    if (t.id === from) continue;
    const k = centre(t.rect);
    const dx = k.x - c.x;
    const dy = k.y - c.y;
    const main = dir === 'left' ? -dx : dir === 'right' ? dx : dir === 'top' ? -dy : dy;
    if (main <= EPS) continue;
    const side = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx);
    const score = main + side * 2;
    if (!best || score < best.score) best = { id: t.id, score };
  }
  return best?.id ?? null;
}

/** Kachel, die der Mitte eines Desk-Rands am nächsten liegt (vom Rand zurück in den Plan). */
export function nearestToEdge(tiles: readonly PlanTile[], side: PlanSide): string | null {
  const p = side === 'left' ? { x: 0, y: 0.5 } : side === 'right' ? { x: 1, y: 0.5 } : side === 'top' ? { x: 0.5, y: 0 } : { x: 0.5, y: 1 };
  let best: { id: string; d: number } | null = null;
  for (const t of tiles) {
    const k = centre(t.rect);
    const d = (k.x - p.x) ** 2 + (k.y - p.y) ** 2;
    if (!best || d < best.d) best = { id: t.id, d };
  }
  return best?.id ?? null;
}

const KEY_SIDE: Record<string, PlanSide> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'top', ArrowDown: 'bottom' };

/**
 * Tastatur (P7): Pfeile = Kachel (Zone bleibt), Umschalt + Pfeil = Seite (noch einmal am Desk-Rand =
 * auf den Desk-Rand), Leertaste = ganz, Pos1/Ende = erste/letzte Kachel. Liefert `null`, wenn die
 * Taste nichts bedeutet (dann nicht abfangen).
 */
export function keyPick(tiles: readonly PlanTile[], pick: PlanPick, key: string, shift = false): PlanPick | null {
  if (key === ' ' || key === 'Spacebar') return { tile: pick.tile, zone: 'full' };
  if (key === 'Home') return tiles[0] ? { tile: tiles[0].id, zone: pick.zone } : null;
  if (key === 'End') return tiles.length ? { tile: tiles[tiles.length - 1].id, zone: pick.zone } : null;
  const dir = KEY_SIDE[key];
  if (!dir) return null;
  const t = tileOf(tiles, pick.tile);
  if (shift) {
    if (t && pick.zone === dir && touchesEdge(t.rect, dir)) return { tile: null, zone: dir };
    return { tile: pick.tile, zone: dir };
  }
  if (!t) {
    // vom Desk-Rand zurück: Kachel an dem Rand, an dem die Wahl lag
    const from = pick.zone === 'full' ? dir : pick.zone;
    const id = nearestToEdge(tiles, from);
    return id ? { tile: id, zone: pick.zone } : pick;
  }
  const next = neighbour(tiles, t.id, dir);
  return next ? { tile: next, zone: pick.zone } : pick;
}

/** Beschriftung der Wahl – Vorschau-Rahmen, Ansage und Name der Zone (NF-03). */
export function pickName(tiles: readonly PlanTile[], pick: PlanPick, kind: PlanKind): string {
  const t = tileOf(tiles, pick.tile);
  const T = PLAN_TEXT;
  if (!t) {
    if (pick.zone === 'full') return kind === 'pad' ? T.wholeDesk : T.noWhole;
    if (kind === 'slot') return T.slotEdge(pick.zone);
    if (kind === 'notes') return T.notesEdge(pick.zone);
    return `${T.wholeDesk} · ${T.half[pick.zone]}`;
  }
  if (kind === 'slot') return pick.zone === 'full' ? T.slotStack(t.name) : T.slotNext(t.name, pick.zone);
  if (kind === 'notes') return pick.zone === 'full' ? T.notesTab(t.name) : T.notesNext(t.name, pick.zone);
  return pick.zone === 'full' ? `${t.name} · ${T.whole}` : `${t.name} · ${T.half[pick.zone]}`;
}

/** Zwei Wahlen gleich? */
export const samePick = (a: PlanPick, b: PlanPick): boolean => a.tile === b.tile && a.zone === b.zone;
