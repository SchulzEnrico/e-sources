/**
 * F-206 Schritt 3 (V66): Pads – Logik ohne Oberfläche. Ein Pad liegt auf einem Desk und zeigt bis
 * PAD_SHEETS_MAX Sheets; jedes Sheet liegt höchstens in einem Pad (Antwort 20). Plätze gelten je
 * Gerät und Desk (Workspace.padDesks, DEVICE_FIELDS). Entscheidungen: Claude Doc „Pads mit
 * Notizblock und Lageplan“ (P1–P9). Reine Funktionen.
 */
import type { FRect } from './tree';
import type { NoteView, Pad, PadDesk, PadPlace, Workspace } from './types';
import { createView, deleteView, idsIn, noteById, placeNote, viewById, viewsOf } from './notes';
import { PAD_SHEETS_MAX } from './noteObjects';
import { newId } from './workspace';

/** Mindestgröße eines Pads in Pixeln (Doc: 260 × 200). */
export const PAD_MIN = { w: 260, h: 200 } as const;
/** V74 (Enrico: „schlechte Standardgröße“): Startgröße eines neuen Pads – mindestens so groß, höchstens die Desk-Fläche. */
export const PAD_START = { w: 520, h: 720 } as const;
/** Lageplan: Zonen je Slot (P1, Weg C). */
export type PadZone = 'top' | 'bottom' | 'left' | 'right' | 'full';
export const PAD_ZONES: readonly PadZone[] = ['top', 'bottom', 'left', 'right', 'full'];

export const padsOf = (ws: Workspace): Pad[] => ws.pads ?? [];
export const padById = (ws: Workspace, id: string): Pad | undefined => padsOf(ws).find((p) => p.id === id);
/** Pads eines Desks ('' = Main Desk), in Reihenfolge (zuletzt benutztes zuletzt = oben). */
export const padsOn = (ws: Workspace, desk: string): Pad[] => padsOf(ws).filter((p) => p.desk === desk);
/** Pad, in dem das Sheet liegt. */
export const padWith = (ws: Workspace, sheetId: string): Pad | undefined => padsOf(ws).find((p) => p.sheets.includes(sheetId));

function withPads(ws: Workspace, pads: Pad[]): Workspace {
  const out: Workspace = { ...ws, pads };
  if (!pads.length) delete out.pads;
  return out;
}

function patchPad(ws: Workspace, id: string, fn: (p: Pad) => Pad): Workspace {
  return withPads(ws, padsOf(ws).map((p) => (p.id === id ? fn(p) : p)));
}

/** Platz des Pads in einer Zone eines Slots (Anteile der Desk-Fläche). */
export function zonePlace(slot: FRect, zone: PadZone): PadPlace {
  const { x, y, w, h } = slot;
  switch (zone) {
    case 'left':
      return { x, y, w: w / 2, h };
    case 'right':
      return { x: x + w / 2, y, w: w / 2, h };
    case 'top':
      return { x, y, w, h: h / 2 };
    case 'bottom':
      return { x, y: y + h / 2, w, h: h / 2 };
    default:
      return { x, y, w, h };
  }
}

/** Platz auf diesem Gerät, falls schon gesetzt. */
export const placeOf = (ws: Workspace, desk: string, padId: string): PadPlace | undefined => ws.padDesks?.[desk]?.places[padId];

/** Platz setzen (Anteile werden in den Desk gerückt). */
export function setPlace(ws: Workspace, desk: string, padId: string, place: PadPlace): Workspace {
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const w = Math.min(1, Math.max(0.01, place.w));
  const h = Math.min(1, Math.max(0.01, place.h));
  const p: PadPlace = { x: clamp(Math.min(place.x, 1 - w)), y: clamp(Math.min(place.y, 1 - h)), w, h };
  const d = ws.padDesks?.[desk] ?? { places: {} };
  return { ...ws, padDesks: { ...ws.padDesks, [desk]: { ...d, places: { ...d.places, [padId]: p } } } };
}

function dropPlace(ws: Workspace, padId: string): Workspace {
  if (!ws.padDesks) return ws;
  const out: Record<string, NonNullable<Workspace['padDesks']>[string]> = {};
  for (const [desk, d] of Object.entries(ws.padDesks)) {
    const { [padId]: _gone, ...places } = d.places;
    if (Object.keys(places).length || d.dock || d.dockOff) out[desk] = { ...d, places };
  }
  const next: Workspace = { ...ws, padDesks: out };
  if (!Object.keys(out).length) delete next.padDesks;
  return next;
}

