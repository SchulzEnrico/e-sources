import { describe, expect, it } from 'vitest';
import type { Workspace } from './types';
import * as No from './notes';
import * as Sh from './sheets';
import * as W from './workspace';
import * as CFd from './cardFields';
import * as CF from './cardFilter';
import * as KV from './kanbanViews';
import * as KM from './kanbanMore';
import * as T from './trello';
import * as St from './storage';
import * as Cv from './covers';
import * as Tg from './tags';

const setup = () => {
  let ws: Workspace = W.defaultWorkspace();
  ws = No.createView(ws, 'kanban', 'Board', { id: 'kb' }).ws;
  const col = No.viewById(ws, 'kb')!.cols![0].id;
  const ids: string[] = [];
  for (const t of ['Alpha', 'Beta', 'Gamma']) {
    const c = No.createNote(ws, { title: t, text: `# ${t}` });
    const r = Sh.moveCard(c.ws, 'kb', c.id, col);
    ws = r.ok ? r.ws : c.ws;
    ids.push(c.id);
  }
  ws = CFd.addField(ws, 'kb', 'Priorität', 'list', { id: 'fp', onCard: true })!.ws;
  ws = CFd.addOption(ws, 'kb', 'fp', 'Hoch', 'red', { id: 'oh' })!.ws;
  ws = CFd.addOption(ws, 'kb', 'fp', 'Niedrig', undefined, { id: 'on' })!.ws;
  ws = CFd.addField(ws, 'kb', 'Punkte', 'number', { id: 'fn' })!.ws;
  ws = CFd.addField(ws, 'kb', 'Messe', 'date', { id: 'fd' })!.ws;
  ws = CFd.addField(ws, 'kb', 'Angebot raus', 'check', { id: 'fc' })!.ws;
  ws = CFd.addField(ws, 'kb', 'Kunde', 'text', { id: 'ft' })!.ws;
  return { ws, ids, col };
};
const note = (ws: Workspace, id: string) => No.noteById(ws, id)!;
const def = (ws: Workspace, id: string) => CFd.fieldById(No.viewById(ws, 'kb'), id)!;

