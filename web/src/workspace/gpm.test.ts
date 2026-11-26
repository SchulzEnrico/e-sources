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
  it('Vorlage: Kapitel in Leitfaden-Reihenfolge, jede Spalte im Feldkatalog, Stufe 1', () => {
    expect(Fk.GPM_D.forms.map((f) => f.chapter)).toEqual(['2.1', '2.2', '2.2', '2.3', '4', '5', '6.2', '7', '7', '8', '10', '10', '11']);
    for (const f of Fk.GPM_D.forms) {
      expect(f.stage).toBe(1);
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
    expect(Fk.rowsOf(ws, pid, form('goals')).map((r) => Fk.cellValue(ws, pid, form('goals'), r.id, 'code'))).toEqual(['L1', 'L1.1', 'L1.2', 'L1.3', 'L1.4', 'L1.5', 'L2', 'L2.1', 'L2.2', 'S1', 'S2']);
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
