import { describe, expect, it } from 'vitest';
import type { Workspace } from './types';
import * as No from './notes';
import * as Sh from './sheets';
import * as W from './workspace';
import * as CL from './columnLook';
import * as KM from './kanbanMore';
import * as BT from './boardTemplates';
import * as T from './trello';
import * as St from './storage';
import { TAG_COLORS } from './tags';
import { parseSheetPrefs, withSheetPref } from './sheetPrefs';

const setup = () => {
  let ws: Workspace = W.defaultWorkspace();
  ws = No.createView(ws, 'kanban', 'Board', { id: 'kb' }).ws;
  const c = No.createNote(ws, { title: 'Karte' });
  const col = No.viewById(c.ws, 'kb')!.cols![0].id;
  const r = Sh.moveCard(c.ws, 'kb', c.id, col);
  return { ws: r.ok ? r.ws : c.ws, id: c.id, col };
};
const colOf = (ws: Workspace, id: string) => No.viewById(ws, 'kb')!.cols!.find((c) => c.id === id)!;

/** kleines Trello-Board: Liste mit Farbe, ohne Farbe (null), ohne Feld, archiviert mit Farbe */
const board = () => ({
  id: 'b1',
  name: 'Farben',
  prefs: {},
  labels: [],
  lists: [
    { id: 'L1', name: 'To Do', closed: false, pos: 1, color: 'sky' },
    { id: 'L2', name: 'Doing', closed: false, pos: 2, color: null },
    { id: 'L3', name: 'Done', closed: false, pos: 3 },
    { id: 'L4', name: 'Alt', closed: true, pos: 4, color: 'pink' },
    { id: 'L5', name: 'Seltsam', closed: false, pos: 5, color: 'rainbow' },
  ],
  members: [],
  cards: [{ id: 'c1', name: 'A', desc: '', closed: false, idList: 'L1', pos: 1, idLabels: [], idMembers: [], idChecklists: [] }],
  checklists: [],
  actions: [],
});

