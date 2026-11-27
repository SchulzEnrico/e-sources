/**
 * F-206 Schritt 7 (V86): Sheets To-do, Kanban, Eisenhower im Pad – gemeinsamer Rahmen.
 *
 * Entscheidungen im Claude Doc „F-206 V86 – To-do, Kanban, Eisenhower (Schritt 7)“: an Trello und unserer
 * UX/UI ausgerichtet. S1: Notiz öffnet als Kartenfenster mittig über dem Sheet; S3: gleiche Kopfzeile
 * (Filter + Rad „Offen · Alle“); F: gleiche Tasten wie Cockpit „Notizen“ (NF-08); Meldungen am Ort (2 s).
 */
import { type Dispatch, type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { Note, NoteView, Workspace } from '../workspace/types';
import * as No from '../workspace/notes';
import * as NS from '../workspace/noteSources';
import * as Sh from '../workspace/sheets';
import { loadSheetPref, saveSheetPref } from '../workspace/sheetPrefs';
import { noticeLater } from '../workspace/flash';
import { switchOf } from '../workspace/ruleSet';
import * as Gp from '../workspace/gpm';
import { DIALOG_TEXT, DUE_TEXT, NOTE_TEXT, PAUSE_TEXT, PERSON_TEXT, SHEET_TEXT } from '../workspace/terms';
import { dueKind } from '../workspace/kanbanMore';
import * as Ps from '../workspace/persons';
import { hoursText } from '../workspace/focusLoad';
import { PersonBadge } from './PersonChips';
import { type Who, usePersonKeys } from './usePersonKeys';
export { usePersonKeys };
import { newId } from '../workspace/workspace';
import { type Notice, NoteTab } from './NoteTab';
import { ModeWheel } from './ModeWheel';
import { CardChecklists } from './CardChecklists';
import { CardTags } from './KanbanTags';
import { CardComments } from './CardComments';
import { CardCover } from './CardCover';
import { CardFields } from './CardFields';
import { Icon } from './Icon';

export type SheetCmd = { k: 'home' | 'new' | 'go' | 'search'; n: number; id?: string };
export type Show = 'open' | 'all';

/** Meldung am Ort, höchstens 2 s (V79), mit „Rückgängig“. */
export function useNotice() {
  const [msg, setMsg] = useState<Notice | null>(null);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const notice = (m: Notice) => {
    window.clearTimeout(timer.current);
    setMsg(m);
    timer.current = noticeLater(() => setMsg(null), 1, m.ms);
  };
  const shown = msg ? { ...msg, ...(msg.undo ? { undo: () => (setMsg(null), msg.undo!()) } : {}) } : null;
  return { notice, shown, clear: () => setMsg(null) };
}

export function NoticeLine({ shown, extra }: { shown: Notice | null; extra?: ReactNode }) {
  if (!shown) return null;
  return (
    <p className="sheet__msg" role="status">
      {shown.text}
      {shown.undo && (
        <button type="button" className="note__undo" onClick={shown.undo}>
          {PAUSE_TEXT.undo}
        </button>
      )}
      {extra}
    </p>
  );
}

export const KIND_ICON = { block: 'note', todo: 'todo', kanban: 'kanban', eisenhower: 'matrix' } as const;

/**
 * V88 (F/K4): „Verschieben nach …“ (Taste V) – Leiste am Ort mit allen anderen Sheets (wie im Cockpit
 * das Ziel wählen). Nach dem Verschieben Meldung mit „Rückgängig“; Esc bringt den Fokus zurück.
 */
export function MoveToBar(props: { ws: Workspace; dispatch: Dispatch<Action>; sheetId: string; noteId: string; say: (t: string) => void; notice: (m: Notice) => void; onClose: () => void }) {
  const { ws, dispatch, sheetId, noteId, say } = props;
  const n = No.noteById(ws, noteId);
  const targets = Sh.moveTargets(ws, sheetId);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.querySelector<HTMLElement>('button')?.focus();
    if (!targets.length) say(SHEET_TEXT.moveNone);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!n) return null;
  const title = No.titleOf(No.shownNote(n)) || NOTE_TEXT.untitled;
  const from = No.viewById(ws, sheetId)?.name ?? '';
  const by = ws.profile?.name || undefined;
  const pick = (to: NoteView) => {
    dispatch({ type: 'sheetMoveTo', note: noteId, from: sheetId, to: to.id, by });
    const text = SHEET_TEXT.movedTo(title, to.name);
    say(text);
    props.notice({ text, undo: () => (dispatch({ type: 'sheetMoveTo', note: noteId, from: to.id, to: sheetId, by }), say(SHEET_TEXT.moveBack(title, from))) });
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
    <div className="sheet__move" role="group" aria-label={SHEET_TEXT.moveTo(title)} title={SHEET_TEXT.moveHint} ref={box} onKeyDown={key}>
      <span className="sheet__move-cap">{SHEET_TEXT.moveTo(title)}</span>
      {targets.length ? (
        targets.map((t) => (
          <button key={t.id} type="button" className="help__run" onClick={() => pick(t)}>
            <Icon name={KIND_ICON[t.kind]} size={12} className="icon icon--inline" /> {t.name}
          </button>
        ))
      ) : (
        <span className="lc__muted">{SHEET_TEXT.moveNone}</span>
      )}
      <button type="button" className="help__run" onClick={props.onClose}>
        {DIALOG_TEXT.cancel}
      </button>
    </div>
  );
}

