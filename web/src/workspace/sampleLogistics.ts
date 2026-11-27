/**
 * F-233 (V134): zweites Beispielprojekt „FUTURE-P.ROOF – smarter logistics“ (FP-1) aus einem ICB4-Report Level D
 * (Leitfaden Z01D Rev. 12): Inbetriebnahme eines neuen Logistik-Centers der Flight Interior GmbH, 7 Monate.
 * Quelle (nur lokal): docs/Arbeitspakete/Vorlagen/Report_Logistik-Center_FP-1.pdf – Steckbrief (Abb. 2), Ziele (Tab. 1),
 * Zielkonflikte (Tab. 2), Abnahmekriterien (Tab. 3), Umfeld-Portfolio (Abb. 4), Stakeholderanalyse (Tab. 4), Risiken
 * (Tab. 5/6) und Chance (Kap. 5.3), Rollen/AKV (Tab. 7), DKI-Matrix (Tab. 8), Phasen (Tab. 9), Meilensteine (Tab. 10),
 * AP-Beschreibung und Statusbericht FP-1.5.2 (Abb. 9/13), Vorgangsliste und Balkenplan (Abb. 10/11), Qualifikations-
 * gruppen und Stundensätze (Tab. 11/12), Zentraltabellen Ressourcen und Kosten (Anlage 1/3), Lessons Learned und
 * Änderung des Projekttitels (Kap. 14, Anlage 7), Engpass der Projektleitung (Kap. 10.2).
 * Termine um 1820 Tage (260 Wochen) verschoben (01.02.2022 → 26.01.2027, gleiche Wochentage). Die Projektleitung ist
 * „ich“ wie bei ColorGentlemen – der Name der Verfasserin wird nicht übernommen. Feste Ids mit „fp-“ bzw. „pn-fp-“.
 */
import type { Note, Person, Project, Workspace } from './types';
import { createNote } from './notes';
import { headText } from './sheets';
import { ME_ID, ensureMe } from './persons';
import { parsePreds, removeSampleBy } from './sampleProject';

export const LOGISTICS_PROJECT = 'pj-fp';
const NOTE_PREFIX = 'fp-';
const PERSON_PREFIX = 'pn-fp-';

/** 2022 → 2027: +1820 Tage (260 Wochen), gleiche Wochentage. */
export const shiftFp = (d: string): string => new Date(Date.parse(`${d}T00:00:00Z`) + 1820 * 864e5).toISOString().slice(0, 10);
const shift = shiftFp;
const dmy = (d: string) => shift(d).split('-').reverse().join('.');

type Res = 'PL' | 'LM' | 'TL' | 'LMA' | 'IT' | 'EK';
/** Qualifikationsgruppen (Tab. 11): Verfügbarkeit × 40 h, Stundensatz (Tab. 12); PL = „ich“ (46 €/Ph steht am Einsatz). */
const GROUPS: { res: Exclude<Res, 'PL'>; name: string; capacity: number; rate: number }[] = [
  { res: 'LM', name: 'Hr. Martens – Logistikmanager (FP)', capacity: 16, rate: 61 },
  { res: 'TL', name: 'Teamleiter/innen Logistik (3 TL, FP)', capacity: 18, rate: 34 },
  { res: 'LMA', name: 'Logistik-Mitarbeitende (80 Personen, FP)', capacity: 480, rate: 19 },
  { res: 'IT', name: 'IT-Mitarbeiter/in (FP)', capacity: 20, rate: 31 },
  { res: 'EK', name: 'Einkäufer/in (FP)', capacity: 8, rate: 28 },
];
const RATE: Record<Res, number> = { PL: 46, LM: 61, TL: 34, LMA: 19, IT: 31, EK: 28 };
const pid = (r: Res) => (r === 'PL' ? ME_ID : `${PERSON_PREFIX}${r.toLowerCase()}`);
/** Weitere Beteiligte ohne Kapazität im Projekt (Steckbrief, Tab. 4/7). */
const CLIENT = `${PERSON_PREFIX}borg`;
const OTHERS: Person[] = [
  { id: CLIENT, name: 'Hr. van Borg – Geschäftsführer Flight Interior GmbH (FP)', kind: 'person' } as Person,
  { id: `${PERSON_PREFIX}hermann`, name: 'Hr. Hermann – IT-Manager (FP)', kind: 'person' } as Person,
  { id: `${PERSON_PREFIX}sommer`, name: 'Fr. Sommer – Finance Managerin (FP)', kind: 'person' } as Person,
  { id: `${PERSON_PREFIX}bauer`, name: 'Fr. Bauer – QMB, Projektbüro (FP)', kind: 'person' } as Person,
];

interface Row {
  /** Zeile in MS Project (für die Vorgänger). */
  nr: number;
  code: string;
  name: string;
  parent?: number;
  days: number;
  start: string;
  end: string;
  pred?: string;
  /** Personenstunden je Qualifikationsgruppe (Anlage 1/3). */
  use?: Partial<Record<Res, number>>;
  /** Sachkosten in € und was (Anlage 3). */
  mat?: [number, string];
  text?: string;
  results?: string[];
  phase?: string;
  /** Abnahmekriterien (Tab. 3): Kriterium, Datum, Leistung von, Abnahme durch, erledigt. */
  accept?: [string, string, string, string, boolean][];
  /** „nicht beginnen vor“ wie im Balkenplan (später als die Vorgänger erlauben). */
  notBefore?: string;
}

const AP152 = `Phase: Ausbau Einrichtung & Umzug. Verantwortlich: SH-IN 02 Hr. Martens (Logistikmanager).

**Aktivitäten:** Der Logistikmanager erarbeitet mit den Teamleitern Logistik und dem Prozesstechniker der FTS GmbH alle Prozessschritte und fasst sie zu Prozessketten zusammen. Die Projektleitung begleitet den Prozess zeitweise, um die Abläufe technisch zu verstehen und die Erkenntnisse für die Vorbereitung der MA-Schulungen zu nutzen.

**Ergebnis:** übergabefertige Prozessbeschreibungen und Ablaufdiagramme.

**Personal (90 Ph, 4.455 €):** Projektleitung 15 Ph × 46 € · Logistikmanager 45 Ph × 61 € · TL-Logistik 30 Ph × 34 €.

**Sachmittel:** stellt die FTS GmbH; sie sind wie die Arbeitsleistung von Hr. Franke (Prozesstechniker) Servicebestandteil des Vertrags.

**Fortschrittsmessung:** aufwandsproportional. Freigabe AP: PL ${dmy('2022-03-11')}, AP-Verantwortlicher ${dmy('2022-04-13')}.

**Statusbericht vom ${dmy('2022-06-07')} (KW 21/22):** Ist-Start ${dmy('2022-04-25')}, Fortschritt 73 %, Aufwand Ist 66 Ph (Rest 24 Ph), Kosten Ist 3.294 € (Rest 1.161 €). Lagerplatz-, Gang- und Vorgangsbenennungen sind abgeschlossen, Wegentfernungen codiert, die Feinjustierung der FTS-Software ist erfolgt. Fahr-, Ein- und Auslagergeschwindigkeiten sowie die automatischen Ladezyklen sind weitgehend eingestellt. Die Prozessschritte sind definiert und zu Prozessketten zusammengesetzt; die Projektleitung plant mit den Ergebnissen die MA-Schulungen. Steuerungsmaßnahmen: keine.`;

