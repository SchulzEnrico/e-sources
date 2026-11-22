/**
 * Testbelegung „voll“ (nur zum Ausprobieren, Adresse mit ?test=voll): Hauptfenster und Fenster 2
 * je als Super-Ultrawide (49 Zoll) mit 10 Areas × 9 Panels × 9 Tabs. Nichts davon wird gespeichert,
 * und die Testfenster melden sich nicht bei echten Fenstern an.
 */
import { type ScreenSetup, layoutKey, specOf } from './screen';
import * as T from './tree';
import type { Arrangement, Area, Named, PanelMeta, Tab, Workspace } from './types';
import { STACK_MAX, TAB_MAX, defaultWorkspace } from './workspace';

export const PROBE = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('test') === 'voll';

/**
 * Nur der erste Tab jedes Panels hat eine Seite (deutsche bzw. englische Wikipedia) – so laden je
 * Fenster höchstens 10 Seiten. Die übrigen 8 Tabs sind leer, zählen aber für Ampel und Fokus.
 */
const SITES = ['https://de.wikipedia.org/wiki/Hamburg', 'https://en.wikipedia.org/wiki/Hamburg', 'https://de.wikipedia.org/wiki/Elbphilharmonie', 'https://en.wikipedia.org/wiki/Port_of_Hamburg'];

export function probeWorkspace(): Workspace {
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
