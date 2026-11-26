/**
 * V122 (F-231 K7, T5): Kommentare und Aktivität im Kartenfenster – wie Trello. Ein Kommentar ist ein Eintrag der Spur
 * (Autor = Profilname, Zeit, „bearbeitet“); Rad „Zeigen“: Kommentare | Alles (Spur und Kommentare zusammen).
 * @Name erwähnt eine Person (hervorgehoben, „erwähnt: …“). Bearbeiten und Löschen mit Rückgängig am Ort.
 * Tastatur: Strg/⌘+Enter speichert, Esc bricht das Bearbeiten ab.
 */
import { type Dispatch, type KeyboardEvent, useRef, useState } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { NoteEvent, Workspace } from '../workspace/types';
import * as No from '../workspace/notes';
import * as Cm from '../workspace/comments';
import { COMMENT_TEXT as T, NOTE_TEXT, PAUSE_TEXT } from '../workspace/terms';
import { newId } from '../workspace/workspace';
import { ModeWheel } from './ModeWheel';
import { Icon } from './Icon';

const when = (at: number) => new Date(at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function Body({ ws, text }: { ws: Workspace; text: string }) {
  const parts = Cm.splitMentions(ws, text);
  return (
    <span className="kcm__text">
      {parts.map((x, i) =>
        x.person ? (
          <strong key={i} className="kcm__at">
            {x.text}
          </strong>
        ) : (
          <span key={i}>{x.text}</span>
        ),
      )}
    </span>
  );
}

/** Eingabe mit „@ Person …“; Strg/⌘+Enter speichert, Esc bricht ab (nur wenn `onCancel`). */
function Editor(props: { ws: Workspace; value: string; onChange: (v: string) => void; onSave: () => void; onCancel?: () => void; label: string; autoFocus?: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const persons = props.ws.persons ?? [];
  const key = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) (e.preventDefault(), props.onSave());
    else if (e.key === 'Escape' && props.onCancel) (e.preventDefault(), e.stopPropagation(), props.onCancel());
  };
  const insert = (name: string) => {
    const el = ref.current;
    const v = props.value;
    const at = el?.selectionStart ?? v.length;
    const pre = v.slice(0, at);
    const ins = `${pre && !/\s$/.test(pre) ? ' ' : ''}@${name} `;
    props.onChange(pre + ins + v.slice(at));
    window.setTimeout(() => {
      el?.focus();
      el?.setSelectionRange(at + ins.length, at + ins.length);
    }, 0);
  };
  return (
    <div className="kcm__edit">
      <textarea ref={ref} rows={2} value={props.value} placeholder={T.ph} aria-label={props.label} title={T.hint} autoFocus={props.autoFocus} maxLength={Cm.COMMENT_MAX} onChange={(e) => props.onChange(e.target.value)} onKeyDown={key} />
      <div className="kcm__bar">
        <button type="button" className="help__run" disabled={!props.value.trim()} onClick={props.onSave}>
          {T.save}
        </button>
        {persons.length > 0 && (
          <select
            className="kcm__mention"
            value=""
            aria-label={T.mention}
            title={T.mentionHint}
            onChange={(e) => {
              const p = persons.find((x) => x.id === e.target.value);
              if (p) insert(p.name);
            }}
          >
            <option value="">{T.mention}</option>
            {persons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        {props.onCancel && (
          <button type="button" className="help__run" onClick={props.onCancel}>
            {T.cancel}
          </button>
        )}
      </div>
    </div>
  );
}

export function CardComments(props: { ws: Workspace; dispatch: Dispatch<Action>; noteId: string; say: (t: string) => void }) {
  const { ws, dispatch, noteId, say } = props;
  const n = No.noteById(ws, noteId);
  const [draft, setDraft] = useState('');
  const [all, setAll] = useState(false);
  const [editing, setEditing] = useState<{ cid: string; text: string } | null>(null);
  const [msg, setMsg] = useState<{ text: string; undo?: () => void } | null>(null);
  const box = useRef<HTMLElement>(null);
  if (!n) return null;
  const by = ws.profile?.name || undefined;
  const tell = (text: string, undo?: () => void) => (setMsg({ text, undo }), say(text));
  const list = Cm.activityOf(n, all);
  const count = Cm.commentsOf(n).length;
  const save = () => {
    const t = draft.trim();
    if (!t) return;
    const cid = newId();
    dispatch({ type: 'commentAdd', id: noteId, text: t, cid, by });
    setDraft('');
    tell(T.added, () => dispatch({ type: 'commentDelete', id: noteId, cid }));
  };
  const focusOf = (cid: string) => window.setTimeout(() => box.current?.querySelector<HTMLElement>(`[data-cm="${cid}"] button`)?.focus(), 0);
  const row = (e: NoteEvent, i: number) => {
    if (e.what !== 'comment') {
      const st = e.what === 'state' && e.detail ? (NOTE_TEXT.states[e.detail] ?? e.detail) : e.detail;
      return (
        <li key={`ev-${e.at}-${i}`} className="kcm__ev">
          <span className="kcm__meta">
            {e.by || T.me} · {when(e.at)}
          </span>{' '}
          {T.events[e.what] ?? e.what}
          {st ? ` ${e.what === 'state' ? '→ ' : ''}${st}` : ''}
        </li>
      );
    }
    const who = e.by || T.me;
    const ment = Cm.mentionsIn(ws, e.text ?? '');
    return (
      <li key={e.id} className="kcm__item" data-cm={e.id}>
        <span className="kcm__meta">
          <Icon name="comment" size={11} /> <strong>{who}</strong> · {when(e.at)}
          {e.edited ? ` · ${T.edited}` : ''}
        </span>
        {editing && editing.cid === e.id ? (
          <Editor
            ws={ws}
            autoFocus
            label={T.editOf(who)}
            value={editing.text}
            onChange={(text) => setEditing({ cid: e.id!, text })}
            onCancel={() => (setEditing(null), focusOf(e.id!))}
            onSave={() => {
              if (!editing) return;
              const old = e.text ?? '';
              if (editing.text.trim() && editing.text.trim() !== old) {
                dispatch({ type: 'commentEdit', id: noteId, cid: e.id!, text: editing.text });
                tell(T.changed, () => dispatch({ type: 'commentEdit', id: noteId, cid: e.id!, text: old }));
              }
              setEditing(null);
              focusOf(e.id!);
            }}
          />
        ) : (
          <>
            <Body ws={ws} text={e.text ?? ''} />
            {ment.length > 0 && <span className="lc__muted kcm__ment">{T.mentions(ment.map((p) => p.name).join(', '))}</span>}
            <span className="kcm__acts">
              <button type="button" className="note__undo" aria-label={T.editOf(who)} onClick={() => setEditing({ cid: e.id!, text: e.text ?? '' })}>
                {T.edit}
              </button>
              <button
                type="button"
                className="note__undo"
                aria-label={T.delOf(who)}
                onClick={() => {
                  dispatch({ type: 'commentDelete', id: noteId, cid: e.id! });
                  tell(T.deleted, () => dispatch({ type: 'commentPut', id: noteId, ev: e }));
                  window.setTimeout(() => box.current?.querySelector<HTMLElement>('textarea')?.focus(), 0);
                }}
              >
                {T.del}
              </button>
            </span>
          </>
        )}
      </li>
    );
  };
  return (
    <section className="cardwin__comments kcm" aria-label={`${T.head}, ${T.count(count)}`} ref={box}>
      <div className="kcm__head">
        <p className="cardwin__checkhead">
          <Icon name="comment" size={12} /> <strong>{T.head}</strong> <span>{count}</span>
        </p>
        <ModeWheel
          id={`${noteId}-cmshow`}
          className="sheet__wheel"
          label={T.wheel}
          options={[
            { id: 'c', name: T.onlyComments, icon: 'comment', hint: T.onlyHint },
            { id: 'a', name: T.all, icon: 'recent', hint: T.allHint },
          ]}
          value={all ? 'a' : 'c'}
          onChange={(x) => setAll(x === 'a')}
        />
      </div>
      <Editor ws={ws} label={T.label} value={draft} onChange={setDraft} onSave={save} />
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
      {list.length ? <ul className="kcm__list">{list.map(row)}</ul> : <p className="lc__muted">{all ? T.noneAll : T.none}</p>}
    </section>
  );
}
