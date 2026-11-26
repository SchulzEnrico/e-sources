/**
 * F-206 Schritt 10 (V116, J2): Ressourcen-Ansicht im Projekt-Modus – Vorbild MS Project „Ressource: Einsatz“ bzw.
 * iTaskX „Ressourceneinsatz“ (ICB4 4.5.6). Je Ressource eine Zeile mit den geplanten Stunden je Woche, rot über der
 * Kapazität; ▸ klappt die Vorgänge darunter auf. Aufbau wie Gantt und Netzplan (NF-08): Kopf mit Schalter und
 * Zusammenfassung, darunter die Tabelle. Logik in workspace/resources.ts.
 */
import { Fragment, useState } from 'react';
import type { Project, Workspace } from '../workspace/types';
import * as Rs from '../workspace/resources';
import { hoursText, isoWeek } from '../workspace/focusLoad';
import { RES_TEXT as R, TERMS } from '../workspace/terms';
import { Icon } from './Icon';
import { openNote } from './SourceChips';
import { fmtDay } from './ProjectPsp';
import { PersonBadge } from './PersonChips';

const explain = (t: string) => t.split(' = ').slice(1).join(' = ') || t;
/** V117: Wochenzellen auf eine Nachkommastelle (genau steht im Tooltip). */
const h = (x: number) => (x ? hoursText(Math.round(x * 10) / 10) : '');

export function ProjectResources({ ws, p }: { ws: Workspace; p: Project }) {
  const u = Rs.resourceUse(ws, p.id);
  const [all, setAll] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const shown = (id: string) => all || open.has(id);
  const toggle = (id: string) => setOpen((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });

  if (!u.rows.length) {
    return (
      <section className="pc__info pj__info pj__gantt" aria-labelledby="rs-head">
        <h4 id="rs-head" className="radar__detail-head">{R.head(p.name)}</h4>
        <p className="help__text">{R.empty}</p>
        {u.open > 0 && <p className="lc__muted">{R.open(hoursText(u.open))}</p>}
      </section>
    );
  }
  const over = u.rows.reduce((s, r) => s + r.over, 0);
  return (
    <section className="pc__info pj__info pj__gantt rs" aria-labelledby="rs-head">
      <h4 id="rs-head" className="radar__detail-head" title={explain(TERMS.resourceUse)}>
        <Icon name="catPeople" size={16} className="icon icon--inline" /> {R.head(p.name)}
      </h4>
      <div className="pc__row pj__psp-set">
        <label className="pc__check">
          <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} />
          {R.showTasks}
        </label>
        <p className="lc__keys gt__sum" role="status">
          {R.sum(u.rows.length, over, u.weeks.length)}
          {u.open > 0 && <> · {R.open(hoursText(u.open))}</>}
          {u.cut && <> · {R.cut(u.weeks.length)}</>}
        </p>
      </div>
      <p className="lc__keys" id="rs-keys">{R.keys}</p>
      <div className="rs__box">
        <table className="pc__table rs__table" aria-labelledby="rs-head" aria-describedby="rs-keys">
          <thead>
            <tr>
              <th scope="col" className="rs__name">{R.person}</th>
              <th scope="col" className="rs__num">{R.total}</th>
              {u.weeks.map((w) => (
                <th key={w} scope="col" className="rs__num" title={R.week(isoWeek(w), fmtDay(w))}>
                  {R.weekShort(isoWeek(w))}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {u.rows.map((r) => (
              <Fragment key={r.person.id}>
                <tr className="rs__res">
                  <th scope="row" className="rs__name">
                    <button type="button" className="rs__twist" aria-expanded={shown(r.person.id)} aria-label={shown(r.person.id) ? R.collapse(r.person.name) : R.expand(r.person.name)} disabled={all} onClick={() => toggle(r.person.id)}>
                      {shown(r.person.id) ? '▾' : '▸'}
                    </button>
                    <PersonBadge person={r.person} /> {r.person.name}
                    {r.over > 0 && <span className="pj__late"> · {R.overTag}</span>}
                  </th>
                  <td className="rs__num">{hoursText(r.total)}</td>
                  {r.hours.map((x, i) => {
                    const hot = x > r.capacity[i] + 0.01;
                    return (
                      <td key={i} className={`rs__num${hot ? ' is-over' : ''}`} title={R.cell(hoursText(x), hoursText(r.capacity[i]))}>
                        {h(x)}
                        {hot && <span className="sr-only"> ({R.overTag})</span>}
                      </td>
                    );
                  })}
                </tr>
                {shown(r.person.id) && (
                  <>
                    <tr className="rs__cap">
                      <th scope="row" className="rs__name rs__sub">{R.capRow}</th>
                      <td className="rs__num" />
                      {r.capacity.map((c, i) => <td key={i} className="rs__num">{h(c)}</td>)}
                    </tr>
                    {r.tasks.map((t) => (
                      <tr key={t.id} className="rs__task">
                        <th scope="row" className="rs__name rs__sub">
                          <button type="button" className="rs__open" title={`${t.code} ${t.title}`} onClick={() => openNote(t.id)}>
                            <span className="pj__code">{t.code}</span> {t.title}
                          </button>
                        </th>
                        <td className="rs__num">{hoursText(t.total)}</td>
                        {t.hours.map((x, i) => <td key={i} className="rs__num">{h(x)}</td>)}
                      </tr>
                    ))}
                  </>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
