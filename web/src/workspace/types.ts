import type { DeskLayouts } from './deskLayouts';
import type { NotesLayouts } from './notesLayouts';
import type { RuleSet } from './ruleSet';
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
  /** F-06 Stufe 2: dieser Tab pausiert nie (z. B. Musik, Chat, laufender Upload). */
  keep?: boolean;
  /** F-206: Tab zeigt diese Notiz (Id aus Workspace.notes) – nur Verweis, kein Inhalt. */
  note?: string;
  /** F-206: Tab zeigt diese Ansicht (Id aus Workspace.noteViews) – nur Verweis. */
  view?: string;
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
  /** F-194 Stufe 2: „Breite halten“ – so breit (px) sieht die Seite, der Zoom folgt der Slot-Breite; fehlt = aus. */
  fit?: number;
  /** F-200: Entwickler-Modus – zeigt die echte Größe der Seite in CSS-Pixeln; fehlt = aus. */
  dev?: boolean;
  /** F-200 (Entscheidung Enrico V52): Zoom und „Breite halten“ vor dem Entwickler-Modus – kommen beim Ausschalten zurück */
  devKeep?: { zoom?: number; fit?: number };
  /** F-200 Stufe 2: Werkbank – Gerät (Id aus DEV_DEVICES, fehlt = Slot frei), gedreht, Zoom-Test (fehlt = 100). */
  devView?: DevView;
}

/** F-200 Stufe 2: Einstellung der Entwickler-Leiste eines Portals. */
export interface DevView {
  device?: string;
  turned?: boolean;
  scale?: number;
}

/** F-116: Space – Lebensbereich mit Name und Farbe. */
export interface Space extends Named {
  color?: string;
}

/** F-116: Case – Fall in genau einem Space. */
export interface Case extends Named {
  color?: string;
  space: string;
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
  /** F-202: Tabs mit dieser Source pausieren nie. */
  keep?: boolean;
}

/** F-185: Wie eine Source in die Library kam. */
export type OriginVia = 'hand' | 'launcher' | 'import' | 'sample' | 'workspace' | 'note';

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
  /** F-116: Spaces (Privat, Firma, Schule …); im Code weiter „spheres“. */
  spheres: Space[];
  /** F-116: Cases, je genau einem Space zugeordnet; im Code weiter „scenarios“. */
  scenarios: Case[];
  /** F-116/F-53 Stufe 1: Layout → Cases (Schlüssel „Desk|Layout“, Desk '' = Main Desk). */
  layoutCases?: Record<string, string[]>;
  /** F-116: gewählter Case je Desk. */
  activeCase?: Record<string, string>;
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
  /** F-218 (V91, v8): Schalter A1–A9 und eingeschaltete Wenn-dann-Regeln (nur Abweichungen vom Werk). */
  ruleSet?: RuleSet;
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
  /** F-06 Stufe 2: Minuten, nach denen ein sichtbares, unbenutztes Portal pausiert; 0 = nie; fehlt = SHOWN_DEFAULT. */
  pauseShown?: number;
  /** F-189: Suchmaschine für „Im Web suchen“ (Id aus ENGINES); fehlt = Google. */
  engine?: string;
  /** F-206: alle Notizen (eigene Objekte, unabhängig von Tabs); fehlt = keine. */
  notes?: Note[];
  /** F-206: Ansichten (Notizblock, To-do, Kanban, Eisenhower), die Notizen nur anordnen; fehlt = keine. */
  noteViews?: NoteView[];
  /** F-206 (v8): Pads je Desk; fehlt = keine. */
  pads?: Pad[];
  /** F-206 (v8): Pad-Plätze und Dock je Desk – geräteeigen (DEVICE_FIELDS). */
  padDesks?: Record<string, PadDesk>;
  /** F-206 (v8): Projekte; fehlt = keine. */
  projects?: Project[];
  /** F-206 (v8): Personen, Teams, Rollen; fehlt = keine. */
  persons?: Person[];
  /** F-206 (v8): Note Mode, Board, Main Stage je Desk ('' = Main Desk). */
  deskNotes?: Record<string, DeskNotes>;
  /** F-206 (v8): gewählte Darstellungen des Projektfokus; fehlt = keine. */
  focusViews?: FocusView[];
  /** V88 (BL1): eigene Board-Vorlagen (Spalten ohne Karten); mitgelieferte stehen im Code (BUILTIN_TEMPLATES). */
  boardTemplates?: BoardTemplate[];
}

