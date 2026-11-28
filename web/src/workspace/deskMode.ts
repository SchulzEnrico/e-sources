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

/** V158 (Enrico 28.11.2026): E-Sources startet immer im Notizen-Modus – auf jedem Gerät (`phone` bleibt für alte Aufrufe). */
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
 * V158: beim Start des Hauptfensters (ohne `?win=`) vergisst E-Sources die Modi der letzten Sitzung – jeder Desk
 * beginnt im Notizen-Modus. Innerhalb der Sitzung (Desk-Wechsel, eigene Fenster) bleibt die Wahl erhalten.
 */
let started = false;
export function startModes(main: boolean): DeskModes {
  if (!started) {
    started = true;
    if (main) {
      saveModes({});
      return {};
    }
  }
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