const ROWS: Row[] = [
  { nr: 2, code: '1.1', name: 'Projektmanagement', days: 152, start: '2022-02-01', end: '2022-08-31' },
  { nr: 11, code: '1.1.1', name: 'Projektstart', parent: 2, days: 10, start: '2022-02-01', end: '2022-02-14', pred: '3', use: { PL: 20, LM: 5, TL: 5 }, phase: 'ph1' },
  { nr: 12, code: '1.1.2', name: 'Stakeholdermanagement', parent: 2, days: 119, start: '2022-02-15', end: '2022-07-29', pred: '11', use: { PL: 70 } },
  { nr: 13, code: '1.1.3', name: 'Risikomanagement', parent: 2, days: 119, start: '2022-02-15', end: '2022-07-29', pred: '11', use: { PL: 20 } },
  { nr: 14, code: '1.1.4', name: 'Projektplanung', parent: 2, days: 119, start: '2022-02-15', end: '2022-07-29', pred: '11', use: { PL: 115, LM: 40, TL: 40 }, mat: [2600, 'Risikomaßnahmen (präventiv, Tab. 6)'] },
  { nr: 15, code: '1.1.5', name: 'Projektsteuerung', parent: 2, days: 119, start: '2022-02-15', end: '2022-07-29', pred: '11', use: { PL: 350 } },
  { nr: 16, code: '1.1.6', name: 'Projektabschluss', parent: 2, days: 22, start: '2022-08-02', end: '2022-08-31', pred: '12; 13; 14; 15; 8', use: { PL: 10 }, phase: 'ph5' },
  { nr: 17, code: '1.2', name: 'Büroräume', days: 77, start: '2022-02-15', end: '2022-06-01' },
  { nr: 18, code: '1.2.1', name: 'Raumpläne festlegen', parent: 17, days: 5, start: '2022-02-15', end: '2022-02-21', pred: '11', use: { LM: 10, TL: 10, IT: 5 }, phase: 'ph1' },
  { nr: 19, code: '1.2.2', name: 'Mobiliar, IT & EDV bestellen', parent: 17, days: 6, start: '2022-02-22', end: '2022-03-01', pred: '18', use: { IT: 5, EK: 10 }, phase: 'ph1' },
  { nr: 20, code: '1.2.3', name: 'EDV & Netzwerk installieren', parent: 17, days: 43, start: '2022-03-02', end: '2022-04-29', pred: '19; 4', use: { IT: 90 }, mat: [14550, '20 PC-Arbeitsplätze (Monitore, Rechner inkl. Bedienelemente, Telefone)'], phase: 'ph2' },
  { nr: 21, code: '1.2.4', name: 'Büroräume einrichten', parent: 17, days: 20, start: '2022-03-02', end: '2022-03-29', pred: '4', use: { PL: 10 }, mat: [34060, '20 Büroeinrichtungen'], phase: 'ph2' },
  { nr: 22, code: '1.2.5', name: 'Büroräume beziehen', parent: 17, days: 23, start: '2022-05-02', end: '2022-06-01', pred: '6', use: { PL: 5 }, phase: 'ph3' },
  { nr: 23, code: '1.3', name: 'Logistik-Center Teil 1', days: 120, start: '2022-02-15', end: '2022-08-01' },
  { nr: 24, code: '1.3.1', name: 'Fahrerloses Transportsystem (FTS) beauftragen', parent: 23, days: 31, start: '2022-02-15', end: '2022-03-29', pred: '11', use: { PL: 15, EK: 45 }, phase: 'ph2' },
  { nr: 25, code: '1.3.2', name: 'Regalsystem montieren', parent: 23, days: 38, start: '2022-03-30', end: '2022-05-20', pred: '5', mat: [19518000, '240 Regalsegmente inkl. FTS-Anbauten (je 81.325 €)'], phase: 'ph4' },
  { nr: 26, code: '1.3.3', name: 'Fahrerloses Transportsystem (FTS) installieren', parent: 23, days: 5, start: '2022-05-23', end: '2022-05-27', pred: '25', text: 'Sachmittel: die Kosten sind im Preis der Regalsegmente enthalten.', phase: 'ph4' },
  { nr: 27, code: '1.3.4', name: 'Fahrerlose Transportfahrzeuge (FTF) bereitstellen', parent: 23, days: 1, start: '2022-05-30', end: '2022-05-30', pred: '26', mat: [3147000, '17 kleine FTF (je 83.000 €), 8 große FTF (je 217.000 €)'], phase: 'ph4' },
  { nr: 28, code: '1.3.5', name: 'Ausstattung mit neuer Technik', parent: 23, days: 18, start: '2022-05-31', end: '2022-06-23', pred: '27', use: { PL: 20, IT: 45 }, mat: [17536, 'FTS-Steuerungsbundle (Handscanner, Monitore, Rechner inkl. Bedienelemente)'], phase: 'ph4' },
  { nr: 29, code: '1.3.6', name: 'Logistik-Center einrichten', parent: 23, days: 27, start: '2022-06-24', end: '2022-08-01', pred: '28; 27; 26; 25', use: { PL: 25 }, mat: [15833, '10 Logistik-Arbeitsplätze (Packtische, Arbeitsstühle)'], phase: 'ph4' },
  { nr: 30, code: '1.3.7', name: 'Logistik-MA schulen', parent: 23, days: 18, start: '2022-07-06', end: '2022-07-29', pred: '40', use: { LM: 6, TL: 144, LMA: 640, IT: 18 }, phase: 'ph4', accept: [['Alle 80 Logistik-MA wurden gemäß Anwesenheitsliste in der Handhabung der neuen Logistik-Ausstattung und des Fahrerlosen Transportsystems (FTS) geschult', '2022-07-29', 'TL-Logistik', 'PL', false]] },
  { nr: 31, code: '1.4', name: 'Logistik-Center Teil 2', days: 130, start: '2022-02-15', end: '2022-08-15' },
  { nr: 32, code: '1.4.1', name: 'Transportunternehmen beauftragen', parent: 31, days: 3, start: '2022-02-15', end: '2022-02-17', pred: '11', use: { PL: 5 }, phase: 'ph3' },
  { nr: 33, code: '1.4.2', name: 'Konzept Ladungsträger erstellen', parent: 31, days: 71, start: '2022-02-18', end: '2022-05-27', pred: '32', use: { PL: 80, LM: 45 }, phase: 'ph2' },
  { nr: 34, code: '1.4.3', name: 'Lagerplätze festlegen', parent: 31, days: 10, start: '2022-06-02', end: '2022-06-15', pred: '33; 7', use: { TL: 35 }, phase: 'ph4' },
  { nr: 35, code: '1.4.4', name: 'Lagerlisten erstellen', parent: 31, days: 10, start: '2022-06-16', end: '2022-06-29', pred: '34; 25', use: { TL: 20 }, phase: 'ph4' },
  { nr: 36, code: '1.4.5', name: 'Bauteile umlagern', parent: 31, days: 10, start: '2022-08-02', end: '2022-08-15', pred: '35; 33; 34; 29', use: { LMA: 900 }, mat: [68625, '20 konzeptionierte Ladungsträger (Transportgestell, Gitterboxen, Euroboxen, Palettenboxen)'], phase: 'ph4' },
  { nr: 37, code: '1.5', name: 'Organisations- und Prozessstruktur', days: 101, start: '2022-02-15', end: '2022-07-05' },
  { nr: 38, code: '1.5.1', name: 'Aufbaustruktur festlegen', parent: 37, days: 5, start: '2022-02-15', end: '2022-02-21', pred: '11', use: { PL: 10, LM: 10, TL: 10 }, phase: 'ph1' },
  {
    nr: 39, code: '1.5.2', name: 'Prozesse festlegen', parent: 37, days: 47, start: '2022-04-25', end: '2022-06-28', pred: '38', notBefore: '2022-04-25', use: { PL: 15, LM: 45, TL: 30 }, phase: 'ph4', text: AP152,
    accept: [['Prozesse aller neuen logistischen Abläufe sind neu definiert und im QMH Version 7.13 der Flight Interior GmbH aufgenommen', '2022-06-28', 'Hr. Franke, FTS GmbH', 'Hr. Martens, Logistikmanager', false]],
    results: ['Übergabefertige Prozessbeschreibungen und Ablaufdiagramme'],
  },
  { nr: 40, code: '1.5.3', name: 'Ablaufplan MA-Schulungen festlegen', parent: 37, days: 5, start: '2022-06-29', end: '2022-07-05', pred: '39', use: { PL: 5, LM: 5, TL: 5 }, phase: 'ph4' },
  // Meilensteine (Tab. 10) – Ergebnis, Beleg, Soll
  { nr: 3, code: 'MS0', name: 'Projektstart', days: 0, start: '2022-02-01', end: '2022-02-01', phase: 'ph1', text: 'Beleg: Vertrag; Mitschrift des Meetings.', results: ['Das Projekt ist durch den AG beauftragt', 'Kick-off-Meeting'], accept: [['Mietvertrag mit entsprechendem Übergabeprotokoll und Grundriss des Objekts (Logistik-Center 12.000 m² angemietet)', '2022-01-21', 'Fr. Wulff, ImmoWulff GmbH', 'PL', true]] },
  { nr: 4, code: 'MS1', name: 'Büroräume Ausbau entschieden & beauftragt', days: 0, start: '2022-03-01', end: '2022-03-01', pred: '19', phase: 'ph1', text: 'Soll: MS0 + 4 Wochen. Beleg: Kaufvertrag.', results: ['Der DL für die Büroausstattung steht fest und wird beauftragt', 'Start PH2 Detailplanung'] },
  { nr: 5, code: 'MS2', name: 'Lieferant für Fahrerloses Transportsystem (FTS) entschieden & beauftragt', days: 0, start: '2022-03-29', end: '2022-03-29', pred: '24', phase: 'ph2', text: 'Soll: MS1 + 4 Wochen. Beleg: Leasingvertrag.', results: ['Der DL für das Regalsystem und die FTF steht fest und wird beauftragt', 'Start PH3 Beauftragung & Beschaffung'] },
  { nr: 6, code: 'MS3', name: 'Büroräume eingerichtet & EDV installiert', days: 0, start: '2022-04-29', end: '2022-04-29', pred: '21; 20', phase: 'ph2', text: 'Soll: MS2 + 4,5 Wochen. Beleg: Ausstattungskonzept, Abnahmeprotokoll.', results: ['Die Büroräume sind eingerichtet und mit der nötigen EDV ausgestattet', 'Start PH4 Ausbau & Umzug Einrichtung'], accept: [['Büros wurden gemäß Raumplan mit Mobiliar und EDV ausgestattet', '2022-03-29', 'Fr. Werner, Einkauf', 'PL', true]] },
  { nr: 7, code: 'MS4', name: 'Büroräume bezogen', days: 0, start: '2022-06-01', end: '2022-06-01', pred: '22', phase: 'ph3', text: 'Soll: MS3 + 2,5 Wochen. Beleg: Raumplan.', results: ['Nach vollständiger Ausstattung wurden die Büroräume bezogen'] },
  { nr: 8, code: 'MS5', name: 'Ausbau abgeschlossen', days: 0, start: '2022-08-01', end: '2022-08-01', pred: '29', phase: 'ph4', text: 'Soll: MS4 + 8,5 Wochen. Beleg: Terminplan, Abnahmeprotokoll.', results: ['Die Logistik-Einrichtung steht', 'Das Regalsystem ist aufgebaut, die FTF stehen bereit', 'Start PH5 Abschluss'], accept: [['25 FTF bereitgestellt, 20 m hohes Regalsystem aufgebaut, FTS installiert – gemäß Abnahmeprotokoll und Handbuch', '2022-08-01', 'Hr. Klein, FTS GmbH', 'PL', false]] },
  { nr: 9, code: 'MS6', name: 'Umzug abgeschlossen', days: 0, start: '2022-08-15', end: '2022-08-15', pred: '39; 36; 30', phase: 'ph4', text: 'Soll: MS5 + 2 Wochen. Beleg: Schulungsnachweise, Lagerlisten, Transportschein.', results: ['Alle Bauteile wurden umgelagert', 'Alle MA sind geschult', 'Das Logistik-Center ist voll funktionsfähig'], accept: [['Bauteile wurden vollständig umgelagert, gemäß Transport- und Lagerlisten', '2022-08-15', 'Hr. Koch, Drive Safe GmbH', 'Hr. Martens, Logistikmanager', false]] },
  { nr: 10, code: 'MS7', name: 'Projektende', days: 0, start: '2022-08-31', end: '2022-08-31', pred: '9; 16', phase: 'ph5', text: 'Soll: MS6 + 2 Wochen. Beleg: Abschlussbericht.', results: ['Alle Ziele des magischen Dreiecks sind erreicht', 'Alle wesentlichen SH sind zufrieden'], accept: [['Anonyme Online-Umfrage der Logistik-MA (Zugang zum Intranet): mind. 80 % Zufriedenheit', '2022-08-26', 'Hr. Ludwig, IT-Mitarbeiter', 'Hr. Martens, Logistikmanager', false]] },
];
const noteId = (nr: number) => `${NOTE_PREFIX}${nr}`;

