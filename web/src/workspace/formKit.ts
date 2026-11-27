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
import { addItem, editCharter, editItem, goalsOf, moveItem, nextCode, parseWp, planCost, planHours, removeItem, riskLevels, riskValue, riskValueAfter, setPhase, setUse, undoRemoveItem, useCost, type GpmList, type GpmUndo, ACTION_STATES, BELBIN, COMM_STRATEGIES, CHANGE_RESIST, CHANGE_STATES, CHECK_METHODS, CHECK_RESULTS, DOC_STATES, editClose, LESSON_KINDS, RULE_SOURCES, RULE_STATES, GOAL_KINDS, GOAL_LEVELS, MODELS, PROCURE_STATES, PROGRESS_METHODS, REPORT_LIGHTS, STAKE_STRATEGIES } from './gpm';
import { costCurve, earnedValue, mtaOf, newReport, newWpReport, progressOf } from './gpmCalc';
import { ganttOf } from './gantt';
import { type Act, createNote, deleteNote, notesOf, type NoteUndo, restoreNotes, titleOf, updateNote } from './notes';
import { editProject, editRoles, projectById, rolesOf } from './projects';
import { addSteer, editRisk, risksOf, RISK_STATES, RISK_STRATEGIES, steerCode } from './risks';
import { editPerson, personById } from './persons';
import { pspRows, pspTree } from './psp';
import * as Sh from './sheets';
import { createView, deleteView, placeNote, removeFromView, restoreView, viewById, viewsOf, type ViewUndo } from './notes';

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

// ---------------------------------------------------------------- Feldkatalog

/** Darstellung eines Felds; `long` = mehrzeilig, `lines` = eine Zeile je Eintrag. */
export type FieldKind = 'text' | 'long' | 'lines' | 'number' | 'money' | 'pct' | 'date' | 'choice' | 'bool' | 'person' | 'goal' | 'phase' | 'role';
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
  /** V115: feste Nachkommastellen in der Anzeige (SPI/CPI = 2) */
  digits?: number;
}
const opts = <T extends string>(vs: readonly T[], labels: Record<T, string>) => vs.map((v) => ({ v, label: labels[v] }));

