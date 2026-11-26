/**
 * F-60, F-61, F-69, F-130, F-131, F-175: Darstellung – Hell, Dunkel, wie das System, Windows 2000/XP oder
 * Mac OS 9/Aqua (nur nachempfunden, ohne Logos und Originalgrafiken), dazu eine Akzentfarbe.
 * Die Akzentfarbe färbt alles Hervorgehobene (Panelnamen, Zurück/Vor, Knöpfe, aktiver Rahmen).
 */
import type { Workspace } from './types';

export type Theme = 'dark' | 'light' | 'system' | 'win2000' | 'winxp' | 'macos9' | 'aqua' | 'beos' | 'next' | 'amiga' | 'aero' | 'ubuntu' | 'snowleopard' | 'system7' | 'atari' | 'terminal';
/** Tatsächlich gezeigtes Design. */
export type Shown = Exclude<Theme, 'system'>;

/** F-176: Gruppen im Dialog „Design anpassen“. */
export type ThemeGroup = 'Modern' | 'Retro';

export const THEMES: { id: Theme; label: string; group: ThemeGroup }[] = [
  { id: 'dark', label: 'Dunkel', group: 'Modern' },
  { id: 'light', label: 'Hell', group: 'Modern' },
  { id: 'system', label: 'Wie System', group: 'Modern' },
  { id: 'win2000', label: 'Windows 2000', group: 'Retro' },
  { id: 'winxp', label: 'Windows XP', group: 'Retro' },
  { id: 'aero', label: 'Windows 7 Aero', group: 'Retro' },
  { id: 'system7', label: 'Mac System 7', group: 'Retro' },
  { id: 'macos9', label: 'Mac OS 9', group: 'Retro' },
  { id: 'aqua', label: 'Mac OS X Aqua', group: 'Retro' },
  { id: 'snowleopard', label: 'Snow Leopard', group: 'Retro' },
  { id: 'next', label: 'NeXTSTEP', group: 'Retro' },
  { id: 'beos', label: 'BeOS', group: 'Retro' },
  { id: 'amiga', label: 'Amiga Workbench', group: 'Retro' },
  { id: 'atari', label: 'Atari GEM', group: 'Retro' },
  { id: 'ubuntu', label: 'Ubuntu Ambiance', group: 'Retro' },
  { id: 'terminal', label: 'Terminal', group: 'Retro' },
];

export interface Look {
  theme: Theme;
  /** Akzentfarbe als #rrggbb. */
  accent: string;
}

/** Zur Wahl stehende Akzentfarben. Die Chakren-Farben stammen aus „Die 7 Chakren – Übersicht“. */
/** theme: Design, zu dem die Farbe gehört (F-175/F-176) – ihr Kontrast dort ist geprüft. */
export const ACCENTS: { name: string; hex: string; theme?: Shown }[] = [
  { name: 'Portfolio-Rot', hex: '#e4522c' },
  { name: 'Silber', hex: '#c8ccd6' },
  { name: 'Wurzelchakra (Rot)', hex: '#d3514a' },
  { name: 'Sakralchakra (Orange)', hex: '#e28a5b' },
  { name: 'Solarplexus (Goldgelb)', hex: '#ecb85c' },
  { name: 'Herzchakra (Grün)', hex: '#64a970' },
  { name: 'Halschakra (Hellblau)', hex: '#66afe1' },
  { name: 'Stirnchakra (Indigo)', hex: '#7f8fd0' },
  { name: 'Kronenchakra (Violett)', hex: '#b064a6' },
  { name: 'Windows-2000-Blau', hex: '#0a246a', theme: 'win2000' },
  { name: 'XP-Blau', hex: '#0054e3', theme: 'winxp' },
  { name: 'Platinum-Indigo', hex: '#3e3e94', theme: 'macos9' },
  { name: 'Aqua-Blau', hex: '#1a5fd0', theme: 'aqua' },
  { name: 'Aero-Blau', hex: '#1c5fa8', theme: 'aero' },
  { name: 'Snow-Leopard-Blau', hex: '#2a5bb0', theme: 'snowleopard' },
  { name: 'NeXT-Schwarz', hex: '#1a1a1a', theme: 'next' },
  { name: 'BeOS-Blau', hex: '#24507f', theme: 'beos' },
  { name: 'Amiga-Orange', hex: '#ffc27a', theme: 'amiga' },
  { name: 'Atari-Grün', hex: '#006b00', theme: 'atari' },
  { name: 'Ubuntu-Orange', hex: '#b8400f', theme: 'ubuntu' },
  { name: 'System-7-Schwarz', hex: '#000000', theme: 'system7' },
  { name: 'Terminal-Grün', hex: '#33ff66', theme: 'terminal' },
  { name: 'Terminal-Bernstein', hex: '#ffb000' },
];

/** F-161: Neue Nutzer starten mit „wie das System“. */
export const LOOK_DEFAULT: Look = { theme: 'system', accent: ACCENTS[0].hex };

/** Hintergrund je Modus (wie --bg im Stylesheet); daran misst sich der Kontrast. */
export const BACKGROUND: Record<Shown, string> = { dark: '#0c0c0f', light: '#eceef2', win2000: '#d4d0c8', winxp: '#ece9d8', macos9: '#dddddd', aqua: '#ececec', beos: '#d8d8d8', next: '#aaaaaa', amiga: '#0055aa', aero: '#f0f0f0', ubuntu: '#f2f1f0', snowleopard: '#e8e8e8', system7: '#ffffff', atari: '#ffffff', terminal: '#000000' };

