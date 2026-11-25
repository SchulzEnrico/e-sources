/**
 * F-206 Schritt 10 (V99): Projekt einer Notiz – Chip in der Zeile „Zuständig · Aufwand · Projekt“ und Auswahl
 * (wie die Personenauswahl: suchen, „+ ‚Name‘ als Projekt anlegen“ mit „ähnlich: …“, „kein Projekt“).
 * Eine Notiz mit Projekt ist ein Vorgang des Projekts (MS Project/iTaskX). Wirkt sofort (wie Quellen),
 * nicht Teil des Entwurfs. Tastatur: Pfeile, Enter, Esc; Meldung am Ort.
 */
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import type { Note, Project, Workspace } from '../workspace/types';
import type { Action } from '../workspace/useWorkspace';
import * as Pj from '../workspace/projects';
import { PROJECTS_TEXT as T } from '../workspace/terms';
import { Icon } from './Icon';

type Opt = { kind: 'project'; p: Project; depth: number } | { kind: 'none' } | { kind: 'new'; name: string };

function ProjectPicker({ ws, current, onPick, onCreate, onClose }: { ws: Workspace; current?: string; onPick: (id: string | undefined) => void; onCreate: (name: string) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [at, setAt] = useState(0);
  const lid = useId();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const out = (e: PointerEvent) => !box.current?.contains(e.target as Node) && onClose();
    window.addEventListener('pointerdown', out, true);
    return () => window.removeEventListener('pointerdown', out, true);
  }, [onClose]);
  const name = q.replace(/\s+/g, ' ').trim();
  const fold = (s: string) => s.toLocaleLowerCase('de');
  const found = Pj.projectRows(ws).filter((r) => !name || fold(r.project.name).includes(fold(name)));
  const exact = Pj.projectsOf(ws).some((p) => fold(p.name) === fold(name));
  const like = name && !exact ? Pj.similarProjects(ws, name) : [];
  const opts: Opt[] = [
    ...(!name && current ? [{ kind: 'none' } as Opt] : []),
    ...found.map((r) => ({ kind: 'project', p: r.project, depth: name ? 0 : r.depth }) as Opt),
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
    <div ref={box} className="srcpick ppick" role="dialog" aria-label={T.pick}>
      <input
        className="srcpick__in"
        role="combobox"
        aria-expanded="true"
        aria-controls={`${lid}-list`}
        aria-activedescendant={opts.length ? `${lid}-${sel}` : undefined}
        aria-label={`${T.pick}. ${T.pickHint}`}
        placeholder={T.pickPh}
        value={q}
        autoFocus
        onChange={(e) => (setQ(e.target.value), setAt(0))}
        onKeyDown={onKey}
      />
      <ul id={`${lid}-list`} className="srcpick__list" role="listbox" aria-label={T.pick}>
        {opts.map((o, i) => {
          const on = i === sel;
          const common = { id: `${lid}-${i}`, role: 'option', 'aria-selected': on, className: `srcpick__opt${on ? ' is-on' : ''}`, onPointerEnter: () => setAt(i), onClick: () => choose(o) } as const;
          if (o.kind === 'none') return <li key="none" {...common}><span className="ppick__plus" aria-hidden="true">–</span> {T.pickNone}</li>;
          if (o.kind === 'new')
            return (
              <li key="new" {...common}>
                <span className="ppick__plus" aria-hidden="true">+</span> {T.pickCreate(o.name)}
                {like.length > 0 && <span className="srcpick__where">{T.similar(like.map((p) => p.name).join(', '))}</span>}
              </li>
            );
          return (
            <li key={o.p.id} {...common} style={{ paddingLeft: 8 + o.depth * 14 }}>
              <Icon name="project" size={13} className="icon icon--inline" />
              <span className="srcpick__title">{o.p.name}</span>
              <span className="srcpick__where">{T.state[o.p.state ?? 'idea']}</span>
              {o.p.id === current && <span className="srcpick__where">· {T.current}</span>}
            </li>
          );
        })}
      </ul>
      <p className="srcpick__hint">{T.pickHint}</p>
    </div>
  );
}

/** Chip „Projekt“ in der Notiz (dritter Eintrag der Zeile „Zuständig · Aufwand“). */
export function ProjectChip({ ws, note, dispatch }: { ws: Workspace; note?: Note; dispatch: (a: Action) => void }) {
  const [pick, setPick] = useState(false);
  const [said, setSaid] = useState('');
  const btn = useRef<HTMLButtonElement>(null);
  if (!note) return null;
  const project = Pj.projectById(ws, note.project);
  const back = () => window.setTimeout(() => btn.current?.focus({ preventScroll: true }), 0);
  const take = (id: string | undefined) => {
    setPick(false);
    if (id !== note.project) dispatch({ type: 'noteProject', id: note.id, project: id });
    setSaid(id ? T.assigned(Pj.projectById(ws, id)?.name ?? '') : T.unassigned);
    back();
  };
  const create = (name: string) => {
    const r = Pj.addProject(ws, name);
    if (!r) return;
    dispatch({ type: 'projectAdd', name });
    dispatch({ type: 'noteProject', id: note.id, project: r.id });
    setPick(false);
    setSaid(`${T.created(name)} ${T.assigned(name)}`);
    back();
  };
  return (
    <span className="people__item">
      <button
        ref={btn}
        type="button"
        className={`srcs__chip people__proj${project ? '' : ' is-empty'}`}
        aria-haspopup="listbox"
        aria-expanded={pick}
        aria-label={T.chipLabel(project?.name)}
        title={T.chipTitle}
        onClick={() => setPick((x) => !x)}
      >
        <Icon name="project" size={12} className="icon icon--inline" />
        <span className="srcs__title">{project ? project.name : T.chipNone}</span>
      </button>
      {pick && <ProjectPicker ws={ws} current={note.project} onPick={take} onCreate={create} onClose={() => (setPick(false), back())} />}
      <span className="sr-only" role="status">{said}</span>
    </span>
  );
}
