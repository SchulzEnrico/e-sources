/**
 * F-95/F-172: Touren – zeigen Schritt für Schritt auf die Bedienelemente.
 * Mehrere Touren (Start, Cockpit, später Design F-171), jede mit eigenem „gesehen“-Merker.
 * Texte kommen aus help.ts/terms.ts (F-156), damit nichts doppelt geschrieben wird.
 * Schritte, deren Ziel gerade fehlt (z. B. kein Stack offen), werden übersprungen.
 */
import { BROWSER_EXPORT, browserSend, helpById } from './help';
import { type BrowserName, browserOf, currentUa, modKey } from './browser';
import { CASE_TEXT, CATEGORY_TEXT, DESK_LAYOUT_TEXT, DEV_TEXT, PAUSE_TEXT, SYNC_TEXT, TINT_TEXT } from './terms';

export interface TourStep {
  id: string;
  title: string;
  text: string;
  /** CSS-Selektor des Elements, auf das der Schritt zeigt; ohne = mittig. */
  target?: string;
  /** Ziel für die Dauer des Schritts aufklappen (Klasse is-open), z. B. den Stack mit Namen. */
  expand?: boolean;
  /** Teil des Ziels, um den der Rahmen liegt (nach dem Aufklappen), sonst das Ziel selbst. */
  ring?: string;
  /** Schritt nur zeigen, wenn es dieses Element gibt (ohne Rahmen darum), z. B. nur im Import-Dialog. */
  when?: string;
  /** Schritt nur zeigen, wenn es dieses Element nicht gibt, z. B. „Datei wählen“ nur ohne offenen Dialog. */
  unless?: string;
  /** Aufzählung unter dem Text, z. B. die Wege je Browser. */
  list?: string[];
  /** Beschriftung eines Knopfs, der die Tour beendet und den nächsten Schritt selbst ausführt. */
  action?: string;
  /** F-197: Aktion lässt die Tour offen (z. B. „Datei laden“, „Adresse kopieren“), statt sie zu beenden. */
  keep?: boolean;
}

export type TourId = 'start' | 'cockpit' | 'design' | 'import' | 'colors' | 'send' | 'sources' | 'dev' | 'sync' | 'notes' | 'stage' | 'feedback' | 'projects';

const t = (id: string) => helpById(id)?.text ?? '';

/** Cockpit-Elemente liegen im Dialog #overview, Design-Elemente im Dialog #design. */
const C = '#overview';
const D = '#design';
/** Import-Dialog (F-36) */
const I = 'dialog.import';
/** F-171 Stufe 2: Dialog „Farben“ eines Portals (F-162 bis F-164, F-183) */
const K = 'dialog.colors';
/** F-202 Stufe 4: vorderes Portal auf dem Desk */
const P = 'main section[data-panel-id]';
/** V54: sichtbares Portal im Entwickler-Modus (F-200) */
/** V106: Projekt-Modus */
const PJ = '.projlayer .pj';
const V = 'main .tile:not(.is-back) section.win--dev';
/** V59: Dialog „Abgleich zwischen Geräten“ (F-169 Stufe 2) */
const Y = 'dialog.sync';
const ST = SYNC_TEXT.tour;

