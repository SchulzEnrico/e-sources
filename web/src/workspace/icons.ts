/**
 * F-183: Ein Symbolsatz für alle benannten Elemente und Funktionen – jedes Symbol ist nur hier
 * festgelegt. Strichzeichnungen (stroke = currentColor), Raster 16 × 16, sofern `vb` nichts anderes
 * sagt. Barrierefreiheit (NF-03): Symbole stehen nie allein – der Name bleibt als Text, Tooltip oder
 * aria-label; neben Text sind sie aria-hidden.
 */

export interface IconDef {
  /** Pfade (SVG-`d`), jeder als eigener Strich. */
  d: string[];
  /** Eigenes Raster, Standard 16. */
  vb?: number;
  /** Strichstärke im eigenen Raster, Standard 1.4. */
  w?: number;
  /** Fläche füllen (z. B. gefüllter Stern). */
  fill?: boolean;
}

const ring = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;

export const ICONS = {
  // Aufbau: Desk → Slot → Stack → Portal → Tab; ein Portal zeigt eine Source
  desk: { d: ['M2 2.5h12v8.5H2z', 'M5.5 14h5', 'M8 11v3'] },
  slot: { d: ['M2 2h12v12H2z', 'M8 2v12', 'M2 8h6'] },
  stack: { d: ['M5 5h9v9H5z', 'M2.5 11.5V2.5h9'] },
  portal: { d: ['M2 2.5h12v11H2z', 'M2 5.5h12', 'M4 4h.01', 'M6 4h.01'] },
  tab: { d: ['M1.5 13.5h13', 'M2.5 13.5V6h4.5l1-2.5h4l1 2.5V13.5'] },
  source: { d: [ring(8, 8, 6), 'M2 8h12', 'M8 2c2.2 2.2 2.2 9.8 0 12', 'M8 2c-2.2 2.2-2.2 9.8 0 12'] },
  library: { d: ['M2.5 2.5h3v11h-3z', 'M6.5 2.5h3v11h-3z', 'M10.3 3.4l2.4-.7 2 9.9-2.4.7z'] },
  category: { d: ['M2 2.5h5.5l6.5 6.5-5 5L2.5 7.5z', 'M5 5.2h.01'] },
  // F-206: Notiz und Ansichten
  note: { d: ['M3 1.5h7l3 3v10H3z', 'M10 1.5v3h3', 'M5.5 8h5', 'M5.5 10.5h5'] },
  todo: { d: ['M2 2.5h3v3H2z', 'M7 4h7', 'M2 10.5h3v3H2z', 'M7 12h7', 'M2.6 12l.8.8 1.5-1.7'] },
  kanban: { d: ['M2 2.5h3.5v11H2z', 'M6.25 2.5h3.5v7h-3.5z', 'M10.5 2.5H14v4.5h-3.5z'] },
  matrix: { d: ['M2 2h12v12H2z', 'M8 2v12', 'M2 8h12'] },
  // V99 (F-206 Schritt 10): Projekt – Balken wie im Gantt, versetzt untereinander
  project: { d: ['M2 2v12', 'M4 4h5', 'M6 8h6', 'M9 12h5'] },
  // V100: PSP – Kasten oben, drei darunter (Baum)
  psp: { d: ['M6 1.5h4v3H6z', 'M8 4.5v3', 'M3 7.5h10', 'M3 7.5v2', 'M8 7.5v2', 'M13 7.5v2', 'M1.5 9.5h3v3h-3z', 'M6.5 9.5h3v3h-3z', 'M11.5 9.5h3v3h-3z'] },
  // F-206 Schritt 3: Pad = schwebendes Fenster über dem Desk
  // F-206 Schritt 4 (V81): Dock = Leiste am rechten Rand, einklappen zur Lasche
  dock: { d: ['M1.5 2.5h13v11h-13z', 'M10 2.5v11', 'M11.8 5h1', 'M11.8 7h1'] },
  dockFold: { d: ['M10 2.5v11', 'M5 5l3 3-3 3'] },
  dockOpen: { d: ['M6 2.5v11', 'M11 5L8 8l3 3'] },
  pad: { d: ['M1.5 1.5h9v8h-9z', 'M5.5 5.5h9v9h-9z', 'M5.5 8h9'] },
  // V83 (F-206 Schritt 5, N1): Notizen & Aufgaben – Blatt mit Zeile und Haken
  notesTasks: { d: ['M3 1.5h7l3 3v10H3z', 'M10 1.5v3h3', 'M5.5 6.5h5', 'M5.5 10.5l1.5 1.5 3-3.5'] },
  newPad: { d: ['M1.5 1.5h9v8h-9z', 'M5.5 5.5h9v9h-9z', 'M10 9.5v3.5', 'M8.25 11.25h3.5'] },
  // V68: Deckkraft (halb gefüllter Kreis)
  contrast: { d: ['M8 2a6 6 0 1 0 0 12a6 6 0 1 0 0-12z', 'M8 2v12', 'M8 4.5h4', 'M8 7h5.6', 'M8 9.5h5.6', 'M8 12h4'] },
  // F-206 Notiz-Leiste
  task: { d: ['M2.5 3.5h4v4h-4z', 'M3.4 5.5l.9.9 1.4-1.6', 'M9 5.5h5', 'M2.5 10h4v4h-4z', 'M9 12h5'] },
  list: { d: ['M6 4h8', 'M6 8h8', 'M6 12h8', 'M2.5 4h.01', 'M2.5 8h.01', 'M2.5 12h.01'], w: 1.6 },
  heading: { d: ['M4 3v10', 'M12 3v10', 'M4 8h8'], w: 1.6 },
  bold: { d: ['M4.5 2.5h4a2.75 2.75 0 0 1 0 5.5h-4z', 'M4.5 8h4.8a2.75 2.75 0 0 1 0 5.5H4.5z'], w: 1.7 },
  trash: { d: ['M2.5 4.5h11', 'M6 4.5V2.5h4v2', 'M4 4.5l.8 9.5h6.4l.8-9.5', 'M6.6 7v4.5', 'M9.4 7v4.5'] },
  // F-170: Slotmaschine – Gehäuse mit drei Walzen und Hebel
  jackpot: { d: ['M1.5 5h9v9h-9z', 'M4 8v3', 'M6 8v3', 'M8 8v3', 'M10.5 10.5h2.5V4', ring(13, 2.8, 1.2)] },
  launcher: { d: ['M7 2.5H3.5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V9', 'M9.5 2.5h4v4', 'M13.3 2.7 7.8 8.2'], w: 1.3 },
  cockpit: { d: ['M2 11a6 6 0 0 1 12 0', 'M8 11l3-3.5', 'M2.5 13.5h11'] },
  radar: { d: [ring(8, 8, 6), ring(8, 8, 3), 'M8 8l4.2-4.2'] },
  dashboard: { d: ['M2 2h5v5H2z', 'M9 2h5v5H9z', 'M2 9h5v5H2z', 'M9 9h5v5H9z'] },
  /** F-51: Layouts – zwei hintereinander liegende Belegungen */
  layouts: { d: ['M4.5 1.5h10v8h-10z', 'M1.5 4.5h10v10h-10z', 'M1.5 9.5h10', 'M6.5 4.5v10'] },
  focus: { d: [ring(8, 8, 6), ring(8, 8, 2.8), 'M8 8h.01'] },
  // F-207: Main Stage – Scheinwerfer mit Lichtkegel
  spotlight: { d: ['M2.2 3.6 5.6 1.5l1.9 3.1-3.4 2.1z', 'M3.4 6.4 2.6 8.2', 'M7.2 4.2 14 9.5', 'M4.6 6.8 8 14.5', 'M8 14.5c2.5-.3 5.2-2.3 6-5'] },
  view: { d: ['M1.5 3h13v10h-13z', 'M8 3v10', 'M1.5 8h6.5'] },
  maximize: { d: ['M2 6V2h4', 'M10 2h4v4', 'M14 10v4h-4', 'M6 14H2v-4'] },
  search: { d: [ring(6.5, 6.5, 4.5), 'M10 10l4 4'] },
  tour: { d: ['M3 14.5V2', 'M3 2.5h9l-2.2 3 2.2 3H3'] },
  help: { d: [ring(8, 8, 6.5), 'M6 6.2a2 2 0 1 1 2.8 1.8c-.6.3-.8.7-.8 1.3', 'M8 11.5h.01'] },
  toggle: { d: ['M5 4.5h6a3.5 3.5 0 0 1 0 7H5a3.5 3.5 0 0 1 0-7z', ring(11, 8, 1.5)] },
  plus: { d: ['M8 3v10', 'M3 8h10'] },
  newSlot: { d: ['M2 2h12v12H2z', 'M8 2v12', 'M11 6.5v3', 'M9.5 8h3'] },
  newDesk: { d: ['M2 2.5h12v8.5H2z', 'M5.5 14h5', 'M8 11v3', 'M8 4.5v4', 'M6 6.5h4'] },
  switchDesk: { d: ['M2 5h11', 'M10.5 2.5 13 5l-2.5 2.5', 'M14 11H3', 'M5.5 8.5 3 11l2.5 2.5'] },
  collect: { d: ['M2 2l3.5 3.5', 'M14 2l-3.5 3.5', 'M2 14l3.5-3.5', 'M14 14l-3.5-3.5', 'M6 6h4v4H6z'] },
  spread: { d: ['M1.5 2.5h6v5h-6z', 'M8.5 8.5h6v5h-6z', 'M7.5 5h3.5v2.5'] },
  design: {
    d: ['M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.4-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z', ring(7.5, 11, 1.2), ring(10, 7, 1.2), ring(14.5, 7, 1.2)],
    vb: 24,
    w: 1.8,
  },
  colors: { d: ['M8 2s4.5 5 4.5 8a4.5 4.5 0 0 1-9 0C3.5 7 8 2 8 2z'] },
  rules: { d: ['M2 4l1.2 1.2L5.5 3', 'M2 10.5l1.2 1.2 2.3-2.2', 'M7.5 4.3H14', 'M7.5 10.8H14'] },
  settings: {
    d: [ring(12, 12, 3.2), 'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z'],
    vb: 24,
    w: 1.7,
  },
  adjust: { d: ['M2 8h12', 'M4.5 5.5 2 8l2.5 2.5', 'M11.5 5.5 14 8l-2.5 2.5'] },
  sliders: { d: ['M2 4.5h12', 'M2 11.5h12', 'M5 3v3', 'M11 10v3'] },
  restore: { d: ['M2.5 2.5v3.5H6', 'M2.9 6A5.5 5.5 0 1 1 3.2 11'] },
  closed: { d: [ring(8, 8, 6), 'M8 4.8V8l2.2 1.6'] },
  next: { d: ['M3.5 3l5 5-5 5', 'M8.5 3l5 5-5 5'] },
  distribute: { d: ['M8 1.5v13', 'M1.5 8h13', 'M6 3.5 8 1.5l2 2', 'M6 12.5l2 2 2-2', 'M3.5 6 1.5 8l2 2', 'M12.5 6l2 2-2 2'] },
  swap: { d: ['M5 2v12', 'M2.5 4.5 5 2l2.5 2.5', 'M11 14V2', 'M8.5 11.5 11 14l2.5-2.5'] },
  rename: { d: ['M11 2.5l2.5 2.5L6 12.5l-3 .7.7-3z'] },
  remove: { d: ['M3 4.5h10', 'M6 4.5V3h4v1.5', 'M4.5 4.5l.7 9h5.6l.7-9'] },
  // F-06: Pause – zwei Balken im Kreis
  pause: { d: [ring(8, 8, 6), 'M6.5 5.5v5', 'M9.5 5.5v5'] },
  // F-201: durchgestrichenes Pause-Zeichen = pausiert nie
  keep: { d: [ring(8, 8, 6), 'M6.5 5.5v5', 'M9.5 5.5v5', 'M2.8 13.2 13.2 2.8'], w: 1.6 },
  /** F-202 Stufe 2: Auswählen (Haken) */
  check: { d: ['M3 8.6 6.4 12 13 4.4'], w: 1.6 },
  // V86 (F-206 Schritt 7): Schloss am Haken (L1), Erledigt-Kreis wie Trello (K2)
  lock: { d: ['M4 7.5h8v6H4z', 'M5.8 7.5V5.4a2.2 2.2 0 0 1 4.4 0v2.1'] },
  tick: { d: [ring(8, 8, 5.6)] },
  chevronDown: { d: ['M4 6l4 4 4-4'], w: 1.6 },
  /** F-226 (V109): Zeile nach oben */
  chevronUp: { d: ['M4 10l4-4 4 4'], w: 1.6 },
  chevronRight: { d: ['M6 4l4 4-4 4'], w: 1.6 },
  // F-194: Zoom – Lupe mit Plus
  zoom: { d: [ring(6.5, 6.5, 4.5), 'M10 10l4 4', 'M6.5 4.6v3.8', 'M4.6 6.5h3.8'] },
  /** F-200: Entwickler-Modus – spitze Klammern </> */
  dev: { d: ['M5 4 1.5 8 5 12', 'M11 4l3.5 4-3.5 4', 'M9.5 2.5l-3 11'] },
  pipette: { d: ['M11.5 1.8a1.5 1.5 0 0 1 2.1 0l.6.6a1.5 1.5 0 0 1 0 2.1L12.3 6.4 9.6 3.7z', 'M10.6 5.4 4 12l-2.3.8.8-2.3 6.6-6.6', 'M8.8 2.9l4.3 4.3'] },
  ruler: { d: ['M1.5 10.5l9-9 4 4-9 9z', 'M4 8l1.5 1.5', 'M6.5 5.5 8 7', 'M9 3l1.5 1.5'] },
  import: { d: ['M8 2v8', 'M5 7l3 3 3-3', 'M2.5 11v2.5h11V11'] },
  export: { d: ['M8 10V2', 'M5 5l3-3 3 3', 'M2.5 11v2.5h11V11'] },
  transfer: { d: ['M2.5 7v6.5h11V7', 'M6 1.5v6', 'M4 5.5l2 2 2-2', 'M10 7.5v-6', 'M8 3.5l2-2 2 2'] },
  sort: { d: ['M2 4h12', 'M4 8h8', 'M6 12h4'] },
  origin: { d: ['M8 14.5s5-4.5 5-8.5a5 5 0 0 0-10 0c0 4 5 8.5 5 8.5z', ring(8, 6, 1.6)] },
  profile: { d: [ring(8, 5, 3), 'M2.5 14a5.5 5.5 0 0 1 11 0'] },
  reload: { d: ['M13.5 2.5V6H10', 'M13.1 6A5.5 5.5 0 1 0 13.5 9.5'] },
  back: { d: ['M5.5 2.5 2 6l3.5 3.5', 'M2 6h7.5a4.5 4.5 0 0 1 0 9H6'], w: 1.5 },
  // F-183 Stufe 2: Glyphen im Portal (bisher ⤢ ⤡ ⋮ ☆ ★ ☰ …)
  close: { d: ['M4 4l8 8', 'M12 4l-8 8'], w: 1.6 },
  minimize: { d: ['M6 2v4H2', 'M10 2v4h4', 'M14 10h-4v4', 'M2 10h4v4'] },
  more: { d: ['M8 3.2h.01', 'M8 8h.01', 'M8 12.8h.01'], w: 2.6 },
  // F-220 (V116): Stecknadel – Eintrag im Umschalt-Rad angeheftet
  pin: { d: ['M5.5 2h5', 'M6.5 2v3.6L4 8.6h8L9.5 5.6V2', 'M8 8.6v5.9'] },
  star: { d: ['M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z'] },
  starOn: { d: ['M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z'], fill: true },
  newTab: { d: ['M1.5 13.5h7', 'M2.5 13.5V6h4.5l1-2.5h2', 'M12.5 8.5v5', 'M10 11h5'] },
  stackOn: { d: ['M5 5h9v9H5z', 'M2.5 11.5V2.5h9', 'M9.5 7.5v4', 'M7.5 9.5h4'] },
  move: { d: ['M2 8h10', 'M9 5l3 3-3 3', 'M14 3v10'] },
  detach: { d: ['M2 6V2h4', 'M2 2l5 5', 'M9 2.5h4.5v11h-11V9'] },
  // V93 (Q10): Büroklammer = Quellen an Karten und Zeilen (wie Trello-Anhänge)
  clip: { d: ['M10.5 4.5 5.6 9.4a1.6 1.6 0 0 0 2.3 2.3l5-5a3 3 0 0 0-4.3-4.3l-5 5a4.4 4.4 0 0 0 6.2 6.2l4.2-4.2'] },
  // V93: Pfeile für Zurück/Vor im Portal (statt Schriftzeichen ← →, die in runden Knöpfen nicht mittig sitzen)
  arrowLeft: { d: ['M13 8H3', 'M7 4 3 8l4 4'], w: 1.7 },
  arrowRight: { d: ['M3 8h10', 'M9 4l4 4-4 4'], w: 1.7 },
  home: { d: ['M2 7.5 8 2.5l6 5', 'M3.5 6.5V13.5h9V6.5', 'M6.5 13.5V10h3v3.5'] },
  // F-215 (V69): Halbkreis am Home-Knopf
  mic: { d: ['M6 2.5h4v6.5a2 2 0 0 1-4 0z', 'M3.8 8.2a4.2 4.2 0 0 0 8.4 0', 'M8 12.5v2', 'M6 14.5h4'] },
  // V79 (F-215 T10): Mikrofon mit Welle = Notiz mit Tonaufnahme; Abspielen/Anhalten; Als Datei sichern
  micWave: { d: ['M3.6 2.5h3.2v6a1.6 1.6 0 0 1-3.2 0z', 'M1.8 7.8a3.4 3.4 0 0 0 6.8 0', 'M5.2 11.2v2.3', 'M3.6 13.5h3.2', 'M10.6 5.6a3.4 3.4 0 0 1 0 4.8', 'M12.6 3.8a6 6 0 0 1 0 8.4'] },
  play: { d: ['M5 3.2 12.6 8 5 12.8z'], fill: true },
  stop: { d: ['M4.5 4.5h7v7h-7z'], fill: true },
  download: { d: ['M8 2v8', 'M5 7l3 3 3-3', 'M2.5 11v2.5h11V11'] },
  /** V118 (F-230): Importieren */
  upload: { d: ['M8 10V2', 'M5 5l3-3 3 3', 'M2.5 11v2.5h11V11'] },
  // V80 (F-215 B5): Bild im Text
  image: { d: ['M2 3h12v10H2z', 'M2 11l3.5-3.5 3 3 2-2L14 12', 'M10.5 5.8h.01'], w: 1.4 },
  share: { d: ['M8 1.8v8.4', 'M5.2 4.6 8 1.8l2.8 2.8', 'M5 7H3.5v7h9V7H11'] },
  recent: { d: [ring(8, 8, 6), 'M8 4.6V8l2.4 1.6'] },
  copy: { d: ['M5.5 5.5h8v8h-8z', 'M3.5 10.5h-1v-8h8v1'] },
  // V121 (F-231 K1/K3): Archiv (Kasten mit Deckel)
  archive: { d: ['M2 3h12v3H2z', 'M3 6v7h10V6', 'M6.5 8.5h3'] },
  // V122 (F-231 K4): Tag (Anhänger mit Loch) und Filter (Trichter)
  tag: { d: ['M1.8 2.5v5l6.7 6.7 5.2-5.2L7 2.3H2z', 'M4.8 5h.01'] },
  filter: { d: ['M1.8 2.5h12.4L9.5 8.2v4.8l-3 1.5V8.2z'] },
  // V122 (F-231 K13): Tabelle und Kalender als Ansichten des Kanbans; K7: Kommentar
  table: { d: ['M1.5 2.5h13v11h-13z', 'M1.5 6h13', 'M1.5 9.7h13', 'M6 2.5v11'] },
  calendarView: { d: ['M2 3.5h12v10.5H2z', 'M2 6.5h12', 'M5 2v3', 'M11 2v3', 'M4.5 9h2', 'M9.5 9h2', 'M4.5 11.5h2'] },
  comment: { d: ['M2 3h12v8H7l-3.5 3v-3H2z', 'M4.8 6h6.4', 'M4.8 8.3h4'] },
  // V123 (F-231 K13): Zeitleiste (versetzte Balken) und Kennzahlen (Säulen)
  timeline: { d: ['M2 2v12', 'M3.5 4h6', 'M6 7.5h7', 'M4.5 11h5'] },
  stats: { d: ['M2 14h12', 'M3.5 14V9', 'M7 14V4', 'M10.5 14V7', 'M13.5 14v-3'] },
  // V125 (F-231 K8): eigene Felder (Formular mit Zeilen) und Abstimmen (Daumen hoch)
  fields: { d: ['M2 2.5h12v11H2z', 'M4.5 5.5h2', 'M8 5.5h3.5', 'M4.5 8h2', 'M8 8h3.5', 'M4.5 10.5h2', 'M8 10.5h3.5'] },
  /** V126 (F-231 K11): Spalte einklappen bzw. ausklappen */
  fold: { d: ['M2 8h4.5', 'M4.5 6l2 2-2 2', 'M14 8H9.5', 'M11.5 6l-2 2 2 2'], w: 1.5 },
  unfold: { d: ['M6.5 8H2', 'M4 6 2 8l2 2', 'M9.5 8H14', 'M12 6l2 2-2 2'], w: 1.5 },
  /** V127 (F-231 K9): Spiegelkarte – zwei versetzte Karten */
  mirror: { d: ['M2 5h8.5v8.5H2z', 'M5.5 2.5H14V11h-1.5'], w: 1.4 },
  button: { d: ['M2.5 4.5h11a1 1 0 0 1 1 1v3.5a1 1 0 0 1-1 1H9', 'M5 7.5h4', 'M6.5 9.5l1.2 4.3 1-1.6 1.7 1.6.9-.9-1.6-1.7 1.6-1z', 'M5 10H2.5a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1'] },
  /** V132 (F-231 K10d): Glocke „Neuigkeiten“ */
  bell: { d: ['M4 11.5V7.5a4 4 0 0 1 8 0v4l1.2 1.3H2.8z', 'M6.5 14a1.6 1.6 0 0 0 3 0'] },
  vote: { d: ['M2 7h2.5v6.5H2z', 'M4.5 7.5 7.2 2.2c1.1 0 1.8.8 1.6 1.9L8.4 6h4.1c.9 0 1.6.9 1.4 1.8l-1 4.6c-.2.7-.8 1.1-1.5 1.1H4.5'] },
  send: { d: ['M14 2L2 7l5 2 2 5 5-12z', 'M7 9l7-7'] },
  sync: { d: ['M2.5 7A5.5 5.5 0 0 1 12.6 4.5', 'M13 1.8v3h-3', 'M13.5 9A5.5 5.5 0 0 1 3.4 11.5', 'M3 14.2v-3h3'] },
  external: { d: ['M7 2.5H3.5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V9', 'M9.5 2.5h4v4', 'M13.3 2.7 7.8 8.2'] },
  newWindow: { d: ['M1.5 3.5h9v8h-9z', 'M1.5 6h9', 'M12.5 6v8h-9', 'M14.5 4v6'] },
  blocked: { d: [ring(8, 8, 6), 'M3.8 12.2l8.4-8.4'] },
  show: { d: ['M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z', ring(8, 8, 2)] },
  // V83: Ausgeblendet (Rad „Pads“) – Auge durchgestrichen
  hide: { d: ['M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z', ring(8, 8, 2), 'M2.5 13.5l11-11'] },
  // F-183 Stufe 2: Zeichen zur Wahl je Kategorie (F-163)
  catEditor: { d: ['M3.5 1.5h6l3 3v10h-9z', 'M9.5 1.5v3h3', 'M5.5 8h5', 'M5.5 10.5h5', 'M5.5 13h3'] },
  catMail: { d: ['M1.5 3.5h13v9h-13z', 'M1.5 4l6.5 5 6.5-5'] },
  catChat: { d: ['M2 3h12v8H7l-3.5 3v-3H2z'] },
  /** F-221: Feedback – Sprechblase mit Ausrufezeichen */
  feedback: { d: ['M2 3h12v8H7l-3.5 3v-3H2z', 'M8 5v2.8', 'M8 9.3h.01'] },
  catCalendar: { d: ['M2 3.5h12v10.5H2z', 'M2 6.5h12', 'M5 2v3', 'M11 2v3', 'M5 9h.01', 'M8 9h.01', 'M11 9h.01', 'M5 11.5h.01', 'M8 11.5h.01'] },
  catVideo: { d: ['M1.5 3.5h13v9h-13z', 'M6.5 6v4l3.5-2z'] },
  catMusic: { d: ['M6 12V3l7-1.5v9', ring(4.5, 12, 1.5), ring(11.5, 10.5, 1.5)] },
  catCode: { d: ['M5 4 1.5 8 5 12', 'M11 4l3.5 4L11 12', 'M9.2 2.5 6.8 13.5'] },
  catJobs: { d: ['M1.5 5h13v8.5h-13z', 'M5.5 5V3h5v2', 'M1.5 8.5h13'] },
  catPeople: { d: [ring(5.5, 5, 2.2), 'M1.5 13.5a4 4 0 0 1 8 0', ring(11.5, 5.5, 1.8), 'M10.5 9.6a3.4 3.4 0 0 1 4 3.9'] },
  catNews: { d: ['M1.5 3h10v10.5H3a1.5 1.5 0 0 1-1.5-1.5z', 'M11.5 6h3v6a1.5 1.5 0 0 1-3 0', 'M4 5.5h5', 'M4 8h5', 'M4 10.5h3'] },
  catShop: { d: ['M1.5 2h2l1.8 8h7.2l1.5-5.5H4.3', ring(6, 13, 1), ring(11.5, 13, 1)] },
  catBook: { d: ['M8 4C6.5 2.8 4 2.5 1.5 3v10c2.5-.5 5-.2 6.5 1', 'M8 4c1.5-1.2 4-1.5 6.5-1v10c-2.5-.5-5-.2-6.5 1', 'M8 4v10'] },
  catTravel: { d: ['M14.5 2 7 9.5', 'M14.5 2 10 14.5 7 9.5 1.5 6.5z'] },
  catAi: { d: ['M8 1.5l1.4 4.1L13.5 7l-4.1 1.4L8 12.5 6.6 8.4 2.5 7l4.1-1.4z', 'M13 11.5v3', 'M11.5 13h3'] },
  catPhoto: { d: ['M1.5 4.5h3l1.2-2h4.6l1.2 2h3v9h-13z', ring(8, 9, 2.5)] },
  catMoney: { d: [ring(8, 8, 6.5), 'M10.2 5.6A2.8 2.8 0 0 0 5.8 6.8c0 2.4 4.4 1.2 4.4 3.4A2.8 2.8 0 0 1 5.8 11', 'M8 3.5v9'] },
  catGame: { d: ['M4.5 4.5h7a3 3 0 0 1 3 3v1.5a2.5 2.5 0 0 1-4.4 1.6L9 9.5H7l-1.1 1.1A2.5 2.5 0 0 1 1.5 9V7.5a3 3 0 0 1 3-3z', 'M4.5 6.5v2', 'M3.5 7.5h2', 'M11 7h.01', 'M12 8.5h.01'] },
  catHeart: { d: ['M8 13.5S1.5 9.8 1.5 5.6A3.1 3.1 0 0 1 8 4.2a3.1 3.1 0 0 1 6.5 1.4C14.5 9.8 8 13.5 8 13.5z'] },
  // F-192: weitere Zeichen für Kategorien (gleicher Strichstil, Raster 16)
  catTool: { d: ['M10.5 2.2a3.2 3.2 0 0 0-3.9 4.1L2.3 10.6a1.4 1.4 0 0 0 2 2l4.3-4.3a3.2 3.2 0 0 0 4.1-3.9l-1.9 1.9-1.8-.4-.4-1.8z'] },
  catDesign: { d: ['M8 1.8a6.2 6.2 0 1 0 0 12.4c1 0 1.4-.8 1-1.6-.5-.9 0-1.9 1.1-1.9h1.7a2.4 2.4 0 0 0 2.4-2.4A6.3 6.3 0 0 0 8 1.8z', 'M5 6h.01', 'M8 4.5h.01', 'M11 6h.01', 'M4.8 9.2h.01'] },
  catTerminal: { d: ['M2 2.5h12v11H2z', 'M4.5 6l2 2-2 2', 'M8 10.5h3.5'] },
  catDatabase: { d: ['M3 3.5c0-1.1 2.2-2 5-2s5 .9 5 2-2.2 2-5 2-5-.9-5-2z', 'M3 3.5v9c0 1.1 2.2 2 5 2s5-.9 5-2v-9', 'M3 8c0 1.1 2.2 2 5 2s5-.9 5-2'] },
  catCloud: { d: ['M4.5 12.5h7.2a2.8 2.8 0 0 0 .3-5.6 4 4 0 0 0-7.7-.3 3 3 0 0 0 .2 5.9z'] },
  catFolder: { d: ['M1.8 4v8.5a1 1 0 0 0 1 1h10.4a1 1 0 0 0 1-1V5.8a1 1 0 0 0-1-1H8L6.5 3H2.8a1 1 0 0 0-1 1z'] },
  catLock: { d: ['M3.5 7.5h9v6.5h-9z', 'M5.5 7.5V5a2.5 2.5 0 0 1 5 0v2.5'] },
  catChart: { d: ['M2 14h12', 'M4 11V8', 'M7 11V5', 'M10 11V7', 'M13 11V3'] },
  catTodo: { d: ['M2 4l1.2 1.2L5.5 3', 'M2 9.5l1.2 1.2L5.5 8.5', 'M7.5 4.2h6.5', 'M7.5 9.7h6.5', 'M7.5 13h6.5'] },
  catClock: { d: [ring(8, 8, 6.2), 'M8 4.5V8l2.5 1.5'] },
  catBuilding: { d: ['M3 14.5V2.5h7v12', 'M10 6.5h3v8', 'M1.5 14.5h13', 'M5 5h.01', 'M8 5h.01', 'M5 8h.01', 'M8 8h.01', 'M5 11h.01', 'M8 11h.01'] },
  catLaw: { d: ['M8 2v12', 'M4.5 14h7', 'M3 4.5h10', 'M3 4.5 1 9a2 2 0 0 0 4 0z', 'M13 4.5 11 9a2 2 0 0 0 4 0z'] },
  catLearn: { d: ['M1 6l7-3.5L15 6 8 9.5z', 'M4 7.6V11c1.3 1.3 2.6 1.8 4 1.8s2.7-.5 4-1.8V7.6', 'M14.5 6.3v4'] },
  catSocial: { d: [ring(4, 8, 1.8), ring(12, 4, 1.8), ring(12, 12, 1.8), 'M5.6 7.2l4.8-2.4', 'M5.6 8.8l4.8 2.4'] },
  catImage: { d: ['M2 2.5h12v11H2z', ring(5.5, 6, 1.2), 'M2 12l3.8-3.8 2.7 2.7 2-2 3.5 3.5'] },
  catHeadphones: { d: ['M2.5 11V8.5a5.5 5.5 0 0 1 11 0V11', 'M2.5 10h2v4h-2z', 'M11.5 10h2v4h-2z'] },
  catMap: { d: ['M8 14.5s-4.5-4.3-4.5-7.8a4.5 4.5 0 0 1 9 0c0 3.5-4.5 7.8-4.5 7.8z', ring(8, 6.7, 1.6)] },
  catCar: { d: ['M2 10.5V8l1.6-3.8a1 1 0 0 1 .9-.7h7a1 1 0 0 1 .9.7L14 8v2.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z', 'M2 8h12', 'M4 11.5V13', 'M12 11.5V13'] },
  catFood: { d: ['M4 1.8v4.5a1.5 1.5 0 0 0 3 0V1.8', 'M5.5 1.8v12.4', 'M11.5 14.2V1.8c-1.6.8-2.5 2.6-2.5 5v2.4h2.5'] },
  catHealth: { d: ['M6 2.5h4V6h3.5v4H10v3.5H6V10H2.5V6H6z'] },
  catSport: { d: ['M1.5 8h13', 'M3.5 5v6', 'M5.5 4v8', 'M10.5 4v8', 'M12.5 5v6'] },
  catWeather: { d: ['M5 1.8v1', 'M1.8 5.2h1', 'M2.7 2.9l.7.7', 'M8.1 2.9l-.7.7', 'M3.4 7.4a2.5 2.5 0 1 1 4.2-2.6', 'M6 13.5h5.8a2.3 2.3 0 0 0 .2-4.6 3.2 3.2 0 0 0-6-.4 2.5 2.5 0 0 0 0 5z'] },
  catPlant: { d: ['M8 14.5V7', 'M8 9c0-3 2-5 5.5-5 0 3.5-2 5-5.5 5z', 'M8 10.5C8 8 6.5 6.5 3 6.5c0 3 1.5 4 5 4z'] },
  catGift: { d: ['M2 6h12v3H2z', 'M3 9v5h10V9', 'M8 6v8', 'M8 6C7 4 4 3 4 5c0 1 2 1 4 1z', 'M8 6c1-2 4-3 4-1 0 1-2 1-4 1z'] },
} satisfies Record<string, IconDef>;

