/**
 * F-225 (V105, Entscheidungs-Doc „F-225 V105 – Feedback in Projekten“, P1–P10): Projekt-Modus › Rad „Ansicht“ ›
 * „Meldungen“. Oben das Formular des Projekts (nur mit der Befugnis „Feedback bearbeiten“, P5): Felder an/aus und
 * Pflicht (P4). Darunter dasselbe Cockpit wie „Feedback“, nur mit den Meldungen dieses Projekts (P7) – gleicher
 * Aufbau: Anwender sehen „Meine Meldungen“ ohne Zustand, mit Befugnis das Board.
 */
import { type Dispatch, useState } from 'react';
import type { FeedbackFieldDef, FeedbackFieldType, FeedbackFormRaw, FeedbackKind } from '../workspace/types';
import { newId } from '../workspace/workspace';
import { FEEDBACK_TEXT } from '../workspace/terms';
import { ModeWheel } from './ModeWheel';
import { Icon } from './Icon';
import type { Action } from '../workspace/useWorkspace';
import type { Project, Workspace } from '../workspace/types';
import * as Fb from '../workspace/feedback';
import { canTriage } from '../workspace/persons';
import { PROJECT_FEEDBACK_TEXT as T } from '../workspace/terms';
import { FeedbackCockpit } from './FeedbackCockpit';
import { FeedbackPaper, ShapeWheel, useShape } from './PaperDocs';
import { DOC_SHEET_TEXT as DS } from '../workspace/terms';

type Key = Fb.FeedbackText | 'severity';
const KEYS: readonly Key[] = [...Fb.FEEDBACK_TEXTS, 'severity'];

