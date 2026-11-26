/**
 * F-225 P8 (V107, Doc „F-225 V107 – „Wird zu …“ Risiko · Änderung (P8)“, R1–R10): Projekt-Modus › Rad „Ansicht“ ›
 * „Risiken“ bzw. „Änderungen“. Aufbau wie Projektliste/Cockpit „Personen“ (NF-08): oben „+ Risiko“ bzw.
 * „+ Änderung“, links die Tabelle, rechts die Angaben der gewählten Zeile. Inhalte nach IPMA ICB4 (Chancen und
 * Risiken, Änderungssteuerung); Risiken zusätzlich als Risikomatrix 5 × 5. Tastatur (NF-03): Pfeile/Pos1/Ende in
 * der Tabelle, Enter in die Angaben; Matrix als Raster mit Pfeilen. Meldungen am Ort (F-214).
 * Logik in workspace/risks.ts.
 */
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { ChangeState, Note, Project, RiskLevel, RiskState, RiskStrategy, Workspace } from '../workspace/types';
import * as Rk from '../workspace/risks';
import * as Ps from '../workspace/persons';
import * as Pj from '../workspace/projects';
import { noteById, titleOf } from '../workspace/notes';
import { feedbackById } from '../workspace/feedback';
import { newId } from '../workspace/workspace';
import { STEER_TEXT as T, PSP_TEXT } from '../workspace/terms';
import { ModeWheel } from './ModeWheel';
import { Icon } from './Icon';
import { openNote } from './SourceChips';

type Kind = Rk.SteerType;

/** R7: Risiko bzw. Änderung im Projekt-Modus zeigen (aus der Karte einer Meldung) – App wechselt in den Modus, das Cockpit holt sich das Ziel. */
export const STEER_EVENT = 'esource:steer';
let pending: { project: string; note: string; kind: Kind } | null = null;
export function openSteer(project: string, note: string, kind: Kind): void {
  pending = { project, note, kind };
  window.dispatchEvent(new CustomEvent(STEER_EVENT));
}
export function takeSteer(): { project: string; note: string; kind: Kind } | null {
  const p = pending;
  pending = null;
  return p;
}
type Shape = 'list' | 'matrix';
const SHAPE_KEY = 'esource.riskShape.v1';
const loadShape = (): Shape => {
  try {
    return localStorage.getItem(SHAPE_KEY) === 'matrix' ? 'matrix' : 'list';
  } catch {
    return 'list';
  }
};
const dmy = (iso: string) => new Date(iso).toLocaleDateString('de-DE');
/** „1.200,50“ → 1200.5; leer = null; Unsinn = undefined */
const num = (v: string, signed = false): number | null | undefined => {
  if (!v.trim()) return null;
  const x = Number(v.replace(/\./g, '').replace(',', '.').replace(/[€\s]/g, '').replace('−', '-'));
  if (!Number.isFinite(x) || (!signed && x < 0)) return undefined;
  return x;
};

