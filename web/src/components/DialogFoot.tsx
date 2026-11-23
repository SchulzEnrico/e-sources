/**
 * F-191 (b): feste Knopfleiste unten in Dialogen mit sofortiger Vorschau – links „Zurücksetzen“
 * (Stand beim Öffnen; ausgegraut, solange nichts geändert ist), rechts „Fertig“ als Hauptknopf.
 * Esc und × schließen wie „Fertig“. Nach dem Zurücksetzen sagt App an (NF-03).
 */
import { DIALOG_TEXT as D } from '../workspace/terms';

export function DialogFoot({ changed, onReset, onDone }: { changed: boolean; onReset: () => void; onDone: () => void }) {
  return (
    <footer className="dialog-foot">
      <span className="dialog-foot__hint">{D.hint}</span>
      <button type="button" className="dialog-foot__reset" onClick={onReset} disabled={!changed} title={changed ? D.resetTitle : D.resetNone}>
        {D.reset}
      </button>
      <button type="button" className="dialog-foot__done" onClick={onDone} title={D.doneTitle}>
        {D.done}
      </button>
    </footer>
  );
}