/** S3: dieselbe Kopfzeile in allen Sheets – Filterfeld links, Räder rechts. */
export function SheetHead(props: { id: string; filter: string; onFilter: (q: string) => void; show: Show; onShow: (s: Show) => void; onDown: () => void; filterRef?: React.RefObject<HTMLInputElement>; children?: ReactNode; who?: Who; onWho?: (w: Who) => void }) {
  const key = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      props.onDown();
    } else if (e.key === 'Escape' && props.filter) {
      e.preventDefault();
      e.stopPropagation();
      props.onFilter('');
    }
  };
  return (
    <div className="sheet__head">
      <div className="nblock__find sheet__find" role="search">
        <Icon name="search" size={13} />
        <input ref={props.filterRef} type="search" value={props.filter} placeholder={SHEET_TEXT.filterPh} aria-label={SHEET_TEXT.filter} title={SHEET_TEXT.filterHint} onChange={(e) => props.onFilter(e.target.value)} onKeyDown={key} />
      </div>
      {props.children}
      {/* V94 (P7): Rad „Alle · Nur meine“ (Q) – in allen Sheets an derselben Stelle */}
      {props.onWho && (
        <ModeWheel
          id={`${props.id}-who`}
          className="sheet__wheel"
          label={PERSON_TEXT.whoLabel}
          options={[
            { id: 'all', name: PERSON_TEXT.whoAll, icon: 'catPeople', hint: PERSON_TEXT.whoHint },
            { id: 'mine', name: PERSON_TEXT.whoMine, icon: 'profile', hint: PERSON_TEXT.whoHint },
          ]}
          value={props.who ?? 'all'}
          onChange={(v) => props.onWho?.(v as Who)}
        />
      )}
      <ModeWheel
        id={`${props.id}-show`}
        className="sheet__wheel"
        label={SHEET_TEXT.show}
        options={[
          { id: 'open', name: SHEET_TEXT.showOpen, icon: 'todo', hint: SHEET_TEXT.showHint },
          { id: 'all', name: SHEET_TEXT.showAll, icon: 'check', hint: SHEET_TEXT.showHint },
        ]}
        value={props.show}
        onChange={(v) => props.onShow(v as Show)}
      />
    </div>
  );
}

