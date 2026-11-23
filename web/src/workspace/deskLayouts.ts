/**
 * F-51: Benannte Layouts je Desk. Ein Layout ist die ganze Belegung eines Desks: Portale mit Tabs,
 * Namen und Farben, die Anordnung je Bildschirm-Einstellung (wie `layouts`), die Wunsch-Anordnung
 * und die Slot-Namen.
 *
 * Aufbau: Das aktive Layout steht wie bisher direkt in der Arbeitsfläche (panels, layouts,
 * preferred, areaNames) – aller übrige Code bleibt unberührt. Nur die gerade nicht aktiven Layouts
 * liegen als Vorrat in `Workspace.deskLayouts[win].list[i].saved`. Beim Wechsel wandert die
 * aktuelle Belegung in den Vorrat und die gewählte heraus; so geht nie etwas verloren (F-50).
 */
import { DESK_LAYOUT_TEXT } from './terms';
import type { ScreenSetup } from './screen';
import { screenClass } from './screen';
import type { Arrangement, PanelMeta, SlotName, Workspace } from './types';
import { areaLabel, closeSlot, dropSlot, newId, newPanel, viewOf } from './workspace';
import * as T from './tree';

/** Gespeicherte Belegung eines nicht aktiven Layouts. Schlüssel der Anordnungen ohne Desk-Vorsilbe. */
export interface LayoutContent {
  panels: PanelMeta[];
  layouts: Record<string, Arrangement>;
  preferred: Record<string, Arrangement>;
  areaNames: SlotName[];
}

export interface DeskLayout {
  id: string;
  name: string;
  /** Nur bei nicht aktiven Layouts. */
  saved?: LayoutContent;
}

export interface DeskLayouts {
  active: string;
  list: DeskLayout[];
}

/** Höchstzahl der Layouts je Desk – hält die Liste überschaubar. */
export const LAYOUT_MAX = 12;

/** Id des stillschweigend vorhandenen ersten Layouts eines Desks. */
const FIRST = 'first';

/** Layouts eines Desks; ohne Eintrag gibt es genau eins („Layout 1“) – die aktuelle Belegung. */
export function layoutsOf(ws: Workspace, win = ''): DeskLayouts {
  return ws.deskLayouts?.[win] ?? { active: FIRST, list: [{ id: FIRST, name: `${DESK_LAYOUT_TEXT.defaultName} 1` }] };
}

export function activeLayout(ws: Workspace, win = ''): DeskLayout {
  const d = layoutsOf(ws, win);
  return d.list.find((l) => l.id === d.active) ?? d.list[0];
}

function withDesk(ws: Workspace, win: string, d: DeskLayouts): Workspace {
  return { ...ws, deskLayouts: { ...ws.deskLayouts, [win]: d } };
}

// ---------------------------------------------------------------- Belegung heraus- und hineinnehmen

const prefix = (win: string) => (win ? `${win}/` : '');
const ownKey = (win: string, k: string) => (win ? k.startsWith(`${win}/`) : !k.includes('/'));

function pick(rec: Record<string, Arrangement>, win: string): [Record<string, Arrangement>, Record<string, Arrangement>] {
  const mine: Record<string, Arrangement> = {};
  const rest: Record<string, Arrangement> = {};
  for (const [k, v] of Object.entries(rec)) {
    if (ownKey(win, k)) mine[k.slice(prefix(win).length)] = v;
    else rest[k] = v;
  }
  return [mine, rest];
}

const addPrefix = (rec: Record<string, Arrangement>, win: string) =>
  Object.fromEntries(Object.entries(rec).map(([k, v]) => [prefix(win) + k, v]));

/** Nimmt die Belegung eines Desks aus der Arbeitsfläche heraus. */
export function takeOut(ws: Workspace, win = ''): { rest: Workspace; content: LayoutContent } {
  const panels = ws.panels.filter((p) => (p.win ?? '') === win);
  const others = ws.panels.filter((p) => (p.win ?? '') !== win);
  const [layouts, layoutsRest] = pick(ws.layouts, win);
  const [preferred, preferredRest] = pick(ws.preferred, win);
  const mine = new Set(panels.map((p) => p.areaName).filter(Boolean));
  const theirs = new Set(others.map((p) => p.areaName).filter(Boolean));
  const areaNames = ws.areaNames.filter((a) => mine.has(a.id));
  return {
    rest: { ...ws, panels: others, layouts: layoutsRest, preferred: preferredRest, areaNames: ws.areaNames.filter((a) => !mine.has(a.id) || theirs.has(a.id)) },
    content: { panels: panels.map(({ win: _w, ...p }) => p), layouts, preferred, areaNames },
  };
}

