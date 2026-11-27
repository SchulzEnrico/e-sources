/**
 * V127 (F-231 K9): Spiegelkarten – Kennzeichen auf der Karte, Leiste „Spiegeln auf …“ (Taste M) und Abschnitt
 * „Spiegel“ im Kartenfenster (wo die Karte zuhause ist, wo sie gespiegelt liegt; entfernen, Heimat wechseln, hinspringen).
 */
import { type Dispatch, type KeyboardEvent, useEffect, useRef, useState } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { Note, NoteView, Workspace } from '../workspace/types';
import * as No from '../workspace/notes';
import * as Mi from '../workspace/mirrors';
import { DIALOG_TEXT, MIRROR_TEXT as M, NOTE_TEXT, PAUSE_TEXT } from '../workspace/terms';
import { newId } from '../workspace/workspace';
import { StarMark } from './StarMark';
import { Icon } from './Icon';
import type { Notice } from './NoteTab';

const titleOf = (n: Note) => No.titleOf(No.shownNote(n)) || NOTE_TEXT.untitled;

/** Kennzeichen „Spiegel“ vorn auf der Karte (nur im Spiegel-Board). */
export function MirrorSign({ ws, v, n }: { ws: Workspace; v: NoteView; n: Note }) {
  if (!Mi.isMirror(ws, v, n.id)) return null;
  const h = Mi.homeOf(ws, n.id);
  return (
    <span className="sign kcard__mirror" title={M.badgeHint(h?.view.name ?? '', h?.col?.name ?? '')}>
      <Icon name="mirror" size={10} /> {M.badge}
    </span>
  );
}

/** Für die Ansage der Karte: „, Spiegel von Board …“. */
export const mirrorLabel = (ws: Workspace, v: NoteView, id: string): string => (Mi.isMirror(ws, v, id) ? M.label(Mi.homeOf(ws, id)?.view.name ?? '') : '');

/** Leiste am Ort „„Titel“ spiegeln auf …“ – wie „Verschieben nach …“ (V); Rückgängig in der Meldung. */
export function MirrorBar(props: { ws: Workspace; dispatch: Dispatch<Action>; sheetId: string; noteId: string; say: (t: string) => void; notice: (m: Notice) => void; onClose: () => void }) {
  const { ws, dispatch, sheetId, noteId, say } = props;
  const n = No.noteById(ws, noteId);
  const targets = Mi.mirrorTargets(ws, sheetId, noteId);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.querySelector<HTMLElement>('button')?.focus();
    if (!targets.length) say(M.none);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!n) return null;
  const t = titleOf(n);
  const by = ws.profile?.name || undefined;
  const pick = (to: NoteView) => {
    dispatch({ type: 'cardMirror', note: noteId, to: to.id, by });
    const text = M.mirrored(t, to.name);
    say(text);
    props.notice({ text, undo: () => dispatch({ type: 'cardUnmirror', view: to.id, note: noteId, by }) });
    props.onClose();
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const btns = [...(box.current?.querySelectorAll<HTMLElement>('button') ?? [])];
    const i = btns.indexOf(document.activeElement as HTMLElement);
    let j = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = Math.min(btns.length - 1, i + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = Math.max(0, i - 1);
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = btns.length - 1;
    else if (e.key === 'Escape') return void (e.preventDefault(), e.stopPropagation(), props.onClose());
    if (j < 0) return;
    e.preventDefault();
    e.stopPropagation();
    btns[j]?.focus();
  };
  return (
    <div className="sheet__move" role="group" aria-label={M.mirrorTo(t)} title={M.mirrorHint} ref={box} onKeyDown={key}>
      <span className="sheet__move-cap">
        <Icon name="mirror" size={12} className="icon icon--inline" /> {M.mirrorTo(t)}
      </span>
      {targets.length ? (
        targets.map((x) => (
          <button key={x.id} type="button" className="help__run" onClick={() => pick(x)}>
            <Icon name="kanban" size={12} className="icon icon--inline" /> {x.name}
            <StarMark on={x.star} />
          </button>
        ))
      ) : (
        <span className="lc__muted">{M.none}</span>
      )}
      <button type="button" className="help__run" onClick={props.onClose}>
        {DIALOG_TEXT.cancel}
      </button>
    </div>
  );
}

