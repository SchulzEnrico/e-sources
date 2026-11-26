/**
 * V122 (F-231 K13, T6): Tabelle und Kalender als Ansichten desselben Kanban-Sheets (Rad „Ansicht“).
 *
 * Beide zeigen dieselben Karten wie das Board – mit Suche, „Nur meine“ und Kartenfilter (K4). Die Tabelle sortiert per
 * Klick auf die Überschrift (noch einmal = absteigend, ein drittes Mal = Board-Reihenfolge) und ändert Spalte und
 * „fällig“ direkt. Der Kalender zeigt Monat oder Woche; Ziehen auf einen anderen Tag – oder Alt+Pfeile – ändert „fällig“
 * (die Uhrzeit bleibt), Rückgängig am Ort. Logik in workspace/kanbanViews.ts.
 */
import { type Dispatch, type DragEvent, type KeyboardEvent, useRef, useState } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { Note, NoteView, Workspace } from '../workspace/types';
import * as No from '../workspace/notes';
import * as KV from '../workspace/kanbanViews';
import * as Ps from '../workspace/persons';
import * as Sh from '../workspace/sheets';
import { dueKind } from '../workspace/kanbanMore';
import { KVIEW_TEXT as T, NOTE_TEXT } from '../workspace/terms';
import type { Notice } from './NoteTab';
import { TagChips } from './KanbanTags';
import { ModeWheel } from './ModeWheel';
import { Icon } from './Icon';

