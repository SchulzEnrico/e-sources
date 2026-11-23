import { useState } from 'react';
import { Icon } from './Icon';
import { SiteIcon, useDisplay } from './SiteIcon';
import { KeepBadge, PickBar, togglePicked } from './Bookmarks';
import { categoryIcon } from '../workspace/icons';
import { groups } from '../workspace/bookmarks';
import { hostOf } from '../workspace/workspace';
import { DESK_LAYOUT_TEXT, PAUSE_TEXT } from '../workspace/terms';
import type { Action } from '../workspace/useWorkspace';
import type { Workspace } from '../workspace/types';

/**
 * F-202 Stufe 3: Modus „Sources“ im Cockpit – alle Sources der Library nach Kategorie, mit Filter
 * und Haken je Source; die Leiste (PickBar) stellt die gewählten gemeinsam ein („nie pausieren“).
 * Tastatur (NF-03): Tab wandert Filter → Leiste → Haken; Leertaste setzt den Haken.
 */
export function SourceCockpit(p: { ws: Workspace; dispatch: (a: Action) => void }) {
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const display = useDisplay();
  const list = groups(p.ws, null, query).filter((g) => g.items.length > 0);
  const shownIds = list.flatMap((g) => g.items.map((b) => b.id));
  if (p.ws.bookmarks.length === 0) return <p className="overview__empty">{DESK_LAYOUT_TEXT.sourcesEmpty}</p>;
  return (
    <div className="srcc">
      <p className="srcc__intro">{DESK_LAYOUT_TEXT.sourcesIntro}</p>
      <input
        className="radar__filter srcc__filter"
        type="search"
        value={query}
        placeholder={DESK_LAYOUT_TEXT.sourcesFilter}
        aria-label={DESK_LAYOUT_TEXT.sourcesFilter}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && query) {
            e.preventDefault();
            e.stopPropagation();
            setQuery('');
          }
        }}
      />
      <PickBar ws={p.ws} shownIds={shownIds} picked={picked} setPicked={setPicked} dispatch={p.dispatch} />
      {list.length === 0 && <p className="overview__empty">{DESK_LAYOUT_TEXT.sourcesNone}</p>}
      <div className="srcc__groups">
        {list.map((g) => {
          const name = g.category?.name ?? 'Ohne Kategorie';
          return (
            <section key={g.category?.id ?? 'none'} className="srcc__group" aria-label={`${name}, ${g.items.length}`}>
              <h4 className="srcc__cat">
                {g.category && <Icon name={categoryIcon(g.category)} size={13} className="icon icon--inline" />} {name} <span className="bm-cat__count">{g.items.length}</span>
              </h4>
              <ul className="srcc__list">
                {g.items.map((b) => (
                  <li key={b.id}>
                    <label className="srcc__row" title={b.url}>
                      <input type="checkbox" className="bm-pick" checked={picked.has(b.id)} onChange={() => setPicked(togglePicked(picked, b.id))} aria-label={PAUSE_TEXT.selectItem(b.title)} />
                      <SiteIcon url={b.url} on={display.favicons} />
                      <span className="srcc__title">
                        {b.title}
                        {b.keep && <KeepBadge />}
                      </span>
                      <span className="srcc__host">{hostOf(b.url)}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