export const GOAL_KIND_LABEL = { perf: 'Leistungsziel', social: 'Sozialziel', non: 'Nicht-Ziel' } as const;
export const GOAL_LEVEL_LABEL = { must: 'MUSS', should: 'SOLL', can: 'KANN' } as const;
export const STAKE_STRATEGY_LABEL = { participative: 'partizipativ', informative: 'informativ', discursive: 'diskursiv', repressive: 'repressiv' } as const;
export const PROCURE_STATE_LABEL = { open: 'offen', asked: 'angefragt', offered: 'Angebot liegt vor', ordered: 'bestellt', delivered: 'geliefert' } as const;
export const MODEL_LABEL = { classic: 'klassisch', agile: 'agil', hybrid: 'hybrid' } as const;
const RISK_STRATEGY_LABEL = { avoid: 'vermeiden', reduce: 'vermindern', transfer: 'übertragen', accept: 'akzeptieren' } as const;
const RISK_STATE_LABEL = { open: 'offen', doing: 'in Bearbeitung', occurred: 'eingetreten', closed: 'erledigt' } as const;
export const COMM_STRATEGY_LABEL = { push: 'Bringschuld', pull: 'Holschuld' } as const;
// V115: Auswahl-Texte der Stufe 2 (Rest)
export const DOC_STATE_LABEL = { draft: 'Entwurf', review: 'in Prüfung', released: 'freigegeben', archived: 'archiviert' } as const;
export const CHECK_METHOD_LABEL = { visual: 'Sichtprüfung', measure: 'Messung', test: 'Test/Funktionsprüfung', review: 'Review', accept: 'Abnahmeprüfung' } as const;
export const CHECK_RESULT_LABEL = { open: 'offen', passed: 'bestanden', defects: 'mit Mängeln', failed: 'nicht bestanden' } as const;
export const LESSON_KIND_LABEL = { good: 'lief gut', bad: 'lief schlecht', improve: 'Verbesserung' } as const;
export const CHANGE_RESIST_LABEL = { low: 'gering', mid: 'mittel', high: 'hoch' } as const;
export const CHANGE_STATE_LABEL = { planned: 'geplant', running: 'läuft', done: 'umgesetzt' } as const;
export const RULE_SOURCE_LABEL = { law: 'Gesetz/Verordnung', norm: 'Norm/Standard', contract: 'Vertrag', internal: 'interne Regel', authority: 'Auflage einer Behörde' } as const;
export const RULE_STATE_LABEL = { open: 'offen', met: 'erfüllt', na: 'nicht zutreffend' } as const;
export const MTA_TREND_LABEL = { earlier: 'früher', same: 'gleich', later: 'später' } as const;
export const REPORT_LIGHT_LABEL = { green: 'grün – im Plan', yellow: 'gelb – Abweichung, beherrschbar', red: 'rot – Eingriff nötig' } as const;
export const ACTION_STATE_LABEL = { open: 'offen', doing: 'in Arbeit', done: 'erledigt' } as const;
/** F-234 (V137): Teamrollen nach Belbin in der Reihenfolge von Abb. 16 – handlungs-, wissens-, kommunikationsorientiert. */
export const BELBIN_LABEL = { pf: 'Perfektionist', um: 'Umsetzer', ma: 'Macher', er: 'Erfinder', sp: 'Spezialist', be: 'Beobachter', ws: 'Weichensteller', ta: 'Teamarbeiter', ko: 'Koordinator' } as const;
export const BELBIN_GROUP = { pf: 'act', um: 'act', ma: 'act', er: 'know', sp: 'know', be: 'know', ws: 'talk', ta: 'talk', ko: 'talk' } as const;
const BELBIN_HELP = {
  pf: 'handlungsorientiert: sorgfältig, findet Fehler, vollendet',
  um: 'handlungsorientiert: diszipliniert, setzt Pläne in Taten um',
  ma: 'handlungsorientiert: dynamisch, treibt an, hat Mut zu Hindernissen',
  er: 'wissensorientiert: kreativ, bringt neue Ideen, löst schwierige Probleme',
  sp: 'wissensorientiert: Fachwissen, engagiert sich für sein Gebiet',
  be: 'wissensorientiert: nüchtern, strategisch, wägt alle Möglichkeiten ab',
  ws: 'kommunikationsorientiert: begeistert, knüpft Kontakte, erkundet Möglichkeiten',
  ta: 'kommunikationsorientiert: kooperativ, hört zu, verhindert Reibung',
  ko: 'kommunikationsorientiert: klärt Ziele, delegiert, fördert Entscheidungen',
} as const;
/** F-234 (V137): Quadranten der Eisenhower-Matrix (wichtig/dringend). */
export const EISENHOWER_LABEL = { do: 'erledigen (wichtig und dringend)', plan: 'planen (wichtig, nicht dringend)', delegate: 'delegieren (dringend, nicht wichtig)', drop: 'liegen lassen (weder noch)' } as const;
export const quadrantOf = (important?: boolean, urgent?: boolean): keyof typeof EISENHOWER_LABEL => (important ? (urgent ? 'do' : 'plan') : urgent ? 'delegate' : 'drop');
export const PROGRESS_METHOD_LABEL = { zero: '0/100', half: '50/50', twenty: '20/80', effort: 'aufwandsproportional', steps: 'Meilensteine/Teilschritte', estimate: 'Schätzung' } as const;

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
    // V138 (Balkenplan am Ort): Termine wie im Notiz-Editor – nicht in der Tabelle „8 Arbeitspakete“, aber über „Felder“ zuschaltbar
    { key: 'duration', label: 'Dauer (Arbeitstage)', kind: 'number', help: 'Leer = aus „frühester Beginn“ bis „fällig am“, sonst 1 Tag' },
    { key: 'notBefore', label: 'Frühester Beginn', kind: 'date', help: 'Nicht vor diesem Tag beginnen' },
    { key: 'due', label: 'Fällig am', kind: 'date' },
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
    { key: 'tasks', label: 'Aufgaben', kind: 'long', gpm: true, help: 'AKV: Was die Rolle im Projekt tut' },
    { key: 'powers', label: 'Kompetenzen/Befugnisse', kind: 'long', gpm: true, help: 'AKV: Was die Rolle entscheiden und freigeben darf' },
    { key: 'duty', label: 'Verantwortung', kind: 'long', gpm: true, help: 'AKV: Wofür die Rolle geradesteht' },
    // V137 (Enrico 13:15, Abb. 7): Hierarchie, Stabsstellen und externe Rollen
    { key: 'parent', label: 'Übergeordnete Rolle', kind: 'role', help: 'Rolle, an die diese Rolle berichtet (Organigramm)' },
    { key: 'kind', label: 'Art', kind: 'choice', options: [{ v: 'staff', label: 'Stabsstelle' }, { v: 'external', label: 'extern (Dienstleister)' }], help: 'leer = Linie im Projektteam; Stabsstelle = berät neben der Linie; extern = unter der Abgrenzung der Organisation' },
    { key: 'link', label: 'Verbindung nach oben', kind: 'choice', options: [{ v: 'full', label: 'fachliche und disziplinarische Weisung' }, { v: 'tech', label: 'fachliche Weisung' }, { v: 'contract', label: 'Vertrag' }], help: 'Linienart im Organigramm wie in der Legende' },
    { key: 'org', label: 'Firma', kind: 'text', help: 'Bei externen Rollen: Firma; gleiche Firma steht im Organigramm untereinander' },
  ],
  // ---------------------------------------------------------------- Stufe 2 (V113)
  accept: [
    { key: 'task', label: 'Meilenstein bzw. Arbeitspaket', kind: 'text', readonly: true },
    { key: 'text', label: 'Abnahmekriterium', kind: 'long', gpm: true },
    { key: 'due', label: 'Datum', kind: 'date', gpm: true },
    { key: 'by', label: 'Leistung von', kind: 'text', gpm: true, help: 'Wer die Leistung erbringt (Rolle, Person, Firma)' },
    { key: 'acceptor', label: 'Abnahme durch', kind: 'text', gpm: true, help: 'Wer abnimmt (z. B. Auftraggeber, Prüfgesellschaft)' },
    { key: 'doc', label: 'Prüfdokument', kind: 'text', help: 'Womit die Abnahme belegt wird (Protokoll, Bescheinigung …)' },
    { key: 'ok', label: 'abgenommen', kind: 'bool' },
  ],
  comms: [
    { key: 'content', label: 'Inhalt', kind: 'text', gpm: true, help: 'Was kommuniziert wird: Bericht, Protokoll, Besprechung …' },
    { key: 'sender', label: 'Sender', kind: 'text', gpm: true },
    { key: 'receiver', label: 'Empfänger', kind: 'text', gpm: true },
    { key: 'strategy', label: 'Strategie', kind: 'choice', options: opts(COMM_STRATEGIES, COMM_STRATEGY_LABEL), help: 'Bringschuld = der Sender liefert, Holschuld = der Empfänger holt sich die Information' },
    { key: 'doc', label: 'Dokumentation', kind: 'text', help: 'Wo und in welcher Form es abgelegt wird' },
    { key: 'info', label: 'Information', kind: 'text', help: 'Auf welchem Weg informiert wird (E-Mail, Termin, Aushang …)' },
    { key: 'freq', label: 'Häufigkeit', kind: 'text', gpm: true },
  ],
  reports: [
    { key: 'date', label: 'Stichtag', kind: 'date', gpm: true },
    { key: 'from', label: 'Berichtszeitraum von', kind: 'date' },
    { key: 'to', label: 'bis', kind: 'date' },
    { key: 'light', label: 'Ampel', kind: 'choice', options: opts(REPORT_LIGHTS, REPORT_LIGHT_LABEL), gpm: true },
    { key: 'progTime', label: 'Fortschritt Termin (%)', kind: 'pct', help: 'Anteil der verstrichenen Projektzeit (beim Anlegen gerechnet)' },
    { key: 'progCost', label: 'Fortschritt Kosten (%)', kind: 'pct', help: 'Ist-Kosten im Verhältnis zu den Plan-Kosten' },
    { key: 'progWork', label: 'Fortschritt Leistung (%)', kind: 'pct', gpm: true, help: 'Fertigstellungsgrad aller Arbeitspakete, gewichtet mit dem Plan-Aufwand' },
    { key: 'planHours', label: 'Plan-Aufwand (Ph)', kind: 'number', readonly: true },
    { key: 'actHours', label: 'Ist-Aufwand (Ph)', kind: 'number', readonly: true },
    { key: 'planCost', label: 'Plan-Kosten (€)', kind: 'money', readonly: true },
    { key: 'actCost', label: 'Ist-Kosten (€)', kind: 'money', readonly: true },
    { key: 'done', label: 'Erledigte Aktivitäten', kind: 'long', gpm: true },
    { key: 'next', label: 'Nächste Schritte', kind: 'long' },
    { key: 'measures', label: 'Steuerungsmaßnahmen', kind: 'long', gpm: true },
    { key: 'note', label: 'Bemerkung', kind: 'long' },
  ],
  wp: [
    { key: 'code', label: 'PSP-Code', kind: 'text', readonly: true },
    { key: 'title', label: 'Arbeitspaket', kind: 'text', gpm: true },
    { key: 'phase', label: 'Phase', kind: 'phase' },
    { key: 'assignee', label: 'AP-Verantwortlich', kind: 'person', gpm: true },
    { key: 'goal', label: 'Ziel und Inhalt', kind: 'long', gpm: true },
    { key: 'activities', label: 'Aktivitäten', kind: 'lines', gpm: true, help: 'Eine Zeile je Aktivität' },
    { key: 'results', label: 'Ergebnisse bzw. Lieferobjekte', kind: 'lines', gpm: true, help: 'Eine Zeile je Ergebnis' },
    { key: 'inputs', label: 'Voraussetzungen und Schnittstellen', kind: 'long' },
    { key: 'risks', label: 'Chancen und Risiken', kind: 'long' },
    { key: 'start', label: 'Beginn', kind: 'date', readonly: true, help: 'aus dem Gantt' },
    { key: 'end', label: 'Ende', kind: 'date', readonly: true, help: 'aus dem Gantt' },
    { key: 'hours', label: 'Aufwand (Ph)', kind: 'number', help: 'Von Hand; sonst Summe der Einsätze' },
    { key: 'cost', label: 'Kosten (€)', kind: 'money', help: 'Von Hand; sonst Stunden × Stundensatz der Einsätze' },
    { key: 'method', label: 'Fortschrittsmessung', kind: 'choice', options: opts(PROGRESS_METHODS, PROGRESS_METHOD_LABEL), gpm: true, help: '0/100: erst fertig zählt · 50/50 bzw. 20/80: Anteil beim Beginn · aufwandsproportional: Ist ÷ Plan · Teilschritte: Abnahmekriterien bzw. Unter-Vorgänge · Schätzung: von Hand' },
    { key: 'progress', label: 'Fertigstellungsgrad (%)', kind: 'pct', help: 'Gerechnet nach der Fortschrittsmessung; eine Eingabe geht vor' },
    { key: 'releasePl', label: 'Freigabe Projektleitung', kind: 'date' },
    { key: 'releaseOwner', label: 'Freigabe AP-Verantwortlich', kind: 'date' },
  ],
  ev: [
    { key: 'code', label: 'Code', kind: 'text', readonly: true },
    { key: 'title', label: 'Arbeitspaket', kind: 'text', readonly: true },
    { key: 'bac', label: 'Plan-Kosten BAC (€)', kind: 'money', readonly: true, help: 'Budget at Completion: Plan-Kosten des Arbeitspakets' },
    { key: 'pv', label: 'Planwert PV (€)', kind: 'money', readonly: true, help: 'Planned Value: so viel sollte bis heute laut Gantt geleistet sein' },
    { key: 'ev', label: 'Fertigstellungswert EV (€)', kind: 'money', readonly: true, help: 'Earned Value: Plan-Kosten × Fertigstellungsgrad' },
    { key: 'ac', label: 'Ist-Kosten AC (€)', kind: 'money', readonly: true, help: 'Actual Cost: Ist-Kosten von Hand' },
    { key: 'sv', label: 'Terminabweichung SV (€)', kind: 'money', readonly: true, help: 'EV − PV; negativ = hinter dem Plan' },
    { key: 'cv', label: 'Kostenabweichung CV (€)', kind: 'money', readonly: true, help: 'EV − AC; negativ = teurer als geplant' },
    { key: 'spi', label: 'SPI', kind: 'number', readonly: true, digits: 2, help: 'Termin-Kennzahl EV ÷ PV; unter 1 = verspätet' },
    { key: 'cpi', label: 'CPI', kind: 'number', readonly: true, digits: 2, help: 'Kosten-Kennzahl EV ÷ AC; unter 1 = teurer' },
    { key: 'eac', label: 'Prognose EAC (€)', kind: 'money', readonly: true, help: 'Estimate at Completion: BAC ÷ CPI' },
  ],
  // ---------------------------------------------------------------- Stufe 2 Rest (V115)
  mta: [
    { key: 'code', label: 'Code', kind: 'text', readonly: true },
    { key: 'title', label: 'Meilenstein', kind: 'text', readonly: true },
    { key: 'base', label: 'Basisplan', kind: 'date', readonly: true, help: 'Soll-Termin aus dem gespeicherten Basisplan' },
    { key: 'first', label: 'Erste Prognose', kind: 'date', readonly: true, help: 'Termin im ersten Statusbericht' },
    { key: 'last', label: 'Letzter Bericht', kind: 'date', readonly: true, help: 'Termin im letzten Statusbericht' },
    { key: 'now', label: 'Heute (Gantt)', kind: 'date', readonly: true, help: 'Termin, wie der Gantt ihn heute rechnet' },
    { key: 'delta', label: 'Abweichung (AT)', kind: 'number', readonly: true, help: 'Arbeitstage gegen Basisplan bzw. erste Prognose; + = später' },
    { key: 'trend', label: 'Trend', kind: 'choice', readonly: true, options: opts(['earlier', 'same', 'later'] as const, MTA_TREND_LABEL), help: 'Richtung seit dem letzten Bericht' },
  ],
  docs: [
    { key: 'code', label: 'Nr.', kind: 'text' },
    { key: 'title', label: 'Dokument', kind: 'text', gpm: true },
    { key: 'kind', label: 'Art', kind: 'text', help: 'Plan, Protokoll, Bericht, Vertrag, Nachweis …' },
    { key: 'owner', label: 'Verantwortlich', kind: 'person', gpm: true },
    { key: 'version', label: 'Version', kind: 'text' },
    { key: 'date', label: 'Stand', kind: 'date' },
    { key: 'state', label: 'Status', kind: 'choice', options: opts(DOC_STATES, DOC_STATE_LABEL), gpm: true, help: 'Entwurf → in Prüfung → freigegeben → archiviert' },
    { key: 'place', label: 'Ablageort', kind: 'text', gpm: true, help: 'Ordner, Laufwerk oder Link' },
    { key: 'dist', label: 'Verteiler', kind: 'text', help: 'Wer das Dokument bekommt' },
  ],
  checks: [
    { key: 'object', label: 'Lieferobjekt', kind: 'text', gpm: true, help: 'Was geprüft wird: Ergebnis, Bauteil, Dokument' },
    { key: 'task', label: 'Arbeitspaket', kind: 'text', help: 'Code oder Name des Arbeitspakets' },
    { key: 'criterion', label: 'Prüfkriterium', kind: 'long', gpm: true, help: 'Woran gemessen wird – oft ein Abnahmekriterium' },
    { key: 'method', label: 'Prüfart', kind: 'choice', options: opts(CHECK_METHODS, CHECK_METHOD_LABEL) },
    { key: 'date', label: 'Datum', kind: 'date', gpm: true },
    { key: 'by', label: 'Prüfer', kind: 'person', gpm: true },
    { key: 'result', label: 'Ergebnis', kind: 'choice', options: opts(CHECK_RESULTS, CHECK_RESULT_LABEL), gpm: true },
    { key: 'defects', label: 'Mängel', kind: 'long' },
    { key: 'action', label: 'Maßnahme', kind: 'long', help: 'Nacharbeit, erneute Prüfung' },
    { key: 'due', label: 'Frist', kind: 'date' },
  ],
  changes: [
    { key: 'area', label: 'Bereich', kind: 'text', gpm: true, help: 'Wo sich etwas ändert: Abteilung, Prozess, System' },
    { key: 'today', label: 'Heute (Ist)', kind: 'long' },
    { key: 'target', label: 'Künftig (Soll)', kind: 'long', gpm: true },
    { key: 'affected', label: 'Betroffene', kind: 'text', gpm: true },
    { key: 'resistance', label: 'Widerstand', kind: 'choice', options: opts(CHANGE_RESIST, CHANGE_RESIST_LABEL), help: 'Erwarteter Widerstand der Betroffenen' },
    { key: 'measure', label: 'Maßnahme', kind: 'long', gpm: true, help: 'Information, Beteiligung, Schulung, Begleitung' },
    { key: 'owner', label: 'Verantwortlich', kind: 'person' },
    { key: 'due', label: 'Termin', kind: 'date' },
    { key: 'state', label: 'Stand', kind: 'choice', options: opts(CHANGE_STATES, CHANGE_STATE_LABEL) },
  ],
  rules: [
    { key: 'code', label: 'Nr.', kind: 'text' },
    { key: 'title', label: 'Auflage', kind: 'text', gpm: true, help: 'Gesetz, Norm, Vertragspflicht oder interne Regel, die das Projekt einhalten muss' },
    { key: 'source', label: 'Herkunft', kind: 'choice', options: opts(RULE_SOURCES, RULE_SOURCE_LABEL), gpm: true },
    { key: 'authority', label: 'Stelle', kind: 'text', help: 'Behörde, Prüfstelle, Vertragspartner' },
    { key: 'duty', label: 'Anforderung', kind: 'long', gpm: true },
    { key: 'proof', label: 'Nachweis', kind: 'text', help: 'Womit die Einhaltung belegt wird' },
    { key: 'due', label: 'Frist', kind: 'date' },
    { key: 'owner', label: 'Verantwortlich', kind: 'person' },
    { key: 'state', label: 'Stand', kind: 'choice', options: opts(RULE_STATES, RULE_STATE_LABEL) },
  ],
  // ---------------------------------------------------------------- F-234 (V137): AP-Statusbericht, Persönliche Kompetenzen, Anlagen
  wpReports: [
    { key: 'task', label: 'Arbeitspaket', kind: 'text', readonly: true },
    { key: 'date', label: 'Stichtag', kind: 'date', gpm: true },
    { key: 'from', label: 'Berichtszeitraum von', kind: 'date' },
    { key: 'to', label: 'bis', kind: 'date' },
    { key: 'light', label: 'Status (Ampel)', kind: 'choice', options: opts(REPORT_LIGHTS, REPORT_LIGHT_LABEL), gpm: true },
    { key: 'progress', label: 'Ist-Fortschrittsgrad (%)', kind: 'pct', gpm: true, help: 'Beim Anlegen nach der Fortschrittsmessung des Arbeitspakets gerechnet' },
    { key: 'planStart', label: 'Plan-Start', kind: 'date', readonly: true, help: 'aus dem Basisplan (sonst heutiger Plan)' },
    { key: 'planEnd', label: 'Plan-Ende', kind: 'date', readonly: true, help: 'aus dem Basisplan (sonst heutiger Plan)' },
    { key: 'sollStart', label: 'Soll-Start', kind: 'date', readonly: true, help: 'heutiger Plan aus dem Gantt am Stichtag' },
    { key: 'sollEnd', label: 'Soll-Ende', kind: 'date', readonly: true, help: 'heutiger Plan aus dem Gantt am Stichtag' },
    { key: 'actStart', label: 'Ist-Start', kind: 'date' },
    { key: 'actEnd', label: 'Ist-Ende', kind: 'date' },
    { key: 'planHours', label: 'Aufwand Plan (Ph)', kind: 'number', readonly: true },
    { key: 'sollHours', label: 'Aufwand Soll (Ph)', kind: 'number', readonly: true },
    { key: 'actHours', label: 'Aufwand Ist (Ph)', kind: 'number', readonly: true },
    { key: 'restHours', label: 'Aufwand Rest (Ph)', kind: 'number', readonly: true, help: 'Soll − Ist' },
    { key: 'planCost', label: 'Kosten Plan (€)', kind: 'money', readonly: true },
    { key: 'sollCost', label: 'Kosten Soll (€)', kind: 'money', readonly: true },
    { key: 'actCost', label: 'Kosten Ist (€)', kind: 'money', readonly: true },
    { key: 'restCost', label: 'Kosten Rest (€)', kind: 'money', readonly: true, help: 'Soll − Ist' },
    { key: 'done', label: 'Aktuelle Aktivitäten', kind: 'long', gpm: true },
    { key: 'measures', label: 'Notwendige Steuerungsmaßnahmen', kind: 'long', gpm: true },
    { key: 'place', label: 'Ort', kind: 'text', help: 'Ort der Unterschrift, z. B. Hamburg' },
  ],
  teamRoles: [
    { key: 'person', label: 'Teammitglied', kind: 'person', gpm: true },
    { key: 'date', label: 'Datum der Bestimmung', kind: 'date' },
    ...BELBIN.map((k): FieldSpec => ({ key: k, label: BELBIN_LABEL[k], kind: 'number', help: `${BELBIN_HELP[k]} – Punkte aus dem Belbin-Test` })),
    { key: 'text', label: 'Reflexion der eigenen Teamrolle', kind: 'long', gpm: true, help: 'ICB4 4.4.1: Was die Rollen für die Arbeit im Projekt bedeuten, welche Schwächen wer ausgleicht' },
  ],
  eisenhower: [
    { key: 'code', label: 'PSP-Code', kind: 'text', readonly: true },
    { key: 'title', label: 'Aufgabe', kind: 'text', help: 'Eintrag der Matrix – eigene Aufgabe oder übernommenes Arbeitspaket (dieselbe Notiz wie im Notizen-Modus)' },
    { key: 'important', label: 'wichtig', kind: 'bool', help: 'Wie im Notizen-Modus: trägt zu den Zielen bei' },
    { key: 'urgent', label: 'dringend', kind: 'bool', help: 'Wie im Notizen-Modus: hat einen nahen Termin' },
    { key: 'quadrant', label: 'Quadrant', kind: 'choice', readonly: true, options: opts(['do', 'plan', 'delegate', 'drop'] as const, EISENHOWER_LABEL) },
  ],
  messages: [
    { key: 'topic', label: 'Anlass', kind: 'text', gpm: true, help: 'Gespräch bzw. Situation, z. B. Meinungsverschiedenheit über eine Anschaffung' },
    { key: 'date', label: 'Datum', kind: 'date' },
    { key: 'sender', label: 'Sender', kind: 'text', gpm: true },
    { key: 'receiver', label: 'Empfänger', kind: 'text', gpm: true },
    { key: 'message', label: 'Nachricht', kind: 'long', gpm: true, help: 'Was gesagt wurde (Mitte des Quadrats)' },
    { key: 'reaction', label: 'Reaktion', kind: 'long', help: 'Was der Empfänger geantwortet hat' },
    { key: 'sFact', label: 'Sachebene – Sender', kind: 'long', help: 'Worüber ich informiere' },
    { key: 'rFact', label: 'Sachebene – Empfänger', kind: 'long' },
    { key: 'sSelf', label: 'Selbstkundgabe – Sender', kind: 'long', help: 'Was ich von mir zeige oder verberge' },
    { key: 'rSelf', label: 'Selbstkundgabe – Empfänger', kind: 'long' },
    { key: 'sRel', label: 'Beziehungsebene – Sender', kind: 'long', help: 'Wie wir zueinander stehen' },
    { key: 'rRel', label: 'Beziehungsebene – Empfänger', kind: 'long' },
    { key: 'sAppeal', label: 'Appellseite – Sender', kind: 'long', help: 'Wozu ich dich veranlassen will' },
    { key: 'rAppeal', label: 'Appellseite – Empfänger', kind: 'long' },
    { key: 'result', label: 'Folge und Lösung', kind: 'long', gpm: true, help: 'Wie das Gespräch gelöst wurde und was es für das Projekt bedeutete' },
  ],
  moderations: [
    { key: 'occasion', label: 'Anlass', kind: 'text', gpm: true, help: 'z. B. Kick-off, Workshop, Abstimmung' },
    { key: 'date', label: 'Datum', kind: 'date' },
    { key: 'technique', label: 'Moderationstechnik', kind: 'text', gpm: true, help: 'z. B. Brainstorming, Brainwriting, Kartenabfrage, Metaplan, Mindmap, Kanban-Board' },
    { key: 'participants', label: 'Teilnehmende', kind: 'text' },
    { key: 'goal', label: 'Ziel', kind: 'long' },
    { key: 'result', label: 'Ergebnis', kind: 'long', gpm: true },
  ],
  actions: [
    { key: 'code', label: 'Nr.', kind: 'text' },
    { key: 'title', label: 'Maßnahme', kind: 'text', gpm: true },
    { key: 'activity', label: 'Tätigkeit', kind: 'long' },
    { key: 'owner', label: 'Verantwortlich', kind: 'person', gpm: true },
    { key: 'assign', label: 'Zuordnung', kind: 'text', help: 'Arbeitspaket, Besprechung oder Thema' },
    { key: 'due', label: 'Termin', kind: 'date', gpm: true },
    { key: 'state', label: 'Stand', kind: 'choice', options: opts(ACTION_STATES, ACTION_STATE_LABEL) },
    { key: 'note', label: 'Bemerkung', kind: 'long' },
  ],
  annexes: [
    { key: 'code', label: 'Nr.', kind: 'text' },
    { key: 'title', label: 'Anlage', kind: 'text', gpm: true },
    { key: 'form', label: 'Kapitel als Anlage', kind: 'choice', options: [], help: 'Ein Kapitel dieser Vorlage, das im Bericht als Anlage eingereiht wird (z. B. Zentraltabelle der Kosten)' },
    { key: 'place', label: 'Datei bzw. Link', kind: 'text', help: 'Ablageort, Dateiname oder Adresse' },
    { key: 'text', label: 'Beschreibung', kind: 'long' },
  ],
  close: [
    { key: 'date', label: 'Abschlussdatum', kind: 'date', gpm: true },
    { key: 'result', label: 'Ergebnis', kind: 'long', gpm: true, help: 'Was erreicht und übergeben wurde' },
    { key: 'goals', label: 'Zielerreichung', kind: 'long', gpm: true, help: 'Je Ziel: erreicht, teilweise, nicht – mit Begründung' },
    { key: 'acceptedBy', label: 'Abnahme durch', kind: 'text', gpm: true },
    { key: 'acceptedOn', label: 'Abnahme am', kind: 'date', gpm: true },
    { key: 'handover', label: 'Übergabe in die Linie', kind: 'long', help: 'Wer betreibt das Ergebnis künftig, was wurde übergeben' },
    { key: 'open', label: 'Offene Punkte', kind: 'long', help: 'Restarbeiten mit Verantwortlichen' },
    { key: 'team', label: 'Auflösung des Teams', kind: 'long', help: 'Rückführung der Mitarbeitenden, Würdigung' },
    { key: 'archived', label: 'Dokumentation archiviert', kind: 'bool' },
    { key: 'thanks', label: 'Abschlussveranstaltung', kind: 'long' },
  ],
  lessons: [
    { key: 'topic', label: 'Thema', kind: 'text', gpm: true },
    { key: 'kind', label: 'Art', kind: 'choice', options: opts(LESSON_KINDS, LESSON_KIND_LABEL), gpm: true },
    { key: 'phase', label: 'Phase', kind: 'phase' },
    { key: 'what', label: 'Was ist passiert', kind: 'long', gpm: true },
    { key: 'cause', label: 'Ursache', kind: 'long' },
    { key: 'advice', label: 'Empfehlung für künftige Projekte', kind: 'long', gpm: true },
    { key: 'owner', label: 'Eingebracht von', kind: 'person' },
    { key: 'shared', label: 'weitergegeben', kind: 'bool', help: 'In die Wissensdatenbank bzw. an andere Projekte gegeben' },
  ],
  costs: [
    { key: 'month', label: 'Monat', kind: 'text', readonly: true },
    { key: 'cost', label: 'Plan-Kosten (€)', kind: 'money', readonly: true },
    { key: 'costSum', label: 'Summe (€)', kind: 'money', readonly: true },
    { key: 'hours', label: 'Aufwand (Ph)', kind: 'number', readonly: true },
    { key: 'hoursSum', label: 'Summe (Ph)', kind: 'number', readonly: true },
  ],
};
/** V115: Zahl deutsch – Euro ganz oder mit genau zwei Nachkommastellen, `digits` fest (SPI/CPI), sonst wie eingegeben. */
export const fmtNumber = (v: number, kind: FieldKind, digits?: number): string => {
  if (digits !== undefined) return v.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  if (kind === 'money') return v.toLocaleString('de-DE', { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 });
  return String(v).replace('.', ',');
};
/** Stichtag für Earned Value: heute. */
export const evDay = (): string => new Date().toISOString().slice(0, 10);
export const fieldSpec = (src: FormSource, key: string): FieldSpec | undefined => FIELDS[src].find((f) => f.key === key);

