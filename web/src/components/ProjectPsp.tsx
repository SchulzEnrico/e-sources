/**
 * F-206 Schritt 10 (V100): PSP (Projektstrukturplan) im Projekt-Modus – Vorbild Gliederung mit PSP-Code in
 * MS Project / iTaskX und PSP nach IPMA ICB4; Aufbau wie Projektliste und Cockpit „Personen“ (NF-08):
 * Tabelle oben, Angaben der gewählten Zeile darunter, Meldungen am Ort. Tastatur (NF-03): Pfeile wählen,
 * ←/→ zu-/aufklappen, Alt+↑/↓ verschieben, Alt+Umschalt+→/← stufen, Enter öffnet die Notiz, F2 Dauer.
 * Logik in workspace/psp.ts und workspace/schedule.ts (K1, K2, K6).
 */
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { Project, Workspace } from '../workspace/types';
import * as Psp from '../workspace/psp';
import * as Sc from '../workspace/schedule';
import { hoursText } from '../workspace/focusLoad';
import { newId } from '../workspace/workspace';
import { noteById, titleOf } from '../workspace/notes';
import * as Gt from '../workspace/gantt';
import { GANTT_TEXT as G, PSP_TEXT as T, TERMS } from '../workspace/terms';
import { noticeLater } from '../workspace/flash';
import { Icon } from './Icon';
import { ModeWheel } from './ModeWheel';
import { openNote } from './SourceChips';

const explain = (t: string) => t.split(' = ').slice(1).join(' = ') || t;
const STYLES: Psp.PspStyle[] = ['num', 'alpha', 'mixed'];
/** „2026-12-01“ → „01.12.26“ (wie MS Project). */
export const fmtDay = (d: string) => (d ? `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(2, 4)}` : '');

/**
 * V101: gemeinsame Bedienung von PSP und Gantt (NF-08 – gleiche Tasten an derselben Stelle): Auswahl,
 * Zu-/Aufklappen, Verschieben, Stufen, Anlegen, Meldung am Ort.
 */
export function usePspTree(ws: Workspace, p: Project, dispatch: (a: Action) => void, say: (t: string) => void, onPickProject: (id: string) => void, extraKey?: (e: KeyboardEvent, id: string) => boolean) {
  const tree = Psp.pspTree(ws, p.id);
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const rows = Psp.pspRows(tree, closed);
  const [sel, setSel] = useState<string | null>(rows[0]?.id ?? null);
  const cur = rows.find((r) => r.id === sel) ?? rows[0];
  const [note, setNote] = useState('');
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const durRef = useRef<HTMLInputElement>(null);
  const later = (f: () => void) => window.setTimeout(f, 0);
  const focusRow = (id: string) => later(() => refs.current.get(id)?.focus());
  useEffect(() => {
    if (!note) return;
    const t = noticeLater(() => setNote(''));
    return () => window.clearTimeout(t);
  }, [note]);
  const tell = (t: string) => (setNote(t), say(t));
  const codeAfter = (w: Workspace, id: string) => Psp.findPsp(Psp.pspTree(w, p.id), id)?.node.code ?? '';

  const toggle = (id: string, open?: boolean) =>
    setClosed((c) => {
      const n = new Set(c);
      const shut = open === undefined ? !n.has(id) : !open;
      if (shut) n.add(id);
      else n.delete(id);
      return n;
    });

  const create = (t: string, under: boolean): boolean => {
    if (!t) return false;
    const id = newId();
    const opts = under && cur ? { under: cur.id } : cur ? { after: cur.id } : {};
    const r = Psp.addPspTask(ws, p.id, t, { id, ...opts });
    if (!r) return false;
    dispatch({ type: 'pspAdd', project: p.id, title: t, note: id, ...opts });
    if (under && cur) toggle(cur.id, true);
    setSel(id);
    tell(`${T.created(t)} ${T.moved(codeAfter(r.ws, id))}`);
    return true;
  };

  const shift = (id: string, out: boolean) => {
    const r = out ? Psp.outdentPsp(ws, p.id, id) : Psp.indentPsp(ws, p.id, id);
    if (!r.ok) return tell(T.shift[r.reason]);
    dispatch({ type: 'pspShift', project: p.id, id, out });
    tell(T.moved(codeAfter(r.ws, id)));
    focusRow(id);
  };
  const move = (id: string, by: number) => {
    const next = Psp.movePsp(ws, p.id, id, by);
    if (next === ws) return tell(T.edge);
    dispatch({ type: 'pspMove', project: p.id, id, by });
    tell(T.moved(codeAfter(next, id)));
    focusRow(id);
  };

  const onKey = (e: KeyboardEvent, i: number) => {
    const r = rows[i];
    if (extraKey?.(e, r.id)) return;
    const alt = e.altKey;
    if (alt && e.shiftKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) return e.preventDefault(), shift(r.id, e.key === 'ArrowLeft');
    if (alt && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) return e.preventDefault(), move(r.id, e.key === 'ArrowUp' ? -1 : 1);
    let j = -1;
    if (e.key === 'ArrowDown') j = Math.min(rows.length - 1, i + 1);
    else if (e.key === 'ArrowUp') j = Math.max(0, i - 1);
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = rows.length - 1;
    else if (e.key === 'ArrowRight' && r.summary) {
      if (closed.has(r.id)) return e.preventDefault(), toggle(r.id, true);
      j = i + 1;
    } else if (e.key === 'ArrowLeft') {
      if (r.summary && !closed.has(r.id)) return e.preventDefault(), toggle(r.id, false);
      const up = Psp.findPsp(tree, r.id)?.parent;
      if (up) j = rows.findIndex((x) => x.id === up.id);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      return r.kind === 'task' ? openNote(r.id) : onPickProject(r.id);
    } else if (e.key === 'F2' && r.kind === 'task') return e.preventDefault(), setSel(r.id), later(() => durRef.current?.focus());
    if (j < 0) return;
    e.preventDefault();
    setSel(rows[j].id);
    focusRow(rows[j].id);
  };
  const rowRef = (id: string) => (el: HTMLButtonElement | null) => {
    if (el) refs.current.set(id, el);
    else refs.current.delete(id);
  };
  return { tree, rows, closed, toggle, sel, setSel, cur, note, tell, durRef, focusRow, onKey, rowRef, create, later };
}

