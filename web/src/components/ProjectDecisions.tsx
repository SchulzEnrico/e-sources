/**
 * F-222 (V104, Doc V102 N1–N12): Nutzwertanalyse als Werkzeug im Projekt-Modus (Rad „Ansicht“ › „Entscheidungen“).
 * Aufbau wie die anderen Projekt-Ansichten (NF-08): oben die Liste der Entscheidungen mit „+ Entscheidung“ und
 * „Beispiel ansehen“, darunter die gewählte. Rad „Schritt“: Kriterien · Paarvergleich · Bewertung · Ergebnis (N9);
 * nur der aktuelle Schritt steht vorn, die Rangliste rechts ist immer sichtbar und rechnet live. Meldungen am Ort.
 * Logik in workspace/decisions.ts (reine Funktionen, Reducer-Aktionen dc…).
 * V108 (Doc F-222 V108, E1/E3): dasselbe Bauteil auch ohne Projekt – Cockpit-Modus „Entscheidungen“ mit Rad
 * „Zeigen“ Alle · Frei · je Projekt; „Entscheiden für“ in Projekt-Entscheidungen nur mit Befugnis „Entscheiden“.
 */
import React, { type CSSProperties, useEffect, useRef, useState } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { Decision, Project, Workspace } from '../workspace/types';
import * as Dc from '../workspace/decisions';
import * as Ps from '../workspace/persons';
import { newId } from '../workspace/workspace';
import { DECISION_TEXT as T } from '../workspace/terms';
import { Icon } from './Icon';
import { useOverflow } from './Overflow';
import { OVERFLOW_TEXT } from '../workspace/terms';
import { WorkPadButton, openWorkPad } from './WorkPadOpen';
import * as Pr from '../workspace/prepare';
import { requestTour, tourAutoStart } from '../workspace/tour';
import { ModeWheel } from './ModeWheel';
import { DecisionLinks } from './DecisionLinks';

type Step = 'crit' | 'pair' | 'score' | 'result';
const STEPS: Step[] = ['crit', 'pair', 'score', 'result'];
const de = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 1 });
const num = (v: string): number | null => {
  const x = Number(v.replace(',', '.').trim());
  return v.trim() === '' || !Number.isFinite(x) ? null : x;
};
/** Farbe je Kriterium (gestapelte Balken, N6) – Farbton reihum, mit Text daneben, nie nur Farbe. */
const hue = (i: number) => ({ '--dc-h': `${(i * 67 + 200) % 360}` }) as CSSProperties;

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** V108 (F-222 E2): Entscheidung im Cockpit „Entscheidungen“ öffnen – App hört auf das Ereignis. */
export const DECISION_EVENT = 'esource:decision';
export function openDecision(id: string): void {
  window.dispatchEvent(new CustomEvent(DECISION_EVENT, { detail: id }));
}
/** V108 (E2): Namen für „Entscheidung vorbereiten …“ (Aktion dcPrepare / fbBecomeDecision). */
export const prepareNames = () => ({ criterion: [1, 2, 3].map(T.criterion), option: [1, 2].map(T.option), changeCriteria: [...T.changeCriteria], changeOptions: [...T.changeOptions] });

/** Projekt-Ansicht „Entscheidungen“ (V104). */
export function ProjectDecisions({ ws, p, dispatch, say }: { ws: Workspace; p: Project; dispatch: (a: Action) => void; say: (t: string) => void }) {
  return <Decisions ws={ws} p={p} dispatch={dispatch} say={say} />;
}

/** V108 (E1): Zeigen im Cockpit – alle, nur freie oder die eines Projekts (Id). */
type Scope = 'all' | 'free' | string;

