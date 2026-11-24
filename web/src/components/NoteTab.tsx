/**
 * F-206 Schritt 2: Notiz im Tab. Der Tab zeigt nur auf die Notiz (Tab.note); Inhalt und Zustand
 * liegen in Workspace.notes. Geschrieben wird direkt formatiert (NoteEditor), gespeichert als Markdown.
 * Ansichten (To-do, Kanban, Eisenhower) zeigen hier vorerst nur einen Platzhalter.
 */
import { type Dispatch, useEffect, useId, useRef, useState } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { NoteState, NoteViewKind, Workspace } from '../workspace/types';
import * as No from '../workspace/notes';
import { NOTE_TEXT, PAUSE_TEXT, TERMS } from '../workspace/terms';
import { flash } from '../workspace/flash';
import { NoteEditor } from './NoteEditor';
import { Icon } from './Icon';
import type { IconName } from '../workspace/icons';

const KIND_ICON: Record<NoteViewKind | 'note', IconName> = { note: 'note', block: 'note', todo: 'todo', kanban: 'kanban', eisenhower: 'matrix' };
const KIND_NAME: Record<NoteViewKind, string> = { block: 'Notizblock', todo: 'To-do-Liste', kanban: 'Kanban-Board', eisenhower: 'Eisenhower-Matrix' };
/** Wählbare Zustände (archiviert nur von Hand, „in Prüfung“ kommt über die Board-Regel). */
const STATES: NoteState[] = ['open', 'waiting', 'doing', 'review', 'done', 'archived'];

const when = (ms: number) =>
  new Date(ms).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const dayDe = (d: string) => d.split('-').reverse().join('.');

/** Erklärung eines Begriffs ohne „Wort = “ vorn. */
const explain = (t: string) => t.replace(/^[^=]*=\s*/, '');

// ---------- Notiz ----------

interface NoteProps {
  ws: Workspace;
  noteId: string;
  dispatch: Dispatch<Action>;
}

export function NoteTab({ ws, noteId, dispatch }: NoteProps) {
  const n = No.noteById(ws, noteId);
  const by = ws.profile?.name || undefined;
  const [ask, setAsk] = useState(0);
  const delBtn = useRef<HTMLButtonElement>(null);
  const askFirst = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (ask) askFirst.current?.focus();
  }, [ask]);
  if (!n) return <p className="win__placeholder win__placeholder--small">{NOTE_TEXT.missing}</p>;
  const info = No.stateOf(ws, n);
  const title = No.titleOf(n);
  const edit = (patch: No.NotePatch) => dispatch({ type: 'noteEdit', id: n.id, patch, by });
  const auto =
    info.cause === 'after' ? NOTE_TEXT.autoAfter(info.blockers?.length ?? 0) : info.cause === 'notBefore' || info.cause === 'date' ? NOTE_TEXT.autoFrom(dayDe(info.from!)) : '';

  // Löschen (Entscheidung Enrico, V62): ohne offene Unter-Notizen sofort mit „Rückgängig“, sonst Rückfrage
  const remove = (keepChildren: boolean) => {
    const r = No.deleteNote(ws, n.id, { keepChildren });
    if (!r) return;
    const more = r.undo.notes.length - 1;
    const name = title || NOTE_TEXT.untitled;
    setAsk(0);
    dispatch({ type: 'noteDelete', id: n.id, keepChildren });
    flash({
      text: more > 0 ? NOTE_TEXT.deletedMore(name, more) : NOTE_TEXT.deleted(name),
      ms: 10000,
      action: {
        label: PAUSE_TEXT.undo,
        run: () => {
          dispatch({ type: 'noteRestore', undo: r.undo, by });
          flash({ text: NOTE_TEXT.restored, ms: 3000 });
        },
      },
    });
  };
  const askDelete = () => {
    const open = No.openDescendants(ws, n.id).length;
    if (open === 0) remove(false);
    else setAsk(open);
  };
  const cancel = () => {
    setAsk(0);
    delBtn.current?.focus();
  };
  const archive = () => {
    setAsk(0);
    dispatch({ type: 'noteState', id: n.id, state: 'archived', by });
    flash({ text: NOTE_TEXT.archived, ms: 5000 });
    delBtn.current?.focus();
  };

  return (
    <div className="note" role="region" aria-label={`Notiz: ${title || NOTE_TEXT.untitled}`}>
      <div className="note__bar">
        <label className="note__opt">
          <span title={explain(TERMS.noteState)}>{NOTE_TEXT.state}</span>
          <select value={n.state} onChange={(e) => dispatch({ type: 'noteState', id: n.id, state: e.target.value as NoteState, by })}>
            {STATES.map((s) => (
              <option key={s} value={s}>
                {NOTE_TEXT.states[s]}
              </option>
            ))}
          </select>
        </label>
        {n.state === 'waiting' && (
          <label className="note__opt">
            {NOTE_TEXT.reason}
            <input
              type="text"
              defaultValue={n.waitReason ?? ''}
              onBlur={(e) => e.target.value.trim() !== (n.waitReason ?? '') && dispatch({ type: 'noteState', id: n.id, state: 'waiting', reason: e.target.value, by })}
            />
          </label>
        )}
        <label className="note__opt">
          <input type="checkbox" checked={!!n.important} onChange={(e) => edit({ important: e.target.checked || undefined })} />
          {NOTE_TEXT.important}
        </label>
        <label className="note__opt">
          <input type="checkbox" checked={!!n.urgent} onChange={(e) => edit({ urgent: e.target.checked || undefined })} />
          {NOTE_TEXT.urgent}
        </label>
        <label className="note__opt">
          {NOTE_TEXT.notBefore}
          <input type="date" value={n.notBefore ?? ''} onChange={(e) => edit({ notBefore: e.target.value || undefined })} />
        </label>
        <label className="note__opt">
          {NOTE_TEXT.due}
          <input type="date" value={n.due ?? ''} onChange={(e) => edit({ due: e.target.value || undefined })} />
        </label>
        <button ref={delBtn} type="button" className="note__del" title={NOTE_TEXT.removeHint} aria-expanded={ask > 0} onClick={askDelete}>
          <Icon name="trash" size={14} /> {NOTE_TEXT.remove}
        </button>
      </div>
      {ask > 0 && (
        <div className="note__ask" role="alertdialog" aria-labelledby="note-ask-t" aria-describedby="note-ask-d" onKeyDown={(e) => e.key === 'Escape' && (e.stopPropagation(), cancel())}>
          <strong id="note-ask-t">{NOTE_TEXT.askOpen(ask)}</strong>
          <span id="note-ask-d" className="note__hint">{NOTE_TEXT.askKeepHint}</span>
          <button ref={askFirst} type="button" onClick={() => remove(true)}>
            {NOTE_TEXT.askKeep}
          </button>
          <button type="button" onClick={() => remove(false)}>
            {NOTE_TEXT.askAll}
          </button>
          <button type="button" onClick={archive}>
            {NOTE_TEXT.archive}
          </button>
          <button type="button" onClick={cancel}>
            {NOTE_TEXT.cancel}
          </button>
        </div>
      )}
      {auto && (
        <p className="note__auto" role="status">
          <Icon name="pause" size={14} /> {auto}
        </p>
      )}
      <NoteEditor key={n.id} text={n.text} label={NOTE_TEXT.text} autoFocus={!n.text && !n.title} onChange={(text) => edit({ text })} />
      <p className="note__meta">
        {NOTE_TEXT.created(when(n.created))} · {NOTE_TEXT.changed(when(n.changed))}
        {n.origin?.by ? ` · ${n.origin.by}` : ''}
      </p>
    </div>
  );
}

