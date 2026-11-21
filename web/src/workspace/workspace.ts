/**
 * Aktionen auf der ganzen Arbeitsfläche. Namen gelten überall, die Anordnung je
 * Bildschirm-Einstellung (F-03). Panels ohne Platz liegen im Stapel (F-08).
 */
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
  slotSize,
  specOf,
} from './screen';
import * as T from './tree';
import { STACK_ID, type PanelMeta, type Slot, type Workspace } from './types';

/** Mindestgröße, wenn die Oberfläche keine eigene angibt (Anteil der Fläche). */
export const DEFAULT_MIN: T.Min = { w: 0.08, h: 0.12 };

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function defaultWorkspace(): Workspace {
  const panels = [1, 2, 3].map((n) => ({ id: newId(), name: `Panel ${n}` }));
  return { panels, layouts: {}, preferred: {}, stackFront: {}, lines: {}, nextNumber: 4 };
}

/** Einstellung aus Klasse und Ausrichtung, ergänzt um die gespeicherte Wahl ein-/zweizeilig. */
export function setupFor(ws: Workspace, cls: ScreenClassId, orientation: Orientation): ScreenSetup {
  const lines: Lines = allowsTwoLines(cls) ? (ws.lines[linesKey(cls, orientation)] ?? 2) : 1;
  return { cls, orientation, lines };
}

export function setLines(ws: Workspace, cls: ScreenClassId, orientation: Orientation, lines: Lines): Workspace {
  return { ...ws, lines: { ...ws.lines, [linesKey(cls, orientation)]: lines } };
}

// ---------------------------------------------------------------- Anordnung herstellen

/** Erste Anordnung: alle Panels gleich verteilt, überzählige im Stapel ganz rechts. */
function initialTree(panels: PanelMeta[], spec: ScreenSpec): T.Node | null {
  const cap = spec.capacity;
  const ids = panels.length <= cap ? panels.map((p) => p.id) : [...panels.slice(0, cap - 1).map((p) => p.id), STACK_ID];
  return T.standard(ids, spec.lines, spec.perLine, spec.orientation);
}

/**
 * Bringt eine gespeicherte Anordnung in einen gültigen Zustand: entfernt geschlossene Panels,
 * gibt neuen Panels einen Platz oder legt sie in den Stapel und löst einen Stapel mit nur
 * einem oder keinem Panel auf.
 */
export function normalize(panels: PanelMeta[], stored: T.Node | null | undefined, spec: ScreenSpec): T.Node | null {
  if (!stored || !T.isNode(stored)) return initialTree(panels, spec);
  const exists = new Set(panels.map((p) => p.id));
  let tree: T.Node | null = stored;
  for (const id of T.leaves(stored)) {
    if (id !== STACK_ID && !exists.has(id) && tree) tree = T.removeLeaf(tree, id);
  }
  if (!tree || T.leaves(tree).length > spec.capacity) return initialTree(panels, spec);

  let hasStack = T.hasLeaf(tree, STACK_ID);
  if (!hasStack) {
    for (const p of panels.filter((m) => !T.hasLeaf(tree, m.id))) {
      if (T.leaves(tree).length < spec.capacity) {
        tree = T.addToLargest(tree, p.id, spec.aspect);
        continue;
      }
      // Kein sichtbarer Platz mehr: Der Platz ganz rechts wird zum Stapel.
      tree = T.replaceLeaf(tree, T.rightmost(tree), STACK_ID);
      hasStack = true;
      break; // alle übrigen Panels liegen damit im Stapel
    }
  }

  if (hasStack) {
    const members = panels.filter((p) => !T.hasLeaf(tree, p.id));
    if (members.length === 0) tree = T.removeLeaf(tree, STACK_ID);
    else if (members.length === 1) tree = T.replaceLeaf(tree, STACK_ID, members[0].id);
  }
  return tree;
}

export interface View {
  key: string;
  spec: ScreenSpec;
  tree: T.Node | null;
  /** Plätze auf der Fläche, darunter ggf. der Stapel (id = STACK_ID). */
  slots: Slot[];
  /** Panels im Stapel, in Reihenfolge. */
  stack: PanelMeta[];
  /** Sichtbares Panel im Stapel. */
  front: PanelMeta | null;
}

/** Plätze, Stapel und vorderstes Stapel-Panel zu einem Baum. */
export function describe(ws: Workspace, key: string, spec: ScreenSpec, tree: T.Node | null): View {
  const names = new Map(ws.panels.map((p) => [p.id, p.name]));
  const placed = new Set(T.leaves(tree));
  const stack = placed.has(STACK_ID) ? ws.panels.filter((p) => !placed.has(p.id)) : [];
  const front = stack.find((p) => p.id === ws.stackFront[key]) ?? stack[0] ?? null;
  const slots = [...T.rects(tree).entries()].map(([id, rect]) => ({
    id,
    rect,
    name: id === STACK_ID ? `Stapel (${stack.length})` : (names.get(id) ?? ''),
  }));
  return { key, spec, tree, slots, stack, front };
}

