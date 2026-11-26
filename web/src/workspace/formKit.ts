/**
 * F-226 (V109, G1–G4): Formular-Baukasten. Ein Formular ist eine Vorlage aus Spalten bzw. Feldern über
 * den Objekten eines Projekts (gpm.ts, risks.ts, Notizen, Personen) – Eingabe = Ausgabe, keine Kopie
 * der Daten. Eigene Felder je Formular und Projekt (wie V106), Zeilen anlegen/löschen/verschieben,
 * „Als Vorlage speichern“. Mitgeliefert: Vorlage „GPM Level D“ nach GPM-Leitfaden Z01D Rev. 09 mit den
 * ICB4-Ergänzungen der Stufe 1. Reine Funktionen, Tests in workspace.test.ts („F-226 Baukasten“).
 */
import type {
  FormColumn,
  FormDef,
  FormFieldDef,
  FormFieldType,
  FormSource,
  FormTemplate,
  Note,
  Project,
  ProjectForms,
  Workspace,
} from './types';
import { addItem, editCharter, editItem, goalsOf, moveItem, nextCode, planCost, planHours, removeItem, riskLevels, riskValue, riskValueAfter, setPhase, setUse, undoRemoveItem, useCost, type GpmList, type GpmUndo, GOAL_KINDS, GOAL_LEVELS, MODELS, PROCURE_STATES, STAKE_STRATEGIES } from './gpm';
import { type Act, createNote, deleteNote, notesOf, type NoteUndo, restoreNotes, titleOf, updateNote } from './notes';
import { editProject, editRoles, projectById, rolesOf } from './projects';
import { addSteer, editRisk, risksOf, RISK_STATES, RISK_STRATEGIES, steerCode } from './risks';
import { editPerson, personById } from './persons';
import { pspRows, pspTree } from './psp';

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

// ---------------------------------------------------------------- Feldkatalog

/** Darstellung eines Felds; `long` = mehrzeilig, `lines` = eine Zeile je Eintrag. */
export type FieldKind = 'text' | 'long' | 'lines' | 'number' | 'money' | 'pct' | 'date' | 'choice' | 'bool' | 'person' | 'goal' | 'phase';
export interface FieldSpec {
  key: string;
  label: string;
  kind: FieldKind;
  options?: readonly { v: string; label: string }[];
  /** gerechnet bzw. nur Anzeige */
  readonly?: boolean;
  /** Pflichtfeld nach GPM (ab Werk) */
  gpm?: boolean;
  /** Erklärung des Begriffs (NF: Begriffe erklären) */
  help?: string;
}
const opts = <T extends string>(vs: readonly T[], labels: Record<T, string>) => vs.map((v) => ({ v, label: labels[v] }));

export const GOAL_KIND_LABEL = { perf: 'Leistungsziel', social: 'Sozialziel', non: 'Nicht-Ziel' } as const;
export const GOAL_LEVEL_LABEL = { must: 'MUSS', should: 'SOLL', can: 'KANN' } as const;
export const STAKE_STRATEGY_LABEL = { participative: 'partizipativ', informative: 'informativ', discursive: 'diskursiv', repressive: 'repressiv' } as const;
export const PROCURE_STATE_LABEL = { open: 'offen', asked: 'angefragt', offered: 'Angebot liegt vor', ordered: 'bestellt', delivered: 'geliefert' } as const;
export const MODEL_LABEL = { classic: 'klassisch', agile: 'agil', hybrid: 'hybrid' } as const;
const RISK_STRATEGY_LABEL = { avoid: 'vermeiden', reduce: 'vermindern', transfer: 'übertragen', accept: 'akzeptieren' } as const;
const RISK_STATE_LABEL = { open: 'offen', doing: 'in Bearbeitung', occurred: 'eingetreten', closed: 'erledigt' } as const;

