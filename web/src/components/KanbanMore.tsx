/**
 * V121 (F-231 K1, K3): Leisten am Kanban-Board – „Kopieren …“ (was mitkommt, wohin) und das Archiv des Boards
 * (archivierte Karten und Spalten suchen, wiederherstellen, endgültig löschen). Beide erscheinen am Ort unter dem
 * Sheet-Kopf wie „Verschieben nach …“; Meldungen mit Rückgängig an derselben Stelle. Logik in workspace/kanbanMore.ts.
 */
import { type Dispatch, type KeyboardEvent, useEffect, useRef, useState } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { NoteView, Workspace } from '../workspace/types';
import * as No from '../workspace/notes';
import * as Sh from '../workspace/sheets';
import * as KM from '../workspace/kanbanMore';
import { DIALOG_TEXT, KANBAN_MORE_TEXT as T, NOTE_TEXT, PAUSE_TEXT } from '../workspace/terms';
import { newId } from '../workspace/workspace';
import type { Notice } from './NoteTab';
import { KIND_ICON } from './SheetViews';
import { StarMark } from './StarMark';
import { Icon } from './Icon';

/** Pfeile wandern zwischen den Knöpfen einer Leiste, Esc schließt. */
function barKeys(e: KeyboardEvent<HTMLElement>, box: HTMLElement | null, close: () => void) {
  if (e.key === 'Escape') return void (e.preventDefault(), e.stopPropagation(), close());
  if ((e.target as HTMLElement).tagName === 'INPUT' && (e.target as HTMLInputElement).type !== 'checkbox') return;
  const btns = [...(box?.querySelectorAll<HTMLElement>('button:not([disabled]), input') ?? [])];
  const i = btns.indexOf(document.activeElement as HTMLElement);
  let j = -1;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = Math.min(btns.length - 1, i + 1);
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = Math.max(0, i - 1);
  if (j < 0) return;
  e.preventDefault();
  btns[j]?.focus();
}

export function CopyBar(props: { ws: Workspace; dispatch: Dispatch<Action>; sheetId: string; noteId: string; say: (t: string) => void; notice: (m: Notice) => void; onClose: (copied?: string) => void }) {
  const { ws, dispatch, sheetId, noteId, say } = props;
  const n = No.noteById(ws, noteId);
  const box = useRef<HTMLDivElement>(null);
  const t0 = n ? No.titleOf(No.shownNote(n)) || NOTE_TEXT.untitled : '';
  const [title, setTitle] = useState(t0);
  const [keep, setKeep] = useState<KM.CopyKeep>(KM.ALL_KEEP);
  const [asTpl, setAsTpl] = useState(false);
  useEffect(() => {
    box.current?.querySelector<HTMLInputElement>('input')?.select();
  }, []);
  if (!n) return null;
  const targets = Sh.moveTargets(ws, sheetId);
  const by = ws.profile?.name || undefined;
  const run = (to?: NoteView) => {
    const id = newId();
    const before = ws;
    const tt = title.trim() || t0;
    dispatch({ type: 'cardCopy', note: noteId, view: sheetId, id, to: to?.id, keep, title: tt === t0 ? undefined : tt, asTemplate: asTpl || undefined, by });
    const where = to?.name ?? Sh.colOf(No.viewById(ws, sheetId)!, noteId)?.name ?? '';
    const text = T.copied(tt, where);
    say(text);
    props.notice({ text, undo: () => dispatch({ type: 'exchange', ws: before }) });
    props.onClose(to ? undefined : id);
  };
  return (
    <div className="sheet__move kcopy" role="group" aria-label={T.copyOf(t0)} ref={box} onKeyDown={(e) => barKeys(e, box.current, () => props.onClose())}>
      <span className="sheet__move-cap">{T.copyOf(t0)}</span>
      <label className="kcopy__title">
        <span className="sr-only">{T.copyTitle}</span>
        <input value={title} aria-label={T.copyTitle} title={T.copyHereHint} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), run())} />
      </label>
      <fieldset className="kcopy__keep">
        <legend className="sr-only">{T.copyKeep}</legend>
        <span aria-hidden="true">{T.copyKeep}:</span>
        {KM.KEEP_KEYS.map((k) => (
          <label key={k}>
            <input type="checkbox" checked={keep[k]} onChange={(e) => setKeep({ ...keep, [k]: e.target.checked })} /> {T.keep[k]}
          </label>
        ))}
        <label title={T.tplHint}>
          <input type="checkbox" checked={asTpl} onChange={(e) => setAsTpl(e.target.checked)} /> {T.copyAsTpl}
        </label>
      </fieldset>
      <button type="button" className="help__run" title={T.copyHereHint} onClick={() => run()}>
        <Icon name="copy" size={12} className="icon icon--inline" /> {T.copyHere}
      </button>
      {targets.map((x) => (
        <button key={x.id} type="button" className="help__run" onClick={() => run(x)}>
          <Icon name={KIND_ICON[x.kind]} size={12} className="icon icon--inline" /> {T.copyTo(x.name)}
          <StarMark on={x.star} />
        </button>
      ))}
      <button type="button" className="help__run" onClick={() => props.onClose()}>
        {DIALOG_TEXT.cancel}
      </button>
    </div>
  );
}

