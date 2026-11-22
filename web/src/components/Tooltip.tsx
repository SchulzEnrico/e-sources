/**
 * F-142: schnelle Tooltips. Die eingebauten Tooltips (title) erscheinen erst nach rund einer
 * Sekunde, und das lässt sich nicht einstellen. Diese Komponente zeigt den title jedes Elements
 * nach kurzer Pause selbst an – bei Maus und bei Tastaturfokus (NF-03).
 *
 * Solange der eigene Tooltip steht, wird der title kurz entfernt (sonst käme der eingebaute
 * zusätzlich) und danach wieder gesetzt. Bei Fokus verweist aria-describedby auf den Tooltip.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const DELAY = 300;
const TIP_ID = 'es-tooltip';

interface Tip {
  text: string;
  x: number;
  y: number;
  below: boolean;
}

export function Tooltips() {
  const [tip, setTip] = useState<Tip | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const owner = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const release = () => {
      window.clearTimeout(timer.current);
      const el = owner.current;
      if (el) {
        const text = el.dataset.tip;
        if (text !== undefined && !el.hasAttribute('title')) el.setAttribute('title', text);
        delete el.dataset.tip;
        if (el.getAttribute('aria-describedby') === TIP_ID) el.removeAttribute('aria-describedby');
      }
      owner.current = null;
      setTip(null);
    };

    const grab = (el: HTMLElement, viaFocus: boolean) => {
      if (owner.current === el) return;
      release();
      const text = el.getAttribute('title');
      if (!text) return;
      owner.current = el;
      // title sofort entfernen, damit der langsame eingebaute Tooltip nicht zusätzlich erscheint
      el.dataset.tip = text;
      el.removeAttribute('title');
      timer.current = window.setTimeout(
        () => {
          if (owner.current !== el || !el.isConnected) return;
          const r = el.getBoundingClientRect();
          const below = r.top < 60;
          setTip({ text, x: r.left + r.width / 2, y: below ? r.bottom + 6 : r.top - 6, below });
          if (viaFocus && !el.hasAttribute('aria-describedby')) el.setAttribute('aria-describedby', TIP_ID);
        },
        viaFocus ? 0 : DELAY,
      );
    };

    const target = (e: Event) => (e.target instanceof Element ? (e.target.closest('[title]') as HTMLElement | null) : null);
    const onOver = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const el = target(e);
      if (el) grab(el, false);
      else if (owner.current && !(e.target instanceof Node && owner.current.contains(e.target))) release();
    };
    // Maus verlässt das Element – auch in ein iframe hinein, wo kein pointerover mehr ankommt.
    const onOut = (e: PointerEvent) => {
      const el = owner.current;
      if (!el || !(e.target instanceof Node) || !el.contains(e.target)) return;
      if (e.relatedTarget instanceof Node && el.contains(e.relatedTarget)) return;
      if (el === document.activeElement && el.getAttribute('aria-describedby') === TIP_ID) return;
      release();
    };
    const onFocus = (e: FocusEvent) => {
      const el = target(e);
      // Nur bei Tastaturfokus, nicht nach Mausklick
      if (el && el instanceof HTMLElement && el.matches(':focus-visible')) grab(el, true);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && owner.current && setTip(null);

    document.addEventListener('pointerover', onOver);
    document.addEventListener('pointerout', onOut);
    document.addEventListener('pointerdown', release, true);
    document.addEventListener('focusin', onFocus);
    document.addEventListener('focusout', release);
    document.addEventListener('scroll', release, true);
    window.addEventListener('blur', release);
    document.addEventListener('keydown', onKey);
    return () => {
      release();
      document.removeEventListener('pointerover', onOver);
      document.removeEventListener('pointerout', onOut);
      document.removeEventListener('pointerdown', release, true);
      document.removeEventListener('focusin', onFocus);
      document.removeEventListener('focusout', release);
      document.removeEventListener('scroll', release, true);
      window.removeEventListener('blur', release);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // Am Bildschirmrand nach innen schieben, damit nichts abgeschnitten wird.
  const box = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState(0);
  useLayoutEffect(() => {
    if (!tip || !box.current) return setShift(0);
    const r = box.current.getBoundingClientRect();
    const left = r.left - shift;
    const right = r.right - shift;
    setShift(left < 8 ? 8 - left : right > window.innerWidth - 8 ? window.innerWidth - 8 - right : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tip]);

  if (!tip) return null;
  // Direkt an body, damit keine Kopfleiste (eigener Stapelkontext) darüber liegt.
  return createPortal(
    <div
      ref={box}
      id={TIP_ID}
      role="tooltip"
      className={tip.below ? 'tooltip tooltip--below' : 'tooltip'}
      style={{ left: tip.x + shift, top: tip.y }}
    >
      {tip.text}
    </div>,
    document.body,
  );
}
