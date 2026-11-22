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
  it('Standard: dunkel mit Portfolio-Rot; Chakren-Farben und Windows-Blau stehen zur Wahl', () => {
    const ws = W.defaultWorkspace();
    expect(ws.look).toEqual({ theme: 'dark', accent: '#e4522c' });
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