export const FIELDS: Record<FormSource, readonly FieldSpec[]> = {
  charter: [
    { key: 'name', label: 'Projektname', kind: 'text', gpm: true },
    { key: 'no', label: 'Projektnummer', kind: 'text', gpm: true },
    { key: 'kind', label: 'Projektart', kind: 'text', gpm: true, help: 'z. B. Organisationsprojekt, Investitionsprojekt' },
    { key: 'client', label: 'Auftraggeber', kind: 'text', gpm: true },
    { key: 'clientKind', label: 'Auftraggeber intern/extern', kind: 'choice', options: [{ v: 'in', label: 'intern' }, { v: 'ex', label: 'extern' }] },
    { key: 'clientAddress', label: 'Anschrift Auftraggeber', kind: 'long' },
    { key: 'goal', label: 'Ausgangssituation und Projektziel', kind: 'long', gpm: true },
    { key: 'benefit', label: 'Nutzen', kind: 'long', gpm: true, help: 'ICB4 4.3.1: Was das Projekt der Organisation bringt' },
    { key: 'benefitMeasure', label: 'Messgröße des Nutzens', kind: 'text', help: 'ICB4 4.3.1: Woran der Nutzen gemessen wird' },
    { key: 'businessCase', label: 'Business Case und Strategiebezug', kind: 'long', help: 'ICB4 4.3.1: Begründung des Projekts aus Kosten und Nutzen' },
    { key: 'approach', label: 'Vorgehen', kind: 'long' },
    { key: 'model', label: 'Vorgehensmodell', kind: 'choice', options: opts(MODELS, MODEL_LABEL), help: 'ICB4 4.5.1: klassisch (Phasen), agil (Iterationen) oder hybrid' },
    { key: 'tailoring', label: 'Tailoring', kind: 'long', help: 'ICB4 4.5.1: Wie die Methoden auf dieses Projekt zugeschnitten sind' },
    { key: 'complexity', label: 'Projektkomplexität (1–5)', kind: 'number', help: 'ICB4 4.5.1: 1 einfach – 5 sehr komplex' },
    { key: 'success', label: 'Erfolgskriterien', kind: 'long', help: 'ICB4 4.5.1: Woran man nach dem Projekt den Erfolg erkennt' },
    { key: 'org', label: 'Projektorganisation', kind: 'long' },
    { key: 'start', label: 'Projektstart', kind: 'date', gpm: true },
    { key: 'end', label: 'Projektende', kind: 'date', gpm: true },
    { key: 'budget', label: 'Budget (€)', kind: 'money', gpm: true },
    { key: 'ownEffort', label: 'Eigenaufwand (Ph)', kind: 'number', help: 'Personenstunden der eigenen Leute' },
    { key: 'extEffort', label: 'Fremdaufwand (€)', kind: 'money' },
    { key: 'costPm', label: 'Kosten Projektmanagement (€)', kind: 'money' },
    { key: 'costStaff', label: 'Personalkosten (€)', kind: 'money' },
    { key: 'costMaterial', label: 'Sachkosten (€)', kind: 'money' },
    { key: 'reserve', label: 'Risikorücklage (€)', kind: 'money', help: 'Betrag für eintretende Risiken, meist ein Anteil vom Budget' },
    { key: 'reporting', label: 'Berichterstattung', kind: 'long' },
    { key: 'special', label: 'Besonderheiten', kind: 'long' },
    { key: 'releasePl', label: 'Freigabe Projektleitung', kind: 'date' },
    { key: 'releaseAg', label: 'Freigabe Auftraggeber', kind: 'date' },
  ],
  goals: [
    { key: 'code', label: 'Code', kind: 'text', gpm: true },
    { key: 'kind', label: 'Art', kind: 'choice', options: opts(GOAL_KINDS, GOAL_KIND_LABEL) },
    { key: 'text', label: 'Ziel', kind: 'long', gpm: true },
    { key: 'measure', label: 'Operationalisierung', kind: 'long', gpm: true, help: 'Woran man das Erreichen messen kann (Größe, Wert, Termin)' },
    { key: 'level', label: 'Priorität', kind: 'choice', options: opts(GOAL_LEVELS, GOAL_LEVEL_LABEL), gpm: true, help: 'MUSS = unverzichtbar, SOLL = wichtig, KANN = wünschenswert' },
    { key: 'owner', label: 'Verantwortlich', kind: 'person' },
    { key: 'consequence', label: 'Konsequenz bei Nichteinhaltung', kind: 'long' },
    { key: 'parent', label: 'Oberziel', kind: 'goal', help: 'Ziel, zu dem dieses Ziel beiträgt (Zielhierarchie)' },
  ],
  conflicts: [
    { key: 'a', label: 'Ziel A', kind: 'goal', gpm: true },
    { key: 'b', label: 'Ziel B', kind: 'goal', gpm: true },
    { key: 'text', label: 'Konflikt', kind: 'long', gpm: true },
    { key: 'measure', label: 'Maßnahme', kind: 'long' },
    { key: 'first', label: 'Vorrang', kind: 'choice', options: [{ v: 'a', label: 'Ziel A' }, { v: 'b', label: 'Ziel B' }] },
  ],
  stakeholders: [
    { key: 'code', label: 'Code', kind: 'text', gpm: true, help: 'SH-IN = intern, SH-EX = extern' },
    { key: 'name', label: 'Stakeholder', kind: 'text', gpm: true },
    { key: 'person', label: 'Person', kind: 'person', help: 'Verweis ins Personen-Cockpit; leer bei Gruppen wie „Anwohner“' },
    { key: 'side', label: 'intern/extern', kind: 'choice', options: [{ v: 'in', label: 'intern' }, { v: 'ex', label: 'extern' }] },
    { key: 'area', label: 'Umfeld', kind: 'choice', options: [{ v: 'fact', label: 'sachlich' }, { v: 'social', label: 'sozial' }] },
    { key: 'interests', label: 'Interessen und Erwartungen', kind: 'long', gpm: true },
    { key: 'fears', label: 'Befürchtungen', kind: 'long' },
    { key: 'attitude', label: 'Einstellung (−2 bis +2)', kind: 'number', help: '−2 klar dagegen, 0 neutral, +2 klar dafür' },
    { key: 'conflict', label: 'Konfliktpotenzial (1–3)', kind: 'number' },
    { key: 'power', label: 'Macht/Einfluss (1–3)', kind: 'number', help: 'ICB4 4.3.4: auch informeller Einfluss' },
    { key: 'strategy', label: 'Strategie', kind: 'choice', options: opts(STAKE_STRATEGIES, STAKE_STRATEGY_LABEL), gpm: true, help: 'partizipativ = einbinden, informativ = informieren, diskursiv = verhandeln, repressiv = durchsetzen' },
    { key: 'measures', label: 'Maßnahmen', kind: 'long', gpm: true },
  ],
  risks: [
    { key: 'code', label: 'Code', kind: 'text', readonly: true },
    { key: 'chance', label: 'Chance', kind: 'bool', help: 'Chance = positives Ereignis; sonst Risiko' },
    { key: 'title', label: 'Bezeichnung', kind: 'text', gpm: true },
    { key: 'cause', label: 'Ursache', kind: 'long', gpm: true },
    { key: 'event', label: 'Ereignis', kind: 'long' },
    { key: 'effect', label: 'Auswirkung', kind: 'long', gpm: true },
    { key: 'ew', label: 'EW (%)', kind: 'pct', gpm: true, help: 'Eintrittswahrscheinlichkeit in Prozent' },
    { key: 'impact', label: 'Tragweite (€)', kind: 'money', gpm: true, help: 'Schaden bzw. Nutzen in Euro, wenn es eintritt' },
    { key: 'value', label: 'Risikowert (€)', kind: 'money', readonly: true, help: 'EW × Tragweite' },
    { key: 'p', label: 'W (1–5)', kind: 'number', help: 'Stufe der Wahrscheinlichkeit; mit EW gerechnet' },
    { key: 'i', label: 'A (1–5)', kind: 'number', help: 'Stufe der Auswirkung; mit Tragweite und Budget gerechnet' },
    { key: 'strategy', label: 'Strategie', kind: 'choice', options: opts(RISK_STRATEGIES, RISK_STRATEGY_LABEL) },
    { key: 'measure', label: 'Maßnahmen', kind: 'long', gpm: true },
    { key: 'valueAfter', label: 'Wert nach Maßnahme (€)', kind: 'money', readonly: true },
    { key: 'owner', label: 'Risikoeigner', kind: 'person' },
    { key: 'state', label: 'Zustand', kind: 'choice', options: opts(RISK_STATES, RISK_STATE_LABEL) },
  ],
  phases: [
    { key: 'name', label: 'Phase', kind: 'text', gpm: true },
    { key: 'focus', label: 'Schwerpunkt', kind: 'long', gpm: true },
    { key: 'goal', label: 'Phasenziel', kind: 'long' },
    { key: 'start', label: 'Beginn', kind: 'date', gpm: true },
    { key: 'end', label: 'Ende', kind: 'date', gpm: true },
    { key: 'share', label: 'Aufwand (%)', kind: 'pct' },
    { key: 'release', label: 'Freigabe am', kind: 'date' },
  ],
  milestones: [
    { key: 'code', label: 'Code', kind: 'text', readonly: true },
    { key: 'title', label: 'Meilenstein', kind: 'text', gpm: true },
    { key: 'due', label: 'Termin', kind: 'date', gpm: true },
    { key: 'phase', label: 'Phase', kind: 'phase' },
    { key: 'results', label: 'Ergebnisse', kind: 'lines', gpm: true, help: 'Eine Zeile je Ergebnis' },
  ],
  tasks: [
    { key: 'code', label: 'PSP-Code', kind: 'text', readonly: true },
    { key: 'title', label: 'Arbeitspaket', kind: 'text', gpm: true },
    { key: 'phase', label: 'Phase', kind: 'phase' },
    { key: 'assignee', label: 'Verantwortlich', kind: 'person' },
    { key: 'hours', label: 'Aufwand (Ph)', kind: 'number', help: 'Von Hand; sonst Summe der Einsätze' },
    { key: 'cost', label: 'Kosten (€)', kind: 'money', help: 'Von Hand; sonst Stunden × Stundensatz der Einsätze' },
    { key: 'results', label: 'Lieferobjekte', kind: 'lines', help: 'ICB4 4.5.3: Ergebnisse des Arbeitspakets, eine Zeile je Lieferobjekt' },
  ],
  uses: [
    { key: 'task', label: 'Arbeitspaket', kind: 'text', readonly: true },
    { key: 'person', label: 'Ressource', kind: 'text', readonly: true },
    { key: 'hours', label: 'Aufwand (Ph)', kind: 'number', gpm: true },
    { key: 'rate', label: 'Stundensatz (€)', kind: 'money', readonly: true },
    { key: 'cost', label: 'Kosten (€)', kind: 'money', help: 'Leer = Aufwand × Stundensatz; eine Eingabe geht vor' },
  ],
  persons: [
    { key: 'name', label: 'Ressource', kind: 'text', readonly: true },
    { key: 'qual', label: 'Qualifikation', kind: 'long' },
    { key: 'org', label: 'Firma/Funktion', kind: 'text' },
    { key: 'rate', label: 'Stundensatz (€)', kind: 'money', gpm: true },
    { key: 'capacity', label: 'Kapazität (h/Woche)', kind: 'number' },
  ],
  procure: [
    { key: 'title', label: 'Gegenstand', kind: 'text', gpm: true },
    { key: 'make', label: 'Make or Buy', kind: 'choice', options: [{ v: 'make', label: 'selbst machen' }, { v: 'buy', label: 'zukaufen' }], help: 'Selbst erstellen oder einkaufen' },
    { key: 'supplier', label: 'Lieferant', kind: 'text' },
    { key: 'offer', label: 'Angebot (€)', kind: 'money' },
    { key: 'contract', label: 'Vertrag', kind: 'text' },
    { key: 'due', label: 'benötigt bis', kind: 'date' },
    { key: 'state', label: 'Zustand', kind: 'choice', options: opts(PROCURE_STATES, PROCURE_STATE_LABEL) },
  ],
  roles: [
    { key: 'name', label: 'Rolle bzw. Instanz', kind: 'text', gpm: true },
    { key: 'person', label: 'Besetzt mit', kind: 'person', gpm: true },
  ],
};
export const fieldSpec = (src: FormSource, key: string): FieldSpec | undefined => FIELDS[src].find((f) => f.key === key);

