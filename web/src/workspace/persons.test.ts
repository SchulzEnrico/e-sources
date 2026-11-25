import { describe, expect, it } from 'vitest';
import * as P from './persons';
import * as F from './focusLoad';
import { createNote, noteById, setState, setDraft } from './notes';
import { setProfile } from './profile';
import { defaultWorkspace } from './workspace';
import type { Workspace } from './types';

// F-206 Schritt 8 (V94): Personen + Projektfokus
const eq = (a: unknown, b: unknown, m: string) => expect(a, m).toEqual(b);

function note(ws: Workspace, id: string, extra: Record<string, unknown>): Workspace {
  return createNote(ws, { title: id, ...extra } as never, { id }).ws;
}

describe('persons (V94)', () => {
  it('ich, anlegen, ähnlich, ändern, löschen mit Rückgängig', () => {
    let ws = setProfile(defaultWorkspace(), { name: 'Enrico Schulz', color: 2 });
    eq(P.meOf(ws).name, 'Enrico Schulz', 'ich aus Profil'); eq(P.meOf(ws).color, 2, 'farbe'); eq(P.meId(ws), P.ME_ID, 'me id');
    eq(P.personsOf(ws).length, 0, 'ich nicht gespeichert');
    const a = P.addPerson(ws, '  Anna   Berg ')!; ws = a.ws;
    eq(P.personById(ws, a.id)?.name, 'Anna Berg', 'name sauber');
    eq(P.addPerson(ws, 'anna berg')!.id, a.id, 'gleicher Name = gleiche Person');
    eq(P.similar(ws, 'Ana Berg').map((p) => p.id), [a.id], 'ähnlich');
    eq(P.similar(ws, 'Bob').length, 0, 'nicht ähnlich');
    eq(P.findPersons(ws, 'be').map((p) => p.id), [a.id], 'suche wortanfang');
    eq(P.personList(ws)[0].id, P.ME_ID, 'ich zuerst');
    ws = P.editPerson(ws, a.id, { capacity: 20, away: [{ from: '2026-12-07', to: '2026-12-08' }] });
    eq(P.personById(ws, a.id)?.capacity, 20, 'kapazität');
    ws = P.editPerson(ws, P.ME_ID, { capacity: 30 });
    eq(P.personsOf(ws).find((p) => p.me)?.capacity, 30, 'ich gespeichert beim Ändern');
    // zuständig und löschen
    ws = note(ws, 'n1', {}); ws = note(ws, 'n2', {});
    ws = P.assign(ws, 'n1', a.id); ws = P.delegate(ws, 'n2', a.id);
    eq(noteById(ws, 'n2')?.delegated, { to: 'Anna Berg', person: a.id }, 'delegiert merkt');
    eq(P.openCount(ws, a.id), 2, 'offen 2');
    ws = P.assign(ws, 'n2', P.ME_ID);
    eq(noteById(ws, 'n2')?.delegated, undefined, 'zurückgeholt löst delegiert');
    eq(noteById(ws, 'n2')?.assignee, P.ME_ID, 'ich zuständig');
    const r = P.removePerson(ws, a.id)!;
    eq(noteById(r.ws, 'n1')?.assignee, undefined, 'ohne zuständig');
    const back = P.undoRemovePerson(r.ws, r.undo);
    eq(noteById(back, 'n1')?.assignee, a.id, 'rückgängig');
    eq(P.personsOf(back).map((p) => p.id), P.personsOf(ws).map((p) => p.id), 'reihenfolge');
    eq(P.removePerson(ws, P.ME_ID), null, 'ich nicht löschbar');
  });

  it('P6: neue Notiz – ich zuständig, Unter-Notiz erbt', () => {
    let ws = defaultWorkspace();
    const a = P.addPerson(ws, 'Anna')!; ws = a.ws;
    ws = note(ws, 'p', {}); ws = P.assign(ws, 'p', a.id);
    const prev = ws;
    ws = note(ws, 'x', {}); ws = note(ws, 'c', { parent: 'p' });
    ws = P.defaultAssignee(prev, ws);
    eq(noteById(ws, 'x')?.assignee, P.ME_ID, 'ich'); eq(noteById(ws, 'c')?.assignee, a.id, 'erbt');
    eq(P.personsOf(ws).some((p) => p.me), true, 'ich gespeichert');
  });

  it('Vertretung, Limit, Befugnis, Kapazität', () => {
    let ws = defaultWorkspace();
    const a = P.addPerson(ws, 'Anna')!; ws = a.ws;
    ws = P.ensureMe(ws);
    ws = P.editPerson(ws, a.id, { stand: [{ by: P.ME_ID, from: '2026-12-01', to: '2026-12-05' }], limit: { total: 1 }, rights: ['decide'] });
    ws = note(ws, 'n1', {}); ws = P.assign(ws, 'n1', a.id);
    const n = noteById(ws, 'n1')!;
    eq(P.mineOf(ws, n, '2026-12-02'), { mine: true, via: a.id }, 'vertretung im zeitraum');
    eq(P.mineOf(ws, n, '2026-12-09').mine, false, 'außerhalb');
    eq(P.limitOf(ws, a.id), { count: 1, limit: 1, over: true }, 'limit');
    eq(P.hasRight(P.personById(ws, a.id), 'accept'), false, 'kein abnehmen');
    eq(P.hasRight(P.meOf(ws), 'accept'), true, 'ich alle');
    const anna = P.personById(ws, a.id)!;
    eq(P.capacityOn(ws, anna, '2026-11-30'), 8, 'mo 8 h');
    eq(P.capacityOn(ws, anna, '2026-11-29'), 0, 'so 0');
    ws = P.editPerson(ws, a.id, { away: [{ from: '2026-11-30', to: '2026-11-30' }] });
    eq(P.capacityOn(ws, P.personById(ws, a.id)!, '2026-11-30'), 0, 'abwesend 0');
    const t = P.addPerson(ws, 'Team Nord', 'team', { members: [a.id, P.ME_ID] })!; ws = t.ws;
    eq(P.capacityOn(ws, P.personById(ws, t.id)!, '2026-12-01'), 16, 'team summe');
  });
});

