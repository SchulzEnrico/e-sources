/**
 * F-235 (V135, Doc „F-235 V135 – E-Sources als Live-Projekt“, Option A, L1–L6 wie Vorschlag): das Projekt E-Sources selbst
 * als Projekt in E-Sources – Live-Testobjekt. Claude pflegt es in jedem Chat: `tools/live_project.py` erzeugt
 * `liveProjectData.ts` aus dem Lastenheft (Abschnitt = Teilaufgabe, F-Punkt = Arbeitspaket, Stand ✓/● fertig, ◐ halb,
 * ○ offen, Aufwand = Chats × 2 h). „Aktualisieren“ ersetzt nur die von Claude gepflegten Teile (Ids `es-n-…`); eigene
 * Notizen, Karten und Kommentare am Projekt bleiben (L4).
 */
import type { Note, Project, Workspace } from './types';
import { createNote, notesOf } from './notes';
import { headText } from './sheets';
import { ME_ID, ensureMe } from './persons';
import { LIVE_CHANGES, LIVE_ITEMS, LIVE_STAND, type LiveItem } from './liveProjectData';

export const LIVE_PROJECT = 'pj-es';
const NOTE_PREFIX = 'es-n-';
const H_PER_CHAT = 2;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9äöüß]+/g, '-').replace(/^-|-$/g, '');

export const hasLiveProject = (ws: Workspace): boolean => (ws.projects ?? []).some((p) => p.id === LIVE_PROJECT);
/** V136: fehlt das Live-Projekt oder ist es aus einem älteren Stand? (Demo legt es dann von selbst neu an) */
export const liveStale = (ws: Workspace): boolean => (ws.projects ?? []).find((p) => p.id === LIVE_PROJECT)?.live !== LIVE_STAND.chat;

/** Zahlen für Meldung und Statusbericht. */
export function liveCounts(items: readonly LiveItem[] = LIVE_ITEMS) {
  const done = items.filter((i) => i.state === 'done').length;
  const part = items.filter((i) => i.state === 'part').length;
  return { all: items.length, done, part, open: items.length - done - part, chats: items.reduce((a, i) => a + i.chats, 0) };
}