describe('V125 F-231 K8 eigene Felder', () => {
  it('legt Felder an, ändert, verschiebt und prüft beim Laden', () => {
    expect([...Cv.COVER_COLORS]).toEqual(Tg.TAG_COLORS.map((c) => c.id));
    let { ws } = setup();
    expect(CFd.fieldsOf(No.viewById(ws, 'kb')).map((f) => [f.id, f.type])).toEqual([
      ['fp', 'list'],
      ['fn', 'number'],
      ['fd', 'date'],
      ['fc', 'check'],
      ['ft', 'text'],
    ]);
    expect(CFd.addField(ws, 'kb', '  ', 'text')).toBeNull();
    ws = CFd.updateField(ws, 'kb', 'fn', { name: 'Story Points', onCard: true });
    ws = CFd.moveField(ws, 'kb', 'fn', -1);
    expect(CFd.fieldsOf(No.viewById(ws, 'kb')).slice(0, 2).map((f) => [f.id, f.name, !!f.onCard])).toEqual([
      ['fn', 'Story Points', true],
      ['fp', 'Priorität', true],
    ]);
    expect(CFd.cleanFieldDefs([{ id: 'a', name: 'X', type: 'farbe' }, { id: 'b', name: 'Y', type: 'list', options: [{ id: 'o', name: 'Z', color: 'red_dark' }] }, { id: 'b', name: 'doppelt', type: 'text' }])).toEqual([
      { id: 'b', name: 'Y', type: 'list', options: [{ id: 'o', name: 'Z' }] },
    ]);
  });

  it('setzt Werte passend zur Art, leert sie und zeigt sie auf der Karte', () => {
    const s = setup();
    let ws = s.ws;
    const [a] = s.ids;
    ws = CFd.setFieldValue(ws, a, def(ws, 'fp'), 'oh');
    ws = CFd.setFieldValue(ws, a, def(ws, 'fn'), '1,5');
    ws = CFd.setFieldValue(ws, a, def(ws, 'fd'), '2026-12-07');
    ws = CFd.setFieldValue(ws, a, def(ws, 'fc'), true);
    ws = CFd.setFieldValue(ws, a, def(ws, 'ft'), '  Müller GmbH ');
    expect(note(ws, a).fields).toEqual({ fp: 'oh', fn: 1.5, fd: '2026-12-07', fc: true, ft: 'Müller GmbH' });
    expect(note(ws, a).trail.at(-1)?.what).toBe('edited');
    // falsche Werte ändern nichts
    expect(CFd.setFieldValue(ws, a, def(ws, 'fn'), 'viel')).toBe(ws);
    expect(CFd.setFieldValue(ws, a, def(ws, 'fp'), 'gibtsnicht')).toBe(ws);
    expect(CFd.cardFront(No.viewById(ws, 'kb'), note(ws, a))).toEqual([{ def: def(ws, 'fp'), text: 'Hoch', color: 'red' }]);
    expect(CFd.valueText(def(ws, 'fd'), '2026-12-07')).toBe('07.12.2026');
    expect(CFd.valueText(def(ws, 'fn'), 1.5)).toBe('1,5');
    ws = CFd.setFieldValue(ws, a, def(ws, 'fc'), false);
    ws = CFd.setFieldValue(ws, a, def(ws, 'ft'), '');
    expect(note(ws, a).fields).toEqual({ fp: 'oh', fn: 1.5, fd: '2026-12-07' });
    // Wahl löschen leert die Karten, Feld löschen nimmt die Werte mit
    const r = CFd.removeOption(ws, 'kb', 'fp', 'oh');
    expect(r.notes).toBe(1);
    expect(note(r.ws, a).fields?.fp).toBeUndefined();
    const r2 = CFd.removeField(r.ws, 'kb', 'fn');
    expect(note(r2.ws, a).fields).toEqual({ fd: '2026-12-07' });
    expect(CFd.fieldById(No.viewById(r2.ws, 'kb'), 'fn')).toBeUndefined();
  });

  it('sortiert Spalte und Tabelle nach Feld; Leeres hinten', () => {
    const s = setup();
    let ws = s.ws;
    const [a, b, c] = s.ids;
    ws = CFd.setFieldValue(ws, a, def(ws, 'fn'), 3);
    ws = CFd.setFieldValue(ws, c, def(ws, 'fn'), 1);
    ws = CFd.setFieldValue(ws, b, def(ws, 'fp'), 'on');
    ws = CFd.setFieldValue(ws, c, def(ws, 'fp'), 'oh');
    const order = (w: Workspace) => No.viewById(w, 'kb')!.cols![0].ids;
    expect(order(Sh.sortCol(ws, 'kb', s.col, 'f:fn'))).toEqual([c, a, b]);
    expect(order(Sh.sortCol(ws, 'kb', s.col, 'f:fp'))).toEqual([c, b, a]);
    const v = No.viewById(ws, 'kb')!;
    expect(KV.sortRows(ws, v, KV.tableRows(ws, v), 'f:fn', true).map((r) => r.note.id)).toEqual([a, c, b]);
  });

  it('filtert nach Wahl, ausgefüllt, leer und Häkchen', () => {
    const s = setup();
    let ws = s.ws;
    const [a, b, c] = s.ids;
    ws = CFd.setFieldValue(ws, a, def(ws, 'fp'), 'oh');
    ws = CFd.setFieldValue(ws, b, def(ws, 'fc'), true);
    ws = CFd.setFieldValue(ws, c, def(ws, 'ft'), 'X');
    const pick = (fields: string[], mode: CF.FilterMode = 'any') => s.ids.filter((id) => CF.passes(ws, note(ws, id), { ...CF.FILTER_EMPTY, fields, mode }));
    expect(pick(['fp=oh'])).toEqual([a]);
    expect(pick(['fp='])).toEqual([b, c]);
    expect(pick(['fc=1', 'ft=*'])).toEqual([b, c]);
    expect(pick(['fc=1', 'ft=*'], 'all')).toEqual([]);
    expect(CF.filterCount({ ...CF.FILTER_EMPTY, fields: ['fp=oh'] })).toBe(1);
    expect(CF.toggle(CF.FILTER_EMPTY, 'fields', 'fp=oh').fields).toEqual(['fp=oh']);
    expect(CF.parseCardFilter({ fields: ['fp=oh', 'kaputt'] })?.fields).toEqual(['fp=oh']);
    expect(CFd.filterChoices(def(ws, 'fp')).map((x) => x.val)).toEqual(['oh', 'on', '']);
  });

  it('Kopie behält die Werte, Laden behält Felder, Werte, Stimmen und Titelbild', () => {
    const s = setup();
    let ws = s.ws;
    const [a] = s.ids;
    ws = CFd.setFieldValue(ws, a, def(ws, 'fn'), 8);
    ws = CFd.toggleVote(ws, a, 'p1');
    ws = { ...ws, notes: (ws.notes ?? []).map((n) => (n.id === a ? { ...n, cover: { color: 'green' } } : n)), noteViews: (ws.noteViews ?? []).map((v) => (v.id === 'kb' ? { ...v, noCovers: true as const, votes: true as const } : v)) };
    const cp = KM.copyCard(ws, a, 'kb')!;
    expect(note(cp.ws, cp.id).fields).toEqual({ fn: 8 });
    expect(note(cp.ws, cp.id).votes).toBeUndefined();
    const back = St.parseWorkspace(JSON.parse(JSON.stringify(ws)))!;
    const v = No.viewById(back, 'kb')!;
    expect(v.fields?.map((f) => f.id)).toEqual(['fp', 'fn', 'fd', 'fc', 'ft']);
    expect(v.votes).toBe(true);
    expect(v.noCovers).toBe(true);
    expect(note(back, a).fields).toEqual({ fn: 8 });
    expect(note(back, a).votes).toEqual(['p1']);
    expect(note(back, a).cover).toEqual({ color: 'green' });
  });
});

