/**
 * F-206 Schritt 8 (V95, Bau 5, P10–P14/P22): Cockpit „Fokus“ im Cockpit „Notizen“ (Rad Notizen · Fokus · Regeln).
 * Vorbild: Auslastungsgrafik bzw. Ressourcengrafik in MS Project (Windows) und iTaskX (Mac) – je Woche ein Balken
 * mit dem geplanten Aufwand, die Kapazität als Linie; Aufbau und Gestaltung an E-Sources angepasst (Enrico V95).
 * Auswahl Person oder Team (Team: Balken je Mitglied), Rad „Mit vorläufig · Ohne vorläufig“, 6 Wochen mit
 * Früher/Später. Darunter die Aufgaben der gewählten Woche bzw. „Ohne Termin“ – Klick öffnet die Notiz.
 * Tastatur (NF-03): Pfeile links/rechts wählen die Woche (Pos1/Ende), Enter springt in die Aufgaben.
 */
import { type CSSProperties, type KeyboardEvent, useRef, useState } from 'react';
import type { Workspace } from '../workspace/types';
import * as Ps from '../workspace/persons';
import * as FL from '../workspace/focusLoad';
import { dayOf, notesOf, titleOf } from '../workspace/notes';
import { PROFILE_COLORS } from '../workspace/profile';
import { FOCUS_TEXT as T, PERSON_TEXT, TERMS } from '../workspace/terms';
import { Icon } from './Icon';
import { ModeWheel } from './ModeWheel';
import { PersonBadge } from './PersonChips';
import { openNote } from './SourceChips';

const explain = (t: string) => t.split(' = ').slice(1).join(' = ') || t;
const dm = (day: string) => `${day.slice(8, 10)}.${day.slice(5, 7)}.`;
const BAR_H = 140;