export function ProjectPsp({ ws, p, dispatch, say, onPickProject }: { ws: Workspace; p: Project; dispatch: (a: Action) => void; say: (t: string) => void; onPickProject: (id: string) => void }) {
  const { rows, closed, toggle, setSel, cur, note, tell, durRef, focusRow, onKey, rowRef, create: make } = usePspTree(ws, p, dispatch, say, onPickProject);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [prefix, setPrefix] = useState(p.psp?.prefix ?? '');
  const create = (under: boolean) => make(title.trim(), under) && setTitle('');

  const savePrefix = () => {
    const v = prefix.trim();
    if (v === (p.psp?.prefix ?? '')) return;
    dispatch({ type: 'projectEdit', id: p.id, patch: { psp: { ...p.psp, prefix: v || undefined } } });
    tell(`${T.prefix}: ${T.saved}`);
  };

  return (
    <section className="pc__info pj__info pj__psp" aria-labelledby="psp-head">
      <h4 id="psp-head" className="radar__detail-head" title={explain(TERMS.psp)}>
        <Icon name="psp" size={16} className="icon icon--inline" /> {T.head(p.name)}
      </h4>
      <div className="pc__row pj__psp-set">
        <label className="layouts__label" title={T.prefixHint}>
          {T.prefix}
          <input value={prefix} maxLength={12} size={6} onChange={(e) => setPrefix(e.target.value)} onBlur={savePrefix} onKeyDown={(e) => e.key === 'Enter' && savePrefix()} />
        </label>
        <div className="layouts__label pj__wheel">
          <span aria-hidden="true">{T.style}</span>
          <ModeWheel
            label={T.style}
            value={p.psp?.style ?? 'num'}
            onChange={(s) => (dispatch({ type: 'projectEdit', id: p.id, patch: { psp: { ...p.psp, style: s as Psp.PspStyle } } }), tell(`${T.style}: ${T.styles[s as Psp.PspStyle]}`))}
            options={STYLES.map((s) => ({ id: s, name: T.styles[s], hint: T.styleHint[s] }))}
          />
        </div>
        <button type="button" className="help__run" aria-expanded={adding} title={T.addHint} onClick={() => setAdding((a) => !a)}>
          <Icon name="plus" size={13} className="icon icon--inline" /> {T.add}
        </button>
      </div>
      {adding && (
        <div className="pc__row" role="group" aria-label={T.addLabel}>
          <label className="layouts__label pj__psp-new">
            {T.addLabel}
            <input
              autoFocus
              value={title}
              aria-describedby="psp-addkeys"
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.preventDefault(), create(e.shiftKey);
                else if (e.key === 'Escape') e.preventDefault(), setAdding(false), cur && focusRow(cur.id);
              }}
            />
          </label>
          <button type="button" className="help__run" disabled={!title.trim()} onClick={() => create(false)}>{T.create}</button>
          <p id="psp-addkeys" className="lc__keys">{T.addKeys}</p>
        </div>
      )}
      {!rows.length ? (
        <p className="help__text">{T.empty}</p>
      ) : (
        <div className="pc__tablewrap">
          <table className="pc__table pj__psp-table" role="treegrid" aria-labelledby="psp-head" aria-describedby="psp-keys">
            <thead>
              <tr>
                <th scope="col" title={explain(TERMS.pspCode)}>{T.colCode}</th>
                <th scope="col">{T.colName}</th>
                <th scope="col" title={explain(TERMS.taskDuration)}>{T.colDuration}</th>
                <th scope="col">{T.colEffort}</th>
                <th scope="col" title={explain(TERMS.taskManual)}>{T.colPlan}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const on = r.id === cur?.id;
                const n = r.kind === 'task' ? noteById(ws, r.id) : undefined;
                const dur = n ? Sc.durationInfo(n) : null;
                const extra = [r.kind === 'project' ? T.subproject : '', r.summary ? T.summary : '', r.milestone ? T.milestone : '', r.done ? T.done : ''].filter(Boolean).join(', ');
                return (
                  <tr key={r.id} className={`${on ? 'is-sel' : ''}${r.done ? ' is-done' : ''}${r.summary ? ' is-sum' : ''}`} aria-level={r.depth + 1} aria-expanded={r.summary ? !closed.has(r.id) : undefined} aria-selected={on}>
                    <td className="pc__num pj__code">{r.code}</td>
                    <th scope="row">
                      <span className="pj__psp-name" style={{ paddingLeft: `${r.depth * 16}px` }}>
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
                          className="pc__name"
                          tabIndex={on ? 0 : -1}
                          aria-label={T.rowLabel(r.code, r.title, extra)}
                          title={T.rowKeys}
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
                    <td className="pc__num">
                      {!dur || r.summary ? <span className="lc__muted">–</span> : dur.from === 'dates' || dur.from === 'default' ? <span className="pj__derived" title={T.durationFrom[dur.from]}>{T.daysShort(dur.days)}<span className="sr-only"> ({T.derived})</span></span> : T.daysShort(dur.days)}
                    </td>
                    <td className="pc__num">{r.effort ? hoursText(r.effort) : <span className="lc__muted">–</span>}</td>
                    <td>{n ? <span className={`pj__plan${Sc.isManual(n) ? ' is-manual' : ''}`} title={Sc.isManual(n) ? T.manual : T.auto}>{Sc.isManual(n) ? T.manualShort : T.autoShort}</span> : <span className="lc__muted">–</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p id="psp-keys" className="lc__keys">{T.rowKeys}</p>
        </div>
      )}
      {note && <p className="layouts__undo" role="status">{note}</p>}
      {cur && <TaskInfo key={cur.id} ws={ws} projectId={p.id} node={cur} dispatch={dispatch} tell={tell} durRef={durRef} onPickProject={onPickProject} />}
    </section>
  );
}

