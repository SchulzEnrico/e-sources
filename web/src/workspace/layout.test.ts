import { describe, expect, it } from 'vitest';
import { distributeEvenly, growIntoGaps, isValidLayout, moveWindow, resizeWindow, splitSelection, swapRects } from './layout';
import { type ScreenSetup, detectScreen, specOf } from './screen';
import { type GridSpec, STACK_ID, type WinItem, type Workspace } from './types';
import * as W from './workspace';

const G12: GridSpec = { cols: 12, rows: 12 };
const LAPTOP1: ScreenSetup = { cls: 'laptop', orientation: 'landscape', lines: 1 };
const LAPTOP2: ScreenSetup = { cls: 'laptop', orientation: 'landscape', lines: 2 };
const MONITOR2: ScreenSetup = { cls: 'monitor', orientation: 'landscape', lines: 2 };
const PHONE: ScreenSetup = { cls: 'phone', orientation: 'portrait', lines: 1 };

function win(id: string, x: number, y: number, w: number, h: number): WinItem {
  return { id, name: id, x, y, w, h };
}

function expectValid(items: WinItem[], g: GridSpec = G12) {
  expect(isValidLayout(items, g)).toBe(true);
}

function addN(ws: Workspace, setup: ScreenSetup, n: number) {
  for (let i = 0; i < n; i++) ws = W.addWindow(ws, setup);
  return ws;
}

describe('F-03 Bildschirmklassen', () => {
  it('erkennt Klasse und Ausrichtung', () => {
    expect(detectScreen(390, 844)).toEqual({ cls: 'phone', orientation: 'portrait' });
    expect(detectScreen(1470, 900)).toEqual({ cls: 'small', orientation: 'landscape' });
    expect(detectScreen(1728, 1080)).toEqual({ cls: 'laptop', orientation: 'landscape' });
    expect(detectScreen(2560, 1400)).toEqual({ cls: 'monitor', orientation: 'landscape' });
    expect(detectScreen(1400, 2560)).toEqual({ cls: 'monitor', orientation: 'portrait' });
    expect(detectScreen(3440, 1400)).toEqual({ cls: 'ultrawide', orientation: 'landscape' });
    expect(detectScreen(5120, 1400)).toEqual({ cls: 'superwide', orientation: 'landscape' });
  });

  it('zweizeilig ändert die Anordnung, nicht die Zahl der sichtbaren Fenster', () => {
    expect(specOf(LAPTOP1).capacity).toBe(4);
    expect(specOf(LAPTOP2).capacity).toBe(4);
    let ws = addN(W.defaultWorkspace(), LAPTOP2, 1);
    ws = W.resetLayout(ws, LAPTOP2);
    const two = W.viewOf(ws, LAPTOP2).items;
    expect(new Set(two.map((w) => w.y)).size).toBe(2); // 2 × 2
    const one = W.viewOf(ws, LAPTOP1).items;
    expect(new Set(one.map((w) => w.y)).size).toBe(1); // 4 nebeneinander
  });

  it('Tablet zeigt höchstens 2 Fenster in einer Reihe', () => {
    const s: ScreenSetup = { cls: 'small', orientation: 'landscape', lines: 2 };
    expect(specOf(s).lines).toBe(1);
    const v = W.viewOf(W.defaultWorkspace(), s);
    expect(v.items.map((i) => i.id === STACK_ID)).toEqual([false, true]);
    expect(v.stack).toHaveLength(2);
  });

  it('hochkant werden aus Zeilen Spalten', () => {
    const s: ScreenSetup = { cls: 'monitor', orientation: 'portrait', lines: 2 };
    const ws = addN(W.defaultWorkspace(), s, 3);
    const v = W.viewOf(W.resetLayout(ws, s), s);
    expect(v.items).toHaveLength(6);
    expect(new Set(v.items.map((w) => w.x)).size).toBe(2); // 2 Spalten
    expectValid(v.items, v.spec);
  });

  it('führt je Einstellung ein eigenes Layout', () => {
    let ws = W.defaultWorkspace();
    const id = ws.windows[0].id;
    ws = W.setWindowSize(ws, MONITOR2, id, 1 / 2, 1);
    expect(W.viewOf(ws, MONITOR2).items[0].w).toBe(6);
    expect(ws.layouts['laptop:landscape:2']).toBeUndefined();
  });
});

