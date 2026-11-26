/**
 * F-220 (V116): Brücke zwischen Arbeitsstand und den geordneten Umschalt-Rädern – App meldet `ws.wheels` und
 * `dispatch`, die Räder lesen und ändern darüber, ohne dass Props durch alle Ebenen gereicht werden (wie `flash`).
 * Die Nutzung zählt jedes Gerät für sich (R5) in `esource.wheelUse.v1`.
 */
import { useSyncExternalStore } from 'react';
import type { WheelPrefs, Workspace } from '../workspace/types';
import * as Wo from '../workspace/wheelOrder';

type Set = (wheel: string, prefs: WheelPrefs | undefined) => void;
let current: Workspace['wheels'];
let setter: Set = () => {};
const subs = new Set<() => void>();

/** App: bei jeder Änderung von `ws.wheels` aufrufen. */
export function setWheelSource(wheels: Workspace['wheels'], set: Set): void {
  setter = set;
  if (wheels === current) return;
  current = wheels;
  subs.forEach((f) => f());
}

const subscribe = (f: () => void) => (subs.add(f), () => void subs.delete(f));

export function useWheelPrefs(wheel: string): [WheelPrefs | undefined, (p: WheelPrefs | undefined) => void] {
  const all = useSyncExternalStore(subscribe, () => current);
  return [all?.[wheel], (p) => setter(wheel, p)];
}

const USE_KEY = 'esource.wheelUse.v1';
const HINT_KEY = 'esource.wheelHint.v1';

export function readUses(): Wo.WheelUses {
  try {
    return Wo.parseUses(JSON.parse(localStorage.getItem(USE_KEY) ?? '{}'));
  } catch {
    return {};
  }
}

export function countUse(wheel: string, id: string): void {
  try {
    localStorage.setItem(USE_KEY, JSON.stringify(Wo.recordUse(readUses(), wheel, id, Date.now())));
  } catch {
    /* privater Modus: zählt nicht */
  }
}

/** R6: Hinweis „Nach deiner Nutzung geordnet“ je Rad nur einmal (je Gerät). */
export function hintOnce(wheel: string): boolean {
  try {
    const seen: string[] = JSON.parse(localStorage.getItem(HINT_KEY) ?? '[]');
    if (Array.isArray(seen) && seen.includes(wheel)) return false;
    localStorage.setItem(HINT_KEY, JSON.stringify([...(Array.isArray(seen) ? seen : []), wheel]));
    return true;
  } catch {
    return false;
  }
}