// ---------- Ansicht (Platzhalter bis zu den nächsten Schritten) ----------

export function ViewTab({ ws, viewId, onBack }: { ws: Workspace; viewId: string; onBack: () => void }) {
  const v = No.viewById(ws, viewId);
  const back = (
    <button type="button" className="newin__btn" title={NOTE_TEXT.backHint} onClick={onBack}>
      <Icon name="back" size={16} />
      {NOTE_TEXT.back}
    </button>
  );
  if (!v)
    return (
      <div className="note note--view">
        <p className="win__placeholder win__placeholder--small">{NOTE_TEXT.missingView}</p>
        {back}
      </div>
    );
  return (
    <div className="note note--view">
      <p className="win__placeholder">
        <Icon name={KIND_ICON[v.kind]} size={22} /> {v.name}
      </p>
      <p className="win__hint">{NOTE_TEXT.viewSoon(KIND_NAME[v.kind], No.countIn(ws, v))}</p>
      <p className="win__hint">{NOTE_TEXT.addSoon}</p>
      {back}
    </div>
  );
}

// ---------- Leerer Tab: Notiz oder Ansicht anlegen ----------

const CHOICES: { kind: NoteViewKind | 'note'; label: string; term: string }[] = [
  { kind: 'note', label: 'Notiz', term: TERMS.note },
  { kind: 'todo', label: 'To-do-Liste', term: TERMS.todo },
  { kind: 'kanban', label: 'Kanban-Board', term: TERMS.kanban },
  { kind: 'eisenhower', label: 'Eisenhower', term: TERMS.eisenhower },
];

export function NewInTab({ onPick }: { onPick: (kind: NoteViewKind | 'note') => void }) {
  const uid = useId();
  return (
    <div className="newin" role="group" aria-labelledby={`${uid}-h`} aria-describedby={`${uid}-d`}>
      <p className="newin__head" id={`${uid}-h`}>
        {NOTE_TEXT.create}
      </p>
      <span className="newin__row">
        {CHOICES.map((c) => (
          <button key={c.kind} type="button" className="newin__btn" title={explain(c.term)} onClick={() => onPick(c.kind)}>
            <Icon name={KIND_ICON[c.kind]} size={16} />
            {c.label}
          </button>
        ))}
      </span>
      <p className="newin__hint" id={`${uid}-d`}>
        {NOTE_TEXT.createHint}
      </p>
    </div>
  );
}
