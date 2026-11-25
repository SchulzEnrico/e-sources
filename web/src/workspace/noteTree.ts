/**
 * F-210 Schritt 4 (V90): Notizen-Modus als Baum – Entscheidungen F1–F5 (Claude Doc „F-210 V89 –
 * Lageplan, freie Anordnung im Notizen-Modus, Boards auf dem Desk (BL4)“).
 *
 * F1 Pads liegen im Notizen-Modus lückenlos in einem Teilungsbaum wie Slots (Grenzen ziehen, Kopf
 *    ziehen = andocken/tauschen, Alt + Pfeil = mit Nachbar tauschen, Alt + Umschalt + Pfeil = Grenze).
 * F2 Startbaum = das bisherige Raster (`noteTiles`).
 * F3 Neues Pad ohne Plan rechts neben das aktive Pad (zu klein → Hälfte des größten Pads).
 * F4 Pad schließen: Nachbarn rücken nach. Der Baum behält das geschlossene Blatt, bis er sich das
 *    nächste Mal ändert – so kommt das Pad mit „Rückgängig“ genau an seinen alten Platz zurück.
 * F5 Vollbild je Pad bleibt (nur Anzeige, ändert den Baum nicht).
 *
 * Seit V91 (Schritt 5) liegt der Baum im aktiven Notizen-Layout, je Bildschirm-Einstellung
 * (notesLayouts.ts, abgeglichen); vorher je Desk und Gerät in `padDesks[desk].notes`. Alles hier ist rein.
 */
import * as T from './tree';
import type { Workspace } from './types';
import { noteTreeFor, setNoteTreeFor } from './notesLayouts';
import { type PlanSide, type PlanTile, neighbour } from './sitePlan';

/** Gespeicherter Baum des Desks für diese Einstellung (kann geschlossene Pads noch enthalten, siehe F4). */
export const noteTreeOf = (ws: Workspace, desk: string, key: string): T.Node | undefined => noteTreeFor(ws, desk, key);

/** F2: Startbaum wie das Raster – ⌈√n⌉ Spalten, Reihen übereinander, die letzte Reihe breiter. */
export function gridTree(ids: readonly string[]): T.Node | null {
  const n = ids.length;
  if (!n) return null;
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const lines: T.Node[] = [];
  for (let r = 0; r < rows; r++) {
    const part = ids.slice(r * cols, r * cols + cols);
    lines.push(part.length === 1 ? { id: part[0] } : { dir: 'row', children: part.map((id) => ({ id })), sizes: part.map(() => 1 / part.length) });
  }
  return lines.length === 1 ? lines[0] : { dir: 'col', children: lines, sizes: lines.map(() => 1 / lines.length) };
}

/** Nur die Blätter behalten, die es noch gibt (Nachbarn rücken nach). */
export function prune(tree: T.Node | null | undefined, ids: readonly string[]): T.Node | null {
  let t: T.Node | null = tree ?? null;
  const keep = new Set(ids);
  for (const id of T.leaves(t)) if (t && !keep.has(id)) t = T.removeLeaf(t, id);
  return t;
}

/** Passt ein Blatt noch (Mindestgröße als Anteil der Fläche)? */
const fits = (t: T.Node, ids: readonly string[], min: T.Min) => {
  const r = T.rects(t);
  return ids.every((id) => {
    const x = r.get(id);
    return !!x && x.w + 1e-9 >= min.w && x.h + 1e-9 >= min.h;
  });
};

/**
 * F3: neues Pad rechts neben `near` (halbiert es); wird eines der beiden zu klein, bekommt es die
 * Hälfte des größten Pads (an dessen längerer Seite, wie neue Slots).
 */
export function placeNew(tree: T.Node | null, id: string, opts: { near?: string; min: T.Min; aspect: number }): T.Node {
  if (!tree) return { id };
  if (T.hasLeaf(tree, id)) return tree;
  const near = opts.near && T.hasLeaf(tree, opts.near) ? opts.near : null;
  if (near) {
    const t = T.insertAt(tree, near, id, 'right');
    if (fits(t, [near, id], opts.min)) return t;
  }
  return T.addToLargest(tree, id, opts.aspect);
}

/**
 * Anzeige-Baum: gespeicherter Baum ohne geschlossene Pads, fehlende Pads ergänzt (F3).
 * Ohne gespeicherten Baum = Raster (F2). `added` = es kamen Pads dazu (dann speichern).
 */
export function syncNoteTree(
  stored: T.Node | null | undefined,
  ids: readonly string[],
  opts: { near?: string; min: T.Min; aspect: number },
): { tree: T.Node | null; added: boolean } {
  if (!stored) return { tree: gridTree(ids), added: ids.length > 0 };
  let t = prune(stored, ids);
  let added = false;
  for (const id of ids) {
    if (t && T.hasLeaf(t, id)) continue;
    t = placeNew(t, id, opts);
    added = true;
  }
  return { tree: t, added };
}

/** Baum des Desks für diese Einstellung setzen (`null` entfernt ihn). */
export function setNoteTree(ws: Workspace, desk: string, tree: T.Node | null, key: string): Workspace {
  return setNoteTreeFor(ws, desk, key, tree);
}

/** Kacheln für Lageplan und Nachbarsuche. */
export function noteTilesOf(tree: T.Node | null, name: (id: string) => string): PlanTile[] {
  return T.readingOrder(tree).map((id) => ({ id, name: name(id), rect: T.rects(tree).get(id)! }));
}

/** F1: Alt + Pfeil – mit dem Nachbarn in dieser Richtung tauschen (Platz und Größe). */
export function swapToward(tree: T.Node, id: string, dir: PlanSide): { tree: T.Node; with: string } | null {
  const other = neighbour(noteTilesOf(tree, (x) => x), id, dir);
  if (!other) return null;
  return { tree: T.swapLeaves(tree, id, other), with: other };
}

/**
 * F1/F3 (Lageplan „Platz wählen …“ im Notizen-Modus): Pad `id` an eine Stelle legen.
 * Seite einer Kachel = daneben andocken (halbiert sie), `null` = am Desk-Rand über die ganze
 * Fläche, Mitte = mit dieser Kachel tauschen.
 */
export function moveInTree(tree: T.Node, id: string, target: string | null, zone: PlanSide | 'full'): T.Node {
  if (!T.hasLeaf(tree, id)) return tree;
  if (!target) return zone === 'full' ? tree : T.dockArea(tree, id, zone);
  return T.drop(tree, id, target, zone === 'full' ? 'center' : zone);
}

/** Neues Pad an einer Stelle im Baum (Mitte wird als Reiter behandelt und gehört nicht hierher). */
export function addInTree(tree: T.Node | null, id: string, target: string | null, side: PlanSide): T.Node {
  if (!tree) return { id };
  if (!target || !T.hasLeaf(tree, target)) return T.addAtSide(tree, id, side);
  return T.insertAt(tree, target, id, side);
}

/** F1: „Gleich verteilen“ – alle Pads gleich groß (Anteile je Teilung gleich). */
export const equalNotes = (tree: T.Node): T.Node => T.equalize(tree);
