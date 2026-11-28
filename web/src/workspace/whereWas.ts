/**
 * V156 (F-109 „Wo war ich?“): Nach einer Pause oder beim nächsten Start zeigt die Begrüßung kurz, woran zuletzt
 * gearbeitet wurde – das zuletzt offene Portal (wie F-179), die laufende Karte (in Arbeit, sonst die zuletzt
 * bearbeitete) und offene Gedanken aus dem Gedankenparkplatz (F-106, liegen im Eingang K14).
 * Reine Funktionen; das Erkennen der Pause macht App (Tab verborgen oder ohne Eingabe länger als PAUSE_MS).
 */
import type { Note, Workspace } from './types';
import * as No from './notes';
import { inboxOf } from './inbox';

/** Pause: so lange verborgen bzw. ohne Maus und Tastatur, dann zeigt die Begrüßung „Wo war ich?“ */
export const PAUSE_MS = 30 * 60_000;
/** „zuletzt bearbeitet“ nur, wenn es nicht länger als das her ist */
export const RECENT_MS = 7 * 864e5;
/** so viele Gedanken stehen in der Begrüßung, der Rest als Zahl */
export const THOUGHTS_MAX = 3;

export interface WhereWas {
  /** laufende Karte: `doing` = in Arbeit, `last` = zuletzt bearbeitet */
  card?: { id: string; title: string; kind: 'doing' | 'last'; at: number };
  /** offene Gedanken im Eingang, neueste zuerst */
  thoughts: { id: string; title: string }[];
  /** weitere offene Gedanken, die nicht mehr in der Begrüßung stehen */
  more: number;
}

const lastAt = (n: Note): number => n.trail.reduce((m, e) => Math.max(m, e.at), 0);
const firstAt = (n: Note): number => n.trail[0]?.at ?? 0;
const live = (n: Note | undefined): n is Note => !!n && !n.unsaved && !n.template && n.state !== 'done' && n.state !== 'archived';

export function whereWas(ws: Workspace, now: number): WhereWas {
  const box = inboxOf(ws);
  const inBox = new Set(box?.ids ?? []);
  const notes = No.notesOf(ws).filter(live);
  const byLast = (a: Note, b: Note) => lastAt(b) - lastAt(a);
  const doing = notes.filter((n) => n.state === 'doing').sort(byLast)[0];
  const last = doing ?? notes.filter((n) => !inBox.has(n.id) && now - lastAt(n) <= RECENT_MS && lastAt(n) <= now).sort(byLast)[0];
  const open = (box?.ids ?? []).map((id) => No.noteById(ws, id)).filter((n): n is Note => live(n) && n.state !== 'review' && n.id !== last?.id);
  open.sort((a, b) => firstAt(b) - firstAt(a));
  const title = (n: Note) => No.titleOf(n).trim();
  return {
    ...(last ? { card: { id: last.id, title: title(last), kind: last.state === 'doing' ? 'doing' : 'last', at: lastAt(last) } } : {}),
    thoughts: open.slice(0, THOUGHTS_MAX).map((n) => ({ id: n.id, title: title(n) })),
    more: Math.max(0, open.length - THOUGHTS_MAX),
  };
}

export const isEmptyWhere = (w: WhereWas): boolean => !w.card && w.thoughts.length === 0;

/** Pause erkannt? `since` = zuletzt aktiv (Eingabe) bzw. Zeitpunkt, an dem der Tab verborgen wurde */
export const isPause = (since: number, now: number, ms = PAUSE_MS): boolean => since > 0 && now - since >= ms;
