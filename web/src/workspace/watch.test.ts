import { describe, expect, it } from 'vitest';
import type { Workspace } from './types';
import * as No from './notes';
import * as Sh from './sheets';
import * as W from './workspace';
import * as Wt from './watch';
import * as Cm from './comments';
import * as St from './storage';
import * as Ps from './persons';
import { reducer } from './useWorkspace';

const setup = () => {
  let ws: Workspace = W.defaultWorkspace();
  ws = { ...ws, profile: { name: 'Enrico', color: 0, greet: true } };
  ws = No.createView(ws, 'kanban', 'Board', { id: 'kb' }).ws;
  const c = No.createNote(ws, { title: 'Karte A' }, { id: 'n1', by: 'Enrico' });
  const r = Sh.moveCard(c.ws, 'kb', 'n1', No.viewById(c.ws, 'kb')!.cols![0].id);
  if (!r.ok) throw new Error('setup');
  return r.ws;
};

describe('V132 F-231 K10d Beobachten und Neuigkeiten', () => {
  it('Karte, Spalte, Board beobachten je Person – an, aus, bleibt beim Laden', () => {
    let ws = setup();
    const col = No.viewById(ws, 'kb')!.cols![1].id;
    ws = reducer(ws, { type: 'watch', target: { kind: 'card', note: 'n1' }, on: true });
    ws = reducer(ws, { type: 'watch', target: { kind: 'col', view: 'kb', col }, on: true });
    ws = reducer(ws, { type: 'watch', target: { kind: 'board', view: 'kb' }, on: true });
    expect(No.noteById(ws, 'n1')!.watch).toEqual(['Enrico']);
    expect(Wt.isWatching(ws, { kind: 'col', view: 'kb', col })).toBe(true);
    expect(Wt.isWatching(ws, { kind: 'board', view: 'kb' })).toBe(true);
    expect(Wt.isWatching(ws, { kind: 'card', note: 'n1' }, 'Maike')).toBe(false);
    const back = St.parseWorkspace(JSON.parse(JSON.stringify(ws)))!;
    expect(No.noteById(back, 'n1')!.watch).toEqual(['Enrico']);
    expect(No.viewById(back, 'kb')!.watch).toEqual(['Enrico']);
    expect(No.viewById(back, 'kb')!.cols![1].watch).toEqual(['Enrico']);
    ws = reducer(ws, { type: 'watch', target: { kind: 'card', note: 'n1' }, on: false });
    expect(No.noteById(ws, 'n1')!.watch).toBeUndefined();
    expect(Wt.watchList(ws)).toMatchObject({ cards: [], boards: [{ id: 'kb' }] });
  });

  it('Änderung von jemand anderem an beobachteter Karte → Neuigkeit; eigene und Regel-Einträge nicht', () => {
    const mine = Wt.setWatch(setup(), { kind: 'card', note: 'n1' }, true);
    let other = No.updateNote(mine, 'n1', { title: 'Karte A neu' }, { by: 'Maike', now: 5000 });
    other = No.updateNote(other, 'n1', { text: 'x' }, { by: 'Regel R1 · Test', now: 6000 });
    other = No.updateNote(other, 'n1', { text: 'y' }, { by: 'Enrico', now: 7000 });
    const news = Wt.newsOf(mine, other);
    expect(news.map((x) => [x.kind, x.by, x.via])).toEqual([['change', 'Maike', 'card']]);
    const plain = setup();
    expect(Wt.newsOf(plain, No.updateNote(plain, 'n1', { title: 'x' }, { by: 'Maike', now: 5000 }))).toEqual([]); // nicht beobachtet
    // zweiter Abgleich meldet nichts doppelt
    const list = Wt.mergeNews([], news);
    expect(Wt.mergeNews(list, Wt.newsOf(mine, other))).toHaveLength(1);
    expect(Wt.unreadOf(Wt.markRead(list))).toBe(0);
  });

  it('@-Erwähnung meldet immer, Kommentar an beobachteter Karte als Kommentar', () => {
    let base = setup();
    base = Ps.ensureMe(base);
    const r = Cm.addComment(base, 'n1', 'Schau mal @Enrico', { by: 'Maike', now: 9000 })!;
    const news = Wt.newsOf(base, r.ws);
    expect(news[0]).toMatchObject({ kind: 'mention', by: 'Maike', note: 'n1' });
    const watched = Wt.setWatch(base, { kind: 'card', note: 'n1' }, true);
    const r2 = Cm.addComment(watched, 'n1', 'Nur ein Hinweis', { by: 'Maike', now: 9100 })!;
    expect(Wt.newsOf(watched, r2.ws)[0]).toMatchObject({ kind: 'comment', text: 'Nur ein Hinweis' });
  });

  it('neue Karte auf beobachtetem Board bzw. in beobachteter Spalte', () => {
    const mine = Wt.setWatch(setup(), { kind: 'board', view: 'kb' }, true);
    const c = No.createNote(mine, { title: 'Neu von Maike' }, { id: 'n2', by: 'Maike', now: 8000 });
    const r = Sh.moveCard(c.ws, 'kb', 'n2', No.viewById(c.ws, 'kb')!.cols![0].id);
    if (!r.ok) throw new Error('move');
    const news = Wt.newsOf(mine, r.ws);
    expect(news.some((x) => x.note === 'n2' && x.kind === 'added' && x.by === 'Maike')).toBe(true);
  });
});
