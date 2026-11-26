/**
 * V121 (F-231 K2): Checklisten im Kartenfenster wie bei Trello – jede „### ☑ Name“-Liste einzeln mit Balken,
 * Punkte abhaken, mit Person und Termin, löschen (Rückgängig am Ort), „In Aufgabe umwandeln“, „Punkt hinzufügen“,
 * „Erledigte ausblenden“, „+ Checkliste“, „Checklisten übernehmen von …“. Alles steht im Text der Notiz (T3).
 */
import { type Dispatch, useState } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { Workspace } from '../workspace/types';
import * as No from '../workspace/notes';
import * as CL from '../workspace/checklists';
import { CHECK_TEXT as T, NOTE_TEXT, PAUSE_TEXT, SHEET_TEXT } from '../workspace/terms';
import { newId } from '../workspace/workspace';
import { Icon } from './Icon';

const day = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`;

export function CardChecklists(props: { ws: Workspace; dispatch: Dispatch<Action>; noteId: string; sheetId: string; say: (t: string) => void }) {
  const { ws, dispatch, noteId, sheetId, say } = props;
  const n = No.noteById(ws, noteId);
  const [hide, setHide] = useState(false);
  const [newList, setNewList] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [msg, setMsg] = useState<{ text: string; undo?: () => void } | null>(null);
  if (!n) return null;
  if (No.hasDraft(n)) return CL.checklistsOf(No.shownNote(n).text).length ? <p className="cardwin__check lc__muted">{T.draftHint}</p> : null;
  const by = ws.profile?.name || undefined;
  const lists = CL.checklistsOf(n.text);
  const setText = (text: string) => dispatch({ type: 'noteEdit', id: noteId, patch: { text }, by });
  const tell = (text: string, undo?: () => void) => (setMsg({ text, undo }), say(text));
  const doneAll = lists.reduce((s, l) => s + CL.listProgress(l).done, 0);
  const v = No.viewById(ws, sheetId);
  const others = (v ? No.idsIn(v) : [])
    .filter((id) => id !== noteId)
    .map((id) => No.noteById(ws, id))
    .filter((x): x is NonNullable<typeof x> => !!x && x.state !== 'archived' && CL.checklistsOf(x.text).some((l) => l.items.length));
  const title = (x: { title: string; text: string }) => No.titleOf(x) || NOTE_TEXT.untitled;
  return (
    <div className="cardwin__check" role="group" aria-label={T.lists}>
      {lists.map((l, li) => {
        const p = CL.listProgress(l);
        const pct = p.all ? Math.round((p.done / p.all) * 100) : 0;
        const items = l.items.filter((i) => !(hide && i.done));
        return (
          <section key={`${l.head}-${li}`} className="ccl" aria-label={T.list(l.name, p.done, p.all)}>
            <p className="cardwin__checkhead">
              <Icon name="check" size={12} /> <strong>{l.name}</strong> <span>{p.done}/{p.all}</span>
            </p>
            <div className="ccl__bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={T.list(l.name, p.done, p.all)}>
              <span style={{ width: `${pct}%` }} />
            </div>
            <ul>
              {items.map((it) => (
                <li key={it.line} className={it.done ? 'is-done' : undefined}>
                  <label className="ccl__item">
                    <input type="checkbox" checked={it.done} onChange={() => (setText(CL.toggleItem(n.text, it.line)), say(`${it.text}: ${it.done ? NOTE_TEXT.states.open : NOTE_TEXT.states.done}`))} />
                    <span>{it.text || '…'}</span>
                  </label>
                  {it.who && <span className="sign" title={T.who(it.who)}>@{it.who}</span>}
                  {it.due && <span className="sign" title={T.due(day(it.due))}>{T.due(day(it.due))}</span>}
                  <button
                    type="button"
                    className="cardwin__totask"
                    title={SHEET_TEXT.toTaskHint}
                    aria-label={`${SHEET_TEXT.toTask}: ${it.text}`}
                    onClick={() => {
                      dispatch({ type: 'checkToTask', note: noteId, index: it.index, view: sheetId, id: newId(), by });
                      say(`${SHEET_TEXT.toTask}: ${it.text}`);
                    }}
                  >
                    <Icon name="plus" size={11} /> {SHEET_TEXT.toTask}
                  </button>
                  <button
                    type="button"
                    className="cardwin__totask"
                    aria-label={T.removeItem(it.text)}
                    title={T.removeItem(it.text)}
                    onClick={() => {
                      const before = n.text;
                      setText(CL.removeItem(n.text, it.line));
                      tell(T.removed(it.text), () => setText(before));
                    }}
                  >
                    <Icon name="close" size={11} />
                  </button>
                </li>
              ))}
            </ul>
            <input
              className="ccl__add"
              placeholder={T.addItemPh}
              aria-label={`${T.addItem} – ${l.name}`}
              title={T.addItemHint}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                const m = CL.itemMeta(e.currentTarget.value);
                if (!m.text) return;
                setText(CL.addItem(n.text, li, m.text, m.who, m.due));
                say(`${T.addItem}: ${m.text}`);
                e.currentTarget.value = '';
              }}
            />
          </section>
        );
      })}
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
      <p className="ccl__foot">
        {newList !== null ? (
          <input
            autoFocus
            value={newList}
            placeholder={T.newListPh}
            aria-label={T.newListPh}
            title={T.newListHint}
            onChange={(e) => setNewList(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setText(CL.addChecklist(n.text, newList));
                say(`${T.newList}: ${newList.trim() || CL.CHECKLIST_NAME}`);
                setNewList(null);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                setNewList(null);
              }
            }}
            onBlur={() => !newList.trim() && setNewList(null)}
          />
        ) : (
          <button type="button" className="note__undo" title={T.newListHint} onClick={() => setNewList('')}>
            {T.newList}
          </button>
        )}
        <button type="button" className="note__undo" aria-expanded={picking} title={T.copyFromHint} onClick={() => setPicking(!picking)}>
          {T.copyFrom}
        </button>
        {doneAll > 0 && (
          <button type="button" className="note__undo" aria-pressed={hide} onClick={() => setHide(!hide)}>
            {hide ? T.showDone(doneAll) : T.hideDone}
          </button>
        )}
      </p>
      {picking && (
        <p className="ccl__pick" role="group" aria-label={T.copyFrom}>
          {others.length ? (
            others.map((o) => (
              <button
                key={o.id}
                type="button"
                className="help__run"
                onClick={() => {
                  const before = n.text;
                  setText(CL.copyChecklists(n.text, o.text));
                  setPicking(false);
                  tell(T.copied(title(o)), () => setText(before));
                }}
              >
                {title(o)}
              </button>
            ))
          ) : (
            <span className="lc__muted">{T.copyFromNone}</span>
          )}
        </p>
      )}
    </div>
  );
}
