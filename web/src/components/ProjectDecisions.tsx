/**
 * F-222 (V104, Doc V102 N1–N12): Nutzwertanalyse als Werkzeug im Projekt-Modus (Rad „Ansicht“ › „Entscheidungen“).
 * Aufbau wie die anderen Projekt-Ansichten (NF-08): oben die Liste der Entscheidungen mit „+ Entscheidung“ und
 * „Beispiel ansehen“, darunter die gewählte. Rad „Schritt“: Kriterien · Paarvergleich · Bewertung · Ergebnis (N9);
 * nur der aktuelle Schritt steht vorn, die Rangliste rechts ist immer sichtbar und rechnet live. Meldungen am Ort.
 * Logik in workspace/decisions.ts (reine Funktionen, Reducer-Aktionen dc…).
 */
import { type CSSProperties, useState } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { Decision, Project, Workspace } from '../workspace/types';
import * as Dc from '../workspace/decisions';
import { newId } from '../workspace/workspace';
import { DECISION_TEXT as T } from '../workspace/terms';
import { Icon } from './Icon';
import { ModeWheel } from './ModeWheel';

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

export function ProjectDecisions({ ws, p, dispatch, say }: { ws: Workspace; p: Project; dispatch: (a: Action) => void; say: (t: string) => void }) {
  const list = Dc.decisionsFor(ws, p.id);
  const [sel, setSel] = useState<string | null>(list[0]?.id ?? null);
  const d = list.find((x) => x.id === sel) ?? list[0];
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [msg, setMsg] = useState<{ text: string; undo?: () => void } | null>(null);
  const tell = (text: string, undo?: () => void) => (setMsg({ text, ...(undo ? { undo } : {}) }), say(text));

  const create = () => {
    const t = name.trim();
    if (!t) return;
    const id = newId();
    dispatch({ type: 'dcAdd', id, ids: Array.from({ length: Dc.START_CRITERIA + Dc.START_OPTIONS }, newId), title: t, projectId: p.id, at: new Date().toISOString(), names: { criterion: [1, 2, 3].map(T.criterion), option: [1, 2].map(T.option) } });
    setSel(id);
    setAdding(false);
    setName('');
    setMsg(null);
  };
  const example = () => {
    const id = newId();
    dispatch({ type: 'dcExample', id, ids: Array.from({ length: 16 }, newId), which: 'painter', projectId: p.id, at: new Date().toISOString() });
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
    <section className="dc" aria-labelledby="dc-head">
      <header className="dc__top">
        <h4 id="dc-head" className="dc__head">{T.head(p.name)}</h4>
        <button type="button" className="help__run" aria-expanded={adding} title={T.addHint} onClick={() => setAdding(!adding)}>
          <Icon name="plus" size={13} className="icon icon--inline" /> {T.add}
        </button>
        <button type="button" className="dc__example" title={T.exampleHint} onClick={example}>{T.example}</button>
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
                <span className={`dc__state is-${x.state}`} title={T.stateHints[x.state]}>{T.states[x.state]}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        !adding && <p className="lc__muted">{T.none}</p>
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
          {step === 'crit' && <CritStep d={d} lock={lock} op={op} />}
          {step === 'pair' && <PairStep d={d} lock={lock} op={op} />}
          {step === 'score' && <ScoreStep d={d} lock={lock} op={op} by={by} weighed={weighed} musts={musts} />}
          {step === 'result' && <ResultStep d={d} lock={lock} op={op} by={by} say={say} />}
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

function CritStep({ d, lock, op }: { d: Decision; lock: boolean; op: OpFn }) {
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
            <tr key={c.id} style={hue(d.criteria.filter((x) => !x.must).indexOf(c))}>
              <td>
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

function ScoreStep({ d, lock, op, by, weighed, musts }: { d: Decision; lock: boolean; op: OpFn; by?: string; weighed: Decision['criteria']; musts: Decision['criteria'] }) {
  const [cell, setCell] = useState<{ c: string; o: string } | null>(null);
  const res = new Map(Dc.ranking(d).map((r) => [r.option.id, r]));
  const cur = cell && Dc.scoreOf(d, cell.c, cell.o);
  const cName = (id: string) => d.criteria.find((c) => c.id === id)?.name ?? '';
  const oName = (id: string) => d.options.find((o) => o.id === id)?.name ?? '';
  return (
    <>
      <p className="fbq__hint">{T.scoreScale}</p>
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
                <tr key={o.id} className={r?.out ? 'is-out' : ''}>
                  <th scope="row">
                    <input type="text" aria-label={T.colOption} defaultValue={o.name} disabled={lock} maxLength={Dc.NAME_MAX} onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== o.name && op({ op: 'optName', o: o.id, name: e.target.value })} />
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

function ResultStep({ d, lock, op, by, say }: { d: Decision; lock: boolean; op: OpFn; by?: string; say: (t: string) => void }) {
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
      {!lock && d.options.length > 0 && (
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
