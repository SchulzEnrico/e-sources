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
