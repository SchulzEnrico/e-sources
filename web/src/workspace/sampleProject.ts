/**
 * F-206 Schritt 10 (V100): Beispielprojekt „ColorGentlemen“ aus Enricos Projektmanagement-Report
 * (Zertifizierung IPMA ICB4 Level D, 11.11.2020) zum Testen von PSP, Gantt, Netzplan, Basisplan und Bericht.
 * Quelle: Steckbrief (Abb. 3), Meilensteine (Tab. 10), Vorgangsliste aus MS Project (Anlage 4: PSP-Code,
 * Dauer, Anfang, Ende, Vorgänger mit EA/AA/EE und Abstand), Zentraltabelle der Kostenplanung (Anlage 1:
 * Aufwand je Ressourcengruppe in Ph, Kosten). Termine um genau 6 Jahre verschoben (01.12.2020 → 01.12.2026,
 * gleiche Wochentage), damit das Projekt jetzt beginnt. Feste Ids mit „cg-“, damit es sich ganz entfernen lässt.
 */
import type { Note, NoteLink, NoteRel, Person, Project, Workspace } from './types';
import { createNote, notesOf } from './notes';
import { headText } from './sheets';
import { ME_ID, ensureMe } from './persons';

export const SAMPLE_PROJECT = 'pj-cg';
const NOTE_PREFIX = 'cg-';
const PERSON_PREFIX = 'pn-cg-';

/** 2020/2021 → 2026/2027 (gleiche Wochentage). */
const shift = (d: string) => `${Number(d.slice(0, 4)) + 6}${d.slice(4)}`;

type Res = 'PL' | 'PA' | 'LM' | 'GL' | 'LB';
/** Ressourcengruppen (Tab. 11): Verfügbarkeit × 40 h; PL = „ich“. */
const PEOPLE: { res: Exclude<Res, 'PL'>; name: string; capacity: number }[] = [
  { res: 'PA', name: 'Projektassistenz (CG)', capacity: 10 },
  { res: 'LM', name: 'Lackiermeister (CG, n. N.)', capacity: 36 },
  { res: 'GL', name: 'Gebietsleitung (CG)', capacity: 6 },
  { res: 'LB', name: 'Leitung Buchhaltung (CG)', capacity: 6 },
];
const personId = (r: Res) => (r === 'PL' ? ME_ID : `${PERSON_PREFIX}${r.toLowerCase()}`);

interface Row {
  /** Zeile in MS Project (für die Vorgänger). */
  nr: number;
  code: string;
  name: string;
  /** Sammelvorgang: Zeile der Eltern. */
  parent?: number;
  days: number;
  start: string;
  end: string;
  /** Vorgänger wie in MS Project: „3AA“, „10EA+1“, „15EE“. */
  pred?: string;
  /** Aufwand in Ph, Kosten in €, zuständig (Gruppe mit dem größten Anteil). */
  effort?: number;
  cost?: number;
  who?: Res;
  text?: string;
}