export function viewOf(ws: Workspace, setup: ScreenSetup): View {
  const key = layoutKey(setup);
  const spec = specOf(setup);
  return describe(ws, key, spec, normalize(ws.panels, ws.layouts[key], spec));
}

/** Platz, auf dem ein Panel liegt: sein eigener oder der Stapel. */
export function slotOf(view: View, id: string): string | null {
  if (id !== STACK_ID && T.hasLeaf(view.tree, id)) return id;
  if (view.stack.some((p) => p.id === id)) return STACK_ID;
  return null;
}

function commit(ws: Workspace, key: string, tree: T.Node | null): Workspace {
  const layouts = { ...ws.layouts };
  if (tree) layouts[key] = tree;
  else delete layouts[key];
  return { ...ws, layouts };
}

/** Wendet eine Änderung auf die Anordnung einer Einstellung an; null = nichts ändern. */
function change(ws: Workspace, setup: ScreenSetup, fn: (tree: T.Node, v: View) => T.Node | null): Workspace {
  const v = viewOf(ws, setup);
  if (!v.tree) return ws;
  const after = fn(v.tree, v);
  if (!after || JSON.stringify(after) === JSON.stringify(v.tree)) return ws;
  return commit(ws, v.key, after);
}

// ---------------------------------------------------------------- F-10

/** Panel anlegen. Es teilt sich das größte Panel; ist kein Platz frei, kommt es in den Stapel und wird dort angezeigt. */
// ---------------------------------------------------------------- F-26 Ampel

/** Ab dieser Zahl je Platz bzw. Panel (Tabs) nehmen Fokus und Übersicht ab. */
export const FOCUS_WARN = 5;
/** Höchstzahl der Panels je Platz bzw. Tabs je Panel. */
export const STACK_MAX = 9;

const mix = (a: number[], b: number[], t: number) =>
  `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(', ')})`;

/**
 * Rahmenfarbe nach Anzahl (F-26): 1–5 von Dunkelgrün zu Neongrün in 20-%-Schritten,
 * 6 Gelb, 7 Orange, 8–9 Rot.
 */
export function loadColor(n: number): string {
  if (n <= 5) return mix([22, 92, 44], [57, 255, 20], (Math.max(1, n) - 1) / 4);
  if (n === 6) return 'rgb(255, 214, 10)';
  if (n === 7) return 'rgb(255, 140, 0)';
  return n === 8 ? 'rgb(255, 59, 48)' : 'rgb(208, 0, 0)';
}

/** True, wenn ein neues Panel im Stapel landen würde und dieser schon voll ist. */
export function stackFull(ws: Workspace, setup: ScreenSetup): boolean {
  const probe = addPanel(ws, setup, true);
  return probe === ws;
}

export function addPanel(ws: Workspace, setup: ScreenSetup, limit = true): Workspace {
  const meta: PanelMeta = { id: newId(), name: `Panel ${ws.nextNumber}` };
  const v = viewOf(ws, setup);
  let next: Workspace = { ...ws, panels: [...ws.panels, meta], nextNumber: ws.nextNumber + 1 };
  // Eine noch nie angezeigte Einstellung bekommt zuerst ihre Standard-Anordnung.
  const tree = normalize(next.panels, v.tree ?? undefined, v.spec);
  next = commit(next, v.key, tree);
  if (!T.hasLeaf(tree, meta.id)) {
    // F-26: Mehr als STACK_MAX Panels je Platz gehen nicht.
    if (limit && describe(next, v.key, v.spec, tree).stack.length > STACK_MAX) return ws;
    next = { ...next, stackFront: { ...next.stackFront, [v.key]: meta.id } };
  }
  return next;
}

/**
 * Panel schließen. Lag es auf der Fläche und gibt es einen Stapel, rückt das sichtbare
 * Stapel-Panel auf den frei gewordenen Platz; sonst übernimmt der Nachbar den Platz (F-02).
 */