/** Wo die Schrift steht – für den Kontrasthinweis. */
const WHERE: Record<Shown, string> = { dark: 'im dunklen Modus', light: 'im hellen Modus', win2000: 'im Windows-2000-Design', winxp: 'im Windows-XP-Design', macos9: 'im Mac-OS-9-Design', aqua: 'im Aqua-Design', beos: 'im BeOS-Design', next: 'im NeXTSTEP-Design', amiga: 'im Amiga-Design', aero: 'im Aero-Design', ubuntu: 'im Ubuntu-Design', snowleopard: 'im Snow-Leopard-Design', system7: 'im System-7-Design', atari: 'im Atari-Design', terminal: 'im Terminal-Design' };

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
/** F-178: Leuchtfarbe im Terminal – Akzentfarbe zu 60 % mit Weiß gemischt (wie color-mix im Stylesheet). */
export function phosphor(hex: string): string {
  return '#' + rgbOf(hex).map((c) => Math.round(c * 0.6 + 255 * 0.4).toString(16).padStart(2, '0')).join('');
}

export function contrastWarning(accent: string, shown: Shown): string | null {
  // im Terminal zählt die aufgehellte Farbe, die tatsächlich leuchtet
  const r = contrast(shown === 'terminal' ? phosphor(accent) : accent, BACKGROUND[shown]);
  return r < CONTRAST_MIN
    ? `Schwacher Kontrast (${r.toFixed(1).replace('.', ',')} : 1) – Schrift in dieser Farbe ist ${WHERE[shown]} schwer lesbar.`
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

/** F-178: eigene Akzentfarbe eines Designs (z. B. Terminal-Grün), sonst undefined. */
export const themeAccent = (shown: Shown): string | undefined => ACCENTS.find((a) => a.theme === shown)?.hex;

/**
 * F-178: Designwechsel – ist die bisherige Akzentfarbe im neuen Design schlecht lesbar, kommt die
 * Farbe des Designs mit (sonst die Grundfarbe). Gibt die Änderung zurück, die gespeichert wird.
 */
export function pickLook(current: Look, change: Partial<Look>, systemDark: boolean): Partial<Look> {
  if (!change.theme || change.accent) return change;
  const shown = resolveTheme(change.theme, systemDark);
  if (!contrastWarning(current.accent, shown)) return change;
  const accent = themeAccent(shown) ?? LOOK_DEFAULT.accent;
  return contrastWarning(accent, shown) ? change : { ...change, accent };
}

/** F-178: Im Terminal ist die Schrift die Akzentfarbe – eine zu dunkle Farbe wird dort durch Terminal-Grün ersetzt. */
export function shownAccent(accent: string, shown: Shown): string {
  return shown === 'terminal' && contrastWarning(accent, shown) ? (themeAccent('terminal') ?? accent) : accent;
}

/** F-161: Farben eines Desks ('' = Main Desk). Ein Desk ohne eigene Farben folgt dem Main Desk. */
export function lookOf(ws: Workspace, win: string): Look {
  const base = (win && ws.deskLooks?.[win]) || ws.look;
  // V117 (Projekt-Desk, PD3): ein gebundener Desk nimmt die Farbe seines Projekts
  const pid = ws.deskProjects?.[win]?.project;
  const accent = pid ? ws.projects?.find((p) => p.id === pid)?.accent : undefined;
  return accent ? { ...base, accent } : base;
}

/** F-161: Hat der Desk eigene Farben? Der Main Desk zählt nie als „eigen“ – er gibt sie vor. */
export const hasOwnLook = (ws: Workspace, win: string): boolean => !!win && !!ws.deskLooks?.[win];

/**
 * F-161: Darstellung oder Farbe eines Desks ändern. Auf dem Main Desk ändert das ws.look (und damit
 * alle Desks, die ihm folgen); auf einem Zusatz-Desk bekommt dieser ab jetzt eigene Farben.
 */
export function setDeskLook(ws: Workspace, win: string, change: Partial<Look>): Workspace {
  if (!win) return setLook(ws, change);
  const base = lookOf(ws, win);
  const theme = change.theme ?? base.theme;
  const accent = change.accent !== undefined && isHex(change.accent) ? change.accent.toLowerCase() : base.accent;
  const own = ws.deskLooks?.[win];
  if (own && own.theme === theme && own.accent === accent) return ws;
  return { ...ws, deskLooks: { ...ws.deskLooks, [win]: { theme, accent } } };
}

/** F-161: Desk folgt wieder dem Main Desk. */
export function followMainLook(ws: Workspace, win: string): Workspace {
  if (!hasOwnLook(ws, win)) return ws;
  const { [win]: _gone, ...rest } = ws.deskLooks!;
  return { ...ws, deskLooks: Object.keys(rest).length ? rest : undefined };
}

/** F-161: gespeicherte Desk-Farben prüfen; nur bekannte Desks, Unbrauchbares fällt weg. */
export function parseDeskLooks(v: unknown, ids: ReadonlySet<string>): Record<string, Look> | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const out: Record<string, Look> = {};
  for (const [k, o] of Object.entries(v as Record<string, unknown>)) {
    if (!k || !ids.has(k) || !o || typeof o !== 'object') continue;
    const l = o as Record<string, unknown>;
    if (THEMES.some((t) => t.id === l.theme) && isHex(l.accent)) out[k] = { theme: l.theme as Theme, accent: l.accent.toLowerCase() };
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * V70 (Wunsch Enrico: „Schrift so, dass man sie lesen kann“): Schriftfarbe auf einer Fläche in Akzentfarbe –
 * dunkel auf hellen Akzenten (z. B. Grau, Weiß, Gelb), sonst weiß.
 */
export function inkOn(hex: string): '#16181c' | '#ffffff' {
  // ab mittlerer Helligkeit dunkel; kräftige Farben (Orange, Blau, Grün) behalten weiße Schrift wie bei iOS
  return luminance(hex) > 0.36 ? '#16181c' : '#ffffff';
}
