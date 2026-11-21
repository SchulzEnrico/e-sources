/**
 * Aktionen auf der ganzen Arbeitsfläche. Namen gelten überall, Position und Größe je
 * Bildschirm-Einstellung (F-03). Fenster ohne Platz im Raster liegen im Stapel (F-08).
 */
import * as G from './layout';
import {
  type Lines,
  type Orientation,
  type ScreenClassId,
  type ScreenSetup,
  type ScreenSpec,
  allowsTwoLines,
  layoutKey,
  linesKey,
  parseLayoutKey,
  specOf,
} from './screen';
import { STACK_ID, type Placed, type Rect, type WinItem, type WinMeta, type Workspace } from './types';

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function defaultWorkspace(): Workspace {
  const windows = [1, 2, 3].map((n) => ({ id: newId(), name: `Fenster ${n}` }));
  return { windows, layouts: {}, preferred: {}, stackFront: {}, lines: {}, nextNumber: 4 };
}

/** Einstellung aus Klasse und Ausrichtung, ergänzt um die gespeicherte Wahl ein-/zweizeilig. */
export function setupFor(ws: Workspace, cls: ScreenClassId, orientation: Orientation): ScreenSetup {
  const lines: Lines = allowsTwoLines(cls) ? (ws.lines[linesKey(cls, orientation)] ?? 2) : 1;
  return { cls, orientation, lines };
}

export function setLines(ws: Workspace, cls: ScreenClassId, orientation: Orientation, lines: Lines): Workspace {
  return { ...ws, lines: { ...ws.lines, [linesKey(cls, orientation)]: lines } };
}

// ---------------------------------------------------------------- Layout herstellen

const strip = ({ id, x, y, w, h }: Placed): Placed => ({ id, x, y, w, h });
const asItem = (p: Placed): WinItem => ({ ...p, name: '' });

/** Erstes Layout: alle Fenster gleich verteilt, überzählige im Stapel rechts. */
function initialPlacement(windows: WinMeta[], spec: ScreenSpec): Placed[] {
  const cap = spec.capacity;
  const ids = windows.length <= cap ? windows.map((w) => w.id) : [...windows.slice(0, cap - 1).map((w) => w.id), STACK_ID];
  const items = ids.map((id) => ({ id, name: '', x: 0, y: 0, w: 1, h: 1 }));
  return G.distributeEvenly(items, spec, spec, STACK_ID).map(strip);
}

/** Platz ganz rechts (bei Gleichstand der untere) – dort entsteht der Stapel. */
function rightmost(items: WinItem[]): WinItem {
  return [...items].sort((a, b) => b.x + b.w - (a.x + a.w) || b.y + b.h - (a.y + a.h))[0];
}

/**
 * Bringt ein gespeichertes Layout in einen gültigen Zustand: entfernt geschlossene Fenster,
 * gibt neuen Fenstern einen Platz oder legt sie in den Stapel, und löst einen Stapel mit
 * nur einem oder keinem Fenster auf.
 */
export function normalize(windows: WinMeta[], stored: Placed[] | undefined, spec: ScreenSpec): Placed[] {
  if (!stored) return initialPlacement(windows, spec);
  const exists = new Set(windows.map((w) => w.id));
  let items = stored
    .filter((p) => (p.id === STACK_ID || exists.has(p.id)) && G.inBounds(p, spec))
    .map(asItem);
  if (!G.isValidLayout(items, spec) || items.length > spec.capacity) return initialPlacement(windows, spec);

  let hasStack = items.some((i) => i.id === STACK_ID);
  if (!hasStack) {
    const placedIds = new Set(items.map((i) => i.id));
    for (const m of windows.filter((w) => !placedIds.has(w.id))) {
      if (items.length < spec.capacity) {
        const spot = G.placeNew(items, spec, { w: spec.slotW, h: spec.slotH });
        items = spot
          ? [...spot.windows, { id: m.id, name: '', ...spot.rect }]
          : G.distributeEvenly([...items, { id: m.id, name: '', x: 0, y: 0, w: 1, h: 1 }], spec, spec);
        continue;
      }
      // Kein sichtbarer Platz mehr: Der Platz ganz rechts wird zum Stapel.
      const last = rightmost(items);
      items = items.map((i) => (i.id === last.id ? { ...i, id: STACK_ID } : i));
      hasStack = true;
      break; // alle übrigen Fenster liegen damit im Stapel
    }
  }

  if (hasStack) {
    const placedNow = new Set(items.map((i) => i.id));
    const members = windows.filter((w) => !placedNow.has(w.id));
    if (members.length === 0) items = G.growIntoGaps(items.filter((i) => i.id !== STACK_ID), spec);
    else if (members.length === 1) items = items.map((i) => (i.id === STACK_ID ? { ...i, id: members[0].id } : i));
  }
  return items.map(strip);
}

export interface View {
  key: string;
  spec: ScreenSpec;
  /** Plätze im Raster, darunter ggf. der Stapel (id = STACK_ID). */
  items: WinItem[];
  /** Fenster im Stapel, in Reihenfolge. */
  stack: WinMeta[];
  /** Sichtbares Fenster im Stapel. */
  front: WinMeta | null;
}

