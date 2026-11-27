/**
 * F-206 Schritt 10 (V100): Beispielprojekt „ColorGentlemen“ aus Enricos Projektmanagement-Report
 * (Zertifizierung IPMA ICB4 Level D, 11.11.2020) zum Testen von PSP, Gantt, Netzplan, Basisplan und Bericht.
 * Quelle: Steckbrief (Abb. 3), Meilensteine (Tab. 10), Vorgangsliste aus MS Project (Anlage 4: PSP-Code,
 * Dauer, Anfang, Ende, Vorgänger mit EA/AA/EE und Abstand), Zentraltabelle der Kostenplanung (Anlage 1:
 * Aufwand je Ressourcengruppe in Ph, Kosten). Termine um genau 6 Jahre verschoben (01.12.2020 → 01.12.2026,
 * gleiche Wochentage), damit das Projekt jetzt beginnt. Feste Ids mit „cg-“, damit es sich ganz entfernen lässt.
 * V108 (Enrico: „Lege mein Projekt aus meinem Report einmal in Projekte an“): alles aus dem Report, was das
 * Datenmodell heute fassen kann – Steckbrief (Abb. 3), Ziele und Zielkonflikte (Tab. 1/2), Phasen (Tab. 9),
 * Ergebnisse der Meilensteine (Tab. 10), Abnahmekriterien (Tab. 3), Instanzen (Tab. 7), Personen mit Namen,
 * AP-Beschreibung und Statusbericht CG-1.6.4 (Abb. 11/15, Ist-Werte), die echten Risiken CG-R1–R3 (Tab. 5/6)
 * und zwei Änderungen aus dem Report (Engpass PL Kap. 10.2, Lackieranlagen Kap. 14). Was nicht passt, steht in
 * der Lückenliste des Lastenhefts (F-226).
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
/** V109 (F-226, L6): Stundensätze aus dem Report (Kap. 11); PL 51 € steht nur am Einsatz, „ich“ bleibt unberührt. */
const PEOPLE: { res: Exclude<Res, 'PL'>; name: string; capacity: number; rate: number }[] = [
  { res: 'PA', name: 'Fr. Mikitta – Projektassistenz, QMB (CG)', capacity: 10, rate: 30 },
  { res: 'LM', name: 'Lackiermeister/in (CG, n. N.)', capacity: 36, rate: 33 },
  { res: 'GL', name: 'Hr. Kabel – Gebietsleitung (CG)', capacity: 6, rate: 41 },
  { res: 'LB', name: 'Fr. Stanczak – Leitung Buchhaltung (CG)', capacity: 6, rate: 39 },
];
const PL_RATE = 51;
/** V108: Auftraggeber (SH-IN 01) – Person ohne Kapazität im Projekt. */
const CLIENT = `${PERSON_PREFIX}meier`;
/** V108 (Tab. 11): Lackiermeister/in erst ab M3 (Einstellung) verfügbar. */
const LM_AWAY = { from: '2020-12-01', to: '2021-02-25', why: 'noch nicht eingestellt (ab M3)' };
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
  /** V108: Ist-Werte aus dem Statusbericht (Abb. 15). */
  actual?: { effort: number; cost: number };
  /** V108: Abnahmekriterien (Tab. 3, Stand 16.04.2021) – [Text, abgenommen]. */
  accept?: [string, boolean][];
  cost?: number;
  who?: Res;
  text?: string;
  /** V109 (F-226): Ergebnisse des Meilensteins (Tab. 10) als Liste. */
  results?: string[];
  /** V109 (F-226, G8): Phase (Id in PHASES). */
  phase?: string;
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
    actual: { effort: 198, cost: 6920 },
    text: 'Phase: Umbau & Inbetriebnahme. Verantwortlich: Lackiermeister/in (n. N.).\n\n**Aktivitäten:** Der Lackiermeister erarbeitet zusammen mit dem Anwendungstechniker der Glasklar GmbH (SH-EX 05, Hr. Talib) die einzelnen Prozessschritte und stellt sie zu sinnvollen Prozessketten zusammen. Qualitätsmanagement und Buchhaltung leiten unterstützend an und helfen bei Dokumentation und Systemeinführung.\n\n**Ergebnis:** übergabefertige Prozessbeschreibungen und Ablaufdiagramme.\n\n**Personal (295 Ph, 10.320 €):** Projektleitung 10 Ph × 51 € · Projektassistenz 25 Ph × 30 € · Leitung Buchhaltung 80 Ph × 39 € · Lackiermeister 180 Ph × 33 €.\n\n**Sachmittel:** keine – übernimmt die Glasklar GmbH als Teil des Lackausrüster-Vertrags.\n\n**Chancen/Risiken:** Bei gut optimierten Prozessen steigen die Wirtschaftlichkeit der Lackieranlagen und der Lackmittel, die Reklamationsquote sinkt.\n\n**Fortschrittsmessung:** aufwandsproportional. Freigabe AP: PL 21.01., AP-Verantwortlicher 23.03.\n\n**Statusbericht zum 17.05. (KW 18/19):** Ist-Start 16.04., Aufwand Ist 198 Ph (Rest 97 Ph), Kosten Ist 6.920 € (Rest 3.400 €). Grundeinstellungen der Lackieranlage (Luftmassendurchsatz, Heizleistung) sind vorgenommen, Testlackierungen weitgehend durchgeführt, Feinabstimmung des Lackmaterials läuft. Prozessschritte inkl. abrechnungsrelevanter Textvorlagen sind definiert und werden zu Prozessketten zusammengesetzt; die Textvorlagen sind im ERP-System und in der Funktionsprüfung. Steuerungsmaßnahmen: keine.',
  },
  { nr: 32, code: 'M0', name: 'Projektstart', days: 0, start: '2020-12-01', end: '2020-12-01', results: ['Projekt durch den Auftraggeber (Hr. Meier) beauftragt', 'Kick-off-Meeting mit Einweisungen des Projektleiters'] },
  { nr: 33, code: 'M1', name: 'Schlüsselübergabe erfolgt', days: 0, start: '2020-12-23', end: '2020-12-23', pred: '3', text: 'Soll: M0 + 3 Wochen.', results: ['Schlüsselübergabe erfolgt', 'Schadensprotokoll erstellt', 'Abgleich mit der Machbarkeit des Konzepts erfolgt', 'Statusmeeting', 'Phase Detailplanung freigegeben'] },
  { nr: 34, code: 'M-S/B&U', name: 'Start Beauftragung & Umbau', days: 0, start: '2021-01-04', end: '2021-01-04', pred: '10EA+1', text: 'Soll: M1 + 1,5 Wochen.', results: ['Team geformt, Rollen verteilt', 'Ziele definiert', 'alle baulichen Anforderungen bekannt', 'erste Dienstleister definiert', 'Phasen Beauftragung sowie Umbau & Inbetriebnahme freigegeben'] },
  { nr: 35, code: 'M2', name: 'Detailplanung abgeschlossen', days: 0, start: '2021-01-29', end: '2021-01-29', pred: '12; 17', text: 'Soll: M-S/B&U + 4 Wochen. Nach Änderung CG-Ä-1 gilt M2 auch als erreicht, wenn die Büroräume noch nicht final eingerichtet sind.', results: ['Büros fertig', 'alle technischen und bauseitigen Anforderungen bekannt', 'Maßnahmen und Termine geplant', 'Statusmeeting', 'alle Pläne freigegeben'] },
  { nr: 36, code: 'M3', name: 'Werkstatt fertig und Beauftragung abgeschlossen', days: 0, start: '2021-02-26', end: '2021-02-26', pred: '19', accept: [['Werkstattausstattung nach Werkvertrag – Leistung PL, Abnahme AG', true]], text: 'Soll: M2 + 4 Wochen.', results: ['Lackiermeister eingestellt', 'alle Wartungen abgeschlossen', 'komplette technische Ausstattung einsatzbereit', 'Statusmeeting', 'alle Dienstleister und Prüfgesellschaften beauftragt, Verträge unterschrieben'] },
  { nr: 37, code: 'M-LA1', name: 'Lackieranlage 1 ist in Betrieb', days: 0, start: '2021-04-16', end: '2021-04-16', pred: '13', accept: [['Lackieranlage 1 nach Werkvertrag (Verfahrensvorgaben im Handbuch für Anwendungsverfahren der FIT GmbH) – Leistung LM, Abnahme Werkvertrag', true], ['Elektrische Anlagen: Unbedenklichkeitsbescheinigung (UBB) durch den Elektriker, Prüfdokument Werkvertrag – Leistung PL', true]], text: 'Soll: M3 + 7 Wochen.', results: ['elektrische Anlagen fertig', 'Lackierkabine 1 installiert', 'Statusmeeting', 'UBB an den Vermieter (SH-EX 02, Fr. Stenzel) übermittelt'] },
  { nr: 38, code: 'M-LA2', name: 'Lackieranlage 2 ist in Betrieb', days: 0, start: '2021-05-28', end: '2021-05-28', pred: '26; 30', accept: [['Lackieranlage 2 nach Werkvertrag – Leistung LM, Abnahme Werkvertrag', false]], text: 'Soll: M-LA1 + 6 Wochen.', results: ['alle Mitarbeiter eingestellt', 'Lackierkabine 2 installiert', 'Statusmeeting', 'Start der Abschlussphase'] },
  { nr: 39, code: 'M4', name: 'Umbau & Inbetriebnahme abgeschlossen', days: 0, start: '2021-06-18', end: '2021-06-18', pred: '38; 7; 31', accept: [['Aufbauorganisation und Prozesse nach QM-Handbuch der FIT GmbH; Leitbild: bestmögliche Ökonomie und Verfahrensqualität – Leistung LM, Abnahme PL', false]], text: 'Soll: M-LA2 + 3 Wochen.', results: ['alle Prozesse definiert', 'alle Arbeitsplätze eingerichtet', 'alle Mitarbeiter geschult', 'Betriebsstätte voll funktionsfähig'] },
  { nr: 40, code: 'M5', name: 'Projektende', days: 0, start: '2021-06-30', end: '2021-06-30', pred: '39; 8', accept: [['Projektmanagement nach IPMA ICB4 und PM-Handbuch der FIT GmbH (CI-Vorgaben zur Projektidentifikation) – Leistung PL & PA, Abnahme AG', false]], text: 'Soll: M4 + 1,5 Wochen.', results: ['Abschlussbericht erstellt und vorgetragen', 'Ziele des magischen Dreiecks erfüllt', 'alle wichtigen Stakeholder zufrieden'] },
];