function liveProject(now: number, old?: Project): Project {
  const c = liveCounts();
  const base = LIVE_ITEMS.filter((i) => i.base), extra = LIVE_ITEMS.filter((i) => !i.base);
  const noOf = (f: string) => LIVE_CHANGES.find((x) => x.fs.includes(f))?.no;
  const since = (f: string) => (noOf(f) ? ` (seit Ä-${noOf(f)})` : '');
  return {
    ...(old ?? {}),
    id: LIVE_PROJECT,
    name: 'E-Sources',
    psp: { prefix: 'ES-1.', style: 'num' },
    brief: {
      goal: 'Arbeitsfläche für Lesezeichen, Notizen und Projekte nach IPMA ICB4 – vom Lastenheft bis zur Testphase. Begonnen als kleine Vision einer geordneten Lesezeichen-Fläche (Lastenheft vom 20.11.2026); über genehmigte Änderungen (Kapitel 13) wurde daraus eine bessere Version von allem: Lesezeichen, Notizen, Kanban und Projektmanagement an einem Ort.',
      approach: 'Hybrid: Lastenheft mit F-Punkten, je Chat ein Arbeitspaket-Bündel; Grundsatzfragen über Entscheidungs-Docs; Funktion vor Design; Rangfolge 1. IPMA ICB4, 2. MS Project/iTaskX/Trello, 3. eigene Verbesserungen.',
      org: 'Enrico Schulz (Auftraggeber, Projektleitung, Anwender); Claude (Entwicklung, Dokumentation, Tests).',
    },
    charter: {
      ...(old?.charter ?? {}),
      no: 'ES-1',
      kind: 'Entwicklungsprojekt (Eigenprojekt, Portfolio)',
      client: 'Enrico Schulz',
      clientKind: 'in',
      benefit: 'Eigenes Werkzeug für fokussiertes Arbeiten; zeigt Arbeitgebern, wie Enrico Projekte nach ICB4 plant und steuert.',
      businessCase: `Basisplan (20.11.2026): ${base.length} Anforderungen einer Lesezeichen-Arbeitsfläche. Jede Idee, die bei der Arbeit entstand, kam als Änderung dazu – ${LIVE_CHANGES.length} Änderungen mit ${extra.length} weiteren Anforderungen. So wurde aus einer kleinen Vision eine bessere Version von allem.`,
      success: 'Alle F-Punkte des Lastenhefts gebaut und von Enrico geprüft; Online-Demo zeigt den Stand.',
      reporting: `Statusbericht je Chat (zuletzt ${LIVE_STAND.chat}${LIVE_STAND.day ? `, ${LIVE_STAND.day.split('-').reverse().join('.')}` : ''}): ${c.done} fertig · ${c.part} teilweise · ${c.open} offen von ${c.all} F-Punkten.`,
      model: 'hybrid',
      main: '• Arbeitsfläche mit Desks, Slots und Portalen\n• Notizen, To-do, Kanban und Eisenhower\n• Projekt-Modus mit Formularen und Blättern wie im ICB4-Report\n• Abgleich zwischen Geräten',
    },
    goals: [
      { id: 'es-g1', code: 'L1', text: 'Lesezeichen-Arbeitsfläche laut Basisplan gebaut', measure: `${base.filter((i) => i.state === 'done').length} von ${base.length} Anforderungen des Basisplans fertig`, kind: 'perf', level: 'must', owner: ME_ID },
      { id: 'es-g6', code: 'L2', text: `Notizen, To-do, Kanban und Eisenhower neben den Seiten${since('F-206')}`, measure: 'Notizen in Pads, Library und Projekten', kind: 'perf', level: 'must', owner: ME_ID, parent: 'es-g1' },
      { id: 'es-g7', code: 'L3', text: `Projekt-Modus nach IPMA ICB4 wie im eigenen Report${since('F-226')}`, measure: 'Formulare, Grafik-Blätter und Bericht wie im Report ColorGentlemen', kind: 'perf', level: 'must', owner: ME_ID, parent: 'es-g1' },
      { id: 'es-g8', code: 'L4', text: 'Alle Änderungen eingearbeitet', measure: `${c.done} von ${c.all} F-Punkten fertig (Basisplan und ${LIVE_CHANGES.length} Änderungen)`, kind: 'perf', level: 'should', owner: ME_ID },
      { id: 'es-g2', code: 'T1', text: 'Stand für den Termin am 04.12.2026', kind: 'perf', level: 'must', owner: ME_ID },
      { id: 'es-g3', code: 'T2', text: 'Testphase ab 07.12.2026', kind: 'perf', level: 'should', owner: ME_ID },
      { id: 'es-g4', code: 'S1', text: 'Barrierefrei mit Tastatur und Bildschirmleser bedienbar', kind: 'social', level: 'must', owner: ME_ID },
      { id: 'es-g5', code: 'N1', text: 'Eigener Server (F-81) – kommt später', kind: 'non' },
    ],
    phases: [
      { id: 'es-ph1', name: 'Aufbau', focus: 'Funktionen nach Lastenheft', start: '2026-11-20', end: '2026-12-04', share: 70 },
      { id: 'es-ph2', name: 'Testphase', focus: 'Prüfliste abarbeiten, Fehler beheben', start: '2026-12-07', end: '2026-12-23', share: 20 },
      { id: 'es-ph3', name: 'Feinschliff', focus: 'Design, Handbuch, Demo', start: '2027-01-04', end: '2027-01-29', share: 10 },
    ],
    roles: [
      { id: 'lead', name: 'Projektleitung', person: ME_ID, tasks: 'Anforderungen, Entscheidungen, Prüfung', duty: 'Ziele und Termine' },
      { id: 'client', name: 'Auftraggeber', person: ME_ID },
    ],
    start: '2026-11-20',
    end: '2027-01-29',
    // L7 (V136): Kapitel 13 – je Änderung eine Zeile: vorher (Basisplan) → nachher, Maßnahme = genehmigter Antrag Ä-n
    changes: LIVE_CHANGES.map((ch) => ({
      id: `es-v${ch.no}`,
      area: ch.group,
      today: ch.no === 1 ? 'Lastenheft vom 20.11.2026: eine Arbeitsfläche für Lesezeichen' : 'Stand des Basisplans (Lastenheft 20.11.2026)',
      target: ch.fs.length === 1 ? (LIVE_ITEMS.find((i) => i.f === ch.fs[0])?.title ?? ch.title) : `${ch.fs.length} neue Anforderungen (${ch.fs[0]} … ${ch.fs[ch.fs.length - 1]})`,
      affected: 'Anwender, Entwicklung',
      resistance: 'low' as const,
      measure: `Ä-${ch.no}: ${ch.why} Mehraufwand ${ch.hours} h.`,
      owner: ME_ID,
      due: ch.day,
      state: ch.done === ch.fs.length ? ('done' as const) : ('running' as const),
    })),
    // L7 (V136): Basisplan = ursprünglicher Umfang (Lastenheft 20.11.2026); später Dazugekommenes zeigt der Soll-Ist-Vergleich als „neu“
    baseline: { at: '2026-11-20T09:00:00.000Z', start: '2026-11-20', end: '2027-01-29', tasks: Object.fromEntries(base.map((i) => [`${NOTE_PREFIX}${i.f.toLowerCase()}`, { effort: i.chats * H_PER_CHAT }])) },
    ...liveExtras(),
    priority: 1,
    state: 'running',
    live: LIVE_STAND.chat,
    created: old?.created ?? now,
    changed: now,
  };
}

