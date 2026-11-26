/**
 * F-206 Schritt 8 (V95, Bau 5, P10–P14/P22): Cockpit „Fokus“ im Cockpit „Notizen“ (Rad Notizen · Fokus · Regeln).
 * Vorbild: Auslastungsgrafik bzw. Ressourcengrafik in MS Project (Windows) und iTaskX (Mac) – je Woche ein Balken
 * mit dem geplanten Aufwand, die Kapazität als Linie; Aufbau und Gestaltung an E-Sources angepasst (Enrico V95).
 * Auswahl Person oder Team (Team: Balken je Mitglied), Rad „Mit vorläufig · Ohne vorläufig“, 6 Wochen mit
 * Früher/Später. Darunter die Aufgaben der gewählten Woche bzw. „Ohne Termin“ – Klick öffnet die Notiz.
 * Tastatur (NF-03): Pfeile links/rechts wählen die Woche (Pos1/Ende), Enter springt in die Aufgaben.
 *
 * V96 (Bau 7, P13/C2): Darstellungen wählbar und kombinierbar (Zeile „Zeigen“: Fokus-Zeile · Wochenbalken ·
 * Fokus-Ring · Auslastungs-Raster, in `Workspace.focusViews`). Fokus-Ring = gewählte Woche als Füllstand
 * (voller Kreis = Kapazität, Überlast außen). Auslastungs-Raster nach „Ressource: Einsatz“ (MS Project) bzw.
 * Ressourcen-Auslastung (iTaskX): Personen × Wochen, Zelle im Ton; Pfeile wandern, Enter wählt Person + Woche.
 */
import { type CSSProperties, type KeyboardEvent, useId, useRef, useState } from 'react';
import type { FocusView, Workspace } from '../workspace/types';
import type { Action } from '../workspace/useWorkspace';
import { FOCUS_VIEWS } from '../workspace/noteObjects';
import * as Ps from '../workspace/persons';
import * as FL from '../workspace/focusLoad';
import * as Gp from '../workspace/gpm';
import { dayOf, notesOf, titleOf } from '../workspace/notes';
import { PROFILE_COLORS } from '../workspace/profile';
import { FOCUS_TEXT as T, PERSON_TEXT, TERMS } from '../workspace/terms';
import { Icon } from './Icon';
import { ModeWheel } from './ModeWheel';
import { PersonBadge } from './PersonChips';
import { openNote } from './SourceChips';
import { scopeProject } from '../workspace/deskProject';
import { ScopeNote } from './DeskProject';

const explain = (t: string) => t.split(' = ').slice(1).join(' = ') || t;
const dm = (day: string) => `${day.slice(8, 10)}.${day.slice(5, 7)}.`;
const BAR_H = 140;

