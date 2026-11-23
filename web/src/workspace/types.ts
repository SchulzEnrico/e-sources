import type { DeskLayouts } from './deskLayouts';
import type { FocusRule } from './focus';
import type { Look } from './look';
import type { Profile } from './profile';
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
  /**
   * F-128: Name der Area, zu der das Panel gehört (Id aus Workspace.areaNames). Hängt am Panel,
   * damit der Name in jeder Bildschirm-Einstellung gilt, obwohl die Anordnung je Einstellung
   * gespeichert ist.
   */
  areaName?: string;
  /** F-15, F-125: Lineal nur für dieses Panel ein (true) oder aus (false); fehlt = wie Workspace.ruler.on. */
  ruler?: boolean;
  /** F-27: Zusatzfenster, in dem das Panel liegt (Id aus Workspace.windows); fehlt = Hauptfenster. */
  win?: string;
  /** F-162: eigene Rahmen- und Akzentfarbe; fehlt = wie Slot bzw. Desk. */
  tint?: Tint;
  /**
   * F-163: Kategorie des Portals (Id aus Workspace.categories). '' = bewusst ohne Kategorie;
   * fehlt = noch nicht gefragt.
   */
  category?: string;
  /** F-06: Portal nie pausieren (z. B. Musik, Chat, laufender Upload); bleibt mit allen Tabs geladen. */
  keep?: boolean;
  /** F-194: Zoom der Seiten in diesem Portal in Prozent (Stufe aus ZOOM_STEPS); fehlt = 100. */
  zoom?: number;
}

/** F-162: Rahmen- und Akzentfarbe (#rrggbb); was fehlt, erbt. */
export interface Tint {
  frame?: string;
  accent?: string;
}

/** F-30, F-163: Kategorie der Library; ihre Farben gelten für alle Portale dieser Kategorie (Farbregel). */
export interface Category extends Named {
  tint?: Tint;
  /** F-183 Stufe 2: gewähltes Zeichen (Name aus CATEGORY_ICONS); fehlt = Vorschlag nach Name. */
  icon?: string;
}

/** F-128, F-162: Name eines Slots, mit eigenen Farben. */
export interface SlotName extends Named {
  tint?: Tint;
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
 * Eine Area auf der Arbeitsfläche (F-08, F-09). Liegen mehrere Panels darauf, ist sie ein Stapel;
 * `front` ist das sichtbare.
 */
export interface Area {
  id: string;
  panels: string[];
  front: string;
}

/** Anordnung einer Bildschirm-Einstellung: Teilungsbaum (Blätter = Areas) und die Areas selbst. */
export interface Arrangement {
  tree: Node;
  areas: Record<string, Area>;
}

/** Eine Area für die Anzeige, mit Lage als Anteil der Fläche. */
export interface Slot {
  id: string;
  rect: FRect;
  /** Panels auf der Area, in Reihenfolge. */
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
  /** F-185: wer, woher, wann; fehlt bei Sources von vor V29 („Herkunft unbekannt“). */
  origin?: BookmarkOrigin;
}

/** F-185: Wie eine Source in die Library kam. */
export type OriginVia = 'hand' | 'launcher' | 'import' | 'sample' | 'workspace';

export interface BookmarkOrigin {
  via: OriginVia;
  /** Zeitpunkt (ISO 8601). */
  at: string;
  /** Profilname (F-179), später das Konto; fehlt ohne Namen. */
  by?: string;
  /** Lesezeichen-Import: Dateiname; Import der Arbeitsfläche: Gerät. */
  from?: string;
  /** Lesezeichen-Import: Ordnerpfad im Browser („Oben › Unten“). */
  folder?: string;
}

/** Zustand der Arbeitsfläche, der im Browser gespeichert wird. */
export interface Workspace {
  panels: PanelMeta[];
  /**
   * Anordnung je Bildschirm-Einstellung (Schlüssel aus layoutKey). Panels, die dort noch keinen
   * Area haben, bekommen beim Anzeigen eine neue oder landen auf der Area ganz rechts.
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
  categories: Category[];
  /** F-163: gemerkte Wahl je Domain (ohne „www.“) → Kategorie-Id oder '' (ohne); Vorschlag beim nächsten Portal. */
  siteCategory?: Record<string, string>;
  /** F-164: Ids ausgeschalteter Regeln (tint:<Kategorie>, site:<Domain>, ask, offer, collect); fehlt = alle an. */
  rulesOff?: string[];
  /** F-164: eingeschaltete Regeln, die ab Werk aus sind (DEFAULT_OFF, z. B. offer). */
  rulesOn?: string[];
  /** F-125: Lineal (F-15). */
  ruler: RulerSettings;
  /** F-128: Namen der Areas (Stapel). */
  areaNames: SlotName[];
  /** F-60, F-61: Hell/Dunkel und Akzentfarbe. */
  look: Look;
  /** F-161: eigene Farben je Zusatz-Desk (Schlüssel = Id aus windows); fehlt = folgt dem Main Desk. */
  deskLooks?: Record<string, Look>;
  /** F-128: laufende Nummer für den Standardnamen neuer Areas („NewArea 1“ …). */
  nextArea: number;
  /** F-27: Zusatzfenster („Fenster 2“ …); das Hauptfenster steht nicht in der Liste. */
  windows: Named[];
  /**
   * F-28: zuletzt genutzte Bildschirm-Einstellung je Fenster (Schlüssel '' = Hauptfenster, Wert aus
   * layoutKey). Damit lassen sich die Areas eines anderen Fensters als Ziel anbieten.
   */
  winSetup: Record<string, string>;
  /** F-24: zuletzt geschlossene Portale und Tabs, neueste zuerst, je Desk höchstens CLOSED_MAX. */
  closed?: Closed[];
  /** F-29 Rest: eigene Grenzen der Fokusanzeige; fehlt = Voreinstellung FOCUS_RULE. */
  focus?: FocusRule;
  /** F-51: benannte Layouts je Desk (Schlüssel '' = Main Desk); fehlt = nur die aktuelle Belegung. */
  deskLayouts?: Record<string, DeskLayouts>;
  /** F-179: lokales Profil (Name, Kennfarbe, Begrüßung); fehlt = Voreinstellung. */
  profile?: Profile;
  /** F-06: Minuten, nach denen Verdecktes pausiert; 0 = nie; fehlt = PAUSE_DEFAULT. */
  pause?: number;
  /** F-189: Suchmaschine für „Im Web suchen“ (Id aus ENGINES); fehlt = Google. */
  engine?: string;
}

/** F-24: ein geschlossenes Portal (mit Tabs und Verlauf) oder ein geschlossener Tab. */
export type Closed =
  | { id: string; kind: 'portal'; win: string; at: number; panel: PanelMeta; area?: string }
  | { id: string; kind: 'tab'; win: string; at: number; tab: Tab; index: number; panelId: string; panelName: string };
