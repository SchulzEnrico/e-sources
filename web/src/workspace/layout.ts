/**
 * Reine Raster-Logik für eine Bildschirmklasse.
 * Regeln (F-01, F-02): keine Überlappung, nichts ragt über den Bildschirmrand,
 * Nachbarn weichen nur nach rechts aus (Fenster darunter werden von oben her niedriger).
 */
import type { GridSpec, Rect, WinItem } from './types';

export const MIN_W = 2;
export const MIN_H = 2;

// ---------------------------------------------------------------- Hilfen

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

export function inBounds(r: Rect, g: GridSpec): boolean {
  return r.x >= 0 && r.y >= 0 && r.w >= 1 && r.h >= 1 && r.x + r.w <= g.cols && r.y + r.h <= g.rows;
}

/** Liegt das Rechteck im sichtbaren Raster und berührt keines der anderen? */
export function isFree(r: Rect, others: Rect[], g: GridSpec): boolean {
  return inBounds(r, g) && others.every((o) => !overlaps(r, o));
}

/** Lesereihenfolge: von oben nach unten, dann von links nach rechts. */
export function sortReading<T extends Rect>(items: T[]): T[] {
  return [...items].sort((a, b) => a.y - b.y || a.x - b.x);
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function cloneAll<T extends Rect>(ws: T[]): T[] {
  return ws.map((w) => ({ ...w }));
}

function sameRect(a: Rect, b: Rect): boolean {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

export function sameLayout(a: WinItem[], b: WinItem[]): boolean {
  return a.length === b.length && a.every((w, i) => w.id === b[i].id && sameRect(w, b[i]));
}

/** Alle Fenster im Raster und ohne Überlappung? */
export function isValidLayout(ws: Rect[], g: GridSpec): boolean {
  return ws.every((a, i) => inBounds(a, g) && ws.every((b, j) => i === j || !overlaps(a, b)));
}

// ---------------------------------------------------------------- Ausweichen

/**
 * Hält ein Fenster fest und lässt alle überlappenden Fenster ausweichen:
 * nach rechts (linke Kante rückt nach rechts, das Fenster wird schmaler)
 * oder – wenn es vorher unterhalb lag – nach unten (obere Kante rückt nach unten).
 * Ein Fenster, das zu schmal würde, rückt als Ganzes weiter und schiebt seinerseits.
 * Gibt null zurück, wenn dabei etwas über den Rand geriete.
 *
 * @param before Positionen vor der Änderung; entscheidet, ob ein Nachbar „darunter“ lag.
 */
export function resolve(items: WinItem[], g: GridSpec, fixedId: string, before: WinItem[]): WinItem[] | null {
  const ws = cloneAll(items);
  const fixed = ws.find((w) => w.id === fixedId);
  if (!fixed || !inBounds(fixed, g)) return null;
  const orig = new Map(before.map((w) => [w.id, w as Rect]));

  for (let guard = 0; guard < 1000; guard++) {
    let pair: [WinItem, WinItem] | null = null;
    search: for (const a of ws) {
      for (const b of ws) {
        if (a !== b && overlaps(a, b)) {
          pair = [a, b];
          break search;
        }
      }
    }
    if (!pair) return ws;

    const [a, b] = pair;
    let pusher: WinItem;
    let mover: WinItem;
    if (a.id === fixedId) [pusher, mover] = [a, b];
    else if (b.id === fixedId) [pusher, mover] = [b, a];
    else if (a.x < b.x || (a.x === b.x && a.y <= b.y)) [pusher, mover] = [a, b];
    else [pusher, mover] = [b, a];

    const po = orig.get(pusher.id) ?? pusher;
    const mo = orig.get(mover.id) ?? mover;
    const wasBelow = mo.y >= po.y + po.h;

    if (wasBelow) {
      const top = pusher.y + pusher.h;
      const bottom = Math.max(mover.y + mover.h, top + MIN_H);
      if (bottom > g.rows) return null;
      mover.y = top;
      mover.h = bottom - top;
    } else {
      const left = pusher.x + pusher.w;
      const right = Math.max(mover.x + mover.w, left + MIN_W);
      if (right > g.cols) return null;
      mover.x = left;
      mover.w = right - left;
    }
  }
  return null;
}

/**
 * Lässt Fenster in freie Flächen hineinwachsen (F-02: Nachbarn wachsen zurück).
 * Jede Runde wächst jedes Fenster höchstens eine Zelle pro Richtung, damit sich
 * mehrere Nachbarn eine Lücke gerecht teilen.
 */
export function growIntoGaps(windows: WinItem[], g: GridSpec, excludeId?: string | null): WinItem[] {
  const ws = cloneAll(windows);
  let changed = true;
  let guard = 0;
  while (changed && guard++ < g.cols * g.rows) {
    changed = false;
    for (const w of sortReading(ws)) {
      if (w.id === excludeId) continue;
      const others = () => ws.filter((o) => o.id !== w.id);
      if (isFree({ x: w.x + w.w, y: w.y, w: 1, h: w.h }, others(), g)) {
        w.w++;
        changed = true;
      }
      if (isFree({ x: w.x - 1, y: w.y, w: 1, h: w.h }, others(), g)) {
        w.x--;
        w.w++;
        changed = true;
      }
      if (isFree({ x: w.x, y: w.y + w.h, w: w.w, h: 1 }, others(), g)) {
        w.h++;
        changed = true;
      }
      if (isFree({ x: w.x, y: w.y - 1, w: w.w, h: 1 }, others(), g)) {
        w.y--;
        w.h++;
        changed = true;
      }
    }
  }
  return ws;
}

// ---------------------------------------------------------------- Größe und Position

/**
 * F-12: Größenänderung. Nachbarn weichen nach rechts bzw. unten aus.
 * Reicht der Platz nicht, wächst das Fenster nur so weit wie möglich.
 * Wird das Fenster kleiner, wachsen die Nachbarn in die Lücke.
 * Gibt null zurück, wenn gar keine gültige Größe möglich ist.
 */
export function resizeWindow(items: WinItem[], g: GridSpec, id: string, next: Rect): WinItem[] | null {
  const current = items.find((w) => w.id === id);
  if (!current) return null;
  const x = clamp(next.x, 0, g.cols - MIN_W);
  const y = clamp(next.y, 0, g.rows - MIN_H);
  const maxW = clamp(next.w, MIN_W, g.cols - x);
  const maxH = clamp(next.h, MIN_H, g.rows - y);
  const minW = Math.min(maxW, current.w);
  const minH = Math.min(maxH, current.h);

  const candidates: Rect[] = [];
  for (let w = maxW; w >= minW; w--) for (let h = maxH; h >= minH; h--) candidates.push({ x, y, w, h });
  candidates.sort((a, b) => b.w * b.h - a.w * a.h);

  for (const c of candidates) {
    const trial = items.map((w) => (w.id === id ? { ...w, ...c } : w));
    const ok = resolve(trial, g, id, items);
    if (ok) return growIntoGaps(ok, g, id);
  }
  return null;
}

/**
 * F-11: Verschieben. Landet die Mitte des Fensters auf einem anderen Fenster,
 * tauschen beide ihre Plätze. Sonst weichen Nachbarn aus; geht das nicht, null.
 */
export function moveWindow(items: WinItem[], g: GridSpec, id: string, next: Rect): WinItem[] | null {
  const current = items.find((w) => w.id === id);
  if (!current) return null;
  const cx = next.x + next.w / 2;
  const cy = next.y + next.h / 2;
  const target = items.find(
    (o) => o.id !== id && cx >= o.x && cx < o.x + o.w && cy >= o.y && cy < o.y + o.h,
  );
  if (target) return swapRects(items, id, target.id);
  const trial = items.map((w) => (w.id === id ? { ...w, x: next.x, y: next.y } : w));
  return resolve(trial, g, id, items);
}

/** F-11: Zwei Fenster tauschen Position und Größe. */
export function swapRects(items: WinItem[], a: string, b: string): WinItem[] {
  const wa = items.find((w) => w.id === a);
  const wb = items.find((w) => w.id === b);
  if (!wa || !wb || a === b) return items;
  return items.map((w) => {
    if (w.id === a) return { ...w, x: wb.x, y: wb.y, w: wb.w, h: wb.h };
    if (w.id === b) return { ...w, x: wa.x, y: wa.y, w: wa.w, h: wa.h };
    return w;
  });
}

// ---------------------------------------------------------------- Platz für neue Fenster

/** Erste freie Stelle für ein Fenster der Größe w × h. */
export function findFreeSpot(windows: Rect[], g: GridSpec, w: number, h: number): { x: number; y: number } | null {
  for (let y = 0; y + h <= g.rows; y++) {
    for (let x = 0; x + w <= g.cols; x++) {
      if (isFree({ x, y, w, h }, windows, g)) return { x, y };
    }
  }
  return null;
}

/**
 * Platz für ein neues Fenster: zuerst eine freie Stelle in Platzgröße (oder halber Höhe),
 * sonst wird das größte Fenster halbiert. Gibt null zurück, wenn kein Platz mehr ist.
 */
export function placeNew(
  windows: WinItem[],
  g: GridSpec,
  slot: { w: number; h: number },
): { windows: WinItem[]; rect: Rect } | null {
  const sw = Math.max(MIN_W, Math.floor(slot.w));
  const sh = Math.max(MIN_H, Math.floor(slot.h));
  for (const [w, h] of [
    [sw, sh],
    [sw, Math.max(MIN_H, Math.floor(sh / 2))],
  ]) {
    const spot = findFreeSpot(windows, g, w, h);
    if (spot) return { windows, rect: { ...spot, w, h } };
  }
  const big = windows
    .filter((w) => w.w >= 2 * MIN_W || w.h >= 2 * MIN_H)
    .sort((a, b) => b.w * b.h - a.w * a.h)[0];
  if (!big) return null;
  const ws = cloneAll(windows);
  const t = ws.find((w) => w.id === big.id)!;
  // Spalten sind auf Querformat-Bildschirmen breiter als Zeilen hoch,
  // daher bevorzugt nebeneinander teilen.
  if (t.w >= 2 * MIN_W && (t.w * 1.5 >= t.h || t.h < 2 * MIN_H)) {
    const left = Math.ceil(t.w / 2);
    const rect = { x: t.x + left, y: t.y, w: t.w - left, h: t.h };
    t.w = left;
    return { windows: ws, rect };
  }
  const top = Math.ceil(t.h / 2);
  const rect = { x: t.x, y: t.y + top, w: t.w, h: t.h - top };
  t.h = top;
  return { windows: ws, rect };
}

// ---------------------------------------------------------------- Gleich verteilen

/** Teilt total Zellen möglichst gleich auf k Teile auf. */
function split(total: number, k: number): number[] {
  const base = Math.floor(total / k);
  const extra = total - base * k;
  return Array.from({ length: k }, (_, i) => base + (i < extra ? 1 : 0));
}

/**
 * F-05: Verteilt alle Plätze gleichmäßig. Im Querformat bilden sie Zeilen, im Hochformat
 * Spalten (höchstens `lines` Reihen mit höchstens `perLine` Plätzen). Die Reihenfolge folgt
 * der Lesereihenfolge, `lastId` (der Stapel) kommt immer ans Ende, also nach rechts unten.
 */
export function distributeEvenly<T extends WinItem>(
  windows: T[],
  g: GridSpec,
  layout: { lines: number; perLine: number; orientation: 'landscape' | 'portrait' },
  lastId?: string,
): T[] {
  const n = windows.length;
  if (n === 0) return [];
  const ordered = sortReading(windows).sort((a, b) => Number(a.id === lastId) - Number(b.id === lastId));
  const lineCount = Math.max(1, Math.min(layout.lines, Math.ceil(n / layout.perLine)));
  const per = Math.ceil(n / lineCount);
  const placed = new Map<string, Rect>();
  const landscape = layout.orientation === 'landscape';
  const lineSizes = split(landscape ? g.rows : g.cols, lineCount);
  let offset = 0;
  for (let l = 0; l < lineCount; l++) {
    const items = ordered.slice(l * per, (l + 1) * per);
    const sizes = split(landscape ? g.cols : g.rows, items.length);
    let pos = 0;
    items.forEach((w, i) => {
      placed.set(
        w.id,
        landscape
          ? { x: pos, y: offset, w: sizes[i], h: lineSizes[l] }
          : { x: offset, y: pos, w: lineSizes[l], h: sizes[i] },
      );
      pos += sizes[i];
    });
    offset += lineSizes[l];
  }
  return windows.map((w) => ({ ...w, ...placed.get(w.id)! }));
}

/**
 * F-13: Fenster für den Splitscreen – das aktive Fenster und die folgenden
 * in Lesereihenfolge (am Ende wird vorne weitergezählt).
 */
export function splitSelection<T extends Rect & { id: string }>(windows: T[], activeId: string | null, count: number): T[] {
  const ordered = sortReading(windows);
  if (ordered.length <= count) return ordered;
  const start = Math.max(0, ordered.findIndex((w) => w.id === activeId));
  return Array.from({ length: count }, (_, k) => ordered[(start + k) % ordered.length]);
}
