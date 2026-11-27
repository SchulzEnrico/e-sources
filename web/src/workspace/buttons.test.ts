import { describe, expect, it } from 'vitest';
import type { Workspace } from './types';
import * as No from './notes';
import * as Sh from './sheets';
import * as W from './workspace';
import * as RS from './ruleSet';
import * as RK from './ruleKit';
import * as RR from './ruleRun';
import * as Ps from './persons';
import * as KM from './kanbanMore';
import { buttonSentence } from './ruleText';
import { KIT_TEXT } from './terms';
import { reducer } from './useWorkspace';

const NOW = Date.UTC(2026, 10, 27, 10);
/** Board A (Offen · In Arbeit · Erledigt) mit Karten k1–k3 in „Offen“. */
const setup = () => {
  let ws: Workspace = W.defaultWorkspace();
  ws = No.createView(ws, 'kanban', 'Board A', { id: 'ka' }).ws;
  ws = No.createView(ws, 'kanban', 'Board B', { id: 'kb' }).ws;
  for (const id of ['k1', 'k2', 'k3']) {
    const c = No.createNote(ws, { title: `Karte ${id}`, text: '- [ ] a' }, { id });
    const r = Sh.moveCard(c.ws, 'ka', id, No.viewById(c.ws, 'ka')!.cols![0].id);
    if (!r.ok) throw new Error('setup');
    ws = r.ws;
  }
  return Ps.ensureMe(ws);
};
const note = (ws: Workspace, id: string) => No.noteById(ws, id)!;
const colName = (ws: Workspace, id: string) => Sh.colOf(No.viewById(ws, 'ka')!, id)?.name;
const btn = (p: Partial<RK.KitButton> & Pick<RK.KitButton, 'then'>): RK.KitButton => ({ id: `b${Math.random().toString(36).slice(2, 7)}`, name: 'An Abnahme', kind: 'card', ...p });

describe('V130 F-231 K10b Knöpfe: Datenmodell', () => {
  it('speichern, kopieren, ordnen, löschen + Rückgängig; Lesen prüft wie parseRules; andere Teile von ruleSet bleiben', () => {
    let ws = RS.setWhen(setup(), 'doneChecks', true);
    expect(RK.saveButton(ws, { id: 'x', name: '  ', kind: 'card', then: [] })).toBe(ws); // ohne Name nicht
    ws = RK.saveButton(ws, { id: 'c1', name: 'Eins', kind: 'card', then: [{ k: 'tagAdd', a: 'a' }] });
    ws = RK.saveButton(ws, { id: 'b1', name: 'Brett', kind: 'board', col: 'Erledigt', board: 'ka', then: [{ k: 'archive' }] });
    ws = RK.saveButton(ws, { id: 'c2', name: 'Zwei', kind: 'card', board: 'kb', then: [{ k: 'nextCol' }] });
    expect(ws.ruleSet!.when).toEqual(['doneChecks']);
    expect(RK.buttonsFor(RK.buttonsOf(ws), 'ka', 'card').map((b) => b.id)).toEqual(['c1']);
    expect(RK.buttonsFor(RK.buttonsOf(ws), 'kb', 'card').map((b) => b.id)).toEqual(['c1', 'c2']);
    // Verschieben springt über Knöpfe anderer Art
    ws = RK.moveButton(ws, 'c2', -1);
    expect(RK.buttonsOf(ws).map((b) => b.id)).toEqual(['c2', 'b1', 'c1']);
    ws = RK.copyButton(ws, 'b1', 'b2');
    expect(RK.buttonsOf(ws).find((b) => b.id === 'b2')!.name).toBe('Brett (Kopie)');
    const del = RK.removeButton(ws, 'b1')!;
    expect(RK.buttonsOf(RK.restoreButton(del.ws, del.undo)).map((b) => b.id)).toEqual(RK.buttonsOf(ws).map((b) => b.id));
    // Regel speichern lässt Knöpfe stehen
    ws = RK.saveRule(ws, { id: 'r1', no: 1, name: 'R', on: true, when: { k: 'done' }, ifs: [], then: [{ k: 'archive' }] });
    expect(RK.buttonsOf(ws).length).toBe(4);
    // Lesen: kaputte Knöpfe und Bausteine fallen weg, Spalte nur bei Board-Knöpfen
    const parsed = RS.parseRuleSet({ buttons: [{ id: 'a', name: 'A', kind: 'card', col: 'X', then: [{ k: 'tagAdd', a: 't' }, { k: 'nix' }] }, { id: 'b', name: 'B', kind: 'quatsch', then: [] }, { id: 'a', name: 'doppelt', kind: 'card', then: [] }] })!;
    expect(parsed.buttons).toEqual([{ id: 'a', name: 'A', kind: 'card', then: [{ k: 'tagAdd', a: 't' }] }]);
    expect(RK.missingButton({ name: 'x', then: [] })).toEqual({ where: 'then', what: 'none' });
    expect(RK.missingButton({ name: 'x', then: [{ k: 'toCol' }] })).toEqual({ where: 'then', i: 0, what: 'arg' });
    expect(buttonSentence(ws, { kind: 'board', col: 'Erledigt', then: [{ k: 'archive' }] })).toBe('Auf Klick für alle sichtbaren Karten der Spalte „Erledigt“: archivieren.');
  });
});