/** Setzt eine gespeicherte Belegung in einen Desk ein (der vorher leer sein muss). */
export function putIn(ws: Workspace, win: string, c: LayoutContent): Workspace {
  const known = new Set(ws.areaNames.map((a) => a.id));
  return {
    ...ws,
    panels: [...ws.panels, ...c.panels.map((p) => (win ? { ...p, win } : p))],
    layouts: { ...ws.layouts, ...addPrefix(c.layouts, win) },
    preferred: { ...ws.preferred, ...addPrefix(c.preferred, win) },
    areaNames: [...ws.areaNames, ...c.areaNames.filter((a) => !known.has(a.id))],
  };
}

/** Kopie mit neuen Ids für Portale und Slot-Namen (Anordnungen werden umgeschrieben). */
export function cloneContent(c: LayoutContent): LayoutContent {
  const pid = new Map(c.panels.map((p) => [p.id, newId()]));
  const nid = new Map(c.areaNames.map((a) => [a.id, newId()]));
  const mapArr = (a: Arrangement): Arrangement => ({
    tree: a.tree,
    areas: Object.fromEntries(
      Object.entries(a.areas).map(([k, ar]) => [k, { ...ar, panels: ar.panels.map((m) => pid.get(m) ?? m), front: pid.get(ar.front) ?? ar.front }]),
    ),
  });
  const mapRec = (r: Record<string, Arrangement>) => Object.fromEntries(Object.entries(r).map(([k, a]) => [k, mapArr(a)]));
  return {
    panels: c.panels.map((p) => ({ ...p, id: pid.get(p.id)!, ...(p.areaName ? { areaName: nid.get(p.areaName) ?? p.areaName } : {}) })),
    layouts: mapRec(c.layouts),
    preferred: mapRec(c.preferred),
    areaNames: c.areaNames.map((a) => ({ ...a, id: nid.get(a.id)! })),
  };
}

/** Vorlage „Gleichmäßig“ (F-51): so viele leere Portale, wie die Bildschirmklasse zeigt (F-03), gleich verteilt. */
export function evenContent(ws: Workspace, setup: ScreenSetup): { content: LayoutContent; nextNumber: number } {
  const n = screenClass(setup.cls).capacity;
  const panels = Array.from({ length: n }, (_, i) => newPanel(`Portal ${ws.nextNumber + i}`));
  return { content: { panels, layouts: {}, preferred: {}, areaNames: [] }, nextNumber: ws.nextNumber + n };
}

// ---------------------------------------------------------------- Bedienung

/** Freier Name „Layout n“ bzw. „Name (Kopie)“. */
export function freeName(d: DeskLayouts, base?: string): string {
  const taken = new Set(d.list.map((l) => l.name));
  if (base) {
    let name = `${base} ${DESK_LAYOUT_TEXT.copySuffix}`;
    for (let i = 2; taken.has(name); i++) name = `${base} ${DESK_LAYOUT_TEXT.copySuffix} ${i}`;
    return name;
  }
  let n = d.list.length + 1;
  while (taken.has(`${DESK_LAYOUT_TEXT.defaultName} ${n}`)) n++;
  return `${DESK_LAYOUT_TEXT.defaultName} ${n}`;
}

/** Zum Layout `id` wechseln; die aktuelle Belegung wird vorher im aktiven Layout gespeichert. */
export function switchLayout(ws: Workspace, win: string, id: string): Workspace {
  const d = layoutsOf(ws, win);
  const target = d.list.find((l) => l.id === id);
  if (!target || id === d.active || !target.saved) return ws;
  const { rest, content } = takeOut(ws, win);
  const list = d.list.map((l) => (l.id === d.active ? { id: l.id, name: l.name, saved: content } : l.id === id ? { id: l.id, name: l.name } : l));
  return withDesk(putIn(rest, win, target.saved), win, { active: id, list });
}

