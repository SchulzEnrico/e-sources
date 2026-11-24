/**
 * F-206 Schritt 3 (V66): Pads – Logik ohne Oberfläche. Ein Pad liegt auf einem Desk und zeigt bis
 * PAD_SHEETS_MAX Sheets; jedes Sheet liegt höchstens in einem Pad (Antwort 20). Plätze gelten je
 * Gerät und Desk (Workspace.padDesks, DEVICE_FIELDS). Entscheidungen: Claude Doc „Pads mit
 * Notizblock und Lageplan“ (P1–P9). Reine Funktionen.
 */
import type { FRect } from './tree';
import type { NoteView, Pad, PadPlace, Workspace } from './types';
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
