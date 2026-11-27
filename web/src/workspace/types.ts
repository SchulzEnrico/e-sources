import type { DeskLayouts } from './deskLayouts';
import type { NotesLayouts } from './notesLayouts';
import type { RuleSet } from './ruleSet';
import type { FocusRule } from './focus';
import type { Look } from './look';
import type { DeskBinding } from './deskProject';
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
  /** F-206 Schritt 10 Projekt-Desk (V117, PD1–PD10): Desk → gebundenes Projekt (Schlüssel = Desk-Id, '' = Main Desk); optional im Dateiformat 11. */
  deskProjects?: Record<string, DeskBinding>;
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
  /** F-206 (v8): gewählte Darstellungen des Projektfokus; fehlt = alle (Werk, V96 `focusViewsOf`). */
  focusViews?: FocusView[];
  /** V88 (BL1): eigene Board-Vorlagen (Spalten ohne Karten); mitgelieferte stehen im Code (BUILTIN_TEMPLATES). */
  boardTemplates?: BoardTemplate[];
  /** F-221 (V102, Dateiformat 11, FB11): Feedback – Fehler, Wünsche, Fragen, Lob; fehlt = keine. */
  feedback?: Feedback[];
  /** F-221 (FB12): `askEase: false` = „War das Melden einfach?“ nicht mehr fragen. */
  feedbackPrefs?: { askEase?: false };
  /**
   * F-220 (R2/R5, Dateiformat 11): eigene Ordnung je Umschalt-Rad (Schlüssel = Id des Rads) – angeheftete
   * Einträge, ausgeblendete Einträge, „Automatisch ordnen“ aus. Abgeglichen; die Zählung der Nutzung (R1)
   * liegt je Gerät außerhalb der Arbeitsfläche.
   */
  wheels?: Record<string, WheelPrefs>;
  /** F-222 (V103, Dateiformat 11, N1/N11): Entscheidungen per Nutzwertanalyse, frei oder am Projekt; fehlt = keine. */
  decisions?: Decision[];
  /** F-226 (G4): eigene Formular-Vorlagen (die Vorlage „GPM Level D“ ist eingebaut). */
  formTemplates?: FormTemplate[];
  /** F-206 Schritt 10 (V116, K7): Arbeitskalender für alle Projekte – Feiertage nach Bundesland, eigene freie Tage; fehlt = Mo–Fr. */
  calendar?: WorkCalendar;
  /**
   * V122 (F-231 K4, T4): gemeinsame Tag-Farben für alle Notizen – Tag-Name → Farbe (Id aus TAG_COLORS, auch Trello-Stufe
   * wie „green_dark“). Ein Eintrag ohne Notiz ist ein angelegter, noch unbenutzter Tag. Fehlt = alle Tags ohne Farbe.
   */
  tagColors?: Record<string, string>;
}

/** K7 (V116): Arbeitskalender. `region` = Bundesland (`DE` = nur bundesweite Feiertage). */
export interface WorkCalendar {
  region?: import('./calendar').Region;
  free?: { day: string; name?: string }[];
}

/** F-220 (R2): Einstellung eines Umschalt-Rads; fehlt ein Feld = Werk. */
export interface WheelPrefs {
  /** angeheftete Einträge in eigener Reihenfolge (Ids), stehen vorn */
  pinned?: string[];
  /** ausgeblendete Einträge („Rad belegen …“) */
  hidden?: string[];
  /** false = nicht nach Nutzung ordnen (Schalter „Automatisch ordnen“, ab Werk an) */
  auto?: false;
  /** letzte gezeigte Reihenfolge (R1: neu geordnet nur beim Öffnen) */
  order?: string[];
}

/** F-221 (FB2): Art der Meldung. */
export type FeedbackKind = 'bug' | 'wish' | 'question' | 'praise';
/** F-221 (FB8): Zustand – Spalten des Feedback-Boards. */
export type FeedbackState = 'new' | 'seen' | 'planned' | 'done' | 'dropped';
/** F-221 (FB3): Schweregrad – stört kaum · behindert · blockiert. */
export type FeedbackSeverity = 'minor' | 'hinders' | 'blocks';

/** F-221 (FB5/FB6): Ort des Geschehens – automatisch, nichts aus Notizen oder Seiten. */
export interface FeedbackPlace {
  /** Ansicht, z. B. „Desk“, „Cockpit › Kanban“, „Projekt › Gantt“ */
  view?: string;
  /** Modus, z. B. „Desk“, „Notizen“, „Projekte“ */
  mode?: string;
  /** offenes Menü oder Fenster, z. B. „⚙ Einstellungen“ */
  menu?: string;
  /** Desk ('' = Main Desk) */
  desk?: string;
}

/** F-221 (FB6): Umgebung – automatisch. */
export interface FeedbackEnv {
  /** App-Stand, z. B. „V102“ */
  version?: string;
  /** Gerät, z. B. „Mac“, „iPhone“ */
  device?: string;
  /** Browser, z. B. „Safari 18“ */
  browser?: string;
  /** Bildschirm „1440 × 900“ */
  screen?: string;
  /** Fenster „1280 × 800“ */
  window?: string;
}

/** F-221 (FB9): Vermerk zur Weiterverarbeitung. */
export interface FeedbackMark {
  /** ISO-Zeitpunkt */
  at: string;
  /** V106 (F-225 P9): 'to' = weitergegeben an eine andere Instanz */
  kind: 'note' | 'decision' | 'ref' | 'fixed' | 'state' | 'to';
  text: string;
  /** Person-Id oder Name */
  by?: string;
}

/** F-221 (FB11): eine Meldung – Problemstellung in zwei Stufen (FB3). */
/** F-225 (V106, P4): eigenes Feld im Formular eines Projekts. */
export type FeedbackFieldType = 'text' | 'number' | 'date' | 'choice' | 'bool';
export interface FeedbackFieldDef {
  id: string;
  name: string;
  type: FeedbackFieldType;
  /** nur „Auswahl“: die Möglichkeiten */
  options?: string[];
  required?: boolean;
}
/** F-225 (P4/P5): Formular für Projektmeldungen – Felder aus, Pflichtfelder, eigene Felder, Arten umbenannt. */
export interface FeedbackFormRaw {
  off?: string[];
  required?: string[];
  custom?: FeedbackFieldDef[];
  kinds?: Partial<Record<FeedbackKind, string>>;
}

