import { describe, expect, it } from 'vitest';
import { type ScreenSetup, detectScreen, specOf } from './screen';
import * as T from './tree';
import * as Plan from './sitePlan';
import * as NT from './noteTree';
import * as NL from './notesLayouts';
import * as RS from './ruleSet';
import * as NLo from './notes';
import * as NLp from './pads';
import { parsePadDesks } from './noteObjects';
import { keepDeviceFields, onlyDeviceChanged, parseWorkspace } from './storage';
import type { Note, Workspace } from './types';
import * as X from './transfer';
import * as B from './bookmarks';
import * as Pz from './pause';
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
import * as Pj from './projects';
import * as Sc from './schedule';
import * as Psp from './psp';
import * as Sp from './sampleProject';
import * as Sm from './samples';
import * as Gt from './gantt';
import * as Fb from './feedback';
import * as Dc from './decisions';
import * as Prep from './prepare';
import * as Rk from './risks';
import * as Terms from './terms';
import * as Rs from './reset';
import * as Zm from './zoom';
import * as C from './cycle';
import * as Cl from './closed';
import * as La from './launcher';
import * as BB from './browserBookmarks';
import * as SH from './sortHelp';
import * as Pr from './profile';
import * as Gi from './gist';
import * as Wc from './welcome';
import * as Up from './update';
import * as Br from './browser';
import * as Ti from './tint';
import * as Ca from './category';
import * as Ru from './rules';
import * as DL from './deskLayouts';
import * as Ic from './icons';
import * as Dis from './display';
import * as DM from './deskMode';
import * as SF from './slotFile';
import * as Pk from './picker';
import * as Jp from './jackpot';
import * as Ar from './arrange';
import * as Dv from './dev';
import * as Cs from './cases';
import * as Pa from './pause';
import * as Web from './websearch';
import * as Snd from './send';
import * as Rc from './recent';
import * as No from './notes';
import * as Rm from './remind';
import * as Pd from './pads';
import * as FR from './focusRing';
import * as ND from './noteDoc';
import * as Sh from './sheets';
import * as BT from './boardTemplates';
import * as SP from './sheetPrefs';

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
    const rn = X.readTransferFile(JSON.stringify(neuer));
    expect(rn.ok).toBe(false);
    if (!rn.ok) expect(rn.newer).toBe(true);
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
    expect(X.FILE_VERSION).toBe(13);
  });

  it('Bereich und Szenario bleiben erhalten (F-116, vorbereitet)', () => {
    const ws = W.defaultWorkspace();
    const withAreas: Workspace = {
      ...ws,
      spheres: [{ id: 'privat', name: 'Privat' }],
      scenarios: [{ id: 'recherche', name: 'Recherche', space: 'privat' }],
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
    // F-201: YouTube-Player zum Einbetten ist erlaubt, die normale Seite nicht
    expect(W.isBlocked(ws, 'https://www.youtube.com/embed/q5PG_ThiWf4')).toBe(false);
    expect(W.isBlocked(ws, 'https://www.youtube-nocookie.com/embed/abc')).toBe(false);
    expect(W.isBlocked(ws, 'https://www.youtube.com/watch?v=q5PG_ThiWf4')).toBe(true);
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

  it('F-210: neuer Slot links am Desk-Rand bzw. direkt unter einem Slot (halbiert ihn)', () => {
    const ws = W.defaultWorkspace();
    const left = W.addArea(ws, LAPTOP2, 'left');
    const l = W.viewOf(left, LAPTOP2).slots.find((s) => s.front.id === left.panels[left.panels.length - 1].id)!;
    expect(close(l.rect.x, 0) && close(l.rect.h, 1)).toBe(true);
    const v = W.viewOf(ws, LAPTOP2);
    const target = v.slots[0];
    const under = W.addArea(ws, LAPTOP2, 'bottom', target.id);
    const u = W.viewOf(under, LAPTOP2).slots.find((s) => s.front.id === under.panels[under.panels.length - 1].id)!;
    expect(close(u.rect.x, target.rect.x) && close(u.rect.w, target.rect.w) && close(u.rect.h, target.rect.h / 2)).toBe(true);
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
      spheres: [{ id: 'job', name: 'Beruf' }],
      scenarios: [{ id: 's1', name: 'Bewerbung', space: 'job' }],
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

  it('F-190: Desk gilt als weg, sobald alles zurück ist – der Main Desk nie', () => {
    const ws = firstIn('w2');
    expect(Win.deskGone(ws, 'w2')).toBe(false);
    expect(Win.deskGone(Win.returnAll(ws, 'w2'), 'w2')).toBe(true);
    expect(Win.deskGone(ws, 'unbekannt')).toBe(true);
    expect(Win.deskGone(Win.returnAll(ws, 'w2'), '')).toBe(false);
  });

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

describe('F-169 (f) Tour „Abgleich einrichten“ (V59)', () => {
  it('läuft im Dialog dialog.sync, eigener Merker, in der Suche', () => {
    const y = Tour.TOURS.sync;
    expect(y.filter((s) => s.target).every((s) => (s.target ?? '').startsWith('dialog.sync'))).toBe(true);
    expect(new Set(y.map((s) => s.id)).size).toBe(y.length);
    expect(y.every((s) => s.text.trim().length > 20)).toBe(true);
    expect(Tour.TOUR_KEY.sync).toBe('esource.tour.sync.v1');
    expect(H.searchHelp('Tour Abgleich')[0].id).toBe('tourSync');
  });
  it('vor dem Verbinden die drei Schritte, verbunden Zustand und Knöpfe', () => {
    const y = Tour.TOURS.sync;
    const before = Tour.tourSteps((sel) => !sel.includes('sync__state') && !sel.includes('sync__btns'), y).map((s) => s.id);
    expect(before).toEqual(['intro', 'account', 'token', 'paste', 'privacy', 'manual', 'devices', 'again']);
    const after = Tour.tourSteps((sel) => sel.includes('sync__state') || sel.includes('sync__btns'), y).map((s) => s.id);
    expect(after).toEqual(['intro', 'state', 'buttons', 'devices', 'again']);
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
    expect(inDialog).toEqual(['intro', 'export', 'summary', 'how', 'go', 'sort', 'sendToo']);
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
    expect(Pr.initialsOf('Fr. Stanczak – Leitung Buchhaltung (CG)')).toBe('S');
    expect(Pr.initialsOf('Lackiermeister/in (CG, n. N.)')).toBe('L');
    expect(Pr.initialsOf('Hr. Meier – Geschäftsführer FIT GmbH (CG)')).toBe('M');
    expect(Pr.greetingFor(7, 'Enrico')).toBe('Guten Morgen, Enrico');
    expect(Pr.greetingFor(13)).toBe('Guten Tag');
    expect(Pr.greetingFor(8)).toBe('Guten Morgen');
    expect(Pr.greetingFor(9)).toBe('Guten Tag');
    expect(Pr.greetingFor(16)).toBe('Guten Tag');
    expect(Pr.greetingFor(17)).toBe('Guten Abend');
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
    // F-192: neue Zeichen nach Name, ohne Fehlgriffe in längeren Wörtern
    expect(Ic.categoryIcon({ name: 'Sport' })).toBe('catSport');
    expect(Ic.categoryIcon({ name: 'Zeitung' })).toBe('catNews');
    expect(Ic.categoryIcon({ name: 'Rezepte' })).toBe('catFood');
    expect(Ic.categoryIcon({ name: 'Datenbank' })).toBe('catDatabase');
    expect(Ic.CATEGORY_ICONS.every((o) => !!Terms.CATEGORY_ICON_LABEL[o])).toBe(true);
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

describe('F-187 Layouts im Cockpit', () => {
  const setup: ScreenSetup = { cls: 'laptop', orientation: 'landscape', lines: 2 };
  /** Main Desk mit zwei Layouts: aktiv „Gleichmäßig“ (4 Slots), daneben das alte (6 Slots, 2 über der Empfehlung). */
  const two = (): { ws: Workspace; old: string; even: string } => {
    const wide = { ...setup, capacity: 8 };
    let ws = W.defaultWorkspace();
    ws = W.addPanel(ws, wide);
    while (W.viewOf(ws, wide).slots.length < 6) ws = W.addArea(ws, wide, 'right');
    const old = DL.activeLayout(ws).id;
    ws = DL.addLayout(ws, '', setup, 'even');
    return { ws, old, even: DL.activeLayout(ws).id };
  };

  it('zeigt auch ein nicht aktives Layout an, ohne die Arbeitsfläche zu ändern', () => {
    const { ws, old, even } = two();
    const v = DL.layoutView(ws, '', old, setup);
    expect(v.slots).toHaveLength(6);
    expect(v.recommended).toBe(4);
    expect(v.slots.filter((s) => s.over)).toHaveLength(2);
    expect(DL.layoutView(ws, '', even, setup).slots.filter((s) => s.over)).toHaveLength(0);
    expect(DL.activeLayout(ws).id).toBe(even);
  });

  it('Slots tauschen und schließen geht im nicht aktiven Layout; das aktive bleibt unberührt', () => {
    const { ws, old, even } = two();
    const before = DL.layoutView(ws, '', old, setup).slots;
    const swapped = reducer(ws, { type: 'layoutSlotSwap', win: '', id: old, setup, a: before[0].id, b: before[1].id });
    const after = DL.layoutView(swapped, '', old, setup).slots;
    expect(after[0].id).toBe(before[1].id);
    expect(W.panelsIn(swapped.panels).map((p) => p.id)).toEqual(W.panelsIn(ws.panels).map((p) => p.id));
    const last = before[before.length - 1];
    const closed = reducer(ws, { type: 'layoutSlotClose', win: '', id: old, setup, area: last.id });
    const v = DL.layoutView(closed, '', old, setup);
    expect(v.slots).toHaveLength(5);
    expect(v.portals).toBe(DL.layoutView(ws, '', old, setup).portals);
    expect(DL.activeLayout(closed).id).toBe(even);
    // Rückgängig
    const undo = reducer(closed, { type: 'layoutContent', win: '', id: old, content: DL.contentOf(ws, '', old)! });
    expect(DL.layoutView(undo, '', old, setup).slots).toHaveLength(6);
  });

  it('Slot schließen im aktiven Layout legt die Portale auf den Nachbarn', () => {
    const { ws, even } = two();
    const s = DL.layoutView(ws, '', even, setup).slots;
    const next = DL.closeLayoutSlot(ws, '', even, setup, s[1].id)!;
    const v = DL.layoutView(next, '', even, setup);
    expect(v.slots).toHaveLength(3);
    expect(v.slots[0].count).toBe(2);
  });

  it('der letzte Slot lässt sich nicht schließen', () => {
    const ws = W.defaultWorkspace();
    const id = DL.activeLayout(ws).id;
    const s = DL.layoutView(ws, '', id, setup).slots;
    if (s.length === 1) expect(DL.closeLayoutSlot(ws, '', id, setup, s[0].id)).toBeNull();
    else {
      let w: Workspace | null = ws;
      for (const x of s.slice(1)) w = w && DL.closeLayoutSlot(w, '', id, setup, x.id);
      expect(DL.closeLayoutSlot(w!, '', id, setup, DL.layoutView(w!, '', id, setup).slots[0].id)).toBeNull();
    }
  });
});

describe('F-187 Stufe 2 Anordnung im Layout-Modus', () => {
  const setup: ScreenSetup = { cls: 'laptop', orientation: 'landscape', lines: 2 };
  const phone: ScreenSetup = { cls: 'phone', orientation: 'portrait', lines: 1 };
  const two = () => {
    let ws = W.defaultWorkspace();
    ws = W.addPanel(ws, setup);
    ws = W.addPanel(ws, setup);
    ws = W.addPanel(ws, setup);
    const old = DL.activeLayout(ws).id;
    ws = DL.addLayout(ws, '', setup, 'even');
    return { ws, old };
  };

  it('Größe im nicht aktiven Layout ändern; nur diese Einstellung ändert sich', () => {
    const { ws, old } = two();
    const v = DL.layoutView(ws, '', old, setup);
    const leaf = v.slots[0].id;
    const tree = T.resizeEdges(v.tree!, leaf, { x: 'right', dx: 0.1 }, W.DEFAULT_MIN);
    const next = reducer(ws, { type: 'layoutArrange', win: '', id: old, setup, op: { kind: 'tree', tree } });
    const after = DL.layoutView(next, '', old, setup);
    expect(after.slots.find((s) => s.id === leaf)!.rect.w).toBeGreaterThan(v.slots[0].rect.w + 0.05);
    expect(JSON.stringify(DL.layoutView(next, '', old, { ...setup, orientation: 'portrait' }).tree)).toBe(JSON.stringify(DL.layoutView(ws, '', old, { ...setup, orientation: 'portrait' }).tree));
    // Aktives Layout bleibt unberührt
    expect(JSON.stringify(next.layouts)).toBe(JSON.stringify(ws.layouts));
  });

  it('gewähltes Gerät: Empfehlung folgt, Slot anlegen über der Empfehlung verteilt gleich', () => {
    const { ws, old } = two();
    expect(DL.layoutView(ws, '', old, phone).recommended).toBe(1);
    expect(DL.slotsMax(phone)).toBe(2);
    const next = reducer(ws, { type: 'layoutArrange', win: '', id: old, setup: phone, op: { kind: 'add', side: 'bottom', even: true } });
    const v = DL.layoutView(next, '', old, phone);
    expect(v.slots).toHaveLength(2);
    expect(v.slots.filter((s) => s.over)).toHaveLength(1);
    expect(Math.abs(v.slots[0].rect.h - 0.5)).toBe(0);
    // Höchstzahl erreicht: nichts mehr
    const again = reducer(next, { type: 'layoutArrange', win: '', id: old, setup: phone, op: { kind: 'add', side: 'bottom', even: true } });
    expect(DL.layoutView(again, '', old, phone).slots).toHaveLength(2);
  });

  it('Gleich verteilen und Einsetzen am Rand (Ziehen und Alt+Pfeil)', () => {
    const { ws, old } = two();
    const v = DL.layoutView(ws, '', old, setup);
    const [a, b] = v.slots;
    const docked = T.drop(v.tree!, a.id, T.AREA, 'bottom');
    let next = reducer(ws, { type: 'layoutArrange', win: '', id: old, setup, op: { kind: 'tree', tree: docked } });
    const r = DL.layoutView(next, '', old, setup).slots.find((s) => s.id === a.id)!.rect;
    expect(r.w).toBe(1);
    next = reducer(next, { type: 'layoutArrange', win: '', id: old, setup, op: { kind: 'even' } });
    expect(Ar.sameTree(T.equalize(DL.layoutView(next, '', old, setup).tree!), DL.layoutView(next, '', old, setup).tree)).toBe(true);
    const step = Ar.arrangeStep(v.tree!, a.id, 'ArrowRight', false, W.DEFAULT_MIN, a.title);
    expect(Ar.sameTree(step.next, v.tree)).toBe(false);
    expect(T.rects(step.next).get(a.id)!.x).toBeGreaterThan(T.rects(step.next).get(b.id)!.x);
  });

  it('Hilfsrechnungen: nächster Rand und Nachbar', () => {
    expect(Ar.nearestSide(5, 50, { left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 })).toEqual(['left', 5]);
    expect(Ar.nearestSide(50, 90, { left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 }, true)[0]).toBe('bottom');
    const rects = new Map([['a', { x: 0, y: 0, w: 0.5, h: 1 }], ['b', { x: 0.5, y: 0, w: 0.5, h: 1 }]]);
    expect(Ar.neighbourLeaf(rects, 'a', 1, 0)).toBe('b');
    expect(Ar.neighbourLeaf(rects, 'a', -1, 0)).toBeNull();
  });
});

describe('F-06 Portale pausieren', () => {
  const vis = (...k: string[]) => new Set(k);
  it('merkt Sichtbares und seit wann es verdeckt ist; Unbekanntes fällt weg', () => {
    let s = Pa.track({}, vis('a'), ['a', 'b'], 1000);
    expect(s).toEqual({ a: null });
    s = Pa.track(s, vis('b'), ['a', 'b'], 2000);
    expect(s).toEqual({ a: 2000, b: null });
    const same = Pa.track(s, vis('b'), ['a', 'b'], 9000);
    expect(same).toBe(s);
    expect(Pa.track(s, vis('b'), ['b'], 3000)).toEqual({ b: null });
  });
  it('lädt Unbekanntes erst beim Ansehen und pausiert nach der eingestellten Zeit', () => {
    const s: Pa.Seen = { a: 0, b: null };
    expect(Pa.awake(s, 'c', vis(), 1000, 10)).toBe(false);
    expect(Pa.awake(s, 'c', vis('c'), 1000, 10)).toBe(true);
    expect(Pa.awake(s, 'b', vis(), 1000, 10)).toBe(true);
    expect(Pa.awake(s, 'a', vis(), 9 * 60_000, 10)).toBe(true);
    expect(Pa.awake(s, 'a', vis(), 10 * 60_000, 10)).toBe(false);
    expect(Pa.awake(s, 'a', vis(), 10 * 60_000, 10, true)).toBe(true);
    expect(Pa.awake(s, 'c', vis(), 10 * 60_000, 0)).toBe(true);
  });
  it('sichtbar sind das gezeigte Portal und sein aktiver Tab', () => {
    const p = { id: 'p', name: 'P', tabs: [{ id: 't1' }, { id: 't2' }], activeTab: 't2' };
    expect([...Pa.visibleKeys([p])]).toEqual(['p', 'p/t2']);
    expect(Pa.keysOf(p)).toEqual(['p', 'p/t1', 'p/t2']);
  });
  it('Einstellung und „Nicht pausieren“ über den Reducer, gespeichert und wieder gelesen', () => {
    let ws = W.defaultWorkspace();
    const id = ws.panels[0].id;
    expect(Pa.pauseMinutes(ws)).toBe(Pa.PAUSE_DEFAULT);
    ws = reducer(ws, { type: 'pause', minutes: 30 });
    expect(ws.pause).toBe(30);
    expect(reducer(ws, { type: 'pause', minutes: 7 })).toBe(ws);
    ws = reducer(ws, { type: 'keepPanel', id });
    expect(ws.panels[0].keep).toBe(true);
    const back = parseWorkspace(JSON.parse(JSON.stringify(ws)))!;
    expect(back.pause).toBe(30);
    expect(back.panels[0].keep).toBe(true);
    ws = reducer(reducer(ws, { type: 'keepPanel', id }), { type: 'pause', minutes: Pa.PAUSE_DEFAULT });
    expect(ws.panels[0].keep).toBeUndefined();
    expect(ws.pause).toBeUndefined();
  });
});

describe('F-06 Stufe 2: sichtbare Portale, Ausnahme je Tab', () => {
  const base = { now: 10 * 60_000, minutes: 5, keep: false, active: false, manual: false };
  it('sichtbares Portal schläft nach der Zeit ohne Benutzung, nie das aktive, von Hand sofort', () => {
    expect(Pa.dozing({ ...base, used: 6 * 60_000 })).toBe(false);
    expect(Pa.dozing({ ...base, used: 5 * 60_000 })).toBe(true);
    expect(Pa.dozing({ ...base, used: 0, active: true })).toBe(false);
    expect(Pa.dozing({ ...base, used: 0, minutes: 0 })).toBe(false);
    expect(Pa.dozing({ ...base, used: undefined })).toBe(false);
    expect(Pa.dozing({ ...base, used: base.now, manual: true, active: true, minutes: 0 })).toBe(true);
    expect(Pa.dozing({ ...base, used: 0, manual: true, keep: true })).toBe(false);
  });
  it('merkt Benutzung: neu Sichtbares bekommt „jetzt“, Verschwundenes fällt weg', () => {
    let u = Pa.trackUse({}, ['a', 'b'], 100);
    expect(u).toEqual({ a: 100, b: 100 });
    expect(Pa.trackUse(u, ['a', 'b'], 900)).toBe(u);
    u = Pa.trackUse(u, ['b', 'c'], 900);
    expect(u).toEqual({ b: 100, c: 900 });
  });
  it('Einstellung und „Nicht pausieren“ je Tab über den Reducer, gespeichert und wieder gelesen', () => {
    let ws = W.defaultWorkspace();
    const p = ws.panels[0];
    expect(Pa.shownMinutes(ws)).toBe(Pa.SHOWN_DEFAULT);
    ws = reducer(ws, { type: 'pauseShown', minutes: 120 });
    expect(ws.pauseShown).toBe(120);
    expect(reducer(ws, { type: 'pauseShown', minutes: 7 })).toBe(ws);
    ws = reducer(ws, { type: 'keepTab', id: p.id, tab: p.activeTab });
    expect(Pa.keepTabOf(ws.panels[0], p.activeTab)).toBe(true);
    expect(ws.panels[0].keep).toBeUndefined();
    const back = parseWorkspace(JSON.parse(JSON.stringify(ws)))!;
    expect(back.pauseShown).toBe(120);
    expect(back.panels[0].tabs[0].keep).toBe(true);
    ws = reducer(reducer(ws, { type: 'keepTab', id: p.id, tab: p.activeTab }), { type: 'pauseShown', minutes: Pa.SHOWN_DEFAULT });
    expect(ws.panels[0].tabs[0].keep).toBeUndefined();
    expect(ws.pauseShown).toBeUndefined();
    expect(Pa.keepTabOf({ keep: true, tabs: [{ id: 'x' }] }, 'x')).toBe(true);
  });
});

describe('F-189 Web-Suche', () => {
  it('erkennt Adressen und Suchwörter', () => {
    for (const a of ['wikipedia.org', 'https://x.de/a?b=1', 'localhost:2910', 'de.wikipedia.org/wiki/Hamburg', '192.168.0.1']) expect(Web.looksLikeAddress(a)).toBe(true);
    for (const q of ['Hamburg Hafen', 'wetter', 'e-sources', 'was ist 2.5', '']) expect(Web.looksLikeAddress(q)).toBe(false);
  });
  it('baut die Such-Adresse der gewählten Suchmaschine, gespeichert und wieder gelesen', () => {
    let ws = W.defaultWorkspace();
    expect(Web.searchUrl(ws, ' Hafen & Elbe ')).toBe('https://www.google.com/search?q=Hafen%20%26%20Elbe');
    ws = reducer(ws, { type: 'engine', id: 'ecosia' });
    expect(Web.searchUrl(ws, 'a')).toBe('https://www.ecosia.org/search?q=a');
    expect(reducer(ws, { type: 'engine', id: 'altavista' })).toBe(ws);
    expect(parseWorkspace(JSON.parse(JSON.stringify(ws)))!.engine).toBe('ecosia');
    expect(reducer(ws, { type: 'engine', id: 'google' }).engine).toBeUndefined();
  });
});

describe('F-189 Stufe 2: An E-Sources senden', () => {
  it('liest nur http(s)-Adressen aus ?open=', () => {
    expect(Snd.sentUrl('?open=' + encodeURIComponent('https://example.org/a?b=1#c'))).toBe('https://example.org/a?b=1#c');
    expect(Snd.sentUrl('?open=javascript%3Aalert(1)')).toBeNull();
    expect(Snd.sentUrl('?open=kein%20link')).toBeNull();
    expect(Snd.sentUrl('?test=voll')).toBeNull();
  });
  it('entfernt ?open= und behält andere Parameter', () => {
    expect(Snd.withoutSent('http://localhost:2910/?test=voll&open=https%3A%2F%2Fx.de')).toBe('http://localhost:2910/?test=voll');
  });
  it('wählt das zuletzt benutzte Fenster, bei Gleichstand den Main Desk', () => {
    const o = (win: string, at: number) => ({ t: 'offer' as const, id: 'x', win, from: win, at, desk: win || 'Main Desk', portal: null });
    expect(Snd.pickOffer([])).toBeNull();
    expect(Snd.pickOffer([o('', 5), o('w2', 9)])?.win).toBe('w2');
    expect(Snd.pickOffer([o('w2', 5), o('', 5)])?.win).toBe('');
  });
  it('Lesezeichen zeigt auf die Anwendung ohne Fenster-Parameter', () => {
    expect(Snd.sendBase('http://localhost:2910/?win=abc&test=voll', 'voll')).toBe('http://localhost:2910/?test=voll');
    expect(Snd.sendBase('https://a.de/app/?win=abc', null)).toBe('https://a.de/app/');
    const code = Snd.bookmarklet('https://a.de/app/');
    expect(code.startsWith('javascript:')).toBe(true);
    expect(code).toContain('"https://a.de/app/?open="');
    expect(Snd.bookmarklet('http://localhost:2910/?test=voll')).toContain('?test=voll&open=');
  });
});

describe('F-189 Stufe 2: Ziel wählen und neuer Slot', () => {
  it('Zielwert hin und zurück', () => {
    expect(Snd.parseTarget(Snd.targetValue('w2', 'p1'))).toEqual({ win: 'w2', panel: 'p1' });
    expect(Snd.parseTarget(Snd.targetValue('', null))).toEqual({ win: '', panel: null });
  });
  it('voreingestellt: aktives Portal, ohne Portal: neuer Slot', () => {
    const o = { t: 'offer' as const, id: 'x', win: '', from: 'f', at: 1, desk: 'Main Desk', portal: null };
    expect(Snd.defaultTarget({ ...o, active: 'p9' })).toBe('|p9');
    expect(Snd.defaultTarget(o)).toBe('|');
  });
  it('ohne Portal öffnet die Seite in einem neuen Slot', () => {
    const setup: ScreenSetup = { cls: 'superwide', orientation: 'landscape', lines: 2 };
    const empty: Workspace = { ...W.defaultWorkspace(), panels: [], layouts: {} };
    const next = Snd.openInNewSlot(empty, setup, 'https://example.org/');
    expect(next.panels).toHaveLength(1);
    expect(W.activeTab(next.panels[0]).url).toBe('https://example.org/');
  });
});

describe('F-189 Stufe 2: leerer Desk bekommt nichts, solange ein Desk Portale hat', () => {
  it('Desk mit Portalen vor zuletzt benutztem leeren Desk', () => {
    const t = [{ id: 'p', name: 'P', slot: 'S' }];
    const full = { t: 'offer' as const, id: 'x', win: '', from: 'a', at: 1, desk: 'Main Desk', portal: 'P', active: 'p', targets: t };
    const empty = { t: 'offer' as const, id: 'x', win: 'w9', from: 'b', at: 99, desk: 'Leerer Desk', portal: null, active: null, targets: [] };
    expect(Snd.pickOffer([empty, full])?.win).toBe('');
    expect(Snd.pickOffer([empty])?.win).toBe('w9');
  });
});

describe('F-189 Stufe 2: Lesezeichen-Datei mit Symbol', () => {
  it('enthält Code, Symbol und Namen, sauber maskiert', () => {
    const f = Snd.bookmarkFile(Snd.bookmarklet('https://a.de/'), 'data:image/png;base64,AAA');
    expect(f).toContain('<!DOCTYPE NETSCAPE-Bookmark-file-1>');
    expect(f).toContain('ICON="data:image/png;base64,AAA"');
    expect(f).toContain('&quot;https://a.de/?open=&quot;');
    expect(f).toContain('>Öffnen in</A>');
  });
});

describe('F-193 Zuletzt benutzt in der Begrüßung', () => {
  const pm = (id: string) => ({ meta: { id, name: `P ${id}` } as any, front: id.endsWith('1'), tabs: 1, host: '' });
  const area = (id: string, ...ps: string[]) => ({ id, win: '', other: false, open: true, title: `S ${id}`, panels: ps.map(pm), rect: null });
  const desk = (win: string, here: boolean, ...areas: any[]) => ({ win, title: win || 'Main Desk', here, open: true, aspect: 1.6, tree: null, areas });
  const radar: any[] = [
    desk('', true, area('a', 'a1', 'a2'), area('b', 'b1'), area('c', 'c1')),
    desk('d2', false, area('x', 'x1'), area('y', 'y1')),
    desk('d3', false, area('m', 'm1')),
    desk('d4', false, area('n', 'n1')),
  ];
  it('touch: neueste zuerst, ohne Doppel, begrenzt', () => {
    let l = Rc.touch([], 'a', 1);
    l = Rc.touch(l, 'b', 2);
    l = Rc.touch(l, 'a', 3);
    expect(l.map((e) => e.id)).toEqual(['a', 'b']);
    expect(Rc.touch(l, 'c', 4, 2).map((e) => e.id)).toEqual(['c', 'a']);
    expect(Rc.parseRecent('kaputt')).toEqual({ panels: [], urls: [] });
  });
  it('ohne Verlauf: Reihenfolge des Radars, 3 Desks, 5 Slots, jeder Desk mit Slot', () => {
    const d = Rc.recentDesks(radar, []);
    expect(d.map((x) => x.win)).toEqual(['', 'd2', 'd3']);
    expect(d.flatMap((x) => x.slots).length).toBe(5);
    expect(d[2].slots.map((s) => s.id)).toEqual(['m']);
  });
  it('mit Verlauf: zuletzt benutzte Desks, Slots und Portale zuerst', () => {
    const d = Rc.recentDesks(radar, [{ id: 'n1', at: 3 }, { id: 'a2', at: 2 }, { id: 'y1', at: 1 }], 3, 5, 1);
    expect(d.map((x) => x.win)).toEqual(['d4', '', 'd2']);
    expect(d[1].slots[0].portals.map((p) => p.id)).toEqual(['a2']);
    expect(d[1].slots[0].more).toBe(1);
    expect(d[2].slots[0].id).toBe('y');
  });
  it('vier Felder: Desks, Slots, Portale je nach Verlauf, ohne Doppel', () => {
    const w = (s: number, p: number) => `${s}/${p}`;
    const l = Rc.recentLists(radar, [{ id: 'n1', at: 3 }, { id: 'a2', at: 2 }, { id: 'y1', at: 1 }], w);
    expect(l.desks.map((x) => x.win)).toEqual(['d4', '', 'd2']);
    expect(l.desks[0].portal).toBe('n1');
    expect(l.slots.length).toBe(5);
    expect(l.slots[1].portal).toBe('a2');
    expect(l.portals.slice(0, 3).map((x) => x.id)).toEqual(['n1', 'a2', 'y1']);
    expect(new Set(l.portals.map((x) => x.id)).size).toBe(l.portals.length);
    const leer = Rc.recentLists(radar, [], w);
    expect(leer.desks.map((x) => x.win)).toEqual(['', 'd2', 'd3']);
  });
  it('Lesezeichen: nur aus der Library, gleiche Adresse, höchstens 5', () => {
    const bm = (id: string, url: string) => ({ id, title: id, url, category: '', tags: [], panels: [] });
    const lib = [bm('A', 'https://a.de/'), bm('B', 'https://b.de/x')];
    const urls = [{ id: 'https://fremd.de/', at: 3 }, { id: 'https://b.de/x', at: 2 }, { id: 'https://a.de', at: 1 }];
    expect(Rc.recentSources(lib, urls).map((b) => b.id)).toEqual(['B', 'A']);
    expect(Rc.recentSources(lib, urls, 1).map((b) => b.id)).toEqual(['B']);
    expect(Rc.newestSources(lib, 1).map((b) => b.id)).toEqual(['B']);
  });
});

describe('F-191 Zurücksetzen im Dialog Farben', () => {
  const ws: any = {
    panels: [{ id: 'p', name: 'P', category: 'a', tint: { frame: '#111111' } }],
    categories: [{ id: 'a', name: 'A', tint: { accent: '#222222' } }],
    siteCategory: { 'x.de': 'a' },
    areaNames: [],
  };
  it('stellt Portal, Kategorie und Seite → Kategorie wieder her; neue Kategorien zählen nicht als Änderung', () => {
    const start = Rs.snapColors(ws, 'p');
    const changed: any = {
      ...ws,
      panels: [{ id: 'p', name: 'P', category: 'b' }],
      categories: [{ id: 'a', name: 'A', icon: 'star' }, { id: 'b', name: 'B' }],
      siteCategory: { 'x.de': 'b' },
    };
    expect(Rs.colorsChanged(start, Rs.snapColors(changed, 'p'))).toBe(true);
    const back = Rs.restoreColors(changed, start);
    expect(back.panels[0]).toEqual({ id: 'p', name: 'P', category: 'a', tint: { frame: '#111111' } });
    expect(back.categories[0]).toEqual({ id: 'a', name: 'A', tint: { accent: '#222222' } });
    expect(back.categories).toHaveLength(2);
    expect(back.siteCategory).toEqual({ 'x.de': 'a' });
    expect(Rs.colorsChanged(start, Rs.snapColors(back, 'p'))).toBe(false);
  });
});

describe('F-191 Zurücksetzen im Dialog Design anpassen', () => {
  const ws: any = {
    look: { theme: 'dark', accent: '#111111' },
    panels: [
      { id: 'p', name: 'P', win: 'w2', areaName: 's', tint: { frame: '#222222' } },
      { id: 'q', name: 'Q', tint: { frame: '#333333' } },
    ],
    areaNames: [{ id: 's', name: 'S', tint: { accent: '#444444' } }],
  };
  it('stellt Desk-Farben, Slot- und Portalfarben des Desks wieder her; andere Desks bleiben', () => {
    const start = Rs.snapDesign(ws, 'w2');
    let now: any = L.setDeskLook(ws, 'w2', { accent: '#555555' });
    now = Ti.clearDeskTints(now, 'w2').ws;
    expect(Rs.designChanged(start, Rs.snapDesign(now, 'w2'))).toBe(true);
    const back = Rs.restoreDesign(now, start);
    expect(back.deskLooks).toBeUndefined();
    expect(back.panels[0].tint).toEqual({ frame: '#222222' });
    expect(back.panels[1].tint).toEqual({ frame: '#333333' });
    expect(back.areaNames[0].tint).toEqual({ accent: '#444444' });
    expect(Rs.designChanged(start, Rs.snapDesign(back, 'w2'))).toBe(false);
  });
  it('Main Desk: Darstellung zurück', () => {
    const start = Rs.snapDesign(ws, '');
    const back = Rs.restoreDesign(L.setDeskLook(ws, '', { theme: 'light' }), start);
    expect(back.look).toEqual({ theme: 'dark', accent: '#111111' });
  });
});

describe('F-194 Zoom je Portal', () => {
  it('Stufen, Grenzen, Speichern nur bei Abweichung', () => {
    expect(Zm.zoomStep(100, 1)).toBe(110);
    expect(Zm.zoomStep(100, -1)).toBe(90);
    expect(Zm.zoomStep(200, 1)).toBe(200);
    expect(Zm.zoomStep(50, -1)).toBe(50);
    const ws: any = { panels: [{ id: 'p', name: 'P' }] };
    const z = Zm.setZoom(ws, 'p', 80);
    expect(z.panels[0].zoom).toBe(80);
    expect(Zm.setZoom(z, 'p', 100).panels[0]).toEqual({ id: 'p', name: 'P' });
    expect(Zm.parseZoom(33)).toBeUndefined();
    expect(Zm.zoomStyle(80)).toEqual({ width: '125%', height: '125%', transform: 'scale(0.8)', transformOrigin: '0 0' });
  });
});

describe('F-197: „Öffnen in“ einrichten', () => {
  it('erkennt den Browser und die Taste für Kürzel', () => {
    const mac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)';
    expect(Br.browserOf(`${mac} Chrome/131.0.0.0 Safari/537.36`)).toBe('Chrome');
    expect(Br.browserOf(`${mac} Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0`)).toBe('Edge');
    expect(Br.browserOf('Mozilla/5.0 (Windows NT 10.0; rv:132.0) Gecko/20100101 Firefox/132.0')).toBe('Firefox');
    expect(Br.browserOf(`${mac} Version/18.1 Safari/605.1.15`)).toBe('Safari');
    expect(Br.browserOf(`${mac} Chrome/131.0.0.0 Safari/537.36 OPR/114.0.0.0`)).toBeNull();
    expect(Br.browserOf('')).toBeNull();
    expect(Br.modKey(mac)).toBe('⌘');
    expect(Br.modKey('Mozilla/5.0 (Windows NT 10.0)')).toBe('Strg');
  });
  it('Tour: Schritte je Browser, unbekannt = alle Wege', () => {
    const chrome = Tour.sendTour('Chrome', '⌘');
    expect(chrome.map((s) => s.id)).toEqual(['intro', 'file', 'manager', 'import', 'bar', 'try']);
    expect(chrome[1].keep).toBe(true);
    expect(chrome[2].action).toBe('Adresse kopieren');
    expect(chrome[2].text).toContain('chrome://bookmarks');
    expect(chrome[4].text).toContain('⌘+Umschalt+B');
    expect(Tour.sendTour('Firefox', 'Strg')[2].action).toBeUndefined();
    const any = Tour.sendTour(null, 'Strg');
    expect(any[3].list).toHaveLength(4);
    expect(Tour.TOURS.import.map((s) => s.id)).toContain('sendToo');
  });
  it('Export bringt „Öffnen in“ mit Symbol ganz oben mit', () => {
    const ws = W.defaultWorkspace();
    const html = BB.bookmarkFileOf(ws, new Date(0), { href: 'javascript:void(0)', title: 'Öffnen in', icon: 'data:image/png;base64,AA' });
    expect(html).toContain('<A HREF="javascript:void(0)" ADD_DATE="0" ICON="data:image/png;base64,AA">Öffnen in</A>');
    expect(BB.bookmarkFileOf(ws, new Date(0))).not.toContain('Öffnen in');
  });
});

describe('F-194 Stufe 2: Breite halten', () => {
  it('rechnet Seitenbreite und Zoom ineinander um', () => {
    expect(Zm.fitFor(960, 80)).toBe(1200);
    expect(Zm.fitZoom(600, 1200)).toBe(50);
    expect(Zm.fitZoom(300, 1200)).toBe(50); // nicht unter 50 %
    expect(Zm.fitZoom(3000, 1200)).toBe(200);
    expect(Zm.shownZoom({ zoom: 80, fit: 1200 }, 900)).toBe(75);
    expect(Zm.shownZoom({ zoom: 80 }, 900)).toBe(80);
    expect(Zm.shownZoom({ fit: 1200 }, 0)).toBe(100); // noch nicht gemessen
    expect(Zm.fitStart(600, 100)).toBe(1280);
    expect(Zm.fitStart(1600, 100)).toBe(1600);
    expect(Zm.fitStart(600, 50)).toBe(1200);
    expect(Zm.nearestStep(73)).toBe(75);
    expect(Zm.nearestStep(71)).toBe(67);
    expect(Zm.parseFit(1200)).toBe(1200);
    expect(Zm.parseFit(100)).toBeUndefined();
    expect(Zm.parseFit(1200.5)).toBeUndefined();
  });
  it('schaltet ein und aus; aus behält den Zoom als nächste Stufe', () => {
    const z = { ...W.defaultWorkspace(), panels: [{ id: 'p', name: 'P', zoom: 80 }] } as unknown as Workspace;
    const on = Zm.setFit(z, 'p', 1200);
    expect(on.panels[0]).toEqual({ id: 'p', name: 'P', zoom: 80, fit: 1200 });
    expect(Zm.setFit(on, 'p', 1200)).toBe(on);
    expect(Zm.setFit(on, 'p', undefined, 73).panels[0]).toEqual({ id: 'p', name: 'P', zoom: 75 });
    expect(Zm.setFit(on, 'p', undefined, 99).panels[0]).toEqual({ id: 'p', name: 'P' });
    const ws = reducer(on, { type: 'fitPanel', id: 'p', fit: 1000 });
    expect(ws.panels[0].fit).toBe(1000);
  });
});

describe('F-202 Sources nie pausieren', () => {
  it('setzt und hebt auf, Tabs mit der Source pausieren nie', () => {
    let ws = W.defaultWorkspace();
    ws = B.saveBookmark(ws, { id: 'b1', title: 'Musik', url: 'https://radio.example/live', category: '', tags: [], panels: [] });
    ws = B.saveBookmark(ws, { id: 'b2', title: 'Doku', url: 'https://doku.example', category: '', tags: [], panels: [] });
    ws = Pz.setSourcesKeep(ws, ['b1', 'b2'], true);
    expect(ws.bookmarks.every((b) => b.keep)).toBe(true);
    // Bearbeiten ohne Angabe lässt es stehen, ausdrücklich false hebt auf
    ws = B.saveBookmark(ws, { ...ws.bookmarks[0], keep: undefined, title: 'Radio' });
    expect(ws.bookmarks.find((b) => b.id === 'b1')?.keep).toBe(true);
    ws = B.saveBookmark(ws, { ...ws.bookmarks.find((b) => b.id === 'b2')!, keep: false });
    expect(ws.bookmarks.find((b) => b.id === 'b2')?.keep).toBeUndefined();
    const src = Pz.keptSources(ws);
    expect(Pz.keptBySource(src, 'https://radio.example/live/')).toBe(true);
    expect(Pz.keptBySource(src, 'https://doku.example')).toBe(false);
    const panel = { tabs: [{ id: 't1', url: 'https://radio.example/live' }, { id: 't2', url: 'https://x.example' }] };
    expect(Pz.keepTabOf(panel, 't1', src)).toBe(true);
    expect(Pz.keepTabOf(panel, 't2', src)).toBe(false);
    ws = Pz.setSourcesKeep(ws, ['b1'], false);
    expect(Pz.keptSources(ws).size).toBe(0);
  });
});


describe('F-204 Mehrfachauswahl', () => {
  const base = () => {
    let ws = W.defaultWorkspace();
    ws = { ...ws, categories: [...ws.categories, { id: 'c1', name: 'Arbeit' }] };
    ws = B.saveBookmark(ws, { id: 'b1', title: 'A', url: 'https://a.example', category: '', tags: ['alt'], panels: [] });
    ws = B.saveBookmark(ws, { id: 'b2', title: 'B', url: 'https://b.example', category: '', tags: [], panels: [] });
    ws = B.saveBookmark(ws, { id: 'b3', title: 'C', url: 'https://c.example', category: '', tags: [], panels: [] });
    return ws;
  };
  it('setzt Kategorie, Tags und Portal-Library nur bei den gewählten', () => {
    let ws = base();
    let r = B.bulkSources(ws, ['b1', 'b2'], { kind: 'category', category: 'c1' });
    expect(r.changed).toEqual(['b1', 'b2']);
    ws = r.ws;
    expect(ws.bookmarks.find((b) => b.id === 'b3')?.category).toBe('');
    r = B.bulkSources(ws, ['b1', 'b2'], { kind: 'addTags', tags: ['#Alt', 'neu'] });
    expect(r.ws.bookmarks.find((b) => b.id === 'b1')?.tags).toEqual(['alt', 'neu']);
    expect(r.ws.bookmarks.find((b) => b.id === 'b2')?.tags).toEqual(['Alt', 'neu']);
    r = B.bulkSources(r.ws, ['b1', 'b2'], { kind: 'removeTags', tags: ['ALT'] });
    expect(r.changed).toHaveLength(2);
    const pid = ws.panels[0].id;
    r = B.bulkSources(r.ws, ['b2'], { kind: 'addPanel', panel: pid });
    expect(r.ws.bookmarks.find((b) => b.id === 'b2')?.panels).toEqual([pid]);
    expect(B.bulkSources(r.ws, ['b2'], { kind: 'addPanel', panel: pid }).changed).toHaveLength(0);
    expect(B.bulkSources(r.ws, ['b1'], { kind: 'category', category: 'gibtsnicht' }).changed).toHaveLength(0);
  });
  it('löscht und stellt an alter Stelle wieder her', () => {
    const ws = base();
    const order = ws.bookmarks.map((b) => b.id);
    const before = ws.bookmarks.filter((b) => b.id !== 'b2');
    const r = B.bulkSources(ws, ['b1', 'b3'], { kind: 'delete' });
    expect(r.ws.bookmarks.map((b) => b.id)).toEqual(['b2']);
    const back = B.restoreSources(r.ws, before, order);
    expect(back.bookmarks.map((b) => b.id)).toEqual(order);
  });
});

describe('F-200 Entwickler-Modus', () => {
  it('schaltet je Portal und rechnet die Seitengröße', () => {
    let ws = W.defaultWorkspace();
    const id = ws.panels[0].id;
    ws = W.toggleDevPanel(ws, id);
    expect(ws.panels[0].dev).toBe(true);
    expect(parseWorkspace(JSON.parse(JSON.stringify(ws)))?.panels[0].dev).toBe(true);
    ws = W.toggleDevPanel(ws, id);
    expect(ws.panels[0].dev).toBeUndefined();
    expect(Dv.pageSize(800, 400, 80)).toEqual({ w: 1000, h: 500 });
    expect(Dv.breakpointOf(375)).toBe('Smartphone');
    expect(Dv.breakpointOf(1024)).toBe('Laptop');
    expect(Dv.breakpointOf(2560)).toBe('Großer Bildschirm');
  });
  it('Einschalten: Zoom 100 % und „Breite halten“ aus; Ausschalten holt beides zurück (V52)', () => {
    let ws = W.defaultWorkspace();
    const id = ws.panels[0].id;
    ws = { ...ws, panels: ws.panels.map((p, i) => (i === 0 ? { ...p, zoom: 80, fit: 1280 } : p)) };
    ws = W.toggleDevPanel(ws, id);
    expect(ws.panels[0].zoom).toBeUndefined();
    expect(ws.panels[0].fit).toBeUndefined();
    const saved = parseWorkspace(JSON.parse(JSON.stringify(ws)))!;
    expect(saved.panels[0].devKeep).toEqual({ zoom: 80, fit: 1280 });
    ws = W.toggleDevPanel(saved, id);
    expect(ws.panels[0].zoom).toBe(80);
    expect(ws.panels[0].fit).toBe(1280);
    expect(ws.panels[0].devKeep).toBeUndefined();
  });
});

describe('F-200 Stufe 2 Werkbank', () => {
  it('Gerät eingepasst, Drehen tauscht, Zoom-Test teilt die Seitengröße', () => {
    // Smartphone 390 × 844 in einem Slot 600 × 600: ganz eingepasst (Höhe begrenzt)
    const a = Dv.devFrame({ device: 'phone' }, 600, 600);
    expect(a.page).toEqual({ w: 390, h: 844 });
    expect(a.shown.h).toBe(600);
    expect(a.device).toBe(true);
    // gedreht: 844 × 390
    expect(Dv.devFrame({ device: 'phone', turned: true }, 600, 600).page).toEqual({ w: 844, h: 390 });
    // Laptop bei 400 %: Seite sieht 320 × 200 (Reflow-Test), gezeigt wird gleich groß wie bei 100 %
    const r = Dv.devFrame({ device: 'laptop', scale: 400 }, 1280, 800);
    expect(r.page).toEqual({ w: 320, h: 200 });
    expect(r.shown).toEqual({ w: 1280, h: 800 });
    expect(r.scale).toBe(4);
    // ohne Gerät: Slot frei, Zoom-Test 200 % halbiert die Seite
    expect(Dv.devFrame({ scale: 200 }, 1000, 600).page).toEqual({ w: 500, h: 300 });
    expect(Dv.devFrame(undefined, 1000, 600).scale).toBe(1);
  });
  it('setDevView nur im Entwickler-Modus, gespeichert und beim Ausschalten weg', () => {
    let ws = W.defaultWorkspace();
    const id = ws.panels[0].id;
    expect(W.setDevView(ws, id, { device: 'tablet' }).panels[0].devView).toBeUndefined();
    ws = W.toggleDevPanel(ws, id);
    ws = W.setDevView(ws, id, { device: 'tablet' });
    ws = W.setDevView(ws, id, { turned: true, scale: 200 });
    expect(ws.panels[0].devView).toEqual({ device: 'tablet', turned: true, scale: 200 });
    expect(parseWorkspace(JSON.parse(JSON.stringify(ws)))?.panels[0].devView).toEqual({ device: 'tablet', turned: true, scale: 200 });
    // „Slot frei“ nimmt Gerät und Drehen weg, Zoom-Test bleibt
    ws = W.setDevView(ws, id, { device: null });
    expect(ws.panels[0].devView).toEqual({ scale: 200 });
    ws = W.setDevView(ws, id, { scale: 100 });
    expect(ws.panels[0].devView).toBeUndefined();
    expect(Dv.parseDevView({ device: 'toaster', scale: 300 })).toBeUndefined();
    ws = W.setDevView(W.toggleDevPanel(W.toggleDevPanel(ws, id), id), id, { device: 'phone' });
    ws = W.toggleDevPanel(ws, id);
    expect(ws.panels[0].devView).toBeUndefined();
  });
});

describe('F-116 Spaces und Cases (Stufe 1)', () => {
  let n = 0;
  const id = () => `id${++n}`;
  it('anlegen, umbenennen, Farbe; doppelte Namen bekommen eine Nummer; speichern', () => {
    let ws = W.defaultWorkspace();
    const a = Cs.addSpace(ws, '  Firma ', id, '#64a970');
    ws = a.ws;
    ws = Cs.addSpace(ws, 'Firma', id).ws;
    expect(ws.spheres.map((s) => s.name)).toEqual(['Firma', 'Firma 2']);
    const c = Cs.addCase(ws, a.id!, 'Kunde XY', id);
    ws = c.ws;
    expect(Cs.addCase(ws, 'gibtsnicht', 'X', id).id).toBeNull();
    ws = Cs.editCase(ws, c.id!, { name: 'Kunde Z', color: '#66afe1' });
    ws = Cs.editSpace(ws, a.id!, { color: null, name: 'Arbeit' });
    expect(ws.scenarios[0]).toEqual({ id: c.id, name: 'Kunde Z', space: a.id, color: '#66afe1' });
    expect(ws.spheres[0]).toEqual({ id: a.id, name: 'Arbeit' });
    const back = parseWorkspace(JSON.parse(JSON.stringify(ws)))!;
    expect(back.spheres).toEqual(ws.spheres);
    expect(back.scenarios).toEqual(ws.scenarios);
  });
  it('Layouts zuordnen, Case wählen: genau eins wird gesetzt, mehrere angeboten', () => {
    let ws = W.defaultWorkspace();
    const sp = Cs.addSpace(ws, 'Privat', id);
    ws = sp.ws;
    const ca = Cs.addCase(ws, sp.id!, 'Urlaub', id);
    ws = ca.ws;
    const first = DL.activeLayout(ws).id;
    ws = DL.addLayout(ws, '', LAPTOP2, 'even', 'Reise');
    const reise = DL.activeLayout(ws).id;
    expect(reise).not.toBe(first);
    ws = DL.switchLayout(ws, '', first);
    ws = Cs.setLayoutCase(ws, '', reise, ca.id!, true);
    expect(Cs.casesOfLayout(ws, '', reise).map((c) => c.name)).toEqual(['Urlaub']);
    let r = Cs.pickCase(ws, '', ca.id!);
    expect(r.switched?.id).toBe(reise);
    expect(DL.activeLayout(r.ws).id).toBe(reise);
    expect(Cs.activeCaseOf(r.ws, '')?.name).toBe('Urlaub');
    // gespeichert (Zuordnung hängt nicht am Layout-Eintrag, übersteht den Wechsel)
    const back = parseWorkspace(JSON.parse(JSON.stringify(r.ws)))!;
    expect(back.layoutCases).toEqual({ [`|${reise}`]: [ca.id] });
    expect(back.activeCase).toEqual({ '': ca.id });
    // zweites Layout dazu: nur noch Angebot, kein Wechsel
    ws = Cs.setLayoutCase(r.ws, '', first, ca.id!, true);
    r = Cs.pickCase(ws, '', ca.id!);
    expect(r.switched).toBeNull();
    expect(r.offer.map((l) => l.id)).toEqual([first, reise]);
    // abwählen
    expect(Cs.pickCase(r.ws, '', null).ws.activeCase).toBeUndefined();
  });
  it('Löschen räumt auf: Case aus Zuordnung und Auswahl, Space samt Cases', () => {
    let ws = W.defaultWorkspace();
    const sp = Cs.addSpace(ws, 'Schule', id);
    ws = sp.ws;
    const ca = Cs.addCase(ws, sp.id!, 'Abi', id);
    ws = Cs.setLayoutCase(ca.ws, '', DL.activeLayout(ca.ws).id, ca.id!, true);
    ws = Cs.pickCase(ws, '', ca.id!).ws;
    ws = Cs.deleteSpace(ws, sp.id!);
    expect(ws.spheres).toHaveLength(0);
    expect(ws.scenarios).toHaveLength(0);
    expect(ws.layoutCases).toBeUndefined();
    expect(ws.activeCase).toBeUndefined();
    // Case ohne Space fällt beim Laden weg
    expect(parseWorkspace({ ...JSON.parse(JSON.stringify(ws)), scenarios: [{ id: 'x', name: 'X', space: 'weg' }] })!.scenarios).toHaveLength(0);
  });
});

describe('F-205 Begrüßung wählbar', () => {
  const at = (h: number, day = 23) => new Date(2026, 10, day, h, 5);
  const w = (c: Partial<Wc.Welcome>): Wc.Welcome => ({ ...Wc.WELCOME_DEFAULT, ...c });
  it('Listen wie im Doc: 18 Regionalgrüße, 10 internationale, 20 Sprüche, Ids eindeutig', () => {
    expect(Wc.REGIONAL).toHaveLength(18);
    expect(Wc.INTERNATIONAL).toHaveLength(10);
    expect(Wc.QUOTES).toHaveLength(20);
    expect(new Set(Wc.POOL_ALL.map((p) => p.key)).size).toBe(48);
    for (const g of [...Wc.REGIONAL, ...Wc.INTERNATIONAL]) expect(g.text).toContain('{Name}');
  });
  it('Platzhalter {Name}: eingesetzt bzw. ohne Namen samt Komma weg', () => {
    expect(Wc.fillName('Moin, {Name}!', 'Enrico')).toBe('Moin, Enrico!');
    expect(Wc.fillName('Moin, {Name}!', '')).toBe('Moin!');
    expect(Wc.fillName('Na, {Name}?', ' ')).toBe('Na?');
    expect(Wc.fillName('Hoi {Name}!', '')).toBe('Hoi!');
    expect(Wc.fillName('Wake up, {Name} …', '')).toBe('Wake up …');
  });
  it('Regional mit Zeitfenster fällt außerhalb auf den Standard zurück', () => {
    const m = w({ mode: 'regional', greet: 'mahlzeit' });
    expect(Wc.welcomeText(m, at(12), 'Enrico')).toBe('Mahlzeit, Enrico!');
    expect(Wc.welcomeText(m, at(14), 'Enrico')).toBe('Guten Tag, Enrico');
    expect(Wc.welcomeText(w({ mode: 'regional', greet: 'moin' }), at(2), 'Enrico')).toBe('Moin, Enrico!');
    expect(Wc.welcomeText(w({ mode: 'regional', greet: 'tach' }), at(20), '')).toBe('Guten Abend');
  });
  it('Spruch als Original, mit Name oder deutsch; „mit Name“ ohne Namen = Original', () => {
    const q = (form: Wc.QuoteForm) => w({ mode: 'quote', quote: 'commander', form });
    expect(Wc.welcomeText(q('orig'), at(10), 'Enrico')).toBe('Welcome back, Commander.');
    expect(Wc.welcomeText(q('name'), at(10), 'Enrico')).toBe('Welcome back, Commander Enrico.');
    expect(Wc.welcomeText(q('de'), at(10), 'Enrico')).toBe('Willkommen zurück, Commander Enrico.');
    expect(Wc.welcomeText(q('name'), at(10), '')).toBe('Welcome back, Commander.');
    expect(Wc.welcomeText(w({ mode: 'quote', quote: 'vietnam' }), at(15), 'Enrico')).toBe('Guten Tag, Enrico');
  });
  it('Zufall: je Tag gleich, nächster Tag anders; bei jedem Öffnen nach Wurf; nur Passendes', () => {
    const r = w({ mode: 'random', pool: ['r:moin', 'r:servus', 'r:gude'], every: 'day' });
    const a = Wc.welcomeText(r, at(10, 23), 'E', 0.1);
    expect(Wc.welcomeText(r, at(18, 23), 'E', 0.9)).toBe(a);
    expect(Wc.welcomeText(r, at(10, 24), 'E', 0.1) === a).toBe(false);
    const o = w({ mode: 'random', pool: ['r:moin', 'r:servus'], every: 'open' });
    expect(Wc.welcomeText(o, at(10), 'E', 0.1)).toBe('Moin, E!');
    expect(Wc.welcomeText(o, at(10), 'E', 0.9)).toBe('Servus, E!');
    expect(Wc.welcomeText(w({ mode: 'random', pool: ['r:mahlzeit'] }), at(20), 'E')).toBe('Guten Abend, E');
    expect(Wc.welcomeText(w({ mode: 'random', pool: [] }), at(10), '')).toBe('Guten Tag');
  });
  it('Eigener Text; leer = Standard', () => {
    expect(Wc.welcomeText(w({ mode: 'custom', custom: 'Ahoi, {Name}!' }), at(10), 'Enrico')).toBe('Ahoi, Enrico!');
    expect(Wc.welcomeText(w({ mode: 'custom', custom: '  ' }), at(10), 'Enrico')).toBe('Guten Tag, Enrico');
  });
  it('Profil speichert die Wahl, Voreinstellung fällt weg, Unbekanntes wird bereinigt', () => {
    const ws = Pr.setProfile(W.defaultWorkspace(), { welcome: w({ mode: 'quote', quote: 'force' }) });
    const back = parseWorkspace(JSON.parse(JSON.stringify(ws)))?.profile;
    expect(back?.welcome?.mode).toBe('quote');
    expect(back?.welcome?.quote).toBe('force');
    expect(Pr.setProfile(ws, { welcome: Wc.WELCOME_DEFAULT }).profile).toBeUndefined();
    const p = Wc.parseWelcome({ mode: 'x', quote: 'gibtsnicht', pool: ['r:moin', 'r:moin', 'q:nix', 7], every: 'open', form: 'de' });
    expect(p?.mode).toBe('standard');
    expect(p?.quote).toBe('commander');
    expect(p?.pool).toEqual(['r:moin']);
    expect(p?.every).toBe('open');
    expect(p?.form).toBe('de');
  });
});

describe('V54: Untersuchen erklären (F-200 e) und Tour „Entwickler-Modus“', () => {
  it('Hilfe-Eintrag Entwickler-Modus erklärt Untersuchen und hat die Frage dazu', () => {
    const e = H.helpById('devMode');
    expect(e?.text).toContain('Untersuchen');
    expect(e?.text).toContain('eigenes Fenster');
    expect(e?.questions).toContain('Wie sehe ich den Code einer Seite?');
  });
  it('Tour „Entwickler-Modus“: Leiste von Gerät bis Beenden, Untersuchen als vorletzter Schritt, eigener Merker', () => {
    const ids = Tour.TOURS.dev.map((s) => s.id);
    expect(ids).toEqual(['intro', 'device', 'turn', 'scale', 'size', 'end', 'inspect', 'again']);
    expect(Tour.TOURS.dev[6].text).toContain('Untersuchen');
    expect(Tour.TOUR_KEY.dev).toBe('esource.tour.dev.v1');
    expect(H.helpById('tourDev')?.run).toBe('tourDev');
  });
});

describe('F-116 Oberfläche (V54): Aktionen, Rückgängig, Farben, Suche', () => {
  it('Aktionen im Reducer: anlegen mit eigener Id, Space löschen nimmt Cases mit, Rückgängig holt alles zurück', () => {
    let ws = W.defaultWorkspace();
    ws = reducer(ws, { type: 'spaceAdd', id: 's1', name: 'Firma', color: '#64a970' });
    ws = reducer(ws, { type: 'caseAdd', id: 'c1', space: 's1', name: 'Kunde XY' });
    const layout = DL.activeLayout(ws).id;
    ws = reducer(ws, { type: 'layoutCase', win: '', layout, caseId: 'c1', on: true });
    ws = reducer(ws, { type: 'casePick', win: '', caseId: 'c1' });
    expect(ws.activeCase).toEqual({ '': 'c1' });
    const snap = Cs.snapCases(ws);
    ws = reducer(ws, { type: 'spaceDelete', id: 's1' });
    expect(ws.scenarios).toHaveLength(0);
    expect(ws.layoutCases).toBeUndefined();
    ws = reducer(ws, { type: 'casesRestore', snap });
    expect(ws.scenarios.map((c) => c.id)).toEqual(['c1']);
    expect(Cs.casesOfLayout(ws, '', layout).map((c) => c.name)).toEqual(['Kunde XY']);
    expect(ws.activeCase).toEqual({ '': 'c1' });
  });
  it('nächste freie Farbe, Suche nach Case und Space (Treffer im Namen vorn)', () => {
    expect(Cs.nextColor([])).toBe(Cs.CASE_COLORS[0]);
    expect(Cs.nextColor([Cs.CASE_COLORS[0]])).toBe(Cs.CASE_COLORS[1]);
    let ws = W.defaultWorkspace();
    ws = reducer(ws, { type: 'spaceAdd', id: 's1', name: 'Firma' });
    ws = reducer(ws, { type: 'spaceAdd', id: 's2', name: 'Privat' });
    ws = reducer(ws, { type: 'caseAdd', id: 'c1', space: 's2', name: 'Urlaub Firma-Ausflug' });
    ws = reducer(ws, { type: 'caseAdd', id: 'c2', space: 's1', name: 'Kunde XY' });
    expect(Cs.searchCases(ws, 'firma').map((h) => h.c.id)).toEqual(['c1', 'c2']);
    expect(Cs.searchCases(ws, 'kunde firma').map((h) => h.c.id)).toEqual(['c2']);
    expect(Cs.searchCases(ws, '')).toHaveLength(0);
  });
  it('Hilfe-Eintrag „Spaces und Cases“ mit Fragen und Symbol', () => {
    const e = H.helpById('cases');
    expect(e?.run).toBe('cases');
    expect(e?.questions).toContain('Was ist ein Case?');
    expect(Ic.HELP_ICON.cases).toBeDefined();
  });
});

describe('V55: Lineal misst in Seiten-Pixeln', () => {
  it('ohne Zoom wie bisher: 10 / 50 / 100, Zahlen alle 100', () => {
    expect(Dv.rulerSteps(1)).toEqual({ minor: 10, mid: 50, major: 100, label: 100 });
  });
  it('eingepasstes Gerät (klein gezeigt): Striche weiter auseinander, nie enger als 8 Punkte', () => {
    const st = Dv.rulerSteps(0.3);
    expect(st.minor * 0.3).toBeGreaterThan(7.99);
    expect(st.label * 0.3).toBeGreaterThan(49.99);
    expect(st.label % st.major).toBe(0);
  });
  it('Zoom-Test 400 %: feinere Striche', () => {
    const st = Dv.rulerSteps(4);
    expect(st.minor).toBe(2);
    expect(st.major).toBe(20);
  });
  it('ungültiger Faktor zählt wie 1', () => {
    expect(Dv.rulerSteps(0).minor).toBe(10);
  });
});

describe('F-169 Stufe 2: Abgleich über GitHub Gist', () => {
  const c = { seen: '2026-11-23T10:00:00.000Z', syncedAt: 1000 };
  it('sendet, solange im Gist nichts liegt', () => {
    expect(Gi.planSync(0, c, null)).toBe('push');
  });
  it('tut nichts ohne Änderungen', () => {
    expect(Gi.planSync(900, c, c.seen)).toBe('none');
  });
  it('sendet nach Änderung nur hier', () => {
    expect(Gi.planSync(2000, c, c.seen)).toBe('push');
  });
  it('holt nach Änderung nur auf dem anderen Gerät', () => {
    expect(Gi.planSync(900, c, '2026-11-23T11:00:00.000Z')).toBe('pull');
  });
  it('fragt, wenn beide Seiten geändert haben', () => {
    expect(Gi.planSync(2000, c, '2026-11-23T11:00:00.000Z')).toBe('conflict');
  });
  it('fragt beim ersten Verbinden, wenn hier schon etwas steht', () => {
    expect(Gi.planSync(500, { seen: '', syncedAt: 0 }, '2026-11-23T11:00:00.000Z')).toBe('conflict');
  });
  it('lässt bei Änderungen auf beiden Seiten den neueren Stand gewinnen', () => {
    const t = Date.parse('2026-11-23T11:00:00.000Z');
    expect(Gi.newerWins(t - 5000, '2026-11-23T11:00:00.000Z')).toBe('pull');
    expect(Gi.newerWins(t + 5000, '2026-11-23T11:00:00.000Z')).toBe('push');
  });
  it('zählt eine andere Bildschirm-Einstellung nicht als Änderung und behält sie beim Holen', () => {
    const a = { panels: [], winSetup: { '': 'small:landscape:1' } } as unknown as Workspace;
    const b = { panels: [], winSetup: { '': 'phone:portrait:1' } } as unknown as Workspace;
    expect(onlyDeviceChanged(JSON.stringify(a), b)).toBe(true);
    expect(onlyDeviceChanged(JSON.stringify(a), { ...b, panels: [1] } as unknown as Workspace)).toBe(false);
    expect(keepDeviceFields(a, b).winSetup).toEqual(b.winSetup);
  });
  it('bereinigt eingefügte Schlüssel', () => {
    expect(Gi.cleanToken('  token ghp_abc\n123 ')).toBe('ghp_abc123');
  });
});

describe('F-158: Export und Import je Slot', () => {
  const setup: ScreenSetup = { cls: 'superwide', orientation: 'landscape', lines: 2 };
  const base = (): Workspace => {
    let ws: Workspace = { ...W.defaultWorkspace(), categories: [{ id: 'c1', name: 'Recherche', icon: Ic.CATEGORY_ICONS[0], tint: { frame: '#ff0000' } }] };
    ws = W.navigatePanel(ws, ws.panels[0].id, 'https://example.org/');
    ws = { ...ws, panels: ws.panels.map((p, i) => (i === 0 ? { ...p, category: 'c1', win: 'w1', areaName: 'alt', zoom: 125 } : p)) };
    return ws;
  };
  it('exportiert Portale, Tabs, Kategorien und lässt Gerätebezüge weg', () => {
    const ws = base();
    const p = ws.panels[0];
    const f = SF.slotToFile(ws, [p.id], p.id, 'Mac')!;
    expect(f.format).toBe(SF.SLOT_FORMAT);
    expect(f.panels).toHaveLength(1);
    expect(f.panels[0].win).toBeUndefined();
    expect(f.panels[0].areaName).toBeUndefined();
    expect(f.panels[0].zoom).toBe(125);
    expect(f.categories).toEqual([{ id: 'c1', name: 'Recherche', tint: { frame: '#ff0000' }, icon: Ic.CATEGORY_ICONS[0] }]);
    expect(SF.slotToFile(ws, ['gibt-es-nicht'], 'x', 'Mac')).toBeNull();
  });
  it('liest die Datei zurück und erkennt Desk-Dateien', () => {
    const ws = base();
    const p = ws.panels[0];
    const text = JSON.stringify(SF.slotToFile(ws, [p.id], p.id, 'Mac'));
    const r = SF.readSlotFile(text);
    expect(r.ok).toBe(true);
    expect(SF.isSlotFile(text)).toBe(true);
    const desks = SF.readSlotFile(JSON.stringify({ format: 'e-sources-arbeitsflaeche', version: 4 }));
    expect(desks.ok).toBe(false);
    expect(!desks.ok && desks.desks).toBe(true);
    expect(SF.readSlotFile('kein json').ok).toBe(false);
    expect(SF.readSlotFile(JSON.stringify({ format: SF.SLOT_FORMAT, version: 99, panels: [] })).ok).toBe(false);
  });
  it('lädt als neuen Slot mit neuen Ids, ordnet Kategorien über den Namen zu', () => {
    const src = base();
    const p = src.panels[0];
    const file = { ...SF.slotToFile(src, [p.id], p.id, 'Mac')!, name: 'Recherche-Slot' };
    let n = 0;
    const id = () => `n${++n}`;
    const target: Workspace = { ...W.defaultWorkspace(), categories: [{ id: 'eigen', name: 'recherche' }] };
    const before = W.viewOf(target, setup).slots.length;
    const r = SF.importSlot(target, setup, file, id);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const v = W.viewOf(r.ws, setup);
    expect(v.slots.length).toBe(before + 1);
    const fresh = r.ws.panels.find((x) => x.id === r.front)!;
    expect(fresh.id === p.id).toBe(false);
    expect(fresh.category).toBe('eigen');
    expect(r.ws.categories).toHaveLength(1);
    expect(W.activeTab(fresh).url).toBe('https://example.org/');
    expect(r.name).toBe('Recherche-Slot');
    expect(r.ws.panels).toHaveLength(target.panels.length + 1);
    // zweimal laden: Name bekommt eine Nummer
    const again = SF.importSlot(r.ws, setup, file, id);
    expect(again.ok && again.name).toBe('Recherche-Slot 2');
  });
  it('legt fehlende Kategorien an und meldet vollen Bildschirm', () => {
    const src = base();
    const p = src.panels[0];
    const file = SF.slotToFile(src, [p.id], p.id, 'Mac')!;
    const target: Workspace = { ...W.defaultWorkspace(), categories: [] };
    const r = SF.importSlot(target, setup, file, () => 'neu' + Math.random());
    expect(r.ok && r.ws.categories[0].name).toBe('Recherche');
    let full = target;
    while (W.canAddArea(full, setup)) full = W.addArea(full, setup, 'right');
    expect(SF.importSlot(full, setup, file).ok).toBe(false);
  });
  it('Dateiname aus dem Slot-Namen', () => {
    expect(SF.slotFileName('Größe & Übung')).toBe('e-sources-slot-groesse-uebung.json');
    expect(SF.slotFileName(undefined)).toBe('e-sources-slot.json');
  });
});

describe('F-147: Farbpipette', () => {
  it('HEX vereinheitlichen und in RGB umrechnen', () => {
    expect(Pk.normalizeHex('#ABC')).toBe('#aabbcc');
    expect(Pk.normalizeHex('3A7BD5')).toBe('#3a7bd5');
    expect(Pk.normalizeHex('#12345')).toBeNull();
    expect(Pk.normalizeHex('blau')).toBeNull();
    expect(Pk.rgbText('#ff8000')).toBe('rgb(255, 128, 0)');
  });
  it('Liste: neue vorn, keine Doppelten, höchstens 12', () => {
    let l: string[] = [];
    for (let i = 0; i < 14; i++) l = Pk.pushColor(l, `#0000${i.toString(16).padStart(2, '0')}`);
    expect(l).toHaveLength(Pk.PICKER_MAX);
    expect(l[0]).toBe('#00000d');
    l = Pk.pushColor(l, '#00000A');
    expect(l[0]).toBe('#00000a');
    expect(l.filter((x) => x === '#00000a')).toHaveLength(1);
    expect(Pk.parseColors(['#fff', 'x', '#FFFFFF', 3])).toEqual(['#ffffff']);
  });
  it('Farbname für die Ansage', () => {
    expect(Pk.colorName('#000000')).toBe('Schwarz');
    expect(Pk.colorName('#ffffff')).toBe('Weiß');
    expect(Pk.colorName('#ff0000')).toBe('Rot');
    expect(Pk.colorName('#00008b')).toBe('dunkles Blau');
    expect(Pk.colorName('#ffd84d')).toBe('Gelb');
  });
});

describe('F-206 Schritt 1: Notizen und Ansichten (Datenmodell)', () => {
  const T0 = Date.UTC(2026, 10, 23, 12);
  const act = { now: T0, by: 'Enrico' };
  const mk = (ws: Workspace, init: No.NoteInit = {}, id?: string) => No.createNote(ws, init, { ...act, id });
  const base = () => W.defaultWorkspace();
  const seq = () => {
    let i = 0;
    return () => `n${++i}`;
  };

  it('legt eine Notiz an – mit Spur, Herkunft und Titel-Vorschlag aus der ersten Zeile', () => {
    const { ws, id } = mk(base(), { text: '\n# Einkauf **morgen**\n- Milch' });
    const n = No.noteById(ws, id)!;
    expect(n.state).toBe('open');
    expect(n.trail).toEqual([{ at: T0, what: 'created', by: 'Enrico' }]);
    expect(n.origin).toEqual({ via: 'hand', at: new Date(T0).toISOString(), by: 'Enrico' });
    expect(No.titleOf(n)).toBe('Einkauf morgen');
    expect(No.titleOf({ title: ' Eigener ', text: 'x' })).toBe('Eigener');
    expect(No.titleOf({ title: '', text: '- [ ] Anrufen' })).toBe('Anrufen');
    expect(No.titleOf({ title: '', text: 'a'.repeat(100) })).toHaveLength(No.TITLE_MAX);
    expect(No.isEmptyNote(ws, n)).toBe(false);
    expect(No.isEmptyNote(ws, { ...n, text: '  ' })).toBe(true);
  });

  it('ändert Felder, fasst Textänderungen in der Spur zusammen und entfernt leere Felder', () => {
    let { ws, id } = mk(base());
    ws = No.updateNote(ws, id, { text: 'a' }, { now: T0 + 1000, by: 'Enrico' });
    ws = No.updateNote(ws, id, { text: 'ab', important: true, due: '2026-12-01' }, { now: T0 + 2000, by: 'Enrico' });
    let n = No.noteById(ws, id)!;
    expect(n.trail.filter((e) => e.what === 'edited')).toHaveLength(1);
    expect(n.trail[n.trail.length - 1].at).toBe(T0 + 2000);
    expect(n.important).toBe(true);
    ws = No.updateNote(ws, id, { due: undefined, important: undefined }, { now: T0 + No.EDIT_MERGE_MS + 5000 });
    n = No.noteById(ws, id)!;
    expect(n.due).toBeUndefined();
    expect(n.important).toBeUndefined();
    expect(n.trail.filter((e) => e.what === 'edited')).toHaveLength(2);
    ws = No.updateNote(ws, id, { delegated: { to: 'Maike' } }, act);
    expect(No.noteById(ws, id)!.trail.at(-1)).toEqual({ at: T0, what: 'delegated', by: 'Enrico', detail: 'Maike' });
    ws = No.markForwarded(ws, id, 'iPhone', act);
    expect(No.noteById(ws, id)!.forwarded).toEqual([{ at: T0, to: 'iPhone' }]);
  });

  it('Spur hat höchstens TRAIL_MAX Einträge', () => {
    let t: ReturnType<typeof No.addEvent> = [];
    for (let i = 0; i < No.TRAIL_MAX + 5; i++) t = No.addEvent(t, 'state', { now: i });
    expect(t).toHaveLength(No.TRAIL_MAX);
    expect(t[0].at).toBe(5);
  });

  it('Zustand: wartet von selbst bei offenem Vorgänger und vor „nicht beginnen vor“', () => {
    let ws = base();
    let a: string, b: string;
    ({ ws, id: a } = mk(ws, { title: 'A' }));
    ({ ws, id: b } = mk(ws, { title: 'B' }));
    const r = No.addLink(ws, b, a, { wait: true }, act);
    expect(r.ok).toBe(true);
    ws = (r as { ws: Workspace }).ws;
    expect(No.stateOf(ws, No.noteById(ws, b)!, '2026-11-23')).toEqual({ state: 'waiting', cause: 'after', blockers: [a] });
    expect(No.successorsOf(ws, a).map((s) => s.note.id)).toEqual([b]);
    ws = No.setState(ws, a, 'done', act);
    expect(No.stateOf(ws, No.noteById(ws, b)!, '2026-11-23')).toEqual({ state: 'open' });
    ws = No.updateNote(ws, b, { notBefore: '2026-12-01' });
    expect(No.stateOf(ws, No.noteById(ws, b)!, '2026-11-23')).toEqual({ state: 'waiting', cause: 'notBefore', from: '2026-12-01' });
    expect(No.stateOf(ws, No.noteById(ws, b)!, '2026-12-01').state).toBe('open');
    ws = No.setState(ws, b, 'waiting', act, ' Rückruf ');
    expect(No.stateOf(ws, No.noteById(ws, b)!)).toEqual({ state: 'waiting', cause: 'hand', reason: 'Rückruf' });
    ws = No.setState(ws, b, 'doing', act);
    expect(No.noteById(ws, b)!.waitReason).toBeUndefined();
  });

  it('Vorgänger „bestimmt den Termin“ verschiebt den frühesten Beginn', () => {
    let ws = base();
    let a: string, b: string;
    ({ ws, id: a } = mk(ws, { due: '2026-12-10' }));
    ({ ws, id: b } = mk(ws, { notBefore: '2026-12-01' }));
    ws = (No.addLink(ws, b, a, {}) as { ws: Workspace }).ws;
    expect(No.earliestStart(ws, No.noteById(ws, b)!)).toBe('2026-12-10');
    expect(No.stateOf(ws, No.noteById(ws, b)!, '2026-12-05')).toEqual({ state: 'waiting', cause: 'date', from: '2026-12-10' });
    // Art ändern statt doppelt eintragen
    ws = (No.addLink(ws, b, a, { wait: true }) as { ws: Workspace }).ws;
    expect(No.noteById(ws, b)!.after).toEqual([{ id: a, rel: 'EA', wait: true }]);
    ws = No.removeLink(ws, b, a);
    expect(No.noteById(ws, b)!.after).toBeUndefined();
  });

  it('verhindert Kreise bei Vorgängern und zeigt den Weg', () => {
    let ws = base();
    const ids: string[] = [];
    for (const t of ['A', 'B', 'C']) {
      let id: string;
      ({ ws, id } = mk(ws, { title: t }));
      ids.push(id);
    }
    const [a, b, c] = ids;
    ws = (No.addLink(ws, b, a, { wait: true }) as { ws: Workspace }).ws; // A vor B
    ws = (No.addLink(ws, c, b, { wait: true }) as { ws: Workspace }).ws; // B vor C
    const r = No.addLink(ws, a, c, { wait: true }); // C vor A → Kreis
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toBe('circle');
    expect(!r.ok && r.path).toEqual([a, b, c, a]);
    expect(No.addLink(ws, a, a, { wait: true }).ok).toBe(false);
    expect(No.addLink(ws, a, 'fehlt', { wait: true }).ok).toBe(false);
  });

  it('Unter-Notizen: genau eine Eltern-Notiz, Fortschritt, nächste drei offene, keine Kreise', () => {
    let ws = base();
    let p: string;
    ({ ws, id: p } = mk(ws, { title: 'Umzug' }));
    const kids: string[] = [];
    for (let i = 0; i < 5; i++) {
      let id: string;
      ({ ws, id } = mk(ws, { title: `K${i}`, parent: p }));
      kids.push(id);
    }
    ws = No.setState(ws, kids[0], 'done', act);
    expect(No.progress(ws, p)).toEqual({ done: 1, total: 5 });
    expect(No.nextOpenChildren(ws, p).map((n) => n.title)).toEqual(['K1', 'K2', 'K3']);
    let g: string;
    ({ ws, id: g } = mk(ws, { title: 'Enkel', parent: kids[1] }));
    expect(No.descendantsOf(ws, p).map((n) => n.title)).toEqual(['K0', 'K1', 'Enkel', 'K2', 'K3', 'K4']);
    const r = No.setParent(ws, p, g);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toBe('circle');
    expect(!r.ok && r.path).toEqual([p, kids[1], g]);
    const moved = No.setParent(ws, g, kids[2], act);
    expect(moved.ok).toBe(true);
    ws = (moved as { ws: Workspace }).ws;
    expect(No.noteById(ws, g)!.parent).toBe(kids[2]);
    ws = (No.setParent(ws, g, undefined) as { ws: Workspace }).ws;
    expect(No.noteById(ws, g)!.parent).toBeUndefined();
    expect(No.createNote(ws, { parent: 'fehlt' }).ws.notes!.at(-1)!.parent).toBeUndefined();
  });

  it('Ansichten: anlegen mit Standardnamen, Kanban mit drei Spalten', () => {
    let ws = base();
    let v1: string, v2: string, k: string;
    ({ ws, id: v1 } = No.createView(ws, 'todo', ''));
    ({ ws, id: v2 } = No.createView(ws, 'todo', ''));
    ({ ws, id: k } = No.createView(ws, 'kanban', 'Projekt', { makeId: seq() }));
    expect(No.viewById(ws, v1)!.name).toBe('To-do-Liste');
    expect(No.viewById(ws, v2)!.name).toBe('To-do-Liste 2');
    expect(No.viewById(ws, k)!.cols!.map((c) => c.name)).toEqual([...No.KANBAN_START]);
    ws = No.updateView(ws, k, { review: true, name: '  Board  ' });
    expect(No.viewById(ws, k)).toMatchObject({ name: 'Board', review: true });
    ws = No.updateView(ws, k, { review: false });
    expect(No.viewById(ws, k)!.review).toBeUndefined();
  });

  it('legt Notizen in Ansichten, verschiebt sie und zeigt sie zusätzlich (ohne Kopie)', () => {
    let ws = base();
    let n: string, todo: string, kb: string;
    ({ ws, id: n } = mk(ws, { title: 'X' }));
    ({ ws, id: todo } = No.createView(ws, 'todo', ''));
    ({ ws, id: kb } = No.createView(ws, 'kanban', '', { makeId: seq() }));
    ws = (No.placeNote(ws, n, { view: todo }, act) as { ws: Workspace }).ws;
    ws = (No.placeNote(ws, n, { view: kb }, { ...act, from: todo, also: true }) as { ws: Workspace }).ws;
    expect(No.viewsWith(ws, n).map((v) => v.id)).toEqual([todo, kb]);
    expect(No.viewById(ws, kb)!.cols![0].ids).toEqual([n]);
    // Im Board in andere Spalte
    const done = No.viewById(ws, kb)!.cols![2].id;
    ws = (No.placeNote(ws, n, { view: kb, col: done }) as { ws: Workspace }).ws;
    expect(No.viewById(ws, kb)!.cols!.map((c) => c.ids.length)).toEqual([0, 0, 1]);
    // Verschieben nimmt sie aus der Quelle
    ws = (No.placeNote(ws, n, { view: kb }, { ...act, from: todo }) as { ws: Workspace }).ws;
    expect(No.viewsWith(ws, n).map((v) => v.id)).toEqual([kb]);
    expect(No.noteById(ws, n)!.trail.map((e) => e.what)).toEqual(['created', 'placed', 'placed', 'moved']);
    ws = No.removeFromView(ws, n, kb, act);
    expect(No.viewsWith(ws, n)).toHaveLength(0);
    expect(No.noteById(ws, n)).toBeDefined();
  });

  it('Reihenfolge in Listen per Index (Tastatur „nach oben/unten“)', () => {
    let ws = base();
    let v: string;
    ({ ws, id: v } = No.createView(ws, 'todo', ''));
    const ids: string[] = [];
    for (const t of ['a', 'b', 'c']) {
      let id: string;
      ({ ws, id } = mk(ws, { title: t }));
      ids.push(id);
      ws = (No.placeNote(ws, id, { view: v }) as { ws: Workspace }).ws;
    }
    ws = (No.placeNote(ws, ids[2], { view: v, index: 0 }) as { ws: Workspace }).ws;
    expect(No.viewById(ws, v)!.ids).toEqual([ids[2], ids[0], ids[1]]);
    ws = (No.placeNote(ws, ids[2], { view: v, index: 99 }) as { ws: Workspace }).ws;
    expect(No.viewById(ws, v)!.ids).toEqual([ids[0], ids[1], ids[2]]);
  });

  it('Grenze 200 je Ansicht – Unter-Notizen zählen nicht', () => {
    let ws = base();
    let v: string;
    ({ ws, id: v } = No.createView(ws, 'block', ''));
    const notes: Workspace['notes'] = [];
    for (let i = 0; i < No.VIEW_MAX; i++) notes.push({ id: `x${i}`, title: '', text: '', state: 'open', trail: [], created: 0, changed: 0 });
    ws = { ...ws, notes, noteViews: ws.noteViews!.map((x) => ({ ...x, ids: notes.map((n) => n.id) })) };
    let extra: string, sub: string;
    ({ ws, id: extra } = mk(ws));
    ({ ws, id: sub } = mk(ws, { parent: 'x0' }));
    const r = No.placeNote(ws, extra, { view: v });
    expect(!r.ok && r.reason).toBe('full');
    expect(No.placeNote(ws, sub, { view: v }).ok).toBe(true);
    expect(No.placeNote(ws, 'x5', { view: v, index: 0 }).ok).toBe(true);
  });

  it('Kanban-Spalten: höchstens 8, löschen gibt Karten an den Nachbarn, letzte bleibt', () => {
    let ws = base();
    let k: string, n: string;
    ({ ws, id: k } = No.createView(ws, 'kanban', '', { makeId: seq() }));
    ({ ws, id: n } = mk(ws));
    const [c1, c2] = No.viewById(ws, k)!.cols!.map((c) => c.id);
    ws = (No.placeNote(ws, n, { view: k, col: c1 }) as { ws: Workspace }).ws;
    for (let i = 3; i < No.COLUMN_MAX; i++) ws = (No.addColumn(ws, k, '', { makeId: seq() }) as { ws: Workspace }).ws;
    expect(No.viewById(ws, k)!.cols).toHaveLength(No.COLUMN_MAX);
    expect(No.viewById(ws, k)!.cols!.at(-1)!.name).toBe(`Spalte ${No.COLUMN_MAX}`);
    const full = No.addColumn(ws, k, 'zu viel');
    expect(!full.ok && full.reason).toBe('full');
    // Erste Spalte löschen → Karten gehen nach rechts
    const r = No.removeColumn(ws, k, c1);
    expect(r.ok && r.id).toBe(c2);
    ws = (r as { ws: Workspace }).ws;
    expect(No.viewById(ws, k)!.cols![0].ids).toEqual([n]);
    ws = No.renameColumn(ws, k, c2, 'Neu');
    ws = No.moveColumn(ws, k, c2, 99);
    expect(No.viewById(ws, k)!.cols!.at(-1)).toMatchObject({ id: c2, name: 'Neu', ids: [n] });
    let one: string;
    ({ ws, id: one } = No.createView(ws, 'kanban', '', { makeId: seq() }));
    for (const c of No.viewById(ws, one)!.cols!.slice(1)) ws = (No.removeColumn(ws, one, c.id) as { ws: Workspace }).ws;
    const last = No.removeColumn(ws, one, No.viewById(ws, one)!.cols![0].id);
    expect(!last.ok && last.reason).toBe('last');
  });

  it('Regel „Abnahme nötig“: erledigt → in Prüfung, bis bestätigt', () => {
    let ws = base();
    let k: string, n: string;
    ({ ws, id: k } = No.createView(ws, 'kanban', ''));
    ({ ws, id: n } = mk(ws));
    ws = (No.placeNote(ws, n, { view: k }) as { ws: Workspace }).ws;
    ws = No.updateView(ws, k, { review: true });
    ws = No.setState(ws, n, 'done', act);
    expect(No.noteById(ws, n)!.state).toBe('review');
    ws = No.confirmReview(ws, n, act);
    expect(No.noteById(ws, n)!.state).toBe('done');
  });

  it('Eisenhower: Feld aus wichtig/dringend', () => {
    expect(No.quadrantOf({ important: true, urgent: true })).toBe(1);
    expect(No.quadrantOf({ important: true })).toBe(2);
    expect(No.quadrantOf({ urgent: true })).toBe(3);
    expect(No.quadrantOf({})).toBe(4);
  });

  it('löscht eine Notiz samt Unter-Notizen und holt alles zurück', () => {
    let ws = base();
    let p: string, k: string, o: string, v: string;
    ({ ws, id: p } = mk(ws, { title: 'P' }));
    ({ ws, id: k } = mk(ws, { title: 'K', parent: p }));
    ({ ws, id: o } = mk(ws, { title: 'O', attach: [{ kind: 'note', ref: p }] }));
    ws = (No.addLink(ws, o, k, { wait: true }) as { ws: Workspace }).ws;
    ({ ws, id: v } = No.createView(ws, 'todo', ''));
    ws = (No.placeNote(ws, p, { view: v }) as { ws: Workspace }).ws;
    ws = (No.placeNote(ws, o, { view: v }) as { ws: Workspace }).ws;
    const panel = ws.panels[0];
    ws = { ...ws, panels: [{ ...panel, tabs: [{ ...panel.tabs[0], note: p }] }, ...ws.panels.slice(1)] };
    const before = ws;
    const r = No.deleteNote(ws, p)!;
    expect(r.ws.notes!.map((n) => n.title)).toEqual(['O']);
    expect(No.noteById(r.ws, o)!.after).toBeUndefined();
    expect(No.noteById(r.ws, o)!.attach).toBeUndefined();
    expect(No.viewById(r.ws, v)!.ids).toEqual([o]);
    expect(r.ws.panels[0].tabs[0].note).toBeUndefined();
    const back = No.restoreNotes(r.ws, r.undo, act);
    expect(back.notes!.map((n) => n.title)).toEqual(['P', 'K', 'O']);
    expect(No.noteById(back, o)!.after).toEqual(No.noteById(before, o)!.after);
    expect(No.viewById(back, v)!.ids).toEqual([p, o]);
    expect(back.panels[0].tabs[0].note).toBe(p);
    expect(No.noteById(back, p)!.trail.at(-1)!.what).toBe('restored');
    expect(No.deleteNote(ws, 'fehlt')).toBeNull();
  });

  it('löscht eine Notiz und lässt Unter-Notizen hochrutschen', () => {
    let ws = base();
    let g: string, p: string, k1: string, k2: string, e: string;
    ({ ws, id: g } = mk(ws, { title: 'G' }));
    ({ ws, id: p } = mk(ws, { title: 'P', parent: g }));
    ({ ws, id: k1 } = mk(ws, { title: 'K1', parent: p }));
    ({ ws, id: k2 } = mk(ws, { title: 'K2', parent: p, state: 'done' }));
    ({ ws, id: e } = mk(ws, { title: 'E', parent: k1 }));
    expect(No.openDescendants(ws, p).map((n) => n.title)).toEqual(['K1', 'E']);
    expect(No.openDescendants(ws, k2)).toHaveLength(0);
    const r = No.deleteNote(ws, p, { keepChildren: true })!;
    expect(r.ws.notes!.map((n) => n.title)).toEqual(['G', 'K1', 'K2', 'E']);
    expect(No.noteById(r.ws, k1)!.parent).toBe(g);
    expect(No.noteById(r.ws, k2)!.parent).toBe(g);
    expect(No.noteById(r.ws, e)!.parent).toBe(k1);
    const back = No.restoreNotes(r.ws, r.undo, act);
    expect(No.noteById(back, k1)!.parent).toBe(p);
    expect(No.noteById(back, k2)!.parent).toBe(p);
    // oberste Ebene: Kinder haben danach keine Eltern
    const top = No.deleteNote(ws, g, { keepChildren: true })!;
    expect(No.noteById(top.ws, p)!.parent).toBeUndefined();
  });

  it('löscht eine Ansicht (Notizen bleiben) und holt sie zurück', () => {
    let ws = base();
    let v: string, n: string;
    ({ ws, id: v } = No.createView(ws, 'kanban', 'Team'));
    ({ ws, id: n } = mk(ws, { delegated: { to: 'Team', view: v } }));
    ws = (No.placeNote(ws, n, { view: v }) as { ws: Workspace }).ws;
    const panel = ws.panels[0];
    ws = { ...ws, panels: [{ ...panel, tabs: [{ ...panel.tabs[0], view: v }] }, ...ws.panels.slice(1)] };
    const r = No.deleteView(ws, v)!;
    expect(r.ws.noteViews).toEqual([]);
    expect(No.noteById(r.ws, n)!.delegated).toEqual({ to: 'Team' });
    expect(r.ws.panels[0].tabs[0].view).toBeUndefined();
    const back = No.restoreView(r.ws, r.undo);
    expect(idsOfBoard(back, v)).toEqual([n]);
    expect(back.panels[0].tabs[0].view).toBe(v);
  });
  const idsOfBoard = (ws: Workspace, v: string) => No.idsIn(No.viewById(ws, v)!);

  it('Speicher: Notizen, Ansichten und Tab-Verweise überstehen Speichern und Laden; Unbrauchbares fällt weg', () => {
    let ws = base();
    let a: string, b: string, v: string;
    ({ ws, id: a } = mk(ws, { title: 'A', tags: ['x'], due: '2026-12-01' }));
    ({ ws, id: b } = mk(ws, { title: 'B', parent: a }));
    ws = (No.addLink(ws, b, a, {}) as { ws: Workspace }).ws;
    ({ ws, id: v } = No.createView(ws, 'kanban', 'Board'));
    ws = (No.placeNote(ws, a, { view: v }) as { ws: Workspace }).ws;
    const panel = ws.panels[0];
    ws = { ...ws, panels: [{ ...panel, tabs: [{ id: panel.tabs[0].id, note: a }] }, ...ws.panels.slice(1)] };
    const back = parseWorkspace(JSON.parse(JSON.stringify(ws)))!;
    expect(back.notes).toEqual(ws.notes);
    expect(back.noteViews).toEqual(ws.noteViews);
    expect(back.panels[0].tabs[0].note).toBe(a);
    // kaputte Daten
    const raw = JSON.parse(JSON.stringify(ws));
    raw.notes.push({ id: a, title: 'doppelt' }, { title: 'ohne id' }, { id: 'c', state: 'kaputt', parent: 'fehlt', after: [{ id: 'fehlt', kind: 'done' }], due: '1.12.' });
    raw.notes[0].after = [{ id: b, kind: 'done' }]; // Kreis A↔B
    raw.noteViews.push({ id: 'v2', kind: 'todo', ids: [a, a, 'fehlt'] }, { id: 'v3', kind: 'gibt-es-nicht' });
    raw.panels[0].tabs[0].url = 'https://example.org/'; // Tab mit Adresse zeigt keine Notiz
    const p = parseWorkspace(raw)!;
    expect(p.notes!.map((n) => n.id)).toEqual([a, b, 'c']);
    const c = No.noteById(p, 'c')!;
    expect(c.state).toBe('open');
    expect(c.parent).toBeUndefined();
    expect(c.after).toBeUndefined();
    expect(c.due).toBeUndefined();
    expect(No.noteById(p, a)!.after?.length ?? 0).toBe(0);
    expect(No.viewById(p, 'v2')!.ids).toEqual([a]);
    expect(No.viewById(p, 'v3')).toBeUndefined();
    expect(p.panels[0].tabs[0].note).toBeUndefined();
    // ohne Notizen bleibt das Feld weg
    expect(parseWorkspace(JSON.parse(JSON.stringify(base())))!.notes).toBeUndefined();
  });

  it('Slot-Datei nimmt Notizen der Tabs (samt Unter-Notizen) und Ansichten mit, mit neuen Ids', () => {
    const setup: ScreenSetup = { cls: 'superwide', orientation: 'landscape', lines: 2 };
    let ws: Workspace = { ...base(), categories: [{ id: 'c1', name: 'Projekt' }] };
    let a: string, sub: string, other: string, v: string, inView: string;
    ({ ws, id: a } = mk(ws, { title: 'A', category: 'c1' }));
    ({ ws, id: sub } = mk(ws, { title: 'A1', parent: a }));
    ({ ws, id: other } = mk(ws, { title: 'nicht dabei' }));
    ({ ws, id: inView } = mk(ws, { title: 'im Board' }));
    ws = (No.addLink(ws, a, other, { wait: true }) as { ws: Workspace }).ws;
    ({ ws, id: v } = No.createView(ws, 'kanban', 'Board'));
    ws = (No.placeNote(ws, inView, { view: v }) as { ws: Workspace }).ws;
    const panel = ws.panels[0];
    ws = { ...ws, panels: [{ ...panel, tabs: [{ id: 't1', note: a }, { id: 't2', view: v }], activeTab: 't1' }, ...ws.panels.slice(1)] };
    const f = SF.slotToFile(ws, [panel.id], panel.id, 'Mac')!;
    expect(f.notes!.map((n) => n.title)).toEqual(['A', 'A1', 'im Board']);
    expect(f.noteViews!.map((x) => x.name)).toEqual(['Board']);
    expect(f.categories.map((c) => c.name)).toEqual(['Projekt']);
    const r = SF.readSlotFile(JSON.stringify(f));
    expect(r.ok).toBe(true);
    const file = (r as { file: SF.SlotFile }).file;
    const imp = SF.importSlot(ws, setup, file);
    expect(imp.ok).toBe(true);
    const out = (imp as { ws: Workspace }).ws;
    expect(out.notes).toHaveLength(7);
    const newTabs = out.panels.at(-1)!.tabs;
    const na = No.noteById(out, newTabs[0].note!)!;
    expect(na.id).not.toBe(a);
    expect(na.title).toBe('A');
    expect(na.after).toBeUndefined(); // Vorgänger kam nicht mit
    expect(na.category).toBe('c1');
    expect(No.childrenOf(out, na.id).map((n) => n.title)).toEqual(['A1']);
    expect(No.childrenOf(out, na.id)[0].id).not.toBe(sub);
    const nv = No.viewById(out, newTabs[1].view!)!;
    expect(nv.id).not.toBe(v);
    expect(No.idsIn(nv).map((id) => No.noteById(out, id)!.title)).toEqual(['im Board']);
  });
});

describe('F-206 Schritt 2: Notiz im Tab', () => {
  const setup = () => {
    const ws = W.defaultWorkspace();
    const p = ws.panels[0];
    return { ws, pid: p.id, tid: p.tabs[0].id };
  };
  it('legt im leeren Tab eine Notiz an; der Tab zeigt nur darauf und trägt ihren Titel', () => {
    const { ws: w0, pid, tid } = setup();
    let ws = reducer(w0, { type: 'tabNote', id: pid, tab: tid, kind: 'note', by: 'Enrico' });
    const tab = ws.panels[0].tabs[0];
    expect(tab.note).toBeDefined();
    expect(ws.notes).toHaveLength(1);
    expect(W.tabLabel(tab, ws)).toBe('Neue Notiz');
    ws = reducer(ws, { type: 'noteEdit', id: tab.note!, patch: { text: '# Einkauf\n- Milch' } });
    expect(W.tabLabel(ws.panels[0].tabs[0], ws)).toBe('Einkauf');
    expect(W.tabLabel(ws.panels[0].tabs[0])).toBe('Notiz');
    // zweimal anlegen geht nicht (Tab ist schon belegt)
    expect(reducer(ws, { type: 'tabNote', id: pid, tab: tid, kind: 'todo' })).toBe(ws);
  });
  it('legt im leeren Tab eine Ansicht an (Beschriftung = Name)', () => {
    const { ws: w0, pid, tid } = setup();
    const ws = reducer(w0, { type: 'tabNote', id: pid, tab: tid, kind: 'kanban' });
    const tab = ws.panels[0].tabs[0];
    expect(ws.noteViews!.map((v) => v.kind)).toEqual(['kanban']);
    expect(W.tabLabel(tab, ws)).toBe('Kanban-Board');
  });
  it('Tab schließen: leere Notiz wird still verworfen, beschriebene bleibt in der Library', () => {
    const { ws: w0, pid, tid } = setup();
    let ws = reducer(w0, { type: 'tabNote', id: pid, tab: tid, kind: 'note' });
    ws = reducer(ws, { type: 'closeTab', id: pid, tab: tid });
    expect(ws.notes).toEqual([]);
    expect(ws.closed ?? []).toHaveLength(0);
    const tid2 = ws.panels[0].tabs[0].id;
    ws = reducer(ws, { type: 'tabNote', id: pid, tab: tid2, kind: 'note' });
    const nid = ws.panels[0].tabs[0].note!;
    ws = reducer(ws, { type: 'noteEdit', id: nid, patch: { text: 'bleibt' } });
    ws = reducer(ws, { type: 'closeTab', id: pid, tab: tid2 });
    expect(ws.notes!.map((n) => n.id)).toEqual([nid]);
  });
  it('Zustand über den Reducer; eine Adresse ersetzt die Notiz im Tab, die Notiz bleibt', () => {
    const { ws: w0, pid, tid } = setup();
    let ws = reducer(w0, { type: 'tabNote', id: pid, tab: tid, kind: 'note' });
    const nid = ws.panels[0].tabs[0].note!;
    ws = reducer(ws, { type: 'noteState', id: nid, state: 'doing' });
    expect(ws.notes![0].state).toBe('doing');
    ws = W.navigatePanel(ws, pid, 'example.org');
    expect(ws.panels[0].tabs[0].note).toBeUndefined();
    expect(ws.panels[0].tabs[0].url).toBe('https://example.org');
    expect(ws.notes).toHaveLength(1);
  });
  it('Hilfe: Einträge zu Notizen haben Symbole', () => {
    for (const id of ['note', 'noteState', 'todo', 'kanban', 'eisenhower', 'newNote']) {
      expect(H.HELP.some((h) => h.id === id)).toBe(true);
      expect(Ic.HELP_ICON[id]).toBeDefined();
    }
  });
});

describe('F-206 Schritt 3: Notizen finden und öffnen', () => {
  const base = () => {
    let ws = W.defaultWorkspace();
    const a = No.createNote(ws, { text: '# Einkauf\n- [ ] Milch\n- [ ] Brot' }, { id: 'n1', now: 1 });
    ws = a.ws;
    const b = No.createNote(ws, { text: 'Anruf beim **Zahnarzt** wegen Termin', tags: ['privat'] }, { id: 'n2', now: 2 });
    ws = b.ws;
    ws = No.createNote(ws, {}, { id: 'leer', now: 3 }).ws;
    ws = No.createView(ws, 'kanban', 'Bewerbungen', { id: 'v1' }).ws;
    return ws;
  };
  it('findet Notizen über Titel, Text ohne Markdown und Tags; leere nie', () => {
    const ws = base();
    expect(No.searchNotes(ws, 'einkauf').map((h) => (h.kind === 'note' ? h.note.id : h.view.id))).toEqual(['n1']);
    const z = No.searchNotes(ws, 'zahnarzt termin');
    expect(z).toHaveLength(1);
    expect(z[0].kind === 'note' && z[0].title).toBe('Anruf beim Zahnarzt wegen Termin');
    expect(No.searchNotes(ws, '#privat').map((h) => h.kind === 'note' && h.note.id)).toEqual(['n2']);
    expect(No.searchNotes(ws, 'milch')[0].kind === 'note' && (No.searchNotes(ws, 'milch')[0] as { snippet: string }).snippet).toContain('Milch');
    expect(No.searchNotes(ws, '   ')).toHaveLength(0);
    expect(No.searchNotes(ws, 'xyz')).toHaveLength(0);
  });
  it('Ausschnitt wiederholt den Titel nicht', () => {
    const h = No.searchNotes(base(), 'einkauf')[0];
    expect(h.kind === 'note' && h.snippet).toBe('Milch Brot');
  });
  it('Titeltreffer zuerst, Archiviertes zuletzt; Ansichten über Name und Art', () => {
    let ws = base();
    ws = No.createNote(ws, { text: 'Notiz\nzum Einkauf später' }, { id: 'n3', now: 5 }).ws;
    expect(No.searchNotes(ws, 'einkauf').map((h) => h.kind === 'note' && h.note.id)).toEqual(['n1', 'n3']);
    ws = No.setState(ws, 'n1', 'archived');
    expect(No.searchNotes(ws, 'einkauf').map((h) => h.kind === 'note' && h.note.id)).toEqual(['n3', 'n1']);
    expect(No.searchNotes(ws, 'bewerb').map((h) => h.kind)).toEqual(['view']);
    expect(No.searchNotes(ws, 'kanban', 20, { kanban: 'Kanban-Board' }).map((h) => h.kind)).toEqual(['view']);
  });
  it('öffnet im leeren Tab, sonst in neuem Tab; zeigt sie schon ein Tab, nur dorthin', () => {
    let ws = base();
    const pid = ws.panels[0].id;
    let r = No.openNoteIn(ws, pid, { note: 'n1' });
    expect(r.result).toBe('opened');
    ws = r.ws;
    expect(ws.panels[0].tabs).toHaveLength(1);
    expect(ws.panels[0].tabs[0].note).toBe('n1');
    r = No.openNoteIn(ws, pid, { note: 'n1' });
    expect(r.result).toBe('shown');
    expect(r.ws).toBe(ws);
    r = No.openNoteIn(ws, pid, { view: 'v1' });
    expect(r.result).toBe('opened');
    ws = r.ws;
    expect(ws.panels[0].tabs).toHaveLength(2);
    expect(ws.panels[0].activeTab).toBe(ws.panels[0].tabs[1].id);
    expect(ws.panels[0].tabs[1].view).toBe('v1');
    expect(No.openNoteIn(ws, pid, { note: 'fehlt' }).result).toBe('missing');
  });
  it('volles Portal: „full“; über den Reducer', () => {
    let ws = base();
    const pid = ws.panels[0].id;
    for (let i = 0; i < W.TAB_MAX; i++) ws = W.addTab(ws, pid, `a${i}.de`);
    expect(No.openNoteIn(ws, pid, { note: 'n2' }).result).toBe('full');
    const w1 = base();
    const w2 = reducer(w1, { type: 'openNote', panel: w1.panels[0].id, ref: { note: 'n2' } });
    expect(w2.panels[0].tabs[0].note).toBe('n2');
  });
  it('Adresse im Tab einer leeren Notiz verwirft sie still; beschriebene bleibt', () => {
    const w0 = W.defaultWorkspace();
    const pid = w0.panels[0].id;
    let ws = reducer(w0, { type: 'tabNote', id: pid, tab: w0.panels[0].tabs[0].id, kind: 'note' });
    ws = reducer(ws, { type: 'setUrl', id: pid, url: 'example.org' });
    expect(ws.notes).toEqual([]);
    expect(ws.panels[0].tabs[0].url).toBe('https://example.org');
    ws = reducer(ws, { type: 'addTab', id: pid });
    const tid = ws.panels[0].activeTab;
    ws = reducer(ws, { type: 'tabNote', id: pid, tab: tid, kind: 'note' });
    const nid = ws.panels[0].tabs[1].note!;
    ws = reducer(ws, { type: 'noteEdit', id: nid, patch: { text: 'bleibt' } });
    ws = reducer(ws, { type: 'setUrl', id: pid, url: 'example.com' });
    expect(ws.notes!.map((n) => n.id)).toEqual([nid]);
  });
  it('leere Notiz bleibt, wenn ein anderer Tab sie zeigt oder sie in einer Ansicht liegt', () => {
    let ws = base();
    ws = { ...ws, panels: ws.panels.map((p, i) => (i === 0 ? { ...p, tabs: [{ id: 't1', note: 'leer' }, { id: 't2', note: 'leer' }] } : p)) };
    expect(No.dropIfEmpty(ws, 'leer', 't1')).toBe(ws);
    expect(No.dropIfEmpty(ws, 'leer').notes!.some((n) => n.id === 'leer')).toBe(true);
    const w2 = { ...ws, panels: ws.panels.map((p, i) => (i === 0 ? { ...p, tabs: [{ id: 't1', note: 'leer' }] } : p)) };
    expect(No.dropIfEmpty(w2, 'leer', 't1').notes!.some((n) => n.id === 'leer')).toBe(false);
    const w3 = (No.placeNote(w2, 'leer', { view: 'v1' }) as { ws: Workspace }).ws;
    expect(No.dropIfEmpty(w3, 'leer', 't1').notes!.some((n) => n.id === 'leer')).toBe(true);
  });
});

describe('F-206: Zurück zur Auswahl', () => {
  it('leere Ansicht wird verworfen, gefüllte bleibt; Tab ist danach leer', () => {
    const w0 = W.defaultWorkspace();
    const pid = w0.panels[0].id;
    const tid = w0.panels[0].tabs[0].id;
    let ws = reducer(w0, { type: 'tabNote', id: pid, tab: tid, kind: 'kanban' });
    ws = reducer(ws, { type: 'tabLeave', id: pid, tab: tid });
    expect(ws.noteViews).toEqual([]);
    expect(ws.panels[0].tabs[0]).toEqual({ id: tid });
    ws = reducer(ws, { type: 'tabNote', id: pid, tab: tid, kind: 'todo' });
    const vid = ws.panels[0].tabs[0].view!;
    const made = No.createNote(ws, { text: 'Karte' }, { id: 'k1' });
    ws = (No.placeNote(made.ws, 'k1', { view: vid }) as { ws: Workspace }).ws;
    ws = reducer(ws, { type: 'tabLeave', id: pid, tab: tid });
    expect(ws.noteViews!.map((v) => v.id)).toEqual([vid]);
    expect(ws.panels[0].tabs[0].view).toBeUndefined();
  });
  it('Notiz: leere wird verworfen; Tab mit Adresse bleibt unverändert', () => {
    const w0 = W.defaultWorkspace();
    const pid = w0.panels[0].id;
    const tid = w0.panels[0].tabs[0].id;
    let ws = reducer(w0, { type: 'tabNote', id: pid, tab: tid, kind: 'note' });
    ws = reducer(ws, { type: 'tabLeave', id: pid, tab: tid });
    expect(ws.notes).toEqual([]);
    const w2 = W.navigatePanel(ws, pid, 'example.org');
    expect(No.leaveTab(w2, pid, tid)).toBe(w2);
  });
});

describe('F-206 Notiz-Eingabe: Markdown ↔ Blöcke', () => {
  const md = ['# Einkauf', 'Erste Zeile mit **fett** und *kursiv*', '- [ ] Milch', '- [x] Brot', '', '- Punkt', '1. eins', '2. zwei', '> Zitat', '```', 'a *b*', '```', '\\- kein Punkt'].join('\n');
  it('liest jede Zeile als Block und schreibt sie unverändert zurück', () => {
    const b = ND.parseDoc(md);
    expect(b.map((x) => x.k)).toEqual(['h', 'p', 'task', 'task', 'p', 'li', 'ol', 'ol', 'quote', 'code', 'p']);
    expect(b[2]).toEqual({ k: 'task', text: 'Milch', done: false });
    expect(b[3].done).toBe(true);
    expect(b[9].text).toBe('a *b*');
    expect(b[10]).toEqual({ k: 'p', text: '- kein Punkt' });
    expect(ND.serializeDoc(b)).toBe(md);
  });
  it('zählt Nummern neu, lässt leere Absätze am Ende weg', () => {
    expect(ND.serializeDoc([{ k: 'ol', text: 'a' }, { k: 'ol', text: 'b' }, { k: 'p', text: 'x' }, { k: 'ol', text: 'c' }, { k: 'p', text: '' }])).toBe('1. a\n2. b\nx\n1. c');
    expect(ND.serializeDoc([{ k: 'p', text: '' }])).toBe('');
    expect(ND.parseDoc('')).toEqual([{ k: 'p', text: '' }]);
  });
  it('erkennt Tipp-Kürzel', () => {
    expect(ND.shortcut('- ')).toEqual({ k: 'li', text: '' });
    expect(ND.shortcut('[] ')).toEqual({ k: 'task', text: '', done: false });
    expect(ND.shortcut('[ ] a')).toEqual({ k: 'task', text: 'a', done: false });
    expect(ND.shortcut('- [ ] ')!.k).toBe('task');
    expect(ND.shortcut('## x')).toEqual({ k: 'h', text: 'x', level: 2 });
    expect(ND.shortcut('1. ')!.k).toBe('ol');
    expect(ND.shortcut('-x')).toBeNull();
  });
  it('wandelt Inline-Teile hin und zurück, getippte Zeichen werden geschützt', () => {
    const s = ND.parseInline('a **fett *mit* kursiv** `co*de` [Seite](https://x.de) https://y.de/ \\*kein\\*');
    expect(s.map((x) => x.t)).toEqual(['text', 'b', 'text', 'code', 'text', 'link', 'text', 'link', 'text']);
    expect(ND.plainOf(s)).toBe('a fett mit kursiv co*de Seite https://y.de/ *kein*');
    expect(ND.inlineMd(s)).toBe('a **fett *mit* kursiv** `co*de` [Seite](https://x.de) https://y.de/ \\*kein\\*');
    expect(ND.parseInline('[x](javascript:alert(1))')[0].t).toBe('text');
    expect(ND.inlineMd([{ t: 'b', kids: [{ t: 'text', text: ' fett ' }] }])).toBe(' **fett** ');
    expect(ND.mergeSpans([{ t: 'text', text: 'a' }, { t: 'text', text: 'b' }, { t: 'b', kids: [{ t: 'text', text: 'c' }] }, { t: 'b', kids: [{ t: 'text', text: 'd' }] }])).toEqual([
      { t: 'text', text: 'ab' },
      { t: 'b', kids: [{ t: 'text', text: 'cd' }] },
    ]);
    expect(ND.taskCount(md)).toEqual({ done: 1, all: 2 });
  });
  it('Titel ohne Schutzzeichen', () => {
    expect(No.titleOf({ title: '', text: '\\- a \\*b\\*' })).toBe('- a b');
  });
});

describe('F-206 Datenmodell v8 (V66)', () => {
  const raw = (extra: Record<string, unknown>) => JSON.parse(JSON.stringify({ ...W.defaultWorkspace(), ...extra }));
  const note = (id: string, more: Record<string, unknown> = {}) => ({ id, title: id, text: '', state: 'open', trail: [], created: 1, changed: 1, ...more });

  it('Umstieg aus v7: Vorgänger „muss erledigt sein“ = EA + wartet, „bestimmt den Termin“ = EA', () => {
    const ws = parseWorkspace(raw({ notes: [note('a'), note('b', { after: [{ id: 'a', kind: 'done' }] }), note('c', { after: [{ id: 'a', kind: 'date' }] })] }))!;
    expect(No.noteById(ws, 'b')!.after).toEqual([{ id: 'a', rel: 'EA', wait: true }]);
    expect(No.noteById(ws, 'c')!.after).toEqual([{ id: 'a', rel: 'EA' }]);
    // zweites Laden ändert nichts mehr
    expect(parseWorkspace(JSON.parse(JSON.stringify(ws)))!.notes).toEqual(ws.notes);
  });

  it('Anordnungsbeziehungen: Art, Zeitabstand und „wartet darauf“ überstehen Speichern; Unbekanntes fällt weg', () => {
    const ws = parseWorkspace(raw({ notes: [note('a'), note('b', { after: [{ id: 'a', rel: 'AE', lag: -2.4, wait: true }, { id: 'a', rel: 'XY' }] })] }))!;
    expect(No.noteById(ws, 'b')!.after).toEqual([{ id: 'a', rel: 'AE', lag: -2, wait: true }]);
  });

  it('jede Beziehung plant den Termin: EA mit Zeitabstand, AA nach Beginn des Vorgängers', () => {
    let ws = parseWorkspace(raw({ notes: [note('a', { due: '2026-12-10', notBefore: '2026-12-03' }), note('b')] }))!;
    ws = (No.addLink(ws, 'b', 'a', { lag: 2 }) as { ws: Workspace }).ws;
    expect(No.earliestStart(ws, No.noteById(ws, 'b')!)).toBe('2026-12-12');
    expect(No.stateOf(ws, No.noteById(ws, 'b')!, '2026-12-01')).toEqual({ state: 'waiting', cause: 'date', from: '2026-12-12' });
    ws = (No.addLink(ws, 'b', 'a', { rel: 'AA', wait: true }) as { ws: Workspace }).ws;
    expect(No.noteById(ws, 'b')!.after).toEqual([{ id: 'a', rel: 'AA', wait: true }]);
    expect(No.stateOf(ws, No.noteById(ws, 'b')!, '2026-12-05')).toEqual({ state: 'waiting', cause: 'after', blockers: ['a'] });
    ws = No.setState(ws, 'a', 'doing');
    expect(No.stateOf(ws, No.noteById(ws, 'b')!, '2026-12-05')).toEqual({ state: 'open' });
    // EE sperrt den Beginn nicht
    ws = (No.addLink(ws, 'b', 'a', { rel: 'EE', wait: true }) as { ws: Workspace }).ws;
    ws = No.setState(ws, 'a', 'open');
    expect(No.stateOf(ws, No.noteById(ws, 'b')!, '2026-12-05').state).toBe('open');
    expect(No.shiftDay('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('„delegiert an“ wird zur Person – gleicher Name = dieselbe Person, auf jedem Gerät dieselbe Id', () => {
    const data = raw({ notes: [note('a', { delegated: { to: 'Maike' } }), note('b', { delegated: { to: ' maike ' } }), note('c', { delegated: { to: 'Tom' } })] });
    const ws = parseWorkspace(data)!;
    expect(ws.persons!.map((p) => p.name)).toEqual(['Maike', 'Tom']);
    const maike = ws.persons![0].id;
    expect(No.noteById(ws, 'a')!.delegated).toEqual({ to: 'Maike', person: maike });
    expect(No.noteById(ws, 'b')!.delegated!.person).toBe(maike);
    expect(parseWorkspace(data)!.persons).toEqual(ws.persons);
    expect(parseWorkspace(JSON.parse(JSON.stringify(ws)))!.persons).toEqual(ws.persons);
  });

  it('neue Felder an Notes überstehen Speichern; Bezüge auf fehlende Projekte und Personen fallen weg', () => {
    const full = note('a', {
      type: 'risk', project: 'p1', assignee: 'u1', effort: { plan: 4, actual: 1.5 }, cost: { plan: 200 }, milestone: true,
      remind: { at: '2026-12-01T09:00:00.000Z', repeat: 'week' }, accept: [{ text: 'getestet', ok: true }, { text: ' ' }],
      sources: [{ id: 's1', title: 'Video', url: 'https://example.org/v', at: { time: 95 } }, { id: 's1', title: 'Video', url: 'https://example.org/v', at: { time: 95 } }],
    });
    const ws = parseWorkspace(raw({ notes: [full, note('b', { project: 'fehlt', assignee: 'fehlt', type: 'quatsch' })], projects: [{ id: 'p1', name: 'Umzug' }], persons: [{ id: 'u1', name: 'Enrico', me: true }] }))!;
    const a = No.noteById(ws, 'a')!;
    expect(a.type).toBe('risk');
    expect(a.project).toBe('p1');
    expect(a.assignee).toBe('u1');
    expect(a.effort).toEqual({ plan: 4, actual: 1.5 });
    expect(a.accept).toEqual([{ text: 'getestet', ok: true }]);
    expect(a.sources).toEqual([{ id: 's1', title: 'Video', url: 'https://example.org/v', at: { time: 95 } }]);
    const b = No.noteById(ws, 'b')!;
    expect(b.project).toBeUndefined();
    expect(b.assignee).toBeUndefined();
    expect(b.type).toBeUndefined();
    expect(parseWorkspace(JSON.parse(JSON.stringify(ws)))!).toEqual(ws);
  });

  it('Projekte: Scope nur bekannt, Teilprojekte ohne Kreise', () => {
    const base = W.defaultWorkspace();
    const ws = parseWorkspace(raw({
      spheres: [{ id: 'sp', name: 'Firma' }], scenarios: [{ id: 'sc', name: 'Kunden', space: 'sp' }],
      projects: [
        { id: 'p1', name: 'A', scope: 'sc', parent: 'p2', priority: 9 },
        { id: 'p2', name: 'B', scope: 'weg', parent: 'p1', state: 'running', points: 4 },
        { id: 'p1', name: 'doppelt' },
      ],
    }))!;
    expect(base.projects).toBeUndefined();
    expect(ws.projects!.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(ws.projects![0].scope).toBe('sc');
    expect(ws.projects![0].priority).toBeUndefined();
    expect(ws.projects![1].scope).toBeUndefined();
    expect(ws.projects!.filter((p) => p.parent)).toHaveLength(1);
  });

  it('Pads: jedes Sheet höchstens in einem Pad, bis 9 Sheets, nur bekannte Desks', () => {
    const views = Array.from({ length: 11 }, (_, i) => ({ id: `v${i}`, kind: 'block', name: `S${i}`, ids: [] }));
    const ws = parseWorkspace(raw({
      noteViews: views,
      pads: [
        { id: 'p1', desk: '', sheets: views.map((v) => v.id), active: 'v10' },
        { id: 'p2', desk: 'weg', sheets: ['v0', 'v9', 'fehlt'], active: 'v0', docked: true },
        { id: 'p3', desk: '', sheets: ['v1'] },
      ],
      padDesks: { '': { places: { p1: { x: 0.1, y: 0.1, w: 0.3, h: 0.4 }, p3: { x: 2, y: 0, w: 1, h: 1 } }, dock: { edge: 'right', at: 0.5 } } },
    }))!;
    expect(ws.pads).toEqual([
      { id: 'p1', desk: '', sheets: ['v0', 'v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8'], active: 'v0' },
      { id: 'p2', desk: '', sheets: ['v9'], active: 'v9', docked: true },
    ]);
    expect(ws.padDesks).toEqual({ '': { places: { p1: { x: 0.1, y: 0.1, w: 0.3, h: 0.4 } }, dock: { edge: 'right', at: 0.5 } } });
  });

  it('Pad-Plätze gehören zum Gerät (DEVICE_FIELDS) und zählen nicht als Änderung', () => {
    const ws = parseWorkspace(raw({ noteViews: [{ id: 'v', kind: 'block', name: 'S', ids: [] }], pads: [{ id: 'p', desk: '', sheets: ['v'], active: 'v' }] }))!;
    const here: Workspace = { ...ws, padDesks: { '': { places: { p: { x: 0, y: 0, w: 0.5, h: 0.5 } } } } };
    const there: Workspace = { ...ws, padDesks: { '': { places: { p: { x: 0.5, y: 0.5, w: 0.5, h: 0.5 } } } } };
    expect(onlyDeviceChanged(JSON.stringify(here), there)).toBe(true);
    expect(keepDeviceFields(there, here).padDesks).toEqual(here.padDesks);
  });

  it('Sheets, Spalten und Desk-Einstellungen: neue Felder bleiben erhalten', () => {
    const ws = parseWorkspace(raw({
      noteViews: [{ id: 'k', kind: 'kanban', name: 'Board', cols: [{ id: 'c1', name: 'Offen', ids: [], wip: 3.7 }, { id: 'c2', name: 'Fertig', ids: [], wip: 0 }], owner: { kind: 'project', id: 'p1' }, range: { kind: 'all' }, check: true }],
      deskNotes: { '': { noteMode: true, stage: { area: 'a1', fixed: true } }, weg: { noteMode: true } },
      focusViews: ['week', 'quatsch', 'line'],
    }))!;
    const k = No.viewById(ws, 'k')!;
    expect(k.cols!.map((c) => c.wip)).toEqual([3, undefined]);
    expect(k.owner).toEqual({ kind: 'project', id: 'p1' });
    expect(k.range).toEqual({ kind: 'all' });
    expect(k.check).toBe(true);
    expect(ws.deskNotes).toEqual({ '': { noteMode: true, stage: { area: 'a1', fixed: true } } });
    expect(ws.focusViews).toEqual(['line', 'week']);
  });

  it('Slot-Datei: Version 2; Projekte, Personen und Besitzer bleiben in der Herkunft', () => {
    expect(SF.SLOT_VERSION).toBe(2);
    const ws0 = parseWorkspace(raw({ projects: [{ id: 'p1', name: 'A' }], persons: [{ id: 'u1', name: 'Tom' }], notes: [note('a', { project: 'p1', assignee: 'u1', delegated: { to: 'Tom', person: 'u1' } })] }))!;
    const n = No.noteById(ws0, 'a')!;
    const out = No.importNotes(W.defaultWorkspace(), [n], [], new Map(), () => 'neu');
    const moved = out.ws.notes!.at(-1)!;
    expect(moved.project).toBeUndefined();
    expect(moved.assignee).toBeUndefined();
    expect(moved.delegated).toEqual({ to: 'Tom' });
  });
});

describe('F-206 Schritt 3: Pads (Logik, V66)', () => {
  let n = 0;
  const make = () => `id${++n}`;
  const start = () => {
    n = 0;
    let ws = W.defaultWorkspace();
    const a = No.createNote(ws, { title: 'A' }, { id: 'a' });
    ws = No.createNote(a.ws, { title: 'B' }, { id: 'b' }).ws;
    return ws;
  };

  it('Note öffnen: ohne Pad neues Pad mit Notizblock, danach in denselben Notizblock, offen = dorthin', () => {
    let ws = start();
    const r1 = Pd.openNoteInPad(ws, '', 'a', { makeId: make });
    expect(r1.result).toBe('opened');
    ws = r1.ws;
    const r = r1 as { pad: string; sheet: string };
    expect(No.viewById(ws, r.sheet)!.kind).toBe('block');
    expect(No.viewById(ws, r.sheet)!.name).toBe('Notizblock');
    const r2 = Pd.openNoteInPad(ws, '', 'b', { makeId: make }) as { result: string; ws: Workspace; pad: string; sheet: string };
    expect(r2.pad).toBe(r.pad);
    expect(r2.sheet).toBe(r.sheet);
    ws = r2.ws;
    expect(No.viewById(ws, r.sheet)!.ids).toEqual(['a', 'b']);
    expect(Pd.openNoteInPad(ws, '', 'a').result).toBe('shown');
    expect(Pd.padsOf(ws)).toHaveLength(1);
  });

  it('F-215 V70: Zuletzt genutzt – neueste zuerst, ohne Doppel, höchstens 5, nur was noch im Pad liegt', () => {
    let ws = start();
    const r = Pd.openNoteInPad(ws, '', 'a', { makeId: make }) as { ws: Workspace; pad: string; sheet: string };
    ws = Pd.openNoteInPad(r.ws, '', 'b', { makeId: make }).ws;
    ws = Pd.touchRecent(ws, r.pad, { note: 'a' });
    ws = Pd.touchRecent(ws, r.pad, { note: 'b' });
    ws = Pd.touchRecent(ws, r.pad, { note: 'a' });
    expect(Pd.padById(ws, r.pad)!.recent).toEqual(['n:a', 'n:b']);
    expect(Pd.touchRecent(ws, r.pad, { note: 'a' })).toBe(ws); // schon vorn: nichts ändern
    for (let i = 0; i < 6; i++) ws = Pd.touchRecent(ws, r.pad, { sheet: `x${i}` });
    expect(Pd.padById(ws, r.pad)!.recent).toHaveLength(Pd.RECENT_MAX);
    ws = Pd.touchRecent(Pd.touchRecent(ws, r.pad, { note: 'b' }), r.pad, { sheet: r.sheet });
    // x… gibt es nicht; das Sichtbare (Note b) fehlt in der Liste
    expect(Pd.recentIn(ws, r.pad, { sheet: r.sheet, note: 'b' })).toEqual([{ kind: 'sheet', id: r.sheet }]);
    expect(Pd.recentIn(ws, r.pad, { sheet: r.sheet })).toEqual([{ kind: 'note', id: 'b', sheet: r.sheet }]);
  });

  it('F-206 V85: Cockpit „Notizen“ – Pad auf anderen Desk (N10), Schließen rückgängig', () => {
    let ws = start();
    const r = Pd.openNoteInPad(ws, '', 'a', { makeId: make }) as { ws: Workspace; pad: string; sheet: string };
    ws = Pd.dockPad(Pd.setPlace(r.ws, '', r.pad, { x: 0.1, y: 0.2, w: 0.3, h: 0.4 }), r.pad, true);
    // N10: auf Desk w2 – schwebend, oben, alter Platz weg, neuer Platz gesetzt
    const moved = Pd.movePadToDesk(ws, r.pad, 'w2', { x: 0.5, y: 0, w: 0.5, h: 1 });
    expect(Pd.padById(moved, r.pad)!.desk).toBe('w2');
    expect(Pd.padById(moved, r.pad)!.docked).toBeUndefined();
    expect(Pd.placeOf(moved, '', r.pad)).toBeUndefined();
    expect(Pd.placeOf(moved, 'w2', r.pad)).toEqual({ x: 0.5, y: 0, w: 0.5, h: 1 });
    expect(Pd.topPad(moved, 'w2')!.id).toBe(r.pad);
    expect(Pd.movePadToDesk(moved, r.pad, 'w2')).toBe(moved); // schon dort
    // ohne Platz: bekommt ihn beim ersten Zeigen
    expect(Pd.placeOf(Pd.movePadToDesk(ws, r.pad, 'w3'), 'w3', r.pad)).toBeUndefined();
    // Schließen rückgängig: Pad mit Platz und Stapelplatz zurück; ein leeres Sheet kommt mit
    const v = No.createView(ws, 'block', 'Leer', { makeId: make });
    ws = (Pd.addSheet(v.ws, r.pad, v.id) as { ws: Workspace }).ws;
    const two = Pd.createPad(ws, '', [], { id: 'p2' });
    ws = two.ws;
    const undo = Pd.padUndoOf(ws, r.pad)!;
    expect(undo.views.map((x) => x.view.id)).toEqual([v.id]);
    const closed = Pd.closePad(ws, r.pad);
    expect(Pd.padById(closed, r.pad)).toBeUndefined();
    expect(No.viewById(closed, v.id)).toBeUndefined();
    const back = Pd.restorePad(closed, undo);
    expect(Pd.padsOf(back).map((p) => p.id)).toEqual(Pd.padsOf(ws).map((p) => p.id));
    expect(Pd.padById(back, r.pad)!.sheets).toEqual([r.sheet, v.id]);
    expect(Pd.padById(back, r.pad)!.docked).toBe(true);
    expect(Pd.placeOf(back, '', r.pad)).toEqual({ x: 0.1, y: 0.2, w: 0.3, h: 0.4 });
    expect(Pd.restorePad(back, undo)).toBe(back); // schon wieder da
    expect(Pd.padTitle(back, Pd.padById(back, r.pad)!)).toBe('Leer'); // sichtbares Sheet
    // Sheet schließen rückgängig: Reiter an seinen Platz, leeres Sheet kommt zurück, sichtbares bleibt
    const su = Pd.sheetUndoOf(back, r.pad, v.id)!;
    const shut = Pd.closeSheet(Pd.showSheet(back, r.pad, r.sheet), r.pad, v.id);
    expect(No.viewById(shut, v.id)).toBeUndefined();
    const again = Pd.restoreSheet(shut, su);
    expect(Pd.padById(again, r.pad)!.sheets).toEqual([r.sheet, v.id]);
    expect(Pd.padById(again, r.pad)!.active).toBe(v.id); // war vorher sichtbar
    // letztes Sheet: Pad verschwindet und kommt ganz zurück
    const one = Pd.closeSheet(again, r.pad, v.id);
    const lu = Pd.sheetUndoOf(one, r.pad, r.sheet)!;
    expect('pad' in lu).toBe(true);
    expect(Pd.padById(Pd.restoreSheet(Pd.closeSheet(one, r.pad, r.sheet), lu), r.pad)!.sheets).toEqual([r.sheet]);
  });

  it('F-206 V81: Dock – ins Dock und zurück an den letzten Platz, alle ins Dock, Breite, Lasche, weg', () => {
    let ws = start();
    const r = Pd.openNoteInPad(ws, '', 'a', { makeId: make }) as { ws: Workspace; pad: string; sheet: string };
    ws = Pd.setPlace(r.ws, '', r.pad, { x: 0.1, y: 0.2, w: 0.3, h: 0.4 });
    const v2 = No.createView(ws, 'block', 'Zweiter Block', { makeId: make });
    const two = Pd.createPad(v2.ws, '', [v2.id], { id: 'p2' });
    ws = two.ws;
    expect(Pd.dockedOn(ws, '')).toEqual([]);
    expect(Pd.dockBand(ws, '', 1200)).toBe(0);
    ws = Pd.dockPad(ws, r.pad, true);
    expect(Pd.dockedOn(ws, '').map((p) => p.id)).toEqual([r.pad]);
    expect(Pd.dockFront(ws, '')!.id).toBe(r.pad);
    // V103 (Enrico): Normalzustand eingeklappt – ins Dock legen klappt nicht auf
    expect(Pd.dockBand(ws, '', 1200)).toBe(Pd.DOCK_TAB_W);
    ws = Pd.setDock(ws, '', { folded: false });
    expect(Pd.dockBand(ws, '', 1200)).toBe(Pd.DOCK_W.start);
    expect(Pd.dockPad(ws, r.pad, true)).toBe(ws); // schon drin
    // D6: heraus – der alte Platz ist noch da
    const out = Pd.dockPad(ws, r.pad, false);
    expect(Pd.padById(out, r.pad)!.docked).toBeUndefined();
    expect(Pd.placeOf(out, '', r.pad)).toEqual({ x: 0.1, y: 0.2, w: 0.3, h: 0.4 });
    expect(Pd.topPad(out, '')!.id).toBe(r.pad);
    // D5: alle ins Dock, dann alle verteilen
    ws = Pd.dockAll(ws, '', true);
    expect(Pd.dockedOn(ws, '')).toHaveLength(2);
    ws = Pd.dockAll(ws, '', false);
    expect(Pd.dockedOn(ws, '')).toEqual([]);
    ws = Pd.dockPad(ws, r.pad, true);
    // D4: Breite 260 px bis halbe Desk-Breite
    expect(Pd.clampDockW(100, 1200)).toBe(260);
    expect(Pd.clampDockW(900, 1200)).toBe(600);
    expect(Pd.clampDockW(300, 400)).toBe(200);
    ws = Pd.setDock(ws, '', { w: 420 });
    expect(Pd.dockBand(ws, '', 1200)).toBe(420);
    // D1/D8: eingeklappt 40 px, weg 0 – Pads bleiben im Dock
    ws = Pd.setDock(ws, '', { folded: true });
    expect(Pd.dockBand(ws, '', 1200)).toBe(Pd.DOCK_TAB_W);
    ws = Pd.setDockOff(ws, '', true);
    expect(Pd.dockBand(ws, '', 1200)).toBe(0);
    expect(Pd.dockOf(ws, '')).toEqual({ edge: 'right', w: 420, folded: true, off: true });
    // ins Dock schaltet ein, bleibt aber eingeklappt (V103)
    ws = Pd.dockPad(ws, 'p2', true);
    expect(Pd.dockOf(ws, '')).toEqual({ edge: 'right', w: 420, folded: true, off: false });
    expect(Pd.dockFront(ws, '')!.id).toBe('p2');
    // Speicher: Breite und Lasche überstehen das Einlesen, Unsinn fällt weg
    const back = parseWorkspace(JSON.parse(JSON.stringify(Pd.setDock(ws, '', { folded: false }))));
    expect(back?.padDesks?.['']?.dock).toEqual({ edge: 'right', at: 0, w: 420, folded: false });
    expect(Pd.dockOf(parseWorkspace(JSON.parse(JSON.stringify(ws)))!, '').folded).toBe(true);
    expect(back?.pads?.filter((p) => p.docked)).toHaveLength(2);
  });

  it('V67: Pad geschlossen – Note öffnet ihren eigenen Notizblock wieder statt eines neuen', () => {
    let ws = start();
    const r1 = Pd.openNoteInPad(ws, '', 'a', { makeId: make }) as { ws: Workspace; pad: string; sheet: string };
    ws = Pd.closePad(r1.ws, r1.pad);
    expect(Pd.padsOf(ws)).toHaveLength(0);
    expect(Pd.padShowing(ws, { note: 'a' })).toBeNull();
    const r2 = Pd.openNoteInPad(ws, '', 'a', { makeId: make }) as { result: string; ws: Workspace; sheet: string };
    expect(r2.result).toBe('opened');
    expect(r2.sheet).toBe(r1.sheet);
    expect(No.viewsOf(r2.ws).filter((v) => v.kind === 'block')).toHaveLength(1);
    expect(Pd.padShowing(r2.ws, { note: 'a' })!.sheet).toBe(r1.sheet);
    expect(Pd.padShowing(r2.ws, { view: r1.sheet })!.sheet).toBe(r1.sheet);
  });

  it('Sheet öffnen: Reiter im obersten Pad, bis 9; dann neues Pad; jedes Sheet nur an einem Ort', () => {
    let ws = start();
    ws = (Pd.openNoteInPad(ws, '', 'a', { makeId: make }) as { ws: Workspace }).ws;
    const pad = Pd.padsOf(ws)[0].id;
    const ids: string[] = [];
    for (let i = 0; i < 9; i++) {
      const v = No.createView(ws, 'todo', `T${i}`, { makeId: make });
      ws = v.ws;
      ids.push(v.id);
    }
    for (const id of ids.slice(0, 8)) ws = (Pd.openSheetInPad(ws, '', id) as { ws: Workspace }).ws;
    expect(Pd.padById(ws, pad)!.sheets).toHaveLength(9);
    const last = Pd.openSheetInPad(ws, '', ids[8], { makeId: make }) as { ws: Workspace; pad: string };
    expect(last.pad).not.toBe(pad);
    ws = last.ws;
    // „Hierher holen“: Sheet aus dem ersten Pad ins zweite
    const moved = Pd.addSheet(ws, last.pad, ids[0]);
    expect(moved.ok).toBe(true);
    ws = (moved as { ws: Workspace }).ws;
    expect(Pd.padWith(ws, ids[0])!.id).toBe(last.pad);
    expect(Pd.padById(ws, pad)!.sheets).toHaveLength(8);
  });

  it('Schließen löscht nur leere Sheets; leeres Pad verschwindet samt Platz', () => {
    let ws = start();
    ws = (Pd.openNoteInPad(ws, '', 'a', { makeId: make }) as { ws: Workspace }).ws;
    const pad = Pd.padsOf(ws)[0];
    const empty = No.createView(ws, 'todo', 'leer', { makeId: make });
    ws = (Pd.addSheet(empty.ws, pad.id, empty.id) as { ws: Workspace }).ws;
    ws = Pd.setPlace(ws, '', pad.id, { x: 0.9, y: 0, w: 0.5, h: 0.5 });
    expect(Pd.placeOf(ws, '', pad.id)).toEqual({ x: 0.5, y: 0, w: 0.5, h: 0.5 });
    ws = Pd.closePad(ws, pad.id);
    expect(Pd.padsOf(ws)).toHaveLength(0);
    expect(ws.padDesks).toBeUndefined();
    expect(No.viewById(ws, empty.id)).toBeUndefined();
    expect(No.viewById(ws, pad.sheets[0])!.ids).toEqual(['a']);
  });

  it('Lageplan: Zonen eines Slots', () => {
    const slot = { x: 0.5, y: 0, w: 0.5, h: 1 };
    expect(Pd.zonePlace(slot, 'right')).toEqual({ x: 0.75, y: 0, w: 0.25, h: 1 });
    expect(Pd.zonePlace(slot, 'bottom')).toEqual({ x: 0.5, y: 0.5, w: 0.5, h: 0.5 });
    expect(Pd.zonePlace(slot, 'full')).toEqual(slot);
  });

  it('Umstieg: Notiz- und Sheet-Tabs werden ein Pad je Portal; leeres Portal behält einen leeren Tab', () => {
    let ws = start();
    const v = No.createView(ws, 'kanban', 'Board', { makeId: make });
    ws = v.ws;
    const p = ws.panels[0];
    ws = { ...ws, panels: [{ ...p, tabs: [{ id: 't1', note: 'a' }, { id: 't2', view: v.id }, { id: 't3', note: 'b' }], activeTab: 't2' }, ...ws.panels.slice(1)] };
    const m = Pd.migrateNoteTabs(ws, { makeId: make });
    expect(m.pads).toBe(1);
    const pad = Pd.padsOf(m.ws)[0];
    expect(pad.from).toBe(p.id);
    expect(pad.sheets).toHaveLength(2);
    const block = No.viewById(m.ws, pad.sheets[0])!;
    expect(block.name).toBe(`Notizblock (${p.name})`);
    expect(block.ids).toEqual(['a', 'b']);
    expect(pad.sheets[1]).toBe(v.id);
    expect(m.ws.panels[0].tabs).toEqual([{ id: 't1' }]);
    expect(m.ws.panels[0].activeTab).toBe('t1');
    // bleibt nach Speichern erhalten
    expect(parseWorkspace(JSON.parse(JSON.stringify(m.ws)))!.pads).toEqual(m.ws.pads);
    // zweiter Lauf ändert nichts
    expect(Pd.migrateNoteTabs(m.ws).pads).toBe(0);
  });
});

describe('F-213 Entwurf bis Speichern (V68)', () => {
  const start = () => {
    let ws = W.defaultWorkspace();
    ws = No.createNote(ws, { title: 'Alt', text: 'gespeichert' }, { id: 'a' }).ws;
    return ws;
  };

  it('Entwurf ändert den gespeicherten Stand nicht; Rücknahme auf den alten Wert löscht ihn', () => {
    let ws = start();
    ws = No.setDraft(ws, 'a', { text: 'neu', important: true });
    const n = No.noteById(ws, 'a')!;
    expect(n.text).toBe('gespeichert');
    expect(No.hasDraft(n)).toBe(true);
    expect(No.shownNote(n).text).toBe('neu');
    expect(No.shownNote(n).important).toBe(true);
    ws = No.setDraft(ws, 'a', { text: 'gespeichert', important: false });
    expect(No.noteById(ws, 'a')!.draft).toBeUndefined();
  });

  it('Speichern übernimmt alles, auch Zustand mit Grund und entfernte Felder', () => {
    let ws = start();
    ws = No.updateNote(ws, 'a', { due: '2026-12-01' });
    ws = No.setDraft(ws, 'a', { text: 'fertig', state: 'waiting', waitReason: 'Rückruf', due: undefined });
    expect(No.noteById(ws, 'a')!.due).toBe('2026-12-01');
    ws = No.saveDraft(ws, 'a');
    const n = No.noteById(ws, 'a')!;
    expect(n.text).toBe('fertig');
    expect(n.state).toBe('waiting');
    expect(n.waitReason).toBe('Rückruf');
    expect(n.due).toBeUndefined();
    expect(n.draft).toBeUndefined();
  });

  it('Verwerfen: gespeicherter Stand bleibt, Rückgängig holt den Entwurf zurück', () => {
    let ws = start();
    ws = No.setDraft(ws, 'a', { text: 'weg' });
    const r = No.discardDraft(ws, 'a')!;
    expect(No.noteById(r.ws, 'a')!.draft).toBeUndefined();
    expect(No.noteById(r.ws, 'a')!.text).toBe('gespeichert');
    ws = No.undoDiscard(r.ws, r.undo);
    expect(No.shownNote(No.noteById(ws, 'a')!).text).toBe('weg');
  });

  it('Neue Note ist Entwurf: Verwerfen entfernt sie ganz, leer zählt als leerer Entwurf, Speichern macht sie gültig', () => {
    let ws = W.defaultWorkspace();
    ws = No.createNote(ws, { unsaved: true }, { id: 'n' }).ws;
    expect(No.isEmptyDraft(ws, No.noteById(ws, 'n')!)).toBe(true);
    ws = No.setDraft(ws, 'n', { text: 'Idee' });
    expect(No.isEmptyDraft(ws, No.noteById(ws, 'n')!)).toBe(false);
    // Suche findet nur Gespeichertes
    expect(No.searchNotes(ws, 'Idee')).toHaveLength(0);
    const r = No.discardDraft(ws, 'n')!;
    expect(No.noteById(r.ws, 'n')).toBeUndefined();
    expect(No.noteById(No.undoDiscard(r.ws, r.undo), 'n')).toBeDefined();
    ws = No.saveDraft(ws, 'n');
    const n = No.noteById(ws, 'n')!;
    expect(n.unsaved).toBeUndefined();
    expect(n.text).toBe('Idee');
    expect(No.searchNotes(ws, 'Idee')).toHaveLength(1);
  });

  it('Entwurf übersteht Speichern und Laden (liegt in der Library, S10)', () => {
    let ws = start();
    ws = No.createNote(ws, { unsaved: true }, { id: 'n' }).ws;
    ws = No.setDraft(ws, 'n', { text: 'vorläufig', state: 'doing', notBefore: '2026-12-02' }, { by: 'Enrico' });
    ws = No.setDraft(ws, 'a', { title: 'Neu' });
    const back = parseWorkspace(JSON.parse(JSON.stringify(ws)))!;
    const n = No.noteById(back, 'n')!;
    expect(n.unsaved).toBe(true);
    expect(n.draft!.fields.text).toBe('vorläufig');
    expect(n.draft!.fields.state).toBe('doing');
    expect(n.draft!.by).toBe('Enrico');
    expect(No.shownNote(No.noteById(back, 'a')!).title).toBe('Neu');
  });
});

// ---------------------------------------------------------------- F-215 (V69): Halbkreis am Home-Knopf
import * as FA from './footArc';
describe('F-215 Halbkreis', () => {
  it('legt sechs Plätze auf einen runden, symmetrischen Halbkreis, oben in der Mitte frei (V71)', () => {
    expect(FA.ARC_ANGLES).toHaveLength(6);
    expect(FA.ARC_ANGLES).not.toContain(90);
    expect(FA.ARC_ANGLES).not.toContain(null);
    const r = FA.ARC_RADIUS;
    expect(FA.arcPos(0)).toEqual({ x: -r, y: -FA.ARC_LIFT });
    const arc = FA.ARC_ANGLES.map((_, i) => FA.arcPos(i));
    // rund: gleich weit von der Kreismitte (ganze Pixel, höchstens 1 px Abweichung), links und rechts gespiegelt
    arc.forEach((p) => expect(Math.abs(Math.hypot(p.x, p.y + FA.ARC_LIFT) - r)).toBeLessThanOrEqual(1));
    // 0 - x statt -x: sonst wird aus 0 ein −0, und toEqual unterscheidet die beiden
    expect(arc.map((p) => p.x)).toEqual(arc.map((p) => 0 - p.x).reverse());
    // Nachbarn berühren sich nicht (Eintrag 40 px breit)
    arc.slice(1).forEach((p, i) => expect(Math.hypot(p.x - arc[i].x, p.y - arc[i].y)).toBeGreaterThan(40));
    // über der Oberkante der Fußleiste (Knopfmitte 21 px darunter, Eintrag 40 px hoch)
    FA.ARC_ANGLES.forEach((_, i) => expect(FA.arcPos(i).y + 20).toBeLessThanOrEqual(-21));
  });
  it('überspringt nicht wählbare Plätze beim Wählen und läuft im Kreis', () => {
    const items = [{ run: 1 }, {}, { run: 1 }, {}, { run: 1 }, {}];
    expect(FA.stepItem(items, 0, 1)).toBe(2);
    expect(FA.stepItem(items, 4, 1)).toBe(0);
    expect(FA.stepItem(items, 0, -1)).toBe(4);
    expect(FA.stepItem([{}, {}], 0, 1)).toBe(0);
  });
  it('fokussiert zuerst den ersten wählbaren Eintrag von links (V71)', () => {
    expect(FA.firstItem([{ run: 1 }, { run: 1 }, {}, {}, {}, {}])).toBe(0);
    expect(FA.firstItem([{}, {}, {}, { run: 1 }, {}, {}])).toBe(3);
  });
  it('wählt den Eintrag in Wischrichtung, nah am Knopf oder nach unten keinen', () => {
    expect(FA.aimItem(-70, 0)).toBe(0); // nach links
    expect(FA.aimItem(70, 0)).toBe(5); // nach rechts
    const at = (deg: number, r = 100) => [Math.cos((deg * Math.PI) / 180) * r, -Math.sin((deg * Math.PI) / 180) * r - FA.ARC_LIFT] as const;
    expect(FA.aimItem(...at(116))).toBe(2);
    expect(FA.aimItem(...at(64))).toBe(3);
    expect(FA.aimItem(0, -10)).toBe(-1); // zu nah
    expect(FA.aimItem(0, 60)).toBe(-1); // nach unten
  });
  it('vergrößert stufenlos nach Nähe, ohne Sprünge (V70)', () => {
    const at = (deg: number, r = 80) => [Math.cos((deg * Math.PI) / 180) * r, -Math.sin((deg * Math.PI) / 180) * r - FA.ARC_LIFT] as const;
    const n = FA.nearness(...at(148));
    expect(n[1]).toBe(1);
    expect(n[0]).toBeGreaterThan(0); // Nachbar wächst ein wenig mit
    expect(n[5]).toBe(0);
    // kleiner Schritt im Winkel = kleine Änderung der Größe
    const a = FA.nearness(...at(100));
    const b = FA.nearness(...at(102));
    a.forEach((v, i) => expect(Math.abs(v - b[i])).toBeLessThan(0.1));
  });
  it('wechselt an der Grenze zweier Einträge erst mit Spielraum (V70)', () => {
    // 132° liegt genau zwischen 148° und 116°; knapp darüber hinaus bleibt die bisherige Auswahl
    const at = (deg: number, r = 100) => [Math.cos((deg * Math.PI) / 180) * r, -Math.sin((deg * Math.PI) / 180) * r - FA.ARC_LIFT] as const;
    expect(FA.aimItem(...at(129), undefined, 1)).toBe(1);
    expect(FA.aimItem(...at(129))).toBe(2);
    expect(FA.aimItem(...at(120), undefined, 1)).toBe(2);
  });
  it('erkennt die Wischrichtung am Knopf: stärkere Achse gewinnt, zu kurz = keine (V71)', () => {
    expect(FA.swipeDir(10, 5)).toBeNull();
    expect(FA.swipeDir(-40, 10)).toBe('left');
    expect(FA.swipeDir(40, -20)).toBe('right');
    expect(FA.swipeDir(10, -40)).toBe('up');
    expect(FA.swipeDir(-5, FA.SWIPE_PX)).toBe('down');
  });
});

describe('V70: Schrift auf Akzentfarbe', () => {
  it('nimmt dunkle Schrift auf hellen und weiße auf dunklen Akzenten', () => {
    expect(L.inkOn('#c8c8c8')).toBe('#16181c'); // hellgrau (Enricos Akzent im Bildschirmfoto)
    expect(L.inkOn('#ffd60a')).toBe('#16181c'); // gelb
    expect(L.inkOn('#e4522c')).toBe('#ffffff'); // Orange-Rot (Standard)
    expect(L.inkOn('#0a84ff')).toBe('#ffffff'); // blau
  });
});

describe('F-215 V72: Erinnerung (Erinnern am, Ort)', () => {
  const start = () => No.createNote(W.defaultWorkspace(), { title: 'Zahnarzt' }, { id: 'r' }).ws;

  it('Erinnern am und Ort laufen über den Entwurf; gleicher Zeitpunkt zählt als unverändert', () => {
    let ws = start();
    ws = No.setDraft(ws, 'r', { remind: { at: '2026-11-25T09:00:00.000Z' }, place: 'Praxis' });
    let n = No.noteById(ws, 'r')!;
    expect(n.remind).toBeUndefined();
    expect(No.shownNote(n).remind?.at).toBe('2026-11-25T09:00:00.000Z');
    expect(No.shownNote(n).place).toBe('Praxis');
    ws = No.saveDraft(ws, 'r');
    n = No.noteById(ws, 'r')!;
    expect(n.remind?.at).toBe('2026-11-25T09:00:00.000Z');
    expect(n.place).toBe('Praxis');
    ws = No.setDraft(ws, 'r', { remind: { at: '2026-11-25T09:00:00.000Z' } });
    expect(No.noteById(ws, 'r')!.draft).toBeUndefined();
    ws = No.setDraft(ws, 'r', { remind: undefined, place: undefined });
    ws = No.saveDraft(ws, 'r');
    n = No.noteById(ws, 'r')!;
    expect(n.remind).toBeUndefined();
    expect(n.place).toBeUndefined();
  });

  it('Lesen: Ort und Erinnerung bleiben erhalten, Unsinn fällt weg', () => {
    const base = { id: 'x', title: 't', text: '', state: 'open', created: 1, changed: 1, trail: [] };
    const [a] = No.parseNotes([{ ...base, place: 'Büro', remind: { at: '2026-11-25T09:00:00.000Z' } }], new Set());
    expect(a.place).toBe('Büro');
    expect(a.remind?.at).toBe('2026-11-25T09:00:00.000Z');
    const [b] = No.parseNotes([{ ...base, place: '  ', remind: { at: 'morgen' } }], new Set());
    expect(b.place).toBeUndefined();
    expect(b.remind).toBeUndefined();
  });
});

describe('F-215 V72: Erinnerung – Schnellwahlen und Anzeige', () => {
  it('Schnellwahlen: vor 17 Uhr mit „Heute 18:00“, danach ohne; morgen 9:00', () => {
    const early = Rm.quickPicks(new Date(2026, 10, 24, 10, 7));
    expect(early.map((p) => p.id).join()).toBe('hour,evening,morning');
    expect(new Date(early[0].at).getHours()).toBe(11);
    expect(new Date(early[0].at).getMinutes()).toBe(10);
    const late = Rm.quickPicks(new Date(2026, 10, 24, 17, 30));
    expect(late.map((p) => p.id).join()).toBe('hour,morning');
    const m = new Date(late[1].at);
    expect(m.getDate()).toBe(25);
    expect(m.getHours()).toBe(9);
  });

  it('Anzeige: Heute, Morgen, sonst Wochentag mit Datum; Feld der Auswahl hin und zurück', () => {
    const now = new Date(2026, 10, 24, 10, 0);
    expect(Rm.remindLabel(new Date(2026, 10, 24, 18, 0).toISOString(), now)).toBe('Heute, 18:00');
    expect(Rm.remindLabel(new Date(2026, 10, 25, 9, 5).toISOString(), now)).toBe('Morgen, 9:05');
    expect(Rm.remindLabel(new Date(2026, 10, 27, 9, 0).toISOString(), now)).toBe('Fr 27.11., 9:00');
    const iso = new Date(2026, 10, 27, 9, 30).toISOString();
    expect(Rm.toLocalInput(iso)).toBe('2026-11-27T09:30');
    expect(Rm.fromLocalInput('2026-11-27T09:30')).toBe(iso);
    expect(Rm.fromLocalInput('')).toBeUndefined();
  });
});

describe('F-215 V73: fällige Erinnerungen', () => {
  const N = (id: string, remind?: { at: string; snooze?: string }, state = 'open') =>
    ({ id, title: id, text: '', state, created: 1, changed: 1, trail: [], ...(remind ? { remind } : {}) }) as never;
  const t = (h: number, m = 0) => new Date(2026, 10, 24, h, m).toISOString();
  const now = Date.parse(t(12));
  const since = Date.parse(t(11));

  it('meldet erreichte Zeitpunkte, älteste zuerst; vor dem Öffnen fällig = verpasst', () => {
    const d = Rm.dueReminders([N('a', { at: t(11, 30) }), N('b', { at: t(9) }), N('c', { at: t(13) }), N('d')], now, {}, since);
    expect(d.map((x) => x.id)).toEqual(['b', 'a']);
    expect(d.map((x) => x.missed)).toEqual([true, false]);
  });
  it('schon gemeldet, erledigt oder geschlummert → nicht; neuer Zeitpunkt meldet neu', () => {
    const notes = [N('a', { at: t(10) }), N('b', { at: t(10) }, 'done'), N('c', { at: t(10), snooze: t(12, 30) })];
    expect(Rm.dueReminders(notes, now, { a: t(10) }, since)).toEqual([]);
    expect(Rm.dueReminders([N('a', { at: t(11) })], now, { a: t(10) }, since).map((x) => x.id)).toEqual(['a']);
    expect(Rm.remindTime({ remind: { at: t(10), snooze: t(12, 30) } })).toBe(Date.parse(t(12, 30)));
  });
});

describe('V75 Steuerknopf über der Tastatur (F-215 A2)', () => {
  it('Deckkraft 10–100 % in 5er-Schritten, ab Werk 25 %', () => {
    expect(Dis.clampKnobOpacity(3)).toBe(10);
    expect(Dis.clampKnobOpacity(37)).toBe(35);
    expect(Dis.clampKnobOpacity(140)).toBe(100);
    expect(Dis.clampKnobOpacity(NaN)).toBe(Dis.KNOB_OP_DEFAULT);
    expect(Dis.KNOB_OP_DEFAULT).toBe(25);
  });
  it('Lage waagerecht 0–100, sonst Mitte', () => {
    expect(Dis.clampKnobX(-5)).toBe(0);
    expect(Dis.clampKnobX(120)).toBe(100);
    expect(Dis.clampKnobX(NaN)).toBe(50);
  });
});

describe('V75 Umschalter Desk | Notes', () => {
  it('Telefon startet im Note Mode, ausdrückliche Wahl gewinnt', () => {
    expect(DM.modeOf({}, 'a', false)).toBe('notes'); // erster Start ohne gemerkten Modus: Notizen (V158/V159)
    expect(DM.DESK_MODE_ORDER).toEqual(['notes', 'projects', 'desk']);
    expect(DM.modeOf({}, 'a', true)).toBe('notes');
    expect(DM.modeOf({ a: 'desk' }, 'a', true)).toBe('desk');
    expect(DM.modeOf(DM.withMode({}, 'a', 'notes'), 'a', false)).toBe('notes');
  });
  it('liest nur gültige Werte', () => {
    expect(DM.parseModes('{"a":"notes","b":"x","c":"desk"}')).toEqual({ a: 'notes', c: 'desk' });
    expect(DM.parseModes('kaputt')).toEqual({});
    expect(DM.parseModes('[1]')).toEqual({});
  });
  it('V99: Modus „Projekte“ wird gespeichert und gelesen', () => {
    expect(DM.parseModes('{"a":"projects"}')).toEqual({ a: 'projects' });
    expect(DM.modeOf(DM.withMode({}, 'a', 'projects'), 'a', true)).toBe('projects');
    // V159: Start im zuletzt gewählten Modus – ohne Speicher (Test) nichts gemerkt, also Notizen
    expect(DM.modeOf(DM.startModes(true), 'a')).toBe('notes');
  });
});

// ---------------------------------------------------------------- F-215 Schritt 3 (V76): Sprachnotiz
import * as Vo from './voice';
describe('V76 Sprachnotiz', () => {
  it('Gesten: ↑ feststellen, ← abbrechen, sonst nichts', () => {
    expect(Vo.voiceGesture(0, -Vo.VOICE_LOCK_PX)).toBe('lock');
    expect(Vo.voiceGesture(-Vo.VOICE_CANCEL_PX, 0)).toBe('cancel');
    expect(Vo.voiceGesture(-20, -20)).toBeNull();
    expect(Vo.voiceGesture(60, 0)).toBeNull();
    expect(Vo.voiceGesture(0, 60)).toBeNull();
    // schräg: die stärkere Richtung entscheidet, oben zählt bei Gleichstand
    expect(Vo.voiceGesture(-50, -50)).toBe('lock');
    expect(Vo.voiceGesture(-70, -30)).toBe('cancel');
  });
  it('Fortschritt bis zur Geste 0–1', () => {
    expect(Vo.voiceProgress(0, 0)).toEqual({ lock: 0, cancel: 0 });
    expect(Vo.voiceProgress(-Vo.VOICE_CANCEL_PX * 2, -Vo.VOICE_LOCK_PX / 2)).toEqual({ lock: 0.5, cancel: 1 });
  });
  it('setzt erkannte Teile zusammen, Satzanfang groß', () => {
    expect(Vo.joinSpeech('', ' milch  kaufen ')).toBe('Milch kaufen');
    expect(Vo.joinSpeech('Milch kaufen', 'und brot')).toBe('Milch kaufen und brot');
    expect(Vo.joinSpeech('Fertig.', 'neuer satz')).toBe('Fertig. Neuer satz');
    expect(Vo.joinSpeech('Text', '   ')).toBe('Text');
    expect(Vo.joinSpeech('', 'äpfel')).toBe('Äpfel');
  });
  it('trennt festen und vorläufigen Text', () => {
    const r = [
      { isFinal: true, 0: { transcript: 'hallo welt' } },
      { isFinal: true, 0: { transcript: 'noch was' } },
      { isFinal: false, 0: { transcript: 'und dann' } },
    ];
    expect(Vo.speechParts(r)).toEqual({ final: 'Hallo welt noch was', interim: 'Und dann' });
  });
  it('lokale Verfügbarkeit → nächster Schritt', () => {
    expect(Vo.voiceReady('available')).toBe('go');
    expect(Vo.voiceReady('downloadable')).toBe('install');
    expect(Vo.voiceReady('downloading')).toBe('wait');
    expect(Vo.voiceReady('unavailable')).toBe('fallback');
    expect(Vo.voiceReady('none')).toBe('fallback');
  });
  it('Ziel: offene Note, sonst neue Note', () => {
    expect(Vo.defaultTarget(true)).toBe('here');
    expect(Vo.defaultTarget(false)).toBe('new');
  });
});

// ---------------------------------------------------------------- F-215 V78: Pegel und Suche im Notizblock
describe('F-215 V78: Pegel des Mikrofons', () => {
  it('Stille ist leer, laut ist voll, dazwischen stufenlos; fällt gedämpft', () => {
    expect(Vo.voiceLevel(0)).toBe(0);
    expect(Vo.voiceLevel(0.5)).toBe(1);
    const mid = Vo.voiceLevel(0.01); // −40 dB
    expect(mid).toBeGreaterThan(0.3);
    expect(mid).toBeLessThan(0.5);
    expect(Vo.voiceLevel(0, 0.9)).toBeGreaterThan(0.8); // fällt nur um 0,08 je Bild
    expect(Vo.voiceLevel(0.5, 0.2)).toBe(1); // steigt sofort
    expect(Vo.rmsOf([1, -1, 1, -1])).toBe(1);
    expect(Vo.rmsOf([])).toBe(0);
  });
});
describe('F-215 V78: Suche im Notizblock', () => {
  const n = { title: '', text: '# Einkauf\n- [ ] Milch und Brot', tags: ['Haushalt'] };
  it('findet über Titel, Text und Tags, alle Wörter, Groß/klein egal', () => {
    expect(No.noteMatches(n, '')).toBe(true);
    expect(No.noteMatches(n, 'einkauf')).toBe(true);
    expect(No.noteMatches(n, 'brot milch')).toBe(true);
    expect(No.noteMatches(n, '#haushalt')).toBe(true);
    expect(No.noteMatches(n, 'milch käse')).toBe(false);
  });
});
import * as AS from './audioStore';
describe('F-215 V79: Tonaufnahme an der Notiz', () => {
  const clip = (ref: string) => ({ kind: 'audio' as const, ref, dur: 42, at: '2026-11-24T18:50:00.000Z', dev: 'Mac', mime: 'audio/webm' });
  it('hängt Töne in der Reihenfolge der Aufnahme an und entfernt sie (T4, T5)', () => {
    const n = { attach: [{ kind: 'note' as const, ref: 'x' }] };
    const one = No.addAudio(n, clip('a1'));
    const two = No.addAudio({ attach: one }, clip('a2'));
    expect(No.audioOf({ attach: two }).map((a) => a.ref)).toEqual(['a1', 'a2']);
    expect(No.hasAudio({ attach: two })).toBe(true);
    expect(No.dropAudio({ attach: two }, 'a1')!.map((a) => a.ref)).toEqual(['x', 'a2']);
    expect(No.dropAudio({ attach: [clip('a1')] }, 'a1')).toBeUndefined();
    expect(No.hasAudio({})).toBe(false);
  });
  it('Verweise bleiben beim Speichern erhalten, Herkunft „Sprachnotiz“ (T10)', () => {
    let ws = No.createNote(W.defaultWorkspace(), { text: 'Gesprochen' }, { id: 'n1', now: 1 }).ws;
    ws = No.updateNote(ws, 'n1', { attach: [clip('a1')], origin: { via: 'voice', at: '2026-11-24T18:50:00.000Z' } });
    const back = No.parseNotes(JSON.parse(JSON.stringify(ws.notes)), new Set());
    expect(back[0].attach).toEqual([clip('a1')]);
    expect(No.isVoiceNote(back[0])).toBe(true);
    expect([...No.audioRefs({ ...ws, notes: back })]).toEqual(['a1']);
  });
  it('Gerätespeicher: nur Töne ohne Notiz und älter als ein Tag fallen weg (T8)', () => {
    const now = 10 * AS.SWEEP_AGE_MS;
    const clips = [
      { id: 'alt-mit', at: 0 },
      { id: 'alt-ohne', at: 0 },
      { id: 'neu-ohne', at: now - 1000 },
    ];
    expect(AS.sweepable(clips, new Set(['alt-mit']), now)).toEqual(['alt-ohne']);
  });
  it('Länge, Dateiname und Format', () => {
    expect(Vo.fmtDur(0)).toBe('0:00');
    expect(Vo.fmtDur(42.4)).toBe('0:42');
    expect(Vo.fmtDur(15 * 60)).toBe('15:00');
    expect(Vo.fmtDur(3725)).toBe('1:02:05');
    expect(Vo.audioFileName('2026-11-24T18:50:00', 'audio/webm;codecs=opus')).toBe('Sprachnotiz 2026-11-24 18-50.webm');
    expect(Vo.audioFileName('2026-11-24T18:50:00', 'audio/mp4')).toMatch(/\.m4a$/);
    expect(Vo.audioMime((t) => t === 'audio/mp4')).toBe('audio/mp4');
    expect(Vo.audioMime(() => false)).toBe('');
    expect(Vo.AUDIO_MAX_MS).toBe(15 * 60 * 1000);
  });
});
import * as IS from './imageStore';
describe('F-215 V79: Bild im Text (B1–B3)', () => {
  it('Bild-Zeile wird Block und zurück, Beschreibung geschützt', () => {
    const md = '# Ausflug\n![Strand am Abend](es-img:p1)\nSchön war es';
    const bs = ND.parseDoc(md);
    expect(bs[1]).toEqual({ k: 'img', text: 'Strand am Abend', ref: 'p1' });
    expect(ND.serializeDoc(bs)).toBe(md);
    expect(ND.imgLine('p2', 'a]b')).toBe('![a\\]b](es-img:p2)');
    expect(ND.parseLine(ND.imgLine('p2', 'a]b'))).toEqual({ k: 'img', text: 'a]b', ref: 'p2' });
    expect(ND.imgRefs(md)).toEqual(['p1']);
  });
  it('getippter Text, der wie ein Bild aussieht, bleibt Text', () => {
    const t = '![x](es-img:abc)';
    const md = ND.serializeDoc([{ k: 'p', text: t }]);
    expect(md).toBe('\\' + t);
    expect(ND.parseDoc(md)[0]).toEqual({ k: 'p', text: t });
    expect(ND.imgRefs(md)).toEqual([]);
  });
  it('Titel und Suche übergehen Bild-Zeilen; Verweise auch aus Entwürfen', () => {
    expect(No.titleOf({ title: '', text: '![](es-img:p1)\nUrlaub' })).toBe('Urlaub');
    expect(No.noteMatches({ title: '', text: '![](es-img:p1)', tags: [] }, 'es-img')).toBe(false);
    let ws = No.createNote(W.defaultWorkspace(), { text: '![](es-img:p1)' }, { id: 'n1', now: 1 }).ws;
    ws = No.setDraft(ws, 'n1', { text: '![](es-img:p1)\n![](es-img:p2)' });
    expect([...No.imageRefs(ws)].sort()).toEqual(['p1', 'p2']);
    expect(No.hasImage({ text: '![](es-img:p1)' })).toBe(true);
  });
  it('verkleinert auf 1600 px lange Kante, nie größer', () => {
    expect(IS.fitSize(4032, 3024)).toEqual({ w: 1600, h: 1200 });
    expect(IS.fitSize(1000, 3000)).toEqual({ w: 533, h: 1600 });
    expect(IS.fitSize(800, 600)).toEqual({ w: 800, h: 600 });
    expect(IS.fitSize(0, 10)).toEqual({ w: 0, h: 0 });
  });
  it('V80: Text zum Teilen ohne Bild-Zeilen, Titel für die Zwischenablage (S1/S2)', () => {
    const a = No.shareText({ title: '', text: '# Einkauf\n![](es-img:p1)\n\n\n\n- Milch' });
    expect(a.title).toBe('Einkauf');
    expect(a.text).toBe('# Einkauf\n\n- Milch');
    expect(a.clip).toBe(a.text);
    const b = No.shareText({ title: 'Urlaub', text: 'Koffer packen' });
    expect(b.clip).toBe('Urlaub\n\nKoffer packen');
  });
  it('V80: Dateiname zum Sichern eines Bildes (B4)', () => {
    const at = new Date(2026, 10, 24, 21, 4).getTime();
    expect(IS.picFileName(at, 'image/jpeg')).toBe('Bild-2026-11-24-2104.jpg');
    expect(IS.picFileName(at, 'image/png')).toBe('Bild-2026-11-24-2104.png');
  });
  it('V80: Bild zwischen Absätzen bleibt beim Speichern und Lesen ein Bild', () => {
    const md = ND.serializeDoc([{ k: 'p', text: 'Vorher' }, { k: 'img', text: 'Hund', ref: 'p-1' }, { k: 'p', text: 'Nachher' }]);
    const back = ND.parseDoc(md);
    expect(back.map((b) => b.k)).toEqual(['p', 'img', 'p']);
    expect(back[1]).toMatchObject({ ref: 'p-1', text: 'Hund' });
  });
});

// ---------------------------------------------------------------- V83 (F-216): Umschalt-Rad
import * as MW from './modeWheel';
import * as SR from './searchRank';
describe('Umschalt-Rad (F-216)', () => {
  it('sammelt Scroll-Weg zu Rasten, Rest bleibt, Umkehr verwirft den Rest', () => {
    let r = MW.addTravel(0, 15, 40);
    expect(r).toEqual({ steps: 0, acc: 15 });
    r = MW.addTravel(r.acc, 30, 40);
    expect(r).toEqual({ steps: 1, acc: 5 });
    r = MW.addTravel(r.acc, -10, 40);
    expect(r).toEqual({ steps: 0, acc: -10 });
    expect(MW.addTravel(0, 100, 40).steps).toBe(2);
    expect(MW.addTravel(0, 1000, 40).steps).toBe(3); // großer Ruck: höchstens 3
    expect(MW.addTravel(0, -45, 40).steps).toBe(-1);
  });
  it('rechnet Zeilen und Seiten in Pixel um', () => {
    expect(MW.deltaPx(3, 1)).toBe(48);
    expect(MW.deltaPx(1, 2, 500)).toBe(500);
    expect(MW.deltaPx(7)).toBe(7);
  });
  it('Anschlag bei 2–5 Modi, ringsum bei vielen', () => {
    expect(MW.turn(1, 1, 2, false)).toBe(1);
    expect(MW.turn(0, -1, 2, false)).toBe(0);
    expect(MW.turn(15, 1, 16, true)).toBe(0);
    expect(MW.turn(0, -2, 16, true)).toBe(14);
    expect(MW.wrapsFor(2)).toBe(false);
    expect(MW.wrapsFor(5)).toBe(false);
    expect(MW.wrapsFor(16)).toBe(false); // V111: immer Anschlag
    expect(MW.wrapsFor(2, true)).toBe(true);
  });
  it('Klick = nächster, Umschalt+Klick = voriger, am Ende wieder vorn', () => {
    expect(MW.clickTurn(0, 2, false)).toBe(1);
    expect(MW.clickTurn(1, 2, false)).toBe(0); // V111: Pendel statt Sprung
    expect(MW.clickTurn(0, 4, true)).toBe(1);
    expect(MW.clickTurn(3, 4, false)).toBe(2);
    expect(MW.clickTurn(0, 1, false)).toBe(0);
  });
  it('Tasten: Pfeile, Pos1/Ende, Enter/Leertaste, sonst null', () => {
    expect(MW.keyTurn('ArrowDown', 0, 4, false)).toBe(1);
    expect(MW.keyTurn('ArrowRight', 3, 4, false)).toBe(3);
    expect(MW.keyTurn('ArrowUp', 0, 4, true)).toBe(3);
    expect(MW.keyTurn('End', 0, 4, false)).toBe(3);
    expect(MW.keyTurn('Home', 2, 4, false)).toBe(0);
    expect(MW.keyTurn('Enter', 1, 2, false)).toBe(0);
    expect(MW.keyTurn('a', 1, 2, false)).toBeNull();
  });
  it('Ansage und Nachbarn', () => {
    expect(MW.valueText('Notizen', 1, 2)).toBe('Notizen, 2 von 2');
    expect(MW.neighbours(0, 2, false)).toEqual({ prev: null, next: 1 });
    expect(MW.neighbours(0, 3, true)).toEqual({ prev: 2, next: 1 });
    expect(MW.neighbours(0, 1, true)).toEqual({ prev: null, next: null });
    expect(MW.COMMIT_MS).toBe(300);
  });
});
describe('F6 reihum (F-206 N13, V85)', () => {
  it('ordnet Kopfleiste → Slots → Dock → Pads und läuft ringsum', () => {
    const list = FR.ringSort([{ kind: 'pad' as const, n: 1 }, { kind: 'slot' as const, n: 2 }, { kind: 'bar' as const, n: 3 }, { kind: 'slot' as const, n: 4 }, { kind: 'dock' as const, n: 5 }]);
    expect(list.map((a) => a.n)).toEqual([3, 2, 4, 5, 1]);
    expect(FR.ringStep(5, 0, false)).toBe(1);
    expect(FR.ringStep(5, 4, false)).toBe(0);
    expect(FR.ringStep(5, 0, true)).toBe(4);
    expect(FR.ringStep(5, -1, false)).toBe(0);
    expect(FR.ringStep(5, -1, true)).toBe(4);
    expect(FR.ringStep(0, -1, false)).toBe(-1);
  });
});
describe('Rad „Pads“ und Zwischenlage (F-206 Schritt 5, N4)', () => {
  it('erkennt Verteilt, Im Dock, Ausgeblendet und Gemischt', () => {
    expect(Pd.padsShow(0, 0, false, false)).toBe('none');
    expect(Pd.padsShow(2, 0, false, false)).toBe('spread');
    expect(Pd.padsShow(0, 2, false, false)).toBe('dock');
    expect(Pd.padsShow(2, 0, true, false)).toBe('hidden');
    expect(Pd.padsShow(0, 2, false, true)).toBe('hidden');
    expect(Pd.padsShow(1, 1, true, true)).toBe('hidden');
    expect(Pd.padsShow(1, 1, false, false)).toBe('mixed');
    expect(Pd.padsShow(1, 1, true, false)).toBe('mixed');
  });
  it('dreht aus der Zwischenlage auf die Nachbar-Rasten', () => {
    expect(MW.turnFrom(-1, 1, 3, false, 0)).toBe(1);
    expect(MW.turnFrom(-1, -1, 3, false, 0)).toBe(0);
    expect(MW.turnFrom(-1, 3, 3, false, 0)).toBe(2);
    expect(MW.turnFrom(-1, 0, 3, false, 0)).toBe(-1);
    expect(MW.turnFrom(1, 1, 3, false, 0)).toBe(2);
  });
});

describe('V84 Suche: Passung über alle Arten (F-206 N6)', () => {
  it('bewertet Titel vor Beiwerk', () => {
    expect(SR.fitOf('hamburg', 'Hamburg')).toBe(100);
    expect(SR.fitOf('ham', 'Hamburg Hafen')).toBe(85);
    expect(SR.fitOf('haf', 'Hamburg Hafen')).toBe(70);
    expect(SR.fitOf('burg', 'Hamburg')).toBe(55);
    expect(SR.fitOf('hafen hamburg', 'Hamburg Hafen')).toBe(45);
    expect(SR.fitOf('wiki', 'Elbphilharmonie', ['de.wikipedia.org'])).toBe(20);
    expect(SR.fitOf('de.wiki', 'Elbphilharmonie', ['de.wikipedia.org'])).toBe(30);
    expect(SR.fitOf('xyz', 'Elbphilharmonie')).toBe(5);
    expect(SR.fitOf('cafe', 'Café Paris')).toBe(85);
    expect(SR.fitOf('  ', 'x')).toBe(0);
  });
  it('sortiert beste Treffer nach oben, egal welcher Art; gleiche Passung behält die Reihenfolge', () => {
    const items: SR.Rankable[] = [
      { kind: 'portal', title: 'Mail' },
      { kind: 'source', title: 'Notizblock online', extra: ['notes.example.com'] },
      { kind: 'note', title: 'Notiz' },
      { kind: 'function', title: 'Neue Notiz' },
    ];
    expect(SR.rankHits(items, 'notiz').map((x) => x.title)).toEqual(['Notiz', 'Notizblock online', 'Neue Notiz', 'Mail']);
    const q: SR.Rankable[] = [
      { kind: 'function', title: 'Wie' },
      { kind: 'question', title: 'Wie lege ich einen Slot an?' },
    ];
    expect(SR.rankHits(q, 'wie', true)[0].kind).toBe('question');
    expect(SR.rankHits(q, 'wie', false)[0].kind).toBe('function');
  });
  it('zählt je Chip und filtert', () => {
    const items = [{ kind: 'case' as const }, { kind: 'portal' as const }, { kind: 'source' as const }, { kind: 'view' as const }, { kind: 'question' as const }, { kind: 'term' as const }];
    expect(SR.chipCounts(items)).toEqual({ all: 6, portals: 2, library: 1, notes: 1, functions: 2 });
    expect(SR.byChip(items, 'notes')).toHaveLength(1);
    expect(SR.byChip(items, 'all')).toHaveLength(6);
  });
  it('Strg/⌃+Pfeil springt ringsum zum nächsten Chip mit Treffern', () => {
    const c = { all: 3, portals: 0, library: 2, notes: 0, functions: 1 };
    expect(SR.chipStep('all', 1, c)).toBe('library');
    expect(SR.chipStep('library', 1, c)).toBe('functions');
    expect(SR.chipStep('functions', 1, c)).toBe('all');
    expect(SR.chipStep('all', -1, c)).toBe('functions');
    expect(SR.chipStep('all', 1, { all: 0, portals: 0, library: 0, notes: 0, functions: 0 })).toBe('all');
  });
});

describe('F-206 Schritt 7: To-do, Kanban, Eisenhower (V86)', () => {
  const act = { now: Date.UTC(2026, 10, 25, 10), by: 'Enrico' };
  const seq = () => {
    let i = 0;
    return () => `c${++i}`;
  };
  const setup = () => {
    let ws = W.defaultWorkspace();
    ws = { ...ws };
    let a: string, b: string, kb: string, todo: string;
    ({ ws, id: a } = No.createNote(ws, { title: 'A' }, act));
    ({ ws, id: b } = No.createNote(ws, { title: 'B' }, act));
    ({ ws, id: kb } = No.createView(ws, 'kanban', 'Board', { makeId: seq() }));
    ({ ws, id: todo } = No.createView(ws, 'todo', ''));
    return { ws, a, b, kb, todo };
  };

  it('K2: Spalten haben eine Bedeutung – neu gesetzt, alt aus dem Namen geraten', () => {
    const { ws, kb } = setup();
    expect(No.viewById(ws, kb)!.cols!.map((c) => c.state)).toEqual(['open', 'doing', 'done']);
    expect(Sh.colStateOf({ name: 'Fertig' })).toBe('done');
    expect(Sh.colStateOf({ name: 'In Prüfung' })).toBe('review');
    expect(Sh.colStateOf({ name: 'Backlog' })).toBe('open');
    expect(Sh.colStateOf({ name: 'Erledigt', state: 'doing' })).toBe('doing');
    const parsed = No.parseNoteViews([{ id: 'k', kind: 'kanban', name: 'K', cols: [{ id: 'x', name: 'X', ids: [], state: 'review' }, { id: 'y', name: 'Y', ids: [], state: 'quatsch' }] }], new Set(), new Set());
    expect(parsed[0].cols!.map((c) => c.state)).toEqual(['review', undefined]);
  });

  it('K2: Karte in Spalte setzt den Zustand; mit Abnahme wird erledigt „in Prüfung“', () => {
    let { ws, a, kb } = setup();
    const cols = No.viewById(ws, kb)!.cols!;
    let r = Sh.moveCard(ws, kb, a, cols[1].id, undefined, act);
    ws = (r as { ws: Workspace }).ws;
    expect(No.noteById(ws, a)!.state).toBe('doing');
    ws = (Sh.moveCard(ws, kb, a, cols[2].id, undefined, act) as { ws: Workspace }).ws;
    expect(No.noteById(ws, a)!.state).toBe('done');
    ws = (Sh.moveCard(ws, kb, a, cols[0].id, undefined, act) as { ws: Workspace }).ws;
    expect(No.noteById(ws, a)!.state).toBe('open');
    ws = No.updateView(ws, kb, { review: true });
    ws = (Sh.moveCard(ws, kb, a, cols[2].id, undefined, act) as { ws: Workspace }).ws;
    expect(No.noteById(ws, a)!.state).toBe('review');
    r = Sh.moveCard(ws, kb, a, 'fehlt');
    expect(r.ok).toBe(false);
  });

  it('K2/L1: anderswo erledigt wandert die Karte; auf dem Kanban ist der Haken anderswo gesperrt', () => {
    let { ws, a, b, kb, todo } = setup();
    const cols = No.viewById(ws, kb)!.cols!;
    ws = (Sh.moveCard(ws, kb, a, cols[0].id, undefined, act) as { ws: Workspace }).ws;
    ws = (No.placeNote(ws, a, { view: todo }) as { ws: Workspace }).ws;
    ws = (No.placeNote(ws, b, { view: todo }) as { ws: Workspace }).ws;
    expect(Sh.lockOf(ws, a, todo).map((v) => v.id)).toEqual([kb]);
    expect(Sh.lockOf(ws, a, kb)).toEqual([]);
    expect(Sh.lockOf(ws, b, todo)).toEqual([]);
    expect(Sh.toggleDone(ws, a, todo, act)).toBe(ws);
    ws = Sh.toggleDone(ws, b, todo, act);
    expect(No.noteById(ws, b)!.state).toBe('done');
    ws = No.setState(ws, a, 'done', act);
    ws = Sh.syncBoards(ws, a);
    expect(Sh.colOf(No.viewById(ws, kb)!, a)!.id).toBe(cols[2].id);
    ws = No.setState(ws, a, 'open', act);
    ws = Sh.syncBoards(ws, a);
    expect(Sh.colOf(No.viewById(ws, kb)!, a)!.id).toBe(cols[0].id);
  });

  it('K3: WIP-Limit fragt erst beim Überschreiten', () => {
    let { ws, a, b, kb } = setup();
    const col = No.viewById(ws, kb)!.cols![1];
    ws = Sh.setWip(ws, kb, col.id, 1);
    expect(Sh.overWip(No.viewById(ws, kb)!.cols![1])).toBe(false);
    ws = (Sh.moveCard(ws, kb, a, col.id) as { ws: Workspace }).ws;
    expect(Sh.overWip(No.viewById(ws, kb)!.cols![1])).toBe(true);
    ws = Sh.setWip(ws, kb, col.id, 0);
    expect(No.viewById(ws, kb)!.cols![1].wip).toBeUndefined();
    expect(b).toBeDefined();
  });

  it('T2/T3: To-do-Zeilen mit Unter-Notizen, Erledigte unten, Ordnung nach Fällig/Wichtig', () => {
    let { ws, a, b, todo } = setup();
    let c: string;
    ({ ws, id: c } = No.createNote(ws, { title: 'C', parent: a, due: '2026-11-30' }, act));
    ws = No.updateNote(ws, b, { due: '2026-11-27', important: true }, act);
    ws = (No.placeNote(ws, a, { view: todo }) as { ws: Workspace }).ws;
    ws = (No.placeNote(ws, b, { view: todo }) as { ws: Workspace }).ws;
    const v = () => No.viewById(ws, todo)!;
    expect(Sh.todoRows(ws, v()).rows.map((r) => [r.note.title, r.depth])).toEqual([['A', 0], ['C', 1], ['B', 0]]);
    expect(Sh.todoRows(ws, v(), 'due').rows.map((r) => r.note.title)).toEqual(['B', 'A', 'C']);
    expect(Sh.todoRows(ws, v(), 'important').rows[0].note.title).toBe('B');
    ws = Sh.toggleDone(ws, b, todo, act);
    const t = Sh.todoRows(ws, v());
    expect(t.done.map((n) => n.title)).toEqual(['B']);
    expect(Sh.todoRows(ws, v(), 'own', 'all').rows).toHaveLength(3);
    ws = Sh.shiftIn(ws, todo, b, -1);
    expect(v().ids).toEqual([b, a]);
    expect(c).toBeDefined();
  });

  it('addTask legt im Sheet an (Kanban: erste Spalte, Zustand offen)', () => {
    let { ws, kb, todo } = setup();
    const r1 = Sh.addTask(ws, todo, '  Anrufen ', act)!;
    ws = r1.ws;
    expect(No.viewById(ws, todo)!.ids).toEqual([r1.id]);
    const r2 = Sh.addTask(ws, kb, 'Karte', act)!;
    ws = r2.ws;
    expect(No.viewById(ws, kb)!.cols![0].ids).toEqual([r2.id]);
    expect(Sh.addTask(ws, kb, '   ', act)).toBeNull();
  });

  it('T1: Checkliste mit Fortschritt; Punkt in Aufgabe umwandeln (wie Trello)', () => {
    let { ws, a, kb } = setup();
    ws = No.updateNote(ws, a, { text: '# A\n- [ ] Milch\n- [x] Brot\nText' }, act);
    expect(Sh.checklistOf(No.noteById(ws, a)!)).toEqual({ done: 1, all: 2 });
    expect(Sh.checklistItems(No.noteById(ws, a)!)).toEqual([{ text: 'Milch', done: false }, { text: 'Brot', done: true }]);
    ws = (Sh.moveCard(ws, kb, a, No.viewById(ws, kb)!.cols![1].id, undefined, act) as { ws: Workspace }).ws;
    const r = Sh.checklistToTask(ws, a, 0, kb, act)!;
    ws = r.ws;
    expect(No.noteById(ws, a)!.text).toBe('# A\n- [x] Brot\nText');
    const t = No.noteById(ws, r.id)!;
    expect(No.titleOf(t)).toBe('Milch');
    expect(t.text).toBe('# Milch');
    ws = Sh.renameTask(ws, r.id, 'Hafermilch', act);
    expect(No.noteById(ws, r.id)!.text).toBe('# Hafermilch');
    expect(t.trail[0].detail).toBe('A (Checkliste)');
    expect(No.viewById(ws, kb)!.cols![1].ids).toEqual([a, r.id]);
    expect(Sh.checklistToTask(ws, a, 5, kb)).toBeNull();
    expect(Sh.checklistOf({ text: 'ohne' })).toBeNull();
  });

  it('E1–E4: Matrix nach Report (oben wichtig, rechts dringend), Ungeordnetes, offene aus allen Sheets', () => {
    let { ws, a, b } = setup();
    let m: string, c: string;
    ({ ws, id: m } = No.createView(ws, 'eisenhower', ''));
    ({ ws, id: c } = No.createNote(ws, { title: 'C', urgent: true }, act));
    ws = (No.placeNote(ws, a, { view: m }) as { ws: Workspace }).ws;
    let mx = Sh.matrixOf(ws, No.viewById(ws, m)!);
    expect(mx.unsorted.map((n) => n.title)).toEqual(['A']);
    expect(mx.quads[3].map((n) => n.title)).toEqual(['C']);
    ws = Sh.setQuad(ws, m, a, 2, act);
    ws = Sh.setQuad(ws, m, b, 4, act);
    mx = Sh.matrixOf(ws, No.viewById(ws, m)!);
    expect(mx.unsorted).toHaveLength(0);
    expect(mx.quads[2].map((n) => n.title)).toEqual(['A']);
    expect(mx.quads[4].map((n) => n.title)).toEqual(['B']);
    expect(No.noteById(ws, b)).toMatchObject({ important: false, urgent: false });
    // V87: Lage wie im Original – oben links erledigen, unten rechts ablegen
    expect(Sh.quadAt(0, 0)).toBe(1);
    expect(Sh.quadAt(0, 1)).toBe(2);
    expect(Sh.quadAt(1, 0)).toBe(3);
    expect(Sh.QUAD_CELL[4]).toEqual([1, 1]);
    expect(Sh.theMatrix(ws)!.id).toBe(m);
    ws = No.setState(ws, c, 'done', act);
    expect(Sh.matrixOf(ws, No.viewById(ws, m)!).quads[3]).toHaveLength(0);
  });
});

describe('F-206 Schritt 7: Kanban-Oberfläche (V87)', () => {
  const act = { now: Date.UTC(2026, 10, 25, 11), by: 'Enrico' };
  const seq = () => {
    let i = 0;
    return () => `k${++i}`;
  };
  const setup = () => {
    let ws = W.defaultWorkspace();
    let a: string, b: string, c: string, kb: string;
    ({ ws, id: a } = No.createNote(ws, { title: 'Zebra', due: '2026-12-03' }, act));
    ({ ws, id: b } = No.createNote(ws, { title: 'Apfel', important: true }, act));
    ({ ws, id: c } = No.createNote(ws, { title: 'Mond', due: '2026-12-01' }, act));
    ({ ws, id: kb } = No.createView(ws, 'kanban', 'Board', { makeId: seq() }));
    const cols = No.viewById(ws, kb)!.cols!;
    for (const id of [a, b, c]) ws = (Sh.moveCard(ws, kb, id, cols[0].id, undefined, act) as { ws: Workspace }).ws;
    return { ws, a, b, c, kb, cols };
  };

  it('K1: Spalte sortieren nach Fälligkeit, Wichtigkeit, Titel', () => {
    const { ws, a, b, c, kb, cols } = setup();
    const ids = (w: Workspace) => No.viewById(w, kb)!.cols![0].ids;
    expect(ids(Sh.sortCol(ws, kb, cols[0].id, 'due'))).toEqual([c, a, b]);
    expect(ids(Sh.sortCol(ws, kb, cols[0].id, 'important'))[0]).toBe(b);
    expect(ids(Sh.sortCol(ws, kb, cols[0].id, 'title'))).toEqual([b, c, a]);
    expect(Sh.sortCol(ws, kb, 'fehlt', 'title')).toBe(ws);
  });

  it('K1: alle Karten verschieben setzt den Zustand nach der Ziel-Spalte', () => {
    let { ws, a, b, c, kb, cols } = setup();
    ws = Sh.moveAllCards(ws, kb, cols[0].id, cols[2].id, act);
    const v = No.viewById(ws, kb)!;
    expect(v.cols![0].ids).toEqual([]);
    expect(v.cols![2].ids).toEqual([a, b, c]);
    expect([a, b, c].map((id) => No.noteById(ws, id)!.state)).toEqual(['done', 'done', 'done']);
    expect(Sh.moveAllCards(ws, kb, cols[2].id, cols[2].id, act)).toBe(ws);
  });

  it('K4: Platz einer Karte für die Ansage', () => {
    const { ws, b, kb, cols } = setup();
    const p = Sh.cardPlace(No.viewById(ws, kb)!, b)!;
    expect([p.col.id, p.pos, p.of]).toEqual([cols[0].id, 2, 3]);
    expect(Sh.cardPlace(No.viewById(ws, kb)!, 'fehlt')).toBeNull();
  });
});

describe('F-206 Schritt 7: Menü G und genau eine Matrix (V87)', () => {
  it('E3 aufgehoben (V140, F-237): eine zweite Matrix entsteht, die erste bleibt die persönliche', () => {
    let ws = W.defaultWorkspace();
    ws = reducer(ws, { type: 'padCreate', desk: '', kind: 'eisenhower', ids: ['m1', 'p1', 's1'] });
    expect(Sh.theMatrix(ws)?.id).toBe('m1');
    ws = reducer(ws, { type: 'padCreate', desk: '', kind: 'eisenhower', ids: ['m2', 'p2', 's2'] });
    expect(No.viewsOf(ws).filter((v) => v.kind === 'eisenhower').map((v) => v.id)).toEqual(['m1', 'm2']);
    expect(Sh.theMatrix(ws)?.id).toBe('m1');
    ws = reducer(ws, { type: 'padCreate', desk: '', kind: 'kanban', ids: ['k1', 'p3', 's3'] });
    expect(No.viewsOf(ws).filter((v) => v.kind === 'kanban').length).toBe(1);
  });

  it('L2: Board-Regel „Abnahme nötig“ schalten', () => {
    let ws = W.defaultWorkspace();
    ws = reducer(ws, { type: 'padCreate', desk: '', kind: 'kanban', ids: ['k1', 'p1', 's1'] });
    ws = reducer(ws, { type: 'sheetReview', view: 'k1', on: true });
    expect(No.viewById(ws, 'k1')!.review).toBe(true);
  });
});

describe('V87: Pads im Notizen-Modus verteilt', () => {
  it('Raster aus √n Spalten, letzte Reihe breiter', () => {
    expect(Pd.noteTiles(0)).toEqual([]);
    expect(Pd.noteTiles(1)).toEqual([{ x: 0, y: 0, w: 1, h: 1 }]);
    expect(Pd.noteTiles(2).map((t) => [t.x, t.w])).toEqual([[0, 0.5], [0.5, 0.5]]);
    const three = Pd.noteTiles(3);
    expect(three.map((t) => [t.x, t.y, t.w, t.h])).toEqual([[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 1, 0.5]]);
    expect(Pd.noteTiles(9).length).toBe(9);
  });
});

describe('V87: Abbild im Cockpit (BC1–BC3)', () => {
  const act = { now: Date.UTC(2026, 10, 25, 12), by: 'Enrico' };
  it('Mini-Board, To-do-Fortschritt und Matrix-Zahlen', () => {
    let ws = W.defaultWorkspace();
    ws = reducer(ws, { type: 'padCreate', desk: '', kind: 'kanban', ids: ['k', 'p1', 's1'] });
    const cols = No.viewById(ws, 'k')!.cols!;
    ws = reducer(ws, { type: 'colWip', view: 'k', col: cols[1].id, wip: 1 });
    for (const [id, c] of [['a', 1], ['b', 1], ['c', 0]] as const) ws = reducer(ws, { type: 'sheetAdd', view: 'k', title: id, note: id, col: cols[c].id });
    const sum = Sh.boardSummary(ws, No.viewById(ws, 'k')!);
    expect(sum.map((c) => [c.state, c.count, c.over])).toEqual([['open', 1, false], ['doing', 2, true], ['done', 0, false]]);
    ws = reducer(ws, { type: 'padCreate', desk: '', kind: 'todo', ids: ['t', 'p2', 's2'] });
    ws = reducer(ws, { type: 'sheetAdd', view: 't', title: 'x', note: 'x' });
    ws = reducer(ws, { type: 'sheetAdd', view: 't', title: 'y', note: 'y' });
    ws = reducer(ws, { type: 'sheetDone', note: 'x', here: 't' });
    expect(Sh.todoSummary(ws, No.viewById(ws, 't')!)).toEqual({ done: 1, all: 2 });
    ws = reducer(ws, { type: 'padCreate', desk: '', kind: 'eisenhower', ids: ['m', 'p3', 's3'] });
    ws = reducer(ws, { type: 'sheetAdd', view: 'm', title: 'u', note: 'u' });
    ws = reducer(ws, { type: 'quadSet', view: 'm', note: 'y', q: 1 });
    const ms = Sh.matrixSummary(ws, Sh.matricesOf(ws)[0]);
    expect([ms.quads[1], ms.unsorted, ms.open]).toEqual([1, 1, 2]);
    void act;
  });
});

describe('V88: Board-Vorlagen (BL1–BL3)', () => {
  it('mitgeliefert: Einfach, Mit Prüfung, Vertrieb, Bewerbungen – nicht umbenennbar, nicht löschbar', () => {
    const ws = W.defaultWorkspace();
    expect(BT.templatesOf(ws).map((t) => t.name)).toEqual(['Einfach', 'Mit Prüfung', 'Vertrieb', 'Bewerbungen']);
    expect(BT.templateById(ws, 'tpl-sales')!.cols.map((c) => c.name)).toEqual(['Lead', 'Kontakt', 'Angebot', 'Abschluss']);
    expect(BT.renameTemplate(ws, 'tpl-sales', 'X')).toBe(ws);
    expect(BT.deleteTemplate(ws, 'tpl-sales')).toBeNull();
  });
  it('neues Board aus Vorlage: Spalten, Bedeutung, WIP, Abnahme; Name frei', () => {
    let ws = W.defaultWorkspace();
    ws = reducer(ws, { type: 'padCreate', desk: '', kind: 'kanban', ids: ['k', 'p1', 's1'], tpl: 'tpl-sales' });
    const v = No.viewById(ws, 'k')!;
    expect(v.name).toBe('Vertrieb');
    expect(v.cols!.map((c) => [c.name, c.state])).toEqual([['Lead', 'open'], ['Kontakt', 'doing'], ['Angebot', 'doing'], ['Abschluss', 'done']]);
    expect(new Set(v.cols!.map((c) => c.id)).size).toBe(4);
    ws = reducer(ws, { type: 'padCreate', desk: '', kind: 'kanban', ids: ['k2', 'p2', 's2'], tpl: 'tpl-sales' });
    expect(No.viewById(ws, 'k2')!.name).toBe('Vertrieb 2');
    // Einfach = Standardname; ohne Vorlage = Start-Spalten
    ws = reducer(ws, { type: 'padCreate', desk: '', kind: 'kanban', ids: ['k3', 'p3', 's3'], tpl: 'tpl-simple' });
    expect(No.viewById(ws, 'k3')!.name).toBe('Kanban-Board');
    ws = reducer(ws, { type: 'padAddSheet', id: ws.pads![0].id, kind: 'kanban', sheet: 'k4', tpl: 'tpl-review' });
    expect(No.viewById(ws, 'k4')!.cols!.map((c) => c.state)).toEqual(['open', 'doing', 'review', 'done']);
  });
  it('Als Vorlage speichern, umbenennen, löschen mit Rückgängig, laden und Datei', () => {
    let ws = W.defaultWorkspace();
    ws = reducer(ws, { type: 'padCreate', desk: '', kind: 'kanban', ids: ['k', 'p1', 's1'] });
    const cols = No.viewById(ws, 'k')!.cols!;
    ws = reducer(ws, { type: 'colWip', view: 'k', col: cols[1].id, wip: 3 });
    ws = reducer(ws, { type: 'sheetReview', view: 'k', on: true });
    ws = reducer(ws, { type: 'sheetAdd', view: 'k', title: 'Karte', note: 'n' });
    ws = reducer(ws, { type: 'tplFromBoard', view: 'k', name: 'Team', id: 't1' });
    const t = BT.templateById(ws, 't1')!;
    expect(t).toMatchObject({ name: 'Team', review: true });
    expect(t.cols.map((c) => [c.name, c.state, c.wip])).toEqual([['Offen', 'open', undefined], ['In Arbeit', 'doing', 3], ['Erledigt', 'done', undefined]]);
    // vergebener Name → nichts
    expect(BT.templateFromBoard(ws, 'k', 'team')).toEqual({ ok: false, reason: 'taken' });
    expect(BT.templateFromBoard(ws, 'k', 'Vertrieb')).toEqual({ ok: false, reason: 'taken' });
    ws = reducer(ws, { type: 'tplRename', id: 't1', name: 'Team Nord' });
    expect(BT.templateById(ws, 't1')!.name).toBe('Team Nord');
    // Speichern und Laden behält die Vorlage
    const back = parseWorkspace(JSON.parse(JSON.stringify(ws)))!;
    expect(BT.ownTemplates(back)).toEqual(BT.ownTemplates(ws));
    // Löschen und Rückgängig an den alten Platz
    ws = reducer(ws, { type: 'tplFromBoard', view: 'k', name: '', id: 't2' });
    expect(BT.templateById(ws, 't2')!.name).toBe('Kanban-Board');
    const del = BT.deleteTemplate(ws, 't1')!;
    ws = reducer(ws, { type: 'tplDelete', id: 't1' });
    expect(BT.ownTemplates(ws).map((x) => x.id)).toEqual(['t2']);
    ws = reducer(ws, { type: 'tplRestore', undo: del.undo });
    expect(BT.ownTemplates(ws).map((x) => x.id)).toEqual(['t1', 't2']);
    // Datei: hin und zurück, Name wird frei gemacht
    const file = JSON.stringify(BT.templateToFile(BT.templateById(ws, 't1')!));
    const r = BT.readTemplateFile(file);
    expect(r.ok).toBe(true);
    if (r.ok) {
      ws = reducer(ws, { type: 'tplAdd', tpl: r.template, id: 't3' });
      expect(BT.templateById(ws, 't3')!.name).toBe('Team Nord 2');
    }
    expect(BT.readTemplateFile('{"format":"x"}')).toEqual({ ok: false, error: 'format' });
    expect(BT.readTemplateFile('{"format":"e-sources-board-vorlage","version":9,"template":{}}')).toEqual({ ok: false, error: 'newer' });
    expect(BT.templateFileName('Vertrieb Süd')).toBe('e-sources-vorlage-vertrieb-sued.json');
  });
  it('Laden prüft: doppelte Ids und Namen mitgelieferter Vorlagen fallen weg', () => {
    const list = BT.parseBoardTemplates([
      { id: 'a', name: 'Eigen', cols: [{ name: 'Neu', state: 'open' }, { name: 'Fertig' }] },
      { id: 'a', name: 'Doppelt', cols: [{ name: 'x' }] },
      { id: 'tpl-sales', name: 'Gekapert', cols: [{ name: 'x' }] },
      { id: 'b', name: 'vertrieb', cols: [{ name: 'x' }] },
      { id: 'c', name: 'Leer', cols: [] },
    ]);
    expect(list.map((t) => t.id)).toEqual(['a']);
    expect(list[0].cols.map((c) => c.state)).toEqual(['open', 'done']);
  });
});

describe('V88: Verschieben nach … zwischen Sheets', () => {
  it('To-do → Kanban in die passende Spalte, Kanban → To-do; Matrix kein Ziel', () => {
    let ws = W.defaultWorkspace();
    ws = reducer(ws, { type: 'padCreate', desk: '', kind: 'todo', ids: ['t', 'p1', 's1'] });
    ws = reducer(ws, { type: 'padCreate', desk: '', kind: 'kanban', ids: ['k', 'p2', 's2'] });
    ws = reducer(ws, { type: 'padCreate', desk: '', kind: 'eisenhower', ids: ['m', 'p3', 's3'] });
    ws = reducer(ws, { type: 'sheetAdd', view: 't', title: 'a', note: 'a' });
    ws = reducer(ws, { type: 'sheetAdd', view: 't', title: 'b', note: 'b' });
    ws = reducer(ws, { type: 'sheetDone', note: 'b', here: 't' });
    expect(Sh.moveTargets(ws, 't').map((v) => v.id)).toEqual(['k']);
    ws = reducer(ws, { type: 'sheetMoveTo', note: 'a', from: 't', to: 'k' });
    ws = reducer(ws, { type: 'sheetMoveTo', note: 'b', from: 't', to: 'k' });
    const k = No.viewById(ws, 'k')!;
    expect(k.cols!.map((c) => c.ids)).toEqual([['a'], [], ['b']]);
    expect(No.viewById(ws, 't')!.ids).toEqual([]);
    expect(No.noteById(ws, 'b')!.state).toBe('done');
    ws = reducer(ws, { type: 'sheetMoveTo', note: 'a', from: 'k', to: 't' });
    expect(No.viewById(ws, 't')!.ids).toEqual(['a']);
    expect(No.viewById(ws, 'k')!.cols![0].ids).toEqual([]);
  });
});

describe('V88: Rad-Wahl je Sheet merken', () => {
  it('prüft Werte und begrenzt die Zahl', () => {
    expect(SP.parseSheetPrefs({ a: { show: 'all', order: 'due' }, b: { show: 'x' }, c: 3 })).toEqual({ a: { show: 'all', order: 'due' } });
    let all = SP.withSheetPref({}, 'a', { show: 'all' });
    all = SP.withSheetPref(all, 'a', { order: 'important' });
    expect(all).toEqual({ a: { show: 'all', order: 'important' } });
    for (let i = 0; i < SP.SHEET_PREFS_MAX + 5; i++) all = SP.withSheetPref(all, `s${i}`, { show: 'open' });
    expect(Object.keys(all).length).toBe(SP.SHEET_PREFS_MAX);
    expect(all.a).toBeUndefined();
  });
});

describe('F-210 Lageplan (V89)', () => {
  // zwei Slots nebeneinander, rechts darunter ein dritter
  const tiles: Plan.PlanTile[] = [
    { id: 'a', name: 'Slot 1', rect: { x: 0, y: 0, w: 0.5, h: 1 } },
    { id: 'b', name: 'Slot 2', rect: { x: 0.5, y: 0, w: 0.5, h: 0.5 } },
    { id: 'c', name: 'Slot 3', rect: { x: 0.5, y: 0.5, w: 0.5, h: 0.5 } },
  ];
  const at = (x: number, _y?: number) => Plan.PLAN_RIM + (1 - 2 * Plan.PLAN_RIM) * x;
  it('Zonen: Rand = Seite, Mitte = ganz, Außenrand = Desk-Rand', () => {
    expect(Plan.pickAt(tiles, at(0.25, 0), at(0.5, 0))).toEqual({ tile: 'a', zone: 'full' });
    expect(Plan.pickAt(tiles, at(0.45, 0), at(0.5, 0))).toEqual({ tile: 'a', zone: 'right' });
    expect(Plan.pickAt(tiles, at(0.75, 0), at(0.05, 0))).toEqual({ tile: 'b', zone: 'top' });
    expect(Plan.pickAt(tiles, 0.01, 0.5)).toEqual({ tile: null, zone: 'left' });
    expect(Plan.pickAt(tiles, 0.5, 0.99)).toEqual({ tile: null, zone: 'bottom' });
  });
  it('Vorschau: Hälfte des Slots bzw. des Desks', () => {
    expect(Plan.pickRect(tiles, { tile: 'a', zone: 'right' })).toEqual({ x: 0.25, y: 0, w: 0.25, h: 1 });
    expect(Plan.pickRect(tiles, { tile: 'c', zone: 'full' })).toEqual({ x: 0.5, y: 0.5, w: 0.5, h: 0.5 });
    expect(Plan.pickRect(tiles, { tile: null, zone: 'top' })).toEqual({ x: 0, y: 0, w: 1, h: 0.5 });
    expect(Plan.pickRect(tiles, { tile: null, zone: 'right' }, 1 / 3).w).toBeGreaterThan(0.33);
  });
  it('Tastatur: Pfeile wandern, Umschalt wählt Seite, zweimal am Rand = Desk-Rand', () => {
    const p0: Plan.PlanPick = { tile: 'a', zone: 'right' };
    expect(Plan.keyPick(tiles, p0, 'ArrowRight')).toEqual({ tile: 'b', zone: 'right' });
    expect(Plan.keyPick(tiles, { tile: 'b', zone: 'right' }, 'ArrowDown')).toEqual({ tile: 'c', zone: 'right' });
    expect(Plan.keyPick(tiles, { tile: 'c', zone: 'right' }, 'ArrowLeft')).toEqual({ tile: 'a', zone: 'right' });
    expect(Plan.keyPick(tiles, p0, 'ArrowLeft')).toEqual(p0);
    expect(Plan.keyPick(tiles, p0, 'ArrowLeft', true)).toEqual({ tile: 'a', zone: 'left' });
    expect(Plan.keyPick(tiles, { tile: 'a', zone: 'left' }, 'ArrowLeft', true)).toEqual({ tile: null, zone: 'left' });
    expect(Plan.keyPick(tiles, { tile: null, zone: 'left' }, 'ArrowRight')).toEqual({ tile: 'a', zone: 'left' });
    expect(Plan.keyPick(tiles, p0, ' ')).toEqual({ tile: 'a', zone: 'full' });
    expect(Plan.keyPick(tiles, p0, 'End')).toEqual({ tile: 'c', zone: 'right' });
    expect(Plan.keyPick(tiles, p0, 'x')).toBeNull();
  });
  it('Beschriftung je Zweck', () => {
    expect(Plan.pickName(tiles, { tile: 'b', zone: 'right' }, 'pad')).toBe('Slot 2 · rechte Hälfte');
    expect(Plan.pickName(tiles, { tile: 'b', zone: 'left' }, 'slot')).toBe('Neuer Slot links von Slot 2');
    expect(Plan.pickName(tiles, { tile: 'b', zone: 'full' }, 'slot')).toBe('Neues Portal in „Slot 2“ stapeln');
    expect(Plan.pickName(tiles, { tile: null, zone: 'top' }, 'slot')).toBe('Neue Zeile am Desk-Rand oben');
    expect(Plan.pickName(tiles, { tile: null, zone: 'left' }, 'pad')).toBe('Ganzer Desk · linke Hälfte');
  });
  it('Slot-Baum: neues Blatt an jedem Rand bzw. neben einem Blatt', () => {
    const tree: T.Node = { dir: 'row', children: [{ id: 'a' }, { id: 'b' }], sizes: [0.5, 0.5] };
    const left = T.addAtSide(tree, 'n', 'left');
    expect(T.leaves(left)).toEqual(['n', 'a', 'b']);
    expect(T.rects(left).get('n')!.w).toBeGreaterThan(0.33);
    const top = T.addAtSide(tree, 'n', 'top');
    expect(T.rects(top).get('n')).toMatchObject({ x: 0, y: 0, w: 1 });
    expect(T.sideShare(tree, 'right')).toBeGreaterThan(0.33);
    expect(T.sideShare(tree, 'bottom')).toBe(0.5);
    const near = T.insertAt(tree, 'b', 'n', 'top');
    expect(T.rects(near).get('n')).toMatchObject({ x: 0.5, y: 0, w: 0.5, h: 0.5 });
  });
});

describe('F-210 Schritt 4 (V90): Notizen-Modus als Baum', () => {
  const min = { w: 0.1, h: 0.1 };
  it('Startbaum wie das Raster (F2)', () => {
    expect(NT.gridTree([])).toBeNull();
    expect(NT.gridTree(['a'])).toEqual({ id: 'a' });
    const t = NT.gridTree(['a', 'b', 'c'])!;
    const r = T.rects(t);
    expect(r.get('a')).toMatchObject({ x: 0, y: 0, w: 0.5, h: 0.5 });
    expect(r.get('c')).toMatchObject({ x: 0, y: 0.5, w: 1, h: 0.5 });
    // gleiche Lage wie das bisherige Raster (noteTiles)
    const g = T.rects(NT.gridTree(['1', '2', '3', '4', '5'])!);
    Pd.noteTiles(5).forEach((x, i) => expect(g.get(String(i + 1))).toMatchObject(x));
  });
  it('Abgleich: fehlende Pads rechts neben das aktive, geschlossene fallen weg (F3, F4)', () => {
    const t0: T.Node = { dir: 'row', children: [{ id: 'a' }, { id: 'b' }], sizes: [0.5, 0.5] };
    const s = NT.syncNoteTree(t0, ['a', 'b', 'n'], { near: 'a', min, aspect: 1.6 });
    expect(s.added).toBe(true);
    expect(T.leaves(s.tree)).toEqual(['a', 'n', 'b']);
    expect(T.rects(s.tree).get('n')).toMatchObject({ x: 0.25, w: 0.25 });
    // geschlossenes Pad: Nachbar rückt nach, nichts dazugekommen
    const gone = NT.syncNoteTree(t0, ['b'], { min, aspect: 1.6 });
    expect(gone).toEqual({ tree: { id: 'b' }, added: false });
    // zu klein neben dem aktiven → Hälfte des größten
    const tight = NT.syncNoteTree(t0, ['a', 'b', 'n'], { near: 'a', min: { w: 0.3, h: 0.1 }, aspect: 1.6 });
    expect(T.rects(tight.tree).get('n')!.w).toBeGreaterThanOrEqual(0.25);
    expect(T.rects(tight.tree).get('a')!.w).toBe(0.5);
    // ohne gespeicherten Baum = Raster
    expect(NT.syncNoteTree(undefined, ['a', 'b'], { min, aspect: 1 }).tree).toEqual(NT.gridTree(['a', 'b']));
  });
  it('Speichern je Desk, Lesen prüft Pads', () => {
    const ws0 = W.defaultWorkspace();
    const tree: T.Node = { dir: 'row', children: [{ id: 'p1' }, { id: 'p2' }], sizes: [0.5, 0.5] };
    const ws = NT.setNoteTree(ws0, '', tree, 'laptop:landscape');
    expect(NT.noteTreeOf(ws, '', 'laptop:landscape')).toEqual(tree);
    expect(NT.noteTreeOf(NT.setNoteTree(ws, '', null, 'laptop:landscape'), '', 'laptop:landscape')).toBeUndefined();
    const raw = { places: {}, notes: tree };
    // nur bekannte Pads; unbekanntes Blatt fällt heraus
    expect(parsePadDesks({ '': raw }, new Set(['p1']), new Set())).toEqual({ '': { places: {}, notes: { id: 'p1' } } });
    expect(parsePadDesks({ '': { places: {}, notes: { dir: 'row', children: [{ id: 'p1' }, { id: 'p1' }], sizes: [0.5, 0.5] } } }, new Set(['p1']), new Set())).toBeUndefined();
  });
  it('Tauschen mit dem Nachbarn, Ablegen und neue Pads im Plan (F1)', () => {
    const t: T.Node = { dir: 'row', children: [{ id: 'a' }, { dir: 'col', children: [{ id: 'b' }, { id: 'c' }], sizes: [0.5, 0.5] }], sizes: [0.5, 0.5] };
    const sw = NT.swapToward(t, 'a', 'right')!;
    expect(sw.with).toBe('b');
    expect(T.rects(sw.tree).get('a')).toMatchObject({ x: 0.5, y: 0 });
    expect(NT.swapToward(t, 'a', 'left')).toBeNull();
    expect(NT.swapToward(t, 'b', 'bottom')!.with).toBe('c');
    // Seite = andocken, Mitte = tauschen, Desk-Rand = über die ganze Fläche
    expect(T.rects(NT.moveInTree(t, 'c', 'a', 'left')).get('c')).toMatchObject({ x: 0, w: 0.25 });
    expect(NT.moveInTree(t, 'c', 'a', 'full')).toEqual(T.swapLeaves(t, 'c', 'a'));
    expect(T.rects(NT.moveInTree(t, 'a', null, 'bottom')).get('a')).toMatchObject({ x: 0, w: 1 });
    expect(T.rects(NT.addInTree(t, 'n', 'b', 'top')).get('n')).toMatchObject({ x: 0.5, y: 0, h: 0.25 });
    expect(T.rects(NT.addInTree(t, 'n', null, 'left')).get('n')).toMatchObject({ x: 0, w: 1 / 3 });
    expect(NT.addInTree(null, 'n', null, 'left')).toEqual({ id: 'n' });
    // Kacheln in Lesereihenfolge mit Namen
    expect(NT.noteTilesOf(t, (id) => id.toUpperCase()).map((x) => x.name)).toEqual(['A', 'B', 'C']);
  });
  it('Reducer setzt den Baum', () => {
    const ws = reducer(W.defaultWorkspace(), { type: 'noteTree', desk: '', tree: { id: 'x' }, key: 'laptop:landscape' });
    expect(ws.deskNotes?.['']?.board?.list[0].trees).toEqual({ 'laptop:landscape': { id: 'x' } });
  });
});

describe('F-210 Schritt 5 (V91): Notizen-Layouts (Z1–Z4)', () => {
  let n = 0;
  const make = () => `id${++n}`;
  /** Main Desk mit zwei Pads: Kanban (Notiz darin) und To-do. */
  const twoPads = () => {
    let ws = W.defaultWorkspace();
    const note = NLo.createNote(ws, { title: 'Angebot' }, { id: 'n1' });
    ws = note.ws;
    ws = NLo.createView(ws, 'kanban', 'Vertrieb', { id: 'vk', makeId: make }).ws;
    ws = NLo.createView(ws, 'todo', 'Heute', { id: 'vt', makeId: make }).ws;
    const placed = NLo.placeNote(ws, 'n1', { view: 'vk' });
    if (placed.ok) ws = placed.ws;
    ws = NLp.createPad(ws, '', ['vk'], { id: 'p1' }).ws;
    ws = NLp.createPad(ws, '', ['vt'], { id: 'p2' }).ws;
    const tree: T.Node = { dir: 'row', children: [{ id: 'p1' }, { id: 'p2' }], sizes: [0.7, 0.3] };
    return NT.setNoteTree(ws, '', tree, 'laptop:landscape');
  };
  it('ohne Eintrag ein Layout; Baum je Einstellung, sonst der zuletzt gespeicherte', () => {
    const ws = twoPads();
    const d = NL.notesLayoutsOf(ws, '');
    expect(d.list.map((l) => l.name)).toEqual(['Notizen-Layout 1']);
    expect(NL.noteTreeFor(ws, '', 'laptop:landscape')).toMatchObject({ sizes: [0.7, 0.3] });
    // andere Einstellung ohne eigenen Baum = zuletzt gespeicherter
    expect(NL.noteTreeFor(ws, '', 'tablet:portrait')).toMatchObject({ sizes: [0.7, 0.3] });
    const two = NT.setNoteTree(ws, '', { id: 'p1' }, 'tablet:portrait');
    expect(NL.noteTreeFor(two, '', 'laptop:landscape')).toMatchObject({ sizes: [0.7, 0.3] });
    expect(NL.noteTreeFor(two, '', 'tablet:portrait')).toEqual({ id: 'p1' });
  });
  it('Wechsel legt Pads in den Vorrat und holt sie zurück (F-50)', () => {
    const ws = twoPads();
    const empty = NL.addNotesLayout(ws, '', 'empty', { key: 'laptop:landscape', id: 'L2' });
    expect(NL.notesLayoutsOf(empty, '').active).toBe('L2');
    expect(NLp.padsOn(empty, '')).toHaveLength(0);
    // Sheets bleiben in der Library
    expect(NLo.viewsOf(empty).map((v) => v.id)).toEqual(['vk', 'vt']);
    const back = NL.switchNotesLayout(empty, '', 'first');
    expect(NLp.padsOn(back, '').map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(NL.noteTreeFor(back, '', 'laptop:landscape')).toMatchObject({ sizes: [0.7, 0.3] });
    // Sheet inzwischen in einem anderen Pad → fällt beim Zurückholen weg (ein Sheet, ein Pad)
    const moved = NLp.createPad(empty, '', ['vt'], { id: 'p9' }).ws;
    const again = NL.switchNotesLayout(moved, '', 'first');
    expect(NLp.padsOn(again, '').map((p) => p.id)).toEqual(['p1']);
    expect(NL.notesContentOf(again, '', 'L2')!.pads.map((p) => p.id)).toEqual(['p9']);
  });
  it('mitgeliefert: Fokus und Tagesplanung mit neuen, leeren Sheets (Z4)', () => {
    const ws = twoPads();
    const f = NL.addNotesLayout(ws, '', 'focus', { key: 'laptop:landscape', id: 'LF', makeId: make });
    const pads = NLp.padsOn(f, '');
    expect(pads.map((p) => NLo.viewById(f, p.active)!.kind)).toEqual(['kanban', 'todo']);
    expect(NLo.viewById(f, pads[0].active)!.ids).toEqual([]);
    expect(NL.activeNotesLayout(f, '').name).toBe('Fokus');
    const r = T.rects(NL.noteTreeFor(f, '', 'laptop:landscape')!);
    expect(+r.get(pads[0].id)!.w.toFixed(3)).toBe(0.667);
    const d = NL.addNotesLayout(f, '', 'day', { key: 'laptop:landscape', makeId: make });
    expect(NLp.padsOn(d, '').map((p) => NLo.viewById(d, p.active)!.kind)).toEqual(['todo', 'eisenhower', 'block']);
    const dr = T.rects(NL.noteTreeFor(d, '', 'laptop:landscape')!);
    expect([...dr.values()].map((x) => +x.w.toFixed(1))).toEqual([0.4, 0.6, 0.6]);
    // zweimal „Fokus“ bekommt einen freien Namen
    const f2 = NL.addNotesLayout(d, '', 'focus', { key: 'laptop:landscape', makeId: make });
    expect(NL.activeNotesLayout(f2, '').name).toBe('Fokus (Kopie)');
  });
  it('Kopieren: eigene Sheets mit denselben Notizen, Baum umgeschrieben; aus aktuellem anlegen', () => {
    const ws = twoPads();
    const c = NL.copyNotesLayout(ws, '', 'first', { makeId: make });
    const d = NL.notesLayoutsOf(c, '');
    expect(d.list.map((l) => l.name)).toEqual(['Notizen-Layout 1', 'Notizen-Layout 1 (Kopie)']);
    expect(d.active).toBe('first');
    const copy = d.list[1];
    const sheets = copy.saved!.pads.flatMap((p) => p.sheets);
    expect(sheets).not.toContain('vk');
    const k = NLo.viewById(c, copy.saved!.pads[0].active)!;
    expect(k.name).toBe('Vertrieb (Kopie)');
    expect(NLo.idsIn(k)).toEqual(['n1']);
    expect(T.leaves(copy.trees!['laptop:landscape']).sort()).toEqual(copy.saved!.pads.map((p) => p.id).sort());
    const cur = NL.addNotesLayout(ws, '', 'current', { key: 'laptop:landscape', makeId: make });
    expect(NLp.padsOn(cur, '')).toHaveLength(2);
    expect(NLp.padsOn(cur, '').map((p) => p.id)).not.toContain('p1');
  });
  it('Umbenennen, Löschen (aktiv → Nachbar) und Rückgängig', () => {
    const ws = NL.addNotesLayout(twoPads(), '', 'empty', { key: 'k', id: 'L2', name: 'Leer' });
    expect(NL.renameNotesLayout(ws, '', 'L2', 'Notizen-Layout 1')).toBe(ws);
    const rn = NL.renameNotesLayout(ws, '', 'L2', ' Morgen ');
    expect(NL.activeNotesLayout(rn, '').name).toBe('Morgen');
    const del = NL.deleteNotesLayout(rn, '', 'L2');
    expect(NL.notesLayoutsOf(del.ws, '').active).toBe('first');
    expect(NLp.padsOn(del.ws, '').map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(NL.deleteNotesLayout(del.ws, '', 'first').deleted).toBeNull();
    const back = NL.restoreNotesLayout(del.ws, del.deleted!);
    expect(NL.notesLayoutsOf(back, '').list.map((l) => l.id)).toEqual(['first', 'L2']);
  });
  it('Lesen prüft Layouts; Baum aus V90 wandert ins aktive Layout', () => {
    const ws = NL.addNotesLayout(twoPads(), '', 'empty', { key: 'laptop:landscape', id: 'L2' });
    const back = NL.switchNotesLayout(ws, '', 'first');
    const read = parseWorkspace(JSON.parse(JSON.stringify(back)))!;
    expect(NL.notesLayoutsOf(read, '')).toEqual(NL.notesLayoutsOf(back, ''));
    // gespeicherte Pads mit unbekanntem Sheet fallen heraus
    const broken = JSON.parse(JSON.stringify(ws));
    broken.deskNotes[''].board.list[0].saved.pads[0].sheets = ['weg'];
    expect(NL.notesContentOf(parseWorkspace(broken)!, '', 'first')!.pads.map((p) => p.id)).toEqual(['p2']);
    // V90: Baum lag in padDesks – kommt unter dem Schlüssel der Einstellung ins Layout
    const old = JSON.parse(JSON.stringify(W.defaultWorkspace()));
    old.noteViews = [{ id: 'v', kind: 'block', name: 'N', ids: [] }];
    old.pads = [{ id: 'p', desk: '', sheets: ['v'], active: 'v' }];
    old.padDesks = { '': { places: {}, notes: { id: 'p' } } };
    old.winSetup = { '': 'laptop:landscape:1' };
    const up = parseWorkspace(old)!;
    expect(up.padDesks?.['']?.notes).toBeUndefined();
    expect(NL.activeNotesLayout(up, '').trees).toEqual({ 'laptop:landscape': { id: 'p' } });
  });
  it('Vorschau: Kacheln mit Art und Name, ohne Baum als Raster', () => {
    const ws = twoPads();
    const tiles = NL.notesLayoutView(ws, '', 'first', 'laptop:landscape');
    expect(tiles.map((t) => [t.name, t.kind, +t.rect.w.toFixed(1)])).toEqual([['Vertrieb', 'kanban', 0.7], ['Heute', 'todo', 0.3]]);
    const e = NL.addNotesLayout(ws, '', 'empty', { key: 'k', id: 'L2' });
    expect(NL.notesLayoutView(e, '', 'first', 'x')).toHaveLength(2);
    expect(NL.notesLayoutView(e, '', 'L2', 'x')).toEqual([]);
  });
});

describe('F-218 (V91): Schalter A1–A9 und Wenn-dann-Regeln W1–W4', () => {
  it('Werk = erste Wahl, nur Abweichungen gespeichert, Lesen prüft', () => {
    const ws = W.defaultWorkspace();
    expect(RS.switchOf(ws, 'notice')).toBe('2');
    expect(RS.noticeMs(ws)).toBe(2000);
    const a = RS.setSwitch(ws, 'notice', 'click');
    expect(RS.noticeMs(a)).toBeNull();
    expect(a.ruleSet).toEqual({ sw: { notice: 'click' } });
    expect(RS.setSwitch(a, 'notice', '2').ruleSet).toBeUndefined();
    const b = RS.setWhen(RS.setWhen(a, 'dueUrgent', true), 'doneChecks', true);
    expect(b.ruleSet!.when).toEqual(['doneChecks', 'dueUrgent']);
    expect(RS.parseRuleSet({ sw: { notice: 'click', wip: 'ask', fold: 'quatsch', x: 'y' }, when: ['dueUrgent', 'nix'] })).toEqual({ sw: { notice: 'click' }, when: ['dueUrgent'] });
    expect(parseWorkspace(JSON.parse(JSON.stringify(b)))!.ruleSet).toEqual(b.ruleSet);
  });
  it('Checkliste: zählen, abhaken (W1), alle fertig (W2)', () => {
    const t = 'Titel\n- [ ] eins\n- [x] zwei\n  * [ ] drei';
    expect(RS.checksOf(t)).toEqual({ total: 3, done: 1 });
    expect(RS.checkAll(t)).toBe('Titel\n- [x] eins\n- [x] zwei\n  * [x] drei');
    expect(RS.allChecked(RS.checkAll(t))).toBe(true);
    expect(RS.allChecked('kein Kästchen')).toBe(false);
  });
  it('W1 hakt ab und schreibt die Spur; aus = nichts', () => {
    let ws = NLo.createNote(W.defaultWorkspace(), { title: 'A', text: '- [ ] a' }, { id: 'a' }).ws;
    expect(RS.onDone(ws, 'a')).toBe(ws);
    ws = RS.setWhen(ws, 'doneChecks', true);
    const d = RS.onDone(ws, 'a', 5);
    const n = NLo.noteById(d, 'a')!;
    expect(n.text).toBe('- [x] a');
    expect(n.trail.at(-1)!.by).toBe('Regel W1 · Erledigt hakt ab');
  });
  it('W3 archiviert nach 30 Tagen, W4 macht Fälliges dringend', () => {
    const day = 864e5;
    const now = Date.UTC(2026, 10, 25, 12);
    let ws = W.defaultWorkspace();
    ws = NLo.createNote(ws, { title: 'alt' }, { id: 'alt', now: now - 40 * day }).ws;
    ws = NLo.setState(ws, 'alt', 'done', { now: now - 31 * day });
    ws = NLo.createNote(ws, { title: 'neu' }, { id: 'neu', now }).ws;
    ws = NLo.setState(ws, 'neu', 'done', { now: now - 2 * day });
    ws = NLo.createNote(ws, { title: 'fällig', due: '2026-11-26' }, { id: 'f', now }).ws;
    ws = NLo.createNote(ws, { title: 'später', due: '2026-12-20' }, { id: 's', now }).ws;
    expect(RS.sweep(ws, now)).toMatchObject({ archived: 0, urgent: 0 });
    ws = RS.setWhen(RS.setWhen(ws, 'archiveOld', true), 'dueUrgent', true);
    const r = RS.sweep(ws, now);
    expect([r.archived, r.urgent]).toEqual([1, 1]);
    expect(NLo.noteById(r.ws, 'alt')!.state).toBe('archived');
    expect(NLo.noteById(r.ws, 'neu')!.state).toBe('done');
    expect(NLo.noteById(r.ws, 'f')!.urgent).toBe(true);
    expect(NLo.noteById(r.ws, 's')!.urgent).toBeUndefined();
    expect(RS.sweep(r.ws, now)).toMatchObject({ archived: 0, urgent: 0 });
  });
});

describe('F-218 (V92): Einbau der Schalter und W1/W2 nach jeder Änderung', () => {
  const board = () => {
    let ws = W.defaultWorkspace();
    ws = NLo.createNote(ws, { title: 'K', text: '- [ ] a\n- [ ] b' }, { id: 'k' }).ws;
    const v = NLo.createView(ws, 'kanban', 'B');
    ws = v.ws;
    const cols = NLo.viewById(ws, v.id)!.cols!;
    const r = Sh.moveCard(ws, v.id, 'k', cols[0].id);
    return { ws: r.ok ? r.ws : ws, v: v.id, cols: cols.map((c) => c.id) };
  };
  it('W1: erledigt → Kästchen abgehakt (nur wenn an)', () => {
    const b = board();
    const off = Sh.applyWhenRules(b.ws, (Sh.moveCard(b.ws, b.v, 'k', b.cols[2]) as { ws: Workspace }).ws);
    expect(NLo.noteById(off, 'k')!.text).toBe('- [ ] a\n- [ ] b');
    const on = RS.setWhen(b.ws, 'doneChecks', true);
    const moved = (Sh.moveCard(on, b.v, 'k', b.cols[2]) as { ws: Workspace }).ws;
    expect(NLo.noteById(Sh.applyWhenRules(on, moved), 'k')!.text).toBe('- [x] a\n- [x] b');
  });
  it('W2: letzte Kästchen abgehakt → eine Spalte weiter, nur beim Übergang', () => {
    const b = board();
    const on = RS.setWhen(b.ws, 'checksNext', true);
    const edited = NLo.updateNote(on, 'k', { text: '- [x] a\n- [x] b' });
    const after = Sh.applyWhenRules(on, edited);
    expect(Sh.colOf(NLo.viewById(after, b.v)!, 'k')!.id).toBe(b.cols[1]);
    const again = Sh.applyWhenRules(after, NLo.updateNote(after, 'k', { text: '- [x] a\n- [x] b\n' }));
    expect(Sh.colOf(NLo.viewById(again, b.v)!, 'k')!.id).toBe(b.cols[1]);
  });
  it('A3 Schloss aus, A5 Einklappen, A7 leeres Sheet behalten', () => {
    const b = board();
    expect(Sh.lockOf(b.ws, 'k').length).toBe(1);
    expect(Sh.lockOf(RS.setSwitch(b.ws, 'lock', 'off'), 'k')).toEqual([]);
    let ws = NLo.setState(b.ws, 'k', 'done', { now: 1000 });
    const n = NLo.noteById(ws, 'k')!;
    expect(RS.foldsDone(ws, n, 1500)).toBe(true);
    expect(RS.foldsDone(RS.setSwitch(ws, 'fold', '2s'), n, 1500)).toBe(false);
    expect(RS.foldsDone(RS.setSwitch(ws, 'fold', '2s'), n, 3500)).toBe(true);
    expect(RS.foldsDone(RS.setSwitch(ws, 'fold', 'never'), n, 9e12)).toBe(false);
    ws = W.defaultWorkspace();
    const v = NLo.createView(ws, 'todo', '');
    const p = Pd.createPad(v.ws, '', [v.id], { id: 'p' });
    expect(NLo.viewById(Pd.closePad(p.ws, 'p'), v.id)).toBeUndefined();
    expect(NLo.viewById(Pd.closePad(RS.setSwitch(p.ws, 'emptySheet', 'keep'), 'p'), v.id)).toBeDefined();
  });
  it('A9: gleiche Source in einem anderen Portal finden', () => {
    const ws = W.defaultWorkspace();
    const p0 = ws.panels[0];
    const withUrl = { ...ws, panels: ws.panels.map((p, i) => (i === 0 ? { ...p, tabs: [{ id: 't1', url: 'https://a.de/x' }], activeTab: 't1' } : p)) };
    expect(B.openElsewhere(withUrl, 'anderes', 'https://a.de/x')).toMatchObject({ panel: p0.id, tab: 't1' });
    expect(B.openElsewhere(withUrl, p0.id, 'https://a.de/x')).toBeNull();
  });
});

describe('F-217 Touren prüfen (V98)', () => {
  /** Simuliertes Cockpit: Ansicht-Klassen am #overview; alles andere gibt es. */
  const cockpitHas = (on: string[]) => (sel: string) =>
    sel.split(',').some((part) => {
      const nots = [...part.matchAll(/:not\(\.is-([a-z]+)\)/g)].map((m) => m[1]);
      const pos = [...part.replace(/:not\([^)]*\)/g, '').matchAll(/\.is-([a-z]+)/g)].map((m) => m[1]);
      return pos.every((c) => on.includes(c)) && nots.every((c) => !on.includes(c));
    });
  const ids = (on: string[]) => Tour.tourSteps(cockpitHas(on), Tour.TOURS.cockpit).map((s) => s.id);
  it('Cockpit-Tour zeigt nur die Schritte der offenen Ansicht', () => {
    const portals = ids(['portals']);
    expect(portals).toContain('radar');
    expect(portals).toContain('rules');
    expect(portals).not.toContain('notesList');
    expect(portals).not.toContain('persons');
    const notes = ids(['notes']);
    expect(notes).toContain('notesList');
    expect(notes).toContain('notesWheel');
    expect(notes).not.toContain('portals');
    expect(notes).not.toContain('move');
    expect(notes).not.toContain('rules');
    expect(notes).not.toContain('focusBars');
    const focus = ids(['notes', 'focus']);
    expect(focus).toContain('focusBars');
    expect(focus).not.toContain('notesList');
    expect(ids(['persons'])).toEqual(['cockpit', 'focus', 'modes', 'persons', 'personInfo', 'again']);
    expect(ids(['layouts'])).toEqual(['cockpit', 'focus', 'modes', 'layouts', 'layoutActions', 'cases', 'preview', 'slots', 'again']);
    const lib = ids(['sources']);
    expect(lib).toContain('library');
    expect(lib).toContain('libraryList');
    expect(lib).not.toContain('filter');
  });
  it('neue Touren „Notizen & Aufgaben“ und „Main Stage“: eigene Merker, Texte, in der Suche', () => {
    for (const id of ['notes', 'stage'] as const) {
      const t = Tour.TOURS[id];
      expect(t[0].target).toBe(undefined);
      expect(new Set(t.map((s) => s.id)).size).toBe(t.length);
      expect(t.every((s) => s.text.trim().length > 20)).toBe(true);
      expect(Tour.TOUR_KEY[id]).toBe(`esource.tour.${id}.v1`);
    }
    expect(H.searchHelp('Tour Notizen')[0].id).toBe('tourNotes');
    expect(H.searchHelp('Tour Main Stage')[0].id).toBe('tourStage');
    expect(new Set(Object.values(Tour.TOUR_KEY)).size).toBe(Object.keys(Tour.TOURS).length);
  });
  it('V104: Tour „Feedback“ – eigener Merker, im Cockpit „Feedback“, Board-Schritte nur mit Bearbeitung, in der Suche', () => {
    const t = Tour.TOURS.feedback;
    expect(t[0].target).toBe(undefined);
    expect(new Set(t.map((s) => s.id)).size).toBe(t.length);
    expect(Tour.TOUR_KEY.feedback).toBe('esource.tour.feedback.v1');
    expect(t.filter((s) => s.target && s.id !== 'again').every((s) => s.target!.includes('.is-feedback'))).toBe(true);
    const user = (sel: string) => sel.includes('.is-feedback') && !sel.includes('fbb__board') && !sel.includes('fbb__triage');
    const ids = Tour.tourSteps(user, t).map((s) => s.id);
    expect(ids).toEqual(['intro', 'filter', 'list', 'card', 'file']);
    expect(H.searchHelp('Tour Feedback')[0].id).toBe('tourFeedback');
  });
  it('V106: Tour „Projekte“ – eigener Merker, Instanzen nur im Steckbrief, in Hilfe und Suche', () => {
    const t = Tour.TOURS.projects;
    expect(t[0].target).toBe(undefined);
    expect(new Set(t.map((s) => s.id)).size).toBe(t.length);
    expect(Tour.TOUR_KEY.projects).toBe('esource.tour.projects.v1');
    const psp = (sel: string) => !sel.includes('pj__brief') && !sel.includes('pj__roles') && !sel.includes('pj__cal') && !sel.includes('pj__owndesk') && !sel.includes('pj__xchg');
    // V117: Gantt/Basisplan, Netzplan, Ressourcen am Rad; Kalender und Projekt-Desk nur im Steckbrief
    expect(Tour.tourSteps(psp, t).map((s) => s.id)).toEqual(['intro', 'list', 'views', 'plan', 'net', 'res', 'report', 'inbox', 'steer', 'add', 'again']);
    expect(Tour.tourSteps(() => true, t).map((s) => s.id)).toContain('desk');
    expect(Tour.tourSteps(() => true, t).map((s) => s.id)).toContain('exchange');
    expect(Tour.tourSteps(() => true, t).map((s) => s.id)).toContain('roles');
    expect(H.searchHelp('Tour Projekte')[0].id).toBe('tourProjects');
    expect(H.searchHelp('Lenkungskreis').map((e) => e.id)).toContain('projectFeedback');
    expect(H.helpById('projectFeedback')?.text.startsWith('Probleme')).toBe(true);
  });
  it('V106: Projektformular – eigene Felder anlegen, ändern, Pflicht, entfernen/zurück, Arten umbenennen', () => {
    let f = Fb.addCustom(undefined, { name: ' Kosten  stelle ', type: 'text' }, 'k1').form;
    expect(Fb.customOf(f)).toEqual([{ id: 'k1', name: 'Kosten stelle', type: 'text' }]);
    expect(Fb.addCustom(f, { name: 'kosten stelle', type: 'number' }, 'k2').error).toBe('twice');
    expect(Fb.addCustom(f, { name: '', type: 'text' }, 'k2').error).toBe('name');
    expect(Fb.addCustom(f, { name: 'Phase', type: 'choice', options: ['Bau'] }, 'k2').error).toBe('options');
    f = Fb.addCustom(f, { name: 'Phase', type: 'choice', options: ['Bau', 'bau', 'Abnahme'] }, 'k2').form;
    expect(Fb.customOf(f)[1].options).toEqual(['Bau', 'Abnahme']);
    f = Fb.editCustom(f, 'k2', { required: true, name: 'Projektphase' });
    expect(Fb.customOf(f)[1]).toMatchObject({ name: 'Projektphase', required: true });
    expect(Fb.customOf(Fb.editCustom(f, 'k2', { name: 'Kosten stelle' }))[1].name).toBe('Projektphase');
    f = Fb.moveCustom(f, 'k2', -1);
    expect(Fb.customOf(f).map((c) => c.id)).toEqual(['k2', 'k1']);
    // an/aus und Pflicht der festen Felder lassen eigene Felder stehen
    f = Fb.toggleForm(f, 'steps', 'off');
    expect(Fb.customOf(f)).toHaveLength(2);
    expect(f!.off).toEqual(['steps']);
    const r = Fb.removeCustom(f, 'k2');
    expect(Fb.customOf(r.form).map((c) => c.id)).toEqual(['k1']);
    expect(Fb.customOf(Fb.restoreCustom(r.form, r.removed!)).map((c) => c.id)).toEqual(['k2', 'k1']);
    f = Fb.renameKind(f, 'bug', 'Problem');
    expect(Fb.kindName(f, 'bug')).toBe('Problem');
    expect(Fb.kindName(f, 'wish')).toBe('Wunsch');
    expect(Fb.renameKind(f, 'bug', 'Fehler')!.kinds).toBe(undefined);
    // Datei: nur Gültiges kommt an
    const back = Fb.parseFeedbackForm({ ...f, custom: [...Fb.customOf(f), { id: 'x', name: 'Kaputt', type: 'farbe' }, { id: 'y', name: 'Wahl', type: 'choice', options: ['a'] }] });
    expect(back).toEqual(f);
    expect(Fb.parseFeedbackForm({})).toBe(undefined);
  });
  it('V106: Formular-Vorlagen – IPMA bringt Pflicht und eigene Felder, Kurz schaltet aus, Standard zurück', () => {
    let n = 0;
    const ids = () => `t${++n}`;
    expect(Fb.templateOf(undefined)).toBe('standard');
    let f = Fb.addCustom(undefined, { name: 'Kostenstelle', type: 'text' }, 'k').form;
    f = Fb.renameKind(f, 'bug', 'Problem');
    f = Fb.applyTemplate(f, 'ipma', ids);
    expect(Fb.formOf(f).required).toEqual(['what', 'affected', 'impact', 'severity']);
    expect(Fb.customOf(f).map((c) => c.name)).toEqual(['Kostenstelle', 'Vorgang / Arbeitspaket', 'Auswirkung auf', 'Entscheidung nötig bis']);
    expect(Fb.kindName(f, 'bug')).toBe('Problem');
    expect(Fb.templateOf(f)).toBe(null);
    expect(Fb.customOf(Fb.applyTemplate(f, 'ipma', ids))).toHaveLength(4);
    expect(Fb.templateOf(Fb.applyTemplate(undefined, 'ipma', ids))).toBe('ipma');
    const k = Fb.applyTemplate(undefined, 'short', ids);
    expect(Fb.templateOf(k)).toBe('short');
    expect(Fb.formOf(k).off).not.toContain('what');
    expect(Fb.applyTemplate(k, 'standard', ids)).toBe(undefined);
  });
  it('V106: Weiter an … – Projektmeldung an eine andere Instanz, mit Spur; nicht für E-Sources-Meldungen', () => {
    const pr = Pj.addProject(W.defaultWorkspace(), 'Halle')!;
    let w = Fb.addFeedback(pr.ws, { kind: 'bug', title: 'Tor klemmt', project: pr.id, to: 'pl' }, { id: 'm1' })!.ws;
    w = Fb.addFeedback(w, { kind: 'bug', title: 'App' }, { id: 'm2' })!.ws;
    const w2 = Fb.forwardFeedback(w, 'm1', 'lk', { from: 'Projektleitung', to: 'Lenkungskreis' }, { by: 'ich' });
    expect(Fb.feedbackById(w2, 'm1')!.to).toBe('lk');
    expect(Fb.feedbackById(w2, 'm1')!.marks!.at(-1)).toMatchObject({ kind: 'to', text: 'Projektleitung → Lenkungskreis', by: 'ich' });
    expect(Fb.forwardFeedback(w2, 'm1', 'lk', { from: 'a', to: 'b' })).toBe(w2);
    expect(Fb.forwardFeedback(w, 'm2', 'lk', { from: 'a', to: 'b' })).toBe(w);
    expect(Fb.parseFeedback([Fb.feedbackById(w2, 'm1')])[0].marks!.at(-1)!.kind).toBe('to');
    expect(Fb.feedbackFileMarkdown(w2, { project: pr.id })).toContain('Weiter an: Projektleitung → Lenkungskreis');
  });
  it('V106 (F-224 R7): Feedback-Datei einlesen – neu dazu, neuere Texte übernehmen, unsere Bearbeitung bleibt', () => {
    const t1 = new Date('2026-12-08T10:00:00Z'), t2 = new Date('2026-12-09T10:00:00Z');
    let ours = Fb.addFeedback(W.defaultWorkspace(), { kind: 'bug', title: 'Alt' }, { id: 'a', now: t1 })!.ws;
    ours = Fb.setFeedbackState(ours, 'a', 'planned', { now: t1 });
    ours = Fb.addMark(ours, 'a', 'ref', 'F-206', { now: t1 });
    let theirs = Fb.addFeedback(W.defaultWorkspace(), { kind: 'bug', title: 'Alt' }, { id: 'a', now: t1 })!.ws;
    theirs = Fb.editFeedback(theirs, 'a', { what: 'Genauer beschrieben' }, t2);
    theirs = Fb.addFeedback(theirs, { kind: 'wish', title: 'Neu' }, { id: 'b', now: t2 })!.ws;
    const file = Fb.feedbackFileJson(theirs);
    const r = Fb.mergeFeedbackFile(ours, file);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect([r.added, r.updated, r.same]).toEqual([1, 1, 0]);
    const a = r.list.find((f) => f.id === 'a')!;
    expect(a.what).toBe('Genauer beschrieben');
    expect(a.state).toBe('planned');
    expect(a.refs).toEqual(['F-206']);
    const w = Fb.setFeedbackList(ours, r.list);
    const again = Fb.mergeFeedbackFile(w, file);
    expect(again.ok && [again.added, again.updated, again.same]).toEqual([0, 0, 2]);
    expect(Fb.mergeFeedbackFile(ours, '{x').ok).toBe(false);
    expect(Fb.mergeFeedbackFile(ours, JSON.stringify({ format: 'anders' }))).toEqual({ ok: false, error: 'format' });
  });
  it('V106: Werte eigener Felder in der Meldung – Pflicht bei „noch offen“, leer entfernt, in Datei und Markdown', () => {
    const pr = Pj.addProject(W.defaultWorkspace(), 'Halle')!;
    let w = pr.ws;
    let form = Fb.addCustom(undefined, { name: 'Freigabe', type: 'bool' }, 'fr').form;
    form = Fb.addCustom(form, { name: 'Stunden', type: 'number' }, 'h').form;
    form = Fb.editCustom(form, 'h', { required: true });
    form = Fb.renameKind(form, 'bug', 'Problem');
    w = Pj.editProject(w, pr.id, { feedbackForm: form });
    w = Fb.addFeedback(w, { kind: 'bug', title: 'Tor klemmt', project: pr.id }, { id: 'm1' })!.ws;
    const m = () => Fb.feedbackById(w, 'm1')!;
    expect(Fb.missingCustom(m(), form).map((c) => c.id)).toEqual(['h']);
    w = Fb.editFeedback(w, 'm1', { extra: { h: 2.5, fr: true, 'böse id': 'x' } });
    expect(m().extra).toEqual({ h: 2.5, fr: true });
    expect(Fb.missingCustom(m(), form)).toHaveLength(0);
    expect(Fb.parseFeedback([m()])[0].extra).toEqual({ h: 2.5, fr: true });
    const md = Fb.feedbackFileMarkdown(w, { project: pr.id });
    expect(md).toContain('## Problem: Tor klemmt');
    expect(md).toContain('**Stunden:** 2.5');
    expect(md).toContain('**Freigabe:** Ja');
    w = Fb.editFeedback(w, 'm1', { extra: { h: null, fr: null } });
    expect(m().extra).toBe(undefined);
    expect(Fb.extraText({ id: 'd', name: 'Tag', type: 'date' }, '2026-12-04')).toBe('04.12.2026');
  });
  it('V104: Feedback ohne Zustand für Anwender – Liste neueste oben, Filter gelten', () => {
    let w: Workspace = W.defaultWorkspace();
    w = Fb.addFeedback(w, { kind: 'bug', title: 'Alt' }, { id: 'a', now: new Date('2026-11-20T10:00:00Z') })!.ws;
    w = Fb.addFeedback(w, { kind: 'wish', title: 'Neu' }, { id: 'b', now: new Date('2026-11-24T10:00:00Z') })!.ws;
    w = Fb.setFeedbackState(w, 'b', 'done');
    expect(Fb.feedbackList(w).map((f) => f.id)).toEqual(['b', 'a']);
    expect(Fb.feedbackList(w, { kinds: ['bug'] }).map((f) => f.id)).toEqual(['a']);
    expect(H.helpById('feedbackCockpit')!.text.startsWith('Im Cockpit')).toBe(true);
    expect(H.helpById('feedbackCockpit')!.text.indexOf('Meine Meldungen')).toBeGreaterThan(-1);
  });
  it('Design-Tour zielt auf die Räder, nicht mehr auf die alten Farbpunkte', () => {
    const d = Tour.TOURS.design;
    expect(d.some((s) => (s.target ?? '').includes('look__swatches'))).toBe(false);
    expect(d.find((s) => s.id === 'accent')?.target).toContain('design__wheel');
    expect(d.some((s) => s.id === 'retro')).toBe(true);
  });
});

describe('F-206 Schritt 10 Projekte (V98)', () => {
  const base = (): Workspace => ({ ...W.defaultWorkspace(), notes: [] }) as Workspace;
  const note = (id: string, extra: Partial<Note> = {}): Note => ({ id, title: id, text: '', state: 'open', trail: [], ...extra }) as Note;
  it('anlegen: Zustand Idee, gleicher Name = dasselbe Projekt, leerer Name nicht', () => {
    const r = Pj.addProject(base(), '  Website  Relaunch ', {}, 5)!;
    expect(Pj.projectsOf(r.ws)).toHaveLength(1);
    expect(Pj.projectById(r.ws, r.id)?.name).toBe('Website Relaunch');
    expect(Pj.projectById(r.ws, r.id)?.state).toBe('idea');
    expect(Pj.addProject(r.ws, 'website relaunch')!.id).toBe(r.id);
    expect(Pj.addProject(r.ws, '   ')).toBeNull();
    expect(Pj.similarProjects(r.ws, 'Website').map((p) => p.id)).toEqual([r.id]);
  });
  it('ändern: Datum geprüft, Priorität 1–5, Steckbrief leert sich, kein Kreis bei Unterprojekten', () => {
    let ws = Pj.addProject(base(), 'A')!.ws;
    const a = Pj.projectsOf(ws)[0].id;
    const rb = Pj.addProject(ws, 'B', { parent: a })!;
    ws = rb.ws;
    ws = Pj.editProject(ws, a, { start: '2026-12-01', end: 'morgen', priority: 9, brief: { goal: 'Ziel', approach: ' ' } });
    const p = Pj.projectById(ws, a)!;
    expect(p.start).toBe('2026-12-01');
    expect(p.end).toBeUndefined();
    expect(p.priority).toBe(5);
    expect(p.brief).toEqual({ goal: 'Ziel' });
    expect(Pj.parentLoops(ws, a, rb.id)).toBe(true);
    expect(Pj.projectById(Pj.editProject(ws, a, { parent: rb.id }), a)?.parent).toBeUndefined();
    expect(Pj.briefGaps(p)).toEqual(['approach', 'org', 'end']);
    expect(Pj.datesClash({ start: '2026-12-02', end: '2026-12-01' })).toBe(true);
  });
  it('Projektliste: Baum, Fortschritt nach Aufwand, Termine aus Vorgängen, überfällig', () => {
    let ws = Pj.addProject(base(), 'A')!.ws;
    const a = Pj.projectsOf(ws)[0].id;
    ws = Pj.addProject(ws, 'A1', { parent: a })!.ws;
    ws = Pj.addProject(ws, 'C')!.ws;
    ws = { ...ws, notes: [note('n1', { project: a, effort: { plan: 6 }, state: 'done', notBefore: '2026-11-02' }), note('n2', { project: a, effort: { plan: 2 }, due: '2026-11-20', milestone: true }), note('n3')] };
    const rows = Pj.projectRows(ws, '2026-11-25');
    expect(rows.map((r) => [r.project.name, r.depth])).toEqual([['A', 0], ['A1', 1], ['C', 0]]);
    const r = rows[0];
    expect([r.tasks, r.done, r.progress, r.effort, r.milestones, r.late]).toEqual([2, 1, 75, 8, 1, 1]);
    expect([r.start, r.end, r.derived.start, r.derived.end]).toEqual(['2026-11-02', '2026-11-20', true, true]);
  });
  it('löschen mit Rückgängig: Vorgänge bleiben, Unterprojekte rücken hoch und kommen zurück', () => {
    let ws = Pj.addProject(base(), 'A')!.ws;
    const a = Pj.projectsOf(ws)[0].id;
    const b = Pj.addProject(ws, 'B', { parent: a })!;
    ws = { ...b.ws, notes: [note('n1', { project: a })] };
    ws = Pj.setNoteProject(ws, 'n1', a);
    const r = Pj.removeProject(ws, a)!;
    expect(Pj.projectsOf(r.ws).map((p) => p.id)).toEqual([b.id]);
    expect(Pj.projectById(r.ws, b.id)?.parent).toBeUndefined();
    expect(r.ws.notes![0].project).toBeUndefined();
    const back = Pj.undoRemoveProject(r.ws, r.undo);
    expect(Pj.projectsOf(back).map((p) => p.id)).toEqual([a, b.id]);
    expect(Pj.projectById(back, b.id)?.parent).toBe(a);
    expect(back.notes![0].project).toBe(a);
    expect(Pj.setNoteProject(back, 'n1', 'gibt-es-nicht')).toBe(back);
  });
});

describe('F-206 Schritt 10 Dateiformat 10 und Kalender (V100)', () => {
  const base = (): Workspace => ({ ...W.defaultWorkspace(), notes: [] }) as Workspace;
  const note = (id: string, extra: Partial<Note> = {}): Note => ({ id, title: id, text: '', state: 'open', trail: [], created: 1, changed: 1, ...extra }) as Note;
  it('Kalender Mo–Fr (K7): Arbeitstage zählen, Wochenende überspringen', () => {
    expect(Sc.isWorkday('2026-11-27')).toBe(true); // Fr
    expect(Sc.isWorkday('2026-11-28')).toBe(false); // Sa
    expect(Sc.workdayFrom('2026-11-28')).toBe('2026-11-30');
    expect(Sc.workdayFrom('2026-11-29', true)).toBe('2026-11-27');
    expect(Sc.addWorkdays('2026-11-27', 1)).toBe('2026-11-30');
    expect(Sc.addWorkdays('2026-11-30', -1)).toBe('2026-11-27');
    expect(Sc.workdaysBetween('2026-11-23', '2026-12-04')).toBe(10);
    expect(Sc.workdaysBetween('2026-12-04', '2026-11-23')).toBe(0);
    expect(Sc.endOf('2026-11-26', 3)).toBe('2026-11-30');
    expect(Sc.endOf('2026-11-28', 0)).toBe('2026-11-30');
  });
  it('Dauer (K1): Feld, sonst Abstand nicht vor → fällig, sonst 1 Tag; Meilenstein 0', () => {
    expect(Sc.durationInfo({ duration: 4 })).toEqual({ days: 4, from: 'set' });
    expect(Sc.durationInfo({ notBefore: '2026-11-23', due: '2026-11-27' })).toEqual({ days: 5, from: 'dates' });
    expect(Sc.durationInfo({})).toEqual({ days: 1, from: 'default' });
    expect(Sc.durationInfo({ milestone: true, duration: 3 })).toEqual({ days: 0, from: 'milestone' });
    expect(Sc.parseDurationInput('3 Tage')).toBe(3);
    expect(Sc.parseDurationInput('2,6')).toBe(3);
    expect(Sc.parseDurationInput('')).toBeNull();
    expect(Sc.parseDurationInput('viel')).toBeUndefined();
  });
  it('Planung setzen (K1/K2): Meilenstein nimmt Dauer, Dauer nimmt Meilenstein, manuell an/aus', () => {
    let ws = { ...base(), notes: [note('n1')] } as Workspace;
    ws = Sc.setTaskPlan(ws, 'n1', { duration: 3, manual: true }, 9);
    expect(ws.notes![0]).toMatchObject({ duration: 3, manual: true, changed: 9 });
    ws = Sc.setTaskPlan(ws, 'n1', { milestone: true });
    expect(ws.notes![0].duration).toBeUndefined();
    expect(ws.notes![0].milestone).toBe(true);
    ws = Sc.setTaskPlan(ws, 'n1', { duration: 2, manual: false });
    expect(ws.notes![0].milestone).toBeUndefined();
    expect(ws.notes![0].manual).toBeUndefined();
    expect(Sc.setTaskPlan(ws, 'n1', { duration: 2 })).toBe(ws);
  });
  it('Speicher (Dateiformat 10): duration, manual, baseline, order kommen an; Fremdes fällt weg', () => {
    const raw = {
      ...base(),
      notes: [note('n1', { duration: 2.4, manual: true } as Partial<Note>), note('n2', { duration: -1 } as Partial<Note>)],
      projects: [
        {
          id: 'pj-a', name: 'A', created: 1, changed: 1,
          baseline: { at: '2026-11-25T10:00:00.000Z', start: '2026-12-01', budget: 500, tasks: { n1: { start: '2026-12-01', end: '2026-12-02', duration: 2, effort: 8 }, alt: { cost: 10 }, leer: { start: 'x' } } },
          order: { '': ['n2', 'n1', 'n1', 'pj-b', 'weg'], n1: ['n2'], weg: ['n1'] },
        },
        { id: 'pj-b', name: 'B', parent: 'pj-a', created: 1, changed: 1, baseline: { at: 'kaputt', tasks: {} } },
      ],
    };
    const ws = parseWorkspace(JSON.parse(JSON.stringify(raw)))!;
    expect(ws.notes![0].duration).toBe(2);
    expect(ws.notes![0].manual).toBe(true);
    expect(ws.notes![1].duration).toBeUndefined();
    const a = ws.projects!.find((p) => p.id === 'pj-a')!;
    expect(a.baseline!.tasks).toEqual({ n1: { start: '2026-12-01', end: '2026-12-02', duration: 2, effort: 8 }, alt: { cost: 10 } });
    expect(a.baseline!.budget).toBe(500);
    expect(a.order).toEqual({ '': ['n2', 'n1', 'pj-b'] });
    expect(ws.projects!.find((p) => p.id === 'pj-b')!.baseline).toBeUndefined();
    const r = X.readTransferFile(JSON.stringify(X.toTransferFile(ws, 'Mac')));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.file.workspace.projects!.find((p) => p.id === 'pj-a')!.order).toEqual(a.order);
  });
});

describe('F-206 Schritt 10 PSP (V100, K6)', () => {
  const base = (): Workspace => ({ ...W.defaultWorkspace(), notes: [] }) as Workspace;
  const note = (id: string, extra: Partial<Note> = {}): Note => ({ id, title: id, text: '', state: 'open', trail: [], created: 1, changed: 1, ...extra }) as Note;
  const setup = () => {
    let ws = Pj.addProject(base(), 'Web', { psp: { prefix: 'WEB' } })!.ws;
    const a = Pj.projectsOf(ws)[0].id;
    const rb = Pj.addProject(ws, 'Shop', { parent: a })!;
    ws = rb.ws;
    ws = { ...ws, notes: [note('t1', { project: a, effort: { plan: 2 } }), note('t2', { project: a }), note('t3', { project: a, parent: 't1', effort: { plan: 3 } }), note('s1', { project: rb.id }), note('x', {})] };
    return { ws, a, b: rb.id };
  };
  const codes = (ws: Workspace, a: string) => Psp.pspRows(Psp.pspTree(ws, a)).map((n) => `${n.code} ${n.id}`);
  it('Baum und Code aus Präfix + Stelle, Teilprojekt mit eigenen Vorgängen, Aufwand rollt hoch', () => {
    const { ws, a } = setup();
    expect(codes(ws, a)).toEqual(['WEB-1 t1', 'WEB-1.1 t3', 'WEB-2 t2', `WEB-3 ${Pj.projectsOf(ws)[1].id}`, 'WEB-3.1 s1']);
    expect(Psp.pspTree(ws, a)[0]).toMatchObject({ summary: true, effort: 5 });
    expect(Psp.pspSegment(1, 0, 'alpha')).toBe('B');
    expect(Psp.pspSegment(27, 0, 'alpha')).toBe('AB');
    expect([0, 1, 2].map((d) => Psp.pspSegment(0, d, 'mixed'))).toEqual(['A', '1', 'a']);
    expect(Psp.withPrefix('P.', '1')).toBe('P.1');
  });
  it('verschieben ändert nur order, nicht die Reihenfolge der Notizen; Unbekanntes wird übersprungen', () => {
    const { ws, a } = setup();
    const m = Psp.movePsp(ws, a, 't2', -1, 7);
    expect(codes(m, a).slice(0, 3)).toEqual(['WEB-1 t2', 'WEB-2 t1', 'WEB-2.1 t3']);
    expect(m.notes!.map((n) => n.id)).toEqual(ws.notes!.map((n) => n.id));
    expect(Pj.projectById(m, a)!.order).toEqual({ '': ['t2', 't1', Pj.projectsOf(ws)[1].id] });
    expect(Psp.movePsp(m, a, 't2', -1)).toBe(m);
    expect(Psp.ordered(['a', 'b', 'c'], ['c', 'weg', 'a'])).toEqual(['c', 'a', 'b']);
  });
  it('tiefer und höher stufen; unter ein Teilprojekt wechselt das Projekt', () => {
    const { ws, a, b } = setup();
    const r = Psp.indentPsp(ws, a, 't2');
    expect(r.ok && r.ws.notes!.find((n) => n.id === 't2')!.parent).toBe('t1');
    if (!r.ok) return;
    expect(codes(r.ws, a).slice(0, 3)).toEqual(['WEB-1 t1', 'WEB-1.1 t3', 'WEB-1.2 t2']);
    const o = Psp.outdentPsp(r.ws, a, 't3');
    expect(o.ok && codes(o.ws, a).slice(0, 3)).toEqual(['WEB-1 t1', 'WEB-1.1 t2', 'WEB-2 t3']);
    expect(Psp.indentPsp(ws, a, 't1')).toEqual({ ok: false, reason: 'first' });
    expect(Psp.outdentPsp(ws, a, 't1')).toEqual({ ok: false, reason: 'top' });
    expect(Psp.indentPsp(ws, a, b)).toEqual({ ok: false, reason: 'project' });
    const m = Psp.movePsp(ws, a, b, -1);
    const into = Psp.indentPsp(Psp.movePsp(m, a, 't2', 5), a, 't2');
    expect(into.ok && into.ws.notes!.find((n) => n.id === 't2')!.project).toBe(b);
  });
  it('neuer Vorgang hinter dem gewählten bzw. darunter', () => {
    const { ws, a } = setup();
    const r = Psp.addPspTask(ws, a, 'Konzept', { id: 'k', after: 't1' })!;
    expect(codes(r.ws, a).slice(0, 4)).toEqual(['WEB-1 t1', 'WEB-1.1 t3', 'WEB-2 k', 'WEB-3 t2']);
    expect(r.ws.notes!.find((n) => n.id === 'k')!.project).toBe(a);
    const u = Psp.addPspTask(r.ws, a, 'Text', { id: 'u', under: 't1' })!;
    expect(codes(u.ws, a).slice(0, 3)).toEqual(['WEB-1 t1', 'WEB-1.1 t3', 'WEB-1.2 u']);
    expect(Psp.addPspTask(ws, a, '  ')).toBeNull();
  });
});

describe('V141 FUTURE-P.ROOF entfernt', () => {
  it('ein noch vorhandenes Logistik-Beispiel fällt beim Laden weg, ColorGentlemen bleibt', () => {
    let ws = Sm.toggleSample({ ...W.defaultWorkspace(), notes: [] } as Workspace, 'cg', true);
    ws = { ...ws, projects: [...(ws.projects ?? []), { id: 'pj-fp', name: 'FUTURE-P.ROOF', created: 1, changed: 1 } as never], notes: [...(ws.notes ?? []), { id: 'fp-1', title: 'x', text: '', state: 'open', project: 'pj-fp', trail: [], created: 1, changed: 1 } as never] };
    const out = Sm.dropRetiredSamples(ws);
    expect((out.projects ?? []).some((p) => p.id === 'pj-fp')).toBe(false);
    expect(out.notes!.some((n) => n.id.startsWith('fp-'))).toBe(false);
    expect(Sm.hasSample(out, 'cg')).toBe(true);
    expect(Sm.dropRetiredSamples(out)).toBe(out);
    expect(Sm.SAMPLES.map((x) => x.key)).toEqual(['cg']);
  });
});

describe('F-206 Schritt 10 Beispielprojekt ColorGentlemen (V100)', () => {
  const base = (): Workspace => ({ ...W.defaultWorkspace(), notes: [] }) as Workspace;
  it('legt Projekt, 39 Vorgänge mit Vorgängern und PSP-Codes wie im Report an und entfernt sie ganz', () => {
    const ws = Sp.addSampleProject(base(), 5);
    expect(Sp.hasSampleProject(ws)).toBe(true);
    expect(Pj.tasksOfProject(ws, Sp.SAMPLE_PROJECT)).toHaveLength(39);
    const rows = Psp.pspRows(Psp.pspTree(ws, Sp.SAMPLE_PROJECT));
    expect(rows.find((r) => r.id === 'cg-31')!.code).toBe('CG-1.6.4');
    expect(rows.find((r) => r.id === 'cg-2')!.effort).toBe(830);
    const n8 = ws.notes!.find((n) => n.id === 'cg-8')!;
    expect(n8.after).toEqual([{ id: 'cg-4', rel: 'EA' }, { id: 'cg-5', rel: 'EA' }, { id: 'cg-6', rel: 'EA' }, { id: 'cg-26', rel: 'AA' }]);
    expect(Sp.parsePreds('10EA+1 t')).toEqual([{ id: 'cg-10', rel: 'EA', lag: 1 }]);
    expect(ws.notes!.find((n) => n.id === 'cg-32')).toMatchObject({ milestone: true, notBefore: '2026-12-01' });
    expect(Sp.addSampleProject(ws)).toBe(ws);
    const r = parseWorkspace(JSON.parse(JSON.stringify(ws)))!;
    expect(Pj.tasksOfProject(r, Sp.SAMPLE_PROJECT)).toHaveLength(39);
    const gone = Sp.removeSampleProject(ws);
    expect(gone.notes).toHaveLength(0);
    expect(Sp.hasSampleProject(gone)).toBe(false);
    expect((gone.persons ?? []).some((p) => p.id.startsWith('pn-cg-'))).toBe(false);
  });
  it('V108: Inhalte aus dem Report – Instanzen, Abnahmekriterien, Ist-Werte, Verfügbarkeit, Steckbrief', () => {
    const ws = Sp.addSampleProject(base(), 5);
    const p = ws.projects!.find((x) => x.id === Sp.SAMPLE_PROJECT)!;
    expect(Pj.roleOf(p, 'client')!.person).toBe('pn-cg-meier');
    expect(Pj.roleOf(p, 'steering')).toBeUndefined();
    const n = (id: string) => ws.notes!.find((x) => x.id === id)!;
    expect(n('cg-31').effort).toEqual({ actual: 198 }); // V110: Plan aus den Einsätzen (295 Ph, siehe gpm.test)
    expect(n('cg-31').cost).toEqual({ actual: 6920 });
    expect(n('cg-37').accept!.map((c) => !!c.ok)).toEqual([true, true]);
    expect(n('cg-38').accept![0].ok).toBeUndefined();
    expect(ws.persons!.find((x) => x.id === 'pn-cg-lm')!.away).toEqual([{ from: '2026-12-01', to: '2027-02-25', why: 'noch nicht eingestellt (ab M3)' }]);
    // V109 (F-226): Ziele stehen jetzt als Objekte, nicht mehr im Steckbrief-Text
    expect(p.goals!.find((g) => g.code === 'L2.2')!.text).toBe('Prozesse festgelegt');
    expect(n('cg-c1').change).toMatchObject({ state: 'approved', decider: 'client' });
    const r = parseWorkspace(JSON.parse(JSON.stringify(ws)))!;
    expect(r.notes!.find((x) => x.id === 'cg-37')!.accept).toEqual(n('cg-37').accept);
    expect(r.persons!.find((x) => x.id === 'pn-cg-lm')!.away).toEqual(ws.persons!.find((x) => x.id === 'pn-cg-lm')!.away);
    expect(r.projects!.find((x) => x.id === Sp.SAMPLE_PROJECT)!.roles).toEqual(p.roles);
  });
});

describe('F-206 Schritt 10 Gantt (V101)', () => {
  const base = (): Workspace => ({ ...W.defaultWorkspace(), notes: [] }) as Workspace;
  const note = (id: string, extra: Partial<Note> = {}): Note => ({ id, title: id, text: '', state: 'open', trail: [], created: 1, changed: 1, ...extra }) as Note;
  const proj = (notes: Note[], start?: string) => {
    const r = Pj.addProject(base(), 'Bau', start ? { start } : {})!;
    return { ws: { ...r.ws, notes: notes.map((n) => ({ ...n, project: r.id })) } as Workspace, pj: r.id };
  };
  it('zählt Arbeitstage fortlaufend (Sa/So = nächster Montag)', () => {
    expect(Sc.workdayNo('2026-11-30') - Sc.workdayNo('2026-11-23')).toBe(5);
    expect(Sc.workdayNo('2026-11-28')).toBe(Sc.workdayNo('2026-11-30'));
    expect(Sc.dayOfWorkdayNo(Sc.workdayNo('2027-06-22'))).toBe('2027-06-22');
    expect(Sc.dayOfWorkdayNo(Sc.workdayNo('2026-12-04') + 1)).toBe('2026-12-07');
  });
  it('rechnet ColorGentlemen: kritischer Pfad wie im Report (Abb. 13), Ende ohne Feiertage 6 Tage früher', () => {
    const ws = Sp.addSampleProject(base(), 5);
    const g = Gt.ganttOf(ws, Sp.SAMPLE_PROJECT, '2026-11-25');
    expect(g.start).toBe('2026-12-01');
    expect(g.end).toBe('2027-06-22');
    expect(g.critical).toEqual(['cg-32', 'cg-3', 'cg-10', 'cg-34', 'cg-11', 'cg-13', 'cg-24', 'cg-25', 'cg-26', 'cg-8', 'cg-40']);
    expect(g.byId.get('cg-34')).toMatchObject({ start: '2026-12-31', critical: true });
    expect(g.byId.get('cg-11')!.start).toBe('2027-01-01');
    expect(g.byId.get('cg-7')).toMatchObject({ float: 8, critical: false });
    expect(g.byId.get('cg-2')).toMatchObject({ start: '2026-12-01', end: '2027-06-22', critical: true });
    expect(g.late).toEqual([]);
    expect(g.loops).toEqual([]);
    expect(Gt.predsText(g.byId.get('cg-8')!.preds)).toBe('3; 4; 5; 25AA');
    expect(g.arrows.filter((a) => a.critical).length).toBeGreaterThan(8);
  });
  it('EA/AA/EE/AE mit Abstand, „nicht beginnen vor“, manuell und Stichtag (K3)', () => {
    const { ws, pj } = proj([
      note('a', { duration: 5 }),
      note('b', { duration: 2, after: [{ id: 'a', rel: 'EA', lag: 1 }] }),
      note('c', { duration: 3, after: [{ id: 'a', rel: 'AA', lag: 2 }] }),
      note('d', { duration: 2, after: [{ id: 'a', rel: 'EE' }], due: '2026-12-03' }),
      note('e', { duration: 1, after: [{ id: 'a', rel: 'AE' }], notBefore: '2026-12-09' }),
      note('f', { duration: 2, manual: true, notBefore: '2026-12-01', after: [{ id: 'b', rel: 'EA' }] }),
    ], '2026-11-30');
    const g = Gt.ganttOf(ws, pj);
    expect(g.byId.get('a')).toMatchObject({ start: '2026-11-30', end: '2026-12-04' });
    expect(g.byId.get('b')).toMatchObject({ start: '2026-12-08', end: '2026-12-09' });
    expect(g.byId.get('c')!.start).toBe('2026-12-02');
    expect(g.byId.get('d')).toMatchObject({ start: '2026-12-03', end: '2026-12-04', late: true });
    expect(g.byId.get('e')!.start).toBe('2026-12-09');
    expect(g.byId.get('f')).toMatchObject({ start: '2026-12-01', manual: true, conflict: '2026-12-10' });
    expect(g.late).toEqual(['d']);
  });
  it('Sammelvorgang gibt Vorgänger weiter, Kreis wird gemeldet statt zu hängen', () => {
    let { ws, pj } = proj([note('x', { duration: 3 }), note('s', { after: [{ id: 'x', rel: 'EA' }] }), note('k', { parent: 's', duration: 2 })], '2026-11-30');
    let g = Gt.ganttOf(ws, pj);
    expect(g.byId.get('k')!.start).toBe('2026-12-03');
    expect(g.byId.get('s')).toMatchObject({ start: '2026-12-03', end: '2026-12-04' });
    ws = { ...ws, notes: ws.notes!.map((n) => (n.id === 'x' ? { ...n, after: [{ id: 'k', rel: 'EA' as const }] } : n)) };
    g = Gt.ganttOf(ws, pj);
    expect(g.loops.length).toBeGreaterThan(0);
    expect(g.rows).toHaveLength(3);
  });
  it('liest und setzt Vorgänger wie MS Project (Nr., Art, Abstand), verhindert Kreis und Sammelvorgang', () => {
    let { ws, pj } = proj([note('a'), note('b'), note('c'), note('k', { parent: 'c' })]);
    const rows = Gt.ganttOf(ws, pj).rows;
    expect(rows.map((r) => r.nr)).toEqual([1, 2, 3, 4]);
    const inp = Gt.parsePredInput('1; 2aa+2, 9, 2 SS -1', rows);
    expect(inp.links).toEqual([{ id: 'a', rel: 'EA', lag: 0 }, { id: 'b', rel: 'AA', lag: -1 }]);
    expect(inp.bad).toEqual(['9']);
    const r = Gt.setPreds(ws, pj, 'c', inp.links);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    ws = r.ws;
    expect(ws.notes!.find((n) => n.id === 'c')!.after).toEqual([{ id: 'a', rel: 'EA' }, { id: 'b', rel: 'AA', lag: -1 }]);
    expect(Gt.predText({ nr: 7, rel: 'EA', lag: 1 })).toBe('7EA+1');
    expect(Gt.setPreds(ws, pj, 'a', [{ id: 'c', rel: 'EA', lag: 0 }])).toMatchObject({ ok: false, reason: 'circle' });
    expect(Gt.setPreds(ws, pj, 'k', [{ id: 'c', rel: 'EA', lag: 0 }])).toMatchObject({ ok: false, reason: 'family' });
    const cleared = Gt.setPreds(ws, pj, 'c', []);
    expect(cleared.ok && cleared.ws.notes!.find((n) => n.id === 'c')!.after).toBeUndefined();
  });
});

describe('F-221 Feedback (V102, FB1–FB12)', () => {
  const now = new Date('2026-12-07T09:30:00');
  const quick = (ws: Workspace, id: string, title: string, kind: Fb.NewFeedback['kind'] = 'bug', extra: Partial<Fb.NewFeedback> = {}) =>
    Fb.addFeedback(ws, { kind, title, ...extra }, { id, now })!.ws;

  it('schnell erfassen: Titel + Art, Ort und Umgebung automatisch; leerer Titel geht nicht', () => {
    const ws0 = W.defaultWorkspace();
    expect(Fb.addFeedback(ws0, { kind: 'bug', title: '   ' }, { id: 'f1' })).toBeNull();
    expect(Fb.addFeedback(ws0, { kind: 'nix' as never, title: 'x' }, { id: 'f1' })).toBeNull();
    const env = Fb.envOf({ ua: 'Mozilla/5.0 (Macintosh) AppleWebKit Version/18.1 Safari/605', screen: { w: 1440, h: 900 }, win: { w: 1280.4, h: 800 }, device: 'Mac' });
    expect(env).toEqual({ version: Fb.APP_VERSION, device: 'Mac', browser: 'Safari 18', screen: '1440 × 900', window: '1280 × 800' });
    const r = Fb.addFeedback(ws0, { kind: 'bug', title: '  Rad   springt  ', place: { mode: 'Projekte', view: 'Gantt', menu: ' ', desk: '' }, env }, { id: 'f1', now })!;
    const f = Fb.feedbackById(r.ws, 'f1')!;
    expect(f).toMatchObject({ title: 'Rad springt', state: 'new', kind: 'bug', place: { mode: 'Projekte', view: 'Gantt', desk: '' } });
    expect(f.place!.menu).toBeUndefined();
    expect(f.at).toBe(now.toISOString());
    expect(Fb.addFeedback(r.ws, { kind: 'wish', title: 'x' }, { id: 'f1' })).toBeNull();
    expect(Fb.newCount(r.ws)).toBe(1);
    expect(Fb.browserOf('Mozilla/5.0 Chrome/131.0 Safari/537')).toBe('Chrome 131');
    expect(Fb.browserOf('Mozilla/5.0 Firefox/133.0')).toBe('Firefox 133');
  });

  it('ausarbeiten: Felder, „noch offen“, Bezüge, Bilder, Melden einfach 1–5', () => {
    let ws = quick(W.defaultWorkspace(), 'f1', 'Gantt Pfeile fehlen');
    expect(Fb.missingOf(Fb.feedbackById(ws, 'f1')!)).toEqual(['what', 'steps', 'expected', 'actual', 'severity']);
    ws = Fb.editFeedback(ws, 'f1', { what: ' Pfeile weg ', steps: '1. Gantt\r\n2. Monate', severity: 'hinders', refs: ['f 206', 'Unsinn', 'F-206'], pics: ['p1', 'p1', 'p2'], ease: 4 }, now);
    let f = Fb.feedbackById(ws, 'f1')!;
    expect(f).toMatchObject({ what: 'Pfeile weg', steps: '1. Gantt\n2. Monate', severity: 'hinders', refs: ['F-206'], pics: ['p1', 'p2'], ease: 4, changed: now.toISOString() });
    expect(Fb.missingOf(f)).toEqual(['expected', 'actual']);
    ws = Fb.editFeedback(ws, 'f1', { what: '', ease: 9, severity: undefined });
    f = Fb.feedbackById(ws, 'f1')!;
    expect(f.what).toBeUndefined();
    expect(f.ease).toBeUndefined();
    expect(f.severity).toBeUndefined();
    expect(Fb.editFeedback(ws, 'f1', { title: '  ' })).toBe(ws);
    expect(Fb.editFeedback(ws, 'nix', { what: 'x' })).toBe(ws);
    expect(Fb.missingOf({ ...f, kind: 'praise' })).toEqual([]);
    expect(Fb.parseRefs('F-206, f221; NF 8 Quatsch')).toEqual({ refs: ['F-206', 'F-221', 'NF-08'], bad: ['Quatsch'] });
  });

  it('Zustand mit Spur, Vermerke, Entscheidung, behoben in Vxx', () => {
    let ws = quick(W.defaultWorkspace(), 'f1', 'Suche langsam', 'wish');
    ws = Fb.setFeedbackState(ws, 'f1', 'seen', { now });
    ws = Fb.setFeedbackState(ws, 'f1', 'seen', { now });
    ws = Fb.setFeedbackState(ws, 'f1', 'dropped', { now, why: ' doppelt ' });
    ws = Fb.addMark(ws, 'f1', 'decision', 'Wird mit F-189 gelöst', { now, by: 'Enrico' });
    ws = Fb.addMark(ws, 'f1', 'ref', 'F-189', { now });
    ws = Fb.addMark(ws, 'f1', 'note', '   ', { now });
    ws = Fb.editFeedback(ws, 'f1', { fixedIn: 'v103' }, now);
    const f = Fb.feedbackById(ws, 'f1')!;
    expect(f.state).toBe('dropped');
    expect(f.decision).toBe('Wird mit F-189 gelöst');
    expect(f.refs).toEqual(['F-189']);
    expect(f.fixedIn).toBe('V103');
    expect(f.marks!.map((m) => [m.kind, m.text])).toEqual([
      ['state', 'new → seen'], ['state', 'seen → dropped: doppelt'], ['decision', 'Wird mit F-189 gelöst'], ['ref', 'F-189'], ['fixed', 'V103'],
    ]);
    expect(f.marks![2].by).toBe('Enrico');
  });

  it('ähnliche Meldungen, Filter und Board (blockiert zuerst), Löschen mit Rückgängig', () => {
    let ws = quick(W.defaultWorkspace(), 'a', 'Gantt Pfeile verschwinden beim Scrollen');
    ws = quick(ws, 'b', 'Kanban Karte springt', 'bug', { severity: 'blocks' });
    ws = quick(ws, 'c', 'Mehr Farben', 'wish');
    ws = quick(ws, 'd', 'Pfeile im Gantt verschwinden', 'bug', { severity: 'minor' });
    expect(Fb.similarFeedback(ws, 'Pfeile verschwinden', 'd').map((f) => f.id)).toEqual(['a']);
    expect(Fb.similarFeedback(ws, 'ab')).toEqual([]);
    const board = Fb.feedbackBoard(ws);
    expect(board.map((c) => c.state)).toEqual(['new', 'seen', 'planned', 'done', 'dropped']);
    expect(board[0].items.map((f) => f.id)).toEqual(['b', 'd', 'a', 'c']);
    expect(Fb.feedbackBoard(ws, { kinds: ['wish'] })[0].items.map((f) => f.id)).toEqual(['c']);
    expect(Fb.feedbackBoard(ws, { severities: ['blocks'] })[0].items.map((f) => f.id)).toEqual(['b']);
    expect(Fb.feedbackBoard(ws, { q: 'pfeile gantt' })[0].items.map((f) => f.id).sort()).toEqual(['a', 'd']);
    ws = Fb.editFeedback(ws, 'd', { related: ['a', 'd'] });
    expect(Fb.feedbackById(ws, 'd')!.related).toEqual(['a']);
    const r = Fb.removeFeedback(ws, 'a')!;
    expect(Fb.feedbackById(r.ws, 'd')!.related).toBeUndefined();
    const back = Fb.undoRemoveFeedback(r.ws, r.undo);
    expect(Fb.feedbackOf(back).map((f) => f.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(Fb.feedbackById(back, 'd')!.related).toEqual(['a']);
    expect(Fb.removeFeedback(ws, 'nix')).toBeNull();
    const all = ['a', 'b', 'c', 'd'].reduce((w, id) => Fb.removeFeedback(w, id)!.ws, ws);
    expect(all.feedback).toBeUndefined();
  });

  it('„War das Melden einfach?“ abschaltbar (FB12)', () => {
    let ws = W.defaultWorkspace();
    expect(Fb.askEase(ws)).toBe(true);
    ws = Fb.setAskEase(ws, false);
    expect(ws.feedbackPrefs).toEqual({ askEase: false });
    expect(Fb.askEase(ws)).toBe(false);
    expect(Fb.setAskEase(ws, true).feedbackPrefs).toBeUndefined();
  });

  it('Ausgabe als Markdown (Problemstellung) und JSON, wahlweise nur Neue (FB10)', () => {
    let ws = quick(W.defaultWorkspace(), 'a', 'Pfeile fehlen', 'bug', { place: { mode: 'Projekte', view: 'Gantt', desk: '' }, env: { version: 'V102', device: 'Mac' } });
    ws = Fb.editFeedback(ws, 'a', { what: 'Keine Pfeile', expected: 'Pfeile', actual: 'leer', severity: 'blocks', goals: 'Pfeile sichtbar', guess: 'SVG zu klein', refs: ['F-206'] }, now);
    ws = quick(ws, 'b', 'Schön!', 'praise');
    ws = Fb.setFeedbackState(ws, 'b', 'done', { now });
    const md = Fb.feedbackFileMarkdown(ws, { now });
    expect(md).toContain('# Feedback E-Sources');
    expect(md).toContain('2 Meldungen');
    expect(md).toContain('Neu 1 · Erledigt 1');
    expect(md).toContain('## Fehler: Pfeile fehlen');
    expect(md).toContain('- **Ort:** Modus Projekte · Ansicht Gantt · Main Desk — V102 · Mac');
    for (const h of ['### Anlass & Kontext', '### Hintergrund', '### Lösungsansatz', '### Relevanz', '### Hypothesen', '### Vermerke zur Weiterverarbeitung'])
      expect(md).toContain(h);
    expect(md).toContain('**Schweregrad:** blockiert');
    expect(md).toContain('Zustand Neu → Erledigt');
    const onlyNew = Fb.feedbackFileMarkdown(ws, { now, onlyNew: true });
    expect(onlyNew).toContain('1 Meldung (nur neue)');
    expect(onlyNew.includes('Schön!')).toBe(false);
    const js = JSON.parse(Fb.feedbackFileJson(ws, { now, onlyNew: true }));
    expect(js).toMatchObject({ format: 'e-sources-feedback', version: 1, onlyNew: true });
    expect(js.feedback.map((f: { id: string }) => f.id)).toEqual(['a']);
    expect(Fb.feedbackFileName(now, 'md')).toBe('Feedback-2026-12-07-0930.md');
  });

  it('Dateiformat 11: Feedback und Räder überstehen Speichern und Laden, Unbrauchbares fällt weg', () => {
    let ws = quick(W.defaultWorkspace(), 'a', 'Eins');
    ws = quick(ws, 'b', 'Zwei', 'question');
    ws = Fb.editFeedback(ws, 'b', { related: ['a'], ease: 5, fixedIn: 'V104' });
    ws = Fb.setFeedbackState(ws, 'a', 'planned', { now });
    ws = { ...ws, feedbackPrefs: { askEase: false }, wheels: { cockpit: { pinned: ['kanban'], hidden: ['kanban', 'rules'], auto: false, order: ['kanban', 'todo'] } } };
    const file = X.toTransferFile(ws, 'Mac', now);
    expect(file.version).toBe(13);
    const r = X.readTransferFile(JSON.stringify(file));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const back = r.file.workspace;
    expect(back.feedback).toEqual(ws.feedback);
    expect(back.feedbackPrefs).toEqual({ askEase: false });
    expect(back.wheels).toEqual({ cockpit: { pinned: ['kanban'], hidden: ['rules'], auto: false, order: ['kanban', 'todo'] } });
    const bad = Fb.parseFeedback([
      { id: 'x', kind: 'bug', title: 'ok', at: 'gestern' },
      { id: 'y', kind: 'lob', title: 'ok', at: now.toISOString() },
      { id: 'z', kind: 'wish', title: 'ok', at: now.toISOString(), state: 'irgendwas', related: ['weg', 'z'], ease: 7, severity: 'hoch', refs: ['F-1', 'xx'], marks: [{ at: 'nie', kind: 'note', text: 'x' }, { at: now.toISOString(), kind: 'note', text: 'gut' }] },
      { id: 'z', kind: 'wish', title: 'doppelt', at: now.toISOString() },
    ]);
    expect(bad).toEqual([{ id: 'z', kind: 'wish', title: 'ok', at: now.toISOString(), state: 'new', refs: ['F-01'], marks: [{ at: now.toISOString(), kind: 'note', text: 'gut' }] }]);
    expect(Fb.parseWheels({ a: { pinned: 'x' }, '': { pinned: ['y'] }, b: { auto: true } })).toBeUndefined();
    const plain = parseWorkspace(JSON.parse(JSON.stringify(W.defaultWorkspace())))!;
    expect(plain.feedback).toBeUndefined();
    expect(plain.wheels).toBeUndefined();
  });
});

describe('F-222 Entscheidungen (V103, N1–N12, Dateiformat 11)', () => {
  const now = new Date('2026-11-25T18:00:00Z');
  const base = (): import('./types').Decision => ({
    id: 'd1',
    title: 'Neue Wohnung',
    state: 'draft',
    at: now.toISOString(),
    criteria: [
      { id: 'k1', name: 'Miete', weight: 50 },
      { id: 'k2', name: 'Lage', weight: 30 },
      { id: 'k3', name: 'Größe', weight: 20 },
      { id: 'k4', name: 'Balkon', must: true },
    ],
    options: [
      { id: 'a', name: 'Altona' },
      { id: 'b', name: 'Barmbek' },
      { id: 'c', name: 'Eimsbüttel', fails: ['k4'] },
    ],
    scores: [
      { c: 'k1', o: 'a', v: 4 }, { c: 'k2', o: 'a', v: 9 }, { c: 'k3', o: 'a', v: 6 },
      { c: 'k1', o: 'b', v: 8 }, { c: 'k2', o: 'b', v: 5 },
      { c: 'k1', o: 'c', v: 10 }, { c: 'k2', o: 'c', v: 10 }, { c: 'k3', o: 'c', v: 10 },
    ],
  });

  it('rechnet Nutzwert, Rangliste, Muss-Kriterium und Sieger', () => {
    const r = Dc.ranking(base());
    expect(r.map((x) => [x.option.id, x.total, x.rank, x.out, x.missing])).toEqual([
      ['a', 590, 1, false, 0],
      ['b', 550, 2, false, 1],
      ['c', 1000, undefined, true, 0],
    ]);
    expect(r[0].parts).toEqual([{ c: 'k1', points: 200 }, { c: 'k2', points: 270 }, { c: 'k3', points: 120 }]);
    expect(Dc.winner(base())?.id).toBe('a');
    expect(Dc.needsWhy(base(), 'a')).toBe(false);
    expect(Dc.needsWhy(base(), 'b')).toBe(true);
    const tie = { ...base(), scores: [{ c: 'k1', o: 'a', v: 5 }, { c: 'k1', o: 'b', v: 5 }] };
    expect(Dc.ranking(tie).filter((x) => x.rank === 1).length).toBe(2);
    expect(Dc.winner(tie)).toBeNull();
    expect(Dc.weightSum(base())).toBe(100);
  });

  it('Paarvergleich 2 · 1 · 0 und „auf 100 % verteilen“', () => {
    const c = base().criteria.slice(0, 3);
    expect(Dc.pairWeights(c.slice(0, 1))).toBeNull();
    // ohne Angaben alles gleich
    expect(Dc.pairWeights(c)).toEqual({ k1: 33.4, k2: 33.3, k3: 33.3 });
    // k1 wichtiger als k2 und k3, k2 gleich k3: 4 · 1 · 1 von 6
    expect(Dc.pairWeights(c, { 'k1|k2': 2, 'k1|k3': 2, 'k2|k3': 1 })).toEqual({ k1: 66.6, k2: 16.7, k3: 16.7 });
    expect(Dc.normalizeWeights([{ id: 'x', name: 'x', weight: 30 }, { id: 'y', name: 'y', weight: 10 }])).toEqual({ x: 75, y: 25 });
    expect(Dc.normalizeWeights([{ id: 'x', name: 'x' }, { id: 'y', name: 'y' }])).toEqual({ x: 50, y: 50 });
  });

  it('Dateiformat 11 – decisions hin und zurück, Unbrauchbares fällt weg', () => {
    const d = { ...base(), pairs: { 'k1|k2': 2 as const }, links: [{ kind: 'note' as const, id: 'n1' }], marks: [{ at: now.toISOString(), text: 'angelegt' }] };
    const ws = { ...W.defaultWorkspace(), decisions: [d] };
    const file = X.toTransferFile(ws, 'Mac', now);
    expect(file.version).toBe(13);
    const r = X.readTransferFile(JSON.stringify(file));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.file.workspace.decisions).toEqual([d]);
    const bad = Dc.parseDecisions([
      { id: 'x', title: 'ohne Zeit', at: 'nie', criteria: [], options: [] },
      {
        id: 'y', title: 'Rest', at: now.toISOString(), state: 'fertig', projectId: 'fehlt',
        criteria: [{ id: 'k', name: 'K', weight: 140 }, { id: 'k', name: 'doppelt' }, { id: 'l', name: '  ' }, { id: 'm', name: 'M' }],
        options: [{ id: 'o', name: 'O', fails: ['weg', 'k'], links: [{ kind: 'note', id: 'n' }, { kind: 'note', id: 'n' }, { kind: 'x', id: 'z' }] }],
        scores: [{ c: 'k', o: 'o', v: 7.6 }, { c: 'k', o: 'o', v: 3 }, { c: 'k', o: 'weg', v: 1 }, { c: 'm', o: 'o', v: 11 }],
        pairs: { 'm|k': 2, 'k|m': 0, 'k|m|x': 1 },
        chosen: 'weg',
      },
    ], new Set(['p1']));
    expect(bad).toEqual([{
      id: 'y', title: 'Rest', state: 'draft', at: now.toISOString(),
      criteria: [{ id: 'k', name: 'K' }, { id: 'm', name: 'M' }],
      options: [{ id: 'o', name: 'O', fails: ['k'], links: [{ kind: 'note', id: 'n' }] }],
      scores: [{ c: 'k', o: 'o', v: 8 }],
      pairs: { 'k|m': 0 },
    }]);
    const plain = parseWorkspace(JSON.parse(JSON.stringify(W.defaultWorkspace())))!;
    expect(plain.decisions).toBeUndefined();
  });
});

describe('V103 Pads je Modus und Dock eingeklappt (Wunsch Enrico)', () => {
  it('Pads aus dem Notizen-Modus fehlen im Desk; ins Dock = Desk; alle ins Dock lässt sie stehen', () => {
    let ws = W.defaultWorkspace();
    const a = No.createView(ws, 'block', 'A', { id: 'sa' });
    ws = Pd.createPad(a.ws, '', ['sa'], { id: 'pa' }).ws;
    const b = No.createView(ws, 'block', 'B', { id: 'sb' });
    ws = Pd.createPad(b.ws, '', ['sb'], { id: 'pb' }).ws;
    ws = Pd.setNotesOnly(ws, ['pb'], true);
    expect(Pd.deskPadsOn(ws, '').map((p) => p.id)).toEqual(['pa']);
    expect(Pd.padsOn(ws, '').map((p) => p.id)).toEqual(['pa', 'pb']);
    expect(Pd.setNotesOnly(ws, ['pb'], true)).toBe(ws);
    const all = Pd.dockAll(ws, '', true);
    expect(Pd.dockedOn(all, '').map((p) => p.id)).toEqual(['pa']);
    const docked = Pd.dockPad(ws, 'pb', true);
    expect(Pd.deskPadsOn(docked, '').map((p) => p.id)).toEqual(['pa', 'pb']);
    expect(Pd.setNotesOnly(docked, ['pb'], true)).toBe(docked);
    // Datei: Vermerk bleibt erhalten
    const back = parseWorkspace(JSON.parse(JSON.stringify(ws)))!;
    expect(back.pads?.find((p) => p.id === 'pb')?.notes).toBe(true);
    ws = Pd.setNotesOnly(ws, ['pb'], false);
    expect(Pd.deskPadsOn(ws, '')).toHaveLength(2);
    expect(Pd.dockOf(W.defaultWorkspace(), '').folded).toBe(true);
  });
});

describe('F-222 Werkzeug (V104): Bearbeiten, Zustand, Beispiele, Ausgabe', () => {
  const at = new Date('2026-12-01T10:00:00Z');
  const names = { criterion: (n: number) => `Kriterium ${n}`, option: (n: number) => `Lösung ${n}` };
  const base = () => {
    const ws0 = { ...W.defaultWorkspace(), projects: [{ id: 'p1', name: 'Büro' }] } as Workspace;
    return Dc.addDecision(ws0, { title: ' Malerbetrieb ', projectId: 'p1' }, { id: 'd', ids: ['c1', 'c2', 'c3', 'o1', 'o2'], now: at, names })!.ws;
  };
  const d = (ws: Workspace) => Dc.decisionsOf(ws).find((x) => x.id === 'd')!;
  const ed = (ws: Workspace, o: Dc.DecisionOp) => Dc.editDecision(ws, 'd', o, at);

  it('neu: 3 Kriterien, 2 Lösungen, Entwurf, am Projekt; leerer Titel geht nicht', () => {
    const ws = base();
    expect(d(ws)).toMatchObject({ title: 'Malerbetrieb', state: 'draft', projectId: 'p1' });
    expect(d(ws).criteria.map((c) => c.name)).toEqual(['Kriterium 1', 'Kriterium 2', 'Kriterium 3']);
    expect(d(ws).options).toHaveLength(2);
    expect(Dc.addDecision(ws, { title: '  ' }, { id: 'x', ids: ['a', 'b', 'c', 'd', 'e'], names })).toBeNull();
  });
  it('Gewichte, Bewertung, Zustand „Bewertet“, Muss-Kriterium, Entscheiden mit Begründung, Sperre', () => {
    let ws = base();
    ws = ed(ws, { op: 'normalize' });
    expect(d(ws).criteria.map((c) => c.weight)).toEqual([33.4, 33.3, 33.3]);
    ws = ed(ws, { op: 'critMust', c: 'c3', must: true });
    expect(d(ws).criteria[2].weight).toBeUndefined();
    ws = ed(ws, { op: 'normalize' });
    expect(Dc.weightSum(d(ws))).toBe(100);
    for (const [c, o, v] of [['c1', 'o1', 8], ['c2', 'o1', 4], ['c1', 'o2', 5], ['c2', 'o2', 12]] as const) ws = ed(ws, { op: 'score', c, o, v });
    expect(Dc.scoreOf(d(ws), 'c2', 'o2')!.v).toBe(10);
    expect(d(ws).state).toBe('rated');
    expect(Dc.winner(d(ws))!.id).toBe('o2');
    ws = ed(ws, { op: 'fails', o: 'o2', c: 'c3', fails: true });
    expect(Dc.winner(d(ws))!.id).toBe('o1');
    ws = ed(ws, { op: 'fails', o: 'o2', c: 'c3', fails: false });
    expect(ed(ws, { op: 'decide', o: 'o1' })).toBe(ws); // Abweichung ohne Begründung
    ws = ed(ws, { op: 'decide', o: 'o1', why: 'Kennen den Betrieb' });
    expect(d(ws)).toMatchObject({ state: 'decided', chosen: 'o1', locked: true });
    expect(ed(ws, { op: 'title', title: 'Neu' })).toBe(ws); // gesperrt
    ws = ed(ws, { op: 'reopen' });
    expect(d(ws).chosen).toBeUndefined();
    expect(d(ws).state).toBe('rated');
    expect(d(ws).marks!.map((m) => m.text)).toEqual(['Entschieden: Lösung 1 – Kennen den Betrieb', 'Wieder geöffnet']);
  });
  it('Paarvergleich: Schlüssel in Listenreihenfolge, übernehmen, Abweichung erkennen; Entfernen räumt auf', () => {
    let ws = base();
    ws = ed(ws, { op: 'pair', a: 'c2', b: 'c1', v: 2 }); // c2 wichtiger als c1
    expect(d(ws).pairs).toEqual({ 'c1|c2': 0 });
    ws = ed(ws, { op: 'pairApply' });
    expect(d(ws).criteria.map((c) => c.weight)).toEqual([16.7, 50, 33.3]);
    expect(Dc.pairsDiffer(d(ws))).toBe(false);
    ws = ed(ws, { op: 'critWeight', c: 'c1', weight: 30 });
    expect(Dc.pairsDiffer(d(ws))).toBe(true);
    ws = ed(ws, { op: 'score', c: 'c2', o: 'o1', v: 3 });
    ws = ed(ws, { op: 'critRemove', c: 'c2' });
    expect(d(ws).pairs).toBeUndefined();
    expect(d(ws).scores).toEqual([]);
    ws = ed(ws, { op: 'critMove', c: 'c3', to: 0 });
    expect(d(ws).criteria.map((c) => c.id)).toEqual(['c3', 'c1']);
    const r = Dc.removeDecision(ws, 'd')!;
    expect(Dc.decisionsOf(r.ws)).toHaveLength(0);
    expect(d(Dc.undoRemoveDecision(r.ws, r.undo)).title).toBe('Malerbetrieb');
  });
  it('V150 Rückgängig am Blatt (back): Kriterium/Lösung mit Bewertungen und Paarvergleich zurück; fremde oder gesperrte Stände nicht', () => {
    let ws = base();
    ws = ed(ws, { op: 'pair', a: 'c1', b: 'c2', v: 2 });
    ws = ed(ws, { op: 'score', c: 'c2', o: 'o1', v: 7 });
    const prev = d(ws);
    ws = ed(ws, { op: 'critRemove', c: 'c2' });
    ws = ed(ws, { op: 'optRemove', o: 'o2' });
    expect(d(ws).criteria).toHaveLength(2);
    ws = ed(ws, { op: 'back', prev });
    expect(d(ws).criteria.map((c) => c.id)).toEqual(['c1', 'c2', 'c3']);
    expect(d(ws).options.map((o) => o.id)).toEqual(['o1', 'o2']);
    expect(Dc.scoreOf(d(ws), 'c2', 'o1')!.v).toBe(7);
    expect(d(ws).pairs).toEqual({ 'c1|c2': 2 });
    expect(ed(ws, { op: 'back', prev: { ...prev, id: 'x', criteria: [] } })).toBe(ws);
    expect(ed(ws, { op: 'back', prev: { ...prev, criteria: [], locked: true } })).toBe(ws);
  });
  it('V151 Blatt: Gewichten schlägt den Rest bis 100 % vor; Verschieben innerhalb der gewichteten Kriterien springt über Muss-Kriterien', () => {
    let ws = base();
    ws = ed(ws, { op: 'critWeight', c: 'c1', weight: 60 });
    ws = ed(ws, { op: 'critMust', c: 'c2', must: true });
    ws = ed(ws, { op: 'critWeight', c: 'c3', weight: 25 });
    expect(Dc.restWeight(d(ws), 'c2')).toBe(15);
    ws = ed(ws, { op: 'critWeight', c: 'c3', weight: 40 });
    expect(Dc.restWeight(d(ws), 'c2')).toBeNull();
    const all = d(ws).criteria;
    const weighed = all.filter((c) => !c.must);
    expect(Dc.stepIndex(all, weighed, 'c3', -1)).toBe(0);
    expect(Dc.stepIndex(all, weighed, 'c1', -1)).toBe(-1);
    expect(Dc.stepIndex(all, weighed, 'c3', 1)).toBe(-1);
    ws = ed(ws, { op: 'critMove', c: 'c3', to: Dc.stepIndex(all, weighed, 'c3', -1) });
    expect(d(ws).criteria.filter((c) => !c.must).map((c) => c.id)).toEqual(['c3', 'c1']);
    ws = ed(ws, { op: 'optMove', o: 'o2', to: Dc.stepIndex(d(ws).options, d(ws).options, 'o2', -1) });
    expect(d(ws).options.map((o) => o.id)).toEqual(['o2', 'o1']);
  });
  it('Beispiele Wohnung und Malerbetrieb: vollständig bewertet, einer scheidet aus; Markdown und CSV', () => {
    let n = 0;
    for (const which of ['flat', 'painter'] as const) {
      const r = Dc.addExample(W.defaultWorkspace(), which, { id: 'e', newId: () => `i${n++}`, now: at })!;
      const e = Dc.decisionsOf(r.ws)[0];
      expect(e.state).toBe('rated');
      expect(Dc.weightSum(e)).toBe(100);
      const rk = Dc.ranking(e);
      expect(rk.filter((x) => x.out)).toHaveLength(1);
      expect(Dc.winner(e)).toBeDefined();
      const md = Dc.decisionMarkdown(e);
      expect(md).toContain('## Ergebnis');
      expect(md).toContain('scheidet aus');
      expect(Dc.decisionCsv(e).split('\n')[0].startsWith('Lösung;')).toBe(true);
    }
    expect(Dc.decisionFileName({ title: 'Beispiel: Welche Wohnung?' } as never, 'md')).toBe('Entscheidung_Beispiel_Welche_Wohnung.md');
  });
});

describe('F-225 Feedback in Projekten (V105)', () => {
  const base = () => Pj.addProject(W.defaultWorkspace(), 'Umbau Halle')!;
  it('Projektmeldung trägt Projekt und Instanz, Filter trennt App und Projekt', () => {
    const { ws: w0, id: pid } = base();
    let ws = Fb.addFeedback(w0, { kind: 'bug', title: 'Gerüst fehlt', project: pid, to: 'lead' }, { id: 'fb-p' })!.ws;
    ws = Fb.addFeedback(ws, { kind: 'wish', title: 'Dunkles Thema' }, { id: 'fb-a' })!.ws;
    const p = Fb.feedbackById(ws, 'fb-p')!;
    expect(p.project).toBe(pid);
    expect(p.to).toBe('lead');
    expect(Fb.feedbackList(ws, { project: pid }).map((f) => f.id)).toEqual(['fb-p']);
    expect(Fb.feedbackList(ws, { project: null }).map((f) => f.id)).toEqual(['fb-a']);
    expect(Fb.feedbackList(ws)).toHaveLength(2);
    expect(Fb.newCount(ws)).toBe(1);
    expect(Fb.newCountOf(ws, pid)).toBe(1);
    expect(JSON.parse(Fb.feedbackFileJson(ws, { project: null })).feedback).toHaveLength(1);
  });
  it('Instanzen: Vorgabe nach ICB4, umbenennen, Person, hinzufügen, entfernen (nie die letzte)', () => {
    const { ws: w0, id } = base();
    expect(Pj.rolesOf(Pj.projectById(w0, id)).map((r) => r.id)).toEqual(['lead', 'steering', 'client']);
    let ws = Pj.editRoles(w0, id, { kind: 'person', role: 'lead', person: 'pn-ich' });
    ws = Pj.editRoles(ws, id, { kind: 'name', role: 'client', name: '  Bauherr ' });
    ws = Pj.editRoles(ws, id, { kind: 'add', name: 'QS', rid: 'r-qs' });
    ws = Pj.editRoles(ws, id, { kind: 'remove', role: 'steering' });
    const roles = Pj.rolesOf(Pj.projectById(ws, id));
    expect(roles.map((r) => r.name)).toEqual(['Projektleitung', 'Bauherr', 'QS']);
    expect(roles.at(0)!.person).toBe('pn-ich');
    let one = ws;
    for (const r of roles) one = Pj.editRoles(one, id, { kind: 'remove', role: r.id });
    expect(Pj.rolesOf(Pj.projectById(one, id))).toHaveLength(1);
  });
  it('Formular: Felder aus, Pflicht zählt bei „noch offen“, „Was“ bleibt', () => {
    let form = Fb.toggleForm(undefined, 'steps', 'off');
    form = Fb.toggleForm(form, 'what', 'off');
    form = Fb.toggleForm(form, 'impact', 'required');
    form = Fb.toggleForm(form, 'steps', 'required');
    const f = Fb.formOf(form);
    expect(f.off).toEqual(['steps']);
    expect(f.required).toEqual(['impact']); // ausgeschaltetes Feld ist nie Pflicht
    const fb = { id: 'x', kind: 'bug' as const, title: 't', state: 'new' as const, at: '2026-11-25T10:00:00Z' };
    const miss = Fb.missingOf(fb, Fb.formOf(form));
    expect(miss).toContain('impact');
    expect(miss).not.toContain('steps');
    expect(Fb.toggleForm(Fb.toggleForm(undefined, 'goals', 'required'), 'goals', 'required')).toBeUndefined();
  });
  it('Dateiformat 11: Projekt, Instanz, Instanzen und Formular bleiben erhalten', () => {
    const { ws: w0, id } = base();
    let ws = Pj.editRoles(w0, id, { kind: 'add', name: 'QS', rid: 'r-qs' });
    ws = Pj.editProject(ws, id, { feedbackForm: { off: ['steps'], required: ['impact'] } });
    ws = Fb.addFeedback(ws, { kind: 'question', title: 'Wer zahlt?', project: id, to: 'r-qs' }, { id: 'fb-q' })!.ws;
    const back = parseWorkspace(JSON.parse(JSON.stringify(ws)))!;
    const p = Pj.projectById(back, id)!;
    expect(p.roles!.map((r) => r.id)).toEqual(['lead', 'steering', 'client', 'r-qs']);
    expect(p.feedbackForm).toEqual({ off: ['steps'], required: ['impact'] });
    expect(Fb.feedbackById(back, 'fb-q')!.to).toBe('r-qs');
  });
});

describe('F-225 P8 Risiken und Änderungsanträge (V107)', () => {
  const base = () => {
    const { ws, id } = Pj.addProject(W.defaultWorkspace(), 'Umbau Halle')!;
    return { ws: Pj.editProject(ws, id, { psp: { prefix: 'UH' } }), id };
  };
  it('R1: Risiken und Änderungen zählen nicht als Vorgänge (Liste, PSP)', () => {
    const { ws: w0, id } = base();
    let ws = Psp.addPspTask(w0, id, 'Gerüst stellen', { id: 'n-t' })!.ws;
    ws = Rk.addSteer(ws, id, 'risk', { title: 'Lieferverzug Stahl' }, { id: 'n-r' })!.ws;
    ws = Rk.addSteer(ws, id, 'change', { title: 'Zweites Tor' }, { id: 'n-c' })!.ws;
    expect(Pj.tasksOfProject(ws, id).map((n) => n.id)).toEqual(['n-t']);
    expect(Pj.rowOf(ws, Pj.projectById(ws, id)!).tasks).toBe(1);
    expect(Psp.pspTree(ws, id).map((n) => n.id)).toEqual(['n-t']);
    expect(Rk.isTask(NLo.noteById(ws, 'n-r')!)).toBe(false);
  });
  it('R2/R3/R8: Wert, Ton, Nummern mit Präfix, Ordnung und Matrix', () => {
    const { ws: w0, id } = base();
    let ws = Rk.addSteer(w0, id, 'risk', { title: 'A' }, { id: 'r1' })!.ws;
    ws = Rk.addSteer(ws, id, 'risk', { title: 'B' }, { id: 'r2' })!.ws;
    ws = Rk.addSteer(ws, id, 'risk', { title: 'C' }, { id: 'r3' })!.ws;
    ws = Rk.editRisk(ws, 'r1', { p: 2, i: 3 });
    ws = Rk.editRisk(ws, 'r2', { p: 4, i: 5, strategy: 'reduce' });
    expect(Rk.riskScore(NLo.noteById(ws, 'r2')!.risk)).toBe(20);
    expect(Rk.riskTone(20)).toBe('alert');
    expect(Rk.riskTone(8)).toBe('warn');
    expect(Rk.riskTone(7)).toBe('calm');
    expect(Rk.riskTone(undefined)).toBe('none');
    expect(Rk.risksOf(ws, id).map((n) => n.id)).toEqual(['r2', 'r1', 'r3']);
    expect(Rk.steerCode(ws, NLo.noteById(ws, 'r3')!)).toBe('UH-R-3');
    expect(Rk.steerCodeFor({ psp: { prefix: 'CG-1.' } }, 'change', 2)).toBe('CG-Ä-2');
    expect(Rk.steerCodeFor(undefined, 'risk', 1)).toBe('R-1');
    const cell = Rk.riskMatrix(ws, id).find((r) => r.p === 4)!.cells.find((c) => c.i === 5)!;
    expect(cell.ids).toEqual(['r2']);
    expect(Rk.unratedRisks(ws, id).map((n) => n.id)).toEqual(['r3']);
    ws = Rk.editRisk(ws, 'r2', { state: 'closed' });
    expect(Rk.risksOf(ws, id).at(-1)!.id).toBe('r2');
    expect(Rk.steerCounts(ws, id)).toEqual({ risks: 2, high: 0, changes: 0 });
    // ungültige Stufe bleibt draußen, null entfernt
    ws = Rk.editRisk(ws, 'r1', { p: 9 as never, strategy: null });
    expect(NLo.noteById(ws, 'r1')!.risk!.p).toBeUndefined();
  });
  it('R4/R5/R6: Änderungsantrag entscheiden, danach Vorgang anlegen', () => {
    const { ws: w0, id } = base();
    let ws = Rk.addSteer(w0, id, 'change', { title: 'Zweites Tor' }, { id: 'c1' })!.ws;
    expect(NLo.noteById(ws, 'c1')!.change).toMatchObject({ no: 1, state: 'asked', decider: 'steering' });
    ws = Rk.editChange(ws, 'c1', { days: 5, cost: 12000.456 });
    expect(NLo.noteById(ws, 'c1')!.change!.cost).toBe(12000.46);
    expect(Rk.canMakeTask(ws, NLo.noteById(ws, 'c1')!)).toBe(false);
    ws = Rk.decideChange(ws, 'c1', 'approved', { text: 'Budget reicht', who: 'Lenkungskreis', now: Date.parse('2026-11-25T10:00:00Z') });
    const c = NLo.noteById(ws, 'c1')!.change!;
    expect(c.decided).toEqual({ at: '2026-11-25T10:00:00.000Z', text: 'Budget reicht', who: 'Lenkungskreis' });
    const t = Rk.makeTask(ws, 'c1', { id: 't1' })!;
    expect(NLo.noteById(t.ws, 't1')!.title).toBe('Änderung UH-Ä-1: Zweites Tor');
    expect(NLo.noteById(t.ws, 'c1')!.change!.task).toBe('t1');
    expect(Pj.tasksOfProject(t.ws, id).map((n) => n.id)).toEqual(['t1']);
    expect(Rk.canMakeTask(t.ws, NLo.noteById(t.ws, 'c1')!)).toBe(false);
    // zurück in Prüfung nimmt die Entscheidung weg
    expect(NLo.noteById(Rk.decideChange(ws, 'c1', 'review'), 'c1')!.change!.decided).toBeUndefined();
  });
  it('R7: Meldung wird zu Risiko – Vermerk, Bezug, nur einmal, Rückgängig', () => {
    const { ws: w0, id } = base();
    let ws = Fb.addFeedback(w0, { kind: 'bug', title: 'Kran wackelt', project: id, what: 'Seit Montag', impact: 'Stillstand' }, { id: 'fb1' })!.ws;
    const r = Rk.becomeFromFeedback(ws, 'fb1', 'risk', { id: 'nr', label: 'Wurde zu Risiko' })!;
    expect(r.code).toBe('UH-R-1');
    const n = NLo.noteById(r.ws, 'nr')!;
    expect(n).toMatchObject({ type: 'risk', project: id, title: 'Kran wackelt', text: 'Seit Montag' });
    expect(n.risk).toMatchObject({ no: 1, effect: 'Stillstand', from: 'fb1', state: 'open' });
    const f = Fb.feedbackById(r.ws, 'fb1')!;
    expect(f.became).toEqual({ note: 'nr', type: 'risk' });
    expect(f.marks!.at(-1)!.text).toBe('Wurde zu Risiko UH-R-1');
    expect(Rk.becomeFromFeedback(r.ws, 'fb1', 'change', { id: 'nx', label: 'x' })).toBeNull();
    ws = Rk.undoBecome(r.ws, r.undo);
    expect(NLo.noteById(ws, 'nr')).toBeUndefined();
    expect(Fb.feedbackById(ws, 'fb1')!.became).toBeUndefined();
    // Meldung an E-Sources (ohne Projekt) geht nicht
    ws = Fb.addFeedback(ws, { kind: 'wish', title: 'App' }, { id: 'fb2' })!.ws;
    expect(Rk.becomeFromFeedback(ws, 'fb2', 'risk', { id: 'n2', label: 'x' })).toBeNull();
  });
  it('R10: Beispielprojekt hat 3 Risiken, 1 Chance (V109) und 2 Änderungsanträge, die keine Vorgänge sind; Entfernen nimmt sie mit', () => {
    const ws = Sp.addSampleProject(W.defaultWorkspace());
    expect(Rk.risksOf(ws, Sp.SAMPLE_PROJECT).map((n) => Rk.steerCode(ws, n)).sort()).toEqual(['CG-R-1', 'CG-R-2', 'CG-R-3', 'CG-R-4']);
    expect(Rk.risksOf(ws, Sp.SAMPLE_PROJECT).filter((n) => n.risk!.chance).map((n) => n.id)).toEqual(['cg-ch1']);
    expect(Rk.changesOf(ws, Sp.SAMPLE_PROJECT)).toHaveLength(2);
    expect(Pj.tasksOfProject(ws, Sp.SAMPLE_PROJECT).some((n) => n.type === 'risk')).toBe(false);
    expect(Rk.risksOf(Sp.removeSampleProject(ws), Sp.SAMPLE_PROJECT)).toHaveLength(0);
  });
  it('Dateiformat 11: Risiko, Änderung und „wurde zu“ bleiben erhalten', () => {
    const { ws: w0, id } = base();
    let ws = Rk.addSteer(w0, id, 'risk', { title: 'A', risk: { p: 3, i: 4, owner: 'pn-ich', measure: 'Zweiter Lieferant' } }, { id: 'r1' })!.ws;
    ws = Rk.addSteer(ws, id, 'change', { title: 'B' }, { id: 'c1' })!.ws;
    ws = Rk.decideChange(ws, 'c1', 'rejected', { text: 'zu teuer', now: Date.parse('2026-11-25T10:00:00Z') });
    ws = Fb.addFeedback(ws, { kind: 'bug', title: 'X', project: id }, { id: 'fb1' })!.ws;
    ws = Fb.setBecame(ws, 'fb1', { note: 'r1', type: 'risk' }, 'Wurde zu Risiko UH-R-1');
    const back = parseWorkspace(JSON.parse(JSON.stringify(ws)))!;
    expect(NLo.noteById(back, 'r1')!.risk).toEqual(NLo.noteById(ws, 'r1')!.risk);
    expect(NLo.noteById(back, 'c1')!.change).toEqual(NLo.noteById(ws, 'c1')!.change);
    expect(Fb.feedbackById(back, 'fb1')!.became).toEqual({ note: 'r1', type: 'risk' });
  });
});

describe('F-222 V108 – freie Entscheidungen, vorbereiten, Suche', () => {
  const T: Prep.PrepareTexts = { criterion: (n) => `K${n}`, option: (n) => `L${n}`, changeCriteria: ['Termin', 'Kosten', 'Leistung', 'Umfang'], changeOptions: ['Änderung umsetzen', 'Nicht umsetzen'] };
  const ids = (p: string) => Array.from({ length: 6 }, (_, i) => `${p}${i}`);
  it('E2: aus einer Notiz ohne Projekt – frei, Titel, erster Absatz als Frage, Bezug; decisionsFrom findet sie', () => {
    let ws = { ...W.defaultWorkspace(), notes: [] } as Workspace;
    ws = NLo.createNote(ws, { title: '', text: '# Welche Wohnung?\n\nUmzug bis März, Budget 1.200 €.\n\nNoch mehr.' }, { id: 'n1', now: 1 }).ws;
    const r = Prep.prepareDecision(ws, { kind: 'note', id: 'n1' }, T, { id: 'd1', ids: ids('x'), now: new Date('2026-11-26T08:00:00Z') })!;
    const d = Dc.decisionsOf(r.ws).find((x) => x.id === 'd1')!;
    expect(d).toMatchObject({ title: 'Welche Wohnung?', question: 'Umzug bis März, Budget 1.200 €.', links: [{ kind: 'note', id: 'n1' }] });
    expect(d.projectId).toBeUndefined();
    expect(Prep.decisionsFrom(r.ws, { kind: 'note', id: 'n1' }).map((x) => x.id)).toEqual(['d1']);
    expect(Dc.searchDecisions(r.ws, 'wohnung')).toHaveLength(1);
    expect(Dc.searchDecisions(r.ws, 'wohnung haus')).toHaveLength(0);
    expect(Dc.searchDecisions(r.ws, '  ')).toHaveLength(0);
    expect(Prep.prepareDecision(ws, { kind: 'note', id: 'fehlt' }, T, { id: 'd2', ids: ids('y') })).toBeNull();
  });
  it('E2/E5: aus einem Änderungsantrag – Code im Titel, Begründung als Frage, Kriterien und Lösungen vorbelegt; E4 Vorschlag', () => {
    const ws0 = Sp.addSampleProject(W.defaultWorkspace());
    const r = Prep.prepareDecision(ws0, { kind: 'note', id: 'cg-c2' }, T, { id: 'd1', ids: ids('x') })!;
    const d = Dc.decisionsOf(r.ws).find((x) => x.id === 'd1')!;
    expect(d.title).toBe('CG-Ä-2: Günstigere Lackieranlagen anschaffen');
    expect(d.projectId).toBe(Sp.SAMPLE_PROJECT);
    expect(d.criteria.map((c) => c.name)).toEqual(['Termin', 'Kosten', 'Leistung', 'Umfang']);
    expect(d.options.map((o) => o.name)).toEqual(['Änderung umsetzen', 'Nicht umsetzen']);
    expect(Prep.suggestionFor(r.ws, 'cg-c2')).toBeNull();
    let ws = r.ws;
    for (const c of d.criteria) ws = Dc.editDecision(ws, 'd1', { op: 'critWeight', c: c.id, weight: 25 });
    for (const c of d.criteria) for (const [k, o] of d.options.entries()) ws = Dc.editDecision(ws, 'd1', { op: 'score', c: c.id, o: o.id, v: k === 0 ? 3 : 8 });
    expect(Prep.suggestionFor(ws, 'cg-c2')).toMatchObject({ option: 'Nicht umsetzen', decided: false });
  });
  it('E2: Projektmeldung wird zu Entscheidung – Vermerk, kein zweites Mal, Rückgängig; Format 11 behält „decision“', () => {
    let ws = Sp.addSampleProject(W.defaultWorkspace());
    ws = Fb.addFeedback(ws, { kind: 'wish', title: 'Welcher Lieferant?', what: 'Zwei Angebote liegen vor.', project: Sp.SAMPLE_PROJECT }, { id: 'fb1' })!.ws;
    const r = Prep.becomeDecision(ws, 'fb1', T, { id: 'd1', ids: ids('x'), label: 'Ist jetzt Entscheidung' })!;
    expect(Fb.feedbackById(r.ws, 'fb1')!.became).toEqual({ note: 'd1', type: 'decision' });
    expect(Dc.decisionsOf(r.ws).find((x) => x.id === 'd1')).toMatchObject({ question: 'Zwei Angebote liegen vor.', projectId: Sp.SAMPLE_PROJECT, links: [{ kind: 'feedback', id: 'fb1' }] });
    expect(Prep.becomeDecision(r.ws, 'fb1', T, { id: 'd2', ids: ids('y'), label: 'x' })).toBeNull();
    expect(Rk.becomeFromFeedback(r.ws, 'fb1', 'risk', { id: 'r9', label: 'x' })).toBeNull();
    const back = parseWorkspace(JSON.parse(JSON.stringify(r.ws)))!;
    expect(Fb.feedbackById(back, 'fb1')!.became).toEqual({ note: 'd1', type: 'decision' });
    const u = Prep.undoBecomeDecision(r.ws, r.undo);
    expect(Dc.decisionsOf(u).some((x) => x.id === 'd1')).toBe(false);
    expect(Fb.feedbackById(u, 'fb1')!.became).toBeUndefined();
  });
});

describe('F-222 V111 – Bezüge an Lösungen', () => {
  const at = new Date('2026-12-01T10:00:00Z');
  const names = { criterion: (n: number) => `Kriterium ${n}`, option: (n: number) => `Lösung ${n}` };
  const base = () => {
    const ws0 = {
      ...W.defaultWorkspace(),
      persons: [{ id: 'pe1', name: 'Petra Lack', kind: 'person' }],
      notes: [{ id: 'n1', title: 'Angebot Farbwerk', text: '' }, { id: 'n2', title: '', text: 'Besichtigung\nam Montag' }],
    } as unknown as Workspace;
    return Dc.addDecision(ws0, { title: 'Maler' }, { id: 'd', ids: ['c1', 'c2', 'c3', 'o1', 'o2'], now: at, names })!.ws;
  };
  const o1 = (ws: Workspace) => Dc.decisionsOf(ws)[0].options[0];
  const ed = (ws: Workspace, o: Dc.DecisionOp) => Dc.editDecision(ws, 'd', o, at);

  it('verbinden, nicht doppelt, lösen; Name und „gelöscht“', () => {
    let ws = ed(base(), { op: 'optLink', o: 'o1', link: { kind: 'note', id: 'n1' }, on: true });
    ws = ed(ws, { op: 'optLink', o: 'o1', link: { kind: 'note', id: 'n1' }, on: true });
    ws = ed(ws, { op: 'optLink', o: 'o1', link: { kind: 'person', id: 'pe1' }, on: true });
    expect(o1(ws).links).toEqual([{ kind: 'note', id: 'n1' }, { kind: 'person', id: 'pe1' }]);
    expect(Dc.linkName(ws, { kind: 'note', id: 'n1' })).toBe('Angebot Farbwerk');
    expect(Dc.linkName(ws, { kind: 'person', id: 'pe1' })).toBe('Petra Lack');
    expect(Dc.linkName(ws, { kind: 'feedback', id: 'weg' })).toBeUndefined();
    ws = ed(ws, { op: 'optLink', o: 'o1', link: { kind: 'note', id: 'n1' }, on: false });
    ws = ed(ws, { op: 'optLink', o: 'o1', link: { kind: 'person', id: 'pe1' }, on: false });
    expect(o1(ws).links).toBeUndefined();
  });
  it('Auswahl: Suche je Art ohne schon verbundene, Notiz ohne Titel nach erster Zeile; bleibt nach Speichern', () => {
    const ws = base();
    expect(Dc.linkTargets(ws, 'note', '').map((t) => t.name)).toEqual(['Angebot Farbwerk', 'Besichtigung']);
    expect(Dc.linkTargets(ws, 'note', 'farb').map((t) => t.id)).toEqual(['n1']);
    expect(Dc.linkTargets(ws, 'note', '', [{ kind: 'note', id: 'n1' }]).map((t) => t.id)).toEqual(['n2']);
    expect(Dc.linkTargets(ws, 'person', 'lack')).toHaveLength(1);
    const linked = ed(ws, { op: 'optLink', o: 'o1', link: { kind: 'bookmark', id: 'b9' }, on: true });
    expect(Dc.parseDecisions(JSON.parse(JSON.stringify(Dc.decisionsOf(linked))))[0].options[0].links).toEqual([{ kind: 'bookmark', id: 'b9' }]);
  });
});

describe('V111 Anordnung rückgängig (Strg/⌘+Z)', () => {
  it('merkt Stände, überspringt gleiche, stellt nur die Anordnung wieder her', async () => {
    const LU = await import('./layoutUndo');
    const Pd = await import('./pads');
    const ws0 = W.defaultWorkspace();
    const ws1 = Pd.setPlace(ws0, '', 'pad1', { x: 0.1, y: 0.1, w: 0.3, h: 0.3 });
    let list = LU.pushSnap([], LU.layoutSnap(ws0));
    list = LU.pushSnap(list, LU.layoutSnap(ws0)); // gleich → einmal
    expect(list).toHaveLength(1);
    const ws2 = { ...Pd.setPlace(ws1, '', 'pad1', { x: 0.5, y: 0.5, w: 0.3, h: 0.3 }), notes: [{ id: 'n', title: 'bleibt', text: '' }] } as unknown as Workspace;
    list = LU.pushSnap(list, LU.layoutSnap(ws1));
    const r = LU.popSnap(ws2, list)!;
    const back = LU.restoreLayout(ws2, r.snap);
    expect(back.padDesks?.['']?.places.pad1).toMatchObject({ x: 0.1, y: 0.1 });
    expect(back.notes).toEqual(ws2.notes);
    // vom wiederhergestellten Stand aus: nächster Schritt ist der Ausgangsstand ohne Pad-Platz
    const r2 = LU.popSnap(back, r.rest)!;
    expect(LU.restoreLayout(back, r2.snap).padDesks).toBeUndefined();
    expect(LU.popSnap(LU.restoreLayout(back, r2.snap), r2.rest)).toBeNull();
  });
});

describe('V111 Linie ziehen (resizeAligned)', () => {
  const quad = (): T.Node => ({ dir: 'row', sizes: [0.5, 0.5], children: [{ dir: 'col', sizes: [0.5, 0.5], children: [{ id: 'a' }, { id: 'c' }] }, { dir: 'col', sizes: [0.5, 0.5], children: [{ id: 'b' }, { id: 'd' }] }] });
  const min = { w: 0.05, h: 0.05 } as never;
  it('2 × 2: waagrechte Linie zieht beide Spalten, Ecke zieht alle vier', () => {
    const t = T.resizeAligned(quad(), 'a', { y: 'bottom', dy: 0.1 }, min);
    const r = T.rects(t);
    expect(Math.round(r.get('a')!.h * 100)).toBe(60);
    expect(Math.round(r.get('b')!.h * 100)).toBe(60);
    const t2 = T.resizeAligned(quad(), 'a', { x: 'right', dx: -0.1, y: 'bottom', dy: -0.2 }, min);
    const r2 = T.rects(t2);
    expect([r2.get('a')!.w, r2.get('b')!.h, r2.get('c')!.h, r2.get('d')!.y].map((v) => Math.round(v * 100))).toEqual([40, 30, 70, 30]);
  });
});