/** Neues Pad auf einem Desk mit diesen Sheets (Sheets aus anderen Pads werden dort herausgenommen). */
export function createPad(ws: Workspace, desk: string, sheets: string[], opts: { id?: string; from?: string; place?: PadPlace } = {}): { ws: Workspace; id: string } {
  const id = opts.id ?? newId();
  const list = [...new Set(sheets.filter((s) => viewById(ws, s)))].slice(0, PAD_SHEETS_MAX);
  let next = ws;
  for (const s of list) {
    const other = padWith(next, s);
    if (other) next = takeOut(next, other.id, s);
  }
  const pad: Pad = { id, desk, sheets: list, active: list[0] ?? '', ...(opts.from ? { from: opts.from } : {}) };
  next = withPads(next, [...padsOf(next), pad]);
  if (opts.place) next = setPlace(next, desk, id, opts.place);
  return { ws: next, id };
}

/** Sheet aus einem Pad nehmen, ohne es zu löschen; ein leeres Pad verschwindet. */
function takeOut(ws: Workspace, padId: string, sheetId: string): Workspace {
  const p = padById(ws, padId);
  if (!p?.sheets.includes(sheetId)) return ws;
  const sheets = p.sheets.filter((s) => s !== sheetId);
  if (!sheets.length) return dropPlace(withPads(ws, padsOf(ws).filter((x) => x.id !== padId)), padId);
  const i = p.sheets.indexOf(sheetId);
  const active = p.active === sheetId ? sheets[Math.min(i, sheets.length - 1)] : p.active;
  return patchPad(ws, padId, (x) => ({ ...x, sheets, active }));
}

/** Sheet ist leer (keine Notes) – wird beim Schließen still verworfen. */
const isEmptySheet = (v: NoteView | undefined) => !!v && idsIn(v).length === 0;

export type AddSheetResult = { ok: true; ws: Workspace } | { ok: false; reason: 'missing' | 'full' };

/** Sheet als Reiter in ein Pad legen (aus einem anderen Pad wird es geholt – „Hierher holen“) und zeigen. */
export function addSheet(ws: Workspace, padId: string, sheetId: string, index?: number): AddSheetResult {
  const p = padById(ws, padId);
  if (!p || !viewById(ws, sheetId)) return { ok: false, reason: 'missing' };
  if (p.sheets.includes(sheetId)) return { ok: true, ws: patchPad(ws, padId, (x) => ({ ...x, active: sheetId })) };
  if (p.sheets.length >= PAD_SHEETS_MAX) return { ok: false, reason: 'full' };
  const other = padWith(ws, sheetId);
  let next = other ? takeOut(ws, other.id, sheetId) : ws;
  next = patchPad(next, padId, (x) => {
    const sheets = [...x.sheets];
    sheets.splice(index === undefined ? sheets.length : Math.max(0, Math.min(index, sheets.length)), 0, sheetId);
    return { ...x, sheets, active: sheetId };
  });
  return { ok: true, ws: next };
}

/** Reiter wählen. */
export function showSheet(ws: Workspace, padId: string, sheetId: string): Workspace {
  const p = padById(ws, padId);
  return p?.sheets.includes(sheetId) && p.active !== sheetId ? patchPad(ws, padId, (x) => ({ ...x, active: sheetId })) : ws;
}

/** Reiter verschieben. */
export function moveSheet(ws: Workspace, padId: string, sheetId: string, index: number): Workspace {
  const p = padById(ws, padId);
  if (!p?.sheets.includes(sheetId)) return ws;
  const sheets = p.sheets.filter((s) => s !== sheetId);
  sheets.splice(Math.max(0, Math.min(index, sheets.length)), 0, sheetId);
  return patchPad(ws, padId, (x) => ({ ...x, sheets }));
}

/** Sheet schließen: aus dem Pad nehmen; ein leeres Sheet wird still verworfen, ein leeres Pad verschwindet. */
export function closeSheet(ws: Workspace, padId: string, sheetId: string): Workspace {
  const next = takeOut(ws, padId, sheetId);
  return isEmptySheet(viewById(next, sheetId)) ? (deleteView(next, sheetId)?.ws ?? next) : next;
}