const noteId = (nr: number) => `${NOTE_PREFIX}${nr}`;

/** „4; 5; 26AA; 10EA+1“ → Vorgänger (Abstand in Arbeitstagen wie MS Project). V134: Präfix der Ids wählbar (zweites Beispiel). */
export function parsePreds(s: string | undefined, prefix = NOTE_PREFIX): NoteLink[] {
  if (!s) return [];
  return s.split(';').flatMap((part) => {
    const m = /^\s*(\d+)\s*(EA|AA|EE|AE)?\s*([+-]\s*\d+)?/.exec(part);
    if (!m) return [];
    const lag = m[3] ? Number(m[3].replace(/\s/g, '')) : 0;
    return [{ id: `${prefix}${Number(m[1])}`, rel: (m[2] ?? 'EA') as NoteRel, ...(lag ? { lag } : {}) }];
  });
}

const ORG_TEXT = [
  'Matrix-Projektorganisation: Ressourcen flexibel einsetzen, weniger Kommunikationsaufwand. Projektleitung aus der Stammorganisation der FIT GmbH; betroffene Abteilungsleiter und Managementbeauftragte arbeiten in ihren Verantwortungsbereichen mit; Subunternehmer und Dienstleister per Vertrag, koordiniert durch den PL. Lenkungsausschuss: keiner.',
  '',
  'Rollen (Tab. 7, AKV folgt in F-226 Stufe 2): GF/AG – Projektauftrag, Nutzen und Ziele, Budget, Beurteilung der Ergebnisse; entscheidet über Beauftragung und Abbruch, kann den PL austauschen; Verantwortung für den Return on Investment. GL – Einstellung der Mitarbeiter, Anschaffung von Lackieranlagen und Geräten; Prokura, disziplinarische Weisung über die Lackierfachleute; Verantwortung für Sozial- und Kostenziele. PL – Auftrag und Planung abstimmen, Stakeholdermanagement, Team- und Dienstleisterkoordination, Steuerung und Überwachung; fachliche Weisung, unterschreibt alle Projektdokumente; Verantwortung für Leistungs- und Terminziele.',
].join('\n');

