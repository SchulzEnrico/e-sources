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
  /** F-116 (vorbereitet): Sphere, z. B. Privat oder Geschäftlich (Id aus Workspace.spheres). */
  sphere?: string;
  /** F-116 (vorbereitet): Szenario, zu dem das Panel gehört (Id aus Workspace.scenarios). */
  scenario?: string;
  /** F-15, F-125: Lineal nur für dieses Panel ein (true) oder aus (false); fehlt = wie Workspace.ruler.on. */
  ruler?: boolean;
}

/** F-125: Lineal für alle Panels, mit Beschriftung und Strichfarbe (Index in RULER_COLORS). */
export interface RulerSettings {
  on: boolean;
  labels: boolean;
  color: number;
}

/** F-116 (vorbereitet): eine Sphere oder ein Szenario mit Namen. */
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

/**
 * Ein Lesezeichen (F-30). Die Reihenfolge in `Workspace.bookmarks` ist zugleich die Position in
 * der Kategorie (F-31).
 */
export interface Bookmark {
  id: string;
  title: string;
  url: string;
  /** Id aus Workspace.categories; leer = ohne Kategorie. */
  category: string;
  tags: string[];
  note?: string;
  /** F-32: Panels, in deren Sammlung das Lesezeichen fest im Menü steht. */
  panels: string[];
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
  /** F-116 (vorbereitet): Spheres (Privat, Geschäftlich, Schule …). */
  spheres: Named[];
  /** F-116 (vorbereitet): Szenarien. */
  scenarios: Named[];
  /**
   * F-43: eigene Wahl je Domain, ob sie sich einbetten lässt (true) oder gesperrt ist (false).
   * Geht vor der eingebauten Liste bekannter Sperr-Seiten.
   */
  embed: Record<string, boolean>;
  /** F-30 bis F-32: alle Lesezeichen des Nutzers (Gesamtsammlung). */
  bookmarks: Bookmark[];
  /** F-20: frei angelegte Kategorien, in Reihenfolge. */
  categories: Named[];
  /** F-125: Lineal (F-15). */
  ruler: RulerSettings;
}
