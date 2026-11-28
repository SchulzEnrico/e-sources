import { describe, expect, it } from 'vitest';
import * as W from './workspace';
import * as Sp from './sampleProject';
import { refreshSample, undoRefreshSample } from './sampleRefresh';
import type { Note, Project, Workspace } from './types';

const sample = (): Workspace => Sp.addSampleProject(W.defaultWorkspace(), 5);
const proj = (ws: Workspace): Project => (ws.projects ?? []).find((p) => p.id === Sp.SAMPLE_PROJECT)!;
const note = (ws: Workspace, id: string): Note => (ws.notes ?? []).find((n) => n.id === id)!;
const withProject = (ws: Workspace, f: (p: Project) => Project): Workspace => ({ ...ws, projects: (ws.projects ?? []).map((p) => (p.id === Sp.SAMPLE_PROJECT ? f(p) : p)) });
/** wie ein Beispiel aus einer älteren Version: ohne Teamrollen, Logo, Phasen an den Vorgängen und AP-Beschreibung */
const old = (): Workspace => {
  let ws = withProject(sample(), (p) => {
    const { teamRoles: _t, ...rest } = p;
    const { logo: _l, ...charter } = p.charter ?? {};
    return { ...rest, charter } as Project;
  });
  ws = { ...ws, notes: (ws.notes ?? []).map((n) => { const { phase: _p, wp: _w, ...r } = n; return r as Note; }) };
  return ws;
};

describe('V159 Beispiel auffrischen', () => {
  it('frisch angelegt: nichts zu ergänzen', () => {
    const ws = sample();
    const r = refreshSample(ws, 'cg', 9);
    expect(r.added).toEqual([]);
    expect(r.undo).toBeNull();
    expect(r.ws).toBe(ws);
  });
  it('ohne Beispiel: unverändert', () => {
    const ws = W.defaultWorkspace();
    expect(refreshSample(ws, 'cg').ws).toBe(ws);
  });
  it('älteres Beispiel: Teamrollen, Logo, Phasen und AP-Beschreibung kommen dazu', () => {
    const r = refreshSample(old(), 'cg', 9);
    const p = proj(r.ws);
    expect(p.teamRoles?.length).toBe(1);
    expect(p.charter?.logo).toBe('es-img:cg-logo');
    expect(r.added).toContain('Teamrollen (Belbin)');
    expect(r.added).toContain('Logo');
    expect(note(r.ws, 'cg-31').wp?.goal).toBeTruthy();
    expect(note(r.ws, 'cg-31').phase).toBe('cg-ph4');
    expect(r.added.some((a) => a.startsWith('Angaben an'))).toBe(true);
    // danach ist nichts mehr offen
    expect(refreshSample(r.ws, 'cg', 10).added).toEqual([]);
  });
  it('Enricos Änderungen bleiben: geänderte Texte, gelöschte Einträge und einzeln entfernte Angaben kommen nicht wieder', () => {
    let ws = old();
    ws = withProject(ws, (p) => ({ ...p, name: 'Mein CG', goals: (p.goals ?? []).slice(1), brief: { ...p.brief, goal: 'Eigenes Ziel' } }));
    const goals = proj(ws).goals!.length;
    const marked = (ws.notes ?? []).find((n) => n.important)!;
    ws = { ...ws, notes: (ws.notes ?? []).filter((n) => n.id !== 'cg-12').map((n) => (n.id === marked.id ? { ...n, important: undefined } : n)) };
    const r = refreshSample(ws, 'cg', 9);
    const p = proj(r.ws);
    expect(p.name).toBe('Mein CG');
    expect(p.brief?.goal).toBe('Eigenes Ziel');
    expect(p.goals?.length).toBe(goals);
    expect(note(r.ws, 'cg-12')).toBeUndefined();
    expect(note(r.ws, marked.id).important).toBeUndefined();
  });
  it('fehlt eine ganze Art (Risiken/Änderungen), kommt sie wieder', () => {
    const ws = { ...sample(), notes: (sample().notes ?? []).filter((n) => !n.type) };
    const r = refreshSample(ws, 'cg', 9);
    expect(note(r.ws, 'cg-r1')?.type).toBe('risk');
    expect(note(r.ws, 'cg-c2')?.type).toBe('change');
    expect(r.added.some((a) => a.includes('Risiken/Chancen') && a.includes('Änderungen'))).toBe(true);
  });
  it('fehlende Person des Beispiels kommt wieder', () => {
    const base = sample();
    const ws = { ...base, persons: (base.persons ?? []).filter((p) => p.id !== 'pn-cg-meier') };
    const r = refreshSample(ws, 'cg', 9);
    expect((r.ws.persons ?? []).some((p) => p.id === 'pn-cg-meier')).toBe(true);
    expect(r.added).toContain('Angaben zu Personen');
  });
  it('Rückgängig stellt den Stand vorher genau wieder her', () => {
    const before = old();
    const r = refreshSample({ ...before, notes: (before.notes ?? []).filter((n) => !n.type) }, 'cg', 9);
    const back = undoRefreshSample(r.ws, r.undo!);
    expect(back.projects).toEqual(before.projects);
    expect(back.notes).toEqual((before.notes ?? []).filter((n) => !n.type));
    expect(back.persons).toEqual(before.persons);
  });
});
