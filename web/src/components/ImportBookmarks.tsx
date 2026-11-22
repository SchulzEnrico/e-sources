/**
 * F-36: Dialog „Lesezeichen importieren“. Zeigt, was die gewählte Browser-Datei bringt, und lässt
 * wählen, wie fein die Ordner zu Kategorien werden – damit niemand Hunderte Sources von Hand
 * einsortieren muss. Native <dialog> wie die Hilfe (NF-03): Fokus im Dialog, Esc bricht ab.
 */
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { type BrowserBookmark, type ImportHow, type ImportPlan, importLabel, planImport } from '../workspace/browserBookmarks';
import { TERMS } from '../workspace/terms';
import type { Workspace } from '../workspace/types';

interface Props {
  ws: Workspace;
  fileName: string;
  list: BrowserBookmark[];
  onImport: (plan: ImportPlan) => void;
  onClose: () => void;
  /** F-181: Tour „Import“ starten */
  onTour: () => void;
  /** Tour liegt im Dialog, damit sie über ihm (oberste Ebene) erscheint – wie bei „Design anpassen“. */
  children?: ReactNode;
}

const HOW: { key: ImportHow; label: string; hint: string }[] = [
  { key: 'full', label: 'Ordner wie im Browser', hint: 'Unterordner werden eigene Kategorien, z. B. „Doku › React“.' },
  { key: 'top', label: 'Nur oberste Ordnerebene', hint: 'Unterordner gehen in ihrem obersten Ordner auf – weniger Kategorien.' },
  { key: 'one', label: 'Alles in eine Kategorie', hint: '' },
];

const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;

export function ImportBookmarks({ ws, fileName, list, onImport, onClose, onTour, children }: Props) {
  const dlg = useRef<HTMLDialogElement>(null);
  const label = useMemo(() => importLabel(), []);
  const plans = useMemo(
    () => ({ full: planImport(ws, list, 'full', label), top: planImport(ws, list, 'top', label), one: planImport(ws, list, 'one', label) }),
    [ws, list, label],
  );
  const folders = plans.full.newCategories.length > 0 || plans.full.fresh.some((b) => b.category);
  const deep = plans.full.newCategories.length !== plans.top.newCategories.length;
  const [how, setHow] = useState<ImportHow>('full');
  const plan = plans[how];
  const loose = plan.fresh.filter((b) => !b.category).length;

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    const back = document.activeElement as HTMLElement | null;
    if (!d.open) d.showModal();
    d.querySelector<HTMLElement>('input:checked, .import__go')?.focus();
    return () => (back?.isConnected ? back : document.querySelector<HTMLElement>('button[aria-label="Einstellungen"]'))?.focus?.();
  }, []);

  const options = HOW.filter((o) => (o.key === 'top' ? deep : true));

  return (
    <dialog
      ref={dlg}
      className="help import"
      aria-labelledby="import-title"
      aria-describedby="import-sum"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === dlg.current && onClose()}
    >
      <header className="help__head">
        <h2 id="import-title">Lesezeichen importieren</h2>
        <button type="button" className="design__tour" onClick={onTour} title="Kurze Einführung in den Import" aria-label="Tour „Import“ starten">
          Tour
        </button>
        <button type="button" className="help__x" onClick={onClose} title="Abbrechen (Esc)" aria-label="Lesezeichen importieren abbrechen">
          ×
        </button>
      </header>
      <div className="help__body import__body">
        <p id="import-sum" className="import__sum">
          <strong>{fileName}</strong>: {n(list.length, 'Lesezeichen', 'Lesezeichen')}.{' '}
          {plans.full.fresh.length ? `${n(plans.full.fresh.length, 'Source ist', 'Sources sind')} neu` : 'Nichts davon ist neu'}
          {plans.full.known ? `, ${n(plans.full.known, 'ist', 'sind')} schon in der Library oder doppelt` : ''}
          {plans.full.unusable ? `, ${n(plans.full.unusable, 'Adresse lässt', 'Adressen lassen')} sich nicht in einem Portal öffnen (z. B. javascript:) und ${plans.full.unusable === 1 ? 'bleibt' : 'bleiben'} weg` : ''}.
        </p>
        {plans.full.fresh.length > 0 && (
          <fieldset className="import__how">
            <legend>Kategorien aus den Ordnern</legend>
            {options.map((o) => {
              const p = plans[o.key];
              const cats = p.newCategories.length;
              return (
                <label key={o.key} className="import__opt">
                  <input type="radio" name="import-how" value={o.key} checked={how === o.key} onChange={() => setHow(o.key)} />
                  <span>
                    <span className="import__opt-name">
                      {o.key === 'one' ? `${o.label} „${label}“` : o.key === 'full' && !folders ? 'Ohne Kategorie – danach Sortierhilfe' : o.label}
                    </span>
                    <span className="import__opt-hint">
                      {o.key === 'full' && !folders ? 'Die Datei hat keine Ordner. Die Sortierhilfe bündelt die Sources nach Domain und schlägt Kategorien vor. ' : o.hint ? `${o.hint} ` : ''}
                      {cats ? `${n(cats, 'neue Kategorie', 'neue Kategorien')}.` : 'Keine neue Kategorie.'}
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>
        )}
        {plans.full.fresh.length > 0 && (
          <p className="import__note" aria-live="polite">
            {loose
              ? `${n(loose, 'Source liegt', 'Sources liegen')} in keinem Ordner und ${loose === 1 ? 'kommt' : 'kommen'} unter „Ohne Kategorie“. Die Suche findet sie sofort.${loose >= 5 ? ' Danach öffnet sich die Sortierhilfe: sie bündelt nach Domain und schlägt Kategorien vor.' : ' Einsortieren geht später mit der Sortierhilfe (Einstellungen).'}`
              : 'Jede Source bekommt eine Kategorie.'}{' '}
            Portalen wird nichts zugeordnet; in der Library steht alles unter „Alle“.
          </p>
        )}
        <p className="import__term">{TERMS.library}.</p>
        <div className="focusrule__foot">
          <button type="button" onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" className="import__go" disabled={!plan.fresh.length} onClick={() => onImport(plan)}>
            {plan.fresh.length ? `${n(plan.fresh.length, 'Source', 'Sources')} übernehmen` : 'Nichts zu übernehmen'}
          </button>
        </div>
      </div>
      {children}
    </dialog>
  );
}
