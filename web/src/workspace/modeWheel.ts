/**
 * V83 (F-216, Wunsch Enrico V82): Umschalt-Rad – reine Logik ohne Oberfläche.
 * Ein Rad für alle Knöpfe, die zwischen Modi umschalten (Daumenrad der MX Master: geriffelte Walzen links und
 * rechts, Name in der Mitte). Hier: Scroll-/Wischweg → Rasten, Anschlag bzw. ringsum, Verzögerung bis zum Umschalten,
 * Text für Bildschirmleser. Bedienung siehe `components/ModeWheel.tsx`.
 */

/** Weg in px für eine Raste beim Scrollen (Mausrad: ein Ruck ≈ 100 px = eine Raste; Trackpad sammelt). */
export const NOTCH_PX = 40;
/** Weg in px für eine Raste beim Wischen auf Touch (etwa die Höhe eines Namens). */
export const SWIPE_PX = 24;
/** U1: Das Rad schaltet 0,3 s nach der letzten Raste (dazwischen nur anzeigen). */
export const COMMIT_MS = 300;
/** Ab diesem Weg (px) ist ein Zeigerdruck ein Wischen und kein Klick. */
export const DRAG_PX = 6;

/** Scroll-Weg auf Pixel umrechnen (deltaMode 1 = Zeilen, 2 = Seiten). */
export function deltaPx(delta: number, mode = 0, page = 800): number {
  return mode === 1 ? delta * 16 : mode === 2 ? delta * page : delta;
}

/**
 * Gesammelter Weg + neuer Weg → ganze Rasten und Rest. Richtungswechsel verwirft den alten Rest
 * (sonst „hängt“ das Rad nach dem Umkehren). Ein einzelner großer Ruck gibt höchstens 3 Rasten.
 */
export function addTravel(acc: number, delta: number, notch = NOTCH_PX): { steps: number; acc: number } {
  let a = acc !== 0 && Math.sign(acc) !== Math.sign(delta) ? 0 : acc;
  a += delta;
  let steps = Math.trunc(a / notch) || 0; // nie −0
  const left = a - steps * notch;
  steps = Math.max(-3, Math.min(3, steps));
  return { steps, acc: steps === 0 ? a : left };
}

/** Position um `steps` weiterdrehen – U3: Anschlag (wrap = false) oder ringsum. */
export function turn(pos: number, steps: number, count: number, wrap = false): number {
  if (count <= 0) return 0;
  const v = pos + steps;
  return wrap ? ((v % count) + count) % count : Math.max(0, Math.min(count - 1, v));
}

/** U3: ringsum nur bei vielen Modi (Darstellung, Akzentfarbe); bei 2–5 Modi Anschlag – außer ausdrücklich gewünscht. */
export function wrapsFor(count: number, wrap?: boolean): boolean {
  return wrap ?? count > 5;
}

/** Klick = nächster, Umschalt+Klick = voriger. Bei Anschlag springt der Klick am Ende zurück zum Anfang (sonst täte er nichts). */
export function clickTurn(pos: number, count: number, back: boolean): number {
  if (count <= 1) return 0;
  const v = pos + (back ? -1 : 1);
  return ((v % count) + count) % count;
}

/** Tasten → neue Position (oder null = nicht unsere Taste). Pfeil hoch/links = voriger, runter/rechts = nächster. */
export function keyTurn(key: string, pos: number, count: number, wrap: boolean): number | null {
  switch (key) {
    case 'ArrowUp':
    case 'ArrowLeft':
      return turn(pos, -1, count, wrap);
    case 'ArrowDown':
    case 'ArrowRight':
      return turn(pos, 1, count, wrap);
    case 'Home':
      return 0;
    case 'End':
      return Math.max(0, count - 1);
    case 'Enter':
    case ' ':
      return clickTurn(pos, count, false);
    default:
      return null;
  }
}

/** Bildschirmleser: „Notizen, 2 von 2“. */
export function valueText(name: string, pos: number, count: number): string {
  return `${name}, ${pos + 1} von ${count}`;
}

/** Nachbarn für die Anzeige (U4: halb sichtbar beim Hover/Drehen); am Anschlag fehlt der Nachbar. */
export function neighbours(pos: number, count: number, wrap: boolean): { prev: number | null; next: number | null } {
  if (count <= 1) return { prev: null, next: null };
  const p = pos - 1;
  const n = pos + 1;
  return {
    prev: p >= 0 ? p : wrap ? count - 1 : null,
    next: n < count ? n : wrap ? 0 : null,
  };
}

/**
 * Drehen aus jeder Lage: `pos = -1` heißt „zwischen den Rasten“ (z. B. Rad „Pads“ = Gemischt) und liegt zwischen
 * `after` und `after + 1`. Eine Raste vor landet auf `after + 1`, eine zurück auf `after`.
 */
export function turnFrom(pos: number, steps: number, count: number, wrap: boolean, after = 0): number {
  if (pos >= 0 || !steps) return pos >= 0 ? turn(pos, steps, count, wrap) : pos;
  return steps > 0 ? turn(after + 1, steps - 1, count, wrap) : turn(after, steps + 1, count, wrap);
}