// ---------------------------------------------------------------- Vorlage „GPM Level D“

const cols = (src: FormSource, keys?: string[]): FormColumn[] => (keys ?? FIELDS[src].map((f) => f.key)).map((key) => ({ key }));
export const GPM_D_ID = 'gpm-d';
/** G3: nach GPM-Leitfaden Z01D Rev. 09, Kapitel wie im Report; dazu ICB4-Ergänzungen der Stufe 1 (G11). */
export const GPM_D: FormTemplate = {
  id: GPM_D_ID,
  name: 'GPM Level D',
  forms: [
    { id: 'charter', chapter: '2.1', name: 'Projektsteckbrief', source: 'charter', layout: 'fields', columns: cols('charter'), stage: 1, icb: '4.5.1 · 4.3.1' },
    { id: 'goals', chapter: '2.2', name: 'Projektziele', source: 'goals', layout: 'table', columns: cols('goals'), filter: 'perf,social', stage: 1, icb: '4.5.2' },
    { id: 'nongoals', chapter: '2.2', name: 'Nicht-Ziele', source: 'goals', layout: 'table', columns: cols('goals', ['code', 'text', 'consequence']), filter: 'non', stage: 1, icb: '4.5.2 · 4.5.3' },
    { id: 'conflicts', chapter: '2.3', name: 'Zielkonflikte', source: 'conflicts', layout: 'table', columns: cols('conflicts'), stage: 1, icb: '4.5.2' },
    { id: 'stakeholders', chapter: '4', name: 'Stakeholderanalyse', source: 'stakeholders', layout: 'table', columns: cols('stakeholders'), stage: 1, icb: '4.5.12 · 4.3.4' },
    { id: 'risks', chapter: '5', name: 'Chancen und Risiken', source: 'risks', layout: 'table', columns: cols('risks'), stage: 1, icb: '4.5.11' },
    { id: 'roles', chapter: '6.2', name: 'Projektorganisation', source: 'roles', layout: 'table', columns: cols('roles'), stage: 1, icb: '4.5.5 · 4.3.2' },
    { id: 'phases', chapter: '7', name: 'Phasenplan', source: 'phases', layout: 'table', columns: cols('phases'), stage: 1, icb: '4.5.4' },
    { id: 'milestones', chapter: '7', name: 'Meilensteine', source: 'milestones', layout: 'table', columns: cols('milestones'), stage: 1, icb: '4.5.4' },
    { id: 'tasks', chapter: '8', name: 'Arbeitspakete', source: 'tasks', layout: 'table', columns: cols('tasks'), stage: 1, icb: '4.5.3 · 4.5.4' },
    { id: 'persons', chapter: '10', name: 'Ressourcen', source: 'persons', layout: 'table', columns: cols('persons'), stage: 1, icb: '4.5.8' },
    { id: 'uses', chapter: '10', name: 'Einsatz je Arbeitspaket', source: 'uses', layout: 'table', columns: cols('uses'), stage: 1, icb: '4.5.8 · 4.5.7' },
    { id: 'procure', chapter: '11', name: 'Beschaffung', source: 'procure', layout: 'table', columns: cols('procure'), stage: 1, icb: '4.5.9' },
  ],
};

export const templatesOf = (ws: Workspace): FormTemplate[] => [GPM_D, ...(ws.formTemplates ?? [])];
export const templateOf = (ws: Workspace, p: Project | undefined): FormTemplate => templatesOf(ws).find((t) => t.id === p?.forms?.template) ?? GPM_D;

/** Spalte im Formular, aufgelöst: eingebautes oder eigenes Feld. */
export interface FormCol {
  key: string;
  label: string;
  kind: FieldKind;
  options?: readonly { v: string; label: string }[];
  readonly?: boolean;
  required?: boolean;
  help?: string;
  /** eigenes Feld (aus Vorlage oder Projekt) */
  custom?: FormFieldDef;
  /** eigenes Feld nur dieses Projekts (löschbar) */
  own?: boolean;
}
const kindOfType = (t: FormFieldType): FieldKind => (t === 'number' ? 'number' : t === 'date' ? 'date' : t === 'choice' ? 'choice' : t === 'bool' ? 'bool' : t === 'person' ? 'person' : 'text');
const customCol = (f: FormFieldDef, own: boolean): FormCol => ({
  key: `custom:${f.id}`,
  label: f.name,
  kind: kindOfType(f.type),
  ...(f.options ? { options: f.options.map((o) => ({ v: o, label: o })) } : {}),
  ...(f.required ? { required: true } : {}),
  custom: f,
  ...(own ? { own: true } : {}),
});

/** Spalten eines Formulars im Projekt: Vorlage ohne ausgeblendete, dann eigene Felder der Vorlage und des Projekts. */
export function columnsOf(p: Project | undefined, form: FormDef, withHidden = false): FormCol[] {
  const hidden = new Set(p?.forms?.hidden?.[form.id] ?? []);
  const out: FormCol[] = [];
  for (const c of form.columns) {
    if (!withHidden && hidden.has(c.key)) continue;
    if (c.key.startsWith('custom:')) {
      const f = form.fields?.find((x) => `custom:${x.id}` === c.key);
      if (f) out.push(customCol(f, false));
      continue;
    }
    const s = fieldSpec(form.source, c.key);
    if (!s) continue;
    out.push({ key: s.key, label: c.label ?? s.label, kind: s.kind, ...(s.options ? { options: s.options } : {}), ...(s.readonly ? { readonly: true } : {}), ...((c.required ?? s.gpm) ? { required: true } : {}), ...(s.help ? { help: s.help } : {}) });
  }
  for (const f of form.fields ?? []) if (!form.columns.some((c) => c.key === `custom:${f.id}`) && (withHidden || !hidden.has(`custom:${f.id}`))) out.push(customCol(f, false));
  for (const f of p?.forms?.extra?.[form.id] ?? []) if (withHidden || !hidden.has(`custom:${f.id}`)) out.push(customCol(f, true));
  return out;
}

// ---------------------------------------------------------------- Zeilen

export interface FormRow {
  id: string;
  /** Vorgang bzw. Notiz hinter der Zeile */
  note?: string;
  /** Einsatz: Person */
  person?: string;
  /** Tiefe (Ziele: Hierarchie, Arbeitspakete: PSP) */
  depth?: number;
}

const goalDepth = (p: Project, id: string): number => {
  let d = 0;
  let cur = p.goals?.find((g) => g.id === id);
  const seen = new Set<string>();
  while (cur?.parent && !seen.has(cur.parent) && d < 10) {
    seen.add(cur.parent);
    cur = p.goals?.find((g) => g.id === cur!.parent);
    d++;
  }
  return d;
};
const taskRows = (ws: Workspace, pid: string) => pspRows(pspTree(ws, pid)).filter((n) => n.kind === 'task' && n.owner === pid);
/** Personen eines Projekts: Einsätze, Zuständige, Instanzen, Stakeholder mit Person. */
export function projectPersons(ws: Workspace, pid: string): string[] {
  const p = projectById(ws, pid);
  const ids: string[] = [];
  const add = (x: string | undefined) => x && !ids.includes(x) && personById(ws, x) && ids.push(x);
  for (const n of notesOf(ws)) if (n.project === pid && n.state !== 'archived') {
    add(n.assignee);
    for (const u of n.use ?? []) add(u.person);
  }
  for (const r of rolesOf(p)) add(r.person);
  for (const s of p?.stakeholders ?? []) add(s.person);
  return ids;
}

