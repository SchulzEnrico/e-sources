/**
 * V148 (F-232, Abgleich 8.3 mit dem Report): Arbeitspaketbeschreibung in der Anordnung von Abbildung 11 im
 * Projektreport (S. 19) – ein Ort für die zusammengesetzten Werte, damit Blatt (Bildschirm) und Bericht (Druck/PDF)
 * dasselbe zeigen: Projektname mit Untertitel, Teilaufgabe, Projektleiter, Verantwortlicher, Dauer, Vorgänger und
 * Nachfolger aus dem Netzplan, Personal aus den Einsätzen (Arbeitsaufwand, Personalkosten).
 */
import type { Project, Workspace } from './types';
import { personById } from './persons';
import { noteById, successorsOf, titleOf } from './notes';
import { pspRows, pspTree, type PspNode } from './psp';
import { ganttOf } from './gantt';
import { planCost, planHours } from './gpm';
import { charterView, monthsBetween } from './charterSheet';

export interface WpStaff {
  name: string;
  hours?: number;
}
export interface WpView {
  /** Projektname mit Untertitel (erste Zeile des Oberziels), wie im Report */
  project: string;
  projectNo: string;
  /** Übergeordnete Teilaufgabe „Titel / Code“ */
  part: string;
  lead: string;
  owner: string;
  phase: string;
  start?: string;
  end?: string;
  /** „2 Monate“ bzw. „8 Tage“ (Arbeitstage aus dem Gantt) */
  duration: string;
  /** Vorgänger aus dem Netzplan als „Code Titel“ */
  preds: string[];
  succs: string[];
  staff: WpStaff[];
  hours?: number;
  cost?: number;
}

/** Werte des Blatts 8.3, die nicht einfach ein Feld sind. */
export function wpView(ws: Workspace, p: Project, rowId: string): WpView {
  const n = noteById(ws, rowId);
  const rows = pspRows(pspTree(ws, p.id));
  const codes = new Map(rows.map((r) => [r.id, r.code]));
  const at = rows.findIndex((r) => r.id === rowId);
  const node = at >= 0 ? rows[at] : undefined;
  let parent: PspNode | undefined;
  for (let i = at - 1; i >= 0 && node; i--) if (rows[i].depth < node.depth) { parent = rows[i]; break; }
  const g = ganttOf(ws, p.id).byId.get(rowId);
  const start = g?.planned ? g.start : undefined;
  const end = g?.planned ? g.end : undefined;
  const months = monthsBetween(start, end);
  const duration = months ? `${months} ${months === 1 ? 'Monat' : 'Monate'}` : g?.planned ? `${g.days} ${g.days === 1 ? 'Tag' : 'Tage'}` : '';
  const label = (id: string) => {
    const x = noteById(ws, id);
    return x ? [codes.get(id), titleOf(x)].filter(Boolean).join(' ') : '';
  };
  const name = (id?: string) => (id ? personById(ws, id)?.name ?? '' : '');
  const staff: WpStaff[] = n?.use?.length
    ? n.use.map((u) => ({ name: name(u.person), hours: u.hours })).filter((s) => s.name)
    : n?.assignee && n.effort?.plan
      ? [{ name: name(n.assignee), hours: n.effort.plan }]
      : [];
  return {
    project: [p.name, (p.brief?.goal ?? '').split('\n')[0]].filter(Boolean).join(' – '),
    projectNo: p.charter?.no ?? '',
    part: parent ? [parent.title, parent.code].filter(Boolean).join(' / ') : '',
    // wie im Steckbrief: Rolle „Projektleitung“, sonst Name aus der Freigabe PL, sonst ich
    lead: charterView(ws, p).lead,
    owner: name(n?.assignee),
    phase: p.phases?.find((x) => x.id === n?.phase)?.name ?? '',
    start,
    end,
    duration,
    preds: (n?.after ?? []).map((l) => label(l.id)).filter(Boolean),
    succs: n ? successorsOf(ws, n.id).map((s) => label(s.note.id)).filter(Boolean) : [],
    staff,
    hours: n ? planHours(ws, n) : undefined,
    cost: n ? planCost(ws, n) : undefined,
  };
}

/** Personal wie im Report: „Projektleiter 10 Ph“ je Zeile. */
export function staffLines(v: WpView): string[] {
  return v.staff.map((s) => [s.name, s.hours !== undefined ? `${s.hours.toLocaleString('de-DE')} Ph` : ''].filter(Boolean).join(' '));
}
