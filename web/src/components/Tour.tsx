/**
 * F-95/F-172: Tour – ein Hinweisfenster neben dem jeweiligen Bedienelement, das mit einem Rahmen markiert
 * wird. Barrierefreiheit (NF-03): Fokus liegt auf „Weiter“, jeder Schritt ist ein eigener Dialog
 * (Titel und Text werden angesagt), → / ← blättern, Esc beendet; danach geht der Fokus zurück.
 * Bei „Bewegung reduzieren“ ohne Übergänge (CSS).
 */
import { type CSSProperties, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { TOURS, type TourId, type TourStep, setTourSeen, setToursAuto, tourSteps } from '../workspace/tour';

const visible = (sel: string) => {
  const el = document.querySelector<HTMLElement>(sel);
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
};

export function Tour({ tour = 'start', auto = false, onClose, onAutoOff }: { tour?: TourId; /** von selbst gestartet → Kästchen „Nicht mehr automatisch anzeigen“ (F-173) */ auto?: boolean; onClose: () => void; onAutoOff?: () => void }) {
  // Ziele einmal beim Start prüfen, damit die Zählung „3 von 9“ stabil bleibt.
  const steps = useMemo<TourStep[]>(() => tourSteps(visible, TOURS[tour]), [tour]);
  const [i, setI] = useState(0);
  const step = steps[Math.min(i, steps.length - 1)];
  const [rect, setRect] = useState<DOMRect | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<CSSProperties>({});

  const [noMore, setNoMore] = useState(false);
  const end = () => {
    setTourSeen(true, tour);
    if (noMore) {
      setToursAuto(false);
      onAutoOff?.();
    }
    onClose();
  };

  // Fokus beim Beenden zurück dorthin, wo er vorher war.
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    return () => back?.focus?.();
  }, []);

  // Ziel ausmessen (auch bei Größenänderung)
  useLayoutEffect(() => {
    const el = step.target ? document.querySelector<HTMLElement>(step.target) : null;
    // z. B. Stack: für diesen Schritt aufklappen, damit die Namen zu sehen sind
    if (el && step.expand) el.classList.add('is-open');
    // F-172: Ziel in einem scrollbaren Bereich (z. B. Cockpit auf schmalem Bildschirm) ins Bild holen
    el?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    const measure = () => {
      const ring = el && step.ring ? (el.querySelector<HTMLElement>(step.ring) ?? el) : el;
      setRect(ring ? ring.getBoundingClientRect() : null);
    };
    measure();
    // Aufklappen läuft mit Übergang: nach dessen Ende noch einmal messen
    const again = step.expand ? window.setTimeout(measure, 320) : 0;
    window.addEventListener('resize', measure);
    return () => {
      window.clearTimeout(again);
      window.removeEventListener('resize', measure);
      if (el && step.expand) el.classList.remove('is-open');
    };
  }, [step]);

  // Hinweisfenster unter (oder über) dem Ziel, seitlich im Bild; ohne Ziel mittig
  useLayoutEffect(() => {
    const c = card.current;
    if (!c) return;
    const w = c.offsetWidth;
    const h = c.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (!rect) return setPos({ left: Math.max(8, (vw - w) / 2), top: Math.max(8, (vh - h) / 2) });
    const left = Math.min(Math.max(8, rect.left + rect.width / 2 - w / 2), vw - w - 8);
    const below = rect.bottom + 12;
    if (below + h <= vh - 8) return setPos({ left, top: below });
    if (rect.top - h - 12 >= 8) return setPos({ left, top: rect.top - h - 12 });
    // hohes Ziel (z. B. Stack): seitlich daneben, senkrecht mittig
    const midTop = Math.min(Math.max(8, rect.top + rect.height / 2 - h / 2), vh - h - 8);
    if (rect.left - w - 12 >= 8) return setPos({ left: rect.left - w - 12, top: midTop });
    if (rect.right + w + 12 <= vw - 8) return setPos({ left: rect.right + 12, top: midTop });
    setPos({ left, top: Math.max(8, vh - h - 8) });
  }, [rect, step]);

  useEffect(() => next.current?.focus(), [step]);

  // → / ← blättern, Esc beendet (Erfassungsphase, damit andere Kürzel nicht mitlaufen)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        end();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (i < steps.length - 1) setI(i + 1);
        else end();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopImmediatePropagation();
        setI(Math.max(0, i - 1));
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, steps.length, noMore]);

  const last = i >= steps.length - 1;
  const pad = 4;
  return (
    <div className="tour">
      <div className="tour__shade" aria-hidden="true" onClick={end} />
      {rect && (
        <div
          className="tour__ring"
          aria-hidden="true"
          style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + 2 * pad, height: rect.height + 2 * pad }}
        />
      )}
      <div
        key={step.id}
        ref={card}
        className="tour__card"
        style={pos}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-text"
      >
        <p className="tour__count">
          Schritt {i + 1} von {steps.length}
        </p>
        <h2 id="tour-title" className="tour__title">
          {step.title}
        </h2>
        <p id="tour-text" className="tour__text">
          {step.text}
        </p>
        {auto && (
          <label className="tour__nomore">
            <input type="checkbox" checked={noMore} onChange={(e) => setNoMore(e.target.checked)} />
            Nicht mehr automatisch anzeigen
          </label>
        )}
        <div className="tour__nav">
          <button type="button" onClick={end} className="tour__skip">
            {last ? 'Schließen' : 'Tour beenden'}
          </button>
          {i > 0 && (
            <button type="button" onClick={() => setI(i - 1)} aria-label="Zurück (Pfeil links)">
              ← Zurück
            </button>
          )}
          <button ref={next} type="button" className="tour__next" onClick={() => (last ? end() : setI(i + 1))} aria-label={last ? 'Fertig' : 'Weiter (Pfeil rechts)'}>
            {last ? 'Fertig' : 'Weiter →'}
          </button>
        </div>
      </div>
    </div>
  );
}