describe('focusLoad (V94)', () => {
  it('Tage, Verteilung, Ton', () => {
    eq(F.mondayOf('2026-11-29'), '2026-11-23', 'montag von sonntag'); eq(F.mondayOf('2026-11-25'), '2026-11-23', 'montag');
    eq(F.workdays('2026-11-27', '2026-11-30'), ['2026-11-27', '2026-11-30'], 'werktage');
    eq(F.isoWeek('2026-11-25'), 48, 'kw');
    eq(F.spanOf({ due: '2026-11-25' }), ['2026-11-19', '2026-11-20', '2026-11-23', '2026-11-24', '2026-11-25'], 'nur fällig');
    eq(F.spanOf({}), [], 'ohne termin');
    eq(F.toneOf({ hours: 30, urgent: 0, capacity: 40 }), 'calm', 'ruhig');
    eq(F.toneOf({ hours: 30, urgent: 4, capacity: 40 }), 'warn', 'dringend schwerer');
    eq(F.toneOf({ hours: 41, urgent: 0, capacity: 40 }), 'over', 'über');
    eq(F.hoursText(1.5), '1,5 h', 'text');
  });

  it('Auslastung je Woche, Team, Entwurf, ohne Termin', () => {
    let ws = defaultWorkspace();
    ws = P.ensureMe(ws);
    const a = P.addPerson(ws, 'Anna')!; ws = a.ws;
    ws = note(ws, 'n1', { notBefore: '2026-11-30', due: '2026-12-11' }); ws = P.assign(ws, 'n1', P.ME_ID);
    ws = P.editPerson(ws, P.ME_ID, {});
    ws = { ...ws, notes: ws.notes!.map((n) => (n.id === 'n1' ? { ...n, effort: { plan: 20 }, urgent: true } : n)) };
    ws = note(ws, 'n2', {}); ws = P.assign(ws, 'n2', P.ME_ID);
    ws = { ...ws, notes: ws.notes!.map((n) => (n.id === 'n2' ? { ...n, effort: { plan: 3 } } : n)) };
    ws = note(ws, 'n3', { due: '2026-12-04' }); ws = P.assign(ws, 'n3', a.id);
    const l = F.loadOf(ws, P.ME_ID, { from: '2026-11-30', weeks: 3 });
    eq(l.weeks.map((w) => w.hours), [10, 10, 0], '20 h auf 2 wochen');
    eq(l.weeks.map((w) => w.urgent), [10, 10, 0], 'dringend');
    eq(l.weeks[0].capacity, 40, 'kapazität');
    eq(l.noDate, { hours: 3, count: 1, notes: ['n2'] }, 'ohne termin');
    const la = F.loadOf(ws, a.id, { from: '2026-11-30', weeks: 1 });
    eq(la.weeks[0].noEffort, 1, 'ohne aufwand zählt');
    const t = P.addPerson(ws, 'Team', 'team', { members: [a.id, P.ME_ID] })!; ws = t.ws;
    const lt = F.loadOf(ws, t.id, { from: '2026-11-30', weeks: 1 });
    eq([lt.weeks[0].hours, lt.weeks[0].capacity, lt.weeks[0].notes.length], [10, 80, 2], 'team');
    // erledigt zählt nicht
    const done = F.loadOf(setState(ws, 'n1', 'done'), P.ME_ID, { from: '2026-11-30', weeks: 1 });
    eq(done.weeks[0].hours, 0, 'erledigt');
    // Entwurf: Aufwand geändert → vorläufig
    const d = setDraft(ws, 'n1', { effort: { plan: 40 } });
    const ld = F.loadOf(d, P.ME_ID, { from: '2026-11-30', weeks: 1, drafts: true });
    eq([ld.weeks[0].hours, ld.weeks[0].draft], [0, 20], 'vorläufig');
    eq(F.loadOf(d, P.ME_ID, { from: '2026-11-30', weeks: 1 }).weeks[0].hours, 10, 'ohne entwürfe gespeicherter stand');
    eq(F.loadOf(ws, P.ME_ID, { from: '2026-12-07', weeks: 1 }).weeks[0].hours, 10, 'zeitraum zweite woche');
    eq(F.loadOf(ws, P.ME_ID, { from: '2026-12-14', weeks: 1 }).weeks[0].hours, 20, 'überfällig voll in erster woche');
    eq(F.focusLine(ws, l.weeks[0]), 'Diese Woche 10 von 40 h · 1 dringend', 'zeile');
  });
});