/** V109 (F-226, L1): Ziele aus Tab. 1, Nicht-Ziele aus Kap. 2.2. */
const dmyShift = (d: string) => shift(d).split('-').reverse().join('.');
const GOALS: NonNullable<Project['goals']> = [
  { id: 'cg-l1', code: 'L1', text: 'Neue Betriebsstätte errichtet', kind: 'perf', level: 'must', owner: ME_ID },
  { id: 'cg-l11', code: 'L1.1', text: 'Alte Werkstatt umgebaut', measure: 'Lager entkernt, Wand zur Werkstatt entfernt, Dach und Heizung repariert, elektrische Anlage erfüllt alle Anforderungen', kind: 'perf', level: 'must', owner: ME_ID, parent: 'cg-l1' },
  { id: 'cg-l12', code: 'L1.2', text: 'Büroräume eingerichtet', measure: 'Mobiliar und EDV, Schlüsseltresor geliefert und aufgebaut, Kommunikation sichergestellt', kind: 'perf', level: 'must', owner: ME_ID, parent: 'cg-l1' },
  { id: 'cg-l13', code: 'L1.3', text: 'Werkstatt betriebsbereit eingerichtet', measure: 'Wartungen und Reparaturen durchgeführt, Neuanschaffungen getätigt, Prüfungen, Abnahmen und Freigaben erfolgt', kind: 'perf', level: 'must', owner: ME_ID, parent: 'cg-l1' },
  { id: 'cg-l14', code: 'L1.4', text: 'Lackieranlage 1 voll einsatzbereit', measure: `aufgebaut und an die Energieversorgung angeschlossen bis ${shift('2021-04-16').split('-').reverse().join('.')}`, kind: 'perf', level: 'must', owner: ME_ID, parent: 'cg-l1' },
  { id: 'cg-l15', code: 'L1.5', text: 'Lackieranlage 2 voll einsatzbereit', measure: `bis ${shift('2021-06-18').split('-').reverse().join('.')} (von MUSS auf SOLL geändert)`, kind: 'perf', level: 'should', owner: ME_ID, parent: 'cg-l1' },
  { id: 'cg-l2', code: 'L2', text: 'Neue Organisationsstrukturen errichtet', kind: 'perf', level: 'must', owner: ME_ID },
  { id: 'cg-l21', code: 'L2.1', text: 'Aufbaustruktur festgelegt', measure: 'Rollen, Aufgaben, Verantwortungen und Befugnisse definiert', kind: 'perf', level: 'must', owner: ME_ID, parent: 'cg-l2' },
  { id: 'cg-l22', code: 'L2.2', text: 'Prozesse festgelegt', measure: 'alle organisatorischen und technischen Abläufe definiert, alle Stelleninhaber bekannt', kind: 'perf', level: 'must', owner: `${PERSON_PREFIX}lm`, parent: 'cg-l2' },
  // V135 (Abgleich mit Abb. 4): Termin- und Kostenziele wie im Report
  { id: 'cg-t', code: 'T', text: 'Termine', kind: 'perf', level: 'must', owner: ME_ID },
  { id: 'cg-t1', code: 'T1', text: `Start: ${dmyShift('2020-12-01')}`, kind: 'perf', level: 'must', owner: ME_ID, parent: 'cg-t' },
  { id: 'cg-t2', code: 'T2', text: `Ende: ${dmyShift('2021-06-30')}`, kind: 'perf', level: 'should', owner: ME_ID, parent: 'cg-t' },
  { id: 'cg-t3', code: 'T3', text: `Büroräume eingerichtet: ${dmyShift('2021-01-29')}`, kind: 'perf', level: 'should', owner: ME_ID, parent: 'cg-t' },
  { id: 'cg-t4', code: 'T4', text: `Werkstatt betriebsbereit: ${dmyShift('2021-02-26')}`, kind: 'perf', level: 'must', owner: ME_ID, parent: 'cg-t' },
  { id: 'cg-t5', code: 'T5', text: `Lackieranlage 1 betriebsbereit: ${dmyShift('2021-04-16')}`, kind: 'perf', level: 'must', owner: ME_ID, parent: 'cg-t' },
  { id: 'cg-t6', code: 'T6', text: `Lackieranlage 2 betriebsbereit: ${dmyShift('2021-06-18')}`, kind: 'perf', level: 'should', owner: ME_ID, parent: 'cg-t' },
  { id: 'cg-k', code: 'K', text: 'Kosten', kind: 'perf', level: 'must', owner: ME_ID },
  { id: 'cg-k1', code: 'K1', text: 'Technische Ausstattung 45 % v. B.', kind: 'perf', level: 'must', owner: ME_ID, parent: 'cg-k' },
  { id: 'cg-k2', code: 'K2', text: 'Umbau & Instandsetzung 20 % v. B.', kind: 'perf', level: 'must', owner: ME_ID, parent: 'cg-k' },
  { id: 'cg-k3', code: 'K3', text: 'Büroausstattung 5 % v. B.', kind: 'perf', level: 'must', owner: ME_ID, parent: 'cg-k' },
  { id: 'cg-k4', code: 'K4', text: 'PM-Kosten 10 % v. B.', kind: 'perf', level: 'must', owner: ME_ID, parent: 'cg-k' },
  { id: 'cg-k5', code: 'K5', text: 'Personalkosten 15 % v. B.', kind: 'perf', level: 'must', owner: ME_ID, parent: 'cg-k' },
  { id: 'cg-k6', code: 'K6', text: 'Risikorücklage 5 % v. B.', kind: 'perf', level: 'must', owner: ME_ID, parent: 'cg-k' },
  { id: 'cg-s1', code: 'S1', text: '15 neue Arbeitsplätze geschaffen', kind: 'social', level: 'should', owner: `${PERSON_PREFIX}gl` },
  { id: 'cg-s2', code: 'S2', text: 'Mitarbeiterzufriedenheit verbessert', measure: 'modernste Technik erleichtert Abläufe und verbessert die Ergebnisqualität', kind: 'social', level: 'can', owner: `${PERSON_PREFIX}gl` },
  { id: 'cg-n1', code: 'N1', text: 'Aktive Marketingmaßnahmen und Akquise weiterer Kunden für diesen Standort', consequence: 'Laufkundschaft wird bedient, aber nicht priorisiert; Anfragen gehen an den Vertriebsinnendienst. Der Werkvertrag mit der HM hat höchste Priorität.', kind: 'non' },
  { id: 'cg-n2', code: 'N2', text: 'Neue Prozesse auf andere Standorte übertragen (perspektivisch, nicht Inhalt des Projekts)', kind: 'non' },
];

