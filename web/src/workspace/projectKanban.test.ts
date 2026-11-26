import { describe, expect, it } from 'vitest';
import type { Workspace } from './types';
import * as Pj from './projects';
import * as No from './notes';
import * as Sh from './sheets';
import * as W from './workspace';
import * as Pk from './projectKanban';

const setup = () => {
  let ws: Workspace = W.defaultWorkspace();
  const made = Pj.addProject(ws, 'Alpha')!;
  ws = made.ws;
  const pid = made.id;
  const mk = (title: string, state: Parameters<typeof No.setState>[2], extra: Partial<Parameters<typeof No.createNote>[1]> = {}) => {
    const c = No.createNote(ws, { title, project: pid, ...extra });
    ws = state === 'open' ? c.ws : No.setState(c.ws, c.id, state);
    return c.id;
  };
  const a = mk('A offen', 'open');
  const b = mk('B in Arbeit', 'doing');
  const c = mk('C erledigt', 'done');
  const g = mk('G Gruppe', 'open');
  const u = mk('U Unter', 'open', { parent: g });
  const x = mk('X archiviert', 'archived');
  return { ws, pid, a, b, c, g, u, x };
};

describe('V120 Kanban im Projekt-Modus (F-230 Schritt 5, F-231)', () => {
  it('legt ein Projekt-Kanban an und sortiert Vorgänge nach Zustand ein', () => {
    const s = setup();
    expect(Pk.projectBoards(s.ws, s.pid)).toEqual([]);
    const r = Pk.makeProjectBoard(s.ws, s.pid, { id: 'kb' })!;
    const boards = Pk.projectBoards(r.ws, s.pid);
    expect(boards.map((v) => v.id)).toEqual(['kb']);
    expect(boards[0].name).toBe('Alpha');
    expect(r.cards).toBe(4); // A, B, C, U – ohne Gruppe G und Archiv X
    const col = (id: string) => Sh.colStateOf(boards[0].cols!.find((c) => c.ids.includes(id))!);
    expect(col(s.a)).toBe('open');
    expect(col(s.b)).toBe('doing');
    expect(col(s.c)).toBe('done');
    expect(col(s.u)).toBe('open');
    expect(boards[0].cols!.some((c) => c.ids.includes(s.g) || c.ids.includes(s.x))).toBe(false);
    expect(No.noteById(r.ws, s.b)!.state).toBe('doing');
  });
  it('neue Karte auf dem Projekt-Kanban gehört zum Projekt', () => {
    const s = setup();
    const r = Pk.makeProjectBoard(s.ws, s.pid, { id: 'kb' })!;
    const t = Sh.addTask(r.ws, 'kb', 'Neu', { id: 'n1' })!;
    expect(No.noteById(t.ws, 'n1')!.project).toBe(s.pid);
    const plain = No.createView(t.ws, 'kanban', 'Frei', { id: 'free' });
    const t2 = Sh.addTask(plain.ws, 'free', 'Ohne', { id: 'n2' })!;
    expect(No.noteById(t2.ws, 'n2')!.project).toBeUndefined();
  });
  it('Vorgänge auf einem anderen Kanban bleiben dort und werden gezählt', () => {
    const s = setup();
    const other = No.createView(s.ws, 'kanban', 'Anderes', { id: 'o' });
    const moved = Sh.moveToSheet(other.ws, s.a, '', 'o');
    expect(moved.ok).toBe(true);
    const r = Pk.makeProjectBoard((moved as { ws: Workspace }).ws, s.pid, { id: 'kb' })!;
    expect(r.elsewhere).toBe(1);
    expect(r.cards).toBe(3);
    expect(Pk.makeProjectBoard(s.ws, 'gibtsnicht')).toBeNull();
  });
});
