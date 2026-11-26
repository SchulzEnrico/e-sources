/**
 * F-230 (V118 Bauplan 4, V119 Bauplan 5, F10): Export und Import „ohne Verlust“ für MS Project, iTaskX und andere Planer
 * (MSPDI-XML) sowie Trello (Board als JSON-Datei, F3). Im Steckbrief neben „Eigener Desk“ und im ⋮ am Desk.
 * „Exportieren …“ fragt am Ort nach dem Format (vorgewählt: woher das Projekt kam); „Importieren …“ erkennt XML bzw.
 * Trello-JSON selbst. Import legt immer ein neues Projekt an (F4); gibt es Personen schon, fragt E-Sources am Ort, ob
 * zusammengeführt wird (F5). .mpp-Dateien: Hinweis „In MS Project als XML speichern“ (F8).
 * Meldungen am Ort mit Rückgängig (#perfekte Fokussierung), alles mit der Tastatur bedienbar.
 */
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { Workspace } from '../workspace/types';
import * as Mx from '../workspace/mspdi';
import * as Tr from '../workspace/trello';
import { APP_VERSION } from '../workspace/feedback';
import { projectById } from '../workspace/projects';
import { EXCHANGE_TEXT as T } from '../workspace/terms';

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
type Kind = 'mspdi' | 'trello';
const fileName = (s: string, kind: Kind) => `${s.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'Projekt'}${kind === 'trello' ? '.trello.json' : '.xml'}`;

/** V120 (F-230 Schritt 3): Meldung eines Imports mit Rückgängig (stellt den Stand vor dem Import her – Projekt und Desk weg). */
export type ImportMsg = { text: string; undo: () => void };

type Ask = { kind: Kind; text: string; name: string; clashes: string[]; merge: Set<string> };

/**
 * Export/Import mit Rückfrage am Ort. `tell(text, undo?)` zeigt die Meldung dort, wo bedient wurde;
 * `onImported` bekommt das neue Projekt (z. B. zeigen, eigener Desk).
 */