describe('F-08 Stapel', () => {
  it('Smartphone: ab dem zweiten Fenster liegt alles im Stapel', () => {
    const v = W.viewOf(W.defaultWorkspace(), PHONE);
    expect(v.items).toHaveLength(1);
    expect(v.items[0].id).toBe(STACK_ID);
    expect(v.stack).toHaveLength(3);
  });

  it('ist der Bildschirm voll, wird der Platz ganz rechts zum Stapel', () => {
    let ws = W.defaultWorkspace();
    ws = addN(ws, LAPTOP1, 1); // 4 sichtbar
    expect(W.viewOf(ws, LAPTOP1).stack).toHaveLength(0);
    ws = W.addWindow(ws, LAPTOP1);
    const v = W.viewOf(ws, LAPTOP1);
    expect(v.items).toHaveLength(4);
    const stack = v.items.find((i) => i.id === STACK_ID)!;
    expect(stack.x + stack.w).toBe(v.spec.cols);
    expect(v.stack).toHaveLength(2);
    expect(v.front!.name).toBe('Fenster 5'); // neues Fenster wird angezeigt
    expectValid(v.items, v.spec);
  });

  it('nimmt beliebig viele Fenster auf', () => {
    const ws = addN(W.defaultWorkspace(), LAPTOP1, 40);
    const v = W.viewOf(ws, LAPTOP1);
    expect(v.items).toHaveLength(4);
    expect(v.stack).toHaveLength(40);
  });

  it('wechselt vor und zurück, am Ende geht es vorne weiter', () => {
    let ws = W.defaultWorkspace();
    const first = W.viewOf(ws, PHONE).front!.id;
    ws = W.stepStack(ws, PHONE, 1);
    expect(W.viewOf(ws, PHONE).front!.id).not.toBe(first);
    ws = W.stepStack(ws, PHONE, -1);
    expect(W.viewOf(ws, PHONE).front!.id).toBe(first);
    ws = W.stepStack(ws, PHONE, -1);
    expect(W.viewOf(ws, PHONE).front!.id).toBe(ws.windows[2].id);
  });

  it('schließt man ein Fenster im Raster, rückt das Stapel-Fenster nach', () => {
    let ws = addN(W.defaultWorkspace(), LAPTOP1, 2); // 5 Fenster, Stapel mit 2
    const v = W.viewOf(ws, LAPTOP1);
    const frontId = v.front!.id;
    const gridWin = v.items.find((i) => i.id !== STACK_ID)!;
    ws = W.removeWindow(ws, gridWin.id);
    const after = W.viewOf(ws, LAPTOP1);
    expect(after.stack).toHaveLength(0); // nur noch 1 übrig → Stapel aufgelöst
    expect(after.items.some((i) => i.id === frontId)).toBe(true);
    expect(after.items).toHaveLength(4);
  });

  it('tauscht ein Raster-Fenster mit dem Stapel', () => {
    let ws = addN(W.defaultWorkspace(), LAPTOP1, 2);
    const v = W.viewOf(ws, LAPTOP1);
    const gridWin = v.items.find((i) => i.id !== STACK_ID)!;
    const front = v.front!;
    ws = W.swapWindows(ws, LAPTOP1, gridWin.id, front.id);
    const after = W.viewOf(ws, LAPTOP1);
    expect(after.items.some((i) => i.id === front.id)).toBe(true);
    expect(after.front!.id).toBe(gridWin.id);
  });
});

describe('F-02 Ausweichen nach rechts, nichts über den Rand', () => {
  it('Nachbar rechts wird schmaler, wenn ein Fenster wächst', () => {
    const items = [win('a', 0, 0, 4, 12), win('b', 4, 0, 4, 12), win('c', 8, 0, 4, 12)];
    const out = resizeWindow(items, G12, 'a', { x: 0, y: 0, w: 6, h: 12 })!;
    expect(out.map((w) => [w.x, w.w])).toEqual([
      [0, 6],
      [6, 2],
      [8, 4],
    ]);
  });

  it('schiebt weiter, wenn ein Nachbar die Mindestbreite erreicht', () => {
    const items = [win('a', 0, 0, 4, 12), win('b', 4, 0, 4, 12), win('c', 8, 0, 4, 12)];
    const out = resizeWindow(items, G12, 'a', { x: 0, y: 0, w: 7, h: 12 })!;
    expect(out.find((w) => w.id === 'b')).toMatchObject({ x: 7, w: 2 });
    expect(out.find((w) => w.id === 'c')).toMatchObject({ x: 9, w: 3 });
  });

  it('wächst nur so weit wie möglich', () => {
    const items = [win('a', 0, 0, 4, 12), win('b', 4, 0, 4, 12), win('c', 8, 0, 4, 12)];
    const out = resizeWindow(items, G12, 'a', { x: 0, y: 0, w: 12, h: 12 })!;
    expect(out.find((w) => w.id === 'a')!.w).toBe(8);
    expectValid(out);
  });

  it('Fenster darunter wird von oben her niedriger', () => {
    const items = [win('a', 0, 0, 6, 6), win('b', 0, 6, 6, 6), win('c', 6, 0, 6, 12)];
    const out = resizeWindow(items, G12, 'a', { x: 0, y: 0, w: 6, h: 8 })!;
    expect(out.find((w) => w.id === 'b')).toMatchObject({ x: 0, y: 8, h: 4 });
  });

  it('beim Verkleinern wachsen Nachbarn in die Lücke', () => {
    const items = [win('a', 0, 0, 6, 12), win('b', 6, 0, 6, 12)];
    const out = resizeWindow(items, G12, 'a', { x: 0, y: 0, w: 3, h: 12 })!;
    expect(out.find((w) => w.id === 'b')).toMatchObject({ x: 3, w: 9 });
  });
});

