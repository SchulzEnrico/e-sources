/**
 * F-154: Kurzerklärungen der Oberflächen-Begriffe – eine Quelle für Tooltips,
 * aria-Beschreibungen und später Hilfe, Suche und Tour (F-156, F-95).
 * Aufbau: Desk → Slot → Stack → Portal → Tab; ein Portal zeigt eine Source.
 */
export const TERMS = {
  desk: 'Desk = eine eigene Arbeitsfläche mit Slots, in eigenem Fenster (z. B. auf einem zweiten Monitor) oder gesammelt im Main Desk',
  switchDesk: 'zeigt einen anderen Desk in diesem Browserfenster; ist er schon in einem eigenen Fenster offen, springt E-Sources dorthin. Alt/⌥+K wechselt zum nächsten gesammelten Desk, mit Umschalt zum vorigen',
  collected: 'gesammelt = Desk ohne eigenes Browserfenster; er wartet im Main Desk und ist über ⇄ oder Alt/⌥+K erreichbar, nichts geht verloren',
  collectDesks: 'Desks hier sammeln = alle Desks in dieses Browserfenster holen; ihre eigenen Fenster schließen sich, Slots, View und Farben bleiben',
  parked: 'Dieser Desk wartet jetzt im Main Desk und ist dort über ⇄ oder Alt/⌥+K erreichbar; nichts geht verloren. Dieses Browserfenster wird nicht mehr gebraucht.',
  distributeDesks: 'Auf Fenster verteilen = jeden gesammelten Desk wieder in einem eigenen Browserfenster öffnen, z. B. für einen zweiten Monitor',
  newDesk: '+ NewDesk = neuen, leeren Desk anlegen; er öffnet sich in einem eigenen Browserfenster (blockiert der Browser das, erscheint er hier)',
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
  profile: 'Profil = dein Name und deine Kennfarbe, nur in diesem Browser gespeichert (kein Konto, kein Server); E-Sources begrüßt dich damit beim Start und zeigt, was zuletzt offen war',
  library: 'Library = deine gespeicherten Sources; jedes Portal hat zusätzlich seine eigene Auswahl',
  design: 'Design = Aussehen von E-Sources: Darstellung (hell, dunkel oder wie das System) und Akzentfarbe, je Desk einstellbar',
  cockpit: 'Cockpit = Überblick über alle Desks; das Radar darin zeigt die Anordnung der Slots',
  focus: 'Fokusanzeige = wie viel gerade offen ist; Grün heißt gut überschaubar',
  update: 'Neue Version = E-Sources wurde inzwischen verbessert; „Neu laden“ holt sie, deine Desks, Portale und Library bleiben erhalten',
  adjust: 'Adjust = Größen der Portale per Tastatur oder Mausrad ändern (Alt/⌥+A)',
  origin: 'Herkunft = wer eine Source angelegt hat, wann und woher (von Hand, Launcher, Lesezeichen-Import mit Datei und Ordner, Beispiele oder Import der Arbeitsfläche); steht im Bearbeiten-Dialog und lässt sich suchen, z. B. „Import 22.11.2026“',
} as const;

/** F-161: Texte zu den Farben je Desk. */
export const DESK_LOOK_TEXT = {
  main: 'Gilt für den Main Desk und alle Desks ohne eigene Farben.',
  follows: (desk: string) => `${desk} folgt den Farben des Main Desk. Wählst du hier etwas, bekommt ${desk} eigene Farben.`,
  own: (desk: string) => `${desk} hat eigene Farben.`,
  follow: 'Wie Main Desk',
  followTitle: 'Eigene Farben dieses Desks löschen; er zeigt wieder die Farben des Main Desk',
  nowOwn: (desk: string) => `${desk} hat jetzt eigene Farben.`,
  nowFollows: (desk: string) => `${desk} folgt wieder den Farben des Main Desk.`,
  scope: (desk: string) => `Für ${desk}`,
  ownShort: ' · eigene Farben',
} as const;

/** F-162: Texte zu Rahmen- und Akzentfarbe je Slot und Portal. */
export const TINT_TEXT = {
  title: 'Farben',
  menu: '◐ Farben …',
  intro: 'Jedes Portal und jeder Slot kann eine eigene Rahmenfarbe (farbige Linie um das Portal) und Akzentfarbe (Leuchten, Portalname und Hervorhebungen im Portal) haben. Was du nicht wählst, kommt vom Slot und dann vom Desk.',
  portal: (name: string) => `Dieses Portal: ${name}`,
  slot: (name: string) => `Dieser Slot: ${name}`,
  slotNote: 'Gilt für alle Portale auf diesem Slot, die keine eigene Farbe haben.',
  short: 'Rahmen = Linie um das Portal, Akzent = Leuchten und Portalname. Was du nicht wählst, kommt vom Slot, dann vom Desk.',
  frame: 'Rahmen',
  accent: 'Akzent',
  likeSlot: 'Wie Slot',
  likeDesk: 'Wie Desk',
  noFrame: 'Ohne',
  own: 'Eigene Farbe',
  offer: 'Farbe wählen …',
  unnamed: 'ohne Namen',
  resetOne: 'Alles wie Desk',
  resetOneTitle: 'Rahmen- und Akzentfarbe dieses Portals und seines Slots löschen; es gelten wieder die Farben des Desks',
  resetOneDone: (name: string) => `„${name}“ und sein Slot zeigen wieder die Farben des Desks.`,
  deskHead: 'Slots und Portale',
  deskNone: 'Kein Slot und kein Portal dieses Desks hat eigene Farben.',
  deskSome: (n: number) => `${n === 1 ? '1 Slot oder Portal hat' : `${n} Slots und Portale haben`} eigene Farben.`,
  resetAll: 'Alle auf Desk-Farben zurücksetzen',
  resetAllDone: (n: number) => `Farben von ${n === 1 ? '1 Slot oder Portal' : `${n} Slots und Portalen`} zurückgesetzt – alle zeigen wieder die Farben des Desks.`,
  undo: 'Rückgängig',
  added: (what: string) => `${what} angelegt.`,
  said: (where: string, kind: string, value: string) => `${where}: ${kind} ${value}.`,
} as const;

/** F-185: Herkunft einer Source in Worten (ORIGIN_TEXT[via]). */
export const ORIGIN_TEXT = {
  hand: 'von Hand gespeichert',
  launcher: 'im Launcher gespeichert',
  import: 'aus Lesezeichen-Import',
  sample: 'aus den Beispielen',
  workspace: 'aus Import der Arbeitsfläche',
  unknown: 'Herkunft unbekannt (angelegt vor dieser Angabe)',
} as const;