describe('V95 Ressourcentabelle', () => {
  const base = { id: 'pn-a', name: 'Anna', kind: 'person' as const };
  it('rightsOf: ich ohne Befugnisse = alle, andere = gesetzte', () => {
    expect(P.rightsOf({ ...base, me: true })).toHaveLength(4);
    expect(P.rightsOf(base)).toHaveLength(0);
    expect(P.rightsOf({ ...base, rights: ['accept'] })).toEqual(['accept']);
  });
  it('awayState: jetzt mit anschließendem Zeitraum, sonst nächste', () => {
    const p = { ...base, away: [{ from: '2026-12-21', to: '2026-12-31', why: 'Urlaub' }, { from: '2026-12-10', to: '2026-12-20' }] };
    expect(P.awayState(p, '2026-12-12').now?.to).toBe('2026-12-31');
    expect(P.awayState(p, '2026-12-01').next?.from).toBe('2026-12-10');
    expect(P.awayState(p, '2027-01-05')).toEqual({});
  });
  it('withAway: sortiert, doppelt nur einmal, bis < von abgelehnt', () => {
    const p = { ...base, away: [{ from: '2026-12-21', to: '2026-12-31' }] };
    expect(P.withAway(p, { from: '2026-12-01', to: '2026-12-02', why: ' Schulung ' })).toEqual([{ from: '2026-12-01', to: '2026-12-02', why: 'Schulung' }, { from: '2026-12-21', to: '2026-12-31' }]);
    expect(P.withAway(p, { from: '2026-12-21', to: '2026-12-31' })).toHaveLength(1);
    expect(P.withAway(p, { from: '2026-12-05', to: '2026-12-01' })).toBeNull();
  });
  it('withStand: nicht sich selbst, gleiche Person ersetzt', () => {
    const p = { ...base, stand: [{ by: 'pn-b', from: '2026-12-01' }] };
    expect(P.withStand(p, { by: 'pn-a' })).toBeNull();
    expect(P.withStand(p, { by: 'pn-b', to: '2026-12-31' })).toEqual([{ by: 'pn-b', to: '2026-12-31' }]);
  });
  it('memberChoices: ohne Kreis', () => {
    let ws = defaultWorkspace();
    ws = P.addPerson(ws, 'Team A', 'team')!.ws;
    const a = P.personList(ws).find((p) => p.name === 'Team A')!;
    const r = P.addPerson(ws, 'Team B', 'team', { members: [a.id] })!;
    ws = r.ws;
    const choices = P.memberChoices(ws, P.personById(ws, a.id)!).map((p) => p.name);
    expect(choices).not.toContain('Team B');
    expect(choices).not.toContain('Team A');
  });
  it('ich ohne Befugnisse bleibt ohne', () => {
    let ws = P.ensureMe(defaultWorkspace());
    ws = P.editPerson(ws, P.ME_ID, { rights: [] });
    expect(P.hasRight(P.meOf(ws), 'accept')).toBe(false);
  });
});

describe('V95 Fokus: Team-Aufteilung und Skala', () => {
  it('teamSplit: Balken je Mitglied, Rest für das Team', () => {
    let ws = defaultWorkspace();
    ws = P.addPerson(ws, 'Anna')!.ws;
    ws = P.addPerson(ws, 'Ben')!.ws;
    const [a, b] = ['Anna', 'Ben'].map((n) => P.personList(ws).find((p) => p.name === n)!.id);
    const r = P.addPerson(ws, 'Team', 'team', { members: [a, b] })!;
    ws = r.ws;
    ws = note(ws, 'n1', { assignee: a, due: '2026-12-04', effort: { plan: 5 } });
    ws = note(ws, 'n2', { assignee: r.id, due: '2026-12-04', effort: { plan: 2 } });
    const s = F.teamSplit(ws, r.id, { from: '2026-11-30', weeks: 2 });
    expect(s.find((x) => x.id === a)!.hours[0]).toBe(5);
    expect(s.find((x) => x.id === b)!.hours[0]).toBe(0);
    expect(s.find((x) => x.id === r.id)!.hours[0]).toBe(2);
  });
  it('scaleOf: Kapazität mit Luft, auf 4 gerundet', () => {
    expect(F.scaleOf([{ hours: 10, draft: 0, capacity: 40 }])).toBe(52);
    expect(F.scaleOf([{ hours: 70, draft: 3, capacity: 40 }])).toBe(76);
  });
});
