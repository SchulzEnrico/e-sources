import { describe, expect, it } from 'vitest';
import type { Workspace } from './types';
import * as No from './notes';
import * as Sh from './sheets';
import * as W from './workspace';
import * as In from './inbox';
import { addProject } from './projects';
import { reducer } from './useWorkspace';

const base = (): Workspace => {
  let ws: Workspace = In.ensureInbox(W.defaultWorkspace());
  ws = No.createView(ws, 'todo', 'Liste', { id: 'td' }).ws;
  ws = No.createView(ws, 'eisenhower', 'Meine Matrix', { id: 'em' }).ws;
  return ws;
};

describe('V141 F-231 K14 Eingang', () => {
  it('gibt es genau einmal, vorn, mit Stern; nicht löschbar, umbenennbar (I2)', () => {
    const ws = base();
    expect(No.viewsOf(ws)[0].id).toBe(In.INBOX_ID);
    expect(In.inboxOf(ws)!.star).toBe(true);
    expect(In.ensureInbox(ws)).toBe(ws);
    expect(No.viewsOf(In.ensureInbox(In.ensureInbox(ws))).filter((v) => v.id === In.INBOX_ID).length).toBe(1);
    expect(No.deleteView(ws, In.INBOX_ID)).toBeNull();
    const r = reducer(ws, { type: 'padRenameSheet', sheet: In.INBOX_ID, name: 'Post' });
    expect(In.inboxOf(r)!.name).toBe('Post');
    expect(reducer(ws, { type: 'replace', ws: W.defaultWorkspace() }).noteViews?.some((v) => v.id === In.INBOX_ID)).toBe(true);
  });

  it('Gedankenparkplatz: erste Zeile Titel, Rest Text, via „quick“; Zähler ohne Erledigte (I4, I6, I8)', () => {
    let ws = reducer(base(), { type: 'inboxCapture', text: 'Anruf Maik\nWegen Zeugnis', note: 'n1' });
    const n = No.noteById(ws, 'n1')!;
    expect(n.title).toBe('Anruf Maik');
    expect(n.text).toBe('Wegen Zeugnis');
    expect(n.origin?.via).toBe('quick');
    expect(In.inboxOf(ws)!.ids).toEqual(['n1']);
    expect(In.inboxCount(ws)).toBe(1);
    expect(reducer(ws, { type: 'inboxCapture', text: '   \n ', note: 'n2' })).toBe(ws);
    ws = No.setState(ws, 'n1', 'done');
    expect(In.inboxCount(ws)).toBe(0);
    ws = reducer(ws, { type: 'inboxDrop', note: 'n1' });
    expect(No.noteById(ws, 'n1')).toBeUndefined();
  });

  it('„Neue Notiz“ im Portal und Dock-Notiz landen zusätzlich im Eingang, „+“ im Sheet nicht (I3)', () => {
    let ws = base();
    ws = reducer(ws, { type: 'padNew', desk: '', id: 'pd', sheet: 'blk' });
    const sheet = ws.pads?.find((p) => p.id === 'pd')?.active ?? 'blk';
    const a = reducer(ws, { type: 'padNote', id: 'pd', sheet, note: 'k1', inbox: true });
    expect(In.inboxOf(a)!.ids).toContain('k1');
    expect(No.viewById(a, sheet)!.ids).toContain('k1');
    const b = reducer(ws, { type: 'padNote', id: 'pd', sheet, note: 'k2' });
    expect(In.inboxOf(b)!.ids).not.toContain('k2');
    // leere Notiz aus einem Tab wird trotz Eingang still verworfen
    const made = No.createNote(ws, {}, { id: 'leer' });
    const c = In.toInbox(made.ws, 'leer');
    expect(No.noteById(No.dropIfEmpty(c, 'leer'), 'leer')).toBeUndefined();
  });

  it('V sortiert ein: Sheets und Eisenhower-Matrizen (verschiebt), Projekt mit Rückgängig (I5)', () => {
    let ws = reducer(base(), { type: 'inboxCapture', text: 'Idee', note: 'n1' });
    const t = Sh.moveTargets(ws, In.INBOX_ID).map((v) => v.id);
    expect(t).toContain('em');
    expect(t).toContain('td');
    expect(Sh.moveTargets(ws, 'td').map((v) => v.id)).not.toContain('em');
    const m = reducer(ws, { type: 'sheetMoveTo', note: 'n1', from: In.INBOX_ID, to: 'em' });
    expect(No.viewById(m, 'em')!.ids).toEqual(['n1']);
    expect(In.inboxOf(m)!.ids).toEqual([]);
    const pj = addProject(ws, 'Umzug')!;
    ws = pj.ws;
    expect(In.inboxProjects(ws).map((p) => p.id)).toContain(pj.id);
    const p = reducer(ws, { type: 'inboxToProject', note: 'n1', project: pj.id });
    expect(No.noteById(p, 'n1')!.project).toBe(pj.id);
    expect(In.inboxOf(p)!.ids).toEqual([]);
    const back = reducer(p, { type: 'inboxFromProject', note: 'n1' });
    expect(No.noteById(back, 'n1')!.project).toBeUndefined();
    expect(In.inboxOf(back)!.ids).toEqual(['n1']);
  });
});
