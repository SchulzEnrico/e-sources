/**
 * F-200 Stufe 1: Entwickler-Modus – echte Größe der Seite in CSS-Pixeln und die passende Geräteklasse.
 * Media Queries der Seite richten sich nach dieser Größe, nicht nach dem Slot auf dem Bildschirm.
 */

/** Gängige Breakpoints (Breite in CSS-Pixeln, ab der die Klasse gilt). */
export const DEV_BREAKPOINTS = [
  { min: 0, name: 'Smartphone' },
  { min: 480, name: 'Smartphone quer' },
  { min: 768, name: 'Tablet' },
  { min: 1024, name: 'Laptop' },
  { min: 1280, name: 'Desktop' },
  { min: 1920, name: 'Großer Bildschirm' },
] as const;

export function breakpointOf(width: number): string {
  let name: string = DEV_BREAKPOINTS[0].name;
  for (const b of DEV_BREAKPOINTS) if (width >= b.min) name = b.name;
  return name;
}

/** Größe, die die Seite sieht: Anzeigefläche geteilt durch den Zoom. */
export function pageSize(shownW: number, shownH: number, zoom: number): { w: number; h: number } {
  const f = zoom > 0 ? 100 / zoom : 1;
  return { w: Math.round(shownW * f), h: Math.round(shownH * f) };
}
