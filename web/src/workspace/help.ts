/**
 * F-156: Eine Liste aller Funktionen und Begriffe – Quelle für Hilfe (?), Suche und später die
 * Tour (F-95). Begriffe kommen aus TERMS (F-154), damit jeder Text nur an einer Stelle steht.
 * Funktionen mit `run` lassen sich aus der Suche ausführen (Enter); Umschalt+Enter öffnet die Hilfe.
 */
import type { BrowserName } from './browser';
import { DESK_LAYOUT_TEXT, DEV_TEXT, TERMS, TINT_TEXT } from './terms';

/** Was die Oberfläche ausführen kann; App.tsx ordnet jedem Wert die passende Aktion zu. */
export type HelpRun = 'help' | 'cockpit' | 'view' | 'adjust' | 'distribute' | 'maximize' | 'newSlot' | 'newDesk' | 'search' | 'tour' | 'tourCockpit' | 'design' | 'tourDesign' | 'tourColors' | 'toursAuto' | 'restore' | 'closed' | 'focusRule' | 'launcher' | 'importBookmarks' | 'exportBookmarks' | 'sortHelp' | 'tourImport' | 'tourSend' | 'tourSources' | 'profile' | 'reload' | 'collectDesks' | 'distributeDesks' | 'nextDesk' | 'rules' | 'compact' | 'favicons' | 'jackpot' | 'layouts' | 'limits' | 'devMode' | 'tourDev' | 'cases' | 'sendDesks' | 'loadDesks' | 'syncDesks';

export interface HelpEntry {
  id: string;
  /** Name, wie er in der Oberfläche steht. */
  name: string;
  /** Kurze Erklärung in einem Satz. */
  text: string;
  /** Tastenkürzel zum Anzeigen (Strg/⌘ = Windows/Mac). */
  keys?: string;
  /** Weitere Suchwörter (Alltagswörter, frühere Begriffe). */
  words?: string[];
  /** Kann aus der Suche ausgeführt werden. */
  run?: HelpRun;
  /** F-186: Fragen, wie Anwender sie stellen; erscheinen beim Tippen als Vorschläge (Hilfe, Suche). */
  questions?: string[];
  group: 'Begriffe' | 'Ansicht' | 'Anlegen' | 'Bedienung';
}

