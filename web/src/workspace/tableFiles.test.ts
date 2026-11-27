import { describe, expect, it } from 'vitest';
import type { Workspace } from './types';
import * as W from './workspace';
import * as Sp from './sampleProject';
import * as Tf from './tableFiles';
import * as Pj from './projects';
import { ganttOf } from './gantt';

const cg = (): Workspace => Sp.addSampleProject({ ...W.defaultWorkspace(), notes: [] } as Workspace, 5);
const day = '2026-11-27';

describe('V141 F-230 F7 CSV/Excel und iCal', () => {
  it('Vorgänger wie MS Project lesen und schreiben', () => {
    expect(Tf.parsePreds('3;5AA+2 Tage, 7FS-1')).toEqual([
      { nr: 3, rel: 'EA', lag: 0 },
      { nr: 5, rel: 'AA', lag: 2 },
      { nr: 7, rel: 'EA', lag: -1 },
    ]);
    expect(Tf.parseDay('Mo 26.01.27')).toBe('2027-01-26');
    expect(Tf.parseDay('1/26/2027')).toBe('2027-01-26');
  });

  it('CSV: Kopf wie MS Project, BOM und Semikolon; Rundlauf ergibt dieselben Vorgänge und dasselbe Ende', () => {
    const ws = cg();
    const csv = Tf.exportCsv(ws, Sp.SAMPLE_PROJECT, { today: day });
    expect(csv.startsWith('﻿Nr.;PSP-Code;Name;')).toBe(true);
    const rows = Tf.parseCsv(csv);
    const g = ganttOf(ws, Sp.SAMPLE_PROJECT, day);
    expect(rows.length).toBe(g.rows.length + 1);
    const r = Tf.importCsv(ws, csv, { name: 'ColorGentlemen.csv', now: 9 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Pj.projectById(r.ws, r.project)!.name).toBe('ColorGentlemen (Import)');
    expect(r.tasks).toBe(g.rows.length);
    expect(r.links).toBeGreaterThan(0);
    const g2 = ganttOf(r.ws, r.project, day);
    expect(g2.rows.map((x) => x.node.title)).toEqual(g.rows.map((x) => x.node.title));
    expect(g2.end).toBe(g.end);
  });

  it('CSV aus Excel/MS Project englisch (Komma, Anführungszeichen, Wochen, Ressourcen)', () => {
    const csv = 'Task Name,Duration,Start,Finish,Predecessors,Resource Names,Outline Level\n"Planung, grob",1 wk,1/4/2027,1/8/2027,,Anna,1\nUmsetzen,3 days,1/11/2027,1/13/2027,1,"Anna,Ben",1\nFertig,0 days,1/13/2027,1/13/2027,2,,1\n';
    const r = Tf.importCsv(W.defaultWorkspace(), csv, { name: 'plan.csv' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const ns = (r.ws.notes ?? []).filter((n) => n.project === r.project);
    expect(ns.map((n) => n.title)).toEqual(['Planung, grob', 'Umsetzen', 'Fertig']);
    expect(ns[0].duration).toBe(5);
    expect(ns[2].milestone).toBe(true);
    expect(ns[1].after).toEqual([{ id: ns[0].id, rel: 'EA' }]);
    expect(ns[1].use!.length).toBe(2);
    expect(r.persons).toBe(2);
    expect(Tf.importCsv(W.defaultWorkspace(), 'a;b\n1;2\n')).toEqual({ ok: false, error: 'noName' });
  });

  it('iCal: ein Termin je Vorgang; Rundlauf mit gleichen Titeln und Terminen', () => {
    const ws = cg();
    const ics = Tf.exportIcs(ws, Sp.SAMPLE_PROJECT, { today: day, now: 0 });
    expect(Tf.isIcs(ics)).toBe(true);
    expect(ics.split('\r\n').every((l) => l.length <= 75)).toBe(true);
    const g = ganttOf(ws, Sp.SAMPLE_PROJECT, day);
    const tasks = g.rows.filter((x) => x.planned && !x.node.summary);
    expect((ics.match(/BEGIN:VEVENT/g) ?? []).length).toBe(tasks.length);
    const r = Tf.importIcs(ws, ics, { now: 9 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.tasks).toBe(tasks.length);
    const ns = (r.ws.notes ?? []).filter((n) => n.project === r.project);
    expect(ns.filter((n) => n.milestone).length).toBe(tasks.filter((x) => x.node.milestone).length);
    const g2 = ganttOf(r.ws, r.project, day);
    expect(g2.start).toBe(g.start);
    expect(Tf.importIcs(ws, 'kein Kalender')).toEqual({ ok: false, error: 'ics' });
  });
});
