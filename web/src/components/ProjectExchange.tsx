/**
 * F-230 (V118, Bauplan 4, F10): Export und Import „ohne Verlust“ für MS Project, iTaskX und andere Planer (MSPDI-XML).
 * Im Steckbrief neben „Eigener Desk“ und im ⋮ am Desk. Import legt immer ein neues Projekt an (F4); gibt es Personen
 * schon, fragt E-Sources am Ort, ob zusammengeführt wird (F5). .mpp-Dateien: Hinweis „In MS Project als XML speichern“ (F8).
 * Meldungen am Ort mit Rückgängig (#perfekte Fokussierung), alles mit der Tastatur bedienbar.
 */
import { useRef, useState, type ReactNode } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { Workspace } from '../workspace/types';
import * as Mx from '../workspace/mspdi';
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
const fileName = (s: string) => `${s.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'Projekt'}.xml`;

type Ask = { xml: string; name: string; clashes: string[]; merge: Set<string> };

/**
 * Export/Import mit Rückfrage am Ort. `tell(text, undo?)` zeigt die Meldung dort, wo bedient wurde;
 * `onImported` bekommt das neue Projekt (z. B. zeigen, eigener Desk).
 */
export function useExchange(ws: Workspace, dispatch: (a: Action) => void, tell: (text: string, undo?: () => void) => void, onImported?: (pid: string, name: string) => void) {
  const input = useRef<HTMLInputElement>(null);
  const [ask, setAsk] = useState<Ask | null>(null);

  const exportProject = (pid: string) => {
    const p = projectById(ws, pid);
    if (!p) return;
    download(fileName(p.name), Mx.exportMspdi(ws, pid, { generator: `E-Sources ${APP_VERSION}` }), 'application/xml');
    tell(T.exported(fileName(p.name)));
  };
  const run = (xml: string, name: string, merge: string[]) => {
    setAsk(null);
    const r = Mx.importMspdi(ws, xml, { merge, name });
    if (!r.ok) return tell(T.error[r.error] + (r.detail ? ` (${r.detail})` : ''));
    const before = ws;
    dispatch({ type: 'exchange', ws: r.ws });
    const pj = projectById(r.ws, r.project)!;
    const tooMany = r.notes.find((n) => n.startsWith('calTooMany:'));
    tell(T.imported(pj.name, r.tasks, r.links, r.persons, r.merged.length, r.kept) + (tooMany ? ` ${T.calTooMany(Number(tooMany.split(':')[1]))}` : ''), () => dispatch({ type: 'exchange', ws: before }));
    onImported?.(r.project, pj.name);
  };
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (/\.mpp$/i.test(f.name)) return tell(T.mpp);
    const xml = await f.text();
    const clashes = Mx.mspdiNameClashes(ws, xml);
    if (clashes.length) return setAsk({ xml, name: f.name, clashes, merge: new Set(clashes) });
    run(xml, f.name, []);
  };

  const node: ReactNode = (
    <>
      <input
        ref={input}
        type="file"
        hidden
        accept=".xml,.mpp,application/xml,text/xml"
        aria-label={T.import}
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {ask && (
        <div className="pjx__ask" role="group" aria-label={T.askHead}>
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
            <button type="button" className="help__run lc__primary" autoFocus onClick={() => run(ask.xml, ask.name, [...ask.merge])}>
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
  return { exportProject, pickImport: () => input.current?.click(), node };
}