/** Zeilen eines Formulars (Feldliste: genau eine Zeile = das Projekt). */
export function rowsOf(ws: Workspace, pid: string, form: FormDef): FormRow[] {
  const p = projectById(ws, pid);
  if (!p) return [];
  switch (form.source) {
    case 'charter':
      return [{ id: pid }];
    case 'goals': {
      const kinds = form.filter ? form.filter.split(',') : undefined;
      return goalsOf(p).filter((g) => !kinds || kinds.includes(g.kind ?? 'perf')).map((g) => ({ id: g.id, depth: goalDepth(p, g.id) }));
    }
    case 'conflicts':
      return (p.conflicts ?? []).map((c) => ({ id: c.id }));
    case 'stakeholders':
      return (p.stakeholders ?? []).map((s) => ({ id: s.id }));
    case 'phases':
      return (p.phases ?? []).map((x) => ({ id: x.id }));
    case 'risks':
      return risksOf(ws, pid)
        .filter((n) => !form.filter || (form.filter === 'chance') === !!n.risk?.chance)
        .map((n) => ({ id: n.id, note: n.id }));
    case 'milestones':
      return taskRows(ws, pid).filter((n) => n.milestone).map((n) => ({ id: n.id, note: n.id }));
    case 'tasks':
      return taskRows(ws, pid).filter((n) => !n.milestone).map((n) => ({ id: n.id, note: n.id, depth: n.depth }));
    case 'uses': {
      const out: FormRow[] = [];
      for (const t of taskRows(ws, pid)) {
        const n = notesOf(ws).find((x) => x.id === t.id);
        for (const u of n?.use ?? []) out.push({ id: `${t.id}|${u.person}`, note: t.id, person: u.person });
      }
      return out;
    }
    case 'persons':
      return projectPersons(ws, pid).map((id) => ({ id, person: id }));
    case 'procure':
      return notesOf(ws).filter((n) => n.project === pid && n.type === 'procurement' && n.state !== 'archived').map((n) => ({ id: n.id, note: n.id }));
    case 'roles':
      return rolesOf(p).map((r) => ({ id: r.id }));
  }
}

// ---------------------------------------------------------------- Lesen und Schreiben einer Zelle

export type CellValue = string | number | boolean | undefined;
const noteOf = (ws: Workspace, id: string | undefined): Note | undefined => (id ? notesOf(ws).find((n) => n.id === id) : undefined);
const splitRow = (rowId: string) => {
  const i = rowId.indexOf('|');
  return i < 0 ? { note: rowId, person: '' } : { note: rowId.slice(0, i), person: rowId.slice(i + 1) };
};

/** Wert einer Zelle (Listen als Text mit einer Zeile je Eintrag). */
export function cellValue(ws: Workspace, pid: string, form: FormDef, rowId: string, key: string): CellValue {
  const p = projectById(ws, pid);
  if (!p) return undefined;
  if (key.startsWith('custom:')) return p.forms?.values?.[rowId]?.[key.slice(7)];
  switch (form.source) {
    case 'charter': {
      if (key === 'name') return p.name;
      if (key === 'start' || key === 'end' || key === 'budget') return p[key];
      if (key === 'goal' || key === 'approach' || key === 'org') return p.brief?.[key];
      return (p.charter as Record<string, CellValue> | undefined)?.[key];
    }
    case 'goals':
    case 'conflicts':
    case 'stakeholders':
    case 'phases':
      return ((p[form.source] ?? []) as unknown as Record<string, CellValue>[]).find((x) => x.id === rowId)?.[key];
    case 'risks': {
      const n = noteOf(ws, rowId);
      const r = n?.risk;
      if (!n || !r) return undefined;
      if (key === 'code') return steerCode(ws, n);
      if (key === 'title') return titleOf(n);
      if (key === 'value') return riskValue(r);
      if (key === 'valueAfter') return riskValueAfter(r);
      if (key === 'p' || key === 'i') return riskLevels(r, p.budget)[key];
      if (key === 'chance') return !!r.chance;
      return (r as unknown as Record<string, CellValue>)[key];
    }
    case 'milestones':
    case 'tasks': {
      const n = noteOf(ws, rowId);
      if (!n) return undefined;
      if (key === 'code') return taskRows(ws, pid).find((t) => t.id === rowId)?.code;
      if (key === 'title') return titleOf(n);
      if (key === 'results') return n.results?.join('\n');
      if (key === 'hours') return planHours(ws, n);
      if (key === 'cost') return planCost(ws, n);
      return (n as unknown as Record<string, CellValue>)[key];
    }
    case 'uses': {
      const { note, person } = splitRow(rowId);
      const n = noteOf(ws, note);
      const u = n?.use?.find((x) => x.person === person);
      if (!n || !u) return undefined;
      const rate = personById(ws, person)?.rate;
      if (key === 'task') return titleOf(n);
      if (key === 'person') return personById(ws, person)?.name ?? person;
      if (key === 'hours') return u.hours;
      if (key === 'rate') return rate;
      if (key === 'cost') return useCost(u, rate);
      return undefined;
    }
    case 'persons': {
      const x = personById(ws, rowId);
      return x ? (x as unknown as Record<string, CellValue>)[key] : undefined;
    }
    case 'procure': {
      const n = noteOf(ws, rowId);
      if (!n) return undefined;
      if (key === 'title') return titleOf(n);
      if (key === 'due') return n.due;
      return (n.procure as Record<string, CellValue> | undefined)?.[key];
    }
    case 'roles': {
      const r = rolesOf(p).find((x) => x.id === rowId);
      return r ? (r as unknown as Record<string, CellValue>)[key] : undefined;
    }
  }
}

/** Ist die Zelle von Hand gesetzt (true) oder gerechnet? Nur für W/A, Aufwand, Kosten. */
export function cellAuto(ws: Workspace, pid: string, form: FormDef, rowId: string, key: string): boolean {
  const p = projectById(ws, pid);
  if (form.source === 'risks' && (key === 'p' || key === 'i')) {
    const l = riskLevels(noteOf(ws, rowId)?.risk, p?.budget);
    return key === 'p' ? l.pAuto : l.iAuto;
  }
  if (form.source === 'tasks' && (key === 'hours' || key === 'cost')) {
    const n = noteOf(ws, rowId);
    return !!n?.use?.length && (key === 'hours' ? n.effort?.plan === undefined : n.cost?.plan === undefined);
  }
  if (form.source === 'uses' && key === 'cost') {
    const { note, person } = splitRow(rowId);
    return noteOf(ws, note)?.use?.find((u) => u.person === person)?.cost === undefined;
  }
  return false;
}

const num = (v: CellValue): number | null => (v === undefined || v === '' ? null : typeof v === 'number' ? v : Number.isFinite(Number(String(v).replace(',', '.'))) ? Number(String(v).replace(',', '.')) : null);
const strOrNull = (v: CellValue): string | null => (v === undefined || v === '' ? null : String(v));

function patchNote(ws: Workspace, id: string, fn: (n: Note) => Note, now: number): Workspace {
  let hit = false;
  const notes = notesOf(ws).map((n) => {
    if (n.id !== id) return n;
    const next = fn(n);
    if (JSON.stringify(next) === JSON.stringify(n)) return n;
    hit = true;
    return { ...next, changed: now };
  });
  return hit ? { ...ws, notes } : ws;
}
const setOpt = <T extends object>(o: T, k: string, v: unknown): T => {
  const out = { ...o } as Record<string, unknown>;
  if (v === null || v === undefined || v === '') delete out[k];
  else out[k] = v;
  return out as T;
};

