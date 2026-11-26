/**
 * V122 (F-231 K7, Entscheidung T5): Kommentare wie bei Trello – als Eintrag der Spur der Art „comment“ (ein Verlauf,
 * filterbar: nur Kommentare oder „Alles“ = Spur und Kommentare zusammen). Autor = Profilname, Zeit, bearbeiten,
 * löschen (Rückgängig am Ort beim Aufrufer), @Person erwähnt eine Person aus der Personenliste.
 * Trello-Kommentare (commentCard) gehen darin auf und beim Export zurück (`ref` = Id der Trello-Aktion).
 */
import type { Note, NoteEvent, Person, Workspace } from './types';
import { COMMENTS_MAX, noteById, trimTrail } from './notes';
import { newId } from './workspace';

export const COMMENT_MAX = 5000;
export { COMMENTS_MAX };

export const commentsOf = (n: Pick<Note, 'trail'> | undefined): NoteEvent[] => (n?.trail ?? []).filter((e) => e.what === 'comment');

function withNote(ws: Workspace, id: string, fn: (n: Note) => Note): Workspace {
  let hit = false;
  const notes = (ws.notes ?? []).map((n) => (n.id === id ? ((hit = true), fn(n)) : n));
  return hit ? { ...ws, notes } : ws;
}

/** Kommentar anlegen; leerer Text ändert nichts. */
export function addComment(ws: Workspace, noteId: string, text: string, act: { by?: string; now?: number; cid?: string; ref?: string } = {}): { ws: Workspace; cid: string } | null {
  const t = text.trim().slice(0, COMMENT_MAX);
  if (!t || !noteById(ws, noteId)) return null;
  const cid = act.cid ?? newId();
  const at = act.now ?? Date.now();
  const ev: NoteEvent = { at, what: 'comment', id: cid, text: t, ...(act.by ? { by: act.by } : {}), ...(act.ref ? { ref: act.ref } : {}) };
  return { ws: withNote(ws, noteId, (n) => ({ ...n, trail: trimTrail([...n.trail, ev]), changed: at })), cid };
}

/** Kommentar ändern (Zeitpunkt bleibt, `edited` = jetzt); leerer Text = unverändert. */
export function editComment(ws: Workspace, noteId: string, cid: string, text: string, now = Date.now()): Workspace {
  const t = text.trim().slice(0, COMMENT_MAX);
  if (!t) return ws;
  return withNote(ws, noteId, (n) => ({
    ...n,
    trail: n.trail.map((e) => (e.what === 'comment' && e.id === cid && e.text !== t ? { ...e, text: t, edited: now } : e)),
  }));
}

/** Kommentar löschen. */
export function deleteComment(ws: Workspace, noteId: string, cid: string): Workspace {
  return withNote(ws, noteId, (n) => ({ ...n, trail: n.trail.filter((e) => !(e.what === 'comment' && e.id === cid)) }));
}

/** Kommentar wieder einsetzen (Rückgängig nach Löschen) – an seiner Stelle in der Zeitfolge. */
export function putComment(ws: Workspace, noteId: string, ev: NoteEvent): Workspace {
  if (ev.what !== 'comment' || !ev.id) return ws;
  return withNote(ws, noteId, (n) => (n.trail.some((e) => e.id === ev.id) ? n : { ...n, trail: trimTrail([...n.trail, ev].sort((a, b) => a.at - b.at)) }));
}

/** Teile eines Kommentars: Text und erwähnte Personen (@Name, längster Name zuerst, Groß/Klein egal). */
export function splitMentions(ws: Workspace, text: string): { text: string; person?: Person }[] {
  const persons = [...(ws.persons ?? [])].filter((p) => p.name.trim()).sort((a, b) => b.name.length - a.name.length);
  const out: { text: string; person?: Person }[] = [];
  let buf = '';
  let i = 0;
  while (i < text.length) {
    if (text[i] === '@' && (i === 0 || /\s|[(,;]/.test(text[i - 1]))) {
      const rest = text.slice(i + 1).toLocaleLowerCase('de');
      const p = persons.find((x) => rest.startsWith(x.name.toLocaleLowerCase('de')) && !/[\p{L}\p{N}]/u.test(rest[x.name.length] ?? ''));
      if (p) {
        if (buf) out.push({ text: buf });
        buf = '';
        out.push({ text: text.slice(i, i + 1 + p.name.length), person: p });
        i += 1 + p.name.length;
        continue;
      }
    }
    buf += text[i++];
  }
  if (buf) out.push({ text: buf });
  return out;
}

/** Erwähnte Personen (ohne Doppelte). */
export const mentionsIn = (ws: Workspace, text: string): Person[] => [...new Map(splitMentions(ws, text).flatMap((x) => (x.person ? [[x.person.id, x.person] as const] : []))).values()];

/** Verlauf zum Anzeigen, neueste zuerst: nur Kommentare oder alles (Spur und Kommentare). */
export const activityOf = (n: Pick<Note, 'trail'> | undefined, all: boolean): NoteEvent[] => [...(all ? (n?.trail ?? []) : commentsOf(n))].reverse();
