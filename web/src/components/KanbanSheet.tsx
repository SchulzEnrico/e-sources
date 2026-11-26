/**
 * F-206 Schritt 7 (V87): Kanban-Board im Pad – an Trello und unserer UX/UI ausgerichtet (K1–K5, L2).
 *
 * Spalten wie Trello-Listen nebeneinander (waagerecht scrollbar), Kopf mit Name, Bedeutung, Zähler „3 / 4“ und ⋮;
 * „+ Karte hinzufügen“ unten je Spalte, „+ Spalte“ rechts (bis 8). Karten im Clay-Stil mit Zeichen, Erledigt-Kreis
 * (Hover/Fokus) und den nächsten drei offenen Unter-Notizen. Ziehen mit Maus bzw. lange drücken auf Touch; Tastatur:
 * Leertaste nimmt auf, Pfeile bewegen, Leertaste/Enter legt ab, Esc bricht ab. WIP-Limit fragt, sperrt nicht (K3).
 */
import { type Dispatch, type KeyboardEvent, type PointerEvent as RPointerEvent, useEffect, useRef, useState } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { ColState, Note, NoteColumn, Workspace } from '../workspace/types';
import type { IconName } from '../workspace/icons';
import * as No from '../workspace/notes';
import * as Sh from '../workspace/sheets';
import { foldsDone, switchOf } from '../workspace/ruleSet';
import { hasRight, meOf } from '../workspace/persons';
import { loadSheetPref, saveSheetPref } from '../workspace/sheetPrefs';
import { KANBAN_MORE_TEXT as KM_T, KANBAN_TEXT as K, NOTE_TEXT, SHEET_TEXT } from '../workspace/terms';
import * as KM from '../workspace/kanbanMore';
import { ArchivePanel, CopyBar } from './KanbanMore';
import { FilterButton, FilterPanel, TagChips, TagPanel } from './KanbanTags';
import * as CF from '../workspace/cardFilter';
import * as Tg from '../workspace/tags';
import { KVIEW_TEXT, STATS_TEXT, TAG_TEXT } from '../workspace/terms';
import { KanbanCalendar, KanbanTable } from './KanbanViews';
import { KanbanTimeline } from './KanbanTimeline';
import { KanbanStats } from './KanbanStats';
import { ModeWheel } from './ModeWheel';
import type { KView } from '../workspace/sheetPrefs';
import { newId } from '../workspace/workspace';
import { CardWindow, MoveToBar, NoticeLine, SheetHead, Signs, type SheetCmd, type Show, useFoldTick, useNotice, usePersonKeys } from './SheetViews';
import { Item, Menu, MenuPages } from './PanelFrame';
import { Icon } from './Icon';

export const COL_STATE_ICON: Record<ColState, IconName> = { open: 'todo', doing: 'play', review: 'show', done: 'check' };
const COL_STATES: ColState[] = ['open', 'doing', 'review', 'done'];

type Lift = { id: string; col: string; index: number; from: { col: string; index: number }; mode: 'key' | 'drag' };
type Ask = { kind: 'wip'; col: string; text: string; run: () => void } | { kind: 'review'; id: string } | { kind: 'noRight'; id: string };

const finished = (n: Note) => No.isFinished(n.state);

/** BC2 (V87): Klick auf eine Spalte im Mini-Board des Cockpits – Board zeigen, Fokus in diese Spalte. */
let pendingCol: { sheet: string; col: string } | null = null;
export function focusColLater(sheet: string, col: string) {
  pendingCol = { sheet, col };
  // nach dem Zeigen des Pads (das setzt den Fokus zuerst auf den Reiter)
  window.setTimeout(() => window.dispatchEvent(new CustomEvent('esource:kanbancol')), 450);
}

