/**
 * F-206 Schritt 10 (V101): Gantt im Projekt-Modus – Vorbild Balkendiagramm (Gantt) in MS Project / iTaskX:
 * links die Vorgänge als Tabelle (Nr., Code, Vorgang, Dauer, Anfang, Ende, Vorgänger), rechts die Zeitachse
 * mit Balken (Vorgang, Sammelvorgang, Meilenstein ◆, kritisch rot, manuell schraffiert), Pfeilen zwischen
 * den Balken, Stichtag und Heute-Linie. Darunter die Angaben des gewählten Vorgangs wie im PSP (NF-08).
 * Tastatur wie PSP, dazu Alt/⌥+V springt zu den Vorgängern. Zeitachse ist nur Bild (aria-hidden) – alles
 * steht auch in der Tabelle. Logik in workspace/gantt.ts.
 */
import { useEffect, useRef, useState } from 'react';
import { offBetween } from '../workspace/calendar';
import type { Action } from '../workspace/useWorkspace';
import type { Project, ProjectBaseline, Workspace } from '../workspace/types';
import * as Bl from '../workspace/baseline';
import * as Gt from '../workspace/gantt';
import * as Sc from '../workspace/schedule';
import { noteById } from '../workspace/notes';
import { GANTT_TEXT as G, PSP_TEXT as T, TERMS } from '../workspace/terms';
import { Icon } from './Icon';
import { ModeWheel } from './ModeWheel';
import { openNote } from './SourceChips';
import { TaskInfo, fmtDay, usePspTree } from './ProjectPsp';

const explain = (t: string) => t.split(' = ').slice(1).join(' = ') || t;
type Scale = 'day' | 'week' | 'month';
const SCALES: Scale[] = ['day', 'week', 'month'];
const DAY_W: Record<Scale, number> = { day: 22, week: 7, month: 2.6 };
const ROW = 28;
const HEAD = 40;
const LANE = 18;
const PREF_KEY = 'esource.gantt.v1';

interface Prefs { scale: Scale; crit: boolean; base: boolean }
function loadPrefs(): Prefs {
  try {
    const v = JSON.parse(localStorage.getItem(PREF_KEY) ?? '{}');
    return { scale: SCALES.includes(v.scale) ? v.scale : 'week', crit: v.crit !== false, base: v.base !== false };
  } catch {
    return { scale: 'week', crit: true, base: true };
  }
}

