/**
 * F-206 Schritt 3 (V67): Pad – schwebendes Fenster über dem Desk mit Sheets als Reitern.
 * Logik in workspace/pads.ts; hier nur Darstellung, Ziehen/Größe und Tastatur.
 * Entscheidungen: Claude Doc „Pads mit Notizblock und Lageplan“ (P1–P9).
 */
import { type CSSProperties, type Dispatch, type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { NoteViewKind, Pad as PadT, PadPlace, Workspace } from '../workspace/types';
import * as No from '../workspace/notes';
import { PAD_MIN } from '../workspace/pads';
import { PAD_SHEETS_MAX } from '../workspace/noteObjects';
import { DRAFT_TEXT, NOTE_TEXT, PAD_TEXT, TERMS } from '../workspace/terms';
import { newId } from '../workspace/workspace';
import { NoteTab } from './NoteTab';
import { Item, Menu } from './PanelFrame';
import { Icon } from './Icon';
import { useDisplay } from './SiteIcon';
import { OPACITY_MIN, OPACITY_STEP, setPadOpacity } from '../workspace/display';
import type { IconName } from '../workspace/icons';

const KIND_ICON: Record<NoteViewKind, IconName> = { block: 'note', todo: 'todo', kanban: 'kanban', eisenhower: 'matrix' };
const KINDS: NoteViewKind[] = ['block', 'todo', 'kanban', 'eisenhower'];
const explain = (t: string) => t.replace(/^[^=]*=\s*/, '');
/** Schritt der Tastatur (Anteil der Desk-Fläche). */
const STEP = 0.02;
/** V68: Taste gedrückt halten = großer Schritt (statt eigener Tastenkombination – Alt+Strg/⌘+Pfeil wechselt im Browser den Tab). */
const STEP_HOLD = 0.06;

type Edge = 'n' | 's' | 'e' | 'w' | 'se';

export interface PadProps {
  ws: Workspace;
  dispatch: Dispatch<Action>;
  pad: PadT;
  desk: string;
  place: PadPlace;
  /** Innenmaß der Fläche und Abstand (wie die Slots). */
  box: { w: number; h: number; gap: number };
  top: boolean;
  /** Stapelhöhe (DOM-Reihenfolge bleibt fest, damit der Fokus beim Nach-oben-Holen nicht verloren geht). */
  z: number;
  /** Geöffnete Note je Notizblock. */
  picked: Record<string, string>;
  onPick: (sheet: string, note: string | null) => void;
  notify: (text: string) => void;
  say: (text: string) => void;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function Pad({ ws, dispatch, pad, desk, place, box, top, z, picked, onPick, notify, say }: PadProps) {
  const [live, setLive] = useState<PadPlace | null>(null);
  const [renaming, setRenaming] = useState(false);
  const display = useDisplay();
  const minW = Math.min(1, PAD_MIN.w / box.w);
  const minH = Math.min(1, PAD_MIN.h / box.h);
  const sheet = No.viewById(ws, pad.active);
  const tabsRef = useRef<HTMLDivElement>(null);
  const self = useRef<HTMLElement>(null);

  const raise = () => {
    if (!top) dispatch({ type: 'padRaise', id: pad.id });
  };
  const commit = (next: PadPlace) => dispatch({ type: 'padPlace', desk, id: pad.id, place: next });

  // ---------------------------------------------------------------- Ziehen und Größe
  const fit = (r: PadPlace): PadPlace => {
    const w = clamp(r.w, minW, 1);
    const h = clamp(r.h, minH, 1);
    return { x: clamp(r.x, 0, 1 - w), y: clamp(r.y, 0, 1 - h), w, h };
  };
  // gezeigt wird immer mindestens 260 × 200 px und ganz im Desk (z. B. nach kleinerem Fenster)
  const p = fit(live ?? place);
  const where = PAD_TEXT.where(p.x + p.w / 2, p.y + p.h / 2);
  const gesture = (e: PointerEvent, edge: Edge | null) => {
    if (e.button !== 0) return;
    e.preventDefault();
    raise();
    const sx = e.clientX;
    const sy = e.clientY;
    const start = p;
    let last = start;
    const move = (ev: globalThis.PointerEvent) => {
      const dx = (ev.clientX - sx) / box.w;
      const dy = (ev.clientY - sy) / box.h;
      let r = { ...start };
      if (!edge) r = { ...r, x: start.x + dx, y: start.y + dy };
      else {
        if (edge === 'e' || edge === 'se') r.w = Math.max(minW, start.w + dx);
        if (edge === 's' || edge === 'se') r.h = Math.max(minH, start.h + dy);
        if (edge === 'w') {
          const w = Math.max(minW, start.w - dx);
          r = { ...r, x: start.x + start.w - w, w };
        }
        if (edge === 'n') {
          const h = Math.max(minH, start.h - dy);
          r = { ...r, y: start.y + start.h - h, h };
        }
      }
      last = fit(r);
      setLive(last);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      document.body.classList.remove('gesture');
      setLive(null);
      if (last !== start) commit(last);
    };
    document.body.classList.add('gesture');
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  // ---------------------------------------------------------------- Tastatur (P7)
  const typing = (t: EventTarget) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  const onKey = (e: KeyboardEvent) => {
    // Alt + Pfeil verschieben, Alt + Umschalt + Pfeil Größe
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.startsWith('Arrow') && !typing(e.target)) {
      e.preventDefault();
      e.stopPropagation();
      const step = e.repeat ? STEP_HOLD : STEP;
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
      const next = fit(e.shiftKey ? { ...p, w: p.w + dx, h: p.h + dy } : { ...p, x: p.x + dx, y: p.y + dy });
      commit(next);
      say(e.shiftKey ? PAD_TEXT.sized(Math.round(next.w * box.w), Math.round(next.h * box.h)) : PAD_TEXT.moved(PAD_TEXT.where(next.x + next.w / 2, next.y + next.h / 2)));
      return;
    }
    // Strg + 1…9: Sheet wählen
    if ((e.ctrlKey || e.metaKey) && !e.altKey && /^[1-9]$/.test(e.key)) {
      const id = pad.sheets[Number(e.key) - 1];
      if (id) {
        e.preventDefault();
        e.stopPropagation();
        show(id, true);
      }
    }
  };

  const show = (id: string, focus = false) => {
    dispatch({ type: 'padShow', id: pad.id, sheet: id });
    raise();
    if (focus) window.setTimeout(() => tabsRef.current?.querySelector<HTMLElement>(`[data-sheet="${id}"]`)?.focus(), 0);
  };
  const onTabKey = (e: KeyboardEvent, i: number) => {
    const n = pad.sheets.length;
    let j = -1;
    if (e.key === 'ArrowRight') j = (i + 1) % n;
    else if (e.key === 'ArrowLeft') j = (i - 1 + n) % n;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = n - 1;
    if (j < 0 || e.altKey) return;
    e.preventDefault();
    if (e.shiftKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      dispatch({ type: 'padMoveSheet', id: pad.id, sheet: pad.sheets[i], to: j });
      window.setTimeout(() => tabsRef.current?.querySelector<HTMLElement>(`[data-sheet="${pad.sheets[i]}"]`)?.focus(), 0);
      return;
    }
    show(pad.sheets[j], true);
  };

  const addSheet = (kind: NoteViewKind) => {
    if (pad.sheets.length >= PAD_SHEETS_MAX) return notify(PAD_TEXT.full(PAD_SHEETS_MAX));
    const id = newId();
    dispatch({ type: 'padAddSheet', id: pad.id, kind, sheet: id });
    window.setTimeout(() => tabsRef.current?.querySelector<HTMLElement>(`[data-sheet="${id}"]`)?.focus(), 0);
  };
  const closeSheet = () => {
    if (!sheet) return;
    dispatch({ type: 'padCloseSheet', id: pad.id, sheet: sheet.id });
    if (pad.sheets.length <= 1) {
      notify(PAD_TEXT.closed);
      say(PAD_TEXT.closed);
      focusAway();
    }
  };
  /** Fokus nach dem Schließen auf NewPad (sonst fiele er auf body). */
  const focusAway = () => window.setTimeout(() => document.querySelector<HTMLElement>('.tb-newpad')?.closest('button')?.focus(), 0);
  const closePad = () => {
    dispatch({ type: 'padClose', id: pad.id });
    notify(PAD_TEXT.closed);
    say(PAD_TEXT.closed);
    focusAway();
  };

  const style: CSSProperties = {
    left: box.gap + p.x * box.w,
    top: box.gap + p.y * box.h,
    width: Math.max(0, p.w * box.w - box.gap),
    height: Math.max(0, p.h * box.h - box.gap),
    zIndex: z,
  };
  const titleId = `pad-${pad.id}-t`;

  return (
    <section
      ref={self}
      className={`pad${top ? ' is-top' : ''}${live ? ' is-moving' : ''}`}
      style={style}
      role="region"
      aria-label={PAD_TEXT.region(sheet?.name ?? TERMS.pad.split(' =')[0], where)}
      data-pad-id={pad.id}
      onPointerDownCapture={raise}
      onFocusCapture={raise}
      onKeyDown={onKey}
    >
      <header
        className="pad__head"
        title={PAD_TEXT.move}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button, input, [role="tab"], .menu')) return;
          gesture(e, null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !renaming && !(e.target as HTMLElement).closest('.menu__list')) {
            e.stopPropagation();
            closePad();
          }
        }}
      >
        <Icon name="pad" size={14} className="icon pad__icon" />
        <div className="pad__tabs" role="tablist" aria-label={PAD_TEXT.tabs} ref={tabsRef}>
          {pad.sheets.map((id, i) => {
            const v = No.viewById(ws, id);
            if (!v) return null;
            const on = id === pad.active;
            if (on && renaming)
              return (
                <input
                  key={id}
                  className="pad__rename"
                  aria-label={PAD_TEXT.renameLabel}
                  defaultValue={v.name}
                  autoFocus
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      dispatch({ type: 'padRenameSheet', sheet: id, name: e.currentTarget.value });
                      setRenaming(false);
                      show(id, true);
                    } else if (e.key === 'Escape') {
                      e.stopPropagation();
                      setRenaming(false);
                      show(id, true);
                    }
                  }}
                  onBlur={(e) => {
                    dispatch({ type: 'padRenameSheet', sheet: id, name: e.currentTarget.value });
                    setRenaming(false);
                  }}
                />
              );
            return (
              <button
                key={id}
                type="button"
                role="tab"
                data-sheet={id}
                id={`pad-${pad.id}-tab-${id}`}
                aria-selected={on}
                aria-controls={`pad-${pad.id}-panel`}
                tabIndex={on ? 0 : -1}
                className={`pad__tab${on ? ' is-on' : ''}`}
                title={`${v.name}${i < 9 ? ` (Strg/⌘+${i + 1})` : ''} – Pfeile wechseln, Umschalt + Pfeil verschiebt den Reiter`}
                onClick={() => show(id)}
                onDoubleClick={() => setRenaming(true)}
                onKeyDown={(e) => onTabKey(e, i)}
              >
                <Icon name={KIND_ICON[v.kind]} size={13} />
                <span className="pad__tabname">{v.name}</span>
              </button>
            );
          })}
        </div>
        <OpacityInline value={display.padOpacity} onChange={setPadOpacity} />
        <span id={titleId} className="sr-only">
          {sheet?.name}
        </span>
        <Menu className="pad__menu" icon={<span className="pad__add" title={explain(TERMS.sheet)}>{PAD_TEXT.addSheet}</span>} label={`${PAD_TEXT.addSheetLabel} – ${explain(TERMS.sheet)}`}>
          {(close) =>
            KINDS.map((k) => (
              <Item
                key={k}
                icon={KIND_ICON[k]}
                disabled={pad.sheets.length >= PAD_SHEETS_MAX}
                title={pad.sheets.length >= PAD_SHEETS_MAX ? PAD_TEXT.full(PAD_SHEETS_MAX) : undefined}
                onClick={() => {
                  close();
                  addSheet(k);
                }}
              >
                {No.VIEW_BASE[k]}
              </Item>
            ))
          }
        </Menu>
        <Menu className="pad__menu" icon={<Icon name="more" size={16} />} label={PAD_TEXT.options}>
          {(close) => (
            <>
              <Item
                icon="rename"
                disabled={!sheet}
                onClick={() => {
                  close();
                  setRenaming(true);
                }}
              >
                {PAD_TEXT.rename}
              </Item>
              <Item icon="close" hint={PAD_TEXT.closeSheetHint} disabled={!sheet} onClick={() => (close(), closeSheet())}>
                {PAD_TEXT.closeSheet}
              </Item>
              <Item icon="slot" disabled title={PAD_TEXT.menuPlaceHint} onClick={() => undefined}>
                {PAD_TEXT.menuPlace}
              </Item>
              <Item icon="close" hint={PAD_TEXT.closePadHint} onClick={() => (close(), closePad())}>
                {PAD_TEXT.closePad}
              </Item>
              <OpacitySlider label={PAD_TEXT.opacityPads} hint={PAD_TEXT.opacityHint} value={display.padOpacity} onChange={setPadOpacity} />
            </>
          )}
        </Menu>
        <button type="button" className="pad__close" onClick={closePad} title={`${PAD_TEXT.closePad} (Esc im Kopf) – ${PAD_TEXT.closePadHint}`} aria-label={PAD_TEXT.closePad}>
          <Icon name="close" size={14} />
        </button>
      </header>
      <div className="pad__body" role="tabpanel" id={`pad-${pad.id}-panel`} aria-labelledby={sheet ? `pad-${pad.id}-tab-${sheet.id}` : titleId}>
        {!sheet ? (
          <p className="win__placeholder win__placeholder--small">{NOTE_TEXT.missingView}</p>
        ) : sheet.kind === 'block' ? (
          <NoteBlock ws={ws} dispatch={dispatch} padId={pad.id} sheetId={sheet.id} picked={picked[sheet.id]} onPick={(n) => onPick(sheet.id, n)} say={say} />
        ) : (
          <div className="pad__soon">
            <p className="win__placeholder">
              <Icon name={KIND_ICON[sheet.kind]} size={22} /> {sheet.name}
            </p>
            <p className="win__hint">{PAD_TEXT.soon(No.VIEW_BASE[sheet.kind], No.countIn(ws, sheet))}</p>
          </div>
        )}
      </div>
      {(['n', 's', 'e', 'w', 'se'] as Edge[]).map((edge) => (
        <div key={edge} className={`pad__grip pad__grip--${edge}`} aria-hidden="true" title={PAD_TEXT.resize} onPointerDown={(e) => gesture(e, edge)} />
      ))}
    </section>
  );
}

