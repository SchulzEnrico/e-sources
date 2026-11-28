/**
 * V154 (F-236 Option B, G1–G8 entschieden V153; schließt F-232 P11 ein): Layout-Vorlage je Projekt mit globalen
 * Regeln für alle Projekt-Dokumente (Blätter, Grafiken, Bericht). Schritt 1 nach G8: die Regeln und das Lesen –
 * Grafiken (gpmFigures), Druckfarben der Kurven (PRINT_COLORS) und die Blätter (CSS-Variablen) nehmen ihre
 * Farben aus der Vorlage. Vorgabe „Report ColorGentlemen“ = die bisherigen festen Werte (nichts ändert sich,
 * solange keine Regel gesetzt ist). Am Projekt stehen nur abweichende Regeln (`Project.layout`).
 * Schritt 2: Generator-Blatt „Layout“ mit Vorschau; Schritt 3: Abweichung je Element.
 */
import type { Project } from './types';

export interface LayoutRules {
  /** Name der Vorlage (G2), z. B. „Report ColorGentlemen“ */
  name: string;
  /** Primärfarbe – Kästen „MUSS“, Linien, Überschriften der Grafiken (Report: weinrot) */
  primary: string;
  /** Akzent – Kästen „SOLL“, Meilensteine (Report: orange) */
  accent: string;
  /** Kästen „KANN“ (Report: hellgelb) */
  soft: string;
  /** Neutral – graue Kästen */
  neutral: string;
  /** kritischer Pfad, Überschreitung */
  critical: string;
  /** Balken der Kurven (Ganglinie, MTA) */
  bar: string;
  /** im Plan / Budget-Linie */
  ok: string;
  /** Text */
  ink: string;
  /** Nebentext */
  muted: string;
  /** Raster, Hilfslinien */
  grid: string;
  /** Linien der Kästen */
  line: string;
  /** Blatt: Kopfzeile, Hervorhebung (Report: rot) */
  head: string;
  /** Blatt: Hintergrund der Bezeichnungen */
  label: string;
  /** V156: externe Firmen im Organigramm (hellblau; stahlblau und schiefer werden daraus gerechnet) */
  external: string;
  /** Kästen mit Verlauf (sonst flach) */
  gradient: boolean;
  // V155 (G3 Rest): Schrift und Größen, Kästen, Tabellen, Kopf- und Fußzeile im Druck
  /** Schriftart des Texts (Blätter, Grafiken, Bericht) */
  font: LayoutFont;
  /** Schriftart der Überschriften (Projektname in den Grafiken, Überschriften im Bericht) */
  headFont: LayoutFont;
  /** Grundgröße des Texts in % (Blätter, Bericht) */
  textSize: number;
  /** Größe der Überschriften in % */
  headSize: number;
  /** Größe der Tabellen in % */
  tableSize: number;
  /** Ecken der Kästen in px (0 = eckig) */
  radius: number;
  /** Schatten unter den Kästen */
  shadow: boolean;
  /** Kopf der Tabellen (Titelzeile der Formular-Blätter, Spaltenköpfe) */
  tableHead: string;
  /** Raster der Tabellen: alle Linien, nur waagerecht, ohne */
  tableGrid: LayoutGrid;
  /** Druck: Logo auf Deckblatt und Blättern */
  printLogo: boolean;
  /** Druck: Projektnummer in der Fußzeile */
  printNo: boolean;
  /** Druck: „Seite x von y“ in der Fußzeile */
  printPage: boolean;
}
export type LayoutFont = 'sans' | 'serif' | 'system';
export type LayoutGrid = 'full' | 'rows' | 'none';
export const LAYOUT_FONTS: readonly LayoutFont[] = ['sans', 'serif', 'system'];
export const LAYOUT_GRIDS: readonly LayoutGrid[] = ['full', 'rows', 'none'];
/** CSS-Schriftfamilien der Schriftarten */
export const FONT_CSS: Record<LayoutFont, string> = {
  sans: "'Open Sans', 'Segoe UI', system-ui, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  system: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
};
/** Größen in % und Ecken in px: erlaubte Bereiche */
export const SIZE_RANGE = { textSize: [80, 140], headSize: [80, 160], tableSize: [80, 130], radius: [0, 12] } as const;
export type LayoutSize = keyof typeof SIZE_RANGE;
export const LAYOUT_SIZES: readonly LayoutSize[] = ['textSize', 'headSize', 'tableSize', 'radius'];
export type LayoutFlag = 'gradient' | 'shadow' | 'printLogo' | 'printNo' | 'printPage';
export const LAYOUT_FLAGS: readonly LayoutFlag[] = ['gradient', 'shadow', 'printLogo', 'printNo', 'printPage'];

