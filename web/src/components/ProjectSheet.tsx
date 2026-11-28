/**
 * V132 (F-232, Entscheidung A, P1–P10): Projektsteckbrief als Blatt im Hochformat – Anordnung wie Abbildung 3 im
 * Projektreport (IPMA ICB4 Level D, S. 4): zweispaltige Tabelle Bezeichnung | Wert, Blöcke Termine, Kosten,
 * Projektbeteiligte, Freigabe. Jede Wertzelle ist direkt ein Eingabefeld (Speichern beim Verlassen, Meldung am Ort);
 * gerechnete Werte (Gesamtdauer, Risikorücklage in %) stehen blass mit Hinweis. Helles Blatt wie Papier, Seitenverhältnis
 * DIN A4, Rad „Größe“ 75 · 100 · 125 % (je Gerät gemerkt).
 */
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { Note, Project, ProjectCharter, Workspace } from '../workspace/types';
import * as Pj from '../workspace/projects';
import { titleOf } from '../workspace/notes';
import { charterView, monthsBetween } from '../workspace/charterSheet';
import * as Fk from '../workspace/formKit';
import { noticeLater } from '../workspace/flash';
import { INK_TEXT as T_INK, PAPER_TEXT as S } from '../workspace/terms';
import { InkSign } from './InkChips';
import { ModeWheel } from './ModeWheel';
import * as Fm from '../workspace/fieldMedia';
import { layoutOf, paperVars } from '../workspace/layoutRules';
import { PaperLogo, mediaDrop, useFieldMedia } from './FieldMedia';

const SIZE_KEY = 'esource.paperSize.v1';
const SIZES = ['75', '100', '125'] as const;
type Size = (typeof SIZES)[number];
const loadSize = (): Size => {
  try {
    const v = localStorage.getItem(SIZE_KEY);
    return (SIZES as readonly string[]).includes(v ?? '') ? (v as Size) : '100';
  } catch {
    return '100';
  }
};

/** V133 (F-232 P9): Rad „Größe“ gemeinsam für alle Blätter (Steckbrief und Formulare) – gleicher Speicher je Gerät. */
export function usePaperSize(say: (t: string) => void): [Size, (v: Size) => void] {
  const [size, setSizeState] = useState<Size>(loadSize);
  const setSize = (v: Size) => {
    setSizeState(v);
    try {
      localStorage.setItem(SIZE_KEY, v);
    } catch {
      /* nur bis zum Neuladen */
    }
    say(S.sizeSaid(v));
  };
  return [size, setSize];
}
export function PaperSizeWheel({ size, setSize }: { size: Size; setSize: (v: Size) => void }) {
  return (
    <span className="layouts__label pj__wheel">
      <span aria-hidden="true">{S.size}</span>
      <ModeWheel label={S.size} value={size} onChange={(v) => setSize(v as Size)} options={SIZES.map((v) => ({ id: v, name: `${v} %`, hint: S.sizeHint }))} />
    </span>
  );
}
/** V154 (F-236 B): dazu die Farben der Layout-Vorlage des Projekts als CSS-Variablen */
export const paperZoom = (size: Size, p?: Pick<Project, 'layout'>) => ({ '--paper-zoom': Number(size) / 100, ...(p?.layout ? paperVars(layoutOf(p)) : {}) }) as CSSProperties;

const dmy = (d?: string) => (d ? `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}` : '');
const parseMoney = (v: string): number | null | undefined => {
  if (!v.trim()) return null;
  const x = Number(v.replace(/\./g, '').replace(',', '.').replace(/[€%\sPh]/gi, ''));
  return Number.isFinite(x) && x >= 0 ? x : undefined;
};

/** V147: gemeinsam mit dem Bericht (workspace/charterSheet.ts). */
export { monthsBetween };

