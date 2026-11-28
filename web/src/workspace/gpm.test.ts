import { describe, expect, it } from 'vitest';
import { parseWorkspace } from './storage';
import type { Note, Workspace } from './types';
import * as W from './workspace';
import * as Pj from './projects';
import * as Psp from './psp';
import * as Rk from './risks';
import * as NLo from './notes';
import * as Gp from './gpm';
import * as Fk from './formKit';
import * as Sp from './sampleProject';
import * as Gt from './gantt';
import * as Sch from './schedule';
import * as H from './help';
import { TOURS } from './tour';
import * as Rpt from './gpmReport';
import * as Cs from './charterSheet';
import * as Lv from './liveProject';

describe('F-226 Datenmodell (V109): Ziele, Stakeholder, Phasen, Risiken quantitativ, Einsätze', () => {
  const base = () => {
    const { ws, id } = Pj.addProject(W.defaultWorkspace(), 'Werkstatt')!;
    return { ws: Pj.editProject(ws, id, { budget: 400000, psp: { prefix: 'CG' } }), id };
  };
  const proj = (ws: Workspace, id: string) => Pj.projectById(ws, id)!;
  it('Ziele anlegen, ändern, Hierarchie ohne Kreis, Konflikt nur zwischen vorhandenen Zielen', () => {
    const { ws: w0, id } = base();
    let ws = Gp.addItem(w0, id, 'goals', { id: 'g1', code: 'L1', text: 'Werkstatt eröffnet' });
    ws = Gp.addItem(ws, id, 'goals', { id: 'g2', code: 'L1.1', text: 'Lackieranlage abgenommen', parent: 'g1', level: 'must' });
    expect(proj(ws, id).goals!.map((g) => g.id)).toEqual(['g1', 'g2']);
    expect(Gp.addItem(ws, id, 'goals', { id: 'g3', text: '   ' })).toBe(ws);
    ws = Gp.editItem(ws, id, 'goals', 'g1', { parent: 'g2' });
    expect(proj(ws, id).goals![0].parent).toBeUndefined();
    ws = Gp.editItem(ws, id, 'goals', 'g2', { measure: 'Abnahme BSSF bis M4', level: null });
    expect(proj(ws, id).goals![1]).toEqual({ id: 'g2', code: 'L1.1', text: 'Lackieranlage abgenommen', parent: 'g1', measure: 'Abnahme BSSF bis M4' });
    expect(Gp.addItem(ws, id, 'conflicts', { id: 'k0', a: 'g1', b: 'gx' })).toBe(ws);
    ws = Gp.addItem(ws, id, 'conflicts', { id: 'k1', a: 'g1', b: 'g2', first: 'a' });
    expect(proj(ws, id).conflicts).toHaveLength(1);
  });
  it('Ziel löschen nimmt Konflikte mit, löst Unterziele; Rückgängig stellt alles her', () => {
    const { ws: w0, id } = base();
    let ws = Gp.addItem(w0, id, 'goals', { id: 'g1', text: 'A' });
    ws = Gp.addItem(ws, id, 'goals', { id: 'g2', text: 'B', parent: 'g1' });
    ws = Gp.addItem(ws, id, 'conflicts', { id: 'k1', a: 'g1', b: 'g2' });
    const r = Gp.removeItem(ws, id, 'goals', 'g1')!;
    expect(proj(r.ws, id).conflicts).toBeUndefined();
    expect(proj(r.ws, id).goals![0].parent).toBeUndefined();
    const back = Gp.undoRemoveItem(r.ws, r.undo);
    expect(proj(back, id).goals!.map((g) => [g.id, g.parent])).toEqual([['g1', undefined], ['g2', 'g1']]);
    expect(proj(back, id).conflicts!.map((c) => c.id)).toEqual(['k1']);
  });
  it('Phase am Vorgang: nur Phasen des Projekts; Phase löschen löst die Vorgänge', () => {
    const { ws: w0, id } = base();
    let ws = Gp.addItem(w0, id, 'phases', { id: 'ph1', name: 'Konzept & Analyse', share: 15 });
    ws = Psp.addPspTask(ws, id, 'Begehung', { id: 't1' })!.ws;
    expect(Gp.setPhase(ws, 't1', 'ph-x')).toBe(ws);
    ws = Gp.setPhase(ws, 't1', 'ph1');
    expect(Gp.notesOfPhase(ws, id, 'ph1').map((n) => n.id)).toEqual(['t1']);
    const r = Gp.removeItem(ws, id, 'phases', 'ph1')!;
    expect(NLo.noteById(r.ws, 't1')!.phase).toBeUndefined();
    expect(NLo.noteById(Gp.undoRemoveItem(r.ws, r.undo), 't1')!.phase).toBe('ph1');
  });
  it('G5: W/A aus EW % und Tragweite € (Report: R1 2×2, R2 1×5, R3 3×2); ohne Zahlen von Hand', () => {
    expect(Gp.levelFromEw(30)).toBe(2);
    expect(Gp.levelFromEw(10)).toBe(1);
    expect(Gp.levelFromEw(50)).toBe(3);
    expect(Gp.levelFromImpact(10000, 400000)).toBe(2);
    expect(Gp.levelFromImpact(200000, 400000)).toBe(5);
    expect(Gp.levelFromImpact(10000, undefined)).toBeUndefined();
    expect(Gp.riskLevels({ no: 1, p: 4, i: 4 }, 400000)).toEqual({ p: 4, i: 4, pAuto: false, iAuto: false });
    expect(Gp.riskLevels({ no: 1, ew: 50, impact: 10000, p: 1 }, 400000)).toEqual({ p: 3, i: 2, pAuto: true, iAuto: true });
    expect(Gp.riskValue({ ew: 30, impact: 10000 })).toBe(3000);
  });
  it('L4: Maßnahmen, Wert nach Maßnahme, Summen; Chancen getrennt; Felder überstehen editRisk', () => {
    const { ws: w0, id } = base();
    let ws = Rk.addSteer(w0, id, 'risk', { title: 'M3 gefährdet' }, { id: 'r1' } as never)!.ws;
    ws = Rk.editRisk(ws, 'r1', { ew: 30, impact: 10000, measures: [{ id: 'm1', kind: 'prev', text: 'Ausschreibung europaweit', cost: 2000, decided: true, ewAfter: 10 }] });
    ws = Rk.editRisk(ws, 'r1', { strategy: 'reduce' });
    const r = NLo.noteById(ws, 'r1')!.risk!;
    expect(r.ew).toBe(30);
    expect(r.measures).toHaveLength(1);
    expect(Gp.riskValueAfter(r)).toBe(1000);
    ws = Rk.addSteer(ws, id, 'risk', { title: 'Förderung', risk: { chance: true, ew: 50, impact: 4000 } }, { id: 'c1' } as never)!.ws;
    expect(Gp.riskSums(Rk.risksOf(ws, id))).toEqual({ before: 3000, after: 1000, measures: 2000, chances: 2000 });
  });
  it('G7: mehrere Ressourcen je Vorgang, Kosten aus Stundensatz, Hand-Eingabe geht vor', () => {
    const { ws: w0, id } = base();
    let ws: Workspace = { ...w0, persons: [{ id: 'pl', name: 'Projektleitung', kind: 'role', rate: 51 }, { id: 'lm', name: 'Lackiermeister', kind: 'role', rate: 33 }, { id: 'pa', name: 'Assistenz', kind: 'role' }] };
    ws = Psp.addPspTask(ws, id, 'Prozesse definieren', { id: 't1' })!.ws;
    ws = Gp.setUse(ws, 't1', 'pl', { hours: 10 });
    ws = Gp.setUse(ws, 't1', 'lm', { hours: 180 });
    ws = Gp.setUse(ws, 't1', 'pa', { hours: 25 });
    const n = () => NLo.noteById(ws, 't1')!;
    expect(Gp.useTotals(ws, n())).toEqual({ hours: 215, cost: 6450, missingRate: ['pa'] });
    expect(Gp.planHours(ws, n())).toBe(215);
    ws = Gp.setUse(ws, 't1', 'pa', { cost: 750 });
    expect(Gp.planCost(ws, n())).toBe(7200);
    expect(Gp.hoursOf(n(), 'lm')).toBe(180);
    ws = Gp.setUse(ws, 't1', 'pa', null);
    expect(n().use!.map((u) => u.person)).toEqual(['pl', 'lm']);
  });
  it('isTask: nur Notizen ohne Art sind Vorgänge (Stakeholder, Beschaffung, Protokoll nicht)', () => {
    expect(Pj.isTask({})).toBe(true);
    for (const type of ['risk', 'change', 'requirement', 'stakeholder', 'procurement', 'minutes'] as const) expect(Pj.isTask({ type })).toBe(false);
  });
  it('Speichern und Laden: alles bleibt, kaputte Bezüge fallen weg', () => {
    const { ws: w0, id } = base();
    let ws: Workspace = { ...w0, persons: [{ id: 'lm', name: 'LM', kind: 'role', rate: 33, qual: 'Meister' }] };
    ws = Gp.editCharter(ws, id, { no: 'Z20-0173', model: 'classic', reserve: 20000, complexity: 9, releasePl: '2027-01-21' });
    ws = Gp.addItem(ws, id, 'goals', { id: 'g1', text: 'A', kind: 'social', level: 'should' });
    ws = Gp.addItem(ws, id, 'stakeholders', { id: 's1', code: 'SH-EX 04', name: 'Hr. Klar', side: 'ex', strategy: 'participative', attitude: 1, power: 3 });
    ws = Gp.addItem(ws, id, 'phases', { id: 'ph1', name: 'Umbau' });
    ws = Psp.addPspTask(ws, id, 'Umbau', { id: 't1' })!.ws;
    ws = Gp.setPhase(ws, 't1', 'ph1');
    ws = Gp.setUse(ws, 't1', 'lm', { hours: 8 });
    const raw = JSON.parse(JSON.stringify(ws));
    raw.notes.find((n: Note) => n.id === 't1').use.push({ person: 'gibt-es-nicht', hours: 3 });
    const back = parseWorkspace(raw)!;
    const p = Pj.projectById(back, id)!;
    expect(p.charter).toEqual({ no: 'Z20-0173', model: 'classic', reserve: 20000, complexity: 5, releasePl: '2027-01-21' });
    expect(p.goals).toEqual([{ id: 'g1', text: 'A', kind: 'social', level: 'should' }]);
    expect(p.stakeholders![0].power).toBe(3);
    expect(NLo.noteById(back, 't1')!.phase).toBe('ph1');
    expect(NLo.noteById(back, 't1')!.use).toEqual([{ person: 'lm', hours: 8 }]);
    expect(back.persons!.find((x) => x.id === 'lm')!.qual).toBe('Meister');
    const raw2 = JSON.parse(JSON.stringify(back));
    raw2.projects.find((x: { id: string }) => x.id === id).phases = [];
    expect(NLo.noteById(parseWorkspace(raw2)!, 't1')!.phase).toBeUndefined();
  });
  it('nextCode: SH-EX 03 nach 01/02, L3 nach L1/L2', () => {
    expect(Gp.nextCode(['SH-EX 01', 'SH-EX 02', 'SH-IN 05'], 'SH-EX ', 2)).toBe('SH-EX 03');
    expect(Gp.nextCode(['L1', 'L2', 'S1', 'L1.1'], 'L')).toBe('L3');
  });
});

