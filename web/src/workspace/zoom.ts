/**
 * F-194: Zoom je Portal. E-Sources kann nicht in fremde Seiten hineingreifen – darum wird das ganze
 * eingebettete Fenster skaliert: bei 80 % bekommt die Seite 125 % der Breite und Höhe und wird
 * verkleinert gezeigt (wie Browser-Zoom). Der Wert ist ein fester Faktor: Wird der Slot größer,
 * bekommt die Seite mehr Platz, die Schrift bleibt gleich groß.
 */
import type { Workspace } from './types';

export const ZOOM_STEPS = [50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200] as const;
export const ZOOM_DEFAULT = 100;

/** Zoom eines Portals in Prozent (fehlt = 100). */
export const zoomOf = (p: { zoom?: number }) => p.zoom ?? ZOOM_DEFAULT;

/** Nächste Stufe nach oben (dir 1) oder unten (dir -1); bleibt am Rand stehen. */
export function zoomStep(cur: number, dir: 1 | -1): number {
  if (dir > 0) return ZOOM_STEPS.find((z) => z > cur) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1];
  return [...ZOOM_STEPS].reverse().find((z) => z < cur) ?? ZOOM_STEPS[0];
}

/** Gültiger gespeicherter Wert? Nur Stufen aus ZOOM_STEPS außer 100. */
export const parseZoom = (v: unknown): number | undefined =>
  typeof v === 'number' && v !== ZOOM_DEFAULT && (ZOOM_STEPS as readonly number[]).includes(v) ? v : undefined;

export function setZoom(ws: Workspace, id: string, zoom: number): Workspace {
  const z = parseZoom(zoom);
  let changed = false;
  const panels = ws.panels.map((p) => {
    if (p.id !== id || p.zoom === z) return p;
    changed = true;
    const { zoom: _z, ...rest } = p;
    return z ? { ...rest, zoom: z } : rest;
  });
  return changed ? { ...ws, panels } : ws;
}

/** Stil für das iframe: größer anlegen und zurückskalieren. */
export function zoomStyle(zoom: number): { width: string; height: string; transform: string; transformOrigin: string } | undefined {
  if (zoom === ZOOM_DEFAULT) return undefined;
  const size = `${(100 * 100) / zoom}%`;
  return { width: size, height: size, transform: `scale(${zoom / 100})`, transformOrigin: '0 0' };
}

/*
 * F-194 Stufe 2: „Breite halten“. Statt eines festen Faktors merkt sich das Portal, wie breit die
 * Seite sein soll (`fit`, in Pixeln). Der Zoom ergibt sich dann aus der Breite des Slots: wird der
 * Slot schmaler, wird die Seite kleiner gezeigt, statt umzubrechen (z. B. Desktop-Ansicht bleibt).
 */
export const FIT_MIN = 320;
export const FIT_MAX = 3840;

/** Gültige gemerkte Seitenbreite? Ganze Pixel von FIT_MIN bis FIT_MAX. */
export const parseFit = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isInteger(v) && v >= FIT_MIN && v <= FIT_MAX ? v : undefined;

/** Breite einer Desktop-Ansicht: so breit wird die Seite mindestens, wenn man bei 100 % einschaltet. */
export const FIT_DESKTOP = 1280;

/**
 * Seitenbreite beim Einschalten: Ist schon ein Zoom gesetzt, bleibt die Seite genau so, wie sie gerade
 * aussieht; bei 100 % mindestens die Desktop-Ansicht (sonst würde ein schmaler Slot nur seine Breite halten).
 */
export const fitStart = (width: number, zoom: number): number =>
  zoom === ZOOM_DEFAULT ? Math.max(FIT_DESKTOP, fitFor(width, zoom)) : fitFor(width, zoom);

/** Seitenbreite, die bei dieser Slot-Breite zum Zoom passt. */
export const fitFor = (width: number, zoom: number): number =>
  Math.min(FIT_MAX, Math.max(FIT_MIN, Math.round((width * 100) / zoom)));

/** Zoom (nicht gerundet, 50–200 %), damit die Seite `fit` Pixel breit ist. */
export const fitZoom = (width: number, fit: number): number =>
  Math.min(ZOOM_STEPS[ZOOM_STEPS.length - 1], Math.max(ZOOM_STEPS[0], (width * 100) / fit));

/** Zoom, der gerade gilt: mit „Breite halten“ aus der Slot-Breite, sonst der feste Wert. */
export const shownZoom = (p: { zoom?: number; fit?: number }, width: number): number =>
  p.fit && width > 0 ? fitZoom(width, p.fit) : zoomOf(p);

/** Nächste Stufe aus einem beliebigen (auch krummen) Zoom; bei Gleichstand die genaue Stufe. */
export function nearestStep(zoom: number): number {
  return ZOOM_STEPS.reduce((a, b) => (Math.abs(b - zoom) < Math.abs(a - zoom) ? b : a), ZOOM_STEPS[0]);
}

/**
 * „Breite halten“ an (`fit` = Seitenbreite) oder aus (fit fehlt). Beim Ausschalten bleibt die Seite so,
 * wie sie gerade aussieht: der feste Zoom wird die nächste Stufe zum aktuellen Zoom (`zoom`).
 */
export function setFit(ws: Workspace, id: string, fit: number | undefined, zoom?: number): Workspace {
  const f = parseFit(fit);
  let changed = false;
  const panels = ws.panels.map((p) => {
    if (p.id !== id) return p;
    const { fit: _f, zoom: _z, ...rest } = p;
    const z = parseZoom(f ? p.zoom : zoom !== undefined ? nearestStep(zoom) : p.zoom);
    const next = { ...rest, ...(z ? { zoom: z } : {}), ...(f ? { fit: f } : {}) };
    if (next.fit === p.fit && next.zoom === p.zoom) return p;
    changed = true;
    return next;
  });
  return changed ? { ...ws, panels } : ws;
}

/** Zuletzt gemessene Breite des Seitenbereichs je Portal (für Tastenkürzel außerhalb des Portals). */
const widths = new Map<string, number>();
export const frameWidth = (id: string): number => widths.get(id) ?? 0;
export const setFrameWidth = (id: string, w: number): void => {
  widths.set(id, w);
};