/** Phasen (Tab. 9), Beginn/Ende aus den Meilensteinen (Tab. 10). */
const PHASES: NonNullable<Project['phases']> = [
  { id: 'fp-ph1', name: 'Start & Analyse', focus: 'Kick-off-Meeting; Prüfung der benötigten Ausstattung; Zieldefinition; Rollenverteilung & Teambuilding', goal: 'Grobplanung erstellt und Ziele definiert', start: shift('2022-02-01'), end: shift('2022-03-01'), share: 10 },
  { id: 'fp-ph2', name: 'Detailplanung', focus: 'Konzept für den Ausbau erstellen – Ausstattung Büroräume & Logistik-Center; Angebote der DL einholen; Statusmeetings abhalten', goal: 'Alle Pläne genehmigt', start: shift('2022-03-01'), end: shift('2022-04-29'), share: 20 },
  { id: 'fp-ph3', name: 'Beauftragung & Beschaffung', focus: 'Interne Beauftragung EDV; externe Beauftragung Ausstattung für den Ausbau und den Umzug', goal: 'Alle Beauftragungen sind abgeschlossen', start: shift('2022-03-29'), end: shift('2022-06-01'), share: 15 },
  { id: 'fp-ph4', name: 'Ausbau Einrichtung & Umzug', focus: 'Terminabstimmung mit externen DL für den Umzug; Ablaufpläne zum Ausbau der Einrichtung aufstellen; Statusmeetings abhalten', goal: 'Logistik-Center ist voll einsatzbereit', start: shift('2022-04-29'), end: shift('2022-08-15'), share: 45 },
  { id: 'fp-ph5', name: 'Abschluss', focus: 'Finanzieller Abschluss; Erfahrungssicherung; Projektauflösung', goal: 'Projekt erfolgreich abgeschlossen, Zufriedenheit aller Beteiligten', start: shift('2022-08-01'), end: shift('2022-08-31'), share: 10 },
];

