/**
 * V119 (F-230 Trello): Kommentare und Anhänge einer aus Trello importierten Karte – unter dem Text der Notiz, nur zum
 * Lesen (sie bleiben unverändert mitgeführt und gehen beim Export zurück). Zugeklappt mit Zahl; <details> ist mit der
 * Tastatur bedienbar (Tab, Enter/Leertaste).
 */
import type { Note, Workspace } from '../workspace/types';
import { trelloExtras } from '../workspace/trello';
import { TRELLO_EXTRAS_TEXT as T } from '../workspace/terms';

const when = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export function TrelloExtras({ ws, note }: { ws: Workspace; note: Note }) {
  const x = trelloExtras(ws, note);
  if (!x) return null;
  return (
    <details className="trx">
      <summary className="trx__sum" title={T.hint}>
        {T.head(x.comments.length, x.attachments.length)}
      </summary>
      <p className="lc__muted trx__hint">{T.hint}</p>
      {x.comments.length > 0 && (
        <ul className="trx__list" aria-label={T.comments}>
          {x.comments.map((c, i) => (
            <li key={i} className="trx__item">
              <span className="trx__meta">
                {c.by || T.unknown}
                {when(c.at) ? ` · ${when(c.at)}` : ''}
              </span>
              <span className="trx__text">{c.text}</span>
            </li>
          ))}
        </ul>
      )}
      {x.attachments.length > 0 && (
        <ul className="trx__list" aria-label={T.attachments}>
          {x.attachments.map((a, i) => (
            <li key={i} className="trx__item">
              <a href={a.url} target="_blank" rel="noopener noreferrer" title={a.upload ? T.upload : a.url}>
                {a.name}
              </a>
              {a.upload && <span className="lc__muted"> · {T.uploadShort}</span>}
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