describe('V126 F-231 K11 Spaltenfarbe und Einklappen', () => {
  it('kennt die zehn Trello-Listenfarben (gleich der Tag-Farbliste)', () => {
    expect([...CL.COL_COLORS]).toEqual(TAG_COLORS.map((t) => t.id));
    expect(CL.isColColor('green')).toBe(true);
    expect(CL.isColColor('green_dark')).toBe(false);
    expect(CL.isColColor('rainbow')).toBe(false);
    expect(CL.colColorName('sky')).toBe('Himmelblau');
    expect(CL.colHex('red')).toBe('#d3514a');
  });
  it('setzt und entfernt die Farbe; Unbekanntes ändert nichts', () => {
    const s = setup();
    let ws = CL.setColColor(s.ws, 'kb', s.col, 'green');
    expect(colOf(ws, s.col).color).toBe('green');
    expect(CL.setColColor(ws, 'kb', s.col, 'rainbow')).toBe(ws);
    expect(CL.setColColor(ws, 'kb', 'nix', 'red')).toBe(ws);
    expect(CL.setColColor(ws, 'gibtsnicht', s.col, 'red')).toBe(ws);
    ws = CL.setColColor(ws, 'kb', s.col, undefined);
    expect('color' in colOf(ws, s.col)).toBe(false);
  });
  it('Kopie, Archiv, Board-Vorlage und Laden behalten die Farbe', () => {
    const s = setup();
    let ws = CL.setColColor(s.ws, 'kb', s.col, 'purple');
    const cp = KM.copyColumn(ws, 'kb', s.col);
    if (!cp.ok) throw new Error('copy');
    expect(colOf(cp.ws, cp.id!).color).toBe('purple');
    ws = cp.ws;
    const arch = KM.archiveColumn(ws, 'kb', cp.id!);
    if (!arch.ok) throw new Error('arch');
    ws = arch.ws;
    expect(No.viewById(ws, 'kb')!.archivedCols![0].color).toBe('purple');
    // Farbe auch an einer archivierten Spalte änderbar
    ws = CL.setColColor(ws, 'kb', cp.id!, 'lime');
    expect(No.viewById(ws, 'kb')!.archivedCols![0].color).toBe('lime');
    const back = St.parseWorkspace(JSON.parse(JSON.stringify(ws)))!;
    expect(colOf(back, s.col).color).toBe('purple');
    expect(No.viewById(back, 'kb')!.archivedCols![0].color).toBe('lime');
    // verfälschte Farbe fällt beim Laden weg
    const bad = JSON.parse(JSON.stringify(ws));
    bad.noteViews.find((v: { id: string }) => v.id === 'kb').cols[0].color = 'rainbow';
    expect('color' in colOf(St.parseWorkspace(bad)!, s.col)).toBe(false);
    expect(BT.colsOfBoard(ws, 'kb')![0].color).toBe('purple');
    const t = BT.templateFromBoard(ws, 'kb', 'Mit Farbe', { id: 'tp' });
    if (!t.ok) throw new Error('tpl');
    const b = BT.createBoard(t.ws, 'tp', { id: 'kb2' });
    expect(No.viewById(b.ws, 'kb2')!.cols![0].color).toBe('purple');
  });
  it('Einklappen: persönlich je Sheet, nur bekannte Spalten, eine bleibt offen', () => {
    const s = setup();
    const cols = No.viewById(s.ws, 'kb')!.cols!;
    expect(cols.length).toBeGreaterThan(2);
    let f = CL.toggleFolded(undefined, cols[1].id, cols);
    expect(f).toEqual([cols[1].id]);
    f = CL.toggleFolded([...f, 'weg'], cols[0].id, cols);
    expect(f).toEqual([cols[0].id, cols[1].id]);
    f = CL.toggleFolded(f, cols[1].id, cols);
    expect(f).toEqual([cols[0].id]);
    expect(CL.cleanFolded(['weg', cols[2].id, cols[2].id], cols)).toEqual([cols[2].id]);
    const others = CL.foldOthers(cols, cols[1].id);
    expect(others).not.toContain(cols[1].id);
    expect(others.length).toBe(cols.length - 1);
    expect(CL.canFold(others, cols[1].id, cols)).toBe(false);
    expect(CL.canFold(others, cols[0].id, cols)).toBe(true);
    expect(CL.canFold([], cols[0].id, cols)).toBe(true);
    // gemerkt in den Sheet-Einstellungen (Gerät)
    const all = withSheetPref({}, 'kb', { folded: [cols[0].id] });
    expect(parseSheetPrefs(JSON.parse(JSON.stringify(all))).kb.folded).toEqual([cols[0].id]);
    expect(parseSheetPrefs({ kb: { folded: [1, '', 'x', 'x'] } }).kb.folded).toEqual(['x']);
  });
  it('Trello: Listenfarbe hin und zurück, ohne Feld bleibt ohne Feld', () => {
    const r = T.importTrello(W.defaultWorkspace(), JSON.stringify(board()), { now: 1_800_000_000_000 });
    if (!r.ok) throw new Error(r.error);
    const v = No.viewById(r.ws, r.view)!;
    expect(v.cols!.map((c) => c.color)).toEqual(['sky', undefined, undefined, undefined]);
    expect(v.archivedCols![0].color).toBe('pink');
    let out = JSON.parse(T.exportTrello(r.ws, r.project));
    const byId = (o: { lists: { id: string; color?: string | null }[] }, id: string) => o.lists.find((l) => l.id === id)!;
    expect(byId(out, 'L1').color).toBe('sky');
    expect(byId(out, 'L2').color).toBeNull();
    expect('color' in byId(out, 'L3')).toBe(false);
    expect(byId(out, 'L4').color).toBe('pink');
    // ändern: L1 ohne, L3 grün
    let ws = CL.setColColor(r.ws, r.view, v.cols![0].id, undefined);
    ws = CL.setColColor(ws, r.view, v.cols![2].id, 'green');
    out = JSON.parse(T.exportTrello(ws, r.project));
    expect(byId(out, 'L1').color).toBeNull();
    expect(byId(out, 'L3').color).toBe('green');
    const back = T.importTrello(W.defaultWorkspace(), JSON.stringify(out), { now: 1_800_000_000_001 });
    if (!back.ok) throw new Error(back.error);
    expect(No.viewById(back.ws, back.view)!.cols!.map((c) => c.color)).toEqual([undefined, undefined, 'green', undefined]);
  });
});