/** F-234 (V137): Kapitel 12.1, 15.1–15.5 und 16 am eigenen Projekt – aus der echten Zusammenarbeit (Lastenheft, Übergaben, Arbeitsregeln). */
function liveExtras(): Pick<Project, 'wpReports' | 'teamRoles' | 'messages' | 'moderations' | 'actions' | 'annexes'> {
  const f234 = LIVE_ITEMS.find((i) => i.f === 'F-234');
  const h = (f234?.chats ?? 3) * H_PER_CHAT;
  return {
    wpReports: f234
      ? [{
          id: 'es-wr1', wp: `${NOTE_PREFIX}f-234`, date: LIVE_STAND.day, from: '2026-11-27', to: LIVE_STAND.day, light: 'green', progress: f234.state === 'done' ? 100 : 80,
          planStart: '2026-11-27', planEnd: '2026-12-04', sollStart: '2026-11-27', sollEnd: '2026-12-04', actStart: '2026-11-27',
          planHours: h, sollHours: h, actHours: Math.round(h * 0.8),
          done: 'Grafik-Blätter wie im Report (Zielhierarchie, Organigramm, Phasenplan, PSP, Balkenplan, Auslastung) stehen; dazu AP-Statusbericht, Teamrollen nach Belbin, Eisenhower-Matrix, Nachrichtenquadrat, Moderationstechniken, Maßnahmenplan und Anlagen. Die Kästen von Zielhierarchie, PSP und Organigramm sind direkt im Blatt bearbeitbar und von Hand verschiebbar.',
          measures: 'Farbgestaltung und Layout-Generator für alle Dokumente als neuer Wunsch aufgenommen (F-236) – erst Entscheidungs-Doc, dann Bau.',
          place: 'Hamburg',
        }]
      : [],
    teamRoles: [{
      id: 'es-tr1', person: ME_ID, pf: 3, um: 13, ma: 11, er: 6, sp: 5, be: 10, ws: 13, ta: 3, ko: 6,
      text: 'Werte aus dem eigenen Report (Belbin-Test). Im Projekt E-Sources zeigt sich der Weichensteller in den vielen Ideen und Wünschen, die laufend als Änderungen dazukommen; der Umsetzer und Macher hält mit festen Terminen (04.12., Testphase ab 07.12.) und klaren Arbeitsregeln den Takt. Die schwache Perfektionisten-Rolle gleicht Claude mit Tests, Prüflisten und dem Handbuch aus.',
    }],
    messages: [{
      id: 'es-nq1', topic: 'Übergabe zwischen zwei Chats ohne Begrüßungstext', date: '2026-11-24', sender: 'Enrico (Projektleitung)', receiver: 'Claude (Entwicklung)',
      message: 'Du vergisst immer den Übergabetext.', reaction: 'Ab sofort steht der Begrüßungstext am Ende jeder Übergabe.',
      sFact: 'Am Ende des Chats fehlt der fertige Text für den Start des nächsten Chats.', rFact: 'Die Übergabedatei allein reicht nicht; der nächste Chat braucht eine fertige Startnachricht.',
      sSelf: 'Ich will ohne Nacharbeit weitermachen und mich auf die Übergabe verlassen können.', rSelf: 'Er ist genervt, weil er es schon mehrmals sagen musste.',
      sRel: 'Das haben wir schon besprochen – du solltest es inzwischen wissen.', rRel: 'Er erwartet, dass ich Absprachen dauerhaft einhalte.',
      sAppeal: 'Liefere den Übergabetext immer von selbst.', rAppeal: 'Den Begrüßungstext in jede Übergabe aufnehmen, ohne Aufforderung.',
      result: 'Als feste Arbeitsregel festgehalten: Übergabedatei ins Repo, danach Begrüßungstext und Projektstand als Textbaustein. Seitdem in jedem Chat geliefert.',
    }],
    moderations: [
      { id: 'es-mo1', occasion: 'Grundsatzfragen vor dem Bauen', date: '2026-11-23', technique: 'Entscheidungs-Doc an der Seite: Optionen mit Vor- und Nachteilen, was später davon abhängt, Fragen mit Vorschlag und Spalte „Antwort Enrico“; „io“ übernimmt die Vorschläge', participants: 'Enrico, Claude', goal: 'Entscheiden, bevor gebaut wird – nachvollziehbar und im Lastenheft festgehalten.', result: 'Rund 20 Entscheidungs-Docs (F-226 bis F-235), je als PDF unter docs/Arbeitspakete.' },
      { id: 'es-mo2', occasion: 'Rückmeldungen zu Design und Aufbau', date: '2026-11-21', technique: 'Sammelmodus „>START … <ENDE“ – angelehnt an die Kartenabfrage: erst sammeln, dann gemeinsam umsetzen', participants: 'Enrico, Claude', goal: 'Viele kleine Rückmeldungen ohne Unterbrechung aufnehmen.', result: 'Gesammelte Punkte gehen geordnet ins Lastenheft bzw. in die nächste Bauliste.' },
      { id: 'es-mo3', occasion: 'Wechsel zwischen den Chats', date: '2026-11-20', technique: 'Übergabe je Chat (Protokoll- und Maßnahmentechnik): Stand, Prüfliste, kleine Punkte, Commit-Text, Begrüßungstext, Projektstand', participants: 'Enrico, Claude', goal: 'Ohne Wissensverlust von Chat zu Chat weiterarbeiten.', result: `Übergaben V61 bis ${LIVE_STAND.chat} im Repo (docs/uebergaben).` },
    ],
    actions: [
      { id: 'es-ma1', code: 'M-1', title: 'Stand vorstellen', activity: 'E-Sources mit dem Live-Projekt und dem Beispiel ColorGentlemen zeigen', owner: ME_ID, assign: 'Meilenstein Termin 04.12.', due: '2026-12-04', state: 'open' },
      { id: 'es-ma2', code: 'M-2', title: 'Prüfliste abarbeiten', activity: 'Prüflisten aus den Übergaben V77 bis heute durchgehen, Fehler als Meldungen erfassen', owner: ME_ID, assign: 'Testphase', due: '2026-12-07', state: 'open', note: 'Prüfdateien (F9) erst ab 07.12.' },
      { id: 'es-ma3', code: 'M-3', title: 'Entscheidung F-236 Farben und Layout-Generator', activity: 'Entscheidungs-Doc beantworten', owner: ME_ID, assign: 'F-236', state: 'open' },
      { id: 'es-ma4', code: 'M-4', title: 'Fragen P11–P14 zu F-232 beantworten', activity: 'Offene Fragen im Entscheidungs-Doc „Dokumente wie auf Papier“', owner: ME_ID, assign: 'F-232', state: 'open' },
    ],
    annexes: [
      { id: 'es-an1', code: 'Anlage 1', title: 'Lastenheft E-Sources', place: 'docs/Lastenheft/Lastenheft_E-Sources.md' },
      { id: 'es-an2', code: 'Anlage 2', title: 'Benutzerhandbuch', place: 'docs/Handbuch/E-Sources_Handbuch.md' },
      { id: 'es-an3', code: 'Anlage 3', title: 'Änderungsverzeichnis (Kapitel 13)', form: 'changes' },
      { id: 'es-an4', code: 'Anlage 4', title: 'Entscheidungs-Docs', place: 'docs/Arbeitspakete (PDF je Entscheidung)' },
      { id: 'es-an5', code: 'Anlage 5', title: 'Übergaben je Chat', place: 'docs/uebergaben' },
    ],
  };
}

