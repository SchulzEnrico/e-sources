/**
 * F-206 Schritt 10 (V101): Gantt – Terminrechnung über die Vorgänger wie MS Project / iTaskX und nach IPMA ICB4
 * (Netzplantechnik): Vorwärtsrechnung (frühester Anfang/Ende), Rückwärtsrechnung (spätester Anfang/Ende),
 * Gesamtpuffer und kritischer Pfad. Anordnungsbeziehungen EA (Normalfolge), AA (Anfangsfolge), EE (Endfolge),
 * AE (Sprungfolge) mit Zeitabstand in Arbeitstagen (Kalender Mo–Fr, K7). Automatisch geplante Vorgänge
 * beginnen nie vor dem Projektstart und nie vor „nicht beginnen vor“; manuell geplante behalten ihre Termine
 * (K2: „nicht beginnen vor“ + Dauer). Sammelvorgänge ergeben sich aus ihren Kindern und geben ihre Vorgänger
 * an sie weiter (wie MS Project). Stichtag K3: liegt das gerechnete Ende nach „fällig am“, gibt es nur einen
 * Hinweis – nichts wird verschoben. Reine Funktionen, Tests in workspace.test.ts.
 *
 * Zeit als Grenzen zwischen Arbeitstagen: Vorgang [s, f) mit f = s + Dauer; Anfang = Tag s, Ende = Tag f − 1.
 * Ein Meilenstein liegt auf einer Grenze – vom Ende eines Vorgängers gesetzt zeigt er dessen letzten Tag
 * (MS Project: 17:00), sonst den Tag, an dem er beginnt (8:00).
 */
import type { Note, NoteLink, NoteRel, Workspace } from './types';
import { addLink, noteById, notesOf, removeLink, type Act } from './notes';
import { projectById } from './projects';
import { pspRows, pspTree, type PspNode } from './psp';
import { dayOfWorkdayNo, durationOf, isDay, isManual, workdayFrom, workdayNo } from './schedule';

export interface GanttPred {
  id: string;
  rel: NoteRel;
  lag: number;
  /** Nr. des Vorgängers in der Tabelle (wie MS Project), 0 = nicht in diesem Projekt. */
  nr: number;
}

export interface GanttRow {
  node: PspNode;
  id: string;
  /** Laufende Nummer in der ganzen Tabelle (ab 1), unabhängig vom Zuklappen. */
  nr: number;
  /** Hat Termine (leeres Teilprojekt nicht). */
  planned: boolean;
  start: string;
  end: string;
  /** Arbeitstage von Anfang bis Ende (Sammelvorgang: Spanne). */
  days: number;
  /** Gesamtpuffer in Arbeitstagen (negativ = Termin geht nicht auf). */
  float: number;
  critical: boolean;
  manual: boolean;
  /** Stichtag (K3): Ende liegt nach „fällig am“. */
  late: boolean;
  due?: string;
  /** Manuell: Vorgänger ließen frühestens diesen Anfang zu (später als geplant = Konflikt). */
  conflict?: string;
  /** Eigene Vorgänger (ohne geerbte). */
  preds: GanttPred[];
  /** Vorgänger aus anderen Projekten (zählen nicht). */
  outside: number;
  /** Steht in einem Kreis (Bezüge im Kreis zählen nicht). */
  loop: boolean;
}

export interface GanttArrow {
  from: string;
  to: string;
  rel: NoteRel;
  lag: number;
  /** Beide Enden kritisch und ohne Luft dazwischen. */
  critical: boolean;
}

export interface Gantt {
  rows: GanttRow[];
  byId: Map<string, GanttRow>;
  arrows: GanttArrow[];
  /** Erster und letzter Tag aller Termine. */
  start: string;
  end: string;
  /** Projektstart, ab dem gerechnet wird. */
  anchor: string;
  /** Kritische Vorgänge (ohne Sammelvorgänge) in zeitlicher Folge. */
  critical: string[];
  late: string[];
  loops: string[];
}