describe('V130 F-231 K10b Knöpfe: Ausführung', () => {
  it('Karten-Knopf: Folge von Aktionen, Spur „Knopf · Name“, ein Rückgängig, Meldung', () => {
    const ws = setup();
    const b = btn({ then: [{ k: 'toCol', a: 'In Arbeit' }, { k: 'assign', a: 'me' }, { k: 'dueSet', n: 3 }, { k: 'notice', a: 'Ab zu {titel}' }] });
    const out = reducer(ws, { type: 'btnPress', button: b, ids: ['k1'], view: 'ka', now: NOW, token: 't1' });
    expect(colName(out, 'k1')).toBe('In Arbeit');
    expect(note(out, 'k1').assignee).toBe(Ps.meId(out));
    expect(note(out, 'k1').due).toBe('2026-11-30');
    const run = RR.runOf(out)!;
    expect(run.names).toEqual(['Knopf · An Abnahme']);
    expect(run.texts).toEqual(['Ab zu Karte k1']);
    expect([run.view, run.token, run.cards]).toEqual(['ka', 't1', 1]);
    expect(run.before).toBe(ws);
    expect((note(out, 'k1').trail ?? []).some((e) => e.by === 'Knopf · An Abnahme')).toBe(true);
    expect(KIT_TEXT.ran(run.names, run.cards, false)).toBe('Knopf · An Abnahme: 1 Karte geändert.');
  });

  it('löst Regeln aus (Kette) – alles ein Rückgängig; nichts zu ändern = gleicher Stand', () => {
    let ws = setup();
    ws = RK.saveRule(ws, { id: 'r1', no: 1, name: 'Fertig-Tag', on: true, when: { k: 'colIn', a: 'Erledigt' }, ifs: [], then: [{ k: 'tagAdd', a: 'fertig' }] });
    const b = btn({ name: 'Fertig', then: [{ k: 'toCol', a: 'Erledigt' }] });
    const out = RR.pressButton(ws, b, ['k1'], 'ka', NOW);
    expect(note(out, 'k1').tags).toEqual(['fertig']);
    const run = RR.runOf(out)!;
    expect(run.names).toEqual(['Knopf · Fertig', 'Regel R1 · Fertig-Tag']);
    expect(run.before).toBe(ws);
    expect(KIT_TEXT.ran(run.names, run.cards, false)).toBe('Knopf · Fertig (+ Regel R1 · Fertig-Tag): 1 Karte geändert.');
    // noch einmal: Karte liegt schon in „Erledigt“ mit Tag → nichts zu tun
    expect(RR.pressButton(out, b, ['k1'], 'ka', NOW)).toBe(out);
    // Reducer: nach btnPress laufen die Regeln nicht noch einmal (Kette lief im Knopf)
    const red = reducer(ws, { type: 'btnPress', button: b, ids: ['k1'], view: 'ka', now: NOW });
    expect(RR.runOf(red)!.names).toEqual(['Knopf · Fertig', 'Regel R1 · Fertig-Tag']);
  });

  it('Board-Knopf: wirkt auf mehrere Karten; Kartenvorlagen bleiben unberührt', () => {
    let ws = setup();
    ws = KM.setTemplate(ws, 'k3', true);
    const b = btn({ name: 'Alle dringend', kind: 'board', then: [{ k: 'urgentSet' }, { k: 'tagAdd', a: 'woche' }] });
    const out = RR.pressButton(ws, b, ['k1', 'k2', 'k3'], 'ka', NOW);
    expect(['k1', 'k2', 'k3'].map((id) => !!note(out, id).urgent)).toEqual([true, true, false]);
    expect(RR.runOf(out)!.cards).toBe(2);
  });
});
