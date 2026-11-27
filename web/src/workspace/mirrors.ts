/**
 * V127 (F-231 K9, T7): Spiegelkarten – wie Trello „Mirror card“.
 *
 * Eine Spiegelkarte ist dieselbe Notiz zusätzlich auf einem anderen Kanban-Board. Das Board, auf dem sie zuerst lag,
 * ist ihr Heimat-Board: Dort bestimmt die Spalte den Zustand („erledigt“, „in Arbeit“ …). Auf den anderen Boards
 * trägt die Karte das Kennzeichen „Spiegel“; ihre Spalte dort ist nur Anordnung (Ziehen ändert den Zustand nicht),
 * der Erledigt-Kreis ist wie in To-do-Listen gesperrt (Schloss-Regel A3) und führt zum Heimat-Board.
 * Alles andere (Titel, Text, Termine, Tags, Checklisten, Kommentare …) ist ohnehin dieselbe Notiz.
 *
 * Gespeichert wird je Board die Liste der Spiegel (`NoteView.mirrors`). Ob eine Karte wirklich ein Spiegel ist,
 * ergibt sich daraus, dass es noch ein Heimat-Board gibt: Verschwindet die Heimat (Board gelöscht, Karte dort
 * entfernt), wird der erste Spiegel von selbst zur Heimat – es geht nichts verloren.
 */
import type { NoteColumn, NoteView, Workspace } from './types';
import * as No from './notes';
import { starFirst } from './stars';

/** Spiegel-Markierungen eines Boards (Note-Ids). */
export const mirrorsOf = (v: NoteView): string[] => (v.kind === 'kanban' ? (v.mirrors ?? []) : []);

const onBoard = (v: NoteView, noteId: string) => v.kind === 'kanban' && No.idsIn(v).includes(noteId);

/** Heimat-Boards der Notiz: Kanbans, auf denen sie liegt und nicht als Spiegel markiert ist. */
export function homesOf(ws: Workspace, noteId: string): NoteView[] {
  return No.viewsOf(ws).filter((v) => onBoard(v, noteId) && !mirrorsOf(v).includes(noteId));
}

/** Ist die Karte auf diesem Board ein Spiegel (markiert und es gibt ein Heimat-Board)? */
export function isMirror(ws: Workspace, v: NoteView | undefined, noteId: string): boolean {
  if (!v || !mirrorsOf(v).includes(noteId) || !onBoard(v, noteId)) return false;
  return homesOf(ws, noteId).some((h) => h.id !== v.id);
}

/** Boards, auf denen die Notiz als Spiegel liegt. */
export function mirrorBoardsOf(ws: Workspace, noteId: string): NoteView[] {
  return No.viewsOf(ws).filter((v) => isMirror(ws, v, noteId));
}

/** Heimat und Spalte dort (für das Kennzeichen „Spiegel von …“). */
export function homeOf(ws: Workspace, noteId: string): { view: NoteView; col?: NoteColumn } | null {
  const view = homesOf(ws, noteId)[0];
  if (!view) return null;
  const col = [...(view.cols ?? []), ...(view.archivedCols ?? [])].find((c) => c.ids.includes(noteId));
  return { view, ...(col ? { col } : {}) };
}

/** Ziele für „Spiegeln …“: andere Kanban-Boards mit Spalten, auf denen die Notiz noch nicht liegt. */
export function mirrorTargets(ws: Workspace, from: string, noteId: string): NoteView[] {
  return starFirst(No.viewsOf(ws).filter((v) => v.id !== from && v.kind === 'kanban' && (v.cols?.length ?? 0) > 0 && !No.idsIn(v).includes(noteId)));
}

export type MirrorResult = { ok: true; ws: Workspace } | { ok: false; reason: 'missing' | 'full' | 'already' | 'noHome' };

/** Spalte für einen neuen Spiegel: erste Spalte, deren Bedeutung zum Zustand passt, sonst die erste. */
function colFor(v: NoteView, state: string, guess: (c: NoteColumn) => string): NoteColumn | undefined {
  const cols = v.cols ?? [];
  const want = state === 'done' || state === 'archived' ? 'done' : state === 'review' ? 'review' : state === 'doing' ? 'doing' : 'open';
  return cols.find((c) => guess(c) === want) ?? (want === 'review' ? cols.find((c) => guess(c) === 'done') : undefined) ?? cols[0];
}

/**
 * Spiegel anlegen: dieselbe Notiz zusätzlich auf Board `to` (Spalte `col`, sonst passend zum Zustand), markiert als
 * Spiegel. Die Notiz braucht ein Heimat-Board (sie liegt auf einem Kanban). Der Zustand der Notiz bleibt.
 */