export type LayoutColor = Exclude<keyof LayoutRules, 'name' | LayoutFlag | LayoutSize | 'font' | 'headFont' | 'tableGrid'>;
export const LAYOUT_COLORS: readonly LayoutColor[] = ['primary', 'accent', 'soft', 'neutral', 'critical', 'bar', 'ok', 'ink', 'muted', 'grid', 'line', 'head', 'label', 'tableHead', 'external'];

/** G2: Vorgabe – genau die bisherigen Werte (Report ColorGentlemen, IPMA ICB4 Level D) */
export const REPORT_LAYOUT: LayoutRules = {
  name: 'Report ColorGentlemen',
  primary: '#7b1113',
  accent: '#d77a1e',
  soft: '#fbf0a6',
  neutral: '#d3d3d3',
  critical: '#d0021b',
  bar: '#9bb7d4',
  ok: '#2e7d32',
  ink: '#1b1b1b',
  muted: '#666666',
  grid: '#d9d9d9',
  line: '#8a8a8a',
  head: '#a3141b',
  label: '#ececec',
  external: '#c7dcf3',
  gradient: true,
  font: 'sans',
  headFont: 'serif',
  textSize: 100,
  headSize: 100,
  tableSize: 100,
  radius: 4,
  shadow: true,
  tableHead: '#7b7b7b',
  tableGrid: 'full',
  printLogo: true,
  printNo: true,
  printPage: true,
};

const HEX = /^#[0-9a-f]{6}$/;
/** Farbe als #rrggbb (auch #rgb wird angenommen) – sonst undefined */
export function normHex(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  let s = v.trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(s)) s = `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
  return HEX.test(s) ? s : undefined;
}

/** Gespeicherte Regeln lesen: nur gültige Farben, nur Abweichungen von der Vorgabe */
export function sanitizeLayout(v: unknown): Partial<LayoutRules> | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const r = v as Record<string, unknown>;
  const out: Partial<LayoutRules> = {};
  if (typeof r.name === 'string' && r.name.trim() && r.name.trim() !== REPORT_LAYOUT.name) out.name = r.name.trim().slice(0, 60);
  for (const k of LAYOUT_COLORS) {
    const c = normHex(r[k]);
    if (c && c !== REPORT_LAYOUT[k]) out[k] = c;
  }
  for (const k of LAYOUT_FLAGS) if (typeof r[k] === 'boolean' && r[k] !== REPORT_LAYOUT[k]) out[k] = r[k] as boolean;
  for (const k of LAYOUT_SIZES) {
    const n = typeof r[k] === 'number' && Number.isFinite(r[k]) ? Math.round(r[k] as number) : undefined;
    const [lo, hi] = SIZE_RANGE[k];
    if (n !== undefined && n !== REPORT_LAYOUT[k]) out[k] = Math.max(lo, Math.min(hi, n));
  }
  for (const k of ['font', 'headFont'] as const) if (LAYOUT_FONTS.includes(r[k] as LayoutFont) && r[k] !== REPORT_LAYOUT[k]) out[k] = r[k] as LayoutFont;
  if (LAYOUT_GRIDS.includes(r.tableGrid as LayoutGrid) && r.tableGrid !== REPORT_LAYOUT.tableGrid) out.tableGrid = r.tableGrid as LayoutGrid;
  return Object.keys(out).length ? out : undefined;
}

/** Regeln eines Projekts (Vorgabe + Abweichungen) */
export function layoutOf(p: Pick<Project, 'layout'> | undefined): LayoutRules {
  return { ...REPORT_LAYOUT, ...(p?.layout ?? {}) };
}
export const isDefaultLayout = (l: LayoutRules): boolean => (Object.keys(REPORT_LAYOUT) as (keyof LayoutRules)[]).every((k) => k === 'name' || l[k] === REPORT_LAYOUT[k]);

// ---------------------------------------------------------------- Farben rechnen

const rgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const hex = (c: number[]): string => `#${c.map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('')}`;
/** heller (f > 0, zu Weiß hin) oder dunkler (f < 0, zu Schwarz hin) */
export function shade(h: string, f: number): string {
  const c = rgb(h);
  return hex(c.map((x) => (f >= 0 ? x + (255 - x) * f : x * (1 + f))));
}

