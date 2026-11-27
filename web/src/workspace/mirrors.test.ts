import { describe, expect, it } from 'vitest';
import type { Workspace } from './types';
import * as No from './notes';
import * as Sh from './sheets';
import * as W from './workspace';
import * as Mi from './mirrors';
import * as KM from './kanbanMore';
import * as T from './trello';
import * as St from './storage';
import { reducer } from './useWorkspace';

const cs = Sh.colStateOf;
/** Zwei Boards A (Heimat) und B, Karte in A in der ersten Spalte. */
const setup = () => {
  let ws: Workspace = W.defaultWorkspace();
  ws = No.createView(ws, 'kanban', 'Board A', { id: 'ka' }).ws;
  ws = No.createView(ws, 'kanban', 'Board B', { id: 'kb' }).ws;
  ws = No.createView(ws, 'kanban', 'Board C', { id: 'kc' }).ws;
  ws = No.createView(ws, 'todo', 'Liste', { id: 'td' }).ws;
  const c = No.createNote(ws, { title: 'Karte' });
  const a = No.viewById(c.ws, 'ka')!.cols!;
  const r = Sh.moveCard(c.ws, 'ka', c.id, a[0].id);
  if (!r.ok) throw new Error('setup');
  return { ws: r.ws, id: c.id, a, b: No.viewById(r.ws, 'kb')!.cols! };
};
const doneCol = (ws: Workspace, v: string) => No.viewById(ws, v)!.cols!.find((c) => cs(c) === 'done')!;
const colIn = (ws: Workspace, v: string, id: string) => Sh.colOf(No.viewById(ws, v)!, id)?.id;