const dayMs = (d: string) => Date.parse(`${d}T12:00:00Z`);
const calDays = (a: string, b: string) => Math.round((dayMs(b) - dayMs(a)) / 864e5);
const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
/** Kalenderwoche nach ISO 8601. */
function isoWeek(day: string): number {
  const d = new Date(dayMs(day));
  const wd = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - wd + 3);
  const first = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round((d.getTime() - first.getTime()) / 864e5 / 7 - ((first.getUTCDay() + 6) % 7 - 3) / 7);
}
const todayText = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function ProjectGantt({ ws, p, dispatch, say, onPickProject }: { ws: Workspace; p: Project; dispatch: (a: Action) => void; say: (t: string) => void; onPickProject: (id: string) => void }) {
  const predRef = useRef<HTMLInputElement>(null);
  const nav = usePspTree(ws, p, dispatch, say, onPickProject, (e) => {
    if (e.altKey && (e.key === 'v' || e.key === 'V' || e.code === 'KeyV')) {
      e.preventDefault();
      window.setTimeout(() => predRef.current?.focus(), 0);
      return true;
    }
    return false;
  });
  const { rows, closed, toggle, setSel, cur, note, tell, durRef, onKey, rowRef } = nav;
  const g = Gt.ganttOf(ws, p.id);
  const phases = Gt.phaseBars(ws, p.id, g);
  const phaseName = new Map((p.phases ?? []).map((x) => [x.id, x.name]));
  // überlappende Phasen in eigene Spuren (wie Sammelbalken übereinander)
  const laneEnd: string[] = [];
  const lanes = new Map<string, number>();
  for (const ph of [...phases].sort((a, b) => a.start.localeCompare(b.start))) {
    let l = laneEnd.findIndex((e) => e < ph.start);
    if (l < 0) l = laneEnd.length;
    laneEnd[l] = ph.end;
    lanes.set(ph.id, l);
  }
  const head = HEAD + (phases.length ? laneEnd.length * LANE + 4 : 0);
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const setPref = (patch: Partial<Prefs>) =>
    setPrefs((x) => {
      const n = { ...x, ...patch };
      try {
        localStorage.setItem(PREF_KEY, JSON.stringify(n));
      } catch {
        /* nur diese Sitzung */
      }
      return n;
    });
  // V115 (Schritt 10, K4): Basisplan – speichern/ersetzen/löschen mit Rückgängig am Ort
  const [baseMsg, setBaseMsg] = useState<{ text: string; undo?: { b?: ProjectBaseline } } | null>(null);
  const cmp = Bl.compare(ws, p.id);
  const hasBase = !!p.baseline;
  const showBase = hasBase && prefs.base;
  const saveBase = () => {
    const prev = p.baseline;
    dispatch({ type: 'baselineSave', project: p.id, at: new Date().toISOString() });
    const text = prev ? G.baseReplaced(fmtDay(prev.at.slice(0, 10))) : G.baseSaved;
    setBaseMsg({ text, undo: { b: prev } });
    say(text);
  };
  const dropBase = () => {
    const prev = p.baseline;
    dispatch({ type: 'baselineSet', project: p.id });
    setBaseMsg({ text: G.baseDropped, undo: { b: prev } });
    say(G.baseDropped);
  };
  const undoBase = () => {
    if (!baseMsg?.undo) return;
    dispatch({ type: 'baselineSet', project: p.id, b: baseMsg.undo.b });
    setBaseMsg({ text: G.baseUndone });
    say(G.baseUndone);
  };
  const barRefs = useRef(new Map<string, HTMLDivElement>());
  const boxRef = useRef<HTMLDivElement>(null);
  // Balken des gewählten Vorgangs waagerecht ins Bild holen – die feste Tabelle links verdeckt sonst den Anfang
  useEffect(() => {
    const box = boxRef.current;
    const bar = cur ? barRefs.current.get(cur.id) : undefined;
    if (!box || !bar) return;
    const tw = (box.querySelector('.gt__table') as HTMLElement | null)?.offsetWidth ?? 0;
    const a = tw + bar.offsetLeft;
    const b = a + bar.offsetWidth;
    if (a - 24 < box.scrollLeft + tw || b + 24 > box.scrollLeft + box.clientWidth) box.scrollLeft = Math.max(0, a - tw - 24);
  }, [cur?.id, prefs.scale]);

  if (!rows.length) {
    return (
      <section className="pc__info pj__info pj__gantt" aria-labelledby="gt-head">
        <h4 id="gt-head" className="radar__detail-head">{G.head(p.name)}</h4>
        <p className="help__text">{T.empty}</p>
      </section>
    );
  }

  // Zeitachse: ab Montag vor dem Anfang bis gut eine Woche nach dem Ende (Stichtage eingeschlossen)
  const dues = g.rows.map((r) => r.due).filter((d): d is string => Sc.isDay(d));
  const pd = phases.flatMap((x) => [x.start, x.end]);
  const bd = showBase ? [p.baseline!.start, p.baseline!.end].filter((d): d is string => !!d) : [];
  const first = [g.start, ...dues, ...pd, ...bd].filter(Boolean).sort()[0] ?? todayText();
  const last = [g.end, ...dues, ...pd, ...bd].filter(Boolean).sort().reverse()[0] ?? first;
  const from = Sc.addDays(first, -(((new Date(dayMs(first)).getUTCDay() + 6) % 7) + 7));
  const to = Sc.addDays(last, 14);
  const w = DAY_W[prefs.scale];
  const span = calDays(from, to) + 1;
  const width = Math.round(span * w);
  const x = (d: string) => calDays(from, d) * w;
  const crit = prefs.crit;

  const months: { left: number; width: number; label: string }[] = [];
  for (let d = `${from.slice(0, 8)}01`; d <= to; ) {
    const next = Sc.addDays(d, 32).slice(0, 8) + '01';
    const a = Math.max(0, x(d));
    const b = Math.min(width, x(next));
    const m = Number(d.slice(5, 7)) - 1;
    months.push({ left: a, width: b - a, label: prefs.scale === 'month' ? `${MONTHS[m]} ${d.slice(2, 4)}` : `${MONTHS[m]} ${d.slice(0, 4)}` });
    d = next;
  }
  const ticks: { left: number; label: string; width: number }[] = [];
  if (prefs.scale === 'day') for (let i = 0; i < span; i++) { const d = Sc.addDays(from, i); ticks.push({ left: i * w, width: w, label: String(Number(d.slice(8))) }); }
  else for (let i = 0; i < span; i += 7) { const d = Sc.addDays(from, i); ticks.push({ left: i * w, width: 7 * w, label: prefs.scale === 'week' ? `KW ${isoWeek(d)}` : '' }); }
  const today = todayText();

  const vis = new Map(rows.map((r, i) => [r.id, i]));
  const ends = (id: string) => {
    const r = g.byId.get(id)!;
    const ms = r.node.milestone && !r.node.summary;
    const s = x(r.start);
    const e = x(r.end) + w;
    return ms ? { a: s + w / 2, b: s + w / 2 } : { a: s, b: e };
  };
  const arrows = g.arrows.filter((a) => vis.has(a.from) && vis.has(a.to)).map((a, k) => {
    const y1 = vis.get(a.from)! * ROW + ROW / 2;
    const y2 = vis.get(a.to)! * ROW + ROW / 2;
    const f = ends(a.from);
    const t = ends(a.to);
    const x1 = a.rel === 'EA' || a.rel === 'EE' ? f.b : f.a;
    const intoEnd = a.rel === 'EE' || a.rel === 'AE';
    const x2 = intoEnd ? t.b : t.a;
    let d: string;
    if (intoEnd) {
      const xm = Math.max(x1, x2) + 8;
      d = `M${x1} ${y1}H${xm}V${y2}H${x2 + 1}`;
    } else if (a.rel === 'AA') {
      const xm = Math.min(x1, x2) - 8;
      d = `M${x1} ${y1}H${xm}V${y2}H${x2 - 1}`;
    } else if (x2 >= x1 + 8) d = `M${x1} ${y1}H${x1 + 6}V${y2}H${x2 - 1}`;
    else {
      const ym = y2 + (y2 > y1 ? -ROW / 2 : ROW / 2);
      d = `M${x1} ${y1}H${x1 + 6}V${ym}H${x2 - 8}V${y2}H${x2 - 1}`;
    }
    return <path key={k} d={d} className={crit && a.critical ? 'is-crit' : ''} markerEnd={crit && a.critical ? 'url(#gt-arr-c)' : 'url(#gt-arr)'} />;
  });

  const loopNames = g.loops.filter((id) => g.byId.get(id)?.node.children.length === 0).map((id) => `${g.byId.get(id)!.nr} ${g.byId.get(id)!.node.title}`);
  const workdays = g.start ? Sc.workdaysBetween(g.start, g.end) : 0;

  return (
    <section className="pc__info pj__info pj__gantt" aria-labelledby="gt-head">
      <h4 id="gt-head" className="radar__detail-head" title={explain(TERMS.gantt)}>
        <Icon name="project" size={16} className="icon icon--inline" /> {G.head(p.name)}
      </h4>
      <div className="pc__row pj__psp-set">
        <div className="layouts__label pj__wheel">
          <span aria-hidden="true">{G.scale}</span>
          <ModeWheel label={G.scaleLabel} value={prefs.scale} onChange={(v) => (setPref({ scale: v as Scale }), tell(`${G.scale}: ${G.scales[v as Scale]}`))} options={SCALES.map((s) => ({ id: s, name: G.scales[s], hint: G.scaleHint[s] }))} />
        </div>
        <label className="pc__check" title={explain(TERMS.criticalPath)}>
          <input type="checkbox" checked={crit} onChange={(e) => setPref({ crit: e.target.checked })} />
          {G.showCritical}
        </label>
        <span className="gt__basebox">
          <button type="button" className="fbq__save" title={explain(TERMS.baseline)} onClick={saveBase}>{hasBase ? G.baseReplace : G.baseSave}</button>
          {hasBase && (
            <>
              <button type="button" className="help__run" onClick={dropBase}>{G.baseDrop}</button>
              <label className="pc__check">
                <input type="checkbox" checked={prefs.base} onChange={(e) => setPref({ base: e.target.checked })} />
                {G.baseShow}
              </label>
            </>
          )}
          {baseMsg && (
            <span className="gt__basemsg" role="status">
              {baseMsg.text}
              {baseMsg.undo && <button type="button" className="help__run" onClick={undoBase}>{G.undo}</button>}
            </span>
          )}
        </span>
        <p className="lc__keys gt__sum" role="status">
          {G.summary(fmtDay(g.start), fmtDay(g.end), workdays)} · <span className={crit ? 'pj__crit-tag' : ''}>{G.criticalCount(g.critical.length)}</span>
          {g.late.length > 0 && <> · <span className="pj__late">{G.lateCount(g.late.length)}</span></>}
          {hasBase && <> · {G.baseLine(fmtDay(p.baseline!.at.slice(0, 10)), cmp.end, cmp.cost, cmp.removed.length)}</>}
        </p>
      </div>
      {phases.length > 0 && (
        <p className="lc__keys gt__phaselist">
          <strong>{G.phases}:</strong> {phases.map((ph) => G.phaseLine(ph.name, fmtDay(ph.start), fmtDay(ph.end), ph.tasks, ph.from === 'tasks', ph.outside)).join(' · ')}
        </p>
      )}
      {loopNames.length > 0 && <p className="layouts__error" role="alert">{G.loops(loopNames.join(' · '))}</p>}
      <div ref={boxRef} className="gt" style={{ ['--gt-row' as string]: `${ROW}px`, ['--gt-head' as string]: `${head}px`, ['--gt-lane' as string]: `${LANE}px`, ['--gt-lanes' as string]: laneEnd.length }}>
        <table className="pc__table pj__psp-table gt__table" role="treegrid" aria-labelledby="gt-head" aria-describedby="gt-keys">
          <thead>
            <tr>
              <th scope="col" className="pc__num">{G.colNr}</th>
              <th scope="col" title={explain(TERMS.pspCode)}>{T.colCode}</th>
              <th scope="col">{T.colName}</th>
              <th scope="col" title={explain(TERMS.taskDuration)}>{T.colDuration}</th>
              <th scope="col">{G.colStart}</th>
              <th scope="col">{G.colEnd}</th>
              <th scope="col" title={explain(TERMS.predecessors)}>{G.colPreds}</th>
              {showBase && <th scope="col" title={G.colBaseHint}>{G.colBase}</th>}
              {showBase && <th scope="col" title={G.colVarHint}>{G.colVar}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const gr = g.byId.get(r.id)!;
              const on = r.id === cur?.id;
              const n = r.kind === 'task' ? noteById(ws, r.id) : undefined;
              const dur = n ? Sc.durationInfo(n) : null;
              const pt = Gt.predsText(gr.preds);
              const ph = n?.phase ? phaseName.get(n.phase) : undefined;
              const extra = [ph ? G.phaseWord(ph) : '', r.kind === 'project' ? T.subproject : '', r.summary ? T.summary : '', r.milestone ? T.milestone : '', crit && gr.critical ? G.critical : '', gr.late ? G.lateShort : '', gr.manual ? T.manual : '', pt ? G.predsWord(pt) : '', r.done ? T.done : ''].filter(Boolean).join(', ');
              const dates = gr.planned ? G.dates(fmtDay(gr.start), fmtDay(gr.end), gr.days) : G.noDates;
              return (
                <tr key={r.id} className={`${on ? 'is-sel' : ''}${r.done ? ' is-done' : ''}${r.summary ? ' is-sum' : ''}${crit && gr.critical ? ' is-crit' : ''}`} aria-level={r.depth + 1} aria-expanded={r.summary ? !closed.has(r.id) : undefined} aria-selected={on}>
                  <td className="pc__num lc__muted">{gr.nr}</td>
                  <td className="pc__num pj__code">{r.code}</td>
                  <th scope="row">
                    <span className="pj__psp-name" style={{ paddingLeft: `${r.depth * 14}px` }}>
                      {r.summary ? (
                        <button type="button" className="pj__twist" tabIndex={-1} aria-hidden="true" title={closed.has(r.id) ? T.expand : T.collapse} onClick={() => toggle(r.id)}>
                          {closed.has(r.id) ? '▸' : '▾'}
                        </button>
                      ) : (
                        <span className="pj__twist" aria-hidden="true" />
                      )}
                      <button
                        type="button"
                        ref={rowRef(r.id)}
                        className="pc__name gt__name"
                        tabIndex={on ? 0 : -1}
                        aria-label={G.rowLabel(r.code, r.title, dates, extra)}
                        title={`${r.title}\n${G.rowKeys}`}
                        onClick={() => setSel(r.id)}
                        onDoubleClick={() => (r.kind === 'task' ? openNote(r.id) : onPickProject(r.id))}
                        onKeyDown={(e) => onKey(e, i)}
                      >
                        {r.kind === 'project' && <Icon name="project" size={12} className="icon icon--inline" />}
                        {r.milestone && <span className="pj__ms" aria-hidden="true">◆</span>}
                        <span>{r.title}</span>
                      </button>
                    </span>
                  </th>
                  <td className="pc__num">{!gr.planned ? <span className="lc__muted">–</span> : r.summary || !dur ? T.daysShort(gr.days) : dur.from === 'dates' || dur.from === 'default' ? <span className="pj__derived" title={T.durationFrom[dur.from]}>{T.daysShort(dur.days)}</span> : T.daysShort(dur.days)}</td>
                  <td className={`pc__num${gr.conflict ? ' pj__late' : ''}`} title={gr.conflict ? G.conflict(fmtDay(gr.conflict)) : undefined}>{fmtDay(gr.start) || '–'}</td>
                  <td className={`pc__num${gr.late ? ' pj__late' : ''}`} title={gr.late && gr.due ? G.late(fmtDay(gr.due)) : undefined}>
                    {fmtDay(gr.end) || '–'}
                    {gr.late && <span aria-hidden="true"> !</span>}
                  </td>
                  <td className="pc__num gt__preds">{pt || <span className="lc__muted">–</span>}</td>
                  {showBase && (() => {
                    const d = cmp.rows.get(r.id);
                    return (
                      <>
                        <td className="pc__num">{d?.base?.end ? fmtDay(d.base.end) : <span className="lc__muted">–</span>}</td>
                        <td className={`pc__num${d?.end && d.end > 0 ? ' pj__late' : ''}`}>{d?.added ? <span className="lc__muted">{G.baseNew}</span> : d?.end === undefined ? <span className="lc__muted">–</span> : G.varDays(d.end)}</td>
                      </>
                    );
                  })()}
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="gt__chart" style={{ width }} aria-hidden="true">
          <div className={`gt__head${phases.length ? ' has-phases' : ''}`}>
            <div className="gt__months">
              {months.map((m, k) => (
                <span key={k} style={{ left: m.left, width: m.width }}>{m.width > 30 ? m.label : ''}</span>
              ))}
            </div>
            <div className={`gt__ticks is-${prefs.scale}`}>
              {ticks.map((t, k) => (
                <span key={k} style={{ left: t.left, width: t.width }}>{t.label}</span>
              ))}
            </div>
            {phases.length > 0 && (
              <div className="gt__phases">
                {phases.map((ph, k) => (
                  <span key={ph.id} className={`gt__phase is-${k % 4}${ph.from === 'tasks' ? ' is-calc' : ''}`} style={{ left: x(ph.start), width: Math.max(3, x(ph.end) + w - x(ph.start)), top: (lanes.get(ph.id) ?? 0) * LANE + 2 }} title={G.phaseLine(ph.name, fmtDay(ph.start), fmtDay(ph.end), ph.tasks, ph.from === 'tasks', ph.outside)}>
                    {ph.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className={`gt__body is-${prefs.scale}`} style={{ height: rows.length * ROW, ['--gt-day' as string]: `${w}px` }}>
            {rows.map((r, i) => (
              <div key={r.id} className={`gt__band${r.id === cur?.id ? ' is-sel' : ''}`} style={{ top: i * ROW }} onClick={() => setSel(r.id)} />
            ))}
            {/* V116 (K7): Feiertage und freie Tage des Arbeitskalenders wie Wochenenden hinterlegt */}
            {prefs.scale !== 'month' && offBetween(from, to).map((o) => <div key={o.day} className="gt__off" style={{ left: x(o.day), width: w }} title={`${fmtDay(o.day)}: ${o.name}`} />)}
            {today >= from && today <= to && <div className="gt__today" style={{ left: x(today) + w / 2 }} title={G.today} />}
            <svg className="gt__arrows" width={width} height={rows.length * ROW}>
              <defs>
                <marker id="gt-arr" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L6 3L0 6z" /></marker>
                <marker id="gt-arr-c" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L6 3L0 6z" className="is-crit" /></marker>
              </defs>
              {arrows}
            </svg>
            {rows.map((r, i) => {
              const gr = g.byId.get(r.id)!;
              if (!gr.planned) return null;
              const top = i * ROW;
              const left = x(gr.start);
              const right = x(gr.end) + w;
              const ref = (el: HTMLDivElement | null) => (el ? barRefs.current.set(r.id, el) : barRefs.current.delete(r.id));
              const tip = `${gr.nr} ${r.title}: ${gr.start === gr.end ? fmtDay(gr.start) : `${fmtDay(gr.start)} – ${fmtDay(gr.end)}`}`;
              const pick = () => setSel(r.id);
              const open = () => (r.kind === 'task' ? openNote(r.id) : onPickProject(r.id));
              const bt = showBase ? p.baseline!.tasks[r.id] : undefined;
              const baseBar = bt?.start && bt.end ? (r.milestone ? <div className="gt__basems" style={{ left: x(bt.end) + w / 2 - 5, top: top + 9 }} title={G.baseTip(fmtDay(bt.end), '')} /> : <div className="gt__basebar" style={{ left: x(bt.start), width: Math.max(3, x(bt.end) + w - x(bt.start)), top: top + 21 }} title={G.baseTip(fmtDay(bt.start), fmtDay(bt.end))} />) : null;
              const due = gr.due && !r.summary ? <span className={`gt__due${gr.late ? ' is-late' : ''}`} style={{ left: x(gr.due) + w / 2 - 5, top: top + 2 }} title={G.deadlineMark(fmtDay(gr.due))}>⇩</span> : null;
              if (r.summary)
                return (
                  <div key={r.id}>
                    <div ref={ref} className={`gt__sumbar${crit && gr.critical ? ' is-crit' : ''}`} style={{ left, width: Math.max(2, right - left), top: top + 9 }} title={tip} onClick={pick} onDoubleClick={open} />
                    {baseBar}
                  </div>
                );
              if (r.milestone)
                return (
                  <div key={r.id}>
                    <div ref={ref} className={`gt__ms${crit && gr.critical ? ' is-crit' : ''}`} style={{ left: left + w / 2 - 7, top: top + 7 }} title={tip} onClick={pick} onDoubleClick={open} />
                    <span className="gt__label" style={{ left: left + w / 2 + 10, top }}>{fmtDay(gr.start)}</span>
                    {baseBar}
                    {due}
                  </div>
                );
              return (
                <div key={r.id}>
                  <div ref={ref} className={`gt__bar${crit && gr.critical ? ' is-crit' : ''}${gr.manual ? ' is-manual' : ''}${r.done ? ' is-done' : ''}`} style={{ left, width: Math.max(3, right - left), top: top + 7 }} title={tip} onClick={pick} onDoubleClick={open} />
                  {baseBar}
                  {due}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <p id="gt-keys" className="lc__keys">{G.rowKeys}</p>
      <p className="lc__keys gt__legend" aria-hidden="true">
        {G.legend}: <span className="gt__lg gt__lg--task" /> {G.legendItems.task} <span className="gt__lg gt__lg--crit" /> {G.legendItems.crit} <span className="gt__lg gt__lg--sum" /> {G.legendItems.sum} <span className="gt__lg gt__lg--ms" /> {G.legendItems.ms} <span className="gt__lg gt__lg--manual" /> {G.legendItems.manual} <span className="gt__due is-legend">⇩</span> {G.legendItems.due}{phases.length > 0 && <> <span className="gt__lg gt__lg--phase" /> {G.legendItems.phase}</>}
      </p>
      {note && <p className="layouts__undo" role="status">{note}</p>}
      {cur && <TaskInfo key={cur.id} ws={ws} projectId={p.id} node={cur} dispatch={dispatch} tell={tell} durRef={durRef} predRef={predRef} onPickProject={onPickProject} />}
    </section>
  );
}
