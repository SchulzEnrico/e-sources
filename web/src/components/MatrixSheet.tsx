/**
 * F-206 Schritt 7 (V87): Eisenhower-Matrix im Pad nach Enricos Report (Abb. 17) – E1–E4.
 *
 * 2 × 2 wie im Original (V87, Enrico): senkrecht Wichtigkeit (oben sehr), waagerecht Dringlichkeit (links sehr). Oben links
 * erledigen, oben rechts planen, unten links delegieren, unten rechts ablegen mit Mülleimer in der Ecke („ablegen“ ist die Vorentscheidung,
 * erst der Mülleimer löscht – Lösch-Regeln V62). Darüber der Streifen „Noch nicht eingeordnet“. Ablegen setzt nur die
 * Schalter wichtig/dringend. Bedienung wie im Kanban (NF-08): Ziehen bzw. lange drücken, Leertaste nimmt auf.
 */
import { type Dispatch, type KeyboardEvent, type PointerEvent as RPointerEvent, useEffect, useRef, useState } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { Note, NoteView, Workspace } from '../workspace/types';
import * as No from '../workspace/notes';
import * as Sh from '../workspace/sheets';
import { loadSheetPref, saveSheetPref } from '../workspace/sheetPrefs';
import { MATRIX_TEXT as M, NOTE_TEXT, SHEET_TEXT } from '../workspace/terms';
import * as Ps from '../workspace/persons';
import { PersonPicker } from './PersonChips';
import { CardWindow, lockText, MoveToBar, NoticeLine, SheetHead, Signs, type SheetCmd, type Show, useNotice, usePersonKeys } from './SheetViews';
import { Icon } from './Icon';
import { newId } from '../workspace/workspace';

