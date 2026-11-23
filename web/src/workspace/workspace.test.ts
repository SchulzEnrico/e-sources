import { describe, expect, it } from 'vitest';
import { type ScreenSetup, detectScreen, specOf } from './screen';
import * as T from './tree';
import { parseWorkspace } from './storage';
import type { Workspace } from './types';
import * as X from './transfer';
import * as B from './bookmarks';
import * as W from './workspace';
import * as L from './look';
import * as D from './demo';
import * as FH from './frameHistory';
import * as F from './focus';
import * as Win from './windows';
import { reducer } from './useWorkspace';
import { layoutKey, parseLayoutKey } from './screen';
import * as M from './move';
import * as Probe from './probe';
import * as S from './sizing';
import * as H from './help';
import * as Tour from './tour';
import * as C from './cycle';
import * as Cl from './closed';
import * as La from './launcher';
import * as BB from './browserBookmarks';
import * as SH from './sortHelp';
import * as Pr from './profile';
import * as Up from './update';
import * as Ti from './tint';
import * as Ca from './category';
import * as Ru from './rules';
import * as DL from './deskLayouts';
import * as Ic from './icons';
import * as Dis from './display';
import * as Jp from './jackpot';

const LAPTOP1: ScreenSetup = { cls: 'laptop', orientation: 'landscape', lines: 1 };
const LAPTOP2: ScreenSetup = { cls: 'laptop', orientation: 'landscape', lines: 2 };
const MONITOR2: ScreenSetup = { cls: 'monitor', orientation: 'landscape', lines: 2 };
const MONITOR_HOCH: ScreenSetup = { cls: 'monitor', orientation: 'portrait', lines: 2 };
const TABLET: ScreenSetup = { cls: 'small', orientation: 'landscape', lines: 1 };
const PHONE: ScreenSetup = { cls: 'phone', orientation: 'portrait', lines: 1 };
const MIN: T.Min = { w: 0.1, h: 0.1 };

const leaf = (id: string): T.Leaf => ({ id });
const row = (...children: T.Node[]): T.Split => ({ dir: 'row', children, sizes: children.map(() => 1 / children.length) });
const col = (...children: T.Node[]): T.Split => ({ dir: 'col', children, sizes: children.map(() => 1 / children.length) });

const close = (a: number, b: number) => Math.abs(a - b) < 1e-6;

/** Lückenlos: Die Flächen aller Blätter ergeben zusammen genau die ganze Fläche, ohne Überlappung. */
function expectTiled(n: T.Node | null) {
  const rs = [...T.rects(n).values()];
  const area = rs.reduce((s, r) => s + r.w * r.h, 0);
  expect(close(area, 1)).toBe(true);
  for (const a of rs) {
    expect(a.x >= -1e-9 && a.y >= -1e-9 && a.x + a.w <= 1 + 1e-9 && a.y + a.h <= 1 + 1e-9).toBe(true);
    for (const b of rs) {
      if (a === b) continue;
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      expect(ox > 1e-9 && oy > 1e-9).toBe(false);
    }
  }
}

function addN(ws: Workspace, setup: ScreenSetup, n: number) {
  for (let i = 0; i < n; i++) ws = W.addPanel(ws, setup);
  return ws;
}

/** Area eines Panels in einer Einstellung. */
const P = (ws: Workspace, setup: ScreenSetup, id: string) => W.areaOf(W.viewOf(ws, setup), id)!;
const rectOf = (ws: Workspace, setup: ScreenSetup, id: string) => T.rects(W.viewOf(ws, setup).tree).get(P(ws, setup, id))!;
/** Sichtbare Panels in Lesereihenfolge. */
const fronts = (ws: Workspace, setup: ScreenSetup) => {
  const v = W.viewOf(ws, setup);
  return T.readingOrder(v.tree).map((id) => v.arrangement!.areas[id].front);
};

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

  it('zweizeilig ändert die Anordnung, nicht die Zahl der sichtbaren Panels', () => {
    expect(specOf(LAPTOP1).capacity).toBe(4);
    expect(specOf(LAPTOP2).capacity).toBe(4);
    const ws = addN(W.defaultWorkspace(), LAPTOP2, 1); // 4 Panels
    const two = W.viewOf(ws, LAPTOP2);
    const one = W.viewOf(ws, LAPTOP1);
    expect(two.slots).toHaveLength(4);
    expect(one.slots).toHaveLength(4);
    expect(new Set(two.slots.map((s) => s.rect.y)).size).toBe(2);
    expect(new Set(one.slots.map((s) => s.rect.y)).size).toBe(1);
  });

  it('Tablet zeigt höchstens 2 Panels nebeneinander', () => {
    const v = W.viewOf(W.defaultWorkspace(), TABLET);
    expect(v.slots).toHaveLength(2);
    expect(v.slots.every((s) => close(s.rect.h, 1))).toBe(true);
  });

  it('hochkant werden aus Zeilen Spalten', () => {
    const ws = addN(W.defaultWorkspace(), MONITOR_HOCH, 1); // 4 Panels
    const v = W.viewOf(ws, MONITOR_HOCH);
    expect(new Set(v.slots.map((s) => s.rect.x)).size).toBe(2);
    expectTiled(v.tree);
  });

  it('führt je Einstellung eine eigene Anordnung', () => {
    let ws = W.defaultWorkspace();
    const [a, b] = ws.panels.map((p) => p.id);
    ws = W.dropSlot(ws, MONITOR2, P(ws, MONITOR2, a), P(ws, MONITOR2, b), 'center');
    expect(fronts(ws, MONITOR2)[0]).toBe(b);
    expect(fronts(ws, LAPTOP2)[0]).toBe(a);
  });
});

describe('F-01 lückenlos, F-10 anlegen', () => {
  it('ist nach jedem Schritt lückenlos gefüllt', () => {
    let ws = W.defaultWorkspace();
    expectTiled(W.viewOf(ws, MONITOR2).tree);
    for (let i = 0; i < 6; i++) {
      ws = W.addPanel(ws, MONITOR2);
      expectTiled(W.viewOf(ws, MONITOR2).tree);
    }
    ws = W.removePanel(ws, ws.panels[1].id);
    expectTiled(W.viewOf(ws, MONITOR2).tree);
  });

  it('neues Panel teilt sich das größte Panel', () => {
    let ws = W.defaultWorkspace(); // 3 Panels, Laptop zweizeilig: 2 oben, 1 unten über die ganze Breite
    const bottom = W.viewOf(ws, LAPTOP2).slots.find((s) => close(s.rect.w, 1))!;
    ws = W.addPanel(ws, LAPTOP2);
    const added = ws.panels[3].id;
    const r = rectOf(ws, LAPTOP2, added);
    expect(close(r.y, 0.5) && close(r.w, 0.5) && close(r.x, 0.5)).toBe(true);
    expect(close(rectOf(ws, LAPTOP2, bottom.front.id).w, 0.5)).toBe(true);
  });
});

describe('F-08, F-09 Stapel', () => {
  it('Smartphone: alle Panels liegen auf einer Area', () => {
    const v = W.viewOf(W.defaultWorkspace(), PHONE);
    expect(v.slots).toHaveLength(1);
    expect(v.slots[0].panels).toHaveLength(3);
  });

  it('ist der Bildschirm voll, kommt das neue Panel auf die Area ganz rechts und wird angezeigt', () => {
    let ws = addN(W.defaultWorkspace(), LAPTOP1, 1); // 4 Panels nebeneinander
    const right = W.viewOf(ws, LAPTOP1).slots.find((s) => close(s.rect.x + s.rect.w, 1))!;
    ws = W.addPanel(ws, LAPTOP1);
    const v = W.viewOf(ws, LAPTOP1);
    expect(v.slots).toHaveLength(4);
    const after = v.slots.find((s) => s.id === right.id)!;
    expect(after.panels.map((m) => m.id)).toEqual([right.front.id, ws.panels[4].id]);
    expect(after.front.id).toBe(ws.panels[4].id);
  });

  it('F-114: addPanel übernimmt eine vorgegebene Id (Probe und echtes Portal gleich)', () => {
    let ws = W.defaultWorkspace();
    const pa = P(ws, MONITOR2, ws.panels[0].id);
    ws = W.addPanel(ws, MONITOR2, pa, 'fest-1');
    expect(ws.panels.at(-1)!.id).toBe('fest-1');
    const s = W.viewOf(ws, MONITOR2).slots.find((x) => x.id === pa)!;
    expect(s.front.id).toBe('fest-1');
    // ohne Id weiter eine neue
    ws = W.addPanel(ws, MONITOR2);
    expect(ws.panels.at(-1)!.id).not.toBe('fest-1');
  });

  it('F-09: an jeder Area lässt sich ein Panel obendrauf legen', () => {
    let ws = W.defaultWorkspace();
    const pa = P(ws, MONITOR2, ws.panels[0].id);
    ws = W.addPanel(ws, MONITOR2, pa);
    ws = W.addPanel(ws, MONITOR2, pa);
    const v = W.viewOf(ws, MONITOR2);
    expect(v.slots).toHaveLength(3);
    const s = v.slots.find((x) => x.id === pa)!;
    expect(s.panels).toHaveLength(3);
    expect(s.front.id).toBe(ws.panels[4].id);
    // Andere Einstellungen ordnen die neuen Panels selbst ein.
    expect(W.viewOf(ws, LAPTOP2).slots).toHaveLength(4);
  });

  it('nimmt bis zu 9 Panels je Area auf (F-26), insgesamt bleibt die Zahl frei', () => {
    const ws = addN(W.defaultWorkspace(), LAPTOP2, 20);
    const v = W.viewOf(ws, LAPTOP2);
    expect(v.slots).toHaveLength(4);
    expect(Math.max(...v.slots.map((s) => s.panels.length))).toBe(W.STACK_MAX);
    expect(W.stackFull(ws, LAPTOP2)).toBe(true);
    // Eine andere Area nimmt weiter Panels auf, ein größerer Bildschirm auch.
    const other = v.slots.find((s) => s.panels.length === 1)!;
    expect(W.stackFull(ws, LAPTOP2, other.id)).toBe(false);
    const big = addN(ws, MONITOR2, 2);
    expect(big.panels.length).toBe(ws.panels.length + 2);
  });

  it('wechselt vor und zurück, am Ende geht es vorne weiter', () => {
    let ws = W.defaultWorkspace();
    const ids = ws.panels.map((p) => p.id);
    const area = W.viewOf(ws, PHONE).slots[0].id;
    ws = W.setStackFront(ws, PHONE, ids[0]);
    ws = W.stepStack(ws, PHONE, area, 1);
    expect(W.viewOf(ws, PHONE).slots[0].front.id).toBe(ids[1]);
    ws = W.stepStack(ws, PHONE, area, -2);
    expect(W.viewOf(ws, PHONE).slots[0].front.id).toBe(ids[2]);
  });

  it('schließt man das sichtbare Panel eines Stapels, rückt das nächste nach vorn', () => {
    let ws = W.defaultWorkspace();
    const ids = ws.panels.map((p) => p.id);
    ws = W.setStackFront(ws, PHONE, ids[1]);
    ws = W.removePanel(ws, ids[1]);
    const s = W.viewOf(ws, PHONE).slots[0];
    expect(s.panels.map((m) => m.id)).toEqual([ids[0], ids[2]]);
    expect(s.front.id).toBe(ids[2]);
  });

  it('tauscht ein Panel auf der Fläche mit einem Panel im Stapel', () => {
    let ws = addN(W.defaultWorkspace(), LAPTOP1, 3); // 6 Panels: 3 einzeln + Stapel mit 3
    const v = W.viewOf(ws, LAPTOP1);
    const single = v.slots.find((s) => s.panels.length === 1)!;
    const stack = v.slots.find((s) => s.panels.length > 1)!;
    const onArea = single.front.id;
    const inStack = stack.front.id;
    ws = W.swapPanels(ws, LAPTOP1, onArea, inStack);
    const after = W.viewOf(ws, LAPTOP1);
    expect(after.slots.find((s) => s.id === single.id)!.front.id).toBe(inStack);
    expect(after.slots.find((s) => s.id === stack.id)!.front.id).toBe(onArea);
  });

  it('ergibt beim erneuten Anzeigen dieselben Areas (Seiten laden nicht neu)', () => {
    const ws = addN(W.defaultWorkspace(), LAPTOP1, 3);
    const ids = (setup: ScreenSetup) => W.viewOf(ws, setup).slots.map((s) => s.id);
    expect(ids(MONITOR2)).toEqual(ids(MONITOR2));
    expect(ids(PHONE)).toEqual(ids(PHONE));
  });
});

describe('F-02 Kanten ziehen', () => {
  const four = col(row(leaf('a'), leaf('b')), row(leaf('c'), leaf('d')));

  it('rechte Kante: Panel wächst, Nachbar schrumpft, die untere Reihe bleibt', () => {
    const t = T.resizeEdge(four, 'a', 'right', 0.2, MIN);
    const r = T.rects(t);
    expect(close(r.get('a')!.w, 0.7)).toBe(true);
    expect(close(r.get('b')!.w, 0.3)).toBe(true);
    expect(close(r.get('c')!.w, 0.5)).toBe(true);
    expectTiled(t);
  });

  it('untere Kante verschiebt die gemeinsame Kante der ganzen Reihe', () => {
    const t = T.resizeEdge(four, 'b', 'bottom', -0.2, MIN);
    const r = T.rects(t);
    expect(close(r.get('a')!.h, 0.3)).toBe(true);
    expect(close(r.get('d')!.h, 0.7)).toBe(true);
  });

  it('obere und linke Kante lassen sich ebenfalls greifen, der Rand der Fläche nicht', () => {
    expect(T.canResize(four, 'd', 'top')).toBe(true);
    expect(T.canResize(four, 'd', 'left')).toBe(true);
    expect(T.canResize(four, 'd', 'right')).toBe(false);
    expect(T.canResize(four, 'a', 'top')).toBe(false);
    const t = T.resizeEdge(four, 'd', 'top', -0.1, MIN);
    expect(close(T.rects(t).get('d')!.h, 0.6)).toBe(true);
  });

  it('hält die Mindestgröße ein', () => {
    const t = T.resizeEdge(four, 'a', 'right', 0.9, MIN);
    expect(close(T.rects(t).get('b')!.w, 0.1)).toBe(true);
  });

  it('beachtet die Mindestgröße verschachtelter Panels', () => {
    const t0 = row(leaf('a'), row(leaf('b'), leaf('c'))); // wird zu drei nebeneinander
    const nested = { dir: 'row' as const, children: [leaf('a'), col(leaf('b'), leaf('c')), leaf('d')], sizes: [0.4, 0.3, 0.3] };
    const t = T.resizeEdge(nested, 'a', 'right', 0.5, MIN);
    expect(close(T.rects(t).get('b')!.w, 0.1)).toBe(true);
    expect(T.leaves(T.tidy(t0))).toEqual(['a', 'b', 'c']);
  });

  it('Ecke zieht Breite und Höhe zugleich', () => {
    const t = T.resizeEdges(four, 'a', { x: 'right', dx: 0.1, y: 'bottom', dy: 0.1 }, MIN);
    const r = T.rects(t).get('a')!;
    expect(close(r.w, 0.6) && close(r.h, 0.6)).toBe(true);
  });
});

describe('NF-07 Rückmeldung beim Ziehen', () => {
  const four = col(row(leaf('a'), leaf('b')), row(leaf('c'), leaf('d')));

  it('meldet nur die Panels, deren Größe sich ändert', () => {
    const t = T.resizeEdge(four, 'a', 'right', 0.2, MIN);
    expect([...T.resizedLeaves(four, t)].sort()).toEqual(['a', 'b']);
  });

  it('untere Kante betrifft alle vier Panels', () => {
    const t = T.resizeEdge(four, 'b', 'bottom', -0.2, MIN);
    expect(T.resizedLeaves(four, t).size).toBe(4);
  });

  it('ohne Änderung wird nichts gemeldet', () => {
    expect(T.resizedLeaves(four, four).size).toBe(0);
  });
});

describe('F-11 Anordnungen, tauschen, andocken', () => {
  it('tauscht beim Ablegen auf der Mitte', () => {
    const t = T.drop(row(leaf('a'), leaf('b')), 'a', 'b', 'center');
    expect(T.leaves(t)).toEqual(['b', 'a']);
  });

  it('dockt unten an: aus drei nebeneinander wird ein hohes Panel mit zwei übereinander', () => {
    const t = T.drop(row(leaf('a'), leaf('b'), leaf('c')), 'c', 'b', 'bottom');
    const r = T.rects(t);
    expect(close(r.get('a')!.h, 1)).toBe(true);
    expect(close(r.get('b')!.x, r.get('c')!.x)).toBe(true);
    expect(r.get('c')!.y > r.get('b')!.y).toBe(true);
    expectTiled(t);
  });

  it('erlaubt ein hohes Panel in der Mitte mit je zwei übereinander links und rechts', () => {
    let t: T.Node = T.standard(['a', 'b', 'c', 'd', 'e'], 1, 5, 'landscape')!;
    t = T.drop(t, 'b', 'a', 'bottom');
    t = T.drop(t, 'e', 'd', 'bottom');
    const r = T.rects(t);
    expect(close(r.get('c')!.h, 1)).toBe(true);
    expect(close(r.get('a')!.h, 0.5) && close(r.get('d')!.h, 0.5)).toBe(true);
    expect(r.get('a')!.x < r.get('c')!.x && r.get('c')!.x < r.get('d')!.x).toBe(true);
    expectTiled(t);
  });

  it('erlaubt eine breite untere Reihe (Ablegen am unteren Rand der Fläche)', () => {
    const t = T.drop(row(leaf('a'), leaf('b'), leaf('c')), 'c', T.AREA, 'bottom');
    const r = T.rects(t);
    expect(close(r.get('c')!.w, 1) && close(r.get('c')!.h, 0.5)).toBe(true);
    expect(close(r.get('a')!.y, 0) && close(r.get('b')!.y, 0)).toBe(true);
    expectTiled(t);
  });

  it('am Rand der Fläche bekommt das Panel so viel Platz wie eine vorhandene Reihe', () => {
    const t = T.dockArea(T.standard(['a', 'b', 'c', 'd', 'e'], 2, 3, 'landscape')!, 'e', 'bottom');
    expect(close(T.rects(t).get('e')!.h, 1 / 3)).toBe(true);
    expectTiled(t);
  });

  it('ungerade Zahl: ein Panel über beide Reihen', () => {
    const t = T.drop(col(leaf('a'), leaf('b'), leaf('c')), 'c', T.AREA, 'right');
    const r = T.rects(t);
    expect(close(r.get('c')!.h, 1) && close(r.get('c')!.w, 0.5)).toBe(true);
    expect(close(r.get('a')!.x, r.get('b')!.x) && close(r.get('a')!.w, 0.5)).toBe(true);
    expectTiled(t);
  });

  it('auf der Arbeitsfläche: Ablegen am Rand dockt an', () => {
    let ws = W.defaultWorkspace();
    const [a, b, c] = ws.panels.map((p) => p.id);
    ws = W.dropSlot(ws, LAPTOP1, P(ws, LAPTOP1, c), P(ws, LAPTOP1, a), 'bottom');
    expect(close(rectOf(ws, LAPTOP1, a).x, rectOf(ws, LAPTOP1, c).x)).toBe(true);
    expect(close(rectOf(ws, LAPTOP1, b).h, 1)).toBe(true);
  });
});

describe('F-10, F-12 schließen, umbenennen, Größe', () => {
  it('beim Schließen ohne Stapel übernimmt der Nachbar die Area', () => {
    let ws = W.defaultWorkspace();
    const [a, b] = ws.panels.map((p) => p.id);
    ws = W.distribute(W.setPanelSize(ws, LAPTOP2, a, 0.4, 0.5, MIN), LAPTOP2); // Anordnung speichern
    ws = W.removePanel(ws, b);
    const v = W.viewOf(ws, LAPTOP2);
    expect(v.slots).toHaveLength(2);
    expect(close(rectOf(ws, LAPTOP2, a).w, 1)).toBe(true);
    expectTiled(v.tree);
  });

  it('ist ein Nachbar an seiner Mindestgröße, schiebt die Kante weiter', () => {
    const t = T.resizeEdge(row(leaf('a'), leaf('b'), leaf('c')), 'a', 'right', 0.4, MIN);
    const r = T.rects(t);
    expect(close(r.get('a')!.w, 1 / 3 + 0.4)).toBe(true);
    expect(close(r.get('b')!.w, 0.1)).toBe(true);
    expect(close(r.get('c')!.w, 1 - (1 / 3 + 0.4) - 0.1)).toBe(true);
  });

  it('benennt um und ignoriert leere Namen', () => {
    let ws = W.defaultWorkspace();
    const id = ws.panels[0].id;
    ws = W.renamePanel(ws, id, '  Recherche ');
    expect(ws.panels[0].name).toBe('Recherche');
    expect(W.renamePanel(ws, id, '   ')).toBe(ws);
  });

  it('setzt eine voreingestellte Größe, soweit die Nachbarn es zulassen', () => {
    let ws = W.defaultWorkspace();
    const a = ws.panels[0].id;
    ws = W.setPanelSize(ws, LAPTOP1, a, 2 / 3, 1, MIN);
    expect(close(rectOf(ws, LAPTOP1, a).w, 2 / 3)).toBe(true);
    expectTiled(W.viewOf(ws, LAPTOP1).tree);
  });
});

