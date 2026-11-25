/**
 * F-206 N13 / P7 / D11 (V85): F6 reihum durch die Bereiche – Kopfleiste → Slots → Dock → Pads (Umschalt+F6
 * rückwärts). Reine Logik: welcher Bereich als Nächstes dran ist. Die Oberfläche (useF6) sammelt die Bereiche.
 */
export type RingKind = 'bar' | 'slot' | 'dock' | 'pad';
export const RING_ORDER: readonly RingKind[] = ['bar', 'slot', 'dock', 'pad'];

/** Bereiche in fester Reihenfolge der Arten; innerhalb einer Art bleibt die gegebene Reihenfolge (Lage im Desk). */
export function ringSort<T extends { kind: RingKind }>(areas: T[]): T[] {
  return areas
    .map((a, i) => ({ a, i }))
    .sort((x, y) => RING_ORDER.indexOf(x.a.kind) - RING_ORDER.indexOf(y.a.kind) || x.i - y.i)
    .map((x) => x.a);
}

/** Nächster Bereich ringsum; `cur` = -1 (Fokus außerhalb aller Bereiche) → erster bzw. letzter. */
export function ringStep(count: number, cur: number, back: boolean): number {
  if (count <= 0) return -1;
  if (cur < 0 || cur >= count) return back ? count - 1 : 0;
  return (cur + (back ? count - 1 : 1)) % count;
}
