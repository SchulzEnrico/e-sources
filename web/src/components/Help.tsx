/**
 * F-156: Hilfe (?) – alle Funktionen und Begriffe mit Tastenkürzeln an einer Stelle (Glossar).
 * Native <dialog> mit showModal: Fokus bleibt im Dialog, Esc schließt, danach springt der Fokus
 * zurück zum Auslöser (NF-03). `at` öffnet die Hilfe an einem Eintrag und hebt ihn hervor.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { HELP, type HelpEntry, searchHelp } from '../workspace/help';

interface Props {
  /** Eintrag, an dem die Hilfe aufgeht (aus der Suche); sonst oben. */
  at: string | null;
  onClose: () => void;
  /** Funktion ausführen; schließt die Hilfe. */
  onRun: (e: HelpEntry) => void;
}

const GROUPS: HelpEntry['group'][] = ['Begriffe', 'Ansicht', 'Anlegen', 'Bedienung'];

export function Help({ at, onClose, onRun }: Props) {
  const dlg = useRef<HTMLDialogElement>(null);
  const filterRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState('');
  const shown = useMemo(() => (filter.trim() ? searchHelp(filter, HELP.length) : HELP), [filter]);

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    const back = document.activeElement as HTMLElement | null;
    if (!d.open) d.showModal();
    // An einem Eintrag öffnen: dorthin scrollen und ihn fokussieren, sonst ins Filterfeld.
    const target = at ? d.querySelector<HTMLElement>(`#help-${CSS.escape(at)}`) : null;
    if (target) {
      target.scrollIntoView({ block: 'center' });
      target.focus();
    } else filterRef.current?.focus();
    return () => back?.focus?.();
  }, [at]);

  const entry = (e: HelpEntry) => (
    <li key={e.id} id={`help-${e.id}`} tabIndex={-1} className={e.id === at ? 'help__item is-at' : 'help__item'} aria-labelledby={`help-${e.id}-name`}>
      <div className="help__row">
        <h4 id={`help-${e.id}-name`} className="help__name">
          {e.name}
        </h4>
        {e.keys && (
          <kbd className="help__kbd" aria-label={`Kürzel: ${e.keys}`}>
            {e.keys}
          </kbd>
        )}
        {e.run && e.run !== 'help' && (
          <button type="button" className="help__run" onClick={() => onRun(e)} aria-label={`${e.name} ausführen`}>
            Ausführen
          </button>
        )}
      </div>
      <p className="help__text">{e.text}</p>
    </li>
  );

  return (
    <dialog
      ref={dlg}
      className="help"
      aria-labelledby="help-title"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // Klick auf den abgedunkelten Rand schließt
      onClick={(e) => e.target === dlg.current && onClose()}
    >
      <header className="help__head">
        <h2 id="help-title">Hilfe – Funktionen und Begriffe</h2>
        <button type="button" className="help__x" onClick={onClose} title="Schließen (Esc)" aria-label="Hilfe schließen">
          ×
        </button>
      </header>
      <p className="help__intro">
        Aufbau: <b>Desk</b> → <b>Slot</b> → <b>Stack</b> → <b>Portal</b> → <b>Tab</b>; ein Portal zeigt eine <b>Source</b>. Alles hier findet auch die Suche oben (Strg/⌘+K oder /). Hilfe öffnen: <kbd>?</kbd>
      </p>
      <input
        ref={filterRef}
        className="help__filter"
        type="search"
        value={filter}
        placeholder="In der Hilfe suchen …"
        aria-label="In der Hilfe suchen"
        aria-controls="help-list"
        onChange={(e) => setFilter(e.target.value)}
      />
      <span className="sr-only" role="status" aria-live="polite">
        {filter.trim() ? `${shown.length} ${shown.length === 1 ? 'Eintrag' : 'Einträge'}` : ''}
      </span>
      <div className="help__body" id="help-list">
        {shown.length === 0 && <p className="help__text">Nichts gefunden.</p>}
        {filter.trim() ? (
          <ul className="help__list">{shown.map(entry)}</ul>
        ) : (
          GROUPS.map((g) => (
            <section key={g} aria-labelledby={`help-g-${g}`}>
              <h3 id={`help-g-${g}`} className="help__group">
                {g}
              </h3>
              <ul className="help__list">{shown.filter((e) => e.group === g).map(entry)}</ul>
            </section>
          ))
        )}
      </div>
    </dialog>
  );
}
