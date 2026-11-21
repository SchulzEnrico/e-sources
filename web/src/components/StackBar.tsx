import { useRef, type TouchEvent, type WheelEvent } from 'react';
import type { PanelMeta } from '../workspace/types';

/** F-08: Stapel-Leiste rechts am Panel – Klick wählt, Mausrad und Pfeile blättern. */
export interface StackProps {
  members: PanelMeta[];
  frontId: string;
  onSelect: (id: string) => void;
  onStep: (step: number) => void;
  /** Panel aus dem Stapel schließen. */
  onRemove: (id: string) => void;
  /** F-09: neues Panel auf diesen Platz legen; fehlt, wenn der Platz voll ist. */
  onAdd?: () => void;
}

export function StackBar({ members, frontId, onSelect, onStep, onRemove, onAdd }: StackProps) {
  const lastWheel = useRef(0);
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
          {members.map((m, i) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={m.id === frontId}
              className={m.id === frontId ? 'stack__item stack__item--on' : 'stack__item'}
              onClick={() => onSelect(m.id)}
              title={m.name}
            >
              <span className="stack__num">{i + 1}</span>
              <span className="stack__name">{m.name}</span>
              <span
                className="stack__close"
                role="button"
                aria-label={`${m.name} schließen`}
                title="Panel schließen"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(m.id);
                }}
              >
                ×
              </span>
            </button>
          ))}
        </div>
        <button type="button" className="stack__step" onClick={() => onStep(1)} title="Nächstes Panel im Stapel" aria-label="Nächstes">
          ▼
        </button>
        {onAdd && (
          <button type="button" className="stack__step stack__add" onClick={onAdd} title="Neues Panel auf diesen Platz legen" aria-label="Neues Panel auf diesen Platz">
            +
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
