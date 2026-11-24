/** F-215 (V72, Variante A): Erinnerung – Schnellwahlen, Anzeige und Umrechnung (ohne React, testbar). */
import type { Workspace } from './types';
import { REMIND_TEXT } from './terms';

export interface RemindPick {
  id: 'hour' | 'evening' | 'morning';
  label: string;
  at: string;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const at = (d: Date) => d.toISOString();
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Schnellwahlen: in 1 Stunde (auf 5 Minuten gerundet), heute 18:00 (nur bis 17 Uhr), morgen 9:00. */
export function quickPicks(now: Date = new Date()): RemindPick[] {
  const out: RemindPick[] = [];
  const h = new Date(now.getTime() + 60 * 60000);
  h.setSeconds(0, 0);
  h.setMinutes(Math.ceil(h.getMinutes() / 5) * 5);
  out.push({ id: 'hour', label: REMIND_TEXT.inHour, at: at(h) });
  if (now.getHours() < 17) {
    const e = new Date(now);
    e.setHours(18, 0, 0, 0);
    out.push({ id: 'evening', label: REMIND_TEXT.evening, at: at(e) });
  }
  const m = new Date(now);
  m.setDate(m.getDate() + 1);
  m.setHours(9, 0, 0, 0);
  out.push({ id: 'morning', label: REMIND_TEXT.morning, at: at(m) });
  return out;
}

/** Anzeige im Chip: „Heute, 18:00“, „Morgen, 9:00“, sonst „Do 27.11., 9:00“ (Jahr nur, wenn anders). */
export function remindLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const time = `${d.getHours()}:${pad2(d.getMinutes())}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (sameDay(d, now)) return `${REMIND_TEXT.today}, ${time}`;
  if (sameDay(d, tomorrow)) return `${REMIND_TEXT.tomorrow}, ${time}`;
  const year = d.getFullYear() !== now.getFullYear() ? String(d.getFullYear()) : '';
  return `${REMIND_TEXT.days[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}.${year}, ${time}`;
}

/** ISO ↔ Wert eines Felds `datetime-local` (Ortszeit, „JJJJ-MM-TTTHH:MM“) */
export function toLocalInput(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
export function fromLocalInput(v: string): string | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** Zuletzt benutzte Orte (neueste Notes zuerst, ohne Doppel, höchstens max). */
export function recentPlaces(ws: Workspace, max = 5): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of [...(ws.notes ?? [])].sort((a, b) => b.changed - a.changed)) {
    const p = n.place?.trim();
    if (!p || seen.has(p.toLowerCase())) continue;
    seen.add(p.toLowerCase());
    out.push(p);
    if (out.length >= max) break;
  }
  return out;
}