/** Live-Projekt anlegen bzw. aktualisieren (L4: nur Claudes Teile werden ersetzt). */
export function refreshLiveProject(ws: Workspace, now = Date.now()): Workspace {
  let next = ensureMe(ws);
  const old = (next.projects ?? []).find((p) => p.id === LIVE_PROJECT);
  const project = liveProject(now, old);
  next = { ...next, projects: [...(next.projects ?? []).filter((p) => p.id !== LIVE_PROJECT), project], notes: notesOf(next).filter((n) => !n.id.startsWith(NOTE_PREFIX)) };
  const groups = [...new Set(LIVE_ITEMS.map((i) => i.group))];
  const ms: [string, string, string][] = [
    ['ms1', 'Termin: Stand vorgestellt', '2026-12-04'],
    ['ms2', 'Testphase beginnt', '2026-12-07'],
  ];
  for (const [id, title, day] of ms) next = createNote(next, { title: '', text: headText(title), project: LIVE_PROJECT, milestone: true, due: day, notBefore: day, phase: id === 'ms1' ? 'es-ph1' : 'es-ph2' }, { id: `${NOTE_PREFIX}${id}`, now }).ws;
  for (const g of groups) {
    const gid = `${NOTE_PREFIX}g-${slug(g)}`;
    next = createNote(next, { title: '', text: headText(g), project: LIVE_PROJECT, phase: 'es-ph1' }, { id: gid, now }).ws;
    for (const it of LIVE_ITEMS.filter((i) => i.group === g)) {
      const init: Partial<Note> = {
        title: '',
        text: `${headText(`${it.f} ${it.title}`)}\n\nAus dem Lastenheft (Stand ${LIVE_STAND.chat}): ${it.state === 'done' ? 'fertig' : it.state === 'part' ? 'teilweise gebaut' : 'offen'}.`,
        project: LIVE_PROJECT,
        parent: gid,
        assignee: ME_ID,
        phase: it.state === 'open' ? 'es-ph2' : 'es-ph1',
        effort: { plan: it.chats * H_PER_CHAT, ...(it.state !== 'open' ? { actual: it.chats * H_PER_CHAT } : {}) },
        ...(it.state === 'done' ? { state: 'done' as const } : it.state === 'part' ? { state: 'doing' as const } : {}),
        // F-234 (V137): Eisenhower – laufende Punkte wichtig und dringend, offene wichtig (planen)
        ...(it.state === 'part' ? { important: true, urgent: true } : it.state === 'open' ? { important: true } : {}),
      };
      next = createNote(next, init, { id: `${NOTE_PREFIX}${it.f.toLowerCase()}`, now }).ws;
    }
  }
  // L7 (V136): je Änderung ein genehmigter Änderungsantrag (Kapitel 13) mit Datum, Anlass und Auswirkung
  const title = (f: string) => LIVE_ITEMS.find((i) => i.f === f)?.title ?? f;
  for (const ch of LIVE_CHANGES) {
    const days = Math.max(1, Math.round(ch.hours / 8));
    const list = ch.fs.map((f) => `• ${f} ${title(f)}`).join('\n');
    const init: Partial<Note> = {
      title: '',
      text: `${headText(`Ä-${ch.no} ${ch.title}`)}\n\n${ch.why}\n\nDazugekommen:\n${list}`,
      project: LIVE_PROJECT,
      type: 'change',
      change: {
        no: ch.no,
        why: ch.why,
        days,
        scope: `${ch.fs.length === 1 ? '1 Anforderung' : `${ch.fs.length} Anforderungen`} (${ch.fs.join(', ')}) im Abschnitt „${ch.group}“ zusätzlich zum Basisplan; ${ch.done} davon fertig.`,
        perf: `Mehraufwand ${ch.hours} h (${ch.hours / H_PER_CHAT} ${ch.hours / H_PER_CHAT === 1 ? 'Chat' : 'Chats'}); Termin: +${days} AT, aufgefangen in der Phase Aufbau bis zum 04.12.2026.`,
        by: ME_ID,
        decider: 'client',
        state: 'approved',
        decided: { at: `${ch.day}T12:00:00.000Z`, text: 'Von Enrico im Lastenheft freigegeben.', who: ME_ID },
      },
    };
    next = createNote(next, init, { id: `${NOTE_PREFIX}c${ch.no}`, now }).ws;
  }
  return next;
}

