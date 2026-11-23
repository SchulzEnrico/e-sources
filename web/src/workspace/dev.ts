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

// ---------------------------------------------------------------- F-200 Stufe 2: Werkbank

/** Geräte zur Wahl (Größe hochkant in CSS-Pixeln; „Drehen“ tauscht Breite und Höhe). */
export const DEV_DEVICES = [
  { id: 'phone', name: 'Smartphone', w: 390, h: 844 },
  { id: 'phoneXL', name: 'Smartphone groß', w: 430, h: 932 },
  { id: 'tablet', name: 'Tablet', w: 768, h: 1024 },
  { id: 'laptop', name: 'Laptop', w: 1280, h: 800 },
  { id: 'desktop', name: 'Desktop', w: 1440, h: 900 },
  { id: 'fullhd', name: 'Full HD', w: 1920, h: 1080 },
] as const;

/** Zoom-Test wie Browser-Zoom (WCAG 1.4.4 Text vergrößern, 1.4.10 Reflow). */
export const DEV_SCALES = [100, 200, 400] as const;

export type DevDevice = (typeof DEV_DEVICES)[number];

export const devDeviceOf = (id?: string): DevDevice | undefined => DEV_DEVICES.find((d) => d.id === id);

/** Gültige gespeicherte Einstellung? Unbekanntes fällt weg; leer = undefined. */
export function parseDevView(v: unknown): { device?: string; turned?: boolean; scale?: number } | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const o = v as Record<string, unknown>;
  const device = typeof o.device === 'string' && devDeviceOf(o.device) ? o.device : undefined;
  const turned = device && o.turned === true ? true : undefined;
  const scale = typeof o.scale === 'number' && o.scale !== 100 && (DEV_SCALES as readonly number[]).includes(o.scale) ? o.scale : undefined;
  const out = { ...(device ? { device } : {}), ...(turned ? { turned } : {}), ...(scale ? { scale } : {}) };
  return Object.keys(out).length ? out : undefined;
}

/** Größe des Geräts in der gewählten Lage (oder undefined = Slot frei). */
export function devSizeOf(v?: { device?: string; turned?: boolean }): { w: number; h: number } | undefined {
  const d = devDeviceOf(v?.device);
  if (!d) return undefined;
  return v?.turned ? { w: d.h, h: d.w } : { w: d.w, h: d.h };
}

/**
 * Was das Portal zeigt: `page` = Größe, die die Seite sieht (CSS-Pixel), `shown` = Fläche im Slot,
 * `scale` = Faktor, mit dem das iframe gezeigt wird. Ohne Gerät füllt die Seite den Slot; mit Gerät
 * wird das ganze Gerät eingepasst. Der Zoom-Test teilt die Seitengröße durch den Faktor.
 */
export function devFrame(v: { device?: string; turned?: boolean; scale?: number } | undefined, boxW: number, boxH: number) {
  const z = (v?.scale ?? 100) / 100;
  const dev = devSizeOf(v);
  if (!dev || boxW <= 0 || boxH <= 0) {
    return { page: { w: Math.round(boxW / z), h: Math.round(boxH / z) }, shown: { w: boxW, h: boxH }, scale: z, device: false };
  }
  const fit = Math.min(boxW / dev.w, boxH / dev.h);
  const shown = { w: Math.round(dev.w * fit), h: Math.round(dev.h * fit) };
  const page = { w: Math.round(dev.w / z), h: Math.round(dev.h / z) };
  return { page, shown, scale: shown.w / page.w, device: true };
}

/**
 * V55: Abstände der Lineal-Striche in Seiten-Pixeln, passend zum Faktor (Bildschirm ÷ Seite).
 * Kurze Striche liegen mindestens 8 Bildschirmpunkte auseinander, Zahlen mindestens 50.
 * Mittel = 5 × kurz, lang = 10 × kurz. Werte aus 1, 2, 5 × 10^n.
 */
export function rulerSteps(scale: number): { minor: number; mid: number; major: number; label: number } {
  const s = scale > 0 && Number.isFinite(scale) ? scale : 1;
  const nice: number[] = [];
  for (let k = 0; k <= 5; k++) for (const m of [1, 2, 5]) nice.push(m * 10 ** k);
  const minor = nice.find((n) => n * s >= 8) ?? nice[nice.length - 1];
  const major = minor * 10;
  const label = nice.find((n) => n >= major && n * s >= 50 && n % major === 0) ?? major;
  return { minor, mid: minor * 5, major, label };
}
