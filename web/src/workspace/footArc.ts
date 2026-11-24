/** F-215 (V69): Anordnung und Auswahl im Halbkreis über dem Home-Knopf (ohne React, testbar). */

/** Winkel im Bogen (Grad, 180 = links, 90 = oben). Sechs Plätze, Sprachnotiz oben in der Mitte. */
export const ARC_ANGLES = [180, 140, 90, 50, 18, -12];
export const ARC_RADIUS = 74;
export const ARC_MAIN = ARC_ANGLES.indexOf(90);

/** Position eines Eintrags relativ zur Knopfmitte (px, y nach unten positiv) */
export function arcPos(i: number, r = ARC_RADIUS) {
  const a = ((ARC_ANGLES[i] ?? 90) * Math.PI) / 180;
  return { x: Math.round(Math.cos(a) * r), y: Math.round(-Math.sin(a) * r) };
}

/** Nächster wählbarer Eintrag in Richtung dir (zyklisch); keiner wählbar → from */
export function stepItem(items: readonly { run?: unknown }[], from: number, dir: 1 | -1) {
  const n = items.length;
  for (let k = 1; k <= n; k++) {
    const j = (((from + dir * k) % n) + n) % n;
    if (items[j].run) return j;
  }
  return from;
}

/** Erster Fokus im Halbkreis: der Haupteintrag (oben Mitte), sonst der nächste wählbare */
export function firstItem(items: readonly { run?: unknown }[]) {
  return items[ARC_MAIN]?.run ? ARC_MAIN : stepItem(items, ARC_MAIN, 1);
}