export function useExchange(ws: Workspace, dispatch: (a: Action) => void, tell: (text: string, undo?: () => void) => void, onImported?: (pid: string, name: string, sheet?: string, msg?: ImportMsg) => void) {
  const input = useRef<HTMLInputElement>(null);
  const [ask, setAsk] = useState<Ask | null>(null);
  /** Formatwahl beim Export (Projekt-Id) */
  const [pick, setPick] = useState<string | null>(null);

  const exportAs = (pid: string, kind: Kind) => {
    setPick(null);
    const p = projectById(ws, pid);
    if (!p) return;
    const gen = `E-Sources ${APP_VERSION}`;
    const name = fileName(p.name, kind);
    if (kind === 'trello') download(name, Tr.exportTrello(ws, pid, { generator: gen }), 'application/json');
    else download(name, Mx.exportMspdi(ws, pid, { generator: gen }), 'application/xml');
    tell(kind === 'trello' ? T.exportedTrello(name) : T.exported(name));
  };
  const exportProject = (pid: string) => {
    setAsk(null);
    setPick(pid);
  };
  const run = (a: Pick<Ask, 'kind' | 'text' | 'name'>, merge: string[]) => {
    setAsk(null);
    const before = ws;
    if (a.kind === 'trello') {
      const r = Tr.importTrello(ws, a.text, { merge, name: a.name });
      if (!r.ok) return tell(T.error[r.error] + (r.detail ? ` (${r.detail})` : ''));
      dispatch({ type: 'exchange', ws: r.ws });
      const pj = projectById(r.ws, r.project)!;
      const over = r.notes.find((n) => n.startsWith('listsOver:'));
      const said = T.importedTrello(pj.name, r.cards, r.lists, r.checklists, r.persons, r.merged.length, r.kept) + (over ? ` ${T.listsOver(Number(over.split(':')[1]))}` : '');
      const undo = () => dispatch({ type: 'exchange', ws: before });
      tell(said, undo);
      // V120 (F-230 Schritt 3): Meldung samt Rückgängig geht mit auf den neuen Desk
      onImported?.(r.project, pj.name, r.view, { text: said, undo });
      return;
    }
    const r = Mx.importMspdi(ws, a.text, { merge, name: a.name });
    if (!r.ok) return tell(T.error[r.error] + (r.detail ? ` (${r.detail})` : ''));
    dispatch({ type: 'exchange', ws: r.ws });
    const pj = projectById(r.ws, r.project)!;
    const tooMany = r.notes.find((n) => n.startsWith('calTooMany:'));
    const said = T.imported(pj.name, r.tasks, r.links, r.persons, r.merged.length, r.kept) + (tooMany ? ` ${T.calTooMany(Number(tooMany.split(':')[1]))}` : '');
    const undo = () => dispatch({ type: 'exchange', ws: before });
    tell(said, undo);
    onImported?.(r.project, pj.name, undefined, { text: said, undo });
  };
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (/\.mpp$/i.test(f.name)) return tell(T.mpp);
    const text = await f.text();
    const kind: Kind = /\.json$/i.test(f.name) || Tr.isTrello(text) ? 'trello' : 'mspdi';
    const clashes = kind === 'trello' ? Tr.trelloNameClashes(ws, text) : Mx.mspdiNameClashes(ws, text);
    if (clashes.length) return setAsk({ kind, text, name: f.name, clashes, merge: new Set(clashes) });
    run({ kind, text, name: f.name }, []);
  };
  const esc = (close: () => void) => (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  };

  const from = pick ? projectById(ws, pick)?.foreign?.from?.kind : undefined;
  const node: ReactNode = (
    <>
      <input
        ref={input}
        type="file"
        hidden
        accept=".xml,.mpp,.json,application/xml,text/xml,application/json"
        aria-label={T.import}
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {pick && (
        <div className="pjx__ask" role="group" aria-label={T.pickHead} onKeyDown={esc(() => (setPick(null), tell(T.exportCancelled)))}>
          <p className="fbq__label">{T.pickHead}</p>
          <span className="pjx__btns pjx__btns--col">
            <button type="button" className={`help__run${from !== 'trello' ? ' lc__primary' : ''}`} autoFocus={from !== 'trello'} title={T.exportMspdiHint} onClick={() => exportAs(pick, 'mspdi')}>
              {T.pickMspdi}
            </button>
            <button type="button" className={`help__run${from === 'trello' ? ' lc__primary' : ''}`} autoFocus={from === 'trello'} title={T.exportTrelloHint} onClick={() => exportAs(pick, 'trello')}>
              {T.pickTrello}
            </button>
          </span>
          <p className="lc__muted">{T.pickHint}</p>
          <span className="pjx__btns">
            <button type="button" className="help__run" onClick={() => (setPick(null), tell(T.exportCancelled))}>
              {T.askCancel}
            </button>
          </span>
        </div>
      )}
      {ask && (
        <div className="pjx__ask" role="group" aria-label={T.askHead} onKeyDown={esc(() => (setAsk(null), tell(T.cancelled)))}>
          <p className="fbq__label">{T.askHead}</p>
          <ul className="pjx__list">
            {ask.clashes.map((n) => (
              <li key={n}>
                <label>
                  <input
                    type="checkbox"
                    checked={ask.merge.has(n)}
                    onChange={(e) => {
                      const merge = new Set(ask.merge);
                      if (e.target.checked) merge.add(n);
                      else merge.delete(n);
                      setAsk({ ...ask, merge });
                    }}
                  />{' '}
                  {T.askOne(n)}
                </label>
              </li>
            ))}
          </ul>
          <p className="lc__muted">{T.askHint}</p>
          <span className="pjx__btns">
            <button type="button" className="help__run lc__primary" autoFocus onClick={() => run(ask, [...ask.merge])}>
              {T.askGo}
            </button>
            <button type="button" className="help__run" onClick={() => (setAsk(null), tell(T.cancelled))}>
              {T.askCancel}
            </button>
          </span>
        </div>
      )}
    </>
  );
  return { exportProject, pickImport: () => (setPick(null), input.current?.click()), node };
}