export function KanbanSheet(props: { ws: Workspace; dispatch: Dispatch<Action>; desk: string; sheetId: string; say: (t: string) => void; cmd?: SheetCmd | null }) {
  const { ws, dispatch, sheetId, say } = props;
  useFoldTick(ws);
  const v = No.viewById(ws, sheetId)!;
  const cols = v.cols ?? [];
  const by = ws.profile?.name || undefined;
  const [filter, setFilter] = useState('');
  const pk = usePersonKeys(ws, dispatch, by, say);
  // V88: Rad-Wahl je Sheet und Gerät merken
  const [show, setShowRaw] = useState<Show>(() => loadSheetPref(sheetId).show ?? 'open');
  const setShow = (s: Show) => (setShowRaw(s), saveSheetPref(sheetId, { show: s }));
  const [card, setCard] = useState<string | null>(null);
  const [edit, setEdit] = useState<string | null>(null);
  const [colEdit, setColEdit] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [newCol, setNewCol] = useState<string | null>(null);
  const [lift, setLiftState] = useState<Lift | null>(null);
  const liftRef = useRef<Lift | null>(null);
  const setLift = (l: Lift | null) => ((liftRef.current = l), setLiftState(l));
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const [ask, setAsk] = useState<Ask | null>(null);
  const [openDone, setOpenDone] = useState<Set<string>>(new Set());
  const boardRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLInputElement>(null);
  const suppress = useRef(false);
  const { notice, shown } = useNotice();
  const [moving, setMoving] = useState<string | null>(null);
  // V121 (F-231 K1, K3): Kopieren-Leiste, Archiv, „oben anlegen“
  const [copying, setCopying] = useState<string | null>(null);
  const [archOpen, setArchOpen] = useState(false);
  const [addTop, setAddTop] = useState(0);
  const archBtn = useRef<HTMLButtonElement>(null);
  // V122 (F-231 K4): Kartenfilter (je Sheet und Gerät gemerkt) und Tag-Verwaltung
  const [cf, setCfRaw] = useState<CF.CardFilter>(() => loadSheetPref(sheetId).filter ?? CF.FILTER_EMPTY);
  const setCf = (f: CF.CardFilter) => (setCfRaw(f), saveSheetPref(sheetId, { filter: CF.filterCount(f) || f.mode === 'all' ? f : undefined }));
  const [filterOpen, setFilterOpen] = useState(false);
  // V122 (F-231 K13, T6): Rad „Ansicht“ – Board | Tabelle | Kalender (je Sheet und Gerät gemerkt)
  const [kview, setKviewRaw] = useState<KView>(() => loadSheetPref(sheetId).kview ?? 'board');
  const setKview = (x: KView) => (setKviewRaw(x), saveSheetPref(sheetId, { kview: x }));
  const [tagsOpen, setTagsOpen] = useState(false);
  const filterBtn = useRef<HTMLButtonElement>(null);
  const tagsBtn = useRef<HTMLButtonElement>(null);
  /** Karte sichtbar nach Suche, „Nur meine“ und Kartenfilter (gilt in jeder Ansicht gleich). */
  const passes = (n: Note) => Sh.matchesFilter(No.shownNote(n), filter) && pk.pass(n) && CF.passes(ws, n, cf);
  useEffect(() => {
    const open = (e: Event) => (e as CustomEvent<string>).detail === sheetId && setArchOpen(true);
    const tags = (e: Event) => (e as CustomEvent<string>).detail === sheetId && setTagsOpen(true);
    window.addEventListener('esource:kanbanarchive', open);
    window.addEventListener('esource:kanbantags', tags);
    return () => (window.removeEventListener('esource:kanbanarchive', open), window.removeEventListener('esource:kanbantags', tags));
  }, [sheetId]);

  const title = (n: Note) => No.titleOf(No.shownNote(n)) || NOTE_TEXT.untitled;
  const colById = (id: string) => cols.find((c) => c.id === id);
  /** Fokus auf die Karte; ist sie nicht mehr sichtbar (z. B. eingeklappt erledigt), auf den Nachbarn bzw. „+ Karte hinzufügen“. */
  const focusCard = (id?: string, near?: { col: string; next?: string }) =>
    window.setTimeout(() => {
      const b = boardRef.current;
      const el =
        b?.querySelector<HTMLElement>(id ? `[data-card="${id}"]` : '[data-card]') ??
        (near?.next ? b?.querySelector<HTMLElement>(`[data-card="${near.next}"]`) : null) ??
        (near ? b?.querySelector<HTMLElement>(`[data-add="${near.col}"]`) : null);
      el?.focus({ preventScroll: false });
    }, 0);
  /** Nachbar in der sichtbaren Spalte (für den Fokus, wenn die Karte verschwindet). */
  const nearOf = (id: string, col: string) => {
    const list = [...(boardRef.current?.querySelectorAll<HTMLElement>(`[data-colbody="${col}"] [data-card]`) ?? [])].map((x) => x.dataset.card!);
    const i = list.indexOf(id);
    return { col, next: list[i + 1] ?? list[i - 1] };
  };
  const focusAdd = (col: string) => window.setTimeout(() => boardRef.current?.querySelector<HTMLElement>(`[data-add="${col}"]`)?.focus(), 0);

  // BC2: Fokus aus dem Cockpit in eine Spalte
  useEffect(() => {
    const take = () => {
      if (!pendingCol || pendingCol.sheet !== sheetId) return;
      const col = pendingCol.col;
      pendingCol = null;
      const b = boardRef.current;
      const el = b?.querySelector<HTMLElement>(`[data-colbody="${col}"] [data-card]`) ?? b?.querySelector<HTMLElement>(`[data-add="${col}"]`);
      el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      el?.focus({ preventScroll: true });
    };
    window.addEventListener('esource:kanbancol', take);
    return () => window.removeEventListener('esource:kanbancol', take);
  }, [sheetId]);

  // Fußleiste (S2): Home = Board, Neue Aufgabe = Karte in der ersten Spalte, Suche = Filter, go = Karte öffnen
  const seen = useRef(props.cmd?.n ?? 0);
  useEffect(() => {
    const c = props.cmd;
    if (!c || c.n === seen.current) return;
    seen.current = c.n;
    if (c.k === 'new') return void (cols[0] && (setDraft(''), setAdding(cols[0].id)));
    if (c.k === 'search') return void filterRef.current?.focus();
    if (c.k === 'go' && c.id) return void (setCard(c.id), focusCard(c.id));
    setCard(null);
    focusCard();
  }, [props.cmd?.n]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ids je Spalte, wie sie gerade erscheinen (aufgenommene Karte an ihrem neuen Platz)
  const idsOf = (c: NoteColumn): string[] => {
    if (!lift) return c.ids;
    const ids = c.ids.filter((x) => x !== lift.id);
    if (c.id === lift.col) ids.splice(Math.min(lift.index, ids.length), 0, lift.id);
    return ids;
  };
  const restOf = (colId: string) => (colById(colId)?.ids ?? []).filter((x) => x !== lift?.id);

  // ---------- Ablegen, Erledigt, Abnahme ----------
  /** F-218 A2 (V92): WIP-Limit – nachfragen (Werk, K3), sperren oder nur kennzeichnen (Zähler wird rot). */
  const wipGate = (col: NoteColumn, run: () => void) => {
    const mode = switchOf(ws, 'wip');
    if (mode === 'mark') return run();
    if (mode === 'block') {
      notice({ text: K.wipBlocked(col.wip!, col.name) });
      return say(K.wipBlocked(col.wip!, col.name));
    }
    setAsk({ kind: 'wip', col: col.id, text: K.wipAsk(col.wip!, col.name), run });
  };
  const commit = (id: string, col: string, index: number | undefined, origin?: string) => {
    const target = colById(col);
    const n = No.noteById(ws, id);
    if (!target || !n) return;
    const run = () => {
      dispatch({ type: 'cardMove', view: sheetId, note: id, col, index, by });
      const pos = index === undefined ? target.ids.filter((x) => x !== id).length + 1 : index + 1;
      const of = target.ids.filter((x) => x !== id).length + 1;
      say(K.dropped(title(n), target.name, pos, of));
      focusCard(id);
    };
    if (origin !== col && Sh.overWip(target, 1, ws)) return wipGate(target, run);
    run();
  };
  const drop = () => {
    const l = liftRef.current;
    if (!l) return;
    setLift(null);
    setGhost(null);
    if (l.col === l.from.col && l.index === l.from.index) return focusCard(l.id);
    commit(l.id, l.col, l.index, l.from.col);
  };
  const cancelLift = () => {
    const l = liftRef.current;
    setLift(null);
    setGhost(null);
    if (l) (say(K.cancelled), focusCard(l.id));
  };
  const toggleDone = (n: Note) => {
    const here = Sh.colOf(v, n.id);
    if (!here) return;
    const fin = finished(n) || n.state === 'review';
    const to = fin ? Sh.firstCol(v, 'open') : (Sh.firstCol(v, 'done') ?? Sh.firstCol(v, 'review'));
    const back = { col: here.id, index: here.ids.indexOf(n.id) };
    if (to && to.id !== here.id) dispatch({ type: 'cardMove', view: sheetId, note: n.id, col: to.id, by });
    else dispatch({ type: 'sheetDone', note: n.id, here: sheetId, by });
    if (!fin) notice({ text: K.doneMsg(title(n), to?.name ?? here.name), undo: () => dispatch({ type: 'cardMove', view: sheetId, note: n.id, col: back.col, index: back.index, by }) });
    say(fin ? SHEET_TEXT.uncheck(title(n)) : K.doneMsg(title(n), to?.name ?? here.name));
    focusCard(n.id, nearOf(n.id, here.id));
  };
  const remove = (n: Note) => {
    const before = v;
    dispatch({ type: 'sheetRemove', view: sheetId, note: n.id, by });
    notice({ text: SHEET_TEXT.removed(title(n)), undo: () => dispatch({ type: 'sheetRestore', view: before }) });
  };
  /** V121 (K1): Karte archivieren – verschwindet aus dem Board, steht im Archiv; Rückgängig am Ort. */
  const archive = (n: Note, near?: { col: string; next?: string }) => {
    const before = ws;
    dispatch({ type: 'cardArchive', note: n.id, by });
    notice({ text: KM_T.archivedCard(title(n)), undo: () => dispatch({ type: 'exchange', ws: before }) });
    say(KM_T.archivedCard(title(n)));
    focusCard(undefined, near);
  };
  const toggleTpl = (n: Note) => {
    dispatch({ type: 'cardTemplate', note: n.id, on: !n.template });
    say(n.template ? KM_T.tplOff(title(n)) : KM_T.tplOn(title(n)));
  };
  const addCard = (col: NoteColumn) => {
    const t = draft.trim();
    if (!t) return;
    const run = () => {
      dispatch({ type: 'sheetAdd', view: sheetId, title: t, note: newId(), col: col.id, by, ...(addTop ? { index: addTop - 1 } : {}) });
      if (addTop) setAddTop(addTop + 1);
      say(`${t} – ${K.col(col.name)}`);
      setDraft('');
      setAsk(null);
      window.setTimeout(() => boardRef.current?.querySelector<HTMLElement>(`[data-addin="${col.id}"]`)?.focus(), 0);
    };
    if (Sh.overWip(col, 1, ws)) return wipGate(col, run);
    run();
  };
  const removeCol = (c: NoteColumn) => {
    const i = cols.findIndex((x) => x.id === c.id);
    if (cols.length <= 1) return say(K.removeLast);
    const to = cols[i > 0 ? i - 1 : 1];
    const before = v;
    dispatch({ type: 'colRemove', view: sheetId, col: c.id });
    notice({ text: K.removed(c.name, to.name), undo: () => dispatch({ type: 'sheetRestore', view: before }) });
    focusAdd(to.id);
  };

  // ---------- Tastatur auf der Karte (K4) ----------
  const cardKey = (e: KeyboardEvent<HTMLElement>, n: Note, c: NoteColumn) => {
    const l = liftRef.current;
    if (l && l.id === n.id && l.mode === 'key') {
      const ci = cols.findIndex((x) => x.id === l.col);
      let next: Lift | null = null;
      if (e.key === 'ArrowUp') next = { ...l, index: Math.max(0, l.index - 1) };
      else if (e.key === 'ArrowDown') next = { ...l, index: Math.min(restOf(l.col).length, l.index + 1) };
      else if (e.key === 'ArrowLeft' && ci > 0) next = { ...l, col: cols[ci - 1].id, index: Math.min(l.index, restOf(cols[ci - 1].id).length) };
      else if (e.key === 'ArrowRight' && ci < cols.length - 1) next = { ...l, col: cols[ci + 1].id, index: Math.min(l.index, restOf(cols[ci + 1].id).length) };
      else if (e.key === ' ' || e.key === 'Enter') return void (e.preventDefault(), drop());
      else if (e.key === 'Escape') return void (e.preventDefault(), e.stopPropagation(), cancelLift());
      else if (e.key === 'Tab') return void cancelLift();
      if (e.key.startsWith('Arrow')) e.preventDefault();
      if (next) {
        setLift(next);
        const to = colById(next.col)!;
        say(K.at(to.name, next.index + 1, restOf(next.col).length + 1) + (Sh.overWip(to, next.col === l.from.col ? 0 : 1, ws) ? `, ${K.over}` : ''));
        focusCard(n.id);
      }
      return;
    }
    const colEls = [...(boardRef.current?.querySelectorAll<HTMLElement>('[data-colbody]') ?? [])];
    const ci = colEls.findIndex((x) => x.dataset.colbody === c.id);
    const inCol = (k: number) => [...(colEls[k]?.querySelectorAll<HTMLElement>('[data-card]') ?? [])];
    const mine = inCol(ci);
    const i = mine.indexOf(e.currentTarget);
    const side = (k: number) => {
      const list = inCol(k);
      (list[Math.min(i, list.length - 1)] ?? boardRef.current?.querySelector<HTMLElement>(`[data-add="${colEls[k]?.dataset.colbody}"]`))?.focus();
    };
    if (e.key === 'ArrowDown') return void (e.preventDefault(), mine[i + 1]?.focus());
    if (e.key === 'ArrowUp') return void (e.preventDefault(), i > 0 ? mine[i - 1].focus() : filterRef.current?.focus());
    if (e.key === 'ArrowLeft') return void (e.preventDefault(), ci > 0 && side(ci - 1));
    if (e.key === 'ArrowRight') return void (e.preventDefault(), ci < colEls.length - 1 && side(ci + 1));
    if (e.key === 'Home') return void (e.preventDefault(), mine[0]?.focus());
    if (e.key === 'End') return void (e.preventDefault(), mine[mine.length - 1]?.focus());
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) return void (e.preventDefault(), toggleDone(n));
    if (e.key === ' ') {
      e.preventDefault();
      const index = c.ids.indexOf(n.id);
      setLift({ id: n.id, col: c.id, index, from: { col: c.id, index }, mode: 'key' });
      return say(`${K.lifted(title(n))} ${K.at(c.name, index + 1, c.ids.length)}`);
    }
    // V88 (F/K4): V = Verschieben nach … (Ziel-Sheet wählen)
    if (pk.onKey(e, n)) return;
    if ((e.key === 'v' || e.key === 'V') && !e.ctrlKey && !e.metaKey && !e.altKey) return void (e.preventDefault(), setMoving(n.id));
    // V121 (K1): K = kopieren, C = archivieren (wie Trello)
    if ((e.key === 'k' || e.key === 'K') && !e.ctrlKey && !e.metaKey && !e.altKey) return void (e.preventDefault(), setCopying(n.id));
    if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey && !e.altKey) return void (e.preventDefault(), archive(n, nearOf(n.id, c.id)));
    if (e.key === 'F2') return void (e.preventDefault(), setEdit(n.id));
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      remove(n);
      return void (mine[i + 1] ?? mine[i - 1])?.focus();
    }
  };

  // ---------- Ziehen mit Maus und Touch ----------
  const target = (x: number, y: number): { col: string; index: number } | null => {
    const bodies = [...(boardRef.current?.querySelectorAll<HTMLElement>('[data-colbody]') ?? [])];
    if (!bodies.length) return null;
    let best = bodies[0];
    let dist = Infinity;
    for (const b of bodies) {
      const r = b.getBoundingClientRect();
      const d = x < r.left ? r.left - x : x > r.right ? x - r.right : 0;
      if (d < dist) (dist = d), (best = b);
    }
    const col = best.dataset.colbody!;
    const l = liftRef.current!;
    const seenIds = [...best.querySelectorAll<HTMLElement>('[data-cardli]')].filter((el) => el.dataset.cardli !== l.id);
    let iv = seenIds.findIndex((el) => {
      const r = el.getBoundingClientRect();
      return y < r.top + r.height / 2;
    });
    if (iv < 0) iv = seenIds.length;
    const full = restOf(col);
    const index = iv < seenIds.length ? full.indexOf(seenIds[iv].dataset.cardli!) : seenIds.length ? full.indexOf(seenIds[seenIds.length - 1].dataset.cardli!) + 1 : full.length;
    return { col, index: Math.max(0, index) };
  };
  const startPointer = (e: RPointerEvent<HTMLElement>, n: Note, c: NoteColumn) => {
    if (e.button !== 0 || liftRef.current || edit) return;
    const touch = e.pointerType !== 'mouse';
    const x0 = e.clientX;
    const y0 = e.clientY;
    let dragging = false;
    let timer = 0;
    const begin = (x: number, y: number) => {
      dragging = true;
      const index = c.ids.indexOf(n.id);
      setLift({ id: n.id, col: c.id, index, from: { col: c.id, index }, mode: 'drag' });
      setGhost({ x, y });
      say(K.lifted(title(n)));
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
      const b = boardRef.current;
      if (b) {
        const r = b.getBoundingClientRect();
        if (ev.clientX < r.left + 30) b.scrollLeft -= 14;
        else if (ev.clientX > r.right - 30) b.scrollLeft += 14;
      }
      const t = target(ev.clientX, ev.clientY);
      const l = liftRef.current;
      if (t && l && (t.col !== l.col || t.index !== l.index)) setLift({ ...l, ...t });
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
  const cardView = (n: Note, c: NoteColumn, dim: boolean) => {
    const t = title(n);
    const fin = finished(n) || n.state === 'review';
    const lifted = lift?.id === n.id;
    const subs = No.nextOpenChildren(ws, n.id, 3);
    const colState = Sh.colStateOf(c);
    const needsOk = n.state === 'review' && (colState === 'done' || colState === 'review');
    return (
      <li key={n.id} data-cardli={n.id} className={`kcard${fin ? ' is-done' : ''}${dim ? ' is-dim' : ''}${lifted ? ' is-lifted' : ''}${pk.mark(n)}`}>
        {pk.picker(n, () => focusCard(n.id))}
        <div className="kcard__top">
          <button
            type="button"
            role="checkbox"
            aria-checked={fin}
            tabIndex={-1}
            className="kcard__done"
            title={fin ? K.undone(t) : K.doneHint(t)}
            aria-label={fin ? K.undone(t) : K.doneHint(t)}
            onClick={() => toggleDone(n)}
          >
            <Icon name={fin ? 'check' : 'tick'} size={15} />
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
              aria-describedby={`${sheetId}-cardkeys`}
              aria-roledescription={lifted ? 'aufgenommene Karte' : 'Karte'}
              title={`${SHEET_TEXT.open(t)} – ${K.cardKeys}`}
              onClick={() => !suppress.current && !liftRef.current && setCard(n.id)}
              onKeyDown={(e) => cardKey(e, n, c)}
              onPointerDown={(e) => startPointer(e, n, c)}
              onContextMenu={(e) => liftRef.current && e.preventDefault()}
            >
              <TagChips ws={ws} v={v} n={n} />
              <span className="kcard__title">{t}</span>
              {n.template && (
                <span className="sign kcard__tpl" title={KM_T.tplHint}>
                  <Icon name="copy" size={10} /> {KM_T.tplBadge}
                </span>
              )}
              <Signs ws={ws} n={n} />
              <span className="sr-only">
                , {NOTE_TEXT.states[No.stateOf(ws, n).state]}
                {subs.length ? `, ${K.subs}: ${subs.map((s) => No.titleOf(No.shownNote(s)) || NOTE_TEXT.untitled).join(', ')}` : ''}
              </span>
            </button>
          )}
        </div>
        {subs.length > 0 && (
          <ul className="kcard__subs" aria-hidden="true">
            {subs.map((s, i) => (
              <li key={s.id} style={{ opacity: 0.75 - i * 0.18 }}>
                {No.titleOf(No.shownNote(s)) || NOTE_TEXT.untitled}
              </li>
            ))}
          </ul>
        )}
        {needsOk && (
          <button
            type="button"
            className="kcard__ok"
            onClick={() =>
              // V95 (L2, P18): nur mit Befugnis „Abnehmen“ – sonst Hinweis am Ort
              !hasRight(meOf(ws), 'accept')
                ? setAsk({ kind: 'noRight', id: n.id })
                : // F-218 A4 (V92): Abnahme ohne Rückfrage, wenn so eingestellt
                  switchOf(ws, 'review') === 'direct' ? (dispatch({ type: 'reviewOk', note: n.id, by }), say(K.reviewDone(t)), focusCard(n.id)) : setAsk({ kind: 'review', id: n.id })
            }
          >
            <Icon name="check" size={12} /> {K.reviewOk}
          </button>
        )}
        {ask?.kind === 'noRight' && ask.id === n.id && (
          <p className="sheet__msg kcard__ask" role="alert">
            {K.noRight}
            <button type="button" className="note__undo" autoFocus onClick={() => (setAsk(null), focusCard(n.id))}>
              {K.noRightOk}
            </button>
          </p>
        )}
        {ask?.kind === 'review' && ask.id === n.id && (
          <p className="sheet__msg kcard__ask" role="alertdialog" aria-label={K.reviewAsk(t)}>
            {K.reviewAsk(t)}
            <button
              type="button"
              className="note__undo"
              autoFocus
              onClick={() => {
                dispatch({ type: 'reviewOk', note: n.id, by });
                setAsk(null);
                say(K.reviewDone(t));
                focusCard(n.id);
              }}
            >
              {K.reviewOk}
            </button>
            <button type="button" className="note__undo" onClick={() => (setAsk(null), focusCard(n.id))}>
              {K.cancel}
            </button>
          </p>
        )}
      </li>
    );
  };

  const full = cols.length >= No.COLUMN_MAX;
  const colMenu = (c: NoteColumn, i: number) => (
    <Menu className="kcol__more" icon={<Icon name="more" size={15} />} label={K.menu(c.name)}>
      {(close) => (
        <MenuPages>
          {(page, go) =>
            page === 'moveAll' ? (
              <>
                <Item icon="back" onClick={() => go('')}>{K.back}</Item>
                {cols.filter((x) => x.id !== c.id).map((x) => (
                  <Item
                    key={x.id}
                    icon={COL_STATE_ICON[Sh.colStateOf(x)]}
                    disabled={!c.ids.length}
                    onClick={() => {
                      close();
                      dispatch({ type: 'colMoveAll', view: sheetId, col: c.id, to: x.id, by });
                      say(K.movedAll(c.ids.length, x.name));
                    }}
                  >
                    {K.moveAllTo(x.name)}
                  </Item>
                ))}
                {/* V121 (K3): auch in ein anderes Sheet (wie Trello „Liste in anderes Board verschieben“) */}
                {Sh.moveTargets(ws, sheetId).map((x) => (
                  <Item
                    key={x.id}
                    icon={x.kind === 'kanban' ? 'kanban' : x.kind === 'todo' ? 'todo' : 'note'}
                    disabled={!c.ids.length}
                    hint={KM_T.toSheet}
                    onClick={() => {
                      close();
                      const before = ws;
                      const n = KM.moveColumnCards(ws, sheetId, c.id, x.id, { by }).moved;
                      dispatch({ type: 'colToSheet', view: sheetId, col: c.id, to: x.id, by });
                      notice({ text: KM_T.toSheetDone(n, x.name), undo: () => dispatch({ type: 'exchange', ws: before }) });
                      say(KM_T.toSheetDone(n, x.name));
                      focusAdd(c.id);
                    }}
                  >
                    {KM_T.toSheetAll(x.name)}
                  </Item>
                ))}
              </>
            ) : page === 'tpl' ? (
              (() => {
                const tp = KM.templatesFor(ws, sheetId);
                const pick = (tpl: Note) => {
                  close();
                  const id = newId();
                  const before = ws;
                  dispatch({ type: 'cardFromTpl', tpl: tpl.id, view: sheetId, col: c.id, id, top: true, by });
                  notice({ text: KM_T.fromTplDone(title(tpl), c.name), undo: () => dispatch({ type: 'exchange', ws: before }) });
                  say(KM_T.fromTplDone(title(tpl), c.name));
                  focusCard(id);
                };
                return (
                  <>
                    <Item icon="back" onClick={() => go('')}>{K.back}</Item>
                    {!tp.here.length && !tp.other.length && <li className="menu__hint">{KM_T.tplNone}</li>}
                    {tp.here.length > 0 && <li className="menu__hint">{KM_T.tplHere}</li>}
                    {tp.here.map((x) => <Item key={x.id} icon="copy" onClick={() => pick(x)}>{title(x)}</Item>)}
                    {tp.other.length > 0 && <li className="menu__hint">{KM_T.tplOther}</li>}
                    {tp.other.map((x) => <Item key={x.id} icon="copy" onClick={() => pick(x)}>{title(x)}</Item>)}
                  </>
                );
              })()
            ) : page === 'sort' ? (
              <>
                <Item icon="back" onClick={() => go('')}>{K.back}</Item>
                {Sh.COL_SORTS.map((s) => (
                  <Item key={s} icon="sort" onClick={() => (close(), dispatch({ type: 'colSort', view: sheetId, col: c.id, by: s }), say(K.sorted(Sh.COL_SORT_NAME[s])))}>
                    {Sh.COL_SORT_NAME[s]}
                  </Item>
                ))}
              </>
            ) : page === 'state' ? (
              <>
                <Item icon="back" onClick={() => go('')}>{K.back}</Item>
                {COL_STATES.map((s) => (
                  <Item key={s} checked={Sh.colStateOf(c) === s} onClick={() => (close(), dispatch({ type: 'colState', view: sheetId, col: c.id, state: s }), say(`${K.meaning}: ${Sh.COL_STATE_NAME[s]}`))}>
                    {Sh.COL_STATE_NAME[s]}
                  </Item>
                ))}
              </>
            ) : page === 'wip' ? (
              <>
                <Item icon="back" onClick={() => go('')}>{K.back}</Item>
                <li className="kcol__wipform">
                  <label>
                    <span>{K.wipField}</span>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      defaultValue={c.wip ?? ''}
                      title={K.wipHint}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const n = Number(e.currentTarget.value) || undefined;
                          close();
                          dispatch({ type: 'colWip', view: sheetId, col: c.id, wip: n });
                          say(K.wipSaid(n));
                        }
                      }}
                    />
                  </label>
                  <span className="menu__hint">{K.wipHint}</span>
                </li>
                <Item icon="close" disabled={!c.wip} onClick={() => (close(), dispatch({ type: 'colWip', view: sheetId, col: c.id, wip: undefined }), say(K.wipSaid()))}>
                  {K.wipNone}
                </Item>
              </>
            ) : (
              <>
                <Item icon="plus" onClick={() => (close(), setDraft(''), setAddTop(0), setAdding(c.id))}>{K.addCard}</Item>
                <Item icon="plus" onClick={() => (close(), setDraft(''), setAddTop(1), setAdding(c.id))}>{KM_T.addTop}</Item>
                <Item icon="copy" hint={KM_T.fromTplHint} onClick={() => go('tpl')}>{KM_T.fromTpl}</Item>
                <Item icon="back" disabled={i === 0} onClick={() => (close(), dispatch({ type: 'colMove', view: sheetId, col: c.id, index: i - 1 }), say(K.colLeft))}>
                  {K.colLeft}
                </Item>
                <Item icon="next" disabled={i === cols.length - 1} onClick={() => (close(), dispatch({ type: 'colMove', view: sheetId, col: c.id, index: i + 1 }), say(K.colRight))}>
                  {K.colRight}
                </Item>
                <Item icon="move" disabled={!c.ids.length} onClick={() => go('moveAll')}>{K.moveAll}</Item>
                <Item icon="sort" disabled={c.ids.length < 2} onClick={() => go('sort')}>{K.sort}</Item>
                <Item icon="adjust" hint={K.wipHint} onClick={() => go('wip')}>{K.wip}</Item>
                <Item icon={COL_STATE_ICON[Sh.colStateOf(c)]} hint={K.meaningHint} onClick={() => go('state')}>{K.state}</Item>
                <Item icon="rename" onClick={() => (close(), setColEdit(c.id))}>{K.colRename}</Item>
                <Item
                  icon="copy"
                  hint={full ? K.colFull(No.COLUMN_MAX) : KM_T.colCopyHint}
                  disabled={full}
                  onClick={() => {
                    close();
                    const before = ws;
                    const id = newId();
                    const r = KM.copyColumn(ws, sheetId, c.id);
                    dispatch({ type: 'colCopy', view: sheetId, col: c.id, id, by });
                    const nm = r.ok ? (No.viewById(r.ws, sheetId)?.cols?.find((x) => x.id === r.id)?.name ?? '') : '';
                    notice({ text: KM_T.colCopied(nm, r.ok ? (r.cards ?? 0) : 0), undo: () => dispatch({ type: 'exchange', ws: before }) });
                    say(KM_T.colCopied(nm, r.ok ? (r.cards ?? 0) : 0));
                    focusAdd(id);
                  }}
                >
                  {KM_T.colCopy}
                </Item>
                <Item
                  icon="archive"
                  hint={cols.length <= 1 ? K.removeLast : KM_T.colArchiveHint}
                  disabled={cols.length <= 1}
                  onClick={() => {
                    close();
                    const before = v;
                    const to = cols[i > 0 ? i - 1 : 1];
                    dispatch({ type: 'colArchive', view: sheetId, col: c.id });
                    notice({ text: KM_T.colArchived(c.name), undo: () => dispatch({ type: 'sheetRestore', view: before }) });
                    say(KM_T.colArchived(c.name));
                    focusAdd(to.id);
                  }}
                >
                  {KM_T.colArchive}
                </Item>
                <Item icon="trash" hint={cols.length <= 1 ? K.removeLast : K.removeHint} disabled={cols.length <= 1} onClick={() => (close(), removeCol(c))}>
                  {K.remove}
                </Item>
              </>
            )
          }
        </MenuPages>
      )}
    </Menu>
  );

  const column = (c: NoteColumn, i: number) => {
    const st = Sh.colStateOf(c);
    const notes = idsOf(c)
      .map((id) => No.noteById(ws, id))
      .filter((n): n is Note => !!n && (n.state !== 'archived' || n.id === lift?.id))
      .filter((n) => n.id === lift?.id || passes(n));
    const hideDone = show === 'open' && !openDone.has(c.id);
    const visible = notes.filter((n) => !(hideDone && finished(n) && n.id !== lift?.id && foldsDone(ws, n)));
    const doneHere = notes.filter((n) => finished(n) && n.id !== lift?.id && foldsDone(ws, n)).length;
    const over = Sh.overWip(c, 0, ws);
    const live = c.ids.filter((id) => No.noteById(ws, id)?.state !== 'archived').length;
    const addBox = () => (
          <div className="todo__new kcol__new">
            <Icon name="plus" size={14} />
            <input
              data-addin={c.id}
              autoFocus
              value={draft}
              placeholder={K.addCardPh}
              aria-label={`${K.addCard} – ${K.col(c.name)}`}
              title={K.addCardHint}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.preventDefault(), addCard(c));
                else if (e.key === 'Escape') (e.preventDefault(), e.stopPropagation(), setAdding(null), setAddTop(0), focusAdd(c.id));
              }}
              onBlur={() => !draft.trim() && (setAdding(null), setAddTop(0))}
            />
          </div>
    );
    return (
      <section key={c.id} className={`kcol${lift?.col === c.id ? ' is-target' : ''}`} aria-label={`${K.col(c.name)}, ${Sh.COL_STATE_NAME[st]}, ${K.countLabel(live, c.wip)}`}>
        <header className="kcol__head">
          {colEdit === c.id ? (
            <input
              className="todo__edit kcol__edit"
              autoFocus
              defaultValue={c.name}
              aria-label={K.colRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = e.currentTarget.value.trim();
                  if (val) dispatch({ type: 'colRename', view: sheetId, col: c.id, name: val });
                  setColEdit(null);
                  focusAdd(c.id);
                } else if (e.key === 'Escape') {
                  e.stopPropagation();
                  setColEdit(null);
                }
              }}
              onBlur={() => setColEdit(null)}
            />
          ) : (
            <h3 className="kcol__name" title={K.colNameHint} onDoubleClick={() => setColEdit(c.id)}>
              {c.name}
            </h3>
          )}
          <span className="sign kcol__state" title={`${K.meaning}: ${Sh.COL_STATE_NAME[st]} – ${K.meaningHint}`}>
            <Icon name={COL_STATE_ICON[st]} size={11} />
            <span className="kcol__statename">{Sh.COL_STATE_NAME[st]}</span>
          </span>
          <span className={`kcol__count${over ? ' is-over' : ''}`} title={K.countLabel(live, c.wip)} aria-hidden="true">
            {K.count(live, c.wip)}
          </span>
          {over && (
            <span className="sign kcol__over" title={K.overHint(c.wip!)}>
              ! {K.over}
            </span>
          )}
          {colMenu(c, i)}
        </header>
        {ask?.kind === 'wip' && ask.col === c.id && (
          <p className="sheet__msg kcol__ask" role="alertdialog" aria-label={ask.text}>
            {ask.text}
            <button type="button" className="note__undo" autoFocus onClick={() => (setAsk(null), ask.run())}>
              {K.wipYes}
            </button>
            <button type="button" className="note__undo" onClick={() => (setAsk(null), focusAdd(c.id))}>
              {K.cancel}
            </button>
          </p>
        )}
        {adding === c.id && addTop > 0 && addBox()}
        <ul className="kcol__body" data-colbody={c.id} aria-label={K.col(c.name)}>
          {visible.map((n) => cardView(n, c, show === 'all' && finished(n)))}
          {!visible.length && <li className="kcol__empty">{K.empty}</li>}
        </ul>
        {show === 'open' && doneHere > 0 && (
          <button
            type="button"
            className="todo__donebtn kcol__donebtn"
            aria-expanded={!hideDone}
            title={K.doneToggle}
            onClick={() => setOpenDone((s) => {
              const x = new Set(s);
              if (x.has(c.id)) x.delete(c.id);
              else x.add(c.id);
              return x;
            })}
          >
            <Icon name={hideDone ? 'chevronRight' : 'chevronDown'} size={12} /> {K.doneCount(doneHere)}
          </button>
        )}
        {adding === c.id && !addTop ? (
          addBox()
        ) : (
          <button type="button" data-add={c.id} className="kcol__add" onClick={() => (setDraft(''), setAddTop(0), setAdding(c.id))}>
            <Icon name="plus" size={13} /> {K.addCard}
          </button>
        )}
      </section>
    );
  };

  const cardNote = card ? No.noteById(ws, card) : undefined;
  const ghostNote = lift && ghost ? No.noteById(ws, lift.id) : undefined;
  return (
    <div className={`sheet sheet--kanban${lift?.mode === 'drag' ? ' is-dragging' : ''}`}>
      <SheetHead id={sheetId} filter={filter} onFilter={setFilter} show={show} onShow={setShow} onDown={() => focusCard()} filterRef={filterRef} who={pk.who} onWho={pk.setWho}>
        <ModeWheel
          id={`${sheetId}-kview`}
          className="sheet__wheel"
          label={KVIEW_TEXT.wheel}
          options={[
            { id: 'board', name: KVIEW_TEXT.board, icon: 'kanban', hint: KVIEW_TEXT.boardHint },
            { id: 'table', name: KVIEW_TEXT.table, icon: 'table', hint: KVIEW_TEXT.tableHint },
            { id: 'calendar', name: KVIEW_TEXT.calendar, icon: 'calendarView', hint: KVIEW_TEXT.calendarHint },
            { id: 'timeline', name: KVIEW_TEXT.timeline, icon: 'timeline', hint: KVIEW_TEXT.timelineHint },
            { id: 'stats', name: KVIEW_TEXT.stats, icon: 'stats', hint: KVIEW_TEXT.statsHint },
          ]}
          value={kview}
          onChange={(x) => setKview(x as KView)}
        />
        <FilterButton f={cf} open={filterOpen} btnRef={filterBtn} onToggle={() => setFilterOpen(!filterOpen)} />
      </SheetHead>
      {filterOpen && (
        <FilterPanel
          ws={ws}
          sheetId={sheetId}
          f={cf}
          onChange={setCf}
          shown={cols.flatMap((c) => c.ids).map((id) => No.noteById(ws, id)).filter((n): n is Note => !!n && n.state !== 'archived' && passes(n)).length}
          say={say}
          onClose={() => (setFilterOpen(false), window.setTimeout(() => filterBtn.current?.focus(), 0))}
        />
      )}
      {tagsOpen && <TagPanel ws={ws} dispatch={dispatch} sheetId={sheetId} say={say} onClose={() => (setTagsOpen(false), window.setTimeout(() => tagsBtn.current?.focus(), 0))} />}
      <span id={`${sheetId}-cardkeys`} className="sr-only">{K.cardKeys}</span>
      <span className="sr-only" role="status">{K.info(cols.length, No.idsIn(v).length)}</span>
      {moving && (
        <MoveToBar ws={ws} dispatch={dispatch} sheetId={sheetId} noteId={moving} say={say} notice={notice} onClose={() => { const id = moving; setMoving(null); focusCard(id); }} />
      )}
      {copying && (
        <CopyBar
          ws={ws}
          dispatch={dispatch}
          sheetId={sheetId}
          noteId={copying}
          say={say}
          notice={notice}
          onClose={(made) => {
            const id = copying;
            setCopying(null);
            focusCard(made ?? id);
          }}
        />
      )}
      {archOpen && <ArchivePanel ws={ws} dispatch={dispatch} sheetId={sheetId} say={say} onClose={() => (setArchOpen(false), window.setTimeout(() => archBtn.current?.focus(), 0))} />}
      <NoticeLine shown={shown} />
      {/* V122 (K13): WIP-Nachfrage auch in Tabelle und Kalender – am Ort über der Ansicht */}
      {kview !== 'board' && ask?.kind === 'wip' && (
        <p className="sheet__msg kcol__ask" role="alertdialog" aria-label={ask.text}>
          {ask.text}
          <button type="button" className="note__undo" autoFocus onClick={() => (setAsk(null), ask.run())}>
            {K.wipYes}
          </button>
          <button type="button" className="note__undo" onClick={() => setAsk(null)}>
            {K.cancel}
          </button>
        </p>
      )}
      {kview !== 'board' &&
        (() => {
          const vp = {
            ws,
            dispatch,
            v,
            keep: (n: Note) => passes(n) && ((kview !== 'table' && kview !== 'stats') || show === 'all' || !finished(n) || !foldsDone(ws, n)),
            onOpen: setCard,
            onMove: (id: string, col: string) => commit(id, col, undefined, Sh.colOf(v, id)?.id),
            say,
            notice,
          };
          if (kview === 'table') return <KanbanTable {...vp} />;
          if (kview === 'timeline') return <KanbanTimeline {...vp} sheetId={sheetId} />;
          if (kview === 'stats')
            return (
              <KanbanStats
                {...vp}
                onBoard={() => (setKview('board'), say(KVIEW_TEXT.board))}
                onFilter={(f, what) => (setCf(f), setKview('board'), say(STATS_TEXT.shown(what)))}
              />
            );
          return <KanbanCalendar {...vp} sheetId={sheetId} />;
        })()}
      <div className="kanban__board" ref={boardRef} aria-label={K.board(v.name)} role="group" hidden={kview !== 'board'}>
        {cols.map(column)}
        <div className="kcol kcol--new">
          {newCol !== null ? (
            <div className="todo__new">
              <Icon name="plus" size={14} />
              <input
                autoFocus
                value={newCol}
                placeholder={K.newColPh}
                aria-label={K.newColLabel}
                title={K.newColHint}
                onChange={(e) => setNewCol(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newCol.trim()) {
                    e.preventDefault();
                    const id = newId();
                    dispatch({ type: 'colAdd', view: sheetId, name: newCol.trim(), col: id });
                    say(`${K.newColLabel}: ${newCol.trim()}`);
                    setNewCol(null);
                    focusAdd(id);
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    setNewCol(null);
                  }
                }}
                onBlur={() => !newCol.trim() && setNewCol(null)}
              />
            </div>
          ) : (
            <button type="button" className="kcol__add kcol__addcol" disabled={full} title={full ? K.colFull(No.COLUMN_MAX) : K.newColHint} onClick={() => setNewCol('')}>
              <Icon name="plus" size={13} /> {K.newCol}
            </button>
          )}
          {/* V121 (K1, K3): Archiv des Boards */}
          <button type="button" ref={archBtn} className="kcol__add kcol__arch" aria-expanded={archOpen} title={KM_T.archiveBtnHint} onClick={() => setArchOpen(!archOpen)}>
            <Icon name="archive" size={13} /> {KM_T.archiveBtn(KM.archiveCount(ws, sheetId))}
          </button>
          {/* V122 (K4): Tags des Boards verwalten */}
          <button type="button" ref={tagsBtn} className="kcol__add kcol__arch" aria-expanded={tagsOpen} title={TAG_TEXT.manageHint} onClick={() => setTagsOpen(!tagsOpen)}>
            <Icon name="tag" size={13} /> {TAG_TEXT.manage(Tg.boardTags(ws, sheetId).filter((t) => t.count).length)}
          </button>
        </div>
      </div>
      {ghostNote && ghost && (
        <div className="kcard kcard--ghost" style={{ left: ghost.x, top: ghost.y }} aria-hidden="true">
          <span className="kcard__title">{title(ghostNote)}</span>
        </div>
      )}
      {cardNote && (
        <CardWindow
          ws={ws}
          dispatch={dispatch}
          noteId={cardNote.id}
          where={Sh.colOf(v, cardNote.id)?.name ?? v.name}
          sheetId={sheetId}
          say={say}
          acts={
            <>
              <button type="button" className="help__run" title={KM_T.copyHint} onClick={() => (setCard(null), setCopying(cardNote.id))}>
                <Icon name="copy" size={12} className="icon icon--inline" /> {KM_T.copy}
              </button>
              <button type="button" className="help__run" title={KM_T.archiveHint} onClick={() => (setCard(null), archive(cardNote, nearOf(cardNote.id, Sh.colOf(v, cardNote.id)?.id ?? '')))}>
                <Icon name="archive" size={12} className="icon icon--inline" /> {KM_T.archive}
              </button>
              <button type="button" className="help__run" aria-pressed={!!cardNote.template} title={KM_T.tplHint} onClick={() => toggleTpl(cardNote)}>
                <Icon name={cardNote.template ? 'check' : 'copy'} size={12} className="icon icon--inline" /> {KM_T.tpl}
              </button>
            </>
          }
          onClose={() => {
            const id = cardNote.id;
            const cur = No.noteById(ws, id);
            if (cur && No.isEmptyDraft(ws, cur)) dispatch({ type: 'noteDiscard', id });
            setCard(null);
            // V122 (K13): in Tabelle und Kalender zurück auf Zeile bzw. Karte
            if (kview !== 'board') window.setTimeout(() => document.querySelector<HTMLElement>(`[data-row="${id}"], [data-chip="${id}"], [data-bar="${id}"]`)?.focus(), 0);
            else focusCard(id);
          }}
        />
      )}
    </div>
  );
}