/* ---------------------------------------------------------------------------------------------------------------
 * F-235 (V136, L2 geändert 12:13–12:16): Schreibschutz in der Online-Demo – zentral in der Verarbeitung. Jede Aktion,
 * die das Live-Projekt (`pj-es`), seine Notizen (`es-n-…` oder am Projekt), Meldungen oder Entscheidungen daran
 * ändert, wird im Reducer abgewiesen: der alte Stand dieser Teile bleibt, alles andere der Aktion gilt. Beim
 * Entwickeln (`npm run dev`) ist der Schutz aus; `main.tsx` schaltet ihn in der gebauten Fassung ein.
 * --------------------------------------------------------------------------------------------------------------- */
let lock = false;
/** In der gebauten Fassung (Online-Demo) einschalten. */
export const setLiveLock = (on: boolean): void => void (lock = on);
export const liveLocked = (): boolean => lock;
/** Gehört die Notiz zum Live-Projekt? */
export const isLiveNote = (n: Note): boolean => n.id.startsWith(NOTE_PREFIX) || n.project === LIVE_PROJECT;
/** Zeitpunkt der letzten abgewiesenen Änderung – für den Hinweis am Ort. */
let blockedAt = 0;
export const liveBlockedAt = (): number => blockedAt;

/** Ändert `next` gegenüber `prev` etwas am Live-Projekt? */
export function liveChanged(prev: Workspace, next: Workspace): boolean {
  if (prev === next) return false;
  const pp = (prev.projects ?? []).find((p) => p.id === LIVE_PROJECT);
  if (!pp) return false;
  if ((next.projects ?? []).find((p) => p.id === LIVE_PROJECT) !== pp) return true;
  if (prev.notes !== next.notes) {
    const before = new Map(notesOf(prev).filter(isLiveNote).map((n) => [n.id, n]));
    let seen = 0;
    for (const n of notesOf(next)) {
      const o = before.get(n.id);
      if (o) {
        if (o !== n) return true;
        seen++;
      } else if (isLiveNote(n)) return true;
    }
    if (seen !== before.size) return true;
  }
  const same = <T,>(a: T[] | undefined, b: T[] | undefined, mine: (x: T) => boolean) => {
    if (a === b) return true;
    const x = (a ?? []).filter(mine), y = (b ?? []).filter(mine);
    return x.length === y.length && x.every((v, i) => v === y[i]);
  };
  return !same(prev.feedback, next.feedback, (f) => f.project === LIVE_PROJECT) || !same(prev.decisions, next.decisions, (d) => d.projectId === LIVE_PROJECT);
}