describe('F-05 Zurücksetzen', () => {
  it('Gleich verteilen macht alle Anteile gleich, die Anordnung bleibt', () => {
    let ws = W.defaultWorkspace();
    const a = ws.panels[0].id;
    ws = W.setPanelSize(ws, LAPTOP1, a, 0.6, 1, MIN);
    ws = W.distribute(ws, LAPTOP1);
    expect(close(rectOf(ws, LAPTOP1, a).w, 1 / 3)).toBe(true);
  });

  it('stellt die Wunsch-Anordnung wieder her, ohne Panels zu löschen', () => {
    let ws = W.defaultWorkspace();
    const [a, b] = ws.panels.map((p) => p.id);
    const drop = () => W.dropSlot(ws, LAPTOP1, P(ws, LAPTOP1, a), P(ws, LAPTOP1, b), 'center');
    ws = drop();
    ws = W.savePreferred(ws, LAPTOP1);
    ws = drop();
    ws = W.addPanel(ws, LAPTOP1);
    ws = W.resetLayout(ws, LAPTOP1);
    const v = W.viewOf(ws, LAPTOP1);
    expect(fronts(ws, LAPTOP1).slice(0, 2)).toEqual([b, a]);
    expect(ws.panels).toHaveLength(4);
    expect(v.slots).toHaveLength(4);
  });

  it('setzt ein einzelnes Panel auf seine Größe in der Wunsch-Anordnung zurück', () => {
    let ws = W.defaultWorkspace();
    const a = ws.panels[0].id;
    ws = W.savePreferred(ws, LAPTOP1);
    ws = W.setPanelSize(ws, LAPTOP1, a, 0.6, 1, MIN);
    ws = W.resetPanel(ws, LAPTOP1, a, MIN);
    expect(close(rectOf(ws, LAPTOP1, a).w, 1 / 3)).toBe(true);
  });

  it('F-13 Splitscreen wählt das aktive und die folgenden Areas', () => {
    const ws = addN(W.defaultWorkspace(), LAPTOP1, 1);
    const v = W.viewOf(ws, LAPTOP1);
    const order = T.readingOrder(v.tree);
    expect(W.splitSelection(v, order[3], 2)).toEqual([order[3], order[0]]);
  });
});

describe('Vorläufige Adresszeile', () => {
  it('ergänzt das Schema und merkt sich die Adresse je Panel', () => {
    expect(W.normalizeUrl('wikipedia.org')).toBe('https://wikipedia.org');
    expect(W.normalizeUrl('localhost:3000')).toBe('http://localhost:3000');
    expect(W.normalizeUrl(' https://example.com ')).toBe('https://example.com');
    let ws = W.defaultWorkspace();
    const id = ws.panels[0].id;
    ws = W.navigatePanel(ws, id, 'example.com');
    expect(W.panelUrl(ws.panels[0])).toBe('https://example.com');
    ws = W.navigatePanel(ws, id, '   ');
    expect(W.panelUrl(ws.panels[0])).toBe(undefined);
  });

  it('führt je Tab einen eigenen Verlauf (F-14)', () => {
    let ws = W.defaultWorkspace();
    const id = ws.panels[0].id;
    const p = () => ws.panels[0];
    ws = W.navigatePanel(ws, id, 'a.de');
    ws = W.navigatePanel(ws, id, 'b.de');
    ws = W.navigatePanel(ws, id, 'c.de');
    expect(W.activeTab(p()).history).toEqual(['https://a.de', 'https://b.de', 'https://c.de']);
    expect(p().home).toBe('https://a.de');
    expect(W.canGoForward(p())).toBe(false);
    ws = W.historyStep(ws, id, -1);
    expect(W.panelUrl(p())).toBe('https://b.de');
    expect(W.canGoBack(p()) && W.canGoForward(p())).toBe(true);
    ws = W.historyStep(ws, id, -5);
    expect(W.panelUrl(p())).toBe('https://a.de');
    expect(W.canGoBack(p())).toBe(false);
    ws = W.historyStep(ws, id, 1);
    // Neue Seite mitten im Verlauf: Einträge „vorwärts“ entfallen.
    ws = W.navigatePanel(ws, id, 'd.de');
    expect(W.activeTab(p()).history).toEqual(['https://a.de', 'https://b.de', 'https://d.de']);
    // Gleiche Adresse erneut: kein doppelter Eintrag.
    ws = W.navigatePanel(ws, id, 'd.de');
    expect(W.activeTab(p()).history?.length).toBe(3);
    ws = W.setHome(ws, id);
    ws = W.goHome(ws, id);
    expect(p().home).toBe('https://d.de');
    ws = W.historyStep(ws, id, -1);
    ws = W.goHome(ws, id);
    expect(W.panelUrl(p())).toBe('https://d.de');
    expect(W.isSelfUrl('http://localhost:2910/x', 'http://localhost:2910')).toBe(true);
    expect(W.isSelfUrl('https://a.de', 'http://localhost:2910')).toBe(false);
    // F-120: Portfolio und E-Source teilen sich die Domain, nur der Pfad unterscheidet sie.
    const base = 'https://schulzenrico.github.io/e-sources/';
    expect(W.isSelfUrl('https://schulzenrico.github.io/e-sources/', base)).toBe(true);
    expect(W.isSelfUrl('https://schulzenrico.github.io/e-sources', base)).toBe(true);
    expect(W.isSelfUrl('https://schulzenrico.github.io/', base)).toBe(false);
    expect(W.isSelfUrl('https://schulzenrico.github.io/e-sources-alt/', base)).toBe(false);
  });
});

describe('Speichern', () => {
  it('erkennt ungültige Bäume', () => {
    expect(T.isNode(row(leaf('a'), leaf('b')))).toBe(true);
    expect(T.isNode({ dir: 'row', children: [leaf('a')], sizes: [1] })).toBe(false);
    expect(T.isNode(row(leaf('a'), leaf('a')))).toBe(false);
    expect(T.isNode({ dir: 'row', children: [leaf('a'), leaf('b')], sizes: [1, -1] })).toBe(false);
  });
});

describe('Ampel (F-26)', () => {
  it('färbt nach Anzahl und begrenzt den Stapel auf 9', () => {
    expect(W.loadColor(1)).toBe('rgb(22, 92, 44)');
    expect(W.loadColor(5)).toBe('rgb(57, 255, 20)');
    expect(W.loadColor(6)).toBe('rgb(255, 214, 10)');
    expect(W.loadColor(9)).toBe('rgb(208, 0, 0)');
    // Smartphone: eine Area, alles im Stapel.
    let ws = W.defaultWorkspace();
    while (!W.stackFull(ws, PHONE)) ws = W.addPanel(ws, PHONE);
    expect(W.viewOf(ws, PHONE).slots[0].panels).toHaveLength(W.STACK_MAX);
    expect(W.addPanel(ws, PHONE)).toBe(ws);
  });
});


