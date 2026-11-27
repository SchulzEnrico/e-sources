/**
 * V83 (F-216, Wunsch Enrico V82): Umschalt-Rad – ein Bauteil für alle Knöpfe, die zwischen Modi umschalten.
 * Gestaltung nach dem Daumenrad der MX Master: links und rechts eine breite, geriffelte Metallwalze, in der Mitte Symbol
 * und Name des gewählten Modus.
 * V83 (Enrico: „Drehgefühl wie beim Überschrift-Rad“): gebaut wie das Überschrift-Rad – die Namen liegen auf einem
 * echten Scrollband, das stufenlos dem Finger, dem Trackpad bzw. dem Mausrad folgt, auf jedem Modus einrastet und zur
 * Mitte hin gewölbt ist; die Walzen laufen stufenlos mit. Nachbarn erscheinen beim Hover, Fokus und Drehen.
 * Bedienung: Zeiger darüber + Scrollen, Wischen (Touch) bzw. Ziehen (Maus) hoch/runter, Klick = nächster,
 * Umschalt+Klick = voriger, Pfeiltasten (hoch/links = voriger), Pos1/Ende, Enter/Leertaste = nächster.
 * Bildschirmleser: Schieberegler mit Wert („Notizen, 2 von 2“). U1: Umschalten 0,3 s nach dem Einrasten; U3: Anschlag
 * bei 2–5 Modi, ringsum bei vielen (Band dreifach, springt unsichtbar in die Mitte zurück). „Bewegung reduzieren“:
 * ohne weiches Scrollen.
 */
