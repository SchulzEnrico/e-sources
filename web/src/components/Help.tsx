/**
 * F-156: Hilfe (?) – alle Funktionen und Begriffe mit Tastenkürzeln an einer Stelle (Glossar).
 * Native <dialog> mit showModal: Fokus bleibt im Dialog, Esc schließt, danach springt der Fokus
 * zurück zum Auslöser (NF-03). `at` öffnet die Hilfe an einem Eintrag und hebt ihn hervor.
 */
import { type KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { HELP, type HelpEntry, QUESTION_TEXT, searchHelp, searchQuestions } from '../workspace/help';
import { Icon } from './Icon';
import { helpIcon } from '../workspace/icons';

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
  // F-186: passende Fragen über der Liste; ↓/↑ im Filterfeld wählt, Enter springt zur Antwort
  const questions = useMemo(() => searchQuestions(filter, 4), [filter]);
  const [qSel, setQSel] = useState(-1);
  // Eintrag, zu dem eine Frage gesprungen ist (hebt ihn hervor wie `at`)
  const [jumped, setJumped] = useState<string | null>(null);
  const mark = jumped ?? at;
  useEffect(() => setQSel(-1), [filter]);

  const answer = (id: string) => {
    setFilter('');
    setJumped(id);
    // nach dem Neuzeichnen der ganzen Liste zum Eintrag springen
    requestAnimationFrame(() => {
      const t = dlg.current?.querySelector<HTMLElement>(`#help-${CSS.escape(id)}`);
      t?.scrollIntoView({ block: 'center' });
      t?.focus();
    });
  };

  const onFilterKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    const n = questions.length;
    if (!n) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const d = e.key === 'ArrowDown' ? 1 : -1;
      setQSel((i) => (i < 0 ? (d > 0 ? 0 : n - 1) : (i + d + n) % n));
    } else if (e.key === 'Enter' && qSel >= 0 && questions[qSel]) {
      e.preventDefault();
      answer(questions[qSel].entry.id);
    }
  };

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
    <li key={e.id} id={`help-${e.id}`} tabIndex={-1} className={e.id === mark ? 'help__item is-at' : 'help__item'} aria-labelledby={`help-${e.id}-name`}>
      <div className="help__row">
        <h4 id={`help-${e.id}-name`} className="help__name">
          <Icon name={helpIcon(e.id)} className="icon help__icon" />
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
          <Icon name="close" size={14} />
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
        aria-controls={questions.length ? 'help-questions' : 'help-list'}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={questions.length > 0}
        aria-activedescendant={qSel >= 0 && questions[qSel] ? `help-q-${qSel}` : undefined}
        autoComplete="off"
        onChange={(e) => {
          setFilter(e.target.value);
          setJumped(null);
        }}
        onKeyDown={onFilterKey}
      />
      <span className="sr-only" role="status" aria-live="polite">
        {filter.trim() ? `${questions.length ? `${QUESTION_TEXT.count(questions.length)} (Pfeiltasten wählen), ` : ''}${shown.length} ${shown.length === 1 ? 'Eintrag' : 'Einträge'}` : ''}
      </span>
      {questions.length > 0 && (
        <div className="help__qs">
          <h3 id="help-qs-title" className="help__group">
            {QUESTION_TEXT.headHelp}
          </h3>
          <ul id="help-questions" role="listbox" aria-labelledby="help-qs-title" className="help__qlist">
            {questions.map((h, i) => (
              <li
                key={`${h.entry.id}-${h.q}`}
                id={`help-q-${i}`}
                role="option"
                aria-selected={i === qSel}
                aria-label={QUESTION_TEXT.option(h)}
                className={i === qSel ? 'help__q is-sel' : 'help__q'}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => answer(h.entry.id)}
              >
                <Icon name={helpIcon(h.entry.id)} className="icon help__icon" />
                <span className="help__q-text">{h.q}</span>
                <span className="help__q-hint">{QUESTION_TEXT.hint}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
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
