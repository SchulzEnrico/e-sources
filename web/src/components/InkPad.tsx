/**
 * V143 (F-238 Handschrift, Plan V142 Punkt 2): Schreibfläche mit Pointer Events – Apple Pencil (Druck), Finger,
 * Maus und Trackpad. Sobald ein Stift erkannt ist, scrollt der Finger statt zu schreiben (Handflächen-Schutz).
 * Werkzeuge Stift · Marker · Radierer, drei Farben, Rückgängig/Wiederholen, „Alles löschen“ mit Rückgängig am Ort.
 *
 * Barrierefreiheit (NF-03): Leiste ganz per Tastatur (Tab, Enter/Leertaste; ⌘/Strg+Z, ⌘/Strg+Umschalt+Z), die
 * Fläche ist `role="img"` mit Textalternative (Text dazu bzw. „Handschrift, n Striche“). Wer nicht zeichnen kann,
 * schreibt ins Feld „Text dazu“ (dort kritzelt das iPad auch selbst um).
 */
import { type PointerEvent as RPointerEvent, useCallback, useEffect, useRef, useState } from 'react';
import { INK_TEXT as T } from '../workspace/terms';
import { INK_COLORS, INK_WIDTH, MARKER_COLOR, type InkPoint, type InkStroke, type InkTool, inkAlt, inkCount, roundStroke } from '../workspace/ink';
import { Icon } from './Icon';

export interface InkPadProps {
  strokes: InkStroke[];
  w: number;
  h: number;
  /** Ansicht klein (Unterschrift): weniger Werkzeuge */
  compact?: boolean;
  text: string;
  onText: (t: string) => void;
  onChange: (s: InkStroke[]) => void;
  /** Umwandeln (wo möglich) – liefert Text oder null */
  onConvert?: (s: InkStroke[]) => Promise<string | null>;
  say: (t: string) => void;
}

