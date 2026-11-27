/**
 * V141 (F-231 K14, Entscheidungs-Doc „V140 – K14 Eingang“, Vorschlag A, I1–I9): Eingang wie Trello „Inbox“.
 *
 * Ein festes To-do-Sheet mit der Kennung `inbox` je Arbeitsfläche: es gibt es immer genau einmal (I2),
 * umbenennbar, nicht löschbar, Stern ab Werk. Schnell Erfasstes landet hier – Gedankenparkplatz F-106
 * (Alt/⌥+E), Dock-Notiz (Knopf im Pad) und „Neue Notiz“ im Portal (zusätzlich zum Tab), I3. Taste V
 * sortiert ein (verschiebt, kopiert nicht): andere Sheets, eigene Eisenhower-Matrizen und Projekte (I5).
 */
import type { Note, NoteView, Workspace } from './types';
import * as No from './notes';
import { setNoteProject } from './projects';

export const INBOX_ID = 'inbox';
export const INBOX_NAME = 'Eingang';

export const isInbox = (v: Pick<NoteView, 'id'> | string | undefined | null): boolean => (typeof v === 'string' ? v : v?.id) === INBOX_ID;

export const inboxOf = (ws: Workspace): NoteView | undefined => No.viewById(ws, INBOX_ID);

const open = (n: Note | undefined) => !!n && !n.unsaved && n.state !== 'done' && n.state !== 'archived' && n.state !== 'review';

/** I2: Eingang anlegen, falls er fehlt (beim Laden, nach Abgleich und Import) – vorn in der Liste, mit Stern. Sonst unverändert. */
export function ensureInbox(ws: Workspace): Workspace {
  const views = No.viewsOf(ws);
  const have = views.find((v) => v.id === INBOX_ID);
  if (have) return have.kind === 'todo' ? ws : { ...ws, noteViews: views.map((v) => (v.id === INBOX_ID ? { ...v, kind: 'todo', cols: undefined } : v)) };
  const v: NoteView = { id: INBOX_ID, kind: 'todo', name: INBOX_NAME, ids: [], star: true };
  return { ...ws, noteViews: [v, ...views] };
}

/** I6: offene Einträge im Eingang (Erledigte zählen nicht mehr mit, I8). */
export function inboxCount(ws: Workspace): number {
  const v = inboxOf(ws);
  if (!v) return 0;
  return v.ids.filter((id) => open(No.noteById(ws, id))).length;
}

/** Notiz zusätzlich in den Eingang legen (bleibt, wo sie ist – z. B. im Tab). */
export function toInbox(ws: Workspace, noteId: string, act: No.Act = {}): Workspace {
  const base = ensureInbox(ws);
  const r = No.placeNote(base, noteId, { view: INBOX_ID }, act);
  return r.ok ? r.ws : base;
}

/**
 * F-106 Gedankenparkplatz: Text als neue Notiz in den Eingang. Erste Zeile = Titel, der Rest = Text.
 * Gibt null zurück, wenn nichts eingegeben wurde.
 */
export function captureToInbox(ws: Workspace, text: string, act: No.Act & { id?: string } = {}): { ws: Workspace; id: string } | null {
  const lines = text.replace(/\r/g, '').split('\n');
  const title = (lines.shift() ?? '').trim();
  const rest = lines.join('\n').trim();
  if (!title && !rest) return null;
  const made = No.createNote(ensureInbox(ws), { title: (title || rest.split('\n')[0]).slice(0, 200), text: title ? rest : rest.split('\n').slice(1).join('\n') }, { ...act, via: 'quick' });
  return { ws: toInbox(made.ws, made.id, act), id: made.id };
}

/** I5: aus dem Eingang ins Projekt – Notiz wird Vorgang des Projekts und verlässt den Eingang. */
export function inboxToProject(ws: Workspace, noteId: string, pid: string, act: No.Act = {}): Workspace {
  if (!(ws.projects ?? []).some((p) => p.id === pid) || !No.noteById(ws, noteId)) return ws;
  return No.removeFromView(setNoteProject(ws, noteId, pid), noteId, INBOX_ID, act);
}

/** Rückgängig zu `inboxToProject`: Projekt wie vorher, wieder in den Eingang. */
export function undoInboxToProject(ws: Workspace, noteId: string, project: string | undefined, act: No.Act = {}): Workspace {
  return toInbox(setNoteProject(ws, noteId, project), noteId, act);
}

/** I5: Projekte als Ziel für V im Eingang (offene, nicht abgeschlossene zuerst nach Name). */
export function inboxProjects(ws: Workspace): { id: string; name: string }[] {
  return (ws.projects ?? [])
    .filter((p) => p.state !== 'done' && p.state !== 'stopped' && !p.id.startsWith('pj-es'))
    .map((p) => ({ id: p.id, name: p.name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));
}
