/**
 * F-206 Schritt 10 (V115): Netzplan im Projekt-Modus – Vorbild Netzplandiagramm in MS Project / iTaskX und
 * Vorgangsknoten-Netzplan nach DIN 69900 (ICB4 4.5.4). Je Vorgang ein Kasten: oben Nr. und Code, Name, darunter
 * FA | Dauer | FE und SA | Puffer | SE; kritische Vorgänge rot umrandet, Meilensteine mit ◆. Pfeile zu den
 * Nachfolgern. Aufbau wie Gantt (NF-08): Kopf mit „Kritischen Pfad zeigen“ und Zusammenfassung, unten die
 * Angaben des gewählten Vorgangs. Tastatur: Pfeile wandern zwischen den Kästen (links/rechts = Spalte,
 * hoch/runter = in der Spalte), Pos1/Ende, Enter öffnet die Notiz. Logik in workspace/network.ts.
 * V133 (Enrico): Kästen grau neumorph und größer (alles lesbar); Klick bzw. Leertaste zeigt den Vorgang als eingesenkte
 * Karte („sunken“) neben dem Kasten (Angaben, Vorgänger/Nachfolger, „Notiz öffnen“), Esc schließt sie und führt zum Kasten zurück.
 */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { Project, Workspace } from '../workspace/types';
import * as Gt from '../workspace/gantt';
import * as Nw from '../workspace/network';
import { GANTT_TEXT as G, NET_TEXT as N, TERMS } from '../workspace/terms';
import { Icon } from './Icon';
import { CardWindow } from './SheetViews';
import { fmtDay } from './ProjectPsp';

const explain = (t: string) => t.split(' = ').slice(1).join(' = ') || t;
const BOX_W = 210;
const BOX_H = 112;
const GAP_X = 56;
const POP_W = 300;
const GAP_Y = 22;

