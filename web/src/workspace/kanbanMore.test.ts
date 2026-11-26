import { describe, expect, it } from 'vitest';
import type { Workspace } from './types';
import * as No from './notes';
import * as Sh from './sheets';
import * as W from './workspace';
import * as KM from './kanbanMore';

const seq = () => {
  let i = 0;
  return () => `id${++i}`;
};
const setup = () => {
  let ws: Workspace = W.defaultWorkspace();
  const v = No.createView(ws, 'kanban', 'Board', { id: 'kb', makeId: seq() });
  ws = v.ws;
  const cols = No.viewById(ws, 'kb')!.cols!;
  const add = (title: string, col: string, extra: Partial<Parameters<typeof No.createNote>[1]> = {}) => {
    const c = No.createNote(ws, { title, ...extra });
    const r = Sh.moveCard(c.ws, 'kb', c.id, col);
    if (r.ok) ws = r.ws;
    return c.id;
  };
  const a = add('A', cols[0].id, { tags: ['rot'], due: '2026-12-04', assignee: 'p1', text: 'Text\n- [ ] eins\n- [x] zwei' });
  const b = add('B', cols[0].id);
  const c = add('C', cols[1].id);
  const other = No.createView(ws, 'todo', 'Liste', { id: 'td' });
  ws = other.ws;
  return { ws: () => ws, cols, a, b, c };
};

describe('V121 F-231 K3 Spalten', () => {
  it('archiviert eine Spalte mit Karten und stellt sie an alter Stelle wieder her', () => {
    const s = setup();
    const r = KM.archiveColumn(s.ws(), 'kb', s.cols[0].id, 5);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const v = No.viewById(r.ws, 'kb')!;
    expect(v.cols!.map((c) => c.id)).toEqual([s.cols[1].id, s.cols[2].id]);
    expect(v.archivedCols![0].ids).toEqual([s.a, s.b]);
    expect(No.idsIn(v)).toContain(s.a); // Karte bleibt im Board (Schloss, Library)
    const back = KM.restoreColumn(r.ws, 'kb', s.cols[0].id);
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    const w = No.viewById(back.ws, 'kb')!;
    expect(w.cols!.map((c) => c.id)).toEqual(s.cols.map((c) => c.id));
    expect(w.archivedCols).toBeUndefined();
    expect(w.cols![0].archivedAt).toBeUndefined();
  });
  it('die letzte Spalte bleibt; Speichern behält archivierte Spalten', () => {
    const s = setup();
    let ws = s.ws();
    for (const c of s.cols.slice(0, 2)) ws = (KM.archiveColumn(ws, 'kb', c.id) as { ws: Workspace }).ws;
    expect(KM.archiveColumn(ws, 'kb', s.cols[2].id).ok).toBe(false);
    const ids = new Set(No.notesOf(ws).map((n) => n.id));
    const parsed = No.parseNoteViews(JSON.parse(JSON.stringify(ws.noteViews)), ids, new Set());
    expect(parsed.find((v) => v.id === 'kb')!.archivedCols!.map((c) => c.id)).toEqual([s.cols[1].id, s.cols[0].id]);
  });
  it('kopiert eine Spalte mit Karten als Kopien rechts daneben', () => {
    const s = setup();
    const r = KM.copyColumn(s.ws(), 'kb', s.cols[0].id, undefined, { makeId: seq() });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const v = No.viewById(r.ws, 'kb')!;
    expect(v.cols![1].name).toBe('Offen (Kopie)');
    expect(v.cols![1].ids).toHaveLength(2);
    expect(v.cols![1].ids).not.toContain(s.a);
    expect(No.noteById(r.ws, v.cols![1].ids[0])!.tags).toEqual(['rot']);
    expect(r.cards).toBe(2);
  });
  it('verschiebt alle Karten einer Spalte in ein anderes Sheet', () => {
    const s = setup();
    const r = KM.moveColumnCards(s.ws(), 'kb', s.cols[0].id, 'td');
    expect(r.moved).toBe(2);
    expect(No.viewById(r.ws, 'td')!.ids).toEqual([s.a, s.b]);
    expect(No.viewById(r.ws, 'kb')!.cols![0].ids).toEqual([]);
  });
  it('erlaubt bis zu 20 Spalten', () => {
    expect(No.COLUMN_MAX).toBe(20);
  });
});

