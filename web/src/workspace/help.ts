/**
 * F-156: Eine Liste aller Funktionen und Begriffe – Quelle für Hilfe (?), Suche und später die
 * Tour (F-95). Begriffe kommen aus TERMS (F-154), damit jeder Text nur an einer Stelle steht.
 * Funktionen mit `run` lassen sich aus der Suche ausführen (Enter); Umschalt+Enter öffnet die Hilfe.
 */
import { TERMS, TINT_TEXT } from './terms';

/** Was die Oberfläche ausführen kann; App.tsx ordnet jedem Wert die passende Aktion zu. */
export type HelpRun = 'help' | 'cockpit' | 'view' | 'adjust' | 'distribute' | 'maximize' | 'newSlot' | 'newDesk' | 'search' | 'tour' | 'tourCockpit' | 'design' | 'tourDesign' | 'toursAuto' | 'restore' | 'closed' | 'focusRule' | 'launcher' | 'importBookmarks' | 'exportBookmarks' | 'sortHelp' | 'tourImport' | 'profile' | 'reload' | 'collectDesks' | 'distributeDesks' | 'nextDesk' | 'rules' | 'compact' | 'favicons';

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
  { id: 'tourDesign', group: 'Ansicht', name: 'Tour „Design“', text: 'Kurze Einführung in „Design anpassen“: Darstellung, Akzentfarbe und eigene Farbe. Startet beim ersten Öffnen des Dialogs von selbst.', run: 'tourDesign', words: ['Design-Tour', 'Einführung Design', 'Farben erklärt', 'Rundgang'] },
  { id: 'tourImport', group: 'Ansicht', name: 'Tour „Import“', text: 'Kurze Einführung, wie du Lesezeichen aus Chrome, Safari, Firefox oder Edge holst, wie fein die Ordner zu Kategorien werden und was die Sortierhilfe danach tut. Startet beim ersten Import von selbst.', run: 'tourImport', words: ['Import-Tour', 'Einführung Import', 'Lesezeichen übernehmen', 'Browser', 'Chrome', 'Safari', 'Firefox', 'Edge', 'Rundgang'], questions: ['Wie funktioniert der Import Schritt für Schritt?'] },
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
  { id: 'colors', group: 'Ansicht', name: 'Farben je Slot und Portal', text: TINT_TEXT.intro + ' Öffnen über ⋮ Portal-Optionen → „Farben …“ oder direkt nach dem Anlegen mit „Farbe wählen …“ im Hinweis.', words: ['Rahmen', 'Rahmenfarbe', 'Akzentfarbe', 'Portal-Farbe', 'Slot-Farbe', 'einfärben', 'markieren'], questions: ['Wie gebe ich einem Portal eine eigene Farbe?'] },

  // Bedienung
  { id: 'adjust', group: 'Bedienung', name: 'Adjust', text: 'Größen der Portale per Tastatur oder Mausrad ändern: Pfeile oder W A S D verschieben die Kante, Umschalt die andere, Tab wechselt den Slot, M maximiert. Leertaste, Enter oder Esc beendet.', keys: 'Alt/⌥+A', run: 'adjust', words: ['Größe', 'Größen-Modus', 'breiter', 'schmaler', 'höher', 'Kante'], questions: ['Wie ändere ich die Größe eines Portals?'] },
  { id: 'focusRule', group: 'Bedienung', name: 'Fokusanzeige anpassen', text: 'Legt fest, bis wie viele Punkte die Fokusanzeige grün, gelb und orange zeigt und wie viel ein weiterer Tab zählt (Einstellungen, Zahnrad). „Voreinstellung“ setzt alles zurück.', run: 'focusRule', words: ['Grenzen', 'Ampel', 'Punkte', 'Fokus einstellen', 'Schwelle', 'grün', 'rot'], questions: ['Wie stelle ich die Grenzen der Fokusanzeige ein?'] },
  { id: 'restore', group: 'Bedienung', name: 'Wiederherstellen', text: 'Holt das zuletzt geschlossene Portal (mit allen Tabs und Verlauf) oder den zuletzt geschlossenen Tab zurück – an die alte Stelle, wenn es sie noch gibt. Nach dem Schließen steht dafür auch ein Knopf im Hinweis unten.', keys: 'Alt/⌥+Z', run: 'restore', words: ['rückgängig', 'zurückholen', 'versehentlich geschlossen', 'Undo', 'wieder öffnen'], questions: ['Wie hole ich ein geschlossenes Portal zurück?', 'Wie mache ich das Schließen rückgängig?'] },
  { id: 'closed', group: 'Bedienung', name: 'Zuletzt geschlossen', text: 'Liste der letzten 10 geschlossenen Portale und Tabs dieses Desks; jeder Eintrag lässt sich einzeln zurückholen (Einstellungen, Zahnrad). Bleibt beim Neuladen erhalten.', run: 'closed', words: ['Verlauf', 'geschlossene Tabs', 'geschlossene Portale', 'Papierkorb', 'wiederherstellen'], questions: ['Welche Portale habe ich zuletzt geschlossen?'] },
  { id: 'nextTab', group: 'Bedienung', name: 'Nächster / voriger Tab', text: 'Wechselt im aktiven Portal zum nächsten Tab, mit Umschalt zum vorigen, und sagt an, welcher es ist. Steht der Fokus auf einem Tab, gehen auch die Pfeiltasten.', keys: 'Alt/⌥+T · Umschalt+Alt/⌥+T', words: ['Tab wechseln', 'Reiter', 'weiterschalten', 'Strg+Tab'], questions: ['Wie wechsle ich per Tastatur zum nächsten Tab?'] },
  { id: 'nextPortal', group: 'Bedienung', name: 'Nächstes / voriges Portal', text: 'Macht das nächste Portal aktiv (von links oben nach rechts unten), mit Umschalt das vorige, und sagt an, welches es ist. Im Solo-View wird das gezeigte Portal mitgewechselt.', keys: 'Alt/⌥+P · Umschalt+Alt/⌥+P', words: ['Portal wechseln', 'Panel', 'weiterschalten', 'aktiv'], questions: ['Wie wechsle ich per Tastatur zum nächsten Portal?'] },
  { id: 'distribute', group: 'Bedienung', name: 'Gleich verteilen', text: 'Macht alle Slots dieses Desks gleich groß.', keys: 'Alt/⌥+G', run: 'distribute', words: ['gleich groß', 'ordnen', 'aufräumen', 'Größe'], questions: ['Wie mache ich alle Slots gleich groß?'] },
  { id: 'swap', group: 'Bedienung', name: 'Portale tauschen oder versetzen', text: 'Portal am Namen ziehen: auf die Mitte eines anderen Portals = tauschen, an den Rand = dort einsetzen.', words: ['verschieben', 'ziehen', 'Drag', 'umsortieren'], questions: ['Wie verschiebe ich ein Portal?', 'Wie tausche ich zwei Portale?'] },
  { id: 'rename', group: 'Bedienung', name: 'Umbenennen', text: 'Doppelklick auf den Namen eines Portals oder Stack-Eintrags; den Desk-Namen per Klick.', keys: 'F2', words: ['Name', 'benennen'], questions: ['Wie benenne ich ein Portal um?'] },
  { id: 'stackDelete', group: 'Bedienung', name: 'Portal aus dem Stack entfernen', text: 'In der Stack-Leiste den Eintrag wählen und Entf drücken.', keys: 'Entf', words: ['löschen', 'schließen', 'Stapel'], questions: ['Wie entferne ich ein Portal aus dem Stack?'] },
  { id: 'ruler', group: 'Bedienung', name: 'Lineal', text: 'Blendet ein Lineal über der Seite ein – für ein einzelnes Portal oder über die Einstellungen für alle.', words: ['messen', 'Raster', 'Maß'], questions: ['Wie messe ich etwas auf der Seite?'] },
  { id: 'importBookmarks', group: 'Bedienung', name: 'Lesezeichen importieren', text: up(def(TERMS.importBookmarks)) + ' Schon vorhandene Sources werden übersprungen (Einstellungen, Zahnrad).', run: 'importBookmarks', words: ['Chrome', 'Safari', 'Firefox', 'Edge', 'Browser', 'übernehmen', 'HTML', 'Favoriten', 'Library füllen'], questions: ['Wie bekomme ich meine Lesezeichen aus Chrome?', 'Wie übernehme ich Lesezeichen aus Safari oder Firefox?'] },
  { id: 'sortHelp', group: 'Bedienung', name: 'Sortierhilfe', text: up(def(TERMS.sortHelp)) + ' „Alle Vorschläge übernehmen“ sortiert alles auf einmal. Öffnet sich nach einem Import mit vielen Sources ohne Kategorie von selbst (Einstellungen, Zahnrad).', run: 'sortHelp', words: ['sortieren', 'einsortieren', 'Kategorien zuordnen', 'aufräumen', 'Ohne Kategorie', 'ordnen', 'Import'], questions: ['Wie sortiere ich importierte Lesezeichen in Kategorien?'] },
  { id: 'origin', group: 'Begriffe', name: 'Herkunft einer Source', text: up(def(TERMS.origin)) + ' Ältere Sources zeigen „Herkunft unbekannt“. Die Angabe bleibt nur auf diesem Gerät und in der eigenen Sicherungsdatei.', words: ['wer', 'woher', 'wann', 'angelegt', 'Import', 'Datum', 'Quelle', 'Verlauf'], questions: ['Woher stammt eine Source?'] },
  { id: 'exportBookmarks', group: 'Bedienung', name: 'Library exportieren', text: up(def(TERMS.exportBookmarks)), run: 'exportBookmarks', words: ['Lesezeichen exportieren', 'Chrome', 'Safari', 'Firefox', 'Browser', 'HTML', 'sichern'], questions: ['Wie nehme ich meine Library in einen anderen Browser mit?'] },
  { id: 'profile', group: 'Bedienung', name: 'Profil', text: up(def(TERMS.profile)) + ' Name, Kennfarbe und Begrüßung stellst du unter Einstellungen (Zahnrad) › Profil ein; die Begrüßung lässt sich dort abschalten.', run: 'profile', words: ['Name', 'Begrüßung', 'Willkommen', 'Konto', 'Login', 'Anmelden', 'Kennfarbe', 'Initialen', 'Zuletzt offen', 'weitermachen', 'persönlich'], questions: ['Wie ändere ich meinen Namen oder die Begrüßung?'] },
  { id: 'reload', group: 'Bedienung', name: 'Neu laden', text: 'Lädt E-Sources neu, z. B. wenn unten links „Neue Version verfügbar“ steht. ' + up(def(TERMS.update)) + ' E-Sources prüft das beim Zurückkehren in die App und alle 30 Minuten von selbst.', run: 'reload', words: ['neue Version', 'Update', 'aktualisieren', 'neu starten', 'Version', 'iPhone', 'iPad', 'Startbildschirm', 'App'], questions: ['Wie bekomme ich die neue Version?'] },
  { id: 'exportDesks', group: 'Bedienung', name: 'Desks exportieren / importieren', text: 'Sichert alle Desks als Datei oder lädt sie wieder (Einstellungen, Zahnrad).', words: ['sichern', 'Backup', 'Datei', 'übertragen', 'anderes Gerät'], questions: ['Wie sichere ich meine Desks?', 'Wie übertrage ich alles auf ein anderes Gerät?'] },
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