export function ProjectSteer({ ws, p, kind, dispatch, say, focus }: { ws: Workspace; p: Project; kind: Kind; dispatch: (a: Action) => void; say: (t: string) => void; focus?: string }) {
  const list = kind === 'risk' ? Rk.risksOf(ws, p.id) : Rk.changesOf(ws, p.id);
  const [sel, setSel] = useState<string | null>(focus ?? list[0]?.id ?? null);
  const shown = list.find((n) => n.id === sel) ?? list[0];
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [shape, setShapeState] = useState<Shape>(kind === 'risk' ? loadShape : 'list');
  const [msg, setMsg] = useState<{ text: string; undo?: () => void } | null>(null);
  const rows = useRef(new Map<string, HTMLButtonElement>());
  const tell = (text: string, undo?: () => void) => (setMsg({ text, ...(undo ? { undo } : {}) }), say(text));
  const by = ws.profile?.name || undefined;
  const base = `pjs-${kind}`;

  useEffect(() => {
    if (focus) setSel(focus);
  }, [focus]);

  const setShape = (s: Shape) => {
    setShapeState(s);
    try {
      localStorage.setItem(SHAPE_KEY, s);
    } catch {
      /* ohne Speicher: bis zum Neuladen */
    }
    say(`${T.shape}: ${T.shapes[s]}`);
  };
  const create = () => {
    const t = name.trim();
    if (!t) return;
    const id = newId();
    dispatch({ type: 'steerAdd', project: p.id, kind, id, title: t, at: Date.now(), by });
    const code = Rk.steerCodeFor(p, kind, Rk.nextNo(ws, p.id, kind));
    setSel(id);
    setAdding(false);
    setName('');
    tell(T.added(code), () => dispatch({ type: 'noteDelete', id }));
  };
  const focusRow = (id: string) => window.setTimeout(() => rows.current.get(id)?.focus(), 0);
  const rowKey = (e: KeyboardEvent, i: number) => {
    const j = e.key === 'ArrowDown' ? i + 1 : e.key === 'ArrowUp' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : -1;
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById(`${base}-details`)?.querySelector<HTMLElement>('input, textarea, select, button')?.focus();
      return;
    }
    if (j < 0 || j >= list.length) return;
    e.preventDefault();
    setSel(list[j].id);
    focusRow(list[j].id);
  };
  const owner = (id?: string) => (id ? Ps.personById(ws, id)?.name ?? '' : '');
  const decider = (id?: string) => Pj.roleOf(p, id)?.name ?? '';

  return (
    <section className="dc pjs" aria-labelledby={`${base}-head`}>
      <header className="dc__top">
        <h4 id={`${base}-head`} className="dc__head">{kind === 'risk' ? T.headRisks(p.name) : T.headChanges(p.name)}</h4>
        <button type="button" id={`${base}-add`} className="help__run" aria-expanded={adding} onClick={() => setAdding(!adding)}>
          <Icon name="plus" size={13} className="icon icon--inline" /> {kind === 'risk' ? T.addRisk : T.addChange}
        </button>
        {kind === 'risk' && (
          <span className="layouts__label pj__wheel">
            <span aria-hidden="true">{T.shape}</span>
            <ModeWheel label={T.shape} value={shape} onChange={(s) => setShape(s as Shape)} options={(['list', 'matrix'] as Shape[]).map((s) => ({ id: s, name: T.shapes[s], hint: T.shapeHints[s] }))} />
          </span>
        )}
      </header>
      <p className="help__text dc__why">{PSP_TEXT.viewHint[kind === 'risk' ? 'risks' : 'changes']}</p>
      {adding && (
        <form className="dc__new" aria-label={kind === 'risk' ? T.addRisk : T.addChange} onSubmit={(e) => (e.preventDefault(), create())}>
          <label>
            <span className="fbq__label">{T.title}</span>
            <input
              autoFocus
              type="text"
              value={name}
              maxLength={200}
              placeholder={kind === 'risk' ? T.addRiskPh : T.addChangePh}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && (e.preventDefault(), e.stopPropagation(), setAdding(false), document.getElementById(`${base}-add`)?.focus())}
            />
          </label>
          <button type="submit" className="fbq__save" disabled={!name.trim()}>{T.add}</button>
        </form>
      )}
      {msg && (
        <p className="sheet__msg dc__msg" role="status">
          {msg.text}
          {msg.undo && <button type="button" className="note__undo" onClick={() => (msg.undo!(), setMsg(null), say(T.undone))}>{T.undo}</button>}
        </p>
      )}
      {!list.length ? (
        !adding && <p className="lc__muted">{kind === 'risk' ? T.noRisks : T.noChanges}</p>
      ) : (
        <div className="pjs__body">
          <div className="pjs__left">
            {kind === 'risk' && shape === 'matrix' ? (
              <RiskMatrix ws={ws} p={p} sel={shown?.id} onPick={(id) => setSel(id)} />
            ) : (
              <table className="pc__table pjs__table" aria-labelledby={`${base}-head`}>
                <thead>
                  {kind === 'risk' ? (
                    <tr>
                      <th scope="col">{T.colNo}</th>
                      <th scope="col">{T.colTitle}</th>
                      <th scope="col" title={T.colPHint}>{T.colP}</th>
                      <th scope="col" title={T.colIHint}>{T.colI}</th>
                      <th scope="col" title={T.colScoreHint}>{T.colScore}</th>
                      <th scope="col">{T.colStrategy}</th>
                      <th scope="col">{T.colOwner}</th>
                      <th scope="col">{T.colState}</th>
                    </tr>
                  ) : (
                    <tr>
                      <th scope="col">{T.colNo}</th>
                      <th scope="col">{T.colTitle}</th>
                      <th scope="col">{T.colDays}</th>
                      <th scope="col">{T.colCost}</th>
                      <th scope="col">{T.colDecider}</th>
                      <th scope="col">{T.colState}</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {list.map((n, i) => {
                    const on = n.id === shown?.id;
                    const code = Rk.steerCode(ws, n);
                    const btn = (
                      <button
                        type="button"
                        className="pc__name"
                        ref={(el) => {
                          if (el) rows.current.set(n.id, el);
                          else rows.current.delete(n.id);
                        }}
                        aria-pressed={on}
                        tabIndex={on ? 0 : -1}
                        onClick={() => (setSel(n.id), setMsg(null))}
                        onKeyDown={(e) => rowKey(e, i)}
                      >
                        {titleOf(n)}
                      </button>
                    );
                    if (kind === 'risk') {
                      const r = n.risk!;
                      const sc = Rk.riskScore(r);
                      const tone = Rk.riskTone(sc);
                      return (
                        <tr key={n.id} className={`${on ? 'is-sel' : ''}${Rk.riskOpen(r) ? '' : ' is-closed'}`}>
                          <td className="pjs__code">{code}</td>
                          <th scope="row">{btn}</th>
                          <td className="pjs__num">{r.p ?? T.levelNone}</td>
                          <td className="pjs__num">{r.i ?? T.levelNone}</td>
                          <td className="pjs__num">
                            <span className={`pjs__score is-${tone}`} title={T.tones[tone]}>{sc ?? T.levelNone}<span className="sr-only"> ({T.tones[tone]})</span></span>
                          </td>
                          <td>{r.strategy ? T.strategies[r.strategy] : ''}</td>
                          <td>{owner(r.owner)}</td>
                          <td>{T.riskStates[r.state ?? 'open']}</td>
                        </tr>
                      );
                    }
                    const c = n.change!;
                    return (
                      <tr key={n.id} className={`${on ? 'is-sel' : ''}${Rk.changeOpen(c) ? '' : ' is-closed'}`}>
                        <td className="pjs__code">{code}</td>
                        <th scope="row">{btn}</th>
                        <td className="pjs__num">{c.days !== undefined ? T.daysText(c.days) : ''}</td>
                        <td className="pjs__num">{c.cost !== undefined ? T.euro(c.cost) : ''}</td>
                        <td>{decider(c.decider)}</td>
                        <td>
                          <span className={`pjs__cstate is-${c.state ?? 'asked'}`}>{T.changeStates[c.state ?? 'asked']}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          {shown && (
            <div id={`${base}-details`} className="pjs__details">
              {kind === 'risk' ? (
                <RiskDetails key={shown.id} ws={ws} p={p} n={shown} dispatch={dispatch} tell={tell} />
              ) : (
                <ChangeDetails key={shown.id} ws={ws} p={p} n={shown} dispatch={dispatch} tell={tell} />
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/** R3: Risikomatrix 5 × 5 – Zeilen W 5…1, Spalten A 1…5; Zelle mit Nummern; Pfeile wandern (Raster). */
function RiskMatrix({ ws, p, sel, onPick }: { ws: Workspace; p: Project; sel?: string; onPick: (id: string) => void }) {
  const m = Rk.riskMatrix(ws, p.id);
  const unrated = Rk.unratedRisks(ws, p.id);
  const grid = useRef<HTMLTableElement>(null);
  const [at, setAt] = useState<[number, number]>([0, 0]);
  const move = (e: KeyboardEvent, r: number, c: number) => {
    const d: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    const v = d[e.key];
    if (!v) return;
    e.preventDefault();
    const nr = Math.max(0, Math.min(4, r + v[0]));
    const nc = Math.max(0, Math.min(4, c + v[1]));
    setAt([nr, nc]);
    grid.current?.querySelector<HTMLElement>(`[data-cell="${nr}-${nc}"]`)?.focus();
  };
  return (
    <div className="pjs__matrixwrap">
      <table className="pjs__matrix" ref={grid} role="grid" aria-label={T.matrixLabel}>
        <caption className="sr-only">{T.matrixLabel}</caption>
        <tbody>
          {m.map((row, r) => (
            <tr key={row.p}>
              <th scope="row" className="pjs__axis" title={T.matrixP}>{row.p}</th>
              {row.cells.map((cell, c) => {
                const tone = Rk.riskTone(cell.score);
                return (
                  <td key={cell.i} className={`pjs__cell is-${tone}`}>
                    <div
                      role="gridcell"
                      data-cell={`${r}-${c}`}
                      tabIndex={at[0] === r && at[1] === c ? 0 : -1}
                      aria-label={T.matrixCell(row.p, cell.i, cell.ids.length)}
                      onKeyDown={(e) => {
                        move(e, r, c);
                        if (e.key === 'Enter' && cell.ids[0]) onPick(cell.ids[0]);
                      }}
                      onFocus={() => setAt([r, c])}
                    >
                      {cell.ids.map((id) => {
                        const n = noteById(ws, id)!;
                        return (
                          <button key={id} type="button" tabIndex={-1} className={`pjs__dot${id === sel ? ' is-on' : ''}`} title={titleOf(n)} aria-pressed={id === sel} onClick={() => onPick(id)}>
                            {Rk.steerCode(ws, n)}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
          <tr>
            <td />
            {[1, 2, 3, 4, 5].map((i) => (
              <th key={i} scope="col" className="pjs__axis" title={T.matrixI}>{i}</th>
            ))}
          </tr>
        </tbody>
      </table>
      <p className="pjs__axes" aria-hidden="true">↑ {T.matrixP} · → {T.matrixI}</p>
      {unrated.length > 0 && (
        <p className="lc__muted">
          {T.unrated(unrated.length)}{' '}
          {unrated.map((n) => (
            <button key={n.id} type="button" className="pjs__dot" onClick={() => onPick(n.id)} title={titleOf(n)}>{Rk.steerCode(ws, n)}</button>
          ))}
        </p>
      )}
    </div>
  );
}

type DetailProps = { ws: Workspace; p: Project; n: Note; dispatch: (a: Action) => void; tell: (t: string, undo?: () => void) => void };

/** Text, der beim Verlassen speichert (wie im Steckbrief), mit „Gespeichert.“ am Feld. */
function Field({ label, hint, value, area, onSave }: { label: string; hint?: string; value: string; area?: boolean; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  const [saved, setSaved] = useState(false);
  useEffect(() => setV(value), [value]);
  const done = () => {
    if (v.trim() === value.trim()) return;
    onSave(v);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };
  return (
    <label className="fbc__field">
      <span className="fbq__label">
        {label}
        {saved && <span className="fbc__saved" role="status"> · {T.saved}</span>}
      </span>
      {area ? <textarea rows={2} value={v} placeholder={hint} onChange={(e) => setV(e.target.value)} onBlur={done} /> : <input type="text" value={v} placeholder={hint} onChange={(e) => setV(e.target.value)} onBlur={done} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />}
    </label>
  );
}

function Head({ ws, n, dispatch }: { ws: Workspace; n: Note; dispatch: (a: Action) => void }) {
  const from = n.type === 'risk' ? n.risk?.from : n.change?.from;
  const fb = feedbackById(ws, from);
  return (
    <>
      <p className="pjs__code pjs__bigcode">{Rk.steerCode(ws, n)}</p>
      <Field label={T.title} value={titleOf(n)} onSave={(v) => v.trim() && dispatch({ type: 'noteEdit', id: n.id, patch: { title: v.trim() } })} />
      <Field label={T.text} value={n.text} area onSave={(v) => dispatch({ type: 'noteEdit', id: n.id, patch: { text: v } })} />
      {fb && (
        <p className="lc__muted">
          {T.from}: „{fb.title}“
        </p>
      )}
    </>
  );
}

function TaskLine({ ws, n, dispatch, tell }: DetailProps) {
  const task = n.type === 'risk' ? n.risk?.task : n.change?.task;
  const t = task ? noteById(ws, task) : undefined;
  const kind = n.type as Kind;
  if (t)
    return (
      <p className="pjs__task">
        {T.task}: <button type="button" className="help__run" onClick={() => openNote(t.id)}>{titleOf(t)}</button>
      </p>
    );
  if (!Rk.canMakeTask(ws, n)) return null;
  return (
    <p className="pjs__task">
      <button
        type="button"
        className="help__run"
        title={T.makeTaskHint[kind]}
        onClick={() => {
          const id = newId();
          dispatch({ type: 'steerTask', id: n.id, task: id, at: Date.now(), by: ws.profile?.name || undefined });
          tell(T.taskMade(Rk.steerCode(ws, n)), () => dispatch({ type: 'noteDelete', id }));
        }}
      >
        <Icon name="plus" size={13} className="icon icon--inline" /> {T.makeTask}
      </button>
      <span className="fbq__hint">{T.makeTaskHint[kind]}</span>
    </p>
  );
}

const LEVEL_OPTS = [{ id: '0', name: T.levelNone, hint: T.levelNone }, ...([1, 2, 3, 4, 5] as const).map((l) => ({ id: String(l), name: String(l), hint: T.levels[l - 1] }))];

function RiskDetails(props: DetailProps) {
  const { ws, n, dispatch } = props;
  const r = n.risk!;
  const edit = (patch: Rk.RiskPatch) => dispatch({ type: 'riskEdit', id: n.id, patch });
  const sc = Rk.riskScore(r);
  const tone = Rk.riskTone(sc);
  const people = Ps.personsOf(ws);
  return (
    <article className="pjs__card" aria-label={`${Rk.steerCode(ws, n)} ${titleOf(n)}`}>
      <Head ws={ws} n={n} dispatch={dispatch} />
      <Field label={T.cause} hint={T.causeHint} value={r.cause ?? ''} area onSave={(v) => edit({ cause: v || null })} />
      <Field label={T.event} hint={T.eventHint} value={r.event ?? ''} area onSave={(v) => edit({ event: v || null })} />
      <Field label={T.effect} hint={T.effectHint} value={r.effect ?? ''} area onSave={(v) => edit({ effect: v || null })} />
      <div className="fbc__wheel">
        <span className="fbq__label">{T.p}</span>
        <ModeWheel label={T.p} value={String(r.p ?? 0)} options={LEVEL_OPTS} onChange={(v) => edit({ p: v === '0' ? null : (Number(v) as RiskLevel) })} />
        <span className="fbq__hint">{r.p ? T.levels[r.p - 1] : ''}</span>
      </div>
      <div className="fbc__wheel">
        <span className="fbq__label">{T.i}</span>
        <ModeWheel label={T.i} value={String(r.i ?? 0)} options={LEVEL_OPTS} onChange={(v) => edit({ i: v === '0' ? null : (Number(v) as RiskLevel) })} />
        <span className="fbq__hint">{r.i ? T.levels[r.i - 1] : ''}</span>
      </div>
      <p className={`pjs__scoreline is-${tone}`} role="status">{T.score(sc, T.tones[tone])}</p>
      <div className="fbc__wheel">
        <span className="fbq__label">{T.strategy}</span>
        <ModeWheel
          label={T.strategy}
          value={r.strategy ?? 'none'}
          options={[{ id: 'none', name: T.levelNone, hint: T.levelNone }, ...Rk.RISK_STRATEGIES.map((s) => ({ id: s, name: T.strategies[s], hint: T.strategyHints[s] }))]}
          onChange={(v) => edit({ strategy: v === 'none' ? null : (v as RiskStrategy) })}
        />
        <span className="fbq__hint">{r.strategy ? T.strategyHints[r.strategy] : ''}</span>
      </div>
      <Field label={T.measure} hint={T.measureHint} value={r.measure ?? ''} area onSave={(v) => edit({ measure: v || null })} />
      <label className="fbc__field">
        <span className="fbq__label">{T.owner}</span>
        <select value={r.owner ?? ''} onChange={(e) => edit({ owner: e.target.value || null })}>
          <option value="">{T.ownerNone}</option>
          {people.map((x) => (
            <option key={x.id} value={x.id}>{x.name}</option>
          ))}
        </select>
      </label>
      <div className="fbc__wheel">
        <span className="fbq__label">{T.state}</span>
        <ModeWheel label={T.state} value={r.state ?? 'open'} options={Rk.RISK_STATES.map((s) => ({ id: s, name: T.riskStates[s] }))} onChange={(v) => edit({ state: v as RiskState })} />
      </div>
      <TaskLine {...props} />
      <p>
        <button type="button" className="help__run" onClick={() => openNote(n.id)}>{T.openNote}</button>
      </p>
    </article>
  );
}

function ChangeDetails(props: DetailProps) {
  const { ws, p, n, dispatch, tell } = props;
  const c = n.change!;
  const edit = (patch: Rk.ChangePatch) => dispatch({ type: 'changeEdit', id: n.id, patch });
  const may = Ps.hasRight(Ps.meOf(ws), 'decide');
  const [why, setWhy] = useState('');
  const [denied, setDenied] = useState(false);
  const roles = Pj.rolesOf(p);
  const state = c.state ?? 'asked';
  const decide = (s: ChangeState) => {
    if (s === state) return;
    if (!may) {
      setDenied(true);
      return;
    }
    const who = Pj.roleOf(p, c.decider)?.name || ws.profile?.name || undefined;
    dispatch({ type: 'changeDecide', id: n.id, state: s, text: why, who, at: Date.now() });
    const before = state;
    tell(`${Rk.steerCode(ws, n)}: ${T.changeStates[s]}.`, () => dispatch({ type: 'changeDecide', id: n.id, state: before, at: Date.now() }));
    setWhy('');
  };
  return (
    <article className="pjs__card" aria-label={`${Rk.steerCode(ws, n)} ${titleOf(n)}`}>
      <Head ws={ws} n={n} dispatch={dispatch} />
      <Field label={T.why} hint={T.whyHint} value={c.why ?? ''} area onSave={(v) => edit({ why: v || null })} />
      <fieldset className="pjs__impact">
        <legend className="fbq__label">{T.impactHead}</legend>
        <NumField label={T.days} hint={T.daysHint} value={c.days} signed onSave={(v) => edit({ days: v })} />
        <NumField label={T.cost} value={c.cost} signed onSave={(v) => edit({ cost: v })} />
        <Field label={T.perf} hint={T.perfHint} value={c.perf ?? ''} onSave={(v) => edit({ perf: v || null })} />
        <Field label={T.scope} hint={T.scopeHint} value={c.scope ?? ''} onSave={(v) => edit({ scope: v || null })} />
      </fieldset>
      <Field label={T.by} value={c.by ?? ''} onSave={(v) => edit({ by: v || null })} />
      <label className="fbc__field">
        <span className="fbq__label">{T.decider}</span>
        <select value={c.decider ?? ''} onChange={(e) => edit({ decider: e.target.value || null })}>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </label>
      <fieldset className="pjs__decide">
        <legend className="fbq__label">{T.decide}</legend>
        <label className="fbc__field">
          <span className="fbq__label">{T.decideText}</span>
          <input type="text" value={why} maxLength={500} onChange={(e) => setWhy(e.target.value)} />
        </label>
        <div className="fbc__wheel">
          <span className="fbq__label">{T.state}</span>
          <ModeWheel label={T.state} value={state} options={Rk.CHANGE_STATES.map((s) => ({ id: s, name: T.changeStates[s] }))} onChange={(v) => decide(v as ChangeState)} />
        </div>
        {denied && (
          <p className="layouts__error" role="alert">{T.needRight}</p>
        )}
        {c.decided && (
          <p className="pjs__decided">
            {T.decided(T.changeStates[state], dmy(c.decided.at), c.decided.who)}
            {c.decided.text ? ` – ${c.decided.text}` : ''}
          </p>
        )}
      </fieldset>
      <TaskLine {...props} />
      <p>
        <button type="button" className="help__run" onClick={() => openNote(n.id)}>{T.openNote}</button>
      </p>
    </article>
  );
}

function NumField({ label, hint, value, signed, onSave }: { label: string; hint?: string; value?: number; signed?: boolean; onSave: (v: number | null) => void }) {
  const show = value === undefined ? '' : String(value).replace('.', ',');
  const [v, setV] = useState(show);
  const [bad, setBad] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => setV(show), [show]);
  const done = () => {
    if (v.trim() === show) return;
    const x = num(v, signed);
    if (x === undefined) {
      setBad(true);
      return;
    }
    setBad(false);
    onSave(x);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };
  return (
    <label className="fbc__field">
      <span className="fbq__label">
        {label}
        {saved && <span className="fbc__saved" role="status"> · {T.saved}</span>}
      </span>
      <input type="text" inputMode="decimal" value={v} placeholder={hint} aria-invalid={bad || undefined} onChange={(e) => (setV(e.target.value), setBad(false))} onBlur={done} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
    </label>
  );
}
