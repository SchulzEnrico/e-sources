/**
 * Testbelegung „voll“ (nur zum Ausprobieren, Adresse mit ?test=voll): Hauptfenster und Fenster 2
 * je als Super-Ultrawide (49 Zoll) mit 10 Areas × 9 Panels × 9 Tabs. Nichts davon wird gespeichert,
 * und die Testfenster melden sich nicht bei echten Fenstern an.
 */
import { type ScreenSetup, layoutKey, specOf } from './screen';
import * as T from './tree';
import type { Arrangement, Area, Named, PanelMeta, Tab, Workspace } from './types';
import { STACK_MAX, TAB_MAX, defaultWorkspace } from './workspace';

const TEST = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('test') : null;
/** F-170: „slot“ = kleine Testbelegung mit gezielten Duplikaten für die Slotmaschine (?test=slot). */
export const PROBE_KIND: 'voll' | 'slot' | null = TEST === 'voll' || TEST === 'slot' ? TEST : null;
export const PROBE = PROBE_KIND !== null;

/**
 * Nur der erste Tab jedes Panels hat eine Seite (deutsche bzw. englische Wikipedia) – so laden je
 * Fenster höchstens 10 Seiten. Die übrigen 8 Tabs sind leer, zählen aber für Ampel und Fokus.
 */
const SITES = ['https://de.wikipedia.org/wiki/Hamburg', 'https://en.wikipedia.org/wiki/Hamburg', 'https://de.wikipedia.org/wiki/Elbphilharmonie', 'https://en.wikipedia.org/wiki/Port_of_Hamburg'];

export function probeWorkspace(): Workspace {
  if (PROBE_KIND === 'slot') return slotWorkspace();
  const base = defaultWorkspace();
  const panels: PanelMeta[] = [];
  const areaNames: Named[] = [];
  const layouts: Record<string, Arrangement> = {};
  const winSetup: Record<string, string> = {};
  for (const [w, label] of [['', 'H'], ['w2', 'F2']] as const) {
    const setup: ScreenSetup = w ? { cls: 'superwide', orientation: 'landscape', lines: 2, win: w } : { cls: 'superwide', orientation: 'landscape', lines: 2 };
    const spec = specOf(setup);
    const areas: Record<string, Area> = {};
    for (let a = 1; a <= spec.capacity; a++) {
      const nameId = `n-${label}-${a}`;
      areaNames.push({ id: nameId, name: `${label} Slot ${a}` });
      const ids: string[] = [];
      for (let p = 1; p <= STACK_MAX; p++) {
        const id = `p-${label}-${a}-${p}`;
        const tabs: Tab[] = Array.from({ length: TAB_MAX }, (_, t) => (t === 0 ? { id: `${id}-t1`, url: SITES[(a + p) % SITES.length] } : { id: `${id}-t${t + 1}` }));
        const meta: PanelMeta = { id, name: `${label} ${a}.${p}`, tabs, activeTab: tabs[0].id, areaName: nameId };
        if (w) meta.win = w;
        panels.push(meta);
        ids.push(id);
      }
      areas[`a-${label}-${a}`] = { id: `a-${label}-${a}`, panels: ids, front: ids[0] };
    }
    const tree = T.standard(Object.keys(areas), spec.lines, spec.perLine, 'landscape');
    if (tree) layouts[layoutKey(setup)] = { tree, areas };
    winSetup[w] = layoutKey(setup);
  }
  return { ...base, panels, layouts, areaNames, nextArea: 1, nextNumber: 1, windows: [{ id: 'w2', name: 'Desk 2 (Test)' }], winSetup };
}

/**
 * F-170: Testbelegung „slot“ – zwei Desks mit wenigen Portalen und gezielten Duplikaten:
 * Hamburg 3× (davon ein ganzes Portal im Stack), Elbphilharmonie 2×, Hafen 3× (auch zweimal im selben
 * Portal, einmal mit Schrägstrich am Ende), wikipedia.org 2×. MDN 2×, GitHub 2× (andere Symbole für die Walzen); Elbe und hamburg.de einmalig.
 */
export function slotWorkspace(): Workspace {
  const base = defaultWorkspace();
  const HH = 'https://de.wikipedia.org/wiki/Hamburg';
  const ELB = 'https://de.wikipedia.org/wiki/Elbphilharmonie';
  const PORT = 'https://en.wikipedia.org/wiki/Port_of_Hamburg';
  const WIKI = 'https://www.wikipedia.org';
  const ELBE = 'https://de.wikipedia.org/wiki/Elbe';
  // andere Seiten mit eigenem Symbol, damit die Walzen bunt werden (lassen sich evtl. nicht einbetten – egal für den Test)
  const MDN = 'https://developer.mozilla.org/de/';
  const GH = 'https://github.com/SchulzEnrico/e-sources';
  const HHDE = 'https://www.hamburg.de/';
  // [Desk, Slot, Portal, Adressen (erste = vorn)]
  const plan: [string, string, string, string[]][] = [
    ['', 'Recherche', 'Hamburg', [HH, ELB]],
    ['', 'Recherche', 'Hamburg (Kopie)', [HH]],
    ['', 'Lesen', 'Elbphilharmonie', [ELB]],
    ['', 'Hafen', 'Hafen', [PORT, PORT + '/']],
    ['', 'Einmalig', 'Elbe', [ELBE, MDN]],
    ['', 'Einmalig', 'Code', [GH, HHDE]],
    ['w2', 'Desk 2 Slot', 'Hamburg auf Desk 2', [HH, WIKI]],
    ['w2', 'Desk 2 Hafen', 'Hafen auf Desk 2', [PORT]],
    ['w2', 'Desk 2 Start', 'Wikipedia', [WIKI, MDN]],
    ['w2', 'Desk 2 Code', 'Code auf Desk 2', [GH]],
  ];
  const panels: PanelMeta[] = [];
  const areaNames: Named[] = [];
  const layouts: Record<string, Arrangement> = {};
  const winSetup: Record<string, string> = {};
  for (const w of ['', 'w2']) {
    const setup: ScreenSetup = w ? { cls: 'superwide', orientation: 'landscape', lines: 2, win: w } : { cls: 'superwide', orientation: 'landscape', lines: 2 };
    const areas: Record<string, Area> = {};
    for (const [desk, slot, name, urls] of plan) {
      if (desk !== w) continue;
      const nameId = `n-${slot}`;
      if (!areaNames.some((n) => n.id === nameId)) areaNames.push({ id: nameId, name: slot });
      const id = `p-${panels.length + 1}`;
      const tabs: Tab[] = urls.map((url, t) => ({ id: `${id}-t${t + 1}`, url }));
      const meta: PanelMeta = { id, name, tabs, activeTab: tabs[0].id, areaName: nameId };
      if (w) meta.win = w;
      panels.push(meta);
      const aid = `a-${slot}`;
      areas[aid] = areas[aid] ? { ...areas[aid], panels: [...areas[aid].panels, id] } : { id: aid, panels: [id], front: id };
    }
    const tree = T.standard(Object.keys(areas), 1, Object.keys(areas).length, 'landscape');
    if (tree) layouts[layoutKey(setup)] = { tree, areas };
    winSetup[w] = layoutKey(setup);
  }
  return { ...base, panels, layouts, areaNames, nextArea: 1, nextNumber: 1, windows: [{ id: 'w2', name: 'Desk 2 (Test)' }], winSetup };
}
