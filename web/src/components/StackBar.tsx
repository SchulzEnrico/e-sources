import { useRef, useState, type TouchEvent, type WheelEvent } from 'react';
import type { PanelMeta } from '../workspace/types';
import { StackAddIcon } from './PanelFrame';

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
  /** F-10: Panel direkt in der Stapel-Leiste umbenennen (Doppelklick). */
  onRename: (id: string, name: string) => void;
  /** F-128: Name der Area (leer, solange sie noch keinen hat). */
  areaName: string;
  onRenameArea: (name: string) => void;
}

export function StackBar({ members, frontId, onSelect, onStep, onRemove, onAdd, onRename }: StackProps) {
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
    <div className="stack" onWheel={onWheel} role="tablist" aria-orientation="vertical" aria-label="Stapel">
      <div className="stack__inner">
        <button type="button" className="stack__step" onClick={() => onStep(-1)} title="Vorheriges Panel im Stapel" aria-label="Vorheriges">
          ▲
        </button>
        <span className="stack__count" title={`${members.length} Panels im Stapel`}>
          {index + 1}/{members.length}
        </span>
        <div className="stack__list">
          {members.map((m, i) =>
            editing === m.id ? (
              <div key={m.id} className="stack__item stack__item--edit">
                <span className="stack__num">{i + 1}</span>
                <input
                  className="stack__input"
                  value={draft}
                  autoFocus
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={commit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commit();
                    if (e.key === 'Escape') setEditing(null);
                  }}
                  aria-label="Panelname"
                />
              </div>
            ) : (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={m.id === frontId}
              className={m.id === frontId ? 'stack__item stack__item--on' : 'stack__item'}
              onClick={() => onSelect(m.id)}
              onDoubleClick={() => {
                setDraft(m.name);
                setEditing(m.id);
              }}
              title={`${m.name} · Doppelklick oder F2: umbenennen · Entf: schließen`}
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
              <span
                className="stack__close"
                aria-hidden="true"
                title="Panel schließen"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(m.id);
                }}
              >
                ×
              </span>
            </button>
            ),
          )}
        </div>
        <button type="button" className="stack__step" onClick={() => onStep(1)} title="Nächstes Panel im Stapel" aria-label="Nächstes">
          ▼
        </button>
        {onAdd && (
          <button type="button" className="stack__step stack__add" onClick={onAdd} title={`Neues Panel auf „${members[index]?.name ?? ''}“ legen`} aria-label="Neues Panel auf diesen Stapel legen">
            <StackAddIcon />
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
