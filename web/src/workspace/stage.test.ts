import { describe, expect, it } from 'vitest';
import * as S from './stage';
import { defaultWorkspace } from './workspace';
import { rects } from './tree';

describe('F-207 Main Stage (V96)', () => {
  it('setzen, ablösen, lösen, Rückgängig', () => {
    let ws = defaultWorkspace();
    let r = S.setStage(ws, '', 'a1');
    ws = r.ws;
    expect(S.stageOf(ws, '')).toEqual({ area: 'a1' });
    expect(r.undo).toBeUndefined();
    ws = S.editStage(ws, '', { fixed: true, minW: 640.4, minH: 0 });
    expect(S.stageOf(ws, '')).toEqual({ area: 'a1', fixed: true, minW: 640 });
    r = S.setStage(ws, '', 'a2');
    expect(S.stageOf(r.ws, '')).toEqual({ area: 'a2', fixed: true });
    ws = S.restoreStage(r.ws, '', r.undo);
    expect(S.stageOf(ws, '')).toEqual({ area: 'a1', fixed: true, minW: 640 });
    ws = S.setStage(ws, '', null).ws;
    expect(S.stageOf(ws, '')).toBeUndefined();
    expect(ws.deskNotes).toBeUndefined();
  });
  it('fest sperrt nur die Stage; Mindestgröße; verwaiste Stage fällt weg', () => {
    let ws = S.editStage(S.setStage(defaultWorkspace(), '', 'a1').ws, '', { fixed: true, minW: 400, minH: 300 });
    expect(S.stageLocks(ws, '', 'a1')).toBe(true);
    expect(S.stageLocks(ws, '', 'a2')).toBe(false);
    expect(S.clampToMin(S.stageOf(ws, ''), 200, 500)).toEqual({ w: 400, h: 500 });
    ws = S.dropStaleStage(ws, '', new Set(['a2']));
    expect(S.stageOf(ws, '')).toBeUndefined();
  });
  it('Pads weichen der Stage aus (M4)', () => {
    const st = { x: 0.3, y: 0, w: 0.4, h: 1 };
    expect(S.avoidStage({ x: 0, y: 0, w: 0.2, h: 0.5 }, st)).toEqual({ x: 0, y: 0, w: 0.2, h: 0.5 });
    // näher am linken Rand → links daneben
    expect(S.avoidStage({ x: 0.35, y: 0.1, w: 0.2, h: 0.5 }, st)).toEqual({ x: 0.1, y: 0.1, w: 0.2, h: 0.5 });
    // näher rechts → rechts daneben
    expect(S.avoidStage({ x: 0.55, y: 0.1, w: 0.2, h: 0.5 }, st)).toEqual({ x: 0.7, y: 0.1, w: 0.2, h: 0.5 });
    // zu breit für beide Seiten → größter Streifen (rechts 0,3 = links 0,3 → erster), Breite angepasst
    const big = S.avoidStage({ x: 0.2, y: 0.2, w: 0.5, h: 0.5 }, st);
    expect(S.overlaps(big, st)).toBe(false);
    expect(big.w).toBe(0.3);
    // Stage über alles: bleibt
    expect(S.avoidStage({ x: 0.1, y: 0.1, w: 0.2, h: 0.2 }, { x: 0, y: 0, w: 1, h: 1 })).toEqual({ x: 0.1, y: 0.1, w: 0.2, h: 0.2 });
  });
  it('Dock drängt nur die anderen Slots zurück (M5)', () => {
    const tree = { dir: 'row', sizes: [0.5, 0.5], children: [{ id: 'a' }, { id: 'b' }] } as never;
    const min = { w: 0.05, h: 0.05 };
    // Fläche nur noch 80 % breit → Stage a braucht 0,5 / 0,8 = 0,625
    const t = S.keepStageWidth(tree, 'a', 0.8, min);
    expect(Math.round(rects(t).get('a')!.w * 1000) / 1000).toBe(0.625);
    expect(Math.round(rects(t).get('b')!.w * 1000) / 1000).toBe(0.375);
    // ohne Dock bzw. unbekannte Stage: unverändert
    expect(S.keepStageWidth(tree, 'a', 1, min)).toBe(tree);
    expect(S.keepStageWidth(tree, 'x', 0.8, min)).toBe(tree);
  });
});