/** V88 (BL1): Spalte einer Board-Vorlage – Name, Bedeutung, WIP-Limit, ohne Karten. */
export interface TemplateColumn {
  name: string;
  state: ColState;
  wip?: number;
}

/** V88 (BL1): Board-Vorlage für neue Kanban-Boards (wie Trello-Vorlagen). */
export interface BoardTemplate {
  id: string;
  name: string;
  cols: TemplateColumn[];
  /** Regel „Abnahme nötig“. */
  review?: boolean;
}

/**
 * F-206: Zustand einer Notiz. „wartet“ kommt auch von selbst (offener Vorgänger, „nicht beginnen
 * vor“) – das rechnet stateOf aus; gespeichert ist nur die eigene Wahl.
 */
export type NoteState = 'open' | 'waiting' | 'doing' | 'review' | 'done' | 'archived';

/**
 * F-206 (Datenmodell V65, M3): Anordnungsbeziehung nach ICB4 – EA Normalfolge (Ende → Anfang),
 * AA Anfangsfolge, EE Endfolge, AE Sprungfolge. Jede plant den Termin; „wartet darauf“ sperrt
 * zusätzlich den Beginn des Nachfolgers. Bis v7: `kind: 'done'` = EA + wartet, `'date'` = EA.
 */
export type NoteRel = 'EA' | 'AA' | 'EE' | 'AE';

export interface NoteLink {
  /** Id der Vorgänger-Notiz. */
  id: string;
  rel: NoteRel;
  /** Zeitabstand in Tagen (auch negativ); fehlt = 0. */
  lag?: number;
  /** Nachfolger darf erst beginnen, wenn die Bedingung erfüllt ist; fehlt = nur Terminplanung. */
  wait?: boolean;
}

/** F-206 (V65): Stelle in einer Quelle – alles optional, eine Angabe genügt. */
export interface SourceSpot {
  /** Zeitmarke in Sekunden (Video, Audio). */
  time?: number;
  /** Abschnitt: Anker (#…) oder Text. */
  section?: string;
  /** PDF-Seite (ab 1). */
  page?: number;
}

/**
 * F-206 (V65): Verbindung zu einer Source (n:m, nur an Note, Sheet bzw. Projekt gespeichert).
 * Titel und Adresse als Kopie – bleibt die Source gelöscht, steht hier „Quelle gelöscht“.
 */
export interface SourceLink {
  /** Id der Source (Bookmark). */
  id: string;
  title: string;
  url: string;
  at?: SourceSpot;
}

/** F-206 (V65, M1): Arten nach ICB4; fehlt = gewöhnliche Note (Gedanke, Task, Reminder). */
export type NoteType = 'requirement' | 'risk' | 'stakeholder' | 'procurement' | 'change' | 'minutes';

/** F-206 (V65): Plan- und Istwert (Aufwand in Stunden, Kosten in Euro). */
export interface PlanActual {
  plan?: number;
  actual?: number;
}

/** F-206 (V65): Erinnerung einer Note (dann ein Reminder). */
export interface NoteRemind {
  /** Zeitpunkt (ISO 8601). */
  at: string;
  repeat?: 'day' | 'week' | 'month' | 'year';
  /** Geschlummert bis (ISO 8601). */
  snooze?: string;
}

/** F-206 (V65): Abnahmekriterium (Prüfliste). */
export interface NoteCheck {
  text: string;
  ok?: boolean;
}

/** F-206: Eintrag der Spur (Zeitleiste einer Notiz). */
export type NoteEventKind =
  | 'created'
  | 'edited'
  | 'state'
  | 'parent'
  | 'link'
  | 'unlink'
  | 'placed'
  | 'moved'
  | 'removed'
  | 'delegated'
  | 'forwarded'
  | 'attached'
  | 'restored';

