/**
 * F-207 Main Stage (V97, Schritt 9 Bau 3, M3/M6): „Main Stage …“ am Ort – öffnet beim Klick auf den Scheinwerfer
 * einer Stage direkt darunter. Fest im Layout (Umschalt-Rad Frei · Fest), Mindestgröße in px (Vorschlag aus der
 * heutigen Größe), „Auf allen Desks“ gesperrt mit Grund (Stufe 2), „Von der Main Stage nehmen“.
 * Tastatur (NF-03): Fokus springt hinein, Tab wandert, Esc schließt und gibt den Fokus an den Scheinwerfer zurück.
 */
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { STAGE_TEXT, TERMS } from '../workspace/terms';
import { requestTour } from '../workspace/tour';
import { ModeWheel } from './ModeWheel';
import { Icon } from './Icon';

const T = STAGE_TEXT;

export interface StagePanelProps {
  /** Name des Slots. */
  name: string;
  fixed: boolean;
  minW?: number;
  minH?: number;
  /** Heutige Größe des Slots in px (Vorschlag für die Mindestgröße). */
  now: { w: number; h: number };
  onEdit: (patch: { fixed?: boolean; minW?: number; minH?: number }) => void;
  onOff: () => void;
  /** back = Fokus zurück an den Scheinwerfer (Esc, Schließen). */
  onClose: (back: boolean) => void;
  anchor: { current: HTMLElement | null };
}

export function StagePanel(p: StagePanelProps) {
  const box = useRef<HTMLDivElement>(null);
  const headId = useId();
  const allId = useId();
  const [pos, setPos] = useState<{ right: number; top: number }>({ right: 8, top: 40 });
  const [w, setW] = useState(p.minW ? String(p.minW) : '');
  const [h, setH] = useState(p.minH ? String(p.minH) : '');
  const [said, setSaid] = useState('');
  useEffect(() => setW(p.minW ? String(p.minW) : ''), [p.minW]);
  useEffect(() => setH(p.minH ? String(p.minH) : ''), [p.minH]);

  // unter den Scheinwerfer setzen
  useLayoutEffect(() => {
    const b = box.current, a = p.anchor.current, parent = box.current?.offsetParent as HTMLElement | null;
    if (!b || !a || !parent) return;
    const ar = a.getBoundingClientRect(), pr = parent.getBoundingClientRect();
    const want = pr.right - (ar.left + ar.width / 2) - b.offsetWidth / 2;
    setPos({ right: Math.max(8, Math.min(want, pr.width - b.offsetWidth - 8)), top: ar.bottom - pr.top + 6 });
  }, [p.anchor]);
  useEffect(() => {
    box.current?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"], button, input')?.focus({ preventScroll: true });
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!box.current?.contains(t) && !p.anchor.current?.contains(t)) p.onClose(false);
    };
    document.addEventListener('pointerdown', down, true);
    return () => document.removeEventListener('pointerdown', down, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const num = (v: string) => {
    const n = Math.round(Number(v.replace(',', '.')));
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const commit = () => {
    const nw = num(w);
    const nh = num(h);
    if (nw === p.minW && nh === p.minH) return;
    p.onEdit({ minW: nw ?? 0, minH: nh ?? 0 });
    setSaid(T.minSay(nw, nh));
  };
  const take = () => {
    setW(String(p.now.w));
    setH(String(p.now.h));
    p.onEdit({ minW: p.now.w, minH: p.now.h });
    setSaid(T.minSay(p.now.w, p.now.h));
  };
  const clear = () => {
    setW('');
    setH('');
    p.onEdit({ minW: 0, minH: 0 });
    setSaid(T.minSay());
  };
  const field = (label: string, v: string, set: (v: string) => void) => (
    <label className="stagepop__field">
      <span>{label}</span>
      <input
        inputMode="numeric"
        value={v}
        placeholder={T.minNone}
        onChange={(e) => set(e.target.value.replace(/[^\d]/g, ''))}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), commit())}
      />
    </label>
  );

  return (
    <div
      ref={box}
      className="stagepop"
      role="dialog"
      aria-labelledby={headId}
      style={{ right: pos.right, top: pos.top }}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        e.stopPropagation();
        commit();
        p.onClose(true);
      }}
    >
      <p className="stagepop__head" id={headId}>
        <Icon name="spotlight" size={14} />
        <span>{T.head(p.name)}</span>
      </p>
      <p className="stagepop__hint">{TERMS.mainStage}</p>
      <div className="stagepop__row">
        <span className="stagepop__label">{T.layout}</span>
        <ModeWheel
          label={T.layout}
          value={p.fixed ? 'fixed' : 'free'}
          onChange={(v) => {
            p.onEdit({ fixed: v === 'fixed' });
            setSaid(v === 'fixed' ? T.fixedHint2 : T.freeHint);
          }}
          options={[
            { id: 'free', name: T.free, icon: 'move', hint: T.freeHint },
            { id: 'fixed', name: T.fixed, icon: 'lock', hint: T.fixedHint2 },
          ]}
        />
      </div>
      <fieldset className="stagepop__min">
        <legend>{T.min}</legend>
        <div className="stagepop__fields">
          {field(T.minW, w, setW)}
          <span aria-hidden="true">×</span>
          {field(T.minH, h, setH)}
        </div>
        <div className="stagepop__btns">
          <button type="button" onClick={take}>
            {T.minNow(p.now.w, p.now.h)}
          </button>
          {(p.minW || p.minH) && (
            <button type="button" onClick={clear}>
              {T.minClear}
            </button>
          )}
        </div>
      </fieldset>
      <div className="stagepop__row">
        {/* M3: Stufe 2 – erreichbar, sagt beim Klick, warum es noch nicht geht (NF-03) */}
        <button type="button" role="switch" aria-checked={false} aria-disabled="true" className="stagepop__all is-off" aria-describedby={allId} onClick={() => setSaid(`${T.allDesks}: ${T.allDesksLater}`)}>
          <span className="stagepop__box" aria-hidden="true" />
          {T.allDesks}
        </button>
        <span className="stagepop__later" id={allId}>
          {T.allDesksLater}
        </span>
      </div>
      <div className="stagepop__foot">
        {/* F-217 (V98): Tour „Main Stage“ */}
        <button type="button" title={T.tourHint} onClick={() => (commit(), p.onClose(false), requestTour('stage'))}>
          {T.tour}
        </button>
        <button type="button" onClick={p.onOff}>
          {T.off}
        </button>
        <button type="button" onClick={() => (commit(), p.onClose(true))}>
          {T.close}
        </button>
      </div>
      <span className="sr-only" role="status">
        {said}
      </span>
    </div>
  );
}