/** Begriffserklärung „Desk = …“ → nur der Teil nach dem Gleichheitszeichen. */
const def = (t: string) => {
  const x = t.replace(/^[^=]*=\s*/, '');
  return /[.!?]$/.test(x) ? x : `${x}.`;
};
const up = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export const HELP: HelpEntry[] = [
  // Begriffe – Aufbau: Desk → Slot → Stack → Portal → Tab; ein Portal zeigt eine Source
  { id: 'desk', group: 'Begriffe', name: 'Desk', text: up(def(TERMS.desk)), words: ['Fenster', 'Monitor', 'Bildschirm', 'Arbeitsfläche'], questions: ['Was ist ein Desk?', 'Wie nutze ich einen zweiten Monitor?'] },
  { id: 'slot', group: 'Begriffe', name: 'Slot', text: up(def(TERMS.slot)), words: ['Area', 'Platz', 'Raster', 'Bereich'], questions: ['Was ist ein Slot?'] },
  { id: 'stack', group: 'Begriffe', name: 'Stack', text: up(def(TERMS.stack)), keys: '▲/▼ · Mausrad', words: ['Stapel', 'übereinander', 'blättern'], questions: ['Was ist ein Stack?', 'Wie lege ich Portale übereinander?'] },
  { id: 'portal', group: 'Begriffe', name: 'Portal', text: up(def(TERMS.portal)), words: ['Panel', 'Rahmen', 'Adresszeile'], questions: ['Was ist ein Portal?'] },
  { id: 'source', group: 'Begriffe', name: 'Source', text: up(def(TERMS.source)), words: ['Webseite', 'Seite', 'Lesezeichen', 'Link'], questions: ['Was ist eine Source?'] },
  { id: 'library', group: 'Begriffe', name: 'Library', text: up(def(TERMS.library)), words: ['Lesezeichen', 'Sammlung', 'Favoriten'], questions: ['Wo finde ich meine Lesezeichen?'] },
  { id: 'launcher', group: 'Begriffe', name: 'Launcher', text: up(def(TERMS.launcher)) + ' Sources der Library landen von selbst darin, wenn sich ihre Seite nicht einbetten lässt. Öffnet sich direkt unter seinem Knopf; verschiebbar (Doppelklick auf den Kopf holt ihn zurück zum Knopf), schließt bei Klick daneben und lässt sich zu einem Symbol einklappen; in der Suche mit „neuer Tab“ gekennzeichnet.', keys: 'Alt/⌥+L', run: 'launcher', words: ['Ablage', 'nur im neuen Tab', 'gesperrt', 'extern', 'außerhalb', 'nicht einbettbar', 'Menü'], questions: ['Warum öffnet sich eine Seite in einem neuen Tab?', 'Warum lässt sich eine Seite nicht einbetten?'] },
  { id: 'dashboard', group: 'Begriffe', name: 'Dashboard', text: up(def(TERMS.dashboard)), keys: 'Esc', words: ['Übersicht', 'alle', 'Arbeitsfläche'], questions: ['Wie komme ich zurück zur Übersicht?'] },
  { id: 'focus', group: 'Begriffe', name: 'Fokusanzeige', text: up(def(TERMS.focus)) + ' Ein Portal zählt 1 Punkt, jeder weitere Tab 0,5; voreingestellt grün bis 9, gelb bis 13, orange bis 16, darüber rot. Änderbar unter „Fokusanzeige anpassen“.', words: ['Fokus', 'Ampel', 'Punkte', 'grün', 'gelb', 'rot', 'Gesamtfokus'], questions: ['Was bedeutet die Farbe der Fokusanzeige?', 'Warum ist die Fokusanzeige rot?'] },

  // Ansicht
  { id: 'cockpit', group: 'Ansicht', name: 'Cockpit', text: up(def(TERMS.cockpit)), keys: 'Strg/⌘+.', run: 'cockpit', words: ['Radar', 'Überblick', 'Fokus-Radar', 'Lagekarte'], questions: ['Wie sehe ich alle Portale auf einen Blick?'] },
  { id: 'view', group: 'Ansicht', name: 'View umschalten', text: 'Schaltet weiter: Dashboard → 2 × 2 → 2 → Solo. Esc führt zurück zum Dashboard.', run: 'view', words: ['Ansicht', 'Solo', 'zwei', 'vier', '2x2'], questions: ['Wie zeige ich nur ein oder zwei Portale?'] },
  { id: 'maximize', group: 'Ansicht', name: 'Portal maximieren', text: 'Zeigt das aktive Portal allein auf dem ganzen Desk (Knopf ⤢ im Portal). Esc führt zurück.', keys: 'M im Adjust', run: 'maximize', words: ['groß', 'Vollbild', 'Solo', 'ganzer Bildschirm'], questions: ['Wie mache ich ein Portal groß?'] },
  { id: 'search', group: 'Ansicht', name: 'Suchen', text: 'Findet Portale, Sources der Library und Funktionen. Pfeiltasten wählen, Enter öffnet, Umschalt+Enter zeigt die Hilfe.', keys: 'Strg/⌘+K oder /', run: 'search', words: ['finden', 'Suche'], questions: ['Wie finde ich eine Seite wieder?'] },
  { id: 'tour', group: 'Ansicht', name: 'Tour', text: 'Kurze Einführung, die Schritt für Schritt auf die wichtigsten Bedienelemente zeigt. Pfeiltasten blättern, Esc beendet.', run: 'tour', words: ['Einführung', 'Rundgang', 'erste Schritte', 'Anleitung'], questions: ['Wie fange ich an?', 'Gibt es eine Einführung?'] },
  { id: 'tourCockpit', group: 'Ansicht', name: 'Tour „Cockpit“', text: 'Kurze Einführung ins Cockpit: Fokusanzeige, Radar, Portale verschieben und holen. Startet beim ersten Öffnen des Cockpits von selbst.', run: 'tourCockpit', words: ['Cockpit-Tour', 'Einführung Cockpit', 'Radar erklärt', 'Rundgang'] },
  { id: 'tourDesign', group: 'Ansicht', name: 'Tour „Design“', text: 'Kurze Einführung in „Design anpassen“: Darstellung, Akzentfarbe, eigene Farbe und die Farben aller Slots und Portale des Desks; am Ende geht es weiter zur Tour „Farben“. Startet beim ersten Öffnen des Dialogs von selbst.', run: 'tourDesign', words: ['Design-Tour', 'Einführung Design', 'Farben erklärt', 'Rundgang'], questions: ['Wie funktionieren Design und Farben?'] },
  { id: 'tourColors', group: 'Ansicht', name: 'Tour „Farben“', text: 'Kurze Einführung in den Dialog „Farben“ eines Portals: eigene Farben für Portal und Slot, Kategorie mit Farbregel und Zeichen, was Vorrang hat und wo die Regelübersicht steht. Startet beim ersten Öffnen des Dialogs von selbst.', run: 'tourColors', words: ['Farben-Tour', 'Einführung Farben', 'Farbregel erklärt', 'Kategorie erklärt', 'Rundgang'], questions: ['Wie hängen Portal-, Slot- und Kategoriefarben zusammen?'] },
  { id: 'tourImport', group: 'Ansicht', name: 'Tour „Import“', text: 'Kurze Einführung, wie du Lesezeichen aus Chrome, Safari, Firefox oder Edge holst, wie fein die Ordner zu Kategorien werden und was die Sortierhilfe danach tut. Startet beim ersten Import von selbst.', run: 'tourImport', words: ['Import-Tour', 'Einführung Import', 'Lesezeichen übernehmen', 'Browser', 'Chrome', 'Safari', 'Firefox', 'Edge', 'Rundgang'], questions: ['Wie funktioniert der Import Schritt für Schritt?'] },
  { id: 'devMode', group: 'Ansicht', name: 'Entwickler-Modus', text: 'Schaltet für das aktive Portal den Entwickler-Modus ein oder aus. Das Portal bekommt den Terminal-Look (Grün, bei einem Desk im Design „Terminal“ Weiß) und eine eigene Leiste: Gerät (die Seite bekommt genau dessen Größe und wird ganz im Slot gezeigt), Drehen, Zoom-Test 100/200/400 % (prüft, ob die Seite bei starkem Zoom bedienbar bleibt), die echte Größe der Seite in CSS-Pixeln mit Geräteklasse, Lineal und Beenden. Freies Zoomen ruht solange; beim Ausschalten kommen Zoom und Design zurück. Auch im Menü ⋮ des Portals. ' + DEV_TEXT.inspect, run: 'devMode', words: ['Entwickler', 'Developer', 'Breakpoint', 'Media Query', 'Pixel', 'Größe', 'responsive', 'Designer', 'Gerätevorschau', 'Smartphone', 'Tablet', 'Reflow', 'Lineal', 'Terminal', 'Untersuchen', 'Inspect', 'DevTools', 'Entwicklerwerkzeuge', 'Quelltext', 'Code'], questions: ['Wie groß ist die Seite in diesem Portal wirklich?', 'Wie teste ich Breakpoints?', 'Wie sieht meine Seite auf dem Smartphone aus?', 'Wo ist das Lineal geblieben?', 'Wie sehe ich den Code einer Seite?'] },
  { id: 'tourDev', group: 'Ansicht', name: 'Tour „Entwickler-Modus“', text: 'Zeigt die Leiste des Entwickler-Modus Schritt für Schritt: Gerät, Drehen, Zoom-Test, Maße der Seite, Lineal und Beenden – und zum Schluss, wie du mit „Untersuchen“ den Code der Seite im Portal ansiehst. Läuft am aktiven Portal; ist dort der Entwickler-Modus aus, wird er eingeschaltet.', run: 'tourDev', words: ['Entwickler-Tour', 'Tour Entwickler', 'Werkbank', 'Untersuchen', 'DevTools', 'Rundgang'], questions: ['Wie benutze ich den Entwickler-Modus?', 'Wie untersuche ich eine Seite im Portal?'] },
  { id: 'tourSources', group: 'Ansicht', name: 'Tour „Verhalten von Sources“', text: 'Zeigt alle Stellen, an denen du einstellst, wie sich eine Source verhält und wie sie aussieht: Pause-Zeichen am Tab und sein Menü, Stern in der Adresszeile, Library mit Pause-Zeichen und Haken, Sources im Cockpit, Kategorie und Farben, Launcher für Seiten, die sich nicht einbetten lassen, und die Einstellungen.', run: 'tourSources', words: ['Sources-Tour', 'Tour Sources', 'nie pausieren', 'Pause-Zeichen', 'Verhalten', 'Rundgang'], questions: ['Wie stelle ich ein, dass eine Seite nie pausiert?', 'Wo stelle ich ein, wie sich eine Source verhält?', 'Was bedeutet das rote Pause-Zeichen am Tab?'] },
  { id: 'tourSend', group: 'Ansicht', name: 'Tour „Öffnen in einrichten“', text: 'Zeigt Schritt für Schritt, wie das Lesezeichen „Öffnen in“ mit dem E-Sources-Symbol in die Lesezeichenleiste deines Browsers kommt: Datei laden, im Lesezeichen-Manager des Browsers importieren, in die Leiste ziehen. Die Schritte passen zu deinem Browser (Chrome, Edge, Firefox, Safari). Starten: Einstellungen (Zahnrad) › „Anleitung“ beim Lesezeichen „An E-Sources senden“, Hilfe oder Suche.', run: 'tourSend', words: ['Öffnen in', 'Bookmarklet', 'Lesezeichenleiste', 'Lesezeichen importieren', 'Symbol', 'Globus', 'Favoritenleiste', 'einrichten', 'Anleitung', 'Rundgang'], questions: ['Wie bekomme ich „Öffnen in“ in die Lesezeichenleiste?', 'Warum zeigt das Lesezeichen nur einen Globus?'] },
  { id: 'toursAuto', group: 'Ansicht', name: 'Touren automatisch zeigen', text: 'Schaltet ein oder aus, ob Touren beim ersten Mal von selbst starten (Einstellungen, Zahnrad). Von Hand starten geht immer.', run: 'toursAuto', words: ['nicht mehr anzeigen', 'Tour aus', 'Einführung abschalten', 'automatisch'], questions: ['Wie schalte ich die Touren ab?'] },
  { id: 'compact', group: 'Ansicht', name: 'Kompakt: nur Symbole', text: 'Blendet die Beschriftungen in Kopfleiste und Cockpit aus, nur die Symbole bleiben – gut für kleine Bildschirme. Der Name steht weiter im Tooltip und wird vorgelesen (Einstellungen, Zahnrad).', run: 'compact', words: ['kompakt', 'nur Symbole', 'Icons', 'Beschriftung', 'klein', 'schmal'], questions: ['Wie bekomme ich mehr Platz auf kleinen Bildschirmen?'] },
  { id: 'favicons', group: 'Ansicht', name: 'Symbole der Webseiten', text: 'Zeigt vor jeder Source das Symbol ihrer Webseite (Favicon). Es wird direkt von der jeweiligen Seite geladen, ohne fremden Dienst. Ausgeschaltet steht der Anfangsbuchstabe der Seite da (Einstellungen, Zahnrad).', run: 'favicons', words: ['Favicon', 'Webseitensymbol', 'Logo', 'Symbol der Seite', 'Datenschutz'], questions: ['Woher kommen die Symbole vor den Seiten?'] },
  { id: 'help', group: 'Ansicht', name: 'Hilfe', text: 'Zeigt alle Funktionen und Begriffe mit Tastenkürzeln.', keys: '?', run: 'help', words: ['Glossar', 'Tastenkürzel', 'Kürzel', 'Erklärung', 'Anleitung'], questions: ['Wo sehe ich alle Tastenkürzel?'] },

  // Anlegen
  { id: 'newSlot', group: 'Anlegen', name: '+ NewSlot', text: 'Legt einen neuen Slot an – als Spalte rechts oder Zeile unten. Ist der Bildschirm voll, kommen weitere Portale über das Plus eines Portals auf seinen Slot.', run: 'newSlot', words: ['neu', 'Slot anlegen', 'Spalte', 'Zeile', 'NewArea'], questions: ['Wie füge ich eine Spalte oder Zeile hinzu?'] },
  { id: 'newDesk', group: 'Anlegen', name: '+ NewDesk', text: up(def(TERMS.newDesk)), run: 'newDesk', words: ['neu', 'Fenster', 'zweiter Monitor'], questions: ['Wie lege ich einen neuen Desk an?'] },
  { id: 'newPortal', group: 'Anlegen', name: 'Neues Portal auf einen Slot', text: 'Das Plus in der Kopfzeile eines Portals legt ein weiteres Portal auf denselben Slot; es entsteht ein Stack.', words: ['Portal anlegen', 'Panel', 'stapeln'], questions: ['Wie lege ich ein neues Portal an?'] },
  { id: 'newTab', group: 'Anlegen', name: 'Neuer Tab', text: 'Das Plus neben den Tabs öffnet einen weiteren Tab im Portal (zählt 0,5 Fokus-Punkte).', words: ['Tab anlegen', 'Reiter'], questions: ['Wie öffne ich einen weiteren Tab im Portal?'] },
  { id: 'switchDesk', group: 'Anlegen', name: 'Desk wechseln (⇄)', text: up(def(TERMS.switchDesk)), keys: 'Alt/⌥+K · Alt/⌥+Umschalt+K', run: 'nextDesk', words: ['umschalten', 'anderer Desk', 'Fenster', 'nächster Desk', 'voriger Desk'], questions: ['Wie wechsle ich zu einem anderen Desk?'] },
  { id: 'collected', group: 'Begriffe', name: 'Gesammelter Desk', text: up(def(TERMS.collected)), words: ['ein Bildschirm', 'Notebook', 'ohne Fenster', 'geschlossen', 'Main Desk'] },
  { id: 'collectDesks', group: 'Anlegen', name: 'Desks hier sammeln', text: up(def(TERMS.collectDesks)) + ' Auch im Umschalter ⇄ und im Cockpit.', run: 'collectDesks', words: ['zusammenführen', 'ein Fenster', 'Notebook', 'Fenster schließen', 'aufräumen'], questions: ['Wie hole ich alle Desks in ein Fenster?'] },
  { id: 'distributeDesks', group: 'Anlegen', name: 'Auf Fenster verteilen', text: up(def(TERMS.distributeDesks)) + ' Lässt der Browser nur ein neues Fenster zu, Pop-ups für E-Sources erlauben. Auch im Umschalter ⇄ und im Cockpit.', run: 'distributeDesks', words: ['zweiter Monitor', 'mehrere Fenster', 'aufteilen', 'öffnen'], questions: ['Wie verteile ich Desks auf mehrere Fenster?'] },

  { id: 'design', group: 'Ansicht', name: 'Design anpassen', text: up(def(TERMS.design)) + ' Auf einem Zusatz-Desk gilt die Wahl nur für diesen Desk; „Wie Main Desk“ führt zurück. Unten im Dialog lassen sich die Farben aller Slots und Portale dieses Desks auf einmal zurücksetzen.', run: 'design', words: ['Farbe', 'Akzentfarbe', 'Darstellung', 'Theme', 'hell', 'dunkel', 'Aussehen', 'Look', 'Farbe je Desk', 'privat', 'geschäftlich', 'Desk-Farbe'], questions: ['Wie stelle ich hell oder dunkel ein?', 'Wie ändere ich die Akzentfarbe?'] },

  { id: 'colorRules', group: 'Ansicht', name: 'Farbregeln (Kategorien)', text: 'Jede Kategorie deiner Library kann eine Rahmen- und Akzentfarbe haben; sie gilt für alle Portale dieser Kategorie (z. B. alle Editoren grün). Zeigt ein Portal eine neue Seite, fragt der Hinweis unten nach der Kategorie (Vorschlag aus Library oder bekannter Seite); die Wahl wird für die Seite gemerkt. Ändern und Farben wählen: Kategorie in der Kopfzeile des Portals oder ⋮ → „Farben …“. Vorrang: Portal, dann Slot, dann Kategorie, dann Desk.', words: ['Regel', 'Farbregel', 'Kategorie', 'Kategoriefarbe', 'alle Editoren', 'einfärben', 'Gruppe'], questions: ['Wie färbe ich alle Portale einer Kategorie ein?'] },
  { id: 'rules', group: 'Ansicht', name: 'Regeln (Cockpit)', text: `Zeigt alles, was E-Sources von selbst tut, mit einem Satz je Regel; ein Häkchen schaltet eine Regel ein oder aus. Im Cockpit über „Regeln“: Farbregeln je Kategorie, Seite → Kategorie und eingebaute Regeln (Kategorie erfragen, Farbe anbieten, Sammeln ansagen). Löschen fragt nach und lässt sich rückgängig machen; Regeln wandern mit dem Export der Arbeitsfläche.`, run: 'rules', words: ['Regelübersicht', 'Automatik', 'Verhalten', 'abschalten', 'ausschalten', 'Hinweise', 'nicht mehr fragen', 'Zuordnung', 'Domain'], questions: ['Wie schalte ich einen Hinweis ab?', 'Was macht E-Sources von selbst?'] },
  { id: 'colors', group: 'Ansicht', name: 'Farben je Slot und Portal', text: TINT_TEXT.intro + ' Öffnen über ⋮ Portal-Optionen → „Farben …“ oder direkt nach dem Anlegen mit „Farbe wählen …“ im Hinweis. Die Tour „Farben“ erklärt den Dialog.', words: ['Rahmen', 'Rahmenfarbe', 'Akzentfarbe', 'Portal-Farbe', 'Slot-Farbe', 'einfärben', 'markieren'], questions: ['Wie gebe ich einem Portal eine eigene Farbe?'] },

  // Bedienung
  { id: 'adjust', group: 'Bedienung', name: 'Adjust', text: 'Größen der Portale per Tastatur oder Mausrad ändern: Pfeile oder W A S D verschieben die Kante, Umschalt die andere, Tab wechselt den Slot, M maximiert. Leertaste, Enter oder Esc beendet.', keys: 'Alt/⌥+A', run: 'adjust', words: ['Größe', 'Größen-Modus', 'breiter', 'schmaler', 'höher', 'Kante'], questions: ['Wie ändere ich die Größe eines Portals?'] },
  { id: 'jackpot', group: 'Bedienung', name: 'Slotmaschine', text: up(def(TERMS.jackpot)) + ' Hebel ziehen: die Walzen laufen und bleiben nacheinander stehen. Bei „Jackpot“ steht jede doppelte Source mit ihren Fundorten da – einer bleibt (der vorn im Portal, am liebsten auf diesem Desk), die anderen schließt du mit einem Klick. Die Fokusanzeige zeigt vorher, wie viel das spart. Zeigen in einem Slot alle Portale dieselbe Source, bietet die Runde „Zusammenlegen“ an: ein Portal bleibt, weitere Seiten wandern als Tabs hinein. Steht der Fokus auf rot oder sind viele Duplikate offen, lädt ein Hinweis unten zur Runde ein (höchstens einmal je Stunde; abschaltbar im Cockpit unter Regeln › „Zur Runde einladen“). Öffnen im Cockpit oder per Tastenkürzel.', keys: 'Alt/⌥+J', run: 'jackpot', words: ['Duplikat', 'Duplikate', 'doppelt', 'zweimal offen', 'aufräumen', 'Jackpot', 'Easteregg', 'Fokus verbessern', 'Einladung', 'zusammenlegen', 'gleiche Portale'], questions: ['Wie finde ich doppelt geöffnete Seiten?', 'Wie räume ich offene Portale auf?', 'Warum lädt mich E-Sources zur Slotmaschine ein?', 'Wie lege ich Portale mit gleicher Seite zusammen?'] },
  { id: 'focusRule', group: 'Bedienung', name: 'Fokusanzeige anpassen', text: 'Legt fest, bis wie viele Punkte die Fokusanzeige grün, gelb und orange zeigt und wie viel ein weiterer Tab zählt (Einstellungen, Zahnrad). „Voreinstellung“ setzt alles zurück.', run: 'focusRule', words: ['Grenzen', 'Ampel', 'Punkte', 'Fokus einstellen', 'Schwelle', 'grün', 'rot'], questions: ['Wie stelle ich die Grenzen der Fokusanzeige ein?'] },
  { id: 'restore', group: 'Bedienung', name: 'Wiederherstellen', text: 'Holt das zuletzt geschlossene Portal (mit allen Tabs und Verlauf) oder den zuletzt geschlossenen Tab zurück – an die alte Stelle, wenn es sie noch gibt. Nach dem Schließen steht dafür auch ein Knopf im Hinweis unten.', keys: 'Alt/⌥+Z', run: 'restore', words: ['rückgängig', 'zurückholen', 'versehentlich geschlossen', 'Undo', 'wieder öffnen'], questions: ['Wie hole ich ein geschlossenes Portal zurück?', 'Wie mache ich das Schließen rückgängig?'] },
  { id: 'layouts', group: 'Bedienung', name: 'Layouts', text: up(def(DESK_LAYOUT_TEXT.term)) + ' Je Desk lassen sich mehrere Layouts anlegen – aus der aktuellen Belegung (Kopie) oder aus der Vorlage „Gleichmäßig“ mit so vielen leeren Portalen, wie der Bildschirm zeigt. Wechseln speichert automatisch, nichts geht verloren; andere Desks bleiben, wie sie sind. Alles dazu steht im Cockpit unter „Layouts“ (Umschalter oben; auch Zahnrad › „Layouts …“): oben die Layouts als kleine Karten – ein Klick zeigt eins nur an, erst „Wechseln“ baut den Desk um; direkt darunter stehen Umbenennen, Kopieren, Löschen und die Cases des gewählten Layouts. Darunter die Vorschau mit den Werkzeugen für Slots gleich daneben. Im Bild sind Slots über der Empfehlung schraffiert; ein Slot lässt sich auf einen anderen ziehen (Platz tauschen) oder wählen und mit „Platz tauschen …“ versetzen oder schließen (seine Portale kommen in den Nachbar-Slot, mit Rückgängig). Die Anordnung lässt sich dort ganz bestimmen wie im Radar: Kante zwischen zwei Slots ziehen = Größe, Slot an den Rand eines anderen ziehen = dort einsetzen, Alt+Pfeil bzw. Alt+Umschalt+Pfeil per Tastatur; dazu „Slot rechts“, „Slot unten“ und „Gleich verteilen“. Über der Vorschau („Vorschau für: Gerät · Ausrichtung · Reihen“) lassen sich Gerät, Ausrichtung und Reihen wählen – so legt man die Anordnung für ein anderes Gerät fest, ohne es zu haben. Löschen mit Rückfrage und Rückgängig. ' + up(def(DESK_LAYOUT_TEXT.standardTerm)) + ' Ohne eigene Wahl ist das „Gleichmäßig“; festlegen im Dialog „Standard-Layout …“.', run: 'layouts', words: ['Belegung', 'Vorlage', 'Gleichmäßig', 'Szenario', 'Arbeitsplatz', 'umschalten', 'speichern', 'Layout wechseln', 'Standard-Layout', 'Standard', 'zurücksetzen', 'neuer Desk', 'Layout-Einstellungen', 'Vorschau', 'Slot tauschen', 'Slot schließen', 'überzählig', 'Cockpit', 'Anordnung', 'Größe', 'anderes Gerät', 'hochkant', 'Ausrichtung', 'Smartphone', 'Monitor', 'Slot anlegen'], questions: ['Wie lege ich fest, wie neue Desks aussehen?', 'Wie setze ich ein Layout auf den Standard zurück?', 'Wie speichere ich eine Belegung als Layout?', 'Wie wechsle ich zwischen Layouts?', 'Wie lege ich ein neues, leeres Layout an?', 'Geht beim Wechsel des Layouts etwas verloren?', 'Wie sehe ich ein Layout an, ohne zu wechseln?', 'Welche Slots sind zu viel für meinen Bildschirm?', 'Wie tausche ich zwei Slots in einem Layout?', 'Wie schließe ich einen Slot in einem Layout?', 'Wie ändere ich die Größe der Slots in einem Layout?', 'Wie lege ich die Anordnung für ein anderes Gerät fest?', 'Wie sieht mein Layout hochkant oder auf dem Smartphone aus?'] },
  { id: 'cases', group: 'Bedienung', name: 'Spaces und Cases', text: 'Ordnet deine Arbeit nach Lebensbereichen und Fällen: Ein Space ist ein Lebensbereich (Privat, Firma, Schule), ein Case ein Fall darin (Kunde XY, Projekt, Urlaub) – jeder Case gehört zu genau einem Space. Im Dialog legst du beide an, benennst sie um, gibst ihnen eine Farbe, verschiebst Cases in einen anderen Space und löschst sie (mit Rückfrage und „Rückgängig“). Im Layout-Modus des Cockpits ordnest du jedem Layout unter „Cases zuordnen …“ Cases zu; oben wählst du einen Case – gehört genau ein Layout dazu, wechselt E-Sources gleich dorthin, sonst bietet es die Layouts an. Auch in der Suche: Name eines Cases tippen.', run: 'cases', words: ['Space', 'Spaces', 'Case', 'Cases', 'Lebensbereich', 'Fall', 'Projekt', 'Kunde', 'Privat', 'Firma', 'Szenario', 'Sphere', 'Bereich'], questions: ['Wie trenne ich Privates und Berufliches?', 'Wie lege ich einen Case an?', 'Wie ordne ich ein Layout einem Case zu?', 'Was ist ein Space?', 'Was ist ein Case?'] },
  { id: 'limits', group: 'Bedienung', name: 'Mehr Slots als empfohlen', text: up(def(DESK_LAYOUT_TEXT.moreTerm)) + ' Ist die Empfehlung erreicht, fragt „+ NewSlot“ nach; mit „Trotzdem anlegen“ kommt ein weiterer Slot dazu und alle werden gleich verteilt. Passt keiner mehr hin, sagt ein Hinweis das. Solange es mehr als empfohlen sind, steht in der Kopfleiste „Auf n Slots zurück“: ein Klick verteilt wieder auf die empfohlene Zahl (mit Rückgängig). Stack und Tabs bleiben bei 9, die Fokusanzeige zählt wie gewohnt.', run: 'limits', words: ['mehr Slots', 'kleinere Portale', 'Grenze', 'Begrenzung', 'Mindestgröße', 'Bildschirm voll', 'empfohlen', 'zurück auf empfohlene'], questions: ['Wie bekomme ich mehr Slots auf den Bildschirm?', 'Warum fragt NewSlot nach?', 'Wie komme ich zurück auf die empfohlene Zahl Slots?'] },
  { id: 'closed', group: 'Bedienung', name: 'Zuletzt geschlossen', text: 'Liste der letzten 10 geschlossenen Portale und Tabs dieses Desks; jeder Eintrag lässt sich einzeln zurückholen (Einstellungen, Zahnrad). Bleibt beim Neuladen erhalten.', run: 'closed', words: ['Verlauf', 'geschlossene Tabs', 'geschlossene Portale', 'Papierkorb', 'wiederherstellen'], questions: ['Welche Portale habe ich zuletzt geschlossen?'] },
  { id: 'nextTab', group: 'Bedienung', name: 'Nächster / voriger Tab', text: 'Wechselt im aktiven Portal zum nächsten Tab, mit Umschalt zum vorigen, und sagt an, welcher es ist. Steht der Fokus auf einem Tab, gehen auch die Pfeiltasten.', keys: 'Alt/⌥+T · Umschalt+Alt/⌥+T', words: ['Tab wechseln', 'Reiter', 'weiterschalten', 'Strg+Tab'], questions: ['Wie wechsle ich per Tastatur zum nächsten Tab?'] },
  { id: 'nextPortal', group: 'Bedienung', name: 'Nächstes / voriges Portal', text: 'Macht das nächste Portal aktiv (von links oben nach rechts unten), mit Umschalt das vorige, und sagt an, welches es ist. Im Solo-View wird das gezeigte Portal mitgewechselt.', keys: 'Alt/⌥+P · Umschalt+Alt/⌥+P', words: ['Portal wechseln', 'Panel', 'weiterschalten', 'aktiv'], questions: ['Wie wechsle ich per Tastatur zum nächsten Portal?'] },
  { id: 'distribute', group: 'Bedienung', name: 'Gleich verteilen', text: 'Macht alle Slots dieses Desks gleich groß.', keys: 'Alt/⌥+G', run: 'distribute', words: ['gleich groß', 'ordnen', 'aufräumen', 'Größe'], questions: ['Wie mache ich alle Slots gleich groß?'] },
  { id: 'swap', group: 'Bedienung', name: 'Portale tauschen oder versetzen', text: 'Portal am Namen ziehen: auf die Mitte eines anderen Portals = tauschen, an den Rand = dort einsetzen.', words: ['verschieben', 'ziehen', 'Drag', 'umsortieren'], questions: ['Wie verschiebe ich ein Portal?', 'Wie tausche ich zwei Portale?'] },
  { id: 'rename', group: 'Bedienung', name: 'Umbenennen', text: 'Doppelklick auf den Namen eines Portals oder Stack-Eintrags; den Desk-Namen per Klick.', keys: 'F2', words: ['Name', 'benennen'], questions: ['Wie benenne ich ein Portal um?'] },
  { id: 'stackDelete', group: 'Bedienung', name: 'Portal aus dem Stack entfernen', text: 'In der Stack-Leiste den Eintrag wählen und Entf drücken.', keys: 'Entf', words: ['löschen', 'schließen', 'Stapel'], questions: ['Wie entferne ich ein Portal aus dem Stack?'] },
  { id: 'ruler', group: 'Bedienung', name: 'Lineal', text: 'Blendet ein Lineal über der Seite ein – für ein einzelnes Portal oder über die Einstellungen für alle.', words: ['messen', 'Raster', 'Maß'], questions: ['Wie messe ich etwas auf der Seite?'] },
  { id: 'webSearch', group: 'Bedienung', name: 'Im Web suchen', text: 'Suchmaschinen wie Google lassen sich nicht in ein Portal einbetten. Darum so: In der Adresszeile eines Portals oder in der Suche oben tippen: Darunter stehen passende Sources aus deiner Library und zuletzt „… im Web suchen“ (Pfeiltasten wählen, Enter öffnet). Die Web-Suche öffnet in einem eigenen Fenster rechts neben E-Sources. Einen Treffer ziehst du dann mit der Maus zurück in E-Sources: auf ein leeres Portal = dort öffnen; auf ein Portal mit Seite erscheinen zwei Flächen, „Hier öffnen“ und „Als neuer Tab“; auf die Tab-Leiste eines Portals = als neuer Tab. Ohne Ziehen geht es mit dem Lesezeichen „An E-Sources senden“ in der Lesezeichenleiste (ein Klick schickt den Treffer ins aktive Portal) oder: Adresse des Treffers kopieren und in die Adresszeile eines Portals einfügen. Die Suchmaschine (Google, DuckDuckGo, Ecosia, Bing) stellst du in den Einstellungen (Zahnrad) ein.', words: ['Google', 'googeln', 'DuckDuckGo', 'Ecosia', 'Bing', 'Suchmaschine', 'Internet', 'Treffer', 'Link', 'hineinziehen', 'ziehen', 'Drag', 'einfügen', 'Web'], questions: ['Wie suche ich mit Google?', 'Wie bekomme ich einen Google-Treffer in ein Portal?', 'Wie öffne ich einen Link aus einem anderen Browserfenster in E-Sources?', 'Warum öffnet Google nicht im Portal?'] },
  { id: 'sendTo', group: 'Bedienung', name: 'An E-Sources senden', text: 'Ein Lesezeichen für die Lesezeichenleiste des Browsers. Ein Klick darauf schickt die gerade offene Seite – z. B. einen Treffer der Web-Suche – ins aktive Portal von E-Sources: Ist die Seite dort schon offen, wechselt es hin; ist der Tab leer, öffnet sie dort; sonst kommt sie als neuer Tab dazu. Ist kein Portal offen, kommt sie in einen neuen Slot. Sind mehrere Desks offen, bekommt sie der Desk, den du zuletzt benutzt hast. Ein kleines Fenster zeigt das Ziel und sendet nach 10 Sekunden von selbst; drückst du vorher eine Taste oder klickst, hält es an, und du wählst ein anderes Portal, einen anderen Slot oder „Neuer Slot“ und drückst „Senden“. Ist E-Sources nicht offen, startet es mit der Seite. So richtest du es ein: Einstellungen (Zahnrad) öffnen und den Knopf „Öffnen in“ mit der Maus in die Lesezeichenleiste ziehen (beim Ziehen zeigt der Browser nur ein allgemeines Symbol; mit „Mit Symbol als Datei“ bekommt es das E-Sources-Symbol mit grünem Pfeil). Am einfachsten geht es mit „Anleitung“ daneben (Tour „Öffnen in einrichten“). Ohne Maus: dort „Code kopieren“, im Browser ein neues Lesezeichen anlegen und den Code als Adresse einfügen. Seiten, die sich nicht einbetten lassen, bleiben im Browser.', words: ['Bookmarklet', 'Lesezeichenleiste', 'senden', 'schicken', 'Treffer', 'Seite übernehmen', 'Link', 'Google', 'Web'], questions: ['Wie schicke ich eine Seite aus dem Browser an E-Sources?', 'Wie bekomme ich einen Treffer ohne Ziehen in ein Portal?', 'Was macht das Lesezeichen „An E-Sources senden“?', 'Wie lege ich „An E-Sources senden“ in die Lesezeichenleiste?', 'Kann ich wählen, in welches Portal die Seite kommt?'] },
  { id: 'zoom', group: 'Bedienung', name: 'Zoom je Portal', text: 'Zeigt die Seiten in einem Portal kleiner oder größer, von 50 bis 200 %: Mit der Maus über die Lupe in der Kopfleiste des Portals fahren – das Zoom-Feld öffnet sich von selbst. Dort Mausrad drehen (hoch = größer), den senkrechten Regler ziehen oder „+“ / „−“ klicken; „100 %“ setzt zurück. Auch das Mausrad direkt über der Lupe zoomt. Auf Touch-Geräten die Lupe antippen; ein Klick oder Tippen daneben schließt das Feld. Auch im Portal-Menü (⋮) › Zoom, oder Alt/⌥+Minus und Alt/⌥+Plus für das aktive Portal; Alt/⌥+0 setzt auf 100 % zurück. Steht der Zoom nicht auf 100 %, steht der Wert neben der Lupe. Bei weniger als 100 % bekommt die Seite mehr Platz, viele Seiten zeigen dann ihre Ansicht für größere Bildschirme. Der Wert gilt für alle Tabs des Portals und bleibt gleich, wenn du den Slot größer oder kleiner ziehst oder maximierst: Die Seite bekommt dann mehr oder weniger Platz, die Schrift bleibt gleich groß. Anders mit „Breite halten“ im Zoom-Feld: Dann behält die Seite ihre Breite in Pixeln, und der Zoom passt sich an, wenn du den Slot schmaler oder breiter ziehst – die Seite bleibt, wie sie ist, nur kleiner oder größer (neben der Lupe steht dann ↔). Strg/⌘+Plus im Browser vergrößert dagegen ganz E-Sources.', words: ['Zoom', 'zoomen', 'vergrößern', 'verkleinern', 'Schrift', 'Schriftgröße', 'größer', 'kleiner', 'Lupe', 'Prozent', 'Skalierung', 'Desktop-Ansicht', 'Handy-Ansicht'], questions: ['Wie bleibt eine Seite in einem schmalen Slot in der Desktop-Ansicht?', 'Wie vergrößere ich die Seite in einem Portal?', 'Wie zeige ich eine Seite kleiner, damit mehr draufpasst?', 'Warum zeigt ein schmales Portal die Handy-Ansicht einer Seite?'] },
  { id: 'pause', group: 'Bedienung', name: 'Portale pausieren', text: 'Spart Arbeitsspeicher und Akku: Tabs im Hintergrund und Portale hinten im Stack laden erst, wenn du sie zum ersten Mal ansiehst, und pausieren, wenn sie länger verdeckt sind (Voreinstellung 10 Minuten). Beim Anklicken laden sie neu; Pausiertes ist blasser und so angesagt. Die Zeit stellst du in den Einstellungen (Zahnrad) unter „Verdecktes pausieren“ ein, auch „Nie“. Sichtbare Portale, die du lange nicht benutzt, pausieren auch (Voreinstellung 1 Stunde, Einstellung „Sichtbares pausieren“); das gewählte Portal nie von selbst. Von Hand: Portal-Menü (⋮) › „Jetzt pausieren“. Ein Klick auf „Pausiert – Klicken lädt neu“ holt die Seite zurück. Ausnehmen: Portal-Menü (⋮) › „Nicht pausieren“ für das ganze Portal oder das durchgestrichene Pause-Zeichen am Tab nur für diesen einen Tab – z. B. für Musik, Chat oder einen laufenden Upload. Es zeigt sich beim Darüberfahren (auch im Portal-Menü als „Diesen Tab nie pausieren“); Tabs, die nie pausieren, tragen es immer – Kreis und Querstrich rot. Pausierte Tabs zeigen ein Pause-Zeichen.', words: ['Ressourcen', 'Speicher', 'Arbeitsspeicher', 'Akku', 'langsam', 'Leistung', 'entladen', 'schlafen', 'Musik', 'Upload', 'Chat', 'durchgestrichen', 'nie pausieren', 'geladen lassen', 'neu laden', 'Stack'], questions: ['Was bedeutet das durchgestrichene Pause-Zeichen am Tab?', 'Warum lädt ein Tab neu, wenn ich ihn anklicke?', 'Warum steht in meinem Portal „Pausiert“?', 'Wie pausiere ich ein Portal von Hand?', 'Wie bleibt nur ein Tab immer geladen?', 'Wie bleibt Musik in einem verdeckten Portal an?', 'Wie spare ich Arbeitsspeicher mit vielen Portalen?'] },
  { id: 'importBookmarks', group: 'Bedienung', name: 'Lesezeichen importieren', text: up(def(TERMS.importBookmarks)) + ' Schon vorhandene Sources werden übersprungen (Einstellungen, Zahnrad).', run: 'importBookmarks', words: ['Chrome', 'Safari', 'Firefox', 'Edge', 'Browser', 'übernehmen', 'HTML', 'Favoriten', 'Library füllen'], questions: ['Wie bekomme ich meine Lesezeichen aus Chrome?', 'Wie übernehme ich Lesezeichen aus Safari oder Firefox?'] },
  { id: 'sortHelp', group: 'Bedienung', name: 'Sortierhilfe', text: up(def(TERMS.sortHelp)) + ' „Alle Vorschläge übernehmen“ sortiert alles auf einmal. Öffnet sich nach einem Import mit vielen Sources ohne Kategorie von selbst (Einstellungen, Zahnrad).', run: 'sortHelp', words: ['sortieren', 'einsortieren', 'Kategorien zuordnen', 'aufräumen', 'Ohne Kategorie', 'ordnen', 'Import'], questions: ['Wie sortiere ich importierte Lesezeichen in Kategorien?'] },
  { id: 'origin', group: 'Begriffe', name: 'Herkunft einer Source', text: up(def(TERMS.origin)) + ' Ältere Sources zeigen „Herkunft unbekannt“. Die Angabe bleibt nur auf diesem Gerät und in der eigenen Sicherungsdatei.', words: ['wer', 'woher', 'wann', 'angelegt', 'Import', 'Datum', 'Quelle', 'Verlauf'], questions: ['Woher stammt eine Source?'] },
  { id: 'exportBookmarks', group: 'Bedienung', name: 'Library exportieren', text: up(def(TERMS.exportBookmarks)), run: 'exportBookmarks', words: ['Lesezeichen exportieren', 'Chrome', 'Safari', 'Firefox', 'Browser', 'HTML', 'sichern'], questions: ['Wie nehme ich meine Library in einen anderen Browser mit?'] },
  { id: 'profile', group: 'Bedienung', name: 'Profil', text: up(def(TERMS.profile)) + ' Name, Kennfarbe und Begrüßung stellst du unter Einstellungen (Zahnrad) › Profil ein; die Begrüßung lässt sich dort abschalten.', run: 'profile', words: ['Name', 'Begrüßung', 'Willkommen', 'Konto', 'Login', 'Anmelden', 'Kennfarbe', 'Initialen', 'Zuletzt offen', 'weitermachen', 'persönlich'], questions: ['Wie ändere ich meinen Namen oder die Begrüßung?'] },
  { id: 'reload', group: 'Bedienung', name: 'Neu laden', text: 'Lädt E-Sources neu, z. B. wenn unten links „Neue Version verfügbar“ steht. ' + up(def(TERMS.update)) + ' E-Sources prüft das beim Zurückkehren in die App und alle 30 Minuten von selbst.', run: 'reload', words: ['neue Version', 'Update', 'aktualisieren', 'neu starten', 'Version', 'iPhone', 'iPad', 'Startbildschirm', 'App'], questions: ['Wie bekomme ich die neue Version?'] },
  { id: 'exportDesks', group: 'Bedienung', name: 'An anderes Gerät senden', text: 'Bringt alle Desks samt Portalen, Layouts und Library auf ein anderes Gerät: Einstellungen (Zahnrad) › „An anderes Gerät senden …“ öffnet das Teilen-Menü deines Geräts – z. B. AirDrop aufs iPhone, Nachrichten oder Mail. Auf dem anderen Gerät: Einstellungen (Zahnrad) › „Desks aus Datei laden …“ und die Datei wählen (auf iPhone und iPad liegt sie in der App „Dateien“, meist unter „Downloads“). Kann der Browser nicht teilen, speichert E-Sources die Datei; „Desks als Datei speichern“ tut das immer, z. B. als Sicherung. Das gilt auch für E-Sources als App auf dem Startbildschirm: Sie hat ihren eigenen Speicher, getrennt vom Browser, und bekommt deinen Stand ebenfalls so. Automatisch geht es mit „Abgleich zwischen Geräten …“ (GitHub-Konto nötig).', run: 'sendDesks', words: ['sichern', 'Backup', 'Datei', 'übertragen', 'anderes Gerät', 'exportieren', 'teilen', 'AirDrop', 'iPhone', 'iPad', 'Handy', 'Startbildschirm', 'mitnehmen'], questions: ['Wie übertrage ich alles auf ein anderes Gerät?', 'Wie schicke ich meine Desks per AirDrop aufs iPhone?', 'Wie bekommt die App auf dem Startbildschirm meinen Stand?', 'Wie sichere ich meine Desks?'] },
  { id: 'syncDesks', group: 'Bedienung', name: 'Abgleich zwischen Geräten', text: 'Hält alle deine Geräte von selbst auf demselben Stand: Desks, Portale, Layouts, Library, Profil und Begrüßung. Einstellungen (Zahnrad) › „Abgleich zwischen Geräten …“ führt Schritt für Schritt durch die Einrichtung: kostenloses GitHub-Konto, Schlüssel mit nur dem Recht „gist“ anlegen, hier einfügen, verbinden – auf jedem Gerät einmal. E-Sources legt den Stand in einem geheimen Gist ab (geheim heißt nicht verschlüsselt), holt ihn beim Start und beim Zurückkehren und sendet Änderungen nach 30 Sekunden Ruhe. Haben zwei Geräte zugleich geändert, fragt E-Sources, welcher Stand bleibt. Das Zeichen mit den zwei Pfeilen in der Kopfleiste zeigt den Zustand. Ohne GitHub: „An anderes Gerät senden“.', run: 'syncDesks', words: ['Abgleich', 'synchronisieren', 'Sync', 'GitHub', 'Gist', 'Token', 'Schlüssel', 'automatisch', 'Cloud', 'iPhone', 'iPad', 'Startbildschirm', 'alle Geräte', 'gleicher Stand'], questions: ['Gleichen sich meine Geräte von selbst ab?', 'Wie richte ich den Abgleich mit GitHub ein?', 'Was passiert, wenn zwei Geräte zugleich ändern?', 'Ist mein Stand auf GitHub sicher?'] },
  { id: 'loadDesks', group: 'Bedienung', name: 'Desks aus Datei laden', text: 'Lädt eine gesendete oder gespeicherte Datei (e-sources-arbeitsflaeche.json) und ersetzt damit alle Desks auf diesem Gerät (Einstellungen, Zahnrad). Ist der Stand hier neuer als die Datei, fragt E-Sources vorher nach.', run: 'loadDesks', words: ['importieren', 'Datei', 'laden', 'wiederherstellen', 'Backup', 'Sicherung', 'anderes Gerät', 'empfangen'], questions: ['Wie lade ich meine Desks auf dem neuen Gerät?', 'Wie stelle ich eine Sicherung wieder her?'] },
];

