/**
 * F-206 Schritt 10 (V116, K7): Arbeitskalender im Steckbrief – Feiertage nach Bundesland und eigene freie Tage, ein
 * Kalender für alle Projekte. Meldung am Ort mit Rückgängig (F-214), alles mit der Tastatur bedienbar.
 */
import { useRef, useState } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { Workspace } from '../workspace/types';
import * as Cal from '../workspace/calendar';
import { PROJECTS_TEXT as T } from '../workspace/terms';
import { noticeLater } from '../workspace/flash';
import { Icon } from './Icon';
import { fmtDay } from './ProjectPsp';

export function ProjectCalendar({ ws, dispatch }: { ws: Workspace; dispatch: (a: Action) => void }) {
  const cal = ws.calendar;
  const [day, setDay] = useState('');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState<{ text: string; undo?: boolean } | null>(null);
  const before = useRef(cal);
  const timer = useRef(0);
  const say = (text: string, undo = false) => {
    window.clearTimeout(timer.current);
    setMsg({ text, undo });
    timer.current = noticeLater(() => setMsg(null), undo ? 3 : 2);
  };
  const act = (a: Action, text: string) => {
    before.current = cal;
    dispatch(a);
    say(text, true);
  };
  const add = () => {
    if (!day) return say(T.calBad);
    if (!Cal.addFree(ws, day, name)) return say(T.calFull);
    act({ type: 'calFree', day, name }, T.calAdded(fmtDay(day)));
    setDay('');
    setName('');
  };
  const today = new Date().toISOString().slice(0, 10);
  const next = Cal.offBetween(today, `${Number(today.slice(0, 4)) + 1}${today.slice(4)}`).slice(0, 4);

  return (
    <fieldset className="pc__set pj__cal" title={T.calHint}>
      <legend>{T.calHead}</legend>
      <label className="layouts__label">
        {T.calRegion}
        <select
          value={cal?.region ?? ''}
          onChange={(e) => {
            const r = (e.target.value || undefined) as Cal.Region | undefined;
            act({ type: 'calRegion', region: r }, T.calSet(r ? T.calRegions[r] : T.calNone));
          }}
        >
          <option value="">{T.calNone}</option>
          {Cal.REGIONS.map((r) => (
            <option key={r} value={r}>{T.calRegions[r]}</option>
          ))}
        </select>
      </label>
      {next.length > 0 && <p className="lc__muted pj__cal-next">{T.calNext(next.map((o) => `${fmtDay(o.day)} ${o.name}`).join(' · '))}</p>}
      <div className="pj__cal-free" role="group" aria-label={T.calFree}>
        <span className="layouts__label">{T.calFree}</span>
        {!cal?.free?.length && <p className="lc__muted">{T.calFreeNone}</p>}
        {!!cal?.free?.length && (
          <ul className="pj__cal-list">
            {cal.free.map((f) => (
              <li key={f.day}>
                {fmtDay(f.day)}
                {f.name ? ` · ${f.name}` : ''}
                <button type="button" className="help__run" aria-label={T.calFreeRemove(fmtDay(f.day))} title={T.calFreeRemove(fmtDay(f.day))} onClick={() => act({ type: 'calFree', day: f.day, remove: true }, T.calRemoved(fmtDay(f.day)))}>
                  <Icon name="close" size={11} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <span className="pj__cal-add">
          <input type="date" value={day} aria-label={T.calFree} title={T.calFreeHint} onChange={(e) => setDay(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <input value={name} maxLength={40} placeholder={T.calFreeName} aria-label={T.calFreeName} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <button type="button" className="help__run lc__primary" onClick={add}>{T.calFreeAdd}</button>
        </span>
      </div>
      {msg && (
        <p className="layouts__undo" role="status">
          {msg.text}
          {msg.undo && (
            <button type="button" className="help__run" onClick={() => (dispatch({ type: 'calSet', cal: before.current }), say(T.calUndone))}>
              {T.calUndo}
            </button>
          )}
        </p>
      )}
    </fieldset>
  );
}
