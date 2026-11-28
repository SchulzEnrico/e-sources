/**
 * F-206 Schritt 8 (V95, Bau 4, P1/P9/P16–P21): Cockpit „Personen“ – Ressourcentabelle nach dem Vorbild von
 * MS Project (Windows) und iTaskX (Mac), in Aufbau und Gestaltung an E-Sources angepasst (Enrico V95).
 * Links die Tabelle (Name, Art, Kapazität, Abwesenheit, Befugnisse, Offen, Diese Woche), rechts die
 * Ressourceninformationen der gewählten Zeile – dort, wo MS Project/iTaskX per Doppelklick einen Dialog öffnen
 * (Allgemein, Befugnisse, Ressourcenkalender, Vertretung). Werkzeuge wie bei den Board-Vorlagen (NF-08):
 * „+ Person“ oben, F2 umbenennen, Entf löschen mit Rückfrage „n Aufgaben“ und „Rückgängig“ am Ort.
 * Tastatur (NF-03): Pfeile/Pos1/Ende wandern in der Tabelle, Enter springt in die Ressourceninformationen.
 */
import { type CSSProperties, type KeyboardEvent, useEffect, useRef, useState } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { Person, PersonRight, Workspace } from '../workspace/types';
import * as Ps from '../workspace/persons';
import { hoursText, loadOf, toneOf } from '../workspace/focusLoad';
import { dayOf } from '../workspace/notes';
import { PROFILE_COLORS } from '../workspace/profile';
import { DIALOG_TEXT, PERSON_TEXT, PERSONS_TEXT as T, TERMS } from '../workspace/terms';
import { noticeLater } from '../workspace/flash';
import { Icon } from './Icon';
import { PersonBadge } from './PersonChips';
import { MoreLine } from './MoreLine';

const explain = (t: string) => t.split(' = ').slice(1).join(' = ') || t;
/** 2026-12-21 → 21.12. */
const dm = (day: string) => `${day.slice(8, 10)}.${day.slice(5, 7)}.`;
const dmy = (day: string) => `${dm(day)}${day.slice(0, 4)}`;
const num = (v: string): number | undefined => {
  const x = Number(v.replace(',', '.'));
  return v.trim() === '' || !Number.isFinite(x) || x < 0 ? undefined : Math.round(x * 100) / 100;
};