/** Pad schließen: nichts wird gelöscht außer leeren Sheets. */
export function closePad(ws: Workspace, padId: string): Workspace {
  const p = padById(ws, padId);
  if (!p) return ws;
  let next = dropPlace(withPads(ws, padsOf(ws).filter((x) => x.id !== padId)), padId);
  for (const s of p.sheets) if (isEmptySheet(viewById(next, s))) next = deleteView(next, s)?.ws ?? next;
  return next;
}

/** Pad nach oben holen (zuletzt in der Liste = oben, aktiv). */
export function raisePad(ws: Workspace, padId: string): Workspace {
  const pads = padsOf(ws);
  const p = pads.find((x) => x.id === padId);
  if (!p || pads[pads.length - 1] === p) return ws;
  return withPads(ws, [...pads.filter((x) => x !== p), p]);
}

/** Oberstes (aktives) Pad eines Desks. */
export const topPad = (ws: Workspace, desk: string): Pad | undefined => padsOn(ws, desk).at(-1);

/** Pad und Sheet, in denen eine Note bzw. ein Sheet gerade offen ist (Suche: „schon offen“). */
export function padShowing(ws: Workspace, ref: { note?: string; view?: string }): { pad: Pad; sheet: string } | null {
  for (const p of [...padsOf(ws)].reverse()) {
    const s = ref.view ? p.sheets.find((id) => id === ref.view) : p.sheets.find((id) => idsIn(viewById(ws, id)!).includes(ref.note ?? ''));
    if (s) return { pad: p, sheet: s };
  }
  return null;
}

export type OpenInPadResult =
  | { result: 'shown' | 'opened'; ws: Workspace; pad: string; sheet: string }
  | { result: 'missing'; ws: Workspace };

/** Name für einen neuen Notizblock (eindeutig unter den Sheets). */
function blockName(ws: Workspace, base = 'Notizblock'): string {
  const names = new Set(viewsOf(ws).map((v) => v.name));
  if (!names.has(base)) return base;
  let i = 2;
  while (names.has(`${base} ${i}`)) i++;
  return `${base} ${i}`;
}

/**
 * P3: Note öffnen. Liegt sie in einem Sheet eines Pads: dorthin („shown“). Sonst kommt sie in den
 * Notizblock des obersten Pads auf dem Desk (aktives Sheet, wenn es ein Notizblock ist, sonst der
 * erste Notizblock, sonst ein neuer Reiter); ohne Pad oder bei vollem Pad: neues Pad mit Notizblock.
 */
export function openNoteInPad(ws: Workspace, desk: string, noteId: string, opts: { makeId?: () => string } = {}): OpenInPadResult {
  if (!noteById(ws, noteId)) return { result: 'missing', ws };
  for (const p of [...padsOn(ws, desk).reverse(), ...padsOf(ws).filter((x) => x.desk !== desk)]) {
    const s = p.sheets.find((id) => idsIn(viewById(ws, id)!).includes(noteId));
    if (s) return { result: 'shown', ws: raisePad(showSheet(ws, p.id, s), p.id), pad: p.id, sheet: s };
  }
  const make = opts.makeId ?? newId;
  const top = topPad(ws, desk);
  // V67: ohne Pad auf dem Desk lieber den eigenen (geschlossenen) Notizblock der Note wieder öffnen als einen neuen anlegen
  if (!top) {
    const own = viewsOf(ws).find((v) => v.kind === 'block' && !padWith(ws, v.id) && idsIn(v).includes(noteId));
    if (own) return openSheetInPad(ws, desk, own.id, { makeId: make });
  }
  let next = ws;
  let pad = top?.id;
  let sheet: string | undefined;
  if (top) {
    const blocks = top.sheets.filter((s) => viewById(ws, s)?.kind === 'block');
    sheet = blocks.includes(top.active) ? top.active : blocks[0];
    if (!sheet && top.sheets.length < PAD_SHEETS_MAX) {
      const v = createView(next, 'block', blockName(next), { makeId: make });
      next = (addSheet(v.ws, top.id, v.id) as { ws: Workspace }).ws;
      sheet = v.id;
    }
  }
  if (!sheet || !pad) {
    const v = createView(next, 'block', blockName(next), { makeId: make });
    const c = createPad(v.ws, desk, [v.id], { id: make() });
    next = c.ws;
    pad = c.id;
    sheet = v.id;
  }
  const placed = placeNote(next, noteId, { view: sheet });
  if (!placed.ok) return { result: 'missing', ws };
  next = raisePad(showSheet(placed.ws, pad, sheet), pad);
  return { result: 'opened', ws: next, pad, sheet };
}

