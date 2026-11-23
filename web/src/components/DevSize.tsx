import { useEffect, useRef, useState } from 'react';
import { breakpointOf, pageSize } from '../workspace/dev';
import { DEV_TEXT } from '../workspace/terms';

/**
 * F-200 Stufe 1: Größenanzeige im Entwickler-Modus – unten links im Seitenbereich des Portals
 * (unten rechts steht schon das Lineal). Läuft beim Verschieben und Größe ändern live mit;
 * Bildschirmleser hören die Größe erst, wenn sie eine Weile stehen bleibt (NF-03).
 */
export function DevSize(props: { zoom: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [said, setSaid] = useState('');
  useEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setBox({ w: Math.round(r.width), h: Math.round(r.height) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const page = pageSize(box.w, box.h, props.zoom);
  const cls = breakpointOf(page.w);
  useEffect(() => {
    if (!box.w) return;
    const t = window.setTimeout(() => setSaid(DEV_TEXT.said(page.w, page.h, cls, props.zoom)), 900);
    return () => window.clearTimeout(t);
  }, [page.w, page.h, cls, props.zoom, box.w]);
  return (
    <div ref={ref} className="devsize" title={DEV_TEXT.title}>
      <strong className="devsize__px">{DEV_TEXT.size(page.w, page.h)}</strong>
      <span className="devsize__cls">{cls}</span>
      {props.zoom !== 100 && <span className="devsize__zoom">{DEV_TEXT.zoomed(props.zoom, box.w, box.h)}</span>}
      <span className="sr-only" role="status" aria-live="polite">
        {said}
      </span>
    </div>
  );
}
