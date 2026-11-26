import { describe, expect, it } from 'vitest';
import type { Workspace } from './types';
import * as No from './notes';
import * as Sh from './sheets';
import * as W from './workspace';
import * as Tg from './tags';
import * as CF from './cardFilter';

const seq = () => {
  let i = 0;
  return () => `id${++i}`;
};
const setup = () => {
  let ws: Workspace = W.defaultWorkspace();
  ws = No.createView(ws, 'kanban', 'Board', { id: 'kb', makeId: seq() }).ws;
  ws = No.createView(ws, 'kanban', 'Zweites', { id: 'kb2', makeId: seq() }).ws;
  const add = (view: string, title: string, extra: Partial<Parameters<typeof No.createNote>[1]> = {}) => {
    const c = No.createNote(ws, { title, ...extra });
    const r = Sh.moveCard(c.ws, view, c.id, No.viewById(c.ws, view)!.cols![0].id);
    if (r.ok) ws = r.ws;
    return c.id;
  };
  const a = add('kb', 'A', { tags: ['Rot', 'Kunde'], due: '2026-12-04', assignee: 'p1' });
  const b = add('kb', 'B', { tags: ['kunde'] });
  const c = add('kb', 'C');
  const d = add('kb2', 'D', { tags: ['Rot'] });
  return { ws: () => ws, a, b, c, d };
};
const note = (ws: Workspace, id: string) => No.noteById(ws, id)!;

describe('V122 F-231 K4 Tags', () => {
  it('kennt eine gemeinsame Liste ohne Doppelte und zählt je Board', () => {
    const s = setup();
    expect(Tg.allTags(s.ws())).toEqual(['Kunde', 'Rot']);
    const bt = Tg.boardTags(s.ws(), 'kb');
    expect(bt.find((t) => t.tag === 'Kunde')!.count).toBe(2);
    expect(Tg.boardTags(s.ws(), 'kb2').find((t) => t.tag === 'Kunde')!.count).toBe(0);
  });
  it('setzt Farben (auch Trello-Stufen) und legt neue Tags an', () => {
    const s = setup();
    let ws = Tg.setTagColor(s.ws(), 'rot', 'red');
    expect(Tg.colorOf(ws, 'Rot')).toBe('red');
    ws = Tg.setTagColor(ws, 'Rot', 'green_dark');
    expect(Object.keys(ws.tagColors!)).toEqual(['Rot']);
    expect(Tg.tagColorName('green_dark')).toBe('Grün dunkel');
    expect(Tg.setTagColor(ws, 'Rot', 'neon')).toBe(ws);
    const n = Tg.createTag(ws, 'Neu');
    expect(Tg.allTags(n.ws)).toContain('Neu');
    expect(Tg.colorOf(n.ws, 'Neu')).toBe('yellow'); // erste freie Grundfarbe – „green_dark“ belegt Grün
  });
  it('blendet je Board aus, die Liste bleibt', () => {
    const s = setup();
    const ws = Tg.setHidden(s.ws(), 'kb', 'Kunde', true);
    const v = No.viewById(ws, 'kb')!;
    expect(v.hiddenTags).toEqual(['kunde']);
    expect(Tg.shownTags(ws, v, note(ws, s.a)).map((t) => t.tag)).toEqual(['Rot']);
    expect(Tg.shownTags(ws, No.viewById(ws, 'kb2'), note(ws, s.d)).map((t) => t.tag)).toEqual(['Rot']);
    expect(No.viewById(Tg.setHidden(ws, 'kb', 'kunde', false), 'kb')!.hiddenTags).toBeUndefined();
  });
  it('benennt überall um und legt mit vorhandenem Namen zusammen', () => {
    const s = setup();
    let ws = Tg.setTagColor(s.ws(), 'Kunde', 'blue');
    ws = Tg.setHidden(ws, 'kb2', 'Kunde', true);
    const r = Tg.renameTag(ws, 'kunde', 'Auftraggeber');
    expect(r.notes).toBe(2);
    expect(note(r.ws, s.a).tags).toEqual(['Rot', 'Auftraggeber']);
    expect(Tg.colorOf(r.ws, 'Auftraggeber')).toBe('blue');
    expect(No.viewById(r.ws, 'kb2')!.hiddenTags).toEqual(['auftraggeber']);
    const m = Tg.renameTag(r.ws, 'Auftraggeber', 'rot');
    expect(note(m.ws, s.a).tags).toEqual(['Rot']);
    expect(note(m.ws, s.b).tags).toEqual(['Rot']);
  });
  it('löscht im Board – andere Boards behalten den Tag', () => {
    const s = setup();
    const ws = Tg.setTagColor(s.ws(), 'Rot', 'red');
    const r = Tg.removeTagIn(ws, 'kb', 'rot');
    expect(r.notes).toBe(1);
    expect(note(r.ws, s.a).tags).toEqual(['Kunde']);
    expect(note(r.ws, s.d).tags).toEqual(['Rot']);
    expect(Tg.colorOf(r.ws, 'Rot')).toBe('red'); // noch benutzt
    const r2 = Tg.removeTagIn(r.ws, 'kb2', 'Rot');
    expect(Tg.colorOf(r2.ws, 'Rot')).toBeUndefined();
    expect(note(r2.ws, s.d).tags).toBeUndefined();
  });
  it('übernimmt beim Setzen die bekannte Schreibweise und prüft beim Laden', () => {
    const s = setup();
    expect(Tg.normalizeTags(s.ws(), ['kunde', ' KUNDE ', 'neu', ''])).toEqual(['Kunde', 'neu']);
    expect(Tg.parseTagColors({ Rot: 'red', rot: 'blue', X: 'neon', ' ': 'red' })).toEqual({ Rot: 'red' });
    expect(Tg.parseHiddenTags(['B', 'a', 'b', 3])).toEqual(['a', 'b']);
    expect(Tg.tagInk('yellow')).toBe('#16181d');
    expect(Tg.tagInk('black_dark')).toBe('#ffffff');
  });
});