export interface Feedback {
  id: string;
  kind: FeedbackKind;
  title: string;
  state: FeedbackState;
  /** F-225 (V105, P2): Projektmeldung – Id des Projekts; fehlt = Meldung an E-Sources */
  project?: string;
  /** F-225 (P3): Empfänger – Id der Instanz (Rolle) im Projekt */
  to?: string;
  /** F-225 (V106, P4): Werte der eigenen Felder des Projekts (Schlüssel = Id des Felds) */
  extra?: Record<string, string | number | boolean>;
  /** ISO-Zeitpunkt der Meldung */
  at: string;
  /** ISO-Zeitpunkt der letzten Änderung */
  changed?: string;
  place?: FeedbackPlace;
  env?: FeedbackEnv;
  // Stufe 2 „Ausarbeiten“ – alles freiwillig
  /** Anlass & Kontext: was passiert bzw. fehlt */
  what?: string;
  /** Fehler: Schritte zum Nachstellen */
  steps?: string;
  /** Fehler: erwartet */
  expected?: string;
  /** Fehler: tatsächlich */
  actual?: string;
  /** wer oder was betroffen ist */
  affected?: string;
  /** Umgehung, falls bekannt */
  workaround?: string;
  /** Lösungsansatz: Ziele */
  goals?: string;
  /** Lösungsansatz: Nicht-Ziele */
  nonGoals?: string;
  /** Relevanz */
  severity?: FeedbackSeverity;
  /** Folgen (Relevanz) */
  impact?: string;
  /** Hypothese / Vermutung */
  guess?: string;
  /** „noch offen: …“ */
  open?: string;
  /** Bezug Lastenheft, z. B. „F-206“ */
  refs?: string[];
  /** ähnliche Meldungen (Ids) */
  related?: string[];
  /** Bilder (Schlüssel im Bildspeicher wie Notizbilder, nur auf dem Gerät) */
  pics?: string[];
  /** FB12: „War das Melden einfach?“ 1–5 */
  ease?: 1 | 2 | 3 | 4 | 5;
  /** FB9: Entscheidung */
  decision?: string;
  /** FB9: „behoben in Vxx“ */
  fixedIn?: string;
  /** FB9: Vermerke */
  marks?: FeedbackMark[];
  /** F-225 P8 (V107, R7): wurde zu Risiko bzw. Änderungsantrag (Notiz-Id) */
  /** F-225 P8 (R7) – V108 (F-222 E2): auch 'decision', dann ist `note` die Id der Entscheidung. */
  became?: { note: string; type: 'risk' | 'change' | 'decision' };
}