const dmy = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`;
const titleOf = (n: Note) => No.titleOf(No.shownNote(n)) || NOTE_TEXT.untitled;

interface Common {
  ws: Workspace;
  dispatch: Dispatch<Action>;
  v: NoteView;
  /** sichtbare Karten (Suche, „Nur meine“, Filter) */
  keep: (n: Note) => boolean;
  onOpen: (id: string) => void;
  onMove: (id: string, col: string) => void;
  say: (t: string) => void;
  notice: (m: Notice) => void;
}

/** „fällig“ setzen mit Rückgängig am Ort (Uhrzeit bleibt). */
function useSetDue(p: Common) {
  const by = p.ws.profile?.name || undefined;
  return (n: Note, day: string | undefined) => {
    const old = n.due;
    if (old === day) return;
    p.dispatch({ type: 'noteEdit', id: n.id, patch: { due: day, ...(day ? {} : { dueTime: undefined }) }, by });
    const text = day ? T.dueSet(titleOf(n), dmy(day)) : T.dueCleared(titleOf(n));
    p.say(text);
    p.notice({ text, undo: () => p.dispatch({ type: 'noteEdit', id: n.id, patch: { due: old, ...(n.dueTime ? { dueTime: n.dueTime } : {}) }, by }) });
  };
}

// ---------- Tabelle ----------

type SortKey = Exclude<KV.TableSort, 'board'>;

export function KanbanTable(p: Common) {
  const { ws, v } = p;
  const [sort, setSort] = useState<{ by: KV.TableSort; desc: boolean }>({ by: 'board', desc: false });
  const setDue = useSetDue(p);
  const rows = KV.sortRows(ws, v, KV.tableRows(ws, v, p.keep), sort.by, sort.desc);
  const cols = v.cols ?? [];
  const head = (k: SortKey) => {
    const on = sort.by === k;
    const next = !on ? { by: k, desc: false } : !sort.desc ? { by: k, desc: true } : { by: 'board' as const, desc: false };
    return (
      <th key={k} scope="col" aria-sort={on ? (sort.desc ? 'descending' : 'ascending') : 'none'}>
        <button
          type="button"
          className="ktab__sort"
          title={T.sortBy(T.head[k], on && !sort.desc)}
          onClick={() => {
            setSort(next);
            p.say(next.by === 'board' ? T.sortOff : T.sorted(T.head[k], next.desc));
          }}
        >
          {T.head[k]}
          {on && <Icon name={sort.desc ? 'chevronDown' : 'chevronUp'} size={10} />}
        </button>
      </th>
    );
  };
  if (!rows.length) return <p className="lc__muted ktab__empty">{T.empty}</p>;
  return (
    <div className="ktab">
      <table>
        <caption className="sr-only">{T.tableCap(v.name, rows.length)}</caption>
        <thead>
          <tr>
            {head('title')}
            {head('col')}
            {head('tags')}
            {head('who')}
            {head('due')}
            {head('state')}
            <th scope="col">{T.head.check}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ note: n, col }) => {
            const s = No.shownNote(n);
            const t = titleOf(n);
            const who = Ps.personById(ws, Ps.assigneeOf(n) ?? '');
            const cl = Sh.checklistOf(n);
            const dk = dueKind(s);
            return (
              <tr key={n.id} className={No.isFinished(n.state) ? 'is-done' : undefined}>
                <th scope="row">
                  <button type="button" className="ktab__open" data-row={n.id} title={`${t} – Enter öffnet die Karte`} onClick={() => p.onOpen(n.id)}>
                    {t}
                  </button>
                </th>
                <td>
                  <select
                    value={col.id}
                    aria-label={T.colOf(t)}
                    onChange={(e) => {
                      const to = cols.find((c) => c.id === e.target.value);
                      if (!to) return;
                      p.onMove(n.id, to.id);
                      p.say(T.moved(t, to.name));
                    }}
                  >
                    {cols.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <TagChips ws={ws} v={v} n={n} />
                </td>
                <td>{who?.name ?? ''}</td>
                <td className={dk && dk !== 'later' ? `ktab__due sign--due-${dk}` : 'ktab__due'}>
                  <input type="date" value={s.due ?? ''} aria-label={T.dueOf(t)} onChange={(e) => setDue(n, e.target.value || undefined)} />
                  {s.dueTime && <span className="lc__muted"> {s.dueTime}</span>}
                </td>
                <td>{NOTE_TEXT.states[No.stateOf(ws, n).state]}</td>
                <td>{cl ? `${cl.done}/${cl.all}` : ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Kalender ----------

export function KanbanCalendar(p: Common & { sheetId: string }) {
  const { ws, v } = p;
  const today = KV.isoDay();
  const [span, setSpan] = useState<'month' | 'week'>('month');
  const [anchor, setAnchor] = useState(today);
  const [over, setOver] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const dragId = useRef<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const setDue = useSetDue(p);
  const notes = KV.tableRows(ws, v, p.keep).map((r) => r.note);
  const { days: byDay, none } = KV.byDay(notes);
  const days = span === 'month' ? KV.monthDays(anchor) : KV.weekDays(anchor);
  const month = anchor.slice(0, 7);
  const title =
    span === 'month'
      ? new Date(`${anchor.slice(0, 8)}01T00:00:00Z`).toLocaleDateString('de-DE', { month: 'long', year: 'numeric', timeZone: 'UTC' })
      : T.weekTitle(KV.isoWeek(anchor), dmy(days[0]), dmy(days[6]));
  const step = (dir: -1 | 1) => setAnchor(span === 'month' ? KV.shiftMonth(anchor, dir) : KV.shiftDay(anchor, 7 * dir));
  const focusChip = (id: string) => window.setTimeout(() => box.current?.querySelector<HTMLElement>(`[data-chip="${id}"]`)?.focus(), 0);
  const noteOf = (id: string | null) => (id ? No.noteById(ws, id) : undefined);

  const drop = (e: DragEvent, day: string | undefined) => {
    e.preventDefault();
    setOver(null);
    const n = noteOf(dragId.current ?? e.dataTransfer.getData('text/plain'));
    dragId.current = null;
    if (n) (setDue(n, day), focusChip(n.id));
  };
  const target = (day: string | undefined) => ({
    onDragOver: (e: DragEvent) => (e.preventDefault(), (e.dataTransfer.dropEffect = 'move'), setOver(day ?? '')),
    onDragLeave: () => setOver(null),
    onDrop: (e: DragEvent) => drop(e, day),
  });
  const chipKey = (e: KeyboardEvent, n: Note) => {
    if (!e.altKey) return;
    const d = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' ? -7 : e.key === 'ArrowDown' ? 7 : 0;
    if (!d) return;
    e.preventDefault();
    const base = No.shownNote(n).due ?? today;
    const next = KV.shiftDay(base, d);
    setDue(n, next);
    if (!days.includes(next)) setAnchor(next);
    focusChip(n.id);
  };
  const chip = (n: Note) => {
    const s = No.shownNote(n);
    const dk = dueKind(s);
    const t = titleOf(n);
    return (
      <li key={n.id}>
        <button
          type="button"
          draggable
          data-chip={n.id}
          className={`kcal__chip${dk && dk !== 'later' ? ` sign--due-${dk}` : ''}${No.isFinished(n.state) ? ' is-done' : ''}`}
          title={`${t}${s.dueTime ? ` · ${s.dueTime}` : ''} – ${T.chipHint}`}
          aria-describedby={`${p.sheetId}-chiphint`}
          onClick={() => p.onOpen(n.id)}
          onKeyDown={(e) => chipKey(e, n)}
          onDragStart={(e) => {
            dragId.current = n.id;
            e.dataTransfer.setData('text/plain', n.id);
            e.dataTransfer.effectAllowed = 'move';
          }}
          onDragEnd={() => setOver(null)}
        >
          <TagChips ws={ws} v={v} n={n} />
          <span className="kcal__title">
            {s.dueTime && <span className="kcal__time">{s.dueTime} </span>}
            {t}
          </span>
        </button>
      </li>
    );
  };
  const MAX = span === 'month' ? 3 : 50;
  return (
    <div className="kcal" ref={box}>
      <span id={`${p.sheetId}-chiphint`} className="sr-only">{T.chipHint}</span>
      <div className="kcal__bar">
        <ModeWheel
          id={`${p.sheetId}-span`}
          className="sheet__wheel"
          label={T.span}
          options={[
            { id: 'month', name: T.month, icon: 'calendarView', hint: T.monthHint },
            { id: 'week', name: T.week, icon: 'table', hint: T.weekHint },
          ]}
          value={span}
          onChange={(x) => setSpan(x as 'month' | 'week')}
        />
        <button type="button" className="help__run" aria-label={T.prev} title={T.prev} onClick={() => step(-1)}>
          <Icon name="back" size={12} />
        </button>
        <button type="button" className="help__run" onClick={() => setAnchor(today)}>
          {T.today}
        </button>
        <button type="button" className="help__run" aria-label={T.next} title={T.next} onClick={() => step(1)}>
          <Icon name="next" size={12} />
        </button>
        <h3 className="kcal__head" aria-live="polite">
          {title}
        </h3>
      </div>
      <div className={`kcal__grid kcal__grid--${span}`} role="group" aria-label={title}>
        {T.days.map((d) => (
          <div key={d} className="kcal__dow" aria-hidden="true">
            {d}
          </div>
        ))}
        {days.map((d) => {
          const list = byDay.get(d) ?? [];
          const full = open.has(d) ? list : list.slice(0, MAX);
          const label = T.dayLabel(new Date(`${d}T00:00:00Z`).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }), list.length);
          return (
            <section
              key={d}
              className={`kcal__day${d === today ? ' is-today' : ''}${span === 'month' && d.slice(0, 7) !== month ? ' is-other' : ''}${over === d ? ' is-over' : ''}`}
              aria-label={label}
              {...target(d)}
            >
              <span className="kcal__num" aria-hidden="true">
                {Number(d.slice(8, 10))}
              </span>
              {list.length > 0 && <ul className="kcal__list">{full.map(chip)}</ul>}
              {list.length > full.length && (
                <button type="button" className="kcal__more" onClick={() => setOpen(new Set([...open, d]))}>
                  {T.more(list.length - full.length)}
                </button>
              )}
            </section>
          );
        })}
      </div>
      <section className={`kcal__none${over === '' ? ' is-over' : ''}`} aria-label={T.noDate(none.length)} title={T.noDateHint} {...target(undefined)}>
        <h4 className="karch__sub">{T.noDate(none.length)}</h4>
        {none.length > 0 && <ul className="kcal__list kcal__list--row">{none.map(chip)}</ul>}
      </section>
    </div>
  );
}
