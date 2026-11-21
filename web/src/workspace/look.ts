/**
 * F-60, F-61, F-69, F-130, F-131: Darstellung – Hell, Dunkel, wie das System oder Windows 2000, dazu eine Akzentfarbe.
 * Die Akzentfarbe färbt alles Hervorgehobene (Panelnamen, Zurück/Vor, Knöpfe, aktiver Rahmen).
 */
import type { Workspace } from './types';

export type Theme = 'dark' | 'light' | 'system' | 'win2000' | 'winxp';
/** Tatsächlich gezeigtes Design. */
export type Shown = 'dark' | 'light' | 'win2000' | 'winxp';

export const THEMES: { id: Theme; label: string }[] = [
  { id: 'dark', label: 'Dunkel' },
  { id: 'light', label: 'Hell' },
  { id: 'system', label: 'Wie System' },
  { id: 'win2000', label: 'Windows 2000' },
  { id: 'winxp', label: 'Windows XP' },
];

export interface Look {
  theme: Theme;
  /** Akzentfarbe als #rrggbb. */
  accent: string;
}

/** Zur Wahl stehende Akzentfarben. Die Chakren-Farben stammen aus „Die 7 Chakren – Übersicht“. */
export const ACCENTS: { name: string; hex: string }[] = [
  { name: 'Portfolio-Rot', hex: '#e4522c' },
  { name: 'Silber', hex: '#c8ccd6' },
  { name: 'Wurzelchakra (Rot)', hex: '#d3514a' },
  { name: 'Sakralchakra (Orange)', hex: '#e28a5b' },
  { name: 'Solarplexus (Goldgelb)', hex: '#ecb85c' },
  { name: 'Herzchakra (Grün)', hex: '#64a970' },
  { name: 'Halschakra (Hellblau)', hex: '#66afe1' },
  { name: 'Stirnchakra (Indigo)', hex: '#7f8fd0' },
  { name: 'Kronenchakra (Violett)', hex: '#b064a6' },
  { name: 'Windows-2000-Blau', hex: '#0a246a' },
  { name: 'XP-Blau', hex: '#0054e3' },
];

export const LOOK_DEFAULT: Look = { theme: 'dark', accent: ACCENTS[0].hex };

/** Hintergrund je Modus (wie --bg im Stylesheet); daran misst sich der Kontrast. */
export const BACKGROUND: Record<Shown, string> = { dark: '#0c0c0f', light: '#eceef2', win2000: '#d4d0c8', winxp: '#ece9d8' };

/** Kontrast, ab dem Schrift gut lesbar ist (WCAG AA für normale Schrift). */
export const CONTRAST_MIN = 4.5;

export function isHex(v: unknown): v is string {
  return typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
}

/** #rrggbb → [r, g, b]. */
export function rgbOf(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex: string): number {
  const [r, g, b] = rgbOf(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Kontrastverhältnis zweier Farben (1 bis 21). */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Tatsächlich gezeigter Modus; „wie System“ folgt der Einstellung des Geräts. */
export function resolveTheme(theme: Theme, systemDark: boolean): Shown {
  return theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
}

/** F-61: Hinweis, wenn die Akzentfarbe auf dem Hintergrund zu schwach ist; sonst null. */
export function contrastWarning(accent: string, shown: Shown): string | null {
  const r = contrast(accent, BACKGROUND[shown]);
  return r < CONTRAST_MIN
    ? `Schwacher Kontrast (${r.toFixed(1).replace('.', ',')} : 1) – Schrift in dieser Farbe ist ${shown === 'light' ? 'im hellen Modus' : shown === 'win2000' ? 'im Windows-2000-Design' : shown === 'winxp' ? 'im Windows-XP-Design' : 'im dunklen Modus'} schwer lesbar.`
    : null;
}

export function setLook(ws: Workspace, change: Partial<Look>): Workspace {
  const theme = change.theme ?? ws.look.theme;
  const accent = change.accent !== undefined && isHex(change.accent) ? change.accent.toLowerCase() : ws.look.accent;
  return theme === ws.look.theme && accent === ws.look.accent ? ws : { ...ws, look: { theme, accent } };
}

/** Gespeicherte Darstellung prüfen; Fehlendes kommt aus der Voreinstellung. */
export function parseLook(v: unknown): Look {
  const o = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  return {
    theme: THEMES.some((t) => t.id === o.theme) ? (o.theme as Theme) : LOOK_DEFAULT.theme,
    accent: isHex(o.accent) ? o.accent.toLowerCase() : LOOK_DEFAULT.accent,
  };
}