/** Zelle setzen – schreibt in das Objekt hinter der Zeile (G2 „und andersrum“). Leer löscht. */
export function setCell(ws: Workspace, pid: string, form: FormDef, rowId: string, key: string, v: CellValue, act: Act = {}): Workspace {
  const now = act.now ?? Date.now();
  const p = projectById(ws, pid);
  if (!p) return ws;
  if (key.startsWith('custom:')) return setCustomValue(ws, pid, rowId, key.slice(7), v, now);
  const spec = fieldSpec(form.source, key);
  if (!spec || spec.readonly) return ws;
  const isNumKind = spec.kind === 'number' || spec.kind === 'money' || spec.kind === 'pct';
  const val: unknown = spec.kind === 'bool' ? v === true : isNumKind ? num(v) : strOrNull(v);
  switch (form.source) {
    case 'charter':
      if (key === 'name') return typeof val === 'string' ? editProject(ws, pid, { name: val }, now) : ws;
      if (key === 'start' || key === 'end' || key === 'budget') return editProject(ws, pid, { [key]: val ?? undefined }, now);
      if (key === 'goal' || key === 'approach' || key === 'org') return editProject(ws, pid, { brief: { [key]: (val as string | null) ?? '' } }, now);
      return editCharter(ws, pid, { [key]: val }, now);
    case 'goals':
    case 'conflicts':
    case 'stakeholders':
    case 'phases':
      return editItem(ws, pid, form.source, rowId, { [key]: val }, now);
    case 'risks':
      if (key === 'title') return typeof val === 'string' ? updateNote(ws, rowId, { title: val }, act) : ws;
      if (key === 'chance') return editRisk(ws, rowId, { chance: val === true ? true : null }, now);
      if (key === 'p' || key === 'i') return editRisk(ws, rowId, { [key]: typeof val === 'number' && val >= 1 && val <= 5 ? Math.round(val) : null } as never, now);
      return editRisk(ws, rowId, { [key]: val } as never, now);
    case 'milestones':
    case 'tasks':
      if (key === 'title') return typeof val === 'string' ? updateNote(ws, rowId, { title: val }, act) : ws;
      if (key === 'due') return updateNote(ws, rowId, { due: (val as string | null) ?? undefined }, act);
      if (key === 'assignee') return updateNote(ws, rowId, { assignee: (val as string | null) ?? undefined }, act);
      if (key === 'phase') return setPhase(ws, rowId, (val as string | null) ?? undefined, now);
      if (key === 'results') {
        const lines = typeof val === 'string' ? val.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 50) : [];
        return patchNote(ws, rowId, (n) => setOpt(n, 'results', lines.length ? lines : null), now);
      }
      if (key === 'hours') return patchNote(ws, rowId, (n) => setOpt(n, 'effort', setOpt(n.effort ?? {}, 'plan', val)), now);
      if (key === 'cost') return patchNote(ws, rowId, (n) => setOpt(n, 'cost', setOpt(n.cost ?? {}, 'plan', val)), now);
      return ws;
    case 'uses': {
      const { note, person } = splitRow(rowId);
      if (key === 'hours') return setUse(ws, note, person, { hours: val as number | null }, now);
      if (key === 'cost') return setUse(ws, note, person, { cost: val as number | null }, now);
      return ws;
    }
    case 'persons':
      return editPerson(ws, rowId, { [key]: val === null ? undefined : val } as never);
    case 'procure':
      if (key === 'title') return typeof val === 'string' ? updateNote(ws, rowId, { title: val }, act) : ws;
      if (key === 'due') return updateNote(ws, rowId, { due: (val as string | null) ?? undefined }, act);
      return patchNote(ws, rowId, (n) => {
        const pr = setOpt(n.procure ?? {}, key, val);
        return setOpt(n, 'procure', Object.keys(pr).length ? pr : null);
      }, now);
    case 'roles':
      if (key === 'name') return typeof val === 'string' ? editRoles(ws, pid, { kind: 'name', role: rowId, name: val }) : ws;
      return editRoles(ws, pid, { kind: 'person', role: rowId, person: (val as string | null) ?? undefined });
  }
}

// ---------------------------------------------------------------- Zeilen anlegen, löschen, verschieben

const LIST: Partial<Record<FormSource, GpmList>> = { goals: 'goals', conflicts: 'conflicts', stakeholders: 'stakeholders', phases: 'phases' };
/** Kann das Formular Zeilen anlegen? (Ressourcen entstehen über Einsätze; Einsätze brauchen Vorgang und Person.) */
export const canAddRow = (form: FormDef): boolean => form.layout === 'table' && form.source !== 'persons';
/** Kann man Zeilen von Hand verschieben? (nur Listen am Projekt) */
export const canMoveRow = (form: FormDef): boolean => !!LIST[form.source];

/** G4: Zeile anlegen; Einsatz braucht `init.task` und `init.person`, Zielkonflikt nimmt sonst die ersten zwei Ziele. */
export function addRow(ws: Workspace, pid: string, form: FormDef, act: Act & { id: string; at?: number; init?: { task?: string; person?: string; a?: string; b?: string } }): { ws: Workspace; id: string } | null {
  const p = projectById(ws, pid);
  if (!p || !canAddRow(form)) return null;
  const now = act.now ?? Date.now();
  const kinds = form.filter?.split(',');
  switch (form.source) {
    case 'goals': {
      const kind = (kinds?.[0] ?? 'perf') as 'perf' | 'social' | 'non';
      const code = nextCode((p.goals ?? []).map((g) => g.code), kind === 'perf' ? 'L' : kind === 'social' ? 'S' : 'N');
      const out = addItem(ws, pid, 'goals', { id: act.id, code, text: kind === 'non' ? 'Neues Nicht-Ziel' : 'Neues Ziel', kind }, act.at, now);
      return out === ws ? null : { ws: out, id: act.id };
    }
    case 'conflicts': {
      const g = p.goals ?? [];
      const a = act.init?.a ?? g[0]?.id;
      const b = act.init?.b ?? g.find((x) => x.id !== a)?.id;
      if (!a || !b) return null;
      const out = addItem(ws, pid, 'conflicts', { id: act.id, a, b }, act.at, now);
      return out === ws ? null : { ws: out, id: act.id };
    }
    case 'stakeholders': {
      const code = nextCode((p.stakeholders ?? []).map((s) => s.code), 'SH-IN ', 2);
      const out = addItem(ws, pid, 'stakeholders', { id: act.id, code, name: 'Neuer Stakeholder', side: 'in' }, act.at, now);
      return out === ws ? null : { ws: out, id: act.id };
    }
    case 'phases': {
      const out = addItem(ws, pid, 'phases', { id: act.id, name: `Phase ${(p.phases?.length ?? 0) + 1}` }, act.at, now);
      return out === ws ? null : { ws: out, id: act.id };
    }
    case 'risks':
      return addSteer(ws, pid, 'risk', { title: form.filter === 'chance' ? 'Neue Chance' : 'Neues Risiko', ...(form.filter === 'chance' ? { risk: { chance: true } } : {}) }, { ...act, id: act.id } as Act);
    case 'milestones':
      return createNote(ws, { title: 'Neuer Meilenstein', project: pid, milestone: true }, { now, by: act.by, id: act.id });
    case 'tasks':
      return createNote(ws, { title: 'Neues Arbeitspaket', project: pid }, { now, by: act.by, id: act.id });
    case 'procure':
      return createNote(ws, { title: 'Neue Beschaffung', project: pid, type: 'procurement' }, { now, by: act.by, id: act.id });
    case 'uses': {
      const t = act.init?.task;
      const who = act.init?.person;
      const n = noteOf(ws, t);
      if (!n || n.project !== pid || !who || !personById(ws, who) || n.use?.some((u) => u.person === who)) return null;
      const out = setUse(ws, n.id, who, {}, now);
      return out === ws ? null : { ws: out, id: `${n.id}|${who}` };
    }
    case 'roles': {
      const out = editRoles(ws, pid, { kind: 'add', name: 'Neue Rolle', rid: act.id });
      return out === ws ? null : { ws: out, id: act.id };
    }
    default:
      return null;
  }
}

