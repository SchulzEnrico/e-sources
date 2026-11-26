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
const PEOPLE: { res: Exclude<Res, 'PL'>; name: string; capacity: number }[] = [
  { res: 'PA', name: 'Fr. Mikitta – Projektassistenz, QMB (CG)', capacity: 10 },
  { res: 'LM', name: 'Lackiermeister/in (CG, n. N.)', capacity: 36 },
  { res: 'GL', name: 'Hr. Kabel – Gebietsleitung (CG)', capacity: 6 },
  { res: 'LB', name: 'Fr. Stanczak – Leitung Buchhaltung (CG)', capacity: 6 },
];
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
  { nr: 32, code: 'M0', name: 'Projektstart', days: 0, start: '2020-12-01', end: '2020-12-01', text: '**Ergebnisse:** Das Projekt ist durch den Auftraggeber (Hr. Meier) beauftragt; Kick-off-Meeting mit Einweisungen des Projektleiters.' },
  { nr: 33, code: 'M1', name: 'Schlüsselübergabe erfolgt', days: 0, start: '2020-12-23', end: '2020-12-23', pred: '3', text: '**Ergebnisse:** Schlüsselübergabe erfolgt; Schadensprotokoll erstellt; Abgleich mit der Machbarkeit des Konzepts erfolgt; Statusmeeting; Phase Detailplanung freigegeben.\n\nSoll: M0 + 3 Wochen.' },
  { nr: 34, code: 'M-S/B&U', name: 'Start Beauftragung & Umbau', days: 0, start: '2021-01-04', end: '2021-01-04', pred: '10EA+1', text: '**Ergebnisse:** Team geformt, Rollen verteilt; Ziele definiert; alle baulichen Anforderungen bekannt; erste Dienstleister definiert; Phasen Beauftragung sowie Umbau & Inbetriebnahme freigegeben.\n\nSoll: M1 + 1,5 Wochen.' },
  { nr: 35, code: 'M2', name: 'Detailplanung abgeschlossen', days: 0, start: '2021-01-29', end: '2021-01-29', pred: '12; 17', text: '**Ergebnisse:** Büros fertig; alle technischen und bauseitigen Anforderungen bekannt; Maßnahmen und Termine geplant; Statusmeeting; alle Pläne freigegeben.\n\nSoll: M-S/B&U + 4 Wochen. Nach Änderung CG-Ä-1 gilt M2 auch als erreicht, wenn die Büroräume noch nicht final eingerichtet sind.' },
  { nr: 36, code: 'M3', name: 'Werkstatt fertig und Beauftragung abgeschlossen', days: 0, start: '2021-02-26', end: '2021-02-26', pred: '19', accept: [['Werkstattausstattung nach Werkvertrag – Leistung PL, Abnahme AG', true]], text: '**Ergebnisse:** Lackiermeister eingestellt; alle Wartungen abgeschlossen; komplette technische Ausstattung einsatzbereit; Statusmeeting; alle Dienstleister und Prüfgesellschaften beauftragt, Verträge unterschrieben.\n\nSoll: M2 + 4 Wochen.' },
  { nr: 37, code: 'M-LA1', name: 'Lackieranlage 1 ist in Betrieb', days: 0, start: '2021-04-16', end: '2021-04-16', pred: '13', accept: [['Lackieranlage 1 nach Werkvertrag (Verfahrensvorgaben im Handbuch für Anwendungsverfahren der FIT GmbH) – Leistung LM, Abnahme Werkvertrag', true], ['Elektrische Anlagen: Unbedenklichkeitsbescheinigung (UBB) durch den Elektriker, Prüfdokument Werkvertrag – Leistung PL', true]], text: '**Ergebnisse:** elektrische Anlagen fertig; Lackierkabine 1 installiert; Statusmeeting; UBB an den Vermieter (SH-EX 02, Fr. Stenzel) übermittelt.\n\nSoll: M3 + 7 Wochen.' },
  { nr: 38, code: 'M-LA2', name: 'Lackieranlage 2 ist in Betrieb', days: 0, start: '2021-05-28', end: '2021-05-28', pred: '26; 30', accept: [['Lackieranlage 2 nach Werkvertrag – Leistung LM, Abnahme Werkvertrag', false]], text: '**Ergebnisse:** alle Mitarbeiter eingestellt; Lackierkabine 2 installiert; Statusmeeting; Start der Abschlussphase.\n\nSoll: M-LA1 + 6 Wochen.' },
  { nr: 39, code: 'M4', name: 'Umbau & Inbetriebnahme abgeschlossen', days: 0, start: '2021-06-18', end: '2021-06-18', pred: '38; 7; 31', accept: [['Aufbauorganisation und Prozesse nach QM-Handbuch der FIT GmbH; Leitbild: bestmögliche Ökonomie und Verfahrensqualität – Leistung LM, Abnahme PL', false]], text: '**Ergebnisse:** alle Prozesse definiert; alle Arbeitsplätze eingerichtet; alle Mitarbeiter geschult; Betriebsstätte voll funktionsfähig.\n\nSoll: M-LA2 + 3 Wochen.' },
  { nr: 40, code: 'M5', name: 'Projektende', days: 0, start: '2021-06-30', end: '2021-06-30', pred: '39; 8', accept: [['Projektmanagement nach IPMA ICB4 und PM-Handbuch der FIT GmbH (CI-Vorgaben zur Projektidentifikation) – Leistung PL & PA, Abnahme AG', false]], text: '**Ergebnisse:** Abschlussbericht erstellt und vorgetragen; Ziele des magischen Dreiecks erfüllt; alle wichtigen Stakeholder zufrieden.\n\nSoll: M4 + 1,5 Wochen.' },
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
  const persons: Person[] = [
    ...PEOPLE.map((p): Person => ({
      id: personId(p.res),
      name: p.name,
      kind: 'role',
      capacity: p.capacity,
      ...(p.res === 'LM' ? { away: [{ from: shift(LM_AWAY.from), to: shift(LM_AWAY.to), why: LM_AWAY.why }] } : {}),
    })),
    { id: CLIENT, name: 'Hr. Meier – Geschäftsführer FIT GmbH (CG)', kind: 'person' } as Person,
  ].filter((p) => !(next.persons ?? []).some((x) => x.id === p.id));
  if (persons.length) next = { ...next, persons: [...(next.persons ?? []), ...persons] };
  const project: Project = {
    id: SAMPLE_PROJECT,
    name: 'ColorGentlemen',
    psp: { prefix: 'CG-1.', style: 'num' },
    brief: {
      goal: [
        'Oberziel: Errichtung und Inbetriebnahme einer neuen Betriebsstätte der FIT GmbH.',
        'Hauptziel: Umbau und Inbetriebnahme einer angemieteten Kfz-Werkstatt im Hamburger Umland zur Lackiererei mit zwei Lackieranlagen; neue Prozesse erarbeiten und einführen; 15 Mitarbeiter einstellen.',
        'Nutzen: Werkvertrag mit der Hamburger Mobile GmbH (4 Jahre + Option 2 Jahre, ca. 3.500 Fahrzeuginstandsetzungen p. a. aus Leasingrücknahmen) abwickeln, Marktstellung festigen, wirtschaftlicher arbeiten mit innovativer Technik, geringere Reklamationsquote, höhere Mitarbeitermotivation.',
        '',
        'Leistungsziele (Tab. 1):',
        'L1 Neue Betriebsstätte errichtet',
        '· L1.1 Alte Werkstatt umgebaut (MUSS, PL) – Lager entkernt, Wand zur Werkstatt entfernt, Dach und Heizung repariert, elektrische Anlage erfüllt alle Anforderungen.',
        '· L1.2 Büroräume eingerichtet (MUSS, PL) – Mobiliar und EDV, Schlüsseltresor geliefert und aufgebaut, Kommunikation sichergestellt.',
        '· L1.3 Werkstatt betriebsbereit eingerichtet (MUSS, PL) – Wartungen und Reparaturen durchgeführt, Neuanschaffungen getätigt, Prüfungen, Abnahmen und Freigaben erfolgt.',
        '· L1.4 Lackieranlage 1 voll einsatzbereit bis 16.04. (MUSS, PL) – aufgebaut, an die Energieversorgung angeschlossen.',
        '· L1.5 Lackieranlage 2 voll einsatzbereit bis 18.06. (von MUSS auf SOLL geändert, PL).',
        'L2 Neue Organisationsstrukturen errichtet',
        '· L2.1 Aufbaustruktur festgelegt (MUSS, PL) – Rollen, Aufgaben, Verantwortungen und Befugnisse definiert.',
        '· L2.2 Prozesse festgelegt (MUSS, Lackiermeister/in) – alle organisatorischen und technischen Abläufe definiert, alle Stelleninhaber bekannt.',
        'Soziale Ziele',
        '· S1 15 neue Arbeitsplätze geschaffen (SOLL, GL).',
        '· S2 Mitarbeiterzufriedenheit verbessert (KANN, GL) – modernste Technik erleichtert Abläufe und verbessert die Ergebnisqualität.',
        '',
        'Nicht-Ziele: aktive Marketingmaßnahmen, Akquise weiterer Kunden für diesen Standort. Laufkundschaft wird bedient, aber nicht priorisiert; Anfragen gehen an den Vertriebsinnendienst. Der Werkvertrag mit der HM hat höchste Priorität.',
        '',
        'Zielkonflikte (Tab. 2): L1.1 vor L1.2 – Ressourcen zuerst für den Umbau der Werkstatt, Büros zweitrangig. L1.4 vor L1.5 – Lackieranlage 1 hat Vorrang, weil ohne sie die Prozesse (L2.2) nicht erarbeitet werden können; Termin für Lackieranlage 2 von MUSS auf SOLL geändert (Zeitpuffer).',
        '',
        'Chance (Kap. 5.3): technisch fortschrittlichster Standort der FIT, stärkere Marktposition in der Region Hamburg, schnellerer Return on Investment. Perspektivisch (nicht Inhalt des Projekts): neue Prozesse auf andere Standorte übertragen.',
      ].join('\n'),
      approach: [
        'Projektnummer CG-1 · Organisations- und Investitionsprojekt · klassisch in überlappenden Phasen über 7 Monate.',
        '',
        'Phasen (Tab. 9): Konzept & Analyse (1 Monat, 10 % Aufwand) – Kick-off, technische Ausstattung, Zieldefinition, Team · Detailplanung (1,25 Monate, 25 %) – alle Pläne genehmigt · Beauftragung (2 Monate, 10 %) – interne und externe Beauftragungen · Umbau & Inbetriebnahme (5,5 Monate, 45 %) – Umbau, Installation, Organisation und Prozesse · Abschluss (1 Monat, 10 %) – Auswertung, Erfahrungssicherung, Abschlussfeier, Projektauflösung.',
        '',
        'PSP funktionsorientiert gegliedert, weil Teilaufgaben und Ergebnisse technologisch aufeinander aufbauen; Teilaufgaben wurden mit den Dienstleistern um bauseitige Leistungen und gesetzliche Vorgaben ergänzt.',
        '',
        'Aufwand: 1.560 Ph Eigenaufwand, 0 € Fremdaufwand (Analogieschätzung, ergänzt durch Mehrfachbefragung von Team und Dienstleistern). Kosten: PM 40.290 €, Personal allg. 27.125 €, Sachkosten 304.949 €. Risikorücklage 20.000 € (5 % vom Budget). Stundensätze: PL 51 €, PA 30 €, LM 33 €, GL 41 €, LB 39 €.',
        '',
        'Berichterstattung: Statusbericht 14-täglich per Mail als A3-Situationsbericht. Alle Arbeitspakete zusätzlich als Arbeitskarten in Trello (QR-Code auf den AP-Formularen, Weblink je AP in der PM-Software). Kick-off mit Brainstorming/Brainwriting als MindMap: Big Points, drei Epic Points (Lackiermeister, Unbedenklichkeitsbescheinigung, Abnahme BSSF), Red Line.',
        '',
        'Besonderheiten: Zusätzlich zu den bekannten Anwendungsverfahren werden aktuelle und innovative Techniken in die Prozesskette integriert. Freigabe des Steckbriefs: PL 09.12., AG 14.12.',
      ].join('\n'),
      org: [
        'Matrix-Projektorganisation: Ressourcen flexibel einsetzen, weniger Kommunikationsaufwand. Projektleitung aus der Stammorganisation der FIT GmbH; betroffene Abteilungsleiter und Managementbeauftragte arbeiten in ihren Verantwortungsbereichen mit; Subunternehmer und Dienstleister per Vertrag, koordiniert durch den PL.',
        '',
        'Auftraggeber: FIT GmbH, Perleberger Straße 1, 10559 Berlin, vertreten durch GF Hr. Meier. Lenkungsausschuss: keiner.',
        'Projektleitung: Enrico Schulz. Projektbüro: Fr. Mikitta (PA, QMB). Projektmitarbeiter: Lackiermeister/in (n. N.). Fachteam aus der Matrix: Hr. Kabel (GL), Fr. Stanczak (LB).',
        '',
        'Rollen (Tab. 7): GF/AG – Projektauftrag, Nutzen und Ziele, Budget, Beurteilung der Ergebnisse; entscheidet über Beauftragung und Abbruch, kann den PL austauschen; Verantwortung für den Return on Investment. GL – Einstellung der Mitarbeiter, Anschaffung von Lackieranlagen und Geräten; Prokura, disziplinarische Weisung über die Lackierfachleute; Verantwortung für Sozial- und Kostenziele. PL – Auftrag und Planung abstimmen, Stakeholdermanagement, Team- und Dienstleisterkoordination, Steuerung und Überwachung; fachliche Weisung, unterschreibt alle Projektdokumente; Verantwortung für Leistungs- und Terminziele. PA – Statusmeetings vor- und nachbereiten, Datenpflege und Dokumentation im QM, Kapazitätsplanung, Materialbeschaffung. PMA (Lackiermeister/in) – delegierte Aufgaben, L2-Leistungsziele, Auswahl der 14 Mitarbeiter.',
        '',
        'Externe: Hr. Thomsen (Fuchs Lackieranlagen GmbH), Hr. Talib (Glasklar GmbH, Anwendungstechnik), Hr. Medel (Elektro.de), Hr. Licher (Die Klempner). Weitere Stakeholder: Hr. Drewens (Hamburger Mobile GmbH, Kunde), Fr. Stenzel (ImmoWorld GmbH, Vermieterin), Hr. Klar (Bezirksschornsteinfeger), Anwohner.',
      ].join('\n'),
    },
    start: shift('2020-12-01'),
    end: shift('2021-06-30'),
    budget: 400000,
    priority: 1,
    // V108 (Tab. 7): Instanzen – kein Lenkungsausschuss, Änderungen entscheidet der Auftraggeber
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
      ...(r.effort ? { effort: { plan: r.effort, ...(r.actual ? { actual: r.actual.effort } : {}) } } : {}),
      ...(r.cost ? { cost: { plan: r.cost, ...(r.actual ? { actual: r.actual.cost } : {}) } } : {}),
      ...(r.accept ? { accept: r.accept.map(([text, ok]) => ({ text, ...(ok ? { ok: true as const } : {}) })) } : {}),
      ...(r.who ? { assignee: personId(r.who) } : {}),
    };
    const after = parsePreds(r.pred);
    if (after.length) init.after = after;
    next = createNote(next, init, { id: noteId(r.nr), now }).ws;
  }
  // V108: echte Risiken (Tab. 5/6) und Änderungen (Kap. 10.2, Kap. 14) aus dem Report. W und A auf 1–5 umgerechnet:
  // W aus der EW (≤ 10 % → 1, ≤ 30 % → 2, ≤ 50 % → 3), A aus der Tragweite im Verhältnis zum Budget (2,5 % → 2, 50 % → 5).
  const rk = 'Aus dem Projektreport (Tab. 5/6). Risikorücklage 20.000 € (5 % vom Budget). Summe Risikowert vor Maßnahmen 28.000 €, nach Maßnahmen 2.000 €.';
  const steer: { id: string; init: Partial<Note> }[] = [
    { id: 'cg-r1', init: { title: 'Meilenstein M3 gefährdet: Lackiermeister/in fehlt', text: `${rk}\n\nRisikoart: Meilenstein-Terminrisiko · EW 30 % · Tragweite 10.000 € · Risikowert 3.000 €.`, type: 'risk', risk: { no: 1, cause: 'Lackiermeister/in ist noch nicht eingestellt und/oder die Werkstattausstattung steht noch nicht bereit', event: 'Meilenstein M3 wird nicht eingehalten', effect: 'Die Werkstatt kann nicht eingerichtet werden, der Lackiermeister kann seine zentrale Rolle im Team (Werkstatt einrichten, Prozesse gestalten) nicht einnehmen. Verzögerungen und höhere Kosten, Tragweite ca. 10.000 €.', p: 2, i: 2, strategy: 'reduce', measure: 'Präventiv (vermindern, 2.000 €, beschlossen): Stellenausschreibung europaweit und zusätzlich über Social Media; Handelskammern nach frischen Absolventen fragen. Danach EW 10 %, Risikowert 1.000 €.\nKorrektiv (begrenzen, ca. 3.000 €): sozial – Lackiermeister aus der Zentrale in Berlin heranziehen; technisch – Prozesse in Hannover erarbeiten (gleiche Lackieranlagen).', owner: personId('GL'), state: 'doing' } } },
    { id: 'cg-r2', init: { title: 'Lackieranlagen erfüllen die gesetzlichen Anforderungen nicht', text: `${rk}\n\nRisikoart: Leistungsrisiko technischer Art · EW 10 % · Tragweite 200.000 € · Risikowert 20.000 €.`, type: 'risk', risk: { no: 2, cause: 'Technische Anforderungen für dieses Gebiet in der Phase Konzept & Analyse unzureichend beschrieben', event: 'Der Bezirksschornsteinfeger gibt die Lackieranlagen nicht zum Betrieb frei', effect: 'Die Lackieranlagen dürfen nicht betrieben werden. Verzögerungen, höhere Kosten und Verfehlen des gesamten Projektnutzens, Tragweite ca. 200.000 €.', p: 1, i: 5, strategy: 'avoid', measure: 'Präventiv (vermeiden, 1.000 €, beschlossen): Hr. Klar (SH-EX 04) schon zum Start der Detailplanung einbinden, alle Anforderungen in die Planung aufnehmen, Verträge und Umbau darauf anpassen (ca. 200 € je Vorabtermin). Danach EW 0 %.\nKorrektiv (worst case, nicht beschlossen): 200.000 €.', owner: ME_ID, state: 'doing' } } },
    { id: 'cg-r3', init: { title: 'Höhere Kosten durch versteckte Mängel', text: `${rk}\n\nRisikoart: kaufmännisches Risiko · EW 50 % · Tragweite 10.000 € · Risikowert 5.000 €.`, type: 'risk', risk: { no: 3, cause: 'Versteckte Mängel an der Bausubstanz (Werkstatt aus den 60er Jahren) und unbekannte Anforderungen', event: 'Mehrkosten beim Umbau', effect: 'Kostenziele werden nicht erreicht, das Gesamtbudget wird überschritten. Tragweite ca. 10.000 €.', p: 3, i: 2, strategy: 'reduce', measure: 'Präventiv (vermindern, 500 €, beschlossen): frühe gemeinsame Begehung der Immobilie mit allen benötigten Gewerken, vorher schriftliche Information zum Projekt und zum angestrebten Nutzen. Danach EW 10 %, Risikowert 1.000 €.\nKorrektiv (worst case, nicht beschlossen): 5.000 €.', owner: ME_ID, state: 'doing' } } },
    { id: 'cg-c1', init: { title: 'Büroräume einrichten (CG-1.3.3) verschieben', text: 'Aus dem Projektreport (Kap. 10.2, Einsatzmittelganglinie der Projektleitung).', type: 'change', change: { no: 1, why: 'Die Einsatzmittelganglinie der Projektleitung überschreitet im zweiten Projektmonat den Vorrat – Engpass.', scope: 'CG-1.3.3 Büroräume einrichten wird minimal verschoben. M2 gilt auch als erreicht, wenn die Büroräume noch nicht final eingerichtet sind.', by: ME_ID, decider: 'client', state: 'approved', decided: { at: `${shift('2021-01-29')}T10:00:00.000Z`, text: 'Telefonisch auf dem kurzen Dienstweg mit dem Auftraggeber abgestimmt; dokumentiert im Statusbericht KW 4.', who: CLIENT } } } },
    { id: 'cg-c2', init: { title: 'Günstigere Lackieranlagen anschaffen', text: 'Aus dem Projektreport (Kap. 14, Gespräch am 27.01., Nachrichtenquadrat nach Schulz von Thun).\n\nVorgehen PL: Hr. Kabel bekommt alle technischen Anforderungen und Termine, die er für eine andere Lackieranlage braucht, mit Frist bis zum Ende der Detailplanung (M2). So kann er seinen Wunsch noch einbringen, Vorankommen und Projektziele bleiben gesichert.', type: 'change', change: { no: 2, why: 'Einhaltung der Kostenziele (Gebietsleitung), obwohl die Detailpläne für Termine und Sachmittel schon vom Auftraggeber unterschrieben sind.', perf: 'Gefahr, dass sich der Nutzen des Projekts nicht einstellt.', scope: 'Die Lackieranlagen sind ein zentrales Planungselement – etwa drei Viertel der Planung müssten neu erarbeitet werden.', by: personId('GL'), decider: 'client', state: 'review' } } },
  ];
  for (const x of steer) next = createNote(next, { ...x.init, project: SAMPLE_PROJECT }, { id: x.id, now }).ws;
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