/** Abweisen: die Teile des Live-Projekts aus `prev` zurücklegen, der Rest von `next` bleibt. */
export function keepLive(prev: Workspace, next: Workspace): Workspace {
  if (!lock || !liveChanged(prev, next)) return next;
  blockedAt = Date.now();
  const pp = (prev.projects ?? []).find((p) => p.id === LIVE_PROJECT)!;
  const projects = (next.projects ?? []).filter((p) => p.id !== LIVE_PROJECT);
  const at = Math.min((prev.projects ?? []).findIndex((p) => p.id === LIVE_PROJECT), projects.length);
  projects.splice(at, 0, pp);
  const before = new Map(notesOf(prev).filter(isLiveNote).map((n) => [n.id, n]));
  const notes: Note[] = [];
  for (const n of notesOf(next)) {
    const o = before.get(n.id);
    if (o) notes.push(o), before.delete(n.id);
    else if (!isLiveNote(n)) notes.push(n);
  }
  notes.push(...before.values());
  const back = <T,>(a: T[] | undefined, b: T[] | undefined, mine: (x: T) => boolean): T[] | undefined => (a === b ? b : [...(b ?? []).filter((x) => !mine(x)), ...(a ?? []).filter(mine)]);
  return {
    ...next,
    projects,
    notes,
    feedback: back(prev.feedback, next.feedback, (f) => f.project === LIVE_PROJECT),
    decisions: back(prev.decisions, next.decisions, (d) => d.projectId === LIVE_PROJECT),
  };
}

