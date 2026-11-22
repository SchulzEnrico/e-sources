/**
 * F-168: Ruhiger Hinweis „Neue Version verfügbar“ unten links. Kein Dialog, nimmt den Fokus nicht
 * weg; App sagt ihn höflich an (NF-03). Per Tab erreichbar, Esc oder „Später“ blendet ihn aus.
 */
import { TERMS } from '../workspace/terms';

interface Props {
  onReload: () => void;
  onLater: () => void;
}

const detail = TERMS.update.replace(/^[^=]*=\s*/, '');

export function UpdateNotice({ onReload, onLater }: Props) {
  return (
    <section
      className="update"
      aria-labelledby="update-title"
      aria-describedby="update-text"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onLater();
        }
      }}
    >
      <h2 id="update-title" className="update__title">
        Neue Version verfügbar
      </h2>
      <p id="update-text" className="update__text">
        {detail.charAt(0).toUpperCase() + detail.slice(1)}.
      </p>
      <div className="update__actions">
        <button type="button" className="update__go" onClick={onReload} aria-label="E-Sources neu laden">
          Neu laden
        </button>
        <button type="button" onClick={onLater} title="Hinweis ausblenden (Esc); erscheint wieder bei einer noch neueren Version">
          Später
        </button>
      </div>
    </section>
  );
}