/** Rückgängig nach dem Löschen einer Zeile. */
export type RowUndo =
  | { kind: 'gpm'; undo: GpmUndo }
  | { kind: 'note'; undo: NoteUndo }
  | { kind: 'use'; note: string; use: NonNullable<Note['use']> }
  | { kind: 'roles'; pid: string; roles: Project['roles'] };

/** Zeile löschen (Notizen samt Unter-Notizen, wie überall); Ressourcen nicht (Personen-Cockpit). */
export function removeRow(ws: Workspace, pid: string, form: FormDef, rowId: string, now = Date.now()): { ws: Workspace; undo: RowUndo } | null {
  const l = LIST[form.source];
  if (l) {
    const r = removeItem(ws, pid, l, rowId, now);
    return r ? { ws: r.ws, undo: { kind: 'gpm', undo: r.undo } } : null;
  }
  switch (form.source) {
    case 'risks':
    case 'milestones':
    case 'tasks':
    case 'procure': {
      const r = deleteNote(ws, rowId);
      return r ? { ws: r.ws, undo: { kind: 'note', undo: r.undo } } : null;
    }
    case 'uses': {
      const { note, person } = splitRow(rowId);
      const n = noteOf(ws, note);
      if (!n?.use?.some((u) => u.person === person)) return null;
      return { ws: setUse(ws, note, person, null, now), undo: { kind: 'use', note, use: n.use } };
    }
    case 'roles': {
      const p = projectById(ws, pid);
      if (!p || rolesOf(p).length <= 1) return null;
      const out = editRoles(ws, pid, { kind: 'remove', role: rowId });
      return out === ws ? null : { ws: out, undo: { kind: 'roles', pid, roles: p.roles } };
    }
    default:
      return null;
  }
}
export function undoRemoveRow(ws: Workspace, u: RowUndo, now = Date.now()): Workspace {
  if (u.kind === 'gpm') return undoRemoveItem(ws, u.undo, now);
  if (u.kind === 'note') return restoreNotes(ws, u.undo, { now });
  if (u.kind === 'use') return patchNote(ws, u.note, (n) => ({ ...n, use: u.use }), now);
  return editProject(ws, u.pid, { roles: u.roles }, now);
}

/** Zeile verschieben (nur Listen am Projekt). */
export function moveRow(ws: Workspace, pid: string, form: FormDef, rowId: string, by: number, now = Date.now()): Workspace {
  const l = LIST[form.source];
  const p = projectById(ws, pid);
  if (!l || !p) return ws;
  const all = (p[l] ?? []) as { id: string }[];
  // innerhalb der gefilterten Zeilen schieben: Ziel ist die Stelle des Nachbarn
  const rows = rowsOf(ws, pid, form).map((r) => r.id);
  const i = rows.indexOf(rowId);
  const j = i + by;
  if (i < 0 || j < 0 || j >= rows.length) return ws;
  return moveItem(ws, pid, l, rowId, all.findIndex((x) => x.id === rows[j]), now);
}

// ---------------------------------------------------------------- Eigene Felder (G4)

export const FORM_FIELDS_MAX = 12;
const withForms = (ws: Workspace, pid: string, fn: (f: ProjectForms) => ProjectForms | null, now: number): Workspace => {
  const p = projectById(ws, pid);
  if (!p) return ws;
  const next = fn(structuredCloneForms(p.forms));
  if (!next) return ws;
  const clean = tidyForms(next);
  const patch: Partial<Project> = { forms: clean };
  return editProject(ws, pid, patch, now);
};
const structuredCloneForms = (f: ProjectForms | undefined): ProjectForms => JSON.parse(JSON.stringify(f ?? {}));
function tidyForms(f: ProjectForms): ProjectForms | undefined {
  for (const k of ['extra', 'hidden', 'values'] as const) {
    const m = f[k] as Record<string, unknown[] | Record<string, unknown>> | undefined;
    if (!m) continue;
    for (const [id, v] of Object.entries(m)) if ((Array.isArray(v) ? v.length : Object.keys(v).length) === 0) delete m[id];
    if (!Object.keys(m).length) delete f[k];
  }
  return Object.keys(f).length ? f : undefined;
}

/** Eigenes Feld anlegen (Name Pflicht, Auswahl braucht Möglichkeiten). */
export function addField(ws: Workspace, pid: string, formId: string, def: FormFieldDef, now = Date.now()): Workspace {
  const name = def.name.trim().slice(0, 60);
  const options = def.type === 'choice' ? [...new Set((def.options ?? []).map((o) => o.trim()).filter(Boolean))].slice(0, 20) : undefined;
  if (!name || (def.type === 'choice' && !options?.length)) return ws;
  return withForms(
    ws,
    pid,
    (f) => {
      const list = f.extra?.[formId] ?? [];
      if (list.length >= FORM_FIELDS_MAX || list.some((x) => x.id === def.id || x.name.toLowerCase() === name.toLowerCase())) return null;
      f.extra = { ...f.extra, [formId]: [...list, { id: def.id, name, type: def.type, ...(options ? { options } : {}), ...(def.required ? { required: true } : {}) }] };
      return f;
    },
    now,
  );
}
/** Eigenes Feld ändern (Name, Pflicht, Möglichkeiten). */
export function editField(ws: Workspace, pid: string, formId: string, fieldId: string, patch: Partial<Pick<FormFieldDef, 'name' | 'required' | 'options'>>, now = Date.now()): Workspace {
  return withForms(
    ws,
    pid,
    (f) => {
      const list = f.extra?.[formId] ?? [];
      const i = list.findIndex((x) => x.id === fieldId);
      if (i < 0) return null;
      const x = { ...list[i] };
      if (patch.name !== undefined) {
        const n = patch.name.trim().slice(0, 60);
        if (!n) return null;
        x.name = n;
      }
      if (patch.required !== undefined) {
        if (patch.required) x.required = true;
        else delete x.required;
      }
      if (patch.options && x.type === 'choice') {
        const o = [...new Set(patch.options.map((s) => s.trim()).filter(Boolean))].slice(0, 20);
        if (!o.length) return null;
        x.options = o;
      }
      f.extra![formId] = list.map((y, j) => (j === i ? x : y));
      return f;
    },
    now,
  );
}
export interface FieldUndo {
  pid: string;
  formId: string;
  field: FormFieldDef;
  index: number;
  values: Record<string, CellValue>;
}
/** Eigenes Feld löschen – mit seinen Werten, Rückgängig am Ort. */
export function removeField(ws: Workspace, pid: string, formId: string, fieldId: string, now = Date.now()): { ws: Workspace; undo: FieldUndo } | null {
  const p = projectById(ws, pid);
  const list = p?.forms?.extra?.[formId] ?? [];
  const index = list.findIndex((x) => x.id === fieldId);
  if (!p || index < 0) return null;
  const values: Record<string, CellValue> = {};
  for (const [row, m] of Object.entries(p.forms?.values ?? {})) if (fieldId in m) values[row] = m[fieldId];
  const out = withForms(
    ws,
    pid,
    (f) => {
      f.extra![formId] = list.filter((x) => x.id !== fieldId);
      for (const row of Object.keys(values)) delete f.values![row][fieldId];
      if (f.hidden?.[formId]) f.hidden[formId] = f.hidden[formId].filter((k) => k !== `custom:${fieldId}`);
      return f;
    },
    now,
  );
  return { ws: out, undo: { pid, formId, field: list[index], index, values } };
}
export function undoRemoveField(ws: Workspace, u: FieldUndo, now = Date.now()): Workspace {
  return withForms(
    ws,
    u.pid,
    (f) => {
      const list = [...(f.extra?.[u.formId] ?? [])];
      if (list.some((x) => x.id === u.field.id)) return null;
      list.splice(Math.min(u.index, list.length), 0, u.field);
      f.extra = { ...f.extra, [u.formId]: list };
      f.values = f.values ?? {};
      for (const [row, v] of Object.entries(u.values)) if (v !== undefined) f.values[row] = { ...f.values[row], [u.field.id]: v };
      return f;
    },
    now,
  );
}
function setCustomValue(ws: Workspace, pid: string, rowId: string, fieldId: string, v: CellValue, now: number): Workspace {
  return withForms(
    ws,
    pid,
    (f) => {
      const cur = f.values?.[rowId]?.[fieldId];
      const val = v === '' || v === undefined || v === false ? undefined : typeof v === 'string' ? v.slice(0, 2000) : v;
      if (cur === val) return null;
      f.values = f.values ?? {};
      const row = { ...f.values[rowId] };
      if (val === undefined) delete row[fieldId];
      else row[fieldId] = val;
      f.values[rowId] = row;
      return f;
    },
    now,
  );
}