/** Id der nächsten Kopie (pj-esk1, pj-esk2 …). */
export function liveCopyId(ws: Workspace): string {
  let k = 1;
  while ((ws.projects ?? []).some((p) => p.id === `pj-esk${k}`)) k++;
  return `pj-esk${k}`;
}

/** Besucher der Demo: eigene, bearbeitbare Kopie des Live-Projekts (neue Ids, Bezüge umgestellt). */
export function copyLiveProject(ws: Workspace, now = Date.now()): { ws: Workspace; id?: string } {
  const src = (ws.projects ?? []).find((p) => p.id === LIVE_PROJECT);
  if (!src) return { ws };
  const id = liveCopyId(ws);
  const k = Number(id.slice(6));
  const ids = new Map<string, string>();
  for (const n of notesOf(ws)) if (n.project === LIVE_PROJECT) ids.set(n.id, `esk${k}-${n.id.replace(NOTE_PREFIX, '')}`);
  const map = (x: string) => ids.get(x) ?? x;
  const notes = notesOf(ws).filter((n) => n.project === LIVE_PROJECT).map((n): Note => ({
    ...n,
    id: map(n.id),
    project: id,
    ...(n.parent ? { parent: map(n.parent) } : {}),
    ...(n.after ? { after: n.after.map((l) => ({ ...l, id: map(l.id) })) } : {}),
  }));
  const project: Project = {
    ...src,
    id,
    name: k === 1 ? `${src.name} (Kopie)` : `${src.name} (Kopie ${k})`,
    ...(src.order ? { order: Object.fromEntries(Object.entries(src.order).map(([key, v]) => [key ? map(key) : key, v.map(map)])) } : {}),
    ...(src.baseline ? { baseline: { ...src.baseline, tasks: Object.fromEntries(Object.entries(src.baseline.tasks).map(([key, v]) => [map(key), v])) } } : {}),
    ...(src.charter?.fixed ? { charter: { ...src.charter, fixed: src.charter.fixed.map(map) } } : {}),
    created: now,
    changed: now,
  };
  return { ws: { ...ws, projects: [...(ws.projects ?? []), project], notes: [...notesOf(ws), ...notes] }, id };
}
