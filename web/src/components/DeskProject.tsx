/**
 * V117 (F-206 Schritt 10, Projekt-Desk, entschieden V116 – PD1–PD10):
 * - `DeskProjectMenu`: ⋮ neben dem Desk-Namen – „An Projekt binden …“, Bindung lösen, „Neue Notizen zuordnen“ (PD4),
 *   „Alles zeigen“ (PD5), „Im Projekt-Modus zeigen“. Meldung am Ort mit Rückgängig.
 * - `DeskProjectBar`: Pflicht-Umschalter im Kopf des Projekt-Modus auf einem gebundenen Desk (PD3) mit
 *   „Zurück zu …“ und „An dieses Projekt binden“; Meldung am Ort.
 * - `ScopeNote`: „Nur „X“ · Alles zeigen“ in Suche, Library-Notizen und Fokus (PD5).
 * Logik in workspace/deskProject.ts.
 */
import { useExchange } from './ProjectExchange';
import { EXCHANGE_TEXT as XT } from '../workspace/terms';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import type { Workspace } from '../workspace/types';
import type { Action } from '../workspace/useWorkspace';
import * as Dp from '../workspace/deskProject';
import { projectById, projectsOf } from '../workspace/projects';
import { DESK_PROJECT_TEXT as T } from '../workspace/terms';
import { noticeLater } from '../workspace/flash';
import { Item, Menu, MenuHead, MenuPages } from './PanelFrame';
import { Icon } from './Icon';
import { ModeWheel } from './ModeWheel';

type Msg = { text: string; undo?: () => void } | null;

/** Meldung am Ort (Regel Enrico V113: „#perfekte Fokussierung“), verschwindet von selbst. */
function useMsg(): [Msg, (text: string, undo?: () => void) => void, () => void] {
  const [msg, setMsg] = useState<Msg>(null);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const say = (text: string, undo?: () => void) => {
    window.clearTimeout(timer.current);
    setMsg({ text, undo });
    timer.current = noticeLater(() => setMsg(null), undo ? 3 : 2);
  };
  return [msg, say, () => setMsg(null)];
}

function MsgLine({ msg, onUndo }: { msg: Msg; onUndo: () => void }) {
  if (!msg) return null;
  return (
    <span className="dpj__msg" role="status">
      {msg.text}
      {msg.undo && (
        <button type="button" className="help__run" onClick={onUndo}>
          {T.undo}
        </button>
      )}
    </span>
  );
}

export function DeskProjectMenu(p: { ws: Workspace; win: string; deskName: string; dispatch: (a: Action) => void; onOpen: () => void; say: (t: string) => void; onOwn?: (project: string, justMade?: string, sheet?: string) => void }) {
  const { ws, win, dispatch } = p;
  const b = Dp.bindingOf(ws, win);
  const bound = b ? projectById(ws, b.project) : undefined;
  const list = projectsOf(ws);
  const scope = Dp.deskScope();
  const [msg, show, clear] = useMsg();
  const tell = (text: string, undo?: () => void) => (show(text, undo), p.say(text));
  const undo = () => {
    msg?.undo?.();
    clear();
    tell(T.undone);
  };
  // V118 (F-230, F10): Export/Import am Desk – Meldung und Rückfrage hier am ⋮
  const xc = useExchange(ws, dispatch, tell, (pid, name, sheet) => (p.onOwn ? p.onOwn(pid, name, sheet) : undefined));
  const bind = (pid: string) => {
    const before = ws.deskProjects?.[win]?.project;
    dispatch({ type: 'deskBind', win, project: pid });
    tell(T.bound(projectById(ws, pid)?.name ?? ''), () => dispatch({ type: 'deskBind', win, project: before }));
  };
  return (
    <span className="dpj">
      <Menu
        icon={
          <span className={`dpj__btn${bound ? ' is-bound' : ''}`} aria-hidden="true" style={bound?.accent ? ({ '--dpj': bound.accent } as CSSProperties) : undefined}>
            {bound ? <Icon name="project" size={12} /> : <Icon name="more" size={13} />}
          </span>
        }
        label={`${T.menu(p.deskName)}${bound ? ` – ${T.boundHead(bound.name)}` : ''} (${T.menuHint})`}
      >
        {(close) => (
          <MenuPages>
            {(page, go) =>
              page === 'pick' ? (
                <>
                  <MenuHead>{T.pickHead}</MenuHead>
                  {list.length === 0 && <li className="menu__note">{T.none}</li>}
                  {list.map((x) => (
                    <Item key={x.id} checked={x.id === bound?.id} onClick={() => (close(), x.id !== bound?.id && bind(x.id))}>
                      {x.name}
                      {x.state === 'done' || x.state === 'stopped' ? ` · ${T.closed}` : ''}
                    </Item>
                  ))}
                  <li className="menu__sep" role="separator" />
                  <Item onClick={() => go('')}>{T.back}</Item>
                </>
              ) : (
                <>
                  <MenuHead>{bound ? T.boundHead(bound.name) : T.head}</MenuHead>
                  <Item icon="project" hint={T.bindHint} disabled={!list.length} title={list.length ? undefined : T.none} onClick={() => go('pick')}>
                    {bound ? T.rebind : T.bindTo}
                  </Item>
                  <Item icon="upload" hint={XT.importHint} onClick={() => (close(), xc.pickImport())}>
                    {XT.import}
                  </Item>
                  {bound && (
                    <>
                      <Item icon="project" onClick={() => (close(), p.onOpen())}>
                        {T.open}
                      </Item>
                      <Item checked={b!.assign !== false} hint={T.assignHint} onClick={() => {
                        const on = b!.assign === false;
                        dispatch({ type: 'deskAssign', win, on });
                        tell(on ? T.assignOn : T.assignOff, () => dispatch({ type: 'deskAssign', win, on: !on }));
                      }}>
                        {T.assign}
                      </Item>
                      <Item checked={scope.all} hint={T.showAllHint} onClick={() => {
                        const all = Dp.toggleShowAll();
                        tell(all ? T.allOn : T.allOff(bound.name), () => Dp.toggleShowAll());
                      }}>
                        {T.showAll}
                      </Item>
                      <li className="menu__sep" role="separator" />
                      <Item icon="download" hint={XT.exportHint} onClick={() => (close(), xc.exportProject(bound.id))}>
                        {XT.export}
                      </Item>
                      <Item icon="close" hint={T.unbindHint} onClick={() => {
                        close();
                        dispatch({ type: 'deskBind', win });
                        tell(T.unbound(bound.name), () => dispatch({ type: 'deskBind', win, project: bound.id }));
                      }}>
                        {T.unbind(bound.name)}
                      </Item>
                    </>
                  )}
                </>
              )
            }
          </MenuPages>
        )}
      </Menu>
      <MsgLine msg={msg} onUndo={undo} />
      {xc.node}
    </span>
  );
}