export function PersonCockpit({ ws, dispatch, say }: { ws: Workspace; dispatch: (a: Action) => void; say: (t: string) => void }) {
  const day = dayOf();
  const list = Ps.personList(ws);
  const [sel, setSel] = useState(list[0].id);
  const shown = list.find((p) => p.id === sel) ?? list[0];
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState<Person['kind']>('person');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [undo, setUndo] = useState<{ text: string; u: Ps.PersonUndo } | null>(null);
  const rows = useRef(new Map<string, HTMLButtonElement>());
  const infoRef = useRef<HTMLElement>(null);
  const later = (f: () => void) => window.setTimeout(f, 0);
  const focusRow = (id: string) => later(() => rows.current.get(id)?.focus());
  useEffect(() => {
    if (!note) return;
    const t = noticeLater(() => setNote(''));
    return () => window.clearTimeout(t);
  }, [note]);
  useEffect(() => {
    if (!undo) return;
    const t = noticeLater(() => setUndo(null), 3);
    return () => window.clearTimeout(t);
  }, [undo]);
  const tell = (t: string) => (setNote(t), say(t));
  const full = Ps.personsOf(ws).length >= Ps.PERSONS_MAX;
  const similar = newName.trim() ? Ps.similar(ws, newName) : [];

  const create = () => {
    const name = newName.trim();
    if (!name) return;
    const same = similar.find((p) => p.name.toLowerCase() === name.toLowerCase());
    if (same) {
      setAdding(false);
      setNewName('');
      setSel(same.id);
      tell(T.exists(same.name));
      return focusRow(same.id);
    }
    const r = Ps.addPerson(ws, name, newKind);
    if (!r) return setError(T.full(Ps.PERSONS_MAX));
    dispatch({ type: 'personAdd', name, kind: newKind });
    setAdding(false);
    setNewName('');
    setSel(r.id);
    tell(T.created(name));
    focusRow(r.id);
  };
  const askRemove = (p: Person) => (p.me ? setError(T.meFixed) : (setSel(p.id), setAsking(true), setError('')));
  const remove = () => {
    const r = Ps.removePerson(ws, shown.id);
    setAsking(false);
    if (!r) return;
    dispatch({ type: 'personRemove', id: shown.id });
    const text = T.removed(shown.name);
    say(`${text} ${T.undo}?`);
    setUndo({ text, u: r.undo });
    const i = list.findIndex((p) => p.id === shown.id);
    setSel(list[Math.max(0, i - 1)].id);
    later(() => document.getElementById('pc-undo')?.focus());
  };
  const startRename = (p: Person) => (p.me ? setError(PERSON_TEXT.me(p.name) + ' – ' + T.meHint) : (setRenaming(p.id), setDraft(p.name), setError('')));

  const onRowKey = (e: KeyboardEvent, i: number) => {
    let j = -1;
    if (e.key === 'ArrowDown') j = Math.min(list.length - 1, i + 1);
    else if (e.key === 'ArrowUp') j = Math.max(0, i - 1);
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = list.length - 1;
    else if (e.key === 'F2') return e.preventDefault(), startRename(list[i]);
    else if (e.key === 'Delete' || e.key === 'Backspace') return e.preventDefault(), askRemove(list[i]);
    else if (e.key === 'Enter') {
      e.preventDefault();
      setSel(list[i].id);
      return later(() => infoRef.current?.querySelector<HTMLElement>('input, select, button')?.focus());
    }
    if (j < 0) return;
    e.preventDefault();
    setSel(list[j].id);
    setAsking(false);
    setError('');
    focusRow(list[j].id);
  };

  const awayCell = (p: Person) => {
    const a = Ps.awayState(p, day);
    if (a.now) return <span className="pc__away is-now" title={a.now.why}>{T.awayNow(dm(a.now.to))}</span>;
    if (a.next) return <span className="pc__away" title={a.next.why}>{T.awayNext(dm(a.next.from))}</span>;
    return <span className="lc__muted">{T.awayNone}</span>;
  };
  const rightsCell = (p: Person) => {
    const r = Ps.rightsOf(p);
    return r.length === Ps.ALL_RIGHTS.length - Ps.EXPLICIT_RIGHTS.length && !r.some((x) => Ps.EXPLICIT_RIGHTS.includes(x)) ? T.rightsAll : r.length === 0 ? <span className="lc__muted">{T.rightsNone}</span> : r.map((x) => T.rightShort[x] ?? T.right[x]).join(', ');
  };
  const weekOf = (p: Person) => loadOf(ws, p.id, { from: day, weeks: 1 }).weeks[0];

  return (
    <section className="lc__group pc" aria-labelledby="pc-head">
      <header className="lc__head lc__band">
        <Icon name="catPeople" size={15} className="icon icon--inline" />
        <h3 id="pc-head" className="lc__head-title" title={explain(TERMS.resources)}>
          {T.head}
        </h3>
        <span className="lc__head-tools">
          <button type="button" id="pc-add" className="help__run" aria-expanded={adding} disabled={full} title={full ? T.full(Ps.PERSONS_MAX) : T.addHint} onClick={() => (setAdding(!adding), setError(''))}>
            <Icon name="plus" size={13} className="icon icon--inline" /> {T.add}
          </button>
        </span>
      </header>
      <MoreLine store="persons" className="help__text bt__intro">{TERMS.resources.replace(' = ', ': ')}</MoreLine>

      {adding && (
        <form
          className="layouts__new lc__new"
          aria-label={T.addLabel}
          onSubmit={(e) => (e.preventDefault(), create())}
          onKeyDown={(e) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            e.stopPropagation();
            setAdding(false);
            later(() => document.getElementById('pc-add')?.focus());
          }}
        >
          <label className="layouts__label">
            {T.name}
            <input autoFocus value={newName} maxLength={40} aria-describedby="pc-similar" onChange={(e) => (setNewName(e.target.value), setError(''))} />
          </label>
          <label className="layouts__label">
            {T.kind}
            <select value={newKind} onChange={(e) => setNewKind(e.target.value as Person['kind'])}>
              {(['person', 'team', 'role'] as const).map((k) => (
                <option key={k} value={k}>{PERSON_TEXT.kind[k]}</option>
              ))}
            </select>
          </label>
          <div className="layouts__tools">
            <button type="button" className="help__run" onClick={() => (setAdding(false), later(() => document.getElementById('pc-add')?.focus()))}>{DIALOG_TEXT.cancel}</button>
            <button type="submit" className="help__run lc__primary" disabled={!newName.trim()}>
              <Icon name="plus" size={13} className="icon icon--inline" /> {T.create}
            </button>
          </div>
          <span id="pc-similar" className="bt__hint" aria-live="polite">{similar.length ? PERSON_TEXT.similar(similar.map((p) => p.name).join(', ')) : ''}</span>
        </form>
      )}

      <div className="pc__body">
        <div className="pc__tablewrap">
          <table className="pc__table" aria-labelledby="pc-head" aria-describedby="pc-keys">
            <thead>
              <tr>
                <th scope="col">{T.colName}</th>
                <th scope="col">{T.colKind}</th>
                <th scope="col" title={explain(TERMS.capacity)}>{T.colCap}</th>
                <th scope="col" title={explain(TERMS.absence)}>{T.colAway}</th>
                <th scope="col" title={explain(TERMS.rights)}>{T.colRights}</th>
                <th scope="col">{T.colOpen}</th>
                <th scope="col" title={explain(TERMS.focusLoad)}>{T.colWeek}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p, i) => {
                const on = p.id === shown.id;
                const lim = Ps.limitOf(ws, p.id);
                const w = weekOf(p);
                const tone = toneOf(w);
                return (
                  <tr key={p.id} className={on ? 'is-sel' : undefined}>
                    <th scope="row">
                      {renaming === p.id ? (
                        <form
                          className="pc__rename"
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (draft.trim()) dispatch({ type: 'personEdit', id: p.id, patch: { name: draft } });
                            setRenaming(null);
                            focusRow(p.id);
                          }}
                        >
                          <input
                            autoFocus
                            aria-label={`${T.name}: ${p.name}`}
                            value={draft}
                            maxLength={40}
                            title={DIALOG_TEXT.renameHint}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => setDraft(e.target.value)}
                            onBlur={() => setRenaming(null)}
                            onKeyDown={(e) => {
                              if (e.key !== 'Escape') return;
                              e.preventDefault();
                              e.stopPropagation();
                              setRenaming(null);
                              focusRow(p.id);
                            }}
                          />
                        </form>
                      ) : (
                        <button
                          type="button"
                          ref={(el) => {
                            if (el) rows.current.set(p.id, el);
                            else rows.current.delete(p.id);
                          }}
                          className="pc__name"
                          aria-pressed={on}
                          tabIndex={on ? 0 : -1}
                          title={T.rowKeys}
                          onClick={() => (setSel(p.id), setAsking(false), setError(''))}
                          onDoubleClick={() => later(() => infoRef.current?.querySelector<HTMLElement>('input, select')?.focus())}
                          onKeyDown={(e) => onRowKey(e, i)}
                        >
                          <PersonBadge person={p} size={20} />
                          <span>{p.name}</span>
                          {p.me && <span className="lc__muted">{T.me}</span>}
                        </button>
                      )}
                    </th>
                    <td>{PERSON_TEXT.kind[p.kind]}</td>
                    <td className="pc__num">{p.kind === 'team' && p.members?.length ? hoursText(w.capacity) : T.capShort(p.capacity ?? Ps.CAPACITY_DEFAULT)}</td>
                    <td>{awayCell(p)}</td>
                    <td>{rightsCell(p)}</td>
                    <td className={`pc__num${lim.limit !== undefined && lim.count > lim.limit ? ' is-over' : ''}`} title={lim.limit !== undefined && lim.count > lim.limit ? T.overLimit : undefined}>
                      {T.open(lim.count, lim.limit)}
                    </td>
                    <td className={`pc__num pc__week is-${tone}`}>
                      <span className="pc__bar" aria-hidden="true" style={{ '--f': `${Math.min(100, w.capacity ? (w.hours / w.capacity) * 100 : w.hours ? 100 : 0)}%` } as CSSProperties} />
                      {T.weekShort(hoursText(w.hours).replace(' h', ''), hoursText(w.capacity))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p id="pc-keys" className="lc__keys">{T.rowKeys}</p>
          {asking && (
            <div className="layouts__ask" role="group" aria-labelledby="pc-ask">
              <span id="pc-ask">{T.askRemove(shown.name, Ps.openCount(ws, shown.id))}</span>
              <button type="button" className="help__run" autoFocus onClick={remove}>{T.remove}</button>
              <button type="button" className="help__run" onClick={() => (setAsking(false), focusRow(shown.id))}>{DIALOG_TEXT.cancel}</button>
            </div>
          )}
          {undo && (
            <p className="layouts__undo" role="status">
              {undo.text}{' '}
              <button
                type="button"
                id="pc-undo"
                className="help__run"
                onClick={() => {
                  dispatch({ type: 'personRestore', undo: undo.u });
                  setSel(undo.u.person.id);
                  setUndo(null);
                  say(T.restored(undo.u.person.name));
                  focusRow(undo.u.person.id);
                }}
              >
                {T.undo}
              </button>
            </p>
          )}
          {note && <p className="layouts__undo" role="status">{note}</p>}
          {error && <p className="layouts__error" role="alert">{error}</p>}
        </div>

        <ResourceInfo key={shown.id} ws={ws} p={shown} day={day} dispatch={dispatch} say={say} boxRef={infoRef} onRename={() => startRename(shown)} onRemove={() => askRemove(shown)} />
      </div>
    </section>
  );
}