/**
 * F-181: So speichert jeder Browser seine Lesezeichen als HTML-Datei – für die Tour „Import“ und
 * den Hinweis bei einer falschen Datei (eine Stelle für beide).
 */
export const BROWSER_EXPORT: { browser: string; how: string }[] = [
  { browser: 'Chrome', how: 'Menü ⋮ › Lesezeichen und Listen › Lesezeichen-Manager › oben rechts ⋮ › Lesezeichen exportieren' },
  { browser: 'Edge', how: 'Menü … › Favoriten › … › Favoriten exportieren' },
  { browser: 'Firefox', how: 'Menü › Lesezeichen › Lesezeichen verwalten › Importieren und Sichern › Lesezeichen nach HTML exportieren' },
  { browser: 'Safari', how: 'Menü Ablage › Exportieren › Lesezeichen' },
];

/**
 * F-197: So kommt „Öffnen in“ (Datei „E-Sources-senden.html“) je Browser in die Leiste.
 * `address` = Seite des Lesezeichen-Managers zum Kopieren (eine Webseite darf sie nicht selbst öffnen).
 */
export interface BrowserSend {
  manager: string;
  address?: string;
  import: string;
  bar: string;
}
export function browserSend(mod: string): Record<BrowserName, BrowserSend> {
  const show = `${mod}+Umschalt+B`;
  return {
    Chrome: {
      manager: 'Öffne einen neuen Tab und gib in die Adresszeile chrome://bookmarks ein (Enter). Oder: Menü ⋮ › Lesezeichen und Listen › Lesezeichen-Manager.',
      address: 'chrome://bookmarks',
      import: 'Im Lesezeichen-Manager oben rechts auf ⋮ klicken – die Punkte in der Leiste des Managers, nicht die ganz oben im Fenster – › „Lesezeichen importieren“ › im Ordner „Downloads“ die Datei „E-Sources-senden.html“ › „Öffnen“.',
      bar: `Links im Lesezeichen-Manager steht jetzt ein Ordner „Importiert“ mit „Öffnen in“ und unserem Symbol. Zieh „Öffnen in“ links auf „Lesezeichenleiste“. Ist die Leiste oben nicht zu sehen: ${show} blendet sie ein.`,
    },
    Edge: {
      manager: 'Öffne einen neuen Tab und gib in die Adresszeile edge://favorites ein (Enter).',
      address: 'edge://favorites',
      import: 'Oben rechts auf … › „Favoriten importieren“ › bei „Importieren aus“ „Favoriten- oder Lesezeichen-HTML-Datei“ wählen › im Ordner „Downloads“ die Datei „E-Sources-senden.html“ › „Öffnen“.',
      bar: `Die importierten Favoriten liegen in einem eigenen Ordner. Zieh „Öffnen in“ von dort auf „Favoritenleiste“. Ist die Leiste nicht zu sehen: ${show} blendet sie ein.`,
    },
    Firefox: {
      manager: `Drück ${mod}+Umschalt+O – das öffnet die Bibliothek mit deinen Lesezeichen.`,
      import: '„Importieren und Sichern“ › „Lesezeichen von HTML importieren …“ › im Ordner „Downloads“ die Datei „E-Sources-senden.html“ › „Öffnen“.',
      bar: `„Öffnen in“ steht jetzt im „Lesezeichen-Menü“. Zieh es in der Bibliothek auf „Lesezeichen-Symbolleiste“. Ist die Leiste nicht zu sehen: ${show} blendet sie ein.`,
    },
    Safari: {
      manager: 'Safari braucht dafür keinen eigenen Manager – weiter mit dem nächsten Schritt.',
      import: 'Menü „Ablage“ › „Importieren von“ › „Lesezeichen-HTML-Datei …“ › im Ordner „Downloads“ die Datei „E-Sources-senden.html“ › „Importieren“.',
      bar: `Safari legt einen Ordner „Importiert …“ an (zu sehen in der Seitenleiste unter Lesezeichen, ${mod}+Ctrl+1). Zieh „Öffnen in“ von dort in die Favoritenleiste (${show} blendet sie ein). Safari zeigt in der Leiste nur den Namen, kein Symbol.`,
    },
  };
}

