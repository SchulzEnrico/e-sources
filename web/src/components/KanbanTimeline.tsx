/**
 * V123 (F-231 K13, T6): Zeitleiste als Ansicht desselben Kanban-Sheets (Rad „Ansicht“ › Zeitleiste).
 *
 * Wie Trello „Zeitleiste“: links die Gruppen (Spalte, Person oder Tag) mit ihren Karten, rechts jede Karte als Balken
 * von Start („nicht beginnen vor“) bis „fällig“. Ziehen verschiebt den Balken, an den Enden ziehen ändert Start bzw.
 * „fällig“; mit der Tastatur Alt+Pfeile. Karten ohne Datum stehen unten und lassen sich auf die Zeitachse ziehen.
 * Nach ICB4 dazu: Vorgänger als Pfeile, im Projekt-Board der kritische Pfad aus dem Projekt-Gantt (rot).
 * Maßstab wie im Projekt-Gantt (Tage | Wochen | Monate) – „weitestgehend gleicher Aufbau“. Rückgängig am Ort.
 * Logik in workspace/kanbanTimeline.ts.
 */
import { type DragEvent, type KeyboardEvent, type PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { Note } from '../workspace/types';
import * as No from '../workspace/notes';
import * as TL from '../workspace/kanbanTimeline';
import { isoDay, isoWeek, shiftDay } from '../workspace/kanbanViews';
import { dueKind } from '../workspace/kanbanMore';
import { loadSheetPref, saveSheetPref } from '../workspace/sheetPrefs';
import { colorOf, fold, tagHex, tagInk } from '../workspace/tags';
import { DUE_TEXT, NOTE_TEXT, TERMS, TL_TEXT as T } from '../workspace/terms';
import type { KViewProps } from './KanbanViews';
import { ModeWheel } from './ModeWheel';
import { Icon } from './Icon';

const ROW = 28;
const LAB = 210;
const dmy = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`;
const titleOf = (n: Note) => No.titleOf(No.shownNote(n)) || NOTE_TEXT.untitled;
const explain = (t: string) => t.split(' = ').slice(1).join(' = ') || t;

type Drag = { id: string; mode: 'move' | 'start' | 'end'; x0: number; dx: number };

export function KanbanTimeline(p: KViewProps & { sheetId: string }) {
  const { ws, v, sheetId } = p;
  const today = isoDay();
  const [scale, setScaleRaw] = useState<TL.TlScale>(() => loadSheetPref(sheetId).tlScale ?? 'week');
  const [group, setGroupRaw] = useState<TL.TlGroup>(() => loadSheetPref(sheetId).tlGroup ?? 'col');
  const [showArrows, setShowArrows] = useState(true);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [cur, setCur] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const scroll = useRef<HTMLDivElement>(null);
  const suppress = useRef(false);
  const dragId = useRef<string | null>(null);
  const setScale = (x: TL.TlScale) => (setScaleRaw(x), saveSheetPref(sheetId, { tlScale: x }), p.say(`${T.scale}: ${T.scales[x]}`));
  const setGroup = (x: TL.TlGroup) => (setGroupRaw(x), saveSheetPref(sheetId, { tlGroup: x }), p.say(`${T.group}: ${T.groups[x]}`));

  const notes = (v.cols ?? []).flatMap((c) => c.ids).map((id) => No.noteById(ws, id)).filter((n): n is Note => !!n && n.state !== 'archived' && p.keep(n));
  const dated = notes.filter((n) => TL.barOf(n));
  const none = notes.filter((n) => !TL.barOf(n));
  const groups = TL.groupsOf(ws, v, dated, group, { noOne: T.noOne, noTag: T.noTag });
  const crit = useMemo(() => TL.criticalOf(ws, v), [ws, v]);
  const range = TL.rangeOf(dated.map((n) => TL.barOf(n)!), today, scale);
  const dw = TL.TL_DAY_W[scale];
  const width = Math.round(range.days * dw);
  const ix = (d: string) => TL.daysBetween(range.from, d);
  const ticks = TL.ticksOf(range.from, range.to, scale, isoWeek);
  const months = scale === 'month' ? [] : TL.monthsOf(range.from, range.to);
  const wd0 = (new Date(`${range.from}T00:00:00Z`).getUTCDay() + 6) % 7;
  const weekend = scale === 'day' ? `repeating-linear-gradient(90deg, transparent 0 ${5 * dw}px, rgba(var(--tint), 0.07) ${5 * dw}px ${7 * dw}px)` : undefined;
  const bgPos = `${-wd0 * dw}px 0`;

  // Zeilen: je Gruppe eine Kopfzeile, dann ihre Karten; erste Zeile je Karte für die Pfeile
  type Line = { kind: 'group'; g: TL.TlGroupOf } | { kind: 'card'; n: Note; g: TL.TlGroupOf };
  const lines: Line[] = groups.flatMap((g) => [{ kind: 'group' as const, g }, ...g.notes.map((n) => ({ kind: 'card' as const, n, g }))]);
  const rowOf = new Map<string, number>();
  lines.forEach((l, i) => l.kind === 'card' && !rowOf.has(l.n.id) && rowOf.set(l.n.id, i));
  const arrows = showArrows ? TL.arrowsOf(dated, crit) : [];

  const goToday = (smooth = true) => {
    const el = scroll.current;
    if (el) el.scrollTo({ left: Math.max(0, ix(today) * dw - (el.clientWidth - LAB) / 3), behavior: smooth ? 'smooth' : 'auto' });
  };
  useEffect(() => goToday(false), [scale]); // eslint-disable-line react-hooks/exhaustive-deps

  const by = ws.profile?.name || undefined;
  const apply = (n: Note, patch: TL.TlEdit, text: string) => {
    const s = No.shownNote(n);
    const old = { notBefore: s.notBefore, due: s.due };
    if (old.notBefore === patch.notBefore && old.due === patch.due) return;
    p.dispatch({ type: 'noteEdit', id: n.id, patch: { notBefore: patch.notBefore, due: patch.due, ...(patch.due ? {} : { dueTime: undefined }) }, by });
    p.say(text);
    p.notice({ text, undo: () => p.dispatch({ type: 'noteEdit', id: n.id, patch: { ...old, ...(s.dueTime ? { dueTime: s.dueTime } : {}) }, by }) });
  };
  const changedText = (n: Note, e: TL.TlEdit) => {
    const a = e.notBefore ?? e.due ?? '';
    const b = e.due ?? e.notBefore ?? '';
    return T.changed(titleOf(n), dmy(a), dmy(b));
  };
  const focusBar = (id: string) => window.setTimeout(() => scroll.current?.querySelector<HTMLElement>(`[data-bar="${id}"]`)?.focus(), 0);

  const barKey = (e: KeyboardEvent<HTMLButtonElement>, n: Note) => {
    if (!e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End')) {
      const all = [...(scroll.current?.querySelectorAll<HTMLElement>('[data-bar]') ?? [])];
      const i = all.indexOf(e.currentTarget);
      const j = e.key === 'Home' ? 0 : e.key === 'End' ? all.length - 1 : i + (e.key === 'ArrowDown' ? 1 : -1);
      if (all[j]) (e.preventDefault(), all[j].focus());
      return;
    }
    if (!e.altKey) return;
    const d = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
    let patch: TL.TlEdit | null = null;
    if (d && e.shiftKey) patch = TL.resizeBy(n, 'end', d);
    else if (d) patch = TL.moveBy(n, d);
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') patch = TL.resizeBy(n, 'start', e.key === 'ArrowUp' ? -1 : 1);
    if (!patch) return;
    e.preventDefault();
    apply(n, patch, changedText(n, patch));
    focusBar(n.id);
  };

  const down = (e: PointerEvent<HTMLButtonElement>, n: Note) => {
    if (e.button !== 0) return;
    const edge = (e.target as HTMLElement).dataset.edge as 'start' | 'end' | undefined;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ id: n.id, mode: edge ?? 'move', x0: e.clientX, dx: 0 });
  };
  const moveP = (e: PointerEvent) => drag && setDrag({ ...drag, dx: e.clientX - drag.x0 });
  const up = (n: Note) => {
    if (!drag) return;
    const days = Math.round(drag.dx / dw);
    if (Math.abs(drag.dx) > 3) suppress.current = true;
    setDrag(null);
    if (!days) return;
    const patch = drag.mode === 'move' ? TL.moveBy(n, days) : TL.resizeBy(n, drag.mode, days);
    apply(n, patch, changedText(n, patch));
  };
  const preview = (n: Note): TL.TlBar | null => {
    const b = TL.barOf(n);
    if (!b || !drag || drag.id !== n.id) return b;
    const days = Math.round(drag.dx / dw);
    const e = drag.mode === 'move' ? TL.moveBy(n, days) : TL.resizeBy(n, drag.mode, days);
    const a = e.notBefore ?? e.due!;
    const z = e.due ?? e.notBefore!;
    return { ...b, start: a <= z ? a : z, end: a <= z ? z : a };
  };

  // Ziehen aus „Ohne Datum“ auf die Zeitachse
  const dayAt = (e: DragEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return shiftDay(range.from, Math.max(0, Math.floor((e.clientX - r.left) / dw)));
  };
  const trackDrop = {
    onDragOver: (e: DragEvent<HTMLElement>) => dragId.current && (e.preventDefault(), (e.dataTransfer.dropEffect = 'move')),
    onDrop: (e: DragEvent<HTMLElement>) => {
      const n = dragId.current ? No.noteById(ws, dragId.current) : undefined;
      dragId.current = null;
      setOver(false);
      if (!n) return;
      e.preventDefault();
      const day = dayAt(e);
      apply(n, TL.placeAt(day), T.placed(titleOf(n), dmy(day)));
      focusBar(n.id);
    },
  };

  const bar = (n: Note) => {
    const b = preview(n)!;
    const s = No.shownNote(n);
    const t = titleOf(n);
    const left = ix(b.start) * dw;
    const w = Math.max(dw, (TL.daysBetween(b.start, b.end) + 1) * dw);
    const dk = dueKind({ ...s, state: n.state });
    const tag = (n.tags ?? []).filter((x) => !(v.hiddenTags ?? []).includes(fold(x))).map((x) => colorOf(ws, x)).find(Boolean);
    const isCrit = crit.has(n.id);
    const days = TL.daysBetween(b.start, b.end) + 1;
    const extra = [b.from === 'due' ? T.onlyDue : b.from === 'start' ? T.onlyStart : '', b.bad ? T.bad : '', isCrit ? T.critical : '', dk && dk !== 'later' ? DUE_TEXT.kind[dk] : ''].filter(Boolean).join(', ');
    return (
      <button
        type="button"
        data-bar={n.id}
        tabIndex={cur === n.id || (!cur && n === dated[0]) ? 0 : -1}
        className={`ktl__b${dk && dk !== 'later' ? ` sign--due-${dk}` : ''}${No.isFinished(n.state) ? ' is-done' : ''}${isCrit ? ' is-crit' : ''}${b.bad ? ' is-bad' : ''}${drag?.id === n.id ? ' is-drag' : ''}`}
        style={{ left, width: w, ...(tag ? { background: tagHex(tag), color: tagInk(tag) } : {}) }}
        aria-label={T.bar(t, dmy(b.start), dmy(b.end), days, extra)}
        aria-describedby={`${sheetId}-tlhint`}
        title={`${t}\n${dmy(b.start)}${b.end !== b.start ? ` – ${dmy(b.end)}` : ''}${extra ? ` · ${extra}` : ''}`}
        onFocus={() => setCur(n.id)}
        onClick={() => (suppress.current ? (suppress.current = false) : p.onOpen(n.id))}
        onKeyDown={(e) => barKey(e, n)}
        onPointerDown={(e) => down(e, n)}
        onPointerMove={moveP}
        onPointerUp={() => up(n)}
        onPointerCancel={() => setDrag(null)}
      >
        <span className="ktl__edge ktl__edge--s" data-edge="start" aria-hidden="true" />
        <span className="ktl__bt">{w >= 48 ? t : ''}</span>
        <span className="ktl__edge ktl__edge--e" data-edge="end" aria-hidden="true" />
      </button>
    );
  };

  if (!notes.length) return <p className="lc__muted ktab__empty">{T.empty}</p>;
  const H = 40;
  return (
    <div className="ktl">
      <span id={`${sheetId}-tlhint`} className="sr-only">{T.barHint}</span>
      <div className="kcal__bar ktl__tools">
        <span className="layouts__label" title={explain(TERMS.kanbanTimeline)}>
          <span aria-hidden="true">{T.scale}</span>
          <ModeWheel id={`${sheetId}-tlscale`} className="sheet__wheel" label={T.scaleLabel} value={scale} onChange={(x) => setScale(x as TL.TlScale)} options={TL.TL_SCALES.map((s) => ({ id: s, name: T.scales[s], hint: T.scaleHint[s] }))} />
        </span>
        <span className="layouts__label">
          <span aria-hidden="true">{T.group}</span>
          <ModeWheel id={`${sheetId}-tlgroup`} className="sheet__wheel" label={T.groupLabel} value={group} onChange={(x) => setGroup(x as TL.TlGroup)} options={TL.TL_GROUPS.map((g) => ({ id: g, name: T.groups[g], hint: T.groupHint[g] }))} />
        </span>
        <button type="button" className="help__run" title={T.todayHint} onClick={() => goToday()}>
          {T.today}
        </button>
        <label className="pc__check" title={T.arrowsHint}>
          <input type="checkbox" checked={showArrows} onChange={(e) => setShowArrows(e.target.checked)} />
          {T.arrows}
        </label>
        <span className="lc__muted ktl__sum" role="status">{T.caption(v.name, dated.length, none.length)}</span>
      </div>
      <div className="ktl__scroll" ref={scroll}>
        <div className="ktl__grid" style={{ width: LAB + width, ['--ktl-lab' as string]: `${LAB}px`, ['--ktl-row' as string]: `${ROW}px` }} role="group" aria-label={T.caption(v.name, dated.length, none.length)}>
          <div className="ktl__head" style={{ height: H }} aria-hidden="true">
            <div className="ktl__corner" />
            <div className="ktl__axis" style={{ width }}>
              {months.map((m, k) => (
                <span key={k} className="ktl__month" style={{ left: m.at * dw, width: m.days * dw }}>{m.days * dw > 50 ? m.label : ''}</span>
              ))}
              {ticks.map((tk) => (
                <span key={tk.day} className={`ktl__tick is-${scale}${tk.day === today ? ' is-today' : ''}`} style={{ left: tk.at * dw, ...(scale === 'day' ? { width: dw } : {}) }}>{tk.label}</span>
              ))}
            </div>
          </div>
          <div className="ktl__body" style={{ height: lines.length * ROW }}>
            {lines.map((l, i) =>
              l.kind === 'group' ? (
                <div key={`g-${l.g.key}-${i}`} className="ktl__row is-group" style={{ top: i * ROW }}>
                  <div className="ktl__lab ktl__glab" role="heading" aria-level={4}>
                    {l.g.color && <span className="ktl__dot" style={{ background: tagHex(l.g.color) }} aria-hidden="true" />}
                    <span className="ktl__gname">{l.g.name}</span> <span className="lc__muted">({l.g.notes.length})</span>
                    {!l.g.notes.length && <span className="lc__muted"> – {T.emptyGroup}</span>}
                  </div>
                  <div className="ktl__track" style={{ width, backgroundImage: weekend, backgroundPosition: bgPos }} {...trackDrop} />
                </div>
              ) : (
                <div key={`c-${l.g.key}-${l.n.id}`} className={`ktl__row${cur === l.n.id ? ' is-cur' : ''}`} style={{ top: i * ROW }}>
                  <div className="ktl__lab">
                    <button type="button" tabIndex={-1} className="ktl__name" title={`${titleOf(l.n)} – öffnet die Karte`} onClick={() => p.onOpen(l.n.id)}>
                      {titleOf(l.n)}
                    </button>
                  </div>
                  <div className={`ktl__track${over ? ' is-over' : ''}`} style={{ width, backgroundImage: weekend, backgroundPosition: bgPos }} {...trackDrop}>
                    {bar(l.n)}
                  </div>
                </div>
              ),
            )}
            <div className="ktl__today" style={{ left: LAB + ix(today) * dw + dw / 2 }} aria-hidden="true" />
            {arrows.length > 0 && (
              <svg className="ktl__arrows" style={{ left: LAB, width, height: lines.length * ROW }} aria-hidden="true">
                <defs>
                  <marker id={`${sheetId}-tlarr`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 z" fill="currentColor" />
                  </marker>
                </defs>
                {arrows.map((a) => {
                  const fa = No.noteById(ws, a.from);
                  const ta = No.noteById(ws, a.to);
                  const fb = fa && preview(fa);
                  const tb = ta && preview(ta);
                  const r1 = rowOf.get(a.from);
                  const r2 = rowOf.get(a.to);
                  if (!fb || !tb || r1 === undefined || r2 === undefined) return null;
                  const x1 = (ix(fb.end) + 1) * dw;
                  const y1 = r1 * ROW + ROW / 2;
                  const x2 = ix(tb.start) * dw;
                  const y2 = r2 * ROW + ROW / 2;
                  const mid = x1 + 6;
                  return <path key={`${a.from}-${a.to}`} className={a.critical ? 'is-crit' : ''} d={`M${x1},${y1} H${mid} V${y2} H${x2}`} markerEnd={`url(#${sheetId}-tlarr)`} />;
                })}
              </svg>
            )}
          </div>
        </div>
      </div>
      <section className="kcal__none" aria-label={T.noDate(none.length)} title={T.noDateHint}>
        <h4 className="karch__sub">{T.noDate(none.length)}</h4>
        {none.length > 0 && (
          <ul className="kcal__list kcal__list--row">
            {none.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  draggable
                  data-chip={n.id}
                  className="kcal__chip"
                  title={`${titleOf(n)} – ${T.noDateHint}`}
                  onClick={() => p.onOpen(n.id)}
                  onKeyDown={(e) => {
                    if (e.altKey && e.key === 'ArrowRight') {
                      e.preventDefault();
                      apply(n, TL.placeAt(today), T.placed(titleOf(n), dmy(today)));
                      focusBar(n.id);
                    }
                  }}
                  onDragStart={(e) => {
                    dragId.current = n.id;
                    setOver(true);
                    e.dataTransfer.setData('text/plain', n.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnd={() => ((dragId.current = null), setOver(false))}
                >
                  <span className="kcal__title">{titleOf(n)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="lc__keys ktl__keys">
        <Icon name="timeline" size={11} /> {T.barHint}
      </p>
    </div>
  );
}
