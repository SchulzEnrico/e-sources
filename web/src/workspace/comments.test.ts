import { describe, expect, it } from 'vitest';
import type { Workspace } from './types';
import * as No from './notes';
import * as W from './workspace';
import * as Cm from './comments';

const setup = () => {
  let ws: Workspace = W.defaultWorkspace();
  const c = No.createNote(ws, { title: 'Karte' });
  ws = { ...c.ws, persons: [{ id: 'p1', name: 'Anna Berg' } as never, { id: 'p2', name: 'Anna' } as never] };
  return { ws, id: c.id };
};

describe('V122 F-231 K7 Kommentare', () => {
  it('legt an, bearbeitet und löscht – als Spur-Eintrag', () => {
    const s = setup();
    const a = Cm.addComment(s.ws, s.id, '  Bitte bis Freitag  ', { by: 'Ich', now: 100, cid: 'c1' })!;
    expect(Cm.addComment(s.ws, s.id, '   ')).toBeNull();
    let n = No.noteById(a.ws, s.id)!;
    expect(Cm.commentsOf(n)).toEqual([{ at: 100, what: 'comment', id: 'c1', text: 'Bitte bis Freitag', by: 'Ich' }]);
    const e = Cm.editComment(a.ws, s.id, 'c1', 'Bitte bis Montag', 200);
    n = No.noteById(e, s.id)!;
    expect(Cm.commentsOf(n)[0]).toMatchObject({ at: 100, text: 'Bitte bis Montag', edited: 200 });
    expect(Cm.editComment(e, s.id, 'c1', '')).toBe(e);
    const d = Cm.deleteComment(e, s.id, 'c1');
    expect(Cm.commentsOf(No.noteById(d, s.id))).toEqual([]);
    // „Alles“ zeigt Spur und Kommentare, neueste zuerst
    const all = Cm.activityOf(No.noteById(a.ws, s.id), true);
    expect(all[0].what).toBe('comment');
    expect(all.length).toBeGreaterThan(1);
    expect(Cm.activityOf(No.noteById(a.ws, s.id), false).length).toBe(1);
  });
  it('erkennt @Person (längster Name zuerst, Wortgrenze)', () => {
    const s = setup();
    const parts = Cm.splitMentions(s.ws, 'Frage an @anna berg und @Anna, nicht @Annabell oder mail@anna');
    expect(parts.filter((x) => x.person).map((x) => [x.text, x.person!.id])).toEqual([
      ['@anna berg', 'p1'],
      ['@Anna', 'p2'],
    ]);
    expect(parts.map((x) => x.text).join('')).toBe('Frage an @anna berg und @Anna, nicht @Annabell oder mail@anna');
    expect(Cm.mentionsIn(s.ws, '@Anna @anna').map((p) => p.id)).toEqual(['p2']);
  });
  it('Kommentare fallen nicht wegen vieler Ereignisse aus der Spur', () => {
    const s = setup();
    let ws = Cm.addComment(s.ws, s.id, 'bleibt', { cid: 'keep' })!.ws;
    for (let i = 0; i < No.TRAIL_MAX + 20; i++) ws = No.updateNote(ws, s.id, { important: i % 2 === 0 ? true : undefined }, { now: 10_000 * (i + 1), by: `p${i}` });
    const n = No.noteById(ws, s.id)!;
    expect(Cm.commentsOf(n).map((c) => c.id)).toEqual(['keep']);
    expect(n.trail.filter((e) => e.what !== 'comment').length).toBe(No.TRAIL_MAX);
    // und überstehen Speichern/Laden
    const back = No.parseNotes(JSON.parse(JSON.stringify([n])), new Set());
    expect(Cm.commentsOf(back[0])).toEqual(Cm.commentsOf(n));
  });
});