/** Ziele (Tab. 1) mit Konsequenz bei Nichteinhaltung; Nichtziel (Tab. 1, NZi). */
const GOALS: NonNullable<Project['goals']> = [
  { id: 'fp-lzi', code: 'LZi', text: 'Neues Logistik-Center bezogen', kind: 'perf', level: 'must', owner: ME_ID },
  { id: 'fp-lzi1', code: 'LZi 1', text: 'Neues Logistik-Center (12.000 m²) angemietet', measure: 'Der Mietvertrag wurde unterzeichnet und die Schlüsselübergabe hat stattgefunden.', consequence: 'Ohne neue Logistikhalle kann kein effizientes Arbeiten stattfinden und die NC-Kosten können nicht gesenkt werden.', kind: 'perf', level: 'must', owner: ME_ID, parent: 'fp-lzi' },
  { id: 'fp-lzi2', code: 'LZi 2', text: 'Büroräume sind eingerichtet', measure: 'Die 5 Büroräume sind mit Mobiliar sowie der technischen Ausstattung gem. Konfigurationsplan eingerichtet und abgenommen.', consequence: 'Ohne vorhandene Ausstattung ist die Kommunikation nicht sichergestellt.', kind: 'perf', level: 'must', owner: ME_ID, parent: 'fp-lzi' },
  { id: 'fp-lzi3', code: 'LZi 3', text: 'Logistik-Center ist eingerichtet', measure: 'In der Halle wurde ein neues, 20 Meter hohes Regalsystem aufgebaut, das FTS installiert und die 25 neuen FTF bereitgestellt.', consequence: 'Ohne Regalsystem und vollständig installiertes FTS können die Bauteile nicht eingelagert werden.', kind: 'perf', level: 'must', owner: ME_ID, parent: 'fp-lzi' },
  { id: 'fp-lzi4', code: 'LZi 4', text: 'Prozesse sind festgelegt', measure: 'Alle logistischen Abläufe sind neu definiert und an die Mitarbeiter kommuniziert worden.', consequence: 'Ohne vorherige Unterweisung in die neuen Abläufe droht eine mengenmäßig unzureichende und fehlerbehaftete Arbeitsweise der Logistik-MA.', kind: 'perf', level: 'must', owner: ME_ID, parent: 'fp-lzi' },
  { id: 'fp-lzi5', code: 'LZi 5', text: 'Umzug hat stattgefunden', measure: 'Alle Bauteile wurden in das neue Logistik-Center umgelagert.', consequence: 'Ohne die Umlagerung können keine Lavatories gefertigt und ausgeliefert werden.', kind: 'perf', level: 'must', owner: ME_ID, parent: 'fp-lzi' },
  { id: 'fp-szi1', code: 'SZi 1', text: 'Zufriedenheit der Mitarbeiter verbessert', measure: 'Handscanner und automatisierte Lagervorgänge erleichtern und verbessern die Arbeit. Mitarbeiterbefragung: mind. 80 % sind zufrieden bis sehr zufrieden.', consequence: 'Ohne Handscanner keine Verbesserung der Arbeitsbedingungen – die Kommissionierung bliebe papierbasiert.', kind: 'social', level: 'should', owner: pid('LM') },
  { id: 'fp-szi2', code: 'SZi 2', text: 'Zufriedenheit des Kunden verbessert', measure: 'Größere Halle und neues Regalsystem beheben das Risiko kaputt gelagerter Bauteile; die Auslieferung der Lavatories ist in Menge und Qualität gewährleistet. Kundenbefragung: mind. 75 % sind zufrieden bis sehr zufrieden.', consequence: 'Bei weiterer Schlechtlieferung drohen der Entzug der Aufträge durch den Kunden und weiter steigende NC-Kosten.', kind: 'social', level: 'should', owner: pid('LM') },
  { id: 'fp-nzi1', code: 'NZi', text: 'Personalabbau oder Einsatz eines Change Managements', consequence: 'Gehört nicht zum Leistungsumfang.', kind: 'non' },
];

/** Stakeholderanalyse (Tab. 4) – alle Einstellungen positiv; gering/hoch = 1/3. Umfeld-Portfolio (Abb. 4): Personen „sozial“, dazu die sachlichen Faktoren SF-IN/SF-EX. */
type Strat = 'participative' | 'informative' | 'discursive' | 'repressive';
const sh = (id: string, code: string, name: string, side: 'in' | 'ex', interests: string, strategy: Strat, measures: string, conflict: 1 | 3, power: 1 | 3, person?: string, fears?: string) =>
  ({ id, code, name, side, area: 'social' as const, interests, ...(fears ? { fears } : {}), strategy, measures, attitude: 1, conflict, power, ...(person ? { person } : {}) });
const sf = (id: string, code: string, name: string, side: 'in' | 'ex', interests: string) => ({ id, code, name, side, area: 'fact' as const, interests });
const STAKEHOLDERS: NonNullable<Project['stakeholders']> = [
  sh('fp-sh1', 'SH-IN 01', 'Hr. van Borg (GF, Auftraggeber)', 'in', 'Will bei steigendem Auftragsvolumen die NC-Kosten senken und die Kundenzufriedenheit verbessern.', 'participative', 'Permanente Abstimmung mit allen Projektbeteiligten zu den Schritten.', 1, 3, CLIENT),
  sh('fp-sh2', 'SH-IN 02', 'Hr. Martens (Logistikmanager)', 'in', 'Stimmt mit SH-IN 01 überein und braucht bessere Arbeitsbedingungen, um seine Kennzahlen sichern zu können.', 'participative', 'Permanente Informationen zu allen Vorgängen in seinem Verantwortungsbereich an SH-IN 01.', 1, 3, pid('LM')),
  sh('fp-sh3', 'SH-IN 03', 'Hr. Hermann (IT-Manager)', 'in', 'Wünscht sich wartungsärmere IT-Komponenten und schult die Logistik-MA auf die Handhabung der neuen Handscanner.', 'informative', 'Terminabsprachen zur Einrichtung der neuen EDV-Ausstattung und Schulung mit SH-IN 02.', 1, 1, `${PERSON_PREFIX}hermann`),
  sh('fp-sh4', 'SH-IN 04', 'Fr. Sommer (Finance Managerin)', 'in', 'Will die NC-Kosten senken und keine Mehrkosten durch Terminschiebungen tragen müssen.', 'informative', 'Rückmeldungen zu Lieferterminen und allen Kosten.', 1, 1, `${PERSON_PREFIX}sommer`),
  sh('fp-sh5', 'SH-IN 05', 'Fr. Bauer (QMB, Projektbüro)', 'in', 'Legt besonderen Wert auf die Dokumentation aller Vorgänge und Entwicklungen nach QM-Vorgaben; ist dem Projektbüro zugeordnet.', 'participative', 'Permanente Information und Dokumentation entsprechend den Vorgaben im QM-Handbuch.', 1, 3, `${PERSON_PREFIX}bauer`),
  sh('fp-sh6', 'SH-IN 06', 'Sonstige betroffene Mitarbeiter', 'in', 'Angst vor Veränderung durch das neue fahrerlose Transportsystem (FTS).', 'informative', `Frühzeitige Information durch SH-IN 02 zum Nutzen und zu den besseren Arbeitsbedingungen durch das neue System. Nach dem Statusmeeting am ${dmy('2022-03-01')} vom repressiven Opponenten zum informativen Promotor geworden (Anlage 7).`, 3, 1, undefined, 'Die Mitarbeitenden befürchten einen Stellenabbau.'),
  sh('fp-sx1', 'SH-EX 01', 'Hr. Koch (Drive Safe GmbH, Transport)', 'ex', 'Hat Interesse an kurzen und schnellen Beladungsintervallen zur Sicherstellung eines Tourenplans.', 'informative', 'SH-IN 02 und PL haben ein Ladungsträger-Konzept erstellt und dem DL übermittelt.', 3, 3),
  sh('fp-sx2', 'SH-EX 02', 'Fr. Wulff (ImmoWulff GmbH, Vermieterin)', 'ex', 'Legt hohen Wert auf das Übergabeprotokoll zum Mietvertrag, um Schäden am Mietobjekt bei der Schlüsselübergabe aufzunehmen; erwartet, bei neuen Schäden unverzüglich informiert zu werden.', 'repressive', 'Übermittelt das Übergabeprotokoll an den AG.', 3, 1),
  sh('fp-sx3', 'SH-EX 03', 'Hr. Buchholz (FTS GmbH, Vertrieb)', 'ex', 'Hat Interesse, sowohl das Regalsystem als auch das FTS an die Flight Interior GmbH zu verkaufen.', 'informative', 'Muss mit allen technischen und terminlichen Informationen versorgt werden, um Lieferung und Aufbau sicherstellen zu können.', 1, 1),
  sh('fp-sx4', 'SH-EX 04', 'Hr. Franke (FTS GmbH, Prozesstechniker)', 'ex', 'Hat Interesse, dass Regalsystem und FTS termingerecht geliefert und montiert werden, um die Prozesse vor Ort erarbeiten zu können.', 'informative', 'Muss mit Informationen zu Liefer- und Montageterminen versorgt werden.', 1, 1),
  sf('fp-sf1', 'SF-IN 01', 'Interne Vorgaben', 'in', 'QM- und PM-Handbuch'),
  sf('fp-sf2', 'SF-IN 02', 'IT & EDV', 'in', 'Technische Ausstattung der Büros und der Logistikhalle'),
  sf('fp-sf3', 'SF-IN 03', 'Schutzausrüstung', 'in', 'Arbeitssicherheit'),
  sf('fp-sf4', 'SF-IN 04', 'Kosten PM', 'in', 'Projektleitung und Planung'),
  sf('fp-sf5', 'SF-EX 01', 'Infrastruktur', 'ex', 'Anliefermöglichkeiten'),
  sf('fp-sf6', 'SF-EX 02', 'Mietvertrag', 'ex', 'Mietvertrag der neuen Immobilie (10 Jahre)'),
  sf('fp-sf7', 'SF-EX 03', 'Werkvertrag', 'ex', 'Sicherstellung der Logistikausstattung'),
  sf('fp-sf8', 'SF-EX 04', 'Gesetze & Verordnungen', 'ex', 'Arbeitsschutz und Arbeitssicherheit'),
  sf('fp-sf9', 'SF-EX 05', 'Technische Machbarkeit', 'ex', 'Verfahrensanwendungen FTS'),
  sf('fp-sf10', 'SF-EX 06', 'Warenverfügbarkeit', 'ex', 'FTS und sonstige Ausrüstung'),
];