/** V88 (BL1): Spalte einer Board-Vorlage – Name, Bedeutung, WIP-Limit, ohne Karten. */
export interface TemplateColumn {
  name: string;
  state: ColState;
  wip?: number;
  /** V126 (F-231 K11): Spaltenfarbe. */
  color?: string;
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

/** F-225 P8 (V107, R2): Strategie gegen ein Risiko (ICB4 Chancen und Risiken). */
export type RiskStrategy = 'avoid' | 'reduce' | 'transfer' | 'accept';
/** F-225 P8 (R2): Zustand eines Risikos. */
export type RiskState = 'open' | 'doing' | 'occurred' | 'closed';
/** Stufe 1–5 (Eintrittswahrscheinlichkeit bzw. Auswirkung). */
export type RiskLevel = 1 | 2 | 3 | 4 | 5;
/** F-225 P8 (V107, R2): Risiko nach ICB4 – Titel/Text der Notiz = Bezeichnung und Beschreibung. */
export interface NoteRisk {
  /** R8: laufende Nummer je Projekt (R-1, R-2 …) */
  no: number;
  cause?: string;
  event?: string;
  effect?: string;
  /** Eintrittswahrscheinlichkeit 1–5 */
  p?: RiskLevel;
  /** Auswirkung 1–5 */
  i?: RiskLevel;
  strategy?: RiskStrategy;
  measure?: string;
  /** Risikoeigner (Person-Id) */
  owner?: string;
  state?: RiskState;
  /** R7: entstanden aus Meldung (Feedback-Id) */
  from?: string;
  /** R6: Vorgang für die Maßnahme (Notiz-Id) */
  task?: string;
  /** F-226 (G6): Chance statt Risiko (fehlt = Risiko). */
  chance?: boolean;
  /** F-226 (G5): Eintrittswahrscheinlichkeit in Prozent (0–100) – gesetzt rechnet sich `p` daraus. */
  ew?: number;
  /** F-226 (G5): Tragweite in Euro – gesetzt (mit Budget) rechnet sich `i` daraus. */
  impact?: number;
  /** F-226 (L4): Maßnahmen präventiv bzw. korrektiv mit Kosten und Beschluss. */
  measures?: RiskMeasure[];
}
/** F-226 (L4): Maßnahme gegen ein Risiko bzw. für eine Chance. */
export interface RiskMeasure {
  id: string;
  /** präventiv (vorher) oder korrektiv (wenn es eintritt) */
  kind: 'prev' | 'corr';
  text: string;
  /** Kosten der Maßnahme in Euro */
  cost?: number;
  /** beschlossen */
  decided?: boolean;
  /** EW in % nach der Maßnahme */
  ewAfter?: number;
  /** Tragweite in € nach der Maßnahme */
  impactAfter?: number;
}
/** F-225 P8 (R4): Zustand eines Änderungsantrags. */
export type ChangeState = 'asked' | 'review' | 'approved' | 'rejected' | 'parked';
/** F-225 P8 (V107, R4): Änderungsantrag (Change Request) nach ICB4. */
export interface NoteChange {
  /** R8: laufende Nummer je Projekt (Ä-1, Ä-2 …) */
  no: number;
  /** Begründung */
  why?: string;
  /** Auswirkung auf den Termin in Arbeitstagen (+ später, − früher) */
  days?: number;
  /** Auswirkung auf die Kosten in Euro */
  cost?: number;
  /** Auswirkung auf die Leistung (Qualität) */
  perf?: string;
  /** Auswirkung auf den Umfang (Scope) */
  scope?: string;
  /** beantragt von (Person-Id oder Name) */
  by?: string;
  /** entscheidet – Id der Instanz im Projekt (ab Werk Lenkungskreis) */
  decider?: string;
  state?: ChangeState;
  /** Entscheidung: ISO-Zeitpunkt, Begründung, wer */
  decided?: { at: string; text?: string; who?: string };
  from?: string;
  task?: string;
}

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
  /** F-226 Stufe 2 (V113, L11): Termin der Abnahme (JJJJ-MM-TT). */
  due?: string;
  /** L11: Leistung von (Rolle, Person oder Firma, frei). */
  by?: string;
  /** L11: Abnahme durch. */
  acceptor?: string;
  /** L11: Prüfdokument. */
  doc?: string;
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
  | 'restored'
  /** V122 (F-231 K7, T5): Kommentar – Text in `text`, eigene Id in `id` */
  | 'comment';

export interface NoteEvent {
  /** Zeitpunkt (ms seit 1970). */
  at: number;
  what: NoteEventKind;
  /** Profilname (F-179), später das Konto; fehlt ohne Namen. */
  by?: string;
  /** Kurzer Zusatz, z. B. neuer Zustand oder Name der Ansicht. */
  detail?: string;
  /** V122 (F-231 K7): nur bei `comment` – Id, Text (mit @Person), zuletzt bearbeitet, Id der Trello-Aktion (Rundlauf). */
  id?: string;
  text?: string;
  edited?: number;
  ref?: string;
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

/** V124 (F-231 K6): Titelbild einer Karte. Entweder `color` (Trello-Farbe, ohne Stufe) oder `img` (Schlüssel im
 *  Bildspeicher des Geräts, wie `es-img:`); `size: 'full'` = ganzflächig, fehlt = klein (Trello „normal“). */
export interface NoteCover {
  color?: string;
  img?: string;
  size?: 'full';
}

/** V125 (F-231 K8): Art eines eigenen Felds wie Trello „Custom Fields“ (Trello `checkbox` = `check`). */
export type CardFieldType = 'text' | 'number' | 'date' | 'list' | 'check';
/** V125 (F-231 K8): Wahl eines Auswahl-Felds mit optionaler Farbe (Tag-Farben). */
export interface CardFieldOption {
  id: string;
  name: string;
  color?: string;
}
/** V125 (F-231 K8): eigenes Feld eines Boards; `onCard` = auf der Karte vorn zeigen (Trello `display.cardFront`). */
export interface CardFieldDef {
  id: string;
  name: string;
  type: CardFieldType;
  options?: CardFieldOption[];
  onCard?: true;
}
/** V125 (F-231 K8): Wert eines eigenen Felds – Text, Zahl, Datum (JJJJ-MM-TT), Id der Wahl bzw. `true` (angehakt). */
export type CardFieldValue = string | number | true;

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
  /** V132 (F-231 K10d, B8): wer die Karte beobachtet (Profilnamen, ohne Namen „ich“) – watch.ts. */
  watch?: string[];
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
  /** V121 (F-231 K5): Uhrzeit zu „fällig“ (HH:MM, 24 h); fehlt = ganztägig (Ende des Tages). */
  dueTime?: string;
  /** V121 (F-231 K1): Kartenvorlage (wie Trello „Card template“) – „+ Karte aus Vorlage“ kopiert sie. */
  template?: true;
  /** V124 (F-231 K6): Titelbild wie Trello „Cover“ – Farbe oder Bild, klein oder ganzflächig (covers.ts). */
  cover?: NoteCover;
  /** V125 (F-231 K8): Werte der eigenen Felder des Boards (Feld-Id → Wert, cardFields.ts). */
  fields?: Record<string, CardFieldValue>;
  /** V125 (F-231 K8): Stimmen wie Trello „Votes“ – Ids der Personen, die für die Karte gestimmt haben. */
  votes?: string[];
  /** V65: Art nach ICB4 (M1). */
  type?: NoteType;
  /** F-225 P8 (V107, R2): Angaben als Risiko (nur bei `type: 'risk'`). */
  risk?: NoteRisk;
  /** F-225 P8 (V107, R4): Angaben als Änderungsantrag (nur bei `type: 'change'`). */
  change?: NoteChange;
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
  /** F-226 (G8): Phase (Id aus Project.phases). */
  phase?: string;
  /** F-226 (G7): Einsatz mehrerer Ressourcen mit Plan-Stunden; Kosten aus dem Stundensatz, Hand-Eingabe geht vor. */
  use?: NoteUse[];
  /** F-226 (Kap. 7/8.3, ICB4 4.5.3): Ergebnisse bzw. Lieferobjekte eines Meilensteins oder Arbeitspakets. */
  results?: string[];
  /** F-226 (ICB4 4.5.9): Angaben zur Beschaffung (nur bei `type: 'procurement'`). */
  procure?: NoteProcure;
  /** F-226 Stufe 2 (V113, L17): Arbeitspaket-Beschreibung nach GPM 8.3. */
  wp?: NoteWp;
  /**
   * F-206 Schritt 10 (V100, K1): Dauer in Arbeitstagen (Mo–Fr, K7), ganze Tage ab 0. Fehlt = Abstand
   * „nicht beginnen vor“ bis „fällig am“, sonst 1 Tag; Meilenstein = 0 (`durationOf` in schedule.ts).
   */
  duration?: number;
  /** F-206 Schritt 10 (V100, K2): manuell geplant (wie MS Project); fehlt = automatisch nach den Vorgängern. */
  manual?: boolean;
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
  /** V118 (F-230 Option C): mitgeführte Fremddaten aus einem Import (unbekannte Task-Elemente, Zuordnungen). */
  foreign?: ForeignBag;
  created: number;
  changed: number;
}

/** F-213 (V68): Felder, die ein Entwurf ändern kann (S9: alles in der Note). */
export type NoteDraftField = 'title' | 'text' | 'state' | 'waitReason' | 'important' | 'urgent' | 'notBefore' | 'due' | 'dueTime' | 'remind' | 'place' | 'assignee' | 'effort';
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
  /** V121 (F-231 K3): nur in `NoteView.archivedCols` – wann archiviert und an welcher Stelle die Spalte stand. */
  archivedAt?: number;
  archivedFrom?: number;
  /** V126 (F-231 K11): Spaltenfarbe – eine der zehn Trello-Listenfarben (`COL_COLORS`); fehlt = ohne. */
  color?: string;
  /** V132 (F-231 K10d, B8): wer die Spalte beobachtet (Profilnamen, ohne Namen „ich“) – watch.ts. */
  watch?: string[];
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
  /** V132 (F-231 K10d, B8): wer das Board beobachtet (Profilnamen, ohne Namen „ich“) – watch.ts. */
  watch?: string[];
  category?: string;
  /** Reihenfolge (Notizblock, To-do, Eisenhower – das Feld der Matrix ergibt sich aus wichtig/dringend). */
  ids: string[];
  /** Nur Kanban: Spalten (höchstens COLUMN_MAX). */
  cols?: NoteColumn[];
  /** V121 (F-231 K3): archivierte Spalten mit ihren Karten (neueste zuerst, höchstens ARCHIVED_COL_MAX) – Board zeigt sie nicht, Archiv stellt sie wieder her. */
  archivedCols?: NoteColumn[];
  /** V122 (F-231 K4, T4): in diesem Board ausgeblendete Tags (klein geschrieben) – die gemeinsame Liste bleibt, nur die Karten zeigen sie hier nicht. */
  hiddenTags?: string[];
  /** V124 (F-231 K6): Titelbilder in diesem Board nicht zeigen (Trello `prefs.cardCovers: false`); die Karten behalten sie. */
  noCovers?: true;
  /** V125 (F-231 K8): eigene Felder des Boards (höchstens FIELD_MAX, Trello `customFields`). */
  fields?: CardFieldDef[];
  /** V125 (F-231 K8): Abstimmen in diesem Board an (Trello `prefs.voting` ≠ „disabled“). */
  votes?: true;
  /** V127 (F-231 K9): Karten, die hier als Spiegel liegen (Heimat auf einem anderen Board, mirrors.ts). */
  mirrors?: string[];
  /** V128 (F-231 K12): Stern wie Trello „Board markieren“ – steht in „+ Sheet“ › „Mit Stern …“ und in Ziel-Listen vorn (stars.ts). */
  star?: true;
  /** Regel „Abnahme nötig“: erledigt → „in Prüfung“, bis bestätigt. */
  review?: boolean;
  /** V140 (F-237 H2): nur Eisenhower – für wen die Matrix gilt (Name; fehlt = ich) und Datum der Einschätzung. */
  person?: string;
  date?: string;
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
  /** V103 (Enrico): im Notizen-Modus geöffnet – Desk- und Projekt-Modus zeigen es nicht (der Notizen-Modus zeigt alle). */
  notes?: true;
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
  /** V116 (Schritt 10, J9): Task-Limit je Person in diesem Projekt (offene Aufgaben); fehlt = keins. */
  taskLimit?: number;
  /** V117 (Projekt-Desk, PD3): Farbe des Projekts (#rrggbb) – gebundene Desks nehmen sie als Akzentfarbe. */
  accent?: string;
  sources?: SourceLink[];
  /** F-206 Schritt 10 (V100, K4/K5): ein Basisplan (Soll) zum Vergleich mit dem Ist. */
  baseline?: ProjectBaseline;
  /**
   * F-206 Schritt 10 (V100, K6): Ordnung im PSP – je Ebene die Ids in ihrer Reihenfolge. Schlüssel `''` =
   * oberste Ebene des Projekts, sonst Id der Eltern-Notiz. Werte: Notizen (Vorgänge) und auf der obersten
   * Ebene auch Teilprojekte. Fehlende Ids hängt der PSP hinten an, unbekannte überspringt er.
   */
  order?: Record<string, string[]>;
  /** F-225 (V105, P3): Instanzen der Projektorganisation (ICB4 Governance) – fehlt = Vorgabe Projektleitung, Lenkungskreis, Auftraggeber. */
  roles?: ProjectRole[];
  /** F-225 (P4/P5): Formular für Projektmeldungen – Felder aus und Pflichtfelder. */
  feedbackForm?: FeedbackFormRaw;
  /** F-226 (V109, L9/G11): Steckbrief-Felder nach GPM und ICB4 4.5.1/4.3.1 (neben dem Text in `brief`). */
  charter?: ProjectCharter;
  /** F-226 (L1): Ziele, Nicht-Ziele (ICB4 4.5.2). */
  goals?: ProjectGoal[];
  /** F-226 (L1): Zielkonflikte. */
  conflicts?: GoalConflict[];
  /** F-226 (L2/G9): Stakeholder (ICB4 4.5.12, 4.3.4). */
  stakeholders?: Stakeholder[];
  /** F-226 (L7/G8): Phasen (ICB4 4.5.4). */
  phases?: ProjectPhase[];
  /** F-226 (G1/G4): Formulare – Vorlage, eigene Felder und ihre Werte. */
  forms?: ProjectForms;
  /** F-226 Stufe 2 (V113, L8): Kommunikationsplan (DKI-Matrix). */
  comms?: CommItem[];
  /** F-226 Stufe 2 (V113, L12): Statusberichte. */
  reports?: StatusReport[];
  /** F-226 Stufe 2 Rest (V115): Dokumentation (ICB4 4.5.5), Prüfungen am Lieferobjekt (4.5.6), Lessons Learned (4.5.10), Veränderung (4.5.13), Auflagen (4.3.3), Abschluss (4.5.10). */
  docs?: DocItem[];
  checks?: QualityCheck[];
  lessons?: Lesson[];
  changes?: ChangeItem[];
  rules?: RuleItem[];
  close?: ProjectClose;
  /** F-234 (V137): AP-Statusberichte (D5), Teamrollen nach Belbin, Nachrichtenquadrat, Moderation, Maßnahmenplan, Anlagen (D6/D7). */
  wpReports?: WpReport[];
  teamRoles?: TeamRole[];
  messages?: MessageItem[];
  moderations?: ModerationItem[];
  actions?: ActionItem[];
  annexes?: AnnexItem[];
  /** F-234 D3 (V137): von Hand verschobene Kästen je Grafik (Zielhierarchie, Organigramm) – Kasten-Id › Versatz in px. */
  figLayout?: Record<string, Record<string, { dx: number; dy: number }>>;
  /** V140 (F-237 H6): Eisenhower-Matrizen aus dem Notizen-Modus, die in 15.2 abgebildet sind (Ids von Sheets). */
  eisenMaps?: string[];
  /** V140 (F-237): in 15.2 gewählte Matrix. */
  eisenSel?: string;
  /** V140 (F-237 H8): Matrix mit den offenen Arbeitspaketen einmalig angelegt. */
  eisenInit?: true;
  /** V118 (F-230 F6): eigener Arbeitskalender des Projekts (auch leer = ohne Feiertage); fehlt = der gemeinsame. */
  calendar?: WorkCalendar;
  /** V118 (F-230 Option C): was eine importierte Datei trägt, E-Sources aber nicht kennt – geht beim Export unverändert zurück. */
  foreign?: ForeignBag;
  /** F-235 (V136): nur am Live-Projekt – Stand (Chat), aus dem es erzeugt wurde. */
  live?: string;
  created: number;
  changed: number;
}

