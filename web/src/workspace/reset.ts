/**
 * F-191: „Zurücksetzen“ in Dialogen mit sofortiger Vorschau – Stand beim Öffnen merken und wieder
 * herstellen. Nur die Felder, die der jeweilige Dialog ändert (nicht den ganzen Workspace, damit
 * z. B. Seitenwechsel in Portalen erhalten bleiben).
 */
import type { Look } from './look';
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

/**
 * Dialog „Design anpassen“: Darstellung und Akzentfarbe des Desks (Main Desk = ws.look, Zusatz-Desk =
 * eigene Farben oder folgt dem Main Desk) und die Farben seiner Slots und Portale (F-162).
 */
export interface DesignSnap {
  win: string;
  look: Look;
  own?: Look;
  panels: Record<string, Tint>;
  slots: Record<string, Tint>;
}

export function snapDesign(ws: Workspace, win: string): DesignSnap {
  const mine = ws.panels.filter((p) => (p.win ?? '') === win);
  const names = new Set(mine.map((p) => p.areaName).filter(Boolean));
  const panels: DesignSnap['panels'] = {};
  for (const p of mine) if (p.tint) panels[p.id] = p.tint;
  const slots: DesignSnap['slots'] = {};
  for (const a of ws.areaNames) if (a.tint && names.has(a.id)) slots[a.id] = a.tint;
  const own = win ? ws.deskLooks?.[win] : undefined;
  return { win, look: ws.look, ...(own ? { own } : {}), panels, slots };
}

export const designChanged = (start: DesignSnap, now: DesignSnap) => !sameSnap(start, now);

/** Desk-Farben und Slot-/Portalfarben dieses Desks auf den gemerkten Stand; anderes bleibt. */
export function restoreDesign(ws: Workspace, s: DesignSnap): Workspace {
  const mine = new Set(ws.panels.filter((p) => (p.win ?? '') === s.win).map((p) => p.id));
  const names = new Set(ws.panels.filter((p) => mine.has(p.id)).map((p) => p.areaName).filter(Boolean));
  const panels = ws.panels.map((p) => {
    if (!mine.has(p.id)) return p;
    const { tint: _t, ...rest } = p;
    return s.panels[p.id] ? { ...rest, tint: s.panels[p.id] } : rest;
  });
  const areaNames = ws.areaNames.map((a) => {
    if (!names.has(a.id) && !s.slots[a.id]) return a;
    const { tint: _t, ...rest } = a;
    return s.slots[a.id] ? { ...rest, tint: s.slots[a.id] } : rest;
  });
  let deskLooks = ws.deskLooks;
  if (s.win) {
    const { [s.win]: _gone, ...rest } = ws.deskLooks ?? {};
    deskLooks = s.own ? { ...rest, [s.win]: s.own } : Object.keys(rest).length ? rest : undefined;
  }
  const { deskLooks: _d, ...base } = ws;
  return { ...base, look: s.win ? ws.look : s.look, panels, areaNames, ...(deskLooks ? { deskLooks } : {}) };
}