/** Spalte ein- oder ausblenden (Pflichtfelder nach GPM bleiben sichtbar). */
export function setColumnHidden(ws: Workspace, pid: string, form: FormDef, key: string, hidden: boolean, now = Date.now()): Workspace {
  const col = columnsOf(projectById(ws, pid), form, true).find((c) => c.key === key);
  if (!col || (hidden && col.required && !col.custom)) return ws;
  return withForms(
    ws,
    pid,
    (f) => {
      const list = new Set(f.hidden?.[form.id] ?? []);
      if (hidden === list.has(key)) return null;
      if (hidden) list.add(key);
      else list.delete(key);
      f.hidden = { ...f.hidden, [form.id]: [...list] };
      return f;
    },
    now,
  );
}

// ---------------------------------------------------------------- „noch offen“ und Vorlagen

/** Leere Pflichtfelder je Zeile (GPM und eigene Pflichtfelder). */
export function missingOf(ws: Workspace, pid: string, form: FormDef): { row: string; keys: string[] }[] {
  const p = projectById(ws, pid);
  const req = columnsOf(p, form).filter((c) => c.required && !c.readonly);
  const out: { row: string; keys: string[] }[] = [];
  for (const r of rowsOf(ws, pid, form)) {
    const keys = req.filter((c) => {
      const v = cellValue(ws, pid, form, r.id, c.key);
      return v === undefined || v === '' || (c.kind === 'bool' ? false : v === null);
    }).map((c) => c.key);
    if (keys.length) out.push({ row: r.id, keys });
  }
  return out;
}

/**
 * V111 (F-226 Feinschliff): doppelte Codes in einem Formular (z. B. zwei Ziele „L1.1“, zwei Stakeholder „SH-IN-1“) –
 * nur bei Code-Spalten zum Eintippen, ohne Groß-/Kleinschreibung und Leerzeichen. Ergebnis: Zeilen-Ids je Code.
 */
export function dupCodesOf(ws: Workspace, pid: string, form: FormDef): Map<string, string[]> {
  const p = projectById(ws, pid);
  const col = columnsOf(p, form).find((c) => c.key === 'code' && !c.readonly);
  const out = new Map<string, string[]>();
  if (!col) return out;
  const seen = new Map<string, string[]>();
  // über alle Zeilen der Quelle (Ziele und Nicht-Ziele teilen sich die Codes)
  const all: FormDef = { ...form, filter: undefined };
  for (const r of rowsOf(ws, pid, all)) {
    const v = cellValue(ws, pid, all, r.id, 'code');
    if (typeof v !== 'string' || !v.trim()) continue;
    const k = v.replace(/\s+/g, '').toLocaleUpperCase('de');
    seen.set(k, [...(seen.get(k) ?? []), r.id]);
  }
  for (const [k, ids] of seen) if (ids.length > 1) out.set(k, ids);
  return out;
}

/** Vorlage für ein Projekt wählen; eigene Felder des Projekts bleiben. */
export function setTemplate(ws: Workspace, pid: string, templateId: string, now = Date.now()): Workspace {
  if (!templatesOf(ws).some((t) => t.id === templateId)) return ws;
  return withForms(
    ws,
    pid,
    (f) => {
      if ((f.template ?? GPM_D_ID) === templateId) return null;
      if (templateId === GPM_D_ID) delete f.template;
      else f.template = templateId;
      return f;
    },
    now,
  );
}

export const TEMPLATES_MAX = 20;
/** G4: Formulare des Projekts als eigene Vorlage speichern – eigene Felder gehen in die Vorlage, ausgeblendete Spalten fallen weg; das Projekt nutzt danach die neue Vorlage. */
export function saveTemplate(ws: Workspace, pid: string, name: string, tid: string, now = Date.now()): { ws: Workspace; id: string } | null {
  const p = projectById(ws, pid);
  const n = name.trim().slice(0, 60);
  if (!p || !n || (ws.formTemplates?.length ?? 0) >= TEMPLATES_MAX || templatesOf(ws).some((t) => t.id === tid || t.name.toLowerCase() === n.toLowerCase())) return null;
  const base = templateOf(ws, p);
  const forms: FormDef[] = base.forms.map((f) => {
    const hidden = new Set(p.forms?.hidden?.[f.id] ?? []);
    const extra = p.forms?.extra?.[f.id] ?? [];
    const fields = [...(f.fields ?? []), ...extra].filter((x) => !hidden.has(`custom:${x.id}`));
    const columns = [...f.columns.filter((c) => !hidden.has(c.key)), ...fields.filter((x) => !f.columns.some((c) => c.key === `custom:${x.id}`)).map((x) => ({ key: `custom:${x.id}` }))];
    const out: FormDef = { ...f, columns };
    if (fields.length) out.fields = fields;
    else delete out.fields;
    return out;
  });
  const t: FormTemplate = { id: tid, name: n, forms };
  let out: Workspace = { ...ws, formTemplates: [...(ws.formTemplates ?? []), t] };
  out = withForms(out, pid, () => ({ ...(p.forms?.values ? { values: p.forms.values } : {}), template: tid }), now);
  return { ws: out, id: tid };
}
/** Eigene Vorlage löschen – Projekte, die sie nutzen, fallen auf „GPM Level D“ zurück (Werte bleiben). */
export function removeTemplate(ws: Workspace, tid: string): { ws: Workspace; undo: { template: FormTemplate; index: number; projects: string[] } } | null {
  const list = ws.formTemplates ?? [];
  const index = list.findIndex((t) => t.id === tid);
  if (index < 0) return null;
  const projects = (ws.projects ?? []).filter((p) => p.forms?.template === tid).map((p) => p.id);
  const out: Workspace = { ...ws, projects: (ws.projects ?? []).map((p) => (projects.includes(p.id) ? { ...p, forms: tidyForms({ ...p.forms, template: undefined }) } : p)) };
  const rest = list.filter((t) => t.id !== tid);
  if (rest.length) out.formTemplates = rest;
  else delete out.formTemplates;
  for (const p of out.projects ?? []) if (!p.forms) delete p.forms;
  return { ws: out, undo: { template: list[index], index, projects } };
}

// ---------------------------------------------------------------- Speicher

