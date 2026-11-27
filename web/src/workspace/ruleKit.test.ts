import { describe, expect, it } from 'vitest';
import type { Workspace } from './types';
import * as No from './notes';
import * as Sh from './sheets';
import * as W from './workspace';
import * as Mi from './mirrors';
import * as RS from './ruleSet';
import * as RK from './ruleKit';
import * as RR from './ruleRun';
import * as Ps from './persons';
import * as Cm from './comments';
import { reducer } from './useWorkspace';

const NOW = Date.UTC(2026, 10, 27, 10);
/** Zwei Boards (Offen · In Arbeit · Erledigt), Karte „Karte“ in A/Offen. */
const setup = () => {
  let ws: Workspace = W.defaultWorkspace();
  ws = No.createView(ws, 'kanban', 'Board A', { id: 'ka' }).ws;
  ws = No.createView(ws, 'kanban', 'Board B', { id: 'kb' }).ws;
  const c = No.createNote(ws, { title: 'Karte', text: '- [ ] a\n- [ ] b' }, { id: 'k' });
  const r = Sh.moveCard(c.ws, 'ka', 'k', No.viewById(c.ws, 'ka')!.cols![0].id);
  if (!r.ok) throw new Error('setup');
  return Ps.ensureMe(r.ws);
};
const col = (ws: Workspace, v: string, i: number) => No.viewById(ws, v)!.cols![i].id;
const colName = (ws: Workspace, v: string, id: string) => Sh.colOf(No.viewById(ws, v)!, id)?.name;
const note = (ws: Workspace, id = 'k') => No.noteById(ws, id)!;
let seq = 0;
const rule = (p: Partial<RK.KitRule> & Pick<RK.KitRule, 'when' | 'then'>): RK.KitRule => ({ id: `r${++seq}`, no: seq, name: `Regel ${seq}`, on: true, ifs: [], ...p });
const withRules = (ws: Workspace, ...rules: RK.KitRule[]) => rules.reduce((w, r) => RK.saveRule(w, r), ws);
const move = (ws: Workspace, v: string, i: number, id = 'k') => reducer(ws, { type: 'cardMove', view: v, note: id, col: col(ws, v, i) });