interface Calc {
  s: number;
  f: number;
  d: number;
  /** Meilenstein vom Ende eines Vorgängers gesetzt (zeigt den Tag davor). */
  atEnd: boolean;
  lf: number;
  /** Frühester Anfang aus den Vorgängern (für Konflikte manueller Vorgänge). */
  bound: number;
}

const EMPTY: Gantt = { rows: [], byId: new Map(), arrows: [], start: '', end: '', anchor: '', critical: [], late: [], loops: [] };

/** Vorgänger in MS-Project-Schreibweise: „3“, „5AA“, „10EA+1“, „7EE-2“ (EA ohne Abstand bleibt kurz). */
export function predText(p: Pick<GanttPred, 'nr' | 'rel' | 'lag'>): string {
  const lag = p.lag ? (p.lag > 0 ? `+${p.lag}` : String(p.lag)) : '';
  return `${p.nr}${p.rel === 'EA' && !lag ? '' : p.rel}${lag}`;
}
export const predsText = (ps: readonly GanttPred[]) => ps.filter((p) => p.nr > 0).map(predText).join('; ');

/** Heute als JJJJ-MM-TT (Ortszeit). */
const todayText = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Gantt eines Projekts rechnen (Reihenfolge der Zeilen = PSP). `today` nur für Projekte ohne Start und ohne
 * „nicht beginnen vor“.
 */
