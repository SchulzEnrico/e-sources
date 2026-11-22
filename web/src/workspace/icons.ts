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
  launcher: { d: ['M7 2.5H3.5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V9', 'M9.5 2.5h4v4', 'M13.3 2.7 7.8 8.2'], w: 1.3 },
  cockpit: { d: ['M2 11a6 6 0 0 1 12 0', 'M8 11l3-3.5', 'M2.5 13.5h11'] },
  radar: { d: [ring(8, 8, 6), ring(8, 8, 3), 'M8 8l4.2-4.2'] },
  dashboard: { d: ['M2 2h5v5H2z', 'M9 2h5v5H9z', 'M2 9h5v5H2z', 'M9 9h5v5H9z'] },
  focus: { d: [ring(8, 8, 6), ring(8, 8, 2.8), 'M8 8h.01'] },
  view: { d: ['M1.5 3h13v10h-13z', 'M8 3v10', 'M1.5 8h6.5'] },
  maximize: { d: ['M2 6V2h4', 'M10 2h4v4', 'M14 10v4h-4', 'M6 14H2v-4'] },
  search: { d: [ring(6.5, 6.5, 4.5), 'M10 10l4 4'] },
  tour: { d: ['M3 14.5V2', 'M3 2.5h9l-2.2 3 2.2 3H3'] },
  help: { d: [ring(8, 8, 6.5), 'M6 6.2a2 2 0 1 1 2.8 1.8c-.6.3-.8.7-.8 1.3', 'M8 11.5h.01'] },
  toggle: { d: ['M5 4.5h6a3.5 3.5 0 0 1 0 7H5a3.5 3.5 0 0 1 0-7z', ring(11, 8, 1.5)] },
  plus: { d: ['M8 3v10', 'M3 8h10'] },
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
  ruler: { d: ['M1.5 10.5l9-9 4 4-9 9z', 'M4 8l1.5 1.5', 'M6.5 5.5 8 7', 'M9 3l1.5 1.5'] },
  import: { d: ['M8 2v8', 'M5 7l3 3 3-3', 'M2.5 11v2.5h11V11'] },
  export: { d: ['M8 10V2', 'M5 5l3-3 3 3', 'M2.5 11v2.5h11V11'] },
  transfer: { d: ['M2.5 7v6.5h11V7', 'M6 1.5v6', 'M4 5.5l2 2 2-2', 'M10 7.5v-6', 'M8 3.5l2-2 2 2'] },
  sort: { d: ['M2 4h12', 'M4 8h8', 'M6 12h4'] },
  origin: { d: ['M8 14.5s5-4.5 5-8.5a5 5 0 0 0-10 0c0 4 5 8.5 5 8.5z', ring(8, 6, 1.6)] },
  profile: { d: [ring(8, 5, 3), 'M2.5 14a5.5 5.5 0 0 1 11 0'] },
  reload: { d: ['M13.5 2.5V6H10', 'M13.1 6A5.5 5.5 0 1 0 13.5 9.5'] },
  back: { d: ['M5.5 2.5 2 6l3.5 3.5', 'M2 6h7.5a4.5 4.5 0 0 1 0 9H6'], w: 1.5 },
} satisfies Record<string, IconDef>;

export type IconName = keyof typeof ICONS;

/** Symbol je Hilfe-Eintrag (HELP, F-156) – gleiche Ids. Fehlt ein Eintrag, meldet das der Test. */
export const HELP_ICON: Record<string, IconName> = {
  desk: 'desk', slot: 'slot', stack: 'stack', portal: 'portal', source: 'source', library: 'library', launcher: 'launcher',
  dashboard: 'dashboard', focus: 'focus', collected: 'collect', origin: 'origin',
  cockpit: 'cockpit', view: 'view', maximize: 'maximize', search: 'search',
  tour: 'tour', tourCockpit: 'tour', tourDesign: 'tour', tourImport: 'tour', toursAuto: 'toggle', help: 'help',
  newSlot: 'slot', newDesk: 'newDesk', newPortal: 'portal', newTab: 'tab',
  switchDesk: 'switchDesk', collectDesks: 'collect', distributeDesks: 'spread',
  design: 'design', colorRules: 'category', rules: 'rules', colors: 'colors',
  adjust: 'adjust', focusRule: 'sliders', restore: 'restore', closed: 'closed',
  nextTab: 'next', nextPortal: 'next', distribute: 'distribute', swap: 'swap', rename: 'rename', stackDelete: 'remove', ruler: 'ruler',
  importBookmarks: 'import', sortHelp: 'sort', exportBookmarks: 'export', profile: 'profile', reload: 'reload', exportDesks: 'transfer',
};

/** Symbol zu einem Hilfe-Eintrag; ohne Zuordnung das Hilfe-Symbol. */
export const helpIcon = (id: string): IconName => HELP_ICON[id] ?? 'help';