/**
 * V118 (F-230 Option C): mitgeführte Fremddaten. `mspdi` = unbekannte XML-Elemente (roh, mit Namen und dem Element davor,
 * damit sie beim Export an ihrem Platz landen), `assign` = je Person die unbekannten Teile ihrer Zuordnung (nur am Vorgang),
 * `trello` = unbekannte Felder aus dem Trello-JSON. `from` = woher (Datei, Zeitpunkt).
 */
export interface ForeignBag {
  mspdi?: ForeignEl[];
  assign?: Record<string, ForeignEl[]>;
  trello?: Record<string, unknown>;
  /** MSPDI: unbekannte Teile der Projektsammelzeile (Task UID 0) */
  summary?: ForeignEl[];
  /** MSPDI: Kalender beim Import, wie E-Sources ihn verstanden hat (JSON) – unverändert = Originalkalender zurückschreiben */
  calSig?: string;
  from?: { kind: 'mspdi' | 'trello'; name?: string; at: string; app?: string };
}
export interface ForeignEl {
  /** Elementname, z. B. „ExtendedAttribute“ */
  n: string;
  /** das ganze Element als XML-Text */
  x: string;
  /** Name des Elements davor in der Datei (für die Reihenfolge beim Export) */
  after?: string;
}

/** F-225 (V105, P3): Instanz im Projekt – Rolle mit Person oder Team. */
export interface ProjectRole {
  id: string;
  name: string;
  /** Person-Id */
  person?: string;
  /** V137 (Enrico 13:15): Hierarchie wie Abb. 7 – übergeordnete Rolle, Art (Linie, Stabsstelle, extern), Verbindung nach oben, Firma */
  parent?: string;
  kind?: 'staff' | 'external';
  link?: 'full' | 'tech' | 'contract';
  org?: string;
  /** F-226 Stufe 2 (V113, L10): AKV – Aufgaben, Kompetenzen/Befugnisse, Verantwortung. */
  tasks?: string;
  powers?: string;
  duty?: string;
}

