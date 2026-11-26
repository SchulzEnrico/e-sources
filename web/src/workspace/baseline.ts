/**
 * F-206 Schritt 10 (V115, K4): Basisplan – das Soll eines Projekts festhalten und mit dem heutigen Plan vergleichen,
 * wie „Basisplan speichern“ und die Spalten „Abweichung Ende“ in MS Project bzw. iTaskX. Ein Basisplan je Projekt
 * (K4: erst einer); speichern ersetzt ihn (mit Rückgängig), löschen ebenso. Reine Funktionen, Tests in gpm.test.ts.
 */
import type { BaselineTask, Project, ProjectBaseline, Workspace } from './types';
import { ganttOf } from './gantt';
import { planCost, planHours } from './gpm';
import { notesOf } from './notes';
import { addDays, workdaysBetween } from './schedule';

const projectsOf = (ws: Workspace): Project[] => ws.projects ?? [];
function withBaseline(ws: Workspace, pid: string, b: ProjectBaseline | undefined, now: number): Workspace {
  const list = projectsOf(ws);
  const i = list.findIndex((p) => p.id === pid);
  if (i < 0) return ws;
  const p: Project = { ...list[i], changed: now };
  if (b) p.baseline = b;
  else delete p.baseline;
  const projects = [...list];
  projects[i] = p;
  return { ...ws, projects };
}

/** Heutigen Plan als Basisplan festhalten: Anfang, Ende, Dauer, Aufwand und Kosten je Vorgang (auch Sammelvorgänge). */
export function snapshot(ws: Workspace, pid: string, at: string): ProjectBaseline | undefined {
  const p = projectsOf(ws).find((x) => x.id === pid);
  if (!p) return undefined;
  const g = ganttOf(ws, pid);
  const notes = new Map(notesOf(ws).map((n) => [n.id, n]));
  const tasks: Record<string, BaselineTask> = {};
  for (const r of g.rows) {
    const n = notes.get(r.id);
    if (!n || !r.planned) continue;
    const t: BaselineTask = { start: r.start, end: r.end, duration: n.milestone ? 0 : r.days };
    const h = planHours(ws, n);
    const c = planCost(ws, n);
    if (h !== undefined && !r.node.summary) t.effort = h;
    if (c !== undefined && !r.node.summary) t.cost = c;
    tasks[r.id] = t;
  }
  return { at, ...(g.rows.length ? { start: g.start, end: g.end } : {}), ...(p.budget !== undefined ? { budget: p.budget } : {}), tasks };
}

/** Basisplan speichern; gibt den alten (oder keinen) für „Rückgängig“ zurück. */
export function saveBaseline(ws: Workspace, pid: string, at = new Date().toISOString(), now = Date.now()): { ws: Workspace; prev?: ProjectBaseline } | null {
  const p = projectsOf(ws).find((x) => x.id === pid);
  const b = snapshot(ws, pid, at);
  if (!p || !b) return null;
  return { ws: withBaseline(ws, pid, b, now), ...(p.baseline ? { prev: p.baseline } : {}) };
}
/** Basisplan löschen bzw. (Rückgängig) einen früheren zurücksetzen. */
export function setBaseline(ws: Workspace, pid: string, b: ProjectBaseline | undefined, now = Date.now()): Workspace {
  return withBaseline(ws, pid, b, now);
}

/** Arbeitstage von a nach b (+ = später, − = früher). */
export const shift = (a: string, b: string): number => (a === b ? 0 : a < b ? workdaysBetween(addDays(a, 1), b) : -workdaysBetween(addDays(b, 1), a));

export interface BaseDiff {
  id: string;
  base?: BaselineTask;
  /** Abweichung in Arbeitstagen (+ = später/länger) */
  start?: number;
  end?: number;
  duration?: number;
  /** Kosten heute − Basis (€) */
  cost?: number;
  /** im Basisplan nicht enthalten */
  added: boolean;
}
export interface BaseCompare {
  at?: string;
  rows: Map<string, BaseDiff>;
  /** Vorgänge, die im Basisplan stehen, heute aber fehlen */
  removed: string[];
  /** Projektende heute gegen Basis (Arbeitstage) */
  end?: number;
  baseEnd?: string;
  /** Plan-Kosten heute gegen Basis (€) */
  cost?: number;
}
/** Soll/Ist-Vergleich je Vorgang wie die Tabelle „Abweichung“ in MS Project. */
export function compare(ws: Workspace, pid: string): BaseCompare {
  const p = projectsOf(ws).find((x) => x.id === pid);
  const b = p?.baseline;
  const rows = new Map<string, BaseDiff>();
  if (!p || !b) return { rows, removed: [] };
  const g = ganttOf(ws, pid);
  const notes = new Map(notesOf(ws).map((n) => [n.id, n]));
  let costNow = 0;
  let costBase = 0;
  for (const r of g.rows) {
    if (!r.planned) continue;
    const t = b.tasks[r.id];
    const n = notes.get(r.id);
    const c = n && !r.node.summary ? planCost(ws, n) : undefined;
    if (c) costNow += c;
    if (!t) {
      rows.set(r.id, { id: r.id, added: true });
      continue;
    }
    if (t.cost && !r.node.summary) costBase += t.cost;
    rows.set(r.id, {
      id: r.id,
      base: t,
      added: false,
      ...(t.start ? { start: shift(t.start, r.start) } : {}),
      ...(t.end ? { end: shift(t.end, r.end) } : {}),
      ...(t.duration !== undefined && !n?.milestone ? { duration: r.days - t.duration } : {}),
      ...(t.cost !== undefined && c !== undefined ? { cost: Math.round((c - t.cost) * 100) / 100 } : {}),
    });
  }
  const removed = Object.keys(b.tasks).filter((id) => !g.byId.has(id));
  return {
    at: b.at,
    rows,
    removed,
    ...(b.end && g.rows.length ? { end: shift(b.end, g.end), baseEnd: b.end } : {}),
    ...(costBase ? { cost: Math.round((costNow - costBase) * 100) / 100 } : {}),
  };
}
