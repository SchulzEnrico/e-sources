import type { GridSpec } from './types';

/** F-03: Bildschirmklassen. Sie bestimmen, wie viele Fenster gleichzeitig sichtbar sind. */
export type ScreenClassId = 'phone' | 'small' | 'laptop' | 'monitor' | 'ultrawide' | 'superwide' | 'vision';
export type Orientation = 'landscape' | 'portrait';
export type Lines = 1 | 2;

export interface ScreenClass {
  id: ScreenClassId;
  label: string;
  /** Sichtbare Fenster (ohne die im Stapel). */
  capacity: number;
  /** Ab dieser längeren Bildschirmseite in CSS-Pixeln gilt die Klasse (null = nur manuell). */
  minLongSide: number | null;
}

export const SCREEN_CLASSES: ScreenClass[] = [
  { id: 'phone', label: 'Smartphone', capacity: 1, minLongSide: 0 },
  { id: 'small', label: 'Tablet / kleiner Laptop', capacity: 2, minLongSide: 700 },
  { id: 'laptop', label: 'Großer Laptop', capacity: 4, minLongSide: 1600 },
  { id: 'monitor', label: 'Monitor', capacity: 6, minLongSide: 2200 },
  { id: 'ultrawide', label: 'Ultrawide (z. B. 34 Zoll)', capacity: 8, minLongSide: 3200 },
  { id: 'superwide', label: 'Super-Ultrawide (z. B. 49 Zoll)', capacity: 10, minLongSide: 4600 },
  { id: 'vision', label: 'Apple Vision', capacity: 16, minLongSide: null },
];

/** Kürzere Seite unter diesem Wert = Smartphone. */
const PHONE_SHORT_SIDE = 600;

export function screenClass(id: ScreenClassId): ScreenClass {
  return SCREEN_CLASSES.find((c) => c.id === id) ?? SCREEN_CLASSES[2];
}

/** Ab 4 sichtbaren Fenstern darf der Nutzer zwischen ein- und zweizeilig wählen. */
export function allowsTwoLines(id: ScreenClassId): boolean {
  return screenClass(id).capacity >= 4;
}

/** Erkennt Klasse und Ausrichtung aus der Größe der Arbeitsfläche. */
export function detectScreen(width: number, height: number): { cls: ScreenClassId; orientation: Orientation } {
  const orientation: Orientation = height > width ? 'portrait' : 'landscape';
  const long = Math.max(width, height);
  const short = Math.min(width, height);
  if (short < PHONE_SHORT_SIDE) return { cls: 'phone', orientation };
  let cls: ScreenClassId = 'small';
  for (const c of SCREEN_CLASSES) {
    if (c.minLongSide !== null && c.id !== 'phone' && long >= c.minLongSide) cls = c.id;
  }
  return { cls, orientation };
}

/** Eine konkrete Bildschirm-Einstellung: Klasse, Ausrichtung, ein- oder zweizeilig. */
export interface ScreenSetup {
  cls: ScreenClassId;
  orientation: Orientation;
  lines: Lines;
}

/** Raster einer Einstellung, dazu die Zahl der Reihen und Fenster pro Reihe. */
export interface ScreenSpec extends GridSpec {
  capacity: number;
  /** Reihen: Zeilen im Querformat, Spalten im Hochformat. */
  lines: Lines;
  /** Fenster pro Reihe. */
  perLine: number;
  orientation: Orientation;
  /** Größe eines Platzes bei gleichmäßiger Verteilung. */
  slotW: number;
  slotH: number;
}

/** Jede Kombination aus Klasse, Ausrichtung und Reihen hat ihr eigenes Layout. */
export function layoutKey(s: ScreenSetup): string {
  return `${s.cls}:${s.orientation}:${s.lines}`;
}

export function parseLayoutKey(key: string): ScreenSetup | null {
  const [cls, orientation, lines] = key.split(':');
  if (!SCREEN_CLASSES.some((c) => c.id === cls)) return null;
  if (orientation !== 'landscape' && orientation !== 'portrait') return null;
  if (lines !== '1' && lines !== '2') return null;
  return { cls: cls as ScreenClassId, orientation, lines: Number(lines) as Lines };
}

/** Schlüssel für die Wahl ein-/zweizeilig, gilt je Klasse und Ausrichtung. */
export function linesKey(cls: ScreenClassId, orientation: Orientation): string {
  return `${cls}:${orientation}`;
}

/**
 * Raster je Einstellung: Jeder Platz ist 4 Zellen breit bzw. hoch, damit sich Fenster
 * auch bei voller Belegung noch verkleinern und vergrößern lassen.
 */
export function specOf(s: ScreenSetup): ScreenSpec {
  const capacity = screenClass(s.cls).capacity;
  const lines: Lines = allowsTwoLines(s.cls) ? s.lines : 1;
  const perLine = Math.ceil(capacity / lines);
  if (s.orientation === 'landscape') {
    const cols = Math.max(4, perLine * 4);
    const rows = 12;
    return { cols, rows, capacity, lines, perLine, orientation: s.orientation, slotW: cols / perLine, slotH: rows / lines };
  }
  const cols = 12;
  const rows = Math.max(12, perLine * 4);
  return { cols, rows, capacity, lines, perLine, orientation: s.orientation, slotW: cols / lines, slotH: rows / perLine };
}