export function viewOf(ws: Workspace, setup: ScreenSetup): View {
  const key = layoutKey(setup);
  const spec = specOf(setup);
  const placed = normalize(ws.windows, ws.layouts[key], spec);
  const names = new Map(ws.windows.map((w) => [w.id, w.name]));
  const placedIds = new Set(placed.map((p) => p.id));
  const stack = placed.some((p) => p.id === STACK_ID) ? ws.windows.filter((w) => !placedIds.has(w.id)) : [];
  const front = stack.find((w) => w.id === ws.stackFront[key]) ?? stack[0] ?? null;
  const items = placed.map((p) => ({ ...p, name: p.id === STACK_ID ? `Stapel (${stack.length})` : (names.get(p.id) ?? '') }));
  return { key, spec, items, stack, front };
}

/** Platz im Raster, auf dem ein Fenster liegt: sein eigener oder der Stapel. */
export function slotOf(view: View, id: string): string | null {
  if (view.items.some((i) => i.id === id && id !== STACK_ID)) return id;
  if (view.stack.some((w) => w.id === id)) return STACK_ID;
  return null;
}

function commit(ws: Workspace, key: string, items: Placed[]): Workspace {
  return { ...ws, layouts: { ...ws.layouts, [key]: items.map(strip) } };
}

/** Wendet eine Änderung auf die Plätze einer Einstellung an; null = nichts ändern. */
function change(ws: Workspace, setup: ScreenSetup, fn: (items: WinItem[], v: View) => WinItem[] | null): Workspace {
  const v = viewOf(ws, setup);
  const after = fn(v.items, v);
  if (!after || G.sameLayout(v.items, after)) return ws;
  return commit(ws, v.key, after);
}

// ---------------------------------------------------------------- F-10

/** Fenster anlegen. Ist kein sichtbarer Platz frei, kommt es in den Stapel und wird dort angezeigt. */
export function addWindow(ws: Workspace, setup: ScreenSetup): Workspace {
  const meta: WinMeta = { id: newId(), name: `Fenster ${ws.nextNumber}` };
  const v = viewOf(ws, setup);
  let next: Workspace = { ...ws, windows: [...ws.windows, meta], nextNumber: ws.nextNumber + 1 };
  const placed = normalize(next.windows, v.items, v.spec);
  next = commit(next, v.key, placed);
  if (!placed.some((p) => p.id === meta.id)) next = { ...next, stackFront: { ...next.stackFront, [v.key]: meta.id } };
  return next;
}

/**
 * Fenster schließen. Lag es im Raster und gibt es einen Stapel, rückt das sichtbare
 * Stapel-Fenster auf den frei gewordenen Platz; sonst wachsen die Nachbarn (F-02).
 */
export function removeWindow(ws: Workspace, id: string): Workspace {
  if (!ws.windows.some((w) => w.id === id)) return ws;
  const windows = ws.windows.filter((w) => w.id !== id);
  const layouts: Workspace['layouts'] = {};
  const stackFront = { ...ws.stackFront };
  for (const [key, stored] of Object.entries(ws.layouts)) {
    const setup = parseLayoutKey(key);
    if (!setup) continue;
    const spec = specOf(setup);
    let placed = stored;
    if (stored.some((p) => p.id === id)) {
      const placedIds = new Set(stored.map((p) => p.id));
      const members = windows.filter((w) => !placedIds.has(w.id));
      if (stored.some((p) => p.id === STACK_ID) && members.length > 0) {
        const front = members.find((w) => w.id === ws.stackFront[key]) ?? members[0];
        placed = stored.map((p) => (p.id === id ? { ...p, id: front.id } : p));
        const rest = members.filter((w) => w.id !== front.id);
        if (rest[0]) stackFront[key] = rest[0].id;
      } else {
        const rest = stored.filter((p) => p.id !== id).map(asItem);
        placed = G.growIntoGaps(rest, spec).map(strip);
      }
    }
    layouts[key] = normalize(windows, placed, spec);
    if (stackFront[key] === id) delete stackFront[key];
  }
  return { ...ws, windows, layouts, stackFront };
}

export function renameWindow(ws: Workspace, id: string, name: string): Workspace {
  const trimmed = name.trim();
  if (!trimmed) return ws;
  return { ...ws, windows: ws.windows.map((w) => (w.id === id ? { ...w, name: trimmed } : w)) };
}

// ---------------------------------------------------------------- F-08 Stapel

export function setStackFront(ws: Workspace, setup: ScreenSetup, id: string): Workspace {
  return { ...ws, stackFront: { ...ws.stackFront, [layoutKey(setup)]: id } };
}

/** Wechselt im Stapel um `step` Fenster weiter (−1 = zurück); am Ende geht es vorne weiter. */
export function stepStack(ws: Workspace, setup: ScreenSetup, step: number): Workspace {
  const v = viewOf(ws, setup);
  if (v.stack.length < 2 || !v.front) return ws;
  const i = v.stack.findIndex((w) => w.id === v.front!.id);
  const next = v.stack[(i + step + v.stack.length) % v.stack.length];
  return setStackFront(ws, setup, next.id);
}

