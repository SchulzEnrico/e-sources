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

export type TourId = 'start' | 'cockpit' | 'design' | 'import' | 'colors' | 'send' | 'sources' | 'dev' | 'sync';

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
    { id: 'newSlot', title: '+ NewSlot', target: '.tb-center .tb-add, .tb-center .tb-newslot', text: t('newSlot') },
    { id: 'view', title: 'View', target: '.tb-center .tb-viewwheel', text: t('view') },
    { id: 'search', title: 'Suchen', target: '.tb-center .search', text: t('search') },
    { id: 'focus', title: 'Fokusanzeige', target: '.toolbar .focus-meter', text: `${t('focus')} Ein Klick öffnet das Cockpit (Strg/⌘+.) – dort gibt es eine eigene kurze Tour.` },
    { id: 'design', title: 'Design', target: '.toolbar .tb-design', text: `${t('design')} Der Knopf öffnet „Design anpassen“ – mit eigener kurzer Tour.` },
    { id: 'help', title: 'Hilfe', target: '.toolbar .tb-help', text: 'Alle Funktionen und Tastenkürzel findest du hier oder mit der Taste ?. Dort kannst du auch diese Tour wieder starten.' },
  ],
  cockpit: [
    {
      id: 'cockpit',
      title: 'Das Cockpit',
      text: `${t('cockpit')} Diese kurze Tour zeigt dir, was du hier siehst und tun kannst – mit → weiter, mit Esc beenden.`,
    },
    {
      id: 'focus',
      title: 'Fokusanzeige',
      target: `${C} .overview__info`,
      text: `${t('focus')} Grün heißt: gut überschaubar, Gelb: es wird voll, Rot: zu viel auf einmal.`,
    },
    {
      id: 'modes',
      title: 'Portale, Layouts, Library',
      target: `${C} .overview__mode`,
      text: 'Hier schaltest du um, was das Cockpit zeigt: „Portale“ ist der Überblick mit Radar, „Layouts“ die gespeicherten Anordnungen dieses Desks mit ihren Cases, „Library“ deine gespeicherten Sources. Das Rad dreht mit Scrollen, Klick oder Pfeiltasten. Die Tour zeigt, was gerade offen ist.',
    },
    {
      id: 'radar',
      title: 'Radar',
      target: `${C} .radar__maps`,
      text: 'Jeder Desk erscheint als kleiner Bildschirm mit seinen Slots an ihrer Stelle. Die Leiste in jedem Slot zeigt in Ampelfarben, wie viele Portale darauf liegen. Pfeiltasten wandern zwischen den Slots.',
    },
    {
      id: 'portals',
      title: 'Portale des Slots',
      target: `${C} .radar__detail`,
      text: 'Rechts stehen die Portale des gewählten Slots. Enter oder Klick zeigt das Portal – auch auf einem anderen Desk. F2 benennt um, Entf schließt.',
    },
    {
      id: 'move',
      title: 'Verschieben und Holen',
      target: `${C} .overview__list .overview__row`,
      text: 'V verschiebt ein Portal auf einen anderen Slot oder Desk, Umschalt+V den ganzen Slot. H holt ein Portal von einem anderen Desk hierher. Mit der Maus ziehst du eine Zeile auf einen Slot im Radar.',
    },
    {
      id: 'arrange',
      title: 'Slots anordnen',
      target: `${C} .radar__map:not(.lc__map)`,
      text: 'Eine Slot-Kachel auf eine andere ziehen: in die Mitte = dort ablegen, an den Rand = an dieser Stelle einsetzen. Die Kante zwischen zwei Slots ändert die Größe. Per Tastatur: Alt+Pfeil versetzt, Alt+Umschalt+Pfeil ändert die Größe.',
    },
    {
      id: 'filter',
      title: 'Filtern',
      target: `${C} .radar__filter`,
      text: 'Findet Portale, Slots, Desks und Sources auf allen Desks. Pfeil runter springt in die Treffer.',
    },
    // V56/F-116: nur im Modus „Layouts“ (sonst fehlen die Ziele und die Schritte entfallen)
    {
      id: 'layouts',
      title: 'Layouts',
      target: `${C} .lc__cards`,
      text: `${DESK_LAYOUT_TEXT.term}. Ein Klick auf eine Karte zeigt das Layout nur an; erst „Wechseln“ baut den Desk um. „Neues Layout“ legt eins an – leer oder als Kopie.`,
    },
    {
      id: 'layoutActions',
      title: 'Aktionen des Layouts',
      target: `${C} .lc__actions`,
      text: 'Direkt unter den Karten steht, was du mit dem gewählten Layout tun kannst: wechseln, umbenennen, kopieren, löschen (mit Rückfrage und Rückgängig). Rechts daneben seine Cases.',
    },
    {
      id: 'cases',
      title: 'Spaces und Cases',
      target: `${C} .lc__cases--inline`,
      text: `${CASE_TEXT.spaceTerm} ${CASE_TEXT.caseTerm} Über „${CASE_TEXT.manage}“ legst du beides an; „${CASE_TEXT.assign}“ ordnet dieses Layout zu. Gibt es Cases, kannst du oben unter „${CASE_TEXT.pick}“ einen wählen – auch über die Suche.`,
    },
    {
      id: 'preview',
      title: 'Vorschau für ein Gerät',
      target: `${C} .lc__prevhead`,
      text: `${DESK_LAYOUT_TEXT.deviceTerm}. Steht dort nicht dieses Gerät, ist das Bild orange gepunktet umrandet; „${DESK_LAYOUT_TEXT.thisDevice}“ holt es zurück.`,
    },
    {
      id: 'slots',
      title: 'Slots ordnen',
      target: `${C} .lc__side`,
      text: 'Neben dem Bild legst du Slots an und verteilst sie gleichmäßig. Wähle einen Slot im Bild (Klick oder Pfeile), dann kannst du ihn mit einem anderen tauschen oder schließen – seine Portale kommen in den Nachbar-Slot.',
    },
    {
      id: 'rules',
      title: 'Regeln',
      target: `${C} .overview__rules`,
      text: 'Zeigt alles, was E-Sources von selbst tut – Farbregeln je Kategorie, Seite → Kategorie und eingebaute Regeln wie „Nach der Kategorie fragen“. Ein Häkchen schaltet eine Regel ein oder aus; ändern und löschen geht hier auch.',
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
      text: 'Hell, Dunkel oder „Wie System“ – dann folgt E-Sources der Einstellung deines Geräts. Dazu gibt es zwei Stile im Look älterer Windows-Versionen.',
    },
    {
      id: 'accent',
      title: 'Akzentfarbe',
      target: `${D} .design__accent .look__swatches`,
      text: 'Die Akzentfarbe färbt Knöpfe, Rahmen und Markierungen. Ein Klick auf einen Farbpunkt übernimmt sie sofort für alle Desks.',
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
      text: 'Zeigt die Sources dieses Portals, mit „Alle“ die ganze Library. Das Pause-Zeichen vorne an jeder Source schaltet „nie pausieren“ um (rot = nie); mit Haken stellst du mehrere auf einmal ein. Der Stern je Zeile nimmt eine Source in dieses Portal auf, ✎ bearbeitet sie.',
    },
    {
      id: 'cockpit',
      title: 'Alle Sources im Cockpit',
      target: '.toolbar .focus-meter',
      text: 'Ein Klick auf die Fokusanzeige öffnet das Cockpit. Unter „Sources“ stehen alle Sources nach Kategorie – mit Suchfeld, Pause-Zeichen je Zeile und Haken für mehrere auf einmal.',
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
export const TOUR_KEY: Record<TourId, string> = { start: 'esource.tour.v1', cockpit: 'esource.tour.cockpit.v1', design: 'esource.tour.design.v1', import: 'esource.tour.import.v1', colors: 'esource.tour.colors.v1', send: 'esource.tour.send.v1', sources: 'esource.tour.sources.v1', dev: 'esource.tour.dev.v1', sync: 'esource.tour.sync.v1' };

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
export function requestTour(id: TourId): void {
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
