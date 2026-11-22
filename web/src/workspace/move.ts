import { type ScreenSetup, layoutKey, parseLayoutKey } from './screen';
import type { Workspace } from './types';
import { moveToWindow, windowList } from './windows';
import { NEW_AREA, STACK_MAX, areaLabel, tryPlace, viewOf } from './workspace';

/**
 * F-28 Verschieben und Gruppieren: Panels auf eine andere Area legen – auch in einem anderen
 * Fenster (F-27) –, aus dem Stapel lösen oder ganze Areas zusammenlegen.
 */

/** Merkt sich die Einstellung, in der ein Fenster gerade zu sehen ist. Ohne Änderung dasselbe Objekt. */
export function noteSetup(ws: Workspace, setup: ScreenSetup): Workspace {
  const win = setup.win ?? '';
  const key = layoutKey(setup);
  if (ws.winSetup?.[win] === key) return ws;
  return { ...ws, winSetup: { ...ws.winSetup, [win]: key } };
}

/** Zuletzt gesehene Einstellung eines Fensters; null = noch nie gesehen. */
export function setupOfWindow(ws: Workspace, win: string): ScreenSetup | null {
  const key = ws.winSetup?.[win];
  const s = key ? parseLayoutKey(key) : null;
  return s && (s.win ?? '') === win ? s : null;
}

/** Ziel einer Verschiebung. `area` = Id einer Area, NEW_AREA oder '' (nur das Fenster, Lage unbekannt). */
export interface MoveTarget {
  win: string;
  area: string;
  /** Name der Area (Stapel) oder ihres Panels; bei NEW_AREA bzw. '' leer. */
  label: string;
  /** Panels, die schon dort liegen. */
  count: number;
  /** Geht gerade nicht (Stapel voll, keine freie Area). */
  disabled: boolean;
}

/**
 * Panels verschieben (F-28). `from` ist die Einstellung, in der sie gerade zu sehen sind. Im
 * selben Fenster wandern sie auf die Ziel-Area; in ein anderes Fenster wechseln sie das Fenster und
 * landen dort auf der gewählten Area (Einstellung aus `winSetup`). Geht es nicht, bleibt alles.
 */
export function movePanels(ws: Workspace, ids: string[], from: ScreenSetup, win: string, area: string): Workspace {
  if (win === (from.win ?? '')) return (area && tryPlace(ws, from, ids, area)) || ws;
  const moved = moveToWindow(ws, ids, win);
  if (moved === ws || !area) return moved;
  const dest = setupOfWindow(moved, win);
  return (dest && tryPlace(moved, dest, ids, area, true)) || ws;
}

/**
 * Alle Ziele für diese Panels: je Fenster seine Areas (ohne die, auf der sie schon liegen) und
 * eine eigene neue Area. Von einem Fenster ohne bekannte Einstellung gibt es nur das Fenster selbst.
 */
export function moveTargets(ws: Workspace, ids: string[], from: ScreenSetup): MoveTarget[] {
  const here = from.win ?? '';
  const out: MoveTarget[] = [];
  const add = (win: string, area: string, label: string, count: number) =>
    out.push({ win, area, label, count, disabled: movePanels(ws, ids, from, win, area) === ws });
  for (const w of windowList(ws)) {
    const setup = w.id === here ? from : setupOfWindow(ws, w.id);
    if (!setup) {
      if (ws.panels.some((p) => (p.win ?? '') === w.id)) add(w.id, '', '', 0);
      continue;
    }
    for (const s of viewOf(ws, setup).slots) {
      if (s.panels.some((p) => ids.includes(p.id))) continue;
      add(w.id, s.id, areaLabel(ws, s) || s.front.name, s.panels.length);
    }
    add(w.id, NEW_AREA, '', 0);
  }
  // Eine eigene Area, die nicht geht, nur im eigenen Fenster zeigen (dort heißt sie „Aus dem Stapel lösen“).
  return out.filter((t) => !(t.area === NEW_AREA && t.disabled && t.win !== here));
}

/**
 * F-27/F-28: Panels aus anderen Fenstern in das Fenster mit dieser Einstellung holen („Hierher
 * holen“, „Alle … holen“). Erst auf freie Areas, dann auf die Stapel mit den wenigsten Panels –
 * nie mehr als STACK_MAX je Stapel. Was nicht mehr passt, bleibt, wo es ist.
 */
export function fetchPanels(ws: Workspace, ids: string[], dest: ScreenSetup): { ws: Workspace; moved: number } {
  const win = dest.win ?? '';
  let out = ws;
  let moved = 0;
  for (const id of ids) {
    const next = moveToWindow(out, [id], win);
    if (next === out) continue;
    let placed = viewOf(out, dest).slots.length === 0 ? next : tryPlace(next, dest, [id], NEW_AREA, true);
    if (!placed) {
      const room = viewOf(out, dest)
        .slots.filter((s) => s.panels.length < STACK_MAX)
        .sort((a, b) => a.panels.length - b.panels.length);
      for (const s of room) if ((placed = tryPlace(next, dest, [id], s.id, true))) break;
    }
    if (!placed) break;
    out = placed;
    moved++;
  }
  return { ws: out, moved };
}
