/**
 * F-156: Eine Liste aller Funktionen und Begriffe – Quelle für Hilfe (?), Suche und später die
 * Tour (F-95). Begriffe kommen aus TERMS (F-154), damit jeder Text nur an einer Stelle steht.
 * Funktionen mit `run` lassen sich aus der Suche ausführen (Enter); Umschalt+Enter öffnet die Hilfe.
 */
import { TERMS } from './terms';

/** Was die Oberfläche ausführen kann; App.tsx ordnet jedem Wert die passende Aktion zu. */
export type HelpRun = 'help' | 'cockpit' | 'view' | 'adjust' | 'distribute' | 'maximize' | 'newSlot' | 'newDesk' | 'search' | 'tour' | 'tourCockpit' | 'design' | 'tourDesign' | 'toursAuto';

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
  { id: 'dashboard', group: 'Begriffe', name: 'Dashboard', text: up(def(TERMS.dashboard)), keys: 'Esc', words: ['Übersicht', 'alle', 'Arbeitsfläche'] },
  { id: 'focus', group: 'Begriffe', name: 'Fokusanzeige', text: up(def(TERMS.focus)) + ' Ein Portal zählt 1 Punkt, jeder weitere Tab 0,5.', words: ['Fokus', 'Ampel', 'Punkte', 'grün', 'gelb', 'rot', 'Gesamtfokus'] },

  // Ansicht
  { id: 'cockpit', group: 'Ansicht', name: 'Cockpit', text: up(def(TERMS.cockpit)), keys: 'Strg/⌘+.', run: 'cockpit', words: ['Radar', 'Überblick', 'Fokus-Radar', 'Lagekarte'] },
  { id: 'view', group: 'Ansicht', name: 'View umschalten', text: 'Schaltet weiter: Dashboard → 2 × 2 → 2 → Solo. Esc führt zurück zum Dashboard.', run: 'view', words: ['Ansicht', 'Solo', 'zwei', 'vier', '2x2'] },
  { id: 'maximize', group: 'Ansicht', name: 'Portal maximieren', text: 'Zeigt das aktive Portal allein auf dem ganzen Desk (Knopf ⤢ im Portal). Esc führt zurück.', keys: 'M im Adjust', run: 'maximize', words: ['groß', 'Vollbild', 'Solo', 'ganzer Bildschirm'] },
  { id: 'search', group: 'Ansicht', name: 'Suchen', text: 'Findet Portale, Sources der Library und Funktionen. Pfeiltasten wählen, Enter öffnet, Umschalt+Enter zeigt die Hilfe.', keys: 'Strg/⌘+K oder /', run: 'search', words: ['finden', 'Suche'] },
  { id: 'tour', group: 'Ansicht', name: 'Tour', text: 'Kurze Einführung, die Schritt für Schritt auf die wichtigsten Bedienelemente zeigt. Pfeiltasten blättern, Esc beendet.', run: 'tour', words: ['Einführung', 'Rundgang', 'erste Schritte', 'Anleitung'] },
  { id: 'tourCockpit', group: 'Ansicht', name: 'Tour „Cockpit“', text: 'Kurze Einführung ins Cockpit: Fokusanzeige, Radar, Portale verschieben und holen. Startet beim ersten Öffnen des Cockpits von selbst.', run: 'tourCockpit', words: ['Cockpit-Tour', 'Einführung Cockpit', 'Radar erklärt', 'Rundgang'] },
  { id: 'tourDesign', group: 'Ansicht', name: 'Tour „Design“', text: 'Kurze Einführung in „Design anpassen“: Darstellung, Akzentfarbe und eigene Farbe. Startet beim ersten Öffnen des Dialogs von selbst.', run: 'tourDesign', words: ['Design-Tour', 'Einführung Design', 'Farben erklärt', 'Rundgang'] },
  { id: 'toursAuto', group: 'Ansicht', name: 'Touren automatisch zeigen', text: 'Schaltet ein oder aus, ob Touren beim ersten Mal von selbst starten (Einstellungen, Zahnrad). Von Hand starten geht immer.', run: 'toursAuto', words: ['nicht mehr anzeigen', 'Tour aus', 'Einführung abschalten', 'automatisch'] },
  { id: 'help', group: 'Ansicht', name: 'Hilfe', text: 'Zeigt alle Funktionen und Begriffe mit Tastenkürzeln.', keys: '?', run: 'help', words: ['Glossar', 'Tastenkürzel', 'Kürzel', 'Erklärung', 'Anleitung'] },

  // Anlegen
  { id: 'newSlot', group: 'Anlegen', name: '+ NewSlot', text: 'Legt einen neuen Slot an – als Spalte rechts oder Zeile unten. Ist der Bildschirm voll, kommen weitere Portale über das Plus eines Portals auf seinen Slot.', run: 'newSlot', words: ['neu', 'Slot anlegen', 'Spalte', 'Zeile', 'NewArea'] },
  { id: 'newDesk', group: 'Anlegen', name: '+ NewDesk', text: up(def(TERMS.newDesk)), run: 'newDesk', words: ['neu', 'Fenster', 'zweiter Monitor'] },
  { id: 'newPortal', group: 'Anlegen', name: 'Neues Portal auf einen Slot', text: 'Das Plus in der Kopfzeile eines Portals legt ein weiteres Portal auf denselben Slot; es entsteht ein Stack.', words: ['Portal anlegen', 'Panel', 'stapeln'] },
  { id: 'newTab', group: 'Anlegen', name: 'Neuer Tab', text: 'Das Plus neben den Tabs öffnet einen weiteren Tab im Portal (zählt 0,5 Fokus-Punkte).', words: ['Tab anlegen', 'Reiter'] },
  { id: 'switchDesk', group: 'Anlegen', name: 'Desk wechseln (⇄)', text: up(def(TERMS.switchDesk)), words: ['umschalten', 'anderer Desk', 'Fenster'] },

  { id: 'design', group: 'Ansicht', name: 'Design anpassen', text: up(def(TERMS.design)) + ' Später auch Farben je Desk, Slot und Portal.', run: 'design', words: ['Farbe', 'Akzentfarbe', 'Darstellung', 'Theme', 'hell', 'dunkel', 'Aussehen', 'Look'] },

  // Bedienung
  { id: 'adjust', group: 'Bedienung', name: 'Adjust', text: 'Größen der Portale per Tastatur oder Mausrad ändern: Pfeile oder W A S D verschieben die Kante, Umschalt die andere, Tab wechselt den Slot, M maximiert. Leertaste, Enter oder Esc beendet.', keys: 'Alt/⌥+A', run: 'adjust', words: ['Größe', 'Größen-Modus', 'breiter', 'schmaler', 'höher', 'Kante'] },
  { id: 'distribute', group: 'Bedienung', name: 'Gleich verteilen', text: 'Macht alle Slots dieses Desks gleich groß.', keys: 'Alt/⌥+G', run: 'distribute', words: ['gleich groß', 'ordnen', 'aufräumen', 'Größe'] },
  { id: 'swap', group: 'Bedienung', name: 'Portale tauschen oder versetzen', text: 'Portal am Namen ziehen: auf die Mitte eines anderen Portals = tauschen, an den Rand = dort einsetzen.', words: ['verschieben', 'ziehen', 'Drag', 'umsortieren'] },
  { id: 'rename', group: 'Bedienung', name: 'Umbenennen', text: 'Doppelklick auf den Namen eines Portals oder Stack-Eintrags; den Desk-Namen per Klick.', keys: 'F2', words: ['Name', 'benennen'] },
  { id: 'stackDelete', group: 'Bedienung', name: 'Portal aus dem Stack entfernen', text: 'In der Stack-Leiste den Eintrag wählen und Entf drücken.', keys: 'Entf', words: ['löschen', 'schließen', 'Stapel'] },
  { id: 'ruler', group: 'Bedienung', name: 'Lineal', text: 'Blendet ein Lineal über der Seite ein – für ein einzelnes Portal oder über die Einstellungen für alle.', words: ['messen', 'Raster', 'Maß'] },
  { id: 'exportDesks', group: 'Bedienung', name: 'Desks exportieren / importieren', text: 'Sichert alle Desks als Datei oder lädt sie wieder (Einstellungen, Zahnrad).', words: ['sichern', 'Backup', 'Datei', 'übertragen', 'anderes Gerät'] },
];

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