export function ProjectNetwork({ ws, p, dispatch, say }: { ws: Workspace; p: Project; dispatch: (a: Action) => void; say: (t: string) => void }) {
  const g = Gt.ganttOf(ws, p.id);
  const net = Nw.networkOf(ws, p.id, g);
  const [crit, setCrit] = useState(true);
  const [sel, setSel] = useState<string | undefined>(net.nodes[0]?.id);
  const [pop, setPop] = useState<string | undefined>();
  // V133 (Enrico: „sollte natürlich in der gleichen Ansicht aufgehen“): Notiz im Kartenfenster über dem Netzplan statt im Pad
  const [card, setCard] = useState<string | undefined>();
  const openNote = (id: string) => setCard(id);
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const boxRef = useRef<HTMLDivElement>(null);
  // V133 (Enrico: „Die Anzeige läuft aus dem Bild, wenn man am Rand etwas öffnet“): Vorgangskarte nach dem Öffnen ganz ins Bild rollen
  useEffect(() => {
    if (pop) document.getElementById('nw-pop')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [pop]);
  const cur = sel ? net.byId.get(sel) : undefined;
  useEffect(() => {
    if (sel && !net.byId.has(sel)) setSel(net.nodes[0]?.id);
    if (pop && !net.byId.has(pop)) setPop(undefined);
  }, [sel, pop, net]);

  if (!net.nodes.length) {
    return (
      <section className="pc__info pj__info pj__gantt" aria-labelledby="nw-head">
        <h4 id="nw-head" className="radar__detail-head">{N.head(p.name)}</h4>
        <p className="help__text">{N.empty}</p>
      </section>
    );
  }
  const rowsMax = Math.max(...net.nodes.map((n) => n.line)) + 1;
  const width = net.cols * (BOX_W + GAP_X) + 20;
  const height = rowsMax * (BOX_H + GAP_Y) + 20;
  const pos = (n: Nw.NetNode) => ({ x: 10 + n.col * (BOX_W + GAP_X), y: 10 + n.line * (BOX_H + GAP_Y) });
  const go = (id: string | undefined) => {
    if (!id) return;
    setSel(id);
    refs.current.get(id)?.focus();
    refs.current.get(id)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  };
  const key = (e: KeyboardEvent, n: Nw.NetNode) => {
    const inCol = net.nodes.filter((x) => x.col === n.col);
    const near = (c: number) => {
      const list = net.nodes.filter((x) => x.col === c);
      return list.sort((a, b) => Math.abs(a.line - n.line) - Math.abs(b.line - n.line))[0]?.id;
    };
    let to: string | undefined;
    if (e.key === 'ArrowDown') to = inCol.find((x) => x.line === n.line + 1)?.id;
    else if (e.key === 'ArrowUp') to = inCol.find((x) => x.line === n.line - 1)?.id;
    else if (e.key === 'ArrowRight') to = near(n.col + 1);
    else if (e.key === 'ArrowLeft') to = near(n.col - 1);
    else if (e.key === 'Home') to = net.nodes[0].id;
    else if (e.key === 'End') to = net.nodes[net.nodes.length - 1].id;
    else if (e.key === 'Escape' && pop) {
      e.preventDefault();
      e.stopPropagation();
      setPop(undefined);
      return;
    } else if (e.key === 'Enter') {
      e.preventDefault();
      openNote(n.id);
      return;
    } else return;
    e.preventDefault();
    if (pop && to) setPop(to);
    go(to);
  };
  const critCount = net.nodes.filter((n) => n.row.critical).length;
  const preds = (id: string) => net.links.filter((l) => l.to === id).map((l) => net.byId.get(l.from)!);
  const succs = (id: string) => net.links.filter((l) => l.from === id).map((l) => net.byId.get(l.to)!);
  const name = (n: Nw.NetNode) => `${n.row.nr} ${n.row.node.code} ${n.row.node.title}`;

  return (
    <section className="pc__info pj__info pj__gantt nw" aria-labelledby="nw-head">
      <h4 id="nw-head" className="radar__detail-head" title={explain(TERMS.networkPlan)}>
        <Icon name="project" size={16} className="icon icon--inline" /> {N.head(p.name)}
      </h4>
      <div className="pc__row pj__psp-set">
        <label className="pc__check" title={explain(TERMS.criticalPath)}>
          <input type="checkbox" checked={crit} onChange={(e) => setCrit(e.target.checked)} />
          {G.showCritical}
        </label>
        <p className="lc__keys gt__sum" role="status">
          {N.span(fmtDay(g.start), fmtDay(g.end))} · {N.count(net.nodes.length, net.links.length)} · <span className={crit ? 'pj__crit-tag' : ''}>{G.criticalCount(critCount)}</span>
        </p>
      </div>
      <p className="lc__keys" id="nw-keys">{N.keys}</p>
      <div className="nw__box" ref={boxRef} role="group" aria-label={N.head(p.name)} aria-describedby="nw-keys">
        <div className="nw__canvas" style={{ width, height }}>
          <svg className="nw__links" width={width} height={height} aria-hidden="true">
            <defs>
              <marker id="nw-arr" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L6 3L0 6z" /></marker>
              <marker id="nw-arr-c" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L6 3L0 6z" className="is-crit" /></marker>
            </defs>
            {net.links.map((l) => {
              const a = pos(net.byId.get(l.from)!);
              const b = pos(net.byId.get(l.to)!);
              const x1 = a.x + BOX_W;
              const y1 = a.y + BOX_H / 2;
              const x2 = b.x;
              const y2 = b.y + BOX_H / 2;
              const mx = x2 > x1 ? (x1 + x2) / 2 : x1 + 14;
              const d = x2 > x1 ? `M${x1} ${y1} H${mx} V${y2} H${x2 - 2}` : `M${x1} ${y1} H${mx} V${Math.max(y1, y2) + BOX_H / 2 + 8} H${x2 - 14} V${y2} H${x2 - 2}`;
              const c = crit && l.critical;
              const on = sel === l.from || sel === l.to;
              return <path key={`${l.from}>${l.to}`} d={d} className={`${c ? 'is-crit' : ''}${on ? ' is-on' : ''}`} markerEnd={c ? 'url(#nw-arr-c)' : 'url(#nw-arr)'} />;
            })}
          </svg>
          {net.nodes.map((n) => {
            const { x, y } = pos(n);
            const r = n.row;
            const c = crit && r.critical;
            const label = N.nodeLabel(name(n), fmtDay(n.es), fmtDay(n.ef), fmtDay(n.ls), fmtDay(n.lf), r.days, r.float, c, r.node.milestone);
            return (
              <button
                key={n.id}
                type="button"
                ref={(el) => (el ? refs.current.set(n.id, el) : refs.current.delete(n.id))}
                className={`nw__node${c ? ' is-crit' : ''}${sel === n.id ? ' is-sel' : ''}${r.node.done ? ' is-done' : ''}${r.node.milestone ? ' is-ms' : ''}`}
                style={{ left: x, top: y, width: BOX_W, height: BOX_H }}
                tabIndex={sel === n.id ? 0 : -1}
                aria-label={label}
                title={`${name(n)}\n${N.keysShort}`}
                aria-expanded={pop === n.id}
                aria-controls={pop === n.id ? 'nw-pop' : undefined}
                onClick={() => (setSel(n.id), setPop(pop === n.id ? undefined : n.id))}
                onFocus={() => setSel(n.id)}
                onDoubleClick={() => openNote(n.id)}
                onKeyDown={(e) => key(e, n)}
              >
                <span className="nw__top">
                  <span className="nw__nr">{r.nr}</span>
                  <span className="nw__code">{r.node.code}</span>
                  {r.node.milestone && <span className="pj__ms" aria-hidden="true">◆</span>}
                </span>
                <span className="nw__title">{r.node.title}</span>
                <span className="nw__grid" aria-hidden="true">
                  <span title={N.es}>{fmtDay(n.es)}</span>
                  <span title={N.dur}>{r.node.milestone ? '◆' : `${r.days} T`}</span>
                  <span title={N.ef}>{fmtDay(n.ef)}</span>
                  <span title={N.ls}>{fmtDay(n.ls)}</span>
                  <span title={N.float} className={r.float < 0 ? 'pj__late' : ''}>{`P ${r.float}`}</span>
                  <span title={N.lf}>{fmtDay(n.lf)}</span>
                </span>
              </button>
            );
          })}
          {pop && net.byId.get(pop) && (() => {
            const n = net.byId.get(pop)!;
            const { x, y } = pos(n);
            const r = n.row;
            // rechts neben dem Kasten, wenn dort im sichtbaren Ausschnitt Platz ist; sonst links daneben, sonst darunter –
            // nie über dem gewählten Kasten
            const box = boxRef.current;
            const viewL = box?.scrollLeft ?? 0;
            const viewR = box ? viewL + box.clientWidth : width;
            const right = x + BOX_W + POP_W + 12 <= Math.min(width, viewR);
            const leftSide = !right && x - POP_W - 10 >= Math.max(4, viewL);
            const left = right ? x + BOX_W + 10 : leftSide ? x - POP_W - 10 : Math.max(viewL + 4, Math.min(x, viewR - POP_W - 4));
            const top = right || leftSide ? y : y + BOX_H + 8;
            const close = () => (setPop(undefined), refs.current.get(n.id)?.focus());
            return (
              <div
                id="nw-pop"
                className={`nw__pop sunken${crit && r.critical ? ' is-crit' : ''}`}
                role="region"
                aria-label={N.popLabel(name(n))}
                style={{ left, top, width: POP_W }}
                onKeyDown={(e) => e.key === 'Escape' && (e.preventDefault(), e.stopPropagation(), close())}
              >
                <div className="nw__pophead">
                  <strong>{r.node.code} {r.node.title}</strong>
                  <button type="button" className="remind__x" aria-label={N.popClose} title={N.popClose} onClick={close}>
                    <Icon name="close" size={12} />
                  </button>
                </div>
                <p className="nw__popstate">
                  {N.popNr(r.nr)} · {r.node.milestone ? N.popMs : N.popDays(r.days)}
                  {r.node.done ? ` · ${N.popDone}` : ''}
                  {crit && r.critical ? ` · ${N.popCrit}` : ''}
                </p>
                <dl className="nw__popdates">
                  <dt>{N.es}</dt><dd>{fmtDay(n.es)}</dd>
                  <dt>{N.ef}</dt><dd>{fmtDay(n.ef)}</dd>
                  <dt>{N.ls}</dt><dd>{fmtDay(n.ls)}</dd>
                  <dt>{N.lf}</dt><dd>{fmtDay(n.lf)}</dd>
                  <dt>{N.float}</dt><dd className={r.float < 0 ? 'pj__late' : undefined}>{r.float}</dd>
                </dl>
                <p className="nw__poplinks"><span className="fbq__label">{N.preds}</span> {preds(n.id).map(name).join(' · ') || '–'}</p>
                <p className="nw__poplinks"><span className="fbq__label">{N.succs}</span> {succs(n.id).map(name).join(' · ') || '–'}</p>
                <button type="button" className="help__run" onClick={() => (openNote(n.id), say(N.opened))}>{N.open}</button>
              </div>
            );
          })()}
        </div>
      </div>
      <p className="lc__keys nw__legend">{N.legend}</p>
      {card && (
        <CardWindow
          ws={ws}
          dispatch={dispatch}
          noteId={card}
          where={N.head(p.name)}
          sheetId=""
          say={say}
          onClose={() => {
            const id = card;
            setCard(undefined);
            window.setTimeout(() => refs.current.get(id)?.focus(), 0);
          }}
        />
      )}
      {cur && (
        <div className="pj__task nw__info" aria-live="polite">
          <strong>{name(cur)}</strong>
          <span>{N.infoDates(fmtDay(cur.es), fmtDay(cur.ef), fmtDay(cur.ls), fmtDay(cur.lf), cur.row.float)}</span>
          <span>{N.preds}: {preds(cur.id).map(name).join(' · ') || '–'}</span>
          <span>{N.succs}: {succs(cur.id).map(name).join(' · ') || '–'}</span>
          <button type="button" className="help__run" onClick={() => (openNote(cur.id), say(N.opened))}>{N.open}</button>
        </div>
      )}
    </section>
  );
}