/** Angaben des gewählten Vorgangs (MS Project: „Informationen zum Vorgang“). */
export function TaskInfo({ ws, projectId, node, dispatch, tell, durRef, predRef, onPickProject }: { ws: Workspace; projectId: string; node: Psp.PspNode; dispatch: (a: Action) => void; tell: (t: string) => void; durRef: React.RefObject<HTMLInputElement>; predRef?: React.RefObject<HTMLInputElement>; onPickProject: (id: string) => void }) {
  const n = node.kind === 'task' ? noteById(ws, node.id) : undefined;
  const info = n ? Sc.durationInfo(n) : null;
  const [dur, setDur] = useState(n?.duration !== undefined ? String(n.duration) : '');
  const [bad, setBad] = useState(false);
  const g = Gt.ganttOf(ws, projectId);
  const row = g.byId.get(node.id);
  const [preds, setPreds] = useState(row ? Gt.predsText(row.preds) : '');
  const [predErr, setPredErr] = useState('');
  if (!n || !info) {
    return (
      <fieldset className="pc__set">
        <legend>{node.code} {node.title}</legend>
        <p>{T.subInfo(node.title)}</p>
        <button type="button" className="help__run" onClick={() => onPickProject(node.id)}>{T.showProject}</button>
      </fieldset>
    );
  }
  const plan = (patch: Sc.TaskPlan, text: string) => (dispatch({ type: 'taskPlan', id: n.id, plan: patch }), tell(text));
  const saveDur = () => {
    const v = Sc.parseDurationInput(dur);
    if (v === undefined) return setBad(true);
    setBad(false);
    if ((v ?? undefined) === n.duration) return;
    plan({ duration: v }, `${T.colDuration}: ${v === null ? T.durationEmpty : T.days(v)}`);
  };
  const savePreds = () => {
    if (!row) return;
    const inp = Gt.parsePredInput(preds, g.rows);
    if (inp.bad.length) return setPredErr(G.predsBad(inp.bad.join('; ')));
    const r = Gt.setPreds(ws, projectId, n.id, inp.links);
    if (!r.ok) {
      const name = (id?: string) => (id ? `${g.byId.get(id)?.nr ?? ''} ${titleOf(noteById(ws, id)!)}`.trim() : '');
      return setPredErr(r.reason === 'circle' ? `${G.predsNo.circle}: ${(r.path ?? []).map((id) => g.byId.get(id)?.nr ?? '?').join(' → ')}.` : `${G.predsNo[r.reason]}${r.id && r.reason !== 'self' ? ` (${name(r.id)})` : ''}`);
    }
    setPredErr('');
    const text = Gt.predsText(inp.links.map((l) => ({ ...l, nr: g.byId.get(l.id)?.nr ?? 0 })));
    setPreds(text);
    if (text === Gt.predsText(row.preds)) return;
    dispatch({ type: 'taskPreds', project: projectId, id: n.id, links: inp.links });
    tell(G.predsSaved(text));
  };
  const dates = row?.planned ? G.dates(fmtDay(row.start), fmtDay(row.end), row.days) : G.noDates;
  return (
    <fieldset className="pc__set">
      <legend>{T.info}: {node.code} {node.title}</legend>
      {row && (
        <div className="pj__timing">
          <p>
            <strong>{G.timing}:</strong> {row.planned ? G.timingText(dates, G.floatDays(row.float)) : dates}
            {row.critical && <span className="pj__crit-tag"> · {G.critical}</span>}
            <span className="lc__muted"> · {Sc.isManual(n) ? G.manualFrom : G.derivedFrom}</span>
          </p>
          {row.late && row.due && <p className="layouts__error">{G.late(fmtDay(row.due))}</p>}
          {row.conflict && <p className="layouts__error">{G.conflict(fmtDay(row.conflict))}</p>}
        </div>
      )}
      {row && (
        <>
          <label className="layouts__label" title={explain(TERMS.predecessors)}>
            {G.predsLabel}
            <input
              ref={predRef}
              value={preds}
              placeholder={G.predsPlaceholder}
              aria-invalid={!!predErr}
              aria-describedby="psp-pred-hint"
              onChange={(e) => (setPreds(e.target.value), setPredErr(''))}
              onBlur={savePreds}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), savePreds())}
            />
          </label>
          <p id="psp-pred-hint" className={predErr ? 'layouts__error' : 'lc__keys'} role={predErr ? 'alert' : undefined}>
            {predErr || explain(TERMS.predecessors)}
            {!predErr && row.outside > 0 && <> {G.outside(row.outside)}</>}
          </p>
        </>
      )}
      <label className="layouts__label" title={explain(TERMS.taskDuration)}>
        {T.durationLabel}
        <input
          ref={durRef}
          value={dur}
          inputMode="numeric"
          disabled={!!n.milestone}
          placeholder={info.from === 'set' ? '' : String(info.days)}
          aria-invalid={bad}
          aria-describedby="psp-dur-hint"
          onChange={(e) => setDur(e.target.value)}
          onBlur={saveDur}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), saveDur())}
        />
      </label>
      <p id="psp-dur-hint" className={bad ? 'layouts__error' : 'lc__keys'} role={bad ? 'alert' : undefined}>
        {bad ? T.durationBad : info.from === 'dates' || info.from === 'default' ? `${T.days(info.days)} – ${T.durationFrom[info.from]} (${T.durationEmpty})` : n.milestone ? T.milestoneLabel : T.days(info.days)}
      </p>
      <div className="layouts__label pj__wheel" title={explain(TERMS.taskManual)}>
        <span aria-hidden="true">{T.plan}</span>
        <ModeWheel label={T.planLabel} value={Sc.isManual(n) ? 'manual' : 'auto'} onChange={(v) => plan({ manual: v === 'manual' }, `${T.plan}: ${v === 'manual' ? T.manual : T.auto}`)} options={[{ id: 'auto', name: T.auto }, { id: 'manual', name: T.manual }]} />
      </div>
      <label className="pc__check">
        <input type="checkbox" checked={!!n.milestone} onChange={(e) => (plan({ milestone: e.target.checked }, `${T.milestone}: ${e.target.checked ? 'an' : 'aus'}`), e.target.checked && setDur(''))} />
        {T.milestoneLabel}
      </label>
      <button type="button" className="help__run" onClick={() => openNote(n.id)}>
        <Icon name="note" size={13} className="icon icon--inline" /> {T.open}
      </button>
    </fieldset>
  );
}