export const TOURS: Record<TourId, TourStep[]> = {
  start: [
    {
      id: 'welcome',
      title: 'Willkommen bei E-Sources',
      text: 'Dein Source Desk fürs Web: mehrere Webseiten nebeneinander, ohne den Überblick zu verlieren. Die Tour dauert eine Minute – mit → weiter, mit Esc beenden.',
    },
    { id: 'desk', title: 'Desk', target: '.toolbar .tb-win', text: `${t('desk')} Klick auf den Namen benennt ihn um.` },
    { id: 'portal', title: 'Portal', target: 'main section[data-panel-id]', text: t('portal') + ' Am Namen ziehen tauscht oder versetzt es.' },
    { id: 'address', title: 'Adresse', target: 'main section[data-panel-id] input[aria-label="Adresse"]', text: 'Hier gibst du eine Adresse ein oder ziehst einen Link hinein – das Portal zeigt dann diese Source.' },
    { id: 'stackAdd', title: 'Portal stapeln', target: 'main section[data-panel-id] .win__stack-add', text: t('newPortal') + ' Die Farbe des Plus zeigt, wie die Fokusanzeige danach stünde.' },
    { id: 'stack', title: 'Stack', target: 'main .stack', expand: true, ring: '.stack__inner', text: t('stack') + ' Mit ▲/▼ oder dem Mausrad blätterst du; ein Klick auf einen Namen holt dieses Portal nach vorn.' },
    { id: 'stage', title: 'Main Stage', target: 'main .win__stagebtn', text: 'Der Scheinwerfer im Portal-Kopf macht diesen Slot zur Main Stage – dem Slot, aus dem du arbeitest. Pads und Dock liegen nie darüber. Er erscheint, wenn du über den Portal-Kopf fährst. Eigene kurze Tour: Hilfe (?) › „Tour Main Stage“.' },
    { id: 'newSlot', title: '+ NewSlot', target: '.tb-center .tb-add, .tb-center .tb-newslot', text: t('newSlot') },
    { id: 'notesTasks', title: 'Notizen & Aufgaben', target: '.toolbar .tb-nt', text: 'Notizen, To-do-Listen, Kanban-Boards und Eisenhower-Matrix – in Pads, die über dem Desk schweben oder im Dock liegen. Das Menü legt an, sucht und ordnet (Alt/⌥+N). Eigene kurze Tour unten im Menü.' },
    { id: 'deskMode', title: 'Desk | Notizen', target: '.toolbar .tb-mode', text: '„Desk“ zeigt die Portale, „Notizen“ ordnet die Pads dieses Desks wie Slots als Arbeitsfläche. Das Rad gilt je Desk.' },
    { id: 'view', title: 'View', target: '.tb-center .tb-viewwheel', text: t('view') },
    { id: 'search', title: 'Suchen', target: '.tb-center .search', text: t('search') },
    { id: 'focus', title: 'Fokusanzeige', target: '.toolbar .focus-meter', text: `${t('focus')} Ein Klick öffnet das Cockpit (Strg/⌘+.) – dort gibt es eine eigene kurze Tour.` },
    { id: 'design', title: 'Design', target: '.toolbar .tb-design', text: `${t('design')} Der Knopf öffnet „Design anpassen“ – mit eigener kurzer Tour.` },
    { id: 'feedback', title: 'Feedback', target: '.toolbar .tb-fb', text: 'Fehler gefunden, Wunsch oder Frage? „Feedback“ (Alt/⌥+F) öffnet ein kleines Fenster genau hier – Titel und Art genügen, Ort und Gerät kommen automatisch mit. Alle deine Meldungen stehen im Cockpit am Rad „Feedback“ – mit eigener kurzer Tour.' },
    { id: 'help', title: 'Hilfe', target: '.toolbar .tb-help', text: 'Alle Funktionen und Tastenkürzel findest du hier oder mit der Taste ?. Dort kannst du auch diese Tour wieder starten.' },
  ],
  // F-217 (V98): je Ansicht des Cockpit-Rads (NF-08) – gleicher Anfang, dann nur die Schritte der offenen Ansicht
  // (Klasse is-portals, is-notes, is-focus, is-persons, is-layouts, is-sources am #overview), gleiches Ende
  cockpit: [
    {
      id: 'cockpit',
      title: 'Das Cockpit',
      text: `${t('cockpit')} Diese kurze Tour zeigt dir, was du in der offenen Ansicht siehst und tun kannst – mit → weiter, mit Esc beenden.`,
    },
    {
      id: 'focus',
      title: 'Fokusanzeige',
      target: `${C} .overview__info`,
      text: `${t('focus')} Grün heißt: gut überschaubar, Gelb: es wird voll, Rot: zu viel auf einmal.`,
    },
    {
      id: 'modes',
      title: 'Was das Cockpit zeigt',
      target: `${C} .overview__mode`,
      text: 'Das Rad schaltet um, was das Cockpit zeigt. Es dreht mit Scrollen, Klick oder Pfeiltasten. Jede Ansicht ist gleich aufgebaut: links das Bild, rechts die Liste mit den Werkzeugen. Die Tour zeigt, was gerade offen ist – für eine andere Ansicht dort einfach „Tour“ noch einmal wählen.',
      list: [
        'Portale – Radar aller Desks mit ihren Slots und Portalen',
        'Notizen – Pads und Sheets je Desk, dazu Fokus und Regeln',
        'Personen – Ressourcentabelle: wer wie viel Zeit hat',
        'Layouts – gespeicherte Anordnungen des Desks mit ihren Cases',
        'Library – deine gespeicherten Sources und alle Notizen',
      ],
    },
    // Ansicht „Portale“
    {
      id: 'radar',
      title: 'Radar',
      target: `${C}.is-portals .radar__maps`,
      text: 'Jeder Desk erscheint als kleiner Bildschirm mit seinen Slots an ihrer Stelle. Die Leiste in jedem Slot zeigt in Ampelfarben, wie viele Portale darauf liegen; der Scheinwerfer markiert die Main Stage. Pfeiltasten wandern zwischen den Slots.',
    },
    {
      id: 'portals',
      title: 'Portale des Slots',
      target: `${C}.is-portals .radar__detail`,
      text: 'Rechts stehen die Portale des gewählten Slots. Enter oder Klick zeigt das Portal – auch auf einem anderen Desk. F2 benennt um, Entf schließt, S macht den Slot zur Main Stage.',
    },
    {
      id: 'move',
      title: 'Verschieben und Holen',
      target: `${C}.is-portals .overview__list .overview__row`,
      text: 'V verschiebt ein Portal auf einen anderen Slot oder Desk, Umschalt+V den ganzen Slot. H holt ein Portal von einem anderen Desk hierher. Mit der Maus ziehst du eine Zeile auf einen Slot im Radar.',
    },
    {
      id: 'arrange',
      title: 'Slots anordnen',
      target: `${C}.is-portals .radar__map:not(.lc__map)`,
      text: 'Eine Slot-Kachel auf eine andere ziehen: in die Mitte = dort ablegen, an den Rand = an dieser Stelle einsetzen. Die Kante zwischen zwei Slots ändert die Größe. Per Tastatur: Alt+Pfeil versetzt, Alt+Umschalt+Pfeil ändert die Größe. Eine feste Main Stage bleibt, wo sie ist.',
    },
    {
      id: 'filter',
      title: 'Filtern',
      target: `${C}.is-portals .radar__filter`,
      text: 'Findet Portale, Slots, Desks und Sources auf allen Desks. Pfeil runter springt in die Treffer.',
    },
    // Ansicht „Notizen“ (V85, weitestgehend wie „Portale“)
    {
      id: 'notesNew',
      title: 'Neu anlegen',
      target: `${C}.is-notes:not(.is-focus):not(.is-rules) .overview__new`,
      text: 'Legt ein neues Pad (Notizblock) oder ein Sheet an – To-do-Liste, Kanban-Board oder Eisenhower-Matrix. Es erscheint auf diesem Desk und hier in der Liste.',
    },
    {
      id: 'notesRadar',
      title: 'Pads im Radar',
      target: `${C}.is-notes:not(.is-focus) .radar__maps`,
      text: 'Wie bei „Portale“ ist jeder Desk ein kleiner Bildschirm. Die Slots stehen nur blass als Lage darin, die schwebenden Pads als Rahmen an ihrem Platz, das Dock als geriffelter Streifen am rechten Rand.',
    },
    {
      id: 'notesList',
      title: 'Pads und Sheets',
      target: `${C}.is-notes:not(.is-focus) .overview__list`,
      text: 'Rechts stehen die Pads mit ihren Sheets – dieselben Werkzeuge an denselben Stellen wie bei Portalen: Enter zeigt, V verschiebt auf einen anderen Desk, H holt hierher, D legt ins Dock oder löst daraus, F2 benennt um, Entf schließt (mit Rückgängig).',
    },
    {
      id: 'notesFilter',
      title: 'Filtern',
      target: `${C}.is-notes:not(.is-focus) .radar__filter`,
      text: 'Findet Pads, Sheets und Desks auf allen Desks. Pfeil runter springt in die Treffer.',
    },
    {
      id: 'notesWheel',
      title: 'Notizen · Fokus · Regeln',
      target: `${C}.is-notes .overview__rules`,
      text: '„Fokus“ zeigt, wie viel Arbeit auf dir oder deinem Team liegt – Woche für Woche gegen die Zeit, die da ist. „Regeln“ zeigt, was E-Sources bei Notizen von selbst tut.',
    },
    // „Fokus“ im Cockpit „Notizen“ (V95/V96, Vorbild Auslastungsgrafik MS Project/iTaskX)
    {
      id: 'focusViews',
      title: 'Darstellungen',
      target: `${C}.is-focus .fc__views`,
      text: 'Wähle, was du sehen willst: Fokus-Zeile im Desk-Kopf, Wochenbalken, Fokus-Ring und Auslastungs-Raster – einzeln oder zusammen.',
    },
    {
      id: 'focusBars',
      title: 'Auslastung',
      target: `${C}.is-focus .fc__top`,
      text: 'Bis 80 % bleibt es ruhig, bis 100 % gelb, darüber rot – immer mit Zahl, z. B. „44 von 40 h“. Vorläufige Aufgaben sind schraffiert. Pfeile wählen eine Woche, Enter zeigt ihre Aufgaben; ein Klick öffnet die Notiz.',
    },
    // Ansicht „Personen“ (V95, Ressourcentabelle nach MS Project/iTaskX)
    {
      id: 'persons',
      title: 'Ressourcentabelle',
      target: `${C}.is-persons .pc__tablewrap`,
      text: 'Alle Personen und Teams mit Art, Kapazität je Woche, Abwesenheit, Befugnissen und offenen Aufgaben. Pfeile wählen, F2 benennt um, Entf löscht (mit Rückfrage und Rückgängig), Enter springt nach rechts.',
    },
    {
      id: 'personInfo',
      title: 'Ressourceninformationen',
      target: `${C}.is-persons .pc__info`,
      text: 'Hier stellst du die gewählte Person ein: Kapazität, Task-Limit, Kennfarbe, Mitglieder eines Teams, Befugnisse, Abwesenheiten im Ressourcenkalender und die Vertretung.',
    },
    // Ansicht „Library“ (V97: Library-Rad)
    {
      id: 'library',
      title: 'Sources · Notizen',
      target: `${C}.is-sources .lib-wheel`,
      text: 'Dasselbe Rad wie in der Library jedes Portals: „Sources“ zeigt deine gespeicherten Sources nach Kategorie, „Notizen“ alle Notizen. Die Wahl bleibt auf diesem Gerät gemerkt.',
    },
    {
      id: 'libraryList',
      title: 'Die Liste',
      target: `${C}.is-sources .srcc, ${C}.is-sources .libnotes`,
      text: 'Oben filtern, Pfeile wandern durch die Liste. Bei Sources schaltet das Pause-Zeichen „nie pausieren“, Haken stellen mehrere auf einmal ein; bei Notizen öffnet Enter die Notiz im Pad.',
    },
    // Ansicht „Layouts“ (V56/F-116)
    {
      id: 'layouts',
      title: 'Layouts',
      target: `${C}.is-layouts .lc__cards`,
      text: `${DESK_LAYOUT_TEXT.term}. Ein Klick auf eine Karte zeigt das Layout nur an; erst „Wechseln“ baut den Desk um. „Neues Layout“ legt eins an – leer oder als Kopie.`,
    },
    {
      id: 'layoutActions',
      title: 'Aktionen des Layouts',
      target: `${C}.is-layouts .lc__actions`,
      text: 'Direkt unter den Karten steht, was du mit dem gewählten Layout tun kannst: wechseln, umbenennen, kopieren, löschen (mit Rückfrage und Rückgängig). Rechts daneben seine Cases.',
    },
    {
      id: 'cases',
      title: 'Spaces und Cases',
      target: `${C}.is-layouts .lc__cases--inline`,
      text: `${CASE_TEXT.spaceTerm} ${CASE_TEXT.caseTerm} Über „${CASE_TEXT.manage}“ legst du beides an; „${CASE_TEXT.assign}“ ordnet dieses Layout zu. Gibt es Cases, kannst du oben unter „${CASE_TEXT.pick}“ einen wählen – auch über die Suche.`,
    },
    {
      id: 'preview',
      title: 'Vorschau für ein Gerät',
      target: `${C}.is-layouts .lc__prevhead`,
      text: `${DESK_LAYOUT_TEXT.deviceTerm}. Steht dort nicht dieses Gerät, ist das Bild orange gepunktet umrandet; „${DESK_LAYOUT_TEXT.thisDevice}“ holt es zurück.`,
    },
    {
      id: 'slots',
      title: 'Slots ordnen',
      target: `${C}.is-layouts .lc__side`,
      text: 'Neben dem Bild legst du Slots an und verteilst sie gleichmäßig. Wähle einen Slot im Bild (Klick oder Pfeile), dann kannst du ihn mit einem anderen tauschen oder schließen – seine Portale kommen in den Nachbar-Slot.',
    },
    {
      id: 'rules',
      title: 'Regeln',
      target: `${C}.is-portals .overview__rules`,
      text: 'Zeigt alles, was E-Sources von selbst tut – bei Portalen Farbregeln je Kategorie, Seite → Kategorie und eingebaute Regeln wie „Nach der Kategorie fragen“, bei Notizen z. B. Board-Regeln. Ein Häkchen schaltet eine Regel ein oder aus; ändern und löschen geht hier auch.',
    },
    {
      id: 'again',
      title: 'Tour wieder starten',
      target: `${C} .overview__restart`,
      text: 'Über diesen Knopf, die Hilfe (?) oder die Suche („Tour Cockpit“) startest du diese Tour jederzeit wieder. Esc schließt das Cockpit.',
    },
  ],
  // F-181: vor dem Wählen der Datei (ohne Dialog) und im Import-Dialog; Schritte passen sich an
  import: [
    {
      id: 'intro',
      title: 'Lesezeichen übernehmen',
      text: 'Deine Lesezeichen aus dem Browser kommen in drei Schritten in die Library: im Browser als Datei speichern, die Datei hier wählen, festlegen, wie die Ordner zu Kategorien werden. Mit → weiter, mit Esc beenden.',
    },
    {
      id: 'export',
      title: 'Im Browser als Datei speichern',
      text: 'Jeder Browser kann seine Lesezeichen als HTML-Datei speichern. So findest du es:',
      list: BROWSER_EXPORT.map((b) => `${b.browser}: ${b.how}`),
      action: 'Datei wählen …',
    },
    {
      id: 'choose',
      title: 'Datei wählen',
      unless: I,
      text: 'Wähle die gespeicherte Datei – meist liegt sie im Ordner „Downloads“ und heißt z. B. „bookmarks.html“ oder „favorites.html“. E-Sources liest sie nur, hochgeladen wird nichts.',
      action: 'Datei wählen …',
    },
    { id: 'summary', title: 'Was die Datei bringt', target: `${I} .import__sum`, text: 'Hier steht, wie viele Lesezeichen neu sind. Was schon in der Library ist, wird übersprungen – du kannst also ohne Sorge noch einmal importieren.' },
    {
      id: 'how',
      title: 'Wie fein sortiert?',
      target: `${I} .import__how`,
      text: '„Ordner wie im Browser“ macht aus jedem Unterordner eine Kategorie. „Nur oberste Ordnerebene“ gibt weniger, größere Kategorien. „Alles in eine Kategorie“ sammelt alles unter dem heutigen Datum. Pfeiltasten wählen.',
    },
    { id: 'go', title: 'Übernehmen', target: `${I} .import__go`, text: 'Übernimmt die neuen Sources in die Library. Portalen wird dabei nichts zugeordnet – deine Desks bleiben, wie sie sind.' },
    {
      id: 'sort',
      title: 'Danach: Sortierhilfe',
      when: I,
      text: `${t('sortHelp')} Wieder starten: Knopf „Tour“ im Import-Dialog, Hilfe (?) oder Suche („Tour Import“).`,
    },
    {
      id: 'sendToo',
      title: 'Noch ein Tipp: „Öffnen in“',
      when: I,
      text: 'Du kennst jetzt den Lesezeichen-Manager deines Browsers. Dort lässt sich in einer Minute auch „Öffnen in“ einrichten: ein Lesezeichen in der Leiste, das jede offene Seite mit einem Klick an E-Sources schickt.',
      action: 'Anleitung zeigen',
    },
  ],
  send: sendTour(browserOf(currentUa()), modKey(currentUa())),
  // F-171 Stufe 1 (V20) und Stufe 2 (V36): Darstellung, Akzent, Farben des Desks; weiter in der Tour „Farben“
  design: [
    {
      id: 'design',
      title: 'Design anpassen',
      text: `${t('design')} Diese kurze Tour zeigt dir die Einstellungen – mit → weiter, mit Esc beenden.`,
    },
    {
      id: 'theme',
      title: 'Darstellung',
      target: `${D} .design__theme`,
      text: 'Das Rad wählt Dunkel, Hell oder „Wie System“ – dann folgt E-Sources der Einstellung deines Geräts. Es dreht mit Scrollen, Klick oder Pfeiltasten.',
    },
    {
      id: 'retro',
      title: 'Alte Systeme',
      target: `${D} .design__oldsys`,
      text: 'Darunter stehen Stile im Look älterer Systeme. Wählst du einen, steht das Rad oben zwischen den Rasten auf dessen Namen.',
    },
    {
      id: 'accent',
      title: 'Akzentfarbe',
      target: `${D} .design__accent .design__wheel`,
      text: 'Die Akzentfarbe färbt Knöpfe, Rahmen, Markierungen und den Lichtkegel der Main Stage. Dreh das Rad – die Farbe gilt sofort für alle Desks.',
    },
    {
      id: 'custom',
      title: 'Eigene Farbe',
      target: `${D} .design__accent .look__custom`,
      text: 'Hier wählst du jede beliebige Farbe. Ist sie zu blass oder zu grell für die Darstellung, erscheint darunter ein Hinweis zum Kontrast.',
    },
    {
      id: 'tints',
      title: 'Slots und Portale',
      target: `${D} .design__tints`,
      text: 'Hier siehst du, wie viele Slots und Portale dieses Desks eigene Farben haben. Ein Knopf setzt alle auf einmal auf die Farben des Desks zurück – mit „Rückgängig“, falls es zu schnell ging.',
    },
    {
      id: 'more',
      title: 'Farben je Portal und Kategorie',
      text: 'Eigene Farben für ein Portal oder seinen Slot, die Kategorie mit Farbe und Zeichen wählst du am Portal: ⋮ Portal-Optionen → „Farben …“. Dort gibt es eine eigene kurze Tour – der Knopf öffnet sie für das aktive Portal.',
      action: 'Farben zeigen',
    },
    {
      id: 'again',
      title: 'Tour wieder starten',
      target: `${D} .design__tour`,
      text: 'Über diesen Knopf, die Hilfe (?) oder die Suche („Tour Design“) startest du diese Tour jederzeit wieder. Esc schließt den Dialog.',
    },
  ],
  // F-171 Stufe 2: im Dialog „Farben“ – Portal, Slot, Kategorie (Farbregel, Zeichen), Vorrang, Regelübersicht
  colors: [
    {
      id: 'intro',
      title: 'Farben eines Portals',
      text: `${TINT_TEXT.short} Diese kurze Tour zeigt dir, was du hier einstellst – mit → weiter, mit Esc beenden.`,
    },
    {
      id: 'portal',
      title: 'Dieses Portal',
      target: `${K} section[aria-labelledby="colors-portal"]`,
      text: 'Rahmen = farbige Linie um das Portal, Akzent = Leuchten, Portalname und Hervorhebungen. „Wie Slot“ übernimmt die Farbe von darunter; „Eigene Farbe“ erlaubt jede Farbe.',
    },
    {
      id: 'slot',
      title: 'Dieser Slot',
      target: `${K} section[aria-labelledby="colors-slot"]`,
      text: `${TINT_TEXT.slotNote} Die Farbe hängt am Namen des Slots – sie bleibt, auch wenn du Portale tauschst.`,
    },
    {
      id: 'category',
      title: 'Kategorie',
      target: `${K} #colors-cat`,
      text: `${CATEGORY_TEXT.intro} Hier ordnest du das Portal einer Kategorie zu oder legst mit „Neue Kategorie …“ eine an.`,
    },
    {
      id: 'catColors',
      title: 'Farbregel der Kategorie',
      target: `${K} .colors__row:has(#colors-cf)`,
      text: 'Diese Farben gelten für alle Portale der Kategorie auf allen Desks – z. B. alle Editoren mit grünem Rahmen. So entsteht eine Farbregel.',
    },
    {
      id: 'catNone',
      title: 'Farbregel der Kategorie',
      unless: `${K} #colors-cf`,
      text: 'Sobald das Portal eine Kategorie hat, erscheinen hier ihre Rahmen- und Akzentfarbe und ihr Zeichen. Die Farben gelten dann für alle Portale der Kategorie auf allen Desks – z. B. alle Editoren mit grünem Rahmen.',
    },
    {
      id: 'icon',
      title: 'Zeichen der Kategorie',
      target: `${K} .colors__icons`,
      text: 'Das Zeichen steht vor dem Kategorienamen – im Portal, in der Library und in den Regeln. „Vorschlag“ wählt es nach dem Namen; Pfeiltasten wählen ein anderes.',
    },
    {
      id: 'order',
      title: 'Was gilt, wenn mehreres passt?',
      text: 'Vorrang hat immer das Nächste: erst das Portal, dann der Slot, dann die Kategorie, zuletzt der Desk. „Alles wie Desk“ oben löscht die Farben von Portal und Slot auf einmal.',
    },
    {
      id: 'rules',
      title: 'Regelübersicht',
      text: `Alle Farbregeln stehen auch im Cockpit unter „Regeln“ – mit einem Satz je Regel. Ein Häkchen schaltet eine Regel aus, ohne sie zu löschen. Wieder starten: Knopf „Tour“ im Dialog, Hilfe (?) oder Suche („Tour Farben“).`,
      action: 'Regeln zeigen',
    },
  ],
  // F-202 Stufe 4: alle Stellen, an denen man einstellt, wie sich eine Source verhält und wie sie angezeigt wird
  sources: [
    {
      id: 'intro',
      title: 'Verhalten von Sources einstellen',
      text: 'Diese Tour zeigt alle Stellen, an denen du festlegst, wie sich eine Source verhält und wie sie aussieht – mit → weiter, mit Esc beenden.',
    },
    {
      id: 'pauseSign',
      title: 'Pause-Zeichen am Tab',
      target: `${P} .tab__pause`,
      text: 'Steht hinten am Tab vor dem ×. Schlicht = pausiert nach der eingestellten Zeit, hervorgehoben = gerade pausiert, rot durchgestrichen = pausiert nie. Ein Klick öffnet ein kleines Menü:',
      list: [PAUSE_TEXT.keepTabMenu + ' – nur dieser Tab', 'Source nie pausieren – überall, wo diese Seite offen ist', PAUSE_TEXT.keepPanelMenu + ' – alle Tabs dieses Portals', 'Jetzt pausieren und die Zeit einstellen'],
    },
    {
      id: 'star',
      title: 'Stern in der Adresszeile',
      target: `${P} .win__star`,
      text: 'Speichert die Source in der Library oder bearbeitet sie (gefüllter Stern = schon gespeichert): Titel, Kategorie, Tags, Notiz, „Nie pausieren“ und in welchen Portalen sie in der Library steht.',
    },
    {
      id: 'library',
      title: 'Library dieses Portals',
      target: `${P} .win__coll`,
      text: 'Oben schaltet das Rad zwischen „Sources“ und „Notizen“ (die Notizen zu diesem Portal). Unter „Sources“ stehen die Sources dieses Portals, mit „Alle“ die ganze Library. Das Pause-Zeichen vorne an jeder Source schaltet „nie pausieren“ um (rot = nie); mit Haken stellst du mehrere auf einmal ein. Der Stern je Zeile nimmt eine Source in dieses Portal auf, ✎ bearbeitet sie.',
    },
    {
      id: 'cockpit',
      title: 'Alle Sources im Cockpit',
      target: '.toolbar .focus-meter',
      text: 'Ein Klick auf die Fokusanzeige öffnet das Cockpit. Unter „Library“ stehen alle Sources nach Kategorie – mit Suchfeld, Pause-Zeichen je Zeile und Haken für mehrere auf einmal. Oben dasselbe Rad „Sources · Notizen“ wie im Portal.',
    },
    {
      id: 'colors',
      title: 'Kategorie und Farben',
      target: `${P} button[aria-label="Portal-Optionen"]`,
      text: `Unter ⋮ › „${TINT_TEXT.menu}“ ordnest du das Portal einer Kategorie zu. ${CATEGORY_TEXT.intro} Farbe und Zeichen der Kategorie erscheinen am Portal, in der Library und in der Suche.`,
    },
    {
      id: 'launcher',
      title: 'Seiten, die sich nicht einbetten lassen',
      target: '.toolbar button[aria-label^="Launcher"]',
      text: 'Manche Seiten verbieten das Anzeigen in einem Portal. Solche Sources landen von selbst im Launcher und öffnen außerhalb – in neuem Tab oder neuem Fenster, das wählst du im Launcher (Strg/⌘+Klick nimmt das andere). Im Portal hilft „Trotzdem hier versuchen“.',
    },
    {
      id: 'settings',
      title: 'Einstellungen',
      target: 'button[aria-label="Einstellungen"]',
      text: 'Im Zahnrad stellst du ein, nach wie viel Zeit Unbenutztes pausiert, und ob vor jeder Source das Symbol ihrer Webseite steht (sonst der Anfangsbuchstabe).',
    },
    {
      id: 'again',
      title: 'Tour wieder starten',
      text: 'Diese Tour findest du jederzeit in der Hilfe (?) und in der Suche („Tour Sources“).',
    },
  ],
  // F-217 (V98): Notizen & Aufgaben am Desk (F-206 Schritte 3–8); Schritte ohne Ziel (kein Pad offen …) entfallen
  notes: [
    {
      id: 'intro',
      title: 'Notizen & Aufgaben',
      text: 'Eine Notiz ist ein eigenes Ding: Du siehst sie im Notizblock, in einer To-do-Liste, auf einem Kanban-Board oder in der Eisenhower-Matrix – überall dieselbe Notiz. Diese Tour zeigt, wo du was findest. Mit → weiter, mit Esc beenden.',
    },
    {
      id: 'button',
      title: 'Der Knopf',
      target: '.toolbar .tb-nt',
      text: 'Neues Pad, Platz wählen (Lageplan), Notiz suchen, das Rad „Pads“ (Verteilt · Im Dock · Ausgeblendet), Im Cockpit ordnen und die Deckkraft. Alt/⌥+N öffnet das Menü; die Zahl zeigt Pads, die gerade nicht zu sehen sind.',
    },
    {
      id: 'pad',
      title: 'Pad',
      target: '.pad:not(.pad--docked)',
      text: 'Ein Pad schwebt über dem Desk, nie über der Main Stage. Am Kopf ziehen versetzt es, Alt+Pfeil per Tastatur, Alt+Umschalt+Pfeil ändert die Größe.',
    },
    {
      id: 'sheets',
      title: 'Sheets',
      target: '.pad .pad__tabs',
      text: 'Jedes Pad hat Reiter – die Sheets: Notizblock, To-do-Liste, Kanban-Board, Eisenhower-Matrix. Mit + legst du eins an; F2 benennt um. Eine Notiz lässt sich in mehreren Sheets zeigen.',
    },
    {
      id: 'sources',
      title: 'Quellen',
      target: '.pad .srcs:not(.people)',
      text: 'Verbindet die Notiz mit Seiten – auch mit einer Stelle darin (Minute im Video, Seite im PDF). „+ Quelle“ oder Alt/⌥+Q, oder einen Portal-Reiter hierher ziehen. Ein Klick öffnet die Seite an der Stelle.',
    },
    {
      id: 'people',
      title: 'Zuständig und Aufwand',
      target: '.pad .people',
      text: 'Wer die Aufgabe erledigt und wie viele Stunden sie braucht. Neue Notizen gehören erst dir. Alt/⌥+Z wählt; in Listen und Boards Z, Umschalt+Z und Q für „Nur meine“.',
    },
    {
      id: 'dock',
      title: 'Dock',
      target: '.dock',
      text: 'Die Leiste am rechten Rand für Pads, die immer griffbereit sein sollen. Die anderen Slots rücken dafür zusammen, die Main Stage bleibt gleich breit.',
    },
    {
      id: 'mode',
      title: 'Desk | Notizen',
      target: '.toolbar .tb-mode',
      text: '„Notizen“ legt die Pads dieses Desks wie Slots nebeneinander – eine Arbeitsfläche nur für Notizen. „Desk“ bringt die Portale zurück.',
    },
    {
      id: 'portalNotes',
      title: 'Notizen am Portal',
      target: 'main .win__notes',
      text: 'Hat eine Seite Notizen, zeigt der Portal-Kopf das Zeichen mit Zahl. Ein Klick listet sie; Enter öffnet im Pad, „Neue Notiz zu dieser Seite“ legt eine verknüpfte an.',
    },
    {
      id: 'focusLine',
      title: 'Fokus-Zeile',
      target: '.toolbar .focusline',
      text: 'Wie viel Arbeit diese Woche auf dir liegt, gegen deine Zeit, z. B. „32 / 40 h“ – ruhig, gelb ab 80 %, rot über 100 %. Ein Klick öffnet den Fokus im Cockpit.',
    },
    {
      id: 'cockpit',
      title: 'Ordnen im Cockpit',
      text: 'Im Cockpit unter „Notizen“ siehst du alle Pads und Sheets aller Desks, unter „Personen“ wer wie viel Zeit hat. F6 springt reihum durch Kopfleiste, Slots, Dock und Pads.',
    },
    {
      id: 'again',
      title: 'Tour wieder starten',
      text: 'Diese Tour findest du im Menü „Notizen & Aufgaben“, in der Hilfe (?) und in der Suche („Tour Notizen“).',
    },
  ],
  // F-217 (V98): Main Stage (F-207 Stufe 1, F-206 Schritt 9)
  stage: [
    {
      id: 'intro',
      title: 'Main Stage',
      text: 'Die Main Stage ist der Slot, auf den du schaust und aus dem du arbeitest. Je Desk gibt es eine. Pads und Dock liegen nie darüber. Mit → weiter, mit Esc beenden.',
    },
    {
      id: 'spot',
      title: 'Scheinwerfer',
      target: 'main .win__stagebtn',
      text: 'Ein Klick macht diesen Slot zur Main Stage; eine neue löst die alte ab, „Rückgängig“ steht direkt daneben. Ohne Stage erscheint der Scheinwerfer, wenn du über den Portal-Kopf fährst oder mit Tab hinkommst.',
    },
    {
      id: 'cone',
      title: 'Lichtkegel',
      target: 'main .win__cone',
      text: 'So erkennst du die Stage: Lichtkegel in der Akzentfarbe und das Wort „Stage“ am Scheinwerfer. Im Kontrastmodus steht stattdessen ein Rahmen.',
    },
    {
      id: 'menu',
      title: 'Im Menü ⋮',
      target: `${P} button[aria-label="Portal-Optionen"]`,
      text: '„Auf die Main Stage“ schaltet um – auch ohne Maus und auf Touch-Geräten. „Main Stage …“ öffnet die Einstellungen.',
    },
    {
      id: 'settings',
      title: 'Main Stage …',
      text: 'Ein Klick auf den Scheinwerfer der Stage öffnet die Einstellungen am Ort:',
      list: [
        'Im Layout: Frei · Fest – fest heißt: nicht ziehen, nicht tauschen, nicht verschieben, nicht schließen',
        'Mindestgröße: kleiner lässt sich die Stage nicht ziehen („Heutige Größe nehmen“)',
        'Auf allen Desks: kommt später',
        'Von der Main Stage nehmen',
      ],
    },
    {
      id: 'pads',
      title: 'Pads und Dock',
      text: 'Neue Pads legen sich neben die Stage; ziehst du eins darüber, springt es zurück. Der Lageplan sperrt Plätze über der Stage. Öffnet sich das Dock, rücken nur die anderen Slots zusammen.',
    },
    {
      id: 'cockpit',
      title: 'Im Cockpit',
      text: 'Unter „Portale“ macht die Taste S einen Slot zur Main Stage – auch auf anderen Desks. Der Scheinwerfer im Radar zeigt, wo sie ist.',
    },
    {
      id: 'source',
      title: 'Quellen aus Notizen',
      text: 'Klickst du in einer Notiz auf eine Quelle, die nirgends offen ist, öffnet sie in der Main Stage.',
    },
    {
      id: 'again',
      title: 'Tour wieder starten',
      text: 'Diese Tour findest du in „Main Stage …“, in der Hilfe (?) und in der Suche („Tour Main Stage“).',
    },
  ],
  // V106 (F-225 Rest, F-217): Projekt-Modus – Liste, Ansichten, Steckbrief, Instanzen, Meldungen
  projects: [
    {
      id: 'intro',
      title: 'Projekte',
      text: 'Der Projekt-Modus zeigt deine Projekte wie die Projektübersicht in MS Project bzw. iTaskX – aufgebaut nach IPMA ICB4. Diese Tour zeigt, wo du was findest. Mit → weiter, mit Esc beenden.',
    },
    {
      id: 'list',
      title: 'Projektliste',
      target: `${PJ} .pj__table`,
      text: 'Name (Unterprojekte eingerückt), Zustand, Termine, Fortschritt, Vorgänge, Aufwand, Meilensteine und Verzug. Pfeile wählen ein Projekt, F2 benennt um, Entf löscht – mit Rückgängig am Ort.',
    },
    {
      id: 'views',
      title: 'Ansicht',
      target: `${PJ} .pj__viewwheel`,
      text: 'Das Rad wählt, was rechts zum gewählten Projekt steht: Steckbrief, PSP (Projektstrukturplan), Gantt (Balkenplan), Risiken, Änderungen, Entscheidungen (Nutzwertanalyse) und Meldungen. Maus darüber und scrollen oder klicken; mit der Tastatur Pfeile.',
    },
    {
      id: 'brief',
      title: 'Steckbrief',
      target: `${PJ} .pj__brief`,
      text: 'Ziel, Termine, Budget und Organisation des Projekts – wie der Projektsteckbrief nach IPMA ICB4. Darüber steht, welche Angaben noch fehlen.',
    },
    {
      id: 'roles',
      title: 'Instanzen',
      target: `${PJ} .pj__roles`,
      text: 'Instanzen sind die Stellen, an die Meldungen zum Projekt gehen – ab Werk Projektleitung, Lenkungskreis und Auftraggeber. Du kannst sie umbenennen, bis zu 12 anlegen und je eine Person oder ein Team zuordnen.',
    },
    {
      id: 'report',
      title: 'Etwas melden',
      target: '.toolbar .tb-fb',
      text: 'Ein Problem, ein Wunsch oder eine Frage zum Projekt? Knopf „Feedback“ oder Alt/⌥+F: Im Projekt-Modus zeigt das Rad „An“ schon das gewählte Projekt, das Rad „Instanz“ wählt, wer die Meldung bekommt.',
    },
    {
      id: 'inbox',
      title: 'Meldungen',
      target: `${PJ} .pj__viewwheel`,
      text: 'Unter Ansicht › „Meldungen“ stehen alle Meldungen an dieses Projekt; die Zahl am Rad zeigt neue. Mit der Befugnis „Feedback bearbeiten“ (Cockpit „Personen“) siehst du sie als Board und stellst über „Formular einstellen“ ein, welche Felder das Formular zeigt und welche Pflicht sind.',
    },
    {
      id: 'steer',
      title: 'Risiken und Änderungen',
      target: `${PJ} .pj__viewwheel`,
      text: 'Unter Ansicht › „Risiken“ und „Änderungen“ steuerst du das Projekt nach IPMA ICB4: Risiken mit Bewertung (W × A) und Risikomatrix, Änderungsanträge mit Auswirkung auf Termin, Kosten, Leistung und Umfang. Sie zählen nicht als Vorgänge. Aus einer Meldung wird eins mit „Wird zu …“ in ihrer Karte.',
    },
    {
      id: 'add',
      title: 'Neues Projekt',
      target: '#pj-add',
      text: '„+ Projekt“ legt ein Projekt an – auf Wunsch als Unterprojekt. Ähnliche Namen zeigt E-Sources schon beim Tippen.',
    },
    {
      id: 'again',
      title: 'Tour wieder starten',
      target: `${PJ} .pj__tour`,
      text: 'Über den Knopf „Tour“ hier oben, die Hilfe (?) oder die Suche („Tour Projekte“) startest du diese Tour jederzeit wieder.',
    },
  ],
  // V104 (F-217): Cockpit „Feedback“ (F-221) – Anwender sehen „Meine Meldungen“, mit „Bearbeitung“ das Board
  feedback: [
    {
      id: 'intro',
      title: 'Feedback',
      text: 'Hier stehen alle deine Meldungen – Fehler, Wünsche, Fragen und Lob. Neue meldest du mit dem Knopf „Feedback“ oben neben „?“ oder Alt/⌥+F, direkt an der Stelle, um die es geht. Mit → weiter, mit Esc beenden.',
    },
    {
      id: 'filter',
      title: 'Filtern und suchen',
      target: `${C}.is-feedback .fbb__bar`,
      text: 'Die Räder zeigen nur eine Art (Fehler, Wunsch, Frage, Lob) oder einen Schweregrad – wie stark etwas die Arbeit stört: stört kaum, behindert, blockiert. Die Suche findet Titel und Text.',
    },
    {
      id: 'list',
      title: 'Meine Meldungen',
      target: `${C}.is-feedback .fbb__mine`,
      text: 'Die neueste steht oben, mit Art, Schweregrad und Datum. „2 offen“ heißt: Zwei Angaben könnten noch helfen. Pfeile hoch/runter wandern, Entf löscht – mit Rückgängig direkt über der Liste.',
    },
    {
      id: 'board',
      title: 'Board (Bearbeitung)',
      target: `${C}.is-feedback .fbb__board`,
      text: 'Mit „Bearbeitung“ siehst du die Meldungen als Board wie Kanban: Neu, Gesichtet, Geplant, Erledigt, Verworfen. Ziehen oder Alt/⌥+Pfeil links/rechts verschiebt, Verworfen fragt am Ort nach dem Grund.',
    },
    {
      id: 'card',
      title: 'Genauer beschreiben',
      target: `${C}.is-feedback .fbb__card`,
      text: 'Klick oder Enter öffnet die Meldung: Was ist passiert, was hast du erwartet, warum ist es wichtig? „Noch offen: …“ springt zu den Feldern, die noch fehlen. Bilder hängst du an oder fügst sie mit Strg/⌘+V ein. Alles speichert von selbst.',
    },
    {
      id: 'file',
      title: 'Als Datei speichern',
      target: `${C}.is-feedback .fbb__file`,
      text: 'Speichert deine Meldungen als zwei Dateien in den Downloads – Markdown zum Lesen und JSON zum Weitergeben. So kommen sie zu uns.',
    },
    {
      id: 'triage',
      title: 'Bearbeitung',
      target: `${C}.is-feedback .fbb__triage`,
      when: `${C}.is-feedback .fbb__triage`,
      text: 'Nur mit der Befugnis „Feedback bearbeiten“ (Cockpit „Personen“): zeigt das Board mit dem Zustand und in den Karten Zustand, Bezüge, Vermerke und „Behoben in“. Gilt nur auf diesem Gerät.',
    },
    {
      id: 'again',
      title: 'Tour wieder starten',
      target: `${C} .overview__restart`,
      text: 'Über den Knopf „Tour“ im Cockpit „Feedback“, die Hilfe (?) oder die Suche („Tour Feedback“) startest du diese Tour jederzeit wieder. Esc schließt das Cockpit.',
    },
  ],
  // V54: Werkbank des Entwickler-Modus (F-200 Stufe 2) mit „Untersuchen“ (F-200 e)
  dev: [
    {
      id: 'intro',
      title: 'Entwickler-Modus',
      target: V,
      text: 'Dieses Portal ist jetzt eine Werkbank für Entwickler und Designer: Terminal-Look und eine eigene Leiste unter der Kopfzeile. Mit → weiter, mit Esc beenden.',
    },
    { id: 'device', title: 'Gerät', target: `${V} .devbar__field`, text: DEV_TEXT.deviceTitle + ' Der Slot wächst dabei auf das Seitenverhältnis des Geräts.' },
    { id: 'turn', title: 'Drehen', target: `${V} .devbar__turn`, text: 'Wechselt zwischen Hoch- und Querformat des gewählten Geräts. Die Beschriftung zeigt die aktuelle Lage.' },
    { id: 'scale', title: 'Zoom-Test', target: `${V} .devbar__scales`, text: DEV_TEXT.scaleTitle },
    { id: 'size', title: 'Maße', target: `${V} .devbar__size`, text: 'So groß ist die Seite in CSS-Pixeln – danach richten sich ihre Media Queries. Dahinter die Geräteklasse (Smartphone, Tablet, Laptop …). Der Tooltip nennt auf Retina-Bildschirmen auch die Bildschirmpunkte, so groß wird ein Screenshot.' },
    { id: 'end', title: 'Lineal und Beenden', target: `${V} .devbar__end`, text: '„Lineal“ legt Maßstäbe an den Rand der Seite. „Beenden“ schaltet den Entwickler-Modus aus – Zoom und Design kommen zurück.' },
    { id: 'inspect', title: 'Code untersuchen', target: `${V} .win__body`, text: DEV_TEXT.inspect },
    {
      id: 'again',
      title: 'Tour wieder starten',
      text: 'Diese Tour findest du jederzeit in der Hilfe (?) und in der Suche („Tour Entwickler“).',
    },
  ],
  // V59: Abgleich einrichten (F-169 f) – läuft im Dialog; vor dem Verbinden die drei Schritte, danach Zustand und Knöpfe
  sync: [
    { id: 'intro', title: 'Abgleich einrichten', text: ST.intro },
    { id: 'account', title: '1. GitHub-Konto', target: `${Y} .sync__steps > li:nth-child(1)`, text: ST.account },
    { id: 'token', title: '2. Schlüssel anlegen', target: `${Y} .sync__steps > li:nth-child(2)`, text: ST.token },
    { id: 'paste', title: '3. Einfügen und verbinden', target: `${Y} .sync__form`, text: ST.paste },
    { id: 'privacy', title: 'Datenschutz', target: `${Y} .sync__privacy`, text: ST.privacy },
    { id: 'manual', title: 'Ohne GitHub', target: `${Y} .sync__manual`, text: ST.manual },
    { id: 'state', title: 'Zustand', target: `${Y} .sync__state`, text: ST.state },
    { id: 'buttons', title: 'Abgleichen, ansehen, trennen', target: `${Y} .sync__btns`, text: ST.buttons },
    { id: 'devices', title: 'Weitere Geräte', text: ST.devices },
    { id: 'again', title: 'Tour wieder starten', text: ST.again },
  ],
};