const day = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.`;

/** Kleine Zeichen einer Zeile bzw. Karte (Entscheidung V61: nie Farbe allein). */
export function Signs({ ws, n }: { ws: Workspace; n: Note }) {
  const out: ReactNode[] = [];
  const st = No.stateOf(ws, n).state;
  if (n.important) out.push(<span key="i" className="sign sign--imp">{SHEET_TEXT.important}</span>);
  if (n.urgent) out.push(<span key="u" className="sign sign--urg">{SHEET_TEXT.urgent}</span>);
  // V121 (F-231 K5): Uhrzeit und Färbung wie Trello – mit Text, nicht nur Farbe
  if (n.due) {
    const dk = dueKind(n);
    const txt = `${SHEET_TEXT.due(day(n.due))}${n.dueTime ? ` ${n.dueTime}` : ''}`;
    out.push(
      <span key="d" className={`sign${dk && dk !== 'later' ? ` sign--due-${dk}` : ''}`} title={dk ? DUE_TEXT.hint[dk] : undefined}>
        {dk && dk !== 'later' && <Icon name={dk === 'done' ? 'check' : 'recent'} size={10} />}
        {txt}
        {dk && dk !== 'later' && <span className="sign__due">{` · ${DUE_TEXT.kind[dk]}`}</span>}
      </span>,
    );
  }
  if (st === 'waiting') out.push(<span key="w" className="sign">{SHEET_TEXT.waiting}</span>);
  if (st === 'review') out.push(<span key="r" className="sign">{NOTE_TEXT.states.review}</span>);
  // V94 (P4/P8): Aufwand und Zuständig (Kennzeichen wie Trello-Mitglieder); „delegiert“ nur, wenn noch an diese Person
  // V111 (F-226 G7): mit Einsätzen gerechnet, Hand-Eingabe geht vor
  const ph = Gp.planHours(ws, n);
  if (ph !== undefined) out.push(<span key="e" className="sign" title={n.effort?.plan === undefined ? PERSON_TEXT.fromUseTitle : PERSON_TEXT.effortTitle}>{hoursText(ph)}</span>);
  if (n.delegated && (!n.delegated.person || n.delegated.person === Ps.assigneeOf(n))) out.push(<span key="g" className="sign">{SHEET_TEXT.delegated(n.delegated.to)}</span>);
  const who = Ps.personById(ws, Ps.assigneeOf(n));
  if (who) out.push(<span key="a" className="sign sign--who" title={`${PERSON_TEXT.assignee}: ${who.name}`}><PersonBadge person={who} size={18} /><span className="sr-only">{`${PERSON_TEXT.assignee}: ${who.name}`}</span></span>);
  const cl = Sh.checklistOf(n);
  if (cl) out.push(<span key="c" className="sign" title={SHEET_TEXT.progress(cl.done, cl.all)}><Icon name="check" size={11} /> {cl.done}/{cl.all}</span>);
  // V93 (Q10): Büroklammer + Zahl, wenn die Notiz Quellen hat (wie Trello-Anhänge)
  const src = n.sources?.length ?? 0;
  if (src) out.push(<span key="s" className="sign" title={NS.SOURCE_LINK_TEXT.clip(src)} aria-label={NS.SOURCE_LINK_TEXT.clip(src)}><Icon name="clip" size={11} /> {src}</span>);
  const p = No.progress(ws, n.id);
  if (p.total) out.push(<span key="p" className="sign" title={SHEET_TEXT.sub(p.done, p.total)}>{p.done}/{p.total}</span>);
  return out.length ? <span className="sheet__signs">{out}</span> : null;
}

/**
 * S1 (D, wie Trello): Notiz als Kartenfenster mittig über dem Sheet; Sheet dahinter abgedunkelt. Esc, ✕ oder
 * Klick daneben schließt, der Fokus geht zurück an die Karte (Aufrufer). Tab bleibt im Fenster.
 */
export function CardWindow(props: { ws: Workspace; dispatch: Dispatch<Action>; noteId: string; where: string; sheetId: string; onClose: () => void; say: (t: string) => void; acts?: ReactNode; extra?: ReactNode }) {
  const { ws, dispatch, noteId } = props;
  const n = No.noteById(ws, noteId);
  const box = useRef<HTMLElement>(null);
  const { notice, shown } = useNotice();
  useEffect(() => {
    box.current?.querySelector<HTMLElement>('.cardwin__x')?.focus({ preventScroll: true });
  }, []);
  if (!n) return null;
  const key = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      props.onClose();
    } else if (e.key === 'Tab' && box.current) {
      const f = [...box.current.querySelectorAll<HTMLElement>('button, input, textarea, select, [contenteditable="true"], [tabindex="0"]')].filter((x) => !x.hasAttribute('disabled'));
      if (!f.length) return;
      const i = f.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && i <= 0) (e.preventDefault(), f[f.length - 1].focus());
      else if (!e.shiftKey && i === f.length - 1) (e.preventDefault(), f[0].focus());
    }
  };
  const t = No.titleOf(No.shownNote(n)) || NOTE_TEXT.untitled;
  return (
    <div className="cardwin" onMouseDown={(e) => e.target === e.currentTarget && props.onClose()}>
      <section ref={box} className="cardwin__box" role="dialog" aria-modal="true" aria-label={`${SHEET_TEXT.card}: ${t}`} onKeyDown={key}>
        <header className="cardwin__head">
          <span className="cardwin__where">
            <Icon name="todo" size={13} /> {SHEET_TEXT.inPlace(props.where)}
          </span>
          {/* V121 (F-231 K1): Karten-Aktionen des Boards (Kopieren, Archivieren, Kartenvorlage) */}
          {props.acts && <span className="cardwin__acts">{props.acts}</span>}
          <button type="button" className="cardwin__x" onClick={props.onClose} title={SHEET_TEXT.cardClose} aria-label={SHEET_TEXT.cardClose}>
            <Icon name="close" size={14} />
          </button>
        </header>
        {/* V127 (F-231 K9): Abschnitte des Boards vor den Karteninhalten (Spiegel) */}
        {props.extra}
        {/* V121 (F-231 K2): mehrere benannte Checklisten wie bei Trello */}
        {/* V122 (F-231 K4): Tags mit Farbe */}
        <CardTags ws={ws} dispatch={dispatch} noteId={noteId} sheetId={props.sheetId} say={props.say} />
        {/* V124 (F-231 K6): Titelbild wie Trello „Cover“ */}
        <CardCover ws={ws} dispatch={dispatch} noteId={noteId} say={props.say} />
        {/* V125 (F-231 K8): Abstimmen und eigene Felder wie Trello „Voting“ und „Custom Fields“ */}
        <CardFields ws={ws} dispatch={dispatch} noteId={noteId} sheetId={props.sheetId} say={props.say} />
        <CardChecklists ws={ws} dispatch={dispatch} noteId={noteId} sheetId={props.sheetId} say={props.say} />
        <div className="cardwin__note">
          <NoteTab ws={ws} noteId={noteId} dispatch={dispatch} sheet={props.sheetId} draft={{ onClose: props.onClose, say: props.say, notice, shown }} />
        </div>
        {/* V122 (F-231 K7): Kommentare und Aktivität wie bei Trello – unter der Notiz */}
        <CardComments ws={ws} dispatch={dispatch} noteId={noteId} say={props.say} />
      </section>
    </div>
  );
}

/** Wo erledigt gesetzt wird (L1) – Hinweis mit „Zum Kanban“. */
export function lockText(boards: NoteView[]): string {
  return SHEET_TEXT.locked(boards.map((b) => b.name).join('“, „'));
}

// ---------- To-do-Liste (T2, T3) ----------

/** F-218 A5 (V92): bei „nach 2 Sekunden“/„nach einem Tag“ neu zeichnen, damit Erledigte rechtzeitig einklappen. */
export function useFoldTick(ws: Workspace) {
  const [, setTick] = useState(0);
  const mode = switchOf(ws, 'fold');
  useEffect(() => {
    if (mode === '2s') {
      const t = window.setTimeout(() => setTick((x) => x + 1), 2100);
      return () => window.clearTimeout(t);
    }
    if (mode === 'day') {
      const t = window.setInterval(() => setTick((x) => x + 1), 60000);
      return () => window.clearInterval(t);
    }
  }, [mode, ws.notes]);
}

export function TodoSheet(props: { ws: Workspace; dispatch: Dispatch<Action>; desk: string; sheetId: string; say: (t: string) => void; cmd?: SheetCmd | null }) {
  const { ws, dispatch, sheetId, say } = props;
  useFoldTick(ws);
  const v = No.viewById(ws, sheetId)!;
  const by = ws.profile?.name || undefined;
  const [filter, setFilter] = useState('');
  const pk = usePersonKeys(ws, dispatch, by, say);
  // V88: Rad-Wahl „Zeigen“ und „Ordnung“ je Sheet und Gerät merken
  const [show, setShowRaw] = useState<Show>(() => loadSheetPref(sheetId).show ?? 'open');
  const setShow = (s: Show) => (setShowRaw(s), saveSheetPref(sheetId, { show: s }));
  const [order, setOrderRaw] = useState<Sh.TodoOrder>(() => loadSheetPref(sheetId).order ?? 'own');
  const setOrder = (o: Sh.TodoOrder) => (setOrderRaw(o), saveSheetPref(sheetId, { order: o }));
  const [openDone, setOpenDone] = useState(false);
  const [card, setCard] = useState<string | null>(null);
  const [edit, setEdit] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLUListElement>(null);
  const newRef = useRef<HTMLInputElement>(null);
  const filterRef = useRef<HTMLInputElement>(null);
  const { notice, shown } = useNotice();
  const [moving, setMoving] = useState<string | null>(null);
  const [lockMsg, setLockMsg] = useState<{ note: string; boards: NoteView[] } | null>(null);

  const all = Sh.todoRows(ws, v, order, show);
  const rows = all.rows.filter((r) => Sh.matchesFilter(No.shownNote(r.note), filter) && pk.pass(r.note));
  const done = all.done.filter((n) => Sh.matchesFilter(No.shownNote(n), filter) && pk.pass(n));
  const focusRow = (id?: string) =>
    window.setTimeout(() => (listRef.current?.querySelector<HTMLElement>(id ? `[data-row="${id}"]` : '[data-row]') ?? newRef.current)?.focus({ preventScroll: true }), 0);

  // Fußleiste (S2): Home = Liste, Neue Aufgabe = Feld, Suche = Filter, go = Karte
  const seen = useRef(props.cmd?.n ?? 0);
  useEffect(() => {
    const c = props.cmd;
    if (!c || c.n === seen.current) return;
    seen.current = c.n;
    if (c.k === 'new') return void newRef.current?.focus();
    if (c.k === 'search') return void filterRef.current?.focus();
    if (c.k === 'go' && c.id) return setCard(c.id);
    setCard(null);
    focusRow();
  }, [props.cmd?.n]); // eslint-disable-line react-hooks/exhaustive-deps

  const title = (n: Note) => No.titleOf(No.shownNote(n)) || NOTE_TEXT.untitled;
  const toggle = (n: Note) => {
    const boards = Sh.lockOf(ws, n.id, sheetId);
    if (boards.length) {
      setLockMsg({ note: n.id, boards });
      return say(lockText(boards));
    }
    const wasDone = No.isFinished(n.state) || n.state === 'review';
    dispatch({ type: 'sheetDone', note: n.id, here: sheetId, by });
    if (!wasDone) notice({ text: SHEET_TEXT.doneMsg(title(n)), undo: () => dispatch({ type: 'sheetDone', note: n.id, here: sheetId, by }) });
    say(wasDone ? SHEET_TEXT.uncheck(title(n)) : SHEET_TEXT.check(title(n)));
  };
  const remove = (n: Note) => {
    const before = v;
    dispatch({ type: 'sheetRemove', view: sheetId, note: n.id, by });
    notice({ text: SHEET_TEXT.removed(title(n)), undo: () => dispatch({ type: 'sheetRestore', view: before }) });
  };
  const add = () => {
    if (!draft.trim()) return;
    dispatch({ type: 'sheetAdd', view: sheetId, title: draft, note: newId(), by });
    say(`${draft.trim()} – angelegt`);
    setDraft('');
  };
  const toBoard = (board: string) => {
    setLockMsg(null);
    dispatch({ type: 'padOpen', desk: props.desk, ref: { view: board }, ids: [newId(), newId(), newId()] });
  };
  const rowKey = (e: KeyboardEvent<HTMLElement>, n: Note) => {
    const ids = [...(listRef.current?.querySelectorAll<HTMLElement>('[data-row]') ?? [])];
    const i = ids.indexOf(e.currentTarget);
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && e.altKey) {
      e.preventDefault();
      if (order !== 'own' || !v.ids.includes(n.id)) return;
      const d = e.key === 'ArrowUp' ? -1 : 1;
      dispatch({ type: 'sheetShift', view: sheetId, note: n.id, by: d });
      say(SHEET_TEXT.moved(d));
      return focusRow(n.id);
    }
    if (e.key === 'ArrowDown') return void (e.preventDefault(), ids[i + 1]?.focus());
    if (e.key === 'ArrowUp') return void (e.preventDefault(), i > 0 ? ids[i - 1].focus() : newRef.current?.focus());
    if (e.key === 'Home') return void (e.preventDefault(), ids[0]?.focus());
    if (e.key === 'End') return void (e.preventDefault(), ids[ids.length - 1]?.focus());
    if (e.key === ' ') return void (e.preventDefault(), toggle(n));
    // V88 (F/K4): V = Verschieben nach … (Ziel-Sheet wählen)
    if (pk.onKey(e, n)) return;
    if ((e.key === 'v' || e.key === 'V') && !e.ctrlKey && !e.metaKey && !e.altKey) return void (e.preventDefault(), setMoving(n.id));
    if (e.key === 'F2') return void (e.preventDefault(), setEdit(n.id));
    if ((e.key === 'Delete' || e.key === 'Backspace') && v.ids.includes(n.id)) {
      e.preventDefault();
      remove(n);
      return void ids[i + 1 < ids.length ? i + 1 : i - 1]?.focus();
    }
  };
  const row = (n: Note, depth: number, dim = false) => {
    const t = title(n);
    const fin = No.isFinished(n.state) || n.state === 'review';
    const lock = Sh.lockOf(ws, n.id, sheetId);
    return (
      <li key={n.id} className={`todo__row${fin ? ' is-done' : ''}${dim ? ' is-dim' : ''}${pk.mark(n)}`} style={{ ['--depth' as string]: depth }}>
        {pk.picker(n, () => focusRow(n.id))}
        <button
          type="button"
          role="checkbox"
          aria-checked={fin}
          tabIndex={-1}
          className={`todo__tick${lock.length ? ' is-locked' : ''}`}
          title={lock.length ? SHEET_TEXT.lockedHint(lock.map((b) => b.name).join(', ')) : fin ? SHEET_TEXT.uncheck(t) : SHEET_TEXT.check(t)}
          aria-label={lock.length ? SHEET_TEXT.lockedHint(lock.map((b) => b.name).join(', ')) : t}
          onClick={() => toggle(n)}
        >
          <Icon name={lock.length ? 'lock' : fin ? 'check' : 'tick'} size={lock.length ? 13 : 15} />
        </button>
        {edit === n.id ? (
          <input
            className="todo__edit"
            autoFocus
            defaultValue={t}
            aria-label={SHEET_TEXT.rename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const val = e.currentTarget.value.trim();
                if (val) dispatch({ type: 'taskRename', note: n.id, title: val, by });
                setEdit(null);
                focusRow(n.id);
              } else if (e.key === 'Escape') {
                e.stopPropagation();
                setEdit(null);
                focusRow(n.id);
              }
            }}
            onBlur={() => setEdit(null)}
          />
        ) : (
          <button type="button" data-row={n.id} className="todo__title" title={`${SHEET_TEXT.open(t)} – ${SHEET_TEXT.rowKeys}`} aria-describedby={`${sheetId}-rowkeys`} onClick={() => setCard(n.id)} onKeyDown={(e) => rowKey(e, n)}>
            <span className="todo__text">{t}</span>
            <Signs ws={ws} n={n} />
            <span className="sr-only">, {fin ? NOTE_TEXT.states.done : NOTE_TEXT.states[No.stateOf(ws, n).state]}{lock.length ? `, ${lockText(lock)}` : ''}</span>
          </button>
        )}
      </li>
    );
  };
  const cardNote = card ? No.noteById(ws, card) : undefined;
  return (
    <div className="sheet sheet--todo">
      <SheetHead id={sheetId} filter={filter} onFilter={setFilter} show={show} onShow={setShow} onDown={() => focusRow()} filterRef={filterRef} who={pk.who} onWho={pk.setWho}>
        <ModeWheel
          id={`${sheetId}-order`}
          className="sheet__wheel"
          label={SHEET_TEXT.order}
          options={Sh.TODO_ORDERS.map((o) => ({ id: o, name: Sh.TODO_ORDER_NAME[o], icon: o === 'own' ? 'sort' : o === 'due' ? 'closed' : 'todo', hint: SHEET_TEXT.orderHint }))}
          value={order}
          onChange={(o) => setOrder(o as Sh.TodoOrder)}
        />
      </SheetHead>
      <div className="todo__new">
        <Icon name="plus" size={14} />
        <input
          ref={newRef}
          value={draft}
          placeholder={SHEET_TEXT.newTask}
          aria-label={SHEET_TEXT.newTask}
          title={SHEET_TEXT.newTaskHint}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.preventDefault(), add());
            else if (e.key === 'ArrowDown') (e.preventDefault(), focusRow());
          }}
        />
      </div>
      <span id={`${sheetId}-rowkeys`} className="sr-only">{SHEET_TEXT.rowKeys}</span>
      <span className="sr-only" role="status">{SHEET_TEXT.sheetInfo(all.rows.filter((r) => r.depth === 0).length, all.done.length)}</span>
      {rows.length ? (
        <ul className="todo__list" aria-label={`${v.name} – ${SHEET_TEXT.list}`} ref={listRef}>
          {rows.map((r) => row(r.note, r.depth, show === 'all' && (No.isFinished(r.note.state) || r.note.state === 'review')))}
        </ul>
      ) : (
        <p className="nblock__empty">{filter ? SHEET_TEXT.none : SHEET_TEXT.empty}</p>
      )}
      {lockMsg && (
        <p className="sheet__msg" role="status">
          <Icon name="lock" size={12} /> {lockText(lockMsg.boards)}
          {lockMsg.boards.map((b) => (
            <button key={b.id} type="button" className="note__undo" onClick={() => toBoard(b.id)}>
              {lockMsg.boards.length > 1 ? `${SHEET_TEXT.toBoard}: ${b.name}` : SHEET_TEXT.toBoard}
            </button>
          ))}
          <button type="button" className="sheet__msgx" aria-label={SHEET_TEXT.cardClose} onClick={() => setLockMsg(null)}>
            <Icon name="close" size={11} />
          </button>
        </p>
      )}
      {moving && (
        <MoveToBar ws={ws} dispatch={dispatch} sheetId={sheetId} noteId={moving} say={say} notice={notice} onClose={() => { const id = moving; setMoving(null); focusRow(id); }} />
      )}
      <NoticeLine shown={shown} />
      {show === 'open' && done.length > 0 && (
        <div className="todo__done">
          <button type="button" className="todo__donebtn" aria-expanded={openDone} title={SHEET_TEXT.doneHint} onClick={() => setOpenDone((o) => !o)}>
            <Icon name={openDone ? 'chevronDown' : 'chevronRight'} size={12} /> {SHEET_TEXT.doneCount(done.length)}
          </button>
          {openDone && (
            <ul className="todo__list" ref={undefined}>
              {done.map((n) => row(n, 0, true))}
            </ul>
          )}
        </div>
      )}
      {cardNote && (
        <CardWindow
          ws={ws}
          dispatch={dispatch}
          noteId={cardNote.id}
          where={v.name}
          sheetId={sheetId}
          say={say}
          onClose={() => {
            const id = cardNote.id;
            const cur = No.noteById(ws, id);
            if (cur && No.isEmptyDraft(ws, cur)) dispatch({ type: 'noteDiscard', id });
            setCard(null);
            focusRow(id);
          }}
        />
      )}
    </div>
  );
}