export function ganttOf(ws: Workspace, projectId: string, today = todayText()): Gantt {
  const p = projectById(ws, projectId);
  if (!p) return EMPTY;
  const flat = pspRows(pspTree(ws, projectId));
  if (!flat.length) return EMPTY;
  const notes = new Map<string, Note>();
  for (const r of flat) if (r.kind === 'task') { const n = noteById(ws, r.id); if (n) notes.set(r.id, n); }
  const nodeById = new Map(flat.map((r) => [r.id, r]));
  const parent = new Map<string, string>();
  const walk = (ns: PspNode[], up?: string) => ns.forEach((n) => { if (up) parent.set(n.id, up); walk(n.children, n.id); });
  walk(pspTree(ws, projectId));
  const nrOf = new Map(flat.map((r, i) => [r.id, i + 1]));
  const ancestors = (id: string): string[] => {
    const out: string[] = [];
    for (let u = parent.get(id); u; u = parent.get(u)) out.push(u);
    return out;
  };

  // Projektstart: Start im Steckbrief, sonst frühestes „nicht beginnen vor“, sonst heute
  const starts = [...notes.values()].map((n) => n.notBefore).filter(isDay).sort();
  const anchor = workdayFrom(isDay(p.start) ? p.start : starts[0] ?? today);
  const a0 = workdayNo(anchor);
  const no = (day: string) => workdayNo(day) - a0;
  const day = (i: number) => dayOfWorkdayNo(i + a0);

  // Bezüge innerhalb des Projekts; ein Vorgang erbt die Vorgänger seiner Sammelvorgänge
  const leaf = (r: PspNode) => r.children.length === 0;
  const ownLinks = (id: string): NoteLink[] => (notes.get(id)?.after ?? []).filter((l) => nodeById.has(l.id) && l.id !== id);
  const linksOf = new Map<string, NoteLink[]>();
  for (const r of flat) {
    if (!leaf(r) || r.kind !== 'task') continue;
    const all = [r.id, ...ancestors(r.id)].flatMap(ownLinks);
    linksOf.set(r.id, all);
  }

  // Reihenfolge (Kahn): Vorgänger vor Nachfolger, Kinder vor Sammelvorgang
  const deps = new Map<string, Set<string>>(flat.map((r) => [r.id, new Set<string>()]));
  for (const [id, ls] of linksOf) for (const l of ls) deps.get(id)!.add(l.id);
  for (const r of flat) if (!leaf(r)) for (const c of r.children) deps.get(r.id)!.add(c.id);
  const order: string[] = [];
  const indeg = new Map([...deps].map(([id, s]) => [id, s.size]));
  const users = new Map<string, string[]>();
  for (const [id, s] of deps) for (const d of s) users.set(d, [...(users.get(d) ?? []), id]);
  const queue = flat.map((r) => r.id).filter((id) => indeg.get(id) === 0);
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const u of users.get(id) ?? []) {
      indeg.set(u, indeg.get(u)! - 1);
      if (indeg.get(u) === 0) queue.push(u);
    }
  }
  const loops = flat.map((r) => r.id).filter((id) => !order.includes(id));
  const inLoop = new Set(loops);
  // Im Kreis: ohne die Bezüge im Kreis hinten anhängen (Kinder vor Sammelvorgängen)
  const rest = flat.map((r) => r.id).filter((id) => inLoop.has(id)).reverse();
  order.push(...rest.filter((id) => leaf(nodeById.get(id)!)), ...rest.filter((id) => !leaf(nodeById.get(id)!)));
  const usable = (id: string, l: NoteLink) => !(inLoop.has(id) && inLoop.has(l.id));

  // Vorwärtsrechnung
  const calc = new Map<string, Calc>();
  for (const id of order) {
    const r = nodeById.get(id)!;
    if (!leaf(r)) {
      const kids = r.children.map((c) => calc.get(c.id)).filter((c): c is Calc => !!c);
      if (!kids.length) continue;
      const s = Math.min(...kids.map((k) => k.s));
      const f = Math.max(...kids.map((k) => k.f));
      calc.set(id, { s, f, d: f - s, atEnd: false, lf: Infinity, bound: s });
      continue;
    }
    const n = notes.get(id);
    if (!n) continue;
    const d = durationOf(n);
    let s = 0;
    let atEnd = false;
    const up = (v: number, end: boolean) => {
      if (v > s || (v === s && !end && atEnd)) (s = v), (atEnd = end);
    };
    for (const u of [id, ...ancestors(id)]) {
      const nb = notes.get(u)?.notBefore;
      if (isDay(nb)) up(no(nb), false);
    }
    for (const l of linksOf.get(id) ?? []) {
      if (!usable(id, l)) continue;
      const q = calc.get(l.id);
      if (!q) continue;
      const lag = l.lag ?? 0;
      if (l.rel === 'EA') up(q.f + lag, true);
      else if (l.rel === 'AA') up(q.s + lag, false);
      else if (l.rel === 'EE') up(q.f + lag - d, true);
      else up(q.s + lag - d, false);
    }
    const bound = s;
    if (isManual(n)) {
      s = isDay(n.notBefore) ? no(n.notBefore) : 0;
      atEnd = false;
    }
    calc.set(id, { s, f: s + d, d, atEnd, lf: Infinity, bound });
  }
  const done = [...calc.values()];
  if (!done.length) return { ...EMPTY, anchor };
  const finish = Math.max(...done.map((c) => c.f));

  // Rückwärtsrechnung (spätestes Ende), Sammelvorgänge geben ihr spätestes Ende an die Kinder weiter
  for (const c of done) c.lf = finish;
  for (let k = order.length - 1; k >= 0; k--) {
    const id = order[k];
    const c = calc.get(id);
    if (!c) continue;
    const r = nodeById.get(id)!;
    if (!leaf(r)) {
      for (const ch of r.children) { const x = calc.get(ch.id); if (x) x.lf = Math.min(x.lf, c.lf); }
      continue;
    }
    const ls = c.lf - c.d;
    for (const l of linksOf.get(id) ?? []) {
      if (!usable(id, l)) continue;
      const q = calc.get(l.id);
      if (!q) continue;
      const lag = l.lag ?? 0;
      const v = l.rel === 'EA' ? ls - lag : l.rel === 'AA' ? ls - lag + q.d : l.rel === 'EE' ? c.lf - lag : c.lf - lag + q.d;
      q.lf = Math.min(q.lf, v);
    }
  }

  const dateOf = (c: Calc, ms: boolean) => {
    if (ms) { const t = day(c.atEnd ? c.s - 1 : c.s); return { start: t, end: t }; }
    return { start: day(c.s), end: day(Math.max(c.s, c.f - 1)) };
  };
  const rows: GanttRow[] = [];
  const byId = new Map<string, GanttRow>();
  for (const r of flat) {
    const n = notes.get(r.id);
    const own = n?.after ?? [];
    const preds = own.filter((l) => nodeById.has(l.id)).map((l) => ({ id: l.id, rel: l.rel, lag: l.lag ?? 0, nr: nrOf.get(l.id) ?? 0 }));
    const base = { node: r, id: r.id, nr: nrOf.get(r.id)!, manual: !!n && isManual(n), preds, outside: own.length - preds.length, loop: inLoop.has(r.id), ...(n?.due ? { due: n.due } : {}) };
    const c = calc.get(r.id);
    if (!c) {
      const row: GanttRow = { ...base, planned: false, start: '', end: '', days: 0, float: 0, critical: false, late: false };
      rows.push(row), byId.set(r.id, row);
      continue;
    }
    let start: string, end: string;
    if (leaf(r)) ({ start, end } = dateOf(c, !!n?.milestone));
    else {
      const leaves: string[] = [];
      const gather = (ns: PspNode[]) => ns.forEach((x) => (x.children.length ? gather(x.children) : calc.has(x.id) && leaves.push(x.id)));
      gather(r.children);
      const ds = leaves.map((x) => dateOf(calc.get(x)!, !!notes.get(x)?.milestone));
      start = ds.map((x) => x.start).sort()[0];
      end = ds.map((x) => x.end).sort().reverse()[0];
    }
    const row: GanttRow = { ...base, planned: true, start, end, days: c.d, float: c.lf - c.f, critical: false, late: !!n?.due && isDay(n.due) && end > n.due };
    if (row.manual && c.bound > c.s) row.conflict = day(c.bound);
    rows.push(row), byId.set(r.id, row);
  }
  // kritisch: Vorgänge ohne Puffer; Sammelvorgänge, wenn ein Kind kritisch ist
  for (const row of rows) if (row.planned && leaf(row.node)) row.critical = row.float <= 0;
  for (let k = rows.length - 1; k >= 0; k--) {
    const row = rows[k];
    if (!leaf(row.node)) row.critical = row.node.children.some((c) => byId.get(c.id)?.critical);
    if (!leaf(row.node) && row.planned) row.float = Math.min(...row.node.children.map((c) => byId.get(c.id)).filter((x): x is GanttRow => !!x?.planned).map((x) => x.float));
  }
  const arrows: GanttArrow[] = [];
  for (const row of rows) for (const pr of row.preds) {
    const a = byId.get(pr.id);
    if (!a?.planned || !row.planned) continue;
    arrows.push({ from: pr.id, to: row.id, rel: pr.rel, lag: pr.lag, critical: a.critical && row.critical && !(inLoop.has(pr.id) && inLoop.has(row.id)) });
  }
  const planned = rows.filter((r) => r.planned);
  const critical = planned.filter((r) => r.critical && leaf(r.node)).sort((x, y) => x.start.localeCompare(y.start) || x.end.localeCompare(y.end) || x.nr - y.nr).map((r) => r.id);
  return {
    rows,
    byId,
    arrows,
    start: planned.map((r) => r.start).sort()[0] ?? anchor,
    end: planned.map((r) => r.end).sort().reverse()[0] ?? anchor,
    anchor,
    critical,
    late: planned.filter((r) => r.late).map((r) => r.id),
    loops,
  };
}

