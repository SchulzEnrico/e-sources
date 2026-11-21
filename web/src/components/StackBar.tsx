import { useRef, type TouchEvent, type WheelEvent } from 'react';
import type { PanelMeta } from '../workspace/types';

/** F-08: Stapel-Leiste rechts am Panel – Klick wählt, Mausrad und Pfeile blättern. */
export interface StackProps {
  members: PanelMeta[];
  frontId: string;
  onSelect: (id: string) => void;
  onStep: (step: number) => void;
}

export function StackBar({ members, frontId, onSelect, onStep }: StackProps) {
  const lastWheel = useRef(0);
  const onWheel = (e: WheelEvent) => {
    const now = Date.now();
    if (now - lastWheel.current < 250) return; // ein Wechsel pro Rad-Bewegung
    const d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (Math.abs(d) < 4) return;
    lastWheel.current = now;
    onStep(d > 0 ? 1 : -1);
  };
  return (
    <div className="stack" onWheel={onWheel} role="tablist" aria-orientation="vertical" aria-label="Stapel">
      <button type="button" onClick={() => onStep(-1)} title="Vorheriges Panel im Stapel" aria-label="Vorheriges">
        ▲
      </button>
      <div className="stack__list">
        {members.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={m.id === frontId}
            className={m.id === frontId ? 'stack__item stack__item--on' : 'stack__item'}
            onClick={() => onSelect(m.id)}
            title={m.name}
          >
            {m.name}
          </button>
        ))}
      </div>
      <button type="button" onClick={() => onStep(1)} title="Nächstes Panel im Stapel" aria-label="Nächstes">
        ▼
      </button>
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
