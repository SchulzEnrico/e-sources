import { describe, expect, it } from 'vitest';
import type { Workspace } from './types';
import * as No from './notes';
import * as Sh from './sheets';
import * as W from './workspace';
import * as KV from './kanbanViews';

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
  const a = add('Zebra', 0, { due: '2026-12-10', tags: ['b'] });
  const b = add('Apfel', 0);
  const c = add('Mitte', 1, { due: '2026-12-04', dueTime: '09:00', tags: ['a'] });
  const d = add('Früh', 1, { due: '2026-12-04' });
  return { ws: () => ws, a, b, c, d };
};

describe('V122 F-231 K13 Tabelle', () => {
  it('Zeilen in Board-Reihenfolge, gefiltert, ohne archivierte', () => {
    const s = setup();
    const v = No.viewById(s.ws(), 'kb')!;
    expect(KV.tableRows(s.ws(), v).map((r) => r.note.id)).toEqual([s.a, s.b, s.c, s.d]);
    expect(KV.tableRows(s.ws(), v, (n) => !!n.due).map((r) => r.note.id)).toEqual([s.a, s.c, s.d]);
  });
  it('sortiert nach Titel, Fälligkeit (Leeres hinten) und Spalte, auch absteigend', () => {
    const s = setup();
    const ws = s.ws();
    const v = No.viewById(ws, 'kb')!;
    const rows = KV.tableRows(ws, v);
    const ids = (by: KV.TableSort, desc = false) => KV.sortRows(ws, v, rows, by, desc).map((r) => r.note.id);
    expect(ids('title')).toEqual([s.b, s.d, s.c, s.a]);
    expect(ids('due')).toEqual([s.c, s.d, s.a, s.b]);
    expect(ids('due', true)).toEqual([s.a, s.d, s.c, s.b]);
    expect(ids('col', true)).toEqual([s.c, s.d, s.a, s.b]);
    expect(ids('tags')).toEqual([s.c, s.a, s.b, s.d]);
  });
});

describe('V122 F-231 K13 Kalender', () => {
  it('Raster: Woche ab Montag, Monat in ganzen Wochen, KW', () => {
    expect(KV.weekDays('2026-12-03')).toEqual(['2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04', '2026-12-05', '2026-12-06']);
    const m = KV.monthDays('2026-12-15');
    expect(m[0]).toBe('2026-11-30');
    expect(m.length % 7).toBe(0);
    expect(m[m.length - 1]).toBe('2027-01-03');
    expect(KV.isoWeek('2026-12-03')).toBe(49);
    expect(KV.isoWeek('2027-01-01')).toBe(53);
    expect(KV.isoWeek('2027-01-04')).toBe(1);
  });
  it('verschiebt Tage und Monate (Monatsende gekürzt)', () => {
    expect(KV.shiftDay('2026-12-31', 1)).toBe('2027-01-01');
    expect(KV.shiftDay('2026-03-29', -1)).toBe('2026-03-28');
    expect(KV.shiftMonth('2027-01-31', 1)).toBe('2027-02-28');
    expect(KV.shiftMonth('2026-12-15', -12)).toBe('2025-12-15');
  });
  it('Karten je Tag, mit Uhrzeit zuerst, dazu ohne Datum', () => {
    const s = setup();
    const v = No.viewById(s.ws(), 'kb')!;
    const r = KV.byDay(KV.tableRows(s.ws(), v).map((x) => x.note));
    expect(r.days.get('2026-12-04')!.map((n) => n.id)).toEqual([s.c, s.d]);
    expect(r.none.map((n) => n.id)).toEqual([s.b]);
  });
});
