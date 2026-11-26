import { describe, expect, it } from 'vitest';
import * as Wo from './wheelOrder';
import { defaultWorkspace } from './workspace';
import { parseWorkspace } from './storage';

const IDS = ['portals', 'layouts', 'sources', 'notes', 'persons'];
const NOW = Date.UTC(2026, 10, 26, 12);
const DAY = 86_400_000;

describe('F-220 Umschalt-Räder nach Nutzung (V116)', () => {
  it('R1: zählt die letzten 30 Tage, ältere fallen heraus', () => {
    let u: Wo.WheelUses = {};
    u = Wo.recordUse(u, 'cockpit', 'notes', NOW - 40 * DAY);
    u = Wo.recordUse(u, 'cockpit', 'notes', NOW - 2 * DAY);
    u = Wo.recordUse(u, 'cockpit', 'notes', NOW);
    expect(Wo.useCount(u, 'cockpit', 'notes', NOW)).toBe(2);
    expect(Wo.useCount(u, 'cockpit', 'layouts', NOW)).toBe(0);
    expect(u.cockpit.notes.length).toBe(2);
    expect(Wo.parseUses({ cockpit: { notes: [1, 'x', -3, 2.5], bad: 'y' }, x: [] })).toEqual({ cockpit: { notes: [1] } });
  });
  it('R2: häufigste zuerst, Gleichstand nach Werk, Angeheftete vorn, Ausgeblendete fehlen', () => {
    const n: Record<string, number> = { notes: 5, persons: 5, sources: 1 };
    const c = (id: string) => n[id] ?? 0;
    expect(Wo.arrange(IDS, undefined, c)).toEqual(['notes', 'persons', 'sources', 'portals', 'layouts']);
    expect(Wo.arrange(IDS, { pinned: ['layouts', 'portals'] }, c)).toEqual(['layouts', 'portals', 'notes', 'persons', 'sources']);
    expect(Wo.arrange(IDS, { auto: false }, c)).toEqual(IDS);
    expect(Wo.arrange(IDS, { hidden: ['notes', 'sources'] }, c)).toEqual(['persons', 'portals', 'layouts']);
    // der gewählte Eintrag bleibt sichtbar, auch wenn er ausgeblendet ist
    expect(Wo.arrange(IDS, { hidden: ['notes'] }, c, 'notes')[0]).toBe('notes');
    // nie leer
    expect(Wo.arrange(['a', 'b'], { hidden: ['a', 'b'] }, c)).toEqual(['a']);
  });
  it('R6: Hinweis nur, wenn die Nutzung die Reihenfolge ändert', () => {
    expect(Wo.reordered(IDS, IDS)).toBe(false);
    expect(Wo.reordered(IDS, ['notes', 'portals', 'layouts', 'sources', 'persons'])).toBe(true);
    expect(Wo.reordered(IDS, ['notes', 'portals', 'layouts', 'sources', 'persons'], { pinned: ['notes'] })).toBe(false);
    expect(Wo.reordered(IDS, ['notes', 'portals'], { auto: false })).toBe(false);
  });
  it('R3: anheften, lösen, nach vorn/hinten, belegen, automatisch, Werk', () => {
    let p = Wo.pin(undefined, 'notes');
    expect(p.pinned).toEqual(['notes']);
    p = Wo.pin(p, 'persons');
    expect(p.pinned).toEqual(['notes', 'persons']);
    expect(Wo.isPinned(p, 'persons')).toBe(true);
    expect(Wo.unpin(p, 'notes').pinned).toEqual(['persons']);
    // nach vorn: alles bis zum neuen Platz wird angeheftet
    const shown = ['portals', 'layouts', 'sources', 'notes', 'persons'];
    expect(Wo.move(undefined, shown, 'sources', -1)!.pinned).toEqual(['portals', 'sources']);
    expect(Wo.move(undefined, shown, 'portals', -1)).toBeNull();
    expect(Wo.move(undefined, shown, 'persons', 1)).toBeNull();
    // nach hinten mit weiter hinten angeheftetem bleibt der angeheftete Block erhalten
    expect(Wo.move({ pinned: ['portals', 'layouts', 'sources'] }, ['portals', 'layouts', 'sources', 'notes'], 'portals', 1)!.pinned).toEqual(['layouts', 'portals', 'sources']);
    // belegen
    let h = Wo.toggleHidden({ pinned: ['notes'] }, IDS, 'notes')!;
    expect(h).toEqual({ pinned: [], hidden: ['notes'] });
    h = Wo.toggleHidden(h, IDS, 'notes')!;
    expect(h.hidden).toEqual([]);
    expect(Wo.toggleHidden({ hidden: ['a'] }, ['a', 'b'], 'b')).toBeNull();
    expect(Wo.setAuto(undefined, false)).toEqual({ auto: false });
    expect(Wo.setAuto({ auto: false, pinned: ['x'] }, true)).toEqual({ pinned: ['x'] });
  });
  it('R5: im Arbeitsstand gespeichert, Werk entfernt den Eintrag, Datei liest es zurück', () => {
    let ws = Wo.setWheel(defaultWorkspace(), 'cockpit', { pinned: ['notes'], hidden: [], auto: false });
    expect(ws.wheels).toEqual({ cockpit: { pinned: ['notes'], auto: false } });
    const back = parseWorkspace(JSON.parse(JSON.stringify(ws)))!;
    expect(Wo.prefsOf(back, 'cockpit')).toEqual({ pinned: ['notes'], auto: false });
    ws = Wo.setWheel(ws, 'cockpit', undefined);
    expect(ws.wheels).toBeUndefined();
    expect(Wo.setWheel(defaultWorkspace(), 'x', { pinned: [] }).wheels).toBeUndefined();
  });
});