// ---------------------------------------------------------------- Vorlage „GPM Level D“

const cols = (src: FormSource, keys?: string[]): FormColumn[] => (keys ?? FIELDS[src].map((f) => f.key)).map((key) => ({ key }));
export const GPM_D_ID = 'gpm-d';
const FIGURES: NonNullable<FormDef['figure']>[] = ['goalTree', 'org', 'phasePlan', 'psp', 'gantt', 'load', 'wpReport', 'belbin', 'eisenhower', 'square'];
/** G3: nach GPM-Leitfaden Z01D Rev. 09, Kapitel wie im Report; dazu ICB4-Ergänzungen der Stufe 1 (G11). */
export const GPM_D: FormTemplate = {
  id: GPM_D_ID,
  name: 'GPM Level D',
  forms: [
    { id: 'charter', chapter: '2.1', name: 'Projektsteckbrief', source: 'charter', layout: 'fields', columns: cols('charter'), stage: 1, icb: '4.5.1 · 4.3.1' },
    { id: 'goals', chapter: '2.2', name: 'Projektziele', source: 'goals', layout: 'table', columns: cols('goals'), filter: 'perf,social', stage: 1, icb: '4.5.2' },
    { id: 'nongoals', chapter: '2.2', name: 'Nicht-Ziele', source: 'goals', layout: 'table', columns: cols('goals', ['code', 'text', 'consequence']), filter: 'non', stage: 1, icb: '4.5.2 · 4.5.3' },
    // F-234 (V135): Grafiken aus den vorhandenen Daten als eigene Kapitel-Blätter wie im Report (nur zum Lesen, Daten in den Formularen daneben)
    { id: 'goalTree', chapter: '2.2', name: 'Zielhierarchie', source: 'goals', layout: 'figure', figure: 'goalTree', columns: [], stage: 1, icb: '4.5.2' },
    { id: 'conflicts', chapter: '2.3', name: 'Zielkonflikte', source: 'conflicts', layout: 'table', columns: cols('conflicts'), stage: 1, icb: '4.5.2' },
    { id: 'rules', chapter: '2.4', name: 'Auflagen', source: 'rules', layout: 'table', columns: cols('rules'), stage: 2, icb: '4.3.3' },
    { id: 'accept', chapter: '3.1', name: 'Abnahmekriterien', source: 'accept', layout: 'table', columns: cols('accept'), stage: 2, icb: '4.5.3 · 4.5.6' },
    { id: 'stakeholders', chapter: '4', name: 'Stakeholderanalyse', source: 'stakeholders', layout: 'table', columns: cols('stakeholders'), stage: 1, icb: '4.5.12 · 4.3.4' },
    { id: 'envPortfolio', chapter: '4', name: 'Umfeld-Portfolio', source: 'stakeholders', layout: 'portfolio', columns: cols('stakeholders', ['code', 'name', 'side', 'area']), filter: 'env', stage: 2, icb: '4.5.12' },
    { id: 'shPortfolio', chapter: '4', name: 'Stakeholder-Portfolio', source: 'stakeholders', layout: 'portfolio', columns: cols('stakeholders', ['code', 'name', 'side', 'attitude', 'power', 'conflict']), filter: 'sh', stage: 2, icb: '4.5.12 · 4.3.4' },
    { id: 'risks', chapter: '5', name: 'Chancen und Risiken', source: 'risks', layout: 'table', columns: cols('risks'), stage: 1, icb: '4.5.11' },
    { id: 'org', chapter: '6.1', name: 'Projektorganisation (Organigramm)', source: 'roles', layout: 'figure', figure: 'org', columns: [], stage: 1, icb: '4.5.5 · 4.3.2' },
    { id: 'roles', chapter: '6.2', name: 'Projektorganisation (AKV)', source: 'roles', layout: 'table', columns: cols('roles'), stage: 1, icb: '4.5.5 · 4.3.2' },
    { id: 'comms', chapter: '6.3', name: 'Kommunikationsplan (DKI-Matrix)', source: 'comms', layout: 'table', columns: cols('comms'), stage: 2, icb: '4.5.5 · 4.5.12' },
    { id: 'docs', chapter: '6.4', name: 'Dokumentation', source: 'docs', layout: 'table', columns: cols('docs'), stage: 2, icb: '4.5.5' },
    { id: 'phasePlan', chapter: '7', name: 'Phasenplan (Grafik)', source: 'phases', layout: 'figure', figure: 'phasePlan', columns: [], stage: 1, icb: '4.5.4' },
    { id: 'phases', chapter: '7', name: 'Phasenplan', source: 'phases', layout: 'table', columns: cols('phases'), stage: 1, icb: '4.5.4' },
    { id: 'milestones', chapter: '7', name: 'Meilensteine', source: 'milestones', layout: 'table', columns: cols('milestones'), stage: 1, icb: '4.5.4' },
    { id: 'mta', chapter: '7', name: 'Meilenstein-Trendanalyse', source: 'mta', layout: 'chart', columns: cols('mta'), stage: 2, icb: '4.5.4 · 4.5.10' },
    { id: 'pspChart', chapter: '8', name: 'Projektstrukturplan (PSP)', source: 'tasks', layout: 'figure', figure: 'psp', columns: [], stage: 1, icb: '4.5.3' },
    { id: 'tasks', chapter: '8', name: 'Arbeitspakete', source: 'tasks', layout: 'table', columns: cols('tasks', ['code', 'title', 'phase', 'assignee', 'hours', 'cost', 'results']), stage: 1, icb: '4.5.3 · 4.5.4' },
    { id: 'wp', chapter: '8.3', name: 'Arbeitspaketbeschreibung', source: 'wp', layout: 'record', columns: cols('wp'), stage: 2, icb: '4.5.3 · 4.5.10' },
    { id: 'ganttChart', chapter: '9', name: 'Balkenplan mit kritischem Pfad', source: 'tasks', layout: 'figure', figure: 'gantt', columns: [], stage: 1, icb: '4.5.4' },
    { id: 'checks', chapter: '9', name: 'Prüfung am Lieferobjekt', source: 'checks', layout: 'table', columns: cols('checks'), stage: 2, icb: '4.5.6' },
    { id: 'persons', chapter: '10', name: 'Ressourcen', source: 'persons', layout: 'table', columns: cols('persons'), stage: 1, icb: '4.5.8' },
    { id: 'uses', chapter: '10', name: 'Einsatz je Arbeitspaket', source: 'uses', layout: 'table', columns: cols('uses'), stage: 1, icb: '4.5.8 · 4.5.7' },
    { id: 'load', chapter: '10', name: 'Auslastungsdiagramm', source: 'persons', layout: 'figure', figure: 'load', columns: [], stage: 2, icb: '4.5.8' },
    { id: 'costs', chapter: '11', name: 'Kostenganglinie', source: 'costs', layout: 'chart', columns: cols('costs'), stage: 2, icb: '4.5.7' },
    { id: 'ev', chapter: '11', name: 'Earned Value (Fertigstellungswert)', source: 'ev', layout: 'table', columns: cols('ev'), stage: 2, icb: '4.5.7' },
    { id: 'procure', chapter: '11', name: 'Beschaffung', source: 'procure', layout: 'table', columns: cols('procure'), stage: 1, icb: '4.5.9' },
    { id: 'reports', chapter: '12', name: 'Statusbericht', source: 'reports', layout: 'record', columns: cols('reports'), stage: 2, icb: '4.5.10' },
    // F-234 (V137, D5): AP-Statusbericht wie Abb. 15 – Blatt oben, Felder darunter
    { id: 'wpReports', chapter: '12.1', name: 'AP-Statusbericht', source: 'wpReports', layout: 'record', figure: 'wpReport', columns: cols('wpReports'), stage: 2, icb: '4.5.10' },
    { id: 'changes', chapter: '13', name: 'Veränderung', source: 'changes', layout: 'table', columns: cols('changes'), stage: 2, icb: '4.5.13' },
    { id: 'close', chapter: '14', name: 'Projektabschluss', source: 'close', layout: 'fields', columns: cols('close'), stage: 2, icb: '4.5.10' },
    { id: 'lessons', chapter: '14', name: 'Lessons Learned', source: 'lessons', layout: 'table', columns: cols('lessons'), stage: 2, icb: '4.5.10' },
    // F-234 (V137, D6): Kapitelgruppe „Persönliche Kompetenzen“ (ICB4 4.4) wie Kap. 13–15 im Report, D7: Anlagen
    { id: 'teamRoles', chapter: '15.1', name: 'Teamrollen nach Belbin', source: 'teamRoles', layout: 'record', figure: 'belbin', columns: cols('teamRoles'), stage: 2, icb: '4.4.1' },
    { id: 'eisenhower', chapter: '15.2', name: 'Eisenhower-Matrix', source: 'eisenhower', layout: 'table', figure: 'eisenhower', columns: cols('eisenhower'), stage: 2, icb: '4.4.1' },
    { id: 'messages', chapter: '15.3', name: 'Nachrichtenquadrat', source: 'messages', layout: 'record', figure: 'square', columns: cols('messages'), stage: 2, icb: '4.4.3' },
    { id: 'moderations', chapter: '15.4', name: 'Moderationstechniken', source: 'moderations', layout: 'table', columns: cols('moderations'), stage: 2, icb: '4.4.8' },
    { id: 'actions', chapter: '15.5', name: 'Maßnahmenplan', source: 'actions', layout: 'table', columns: cols('actions'), stage: 2, icb: '4.4.8 · 4.5.10' },
    { id: 'annexes', chapter: '16', name: 'Anlagen', source: 'annexes', layout: 'table', columns: cols('annexes'), stage: 2 },
  ],
};