export function FocusCockpit({ ws, dispatch, onOpen, onPersons }: { ws: Workspace; dispatch: (a: Action) => void; onOpen: () => void; onPersons: () => void }) {
  const day = dayOf();
  const people = Ps.personList(ws);
  const [who, setWho] = useState(Ps.meId(ws));
  const p = Ps.personById(ws, who) ?? people[0];
  const [drafts, setDrafts] = useState(true);
  const [shift, setShift] = useState(0);
  const from = FL.addDays(FL.mondayOf(day), 7 * shift);
  // V117 (Projekt-Desk, PD5): auf einem gebundenen Desk ab Werk nur das gezeigte Projekt
  const project = scopeProject();
  const load = FL.loadOf(ws, p.id, { from, weeks: FL.FOCUS_WEEKS, drafts, project });
  const split = FL.teamSplit(ws, p.id, { from, weeks: FL.FOCUS_WEEKS, drafts, project });
  const scale = FL.scaleOf(load.weeks);
  const [sel, setSel] = useState<number | 'none'>(0);
  const btns = useRef<(HTMLButtonElement | null)[]>([]);
  const listRef = useRef<HTMLUListElement>(null);
  const pct = (h: number) => `${Math.min(100, (h / scale) * 100)}%`;
  const thisWeek = FL.loadOf(ws, p.id, { from: day, weeks: 1, drafts }).weeks[0];
  const views = FL.focusViewsOf(ws);
  const [viewSaid, setViewSaid] = useState('');
  const toggleView = (v: FocusView) => {
    const on = !views.includes(v);
    if (!FL.setFocusView(ws, v, on)) return setViewSaid(T.viewLast);
    dispatch({ type: 'focusView', view: v, on });
    setViewSaid(on ? T.viewOn(T.viewName[v]) : T.viewOff(T.viewName[v]));
  };
  const pick = (id: string | null, i: number) => {
    if (id && id !== p.id) setWho(id);
    setSel(i);
  };
  const colorOf = (id: string) => PROFILE_COLORS[Ps.personById(ws, id)?.color ?? 0]?.hex;

  const whoSet = FL.membersOf(ws, p);
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
      <ScopeNote ws={ws} />
      <p className="fc__views" role="group" aria-label={T.views}>
        <span className="fc__views-label" aria-hidden="true">{T.views}:</span>
        {FOCUS_VIEWS.map((v) => (
          <button key={v} type="button" className="fc__view" aria-pressed={views.includes(v)} title={T.viewHint[v]} onClick={() => toggleView(v)}>
            {T.viewName[v]}
          </button>
        ))}
        <span className="fc__said" role="status" aria-live="polite">{viewSaid}</span>
      </p>
      <p className={`fc__line is-${FL.toneOf(thisWeek)}`}>
        <b>{FL.focusLine(ws, thisWeek)}</b> · {T.tone[FL.toneOf(thisWeek)]}
      </p>

      <div className="fc__top">
      {views.includes('ring') && (
        <FocusRing
          week={sel === 'none' ? load.weeks[0] : load.weeks[sel]}
          members={split.map((s) => ({ id: s.id, hours: s.hours[sel === 'none' ? 0 : sel] ?? 0, color: colorOf(s.id) }))}
        />
      )}
      {views.includes('week') && (
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
      )}
      </div>
      {views.includes('week') && <p id="fc-keys" className="lc__keys">{T.weekKeys}</p>}
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

      {views.includes('grid') && (
        <FocusGrid
          ws={ws}
          rows={FL.gridOf(ws, p.id, { from, weeks: FL.FOCUS_WEEKS, drafts })}
          weeks={load.weeks.map((w) => w.week)}
          now={FL.mondayOf(day)}
          selId={p.id}
          sel={sel}
          onPick={pick}
          onEnter={() => setTimeout(() => listRef.current?.querySelector<HTMLElement>('button')?.focus())}
        />
      )}

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
                  {(() => {
                    const h = Gp.hoursFor(n, whoSet);
                    return <span className="fc__tag" title={n.use?.length ? T.useHint : undefined}>{h !== undefined ? FL.hoursText(h) : T.noEffort}</span>;
                  })()}
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
  if (!FL.showsView(ws, 'line') || !Ps.openCount(ws, me)) return null;
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

/** V96 (Bau 7): Fokus-Ring – die gewählte Woche als Füllstand; voller Kreis = Kapazität, Überlast außen in Rot. */
function FocusRing({ week, members }: { week?: FL.WeekLoad; members: { id: string; hours: number; color?: string }[] }) {
  const pat = `fc-hatch-${useId().replace(/:/g, '')}`;
  if (!week) return null;
  const ring = FL.ringOf(week, members.length ? members : undefined);
  const tone = FL.toneOf(week);
  const kw = T.kw(FL.isoWeek(week.week));
  const overH = week.capacity > 0 ? Math.max(0, week.hours - week.capacity) : week.hours;
  const R = 46;
  const O = 57;
  const arc = (r: number, from: number, to: number, stroke: string, w: number, key: string | number, cls = '') => (
    <circle
      key={key}
      className={cls}
      cx="64" cy="64" r={r}
      fill="none"
      stroke={stroke}
      strokeWidth={w}
      pathLength={1000}
      strokeDasharray={`${Math.max(0, (to - from) * 1000 - (to < 1 ? 4 : 0))} 1000`}
      strokeDashoffset={-from * 1000}
      transform="rotate(-90 64 64)"
    />
  );
  const colorOf = (a: FL.RingArc) =>
    a.kind === 'draft' ? `url(#${pat})` : a.kind === 'member' ? (members.find((m) => m.id === a.id)?.color ?? 'rgb(var(--accent-rgb))') : 'currentColor';
  return (
    <figure className={`fc__ring is-${tone}`} role="img" aria-label={T.ringSay(kw, FL.hoursText(week.hours), FL.hoursText(week.capacity), ring.pct !== undefined ? `${ring.pct} %` : '', T.tone[tone], overH > 0 ? FL.hoursText(overH) : '')}>
      <svg viewBox="0 0 128 128" width="128" height="128" aria-hidden="true">
        <defs>
          <pattern id={pat} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="rgba(var(--accent-rgb), 0.18)" />
            <rect width="3" height="6" fill="rgba(var(--accent-rgb), 0.75)" />
          </pattern>
        </defs>
        <circle className="fc__ring-track" cx="64" cy="64" r={R} fill="none" strokeWidth="14" />
        {ring.arcs.map((a, i) => arc(R, a.from, a.to, colorOf(a), 14, i, `fc__arc is-${a.kind}`))}
        {ring.over > 0 && arc(O, 0, ring.over, '#e2554a', 5, 'over', 'fc__arc is-over')}
      </svg>
      <figcaption aria-hidden="true">
        <b className="fc__ring-pct">{ring.pct !== undefined ? `${ring.pct} %` : FL.hoursText(week.hours)}</b>
        <span>{T.of(FL.hoursText(week.hours).replace(' h', ''), FL.hoursText(week.capacity))}</span>
        <span className="fc__ring-kw">{kw}{overH > 0 ? ` · ${T.ringOver(FL.hoursText(overH))}` : ''}</span>
      </figcaption>
    </figure>
  );
}

/**
 * V96 (Bau 7): Auslastungs-Raster – Personen × Wochen wie „Ressource: Einsatz“ (MS Project) bzw. Ressourcen-Auslastung
 * (iTaskX), Zellen im Ton. Tastatur als Raster (role=grid): Pfeile, Pos1/Ende, Strg+Pos1/Ende; Enter wählt und springt
 * zu den Aufgaben; Klick wählt Person (bzw. Team) und Woche.
 */
function FocusGrid(p: {
  ws: Workspace;
  rows: FL.GridRow[];
  weeks: string[];
  now: string;
  selId: string;
  sel: number | 'none';
  onPick: (id: string | null, week: number) => void;
  onEnter: () => void;
}) {
  const [at, setAt] = useState<[number, number]>([0, 0]);
  const cells = useRef<Map<string, HTMLButtonElement | null>>(new Map());
  const r0 = Math.min(at[0], p.rows.length - 1);
  const c0 = Math.min(at[1], p.weeks.length - 1);
  const go = (r: number, c: number) => {
    setAt([r, c]);
    cells.current.get(`${r}:${c}`)?.focus();
  };
  const onKey = (e: KeyboardEvent, r: number, c: number) => {
    const last = p.rows.length - 1;
    const end = p.weeks.length - 1;
    const k = e.key;
    let to: [number, number] | null = null;
    if (k === 'ArrowRight') to = [r, Math.min(end, c + 1)];
    else if (k === 'ArrowLeft') to = [r, Math.max(0, c - 1)];
    else if (k === 'ArrowDown') to = [Math.min(last, r + 1), c];
    else if (k === 'ArrowUp') to = [Math.max(0, r - 1), c];
    else if (k === 'Home') to = e.ctrlKey || e.metaKey ? [0, 0] : [r, 0];
    else if (k === 'End') to = e.ctrlKey || e.metaKey ? [last, end] : [r, end];
    else if (k === 'Enter') {
      e.preventDefault();
      p.onPick(p.rows[r].id, c);
      return p.onEnter();
    }
    if (!to) return;
    e.preventDefault();
    go(to[0], to[1]);
  };
  const nameOf = (row: FL.GridRow) => {
    if (row.id === null) return T.gridSum;
    const x = Ps.personById(p.ws, row.id);
    if (!x) return '…';
    if (row.sum) return T.gridTeam(x.name);
    return x.me ? PERSON_TEXT.me(x.name) : x.name;
  };
  return (
    <section className="fc__grid-wrap" aria-labelledby="fc-grid-head">
      <h4 className="lc__sub" id="fc-grid-head" title={T.viewHint.grid}>{T.gridHead}</h4>
      {p.rows.length === 0 ? (
        <p className="lc__muted">{T.gridEmpty}</p>
      ) : (
        <>
          <table className="fc__grid" role="grid" aria-labelledby="fc-grid-head" aria-describedby="fc-grid-keys">
            <thead>
              <tr>
                <th scope="col">{T.gridWho}</th>
                {p.weeks.map((w) => (
                  <th key={w} scope="col" className={w === p.now ? 'is-now' : ''}>
                    {T.kw(FL.isoWeek(w))}
                    <span className="fc__span">{dm(w)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {p.rows.map((row, r) => {
                const who = row.id ? Ps.personById(p.ws, row.id) : undefined;
                const name = nameOf(row);
                return (
                  <tr key={row.id ?? 'sum'} className={row.sum ? 'is-sum' : ''}>
                    <th scope="row">
                      {who && <PersonBadge person={who} size={16} />}
                      <span>{name}</span>
                    </th>
                    {row.cells.map((c, i) => {
                      const selected = p.sel === i && row.id === p.selId;
                      const kw = T.kw(FL.isoWeek(p.weeks[i]));
                      return (
                        <td key={i} role="gridcell" aria-selected={selected}>
                          <button
                            ref={(el) => void cells.current.set(`${r}:${i}`, el)}
                            type="button"
                            className={`fc__cell is-${c.tone}${selected ? ' is-sel' : ''}${c.capacity <= 0 && c.hours <= 0 ? ' is-empty' : ''}`}
                            tabIndex={r === r0 && i === c0 ? 0 : -1}
                            aria-label={T.gridCellSay(name, kw, FL.hoursText(c.hours), FL.hoursText(c.capacity), c.pct !== undefined ? `${c.pct} %` : '', T.tone[c.tone], c.count)}
                            onFocus={() => setAt([r, i])}
                            onClick={() => p.onPick(row.id, i)}
                            onKeyDown={(e) => onKey(e, r, i)}
                          >
                            <span className="fc__cell-h">{FL.hoursText(c.hours).replace(' h', '')}</span>
                            <span className="fc__cell-cap">/ {FL.hoursText(c.capacity).replace(' h', '')}</span>
                            {c.draft > 0 && <i className="fc__cell-draft" aria-hidden="true" />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p id="fc-grid-keys" className="lc__keys">{T.gridKeys}</p>
        </>
      )}
    </section>
  );
}
