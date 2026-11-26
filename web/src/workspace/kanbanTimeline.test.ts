import { describe, expect, it } from 'vitest';
import type { Workspace } from './types';
import * as No from './notes';
import * as Sh from './sheets';
import * as W from './workspace';
import * as TL from './kanbanTimeline';
import * as KS from './kanbanStats';
import { isoWeek } from './kanbanViews';

const seq = () => {
  let i = 0;
  return () => `id${++i}`;
};
const setup = () => {
  let ws: Workspace = W.defaultWorkspace();
  ws = No.createView(ws, 'kanban', 'Board', { id: 'kb', makeId: seq() }).ws;
  const cols = No.viewById(ws, 'kb')!.cols!;
  const add = (title: string, col: number, extra: Partial<Parameters<typeof No.createNote>[1]> = {}) => {
    const c = No.createNote(ws, { title, ...extra });
    const r = Sh.moveCard(c.ws, 'kb', c.id, cols[col].id);
    if (r.ok) ws = r.ws;
    return c.id;
  };
  const a = add('Beide', 0, { notBefore: '2026-12-01', due: '2026-12-04', tags: ['Messe', 'b'] });
  const b = add('Nur fällig', 0, { due: '2026-12-10' });
  const c = add('Nur Start', 1, { notBefore: '2026-12-07', tags: ['messe'] });
  const d = add('Ohne', 1);
  const e = add('Verdreht', 1, { notBefore: '2026-12-09', due: '2026-12-02' });
  return { ws: () => ws, set: (x: Workspace) => (ws = x), cols, a, b, c, d, e };
};
const note = (ws: Workspace, id: string) => No.noteById(ws, id)!;

describe('V123 F-231 K13 Zeitleiste', () => {
  it('Balken aus Start und „fällig“, sonst ein Tag; ohne Datum keiner', () => {
    const s = setup();
    const ws = s.ws();
    expect(TL.barOf(note(ws, s.a))).toEqual({ start: '2026-12-01', end: '2026-12-04', from: 'both' });
    expect(TL.barOf(note(ws, s.b))).toEqual({ start: '2026-12-10', end: '2026-12-10', from: 'due' });
    expect(TL.barOf(note(ws, s.c))).toEqual({ start: '2026-12-07', end: '2026-12-07', from: 'start' });
    expect(TL.barOf(note(ws, s.d))).toBeNull();
    expect(TL.barOf(note(ws, s.e))).toEqual({ start: '2026-12-09', end: '2026-12-09', from: 'both', bad: true });
  });
  it('Gruppen nach Spalte (auch leer), Person und Tag (Karte in jedem ihrer Tags, Groß/Klein egal)', () => {
    const s = setup();
    const ws = s.ws();
    const v = No.viewById(ws, 'kb')!;
    const notes = [s.a, s.b, s.c, s.d, s.e].map((id) => note(ws, id));
    const names = { noOne: 'Ohne Zuständigen', noTag: 'Ohne Tag' };
    const byCol = TL.groupsOf(ws, v, notes, 'col', names);
    expect(byCol.map((g) => g.notes.length)).toEqual([2, 3, ...byCol.slice(2).map(() => 0)]);
    const byTag = TL.groupsOf(ws, v, notes, 'tag', names);
    expect(byTag.map((g) => [g.name, g.notes.length])).toEqual([['b', 1], ['Messe', 2], ['Ohne Tag', 3]]);
    expect(TL.groupsOf(ws, v, notes, 'who', names).map((g) => g.name)).toEqual(['Ohne Zuständigen']);
  });
  it('Zeitraum mit heute und Rand, Mindestlänge je Maßstab; Striche', () => {
    const bars = [{ start: '2026-12-01', end: '2026-12-20', from: 'both' as const }];
    const d = TL.rangeOf(bars, '2026-11-26', 'day');
    expect(d.from).toBe('2026-11-23');
    expect(d.to).toBe('2026-12-23');
    const w = TL.rangeOf(bars, '2026-11-26', 'week');
    expect(w.from).toBe('2026-11-16'); // Montag
    expect(w.days).toBe(84);
    const m = TL.rangeOf(bars, '2026-11-26', 'month');
    expect(m.from).toBe('2026-11-01');
    expect(TL.ticksOf('2026-11-30', '2026-12-14', 'week', isoWeek).map((t) => t.label)).toEqual(['KW 49', 'KW 50', 'KW 51']);
    expect(TL.monthsOf('2026-11-29', '2026-12-02').map((x) => [x.at, x.days])).toEqual([[0, 2], [2, 2]]);
  });
  it('verschieben, Ende und Anfang ziehen (nie über das andere Ende), auf einen Tag legen', () => {
    const s = setup();
    const ws = s.ws();
    expect(TL.moveBy(note(ws, s.a), 3)).toEqual({ notBefore: '2026-12-04', due: '2026-12-07' });
    expect(TL.moveBy(note(ws, s.b), -1)).toEqual({ notBefore: undefined, due: '2026-12-09' });
    expect(TL.moveBy(note(ws, s.d), 2)).toEqual({});
    expect(TL.resizeBy(note(ws, s.a), 'end', -10)).toEqual({ notBefore: '2026-12-01', due: '2026-12-01' });
    expect(TL.resizeBy(note(ws, s.a), 'start', 2)).toEqual({ notBefore: '2026-12-03', due: '2026-12-04' });
    expect(TL.resizeBy(note(ws, s.c), 'end', 2)).toEqual({ notBefore: '2026-12-07', due: '2026-12-09' });
    expect(TL.resizeBy(note(ws, s.b), 'end', 2)).toEqual({ notBefore: '2026-12-10', due: '2026-12-12' });
    expect(TL.resizeBy(note(ws, s.b), 'end', -3)).toEqual({ notBefore: undefined, due: '2026-12-10' });
    expect(TL.resizeBy(note(ws, s.b), 'start', -2)).toEqual({ notBefore: '2026-12-08', due: '2026-12-10' });
    expect(TL.resizeBy(note(ws, s.b), 'start', 1)).toEqual({ notBefore: undefined, due: '2026-12-10' });
    expect(TL.placeAt('2026-12-05')).toEqual({ due: '2026-12-05' });
  });
  it('Pfeile nur zwischen sichtbaren Karten, kritisch nur mit beiden Enden', () => {
    const s = setup();
    let ws = s.ws();
    const r = No.addLink(ws, s.b, s.a);
    if (r.ok) ws = r.ws;
    const notes = [s.a, s.b, s.d].map((id) => note(ws, id));
    expect(TL.arrowsOf(notes, new Set([s.a]))).toEqual([{ from: s.a, to: s.b, critical: false }]);
    expect(TL.arrowsOf(notes, new Set([s.a, s.b]))[0].critical).toBe(true);
    expect(TL.arrowsOf([note(ws, s.b)], new Set())).toEqual([]);
    expect(TL.criticalOf(ws, No.viewById(ws, 'kb')!).size).toBe(0);
  });
});