describe('V125 F-231 K8 Abstimmen', () => {
  it('eine Stimme je Person, zurückziehen, nach Stimmen sortieren, Board-Schalter', () => {
    const s = setup();
    let ws = s.ws;
    const [a, b, c] = s.ids;
    ws = CFd.toggleVote(ws, b, 'p1');
    ws = CFd.toggleVote(ws, b, 'p2');
    ws = CFd.toggleVote(ws, c, 'p1');
    ws = CFd.toggleVote(ws, a, 'p1');
    ws = CFd.toggleVote(ws, a, 'p1');
    expect(note(ws, a).votes).toBeUndefined();
    expect(CFd.hasVoted(note(ws, b), 'p2')).toBe(true);
    expect(No.viewById(Sh.sortCol(ws, 'kb', s.col, 'votes'), 'kb')!.cols![0].ids).toEqual([b, c, a]);
    const v = No.viewById(ws, 'kb')!;
    expect(KV.sortRows(ws, v, KV.tableRows(ws, v), 'votes').map((r) => r.note.id)).toEqual([b, c, a]);
    ws = CFd.setBoardVotes(ws, 'kb', true);
    expect(No.viewById(ws, 'kb')!.votes).toBe(true);
    ws = CFd.setBoardVotes(ws, 'kb', false);
    expect(No.viewById(ws, 'kb')!.votes).toBeUndefined();
    expect(note(ws, b).votes).toEqual(['p1', 'p2']);
  });
});