// ---------------------------------------------------------------- Vorgänger eingeben (wie MS Project)

export interface PredInput {
  links: { id: string; rel: NoteRel; lag: number }[];
  /** Teile, die nicht passen (unbekannte Nr., Tippfehler). */
  bad: string[];
}

/** „3; 5AA+2; 7 EE -1“ lesen – Nr. aus der Tabelle; Trennzeichen ; oder , ; Abstand in Arbeitstagen. */
export function parsePredInput(text: string, rows: readonly Pick<GanttRow, 'nr' | 'id'>[]): PredInput {
  const byNr = new Map(rows.map((r) => [r.nr, r.id]));
  const out: PredInput = { links: [], bad: [] };
  for (const raw of text.split(/[;,]/)) {
    const part = raw.trim();
    if (!part) continue;
    const m = /^(\d+)\s*(EA|AA|EE|AE|FS|SS|FF|SF)?\s*(?:([+-])\s*(\d+)\s*(?:t|tg|tage?|d)?)?$/i.exec(part);
    const id = m ? byNr.get(Number(m[1])) : undefined;
    if (!m || !id) {
      out.bad.push(part);
      continue;
    }
    const en: Record<string, NoteRel> = { FS: 'EA', SS: 'AA', FF: 'EE', SF: 'AE' };
    const k = (m[2] ?? 'EA').toUpperCase();
    const rel = (en[k] ?? k) as NoteRel;
    const lag = m[4] ? Number(m[4]) * (m[3] === '-' ? -1 : 1) : 0;
    out.links = out.links.filter((l) => l.id !== id);
    out.links.push({ id, rel, lag });
  }
  return out;
}