/** F-226 Stufe 2 (V113, L8): Zeile der DKI-Matrix (Dokumentation, Kommunikation, Information). */
export interface CommItem {
  id: string;
  /** Was: Bericht, Protokoll, Besprechung … */
  content: string;
  sender?: string;
  receiver?: string;
  /** Bring- oder Holschuld */
  strategy?: 'push' | 'pull';
  /** Wie dokumentiert (Ablage, Format) */
  doc?: string;
  /** Wie informiert (E-Mail, Termin, Aushang …) */
  info?: string;
  /** Wie oft */
  freq?: string;
}

/** F-226 Stufe 2 Rest (V115, ICB4 4.5.5): Dokument im Projekt (Dokumentenmanagement). */
export interface DocItem {
  id: string;
  code?: string;
  title: string;
  /** Art: Plan, Protokoll, Bericht, Vertrag, Nachweis … */
  kind?: string;
  /** Person-Id */
  owner?: string;
  version?: string;
  date?: string;
  state?: 'draft' | 'review' | 'released' | 'archived';
  /** Ablageort bzw. Link */
  place?: string;
  /** Verteiler */
  dist?: string;
}
/** V115 (ICB4 4.5.6): Prüfung am Lieferobjekt (Qualitätsprüfung). */
export interface QualityCheck {
  id: string;
  /** Lieferobjekt bzw. Ergebnis */
  object: string;
  /** Arbeitspaket (Code oder Name, frei) */
  task?: string;
  criterion?: string;
  method?: 'visual' | 'measure' | 'test' | 'review' | 'accept';
  date?: string;
  /** Person-Id */
  by?: string;
  result?: 'open' | 'passed' | 'defects' | 'failed';
  defects?: string;
  action?: string;
  due?: string;
}
/** V115 (ICB4 4.5.10): Erfahrung aus dem Projekt. */
export interface Lesson {
  id: string;
  topic: string;
  kind?: 'good' | 'bad' | 'improve';
  /** Phase-Id */
  phase?: string;
  what?: string;
  cause?: string;
  advice?: string;
  /** Person-Id */
  owner?: string;
  shared?: boolean;
}
/** V115 (ICB4 4.5.13): Veränderung in der Organisation (Change und Transformation). */
export interface ChangeItem {
  id: string;
  area: string;
  today?: string;
  target?: string;
  affected?: string;
  resistance?: 'low' | 'mid' | 'high';
  measure?: string;
  /** Person-Id */
  owner?: string;
  due?: string;
  state?: 'planned' | 'running' | 'done';
}
/** V115 (ICB4 4.3.3): Auflage – Gesetz, Norm, Vertrag, interne Regel. */
export interface RuleItem {
  id: string;
  code?: string;
  title: string;
  source?: 'law' | 'norm' | 'contract' | 'internal' | 'authority';
  authority?: string;
  duty?: string;
  proof?: string;
  due?: string;
  /** Person-Id */
  owner?: string;
  state?: 'open' | 'met' | 'na';
}
/** V115 (ICB4 4.5.10): Projektabschluss. */
export interface ProjectClose {
  date?: string;
  result?: string;
  goals?: string;
  acceptedBy?: string;
  acceptedOn?: string;
  handover?: string;
  open?: string;
  team?: string;
  archived?: boolean;
  thanks?: string;
}