/** WCAG: relative Leuchtdichte und Kontrastverhältnis */
export function luminance(h: string): number {
  const [r, g, b] = rgb(h).map((x) => {
    const s = x / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100;
}
/** Schrift auf einer Fläche: Weiß oder Text-Farbe, je nachdem was mehr Kontrast hat */
export const textOn = (bg: string, ink = REPORT_LAYOUT.ink): string => (contrast('#ffffff', bg) >= contrast(ink, bg) ? '#ffffff' : ink);

export interface ContrastWarning {
  /** Regel, die zu wenig Kontrast hat */
  rule: LayoutColor;
  /** gegen welche Fläche */
  on: 'paper' | LayoutColor;
  ratio: number;
  /** nötig nach WCAG AA (Text 4,5, große Schrift/Grafik 3) */
  need: number;
}
/**
 * G7: Kontrast prüfen und warnen (WCAG AA), nie stillschweigend ändern. Geprüft werden die Paare, die auf den
 * Blättern und in den Grafiken wirklich vorkommen.
 */
export function contrastWarnings(l: LayoutRules): ContrastWarning[] {
  const pairs: [LayoutColor, 'paper' | LayoutColor, number][] = [
    ['ink', 'paper', 4.5],
    ['muted', 'paper', 4.5],
    ['head', 'paper', 4.5],
    ['ink', 'label', 4.5],
    ['primary', 'paper', 3],
    ['critical', 'paper', 3],
    ['accent', 'paper', 3],
    ['ok', 'paper', 3],
  ];
  const out: ContrastWarning[] = [];
  for (const [rule, on, need] of pairs) {
    const ratio = contrast(l[rule], on === 'paper' ? '#ffffff' : l[on]);
    if (ratio < need) out.push({ rule, on, ratio, need });
  }
  return out;
}

/** Druckfarben der Kurven (Ganglinie, MTA, Earned Value) aus der Vorlage – wie bisher `PRINT_COLORS` */
export function svgColorsOf(l: LayoutRules) {
  return { ink: l.ink, muted: l.muted, line: l.grid === REPORT_LAYOUT.grid ? '#cccccc' : l.grid, bar: l.bar, sum: l.critical === REPORT_LAYOUT.critical ? '#b3261e' : l.critical, budget: l.ok, dot: l.critical === REPORT_LAYOUT.critical ? '#b3261e' : l.critical };
}

/** Blätter: CSS-Variablen (nur abweichende, damit das Design-CSS greift, solange nichts gesetzt ist) */
export function paperVars(l: LayoutRules): Record<string, string> {
  const out: Record<string, string> = {};
  if (l.ink !== REPORT_LAYOUT.ink) out['--paper-ink'] = l.ink;
  if (l.head !== REPORT_LAYOUT.head) out['--paper-red'] = l.head;
  if (l.line !== REPORT_LAYOUT.line) out['--paper-line'] = shade(l.line, -0.45);
  if (l.label !== REPORT_LAYOUT.label) out['--paper-label'] = l.label;
  // V155 (G3 Rest)
  if (l.font !== REPORT_LAYOUT.font) out['--paper-font'] = FONT_CSS[l.font];
  if (l.headFont !== REPORT_LAYOUT.headFont) out['--paper-hfont'] = FONT_CSS[l.headFont];
  if (l.textSize !== REPORT_LAYOUT.textSize) out['--paper-scale'] = String(l.textSize / 100);
  if (l.headSize !== REPORT_LAYOUT.headSize) out['--paper-hscale'] = String(l.headSize / 100);
  if (l.tableSize !== REPORT_LAYOUT.tableSize) out['--paper-tscale'] = String(l.tableSize / 100);
  if (l.tableHead !== REPORT_LAYOUT.tableHead) (out['--paper-thead'] = l.tableHead), (out['--paper-thead-ink'] = textOn(l.tableHead));
  if (l.tableGrid !== REPORT_LAYOUT.tableGrid) out['--paper-grid'] = l.tableGrid;
  if (!l.printLogo) out['--paper-logo'] = 'none';
  return out;
}

/** V155 (G3 Rest): Kopf- und Fußzeile des Berichts im Druck (@page) nach den Regeln */
export function printFooter(l: LayoutRules, o: { no: string; name: string; stand: string }): { left: string; page: boolean } {
  return { left: [`Projektbericht ${l.printNo && o.no ? o.no : o.name}`, o.stand].join(' · '), page: l.printPage };
}

// ---------------------------------------------------------------- V155 (G2): Vorlagen im Arbeitsbereich

export type LayoutTemplate = { id: string; name: string; rules: Partial<LayoutRules> };
export const LAYOUT_TEMPLATES_MAX = 20;
/** Liest `Workspace.layoutTemplates`: gültige Regeln, eindeutige Ids und Namen */
export function parseLayoutTemplates(v: unknown): LayoutTemplate[] {
  if (!Array.isArray(v)) return [];
  const out: LayoutTemplate[] = [];
  for (const t of v.slice(0, LAYOUT_TEMPLATES_MAX)) {
    if (!t || typeof t !== 'object') continue;
    const r = t as Record<string, unknown>;
    const id = typeof r.id === 'string' && r.id ? r.id.slice(0, 60) : '';
    const name = typeof r.name === 'string' ? r.name.trim().slice(0, 60) : '';
    if (!id || !name || out.some((x) => x.id === id || x.name.toLowerCase() === name.toLowerCase())) continue;
    const rules = sanitizeLayout({ ...(r.rules as object), name }) ?? {};
    delete rules.name;
    out.push({ id, name, rules });
  }
  return out;
}
