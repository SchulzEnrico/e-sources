/**
 * V111 (Enrico: „Auch fehlt ein Tastenkürzel Commando zurück, wenn man ein Pad oder Panel versehentlich verschoben hat“):
 * Rückgängig für Anordnungen – Portale/Slots (Kante ziehen, tauschen, andocken, gleich verteilen, Größe), Pads auf dem
 * Desk (Platz und Größe) und der Notizen-Modus (Baum der Pads). Vor jeder solchen Aktion merkt sich E-Sources die
 * betroffenen Teile des Arbeitsbereichs; Strg/⌘+Z stellt den letzten Stand wieder her (bis zu UNDO_MAX Schritte).
 * Nur Anordnung – Inhalte (Notizen, Tabs, Sources) fasst das nicht an.
 */
import type { Workspace } from './types';

export const UNDO_MAX = 30;
/** Aktionen, die nur die Anordnung ändern. */
export const LAYOUT_ACTIONS: ReadonlySet<string> = new Set(['setLayout', 'swap', 'drop', 'setSize', 'resetPanel', 'distribute', 'padPlace', 'noteTree']);

export interface LayoutSnap {
  layouts: Workspace['layouts'];
  padDesks: Workspace['padDesks'];
  /** je Desk nur die Anordnung des Notizen-Modus (board) */
  boards: Record<string, unknown>;
}

export function layoutSnap(ws: Workspace): LayoutSnap {
  const boards: Record<string, unknown> = {};
  for (const [desk, dn] of Object.entries(ws.deskNotes ?? {})) if (dn && 'board' in dn) boards[desk] = (dn as { board?: unknown }).board;
  return { layouts: ws.layouts, padDesks: ws.padDesks, boards };
}

/** Gleicher Stand? (dann gibt es nichts rückgängig zu machen) */
export const sameLayout = (ws: Workspace, s: LayoutSnap): boolean => JSON.stringify(layoutSnap(ws)) === JSON.stringify(s);

/** Stellt die Anordnung wieder her; Inhalte bleiben, wie sie sind. */
export function restoreLayout(ws: Workspace, s: LayoutSnap): Workspace {
  const deskNotes = { ...(ws.deskNotes ?? {}) } as Record<string, Record<string, unknown>>;
  for (const desk of new Set([...Object.keys(deskNotes), ...Object.keys(s.boards)])) {
    const dn = { ...(deskNotes[desk] ?? {}) };
    if (desk in s.boards) dn.board = s.boards[desk];
    else delete dn.board;
    deskNotes[desk] = dn;
  }
  const out = { ...ws, layouts: s.layouts, deskNotes: deskNotes as Workspace['deskNotes'] } as Workspace;
  if (s.padDesks) out.padDesks = s.padDesks;
  else delete out.padDesks;
  return out;
}

/** Merkliste: vorne der älteste Stand. Gleiche Stände hintereinander zählen einmal. */
export function pushSnap(list: readonly LayoutSnap[], s: LayoutSnap): LayoutSnap[] {
  const last = list[list.length - 1];
  if (last && JSON.stringify(last) === JSON.stringify(s)) return [...list];
  return [...list, s].slice(-UNDO_MAX);
}

/** Letzten Stand nehmen, der sich vom jetzigen unterscheidet (Aktionen ohne Wirkung überspringen). */
export function popSnap(ws: Workspace, list: readonly LayoutSnap[]): { snap: LayoutSnap; rest: LayoutSnap[] } | null {
  const rest = [...list];
  while (rest.length) {
    const snap = rest.pop()!;
    if (!sameLayout(ws, snap)) return { snap, rest };
  }
  return null;
}