// D7: Auswahl „Kapitel als Anlage“ = Formulare der Vorlage (ohne die Anlagen selbst)
(FIELDS.annexes.find((f) => f.key === 'form') as { options?: { v: string; label: string }[] }).options = GPM_D.forms.filter((f) => f.id !== 'annexes').map((f) => ({ v: f.id, label: `${f.chapter} ${f.name}` }));

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
  digits?: number;
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
    out.push({ key: s.key, label: c.label ?? s.label, kind: s.kind, ...(s.options ? { options: s.options } : {}), ...(s.readonly ? { readonly: true } : {}), ...((c.required ?? s.gpm) ? { required: true } : {}), ...(s.help ? { help: s.help } : {}), ...(s.digits !== undefined ? { digits: s.digits } : {}) });
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
    case 'accept': {
      const out: FormRow[] = [];
      for (const t of taskRows(ws, pid)) {
        const n = noteOf(ws, t.id);
        (n?.accept ?? []).forEach((_, i) => out.push({ id: `${t.id}#${i}`, note: t.id }));
      }
      return out;
    }
    case 'comms':
    case 'docs':
    case 'checks':
    case 'lessons':
    case 'changes':
    case 'rules':
    case 'teamRoles':
    case 'messages':
    case 'moderations':
    case 'actions':
    case 'annexes':
      return (p[form.source] ?? []).map((x) => ({ id: x.id }));
    case 'wpReports': {
      // nach Arbeitspaket (PSP-Reihenfolge), je Arbeitspaket der neueste zuerst
      const order = new Map(taskRows(ws, pid).map((t, i) => [t.id, i]));
      return [...(p.wpReports ?? [])]
        .sort((a, b) => (order.get(a.wp) ?? 1e9) - (order.get(b.wp) ?? 1e9) || (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
        .map((x) => ({ id: x.id, note: x.wp }));
    }
    case 'eisenhower': {
      // V140 (F-237): Einträge der gewählten Matrix – nicht mehr fest die Arbeitspakete aus dem PSP
      const v = Sh.projectMatrix(ws, pid);
      return v ? Sh.matrixEntries(ws, v).map(({ note }) => ({ id: note.id, note: note.id })) : [];
    }
    case 'close':
      return [{ id: pid }];
    case 'mta':
      return mtaOf(ws, pid, evDay()).rows.map((r) => ({ id: r.id, note: r.id }));
    case 'reports':
      return [...(p.reports ?? [])].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).map((x) => ({ id: x.id }));
    case 'wp':
      return taskRows(ws, pid).filter((n) => !n.milestone).map((n) => ({ id: n.id, note: n.id, depth: n.depth }));
    case 'costs':
      return costCurve(ws, pid).months.map((m) => ({ id: m.month }));
    case 'ev':
      return earnedValue(ws, pid, evDay()).rows.map((r) => ({ id: r.id, note: r.id }));
  }
}
const splitCheck = (rowId: string) => {
  const i = rowId.lastIndexOf('#');
  return { note: rowId.slice(0, i), i: Number(rowId.slice(i + 1)) };
};

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
    case 'accept': {
      const { note, i } = splitCheck(rowId);
      const n = noteOf(ws, note);
      const c = n?.accept?.[i];
      if (!n || !c) return undefined;
      if (key === 'task') return `${taskRows(ws, pid).find((t) => t.id === note)?.code ?? ''} ${titleOf(n)}`.trim();
      if (key === 'ok') return !!c.ok;
      return (c as unknown as Record<string, CellValue>)[key];
    }
    case 'comms':
    case 'reports':
    case 'docs':
    case 'checks':
    case 'lessons':
    case 'changes':
    case 'rules':
    case 'teamRoles':
    case 'messages':
    case 'moderations':
    case 'actions':
    case 'annexes':
      return ((p[form.source] ?? []) as unknown as Record<string, CellValue>[]).find((x) => x.id === rowId)?.[key];
    case 'wpReports': {
      const r = (p.wpReports ?? []).find((x) => x.id === rowId);
      if (!r) return undefined;
      if (key === 'task') {
        const n = noteOf(ws, r.wp);
        return `${taskRows(ws, pid).find((t) => t.id === r.wp)?.code ?? ''} ${n ? titleOf(n) : '(entfallen)'}`.trim();
      }
      if (key === 'restHours') return r.sollHours !== undefined ? Math.round(((r.sollHours ?? 0) - (r.actHours ?? 0)) * 100) / 100 : undefined;
      if (key === 'restCost') return r.sollCost !== undefined ? Math.round(((r.sollCost ?? 0) - (r.actCost ?? 0)) * 100) / 100 : undefined;
      return (r as unknown as Record<string, CellValue>)[key];
    }
    case 'eisenhower': {
      const n = noteOf(ws, rowId);
      if (!n) return undefined;
      // V140 (H10): PSP-Code auch für Arbeitspakete der Teilprojekte
      if (key === 'code') return pspRows(pspTree(ws, pid)).find((t) => t.kind === 'task' && t.id === rowId)?.code;
      if (key === 'title') return titleOf(n);
      if (key === 'important') return !!n.important;
      if (key === 'urgent') return !!n.urgent;
      if (key === 'quadrant') return quadrantOf(n.important, n.urgent);
      return undefined;
    }
    case 'close':
      return key === 'archived' ? !!p.close?.archived : (p.close as Record<string, CellValue> | undefined)?.[key];
    case 'mta': {
      if (key === 'code') return taskRows(ws, pid).find((t) => t.id === rowId)?.code;
      if (key === 'title') { const n = noteOf(ws, rowId); return n ? titleOf(n) : undefined; }
      const m = mtaOf(ws, pid, evDay());
      const r = m.rows.find((x) => x.id === rowId);
      if (!r) return undefined;
      const reps = r.series.filter((_, i) => m.points[i].label !== 'Basisplan' && m.points[i].label !== 'heute').filter((x): x is string => !!x);
      if (key === 'first') return reps[0];
      if (key === 'last') return reps[reps.length - 1];
      return (r as unknown as Record<string, CellValue>)[key];
    }
    case 'wp': {
      const n = noteOf(ws, rowId);
      if (!n) return undefined;
      if (key === 'code') return taskRows(ws, pid).find((t) => t.id === rowId)?.code;
      if (key === 'title') return titleOf(n);
      if (key === 'results') return n.results?.join('\n');
      if (key === 'hours') return planHours(ws, n);
      if (key === 'cost') return planCost(ws, n);
      if (key === 'phase' || key === 'assignee') return n[key];
      if (key === 'start' || key === 'end') {
        const r = ganttOf(ws, pid).byId.get(rowId);
        return r?.planned ? r[key] : undefined;
      }
      if (key === 'progress') return n.wp?.progress ?? progressOf(ws, n);
      return (n.wp as Record<string, CellValue> | undefined)?.[key];
    }
    case 'ev': {
      if (key === 'code') return taskRows(ws, pid).find((t) => t.id === rowId)?.code;
      if (key === 'title') { const n = noteOf(ws, rowId); return n ? titleOf(n) : undefined; }
      const r = earnedValue(ws, pid, evDay()).rows.find((x) => x.id === rowId);
      return r ? (r as unknown as Record<string, CellValue>)[key] : undefined;
    }
    case 'costs': {
      const m = costCurve(ws, pid).months.find((x) => x.month === rowId);
      if (!m) return undefined;
      if (key === 'month') return `${rowId.slice(5, 7)}/${rowId.slice(0, 4)}`;
      return (m as unknown as Record<string, CellValue>)[key];
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
  if (form.source === 'wp' && key === 'progress') return noteOf(ws, rowId)?.wp?.progress === undefined;
  if ((form.source === 'tasks' || form.source === 'wp') && (key === 'hours' || key === 'cost')) {
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
      if (key === 'notBefore') return updateNote(ws, rowId, { notBefore: (val as string | null) || undefined }, act);
      if (key === 'duration') return patchNote(ws, rowId, (n) => (n.milestone ? n : setOpt(n, 'duration', typeof val === 'number' && val >= 1 ? Math.min(9999, Math.round(val)) : null)), now);
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
      if (key === 'tasks' || key === 'powers' || key === 'duty') return editRoles(ws, pid, { kind: 'akv', role: rowId, key, text: (val as string | null) ?? undefined });
      if (key === 'parent' || key === 'kind' || key === 'link' || key === 'org') return editRoles(ws, pid, { kind: 'set', role: rowId, key, value: (val as string | null) ?? undefined });
      return editRoles(ws, pid, { kind: 'person', role: rowId, person: (val as string | null) ?? undefined });
    case 'accept': {
      const { note, i } = splitCheck(rowId);
      return patchNote(ws, note, (n) => {
        const list = [...(n.accept ?? [])];
        const c = list[i];
        if (!c) return n;
        if (key === 'text') {
          if (typeof val !== 'string' || !val.trim()) return n;
          list[i] = { ...c, text: val.slice(0, 2000) };
        } else if (key === 'ok') list[i] = setOpt(c, 'ok', val === true ? true : null);
        else list[i] = setOpt(c, key, typeof val === 'string' ? val.slice(0, 300) : val);
        return { ...n, accept: list };
      }, now);
    }
    case 'comms':
    case 'reports':
    case 'docs':
    case 'checks':
    case 'lessons':
    case 'changes':
    case 'rules':
    case 'wpReports':
    case 'teamRoles':
    case 'messages':
    case 'moderations':
    case 'actions':
    case 'annexes':
      return editItem(ws, pid, form.source, rowId, { [key]: val }, now);
    case 'eisenhower':
      if (key === 'important' || key === 'urgent') return updateNote(ws, rowId, { [key]: val === true }, act);
      if (key === 'title') return typeof val === 'string' && val.trim() ? updateNote(ws, rowId, { title: val.trim() }, act) : ws;
      return ws;
    case 'close':
      return editClose(ws, pid, { [key]: val }, now);
    case 'wp':
      if (key === 'title') return typeof val === 'string' ? updateNote(ws, rowId, { title: val }, act) : ws;
      if (key === 'assignee') return updateNote(ws, rowId, { assignee: (val as string | null) ?? undefined }, act);
      if (key === 'phase') return setPhase(ws, rowId, (val as string | null) ?? undefined, now);
      if (key === 'results') {
        const lines = typeof val === 'string' ? val.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 50) : [];
        return patchNote(ws, rowId, (n) => setOpt(n, 'results', lines.length ? lines : null), now);
      }
      if (key === 'hours') return patchNote(ws, rowId, (n) => setOpt(n, 'effort', setOpt(n.effort ?? {}, 'plan', val)), now);
      if (key === 'cost') return patchNote(ws, rowId, (n) => setOpt(n, 'cost', setOpt(n.cost ?? {}, 'plan', val)), now);
      return patchNote(ws, rowId, (n) => setOpt(n, 'wp', parseWp(setOpt(n.wp ?? {}, key, val)) ?? null), now);
    default:
      return ws;
  }
}

