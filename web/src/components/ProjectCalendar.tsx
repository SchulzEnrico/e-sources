/**
 * F-206 Schritt 10 (V116, K7): Arbeitskalender im Steckbrief – Feiertage nach Bundesland und eigene freie Tage.
 * V118 (F-230 F6): Rad „Kalender“ gemeinsam | eigener – ein Projekt kann einen eigenen Kalender haben (wie in MS Project),
 * fehlt er, gilt der gemeinsame. Meldung am Ort mit Rückgängig (F-214), alles mit der Tastatur bedienbar.
 */
import { useRef, useState } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { Workspace } from '../workspace/types';
import * as Cal from '../workspace/calendar';
import { PROJECTS_TEXT as T } from '../workspace/terms';
import { noticeLater } from '../workspace/flash';
import { Icon } from './Icon';
import { ModeWheel } from './ModeWheel';
import { fmtDay } from './ProjectPsp';

export function ProjectCalendar({ ws, pid, dispatch }: { ws: Workspace; pid: string; dispatch: (a: Action) => void }) {
  const own = Cal.hasOwnCalendar(ws, pid);
  const cal = Cal.calendarFor(ws, pid);
  const [day, setDay] = useState('');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState<{ text: string; undo?: boolean } | null>(null);
  // Rückgängig stellt beide Kalender zurück: gemeinsam und eigenen des Projekts
  const before = useRef<{ shared?: import('../workspace/types').WorkCalendar; own?: import('../workspace/types').WorkCalendar }>({});
  const timer = useRef(0);
  const say = (text: string, undo = false) => {
    window.clearTimeout(timer.current);
    setMsg({ text, undo });
    timer.current = noticeLater(() => setMsg(null), undo ? 3 : 2);
  };
  const act = (a: Action, text: string) => {
    before.current = { shared: ws.calendar, own: ws.projects?.find((x) => x.id === pid)?.calendar };
    dispatch(a);
    say(text, true);
  };
  const add = () => {
    if (!day) return say(T.calBad);
    if (!Cal.addFree(ws, day, name, pid)) return say(T.calFull);
    act({ type: 'calFree', day, name, project: pid }, T.calAdded(fmtDay(day)));
    setDay('');
    setName('');
  };
  const today = new Date().toISOString().slice(0, 10);
  const next = Cal.withCalendar(cal, () => Cal.offBetween(today, `${Number(today.slice(0, 4)) + 1}${today.slice(4)}`)).slice(0, 4);

  return (
    <fieldset className="pc__set pj__cal" title={T.calHint}>
      <legend>{own ? T.calHeadOwn : T.calHead}</legend>
      <span className="layouts__label pj__wheel" title={T.calWhichHint}>
        <span aria-hidden="true">{T.calWhich}</span>
        <ModeWheel
          label={T.calWhich}
          value={own ? 'own' : 'shared'}
          onChange={(v) => act({ type: 'calOwn', project: pid, on: v === 'own' }, v === 'own' ? T.calOwnOn : T.calOwnOff)}
          options={[
            { id: 'shared', name: T.calShared, hint: T.calSharedHint },
            { id: 'own', name: T.calOwn, hint: T.calOwnHint },
          ]}
        />
      </span>
      <label className="layouts__label">
        {T.calRegion}
        <select
          value={cal?.region ?? ''}
          onChange={(e) => {
            const r = (e.target.value || undefined) as Cal.Region | undefined;
            act({ type: 'calRegion', region: r, project: pid }, T.calSet(r ? T.calRegions[r] : T.calNone));
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
                <button type="button" className="help__run" aria-label={T.calFreeRemove(fmtDay(f.day))} title={T.calFreeRemove(fmtDay(f.day))} onClick={() => act({ type: 'calFree', day: f.day, remove: true, project: pid }, T.calRemoved(fmtDay(f.day)))}>
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
            <button type="button" className="help__run" onClick={() => (dispatch({ type: 'calSet', cal: before.current.shared }), dispatch({ type: 'calSet', cal: before.current.own, project: pid }), say(T.calUndone))}>
              {T.calUndo}
            </button>
          )}
        </p>
      )}
    </fieldset>
  );
}
