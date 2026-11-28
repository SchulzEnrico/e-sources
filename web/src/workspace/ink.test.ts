import { describe, expect, it } from 'vitest';
import type { NoteAttachment, Workspace } from './types';
import * as No from './notes';
import * as W from './workspace';
import * as In from './inbox';
import * as K from './ink';
import { inkSweepable, INK_SWEEP_AGE_MS } from './inkStore';
import { reducer } from './useWorkspace';
import { addProject } from './projects';
import { parseWorkspace } from './storage';

const att = (ref: string, extra: Partial<NoteAttachment> = {}): NoteAttachment => ({ kind: 'ink', ref, at: '2026-11-28T08:00:00.000Z', dev: 'iPad', w: 640, h: 400, ...extra });

describe('V143 F-238 Handschrift', () => {
  it('rundet Striche, lässt fast gleiche Punkte weg und begrenzt den Druck', () => {
    const s = K.roundStroke({ tool: 'pen', color: '#000', width: 2.44, pts: [[1.04, 2.06, 0.333], [1.2, 2.1, 0.4], [5.55, 6.66, 1.7], [9, 9, -1]] });
    expect(s.width).toBe(2.4);
    expect(s.pts).toEqual([[1, 2.1, 0.33], [5.6, 6.7, 1], [9, 9, 0]]);
  });

  it('prüft gespeicherte Striche (fremdes fällt weg) und zählt ohne Radierer', () => {
    const s = K.parseStrokes([{ tool: 'pen', pts: [[1, 2]] }, { tool: 'nix', pts: [[1, 1]] }, { tool: 'eraser', pts: [[3, 3, 1]], width: 9 }, { tool: 'marker', pts: [] }, 'x']);
    expect(s).toHaveLength(2);
    expect(s[0]).toEqual({ tool: 'pen', color: K.INK_COLORS[0], width: K.INK_WIDTH.pen, pts: [[1, 2, 0.5]] });
    expect(K.inkCount(s)).toBe(1);
  });

  it('zeichnet SVG mit Pfad, Marker durchscheinend und Radierer als Maske', () => {
    const svg = K.inkSvg(
      [
        { tool: 'pen', color: '#1f4fbf', width: 2, pts: [[0, 0, 0.5], [10, 10, 0.5], [20, 0, 0.5]] },
        { tool: 'marker', color: K.MARKER_COLOR, width: 14, pts: [[5, 5, 0.5]] },
        { tool: 'eraser', color: '#000', width: 18, pts: [[10, 10, 0.5], [12, 12, 0.5]] },
      ],
      100,
      50,
      'Handschrift <a>',
    );
    expect(svg).toContain('viewBox="0 0 100 50"');
    expect(svg).toContain('M0 0Q10 10 15 5L20 0');
    expect(svg).toContain('opacity="0.45"');
    expect(svg).toContain('mask="url(#ink-er)"');
    expect(svg).toContain('aria-label="Handschrift &lt;a>"');
    expect(K.strokePath({ pts: [[3, 4, 1]] })).toBe('M3 4l0.1 0');
  });

  it('Anhang anlegen, ersetzen am Platz, Text setzen, entfernen; Textalternative', () => {
    let a = K.addInk({ attach: [{ kind: 'note', ref: 'n1' }] }, att('i1'));
    a = K.addInk({ attach: a }, att('i2'));
    a = K.addInk({ attach: a }, att('i1', { h: 200 }));
    expect(a.map((x) => x.ref)).toEqual(['n1', 'i1', 'i2']);
    expect(a[1].h).toBe(200);
    expect(K.inkOf({ attach: a })).toHaveLength(2);
    const t = K.setInkText({ attach: a }, 'i2', '  Milch kaufen ')!;
    expect(t[2].text).toBe('Milch kaufen');
    expect(K.setInkText({ attach: t }, 'i2', ' ')![2].text).toBeUndefined();
    expect(K.dropInk({ attach: [att('i1')] }, 'i1')).toBeUndefined();
    expect(K.inkAlt({ text: 'Hallo' })).toBe('Handschrift: Hallo');
    expect(K.inkAlt({}, 1)).toBe('Handschrift, 1 Strich');
    expect(K.inkAlt({}, 3)).toBe('Handschrift, 3 Striche');
  });

  it('neue Handschrift landet als Notiz „via ink“ im Eingang (S8) und Rückgängig nimmt sie wieder weg', () => {
    const ws = In.ensureInbox(W.defaultWorkspace());
    const r = reducer(ws, { type: 'inkCapture', note: 'h1', att: att('i9', { text: 'Idee' }), title: 'Idee', by: 'Enrico' });
    const n = No.noteById(r, 'h1')!;
    expect(n.origin?.via).toBe('ink');
    expect(K.isInkNote(n)).toBe(true);
    expect(K.hasInk(n)).toBe(true);
    expect(No.titleOf(n)).toBe('Idee');
    expect(In.inboxOf(r)!.ids).toContain('h1');
    expect(In.inboxCount(r)).toBe(1);
    expect(No.noteMatches(n, 'idee')).toBe(true);
    const back = reducer(r, { type: 'inboxDrop', note: 'h1' });
    expect(No.noteById(back, 'h1')).toBeUndefined();
  });

  it('übersteht Speichern/Laden, zählt Unterschriften mit und räumt nur Verwaiste nach einem Tag weg', () => {
    let ws: Workspace = In.ensureInbox(W.defaultWorkspace());
    ws = K.captureInk(ws, att('i1'), { id: 'h1' }).ws;
    const pj = addProject(ws, 'Test')!;
    const pid = pj.id;
    ws = reducer(pj.ws, { type: 'charterEdit', id: pid, patch: { inkAg: 'sig1', signAg: 'A. Meier' } });
    const back = parseWorkspace(JSON.parse(JSON.stringify(ws)))!;
    expect(K.inkOf(No.noteById(back, 'h1')!)[0]).toEqual(att('i1'));
    expect(No.noteById(back, 'h1')!.origin?.via).toBe('ink');
    const refs = K.inkRefs(back);
    expect([...refs].sort()).toEqual(['i1', 'sig1']);
    const now = 10 * INK_SWEEP_AGE_MS;
    expect(inkSweepable([{ id: 'i1', at: 0 }, { id: 'alt', at: 0 }, { id: 'neu', at: now - 1000 }], refs, now)).toEqual(['alt']);
    expect(reducer(back, { type: 'charterEdit', id: pid, patch: { inkAg: null } }).projects!.find((p) => p.id === pid)!.charter?.inkAg).toBeUndefined();
  });

  it('Erkennung nur, wo der Browser sie hat', () => {
    expect(K.canRecognize({})).toBe(false);
    expect(K.canRecognize(undefined)).toBe(false);
    expect(K.canRecognize({ createHandwritingRecognizer: () => Promise.resolve() })).toBe(true);
  });
});
