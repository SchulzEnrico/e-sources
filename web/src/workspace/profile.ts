/**
 * F-179: Persönlicher Empfang mit lokalem Profil – ohne Login und ohne Server (Vorstufe zu Konten,
 * Ausbaustufe 4). Das Profil liegt in der Arbeitsfläche (kommt mit in „Desks exportieren“); welches
 * Portal zuletzt offen war, merkt sich jeder Desk nur im Browser. Im Testmodus wird nichts gespeichert.
 */
import type { Workspace } from './types';
import { type Welcome, isDefaultWelcome, parseWelcome, standardGreeting } from './welcome';

export interface Profile {
  /** frei, auch leer */
  name: string;
  /** Kennfarbe: Index in PROFILE_COLORS */
  color: number;
  /** Begrüßung beim Start zeigen */
  greet: boolean;
  /** F-205: Wahl der Begrüßung (fehlt = Standard nach Tageszeit) */
  welcome?: Welcome;
}

/** Kennfarben – kräftig genug für weiße Initialen (Kontrast ≥ 4,5:1). */
export const PROFILE_COLORS: { name: string; hex: string }[] = [
  { name: 'Blau', hex: '#1d5fd1' },
  { name: 'Petrol', hex: '#0b6e75' },
  { name: 'Grün', hex: '#237a3b' },
  { name: 'Olivgrün', hex: '#5d6b12' },
  { name: 'Orange', hex: '#b34a00' },
  { name: 'Rot', hex: '#c22a2a' },
  { name: 'Beere', hex: '#a3245f' },
  { name: 'Violett', hex: '#6b3fc4' },
];

export const PROFILE_DEFAULT: Profile = { name: '', color: 0, greet: true };
export const NAME_MAX = 40;

export const profileOf = (ws: Workspace): Profile => ws.profile ?? PROFILE_DEFAULT;

/** Aus gespeicherten oder importierten Daten; Unbrauchbares fällt auf die Voreinstellung. */
export function parseProfile(data: unknown): Profile | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const d = data as Record<string, unknown>;
  const name = typeof d.name === 'string' ? cleanName(d.name) : '';
  const c = typeof d.color === 'number' && Number.isInteger(d.color) && d.color >= 0 && d.color < PROFILE_COLORS.length ? d.color : 0;
  const welcome = parseWelcome(d.welcome);
  return { name, color: c, greet: d.greet !== false, ...(welcome && !isDefaultWelcome(welcome) ? { welcome } : {}) };
}

/** Leerzeichen zusammenziehen, Länge begrenzen. */
export const cleanName = (s: string): string => s.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);

/** Profil ändern; ein Profil ganz ohne Abweichung von der Voreinstellung fällt weg. */
export function setProfile(ws: Workspace, change: Partial<Profile>): Workspace {
  const next: Profile = { ...profileOf(ws), ...change };
  next.name = cleanName(next.name);
  if (next.welcome && isDefaultWelcome(next.welcome)) delete next.welcome;
  const plain = !next.name && next.color === 0 && next.greet && !next.welcome;
  if (plain) {
    if (!ws.profile) return ws;
    const { profile: _drop, ...rest } = ws; // eslint-disable-line @typescript-eslint/no-unused-vars
    return rest;
  }
  return { ...ws, profile: next };
}

/** Initialen: „Enrico Schulz“ → „ES“, „Enrico“ → „E“, leer → „“. */
export function initialsOf(name: string): string {
  // V117: Rolle nach „ – “, Klammern und Anreden (Fr., Hr., Dr., Frau, Herr) zählen nicht – „Fr. Stanczak – Leitung (CG)“ → „S“.
  const core = cleanName(name).split(/\s[–—-]\s/)[0].replace(/\([^)]*\)?/g, ' ');
  const parts = core.split(' ').filter((w) => /^\p{L}/u.test(w) && !/^(fr|hr|dr|prof|frau|herr)\.?$/i.test(w) && !/\.$/.test(w));
  if (!parts.length) return '';
  const first = [...parts[0]][0] ?? '';
  const last = parts.length > 1 ? ([...parts[parts.length - 1]][0] ?? '') : '';
  return (first + last).toUpperCase();
}

/** Gruß je Tageszeit (Stunde 0–23): Morgen 5–9, Tag 9–17, Abend 17–23 Uhr, nachts „Hallo“ (Wunsch Enrico V43); mit Namen „Guten Abend, Enrico“. */
export function greetingFor(hour: number, name = ''): string {
  return standardGreeting(hour, cleanName(name));
}

// ---------------------------------------------------------------- Zuletzt offen (je Desk, nur Browser)

const LAST_KEY = 'esource.last.';

/** Zuletzt aktives Portal dieses Desks ('' = Haupt-Desk). */
export function loadLast(win: string): string | null {
  try {
    return localStorage.getItem(LAST_KEY + (win || 'main'));
  } catch {
    return null;
  }
}

export function saveLast(win: string, panelId: string): void {
  try {
    localStorage.setItem(LAST_KEY + (win || 'main'), panelId);
  } catch {
    // ohne Speicher: nichts zu merken
  }
}