/** Trello-Board mit eigenen Feldern und Stimmen */
const board = () => ({
  id: 'b1',
  name: 'Felder',
  prefs: { background: 'blue', voting: 'members' },
  labels: [],
  lists: [{ id: 'L1', name: 'To Do', closed: false, pos: 1 }],
  members: [
    { id: 'm1', fullName: 'Anna Berg' },
    { id: 'm2', fullName: 'Ben Kurz' },
  ],
  customFields: [
    { id: 'cfP', idModel: 'b1', modelType: 'board', fieldGroup: 'g1', name: 'Priorität', type: 'list', pos: 1, display: { cardFront: true }, options: [
      { id: 'oH', idCustomField: 'cfP', value: { text: 'Hoch' }, color: 'red', pos: 1 },
      { id: 'oN', idCustomField: 'cfP', value: { text: 'Niedrig' }, color: 'none', pos: 2 },
    ] },
    { id: 'cfZ', idModel: 'b1', modelType: 'board', name: 'Punkte', type: 'number', pos: 2, display: { cardFront: false } },
    { id: 'cfD', idModel: 'b1', modelType: 'board', name: 'Termin', type: 'date', pos: 3, display: { cardFront: false } },
    { id: 'cfC', idModel: 'b1', modelType: 'board', name: 'Geprüft', type: 'checkbox', pos: 4, display: { cardFront: true } },
    { id: 'cfT', idModel: 'b1', modelType: 'board', name: 'Kunde', type: 'text', pos: 5, display: { cardFront: false } },
  ],
  cards: [
    {
      id: 'c1', name: 'Eins', desc: '', closed: false, idList: 'L1', pos: 1, idLabels: [], idMembers: [], idChecklists: [], idMembersVoted: ['m1', 'm2'],
      customFieldItems: [
        { id: 'i1', idCustomField: 'cfP', idModel: 'c1', modelType: 'card', idValue: 'oH' },
        { id: 'i2', idCustomField: 'cfZ', idModel: 'c1', modelType: 'card', value: { number: '13' } },
        { id: 'i3', idCustomField: 'cfD', idModel: 'c1', modelType: 'card', value: { date: '2026-12-07T09:30:00.000Z' } },
        { id: 'i4', idCustomField: 'cfC', idModel: 'c1', modelType: 'card', value: { checked: 'true' } },
        { id: 'i5', idCustomField: 'cfT', idModel: 'c1', modelType: 'card', value: { text: 'Müller' } },
        { id: 'i9', idCustomField: 'cfAlt', idModel: 'c1', modelType: 'card', value: { text: 'ohne Feld' } },
      ],
    },
    { id: 'c2', name: 'Zwei', desc: '', closed: false, idList: 'L1', pos: 2, idLabels: [], idMembers: [], idChecklists: [], idMembersVoted: [], customFieldItems: [] },
  ],
  checklists: [],
  actions: [],
});