/** PD3: Pflicht-Umschalter im Kopf des Projekt-Modus auf einem gebundenen Desk. */
export function DeskProjectBar(p: { ws: Workspace; win: string; shown: string; onShow: (id: string) => void; dispatch: (a: Action) => void; say: (t: string) => void }) {
  const { ws, win } = p;
  const boundId = Dp.boundProject(ws, win);
  const bound = projectById(ws, boundId);
  const shown = projectById(ws, p.shown);
  const [msg, show, clear] = useMsg();
  if (!bound) return null;
  const list = projectsOf(ws);
  const tell = (text: string, undo?: () => void) => (show(text, undo), p.say(text));
  const closed = (s?: string) => s === 'done' || s === 'stopped';
  return (
    <div className="dpj__bar" role="group" aria-label={T.switchLabel}>
      <span className="layouts__label pj__wheel">
        <span aria-hidden="true">{T.switchCap}</span>
        <ModeWheel
          label={T.switchLabel}
          value={p.shown}
          onChange={(id) => (p.onShow(id), p.say(`${T.switchCap}: ${projectById(ws, id)?.name ?? ''}`))}
          options={list.map((x) => ({
            id: x.id,
            name: x.name,
            hint: [x.id === boundId ? T.boundMark : '', closed(x.state) ? T.closed : '', T.switchHint].filter(Boolean).join(' · '),
          }))}
        />
      </span>
      {closed(bound.state) && <span className="dpj__state">{T.closed}</span>}
      {shown && shown.id !== bound.id && (
        <>
          <button type="button" className="help__run" title={T.backToHint} onClick={() => (p.onShow(bound.id), p.say(T.backTo(bound.name)))}>
            {T.backTo(bound.name)}
          </button>
          <button
            type="button"
            className="help__run"
            title={T.bindHereHint(shown.name, bound.name)}
            onClick={() => {
              p.dispatch({ type: 'deskBind', win, project: shown.id });
              tell(T.bound(shown.name), () => p.dispatch({ type: 'deskBind', win, project: bound.id }));
            }}
          >
            {T.bindHere}
          </button>
        </>
      )}
      <MsgLine
        msg={msg}
        onUndo={() => {
          msg?.undo?.();
          clear();
          p.say(T.undone);
        }}
      />
    </div>
  );
}

/** PD5: „Nur „X“ · Alles zeigen“ – nur auf einem gebundenen Desk. */
export function ScopeNote({ ws, className }: { ws: Workspace; className?: string }) {
  const s = Dp.deskScope();
  const pj = projectById(ws, s.project);
  if (!pj) return null;
  return (
    <p className={`dpj__scope${className ? ` ${className}` : ''}`} title={T.onlyHint}>
      <span>{s.all ? T.allNote : T.only(pj.name)}</span>
      <button type="button" className="help__run" tabIndex={className?.includes('search') ? -1 : undefined} onMouseDown={(e) => e.preventDefault()} onClick={() => Dp.toggleShowAll()}>
        {s.all ? T.onlyBtn(pj.name) : T.showAllBtn}
      </button>
    </p>
  );
}
