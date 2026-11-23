/**
 * F-52: Einstellungen für dieses Gerät (= dieser Browser auf diesem Rechner). Sie stehen nur im
 * lokalen Speicher, nicht in der Belegung – Export/Import und späterer Abgleich (F-169) nehmen sie
 * nicht mit. Änderungen melden sich über DISPLAY_EVENT wie die Anzeige-Einstellungen (display.ts).
 */
import { DISPLAY_EVENT } from './display';

const STANDARD_KEY = 'esource.device.standard';

/** Feste Untergrenze je Portal über der empfohlenen Slotzahl – Kopfzeile und Knöpfe bleiben bedienbar. */
export const PORTAL_MIN_PX = { w: 240, h: 160 };


/** Standard-Layout: Desk und Id des Layouts; fehlt = „Gleichmäßig“. */
export interface StandardRef {
  win: string;
  id: string;
}

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

export function standardRef(): StandardRef | null {
  try {
    const v = JSON.parse(read(STANDARD_KEY) ?? 'null');
    return v && typeof v.win === 'string' && typeof v.id === 'string' ? { win: v.win, id: v.id } : null;
  } catch {
    return null;
  }
}
export const setStandardRef = (ref: StandardRef | null) => write(STANDARD_KEY, ref ? JSON.stringify(ref) : null);

