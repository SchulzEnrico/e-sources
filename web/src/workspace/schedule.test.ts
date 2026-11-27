import { describe, expect, it } from 'vitest';
import type { Workspace } from './types';
import * as No from './notes';
import * as Sh from './sheets';
import * as W from './workspace';
import * as RS from './ruleSet';
import * as RK from './ruleKit';
import * as RR from './ruleRun';
import * as RT from './ruleTime';
import * as Ps from './persons';
import * as KM from './kanbanMore';
import { setCalendar } from './calendar';
import { sentenceOf } from './ruleText';
import { KIT_TEXT } from './terms';

/** Ortszeit (Fr 27.11.2026 ist ein Freitag). */
const at = (d: number, h = 12, m = 0, mo = 10) => new Date(2026, mo, d, h, m).getTime();
/** Board A (Offen · In Arbeit · Erledigt) mit k1, k2 und der Kartenvorlage „Wochenbericht“ (tpl). */
const setup = () => {
  let ws: Workspace = W.defaultWorkspace();
  ws = No.createView(ws, 'kanban', 'Board A', { id: 'ka' }).ws;
  for (const id of ['k1', 'k2', 'tpl']) {
    const c = No.createNote(ws, { title: id === 'tpl' ? 'Wochenbericht' : `Karte ${id}`, text: '- [ ] a' }, { id });
    const r = Sh.moveCard(c.ws, 'ka', id, No.viewById(c.ws, 'ka')!.cols![0].id);
    if (!r.ok) throw new Error('setup');
    ws = r.ws;
  }
  ws = KM.setTemplate(ws, 'tpl', true);
  return Ps.ensureMe(ws);
};
const note = (ws: Workspace, id: string) => No.noteById(ws, id)!;
const colName = (ws: Workspace, id: string) => Sh.colOf(No.viewById(ws, 'ka')!, id)?.name;
const weekly: RK.KitRule = {
  id: 'r1', no: 1, name: 'Wochenbericht', on: true, board: 'ka', when: { k: 'weekly', n: 1, b: '09:00' }, ifs: [],
  then: [{ k: 'fromTpl', a: 'tpl', b: 'In Arbeit' }, { k: 'tagAdd', a: 'Woche' }, { k: 'dueSet', n: 2 }],
};

describe('V131 F-231 K10c: Termine des Zeitplans', () => {
  it('täglich, Arbeitstage (mit Feiertagen), wöchentlich, monatlich (letzter Tag), vorige und nächste Wiederholung', () => {
    expect(RT.weekdayOf('2026-11-30')).toBe(1);
    expect(RT.lastOccurrence({ k: 'weekly', n: 1, b: '09:00' }, at(30, 10))!.day).toBe('2026-11-30');
    expect(RT.lastOccurrence({ k: 'weekly', n: 1, b: '09:00' }, at(30, 8))!.stamp).toBe('2026-11-23T09:00');
    expect(RT.nextOccurrence({ k: 'weekly', n: 1, b: '09:00' }, at(30, 8))!.stamp).toBe('2026-11-30T09:00');
    expect(RT.lastOccurrence({ k: 'monthly', n: 31 }, at(30, 1))!.day).toBe('2026-11-30'); // November hat 30 Tage
    expect(RT.lastOccurrence({ k: 'workdays' }, at(29))!.day).toBe('2026-11-27'); // Sonntag → Freitag
    setCalendar({ region: 'HH' });
    expect(RT.onDay({ k: 'workdays' }, '2026-12-25')).toBe(false); // 1. Weihnachtstag
    expect(RT.onDay({ k: 'workdays' }, '2026-12-23')).toBe(true);
    setCalendar(undefined);
    expect(RT.lastOccurrence({ k: 'daily' }, at(30, 0, 5))!.stamp).toBe('2026-11-30T00:00');
    expect(RT.recurId('r1', '2026-11-30T09:00')).toBe('r1~2026-11-30T0900');
  });
});