export type IconName = keyof typeof ICONS;

/** Symbol je Hilfe-Eintrag (HELP, F-156) – gleiche Ids. Fehlt ein Eintrag, meldet das der Test. */
export const HELP_ICON: Record<string, IconName> = {
  note: 'note', dock: 'dock', newNote: 'note', noteWrite: 'task', noteDelete: 'trash', noteRemind: 'recent', deskMode: 'desk', modeWheel: 'swap', wheelOrder: 'pin', sheetStar: 'star', ruleKit: 'rules', kitButtons: 'button', kitSchedule: 'recent', kitWatch: 'bell', notesTasks: 'notesTasks', f6Ring: 'swap', padKnob: 'note', voiceNote: 'mic', padTask: 'task', padFind: 'search', notePic: 'image', noteShare: 'share', todo: 'todo', kanban: 'kanban', eisenhower: 'matrix', noteState: 'note', newTodo: 'todo', newKanban: 'kanban', newEisenhower: 'matrix', newDecision: 'sliders', undoLayout: 'swap', notesView: 'layouts', tourDecisions: 'tour', findNote: 'note', todoUse: 'todo', kanbanUse: 'kanban', projectKanban: 'kanban', kanbanArchive: 'archive', kanbanTags: 'tag', kanbanColumns: 'fold', cardMirror: 'mirror', kanbanViews: 'table', kanbanTimeline: 'timeline', cardCover: 'image', cardFields: 'fields', kanbanStats: 'stats', cardComments: 'comment', dueTime: 'recent', boardTemplates: 'kanban', sitePlan: 'slot', notesLayouts: 'layouts', matrixUse: 'matrix', cardWindow: 'todo', noteSource: 'clip', persons: 'catPeople', projects: 'project', psp: 'psp', gantt: 'project', baseline: 'project', networkPlan: 'psp', resourceUse: 'catPeople', workCalendar: 'recent', taskLimitProject: 'catPeople', projectDesk: 'project', projectExchange: 'download', feedback: 'feedback', feedbackElaborate: 'feedback', feedbackCockpit: 'feedback', decisions: 'project', projectFeedback: 'feedback', risksChanges: 'project', projectFocus: 'focus', mainStage: 'spotlight', libraryWheel: 'library',
  devMode: 'dev',
  desk: 'desk', slot: 'slot', stack: 'stack', portal: 'portal', source: 'source', library: 'library', launcher: 'launcher',
  dashboard: 'dashboard', focus: 'focus', collected: 'collect', origin: 'origin',
  cockpit: 'cockpit', view: 'view', maximize: 'maximize', search: 'search',
  tour: 'tour', tourCockpit: 'tour', tourDesign: 'tour', tourColors: 'tour', tourImport: 'tour', tourSend: 'tour', tourSources: 'tour', tourNotes: 'tour', tourStage: 'tour', tourFeedback: 'tour', tourProjects: 'tour', tourForms: 'tour', projectForms: 'list', tourDev: 'tour', tourSync: 'tour', toursAuto: 'toggle', help: 'help', compact: 'dashboard', favicons: 'source', jackpot: 'jackpot',
  newSlot: 'newSlot', newDesk: 'newDesk', newPortal: 'portal', newTab: 'tab',
  switchDesk: 'switchDesk', collectDesks: 'collect', distributeDesks: 'spread',
  design: 'design', colorRules: 'category', rules: 'rules', colors: 'colors',
  adjust: 'adjust', focusRule: 'sliders', restore: 'restore', closed: 'closed', layouts: 'layouts', cases: 'layouts', limits: 'maximize',
  nextTab: 'next', nextPortal: 'next', distribute: 'distribute', swap: 'swap', rename: 'rename', stackDelete: 'remove', ruler: 'ruler', colorPicker: 'pipette', pause: 'pause', zoom: 'zoom', webSearch: 'search', sendTo: 'send',
  importBookmarks: 'import', sortHelp: 'sort', exportBookmarks: 'export', profile: 'profile', reload: 'reload', exportDesks: 'send', loadDesks: 'import', syncDesks: 'sync', saveSlot: 'transfer', loadSlot: 'import',
};