export function ProjectFeedback({ ws, p, dispatch, say }: { ws: Workspace; p: Project; dispatch: Dispatch<Action>; say: (t: string) => void }) {
  const may = canTriage(ws);
  const form = Fb.formOf(p.feedbackForm);
  const [msg, setMsg] = useState('');
  const toggle = (k: Key, what: 'off' | 'required') => {
    const next = Fb.toggleForm(p.feedbackForm, k, what);
    dispatch({ type: 'projectEdit', id: p.id, patch: { feedbackForm: next } });
    const f = Fb.formOf(next);
    const text = what === 'off' ? T.offSaid(Fb.FILE_LABELS.field[k], !f.off.includes(k as Fb.FeedbackText)) : T.reqSaid(Fb.FILE_LABELS.field[k], f.required.includes(k));
    setMsg(text);
    say(text);
  };
  const n = Fb.newCountOf(ws, p.id);
  // V139 (F-232 P9): Rad „Darstellung“ Board · Blatt (Problemstellung wie auf Papier), je Gerät gemerkt
  const [shape, setShape] = useShape('esource.feedbackShape.v1', ['board', 'sheet'] as const, 'board');
  return (
    <div className="pjf">
      <div className="paper__bar">
        <ShapeWheel value={shape} onChange={setShape} say={say} options={[{ id: 'board', name: DS.fbBoard, hint: DS.fbBoardHint }, { id: 'sheet', name: DS.fbSheet, hint: DS.fbSheetHint }]} />
      </div>
      <p className="pjf__intro">{T.intro}{n ? ` ${T.newCount(n)}` : ''}</p>
      {may && (
        <details className="pc__set pjf__form">
          <summary>{T.form}</summary>
          <p className="lc__muted">{T.formHint}</p>
          <table className="pjf__table">
            <thead>
              <tr>
                <th scope="col">{T.colField}</th>
                <th scope="col" title={T.colOnHint}>{T.colOn}</th>
                <th scope="col" title={T.colReqHint}>{T.colReq}</th>
              </tr>
            </thead>
            <tbody>
              {KEYS.map((k) => {
                const on = k === 'severity' || !form.off.includes(k);
                const fixed = k === 'what' || k === 'severity';
                return (
                  <tr key={k}>
                    <th scope="row">{Fb.FILE_LABELS.field[k]}</th>
                    <td>
                      <input type="checkbox" checked={on} disabled={fixed} aria-label={T.onLabel(Fb.FILE_LABELS.field[k])} title={fixed ? T.fixed : undefined} onChange={() => toggle(k, 'off')} />
                    </td>
                    <td>
                      <input type="checkbox" checked={form.required.includes(k)} disabled={!on} aria-label={T.reqLabel(Fb.FILE_LABELS.field[k])} onChange={() => toggle(k, 'required')} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {msg && <p className="layouts__undo" role="status">{msg}</p>}
          <FormTemplate p={p} dispatch={dispatch} say={say} />
          <FormCustom p={p} dispatch={dispatch} say={say} />
          <FormKinds p={p} dispatch={dispatch} say={say} />
        </details>
      )}
      {shape === 'sheet' ? <FeedbackPaper ws={ws} p={p} dispatch={dispatch} say={say} /> : <FeedbackCockpit key={p.id} ws={ws} dispatch={dispatch} say={say} project={p.id} />}
    </div>
  );
}

type Props = { p: Project; dispatch: Dispatch<Action>; say: (t: string) => void };
const save = (props: Props, form: FeedbackFormRaw | undefined) => props.dispatch({ type: 'projectEdit', id: props.p.id, patch: { feedbackForm: form } });

/** F-225 Rest (V106, P4): eigene Felder – Name, Art (Rad), Möglichkeiten, Pflicht, Reihenfolge, entfernen mit Rückgängig am Ort. */
function FormCustom(props: Props) {
  const { p, say } = props;
  const list = Fb.customOf(p.feedbackForm);
  const [name, setName] = useState('');
  const [type, setType] = useState<FeedbackFieldType>('text');
  const [opts, setOpts] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [undo, setUndo] = useState<{ field: FeedbackFieldDef; index: number } | null>(null);
  const tell = (t: string) => (setMsg(t), say(t));
  const split = (t: string) => t.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
  const add = () => {
    const r = Fb.addCustom(p.feedbackForm, { name, type, options: split(opts) }, newId());
    if (r.error) {
      setErr(T.customErr[r.error]);
      return;
    }
    save(props, r.form);
    setErr('');
    setUndo(null);
    tell(T.customAdded(name.trim()));
    setName('');
    setOpts('');
  };
  const remove = (c: FeedbackFieldDef) => {
    const r = Fb.removeCustom(p.feedbackForm, c.id);
    if (!r.removed) return;
    save(props, r.form);
    setUndo(r.removed);
    tell(T.customRemoved(c.name));
  };
  const back = () => {
    if (!undo) return;
    save(props, Fb.restoreCustom(p.feedbackForm, undo));
    setUndo(null);
    tell(T.undone);
  };
  return (
    <fieldset className="pc__set pjf__custom">
      <legend>{T.customHead}</legend>
      <p className="lc__muted">{T.customHint}</p>
      {list.length ? (
        <table className="pjf__table">
          <thead>
            <tr>
              <th scope="col">{T.customName}</th>
              <th scope="col">{T.customType}</th>
              <th scope="col" title={T.colReqHint}>{T.colReq}</th>
              <th scope="col"><span className="sr-only">{T.remove}</span></th>
            </tr>
          </thead>
          <tbody>
            {list.map((c, i) => (
              <tr key={c.id}>
                <th scope="row">
                  <input
                    defaultValue={c.name}
                    maxLength={Fb.CUSTOM_NAME_MAX}
                    aria-label={`${T.customName}: ${c.name}`}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (!v || v === c.name) return void (e.target.value = c.name);
                      const next = Fb.editCustom(p.feedbackForm, c.id, { name: v });
                      const now = Fb.customOf(next).find((x) => x.id === c.id)?.name ?? c.name;
                      e.target.value = now;
                      if (now === c.name) return setErr(T.customErr.twice);
                      save(props, next);
                      setErr('');
                      tell(T.customRenamed(now));
                    }}
                  />
                </th>
                <td>
                  {T.types[c.type]}
                  {c.type === 'choice' && (
                    <input
                      className="pjf__opts"
                      defaultValue={(c.options ?? []).join(', ')}
                      aria-label={`${T.options}: ${c.name}`}
                      title={T.optionsHint}
                      onBlur={(e) => {
                        const o = split(e.target.value);
                        if (o.length < 2) return (setErr(T.customErr.options), void (e.target.value = (c.options ?? []).join(', ')));
                        save(props, Fb.editCustom(p.feedbackForm, c.id, { options: o }));
                        setErr('');
                      }}
                    />
                  )}
                </td>
                <td>
                  <input type="checkbox" checked={!!c.required} aria-label={T.reqLabel(c.name)} onChange={() => (save(props, Fb.editCustom(p.feedbackForm, c.id, { required: !c.required })), tell(T.customReq(c.name, !c.required)))} />
                </td>
                <td className="pjf__tools">
                  <button type="button" disabled={i === 0} title={T.up} aria-label={`${T.up}: ${c.name}`} onClick={() => (save(props, Fb.moveCustom(p.feedbackForm, c.id, -1)), tell(T.customMoved(c.name)))}>↑</button>
                  <button type="button" disabled={i === list.length - 1} title={T.down} aria-label={`${T.down}: ${c.name}`} onClick={() => (save(props, Fb.moveCustom(p.feedbackForm, c.id, 1)), tell(T.customMoved(c.name)))}>↓</button>
                  <button type="button" title={T.remove} aria-label={`${T.remove}: ${c.name}`} onClick={() => remove(c)}>
                    <Icon name="close" size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="lc__muted">{T.customNone}</p>
      )}
      {(msg || undo) && (
        <p className="layouts__undo" role="status">
          {msg}
          {undo && (
            <button type="button" className="help__run" onClick={back}>{T.undo}</button>
          )}
        </p>
      )}
      {list.length < Fb.CUSTOM_MAX && (
        <form className="pjf__add" aria-label={T.customAdd} onSubmit={(e) => (e.preventDefault(), add())}>
          <label className="layouts__label">
            {T.customName}
            <input value={name} maxLength={Fb.CUSTOM_NAME_MAX} placeholder={T.customNamePh} onChange={(e) => (setName(e.target.value), setErr(''))} />
          </label>
          <span className="layouts__label">
            <span aria-hidden="true">{T.customType}</span>
            <ModeWheel label={T.customType} value={type} onChange={(v) => (setType(v as FeedbackFieldType), setErr(''))} options={Fb.CUSTOM_TYPES.map((t) => ({ id: t, name: T.types[t], hint: T.typeHints[t] }))} />
          </span>
          {type === 'choice' && (
            <label className="layouts__label">
              {T.options}
              <input value={opts} placeholder={T.optionsPh} onChange={(e) => (setOpts(e.target.value), setErr(''))} />
            </label>
          )}
          <button type="submit" className="help__run lc__primary" disabled={!name.trim()}>
            <Icon name="plus" size={13} className="icon icon--inline" /> {T.customAdd}
          </button>
          {err && <p className="layouts__error" role="alert">{err}</p>}
        </form>
      )}
    </fieldset>
  );
}

/** F-225 Rest (V106, P4): Arten von Meldungen je Projekt umbenennen – leer = wie ab Werk. */
function FormKinds(props: Props) {
  const { p, say } = props;
  const [msg, setMsg] = useState('');
  return (
    <fieldset className="pc__set pjf__kinds">
      <legend>{T.kindsHead}</legend>
      <p className="lc__muted">{T.kindsHint}</p>
      <div className="pjf__kindrow">
        {Fb.FEEDBACK_KINDS.map((k: FeedbackKind) => (
          <label key={k} className="layouts__label">
            {FEEDBACK_TEXT.kinds[k]}
            <input
              defaultValue={p.feedbackForm?.kinds?.[k] ?? ''}
              maxLength={30}
              placeholder={FEEDBACK_TEXT.kinds[k]}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v === (p.feedbackForm?.kinds?.[k] ?? '')) return;
                save(props, Fb.renameKind(p.feedbackForm, k, v));
                const t = v && v !== FEEDBACK_TEXT.kinds[k] ? T.kindRenamed(FEEDBACK_TEXT.kinds[k], v) : T.kindReset(FEEDBACK_TEXT.kinds[k]);
                setMsg(t);
                say(t);
              }}
            />
          </label>
        ))}
      </div>
      {msg && <p className="layouts__undo" role="status">{msg}</p>}
    </fieldset>
  );
}

/** F-225 Rest (V106, P6): Vorlage wählen (Rad) und übernehmen – mit Rückgängig am Ort. */
function FormTemplate(props: Props) {
  const { p, say } = props;
  const now = Fb.templateOf(p.feedbackForm);
  const [pick, setPick] = useState<Fb.FormTemplateId>(now ?? 'ipma');
  const [msg, setMsg] = useState('');
  const [before, setBefore] = useState<{ form: FeedbackFormRaw | undefined } | null>(null);
  const apply = () => {
    setBefore({ form: p.feedbackForm });
    save(props, Fb.applyTemplate(p.feedbackForm, pick, newId));
    const t = T.tplApplied(T.tplNames[pick]);
    setMsg(t);
    say(t);
  };
  const back = () => {
    if (!before) return;
    save(props, before.form);
    setBefore(null);
    setMsg(T.undone);
    say(T.undone);
  };
  return (
    <fieldset className="pc__set pjf__tpl">
      <legend>{T.tplHead}</legend>
      <p className="lc__muted">{T.tplHint}</p>
      <div className="pjf__add">
        <span className="layouts__label">
          <span aria-hidden="true">{T.tplHead}</span>
          <ModeWheel label={T.tplHead} value={pick} onChange={(v) => setPick(v as Fb.FormTemplateId)} options={Fb.FORM_TEMPLATES.map((t) => ({ id: t, name: T.tplNames[t], hint: T.tplHints[t] }))} />
        </span>
        <button type="button" className="help__run lc__primary" disabled={pick === now} onClick={apply}>{T.tplApply}</button>
        <span className="lc__muted">{T.tplNow(now ? T.tplNames[now] : null)}</span>
      </div>
      <p className="lc__muted">{T.tplHints[pick]}</p>
      {msg && (
        <p className="layouts__undo" role="status">
          {msg}
          {before && <button type="button" className="help__run" onClick={back}>{T.undo}</button>}
        </p>
      )}
    </fieldset>
  );
}