/** F-226 Stufe 2 (V113, L12): Statusbericht – Werte beim Anlegen eingefroren, Text frei. */
export interface StatusReport {
  id: string;
  /** Stichtag JJJJ-MM-TT */
  date: string;
  from?: string;
  to?: string;
  /** Ampel */
  light?: 'green' | 'yellow' | 'red';
  /** Fortschrittsgrad in % – Termin, Kosten, Leistung */
  progTime?: number;
  progCost?: number;
  progWork?: number;
  /** eingefroren: Plan und Ist (Ph, €), Rest */
  planHours?: number;
  actHours?: number;
  planCost?: number;
  actCost?: number;
  /** V118: eingefroren – Fertigstellungswert EV (€) am Stichtag (Earned-Value-Grafik) */
  ev?: number;
  /** erledigte bzw. geplante Aktivitäten, Steuerungsmaßnahmen, Bemerkung */
  done?: string;
  next?: string;
  measures?: string;
  note?: string;
  /** V115 (MTA): Ende der Meilensteine laut Gantt am Stichtag, je Notiz-Id */
  ms?: Record<string, string>;
}

/** F-234 (V137, D5): AP-Statusbericht wie Abb. 15 im Report – je Arbeitspaket, Werte beim Anlegen eingefroren. */
export interface WpReport {
  id: string;
  /** Arbeitspaket (Notiz-Id) */
  wp: string;
  /** Stichtag JJJJ-MM-TT */
  date: string;
  from?: string;
  to?: string;
  light?: 'green' | 'yellow' | 'red';
  /** Ist-Fortschrittsgrad in % */
  progress?: number;
  /** Plan = Basisplan, Soll = heutiger Plan (Gantt), Ist = von Hand */
  planStart?: string;
  planEnd?: string;
  sollStart?: string;
  sollEnd?: string;
  actStart?: string;
  actEnd?: string;
  planHours?: number;
  sollHours?: number;
  actHours?: number;
  planCost?: number;
  sollCost?: number;
  actCost?: number;
  /** Aktuelle Aktivitäten, notwendige Steuerungsmaßnahmen, Ort */
  done?: string;
  measures?: string;
  place?: string;
}
/** F-234 (V137, D6, ICB4 4.4.1): Teamrollen nach Belbin – Punkte je Rolle (Selbsteinschätzung). */
export interface TeamRole {
  id: string;
  person?: string;
  date?: string;
  /** Perfektionist, Umsetzer, Macher (handlungsorientiert) · Erfinder, Spezialist, Beobachter (wissensorientiert) · Weichensteller, Teamarbeiter, Koordinator (kommunikationsorientiert) */
  pf?: number;
  um?: number;
  ma?: number;
  er?: number;
  sp?: number;
  be?: number;
  ws?: number;
  ta?: number;
  ko?: number;
  /** Reflexion */
  text?: string;
}
/** F-234 (V137, D6, ICB4 4.4.3): Nachrichtenquadrat nach Schulz von Thun – je Ebene was der Sender meint und der Empfänger hört. */
export interface MessageItem {
  id: string;
  topic: string;
  date?: string;
  sender?: string;
  receiver?: string;
  message?: string;
  reaction?: string;
  sFact?: string;
  rFact?: string;
  sSelf?: string;
  rSelf?: string;
  sRel?: string;
  rRel?: string;
  sAppeal?: string;
  rAppeal?: string;
  /** Folge bzw. Lösung */
  result?: string;
}
/** F-234 (V137, D6, ICB4 4.4.8): eingesetzte Moderationstechnik mit Anlass. */
export interface ModerationItem {
  id: string;
  occasion: string;
  date?: string;
  technique?: string;
  participants?: string;
  goal?: string;
  result?: string;
}
/** F-234 (V137, D6): Zeile im Maßnahmenplan. */
export interface ActionItem {
  id: string;
  code?: string;
  title: string;
  activity?: string;
  owner?: string;
  /** Zuordnung: Arbeitspaket, Moderation, Thema */
  assign?: string;
  due?: string;
  state?: 'open' | 'doing' | 'done';
  note?: string;
}
/** F-234 (V137, D7): Anlage – Datei bzw. Link oder ein Kapitel, das als Anlage eingereiht wird. */
export interface AnnexItem {
  id: string;
  code?: string;
  title: string;
  /** Formular-Id aus der Vorlage (Kapitel als Anlage) */
  form?: string;
  /** Datei, Ablageort oder Link */
  place?: string;
  text?: string;
}

/** F-206 Schritt 10 (V100, K5): Soll eines Vorgangs im Basisplan. */
export interface BaselineTask {
  /** JJJJ-MM-TT */
  start?: string;
  end?: string;
  /** Arbeitstage. */
  duration?: number;
  /** Plan-Aufwand in Stunden. */
  effort?: number;
  /** Plan-Kosten in Euro. */
  cost?: number;
}

/** F-206 Schritt 10 (V100, K4/K5): Basisplan am Projekt – „Basisplan speichern“ überschreibt ihn. */
export interface ProjectBaseline {
  /** Zeitpunkt des Speicherns (ISO 8601). */
  at: string;
  start?: string;
  end?: string;
  budget?: number;
  /** Je Vorgang (Id der Notiz); bleibt auch für später gelöschte Vorgänge stehen („entfallen“). */
  tasks: Record<string, BaselineTask>;
}

/** V65: Befugnisse einer Person (AKV). */
/** V105 (F-224): 'feedback' = „Feedback bearbeiten“ – als einzige nicht ab Werk (Ausnahme von P18). */
export type PersonRight = 'release' | 'spend' | 'decide' | 'accept' | 'feedback';

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
  /** F-226 (L6): Stundensatz in Euro. */
  rate?: number;
  /** V118 (F-230 Option C): mitgeführte Fremddaten aus einem Import (unbekannte Resource-Elemente). */
  foreign?: ForeignBag;
  /** F-226 (L2/L13): Firma bzw. Funktion, Qualifikation. */
  org?: string;
  qual?: string;
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