/** V109 (F-226, L2): Stakeholderanalyse (Tab. 4) – V134: alle als „sozial“ im Umfeld-Portfolio (Personen bzw. Gruppen); Einstellung positiv/negativ = +1/−1, gering/hoch = 1/3. */
const sh = (id: string, code: string, name: string, side: 'in' | 'ex', interests: string, strategy: 'participative' | 'informative' | 'discursive' | 'repressive', measures: string, att: 1 | -1, conflict: 1 | 3, power: 1 | 3, person?: string) => ({ id, code, name, side, area: 'social' as const, interests, strategy, measures, attitude: att, conflict, power, ...(person ? { person } : {}) });
const STAKEHOLDERS: NonNullable<Project['stakeholders']> = [
  sh('cg-sh1', 'SH-IN 01', 'Hr. Meier (GF, Auftraggeber)', 'in', 'Will die HM von der Leistungsfähigkeit der FIT überzeugen, seine Marktposition in der Region stärken und mit dem Schaffen von Arbeitsplätzen das Image weiter verbessern.', 'participative', 'Permanente Abstimmung zu allen Schritten im Projekt.', 1, 1, 3, CLIENT),
  sh('cg-sh2', 'SH-IN 02', 'Hr. Kabel (Gebietsleitung)', 'in', 'Will die Kosten für Anschaffungen, Reparaturen und Ressourcen so niedrig wie möglich halten, unterstützt aber die Vorgaben von SH-IN 01. Ist außerdem für die Suche und Einstellung der 15 MA zuständig.', 'participative', 'Kümmert sich um die Vertragsabschlüsse mit Lieferanten und Dienstleistern, weshalb eine permanente Abstimmung über die Finanzen erforderlich ist.', 1, 1, 3, `${PERSON_PREFIX}gl`),
  sh('cg-sh3', 'SH-IN 03', 'Fr. Stanczak (Leitung Buchhaltung)', 'in', 'Muss sich um die technische Einsteuerung des Kunden in das vorhandene ERP-System der FIT kümmern und ihre Abteilung auf Besonderheiten schulen.', 'informative', 'Informationen zu allen Themen der Abrechnung bereitstellen und eng in die Prozessgestaltung einbinden.', 1, 1, 1, `${PERSON_PREFIX}lb`),
  sh('cg-sh4', 'SH-IN 04', 'Fr. Mikitta (QMB, Projektbüro)', 'in', 'Legt hohen Wert auf die Einhaltung der QM-Vorgaben sowie auf die Dokumentation aller Vorgänge und Entwicklungen. Ist außerdem dem Projektbüro zugeordnet.', 'participative', 'Permanente Information und Dokumentation gemäß den Vorgaben im PM-Handbuch.', 1, 1, 3, `${PERSON_PREFIX}pa`),
  sh('cg-sh6', 'SH-IN 06', 'Lackiermeister/in (n. N.)', 'in', 'Wird ein hohes Interesse am Gelingen des Projektes und der Gestaltung der Abläufe haben, da er die spätere Leitung und Verantwortung der Betriebsstätte übernehmen soll.', 'participative', 'Permanente Information zu allen Vorgängen im Bereich seiner Verantwortung; in die Projektsteuerung so weit wie möglich einbinden.', 1, 1, 3, `${PERSON_PREFIX}lm`),
  sh('cg-sx1', 'SH-EX 01', 'Hr. Drewens (Hamburger Mobile GmbH, Kunde)', 'ex', 'Legt Wert auf Termintreue, klare Strukturen und präzise definierte Prozesse. Hat mit der FIT eine Vertragsstrafenregelung im Werkvertrag vereinbart.', 'informative', 'Soll im Zyklus der Projekt-Statusberichte durch SH-IN 02 über den aktuellen Stand informiert werden.', 1, 1, 1),
  sh('cg-sx2', 'SH-EX 02', 'Fr. Stenzel (ImmoWorld GmbH, Vermieterin)', 'ex', 'Hat eine Klausel in den Mietvertrag eingearbeitet, die eine Unbedenklichkeitsbescheinigung (UBB) der elektrischen Anlage fordert. Ohne UBB darf die Werkstatt nicht in Betrieb genommen werden.', 'discursive', 'An den Informationen zum Stand der UBB teilhaben lassen.', 1, 3, 3),
  sh('cg-sx3', 'SH-EX 03', 'Hr. Thomsen (Fuchs Lackieranlagen GmbH)', 'ex', 'Ist für die pünktliche Lieferung und den Aufbau der Lackieranlagen verantwortlich, weshalb er an allen Informationen Interesse haben wird, die für einen reibungslosen Ablauf erforderlich sind.', 'informative', 'Muss mit allen Informationen, Anforderungen und Terminen versorgt werden. Änderungen in der Terminplanung sind dort sofort anzuzeigen, um den Aufbau der Lackieranlagen sicherstellen zu können.', 1, 1, 1),
  sh('cg-sx4', 'SH-EX 04', 'Hr. Klar (Bezirksschornsteinfeger)', 'ex', 'Wird die Inbetriebnahme der Lackieranlagen nur freigeben, wenn alle Grenzwerte den gesetzlichen Vorgaben entsprechen.', 'discursive', 'Wird direkt zu Beginn mit allen nötigen Informationen versorgt, um die gesetzlichen Vorgaben genau mit ihm abstimmen zu können und diese beim Bau zu berücksichtigen.', -1, 3, 3),
  sh('cg-sx5', 'SH-EX 05', 'Hr. Talib (Glasklar GmbH, Anwendungstechnik)', 'ex', 'Ist an der Prozessgestaltung beteiligt. Wird zeitlich von der Inbetriebnahme der ersten Lackieranlage und der Funktionsfähigkeit der Werkstatt abhängig sein, um sich dann maßgeblich am Projekterfolg beteiligen zu können.', 'participative', 'Wird zu allen Anforderungen und Terminen in seinem Verantwortungsbereich informiert und durch den Werkstattleiter koordiniert.', 1, 1, 3),
  sh('cg-sx6', 'SH-EX 06', 'Anwohner', 'ex', 'Befürchten Belästigungen durch Lärm und die Emissionen der Lackieranlagen.', 'repressive', 'Sollen vorerst nur im gesetzlich notwendigen Rahmen informiert werden.', -1, 3, 1),
];