// ---------------------------------------------------------------- Deckkraft (V67, Wunsch Enrico)

/** Schieberegler für die Deckkraft – als Eintrag in einem Menü (Pfeiltasten bleiben beim Regler). */
export function OpacitySlider(props: { label: string; hint: string; value: number; onChange: (v: number) => void }) {
  const id = `op-${props.label.replace(/\W+/g, '')}`;
  return (
    <li role="none" className="menu__range">
      <label htmlFor={id}>{props.label}</label>
      <span className="menu__range-row">
        <input
          id={id}
          type="range"
          min={OPACITY_MIN}
          max={100}
          step={OPACITY_STEP}
          value={props.value}
          aria-valuetext={PAD_TEXT.opacityValue(props.value)}
          aria-describedby={`${id}-d`}
          onChange={(e) => props.onChange(Number(e.target.value))}
        />
        <output htmlFor={id}>{PAD_TEXT.opacityValue(props.value)}</output>
      </span>
      <span id={`${id}-d`} className="menu__range-hint">
        {props.hint}
      </span>
    </li>
  );
}

/** V68 (Wunsch Enrico): Regler direkt im Pad-Kopf – sichtbar ohne Menü; in schmalen Pads nur im ⋮. */
export function OpacityInline(props: { value: number; onChange: (v: number) => void; label?: string; hint?: string }) {
  return (
    <label className="pad__op" title={`${props.label ?? PAD_TEXT.opacityPads}: ${PAD_TEXT.opacityValue(props.value)} – ${props.hint ?? PAD_TEXT.opacityHintShort}`}>
      <Icon name="contrast" size={13} />
      <input
        type="range"
        min={OPACITY_MIN}
        max={100}
        step={OPACITY_STEP}
        value={props.value}
        aria-label={props.label ?? PAD_TEXT.opacityPads}
        aria-valuetext={PAD_TEXT.opacityValue(props.value)}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </label>
  );
}