describe('V131 F-231 K10c: wiederkehrende Karte (B5) und Nachholen (B6)', () => {
  it('scharf stellen zählt erst ab dann; je Termin eine Karte aus der Vorlage mit fester Kennung; Folgeaktionen gelten der neuen Karte', () => {
    let ws = RT.arm(RK.saveRule(setup(), weekly), 'r1', at(27));
    expect(ws.ruleSet!.ran!.r1).toBe('2026-11-23T09:00');
    expect(RR.runCheck(ws, at(27, 13)).ws).toBe(ws); // nichts Neues
    const before = ws;
    const res = RR.runCheck(ws, at(30, 9, 30));
    ws = res.ws;
    const id = RT.recurId('r1', '2026-11-30T09:00');
    const n = note(ws, id);
    expect(No.titleOf(n)).toBe('Wochenbericht');
    expect(n.template).toBeUndefined();
    expect(colName(ws, id)).toBe('In Arbeit');
    expect(n.tags).toEqual(['Woche']);
    expect(n.due).toBe('2026-12-02'); // ab dem Tag der Wiederholung
    expect(note(ws, 'tpl').tags).toBeUndefined(); // die Vorlage bleibt unberührt
    expect(res.run!.made).toBe(1);
    expect(res.run!.late).toBe(0);
    expect(res.run!.before).toBe(before); // ein Rückgängig für alles
    expect(KIT_TEXT.ran(res.run!.names, res.run!.cards, false, res.run!.made, res.run!.late)).toBe('Regel R1 · Wochenbericht: 1 wiederkehrende Karte angelegt.');
    expect(ws.ruleSet!.ran!.r1).toBe('2026-11-30T09:00');
    expect(RR.runCheck(ws, at(30, 9, 35)).ws).toBe(ws); // kein zweites Mal
  });

  it('App war zu: nur die letzte verpasste Wiederholung, als nachgeholt gemeldet; zweites Gerät legt nichts doppelt an', () => {
    const armed = RT.arm(RK.saveRule(setup(), weekly), 'r1', at(27));
    const res = RR.runCheck(armed, at(16, 8, 0, 11)); // Mi 16.12.: 30.11., 07.12., 14.12. verpasst
    const made = No.notesOf(res.ws).filter((n) => n.id.startsWith('r1~'));
    expect(made.map((n) => n.id)).toEqual([RT.recurId('r1', '2026-12-14T09:00')]);
    expect(res.run!.late).toBe(1);
    expect(KIT_TEXT.ran(res.run!.names, res.run!.cards, false, res.run!.made, res.run!.late)).toContain('1 wiederkehrende Karte angelegt (1 nachgeholt)');
    // Gerät B hat die Karte schon über den Abgleich, aber noch den alten Stand in ran
    const b = { ...armed, notes: res.ws.notes, noteViews: res.ws.noteViews };
    const again = RR.runCheck(b, at(16, 8, 5, 11));
    expect(No.notesOf(again.ws).filter((n) => n.id.startsWith('r1~')).length).toBe(1);
    expect(again.ws.ruleSet!.ran!.r1).toBe('2026-12-14T09:00');
    expect(again.run).toBeUndefined(); // nichts angelegt → keine Meldung, nur der Stand
  });

  it('Zeitplan ohne Vorlage wirkt auf jede passende Karte des Boards; ausgeschaltet läuft nichts, Einschalten stellt neu scharf', () => {
    let ws = RK.saveRule(setup(), { id: 'r2', no: 2, name: 'Freitags', on: true, board: 'ka', when: { k: 'weekly', n: 5 }, ifs: [{ k: 'titleHas', a: 'k1' }], then: [{ k: 'tagAdd', a: 'Fr' }] });
    ws = RT.arm(ws, 'r2', at(20));
    ws = RR.runCheck(ws, at(27, 7)).ws;
    expect(note(ws, 'k1').tags).toEqual(['Fr']);
    expect(note(ws, 'k2').tags).toBeUndefined();
    expect(note(ws, 'tpl').tags).toBeUndefined();
    // aus → kein Lauf; wieder an → erst ab dann
    ws = RK.setOn(ws, 'r2', false);
    expect(RR.runCheck(ws, at(4, 7, 0, 11)).ws).toBe(ws);
    const old = RK.kitOf(ws).find((r) => r.id === 'r2');
    ws = RT.armIfNeeded(RK.setOn(ws, 'r2', true), old, 'r2', at(8, 12, 0, 11));
    expect(ws.ruleSet!.ran!.r2).toBe('2026-12-04T00:00');
  });
});

