/**
 * F-180: Dialog „Sortierhilfe“. Sources ohne Kategorie, nach Domain gebündelt, mit Vorschlag:
 * „Alle Vorschläge übernehmen“ sortiert alles auf einmal; sonst eine Entscheidung je Gruppe
 * (Kategorie wählen oder neu eintippen, Enter). Nach jedem Schritt springt der Fokus zur nächsten
 * Gruppe, das Ergebnis wird angesagt (NF-03). Native <dialog>, Esc schließt.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { sortGroups } from '../workspace/sortHelp';
import { TERMS } from '../workspace/terms';
import type { Workspace } from '../workspace/types';

interface Props {
  ws: Workspace;
  onSort: (ids: string[], name: string) => void;
  onSortAll: () => void;
  onClose: () => void;
}

const sources = (k: number) => `${k} ${k === 1 ? 'Source' : 'Sources'}`;

export function SortHelp({ ws, onSort, onSortAll, onClose }: Props) {
  const dlg = useRef<HTMLDialogElement>(null);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [said, setSaid] = useState('');
  const all = useMemo(() => sortGroups(ws), [ws]);
  const groups = all.filter((g) => !skipped.has(g.domain));
  const withSuggestion = all.filter((g) => g.suggestion);
  const suggested = withSuggestion.reduce((n, g) => n + g.items.length, 0);
  const listId = 'sorthelp-cats';

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    const back = document.activeElement as HTMLElement | null;
    if (!d.open) d.showModal();
    d.querySelector<HTMLElement>('.sorthelp__all, .sorthelp__input')?.focus();
    return () => (back?.isConnected ? back : document.querySelector<HTMLElement>('button[aria-label="Einstellungen"]'))?.focus?.();
  }, []);

  /** Nach einer Entscheidung: Fokus auf die Gruppe, die an diese Stelle rückt. */
  const focusAt = (i: number) =>
    window.setTimeout(() => {
      const inputs = dlg.current?.querySelectorAll<HTMLInputElement>('.sorthelp__input');
      const el = inputs?.[Math.min(i, (inputs?.length ?? 1) - 1)] ?? dlg.current?.querySelector<HTMLElement>('.sorthelp__done');
      el?.focus();
    }, 0);

  const sortGroup = (i: number) => {
    const g = groups[i];
    const name = (draft[g.domain] ?? g.suggestion ?? '').trim();
    if (!name) return setSaid(`Für ${g.domain} bitte eine Kategorie wählen oder eintippen.`);
    onSort(g.items.map((b) => b.id), name);
    setSaid(`${sources(g.items.length)} von ${g.domain} → ${name}.`);
    focusAt(i);
  };
  const skip = (i: number) => {
    const g = groups[i];
    setSkipped((s) => new Set(s).add(g.domain));
    setSaid(`${g.domain} übersprungen.`);
    focusAt(i);
  };

  const left = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <dialog
      ref={dlg}
      className="help sorthelp"
      aria-labelledby="sorthelp-title"
      aria-describedby="sorthelp-intro"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === dlg.current && onClose()}
    >
      <header className="help__head">
        <h2 id="sorthelp-title">Sortierhilfe</h2>
        <button type="button" className="help__x" onClick={onClose} title="Schließen (Esc)" aria-label="Sortierhilfe schließen">
          ×
        </button>
      </header>
      <p className="help__intro" id="sorthelp-intro">
        {TERMS.sortHelp}.
      </p>
      <div className="help__body sorthelp__body">
        <p className="sr-only" role="status" aria-live="polite">
          {said}
        </p>
        {all.length === 0 ? (
          <p className="sorthelp__empty">Alles einsortiert – jede Source hat eine Kategorie.</p>
        ) : (
          <>
            {withSuggestion.length > 0 && (
              <button
                type="button"
                className="sorthelp__all"
                onClick={() => {
                  onSortAll();
                  setSaid(`${sources(suggested)} nach Vorschlag einsortiert.`);
                  focusAt(0);
                }}
              >
                Alle Vorschläge übernehmen ({sources(suggested)})
              </button>
            )}
            <p className="sorthelp__left">
              {sources(left)} ohne Kategorie in {groups.length} {groups.length === 1 ? 'Gruppe' : 'Gruppen'}
              {skipped.size ? ` (${skipped.size} übersprungen)` : ''}.
            </p>
            <datalist id={listId}>
              {ws.categories.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
            <ul className="sorthelp__list">
              {groups.map((g, i) => {
                const inputId = `sorthelp-${i}`;
                return (
                  <li key={g.domain} className="sorthelp__group">
                    <div className="sorthelp__head">
                      <label htmlFor={inputId} className="sorthelp__domain">
                        {g.domain} <span className="sorthelp__count">· {sources(g.items.length)}</span>
                      </label>
                      <span className="sorthelp__titles">{g.items.slice(0, 3).map((b) => b.title).join(' · ')}{g.items.length > 3 ? ' …' : ''}</span>
                    </div>
                    <div className="sorthelp__row">
                      <input
                        id={inputId}
                        className="sorthelp__input"
                        list={listId}
                        placeholder="Kategorie wählen oder neu eintippen"
                        value={draft[g.domain] ?? g.suggestion ?? ''}
                        aria-description={g.suggestion ? `Vorschlag ${g.learned ? 'aus deiner Library' : 'für bekannte Seiten'}: ${g.suggestion}. Enter sortiert ein.` : 'Enter sortiert ein.'}
                        onChange={(e) => setDraft((d) => ({ ...d, [g.domain]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            sortGroup(i);
                          }
                        }}
                      />
                      <button type="button" onClick={() => sortGroup(i)}>
                        Einsortieren
                      </button>
                      <button type="button" className="sorthelp__skip" onClick={() => skip(i)} aria-label={`${g.domain} überspringen`}>
                        Überspringen
                      </button>
                    </div>
                    {g.suggestion && <span className="sorthelp__why">{g.learned ? 'Vorschlag aus deiner Library' : 'Vorschlag für bekannte Seiten'}</span>}
                  </li>
                );
              })}
            </ul>
          </>
        )}
        <div className="focusrule__foot">
          <button type="button" className="sorthelp__done" onClick={onClose}>
            Fertig
          </button>
        </div>
      </div>
    </dialog>
  );
}
