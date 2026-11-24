/**
 * V75 (F-215, Entscheidung Enrico V72): Umschalter Desk Mode / Note Mode je Desk – in der Kopfzeile bei den
 * Layout-Ansichten, Beschriftung „Desk“ / „Notes“ mit Symbol. Note Mode: ein Pad füllt den Desk (Portale ruhen
 * unsichtbar dahinter); größere Bildschirme bekommen später das Board aus F-206. Auf dem Telefon (schmal) startet
 * jeder Desk von selbst im Note Mode, solange man dort nicht ausdrücklich „Desk“ gewählt hat.
 * Gespeichert je Gerät (Browser) und Desk – nicht im Abgleich, weil Telefon und Rechner verschieden arbeiten.
 */
export type DeskMode = 'desk' | 'notes';
export type DeskModes = Record<string, DeskMode>;

const KEY = 'esource.deskMode.v1';

export function modeOf(modes: DeskModes, desk: string, phone: boolean): DeskMode {
  return modes[desk] ?? (phone ? 'notes' : 'desk');
}

export function withMode(modes: DeskModes, desk: string, mode: DeskMode): DeskModes {
  return { ...modes, [desk]: mode };
}

export function parseModes(raw: string | null): DeskModes {
  try {
    const v = raw ? JSON.parse(raw) : null;
    if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
    const out: DeskModes = {};
    for (const [k, m] of Object.entries(v)) if (m === 'desk' || m === 'notes') out[k] = m;
    return out;
  } catch {
    return {};
  }
}

export function loadModes(): DeskModes {
  try {
    return parseModes(localStorage.getItem(KEY));
  } catch {
    return {};
  }
}

export function saveModes(m: DeskModes) {
  try {
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    // ohne Speicher: gilt bis zum Neuladen
  }
}