// ---------------------------------------------------------------- Notizblock: Liste + geöffnete Note

function NoteBlock(props: {
  ws: Workspace;
  dispatch: Dispatch<Action>;
  padId: string;
  sheetId: string;
  picked?: string;
  onPick: (note: string | null) => void;
  say: (text: string) => void;
}) {
  const { ws, dispatch, padId, sheetId, onPick } = props;
  const v = No.viewById(ws, sheetId)!;
  const notes = No.idsIn(v)
    .map((id) => No.noteById(ws, id))
    .filter((n): n is NonNullable<typeof n> => !!n);
  const open = props.picked && notes.some((n) => n.id === props.picked) ? props.picked : undefined;
  const listRef = useRef<HTMLUListElement>(null);
  // Note verschwunden (gelöscht, verschoben) → Auswahl lösen
  useEffect(() => {
    if (props.picked && !open) onPick(null);
  }, [props.picked, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = () => {
    leave();
    const id = newId();
    dispatch({ type: 'padNote', id: padId, sheet: sheetId, note: id, by: ws.profile?.name || undefined });
    onPick(id);
  };
  // F-213 (S8): beim Wechsel bleibt ein Entwurf still erhalten; nur eine leere neue Note fällt weg
  const leave = () => {
    const cur = open ? No.noteById(ws, open) : undefined;
    if (cur && No.isEmptyDraft(ws, cur)) dispatch({ type: 'noteDiscard', id: cur.id });
  };
  const pick = (id: string) => {
    if (id !== open) leave();
    onPick(id);
  };
  const back = () => {
    const was = open;
    leave();
    onPick(null);
    window.setTimeout(() => listRef.current?.querySelector<HTMLElement>(`[data-note="${was}"]`)?.focus() ?? listRef.current?.querySelector<HTMLElement>('button')?.focus(), 0);
  };

  return (
    <div className={`nblock${open ? ' has-open' : ''}`}>
      <div className="nblock__side">
        <button type="button" className="nblock__new" onClick={add} title={explain(TERMS.note)}>
          <Icon name="plus" size={14} /> {PAD_TEXT.newNote}
        </button>
        {notes.length ? (
          <ul className="nblock__list" aria-label={PAD_TEXT.list} ref={listRef}>
            {notes.map((raw) => {
              const n = No.shownNote(raw);
              const t = No.titleOf(n) || NOTE_TEXT.untitled;
              const draft = No.hasDraft(raw);
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    data-note={n.id}
                    className={`nblock__item${n.id === open ? ' is-on' : ''}${No.isFinished(n.state) ? ' is-done' : ''}${draft ? ' is-draft' : ''}`}
                    aria-current={n.id === open ? 'true' : undefined}
                    onClick={() => pick(n.id)}
                  >
                    <span className="nblock__title">{t}</span>
                    <span className="nblock__state">
                      {draft && <span className="nblock__draft">{DRAFT_TEXT.listDraft}</span>}
                      {NOTE_TEXT.states[No.stateOf(ws, n).state]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="nblock__empty">{PAD_TEXT.empty}</p>
        )}
      </div>
      <div className="nblock__main">
        {open ? (
          <>
            <button type="button" className="nblock__back" onClick={back}>
              <Icon name="back" size={14} /> {PAD_TEXT.toList}
            </button>
            <NoteTab ws={ws} noteId={open} dispatch={dispatch} draft={{ onClose: back, say: props.say }} />
          </>
        ) : (
          <p className="nblock__pick">{PAD_TEXT.pick}</p>
        )}
      </div>
    </div>
  );
}
