import { describe, expect, it } from 'vitest';
import type { Workspace } from './types';
import * as Cal from './calendar';
import * as Sc from './schedule';
import * as Gt from './gantt';
import * as Sp from './sampleProject';
import * as W from './workspace';
import { parseWorkspace } from './storage';

describe('F-206 Schritt 10 Arbeitskalender (V116, K7)', () => {
  it('Ostern und Feiertage nach Bundesland', () => {
    expect(Cal.easter(2026)).toBe('2026-04-05');
    expect(Cal.easter(2027)).toBe('2027-03-28');
    const hh = Cal.holidays(2027, 'HH').map((h) => h.day);
    expect(hh).toContain('2027-03-26'); // Karfreitag
    expect(hh).toContain('2027-10-31'); // Reformationstag seit 2018
    expect(hh).not.toContain('2027-05-27'); // Fronleichnam nicht in HH
    expect(Cal.holidays(2027, 'BY').map((h) => h.day)).toContain('2027-05-27');
    expect(Cal.holidays(2026, 'SN').find((h) => h.name === 'Buß- und Bettag')!.day).toBe('2026-11-18');
    expect(Cal.holidays(2027, 'DE').length).toBe(9);
  });
  it('Werk ohne Feiertage, mit Kalender zählen freie Tage nicht', () => {
    Cal.setCalendar(undefined);
    expect(Sc.isWorkday('2027-01-01')).toBe(true);
    Cal.setCalendar({ region: 'HH', free: [{ day: '2027-01-04', name: 'Brückentag' }] });
    expect(Sc.isWorkday('2027-01-01')).toBe(false);
    expect(Sc.isWorkday('2027-01-04')).toBe(false);
    expect(Cal.offName('2027-01-04')).toBe('Brückentag');
    // Do 31.12. → nächster Arbeitstag Di 05.01.
    expect(Sc.dayOfWorkdayNo(Sc.workdayNo('2026-12-31') + 1)).toBe('2027-01-05');
    expect(Sc.workdayNo('2027-01-01')).toBe(Sc.workdayNo('2027-01-05'));
    expect(Sc.addWorkdays('2026-12-31', 1)).toBe('2027-01-05');
    expect(Sc.workdaysBetween('2026-12-28', '2027-01-08')).toBe(8);
    expect(Cal.offBetween('2026-12-20', '2027-01-10').map((d) => d.day)).toEqual(['2026-12-25', '2027-01-01', '2027-01-04']);
    Cal.setCalendar(undefined);
  });
  it('ColorGentlemen endet mit Feiertagen am 30.06.2027 wie im Report', () => {
    const base = { ...W.defaultWorkspace(), notes: [] } as Workspace;
    const ws = Sp.addSampleProject(base, 5);
    Cal.setCalendar({ region: 'HH' });
    try {
      expect(Gt.ganttOf(ws, Sp.SAMPLE_PROJECT, '2026-11-25').end).toBe('2027-06-30');
    } finally {
      Cal.setCalendar(undefined);
    }
    expect(Gt.ganttOf(ws, Sp.SAMPLE_PROJECT, '2026-11-25').end).toBe('2027-06-22');
  });
  it('im Arbeitsstand: Bundesland, freie Tage, Datei liest es zurück', () => {
    let ws = Cal.setRegion(W.defaultWorkspace(), 'HH');
    ws = Cal.addFree(ws, '2027-05-07', ' Brückentag ')!;
    expect(Cal.addFree(ws, 'kein Tag')).toBeNull();
    expect(ws.calendar).toEqual({ region: 'HH', free: [{ day: '2027-05-07', name: 'Brückentag' }] });
    const back = parseWorkspace(JSON.parse(JSON.stringify(ws)))!;
    expect(back.calendar).toEqual(ws.calendar);
    ws = Cal.removeFree(Cal.setRegion(ws, undefined), '2027-05-07');
    expect(ws.calendar).toBeUndefined();
    expect(Cal.parseCalendar({ region: 'XX', free: [{ day: '2027-13-40' }, 5] })).toBeUndefined();
  });
});