/** V108 (E1): Entscheidungen mit oder ohne Projekt; ohne `p` mit Rad „Zeigen“ (Cockpit-Modus „Entscheidungen“). */
export function Decisions({ ws, p, dispatch, say, open, scope: scope0, inPad }: { ws: Workspace; p?: Project; dispatch: (a: Action) => void; say: (t: string) => void; open?: string | null; scope?: string; inPad?: boolean }) {
  const projects = ws.projects ?? [];
  // V112 F-228 Stufe 2: Kopf mit Überlauf – Überschrift und Rad „Zeigen“ bleiben
  const topRef = useRef<HTMLElement>(null);
  const topOvf = useOverflow(topRef, { label: OVERFLOW_TEXT.viewHead, keep: '.dc__head, .dc__scope' });
  const [scope, setScope] = useState<Scope>(() => {
    const o = open ? Dc.decisionsOf(ws).find((x) => x.id === open) : undefined;
    return o ? (o.projectId ? o.projectId : 'free') : scope0 ?? 'all';
  });
  const shownScope: Scope = p ? p.id : scope === 'all' || scope === 'free' || projects.some((x) => x.id === scope) ? scope : 'all';
  const list =
    shownScope === 'all'
      ? [...Dc.decisionsOf(ws)].sort((a, b) => (b.changed ?? b.at).localeCompare(a.changed ?? a.at))
      : Dc.decisionsFor(ws, shownScope === 'free' ? null : shownScope);
  const target = p?.id ?? (shownScope !== 'all' && shownScope !== 'free' ? shownScope : undefined);
  const projectName = (id?: string) => (id ? projects.find((x) => x.id === id)?.name : undefined);
  const [sel, setSel] = useState<string | null>(open ?? list[0]?.id ?? null);
  const d = list.find((x) => x.id === sel) ?? list[0];
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [msg, setMsg] = useState<{ text: string; undo?: () => void } | null>(null);
  const tell = (text: string, undo?: () => void) => (setMsg({ text, ...(undo ? { undo } : {}) }), say(text));
  // V111: Tour „Entscheidungen“ startet einmal von selbst beim ersten Öffnen (wie „Formulare“)
  useEffect(() => {
    if (!tourAutoStart('decisions')) return;
    const t = window.setTimeout(() => requestTour('decisions', true), 700);
    return () => window.clearTimeout(t);
  }, []);

  const create = () => {
    const t = name.trim();
    if (!t) return;
    const id = newId();
    dispatch({ type: 'dcAdd', id, ids: Array.from({ length: Dc.START_CRITERIA + Dc.START_OPTIONS }, newId), title: t, ...(target ? { projectId: target } : {}), at: new Date().toISOString(), names: { criterion: [1, 2, 3].map(T.criterion), option: [1, 2].map(T.option) } });
    setSel(id);
    setAdding(false);
    setName('');
    setMsg(null);
  };
  const example = () => {
    const id = newId();
    dispatch({ type: 'dcExample', id, ids: Array.from({ length: 16 }, newId), which: target ? 'painter' : 'flat', ...(target ? { projectId: target } : {}), at: new Date().toISOString() });
    setSel(id);
    setMsg(null);
  };
  const remove = (x: Decision) => {
    const r = Dc.removeDecision(ws, x.id);
    if (!r) return;
    dispatch({ type: 'dcRemove', id: x.id });
    setSel(null);
    tell(T.removed(x.title), () => (dispatch({ type: 'dcRestore', undo: r.undo }), setSel(x.id)));
  };

  return (
    <section className="dc" aria-labelledby={inPad ? 'dc-pad-head' : 'dc-head'}>
      <header className={`dc__top${topOvf.cls}`} ref={topRef}>
        <h4 id={inPad ? 'dc-pad-head' : 'dc-head'} className="dc__head">{p ? T.head(p.name) : T.headAll}</h4>
        {!p && (
          <span className="dc__scope">
            <span className="fbq__label">{T.scopeLabel}</span>
            <ModeWheel
              label={T.scopeLabel}
              value={shownScope}
              onChange={(v) => (setScope(v), setSel(null), setMsg(null), say(`${T.scopeLabel}: ${v === 'all' ? T.scopeAll : v === 'free' ? T.scopeFree : projectName(v) ?? ''}`))}
              options={[
                { id: 'all', name: T.scopeAll, hint: T.scopeAllHint },
                { id: 'free', name: T.scopeFree, hint: T.scopeFreeHint },
                ...projects.map((x) => ({ id: x.id, name: x.name, hint: T.scopeProjectHint(x.name) })),
              ]}
            />
          </span>
        )}
        <button type="button" className="help__run" aria-expanded={adding} title={T.addHint} onClick={() => setAdding(!adding)}>
          <Icon name="plus" size={13} className="icon icon--inline" /> {T.add}
        </button>
        <button type="button" className="dc__example" title={T.exampleHint} onClick={example}>{T.example}</button>
        <button type="button" className="help__run dc__tour" title={T.tourHint} aria-label={T.tourHint} onClick={() => requestTour('decisions')}>
          <Icon name="tour" size={13} className="icon icon--inline" /> {T.tour}
        </button>
        {topOvf.knob}
        {!inPad && <WorkPadButton tab="decisions" project={p?.id ?? (shownScope !== 'all' && shownScope !== 'free' ? shownScope : undefined)} decision={d?.id} />}
      </header>
      <p className="help__text dc__why">{T.why}</p>
      {adding && (
        <form className="dc__new" aria-label={T.addLabel} onSubmit={(e) => (e.preventDefault(), create())}>
          <label>
            <span className="fbq__label">{T.addName}</span>
            <input autoFocus type="text" value={name} placeholder={T.addPh} maxLength={Dc.NAME_MAX} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && (e.preventDefault(), e.stopPropagation(), setAdding(false))} />
          </label>
          <button type="submit" className="fbq__save" disabled={!name.trim()}>{T.addOk}</button>
        </form>
      )}
      {list.length > 0 ? (
        <ul className="dc__list" aria-label={T.listLabel}>
          {list.map((x) => (
            <li key={x.id}>
              <button type="button" className={`dc__item${x.id === d?.id ? ' is-on' : ''}`} aria-pressed={x.id === d?.id} onClick={() => (setSel(x.id), setMsg(null))}>
                <span className="dc__itemtitle">{x.title}</span>
                {!p && shownScope === 'all' && <span className="dc__itemwhere">{projectName(x.projectId) ?? T.scopeFree}</span>}
                <span className={`dc__state is-${x.state}`} title={T.stateHints[x.state]}>{T.states[x.state]}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        !adding && <p className="lc__muted">{p || (shownScope !== 'all' && shownScope !== 'free') ? T.none : shownScope === 'free' ? T.noneFree : T.noneAll}</p>
      )}
      {msg && (
        <p className="sheet__msg dc__msg" role="status">
          {msg.text}
          {msg.undo && <button type="button" className="note__undo" onClick={() => (msg.undo!(), setMsg(null))}>{T.undo}</button>}
        </p>
      )}
      {d && <DecisionTool key={d.id} d={d} ws={ws} dispatch={dispatch} say={say} onRemove={() => remove(d)} />}
    </section>
  );
}

function DecisionTool({ d, ws, dispatch, say, onRemove }: { d: Decision; ws: Workspace; dispatch: (a: Action) => void; say: (t: string) => void; onRemove: () => void }) {
  const [step, setStep] = useState<Step>('crit');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const by = ws.profile?.name || undefined;
  const lock = !!d.locked;
  const op = (o: Dc.DecisionOp, saved?: string) => {
    dispatch({ type: 'dc', id: d.id, o, at: new Date().toISOString() });
    if (saved) setSavedAt(saved);
  };
  const weighed = d.criteria.filter((c) => !c.must);
  const musts = d.criteria.filter((c) => c.must);
  const open = Dc.openPoints(d);
  const openList = [open.few && T.openFew, open.weights && T.openWeights, open.cells && T.openCells(open.cells)].filter(Boolean) as string[];
  const Saved = ({ k }: { k: string }) => (savedAt === k ? <span className="fbc__saved" role="status"> · {T.saved}</span> : null);

  return (
    <article className={`dc__tool${lock ? ' is-locked' : ''}`} aria-label={d.title}>
      <div className="dc__meta">
        <label className="dc__title">
          <span className="fbq__label">{T.titleLabel}<Saved k="title" /></span>
          <input key={`t-${d.title}`} type="text" defaultValue={d.title} disabled={lock} maxLength={Dc.NAME_MAX} onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== d.title && op({ op: 'title', title: e.target.value }, 'title')} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
        </label>
        <span className={`dc__state is-${d.state}`} title={T.stateHints[d.state]}>{T.states[d.state]}</span>
        <button type="button" className="dc__del" onClick={onRemove} title={T.removeAsk} aria-label={T.removeAsk}>
          <Icon name="trash" size={13} />
        </button>
      </div>
      <label className="dc__question">
        <span className="fbq__label">{T.questionLabel}<Saved k="question" /></span>
        <textarea rows={2} defaultValue={d.question ?? ''} disabled={lock} placeholder={T.questionPh} onBlur={(e) => e.target.value.trim() !== (d.question ?? '') && op({ op: 'question', text: e.target.value }, 'question')} />
      </label>
      {lock && (
        <p className="dc__lock" role="status">
          <b>{T.decided(d.options.find((o) => o.id === d.chosen)?.name ?? '')}</b>
          {d.why ? ` – ${d.why}` : ''} · {T.locked}{' '}
          <button type="button" onClick={() => op({ op: 'reopen', by })}>{T.reopen}</button>
        </p>
      )}
      <div className="dc__stepbar">
        <span className="fbq__label">{T.stepLabel}</span>
        <ModeWheel label={T.stepLabel} value={step} onChange={(s) => (setStep(s as Step), say(`${T.stepLabel}: ${T.steps[s]}`))} options={STEPS.map((s) => ({ id: s, name: T.steps[s], hint: T.stepHints[s] }))} />
        <span className="fbq__hint">{T.stepHints[step]}</span>
      </div>
      {openList.length > 0 && !lock && (
        <p className="dc__open">
          {T.open} {openList.join(' · ')}
        </p>
      )}
      <div className={`dc__body${step === 'result' ? ' is-result' : ''}`}>
        <div className="dc__main">
          {step === 'crit' && <CritStep d={d} lock={lock} op={op} say={say} />}
          {step === 'pair' && <PairStep d={d} lock={lock} op={op} />}
          {step === 'score' && <ScoreStep d={d} ws={ws} lock={lock} op={op} by={by} weighed={weighed} musts={musts} say={say} />}
          {step === 'result' && <ResultStep d={d} lock={lock} op={op} by={by} say={say} may={!d.projectId || Ps.hasRight(Ps.meOf(ws), 'decide')} />}
        </div>
        {step !== 'result' && (
          <aside className="dc__side" aria-label={T.result}>
            <Ranking d={d} />
          </aside>
        )}
      </div>
    </article>
  );
}

type OpFn = (o: Dc.DecisionOp, saved?: string) => void;

/**
 * V111 (N9 „Ziehen zum Umsortieren“): Zeilen von Kriterien und Lösungen mit dem Griff ⠿ ziehen; Tastatur bleibt ↑ ↓.
 * Ablage zeigt eine Linie über der Zielzeile. Nur innerhalb derselben Tabelle (eigener Datentyp).
 */
const DRAG_DC = 'application/x-esource-dcrow';
function useRowDrag(kind: 'crit' | 'opt', lock: boolean, move: (id: string, to: number) => void) {
  const [over, setOver] = useState<number | null>(null);
  const [from, setFrom] = useState<string | null>(null);
  const handle = (id: string, name: string) =>
    lock ? null : (
      <span
        className="dc__grip"
        draggable
        role="img"
        aria-label={T.dragLabel(name)}
        title={T.drag}
        onDragStart={(e) => (e.dataTransfer.setData(DRAG_DC, `${kind}:${id}`), (e.dataTransfer.effectAllowed = 'move'), setFrom(id))}
        onDragEnd={() => (setFrom(null), setOver(null))}
      >
        ⠿
      </span>
    );
  const row = (i: number) =>
    lock
      ? {}
      : {
          onDragOver: (e: React.DragEvent) => {
            if (!from || !e.dataTransfer.types.includes(DRAG_DC)) return;
            e.preventDefault();
            setOver(i);
          },
          onDragLeave: () => setOver((x) => (x === i ? null : x)),
          onDrop: (e: React.DragEvent) => {
            const [k, id] = e.dataTransfer.getData(DRAG_DC).split(':');
            setOver(null);
            setFrom(null);
            if (k !== kind || !id) return;
            e.preventDefault();
            move(id, i);
          },
          'data-over': over === i || undefined,
        };
  return { handle, row };
}

/** V111 (N9): Punkte-Spalten auf Wunsch – je Gerät gemerkt. */
const POINTS_KEY = 'esource.decision.points.v1';
const readPoints = () => {
  try {
    return localStorage.getItem(POINTS_KEY) === 'on';
  } catch {
    return false;
  }
};

function CritStep({ d, lock, op, say }: { d: Decision; lock: boolean; op: OpFn; say: (t: string) => void }) {
  const drag = useRowDrag('crit', lock, (c, to) => (op({ op: 'critMove', c, to }), say(T.moved(d.criteria.find((x) => x.id === c)?.name ?? '', to + 1))));
  const sum = Dc.weightSum({ ...d, criteria: d.criteria.filter((c) => !c.must) });
  return (
    <>
      <table className="pc__table dc__table">
        <thead>
          <tr>
            <th scope="col">{T.colName}</th>
            <th scope="col" className="dc__num">{T.colWeight}</th>
            <th scope="col" title={T.colMustHint}>{T.colMust}</th>
            <th scope="col">{T.colHint}</th>
            <th scope="col"><span className="sr-only">{T.remove}</span></th>
          </tr>
        </thead>
        <tbody>
          {d.criteria.map((c, i) => (
            <tr key={c.id} style={hue(d.criteria.filter((x) => !x.must).indexOf(c))} {...drag.row(i)}>
              <td>
                {drag.handle(c.id, c.name)}
                <span className="dc__swatch" aria-hidden="true" hidden={!!c.must} />
                <input type="text" aria-label={T.colName} defaultValue={c.name} disabled={lock} maxLength={Dc.NAME_MAX} onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== c.name && op({ op: 'critName', c: c.id, name: e.target.value })} />
              </td>
              <td className="dc__num">
                {c.must ? (
                  <span className="lc__muted">–</span>
                ) : (
                  <input key={`w-${c.weight}`} type="text" inputMode="decimal" aria-label={`${T.colWeight}: ${c.name}`} defaultValue={c.weight === undefined ? '' : de(c.weight)} disabled={lock} onBlur={(e) => num(e.target.value) !== (c.weight ?? null) && op({ op: 'critWeight', c: c.id, weight: num(e.target.value) })} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
                )}
              </td>
              <td>
                <input type="checkbox" aria-label={`${T.colMust}: ${c.name}`} title={T.colMustHint} checked={!!c.must} disabled={lock} onChange={(e) => op({ op: 'critMust', c: c.id, must: e.target.checked })} />
              </td>
              <td>
                <input type="text" aria-label={`${T.colHint}: ${c.name}`} defaultValue={c.hint ?? ''} placeholder={T.colHintPh} disabled={lock} onBlur={(e) => e.target.value.trim() !== (c.hint ?? '') && op({ op: 'critHint', c: c.id, hint: e.target.value })} />
              </td>
              <td className="dc__acts">
                <button type="button" disabled={lock || i === 0} onClick={() => op({ op: 'critMove', c: c.id, to: i - 1 })} title={T.up} aria-label={`${T.up}: ${c.name}`}>↑</button>
                <button type="button" disabled={lock || i === d.criteria.length - 1} onClick={() => op({ op: 'critMove', c: c.id, to: i + 1 })} title={T.down} aria-label={`${T.down}: ${c.name}`}>↓</button>
                <button type="button" disabled={lock} onClick={() => op({ op: 'critRemove', c: c.id })} title={T.remove} aria-label={`${T.remove}: ${c.name}`}>✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="dc__under">
        <button type="button" disabled={lock} onClick={() => op({ op: 'critAdd', id: newId(), name: T.criterion(d.criteria.length + 1) })}>
          <Icon name="plus" size={12} className="icon icon--inline" /> {T.addCrit}
        </button>
        <span className={Math.abs(sum - 100) < 0.05 ? 'dc__ok' : 'dc__warn'} role="status">{Math.abs(sum - 100) < 0.05 ? T.sumOk : T.sum(de(sum))}</span>
        {Math.abs(sum - 100) >= 0.05 && <button type="button" disabled={lock} onClick={() => op({ op: 'normalize' })} title={T.normalizeHint}>{T.normalize}</button>}
      </div>
      {d.criteria.length > Dc.MANY && <p className="dc__warn">{T.many}</p>}
      {Dc.pairsDiffer(d) && <p className="dc__warn">{T.pairDiffer}</p>}
      <ul className="dc__rules">
        {T.rules.map((r) => <li key={r}>{r}</li>)}
      </ul>
    </>
  );
}

function PairStep({ d, lock, op }: { d: Decision; lock: boolean; op: OpFn }) {
  const cs = d.criteria.filter((c) => !c.must);
  if (cs.length < 2) return <p className="lc__muted">{T.pairFew}</p>;
  const pairs: [typeof cs[number], typeof cs[number]][] = [];
  for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) pairs.push([cs[i], cs[j]]);
  const w = Dc.pairWeights(cs, d.pairs ?? {})!;
  return (
    <>
      <p className="fbq__hint">{T.pairCount(pairs.length)}</p>
      <ol className="dc__pairs">
        {pairs.map(([a, b]) => {
          const ia = d.criteria.indexOf(a) < d.criteria.indexOf(b);
          const raw = d.pairs?.[Dc.pairKey(ia ? a.id : b.id, ia ? b.id : a.id)];
          const v = raw === undefined ? undefined : ia ? raw : 2 - raw;
          const name = `dc-${d.id}-${a.id}-${b.id}`;
          return (
            <li key={name}>
              <fieldset className="dc__pair" disabled={lock}>
                <legend>{T.pairQ}</legend>
                {([[2, a.name], [1, T.pairEq], [0, b.name]] as const).map(([val, label]) => (
                  <label key={val} className={v === val ? 'is-on' : ''}>
                    <input type="radio" name={name} checked={v === val} onChange={() => op({ op: 'pair', a: a.id, b: b.id, v: val })} /> {label}
                  </label>
                ))}
              </fieldset>
            </li>
          );
        })}
      </ol>
      <p className="fbq__label">{T.pairWeights}</p>
      <ul className="dc__pairw">
        {cs.map((c) => <li key={c.id}>{c.name}: <b>{de(w[c.id])} %</b>{c.weight !== undefined && Math.abs(c.weight - w[c.id]) >= 0.05 ? <span className="lc__muted"> (eingetragen {de(c.weight)} %)</span> : null}</li>)}
      </ul>
      <button type="button" className="fbq__save" disabled={lock} onClick={() => op({ op: 'pairApply' })} title={T.pairApplyHint}>{T.pairApply}</button>
    </>
  );
}

function ScoreStep({ d, ws, lock, op, by, weighed, musts, say }: { d: Decision; ws: Workspace; lock: boolean; op: OpFn; by?: string; weighed: Decision['criteria']; musts: Decision['criteria']; say: (t: string) => void }) {
  const [cell, setCell] = useState<{ c: string; o: string } | null>(null);
  const [points, setPoints] = useState(readPoints);
  const showPoints = (on: boolean) => {
    setPoints(on);
    try {
      localStorage.setItem(POINTS_KEY, on ? 'on' : 'off');
    } catch {
      /* nur für diese Sitzung */
    }
    say(`${T.pointsLabel}: ${on ? T.pointsOn : T.pointsOff}`);
  };
  const drag = useRowDrag('opt', lock, (o, to) => (op({ op: 'optMove', o, to }), say(T.moved(d.options.find((x) => x.id === o)?.name ?? '', to + 1))));
  const res = new Map(Dc.ranking(d).map((r) => [r.option.id, r]));
  const cur = cell && Dc.scoreOf(d, cell.c, cell.o);
  const cName = (id: string) => d.criteria.find((c) => c.id === id)?.name ?? '';
  const oName = (id: string) => d.options.find((o) => o.id === id)?.name ?? '';
  return (
    <>
      <div className="dc__under">
        <p className="fbq__hint">{T.scoreScale}</p>
        <span className="dc__points">
          <span className="fbq__label">{T.pointsLabel}</span>
          <ModeWheel label={T.pointsLabel} value={points ? 'on' : 'off'} onChange={(v) => showPoints(v === 'on')} options={[{ id: 'off', name: T.pointsOff, hint: T.pointsOffHint }, { id: 'on', name: T.pointsOn, hint: T.pointsOnHint }]} />
        </span>
      </div>
      <div className="dc__scroll">
        <table className="pc__table dc__table dc__scores">
          <thead>
            <tr>
              <th scope="col">{T.colOption}</th>
              {musts.map((c) => <th key={c.id} scope="col" className="dc__mustcol" title={T.colMustHint}>{c.name}</th>)}
              {weighed.map((c, i) => <th key={c.id} scope="col" className="dc__num" style={hue(i)} title={c.hint}><span className="dc__swatch" aria-hidden="true" />{c.name} <span className="lc__muted">{de(c.weight ?? 0)} %</span></th>)}
              <th scope="col" className="dc__num">{T.colTotal}</th>
              <th scope="col"><span className="sr-only">{T.remove}</span></th>
            </tr>
          </thead>
          <tbody>
            {d.options.map((o, i) => {
              const r = res.get(o.id);
              return (
                <tr key={o.id} className={r?.out ? 'is-out' : ''} {...drag.row(i)}>
                  <th scope="row" className="dc__optcell">
                    <span className="dc__optname">
                      {drag.handle(o.id, o.name)}
                      <input type="text" aria-label={T.colOption} defaultValue={o.name} disabled={lock} maxLength={Dc.NAME_MAX} onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== o.name && op({ op: 'optName', o: o.id, name: e.target.value })} />
                    </span>
                    <DecisionLinks ws={ws} o={o} lock={lock} link={(link, on) => op({ op: 'optLink', o: o.id, link, on })} />
                  </th>
                  {musts.map((c) => (
                    <td key={c.id} className="dc__mustcol">
                      <label>
                        <input type="checkbox" checked={!o.fails?.includes(c.id)} disabled={lock} onChange={(e) => op({ op: 'fails', o: o.id, c: c.id, fails: !e.target.checked })} /> {T.met}
                      </label>
                    </td>
                  ))}
                  {weighed.map((c) => {
                    const s = Dc.scoreOf(d, c.id, o.id);
                    return (
                      <td key={c.id} className={`dc__num${cell?.c === c.id && cell.o === o.id ? ' is-cell' : ''}${s?.why ? ' has-why' : ''}`}>
                        <input
                          key={`s-${s?.v}`}
                          type="number"
                          min={0}
                          max={Dc.SCORE_MAX}
                          step={1}
                          aria-label={T.scoreLabel(o.name, c.name)}
                          title={s?.why}
                          defaultValue={s?.v ?? ''}
                          disabled={lock}
                          onFocus={() => setCell({ c: c.id, o: o.id })}
                          onBlur={(e) => num(e.target.value) !== (s?.v ?? null) && op({ op: 'score', c: c.id, o: o.id, v: num(e.target.value), by })}
                          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        />
                        {points && s && <span className="dc__pts" aria-label={T.pointsCell(de((c.weight ?? 0) * s.v))}>{de((c.weight ?? 0) * s.v)}</span>}
                      </td>
                    );
                  })}
                  <td className="dc__num"><b>{r?.out ? T.out : de(r?.total ?? 0)}</b></td>
                  <td className="dc__acts">
                    <button type="button" disabled={lock || i === 0} onClick={() => op({ op: 'optMove', o: o.id, to: i - 1 })} title={T.up} aria-label={`${T.up}: ${o.name}`}>↑</button>
                    <button type="button" disabled={lock || i === d.options.length - 1} onClick={() => op({ op: 'optMove', o: o.id, to: i + 1 })} title={T.down} aria-label={`${T.down}: ${o.name}`}>↓</button>
                    <button type="button" disabled={lock} onClick={() => op({ op: 'optRemove', o: o.id })} title={T.remove} aria-label={`${T.remove}: ${o.name}`}>✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="dc__under">
        <button type="button" disabled={lock} onClick={() => op({ op: 'optAdd', id: newId(), name: T.option(d.options.length + 1) })}>
          <Icon name="plus" size={12} className="icon icon--inline" /> {T.addOpt}
        </button>
      </div>
      {cell && cur ? (
        <label className="dc__whyfield">
          <span className="fbq__label">{T.whyFor(oName(cell.o), cName(cell.c))}</span>
          <input key={`${cell.c}-${cell.o}`} type="text" defaultValue={cur.why ?? ''} placeholder={T.whyPh} disabled={lock} onBlur={(e) => e.target.value.trim() !== (cur.why ?? '') && op({ op: 'why', c: cell.c, o: cell.o, why: e.target.value })} />
        </label>
      ) : (
        <p className="lc__muted">{T.whyPick}</p>
      )}
    </>
  );
}

function Ranking({ d }: { d: Decision }) {
  const res = Dc.ranking(d);
  const weighed = d.criteria.filter((c) => !c.must);
  const max = Math.max(1, ...res.map((r) => r.total));
  const win = Dc.winner(d);
  const top = res.filter((r) => r.rank === 1).length;
  return (
    <div className="dc__rank">
      <h5 className="fbq__label">{T.result}</h5>
      <ol>
        {res.map((r) => (
          <li key={r.option.id} className={r.out ? 'is-out' : r.option.id === win?.id ? 'is-win' : ''}>
            <span className="dc__rankname">{r.out ? '–' : `${r.rank}.`} {r.option.name}</span>
            <span className="dc__rankval">{r.out ? T.out : T.points(de(r.total))}</span>
            {!r.out && (
              <span className="dc__bar" aria-hidden="true">
                {r.parts.map((pt) => <span key={pt.c} style={{ ...hue(weighed.findIndex((c) => c.id === pt.c)), width: `${(pt.points / max) * 100}%` }} title={`${weighed.find((c) => c.id === pt.c)?.name}: ${de(pt.points)}`} />)}
              </span>
            )}
          </li>
        ))}
      </ol>
      <p className="dc__verdict" role="status">{win ? T.winner(win.name) : top > 1 ? T.tie : ''}{d.state === 'draft' ? ` ${T.incomplete}` : ''}</p>
    </div>
  );
}

function ResultStep({ d, lock, op, by, say, may }: { d: Decision; lock: boolean; op: OpFn; by?: string; say: (t: string) => void; may: boolean }) {
  const win = Dc.winner(d);
  const [pick, setPick] = useState(d.chosen ?? win?.id ?? d.options[0]?.id ?? '');
  const [why, setWhy] = useState('');
  const [miss, setMiss] = useState(false);
  const need = !!pick && Dc.needsWhy(d, pick);
  const go = () => {
    if (need && !why.trim()) return setMiss(true);
    op({ op: 'decide', o: pick, why, by });
    say(T.decided(d.options.find((o) => o.id === pick)?.name ?? ''));
  };
  const save = (ext: 'md' | 'csv') => {
    download(Dc.decisionFileName(d, ext), ext === 'md' ? Dc.decisionMarkdown(d) : Dc.decisionCsv(d), ext === 'md' ? 'text/markdown' : 'text/csv');
    say(T.fileSaved);
  };
  return (
    <>
      <Ranking d={d} />
      {!lock && d.options.length > 0 && !may && <p className="dc__lock" role="status">{T.needRight}</p>}
      {!lock && d.options.length > 0 && may && (
        <form className="dc__decide" onSubmit={(e) => (e.preventDefault(), go())}>
          <label>
            <span className="fbq__label">{T.decideLabel}</span>
            <select value={pick} onChange={(e) => (setPick(e.target.value), setMiss(false))}>
              {Dc.ranking(d).map((r) => <option key={r.option.id} value={r.option.id}>{r.option.name}{r.out ? ` (${T.out})` : ''}</option>)}
            </select>
          </label>
          <label>
            <span className="fbq__label">{T.decideWhy}{need ? ` – ${T.decideWhyNeed}` : ''}</span>
            <input type="text" value={why} placeholder={T.decideWhyPh} aria-invalid={miss || undefined} onChange={(e) => (setWhy(e.target.value), setMiss(false))} />
          </label>
          <button type="submit" className="fbq__save">{T.decide}</button>
          {miss && <p className="fbq__miss" role="alert">{T.decideMissing}</p>}
        </form>
      )}
      <div className="dc__under" role="group" aria-label={T.fileHint}>
        <button type="button" onClick={() => save('md')} title={T.fileHint}><Icon name="download" size={12} className="icon icon--inline" /> {T.fileMd}</button>
        <button type="button" onClick={() => save('csv')} title={T.fileHint}><Icon name="download" size={12} className="icon icon--inline" /> {T.fileCsv}</button>
      </div>
      {d.marks?.length ? (
        <details className="dc__trail">
          <summary>{T.trail} ({d.marks.length})</summary>
          <ul>
            {d.marks.map((m, i) => <li key={i}><time dateTime={m.at}>{new Date(m.at).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}</time> · {m.text}{m.by ? ` (${m.by})` : ''}</li>)}
          </ul>
        </details>
      ) : null}
    </>
  );
}

/**
 * V110 (F-222 E2): „Entscheidung vorbereiten …“ am Ort – an einer Notiz und am Änderungsantrag.
 * Zeigt schon vorbereitete Entscheidungen mit „Öffnen“ (im Pad im Vollbild, E1-C); Rückmeldung mit Rückgängig am Ort.
 */
export function PrepareLine({ ws, from, title, project, dispatch, say, compact }: { ws: Workspace; from: Pr.PrepareFrom; title: string; project?: string; dispatch: (a: Action) => void; say: (t: string) => void; compact?: boolean }) {
  const [msg, setMsg] = useState<{ text: string; id?: string } | null>(null);
  const made = Pr.decisionsFrom(ws, from);
  const open = (d: Decision) => openWorkPad({ tab: 'decisions', decision: d.id, ...(d.projectId ? { project: d.projectId } : project ? { project } : {}) });
  const prepare = () => {
    const id = newId();
    dispatch({ type: 'dcPrepare', from, id, ids: Array.from({ length: 16 }, newId), at: new Date().toISOString(), names: prepareNames() });
    const text = T.prepared(title);
    setMsg({ text, id });
    say(text);
  };
  return (
    <div className={`dc__prep${compact ? ' is-compact' : ''}`}>
      <button type="button" className="help__run" title={T.prepareHint} onClick={prepare}>
        <Icon name="sliders" size={13} className="icon icon--inline" /> {T.prepare}
      </button>
      {made.map((d) => (
        <span key={d.id} className="dc__prepd">
          {T.preparedWith}: „{d.title}“ <span className="lc__muted">({T.states[Dc.stateOf(d)] ?? ''})</span>
          <button type="button" className="note__undo" onClick={() => open(d)}>{T.openIt}</button>
        </span>
      ))}
      {msg && (
        <span className="sheet__msg dc__msg" role="status">
          {msg.text}
          {msg.id && (
            <button type="button" className="note__undo" onClick={() => (dispatch({ type: 'dcRemove', id: msg.id! }), setMsg(null), say(T.undone))}>
              {T.undo}
            </button>
          )}
        </span>
      )}
    </div>
  );
}
