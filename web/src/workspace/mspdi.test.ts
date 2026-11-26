import { describe, expect, it } from 'vitest';
import * as W from './workspace';
import * as Sp from './sampleProject';
import * as M from './mspdi';
import { ganttOf } from './gantt';

const pid = Sp.SAMPLE_PROJECT;
const sample = () => Sp.addSampleProject(W.defaultWorkspace(), 5);
const tags = (xml: string, name: string) => [...xml.matchAll(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'g'))].map((m) => m[1]);

describe('F-230 MSPDI-Export (V118)', () => {
  it('Kopf, Projektsammelzeile und ein Task je Gantt-Zeile mit Gliederung', () => {
    const ws = sample();
    const xml = M.exportMspdi(ws, pid, { today: '2027-01-15' });
    expect(xml.startsWith('<?xml')).toBe(true);
    expect(xml).toContain(`<Project xmlns="${M.MSPDI_NS}">`);
    const g = ganttOf(ws, pid, '2027-01-15');
    const tasks = tags(xml, 'Task');
    expect(tasks.length).toBe(g.rows.length + 1);
    expect(tasks[0]).toContain('<UID>0</UID>');
    expect(tasks[1]).toContain('<OutlineNumber>1</OutlineNumber>');
    // Ebenen der Gliederung folgen dem PSP
    g.rows.forEach((r, i) => expect(tasks[i + 1]).toContain(`<OutlineLevel>${r.node.depth + 1}</OutlineLevel>`));
    expect(M.exportMspdi(ws, 'gibt-es-nicht')).toBe('');
  });
  it('Vorgänger mit Art und Abstand, Dauer in Stunden, Termine aus dem Gantt', () => {
    const ws = sample();
    const xml = M.exportMspdi(ws, pid, { today: '2027-01-15' });
    const g = ganttOf(ws, pid, '2027-01-15');
    const withPred = g.rows.findIndex((r) => r.preds.length > 0);
    expect(withPred).toBeGreaterThanOrEqual(0);
    const r = g.rows[withPred];
    const t = tags(xml, 'Task')[withPred + 1];
    const pred = r.preds[0];
    const fromUid = g.rows.findIndex((x) => x.id === pred.id) + 1;
    expect(t).toContain(`<PredecessorUID>${fromUid}</PredecessorUID><Type>${M.REL_TO_MSPDI[pred.rel]}</Type>`);
    expect(t).toContain(`<LinkLag>${pred.lag * 4800}</LinkLag>`);
    if (!r.node.milestone) {
      expect(t).toContain(`<Start>${r.start}T08:00:00</Start>`);
      expect(t).toContain(`<Duration>${M.ptHours(r.days * 8)}</Duration>`);
    }
    expect(M.ptHours(12.5)).toBe('PT12H30M0S');
  });
  it('Ressourcen, Zuordnungen und Kalender mit freien Tagen; Sonderzeichen maskiert', () => {
    let ws = sample();
    ws = { ...ws, calendar: { region: 'HH', free: [{ day: '2027-02-15', name: 'Klausur <intern>' }] } };
    const xml = M.exportMspdi(ws, pid, { today: '2027-01-15' });
    expect(tags(xml, 'Resource').length).toBeGreaterThan(0);
    expect(tags(xml, 'Assignment').length).toBeGreaterThan(0);
    expect(xml).toContain('<FromDate>2027-02-15T00:00:00</FromDate>');
    expect(xml).toContain('<FromDate>2026-12-25T00:00:00</FromDate>');
    expect(xml).not.toContain('<intern>');
    // jede Zuordnung zeigt auf vorhandene Task- und Resource-UIDs
    const taskUids = new Set(tags(xml, 'Task').map((t) => /<UID>(\d+)<\/UID>/.exec(t)![1]));
    const resUids = new Set(tags(xml, 'Resource').map((t) => /<UID>(\d+)<\/UID>/.exec(t)![1]));
    for (const a of tags(xml, 'Assignment')) {
      expect(taskUids.has(/<TaskUID>(\d+)<\/TaskUID>/.exec(a)![1])).toBe(true);
      expect(resUids.has(/<ResourceUID>(\d+)<\/ResourceUID>/.exec(a)![1])).toBe(true);
    }
  });
});