export function removePanel(ws: Workspace, id: string): Workspace {
  if (!ws.panels.some((p) => p.id === id)) return ws;
  const panels = ws.panels.filter((p) => p.id !== id);
  const layouts: Workspace['layouts'] = {};
  const stackFront = { ...ws.stackFront };
  for (const [key, stored] of Object.entries(ws.layouts)) {
    const setup = parseLayoutKey(key);
    if (!setup || !T.isNode(stored)) continue;
    const spec = specOf(setup);
    let tree: T.Node | null = stored;
    if (T.hasLeaf(stored, id)) {
      const members = panels.filter((p) => !T.hasLeaf(stored, p.id));
      if (T.hasLeaf(stored, STACK_ID) && members.length > 0) {
        const front = members.find((p) => p.id === ws.stackFront[key]) ?? members[0];
        tree = T.replaceLeaf(stored, id, front.id);
        const rest = members.filter((p) => p.id !== front.id);
        if (rest[0]) stackFront[key] = rest[0].id;
      } else {
        tree = T.removeLeaf(stored, id);
      }
    }
    const fixed = normalize(panels, tree, spec);
    if (fixed) layouts[key] = fixed;
    if (stackFront[key] === id) delete stackFront[key];
  }
  return { ...ws, panels, layouts, stackFront };
}

export function renamePanel(ws: Workspace, id: string, name: string): Workspace {
  const trimmed = name.trim();
  if (!trimmed) return ws;
  return { ...ws, panels: ws.panels.map((p) => (p.id === id ? { ...p, name: trimmed } : p)) };
}

/**
 * Macht aus einer Eingabe eine aufrufbare Adresse: ohne Schema wird https:// ergänzt,
 * bei localhost und 127.0.0.1 http://. Leere Eingabe = keine Seite.
 */
export function normalizeUrl(input: string): string {
  const t = input.trim();
  if (!t) return '';
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(t)) return t;
  if (/^(localhost|127\.0\.0\.1)(:|\/|$)/i.test(t)) return `http://${t}`;
  return `https://${t}`;
}

/** Höchstzahl der Einträge im Verlauf eines Panels. */
export const HISTORY_MAX = 50;

const mapPanel = (ws: Workspace, id: string, f: (p: PanelMeta) => PanelMeta): Workspace => ({
  ...ws,
  panels: ws.panels.map((p) => (p.id === id ? f(p) : p)),
});

/**
 * Seite in einem Panel öffnen (Adresszeile, F-14). Legt einen Verlaufseintrag an; Einträge
 * „vorwärts“ entfallen wie im Browser. Leere Eingabe = keine Seite (Verlauf bleibt).
 */
export function navigatePanel(ws: Workspace, id: string, input: string): Workspace {
  const url = normalizeUrl(input);
  return mapPanel(ws, id, (p) => {
    if (!url) {
      const next = { ...p };
      delete next.url;
      return next;
    }
    if (url === p.url) return p;
    const past = (p.history ?? []).slice(0, (p.pos ?? -1) + 1);
    const history = [...past, url].slice(-HISTORY_MAX);
    return { ...p, url, history, pos: history.length - 1, home: p.home ?? url };
  });
}

/** Bisheriger Name, damit ältere Aufrufe weiter funktionieren. */
export const setPanelUrl = navigatePanel;

export function canGoBack(p: PanelMeta): boolean {
  return !!p.history && (p.pos ?? 0) > 0;
}
export function canGoForward(p: PanelMeta): boolean {
  return !!p.history && (p.pos ?? 0) < p.history.length - 1;
}

/** Im Verlauf zurück (−1) oder vor (+1). */
export function historyStep(ws: Workspace, id: string, step: number): Workspace {
  return mapPanel(ws, id, (p) => {
    if (!p.history?.length) return p;
    const pos = Math.max(0, Math.min(p.history.length - 1, (p.pos ?? 0) + step));
    return pos === p.pos ? p : { ...p, pos, url: p.history[pos] };
  });
}

/** Zur Startseite des Panels (Home-Knopf). */
export function goHome(ws: Workspace, id: string): Workspace {
  const home = ws.panels.find((p) => p.id === id)?.home;
  return home ? navigatePanel(ws, id, home) : ws;
}

/** Aktuelle Seite als Startseite des Panels festlegen. */
export function setHome(ws: Workspace, id: string): Workspace {
  return mapPanel(ws, id, (p) => (p.url ? { ...p, home: p.url } : p));
}

/**
 * True, wenn die Adresse E-Source selbst ist (würde sich endlos verschachteln).
 * `base` ist die Adresse der App, z. B. https://schulzenrico.github.io/e-sources/ (F-120):
 * Das Portfolio unter derselben Domain ist dann nicht E-Source.
 */