// ---------------------------------------------------------------- F-11, F-12

/**
 * Zwei Fenster tauschen. Liegt eines davon im Stapel, wechselt das andere in den Stapel
 * und wird dort angezeigt.
 */
export function swapWindows(ws: Workspace, setup: ScreenSetup, a: string, b: string): Workspace {
  const v = viewOf(ws, setup);
  const sa = slotOf(v, a);
  const sb = slotOf(v, b);
  if (!sa || !sb || a === b || (sa === STACK_ID && sb === STACK_ID)) return ws;
  if (sa !== STACK_ID && sb !== STACK_ID) return commit(ws, v.key, G.swapRects(v.items, a, b));
  const [inGrid, inStack] = sa === STACK_ID ? [b, a] : [a, b];
  const items = v.items.map((i) => (i.id === inGrid ? { ...i, id: inStack } : i));
  return { ...commit(ws, v.key, items), stackFront: { ...ws.stackFront, [v.key]: inGrid } };
}

/** Ergebnis von Ziehen im Raster (id = Platz, also Fenster oder STACK_ID). */
export function moveWindow(ws: Workspace, setup: ScreenSetup, id: string, next: Rect): Workspace {
  return change(ws, setup, (items, v) => G.moveWindow(items, v.spec, id, next));
}

/** Ergebnis einer Größenänderung am Rand oder an der Ecke. */
export function resizeWindow(ws: Workspace, setup: ScreenSetup, id: string, next: Rect): Workspace {
  return change(ws, setup, (items, v) => G.resizeWindow(items, v.spec, id, next));
}

/** Voreingestellte Größe als Anteil von Breite und Höhe der Arbeitsfläche. */
export function setWindowSize(ws: Workspace, setup: ScreenSetup, id: string, wf: number, hf: number): Workspace {
  return change(ws, setup, (items, v) => {
    const slot = slotOf(v, id);
    const t = items.find((w) => w.id === slot);
    if (!slot || !t) return null;
    const g = v.spec;
    const w = G.clamp(Math.round(g.cols * wf), G.MIN_W, g.cols);
    const h = G.clamp(Math.round(g.rows * hf), G.MIN_H, g.rows);
    const x = G.clamp(t.x, 0, g.cols - w);
    const y = G.clamp(t.y, 0, g.rows - h);
    const trial = items.map((o) => (o.id === slot ? { ...o, x, y, w, h } : o));
    const ok = G.resolve(trial, g, slot, items);
    if (ok) return G.growIntoGaps(ok, g, slot);
    return G.resizeWindow(items, g, slot, { x, y, w, h });
  });
}

// ---------------------------------------------------------------- F-05

export function distribute(ws: Workspace, setup: ScreenSetup): Workspace {
  return change(ws, setup, (items, v) => G.distributeEvenly(items, v.spec, v.spec, STACK_ID));
}

export function savePreferred(ws: Workspace, setup: ScreenSetup): Workspace {
  const v = viewOf(ws, setup);
  return { ...ws, preferred: { ...ws.preferred, [v.key]: v.items.map(strip) } };
}

export function clearPreferred(ws: Workspace, setup: ScreenSetup): Workspace {
  const preferred = { ...ws.preferred };
  delete preferred[layoutKey(setup)];
  return { ...ws, preferred };
}

/**
 * Ganzes Layout zurücksetzen: auf die Wunsch-Anordnung, sonst auf die Standard-Verteilung.
 * Es werden keine Fenster gelöscht; Fenster, die neu dazugekommen sind, landen im Stapel
 * oder auf einem freien Platz.
 */
export function resetLayout(ws: Workspace, setup: ScreenSetup): Workspace {
  const key = layoutKey(setup);
  const pref = ws.preferred[key];
  const layouts = { ...ws.layouts };
  if (pref) layouts[key] = normalize(ws.windows, pref, specOf(setup));
  else delete layouts[key];
  return { ...ws, layouts };
}

/** Einzelnes Fenster zurücksetzen: auf seinen Platz in der Wunsch-Anordnung, sonst auf Platzgröße. */
export function resetWindow(ws: Workspace, setup: ScreenSetup, id: string): Workspace {
  const pref = ws.preferred[layoutKey(setup)];
  return change(ws, setup, (items, v) => {
    const slot = slotOf(v, id);
    const t = items.find((w) => w.id === slot);
    if (!slot || !t) return null;
    const g = v.spec;
    const p = pref?.find((q) => q.id === slot);
    const w = Math.max(G.MIN_W, Math.floor(g.slotW));
    const h = Math.max(G.MIN_H, Math.floor(g.slotH));
    const target: Rect = p
      ? { x: p.x, y: p.y, w: p.w, h: p.h }
      : { x: G.clamp(t.x, 0, g.cols - w), y: G.clamp(t.y, 0, g.rows - h), w, h };
    const trial = items.map((o) => (o.id === slot ? { ...o, ...target } : o));
    const ok = G.resolve(trial, g, slot, items);
    return ok ? G.growIntoGaps(ok, g, slot) : null;
  });
}
