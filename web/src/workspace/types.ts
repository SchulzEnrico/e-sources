import type { FRect, Node } from './tree';

/** Ein Tab im Panel (F-21, F-22): eine geöffnete Seite mit eigenem Verlauf. */
export interface Tab {
  id: string;
  /** Gerade angezeigte Adresse (F-14); fehlt = leerer Tab. */
  url?: string;
  /**
   * Eigener Verlauf des Tabs (F-14): alle über die Adresszeile geöffneten Adressen.
   * Klicks innerhalb einer fremden Seite sind nicht erfassbar (iframe, cross-origin).
   */
  history?: string[];
  /** Position von `url` in `history`. */
  pos?: number;
}

/** Ein Panel – gilt für alle Bildschirmklassen. */
export interface PanelMeta {
  id: string;
  name: string;
  /** Tabs in Reihenfolge, mindestens einer, höchstens TAB_MAX (F-26). */
  tabs: Tab[];
  /** Id des sichtbaren Tabs. */
  activeTab: string;
  /** Startseite für den Home-Knopf, gilt für alle Tabs des Panels; ohne Angabe die erste geöffnete Adresse. */
  home?: string;
  /** F-116 (vorbereitet): Bereich, z. B. Privat oder Geschäftlich (Id aus Workspace.areas). */
  area?: string;
  /** F-116 (vorbereitet): Szenario, zu dem das Panel gehört (Id aus Workspace.scenarios). */
  scenario?: string;
}

/** F-116 (vorbereitet): ein Bereich oder Szenario mit Namen. */
export interface Named {
  id: string;
  name: string;
}

/**
 * Ein Platz auf der Arbeitsfläche (F-08, F-09). Liegen mehrere Panels darauf, ist er ein Stapel;
 * `front` ist das sichtbare.
 */
export interface Place {
  id: string;
  panels: string[];
  front: string;
}

/** Anordnung einer Bildschirm-Einstellung: Teilungsbaum (Blätter = Plätze) und die Plätze selbst. */
export interface Arrangement {
  tree: Node;
  places: Record<string, Place>;
}

/** Ein Platz für die Anzeige, mit Lage als Anteil der Fläche. */
export interface Slot {
  id: string;
  rect: FRect;
  /** Panels auf dem Platz, in Reihenfolge. */
  panels: PanelMeta[];
  /** Sichtbares Panel. */
  front: PanelMeta;
}

/** Zustand der Arbeitsfläche, der im Browser gespeichert wird. */
export interface Workspace {
  panels: PanelMeta[];
  /**
   * Anordnung je Bildschirm-Einstellung (Schlüssel aus layoutKey). Panels, die dort noch keinen
   * Platz haben, bekommen beim Anzeigen einen neuen oder landen auf dem Platz ganz rechts.
   */
  layouts: Record<string, Arrangement>;
  /** Wunsch-Anordnung je Bildschirm-Einstellung (F-05). */
  preferred: Record<string, Arrangement>;
  /** Wahl ein-/zweizeilig je Klasse und Ausrichtung (Schlüssel aus linesKey). */
  lines: Record<string, 1 | 2>;
  /** Laufende Nummer für den Standardnamen neuer Panels. */
  nextNumber: number;
  /** F-116 (vorbereitet): Bereiche. */
  areas: Named[];
  /** F-116 (vorbereitet): Szenarien. */
  scenarios: Named[];
}
