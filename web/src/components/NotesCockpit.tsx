import { Fragment, useEffect, useRef, useState, type KeyboardEvent, type MutableRefObject } from 'react';
import type { Pad, Workspace } from '../workspace/types';
import type { RadarWindow } from '../workspace/focus';
import { placeText } from '../workspace/focus';
import { DOCK_TAB_W, dockOf, dockedOn, padTitle, padUndoOf, padsOn, placeOf as floatOf, sheetUndoOf } from '../workspace/pads';
import { loadModes } from '../workspace/deskMode';
import { noteTreeOf, syncNoteTree } from '../workspace/noteTree';
import { rects as treeRects } from '../workspace/tree';
import type { PadPlace } from '../workspace/types';
import { idsIn, viewById } from '../workspace/notes';
import { windowName } from '../workspace/windows';
import { NOTICE_MS } from '../workspace/flash';
import { DIALOG_TEXT, NOTES_COCKPIT_TEXT as NC, PAD_TEXT } from '../workspace/terms';
import type { Action } from '../workspace/useWorkspace';
import { Icon } from './Icon';
import * as Sh from '../workspace/sheets';
import { padWith } from '../workspace/pads';
import { padOpenResult } from '../workspace/useWorkspace';
import { newId } from '../workspace/workspace';
import { COL_STATE_ICON, focusColLater } from './KanbanSheet';
import { OpacitySlider } from './Pad';

/**
 * F-206 Schritt 5 (V85, N8–N10): Cockpit-Ansicht „Notizen“ – weitestgehend wie „Portale“ (NF-08).
 * Links je Desk ein Radar: Slots blass als Lage, Pads als Rahmen an ihrem Platz, das Dock als Streifen
 * am rechten Rand. Rechts die Liste: Pad → Sheets mit denselben Werkzeugen an denselben Stellen wie
 * bei den Portalen (Verschieben, Holen, Umbenennen, Schließen mit Rückgängig), dazu nur für Pads
 * Ins Dock / Aus dem Dock lösen und die Deckkraft.
 * Tastatur (NF-03, wie Portale): Pfeile wandern im Radar, Enter in die Liste; dort ↑/↓, ← zurück,
 * Enter zeigt, V verschiebt, H holt her, D Dock, Entf schließt, F2 benennt das Sheet um.
 */
export interface NotesCockpitProps {
  ws: Workspace;
  /** Dieser Desk ('' = Main Desk). */
  win: string;
  /** Radar der Portale – liefert Desks, Seitenverhältnis und Slot-Lage. */
  wins: RadarWindow[];
  query: string;
  dispatch: (a: Action) => void;
  say: (text: string) => void;
  /** Pad (und Sheet) zeigen – auch auf einem anderen Desk; schließt das Cockpit. */
  onShowPad: (id: string, sheet?: string) => void;
  /** N10: Pad auf einen anderen Desk – schwebend über dem aktiven Slot, wenn das der Desk hier ist. */
  onToDesk: (id: string, desk: string) => void;
  /** Filterfeld im Kopf (Pfeil hoch aus der ersten Zeile). */
  filterRef: MutableRefObject<HTMLInputElement | null>;
  /** Pfeil runter im Filterfeld → erste Zeile. */
  firstRef: MutableRefObject<(() => void) | null>;
  /** Deckkraft Pads/Dock (F-212). */
  opacity?: { pads: number; dock: number; setPads: (v: number) => void; setDock: (v: number) => void };
}