describe('V122 F-231 K4 Filter', () => {
  const now = new Date('2026-12-03T12:00:00').getTime();
  it('ODER: ein Merkmal reicht, UND: alle müssen passen', () => {
    const s = setup();
    const ws = s.ws();
    const f = { ...CF.FILTER_EMPTY, tags: ['kunde'], persons: ['p1'] };
    expect([s.a, s.b, s.c].filter((id) => CF.passes(ws, note(ws, id), f, now))).toEqual([s.a, s.b]);
    expect([s.a, s.b, s.c].filter((id) => CF.passes(ws, note(ws, id), { ...f, mode: 'all' }, now))).toEqual([s.a]);
    expect(CF.passes(ws, note(ws, s.c), CF.FILTER_EMPTY, now)).toBe(true);
  });
  it('kennt „ohne Tag“, „ohne Zuständigen“ und Fälligkeiten', () => {
    const s = setup();
    const ws = s.ws();
    const pick = (f: Partial<CF.CardFilter>) => [s.a, s.b, s.c].filter((id) => CF.passes(ws, note(ws, id), { ...CF.FILTER_EMPTY, ...f }, now));
    expect(pick({ tags: [''] })).toEqual([s.c]);
    expect(pick({ persons: [''] })).toEqual([s.b, s.c]);
    expect(pick({ due: ['soon'] })).toEqual([]); // 04.12. Tagesende = 36 h → nicht „bald“, aber „diese Woche“
    expect(pick({ due: ['week'] })).toEqual([s.a]);
    expect(pick({ due: ['none'] })).toEqual([s.b, s.c]);
    expect(CF.passes(ws, note(ws, s.a), { ...CF.FILTER_EMPTY, due: ['over'] }, new Date('2026-12-06T00:00:00').getTime())).toBe(true);
    expect(pick({ states: ['open'] })).toEqual([s.a, s.b, s.c]);
  });
  it('schaltet Merkmale um und liest gemerkte Stände', () => {
    let f = CF.toggle(CF.FILTER_EMPTY, 'tags', 'rot');
    expect(CF.filterCount(f)).toBe(1);
    f = CF.toggle(f, 'tags', 'rot');
    expect(f.tags).toEqual([]);
    expect(CF.parseCardFilter({ tags: ['Rot', ''], due: ['over', 'bald'], states: ['archived', 'done'], mode: 'all' })).toEqual({ tags: ['rot', ''], due: ['over'], states: ['done'], persons: [], mode: 'all' });
    expect(CF.parseCardFilter({})).toBeUndefined();
  });
});