/** Ein Feld des Blatts: Text (ein- oder mehrzeilig), Zahl (Euro/Ph) oder Datum; speichert beim Verlassen.
 *  V154 (F-232 P12): mehrzeilige Felder nehmen Medien (Knopf, Ziehen, Einfügen) – im Feld steht nur der Text,
 *  die Verweise stehen als Zeilen am Ende des gespeicherten Werts (`fieldMedia.ts`). */
export function Field({ label, value, kind = 'text', multi, strong, onSave, placeholder, say }: { label: string; value: string | number | undefined; kind?: 'text' | 'money' | 'ph' | 'date'; multi?: boolean; strong?: boolean; onSave: (v: string | number | null) => void; placeholder?: string; say?: (t: string) => void }) {
  const split = multi && typeof value === 'string' ? Fm.splitMedia(value) : null;
  const show = (v: typeof value) => (v === undefined ? '' : kind === 'money' || kind === 'ph' ? (v as number).toLocaleString('de-DE', { maximumFractionDigits: 2 }) : multi && typeof v === 'string' ? Fm.textOnly(v) : String(v));
  const [draft, setDraft] = useState(show(value));
  const [bad, setBad] = useState(false);
  useEffect(() => setDraft(show(value)), [value]);
  const media = split?.media ?? [];
  const fm = useFieldMedia({ label, media, onChange: (m) => onSave(Fm.joinMedia(draft.trim(), m) || null), say });
  const cls = `paper__in${strong ? ' is-strong' : ''}${bad ? ' is-bad' : ''}`;
  const save = () => {
    if (kind === 'money' || kind === 'ph') {
      const x = parseMoney(draft);
      if (x === undefined) return setBad(true);
      setBad(false);
      if ((x ?? undefined) !== value) onSave(x);
      return;
    }
    const t = multi ? Fm.joinMedia(draft.trim(), media) : draft.trim();
    if (t !== (value ?? '')) onSave(t || null);
  };
  if (kind === 'date') return <input type="date" className={cls} aria-label={label} value={(value as string) ?? ''} onChange={(e) => onSave(e.target.value || null)} />;
  const common = {
    className: cls,
    'aria-label': label,
    'aria-invalid': bad || undefined,
    value: draft,
    placeholder: placeholder ?? S.empty,
    onBlur: save,
  };
  if (multi)
    return (
      <>
        <textarea
          {...common}
          rows={Math.max(1, Math.min(6, Math.ceil(draft.length / 90) + (draft.match(/\n/g)?.length ?? 0)))}
          maxLength={Fm.textRoom(media, 2000)}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.metaKey || e.ctrlKey) && (e.target as HTMLTextAreaElement).blur()}
          {...mediaDrop(fm.add)}
        />
        {fm.tools}
      </>
    );
  return (
    <span className="paper__unit">
      <input {...common} inputMode={kind === 'text' ? undefined : 'decimal'} onChange={(e) => (setDraft(e.target.value), setBad(false))} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
      {kind === 'money' && <span aria-hidden="true">€</span>}
      {kind === 'ph' && <span aria-hidden="true">Ph</span>}
    </span>
  );
}

export function Row({ label, msg, children }: { label: string; msg: React.ReactNode; children: React.ReactNode }) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td>
        {children}
        {msg}
      </td>
    </tr>
  );
}

