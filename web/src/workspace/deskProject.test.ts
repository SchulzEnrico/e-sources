import { describe, expect, it } from 'vitest';
import type { Workspace } from './types';
import * as Dp from './deskProject';
import * as Pj from './projects';
import * as No from './notes';
import * as W from './workspace';
import { lookOf } from './look';
import { parseWorkspace } from './storage';
import { syncWindows } from './windows';

const base = (): Workspace => {
  let ws = W.defaultWorkspace();
  ws = { ...ws, windows: [{ id: 'd2', name: 'Desk 2' }], panels: [...ws.panels, { ...W.newPanel('X'), win: 'd2' }] };
  ws = Pj.addProject(ws, 'Alpha')!.ws;
  ws = Pj.addProject(ws, 'Beta')!.ws;
  return ws;
};
const ids = (ws: Workspace) => (ws.projects ?? []).map((p) => p.id);

describe('F-206 Schritt 10 Projekt-Desk (V117, PD1–PD10)', () => {
  it('binden, umbinden, lösen; mehrere Desks je Projekt (PD1, PD7)', () => {
    let ws = base();
    const [a, b] = ids(ws);
    ws = Dp.bindDesk(ws, 'd2', a);
    expect(Dp.boundProject(ws, 'd2')).toBe(a);
    ws = Dp.bindDesk(ws, '', a);
    expect(Dp.desksOf(ws, a).sort()).toEqual(['', 'd2']);
    ws = Dp.bindDesk(ws, 'd2', b);
    expect(Dp.boundProject(ws, 'd2')).toBe(b);
    expect(Dp.bindDesk(ws, 'd2', 'gibtsnicht')).toBe(ws);
    ws = Dp.unbindDesk(Dp.unbindDesk(ws, 'd2'), '');
    expect(ws.deskProjects).toBeUndefined();
  });

  it('Zuordnen abschaltbar, bleibt beim Umbinden (PD4)', () => {
    let ws = base();
    const [a, b] = ids(ws);
    ws = Dp.setAssign(Dp.bindDesk(ws, 'd2', a), 'd2', false);
    expect(ws.deskProjects!.d2).toEqual({ project: a, assign: false });
    ws = Dp.bindDesk(ws, 'd2', b);
    expect(ws.deskProjects!.d2).toEqual({ project: b, assign: false });
    expect(Dp.setAssign(ws, 'd2', true).deskProjects!.d2).toEqual({ project: b });
  });

  it('Projekt entfernt → Desk bleibt und wird gelöst, Rückgängig bindet wieder (PD6)', () => {
    let ws = base();
    const [a] = ids(ws);
    ws = Dp.bindDesk(ws, 'd2', a);
    const r = Pj.removeProject(ws, a)!;
    expect(r.ws.deskProjects).toBeUndefined();
    expect(r.ws.windows.map((w) => w.id)).toEqual(['d2']);
    expect(Dp.boundProject(Pj.undoRemoveProject(r.ws, r.undo), 'd2')).toBe(a);
  });

  it('zuletzt gezeigt, sonst gebunden (PD9)', () => {
    let ws = base();
    const [a, b] = ids(ws);
    expect(Dp.shownOn(ws, 'd2', {})).toBeUndefined();
    ws = Dp.bindDesk(ws, 'd2', a);
    expect(Dp.shownOn(ws, 'd2', {})).toBe(a);
    expect(Dp.shownOn(ws, 'd2', { d2: b })).toBe(b);
    expect(Dp.shownOn(ws, 'd2', { d2: 'weg' })).toBe(a);
  });

  it('neue Notizen bekommen das gezeigte Projekt, Begrenzung (PD4, PD5)', () => {
    let ws = base();
    const [a, b] = ids(ws);
    try {
      Dp.setDeskScope({ project: b });
      const r = No.createNote(ws, { title: 'x' });
      expect(No.notesOf(r.ws).find((n) => n.id === r.id)!.project).toBe(b);
      expect(No.notesOf(No.createNote(ws, { project: a }).ws).at(-1)!.project).toBe(a);
      expect(Dp.scopeProject()).toBe(b);
      expect(Dp.inScope({ project: a })).toBe(false);
      Dp.setDeskScope({ project: b, assign: false, all: true });
      expect(No.notesOf(No.createNote(ws, {}).ws).at(-1)!.project).toBeUndefined();
      expect(Dp.scopeProject()).toBeUndefined();
    } finally {
      Dp.setDeskScope({});
    }
    ws = No.createNote(ws, {}).ws;
    expect(No.notesOf(ws).at(-1)!.project).toBeUndefined();
  });

  it('Farbe des Projekts wird Akzentfarbe des Desks; Speichern und Laden; Desk weg → Bindung weg', () => {
    let ws = base();
    const [a] = ids(ws);
    ws = Pj.editProject(ws, a, { accent: '#64A970' });
    ws = Dp.bindDesk(ws, 'd2', a);
    expect(lookOf(ws, 'd2').accent).toBe('#64a970');
    expect(lookOf(ws, '').accent).toBe(ws.look.accent);
    const back = parseWorkspace(JSON.parse(JSON.stringify(ws)))!;
    expect(back.deskProjects).toEqual({ d2: { project: a } });
    expect(back.projects!.find((p) => p.id === a)!.accent).toBe('#64a970');
    const gone = syncWindows({ ...ws, panels: ws.panels.filter((p) => p.win !== 'd2') });
    expect(gone.deskProjects).toBeUndefined();
  });
});
