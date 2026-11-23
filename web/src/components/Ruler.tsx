import { Icon } from './Icon';
import { useEffect, useRef, useState } from 'react';
import type { RulerSettings } from '../workspace/types';
import { RULER_COLORS } from '../workspace/workspace';
import { rulerSteps } from '../workspace/dev';
import { RULER_TEXT } from '../workspace/terms';

/** Symbol Lineal: schräg gestelltes Lineal mit Strichen (wie im alten Projekt). */
export const RulerIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="icon">
    <g transform="rotate(-45 8 8)">
      <rect x="0.8" y="5" width="14.4" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M3.5 5v2.2M6 5v1.5M8.5 5v2.2M11 5v1.5M13.5 5v2.2" stroke="currentColor" strokeWidth="1" />
    </g>
  </svg>
);

/**
 * Striche oben und links in Seiten-Pixeln (V55): `f` = Bildschirmpunkte je Seiten-Pixel.
 * Ohne Zoom wie bisher: alle 10 px kurz, alle 50 px mittel, alle 100 px lang.
 */
function ticks(len: number, horizontal: boolean, f: number, st: { minor: number; mid: number; major: number }): string {
  let d = '';
  for (let i = st.minor; i * f < len; i += st.minor) {
    const l = i % st.major === 0 ? 14 : i % st.mid === 0 ? 9 : 5;
    const at = Math.round(i * f) + 0.5;
    d += horizontal ? `M${at} 0v${l}` : `M0 ${at}h${l}`;
  }
  return d;
}

/**
 * F-15, F-125: Lineal über der Seite im Panel. Die Seite bleibt bedienbar (nur die kleinen Knöpfe
 * oben rechts nehmen Klicks an). Unten rechts steht die Größe, die die Seite sieht (CSS-Pixel).
 * V55: `scale` = Bildschirmpunkte je Seiten-Pixel (Zoom, Zoom-Test, eingepasstes Gerät); `box` legt das
 * Lineal genau auf den Umriss des Geräts. So stimmen die Zahlen für Entwickler auch bei Zoom.
 */
export function Ruler(props: {
  settings: RulerSettings;
  scale?: number;
  box?: { left: number; top: number; width: number; height: number } | null;
  /** genaue Größe der Seite, wenn bekannt (Entwickler-Modus) – sonst aus der Fläche gerechnet */
  page?: { w: number; h: number };
  onStyle: (change: { labels?: boolean; color?: number }) => void;
  onClose: () => void;
}) {
  const f = props.scale && props.scale > 0 ? props.scale : 1;
  const st = rulerSteps(f);
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const { labels, color } = props.settings;
  const stroke = RULER_COLORS[color] ?? RULER_COLORS[0];
  // Dunkle Striche brauchen einen hellen Schatten, helle einen dunklen – sonst verschwinden sie auf der Seite.
  const halo = color === 7 ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.7)';

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Zahlen in Seiten-Pixeln, an den langen Strichen
  const marks = (len: number) => Array.from({ length: Math.max(0, Math.floor((len / f - 1) / st.label)) }, (_, i) => (i + 1) * st.label);
  const page = props.page ?? { w: Math.round(size.w / f), h: Math.round(size.h / f) };
  const pct = Math.round(f * 100);

  return (
    <div className="ruler" ref={ref} aria-hidden="false" style={props.box ? { inset: 'auto', ...props.box } : undefined}>
      <svg className="ruler__svg" width={size.w} height={size.h} style={{ filter: `drop-shadow(0 0 1px ${halo})` }}>
        <path d={ticks(size.w, true, f, st) + ticks(size.h, false, f, st)} stroke={stroke} strokeWidth="1" opacity="0.85" />
        {labels &&
          marks(size.w).map((x) => (
            <text key={`x${x}`} x={Math.round(x * f) + 3} y={22} fill={stroke} className="ruler__num">
              {x}
            </text>
          ))}
        {labels &&
          marks(size.h).map((y) => (
            <text key={`y${y}`} x={17} y={Math.round(y * f) + 4} fill={stroke} className="ruler__num">
              {y}
            </text>
          ))}
      </svg>
      <span className="ruler__size" style={{ color: stroke }} title={RULER_TEXT.sizeTitle}>
        {RULER_TEXT.size(page.w, page.h)}
        {pct !== 100 && <span className="ruler__shown">{RULER_TEXT.shown(pct)}</span>}
      </span>
      <div className="ruler__tools" onPointerDown={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="ruler__color"
          style={{ background: stroke }}
          onClick={() => props.onStyle({ color: color + 1 })}
          onWheel={(e) => props.onStyle({ color: color + (e.deltaY > 0 ? 1 : -1) })}
          title="Strichfarbe wechseln (Klick oder Mausrad)"
          aria-label="Strichfarbe wechseln"
        />
        <button type="button" className={labels ? 'on' : ''} onClick={() => props.onStyle({ labels: !labels })} title="Zahlen ein/aus" aria-label="Zahlen ein- oder ausblenden" aria-pressed={labels}>
          123
        </button>
        <button type="button" onClick={props.onClose} title="Lineal in diesem Portal ausblenden" aria-label="Lineal ausblenden">
          <Icon name="close" size={14} />
        </button>
      </div>
    </div>
  );
}