export interface NoteEvent {
  /** Zeitpunkt (ms seit 1970). */
  at: number;
  what: NoteEventKind;
  /** Profilname (F-179), später das Konto; fehlt ohne Namen. */
  by?: string;
  /** Kurzer Zusatz, z. B. neuer Zustand oder Name der Ansicht. */
  detail?: string;
}

/** F-206: Anhang – Datei (liegt nur auf dem Gerät), andere Notiz oder Source.
 *  F-215 (V79, Entscheidung T1): `audio` = Tonaufnahme einer Sprachnotiz; der Ton liegt nur auf dem Gerät, auf dem
 *  er aufgenommen wurde (IndexedDB, Schlüssel `ref`), abgeglichen wird nur dieser Verweis. */
export interface NoteAttachment {
  kind: 'file' | 'note' | 'source' | 'audio';
  /** Id der Notiz bzw. Source; bei Dateien und Ton eine Id im Gerätespeicher. */
  ref: string;
  name?: string;
  /** Ton: Länge in Sekunden. */
  dur?: number;
  /** Ton: aufgenommen am (ISO 8601). */
  at?: string;
  /** Ton: Gerät, auf dem er liegt (z. B. „Mac · Chrome“). */
  dev?: string;
  /** Ton: Format (z. B. audio/webm). */
  mime?: string;
}

/** F-206: Wie eine Notiz entstand (wie BookmarkOrigin). */
export interface NoteOrigin {
  via: 'hand' | 'quick' | 'voice' | 'slot' | 'import';
  /** Zeitpunkt (ISO 8601). */
  at: string;
  by?: string;
  /** Slot-Datei oder Import: Gerät bzw. Dateiname. */
  from?: string;
}

/** F-206: eine Notiz – Gedanke, Aufgabe oder Erinnerung. */
export interface Note {
  id: string;
  /** Titel; leer = Vorschlag aus der ersten Zeile (titleOf). */
  title: string;
  /** Text mit Markdown-Zeichen. */
  text: string;
  /** Eigene Wahl; „wartet“ von selbst rechnet stateOf aus. */
  state: NoteState;
  /** Grund bei „wartet“ von Hand. */
  waitReason?: string;
  /** Eltern-Notiz (genau eine); Unter-Notizen stehen in der Reihenfolge von Workspace.notes. */
  parent?: string;
  /** Vorgänger (Netzplan); Nachfolger ergeben sich daraus. */
  after?: NoteLink[];
  /** Spur, älteste zuerst, höchstens TRAIL_MAX. */
  trail: NoteEvent[];
  category?: string;
  tags?: string[];
  origin?: NoteOrigin;
  important?: boolean;
  urgent?: boolean;
  attach?: NoteAttachment[];
  /**
   * Delegiert an: Name (Anzeige) und Person (Id aus Workspace.persons, ab v8) oder Board (Id einer
   * Ansicht).
   */
  delegated?: { to: string; person?: string; view?: string };
  /** Weitergeleitet (neueste zuletzt). */
  forwarded?: { at: number; to: string }[];
  /** „nicht beginnen vor“ (Datum JJJJ-MM-TT). */
  notBefore?: string;
  /** „fällig am“ (Datum JJJJ-MM-TT). */
  due?: string;
  /** V65: Art nach ICB4 (M1). */
  type?: NoteType;
  /** V65: Projekt (Id aus Workspace.projects). */
  project?: string;
  /** V65: zuständig (Id aus Workspace.persons). */
  assignee?: string;
  /** V65: Aufwand in Stunden (Punkte rechnet das Projekt um). */
  effort?: PlanActual;
  /** V65: Kosten in Euro. */
  cost?: PlanActual;
  /** V65: Meilenstein (Dauer 0). */
  milestone?: boolean;
  remind?: NoteRemind;
  /** F-215 (V72, E2): Ort der Erinnerung – freier Text, vorerst nur angezeigt. */
  place?: string;
  /** V65: Abnahmekriterien. */
  accept?: NoteCheck[];
  /** V65: verknüpfte Sources mit Stelle. */
  sources?: SourceLink[];
  /**
   * F-213 (V68): Entwurf – Änderungen, die erst „Speichern“ übernimmt. Liegt an der Note in der Library
   * (mit Gist-Abgleich), damit er später als „vorläufig“ im Projektfokus erscheinen kann (S10).
   */
  draft?: NoteDraft;
  /** F-213: Note wurde noch nie gespeichert (neu im Pad); „Verwerfen“ entfernt sie ganz. */
  unsaved?: boolean;
  created: number;
  changed: number;
}