export function isSelfUrl(url: string, base: string): boolean {
  try {
    const u = new URL(url);
    const b = new URL(base);
    const path = b.pathname.endsWith('/') ? b.pathname : `${b.pathname}/`;
    return u.origin === b.origin && `${u.pathname.replace(/\/$/, '')}/`.startsWith(path);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- F-08 Stapel

export function setStackFront(ws: Workspace, setup: ScreenSetup, id: string): Workspace {
  return { ...ws, stackFront: { ...ws.stackFront, [layoutKey(setup)]: id } };
}

/** Wechselt im Stapel um `step` Panels weiter (−1 = zurück); am Ende geht es vorne weiter. */
export function stepStack(ws: Workspace, setup: ScreenSetup, step: number): Workspace {
  const v = viewOf(ws, setup);
  if (v.stack.length < 2 || !v.front) return ws;
  const i = v.stack.findIndex((p) => p.id === v.front!.id);
  const next = v.stack[(i + step + v.stack.length) % v.stack.length];
  return setStackFront(ws, setup, next.id);
}

// ---------------------------------------------------------------- F-11, F-12

/**
 * Zwei Panels tauschen (Knopf ⇄). Liegt eines davon im Stapel, wechselt das andere in den
 * Stapel und wird dort angezeigt.
 */
export function swapPanels(ws: Workspace, setup: ScreenSetup, a: string, b: string): Workspace {
  const v = viewOf(ws, setup);
  const sa = slotOf(v, a);
  const sb = slotOf(v, b);
  if (!v.tree || !sa || !sb || a === b || (sa === STACK_ID && sb === STACK_ID)) return ws;
  if (sa !== STACK_ID && sb !== STACK_ID) return commit(ws, v.key, T.swapLeaves(v.tree, a, b));
  const [onArea, inStack] = sa === STACK_ID ? [b, a] : [a, b];
  const tree = T.replaceLeaf(v.tree, onArea, inStack);
  return { ...commit(ws, v.key, tree), stackFront: { ...ws.stackFront, [v.key]: onArea } };
}

/** Ziehen & Ablegen eines Platzes (Panel oder Stapel): Mitte = tauschen, Rand = andocken. */
export function dropSlot(ws: Workspace, setup: ScreenSetup, id: string, target: string, zone: T.Zone): Workspace {
  return change(ws, setup, (tree) => T.drop(tree, id, target, zone));
}

/** Übernimmt eine fertige Anordnung, z. B. nach dem Ziehen einer Kante. */
export function setLayout(ws: Workspace, setup: ScreenSetup, tree: T.Node): Workspace {
  return change(ws, setup, () => tree);
}

/** F-12: Voreingestellte Größe als Anteil von Breite und Höhe der Arbeitsfläche. */
export function setPanelSize(ws: Workspace, setup: ScreenSetup, id: string, wf: number, hf: number, min = DEFAULT_MIN): Workspace {
  return change(ws, setup, (tree, v) => {
    const slot = slotOf(v, id);
    return slot ? T.setLeafSize(tree, slot, wf, hf, min) : null;
  });
}

// ---------------------------------------------------------------- F-05

/** Alle Anteile gleich groß; die Anordnung bleibt. */
export function distribute(ws: Workspace, setup: ScreenSetup): Workspace {
  return change(ws, setup, (tree) => T.equalize(tree));
}

export function savePreferred(ws: Workspace, setup: ScreenSetup): Workspace {
  const v = viewOf(ws, setup);
  if (!v.tree) return ws;
  return { ...ws, preferred: { ...ws.preferred, [v.key]: v.tree } };
}

export function clearPreferred(ws: Workspace, setup: ScreenSetup): Workspace {
  const preferred = { ...ws.preferred };
  delete preferred[layoutKey(setup)];
  return { ...ws, preferred };
}

/**
 * Ganze Anordnung zurücksetzen: auf die Wunsch-Anordnung, sonst auf die Standard-Verteilung.
 * Es werden keine Panels gelöscht; neu dazugekommene landen im Stapel oder auf einem freien Platz.
 */
export function resetLayout(ws: Workspace, setup: ScreenSetup): Workspace {
  const key = layoutKey(setup);
  const pref = ws.preferred[key];
  return commit(ws, key, pref ? normalize(ws.panels, pref, specOf(setup)) : null);
}

/** Einzelnes Panel zurücksetzen: auf seine Größe in der Wunsch-Anordnung, sonst auf Platzgröße. */
export function resetPanel(ws: Workspace, setup: ScreenSetup, id: string, min = DEFAULT_MIN): Workspace {
  const pref = ws.preferred[layoutKey(setup)];
  return change(ws, setup, (tree, v) => {
    const slot = slotOf(v, id);
    if (!slot) return null;
    const target = (pref && T.isNode(pref) && T.rects(pref).get(slot)) || slotSize(v.spec);
    return T.setLeafSize(tree, slot, target.w, target.h, min);
  });
}

/** F-13: Splitscreen – das aktive und die folgenden Plätze in Lesereihenfolge. */
export function splitSelection(view: View, activeSlot: string | null, count: number): string[] {
  const ordered = T.readingOrder(view.tree);
  if (ordered.length <= count) return ordered;
  const start = Math.max(0, ordered.indexOf(activeSlot ?? ''));
  return Array.from({ length: count }, (_, k) => ordered[(start + k) % ordered.length]);
}