/** P3: Sheet öffnen – offen: dorthin; sonst Reiter im obersten Pad (bei 9 Sheets oder ohne Pad: neues Pad). */
export function openSheetInPad(ws: Workspace, desk: string, sheetId: string, opts: { makeId?: () => string } = {}): OpenInPadResult {
  if (!viewById(ws, sheetId)) return { result: 'missing', ws };
  const there = padWith(ws, sheetId);
  if (there) return { result: 'shown', ws: raisePad(showSheet(ws, there.id, sheetId), there.id), pad: there.id, sheet: sheetId };
  const top = topPad(ws, desk);
  if (top) {
    const r = addSheet(ws, top.id, sheetId);
    if (r.ok) return { result: 'opened', ws: raisePad(r.ws, top.id), pad: top.id, sheet: sheetId };
  }
  const c = createPad(ws, desk, [sheetId], { id: (opts.makeId ?? newId)() });
  return { result: 'opened', ws: c.ws, pad: c.id, sheet: sheetId };
}

/**
 * P5: Umstieg der Notiz-Tabs (einmalig). Je Portal mit Notiz- oder Sheet-Tabs entsteht ein Pad auf
 * seinem Desk; Sheet-Tabs werden Reiter, einzelne Notes kommen in „Notizblock (Portalname)“. Die
 * Tabs verschwinden; war es der letzte, bleibt ein leerer Tab. `from` am Pad merkt das Portal für
 * den ersten Platz (rechte Hälfte seines Slots).
 */
export function migrateNoteTabs(ws: Workspace, opts: { makeId?: () => string } = {}): { ws: Workspace; pads: number } {
  const make = opts.makeId ?? newId;
  let next = ws;
  let count = 0;
  for (const panel of ws.panels) {
    const noteTabs = panel.tabs.filter((t) => !t.url && (t.note || t.view));
    if (!noteTabs.length) continue;
    const sheets: string[] = [];
    const notes = noteTabs.map((t) => t.note).filter((n): n is string => !!n && !!noteById(next, n));
    if (notes.length) {
      const v = createView(next, 'block', `Notizblock (${panel.name})`, { makeId: make });
      next = v.ws;
      for (const n of notes) {
        const r = placeNote(next, n, { view: v.id });
        if (r.ok) next = r.ws;
      }
      sheets.push(v.id);
    }
    for (const t of noteTabs) if (t.view && viewById(next, t.view) && !sheets.includes(t.view) && !padWith(next, t.view)) sheets.push(t.view);
    // überzählige Sheets (mehr als 9) bekommen ein weiteres Pad
    for (let i = 0; i < sheets.length; i += PAD_SHEETS_MAX) {
      next = createPad(next, panel.win ?? '', sheets.slice(i, i + PAD_SHEETS_MAX), { id: make(), from: panel.id }).ws;
      count++;
    }
    const keep = panel.tabs.filter((t) => !noteTabs.includes(t));
    const tabs = keep.length ? keep : [{ id: noteTabs[0].id }];
    const activeTab = tabs.some((t) => t.id === panel.activeTab) ? panel.activeTab : tabs[0].id;
    next = { ...next, panels: next.panels.map((p) => (p.id === panel.id ? { ...p, tabs, activeTab } : p)) };
  }
  return { ws: next, pads: count };
}

// ---------------------------------------------------------------- F-215 (V70): Zuletzt genutzt je Pad
export const RECENT_MAX = 5;
export type RecentRef = { kind: 'note'; id: string; sheet: string } | { kind: 'sheet'; id: string };

