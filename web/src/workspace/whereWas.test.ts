import { describe, expect, it } from 'vitest';
import type { Workspace } from './types';
import * as No from './notes';
import * as W from './workspace';
import * as In from './inbox';
import * as Ww from './whereWas';

const H = 3600_000;
const T0 = Date.parse('2026-11-28T10:00:00Z');

describe('V156 F-109 Wo war ich?', () => {
  it('laufende Karte, sonst zuletzt bearbeitet; offene Gedanken aus dem Eingang, neueste zuerst', () => {
    let ws: Workspace = In.ensureInbox(W.defaultWorkspace());
    expect(Ww.isEmptyWhere(Ww.whereWas(ws, T0))).toBe(true);
    ws = No.createNote(ws, { title: 'Alt' }, { id: 'a', now: T0 - 10 * 24 * H }).ws;
    expect(Ww.whereWas(ws, T0).card).toBeUndefined(); // zu lange her
    ws = No.createNote(ws, { title: 'Bericht' }, { id: 'b', now: T0 - 2 * H }).ws;
    expect(Ww.whereWas(ws, T0).card).toMatchObject({ id: 'b', kind: 'last', title: 'Bericht' });
    ws = No.createNote(ws, { title: 'Angebot' }, { id: 'c', now: T0 - 5 * H }).ws;
    ws = No.setState(ws, 'c', 'doing', { now: T0 - 4 * H });
    expect(Ww.whereWas(ws, T0).card).toMatchObject({ id: 'c', kind: 'doing' });
    // erledigt zählt nicht mehr
    ws = No.setState(ws, 'c', 'done', { now: T0 - H });
    expect(Ww.whereWas(ws, T0).card?.id).toBe('b');
    for (const [i, t] of ['Eins', 'Zwei', 'Drei', 'Vier', 'Fünf'].entries()) ws = In.captureToInbox(ws, t, { id: `q${i}`, now: T0 - (10 - i) * 60_000 })!.ws;
    ws = No.setState(ws, 'q4', 'done', { now: T0 });
    const w = Ww.whereWas(ws, T0);
    expect(w.thoughts.map((t) => t.title)).toEqual(['Vier', 'Drei', 'Zwei']);
    expect(w.more).toBe(1);
    // Gedanken im Eingang sind nicht „zuletzt bearbeitet“
    expect(w.card?.id).toBe('b');
  });
  it('Pause erst ab 30 Minuten', () => {
    expect(Ww.isPause(T0 - 29 * 60_000, T0)).toBe(false);
    expect(Ww.isPause(T0 - 30 * 60_000, T0)).toBe(true);
    expect(Ww.isPause(0, T0)).toBe(false);
  });
});
