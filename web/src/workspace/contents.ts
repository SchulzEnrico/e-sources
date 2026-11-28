/**
 * V153 (F-232 P13, Entscheidungs-Doc „F-232 V132“, P13 wie Vorschlag): Inhaltsverzeichnis des Projekts.
 *
 * Alle Dokumente in der Reihenfolge des Reports (Formulare der Vorlage mit Kapitel), danach die Blätter der
 * Anlagen (Problemstellungen, Entscheidungsvorlagen) und die Ansichten mit eigenen Dokumenten. Dieselbe Liste
 * zeigt die Ansicht „Inhalt“ ganz vorn im Rad „Ansicht“; der Bericht (Druck/PDF) hat sein Inhaltsverzeichnis vorn.
 */
import type { Project, Workspace } from './types';
import * as Fk from './formKit';
import { feedbackOf } from './feedback';
import { decisionsOf } from './decisions';
import { changesOf, risksOf } from './risks';

export type ContentsView = 'feedback' | 'decide' | 'risks' | 'changes' | 'psp' | 'gantt' | 'net';

export interface ContentsEntry {
  /** Formular-Id (`form`) bzw. Ansicht (`view`) */
  id: string;
  kind: 'form' | 'view';
  chapter: string;
  name: string;
  /** Zeilen bzw. Blätter (Tabellen, Anlagen); fehlt bei Feldlisten und Grafiken */
  count?: number;
  /** leere Pflichtfelder nach GPM */
  missing: number;
  group: 'forms' | 'annex' | 'views';
  view?: ContentsView;
  icb?: string;
}

export function contentsOf(ws: Workspace, p: Project): ContentsEntry[] {
  const tpl = Fk.templateOf(ws, p);
  const out: ContentsEntry[] = tpl.forms.map((f) => {
    const rows = f.layout === 'table' || f.layout === 'record' ? Fk.rowsOf(ws, p.id, f).length : undefined;
    const missing = Fk.missingOf(ws, p.id, f).reduce((s, m) => s + m.keys.length, 0);
    return { id: f.id, kind: 'form', chapter: f.chapter, name: f.name, count: rows, missing, group: 'forms', icb: f.icb };
  });
  const fbs = feedbackOf(ws).filter((f) => f.project === p.id).length;
  const dcs = decisionsOf(ws).filter((d) => d.projectId === p.id).length;
  out.push({ id: 'an-fb', kind: 'view', view: 'feedback', chapter: 'A', name: 'Problemstellungen (Meldungen)', count: fbs, missing: 0, group: 'annex' });
  out.push({ id: 'an-dc', kind: 'view', view: 'decide', chapter: 'B', name: 'Entscheidungsvorlagen', count: dcs, missing: 0, group: 'annex' });
  const views: [ContentsView, string, number | undefined][] = [
    ['risks', 'Risikoliste', risksOf(ws, p.id).length],
    ['changes', 'Änderungsanträge', changesOf(ws, p.id).length],
    ['psp', 'Projektstrukturplan (PSP)', undefined],
    ['gantt', 'Balkenplan (Gantt)', undefined],
    ['net', 'Netzplan', undefined],
  ];
  for (const [v, name, count] of views) out.push({ id: `v-${v}`, kind: 'view', view: v, chapter: '', name, count, missing: 0, group: 'views' });
  return out;
}
