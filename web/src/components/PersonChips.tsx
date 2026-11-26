/**
 * F-206 Schritt 8 (V94): Zeile „Zuständig · Aufwand“ in der Notiz (P5, P6, P8, P17) und die Personenauswahl
 * (P1: „+ ‚Name‘ anlegen“ mit Hinweis „ähnlich: …“). Wie Trello-Mitglieder oben an der Karte: Kennzeichen mit
 * Initialen und Kennfarbe. Zuständig und Aufwand gehören zum Entwurf (F-213 S9) – im Projektfokus „vorläufig“.
 * Tastatur: Alt/⌥+Z in der Notiz öffnet die Auswahl; Pfeile, Enter, Esc. Meldungen am Ort.
 */
import { type CSSProperties, type KeyboardEvent, type ReactNode, useEffect, useId, useRef, useState } from 'react';
import type { Note, Person, PlanActual, Workspace } from '../workspace/types';
import * as Ps from '../workspace/persons';
import { hoursText } from '../workspace/focusLoad';
import { PROFILE_COLORS, initialsOf } from '../workspace/profile';
import { PERSON_TEXT as T } from '../workspace/terms';
import * as Gp from '../workspace/gpm';

/** Kennzeichen einer Person (Initialen in Kennfarbe); Name für Bildschirmleser steht am Aufrufer. */
export function PersonBadge({ person, size = 22 }: { person?: Person; size?: number }) {
  const hex = PROFILE_COLORS[person?.color ?? colorFor(person?.id ?? '')]?.hex;
  return (
    <span className="avatar kenn pbadge" aria-hidden="true" style={{ '--c': hex, width: size, height: size, fontSize: Math.round(size * 0.42) } as CSSProperties}>
      {person ? initialsOf(person.name) || '?' : '–'}
    </span>
  );
}
/** Ohne gewählte Farbe: fest aus der Id (gleiche Person = gleiche Farbe auf jedem Gerät). */
const colorFor = (id: string) => [...id].reduce((s, c) => s + c.charCodeAt(0), 0) % PROFILE_COLORS.length;

// ---------------------------------------------------------------- Auswahl

interface PickProps {
  ws: Workspace;
  current?: string;
  /** Person gewählt (undefined = ohne Zuständig) */
  onPick: (id: string | undefined) => void;
  /** Neue Person anlegen und wählen */
  onCreate: (name: string) => void;
  onClose: () => void;
  label?: string;
  /** P4: in der Matrix ohne „Ohne Zuständig“ */
  noNone?: boolean;
}

type Opt = { kind: 'person'; p: Person } | { kind: 'none' } | { kind: 'new'; name: string };

export function PersonPicker({ ws, current, onPick, onCreate, onClose, label = T.pick, noNone }: PickProps) {
  const [q, setQ] = useState('');
  const [at, setAt] = useState(0);
  const lid = useId();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const out = (e: PointerEvent) => !box.current?.contains(e.target as Node) && onClose();
    window.addEventListener('pointerdown', out, true);
    return () => window.removeEventListener('pointerdown', out, true);
  }, [onClose]);
  const found = Ps.findPersons(ws, q);
  const name = q.replace(/\s+/g, ' ').trim();
  const exact = found.some((p) => p.name.toLowerCase() === name.toLowerCase());
  const like = name && !exact ? Ps.similar(ws, name) : [];
  const opts: Opt[] = [
    ...(!noNone && !name && current ? [{ kind: 'none' } as Opt] : []),
    ...found.map((p) => ({ kind: 'person', p }) as Opt),
    ...(name && !exact ? [{ kind: 'new', name } as Opt] : []),
  ];
  const sel = Math.min(at, opts.length - 1);
  const choose = (o: Opt | undefined) => {
    if (!o) return;
    if (o.kind === 'none') onPick(undefined);
    else if (o.kind === 'new') onCreate(o.name);
    else onPick(o.p.id);
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') (e.preventDefault(), setAt((sel + 1) % Math.max(1, opts.length)));
    else if (e.key === 'ArrowUp') (e.preventDefault(), setAt((sel - 1 + opts.length) % Math.max(1, opts.length)));
    else if (e.key === 'Enter') (e.preventDefault(), choose(opts[sel]));
    else if (e.key === 'Escape') (e.preventDefault(), e.stopPropagation(), onClose());
  };
  return (
    <div ref={box} className="srcpick ppick" role="dialog" aria-label={label}>
      <input
        className="srcpick__in"
        role="combobox"
        aria-expanded="true"
        aria-controls={`${lid}-list`}
        aria-activedescendant={opts.length ? `${lid}-${sel}` : undefined}
        aria-label={`${label}. ${T.pickHint}`}
        placeholder={T.pickPh}
        value={q}
        autoFocus
        onChange={(e) => (setQ(e.target.value), setAt(0))}
        onKeyDown={onKey}
      />
      <ul id={`${lid}-list`} className="srcpick__list" role="listbox" aria-label={label}>
        {opts.map((o, i) => {
          const on = i === sel;
          const common = { id: `${lid}-${i}`, role: 'option', 'aria-selected': on, className: `srcpick__opt${on ? ' is-on' : ''}`, onPointerEnter: () => setAt(i), onClick: () => choose(o) } as const;
          if (o.kind === 'none') return <li key="none" {...common}><PersonBadge /> {T.none}</li>;
          if (o.kind === 'new')
            return (
              <li key="new" {...common}>
                <span className="ppick__plus" aria-hidden="true">+</span> {T.create(o.name)}
                {like.length > 0 && <span className="srcpick__where">{T.similar(like.map((p) => p.name).join(', '))}</span>}
              </li>
            );
          const lim = Ps.limitOf(ws, o.p.id);
          return (
            <li key={o.p.id} {...common}>
              <PersonBadge person={o.p} />
              <span className="srcpick__title">{o.p.me ? T.me(o.p.name) : o.p.name}</span>
              {o.p.kind !== 'person' && <span className="srcpick__where">{T.kind[o.p.kind]}</span>}
              {lim.limit !== undefined && <span className={`srcpick__where${lim.over ? ' is-over' : ''}`}>{T.limitShort(lim.count, lim.limit)}</span>}
              {o.p.id === current && <span className="srcpick__where">· {T.current}</span>}
            </li>
          );
        })}
      </ul>
      <p className="srcpick__hint">{T.pickHint}</p>
    </div>
  );
}