describe('V125 F-231 K8 Trello', () => {
  it('Import: Felder mit Wahlen und Farben, Werte, Stimmen, Abstimmen an', () => {
    const r = T.importTrello(W.defaultWorkspace(), JSON.stringify(board()), { now: 1_800_000_000_000 });
    if (!r.ok) throw new Error(r.error);
    const v = No.viewById(r.ws, r.view)!;
    expect(v.votes).toBe(true);
    expect(v.fields?.map((f) => [f.name, f.type, !!f.onCard])).toEqual([
      ['Priorität', 'list', true],
      ['Punkte', 'number', false],
      ['Termin', 'date', false],
      ['Geprüft', 'check', true],
      ['Kunde', 'text', false],
    ]);
    expect(v.fields![0].options).toEqual([{ id: 'to-oH', name: 'Hoch', color: 'red' }, { id: 'to-oN', name: 'Niedrig' }]);
    const eins = (r.ws.notes ?? []).find((n) => n.title === 'Eins')!;
    expect(eins.fields).toEqual({ 'tf-cfP': 'to-oH', 'tf-cfZ': 13, 'tf-cfD': CFd.cleanValue({ type: 'date' }, eins.fields?.['tf-cfD']), 'tf-cfC': true, 'tf-cfT': 'Müller' });
    expect(String(eins.fields?.['tf-cfD'])).toMatch(/^2026-12-0[67]$/);
    expect(eins.votes?.length).toBe(2);
    const zwei = (r.ws.notes ?? []).find((n) => n.title === 'Zwei')!;
    expect(zwei.fields).toBeUndefined();
    expect(zwei.votes).toBeUndefined();
  });

  it('Rundlauf unverändert: Ids, pos, rohe Angaben, Uhrzeit am Datum, unbekannte Einträge', () => {
    const r = T.importTrello(W.defaultWorkspace(), JSON.stringify(board()), { now: 1_800_000_000_000 });
    if (!r.ok) throw new Error(r.error);
    const out = JSON.parse(T.exportTrello(r.ws, r.project, { now: 1_800_000_000_000 }));
    const b = board();
    expect(out.prefs).toEqual(b.prefs);
    expect(out.customFields).toEqual(b.customFields.map((f) => (f.options ? { ...f, options: f.options } : f)));
    const c1 = out.cards.find((c: { id: string }) => c.id === 'c1');
    expect(c1.customFieldItems).toEqual([b.cards[0].customFieldItems[5], ...b.cards[0].customFieldItems.slice(0, 5)]);
    expect(c1.idMembersVoted).toEqual(['m1', 'm2']);
    const c2 = out.cards.find((c: { id: string }) => c.id === 'c2');
    expect(c2.customFieldItems).toEqual([]);
    expect(c2.idMembersVoted).toEqual([]);
  });

  it('Änderungen gehen zurück: Wert, neue Wahl, neues Feld, Stimme, Abstimmen aus', () => {
    const r = T.importTrello(W.defaultWorkspace(), JSON.stringify(board()), { now: 1_800_000_000_000 });
    if (!r.ok) throw new Error(r.error);
    let ws = r.ws;
    const vid = r.view;
    const zwei = (ws.notes ?? []).find((n) => n.title === 'Zwei')!.id;
    const eins = (ws.notes ?? []).find((n) => n.title === 'Eins')!.id;
    const d = (id: string) => CFd.fieldById(No.viewById(ws, vid), id)!;
    ws = CFd.addOption(ws, vid, 'tf-cfP', 'Mittel', 'yellow', { id: 'om' })!.ws;
    ws = CFd.setFieldValue(ws, zwei, d('tf-cfP'), 'om');
    ws = CFd.setFieldValue(ws, eins, d('tf-cfZ'), 21);
    ws = CFd.addField(ws, vid, 'Region', 'text', { id: 'fr' })!.ws;
    ws = CFd.setFieldValue(ws, zwei, d('fr'), 'Nord');
    const anna = (ws.persons ?? []).find((p) => p.name === 'Anna Berg')!.id;
    ws = CFd.toggleVote(ws, zwei, anna);
    ws = CFd.setBoardVotes(ws, vid, false);
    const out = JSON.parse(T.exportTrello(ws, r.project, { now: 1_800_000_000_000 }));
    expect(out.prefs.voting).toBe('disabled');
    const prio = out.customFields.find((f: { name: string }) => f.name === 'Priorität');
    const mittel = prio.options.find((o: { value: { text: string } }) => o.value.text === 'Mittel');
    expect(mittel).toMatchObject({ idCustomField: 'cfP', color: 'yellow' });
    const region = out.customFields.find((f: { name: string }) => f.name === 'Region');
    expect(region).toMatchObject({ type: 'text', idModel: 'b1', modelType: 'board', display: { cardFront: false } });
    const c2 = out.cards.find((c: { id: string }) => c.id === 'c2');
    const it2 = (fid: string) => c2.customFieldItems.find((i: { idCustomField: string }) => i.idCustomField === fid);
    expect(it2('cfP').idValue).toBe(mittel.id);
    expect(it2(region.id).value).toEqual({ text: 'Nord' });
    expect(c2.idMembersVoted).toEqual(['m1']);
    const c1 = out.cards.find((c: { id: string }) => c.id === 'c1');
    expect(c1.customFieldItems.find((i: { idCustomField: string }) => i.idCustomField === 'cfZ')).toEqual({ id: 'i2', idCustomField: 'cfZ', idModel: 'c1', modelType: 'card', value: { number: '21' } });
    // und wieder herein
    const back = T.importTrello(W.defaultWorkspace(), JSON.stringify(out), { now: 1_800_000_000_001 });
    if (!back.ok) throw new Error(back.error);
    const z = (back.ws.notes ?? []).find((n) => n.title === 'Zwei')!;
    const bv = No.viewById(back.ws, back.view)!;
    expect(bv.votes).toBeUndefined();
    const name = (fid: string) => bv.fields!.find((f) => f.id === fid)!.name;
    expect(Object.fromEntries(Object.entries(z.fields ?? {}).map(([k, v]) => [name(k), CFd.valueText(bv.fields!.find((f) => f.id === k)!, v)]))).toEqual({ Priorität: 'Mittel', Region: 'Nord' });
    expect(z.votes?.length).toBe(1);
  });
});
