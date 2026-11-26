/**
 * F-206 Schritt 10 (V116, J2 „Ressourcen“): Ressourceneinsatz im Projekt – je Ressource und Woche die geplanten
 * Stunden gegen die Kapazität, darunter die Vorgänge (Vorbild MS Project „Ressource: Einsatz“ bzw. iTaskX
 * „Ressourceneinsatz“, ICB4 4.5.6 Ressourcen). Stunden je Vorgang: Einsätze (`use`), ohne Einsätze der ganze
 * Aufwand des Zuständigen; gleichmäßig auf die Arbeitstage des Vorgangs aus dem Gantt (Feiertage zählen nicht).
 * Sammelvorgänge und Meilensteine tragen keine Stunden.
 */
import type { Person, Workspace } from './types';
import { ganttOf, type Gantt } from './gantt';
import { addDays, isWorkday } from './schedule';
import { noteById } from './notes';
import { capacityOn, personById } from './persons';
import { mondayOf } from './focusLoad';

/** höchstens so viele Wochen (anderthalb Jahre) */
export const RES_WEEKS_MAX = 78;

export interface ResTask {
  id: string;
  code: string;
  title: string;
  hours: number[];
  total: number;
}
export interface ResRow {
  person: Person;
  hours: number[];
  capacity: number[];
  total: number;
  /** Wochen über der Kapazität */
  over: number;
  tasks: ResTask[];
}
export interface ResUse {
  /** Montag jeder Woche */
  weeks: string[];
  rows: ResRow[];
  /** Stunden an Vorgängen ohne bekannte Ressource (Aufwand ohne Zuständig) */
  open: number;
  /** Wochen jenseits von RES_WEEKS_MAX abgeschnitten */
  cut: boolean;
}

const r2 = (h: number) => Math.round(h * 100) / 100;

/** Stunden je Person an einem Vorgang. */
function shares(ws: Workspace, id: string): { person: string; hours: number }[] {
  const n = noteById(ws, id);
  if (!n) return [];
  if (n.use?.length) return n.use.filter((u) => (u.hours ?? 0) > 0).map((u) => ({ person: u.person, hours: u.hours! }));
  const a = n.assignee ?? n.delegated?.person;
  const h = n.effort?.plan ?? 0;
  return h > 0 ? [{ person: a ?? '', hours: h }] : [];
}

export function resourceUse(ws: Workspace, pid: string, day?: string, g: Gantt = ganttOf(ws, pid, day)): ResUse {
  const leaves = g.rows.filter((r) => r.planned && r.node.kind === 'task' && !r.node.summary && !r.node.milestone);
  const empty: ResUse = { weeks: [], rows: [], open: 0, cut: false };
  if (!leaves.length || !g.start) return empty;
  const first = mondayOf(g.start);
  const all: string[] = [];
  for (let w = first; w <= g.end; w = addDays(w, 7)) all.push(w);
  const cut = all.length > RES_WEEKS_MAX;
  const weeks = all.slice(0, RES_WEEKS_MAX);
  const idx = (d: string) => Math.floor((Date.parse(`${d}T12:00:00Z`) - Date.parse(`${first}T12:00:00Z`)) / (7 * 864e5));
  const rows = new Map<string, ResRow>();
  let open = 0;
  for (const r of leaves) {
    const days: string[] = [];
    for (let d = r.start; d <= r.end && days.length < 2000; d = addDays(d, 1)) if (isWorkday(d)) days.push(d);
    if (!days.length) days.push(r.start);
    for (const s of shares(ws, r.id)) {
      const p = personById(ws, s.person);
      if (!p) {
        open += s.hours;
        continue;
      }
      let row = rows.get(p.id);
      if (!row) {
        row = { person: p, hours: weeks.map(() => 0), capacity: weeks.map((w) => r2([0, 1, 2, 3, 4].reduce((c, k) => c + capacityOn(ws, p, addDays(w, k)), 0))), total: 0, over: 0, tasks: [] };
        rows.set(p.id, row);
      }
      const t: ResTask = { id: r.id, code: r.node.code, title: r.node.title, hours: weeks.map(() => 0), total: r2(s.hours) };
      const per = s.hours / days.length;
      for (const d of days) {
        const i = idx(d);
        if (i < 0 || i >= weeks.length) continue;
        t.hours[i] += per;
        row.hours[i] += per;
      }
      t.hours = t.hours.map(r2);
      row.total += s.hours;
      row.tasks.push(t);
    }
  }
  const list = [...rows.values()].map((row) => {
    const hours = row.hours.map(r2);
    return { ...row, hours, total: r2(row.total), over: hours.filter((h, i) => h > row.capacity[i] + 0.01).length };
  });
  list.sort((a, b) => Number(!!b.person.me) - Number(!!a.person.me) || b.total - a.total || a.person.name.localeCompare(b.person.name));
  return { weeks, rows: list, open: r2(open), cut };
}