// ---------------------------------------------------------------- Zeile in der Notiz

interface RowProps {
  ws: Workspace;
  /** Note, wie der Entwurf sie zeigt */
  note: Note;
  onAssign: (id: string | undefined) => void;
  onEffort: (e: PlanActual | undefined) => void;
  /** Neue Person anlegen (ohne Zuweisung) – die Id ist vorher bekannt (Ps.addPerson ist rein). */
  onCreate: (name: string) => void;
  /** V99 (F-206 Schritt 10): weitere Einträge der Zeile, z. B. der Chip „Projekt“ */
  after?: ReactNode;
}

const QUICK = [0.5, 1, 2, 4, 8];
const num = (s: string): number | undefined => {
  const v = Number(s.replace(',', '.').replace(/h$/i, '').trim());
  return s.trim() && Number.isFinite(v) && v >= 0 && v <= 10000 ? Math.round(v * 100) / 100 : undefined;
};

export function PeopleRow({ ws, note, onAssign, onEffort, onCreate, after }: RowProps) {
  const [pick, setPick] = useState(false);
  const [effort, setEffort] = useState(false);
  const [ask, setAsk] = useState<{ id: string; text: string } | null>(null);
  const [say, setSay] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const who = useRef<HTMLButtonElement>(null);
  const eff = useRef<HTMLButtonElement>(null);
  const a = Ps.assigneeOf(note);
  const person = Ps.personById(ws, a);
  const delegated = !!note.delegated?.person && note.delegated.person === a;

  // Alt/⌥+Z in der offenen Notiz (P7)
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.code !== 'KeyZ') return;
      const box = root.current?.closest('.note');
      if (!box || !box.contains(document.activeElement)) return;
      e.preventDefault();
      setPick(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const back = (el: HTMLElement | null) => window.setTimeout(() => el?.focus({ preventScroll: true }), 0);
  const take = (id: string | undefined) => {
    setPick(false);
    // P17: Task-Limit am Ort nachfragen, nicht sperren
    if (id && id !== a) {
      const lim = Ps.limitOf(ws, id, note.project);
      const p = Ps.personById(ws, id);
      // V116: Task-Limit je Projekt zuerst (meist das engere)
      if (lim.inProject?.over && p) return setAsk({ id, text: T.limitAskProject(p.name, lim.inProject.count, lim.inProject.limit) });
      if (lim.over && p) return setAsk({ id, text: T.limitAsk(p.name, lim.count, lim.limit!) });
    }
    onAssign(id);
    setSay(id ? T.assigned(Ps.personById(ws, id)?.name ?? '') : T.unassigned);
    back(who.current);
  };
  const create = (name: string) => {
    const r = Ps.addPerson(ws, name);
    if (!r) return;
    onCreate(name);
    setPick(false);
    onAssign(r.id);
    setSay(T.created(name));
    back(who.current);
  };
  const plan = note.effort?.plan;
  const actual = note.effort?.actual;
  // V111 (F-226 G7): ohne Hand-Plan zeigt der Chip die Stunden aus den Einsätzen (gerechnet)
  const used = plan === undefined ? Gp.planHours(ws, note) : undefined;
  const setPlan = (p: number | undefined) => onEffort(p === undefined && actual === undefined ? undefined : { ...(p !== undefined ? { plan: p } : {}), ...(actual !== undefined ? { actual } : {}) });

  return (
    <div ref={root} className="srcs people" role="group" aria-label={T.row}>
      <span className="people__item">
        <button
          ref={who}
          type="button"
          className="srcs__chip people__who"
          aria-haspopup="listbox"
          aria-expanded={pick}
          aria-label={`${T.assignee}: ${person ? person.name : T.none}${delegated ? `, ${T.delegated}` : ''}. ${T.keyHint}`}
          title={`${T.assignee} (Alt+Z)${delegated ? ` · ${T.delegated}` : ''}`}
          onClick={() => setPick((x) => !x)}
        >
          <PersonBadge person={person} />
          <span className="srcs__title">{person ? (person.me ? T.me(person.name) : person.name) : T.none}</span>
          {delegated && <span className="srcs__spot">{T.delegatedShort}</span>}
        </button>
        {pick && <PersonPicker ws={ws} current={a} onPick={take} onCreate={create} onClose={() => (setPick(false), back(who.current))} />}
      </span>
      <span className="people__item">
        {effort ? (
          <span className="srcs__edit people__eff" role="group" aria-label={T.effort}>
            <label>
              {T.plan}{' '}
              <input
                className="srcs__spotin"
                inputMode="decimal"
                defaultValue={plan !== undefined ? String(plan).replace('.', ',') : ''}
                aria-label={`${T.plan} ${T.hours}`}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.preventDefault(), setPlan(num(e.currentTarget.value)), setEffort(false), back(eff.current));
                  else if (e.key === 'Escape') (e.preventDefault(), e.stopPropagation(), setEffort(false), back(eff.current));
                }}
                onBlur={(e) => setPlan(num(e.currentTarget.value))}
              />
            </label>
            {QUICK.map((h) => (
              <button key={h} type="button" className="srcs__mini" aria-pressed={plan === h} onClick={() => (setPlan(h), setEffort(false), back(eff.current))}>
                {hoursText(h)}
              </button>
            ))}
            <label>
              {T.actual}{' '}
              <input
                className="srcs__spotin"
                inputMode="decimal"
                defaultValue={actual !== undefined ? String(actual).replace('.', ',') : ''}
                aria-label={`${T.actual} ${T.hours}`}
                onKeyDown={(e) => e.key === 'Escape' && (e.preventDefault(), e.stopPropagation(), setEffort(false), back(eff.current))}
                onBlur={(e) => {
                  const v = num(e.currentTarget.value);
                  onEffort(plan === undefined && v === undefined ? undefined : { ...(plan !== undefined ? { plan } : {}), ...(v !== undefined ? { actual: v } : {}) });
                }}
              />
            </label>
            <button type="button" className="srcs__mini" onClick={() => (setEffort(false), back(eff.current))}>
              {T.done}
            </button>
          </span>
        ) : (
          <button ref={eff} type="button" className={`srcs__chip people__eff${plan === undefined && used === undefined ? ' is-empty' : ''}`} title={used !== undefined ? T.fromUseTitle : T.effortTitle} aria-label={`${T.effortLabel(plan ?? used, actual)}${used !== undefined ? ` (${T.fromUse})` : ''}`} onClick={() => setEffort(true)}>
            <span className="people__clock" aria-hidden="true">◷</span>
            <span className="srcs__title">{plan !== undefined ? hoursText(plan) : used !== undefined ? hoursText(used) : T.effortAdd}</span>
            {used !== undefined && <span className="srcs__spot">{T.fromUse}</span>}
            {actual !== undefined && <span className="srcs__spot">{T.actualShort(actual)}</span>}
          </button>
        )}
      </span>
      {after}
      {ask && (
        <span className="srcs__gone people__ask" role="alertdialog" aria-label={ask.text}>
          {ask.text}
          <button type="button" className="audio__undo" autoFocus onClick={() => (onAssign(ask.id), setSay(T.assigned(Ps.personById(ws, ask.id)?.name ?? '')), setAsk(null), back(who.current))}>
            {T.anyway}
          </button>
          <button type="button" className="audio__undo" onClick={() => (setAsk(null), back(who.current))}>
            {T.cancel}
          </button>
        </span>
      )}
      <span className="sr-only" aria-live="polite">
        {say}
      </span>
    </div>
  );
}
