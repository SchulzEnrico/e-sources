/**
 * F-154: Kurzerklärungen der Oberflächen-Begriffe – eine Quelle für Tooltips,
 * aria-Beschreibungen und später Hilfe, Suche und Tour (F-156, F-95).
 * Aufbau: Desk → Slot → Stack → Portal → Tab; ein Portal zeigt eine Source.
 */
export const TERMS = {
  desk: 'Desk = ein Fenster von E-Sources, z. B. für einen zweiten Monitor',
  switchDesk: 'zeigt einen anderen Desk in diesem Browserfenster; ist er schon in einem eigenen Fenster offen, springt E-Sources dorthin',
  newDesk: '+ NewDesk = neuen, leeren Desk anlegen; er öffnet sich in einem eigenen Browserfenster',
  dashboard: 'Dashboard = alle Slots eines Desks auf einmal',
  view: 'View schaltet um: Dashboard → 2 × 2 → 2 → Solo',
  slot: 'Slot = ein Platz im Raster des Desks; darauf liegen ein oder mehrere Portale',
  stack: 'Stack = mehrere Portale übereinander auf einem Slot (höchstens 9); vorn liegt das sichtbare',
  portal: 'Portal = Rahmen mit Adresszeile und Tabs, der eine Source zeigt',
  source: 'Source = eine Webseite, die in einem Portal läuft',
  launcher: 'Launcher = schwebendes Menü für Sources, die sich nicht in einem Portal anzeigen lassen; ein Klick öffnet sie in einem neuen Browser-Tab oder Fenster',
  importBookmarks: 'Lesezeichen importieren = Lesezeichen aus Chrome, Safari, Firefox oder Edge in die Library übernehmen; im Browser vorher „Lesezeichen exportieren“ wählen (HTML-Datei), Ordner werden zu Kategorien',
  exportBookmarks: 'Library exportieren = alle Sources als Lesezeichen-Datei (HTML) speichern, die jeder Browser importieren kann; Kategorien werden Ordner',
  sortHelp: 'Sortierhilfe = Sources ohne Kategorie nach Domain gebündelt einsortieren; eine Entscheidung gilt für die ganze Gruppe, Vorschläge kommen aus deiner Library oder für bekannte Seiten',
  library: 'Library = deine gespeicherten Sources; jedes Portal hat zusätzlich seine eigene Auswahl',
  design: 'Design = Aussehen von E-Sources: Darstellung (hell, dunkel oder wie das System) und Akzentfarbe',
  cockpit: 'Cockpit = Überblick über alle Desks; das Radar darin zeigt die Anordnung der Slots',
  focus: 'Fokusanzeige = wie viel gerade offen ist; Grün heißt gut überschaubar',
  adjust: 'Adjust = Größen der Portale per Tastatur oder Mausrad ändern (Alt/⌥+A)',
} as const;