describe('V127 F-231 K9 Spiegelkarten', () => {
  it('spiegelt dieselbe Notiz auf ein anderes Board; Heimat bleibt, Zustand bleibt', () => {
    const s = setup();
    expect(Mi.mirrorTargets(s.ws, 'ka', s.id).map((v) => v.id)).toEqual(['kb', 'kc']);
    const r = Mi.mirrorCard(s.ws, s.id, 'kb', { colState: cs });
    if (!r.ok) throw new Error(r.reason);
    const ws = r.ws;
    expect(Mi.isMirror(ws, No.viewById(ws, 'kb'), s.id)).toBe(true);
    expect(Mi.isMirror(ws, No.viewById(ws, 'ka'), s.id)).toBe(false);
    expect(Mi.homesOf(ws, s.id).map((v) => v.id)).toEqual(['ka']);
    expect(Mi.homeOf(ws, s.id)!.col!.id).toBe(s.a[0].id);
    expect(Mi.mirrorBoardsOf(ws, s.id).map((v) => v.id)).toEqual(['kb']);
    expect(colIn(ws, 'kb', s.id)).toBe(s.b[0].id);
    expect(No.noteById(ws, s.id)!.state).toBe('open');
    expect((ws.notes ?? []).length).toBe((s.ws.notes ?? []).length);
    // schon da, Ziel ohne Heimat oder unbekannt
    const again = Mi.mirrorCard(ws, s.id, 'kb', { colState: cs });
    expect(again.ok ? '' : again.reason).toBe('already');
    const lone = No.createNote(ws, { title: 'Ohne Board' });
    const nh = Mi.mirrorCard(lone.ws, lone.id, 'kb', { colState: cs });
    expect(nh.ok ? '' : nh.reason).toBe('noHome');
    const miss = Mi.mirrorCard(ws, s.id, 'td', { colState: cs });
    expect(miss.ok ? '' : miss.reason).toBe('missing');
    // Spiegel einer erledigten Karte landet in der Erledigt-Spalte
    let d = Sh.moveCard(s.ws, 'ka', s.id, doneCol(s.ws, 'ka').id);
    if (!d.ok) throw new Error('d');
    const d2 = Mi.mirrorCard(d.ws, s.id, 'kc', { colState: cs });
    if (!d2.ok) throw new Error('d2');
    expect(colIn(d2.ws, 'kc', s.id)).toBe(doneCol(d2.ws, 'kc').id);
  });
  it('Zustand folgt der Heimat: Ziehen im Spiegel ändert nichts, Heimat zieht den Zustand, Spiegel bleibt liegen', () => {
    const s = setup();
    let ws = (Mi.mirrorCard(s.ws, s.id, 'kb', { colState: cs }) as { ws: Workspace }).ws;
    let r = Sh.moveCard(ws, 'kb', s.id, doneCol(ws, 'kb').id);
    if (!r.ok) throw new Error('m');
    ws = r.ws;
    expect(No.noteById(ws, s.id)!.state).toBe('open');
    expect(colIn(ws, 'kb', s.id)).toBe(doneCol(ws, 'kb').id);
    expect(colIn(ws, 'ka', s.id)).toBe(s.a[0].id);
    // zurück in die erste Spalte des Spiegels, dann in der Heimat erledigen
    ws = (Sh.moveCard(ws, 'kb', s.id, s.b[0].id) as { ws: Workspace }).ws;
    r = Sh.moveCard(ws, 'ka', s.id, doneCol(ws, 'ka').id);
    if (!r.ok) throw new Error('h');
    ws = Sh.syncBoards(r.ws, s.id);
    expect(No.noteById(ws, s.id)!.state).toBe('done');
    expect(colIn(ws, 'kb', s.id)).toBe(s.b[0].id);
  });
  it('Schloss (A3): im Spiegel-Board gesperrt, Heimat bestimmt; Haken in der Heimat geht', () => {
    const s = setup();
    const ws = (Mi.mirrorCard(s.ws, s.id, 'kb', { colState: cs }) as { ws: Workspace }).ws;
    expect(Sh.flowsOf(ws, s.id).map((v) => v.id)).toEqual(['ka']);
    expect(Sh.lockOf(ws, s.id, 'kb').map((v) => v.id)).toEqual(['ka']);
    expect(Sh.lockOf(ws, s.id, 'ka')).toEqual([]);
    expect(Sh.toggleDone(ws, s.id, 'kb')).toBe(ws);
    const done = Sh.toggleDone(ws, s.id, 'ka');
    expect(No.noteById(done, s.id)!.state).toBe('done');
    expect(colIn(done, 'ka', s.id)).toBe(doneCol(done, 'ka').id);
    expect(colIn(done, 'kb', s.id)).toBe(s.b[0].id);
  });
  it('Spiegel entfernen, Heimat wechseln, Heimat weg → Spiegel wird Heimat; Verschieben behält das Kennzeichen', () => {
    const s = setup();
    let ws = (Mi.mirrorCard(s.ws, s.id, 'kb', { colState: cs }) as { ws: Workspace }).ws;
    const un = Mi.unmirror(ws, 'kb', s.id);
    expect(colIn(un, 'kb', s.id)).toBeUndefined();
    expect(No.viewById(un, 'kb')!.mirrors).toBeUndefined();
    expect(colIn(un, 'ka', s.id)).toBe(s.a[0].id);
    expect(Mi.unmirror(ws, 'ka', s.id)).toBe(ws);
    // Heimat wechseln
    const mh = Mi.makeHome(ws, 'kb', s.id);
    expect(Mi.isMirror(mh, No.viewById(mh, 'ka'), s.id)).toBe(true);
    expect(Mi.isMirror(mh, No.viewById(mh, 'kb'), s.id)).toBe(false);
    // Heimat entfernt → der Spiegel bestimmt jetzt
    const gone = No.removeFromView(ws, s.id, 'ka');
    expect(Mi.isMirror(gone, No.viewById(gone, 'kb'), s.id)).toBe(false);
    expect(Sh.lockOf(gone, s.id, 'kb')).toEqual([]);
    // Verschieben aus dem Spiegel-Board in Board C: dort weiter Spiegel
    const mv = Sh.moveToSheet(ws, s.id, 'kb', 'kc');
    if (!mv.ok) throw new Error('mv');
    ws = mv.ws;
    expect(colIn(ws, 'kb', s.id)).toBeUndefined();
    expect(Mi.isMirror(ws, No.viewById(ws, 'kc'), s.id)).toBe(true);
    expect(No.viewById(ws, 'kb')!.mirrors).toBeUndefined();
  });
  it('Archiv im Spiegel-Board und Laden', () => {
    const s = setup();
    let ws = (Mi.mirrorCard(s.ws, s.id, 'kb', { colState: cs }) as { ws: Workspace }).ws;
    ws = KM.archiveCard(ws, s.id);
    expect(No.noteById(ws, s.id)!.state).toBe('archived');
    ws = KM.restoreCard(ws, 'kb', s.id);
    expect(No.noteById(ws, s.id)!.state).toBe('open');
    expect(colIn(ws, 'kb', s.id)).toBe(s.b[0].id);
    const back = St.parseWorkspace(JSON.parse(JSON.stringify(ws)))!;
    expect(No.viewById(back, 'kb')!.mirrors).toEqual([s.id]);
    const bad = JSON.parse(JSON.stringify(ws));
    bad.noteViews.find((v: { id: string }) => v.id === 'kb').mirrors = [s.id, s.id, 'weg', 3];
    bad.noteViews.find((v: { id: string }) => v.id === 'kc').mirrors = [s.id];
    const b2 = St.parseWorkspace(bad)!;
    expect(No.viewById(b2, 'kb')!.mirrors).toEqual([s.id]);
    expect(No.viewById(b2, 'kc')!.mirrors).toBeUndefined();
    // Aktionen im Reducer
    let r = reducer(s.ws, { type: 'cardMirror', note: s.id, to: 'kb' });
    expect(Mi.isMirror(r, No.viewById(r, 'kb'), s.id)).toBe(true);
    r = reducer(r, { type: 'cardMakeHome', view: 'kb', note: s.id });
    expect(Mi.isMirror(r, No.viewById(r, 'ka'), s.id)).toBe(true);
    r = reducer(r, { type: 'cardUnmirror', view: 'ka', note: s.id });
    expect(colIn(r, 'ka', s.id)).toBeUndefined();
  });
  it('Trello: Spiegelkarte ↔ Spiegel (Original aus einem anderen Board), unbekanntes Original bleibt Karte', () => {
    expect(Mi.trelloLinkOf('https://trello.com/c/AbCd1234/7-karte')).toBe('AbCd1234');
    expect(Mi.trelloLinkOf('nix')).toBeUndefined();
    const lists = [
      { id: 'L1', name: 'To Do', closed: false, pos: 1 },
      { id: 'L2', name: 'Done', closed: false, pos: 2 },
    ];
    const card = (o: Record<string, unknown>) => ({ desc: '', closed: false, idList: 'L1', pos: 1, idLabels: [], idMembers: [], idChecklists: [], ...o });
    const one = { id: 'b1', name: 'Eins', labels: [], members: [], checklists: [], actions: [], lists, cards: [card({ id: 'c1', name: 'Original', shortLink: 'AbCd1234', shortUrl: 'https://trello.com/c/AbCd1234' })] };
    const r1 = T.importTrello(W.defaultWorkspace(), JSON.stringify(one), { now: 1_800_000_000_000 });
    if (!r1.ok) throw new Error(r1.error);
    const orig = (r1.ws.notes ?? []).find((n) => n.title === 'Original')!;
    const two = {
      id: 'b2',
      name: 'Zwei',
      labels: [],
      members: [],
      checklists: [],
      actions: [],
      lists,
      cards: [card({ id: 'm1', name: 'https://trello.com/c/AbCd1234/1-original', cardRole: 'mirror', idList: 'L2' }), card({ id: 'm2', name: 'https://trello.com/c/Unbekannt9/2-x', cardRole: 'mirror' }), card({ id: 'c2', name: 'Eigene' })],
    };
    const r2 = T.importTrello(r1.ws, JSON.stringify(two), { now: 1_800_000_000_000 });
    if (!r2.ok) throw new Error(r2.error);
    expect((r2.ws.notes ?? []).length).toBe((r1.ws.notes ?? []).length + 2);
    const v2 = No.viewById(r2.ws, r2.view)!;
    expect(v2.mirrors).toEqual([orig.id]);
    expect(Mi.isMirror(r2.ws, v2, orig.id)).toBe(true);
    expect(Sh.colOf(v2, orig.id)!.name).toBe('Done');
    expect(No.noteById(r2.ws, orig.id)!.state).toBe('open');
    expect(r2.notes).toContain('mirrors:1');
    expect(r2.notes).toContain('mirrorsOpen:1');
    const out = JSON.parse(T.exportTrello(r2.ws, r2.project));
    const mc = out.cards.filter((c: { cardRole?: string }) => c.cardRole === 'mirror');
    expect(mc.length).toBe(2);
    const back = mc.find((c: { name: string }) => c.name === 'https://trello.com/c/AbCd1234')!;
    expect(back.idList).toBe(out.lists.find((l: { name: string }) => l.name === 'Done').id);
    // Export des Heimat-Projekts enthält das Original als normale Karte
    const out1 = JSON.parse(T.exportTrello(r2.ws, r1.project));
    expect(out1.cards.filter((c: { cardRole?: string }) => c.cardRole === 'mirror').length).toBe(0);
  });
});
