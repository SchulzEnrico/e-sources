import { useRef, useState, type PointerEvent, type TouchEvent, type WheelEvent } from 'react';
import type { PanelMeta } from '../workspace/types';
import { type Fx, StackAddIcon } from './PanelFrame';
import { Icon } from './Icon';
import { PAUSE_TEXT, TERMS, DIALOG_TEXT } from '../workspace/terms';

/** F-08: Stapel-Leiste rechts am Panel – Klick wählt, Mausrad und Pfeile blättern. */
export interface StackProps {
  members: PanelMeta[];
  frontId: string;
  onSelect: (id: string) => void;
  onStep: (step: number) => void;
  /** Panel aus dem Stapel schließen. */
  onRemove: (id: string) => void;
  /** F-09: neues Panel auf diese Area legen; fehlt, wenn die Area voll ist. */
  onAdd?: () => void;
  /** F-167: Fokus-Auswirkung des Plus. */
  addFx?: Fx;
  /** F-10: Panel direkt in der Stapel-Leiste umbenennen (Doppelklick). */
  onRename: (id: string, name: string) => void;
  /** F-128: Name der Area (leer, solange sie noch keinen hat). */
  areaName: string;
  onRenameArea: (name: string) => void;
  /** F-28: Eintrag auf eine andere Area ziehen (dort obendrauf legen); fehlt außerhalb der Arbeitsfläche. */
  onDragStart?: (e: PointerEvent, id: string) => void;
  /** F-06: Ist dieses Portal gerade pausiert (nicht geladen)? */
  paused?: (m: PanelMeta) => boolean;
}

export function StackBar({ members, frontId, onSelect, onStep, onRemove, onAdd, addFx, onRename, onDragStart, paused }: StackProps) {
  const lastWheel = useRef(0);
  /** Panel, dessen Name gerade bearbeitet wird; solange hat das Eingabefeld den Fokus und die Leiste bleibt offen. */
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const commit = () => {
    if (editing) onRename(editing, draft);
    setEditing(null);
  };
  const onWheel = (e: WheelEvent) => {
    const now = Date.now();
    if (now - lastWheel.current < 250) return; // ein Wechsel pro Rad-Bewegung
    const d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (Math.abs(d) < 4) return;
    lastWheel.current = now;
    onStep(d > 0 ? 1 : -1);
  };
  const index = Math.max(0, members.findIndex((m) => m.id === frontId));
  return (
    // Schmal (Zähler und Nummern); bei Hover oder Antippen klappt die Leiste mit Namen
    // nach links über den Inhalt aus, ohne ihn zu verschieben (NF-06).
    <div className="stack" onWheel={onWheel} role="tablist" aria-orientation="vertical" aria-label="Stack" title={TERMS.stack}>
      <div className="stack__inner">
        <span className="stack__label" aria-hidden="true">
          Stack · {members.length} Portale
        </span>
        <button type="button" className="stack__step" onClick={() => onStep(-1)} title="Vorheriges Portal im Stack" aria-label="Vorheriges">
          ▲
        </button>
        <span className="stack__count" title={`Stack: ${members.length} Portale übereinander auf diesem Slot – ▲/▼ oder Mausrad blättert`}>
          {index + 1}/{members.length}
        </span>
        <div className="stack__list">
          {members.map((m, i) =>
            editing === m.id ? (
              <div key={m.id} className="stack__item stack__item--edit">
                <span className="stack__num">{i + 1}</span>
                <input
                  className="stack__input"
                  title={DIALOG_TEXT.renameHint}
                  value={draft}
                  autoFocus
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={commit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commit();
                    if (e.key === 'Escape') setEditing(null);
                  }}
                  aria-label="Portalname"
                />
              </div>
            ) : (
            <div key={m.id} className="stack__row" role="presentation">
            <button
              type="button"
              role="tab"
              aria-selected={m.id === frontId}
              className={['stack__item', m.id === frontId && 'stack__item--on', paused?.(m) && 'stack__item--paused'].filter(Boolean).join(' ')}
              aria-description={paused?.(m) ? PAUSE_TEXT.paused : undefined}
              onClick={() => onSelect(m.id)}
              onPointerDown={(e) => {
                if (e.button === 0) onDragStart?.(e, m.id);
              }}
              onDoubleClick={() => {
                setDraft(m.name);
                setEditing(m.id);
              }}
              title={`${m.name}${paused?.(m) ? ` · ${PAUSE_TEXT.paused}` : ''} · Doppelklick oder F2: umbenennen · Entf: schließen${onDragStart ? ' · Ziehen: in einem anderen Portal ablegen' : ''}`}
              aria-keyshortcuts="F2 Delete"
              // NF-03: Das × ist mit der Maus erreichbar; per Tastatur schließt Entf, F2 benennt um.
              onKeyDown={(e) => {
                if (e.key === 'Delete') {
                  e.preventDefault();
                  onRemove(m.id);
                } else if (e.key === 'F2') {
                  e.preventDefault();
                  setDraft(m.name);
                  setEditing(m.id);
                }
              }}
            >
              <span className="stack__num">{i + 1}</span>
              <span className="stack__name">{m.name}</span>
            </button>
            {/* Eigener Knopf neben dem Eintrag (nicht darin: Knopf im Knopf ist ungültig). Per Tastatur schließt Entf. */}
            <button
              type="button"
              className="stack__close"
              tabIndex={-1}
              aria-hidden="true"
              title={`„${m.name}“ schließen`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onRemove(m.id)}
            >
              <Icon name="close" size={14} />
            </button>
            </div>
            ),
          )}
        </div>
        <button type="button" className="stack__step" onClick={() => onStep(1)} title="Nächstes Portal im Stack" aria-label="Nächstes">
          ▼
        </button>
        {onAdd && (
          <button
            type="button"
            className="stack__step stack__add"
            onClick={onAdd}
            title={`Neues Portal auf „${members[index]?.name ?? ''}“ legen${addFx ? ` – ${addFx.text}` : ''}`}
            aria-label={`Neues Portal auf diesen Stack legen${addFx ? `, ${addFx.text}` : ''}`}
          >
            <StackAddIcon color={addFx?.color} />
          </button>
        )}
      </div>
    </div>
  );
}

/** Wischen nach links/rechts blättert im Stapel (Smartphone, Tablet, Touchpad-Bildschirme). */
export function useSwipe(onStep?: (step: number) => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  if (!onStep) return {};
  return {
    onTouchStart: (e: TouchEvent) => {
      const t = e.touches[0];
      start.current = { x: t.clientX, y: t.clientY };
    },
    onTouchEnd: (e: TouchEvent) => {
      const s = start.current;
      start.current = null;
      if (!s) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      if (Math.abs(dx) > 50 && Math.abs(dx) > 2 * Math.abs(dy)) onStep(dx < 0 ? 1 : -1);
    },
  };
}
