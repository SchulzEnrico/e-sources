/** F-215 (V69): Anordnung und Auswahl im Halbkreis über dem Home-Knopf (ohne React, testbar). */

/**
 * Winkel im Bogen (Grad, 180 = links, 90 = oben, 0 = rechts); null = Platz in der Kreismitte.
 * V70 (Wunsch Enrico: „rund, kein Ei“, über der Oberkante der Fußleiste): echter Halbkreis, symmetrisch,
 * fünf Plätze auf dem Bogen (Sprachnotiz oben in der Mitte) und einer innen.
 */
// V71 (Wunsch Enrico): Mitte oben und der Platz über dem Knopf sind frei für die Pfeile der Wischgesten –
// sechs Plätze auf dem Bogen, links und rechts je drei (Abstand 32°, Lücke oben 52°).
export const ARC_ANGLES: (number | null)[] = [180, 148, 116, 64, 32, 0];
export const ARC_RADIUS = 80;
/** Mitte des Kreises liegt so weit über der Knopfmitte (px): Knopfmitte 21 px unter der Oberkante der
 *  Fußleiste + halber Eintrag 20 px + 5 px Luft – so liegen auch die Plätze bei 0° und 180° darüber. */
export const ARC_LIFT = 46;
/** Ab dieser Entfernung vom Knopf (px) zählt die Wischrichtung als Auswahl */
export const AIM_PX = 18;
/** Näher als das an der Kreismitte (px) = innerer Platz */
export const INNER_PX = 36;
/** Spielraum, bevor die Auswahl wechselt (Grad bzw. px) */
export const HOLD_DEG = 8;
export const HOLD_PX = 6;
export const ARC_MAIN = ARC_ANGLES.indexOf(90);
export const ARC_INNER = ARC_ANGLES.indexOf(null);

/** Position eines Eintrags relativ zur Knopfmitte (px, y nach unten positiv) */
export function arcPos(i: number, r = ARC_RADIUS) {
  const deg = ARC_ANGLES[i];
  if (deg === null || deg === undefined) return { x: 0, y: -ARC_LIFT };
  const a = (deg * Math.PI) / 180;
  return { x: Math.round(Math.cos(a) * r), y: Math.round(-Math.sin(a) * r) - ARC_LIFT };
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

/** Erster Fokus im Halbkreis: der erste wählbare von links (V71: keine Mitte oben mehr) */
export function firstItem(items: readonly { run?: unknown }[]) {
  return items[0]?.run ? 0 : stepItem(items, 0, 1);
}

/**
 * V70 (Wunsch Enrico): Eintrag in Wischrichtung. dx/dy = Zeiger relativ zur Knopfmitte (y nach unten positiv).
 * Gemessen von der Kreismitte: nah an ihr = innerer Platz, sonst der Platz mit dem nächsten Winkel.
 * Zu nah am Knopf oder klar nach unten → -1. Gesperrte Einträge zählen mit (vergrößern sich, lösen nichts aus).
 */
export function aimItem(dx: number, dy: number, min = AIM_PX, cur = -1) {
  if (Math.hypot(dx, dy) < min) return -1;
  const cy = dy + ARC_LIFT;
  // V70: Ruhe an den Grenzen – der aktuelle Eintrag bleibt, bis ein anderer klar näher liegt
  const inner = cur === ARC_INNER ? INNER_PX + HOLD_PX : INNER_PX;
  if (ARC_INNER >= 0 && Math.hypot(dx, cy) < inner) return ARC_INNER;
  const deg = (Math.atan2(-cy, dx) * 180) / Math.PI; // 0 = rechts, 90 = oben, −90 = unten
  let best = -1;
  let gap = Infinity;
  ARC_ANGLES.forEach((a, i) => {
    if (a === null) return;
    const d = Math.abs(((((deg - a) % 360) + 540) % 360) - 180);
    if (d < gap) {
      gap = d;
      best = i;
    }
  });
  if (gap > 60) return -1;
  const now = cur >= 0 ? ARC_ANGLES[cur] : null;
  if (now !== null && now !== undefined && best !== cur) {
    const d = Math.abs(((((deg - now) % 360) + 540) % 360) - 180);
    if (d - gap < HOLD_DEG) return cur;
  }
  return best;
}

/**
 * V70 (Wunsch Enrico: „langsam, geschmeidig, nicht wie Flöhe hüpfen“): Nähe des Zeigers zu jedem Eintrag
 * (0 = weit weg, 1 = genau darauf), stufenlos wie die Lupe im Dock des Mac. dx/dy relativ zur Knopfmitte.
 */
export function nearness(dx: number, dy: number): number[] {
  const cy = dy + ARC_LIFT;
  const dist = Math.hypot(dx, cy);
  const deg = (Math.atan2(-cy, dx) * 180) / Math.PI;
  const out = Math.min(1, Math.max(0, (dist - 24) / 40)); // erst ab etwas Abstand zur Mitte zählt der Bogen
  return ARC_ANGLES.map((a) => {
    if (a === null) return Math.max(0, 1 - dist / 56);
    const d = Math.abs(((((deg - a) % 360) + 540) % 360) - 180);
    const f = Math.max(0, 1 - d / 70);
    return Math.round(f * f * (3 - 2 * f) * out * 1000) / 1000; // weicher Verlauf (smoothstep)
  });
}

// ---------------------------------------------------------------- F-215 (V71): Wischen am Knopf formatiert
/** Ab diesem Weg (px) zählt Wischen; vorher ist es ein Tippen bzw. Halten */
export const SWIPE_PX = 28;
export type SwipeDir = 'left' | 'right' | 'up' | 'down';

/** Richtung eines Wischens um dx/dy (y nach unten positiv); die stärkere Achse gewinnt. Zu kurz → null. */
export function swipeDir(dx: number, dy: number): SwipeDir | null {
  if (Math.hypot(dx, dy) < SWIPE_PX) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}