export function ProjectSheet({ ws, p, dispatch, say }: { ws: Workspace; p: Project; dispatch: (a: Action) => void; say: (t: string) => void }) {
  const c: ProjectCharter = p.charter ?? {};
  const [size, setSize] = usePaperSize(say);
  const [msg, setMsg] = useState<{ text: string; at: string } | null>(null);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const tell = (at: string, text: string) => {
    window.clearTimeout(timer.current);
    setMsg({ text, at });
    say(text);
    timer.current = noticeLater(() => setMsg(null));
  };
  const charter = (key: keyof ProjectCharter, label: string) => (v: string | number | null) => {
    dispatch({ type: 'charterEdit', id: p.id, patch: { [key]: v } });
    tell(key, S.saved(label));
  };
  const proj = (key: 'name' | 'start' | 'end' | 'budget', label: string) => (v: string | number | null) => {
    if (key === 'name' && !v) return;
    dispatch({ type: 'projectEdit', id: p.id, patch: { [key]: v ?? undefined } });
    tell(key, S.saved(label));
  };
  const brief = (k: 'goal', label: string) => (v: string | number | null) => {
    dispatch({ type: 'projectEdit', id: p.id, patch: { brief: { [k]: (v as string) ?? '' } } });
    tell(k, S.saved(label));
  };
  const m = (at: string) => (msg?.at === at ? <span className="paper__msg" role="status">{msg.text}</span> : null);

  // V147: gerechnete und zusammengesetzte Werte wie im Bericht (charterView)
  const view = charterView(ws, p);
  const leadName = view.lead;
  const miles: Note[] = Pj.tasksOfProject(ws, p.id).filter((n) => n.milestone);
  const fixed = (c.fixed ?? []).map((id) => miles.find((m) => m.id === id)).filter((m): m is Note => !!m);
  const dueOf = (m: Note) => m.due ?? m.notBefore;
  const months = view.months;
  const reservePct = view.reservePct;
  const costSum = view.costSum;
  const over = view.over;
  const risks = view.risks;
  const toggleFixed = (id: string, on: boolean) => {
    const next = on ? [...(c.fixed ?? []), id] : (c.fixed ?? []).filter((x) => x !== id);
    dispatch({ type: 'charterEdit', id: p.id, patch: { fixed: next.length ? next : null } });
    const m = miles.find((x) => x.id === id);
    tell('fixed', on ? S.fixedOn(titleOf(m!)) : S.fixedOff(titleOf(m!)));
  };
  const clientIn = c.clientKind !== 'ex';

  return (
    <div className="paper__wrap">
      <div className="paper__bar">
        <PaperSizeWheel size={size} setSize={setSize} />
        <span className="lc__muted">{S.barHint}</span>
      </div>
      <article className="paper" style={paperZoom(size, p)} aria-label={S.title(p.name)}>
        <header className="paper__head">
          <span className="paper__chapter">{S.chapter}</span>
          <span className="paper__project"><PaperLogo p={p} dispatch={dispatch} say={say} />{p.name}</span>
        </header>
        <h2 className="paper__h">{S.heading}</h2>
        <table className="paper__table">
          <colgroup>
            <col className="paper__colL" />
            <col />
          </colgroup>
          <tbody>
            <Row label={S.title_} msg={m('name')}><Field label={S.title_} value={p.name} strong onSave={proj('name', S.title_)} /></Row>
            <Row label={S.no} msg={m('no')}><Field label={S.no} value={c.no} strong onSave={charter('no', S.no)} /></Row>
            <Row label={S.agEx} msg={m('agEx')}>
              <Field label={S.agEx} value={clientIn ? undefined : [c.client, c.clientAddress].filter(Boolean).join(', ')} placeholder="n/v" onSave={(v) => (dispatch({ type: 'charterEdit', id: p.id, patch: v ? { client: v, clientAddress: null, clientKind: 'ex' } : clientIn ? {} : { client: null, clientAddress: null, clientKind: null } }), tell('agEx', S.saved(S.agEx)))} />
            </Row>
            <Row label={S.agIn} msg={m('agIn')}>
              <Field label={S.agIn} value={clientIn ? [c.client, c.clientAddress].filter(Boolean).join(', ') : undefined} placeholder="n/v" onSave={(v) => (dispatch({ type: 'charterEdit', id: p.id, patch: v ? { client: v, clientAddress: null, clientKind: 'in' } : clientIn ? { client: null, clientAddress: null } : {} }), tell('agIn', S.saved(S.agIn)))} />
            </Row>
            <Row label={S.lead} msg={m('lead')}>
              <span className="paper__ro" title={S.leadHint}>{leadName || <span className="paper__muted">{S.empty}</span>}</span>
            </Row>
            <Row label={S.kind} msg={m('kind')}><Field label={S.kind} value={c.kind} onSave={charter('kind', S.kind)} /></Row>
            <Row label={S.goal} msg={m('goal')}><Field label={S.goal} value={p.brief?.goal} multi onSave={brief('goal', S.goal)} /></Row>
            <Row label={S.main} msg={m('main')}><Field label={S.main} value={c.main} multi strong onSave={charter('main', S.main)} /></Row>
            <Row label={S.benefit} msg={m('benefit')}><Field label={S.benefit} value={c.benefit} multi onSave={charter('benefit', S.benefit)} /></Row>
            <tr className="paper__block">
              <th scope="row">{S.dates}</th>
              <td className="paper__sub">
                <table className="paper__grid">
                  <thead>
                    <tr>
                      <th scope="col">{S.start}</th>
                      <th scope="col">{S.end}</th>
                      <th scope="col">{S.fixed}</th>
                      <th scope="col">{S.duration}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="is-strong"><Field label={S.start} value={p.start} kind="date" onSave={proj('start', S.start)} />{view.datesFrom.start === 'gantt' && view.start && <span className="paper__calc" title={S.ganttDateHint}>{S.ganttDate(dmy(view.start))}</span>}</td>
                      <td className="is-strong"><Field label={S.end} value={p.end} kind="date" onSave={proj('end', S.end)} />{view.datesFrom.end === 'gantt' && view.end && <span className="paper__calc" title={S.ganttDateHint}>{S.ganttDate(dmy(view.end))}</span>}</td>
                      <td className="is-strong">
                        {fixed.length ? (
                          <ul className="paper__miles">
                            {fixed.map((m) => (
                              <li key={m.id}>{`${titleOf(m)} ${dmy(dueOf(m))}`}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="paper__muted">{S.fixedNone}</span>
                        )}
                        {miles.length > 0 && (
                          <details className="paper__pick">
                            <summary>{S.fixedPick}</summary>
                            <fieldset>
                              <legend className="sr-only">{S.fixed}</legend>
                              {miles.map((m) => (
                                <label key={m.id}>
                                  <input type="checkbox" checked={(c.fixed ?? []).includes(m.id)} onChange={(e) => toggleFixed(m.id, e.target.checked)} /> {titleOf(m)} {dmy(dueOf(m))}
                                </label>
                              ))}
                            </fieldset>
                          </details>
                        )}
                      </td>
                      <td className="is-strong" title={S.durationHint}>{months !== undefined ? <>{S.months(months)}<span className="paper__calc">{view.datesFrom.start === 'gantt' || view.datesFrom.end === 'gantt' ? S.calcGantt : S.calcDates}</span></> : <span className="paper__muted">{S.empty}</span>}</td>
                    </tr>
                  </tbody>
                </table>
                {m('start')}
                {m('end')}
                {m('fixed')}
              </td>
            </tr>
            <tr>
              <th scope="row">{S.capacity}</th>
              <td className="paper__sub">
                <div className="paper__pair">
                  <span>{S.own}</span>
                  <Field label={S.own} value={c.ownEffort} kind="ph" strong onSave={charter('ownEffort', S.own)} />
                  <span>{S.ext}</span>
                  <Field label={S.ext} value={c.extEffort} kind="money" strong onSave={charter('extEffort', S.ext)} />
                </div>
                {(view.planHours > 0 || view.planCost > 0) && <span className="paper__calc" title={S.planFromHint}>{S.planFrom(view.planHours.toLocaleString('de-DE'), view.planCost.toLocaleString('de-DE', { maximumFractionDigits: 2 }))}</span>}
                {m('ownEffort')}
                {m('extEffort')}
              </td>
            </tr>
            <Row label={S.budget} msg={m('budget')}><div className="paper__center"><Field label={S.budget} value={p.budget} kind="money" strong onSave={proj('budget', S.budget)} /></div></Row>
            <tr>
              <th scope="row">{S.costs}</th>
              <td className="paper__sub">
                <table className="paper__grid paper__grid--rows">
                  <tbody>
                    {(
                      [
                        ['costPm', S.costPm],
                        ['costStaff', S.costStaff],
                        ['costMaterial', S.costMaterial],
                      ] as const
                    ).map(([k, l]) => (
                      <tr key={k}>
                        <th scope="row">{l}</th>
                        <td className="is-strong"><Field label={l} value={c[k]} kind="money" onSave={charter(k, l)} />{m(k)}</td>
                      </tr>
                    ))}
                    <tr className="paper__sum">
                      <th scope="row">{S.costSum}</th>
                      <td className={over ? 'is-strong paper__over' : 'is-strong'} title={S.costSumHint}>
                        {costSum ? `${costSum.toLocaleString('de-DE', { maximumFractionDigits: 2 })} €` : <span className="paper__muted">{S.empty}</span>}
                        {p.budget !== undefined && costSum > 0 && <span className="paper__check">{over ? S.overBudget(costSum + (c.reserve ?? 0) - p.budget) : S.inBudget(p.budget - costSum - (c.reserve ?? 0))}</span>}
                        {costSum > 0 && <span className="paper__calc">{S.costCalc}</span>}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
            <tr>
              <th scope="row">{S.reserve}</th>
              <td className="paper__sub">
                <div className="paper__pair">
                  <span className="paper__derived is-strong" title={S.reserveHint}>{reservePct !== undefined ? S.reservePct(reservePct) : <span className="paper__muted">{S.empty}</span>}</span>
                  <Field label={S.reserve} value={c.reserve} kind="money" strong onSave={charter('reserve', S.reserve)} />
                </div>
                {m('reserve')}
              </td>
            </tr>
            <tr>
              <th scope="row">{S.people}</th>
              <td className="paper__sub">
                <table className="paper__grid paper__grid--rows">
                  <tbody>
                    {(
                      [
                        ['team', S.team],
                        ['steering', S.steering],
                        ['vendors', S.vendors],
                        ['others', S.others],
                      ] as const
                    ).map(([k, l]) => (
                      <tr key={k}>
                        <th scope="row">{l}</th>
                        <td><Field label={l} value={c[k]} multi onSave={charter(k, l)} />{m(k)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </td>
            </tr>
            <Row label={S.reporting} msg={m('reporting')}><Field label={S.reporting} value={c.reporting} multi onSave={charter('reporting', S.reporting)} /></Row>
            <Row label={S.risks} msg={m('risks')}>
              <span className="paper__ro is-strong" title={S.risksHint}>{risks.length ? risks.join('; ') : <span className="paper__muted">{S.risksNone}</span>}</span>
              {view.riskCount > 0 && <span className="paper__calc">{S.riskSum(view.riskSum, view.riskCount, view.riskHigh)}</span>}
            </Row>
            <Row label={S.special} msg={m('special')}><Field label={S.special} value={c.special} multi onSave={charter('special', S.special)} /></Row>
            <tr className="paper__release">
              <th scope="row">{S.release}</th>
              <td className="paper__sub">
                <div className="paper__signs">
                  {(
                    [
                      ['releaseAg', 'signAg', S.signAg, 'inkAg'],
                      ['releasePl', 'signPl', S.signPl, 'inkPl'],
                    ] as const
                  ).map(([d, n, l, ink]) => (
                    <div key={d} className={`paper__sign${c[ink] ? ' has-ink' : ''}`}>
                      {/* V143 (F-238 S6): Unterschrift als Handschrift; ohne bleibt der Name in Schreibschrift */}
                      <InkSign label={l} inkRef={c[ink]} name={c[n]} save={(ref) => dispatch({ type: 'charterEdit', id: p.id, patch: { [ink]: ref } })} onRemove={() => (dispatch({ type: 'charterEdit', id: p.id, patch: { [ink]: null } }), tell(n, T_INK.signRemoved))} onDone={(t) => tell(n, t)} />
                      <Field label={`${l}: ${S.signName}`} value={c[n]} placeholder={S.signName} onSave={charter(n, `${l}: ${S.signName}`)} />
                      <span className="paper__signline">{l}</span>
                      <Field label={`${l}: ${S.signDate}`} value={c[d]} kind="date" onSave={charter(d, `${l}: ${S.signDate}`)} />
                    </div>
                  ))}
                </div>
                {m('releaseAg')}
                {m('releasePl')}
                {m('signAg')}
                {m('signPl')}
              </td>
            </tr>
          </tbody>
        </table>
        <p className="paper__caption">{S.caption}</p>
      </article>
      <CharterExtras p={p} dispatch={dispatch} tell={tell} m={m} style={paperZoom(size, p)} />
    </div>
  );
}

/** V147 (F-232, Rangfolge 1 ICB4): Ergänzungen nach ICB4 4.3.1 · 4.5.1, die nicht auf dem Blatt von Abbildung 3 stehen –
 *  zuklappbar unter dem Blatt (wie „Verwaltung“ darüber), im Bericht als Abschnitt unter dem Steckbrief. */
function CharterExtras({ p, dispatch, tell, m, style }: { p: Project; dispatch: (a: Action) => void; tell: (at: string, text: string) => void; m: (at: string) => React.ReactNode; style: CSSProperties }) {
  const c: ProjectCharter = p.charter ?? {};
  const spec = (k: string) => Fk.fieldSpec('charter', k)!;
  const save = (k: keyof ProjectCharter) => (v: string | number | null) => {
    dispatch({ type: 'charterEdit', id: p.id, patch: { [k]: v } });
    tell(k, S.saved(spec(k).label));
  };
  const filled = (['benefitMeasure', 'businessCase', 'model', 'tailoring', 'complexity', 'success'] as const).filter((k) => c[k] !== undefined && c[k] !== '').length;
  const text = (k: 'benefitMeasure' | 'businessCase' | 'tailoring' | 'success', multi: boolean) => (
    <label className="paper__xrow" key={k} title={spec(k).help}>
      <span className="paper__xlabel">{spec(k).label}</span>
      <Field label={spec(k).label} value={c[k]} multi={multi} onSave={save(k)} />
      {m(k)}
    </label>
  );
  return (
    <details className="pj__admin paper__extras" style={style}>
      <summary title={S.extrasHint}>{S.extras(filled)}</summary>
      <div className="paper__xgrid">
        {text('benefitMeasure', false)}
        {text('businessCase', true)}
        <label className="paper__xrow" title={spec('model').help}>
          <span className="paper__xlabel">{spec('model').label}</span>
          <select value={c.model ?? ''} onChange={(e) => save('model')(e.target.value || null)}>
            <option value="">{S.empty}</option>
            {(Object.keys(Fk.MODEL_LABEL) as (keyof typeof Fk.MODEL_LABEL)[]).map((k) => (
              <option key={k} value={k}>{Fk.MODEL_LABEL[k]}</option>
            ))}
          </select>
          {m('model')}
        </label>
        {text('tailoring', true)}
        <label className="paper__xrow" title={spec('complexity').help}>
          <span className="paper__xlabel">{spec('complexity').label}</span>
          <select value={c.complexity ?? ''} onChange={(e) => save('complexity')(e.target.value ? Number(e.target.value) : null)}>
            <option value="">{S.empty}</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{S.complexity(n)}</option>
            ))}
          </select>
          {m('complexity')}
        </label>
        {text('success', true)}
      </div>
    </details>
  );
}
