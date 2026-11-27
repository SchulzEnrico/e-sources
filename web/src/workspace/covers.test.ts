import { describe, expect, it } from 'vitest';
import type { Workspace } from './types';
import * as No from './notes';
import * as Sh from './sheets';
import * as W from './workspace';
import * as Cv from './covers';
import * as KM from './kanbanMore';
import * as T from './trello';

const setup = () => {
  let ws: Workspace = W.defaultWorkspace();
  ws = No.createView(ws, 'kanban', 'Board', { id: 'kb' }).ws;
  const c = No.createNote(ws, { title: 'Messe', text: '# Messe\n![Stand](es-img:pic1)\nmehr\n![](es-img:pic2)' });
  const r = Sh.moveCard(c.ws, 'kb', c.id, No.viewById(c.ws, 'kb')!.cols![0].id);
  return { ws: r.ok ? r.ws : c.ws, id: c.id };
};
const note = (ws: Workspace, id: string) => No.noteById(ws, id)!;

/** kleines Trello-Board mit drei Covers: Farbe ganzflächig, Bild-Anhang, leer */
const board = () => ({
  id: 'b1',
  name: 'Cover',
  prefs: { background: 'blue', cardCovers: false },
  labels: [],
  lists: [{ id: 'L1', name: 'To Do', closed: false, pos: 1 }],
  members: [],
  cards: [
    { id: 'c1', name: 'Farbe', desc: '', closed: false, idList: 'L1', pos: 1, idLabels: [], idMembers: [], idChecklists: [], cover: { color: 'sky', size: 'full', brightness: 'light', idAttachment: null } },
    { id: 'c2', name: 'Bild', desc: '', closed: false, idList: 'L1', pos: 2, idLabels: [], idMembers: [], idChecklists: [], cover: { color: null, size: 'normal', idAttachment: 'att9', brightness: 'dark' }, attachments: [{ id: 'att9', name: 'foto.jpg' }] },
    { id: 'c3', name: 'Leer', desc: '', closed: false, idList: 'L1', pos: 3, idLabels: [], idMembers: [], idChecklists: [], cover: { color: null, idAttachment: null, size: 'normal' } },
  ],
  checklists: [],
  actions: [],
});