/** Exportwege in einer Zeile, z. B. für Hinweise. */
export const browserExportLine = (): string => BROWSER_EXPORT.map((b) => `${b.browser}: ${b.how}`).join('; ');

/** Klein, ohne Akzente, ß → ss: „Größe“ findet „grosse“ und „große“. */
export function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/**
 * Sucht in der Hilfe. Rangfolge: Name beginnt mit der Eingabe › Name enthält sie › Suchwort ›
 * Erklärung oder Tastenkürzel. Mehrere Wörter müssen alle vorkommen.
 */
export function searchHelp(query: string, max = 5, list: HelpEntry[] = HELP): HelpEntry[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const scored: { e: HelpEntry; s: number; i: number }[] = [];
  list.forEach((e, i) => {
    const name = fold(e.name);
    const extra = fold([...(e.words ?? []), ...qWords(e)].join(' '));
    const rest = fold(`${e.text} ${e.keys ?? ''}`);
    let s = 0;
    for (const w of words) {
      const ws = name.startsWith(w) || name.split(/[\s(+/]+/).some((p) => p.startsWith(w)) ? 4 : name.includes(w) ? 3 : extra.includes(w) ? 2 : rest.includes(w) ? 1 : 0;
      if (!ws) return;
      s += ws;
    }
    scored.push({ e, s, i });
  });
  return scored
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, max)
    .map((x) => x.e);
}