/** DKI-Matrix (Tab. 8) aus Sicht der PL – die Strategie gegenüber dem Stakeholder steht in Klammern bei „Information“. */
const COMMS: NonNullable<Project['comms']> = [
  { id: 'fp-k1', content: 'Informationen zum Projektfortschritt, zu Abweichungen und Störungen', sender: 'PL', receiver: 'GF/AG Hr. van Borg', strategy: 'push', doc: 'Statusbericht gemäß Formularvorgabe', info: 'Präsentation in der Leitungsrunde (partizipativ, aktive Einbindung)', freq: '14-täglich, jeweils montags 10:00–12:00 Uhr' },
  { id: 'fp-k2', content: 'Analyse und Erfahrungssicherung hinsichtlich des Gesamtprojekts (Review)', sender: 'PL', receiver: 'GF/AG Hr. van Borg', strategy: 'push', doc: 'Abschlussbericht, 1–5 Seiten DIN A4', info: 'Projektabschluss-Meeting mit GF, PL und Planungsteam (partizipativ)', freq: '1× in der Abschlussphase' },
  { id: 'fp-k3', content: 'Sämtliche Projektinformationen, Anforderungen, Pläne und Berichte', sender: 'PL', receiver: 'QMB/PO Fr. Bauer', strategy: 'push', doc: 'Komplette Dokumentation der Kommunikation', info: 'Mündlich und schriftlich (partizipativ, aktive Einbindung)', freq: 'Tägliche Abstimmung' },
  { id: 'fp-k4', content: 'Sämtliche Projektinformationen, Anforderungen, Pläne und Berichte', sender: 'QMB/PO Fr. Bauer', receiver: 'PL', strategy: 'push', doc: 'Komplette Dokumentation der Kommunikation', info: 'Mündlich und schriftlich (partizipativ, aktive Einbindung)', freq: 'Tägliche Abstimmung' },
  { id: 'fp-k5', content: 'Informationen zum Projektfortschritt, Änderungen, AG-Entscheidungen', sender: 'PL', receiver: 'Sonstige betroffene Mitarbeiter', strategy: 'push', doc: 'Agenda; AP-Ergebnisse; Verlaufsprotokoll', info: 'Schriftlich (informativ, aktive Einbindung)', freq: 'Wöchentlich, jeweils freitags 14:00–15:00 Uhr' },
  { id: 'fp-k6', content: 'Informationen zu Anforderungen, Änderungen und Entscheidungen des AG sowie zum Projektfortschritt und zu Terminen', sender: 'PL', receiver: 'Mittelbar beteiligte Fachbereichsleiter', strategy: 'push', doc: 'Gesprächsprotokolle; Berichte und Präsentationen', info: 'Persönlich und schriftlich; Diskussionsrunden nach Präsentationen (partizipativ, aktive Einbindung)', freq: 'Wöchentlich, jeweils mittwochs bis 17:00 Uhr per Mail, bei Bedarf täglich mündlich' },
  { id: 'fp-k7', content: 'Informationen zu Anforderungen, Änderungen und Entscheidungen des AG sowie zum Projektfortschritt und zu Terminen', sender: 'PL', receiver: 'Hr. Koch (Drive Safe GmbH)', strategy: 'push', doc: 'Vertrag; Tourenplan; Gesprächsprotokolle', info: 'Persönlich und schriftlich per Mail (diskursiv, aktive Einbindung)', freq: 'Einmalig schriftlich bei Vertragsabschluss/Projektstart; bei Bedarf per Mail oder mündlich' },
  { id: 'fp-k8', content: 'Informationen zu Schäden am Mietobjekt', sender: 'Fr. Wulff (ImmoWulff GmbH)', receiver: 'PL', strategy: 'push', doc: 'Vertrag inkl. Übergabeprotokoll', info: 'Schriftlich und persönlich (repressiv, passive Einbindung)', freq: 'Einmalig bei Vertragsabschluss' },
  { id: 'fp-k9', content: 'Technische und terminliche Informationen zu Lieferung und Aufbau', sender: 'Hr. Buchholz (FTS GmbH)', receiver: 'PL', strategy: 'push', doc: 'Vertrag; Wartungsvorschrift', info: 'Schriftlich und persönlich (informativ, passive Einbindung)', freq: 'Einmalig bei Vertragsabschluss' },
  { id: 'fp-k10', content: 'Individuell erstelltes Handbuch inkl. Prozesskarten', sender: 'Hr. Franke (FTS GmbH)', receiver: 'PL', strategy: 'push', doc: 'Handbuch; Prozesskarten', info: 'Schriftlich und persönlich (informativ, aktive Einbindung)', freq: 'Einmalig bei Übergabe der Dokumentation' },
];