const FIELD_TYPES: readonly FormFieldType[] = ['text', 'number', 'date', 'choice', 'bool', 'person'];
const SOURCES = Object.keys(FIELDS) as FormSource[];
function parseFieldDefs(v: unknown): FormFieldDef[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: FormFieldDef[] = [];
  for (const x of v) {
    if (!isObj(x) || typeof x.id !== 'string' || !x.id || typeof x.name !== 'string' || !x.name.trim() || !FIELD_TYPES.includes(x.type as FormFieldType) || out.some((y) => y.id === x.id)) continue;
    const options = x.type === 'choice' && Array.isArray(x.options) ? x.options.filter((o): o is string => typeof o === 'string' && !!o.trim()).slice(0, 20) : undefined;
    if (x.type === 'choice' && !options?.length) continue;
    out.push({ id: x.id, name: x.name.trim().slice(0, 60), type: x.type as FormFieldType, ...(options ? { options } : {}), ...(x.required === true ? { required: true } : {}) });
    if (out.length >= FORM_FIELDS_MAX * 2) break;
  }
  return out.length ? out : undefined;
}
/** Liest `Project.forms`. */
export function parseProjectForms(v: unknown): ProjectForms | undefined {
  if (!isObj(v)) return undefined;
  const f: ProjectForms = {};
  if (typeof v.template === 'string' && v.template && v.template !== GPM_D_ID) f.template = v.template;
  if (isObj(v.extra)) {
    const extra: Record<string, FormFieldDef[]> = {};
    for (const [k, x] of Object.entries(v.extra)) {
      const d = parseFieldDefs(x);
      if (d) extra[k] = d;
    }
    f.extra = extra;
  }
  if (isObj(v.hidden)) {
    const hidden: Record<string, string[]> = {};
    for (const [k, x] of Object.entries(v.hidden)) if (Array.isArray(x)) hidden[k] = [...new Set(x.filter((s): s is string => typeof s === 'string' && !!s))];
    f.hidden = hidden;
  }
  if (isObj(v.values)) {
    const values: Record<string, Record<string, string | number | boolean>> = {};
    for (const [row, m] of Object.entries(v.values)) {
      if (!isObj(m)) continue;
      const r: Record<string, string | number | boolean> = {};
      for (const [k, x] of Object.entries(m)) if (typeof x === 'string' ? x !== '' : typeof x === 'boolean' || (typeof x === 'number' && Number.isFinite(x))) r[k] = typeof x === 'string' ? x.slice(0, 2000) : (x as number | boolean);
      values[row] = r;
    }
    f.values = values;
  }
  return tidyForms(f);
}
/** Liest `Workspace.formTemplates`; die eingebaute Vorlage wird nie gespeichert. */
export function parseFormTemplates(v: unknown): FormTemplate[] {
  if (!Array.isArray(v)) return [];
  const out: FormTemplate[] = [];
  for (const t of v) {
    if (!isObj(t) || typeof t.id !== 'string' || !t.id || t.id === GPM_D_ID || typeof t.name !== 'string' || !t.name.trim() || !Array.isArray(t.forms) || out.some((x) => x.id === t.id)) continue;
    const forms: FormDef[] = [];
    for (const f of t.forms) {
      if (!isObj(f) || typeof f.id !== 'string' || !f.id || !SOURCES.includes(f.source as FormSource) || !Array.isArray(f.columns) || forms.some((x) => x.id === f.id)) continue;
      const fields = parseFieldDefs(f.fields);
      const columns = f.columns
        .filter((c): c is Record<string, unknown> => isObj(c) && typeof c.key === 'string')
        .filter((c) => ((c.key as string).startsWith('custom:') ? !!fields?.some((x) => `custom:${x.id}` === c.key) : !!fieldSpec(f.source as FormSource, c.key as string)))
        .map((c) => ({ key: c.key as string, ...(typeof c.label === 'string' && c.label.trim() ? { label: c.label.trim().slice(0, 60) } : {}), ...(typeof c.required === 'boolean' ? { required: c.required } : {}) }));
      forms.push({
        id: f.id,
        chapter: typeof f.chapter === 'string' ? f.chapter.slice(0, 12) : '',
        name: typeof f.name === 'string' && f.name.trim() ? f.name.trim().slice(0, 80) : 'Formular',
        source: f.source as FormSource,
        layout: f.layout === 'fields' ? 'fields' : 'table',
        columns,
        ...(typeof f.filter === 'string' && f.filter ? { filter: f.filter } : {}),
        ...(typeof f.stage === 'number' ? { stage: f.stage } : {}),
        ...(typeof f.icb === 'string' && f.icb ? { icb: f.icb.slice(0, 40) } : {}),
        ...(fields ? { fields } : {}),
      });
    }
    if (forms.length) out.push({ id: t.id, name: t.name.trim().slice(0, 60), forms });
    if (out.length >= TEMPLATES_MAX) break;
  }
  return out;
}

// ---------------------------------------------------------------- Eine Action für den Reducer

/** Alle Änderungen der Formulare als eine Action (`{ type: 'form', op }` in useWorkspace). */
export type FormOp =
  | { op: 'cell'; pid: string; form: FormDef; row: string; key: string; value: CellValue; at: number; by?: string }
  | { op: 'add'; pid: string; form: FormDef; id: string; at: number; by?: string; init?: { task?: string; person?: string; a?: string; b?: string } }
  | { op: 'remove'; pid: string; form: FormDef; row: string; at: number }
  | { op: 'undoRow'; undo: RowUndo; at: number }
  | { op: 'move'; pid: string; form: FormDef; row: string; by: number; at: number }
  | { op: 'addField'; pid: string; form: string; def: FormFieldDef; at: number }
  | { op: 'editField'; pid: string; form: string; field: string; patch: Partial<Pick<FormFieldDef, 'name' | 'required' | 'options'>>; at: number }
  | { op: 'removeField'; pid: string; form: string; field: string; at: number }
  | { op: 'undoField'; undo: FieldUndo; at: number }
  | { op: 'hide'; pid: string; form: FormDef; key: string; hidden: boolean; at: number }
  | { op: 'template'; pid: string; template: string; at: number }
  | { op: 'saveTemplate'; pid: string; name: string; id: string; at: number }
  | { op: 'removeTemplate'; id: string }
  | { op: 'undoTemplate'; template: FormTemplate; index: number; projects: string[]; at: number };

export function applyForm(ws: Workspace, o: FormOp): Workspace {
  switch (o.op) {
    case 'cell':
      return setCell(ws, o.pid, o.form, o.row, o.key, o.value, { now: o.at, by: o.by });
    case 'add':
      return addRow(ws, o.pid, o.form, { id: o.id, now: o.at, by: o.by, init: o.init })?.ws ?? ws;
    case 'remove':
      return removeRow(ws, o.pid, o.form, o.row, o.at)?.ws ?? ws;
    case 'undoRow':
      return undoRemoveRow(ws, o.undo, o.at);
    case 'move':
      return moveRow(ws, o.pid, o.form, o.row, o.by, o.at);
    case 'addField':
      return addField(ws, o.pid, o.form, o.def, o.at);
    case 'editField':
      return editField(ws, o.pid, o.form, o.field, o.patch, o.at);
    case 'removeField':
      return removeField(ws, o.pid, o.form, o.field, o.at)?.ws ?? ws;
    case 'undoField':
      return undoRemoveField(ws, o.undo, o.at);
    case 'hide':
      return setColumnHidden(ws, o.pid, o.form, o.key, o.hidden, o.at);
    case 'template':
      return setTemplate(ws, o.pid, o.template, o.at);
    case 'saveTemplate':
      return saveTemplate(ws, o.pid, o.name, o.id, o.at)?.ws ?? ws;
    case 'removeTemplate':
      return removeTemplate(ws, o.id)?.ws ?? ws;
    case 'undoTemplate': {
      if ((ws.formTemplates ?? []).some((t) => t.id === o.template.id)) return ws;
      const list = [...(ws.formTemplates ?? [])];
      list.splice(Math.min(o.index, list.length), 0, o.template);
      let out: Workspace = { ...ws, formTemplates: list };
      for (const pid of o.projects) out = setTemplate(out, pid, o.template.id, o.at);
      return out;
    }
  }
}
