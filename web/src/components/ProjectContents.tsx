/**
 * V153 (F-232 P13): Ansicht „Inhalt“ ganz vorn im Rad „Ansicht“ – alle Dokumente des Projekts in Report-Reihenfolge
 * mit Kapitel, Zahl der Einträge und leeren Pflichtfeldern. Enter/Klick öffnet das Dokument (Formular-Kapitel bzw.
 * Ansicht), ↑/↓ wandern, Pos1/Ende springen. Gleiche Reihenfolge wie das Inhaltsverzeichnis im Bericht.
 */
import { type KeyboardEvent, useRef } from 'react';
import type { Project, Workspace } from '../workspace/types';
import { type ContentsEntry, contentsOf } from '../workspace/contents';
import { CONTENTS_TEXT as T } from '../workspace/terms';

export function ProjectContents({ ws, p, onOpen }: { ws: Workspace; p: Project; onOpen: (e: ContentsEntry) => void }) {
  const list = contentsOf(ws, p);
  const ref = useRef<HTMLDivElement>(null);
  const key = (e: KeyboardEvent<HTMLButtonElement>) => {
    const all = [...(ref.current?.querySelectorAll<HTMLButtonElement>('button[data-entry]') ?? [])];
    const i = all.indexOf(e.currentTarget);
    const go = (j: number) => (e.preventDefault(), all[Math.max(0, Math.min(all.length - 1, j))]?.focus());
    if (e.key === 'ArrowDown') return go(i + 1);
    if (e.key === 'ArrowUp') return go(i - 1);
    if (e.key === 'Home') return go(0);
    if (e.key === 'End') return go(all.length - 1);
  };
  const groups = (['forms', 'annex', 'views'] as const).map((g) => ({ g, items: list.filter((x) => x.group === g) })).filter((x) => x.items.length);
  return (
    <div className="toc" ref={ref}>
      <h3 className="toc__head">{T.head(p.name)}</h3>
      <p className="lc__muted">{T.lead}</p>
      {groups.map(({ g, items }) => (
        <section key={g} className="toc__group" aria-labelledby={`toc-${g}`}>
          <h4 id={`toc-${g}`}>{T.groups[g]}</h4>
          <ol className="toc__list">
            {items.map((x) => (
              <li key={x.id}>
                <button type="button" data-entry={x.id} className="toc__row" aria-label={`${T.open(`${x.chapter ? `${x.chapter} ` : ''}${x.name}`)}${x.count !== undefined ? `, ${x.count ? T.count(x.count) : T.empty}` : ''}${x.missing ? `, ${T.missing(x.missing)}` : ''}`} onClick={() => onOpen(x)} onKeyDown={key}>
                  <span className="toc__ch">{x.chapter}</span>
                  <span className="toc__name">{x.name}</span>
                  {x.icb && <span className="toc__icb">ICB4 {x.icb}</span>}
                  <span className="toc__info">
                    {x.count !== undefined && <span>{x.count ? T.count(x.count) : T.empty}</span>}
                    {x.missing > 0 && <span className="toc__miss">{T.missing(x.missing)}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
