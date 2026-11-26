/**
 * V110 (F-226 G2, F-222 E1-C): Pad im Vollbild für Formulare und Entscheidungen.
 * Dasselbe Bauteil wie im Projekt-Modus (ProjectForms, Decisions – NF-08), nur mit mehr Platz.
 * Kopf wie ein Pad: Reiter Formulare · Entscheidungen, Rad „Projekt“, Vollbild/Fenster, Schließen.
 * Öffnen über `openWorkPad` (Ereignis) – App zeigt das Pad über Desk bzw. Projekt-Modus.
 */
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { Workspace } from '../workspace/types';
import { WORKPAD_TEXT as T } from '../workspace/terms';
import { ProjectForms } from './ProjectForms';
import { Decisions } from './ProjectDecisions';
import { ModeWheel } from './ModeWheel';
import { Icon } from './Icon';
import type { WorkPadOpen, WorkPadTab } from './WorkPadOpen';

export { WORKPAD_EVENT, openWorkPad, WorkPadButton, type WorkPadOpen, type WorkPadTab } from './WorkPadOpen';

const FULL_KEY = 'esource.workpad.full.v1';
function loadFull(): boolean {
  try {
    return localStorage.getItem(FULL_KEY) !== '0';
  } catch {
    return true;
  }
}

const TABS: WorkPadTab[] = ['forms', 'decisions'];

export function WorkPad({ ws, dispatch, say, at, onClose }: { ws: Workspace; dispatch: (a: Action) => void; say: (t: string) => void; at: WorkPadOpen; onClose: () => void }) {
  const projects = ws.projects ?? [];
  const [tab, setTab] = useState<WorkPadTab>(at.tab);
  const [pid, setPid] = useState<string | undefined>(at.project);
  const [full, setFullState] = useState(loadFull);
  const back = useRef<HTMLElement | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const p = projects.find((x) => x.id === pid) ?? projects[0];
  const what = tab === 'forms' ? T.forms : T.decisions;

  // Fokus aufs Pad, beim Schließen zurück an den Auslöser
  useEffect(() => {
    back.current = document.activeElement as HTMLElement | null;
    window.setTimeout(() => tabsRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus(), 0);
    return () => {
      const b = back.current;
      window.setTimeout(() => b?.isConnected && b.focus(), 0);
    };
  }, []);
  // erneut geöffnet (anderes Ziel) – Reiter und Projekt übernehmen
  useEffect(() => {
    setTab(at.tab);
    if (at.project) setPid(at.project);
  }, [at]);

  const setFull = (on: boolean) => {
    setFullState(on);
    try {
      localStorage.setItem(FULL_KEY, on ? '1' : '0');
    } catch {
      /* ohne Speicher: bis zum Neuladen */
    }
    say(on ? T.fullOn.split(' (')[0] : T.fullOff.split(' (')[0]);
  };
  const close = () => (say(T.closed), onClose());
  const pick = (t: WorkPadTab) => (setTab(t), say(t === 'forms' ? T.forms : T.decisions));

  const onKey = (e: KeyboardEvent) => {
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      setFull(!full);
    }
  };
  const onTabKey = (e: KeyboardEvent, i: number) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const n = e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length;
    pick(TABS[n]);
    window.setTimeout(() => tabsRef.current?.querySelectorAll<HTMLElement>('[role="tab"]')[n]?.focus(), 0);
  };

  return (
    <section className={`pad is-top workpad${full ? ' is-full' : ''}`} role="region" aria-label={T.region(what, tab === 'forms' ? p?.name : undefined)} onKeyDown={onKey}>
      <header
        className="pad__head workpad__head"
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !(e.target as HTMLElement).closest('.menu__list, [role="listbox"]')) {
            e.stopPropagation();
            close();
          }
        }}
      >
        <Icon name="pad" size={14} className="icon pad__icon" />
        <div className="pad__tabs" role="tablist" aria-label={T.tabs} ref={tabsRef}>
          {TABS.map((t, i) => (
            <button
              key={t}
              type="button"
              role="tab"
              id={`workpad-tab-${t}`}
              aria-selected={tab === t}
              aria-controls="workpad-panel"
              tabIndex={tab === t ? 0 : -1}
              className={`pad__tab${tab === t ? ' is-on' : ''}`}
              onClick={() => pick(t)}
              onKeyDown={(e) => onTabKey(e, i)}
            >
              <Icon name={t === 'forms' ? 'list' : 'sliders'} size={14} />
              <span className="pad__tabname">{t === 'forms' ? T.forms : T.decisions}</span>
            </button>
          ))}
        </div>
        {tab === 'forms' && projects.length > 1 && p && (
          <span className="layouts__label pj__wheel workpad__wheel">
            <span aria-hidden="true">{T.project}</span>
            <ModeWheel
              label={T.project}
              value={p.id}
              onChange={(id) => (setPid(id), say(`${T.project}: ${projects.find((x) => x.id === id)?.name ?? ''}`))}
              options={projects.map((x) => ({ id: x.id, name: x.name, hint: T.projectHint }))}
            />
          </span>
        )}
        <button type="button" className="pad__close pad__full" aria-pressed={full} onClick={() => setFull(!full)} title={full ? T.fullOff : T.fullOn} aria-label={full ? T.fullOff : T.fullOn}>
          <Icon name={full ? 'minimize' : 'maximize'} size={14} />
        </button>
        <button type="button" className="pad__close" onClick={close} title={T.close} aria-label={T.close}>
          <Icon name="close" size={14} />
        </button>
      </header>
      <div className="pad__body workpad__body" role="tabpanel" id="workpad-panel" aria-labelledby={`workpad-tab-${tab}`}>
        {tab === 'forms' ? (
          p ? (
            <ProjectForms key={p.id} ws={ws} p={p} dispatch={dispatch} say={say} inPad />
          ) : (
            <p className="win__placeholder win__placeholder--small">{T.noProject}</p>
          )
        ) : (
          <Decisions key={`${at.decision ?? ''}-${at.project ?? ''}`} ws={ws} dispatch={dispatch} say={say} open={at.decision ?? null} scope={at.project} inPad />
        )}
      </div>
    </section>
  );
}
