/**
 * F-206 Schritt 10 (V99): Projekt-Modus – Projektliste und Steckbrief nach dem Vorbild der Projektübersicht in
 * MS Project (Windows) und iTaskX (Mac) sowie des Projektsteckbriefs nach IPMA ICB4; Aufbau wie das Cockpit
 * „Personen“ (NF-08 „weitestgehend gleicher Aufbau“): links die Tabelle, rechts die Informationen der gewählten
 * Zeile. Werkzeuge gleich: „+ Projekt“ oben mit „ähnlich: …“, F2 umbenennen, Entf löschen mit Rückfrage und
 * „Rückgängig“ am Ort. Tastatur (NF-03): Pfeile/Pos1/Ende wandern in der Liste, Enter springt in den Steckbrief.
 * Logik in workspace/projects.ts (V98).
 */
import { type CSSProperties, type KeyboardEvent, useEffect, useRef, useState } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { Project, Workspace } from '../workspace/types';
import * as Pj from '../workspace/projects';
import { hoursText } from '../workspace/focusLoad';
import { casesOf } from '../workspace/cases';
import { DIALOG_TEXT, PROJECTS_TEXT as T, TERMS } from '../workspace/terms';
import { noticeLater } from '../workspace/flash';
import { newCountOf } from '../workspace/feedback';
import { requestTour, tourAutoStart } from '../workspace/tour';
import { Icon } from './Icon';
import { ModeWheel } from './ModeWheel';
import { ArrangedWheel } from './ArrangedWheel';
import { ProjectPsp } from './ProjectPsp';
import { ProjectNetwork } from './ProjectNetwork';
import { ProjectResources } from './ProjectResources';
import { ProjectGantt } from './ProjectGantt';
import { ProjectKanban } from './ProjectKanban';
import { ProjectDecisions } from './ProjectDecisions';
import { ProjectFeedback } from './ProjectFeedback';
import { ProjectSteer, STEER_EVENT, takeSteer } from './ProjectSteer';
import { ProjectForms } from './ProjectForms';
import { ProjectCalendar } from './ProjectCalendar';
import { useExchange, type ImportMsg } from './ProjectExchange';
import { EXCHANGE_TEXT as XT } from '../workspace/terms';
import { foreignCount } from '../workspace/foreign';
import { PROJECT_FEEDBACK_TEXT, PSP_TEXT } from '../workspace/terms';
import * as Ps from '../workspace/persons';
import * as Dp from '../workspace/deskProject';
import { DESK_PROJECT_TEXT as DPT } from '../workspace/terms';
import { sampleText, PAPER_TEXT } from '../workspace/terms';
import { ProjectSheet } from './ProjectSheet';
import { SAMPLES, hasSample, sampleOf, type SampleKey } from '../workspace/samples';
import { ACCENTS } from '../workspace/look';
import { DeskProjectBar } from './DeskProject';

const explain = (t: string) => t.split(' = ').slice(1).join(' = ') || t;
/** 2026-12-21 → 21.12.2026 */
const dmy = (day: string) => `${day.slice(8, 10)}.${day.slice(5, 7)}.${day.slice(0, 4)}`;
const euro = (n: number) => `${n.toLocaleString('de-DE', { maximumFractionDigits: 2 })} €`;

/** V100 (J2): Ansicht rechts neben der Projektliste – je Gerät gemerkt; weitere (Gantt …) folgen. */
type ProjectView = 'brief' | 'forms' | 'psp' | 'gantt' | 'net' | 'kanban' | 'res' | 'risks' | 'changes' | 'decide' | 'feedback';
// V120 (F-230 Schritt 5, F-231): Kanban nach dem Netzplan – Ausführung nach der Planung
// V107 (F-225 P8, R1/R3): Risiken und Änderungen nach dem Gantt – Steuerung nach dem Plan
// V109 (F-226, G2): „Formulare“ direkt nach dem Steckbrief – Kapitel nach GPM-Leitfaden
// V115 (Schritt 10): Netzplan nach dem Gantt
const VIEWS: ProjectView[] = ['brief', 'forms', 'psp', 'gantt', 'net', 'kanban', 'res', 'risks', 'changes', 'decide', 'feedback'];
const VIEW_KEY = 'esource.projectView.v1';
function loadView(): ProjectView {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    return VIEWS.includes(v as ProjectView) ? (v as ProjectView) : 'brief';
  } catch {
    return 'brief';
  }
}

/** F-225 (V105, P2): zuletzt gezeigtes Projekt – das Feedback-Fenster meldet im Projekt-Modus dorthin. */
let lastShown: string | undefined;
export const shownProjectId = (): string | undefined => lastShown;

/** V117 (Projekt-Desk): Desk dieses Fensters – zuletzt gezeigtes Projekt (PD9), merken, „Eigener Desk“ (PD2). */
export type ProjectDeskProps = { win: string; shown?: string; onShow: (id: string | undefined) => void; onOwn: (project: string, justMade?: string, sheet?: string, msg?: ImportMsg) => void };