/** V135 (Abgleich mit Abb. 8): DKI-Matrix aus Sicht des Projektleiters – Strategie des Reports in Klammern bei „Information“. */
const COMMS: NonNullable<Project['comms']> = [
  { id: 'cg-k01', content: 'Informationen zum Projektfortschritt, zu Abweichungen und Störungen', sender: 'PL Hr. Schulz', receiver: 'GF/AG Hr. Meier', strategy: 'push', doc: 'Statusbericht gemäß den Vorgaben aus dem Projekthandbuch', info: 'mündlich und schriftlich (partizipativ, aktive Einbindung)', freq: '14-täglich, jeweils montags bis 10:00 Uhr und mündlich bei Bedarf' },
  { id: 'cg-k02', content: 'Komplettes Review mit Analyse und Erfahrungssicherung des Gesamtprojekts', sender: 'PL Hr. Schulz', receiver: 'GF/AG Hr. Meier', strategy: 'push', doc: 'Abschlussbericht gemäß den Vorgaben aus dem Projekthandbuch', info: 'Projektabschluss-Sitzung mit allen internen Projektbeteiligten, inkl. Präsentation des Berichts (partizipativ)', freq: '1× in der Abschlussphase' },
  { id: 'cg-k03', content: 'Sämtliche Projektinformationen, Anforderungen, Pläne, Berichte, Angebote', sender: 'PL Hr. Schulz', receiver: 'QMB/PB Fr. Mikitta', strategy: 'push', doc: 'Komplette Dokumentation aller Interaktionen', info: 'mündlich und schriftlich (partizipativ, aktive Einbindung)', freq: 'tägliche Abstimmung' },
  { id: 'cg-k04', content: 'Sämtliche Projektinformationen, Anforderungen, Pläne, Berichte, Angebote', sender: 'QMB/PB Fr. Mikitta', receiver: 'PL Hr. Schulz', strategy: 'push', doc: 'Komplette Dokumentation aller Interaktionen', info: 'mündlich und schriftlich (partizipativ, aktive Einbindung)', freq: 'tägliche Abstimmung' },
  { id: 'cg-k05', content: 'Informationen zu Anforderungen, Änderungen und Entscheidungen des AG sowie zum Projektfortschritt und zu Terminen', sender: 'PL Hr. Schulz', receiver: 'mittelbar beteiligte Fachbereichsleiter', strategy: 'push', doc: 'Gesprächsprotokolle; Berichte und Präsentationen', info: 'persönlich und schriftlich; Diskussion auf Basis von Präsentationen (partizipativ, aktive Einbindung)', freq: 'wöchentlich schriftlich, jeweils dienstags bis 17:00 Uhr, täglich mündlich nach Bedarf' },
  { id: 'cg-k06', content: 'Informationen zu Anforderungen, Änderungen und Entscheidungen des AG sowie zum Projektfortschritt und zu Terminen', sender: 'PL Hr. Schulz', receiver: 'Projektmitarbeiter', strategy: 'push', doc: 'Agenda; AP-Ergebnisse; Verlaufsprotokoll', info: 'schriftlich und persönlich (partizipativ, aktive Einbindung)', freq: 'wöchentlich schriftlich, jeweils dienstags bis 17:00 Uhr, täglich mündlich nach Bedarf' },
  { id: 'cg-k07', content: 'Informationen zu Anforderungen, Änderungen und Entscheidungen des AG sowie zum Projektfortschritt und zu Terminen', sender: 'PL Hr. Schulz', receiver: 'Dienstleister und Lieferanten', strategy: 'push', doc: 'Vertrag inkl. Anforderungsprotokoll; mögl. Gesprächsprotokolle', info: 'schriftlich und persönlich (aktive Einbindung)', freq: 'einmalig schriftlich bei Projektstart bzw. Vertragsabschluss, nach Bedarf mündlich und schriftlich' },
  { id: 'cg-k08', content: 'Informationen zu Anforderungen, Änderungen und Entscheidungen des AG sowie zum Projektfortschritt und zu Terminen', sender: 'PL Hr. Schulz', receiver: 'Hr. Klar (Bezirksschornsteinfeger)', strategy: 'push', doc: 'Anforderungs- und Gesprächsprotokolle; Abnahmebestätigungen', info: 'schriftlich und persönlich (aktive Einbindung)', freq: 'einmalig schriftlich bei Projektstart bzw. Vertragsabschluss, nach Bedarf mündlich und schriftlich' },
  { id: 'cg-k09', content: 'Unbedenklichkeitsbescheinigung des Elektrikers zum Zustand der elektrischen Anlagen', sender: 'PL Hr. Schulz', receiver: 'Fr. Stenzel (Vermieterin)', strategy: 'pull', doc: 'Unbedenklichkeitsbescheinigung', info: 'schriftlich per Mail (passive Einbindung)', freq: 'einmalig nach Erhalt der Bescheinigung' },
  { id: 'cg-k10', content: 'Zielgruppengerechte Informationen zum Projekt', sender: 'PL Hr. Schulz', receiver: 'Anwohner', strategy: 'pull', doc: 'Layout der Baustelleninformation', info: 'Vorhaben- und Baustelleninformation durch Informationstafel 4×3 m vor dem Gelände (passive Einbindung)', freq: 'einmalig zum Projektbeginn' },
  { id: 'cg-k11', content: 'Durch den AG freigegebene Informationen zum aktuellen Stand und zum Vorhaben', sender: 'PL Hr. Schulz', receiver: 'Anwohner', strategy: 'push', doc: 'Dialog- und Diskussionsinhalte nach Bedarf', info: 'mündlich mit allen Beteiligten (aktive Einbindung)', freq: 'nach Bedarf' },
  { id: 'cg-k12', content: 'Durch den AG freigegebene stakeholderrelevante Projektinformationen aus den Statusberichten', sender: 'GL Hr. Kabel', receiver: 'GF der HM Hr. Drewens', strategy: 'pull', doc: 'gesamter Schriftverkehr', info: 'schriftlich per Mail, mündlich bei Bedarf (passive Einbindung)', freq: 'nach Informationsfreigabe, im Zyklus der Projekt-Statusberichte' },
];

