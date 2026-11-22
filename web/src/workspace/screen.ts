/** F-03: Bildschirmklassen. Sie bestimmen, wie viele Panels gleichzeitig sichtbar sind. */
export type ScreenClassId = 'phone' | 'small' | 'laptop' | 'monitor' | 'ultrawide' | 'superwide' | 'vision';
export type Orientation = 'landscape' | 'portrait';
export type Lines = 1 | 2;

export interface ScreenClass {
  id: ScreenClassId;
  label: string;
  /** Sichtbare Panels (ohne die im Stapel). */
  capacity: number;
  /** Ab dieser längeren Bildschirmseite in CSS-Pixeln gilt die Klasse (null = nur manuell). */
  minLongSide: number | null;
  /** Typisches Seitenverhältnis (lange : kurze Seite) – entscheidet, wie ein neues Panel geteilt wird. */
  aspect: number;
}

export const SCREEN_CLASSES: ScreenClass[] = [
  { id: 'phone', label: 'Smartphone', capacity: 1, minLongSide: 0, aspect: 2.1 },
  { id: 'small', label: 'Tablet / kleiner Laptop', capacity: 2, minLongSide: 700, aspect: 1.5 },
  { id: 'laptop', label: 'Großer Laptop', capacity: 4, minLongSide: 1600, aspect: 1.6 },
  { id: 'monitor', label: 'Monitor', capacity: 6, minLongSide: 2200, aspect: 1.78 },
  { id: 'ultrawide', label: 'Ultrawide (z. B. 34 Zoll)', capacity: 8, minLongSide: 3200, aspect: 2.4 },
  { id: 'superwide', label: 'Super-Ultrawide (z. B. 49 Zoll)', capacity: 10, minLongSide: 4600, aspect: 3.6 },
  { id: 'vision', label: 'Apple Vision', capacity: 16, minLongSide: null, aspect: 1.78 },
];

/** Kürzere Seite unter diesem Wert = Smartphone. */
const PHONE_SHORT_SIDE = 600;

export function screenClass(id: ScreenClassId): ScreenClass {
  return SCREEN_CLASSES.find((c) => c.id === id) ?? SCREEN_CLASSES[2];
}

/** Ab 4 sichtbaren Panels darf der Nutzer zwischen ein- und zweizeilig wählen. */
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
  /** F-27: Zusatzfenster (Id aus Workspace.windows); fehlt = Hauptfenster. */
  win?: string;
}

/** Eckdaten einer Einstellung für die Anordnung. */
export interface ScreenSpec {
  capacity: number;
  /** Reihen: Zeilen im Querformat, Spalten im Hochformat. */
  lines: Lines;
  /** Panels pro Reihe bei voller Belegung. */
  perLine: number;
  orientation: Orientation;
  /** Breite : Höhe der Arbeitsfläche (geschätzt aus der Klasse). */
  aspect: number;
}

/** Jede Kombination aus Klasse, Ausrichtung und Reihen hat ihre eigene Anordnung. */
export function layoutKey(s: ScreenSetup): string {
  const base = `${s.cls}:${s.orientation}:${s.lines}`;
  // F-27: Zusatzfenster haben je Einstellung ihre eigene Anordnung.
  return s.win ? `${s.win}/${base}` : base;
}

export function parseLayoutKey(key: string): ScreenSetup | null {
  const slash = key.indexOf('/');
  const win = slash >= 0 ? key.slice(0, slash) : '';
  const [cls, orientation, lines] = key.slice(slash + 1).split(':');
  if (!SCREEN_CLASSES.some((c) => c.id === cls)) return null;
  if (orientation !== 'landscape' && orientation !== 'portrait') return null;
  if (lines !== '1' && lines !== '2') return null;
  const setup: ScreenSetup = { cls: cls as ScreenClassId, orientation, lines: Number(lines) as Lines };
  if (win) setup.win = win;
  return setup;
}

/** Schlüssel für die Wahl ein-/zweizeilig, gilt je Klasse und Ausrichtung. */
export function linesKey(cls: ScreenClassId, orientation: Orientation): string {
  return `${cls}:${orientation}`;
}

export function specOf(s: ScreenSetup): ScreenSpec {
  const c = screenClass(s.cls);
  const lines: Lines = allowsTwoLines(s.cls) ? s.lines : 1;
  const perLine = Math.ceil(c.capacity / lines);
  const aspect = s.orientation === 'landscape' ? c.aspect : 1 / c.aspect;
  return { capacity: c.capacity, lines, perLine, orientation: s.orientation, aspect };
}

/** Größe einer Area bei gleichmäßiger Verteilung (Anteil von Breite und Höhe). */
export function slotSize(spec: ScreenSpec): { w: number; h: number } {
  return spec.orientation === 'landscape'
    ? { w: 1 / spec.perLine, h: 1 / spec.lines }
    : { w: 1 / spec.lines, h: 1 / spec.perLine };
}