export function ProjectCockpit({ ws, dispatch, say, desk }: { ws: Workspace; dispatch: (a: Action) => void; say: (t: string) => void; desk?: ProjectDeskProps }) {
  const allRows = Pj.projectRows(ws);
  const allList = allRows.map((r) => r.project);
  const [sel, setSelState] = useState<string | null>(desk?.shown ?? allList[0]?.id ?? null);
  // PD9: Wechsel über den Umschalter im Kopf (oder einen Sprung) kommt von außen
  useEffect(() => {
    if (desk?.shown) setSelState(desk.shown);
  }, [desk?.shown]);
  const setSel = (id: string | null) => {
    setSelState(id);
    desk?.onShow(id ?? undefined);
  };
  const shown = allList.find((p) => p.id === sel) ?? allList[0];
  // PD3: auf einem gebundenen Desk steht in der Liste nur das gezeigte Projekt mit seinen Unterprojekten
  const boundId = desk ? Dp.boundProject(ws, desk.win) : undefined;
  const under = (id: string): boolean => id === shown?.id || (!!projectParent(id) && under(projectParent(id)!));
  const projectParent = (id: string) => allList.find((p) => p.id === id)?.parent;
  const rowsAll = boundId && shown ? allRows.filter((r) => under(r.project.id)) : allRows;
  const list = rowsAll.map((r) => r.project);
  lastShown = shown?.id;
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newParent, setNewParent] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [asking, setAsking] = useState(false);
  /** V132 (Enrico): Projekt wählen und wechseln im Feld „Name“ – Liste klappt dort auf. */
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [undo, setUndo] = useState<{ text: string; u: Pj.ProjectUndo } | null>(null);
  const [view, setViewState] = useState<ProjectView>(loadView);
  // V106 (F-225 Rest, F-217): Tour „Projekte“ startet einmal von selbst beim ersten Öffnen des Projekt-Modus
  useEffect(() => {
    if (!tourAutoStart('projects')) return;
    const t = window.setTimeout(() => requestTour('projects', true), 700);
    return () => window.clearTimeout(t);
  }, []);
  // V107 (F-225 P8, R7): „Öffnen“ an der Karte einer Meldung zeigt das Risiko bzw. die Änderung
  const [steerFocus, setSteerFocus] = useState<string | undefined>(undefined);
  useEffect(() => {
    const on = () => {
      const t = takeSteer();
      if (!t) return;
      setSel(t.project);
      setViewState(t.kind === 'risk' ? 'risks' : 'changes');
      setSteerFocus(t.note);
    };
    on();
    window.addEventListener(STEER_EVENT, on);
    return () => window.removeEventListener(STEER_EVENT, on);
  }, []);
  /** V106: neue Meldungen am gezeigten Projekt – Zahl am Rad „Ansicht“ (Eintrag „Meldungen“). */
  const fresh = shown ? newCountOf(ws, shown.id) : 0;
  const setView = (v: ProjectView) => {
    setViewState(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* ohne Speicher: nur bis zum Neuladen */
    }
    say(`${PSP_TEXT.view}: ${PSP_TEXT.views[v]}`);
  };
  const rows = useRef(new Map<string, HTMLButtonElement>());
  const infoRef = useRef<HTMLElement>(null);
  const later = (f: () => void) => window.setTimeout(f, 0);
  const focusRow = (id: string) => later(() => rows.current.get(id)?.focus());
  useEffect(() => {
    if (!picking) return;
    later(() => document.querySelector<HTMLElement>('.pj__pick [aria-selected="true"]')?.focus());
    const away = (e: MouseEvent) => !(e.target as Element)?.closest?.('.pj__namecell') && setPicking(false);
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [picking]);
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
  const full = allList.length >= Pj.PROJECTS_MAX;
  const similar = newName.trim() ? Pj.similarProjects(ws, newName) : [];

  const openAdd = (parent = '') => (setAdding(true), setNewParent(parent), setError(''));
  const addSample = (key: SampleKey) => {
    const sm = sampleOf(key);
    dispatch({ type: 'sampleProject', on: true, key });
    setSel(sm.id);
    tell(sampleText(sm).addedHere);
    focusRow(sm.id);
  };
  const create = () => {
    const name = newName.trim();
    if (!name) return;
    const same = allList.find((p) => p.name.toLocaleLowerCase('de') === name.toLocaleLowerCase('de'));
    if (same) {
      setAdding(false);
      setNewName('');
      setSel(same.id);
      tell(T.exists(same.name));
      return focusRow(same.id);
    }
    const extra = newParent ? { parent: newParent } : {};
    const r = Pj.addProject(ws, name, extra);
    if (!r) return setError(T.full(Pj.PROJECTS_MAX));
    dispatch({ type: 'projectAdd', name, extra });
    setAdding(false);
    setNewName('');
    setSel(r.id);
    tell(T.created(name));
    focusRow(r.id);
  };
  const askRemove = (p: Project) => (setSel(p.id), setAsking(true), setError(''));
  const remove = () => {
    if (!shown) return;
    const r = Pj.removeProject(ws, shown.id);
    setAsking(false);
    if (!r) return;
    dispatch({ type: 'projectRemove', id: shown.id });
    // V117 (PD6): gebundene Desks bleiben und werden gelöst – am Ort gesagt, „Rückgängig“ bindet wieder
    const text = T.removed(shown.name) + DPT.removed(Dp.desksOf(ws, shown.id).length);
    say(`${text} ${T.undo}?`);
    setUndo({ text, u: r.undo });
    const i = allList.findIndex((p) => p.id === shown.id);
    const next = allList.filter((p) => p.id !== shown.id)[Math.max(0, i - 1)];
    setSel(next?.id ?? null);
    later(() => document.getElementById('pj-undo')?.focus());
  };
  const startRename = (p: Project) => (setRenaming(p.id), setDraft(p.name), setError(''));

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
      return later(() => infoRef.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus());
    }
    if (j < 0) return;
    e.preventDefault();
    setSel(list[j].id);
    setAsking(false);
    setError('');
    focusRow(list[j].id);
  };

  const dateCell = (d: string | undefined, derived: boolean) =>
    !d ? <span className="lc__muted">{T.none}</span> : derived ? <span className="pj__derived" title={T.derivedHint}>{dmy(d)}<span className="sr-only"> ({T.derived})</span></span> : dmy(d);

  return (
    <section className={`lc__group pc pj${view === 'psp' ? ' is-psp' : view === 'gantt' || view === 'net' || view === 'res' || view === 'forms' || view === 'decide' || view === 'feedback' || view === 'risks' || view === 'changes' ? ' is-gantt' : ''}`} aria-labelledby="pj-head">
      <header className="lc__head lc__band">
        <Icon name="project" size={15} className="icon icon--inline" />
        <h3 id="pj-head" className="lc__head-title" title={explain(TERMS.projects)}>
          {T.head}
        </h3>
        <span className="lc__head-tools">
          <button type="button" className="help__run pj__tour" title={T.tourHint} aria-label={T.tourHint} onClick={() => requestTour('projects')}>
            <Icon name="tour" size={13} className="icon icon--inline" /> {T.tour}
          </button>
          {/* V132: Beispielprojekt aus Enricos ICB4-Report sichtbar in der Projektliste (vorher nur im ⚙); V134 (F-233): je Beispiel ein Knopf */}
          {SAMPLES.filter((sm) => !hasSample(ws, sm.key)).map((sm) => (
            <button key={sm.key} type="button" className="help__run pj__sample" title={sampleText(sm).hint} onClick={() => addSample(sm.key)}>
              <Icon name="project" size={13} className="icon icon--inline" /> {sampleText(sm).short}
            </button>
          ))}
          <button type="button" id="pj-add" className="help__run" aria-expanded={adding} disabled={full} title={full ? T.full(Pj.PROJECTS_MAX) : T.addHint} onClick={() => (adding ? setAdding(false) : openAdd())}>
            <Icon name="plus" size={13} className="icon icon--inline" /> {T.add}
          </button>
        </span>
      </header>
      {boundId && desk && shown ? (
        <DeskProjectBar ws={ws} win={desk.win} shown={shown.id} onShow={(id) => setSel(id)} dispatch={dispatch} say={say} />
      ) : (
        <p className="help__text bt__intro">{TERMS.projects.replace(' = ', ': ')}</p>
      )}

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
            later(() => document.getElementById('pj-add')?.focus());
          }}
        >
          <label className="layouts__label">
            {T.name}
            <input autoFocus value={newName} maxLength={60} aria-describedby="pj-similar" onChange={(e) => (setNewName(e.target.value), setError(''))} />
          </label>
          {allList.length > 0 && (
            <label className="layouts__label">
              {T.parent}
              <select value={newParent} onChange={(e) => setNewParent(e.target.value)}>
                <option value="">{T.parentNone}</option>
                {allRows.map((r) => (
                  <option key={r.project.id} value={r.project.id}>{`${'  '.repeat(r.depth)}${r.project.name}`}</option>
                ))}
              </select>
            </label>
          )}
          <div className="layouts__tools">
            <button type="button" className="help__run" onClick={() => (setAdding(false), later(() => document.getElementById('pj-add')?.focus()))}>{DIALOG_TEXT.cancel}</button>
            <button type="submit" className="help__run lc__primary" disabled={!newName.trim()}>
              <Icon name="plus" size={13} className="icon icon--inline" /> {T.create}
            </button>
          </div>
          <span id="pj-similar" className="bt__hint" aria-live="polite">{similar.length ? T.similar(similar.map((p) => p.name).join(', ')) : ''}</span>
          {error && <p className="layouts__error" role="alert">{error}</p>}
        </form>
      )}

      {!shown ? (
        <div className="pj__empty">
          <p className="lc__muted">{T.empty}</p>
          {SAMPLES.some((sm) => !hasSample(ws, sm.key)) && (
            <p className="pj__samples">
              {SAMPLES.filter((sm) => !hasSample(ws, sm.key)).map((sm) => (
                <button key={sm.key} type="button" className="help__run lc__primary" title={sampleText(sm).hint} onClick={() => addSample(sm.key)}>
                  <Icon name="project" size={13} className="icon icon--inline" /> {sampleText(sm).add}
                </button>
              ))}
            </p>
          )}
          {undo && <UndoLine undo={undo} dispatch={dispatch} say={say} onBack={(id) => (setSel(id), setUndo(null), focusRow(id))} />}
        </div>
      ) : (
        <div className="pc__body">
          <div className="pc__tablewrap">
            <table className="pc__table pj__table" aria-labelledby="pj-head" aria-describedby="pj-keys">
              <thead>
                <tr>
                  <th scope="col">{T.colName}</th>
                  <th scope="col" title={explain(TERMS.projectState)}>{T.colState}</th>
                  <th scope="col">{T.colStart}</th>
                  <th scope="col">{T.colEnd}</th>
                  <th scope="col">{T.colProgress}</th>
                  <th scope="col" title={explain(TERMS.projectTask)}>{T.colTasks}</th>
                  <th scope="col">{T.colEffort}</th>
                  <th scope="col">{T.colMiles}</th>
                  <th scope="col">{T.colLate}</th>
                </tr>
              </thead>
              <tbody>
                {rowsAll.map((r, i) => {
                  const p = r.project;
                  const on = p.id === shown.id;
                  // V132 (Enrico): nur das gewählte Projekt als Zeile; die anderen wählt man im Feld „Name“
                  if (!on) return null;
                  return (
                    <tr key={p.id} className={`${on ? 'is-sel' : ''}${p.state === 'done' || p.state === 'stopped' ? ' is-closed' : ''}`}>
                      <th scope="row" style={{ '--depth': r.depth } as CSSProperties} className="pj__namecell">
                        {/* V134 (Enrico 11:46/11:48): Projekt wählen mit dem Umschalt-Rad ganz vorn in der Zelle (springt nicht mit der Namenslänge; statt „n Projekte ▾“) */}
                        {on && (
                          <span className="pj__namewheel" onClick={(e) => e.stopPropagation()}>
                            {list.length > 1 && (
                              <span className="layouts__label pj__wheel">
                                <span aria-hidden="true">Projekt</span>
                                <ModeWheel label={T.namePickLabel} value={p.id} options={list.map((x) => ({ id: x.id, name: x.name }))} onChange={(id) => (setSel(id), setPicking(false), say(T.namePicked(list.find((x) => x.id === id)?.name ?? '')))} />
                              </span>
                            )}
                            {/* V134 (Enrico 11:48): Rad „Ansicht“ direkt neben dem Projekt-Rad */}
                            <span className="layouts__label pj__wheel pj__viewwheel">
            <span aria-hidden="true">{PSP_TEXT.view}</span>
            <ArrangedWheel wheel="projectView" label={PSP_TEXT.viewLabel} value={view} onChange={(v) => setView(v as ProjectView)} options={VIEWS.map((v) => (v === 'feedback' && fresh > 0 ? { id: v, name: PROJECT_FEEDBACK_TEXT.viewFresh(PSP_TEXT.views[v], fresh), hint: `${PSP_TEXT.viewHint[v]} – ${PROJECT_FEEDBACK_TEXT.freshHint(fresh)}` } : { id: v, name: PSP_TEXT.views[v], hint: PSP_TEXT.viewHint[v] }))} />
          </span>
                          </span>
                        )}
                        {renaming === p.id ? (
                          <form
                            className="pc__rename"
                            onSubmit={(e) => {
                              e.preventDefault();
                              if (draft.trim()) dispatch({ type: 'projectEdit', id: p.id, patch: { name: draft } });
                              setRenaming(null);
                              focusRow(p.id);
                            }}
                          >
                            <input
                              autoFocus
                              aria-label={`${T.name}: ${p.name}`}
                              value={draft}
                              maxLength={60}
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
                            aria-level={r.depth + 1}
                            tabIndex={on ? 0 : -1}
                            title={`${T.namePickHint} · ${T.rowKeys}`}
                            aria-haspopup="listbox"
                            aria-expanded={picking}
                            onClick={() => (setPicking(!picking), setAsking(false), setError(''))}
                            onDoubleClick={() => later(() => infoRef.current?.querySelector<HTMLElement>('input, select, textarea')?.focus())}
                            onKeyDown={(e) => onRowKey(e, i)}
                          >
                            {r.depth > 0 && <span className="pj__branch" aria-hidden="true">└</span>}
                            <span>{p.name}</span>
                            {p.priority !== undefined && p.priority <= 2 && <span className="pj__prio" title={`${T.priority}: ${T.priorityName(p.priority)}`}>P{p.priority}</span>}
                          </button>
                        )}
                        {picking && (
                          <ul className="pj__pick" role="listbox" aria-label={T.namePickLabel}>
                            {rowsAll.map((x) => (
                              <li key={x.project.id} role="none">
                                <button
                                  type="button"
                                  role="option"
                                  aria-selected={x.project.id === shown.id}
                                  data-pick={x.project.id}
                                  className="pj__pickopt"
                                  style={{ '--depth': x.depth } as CSSProperties}
                                  onClick={() => (setSel(x.project.id), setPicking(false), say(T.namePicked(x.project.name)), focusRow(x.project.id))}
                                  onKeyDown={(e) => {
                                    const all = [...(e.currentTarget.closest('ul')?.querySelectorAll<HTMLElement>('[data-pick]') ?? [])];
                                    const k = all.indexOf(e.currentTarget);
                                    const to = e.key === 'ArrowDown' ? all[k + 1] : e.key === 'ArrowUp' ? all[k - 1] : e.key === 'Home' ? all[0] : e.key === 'End' ? all[all.length - 1] : undefined;
                                    if (to) return e.preventDefault(), to.focus();
                                    if (e.key === 'Escape' || e.key === 'Tab') {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setPicking(false);
                                      focusRow(shown.id);
                                    }
                                  }}
                                >
                                  {x.depth > 0 && <span className="pj__branch" aria-hidden="true">└</span>}
                                  <span>{x.project.name}</span>
                                  <span className={`pj__state is-${x.project.state ?? 'idea'}`}>{T.state[x.project.state ?? 'idea']}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </th>
                      <td><span className={`pj__state is-${p.state ?? 'idea'}`} title={T.stateHint[p.state ?? 'idea']}>{T.state[p.state ?? 'idea']}</span></td>
                      <td className="pc__num">{dateCell(r.start, r.derived.start)}</td>
                      <td className="pc__num">{dateCell(r.end, r.derived.end)}</td>
                      <td className="pc__num" aria-label={T.progressLabel(r.progress)}>
                        <span className="pc__bar" aria-hidden="true" style={{ '--f': `${r.progress}%` } as CSSProperties} />
                        {r.progress} %
                      </td>
                      <td className="pc__num" aria-label={T.tasksLabel(r.done, r.tasks)}>{r.tasks ? T.tasks(r.done, r.tasks) : <span className="lc__muted">{T.none}</span>}</td>
                      <td className="pc__num">{r.effort ? hoursText(r.effort) : <span className="lc__muted">{T.none}</span>}</td>
                      <td className="pc__num">{r.milestones || <span className="lc__muted">{T.none}</span>}</td>
                      <td className={`pc__num${r.late ? ' pj__late' : ''}`} aria-label={r.late ? T.lateLabel(r.late) : undefined}>{r.late || <span className="lc__muted">{T.none}</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p id="pj-keys" className="lc__keys">{T.rowKeys}</p>
            {asking && (
              <div className="layouts__ask" role="group" aria-labelledby="pj-ask">
                <span id="pj-ask">{T.askRemove(shown.name, Pj.notesOfProject(ws, shown.id).length, allList.filter((p) => p.parent === shown.id).length)}</span>
                <button type="button" className="help__run" autoFocus onClick={remove}>{T.remove}</button>
                <button type="button" className="help__run" onClick={() => (setAsking(false), focusRow(shown.id))}>{DIALOG_TEXT.cancel}</button>
              </div>
            )}
            {undo && <UndoLine undo={undo} dispatch={dispatch} say={say} onBack={(id) => (setSel(id), setUndo(null), focusRow(id))} />}
            {note && <p className="layouts__undo" role="status">{note}</p>}
            {error && !adding && <p className="layouts__error" role="alert">{error}</p>}
          </div>

          {view === 'risks' || view === 'changes' ? (
            <ProjectSteer key={`${shown.id}-${view}`} ws={ws} p={shown} kind={view === 'risks' ? 'risk' : 'change'} dispatch={dispatch} say={say} focus={steerFocus} />
          ) : view === 'forms' ? (
            <ProjectForms key={shown.id} ws={ws} p={shown} dispatch={dispatch} say={say} />
          ) : view === 'feedback' ? (
            <ProjectFeedback key={shown.id} ws={ws} p={shown} dispatch={dispatch} say={say} />
          ) : view === 'decide' ? (
            <ProjectDecisions key={shown.id} ws={ws} p={shown} dispatch={dispatch} say={say} />
          ) : view === 'net' ? (
            <ProjectNetwork key={shown.id} ws={ws} p={shown} dispatch={dispatch} say={say} />
          ) : view === 'kanban' ? (
            <ProjectKanban key={shown.id} ws={ws} p={shown} dispatch={dispatch} say={say} desk={desk?.win ?? ''} />
          ) : view === 'res' ? (
            <ProjectResources key={shown.id} ws={ws} p={shown} />
          ) : view === 'gantt' ? (
            <ProjectGantt key={shown.id} ws={ws} p={shown} dispatch={dispatch} say={say} onPickProject={(id) => (setSel(id), setViewState('brief'), focusRow(id))} />
          ) : view === 'psp' ? (
            <ProjectPsp key={shown.id} ws={ws} p={shown} dispatch={dispatch} say={say} onPickProject={(id) => (setSel(id), setViewState('brief'), focusRow(id))} />
          ) : (
          <ProjectBrief key={shown.id} ws={ws} p={shown} row={rowsAll.find((r) => r.project.id === shown.id)!} dispatch={dispatch} say={say} boxRef={infoRef} onRename={() => startRename(shown)} onRemove={() => askRemove(shown)} onOwnDesk={desk ? () => desk.onOwn(shown.id) : undefined} onImported={(pid, name, sheet, m) => (setSel(pid), desk?.onOwn(pid, name, sheet, m))} />
          )}
        </div>
      )}
    </section>
  );
}

function UndoLine({ undo, dispatch, say, onBack }: { undo: { text: string; u: Pj.ProjectUndo }; dispatch: (a: Action) => void; say: (t: string) => void; onBack: (id: string) => void }) {
  return (
    <p className="layouts__undo" role="status">
      {undo.text}{' '}
      <button
        type="button"
        id="pj-undo"
        className="help__run"
        onClick={() => {
          dispatch({ type: 'projectRestore', undo: undo.u });
          say(T.restored(undo.u.project.name));
          onBack(undo.u.project.id);
        }}
      >
        {T.undo}
      </button>
    </p>
  );
}

type Patch = Partial<Omit<Project, 'id' | 'created' | 'changed'>>;

/** Steckbrief der gewählten Zeile (MS Project: „Projektinfo“, ICB4: Projektsteckbrief). */
function ProjectBrief({ ws, p, row, dispatch, say, boxRef, onRename, onRemove, onOwnDesk, onImported }: { ws: Workspace; p: Project; row: Pj.ProjectRow; dispatch: (a: Action) => void; say: (t: string) => void; boxRef: React.RefObject<HTMLElement>; onRename: () => void; onRemove: () => void; onOwnDesk?: () => void; onImported?: (pid: string, name: string, sheet?: string, msg?: ImportMsg) => void }) {
  // V118 (F-230, F10): Export/Import am Ort, Meldung unter den Knöpfen mit Rückgängig
  const [xMsg, setXMsg] = useState<{ text: string; undo?: () => void } | null>(null);
  const xTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(xTimer.current), []);
  const xTell = (text: string, undo?: () => void) => {
    window.clearTimeout(xTimer.current);
    setXMsg({ text, undo });
    say(text);
    xTimer.current = noticeLater(() => setXMsg(null), undo ? 3 : 2);
  };
  const xc = useExchange(ws, dispatch, xTell, onImported);
  const kept = foreignCount(p.foreign) + Pj.tasksOfProject(ws, p.id).reduce((n, t) => n + foreignCount(t.foreign), 0);
  const edit = (patch: Patch, text: string = T.saved) => {
    dispatch({ type: 'projectEdit', id: p.id, patch });
    say(text);
  };
  const [limit, setLimit] = useState(p.taskLimit !== undefined ? String(p.taskLimit) : '');
  const [brief, setBrief] = useState({ goal: p.brief?.goal ?? '', approach: p.brief?.approach ?? '', org: p.brief?.org ?? '' });
  const state = p.state ?? 'idea';
  const clash = Pj.datesClash(p);
  const gaps = Pj.briefGaps(p);
  const cases = casesOf(ws);
  // Übergeordnetes Projekt: nur solche, die keinen Kreis ergeben
  const parents = Pj.projectRows(ws).filter((r) => r.project.id !== p.id && !Pj.parentLoops(ws, p.id, r.project.id));
  const derivedNow = (row.derived.start || row.derived.end) && (!p.start || !p.end);
  const saveBrief = (k: 'goal' | 'approach' | 'org') => {
    const v = brief[k].trim();
    if (v !== (p.brief?.[k] ?? '')) edit({ brief: { [k]: v } }, `${T[k]}: ${T.saved}`);
  };

  return (
    <section ref={boxRef} className="pc__info pj__info" aria-labelledby="pj-info-head">
      <h4 id="pj-info-head" className="radar__detail-head" title={explain(TERMS.projectBrief)}>
        <Icon name="project" size={16} className="icon icon--inline" /> {T.info(p.name)}
      </h4>
      <div className="pc__tools">
        <button type="button" className="help__run" title="F2" onClick={onRename}>
          <Icon name="rename" size={13} className="icon icon--inline" /> {T.rename}
        </button>
        <button type="button" className="help__run" title="Entf" onClick={onRemove}>
          <Icon name="remove" size={13} className="icon icon--inline" /> {T.remove}
        </button>
        {/* V117 (PD2): Eigener Desk für dieses Projekt */}
        {onOwnDesk && (
          <button type="button" className="help__run pj__owndesk" title={DPT.ownHint(p.name)} onClick={onOwnDesk}>
            <Icon name="desk" size={13} className="icon icon--inline" /> {DPT.own}
          </button>
        )}
        {Dp.desksOf(ws, p.id).length > 0 && <span className="lc__muted pj__desks">{DPT.ownList(Dp.desksOf(ws, p.id).length)}</span>}
        <button type="button" className="help__run pj__xchg" title={XT.exportHint} onClick={() => xc.exportProject(p.id)}>
          <Icon name="download" size={13} className="icon icon--inline" /> {XT.export}
        </button>
        <button type="button" className="help__run" title={XT.importHint} onClick={xc.pickImport}>
          <Icon name="upload" size={13} className="icon icon--inline" /> {XT.import}
        </button>
      </div>
      {xc.node}
      {xMsg && (
        <p className="layouts__undo" role="status">
          {xMsg.text}
          {xMsg.undo && (
            <button type="button" className="help__run" onClick={() => (xMsg.undo!(), setXMsg(null), say(DPT.undone))}>
              {DPT.undo}
            </button>
          )}
        </p>
      )}
      {kept > 0 && <p className="lc__muted pj__kept">{XT.kept(kept, p.foreign?.from?.kind === 'trello' ? 'Trello' : 'MS Project/iTaskX')}</p>}
      <p className={`pj__gaps${gaps.length ? '' : ' is-ok'}`} role="note">
        {gaps.length ? T.gaps(gaps.map((g) => T.gapName[g]).join(', ')) : T.complete}
      </p>

      <p className="pc__load pj__stand">
          <b>{PAPER_TEXT.stand}:</b>{' '}
          {T.figuresLine(row.done, row.tasks, row.progress, hoursText(row.effort), row.milestones)}
          {row.late > 0 && <b className="pj__late"> · {T.lateLabel(row.late)}</b>}
          {p.budget !== undefined && <> · {T.budget.replace(' (Euro)', '')}: {euro(p.budget)}</>}
        </p>
      {/* V132 (F-232 P4): alles, was nicht im Report steht, in der zuklappbaren Leiste „Verwaltung“ */}
      <details className="pj__admin">
        <summary title={PAPER_TEXT.adminHint}>{PAPER_TEXT.admin}</summary>
      <fieldset className="pc__set">
        <legend>{T.general}</legend>
        <div className="layouts__label pj__wheel" title={explain(TERMS.projectState)}>
          <span aria-hidden="true">{T.stateLabel}</span>
          <ModeWheel
            label={T.stateLabel}
            value={state}
            onChange={(s) => edit({ state: s as Pj.ProjectState }, `${T.stateLabel}: ${T.state[s as Pj.ProjectState]}`)}
            options={Pj.PROJECT_STATES.map((s) => ({ id: s, name: T.state[s], hint: T.stateHint[s] }))}
          />
        </div>
        <label className="layouts__label">
          {T.priority}
          <select value={p.priority ?? ''} onChange={(e) => edit({ priority: e.target.value ? Number(e.target.value) : undefined })}>
            <option value="">{T.priorityNone}</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{T.priorityName(n)}</option>
            ))}
          </select>
        </label>
        <label className="layouts__label" title={explain(TERMS.projectScope)}>
          {T.scope}
          <select value={p.scope ?? ''} onChange={(e) => edit({ scope: e.target.value || undefined })}>
            <option value="">{T.scopeNone}</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="layouts__label">
          {T.parent}
          <select value={p.parent ?? ''} onChange={(e) => edit({ parent: e.target.value || undefined })}>
            <option value="">{T.parentNone}</option>
            {parents.map((r) => (
              <option key={r.project.id} value={r.project.id}>{`${'  '.repeat(r.depth)}${r.project.name}`}</option>
            ))}
          </select>
        </label>
        {/* V116 (Schritt 10, J9): Task-Limit je Projekt – am Ort nachfragen, nicht sperren (P17) */}
        <label className="layouts__label" title={T.taskLimitHint}>
          {T.taskLimit}
          <input
            inputMode="numeric"
            value={limit}
            placeholder={T.taskLimitNone}
            size={4}
            onChange={(e) => setLimit(e.target.value.replace(/\D/g, '').slice(0, 2))}
            onBlur={() => {
              const x = limit ? Number(limit) : undefined;
              const v = x && x >= 1 ? x : undefined;
              if (v !== p.taskLimit) edit({ taskLimit: v }, `${T.taskLimit}: ${v ?? T.taskLimitNone}`);
              setLimit(v === undefined ? '' : String(v));
            }}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
        </label>
        {/* V117 (PD3): Farbe des Projekts – gebundene Desks nehmen sie als Akzentfarbe (Umschalt-Rad wie die Akzentfarbe) */}
        <div className="layouts__label pj__wheel" title={DPT.colorHint}>
          <span aria-hidden="true">{DPT.colorLabel}</span>
          <ModeWheel
            label={DPT.colorLabel}
            value={p.accent ?? ''}
            onChange={(c) => edit({ accent: c || undefined }, `${DPT.colorLabel}: ${ACCENTS.find((x) => x.hex === c)?.name ?? DPT.colorNone}`)}
            options={[
              { id: '', name: DPT.colorNone, hint: DPT.colorHint },
              ...ACCENTS.filter((x) => !x.theme).map((x) => ({ id: x.hex, name: x.name, glyph: <span className="desk-swatch" aria-hidden="true" style={{ '--swatch': x.hex } as CSSProperties} />, hint: DPT.colorHint })),
            ]}
          />
        </div>
      </fieldset>

      {clash && <p id="pj-clash" className="layouts__error" role="alert">{T.clash}</p>}
        {derivedNow && (
          <p className="pj__derived-line" title={explain(TERMS.projectDerived)}>
            {T.derivedFrom(row.start ? dmy(row.start) : undefined, row.end ? dmy(row.end) : undefined)}{' '}
            <button
              type="button"
              className="help__run"
              title={T.takeDerivedHint}
              onClick={() => edit({ ...(p.start ? {} : row.start ? { start: row.start } : {}), ...(p.end ? {} : row.end ? { end: row.end } : {}) })}
            >
              {T.takeDerived}
            </button>
          </p>
        )}
      <ProjectCalendar ws={ws} pid={p.id} dispatch={dispatch} />
      <fieldset className="pc__set pj__brief" title={explain(TERMS.projectBrief)}>
        <legend>{T.brief}</legend>
        {(['approach', 'org'] as const).map((k) => (
          <label key={k} className="layouts__label pj__text">
            {T[k]}
            <textarea
              rows={2}
              value={brief[k]}
              maxLength={800}
              placeholder={T[`${k}Hint` as 'goalHint']}
              onChange={(e) => setBrief({ ...brief, [k]: e.target.value })}
              onBlur={() => saveBrief(k)}
              onKeyDown={(e) => e.key === 'Enter' && (e.metaKey || e.ctrlKey) && (e.target as HTMLTextAreaElement).blur()}
            />
          </label>
        ))}
      </fieldset>
      <ProjectRoles ws={ws} p={p} dispatch={dispatch} say={say} />
      </details>
      {/* V132 (F-232): Steckbrief als Blatt wie Abbildung 3 im Report */}
      <ProjectSheet ws={ws} p={p} dispatch={dispatch} say={say} />
    </section>
  );
}

/** F-225 (V105, P3): Instanzen der Projektorganisation (ICB4 Governance) – Empfänger von Projektmeldungen. */
function ProjectRoles({ ws, p, dispatch, say }: { ws: Workspace; p: Project; dispatch: (a: Action) => void; say: (t: string) => void }) {
  const R = PROJECT_FEEDBACK_TEXT;
  const roles = Pj.rolesOf(p);
  const people = Ps.personList(ws);
  const [add, setAdd] = useState('');
  const [msg, setMsg] = useState('');
  const apply = (op: Parameters<typeof Pj.editRoles>[2], text: string) => {
    const next = Pj.projectById(Pj.editRoles(ws, p.id, op), p.id);
    if (!next || next.roles === undefined || JSON.stringify(next.roles) === JSON.stringify(Pj.rolesOf(p))) return;
    dispatch({ type: 'projectEdit', id: p.id, patch: { roles: next.roles } });
    setMsg(text);
    say(text);
  };
  return (
    <fieldset className="pc__set pj__roles" title={R.rolesHint}>
      <legend>{R.roles}</legend>
      <p className="lc__muted pj__rolesIntro">{R.rolesHint}</p>
      <ul className="pc__list pj__roleList">
        {roles.map((r) => (
          <li key={r.id} className="pj__role">
            <input type="text" defaultValue={r.name} maxLength={60} aria-label={R.roleName(r.name)} onBlur={(e) => e.target.value.trim() !== r.name && apply({ kind: 'name', role: r.id, name: e.target.value }, R.renamed(e.target.value.trim()))} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
            <select value={r.person ?? ''} aria-label={R.rolePerson(r.name)} onChange={(e) => apply({ kind: 'person', role: r.id, person: e.target.value || undefined }, R.assigned(r.name, people.find((x) => x.id === e.target.value)?.name))}>
              <option value="">{R.nobody}</option>
              {people.map((x) => (
                <option key={x.id} value={x.id}>{x.name}</option>
              ))}
            </select>
            {roles.length > 1 && (
              <button type="button" className="help__run pc__x" aria-label={R.roleRemove(r.name)} title={R.roleRemove(r.name)} onClick={() => apply({ kind: 'remove', role: r.id }, R.removed(r.name))}>
                <Icon name="close" size={11} />
              </button>
            )}
          </li>
        ))}
      </ul>
      {roles.length < Pj.ROLES_MAX && (
        <form className="pc__row" onSubmit={(e) => (e.preventDefault(), add.trim() && (apply({ kind: 'add', name: add, rid: `r-${Date.now().toString(36)}` }, R.added(add.trim())), setAdd('')))}>
          <input type="text" value={add} maxLength={60} placeholder={R.addPh} aria-label={R.addPh} onChange={(e) => setAdd(e.target.value)} />
          <button type="submit" className="help__run">{R.add}</button>
        </form>
      )}
      {msg && <p className="layouts__undo" role="status">{msg}</p>}
    </fieldset>
  );
}