/** F-183 Stufe 2: Zeichen zur Wahl für Kategorien, in dieser Reihenfolge im Dialog „Farben“. */
export const CATEGORY_ICONS = [
  'category', 'catEditor', 'catMail', 'catChat', 'catCalendar', 'catVideo', 'catMusic', 'catCode', 'catJobs',
  'catPeople', 'catNews', 'catShop', 'catBook', 'catTravel', 'catAi', 'catPhoto', 'catMoney', 'catGame', 'catHeart', 'star',
  // F-192
  'catTool', 'catDesign', 'catTerminal', 'catDatabase', 'catCloud', 'catFolder', 'search', 'catLock', 'catChart', 'catTodo',
  'catClock', 'catBuilding', 'catLaw', 'catLearn', 'catSocial', 'catImage', 'catHeadphones', 'catMap', 'catCar', 'home',
  'catFood', 'catHealth', 'catSport', 'catWeather', 'catPlant', 'catGift',
] as const satisfies readonly IconName[];

export type CategoryIcon = (typeof CATEGORY_ICONS)[number];

/** Vorschlag je bekanntem Kategorie-Namen (Sortierhilfe F-180 und übliche Namen); Vergleich ohne Groß/klein. */
const NAME_ICON: [RegExp, CategoryIcon][] = [
  // KI zuerst („KI-Werkzeuge“ ist KI, kein Werkzeug)
  [/\bki\b|ki-|ai\b|künstlich/, 'catAi'],
  // F-192: neue Zeichen vor den älteren, wo sie genauer passen
  [/werkzeug|tool|tools/, 'catTool'],
  [/design|grafik|gestalt|ui\b|ux\b/, 'catDesign'],
  [/terminal|konsole|shell|devops|server/, 'catTerminal'],
  [/datenbank|database|\bsql\b|daten\b/, 'catDatabase'],
  [/cloud|hosting|speicher/, 'catCloud'],
  [/ordner|ablage|archiv|dateien/, 'catFolder'],
  [/\bsuch|search/, 'search'],
  [/passw|sicherheit|security|login/, 'catLock'],
  [/börse|aktien|statistik|analyse|zahlen|chart/, 'catChart'],
  [/aufgabe|todo|to-do|erledig/, 'catTodo'],
  [/\bzeit\b|\buhr\b|\btime\b/, 'catClock'],
  [/firma|unternehm|behörde|amt\b|büro/, 'catBuilding'],
  [/recht|gesetz|anwalt|vertrag|jura/, 'catLaw'],
  [/schule|\buni\b|universit|studium|kurs|weiterbild|lernen/, 'catLearn'],
  [/social|soziale|teilen/, 'catSocial'],
  [/grafiken|bilder|galerie|image/, 'catImage'],
  [/hörbuch|podcast/, 'catHeadphones'],
  [/karte|\bmaps?\b|\bort\b|navi/, 'catMap'],
  [/\bauto|kfz|fahrzeug|mobilität/, 'catCar'],
  [/haus|wohnung|zuhause|home|immobil/, 'home'],
  [/essen|rezept|kochen|food|restaurant/, 'catFood'],
  [/gesundheit|arzt|medizin|health|fitness/, 'catHealth'],
  [/sport|training|workout/, 'catSport'],
  [/wetter|weather/, 'catWeather'],
  [/garten|pflanze|natur/, 'catPlant'],
  [/geschenk|gift|geburtstag/, 'catGift'],
  [/video|film|serie|stream/, 'catVideo'],
  [/musik|music|podcast|radio/, 'catMusic'],
  [/mail|e-post/, 'catMail'],
  [/kalender|calendar|termin/, 'catCalendar'],
  [/chat|messenger/, 'catChat'],
  [/entwickl|code|dev|program/, 'catCode'],
  [/job|bewerb|arbeit|beruf|karriere/, 'catJobs'],
  [/netzwerk|social|sozial|freunde|community/, 'catPeople'],
  [/nachricht|news|zeitung|presse/, 'catNews'],
  [/einkauf|shop|kauf/, 'catShop'],
  [/wissen|lernen|lexikon|recherche|bildung/, 'catBook'],
  [/reise|travel|urlaub/, 'catTravel'],
  [/foto|bild|photo/, 'catPhoto'],
  [/finanz|geld|bank|money/, 'catMoney'],
  [/spiel|game/, 'catGame'],
  [/editor|dokument|text|schreib|office|notiz/, 'catEditor'],
  [/favorit|lieblings/, 'catHeart'],
];

const isCategoryIcon = (v: string | undefined): v is CategoryIcon => !!v && (CATEGORY_ICONS as readonly string[]).includes(v);

/** Zeichen einer Kategorie: gewähltes, sonst Vorschlag nach Name, sonst das allgemeine Kategorie-Zeichen. */
export function categoryIcon(c: { name: string; icon?: string }): CategoryIcon {
  if (isCategoryIcon(c.icon)) return c.icon;
  const n = c.name.toLowerCase();
  return NAME_ICON.find(([re]) => re.test(n))?.[1] ?? 'category';
}

/** Symbol zu einem Hilfe-Eintrag; ohne Zuordnung das Hilfe-Symbol. */
export const helpIcon = (id: string): IconName => HELP_ICON[id] ?? 'help';