import { type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { IconName } from '../workspace/icons';
import { COMMIT_MS, DRAG_PX, clickTurn, keyTurn, turnFrom, valueText, wrapsFor } from '../workspace/modeWheel';
import { WHEEL_TEXT } from '../workspace/terms';
import { Icon } from './Icon';

/** `glyph` = eigenes Symbol statt `icon` (z. B. das Bild der View) */
export type WheelOption = { id: string; name: string; icon?: IconName; glyph?: ReactNode; hint?: string };

const ROW = 20; // Höhe eines Namens (px) – in der Mulde (22 px mit Rand)
const PEEK = 12; // so weit ragen die Nachbarn beim Drehen über und unter den Knopf (px)
const SETTLE_MS = 90; // ohne neues Scrollen gilt das Rad als eingerastet
const calm = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function ModeWheel(props: {
  /** Name des Rads für Bildschirmleser, z. B. „Arbeitsweise dieses Desks“ */
  label: string;
  options: WheelOption[];
  value: string;
  onChange: (id: string) => void;
  /** ringsum statt Anschlag (ab Werk: ab 6 Modi) */
  wrap?: boolean;
  className?: string;
  /** V84: feste Id, z. B. damit ein Hinweis das Rad fokussieren kann („set-pause“) */
  id?: string;
  /** Wert passt zu keiner Raste (z. B. Rad „Pads“ = Gemischt): Name dafür; steht zwischen `after` und `after + 1` */
  between?: { name: string; after: number };
  /** gesperrt (z. B. keine Pads): bleibt fokussierbar und sagt im Tooltip, warum */
  disabled?: boolean;
  disabledHint?: string;
  /**
   * V111 (Enrico: „+ Sheet“ als Auswahlrad – „bei Klick dann wie gewohnt“): Auswahl-Rad statt Umschalter.
   * Drehen (Scrollen, Wischen, Pfeile) wählt, Klick bzw. Enter/Leertaste löst die gewählte Stellung aus.
   */
  onPress?: (id: string) => void;
  /** F-220 (V116, R3): Menü am Rad – Rechtsklick, Umschalt+F10 bzw. Kontextmenü-Taste */
  onMenu?: () => void;
  /** F-220 (R3): Alt+Pfeil verschiebt den gewählten Eintrag (−1 nach vorn, +1 nach hinten) */
  onAltStep?: (dir: -1 | 1) => void;
}) {
  const { options, value, onChange } = props;
  const count = options.length;
  const found = options.findIndex((o) => o.id === value);
  const mixed = found < 0 && !!props.between;
  const after = props.between?.after ?? 0;
  const wrap = wrapsFor(count, props.wrap) && !mixed;
  // Band: bei „Gemischt“ steht der Zwischenwert als eigene Raste zwischen after und after + 1
  const band: WheelOption[] = mixed ? [...options.slice(0, after + 1), { id: '', name: props.between!.name }, ...options.slice(after + 1)] : options;
  const copies = wrap ? 3 : 1;
  const list = Array.from({ length: copies }, () => band).flat();
  const base = wrap ? band.length : 0; // Anfang der mittleren Kopie
  const target = base + (mixed ? after + 1 : Math.max(0, found));

  const [at, setAt] = useState(target); // Raste im Band, die gerade in der Mitte steht
  const [turning, setTurning] = useState(false);
  const el = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const settle = useRef(0);
  /** V138: Ziel der laufenden Drehung – schnelle Tastendrücke zählen von dort weiter, statt in der Animation verloren zu gehen */
  const aim = useRef<number | null>(null);
  const commit = useRef(0);
  const own = useRef(false); // Scrollen kam vom Anwender – nicht von außen zurückstellen
  const drag = useRef<{ y: number; top: number; moved: boolean } | null>(null);
  const dragged = useRef(false);
  const swing = useRef(1); // V111: Klick-Richtung (1 vor, -1 zurück)
  // V117: letzte Bedienung (Rad, Maus, Finger, Taste) – Scrollen ohne Bedienung kommt vom Browser (z. B. ein
  // verstecktes Rad in der Überlauf-Leiste wird sichtbar und steht auf 0) und darf den Wert nicht umstellen
  const touched = useRef(0);
  const touch = () => (touched.current = Date.now());

  const opt = (i: number) => band[((i % band.length) + band.length) % band.length];
  const optIndex = (i: number) => options.indexOf(opt(i)); // -1 = Zwischenwert

  // Wölbung wie beim Überschrift-Rad; Walzen laufen stufenlos mit
  const curve = () => {
    const b = box.current;
    if (!b) return;
    const mid = b.scrollTop + PEEK + ROW / 2;
    b.querySelectorAll<HTMLElement>('.mwheel__item').forEach((it, i) => {
      const d = (PEEK + i * ROW + ROW / 2 - mid) / ROW;
      const a = Math.max(-80, Math.min(80, d * 38));
      it.style.transform = `rotateX(${-a}deg) scale(${1 - Math.min(Math.abs(d), 2) * 0.08})`;
      it.style.opacity = String(Math.max(0, 1 - Math.abs(d) * 0.42));
    });
    el.current?.style.setProperty('--mw-turn', String(b.scrollTop / ROW));
  };

  // Wert von außen (anderer Weg, anderer Desk) – nur, solange der Anwender nicht dreht
  useLayoutEffect(() => {
    const b = box.current;
    if (!b) return;
    if (own.current || commit.current || settle.current) return;
    b.scrollTop = target * ROW;
    setAt(target);
    curve();
  }, [target, list.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(
    () => () => {
      window.clearTimeout(settle.current);
      window.clearTimeout(commit.current);
    },
    [],
  );

  const onScroll = () => {
    const b = box.current;
    if (!b) return;
    curve();
    if (!own.current && Date.now() - touched.current > 2500) {
      // nicht vom Anwender: zurück auf den Wert stellen, nichts übernehmen (V117, Desk sprang beim Laden auf „Desk“)
      if (Math.abs(b.scrollTop - target * ROW) > 1) b.scrollTop = target * ROW;
      if (at !== target) setAt(target);
      return;
    }
    const i = Math.max(0, Math.min(list.length - 1, Math.round(b.scrollTop / ROW)));
    if (i !== at) setAt(i);
    if (props.disabled) return;
    own.current = true;
    setTurning(true);
    window.clearTimeout(settle.current);
    window.clearTimeout(commit.current);
    commit.current = 0;
    settle.current = window.setTimeout(() => {
      settle.current = 0;
      aim.current = null;
      let k = Math.max(0, Math.min(list.length - 1, Math.round(b.scrollTop / ROW)));
      // ringsum: unsichtbar in die mittlere Kopie zurück, damit es weiter in beide Richtungen geht
      if (wrap && (k < base || k >= base * 2)) {
        const back = base + (k % base);
        b.scrollTop += (back - k) * ROW;
        k = back;
        setAt(k);
        curve();
      }
      commit.current = window.setTimeout(() => {
        commit.current = 0;
        own.current = false;
        setTurning(false);
        const id = opt(k)?.id;
        if (id && id !== value) onChange(id);
      }, Math.max(0, COMMIT_MS - SETTLE_MS));
    }, SETTLE_MS);
  };

  /** Zu einer Raste im Band drehen (weich, wie mit dem Finger). */
  const roll = (i: number) => {
    const b = box.current;
    if (!b || props.disabled || count < 2) return;
    touch();
    i = Math.max(0, Math.min(list.length - 1, i));
    aim.current = i;
    b.scrollTo({ top: i * ROW, behavior: calm() ? 'auto' : 'smooth' });
  };
  /** Ziel als Modus-Nummer → Raste im Band, möglichst kurzer Weg (ringsum über die Nachbarkopie). */
  const rollTo = (n: number, dir: number, from = at) => {
    let i = base + (mixed && n > after ? n + 1 : n);
    if (wrap) {
      if (dir > 0 && i < from) i += base;
      if (dir < 0 && i > from) i -= base;
    }
    roll(i);
  };
  const cur = optIndex(at); // -1 = Zwischenwert

  const click = (e: MouseEvent<HTMLDivElement>) => {
    if (dragged.current) return void (dragged.current = false);
    if (props.onPress) return props.onPress(opt(at).id);
    step(e.shiftKey);
  };
  /** Klick bzw. Enter/Leertaste. V111: Pendel – am Anschlag kehrt die Richtung um, bis das andere Ende erreicht ist. */
  const step = (shift: boolean) => {
    let back = shift !== (swing.current < 0);
    if (!wrap && cur >= 0 && (back ? cur === 0 : cur === count - 1)) (swing.current = -swing.current, (back = !back));
    if (wrap) return roll(at + (back ? -1 : 1));
    rollTo(cur < 0 ? turnFrom(-1, back ? -1 : 1, count, false, after) : clickTurn(cur, count, back), back ? -1 : 1);
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    if (props.onMenu && (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10'))) return void (e.preventDefault(), props.onMenu());
    if (props.onAltStep && e.altKey && !e.ctrlKey && !e.metaKey && e.key.startsWith('Arrow')) {
      e.preventDefault();
      e.stopPropagation();
      return props.onAltStep(e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 1);
    }
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'Enter' || e.key === ' ') return void (e.preventDefault(), props.onPress ? props.onPress(opt(at).id) : step(e.shiftKey));
    const back = e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'Home';
    // V138: während das Rad noch dreht, vom Ziel aus weiterzählen (Kapitel-Rad verlor Tastendrücke)
    const from = aim.current ?? at;
    const cur = optIndex(from);
    const n = cur < 0 && e.key !== 'Home' && e.key !== 'End' ? (keyTurn(e.key, 0, 2, false) === null ? null : turnFrom(-1, back ? -1 : 1, count, false, after)) : keyTurn(e.key, Math.max(0, cur), count, wrap);
    if (n === null) return;
    e.preventDefault();
    if (wrap && (e.key.startsWith('Arrow') || e.key === 'Enter' || e.key === ' ')) return roll(from + (back ? -1 : 1));
    rollTo(n, back ? -1 : 1, from);
  };
  // Ziehen mit der Maus wie Wischen (Touch scrollt das Band von selbst)
  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || !box.current) return;
    drag.current = { y: e.clientY, top: box.current.scrollTop, moved: false };
    dragged.current = false;
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const b = box.current;
    if (!d || !b || props.disabled) return;
    const dy = d.y - e.clientY;
    if (!d.moved && Math.abs(dy) < DRAG_PX) return;
    if (!d.moved) {
      d.moved = true;
      dragged.current = true;
      e.currentTarget.setPointerCapture?.(e.pointerId);
      b.style.scrollSnapType = 'none';
    }
    touch();
    b.scrollTop = d.top + dy;
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (d?.moved && box.current) {
      box.current.style.scrollSnapType = '';
      roll(Math.round(box.current.scrollTop / ROW));
    }
  };

  const shown = opt(at);
  const title = props.disabled
    ? `${props.label}: ${props.disabledHint ?? ''}`
    : `${props.label}: ${shown?.name ?? ''}${shown?.hint ? ` – ${shown.hint}` : ''} · ${WHEEL_TEXT.hint}`;
  const text = !shown ? undefined : cur < 0 ? WHEEL_TEXT.between(shown.name, options[after]?.name ?? '', options[after + 1]?.name ?? '') : valueText(shown.name, cur, count);

  return (
    <div
      ref={el}
      className={`mwheel${turning ? ' is-turning' : ''}${mixed && cur < 0 ? ' is-between' : ''}${props.disabled ? ' is-off' : ''}${props.className ? ` ${props.className}` : ''}`}
      id={props.id}
      role="slider"
      tabIndex={0}
      aria-label={props.label}
      aria-orientation="vertical"
      aria-valuemin={1}
      aria-valuemax={count}
      aria-valuenow={cur < 0 ? after + 1.5 : cur + 1}
      aria-valuetext={text}
      aria-roledescription={WHEEL_TEXT.role}
      aria-disabled={props.disabled || undefined}
      title={title}
      onKeyDown={(e) => (touch(), key(e))}
      onClick={click}
      onWheel={touch}
      onTouchStart={touch}
      onTouchMove={touch}
      onPointerDownCapture={touch}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onContextMenu={props.onMenu ? (e) => (e.preventDefault(), props.onMenu!()) : undefined}
    >
      {/* V83 (Enrico): außen Knopf wie „Überschrift H1“, mittig das Rad in der dunklen Mulde */}
      <span className="mwheel__dial">
      <span className="mwheel__roll" aria-hidden="true" />
      <span className="mwheel__core" aria-hidden="true">
        {/* Breite nach dem längsten Namen: alle Namen unsichtbar übereinander */}
        <span className="mwheel__sizer">
          {band.map((o, i) => (
            <span key={i} className="mwheel__item">
              {o.glyph ?? (o.icon && <Icon name={o.icon} size={14} />)}
              <span className="tb-label mwheel__name">{o.name}</span>
            </span>
          ))}
        </span>
        <div ref={box} className="mwheel__win" onScroll={onScroll}>
          <div className="mwheel__spacer" />
          {list.map((o, i) => (
            <span key={i} className={`mwheel__item${i === at ? ' is-on' : ''}${o.id ? '' : ' is-mid'}`}>
              {o.glyph ?? (o.icon && <Icon name={o.icon} size={14} />)}
              <span className="tb-label mwheel__name">{o.name}</span>
            </span>
          ))}
          <div className="mwheel__spacer" />
        </div>
      </span>
      <span className="mwheel__roll" aria-hidden="true" />
      </span>
    </div>
  );
}