// ---------------------------------------------------------------- Zeilen anlegen, löschen, verschieben

const LIST: Partial<Record<FormSource, GpmList>> = { goals: 'goals', conflicts: 'conflicts', stakeholders: 'stakeholders', phases: 'phases', comms: 'comms', reports: 'reports', docs: 'docs', checks: 'checks', lessons: 'lessons', changes: 'changes', rules: 'rules', wpReports: 'wpReports', teamRoles: 'teamRoles', messages: 'messages', moderations: 'moderations', actions: 'actions', annexes: 'annexes' };
/** V115: gerechnete Formulare ohne eigene Zeilen. */
const COMPUTED: readonly FormSource[] = ['persons', 'costs', 'ev', 'mta'];
/** Kann das Formular Zeilen anlegen? (Ressourcen entstehen über Einsätze; Einsätze brauchen Vorgang und Person.) */

/** V133 (F-232 P9): breite Tabellen (mehr als 7 Spalten) stehen im Querformat – im Bericht (Seite „wide“) und auf dem Blatt. */
export function isWideForm(f: FormDef, colCount: number): boolean {
  // F-234: Balkenplan und PSP brauchen das Querformat wie Abb. 10/13 im Report
  if (f.layout === 'figure') return f.figure === 'gantt' || f.figure === 'psp' || f.figure === 'goalTree';
  return (f.layout === 'table' || f.layout === 'chart' || f.layout === 'portfolio') && colCount > 7;
}