describe('V123 F-231 K13 Kennzahlen', () => {
  it('zählt je Spalte (WIP), Tag, Person, Fälligkeit, Checklisten und Alter', () => {
    const s = setup();
    let ws = s.ws();
    const now = new Date('2026-12-03T12:00:00').getTime();
    ws = { ...ws, noteViews: ws.noteViews!.map((v) => (v.id === 'kb' ? { ...v, cols: v.cols!.map((c, i) => (i === 1 ? { ...c, wip: 2 } : c)) } : v)) };
    const v = No.viewById(ws, 'kb')!;
    const st = KS.boardStats(ws, v, () => true, now);
    expect(st.total).toBe(5);
    expect(st.cols[0]).toMatchObject({ count: 2, over: false });
    expect(st.cols[1]).toMatchObject({ count: 3, wip: 2, over: true });
    expect(st.tags.map((t) => [t.name, t.count])).toEqual([['Messe', 2], ['b', 1], ['Ohne Tag', 3]]);
    // jetzt 03.12. 12:00: Verdreht (02.12.) überfällig, Beide (04.12.) in 7 Tagen, Nur fällig (10.12.) später
    expect(st.due).toEqual({ over: 1, soon: 0, week: 1, later: 1, none: 2, done: 0 });
    expect(st.persons).toEqual([{ key: '', name: 'Ohne Zuständigen', count: 5, open: 5 }]);
    expect(st.age).not.toBeNull();
    expect(KS.boardStats(ws, v, (n) => n.id === s.a, now).total).toBe(1);
    expect(KS.barPct(1, 50)).toBe(2);
    expect(KS.barPct(0, 5)).toBe(0);
    expect(KS.barPct(5, 5)).toBe(100);
  });
});