/** F-222 (N7): Zustand einer Entscheidung. */
export type DecisionState = 'draft' | 'rated' | 'decided';

/** F-222: Kriterium mit Gewicht in % (N2), Muss-Kriterium als Vorfilter (N4). */
export interface DecisionCriterion {
  id: string;
  name: string;
  /** Gewicht in Prozent (Summe 100); fehlt = noch nicht gewichtet */
  weight?: number;
  /** Muss-Kriterium: wer es nicht erfüllt, „scheidet aus“ */
  must?: true;
  /** Wie wird geprüft? (Faustregel „prüfbar“, N12) */
  hint?: string;
}

/** F-222: Lösung (Alternative), optional mit Bezügen wie V93 (N5). */
export interface DecisionOption {
  id: string;
  name: string;
  note?: string;
  /** Bezüge: Notiz-, Source-, Personen- oder Feedback-Ids */
  links?: DecisionLink[];
  /** Muss-Kriterium nicht erfüllt (Ids der Kriterien) */
  fails?: string[];
}

/** F-222 (N5): Bezug wie bei Notiz ↔ Quelle (V93). */
export interface DecisionLink {
  kind: 'note' | 'bookmark' | 'person' | 'feedback';
  id: string;
}

/** F-222 (N4/N10): Bewertung 0–10 einer Lösung für ein Kriterium, Begründung freiwillig, `by` für Stufe 2. */
export interface DecisionScore {
  /** Kriterium-Id */
  c: string;
  /** Lösungs-Id */
  o: string;
  /** 0 = gar nicht · 5 = teilweise · 10 = voll */
  v: number;
  why?: string;
  by?: string;
}

/** F-226 Stufe 2 (V113, L17/L12): Arbeitspaket-Beschreibung (GPM 8.3). */
export interface NoteWp {
  /** Ziel bzw. Inhalt des Arbeitspakets */
  goal?: string;
  /** Aktivitäten, eine Zeile je Aktivität */
  activities?: string;
  /** Voraussetzungen bzw. Schnittstellen */
  inputs?: string;
  /** Chancen und Risiken im Arbeitspaket */
  risks?: string;
  /** Fortschrittsmessung */
  method?: ProgressMethod;
  /** Fertigstellungsgrad in % (bei Schätzung bzw. aufwandsproportional von Hand) */
  progress?: number;
  /** Freigabe Projektleitung bzw. AP-Verantwortlicher (JJJJ-MM-TT) */
  releasePl?: string;
  releaseOwner?: string;
}
/** Fortschrittsmessmethoden nach GPM: 0/100, 50/50, 20/80, aufwandsproportional, Meilensteine, Schätzung. */
export type ProgressMethod = 'zero' | 'half' | 'twenty' | 'effort' | 'steps' | 'estimate';

/** F-222 (N2): Paarvergleich – Schlüssel „a|b“ (a vor b in der Kriterienliste), 2 = a wichtiger, 1 = gleich, 0 = b wichtiger. */
export type DecisionPairs = Record<string, 0 | 1 | 2>;

/** F-222 (N7): Eintrag in der Spur. */
export interface DecisionMark {
  at: string;
  text: string;
  by?: string;
}

/** F-222 (N1): eine Entscheidung (Nutzwertanalyse). */
export interface Decision {
  id: string;
  title: string;
  state: DecisionState;
  /** ISO-Zeitpunkt der Anlage */
  at: string;
  changed?: string;
  /** Wozu / Frage der Entscheidung */
  question?: string;
  /** am Projekt (Id aus Workspace.projects); fehlt = frei */
  projectId?: string;
  criteria: DecisionCriterion[];
  options: DecisionOption[];
  scores?: DecisionScore[];
  /** N2: Gewichte per Paarvergleich ermittelt; fehlt = frei */
  pairs?: DecisionPairs;
  /** Bezüge der Entscheidung selbst (z. B. „Entscheidung vorbereiten …“ aus der Notiz) */
  links?: DecisionLink[];
  /** N7: gewählte Lösung („Entscheiden …“) */
  chosen?: string;
  /** N7: Begründung – Pflicht nur bei Abweichung vom Sieger */
  why?: string;
  /** N7: gesperrt nach „Entschieden“ */
  locked?: true;
  /** N7: Spur */
  marks?: DecisionMark[];
}

// ---------------------------------------------------------------- F-226 (V109): Projektformulare nach GPM

/** F-226 (G7): Einsatz einer Ressource an einem Vorgang. */
export interface NoteUse {
  /** Person-Id (Person, Team, Rolle oder Qualifikationsgruppe) */
  person: string;
  /** Plan-Aufwand in Personenstunden */
  hours?: number;
  /** Kosten in Euro von Hand – geht vor Stunden × Satz */
  cost?: number;
}

/** F-226 (ICB4 4.5.9): Zustand einer Beschaffung. */
export type ProcureState = 'open' | 'asked' | 'offered' | 'ordered' | 'delivered';
/** F-226 (ICB4 4.5.9): Beschaffung – Titel der Notiz = Gegenstand. */
export interface NoteProcure {
  /** selbst machen oder zukaufen */
  make?: 'make' | 'buy';
  supplier?: string;
  /** Angebot bzw. Preis in Euro */
  offer?: number;
  contract?: string;
  state?: ProcureState;
}

/** F-226 (L9, ICB4 4.5.1 / 4.3.1): Steckbrief-Felder. */
export interface ProjectCharter {
  /** Projektnummer, z. B. Z20-0173 */
  no?: string;
  /** Projektart, z. B. Organisationsprojekt */
  kind?: string;
  client?: string;
  clientKind?: 'in' | 'ex';
  clientAddress?: string;
  /** Nutzen (4.3.1) und Messgröße */
  benefit?: string;
  benefitMeasure?: string;
  /** Business Case, Strategiebezug (4.3.1) */
  businessCase?: string;
  /** Eigenaufwand in Ph, Fremdaufwand in Euro */
  ownEffort?: number;
  extEffort?: number;
  /** Kostenarten in Euro */
  costPm?: number;
  costStaff?: number;
  costMaterial?: number;
  /** Risikorücklage in Euro */
  reserve?: number;
  reporting?: string;
  special?: string;
  /** Freigabe (JJJJ-MM-TT) durch Projektleitung bzw. Auftraggeber */
  releasePl?: string;
  releaseAg?: string;
  /** ICB4 4.5.1: Erfolgskriterien, Vorgehensmodell, Tailoring, Komplexität 1–5 */
  success?: string;
  model?: 'classic' | 'agile' | 'hybrid';
  tailoring?: string;
  complexity?: number;
  /** V132 (F-232, Abbildung 3 im Report): Hauptziele/Kurzbeschreibung, Projektbeteiligte, Unterschriften (Namen), fixierte Meilensteine (Notiz-Ids). */
  main?: string;
  team?: string;
  steering?: string;
  vendors?: string;
  others?: string;
  signAg?: string;
  signPl?: string;
  fixed?: string[];
}