/**
 * Neues Layout anlegen und gleich dorthin wechseln: aus der aktuellen Belegung (Kopie) oder aus der
 * Vorlage „Gleichmäßig“. Gibt dieselbe Arbeitsfläche zurück, wenn LAYOUT_MAX erreicht ist.
 */
export function addLayout(ws: Workspace, win: string, setup: ScreenSetup, from: 'current' | 'even', name?: string): Workspace {
  const d = layoutsOf(ws, win);
  if (d.list.length >= LAYOUT_MAX) return ws;
  const id = newId();
  const label = name?.trim() || (from === 'current' ? freeName(d, activeLayout(ws, win).name) : freeName(d));
  let next = ws;
  let content: LayoutContent;
  if (from === 'even') {
    const even = evenContent(ws, setup);
    content = even.content;
    next = { ...ws, nextNumber: even.nextNumber };
  } else content = cloneContent(takeOut(ws, win).content);
  next = withDesk(next, win, { active: d.active, list: [...d.list, { id, name: label, saved: content }] });
  return switchLayout(next, win, id);
}

/** Kopie eines Layouts anlegen (aktiv oder nicht); bleibt beim aktiven Layout. */
export function copyLayout(ws: Workspace, win: string, id: string): Workspace {
  const d = layoutsOf(ws, win);
  const src = d.list.find((l) => l.id === id);
  if (!src || d.list.length >= LAYOUT_MAX) return ws;
  const content = src.saved ?? takeOut(ws, win).content;
  const copy: DeskLayout = { id: newId(), name: freeName(d, src.name), saved: cloneContent(content) };
  const at = d.list.indexOf(src) + 1;
  return withDesk(ws, win, { active: d.active, list: [...d.list.slice(0, at), copy, ...d.list.slice(at)] });
}

/** Umbenennen; leerer Name oder schon vergebener Name = keine Änderung. */
export function renameLayout(ws: Workspace, win: string, id: string, name: string): Workspace {
  const d = layoutsOf(ws, win);
  const trimmed = name.trim();
  if (!trimmed || d.list.some((l) => l.id !== id && l.name === trimmed) || !d.list.some((l) => l.id === id)) return ws;
  return withDesk(ws, win, { ...d, list: d.list.map((l) => (l.id === id ? { ...l, name: trimmed } : l)) });
}

/** Für Rückgängig: gelöschtes Layout mit Belegung und Stelle. */
export interface DeletedLayout {
  win: string;
  index: number;
  layout: DeskLayout & { saved: LayoutContent };
}

/**
 * Layout löschen. Das letzte bleibt immer. Ist es aktiv, wechselt der Desk vorher zum Nachbarn.
 */
export function deleteLayout(ws: Workspace, win: string, id: string): { ws: Workspace; deleted: DeletedLayout | null } {
  let d = layoutsOf(ws, win);
  const index = d.list.findIndex((l) => l.id === id);
  if (index < 0 || d.list.length < 2) return { ws, deleted: null };
  let next = ws;
  if (d.active === id) {
    next = switchLayout(ws, win, d.list[index === 0 ? 1 : index - 1].id);
    d = layoutsOf(next, win);
  }
  const gone = d.list[index] as DeskLayout & { saved: LayoutContent };
  next = withDesk(next, win, { active: d.active, list: d.list.filter((l) => l.id !== id) });
  return { ws: next, deleted: { win, index, layout: gone } };
}

/** Rückgängig für das Löschen: Layout kommt an seine Stelle zurück (nicht aktiv). */
export function restoreLayout(ws: Workspace, del: DeletedLayout): Workspace {
  const d = layoutsOf(ws, del.win);
  if (d.list.some((l) => l.id === del.layout.id)) return ws;
  const list = [...d.list];
  list.splice(Math.min(del.index, list.length), 0, del.layout);
  return withDesk(ws, del.win, { active: d.active, list });
}