export type PredResult = { ok: true; ws: Workspace } | { ok: false; reason: 'self' | 'family' | 'circle' | 'missing'; id?: string; path?: string[] };

/**
 * Vorgänger eines Vorgangs innerhalb des Projekts setzen (ersetzt die bisherigen im Projekt; Bezüge zu
 * Notizen außerhalb bleiben, „wartet darauf“ bleibt je Vorgänger erhalten). Verboten wie in MS Project:
 * eigener Sammelvorgang oder eigene Unter-Vorgänge; Kreise über Vorgänger (Weg in `path`).
 */
export function setPreds(ws: Workspace, projectId: string, id: string, links: PredInput['links'], act: Act = {}): PredResult {
  const n = noteById(ws, id);
  if (!n) return { ok: false, reason: 'missing' };
  const flat = pspRows(pspTree(ws, projectId));
  const inProject = new Set(flat.map((r) => r.id));
  const parent = new Map<string, string>();
  const walk = (ns: PspNode[], up?: string) => ns.forEach((x) => { if (up) parent.set(x.id, up); walk(x.children, x.id); });
  walk(pspTree(ws, projectId));
  const above = (x: string, y: string) => { for (let u = parent.get(y); u; u = parent.get(u)) if (u === x) return true; return false; };
  for (const l of links) {
    if (l.id === id) return { ok: false, reason: 'self', id: l.id };
    if (!notesOf(ws).some((x) => x.id === l.id)) return { ok: false, reason: 'missing', id: l.id };
    if (above(l.id, id) || above(id, l.id)) return { ok: false, reason: 'family', id: l.id };
  }
  let next = ws;
  const keep = new Map((n.after ?? []).map((l) => [l.id, l]));
  for (const l of n.after ?? []) if (inProject.has(l.id) && !links.some((x) => x.id === l.id)) next = removeLink(next, id, l.id, act);
  for (const l of links) {
    const r = addLink(next, id, l.id, { rel: l.rel, lag: l.lag, wait: keep.get(l.id)?.wait }, act);
    if (!r.ok) return { ok: false, reason: r.reason === 'circle' ? 'circle' : r.reason, id: l.id, path: r.path };
    next = r.ws;
  }
  // Reihenfolge wie eingegeben (Bezüge außerhalb vorn, wie bisher)
  const out = noteById(next, id);
  if (out?.after?.length) {
    const outer = out.after.filter((l) => !inProject.has(l.id));
    const inner = links.map((x) => out.after!.find((l) => l.id === x.id)!).filter(Boolean);
    const after = [...outer, ...inner];
    if (JSON.stringify(after) !== JSON.stringify(out.after)) next = { ...next, notes: notesOf(next).map((x) => (x.id === id ? { ...x, after } : x)) };
  }
  return { ok: true, ws: next };
}