/** F-213 (V68): Felder, die ein Entwurf ändern kann (S9: alles in der Note). */
export type NoteDraftField = 'title' | 'text' | 'state' | 'waitReason' | 'important' | 'urgent' | 'notBefore' | 'due' | 'remind' | 'place' | 'assignee' | 'effort';
/** F-213: Entwurf; `null` = Feld beim Speichern entfernen. */
export interface NoteDraft {
  fields: { [K in NoteDraftField]?: Note[K] | null };
  at: number;
  by?: string;
}

/** F-206: Arten von Ansichten; Scrum kommt später. */
export type NoteViewKind = 'block' | 'todo' | 'kanban' | 'eisenhower';

export interface NoteColumn {
  id: string;
  name: string;
  ids: string[];
  /** V65: WIP-Limit (höchstens so viele Karten); fehlt = ohne. */
  wip?: number;
  /** V86 (K2): Bedeutung der Spalte – Karte hier = dieser Zustand der Notiz; fehlt = aus dem Namen geraten (colStateOf). */
  state?: ColState;
}

/** V86 (K2): Bedeutung einer Kanban-Spalte. */
export type ColState = 'open' | 'doing' | 'review' | 'done';

/** V65: Besitzer eines Sheets. */
export interface SheetOwner {
  kind: 'person' | 'project' | 'scope';
  id: string;
}

/** V65: Bereich eines Übersichts-Sheets; `id` fehlt nur bei „all“. */
export interface SheetRange {
  kind: 'project' | 'scope' | 'space' | 'all';
  id?: string;
}

/** F-206: Ansicht – ordnet Notizen nur an (eine Notiz kann in mehreren Ansichten liegen). */
export interface NoteView {
  id: string;
  kind: NoteViewKind;
  name: string;
  category?: string;
  /** Reihenfolge (Notizblock, To-do, Eisenhower – das Feld der Matrix ergibt sich aus wichtig/dringend). */
  ids: string[];
  /** Nur Kanban: Spalten (höchstens COLUMN_MAX). */
  cols?: NoteColumn[];
  /** Regel „Abnahme nötig“: erledigt → „in Prüfung“, bis bestätigt. */
  review?: boolean;
  /** V65 (Sheet): Besitzer. */
  owner?: SheetOwner;
  /** V65: Bereich für Übersichten. */
  range?: SheetRange;
  /** V65: Planungs-Check an. */
  check?: boolean;
  /** V65: verknüpfte Sources. */
  sources?: SourceLink[];
}

/** F-206 (V65): Pad – schwebendes Fenster über einem Desk mit bis zu PAD_SHEETS_MAX Sheets. */
export interface Pad {
  id: string;
  /** Desk ('' = Main Desk, sonst Id aus Workspace.windows). */
  desk: string;
  /** Sheets (Ids aus Workspace.noteViews) in Reihenfolge; ein Sheet liegt höchstens in einem Pad. */
  sheets: string[];
  /** Sichtbares Sheet. */
  active: string;
  /** Im Dock statt schwebend. */
  docked?: boolean;
  /** Umstieg aus Notiz-Tabs: Portal, über dessen Slot das Pad zuerst liegt (bis ein Platz gesetzt ist). */
  from?: string;
  /** F-215 (V70): zuletzt genutzt, neueste zuerst, höchstens 5 – „n:<Note-Id>“ bzw. „s:<Sheet-Id>“. */
  recent?: string[];
}