describe('V124 F-231 K6 Titelbild', () => {
  it('prüft Titelbilder: Farbe ohne Stufe, Bild geht vor, Unbekanntes fällt weg', () => {
    expect(Cv.cleanCover({ color: 'green' })).toEqual({ color: 'green' });
    expect(Cv.cleanCover({ color: 'green_dark' })).toBeUndefined();
    expect(Cv.cleanCover({ color: 'green', img: 'p1', size: 'full' })).toEqual({ img: 'p1', size: 'full' });
    expect(Cv.cleanCover({ img: '../x' })).toBeUndefined();
    expect(Cv.cleanCover({ size: 'full' })).toBeUndefined();
    expect(Cv.cleanCover(null)).toBeUndefined();
  });
  it('setzt, ändert die Größe und entfernt; Spur und Board-Schalter', () => {
    const s = setup();
    let ws = Cv.setCover(s.ws, s.id, { color: 'red' }, { by: 'Enrico' });
    expect(note(ws, s.id).cover).toEqual({ color: 'red' });
    expect(note(ws, s.id).trail.at(-1)!.what).toBe('edited');
    const same = Cv.setCover(ws, s.id, { color: 'red' });
    expect(same).toBe(ws);
    ws = Cv.setCoverSize(ws, s.id, true);
    expect(note(ws, s.id).cover).toEqual({ color: 'red', size: 'full' });
    ws = Cv.setCoverSize(ws, s.id, false);
    expect(note(ws, s.id).cover).toEqual({ color: 'red' });
    expect(Cv.coverShown({ noCovers: true }, note(ws, s.id))).toBeUndefined();
    expect(Cv.coverShown(No.viewById(ws, 'kb'), note(ws, s.id))).toEqual({ color: 'red' });
    ws = Cv.setCover(ws, s.id, undefined);
    expect('cover' in note(ws, s.id)).toBe(false);
  });
  it('bietet die Bilder der Karte an und hält Titelbilder beim Aufräumen fest', () => {
    const s = setup();
    expect(Cv.coverChoices(note(s.ws, s.id))).toEqual([
      { ref: 'pic1', alt: 'Stand' },
      { ref: 'pic2', alt: '' },
    ]);
    const ws = Cv.setCover(s.ws, s.id, { img: 'up7' });
    expect(No.imageRefs(ws).has('up7')).toBe(true);
    expect(Cv.coverRefs(ws)).toEqual(['up7']);
  });
  it('Kopie einer Karte behält das Titelbild', () => {
    const s = setup();
    const ws = Cv.setCover(s.ws, s.id, { color: 'lime', size: 'full' });
    const c = KM.copyCard(ws, s.id, 'kb')!;
    expect(note(c.ws, c.id).cover).toEqual({ color: 'lime', size: 'full' });
  });
  it('Trello: Farbe und Größe kommen herüber, Bild-Cover reist roh mit, Board-Schalter', () => {
    const r = T.importTrello(W.defaultWorkspace(), JSON.stringify(board()), { now: 1_800_000_000_000 });
    if (!r.ok) throw new Error(r.error);
    const byTitle = (t: string) => (r.ws.notes ?? []).find((n) => n.title === t)!;
    expect(byTitle('Farbe').cover).toEqual({ color: 'sky', size: 'full' });
    expect(byTitle('Bild').cover).toBeUndefined();
    expect(byTitle('Leer').cover).toBeUndefined();
    expect(No.viewById(r.ws, r.view)!.noCovers).toBe(true);
    const out = JSON.parse(T.exportTrello(r.ws, r.project));
    const card = (n: string) => out.cards.find((c: { name: string }) => c.name === n);
    expect(card('Farbe').cover).toMatchObject({ color: 'sky', size: 'full', idAttachment: null });
    expect(card('Bild').cover).toEqual({ color: null, size: 'normal', idAttachment: 'att9', brightness: 'dark' });
    expect(card('Leer').cover).toMatchObject({ color: null, idAttachment: null });
    expect(out.prefs).toEqual({ background: 'blue', cardCovers: false });
  });
  it('Trello hin und zurück: eigenes Bild bleibt, in Trello geänderte Farbe gewinnt', () => {
    const r = T.importTrello(W.defaultWorkspace(), JSON.stringify(board()), { now: 1_800_000_000_000 });
    if (!r.ok) throw new Error(r.error);
    const id = (t: string) => (r.ws.notes ?? []).find((n) => n.title === t)!.id;
    let ws = Cv.setCover(r.ws, id('Leer'), { img: 'pic5', size: 'full' });
    ws = Cv.setCover(ws, id('Farbe'), { color: 'pink' });
    ws = { ...ws, noteViews: (ws.noteViews ?? []).map((v) => (v.id === r.view ? (({ noCovers: _n, ...x }) => (void _n, x))(v) : v)) };
    const out = JSON.parse(T.exportTrello(ws, r.project));
    expect(out.prefs.cardCovers).toBe(true);
    const leer = out.cards.find((c: { name: string }) => c.name === 'Leer');
    expect(leer.cover).toMatchObject({ idAttachment: null, color: null, size: 'full' });
    const farbe = out.cards.find((c: { name: string }) => c.name === 'Farbe');
    expect(farbe.cover.color).toBe('pink');
    // Trello ordnet um und ergänzt Felder; Farbe dort geändert
    leer.cover = { size: 'full', brightness: 'dark', idPlugin: null, idUploadedBackground: null, color: null, idAttachment: null, edgeColor: null };
    farbe.cover = { ...farbe.cover, color: 'orange' };
    const back = T.importTrello(W.defaultWorkspace(), JSON.stringify(out), { now: 1_800_000_000_001 });
    if (!back.ok) throw new Error(back.error);
    const byTitle = (t: string) => (back.ws.notes ?? []).find((n) => n.title === t)!;
    expect(byTitle('Leer').cover).toEqual({ img: 'pic5', size: 'full' });
    expect(byTitle('Farbe').cover).toEqual({ color: 'orange' });
    expect(No.viewById(back.ws, back.view)!.noCovers).toBeUndefined();
  });
});
