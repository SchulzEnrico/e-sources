import { describe, expect, it } from 'vitest';
import type { Note, Workspace } from './types';
import * as W from './workspace';
import * as Pj from './projects';
import * as P from './persons';
import * as Rs from './resources';
import * as Cal from './calendar';
import * as Sp from './sampleProject';

const note = (id: string, extra: Partial<Note> = {}): Note => ({ id, title: id, text: '', state: 'open', trail: [], created: 1, changed: 1, ...extra }) as Note;

describe('Ressourcen-Ansicht (V116, Schritt 10)', () => {
  it('verteilt Stunden gleichmäßig auf die Arbeitstage, Wochen gegen Kapazität', () => {
    let ws = { ...W.defaultWorkspace(), notes: [] } as Workspace;
    const a = P.addPerson(ws, 'Anna')!;
    ws = P.editPerson(a.ws, a.id, { capacity: 20 });
    const r = Pj.addProject(ws, 'Bau', { start: '2026-11-30' })!;
    ws = { ...r.ws, notes: [note('t1', { project: r.id, duration: 10, use: [{ person: a.id, hours: 50 }] }), note('t2', { project: r.id, duration: 5, effort: { plan: 8 } })] } as Workspace;
    const u = Rs.resourceUse(ws, r.id, '2026-11-26');
    expect(u.weeks).toEqual(['2026-11-30', '2026-12-07']);
    expect(u.rows.length).toBe(1);
    expect(u.rows[0].hours).toEqual([25, 25]);
    expect(u.rows[0].capacity).toEqual([20, 20]);
    expect(u.rows[0].over).toBe(2);
    expect(u.rows[0].tasks[0]).toMatchObject({ id: 't1', total: 50 });
    expect(u.open).toBe(8);
  });
  it('Feiertage zählen nicht; Beispielprojekt hat Ressourcen', () => {
    let ws = { ...W.defaultWorkspace(), notes: [] } as Workspace;
    const a = P.addPerson(ws, 'Anna')!;
    const r = Pj.addProject(a.ws, 'Bau', { start: '2026-12-21' })!;
    ws = { ...r.ws, notes: [note('t1', { project: r.id, duration: 5, use: [{ person: a.id, hours: 40 }] })] } as Workspace;
    Cal.setCalendar({ region: 'HH' });
    try {
      const u = Rs.resourceUse(ws, r.id, '2026-11-26');
      // 21.–24.12. (4 Tage), 25.12. frei, dann 28.12. → 8 h je Tag
      expect(u.rows[0].hours).toEqual([32, 8]);
    } finally {
      Cal.setCalendar(undefined);
    }
    const s = Sp.addSampleProject({ ...W.defaultWorkspace(), notes: [] } as Workspace, 5);
    const su = Rs.resourceUse(s, Sp.SAMPLE_PROJECT, '2026-11-25');
    expect(su.rows.length).toBeGreaterThan(0);
    expect(su.weeks.length).toBeGreaterThan(20);
  });
});