describe('F-226 Baukasten (V109): Vorlage GPM Level D, Zellen, Zeilen, eigene Felder, Vorlagen', () => {
  const base = () => {
    const { ws, id } = Pj.addProject(W.defaultWorkspace(), 'Werkstatt')!;
    return { ws: Pj.editProject(ws, id, { budget: 400000, psp: { prefix: 'CG' } }), id };
  };
  const form = (id: string) => Fk.GPM_D.forms.find((f) => f.id === id)!;
  it('Vorlage: Kapitel in Leitfaden-Reihenfolge, jede Spalte im Feldkatalog, Stufe 1 und 2', () => {
    expect(Fk.GPM_D.forms.map((f) => f.chapter)).toEqual(['2.1', '2.2', '2.2', '2.2', '2.3', '2.4', '3.1', '4', '4', '4', '5', '6.1', '6.2', '6.3', '6.4', '7', '7', '7', '7', '8', '8', '8.3', '9', '9', '10', '10', '10', '11', '11', '11', '12', '12.1', '13', '14', '14', '15.1', '15.2', '15.3', '15.4', '15.5', '16']);
    const chapters = Fk.GPM_D.forms.map((f) => parseFloat(f.chapter));
    expect([...chapters].sort((a, b) => a - b)).toEqual(chapters);
    for (const f of Fk.GPM_D.forms) {
      expect([1, 2]).toContain(f.stage);
      for (const c of f.columns) expect(Fk.fieldSpec(f.source, c.key)).toBeDefined();
    }
  });
  it('Steckbrief: Eingabe = Ausgabe – schreibt in Projekt, brief und charter', () => {
    const { ws: w0, id } = base();
    const f = form('charter');
    let ws = Fk.setCell(w0, id, f, id, 'no', 'Z20-0173');
    ws = Fk.setCell(ws, id, f, id, 'goal', 'Neue Werkstatt in Hamburg');
    ws = Fk.setCell(ws, id, f, id, 'budget', '420000');
    ws = Fk.setCell(ws, id, f, id, 'model', 'hybrid');
    const p = Pj.projectById(ws, id)!;
    expect([p.charter!.no, p.brief!.goal, p.budget, p.charter!.model]).toEqual(['Z20-0173', 'Neue Werkstatt in Hamburg', 420000, 'hybrid']);
    expect(Fk.cellValue(ws, id, f, id, 'goal')).toBe('Neue Werkstatt in Hamburg');
    ws = Fk.setCell(ws, id, f, id, 'no', '');
    expect(Pj.projectById(ws, id)!.charter!.no).toBeUndefined();
    expect(Fk.rowsOf(ws, id, f)).toEqual([{ id }]);
  });
  it('Ziele: Zeile anlegen mit Code je Art, Filter Ziele/Nicht-Ziele, Tiefe, verschieben', () => {
    const { ws: w0, id } = base();
    let ws = Fk.addRow(w0, id, form('goals'), { id: 'g1' })!.ws;
    ws = Fk.addRow(ws, id, form('goals'), { id: 'g2' })!.ws;
    ws = Fk.addRow(ws, id, form('nongoals'), { id: 'n1' })!.ws;
    expect(Fk.cellValue(ws, id, form('goals'), 'g2', 'code')).toBe('L2');
    expect(Fk.cellValue(ws, id, form('nongoals'), 'n1', 'code')).toBe('N1');
    ws = Fk.setCell(ws, id, form('goals'), 'g2', 'parent', 'g1');
    expect(Fk.rowsOf(ws, id, form('goals'))).toEqual([{ id: 'g1', depth: 0 }, { id: 'g2', depth: 1 }]);
    expect(Fk.rowsOf(ws, id, form('nongoals')).map((r) => r.id)).toEqual(['n1']);
    ws = Fk.moveRow(ws, id, form('goals'), 'g2', -1);
    expect(Pj.projectById(ws, id)!.goals!.map((g) => g.id)).toEqual(['g2', 'g1', 'n1']);
    expect(Fk.moveRow(ws, id, form('goals'), 'g1', 1)).toBe(ws);
  });
  it('Risiken: Formular schreibt quantitativ, W/A gerechnet und als „auto“ markiert', () => {
    const { ws: w0, id } = base();
    const f = form('risks');
    let ws = Fk.addRow(w0, id, f, { id: 'r1' })!.ws;
    ws = Fk.setCell(ws, id, f, 'r1', 'ew', '30');
    ws = Fk.setCell(ws, id, f, 'r1', 'impact', 10000);
    expect([Fk.cellValue(ws, id, f, 'r1', 'value'), Fk.cellValue(ws, id, f, 'r1', 'p'), Fk.cellValue(ws, id, f, 'r1', 'i')]).toEqual([3000, 2, 2]);
    expect(Fk.cellAuto(ws, id, f, 'r1', 'p')).toBe(true);
    expect(Fk.cellValue(ws, id, f, 'r1', 'code')).toBe('CG-R-1');
    expect(Fk.setCell(ws, id, f, 'r1', 'value', 5)).toBe(ws);
    ws = Fk.setCell(ws, id, f, 'r1', 'chance', true);
    expect(NLo.noteById(ws, 'r1')!.risk!.chance).toBe(true);
  });
  it('Einsatz je Arbeitspaket: Zeile braucht Vorgang + Person, Kosten aus Satz, löschen mit Rückgängig', () => {
    const { ws: w0, id } = base();
    let ws: Workspace = { ...w0, persons: [{ id: 'lm', name: 'Lackiermeister', kind: 'role', rate: 33 }] };
    ws = Psp.addPspTask(ws, id, 'Prozesse', { id: 't1' })!.ws;
    const f = form('uses');
    expect(Fk.addRow(ws, id, f, { id: 'x' })).toBeNull();
    const a = Fk.addRow(ws, id, f, { id: 'x', init: { task: 't1', person: 'lm' } })!;
    expect(a.id).toBe('t1|lm');
    ws = Fk.setCell(a.ws, id, f, a.id, 'hours', '180');
    expect([Fk.cellValue(ws, id, f, a.id, 'task'), Fk.cellValue(ws, id, f, a.id, 'rate'), Fk.cellValue(ws, id, f, a.id, 'cost')]).toEqual(['Prozesse', 33, 5940]);
    expect(Fk.cellValue(ws, id, form('tasks'), 't1', 'cost')).toBe(5940);
    expect(Fk.cellAuto(ws, id, form('tasks'), 't1', 'hours')).toBe(true);
    expect(Fk.rowsOf(ws, id, form('persons')).map((r) => r.id)).toEqual(['lm']);
    const r = Fk.removeRow(ws, id, f, 't1|lm')!;
    expect(NLo.noteById(r.ws, 't1')!.use).toBeUndefined();
    expect(NLo.noteById(Fk.undoRemoveRow(r.ws, r.undo), 't1')!.use).toEqual([{ person: 'lm', hours: 180 }]);
  });
  it('Meilensteine, Arbeitspakete, Beschaffung: Zeilen sind Notizen; Ergebnisse als Zeilen', () => {
    const { ws: w0, id } = base();
    let ws = Fk.addRow(w0, id, form('milestones'), { id: 'm1' })!.ws;
    ws = Fk.setCell(ws, id, form('milestones'), 'm1', 'results', 'Werkstatt eingerichtet\n\nTeam vollständig ');
    expect(NLo.noteById(ws, 'm1')!.results).toEqual(['Werkstatt eingerichtet', 'Team vollständig']);
    expect(NLo.noteById(ws, 'm1')!.milestone).toBe(true);
    ws = Fk.addRow(ws, id, form('procure'), { id: 'b1' })!.ws;
    ws = Fk.setCell(ws, id, form('procure'), 'b1', 'make', 'buy');
    ws = Fk.setCell(ws, id, form('procure'), 'b1', 'offer', '12500,5');
    expect(NLo.noteById(ws, 'b1')!.procure).toEqual({ make: 'buy', offer: 12500.5 });
    expect(Pj.tasksOfProject(ws, id).map((n) => n.id)).toEqual(['m1']);
    const r = Fk.removeRow(ws, id, form('procure'), 'b1')!;
    expect(NLo.noteById(Fk.undoRemoveRow(r.ws, r.undo), 'b1')!.type).toBe('procurement');
  });
  it('Eigene Felder: anlegen, Wert je Zeile, Pflicht zählt bei „noch offen“, löschen mit Rückgängig', () => {
    const { ws: w0, id } = base();
    const f = form('stakeholders');
    let ws = Fk.addRow(w0, id, f, { id: 's1' })!.ws;
    expect(Fk.cellValue(ws, id, f, 's1', 'code')).toBe('SH-IN 01');
    expect(Fk.missingOf(ws, id, f)).toEqual([{ row: 's1', keys: ['interests', 'strategy', 'measures'] }]);
    ws = Fk.addField(ws, id, 'stakeholders', { id: 'f1', name: 'Kontaktweg', type: 'choice', options: ['Telefon', 'Mail', ' '], required: true });
    expect(Fk.addField(ws, id, 'stakeholders', { id: 'f2', name: 'kontaktweg', type: 'text' })).toBe(ws);
    const col = Fk.columnsOf(Pj.projectById(ws, id), f).find((c) => c.key === 'custom:f1')!;
    expect([col.label, col.kind, col.own, col.options!.length]).toEqual(['Kontaktweg', 'choice', true, 2]);
    expect(Fk.missingOf(ws, id, f)[0].keys).toContain('custom:f1');
    ws = Fk.setCell(ws, id, f, 's1', 'custom:f1', 'Mail');
    expect(Fk.cellValue(ws, id, f, 's1', 'custom:f1')).toBe('Mail');
    const r = Fk.removeField(ws, id, 'stakeholders', 'f1')!;
    expect(Pj.projectById(r.ws, id)!.forms).toBeUndefined();
    const back = Fk.undoRemoveField(r.ws, r.undo);
    expect(Fk.cellValue(back, id, f, 's1', 'custom:f1')).toBe('Mail');
  });
  it('Spalten ausblenden (GPM-Pflicht nicht), als Vorlage speichern, Vorlage löschen fällt zurück', () => {
    const { ws: w0, id } = base();
    const f = form('stakeholders');
    let ws = Fk.setColumnHidden(w0, id, f, 'fears', true);
    expect(Fk.setColumnHidden(ws, id, f, 'name', true)).toBe(ws);
    ws = Fk.addField(ws, id, 'stakeholders', { id: 'f1', name: 'Kontaktweg', type: 'text' });
    ws = Fk.setCell(Fk.addRow(ws, id, f, { id: 's1' })!.ws, id, f, 's1', 'custom:f1', 'Mail');
    const s = Fk.saveTemplate(ws, id, 'Firmen-Handbuch', 'tp1')!;
    expect(Fk.saveTemplate(s.ws, id, 'firmen-handbuch', 'tp2')).toBeNull();
    const p = Pj.projectById(s.ws, id)!;
    expect(p.forms).toEqual({ template: 'tp1', values: { s1: { f1: 'Mail' } } });
    const t = Fk.templateOf(s.ws, p).forms.find((x) => x.id === 'stakeholders')!;
    expect(t.columns.some((c) => c.key === 'fears')).toBe(false);
    expect(Fk.columnsOf(p, t).map((c) => c.key)).toContain('custom:f1');
    expect(Fk.cellValue(s.ws, id, t, 's1', 'custom:f1')).toBe('Mail');
    const back = parseWorkspace(JSON.parse(JSON.stringify(s.ws)))!;
    expect(back.formTemplates).toEqual(s.ws.formTemplates);
    expect(Pj.projectById(back, id)!.forms).toEqual(p.forms);
    const rm = Fk.removeTemplate(back, 'tp1')!;
    expect(Pj.projectById(rm.ws, id)!.forms).toEqual({ values: { s1: { f1: 'Mail' } } });
    expect(rm.ws.formTemplates).toBeUndefined();
  });
  it('Projektorganisation: Rollen als Zeilen', () => {
    const { ws: w0, id } = base();
    const f = form('roles');
    const n = Fk.rowsOf(w0, id, f).length;
    let ws = Fk.addRow(w0, id, f, { id: 'ro1' })!.ws;
    expect(Fk.rowsOf(ws, id, f)).toHaveLength(n + 1);
    ws = Fk.setCell(ws, id, f, 'ro1', 'name', 'Projektbüro');
    expect(Fk.cellValue(ws, id, f, 'ro1', 'name')).toBe('Projektbüro');
  });
});

