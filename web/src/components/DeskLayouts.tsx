/**
 * F-51/F-187: Layouts eines Desks im Cockpit (Modus „Layouts“) und der Dialog „Standard-Layout“.
 *
 * Oben die Layouts als kleine Karten (Mini-Anordnung, Name, Zahlen). Ein Klick zeigt ein Layout nur
 * an – die Arbeitsfläche bleibt, erst „Wechseln“ baut sie um. Darunter die Anordnung groß: Slots
 * über der Empfehlung schraffiert und beschriftet. Werkzeuge gelten für Slots (Platz tauschen,
 * schließen) und Layouts (wechseln, umbenennen, kopieren, löschen, anlegen).
 * Tastatur (NF-03): Pfeile zwischen Karten bzw. Slots, Enter wählt, Esc bricht Tauschen ab.
 */
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './Icon';
import * as DL from '../workspace/deskLayouts';
import { screenClass, specOf, type ScreenSetup } from '../workspace/screen';
import { DESK_LAYOUT_TEXT as LT } from '../workspace/terms';
import type { Workspace } from '../workspace/types';
import type { Action } from '../workspace/useWorkspace';

/** Bedienung der Layouts, die App bereitstellt (Hinweise, Rückgängig, Gerätemerker). */
export interface LayoutOps {
  /** Portale der Vorlage „Gleichmäßig“ auf diesem Bildschirm. */
  evenCount: number;
  onSwitch: (id: string) => void;
  onAdd: (from: 'current' | 'even', name: string) => void;
  onRename: (id: string, name: string) => void;
  onCopy: (id: string) => void;
  onDelete: (id: string) => void;
  /** Name des zuletzt gelöschten Layouts, solange Rückgängig geht. */
  undoName: string | null;
  onUndo: () => void;
  /** F-52: Standard-Layout dieses Geräts (nur gültige Verweise); null = „Gleichmäßig“. */
  standard: { win: string; id: string } | null;
  onStandard: (id: string | null) => void;
  onReset: () => void;
  resetUndoName: string | null;
  onResetUndo: () => void;
}

interface Props {
  ws: Workspace;
  win: string;
  desk: string;
  setup: ScreenSetup;
  ops: LayoutOps;
  dispatch: (a: Action) => void;
  say: (text: string) => void;
}

/** Kleine Anordnung als Kästchen (nur Bild; Zahlen stehen daneben als Text). */
function Mini({ slots, ar }: { slots: DL.LayoutSlot[]; ar: number }) {
  return (
    <span className="lc__mini" style={{ ['--ar' as string]: ar }} aria-hidden="true">
      {slots.map((s) => (
        <span
          key={s.id}
          className={s.over ? 'lc__mini-slot is-over' : 'lc__mini-slot'}
          style={{ left: `calc(${s.rect.x * 100}% + 1px)`, top: `calc(${s.rect.y * 100}% + 1px)`, width: `calc(${s.rect.w * 100}% - 2px)`, height: `calc(${s.rect.h * 100}% - 2px)` }}
        />
      ))}
    </span>
  );
}

