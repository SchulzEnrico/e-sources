/**
 * F-233 (V134): Liste der Beispielprojekte – je eins aus einem ICB4-Report (Level D). Jedes hat eigene Ids
 * (Präfix), einen eigenen Knopf in der Projektliste und im ⚙, und lässt sich ganz entfernen.
 */
import type { Workspace } from './types';
import * as Sp from './sampleProject';
import * as Sl from './sampleLogistics';

export type SampleKey = 'cg' | 'fp';
export interface SampleDef {
  key: SampleKey;
  /** Projekt-Id */
  id: string;
  name: string;
  /** Vorgänge und Rollen – für die Meldung */
  tasks: number;
  roles: number;
  /** Herkunft für den Hinweis */
  source: string;
  add: (ws: Workspace, now?: number) => Workspace;
  remove: (ws: Workspace) => Workspace;
}
export const SAMPLES: SampleDef[] = [
  { key: 'cg', id: Sp.SAMPLE_PROJECT, name: 'ColorGentlemen', tasks: 39, roles: 4, source: 'Projektreport ColorGentlemen (Lackiererei, IPMA ICB4 Level D)', add: Sp.addSampleProject, remove: Sp.removeSampleProject },
  { key: 'fp', id: Sl.LOGISTICS_PROJECT, name: 'Logistik-Center', tasks: 39, roles: 6, source: 'Projektreport FUTURE-P.ROOF (Logistik-Center, IPMA ICB4 Level D)', add: Sl.addLogisticsProject, remove: Sl.removeLogisticsProject },
];
export const sampleOf = (key: SampleKey | undefined): SampleDef => SAMPLES.find((s) => s.key === key) ?? SAMPLES[0];
export const hasSample = (ws: Workspace, key: SampleKey): boolean => (ws.projects ?? []).some((p) => p.id === sampleOf(key).id);
export const toggleSample = (ws: Workspace, key: SampleKey | undefined, on: boolean): Workspace => (on ? sampleOf(key).add(ws) : sampleOf(key).remove(ws));