/** Abschnitt „Spiegel“ im Kartenfenster eines Kanban-Boards. */
export function CardMirrors(props: { ws: Workspace; dispatch: Dispatch<Action>; noteId: string; sheetId: string; desk?: string; say: (t: string) => void; onMirror?: () => void; onUnmirrorHere?: () => void; onClose: () => void }) {
  const { ws, dispatch, noteId, sheetId, say } = props;
  const [msg, setMsg] = useState<{ text: string; undo?: () => void } | null>(null);
  const n = No.noteById(ws, noteId);
  const v = No.viewById(ws, sheetId);
  if (!n || !v || v.kind !== 'kanban') return null;
  const by = ws.profile?.name || undefined;
  const t = titleOf(n);
  const mirror = Mi.isMirror(ws, v, noteId);
  const home = Mi.homeOf(ws, noteId);
  const others = Mi.mirrorBoardsOf(ws, noteId).filter((x) => x.id !== sheetId);
  const canMirror = Mi.mirrorTargets(ws, sheetId, noteId).length > 0 && !!home;
  const tell = (text: string, undo?: () => void) => (setMsg({ text, ...(undo ? { undo: () => (setMsg(null), undo()) } : {}) }), say(text));
  const go = (board: string) => {
    if (props.desk === undefined) return;
    props.onClose();
    dispatch({ type: 'padOpen', desk: props.desk, ref: { view: board }, ids: [newId(), newId(), newId()] });
  };
  const removeOn = (b: NoteView) => {
    const col = (b.cols ?? []).find((c) => c.ids.includes(noteId));
    dispatch({ type: 'cardUnmirror', view: b.id, note: noteId, by });
    tell(M.removed(t, b.name), () => dispatch({ type: 'cardMirror', note: noteId, to: b.id, col: col?.id, by }));
  };
  return (
    <div className="cardwin__tags cardwin__mirrors" role="group" aria-label={`${M.head}: ${t}`}>
      <p className="cardwin__checkhead" title={M.mirrorHint}>
        <Icon name="mirror" size={12} /> <strong>{M.head}</strong>
      </p>
      <p className="kmir__line">{mirror && home ? M.homeIs(home.view.name, home.col?.name ?? '') : M.homeHere}</p>
      <div className="kmir__acts">
        {mirror && home && props.desk !== undefined && (
          <button type="button" className="note__undo" onClick={() => go(home.view.id)}>
            <Icon name="kanban" size={11} /> {M.toHome}
          </button>
        )}
        {mirror && (
          <button
            type="button"
            className="note__undo"
            title={M.makeHomeHint}
            onClick={() => {
              const was = home?.view.id;
              dispatch({ type: 'cardMakeHome', view: sheetId, note: noteId });
              tell(M.madeHome(v.name), was ? () => dispatch({ type: 'cardMakeHome', view: was, note: noteId }) : undefined);
            }}
          >
            <Icon name="check" size={11} /> {M.makeHome}
          </button>
        )}
        {mirror && (
          <button type="button" className="note__undo" title={M.removeHint} onClick={() => (props.onUnmirrorHere ? props.onUnmirrorHere() : removeOn(v))}>
            <Icon name="close" size={11} /> {M.remove}
          </button>
        )}
        {canMirror && props.onMirror && (
          <button type="button" className="note__undo" title={M.mirrorHint} onClick={props.onMirror}>
            <Icon name="mirror" size={11} /> {M.btn}
          </button>
        )}
      </div>
      {others.length > 0 && (
        <>
          <p className="kmir__line">{M.onBoards(others.length)}</p>
          <ul className="kmir__list">
            {others.map((b) => (
              <li key={b.id}>
                <span>
                  <Icon name="kanban" size={11} /> {b.name}
                </span>
                {props.desk !== undefined && (
                  <button type="button" className="note__undo" onClick={() => go(b.id)}>
                    {M.toBoard(b.name)}
                  </button>
                )}
                <button type="button" className="note__undo" title={M.removeHint} onClick={() => removeOn(b)}>
                  {M.removeOn(b.name)}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {msg && (
        <p className="sheet__msg" role="status">
          {msg.text}
          {msg.undo && (
            <button type="button" className="note__undo" onClick={msg.undo}>
              {PAUSE_TEXT.undo}
            </button>
          )}
        </p>
      )}
    </div>
  );
}