/** F-186: Füllwörter in Fragen zählen bei der Suche nicht („wie“ allein findet sonst alles). */
const Q_STOP = new Set(['wie', 'was', 'wo', 'woher', 'warum', 'welche', 'welcher', 'gibt', 'es', 'ich', 'mein', 'meine', 'meinen', 'ein', 'eine', 'einen', 'einem', 'einer', 'der', 'die', 'das', 'den', 'dem', 'zu', 'zur', 'zum', 'im', 'in', 'auf', 'an', 'aus', 'mit', 'und', 'oder', 'sich', 'alle', 'ist', 'bekomme', 'mache', 'nur', 'etwas']);
const qTokens = (q: string) => fold(q).split(/[^a-z0-9]+/).filter(Boolean);
const qWords = (e: HelpEntry) => (e.questions ?? []).flatMap(qTokens).filter((w) => !Q_STOP.has(w));

/** Eingabewort passt zu einem Wort der Frage: Anfang gleich, oder gleicher Stamm ab 5 Buchstaben („verschieben“ ↔ „verschiebe“). */
function qMatch(w: string, t: string): boolean {
  if (t.startsWith(w)) return true;
  let p = 0;
  while (p < w.length && p < t.length && w[p] === t[p]) p++;
  return p >= 5 || (p === t.length && t.length >= 4);
}