/** Starttour (F-95) – bleibt für bestehende Stellen erhalten. */
export const TOUR = TOURS.start;

/** Nur Schritte, deren Ziel es gerade gibt (Schritte ohne Ziel immer). */
export function tourSteps(has: (selector: string) => boolean, steps: TourStep[] = TOUR): TourStep[] {
  return steps.filter((s) => (!s.target || has(s.target)) && (!s.when || has(s.when)) && (!s.unless || !has(s.unless)));
}

/** Speicherschlüssel je Tour; die Starttour behält ihren bisherigen Schlüssel. */
export const TOUR_KEY: Record<TourId, string> = { start: 'esource.tour.v1', cockpit: 'esource.tour.cockpit.v1', design: 'esource.tour.design.v1', import: 'esource.tour.import.v1', colors: 'esource.tour.colors.v1', send: 'esource.tour.send.v1', sources: 'esource.tour.sources.v1', dev: 'esource.tour.dev.v1', sync: 'esource.tour.sync.v1', notes: 'esource.tour.notes.v1', stage: 'esource.tour.stage.v1', feedback: 'esource.tour.feedback.v1', projects: 'esource.tour.projects.v1' };

/** Wurde die Tour schon gezeigt (beendet oder übersprungen)? */
export function tourSeen(id: TourId = 'start'): boolean {
  try {
    return localStorage.getItem(TOUR_KEY[id]) === 'done';
  } catch {
    return true; // ohne Speicher nicht bei jedem Start aufdrängen
  }
}

