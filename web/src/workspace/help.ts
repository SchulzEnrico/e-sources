/**
 * F-156: Eine Liste aller Funktionen und Begriffe – Quelle für Hilfe (?), Suche und später die
 * Tour (F-95). Begriffe kommen aus TERMS (F-154), damit jeder Text nur an einer Stelle steht.
 * Funktionen mit `run` lassen sich aus der Suche ausführen (Enter); Umschalt+Enter öffnet die Hilfe.
 */
import { TERMS } from './terms';

/** Was die Oberfläche ausführen kann; App.tsx ordnet jedem Wert die passende Aktion zu. */
export type HelpRun = 'help' | 'cockpit' | 'view' | 'adjust' | 'distribute' | 'maximize' | 'newSlot' | 'newDesk' | 'search' | 'tour' | 'tourCockpit' | 'design' | 'tourDesign' | 'toursAuto' | 'restore' | 'closed' | 'focusRule' | 'launcher' | 'importBookmarks' | 'exportBookmarks' | 'sortHelp' | 'tourImport' | 'profile' | 'reload' | 'collectDesks' | 'distributeDesks' | 'nextDesk';

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
  { id: 'desk', group: 'Begriffe', name: 'Desk', text: up(def(TERMS.desk)), words: ['Fenster', 'Monitor', 'Bildschirm', 'Arbeitsfläche'] },
  { id: 'slot', group: 'Begriffe', name: 'Slot', text: up(def(TERMS.slot)), words: ['Area', 'Platz', 'Raster', 'Bereich'] },
  { id: 'stack', group: 'Begriffe', name: 'Stack', text: up(def(TERMS.stack)), keys: '▲/▼ · Mausrad', words: ['Stapel', 'übereinander', 'blättern'] },
  { id: 'portal', group: 'Begriffe', name: 'Portal', text: up(def(TERMS.portal)), words: ['Panel', 'Rahmen', 'Adresszeile'] },
  { id: 'source', group: 'Begriffe', name: 'Source', text: up(def(TERMS.source)), words: ['Webseite', 'Seite', 'Lesezeichen', 'Link'] },
  { id: 'library', group: 'Begriffe', name: 'Library', text: up(def(TERMS.library)), words: ['Lesezeichen', 'Sammlung', 'Favoriten'] },
  { id: 'launcher', group: 'Begriffe', name: 'Launcher', text: up(def(TERMS.launcher)) + ' Sources der Library landen von selbst darin, wenn sich ihre Seite nicht einbetten lässt. Öffnet sich direkt unter seinem Knopf; verschiebbar (Doppelklick auf den Kopf holt ihn zurück zum Knopf), schließt bei Klick daneben und lässt sich zu einem Symbol einklappen; in der Suche mit „neuer Tab“ gekennzeichnet.', keys: 'Alt/⌥+L', run: 'launcher', words: ['Ablage', 'nur im neuen Tab', 'gesperrt', 'extern', 'außerhalb', 'nicht einbettbar', 'Menü'] },
  { id: 'dashboard', group: 'Begriffe', name: 'Dashboard', text: up(def(TERMS.dashboard)), keys: 'Esc', words: ['Übersicht', 'alle', 'Arbeitsfläche'] },
  { id: 'focus', group: 'Begriffe', name: 'Fokusanzeige', text: up(def(TERMS.focus)) + ' Ein Portal zählt 1 Punkt, jeder weitere Tab 0,5; voreingestellt grün bis 9, gelb bis 13, orange bis 16, darüber rot. Änderbar unter „Fokusanzeige anpassen“.', words: ['Fokus', 'Ampel', 'Punkte', 'grün', 'gelb', 'rot', 'Gesamtfokus'] },

  // Ansicht
  { id: 'cockpit', group: 'Ansicht', name: 'Cockpit', text: up(def(TERMS.cockpit)), keys: 'Strg/⌘+.', run: 'cockpit', words: ['Radar', 'Überblick', 'Fokus-Radar', 'Lagekarte'] },
  { id: 'view', group: 'Ansicht', name: 'View umschalten', text: 'Schaltet weiter: Dashboard → 2 × 2 → 2 → Solo. Esc führt zurück zum Dashboard.', run: 'view', words: ['Ansicht', 'Solo', 'zwei', 'vier', '2x2'] },
  { id: 'maximize', group: 'Ansicht', name: 'Portal maximieren', text: 'Zeigt das aktive Portal allein auf dem ganzen Desk (Knopf ⤢ im Portal). Esc führt zurück.', keys: 'M im Adjust', run: 'maximize', words: ['groß', 'Vollbild', 'Solo', 'ganzer Bildschirm'] },
  { id: 'search', group: 'Ansicht', name: 'Suchen', text: 'Findet Portale, Sources der Library und Funktionen. Pfeiltasten wählen, Enter öffnet, Umschalt+Enter zeigt die Hilfe.', keys: 'Strg/⌘+K oder /', run: 'search', words: ['finden', 'Suche'] },
  { id: 'tour', group: 'Ansicht', name: 'Tour', text: 'Kurze Einführung, die Schritt für Schritt auf die wichtigsten Bedienelemente zeigt. Pfeiltasten blättern, Esc beendet.', run: 'tour', words: ['Einführung', 'Rundgang', 'erste Schritte', 'Anleitung'] },
  { id: 'tourCockpit', group: 'Ansicht', name: 'Tour „Cockpit“', text: 'Kurze Einführung ins Cockpit: Fokusanzeige, Radar, Portale verschieben und holen. Startet beim ersten Öffnen des Cockpits von selbst.', run: 'tourCockpit', words: ['Cockpit-Tour', 'Einführung Cockpit', 'Radar erklärt', 'Rundgang'] },
  { id: 'tourDesign', group: 'Ansicht', name: 'Tour „Design“', text: 'Kurze Einführung in „Design anpassen“: Darstellung, Akzentfarbe und eigene Farbe. Startet beim ersten Öffnen des Dialogs von selbst.', run: 'tourDesign', words: ['Design-Tour', 'Einführung Design', 'Farben erklärt', 'Rundgang'] },
  { id: 'tourImport', group: 'Ansicht', name: 'Tour „Import“', text: 'Kurze Einführung, wie du Lesezeichen aus Chrome, Safari, Firefox oder Edge holst, wie fein die Ordner zu Kategorien werden und was die Sortierhilfe danach tut. Startet beim ersten Import von selbst.', run: 'tourImport', words: ['Import-Tour', 'Einführung Import', 'Lesezeichen übernehmen', 'Browser', 'Chrome', 'Safari', 'Firefox', 'Edge', 'Rundgang'] },
  { id: 'toursAuto', group: 'Ansicht', name: 'Touren automatisch zeigen', text: 'Schaltet ein oder aus, ob Touren beim ersten Mal von selbst starten (Einstellungen, Zahnrad). Von Hand starten geht immer.', run: 'toursAuto', words: ['nicht mehr anzeigen', 'Tour aus', 'Einführung abschalten', 'automatisch'] },
  { id: 'help', group: 'Ansicht', name: 'Hilfe', text: 'Zeigt alle Funktionen und Begriffe mit Tastenkürzeln.', keys: '?', run: 'help', words: ['Glossar', 'Tastenkürzel', 'Kürzel', 'Erklärung', 'Anleitung'] },

  // Anlegen
  { id: 'newSlot', group: 'Anlegen', name: '+ NewSlot', text: 'Legt einen neuen Slot an – als Spalte rechts oder Zeile unten. Ist der Bildschirm voll, kommen weitere Portale über das Plus eines Portals auf seinen Slot.', run: 'newSlot', words: ['neu', 'Slot anlegen', 'Spalte', 'Zeile', 'NewArea'] },
  { id: 'newDesk', group: 'Anlegen', name: '+ NewDesk', text: up(def(TERMS.newDesk)), run: 'newDesk', words: ['neu', 'Fenster', 'zweiter Monitor'] },
  { id: 'newPortal', group: 'Anlegen', name: 'Neues Portal auf einen Slot', text: 'Das Plus in der Kopfzeile eines Portals legt ein weiteres Portal auf denselben Slot; es entsteht ein Stack.', words: ['Portal anlegen', 'Panel', 'stapeln'] },
  { id: 'newTab', group: 'Anlegen', name: 'Neuer Tab', text: 'Das Plus neben den Tabs öffnet einen weiteren Tab im Portal (zählt 0,5 Fokus-Punkte).', words: ['Tab anlegen', 'Reiter'] },
  { id: 'switchDesk', group: 'Anlegen', name: 'Desk wechseln (⇄)', text: up(def(TERMS.switchDesk)), keys: 'Alt/⌥+K · Alt/⌥+Umschalt+K', run: 'nextDesk', words: ['umschalten', 'anderer Desk', 'Fenster', 'nächster Desk', 'voriger Desk'] },
  { id: 'collected', group: 'Begriffe', name: 'Gesammelter Desk', text: up(def(TERMS.collected)), words: ['ein Bildschirm', 'Notebook', 'ohne Fenster', 'geschlossen', 'Main Desk'] },
  { id: 'collectDesks', group: 'Anlegen', name: 'Desks hier sammeln', text: up(def(TERMS.collectDesks)) + ' Auch im Umschalter ⇄ und im Cockpit.', run: 'collectDesks', words: ['zusammenführen', 'ein Fenster', 'Notebook', 'Fenster schließen', 'aufräumen'] },
  { id: 'distributeDesks', group: 'Anlegen', name: 'Auf Fenster verteilen', text: up(def(TERMS.distributeDesks)) + ' Lässt der Browser nur ein neues Fenster zu, Pop-ups für E-Sources erlauben. Auch im Umschalter ⇄ und im Cockpit.', run: 'distributeDesks', words: ['zweiter Monitor', 'mehrere Fenster', 'aufteilen', 'öffnen'] },

  { id: 'design', group: 'Ansicht', name: 'Design anpassen', text: up(def(TERMS.design)) + ' Später auch Farben je Desk, Slot und Portal.', run: 'design', words: ['Farbe', 'Akzentfarbe', 'Darstellung', 'Theme', 'hell', 'dunkel', 'Aussehen', 'Look'] },

  // Bedienung
  { id: 'adjust', group: 'Bedienung', name: 'Adjust', text: 'Größen der Portale per Tastatur oder Mausrad ändern: Pfeile oder W A S D verschieben die Kante, Umschalt die andere, Tab wechselt den Slot, M maximiert. Leertaste, Enter oder Esc beendet.', keys: 'Alt/⌥+A', run: 'adjust', words: ['Größe', 'Größen-Modus', 'breiter', 'schmaler', 'höher', 'Kante'] },
  { id: 'focusRule', group: 'Bedienung', name: 'Fokusanzeige anpassen', text: 'Legt fest, bis wie viele Punkte die Fokusanzeige grün, gelb und orange zeigt und wie viel ein weiterer Tab zählt (Einstellungen, Zahnrad). „Voreinstellung“ setzt alles zurück.', run: 'focusRule', words: ['Grenzen', 'Ampel', 'Punkte', 'Fokus einstellen', 'Schwelle', 'grün', 'rot'] },
  { id: 'restore', group: 'Bedienung', name: 'Wiederherstellen', text: 'Holt das zuletzt geschlossene Portal (mit allen Tabs und Verlauf) oder den zuletzt geschlossenen Tab zurück – an die alte Stelle, wenn es sie noch gibt. Nach dem Schließen steht dafür auch ein Knopf im Hinweis unten.', keys: 'Alt/⌥+Z', run: 'restore', words: ['rückgängig', 'zurückholen', 'versehentlich geschlossen', 'Undo', 'wieder öffnen'] },
  { id: 'closed', group: 'Bedienung', name: 'Zuletzt geschlossen', text: 'Liste der letzten 10 geschlossenen Portale und Tabs dieses Desks; jeder Eintrag lässt sich einzeln zurückholen (Einstellungen, Zahnrad). Bleibt beim Neuladen erhalten.', run: 'closed', words: ['Verlauf', 'geschlossene Tabs', 'geschlossene Portale', 'Papierkorb', 'wiederherstellen'] },
  { id: 'nextTab', group: 'Bedienung', name: 'Nächster / voriger Tab', text: 'Wechselt im aktiven Portal zum nächsten Tab, mit Umschalt zum vorigen, und sagt an, welcher es ist. Steht der Fokus auf einem Tab, gehen auch die Pfeiltasten.', keys: 'Alt/⌥+T · Umschalt+Alt/⌥+T', words: ['Tab wechseln', 'Reiter', 'weiterschalten', 'Strg+Tab'] },
  { id: 'nextPortal', group: 'Bedienung', name: 'Nächstes / voriges Portal', text: 'Macht das nächste Portal aktiv (von links oben nach rechts unten), mit Umschalt das vorige, und sagt an, welches es ist. Im Solo-View wird das gezeigte Portal mitgewechselt.', keys: 'Alt/⌥+P · Umschalt+Alt/⌥+P', words: ['Portal wechseln', 'Panel', 'weiterschalten', 'aktiv'] },
  { id: 'distribute', group: 'Bedienung', name: 'Gleich verteilen', text: 'Macht alle Slots dieses Desks gleich groß.', keys: 'Alt/⌥+G', run: 'distribute', words: ['gleich groß', 'ordnen', 'aufräumen', 'Größe'] },
  { id: 'swap', group: 'Bedienung', name: 'Portale tauschen oder versetzen', text: 'Portal am Namen ziehen: auf die Mitte eines anderen Portals = tauschen, an den Rand = dort einsetzen.', words: ['verschieben', 'ziehen', 'Drag', 'umsortieren'] },
  { id: 'rename', group: 'Bedienung', name: 'Umbenennen', text: 'Doppelklick auf den Namen eines Portals oder Stack-Eintrags; den Desk-Namen per Klick.', keys: 'F2', words: ['Name', 'benennen'] },
  { id: 'stackDelete', group: 'Bedienung', name: 'Portal aus dem Stack entfernen', text: 'In der Stack-Leiste den Eintrag wählen und Entf drücken.', keys: 'Entf', words: ['löschen', 'schließen', 'Stapel'] },
  { id: 'ruler', group: 'Bedienung', name: 'Lineal', text: 'Blendet ein Lineal über der Seite ein – für ein einzelnes Portal oder über die Einstellungen für alle.', words: ['messen', 'Raster', 'Maß'] },
  { id: 'importBookmarks', group: 'Bedienung', name: 'Lesezeichen importieren', text: up(def(TERMS.importBookmarks)) + ' Schon vorhandene Sources werden übersprungen (Einstellungen, Zahnrad).', run: 'importBookmarks', words: ['Chrome', 'Safari', 'Firefox', 'Edge', 'Browser', 'übernehmen', 'HTML', 'Favoriten', 'Library füllen'] },
  { id: 'sortHelp', group: 'Bedienung', name: 'Sortierhilfe', text: up(def(TERMS.sortHelp)) + ' „Alle Vorschläge übernehmen“ sortiert alles auf einmal. Öffnet sich nach einem Import mit vielen Sources ohne Kategorie von selbst (Einstellungen, Zahnrad).', run: 'sortHelp', words: ['sortieren', 'einsortieren', 'Kategorien zuordnen', 'aufräumen', 'Ohne Kategorie', 'ordnen', 'Import'] },
  { id: 'exportBookmarks', group: 'Bedienung', name: 'Library exportieren', text: up(def(TERMS.exportBookmarks)), run: 'exportBookmarks', words: ['Lesezeichen exportieren', 'Chrome', 'Safari', 'Firefox', 'Browser', 'HTML', 'sichern'] },
  { id: 'profile', group: 'Bedienung', name: 'Profil', text: up(def(TERMS.profile)) + ' Name, Kennfarbe und Begrüßung stellst du unter Einstellungen (Zahnrad) › Profil ein; die Begrüßung lässt sich dort abschalten.', run: 'profile', words: ['Name', 'Begrüßung', 'Willkommen', 'Konto', 'Login', 'Anmelden', 'Kennfarbe', 'Initialen', 'Zuletzt offen', 'weitermachen', 'persönlich'] },
  { id: 'reload', group: 'Bedienung', name: 'Neu laden', text: 'Lädt E-Sources neu, z. B. wenn unten links „Neue Version verfügbar“ steht. ' + up(def(TERMS.update)) + ' E-Sources prüft das beim Zurückkehren in die App und alle 30 Minuten von selbst.', run: 'reload', words: ['neue Version', 'Update', 'aktualisieren', 'neu starten', 'Version', 'iPhone', 'iPad', 'Startbildschirm', 'App'] },
  { id: 'exportDesks', group: 'Bedienung', name: 'Desks exportieren / importieren', text: 'Sichert alle Desks als Datei oder lädt sie wieder (Einstellungen, Zahnrad).', words: ['sichern', 'Backup', 'Datei', 'übertragen', 'anderes Gerät'] },
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
    const extra = fold((e.words ?? []).join(' '));
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

export const helpById = (id: string): HelpEntry | undefined => HELP.find((e) => e.id === id);
