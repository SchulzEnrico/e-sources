/**
 * F-51: Dialog „Layouts“ eines Desks – wechseln, anlegen (Kopie oder Vorlage „Gleichmäßig“),
 * umbenennen, kopieren, löschen. Native <dialog> mit showModal wie „Zuletzt geschlossen“:
 * Fokus bleibt im Dialog, Esc schließt, danach springt der Fokus zurück (NF-03).
 */
import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { LAYOUT_MAX, layoutsOf } from '../workspace/deskLayouts';
import { DESK_LAYOUT_TEXT as LT } from '../workspace/terms';
import type { Workspace } from '../workspace/types';
import { panelsIn } from '../workspace/workspace';

interface Props {
  ws: Workspace;
  win: string;
  desk: string;
  /** Portale der Vorlage „Gleichmäßig“ auf diesem Bildschirm. */
  evenCount: number;
  onSwitch: (id: string) => void;
  onAdd: (from: 'current' | 'even', name: string) => void;
  onRename: (id: string, name: string) => void;
  onCopy: (id: string) => void;
  onDelete: (id: string) => void;
  /** F-52: Standard-Layout dieses Geräts (nur gültige Verweise); null = „Gleichmäßig“. */
  standard: { win: string; id: string } | null;
  onStandard: (id: string | null) => void;
  onReset: () => void;
  /** Name des zurückgesetzten Layouts, solange Rückgängig geht. */
  resetUndoName: string | null;
  onResetUndo: () => void;
  /** Name des zuletzt gelöschten Layouts, solange Rückgängig geht. */
  undoName: string | null;
  onUndo: () => void;
  onClose: () => void;
}

