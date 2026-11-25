/**
 * F-225 (V105, Entscheidungs-Doc „F-225 V105 – Feedback in Projekten“, P1–P10): Projekt-Modus › Rad „Ansicht“ ›
 * „Meldungen“. Oben das Formular des Projekts (nur mit der Befugnis „Feedback bearbeiten“, P5): Felder an/aus und
 * Pflicht (P4). Darunter dasselbe Cockpit wie „Feedback“, nur mit den Meldungen dieses Projekts (P7) – gleicher
 * Aufbau: Anwender sehen „Meine Meldungen“ ohne Zustand, mit Befugnis das Board.
 */
import { type Dispatch, useState } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { Project, Workspace } from '../workspace/types';
import * as Fb from '../workspace/feedback';
import { canTriage } from '../workspace/persons';
import { PROJECT_FEEDBACK_TEXT as T } from '../workspace/terms';
import { FeedbackCockpit } from './FeedbackCockpit';

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
  return (
    <div className="pjf">
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
        </details>
      )}
      <FeedbackCockpit key={p.id} ws={ws} dispatch={dispatch} say={say} project={p.id} />
    </div>
  );
}