const ROWS: Row[] = [
  { nr: 2, code: '1.1', name: 'Projektmanagement', days: 146, start: '2020-12-01', end: '2021-06-30' },
  { nr: 3, code: '1.1.1', name: 'Projektstart', parent: 2, days: 17, start: '2020-12-01', end: '2020-12-23', pred: '32', effort: 40, cost: 1720, who: 'PL' },
  { nr: 4, code: '1.1.2', name: 'Projektplanung', parent: 2, days: 114, start: '2020-12-01', end: '2021-05-14', pred: '3AA', effort: 150, cost: 6875, who: 'PL' },
  { nr: 5, code: '1.1.3', name: 'Stakeholdermanagement', parent: 2, days: 114, start: '2020-12-01', end: '2021-05-14', pred: '3AA', effort: 80, cost: 3660, who: 'PL' },
  { nr: 6, code: '1.1.4', name: 'Risikomanagement', parent: 2, days: 114, start: '2020-12-01', end: '2021-05-14', pred: '3AA', effort: 20, cost: 1020, who: 'PL' },
  { nr: 7, code: '1.1.5', name: 'Projektsteuerung', parent: 2, days: 138, start: '2020-12-01', end: '2021-06-18', pred: '3AA', effort: 500, cost: 25500, who: 'PL' },
  { nr: 8, code: '1.1.6', name: 'Projektabschluss', parent: 2, days: 31, start: '2021-05-18', end: '2021-06-30', pred: '4; 5; 6; 26AA', effort: 40, cost: 1515, who: 'PA' },
  { nr: 9, code: '1.2', name: 'Gebäude Anpassung', days: 78, start: '2020-12-24', end: '2021-04-16' },
  { nr: 10, code: '1.2.1', name: 'Schlüsselübergabe und Schadensaufnahme', parent: 9, days: 5, start: '2020-12-24', end: '2020-12-31', pred: '3', effort: 30, cost: 1530, who: 'PL' },
  { nr: 11, code: '1.2.2', name: 'Schäden am Gebäude beheben', parent: 9, days: 10, start: '2021-01-05', end: '2021-01-18', pred: '34', cost: 3700, text: 'Sachmittel: Reparatur und Wartung der Heizung.' },
  { nr: 12, code: '1.2.3', name: 'Gebäude umbauen', parent: 9, days: 19, start: '2021-01-05', end: '2021-01-29', pred: '11AA', effort: 20, cost: 16020, who: 'PL', text: 'Sachmittel: Umbau Gebäude.' },
  { nr: 13, code: '1.2.4', name: 'elektrische Anlagen erneuern', parent: 9, days: 62, start: '2021-01-19', end: '2021-04-16', pred: '11', effort: 10, cost: 63510, who: 'PL', text: 'Sachmittel: elektrische Anlagen für die Unbedenklichkeitsbescheinigung (UBB).' },
  { nr: 14, code: '1.3', name: 'Einrichtung Büro', days: 13, start: '2021-01-04', end: '2021-01-20' },
  { nr: 15, code: '1.3.1', name: 'EDV und Netzwerk installieren', parent: 14, days: 10, start: '2021-01-04', end: '2021-01-15', pred: '10', effort: 5, cost: 6655, who: 'PL' },
  { nr: 16, code: '1.3.2', name: 'Büroräume streichen', parent: 14, days: 2, start: '2021-01-14', end: '2021-01-15', pred: '15EE', cost: 500 },
  { nr: 17, code: '1.3.3', name: 'Büroräume einrichten', parent: 14, days: 3, start: '2021-01-18', end: '2021-01-20', pred: '16', effort: 5, cost: 7055, who: 'PL', text: 'Sachmittel: Büromöbel, Tresore.' },
  { nr: 18, code: '1.4', name: 'Werkstattanpassung', days: 39, start: '2021-01-05', end: '2021-02-26' },
  { nr: 19, code: '1.4.1', name: 'Wartungen vorhandener Technik', parent: 18, days: 39, start: '2021-01-05', end: '2021-02-26', pred: '12AA', cost: 4500, text: 'Sachmittel: Reparatur und Wartung der Stempelbühnen.' },
  { nr: 20, code: '1.4.2', name: 'Ausstattung mit neuer Technik', parent: 18, days: 20, start: '2021-02-01', end: '2021-02-26', pred: '35', effort: 25, cost: 71950, who: 'PL', text: 'Sachmittel: Schließanlage, mobile Hebebühnen, Sandstrahlanlage, Richtbank, Reifenwuchtmaschine, Werkzeugwagen, Infrarot-Lacktrockner, mobile Absauganlagen.' },
  { nr: 21, code: '1.5', name: 'Installation und Abstimmung Lackieranlagen', days: 61, start: '2021-03-01', end: '2021-05-28' },
  { nr: 22, code: '1.5.1', name: 'Stromversorgung herstellen', parent: 21, days: 5, start: '2021-03-01', end: '2021-03-05', pred: '36', effort: 5, cost: 165, who: 'LM' },
  { nr: 23, code: '1.5.2', name: 'Gasversorgung herstellen', parent: 21, days: 5, start: '2021-03-08', end: '2021-03-12', pred: '22', effort: 5, cost: 165, who: 'LM' },
  { nr: 24, code: '1.5.3', name: 'Lackieranlage 1 installieren', parent: 21, days: 9, start: '2021-04-06', end: '2021-04-16', pred: '13EE; 23', effort: 30, cost: 68177, who: 'LM', text: 'Sachmittel: Lackierkabine, Elektrik, Gasversorgung, Gebühr Bezirksschornsteinfeger.' },
  { nr: 25, code: '1.5.4', name: 'Abstimmung der Einstellungen', parent: 21, days: 20, start: '2021-04-19', end: '2021-05-17', pred: '24', effort: 10, cost: 330, who: 'LM' },
  { nr: 26, code: '1.5.5', name: 'Lackieranlage 2 installieren', parent: 21, days: 8, start: '2021-05-18', end: '2021-05-28', pred: '25', effort: 30, cost: 68177, who: 'LM', text: 'Sachmittel: Lackierkabine, Elektrik, Gasversorgung, Gebühr Bezirksschornsteinfeger.' },
  { nr: 27, code: '1.6', name: 'Organisation und Prozesse', days: 115, start: '2021-01-05', end: '2021-06-18' },
  { nr: 28, code: '1.6.1', name: 'Lackiermeister einstellen', parent: 27, days: 40, start: '2021-01-05', end: '2021-03-01', pred: '34', effort: 55, cost: 2200, who: 'GL' },
  { nr: 29, code: '1.6.2', name: 'Aufbaustruktur festlegen', parent: 27, days: 5, start: '2021-03-02', end: '2021-03-08', pred: '28; 36', effort: 25, cost: 970, who: 'PL' },
  { nr: 30, code: '1.6.3', name: '14 Mitarbeiter einstellen', parent: 27, days: 58, start: '2021-03-02', end: '2021-05-26', pred: '28', effort: 180, cost: 6150, who: 'LM' },
  {
    nr: 31, code: '1.6.4', name: 'Prozesse festlegen', parent: 27, days: 43, start: '2021-04-19', end: '2021-06-18', pred: '24; 29; 20; 37', effort: 295, cost: 10320, who: 'LM',
    text: 'Der Lackiermeister erarbeitet zusammen mit dem Anwendungstechniker der Glasklar GmbH die einzelnen Prozessschritte und stellt sie zu sinnvollen Prozessketten zusammen. Qualitätsmanagement und Buchhaltung leiten unterstützend an und helfen bei Dokumentation und Systemeinführung.\n\n**Ergebnis:** übergabefertige Prozessbeschreibungen und Ablaufdiagramme.\n\n**Fortschrittsmessung:** aufwandsproportional.',
  },
  { nr: 32, code: 'M0', name: 'Projektstart', days: 0, start: '2020-12-01', end: '2020-12-01' },
  { nr: 33, code: 'M1', name: 'Schlüsselübergabe erfolgt', days: 0, start: '2020-12-23', end: '2020-12-23', pred: '3' },
  { nr: 34, code: 'M-S/B&U', name: 'Start Beauftragung & Umbau', days: 0, start: '2021-01-04', end: '2021-01-04', pred: '10EA+1' },
  { nr: 35, code: 'M2', name: 'Detailplanung abgeschlossen', days: 0, start: '2021-01-29', end: '2021-01-29', pred: '12; 17' },
  { nr: 36, code: 'M3', name: 'Werkstatt fertig und Beauftragung abgeschlossen', days: 0, start: '2021-02-26', end: '2021-02-26', pred: '19' },
  { nr: 37, code: 'M-LA1', name: 'Lackieranlage 1 ist in Betrieb', days: 0, start: '2021-04-16', end: '2021-04-16', pred: '13' },
  { nr: 38, code: 'M-LA2', name: 'Lackieranlage 2 ist in Betrieb', days: 0, start: '2021-05-28', end: '2021-05-28', pred: '26; 30' },
  { nr: 39, code: 'M4', name: 'Umbau & Inbetriebnahme abgeschlossen', days: 0, start: '2021-06-18', end: '2021-06-18', pred: '38; 7; 31' },
  { nr: 40, code: 'M5', name: 'Projektende', days: 0, start: '2021-06-30', end: '2021-06-30', pred: '39; 8' },
];