export function DeskLayouts({ ws, win, desk, evenCount, onSwitch, onAdd, onRename, onCopy, onDelete, standard, onStandard, onReset, resetUndoName, onResetUndo, undoName, onUndo, onClose }: Props) {
  const dlg = useRef<HTMLDialogElement>(null);
  const d = layoutsOf(ws, win);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [asking, setAsking] = useState<string | null>(null);
  const [askReset, setAskReset] = useState(false);
  const [from, setFrom] = useState<'current' | 'even'>('even');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  /** Nach einer Änderung: dieses Element bekommt den Fokus. */
  const [focusId, setFocusId] = useState<string | null>(null);

  useEffect(() => {
    const el = dlg.current;
    if (!el) return;
    const back = document.activeElement as HTMLElement | null;
    if (!el.open) el.showModal();
    el.querySelector<HTMLElement>('.layouts__switch, .layouts__item .help__run')?.focus();
    return () => (back?.isConnected ? back : document.querySelector<HTMLElement>('button[aria-label="Einstellungen"]'))?.focus?.();
  }, []);

  useEffect(() => {
    if (!focusId) return;
    document.getElementById(focusId)?.focus();
    setFocusId(null);
  }, [focusId, ws]);

  const count = (id: string) => {
    const l = d.list.find((x) => x.id === id);
    return l?.saved ? l.saved.panels.length : panelsIn(ws.panels, win).length;
  };
  const taken = (n: string, except?: string) => d.list.some((l) => l.id !== except && l.name === n.trim());
  const full = d.list.length >= LAYOUT_MAX;
  const isStd = (id: string) => !!standard && standard.win === win && standard.id === id;
  const stdName = standard ? (layoutsOf(ws, standard.win).list.find((l) => l.id === standard.id)?.name ?? LT.even) : LT.even;
  const stdDesk = standard && standard.win !== win ? (standard.win ? (ws.windows.find((w) => w.id === standard.win)?.name ?? '') : 'Main Desk') : '';
  const activeName = d.list.find((l) => l.id === d.active)?.name ?? '';

  const saveRename = (id: string) => {
    if (taken(draft, id)) return setError(LT.nameTaken);
    if (draft.trim()) onRename(id, draft);
    setEditing(null);
    setError('');
    setFocusId(`layout-ren-${id}`);
  };

  return (
    <dialog
      ref={dlg}
      className="help layouts"
      aria-labelledby="layouts-title"
      aria-describedby="layouts-intro"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        if (editing || asking || askReset) {
          setEditing(null);
          setAsking(null);
          setAskReset(false);
          return;
        }
        onClose();
      }}
      onClick={(e) => e.target === dlg.current && onClose()}
    >
      <header className="help__head">
        <h2 id="layouts-title">
          <Icon name="layouts" size={16} className="icon icon--inline" /> {LT.title(desk)}
        </h2>
        <button type="button" className="help__x" onClick={onClose} title="Schließen (Esc)" aria-label="Layouts schließen">
          <Icon name="close" size={14} />
        </button>
      </header>
      <p className="help__intro" id="layouts-intro">
        {LT.term}. {LT.intro}
      </p>
      <div className="help__body">
        {/* F-52: Standard dieses Geräts und Zurücksetzen */}
        <div className="layouts__std">
          <p className="help__text" id="layouts-std" title={LT.standardTerm}>
            {LT.standardIs(stdName, stdDesk)}
          </p>
          <div className="layouts__tools">
            {standard && (
              <button type="button" className="help__run" onClick={() => onStandard(null)}>
                {LT.standardEven}
              </button>
            )}
            <button type="button" id="layouts-reset" className="help__run" aria-describedby="layouts-std" onClick={() => setAskReset(true)}>
              <Icon name="restore" size={13} className="icon icon--inline" /> {LT.reset}
            </button>
          </div>
          {askReset && (
            <div className="layouts__ask" role="group" aria-labelledby="layouts-ask-reset">
              <span id="layouts-ask-reset">{LT.askReset(activeName, stdName)}</span>
              <button type="button" className="help__run" onClick={() => { setAskReset(false); onReset(); setFocusId('layouts-reset-undo'); }}>
                {LT.reset}
              </button>
              <button type="button" className="help__run" autoFocus onClick={() => { setAskReset(false); setFocusId('layouts-reset'); }}>
                Abbrechen
              </button>
            </div>
          )}
          {resetUndoName && (
            <p className="layouts__undo" role="status">
              {LT.resetDone(resetUndoName, stdName)}{' '}
              <button type="button" id="layouts-reset-undo" className="help__run" onClick={() => { onResetUndo(); setFocusId('layouts-reset'); }}>
                {LT.undo}
              </button>
            </p>
          )}
        </div>
        <ul className="help__list" aria-label={LT.title(desk)}>
          {d.list.map((l) => {
            const active = l.id === d.active;
            const n = count(l.id);
            return (
              <li key={l.id} className={`help__item layouts__item${active ? ' is-active' : ''}`} aria-current={active ? 'true' : undefined}>
                {editing === l.id ? (
                  <form
                    className="help__row"
                    onSubmit={(e) => {
                      e.preventDefault();
                      saveRename(l.id);
                    }}
                  >
                    <label className="layouts__label">
                      {LT.name}
                      <input
                        autoFocus
                        value={draft}
                        maxLength={40}
                        aria-invalid={!!error}
                        aria-describedby={error ? 'layouts-error' : undefined}
                        onChange={(e) => {
                          setDraft(e.target.value);
                          setError('');
                        }}
                      />
                    </label>
                    <button type="submit" className="help__run">OK</button>
                    <button type="button" className="help__run" onClick={() => { setEditing(null); setError(''); setFocusId(`layout-ren-${l.id}`); }}>
                      Abbrechen
                    </button>
                  </form>
                ) : (
                  <div className="help__row">
                    <h4 className="help__name">
                      {l.name}
                      {active && <span className="layouts__badge"> · {LT.active}</span>}
                      {isStd(l.id) && <span className="layouts__badge"> · {LT.standardBadge}</span>}
                    </h4>
                    {!active && (
                      <button type="button" className="help__run layouts__switch" onClick={() => onSwitch(l.id)} aria-label={`${LT.switchTo}: ${l.name}`}>
                        {LT.switchTo}
                      </button>
                    )}
                  </div>
                )}
                <p className="help__text">{LT.portals(n)}</p>
                {asking === l.id ? (
                  <div className="layouts__ask" role="group" aria-labelledby={`layout-ask-${l.id}`}>
                    <span id={`layout-ask-${l.id}`}>{LT.askRemove(l.name, n)}</span>
                    <button type="button" className="help__run" autoFocus onClick={() => { setAsking(null); onDelete(l.id); setFocusId('layouts-undo'); }}>
                      {LT.remove}
                    </button>
                    <button type="button" className="help__run" onClick={() => { setAsking(null); setFocusId(`layout-del-${l.id}`); }}>
                      Abbrechen
                    </button>
                  </div>
                ) : (
                  editing !== l.id && (
                    <div className="layouts__tools">
                      <button type="button" id={`layout-ren-${l.id}`} className="help__run" onClick={() => { setEditing(l.id); setDraft(l.name); setError(''); }} aria-label={`${LT.rename}: ${l.name}`}>
                        <Icon name="rename" size={13} className="icon icon--inline" /> {LT.rename}
                      </button>
                      <button
                        type="button"
                        id={`layout-std-${l.id}`}
                        className="help__run"
                        aria-pressed={isStd(l.id)}
                        aria-label={`${LT.makeStandard}: ${l.name}`}
                        title={LT.standardTerm}
                        onClick={() => { onStandard(isStd(l.id) ? null : l.id); setFocusId(`layout-std-${l.id}`); }}
                      >
                        <Icon name={isStd(l.id) ? 'starOn' : 'star'} size={13} className="icon icon--inline" /> {LT.makeStandard}
                      </button>
                      <button type="button" className="help__run" disabled={full} title={full ? LT.full(LAYOUT_MAX) : undefined} onClick={() => onCopy(l.id)} aria-label={`${LT.copy}: ${l.name}`}>
                        <Icon name="copy" size={13} className="icon icon--inline" /> {LT.copy}
                      </button>
                      <button
                        type="button"
                        id={`layout-del-${l.id}`}
                        className="help__run"
                        aria-disabled={d.list.length < 2}
                        title={d.list.length < 2 ? LT.last : undefined}
                        onClick={() => (d.list.length < 2 ? setError(LT.last) : setAsking(l.id))}
                        aria-label={`${LT.remove}: ${l.name}`}
                      >
                        <Icon name="remove" size={13} className="icon icon--inline" /> {LT.remove}
                      </button>
                    </div>
                  )
                )}
              </li>
            );
          })}
        </ul>
        {undoName && (
          <p className="layouts__undo" role="status">
            {LT.removed(undoName)}{' '}
            <button type="button" id="layouts-undo" className="help__run" onClick={() => { onUndo(); setFocusId('layouts-add'); }}>
              {LT.undo}
            </button>
          </p>
        )}
        {error && (
          <p className="layouts__error" id="layouts-error" role="alert">
            {error}
          </p>
        )}
        <form
          className="layouts__new"
          aria-labelledby="layouts-new-title"
          onSubmit={(e) => {
            e.preventDefault();
            if (full) return setError(LT.full(LAYOUT_MAX));
            if (name.trim() && taken(name)) return setError(LT.nameTaken);
            onAdd(from, name);
          }}
        >
          <h3 id="layouts-new-title">{LT.add}</h3>
          <label className="layouts__label">
            {LT.name}
            <input id="layouts-add" value={name} maxLength={40} placeholder={`${LT.defaultName} ${d.list.length + 1}`} onChange={(e) => { setName(e.target.value); setError(''); }} />
          </label>
          <fieldset className="layouts__from">
            <legend>{LT.addFrom}</legend>
            <label>
              <input type="radio" name="layouts-from" checked={from === 'even'} onChange={() => setFrom('even')} /> {LT.even}
              <span className="help__text"> – {LT.evenHint(evenCount)}</span>
            </label>
            <label>
              <input type="radio" name="layouts-from" checked={from === 'current'} onChange={() => setFrom('current')} /> {LT.current}
            </label>
          </fieldset>
          <button type="submit" className="help__run" aria-disabled={full} title={full ? LT.full(LAYOUT_MAX) : undefined}>
            <Icon name="plus" size={13} className="icon icon--inline" /> {LT.create}
          </button>
        </form>
      </div>
    </dialog>
  );
}
