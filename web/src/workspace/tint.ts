/**
 * F-162: Rahmen- und Akzentfarbe je Slot und Portal. Jede Farbe erbt für sich: Portal → Slot → Kategorie (F-163) → Desk.
 * Rahmen ohne Wahl = gewohnter Rand des Designs; Akzent ohne Wahl = Akzentfarbe des Desks (F-161).
 * Die Slot-Farbe hängt am Namen des Slots (Workspace.areaNames, F-128), damit sie in jeder
 * Bildschirm-Einstellung gilt – wie der Name.
 */
import { isHex } from './look';
import type { ScreenSetup } from './screen';
import type { PanelMeta, Slot, Tint, Workspace } from './types';
import { claimSlot, slotNameId, viewOf } from './workspace';

export type TintKind = keyof Tint;
export const TINT_KINDS: TintKind[] = ['frame', 'accent'];

/** Gespeicherte Farben prüfen; leer → undefined. */
export function parseTint(v: unknown): Tint | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const o = v as Record<string, unknown>;
  const t: Tint = {};
  for (const k of TINT_KINDS) if (isHex(o[k])) t[k] = (o[k] as string).toLowerCase();
  return t.frame || t.accent ? t : undefined;
}

/** Änderung anwenden: Farbe setzen oder mit null löschen (dann erbt sie wieder). */
export function mergeTint(old: Tint | undefined, change: Partial<Record<TintKind, string | null>>): Tint | undefined {
  const t: Tint = { ...old };
  for (const k of TINT_KINDS) {
    const c = change[k];
    if (c === null) delete t[k];
    else if (c !== undefined && isHex(c)) t[k] = c.toLowerCase();
  }
  return t.frame || t.accent ? t : undefined;
}

export const sameTint = (a: Tint | undefined, b: Tint | undefined) => a?.frame === b?.frame && a?.accent === b?.accent;

/** Farben eines Portals ändern. */
export function setPanelTint(ws: Workspace, id: string, change: Partial<Record<TintKind, string | null>>): Workspace {
  const p = ws.panels.find((x) => x.id === id);
  if (!p) return ws;
  const tint = mergeTint(p.tint, change);
  if (sameTint(tint, p.tint)) return ws;
  const panels = ws.panels.map((x): PanelMeta => {
    if (x.id !== id) return x;
    const { tint: _old, ...rest } = x;
    return tint ? { ...rest, tint } : rest;
  });
  return { ...ws, panels };
}

/** Farben eines Slots ändern; ein Slot ohne Namen bekommt dafür einen (wie beim Umbenennen). */
export function setSlotTint(ws: Workspace, setup: ScreenSetup, areaId: string, change: Partial<Record<TintKind, string | null>>): Workspace {
  const area = viewOf(ws, setup).arrangement?.areas[areaId];
  if (!area) return ws;
  const named = claimSlot(ws, area.panels, area.front);
  const id = slotNameId(named, area.panels, area.front);
  const entry = named.areaNames.find((a) => a.id === id);
  if (!entry) return ws;
  const tint = mergeTint(entry.tint, change);
  if (sameTint(tint, entry.tint)) return named === ws ? ws : named;
  const areaNames = named.areaNames.map((a) => {
    if (a.id !== id) return a;
    const { tint: _old, ...rest } = a;
    return tint ? { ...rest, tint } : rest;
  });
  return { ...named, areaNames };
}

/** Eigene Farben des Slots, auf dem ein Portal liegt (ohne Vererbung). */
export function slotTint(ws: Workspace, slot: Slot): Tint | undefined {
  const id = slotNameId(
    ws,
    slot.panels.map((p) => p.id),
    slot.front.id,
  );
  return ws.areaNames.find((a) => a.id === id)?.tint;
}

/** Woher eine Farbe kommt – für Anzeige und Ansage. */
export type TintFrom = 'portal' | 'slot' | 'category' | 'desk';

export interface ShownTint {
  /** Rahmenfarbe; fehlt = Rand des Designs. */
  frame?: string;
  frameFrom: TintFrom;
  /** Akzentfarbe; fehlt = die des Desks. */
  accent?: string;
  accentFrom: TintFrom;
}

/** Tatsächliche Farben eines Portals: Portal → Slot → Kategorie (F-163) → Desk. */
export function shownTint(panel: PanelMeta, slot: Tint | undefined, category?: Tint): ShownTint {
  const pick = (k: TintKind): [string | undefined, TintFrom] =>
    panel.tint?.[k] ? [panel.tint[k], 'portal'] : slot?.[k] ? [slot[k], 'slot'] : category?.[k] ? [category[k], 'category'] : [undefined, 'desk'];
  const [frame, frameFrom] = pick('frame');
  const [accent, accentFrom] = pick('accent');
  return { frame, frameFrom, accent, accentFrom };
}

/** F-162: gemerkte Farben vor dem Zurücksetzen – für „Rückgängig“. */
export interface TintSnapshot {
  panels: Record<string, Tint>;
  slots: Record<string, Tint>;
}

/** Wie viele Portale und Slots eines Desks eigene Farben haben. */
export function deskTintCount(ws: Workspace, win: string): number {
  const mine = ws.panels.filter((p) => (p.win ?? '') === win);
  const names = new Set(mine.map((p) => p.areaName).filter(Boolean));
  return mine.filter((p) => p.tint).length + ws.areaNames.filter((a) => a.tint && names.has(a.id)).length;
}

/** Alle Slot- und Portalfarben eines Desks entfernen (sie folgen wieder dem Desk); gibt den alten Stand mit. */
export function clearDeskTints(ws: Workspace, win: string): { ws: Workspace; before: TintSnapshot } {
  const before: TintSnapshot = { panels: {}, slots: {} };
  const mine = new Set(ws.panels.filter((p) => (p.win ?? '') === win).map((p) => p.id));
  const names = new Set(ws.panels.filter((p) => mine.has(p.id)).map((p) => p.areaName).filter(Boolean));
  const panels = ws.panels.map((p): PanelMeta => {
    if (!mine.has(p.id) || !p.tint) return p;
    before.panels[p.id] = p.tint;
    const { tint: _t, ...rest } = p;
    return rest;
  });
  const areaNames = ws.areaNames.map((a) => {
    if (!a.tint || !names.has(a.id)) return a;
    before.slots[a.id] = a.tint;
    const { tint: _t, ...rest } = a;
    return rest;
  });
  const none = !Object.keys(before.panels).length && !Object.keys(before.slots).length;
  return { ws: none ? ws : { ...ws, panels, areaNames }, before };
}

/** „Rückgängig“: gemerkte Farben wieder setzen (nur was es noch gibt). */
export function restoreTints(ws: Workspace, snap: TintSnapshot): Workspace {
  return {
    ...ws,
    panels: ws.panels.map((p) => (snap.panels[p.id] ? { ...p, tint: snap.panels[p.id] } : p)),
    areaNames: ws.areaNames.map((a) => (snap.slots[a.id] ? { ...a, tint: snap.slots[a.id] } : a)),
  };
}