describe('F-121 Abgleich per JSON-Datei', () => {
  const ws = W.defaultWorkspace();

  it('Export und Import ergeben dieselbe Arbeitsfläche', () => {
    const file = X.toTransferFile(ws, 'Mac', new Date('2026-11-21T14:00:00Z'));
    const back = X.readTransferFile(JSON.stringify(file));
    expect(back.ok).toBe(true);
    if (back.ok) {
      expect(back.file.workspace).toEqual(ws);
      expect(back.file.device).toBe('Mac');
      expect(back.file.savedAt).toBe('2026-11-21T14:00:00.000Z');
    }
  });

  it('fremde oder kaputte Dateien werden abgelehnt', () => {
    expect(X.readTransferFile('kein json').ok).toBe(false);
    expect(X.readTransferFile(JSON.stringify({ format: 'anderes' })).ok).toBe(false);
    const neuer = { ...X.toTransferFile(ws, 'Mac'), version: X.FILE_VERSION + 1 };
    expect(X.readTransferFile(JSON.stringify(neuer)).ok).toBe(false);
    const kaputt = { ...X.toTransferFile(ws, 'Mac'), workspace: { panels: 'x' } };
    expect(X.readTransferFile(JSON.stringify(kaputt)).ok).toBe(false);
  });

  it('Regel: nur fragen, wenn dieses Gerät seit dem letzten Abgleich neuer ist als die Datei', () => {
    const t = (s: string) => Date.parse(s);
    const file = '2026-11-21T12:00:00.000Z';
    // nichts geändert seit dem letzten Abgleich
    expect(X.needsConfirm({ changedAt: t('2026-11-21T13:00:00Z'), syncedAt: t('2026-11-21T13:30:00Z') }, file)).toBe(false);
    // geändert, aber die Datei ist neuer
    expect(X.needsConfirm({ changedAt: t('2026-11-21T11:00:00Z'), syncedAt: 0 }, file)).toBe(false);
    // geändert und neuer als die Datei
    expect(X.needsConfirm({ changedAt: t('2026-11-21T13:00:00Z'), syncedAt: t('2026-11-21T10:00:00Z') }, file)).toBe(true);
    // neues Gerät ohne Änderungen
    expect(X.needsConfirm({ changedAt: 0, syncedAt: 0 }, file)).toBe(false);
  });

  it('Gerätebezeichnung', () => {
    expect(X.deviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', true)).toBe('iPhone');
    expect(X.deviceLabel('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', true)).toBe('iPad');
    expect(X.deviceLabel('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', false)).toBe('Mac');
  });
});

describe('F-21, F-22 Tabs', () => {
  it('Tabs anlegen, wechseln und schließen; jeder Tab hat seinen Verlauf', () => {
    let ws = W.defaultWorkspace();
    const id = ws.panels[0].id;
    const p = () => ws.panels[0];
    expect(p().tabs).toHaveLength(1);
    ws = W.navigatePanel(ws, id, 'a.de');
    ws = W.addTab(ws, id, 'b.de');
    expect(p().tabs).toHaveLength(2);
    expect(W.panelUrl(p())).toBe('https://b.de');
    expect(W.tabLabel(p().tabs[0])).toBe('a.de');
    expect(W.tabLabel(W.newTab())).toBe('Neuer Tab');
    ws = W.selectTab(ws, id, p().tabs[0].id);
    expect(W.panelUrl(p())).toBe('https://a.de');
    ws = W.navigatePanel(ws, id, 'c.de');
    expect(W.activeTab(p()).history).toEqual(['https://a.de', 'https://c.de']);
    expect(p().tabs[1].history).toEqual(['https://b.de']);
    expect(p().home).toBe('https://a.de'); // Startseite gehört zum Panel
    ws = W.closeTab(ws, id, p().tabs[0].id);
    expect(p().tabs).toHaveLength(1);
    expect(W.panelUrl(p())).toBe('https://b.de');
    // Der letzte Tab wird nur geleert, das Panel bleibt.
    ws = W.closeTab(ws, id, p().tabs[0].id);
    expect(p().tabs).toHaveLength(1);
    expect(W.panelUrl(p())).toBe(undefined);
    expect(ws.panels).toHaveLength(3);
  });

  it('Reihenfolge per Ziehen, höchstens 9 Tabs (F-26)', () => {
    let ws = W.defaultWorkspace();
    const id = ws.panels[0].id;
    const ids = () => ws.panels[0].tabs.map((t) => t.id);
    for (let i = 0; i < 12; i++) ws = W.addTab(ws, id, `s${i}.de`);
    expect(ids()).toHaveLength(W.TAB_MAX);
    expect(W.addTab(ws, id)).toBe(ws);
    const [t0, t1] = ids();
    ws = W.moveTab(ws, id, t0, 2);
    expect(ids()[0]).toBe(t1);
    expect(ids()[2]).toBe(t0);
    expect(W.moveTab(ws, id, t0, 2)).toBe(ws);
  });
});

describe('Speicher v5 und Datei-Version 2', () => {
  const old = {
    panels: [{ id: 'p1', name: 'Alt', url: 'https://a.de', history: ['https://a.de'], pos: 0, home: 'https://a.de' }, { id: 'p2', name: 'Leer' }],
    layouts: { 'laptop|landscape|1': { dir: 'row', children: [{ id: 'p1' }, { id: 'p2' }], sizes: [0.5, 0.5] } },
    preferred: {},
    stackFront: {},
    lines: {},
    nextNumber: 3,
  };

  it('wandelt einen Stand v4 um: Seite und Verlauf werden zum ersten Tab', () => {
    const ws = parseWorkspace(old)!;
    expect(ws.panels[0].tabs).toHaveLength(1);
    expect(W.activeTab(ws.panels[0]).history).toEqual(['https://a.de']);
    expect(ws.panels[0].home).toBe('https://a.de');
    expect(W.panelUrl(ws.panels[1])).toBe(undefined);
    expect(ws.layouts).toEqual({}); // alte Anordnung entsteht neu
    expect(W.viewOf(ws, LAPTOP1).slots).toHaveLength(2);
  });

  it('nimmt Dateien der Version 1 an und wandelt sie um', () => {
    const file = { format: X.FILE_FORMAT, version: 1, savedAt: '2026-11-21T14:00:00Z', device: 'Mac', workspace: old };
    const r = X.readTransferFile(JSON.stringify(file));
    expect(r.ok).toBe(true);
    if (r.ok) expect(W.panelUrl(r.file.workspace.panels[0])).toBe('https://a.de');
    expect(X.FILE_VERSION).toBe(4);
  });

  it('Bereich und Szenario bleiben erhalten (F-116, vorbereitet)', () => {
    const ws = W.defaultWorkspace();
    const withAreas: Workspace = {
      ...ws,
      spheres: [{ id: 'privat', name: 'Privat' }],
      scenarios: [{ id: 'recherche', name: 'Recherche' }],
      panels: ws.panels.map((p, i) => (i === 0 ? { ...p, sphere: 'privat', scenario: 'recherche' } : p)),
    };
    const back = parseWorkspace(JSON.parse(JSON.stringify(withAreas)))!;
    expect(back).toEqual(withAreas);
    // bis V08 hieß die Sphere „area“
    const alt = JSON.parse(JSON.stringify(withAreas));
    alt.areas = alt.spheres;
    delete alt.spheres;
    alt.panels[0].area = alt.panels[0].sphere;
    delete alt.panels[0].sphere;
    expect(parseWorkspace(alt)).toEqual(withAreas);
  });

  it('gespeicherte Anordnung mit Areas bleibt beim Laden erhalten', () => {
    const ws = addN(W.defaultWorkspace(), LAPTOP1, 3);
    const back = parseWorkspace(JSON.parse(JSON.stringify(ws)))!;
    expect(back).toEqual(ws);
  });
});

describe('F-43 gesperrte Seiten', () => {
  it('erkennt bekannte Sperr-Seiten samt Subdomains, die eigene Wahl geht vor', () => {
    let ws = W.defaultWorkspace();
    expect(W.isBlocked(ws, 'https://claude.ai/new')).toBe(true);
    expect(W.isBlocked(ws, 'https://gist.github.com/x')).toBe(true);
    expect(W.isBlocked(ws, 'https://schulzenrico.github.io/')).toBe(false);
    expect(W.isBlocked(ws, 'https://www.wikipedia.org')).toBe(false);
    ws = W.setEmbed(ws, 'https://www.stepstone.de/jobs', false);
    expect(W.isBlocked(ws, 'https://stepstone.de/x')).toBe(true);
    ws = W.setEmbed(ws, 'https://claude.ai/new', true);
    expect(W.isBlocked(ws, 'https://claude.ai/chat')).toBe(false);
    expect(W.setEmbed(ws, 'kein link', true)).toBe(ws);
    expect(parseWorkspace(JSON.parse(JSON.stringify(ws)))!.embed).toEqual({ 'stepstone.de': false, 'claude.ai': true });
  });
});

describe('F-30 bis F-32 Lesezeichen', () => {
  const bm = (id: string, url: string, category = '', panels: string[] = []) => ({ id, title: '', url, category, tags: [], panels });
  const base = () => {
    let ws = W.defaultWorkspace();
    ws = B.addCategory(ws, 'doku', 'Doku');
    ws = B.addCategory(ws, 'jobs', 'Jobs');
    return ws;
  };

  it('legt an: URL ergänzt, Titel aus der Domain, Tags bereinigt, unbekannte Panels fallen weg', () => {
    const start = base();
    const p1 = start.panels[0].id;
    const ws = B.saveBookmark(start, { ...bm('a', 'www.mdn.dev/x', 'doku', [p1, 'gibtsnicht', p1]), tags: ['css', ' #CSS', 'html', ''] as string[], note: '  ' });
    expect(ws.bookmarks).toHaveLength(1);
    const b = ws.bookmarks[0];
    expect(b.url).toBe('https://www.mdn.dev/x');
    expect(b.title).toBe('mdn.dev');
    expect(b.tags).toEqual(['css', 'html']);
    expect(b.panels).toEqual([p1]);
    expect(b.note).toBe(undefined);
    expect(B.saveBookmark(start, bm('x', '  '))).toBe(start);
    expect(B.parseTags('react, Doku ,#css,react')).toEqual(['react', 'Doku', 'css']);
  });

  it('Kategorien: keine doppelten Namen, Löschen behält die Lesezeichen ohne Kategorie', () => {
    let ws = B.addCategory(base(), 'x', 'doku');
    expect(ws.categories).toHaveLength(2);
    ws = B.saveBookmark(ws, bm('a', 'a.de', 'doku'));
    expect(B.renameCategory(ws, 'doku', 'JOBS')).toBe(ws);
    ws = B.renameCategory(ws, 'doku', 'Dokumentation');
    expect(ws.categories[0].name).toBe('Dokumentation');
    ws = B.deleteCategory(ws, 'doku');
    expect(ws.categories.map((c) => c.id)).toEqual(['jobs']);
    expect(ws.bookmarks[0].category).toBe(B.NO_CATEGORY);
    expect(B.groups(ws, null).map((g) => g.category?.id ?? null)).toEqual(['jobs', null]);
    ws = B.addCategory(ws, 'z', 'Zeug');
    expect(B.moveCategory(ws, 'z', 0).categories.map((c) => c.id)).toEqual(['z', 'jobs']);
  });

  it('F-31 sortieren und in andere Kategorie ziehen, Bearbeiten behält die Stelle', () => {
    let ws = base();
    for (const id of ['a', 'b', 'c']) ws = B.saveBookmark(ws, bm(id, `${id}.de`, 'doku'));
    ws = B.saveBookmark(ws, bm('j', 'j.de', 'jobs'));
    ws = B.moveBookmark(ws, 'c', 0);
    expect(B.groups(ws, null)[0].items.map((b) => b.id)).toEqual(['c', 'a', 'b']);
    ws = B.moveBookmark(ws, 'c', 9);
    expect(B.groups(ws, null)[0].items.map((b) => b.id)).toEqual(['a', 'b', 'c']);
    ws = B.moveBookmark(ws, 'a', 0, 'jobs');
    expect(B.groups(ws, null)[1].items.map((b) => b.id)).toEqual(['a', 'j']);
    ws = B.saveBookmark(ws, { ...ws.bookmarks.find((b) => b.id === 'a')!, title: 'Neu' });
    expect(B.groups(ws, null)[1].items.map((b) => b.title)).toEqual(['Neu', 'j.de']);
    ws = B.saveBookmark(ws, { ...ws.bookmarks.find((b) => b.id === 'a')!, category: 'doku' });
    expect(B.groups(ws, null)[0].items.map((b) => b.id)).toEqual(['b', 'c', 'a']);
    expect(B.deleteBookmark(ws, 'a').bookmarks).toHaveLength(3);
    // Ziehen auf ein anderes Lesezeichen: nach unten dahinter, nach oben davor, fremde Kategorie davor
    expect(B.groups(B.dropBookmark(ws, 'b', 'c'), null)[0].items.map((b) => b.id)).toEqual(['c', 'b', 'a']);
    expect(B.groups(B.dropBookmark(ws, 'a', 'b'), null)[0].items.map((b) => b.id)).toEqual(['a', 'b', 'c']);
    const moved = B.dropBookmark(ws, 'j', 'c');
    expect(B.groups(moved, null)[0].items.map((b) => b.id)).toEqual(['b', 'j', 'c', 'a']);
  });

  it('F-32 Sammlung je Panel, Suche über Titel, URL, Kategorie und Tags', () => {
    let ws = base();
    const [p1, p2] = ws.panels.map((p) => p.id);
    ws = B.saveBookmark(ws, { ...bm('a', 'react.dev', 'doku', [p1]), title: 'React', tags: ['js'] });
    ws = B.saveBookmark(ws, bm('b', 'stepstone.de', 'jobs', [p1, p2]));
    ws = B.saveBookmark(ws, bm('c', 'lose.de', '', []));
    expect(B.collectionSize(ws, p1)).toBe(2);
    expect(B.groups(ws, p2).map((g) => g.items.map((b) => b.id))).toEqual([['b']]);
    expect(B.groups(ws, null, 'jobs').map((g) => g.items.map((b) => b.id))).toEqual([['b']]);
    expect(B.groups(ws, null, '#js').map((g) => g.items.map((b) => b.id))).toEqual([['a']]);
    expect(B.groups(ws, null, 'doku react').map((g) => g.items.map((b) => b.id))).toEqual([['a']]);
    ws = B.toggleBookmarkPanel(ws, 'c', p2);
    expect(B.collectionSize(ws, p2)).toBe(2);
    ws = W.removePanel(ws, p1);
    expect(ws.bookmarks.map((b) => b.panels)).toEqual([[], [p2], [p2]]);
    expect(B.bookmarkOf(ws, 'https://react.dev/')?.id).toBe('a');
  });

  it('F-21 öffnet als Tab: leerer Tab zuerst, offene Seite wird angesprungen, Grenze TAB_MAX', () => {
    let ws = W.defaultWorkspace();
    const p = ws.panels[0].id;
    let r = B.openBookmark(ws, p, 'https://a.de');
    expect(r.result).toBe('here');
    ws = r.ws;
    r = B.openBookmark(ws, p, 'https://b.de');
    expect(r.result).toBe('tab');
    ws = r.ws;
    expect(ws.panels[0].tabs).toHaveLength(2);
    r = B.openBookmark(ws, p, 'a.de/');
    expect(r.result).toBe('switched');
    expect(W.panelUrl(r.ws.panels[0])).toBe('https://a.de');
    for (let i = 0; i < 10; i++) ws = W.addTab(ws, p, `https://x${i}.de`);
    expect(B.openBookmark(ws, p, 'https://neu.de').result).toBe('full');
  });

  it('Speicher v6: Lesezeichen bleiben erhalten, kaputte Einträge fallen weg, v5 bekommt eine leere Sammlung', () => {
    let ws = base();
    ws = B.saveBookmark(ws, { ...bm('a', 'a.de', 'doku', [ws.panels[0].id]), note: 'Notiz' });
    expect(parseWorkspace(JSON.parse(JSON.stringify(ws)))).toEqual(ws);
    const raw = JSON.parse(JSON.stringify(ws));
    raw.bookmarks.push({ id: 'kaputt' }, { id: 'z', url: 'z.de', category: 'weg', panels: ['weg'] });
    const back = parseWorkspace(raw)!;
    expect(back.bookmarks.map((b) => b.id)).toEqual(['a', 'z']);
    expect(back.bookmarks[1].category).toBe('');
    expect(back.bookmarks[1].panels).toEqual([]);
    const v5 = JSON.parse(JSON.stringify(W.defaultWorkspace()));
    delete v5.bookmarks;
    delete v5.categories;
    const up = parseWorkspace(v5)!;
    expect(up.bookmarks).toEqual([]);
    expect(up.categories).toEqual([]);
  });
});

describe('F-15, F-125 Lineal', () => {
  it('Knopf für alle schaltet alle, einzelne Panels lassen sich zusätzlich schalten', () => {
    let ws = W.defaultWorkspace();
    const [a, b] = ws.panels;
    expect(W.rulerShown(ws, a)).toBe(false);
    ws = W.toggleRulerPanel(ws, a.id);
    expect(W.rulerShown(ws, ws.panels[0])).toBe(true);
    expect(W.rulerShown(ws, ws.panels[1])).toBe(false);
    ws = W.toggleRulerAll(ws);
    expect(ws.panels.every((p) => W.rulerShown(ws, p))).toBe(true);
    expect(ws.panels[0].ruler).toBe(undefined); // Wahl am Panel aufgehoben
    ws = W.toggleRulerPanel(ws, b.id);
    expect(W.rulerShown(ws, ws.panels[1])).toBe(false);
    ws = W.toggleRulerPanel(ws, b.id);
    expect(ws.panels[1].ruler).toBe(undefined); // wieder wie „alle“
    ws = W.setRulerStyle(ws, { color: -1, labels: false });
    expect(ws.ruler).toEqual({ on: true, labels: false, color: W.RULER_COLORS.length - 1 });
    expect(W.setRulerStyle(ws, { color: W.RULER_COLORS.length }).ruler.color).toBe(0);
  });

  it('bleibt beim Speichern erhalten; ältere Stände bekommen das Lineal aus', () => {
    let ws = W.toggleRulerPanel(W.setRulerStyle(W.defaultWorkspace(), { color: 3 }), W.defaultWorkspace().panels[0].id);
    ws = W.toggleRulerPanel(ws, ws.panels[1].id);
    expect(parseWorkspace(JSON.parse(JSON.stringify(ws)))).toEqual(ws);
    const old = JSON.parse(JSON.stringify(W.defaultWorkspace()));
    delete old.ruler;
    expect(parseWorkspace(old)!.ruler).toEqual(W.RULER_DEFAULT);
  });
});

describe('F-128 Area', () => {
  const slotWith = (ws: Workspace, setup: ScreenSetup, id: string) => W.viewOf(ws, setup).slots.find((s) => s.panels.some((m) => m.id === id))!;

  it('ein einzelnes Panel hat keinen Area-Namen, ein neuer Stapel heißt „NewArea 1“, der nächste „NewArea 2“', () => {
    let ws = W.defaultWorkspace();
    const [a, b] = ws.panels.map((p) => p.id);
    expect(W.areaLabel(ws, slotWith(ws, MONITOR2, a))).toBe('');
    ws = W.addPanel(ws, MONITOR2, P(ws, MONITOR2, a));
    expect(W.areaLabel(ws, slotWith(ws, MONITOR2, a))).toBe('Slot 1');
    ws = W.addPanel(ws, MONITOR2, P(ws, MONITOR2, b));
    expect(W.areaLabel(ws, slotWith(ws, MONITOR2, b))).toBe('Slot 2');
    // weiteres Panel auf den ersten Stapel: Name bleibt, keine neue Nummer
    ws = W.addPanel(ws, MONITOR2, P(ws, MONITOR2, a));
    expect(W.areaLabel(ws, slotWith(ws, MONITOR2, a))).toBe('Slot 1');
    expect(ws.areaNames).toHaveLength(2);
    expect(ws.nextArea).toBe(3);
  });

  it('umbenennen gilt in allen Bildschirm-Einstellungen; leerer Name ändert nichts', () => {
    let ws = W.defaultWorkspace();
    const a = ws.panels[0].id;
    ws = W.addPanel(ws, MONITOR2, P(ws, MONITOR2, a));
    const added = ws.panels[3].id;
    ws = W.renameArea(ws, MONITOR2, P(ws, MONITOR2, a), '  Jobs  ');
    expect(W.areaLabel(ws, slotWith(ws, MONITOR2, a))).toBe('Jobs');
    expect(W.renameArea(ws, MONITOR2, P(ws, MONITOR2, a), '   ')).toBe(ws);
    // Auf dem Handy liegen alle Panels in einem Stapel: der Name gilt dort auch
    ws = W.setStackFront(ws, PHONE, added);
    expect(W.areaLabel(ws, slotWith(ws, PHONE, a))).toBe('Jobs');
  });

  it('kleinerer Bildschirm: ensureAreaNames benennt den Stapel, überschreibt aber keine vorhandenen Namen', () => {
    let ws = W.defaultWorkspace();
    expect(W.areaLabel(ws, slotWith(ws, PHONE, ws.panels[0].id))).toBe('');
    ws = W.ensureAreaNames(ws, PHONE);
    expect(W.areaLabel(ws, slotWith(ws, PHONE, ws.panels[0].id))).toBe('Slot 1');
    expect(W.ensureAreaNames(ws, PHONE)).toBe(ws);

    let ws2 = W.defaultWorkspace();
    const [a, b] = ws2.panels.map((p) => p.id);
    ws2 = W.addPanel(ws2, MONITOR2, P(ws2, MONITOR2, a));
    ws2 = W.renameArea(ws2, MONITOR2, P(ws2, MONITOR2, a), 'Jobs');
    ws2 = W.ensureAreaNames(ws2, PHONE); // alle 4 Panels in einem Stapel
    expect(ws2.panels.find((p) => p.id === a)!.areaName).toBe(ws2.panels.find((p) => p.id === b)!.areaName);
    expect(ws2.areaNames.map((n) => n.name)).toEqual(['Jobs']);
  });

  it('Name überlebt Tauschen; schließt man alle Panels einer Area, entfällt ihr Name', () => {
    let ws = W.defaultWorkspace();
    const [a, , c] = ws.panels.map((p) => p.id);
    ws = W.addPanel(ws, MONITOR2, P(ws, MONITOR2, a));
    const d = ws.panels[3].id;
    ws = W.renameArea(ws, MONITOR2, P(ws, MONITOR2, a), 'Jobs');
    const stackId = P(ws, MONITOR2, a);
    ws = W.swapPanels(ws, MONITOR2, d, c); // c kommt sichtbar in den Stapel
    const s = W.viewOf(ws, MONITOR2).slots.find((x) => x.id === stackId)!;
    expect(s.front.id).toBe(c);
    expect(W.areaLabel(ws, s)).toBe('Jobs');
    ws = W.removePanel(W.removePanel(ws, a), d);
    expect(ws.areaNames).toEqual([]);
  });

  it('Speicher v7: Namen bleiben erhalten; Stände bis v6 mit „places“ werden übernommen', () => {
    let ws = W.defaultWorkspace();
    ws = W.addPanel(ws, MONITOR2, P(ws, MONITOR2, ws.panels[0].id));
    ws = W.renameArea(ws, MONITOR2, P(ws, MONITOR2, ws.panels[0].id), 'Jobs');
    expect(parseWorkspace(JSON.parse(JSON.stringify(ws)))).toEqual(ws);
    const old = JSON.parse(JSON.stringify(ws));
    for (const arr of Object.values(old.layouts) as Record<string, unknown>[]) {
      arr.places = arr.areas;
      delete arr.areas;
    }
    delete old.areaNames;
    delete old.nextArea;
    const back = parseWorkspace(old)!;
    expect(back.layouts).toEqual(ws.layouts);
    expect(back.areaNames).toEqual([]);
    expect(back.panels.every((p) => p.areaName === undefined)).toBe(true);
    expect(back.nextArea).toBe(1);
  });
});

describe('F-60, F-61, F-69, F-130 Darstellung', () => {
  it('Standard: wie System mit Portfolio-Rot (F-161); Chakren-Farben und Windows-Blau stehen zur Wahl', () => {
    const ws = W.defaultWorkspace();
    expect(ws.look).toEqual({ theme: 'system', accent: '#e4522c' });
    expect(L.ACCENTS.map((a) => a.hex)).toContain('#64a970');
    expect(L.ACCENTS.map((a) => a.hex)).toContain('#0a246a');
    expect(L.THEMES.slice(0, 3).map((t) => t.id)).toEqual(['dark', 'light', 'system']);
    expect(L.THEMES.filter((t) => t.group === 'Modern')).toHaveLength(3);
    expect(new Set(L.THEMES.map((t) => t.id)).size).toBe(L.THEMES.length);
    // F-175/F-176: jedes Retro-Design hat eine eigene Akzentfarbe, die dort gut lesbar ist
    for (const t of L.THEMES.filter((x) => x.group === 'Retro')) {
      const a = L.ACCENTS.find((x) => x.theme === t.id);
      expect(!!a && L.contrastWarning(a.hex, t.id as L.Shown) === null ? t.id : `${t.id}: ${a?.hex}`).toBe(t.id);
    }
  });

  it('„wie System“ folgt dem Gerät, die übrigen bleiben', () => {
    expect(L.resolveTheme('system', true)).toBe('dark');
    expect(L.resolveTheme('system', false)).toBe('light');
    expect(L.resolveTheme('win2000', true)).toBe('win2000');
  });

  it('setLook nimmt nur gültige Farben an und ändert ohne Unterschied nichts', () => {
    let ws = W.defaultWorkspace();
    ws = L.setLook(ws, { theme: 'win2000', accent: '#0A246A' });
    expect(ws.look).toEqual({ theme: 'win2000', accent: '#0a246a' });
    expect(L.setLook(ws, { accent: 'rot' })).toBe(ws);
    expect(L.setLook(ws, { theme: 'win2000' })).toBe(ws);
  });

  it('Kontrast: Schwarz/Weiß 21 : 1; Warnung nur bei schwacher Farbe', () => {
    expect(Math.round(L.contrast('#000000', '#ffffff'))).toBe(21);
    expect(L.contrastWarning('#e4522c', 'dark')).toBe(null);
    expect(L.contrastWarning('#0a246a', 'dark') !== null).toBe(true);
    expect(L.contrastWarning('#0a246a', 'win2000')).toBe(null);
    expect(L.contrastWarning('#0054e3', 'winxp')).toBe(null);
    // F-175: eigene Akzentfarben der Apple-Designs sind gut lesbar
    expect(L.contrastWarning('#3e3e94', 'macos9')).toBe(null);
    expect(L.contrastWarning('#1a5fd0', 'aqua')).toBe(null);
    expect(L.resolveTheme('aqua', true)).toBe('aqua');
    // F-178: dunkle Akzentfarbe + Terminal → Terminal-Grün kommt mit; lesbare Farbe bleibt
    expect(L.pickLook({ theme: 'system7', accent: '#000000' }, { theme: 'terminal' }, false)).toEqual({ theme: 'terminal', accent: '#33ff66' });
    expect(L.pickLook({ theme: 'dark', accent: '#ffb000' }, { theme: 'terminal' }, false)).toEqual({ theme: 'terminal' });
    expect(L.shownAccent('#000000', 'terminal')).toBe('#33ff66');
    expect(L.shownAccent('#000000', 'system7')).toBe('#000000');
    // Blautöne leuchten aufgehellt hell genug und bleiben blau
    for (const hex of ['#0054e3', '#0a246a', '#1a5fd0', '#7f8fd0']) expect(L.shownAccent(hex, 'terminal')).toBe(hex);
    expect(L.phosphor('#000000')).toBe('#666666');
  });

  it('Darstellung bleibt beim Speichern erhalten; Unbekanntes fällt auf die Voreinstellung', () => {
    const ws = L.setLook(W.defaultWorkspace(), { theme: 'light', accent: '#66afe1' });
    expect(parseWorkspace(JSON.parse(JSON.stringify(ws)))!.look).toEqual({ theme: 'light', accent: '#66afe1' });
    const bad = JSON.parse(JSON.stringify(ws));
    bad.look = { theme: 'neon', accent: 'blau' };
    expect(parseWorkspace(bad)!.look).toEqual(L.LOOK_DEFAULT);
    delete bad.look;
    expect(parseWorkspace(bad)!.look).toEqual(L.LOOK_DEFAULT);
  });
});

describe('F-133 Demo-Startbelegung', () => {
  it('vier Panels, leer gestartet (F-150), mit eigener Lesezeichen-Sammlung einbettbarer Seiten', () => {
    const ws = D.demoWorkspace();
    expect(ws.panels).toHaveLength(5);
    expect(W.viewOf(ws, LAPTOP2).slots).toHaveLength(4);
    const ids = new Set(ws.panels.map((p) => p.id));
    const cats = new Set(ws.categories.map((c) => c.id));
    for (const p of ws.panels) {
      expect(p.tabs.length === 1 && !p.tabs[0].url && !p.home).toBe(true);
      expect(p.tabs.some((t) => t.id === p.activeTab)).toBe(true);
      expect(B.collectionSize(ws, p.id) > 0).toBe(true);
    }
    expect(ws.bookmarks.every((b) => cats.has(b.category) && b.panels.every((id) => ids.has(id)) && !W.isBlocked(ws, b.url))).toBe(true);
  });

  it('Stapel „Bewerbung“ in jeder Bildschirm-Einstellung; Lineal beim Portfolio an', () => {
    const ws = D.demoWorkspace();
    const [portfolio, kontakt, zertifikate] = ws.panels;
    expect(W.rulerShown(ws, portfolio)).toBe(true);
    expect(W.rulerShown(ws, kontakt)).toBe(false);
    for (const setup of [LAPTOP1, LAPTOP2, MONITOR2, MONITOR_HOCH, TABLET]) {
      const stack = W.viewOf(ws, setup).slots.find((s) => s.panels.some((p) => p.id === kontakt.id))!;
      expect(stack.panels.some((p) => p.id === zertifikate.id)).toBe(true);
      expect(W.areaLabel(ws, stack)).toBe('Bewerbung');
    }
  });

  it('übersteht Speichern und Laden unverändert', () => {
    const ws = D.demoWorkspace();
    expect(parseWorkspace(JSON.parse(JSON.stringify(ws)))).toEqual(ws);
  });
});

describe('F-134 + Area', () => {
  it('neue Spalte rechts über die ganze Höhe, neue Zeile unten über die ganze Breite', () => {
    const ws = W.defaultWorkspace();
    const before = W.viewOf(ws, LAPTOP2).slots.length;
    const col = W.addArea(ws, LAPTOP2, 'right');
    const vc = W.viewOf(col, LAPTOP2);
    expect(vc.slots).toHaveLength(before + 1);
    const c = vc.slots.find((s) => s.front.id === col.panels[col.panels.length - 1].id)!;
    expect(close(c.rect.h, 1) && close(c.rect.x + c.rect.w, 1)).toBe(true);
    const row = W.addArea(ws, LAPTOP2, 'bottom');
    const r = W.viewOf(row, LAPTOP2).slots.find((s) => s.front.id === row.panels[row.panels.length - 1].id)!;
    expect(close(r.rect.w, 1) && close(r.rect.y + r.rect.h, 1)).toBe(true);
  });

  it('voller Bildschirm: keine neue Area, nichts wird gestapelt', () => {
    let ws = W.defaultWorkspace();
    while (W.canAddArea(ws, TABLET)) ws = W.addArea(ws, TABLET, 'right');
    expect(W.viewOf(ws, TABLET).slots).toHaveLength(2);
    expect(W.addArea(ws, TABLET, 'bottom')).toBe(ws);
  });
});


describe('F-34 zentrales Suchfeld', () => {
  const make = () => {
    let ws = W.addArea(W.defaultWorkspace(), LAPTOP2, 'right');
    ws = B.addCategory(ws, 'doku', 'Doku');
    const [p1, p2] = ws.panels.map((p) => p.id);
    ws = {
      ...ws,
      bookmarks: [
        { id: 'a', title: 'MDN CSS', url: 'https://developer.mozilla.org/css', category: 'doku', tags: ['web'], panels: [p1, p2] },
        { id: 'b', title: 'Hafen', url: 'https://de.wikipedia.org/wiki/Hamburger_Hafen', category: '', tags: ['hamburg'], panels: [] },
        { id: 'c', title: 'Karte', url: 'https://www.openstreetmap.org/#css', category: '', tags: [], panels: [p2] },
      ],
    };
    return { ws, p1, p2 };
  };

  it('leere Suche ergibt nichts', () => {
    const { ws } = make();
    expect(B.searchAll(ws, '   ')).toHaveLength(0);
    expect(B.searchAll(ws, '#')).toHaveLength(0);
  });

  it('ein Treffer je Panel, mit Kategorie; ohne Panel = Gesamtsammlung', () => {
    const { ws, p1, p2 } = make();
    const css = B.searchAll(ws, 'mdn');
    expect(css.map((h) => h.panel?.id)).toEqual([p1, p2]);
    expect(css[0].category).toBe('Doku');
    const hafen = B.searchAll(ws, '#Hamburg');
    expect(hafen).toHaveLength(1);
    expect(hafen[0].panel).toBe(null);
    expect(hafen[0].category).toBe('');
  });

  it('Treffer im Titel stehen vorn, Kategorie wird mit durchsucht, Höchstzahl gilt', () => {
    const { ws } = make();
    expect(B.searchAll(ws, 'css').map((h) => h.bookmark.id)).toEqual(['a', 'a', 'c']);
    expect(B.searchAll(ws, 'doku').map((h) => h.bookmark.id)).toEqual(['a', 'a']);
    expect(B.searchAll(ws, 'css', 2)).toHaveLength(2);
  });
});

describe('F-141 Suche nach Panels', () => {
  it('findet Panels über Name, Area, Szenario und Tab-Adresse; Namenstreffer zuerst', () => {
    let ws = W.addArea(W.defaultWorkspace(), LAPTOP2, 'right');
    const [p1, p2] = ws.panels;
    ws = {
      ...ws,
      scenarios: [{ id: 's1', name: 'Bewerbung' }],
      panels: ws.panels.map((p) =>
        p.id === p1.id ? { ...p, name: 'Wissen', scenario: 's1' } : p.id === p2.id ? { ...p, name: 'Video', tabs: [{ id: 't', url: 'https://wissen.de/' }], activeTab: 't' } : p,
      ),
    };
    const w = B.searchPanels(ws, 'wissen');
    expect(w.map((h) => h.panel.id)).toEqual([p1.id, p2.id]);
    expect(w[0].tabs).toHaveLength(0);
    expect(w[1].tabs.map((t) => t.id)).toEqual(['t']);
    const s = B.searchPanels(ws, 'bewerbung');
    expect(s).toHaveLength(1);
    expect(s[0].scenario).toBe('Bewerbung');
    expect(B.searchPanels(ws, '  ')).toHaveLength(0);
  });
});

describe('F-135 Blättern in eingebetteten Seiten', () => {
  it('erstes Laden zählt nicht; Zurück nur für das iframe, das zuletzt geblättert hat', () => {
    FH.reset();
    FH.loaded('a');
    FH.loaded('b');
    expect(FH.canBack('a')).toBe(false);
    FH.loaded('a'); // Link in a
    FH.loaded('b'); // Link in b
    expect(FH.canBack('b')).toBe(true);
    expect(FH.canBack('a')).toBe(false);
    expect(FH.hasSteps('a')).toBe(true);
  });

  it('neuer Schritt verwirft Vor; vergessene iframes fallen heraus', () => {
    FH.reset();
    FH.loaded('a');
    FH.loaded('a');
    FH.loaded('a');
    FH.forget(['a']);
    expect(FH.canBack('a')).toBe(false);
    expect(FH.hasSteps('a')).toBe(false);
  });
});

describe('F-144, F-145 Kategorien sortieren, Beispiel-Lesezeichen', () => {
  it('Beispiele: Kategorien nach Namen wiederverwendet, keine doppelten Adressen, an keinem Panel', () => {
    let n = 0;
    const id = () => `x${n++}`;
    let ws = B.addCategory(W.defaultWorkspace(), 'h', 'hamburg');
    ws = { ...ws, bookmarks: [{ id: 'm', title: 'MDN', url: 'https://developer.mozilla.org/de/', category: '', tags: [], panels: [] }] };
    const r = B.addSamples(ws, id);
    const total = B.SAMPLES.reduce((s, g) => s + g.links.length, 0);
    expect(r.added).toBe(total - 1);
    expect(r.ws.categories.filter((c) => c.name.toLowerCase() === 'hamburg')).toHaveLength(1);
    expect(r.ws.bookmarks.every((b) => b.panels.length === 0)).toBe(true);
    expect(B.addSamples(r.ws, id).added).toBe(0);
  });

  it('Kategorie verschieben ändert die Reihenfolge, Grenzen bleiben', () => {
    let ws = W.defaultWorkspace();
    for (const c of ['a', 'b', 'c']) ws = B.addCategory(ws, c, c.toUpperCase());
    expect(B.moveCategory(ws, 'c', 0).categories.map((c) => c.id)).toEqual(['c', 'a', 'b']);
    expect(B.moveCategory(ws, 'a', 9).categories.map((c) => c.id)).toEqual(['b', 'c', 'a']);
    expect(B.moveCategory(ws, 'a', -3)).toBe(ws);
  });

  it('Demo enthält die Beispiele', () => {
    const d = D.demoWorkspace();
    expect(d.categories.some((c) => c.name === 'Werkzeuge')).toBe(true);
  });
});

describe('F-28/F-29 Gesamtfokus und Übersicht', () => {
  it('Pegel folgt der Voreinstellung', () => {
    expect([0, 1, 2, 4, 10, 11, 14, 15, 18, 19, 22, 23].map((p) => F.focusLevel(p))).toEqual([0, 1, 2, 3, 6, 6, 7, 7, 8, 8, 9, 9]);
    expect(F.colorOfLevel(5)).toBe('grün');
    expect(F.colorOfLevel(9)).toBe('rot');
  });

  it('Panels zählen 1, weitere Tabs je ½', () => {
    let ws = addN(W.defaultWorkspace(), LAPTOP2, 1);
    const id = ws.panels[0].id;
    ws = W.addTab(W.addTab(ws, id), id);
    const f = F.focusOf(ws);
    expect(f.panels).toBe(ws.panels.length);
    expect(f.extraTabs).toBe(2);
    expect(f.points).toBe(ws.panels.length + 1);
    expect(F.focusText(f)).toContain('2 weitere Tabs');
    expect(F.focusText(F.focusOf({ ...ws, panels: [] }))).toBe('Fokusanzeige: nichts offen');
  });

  it('Übersicht listet jede Area mit ihren Panels', () => {
    const ws = addN(W.defaultWorkspace(), LAPTOP2, 1);
    const v = W.viewOf(ws, LAPTOP2);
    const o = F.overviewOf(ws, v.slots);
    expect(o).toHaveLength(v.slots.length);
    expect(o.flatMap((a) => a.panels).length).toBe(ws.panels.length);
    expect(o[0].panels.filter((p) => p.front)).toHaveLength(1);
    expect(o[0].title.length > 0).toBe(true);
  });
});

describe('F-27 Panels herauslösen (Fenster)', () => {
  const W2: ScreenSetup = { ...MONITOR2, win: 'w2' };
  /** Arbeitsfläche, deren erstes Panel in Fenster `win` liegt. */
  const firstIn = (win: string) => {
    const ws = W.defaultWorkspace();
    return Win.moveToWindow(ws, [ws.panels[0].id], win);
  };

  it('Fenster-Id aus der Adresse und Adresse eines Fensters', () => {
    expect(Win.winFromSearch('?win=w2')).toBe('w2');
    expect(Win.winFromSearch('')).toBe('');
    expect(Win.winFromSearch('?win=<b>')).toBe('');
    expect(Win.windowUrl('https://x.de/app/?a=1#h', 'w2')).toBe('https://x.de/app/?a=1&win=w2');
    expect(Win.windowUrl('https://x.de/app/?win=w2', '')).toBe('https://x.de/app/');
  });

  it('Anordnung je Fenster: eigener Schlüssel, der sich zurücklesen lässt', () => {
    expect(layoutKey(W2)).toBe('w2/monitor:landscape:2');
    expect(layoutKey(MONITOR2)).toBe('monitor:landscape:2');
    expect(parseLayoutKey('w2/monitor:landscape:2')).toEqual(W2);
    expect(parseLayoutKey('monitor:landscape:2')).toEqual(MONITOR2);
  });

  it('Panel wandert in ein neues Fenster und verschwindet aus dem Hauptfenster', () => {
    const ws = W.defaultWorkspace();
    const id = ws.panels[0].id;
    const next = Win.moveToWindow(ws, [id], 'w2');
    expect(next.windows).toEqual([{ id: 'w2', name: 'Desk 2' }]);
    expect(W.viewOf(next, MONITOR2).slots.flatMap((s) => s.panels.map((p) => p.id))).not.toContain(id);
    expect(W.viewOf(next, W2).slots.flatMap((s) => s.panels.map((p) => p.id))).toEqual([id]);
    // Gesamtfokus zählt alle Fenster
    expect(F.focusOf(next).panels).toBe(3);
  });

  it('Zurückholen leert das Fenster, die Liste räumt sich auf', () => {
    const ws = firstIn('x');
    const moved = ws.panels.find((p) => p.win === 'x')!;
    const back = Win.returnAll(ws, 'x');
    expect(back.windows).toHaveLength(0);
    expect(back.panels.find((p) => p.id === moved.id)!.win).toBe(undefined);
  });

  it('Nummern: zweites Fenster heißt „Fenster 3“, frei gewordene Nummer wird wieder vergeben', () => {
    let ws = W.defaultWorkspace();
    const [a, b] = ws.panels;
    ws = Win.moveToWindow(ws, [a.id], 'x');
    ws = Win.moveToWindow(ws, [b.id], 'y');
    expect(ws.windows.map((w) => w.name)).toEqual(['Desk 2', 'Desk 3']);
    ws = Win.returnAll(ws, 'x');
    expect(Win.nextWindowName(ws.windows)).toBe('Desk 2');
  });

  it('F-160: gesammelte Desks, Ring und Schritt für Alt/⌥+K', () => {
    let ws = W.defaultWorkspace();
    const [a, b] = ws.panels;
    ws = Win.moveToWindow(ws, [a.id], 'x');
    ws = Win.moveToWindow(ws, [b.id], 'y');
    // Desk 3 (y) hat ein eigenes Fenster, Desk 2 (x) nicht
    const open = new Set(['', 'y']);
    expect(Win.collectedDesks(ws, '', open).map((d) => d.id)).toEqual(['x']);
    const ring = Win.deskRing(ws, '', open);
    expect(ring.map((d) => d.id)).toEqual(['', 'x']);
    expect(Win.stepDesk(ring, '', 1)?.id).toBe('x');
    expect(Win.stepDesk(ring, 'x', 1)?.id).toBe('');
    expect(Win.stepDesk(ring, '', -1)?.id).toBe('x');
    // alles gesammelt: Ring über alle drei, rückwärts vom Main Desk zum letzten
    const all = Win.deskRing(ws, '', new Set(['']));
    expect(all.map((d) => d.id)).toEqual(['', 'x', 'y']);
    expect(Win.stepDesk(all, '', -1)?.id).toBe('y');
    expect(Win.stepDesk(Win.deskRing(ws, '', new Set(['', 'x', 'y'])), '', 1)).toBe(null);
  });

  it('F-160: Ansage beim Desk-Wechsel', () => {
    expect(Win.deskSaid('Desk 2', 1, 3, 4)).toBe('Desk 2 · 2 von 3 hier · 4 Portale');
    expect(Win.deskSaid('Main Desk', 0, 1, 1)).toBe('Main Desk · 1 Portal');
  });

  it('Neues Panel in einem Zusatzfenster gehört zu diesem Fenster', () => {
    let ws = firstIn('w2');
    ws = reducer(ws, { type: 'add', setup: W2 });
    const added = ws.panels[ws.panels.length - 1];
    expect(added.win).toBe('w2');
    expect(W.viewOf(ws, W2).slots.flatMap((s) => s.panels)).toHaveLength(2);
  });

  it('Leeres Fenster mit neuem Panel bekommt seinen Eintrag zurück', () => {
    let ws = W.defaultWorkspace();
    ws = reducer(ws, { type: 'addArea', setup: { ...LAPTOP1, win: 'z' }, side: 'right' });
    expect(ws.windows.map((w) => w.id)).toEqual(['z']);
  });

  it('Gespeicherter Stand: Fenster bleiben, Panels in unbekannten Fenstern gehen ins Hauptfenster', () => {
    const ws = firstIn('w2');
    const again = parseWorkspace(JSON.parse(JSON.stringify(ws)))!;
    expect(again.windows).toEqual(ws.windows);
    expect(again.panels.filter((p) => p.win === 'w2')).toHaveLength(1);
    const broken = parseWorkspace({ ...JSON.parse(JSON.stringify(ws)), windows: [] })!;
    expect(broken.panels.filter((p) => p.win)).toHaveLength(0);
  });

  it('Übersicht zeigt andere Fenster als eigene Karten mit Zustand', () => {
    const ws = firstIn('w2');
    const o = F.overviewOf(ws, W.viewOf(ws, MONITOR2).slots, '', new Set(['', 'w2']));
    const other = o.filter((a) => a.other);
    expect(other).toHaveLength(1);
    expect(other[0].title).toBe('Desk 2');
    expect(other[0].open).toBe(true);
    const fromW2 = F.overviewOf(ws, W.viewOf(ws, W2).slots, 'w2', new Set(['w2']));
    expect(fromW2.filter((a) => a.other).map((a) => a.title)).toEqual(['Main Desk']);
    expect(fromW2.filter((a) => a.other)[0].open).toBe(false);
  });
});

describe('F-28 Verschieben und Gruppieren', () => {
  const W2: ScreenSetup = { ...MONITOR2, win: 'w2' };
  const ids = (ws: Workspace, s: ScreenSetup) => W.viewOf(ws, s).slots.map((x) => x.panels.map((p) => p.id));
  /** Drei Panels, jedes auf eigener Area. */
  const three = () => {
    const ws = W.defaultWorkspace();
    return { ws, a: ws.panels[0].id, b: ws.panels[1].id, c: ws.panels[2].id };
  };
  const areaOfId = (ws: Workspace, s: ScreenSetup, id: string) => W.areaOf(W.viewOf(ws, s), id)!;

  it('Panel auf eine andere Area legen: Stapel entsteht, verschobenes Panel vorn, mit Namen', () => {
    const { ws, a, b } = three();
    const next = W.placePanels(ws, MONITOR2, [a], areaOfId(ws, MONITOR2, b));
    const slots = W.viewOf(next, MONITOR2).slots;
    expect(slots).toHaveLength(2);
    const stack = slots.find((s) => s.panels.length === 2)!;
    expect(stack.panels.map((p) => p.id)).toEqual([b, a]);
    expect(stack.front.id).toBe(a);
    expect(W.areaLabel(next, stack)).toBe('Slot 1');
  });

  it('Aus dem Stapel lösen: eigene Area; allein liegend geht es nicht', () => {
    const { ws, a, b } = three();
    const stacked = W.placePanels(ws, MONITOR2, [a], areaOfId(ws, MONITOR2, b));
    const freed = W.placePanels(stacked, MONITOR2, [a], W.NEW_AREA);
    expect(ids(freed, MONITOR2).every((g) => g.length === 1)).toBe(true);
    expect(ids(freed, MONITOR2)).toHaveLength(3);
    expect(W.placePanels(ws, MONITOR2, [a], W.NEW_AREA)).toBe(ws);
    // Ohne Stapel kein Area-Name
    expect(W.viewOf(freed, MONITOR2).slots.map((s) => W.areaLabel(freed, s))).toEqual(['', '', '']);
  });

  it('Einzelnes Ziel mit altem Namen einer anderen Area: neuer Stapel bekommt eigenen Namen', () => {
    let { ws, a, b, c } = three();
    ws = W.placePanels(ws, MONITOR2, [a], areaOfId(ws, MONITOR2, b));
    ws = W.renameArea(ws, MONITOR2, areaOfId(ws, MONITOR2, a), 'Recherche');
    const rid = ws.panels.find((p) => p.id === a)!.areaName!;
    // c liegt allein, trägt aber noch den Namen „Recherche“ (z. B. aus einer anderen Einstellung)
    ws = { ...ws, panels: ws.panels.map((p) => (p.id === c ? { ...p, areaName: rid } : p)) };
    ws = W.addPanel(ws, MONITOR2, areaOfId(ws, MONITOR2, a));
    const d = ws.panels.find((p) => ![a, b, c].includes(p.id))!.id;
    const next = W.placePanels(ws, MONITOR2, [d], areaOfId(ws, MONITOR2, c));
    const labels = W.viewOf(next, MONITOR2).slots.map((s) => W.areaLabel(next, s)).sort();
    expect(labels).toEqual(['Recherche', 'Slot 2']);
  });

  it('Eigene Area nur, solange der Bildschirm Platz hat', () => {
    const { ws, a, b } = three();
    // Smartphone: eine Area, alle im Stapel
    expect(W.placePanels(ws, PHONE, [a], W.NEW_AREA)).toBe(ws);
    expect(W.placePanels(ws, PHONE, [b], 'unbekannt')).toBe(ws);
  });

  it('Ganze Area auf eine andere legen: Namen der Gruppe bleibt, höchstens 9 je Stapel', () => {
    let { ws, a, b, c } = three();
    ws = W.placePanels(ws, MONITOR2, [a], areaOfId(ws, MONITOR2, b));
    ws = W.renameArea(ws, MONITOR2, areaOfId(ws, MONITOR2, a), 'Recherche');
    const group = W.viewOf(ws, MONITOR2).slots.find((s) => s.panels.length === 2)!.panels.map((p) => p.id);
    const merged = W.placePanels(ws, MONITOR2, group, areaOfId(ws, MONITOR2, c));
    const slots = W.viewOf(merged, MONITOR2).slots;
    expect(slots).toHaveLength(1);
    expect(slots[0].panels.map((p) => p.id)).toEqual([c, ...group]);
    expect(W.areaLabel(merged, slots[0])).toBe('Recherche');
    // Voller Stapel nimmt nichts mehr an
    let full = ws;
    for (let i = 0; i < 8; i++) full = W.addPanel(full, MONITOR2, areaOfId(full, MONITOR2, c));
    expect(W.viewOf(full, MONITOR2).slots.find((s) => s.panels.some((p) => p.id === c))!.panels).toHaveLength(9);
    expect(W.placePanels(full, MONITOR2, [a], areaOfId(full, MONITOR2, c))).toBe(full);
  });

  it('Fenster merkt sich seine Einstellung; Speichern behält sie', () => {
    const base = W.defaultWorkspace();
    let ws = Win.moveToWindow(base, [base.panels[0].id], 'w2');
    ws = M.noteSetup(ws, W2);
    expect(M.noteSetup(ws, W2)).toBe(ws);
    expect(M.setupOfWindow(ws, 'w2')).toEqual(W2);
    expect(M.setupOfWindow(ws, '')).toBe(null);
    const again = parseWorkspace(JSON.parse(JSON.stringify(ws)))!;
    expect(again.winSetup).toEqual({ w2: 'w2/monitor:landscape:2' });
    // Falscher Schlüssel für das Fenster fällt weg
    expect(parseWorkspace({ ...JSON.parse(JSON.stringify(ws)), winSetup: { w2: 'monitor:landscape:2' } })!.winSetup).toEqual({});
  });

  it('In eine Area eines anderen Fensters verschieben', () => {
    let { ws, a, b, c } = three();
    ws = Win.moveToWindow(ws, [c], 'w2');
    ws = M.noteSetup(M.noteSetup(ws, W2), MONITOR2);
    const target = areaOfId(ws, W2, c);
    const next = M.movePanels(ws, [a], MONITOR2, 'w2', target);
    expect(next.panels.find((p) => p.id === a)!.win).toBe('w2');
    expect(ids(next, W2)).toEqual([[c, a]]);
    expect(ids(next, MONITOR2)).toEqual([[b]]);
    // Eigene neue Area im anderen Fenster
    const own = M.movePanels(ws, [a], MONITOR2, 'w2', W.NEW_AREA);
    expect(ids(own, W2).sort()).toEqual([[a], [c]].sort());
  });

  it('Ganze Area in ein anderes Fenster als eigene Area: bleibt zusammen', () => {
    let { ws, a, b, c } = three();
    ws = W.placePanels(ws, MONITOR2, [a], areaOfId(ws, MONITOR2, b));
    ws = Win.moveToWindow(ws, [c], 'w2');
    ws = M.noteSetup(ws, W2);
    const next = M.movePanels(ws, [b, a], MONITOR2, 'w2', W.NEW_AREA);
    expect(ids(next, W2).map((g) => g.length).sort()).toEqual([1, 2]);
  });

  it('Ziele: Areas aller Fenster ohne die eigene, Fenster ohne bekannte Einstellung nur als Ganzes', () => {
    let { ws, a, b, c } = three();
    ws = Win.moveToWindow(ws, [c], 'w2');
    let t = M.moveTargets(ws, [a], MONITOR2);
    expect(t.filter((x) => x.win === '').map((x) => x.area)).toEqual([areaOfId(ws, MONITOR2, b), W.NEW_AREA]);
    expect(t.find((x) => x.area === W.NEW_AREA && x.win === '')!.disabled).toBe(true);
    expect(t.filter((x) => x.win === 'w2').map((x) => x.area)).toEqual(['']);
    ws = M.noteSetup(ws, W2);
    t = M.moveTargets(ws, [a], MONITOR2);
    expect(t.filter((x) => x.win === 'w2').map((x) => x.area)).toEqual([areaOfId(ws, W2, c), W.NEW_AREA]);
    expect(t.find((x) => x.win === 'w2' && x.area !== W.NEW_AREA)!.label).toBe(ws.panels.find((p) => p.id === c)!.name);
  });

  it('Reducer: Aktionen move und seen', () => {
    let { ws, a, b } = three();
    ws = reducer(ws, { type: 'seen', setup: MONITOR2 });
    expect(ws.winSetup).toEqual({ '': 'monitor:landscape:2' });
    ws = reducer(ws, { type: 'move', ids: [a], from: MONITOR2, win: '', area: areaOfId(ws, MONITOR2, b) });
    expect(ids(ws, MONITOR2)).toHaveLength(2);
  });
});

describe('F-152 Fokus-Radar als Lagekarte', () => {
  it('Volle Testbelegung: zwei Fenster mit je 10 Areas an ihrer Stelle, Filter über alle Fenster', () => {
    const ws = Probe.probeWorkspace();
    const main: ScreenSetup = { cls: 'superwide', orientation: 'landscape', lines: 2 };
    const wins = F.radarOf(ws, W.viewOf(ws, main).slots, main, new Set(['w2']));
    expect(wins.map((w) => [w.win, w.here, w.areas.length])).toEqual([['', true, 10], ['w2', false, 10]]);
    expect(wins[1].open).toBe(true);
    expect(wins[1].areas.every((a) => a.rect !== null && a.panels.length === 9)).toBe(true);
    expect(wins[0].areas[0].title).toBe('H Slot 1');
    const hits = wins.flatMap((w) => w.areas.flatMap((a) => a.panels.filter((x) => F.radarMatches(w, a, x, 'f2 3.4'))));
    expect(hits.map((x) => x.meta.name)).toEqual(['F2 3.4']);
  });

  it('Fenster ohne bekannte Einstellung: eine Kachel mit allen Panels', () => {
    const base = W.defaultWorkspace();
    const ws = Win.moveToWindow(base, [base.panels[0].id], 'w2');
    const wins = F.radarOf(ws, W.viewOf(ws, MONITOR2).slots, MONITOR2);
    expect(wins[1].areas).toHaveLength(1);
    expect(wins[1].areas[0].rect).toBe(null);
    expect(wins[1].open).toBe(false);
  });
});

describe('F-167 Fokus-Auswirkung der Plus-Knöpfe', () => {
  it('Farbe danach: +1 Portal, +1 Tab; Fokus je Desk', () => {
    let ws = W.defaultWorkspace(); // 3 Portale = 3 Punkte
    expect(F.effectOf(ws, 1).color).toBe('grün');
    expect(F.effectOf(ws, 1).text).toBe('danach Fokus grün (4 Punkte)');
    expect(F.effectOf(ws, 0, 1).points).toBe(3.5);
    for (let i = 0; i < 6; i++) ws = Win.addDesk(ws, `d${i}`, W.newPanel(`P${i}`)); // 9 Punkte
    expect(F.effectOf(ws, 1).color).toBe('gelb');
    expect(F.effectOf(ws, 0, 1).color).toBe('gelb');
    expect(F.effectOf(ws, 8).color).toBe('rot');
    expect(F.deskFocusOf(ws, '').points).toBe(3);
    expect(F.deskFocusOf(ws, 'd0').points).toBe(1);
    expect(F.deskFocusOf(ws, 'gibtsnicht').color).toBe('aus');
  });
});

describe('F-165 + NewDesk', () => {
  it('legt einen leeren Desk mit einem neuen Portal an', () => {
    const ws = W.defaultWorkspace();
    const next = Win.addDesk(ws, 'd1', W.newPanel(`Portal ${ws.nextNumber}`));
    expect(next.windows).toEqual([{ id: 'd1', name: 'Desk 2' }]);
    expect(next.panels).toHaveLength(ws.panels.length + 1);
    expect(next.panels[next.panels.length - 1]).toMatchObject({ name: 'Portal 4', win: 'd1' });
    expect(next.nextNumber).toBe(ws.nextNumber + 1);
    // ein zweiter Desk bekommt die nächste freie Nummer; vorhandene Id oder Main Desk ändern nichts
    const third = Win.addDesk(next, 'd2', W.newPanel('Portal 5'));
    expect(third.windows.map((w) => w.name)).toEqual(['Desk 2', 'Desk 3']);
    expect(Win.addDesk(third, 'd1', W.newPanel('x'))).toBe(third);
    expect(Win.addDesk(third, '', W.newPanel('x'))).toBe(third);
  });
});

describe('F-27/F-28 Hierher holen mit Grenze', () => {
  it('Volles Fenster nimmt nichts mehr an; sonst freie Areas, dann kleinste Stapel, nie über 9', () => {
    const full = Probe.probeWorkspace();
    const main: ScreenSetup = { cls: 'superwide', orientation: 'landscape', lines: 2 };
    const fromW2 = full.panels.filter((p) => p.win === 'w2').map((p) => p.id);
    const none = M.fetchPanels(full, fromW2, main);
    expect(none.moved).toBe(0);
    expect(none.ws).toBe(full);
    // Hauptfenster leer machen bis auf eine Area mit 9: dann passen 9 freie Areas × 9 = 81
    const keep = full.panels.filter((p) => p.win === 'w2' || p.id.startsWith('p-H-1-'));
    const ws = { ...full, panels: keep };
    const r = M.fetchPanels(ws, fromW2, main);
    expect(r.moved).toBe(81);
    const slots = W.viewOf(r.ws, main).slots;
    expect(slots).toHaveLength(10);
    expect(slots.every((s) => s.panels.length <= 9)).toBe(true);
    expect(r.ws.panels.filter((p) => p.win === 'w2')).toHaveLength(9);
  });
});

describe('F-153 Anordnen im Fokus-Radar', () => {
  const tree: T.Node = { dir: 'row', children: [{ id: 'a' }, { id: 'b' }, { id: 'c' }], sizes: [1 / 3, 1 / 3, 1 / 3] };
  const min: T.Min = { w: 0.05, h: 0.05 };
  it('breiter: rechte Kante, am rechten Rand die linke', () => {
    const t = F.radarResize(tree, 'a', 'w', true, 0.05, min);
    expect(Math.round((T.rects(t).get('a')!.w) * 100)).toBe(38);
    const u = F.radarResize(tree, 'c', 'w', true, 0.05, min);
    expect(Math.round((T.rects(u).get('c')!.w) * 100)).toBe(38);
    expect(Math.round((T.rects(u).get('b')!.w) * 100)).toBe(28);
  });
  it('schmaler und höher ohne Kante: derselbe Baum', () => {
    const t = F.radarResize(tree, 'c', 'w', false, 0.05, min);
    expect(Math.round((T.rects(t).get('c')!.w) * 100)).toBe(28);
    expect(F.radarResize(tree, 'b', 'h', true, 0.05, min)).toBe(tree);
  });
  it('Lage in Worten', () => {
    expect(F.placeText({ x: 0.66, y: 0, w: 0.34, h: 0.5 })).toBe('rechts oben');
    expect(F.placeText({ x: 0, y: 0, w: 0.33, h: 1 })).toBe('links, ganze Höhe');
    expect(F.placeText({ x: 0, y: 0.5, w: 1, h: 0.5 })).toBe('unten, ganze Breite');
    expect(F.placeText({ x: 0, y: 0, w: 1, h: 1 })).toBe('ganze Fläche');
    expect(F.arrangeText('X', { x: 0.33, y: 0, w: 0.34, h: 1 })).toBe('„X“ liegt jetzt Mitte, ganze Höhe, 34 % breit.');
  });
  it('Lagekarte kennt den Baum dieses Fensters', () => {
    let ws = W.defaultWorkspace();
    const setup = W.setupFor(ws, 'monitor', 'landscape');
    ws = W.addPanel(ws, setup);
    ws = W.addPanel(ws, setup);
    const v = W.viewOf(ws, setup);
    const r = F.radarOf(ws, v.slots, setup);
    expect(r[0].tree).toEqual(v.tree);
    const next = T.drop(v.tree!, v.slots[0].id, v.slots[1].id, 'right');
    const ws2 = reducer(ws, { type: 'setLayout', setup, tree: next });
    const order = T.readingOrder(W.viewOf(ws2, setup).tree);
    expect(order.indexOf(v.slots[0].id)).toBe(order.indexOf(v.slots[1].id) + 1);
  });
});

describe('F-155 Größe per Tastatur', () => {
  const tree: T.Node = { dir: 'row', children: [{ id: 'a' }, { id: 'b' }], sizes: [0.5, 0.5] };
  const min: T.Min = { w: 0.05, h: 0.05 };
  const w = (t: T.Node, id: string) => Math.round(T.rects(t).get(id)!.w * 100);
  it('Tasten werden zu Befehlen', () => {
    expect(S.sizeCmdOf({ key: 'ArrowRight', code: 'ArrowRight', shiftKey: false })).toEqual({ kind: 'edge', dir: 'right', other: false });
    expect(S.sizeCmdOf({ key: 'ArrowRight', code: 'ArrowRight', shiftKey: true })).toEqual({ kind: 'edge', dir: 'right', other: true });
    expect(S.sizeCmdOf({ key: '+', code: 'BracketRight', shiftKey: false })).toEqual({ kind: 'diag', grow: true });
    expect(S.sizeCmdOf({ key: '3', code: 'Digit3', shiftKey: false })).toEqual({ kind: 'set', f: 0.3 });
    expect(S.sizeCmdOf({ key: '0', code: 'Numpad0', shiftKey: false })).toEqual({ kind: 'set', f: 1 });
    expect(S.sizeCmdOf({ key: 'x', code: 'KeyX', shiftKey: false })).toBe(null);
    expect(S.sizeCmdOf({ key: 'D', code: 'KeyD', shiftKey: true })).toEqual({ kind: 'edge', dir: 'right', other: true });
    expect(S.sizeCmdOf({ key: 'q', code: 'KeyQ', shiftKey: false })).toEqual({ kind: 'diag', grow: false });
  });
  it('Pfeil verschiebt die Kante, Umschalt die andere', () => {
    const e = (dir: T.Side, other = false) => ({ kind: 'edge' as const, dir, other });
    expect(w(S.sizeStep(tree, 'a', e('right'), min), 'a')).toBe(55);
    expect(w(S.sizeStep(tree, 'a', e('left'), min), 'a')).toBe(45);
    expect(w(S.sizeStep(tree, 'b', e('left'), min), 'b')).toBe(55);
    expect(w(S.sizeStep(tree, 'b', e('right'), min), 'b')).toBe(45);
    expect(S.sizeStep(tree, 'a', e('right', true), min)).toBe(tree);
    expect(S.sizeStep(tree, 'a', e('top'), min)).toBe(tree);
    const mid: T.Node = { dir: 'row', children: [{ id: 'a' }, { id: 'b' }, { id: 'c' }], sizes: [0.3, 0.4, 0.3] };
    expect(w(S.sizeStep(mid, 'b', e('left', true), min), 'b')).toBe(45);
    expect(S.edgeFor(mid, 'b', 'left', false)).toBe('right');
  });
  it('Zahl setzt Breite (Höhe nur, wenn sie teilbar ist)', () => {
    expect(w(S.sizeStep(tree, 'a', { kind: 'set', f: 0.3 }, min), 'a')).toBe(30);
    const grid: T.Node = { dir: 'col', children: [tree, { id: 'c' }], sizes: [0.5, 0.5] };
    const t = S.sizeStep(grid, 'a', { kind: 'diag', grow: true }, min);
    expect(w(t, 'a')).toBe(55);
    expect(Math.round(T.rects(t).get('a')!.h * 100)).toBe(55);
  });
});

describe('F-156 Hilfe in der Suche', () => {
  it('findet Funktionen über Alltagswörter, ohne Rücksicht auf Umlaute', () => {
    expect(H.searchHelp('Größe').map((e) => e.id)).toContain('adjust');
    expect(H.searchHelp('grosse').map((e) => e.id)).toContain('adjust');
    expect(H.searchHelp('Stapel')[0].id).toBe('stack');
  });
  it('Name vor Suchwort vor Erklärung', () => {
    expect(H.searchHelp('cockpit')[0].id).toBe('cockpit');
    expect(H.searchHelp('newdesk')[0].id).toBe('newDesk');
  });
  it('mehrere Wörter müssen alle vorkommen; leer findet nichts', () => {
    expect(H.searchHelp('gleich verteilen')[0].id).toBe('distribute');
    expect(H.searchHelp('gleich xyzq')).toHaveLength(0);
    expect(H.searchHelp('  ')).toHaveLength(0);
  });
  it('höchstens max Treffer; jede Funktion hat Erklärung, eindeutige id', () => {
    expect(H.searchHelp('e', 3).length <= 3).toBe(true);
    const ids = H.HELP.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(H.HELP.every((e) => e.text.length > 10 && !/^[^ ]+ =/.test(e.text))).toBe(true);
  });
  it('Begriffe stammen aus TERMS (kein doppelter Text)', () => {
    expect(H.helpById('slot')?.text.startsWith('Ein Platz im Raster')).toBe(true);
  });
});

describe('F-95 Tour', () => {
  it('überspringt Schritte ohne Ziel, behält die Begrüßung', () => {
    const steps = Tour.tourSteps((sel) => !sel.includes('.stack'));
    expect(steps[0].id).toBe('welcome');
    expect(steps.map((s) => s.id)).not.toContain('stack');
    expect(Tour.tourSteps(() => false).map((s) => s.id)).toEqual(['welcome']);
  });
  it('jeder Schritt hat Text (aus der Hilfe), ids eindeutig; Tour ist in der Suche', () => {
    expect(Tour.TOUR.every((s) => s.text.trim().length > 20)).toBe(true);
    expect(new Set(Tour.TOUR.map((s) => s.id)).size).toBe(Tour.TOUR.length);
    expect(H.searchHelp('Einführung')[0].id).toBe('tour');
  });
});

describe('F-172 Tour „Cockpit“', () => {
  it('eigene Schritte im Cockpit, Begrüßung ohne Ziel bleibt', () => {
    const c = Tour.TOURS.cockpit;
    expect(c[0].target).toBe(undefined);
    expect(c.slice(1).every((s) => (s.target ?? '').startsWith('#overview'))).toBe(true);
    expect(new Set(c.map((s) => s.id)).size).toBe(c.length);
    expect(c.every((s) => s.text.trim().length > 20)).toBe(true);
    expect(Tour.tourSteps(() => false, c).map((s) => s.id)).toEqual(['cockpit']);
  });
  it('Starttour unverändert erreichbar, eigene Merker je Tour', () => {
    expect(Tour.TOUR).toBe(Tour.TOURS.start);
    expect(Tour.TOUR_KEY.start).toBe('esource.tour.v1');
    expect(Tour.TOUR_KEY.cockpit === Tour.TOUR_KEY.start).toBe(false);
  });
  it('F-171 Design-Tour im Dialog #design, F-174 Design in der Suche', () => {
    const d = Tour.TOURS.design;
    expect(d.filter((s) => s.target).every((s) => (s.target ?? '').startsWith('#design'))).toBe(true);
    expect(H.searchHelp('Tour Design')[0].id).toBe('tourDesign');
    expect(H.searchHelp('Akzentfarbe')[0].id).toBe('design');
    expect(Tour.TOUR_KEY.design).toBe('esource.tour.design.v1');
  });
  it('F-171 Stufe 2: Design-Tour führt zur Tour „Farben“ im Dialog „Farben“', () => {
    const d = Tour.TOURS.design;
    expect(d.some((s) => s.id === 'tints')).toBe(true);
    expect(d.find((s) => s.id === 'more')?.action).toBeDefined();
    const c = Tour.TOURS.colors;
    expect(c.filter((s) => s.target).every((s) => (s.target ?? '').startsWith('dialog.colors'))).toBe(true);
    expect(c[c.length - 1].action).toBeDefined();
    expect(Tour.TOUR_KEY.colors).toBe('esource.tour.colors.v1');
    expect(H.searchHelp('Tour Farben')[0].id).toBe('tourColors');
  });
  it('F-171 Stufe 2: ohne Kategorie statt Farbregel und Zeichen ein Hinweisschritt', () => {
    const c = Tour.TOURS.colors;
    const none = Tour.tourSteps((sel) => !sel.includes('colors-cf') && !sel.includes('colors__icons'), c).map((s) => s.id);
    expect(none).toContain('catNone');
    expect(none).not.toContain('catColors');
    expect(none).not.toContain('icon');
    const all = Tour.tourSteps(() => true, c).map((s) => s.id);
    expect(all).toContain('catColors');
    expect(all).not.toContain('catNone');
  });
  it('F-173 Schalter: ohne Speicher keine Autostarts', () => {
    expect(Tour.toursAuto()).toBe(false);
    expect(Tour.tourAutoStart('start')).toBe(false);
    expect(H.searchHelp('nicht mehr anzeigen')[0].id).toBe('toursAuto');
  });
  it('in Suche und Hilfe: „Tour Cockpit“', () => {
    expect(H.searchHelp('Tour Cockpit')[0].id).toBe('tourCockpit');
    expect(H.helpById('tourCockpit')?.run).toBe('tourCockpit');
  });
  it('F-181 Import-Tour: ohne Dialog „Datei wählen“, im Dialog dessen Teile und die Sortierhilfe', () => {
    const imp = Tour.TOURS.import;
    expect(Tour.tourSteps(() => false, imp).map((s) => s.id)).toEqual(['intro', 'export', 'choose']);
    const inDialog = Tour.tourSteps((sel) => sel.startsWith('dialog.import'), imp).map((s) => s.id);
    expect(inDialog).toEqual(['intro', 'export', 'summary', 'how', 'go', 'sort']);
    expect(imp.find((s) => s.id === 'export')?.list?.length).toBe(4);
    expect(H.BROWSER_EXPORT.map((b) => b.browser)).toEqual(['Chrome', 'Edge', 'Firefox', 'Safari']);
    expect(H.browserExportLine()).toContain('Safari: ');
    expect(H.searchHelp('Tour Import')[0].id).toBe('tourImport');
    expect(H.helpById('tourImport')?.run).toBe('tourImport');
    expect(Tour.TOUR_KEY.import).toBe('esource.tour.import.v1');
  });
});

// ---------------------------------------------------------------- F-23 Tab/Portal per Kürzel

describe('F-23 Weiterschalten', () => {
  it('stepIn läuft rundherum, auch rückwärts', () => {
    expect(C.stepIn(['a', 'b', 'c'], 'c', 1)).toBe('a');
    expect(C.stepIn(['a', 'b', 'c'], 'a', -1)).toBe('c');
    expect(C.stepIn(['a', 'b'], 'x', 1)).toBe('a');
    expect(C.stepIn(['a', 'b'], null, -1)).toBe('b');
    expect(C.stepIn([], 'a', 1)).toBeNull();
  });
  it('nextTabOf und Ansage', () => {
    const p = W.newPanel('Recherche');
    expect(C.nextTabOf(p, 1)).toBeNull();
    const t2 = { id: 't2', url: 'https://www.wikipedia.org/' };
    const q = { ...p, tabs: [...p.tabs, t2] };
    expect(C.nextTabOf(q, 1)).toBe('t2');
    expect(C.nextTabOf(q, -1)).toBe('t2');
    expect(C.tabSaid(q, 't2')).toBe('Tab 2 von 2 in „Recherche“: wikipedia.org');
    expect(C.portalSaid({ ...q, activeTab: 't2' }, 1, 4, 3)).toBe('Portal 2 von 4: „Recherche“, 2 Tabs, sichtbar wikipedia.org, Stack mit 3 Portalen');
  });
});

describe('F-24 Zuletzt geschlossen', () => {
  const withUrl = (ws: Workspace, id: string, url: string) => W.navigatePanel(ws, id, url);
  it('Portal schließen merkt es, Wiederherstellen bringt es auf den alten Slot zurück', () => {
    let ws = W.defaultWorkspace();
    const first = ws.panels[0].id;
    ws = withUrl(ws, first, 'https://a.de/');
    ws = W.addPanel(ws, MONITOR2, P(ws, MONITOR2, first)); // Stack mit 2
    ws = W.selectTab(ws, first, ws.panels[0].activeTab);
    const slot = P(ws, MONITOR2, first);
    const before = ws.panels.find((p) => p.id === first)!;
    ws = Cl.closePanel(ws, first, MONITOR2);
    expect(ws.panels.some((p) => p.id === first)).toBe(false);
    expect(Cl.closedOf(ws)).toHaveLength(1);
    const r = Cl.restoreClosed(ws, MONITOR2);
    expect(r.result).toBe('ok');
    const back = r.ws.panels.find((p) => p.id === first)!;
    expect(back.tabs).toEqual(before.tabs);
    expect(back.name).toBe(before.name);
    expect(P(r.ws, MONITOR2, first)).toBe(slot);
    expect(Cl.closedOf(r.ws)).toHaveLength(0);
    expect(Cl.restoredSaid(r)).toContain('wiederhergestellt');
  });
  it('leere Portale und Tabs werden nicht gemerkt, Liste je Desk höchstens 10', () => {
    let ws = W.defaultWorkspace();
    ws = Cl.closePanel(ws, ws.panels[0].id, MONITOR2);
    expect(Cl.closedOf(ws)).toHaveLength(0);
    const id = ws.panels[0].id;
    for (let i = 0; i < 12; i++) {
      ws = W.addTab(ws, id, `https://s${i}.de/`);
      const t = ws.panels.find((p) => p.id === id)!.activeTab;
      ws = Cl.closeTabRemember(ws, id, t, (w) => W.closeTab(w, id, t));
    }
    expect(Cl.closedOf(ws)).toHaveLength(Cl.CLOSED_MAX);
    expect(Cl.closedLabel(Cl.closedOf(ws)[0])).toContain('s11.de');
    expect(Cl.restoreClosed(W.defaultWorkspace(), MONITOR2).result).toBe('none');
  });
  it('Tab kommt an seine Stelle zurück; ist das Portal weg, in ein neues Portal', () => {
    let ws = W.defaultWorkspace();
    const id = ws.panels[0].id;
    ws = withUrl(ws, id, 'https://a.de/');
    ws = W.addTab(ws, id, 'https://b.de/');
    ws = W.addTab(ws, id, 'https://c.de/');
    const mid = ws.panels[0].tabs[1].id;
    ws = Cl.closeTabRemember(ws, id, mid, (w) => W.closeTab(w, id, mid));
    let r = Cl.restoreClosed(ws, MONITOR2);
    expect(r.ws.panels[0].tabs.map((t) => t.id)[1]).toBe(mid);
    expect(r.ws.panels[0].activeTab).toBe(mid);
    ws = Cl.closeTabRemember(r.ws, id, mid, (w) => W.closeTab(w, id, mid));
    ws = W.removePanel(ws, id);
    r = Cl.restoreClosed(ws, MONITOR2);
    expect(r.result).toBe('ok');
    const made = r.ws.panels.find((p) => p.id === r.panel)!;
    expect(made.tabs[0].url).toBe('https://b.de/');
  });
  it('wird beim Speichern und Laden übernommen', () => {
    let ws = W.defaultWorkspace();
    ws = withUrl(ws, ws.panels[0].id, 'https://a.de/');
    ws = Cl.closePanel(ws, ws.panels[0].id, MONITOR2);
    const back = parseWorkspace(JSON.parse(JSON.stringify(ws)))!;
    expect(Cl.closedOf(back)).toHaveLength(1);
    expect(parseWorkspace(JSON.parse(JSON.stringify(W.defaultWorkspace())))!.closed).toBeUndefined();
  });
});

describe('F-29 Rest Grenzen der Fokusanzeige', () => {
  it('fixRule ordnet die Grenzen und rundet', () => {
    expect(F.fixRule({ greenMax: 5, yellowMax: 3, orangeMax: 2, tabWeight: 0.3 })).toEqual({ tabWeight: 0.25, greenMax: 5, yellowMax: 6, orangeMax: 7 });
    expect(F.fixRule({ greenMax: 0 }).greenMax).toBe(1);
  });
  it('eigene Regel wirkt auf Fokus und Auswirkung; Voreinstellung entfernt den Eintrag', () => {
    let ws = W.defaultWorkspace(); // 3 Portale
    expect(F.focusOf(ws).color).toBe('grün');
    ws = F.setFocusRule(ws, { greenMax: 1, yellowMax: 2 });
    expect(ws.focus).toEqual({ tabWeight: 0.5, greenMax: 1, yellowMax: 2, orangeMax: 16 });
    expect(F.focusOf(ws).color).toBe('orange');
    expect(F.effectOf(ws, 0).color).toBe('orange');
    ws = F.setFocusRule(ws, { tabWeight: 0 });
    expect(F.ruleOf(ws).tabWeight).toBe(0);
    ws = F.setFocusRule(ws, null);
    expect(ws.focus).toBeUndefined();
    expect(F.setFocusRule(W.defaultWorkspace(), { greenMax: 9 }).focus).toBeUndefined();
  });
  it('wird gespeichert und geladen', () => {
    const ws = F.setFocusRule(W.defaultWorkspace(), { orangeMax: 30 });
    expect(parseWorkspace(JSON.parse(JSON.stringify(ws)))!.focus).toEqual(ws.focus);
  });
});

describe('F-40 bis F-42, F-149 Launcher', () => {
  const bm = (id: string, title: string, url: string, category = ''): Parameters<typeof B.saveBookmark>[1] => ({ id, title, url, category, tags: [], panels: [] });
  const base = () => {
    let ws = B.addCategory(W.defaultWorkspace(), 'c1', 'Werkzeuge');
    ws = B.saveBookmark(ws, bm('b1', 'GitHub', 'https://github.com/x', 'c1'));
    ws = B.saveBookmark(ws, bm('b2', 'Wiki', 'https://de.wikipedia.org/wiki/Hamburg', 'c1'));
    ws = B.saveBookmark(ws, bm('b3', 'ChatGPT', 'https://chatgpt.com/', 'c1'));
    ws = B.saveBookmark(ws, bm('b4', 'Claude', 'https://claude.ai/new'));
    return ws;
  };
  it('enthält nur gesperrte Sources, nach Kategorie, ohne Kategorie zuletzt', () => {
    const g = La.launcherGroups(base());
    expect(g.map((x) => x.category?.name ?? null)).toEqual(['Werkzeuge', null]);
    expect(g[0].items.map((b) => b.id)).toEqual(['b1', 'b3']);
    expect(g[1].items.map((b) => b.id)).toEqual(['b4']);
    expect(La.launcherCount(base())).toBe(3);
  });
  it('eigene Markierung nimmt auf oder heraus', () => {
    let ws = W.setEmbed(base(), 'https://de.wikipedia.org/', false);
    expect(La.launcherGroups(ws)[0].items.map((b) => b.id)).toEqual(['b1', 'b2', 'b3']);
    ws = W.setEmbed(ws, 'https://github.com/', true);
    expect(La.launcherGroups(ws)[0].items.map((b) => b.id)).toEqual(['b2', 'b3']);
  });
  it('sortiert alphabetisch und filtert', () => {
    expect(La.launcherGroups(base(), '', 'az')[0].items.map((b) => b.title)).toEqual(['ChatGPT', 'GitHub']);
    expect(La.launcherGroups(base(), 'git').map((g) => g.items.map((b) => b.id))).toEqual([['b1']]);
    expect(La.launcherGroups(base(), 'nichtda')).toEqual([]);
  });
  it('liest und speichert den Stand knapp', () => {
    expect(La.parseLauncher(null)).toEqual(La.LAUNCHER_DEFAULT);
    expect(La.parseLauncher({ open: true, how: 'window', x: 12.4, y: 'a', sort: 'zz' })).toMatchObject({ open: true, how: 'window', x: 12, y: -1, sort: 'library' });
    expect(La.launcherDiff(La.LAUNCHER_DEFAULT)).toEqual({});
    expect(La.launcherDiff({ ...La.LAUNCHER_DEFAULT, how: 'window' })).toEqual({ how: 'window' });
  });
  it('bleibt im sichtbaren Bereich', () => {
    expect(La.clampPos(900, 700, 300, 200, 1000, 800)).toEqual({ x: 692, y: 592 });
    expect(La.clampPos(-50, -5, 300, 200, 1000, 800)).toEqual({ x: 8, y: 8 });
    expect(La.clampPos(100, 100, 2000, 200, 1000, 800)).toEqual({ x: 8, y: 100 });
  });
});

describe('F-36 Lesezeichen aus dem Browser', () => {
  // Aufbau wie ein Export aus Chrome (Lesezeichenleiste) mit Firefox-Tags und einem Unterordner
  const FILE = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="1" PERSONAL_TOOLBAR_FOLDER="true">Lesezeichenleiste</H3>
    <DL><p>
        <DT><A HREF="https://github.com/" ADD_DATE="1">GitHub</A>
        <DT><H3>Doku</H3>
        <DL><p>
            <DT><A HREF="https://developer.mozilla.org/de/" TAGS="css,html">MDN &amp; Web</A>
            <DT><H3>React</H3>
            <DL><p>
                <DT><A HREF="https://react.dev/">React</A>
            </DL><p>
        </DL><p>
        <DT><A HREF="javascript:alert(1)">Bookmarklet</A>
    </DL><p>
    <DT><A HREF="https://github.com">GitHub doppelt</A>
    <DT><H3>Jobs</H3>
    <DL><p>
        <DT><A HREF="https://www.stepstone.de/">StepStone</A>
    </DL><p>
</DL><p>`;
  let n = 0;
  const id = () => `id${++n}`;

  it('liest Ordnerpfade ohne Wurzelordner, Tags und Zeichen', () => {
    const list = BB.parseBookmarkFile(FILE);
    expect(BB.looksLikeBookmarkFile(FILE)).toBe(true);
    expect(BB.looksLikeBookmarkFile('{"a":1}')).toBe(false);
    expect(list.map((b) => b.title)).toEqual(['GitHub', 'MDN & Web', 'React', 'Bookmarklet', 'GitHub doppelt', 'StepStone']);
    expect(list[0].path).toEqual([]);
    expect(list[1]).toMatchObject({ path: ['Doku'], tags: ['css', 'html'] });
    expect(list[2].path).toEqual(['Doku', 'React']);
    expect(list[5].path).toEqual(['Jobs']);
  });

  it('plant ohne Doppelte, ohne Vorhandene und ohne unbrauchbare Adressen', () => {
    let ws = W.defaultWorkspace();
    ws = B.addCategory(ws, 'j', 'jobs');
    ws = B.saveBookmark(ws, { id: 'x', title: '', url: 'https://www.stepstone.de', category: '', tags: [], panels: [] });
    const plan = BB.planImport(ws, BB.parseBookmarkFile(FILE));
    expect(plan.fresh.map((b) => b.title)).toEqual(['GitHub', 'MDN & Web', 'React']);
    expect(plan.known).toBe(2);
    expect(plan.unusable).toBe(1);
    expect(plan.newCategories).toEqual(['Doku', 'Doku › React']);
    const next = BB.applyImport(ws, plan, id);
    expect(next.bookmarks).toHaveLength(4);
    expect(next.categories.map((c) => c.name)).toEqual(['jobs', 'Doku', 'Doku › React']);
    const mdn = next.bookmarks.find((b) => b.title === 'MDN & Web')!;
    expect(next.categories.find((c) => c.id === mdn.category)?.name).toBe('Doku');
    expect(mdn.panels).toEqual([]);
    // weniger fein: nur oberste Ebene bzw. alles in eine Kategorie
    const list = BB.parseBookmarkFile(FILE);
    expect(BB.planImport(ws, list, 'top').newCategories).toEqual(['Doku']);
    const one = BB.planImport(ws, list, 'one', 'Import 22.11.2026');
    expect(one.newCategories).toEqual(['Import 22.11.2026']);
    expect(one.fresh.every((b) => b.category === 'Import 22.11.2026')).toBe(true);
    // ein zweiter Import derselben Datei ändert nichts mehr
    expect(BB.planImport(next, BB.parseBookmarkFile(FILE)).fresh).toHaveLength(0);
  });

  it('gibt die Library als Datei aus, die sich wieder einlesen lässt', () => {
    const ws = BB.applyImport(W.defaultWorkspace(), BB.planImport(W.defaultWorkspace(), BB.parseBookmarkFile(FILE)), id);
    const html = BB.bookmarkFileOf(ws);
    expect(html.startsWith('<!DOCTYPE NETSCAPE-Bookmark-file-1>')).toBe(true);
    expect(html).toContain('MDN &amp; Web');
    expect(html).toContain('TAGS="css,html"');
    const again = BB.parseBookmarkFile(html);
    expect(again.map((b) => [b.title, b.path.join('/')])).toEqual([
      ['GitHub', ''],
      ['MDN & Web', 'Doku'],
      ['React', 'Doku/React'],
      ['StepStone', 'Jobs'],
    ]);
  });
});

describe('F-180 Sortierhilfe', () => {
  let n = 0;
  const id = () => `s${++n}`;
  const bm = (bid: string, url: string, category = '') => ({ id: bid, title: '', url, category, tags: [], panels: [] });
  const base = () => {
    let ws = B.addCategory(W.defaultWorkspace(), 'doku', 'Doku');
    for (const b of [bm('a', 'https://www.youtube.com/watch?v=1'), bm('b', 'https://youtube.com/watch?v=2'), bm('c', 'https://github.com/x', 'doku'), bm('d', 'https://github.com/y'), bm('e', 'https://beispiel-firma.de/'), bm('f', 'https://de.wikipedia.org/wiki/Hamburg')])
      ws = B.saveBookmark(ws, b);
    return ws;
  };
  it('bündelt nach Domain, lernt aus der Library, schlägt Bekanntes vor', () => {
    const g = SH.sortGroups(base());
    expect(SH.looseCount(base())).toBe(5);
    expect(g.map((x) => [x.domain, x.items.length, x.suggestion, x.learned])).toEqual([
      ['youtube.com', 2, 'Video', false],
      ['de.wikipedia.org', 1, 'Wissen', false],
      ['github.com', 1, 'Doku', true],
      ['beispiel-firma.de', 1, null, false],
    ]);
  });
  it('sortiert eine Gruppe ein und legt die Kategorie bei Bedarf an', () => {
    const ws = SH.sortInto(base(), ['a', 'b'], 'video', id);
    expect(ws.categories.map((c) => c.name)).toEqual(['Doku', 'video']);
    expect(ws.bookmarks.filter((b) => b.category === ws.categories[1].id).map((b) => b.id)).toEqual(['a', 'b']);
    expect(SH.sortInto(ws, ['d'], 'DOKU', id).categories).toHaveLength(2);
  });
  it('übernimmt alle Vorschläge, Unbekanntes bleibt', () => {
    const ws = SH.sortAll(base(), id);
    expect(SH.looseCount(ws)).toBe(1);
    expect(SH.sortGroups(ws).map((g) => g.domain)).toEqual(['beispiel-firma.de']);
    expect(ws.categories.map((c) => c.name)).toEqual(['Doku', 'Video', 'Wissen']);
  });
});

// ---------------------------------------------------------------- F-179 Profil und Begrüßung

describe('F-179 Profil', () => {
  const base = () => parseWorkspace({ panels: [] }) as Workspace;
  it('Initialen und Gruß je Tageszeit', () => {
    expect(Pr.initialsOf('Enrico Schulz')).toBe('ES');
    expect(Pr.initialsOf('  enrico  ')).toBe('E');
    expect(Pr.initialsOf('Anna Maria von Berg')).toBe('AB');
    expect(Pr.initialsOf('')).toBe('');
    expect(Pr.greetingFor(7, 'Enrico')).toBe('Guten Morgen, Enrico');
    expect(Pr.greetingFor(13)).toBe('Guten Tag');
    expect(Pr.greetingFor(20, ' Enrico ')).toBe('Guten Abend, Enrico');
    expect(Pr.greetingFor(2, 'Enrico')).toBe('Hallo, Enrico');
  });
  it('setProfile: Name bereinigt, Voreinstellung fällt weg', () => {
    const ws = Pr.setProfile(base(), { name: '  Enrico   Schulz ', color: 3 });
    expect(ws.profile).toEqual({ name: 'Enrico Schulz', color: 3, greet: true });
    const back = Pr.setProfile(ws, { name: '', color: 0 });
    expect(back.profile).toBeUndefined();
    expect(Pr.profileOf(back).greet).toBe(true);
    expect(Pr.setProfile(base(), { greet: false }).profile?.greet).toBe(false);
  });
  it('kommt durch Speichern/Export und verwirft Unbrauchbares', () => {
    const ws = Pr.setProfile(base(), { name: 'Enrico', color: 2, greet: false });
    expect(parseWorkspace(JSON.parse(JSON.stringify(ws)))?.profile).toEqual({ name: 'Enrico', color: 2, greet: false });
    expect(Pr.parseProfile({ name: 5, color: 99 })).toEqual({ name: '', color: 0, greet: true });
    expect(Pr.parseProfile('x')).toBeUndefined();
    expect(Pr.parseProfile({ name: 'x'.repeat(80) })?.name).toHaveLength(Pr.NAME_MAX);
  });
  it('Reducer und Suche', () => {
    const ws = reducer(base(), { type: 'profile', change: { name: 'Enrico' } });
    expect(ws.profile?.name).toBe('Enrico');
    expect(H.searchHelp('Profil')[0].id).toBe('profile');
    expect(H.searchHelp('Begrüßung')[0].id).toBe('profile');
    expect(Pr.PROFILE_COLORS).toHaveLength(8);
  });
});

describe('F-168 Neue Version verfügbar', () => {
  it('liest die Build-Kennung nur aus brauchbarem version.json', () => {
    expect(Up.parseBuild({ build: '20261122T1630' })).toBe('20261122T1630');
    expect(Up.parseBuild({ build: '' })).toBeNull();
    expect(Up.parseBuild({ build: 42 })).toBeNull();
    expect(Up.parseBuild({ build: '<script>' })).toBeNull();
    expect(Up.parseBuild(null)).toBeNull();
    expect(Up.parseBuild('20261122')).toBeNull();
  });
  it('meldet nur eine andere Kennung als neu', () => {
    expect(Up.isNewBuild('a', 'b')).toBe(true);
    expect(Up.isNewBuild('a', 'a')).toBe(false);
    expect(Up.isNewBuild('a', null)).toBe(false);
    expect(Up.isNewBuild('', 'b')).toBe(false);
  });
  it('prüft beim Zurückkehren nach 1 Minute, sonst alle 30 Minuten', () => {
    expect(Up.dueCheck(0, Up.MIN_GAP_MS - 1, 'return')).toBe(false);
    expect(Up.dueCheck(0, Up.MIN_GAP_MS, 'return')).toBe(true);
    expect(Up.dueCheck(0, Up.MIN_GAP_MS, 'timer')).toBe(false);
    expect(Up.dueCheck(0, Up.CHECK_EVERY_MS, 'timer')).toBe(true);
  });
  it('baut die Adresse mit Unterpfad und Zeitstempel', () => {
    expect(Up.versionUrl('/e-sources/', 5)).toBe('/e-sources/version.json?t=5');
    expect(Up.versionUrl('/', 5)).toBe('/version.json?t=5');
    expect(Up.versionUrl('/x', 5)).toBe('/x/version.json?t=5');
  });
  it('findet „Neu laden“ in Suche und Hilfe', () => {
    expect(H.searchHelp('neue Version')[0].id).toBe('reload');
    expect(H.searchHelp('Update')[0].id).toBe('reload');
    expect(H.helpById('reload')?.run).toBe('reload');
  });
});

describe('F-185 Herkunft einer Source', () => {
  const now = new Date(2026, 10, 22, 16, 55);
  const base = Pr.setProfile(W.defaultWorkspace(), { name: 'Enrico' });

  it('neue Source merkt sich wer, wie und wann; Ändern behält das', () => {
    const origin = B.originOf(base, 'hand', {}, now);
    expect(origin).toEqual({ via: 'hand', at: now.toISOString(), by: 'Enrico' });
    let ws = B.saveBookmark(base, { id: 'b1', title: 'MDN', url: 'https://developer.mozilla.org', category: '', tags: [], panels: [], origin });
    ws = B.saveBookmark(ws, { ...ws.bookmarks[0], title: 'MDN Doku', origin: undefined });
    expect(ws.bookmarks[0].origin).toEqual(origin);
    expect(B.originText(origin)).toBe('Angelegt von Enrico am 22.11.2026, 16:55 · von Hand gespeichert');
    expect(B.originText(undefined)).toContain('Herkunft unbekannt');
    expect(B.originOf(W.defaultWorkspace(), 'launcher', {}, now).by).toBeUndefined();
  });

  it('Lesezeichen-Import nennt Datei und Ordner und ist suchbar', () => {
    const list = BB.parseBookmarkFile('<DL><p><DT><H3>Arbeit</H3><DL><p><DT><A HREF="https://example.org/a">A</A></DL><p></DL>');
    const plan = BB.planImport(base, list, 'one', 'Import 22.11.2026');
    const ws = BB.applyImport(base, plan, W.newId, 'bookmarks.html', now);
    const o = ws.bookmarks[0].origin;
    expect(o).toMatchObject({ via: 'import', from: 'bookmarks.html', folder: 'Arbeit', by: 'Enrico' });
    expect(B.originText(o)).toBe('Angelegt von Enrico am 22.11.2026, 16:55 · aus Lesezeichen-Import „bookmarks.html“, Ordner Arbeit');
    expect(B.matches(ws, ws.bookmarks[0], 'import 22.11.2026')).toBe(true);
    expect(B.matches(ws, ws.bookmarks[0], 'launcher')).toBe(false);
  });

  it('Beispiele, Speichern und Import der Arbeitsfläche', () => {
    const s = B.addSamples(base, W.newId, now).ws;
    expect(s.bookmarks.every((b) => b.origin?.via === 'sample')).toBe(true);
    // gespeichert und wieder geladen
    const back = parseWorkspace(JSON.parse(JSON.stringify(s)));
    expect(back?.bookmarks[0].origin).toEqual(s.bookmarks[0].origin);
    // unbrauchbare Angabe fällt weg
    const bad = JSON.parse(JSON.stringify(s));
    bad.bookmarks[0].origin = { via: 'irgendwas', at: 'gestern' };
    expect(parseWorkspace(bad)?.bookmarks[0].origin).toBeUndefined();
    // Import der Arbeitsfläche: vorhandene Herkunft bleibt, fehlende wird „workspace“ vom Gerät der Datei
    const file = X.toTransferFile(bad, 'Mac', now);
    const r = X.readTransferFile(JSON.stringify(file), now);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.file.workspace.bookmarks[0].origin).toEqual({ via: 'workspace', at: now.toISOString(), from: 'Mac' });
      expect(r.file.workspace.bookmarks[1].origin?.via).toBe('sample');
      expect(B.originText(r.file.workspace.bookmarks[0].origin)).toContain('aus Import der Arbeitsfläche (Mac)');
    }
  });
});

describe('F-161 Farben je Desk', () => {
  const twoDesks = () => {
    const ws = W.defaultWorkspace();
    return Win.moveToWindow(ws, [ws.panels[0].id], 'w2');
  };

  it('ein Desk ohne eigene Farben folgt dem Main Desk – auch bei späteren Änderungen', () => {
    let ws = twoDesks();
    expect(L.hasOwnLook(ws, 'w2')).toBe(false);
    ws = reducer(ws, { type: 'look', accent: '#64a970' });
    expect(L.lookOf(ws, 'w2').accent).toBe('#64a970');
    expect(L.hasOwnLook(ws, '')).toBe(false);
  });

  it('Wahl auf einem Zusatz-Desk gilt nur dort; „Wie Main Desk“ führt zurück', () => {
    let ws = twoDesks();
    ws = reducer(ws, { type: 'look', win: 'w2', theme: 'light' });
    expect(L.lookOf(ws, 'w2')).toEqual({ theme: 'light', accent: ws.look.accent });
    expect(ws.look.theme).toBe('system');
    ws = reducer(ws, { type: 'look', accent: '#66afe1' });
    expect(L.lookOf(ws, 'w2').accent).toBe('#e4522c');
    expect(reducer(ws, { type: 'look', win: 'w2', theme: 'light' })).toBe(ws);
    ws = reducer(ws, { type: 'followMainLook', win: 'w2' });
    expect(L.hasOwnLook(ws, 'w2')).toBe(false);
    expect(ws.deskLooks).toBeUndefined();
    expect(L.lookOf(ws, 'w2').accent).toBe('#66afe1');
  });

  it('eigene Farben bleiben beim Speichern; Unbrauchbares und fremde Desks fallen weg', () => {
    let ws = reducer(twoDesks(), { type: 'look', win: 'w2', theme: 'win2000', accent: '#0a246a' });
    const back = parseWorkspace(JSON.parse(JSON.stringify(ws)))!;
    expect(back.deskLooks).toEqual({ w2: { theme: 'win2000', accent: '#0a246a' } });
    const bad = JSON.parse(JSON.stringify(ws));
    bad.deskLooks = { w2: { theme: 'neon', accent: '#000000' }, w9: { theme: 'light', accent: '#000000' } };
    expect(parseWorkspace(bad)!.deskLooks).toBeUndefined();
  });

  it('fällt ein Desk weg, fallen seine Farben mit weg', () => {
    let ws = reducer(twoDesks(), { type: 'look', win: 'w2', theme: 'light' });
    ws = Win.syncWindows(Win.moveToWindow(ws, [ws.panels[0].id], ''));
    expect(ws.windows).toHaveLength(0);
    expect(ws.deskLooks).toBeUndefined();
  });
});

describe('F-162 Farben je Slot und Portal', () => {
  const setup = LAPTOP1;
  const stackWs = () => {
    let ws = W.defaultWorkspace();
    const v = W.viewOf(ws, setup);
    const area = v.slots[0].id;
    ws = W.addPanel(ws, setup, area, 'neu');
    return { ws, area };
  };

  it('Portal → Slot → Desk, jede Farbe für sich', () => {
    let { ws, area } = stackWs();
    ws = reducer(ws, { type: 'tintSlot', setup, area, change: { frame: '#64A970', accent: '#66afe1' } });
    const slot = W.viewOf(ws, setup).slots.find((s) => s.id === area)!;
    const t = Ti.slotTint(ws, slot);
    expect(t).toEqual({ frame: '#64a970', accent: '#66afe1' });
    const p = slot.front;
    expect(Ti.shownTint(p, t)).toEqual({ frame: '#64a970', frameFrom: 'slot', accent: '#66afe1', accentFrom: 'slot' });
    ws = reducer(ws, { type: 'tintPanel', id: p.id, change: { accent: '#b064a6' } });
    const p2 = ws.panels.find((x) => x.id === p.id)!;
    expect(Ti.shownTint(p2, t)).toEqual({ frame: '#64a970', frameFrom: 'slot', accent: '#b064a6', accentFrom: 'portal' });
    expect(Ti.shownTint(p2, undefined).frameFrom).toBe('desk');
  });

  it('null löscht eine Farbe; leer bleibt nichts zurück; Ungültiges ändert nichts', () => {
    let ws = W.defaultWorkspace();
    const id = ws.panels[0].id;
    ws = Ti.setPanelTint(ws, id, { frame: '#000000' });
    expect(Ti.setPanelTint(ws, id, { frame: 'rot' })).toBe(ws);
    ws = Ti.setPanelTint(ws, id, { frame: null });
    expect(ws.panels[0].tint).toBeUndefined();
  });

  it('Farben bleiben beim Speichern; Unbrauchbares fällt weg', () => {
    let { ws, area } = stackWs();
    ws = reducer(ws, { type: 'tintSlot', setup, area, change: { accent: '#ecb85c' } });
    ws = reducer(ws, { type: 'tintPanel', id: ws.panels[0].id, change: { frame: '#d3514a' } });
    const back = parseWorkspace(JSON.parse(JSON.stringify(ws)))!;
    expect(back.panels[0].tint).toEqual({ frame: '#d3514a' });
    expect(back.areaNames.some((a) => a.tint?.accent === '#ecb85c')).toBe(true);
    const bad = JSON.parse(JSON.stringify(ws));
    bad.panels[0].tint = { frame: 'grün' };
    bad.areaNames[0].tint = 5;
    const b2 = parseWorkspace(bad)!;
    expect(b2.panels[0].tint).toBeUndefined();
    expect(b2.areaNames[0].tint).toBeUndefined();
  });
});

describe('F-162 Zurücksetzen auf Desk-Farben', () => {
  it('setzt alle Slots und Portale eines Desks zurück, andere Desks bleiben; Rückgängig stellt her', () => {
    let ws = W.defaultWorkspace();
    const [a, b] = ws.panels;
    ws = Win.moveToWindow(ws, [b.id], 'w2');
    ws = Ti.setPanelTint(ws, a.id, { frame: '#d3514a' });
    ws = Ti.setPanelTint(ws, b.id, { accent: '#64a970' });
    const area = W.viewOf(ws, LAPTOP1).slots.find((s) => s.panels.some((p) => p.id === a.id))!.id;
    ws = reducer(ws, { type: 'tintSlot', setup: LAPTOP1, area, change: { accent: '#66afe1' } });
    expect(Ti.deskTintCount(ws, '')).toBe(2);
    const { ws: cleared, before } = Ti.clearDeskTints(ws, '');
    expect(Ti.deskTintCount(cleared, '')).toBe(0);
    expect(cleared.panels.find((p) => p.id === b.id)!.tint).toEqual({ accent: '#64a970' });
    const back = Ti.restoreTints(cleared, before);
    expect(Ti.deskTintCount(back, '')).toBe(2);
    expect(Ti.clearDeskTints(cleared, '').ws).toBe(cleared);
  });
});

describe('F-163 Farbregeln über Kategorien', () => {
  const withCats = () => {
    let ws = W.defaultWorkspace();
    ws = B.addCategory(ws, 'c-ed', 'Editor');
    ws = B.addCategory(ws, 'c-vi', 'Video');
    return ws;
  };

  it('Vorschlag: Source mit gleicher Adresse, dann gemerkte Domain, dann Library, dann bekannte Seite', () => {
    let ws = withCats();
    expect(Ca.suggestCategory(ws, undefined)).toBeNull();
    expect(Ca.suggestCategory(ws, 'https://example.org/x')).toBeNull();
    // bekannte Seite, Kategorie gibt es schon
    expect(Ca.suggestCategory(ws, 'https://www.youtube.com/watch?v=1')).toEqual({ id: 'c-vi', name: 'Video', from: 'known' });
    // bekannte Seite, Kategorie gibt es noch nicht
    expect(Ca.suggestCategory(ws, 'https://github.com/a')).toEqual({ name: 'Entwicklung', from: 'known' });
    // Library: andere Source derselben Domain
    ws = { ...ws, bookmarks: [{ id: 'b1', title: 'Doc', url: 'https://docs.google.com/a', category: 'c-ed', tags: [], panels: [] }] };
    expect(Ca.suggestCategory(ws, 'https://docs.google.com/b')).toMatchObject({ id: 'c-ed', from: 'library' });
    expect(Ca.suggestCategory(ws, 'https://docs.google.com/a')).toMatchObject({ id: 'c-ed', from: 'source' });
    // gemerkte Wahl schlägt die Library, auch „ohne“
    ws = Ca.setPanelCategory(ws, ws.panels[0].id, '', 'https://docs.google.com/c');
    expect(Ca.suggestCategory(ws, 'https://docs.google.com/d')).toEqual({ id: '', name: '', from: 'site' });
  });

  it('Kategorie setzen merkt die Domain; unbekannte Id ändert nichts; neue Kategorie wird angelegt', () => {
    let ws = withCats();
    const id = ws.panels[0].id;
    expect(Ca.setPanelCategory(ws, id, 'gibt-es-nicht')).toBe(ws);
    ws = Ca.setPanelCategory(ws, id, 'c-ed', 'https://www.docs.example.com/x');
    expect(ws.panels[0].category).toBe('c-ed');
    expect(ws.siteCategory).toEqual({ 'docs.example.com': 'c-ed' });
    ws = reducer(ws, { type: 'panelNewCategory', id, name: 'Mail', catId: 'c-ma', url: 'https://mail.example.com' });
    expect(B.categoryByName(ws, 'mail')?.id).toBe('c-ma');
    expect(ws.panels[0].category).toBe('c-ma');
    // gleicher Name nimmt die vorhandene
    ws = Ca.setPanelNewCategory(ws, id, ' editor ', () => 'neu');
    expect(ws.panels[0].category).toBe('c-ed');
    expect(ws.categories).toHaveLength(3);
  });

  it('Vorrang Portal → Slot → Kategorie → Desk', () => {
    let ws = withCats();
    const id = ws.panels[0].id;
    ws = Ca.setPanelCategory(ws, id, 'c-vi');
    ws = reducer(ws, { type: 'tintCategory', id: 'c-vi', change: { frame: '#D3514A' } });
    const p = ws.panels[0];
    const cat = Ca.categoryTint(ws, p);
    expect(cat).toEqual({ frame: '#d3514a' });
    expect(Ti.shownTint(p, undefined, cat)).toEqual({ frame: '#d3514a', frameFrom: 'category', accent: undefined, accentFrom: 'desk' });
    expect(Ti.shownTint(p, { frame: '#64a970' }, cat).frameFrom).toBe('slot');
    expect(Ti.shownTint({ ...p, tint: { frame: '#000000' } }, { frame: '#64a970' }, cat).frameFrom).toBe('portal');
    expect(Ca.categoryPortals(ws, 'c-vi')).toBe(1);
    ws = Ca.setCategoryTint(ws, 'c-vi', { frame: null });
    expect(ws.categories.find((c) => c.id === 'c-vi')).toEqual({ id: 'c-vi', name: 'Video' });
  });

  it('Löschen der Kategorie: Portale ohne, gemerkte Domain weg; Speichern prüft alles', () => {
    let ws = withCats();
    const id = ws.panels[0].id;
    ws = Ca.setPanelCategory(ws, id, 'c-vi', 'https://vimeo.com/1');
    ws = Ca.setCategoryTint(ws, 'c-vi', { frame: '#64a970' });
    const back = parseWorkspace(JSON.parse(JSON.stringify(ws)))!;
    expect(back.panels[0].category).toBe('c-vi');
    expect(back.categories.find((c) => c.id === 'c-vi')?.tint).toEqual({ frame: '#64a970' });
    expect(back.siteCategory).toEqual({ 'vimeo.com': 'c-vi' });
    const broken = parseWorkspace({ ...JSON.parse(JSON.stringify(ws)), siteCategory: { 'a.de': 'weg', 'b.de': '' } })!;
    expect(broken.siteCategory).toEqual({ 'b.de': '' });
    ws = B.deleteCategory(ws, 'c-vi');
    expect(ws.panels[0].category).toBe('');
    expect(ws.siteCategory).toEqual({});
  });
});

describe('F-164 Regelübersicht', () => {
  const base = () => {
    let ws = W.defaultWorkspace();
    ws = B.addCategory(ws, 'c-vi', 'Video');
    ws = Ca.setCategoryTint(ws, 'c-vi', { frame: '#64a970' });
    ws = Ca.setPanelCategory(ws, ws.panels[0].id, 'c-vi', 'https://www.youtube.com/watch?v=1');
    return ws;
  };

  it('listet Farbregeln, Seiten und eingebaute Regeln mit Klartext', () => {
    const rows = Ru.ruleList(base());
    expect(rows.map((r) => r.id)).toEqual(['tint:c-vi', 'site:youtube.com', 'ask', 'offer', 'invite', 'collect']);
    expect(rows[0].text).toContain('Herzchakra (Grün)');
    expect(rows[0].portals).toBe(1);
    expect(rows[1].text).toContain('„Video“');
    expect(rows.filter((r) => !r.on).map((r) => r.id)).toEqual(['offer']);
  });

  it('„Farbe anbieten“ ist ab Werk aus; Einschalten übersteht Speichern', () => {
    let ws = base();
    expect(Ru.ruleOn(ws, 'offer')).toBe(false);
    ws = Ru.setRuleOn(ws, 'offer', true);
    expect(Ru.ruleOn(ws, 'offer')).toBe(true);
    expect(ws.rulesOff).toBeUndefined();
    expect(Ru.ruleOn(parseWorkspace(JSON.parse(JSON.stringify(ws)))!, 'offer')).toBe(true);
    expect(Ru.setRuleOn(ws, 'offer', false).rulesOn).toBeUndefined();
  });

  it('Ausschalten wirkt auf Farbe und Vorschlag und übersteht Speichern', () => {
    let ws = Ru.setRuleOn(base(), 'tint:c-vi', false);
    ws = Ru.setRuleOn(ws, 'site:youtube.com', false);
    expect(Ca.categoryTint(ws, ws.panels[0])).toBeUndefined();
    expect(Ca.suggestCategory(ws, 'https://youtube.com/x')?.from).toBe('known');
    const back = parseWorkspace(JSON.parse(JSON.stringify(ws)));
    expect(back?.rulesOff).toEqual(['tint:c-vi', 'site:youtube.com']);
    ws = Ru.setRuleOn(Ru.setRuleOn(ws, 'tint:c-vi', true), 'site:youtube.com', true);
    expect(ws.rulesOff).toBeUndefined();
    expect(Ca.categoryTint(ws, ws.panels[0])).toEqual({ frame: '#64a970' });
  });

  it('Löschen und Rückgängig stellen Farbe, Zuordnung und Aus-Zustand wieder her', () => {
    let ws = Ru.setRuleOn(base(), 'site:youtube.com', false);
    const t = Ru.deleteRule(ws, 'tint:c-vi');
    expect(t.ws.categories[0].tint).toBeUndefined();
    const s = Ru.deleteRule(t.ws, 'site:youtube.com');
    expect(s.ws.siteCategory).toBeUndefined();
    expect(s.ws.rulesOff).toBeUndefined();
    expect(Ru.deleteRule(s.ws, 'ask').undo).toBeNull();
    ws = Ru.restoreRule(Ru.restoreRule(s.ws, s.undo!), t.undo!);
    expect(ws.categories[0].tint).toEqual({ frame: '#64a970' });
    expect(ws.siteCategory).toEqual({ 'youtube.com': 'c-vi' });
    expect(ws.rulesOff).toEqual(['site:youtube.com']);
  });

  it('Seite anlegen bereinigt die Domain; Unbrauchbares ändert nichts', () => {
    expect(Ru.cleanDomain('https://www.YouTube.com/watch?v=1')).toBe('youtube.com');
    expect(Ru.cleanDomain('kein domain')).toBe('');
    let ws = base();
    ws = reducer(ws, { type: 'siteCategory', domain: 'docs.google.com', category: '' });
    expect(ws.siteCategory?.['docs.google.com']).toBe('');
    expect(reducer(ws, { type: 'siteCategory', domain: 'x.org', category: 'gibt-es-nicht' })).toBe(ws);
    // ausgeschaltete Regeln gelöschter Kategorien fallen beim Laden weg
    ws = Ru.setRuleOn(ws, 'tint:c-vi', false);
    ws = B.deleteCategory(ws, 'c-vi');
    expect(parseWorkspace(JSON.parse(JSON.stringify(ws)))?.rulesOff).toBeUndefined();
  });
});

describe('F-183 Symbolsatz', () => {
  it('jeder Hilfe-Eintrag hat ein eigenes, vorhandenes Symbol', () => {
    for (const e of H.HELP) {
      expect(Ic.HELP_ICON[e.id], e.id).toBeDefined();
      expect(Ic.ICONS[Ic.HELP_ICON[e.id]], e.id).toBeDefined();
    }
  });
  it('keine Zuordnung ohne Hilfe-Eintrag', () => {
    const ids = new Set(H.HELP.map((e) => e.id));
    for (const id of Object.keys(Ic.HELP_ICON)) expect(ids.has(id), id).toBe(true);
  });
  it('Symbole sind gültige Strichpfade im Raster', () => {
    for (const [n, def] of Object.entries(Ic.ICONS) as [string, Ic.IconDef][]) {
      expect(def.d.length, n).toBeGreaterThan(0);
      for (const d of def.d) expect(/^M[-\d.\s]/.test(d) && !/NaN|undefined/.test(d), `${n}: ${d}`).toBe(true);
    }
    expect(Ic.helpIcon('gibtsnicht')).toBe('help');
  });
});

describe('F-183 Stufe 2', () => {
  it('Kategorie-Zeichen: Vorschlag nach Name, eigene Wahl, zurück auf Vorschlag', () => {
    expect(Ic.categoryIcon({ name: 'Video' })).toBe('catVideo');
    expect(Ic.categoryIcon({ name: 'Mail & Kalender' })).toBe('catMail');
    expect(Ic.categoryIcon({ name: 'Kalender' })).toBe('catCalendar');
    expect(Ic.categoryIcon({ name: 'KI-Werkzeuge' })).toBe('catAi');
    expect(Ic.categoryIcon({ name: 'Irgendwas' })).toBe('category');
    let ws = W.defaultWorkspace();
    ws = B.addCategory(ws, 'c-ed', 'Editor');
    expect(Ic.categoryIcon(ws.categories[0])).toBe('catEditor');
    ws = reducer(ws, { type: 'iconCategory', id: 'c-ed', icon: 'catHeart' });
    expect(Ic.categoryIcon(ws.categories[0])).toBe('catHeart');
    const same = reducer(ws, { type: 'iconCategory', id: 'c-ed', icon: 'catHeart' });
    expect(same).toBe(ws);
    ws = reducer(ws, { type: 'iconCategory', id: 'c-ed', icon: null });
    expect(ws.categories[0].icon).toBeUndefined();
  });
  it('alle Kategorie-Zeichen gibt es im Satz, und gespeicherte Zeichen werden geprüft', () => {
    for (const n of Ic.CATEGORY_ICONS) expect(Ic.ICONS[n], n).toBeDefined();
    let ws = W.defaultWorkspace();
    ws = B.addCategory(ws, 'c-a', 'A');
    ws = B.addCategory(ws, 'c-b', 'B');
    const raw = JSON.parse(JSON.stringify(ws));
    raw.categories[0].icon = 'catMusic';
    raw.categories[1].icon = '<script>';
    const back = parseWorkspace(raw)!;
    expect(back.categories[0].icon).toBe('catMusic');
    expect(back.categories[1].icon).toBeUndefined();
  });
  it('Webseiten-Symbol direkt von der Seite, sonst Anfangsbuchstabe', () => {
    expect(Dis.faviconUrl('https://www.youtube.com/watch?v=1')).toBe('https://www.youtube.com/favicon.ico');
    expect(Dis.faviconUrl('http://localhost:2910/x')).toBe('http://localhost:2910/favicon.ico');
    expect(Dis.faviconUrl('mailto:a@b.de')).toBeNull();
    expect(Dis.faviconUrl('kein Link')).toBeNull();
    expect(Dis.siteLetter('https://www.youtube.com/')).toBe('Y');
    expect(Dis.siteLetter('https://überall.de/')).toBe('Ü');
    expect(Dis.siteHue('https://a.de')).toBe(Dis.siteHue('https://www.a.de/x'));
  });
});

describe('F-186 Fragen als Vorschläge', () => {
  const ids = (q: string) => H.searchQuestions(q, 5).map((h) => h.entry.id);
  it('findet Fragen nach wenigen Buchstaben und mit anderer Wortform', () => {
    expect(ids('wie versch')).toContain('swap');
    expect(ids('portal verschieben')).toContain('swap');
    expect(ids('chrome')[0]).toBe('importBookmarks');
    expect(ids('neuen tab')).toContain('launcher');
  });
  it('zu kurz oder nur Füllwörter: keine Vorschläge', () => {
    expect(H.searchQuestions('wi')).toHaveLength(0);
    expect(H.searchQuestions('wie ich')).toHaveLength(0);
    expect(H.searchQuestions('xyzq')).toHaveLength(0);
  });
  it('Frage, die mit der Eingabe beginnt, steht vorn; höchstens max', () => {
    expect(H.searchQuestions('wie verschiebe', 3)[0].q).toBe('Wie verschiebe ich ein Portal?');
    expect(H.searchQuestions('wie', 2).length <= 2).toBe(true);
  });
  it('Fragewort erkannt; Fragen zählen in der Hilfesuche mit', () => {
    expect(H.asksQuestion('Warum öffnet')).toBe(true);
    expect(H.asksQuestion('wiki')).toBe(false);
    expect(H.searchHelp('verschiebe').map((e) => e.id)).toContain('swap');
  });
  it('jede Frage endet mit ?, keine Frage doppelt', () => {
    const all = H.HELP.flatMap((e) => e.questions ?? []);
    expect(all.length).toBeGreaterThan(40);
    expect(all.every((q) => q.endsWith('?'))).toBe(true);
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('F-170 Slotmaschine', () => {
  const build = () => {
    let ws = W.defaultWorkspace();
    while (ws.panels.length < 3) ws = W.addPanel(ws, LAPTOP1);
    const [a, b, c] = ws.panels.map((p) => p.id);
    ws = W.navigatePanel(ws, a, 'wikipedia.org');
    ws = W.addTab(ws, a, 'example.com'); // a: wikipedia, example (vorn)
    ws = W.navigatePanel(ws, b, 'https://WIKIPEDIA.org/'); // gleiche Seite, andere Schreibweise
    ws = W.navigatePanel(ws, c, 'example.com');
    return { ws, a, b, c };
  };
  it('findet doppelt offene Sources und lässt den sichtbaren Fundort stehen', () => {
    const { ws, a, b } = build();
    const g = Jp.duplicatesOf(ws);
    expect(g).toHaveLength(2);
    const wiki = g.find((x) => x.url.includes('wikipedia'))!;
    // a zeigt example vorn, wikipedia liegt im Hintergrund → b (vorn) bleibt
    expect(wiki.keep.panel).toBe(b);
    expect(wiki.extra.map((h) => h.panel)).toEqual([a]);
    expect(Jp.duplicatesOf(W.defaultWorkspace())).toHaveLength(0);
  });
  it('schließt ganze Portale nur, wenn alle Tabs überzählig sind, und rechnet den Fokus', () => {
    const { ws, a, c } = build();
    const g = Jp.duplicatesOf(ws);
    const all = Jp.cleanupOf(ws, g);
    expect(all.count).toBe(2);
    // example: a (vorn) bleibt, c geht ganz; wikipedia: Tab in a geht
    expect(all.portals).toEqual([c]);
    expect(all.tabs).toHaveLength(1);
    expect(all.tabs[0].panel).toBe(a);
    const f = Jp.cleanupFocus(ws, all);
    expect(f.saved).toBe(1 + F.ruleOf(ws).tabWeight);
    const after = Jp.afterCleanup(ws, all);
    expect(Jp.duplicatesOf(after)).toHaveLength(0);
    // abgewählte Gruppe bleibt offen
    const onlyWiki = Jp.cleanupOf(ws, g, new Set([g.find((x) => x.url.includes('example'))!.key]));
    expect(onlyWiki.portals).toHaveLength(0);
    expect(onlyWiki.count).toBe(1);
  });
  // Stufe 2: Stack mit zwei Portalen, beide vorn wikipedia; b hat dazu example im Hintergrund
  const stack = () => {
    let ws = W.defaultWorkspace();
    const first = W.viewOf(ws, LAPTOP1).slots[0];
    const a = first.front.id;
    ws = W.addPanel(ws, LAPTOP1, first.id);
    const b = ws.panels[ws.panels.length - 1].id;
    ws = W.navigatePanel(ws, a, 'wikipedia.org');
    ws = W.navigatePanel(ws, b, 'wikipedia.org');
    ws = W.addTab(ws, b, 'example.com');
    ws = W.selectTab(ws, b, ws.panels.find((p) => p.id === b)!.tabs[0].id);
    return { ws, a, b };
  };
  it('erkennt redundante Slots und legt sie zusammen', () => {
    const { ws, a, b } = stack();
    const slots = W.viewOf(ws, LAPTOP1).slots;
    const r = Jp.redundantSlotsOf(ws, slots);
    expect(r).toHaveLength(1);
    expect([r[0].keep, ...r[0].others].sort()).toEqual([a, b].sort());
    // wandert example mit, wenn a bleibt; bleibt b, ist nichts zu übernehmen
    expect(r[0].moved).toBe(r[0].keep === a ? 1 : 0);
    const after = Jp.mergeSlot(ws, r[0]);
    expect(after.panels).toHaveLength(ws.panels.length - 1);
    expect(after.panels.find((p) => p.id === r[0].keep)!.tabs.map((t) => t.url).some((u) => u?.includes('example'))).toBe(true);
    expect(Jp.dupCount(after)).toBe(0);
    expect(Jp.redundantSlotsOf(after, W.viewOf(after, LAPTOP1).slots)).toHaveLength(0);
    // zeigt ein Portal etwas anderes, ist der Slot nicht redundant
    const other = W.navigatePanel(ws, a, 'example.org');
    expect(Jp.redundantSlotsOf(other, W.viewOf(other, LAPTOP1).slots)).toHaveLength(0);
  });
  it('Einladung: Grund und Schwelle', () => {
    const { ws } = stack();
    const slots = W.viewOf(ws, LAPTOP1).slots;
    expect(Jp.inviteWhy(ws, slots, 'grün')).toBe('slots');
    expect(Jp.inviteWhy(ws, slots, 'rot')).toBe('red');
    expect(Jp.inviteWhy(W.defaultWorkspace(), [], 'grün')).toBeNull();
    expect(Jp.INVITE_DUPS).toBe(3);
    // Regel ist ab Werk an und steht in der Regelübersicht
    expect(Ru.ruleOn(ws, 'invite')).toBe(true);
  });
  it('Hilfe, Suche und Symbol', () => {
    expect(H.searchHelp('Duplikate')[0].id).toBe('jackpot');
    expect(Ic.HELP_ICON.jackpot).toBe('jackpot');
  });
});

describe('F-51 Layouts je Desk', () => {
  const setup: ScreenSetup = { cls: 'laptop', orientation: 'landscape', lines: 2 };
  const base = (): Workspace => {
    let ws = W.defaultWorkspace();
    ws = { ...ws, panels: [...ws.panels, { ...W.newPanel('Fremd'), win: 'w2' }], windows: [{ id: 'w2', name: 'Desk 2' }] };
    return ws;
  };

  it('ohne Eintrag gibt es genau ein Layout', () => {
    const d = DL.layoutsOf(base());
    expect(d.list).toHaveLength(1);
    expect(d.list[0].name).toBe('Layout 1');
  });

  it('Gleichmäßig legt so viele leere Portale an, wie die Klasse zeigt, und wechselt dorthin', () => {
    const ws = base();
    const before = W.panelsIn(ws.panels).map((p) => p.id);
    const next = DL.addLayout(ws, '', setup, 'even');
    const mine = W.panelsIn(next.panels);
    expect(mine).toHaveLength(4);
    expect(mine.some((p) => before.includes(p.id))).toBe(false);
    expect(W.panelsIn(next.panels, 'w2')).toHaveLength(1);
    const d = DL.layoutsOf(next);
    expect(d.list).toHaveLength(2);
    expect(d.active).toBe(d.list[1].id);
    expect(d.list[0].saved!.panels.map((p) => p.id)).toEqual(before);
  });

  it('Wechseln speichert automatisch: Änderungen bleiben, beim Zurückwechseln ist alles wieder da', () => {
    let ws = DL.addLayout(base(), '', setup, 'even');
    const first = DL.layoutsOf(ws).list[0].id;
    const second = DL.layoutsOf(ws).active;
    ws = W.renamePanel(ws, W.panelsIn(ws.panels)[0].id, 'Geändert');
    ws = DL.switchLayout(ws, '', first);
    expect(W.panelsIn(ws.panels).map((p) => p.name)).toEqual(['Portal 1', 'Portal 2', 'Portal 3']);
    ws = DL.switchLayout(ws, '', second);
    expect(W.panelsIn(ws.panels)[0].name).toBe('Geändert');
  });

  it('andere Desks bleiben unberührt, Anordnung je Desk wandert mit', () => {
    let ws = base();
    const s2: ScreenSetup = { ...setup, win: 'w2' };
    ws = W.addPanel(ws, s2);
    W.viewOf(ws, s2);
    const w2Keys = Object.keys(ws.layouts).filter((k) => k.startsWith('w2/'));
    ws = DL.addLayout(ws, 'w2', s2, 'even');
    expect(W.panelsIn(ws.panels)).toHaveLength(3);
    expect(W.panelsIn(ws.panels, 'w2')).toHaveLength(4);
    expect(W.panelsIn(ws.panels, 'w2').every((p) => p.win === 'w2')).toBe(true);
    const saved = DL.layoutsOf(ws, 'w2').list[0].saved!;
    expect(Object.keys(saved.layouts)).toEqual(w2Keys.map((k) => k.slice(3)));
    expect(saved.panels.every((p) => p.win === undefined)).toBe(true);
  });

  it('Kopie der aktuellen Belegung bekommt neue Ids, gleiche Namen', () => {
    const ws = base();
    const next = DL.addLayout(ws, '', setup, 'current');
    const a = DL.layoutsOf(next).list[0].saved!.panels;
    const b = W.panelsIn(next.panels);
    expect(b.map((p) => p.name)).toEqual(a.map((p) => p.name));
    expect(b.some((p) => a.some((q) => q.id === p.id))).toBe(false);
    expect(DL.layoutsOf(next).list[1].name).toBe('Layout 1 (Kopie)');
  });

  it('umbenennen, kopieren, löschen mit Rückgängig; das letzte bleibt', () => {
    let ws = DL.addLayout(base(), '', setup, 'even');
    const [l1, l2] = DL.layoutsOf(ws).list;
    ws = DL.renameLayout(ws, '', l2.id, 'Recherche');
    expect(DL.renameLayout(ws, '', l1.id, 'Recherche')).toBe(ws);
    ws = DL.copyLayout(ws, '', l2.id);
    expect(DL.layoutsOf(ws).list.map((l) => l.name)).toEqual(['Layout 1', 'Recherche', 'Recherche (Kopie)']);
    const { ws: after, deleted } = DL.deleteLayout(ws, '', l2.id);
    expect(DL.activeLayout(after).id).toBe(l1.id);
    expect(W.panelsIn(after.panels).map((p) => p.name)).toEqual(['Portal 1', 'Portal 2', 'Portal 3']);
    const back = DL.restoreLayout(after, deleted!);
    expect(DL.layoutsOf(back).list.map((l) => l.name)).toEqual(['Layout 1', 'Recherche', 'Recherche (Kopie)']);
    const only = DL.deleteLayout(DL.deleteLayout(after, '', DL.layoutsOf(after).list[1].id).ws, '', l1.id);
    expect(only.deleted).toBeNull();
  });

  it('Slot-Namen wandern mit dem Layout', () => {
    let ws = base();
    const v = W.viewOf(ws, setup);
    ws = W.placePanels(ws, setup, [v.slots[1].front.id], v.slots[0].id);
    ws = W.ensureAreaNames(ws, setup);
    const names = ws.areaNames.length;
    expect(names).toBeGreaterThan(0);
    ws = DL.addLayout(ws, '', setup, 'even');
    expect(ws.areaNames).toHaveLength(0);
    ws = DL.switchLayout(ws, '', DL.layoutsOf(ws).list[0].id);
    expect(ws.areaNames).toHaveLength(names);
  });

  it('leerer Zusatz-Desk mit gespeichertem Layout wechselt dorthin, statt wegzufallen', () => {
    const s2: ScreenSetup = { ...setup, win: 'w2' };
    let ws = DL.addLayout(base(), 'w2', s2, 'even');
    for (const p of W.panelsIn(ws.panels, 'w2')) ws = reducer(ws, { type: 'remove', id: p.id, setup: s2 });
    expect(ws.windows.some((w) => w.id === 'w2')).toBe(true);
    expect(W.panelsIn(ws.panels, 'w2').map((p) => p.name)).toEqual(['Fremd']);
    expect(DL.layoutsOf(ws, 'w2').list).toHaveLength(1);
  });

  it('Speichern und Laden behält gespeicherte Layouts und ihre Sammlungen', () => {
    let ws = DL.addLayout(base(), '', setup, 'even');
    const old = DL.layoutsOf(ws).list[0].saved!.panels[0].id;
    ws = { ...ws, bookmarks: [{ id: 'b', title: 'x', url: 'https://x.de', category: '', tags: [], panels: [old] }] };
    const back = parseWorkspace(JSON.parse(JSON.stringify(ws)))!;
    expect(DL.layoutsOf(back).list).toHaveLength(2);
    expect(back.bookmarks[0].panels).toEqual([old]);
    const desk2Gone = Win.syncWindows({ ...back, panels: W.panelsIn(back.panels), deskLayouts: { ...back.deskLayouts, w2: { active: 'first', list: [{ id: 'first', name: 'Eigen' }] } } });
    expect(desk2Gone.deskLayouts?.w2).toBeUndefined();
  });
});

describe('F-52 Standard je Gerät und Grenzen aufheben', () => {
  const setup: ScreenSetup = { cls: 'laptop', orientation: 'landscape', lines: 2 };
  const base = (): Workspace => ({ ...W.defaultWorkspace(), panels: [...W.defaultWorkspace().panels.slice(0, 2), { ...W.newPanel('Fremd'), win: 'w2' }], windows: [{ id: 'w2', name: 'Desk 2' }] });

  it('ohne Standard bekommt ein neuer Desk „Gleichmäßig“', () => {
    const ws = base();
    const next = reducer(ws, { type: 'addDesk', win: 'w3', std: DL.standardContent(ws, null, setup) });
    expect(W.panelsIn(next.panels, 'w3')).toHaveLength(4);
    expect(next.windows.some((w) => w.id === 'w3')).toBe(true);
    expect(DL.activeLayout(next, 'w3').name).toBe('Gleichmäßig');
  });

  it('mit Standard bekommt ein neuer Desk eine Kopie davon (neue Ids)', () => {
    let ws = DL.addLayout(base(), '', setup, 'even', 'Recherche');
    ws = W.renamePanel(ws, W.panelsIn(ws.panels)[0].id, 'Suche');
    const ref = { win: '', id: DL.layoutsOf(ws).active };
    const next = reducer(ws, { type: 'addDesk', win: 'w3', std: DL.standardContent(ws, ref, setup) });
    const mine = W.panelsIn(next.panels, 'w3');
    expect(mine[0].name).toBe('Suche');
    expect(mine.some((p) => W.panelsIn(next.panels).some((q) => q.id === p.id))).toBe(false);
    expect(DL.activeLayout(next, 'w3').name).toBe('Recherche');
    // nicht aktives Layout als Standard
    const other = DL.standardContent(ws, { win: '', id: DL.layoutsOf(ws).list[0].id }, setup);
    expect(other.content.panels.map((p) => p.name)).toEqual(['Portal 1', 'Portal 2']);
    // verschwundener Verweis = Gleichmäßig
    expect(DL.standardContent(ws, { win: 'weg', id: 'x' }, setup).name).toBe('Gleichmäßig');
  });

  it('Auf Standard zurücksetzen ersetzt nur das aktive Layout dieses Desks, Rückgängig holt es zurück', () => {
    const ws = base();
    const std = DL.standardContent(ws, null, setup);
    const { ws: after, undo } = DL.resetToStandard(ws, '', std);
    expect(W.panelsIn(after.panels)).toHaveLength(4);
    expect(W.panelsIn(after.panels, 'w2').map((p) => p.name)).toEqual(['Fremd']);
    const back = DL.undoReset(after, '', undo);
    expect(W.panelsIn(back.panels).map((p) => p.name)).toEqual(['Portal 1', 'Portal 2']);
  });

  it('Grenze: NewSlot bis doppelt so viele, Automatik bei der Empfehlung', () => {
    expect(specOf({ ...setup, capacity: 8 }).max).toBe(8);
    expect(specOf({ ...setup, capacity: 8 }).capacity).toBe(4);
    expect(specOf(setup).max).toBe(4);
  });

  it('mehr Slots als die Klasse bleiben stehen, wenn die Grenzen wieder an sind', () => {
    let ws = W.defaultWorkspace();
    const wide = { ...setup, capacity: 8 };
    expect(W.canAddArea(W.addPanel(ws, wide), wide)).toBe(true);
    while (W.viewOf(ws, wide).slots.length < 6) ws = W.addArea(ws, wide, 'right');
    expect(W.viewOf(ws, wide).slots).toHaveLength(6);
    // Automatik bleibt unter der Empfehlung: ein neues Portal kommt in den Stack
    expect(W.viewOf(W.addPanel(ws, wide), wide).slots).toHaveLength(6);
    const keyed = { ...ws, layouts: { ...ws.layouts } };
    expect(W.viewOf(keyed, setup).slots).toHaveLength(6);
    expect(W.canAddArea(keyed, setup)).toBe(false);
    // Auf die empfohlene Zahl zurück, Rückgängig stellt her
    const fit = W.fitSlots(ws, wide);
    expect(W.viewOf(fit, wide).slots).toHaveLength(4);
    expect(W.viewOf(W.setArrangement(fit, wide, W.viewOf(ws, wide).arrangement!), wide).slots).toHaveLength(6);
  });

  it('Desk auflösen mit Bestätigung nimmt die gespeicherten Layouts mit', () => {
    const s2: ScreenSetup = { ...setup, win: 'w2' };
    const ws = DL.addLayout(base(), 'w2', s2, 'even');
    const kept = reducer(ws, { type: 'returnAll', win: 'w2' });
    expect(kept.windows.some((w) => w.id === 'w2')).toBe(true);
    const gone = reducer(ws, { type: 'returnAll', win: 'w2', dissolve: true });
    expect(gone.windows.some((w) => w.id === 'w2')).toBe(false);
    expect(gone.deskLayouts?.w2).toBeUndefined();
    expect(W.panelsIn(gone.panels).length).toBe(6);
  });
});
