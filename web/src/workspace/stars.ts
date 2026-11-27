/**
 * V128 (F-231 K12): Stern für Sheets – wie Trello „Board markieren“ (Starred Boards).
 * Ein Sheet mit Stern steht im Menü „+ Sheet“ › „Mit Stern …“ zum schnellen Öffnen und in allen Ziel-Listen
 * (Verschieben, Kopieren, Spiegeln) vorn. Gilt für alle Arten (NF-08 „weitestgehend gleicher Aufbau“),
 * gespeichert am Sheet (`NoteView.star`) und abgeglichen.
 */
import type { NoteView, Workspace } from './types';
import { updateView, viewById, viewsOf } from './notes';
import { addSheet, createPad, padById, padWith, raisePad, showSheet } from './pads';

export const isStarred = (v: Pick<NoteView, 'star'> | undefined) => !!v?.star;

/** Stern setzen bzw. entfernen (unbekanntes Sheet → unverändert). */
export const setStar = (ws: Workspace, id: string, on: boolean): Workspace => updateView(ws, id, { star: on });

const byName = (a: NoteView, b: NoteView) => a.name.localeCompare(b.name, 'de', { sensitivity: 'base' });

/** Sheets mit Stern, nach Namen geordnet; `except` = Ids, die nicht gezeigt werden (z. B. schon in diesem Pad). */
export function starredViews(ws: Workspace, except: readonly string[] = []): NoteView[] {
  return viewsOf(ws)
    .filter((v) => v.star && !except.includes(v.id))
    .sort(byName);
}

/** Sterne zuerst, sonst die bisherige Reihenfolge (stabil). */
export function starFirst<T extends Pick<NoteView, 'star'>>(list: readonly T[]): T[] {
  return [...list.filter((v) => v.star), ...list.filter((v) => !v.star)];
}

export type StarOpen = { result: 'shown' | 'opened' | 'full'; ws: Workspace; pad: string } | { result: 'missing'; ws: Workspace };

/**
 * „+ Sheet“ › „Mit Stern …“: Sheet in diesem Pad öffnen. Ist es schon in einem anderen Pad offen, wird dort
 * hingewechselt (ein Sheet liegt höchstens in einem Pad). Ist das Pad voll, entsteht ein neues Pad daneben.
 */
export function openStarred(ws: Workspace, padId: string, sheetId: string, makeId: () => string): StarOpen {
  const pad = padById(ws, padId);
  if (!pad || !viewById(ws, sheetId)) return { result: 'missing', ws };
  const there = padWith(ws, sheetId);
  if (there) return { result: 'shown', ws: raisePad(showSheet(ws, there.id, sheetId), there.id), pad: there.id };
  const r = addSheet(ws, padId, sheetId);
  if (r.ok) return { result: 'opened', ws: raisePad(r.ws, padId), pad: padId };
  const c = createPad(ws, pad.desk, [sheetId], { id: makeId() });
  return { result: 'full', ws: c.ws, pad: c.id };
}
