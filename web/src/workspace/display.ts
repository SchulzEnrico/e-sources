/**
 * F-183 Stufe 2: Einstellungen zur Anzeige der Symbole – gelten für diesen Browser (wie die Touren,
 * F-173), also für alle Desks gleichzeitig.
 * - „Kompakt: nur Symbole“: Beschriftungen in Kopfleiste und Cockpit fallen weg; der Name bleibt
 *   als Tooltip und für Bildschirmleser (NF-03).
 * - „Symbole der Webseiten“: Sources zeigen das Symbol ihrer Seite (Favicon). Es wird direkt von der
 *   Seite geholt (https://<domain>/favicon.ico, Entscheidung Enrico 22.11.2026) – kein Dienst
 *   dazwischen; die Seite erfährt nur, was sie beim Öffnen im Portal ohnehin erfährt. Ohne Symbol
 *   (oder ausgeschaltet) steht der Anfangsbuchstabe der Domain.
 */
import { hostOf } from './workspace';

const COMPACT_KEY = 'esource.compact';
const FAVICON_KEY = 'esource.favicons';

/** Name des Ereignisses, mit dem andere Teile der Oberfläche von einer Änderung erfahren. */
export const DISPLAY_EVENT = 'esource-display';

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // ohne Speicher: gilt nur bis zum Neuladen
  }
  window.dispatchEvent(new Event(DISPLAY_EVENT));
};

/** Kompakt: nur Symbole (Grundeinstellung aus). */
export const compactOn = (): boolean => read(COMPACT_KEY) === 'on';
export const setCompact = (on: boolean) => write(COMPACT_KEY, on ? 'on' : null);

/**
 * F-206 (V67, Wunsch Enrico): Deckkraft in Prozent – Pads und Dock getrennt, je Browser; Schieberegler
 * an Pad und Dock (und im NewPad-Menü). Bei Hover, Fokus und Ziehen immer ganz undurchsichtig.
 */
export const OPACITY_MIN = 20;
export const OPACITY_STEP = 5;
const PAD_OPACITY_KEY = 'esource.padOpacity';
const DOCK_OPACITY_KEY = 'esource.dockOpacity';
const opacityOf = (key: string): number => {
  const v = Number(read(key));
  return Number.isFinite(v) && v >= OPACITY_MIN && v < 100 ? Math.round(v / OPACITY_STEP) * OPACITY_STEP : 100;
};
const setOpacity = (key: string, v: number) => {
  const n = Math.round(Math.min(100, Math.max(OPACITY_MIN, v)) / OPACITY_STEP) * OPACITY_STEP;
  write(key, n === 100 ? null : String(n));
};
export const padOpacity = () => opacityOf(PAD_OPACITY_KEY);
export const dockOpacity = () => opacityOf(DOCK_OPACITY_KEY);
export const setPadOpacity = (v: number) => setOpacity(PAD_OPACITY_KEY, v);
export const setDockOpacity = (v: number) => setOpacity(DOCK_OPACITY_KEY, v);

/**
 * V75 (F-215, Telefon A2, Entscheidung Enrico V72): Steuerknopf über der Tastatur – Deckkraft 10–100 % (ab Werk 25 %)
 * und Lage waagerecht (0 = links, 100 = rechts, ab Werk Mitte). Je Gerät bzw. Browser, nicht im Abgleich.
 */
export const KNOB_OP_MIN = 10;
export const KNOB_OP_DEFAULT = 25;
const KNOB_OP_KEY = 'esource.knobOpacity';
const KNOB_X_KEY = 'esource.knobX';
export function clampKnobOpacity(v: number): number {
  if (!Number.isFinite(v)) return KNOB_OP_DEFAULT;
  return Math.round(Math.min(100, Math.max(KNOB_OP_MIN, v)) / OPACITY_STEP) * OPACITY_STEP;
}
export function clampKnobX(v: number): number {
  return Number.isFinite(v) ? Math.round(Math.min(100, Math.max(0, v))) : 50;
}
export const knobOpacity = (): number => {
  const r = read(KNOB_OP_KEY);
  return r === null ? KNOB_OP_DEFAULT : clampKnobOpacity(Number(r));
};
export const setKnobOpacity = (v: number) => {
  const n = clampKnobOpacity(v);
  write(KNOB_OP_KEY, n === KNOB_OP_DEFAULT ? null : String(n));
};
export const knobX = (): number => {
  const r = read(KNOB_X_KEY);
  return r === null ? 50 : clampKnobX(Number(r));
};
export const setKnobX = (v: number) => {
  const n = clampKnobX(v);
  write(KNOB_X_KEY, n === 50 ? null : String(n));
};

/** Symbole der Webseiten zeigen (Grundeinstellung an). */
export const faviconsOn = (): boolean => read(FAVICON_KEY) !== 'off';
export const setFavicons = (on: boolean) => write(FAVICON_KEY, on ? null : 'off');

/** Domain ohne „www.“ – aus dem Text der Adresse, damit Umlaute (überall.de) nicht zu „xn--…“ werden. */
const domain = (url: string) => {
  const raw = url.trim().match(/^[a-z][a-z\d+.-]*:\/\/([^/:?#@]+)/i)?.[1];
  return (raw || hostOf(url) || '').toLowerCase().replace(/^www\./, '');
};

/** Adresse des Seitensymbols – nur für http(s)-Seiten, sonst null. */
export function faviconUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    return `${u.protocol}//${u.host}/favicon.ico`;
  } catch {
    return null;
  }
}

/** Anfangsbuchstabe der Domain (groß), Ersatz ohne Seitensymbol. */
export function siteLetter(url: string): string {
  const d = domain(url);
  const ch = d.match(/[\p{L}\p{N}]/u)?.[0] ?? '?';
  return ch.toLocaleUpperCase('de');
}

/** Feste Farbe je Domain (Farbton aus dem Namen) – Unterscheidung nie nur über Farbe: der Buchstabe steht dabei. */
export function siteHue(url: string): number {
  let h = 0;
  for (const c of domain(url)) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}