/** Panel-Ids aus allen gespeicherten Layouts (z. B. damit Sammlungen der Library beim Laden bleiben). */
export function storedPanelIds(ws: Pick<Workspace, 'deskLayouts'>): string[] {
  return Object.values(ws.deskLayouts ?? {}).flatMap((d) => d.list.flatMap((l) => l.saved?.panels.map((p) => p.id) ?? []));
}

/**
 * Ein Zusatz-Desk ohne Portale fiele weg – samt seiner gespeicherten Layouts. Stattdessen entfällt
 * nur das leere aktive Layout, und der Desk wechselt zum ersten gespeicherten (nichts geht verloren).
 */
export function rescueEmptyDesks(ws: Workspace): Workspace {
  let next = ws;
  for (const [win, d] of Object.entries(ws.deskLayouts ?? {})) {
    if (!win || next.panels.some((p) => p.win === win)) continue;
    const target = d.list.find((l) => l.id !== d.active && l.saved);
    if (!target?.saved) continue;
    const list = d.list.filter((l) => l.id !== d.active).map((l) => (l.id === target.id ? { id: l.id, name: l.name } : l));
    const [, layouts] = pick(next.layouts, win);
    const [, preferred] = pick(next.preferred, win);
    next = putIn({ ...next, layouts, preferred }, win, target.saved);
    next = list.length > 1 ? withDesk(next, win, { active: target.id, list }) : withoutDesk(next, win, list[0].name);
  }
  return next;
}

/** Bleibt nur ein Layout, braucht der Desk keinen Eintrag mehr – außer für einen eigenen Namen. */
function withoutDesk(ws: Workspace, win: string, name: string): Workspace {
  return withDesk(ws, win, { active: FIRST, list: [{ id: FIRST, name }] });
}

// ---------------------------------------------------------------- F-52 Standard-Layout je Gerät

/** Das Layout, auf das ein Verweis zeigt (Desk und Id) – oder null, wenn es das nicht mehr gibt. */
export function findLayout(ws: Workspace, win: string, id: string): DeskLayout | null {
  if (win && !ws.windows.some((w) => w.id === win)) return null;
  return layoutsOf(ws, win).list.find((l) => l.id === id) ?? null;
}

/**
 * Belegung des Standard-Layouts als frische Kopie (neue Ids); ohne gültigen Verweis die Vorlage
 * „Gleichmäßig“ für diese Bildschirm-Einstellung.
 */
export function standardContent(ws: Workspace, ref: { win: string; id: string } | null, setup: ScreenSetup): { content: LayoutContent; nextNumber: number; name: string } {
  const l = ref && findLayout(ws, ref.win, ref.id);
  if (l && ref) return { content: cloneContent(l.saved ?? takeOut(ws, ref.win).content), nextNumber: ws.nextNumber, name: l.name };
  return { ...evenContent(ws, setup), name: DESK_LAYOUT_TEXT.even };
}

/** Neuer Desk mit der Belegung des Standard-Layouts; sein einziges Layout trägt dessen Namen. */
export function addDeskWith(ws: Workspace, win: string, std: { content: LayoutContent; nextNumber: number; name: string }): Workspace {
  if (!win || ws.windows.some((w) => w.id === win) || std.content.panels.length === 0) return ws;
  const next = putIn({ ...ws, nextNumber: std.nextNumber }, win, std.content);
  return withDesk(next, win, { active: FIRST, list: [{ id: FIRST, name: std.name }] });
}

/**
 * „Auf Standard zurücksetzen“: Das aktive Layout dieses Desks bekommt die Belegung des
 * Standard-Layouts. Die alte Belegung kommt als `undo` zurück (Rückgängig).
 */
export function resetToStandard(ws: Workspace, win: string, std: { content: LayoutContent; nextNumber: number }): { ws: Workspace; undo: LayoutContent } {
  const { rest, content } = takeOut(ws, win);
  return { ws: putIn({ ...rest, nextNumber: std.nextNumber }, win, std.content), undo: content };
}

/** Rückgängig für „Auf Standard zurücksetzen“. */
export function undoReset(ws: Workspace, win: string, old: LayoutContent): Workspace {
  return putIn(takeOut(ws, win).rest, win, old);
}

// ---------------------------------------------------------------- F-187 Layouts im Cockpit