describe('V129 F-231 K10a Regel-Baukasten: Datenmodell und Umzug W1–W4', () => {
  it('ohne Liste gelten die vier mitgelieferten Regeln mit Ein/Aus aus `when`; Speichern legt die Liste an', () => {
    let ws = setup();
    expect(RK.kitOf(ws).map((r) => RK.ruleTag(r))).toEqual(['W1', 'W2', 'W3', 'W4']);
    ws = RS.setWhen(ws, 'checksNext', true);
    expect(ws.ruleSet).toEqual({ when: ['checksNext'] });
    expect(RS.whenOn(ws, 'checksNext')).toBe(true);
    ws = withRules(ws, rule({ when: { k: 'colIn', a: 'Erledigt' }, then: [{ k: 'tagAdd', a: 'fertig' }] }));
    expect(ws.ruleSet!.when).toBeUndefined();
    expect(ws.ruleSet!.rules!.length).toBe(5);
    expect(RS.whenOn(ws, 'checksNext')).toBe(true);
    ws = RS.setWhen(ws, 'checksNext', false);
    expect(RS.whenOn(ws, 'checksNext')).toBe(false);
    // Abgleich/Datei: Liste wird gelesen, kaputte Bausteine fallen weg, fehlende mitgelieferte kommen dazu
    const parsed = RS.parseRuleSet({ rules: [{ id: 'x', no: 4, name: 'X', on: true, when: { k: 'colIn', a: 'Erledigt' }, ifs: [{ k: 'quatsch' }, { k: 'hasTag', a: 'a', not: true }], then: [{ k: 'tagAdd', a: 'b' }, { k: 'nix' }] }] })!;
    expect(parsed.rules!.length).toBe(5);
    expect(parsed.rules![0]).toEqual({ id: 'x', no: 4, name: 'X', on: true, when: { k: 'colIn', a: 'Erledigt' }, ifs: [{ k: 'hasTag', a: 'a', not: true }], then: [{ k: 'tagAdd', a: 'b' }] });
    // Regel ohne Aktion bleibt erhalten, ist aber aus
    expect(RK.cleanRule({ id: 'y', when: { k: 'done' }, then: [], on: true })!.on).toBe(false);
  });

  it('mitgelieferte Regeln: bearbeiten, „geändert“, auf Werk zurück, nicht löschen; eigene kopieren, löschen + Rückgängig', () => {
    let ws = RS.setWhen(setup(), 'archiveOld', true);
    const w3 = RK.kitOf(ws).find((r) => r.w === 'archiveOld')!;
    ws = RK.saveRule(ws, { ...w3, ifs: [{ k: 'doneSince', n: 14 }] });
    const changed = RK.kitOf(ws).find((r) => r.w === 'archiveOld')!;
    expect(RK.changedBuiltIn(changed)).toBe(true);
    expect(changed.on).toBe(true);
    expect(RK.removeRule(ws, changed.id)).toBeNull();
    ws = RK.resetBuiltIn(ws, changed.id);
    expect(RK.changedBuiltIn(RK.kitOf(ws).find((r) => r.w === 'archiveOld')!)).toBe(false);
    ws = RK.copyRule(ws, changed.id, 'c1');
    const copy = RK.kitOf(ws).find((r) => r.id === 'c1')!;
    expect([copy.w, copy.on, RK.ruleTag(copy), copy.name]).toEqual([undefined, false, 'R1', 'Altes Erledigtes archivieren (Kopie)']);
    const del = RK.removeRule(ws, 'c1')!;
    expect(RK.kitOf(del.ws).some((r) => r.id === 'c1')).toBe(false);
    expect(RK.kitOf(RK.restoreRule(del.ws, del.undo)).map((r) => r.id)).toEqual(RK.kitOf(ws).map((r) => r.id));
    expect(RK.missingOf({ name: 'x', when: { k: 'colIn' }, ifs: [], then: [] })).toEqual({ where: 'then', what: 'none' });
    expect(RK.missingOf({ name: 'x', when: { k: 'field' }, ifs: [], then: [{ k: 'nextCol' }] })).toEqual({ where: 'when', what: 'arg' });
  });
});