const noteId = (nr: number) => `${NOTE_PREFIX}${nr}`;

/** „4; 5; 26AA; 10EA+1“ → Vorgänger (Abstand in Arbeitstagen wie MS Project). */
export function parsePreds(s: string | undefined): NoteLink[] {
  if (!s) return [];
  return s.split(';').flatMap((part) => {
    const m = /^\s*(\d+)\s*(EA|AA|EE|AE)?\s*([+-]\s*\d+)?/.exec(part);
    if (!m) return [];
    const lag = m[3] ? Number(m[3].replace(/\s/g, '')) : 0;
    return [{ id: noteId(Number(m[1])), rel: (m[2] ?? 'EA') as NoteRel, ...(lag ? { lag } : {}) }];
  });
}

export const hasSampleProject = (ws: Workspace): boolean => (ws.projects ?? []).some((p) => p.id === SAMPLE_PROJECT);

/** Beispielprojekt anlegen (nichts, wenn es schon da ist). */
export function addSampleProject(ws: Workspace, now = Date.now()): Workspace {
  if (hasSampleProject(ws)) return ws;
  let next = ensureMe(ws);
  const persons: Person[] = PEOPLE.filter((p) => !(next.persons ?? []).some((x) => x.id === personId(p.res))).map((p) => ({ id: personId(p.res), name: p.name, kind: 'role', capacity: p.capacity }));
  if (persons.length) next = { ...next, persons: [...(next.persons ?? []), ...persons] };
  const project: Project = {
    id: SAMPLE_PROJECT,
    name: 'ColorGentlemen',
    psp: { prefix: 'CG-1.', style: 'num' },
    brief: {
      goal: 'Oberziel: Errichtung und Inbetriebnahme einer neuen Betriebsstätte der FIT GmbH. Umbau einer angemieteten Kfz-Werkstatt im Hamburger Umland zur Lackiererei mit zwei Lackieranlagen, neue Prozesse erarbeiten und einführen, 15 Mitarbeiter einstellen. Nutzen: Werkvertrag mit der Hamburger Mobile GmbH (ca. 3.500 Instandsetzungen p. a.) abwickeln, Marktstellung festigen. Nicht-Ziele: Marketing, Akquise weiterer Kunden für diesen Standort.',
      approach: 'Organisations- und Investitionsprojekt, klassisch in Phasen: Konzept & Analyse · Detailplanung · Beauftragung · Umbau & Inbetriebnahme · Abschluss. PSP funktionsorientiert gegliedert; Statusbericht 14-täglich als A3; Aufgaben zusätzlich als Arbeitskarten in Trello.',
      org: 'Matrix-Projektorganisation. Auftraggeber: GF FIT GmbH (Hr. Meier). Projektleitung: Enrico Schulz. Team: Gebietsleitung (Hr. Kabel), Projektassistenz/QMB (Fr. Mikitta), Leitung Buchhaltung (Fr. Stanczak), Lackiermeister/in (n. N.). Externe: Fuchs Lackieranlagen, Glasklar GmbH, Elektro, Klempner; weitere Stakeholder: Hamburger Mobile, Vermieter, Bezirksschornsteinfeger.',
    },
    start: shift('2020-12-01'),
    end: shift('2021-06-30'),
    budget: 400000,
    priority: 1,
    state: 'planned',
    created: now,
    changed: now,
  };
  next = { ...next, projects: [...(next.projects ?? []), project] };
  const byNr = new Map(ROWS.map((r) => [r.nr, r]));
  for (const r of ROWS) {
    const ms = r.days === 0;
    const init: Partial<Note> = {
      title: '',
      text: `${headText(r.name)}\n\n${ms ? 'Meilenstein' : 'PSP-Code im Report:'} CG-${r.code} (Projektreport ColorGentlemen).${r.text ? `\n\n${r.text}` : ''}`,
      project: SAMPLE_PROJECT,
      // V101: „nicht beginnen vor“ nur ohne Vorgänger (sonst wäre jeder Vorgang auf den Report-Termin
      // festgelegt wie eine Einschränkung in MS Project); „fällig am“ = Ende im Report = Stichtag (K3)
      ...(!r.pred && !ROWS.some((x) => x.parent === r.nr) ? { notBefore: shift(r.start) } : {}),
      due: shift(r.end),
      ...(r.parent && byNr.has(r.parent) ? { parent: noteId(r.parent) } : {}),
      ...(ms ? { milestone: true } : { duration: r.days }),
      ...(r.effort ? { effort: { plan: r.effort } } : {}),
      ...(r.cost ? { cost: { plan: r.cost } } : {}),
      ...(r.who ? { assignee: personId(r.who) } : {}),
    };
    const after = parsePreds(r.pred);
    if (after.length) init.after = after;
    next = createNote(next, init, { id: noteId(r.nr), now }).ws;
  }
  return next;
}

/** Beispielprojekt ganz entfernen: Projekt, seine Vorgänge („cg-…“) und die eigens angelegten Personen. */
export function removeSampleProject(ws: Workspace): Workspace {
  if (!hasSampleProject(ws) && !notesOf(ws).some((n) => n.id.startsWith(NOTE_PREFIX))) return ws;
  const notes = notesOf(ws).filter((n) => !(n.id.startsWith(NOTE_PREFIX) && (!n.project || n.project === SAMPLE_PROJECT)));
  const still = new Set(notes.map((n) => n.assignee));
  const persons = (ws.persons ?? []).filter((p) => !p.id.startsWith(PERSON_PREFIX) || still.has(p.id));
  const projects = (ws.projects ?? []).filter((p) => p.id !== SAMPLE_PROJECT);
  const keep = (id: string) => !id.startsWith(NOTE_PREFIX);
  const noteViews = (ws.noteViews ?? []).map((v) => ({ ...v, ids: v.ids.filter(keep), ...(v.cols ? { cols: v.cols.map((c) => ({ ...c, ids: c.ids.filter(keep) })) } : {}) }));
  const out: Workspace = { ...ws, notes, persons, projects, noteViews };
  if (!projects.length) delete out.projects;
  return out;
}
