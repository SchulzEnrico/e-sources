/**
 * V139 (F-232 P9, Rest): Feedback (Problemstellung) und Entscheidungsvorlage (Nutzwertanalyse) als Blatt wie auf
 * Papier – gleicher Aufbau wie Steckbrief und Formulare (helles Blatt, Kopfzeile, zweispaltige Tabelle Bezeichnung |
 * Wert, Rad „Größe“). Jede Wertzelle ist direkt ein Eingabefeld (Speichern beim Verlassen, Meldung am Feld);
 * gerechnete Werte (Gewichtssumme, Nutzwert, Rang, Empfehlung) stehen blass mit Hinweis. Rad „Darstellung“ an
 * derselben Stelle in beiden Ansichten (NF-08), je Gerät gemerkt.
 */
import { useEffect, useRef, useState } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { Decision, Feedback, FeedbackKind, FeedbackSeverity, Project, Workspace } from '../workspace/types';
import * as Fb from '../workspace/feedback';
import * as Dc from '../workspace/decisions';
import * as Pj from '../workspace/projects';
import { noticeLater } from '../workspace/flash';
import { DOC_SHEET_TEXT as T } from '../workspace/terms';
import { ModeWheel } from './ModeWheel';
import { Field, PaperSizeWheel, Row, paperZoom, usePaperSize } from './ProjectSheet';

const de = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 1 });
const dmy = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/** Rad „Darstellung“ – Wahl je Gerät gemerkt (eigener Schlüssel je Ansicht). */
export function useShape<S extends string>(key: string, values: readonly S[], fallback: S): [S, (v: S) => void] {
  const read = (): S => {
    try {
      const v = localStorage.getItem(key);
      return (values as readonly string[]).includes(v ?? '') ? (v as S) : fallback;
    } catch {
      return fallback;
    }
  };
  const [v, setV] = useState<S>(read);
  const set = (x: S) => {
    setV(x);
    try {
      localStorage.setItem(key, x);
    } catch {
      /* nur bis zum Neuladen */
    }
  };
  return [v, set];
}
export function ShapeWheel<S extends string>({ value, onChange, options, say }: { value: S; onChange: (v: S) => void; options: { id: S; name: string; hint: string }[]; say: (t: string) => void }) {
  return (
    <span className="layouts__label pj__wheel">
      <span aria-hidden="true">{T.shape}</span>
      <ModeWheel label={T.shape} value={value} onChange={(v) => (onChange(v as S), say(T.shapeSaid(options.find((o) => o.id === v)?.name ?? v)))} options={options} />
    </span>
  );
}

/** Meldung am Feld (wie im Steckbrief): verschwindet nach kurzer Zeit. */
function useFieldMsg(say: (t: string) => void) {
  const [msg, setMsg] = useState<{ text: string; at: string } | null>(null);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const tell = (at: string, text: string) => {
    window.clearTimeout(timer.current);
    setMsg({ text, at });
    say(text);
    timer.current = noticeLater(() => setMsg(null));
  };
  const m = (at: string) => (msg?.at === at ? <span className="paper__msg" role="status">{msg.text}</span> : null);
  return { tell, m };
}

// ———————————————————————————————————————————— Problemstellung

/** Ansicht „Meldungen“ › Darstellung „Blatt“: Rad „Meldung“ und das Blatt der gewählten Meldung. */
export function FeedbackPaper({ ws, p, dispatch, say }: { ws: Workspace; p: Project; dispatch: (a: Action) => void; say: (t: string) => void }) {
  const list = Fb.feedbackOf(ws)
    .filter((f) => f.project === p.id)
    .sort((a, b) => b.at.localeCompare(a.at));
  const [pick, setPick] = useState('');
  const f = list.find((x) => x.id === pick) ?? list[0];
  if (!f) return <p className="lc__muted">{T.none}</p>;
  return (
    <>
      <div className="paper__bar">
        <span className="layouts__label pj__wheel">
          <span aria-hidden="true">{T.pick}</span>
          <ModeWheel label={T.pick} value={f.id} onChange={(id) => (setPick(id), say(`${T.pick}: ${list.find((x) => x.id === id)?.title ?? ''}`))} options={list.map((x) => ({ id: x.id, name: x.title, hint: T.pickHint }))} />
        </span>
      </div>
      <FeedbackSheet key={f.id} f={f} p={p} dispatch={dispatch} say={say} />
    </>
  );
}