export function ArchivePanel(props: { ws: Workspace; dispatch: Dispatch<Action>; sheetId: string; say: (t: string) => void; onClose: () => void }) {
  const { ws, dispatch, sheetId, say } = props;
  const v = No.viewById(ws, sheetId);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState<{ text: string; undo?: () => void } | null>(null);
  const box = useRef<HTMLElement>(null);
  useEffect(() => {
    box.current?.querySelector<HTMLInputElement>('input')?.focus();
  }, []);
  if (!v) return null;
  const all = KM.archiveOf(ws, sheetId);
  const a = KM.archiveOf(ws, sheetId, q);
  const by = ws.profile?.name || undefined;
  const tell = (text: string, undo?: () => void) => (setMsg({ text, undo }), say(text));
  const full = (v.cols ?? []).length >= No.COLUMN_MAX;
  const title = (id: string) => {
    const n = No.noteById(ws, id);
    return n ? No.titleOf(No.shownNote(n)) || NOTE_TEXT.untitled : '';
  };
  const focusNext = () => window.setTimeout(() => box.current?.querySelector<HTMLElement>('.karch__list button, input')?.focus(), 0);
  return (
    <section className="sheet__move karch" aria-label={T.archiveHead(v.name)} ref={box} onKeyDown={(e) => e.key === 'Escape' && (e.preventDefault(), e.stopPropagation(), props.onClose())}>
      <header className="karch__head">
        <span className="sheet__move-cap">
          <Icon name="archive" size={12} className="icon icon--inline" /> {T.archiveHead(v.name)}
        </span>
        <input type="search" value={q} placeholder={T.archiveSearch} aria-label={T.archiveSearch} onChange={(e) => setQ(e.target.value)} />
        <button type="button" className="help__run" onClick={props.onClose}>
          {T.close}
        </button>
      </header>
      {msg && (
        <p className="sheet__msg" role="status">
          {msg.text}
          {msg.undo && (
            <button type="button" className="note__undo" onClick={() => (msg.undo?.(), setMsg(null))}>
              {PAUSE_TEXT.undo}
            </button>
          )}
        </p>
      )}
      {!all.cards.length && !all.cols.length ? (
        <p className="lc__muted">{T.archiveEmpty}</p>
      ) : !a.cards.length && !a.cols.length ? (
        <p className="lc__muted">{T.archiveNone}</p>
      ) : (
        <div className="karch__list">
          {a.cards.length > 0 && (
            <>
              <h4 className="karch__sub">{T.archiveCards}</h4>
              <ul>
                {a.cards.map((n) => {
                  const t = title(n.id);
                  const col = Sh.colOf(v, n.id);
                  return (
                    <li key={n.id}>
                      <span className="karch__name">{t}</span>
                      {col && <span className="lc__muted"> · {col.name}</span>}
                      <button
                        type="button"
                        className="note__undo"
                        aria-label={`${T.restore}: ${t}`}
                        onClick={() => {
                          const before = ws;
                          dispatch({ type: 'cardRestore', view: sheetId, note: n.id, by });
                          tell(T.restored(t, col?.name ?? ''), () => dispatch({ type: 'exchange', ws: before }));
                          focusNext();
                        }}
                      >
                        {T.restore}
                      </button>
                      <button
                        type="button"
                        className="note__undo"
                        aria-label={`${T.deleteForever}: ${t}`}
                        onClick={() => {
                          const r = No.deleteNote(ws, n.id, { keepChildren: true });
                          if (!r) return;
                          dispatch({ type: 'noteDelete', id: n.id, keepChildren: true });
                          tell(T.deleted(t), () => dispatch({ type: 'noteRestore', undo: r.undo, by }));
                          focusNext();
                        }}
                      >
                        {T.deleteForever}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          {a.cols.length > 0 && (
            <>
              <h4 className="karch__sub">{T.archiveCols}</h4>
              <ul>
                {a.cols.map(({ col, cards }) => (
                  <li key={col.id}>
                    <span className="karch__name">{col.name}</span>
                    <span className="lc__muted"> · {T.colCards(cards)}</span>
                    <button
                      type="button"
                      className="note__undo"
                      disabled={full}
                      title={full ? T.colRestoreFull(No.COLUMN_MAX) : undefined}
                      aria-label={`${T.restore}: ${col.name}`}
                      onClick={() => {
                        const before = v;
                        dispatch({ type: 'colRestore', view: sheetId, col: col.id });
                        tell(T.colRestored(col.name), () => dispatch({ type: 'sheetRestore', view: before }));
                        focusNext();
                      }}
                    >
                      {T.restore}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}
