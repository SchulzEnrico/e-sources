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
import { LIVE_ITEMS, LIVE_STAND, type LiveItem } from './liveProjectData';

export const LIVE_PROJECT = 'pj-es';
const NOTE_PREFIX = 'es-n-';
const H_PER_CHAT = 2;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9äöüß]+/g, '-').replace(/^-|-$/g, '');

export const hasLiveProject = (ws: Workspace): boolean => (ws.projects ?? []).some((p) => p.id === LIVE_PROJECT);

/** Zahlen für Meldung und Statusbericht. */
export function liveCounts(items: readonly LiveItem[] = LIVE_ITEMS) {
  const done = items.filter((i) => i.state === 'done').length;
  const part = items.filter((i) => i.state === 'part').length;
  return { all: items.length, done, part, open: items.length - done - part, chats: items.reduce((a, i) => a + i.chats, 0) };
}

function liveProject(now: number, old?: Project): Project {
  const c = liveCounts();
  return {
    ...(old ?? {}),
    id: LIVE_PROJECT,
    name: 'E-Sources',
    psp: { prefix: 'ES-1.', style: 'num' },
    brief: {
      goal: 'Arbeitsfläche für Lesezeichen, Notizen und Projekte nach IPMA ICB4 – vom Lastenheft bis zur Testphase',
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
      success: 'Alle F-Punkte des Lastenhefts gebaut und von Enrico geprüft; Online-Demo zeigt den Stand.',
      reporting: `Statusbericht je Chat (zuletzt ${LIVE_STAND.chat}${LIVE_STAND.day ? `, ${LIVE_STAND.day.split('-').reverse().join('.')}` : ''}): ${c.done} fertig · ${c.part} teilweise · ${c.open} offen von ${c.all} F-Punkten.`,
      model: 'hybrid',
      main: '• Arbeitsfläche mit Desks, Slots und Portalen\n• Notizen, To-do, Kanban und Eisenhower\n• Projekt-Modus mit Formularen und Blättern wie im ICB4-Report\n• Abgleich zwischen Geräten',
    },
    goals: [
      { id: 'es-g1', code: 'L1', text: 'Funktionen laut Lastenheft gebaut', measure: `${c.done} von ${c.all} F-Punkten fertig`, kind: 'perf', level: 'must', owner: ME_ID },
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
    priority: 1,
    state: 'running',
    created: old?.created ?? now,
    changed: now,
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
      };
      next = createNote(next, init, { id: `${NOTE_PREFIX}${it.f.toLowerCase()}`, now }).ws;
    }
  }
  return next;
}
