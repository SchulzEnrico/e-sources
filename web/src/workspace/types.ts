/** Rechteck im Raster, gemessen in Rasterzellen. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Spalten und Zeilen eines Rasters. */
export interface GridSpec {
  cols: number;
  rows: number;
}

/** Name eines Fensters – gilt für alle Bildschirmklassen. */
export interface WinMeta {
  id: string;
  name: string;
}

/** Position und Größe eines Fensters (oder des Stapels) in einem Layout. */
export interface Placed extends Rect {
  id: string;
}

/** Ein Platz im Raster mit Name, Position und Größe. */
export interface WinItem extends Rect {
  id: string;
  name: string;
}

/** Kennung des Stapel-Platzes im Raster (F-08). */
export const STACK_ID = '__stack__';

/** Zustand der Arbeitsfläche, der im Browser gespeichert wird. */
export interface Workspace {
  windows: WinMeta[];
  /**
   * Layout je Bildschirm-Einstellung (Schlüssel aus layoutKey). Fenster, die dort keinen
   * Platz haben, liegen im Stapel; fehlt ein Layout, wird es beim Anzeigen erzeugt.
   */
  layouts: Record<string, Placed[]>;
  /** Wunsch-Anordnung je Bildschirm-Einstellung (F-05). */
  preferred: Record<string, Placed[]>;
  /** Sichtbares Fenster im Stapel je Bildschirm-Einstellung (F-08). */
  stackFront: Record<string, string>;
  /** Wahl ein-/zweizeilig je Klasse und Ausrichtung (Schlüssel aus linesKey). */
  lines: Record<string, 1 | 2>;
  /** Laufende Nummer für den Standardnamen neuer Fenster. */
  nextNumber: number;
}
