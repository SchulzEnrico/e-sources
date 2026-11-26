/**
 * V120 (F-230 Nächste Schritte 5, F-231): Kanban im Projekt-Modus – Rad „Ansicht“ › Kanban zeigt das Kanban-Sheet
 * des Projekts (Besitzer = Projekt, wie nach einem Trello-Import). Gibt es noch keins, legt `makeProjectBoard` eines an
 * und legt die Vorgänge des Projekts als Karten in die Spalte, die zu ihrem Zustand passt (wie „Verschieben nach …“).
 * Karten, die neu auf einem Projekt-Kanban entstehen, gehören zum Projekt (`addTask` in sheets.ts).
 * Alles hier ist rein.
 */
import type { Note, NoteView, Workspace } from './types';
import { createView, notesOf, viewsOf } from './notes';
import { flowsOf, moveToSheet } from './sheets';
import { projectById } from './projects';
import { cardsOf } from './trello';

/** Kanban-Sheets des Projekts (Besitzer = Projekt), in der Reihenfolge der Library. */
export function projectBoards(ws: Workspace, pid: string): NoteView[] {
  return viewsOf(ws).filter((v) => v.kind === 'kanban' && v.owner?.kind === 'project' && v.owner.id === pid);
}

/** Vorgänge, die Karten werden: ohne Unter-Vorgänge, nicht archiviert, nicht schon auf einem anderen Kanban. */
export function boardCandidates(ws: Workspace, pid: string): { cards: Note[]; elsewhere: Note[] } {
  const { cards } = cardsOf(ws, pid);
  const open = cards.filter((n) => n.state !== 'archived');
  const elsewhere = open.filter((n) => flowsOf(ws, n.id).some((v) => v.kind === 'kanban'));
  return { cards: open.filter((n) => !elsewhere.includes(n)), elsewhere };
}

export type MadeBoard = { ws: Workspace; id: string; cards: number; elsewhere: number };

/** Kanban-Sheet für das Projekt anlegen (Name = Projektname) und die Vorgänge einsortieren. */
export function makeProjectBoard(ws: Workspace, pid: string, opts: { id?: string; makeId?: () => string; by?: string; now?: number } = {}): MadeBoard | null {
  const p = projectById(ws, pid);
  if (!p) return null;
  const made = createView(ws, 'kanban', p.name, { id: opts.id, makeId: opts.makeId });
  let next: Workspace = { ...made.ws, noteViews: viewsOf(made.ws).map((v) => (v.id === made.id ? { ...v, owner: { kind: 'project', id: pid } } : v)) };
  const { cards, elsewhere } = boardCandidates(ws, pid);
  // Reihenfolge wie in der Library (Gliederung)
  const order = new Map(notesOf(ws).map((n, i) => [n.id, i]));
  let placed = 0;
  for (const n of [...cards].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))) {
    const r = moveToSheet(next, n.id, '', made.id, { by: opts.by, now: opts.now });
    if (r.ok) {
      next = r.ws;
      placed++;
    }
  }
  return { ws: next, id: made.id, cards: placed, elsewhere: elsewhere.length };
}
