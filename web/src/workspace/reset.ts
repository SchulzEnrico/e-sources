/**
 * F-191: „Zurücksetzen“ in Dialogen mit sofortiger Vorschau – Stand beim Öffnen merken und wieder
 * herstellen. Nur die Felder, die der jeweilige Dialog ändert (nicht den ganzen Workspace, damit
 * z. B. Seitenwechsel in Portalen erhalten bleiben).
 */
import type { Tint, Workspace } from './types';

/** Dialog „Farben“: Portal (Farbe, Kategorie), Kategorien (Farbe, Zeichen), Seite → Kategorie. Den Slot setzt App über `tintSlot`. */
export interface ColorsSnap {
  panel: string;
  tint?: Tint;
  category?: string;
  slotTint?: Tint;
  categories: Record<string, { tint?: Tint; icon?: string }>;
  siteCategory?: Record<string, string>;
}

export function snapColors(ws: Workspace, panelId: string, slotTint?: Tint): ColorsSnap {
  const p = ws.panels.find((x) => x.id === panelId);
  const categories: ColorsSnap['categories'] = {};
  for (const c of ws.categories) categories[c.id] = { ...(c.tint ? { tint: c.tint } : {}), ...(c.icon ? { icon: c.icon } : {}) };
  return {
    panel: panelId,
    ...(p?.tint ? { tint: p.tint } : {}),
    ...(p?.category !== undefined ? { category: p.category } : {}),
    ...(slotTint ? { slotTint } : {}),
    categories,
    ...(ws.siteCategory ? { siteCategory: ws.siteCategory } : {}),
  };
}

/** Gleicher Stand? (für „Zurücksetzen“ nur, wenn sich etwas geändert hat) */
export const sameSnap = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Geändert seit dem Öffnen? Neu angelegte Kategorien zählen nicht (sie bleiben beim Zurücksetzen). */
export function colorsChanged(start: ColorsSnap, now: ColorsSnap): boolean {
  const categories: ColorsSnap['categories'] = {};
  for (const id of Object.keys(start.categories)) categories[id] = now.categories[id] ?? {};
  return !sameSnap(start, { ...now, categories });
}

/** Portal und Kategorien auf den gemerkten Stand; neu angelegte Kategorien bleiben bestehen. */
export function restoreColors(ws: Workspace, s: ColorsSnap): Workspace {
  const panels = ws.panels.map((p) => {
    if (p.id !== s.panel) return p;
    const { tint: _t, category: _c, ...rest } = p;
    return { ...rest, ...(s.tint ? { tint: s.tint } : {}), ...(s.category !== undefined ? { category: s.category } : {}) };
  });
  const categories = ws.categories.map((c) => {
    const old = s.categories[c.id];
    if (!old) return c;
    const { tint: _t, icon: _i, ...rest } = c;
    return { ...rest, ...old };
  });
  const { siteCategory: _s, ...base } = ws;
  return { ...base, panels, categories, ...(s.siteCategory ? { siteCategory: s.siteCategory } : {}) };
}
