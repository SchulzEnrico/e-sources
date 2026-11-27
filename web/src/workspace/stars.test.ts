import { describe, expect, it } from 'vitest';
import type { Workspace } from './types';
import * as No from './notes';
import * as Sh from './sheets';
import * as Pd from './pads';
import * as W from './workspace';
import * as Mi from './mirrors';
import * as Sr from './stars';
import * as St from './storage';
import { reducer } from './useWorkspace';
import { PAD_SHEETS_MAX } from './noteObjects';

const setup = () => {
  let ws: Workspace = W.defaultWorkspace();
  ws = No.createView(ws, 'kanban', 'Zeta', { id: 'kz' }).ws;
  ws = No.createView(ws, 'kanban', 'Alpha', { id: 'ka' }).ws;
  ws = No.createView(ws, 'kanban', 'Mitte', { id: 'km' }).ws;
  ws = No.createView(ws, 'todo', 'Liste', { id: 'td' }).ws;
  return ws;
};

describe('V128 F-231 K12 Stern für Sheets', () => {
  it('setzt und entfernt den Stern; Liste nach Namen, ohne Ausnahmen', () => {
    let ws = reducer(setup(), { type: 'sheetStar', view: 'kz', on: true });
    ws = reducer(ws, { type: 'sheetStar', view: 'td', on: true });
    expect(Sr.isStarred(No.viewById(ws, 'kz'))).toBe(true);
    expect(Sr.starredViews(ws).map((v) => v.id)).toEqual(['td', 'kz']);
    expect(Sr.starredViews(ws, ['td']).map((v) => v.id)).toEqual(['kz']);
    ws = reducer(ws, { type: 'sheetStar', view: 'kz', on: false });
    expect(No.viewById(ws, 'kz')!.star).toBeUndefined();
    expect(reducer(ws, { type: 'sheetStar', view: 'gibtsnicht', on: true })).toBe(ws);
  });

  it('Ziel-Listen (Verschieben, Kopieren, Spiegeln) zeigen Sterne zuerst, sonst wie bisher', () => {
    const plain = Sh.moveTargets(setup(), 'td').map((v) => v.id);
    const ws = Sr.setStar(setup(), 'km', true);
    const ids = Sh.moveTargets(ws, 'td').map((v) => v.id);
    expect(ids[0]).toBe('km');
    expect(ids.slice(1)).toEqual(plain.filter((x) => x !== 'km'));
    const c = No.createNote(ws, { title: 'Karte' });
    const r = Sh.moveCard(c.ws, 'kz', c.id, No.viewById(c.ws, 'kz')!.cols![0].id);
    if (!r.ok) throw new Error('setup');
    expect(Mi.mirrorTargets(r.ws, 'kz', c.id).map((v) => v.id)[0]).toBe('km');
  });

  it('bleibt beim Speichern und Laden; falscher Wert wird nicht übernommen', () => {
    const ws = Sr.setStar(setup(), 'ka', true);
    const back = St.parseWorkspace(JSON.parse(JSON.stringify(ws)))!;
    expect(No.viewById(back, 'ka')!.star).toBe(true);
    const bad = JSON.parse(JSON.stringify(ws));
    bad.noteViews.find((v: { id: string }) => v.id === 'kz').star = 'ja';
    expect(No.viewById(St.parseWorkspace(bad)!, 'kz')!.star).toBeUndefined();
  });

  it('„Mit Stern …“ öffnet im Pad, wechselt zu einem offenen Pad oder nimmt ein neues Pad, wenn es voll ist', () => {
    let ws = setup();
    const p = Pd.createPad(ws, '', ['td'], { id: 'p1' });
    ws = p.ws;
    let r = Sr.openStarred(ws, 'p1', 'ka', () => 'x');
    expect(r.result).toBe('opened');
    expect(Pd.padById(r.ws, 'p1')!.sheets).toEqual(['td', 'ka']);
    expect(Pd.padById(r.ws, 'p1')!.active).toBe('ka');
    const q = Pd.createPad(r.ws, '', ['km'], { id: 'p2' });
    r = Sr.openStarred(q.ws, 'p1', 'km', () => 'x');
    expect(r.result).toBe('shown');
    expect(r.result !== 'missing' && r.pad).toBe('p2');
    expect(Pd.padById(r.ws, 'p1')!.sheets).toEqual(['td', 'ka']);
    // voll → neues Pad
    let full = q.ws;
    for (let i = 0; i < PAD_SHEETS_MAX; i++) full = No.createView(full, 'block', `B${i}`, { id: `b${i}` }).ws;
    full = Pd.createPad(full, '', Array.from({ length: PAD_SHEETS_MAX }, (_x, i) => `b${i}`), { id: 'p3' }).ws;
    r = Sr.openStarred(full, 'p3', 'kz', () => 'p4');
    expect(r.result).toBe('full');
    expect(Pd.padById(r.ws, 'p4')!.sheets).toEqual(['kz']);
    expect(Sr.openStarred(full, 'p3', 'gibtsnicht', () => 'p5').result).toBe('missing');
    // über den Reducer
    const viaR = reducer(ws, { type: 'padStarOpen', id: 'p1', sheet: 'kz', ids: ['n1'] });
    expect(Pd.padById(viaR, 'p1')!.sheets).toContain('kz');
  });
});