type Row = { kind: 'pad'; pad: Pad } | { kind: 'sheet'; pad: Pad; sheet: string };
type Tile = { desk: string; wi: number; id: string; pad?: Pad; dock?: boolean; rect: { x: number; y: number; w: number; h: number } };
const rowKey = (r: Row) => (r.kind === 'pad' ? `p:${r.pad.id}` : `s:${r.pad.id}:${r.sheet}`);
const lower = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function NotesCockpit(p: NotesCockpitProps) {
  const { ws } = p;
  // V90 (F-210 Schritt 4): Desks im Notizen-Modus zeigen die Pads lückenlos wie auf dem Desk (Baum), ohne Dock
  const modes = loadModes();
  const notesOn = (desk: string) => modes[desk] === 'notes';
  const treeOf = (desk: string) => {
    const ids = padsOn(ws, desk).map((x) => x.id).sort();
    return treeRects(syncNoteTree(noteTreeOf(ws, desk), ids, { min: { w: 0, h: 0 }, aspect: 16 / 10 }).tree);
  };
  const placeOf = (w: Workspace, desk: string, id: string): PadPlace | undefined => (notesOn(desk) ? treeOf(desk).get(id) : floatOf(w, desk, id));
  // Desks: alle aus dem Radar, dazu Desks, auf denen nur Pads liegen (ohne Portale fallen sie dort weg)
  const deskIds = [...new Set([...p.wins.map((w) => w.win), ...(ws.pads ?? []).map((x) => x.desk)])];
  const desks = deskIds.map((id) => {
    const w = p.wins.find((x) => x.win === id);
    return { id, here: id === p.win, title: w?.title ?? windowName(ws, id), aspect: w?.aspect ?? 16 / 10, areas: w?.areas ?? [] };
  });
  desks.sort((a, b) => (a.here ? -1 : b.here ? 1 : 0));
  /** Anteil des Dock-Streifens an der Desk-Breite (hier gemessen, sonst ungefähr). */
  const bandOf = (desk: string) => {
    const s = dockOf(ws, desk);
    if (s.off || !dockedOn(ws, desk).length) return 0;
    const deskW = typeof window !== 'undefined' ? window.innerWidth : 1600;
    return Math.min(0.5, (s.folded ? DOCK_TAB_W : s.w) / deskW);
  };
  const tiles: Tile[] = desks.flatMap((d, wi) => {
    const tree = notesOn(d.id);
    const band = tree ? 0 : bandOf(d.id);
    const loose = padsOn(ws, d.id).filter((x) => tree || !x.docked);
    // Pads am selben Platz liegen im Radar leicht versetzt (wie ein Stapel), damit jedes zu sehen und zu wählen ist
    const seen = new Map<string, number>();
    const out: Tile[] = loose.map((pad) => {
      const pl = placeOf(ws, d.id, pad.id) ?? { x: 0.5, y: 0, w: 0.5, h: 1 };
      const key = [pl.x, pl.y, pl.w, pl.h].map((v) => v.toFixed(3)).join();
      const n = seen.get(key) ?? 0;
      seen.set(key, n + 1);
      // waagerecht wenig, senkrecht eine Titelzeile weit – so bleibt der Name des Pads darunter lesbar
      const dx = Math.min(n * 0.02, 0.08);
      const dy = Math.min(n * 0.09, 0.36);
      return { desk: d.id, wi, id: pad.id, pad, rect: { x: Math.min(pl.x + dx, 1) * (1 - band), y: Math.min(pl.y + dy, 0.9), w: pl.w * (1 - band), h: Math.max(0.1, pl.h - dy) } };
    });
    if (!tree && dockedOn(ws, d.id).length) out.push({ desk: d.id, wi, id: `dock:${d.id}`, dock: true, rect: { x: 1 - Math.max(band, 0.06), y: 0, w: Math.max(band, 0.06), h: 1 } });
    return out;
  });

  const topOf = (desk: string) => padsOn(ws, desk).at(-1);
  const startTile = () => {
    const t = topOf(p.win);
    return t ? (t.docked ? `dock:${p.win}` : t.id) : (tiles[0]?.id ?? null);
  };
  const [sel, setSel] = useState<string | null>(startTile);
  const [cur, setCur] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [moving, setMoving] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ text: string; run: () => void } | null>(null);
  const rowBtns = useRef(new Map<string, HTMLButtonElement>());
  const tileBtns = useRef(new Map<string, HTMLButtonElement>());
  const later = (f: () => void) => requestAnimationFrame(f);

  useEffect(() => {
    if (!undo) return;
    const t = window.setTimeout(() => setUndo(null), NOTICE_MS);
    return () => window.clearTimeout(t);
  }, [undo]);
  useEffect(() => {
    if (sel) tileBtns.current.get(sel)?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selTile = tiles.find((t) => t.id === sel) ?? tiles[0];
  const q = lower(p.query.trim());
  const padsOfTile = (t: Tile | undefined): Pad[] => (!t ? [] : t.dock ? [...dockedOn(ws, t.desk)].reverse() : t.pad ? [t.pad] : []);
  const sheetName = (id: string) => viewById(ws, id)?.name ?? '–';
  const deskTitle = (id: string) => desks.find((d) => d.id === id)?.title ?? windowName(ws, id);
  const padMatches = (pad: Pad) => !q || [padTitle(ws, pad), deskTitle(pad.desk), ...pad.sheets.map(sheetName)].some((s) => lower(s).includes(q));
  const visiblePads = q ? (ws.pads ?? []).filter(padMatches) : padsOfTile(selTile);
  const rows: Row[] = visiblePads.flatMap((pad) => [{ kind: 'pad' as const, pad }, ...pad.sheets.map((sheet) => ({ kind: 'sheet' as const, pad, sheet }))]);
  const order = rows.map(rowKey);
  const focusKey = cur && order.includes(cur) ? cur : (order[0] ?? null);

  const toRow = (key: string | null | undefined) => {
    if (!key) return;
    setCur(key);
    later(() => rowBtns.current.get(key)?.focus());
  };
  const toTile = (id: string | undefined) => {
    if (!id) return;
    setSel(id);
    setCur(null);
    later(() => tileBtns.current.get(id)?.focus());
  };
  p.firstRef.current = () => toRow(order[0]);

  const tileOfPad = (pad: Pad) => (pad.docked ? `dock:${pad.desk}` : pad.id);
  const afterRemove = (key: string) => {
    const i = order.indexOf(key);
    const next = order.filter((k, j) => j !== i && !k.startsWith(`s:${key.slice(2)}:`))[Math.max(0, i - 1)];
    if (next) toRow(next);
    else toTile(tiles.find((t) => t.id !== sel)?.id);
  };
  /** BC3: Matrix zeigen – offen in einem Pad: dorthin; sonst im obersten Pad dieses Desks öffnen. */
  const showMatrix = (id: string) => {
    const there = padWith(ws, id);
    if (there) return p.onShowPad(there.id, id);
    const ids = [newId(), newId(), newId()];
    const r = padOpenResult(ws, { desk: p.win, ref: { view: id }, ids });
    p.dispatch({ type: 'padOpen', desk: p.win, ref: { view: id }, ids });
    if (r.result !== 'missing' && r.pad) window.setTimeout(() => p.onShowPad(r.pad!, id), 0);
  };
  const closePad = (pad: Pad) => {
    const u = padUndoOf(ws, pad.id);
    const title = padTitle(ws, pad);
    p.dispatch({ type: 'padClose', id: pad.id });
    const text = NC.closedPad(title);
    p.say(`${text}. ${PAD_TEXT.closePadHint}`);
    if (u) setUndo({ text, run: () => (p.dispatch({ type: 'padRestore', undo: u }), p.say(NC.undone), setSel(tileOfPad(pad))) });
    afterRemove(`p:${pad.id}`);
  };
  const closeSheet = (pad: Pad, sheet: string) => {
    const u = sheetUndoOf(ws, pad.id, sheet);
    const name = sheetName(sheet);
    p.dispatch({ type: 'padCloseSheet', id: pad.id, sheet });
    const text = NC.closedSheet(name);
    p.say(`${text}. ${PAD_TEXT.closeSheetHint}`);
    if (u) setUndo({ text, run: () => (p.dispatch({ type: 'padRestoreSheet', undo: u }), p.say(NC.undone), setSel(tileOfPad(pad))) });
    afterRemove(`s:${pad.id}:${sheet}`);
  };
  const dock = (pad: Pad) => {
    const on = !pad.docked;
    p.dispatch({ type: 'padDock', id: pad.id, on });
    p.say(on ? NC.docked(padTitle(ws, pad)) : NC.undocked(padTitle(ws, pad)));
    setSel(on ? `dock:${pad.desk}` : pad.id);
    toRow(`p:${pad.id}`);
  };
  const fetch = (pad: Pad) => {
    p.onToDesk(pad.id, p.win);
    p.say(NC.fetched(padTitle(ws, pad)));
    setSel(pad.id);
    toRow(`p:${pad.id}`);
  };
  const startRename = (pad: Pad, sheet: string) => {
    setDraft(sheetName(sheet));
    setEditing(`s:${pad.id}:${sheet}`);
  };
  const commit = (sheet: string, key: string) => {
    if (draft.trim()) p.dispatch({ type: 'padRenameSheet', sheet, name: draft.trim() });
    setEditing(null);
    toRow(key);
  };

  /** Nächste Kachel in einer Richtung – Desks stehen untereinander (wie im Radar der Portale). */
  const neighbour = (from: Tile, dx: number, dy: number) => {
    const c = (t: Tile) => ({ x: t.rect.x + t.rect.w / 2, y: t.wi * 1.2 + t.rect.y + t.rect.h / 2 });
    const o = c(from);
    let best: Tile | undefined;
    let score = Infinity;
    for (const t of tiles) {
      if (t === from) continue;
      const v = c(t);
      const along = (v.x - o.x) * dx + (v.y - o.y) * dy;
      if (along <= 0.001) continue;
      const s = along + 2 * (Math.abs((v.x - o.x) * dy) + Math.abs((v.y - o.y) * dx));
      if (s < score) {
        score = s;
        best = t;
      }
    }
    return best;
  };

  const onTileKey = (e: KeyboardEvent, t: Tile) => {
    const first = padsOfTile(t)[0];
    const keys: Record<string, () => void> = {
      ArrowRight: () => toTile(neighbour(t, 1, 0)?.id),
      ArrowLeft: () => toTile(neighbour(t, -1, 0)?.id),
      ArrowDown: () => toTile(neighbour(t, 0, 1)?.id),
      ArrowUp: () => toTile(neighbour(t, 0, -1)?.id),
      Home: () => toTile(tiles[0]?.id),
      End: () => toTile(tiles[tiles.length - 1]?.id),
      Enter: () => first && toRow(`p:${first.id}`),
      ' ': () => first && toRow(`p:${first.id}`),
      v: () => first && setMoving(first.id),
      V: () => first && setMoving(first.id),
    };
    const f = keys[e.key];
    if (!f) return;
    e.preventDefault();
    e.stopPropagation();
    f();
  };

  const onRowKey = (e: KeyboardEvent, r: Row) => {
    const key = rowKey(r);
    const i = order.indexOf(key);
    const n = order.length;
    const other = r.pad.desk !== p.win;
    const keys: Record<string, () => void> = {
      ArrowDown: () => toRow(order[(i + 1) % n]),
      ArrowUp: () => (q && i === 0 ? p.filterRef.current?.focus() : toRow(order[(i - 1 + n) % n])),
      ArrowLeft: () => toTile(tileOfPad(r.pad)),
      Home: () => toRow(order[0]),
      End: () => toRow(order[n - 1]),
      F2: () => startRename(r.pad, r.kind === 'sheet' ? r.sheet : r.pad.active),
      v: () => setMoving(r.pad.id),
      V: () => setMoving(r.pad.id),
      h: () => other && fetch(r.pad),
      H: () => other && fetch(r.pad),
      d: () => dock(r.pad),
      D: () => dock(r.pad),
      Delete: () => (r.kind === 'sheet' ? closeSheet(r.pad, r.sheet) : closePad(r.pad)),
      Backspace: () => (r.kind === 'sheet' ? closeSheet(r.pad, r.sheet) : closePad(r.pad)),
    };
    const f = keys[e.key];
    if (!f) return;
    e.preventDefault();
    e.stopPropagation();
    f();
  };

  const tool = (icon: Parameters<typeof Icon>[0]['name'], title: string, label: string, run: () => void, extra = '') => (
    <button type="button" className={`overview__tool${extra}`} tabIndex={-1} title={title} aria-label={label} onClick={run}>
      <Icon name={icon} size={14} />
    </button>
  );

  const row = (r: Row) => {
    const key = rowKey(r);
    const pad = r.pad;
    const title = padTitle(ws, pad);
    const other = pad.desk !== p.win;
    const ref = (el: HTMLButtonElement | null) => {
      if (el) rowBtns.current.set(key, el);
      else rowBtns.current.delete(key);
    };
    if (r.kind === 'sheet' && editing === key)
      return (
        <li key={key} className="overview__row ncp__sheet is-edit">
          <input
            className="overview__input"
            title={DIALOG_TEXT.renameHint}
            value={draft}
            autoFocus
            aria-label={NC.renameLabel}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => commit(r.sheet, key)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') {
                e.preventDefault();
                commit(r.sheet, key);
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                setEditing(null);
                toRow(key);
              }
            }}
          />
        </li>
      );
    if (r.kind === 'pad') {
      const where = q || other ? deskTitle(pad.desk) : pad.docked && !notesOn(pad.desk) ? NC.dock : placeText(placeOf(ws, pad.desk, pad.id) ?? { x: 0.5, y: 0, w: 0.5, h: 1 });
      return (
        <li key={key} className={`overview__row ncp__pad${pad.docked ? ' is-docked' : ''}`}>
          <button
            ref={ref}
            type="button"
            className="overview__go"
            tabIndex={key === focusKey ? 0 : -1}
            aria-label={NC.padRow(title, pad.sheets.length, !!pad.docked, q || other ? deskTitle(pad.desk) : '')}
            title={NC.show}
            onFocus={() => setCur(key)}
            onKeyDown={(e) => onRowKey(e, r)}
            onClick={() => p.onShowPad(pad.id)}
          >
            <Icon name={pad.docked ? 'dock' : 'note'} size={14} className="icon ncp__kind" />
            <span className="overview__name">{title}</span>
            <span className="overview__host">{where}</span>
            <span className="overview__tabs">{pad.sheets.length}</span>
            <span className="overview__back">{pad.docked && (q || other) ? NC.dock : ''}</span>
          </button>
          {tool('swap', NC.move, `„${title}“ ${NC.move}`, () => setMoving(pad.id))}
          {other && tool('import', NC.fetch, `„${title}“ ${NC.fetch}`, () => fetch(pad))}
          {tool(pad.docked ? 'spread' : 'dock', pad.docked ? NC.dockOut : NC.dockIn, `„${title}“: ${pad.docked ? NC.dockOut : NC.dockIn}`, () => dock(pad))}
          {tool('close', NC.closePad, `Pad „${title}“ schließen`, () => closePad(pad), ' overview__tool--x')}
        </li>
      );
    }
    const name = sheetName(r.sheet);
    const n = idsIn(viewById(ws, r.sheet) ?? { id: '', name: '', kind: 'block' } as never).length;
    const front = pad.active === r.sheet;
    const main = (
      <li key={key} className={`overview__row ncp__sheet${front ? ' is-front' : ''}`}>
        <button
          ref={ref}
          type="button"
          className="overview__go"
          tabIndex={key === focusKey ? 0 : -1}
          aria-label={NC.sheetRow(name, n, front)}
          title={NC.show}
          onFocus={() => setCur(key)}
          onKeyDown={(e) => onRowKey(e, r)}
          onClick={() => p.onShowPad(pad.id, r.sheet)}
        >
          <span className="ncp__indent" aria-hidden="true" />
          <span className="overview__name">{name}</span>
          <span className="overview__host">{NC.notes(n)}</span>
          <span className="overview__tabs" />
          <span className="overview__back">{front && pad.sheets.length > 1 ? NC.front : ''}</span>
        </button>
        {tool('rename', NC.rename, `„${name}“ umbenennen`, () => startRename(pad, r.sheet))}
        {tool('close', NC.closeSheet, `Sheet „${name}“ schließen`, () => closeSheet(pad, r.sheet), ' overview__tool--x')}
      </li>
    );
    // V87 (BC1–BC3): Abbild des gewählten Sheets direkt darunter – Kanban als Mini-Board, To-do als Fortschritt
    const v = viewById(ws, r.sheet);
    const glance =
      key === focusKey && v?.kind === 'kanban' ? (
        <li key={`${key}:glance`} className="ncp__glance" aria-label={NC.miniBoard(name)}>
          <ul className="ncp__mini" role="list">
            {Sh.boardSummary(ws, v).map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={`ncp__minicol${c.over ? ' is-over' : ''}`}
                  title={NC.miniCol(c.name, c.count, c.wip)}
                  aria-label={`${NC.miniCol(c.name, c.count, c.wip)}${c.over ? `, ${NC.over}` : ''}${c.review ? `, ${NC.review(c.review)}` : ''}`}
                  onClick={() => (p.onShowPad(pad.id, r.sheet), focusColLater(r.sheet, c.id))}
                >
                  <span className="ncp__minihead">
                    <Icon name={COL_STATE_ICON[c.state]} size={10} /> {c.name}
                  </span>
                  <span className="ncp__minicards" aria-hidden="true">
                    {Array.from({ length: Math.min(c.count, 8) }, (_, i) => (
                      <i key={i} />
                    ))}
                    {c.count > 8 && <b>+{c.count - 8}</b>}
                  </span>
                  <span className="ncp__mininum">
                    {c.wip ? `${c.count} / ${c.wip}` : c.count}
                    {c.over && ` · ! ${NC.over}`}
                    {c.review > 0 && ` · ${NC.review(c.review)}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </li>
      ) : key === focusKey && v?.kind === 'todo' ? (
        (() => {
          const t = Sh.todoSummary(ws, v);
          return (
            <li key={`${key}:glance`} className="ncp__glance">
              <span className="ncp__bar" role="meter" aria-valuemin={0} aria-valuemax={t.all || 1} aria-valuenow={t.done} aria-label={NC.todoBar(t.done, t.all)} title={NC.todoBar(t.done, t.all)}>
                <span style={{ width: `${t.all ? (t.done / t.all) * 100 : 0}%` }} />
              </span>
              <span className="ncp__mininum">{NC.todoBar(t.done, t.all)}</span>
            </li>
          );
        })()
      ) : null;
    return (
      <Fragment key={key}>
        {main}
        {glance}
      </Fragment>
    );
  };

  const map = (d: (typeof desks)[number]) => {
    const pads = padsOn(ws, d.id);
    const ds = dockOf(ws, d.id);
    return (
      <section key={d.id || 'main'} className={d.here ? 'radar__win' : 'radar__win is-other'} aria-label={d.here ? `Dieser Desk · ${d.title}` : d.title}>
        <div className="radar__win-head">
          <strong>
            <Icon name="desk" className="icon radar__win-icon" />
            {d.here ? `Dieser Desk · ${d.title}` : d.title}
          </strong>
          <span className="muted">{NC.pads(pads.length)}</span>
        </div>
        <div className="radar__map ncp__map" data-win={d.id} style={{ ['--ar' as string]: d.aspect }}>
          {/* Slots nur blass als Lage – Pads verdecken Portale (P4) */}
          {d.areas.map((a) => {
            const r = a.rect ?? { x: 0, y: 0, w: 1, h: 1 };
            const band = bandOf(d.id);
            return (
              <span
                key={a.id}
                className="ncp__slot"
                aria-hidden="true"
                style={{ left: `calc(${r.x * (1 - band) * 100}% + 2px)`, top: `calc(${r.y * 100}% + 2px)`, width: `calc(${r.w * (1 - band) * 100}% - 4px)`, height: `calc(${r.h * 100}% - 4px)` }}
              >
                {a.title}
              </span>
            );
          })}
          {pads.length === 0 && <span className="ncp__none">{NC.emptyDesk}</span>}
          {tiles
            .filter((t) => t.desk === d.id)
            .map((t) => {
              const r = t.rect;
              const on = t.id === selTile?.id;
              const list = padsOfTile(t);
              const hit = q && list.some(padMatches);
              const title = t.pad ? padTitle(ws, t.pad) : NC.dock;
              const state = t.dock ? (ds.off ? NC.dockOff : ds.folded ? NC.dockFolded : '') : '';
              const isTop = !!t.pad && topOf(d.id)?.id === t.pad.id;
              const noPlace = !!t.pad && !placeOf(ws, d.id, t.pad.id);
              const cls = ['ncp__tile', t.dock ? 'ncp__dock' : 'ncp__frame', on && 'is-sel', isTop && 'is-top', q && (hit ? 'is-hit' : 'is-miss'), ds.off && t.dock && 'is-off', noPlace && 'is-noplace'].filter(Boolean).join(' ');
              return (
                <button
                  key={t.id}
                  ref={(el) => {
                    if (el) tileBtns.current.set(t.id, el);
                    else tileBtns.current.delete(t.id);
                  }}
                  type="button"
                  className={cls}
                  style={{ left: `calc(${r.x * 100}% + 3px)`, top: `calc(${r.y * 100}% + 3px)`, width: `calc(${r.w * 100}% - 6px)`, height: `calc(${r.h * 100}% - 6px)` }}
                  tabIndex={on ? 0 : -1}
                  aria-pressed={on}
                  title={noPlace ? NC.noPlace : undefined}
                  aria-label={t.dock ? NC.dockTile(list.length, state) : NC.tile(title, t.pad!.sheets.length, noPlace ? NC.noPlace : placeText(placeOf(ws, d.id, t.pad!.id)!))}
                  onFocus={() => setSel(t.id)}
                  onClick={() => setSel(t.id)}
                  onDoubleClick={() => list[0] && toRow(`p:${list[0].id}`)}
                  onKeyDown={(e) => onTileKey(e, t)}
                >
                  <span className="ncp__title">
                    <Icon name={t.dock ? 'dock' : 'note'} size={12} className="icon" /> {t.dock ? `${NC.dock} · ${list.length}` : title}
                  </span>
                  {t.pad && t.pad.sheets.length > 1 && <span className="radar__front">{NC.sheets(t.pad.sheets.length)}</span>}
                  {state && <span className="ncp__state">{state}</span>}
                </button>
              );
            })}
        </div>
      </section>
    );
  };

  const total = (ws.pads ?? []).length;
  const head = q ? NC.hits(visiblePads.length, p.query.trim()) : selTile ? NC.head(selTile.dock ? `${deskTitle(selTile.desk)} · ${NC.dock}` : deskTitle(selTile.desk), padsOfTile(selTile).length) : '';
  const movingPad = moving ? (ws.pads ?? []).find((x) => x.id === moving) : undefined;

  if (total === 0) return <p className="overview__empty">{NC.empty}</p>;
  return (
    <div className="radar ncp">
      <p id="ncp-help" className="sr-only">
        {NC.help}
      </p>
      <div className="radar__maps">{desks.map(map)}</div>
      <div className="radar__side">
        <section className="radar__detail" aria-label={head} aria-describedby="ncp-help">
          <h3 className="radar__detail-head">{head}</h3>
          {movingPad && (
            <DeskPicker
              title={NC.moveTitle(padTitle(ws, movingPad))}
              desks={desks.map((d) => ({ id: d.id, title: d.here ? `${d.title} (${NC.sameDesk})` : d.title, disabled: d.id === movingPad.desk }))}
              onCancel={() => {
                setMoving(null);
                toRow(`p:${movingPad.id}`);
              }}
              onPick={(desk) => {
                p.onToDesk(movingPad.id, desk);
                p.say(NC.movedTo(padTitle(ws, movingPad), deskTitle(desk)));
                setMoving(null);
                setSel(movingPad.id);
                toRow(`p:${movingPad.id}`);
              }}
            />
          )}
          {rows.length === 0 ? <p className="overview__empty">{q ? NC.none : NC.emptyDesk}</p> : <ul className="overview__list">{rows.map(row)}</ul>}
          {/* V87 (BC3, Enrico): Übersicht aller Matrizen mit offenen Karten je Feld */}
          {Sh.matricesOf(ws).length > 0 && (
            <section className="ncp__matrices" aria-label={NC.matrices}>
              <h4 className="ncp__subhead">
                <Icon name="matrix" size={13} /> {NC.matrices}
              </h4>
              <ul>
                {Sh.matricesOf(ws).map((m) => {
                  const s = Sh.matrixSummary(ws, m);
                  const label = NC.matrixRow(m.name, s.open, s.quads[1], s.quads[2], s.quads[3], s.quads[4], s.unsorted, s.done);
                  return (
                    <li key={m.id}>
                      <button type="button" className="ncp__matrix" aria-label={label} title={NC.show} onClick={() => showMatrix(m.id)}>
                        <span className="ncp__matrixname">{m.name}</span>
                        <span className="sign">{NC.openN(s.open)}</span>
                        {([1, 2, 3, 4] as Sh.Quad[]).map((q) => (
                          <span key={q} className={`sign${q === 1 ? ' sign--urg' : ''}`}>{Sh.QUAD_NAME[q]} {s.quads[q]}</span>
                        ))}
                        {s.unsorted > 0 && <span className="sign">{NC.unsortedN(s.unsorted)}</span>}
                        <span className="sign">{NC.doneN(s.done)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          {/* Meldung am Ort (F-214): direkt unter der Liste, 2 s, mit Rückgängig */}
          {undo && (
            <p className="ncp__undo" role="status">
              {undo.text} ·{' '}
              <button
                type="button"
                onClick={() => {
                  undo.run();
                  setUndo(null);
                }}
              >
                {NC.undo}
              </button>
            </p>
          )}
          {p.opacity && (
            <ul className="ncp__opacity" role="group" aria-label={NC.opacity}>
              <OpacitySlider label={PAD_TEXT.opacityPads} hint={PAD_TEXT.opacityHint} value={p.opacity.pads} onChange={p.opacity.setPads} />
              <OpacitySlider label={PAD_TEXT.opacityDock} hint={PAD_TEXT.opacityDockHint} value={p.opacity.dock} onChange={p.opacity.setDock} />
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

/** N10: Ziel-Desk wählen – gleiche Bedienung wie „Verschieben nach …“ bei den Portalen. */
function DeskPicker(props: { title: string; desks: { id: string; title: string; disabled: boolean }[]; onPick: (desk: string) => void; onCancel: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.querySelector<HTMLButtonElement>('button.overview__target:not(:disabled)')?.focus();
  }, []);
  const onKey = (e: KeyboardEvent) => {
    const all = [...(box.current?.querySelectorAll<HTMLButtonElement>('button.overview__target:not(:disabled)') ?? [])];
    const i = all.indexOf(document.activeElement as HTMLButtonElement);
    const go = (k: number) => all[(k + all.length) % all.length]?.focus();
    const keys: Record<string, () => void> = { ArrowDown: () => go(i + 1), ArrowUp: () => go(i - 1), Home: () => go(0), End: () => go(all.length - 1), Escape: props.onCancel };
    const f = keys[e.key];
    if (!f) return;
    e.preventDefault();
    e.stopPropagation();
    f();
  };
  const usable = props.desks.filter((d) => !d.disabled);
  return (
    <div ref={box} className="overview__pick" role="group" aria-label={props.title} onKeyDown={onKey}>
      <div className="overview__pick-head">
        <strong>{props.title}</strong>
        <button type="button" className="overview__x" onClick={props.onCancel} title="Abbrechen (Esc)" aria-label="Verschieben abbrechen">
          <Icon name="close" size={14} />
        </button>
      </div>
      {usable.length === 0 && <p className="overview__empty">Es gibt keinen anderen Desk.</p>}
      <ul className="overview__pick-list">
        {props.desks.map((d) => (
          <li key={d.id || 'main'}>
            <button type="button" className="overview__target" disabled={d.disabled} onClick={() => props.onPick(d.id)}>
              {d.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