export interface QuestionHit {
  q: string;
  entry: HelpEntry;
}

/** F-186: Eingabe beginnt mit einem Fragewort – dann stehen Fragen in der Suche oben. */
export const asksQuestion = (query: string): boolean => /^(wie|was|wo|woher|wohin|warum|wieso|weshalb|welche[rsnm]?|wann|kann|gibt)(\s|$)/.test(fold(query).trim());

/** F-186: ab so vielen Buchstaben erscheinen Fragen als Vorschläge. */
export const QUESTION_MIN = 3;

/**
 * F-186: passende Fragen zur Eingabe. Jedes eingegebene Wort muss zu einem Wort der Frage passen;
 * Fragen, die mit der Eingabe beginnen, kommen zuerst. Füllwörter („wie“, „ich“) zählen mit,
 * wenn sie getippt werden, damit „wie ver…“ schon Vorschläge bringt.
 */
export function searchQuestions(query: string, max = 3, list: HelpEntry[] = HELP): QuestionHit[] {
  const f = fold(query).trim();
  if (f.replace(/\s/g, '').length < QUESTION_MIN) return [];
  const words = f.split(/[^a-z0-9]+/).filter(Boolean);
  if (!words.length || words.every((w) => Q_STOP.has(w))) return [];
  const out: { h: QuestionHit; s: number; i: number }[] = [];
  let i = 0;
  for (const entry of list)
    for (const q of entry.questions ?? []) {
      const toks = qTokens(q);
      const n = i++;
      // Das letzte Wort darf noch unfertig sein; Füllwörter müssen nicht vorkommen, wenn noch ein Sinnwort da ist
      const ok = words.every((w) => toks.some((t) => qMatch(w, t)) || Q_STOP.has(w));
      if (!ok) continue;
      const s = fold(q).startsWith(f) ? 2 : 1;
      out.push({ h: { q, entry }, s, i: n });
    }
  return out
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, max)
    .map((x) => x.h);
}

/** F-186: Texte rund um die Fragen-Vorschläge (eine Stelle für Hilfe und Suche). */
export const QUESTION_TEXT = {
  head: 'Fragen',
  headHelp: 'Passende Fragen',
  /** Ansage für eine Frage in der Liste. */
  option: (h: QuestionHit) => `Frage: ${h.q} Antwort: ${h.entry.text} Enter zeigt die Antwort in der Hilfe.`,
  hint: '↵ Antwort',
  count: (n: number) => `${n} ${n === 1 ? 'Frage' : 'Fragen'}`,
};

export const helpById = (id: string): HelpEntry | undefined => HELP.find((e) => e.id === id);
