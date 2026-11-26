/**
 * V120 (F-230 Nächste Schritte 5, F-231): Kanban im Projekt-Modus – Rad „Ansicht“ › Kanban zeigt das Kanban-Sheet
 * des Projekts (wie ein Trello-Board), mit allem, was das Kanban im Pad kann. Gibt es keins, legt „Kanban-Board
 * anlegen“ eines an und sortiert die Vorgänge nach ihrem Zustand ein (Meldung mit Rückgängig am Ort). Hat das Projekt
 * mehrere, wählt das Rad „Board“. Aufbau wie Gantt, Netzplan, Ressourcen (NF-08). Logik in workspace/projectKanban.ts.
 */
import { useState } from 'react';
import type { Project, Workspace } from '../workspace/types';
import type { Action } from '../workspace/useWorkspace';
import * as Pk from '../workspace/projectKanban';
import { PROJECT_KANBAN_TEXT as T, TERMS } from '../workspace/terms';
import { noticeLater } from '../workspace/flash';
import { newId } from '../workspace/workspace';
import { KanbanSheet } from './KanbanSheet';
import { ModeWheel } from './ModeWheel';
import { Icon } from './Icon';

const explain = (t: string) => t.split(' = ').slice(1).join(' = ') || t;

export function ProjectKanban({ ws, p, dispatch, say, desk }: { ws: Workspace; p: Project; dispatch: (a: Action) => void; say: (t: string) => void; desk: string }) {
  const boards = Pk.projectBoards(ws, p.id);
  const [pick, setPick] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; undo?: () => void } | null>(null);
  const tell = (text: string, undo?: () => void) => {
    setMsg({ text, undo });
    say(text);
    noticeLater(() => setMsg(null), undo ? 3 : 2);
  };
  const board = boards.find((b) => b.id === pick) ?? boards[0];
  const make = () => {
    const before = ws;
    const id = newId();
    const r = Pk.makeProjectBoard(ws, p.id, { id, by: ws.profile?.name || undefined });
    if (!r) return;
    dispatch({ type: 'exchange', ws: r.ws });
    setPick(id);
    tell(T.made(p.name, r.cards, r.elsewhere), () => dispatch({ type: 'exchange', ws: before }));
  };
  const line = msg && (
    <p className="layouts__undo" role="status">
      {msg.text}
      {msg.undo && (
        <>
          {' '}
          <button type="button" className="note__undo" onClick={() => (msg.undo?.(), setMsg(null), say(T.undone))}>
            {T.undo}
          </button>
        </>
      )}
    </p>
  );

  if (!board) {
    const c = Pk.boardCandidates(ws, p.id);
    return (
      <section className="pc__info pj__info pj__gantt pkb" aria-labelledby="pkb-head">
        <h4 id="pkb-head" className="radar__detail-head" title={explain(TERMS.kanban)}>
          <Icon name="kanban" size={16} className="icon icon--inline" /> {T.head(p.name)}
        </h4>
        <p className="help__text">{T.empty}</p>
        <p className="pc__row">
          <button type="button" className="help__run lc__primary" onClick={make} title={T.makeHint}>
            {T.make(c.cards.length)}
          </button>
        </p>
        {c.elsewhere.length > 0 && <p className="lc__muted">{T.elsewhere(c.elsewhere.length)}</p>}
        {line}
      </section>
    );
  }
  return (
    <section className="pc__info pj__info pj__gantt pkb" aria-labelledby="pkb-head">
      <h4 id="pkb-head" className="radar__detail-head" title={explain(TERMS.kanban)}>
        <Icon name="kanban" size={16} className="icon icon--inline" /> {T.head(p.name)}
      </h4>
      {boards.length > 1 && (
        <div className="pc__row pj__psp-set">
          <ModeWheel label={T.which} value={board.id} onChange={(v) => setPick(v)} options={boards.map((b) => ({ id: b.id, name: b.name, hint: T.whichHint }))} />
        </div>
      )}
      {line}
      <div className="pkb__board">
        <KanbanSheet key={board.id} ws={ws} dispatch={dispatch} desk={desk} sheetId={board.id} say={say} />
      </div>
    </section>
  );
}
