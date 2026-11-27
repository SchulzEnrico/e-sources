/**
 * F-233 (V134): Liste der Beispielprojekte – je eins aus einem ICB4-Report (Level D). Jedes hat eigene Ids
 * (Präfix), einen eigenen Knopf in der Projektliste und im ⚙, und lässt sich ganz entfernen.
 */
import type { Workspace } from './types';
import * as Sp from './sampleProject';
import { ensureMatrices } from './formKit';
import { removeSampleBy } from './sampleProject';

export type SampleKey = 'cg';
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
];
/** V135 (Enrico 12:10 „In der Demo soll ausschließlich der ColorGentlemen-Report als Beispielprojekt zu sehen sein“):
 * in der Online-Demo (gebaute Fassung) nur ColorGentlemen, beim Entwickeln (`npm run dev`) alle. */
export const shownSamples = (dev: boolean): SampleDef[] => SAMPLES.filter((s) => dev || s.key === 'cg');
export const sampleOf = (key: SampleKey | undefined): SampleDef => SAMPLES.find((s) => s.key === key) ?? SAMPLES[0];
export const hasSample = (ws: Workspace, key: SampleKey): boolean => (ws.projects ?? []).some((p) => p.id === sampleOf(key).id);
/**
 * V140 (F-237 H8): Beim Anlegen bekommt das Beispiel seine Eisenhower-Matrix wie Abb. 17; beim Entfernen gehen die
 * Matrizen des Projekts mit (die Einträge-Notizen gehören zum Beispiel und sind ohnehin weg).
 */
export function toggleSample(ws: Workspace, key: SampleKey | undefined, on: boolean): Workspace {
  const d = sampleOf(key);
  if (on) return ensureMatrices(d.add(ws));
  const out = d.remove(ws);
  const views = (out.noteViews ?? []).filter((v) => !(v.kind === 'eisenhower' && v.owner?.kind === 'project' && v.owner.id === d.id));
  return views.length === (out.noteViews ?? []).length ? out : { ...out, noteViews: views };
}

/**
 * V141 (Enrico 14:51 „Denk daran, dass du das Future-Proof-Projekt wieder raus nimmst“): das frühere zweite
 * Beispiel FUTURE-P.ROOF (Logistik-Center, V134) ist ganz entfernt; ein noch vorhandenes fällt beim Laden mit
 * seinen Vorgängen, Personen und Matrizen weg.
 */
export const RETIRED_FP = 'pj-fp';
export function dropRetiredSamples(ws: Workspace): Workspace {
  if (!(ws.projects ?? []).some((p) => p.id === RETIRED_FP)) return ws;
  const out = removeSampleBy(ws, RETIRED_FP, 'fp-', 'pn-fp-');
  const views = (out.noteViews ?? []).filter((v) => !(v.owner?.kind === 'project' && v.owner.id === RETIRED_FP));
  return views.length === (out.noteViews ?? []).length ? out : { ...out, noteViews: views };
}