export type GoalKind = 'perf' | 'social' | 'non';
export type GoalLevel = 'must' | 'should' | 'can';
/** F-226 (L1): Ziel nach ICB4 4.5.2 – auch Nicht-Ziel (`kind: 'non'`). */
export interface ProjectGoal {
  id: string;
  /** z. B. L1.1, S2 */
  code?: string;
  text: string;
  /** Operationalisierung (messbar) */
  measure?: string;
  level?: GoalLevel;
  /** Person-Id oder Name */
  owner?: string;
  consequence?: string;
  kind?: GoalKind;
  /** Oberziel (Hierarchie) */
  parent?: string;
}
/** F-226 (L1): Zielkonflikt zwischen zwei Zielen. */
export interface GoalConflict {
  id: string;
  a: string;
  b: string;
  text?: string;
  measure?: string;
  /** Vorrang hat Ziel a oder b */
  first?: 'a' | 'b';
}

export type StakeStrategy = 'participative' | 'informative' | 'discursive' | 'repressive';
/** F-226 (L2, G9): Stakeholder – verweist auf eine Person oder steht für sich (z. B. „Anwohner“). */
export interface Stakeholder {
  id: string;
  /** z. B. SH-IN 01, SH-EX 04 */
  code?: string;
  name: string;
  person?: string;
  side?: 'in' | 'ex';
  /** Umfeld sachlich oder sozial */
  area?: 'fact' | 'social';
  interests?: string;
  fears?: string;
  strategy?: StakeStrategy;
  measures?: string;
  /** Einstellung −2 (dagegen) bis +2 (dafür) */
  attitude?: number;
  /** Konfliktpotenzial, Macht/Einfluss: 1 gering – 3 hoch */
  conflict?: number;
  power?: number;
}
/** F-226 (L7, G8): Phase. */
export interface ProjectPhase {
  id: string;
  name: string;
  /** Schwerpunkt */
  focus?: string;
  goal?: string;
  start?: string;
  end?: string;
  /** Anteil am Aufwand in Prozent */
  share?: number;
  /** freigegeben am (JJJJ-MM-TT) */
  release?: string;
}

/** F-226 (G4): Typ eines Formularfelds – wie eigene Felder im Feedback (V106) plus Person. */
export type FormFieldType = FeedbackFieldType | 'person';
/** F-226 (G4): eigenes Feld bzw. eigene Spalte eines Formulars. */
export interface FormFieldDef {
  id: string;
  name: string;
  type: FormFieldType;
  options?: string[];
  required?: boolean;
}
/** F-226: Woher ein Formular seine Zeilen nimmt. */
export type FormSource = 'charter' | 'goals' | 'conflicts' | 'stakeholders' | 'risks' | 'phases' | 'milestones' | 'tasks' | 'uses' | 'persons' | 'procure' | 'roles' | 'accept' | 'comms' | 'reports' | 'wp' | 'costs' | 'ev' | 'mta' | 'docs' | 'checks' | 'lessons' | 'changes' | 'rules' | 'close' | 'wpReports' | 'teamRoles' | 'eisenhower' | 'messages' | 'moderations' | 'actions' | 'annexes';
/** F-226: Spalte bzw. Feld eines Formulars – eingebautes Feld (`key`) oder eigenes (`custom:<id>`). */
export interface FormColumn {
  key: string;
  label?: string;
  required?: boolean;
}
/** F-226: ein Formular der Vorlage. */
export interface FormDef {
  id: string;
  /** Kapitel nach Leitfaden, z. B. „2.2“ */
  chapter: string;
  name: string;
  source: FormSource;
  /** Tabelle (Zeilen) oder Feldliste (ein Objekt); V113: `record` = Feldliste je Zeile (Auswahl-Rad), `chart` = Ganglinie, `portfolio` = Grafik */
  layout: 'table' | 'fields' | 'record' | 'chart' | 'portfolio' | 'figure';
  /** F-234 (V135): Grafik eines Kapitel-Blatts mit Layout `figure` (gpmFigures.ts) */
  figure?: 'goalTree' | 'org' | 'phasePlan' | 'psp' | 'gantt' | 'load' | 'wpReport' | 'belbin' | 'eisenhower' | 'square';
  columns: FormColumn[];
  /** Zeilen-Filter, z. B. Ziel-Art `non` */
  filter?: string;
  /** Stufe 1–3 (F-226 G11) */
  stage?: number;
  /** ICB4-Element, z. B. „4.5.2“ */
  icb?: string;
  /** eigene Felder, die zur Vorlage gehören (aus „Als Vorlage speichern“) */
  fields?: FormFieldDef[];
}
/** F-226 (G3/G4): Vorlage – Reihe von Formularen. */
export interface FormTemplate {
  id: string;
  name: string;
  forms: FormDef[];
}
/** F-226 (G4): Formulare eines Projekts – Vorlage, Änderungen daran und Werte eigener Felder. */
export interface ProjectForms {
  /** Vorlage (Id aus Workspace.formTemplates oder `gpm-d`) */
  template?: string;
  /** eigene Felder je Formular */
  extra?: Record<string, FormFieldDef[]>;
  /** ausgeblendete Spalten je Formular */
  hidden?: Record<string, string[]>;
  /** Werte eigener Felder: Zeilen-Id › Feld-Id › Wert */
  values?: Record<string, Record<string, string | number | boolean>>;
}
