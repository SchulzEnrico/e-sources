/**
 * F-179: Persönlicher Empfang mit lokalem Profil – ohne Login und ohne Server (Vorstufe zu Konten,
 * Ausbaustufe 4). Das Profil liegt in der Arbeitsfläche (kommt mit in „Desks exportieren“); welches
 * Portal zuletzt offen war, merkt sich jeder Desk nur im Browser. Im Testmodus wird nichts gespeichert.
 */
import type { Workspace } from './types';

export interface Profile {
  /** frei, auch leer */
  name: string;
  /** Kennfarbe: Index in PROFILE_COLORS */
  color: number;
  /** Begrüßung beim Start zeigen */
  greet: boolean;
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
  return { name, color: c, greet: d.greet !== false };
}

/** Leerzeichen zusammenziehen, Länge begrenzen. */
export const cleanName = (s: string): string => s.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);

/** Profil ändern; ein Profil ganz ohne Abweichung von der Voreinstellung fällt weg. */
export function setProfile(ws: Workspace, change: Partial<Profile>): Workspace {
  const next: Profile = { ...profileOf(ws), ...change };
  next.name = cleanName(next.name);
  const plain = !next.name && next.color === 0 && next.greet;
  if (plain) {
    if (!ws.profile) return ws;
    const { profile: _drop, ...rest } = ws; // eslint-disable-line @typescript-eslint/no-unused-vars
    return rest;
  }
  return { ...ws, profile: next };
}

/** Initialen: „Enrico Schulz“ → „ES“, „Enrico“ → „E“, leer → „“. */
export function initialsOf(name: string): string {
  const parts = cleanName(name).split(' ').filter(Boolean);
  if (!parts.length) return '';
  const first = [...parts[0]][0] ?? '';
  const last = parts.length > 1 ? ([...parts[parts.length - 1]][0] ?? '') : '';
  return (first + last).toUpperCase();
}

/** Gruß je Tageszeit (Stunde 0–23); mit Namen „Guten Abend, Enrico“. */
export function greetingFor(hour: number, name = ''): string {
  const g = hour >= 5 && hour < 11 ? 'Guten Morgen' : hour >= 11 && hour < 18 ? 'Guten Tag' : hour >= 18 && hour < 23 ? 'Guten Abend' : 'Hallo';
  const n = cleanName(name);
  return n ? `${g}, ${n}` : g;
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