export function LayoutCockpit({ ws, win, desk, setup, ops, dispatch, say }: Props) {
  const d = DL.layoutsOf(ws, win);
  const [viewed, setViewed] = useState(d.active);
  const [sel, setSel] = useState<string | null>(null);
  const [swapFrom, setSwapFrom] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [asking, setAsking] = useState(false);
  const [adding, setAdding] = useState(false);
  const [from, setFrom] = useState<'current' | 'even'>('even');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [stdOpen, setStdOpen] = useState(false);
  const [slotUndo, setSlotUndo] = useState<{ id: string; content: DL.LayoutContent; text: string } | null>(null);
  const cards = useRef(new Map<string, HTMLButtonElement>());
  const tiles = useRef(new Map<string, HTMLButtonElement>());
  const stdBtn = useRef<HTMLButtonElement>(null);
  const focusLater = (f: () => void) => window.setTimeout(f, 0);

  // Beim Öffnen: Fokus auf die Karte des aktiven Layouts.
  useEffect(() => {
    focusLater(() => cards.current.get(d.active)?.focus());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Nach Wechseln, Anlegen oder Löschen: das aktive Layout anzeigen.
  const first = useRef(true);
  useEffect(() => {
    setViewed(d.active);
    if (first.current) first.current = false;
    else focusLater(() => cards.current.get(d.active)?.focus());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.active]);
  const shown = d.list.find((l) => l.id === viewed) ?? d.list.find((l) => l.id === d.active)!;
  const views = useMemo(() => new Map(d.list.map((l) => [l.id, DL.layoutView(ws, win, l.id, setup)])), [ws, win, setup, d.list]);
  const v = views.get(shown.id)!;
  const spec = specOf(setup);
  const ar = spec.aspect;
  const isActive = shown.id === d.active;
  const isStd = (id: string) => !!ops.standard && ops.standard.win === win && ops.standard.id === id;
  const over = v.slots.filter((s) => s.over).length;
  const selSlot = v.slots.find((s) => s.id === sel) ?? null;
  const full = d.list.length >= DL.LAYOUT_MAX;
  const taken = (n: string, except?: string) => d.list.some((l) => l.id !== except && l.name === n.trim());
  const std = ops.standard ? DL.layoutView(ws, ops.standard.win, ops.standard.id, setup) : null;
  const stdSlots = std ? std.slots.length : ops.evenCount;
  const device = `${screenClass(setup.cls).label}, ${setup.orientation === 'landscape' ? 'quer' : 'hoch'}${spec.capacity >= 4 ? `, ${spec.lines === 2 ? '2 Zeilen' : '1 Zeile'}` : ''}`;

  const show = (id: string) => {
    setViewed(id);
    setSel(null);
    setSwapFrom(null);
    setEditing(false);
    setAsking(false);
    setError('');
  };
  const onCardKey = (e: KeyboardEvent, i: number) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = d.list[(i + step + d.list.length) % d.list.length];
    cards.current.get(next.id)?.focus();
  };
  const onTileKey = (e: KeyboardEvent, i: number) => {
    if (e.key === 'Escape' && swapFrom) {
      e.preventDefault();
      e.stopPropagation();
      setSwapFrom(null);
      say(LT.swapCancel);
      return;
    }
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step || v.slots.length === 0) return;
    e.preventDefault();
    const next = v.slots[(i + step + v.slots.length) % v.slots.length];
    tiles.current.get(next.id)?.focus();
  };
  const pickTile = (id: string) => {
    if (swapFrom && swapFrom !== id) {
      const a = v.slots.find((s) => s.id === swapFrom);
      const b = v.slots.find((s) => s.id === id);
      dispatch({ type: 'layoutSlotSwap', win, id: shown.id, setup, a: swapFrom, b: id });
      setSwapFrom(null);
      say(LT.swapped(a?.title ?? '', b?.title ?? ''));
      setSel(swapFrom);
      focusLater(() => tiles.current.get(swapFrom)?.focus());
      return;
    }
    setSwapFrom(null);
    setSel(id);
  };
  const closeSel = () => {
    if (!selSlot) return;
    const before = DL.contentOf(ws, win, shown.id);
    if (!before || !DL.closeLayoutSlot(ws, win, shown.id, setup, selSlot.id)) return say(v.slots.length < 2 ? LT.slotLast : LT.slotNoRoom);
    dispatch({ type: 'layoutSlotClose', win, id: shown.id, setup, area: selSlot.id });
    const text = LT.slotClosed(selSlot.title, selSlot.count);
    setSlotUndo({ id: shown.id, content: before, text });
    say(text);
    setSel(null);
    focusLater(() => document.getElementById('lc-slot-undo')?.focus());
  };

  return (
    <div className="lc">
      {/* Eindeutig erkennbar: Band oben, Radar anders gerahmt */}
      <div className="lc__band" role="note">
        <Icon name="layouts" size={15} className="icon icon--inline" />
        <strong>{LT.modeTitle}</strong>
        <span>
          {LT.device}: {device} · <span title={LT.moreTerm}>{LT.recommended(v.recommended)}</span>
        </span>
      </div>

      <ul className="lc__cards" aria-label={LT.title(desk)}>
        {d.list.map((l, i) => {
          const lv = views.get(l.id)!;
          const on = l.id === shown.id;
          return (
            <li key={l.id}>
              <button
                type="button"
                ref={(el) => {
                  if (el) cards.current.set(l.id, el);
                  else cards.current.delete(l.id);
                }}
                className={`lc__card${on ? ' is-sel' : ''}${l.id === d.active ? ' is-active' : ''}`}
                aria-pressed={on}
                aria-label={`${l.name}${l.id === d.active ? `, ${LT.active}` : ''}${isStd(l.id) ? `, ${LT.standardBadge}` : ''}, ${LT.counts(lv.slots.length, lv.portals)}`}
                onClick={() => show(l.id)}
                onKeyDown={(e) => onCardKey(e, i)}
              >
                <Mini slots={lv.slots} ar={ar} />
                <span className="lc__card-name">{l.name}</span>
                <span className="lc__card-meta">
                  {l.id === d.active && <b>{LT.active}</b>}
                  {isStd(l.id) && <b>{LT.standardBadge}</b>}
                  {LT.counts(lv.slots.length, lv.portals)}
                </span>
              </button>
            </li>
          );
        })}
        <li>
          <button type="button" id="lc-add" className="lc__card lc__card--add" aria-expanded={adding} disabled={full} title={full ? LT.full(DL.LAYOUT_MAX) : undefined} onClick={() => setAdding(!adding)}>
            <Icon name="plus" size={14} className="icon icon--inline" /> {LT.add}
          </button>
        </li>
      </ul>

      {adding && (
        <form
          className="layouts__new lc__new"
          aria-label={LT.add}
          onSubmit={(e) => {
            e.preventDefault();
            if (full) return setError(LT.full(DL.LAYOUT_MAX));
            if (name.trim() && taken(name)) return setError(LT.nameTaken);
            ops.onAdd(from, name);
            setAdding(false);
            setName('');
          }}
        >
          <label className="layouts__label">
            {LT.name}
            <input autoFocus value={name} maxLength={40} placeholder={`${LT.defaultName} ${d.list.length + 1}`} onChange={(e) => { setName(e.target.value); setError(''); }} />
          </label>
          <fieldset className="layouts__from">
            <legend>{LT.addFrom}</legend>
            <label>
              <input type="radio" name="lc-from" checked={from === 'even'} onChange={() => setFrom('even')} /> {LT.even}
              <span className="help__text"> – {LT.evenHint(ops.evenCount)}</span>
            </label>
            <label>
              <input type="radio" name="lc-from" checked={from === 'current'} onChange={() => setFrom('current')} /> {LT.current}
            </label>
          </fieldset>
          <div className="layouts__tools">
            <button type="submit" className="help__run">
              <Icon name="plus" size={13} className="icon icon--inline" /> {LT.create}
            </button>
            <button type="button" className="help__run" onClick={() => { setAdding(false); focusLater(() => document.getElementById('lc-add')?.focus()); }}>
              {LT.cancel}
            </button>
          </div>
        </form>
      )}

      <div className="lc__body">
        <section className="lc__view" aria-label={`${shown.name}: ${LT.arrangement}`}>
          <div className="lc__map radar__map" style={{ ['--ar' as string]: ar }}>
            {v.slots.map((s, i) => {
              const cls = ['radar__tile', 'lc__tile', s.id === sel && 'is-sel', s.over && 'is-over', swapFrom === s.id && 'is-from', swapFrom && swapFrom !== s.id && 'is-target'].filter(Boolean).join(' ');
              return (
                <button
                  key={s.id}
                  type="button"
                  ref={(el) => {
                    if (el) tiles.current.set(s.id, el);
                    else tiles.current.delete(s.id);
                  }}
                  className={cls}
                  style={{ left: `calc(${s.rect.x * 100}% + 2px)`, top: `calc(${s.rect.y * 100}% + 2px)`, width: `calc(${s.rect.w * 100}% - 4px)`, height: `calc(${s.rect.h * 100}% - 4px)` }}
                  tabIndex={s.id === (sel ?? v.slots[0]?.id) ? 0 : -1}
                  aria-pressed={s.id === sel}
                  aria-label={`${s.title}, ${LT.portalsOf(s.count)}${s.over ? `, ${LT.overMark}` : ''}${swapFrom && swapFrom !== s.id ? `, ${LT.swapHere}` : ''}`}
                  onFocus={() => !swapFrom && setSel(s.id)}
                  onClick={() => pickTile(s.id)}
                  onKeyDown={(e) => onTileKey(e, i)}
                >
                  <span className="radar__title">{s.title}</span>
                  <span className="lc__tile-meta">{LT.portalsOf(s.count)}</span>
                  {s.over && <span className="lc__over">{LT.overMark}</span>}
                </button>
              );
            })}
          </div>
          {swapFrom && (
            <p className="lc__hint" role="status">
              {LT.swapPick(v.slots.find((s) => s.id === swapFrom)?.title ?? '')}{' '}
              <button type="button" className="help__run" onClick={() => { setSwapFrom(null); focusLater(() => tiles.current.get(swapFrom)?.focus()); }}>
                {LT.cancel}
              </button>
            </p>
          )}
        </section>

        <section className="lc__side" aria-labelledby="lc-name">
          {editing ? (
            <form
              className="help__row"
              onSubmit={(e) => {
                e.preventDefault();
                if (taken(draft, shown.id)) return setError(LT.nameTaken);
                if (draft.trim()) ops.onRename(shown.id, draft);
                setEditing(false);
                setError('');
                focusLater(() => document.getElementById('lc-rename')?.focus());
              }}
            >
              <label className="layouts__label">
                {LT.name}
                <input autoFocus value={draft} maxLength={40} aria-invalid={!!error} onChange={(e) => { setDraft(e.target.value); setError(''); }} onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); setEditing(false); } }} />
              </label>
              <button type="submit" className="help__run">OK</button>
            </form>
          ) : (
            <h3 id="lc-name" className="lc__name">
              {shown.name}
              {isActive ? <span className="layouts__badge"> · {LT.active}</span> : <span className="lc__muted"> · {LT.notActive}</span>}
              {isStd(shown.id) && <span className="layouts__badge"> · {LT.standardBadge}</span>}
            </h3>
          )}
          <ul className="lc__facts">
            <li>{LT.counts(v.slots.length, v.portals)}</li>
            <li className={over ? 'is-over' : undefined}>{over ? LT.overCount(over) : LT.withinRec(v.recommended)}</li>
            <li title={LT.standardTerm}>{LT.stdSlots(stdSlots)}</li>
          </ul>
          {!isActive && (
            <button type="button" className="help__run lc__switch" onClick={() => ops.onSwitch(shown.id)}>
              <Icon name="layouts" size={13} className="icon icon--inline" /> {LT.switchTo}
            </button>
          )}

          <h4 className="lc__sub">{selSlot ? LT.slotHead(selSlot.title) : LT.slotNone}</h4>
          <div className="layouts__tools">
            <button type="button" className="help__run" aria-disabled={!selSlot || v.slots.length < 2} onClick={() => {
              if (!selSlot || v.slots.length < 2) return say(LT.slotNone);
              setSwapFrom(selSlot.id);
              say(LT.swapPick(selSlot.title));
              const other = v.slots.find((s) => s.id !== selSlot.id);
              focusLater(() => other && tiles.current.get(other.id)?.focus());
            }}>
              <Icon name="swap" size={13} className="icon icon--inline" /> {LT.swap}
            </button>
            <button type="button" className="help__run" aria-disabled={!selSlot} onClick={() => (selSlot ? closeSel() : say(LT.slotNone))}>
              <Icon name="close" size={13} className="icon icon--inline" /> {LT.slotClose}
            </button>
          </div>
          {slotUndo && (
            <p className="layouts__undo" role="status">
              {slotUndo.text}{' '}
              <button type="button" id="lc-slot-undo" className="help__run" onClick={() => { dispatch({ type: 'layoutContent', win, id: slotUndo.id, content: slotUndo.content }); say(LT.slotUndone); setSlotUndo(null); focusLater(() => (tiles.current.values().next().value as HTMLButtonElement | undefined)?.focus()); }}>
                {LT.undo}
              </button>
            </p>
          )}

          <h4 className="lc__sub">{LT.layoutHead}</h4>
          {asking ? (
            <div className="layouts__ask" role="group" aria-labelledby="lc-ask">
              <span id="lc-ask">{LT.askRemove(shown.name, v.portals)}</span>
              <button type="button" className="help__run" autoFocus onClick={() => { setAsking(false); ops.onDelete(shown.id); focusLater(() => document.getElementById('lc-undo')?.focus()); }}>
                {LT.remove}
              </button>
              <button type="button" className="help__run" onClick={() => { setAsking(false); focusLater(() => document.getElementById('lc-del')?.focus()); }}>
                {LT.cancel}
              </button>
            </div>
          ) : (
            <div className="layouts__tools">
              <button type="button" id="lc-rename" className="help__run" onClick={() => { setEditing(true); setDraft(shown.name); setError(''); }}>
                <Icon name="rename" size={13} className="icon icon--inline" /> {LT.rename}
              </button>
              <button type="button" className="help__run" aria-disabled={full} title={full ? LT.full(DL.LAYOUT_MAX) : undefined} onClick={() => (full ? setError(LT.full(DL.LAYOUT_MAX)) : ops.onCopy(shown.id))}>
                <Icon name="copy" size={13} className="icon icon--inline" /> {LT.copy}
              </button>
              <button type="button" id="lc-del" className="help__run" aria-disabled={d.list.length < 2} title={d.list.length < 2 ? LT.last : undefined} onClick={() => (d.list.length < 2 ? setError(LT.last) : setAsking(true))}>
                <Icon name="remove" size={13} className="icon icon--inline" /> {LT.remove}
              </button>
            </div>
          )}
          {ops.undoName && (
            <p className="layouts__undo" role="status">
              {LT.removed(ops.undoName)}{' '}
              <button type="button" id="lc-undo" className="help__run" onClick={ops.onUndo}>
                {LT.undo}
              </button>
            </p>
          )}
          {error && (
            <p className="layouts__error" role="alert">
              {error}
            </p>
          )}
          <button type="button" ref={stdBtn} className="help__run lc__std" onClick={() => setStdOpen(true)} title={LT.standardTerm}>
            <Icon name="star" size={13} className="icon icon--inline" /> {LT.standardMenu}
          </button>
        </section>
      </div>
      {stdOpen && (
        <StandardLayout
          ws={ws}
          win={win}
          desk={desk}
          setup={setup}
          ops={ops}
          onClose={() => {
            setStdOpen(false);
          }}
        />
      )}
    </div>
  );
}

