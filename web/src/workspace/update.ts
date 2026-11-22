/**
 * F-168: Hinweis „Neue Version verfügbar“. Eine Startbildschirm-App auf iPhone/iPad lädt im
 * Hintergrund nicht neu. Darum fragt E-Sources beim Zurückkehren (visibilitychange, pageshow) und
 * in Abständen die kleine Datei version.json ab, die Vite beim Bauen schreibt. Steht dort eine
 * andere Build-Kennung als im laufenden Code, erscheint ein ruhiger Hinweis mit „Neu laden“.
 * Hier nur die reinen Regeln; Abfrage und Hinweis in useUpdate.ts bzw. components/UpdateNotice.tsx.
 */

/** Regelmäßig prüfen, solange die Seite sichtbar ist. */
export const CHECK_EVERY_MS = 30 * 60 * 1000;
/** Beim Zurückkehren höchstens einmal je Minute prüfen (schnelles Hin und Her). */
export const MIN_GAP_MS = 60 * 1000;

export type CheckReason = 'return' | 'timer';

/** Build-Kennung aus version.json lesen; alles Unbrauchbare → null. */
export function parseBuild(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = (raw as { build?: unknown }).build;
  return typeof b === 'string' && /^[\w.-]{1,64}$/.test(b) ? b : null;
}

/** Ist die gefundene Kennung eine andere als die laufende? Leere/unbekannte Werte zählen nie. */
export function isNewBuild(current: string, found: string | null): boolean {
  return !!current && !!found && found !== current;
}

/** Ist eine Prüfung fällig? Beim Zurückkehren nach 1 Minute, sonst nach 30 Minuten. */
export function dueCheck(last: number, now: number, reason: CheckReason): boolean {
  return now - last >= (reason === 'return' ? MIN_GAP_MS : CHECK_EVERY_MS);
}

/** Adresse der Versionsdatei; der Zeitstempel umgeht Zwischenspeicher (auch auf iOS). */
export function versionUrl(base: string, now: number): string {
  return `${base.endsWith('/') ? base : `${base}/`}version.json?t=${now}`;
}
