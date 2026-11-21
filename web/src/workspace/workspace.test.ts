import { describe, expect, it } from 'vitest';
import { type ScreenSetup, detectScreen, specOf } from './screen';
import * as T from './tree';
import { parseWorkspace } from './storage';
import type { Workspace } from './types';
import * as X from './transfer';
import * as W from './workspace';

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

/** Platz eines Panels in einer Einstellung. */
const P = (ws: Workspace, setup: ScreenSetup, id: string) => W.placeOf(W.viewOf(ws, setup), id)!;
const rectOf = (ws: Workspace, setup: ScreenSetup, id: string) => T.rects(W.viewOf(ws, setup).tree).get(P(ws, setup, id))!;
/** Sichtbare Panels in Lesereihenfolge. */
const fronts = (ws: Workspace, setup: ScreenSetup) => {
  const v = W.viewOf(ws, setup);
  return T.readingOrder(v.tree).map((id) => v.arrangement!.places[id].front);
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
  it('Smartphone: alle Panels liegen auf einem Platz', () => {
    const v = W.viewOf(W.defaultWorkspace(), PHONE);
    expect(v.slots).toHaveLength(1);
    expect(v.slots[0].panels).toHaveLength(3);
  });

  it('ist der Bildschirm voll, kommt das neue Panel auf den Platz ganz rechts und wird angezeigt', () => {
    let ws = addN(W.defaultWorkspace(), LAPTOP1, 1); // 4 Panels nebeneinander
    const right = W.viewOf(ws, LAPTOP1).slots.find((s) => close(s.rect.x + s.rect.w, 1))!;
    ws = W.addPanel(ws, LAPTOP1);
    const v = W.viewOf(ws, LAPTOP1);
    expect(v.slots).toHaveLength(4);
    const after = v.slots.find((s) => s.id === right.id)!;
    expect(after.panels.map((m) => m.id)).toEqual([right.front.id, ws.panels[4].id]);
    expect(after.front.id).toBe(ws.panels[4].id);
  });

  it('F-09: an jedem Platz lässt sich ein Panel obendrauf legen', () => {
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

  it('nimmt bis zu 9 Panels je Platz auf (F-26), insgesamt bleibt die Zahl frei', () => {
    const ws = addN(W.defaultWorkspace(), LAPTOP2, 20);
    const v = W.viewOf(ws, LAPTOP2);
    expect(v.slots).toHaveLength(4);
    expect(Math.max(...v.slots.map((s) => s.panels.length))).toBe(W.STACK_MAX);
    expect(W.stackFull(ws, LAPTOP2)).toBe(true);
    // Ein anderer Platz nimmt weiter Panels auf, ein größerer Bildschirm auch.
    const other = v.slots.find((s) => s.panels.length === 1)!;
    expect(W.stackFull(ws, LAPTOP2, other.id)).toBe(false);
    const big = addN(ws, MONITOR2, 2);
    expect(big.panels.length).toBe(ws.panels.length + 2);
  });

  it('wechselt vor und zurück, am Ende geht es vorne weiter', () => {
    let ws = W.defaultWorkspace();
    const ids = ws.panels.map((p) => p.id);
    const place = W.viewOf(ws, PHONE).slots[0].id;
    ws = W.setStackFront(ws, PHONE, ids[0]);
    ws = W.stepStack(ws, PHONE, place, 1);
    expect(W.viewOf(ws, PHONE).slots[0].front.id).toBe(ids[1]);
    ws = W.stepStack(ws, PHONE, place, -2);
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

  it('ergibt beim erneuten Anzeigen dieselben Plätze (Seiten laden nicht neu)', () => {
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
  it('beim Schließen ohne Stapel übernimmt der Nachbar den Platz', () => {
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

  it('F-13 Splitscreen wählt das aktive und die folgenden Plätze', () => {
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
    // Smartphone: ein Platz, alles im Stapel.
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
    expect(X.FILE_VERSION).toBe(2);
  });

  it('Bereich und Szenario bleiben erhalten (F-116, vorbereitet)', () => {
    const ws = W.defaultWorkspace();
    const withAreas: Workspace = {
      ...ws,
      areas: [{ id: 'privat', name: 'Privat' }],
      scenarios: [{ id: 'recherche', name: 'Recherche' }],
      panels: ws.panels.map((p, i) => (i === 0 ? { ...p, area: 'privat', scenario: 'recherche' } : p)),
    };
    const back = parseWorkspace(JSON.parse(JSON.stringify(withAreas)))!;
    expect(back).toEqual(withAreas);
  });

  it('gespeicherte Anordnung mit Plätzen bleibt beim Laden erhalten', () => {
    const ws = addN(W.defaultWorkspace(), LAPTOP1, 3);
    const back = parseWorkspace(JSON.parse(JSON.stringify(ws)))!;
    expect(back).toEqual(ws);
  });
});