/** Rollen mit AKV (Tab. 7). */
const ROLES: NonNullable<Project['roles']> = [
  { id: 'lead', name: 'Projektleitung', person: ME_ID, tasks: 'Koordination, Führung und Motivation des Projektteams; Abstimmung von Projektauftrag und -planung mit übergeordneter Stelle; Überwachung der Leistungs-, Termin- und Kostenziele; Berichterstattung an GF/AG über den Projektfortschritt; Finalisierung der Projektdokumentation', powers: 'Abschluss von Verträgen mit externen DL; Unterschrift aller Projektdokumente; fachliche Weisungsbefugnis und Entscheidungsrecht für Projektteam und -aufgaben; Zusammenstellung des Projektteams; Mitwirkung bei der Bestimmung von Projektzielen und -rollen', duty: 'Koordination der externen DL; Erreichen der vereinbarten Projektziele und Einhaltung der Terminziele' },
  { id: 'client', name: 'Auftraggeber (GF)', person: CLIENT, tasks: 'Erstellung und Beauftragung des Projekts; Definition der Projektziele und des Projektnutzens; Bereitstellung des Budgets und weiterer Ressourcen; Abnahme der Projektergebnisse', powers: 'Alleinige Entscheidungsbefugnis über Start, Abbruch und Änderungen des Projekts; wird schon vor Projektstart tätig; Austausch der PL', duty: 'Erreichen der Projektziele mit der PL; klare Zielformulierung; strategische Verantwortung für den Return on Investment' },
  { id: 'lm', name: 'Logistikmanager', person: pid('LM'), tasks: 'Führungs- und Steuerungsaufgabe im Fachbereich Logistik; berichtet der Geschäftsführung', powers: 'Fachliche und disziplinarische Weisungsbefugnis über die Logistik-MA; Mitwirkung an der inhaltlichen Gestaltung des Projekts', duty: 'Reibungsloser Ablauf der Prozesse und Erreichen der vereinbarten Sozial- und Kostenziele' },
  { id: 'itm', name: 'IT-Manager', person: `${PERSON_PREFIX}hermann`, tasks: 'Führungs- und Steuerungsaufgabe im Fachbereich IT; Bereitstellung und Sicherstellung der IT und EDV im Unternehmen', powers: 'Fachliche und disziplinarische Weisungsbefugnis über die IT-Mitarbeitenden; Mitwirkung an der inhaltlichen Gestaltung des Projekts im Bereich IT und EDV-Ausstattung', duty: 'Vollständige und termingerechte Umsetzung der IT und EDV-Ausstattung' },
  { id: 'fm', name: 'Finance Managerin', person: `${PERSON_PREFIX}sommer`, tasks: 'Prüfung aller externen Dienstleistungsverträge auf Richtigkeit; Rechnungsprüfung und -anweisung; Budget-Kontierung', powers: 'Kostenkontrolle; Überwachung aller Zahlungsabläufe', duty: 'Überwachung des Ressourcen- und Kostenplans; korrekte Einhaltung aller Zahlungsziele' },
  { id: 'office', name: 'Projektbüro & QM-Beauftragte', person: `${PERSON_PREFIX}bauer`, tasks: 'Dokumentation und Datenpflege im Qualitätsmanagement; unterstützt die PL bei Kapazitätsplanung und Materialbeschaffung; Vor- und Nachbereitung von Statusmeetings', powers: 'Umsetzung der zugeordneten Aufgaben gemäß Vorgaben; Vorbereitung von Entscheidungen der PL', duty: 'Rechtzeitige Meldung von Problemen; termin- und kostengerechte Erbringung sowie inhaltliche Richtigkeit der Ergebnisse aus den zugeordneten Aufgaben' },
];

export const hasLogisticsProject = (ws: Workspace): boolean => (ws.projects ?? []).some((p) => p.id === LOGISTICS_PROJECT);

