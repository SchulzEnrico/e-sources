import { useEffect, useId, useState } from 'react';
import { DEV_DEVICES, DEV_SCALES, breakpointOf, devSizeOf } from '../workspace/dev';
import type { DevView } from '../workspace/types';
import { DEV_TEXT } from '../workspace/terms';
import { offerTourOnce, requestTour } from '../workspace/tour';
import { flash } from '../workspace/flash';

/**
 * F-200 Stufe 2: Leiste des Entwickler-Modus unter der Kopfzeile des Portals – Gerät, Drehen,
 * Zoom-Test, Maße der Seite, Lineal und Beenden. Statt der Lupe (freies Zoomen gibt es hier nicht).
 * Alles per Tastatur erreichbar; die Maße werden Bildschirmlesern erst angesagt, wenn sie stehen (NF-03).
 */
export function DevBar(props: {
  view: DevView | undefined;
  page: { w: number; h: number };
  ruler: boolean;
  onView: (change: { device?: string | null; turned?: boolean; scale?: number }) => void;
  onRuler: () => void;
  onEnd: () => void;
}) {
  const v = props.view ?? {};
  const scale = v.scale ?? 100;
  const id = useId();
  const cls = breakpointOf(props.page.w);
  const size = devSizeOf(v);
  const wide = !!size && size.w > size.h;
  const [said, setSaid] = useState('');
  // V54: Tour „Entwickler-Modus“ einmal anbieten, wenn die Leiste zum ersten Mal erscheint
  useEffect(() => {
    // Merker erst im Zeitgeber setzen – im StrictMode läuft der Effekt doppelt, der erste Zeitgeber wird gelöscht.
    const t = window.setTimeout(() => {
      if (offerTourOnce('dev')) flash({ text: DEV_TEXT.tourOffer, ms: 12000, action: { label: DEV_TEXT.tourStart, run: () => requestTour('dev') } });
    }, 700);
    return () => window.clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!props.page.w) return;
    const t = window.setTimeout(() => setSaid(DEV_TEXT.said(props.page.w, props.page.h, cls, scale)), 900);
    return () => window.clearTimeout(t);
  }, [props.page.w, props.page.h, cls, scale]);
  return (
    <div className="devbar" role="group" aria-label={DEV_TEXT.bar}>
      <label className="devbar__field" title={DEV_TEXT.deviceTitle}>
        <span className="devbar__lbl">{DEV_TEXT.device}</span>
        <select value={v.device ?? ''} onChange={(e) => props.onView({ device: e.target.value || null })}>
          <option value="">{DEV_TEXT.free}</option>
          {DEV_DEVICES.map((d) => (
            <option key={d.id} value={d.id}>
              {DEV_TEXT.deviceOption(d.name, d.w, d.h)}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="devbar__turn"
        aria-label={size ? DEV_TEXT.turnLabel(wide) : DEV_TEXT.turnOff}
        disabled={!v.device}
        title={v.device ? DEV_TEXT.turnTitle : DEV_TEXT.turnOff}
        onClick={() => props.onView({ turned: !v.turned })}
      >
        {size ? (wide ? DEV_TEXT.landscape : DEV_TEXT.portrait) : DEV_TEXT.turn}
      </button>
      <fieldset className="devbar__scales" title={DEV_TEXT.scaleTitle}>
        <legend className="devbar__lbl">{DEV_TEXT.scale}</legend>
        {DEV_SCALES.map((s) => (
          <label key={s} className="devbar__scale">
            <input type="radio" name={`${id}-scale`} checked={scale === s} onChange={() => props.onView({ scale: s })} />
            <span>{s} %</span>
          </label>
        ))}
      </fieldset>
      <span className="devbar__size" title={DEV_TEXT.titleDpr(props.page.w, props.page.h, window.devicePixelRatio || 1)}>
        <strong>{DEV_TEXT.size(props.page.w, props.page.h)}</strong> <span className="devbar__cls">{cls}</span>
      </span>
      <span className="sr-only" role="status" aria-live="polite">
        {said}
      </span>
      <span className="devbar__end">
        <button type="button" aria-pressed={props.ruler} onClick={props.onRuler} title={DEV_TEXT.rulerTitle}>
          {DEV_TEXT.ruler}
        </button>
        <button type="button" onClick={props.onEnd} title={DEV_TEXT.endTitle}>
          {DEV_TEXT.end}
        </button>
      </span>
    </div>
  );
}