/**
 * F-187: Dialog „Standard-Layout“ – getrennt vom Wechseln. Wählt, womit auf diesem Gerät neue Desks
 * starten, und setzt das aktive Layout auf den Standard zurück (mit Rückfrage und Rückgängig).
 */
export function StandardLayout({ ws, win, desk, setup, ops, onClose }: { ws: Workspace; win: string; desk: string; setup: ScreenSetup; ops: LayoutOps; onClose: () => void }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const d = DL.layoutsOf(ws, win);
  const [askReset, setAskReset] = useState(false);
  const std = ops.standard;
  const stdName = std ? (DL.layoutsOf(ws, std.win).list.find((l) => l.id === std.id)?.name ?? LT.even) : LT.even;
  const stdDesk = std && std.win !== win ? (std.win ? (ws.windows.find((w) => w.id === std.win)?.name ?? '') : 'Main Desk') : '';
  const activeName = DL.activeLayout(ws, win).name;
  const choice = std && std.win === win ? std.id : std ? 'other' : 'even';
  /** Knopf, der den Dialog geöffnet hat – schon beim ersten Zeichnen gemerkt (Effekte laufen im Test doppelt). */
  const [back] = useState(() => document.activeElement as HTMLElement | null);

  useEffect(() => {
    const el = dlg.current;
    if (!el) return;
    if (!el.open) el.showModal();
    el.querySelector<HTMLElement>('input:checked')?.focus();
    // Fokus zurück auf den Knopf, der den Dialog geöffnet hat (NF-03).
    return () => {
      window.setTimeout(() => back?.isConnected && back.focus(), 0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <dialog
      ref={dlg}
      className="help layouts"
      aria-labelledby="std-title"
      aria-describedby="std-intro"
      onClose={onClose}
      onKeyDown={(e) => e.key === 'Escape' && e.stopPropagation()}
      onCancel={(e) => {
        e.preventDefault();
        if (askReset) return setAskReset(false);
        onClose();
      }}
      onClick={(e) => e.target === dlg.current && onClose()}
    >
      <header className="help__head">
        <h2 id="std-title">
          <Icon name="star" size={16} className="icon icon--inline" /> {LT.standardTitle}
        </h2>
        <button type="button" className="help__x" onClick={onClose} title="Schließen (Esc)" aria-label={`${LT.standardTitle} schließen`}>
          <Icon name="close" size={14} />
        </button>
      </header>
      <p className="help__intro" id="std-intro">
        {LT.standardTerm}.
      </p>
      <div className="help__body">
        <p className="help__text" id="std-is">
          {LT.standardIs(stdName, stdDesk)}
        </p>
        <fieldset className="layouts__from">
          <legend>{LT.standardPick(desk)}</legend>
          <label>
            <input type="radio" name="std-pick" checked={choice === 'even'} onChange={() => ops.onStandard(null)} /> {LT.even}
            <span className="help__text"> – {LT.evenHint(ops.evenCount)}</span>
          </label>
          {d.list.map((l) => (
            <label key={l.id}>
              <input type="radio" name="std-pick" checked={choice === l.id} onChange={() => ops.onStandard(l.id)} /> {l.name}
              <span className="help__text"> – {((v) => LT.counts(v.slots.length, v.portals))(DL.layoutView(ws, win, l.id, setup))}</span>
            </label>
          ))}
          {choice === 'other' && (
            <label>
              <input type="radio" name="std-pick" checked readOnly /> {stdName} ({stdDesk})
            </label>
          )}
        </fieldset>
        <div className="layouts__std lc__reset">
          <p className="help__text">{LT.resetHint(activeName)}</p>
          {askReset ? (
            <div className="layouts__ask" role="group" aria-labelledby="std-ask">
              <span id="std-ask">{LT.askReset(activeName, stdName)}</span>
              <button type="button" className="help__run" onClick={() => { setAskReset(false); ops.onReset(); window.setTimeout(() => document.getElementById('std-reset-undo')?.focus(), 0); }}>
                {LT.reset}
              </button>
              <button type="button" className="help__run" autoFocus onClick={() => { setAskReset(false); window.setTimeout(() => document.getElementById('std-reset')?.focus(), 0); }}>
                {LT.cancel}
              </button>
            </div>
          ) : (
            <button type="button" id="std-reset" className="help__run" aria-describedby="std-is" onClick={() => setAskReset(true)}>
              <Icon name="restore" size={13} className="icon icon--inline" /> {LT.reset}
            </button>
          )}
          {ops.resetUndoName && (
            <p className="layouts__undo" role="status">
              {LT.resetDone(ops.resetUndoName, stdName)}{' '}
              <button type="button" id="std-reset-undo" className="help__run" onClick={() => { ops.onResetUndo(); window.setTimeout(() => document.getElementById('std-reset')?.focus(), 0); }}>
                {LT.undo}
              </button>
            </p>
          )}
        </div>
      </div>
    </dialog>
  );
}
