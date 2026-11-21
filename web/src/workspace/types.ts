import type { FRect, Node } from './tree';

/** Name eines Panels – gilt für alle Bildschirmklassen. */
export interface PanelMeta {
  id: string;
  name: string;
  /** Gerade angezeigte Adresse (F-14). */
  url?: string;
  /**
   * Eigener Verlauf des Panels (F-14): alle über die Adresszeile geöffneten Adressen.
   * Klicks innerhalb einer fremden Seite sind nicht erfassbar (iframe, cross-origin).
   */
  history?: string[];
  /** Position von `url` in `history`. */
  pos?: number;
  /** Startseite für den Home-Knopf; ohne Angabe die erste geöffnete Adresse. */
  home?: string;
}

/** Kennung des Stapel-Platzes in der Anordnung (F-08). */
export const STACK_ID = '__stack__';

/** Ein Platz auf der Arbeitsfläche: ein Panel oder der Stapel, mit Lage als Anteil der Fläche. */
export interface Slot {
  id: string;
  name: string;
  rect: FRect;
}

/** Zustand der Arbeitsfläche, der im Browser gespeichert wird. */
export interface Workspace {
  panels: PanelMeta[];
  /**
   * Anordnung je Bildschirm-Einstellung (Schlüssel aus layoutKey) als Teilungsbaum.
   * Panels, die dort keinen Platz haben, liegen im Stapel; fehlt eine Anordnung, wird sie
   * beim Anzeigen erzeugt.
   */
  layouts: Record<string, Node>;
  /** Wunsch-Anordnung je Bildschirm-Einstellung (F-05). */
  preferred: Record<string, Node>;
  /** Sichtbares Panel im Stapel je Bildschirm-Einstellung (F-08). */
  stackFront: Record<string, string>;
  /** Wahl ein-/zweizeilig je Klasse und Ausrichtung (Schlüssel aus linesKey). */
  lines: Record<string, 1 | 2>;
  /** Laufende Nummer für den Standardnamen neuer Panels. */
  nextNumber: number;
}