/** Belegung eines Layouts (aktiv: aus der Arbeitsfläche; sonst der Vorrat). */
export function contentOf(ws: Workspace, win: string, id: string): LayoutContent | null {
  const d = layoutsOf(ws, win);
  const l = d.list.find((x) => x.id === id);
  if (!l) return null;
  return id === d.active ? takeOut(ws, win).content : (l.saved ?? null);
}

/**
 * Wendet eine Änderung auf ein beliebiges Layout eines Desks an. Ein nicht aktives Layout wird dazu
 * kurz eingesetzt, geändert und wieder in den Vorrat gelegt – so gilt aller übrige Code auch dafür.
 */
export function inLayout(ws: Workspace, win: string, id: string, fn: (w: Workspace) => Workspace): Workspace {
  const d = layoutsOf(ws, win);
  const l = d.list.find((x) => x.id === id);
  if (!l) return ws;
  if (id === d.active) return fn(ws);
  if (!l.saved) return ws;
  const own = takeOut(ws, win);
  const tried = fn(putIn(own.rest, win, l.saved));
  const back = takeOut(tried, win);
  const list = d.list.map((x) => (x.id === id ? { ...x, saved: back.content } : x));
  return withDesk(putIn(back.rest, win, own.content), win, { ...d, list });
}

/** Rückgängig für Slot-Änderungen: setzt die Belegung eines Layouts wieder ein. */
export function setContent(ws: Workspace, win: string, id: string, c: LayoutContent): Workspace {
  const d = layoutsOf(ws, win);
  if (!d.list.some((x) => x.id === id)) return ws;
  if (id === d.active) return putIn(takeOut(ws, win).rest, win, c);
  return withDesk(ws, win, { ...d, list: d.list.map((x) => (x.id === id ? { ...x, saved: c } : x)) });
}

/** Einstellung für einen bestimmten Desk. */
const at = (setup: ScreenSetup, win: string): ScreenSetup => {
  const { win: _w, ...rest } = setup;
  return win ? { ...rest, win } : rest;
};

/** Ein Slot eines Layouts für die Vorschau: Lage, Name, Portalzahl, über der Empfehlung? */
export interface LayoutSlot {
  id: string;
  rect: T.FRect;
  title: string;
  count: number;
  over: boolean;
}

/** F-187: Anordnung eines Layouts auf dieser Bildschirm-Einstellung (auch nicht aktive). */
export function layoutView(ws: Workspace, win: string, id: string, setup: ScreenSetup): { slots: LayoutSlot[]; portals: number; recommended: number } {
  const recommended = screenClass(setup.cls).capacity;
  let shown: Workspace | null = null;
  inLayout(ws, win, id, (w) => ((shown = w), w));
  if (!shown) return { slots: [], portals: 0, recommended };
  const w: Workspace = shown;
  const v = viewOf(w, at(setup, win));
  const order = T.readingOrder(v.tree);
  // Über der Empfehlung: die zuletzt dazugekommenen Slots (Reihenfolge im Teilungsbaum).
  const made = T.leaves(v.tree).filter((id) => v.slots.some((s) => s.id === id));
  const slots = v.slots
    .map((s) => ({ id: s.id, rect: s.rect, title: areaLabel(w, s) || s.front.name, count: s.panels.length, over: made.indexOf(s.id) >= recommended }))
    .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  return { slots, portals: w.panels.filter((p) => (p.win ?? '') === win).length, recommended };
}

/** F-187: zwei Slots eines Layouts tauschen ihren Platz. */
export function swapSlots(ws: Workspace, win: string, id: string, setup: ScreenSetup, a: string, b: string): Workspace {
  return inLayout(ws, win, id, (w) => dropSlot(w, at(setup, win), a, b, 'center'));
}

/** F-187: Slot eines Layouts schließen (Portale in einen Nachbar-Slot); null = passt nirgends. */
export function closeLayoutSlot(ws: Workspace, win: string, id: string, setup: ScreenSetup, area: string): Workspace | null {
  let ok = false;
  const next = inLayout(ws, win, id, (w) => {
    const r = closeSlot(w, at(setup, win), area);
    ok = !!r;
    return r ? r.ws : w;
  });
  return ok ? next : null;
}