/** V135: Lessons Learned – aus den Erfahrungen, die der Report schildert (Kap. 10.2 und 14.1). */
const LESSONS: NonNullable<Project['lessons']> = [
  { id: 'cg-ll1', topic: 'Zentrale Planungselemente gegen späte Änderungswünsche absichern', kind: 'improve', phase: 'cg-ph2', what: 'Nach unterschriebener Detailplanung wollte die Gebietsleitung günstigere Lackieranlagen anschaffen; etwa drei Viertel der Planung hätten neu erarbeitet werden müssen (Nachrichtenquadrat, Kap. 14.1).', cause: 'Persönlicher Anspruch unter dem Vorwand der Kostenziele; die Lackieranlagen sind ein zentrales Planungselement.', advice: 'Alle technischen Anforderungen und Termine offenlegen und eine Frist bis zum Ende der Detailplanung setzen – Wünsche bleiben möglich, das Projekt bleibt im Plan.', owner: ME_ID, shared: true },
  { id: 'cg-ll2', topic: 'Engpässe der Projektleitung früh mit dem AG abstimmen und dokumentieren', kind: 'good', phase: 'cg-ph2', what: 'Die Einsatzmittelganglinie der Projektleitung zeigte im zweiten Projektmonat eine Überschreitung des Vorrats (Kap. 10.2).', cause: 'Mehrere Arbeitspakete der Projektleitung liefen gleichzeitig.', advice: `Minimale Terminverschiebung von CG-1.3.3 Büroräume einrichten am ${dmyShift('2021-01-29')} auf dem kurzen Dienstweg mit dem AG abgestimmt und im Statusbericht festgehalten; M2 gilt auch ohne final eingerichtete Büroräume als erreicht.`, owner: ME_ID, shared: true },
];

/** V109 (F-226, L7): Phasen (Tab. 9), Beginn/Ende aus den Meilensteinen. */
const PHASES: NonNullable<Project['phases']> = [
  { id: 'cg-ph1', name: 'Konzept & Analyse', focus: 'Kick-off, technische Ausstattung, Zieldefinition, Team', start: shift('2020-12-01'), end: shift('2020-12-23'), share: 10 },
  { id: 'cg-ph2', name: 'Detailplanung', focus: 'alle Pläne genehmigt', start: shift('2020-12-23'), end: shift('2021-01-29'), share: 25 },
  { id: 'cg-ph3', name: 'Beauftragung', focus: 'interne und externe Beauftragungen', start: shift('2021-01-04'), end: shift('2021-02-26'), share: 10 },
  { id: 'cg-ph4', name: 'Umbau & Inbetriebnahme', focus: 'Umbau, Installation, Organisation und Prozesse', start: shift('2021-01-04'), end: shift('2021-06-18'), share: 45 },
  { id: 'cg-ph5', name: 'Abschluss', focus: 'Auswertung, Erfahrungssicherung, Abschlussfeier, Projektauflösung', start: shift('2021-05-28'), end: shift('2021-06-30'), share: 10 },
];
/** Phase je Zeile (Nr. in MS Project); Projektmanagement 1.1.1–1.1.5 läuft über alle Phasen. */
const PHASE_OF: Record<number, string> = { 10: 'cg-ph1', 32: 'cg-ph1', 33: 'cg-ph1', 34: 'cg-ph2', 35: 'cg-ph2', 28: 'cg-ph3', 36: 'cg-ph3', 8: 'cg-ph5', 40: 'cg-ph5' };
for (const nr of [11, 12, 13, 15, 16, 17, 19, 20, 22, 23, 24, 25, 26, 29, 30, 31, 37, 38, 39]) PHASE_OF[nr] = 'cg-ph4';

export const hasSampleProject = (ws: Workspace): boolean => (ws.projects ?? []).some((p) => p.id === SAMPLE_PROJECT);