/** Note bzw. Sheet als zuletzt genutzt vermerken (neueste zuerst, ohne Doppel, höchstens 5). */
export function touchRecent(ws: Workspace, padId: string, ref: { note?: string; sheet?: string }): Workspace {
  const key = ref.note ? `n:${ref.note}` : ref.sheet ? `s:${ref.sheet}` : '';
  const p = padById(ws, padId);
  if (!key || !p || p.recent?.[0] === key) return ws;
  const recent = [key, ...(p.recent ?? []).filter((k) => k !== key)].slice(0, RECENT_MAX);
  return patchPad(ws, padId, (x) => ({ ...x, recent }));
}

/** Zuletzt genutzt, soweit noch in diesem Pad vorhanden; ohne das gerade Sichtbare. */
export function recentIn(ws: Workspace, padId: string, now: { note?: string; sheet?: string } = {}): RecentRef[] {
  const p = padById(ws, padId);
  if (!p) return [];
  const out: RecentRef[] = [];
  for (const k of p.recent ?? []) {
    const id = k.slice(2);
    if (k.startsWith('s:')) {
      if (p.sheets.includes(id) && viewById(ws, id) && !(id === now.sheet && !now.note)) out.push({ kind: 'sheet', id });
    } else {
      const sheet = p.sheets.find((s) => idsIn(viewById(ws, s)!).includes(id));
      if (sheet && noteById(ws, id) && id !== now.note) out.push({ kind: 'note', id, sheet });
    }
  }
  return out;
}

// ---------------------------------------------------------------- F-206 Schritt 4 (V81): Dock
// Entscheidungen: Claude Doc „F-206 V81 – Dock (Schritt 4) mit Steuerknopf (K5)“, D1–D12.
/** D4: Breite des Docks in px – ab Werk 360, 260 bis halbe Desk-Breite. */
export const DOCK_W = { min: 260, start: 360 } as const;
/** D1: eingeklappt zur Lasche. */
export const DOCK_TAB_W = 40;

/** Pads im Dock dieses Desks (Reihenfolge = Stapel, zuletzt = gezeigt). */
export const dockedOn = (ws: Workspace, desk: string): Pad[] => padsOn(ws, desk).filter((p) => p.docked);
/** D1: Das Dock zeigt ein Pad – das zuletzt nach oben geholte. */
export const dockFront = (ws: Workspace, desk: string): Pad | undefined => dockedOn(ws, desk).at(-1);

export interface DockState {
  edge: 'right';
  w: number;
  folded: boolean;
  off: boolean;
}

/** Zustand des Docks auf diesem Gerät (D3: vorerst immer rechts). */
export function dockOf(ws: Workspace, desk: string): DockState {
  const d = ws.padDesks?.[desk];
  return { edge: 'right', w: d?.dock?.w ?? DOCK_W.start, folded: d?.dock?.folded === true, off: d?.dockOff === true };
}

/** D4: Breite in die Grenzen rücken (260 px bis halbe Desk-Breite; ist der Desk zu schmal, gilt die Hälfte). */
export function clampDockW(w: number, deskW: number): number {
  const max = Math.max(DOCK_TAB_W, Math.floor(deskW / 2));
  return Math.round(Math.min(max, Math.max(Math.min(DOCK_W.min, max), w)));
}

/** D2: Streifen, den das Dock vom Desk nimmt (px): weg/leer 0, eingeklappt 40, sonst die Breite. */
export function dockBand(ws: Workspace, desk: string, deskW: number): number {
  const s = dockOf(ws, desk);
  if (s.off || !dockedOn(ws, desk).length || deskW <= 0) return 0;
  return s.folded ? Math.min(DOCK_TAB_W, deskW) : clampDockW(s.w, deskW);
}

function patchDesk(ws: Workspace, desk: string, fn: (d: PadDesk) => PadDesk): Workspace {
  const d = fn(ws.padDesks?.[desk] ?? { places: {} });
  return { ...ws, padDesks: { ...ws.padDesks, [desk]: d } };
}

/** Breite bzw. eingeklappt setzen (geräteeigen). */
export function setDock(ws: Workspace, desk: string, patch: { w?: number; folded?: boolean }): Workspace {
  return patchDesk(ws, desk, (d) => {
    const cur = d.dock ?? { edge: 'right' as const, at: 0 };
    const next = { ...cur, ...(patch.w !== undefined ? { w: Math.round(patch.w) } : {}) };
    if (patch.folded !== undefined) {
      if (patch.folded) next.folded = true;
      else delete next.folded;
    }
    return { ...d, dock: next };
  });
}