describe('V121 F-231 K1 Karten', () => {
  it('kopiert eine Karte unter das Original – mit Auswahl, was mitkommt', () => {
    const s = setup();
    const keep = { ...KM.ALL_KEEP, checklist: false, tags: false, persons: false };
    const r = KM.copyCard(s.ws(), s.a, 'kb', { keep, id: 'k1' })!;
    const col = No.viewById(r.ws, 'kb')!.cols![0];
    expect(col.ids).toEqual([s.a, 'k1', s.b]);
    const n = No.noteById(r.ws, 'k1')!;
    expect(n.tags).toBeUndefined();
    expect(n.assignee).toBeUndefined();
    expect(n.due).toBe('2026-12-04');
    expect(n.text).toBe('Text');
    expect(n.trail).toHaveLength(2); // angelegt, abgelegt
  });
  it('kopiert in ein anderes Sheet mit neuem Titel', () => {
    const s = setup();
    const r = KM.copyCard(s.ws(), s.b, 'kb', { to: 'td', id: 'k2', title: 'B2' })!;
    expect(No.viewById(r.ws, 'td')!.ids).toEqual(['k2']);
    expect(No.titleOf(No.noteById(r.ws, 'k2')!)).toBe('B2');
  });
  it('archiviert und stellt wieder her; Archiv mit Suche', () => {
    const s = setup();
    let ws = KM.archiveCard(s.ws(), s.c);
    expect(No.noteById(ws, s.c)!.state).toBe('archived');
    ws = (KM.archiveColumn(ws, 'kb', s.cols[0].id) as { ws: Workspace }).ws;
    expect(KM.archiveCount(ws, 'kb')).toBe(2);
    expect(KM.archiveOf(ws, 'kb', 'C').cards.map((n) => n.id)).toEqual([s.c]);
    expect(KM.archiveOf(ws, 'kb', 'offen').cols).toHaveLength(1);
    ws = KM.restoreCard(ws, 'kb', s.c);
    expect(No.noteById(ws, s.c)!.state).toBe('doing');
  });
  it('Kartenvorlagen: kennzeichnen, finden, Karte daraus oben anlegen', () => {
    const s = setup();
    let ws = KM.setTemplate(s.ws(), s.a, true);
    expect(KM.templatesFor(ws, 'kb').here.map((n) => n.id)).toEqual([s.a]);
    expect(KM.templatesFor(ws, 'td').other.map((n) => n.id)).toEqual([s.a]);
    ws = KM.cardFromTemplate(ws, s.a, 'kb', s.cols[1].id, { id: 'k3', top: true })!.ws;
    expect(No.viewById(ws, 'kb')!.cols![1].ids[0]).toBe('k3');
    expect(No.noteById(ws, 'k3')!.template).toBeUndefined();
    expect(No.noteById(ws, 'k3')!.state).toBe('doing');
    ws = KM.setTemplate(ws, s.a, false);
    expect(No.noteById(ws, s.a)!.template).toBeUndefined();
  });
  it('Karte aus archivierter Spalte wieder ins Board ziehen nimmt sie aus dem Archiv', () => {
    const s = setup();
    let ws = (KM.archiveColumn(s.ws(), 'kb', s.cols[0].id) as { ws: Workspace }).ws;
    const r = Sh.moveCard(ws, 'kb', s.a, s.cols[1].id);
    expect(r.ok).toBe(true);
    if (r.ok) ws = r.ws;
    expect(No.viewById(ws, 'kb')!.archivedCols![0].ids).toEqual([s.b]);
  });
});

describe('V121 F-231 K5 Termine', () => {
  const at = (s: string) => new Date(s).getTime();
  it('färbt fällig wie Trello: überfällig, bald, später, erledigt', () => {
    expect(KM.dueKind({ due: '2026-12-04', dueTime: '14:00', state: 'open' }, at('2026-12-04T15:00:00'))).toBe('over');
    expect(KM.dueKind({ due: '2026-12-04', dueTime: '14:00', state: 'open' }, at('2026-12-03T15:00:00'))).toBe('soon');
    expect(KM.dueKind({ due: '2026-12-04', state: 'open' }, at('2026-12-04T15:00:00'))).toBe('soon'); // ohne Uhrzeit bis Tagesende
    expect(KM.dueKind({ due: '2026-12-10', state: 'open' }, at('2026-12-04T15:00:00'))).toBe('later');
    expect(KM.dueKind({ due: '2026-12-01', state: 'done' }, at('2026-12-04T15:00:00'))).toBe('done');
    expect(KM.dueKind({ state: 'open' })).toBeNull();
  });
  it('schlägt die Erinnerung 1 Tag vor fällig vor', () => {
    const r = KM.remindBeforeDue({ due: '2026-12-04', dueTime: '14:30' }, at('2026-11-26T10:00:00'))!;
    expect(new Date(r).getTime()).toBe(at('2026-12-03T14:30:00'));
    expect(KM.remindBeforeDue({ due: '2026-11-26' }, at('2026-11-26T10:00:00'))).toBeNull();
  });
  it('Uhrzeit bleibt beim Speichern und im Entwurf', () => {
    const ids = new Set<string>();
    const n = No.parseNotes([{ id: 'n1', title: 'X', text: '', state: 'open', trail: [], created: 1, changed: 1, due: '2026-12-04', dueTime: '14:30' }], ids)[0];
    expect(n.dueTime).toBe('14:30');
    let ws: Workspace = { ...W.defaultWorkspace(), notes: [n] };
    ws = No.setDraft(ws, 'n1', { dueTime: '09:15' });
    expect(No.shownNote(No.noteById(ws, 'n1')!).dueTime).toBe('09:15');
    ws = No.saveDraft(ws, 'n1');
    expect(No.noteById(ws, 'n1')!.dueTime).toBe('09:15');
  });
});