/** Beispielprojekt anlegen (nichts, wenn es schon da ist). */
export function addSampleProject(ws: Workspace, now = Date.now()): Workspace {
  if (hasSampleProject(ws)) return ws;
  let next = ensureMe(ws);
  const persons: Person[] = [
    ...PEOPLE.map((p): Person => ({
      id: personId(p.res),
      name: p.name,
      kind: 'role',
      capacity: p.capacity,
      rate: p.rate,
      ...(p.res === 'LM' ? { away: [{ from: shift(LM_AWAY.from), to: shift(LM_AWAY.to), why: LM_AWAY.why }] } : {}),
    })),
    { id: CLIENT, name: 'Hr. Meier – Geschäftsführer FIT GmbH (CG)', kind: 'person' } as Person,
  ].filter((p) => !(next.persons ?? []).some((x) => x.id === p.id));
  if (persons.length) next = { ...next, persons: [...(next.persons ?? []), ...persons] };
  const project: Project = {
    id: SAMPLE_PROJECT,
    name: 'ColorGentlemen',
    psp: { prefix: 'CG-1.', style: 'num' },
    // V109 (F-226): Steckbrief-Texte nur noch für Fließtext; Felder, Ziele, Stakeholder und Phasen stehen in den Formularen
    brief: {
      goal: 'Errichtung und Inbetriebnahme einer neuen Betriebsstätte',
      approach: 'PSP funktionsorientiert gegliedert, weil Teilaufgaben und Ergebnisse technologisch aufeinander aufbauen; Teilaufgaben wurden mit den Dienstleistern um bauseitige Leistungen und gesetzliche Vorgaben ergänzt. Aufwand per Analogieschätzung, ergänzt durch Mehrfachbefragung von Team und Dienstleistern. Kick-off mit Brainstorming/Brainwriting als MindMap: Big Points, drei Epic Points (Lackiermeister, Unbedenklichkeitsbescheinigung, Abnahme BSSF), Red Line. Alle Arbeitspakete zusätzlich als Arbeitskarten in Trello.',
      org: ORG_TEXT,
    },
    charter: {
      no: 'CG-1',
      kind: 'Organisations- und Investitionsprojekt',
      client: 'FIT GmbH, vertreten durch GF Hr. Meier',
      clientKind: 'in',
      clientAddress: 'Perleberger Straße 1, 10559 Berlin',
      benefit: 'Werkvertrag mit der Hamburger Mobile GmbH (4 Jahre + Option 2 Jahre, ca. 3.500 Fahrzeuginstandsetzungen p. a. aus Leasingrücknahmen) abwickeln, Marktstellung festigen, wirtschaftlicher arbeiten mit innovativer Technik, geringere Reklamationsquote, höhere Mitarbeitermotivation.',
      ownEffort: 1560,
      extEffort: 0,
      costPm: 40290,
      costStaff: 27125,
      costMaterial: 304949,
      reserve: 20000,
      reporting: 'Statusbericht 14-täglich per Mail als A3-Situationsbericht.',
      special: 'Zusätzlich zu den bekannten Anwendungsverfahren werden aktuelle und innovative Techniken in die Prozesskette integriert.',
      releasePl: shift('2020-12-09'),
      releaseAg: shift('2020-12-14'),
      model: 'classic',
      tailoring: 'Klassisch in fünf überlappenden Phasen über 7 Monate (Tab. 9).',
      // V132 (F-232): Zeilen aus Abbildung 3 des Reports
      main: 'Umbau und Inbetriebnahme einer angemieteten KFZ Werkstatt in eine Lackiererei. Erarbeitung und Implementierung neuer Prozesse und das Einstellen von 15 Mitarbeitern.',
      team: 'Organisationsteam: Hr. Meier (GF); Hr. Kabel (GL); Fr. Mikitta (QMB); Fr. Stanczak (LB); n.N. Lackiermeister/in (L.Meister)',
      steering: 'n/v',
      vendors: 'Hr. Thomsen-Fuchs Lackieranlagen GmbH; Hr. Talib-Glasklar GmbH; Hr. Medel-Elektro.de; Hr. Licher-Die Klempner',
      others: 'Hr. Drewens-Hamburger Mobile GmbH; Fr. Stenzel-ImmoWorld GmbH; Hr. Klar-Bezirksschornsteinfeger (BSSF)',
      signAg: 'A. Meier',
      signPl: 'Enrico Schulz',
      fixed: [noteId(32), noteId(33)],
    },
    goals: GOALS,
    conflicts: [
      { id: 'cg-k1', a: 'cg-l11', b: 'cg-l12', text: 'Ressourcen werden zuerst für den Umbau der Werkstatt gebraucht, die Büros sind zweitrangig.', first: 'a' },
      { id: 'cg-k2', a: 'cg-l14', b: 'cg-l15', text: 'Ohne Lackieranlage 1 können die Prozesse (L2.2) nicht erarbeitet werden.', measure: 'Termin für Lackieranlage 2 von MUSS auf SOLL geändert (Zeitpuffer).', first: 'a' },
    ],
    stakeholders: STAKEHOLDERS,
    phases: PHASES,
    start: shift('2020-12-01'),
    end: shift('2021-06-30'),
    budget: 400000,
    priority: 1,
    // V108 (Tab. 7): Instanzen – kein Lenkungsausschuss, Änderungen entscheidet der Auftraggeber
    comms: COMMS,
    lessons: LESSONS,
    roles: [
      { id: 'lead', name: 'Projektleitung', person: ME_ID },
      { id: 'client', name: 'Auftraggeber', person: CLIENT },
      { id: 'office', name: 'Projektbüro (PA)', person: personId('PA') },
      { id: 'pma', name: 'Projektmitarbeiter (Lackiermeister/in)', person: personId('LM') },
    ],
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
      // V110: CG-1.6.4 rechnet Plan-Aufwand und -Kosten aus den Einsätzen (keine Hand-Werte davor, „gerechnet“)
      ...(r.effort ? { effort: { ...(r.nr === 31 ? {} : { plan: r.effort }), ...(r.actual ? { actual: r.actual.effort } : {}) } } : {}),
      ...(r.cost ? { cost: { ...(r.nr === 31 ? {} : { plan: r.cost }), ...(r.actual ? { actual: r.actual.cost } : {}) } } : {}),
      ...(r.accept ? { accept: r.accept.map(([text, ok]) => ({ text, ...(ok ? { ok: true as const } : {}) })) } : {}),
      ...(r.who ? { assignee: personId(r.who) } : {}),
      ...(r.results ? { results: r.results } : {}),
      ...(PHASE_OF[r.nr] ? { phase: PHASE_OF[r.nr] } : {}),
      // V109 (F-226, G7): CG-1.6.4 mit vier Ressourcen (Abb. 11): 10 × 51 + 25 × 30 + 80 × 39 + 180 × 33 = 10.320 €
      ...(r.nr === 31 ? { use: [{ person: ME_ID, hours: 10, cost: 10 * PL_RATE }, { person: personId('PA'), hours: 25 }, { person: personId('LB'), hours: 80 }, { person: personId('LM'), hours: 180 }] } : {}),
    };
    const after = parsePreds(r.pred);
    if (after.length) init.after = after;
    next = createNote(next, init, { id: noteId(r.nr), now }).ws;
  }
  // V108: echte Risiken (Tab. 5/6) und Änderungen (Kap. 10.2, Kap. 14) aus dem Report. W und A auf 1–5 umgerechnet:
  // W aus der EW (≤ 10 % → 1, ≤ 30 % → 2, ≤ 50 % → 3), A aus der Tragweite im Verhältnis zum Budget (2,5 % → 2, 50 % → 5).
  const rk = 'Aus dem Projektreport (Tab. 5/6).';
  const steer: { id: string; init: Partial<Note> }[] = [
    { id: 'cg-r1', init: { title: 'Meilenstein M3 gefährdet: Lackiermeister/in fehlt', text: `${rk}\n\nRisikoart: Meilenstein-Terminrisiko.`, type: 'risk', risk: { no: 1, ew: 30, impact: 10000, measures: [{ id: 'm1', kind: 'prev', text: 'Stellenausschreibung europaweit und zusätzlich über Social Media; Handelskammern nach frischen Absolventen fragen', cost: 2000, decided: true, ewAfter: 10 }, { id: 'm2', kind: 'corr', text: 'Sozial: Lackiermeister aus der Zentrale in Berlin heranziehen; technisch: Prozesse in Hannover erarbeiten (gleiche Lackieranlagen)', cost: 3000 }], cause: 'Lackiermeister/in ist noch nicht eingestellt und/oder die Werkstattausstattung steht noch nicht bereit', event: 'Meilenstein M3 wird nicht eingehalten', effect: 'Die Werkstatt kann nicht eingerichtet werden, der Lackiermeister kann seine zentrale Rolle im Team (Werkstatt einrichten, Prozesse gestalten) nicht einnehmen. Verzögerungen und höhere Kosten, Tragweite ca. 10.000 €.', p: 2, i: 2, strategy: 'reduce', measure: 'Präventiv (vermindern, 2.000 €, beschlossen): Stellenausschreibung europaweit und zusätzlich über Social Media; Handelskammern nach frischen Absolventen fragen. Danach EW 10 %, Risikowert 1.000 €.\nKorrektiv (begrenzen, ca. 3.000 €): sozial – Lackiermeister aus der Zentrale in Berlin heranziehen; technisch – Prozesse in Hannover erarbeiten (gleiche Lackieranlagen).', owner: personId('GL'), state: 'doing' } } },
    { id: 'cg-r2', init: { title: 'Lackieranlagen erfüllen die gesetzlichen Anforderungen nicht', text: `${rk}\n\nRisikoart: Leistungsrisiko technischer Art.`, type: 'risk', risk: { no: 2, ew: 10, impact: 200000, measures: [{ id: 'm1', kind: 'prev', text: 'Hr. Klar (SH-EX 04) schon zum Start der Detailplanung einbinden, alle Anforderungen in die Planung aufnehmen, Verträge und Umbau darauf anpassen (ca. 200 € je Vorabtermin)', cost: 1000, decided: true, ewAfter: 0 }, { id: 'm2', kind: 'corr', text: 'Worst Case: Lackieranlagen nachrüsten bzw. ersetzen', cost: 200000 }], cause: 'Technische Anforderungen für dieses Gebiet in der Phase Konzept & Analyse unzureichend beschrieben', event: 'Der Bezirksschornsteinfeger gibt die Lackieranlagen nicht zum Betrieb frei', effect: 'Die Lackieranlagen dürfen nicht betrieben werden. Verzögerungen, höhere Kosten und Verfehlen des gesamten Projektnutzens, Tragweite ca. 200.000 €.', p: 1, i: 5, strategy: 'avoid', measure: 'Präventiv (vermeiden, 1.000 €, beschlossen): Hr. Klar (SH-EX 04) schon zum Start der Detailplanung einbinden, alle Anforderungen in die Planung aufnehmen, Verträge und Umbau darauf anpassen (ca. 200 € je Vorabtermin). Danach EW 0 %.\nKorrektiv (worst case, nicht beschlossen): 200.000 €.', owner: ME_ID, state: 'doing' } } },
    { id: 'cg-r3', init: { title: 'Höhere Kosten durch versteckte Mängel', text: `${rk}\n\nRisikoart: kaufmännisches Risiko.`, type: 'risk', risk: { no: 3, ew: 50, impact: 10000, measures: [{ id: 'm1', kind: 'prev', text: 'Frühe gemeinsame Begehung der Immobilie mit allen benötigten Gewerken, vorher schriftliche Information zum Projekt und zum angestrebten Nutzen', cost: 500, decided: true, ewAfter: 10 }, { id: 'm2', kind: 'corr', text: 'Worst Case: Mehrkosten aus der Risikorücklage', cost: 5000 }], cause: 'Versteckte Mängel an der Bausubstanz (Werkstatt aus den 60er Jahren) und unbekannte Anforderungen', event: 'Mehrkosten beim Umbau', effect: 'Kostenziele werden nicht erreicht, das Gesamtbudget wird überschritten. Tragweite ca. 10.000 €.', p: 3, i: 2, strategy: 'reduce', measure: 'Präventiv (vermindern, 500 €, beschlossen): frühe gemeinsame Begehung der Immobilie mit allen benötigten Gewerken, vorher schriftliche Information zum Projekt und zum angestrebten Nutzen. Danach EW 10 %, Risikowert 1.000 €.\nKorrektiv (worst case, nicht beschlossen): 5.000 €.', owner: ME_ID, state: 'doing' } } },
    { id: 'cg-ch1', init: { title: 'Technisch fortschrittlichster Standort der FIT', text: 'Aus dem Projektreport (Kap. 5.3): stärkere Marktposition in der Region Hamburg, schnellerer Return on Investment.', type: 'risk', risk: { no: 4, chance: true, strategy: 'accept', owner: CLIENT, state: 'open' } } },
    { id: 'cg-c1', init: { title: 'Büroräume einrichten (CG-1.3.3) verschieben', text: 'Aus dem Projektreport (Kap. 10.2, Einsatzmittelganglinie der Projektleitung).', type: 'change', change: { no: 1, why: 'Die Einsatzmittelganglinie der Projektleitung überschreitet im zweiten Projektmonat den Vorrat – Engpass.', scope: 'CG-1.3.3 Büroräume einrichten wird minimal verschoben. M2 gilt auch als erreicht, wenn die Büroräume noch nicht final eingerichtet sind.', by: ME_ID, decider: 'client', state: 'approved', decided: { at: `${shift('2021-01-29')}T10:00:00.000Z`, text: 'Telefonisch auf dem kurzen Dienstweg mit dem Auftraggeber abgestimmt; dokumentiert im Statusbericht KW 4.', who: CLIENT } } } },
    { id: 'cg-c2', init: { title: 'Günstigere Lackieranlagen anschaffen', text: 'Aus dem Projektreport (Kap. 14, Gespräch am 27.01., Nachrichtenquadrat nach Schulz von Thun).\n\nVorgehen PL: Hr. Kabel bekommt alle technischen Anforderungen und Termine, die er für eine andere Lackieranlage braucht, mit Frist bis zum Ende der Detailplanung (M2). So kann er seinen Wunsch noch einbringen, Vorankommen und Projektziele bleiben gesichert.', type: 'change', change: { no: 2, why: 'Einhaltung der Kostenziele (Gebietsleitung), obwohl die Detailpläne für Termine und Sachmittel schon vom Auftraggeber unterschrieben sind.', perf: 'Gefahr, dass sich der Nutzen des Projekts nicht einstellt.', scope: 'Die Lackieranlagen sind ein zentrales Planungselement – etwa drei Viertel der Planung müssten neu erarbeitet werden.', by: personId('GL'), decider: 'client', state: 'review' } } },
  ];
  for (const x of steer) next = createNote(next, { ...x.init, project: SAMPLE_PROJECT }, { id: x.id, now }).ws;
  return next;
}

/** Beispielprojekt ganz entfernen: Projekt, seine Vorgänge („cg-…“) und die eigens angelegten Personen. */
export function removeSampleProject(ws: Workspace): Workspace {
  return removeSampleBy(ws, SAMPLE_PROJECT, NOTE_PREFIX, PERSON_PREFIX);
}

/** V134 (F-233): ein Beispielprojekt entfernen – Projekt, Notizen mit dem Präfix, eigens angelegte Personen. */
export function removeSampleBy(ws: Workspace, pid: string, notePrefix: string, personPrefix: string): Workspace {
  const NOTE_PREFIX = notePrefix;
  const PERSON_PREFIX = personPrefix;
  const SAMPLE_PROJECT = pid;
  if (!(ws.projects ?? []).some((p) => p.id === pid) && !notesOf(ws).some((n) => n.id.startsWith(NOTE_PREFIX))) return ws;
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