type Spot = Sh.Quad | 'trash';
type Lift = { id: string; at: Spot | null; from: Spot | null; mode: 'key' | 'drag' };
const CORNER: Record<Sh.Quad, string> = { 1: 'tl', 2: 'tr', 3: 'bl', 4: 'br' };
const ORDER: Sh.Quad[] = [1, 2, 3, 4];
const dayDe = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`;

export function MatrixSheet(props: { ws: Workspace; dispatch: Dispatch<Action>; desk: string; sheetId: string; say: (t: string) => void; cmd?: SheetCmd | null }) {
  const { ws, dispatch, sheetId, say } = props;
  const v = No.viewById(ws, sheetId)!;
  const by = ws.profile?.name || undefined;
  const [filter, setFilter] = useState('');
  const pk = usePersonKeys(ws, dispatch, by, say);
  // V88: Rad-Wahl je Sheet und Gerät merken
  const [show, setShowRaw] = useState<Show>(() => loadSheetPref(sheetId).show ?? 'open');
  const setShow = (s: Show) => (setShowRaw(s), saveSheetPref(sheetId, { show: s }));
  const [card, setCard] = useState<string | null>(null);
  const [edit, setEdit] = useState<string | null>(null);
  const [tool, setTool] = useState<{ id: string; kind: 'due' | 'delegate' } | null>(null);
  const [lift, setLiftState] = useState<Lift | null>(null);
  const liftRef = useRef<Lift | null>(null);
  const setLift = (l: Lift | null) => ((liftRef.current = l), setLiftState(l));
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const [askDel, setAskDel] = useState<{ id: string; open: number } | null>(null);
  const [lockMsg, setLockMsg] = useState<NoteView[] | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLInputElement>(null);
  const newRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState('');
  const suppress = useRef(false);
  const { notice, shown } = useNotice();
  const [moving, setMoving] = useState<string | null>(null);

  const m = Sh.matrixOf(ws, v, show);
  const pass = (n: Note) => n.id === lift?.id || (Sh.matchesFilter(No.shownNote(n), filter) && pk.pass(n));
  const unsorted = m.unsorted.filter(pass);
  const quads = Object.fromEntries(ORDER.map((q) => [q, m.quads[q].filter(pass)])) as Record<Sh.Quad, Note[]>;
  const title = (n: Note) => No.titleOf(No.shownNote(n)) || NOTE_TEXT.untitled;
  const spotOf = (n: Note): Spot | null => (Sh.unsorted(n) ? null : No.quadrantOf(n));
  const spotName = (s: Spot) => (s === 'trash' ? M.trash : Sh.QUAD_NAME[s]);
  const spotSay = (s: Spot) => (s === 'trash' ? M.trashHere : M.at(Sh.QUAD_NAME[s], Sh.QUAD_HINT[s]));
  const focusCard = (id?: string) => window.setTimeout(() => (rootRef.current?.querySelector<HTMLElement>(id ? `[data-card="${id}"]` : '[data-card]') ?? rootRef.current?.querySelector<HTMLElement>('[data-card]'))?.focus(), 0);

  const seen = useRef(props.cmd?.n ?? 0);
  useEffect(() => {
    const c = props.cmd;
    if (!c || c.n === seen.current) return;
    seen.current = c.n;
    if (c.k === 'search') return void filterRef.current?.focus();
    if (c.k === 'go' && c.id) return void (setCard(c.id), focusCard(c.id));
    // S2: Neue Aufgabe landet in „Noch nicht eingeordnet“
    if (c.k === 'new') return void newRef.current?.focus();
    setCard(null);
    focusCard();
  }, [props.cmd?.n]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Löschen (V62), Ablegen, Erledigt ----------
  const doDelete = (n: Note, keepChildren: boolean) => {
    const r = No.deleteNote(ws, n.id, { keepChildren });
    if (!r) return;
    dispatch({ type: 'noteDelete', id: n.id, keepChildren });
    setAskDel(null);
    notice({ text: M.deleted(title(n)), undo: () => dispatch({ type: 'noteRestore', undo: r.undo, by }) });
    say(M.deleted(title(n)));
    window.setTimeout(() => rootRef.current?.querySelector<HTMLElement>('[data-trash]')?.focus(), 0);
  };
  const toTrash = (n: Note) => {
    const open = No.openDescendants(ws, n.id).length;
    if (open) return setAskDel({ id: n.id, open });
    doDelete(n, false);
  };
  const place = (id: string, at: Spot) => {
    const n = No.noteById(ws, id);
    if (!n) return;
    if (at === 'trash') return toTrash(n);
    dispatch({ type: 'quadSet', view: sheetId, note: id, q: at, by });
    say(M.dropped(title(n), Sh.QUAD_NAME[at]));
    focusCard(id);
  };
  const drop = () => {
    const l = liftRef.current;
    setLift(null);
    setGhost(null);
    if (!l) return;
    if (!l.at || l.at === l.from) return focusCard(l.id);
    place(l.id, l.at);
  };
  const cancelLift = () => {
    const l = liftRef.current;
    setLift(null);
    setGhost(null);
    if (l) (say(M.cancelled), focusCard(l.id));
  };
  const toggleDone = (n: Note) => {
    const boards = Sh.lockOf(ws, n.id, sheetId);
    if (boards.length) return (setLockMsg(boards), say(lockText(boards)));
    const wasDone = No.isFinished(n.state) || n.state === 'review';
    dispatch({ type: 'sheetDone', note: n.id, here: sheetId, by });
    if (!wasDone) notice({ text: SHEET_TEXT.doneMsg(title(n)), undo: () => dispatch({ type: 'sheetDone', note: n.id, here: sheetId, by }) });
    say(wasDone ? SHEET_TEXT.uncheck(title(n)) : SHEET_TEXT.check(title(n)));
  };
  const archive = (n: Note) => {
    const prev = n.state;
    dispatch({ type: 'noteState', id: n.id, state: 'archived', by });
    notice({ text: M.archived(title(n)), undo: () => dispatch({ type: 'noteState', id: n.id, state: prev, by }) });
    say(M.archived(title(n)));
  };

  // ---------- Tastatur ----------
  const step = (s: Spot | null, key: string): Spot | null => {
    if (s === null) return key.startsWith('Arrow') ? 1 : null;
    if (s === 'trash') return key === 'ArrowLeft' || key === 'ArrowUp' ? 4 : 'trash';
    const [r, c] = Sh.QUAD_CELL[s];
    if (s === 4 && (key === 'ArrowRight' || key === 'ArrowDown')) return 'trash';
    if (key === 'ArrowLeft') return Sh.quadAt(r, 0);
    if (key === 'ArrowRight') return Sh.quadAt(r, 1);
    if (key === 'ArrowUp') return Sh.quadAt(0, c);
    if (key === 'ArrowDown') return Sh.quadAt(1, c);
    return s;
  };
  const groups = () => [...(rootRef.current?.querySelectorAll<HTMLElement>('[data-group]') ?? [])];
  const cardsIn = (g?: HTMLElement) => [...(g?.querySelectorAll<HTMLElement>('[data-card]') ?? [])];
  const cardKey = (e: KeyboardEvent<HTMLElement>, n: Note) => {
    const l = liftRef.current;
    if (l && l.id === n.id && l.mode === 'key') {
      if (e.key === ' ' || e.key === 'Enter') return void (e.preventDefault(), drop());
      if (e.key === 'Escape') return void (e.preventDefault(), e.stopPropagation(), cancelLift());
      if (e.key === 'Tab') return void cancelLift();
      if (!e.key.startsWith('Arrow')) return;
      e.preventDefault();
      const at = step(l.at, e.key);
      if (at && at !== l.at) (setLift({ ...l, at }), say(spotSay(at)));
      return;
    }
    const gs = groups();
    const g = e.currentTarget.closest<HTMLElement>('[data-group]')!;
    const mine = cardsIn(g);
    const i = mine.indexOf(e.currentTarget);
    const key = g.dataset.group!;
    const goGroup = (k: string) => {
      const t = gs.find((x) => x.dataset.group === k);
      const list = cardsIn(t);
      (list[Math.min(i, list.length - 1)] ?? t?.querySelector<HTMLElement>('[data-cell]'))?.focus();
    };
    const q = key === 'u' ? null : (Number(key) as Sh.Quad);
    // V153: Alt+↑/↓ stellt im Feld um (eigene Reihenfolge), Meldung am Ort über die Ansage, Fokus bleibt auf der Karte
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && e.altKey) {
      e.preventDefault();
      const d = e.key === 'ArrowUp' ? -1 : 1;
      if (!mine[i + d]) return say(d < 0 ? M.orderTop : M.orderEnd);
      dispatch({ type: 'sheetShift', view: sheetId, note: n.id, by: d });
      say(SHEET_TEXT.moved(d));
      const id = n.id;
      return focusCard(id);
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (mine[i + 1]) return mine[i + 1].focus();
      if (q === null) return goGroup('1');
      if (Sh.QUAD_CELL[q][0] === 0) return goGroup(String(Sh.quadAt(1, Sh.QUAD_CELL[q][1])));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (i > 0) return mine[i - 1].focus();
      if (q === null) return filterRef.current?.focus();
      if (Sh.QUAD_CELL[q][0] === 1) return goGroup(String(Sh.quadAt(0, Sh.QUAD_CELL[q][1])));
      return goGroup('u');
    }
    // V158: Alt/⌥+←/→ bleibt beim Pad (tauscht mit dem Nachbarn)
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !e.altKey) {
      e.preventDefault();
      if (q === null) return mine[i + (e.key === 'ArrowLeft' ? -1 : 1)]?.focus();
      return goGroup(String(Sh.quadAt(Sh.QUAD_CELL[q][0], e.key === 'ArrowLeft' ? 0 : 1)));
    }
    if (e.key === 'Home') return void (e.preventDefault(), mine[0]?.focus());
    if (e.key === 'End') return void (e.preventDefault(), mine[mine.length - 1]?.focus());
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) return void (e.preventDefault(), toggleDone(n));
    if (e.key === ' ') {
      e.preventDefault();
      const s = spotOf(n);
      setLift({ id: n.id, at: s, from: s, mode: 'key' });
      return say(`${M.lifted(title(n))}${s ? ` ${spotSay(s)}` : ''}`);
    }
    // V88 (F/K4): V = Verschieben nach … (Ziel-Sheet wählen)
    if (pk.onKey(e, n)) return;
    if ((e.key === 'v' || e.key === 'V') && !e.ctrlKey && !e.metaKey && !e.altKey) return void (e.preventDefault(), setMoving(n.id));
    if (e.key === 'F2') return void (e.preventDefault(), setEdit(n.id));
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      if (!v.ids.includes(n.id)) return say(M.notHere);
      const before = v;
      dispatch({ type: 'sheetRemove', view: sheetId, note: n.id, by });
      notice({ text: SHEET_TEXT.removed(title(n)), undo: () => dispatch({ type: 'sheetRestore', view: before }) });
      return void (mine[i + 1] ?? mine[i - 1])?.focus();
    }
  };

  // ---------- Ziehen (wie Kanban) ----------
  const hit = (x: number, y: number): Spot | null => {
    const els = [...(rootRef.current?.querySelectorAll<HTMLElement>('[data-trash], [data-cell]') ?? [])];
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return el.dataset.trash !== undefined ? 'trash' : (Number(el.dataset.cell) as Sh.Quad);
    }
    return null;
  };
  const startPointer = (e: RPointerEvent<HTMLElement>, n: Note) => {
    if (e.button !== 0 || liftRef.current || edit) return;
    const touch = e.pointerType !== 'mouse';
    const x0 = e.clientX;
    const y0 = e.clientY;
    let dragging = false;
    let timer = 0;
    const begin = (x: number, y: number) => {
      dragging = true;
      const s = spotOf(n);
      setLift({ id: n.id, at: s, from: s, mode: 'drag' });
      setGhost({ x, y });
      say(M.lifted(title(n)));
    };
    const noScroll = (ev: TouchEvent) => dragging && ev.preventDefault();
    const move = (ev: PointerEvent) => {
      const d = Math.hypot(ev.clientX - x0, ev.clientY - y0);
      if (!dragging) {
        if (touch && d > 8) return end(false);
        if (touch || d <= 5) return;
        begin(ev.clientX, ev.clientY);
      }
      setGhost({ x: ev.clientX, y: ev.clientY });
      const at = hit(ev.clientX, ev.clientY);
      const l = liftRef.current;
      if (l && at !== l.at && at) setLift({ ...l, at });
    };
    const end = (doDrop: boolean) => {
      window.clearTimeout(timer);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('touchmove', noScroll);
      if (!dragging) return;
      suppress.current = true;
      window.setTimeout(() => (suppress.current = false), 0);
      if (doDrop) drop();
      else cancelLift();
    };
    const up = () => end(true);
    const cancel = () => end(false);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('touchmove', noScroll, { passive: false });
    if (touch) timer = window.setTimeout(() => begin(x0, y0), 450);
  };

  // ---------- Darstellung ----------
  const cardView = (n: Note) => {
    const t = title(n);
    const fin = No.isFinished(n.state) || n.state === 'review';
    const lock = Sh.lockOf(ws, n.id, sheetId);
    const q = spotOf(n);
    return (
      <li key={n.id} className={`kcard mcard${fin ? ' is-done is-dim' : ''}${lift?.id === n.id ? ' is-lifted' : ''}${pk.mark(n)}`}>
        {pk.picker(n, () => focusCard(n.id))}
        <div className="kcard__top">
          <button
            type="button"
            role="checkbox"
            aria-checked={fin}
            tabIndex={-1}
            className={`kcard__done${lock.length ? ' is-locked' : ''}`}
            title={lock.length ? SHEET_TEXT.lockedHint(lock.map((b) => b.name).join(', ')) : fin ? SHEET_TEXT.uncheck(t) : SHEET_TEXT.check(t)}
            aria-label={lock.length ? SHEET_TEXT.lockedHint(lock.map((b) => b.name).join(', ')) : t}
            onClick={() => toggleDone(n)}
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
                  focusCard(n.id);
                } else if (e.key === 'Escape') {
                  e.stopPropagation();
                  setEdit(null);
                  focusCard(n.id);
                }
              }}
              onBlur={() => setEdit(null)}
            />
          ) : (
            <button
              type="button"
              data-card={n.id}
              className="kcard__main"
              aria-describedby={`${sheetId}-mkeys`}
              title={`${SHEET_TEXT.open(t)} – ${M.cardKeys}`}
              onClick={() => !suppress.current && !liftRef.current && setCard(n.id)}
              onKeyDown={(e) => cardKey(e, n)}
              onPointerDown={(e) => startPointer(e, n)}
              onContextMenu={(e) => liftRef.current && e.preventDefault()}
            >
              <span className="kcard__title">{t}</span>
              <Signs ws={ws} n={n} />
              {lock.length > 0 && <span className="sr-only">, {lockText(lock)}</span>}
            </button>
          )}
        </div>
        {/* E4: Knöpfe am Feld – planen → Termin, delegieren → Delegieren an, ablegen → Archivieren */}
        {q === 2 && (tool?.id === n.id && tool.kind === 'due' ? (
          <input
            type="date"
            className="todo__edit mcard__field"
            autoFocus
            defaultValue={n.due ?? ''}
            aria-label={`${M.dueHint}: ${t}`}
            onKeyDown={(e) => e.key === 'Escape' && (e.stopPropagation(), setTool(null), focusCard(n.id))}
            onChange={(e) => {
              const d = e.currentTarget.value;
              if (!d) return;
              dispatch({ type: 'noteEdit', id: n.id, patch: { due: d }, by });
              say(M.dueSet(t, dayDe(d)));
            }}
            onBlur={() => setTool(null)}
          />
        ) : (
          <button type="button" className="mcard__act" title={M.dueHint} onClick={() => setTool({ id: n.id, kind: 'due' })}>
            <Icon name="recent" size={11} /> {M.due}
          </button>
        ))}
        {q === 3 && (tool?.id === n.id && tool.kind === 'delegate' ? (
          // V94 (P4/B3): Delegieren an … = Personenauswahl; setzt Zuständig und merkt „delegiert von mir“
          <PersonPicker
            ws={ws}
            current={n.delegated?.person}
            noNone
            label={`${M.delegate} ${t}`}
            onPick={(id) => {
              setTool(null);
              const p = id ? Ps.personById(ws, id) : undefined;
              if (p) (dispatch({ type: 'noteDelegate', id: n.id, person: p.id, by }), say(M.delegateSet(t, p.name)));
              focusCard(n.id);
            }}
            onCreate={(name) => {
              setTool(null);
              const r = Ps.addPerson(ws, name);
              if (r) (dispatch({ type: 'personAdd', name, by }), dispatch({ type: 'noteDelegate', id: n.id, person: r.id, by }), say(M.delegateSet(t, name)));
              focusCard(n.id);
            }}
            onClose={() => (setTool(null), focusCard(n.id))}
          />
        ) : (
          <button type="button" className="mcard__act" onClick={() => setTool({ id: n.id, kind: 'delegate' })}>
            <Icon name="send" size={11} /> {M.delegate}
          </button>
        ))}
        {q === 4 && !fin && (
          <button type="button" className="mcard__act" onClick={() => archive(n)}>
            <Icon name="closed" size={11} /> {M.archive}
          </button>
        )}
        {askDel?.id === n.id && (
          <p className="sheet__msg kcard__ask" role="alertdialog" aria-label={M.askKids(t, askDel.open)}>
            {M.askKids(t, askDel.open)}
            <button type="button" className="note__undo" autoFocus onClick={() => doDelete(n, false)}>
              {M.withKids}
            </button>
            <button type="button" className="note__undo" onClick={() => doDelete(n, true)}>
              {M.onlyThis}
            </button>
            <button type="button" className="note__undo" onClick={() => (setAskDel(null), focusCard(n.id))}>
              {M.cancel}
            </button>
          </p>
        )}
      </li>
    );
  };

  const cell = (q: Sh.Quad) => {
    const list = quads[q];
    const target = lift?.at === q;
    return (
      <section key={q} className={`mcell mcell--${CORNER[q]}${target ? ' is-target' : ''}`} data-group={String(q)} aria-label={`${M.field(Sh.QUAD_NAME[q], Sh.QUAD_HINT[q])}, ${list.length}`}>
        <span className="mcell__name" data-cell={q} tabIndex={-1} title={Sh.QUAD_HINT[q]}>
          {Sh.QUAD_NAME[q]}
        </span>
        <div className="mcell__drop" data-cell={q}>
          <ul className="mcell__list">{list.map(cardView)}</ul>
          {!list.length && <p className="mcell__empty">{M.empty}</p>}
        </div>
        {q === 4 && (
          <button
            type="button"
            data-trash=""
            className={`mtrash${lift?.at === 'trash' ? ' is-target' : ''}`}
            title={M.trashHint}
            aria-label={`${M.trash} – ${M.trashHint}`}
            onClick={() => (liftRef.current ? (setLift({ ...liftRef.current, at: 'trash' }), drop()) : say(M.trashNeedCard))}
          >
            <Icon name="trash" size={18} />
          </button>
        )}
      </section>
    );
  };

  const cardNote = card ? No.noteById(ws, card) : undefined;
  const ghostNote = lift && ghost ? No.noteById(ws, lift.id) : undefined;
  const total = unsorted.length + ORDER.reduce((s, q) => s + quads[q].length, 0);
  return (
    <div ref={rootRef} className={`sheet sheet--matrix${lift?.mode === 'drag' ? ' is-dragging' : ''}`}>
      <SheetHead id={sheetId} filter={filter} onFilter={setFilter} show={show} onShow={setShow} onDown={() => focusCard()} filterRef={filterRef} who={pk.who} onWho={pk.setWho} />
      <span id={`${sheetId}-mkeys`} className="sr-only">{M.cardKeys}</span>
      <span className="sr-only" role="status">{M.info(total, unsorted.length)}</span>
      {moving && (
        <MoveToBar ws={ws} dispatch={dispatch} sheetId={sheetId} noteId={moving} say={say} notice={notice} onClose={() => { const id = moving; setMoving(null); focusCard(id); }} />
      )}
      <NoticeLine shown={shown} />
      {lockMsg && (
        <p className="sheet__msg" role="status">
          <Icon name="lock" size={12} /> {lockText(lockMsg)}
          {lockMsg.map((b) => (
            <button key={b.id} type="button" className="note__undo" onClick={() => (setLockMsg(null), dispatch({ type: 'padOpen', desk: props.desk, ref: { view: b.id }, ids: [newId(), newId(), newId()] }))}>
              {lockMsg.length > 1 ? `${SHEET_TEXT.toBoard}: ${b.name}` : SHEET_TEXT.toBoard}
            </button>
          ))}
          <button type="button" className="sheet__msgx" aria-label={SHEET_TEXT.cardClose} onClick={() => setLockMsg(null)}>
            <Icon name="close" size={11} />
          </button>
        </p>
      )}
      <section className="mstrip" data-group="u" aria-label={`${M.unsorted}, ${unsorted.length}`} title={M.unsortedHint}>
        <span className="mstrip__name">{M.unsorted}</span>
        {unsorted.length ? <ul className="mstrip__list">{unsorted.map(cardView)}</ul> : <span className="mcell__empty">{M.unsortedNone}</span>}
        <div className="todo__new mstrip__new">
          <Icon name="plus" size={14} />
          <input
            ref={newRef}
            value={draft}
            placeholder={SHEET_TEXT.newTask}
            aria-label={`${SHEET_TEXT.newTask} – ${M.unsorted}`}
            title={SHEET_TEXT.newTaskHint}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && draft.trim()) {
                e.preventDefault();
                dispatch({ type: 'sheetAdd', view: sheetId, title: draft, note: newId(), by });
                say(`${draft.trim()} – ${M.unsorted}`);
                setDraft('');
              } else if (e.key === 'ArrowDown') (e.preventDefault(), focusCard());
            }}
          />
        </div>
      </section>
      {/* V147 (V140 offen): für wen und wann – wie im Kopf von 15.2 (Abb. 17) */}
      {(v.person || v.date) && <p className="matrix__who">{M.who(v.person, v.date ? v.date.split('-').reverse().join('.') : undefined)}</p>}
      <div className="matrix" role="group" aria-label={M.matrix(v.name)}>
        <div className="matrix__y" aria-hidden="true">
          <span>{M.very}</span>
          <b>{M.importance}</b>
          <span>{M.not}</span>
        </div>
        {ORDER.map(cell)}
        <div className="matrix__x" aria-hidden="true">
          <span>{M.very}</span>
          <b>{M.urgency}</b>
          <span>{M.not}</span>
        </div>
      </div>
      {ghostNote && ghost && (
        <div className={`kcard kcard--ghost${lift?.at === 'trash' ? ' is-trash' : ''}`} style={{ left: ghost.x, top: ghost.y }} aria-hidden="true">
          <span className="kcard__title">{title(ghostNote)}</span>
          {lift?.at && <span className="sign">{spotName(lift.at)}</span>}
        </div>
      )}
      {cardNote && (
        <CardWindow
          ws={ws}
          dispatch={dispatch}
          noteId={cardNote.id}
          where={Sh.unsorted(cardNote) ? M.unsorted : Sh.QUAD_NAME[No.quadrantOf(cardNote)]}
          sheetId={sheetId}
          say={say}
          onClose={() => {
            const id = cardNote.id;
            const cur = No.noteById(ws, id);
            if (cur && No.isEmptyDraft(ws, cur)) dispatch({ type: 'noteDiscard', id });
            setCard(null);
            focusCard(id);
          }}
        />
      )}
    </div>
  );
}
