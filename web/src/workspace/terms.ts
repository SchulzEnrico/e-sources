/**
 * F-154: Kurzerklärungen der Oberflächen-Begriffe – eine Quelle für Tooltips,
 * aria-Beschreibungen und später Hilfe, Suche und Tour (F-156, F-95).
 * Aufbau: Desk → Slot → Stack → Portal → Tab; ein Portal zeigt eine Source.
 */
export const TERMS = {
  desk: 'Desk = ein Fenster von E-Sources, z. B. für einen zweiten Monitor',
  newDesk: '+ NewDesk = neuen, leeren Desk anlegen; er öffnet sich in einem eigenen Browserfenster',
  dashboard: 'Dashboard = alle Slots eines Desks auf einmal',
  view: 'View schaltet um: Dashboard → 2 × 2 → 2 → Solo',
  slot: 'Slot = ein Platz im Raster des Desks; darauf liegen ein oder mehrere Portale',
  stack: 'Stack = mehrere Portale übereinander auf einem Slot (höchstens 9); vorn liegt das sichtbare',
  portal: 'Portal = Rahmen mit Adresszeile und Tabs, der eine Source zeigt',
  source: 'Source = eine Webseite, die in einem Portal läuft',
  library: 'Library = deine gespeicherten Sources; jedes Portal hat zusätzlich seine eigene Auswahl',
  cockpit: 'Cockpit = Überblick über alle Desks; das Radar darin zeigt die Anordnung der Slots',
  focus: 'Fokusanzeige = wie viel gerade offen ist; Grün heißt gut überschaubar',
  adjust: 'Adjust = Größen der Portale per Tastatur oder Mausrad ändern (Alt/⌥+A)',
} as const;