export const canAddRow = (form: FormDef): boolean => (form.layout === 'table' || form.layout === 'record') && !COMPUTED.includes(form.source);
/** Kann man Zeilen von Hand verschieben? (nur Listen am Projekt) */
/** V115: Zeilen löschen – nicht bei gerechneten Formularen (Earned Value, Kosten) und Ressourcen. */
export const canRemoveRow = (form: FormDef): boolean => form.layout === 'table' && !COMPUTED.includes(form.source);
export const canMoveRow = (form: FormDef): boolean => !!LIST[form.source] && form.source !== 'reports' && form.source !== 'wpReports' && form.layout === 'table';

/** G4: Zeile anlegen; Einsatz braucht `init.task` und `init.person`, Zielkonflikt nimmt sonst die ersten zwei Ziele. */
/** Vorgaben für eine neue Zeile (V140: `quad` = Feld eines neuen Eisenhower-Eintrags). */
export type RowInit = { task?: string; person?: string; a?: string; b?: string; parent?: string; rkind?: 'staff' | 'external'; quad?: EisenQuadKey };
export type EisenQuadKey = 'do' | 'plan' | 'delegate' | 'drop';

export function addRow(ws: Workspace, pid: string, form: FormDef, act: Act & { id: string; at?: number; init?: RowInit }): { ws: Workspace; id: string } | null {
  const p = projectById(ws, pid);
  if (!p || !canAddRow(form)) return null;
  const now = act.now ?? Date.now();
  const kinds = form.filter?.split(',');
  switch (form.source) {
    case 'eisenhower': {
      // V140 (F-237 H3): neuer Eintrag in der gewählten Matrix, im angegebenen Feld (sonst „liegen lassen“)
      const v = Sh.projectMatrix(ws, pid);
      if (!v) return null;
      const q = act.init?.quad ?? 'drop';
      const made = createNote(ws, { title: 'Neuer Eintrag', important: q === 'do' || q === 'plan', urgent: q === 'do' || q === 'delegate' }, { id: act.id, now, by: act.by });
      const r = placeNote(made.ws, made.id, { view: v.id }, { now, by: act.by });
      return { ws: r.ok ? r.ws : made.ws, id: made.id };
    }
    case 'goals': {
      // V137 (Bearbeiten im Blatt): Unterziel – Art und Code vom Oberziel (L1 → L1.n)
      const up = act.init?.parent ? (p.goals ?? []).find((g) => g.id === act.init!.parent) : undefined;
      const kind = (up?.kind ?? kinds?.[0] ?? 'perf') as 'perf' | 'social' | 'non';
      const code = up?.code ? nextCode((p.goals ?? []).map((g) => g.code), `${up.code}.`) : nextCode((p.goals ?? []).map((g) => g.code), kind === 'perf' ? 'L' : kind === 'social' ? 'S' : 'N');
      const out = addItem(ws, pid, 'goals', { id: act.id, code, text: kind === 'non' ? 'Neues Nicht-Ziel' : up ? 'Neues Unterziel' : 'Neues Ziel', kind, ...(up ? { parent: up.id, level: up.level } : {}) }, act.at, now);
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
    case 'tasks': {
      // V137 (Bearbeiten im Blatt): unter einem Vorgang anlegen
      const up = act.init?.parent ? noteOf(ws, act.init.parent) : undefined;
      return createNote(ws, { title: 'Neues Arbeitspaket', project: pid, ...(up && up.project === pid ? { parent: up.id } : {}) }, { now, by: act.by, id: act.id });
    }
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
      const out = editRoles(ws, pid, { kind: 'add', name: act.init?.rkind === 'staff' ? 'Neue Stabsstelle' : act.init?.rkind === 'external' ? 'Neue externe Rolle' : 'Neue Rolle', rid: act.id, parent: act.init?.parent, rkind: act.init?.rkind });
      return out === ws ? null : { ws: out, id: act.id };
    }
    case 'accept': {
      // an den gewählten Meilenstein bzw. Vorgang, sonst an den ersten Meilenstein (sonst ersten Vorgang)
      const rows = taskRows(ws, pid);
      const t = (act.init?.task && rows.find((r) => r.id === act.init!.task)) || rows.find((r) => r.milestone) || rows[0];
      const n = noteOf(ws, t?.id);
      if (!n || (n.accept?.length ?? 0) >= 50) return null;
      const out = patchNote(ws, n.id, (x) => ({ ...x, accept: [...(x.accept ?? []), { text: 'Neues Abnahmekriterium' }] }), now);
      return { ws: out, id: `${n.id}#${(n.accept ?? []).length}` };
    }
    case 'comms': {
      const out = addItem(ws, pid, 'comms', { id: act.id, content: 'Neuer Eintrag' }, act.at, now);
      return out === ws ? null : { ws: out, id: act.id };
    }
    case 'docs': {
      const out = addItem(ws, pid, 'docs', { id: act.id, code: nextCode((p.docs ?? []).map((x) => x.code ?? ''), 'D-'), title: 'Neues Dokument', state: 'draft' }, act.at, now);
      return out === ws ? null : { ws: out, id: act.id };
    }
    case 'rules': {
      const out = addItem(ws, pid, 'rules', { id: act.id, code: nextCode((p.rules ?? []).map((x) => x.code ?? ''), 'A-'), title: 'Neue Auflage', state: 'open' }, act.at, now);
      return out === ws ? null : { ws: out, id: act.id };
    }
    case 'checks': {
      const out = addItem(ws, pid, 'checks', { id: act.id, object: 'Neues Lieferobjekt', result: 'open' }, act.at, now);
      return out === ws ? null : { ws: out, id: act.id };
    }
    case 'lessons': {
      const out = addItem(ws, pid, 'lessons', { id: act.id, topic: 'Neue Erfahrung' }, act.at, now);
      return out === ws ? null : { ws: out, id: act.id };
    }
    case 'changes': {
      const out = addItem(ws, pid, 'changes', { id: act.id, area: 'Neuer Bereich', state: 'planned' }, act.at, now);
      return out === ws ? null : { ws: out, id: act.id };
    }
    case 'reports': {
      const day = new Date(now).toISOString().slice(0, 10);
      const out = addItem(ws, pid, 'reports', newReport(ws, pid, act.id, day), act.at, now);
      return out === ws ? null : { ws: out, id: act.id };
    }
    case 'wp':
      return createNote(ws, { title: 'Neues Arbeitspaket', project: pid }, { now, by: act.by, id: act.id });
    case 'wpReports': {
      // an das gewählte Arbeitspaket, sonst an das erste laufende (sonst das erste)
      const rows = taskRows(ws, pid).filter((t) => !t.milestone && !t.summary);
      const t = (act.init?.task && rows.find((r) => r.id === act.init!.task)) || rows.find((r) => noteOf(ws, r.id)?.state === 'doing') || rows[0];
      if (!t) return null;
      const day = new Date(now).toISOString().slice(0, 10);
      const rep = newWpReport(ws, pid, act.id, t.id, day);
      if (!rep) return null;
      const out = addItem(ws, pid, 'wpReports', rep, act.at, now);
      return out === ws ? null : { ws: out, id: act.id };
    }
    case 'teamRoles': {
      const who = act.init?.person ?? rolesOf(p).find((r) => r.id === 'lead')?.person;
      const out = addItem(ws, pid, 'teamRoles', { id: act.id, ...(who ? { person: who } : {}) }, act.at, now);
      return out === ws ? null : { ws: out, id: act.id };
    }
    case 'messages': {
      const out = addItem(ws, pid, 'messages', { id: act.id, topic: 'Neues Gespräch' }, act.at, now);
      return out === ws ? null : { ws: out, id: act.id };
    }
    case 'moderations': {
      const out = addItem(ws, pid, 'moderations', { id: act.id, occasion: 'Neuer Anlass' }, act.at, now);
      return out === ws ? null : { ws: out, id: act.id };
    }
    case 'actions': {
      const out = addItem(ws, pid, 'actions', { id: act.id, code: nextCode((p.actions ?? []).map((x) => x.code ?? ''), 'M-'), title: 'Neue Maßnahme', state: 'open' }, act.at, now);
      return out === ws ? null : { ws: out, id: act.id };
    }
    case 'annexes': {
      const out = addItem(ws, pid, 'annexes', { id: act.id, code: `Anlage ${(p.annexes?.length ?? 0) + 1}`, title: 'Neue Anlage' }, act.at, now);
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
  | { kind: 'roles'; pid: string; roles: Project['roles'] }
  | { kind: 'accept'; note: string; accept: NonNullable<Note['accept']> }
  | { kind: 'eisen'; view: string; ids: string[]; note: string; flags?: Pick<Note, 'important' | 'urgent'>; del?: NoteUndo };

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
    case 'wp':
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
    case 'eisenhower': {
      // V140 (F-237 H3): aus der Matrix nehmen; eine Notiz, die es nur hier gab, wird gelöscht (Rückgängig am Ort)
      const v = Sh.projectMatrix(ws, pid);
      const n = noteOf(ws, rowId);
      if (!v || !n) return null;
      if (!v.ids.includes(rowId)) {
        // von der persönlichen Matrix eingesammelt: Einstufung zurücknehmen, dann ist sie draußen
        const flags = { important: n.important, urgent: n.urgent };
        return { ws: updateNote(ws, rowId, { important: undefined, urgent: undefined }, { now }), undo: { kind: 'eisen', view: v.id, ids: v.ids, note: rowId, flags } };
      }
      let out = removeFromView(ws, rowId, v.id, { now });
      const elsewhere = viewsOf(out).some((x) => (x.kind === 'kanban' ? (x.cols ?? []).some((c) => c.ids.includes(rowId)) : x.ids.includes(rowId)));
      const only = !n.project && !elsewhere && !notesOf(out).some((c) => c.parent === rowId);
      let del: NoteUndo | undefined;
      if (only) {
        const d = deleteNote(out, rowId);
        if (d) (out = d.ws), (del = d.undo);
      }
      return { ws: out, undo: { kind: 'eisen', view: v.id, ids: v.ids, note: rowId, ...(del ? { del } : {}) } };
    }
    case 'accept': {
      const { note, i } = splitCheck(rowId);
      const n = noteOf(ws, note);
      if (!n?.accept?.[i]) return null;
      const out = patchNote(ws, note, (x) => {
        const list = (x.accept ?? []).filter((_, j) => j !== i);
        return setOpt(x, 'accept', list.length ? list : null);
      }, now);
      return { ws: out, undo: { kind: 'accept', note, accept: n.accept } };
    }
    default:
      return null;
  }
}
export function undoRemoveRow(ws: Workspace, u: RowUndo, now = Date.now()): Workspace {
  if (u.kind === 'gpm') return undoRemoveItem(ws, u.undo, now);
  if (u.kind === 'note') return restoreNotes(ws, u.undo, { now });
  if (u.kind === 'use') return patchNote(ws, u.note, (n) => ({ ...n, use: u.use }), now);
  if (u.kind === 'accept') return patchNote(ws, u.note, (n) => ({ ...n, accept: u.accept }), now);
  if (u.kind === 'eisen') {
    let out = u.del ? restoreNotes(ws, u.del, { now }) : ws;
    if (u.flags) out = updateNote(out, u.note, u.flags, { now });
    return Sh.setMatrixIds(out, u.view, u.ids);
  }
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
        layout: f.layout === 'fields' || f.layout === 'record' || f.layout === 'chart' || f.layout === 'portfolio' || f.layout === 'figure' ? f.layout : 'table',
        ...(typeof f.figure === 'string' && FIGURES.includes(f.figure as NonNullable<FormDef['figure']>) ? { figure: f.figure as NonNullable<FormDef['figure']> } : {}),
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
  | { op: 'add'; pid: string; form: FormDef; id: string; at: number; by?: string; init?: RowInit }
  | { op: 'eisen'; pid: string; act: EisenAct; at: number }
  | { op: 'figMove'; pid: string; fig: string; key: string; dx: number; dy: number; at: number }
  | { op: 'figReset'; pid: string; fig: string; at: number }
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

/** F-234 D3 (V137): Kasten einer Grafik von Hand verschieben (Versatz zur errechneten Lage; 0/0 = zurück). */
export function setFigOffset(ws: Workspace, pid: string, fig: string, key: string, dx: number, dy: number, now = Date.now()): Workspace {
  const p = projectById(ws, pid);
  if (!p || !/^[a-zA-Z]{1,20}$/.test(fig) || !key) return ws;
  const all = JSON.parse(JSON.stringify(p.figLayout ?? {})) as NonNullable<Project['figLayout']>;
  const m = all[fig] ?? {};
  const x = Math.max(-3000, Math.min(3000, Math.round(dx)));
  const y = Math.max(-3000, Math.min(3000, Math.round(dy)));
  if (x || y) m[key] = { dx: x, dy: y };
  else delete m[key];
  if (Object.keys(m).length) all[fig] = m;
  else delete all[fig];
  return editProject(ws, pid, { figLayout: Object.keys(all).length ? all : undefined }, now);
}
export function resetFigLayout(ws: Workspace, pid: string, fig: string, now = Date.now()): Workspace {
  const p = projectById(ws, pid);
  if (!p?.figLayout?.[fig]) return ws;
  const all = { ...p.figLayout };
  delete all[fig];
  return editProject(ws, pid, { figLayout: Object.keys(all).length ? all : undefined }, now);
}

export function applyForm(ws: Workspace, o: FormOp): Workspace {
  switch (o.op) {
    case 'figMove':
      return setFigOffset(ws, o.pid, o.fig, o.key, o.dx, o.dy, o.at);
    case 'eisen':
      return applyEisen(ws, o.pid, o.act, o.at);
    case 'figReset':
      return resetFigLayout(ws, o.pid, o.fig, o.at);
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

// ---------------------------------------------------------------- V140 (F-237): Eisenhower-Matrizen in 15.2

/** Aktionen an den Matrizen von 15.2 (eine Matrix = ein Eisenhower-Sheet wie im Notizen-Modus). */
export type EisenAct =
  | { kind: 'new'; id: string; name: string; person?: string; date?: string }
  | { kind: 'select'; view: string }
  | { kind: 'map'; view: string; on: boolean }
  | { kind: 'edit'; view: string; name?: string; person?: string; date?: string }
  | { kind: 'take'; view: string; ids: string[] }
  | { kind: 'delete'; view: string }
  | { kind: 'restore'; undo: ViewUndo; maps?: string[]; sel?: string };

/** Offene Arbeitspakete des Projekts (ohne Meilensteine und Sammelvorgänge) – Auswahl für „Arbeitspakete übernehmen …“. */
export function openWorkPackages(ws: Workspace, pid: string, withSubs = false): { id: string; code?: string; title: string; project: string }[] {
  // V140 (H10): auf Wunsch mit den Arbeitspaketen der Teilprojekte (PSP-Code aus dem Gesamt-PSP)
  return pspRows(pspTree(ws, pid))
    .filter((t) => t.kind === 'task' && (withSubs || t.owner === pid))
    .filter((t) => !t.milestone && !t.summary)
    .filter((t) => { const n = noteOf(ws, t.id); return !!n && n.state !== 'done' && n.state !== 'archived'; })
    .map((t) => ({ id: t.id, ...(t.code ? { code: t.code } : {}), title: t.title, project: t.owner }));
}

export function applyEisen(ws: Workspace, pid: string, a: EisenAct, now = Date.now()): Workspace {
  const p = projectById(ws, pid);
  if (!p) return ws;
  switch (a.kind) {
    case 'new': {
      const made = createView(ws, 'eisenhower', a.name, { id: a.id });
      const out = Sh.editMatrix(made.ws, made.id, { owner: { kind: 'project', id: pid }, person: a.person, date: a.date });
      return editProject(out, pid, { eisenSel: made.id }, now);
    }
    case 'select':
      return Sh.projectMatrices(ws, pid).some((v) => v.id === a.view) ? editProject(ws, pid, { eisenSel: a.view }, now) : ws;
    case 'map': {
      const v = viewById(ws, a.view);
      if (!v || v.kind !== 'eisenhower' || Sh.matrixProject(v) === pid) return ws;
      const maps = (p.eisenMaps ?? []).filter((x) => x !== a.view);
      if (a.on) maps.push(a.view);
      return editProject(ws, pid, { eisenMaps: maps.length ? maps : undefined, eisenSel: a.on ? a.view : p.eisenSel === a.view ? undefined : p.eisenSel }, now);
    }
    case 'edit':
      return Sh.editMatrix(ws, a.view, { name: a.name, person: a.person, date: a.date });
    case 'take': {
      let out = ws;
      for (const id of a.ids) {
        const r = placeNote(out, id, { view: a.view }, { now });
        if (r.ok) out = r.ws;
      }
      return out;
    }
    case 'delete': {
      const v = viewById(ws, a.view);
      if (!v || Sh.matrixProject(v) !== pid) return ws;
      const r = deleteView(ws, a.view);
      return r ? editProject(r.ws, pid, { eisenSel: p.eisenSel === a.view ? undefined : p.eisenSel }, now) : ws;
    }
    case 'restore':
      return editProject(restoreView(ws, a.undo), pid, { eisenMaps: a.maps, eisenSel: a.sel ?? a.undo.view.id }, now);
  }
}

/**
 * V140 (F-237 H8): Einmalig je Projekt eine Matrix mit den offenen Arbeitspaketen anlegen – so sieht 15.2 (Abb. 17)
 * nach dem Umbau aus wie vorher. Läuft beim Laden; danach merkt sich das Projekt `eisenInit`.
 */
export function ensureMatrices(ws: Workspace, now = Date.now()): Workspace {
  let out = ws;
  for (const p of ws.projects ?? []) {
    if (p.eisenInit) continue;
    const id = `eis-${p.id}`;
    if (!viewById(out, id) && !viewsOf(out).some((v) => v.kind === 'eisenhower' && Sh.matrixProject(v) === p.id)) {
      const wps = openWorkPackages(out, p.id);
      if (wps.length) {
        out = applyEisen(out, p.id, { kind: 'new', id, name: `Eisenhower-Matrix ${p.name}`.slice(0, 80) }, now);
        out = applyEisen(out, p.id, { kind: 'take', view: id, ids: wps.map((w) => w.id) }, now);
      }
    }
    // Merker ohne „geändert“-Zeit, damit der Abgleich das Laden nicht als Änderung zählt
    out = { ...out, projects: (out.projects ?? []).map((x) => (x.id === p.id ? { ...x, eisenInit: true as const } : x)) };
  }
  return out;
}