/** D8: Dock ein- bzw. wegschalten (die Pads bleiben im Dock). */
export function setDockOff(ws: Workspace, desk: string, off: boolean): Workspace {
  return patchDesk(ws, desk, (d) => {
    const { dockOff: _o, ...rest } = d;
    return off ? { ...rest, dockOff: true } : rest;
  });
}

/**
 * D5/D6: Pad ins Dock bzw. heraus. Der Platz auf dem Desk bleibt gespeichert – so kommt ein gelöstes
 * Pad an seinen letzten Platz zurück. Ins Dock: das Pad wird gezeigt, das Dock eingeschaltet und
 * ausgeklappt. Heraus: es kommt nach oben.
 */
export function dockPad(ws: Workspace, padId: string, on: boolean): Workspace {
  const p = padById(ws, padId);
  if (!p || !!p.docked === on) return ws;
  let next = patchPad(ws, padId, (x) => {
    const { docked: _d, ...rest } = x;
    return on ? { ...rest, docked: true } : rest;
  });
  next = raisePad(next, padId);
  if (on) next = setDock(setDockOff(next, p.desk, false), p.desk, { folded: false });
  return next;
}

/** D5/D6: alle Pads eines Desks ins Dock bzw. alle verteilen. Ins Dock: das bisher oberste bleibt vorn. */
export function dockAll(ws: Workspace, desk: string, on: boolean): Workspace {
  const list = padsOn(ws, desk).filter((p) => !!p.docked !== on);
  if (!list.length) return ws;
  const ids = new Set(list.map((p) => p.id));
  let next = withPads(
    ws,
    padsOf(ws).map((p) => {
      if (!ids.has(p.id)) return p;
      const { docked: _d, ...rest } = p;
      return on ? { ...rest, docked: true } : rest;
    }),
  );
  if (on) next = setDock(setDockOff(next, desk, false), desk, { folded: false });
  return next;
}

/** V83 (F-206 Schritt 5, N4): Lage der Pads eines Desks für das Rad „Pads“ (Verteilt · Im Dock · Ausgeblendet). */
export type PadsShow = 'spread' | 'dock' | 'hidden' | 'mixed' | 'none';
/**
 * `loose` = schwebende Pads, `docked` = Pads im Dock, `hidden` = schwebende ausgeblendet, `dockOff` = Dock weggeschaltet.
 * Verteilt: nichts im Dock, schwebende sichtbar. Im Dock: alle im Dock, Dock da. Ausgeblendet: nichts sichtbar.
 * Alles andere (z. B. einige verteilt, andere im Dock) = Gemischt – das Rad steht dann zwischen den Rasten.
 */
export function padsShow(loose: number, docked: number, hidden: boolean, dockOff: boolean): PadsShow {
  if (loose + docked === 0) return 'none';
  const looseSeen = loose > 0 && !hidden;
  const dockSeen = docked > 0 && !dockOff;
  if (!looseSeen && !dockSeen) return 'hidden';
  if (docked === 0) return 'spread';
  if (loose === 0 && dockSeen) return 'dock';
  return 'mixed';
}

// ---------------------------------------------------------------- F-206 Schritt 5 (V85): Cockpit „Notizen“
// Entscheidungen: Claude Doc „F-206 V82 – Knopf „Notes & Tasks“ und Cockpit (Schritt 5)“, N8–N10.

/**
 * N10: Pad auf einen anderen Desk verschieben. Es kommt schwebend (nicht im Dock) oben auf den Ziel-Desk;
 * `place` = Platz dort (über dem aktiven Slot, wenn der Aufrufer ihn kennt), sonst bekommt es beim
 * ersten Zeigen seinen Platz. Der alte Platz entfällt, `from` (Umstieg) gilt nicht mehr.
 */
export function movePadToDesk(ws: Workspace, padId: string, desk: string, place?: PadPlace): Workspace {
  const p = padById(ws, padId);
  if (!p || p.desk === desk) return ws;
  const { docked: _d, from: _f, ...rest } = p;
  const moved: Pad = { ...rest, desk };
  let next = dropPlace(withPads(ws, [...padsOf(ws).filter((x) => x.id !== padId), moved]), padId);
  if (place) next = setPlace(next, desk, padId, place);
  return next;
}