/** Zweites Beispielprojekt anlegen (nichts, wenn es schon da ist). */
export function addLogisticsProject(ws: Workspace, now = Date.now()): Workspace {
  if (hasLogisticsProject(ws)) return ws;
  let next = ensureMe(ws);
  const persons: Person[] = [
    ...GROUPS.map((g): Person => ({ id: pid(g.res), name: g.name, kind: 'role', capacity: g.capacity, rate: g.rate })),
    ...OTHERS,
  ].filter((p) => !(next.persons ?? []).some((x) => x.id === p.id));
  if (persons.length) next = { ...next, persons: [...(next.persons ?? []), ...persons] };
  const project: Project = {
    id: LOGISTICS_PROJECT,
    name: 'FUTURE-P.ROOF – smarter logistics',
    psp: { prefix: 'FP-1.', style: 'num' },
    brief: {
      goal: 'Inbetriebnahme eines neuen Logistik-Centers',
      approach: 'PSP objektorientiert gegliedert: er enthält alle zu liefernden (Teil-)Ergebnisse; fast alle Teilaufgaben und Arbeitspakete bauen aufeinander auf und erleichtern so die Ablauf- und Terminplanung. Aufwand per Analogieschätzung bisheriger Projekte, ergänzt durch Mehrfachbefragung des Planungsteams; Verfügbarkeiten bei den Fachabteilungen angefragt. Kosten über Stundenverrechnungssätze der Lohnbuchhaltung (inkl. Lohnnebenkosten), Kostenarten nach Qualifikationsgruppen benannt. Moderation: Zuruf-Frage, Clustern, Maßnahmenplan.',
      org: 'Matrix-Projektorganisation: die Mitwirkenden arbeiten parallel in Linie und Projekt, bleiben in der Linienorganisation und bringen ihr Fachwissen ein; die Linie erhält so die Weiterqualifikation Projektmanagement. Die Projektleitung aus der Stammorganisation der Flight Interior GmbH koordiniert, hat fachliche Weisungsbefugnis und volle Zielverantwortung. Lenkungsausschuss: keiner.',
    },
    charter: {
      no: 'FP-1',
      kind: 'Investitions- und Organisationsprojekt',
      client: 'Flight Interior GmbH, vertreten durch den Geschäftsführer Hr. van Borg',
      clientKind: 'in',
      clientAddress: 'Am Genter Ufer 13, 21129 Hamburg',
      businessCase: 'Steigende Auftragszahlen des bestehenden Kunden, Zusammenschluss mit einem anderen Kabinenausstatter und Aussicht auf einen weiteren Werkvertrag mit Boeing. Durch mehr Lagerfläche und automatisierte Abläufe sollen 90 % weniger bis gar keine NC-Kosten durch kaputt gelagerte Bauteile mehr entstehen – dafür wird eine neue, größere Immobilie für 10 Jahre angemietet und das Logistik-Center dorthin verlagert.',
      benefit: 'Zukunftsfähige, modernisierte Ausstattung als Voraussetzung für Umsatzsteigerungen, wiedergewonnene Zufriedenheit bestehender Kunden und höhere Motivation der Mitarbeitenden; bessere Chance auf einen weiteren Werkvertrag mit Boeing; gesicherte Auftragsabwicklung.',
      benefitMeasure: 'NC-Kosten sinken; im Werkvertrag vereinbarte Prozesse werden eingehalten.',
      success: 'Für den Auftraggeber ist das Projekt erfolgreich, wenn nach Einrichtung der Räumlichkeiten alle im Werkvertrag vereinbarten Prozesse eingehalten werden und die NC-Kosten sinken.',
      ownEffort: 2998,
      extEffort: 0,
      costPm: 95000,
      costMaterial: 22845000,
      reserve: 20000,
      reporting: '14-tägiger Statusbericht.',
      special: 'Coronabedingte Einschränkungen, die vom Gesetzgeber vorgegeben werden. Mögliche Störungen/Risiken: Lieferengpässe bei Mikrochips.',
      model: 'classic',
      tailoring: 'Klassisch in fünf meist überlappenden Phasen über 7 Monate (Tab. 9).',
      main: '• Ausbau und Inbetriebnahme eines neuen Logistik-Centers\n• Erweiterung und Verbesserung der Lagerbedingungen bei mehr Auftragsvolumen\n• Senkung der NC-Kosten\n• Die Zufriedenheit der Mitarbeiter und des Kunden verbessern',
      team: 'Organisationsteam: Hr. van Borg (GF); Hr. Martens (LM); Hr. Hermann (IT-M); Fr. Sommer (FM); Fr. Bauer (QMB)',
      steering: 'n/v',
      vendors: 'Hr. Koch, Drive Safe GmbH; Fr. Wulff, ImmoWulff GmbH; Hr. Buchholz, FTS GmbH',
      others: 'n/v',
      fixed: [noteId(3)],
    },
    goals: GOALS,
    conflicts: [
      { id: 'fp-zk1', a: 'fp-lzi2', b: 'fp-lzi3', text: 'Um die Lieferfähigkeit auch während des Umbaus sichern zu können, müssen die Büros ausgestattet und funktionsfähig sein.', measure: 'Der Ausbau der Büros beginnt schon in der Konzeptionsphase, der Bezug der Büroräume findet in der Detailplanungsphase statt.', first: 'a' },
      { id: 'fp-zk2', a: 'fp-lzi3', b: 'fp-lzi4', text: 'Die Prozesse sollen optimiert und dadurch Kennzahlen und Kundenzufriedenheit verbessert werden. Ohne vorherige Einrichtung des Logistik-Centers können keine Prozesse erarbeitet werden.', measure: 'SH-IN 02 wird schon in der Detailplanung bei der Wahl der Ausstattung einbezogen und beim Ausbau vorrangig als Supervisor für die externen DL eingesetzt.', first: 'a' },
    ],
    stakeholders: STAKEHOLDERS,
    phases: PHASES,
    comms: COMMS,
    lessons: [
      { id: 'fp-ll1', topic: 'Projekttitel und Nutzen früh an die Belegschaft kommunizieren', kind: 'improve', phase: 'fp-ph2', what: 'Der erste Projekttitel „Work better“ wurde von den Logistik-Mitarbeitenden als Ankündigung eines Stellenabbaus durch Automatisierung verstanden (Nachrichtenquadrat nach Schulz von Thun, Kap. 14).', cause: 'Der tatsächliche Nutzen des Projekts war nicht ausreichend an die Belegschaft kommuniziert; der Titel sagte nichts über ihn aus.', advice: 'Noch im Statusmeeting Brainstorming zu Sorgen und Ängsten, danach morphologische Analyse zum angestrebten Nutzen – neuer Titel „FUTURE-P.ROOF – smarter logistics“ mit klarer Nutzenaussage. Dem Marketing im Projekt zugeordnet; SH-IN 06 wechselte vom repressiven Opponenten zum informativen Promotor.', owner: pid('LM'), shared: true },
    ],
    start: shift('2022-02-01'),
    end: shift('2022-08-31'),
    budget: 22960000,
    priority: 1,
    roles: ROLES,
    state: 'planned',
    created: now,
    changed: now,
  };
  next = { ...next, projects: [...(next.projects ?? []), project] };
  const byNr = new Map(ROWS.map((r) => [r.nr, r]));
  for (const r of ROWS) {
    const ms = r.days === 0;
    const groups = Object.entries(r.use ?? {}) as [Res, number][];
    const staff = groups.reduce((a, [g, h]) => a + h * RATE[g], 0);
    const lead = groups.slice().sort((a, b) => b[1] - a[1])[0]?.[0];
    const who = r.nr === 39 ? 'LM' : lead;
    const matText = r.mat ? `Sachmittel (${r.mat[0].toLocaleString('de-DE')} €): ${r.mat[1]}.` : '';
    const extra = [r.text, matText].filter(Boolean).join('\n\n');
    const code = r.code.startsWith('MS') ? `FP-${r.code}` : `FP-1.${r.code.slice(2)}`;
    const init: Partial<Note> = {
      title: '',
      text: `${headText(r.name)}\n\n${ms ? 'Meilenstein' : 'PSP-Code im Report:'} ${code} (Projektreport FUTURE-P.ROOF).${extra ? `\n\n${extra}` : ''}`,
      project: LOGISTICS_PROJECT,
      ...(r.notBefore ? { notBefore: shift(r.notBefore) } : !r.pred && !ROWS.some((x) => x.parent === r.nr) ? { notBefore: shift(r.start) } : {}),
      due: shift(r.end),
      ...(r.parent && byNr.has(r.parent) ? { parent: noteId(r.parent) } : {}),
      ...(ms ? { milestone: true } : { duration: r.days }),
      // Aufwand aus den Einsätzen gerechnet; Plan-Kosten von Hand nur, wenn Sachkosten dazukommen (Personal + Sachmittel wie Anlage 3)
      ...(r.mat ? { cost: { plan: staff + r.mat[0] } } : r.nr === 39 ? { cost: { actual: 3294 } } : {}),
      ...(r.nr === 39 ? { effort: { actual: 66 } } : {}),
      ...(groups.length ? { use: groups.map(([g, h]) => ({ person: pid(g), hours: h, ...(g === 'PL' ? { cost: h * RATE.PL } : {}) })) } : {}),
      ...(who ? { assignee: pid(who) } : {}),
      ...(r.accept ? { accept: r.accept.map(([text, due, by, acceptor, ok]) => ({ text, due: shift(due), by, acceptor, ...(ok ? { ok: true as const } : {}) })) } : {}),
      ...(r.results ? { results: r.results } : {}),
      ...(r.phase ? { phase: `fp-${r.phase}` } : {}),
      ...(r.nr === 39
        ? {
            wp: {
              goal: 'Alle logistischen Prozesse für das neue Logistik-Center mit FTS festlegen',
              activities: 'Prozessschritte mit TL-Logistik und dem Prozesstechniker der FTS GmbH erarbeiten\nProzessschritte zu Prozessketten zusammenfassen und darstellen\nPL begleitet zeitweise und bereitet damit die MA-Schulungen vor',
              inputs: 'Vorgänger: FP-1.5.1 Aufbaustruktur festlegen. Nachfolger: FP-1.5.3 Ablaufplan MA-Schulungen festlegen; FP-MS6 Umzug abgeschlossen.',
              risks: 'Bei gut optimierten und vorausschauend gestalteten Prozessen steigt die Wirtschaftlichkeit, die Reklamationsquote sinkt und weitere Kunden können strukturiert bedient werden.',
              method: 'effort' as const,
              progress: 73,
              releasePl: shift('2022-03-11'),
              releaseOwner: shift('2022-04-13'),
            },
          }
        : {}),
    };
    const after = parsePreds(r.pred, NOTE_PREFIX);
    if (after.length) init.after = after;
    next = createNote(next, init, { id: noteId(r.nr), now }).ws;
  }
  // Risiken (Tab. 5/6), Chance (Kap. 5.3), Änderungen (Kap. 14 / Anlage 7, Kap. 10.2), Beschaffungen (Anlage 3)
  const rk = 'Aus dem Projektreport (Tab. 5/6).';
  const steer: { id: string; init: Partial<Note> }[] = [
    { id: 'fp-r1', init: { title: 'Meilenstein MS3 gefährdet: PC-Arbeitsplätze fehlen (Chipkrise)', text: `${rk}\n\nRisikoart: Meilenstein-Terminrisiko.`, type: 'risk', risk: { no: 1, ew: 30, impact: 13200, cause: 'Aufgrund der aktuellen Chipkrise können die bestellten PC-Arbeitsplätze nicht in ausreichender Menge geliefert werden', event: 'Der Meilenstein MS3 „Büroräume eingerichtet & EDV installiert“ kann nicht eingehalten werden', effect: 'Die MA können nicht wie geplant an ihren neuen Arbeitsplätzen arbeiten und das neue FTS nicht steuern. Die Projektdauer muss ggf. verlängert werden, wodurch höhere Kosten entstehen (Personalkosten 600 € pro Tag, 13.200 € pro Monat).', strategy: 'avoid', measures: [{ id: 'm1', kind: 'prev', text: 'Vermeiden (technisch/alternativ): Die neuen Arbeitsplätze werden vorübergehend mit den alten, vorhandenen Rechnern besetzt', cost: 600, decided: true }, { id: 'm2', kind: 'corr', text: 'Schaden begrenzen (sozial): Installation der FTS-Software auf den alten Rechnern durch IT-MA', cost: 1200, decided: true }], owner: ME_ID, state: 'doing' } } },
    { id: 'fp-r2', init: { title: 'Meilenstein MS5 gefährdet: Funkeinheiten der FTF fehlen (Chipkrise)', text: `${rk}\n\nRisikoart: Meilenstein-Terminrisiko. Verantwortlich für die präventive Maßnahme: PL und Hausjurist.`, type: 'risk', risk: { no: 2, ew: 30, impact: 100000, cause: 'Aufgrund der aktuellen Chipkrise können die drahtlosen Verbindungseinheiten der FTF nicht in die bestellten Fahrzeuge eingebaut werden', event: 'Der Meilenstein MS5 „Ausbau abgeschlossen“ kann nicht eingehalten werden', effect: 'Die Prozesse können nicht erarbeitet werden; die geplante Nutzung der neuen Immobilie ist zum vorgesehenen Zeitpunkt nicht umsetzbar.', strategy: 'avoid', measures: [{ id: 'm1', kind: 'prev', text: 'Verträge mit einer Leiharbeitsfirma abschließen', cost: 1500, decided: true }, { id: 'm2', kind: 'corr', text: 'Die gelieferten FTF werden manuell durch Mitarbeitende einer Leiharbeitsfirma genutzt (5 Personen × 2.500 € pro Monat)', cost: 12500, decided: true }], owner: ME_ID, state: 'doing' } } },
    { id: 'fp-r3', init: { title: 'Höhere Kosten durch umfangreichere MA-Schulungen', text: `${rk}\n\nRisikoart: kaufmännisches Risiko.`, type: 'risk', risk: { no: 3, ew: 25, impact: 10000, cause: 'Größerer Umfang der nötigen MA-Schulungen', event: 'Die MA müssen umfangreicher geschult werden', effect: 'Kostenziele können nicht eingehalten werden; Mehrkosten in Höhe von 8.000 €.', strategy: 'reduce', measures: [{ id: 'm1', kind: 'prev', text: 'Vermindern: Schulungsbedarf präziser ermitteln, MA-Ausfall für Schulungen in Höhe von 10 % und für Nachschulungen 3 weitere Tage einplanen', cost: 500, decided: true, ewAfter: 10 }, { id: 'm2', kind: 'corr', text: 'Ggf. 3 weitere Schulungstage', cost: 3000, decided: true }], owner: ME_ID, state: 'doing' } } },
    { id: 'fp-ch1', init: { title: 'Weitere Kunden über den neuen Standort bedienen', text: 'Aus dem Projektreport (Kap. 5.3): Gelingen alle Vorhaben, kann die Flight Interior GmbH über diesen Standort weitere Kunden bedienen und ihre Marktposition in diesem Segment stärken. Das neue FTS und ein neuer Kunde beschleunigen den Return on Investment maßgeblich.', type: 'risk', risk: { no: 4, chance: true, strategy: 'accept', owner: CLIENT, state: 'open' } } },
    { id: 'fp-c1', init: { title: 'Projekttitel ändern: „Work better“ → „FUTURE-P.ROOF – smarter logistics“', text: 'Aus dem Projektreport (Kap. 14, Anlage 7: Statusmeeting).', type: 'change', change: { no: 1, why: 'Der bisherige Titel „Work better“ weckte bei den Logistik-Mitarbeitenden die Angst vor Stellenabbau durch Automatisierung; der tatsächliche Nutzen war nicht ausreichend kommuniziert.', scope: 'Neuer Projekttitel mit klarer Nutzenaussage (Brainstorming und morphologische Analyse im Statusmeeting); Maßnahme dem Marketing im Projekt zugeordnet.', by: pid('LM'), decider: 'client', state: 'approved', decided: { at: `${shift('2022-03-01')}T10:00:00.000Z`, text: 'Im Statusmeeting beschlossen; SH-IN 06 wechselte danach vom repressiven Opponenten zum informativen Promotor.', who: CLIENT } } } },
    { id: 'fp-c2', init: { title: 'Engpass der Projektleitung in KW 24 auflösen', text: 'Aus dem Projektreport (Kap. 10.2, Einsatzmittelganglinie der Projektleitung).', type: 'change', change: { no: 2, why: 'Der Vorrat der Projektleitung zeigt in KW 24 eine leichte Unterdeckung gegenüber der Einsatzmittelganglinie.', scope: 'FP-1.3.5 Ausstattung mit neuer Technik wird gestaucht; bei FP-1.2.5 Büroräume beziehen werden die 2 Stunden aus KW 24/25 in den Vorzeitraum übernommen und der Vorgang unterbrochen.', by: ME_ID, decider: 'client', state: 'approved' } } },
  ];
  const buy: [string, string, number, string, NonNullable<Note['procure']>['state']][] = [
    ['fp-b1', '20 Büroeinrichtungen', 34060, 'Einkauf', 'delivered'],
    ['fp-b2', '20 PC-Arbeitsplätze (Monitore, Rechner inkl. Bedienelemente, Telefone)', 14550, 'Einkauf', 'delivered'],
    ['fp-b3', 'Regalsystem: 240 Regalsegmente inkl. FTS-Anbauten (je 81.325 €)', 19518000, 'FTS GmbH', 'delivered'],
    ['fp-b4', 'Fahrerlose Transportfahrzeuge: 17 kleine (je 83.000 €), 8 große (je 217.000 €)', 3147000, 'FTS GmbH', 'ordered'],
    ['fp-b5', 'FTS-Steuerungsbundle (Handscanner, Monitore, Rechner inkl. Bedienelemente)', 17536, 'FTS GmbH', 'ordered'],
    ['fp-b6', '10 Logistik-Arbeitsplätze (Packtische, Arbeitsstühle)', 15833, 'Einkauf', 'ordered'],
    ['fp-b7', '20 konzeptionierte Ladungsträger (Transportgestell, Gitterboxen, Euroboxen, Palettenboxen)', 68625, 'Drive Safe GmbH', 'ordered'],
  ];
  for (const [id, title, offer, supplier, state] of buy) steer.push({ id, init: { title, text: 'Aus dem Projektreport (Anlage 3, Sachmittel).', type: 'procurement', procure: { make: 'buy', supplier, offer, state } } });
  for (const x of steer) next = createNote(next, { ...x.init, project: LOGISTICS_PROJECT }, { id: x.id, now }).ws;
  return next;
}

/** Zweites Beispielprojekt ganz entfernen. */
export const removeLogisticsProject = (ws: Workspace): Workspace => removeSampleBy(ws, LOGISTICS_PROJECT, NOTE_PREFIX, PERSON_PREFIX);