/** Ressourceninformationen der gewählten Zeile (MS Project: Dialog „Ressourceninformationen“). */
function ResourceInfo({ ws, p, day, dispatch, say, boxRef, onRename, onRemove }: { ws: Workspace; p: Person; day: string; dispatch: (a: Action) => void; say: (t: string) => void; boxRef: React.RefObject<HTMLElement>; onRename: () => void; onRemove: () => void }) {
  const edit = (patch: Partial<Omit<Person, 'id' | 'me'>>, text: string = T.saved) => {
    dispatch({ type: 'personEdit', id: p.id, patch });
    say(text);
  };
  const [cap, setCap] = useState(String(p.capacity ?? Ps.CAPACITY_DEFAULT).replace('.', ','));
  const [limit, setLimit] = useState(p.limit?.total !== undefined ? String(p.limit.total) : '');
  const [away, setAway] = useState({ from: day, to: day, why: '' });
  const [awayErr, setAwayErr] = useState('');
  const others = Ps.personList(ws).filter((x) => x.id !== p.id && x.kind !== 'team');
  const [stand, setStand] = useState({ by: others[0]?.id ?? '', from: '', to: '' });
  const rights = Ps.rightsOf(p);
  const w = loadOf(ws, p.id, { from: day, weeks: 1 }).weeks[0];
  const nameOf = (id: string) => Ps.personById(ws, id)?.name ?? '?';
  const span = (a: { from?: string; to?: string }) => (a.from || a.to ? `${a.from ? dmy(a.from) : '…'} – ${a.to ? dmy(a.to) : '…'}` : T.standAlways);

  return (
    <section ref={boxRef} className="pc__info" aria-labelledby="pc-info-head">
      <h4 id="pc-info-head" className="radar__detail-head">
        <PersonBadge person={p} size={22} /> {T.info(p.name)}
      </h4>
      <div className="pc__tools">
        <button type="button" className="help__run" aria-disabled={p.me} title={p.me ? T.meHint : 'F2'} onClick={onRename}>
          <Icon name="rename" size={13} className="icon icon--inline" /> {T.rename}
        </button>
        <button type="button" className="help__run" aria-disabled={p.me} title={p.me ? T.meFixed : 'Entf'} onClick={onRemove}>
          <Icon name="remove" size={13} className="icon icon--inline" /> {T.remove}
        </button>
      </div>

      <fieldset className="pc__set">
        <legend>{T.general}</legend>
        <label className="layouts__label">
          {T.kind}
          <select value={p.kind} disabled={p.me} onChange={(e) => edit({ kind: e.target.value as Person['kind'] })}>
            {(['person', 'team', 'role'] as const).map((k) => (
              <option key={k} value={k}>{PERSON_TEXT.kind[k]}</option>
            ))}
          </select>
        </label>
        <label className="layouts__label" title={explain(TERMS.capacity)}>
          {T.capacity}
          <input
            inputMode="decimal"
            value={cap}
            disabled={p.kind === 'team' && !!p.members?.length}
            onChange={(e) => setCap(e.target.value)}
            onBlur={() => {
              const x = num(cap);
              if (x === undefined) return setCap(String(p.capacity ?? Ps.CAPACITY_DEFAULT).replace('.', ','));
              if (x !== (p.capacity ?? Ps.CAPACITY_DEFAULT)) edit({ capacity: x === Ps.CAPACITY_DEFAULT ? undefined : x });
            }}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
        </label>
        <label className="layouts__label">
          {T.limit}
          <input
            inputMode="numeric"
            value={limit}
            placeholder={T.limitNone}
            onChange={(e) => setLimit(e.target.value)}
            onBlur={() => {
              const x = num(limit);
              const total = x === undefined || x === 0 ? undefined : Math.round(x);
              if (total !== p.limit?.total) edit({ limit: total === undefined ? (p.limit?.perProject ? { perProject: p.limit.perProject } : undefined) : { ...p.limit, total } });
              setLimit(total === undefined ? '' : String(total));
            }}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
        </label>
        {!p.me && (
          <div className="pc__colors" role="radiogroup" aria-label={T.color}>
            <span className="layouts__label">{T.color}</span>
            {PROFILE_COLORS.map((c, i) => (
              <button
                key={c.hex}
                type="button"
                role="radio"
                aria-checked={p.color === i}
                aria-label={c.name}
                title={c.name}
                className="pc__swatch"
                style={{ '--c': c.hex } as CSSProperties}
                onClick={() => edit({ color: i }, `${T.color}: ${c.name}`)}
              />
            ))}
          </div>
        )}
        {p.me && <p className="lc__muted">{T.meHint}</p>}
        <p className="pc__load">
          {T.load}: <b className={`pc__week is-${toneOf(w)}`}>{hoursText(w.hours)} / {hoursText(w.capacity)}</b> · {T.colOpen}: {Ps.openCount(ws, p.id)}
        </p>
      </fieldset>

      {p.kind === 'team' && (
        <fieldset className="pc__set">
          <legend>{T.members}</legend>
          {Ps.memberChoices(ws, p).length === 0 && <p className="lc__muted">{T.membersNone}</p>}
          {Ps.memberChoices(ws, p).map((m) => {
            const on = !!p.members?.includes(m.id);
            return (
              <label key={m.id} className="pc__check">
                <input type="checkbox" checked={on} onChange={() => edit({ members: on ? (p.members ?? []).filter((x) => x !== m.id) : [...(p.members ?? []), m.id] })} />
                <PersonBadge person={m} size={16} /> {m.name}
              </label>
            );
          })}
        </fieldset>
      )}

      <fieldset className="pc__set" title={explain(TERMS.rights)}>
        <legend>{T.rights}</legend>
        {Ps.ALL_RIGHTS.map((r: PersonRight) => {
          const on = rights.includes(r);
          return (
            <label key={r} className="pc__check" title={T.rightHint[r]}>
              <input type="checkbox" checked={on} onChange={() => edit({ rights: on ? rights.filter((x) => x !== r) : [...rights, r] })} />
              {T.right[r]} <span className="lc__muted">– {T.rightHint[r]}</span>
            </label>
          );
        })}
        <p className="lc__muted pc__note">{T.rightsLocal}</p>
      </fieldset>

      <fieldset className="pc__set" title={explain(TERMS.absence)}>
        <legend>{T.calendar}</legend>
        {!p.away?.length && <p className="lc__muted">{T.awayNoneLong}</p>}
        <ul className="pc__list">
          {(p.away ?? []).map((a) => (
            <li key={`${a.from}-${a.to}`} className={a.from <= day && a.to >= day ? 'is-now' : a.to < day ? 'is-past' : undefined}>
              {span(a)}{a.why ? ` · ${a.why}` : ''}
              <button type="button" className="help__run pc__x" aria-label={T.awayRemove(span(a))} title={T.awayRemove(span(a))} onClick={() => edit({ away: p.away!.filter((x) => x !== a) })}>
                <Icon name="close" size={11} />
              </button>
            </li>
          ))}
        </ul>
        <form
          className="pc__row"
          aria-label={T.awayAdd}
          onSubmit={(e) => {
            e.preventDefault();
            const next = Ps.withAway(p, away);
            if (!next) return setAwayErr(T.awayBad);
            setAwayErr('');
            edit({ away: next }, `${T.awayAdd}: ${span(away)}`);
            setAway({ ...away, why: '' });
          }}
        >
          <label className="layouts__label">{T.awayFrom}<input type="date" value={away.from} onChange={(e) => (setAway({ ...away, from: e.target.value, to: away.to < e.target.value ? e.target.value : away.to }), setAwayErr(''))} /></label>
          <label className="layouts__label">{T.awayTo}<input type="date" value={away.to} min={away.from} aria-invalid={!!awayErr} onChange={(e) => (setAway({ ...away, to: e.target.value }), setAwayErr(''))} /></label>
          <label className="layouts__label">{T.awayWhy}<input value={away.why} maxLength={40} onChange={(e) => setAway({ ...away, why: e.target.value })} /></label>
          <button type="submit" className="help__run"><Icon name="plus" size={13} className="icon icon--inline" /> {T.awayAdd}</button>
          {awayErr && <span className="layouts__error" role="alert">{awayErr}</span>}
        </form>
      </fieldset>

      {p.kind !== 'team' && (
        <fieldset className="pc__set" title={explain(TERMS.standIn)}>
          <legend>{T.stand}</legend>
          {!p.stand?.length && <p className="lc__muted">{T.standNone}</p>}
          <ul className="pc__list">
            {(p.stand ?? []).map((s) => (
              <li key={s.by}>
                {T.standBy} {nameOf(s.by)} · {span(s)}
                <button type="button" className="help__run pc__x" aria-label={T.standRemove(nameOf(s.by))} title={T.standRemove(nameOf(s.by))} onClick={() => edit({ stand: p.stand!.filter((x) => x !== s) })}>
                  <Icon name="close" size={11} />
                </button>
              </li>
            ))}
          </ul>
          {others.length > 0 && (
            <form
              className="pc__row"
              aria-label={T.standAdd}
              onSubmit={(e) => {
                e.preventDefault();
                const next = Ps.withStand(p, { by: stand.by, from: stand.from || undefined, to: stand.to || undefined });
                if (!next) return setAwayErr(T.awayBad);
                edit({ stand: next }, `${T.standAdd}: ${nameOf(stand.by)}`);
              }}
            >
              <label className="layouts__label">
                {T.standBy}
                <select value={stand.by} onChange={(e) => setStand({ ...stand, by: e.target.value })}>
                  {others.map((o) => <option key={o.id} value={o.id}>{o.me ? PERSON_TEXT.me(o.name) : o.name}</option>)}
                </select>
              </label>
              <label className="layouts__label">{T.awayFrom}<input type="date" value={stand.from} onChange={(e) => setStand({ ...stand, from: e.target.value })} /></label>
              <label className="layouts__label">{T.awayTo}<input type="date" value={stand.to} min={stand.from || undefined} onChange={(e) => setStand({ ...stand, to: e.target.value })} /></label>
              <button type="submit" className="help__run"><Icon name="plus" size={13} className="icon icon--inline" /> {T.standAdd}</button>
            </form>
          )}
        </fieldset>
      )}
    </section>
  );
}