/** N8: Zustand eines Pads zum Wiederherstellen nach „Schließen“ (Rückgängig) – Pad, Stapelplatz, Plätze, leere Sheets. */
export interface PadUndo {
  pad: Pad;
  index: number;
  places: Record<string, PadPlace>;
  views: { view: NoteView; index: number }[];
}

export function padUndoOf(ws: Workspace, padId: string): PadUndo | null {
  const pads = padsOf(ws);
  const index = pads.findIndex((p) => p.id === padId);
  if (index < 0) return null;
  const pad = pads[index];
  const places: Record<string, PadPlace> = {};
  for (const [desk, d] of Object.entries(ws.padDesks ?? {})) if (d.places[padId]) places[desk] = d.places[padId];
  const all = viewsOf(ws);
  const views = pad.sheets.flatMap((s) => {
    const i = all.findIndex((v) => v.id === s);
    return i >= 0 && isEmptySheet(all[i]) ? [{ view: all[i], index: i }] : [];
  });
  return { pad, index, places, views };
}

/** Rückgängig für „Pad schließen“: leere Sheets, Pad (an seinem Stapelplatz) und Plätze kommen zurück. */
export function restorePad(ws: Workspace, u: PadUndo): Workspace {
  if (padById(ws, u.pad.id)) return ws;
  const views = [...viewsOf(ws)];
  for (const { view, index } of u.views) if (!views.some((v) => v.id === view.id)) views.splice(Math.min(index, views.length), 0, view);
  // Sheets, die es inzwischen nicht mehr gibt oder die in einem anderen Pad liegen, bleiben weg
  const sheets = u.pad.sheets.filter((s) => views.some((v) => v.id === s) && !padWith(ws, s));
  if (!sheets.length) return ws;
  const pad: Pad = { ...u.pad, sheets, active: sheets.includes(u.pad.active) ? u.pad.active : sheets[0] };
  const pads = [...padsOf(ws)];
  pads.splice(Math.min(u.index, pads.length), 0, pad);
  let next: Workspace = { ...withPads(ws, pads), noteViews: views };
  for (const [desk, place] of Object.entries(u.places)) next = setPlace(next, desk, pad.id, place);
  return next;
}

/** Name eines Pads für Listen und Ansagen: Name des sichtbaren Sheets. */
export const padTitle = (ws: Workspace, p: Pad): string => viewById(ws, p.active)?.name ?? viewById(ws, p.sheets[0] ?? '')?.name ?? 'Pad';

/** N8: Rückgängig für „Sheet schließen“ – letztes Sheet: wie „Pad schließen“; sonst Reiter an seinen Platz zurück. */
export type SheetUndo = { pad: PadUndo } | { padId: string; sheet: string; index: number; active: boolean; view?: { view: NoteView; index: number } };

export function sheetUndoOf(ws: Workspace, padId: string, sheetId: string): SheetUndo | null {
  const p = padById(ws, padId);
  if (!p?.sheets.includes(sheetId)) return null;
  if (p.sheets.length === 1) {
    const u = padUndoOf(ws, padId);
    return u ? { pad: u } : null;
  }
  const all = viewsOf(ws);
  const vi = all.findIndex((v) => v.id === sheetId);
  return { padId, sheet: sheetId, index: p.sheets.indexOf(sheetId), active: p.active === sheetId, ...(vi >= 0 && isEmptySheet(all[vi]) ? { view: { view: all[vi], index: vi } } : {}) };
}

export function restoreSheet(ws: Workspace, u: SheetUndo): Workspace {
  if ('pad' in u) return restorePad(ws, u.pad);
  let next = ws;
  if (u.view && !viewById(next, u.view.view.id)) {
    const views = [...viewsOf(next)];
    views.splice(Math.min(u.view.index, views.length), 0, u.view.view);
    next = { ...next, noteViews: views };
  }
  const r = addSheet(next, u.padId, u.sheet, u.index);
  if (!r.ok) return ws;
  const p = padById(ws, u.padId);
  return u.active || !p ? r.ws : patchPad(r.ws, u.padId, (x) => ({ ...x, active: p.active }));
}