describe('F-226 Beispielprojekt ColorGentlemen in den Formularen (V109)', () => {
  const ws = Sp.addSampleProject(W.defaultWorkspace(), 5);
  const pid = Sp.SAMPLE_PROJECT;
  const p = Pj.projectById(ws, pid)!;
  const form = (id: string) => Fk.GPM_D.forms.find((f) => f.id === id)!;
  it('Steckbrief, Ziele, Konflikte, Stakeholder, Phasen aus dem Report', () => {
    expect(p.charter).toMatchObject({ no: 'CG-1', reserve: 20000, costMaterial: 304949, model: 'classic' });
    expect(Fk.rowsOf(ws, pid, form('goals')).map((r) => Fk.cellValue(ws, pid, form('goals'), r.id, 'code'))).toEqual(['L1', 'L1.1', 'L1.2', 'L1.3', 'L1.4', 'L1.5', 'L2', 'L2.1', 'L2.2', 'T', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'K', 'K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'S1', 'S2']);
    expect(Fk.rowsOf(ws, pid, form('nongoals'))).toHaveLength(2);
    expect(p.conflicts!.map((c) => c.first)).toEqual(['a', 'a']);
    expect(p.stakeholders!.map((s) => s.code)).toEqual(['SH-IN 01', 'SH-IN 02', 'SH-IN 03', 'SH-IN 04', 'SH-IN 06', 'SH-EX 01', 'SH-EX 02', 'SH-EX 03', 'SH-EX 04', 'SH-EX 05', 'SH-EX 06']);
    expect(p.phases!.reduce((s, x) => s + (x.share ?? 0), 0)).toBe(100);
    expect(Fk.missingOf(ws, pid, form('stakeholders'))).toEqual([]);
  });
  it('Risiken: Summen wie im Report (28.000 € vor, 2.000 € nach Maßnahmen), W/A gerechnet wie V108', () => {
    const sums = Gp.riskSums(Rk.risksOf(ws, pid));
    expect([sums.before, sums.after, sums.measures]).toEqual([28000, 2000, 3500]);
    const lv = (id: string) => Gp.riskLevels(NLo.noteById(ws, id)!.risk, p.budget);
    expect([lv('cg-r1').p, lv('cg-r1').i, lv('cg-r2').p, lv('cg-r2').i, lv('cg-r3').p, lv('cg-r3').i]).toEqual([2, 2, 1, 5, 3, 2]);
  });
  it('CG-1.6.4: vier Ressourcen, 295 Ph und 10.320 € aus Stundensätzen; Meilenstein-Ergebnisse als Liste; Phasen am Vorgang', () => {
    const n = NLo.noteById(ws, 'cg-31')!;
    expect(Gp.useTotals(ws, n)).toEqual({ hours: 295, cost: 10320, missingRate: [] });
    expect(NLo.noteById(ws, 'cg-33')!.results).toHaveLength(5);
    expect(NLo.noteById(ws, 'cg-33')!.text).not.toContain('**Ergebnisse:**');
    expect(Gp.notesOfPhase(ws, pid, 'cg-ph1').map((x) => x.id).sort()).toEqual(['cg-10', 'cg-32', 'cg-33']);
    expect(Fk.rowsOf(ws, pid, form('uses'))).toHaveLength(4);
  });
  it('Entfernen nimmt alles mit', () => {
    expect(Pj.projectById(Sp.removeSampleProject(ws), pid)).toBeUndefined();
  });
});

describe('F-226 Stufe 1 Rest (V110): Phasenbalken, Auslastung aus Einsätzen', () => {
  const ws = Sp.addSampleProject(W.defaultWorkspace(), 5);
  const pid = Sp.SAMPLE_PROJECT;
  it('G8: Phasenbalken aus dem Phasenplan; ohne Termine aus den Vorgängen der Phase', () => {
    const bars = Gt.phaseBars(ws, pid);
    const p = Pj.projectById(ws, pid)!;
    expect(bars.map((b) => b.id)).toEqual(p.phases!.filter((x) => x.start && x.end).map((x) => x.id));
    expect(bars.every((b) => b.from === 'plan' && b.start <= b.end)).toBe(true);
    expect(bars.reduce((s, b) => s + b.tasks, 0)).toBeGreaterThan(0);
    // Phase ohne Termine: Balken aus ihren Vorgängen
    const first = p.phases![0];
    const w2 = Gp.editItem(ws, pid, 'phases', first.id, { start: null, end: null });
    const b2 = Gt.phaseBars(w2, pid).find((b) => b.id === first.id);
    const g = Gt.ganttOf(w2, pid);
    const own = g.rows.filter((r) => r.planned && r.node.kind === 'task' && NLo.noteById(w2, r.id)?.phase === first.id);
    if (own.length) {
      expect(b2!.from).toBe('tasks');
      expect(b2!.start).toBe(own.map((r) => r.start).sort()[0]);
    } else expect(b2).toBeUndefined();
  });
  it('G5: editRisk schreibt W/A aus EW % und Tragweite mit (Liste und Matrix kennen sie)', () => {
    const { ws: w0, id } = (() => {
      const r = Pj.addProject(W.defaultWorkspace(), 'Werkstatt')!;
      return { ws: Pj.editProject(r.ws, r.id, { budget: 400000 }), id: r.id };
    })();
    let ws = Rk.addSteer(w0, id, 'risk', { title: 'Lieferverzug' }, { id: 'r1' } as never)!.ws;
    ws = Rk.editRisk(ws, 'r1', { ew: 30, impact: 10000 });
    expect(NLo.noteById(ws, 'r1')!.risk).toMatchObject({ ew: 30, impact: 10000, p: 2, i: 2 });
    expect(Rk.riskMatrix(ws, id).find((row) => row.p === 2)!.cells.find((c) => c.i === 2)!.ids).toEqual(['r1']);
    ws = Rk.editRisk(ws, 'r1', { measures: [{ id: 'm1', kind: 'prev', text: 'Zweiter Lieferant', cost: 500, decided: true, ewAfter: 10 }] });
    expect(Gp.riskValue(NLo.noteById(ws, 'r1')!.risk)).toBe(3000);
    expect(Gp.riskValueAfter(NLo.noteById(ws, 'r1')!.risk)).toBe(1000);
  });
  it('G7: Auslastung aus Einsätzen – jede Ressource mit ihren Stunden; CG-1.6.4 ohne Hand-Werte', () => {
    const n = NLo.notesOf(ws).find((x) => x.use?.length === 4)!;
    expect(n.effort?.plan).toBeUndefined();
    expect(Gp.planHours(ws, n)).toBe(295);
    expect(Gp.planCost(ws, n)).toBe(10320);
    const lm = n.use!.find((u) => u.hours === 180)!.person;
    expect(Gp.involves(n, new Set([lm]))).toBe(true);
    expect(Gp.hoursFor(n, new Set([lm]))).toBe(180);
    expect(Gp.hoursFor(n, new Set(['niemand']))).toBeUndefined();
    const plain = { ...n, use: undefined, assignee: 'x', effort: { plan: 12 } } as Note;
    expect(Gp.hoursFor(plain, new Set(['x']))).toBe(12);
  });
  it('Hilfe und Tour „Formulare“: Suche findet beide, Tour hat Ziele in den Formularen', () => {
    expect(H.searchHelp('Tour Formulare')[0].id).toBe('tourForms');
    expect(H.searchHelp('Stakeholderanalyse')[0].id).toBe('projectForms');
    expect(TOURS.forms.filter((x) => x.target).every((x) => x.target!.startsWith('.pjf'))).toBe(true);
  });
});

describe('F-226 Feinschliff (V111): Person löschen, doppelte Codes', () => {
  it('removePerson nimmt Einsätze mit, Rückgängig bringt sie zurück', async () => {
    const P = await import('./persons');
    const ws = Sp.addSampleProject(W.defaultWorkspace(), 5);
    const n = NLo.notesOf(ws).find((x) => x.use?.length === 4)!;
    const lm = n.use!.find((u) => u.hours === 180)!.person;
    const r = P.removePerson(ws, lm)!;
    expect(NLo.noteById(r.ws, n.id)!.use!.some((u) => u.person === lm)).toBe(false);
    expect(Gp.planHours(r.ws, NLo.noteById(r.ws, n.id)!)).toBe(115);
    const back = P.undoRemovePerson(r.ws, r.undo);
    expect(NLo.noteById(back, n.id)!.use).toEqual(n.use);
  });
  it('dupCodesOf: zwei Ziele mit demselben Code (ohne Leerzeichen/Großschreibung)', () => {
    const ws = Sp.addSampleProject(W.defaultWorkspace(), 5);
    const pid = Sp.SAMPLE_PROJECT;
    const p = Pj.projectById(ws, pid)!;
    const form = Fk.templateOf(ws, p).forms.find((f) => f.id === 'nongoals')!;
    expect(Fk.dupCodesOf(ws, pid, form).size).toBe(0);
    const [g1, g2] = p.goals!;
    const w2 = Gp.editItem(ws, pid, 'goals', g2.id, { code: ` ${g1.code!.toLowerCase()} ` });
    const d = Fk.dupCodesOf(w2, pid, form);
    expect(d.size).toBe(1);
    expect([...d.values()][0].sort()).toEqual([g1.id, g2.id].sort());
  });
});

describe('F-226 Stufe 2 (V113): Abnahmekriterien, AKV, DKI, Arbeitspaket, Statusbericht, Ganglinie, Report', () => {
  const sample = () => Sp.addSampleProject(W.defaultWorkspace(), 5);
  const pid = Sp.SAMPLE_PROJECT;
  const form = (id: string) => Fk.GPM_D.forms.find((f) => f.id === id)!;
  it('Abnahmekriterien: Zeilen aus den Meilensteinen, Angaben schreiben, anlegen, löschen mit Rückgängig', () => {
    const ws = sample();
    const f = form('accept');
    const rows = Fk.rowsOf(ws, pid, f);
    expect(rows.length).toBeGreaterThan(3);
    const r0 = rows[0].id;
    let w = Fk.setCell(ws, pid, f, r0, 'by', 'PL');
    w = Fk.setCell(w, pid, f, r0, 'acceptor', 'Auftraggeber');
    w = Fk.setCell(w, pid, f, r0, 'due', '2027-02-26');
    w = Fk.setCell(w, pid, f, r0, 'doc', 'Abnahmeprotokoll');
    w = Fk.setCell(w, pid, f, r0, 'ok', false);
    expect(Fk.cellValue(w, pid, f, r0, 'by')).toBe('PL');
    expect(Fk.cellValue(w, pid, f, r0, 'ok')).toBe(false);
    expect(String(Fk.cellValue(w, pid, f, r0, 'task'))).toMatch(/^CG-\S+ \S/);
    expect(Fk.setCell(w, pid, f, r0, 'text', '   ')).toBe(w);
    const add = Fk.addRow(w, pid, f, { id: 'x', now: 5 })!;
    expect(Fk.rowsOf(add.ws, pid, f).length).toBe(rows.length + 1);
    const rm = Fk.removeRow(add.ws, pid, f, r0, 6)!;
    expect(Fk.rowsOf(rm.ws, pid, f).length).toBe(rows.length);
    const back = Fk.undoRemoveRow(rm.ws, rm.undo, 7);
    expect(Fk.cellValue(back, pid, f, r0, 'acceptor')).toBe('Auftraggeber');
    // Speichern und Laden behält die Angaben
    const again = parseWorkspace(JSON.parse(JSON.stringify(back)))!;
    expect(Fk.cellValue(again, pid, f, r0, 'doc')).toBe('Abnahmeprotokoll');
  });
  it('AKV an der Instanz: schreiben, Person ändern behält AKV, Laden behält AKV', () => {
    const ws = sample();
    const f = form('roles');
    const r = Fk.rowsOf(ws, pid, f)[0].id;
    let w = Fk.setCell(ws, pid, f, r, 'tasks', 'Plant und steuert');
    w = Fk.setCell(w, pid, f, r, 'powers', 'Gibt Arbeitspakete frei');
    w = Fk.setCell(w, pid, f, r, 'person', '');
    expect(Fk.cellValue(w, pid, f, r, 'tasks')).toBe('Plant und steuert');
    expect(Fk.cellValue(w, pid, f, r, 'person')).toBeUndefined();
    const again = parseWorkspace(JSON.parse(JSON.stringify(w)))!;
    expect(Fk.cellValue(again, pid, f, r, 'powers')).toBe('Gibt Arbeitspakete frei');
  });
  it('DKI-Matrix: Zeile anlegen, Strategie wählen, verschieben, Laden', () => {
    const ws = sample();
    const f = form('comms');
    const a = Fk.addRow(ws, pid, f, { id: 'c1', now: 1 })!;
    const b = Fk.addRow(a.ws, pid, f, { id: 'c2', now: 2 })!;
    let w = Fk.setCell(b.ws, pid, f, 'c2', 'content', 'Statusbericht');
    w = Fk.setCell(w, pid, f, 'c2', 'strategy', 'push');
    w = Fk.setCell(w, pid, f, 'c2', 'strategy', 'quatsch');
    w = Fk.moveRow(w, pid, f, 'c2', -1, 3);
    // V135: ColorGentlemen hat jetzt die DKI-Matrix aus Abb. 8 – c2 steht nach dem Verschieben vor c1
    const ids = Fk.rowsOf(w, pid, f).map((r) => r.id);
    expect(ids.indexOf('c2')).toBe(ids.indexOf('c1') - 1);
    const again = parseWorkspace(JSON.parse(JSON.stringify(w)))!;
    expect(Fk.cellValue(again, pid, f, 'c2', 'content')).toBe('Statusbericht');
  });
  it('Arbeitspaket: Fortschrittsmessung, Fertigstellungsgrad gerechnet oder von Hand', async () => {
    const C = await import('./gpmCalc');
    const ws = sample();
    const f = form('wp');
    const id = Fk.rowsOf(ws, pid, f).find((r) => (Gp.planHours(ws, NLo.noteById(ws, r.id)!) ?? 0) > 0)!.id;
    let w = Fk.setCell(ws, pid, f, id, 'method', 'zero');
    expect(Fk.cellValue(w, pid, f, id, 'progress')).toBe(NLo.noteById(w, id)!.state === 'done' ? 100 : 0);
    w = Fk.setCell(w, pid, f, id, 'method', 'estimate');
    w = Fk.setCell(w, pid, f, id, 'progress', 40);
    expect(Fk.cellValue(w, pid, f, id, 'progress')).toBe(NLo.noteById(w, id)!.state === 'done' ? 40 : 40);
    expect(Fk.cellAuto(w, pid, f, id, 'progress')).toBe(false);
    w = Fk.setCell(w, pid, f, id, 'activities', 'A\nB');
    expect(NLo.noteById(w, id)!.wp!.activities).toBe('A\nB');
    const n = { ...NLo.noteById(w, id)!, state: 'open' as const, wp: { method: 'half' as const } };
    expect(C.progressOf(w, n)).toBe(0);
    expect(C.progressOf(w, { ...n, state: 'doing' })).toBe(50);
    expect(C.progressOf(w, { ...n, state: 'done' })).toBe(100);
    expect(C.progressOf(w, { ...n, wp: { method: 'effort' }, effort: { plan: 100, actual: 25 } })).toBe(25);
    expect(C.progressOf(w, { ...n, wp: { method: 'steps' }, accept: [{ text: 'a', ok: true }, { text: 'b' }] })).toBe(50);
    const again = parseWorkspace(JSON.parse(JSON.stringify(w)))!;
    expect(NLo.noteById(again, id)!.wp!.progress).toBe(40);
  });
  it('Statusbericht: Anlegen friert Plan/Ist ein, neueste oben, Felder schreiben', () => {
    const ws = sample();
    const f = form('reports');
    const now = Date.parse('2027-03-15T10:00:00Z');
    const a = Fk.addRow(ws, pid, f, { id: 'r1', now })!;
    const rep = Pj.projectById(a.ws, pid)!.reports![0];
    expect(rep.date).toBe('2027-03-15');
    expect(rep.planHours).toBeGreaterThan(0);
    expect(rep.progTime).toBeGreaterThan(0);
    expect(['green', 'yellow', 'red']).toContain(rep.light);
    const b = Fk.addRow(a.ws, pid, f, { id: 'r2', now: now + 86400000 * 14 })!;
    expect(Fk.rowsOf(b.ws, pid, f).map((r) => r.id)).toEqual(['r2', 'r1']);
    expect(Pj.projectById(b.ws, pid)!.reports!.find((r) => r.id === 'r2')!.from).toBe('2027-03-16');
    const w = Fk.setCell(b.ws, pid, f, 'r1', 'measures', 'Zusatzschicht');
    expect(Fk.cellValue(w, pid, f, 'r1', 'measures')).toBe('Zusatzschicht');
    expect(Fk.setCell(w, pid, f, 'r1', 'planHours', 1)).toBe(w);
  });
  it('Kostenganglinie: Summe = Plan-Kosten mit Termin, Summenlinie steigt', async () => {
    const C = await import('./gpmCalc');
    const ws = sample();
    const c = C.costCurve(ws, pid);
    expect(c.months.length).toBeGreaterThan(2);
    const last = c.months[c.months.length - 1];
    expect(Math.abs(last.costSum - c.total)).toBeLessThan(1);
    for (let i = 1; i < c.months.length; i++) expect(c.months[i].costSum).toBeGreaterThanOrEqual(c.months[i - 1].costSum);
    expect(Fk.rowsOf(ws, pid, form('costs')).length).toBe(c.months.length);
  });
  it('Portfolio: Stakeholder mit Lage', async () => {
    const C = await import('./gpmCalc');
    const ws = sample();
    const dots = C.portfolioOf(Pj.projectById(ws, pid));
    expect(dots.length).toBe(Pj.projectById(ws, pid)!.stakeholders!.length);
    expect(dots.some((d) => d.side === 'ex')).toBe(true);
  });
  it('Report: alle Formulare in Kapitelfolge, Kopf/Fuß, Texte maskiert', async () => {
    const R = await import('./gpmReport');
    const ws = Pj.editProject(sample(), pid, { name: 'Color <b>Gentlemen</b>' });
    const html = R.reportHtml(ws, pid, { version: 'V113', day: '2027-03-15' });
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Color &lt;b&gt;Gentlemen&lt;/b&gt;');
    let at = -1;
    for (const f of Fk.GPM_D.forms) {
      const i = html.indexOf(`id="f-${f.id}"`);
      expect(i).toBeGreaterThan(at);
      at = i;
    }
    expect(html).toContain('counter(page)');
  });
});

describe('F-226 Stufe 2 Rest (V114): Earned Value', () => {
  const pid = Sp.SAMPLE_PROJECT;
  const sample = (): Workspace => Sp.addSampleProject(W.defaultWorkspace(), 5);
  it('vor dem Start: PV 0, EV 0; nach dem Ende: PV = BAC', async () => {
    const C = await import('./gpmCalc');
    const ws = sample();
    const a = C.earnedValue(ws, pid, '2026-11-01');
    expect(a.rows.length).toBeGreaterThan(0);
    expect(a.total.pv).toBe(0);
    const b = C.earnedValue(ws, pid, '2028-01-01');
    expect(b.total.pv).toBe(b.total.bac);
    expect(b.total.bac).toBeGreaterThan(0);
    for (const r of b.rows) expect(r.sv).toBe(Math.round((r.ev - r.pv) * 100) / 100);
  });
  it('V118 Grafik über die Zeit: PV steigt von 0 bis BAC, Berichte frieren EV ein, alte Berichte geschätzt', async () => {
    const C = await import('./gpmCalc');
    const R = await import('./gpmReport');
    const ws = sample();
    const p = ws.projects!.find((x) => x.id === pid)!;
    const day = '2027-03-15';
    const c = C.evCurve(ws, pid, day);
    expect(c.pv.length).toBeGreaterThan(2);
    expect(c.pv[0].v).toBe(0);
    expect(c.pv[c.pv.length - 1].v).toBe(c.bac);
    for (let i = 1; i < c.pv.length; i++) expect(c.pv[i].v).toBeGreaterThanOrEqual(c.pv[i - 1].v);
    expect(c.points.at(-1)!.from).toBe('today');
    const rep = C.newReport(ws, pid, 'r1', '2027-02-01');
    expect(rep.ev).toBe(C.projectStatus(ws, pid, '2027-02-01').earned);
    const old = { id: 'r0', date: '2027-01-10', planCost: 1000, progWork: 40, actCost: 300 };
    p.reports = [rep, old];
    const d = C.evCurve(ws, pid, day);
    expect(d.points.map((x) => x.day)).toEqual(['2027-01-10', '2027-02-01', day]);
    expect(d.points[0]).toMatchObject({ ev: 400, ac: 300, est: true, from: 'report' });
    expect(d.points[1].est).toBeUndefined();
    const svg = R.evSvg(d, R.PRINT_COLORS);
    expect(svg).toContain('<svg');
    expect(svg).toContain('PV Planwert');
    expect(R.reportHtml(ws, pid, { version: 'V118', day })).toContain('Earned Value am');
  });
  it('Formular im Baukasten, ohne „+ Zeile“, im Report mit Summenzeile', async () => {
    const R = await import('./gpmReport');
    const f = Fk.GPM_D.forms.find((x) => x.id === 'ev')!;
    expect(f.source).toBe('ev');
    expect(Fk.canAddRow(f)).toBe(false);
    const ws = sample();
    expect(Fk.rowsOf(ws, pid, f).length).toBeGreaterThan(0);
    const html = R.reportHtml(ws, pid, { version: 'V114', day: '2027-03-15' });
    expect(html).toContain('id="f-ev"');
    expect(html).toContain('Projekt (Stichtag');
  });
});

describe('F-226 Stufe 2 Rest (V115): MTA, Dokumentation, Prüfung, Abschluss, Lessons Learned, Veränderung, Auflagen', () => {
  const pid = Sp.SAMPLE_PROJECT;
  const sample = (): Workspace => Sp.addSampleProject(W.defaultWorkspace(), 5);
  const form = (id: string) => Fk.GPM_D.forms.find((x) => x.id === id)!;
  it('Listen: Zeile anlegen mit Code, Zelle schreiben, löschen, laden', () => {
    let ws = sample();
    for (const [fid, key, val] of [['docs', 'place', 'Laufwerk P:'], ['rules', 'source', 'law'], ['checks', 'result', 'passed'], ['lessons', 'kind', 'good'], ['changes', 'resistance', 'high']] as const) {
      const f = form(fid);
      expect(Fk.canAddRow(f)).toBe(true);
      const r = Fk.addRow(ws, pid, f, { id: `x-${fid}`, now: 1 })!;
      expect(r).not.toBeNull();
      ws = r.ws;
      ws = Fk.setCell(ws, pid, f, `x-${fid}`, key, val, { now: 2 });
      expect(Fk.cellValue(ws, pid, f, `x-${fid}`, key)).toBe(val);
    }
    expect(Fk.cellValue(ws, pid, form('docs'), 'x-docs', 'code')).toBe('D-1');
    expect(Fk.cellValue(ws, pid, form('rules'), 'x-rules', 'code')).toBe('A-1');
    // Unsinn bei Auswahl bleibt draußen
    ws = Fk.setCell(ws, pid, form('checks'), 'x-checks', 'result', 'super', { now: 3 });
    expect(Fk.cellValue(ws, pid, form('checks'), 'x-checks', 'result')).toBeUndefined();
    const back = parseWorkspace(JSON.parse(JSON.stringify(ws)))!;
    const p = Pj.projectById(back, pid)!;
    expect(p.docs?.[0].place).toBe('Laufwerk P:');
    expect(p.lessons?.find((l) => l.id === 'x-lessons')?.kind).toBe('good');
    const rm = Fk.removeRow(ws, pid, form('changes'), 'x-changes', 4)!;
    expect(Pj.projectById(rm.ws, pid)!.changes).toBeUndefined();
  });
  it('Abschluss: Felder schreiben, Häkchen „archiviert“, leer = weg', () => {
    let ws = sample();
    const f = form('close');
    expect(f.layout).toBe('fields');
    ws = Fk.setCell(ws, pid, f, pid, 'date', '2027-06-30', { now: 1 });
    ws = Fk.setCell(ws, pid, f, pid, 'archived', true, { now: 2 });
    expect(Pj.projectById(ws, pid)!.close).toEqual({ date: '2027-06-30', archived: true });
    ws = Fk.setCell(ws, pid, f, pid, 'archived', false, { now: 3 });
    ws = Fk.setCell(ws, pid, f, pid, 'date', '', { now: 4 });
    expect(Pj.projectById(ws, pid)!.close).toBeUndefined();
  });
  it('MTA: Statusbericht hält Meilenstein-Termine fest, Reihe je Meilenstein, heute als letzter Punkt', async () => {
    const C = await import('./gpmCalc');
    const R = await import('./gpmReport');
    let ws = sample();
    const rep = form('reports');
    ws = Fk.addRow(ws, pid, rep, { id: 'r-mta', now: Date.parse('2027-02-01T10:00:00Z') })!.ws;
    const r = Pj.projectById(ws, pid)!.reports!.find((x) => x.id === 'r-mta')!;
    expect(Object.keys(r.ms ?? {}).length).toBeGreaterThan(0);
    const m = C.mtaOf(ws, pid, '2027-03-01');
    expect(m.points.map((x) => x.label)).toEqual(['01.02.', 'heute']);
    const row = m.rows.find((x) => r.ms![x.id])!;
    expect(row.series[0]).toBe(r.ms![row.id]);
    expect(row.delta).toBe(0);
    expect(row.trend).toBe('same');
    expect(Fk.canAddRow(form('mta'))).toBe(false);
    expect(R.mtaSvg(m, R.mtaNames(ws, pid), R.PRINT_COLORS)).toContain('<svg');
    const html = R.reportHtml(ws, pid, { version: 'V115', day: '2027-03-01' });
    for (const id of ['mta', 'docs', 'checks', 'close', 'lessons', 'changes', 'rules']) expect(html).toContain(`id="f-${id}"`);
  });
});

describe('F-206 Schritt 10 (V115): Basisplan', () => {
  const pid = Sp.SAMPLE_PROJECT;
  it('speichern hält Termine fest, Abweichung nach Verschieben, Rückgängig und Laden', async () => {
    const Bl = await import('./baseline');
    const C = await import('./gpmCalc');
    let ws = Sp.addSampleProject(W.defaultWorkspace(), 5);
    const r = Bl.saveBaseline(ws, pid, '2026-11-26T09:00:00.000Z', 6)!;
    expect(r.prev).toBeUndefined();
    ws = r.ws;
    const b = Pj.projectById(ws, pid)!.baseline!;
    expect(Object.keys(b.tasks).length).toBeGreaterThan(20);
    let cmp = Bl.compare(ws, pid);
    expect(cmp.end).toBe(0);
    expect([...cmp.rows.values()].every((d) => d.added || d.end === 0)).toBe(true);
    // ersten Vorgang ohne Vorgänger 5 Arbeitstage länger machen → Projektende verschiebt sich, wenn er kritisch ist
    const g = Gt.ganttOf(ws, pid);
    const critTask = g.rows.find((x) => x.critical && !x.node.summary && x.days > 1)!;
    ws = Sch.setTaskPlan(ws, critTask.id, { duration: critTask.days + 5 }, 7);
    cmp = Bl.compare(ws, pid);
    expect(cmp.rows.get(critTask.id)!.end).toBe(5);
    expect(cmp.end).toBe(5);
    // MTA nimmt den Basisplan als ersten Punkt
    const m = C.mtaOf(ws, pid, '2026-11-27');
    expect(m.points[0].label).toBe('Basisplan');
    expect(m.rows.some((x) => (x.delta ?? 0) > 0)).toBe(true);
    // laden und löschen
    const back = parseWorkspace(JSON.parse(JSON.stringify(ws)))!;
    expect(Pj.projectById(back, pid)!.baseline!.tasks[critTask.id].end).toBe(b.tasks[critTask.id].end);
    ws = Bl.setBaseline(ws, pid, undefined);
    expect(Pj.projectById(ws, pid)!.baseline).toBeUndefined();
    expect(Bl.compare(ws, pid).rows.size).toBe(0);
  });
});

describe('F-206 Schritt 10 (V115): Netzplan', () => {
  it('ColorGentlemen: alle Vorgänge ohne Sammelvorgänge, Spalten folgen den Abhängigkeiten, kritischer Pfad ohne Puffer', async () => {
    const Nw = await import('./network');
    const ws = Sp.addSampleProject(W.defaultWorkspace(), 5);
    const g = Gt.ganttOf(ws, Sp.SAMPLE_PROJECT);
    const net = Nw.networkOf(ws, Sp.SAMPLE_PROJECT, g);
    expect(net.nodes.length).toBe(g.rows.filter((r) => r.planned && r.node.kind === 'task' && !r.node.summary).length);
    expect(net.nodes.every((n) => !n.row.node.summary)).toBe(true);
    for (const l of net.links) expect(net.byId.get(l.to)!.col).toBeGreaterThan(net.byId.get(l.from)!.col);
    expect(net.cols).toBeGreaterThan(3);
    for (const n of net.nodes) {
      if (n.row.critical) expect([n.ls, n.lf]).toEqual([n.es, n.ef]);
      else expect(n.lf >= n.ef).toBe(true);
    }
    expect(net.links.some((l) => l.critical)).toBe(true);
  });
});

describe('F-232 P9 (V133): Formulare als Blatt in Report-Reihenfolge', () => {
  it('Kapitel stehen in Report-Reihenfolge, breite Tabellen im Querformat wie im Bericht', () => {
    const { ws, id } = Pj.addProject(W.defaultWorkspace(), 'Blatt')!;
    const p = ws.projects!.find((x) => x.id === id)!;
    const tpl = Fk.templateOf(ws, p);
    const nums = tpl.forms.map((f) => Number(f.chapter.split('.')[0]));
    expect(nums).toEqual([...nums].sort((a, b) => a - b));
    expect(tpl.forms[0].source).toBe('charter');
    const tasks = tpl.forms.find((f) => f.id === 'tasks')!;
    expect(Fk.isWideForm(tasks, Fk.columnsOf(p, tasks).length)).toBe(Fk.columnsOf(p, tasks).length > 7);
    const charter = tpl.forms.find((f) => f.id === 'charter')!;
    expect(Fk.isWideForm(charter, 20)).toBe(false);
    expect(Fk.isWideForm({ ...tasks, layout: 'table' }, 8)).toBe(true);
    expect(Fk.isWideForm({ ...tasks, layout: 'table' }, 7)).toBe(false);
  });
});

describe('F-234 (V135): Grafik-Blätter wie im Report', () => {
  it('jede Grafik hat ein Kapitel-Blatt, zeichnet aus den Beispieldaten und steht im Bericht', async () => {
    const F = await import('./gpmFigures');
    const S = await import('./sampleProject');
    const R = await import('./gpmReport');
    const ws = Fk.ensureMatrices(S.addSampleProject(W.defaultWorkspace(), 5));
    const pid = S.SAMPLE_PROJECT;
    const figs = Fk.GPM_D.forms.filter((f) => f.layout === 'figure');
    expect(figs.map((f) => f.figure)).toEqual(['goalTree', 'org', 'phasePlan', 'psp', 'gantt', 'load']);
    for (const f of figs) {
      const svg = F.figureSvg(ws, pid, f.figure);
      expect(svg.startsWith('<svg'), f.id).toBe(true);
      expect(Fk.canAddRow(f)).toBe(false);
    }
    expect(Fk.isWideForm(figs.find((f) => f.figure === 'gantt')!, 0)).toBe(true);
    expect(Fk.isWideForm(figs.find((f) => f.figure === 'org')!, 0)).toBe(false);
    // PSP: sechs Teilaufgaben der ersten Ebene wie Abb. 10, keine Meilensteine
    const psp = F.pspSheetSvg(ws, pid);
    expect(psp).toContain('CG-1.6');
    expect(psp).not.toContain('CG-1.7');
    // Zielhierarchie mit Legende MUSS/SOLL/KANN und Nichtzielen
    const gt = F.goalTreeSvg(ws.projects!.find((p) => p.id === pid)!);
    expect(gt).toContain('MUSS');
    expect(gt).toContain('Nichtziele');
    // leere Projekte: nichts zu zeichnen
    expect(F.figureSvg(W.defaultWorkspace(), 'x', 'psp')).toBe('');
    // Bericht enthält die Grafiken als Abbildung
    const html = R.reportHtml(ws, pid, { day: '2026-12-01' });
    expect(html).toContain('Abbildung: Zielhierarchie');
    expect(html).toContain('Abbildung: Balkenplan mit kritischem Pfad');
  });
  it('Zeilenumbruch: feste Breite, höchstens n Zeilen, lange Wörter getrennt', async () => {
    const F = await import('./gpmFigures');
    expect(F.wrap('Neue Organisationsstrukturen errichtet', 14)).toEqual(['Neue', 'Organisations-', 'strukturen', 'errichtet']);
    expect(F.wrap('a b c d e f g h', 3, 2)).toEqual(['a b', 'c …']);
  });
});

describe('F-235 (V135): Live-Projekt E-Sources', () => {
  it('legt das Projekt aus dem Lastenheft an; Aktualisieren ersetzt nur Claudes Teile, eigene Notizen bleiben', async () => {
    const Lv = await import('./liveProject');
    const D = await import('./liveProjectData');
    let ws = Lv.refreshLiveProject(W.defaultWorkspace(), 5);
    expect(Lv.hasLiveProject(ws)).toBe(true);
    const mine = (w: Workspace) => (w.notes ?? []).filter((n) => n.project === Lv.LIVE_PROJECT);
    const groups = new Set(D.LIVE_ITEMS.map((i) => i.group)).size;
    expect(mine(ws).length).toBe(D.LIVE_ITEMS.length + groups + 2 + D.LIVE_CHANGES.length);
    ws = NLo.createNote(ws, { title: 'Eigene Notiz', project: Lv.LIVE_PROJECT }, { id: 'own-1', now: 6 }).ws;
    ws = Lv.refreshLiveProject(ws, 7);
    expect(mine(ws).length).toBe(D.LIVE_ITEMS.length + groups + 3 + D.LIVE_CHANGES.length);
    expect((ws.notes ?? []).some((n) => n.id === 'own-1')).toBe(true);
    expect((ws.projects ?? []).filter((p) => p.id === Lv.LIVE_PROJECT).length).toBe(1);
    const c = Lv.liveCounts();
    expect(c.done + c.part + c.open).toBe(c.all);
  });
  it('V138: zählt alle F-Punkte – auch ohne Stand-Vermerk (offen) und mit Vermerk vor der Nummer', async () => {
    const D = await import('./liveProjectData');
    const ids = D.LIVE_ITEMS.map((i) => i.f);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(203); // 206 im Lastenheft (V142 F-238), 3 ersetzt (⇢, V141 auch F-233) fallen weg
    const st = (f: string) => D.LIVE_ITEMS.find((i) => i.f === f)?.state;
    for (const f of ['F-16', 'F-19', 'F-38', 'F-53', 'F-62', 'F-100', 'F-119', 'F-148', 'F-157', 'F-198', 'F-199']) expect(st(f)).toBe('open');
    for (const f of ['F-160', 'F-179', 'F-181', 'F-184']) expect(st(f)).toBe('done');
    expect(st('F-104')).toBe('open');
  });
  it('L7 (V136): Basisplan nur mit dem ursprünglichen Umfang, Dazugekommenes als genehmigte Änderungen', async () => {
    const Lv = await import('./liveProject');
    const D = await import('./liveProjectData');
    const ws = Lv.refreshLiveProject(W.defaultWorkspace(), 5);
    const p = (ws.projects ?? []).find((x) => x.id === Lv.LIVE_PROJECT)!;
    expect(Object.keys(p.baseline!.tasks).length).toBe(D.LIVE_ITEMS.filter((i) => i.base).length);
    const ch = (ws.notes ?? []).filter((n) => n.project === Lv.LIVE_PROJECT && n.type === 'change');
    expect(ch.length).toBe(D.LIVE_CHANGES.length);
    expect(ch.every((n) => n.change?.state === 'approved' && !!n.change.why && !!n.change.decided?.at)).toBe(true);
    expect(D.LIVE_CHANGES.flatMap((c) => c.fs).length).toBe(D.LIVE_ITEMS.filter((i) => !i.base).length);
    expect(p.goals?.some((g) => g.code === 'L3' && /Ä-\d+/.test(g.text))).toBe(true);
    expect(p.changes?.length).toBe(D.LIVE_CHANGES.length);
    expect(p.changes?.[0].measure).toMatch(/^Ä-1: /);
  });
  it('Schreibschutz (V136): Änderungen am Live-Projekt werden abgewiesen, der Rest der Aktion gilt; Kopie ist frei', async () => {
    const Lv = await import('./liveProject');
    const { reducer } = await import('./useWorkspace');
    let ws = Lv.refreshLiveProject(W.defaultWorkspace(), 5);
    const live = (w: Workspace) => (w.notes ?? []).filter(Lv.isLiveNote);
    const before = live(ws);
    Lv.setLiveLock(true);
    try {
      const t = before.find((n) => n.id.startsWith('es-n-f-'))!;
      let next = reducer(ws, { type: 'projectRemove', id: Lv.LIVE_PROJECT } as never);
      expect(Lv.hasLiveProject(next)).toBe(true);
      expect(live(next)).toEqual(before);
      next = Lv.keepLive(ws, NLo.updateNote(ws, t.id, { title: 'geändert' }, { now: 9 }));
      expect(live(next).find((n) => n.id === t.id)).toBe(t);
      const own = NLo.createNote(ws, { title: 'Fremd', project: Lv.LIVE_PROJECT }, { id: 'x-1', now: 9 }).ws;
      expect((Lv.keepLive(ws, own).notes ?? []).some((n) => n.id === 'x-1')).toBe(false);
      const other = NLo.createNote(ws, { title: 'Frei' }, { id: 'x-2', now: 9 }).ws;
      expect((Lv.keepLive(ws, other).notes ?? []).some((n) => n.id === 'x-2')).toBe(true);
      ws = reducer(ws, { type: 'liveCopy', at: 10 } as never);
      const cp = (ws.projects ?? []).find((x) => x.id === 'pj-esk1')!;
      expect(cp.name).toBe('E-Sources (Kopie)');
      const kids = (ws.notes ?? []).filter((n) => n.project === 'pj-esk1');
      expect(kids.length).toBe(before.length);
      expect(kids.every((n) => !n.parent || kids.some((k) => k.id === n.parent))).toBe(true);
      const k1 = kids.find((n) => n.parent)!;
      expect(Lv.keepLive(ws, NLo.updateNote(ws, k1.id, { title: 'meins' }, { now: 11 }))).not.toBe(ws);
      expect(Lv.liveChanged(ws, NLo.updateNote(ws, k1.id, { title: 'meins' }, { now: 11 }))).toBe(false);
    } finally {
      Lv.setLiveLock(false);
    }
  });
});

describe('F-234 (V137): AP-Statusbericht, Persönliche Kompetenzen, Anlagen, Bearbeiten im Blatt', () => {
  const form = (id: string) => Fk.GPM_D.forms.find((f) => f.id === id)!;
  it('neue Kapitel 12.1 und 15.1–16 zeichnen aus dem Beispiel wie im Report und stehen im Bericht', async () => {
    const F = await import('./gpmFigures');
    const S = await import('./sampleProject');
    const R = await import('./gpmReport');
    const ws = Fk.ensureMatrices(S.addSampleProject(W.defaultWorkspace(), 5));
    const pid = S.SAMPLE_PROJECT;
    const p = ws.projects!.find((x) => x.id === pid)!;
    // Abb. 15
    const ap = F.figureSvg(ws, pid, 'wpReport');
    expect(ap).toContain('AP Statusbericht zum 17.05.2027');
    expect(ap).toContain('18./19. KW');
    expect(ap).toContain('CG-1.6.4');
    expect(Fk.cellValue(ws, pid, form('wpReports'), 'cg-wr1', 'restHours')).toBe(97);
    expect(Fk.cellValue(ws, pid, form('wpReports'), 'cg-wr1', 'restCost')).toBe(3400);
    // Abb. 16–18
    expect(F.figureSvg(ws, pid, 'belbin')).toContain('Weichensteller');
    const eis = F.figureSvg(ws, pid, 'eisenhower', { day: '2026-12-23' });
    expect(eis).toContain('2 erledigen, 2 planen, 1 delegieren');
    expect(Fk.cellValue(ws, pid, form('eisenhower'), 'cg-11', 'quadrant')).toBe('delegate');
    expect(F.figureSvg(ws, pid, 'square')).toContain('günstigere Lackieranlagen');
    expect(p.annexes?.length).toBe(5);
    const html = R.reportHtml(ws, pid, { day: '2026-12-01' });
    expect(html).toContain('Anlage 5: Momentaufnahme Stakeholdermanagement');
    expect(html).toContain('Abbildung: AP-Statusbericht');
    // Eisenhower im Blatt ankreuzen = am Vorgang
    const w2 = Fk.setCell(ws, pid, form('eisenhower'), 'cg-11', 'important', true);
    expect(w2.notes!.find((n) => n.id === 'cg-11')!.important).toBe(true);
    // gespeichert und wieder gelesen
    const back = parseWorkspace(JSON.parse(JSON.stringify(ws)))!;
    const q = back.projects!.find((x) => x.id === pid)!;
    expect(q.wpReports?.[0].actHours).toBe(198);
    expect(q.teamRoles?.[0].ws).toBe(13);
    expect(q.messages?.[0].rRel).toContain('Weitsicht');
  });
  it('AP-Statusbericht anlegen friert Plan, Soll und Ist am Stichtag ein', async () => {
    const S = await import('./sampleProject');
    const ws = Fk.ensureMatrices(S.addSampleProject(W.defaultWorkspace(), 5));
    const pid = S.SAMPLE_PROJECT;
    const r = Fk.addRow(ws, pid, form('wpReports'), { id: 'x1', now: Date.parse('2027-05-17T10:00:00Z'), init: { task: 'cg-31' } })!;
    const rep = r.ws.projects!.find((x) => x.id === pid)!.wpReports!.find((x) => x.id === 'x1')!;
    expect(rep.wp).toBe('cg-31');
    expect(rep.sollHours).toBe(295);
    expect(rep.actHours).toBe(198);
    expect(rep.from).toBe(rep.sollStart);
    expect(rep.to).toBe('2027-05-17');
  });
  it('V138: auch Phasenplan, Balkenplan, Eisenhower, Nachrichtenquadrat und Belbin sind am Ort bearbeitbar', async () => {
    const F = await import('./gpmFigures');
    const S = await import('./sampleProject');
    const ws = Fk.ensureMatrices(S.addSampleProject(W.defaultWorkspace(), 5));
    const pid = S.SAMPLE_PROJECT;
    const p = ws.projects!.find((x) => x.id === pid)!;
    const keys = (svg: string) => [...svg.matchAll(/data-edit="([^"]+)"/g)].map((m) => m[1]);
    const phase = keys(F.figureSvg(ws, pid, 'phasePlan'));
    expect(phase.some((k) => k === `phases:${p.phases![0].id}`)).toBe(true);
    expect(phase.some((k) => k.startsWith('milestones:'))).toBe(true);
    const gantt = keys(F.figureSvg(ws, pid, 'gantt'));
    expect(gantt).toContain('tasks:cg-31');
    expect(gantt.some((k) => k.startsWith('milestones:'))).toBe(true);
    const m = p.messages![0];
    const sq = keys(F.figureSvg(ws, pid, 'square', { row: m.id }));
    expect(sq).toContain(`messages:${m.id}:message`);
    expect(sq).toContain(`messages:${m.id}:rAppeal`);
    expect(sq.length).toBe(10);
    const t = p.teamRoles![0];
    expect(keys(F.figureSvg(ws, pid, 'belbin', { row: t.id })).length).toBe(9);
    const eis = keys(F.figureSvg(ws, pid, 'eisenhower', { day: '2027-05-01' }));
    expect(eis.length).toBeGreaterThan(0);
    expect(eis.every((k) => k.startsWith('eisenhower:'))).toBe(true);
    // Balkenplan: Dauer und frühester Beginn am Ort setzen
    let w2 = Fk.applyForm(ws, { op: 'cell', pid, form: form('tasks'), row: 'cg-31', key: 'duration', value: 12, at: 9 });
    w2 = Fk.applyForm(w2, { op: 'cell', pid, form: form('tasks'), row: 'cg-31', key: 'notBefore', value: '2027-03-01', at: 10 });
    const n31 = w2.notes!.find((n) => n.id === 'cg-31')!;
    expect(n31.duration).toBe(12);
    expect(n31.notBefore).toBe('2027-03-01');
    expect(form('tasks').columns.map((c) => c.key)).not.toContain('duration');
    // jede Kennung zeigt auf eine vorhandene Zeile des Formulars dahinter
    for (const k of [...phase, ...gantt, ...eis]) {
      const [fid, row] = k.split(':');
      expect(Fk.rowsOf(ws, pid, form(fid)).some((r) => r.id === row)).toBe(true);
    }
  });
  it('Kästen sind bearbeitbar und von Hand verschiebbar (D3), Unterziel und Unter-Arbeitspaket am Ort', async () => {
    const F = await import('./gpmFigures');
    const S = await import('./sampleProject');
    let ws = S.addSampleProject(W.defaultWorkspace(), 5);
    const pid = S.SAMPLE_PROJECT;
    expect(F.figureSvg(ws, pid, 'psp')).toContain('data-edit="tasks:cg-31"');
    expect(F.figureSvg(ws, pid, 'org')).toContain('data-edit="roles:lead"');
    const before = F.figureSvg(ws, pid, 'org');
    ws = Fk.applyForm(ws, { op: 'figMove', pid, fig: 'org', key: 'roles:lead', dx: 40, dy: -10, at: 1 });
    expect(ws.projects!.find((x) => x.id === pid)!.figLayout).toEqual({ org: { 'roles:lead': { dx: 40, dy: -10 } } });
    expect(F.figureSvg(ws, pid, 'org')).not.toBe(before);
    ws = Fk.applyForm(ws, { op: 'figReset', pid, fig: 'org', at: 2 });
    expect(ws.projects!.find((x) => x.id === pid)!.figLayout).toBeUndefined();
    const g = ws.projects!.find((x) => x.id === pid)!.goals!.find((x) => x.code === 'L1')!;
    const r = Fk.addRow(ws, pid, form('goals'), { id: 'gx', init: { parent: g.id } })!;
    const ng = r.ws.projects!.find((x) => x.id === pid)!.goals!.find((x) => x.id === 'gx')!;
    expect(ng.parent).toBe(g.id);
    expect(ng.code?.startsWith('L1.')).toBe(true);
    const t = Fk.addRow(ws, pid, form('tasks'), { id: 'tx', init: { parent: 'cg-27' } })!;
    expect(t.ws.notes!.find((n) => n.id === 'tx')!.parent).toBe('cg-27');
  });
  it('Organigramm wie Abb. 7: Hierarchie, Stabsstelle, externe Rollen, Linien und Legende', async () => {
    const F = await import('./gpmFigures');
    const S = await import('./sampleProject');
    let ws = S.addSampleProject(W.defaultWorkspace(), 5);
    const pid = S.SAMPLE_PROJECT;
    const svg = F.figureSvg(ws, pid, 'org');
    expect(svg).toContain('Abgrenzung Organisation');
    expect(svg).toContain('zu koordinierende');
    expect(svg).toContain('davon 7 extern');
    const r = Fk.addRow(ws, pid, form('roles'), { id: 'st1', init: { parent: 'lead', rkind: 'staff' } })!;
    const role = r.ws.projects!.find((x) => x.id === pid)!.roles!.find((x) => x.id === 'st1')!;
    expect(role).toMatchObject({ parent: 'lead', kind: 'staff', link: 'tech', name: 'Neue Stabsstelle' });
    // keine Kreise: die Projektleitung kann nicht unter ihre eigene Stabsstelle
    ws = Fk.setCell(r.ws, pid, form('roles'), 'lead', 'parent', 'st1');
    expect(ws.projects!.find((x) => x.id === pid)!.roles!.find((x) => x.id === 'lead')!.parent).toBe('client');
    // Löschen: Untergeordnete rücken nach oben
    const d = Fk.removeRow(r.ws, pid, form('roles'), 'lead')!;
    expect(d.ws.projects!.find((x) => x.id === pid)!.roles!.find((x) => x.id === 'office')!.parent).toBe('client');
  });
  it('V139: Eisenhower zeigt „liegen lassen“, Feld unter dem Zeiger und Marken je Feld', async () => {
    const F = await import('./gpmFigures');
    const S = await import('./sampleProject');
    const ws = Fk.ensureMatrices(S.addSampleProject(W.defaultWorkspace(), 5));
    const svg = F.figureSvg(ws, S.SAMPLE_PROJECT, 'eisenhower');
    expect(svg).toMatch(/\d+ liegen lassen/);
    expect(svg).not.toContain(', 0 liegen lassen');
    const { x0, y0, gw, gh } = F.EISEN;
    expect(F.eisenQuadAt(x0 + 10, y0 + 10)).toBe('plan');
    expect(F.eisenQuadAt(x0 + gw + 10, y0 + 10)).toBe('do');
    expect(F.eisenQuadAt(x0 + 10, y0 + gh + 10)).toBe('drop');
    expect(F.eisenQuadAt(x0 + gw + 10, y0 + gh + 10)).toBe('delegate');
    expect(F.eisenQuadAt(x0 - 5, y0 + 10)).toBeNull();
    expect(F.eisenMarks('delegate')).toEqual({ important: false, urgent: true });
    expect(F.eisenMarks('drop')).toEqual({ important: false, urgent: false });
    // V139 (13:55): „Alle“ – kein „… und n weitere“, Felder wachsen, Ziehen nutzt die gewachsenen Grenzen
    const g = F.eisenGeo(ws, S.SAMPLE_PROJECT, true);
    expect(g.ghBot).toBeGreaterThan(gh);
    expect(F.figureSvg(ws, S.SAMPLE_PROJECT, 'eisenhower', { all: true })).not.toContain('weitere');
    expect(F.eisenQuadAt(x0 + 10, y0 + g.ghTop + g.ghBot - 5, g)).toBe('drop');
  });
  it('V140 (F-237): Eisenhower-Matrizen unabhängig vom PSP – Anlage wie Abb. 17, eigene Einträge, mehrere, abbilden', async () => {
    const F = await import('./gpmFigures');
    const S = await import('./sampleProject');
    const Sh = await import('./sheets');
    const No = await import('./notes');
    const R = await import('./gpmReport');
    const pid = S.SAMPLE_PROJECT;
    const eis = form('eisenhower');
    // H8: einmalig eine Matrix mit den offenen Arbeitspaketen, danach nicht wieder
    let ws = Fk.ensureMatrices(S.addSampleProject(W.defaultWorkspace(), 5));
    const m0 = Sh.projectMatrix(ws, pid)!;
    expect(m0.id).toBe(`eis-${pid}`);
    expect(m0.ids.length).toBe(Fk.openWorkPackages(ws, pid).length);
    expect(ws.projects!.find((x) => x.id === pid)!.eisenInit).toBe(true);
    expect(Fk.ensureMatrices(ws)).toBe(ws);
    // H2/H3: neue Matrix im Projekt mit Person und Datum, Eintrag direkt im Feld
    ws = Fk.applyForm(ws, { op: 'eisen', pid, act: { kind: 'new', id: 'mx2', name: 'Meine Woche', person: 'Enrico', date: '2026-12-07' }, at: 1 });
    expect(Sh.projectMatrix(ws, pid)!.id).toBe('mx2');
    expect(Fk.rowsOf(ws, pid, eis)).toEqual([]);
    ws = Fk.applyForm(ws, { op: 'add', pid, form: eis, id: 'e1', at: 2, init: { quad: 'plan' } });
    expect(No.noteById(ws, 'e1')).toMatchObject({ important: true, urgent: false });
    expect(Fk.rowsOf(ws, pid, eis).map((r) => r.id)).toEqual(['e1']);
    ws = Fk.setCell(ws, pid, eis, 'e1', 'title', 'Angebot Lackieranlage lesen');
    const svg = F.figureSvg(ws, pid, 'eisenhower', { day: '2026-12-01' });
    expect(svg).toContain('07.12.2026');
    expect(svg).toContain('Enrico');
    expect(svg).toContain('Angebot Lackieranlage lesen');
    expect(svg).toContain('data-quad="drop"');
    // Arbeitspaket übernehmen; Herausnehmen lässt es bestehen, ein Eintrag nur hier wird gelöscht – Rückgängig holt ihn
    ws = Fk.applyForm(ws, { op: 'eisen', pid, act: { kind: 'take', view: 'mx2', ids: ['cg-11'] }, at: 3 });
    expect(Fk.rowsOf(ws, pid, eis).map((r) => r.id)).toContain('cg-11');
    const r1 = Fk.removeRow(ws, pid, eis, 'cg-11', 4)!;
    expect(No.noteById(r1.ws, 'cg-11')).toBeDefined();
    const r2 = Fk.removeRow(r1.ws, pid, eis, 'e1', 5)!;
    expect(No.noteById(r2.ws, 'e1')).toBeUndefined();
    const back = Fk.undoRemoveRow(r2.ws, r2.undo, 6);
    expect(Fk.rowsOf(back, pid, eis).map((r) => r.id)).toEqual(['e1']);
    // H5: nur die persönliche Matrix sammelt Notizen mit wichtig/dringend ein
    let w2 = No.createView(back, 'eisenhower', 'Persönlich', { id: 'pm' }).ws;
    w2 = No.createNote(w2, { title: 'Steuer', important: true }, { id: 'n9' }).ws;
    expect(Sh.theMatrix(w2)!.id).toBe('pm');
    expect(Sh.matrixEntries(w2, No.viewById(w2, 'pm')!).some((e) => e.note.id === 'n9')).toBe(true);
    expect(Sh.matrixEntries(w2, No.viewById(w2, 'mx2')!).some((e) => e.note.id === 'n9')).toBe(false);
    // H6: Matrix aus Notizen abbilden – steht im Rad und im Bericht, „nicht mehr abbilden“ nimmt sie heraus
    w2 = Fk.applyForm(w2, { op: 'eisen', pid, act: { kind: 'map', view: 'pm', on: true }, at: 7 });
    expect(Sh.projectMatrices(w2, pid).map((v) => v.id)).toEqual([`eis-${pid}`, 'mx2', 'pm']);
    expect(Sh.projectMatrix(w2, pid)!.id).toBe('pm');
    const html = R.reportHtml(w2, pid, { day: '2026-12-01' });
    expect(html).toContain('Abbildung: Eisenhower-Matrix – Persönlich');
    expect(html).toContain('Abbildung: Eisenhower-Matrix – Meine Woche');
    // gespeichert und wieder gelesen: Person, Datum, abgebildete Matrizen
    const rd = parseWorkspace(JSON.parse(JSON.stringify(w2)))!;
    expect(No.viewById(rd, 'mx2')).toMatchObject({ person: 'Enrico', date: '2026-12-07', owner: { kind: 'project', id: pid } });
    expect(rd.projects!.find((x) => x.id === pid)!.eisenMaps).toEqual(['pm']);
    w2 = Fk.applyForm(w2, { op: 'eisen', pid, act: { kind: 'map', view: 'pm', on: false }, at: 8 });
    expect(Sh.projectMatrices(w2, pid).map((v) => v.id)).toEqual([`eis-${pid}`, 'mx2']);
    expect(No.viewById(w2, 'pm')).toBeDefined();
    // Matrix löschen und zurückholen
    const d = No.deleteView(w2, 'mx2')!;
    let w3 = Fk.applyForm(w2, { op: 'eisen', pid, act: { kind: 'delete', view: 'mx2' }, at: 9 });
    expect(Sh.projectMatrices(w3, pid).map((v) => v.id)).toEqual([`eis-${pid}`]);
    w3 = Fk.applyForm(w3, { op: 'eisen', pid, act: { kind: 'restore', undo: d.undo }, at: 10 });
    expect(Sh.projectMatrix(w3, pid)!.id).toBe('mx2');
  });
  it('V140 (H10, Enrico 14:22): Teilprojekte – ihre Matrizen und Arbeitspakete stehen im übergeordneten Projekt zur Wahl', async () => {
    const S = await import('./sampleProject');
    const Sh = await import('./sheets');
    const Pj = await import('./projects');
    const NLo = await import('./notes');
    const pid = S.SAMPLE_PROJECT;
    let ws = Fk.ensureMatrices(S.addSampleProject(W.defaultWorkspace(), 5));
    const sub = Pj.addProject(ws, 'Teilprojekt Lager', { parent: pid })!;
    ws = NLo.createNote(sub.ws, { title: 'Regale aufbauen', project: sub.id }, { id: 'sub-1' }).ws;
    ws = Fk.applyForm(ws, { op: 'eisen', pid: sub.id, act: { kind: 'new', id: 'mxs', name: 'Lager-Matrix' }, at: 1 });
    expect(Sh.projectMatrices(ws, pid).map((v) => v.id)).toContain('mxs');
    expect(Sh.projectMatrices(ws, sub.id).map((v) => v.id)).toEqual(['mxs']);
    const wps = Fk.openWorkPackages(ws, pid, true);
    expect(wps.find((w) => w.id === 'sub-1')?.project).toBe(sub.id);
    expect(Fk.openWorkPackages(ws, pid).some((w) => w.id === 'sub-1')).toBe(false);
    ws = Fk.applyForm(ws, { op: 'eisen', pid, act: { kind: 'take', view: `eis-${pid}`, ids: ['sub-1'] }, at: 2 });
    ws = Fk.applyForm(ws, { op: 'eisen', pid, act: { kind: 'select', view: `eis-${pid}` }, at: 3 });
    expect(Fk.cellValue(ws, pid, form('eisenhower'), 'sub-1', 'code')).toBe(wps.find((w) => w.id === 'sub-1')!.code);
  });
  it('V139 (F-232 P9): Problemstellung als Blatt – Gliederung, ausgeschaltete Felder, Pflicht, eigene Felder', async () => {
    const Fb = await import('./feedback');
    const f = { id: 'f1', kind: 'bug' as const, title: 'Lack blättert', state: 'new' as const, at: '2026-11-27T10:00:00Z', what: 'Lack löst sich', extra: { c1: 'AP 3.2' } };
    const raw = { off: ['guess', 'workaround'], required: ['impact'], custom: [{ id: 'c1', name: 'Arbeitspaket', type: 'text' as const }, { id: 'c2', name: 'Entscheidung nötig bis', type: 'date' as const, required: true }] };
    const secs = Fb.problemSheet(f, raw);
    expect(secs.map((x) => x.head)).toEqual(['Anlass & Kontext', 'Hintergrund', 'Lösungsansatz', 'Relevanz', 'Angaben für das Projekt', 'Vermerke zur Weiterverarbeitung']);
    expect(secs[1].rows.map((r) => r.key)).toEqual(['steps', 'expected', 'actual', 'affected']);
    expect(Fb.sheetGaps(secs)).toEqual(['Schritte zum Nachstellen', 'Erwartet', 'Tatsächlich', 'Schweregrad', 'Folgen', 'Entscheidung nötig bis']);
    const c = secs.find((x) => x.head === 'Angaben für das Projekt')!.rows;
    expect(c.map((r) => [r.label, r.empty])).toEqual([['Arbeitspaket', false], ['Entscheidung nötig bis', true]]);
  });
  it('V139: eine eingetragene übergeordnete Rolle lässt die übrigen an ihrem gewohnten Platz (kein Auseinanderspringen)', async () => {
    const F = await import('./gpmFigures');
    const roles = [
      { id: 'client', name: 'Auftraggeber' },
      { id: 'lead', name: 'Projektleitung' },
      { id: 'pa', name: 'Projektbüro (PA)' },
      { id: 'lm', name: 'Lackiermeister' },
      { id: 'neu', name: 'Neue Rolle', parent: 'lead' },
      { id: 'st', name: 'Neue Stabsstelle', parent: 'neu', kind: 'staff' as const },
    ];
    const up = F.orgParents(roles);
    expect(up.get('client')).toBeUndefined();
    expect(up.get('lead')).toBe('client');
    expect(up.get('pa')).toBe('lead');
    expect(up.get('lm')).toBe('lead');
    expect(up.get('neu')).toBe('lead');
    expect(up.get('st')).toBe('neu');
    // Kreis aus Eintrag und gewohnter Ordnung: die gewohnte Verbindung fällt weg, niemand fällt aus dem Bild
    const loop = F.orgParents([{ id: 'client', name: 'Auftraggeber', parent: 'pa' }, { id: 'lead', name: 'Projektleitung' }, { id: 'pa', name: 'Projektbüro' }]);
    expect(loop.get('client')).toBe('pa');
    expect(loop.get('pa')).toBeUndefined();
    expect(loop.get('lead')).toBe('client');
  });

  it('V142: Organigramm-Beschriftung und Monate wie im Report', async () => {
    const F = await import('./gpmFigures');
    expect(F.orgLabel('Auftraggeber (Geschäftsführung)', 'Hr. Meier – Geschäftsführer FIT GmbH (CG)')).toEqual({ name: 'Hr. Meier', role: 'Geschäftsführung', tab: 'Auftraggeber' });
    expect(F.orgLabel('Werkstattleitung (Lackiermeister/in)', 'Lackiermeister/in (CG, n. N.)')).toEqual({ name: 'n. N.', role: 'Werkstattleitung' });
    expect(F.orgLabel('Hr. Thomsen – Vertrieb', '')).toEqual({ name: 'Hr. Thomsen', role: 'Vertrieb' });
    const m = F.weeksToMonths(['2026-11-30', '2026-12-07', '2026-12-28', '2027-01-04']);
    expect(m.months).toEqual(['2026-12', '2027-01']);
    expect(m.of).toEqual([0, 0, 0, 1]);
    const ws = Sp.addSampleProject(W.defaultWorkspace());
    const svg = F.figureSvg(ws, Sp.SAMPLE_PROJECT, 'gantt');
    expect(svg).toContain('Vorgänger');
    expect(F.figureSvg(ws, Sp.SAMPLE_PROJECT, 'load')).toContain('Menge Ph');
  });
});

describe('V144 F-238 S6: Unterschriften in 8.3 und 12.1, Tinte im Bericht', () => {
  const form = (id: string) => Fk.GPM_D.forms.find((f) => f.id === id)!;
  it('speichert Tinte an Arbeitspaket und AP-Statusbericht, zählt sie mit und zeigt sie im Bericht', async () => {
    const S = await import('./sampleProject');
    const R = await import('./gpmReport');
    const K = await import('./ink');
    let ws = Fk.ensureMatrices(S.addSampleProject(W.defaultWorkspace(), 5));
    const pid = S.SAMPLE_PROJECT;
    ws = Fk.setSignInk(ws, pid, form('wp'), 'cg-31', 'inkOwner', 'sigW');
    ws = Fk.setSignInk(ws, pid, form('wpReports'), 'cg-wr1', 'inkPl', 'sigR');
    const back = parseWorkspace(JSON.parse(JSON.stringify(ws)))!;
    expect(back.notes!.find((n) => n.id === 'cg-31')!.wp?.inkOwner).toBe('sigW');
    expect(back.projects!.find((x) => x.id === pid)!.wpReports!.find((x) => x.id === 'cg-wr1')!.inkPl).toBe('sigR');
    const refs = K.inkRefs(back);
    expect(refs.has('sigW') && refs.has('sigR')).toBe(true);
    const rr = R.reportInkRefs(back, pid);
    expect(rr.includes('sigR') && rr.includes('sigW')).toBe(true);
    const html = R.reportHtml(back, pid, { day: '2026-12-01', inks: new Map([['sigW', '<svg xmlns="http://www.w3.org/2000/svg"></svg>']]) });
    expect(html).toContain('class="sign__ink"');
    // V148: Freigabe wie Abb. 11 („Unterschrift AP-V“ rechts neben „Unterschrift PL“)
    expect(html).toContain('Unterschrift AP-V');
    // entfernen
    const gone = Fk.setSignInk(back, pid, form('wp'), 'cg-31', 'inkOwner', null);
    expect(gone.notes!.find((n) => n.id === 'cg-31')!.wp?.inkOwner).toBeUndefined();
  });
  it('ohne Tinte steht der Name in Schreibschrift, das Datum unter der Linie', async () => {
    const R = await import('./gpmReport');
    const row = R.signRowHtml([{ label: 'Unterschrift Projektleitung', name: 'E. Schulz', date: '2026-12-04', ref: 'fehlt' }], new Map());
    expect(row).toContain('sign__name');
    expect(row).toContain('04.12.2026, Unterschrift Projektleitung');
    expect(R.signRowHtml([])).toBe('');
  });
});

describe('V144: Statusbericht (12) als Blatt wie Abb. 15', () => {
  const form = (id: string) => Fk.GPM_D.forms.find((f) => f.id === id)!;
  it('zeichnet den Projekt-Statusbericht mit Ampel, Fortschritt und Unterschrift', async () => {
    const S = await import('./sampleProject');
    const F = await import('./gpmFigures');
    const R = await import('./gpmReport');
    let ws = Fk.ensureMatrices(S.addSampleProject(W.defaultWorkspace(), 5));
    const pid = S.SAMPLE_PROJECT;
    const r = Fk.addRow(ws, pid, form('reports'), { id: 'sr1', now: Date.parse('2027-05-17T10:00:00Z') })!;
    ws = Fk.setCell(r.ws, pid, form('reports'), 'sr1', 'place', 'Hamburg');
    ws = Fk.setCell(ws, pid, form('reports'), 'sr1', 'done', 'Testlackierungen durchgeführt');
    expect(form('reports').figure).toBe('statusReport');
    const svg = F.figureSvg(ws, pid, 'statusReport', { row: 'sr1' });
    expect(svg).toContain('Statusbericht zum 17.05.2027');
    expect(svg).toContain('Fortschritt Leistung');
    expect(svg).toContain('Hamburg, 17.05.2027');
    expect(svg).toContain('Testlackierungen durchgeführt');
    expect(svg).not.toContain('<image');
    expect(F.kwOf('2026-12-01', '2027-05-17')).toBe('49. KW 2026 – 20. KW 2027');
    expect(F.kwOf('2027-05-03', '2027-05-17')).toBe('18.–20. KW');
    ws = Fk.setSignInk(ws, pid, form('reports'), 'sr1', 'inkPl', 'sigS');
    const back = parseWorkspace(JSON.parse(JSON.stringify(ws)))!;
    const inks = new Map([['sigS', '<svg xmlns="http://www.w3.org/2000/svg"></svg>']]);
    expect(F.figureSvg(back, pid, 'statusReport', { row: 'sr1', inks })).toContain('<image');
    expect(R.reportInkRefs(back, pid)).toContain('sigS');
    expect(R.reportHtml(back, pid, { day: '2027-05-18', inks })).toContain('Abbildung: Statusbericht');
    // AP-Statusbericht unverändert, mit Tinte im Fuß
    expect(F.figureSvg(back, pid, 'wpReport')).toContain('AP Statusbericht zum 17.05.2027');
  });
});

describe('V145 Freigabe mit Namen, eigene Vorlagen mit Blatt', () => {
  const sample = () => Sp.addSampleProject(W.defaultWorkspace(), 5);
  const pid = Sp.SAMPLE_PROJECT;
  it('Projektleitung bekommt den Namen aus der Rolle „lead“ – in 8.3, 12 und 12.1', async () => {
    const Rp = await import('./gpmReport');
    const Ps = await import('./persons');
    const ws = sample();
    const p = Pj.projectById(ws, pid)!;
    const lead = Ps.personById(ws, Pj.rolesOf(p).find((r) => r.id === 'lead')?.person)?.name;
    expect(Rp.leadName(ws, p)).toBe(lead || undefined);
    for (const id of ['reports', 'wpReports']) {
      const f = Fk.GPM_D.forms.find((x) => x.id === id)!;
      const row = Fk.rowsOf(ws, pid, f)[0];
      if (!row) continue;
      const pl = Rp.reportSigns(ws, p, f, row.id).find((g) => g.label.endsWith('Projektleitung'));
      expect(pl?.name).toBe(lead || undefined);
    }
    const ap = Fk.GPM_D.forms.find((x) => x.id === 'wpReports')!;
    const r = (p.wpReports ?? [])[0];
    if (r) {
      const n = (ws.notes ?? []).find((x) => x.id === r.wp);
      const want = n?.assignee ? Ps.personById(ws, n.assignee)?.name : undefined;
      expect(Rp.reportSigns(ws, p, ap, r.id)[0].name).toBe(want || undefined);
    }
    const noLead = Pj.editProject(ws, pid, { roles: Pj.rolesOf(p).filter((x) => x.id !== 'lead') });
    expect(Rp.leadName(noLead, Pj.projectById(noLead, pid)!)).toBeUndefined();
  });
  it('Kopie von GPM_D ohne Figur im Statusbericht bekommt das Blatt der Standardvorlage', () => {
    const old = { id: 'mine', name: 'Meine', forms: Fk.GPM_D.forms.map((f) => { const c = { ...f }; if (c.id === 'reports') delete c.figure; return c; }) };
    const [t] = Fk.parseFormTemplates([JSON.parse(JSON.stringify(old))]);
    expect(t.forms.find((f) => f.id === 'reports')!.figure).toBe('statusReport');
    expect(t.forms.find((f) => f.id === 'wpReports')!.figure).toBe('wpReport');
    // Tabellen ohne Blatt bleiben ohne Figur
    expect(t.forms.find((f) => f.id === 'goals')!.figure).toBeUndefined();
  });
});

describe('V145 Balkenplan-Kopf wie MS Project', () => {
  const dn = (d: string) => Math.round(Date.parse(`${d}T12:00:00Z`) / 864e5);
  it('Quartale mit Jahr über den Jahreswechsel, KW nur bei Platz', async () => {
    const Fg = await import('./gpmFigures');
    const a = { x0: 0, w: 600, d0: dn('2026-11-01'), d1: dn('2027-03-01') };
    const t = Fg.ganttTiers(a);
    expect(t.quarters.map((q) => q.label)).toEqual(['Q4 2026', 'Q1 2027']);
    expect(t.quarters[0].x1).toBe(0);
    expect(t.quarters[1].x2).toBe(600);
    // 120 Tage auf 600 Punkte = 35 Punkte je Woche → KW
    expect(t.weeks).not.toBeNull();
    expect(t.weeks![0].label).toBe('44');
    expect(t.weeks!.some((w) => w.label === '53')).toBe(true);
    // ein Jahr auf 600 Punkte: zu eng für KW
    expect(Fg.ganttTiers({ x0: 0, w: 600, d0: dn('2026-01-01'), d1: dn('2027-01-01') }).weeks).toBeNull();
  });
  it('Blatt zeigt Quartale und bleibt im Rahmen', async () => {
    const Fg = await import('./gpmFigures');
    const ws = Sp.addSampleProject(W.defaultWorkspace(), 5);
    const svg = Fg.ganttSheetSvg(ws, Sp.SAMPLE_PROJECT);
    expect(svg).toContain('Q4 2026');
    expect(svg).toContain('KW 53');
    expect(/<(text|rect)[^>]* y="-/.test(svg)).toBe(false);
  });
});

describe('V145 Phasenplan: Beschriftungen ohne Überlappung', () => {
  it('labelLevels stapelt nur, was sich überlagert, je Gruppe getrennt', async () => {
    const Fg = await import('./gpmFigures');
    expect(Fg.labelLevels([{ x1: 0, x2: 20 }, { x1: 10, x2: 30 }, { x1: 15, x2: 35 }, { x1: 40, x2: 60 }])).toEqual([0, 1, 2, 0]);
    expect(Fg.labelLevels([{ x1: 0, x2: 20, group: 1 }, { x1: 5, x2: 25, group: 2 }])).toEqual([0, 0]);
    // Reihenfolge der Eingabe bleibt erhalten
    expect(Fg.labelLevels([{ x1: 50, x2: 70 }, { x1: 0, x2: 60 }])).toEqual([1, 0]);
  });
  it('Phasenplan ColorGentlemen bleibt zeichenbar', async () => {
    const Fg = await import('./gpmFigures');
    const ws = Sp.addSampleProject(W.defaultWorkspace(), 5);
    expect(Fg.phasePlanSvg(ws, Sp.SAMPLE_PROJECT)).toContain('Projektmonat');
  });
});

describe('V145 Organigramm: Abkürzungen in der Legende', () => {
  it('nur vorkommende Kürzel, eigene Erklärung vor der Liste, Firmenkürzel ohne Erklärung fehlen', async () => {
    const Fg = await import('./gpmFigures');
    expect(Fg.orgAbbrevs(['QMB', 'Hr. Baum – TL Aufbau', 'Projektbüro (PA)', 'Fr. Mikitta – Projektassistenz, QMB (CG)'])).toEqual([
      ['PA', 'Projektbüro'],
      ['QMB', 'Beauftragte/r Qualitätsmanagement'],
      ['TL', 'Teamleitung'],
    ]);
    expect(Fg.orgAbbrevs(['Projektleitung'])).toEqual([]);
  });
  it('ColorGentlemen: Organigramm zeigt die Abkürzungen', async () => {
    const Fg = await import('./gpmFigures');
    const ws = Sp.addSampleProject(W.defaultWorkspace(), 5);
    const svg = Fg.figureSvg(ws, Sp.SAMPLE_PROJECT, 'org');
    expect(svg).toContain('Abkürzungen');
    expect(svg).toContain('Teamleitung');
  });
});

describe('V147: Projektsteckbrief im Bericht wie Abbildung 3', () => {
  it('Reihenfolge und Blöcke wie im Report, gleiche Werte wie das Blatt, ICB4-Ergänzungen darunter', () => {
    let ws = Sp.addSampleProject(W.defaultWorkspace(), 5);
    const id = Sp.SAMPLE_PROJECT;
    const f = Fk.GPM_D.forms.find((x) => x.id === 'charter')!;
    ws = Fk.setCell(ws, id, f, id, 'businessCase', 'Großkunde sichert Auslastung');
    const html = Rpt.reportHtml(ws, id, { day: '2021-01-15' });
    const sec = html.slice(html.indexOf('id="f-charter"'), html.indexOf('id="f-goals"'));
    const order = ['Projekttitel', 'Projektnummer', 'AG extern/Kunde', 'AG intern', 'Projektleiter/in', 'Projektart', 'Oberziel', 'Hauptziele/ Kurzbeschreibung', 'Angestrebter Nutzen', 'Termine', 'Fixierte Meilensteine', 'Gesamtdauer', 'Kapazitätsaufwand', 'Budget insgesamt', 'Kosten €', 'PM-Kosten', 'Risikorücklage €', 'Projektbeteiligte', 'Fachteam', 'Lenkungsausschuss', 'Externe Dienstleister', 'Weitere wichtige SH', 'Berichterstattung', 'Mögliche Störungen/Risiken', 'Besonderheiten', 'Freigabe', 'Ergänzungen nach ICB4'];
    const at = order.map((k) => sec.indexOf(k));
    expect(at.every((x) => x > 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(sec.includes('7 Monate')).toBe(true);
    expect(sec.includes('Großkunde sichert Auslastung')).toBe(true);
    // alte Bezeichnungen des Projektauftrags sind weg
    expect(sec.includes('Ausgangssituation')).toBe(false);
    const v = Cs.charterView(ws, Pj.projectById(ws, id)!);
    expect(sec.includes(v.lead)).toBe(true);
    // ohne Person in der Rolle: Name aus der Freigabe PL
    const noLead = { ...Pj.projectById(ws, id)!, roles: Pj.rolesOf(Pj.projectById(ws, id)!).map((r) => (r.id === 'lead' ? { ...r, person: undefined } : r)) };
    expect(Cs.charterView(ws, noLead).lead).toBe('Enrico Schulz');
    expect(Cs.monthsBetween('2020-12-01', '2021-06-30')).toBe(7);
    // Formular-Feldliste in Report-Reihenfolge, Ergänzungen nach ICB4 hinten
    const keys = Fk.FIELDS.charter.map((x) => x.key);
    expect(keys.indexOf('goal')).toBeLessThan(keys.indexOf('main'));
    expect(keys.indexOf('others')).toBeLessThan(keys.indexOf('reporting'));
    expect(Cs.CHARTER_EXTRAS.every((k) => keys.indexOf(k) > keys.indexOf('releasePl'))).toBe(true);
  });
});

describe('V147: Eisenhower-Merker', () => {
  it('Live-Projekt behält beim Aktualisieren gewählte Matrizen; Matrix-Umstellung läuft nur einmal', () => {
    let ws = Lv.refreshLiveProject(W.defaultWorkspace(), 5);
    ws = Fk.ensureMatrices(ws, 6);
    ws = Pj.editProject(ws, Lv.LIVE_PROJECT, { eisenMaps: ['eis-pj-es'], eisenSel: 'eis-pj-es' }, 7);
    ws = Lv.refreshLiveProject(ws, 8);
    const p = Pj.projectById(ws, Lv.LIVE_PROJECT)!;
    expect([p.eisenMaps, p.eisenSel, p.eisenInit]).toEqual([['eis-pj-es'], 'eis-pj-es', true]);
    // Projekt mit Merker (von Hand angelegt) bekommt beim Laden keine Matrix
    const made = Pj.addProject(ws, 'Neu', { eisenInit: true }, 9)!;
    expect(Fk.ensureMatrices(made.ws, 10)).toBe(made.ws);
  });
});

describe('V148 F-232: Arbeitspaketbeschreibung wie Abb. 11, Statusberichte ohne zweite Feldliste, Abschluss mit Abnahme', () => {
  const fm = (id: string) => Fk.GPM_D.forms.find((f) => f.id === id)!;
  it('8.3 im Bericht als Blatt mit Projektname, Teilaufgabe, Dauer, Vorgänger, Personal und Sachmittel', async () => {
    const S = await import('./sampleProject');
    const R = await import('./gpmReport');
    const V = await import('./wpSheet');
    const ws = S.addSampleProject(W.defaultWorkspace(), 5);
    const p = ws.projects!.find((x) => x.id === S.SAMPLE_PROJECT)!;
    const v = V.wpView(ws, p, 'cg-31');
    expect(v.projectNo).toBe('CG-1');
    expect(v.part.includes('Organisation und Prozesse')).toBe(true);
    expect(v.lead.length > 0).toBe(true);
    expect(v.duration).toBe('2 Monate');
    expect(v.preds.length).toBe(4);
    expect(v.staff.length).toBe(4);
    expect(V.staffLines(v)[0].endsWith('10 Ph')).toBe(true);
    const html = R.reportHtml(ws, p.id, { day: '2026-12-01', base: 'https://x.test/' });
    const sec = html.slice(html.indexOf('id="f-wp"'), html.indexOf('</section>', html.indexOf('id="f-wp"')));
    expect(sec).toContain('class="kv wpsheet"');
    for (const k of ['AP Bezeichnung', 'Teilaufgabe', 'Dauer', 'Vorgänger/Voraussetzungen', 'Nachfolger', 'Personal', 'Sachmittel', 'Anlagen', 'Fortschrittsmessung', 'Arbeitsaufwand: ', 'Unterschrift PL', 'Unterschrift AP-V']) expect(sec).toContain(k);
    expect(sec).toContain('Glasklar GmbH');
    // PL links, AP-V rechts
    expect(sec.indexOf('Unterschrift PL') < sec.indexOf('Unterschrift AP-V')).toBe(true);
    // Feld „Ziel und Inhalt“ als Ergänzung unter dem Blatt
    expect(sec).toContain('Ziel und Inhalt');
  });
  it('Felder Sachmittel und Anlagen lassen sich setzen und bleiben beim Laden', async () => {
    const S = await import('./sampleProject');
    let ws = S.addSampleProject(W.defaultWorkspace(), 5);
    ws = Fk.setCell(ws, S.SAMPLE_PROJECT, fm('wp'), 'cg-31', 'annex', 'Anlage 3');
    const back = parseWorkspace(JSON.parse(JSON.stringify(ws)))!;
    expect(back.notes!.find((n) => n.id === 'cg-31')!.wp?.annex).toBe('Anlage 3');
    expect(back.notes!.find((n) => n.id === 'cg-31')!.wp?.material?.startsWith('Die Sachmittel')).toBe(true);
  });
  it('12.1 zeigt das Blatt ohne zweite Feldliste; 14 mit Abnahme Auftraggeber und „Datum“ als Platzhalter', async () => {
    const S = await import('./sampleProject');
    const R = await import('./gpmReport');
    const ws = S.addSampleProject(W.defaultWorkspace(), 5);
    const html = R.reportHtml(ws, S.SAMPLE_PROJECT, { day: '2026-12-01' });
    const at = html.indexOf('id="f-wpReports"');
    const sec = html.slice(at, html.indexOf('</section>', at));
    expect(sec).toContain('<figure>');
    expect(sec.includes('Berichtszeitraum von')).toBe(false);
    const c = html.indexOf('id="f-close"');
    const close = html.slice(c, html.indexOf('</section>', c));
    expect(close).toContain('Abnahme Auftraggeber');
    expect(close).toContain('Datum, Unterschrift Projektleitung');
    expect(close.includes('>Abnahme am<')).toBe(false);
  });
});
describe('V149 F-232: Teamrollen und Nachrichtenquadrat im Bericht ohne doppelte Felder', () => {
  it('unter dem Blatt nur Felder, die das Blatt nicht zeigt', async () => {
    const S = await import('./sampleProject');
    const R = await import('./gpmReport');
    const ws = S.addSampleProject(W.defaultWorkspace(), 5);
    const html = R.reportHtml(ws, S.SAMPLE_PROJECT, { day: '2026-12-01' });
    const part = (id: string) => { const at = html.indexOf(`id="f-${id}"`); const sec = html.slice(at, html.indexOf('</section>', at)); return sec.slice(sec.indexOf('</figure>')); };
    const tr = part('teamRoles');
    expect(tr).toContain('Datum der Bestimmung');
    expect(tr).toContain('Reflexion der eigenen Teamrolle');
    expect(tr.includes('>Teammitglied<')).toBe(false);
    expect(tr.includes('Punkte')).toBe(false);
    const sq = part('messages');
    expect(sq).toContain('>Sender<');
    expect(sq).toContain('>Empfänger<');
    expect(sq.includes('Sachebene')).toBe(false);
    expect(sq.includes('>Reaktion<')).toBe(false);
  });
});
describe('V149 F-232 P9: Problemstellungen und Entscheidungsvorlagen als Anlage im Bericht', () => {
  it('Anlage A und B mit Inhaltsverzeichnis, ohne Einträge keine Anlage', async () => {
    const S = await import('./sampleProject');
    const R = await import('./gpmReport');
    const Fb = await import('./feedback');
    const Dc = await import('./decisions');
    let ws = S.addSampleProject(W.defaultWorkspace(), 5);
    expect(R.reportHtml(ws, S.SAMPLE_PROJECT, { day: '2026-12-01' }).includes('Anlage A')).toBe(false);
    ws = Fb.addFeedback(ws, { kind: 'bug', title: 'Lackierkabine zu klein', project: S.SAMPLE_PROJECT, what: 'Kabine fasst keine Stoßstange' }, { id: 'fb1', now: new Date('2026-11-02T10:00:00Z') })!.ws;
    const names = { criterion: (n: number) => `Kriterium ${n}`, option: (n: number) => `Lösung ${n}` };
    ws = Dc.addDecision(ws, { title: 'Lackieranlage', projectId: S.SAMPLE_PROJECT, question: 'Welche Anlage?' }, { id: 'dc1', ids: ['c1', 'c2', 'c3', 'o1', 'o2'], names })!.ws;
    const html = R.reportHtml(ws, S.SAMPLE_PROJECT, { day: '2026-12-01' });
    expect(html).toContain('href="#an-fb"');
    expect(html).toContain('href="#an-dc"');
    const a = html.slice(html.indexOf('id="an-fb"'));
    expect(a).toContain('A1 Lackierkabine zu klein');
    expect(a).toContain('Kabine fasst keine Stoßstange');
    expect(a).toContain('Was passiert bzw. fehlt');
    const b = html.slice(html.indexOf('id="an-dc"'));
    expect(b).toContain('B1 Lackieranlage');
    expect(b).toContain('Welche Anlage?');
    expect(b).toContain('Nutzwert');
    expect(b).toContain('Lösung 1');
  });
});
