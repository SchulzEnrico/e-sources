/**
 * F-24: Dialog „Zuletzt geschlossen“ – die letzten geschlossenen Portale und Tabs dieses Desks,
 * jeder einzeln wiederherstellbar. Native <dialog> mit showModal wie die Hilfe: Fokus bleibt im
 * Dialog, Esc schließt, danach springt der Fokus zurück (NF-03).
 */
import { Icon } from './Icon';
import { useEffect, useRef } from 'react';
import { agoText, closedLabel } from '../workspace/closed';
import type { Closed as Entry } from '../workspace/types';
import { hostOf } from '../workspace/workspace';

interface Props {
  entries: Entry[];
  onRestore: (id: string) => void;
  onClose: () => void;
}

export function Closed({ entries, onRestore, onClose }: Props) {
  const dlg = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    const back = document.activeElement as HTMLElement | null;
    if (!d.open) d.showModal();
    (d.querySelector<HTMLElement>('.closed__btn') ?? d.querySelector<HTMLElement>('.help__x'))?.focus();
    // Auslöser im Menü ist danach weg → zurück aufs Zahnrad
    return () => (back?.isConnected ? back : document.querySelector<HTMLElement>('button[aria-label="Einstellungen"]'))?.focus?.();
  }, []);

  const detail = (c: Entry) => {
    const urls = c.kind === 'tab' ? [c.tab.url] : c.panel.tabs.map((t) => t.url);
    return urls.filter((u): u is string => !!u).map((u) => hostOf(u) || u).join(', ');
  };

  return (
    <dialog
      ref={dlg}
      className="help closed"
      aria-labelledby="closed-title"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === dlg.current && onClose()}
    >
      <header className="help__head">
        <h2 id="closed-title">Zuletzt geschlossen</h2>
        <button type="button" className="help__x" onClick={onClose} title="Schließen (Esc)" aria-label="Zuletzt geschlossen schließen">
          <Icon name="close" size={14} />
        </button>
      </header>
      <p className="help__intro">
        Die letzten 10 geschlossenen Portale und Tabs dieses Desks, neueste oben. Das Neueste holt auch <kbd>Alt/⌥+Z</kbd> zurück.
      </p>
      <div className="help__body">
        {entries.length === 0 ? (
          <p className="help__text">Auf diesem Desk wurde noch nichts geschlossen.</p>
        ) : (
          <ul className="help__list">
            {entries.map((c) => (
              <li key={c.id} className="help__item">
                <div className="help__row">
                  <h4 className="help__name">{closedLabel(c)}</h4>
                  <button type="button" className="help__run closed__btn" onClick={() => onRestore(c.id)} aria-label={`${closedLabel(c)} wiederherstellen`}>
                    Wiederherstellen
                  </button>
                </div>
                <p className="help__text">
                  {agoText(c.at)}
                  {detail(c) && ` · ${detail(c)}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </dialog>
  );
}