function paint(ctx: CanvasRenderingContext2D, s: InkStroke, from = 1) {
  const p = s.pts;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = s.tool === 'eraser' ? 'destination-out' : 'source-over';
  ctx.globalAlpha = s.tool === 'marker' ? 0.45 : 1;
  ctx.strokeStyle = s.tool === 'eraser' ? '#000' : s.color;
  if (p.length === 1) {
    ctx.fillStyle = ctx.strokeStyle as string;
    ctx.beginPath();
    ctx.arc(p[0][0], p[0][1], (s.width * (s.tool === 'pen' ? 0.6 + p[0][2] : 1)) / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = Math.max(1, from); i < p.length; i++) {
    const a = p[i - 1];
    const b = p[i];
    ctx.lineWidth = s.tool === 'pen' ? s.width * (0.6 + (a[2] + b[2]) / 2) : s.width;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  ctx.restore();
}

export function InkPad(p: InkPadProps) {
  const { strokes, w, h } = p;
  const cv = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<InkTool>('pen');
  const [color, setColor] = useState<string>(INK_COLORS[0]);
  const [redo, setRedo] = useState<InkStroke[][]>([]);
  const [cleared, setCleared] = useState<InkStroke[] | null>(null);
  const [penSeen, setPenSeen] = useState(false);
  const [busy, setBusy] = useState(false);
  const live = useRef<{ id: number; s: InkStroke } | null>(null);
  const clearT = useRef(0);
  const strokesRef = useRef(strokes);
  strokesRef.current = strokes;

  const ratio = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;
  const redraw = useCallback(() => {
    const c = cv.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, w, h);
    for (const s of strokesRef.current) paint(ctx, s);
    if (live.current) paint(ctx, live.current.s);
  }, [ratio, w, h]);
  useEffect(() => redraw(), [strokes, redraw]);
  useEffect(() => () => window.clearTimeout(clearT.current), []);

  const pos = (e: { clientX: number; clientY: number; pressure: number; pointerType: string }): InkPoint => {
    const r = cv.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / Math.max(1, r.width)) * w;
    const y = ((e.clientY - r.top) / Math.max(1, r.height)) * h;
    // Maus/Trackpad melden 0,5 beim Drücken – Stift echten Druck; 0 (manche Finger) = mittel
    const pr = e.pointerType === 'pen' ? e.pressure || 0.5 : 0.5;
    return [x, y, pr];
  };
  const down = (e: RPointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'pen' && !penSeen) setPenSeen(true);
    // Handflächen-Schutz: ist ein Stift bekannt, schreibt der Finger nicht
    if (e.pointerType === 'touch' && penSeen) return;
    if (e.button > 0) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* Zeiger schon weg – Strich trotzdem beginnen */
    }
    const t: InkTool = e.pointerType === 'pen' && (e.buttons & 32) ? 'eraser' : tool; // Radierer-Ende des Stifts
    live.current = { id: e.pointerId, s: { tool: t, color: t === 'marker' ? MARKER_COLOR : color, width: INK_WIDTH[t], pts: [pos(e)] } };
    redraw();
  };
  const move = (e: RPointerEvent<HTMLCanvasElement>) => {
    const L = live.current;
    if (!L || L.id !== e.pointerId) return;
    e.preventDefault();
    const evs = typeof e.nativeEvent.getCoalescedEvents === 'function' ? e.nativeEvent.getCoalescedEvents() : [];
    const from = L.s.pts.length;
    for (const ev of evs.length ? evs : [e.nativeEvent]) L.s.pts.push(pos(ev));
    const ctx = cv.current?.getContext('2d');
    if (ctx && L.s.tool !== 'eraser' && L.s.tool !== 'marker') paint(ctx, L.s, from);
    else redraw();
  };
  const up = (e: RPointerEvent<HTMLCanvasElement>) => {
    const L = live.current;
    if (!L || L.id !== e.pointerId) return;
    live.current = null;
    const s = roundStroke(L.s);
    if (!s.pts.length) return redraw();
    setRedo([]);
    setCleared(null);
    const next = [...strokesRef.current, s];
    strokesRef.current = next; // schnelle Striche hintereinander gehen nicht verloren
    p.onChange(next);
  };

  const undo = () => {
    if (cleared) return restore();
    const cur = strokesRef.current;
    if (!cur.length) return;
    setRedo((r) => [...r, [cur[cur.length - 1]]]);
    p.onChange(cur.slice(0, -1));
    p.say(T.undo);
  };
  const again = () => {
    const last = redo[redo.length - 1];
    if (!last) return;
    setRedo((r) => r.slice(0, -1));
    p.onChange([...strokesRef.current, ...last]);
    p.say(T.redo);
  };
  const clear = () => {
    if (!strokesRef.current.length) return;
    setCleared(strokesRef.current);
    setRedo([]);
    p.onChange([]);
    p.say(T.cleared);
    window.clearTimeout(clearT.current);
    clearT.current = window.setTimeout(() => setCleared(null), 8000);
  };
  const restore = () => {
    if (!cleared) return;
    window.clearTimeout(clearT.current);
    p.onChange(cleared);
    setCleared(null);
    p.say(T.restore);
  };
  const convert = async () => {
    if (!p.onConvert || busy) return;
    setBusy(true);
    p.say(T.converting);
    try {
      const t = await p.onConvert(strokesRef.current);
      if (t) {
        p.onText(t);
        p.say(T.converted);
      }
    } finally {
      setBusy(false);
    }
  };

  const keys = (e: React.KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'z' && !(e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault();
      e.stopPropagation();
      if (e.shiftKey) again();
      else undo();
    }
  };

  const n = inkCount(strokes);
  const tools: InkTool[] = p.compact ? ['pen', 'eraser'] : ['pen', 'marker', 'eraser'];
  return (
    <div className={`ink${p.compact ? ' ink--sign' : ''}`} onKeyDown={keys}>
      <div className="ink__bar" role="toolbar" aria-label={T.tools}>
        <span className="ink__group" role="radiogroup" aria-label={T.tools}>
          {tools.map((t) => (
            <button key={t} type="button" role="radio" aria-checked={tool === t} className={`ink__btn${tool === t ? ' is-on' : ''}`} title={T[t]} onClick={() => setTool(t)}>
              <Icon name={t} size={15} /> <span className="ink__lbl">{T[t]}</span>
            </button>
          ))}
        </span>
        <span className="ink__group" role="radiogroup" aria-label={T.color}>
          {INK_COLORS.map((c, i) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === c}
              aria-label={T.colors[i]}
              title={T.colors[i]}
              className={`ink__color${color === c ? ' is-on' : ''}`}
              style={{ ['--ink' as string]: c }}
              disabled={tool !== 'pen'}
              onClick={() => setColor(c)}
            />
          ))}
        </span>
        <span className="ink__group">
          <button type="button" className="ink__btn" title={`${T.undo} (⌘/Strg+Z)`} aria-label={T.undo} disabled={!strokes.length && !cleared} onClick={undo}>
            <Icon name="undo" size={15} />
          </button>
          <button type="button" className="ink__btn" title={`${T.redo} (⌘/Strg+Umschalt+Z)`} aria-label={T.redo} disabled={!redo.length} onClick={again}>
            <Icon name="redo" size={15} />
          </button>
          <button type="button" className="ink__btn" title={T.clear} aria-label={T.clear} disabled={!strokes.length} onClick={clear}>
            <Icon name="trash" size={15} />
          </button>
        </span>
        {cleared && (
          // Meldung am Ort (Wunsch Enrico): direkt an der Leiste, mit Rückgängig
          <span className="ink__msg" role="status">
            {T.cleared}
            <button type="button" className="note__undo" onClick={restore}>
              {T.restore}
            </button>
          </span>
        )}
      </div>
      <div className="ink__paper" style={{ aspectRatio: `${w} / ${h}`, maxWidth: w }}>
        <canvas
          ref={cv}
          className="ink__canvas"
          width={Math.round(w * ratio)}
          height={Math.round(h * ratio)}
          role="img"
          aria-label={`${T.area}: ${inkAlt({ text: p.text }, n)}`}
          title={T.areaHint}
          // vor einem Stift schreibt der Finger (touch-action none); danach darf er scrollen
          style={{ touchAction: penSeen ? 'pan-x pan-y' : 'none' }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        />
      </div>
      {!p.compact && (
        <div className="ink__text">
          <label className="ink__textlbl" htmlFor="ink-text" title={T.textHint}>
            {T.textLabel}
          </label>
          <textarea id="ink-text" className="ink__field" rows={2} value={p.text} placeholder={T.textHint} onChange={(e) => p.onText(e.target.value)} />
          <button type="button" className="ink__btn ink__convert" title={T.convertHint} disabled={!strokes.length || busy} onClick={() => void convert()}>
            {busy ? T.converting : T.convert}
          </button>
        </div>
      )}
    </div>
  );
}