/** V65: Platz eines Pads auf diesem Gerät (Anteile der Desk-Fläche, 0…1). */
export interface PadPlace {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** V65: Pad-Plätze und Dock je Desk – nur auf diesem Gerät (DEVICE_FIELDS). */
export interface PadDesk {
  places: Record<string, PadPlace>;
  /** Dock-Ort: Rand und Lage am Rand (0…1); V81: Breite in px (D4) und eingeklappt zur Lasche (D1/D8). */
  dock?: { edge: 'left' | 'right' | 'top' | 'bottom'; at: number; w?: number; folded?: boolean };
  /** Dock ganz weggeschaltet. */
  dockOff?: boolean;
  /** F-210 Schritt 4 (V90, F1): Teilungsbaum der Pads im Notizen-Modus – seit V91 nur noch beim Laden
   *  gelesen und in das aktive Notizen-Layout übernommen (`adoptOldTree`). */
  notes?: Node;
}

/** F-206 (V65, M5): Projekt in einem Scope, mit Teilprojekten. */
export interface Project {
  id: string;
  name: string;
  /** Scope (Id aus Workspace.scenarios). */
  scope?: string;
  /** Übergeordnetes Projekt. */
  parent?: string;
  /** PSP: Präfix der Codes und Gliederungsart. */
  psp?: { prefix?: string; style?: 'num' | 'alpha' | 'mixed' };
  /** Steckbrief. */
  brief?: { goal?: string; approach?: string; org?: string };
  /** JJJJ-MM-TT */
  start?: string;
  end?: string;
  /** Budget in Euro. */
  budget?: number;
  /** 1 (hoch) bis 5 (niedrig). */
  priority?: number;
  state?: 'idea' | 'planned' | 'running' | 'paused' | 'done' | 'stopped';
  /** M6: Aufwand in Punkten zeigen, 1 Punkt = so viele Stunden; fehlt = Stunden. */
  points?: number;
  sources?: SourceLink[];
  created: number;
  changed: number;
}

/** V65: Befugnisse einer Person (AKV). */
export type PersonRight = 'release' | 'spend' | 'decide' | 'accept';

/** F-206 (V65, M4): Person, Team oder Rolle – lokal in der Arbeitsfläche, später mit Konto. */
export interface Person {
  id: string;
  name: string;
  kind: 'person' | 'team' | 'role';
  /** Team: Mitglieder (Ids). */
  members?: string[];
  /** Kapazität in Stunden je Woche. */
  capacity?: number;
  /** Task-Limits: gesamt und je Projekt. */
  limit?: { total?: number; perProject?: number };
  rights?: PersonRight[];
  /** Vertretung: wer (Id), von/bis (JJJJ-MM-TT). */
  stand?: { by: string; from?: string; to?: string }[];
  /** Das eigene Profil. */
  me?: boolean;
  /** F-206 Schritt 8 (V94, P1): Kennfarbe (Index in PROFILE_COLORS); „ich“ nimmt die Farbe aus dem Profil. */
  color?: number;
  /** F-206 Schritt 8 (V94, P9/P21): Ressourcenkalender – Abwesenheiten (Kapazität 0), JJJJ-MM-TT einschließlich. */
  away?: { from: string; to: string; why?: string }[];
  /** Später: Konto-Id (F-81). */
  account?: string;
}

/** F-206 (V65): Note-Einstellungen eines Desks (Board, Main Stage). */
export interface DeskNotes {
  /** Note Mode: Desk ist ein Board. */
  noteMode?: boolean;
  /** F-210 Schritt 5 (V91, Z1–Z4): Notizen-Layouts – Pads mit Sheets und Baum je Bildschirm (wie deskLayouts). */
  board?: NotesLayouts;
  /** F-207 Main Stage: Slot (Area-Id) und Verhalten. */
  stage?: { area: string; fixed?: boolean; allDesks?: boolean; minW?: number; minH?: number };
}

/** V65: Darstellungen des Projektfokus (kombinierbar). */
export type FocusView = 'line' | 'week' | 'ring' | 'grid';

/** F-24: ein geschlossenes Portal (mit Tabs und Verlauf) oder ein geschlossener Tab. */
export type Closed =
  | { id: string; kind: 'portal'; win: string; at: number; panel: PanelMeta; area?: string }
  | { id: string; kind: 'tab'; win: string; at: number; tab: Tab; index: number; panelId: string; panelName: string };