export function FocusCockpit({ ws, onOpen, onPersons }: { ws: Workspace; onOpen: () => void; onPersons: () => void }) {
  const day = dayOf();
  const people = Ps.personList(ws);
  const [who, setWho] = useState(Ps.meId(ws));
  const p = Ps.personById(ws, who) ?? people[0];
  const [drafts, setDrafts] = useState(true);
  const [shift, setShift] = useState(0);
  const from = FL.addDays(FL.mondayOf(day), 7 * shift);
  const load = FL.loadOf(ws, p.id, { from, weeks: FL.FOCUS_WEEKS, drafts });
  const split = FL.teamSplit(ws, p.id, { from, weeks: FL.FOCUS_WEEKS, drafts });
  const scale = FL.scaleOf(load.weeks);
  const [sel, setSel] = useState<number | 'none'>(0);
  const btns = useRef<(HTMLButtonElement | null)[]>([]);
  const listRef = useRef<HTMLUListElement>(null);
  const pct = (h: number) => `${Math.min(100, (h / scale) * 100)}%`;
  const thisWeek = FL.loadOf(ws, p.id, { from: day, weeks: 1, drafts }).weeks[0];

  const shown = sel === 'none' ? load.noDate.notes : (load.weeks[sel]?.notes ?? []);
  const tasks = shown.map((id) => notesOf(ws).find((n) => n.id === id)).filter((n): n is NonNullable<typeof n> => !!n);
  const selName = sel === 'none' ? T.noDate : load.weeks[sel] ? `${T.kw(FL.isoWeek(load.weeks[sel].week))} (${dm(load.weeks[sel].week)}–${dm(FL.addDays(load.weeks[sel].week, 4))})` : '';

  const onKey = (e: KeyboardEvent, i: number) => {
    const last = FL.FOCUS_WEEKS; // Index FOCUS_WEEKS = „ohne Termin“
    let j = -1;
    if (e.key === 'ArrowRight') j = Math.min(last, i + 1);
    else if (e.key === 'ArrowLeft') j = Math.max(0, i - 1);
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = last;
    else if (e.key === 'Enter') {
      e.preventDefault();
      return listRef.current?.querySelector<HTMLElement>('button')?.focus();
    }
    if (j < 0) return;
    e.preventDefault();
    setSel(j === last ? 'none' : j);
    btns.current[j]?.focus();
  };

  return (
    <section className="lc__group fc" aria-labelledby="fc-head">
      <header className="lc__head lc__band">
        <Icon name="focus" size={15} className="icon icon--inline" />
        <h3 id="fc-head" className="lc__head-title" title={explain(TERMS.focusLoad)}>{T.head}</h3>
        <label className="fc__who">
          <span className="sr-only">{T.who}</span>
          <PersonBadge person={p} size={20} />
          <select value={p.id} aria-label={T.who} onChange={(e) => (setWho(e.target.value), setSel(0))}>
            {people.map((x) => (
              <option key={x.id} value={x.id}>
                {x.me ? PERSON_TEXT.me(x.name) : x.name}{x.kind !== 'person' ? ` · ${PERSON_TEXT.kind[x.kind]}` : ''}
              </option>
            ))}
          </select>
        </label>
        <ModeWheel
          label={T.drafts}
          value={drafts ? 'on' : 'off'}
          onChange={(v) => setDrafts(v === 'on')}
          options={[
            { id: 'on', name: T.draftsOn, icon: 'show', hint: T.draftsHint },
            { id: 'off', name: T.draftsOff, icon: 'hide', hint: T.draftsHint },
          ]}
        />
        <span className="lc__head-tools fc__nav">
          <button type="button" className="help__run" onClick={() => setShift(shift - 1)} title={T.earlier} aria-label={T.earlier}><Icon name="arrowLeft" size={13} /></button>
          <button type="button" className="help__run" disabled={shift === 0} onClick={() => setShift(0)}>{T.today}</button>
          <button type="button" className="help__run" onClick={() => setShift(shift + 1)} title={T.later} aria-label={T.later}><Icon name="arrowRight" size={13} /></button>
          <button type="button" className="help__run" onClick={onPersons}><Icon name="catPeople" size={13} className="icon icon--inline" /> {T.persons}</button>
        </span>
      </header>
      <p className={`fc__line is-${FL.toneOf(thisWeek)}`}>
        <b>{FL.focusLine(ws, thisWeek)}</b> · {T.tone[FL.toneOf(thisWeek)]}
      </p>

      <div className="fc__chart" role="group" aria-label={`${T.head}: ${p.name}`} aria-describedby="fc-keys" style={{ '--h': `${BAR_H}px` } as CSSProperties}>
        {load.weeks.map((w, i) => {
          const tone = FL.toneOf(w);
          const per = FL.percentOf(w);
          const kw = T.kw(FL.isoWeek(w.week));
          const span = `${dm(w.week)}–${dm(FL.addDays(w.week, 4))}`;
          const now = w.week === FL.mondayOf(day);
          return (
            <button
              key={w.week}
              ref={(el) => (btns.current[i] = el)}
              type="button"
              className={`fc__week is-${tone}${sel === i ? ' is-sel' : ''}${now ? ' is-now' : ''}`}
              tabIndex={sel === i ? 0 : -1}
              aria-pressed={sel === i}
              aria-label={T.weekSay(kw, span, FL.hoursText(w.hours), FL.hoursText(w.capacity), per !== undefined ? `${per} %` : '', T.tone[tone], w.notes.length, w.noEffort, w.draft ? FL.hoursText(w.draft) : '')}
              onClick={() => setSel(i)}
              onKeyDown={(e) => onKey(e, i)}
            >
              <span className="fc__bars" aria-hidden="true">
                <span className="fc__cap" style={{ bottom: pct(w.capacity) }} title={`${T.capLine} ${FL.hoursText(w.capacity)}`} />
                <span className="fc__stack" style={{ height: pct(w.hours + w.draft) }}>
                  {w.draft > 0 && <span className="fc__seg is-draft" style={{ flexGrow: w.draft }} />}
                  {split.length
                    ? split.map((s) => (s.hours[i] ? <span key={s.id} className="fc__seg is-member" style={{ flexGrow: s.hours[i], '--c': PROFILE_COLORS[Ps.personById(ws, s.id)?.color ?? 0]?.hex } as CSSProperties} title={`${Ps.personById(ws, s.id)?.name}: ${FL.hoursText(s.hours[i])}`} /> : null))
                    : (
                      <>
                        {w.hours - w.urgent > 0 && <span className="fc__seg" style={{ flexGrow: w.hours - w.urgent }} />}
                        {w.urgent > 0 && <span className="fc__seg is-urgent" style={{ flexGrow: w.urgent }} />}
                      </>
                    )}
                </span>
              </span>
              <span className="fc__kw">{kw}</span>
              <span className="fc__span">{span}</span>
              <span className="fc__hours">{T.of(FL.hoursText(w.hours).replace(' h', ''), FL.hoursText(w.capacity))}</span>
              {(w.noEffort > 0 || w.draft > 0) && (
                <span className="fc__more">
                  {w.noEffort > 0 && `+${w.noEffort} ${T.noEffort}`}
                  {w.noEffort > 0 && w.draft > 0 && ' · '}
                  {w.draft > 0 && `${FL.hoursText(w.draft)} ${T.legendDraft}`}
                </span>
              )}
            </button>
          );
        })}
        <button
          ref={(el) => (btns.current[FL.FOCUS_WEEKS] = el)}
          type="button"
          className={`fc__week fc__nodate${sel === 'none' ? ' is-sel' : ''}`}
          tabIndex={sel === 'none' ? 0 : -1}
          aria-pressed={sel === 'none'}
          aria-label={T.noDateSay(load.noDate.count, FL.hoursText(load.noDate.hours))}
          onClick={() => setSel('none')}
          onKeyDown={(e) => onKey(e, FL.FOCUS_WEEKS)}
        >
          <span className="fc__bars fc__pot" aria-hidden="true">
            <span className="fc__potnum">{load.noDate.count}</span>
          </span>
          <span className="fc__kw">{T.noDate}</span>
          <span className="fc__hours">{FL.hoursText(load.noDate.hours)}</span>
        </button>
      </div>
      <p id="fc-keys" className="lc__keys">{T.weekKeys}</p>
      <p className="fc__legend" aria-label={T.legend}>
        <span><i className="fc__key" /> {T.legendHours}</span>
        {!split.length && <span><i className="fc__key is-urgent" /> {T.legendUrgent}</span>}
        <span><i className="fc__key is-draft" /> {T.legendDraft}</span>
        <span><i className="fc__key is-cap" /> {T.legendCap}</span>
        {split.length > 0 && (
          <span className="fc__members">
            {T.members}:{' '}
            {split.map((s) => (
              <span key={s.id}>
                <i className="fc__key" style={{ '--c': PROFILE_COLORS[Ps.personById(ws, s.id)?.color ?? 0]?.hex } as CSSProperties} /> {s.id === p.id ? T.teamRest : Ps.personById(ws, s.id)?.name}
              </span>
            ))}
          </span>
        )}
      </p>

      <h4 className="lc__sub" id="fc-tasks">{T.tasksOf(selName)}</h4>
      {tasks.length === 0 ? (
        <p className="lc__muted">{T.noTasks}</p>
      ) : (
        <ul ref={listRef} className="fc__tasks" aria-labelledby="fc-tasks">
          {tasks.map((n) => {
            const a = Ps.personById(ws, Ps.assigneeOf(n));
            return (
              <li key={n.id}>
                <button type="button" className="fc__task" onClick={() => (openNote(n.id), onOpen())} title={T.open}>
                  {p.kind === 'team' && <PersonBadge person={a} size={16} />}
                  <span className="fc__title">{titleOf(n) || '…'}</span>
                  {n.urgent && <span className="fc__tag is-urgent">{T.urgent}</span>}
                  {n.due && <span className="fc__tag">{T.due(dm(n.due))}</span>}
                  <span className="fc__tag">{n.effort?.plan !== undefined ? FL.hoursText(n.effort.plan) : T.noEffort}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/**
 * P13 (V95, Bau 5): Fokus-Zeile im Desk-Kopf – „Diese Woche 32 von 40 h · 3 dringend“ für „ich“, im Ton der
 * Auslastung (ruhig · gelb · rot, immer mit Zahl). Nur sichtbar, wenn mir offene Aufgaben gehören.
 * Schmale Kopfleiste: nur „32 / 40 h“. Klick öffnet das Cockpit „Notizen“ auf der Seite „Fokus“.
 */
export function FocusLine({ ws, onOpen }: { ws: Workspace; onOpen: () => void }) {
  const me = Ps.meId(ws);
  if (!Ps.openCount(ws, me)) return null;
  const w = FL.loadOf(ws, me, { from: dayOf(), weeks: 1, drafts: true }).weeks[0];
  const tone = FL.toneOf(w);
  const line = FL.focusLine(ws, w);
  return (
    <button type="button" className={`focusline is-${tone}`} onClick={onOpen} title={T.lineHint} aria-label={T.lineSay(line, T.tone[tone])}>
      <Icon name="focus" size={14} />
      <span className="focusline__long" aria-hidden="true">{line}</span>
      <span className="focusline__short" aria-hidden="true">{T.of(FL.hoursText(w.hours).replace(' h', ''), FL.hoursText(w.capacity))}</span>
    </button>
  );
}