describe('V129 F-231 K10a Ausführung', () => {
  it('Wenn Karte nach „Erledigt“ und ohne Tag, dann Tag + zuständig ich + Kommentar; Spur nennt die Regel; ein Rückgängig für alles', () => {
    let ws = withRules(setup(), rule({ name: 'Fertig markieren', when: { k: 'colIn', a: 'erledigt' }, ifs: [{ k: 'hasTag', a: 'fertig', not: true }], then: [{ k: 'tagAdd', a: 'fertig' }, { k: 'assign', a: 'me' }, { k: 'comment', a: 'Fertig am {heute}: {titel}' }] }));
    const r0 = RK.kitOf(ws).find((r) => r.name === 'Fertig markieren')!;
    const before = move(ws, 'ka', 1);
    expect(note(before).tags).toBeUndefined();
    ws = move(before, 'ka', 2);
    const n = note(ws);
    expect(n.tags).toEqual(['fertig']);
    expect(n.assignee).toBe(Ps.meId(ws));
    expect(Cm.commentsOf(n).at(-1)!.text).toMatch(/^Fertig am \d\d\.\d\d\.\d{4}: Karte$/);
    expect(n.trail.some((e) => e.by === `Regel ${RK.ruleTag(r0)} · Fertig markieren`)).toBe(true);
    const run = RR.runOf(ws)!;
    expect(run.names).toEqual([`Regel ${RK.ruleTag(r0)} · Fertig markieren`]);
    expect(run.view).toBe('ka');
    // Rückgängig: der Zug der Karte bleibt, die Regel-Änderungen sind weg
    const undone = reducer(ws, { type: 'exchange', ws: run.before });
    expect(colName(undone, 'ka', 'k')).toBe('Erledigt');
    expect(note(undone).tags).toBeUndefined();
    // Rückgängig löst selbst keine Regeln aus
    expect(RR.runOf(undone)).toBeUndefined();
  });

  it('Ketten bis 3 Stufen, jede Regel einmal je Änderung (kein Kreislauf)', () => {
    let ws = withRules(
      setup(),
      rule({ when: { k: 'colIn', a: 'In Arbeit' }, then: [{ k: 'tagAdd', a: 'eins' }] }),
      rule({ when: { k: 'tagAdd', a: 'eins' }, then: [{ k: 'tagAdd', a: 'zwei' }] }),
      rule({ when: { k: 'tagAdd', a: 'zwei' }, then: [{ k: 'tagAdd', a: 'drei' }] }),
      rule({ when: { k: 'tagAdd', a: 'drei' }, then: [{ k: 'tagAdd', a: 'vier' }] }),
    );
    ws = move(ws, 'ka', 1);
    expect(note(ws).tags).toEqual(['eins', 'zwei', 'drei']);
    expect(RR.runOf(ws)!.cut).toBe(true);
    // Pingpong: A → B und B → A läuft je einmal, dann Ende
    let pp = withRules(setup(), rule({ when: { k: 'colIn', a: 'In Arbeit' }, then: [{ k: 'toCol', a: 'Erledigt' }] }), rule({ when: { k: 'colIn', a: 'Erledigt' }, then: [{ k: 'toCol', a: 'In Arbeit' }] }));
    pp = move(pp, 'ka', 1);
    expect(colName(pp, 'ka', 'k')).toBe('In Arbeit');
    expect(RR.runOf(pp)!.names.length).toBe(2);
  });

  it('Geltungsbereich Board; Spiegel: Spalten-Regeln ja, Zustands-Regeln nur auf dem Heimat-Board (A3)', () => {
    let ws = setup();
    const m = Mi.mirrorCard(ws, 'k', 'kb', { colState: Sh.colStateOf });
    if (!m.ok) throw new Error(m.reason);
    ws = withRules(m.ws, rule({ board: 'kb', when: { k: 'colIn', a: 'In Arbeit' }, then: [{ k: 'tagAdd', a: 'b-spalte' }] }), rule({ board: 'kb', when: { k: 'done' }, then: [{ k: 'tagAdd', a: 'b-erledigt' }] }), rule({ board: 'ka', when: { k: 'done' }, then: [{ k: 'tagAdd', a: 'a-erledigt' }] }));
    const onA = move(ws, 'ka', 1);
    expect(note(onA).tags).toBeUndefined();
    const onB = move(ws, 'kb', 1);
    expect(note(onB).tags).toEqual(['b-spalte']);
    const done = move(ws, 'ka', 2);
    expect(note(done).tags).toEqual(['a-erledigt']);
  });

  it('W1 und W2 als Bausteine verhalten sich wie bis V128', () => {
    let ws = RS.setWhen(RS.setWhen(setup(), 'doneChecks', true), 'checksNext', true);
    const done = move(ws, 'ka', 2);
    expect(note(done).text).toBe('- [x] a\n- [x] b');
    expect(colName(done, 'ka', 'k')).toBe('Erledigt');
    ws = reducer(ws, { type: 'noteEdit', id: 'k', patch: { text: '- [x] a\n- [x] b' } });
    expect(colName(ws, 'ka', 'k')).toBe('In Arbeit');
    // direkt über die Engine
    const edited = No.updateNote(setup(), 'k', { text: '- [x] a\n- [x] b' });
    const on = RS.setWhen(edited, 'checksNext', true);
    const after = RR.applyRules(RS.setWhen(setup(), 'checksNext', true), on, NOW);
    expect(colName(after, 'ka', 'k')).toBe('In Arbeit');
  });

  it('regelmäßig: W3 archiviert, W4 markiert dringend; eigene Prüf-Regel mit Bedingungen', () => {
    let ws = RS.setWhen(RS.setWhen(setup(), 'archiveOld', true), 'dueUrgent', true);
    ws = No.createNote(ws, { title: 'Alt' }, { id: 'old', now: NOW - 40 * 864e5 }).ws;
    ws = No.setState(ws, 'old', 'done', { now: NOW - 31 * 864e5 });
    ws = No.updateNote(ws, 'k', { due: No.shiftDay(No.dayOf(NOW), 1) });
    const r = RR.runCheck(ws, NOW);
    expect(note(r.ws, 'old').state).toBe('archived');
    expect(note(r.ws).urgent).toBe(true);
    expect(r.run!.names).toEqual(['Regel W3 · Altes Erledigtes archivieren', 'Regel W4 · Fälliges wird dringend']);
    // gleiches Ergebnis wie das alte sweep
    const s = RS.sweep(ws, NOW);
    expect([s.archived, s.urgent]).toEqual([1, 1]);
    expect(RR.runCheck(r.ws, NOW).run).toBeUndefined();
  });

  it('weitere Aktionen: nächste Spalte, oben, Termine, Haken, Titel, Feld-loses Board, Meldung', () => {
    let ws = withRules(
      setup(),
      rule({ when: { k: 'tagAdd', a: 'eilt' }, then: [{ k: 'toCol', a: 'Erledigt', b: 'top' }, { k: 'dueSet', n: 2 }, { k: 'titlePre', a: '! ' }, { k: 'notice', a: '{titel} eilt' }, { k: 'fieldSet', a: 'gibt es nicht', b: 'x' }] }),
      rule({ when: { k: 'tagDel', a: 'eilt' }, then: [{ k: 'reopen' }, { k: 'dueDel' }, { k: 'uncheckAll' }] }),
    );
    ws = reducer(ws, { type: 'noteTags', id: 'k', tags: ['eilt'] });
    expect(colName(ws, 'ka', 'k')).toBe('Erledigt');
    expect(note(ws).due).toBe(No.shiftDay(No.dayOf(), 2));
    expect(No.titleOf(note(ws))).toBe('! Karte');
    expect(RR.runOf(ws)!.texts).toEqual(['! Karte eilt']);
    ws = reducer(ws, { type: 'noteTags', id: 'k', tags: [] });
    expect(note(ws).state).toBe('open');
    expect(colName(ws, 'ka', 'k')).toBe('Offen');
    expect(note(ws).due).toBeUndefined();
  });
});

describe('V129 F-231 K10a Satz', () => {
  it('liest sich als deutscher Satz', async () => {
    const RT = await import('./ruleText');
    const ws = setup();
    expect(RT.sentenceOf(ws, { when: { k: 'colIn', a: 'Erledigt' }, ifs: [{ k: 'hasTag', a: 'fertig', not: true }], then: [{ k: 'tagAdd', a: 'fertig' }, { k: 'assign', a: 'me' }, { k: 'dueSet', n: 3 }] })).toBe(
      'Wenn eine Karte in die Spalte „Erledigt“ kommt und sie den Tag „fertig“ nicht hat, dann den Tag „fertig“ setzen, mich zuständig machen und „fällig“ auf heute + 3 Tage setzen.',
    );
    expect(RT.sentenceOf(ws, RK.builtIn('dueUrgent'))).toBe('Wenn die regelmäßige Prüfung läuft (beim Start und stündlich) und sie in höchstens 1 Tag fällig ist (oder überfällig), sie offen ist und sie nicht dringend ist, dann als dringend markieren.');
    expect(RT.scopeText(ws, { board: 'ka' })).toBe('nur „Board A“');
  });
});
