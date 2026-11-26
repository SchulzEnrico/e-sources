/**
 * F-206 Schritt 10 (V115): Netzplan (Vorgangsknoten-Netzplan nach DIN 69900, wie das Netzplandiagramm in
 * MS Project bzw. iTaskX). Je Vorgang ein Knoten mit frühestem/spätestem Anfang und Ende (FA, FE, SA, SE),
 * Dauer und Gesamtpuffer aus der Rechnung des Gantt (gantt.ts). Sammelvorgänge erscheinen nicht als Knoten:
 * ihre Vorgänger und Nachfolger gelten – wie im Gantt – für die Vorgänge darin. Spalten = Stufe in der
 * Abhängigkeitskette, Zeilen in Gantt-Reihenfolge. Reine Funktionen, Tests in gpm.test.ts.
 */
import type { Workspace } from './types';
import { ganttOf, type Gantt, type GanttRow } from './gantt';
import type { PspNode } from './psp';
import { addWorkdays } from './schedule';

export interface NetNode {
  id: string;
  row: GanttRow;
  /** Spalte (0 = ohne Vorgänger im Netz) und Zeile darin */
  col: number;
  line: number;
  /** frühester/spätester Anfang und Ende */
  es: string;
  ef: string;
  ls: string;
  lf: string;
}
export interface NetLink {
  from: string;
  to: string;
  critical: boolean;
}
export interface Network {
  nodes: NetNode[];
  byId: Map<string, NetNode>;
  links: NetLink[];
  cols: number;
}

/** Vorgänge (ohne Sammelvorgänge) unter einem Knoten. */
function leavesOf(n: PspNode): PspNode[] {
  return n.summary ? n.children.flatMap(leavesOf) : n.kind === 'task' ? [n] : n.children.flatMap(leavesOf);
}

export function networkOf(ws: Workspace, pid: string, g: Gantt = ganttOf(ws, pid)): Network {
  const rows = g.rows.filter((r) => r.planned && r.node.kind === 'task' && !r.node.summary);
  const ids = new Set(rows.map((r) => r.id));
  const nodeOf = new Map(g.rows.map((r) => [r.id, r.node]));
  const set = new Map<string, NetLink>();
  const inherited = new Set<string>();
  const add = (from: string, to: string, critical: boolean, viaSummary: boolean) => {
    if (from === to || !ids.has(from) || !ids.has(to)) return;
    const k = `${from}>${to}`;
    const old = set.get(k);
    if (!old || (critical && !old.critical)) set.set(k, { from, to, critical });
    if (viaSummary && !old) inherited.add(k);
    if (!viaSummary) inherited.delete(k);
  };
  for (const a of g.arrows) {
    const fn = nodeOf.get(a.from);
    const tn = nodeOf.get(a.to);
    if (!fn || !tn) continue;
    const froms = fn.summary ? leavesOf(fn) : [fn];
    const tos = tn.summary ? leavesOf(tn) : [tn];
    for (const f of froms) for (const t of tos) add(f.id, t.id, a.critical, fn.summary || tn.summary);
  }
  // Geerbte Bezüge (über Sammelvorgänge) ohne Umwege: weg, wenn das Ziel über einen anderen Vorgänger ohnehin erreicht wird
  const links = [...set.entries()]
    .filter(([k, l]) => !inherited.has(k) || ![...set.values()].some((x) => x.to === l.to && x.from !== l.from && reaches(set, l.from, x.from)))
    .map(([, l]) => l);
  // Spalte = längste Kette von Vorgängern (Kreise zählen nicht)
  const col = new Map<string, number>();
  const visiting = new Set<string>();
  const colOf = (id: string): number => {
    if (col.has(id)) return col.get(id)!;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    let c = 0;
    for (const l of links) if (l.to === id) c = Math.max(c, colOf(l.from) + 1);
    visiting.delete(id);
    col.set(id, c);
    return c;
  };
  const lines = new Map<number, number>();
  const nodes: NetNode[] = rows.map((r) => {
    const c = colOf(r.id);
    const line = lines.get(c) ?? 0;
    lines.set(c, line + 1);
    const fl = Math.max(0, r.float);
    return { id: r.id, row: r, col: c, line, es: r.start, ef: r.end, ls: fl ? addWorkdays(r.start, fl) : r.start, lf: fl ? addWorkdays(r.end, fl) : r.end };
  });
  return { nodes, byId: new Map(nodes.map((n) => [n.id, n])), links, cols: Math.max(0, ...nodes.map((n) => n.col)) + 1 };
}

function reaches(set: Map<string, NetLink>, a: string, b: string): boolean {
  const seen = new Set<string>();
  const stack = [a];
  while (stack.length) {
    const x = stack.pop()!;
    if (x === b) return true;
    if (seen.has(x)) continue;
    seen.add(x);
    for (const l of set.values()) if (l.from === x) stack.push(l.to);
  }
  return false;
}