describe('V131 F-231 K10c: Fälligkeit', () => {
  it('n Tage vor „fällig“ einmal je Termin; neuer Termin löst wieder aus; Termine vor dem Scharfstellen nicht; Stunden nach „fällig“', () => {
    let ws = setup();
    ws = No.updateNote(ws, 'k1', { due: '2026-12-03' });
    ws = No.updateNote(ws, 'k2', { due: '2026-11-20' }); // schon vorbei
    ws = RK.saveRule(ws, { id: 'r3', no: 3, name: 'Bald fällig', on: true, when: { k: 'dueNear', a: 'before', n: 1, b: 'd' }, ifs: [{ k: 'state', a: 'open' }], then: [{ k: 'urgentSet' }, { k: 'comment', a: 'Morgen fällig ({heute})' }] });
    ws = RT.arm(ws, 'r3', at(27));
    expect(RR.runCheck(ws, at(1, 12, 0, 11)).ws).toBe(ws); // 01.12.: noch nicht
    const r1 = RR.runCheck(ws, at(2, 8, 0, 11));
    ws = r1.ws;
    expect(note(ws, 'k1').urgent).toBe(true);
    expect(note(ws, 'k2').urgent).toBeUndefined();
    expect(r1.run!.names).toEqual(['Regel R3 · Bald fällig']);
    expect(ws.ruleSet!.ran![RT.ranKey('r3', 'k1')]).toBe('2026-12-03T');
    expect(RR.runCheck(ws, at(2, 9, 0, 11)).ws).toBe(ws);
    ws = No.updateNote(ws, 'k1', { due: '2026-12-10' });
    const r2 = RR.runCheck(ws, at(9, 6, 0, 11));
    expect(r2.run).toBeTruthy(); // Kommentar erneut
    // Stunden nach „fällig“ mit Uhrzeit
    let w2 = No.updateNote(setup(), 'k1', { due: '2026-12-03', dueTime: '10:00' });
    w2 = RT.arm(RK.saveRule(w2, { id: 'r4', no: 4, name: 'Überfällig', on: true, when: { k: 'dueNear', a: 'after', n: 2, b: 'h' }, ifs: [], then: [{ k: 'tagAdd', a: 'spät' }] }), 'r4', at(27));
    expect(note(RR.runCheck(w2, at(3, 11, 59, 11)).ws, 'k1').tags).toBeUndefined();
    expect(note(RR.runCheck(w2, at(3, 12, 0, 11)).ws, 'k1').tags).toEqual(['spät']);
  });
});

describe('V131 F-231 K10c: Satz, Lesen, Knopf mit „Karte aus Vorlage“', () => {
  it('Sätze, ran wird gelesen und geprüft, Bausteine werden begrenzt; Knopf legt neue Karte an und setzt dort den Tag', () => {
    const ws = setup();
    expect(sentenceOf(ws, weekly)).toBe('Jeden Montag um 09:00 Uhr: eine Karte aus der Vorlage „Wochenbericht“ in der Spalte „In Arbeit“ anlegen, bei der neuen Karte den Tag „Woche“ setzen und „fällig“ auf heute + 2 Tage setzen.');
    expect(sentenceOf(ws, { when: { k: 'dueNear', a: 'before', n: 2, b: 'd' }, ifs: [{ k: 'state', a: 'open' }], then: [{ k: 'urgentSet' }] })).toBe('Wenn eine Karte in 2 Tagen fällig wird und sie offen ist, dann als dringend markieren.');
    expect(sentenceOf(ws, { when: { k: 'monthly', n: 31 }, ifs: [{ k: 'inCol', a: 'Erledigt' }], then: [{ k: 'archive' }] })).toBe('Am 31. jedes Monats (in kürzeren Monaten am letzten Tag): für jede Karte, für die gilt: sie in der Spalte „Erledigt“ liegt – archivieren.');
    const rs = RS.parseRuleSet({ ran: { r1: '2026-11-30T09:00', bad: 5 }, rules: [{ id: 'x', no: 1, name: 'X', on: true, when: { k: 'weekly', n: 9, b: '25:00' }, ifs: [], then: [{ k: 'notice', a: 'hi' }] }] })!;
    expect(rs.ran).toEqual({ r1: '2026-11-30T09:00' });
    expect(rs.rules![0].when).toEqual({ k: 'weekly', n: 7 });
    expect(RK.missingOf({ name: 'x', when: { k: 'weekly', n: 1, b: '9 Uhr' }, ifs: [], then: [{ k: 'archive' }] })).toEqual({ where: 'when', what: 'arg' });
    expect(RK.missingOf({ name: 'x', when: { k: 'daily' }, ifs: [], then: [{ k: 'fromTpl' }] })).toEqual({ where: 'then', i: 0, what: 'arg' });
    const out = RR.pressButton(ws, { id: 'b', name: 'Folgekarte', then: [{ k: 'fromTpl', a: 'tpl' }, { k: 'tagAdd', a: 'neu' }] }, ['k1'], 'ka', at(27));
    const fresh = No.notesOf(out).filter((n) => !No.noteById(ws, n.id));
    expect(fresh.length).toBe(1);
    expect(fresh[0].tags).toEqual(['neu']);
    expect(colName(out, fresh[0].id)).toBe('Offen');
    expect(note(out, 'k1').tags).toBeUndefined();
  });
});
