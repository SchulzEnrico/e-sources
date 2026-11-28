/**
 * V147 (F-232, Abgleich Projektauftrag mit dem Report): Projektsteckbrief in der Anordnung von Abbildung 3 im
 * Projektreport (S. 4) – ein Ort für die gerechneten und zusammengesetzten Werte, damit Blatt (Bildschirm) und
 * Bericht (Druck/PDF) dasselbe zeigen: Projektleiter/in, fixierte Meilensteine, Gesamtdauer, Kostensumme mit
 * Budget-Abgleich, Risikorücklage in %, offene Risiken. Dazu die Ergänzungen nach ICB4 (4.3.1 · 4.5.1), die nicht
 * auf dem Blatt des Reports stehen.
 */
import type { Note, Project, Workspace } from './types';
import { meOf, personById } from './persons';
import { rolesOf, tasksOfProject } from './projects';
import { risksOf } from './risks';
import { titleOf } from './notes';

/** Gesamtdauer in Monaten (gerundet, wie im Report „7 Monate“). */
export function monthsBetween(start?: string, end?: string): number | undefined {
  if (!start || !end || end < start) return undefined;
  const a = new Date(`${start}T00:00:00`);
  const b = new Date(`${end}T00:00:00`);
  const m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + (b.getDate() - a.getDate() + 1) / 30;
  return Math.max(0, Math.round(m));
}

export interface CharterMile {
  id: string;
  title: string;
  /** JJJJ-MM-TT */
  due?: string;
}
export interface CharterView {
  lead: string;
  clientIn: boolean;
  /** Auftraggeber mit Anschrift in einer Zeile (AG extern bzw. AG intern) */
  client: string;
  miles: CharterMile[];
  fixed: CharterMile[];
  months?: number;
  costSum: number;
  /** Kosten + Risikorücklage über dem Budget */
  over: boolean;
  /** Abstand zum Budget (Kosten + Rücklage), positiv = darunter */
  rest?: number;
  reservePct?: number;
  risks: string[];
}

/** Werte des Blatts, die nicht einfach ein Feld sind. */
export function charterView(ws: Workspace, p: Project): CharterView {
  const c = p.charter ?? {};
  const lead = rolesOf(p).find((r) => r.id === 'lead');
  // Rolle „Projektleitung“, sonst der Name aus der Freigabe PL, sonst du
  const leadName = (lead?.person && personById(ws, lead.person)?.name) || c.signPl?.trim() || meOf(ws)?.name || '';
  const mile = (n: Note): CharterMile => ({ id: n.id, title: titleOf(n), due: n.due ?? n.notBefore });
  const miles = tasksOfProject(ws, p.id).filter((n) => n.milestone).map(mile);
  const fixed = (c.fixed ?? []).map((id) => miles.find((m) => m.id === id)).filter((m): m is CharterMile => !!m);
  const costSum = (c.costPm ?? 0) + (c.costStaff ?? 0) + (c.costMaterial ?? 0);
  const rest = p.budget !== undefined ? p.budget - costSum - (c.reserve ?? 0) : undefined;
  return {
    lead: leadName,
    clientIn: c.clientKind !== 'ex',
    client: [c.client, c.clientAddress].filter(Boolean).join(', '),
    miles,
    fixed,
    months: monthsBetween(p.start, p.end),
    costSum,
    over: rest !== undefined && rest < 0,
    rest,
    reservePct: c.reserve !== undefined && p.budget ? Math.round((c.reserve / p.budget) * 1000) / 10 : undefined,
    risks: risksOf(ws, p.id).filter((r) => r.risk?.state !== 'closed').slice(0, 6).map((r) => titleOf(r)),
  };
}

/** Ergänzungen nach ICB4, die nicht auf dem Blatt von Abbildung 3 stehen (Reihenfolge wie im Formular). */
export const CHARTER_EXTRAS = ['benefitMeasure', 'businessCase', 'model', 'tailoring', 'complexity', 'success', 'approach', 'org'] as const;
export type CharterExtra = (typeof CHARTER_EXTRAS)[number];
