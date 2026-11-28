/**
 * V75 (F-215, Entscheidung Enrico V72): Umschalter Desk Mode / Note Mode je Desk – in der Kopfzeile bei den
 * Layout-Ansichten, Beschriftung „Desk“ / „Notes“ mit Symbol. Note Mode: ein Pad füllt den Desk (Portale ruhen
 * unsichtbar dahinter); größere Bildschirme bekommen später das Board aus F-206. Auf dem Telefon (schmal) startet
 * jeder Desk von selbst im Note Mode, solange man dort nicht ausdrücklich „Desk“ gewählt hat.
 * Gespeichert je Gerät (Browser) und Desk – nicht im Abgleich, weil Telefon und Rechner verschieden arbeiten.
 */
/** V99 (F-206 Schritt 10): dritter Modus „Projekte“ – Projektliste und Steckbrief füllen den Desk. */
export type DeskMode = 'desk' | 'notes' | 'projects';
export type DeskModes = Record<string, DeskMode>;

const KEY = 'esource.deskMode.v1';
/** V76: Telefon – schmal (Hochformat) oder niedrig mit Touch (Querformat); gleiche Regel wie das Vollbild im CSS */
export const PHONE_MQ = '(max-width: 600px), (pointer: coarse) and (max-height: 600px)';

/** Ohne gemerkten Modus (erster Start auf dem Gerät) beginnt ein Desk mit Notizen (V158); sonst der zuletzt gewählte (V159). */
export function modeOf(modes: DeskModes, desk: string, _phone?: boolean): DeskMode {
  return modes[desk] ?? 'notes';
}

/** V158: Reihenfolge im Rad „Arbeitsweise dieses Desks“ – Notizen, Projekte, zuletzt Desk (meistgenutzt zuerst). */
export const DESK_MODE_ORDER: readonly DeskMode[] = ['notes', 'projects', 'desk'];

export function withMode(modes: DeskModes, desk: string, mode: DeskMode): DeskModes {
  return { ...modes, [desk]: mode };
}

export function parseModes(raw: string | null): DeskModes {
  try {
    const v = raw ? JSON.parse(raw) : null;
    if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
    const out: DeskModes = {};
    for (const [k, m] of Object.entries(v)) if (m === 'desk' || m === 'notes' || m === 'projects') out[k] = m;
    return out;
  } catch {
    return {};
  }
}

/**
 * V159 (Enrico 28.11. 14:23 „pro Gerät merken, was die letzte Anzeige war, und dort wieder starten“): E-Sources
 * startet je Desk in dem Modus, der auf diesem Gerät zuletzt offen war (Notizen, Projekte oder Desk). Nur beim
 * allerersten Start auf einem Gerät (nichts gemerkt) beginnt es mit Notizen (`modeOf`). Ersetzt die V158-Regel
 * „immer Notizen“. `main` bleibt für alte Aufrufe.
 */
export function startModes(_main?: boolean): DeskModes {
  return loadModes();
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