describe('F-230 Datenmodell (V118, Dateiformat 12)', () => {
  it('Fremddaten und eigener Kalender überstehen Speichern und Laden; Kaputtes fällt weg', async () => {
    const S = await import('./storage');
    const F = await import('./foreign');
    let ws = sample();
    const note = ws.notes!.find((n) => n.project === pid)!;
    const person = ws.persons![0];
    const el = { n: 'ExtendedAttribute', x: '<ExtendedAttribute><FieldID>188743731</FieldID><Value>A</Value></ExtendedAttribute>', after: 'Notes' };
    ws = {
      ...ws,
      projects: ws.projects!.map((p) => (p.id === pid ? { ...p, calendar: {}, foreign: { mspdi: [el, { n: 'Bad', x: '<Anders/>' }], from: { kind: 'mspdi' as const, at: '2026-11-26T17:00:00Z', name: 'cg.xml' } } } : p)),
      notes: ws.notes!.map((n) => (n.id === note.id ? { ...n, foreign: { mspdi: [el], assign: { [person.id]: [{ n: 'Delay', x: '<Delay>0</Delay>' }] } } } : n)),
      persons: ws.persons!.map((p) => (p.id === person.id ? { ...p, foreign: { trello: { idBoards: ['x'] } } } : p)),
    };
    const back = S.parseWorkspace(JSON.parse(JSON.stringify(ws)))!;
    const p = back.projects!.find((x) => x.id === pid)!;
    expect(p.calendar).toEqual({});
    expect(p.foreign?.mspdi).toEqual([el]);
    expect(p.foreign?.from?.name).toBe('cg.xml');
    expect(back.notes!.find((n) => n.id === note.id)!.foreign?.assign?.[person.id]?.[0].n).toBe('Delay');
    expect(back.persons!.find((x) => x.id === person.id)!.foreign?.trello).toEqual({ idBoards: ['x'] });
    expect(F.foreignCount(p.foreign)).toBe(1);
  });
});

