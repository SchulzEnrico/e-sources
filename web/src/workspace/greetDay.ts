/**
 * V158 (Enrico 28.11.2026): Die Begrüßung erscheint höchstens einmal am Tag – beim Start oder nach einer Pause
 * („Wo war ich?“), je nachdem, was zuerst kommt. Gemerkt wird nur der Tag (lokal in diesem Browser, wie die
 * Ansichts-Vorlieben); in der Testbelegung und eingebettet wird nichts geschrieben.
 */
import { mayStore } from './storage';

const KEY = 'esource.greetDay';

/** Ist heute noch keine Begrüßung erschienen? `last` = Tag der letzten Begrüßung (JJJJ-MM-TT). */
export function greetDue(last: string | null | undefined, today: string): boolean {
  return !last || last < today;
}

export function lastGreetDay(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** Begrüßung für heute als erschienen merken. Ohne Speicherrecht nur für diese Sitzung. */
let session: string | null = null;
export function markGreeted(today: string): void {
  session = today;
  if (!mayStore()) return;
  try {
    localStorage.setItem(KEY, today);
  } catch {
    /* privates Fenster o. Ä. – dann gilt die Sitzung */
  }
}

/** Darf die Begrüßung heute (noch) erscheinen? */
export function greetToday(today: string): boolean {
  return greetDue(session, today) && (!mayStore() || greetDue(lastGreetDay(), today));
}

/** Heutiger Tag in Ortszeit (JJJJ-MM-TT). */
export function localDay(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Entscheidung beim Laden der Seite – bleibt gleich, auch wenn die Oberfläche neu aufgebaut wird (Desk-Wechsel, Testbelegung). */
let atStart: boolean | null = null;
let closed = false;
export function greetOnStart(today: string): boolean {
  if (atStart === null) atStart = greetToday(today);
  return atStart && !closed;
}
/** Begrüßung wurde geschlossen – beim Neuaufbau der Oberfläche nicht noch einmal zeigen. */
export function greetClosed(): void {
  closed = true;
}