function FeedbackSheet({ f, p, dispatch, say }: { f: Feedback; p: Project; dispatch: (a: Action) => void; say: (t: string) => void }) {
  const [size, setSize] = usePaperSize(say);
  const { tell, m } = useFieldMsg(say);
  const raw = p.feedbackForm;
  const secs = Fb.problemSheet(f, raw);
  const gaps = Fb.sheetGaps(secs);
  const edit = (patch: Fb.FeedbackPatch, at: string, label: string) => {
    dispatch({ type: 'fbEdit', id: f.id, patch });
    tell(at, T.saved(label));
  };
  const role = Pj.roleOf(p, f.to);
  const place = Fb.placeLine(f);
  const star = (r: { required: boolean; empty: boolean }) => (r.required ? <span className={`paper__req${r.empty ? ' is-open' : ''}`} title={T.required} aria-label={T.required}> *</span> : null);

  const cell = (r: Fb.SheetRow) => {
    if (r.kind === 'text')
      return <Field label={r.label} value={f[r.key]} multi onSave={(v) => edit({ [r.key]: (v as string) ?? '' }, r.key, r.label)} />;
    if (r.kind === 'severity')
      return (
        <select className="paper__in" aria-label={r.label} value={f.severity ?? ''} onChange={(e) => edit({ severity: (e.target.value || undefined) as FeedbackSeverity | undefined }, 'severity', r.label)}>
          <option value="">{T.sevNone}</option>
          {Fb.FEEDBACK_SEVERITIES.map((s) => (
            <option key={s} value={s}>{Fb.FILE_LABELS.severity[s]}</option>
          ))}
        </select>
      );
    const v = f.extra?.[r.def.id];
    const put = (x: string | number | boolean | null) => edit({ extra: { [r.def.id]: x } }, r.key, r.label);
    if (r.def.type === 'bool')
      return (
        <select className="paper__in" aria-label={r.label} value={v === true ? 'y' : v === false ? 'n' : ''} onChange={(e) => put(e.target.value === 'y' ? true : e.target.value === 'n' ? false : null)}>
          <option value="">{T.sevNone}</option>
          <option value="y">{T.yes}</option>
          <option value="n">{T.no}</option>
        </select>
      );
    if (r.def.type === 'choice')
      return (
        <select className="paper__in" aria-label={r.label} value={typeof v === 'string' ? v : ''} onChange={(e) => put(e.target.value || null)}>
          <option value="">{T.sevNone}</option>
          {(r.def.options ?? []).map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      );
    if (r.def.type === 'date') return <Field label={r.label} kind="date" value={typeof v === 'string' ? v : undefined} onSave={(x) => put(x)} />;
    if (r.def.type === 'number')
      return (
        <Field
          label={r.label}
          value={typeof v === 'number' ? String(v).replace('.', ',') : undefined}
          onSave={(x) => {
            if (x === null) return put(null);
            const n = Number(String(x).replace(/\./g, '').replace(',', '.'));
            if (!Number.isFinite(n)) return tell(r.key, T.badNum);
            put(n);
          }}
        />
      );
    return <Field label={r.label} value={typeof v === 'string' ? v : undefined} multi onSave={(x) => put((x as string) ?? null)} />;
  };

  return (
    <div className="paper__wrap">
      <div className="paper__bar">
        <PaperSizeWheel size={size} setSize={setSize} />
        {gaps.length > 0 && <span className="paper__gaps">{T.gaps(gaps)}</span>}
      </div>
      <article className="paper paper--form" style={paperZoom(size)} aria-label={T.fbTitle(f.title, p.name)}>
        <header className="paper__head">
          <span className="paper__chapter">{T.fbChapter}</span>
          <span className="paper__project">{p.name}</span>
        </header>
        <h2 className="paper__h">{T.fbHeading}</h2>
        <table className="paper__table">
          <colgroup>
            <col className="paper__colL" />
            <col />
          </colgroup>
          <tbody>
            <Row label={T.title} msg={m('title')}>
              <Field label={T.title} value={f.title} strong onSave={(v) => v && edit({ title: v as string }, 'title', T.title)} />
            </Row>
            <Row label={T.kind} msg={m('kind')}>
              <select className="paper__in" aria-label={T.kind} value={f.kind} onChange={(e) => edit({ kind: e.target.value as FeedbackKind }, 'kind', T.kind)}>
                {Fb.FEEDBACK_KINDS.map((k) => (
                  <option key={k} value={k}>{Fb.kindName(raw, k)}</option>
                ))}
              </select>
            </Row>
            <Row label={T.at} msg={null}><span className="paper__ro">{dmy(f.at)}</span></Row>
            <Row label={T.to} msg={null}><span className="paper__ro">{role?.name ?? '–'}</span></Row>
            <Row label={T.state} msg={null}>
              <span className="paper__ro paper__calc" title={T.stateHint}>{Fb.FILE_LABELS.state[f.state]}{f.fixedIn ? ` · ${f.fixedIn}` : ''}</span>
            </Row>
            {place && <Row label={T.place} msg={null}><span className="paper__ro">{place}</span></Row>}
            {secs.map((s) => [
              <tr key={`h-${s.head}`} className="paper__section">
                <th scope="rowgroup" colSpan={2}>{s.head}</th>
              </tr>,
              ...s.rows.map((r) => (
                <tr key={r.key}>
                  <th scope="row">{r.label}{star(r)}</th>
                  <td>
                    {cell(r)}
                    {m(r.key)}
                  </td>
                </tr>
              )),
            ])}
          </tbody>
        </table>
        <p className="paper__caption">{T.fbCaption}</p>
      </article>
    </div>
  );
}

// ———————————————————————————————————————————— Entscheidungsvorlage

/** Entscheidungsvorlage auf dem Blatt: Kriterien mit Gewichten, Bewertungsmatrix, Nutzwert, Rang, Ergebnis. */
export function DecisionSheet({ d, ws, dispatch, say }: { d: Decision; ws: Workspace; dispatch: (a: Action) => void; say: (t: string) => void }) {
  const [size, setSize] = usePaperSize(say);
  const { tell, m } = useFieldMsg(say);
  const lock = !!d.locked;
  const by = ws.profile?.name || undefined;
  const op = (o: Dc.DecisionOp, at: string, label: string) => {
    dispatch({ type: 'dc', id: d.id, o, at: new Date().toISOString() });
    tell(at, T.saved(label));
  };
  const weighed = d.criteria.filter((c) => !c.must);
  const musts = d.criteria.filter((c) => c.must);
  const res = Dc.ranking(d);
  const sum = Dc.weightSum({ ...d, criteria: weighed });
  const win = Dc.winner(d);
  const winRes = win ? res.find((r) => r.option.id === win.id) : undefined;
  const chosen = d.options.find((o) => o.id === d.chosen);
  const project = d.projectId ? (ws.projects ?? []).find((x) => x.id === d.projectId)?.name : undefined;
  const num = (v: string): number | null | undefined => {
    if (!v.trim()) return null;
    const x = Number(v.replace(',', '.').trim());
    return Number.isFinite(x) ? x : undefined;
  };

  return (
    <div className="paper__wrap">
      <div className="paper__bar">
        <PaperSizeWheel size={size} setSize={setSize} />
        {lock && <span className="paper__gaps">{T.locked}</span>}
      </div>
      <article className={`paper paper--form${weighed.length > 5 ? ' is-wide' : ''}`} style={paperZoom(size)} aria-label={T.dcTitle(d.title, project ?? '')}>
        <header className="paper__head">
          <span className="paper__chapter">{T.dcChapter}</span>
          <span className="paper__project">{project ?? ''}</span>
        </header>
        <h2 className="paper__h">{T.dcHeading}</h2>
        <table className="paper__table">
          <colgroup>
            <col className="paper__colL" />
            <col />
          </colgroup>
          <tbody>
            <Row label={T.dcName} msg={m('title')}>
              {lock ? <span className="paper__ro is-strong">{d.title}</span> : <Field label={T.dcName} value={d.title} strong onSave={(v) => v && op({ op: 'title', title: v as string }, 'title', T.dcName)} />}
            </Row>
            <Row label={T.question} msg={m('question')}>
              {lock ? <span className="paper__ro">{d.question ?? '–'}</span> : <Field label={T.question} value={d.question} multi onSave={(v) => op({ op: 'question', text: (v as string) ?? '' }, 'question', T.question)} />}
            </Row>
            <Row label={T.created} msg={null}><span className="paper__ro">{dmy(d.at)}</span></Row>
            <Row label={T.musts} msg={null}>
              {musts.length ? (
                <ul className="paper__list">
                  {musts.map((c) => {
                    const fails = d.options.filter((o) => o.fails?.includes(c.id)).map((o) => o.name);
                    return (
                      <li key={c.id}>
                        <b>{c.name}</b> – <span className="paper__calc">{fails.length ? T.mustFails(fails.join(', ')) : T.mustAll}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <span className="paper__muted">{T.mustsNone}</span>
              )}
            </Row>
            <tr className="paper__section">
              <th scope="rowgroup" colSpan={2}>{T.weights}</th>
            </tr>
            <tr>
              <td colSpan={2} className="paper__sub">
                {weighed.length ? (
                  <table className="paper__grid">
                    <thead>
                      <tr>
                        <th scope="col">{T.colCrit}</th>
                        <th scope="col">{T.colWeight}</th>
                        <th scope="col">{T.colHint}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weighed.map((c) => (
                        <tr key={c.id}>
                          <th scope="row">{c.name}</th>
                          <td className="paper__num">
                            <input
                              key={`w-${c.id}-${c.weight ?? ''}`}
                              className="paper__in paper__cellin"
                              inputMode="decimal"
                              aria-label={T.weightLabel(c.name)}
                              defaultValue={c.weight === undefined ? '' : de(c.weight)}
                              disabled={lock}
                              onBlur={(e) => {
                                const x = num(e.target.value);
                                if (x === undefined) return tell(`w-${c.id}`, T.badNum);
                                if (x === (c.weight ?? null)) return;
                                op({ op: 'critWeight', c: c.id, weight: x === null ? null : Math.max(0, Math.min(100, x)) }, `w-${c.id}`, T.weightLabel(c.name));
                              }}
                              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                            />
                            {m(`w-${c.id}`)}
                          </td>
                          <td>{c.hint ?? ''}</td>
                        </tr>
                      ))}
                      <tr>
                        <th scope="row" />
                        <td className={`paper__num paper__calc${Math.abs(sum - 100) > 0.05 ? ' is-bad' : ''}`} title={Math.abs(sum - 100) > 0.05 ? T.weightOff : T.weightSumHint}>
                          {T.weightSum(de(sum))}
                        </td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <span className="paper__muted">{T.noCrit}</span>
                )}
              </td>
            </tr>
            <tr className="paper__section">
              <th scope="rowgroup" colSpan={2}>{T.scores}</th>
            </tr>
            <tr>
              <td colSpan={2} className="paper__sub">
                <table className="paper__grid paper__matrix">
                  <thead>
                    <tr>
                      <th scope="col">{T.colOption}</th>
                      {weighed.map((c) => (
                        <th key={c.id} scope="col">{c.name}<br /><span className="paper__calc">{de(c.weight ?? 0)} %</span></th>
                      ))}
                      <th scope="col" title={T.calc}>{T.colTotal}</th>
                      <th scope="col">{T.colRank}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.options.map((o) => {
                      const r = res.find((x) => x.option.id === o.id);
                      return (
                        <tr key={o.id} className={r?.out ? 'is-out' : undefined}>
                          <th scope="row">{o.name}{r?.out ? <span className="paper__calc"> · {T.out}</span> : null}</th>
                          {weighed.map((c) => {
                            const s = Dc.scoreOf(d, c.id, o.id);
                            const at = `s-${c.id}-${o.id}`;
                            return (
                              <td key={c.id} className="paper__num">
                                <input
                                  key={`${at}-${s?.v ?? ''}`}
                                  className="paper__in paper__cellin"
                                  inputMode="numeric"
                                  aria-label={T.scoreLabel(o.name, c.name)}
                                  defaultValue={s ? String(s.v) : ''}
                                  disabled={lock}
                                  onBlur={(e) => {
                                    const x = num(e.target.value);
                                    if (x === undefined || (x !== null && (x < 0 || x > Dc.SCORE_MAX))) return tell(at, T.badNum);
                                    if (x === (s?.v ?? null)) return;
                                    op({ op: 'score', c: c.id, o: o.id, v: x === null ? null : Math.round(x), by }, at, T.scoreLabel(o.name, c.name));
                                  }}
                                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                />
                                {m(at)}
                              </td>
                            );
                          })}
                          <td className="paper__num paper__calc" title={T.calc}>{r?.out ? '–' : de(r?.total ?? 0)}</td>
                          <td className="paper__num paper__calc">{r?.rank ?? '–'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </td>
            </tr>
            <tr className="paper__section">
              <th scope="rowgroup" colSpan={2}>{T.result}</th>
            </tr>
            <Row label={T.advice} msg={null}>
              <span className="paper__ro paper__calc" title={T.calc}>{win && winRes ? T.adviceOf(win.name, de(winRes.total)) : T.adviceNone}</span>
            </Row>
            <Row label={T.decided} msg={null}>
              {chosen ? <span className="paper__ro is-strong">{chosen.name}</span> : <span className="paper__muted">{T.decidedOpen}</span>}
            </Row>
            {chosen && d.why && <Row label={T.why} msg={null}><span className="paper__ro">{d.why}</span></Row>}
          </tbody>
        </table>
        <p className="paper__caption">{T.dcCaption}</p>
      </article>
    </div>
  );
}