export function mirrorCard(
  ws: Workspace,
  noteId: string,
  to: string,
  opts: No.Act & { col?: string; index?: number; colState: (c: NoteColumn) => string },
): MirrorResult {
  const n = No.noteById(ws, noteId);
  const v = No.viewById(ws, to);
  if (!n || !v || v.kind !== 'kanban' || !(v.cols ?? []).length) return { ok: false, reason: 'missing' };
  if (No.idsIn(v).includes(noteId)) return { ok: false, reason: 'already' };
  if (!homesOf(ws, noteId).length) return { ok: false, reason: 'noHome' };
  const col = (opts.col && v.cols!.find((c) => c.id === opts.col)) || colFor(v, n.state, opts.colState);
  const r = No.placeNote(ws, noteId, { view: to, col: col?.id, index: opts.index }, { ...opts, also: true });
  if (!r.ok) return r;
  return { ok: true, ws: setMark(r.ws, to, noteId, true) };
}

function setMark(ws: Workspace, viewId: string, noteId: string, on: boolean): Workspace {
  return {
    ...ws,
    noteViews: No.viewsOf(ws).map((v) => {
      if (v.id !== viewId || v.kind !== 'kanban') return v;
      const list = (v.mirrors ?? []).filter((x) => x !== noteId);
      if (on) list.push(noteId);
      const { mirrors: _m, ...rest } = v;
      void _m;
      return list.length ? { ...rest, mirrors: list } : rest;
    }),
  };
}

/** Spiegel entfernen (wie Trello „Spiegel entfernen“): nur dieses Board, die Notiz und ihre Heimat bleiben. */
export function unmirror(ws: Workspace, viewId: string, noteId: string, act: No.Act = {}): Workspace {
  const v = No.viewById(ws, viewId);
  if (!isMirror(ws, v, noteId)) return ws;
  return setMark(No.removeFromView(ws, noteId, viewId, act), viewId, noteId, false);
}

/**
 * „Hier zur Heimat machen“ (unsere Verbesserung): dieses Board bestimmt ab jetzt den Zustand, die bisherige Heimat
 * wird Spiegel. Die Notiz wandert dabei nicht; ihr Zustand bleibt, bis man sie hier verschiebt.
 */
export function makeHome(ws: Workspace, viewId: string, noteId: string): Workspace {
  const v = No.viewById(ws, viewId);
  if (!isMirror(ws, v, noteId)) return ws;
  let next = setMark(ws, viewId, noteId, false);
  for (const h of homesOf(ws, noteId)) if (h.id !== viewId) next = setMark(next, h.id, noteId, true);
  return next;
}

/** Nach Verschieben aus einem Spiegel-Board in ein anderes Kanban: dort weiter Spiegel (die Heimat bleibt). */
export function carryMark(ws: Workspace, wasMirror: boolean, to: string, noteId: string): Workspace {
  const v = No.viewById(ws, to);
  if (!wasMirror || !v || v.kind !== 'kanban' || !No.idsIn(v).includes(noteId)) return ws;
  return setMark(ws, to, noteId, true);
}

/** Beim Laden: nur Ids, die auf dem Board liegen, ohne Doppelte. */
export function cleanMirrors(raw: unknown, onBoardIds: Set<string>): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = [...new Set(raw.filter((x): x is string => typeof x === 'string' && onBoardIds.has(x)))];
  return out.length ? out : undefined;
}

// ---------- Trello (F-230): Spiegelkarte = Karte mit `cardRole: "mirror"`, Name = Adresse der Original-Karte ----------

/** Kurzkennung (shortLink) aus einer Trello-Kartenadresse, z. B. https://trello.com/c/AbCd1234/… → „AbCd1234“. */
export function trelloLinkOf(text: string): string | undefined {
  const m = /trello\.com\/c\/([A-Za-z0-9]{6,12})/.exec(text);
  return m?.[1];
}

/** Trello-Kennungen einer Notiz (aus dem Import mitgeführt): shortLink und Adresse. */
export function trelloIdsOf(n: { foreign?: { trello?: unknown } }): { link?: string; url?: string } {
  const t = n.foreign?.trello;
  if (!t || typeof t !== 'object') return {};
  const o = t as Record<string, unknown>;
  const url = typeof o.shortUrl === 'string' ? o.shortUrl : typeof o.url === 'string' ? o.url : undefined;
  const link = typeof o.shortLink === 'string' ? o.shortLink : url ? trelloLinkOf(url) : undefined;
  return { ...(link ? { link } : {}), ...(url ? { url } : {}) };
}

/** Notiz zu einer Trello-Kurzkennung (für Spiegel beim Import). */
export function noteOfTrelloLink(ws: Workspace, link: string): string | undefined {
  return (ws.notes ?? []).find((n) => trelloIdsOf(n).link === link)?.id;
}
