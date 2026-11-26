/**
 * V123 (F-231 K13): Kennzahlen als Ansicht desselben Kanban-Sheets (Rad „Ansicht“ › Kennzahlen).
 *
 * Wie Trello „Dashboard“: Karten je Spalte (mit WIP-Limit), je Person, je Tag und nach Fälligkeit als waagerechte
 * Balken mit Zahl daneben (die Zahl steht immer als Text – Farbe trägt nie allein). Oben die Summen, Checklisten und
 * das Alter offener Karten (Kanban Guide „Work Item Age“). Ein Klick auf eine Zeile zeigt diese Karten im Board – der
 * Kartenfilter (K4) wird dafür gesetzt. Logik in workspace/kanbanStats.ts.
 */
import type { CardFilter, DueFilter } from '../workspace/cardFilter';
import { FILTER_EMPTY } from '../workspace/cardFilter';
import * as KS from '../workspace/kanbanStats';
import * as No from '../workspace/notes';
import { tagHex } from '../workspace/tags';
import { NOTE_TEXT, STATS_TEXT as T, TERMS, TL_TEXT } from '../workspace/terms';
import type { KViewProps } from './KanbanViews';

const explain = (t: string) => t.split(' = ').slice(1).join(' = ') || t;
const DUE_FILTER: Partial<Record<KS.DueBucket, DueFilter>> = { over: 'over', soon: 'soon', week: 'week', none: 'none', done: 'done' };

interface Row {
  key: string;
  name: string;
  count: number;
  extra?: string;
  color?: string;
  cls?: string;
  filter?: CardFilter;
}

export function KanbanStats(p: KViewProps & { onFilter: (f: CardFilter, what: string) => void; onBoard: () => void }) {
  const { ws, v } = p;
  const st = KS.boardStats(ws, v, p.keep, Date.now(), { noOne: TL_TEXT.noOne, noTag: TL_TEXT.noTag });
  if (!st.total) return <p className="lc__muted ktab__empty">{T.empty}</p>;

  const tile = (id: string, head: string, rows: Row[], onCol = false) => {
    const max = Math.max(1, ...rows.map((r) => r.count));
    return (
      <section className="kst__tile" aria-labelledby={`${id}-h`}>
        <h4 id={`${id}-h`} className="karch__sub">{head}</h4>
        <ul className="kst__rows">
          {rows.map((r) => {
            const label = T.row(r.name, r.count, r.extra ?? '');
            const go = r.filter ? () => p.onFilter(r.filter!, r.name) : onCol ? p.onBoard : undefined;
            return (
              <li key={r.key}>
                <button type="button" className={`kst__row${r.cls ? ` ${r.cls}` : ''}`} disabled={!go} aria-label={label} title={`${label}${go ? ` – ${r.filter ? T.showHint : T.colHint}` : ''}`} onClick={go}>
                  <span className="kst__name">
                    {r.color && <span className="ktl__dot" style={{ background: tagHex(r.color) }} aria-hidden="true" />}
                    {r.name}
                  </span>
                  <span className="kst__track" aria-hidden="true">
                    <span className="kst__fill" style={{ width: `${KS.barPct(r.count, max)}%` }} />
                  </span>
                  <span className="kst__num">
                    {r.count}
                    {r.extra && <span className="lc__muted"> · {r.extra}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    );
  };

  const oldest = st.age?.oldest ? No.noteById(ws, st.age.oldest) : undefined;
  const nums: [string, string, string?][] = [
    [T.total, String(st.total)],
    [T.open, String(st.open)],
    [T.done, String(st.done)],
    [T.over, String(st.due.over), st.due.over ? 'sign--due-over' : undefined],
    [T.check, st.check.all ? T.checkVal(st.check.done, st.check.all) : T.checkNone],
  ];
  return (
    <div className="kst">
      <h3 className="sr-only">{T.head(v.name)}</h3>
      <p className="lc__keys kst__scope">{T.scope}</p>
      <dl className="kst__nums">
        {nums.map(([k, val, cls]) => (
          <div key={k} className={`kst__num-tile${cls ? ` ${cls}` : ''}`}>
            <dt>{k}</dt>
            <dd>{val}</dd>
          </div>
        ))}
        <div className="kst__num-tile kst__age" title={explain(TERMS.workItemAge)}>
          <dt>{T.age}</dt>
          <dd>
            {st.age ? T.ageVal(st.age.avg, st.age.max) : T.ageNone}
            {oldest && (
              <button type="button" className="help__run kst__oldest" title={T.oldest(No.titleOf(No.shownNote(oldest)) || NOTE_TEXT.untitled)} onClick={() => p.onOpen(oldest.id)}>
                {No.titleOf(No.shownNote(oldest)) || NOTE_TEXT.untitled}
              </button>
            )}
          </dd>
        </div>
      </dl>
      <div className="kst__tiles">
        {tile(
          `${v.id}-kst-col`,
          T.byCol,
          st.cols.map((c) => ({ key: c.id, name: c.name, count: c.count, extra: c.wip ? `${T.wipOf(c.count, c.wip)}${c.over ? ` – ${T.overWip}` : ''}` : undefined, cls: c.over ? 'is-over' : undefined })),
          true,
        )}
        {tile(
          `${v.id}-kst-who`,
          T.byWho,
          st.persons.map((x) => ({ key: x.key || '-', name: x.name, count: x.count, extra: x.open !== x.count ? T.openOf(x.open) : undefined, filter: { ...FILTER_EMPTY, persons: [x.key] } })),
        )}
        {tile(
          `${v.id}-kst-tag`,
          T.byTag,
          st.tags.map((x) => ({ key: x.key || '-', name: x.name, count: x.count, color: x.color, extra: x.open !== x.count ? T.openOf(x.open) : undefined, filter: { ...FILTER_EMPTY, tags: [x.key] } })),
        )}
        {tile(
          `${v.id}-kst-due`,
          T.byDue,
          KS.DUE_BUCKETS.map((b) => ({ key: b, name: T.due[b], count: st.due[b], cls: `kst--${b}`, filter: DUE_FILTER[b] ? { ...FILTER_EMPTY, due: [DUE_FILTER[b]!] } : undefined })),
        )}
      </div>
    </div>
  );
}