describe('F-230 MSPDI-Import und Rundlauf (V118)', () => {
  const FILE = `<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="http://schemas.microsoft.com/project">
<SaveVersion>14</SaveVersion><Name>Probe.xml</Name><Title>Probe &amp; Co</Title><Company>FIT GmbH</Company>
<StartDate>2027-01-04T08:00:00</StartDate><FinishDate>2027-01-20T17:00:00</FinishDate><CalendarUID>3</CalendarUID>
<MinutesPerDay>480</MinutesPerDay><HonorConstraints>1</HonorConstraints>
<ExtendedAttributes><ExtendedAttribute><FieldID>188743731</FieldID><FieldName>Text1</FieldName><Alias>Gewerk</Alias></ExtendedAttribute></ExtendedAttributes>
<Calendars><Calendar><UID>3</UID><Name>Firma</Name><IsBaseCalendar>1</IsBaseCalendar><WeekDays>
<WeekDay><DayType>1</DayType><DayWorking>0</DayWorking></WeekDay>
<WeekDay><DayType>0</DayType><DayWorking>0</DayWorking><TimePeriod><FromDate>2027-01-06T00:00:00</FromDate><ToDate>2027-01-06T23:59:00</ToDate></TimePeriod></WeekDay>
</WeekDays></Calendar></Calendars>
<Tasks>
<Task><UID>0</UID><ID>0</ID><Name>Probe</Name><OutlineLevel>0</OutlineLevel><Summary>1</Summary><GUID>G-0</GUID></Task>
<Task><UID>7</UID><GUID>G-7</GUID><ID>1</ID><Name>Phase A</Name><OutlineLevel>1</OutlineLevel><Summary>1</Summary></Task>
<Task><UID>8</UID><GUID>G-8</GUID><ID>2</ID><Name>Planen</Name><OutlineLevel>2</OutlineLevel><Duration>PT24H0M0S</Duration><Work>PT24H0M0S</Work><PercentComplete>50</PercentComplete><Notes>Erster &lt;Schritt&gt;</Notes>
<ExtendedAttribute><FieldID>188743731</FieldID><Value>Maler</Value></ExtendedAttribute>
<Baseline><Number>0</Number><Start>2027-01-04T08:00:00</Start><Finish>2027-01-07T17:00:00</Finish></Baseline>
<Baseline><Number>1</Number><Start>2027-01-05T08:00:00</Start></Baseline></Task>
<Task><UID>9</UID><GUID>G-9</GUID><ID>3</ID><Name>Bauen</Name><OutlineLevel>2</OutlineLevel><Duration>PT40H0M0S</Duration>
<PredecessorLink><PredecessorUID>8</PredecessorUID><Type>1</Type><LinkLag>4800</LinkLag><LagFormat>7</LagFormat></PredecessorLink>
<PredecessorLink><PredecessorUID>99</PredecessorUID><Type>1</Type><CrossProject>1</CrossProject><CrossProjectName>Anderes.mpp\\5</CrossProjectName></PredecessorLink></Task>
<Task><UID>10</UID><ID>4</ID><Name>Fertig</Name><OutlineLevel>1</OutlineLevel><Milestone>1</Milestone><Duration>PT0H0M0S</Duration>
<PredecessorLink><PredecessorUID>9</PredecessorUID><Type>1</Type></PredecessorLink></Task>
</Tasks>
<Resources><Resource><UID>0</UID><ID>0</ID><IsNull>0</IsNull></Resource><Resource><UID>4</UID><ID>1</ID><Name>Hr. Kabel</Name><MaxUnits>0.5</MaxUnits><StandardRate>60</StandardRate><EmailAddress>k@example.com</EmailAddress></Resource></Resources>
<Assignments><Assignment><UID>1</UID><TaskUID>8</TaskUID><ResourceUID>4</ResourceUID><Units>1</Units><Work>PT24H0M0S</Work><WorkContour>3</WorkContour></Assignment></Assignments>
</Project>`;

  it('liest Projekt, Gliederung, Dauer, Vorgänger, Kalender, Personen und Basisplan', () => {
    const r = M.importMspdi(W.defaultWorkspace(), FILE, { name: 'Probe.xml', now: Date.parse('2026-11-26T18:00:00Z') });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const p = r.ws.projects!.find((x) => x.id === r.project)!;
    expect(p.name).toBe('Probe & Co');
    expect(p.charter?.client).toBe('FIT GmbH');
    expect(p.calendar?.free?.map((f) => f.day)).toEqual(['2027-01-06']);
    expect(r.tasks).toBe(4);
    expect(r.links).toBe(2);
    const ns = r.ws.notes!.filter((n) => n.project === r.project);
    const planen = ns.find((n) => n.title === 'Planen')!;
    const bauen = ns.find((n) => n.title === 'Bauen')!;
    expect(planen.parent).toBe(ns.find((n) => n.title === 'Phase A')!.id);
    expect(planen.duration).toBe(3);
    expect(planen.text).toBe('Erster <Schritt>');
    expect(planen.wp?.progress).toBe(50);
    expect(planen.use?.[0].hours).toBe(24);
    expect(bauen.after).toEqual([{ id: planen.id, rel: 'EA', lag: 1 }]);
    expect(ns.find((n) => n.title === 'Fertig')!.milestone).toBe(true);
    expect(p.baseline?.tasks[planen.id]).toMatchObject({ start: '2027-01-04', end: '2027-01-07' });
    const kabel = r.ws.persons!.find((x) => x.name === 'Hr. Kabel')!;
    expect(kabel.capacity).toBe(20);
    expect(kabel.rate).toBe(60);
    // Gantt rechnet mit dem Kalender der Datei: 06.01. frei → Planen 04., 05., 07.01.
    const g = ganttOf(r.ws, r.project, '2026-11-26');
    expect(g.byId.get(planen.id)!.end).toBe('2027-01-07');
    // gleicher Name noch einmal → „(Import)“
    const r2 = M.importMspdi(r.ws, FILE);
    expect(r2.ok && r2.ws.projects!.find((x) => x.id === r2.project)!.name).toBe('Probe & Co (Import)');
    expect(M.mspdiNameClashes(r.ws, FILE)).toEqual(['Hr. Kabel']);
    const r3 = M.importMspdi(r.ws, FILE, { merge: ['Hr. Kabel'] });
    expect(r3.ok && r3.merged).toEqual(['Hr. Kabel']);
    expect(M.importMspdi(W.defaultWorkspace(), '<kaputt>').ok).toBe(false);
    expect(M.importMspdi(W.defaultWorkspace(), '<Foo/>')).toMatchObject({ ok: false, error: 'notMspdi' });
  });

  it('Rundlauf ohne Verlust: Unbekanntes, Original-Kalender und fremde Vorgänger gehen zurück, in Schema-Reihenfolge', () => {
    const r = M.importMspdi(W.defaultWorkspace(), FILE);
    if (!r.ok) throw new Error('Import');
    expect(r.kept).toBeGreaterThan(5);
    const out = M.exportMspdi(r.ws, r.project, { today: '2026-11-26' });
    for (const s of ['<HonorConstraints>1</HonorConstraints>', '<Alias>Gewerk</Alias>', '<Name>Firma</Name>', '<GUID>G-8</GUID>', '<Value>Maler</Value>', '<Number>1</Number>', 'Anderes.mpp', '<EmailAddress>k@example.com</EmailAddress>', '<WorkContour>3</WorkContour>', '<CalendarUID>3</CalendarUID>', '<Company>FIT GmbH</Company>'])
      expect(out).toContain(s);
    // nichts doppelt, Reihenfolge laut Schema
    expect(out.match(/<MinutesPerDay>/g)!.length).toBe(1);
    const proj = out.slice(out.indexOf('<Project'));
    expect(proj.indexOf('<ExtendedAttributes>')).toBeLessThan(proj.indexOf('<Calendars>'));
    expect(proj.indexOf('<Calendars>')).toBeLessThan(proj.indexOf('<Tasks>'));
    const planen = tags(out, 'Task').find((t) => t.includes('<Name>Planen</Name>'))!;
    expect(planen.indexOf('<GUID>')).toBeLessThan(planen.indexOf('<ID>'));
    expect(planen.indexOf('<PercentComplete>')).toBeLessThan(planen.indexOf('<Notes>'));
    // ein zweiter Import der Ausgabe liefert dasselbe Projekt
    const back = M.importMspdi(W.defaultWorkspace(), out);
    if (!back.ok) throw new Error('Re-Import');
    const names = (ws: typeof r.ws, pid: string) => ws.notes!.filter((n) => n.project === pid).map((n) => [n.title, n.duration ?? 0, n.milestone ?? false, (n.after ?? []).length]);
    expect(names(back.ws, back.project)).toEqual(names(r.ws, r.project));
    const g1 = ganttOf(r.ws, r.project, '2026-11-26');
    const g2 = ganttOf(back.ws, back.project, '2026-11-26');
    expect(g2.rows.map((x) => [x.start, x.end])).toEqual(g1.rows.map((x) => [x.start, x.end]));
    // Kalender geändert → eigener Standardkalender, fremde CalendarUIDs fallen weg
    const ws2 = { ...r.ws, projects: r.ws.projects!.map((p) => (p.id === r.project ? { ...p, calendar: { free: [{ day: '2027-01-08' }] } } : p)) };
    const out2 = M.exportMspdi(ws2, r.project, { today: '2026-11-26' });
    expect(out2).not.toContain('<Name>Firma</Name>');
    expect(out2).toContain('<FromDate>2027-01-08T00:00:00</FromDate>');
  });
});