export function setTourSeen(seen = true, id: TourId = 'start'): void {
  try {
    if (seen) localStorage.setItem(TOUR_KEY[id], 'done');
    else localStorage.removeItem(TOUR_KEY[id]);
  } catch {
    // ohne Speicher: nichts zu merken
  }
}

/** F-173: Touren von selbst starten? (Grundeinstellung an; von Hand starten geht immer.) */
const AUTO_KEY = 'esource.tours.auto';

export function toursAuto(): boolean {
  try {
    return localStorage.getItem(AUTO_KEY) !== 'off';
  } catch {
    return false;
  }
}

export function setToursAuto(on: boolean): void {
  try {
    if (on) localStorage.removeItem(AUTO_KEY);
    else localStorage.setItem(AUTO_KEY, 'off');
  } catch {
    // ohne Speicher: nichts zu merken
  }
}

/** F-173: Startet diese Tour jetzt von selbst? */
export const tourAutoStart = (id: TourId): boolean => toursAuto() && !tourSeen(id);

/**
 * F-197: Tour „Öffnen in einrichten“ – die Schritte für den erkannten Browser; unbekannter Browser:
 * alle Wege als Liste. Ohne Ziele (mittig), weil man dabei zwischen E-Sources und Browser wechselt.
 */
export function sendTour(browser: BrowserName | null, mod: string): TourStep[] {
  const all = browserSend(mod);
  const b = browser ? all[browser] : null;
  const each = (k: 'manager' | 'import' | 'bar') => (Object.keys(all) as BrowserName[]).map((n) => `${n}: ${all[n][k]}`);
  return [
    {
      id: 'intro',
      title: '„Öffnen in“ einrichten',
      text: `Ein Lesezeichen in der Leiste deines Browsers schickt jede offene Seite mit einem Klick an E-Sources – mit unserem Symbol. Das richtest du einmal ein, in etwa einer Minute.${browser ? ` Die Schritte passen zu ${browser}.` : ''} Mit → weiter, mit Esc beenden.`,
    },
    {
      id: 'file',
      title: '1. Datei laden',
      text: 'Lade die Datei „E-Sources-senden.html“. Sie enthält das Lesezeichen mit Symbol und landet im Ordner „Downloads“. Danach mit „Weiter“ zum nächsten Schritt.',
      action: 'Datei laden',
      keep: true,
    },
    {
      id: 'manager',
      title: '2. Lesezeichen-Manager öffnen',
      text: b ? b.manager : 'Öffne die Lesezeichen-Verwaltung deines Browsers:',
      list: b ? undefined : each('manager'),
      action: b?.address ? 'Adresse kopieren' : undefined,
      keep: true,
    },
    {
      id: 'import',
      title: '3. Datei importieren',
      text: b ? b.import : 'Dort die Datei importieren:',
      list: b ? undefined : each('import'),
    },
    {
      id: 'bar',
      title: '4. In die Leiste ziehen',
      text: b ? b.bar : 'Danach das Lesezeichen in die Leiste ziehen:',
      list: b ? undefined : each('bar'),
    },
    {
      id: 'try',
      title: 'Ausprobieren',
      text: 'Öffne irgendeine Webseite im Browser und klick in der Leiste auf „Öffnen in“. Ein kleines Fenster zeigt, in welches Portal die Seite kommt, und sendet nach 10 Sekunden von selbst. Wieder starten: Einstellungen (Zahnrad) › „Anleitung“, Hilfe oder Suche („Öffnen in einrichten“).',
    },
  ];
}

/** F-203: Touren aus jedem Bauteil starten (App hört auf das Ereignis). */
export const TOUR_EVENT = 'esource:tour';
let requestedAuto = false;
/** V106: Wurde die zuletzt angeforderte Tour von selbst gestartet (zeigt „Nicht mehr automatisch anzeigen“)? */
export const tourRequestedAuto = (): boolean => requestedAuto;
export function requestTour(id: TourId, auto = false): void {
  requestedAuto = auto;
  window.dispatchEvent(new CustomEvent<TourId>(TOUR_EVENT, { detail: id }));
}

/**
 * F-203: Eine Tour einmalig anbieten, wenn man ihr Thema zum ersten Mal berührt – nur wenn Touren
 * von selbst starten dürfen und sie noch nicht gesehen ist. Gibt true zurück, wenn jetzt angeboten wird.
 */
export function offerTourOnce(id: TourId): boolean {
  if (!tourAutoStart(id)) return false;
  const key = `esource.tour.offered.${id}`;
  try {
    if (localStorage.getItem(key)) return false;
    localStorage.setItem(key, '1');
  } catch {
    return false;
  }
  return true;
}