describe('F-10, F-11, F-12', () => {
  it('beim Schließen ohne Stapel wachsen die Nachbarn in die Lücke', () => {
    let ws = W.defaultWorkspace();
    ws = W.distribute(ws, LAPTOP1);
    ws = W.removeWindow(ws, ws.windows[1].id);
    const v = W.viewOf(ws, LAPTOP1);
    expect(v.items.reduce((s, w) => s + w.w, 0)).toBe(v.spec.cols);
  });

  it('benennt um und ignoriert leere Namen', () => {
    const ws = W.defaultWorkspace();
    const id = ws.windows[0].id;
    expect(W.renameWindow(ws, id, '  Recherche ').windows[0].name).toBe('Recherche');
    expect(W.renameWindow(ws, id, '   ')).toBe(ws);
  });

  it('tauscht, wenn die Mitte auf einem anderen Fenster landet', () => {
    const items = [win('a', 0, 0, 4, 12), win('b', 4, 0, 8, 12)];
    const out = moveWindow(items, G12, 'a', { x: 6, y: 0, w: 4, h: 12 })!;
    expect(out.find((w) => w.id === 'a')).toMatchObject({ x: 4, w: 8 });
  });

  it('tauscht Position und Größe', () => {
    const out = swapRects([win('a', 0, 0, 8, 12), win('b', 8, 0, 4, 12)], 'a', 'b');
    expect(out[0]).toMatchObject({ x: 8, w: 4 });
  });
});

describe('F-05 Zurücksetzen', () => {
  it('verteilt gleichmäßig in Reihen', () => {
    const spec = specOf(MONITOR2);
    const five = distributeEvenly(['a', 'b', 'c', 'd', 'e'].map((id) => win(id, 0, 0, 1, 1)), spec, spec);
    expect(five.filter((w) => w.y === 0)).toHaveLength(3);
    expectValid(five, spec);
  });

  it('stellt die Wunsch-Anordnung wieder her, ohne Fenster zu löschen', () => {
    let ws = W.defaultWorkspace();
    ws = W.savePreferred(ws, LAPTOP1);
    const saved = W.viewOf(ws, LAPTOP1).items;
    ws = W.swapWindows(ws, LAPTOP1, ws.windows[0].id, ws.windows[2].id);
    ws = W.resetLayout(ws, LAPTOP1);
    expect(W.viewOf(ws, LAPTOP1).items).toEqual(saved);
    expect(ws.windows).toHaveLength(3);
  });

  it('setzt ein einzelnes Fenster auf seinen Platz in der Wunsch-Anordnung zurück', () => {
    let ws = W.defaultWorkspace();
    ws = W.savePreferred(ws, LAPTOP1);
    const before = W.viewOf(ws, LAPTOP1).items[0];
    const id = ws.windows[0].id;
    ws = W.setWindowSize(ws, LAPTOP1, id, 1 / 4, 1 / 2);
    ws = W.resetWindow(ws, LAPTOP1, id);
    expect(W.viewOf(ws, LAPTOP1).items[0]).toMatchObject({ x: before.x, w: before.w, h: before.h });
  });
});

describe('Hilfsfunktionen', () => {
  it('growIntoGaps teilt eine Lücke gerecht', () => {
    const out = growIntoGaps([win('a', 0, 0, 4, 12), win('c', 8, 0, 4, 12)], G12);
    expect(out.map((w) => w.w)).toEqual([6, 6]);
  });

  it('F-13 Splitscreen wählt das aktive und die folgenden Fenster', () => {
    const list = [win('a', 0, 0, 3, 12), win('b', 3, 0, 3, 12), win('c', 6, 0, 3, 12), win('d', 9, 0, 3, 12)];
    expect(splitSelection(list, 'd', 2).map((w) => w.id)).toEqual(['d', 'a']);
  });
});
