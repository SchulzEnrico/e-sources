/**
 * F-215 (V69, Wunsch Enrico): Fußleiste mit Home-Knopf im Pad.
 * Die Leiste gehört zum Gehäuse des Pads (wirkt physisch, wie der Rand unter dem Display beim iPhone 7),
 * der Knopf ist ein flacher, leicht vertiefter Kreis mit feinem Ring in Akzentfarbe – ohne Quadrat.
 * Tippen = Home (zur Liste). Halten (ab 0,4 s) = Halbkreis-Menü über dem Knopf; in Richtung eines Eintrags
 * wischen vergrößert ihn (V70), Loslassen wählt. Tastatur (NF-03): Enter/Leertaste = Home, Pfeil hoch oder Leertaste halten = Halbkreis,
 * im Halbkreis Pfeil links/rechts wählen, Enter ausführen, Esc schließen.
 * Schritt 2 (V70): Drücken und waagerecht wischen – kurz = andere Note, weit = anderes Sheet. Dabei erscheint
 * eine flache, eingravierte Schiene im Gehäuse (bewusst anders als das Glas des Halbkreises), die Fläche folgt
 * dem Finger. Tastatur am Knopf: Pfeil links/rechts = Note, Umschalt+Pfeil = Sheet.
 * Schritt 1: Home, Halbkreis, Neue Note. Zuletzt, Sprache, Aufgabe, Suche, Bild & Teilen folgen.
 */
import { type CSSProperties, type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from 'react';
import { FOOT_TEXT } from '../workspace/terms';
import type { IconName } from '../workspace/icons';
import { Icon } from './Icon';
import { ARC_ANGLES, ARC_INNER, ARC_MAIN, aimItem, nearness, arcPos, firstItem, stepItem, type SwipeKind, swipeKind } from '../workspace/footArc';

export interface FootItem {
  id: string;
  label: string;
  icon: IconName;
  /** fehlt = folgt (sichtbar, aber gesperrt) */
  run?: () => void;
}

const HOLD_MS = 400;
const CLOSE_MS = 160;
const REDUCED = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const MOVE_PX = 8;

export function PadFooter(props: {
  items: FootItem[];
  onHome: () => void;
  say: (text: string) => void;
  /** Wischen bzw. Pfeil am Knopf ausgeführt */
  onSwipe: (kind: SwipeKind, dir: 1 | -1) => void;
  /** Ziel für die Schiene („Note: Titel“, „Kein weiteres Sheet“) */
  swipeLabel: (kind: SwipeKind, dir: 1 | -1) => string;
  /** Fläche folgt dem Finger: Weg in px, null = losgelassen */
  onDrag: (dx: number | null) => void;
}) {
  const { items, onHome, say, onSwipe, swipeLabel, onDrag } = props;
  const [drag, setDrag] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  // V70: Halbkreis bleibt beim Schließen kurz stehen, damit die Einträge zurück in den Knopf gleiten
  const [closing, setClosing] = useState(false);
  const closeT = useRef(0);
  const frame = useRef(0);
  const [hot, setHot] = useState(-1);
  const hotRef = useRef(-1);
  hotRef.current = hot;
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const timer = useRef(0);
  const start = useRef<{ x: number; y: number; moved: boolean; wasOpen: boolean; swipe: boolean } | null>(null);
  const spaceHeld = useRef(false);
  const skipClick = useRef(false);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      window.clearTimeout(closeT.current);
      cancelAnimationFrame(frame.current);
    },
    [],
  );
  useEffect(() => {
    if (open && hot >= 0) menu.current?.querySelector<HTMLElement>(`[data-i="${hot}"]`)?.focus();
  }, [open, hot]);

  const first = () => firstItem(items);
  const openMenu = (focus: boolean) => {
    window.clearTimeout(closeT.current);
    setClosing(false);
    setOpen(true);
    setHot(focus ? first() : -1);
    say(FOOT_TEXT.opened);
  };
  const closeMenu = (back = true) => {
    setOpen(false);
    setHot(-1);
    if (!REDUCED()) {
      setClosing(true);
      window.clearTimeout(closeT.current);
      closeT.current = window.setTimeout(() => setClosing(false), CLOSE_MS);
    }
    if (back) btn.current?.focus();
  };
  const run = (i: number) => {
    const it = items[i];
    if (!it?.run) return;
    closeMenu(false);
    it.run();
  };

  // ---------------------------------------------------------------- Zeiger
  const down = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY, moved: false, wasOpen: open, swipe: false };
    window.clearTimeout(timer.current);
    if (!open) timer.current = window.setTimeout(() => openMenu(false), HOLD_MS);
  };
  // V70: Größe stufenlos nach Nähe (wie die Lupe im Dock des Mac) – direkt am Element, ohne Neuzeichnen
  const lens = (x: number, y: number) => {
    const r = btn.current?.getBoundingClientRect();
    const box = menu.current;
    if (!r || !box) return;
    const n = nearness(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
    box.classList.add('is-aiming');
    box.querySelectorAll<HTMLElement>('[data-i]').forEach((el) => el.style.setProperty('--near', String(n[Number(el.dataset.i)] ?? 0)));
  };
  // Eintrag unter dem Finger, sonst der in Wischrichtung (V70: Richtung genügt, Eintrag wird größer)
  const itemAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-i]');
    if (el && menu.current?.contains(el)) return Number(el.dataset.i);
    const r = btn.current?.getBoundingClientRect();
    return r ? aimItem(x - (r.left + r.width / 2), y - (r.top + r.height / 2), undefined, hotRef.current) : -1;
  };
  const move = (e: PointerEvent<HTMLButtonElement>) => {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.hypot(dx, dy) > MOVE_PX) s.moved = true;
    if (open) {
      const x = e.clientX;
      const y = e.clientY;
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        lens(x, y);
        setHot(itemAt(x, y));
      });
      return;
    }
    // waagerecht vor dem Halten → Wischen (Halbkreis öffnet dann nicht)
    if (!s.swipe && Math.abs(dx) > MOVE_PX && Math.abs(dx) > Math.abs(dy)) {
      s.swipe = true;
      window.clearTimeout(timer.current);
    }
    if (s.swipe) {
      // im Takt des Bildschirms, nicht bei jedem Zeiger-Ereignis
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        setDrag(dx);
        onDrag(dx);
      });
    }
  };
  const up = (e: PointerEvent<HTMLButtonElement>) => {
    const s = start.current;
    start.current = null;
    window.clearTimeout(timer.current);
    if (!s) return;
    if (s.swipe) {
      endDrag();
      const k = swipeKind(e.clientX - s.x);
      if (k) onSwipe(k.kind, k.dir);
      return;
    }
    if (open) {
      const i = itemAt(e.clientX, e.clientY);
      if (i >= 0 && items[i].run) run(i);
      else if (s.moved || s.wasOpen) closeMenu();
      // nach dem Halten ohne Bewegung losgelassen: Halbkreis bleibt offen zum Antippen
      return;
    }
    if (!s.moved) onHome();
  };
  const endDrag = () => {
    cancelAnimationFrame(frame.current);
    setDrag(null);
    onDrag(null);
  };
  const cancel = () => {
    if (start.current?.swipe) endDrag();
    start.current = null;
    window.clearTimeout(timer.current);
  };

  // ---------------------------------------------------------------- Tastatur
  const keyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !open && !e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      onSwipe(e.shiftKey ? 'sheet' : 'note', e.key === 'ArrowRight' ? 1 : -1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      openMenu(true);
    } else if (e.key === ' ') {
      e.preventDefault();
      if (!spaceHeld.current) {
        spaceHeld.current = true;
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => openMenu(true), HOLD_MS);
      }
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      e.stopPropagation();
      closeMenu();
    }
  };
  const keyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== ' ') return;
    e.preventDefault();
    skipClick.current = true;
    window.setTimeout(() => (skipClick.current = false), 0);
    const wasHeld = spaceHeld.current;
    spaceHeld.current = false;
    window.clearTimeout(timer.current);
    if (wasHeld && !open) onHome();
  };
  const click = (e: { detail: number }) => {
    // Enter (detail 0); Zeiger und Leertaste laufen über up/keyUp
    if (e.detail === 0 && !spaceHeld.current && !skipClick.current) onHome();
  };
  const menuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    menu.current?.classList.remove('is-aiming'); // Tastatur: Größe wieder nach Auswahl
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      e.stopPropagation();
      // links = höherer Winkel = kleinerer Index
      setHot((h) => stepItem(items, h < 0 ? first() : h, e.key === 'ArrowLeft' ? -1 : 1));
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      // V70: Mitte des Halbkreises – runter = innerer Platz, hoch = oben in der Mitte
      e.preventDefault();
      e.stopPropagation();
      const to = e.key === 'ArrowDown' ? ARC_INNER : ARC_MAIN;
      if (items[to]?.run) setHot(to);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeMenu();
      say(FOOT_TEXT.closed);
    } else if (e.key === 'Tab') {
      closeMenu(false);
    }
  };
  // Leertaste, die den Halbkreis geöffnet hat, wird über einem Eintrag losgelassen
  const menuKeyUp = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === ' ' && spaceHeld.current) {
      e.preventDefault();
      spaceHeld.current = false;
    }
  };

  const k = drag === null ? null : swipeKind(drag);
  const side = drag === null ? 0 : drag < 0 ? -1 : 1;
  return (
    <footer className={`padfoot${open ? ' is-open' : ''}${drag !== null ? ' is-swiping' : ''}`}>
      {/* Kerben links/rechts im Gehäuse: zeigen, dass man am Knopf wischen kann */}
      <span className="padfoot__notch padfoot__notch--l" aria-hidden="true">‹</span>
      <span className="padfoot__notch padfoot__notch--r" aria-hidden="true">›</span>
      {drag !== null && (
        <div className={`padfoot__rail${side < 0 ? ' is-left' : ' is-right'}`} aria-hidden="true">
          <span className="padfoot__railgoal">
            {k ? `${side < 0 ? '‹ ' : ''}${swipeLabel(k.kind, k.dir)}${side > 0 ? ' ›' : ''}` : side < 0 ? '‹' : '›'}
          </span>
          <span className="padfoot__raillegend">
            <span className={k?.kind === 'note' ? 'is-on' : ''}>{FOOT_TEXT.swipeShort}</span>
            <span className={k?.kind === 'sheet' ? 'is-on' : ''}>{FOOT_TEXT.swipeLong}</span>
          </span>
        </div>
      )}
      {(open || closing) && (
        <div className={`padfoot__arc${closing && !open ? ' is-closing' : ''}`} role="menu" aria-label={FOOT_TEXT.menu} ref={menu} onKeyDown={menuKey} onKeyUp={menuKeyUp}>
          {items.map((it, i) => {
            const p = arcPos(i);
            const label = it.run ? it.label : FOOT_TEXT.soon(it.label);
            return (
              <button
                key={it.id}
                type="button"
                role="menuitem"
                data-i={i}
                tabIndex={i === hot ? 0 : -1}
                className={`padfoot__item${i === hot ? ' is-hot' : ''}${ARC_ANGLES[i] === 90 ? ' is-main' : ''}`}
                style={{ transform: `translate(${p.x}px, ${p.y}px)`, '--i': i } as CSSProperties}
                aria-disabled={it.run ? undefined : 'true'}
                title={label}
                aria-label={label}
                onClick={() => run(i)}
              >
                <Icon name={it.icon} size={16} />
                <span className="padfoot__label">{it.label}</span>
              </button>
            );
          })}
        </div>
      )}
      <button
        ref={btn}
        type="button"
        className="padfoot__home"
        aria-label={`${FOOT_TEXT.home}. ${FOOT_TEXT.homeHint}`}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`${FOOT_TEXT.home} – ${FOOT_TEXT.homeHint}`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={cancel}
        onKeyDown={keyDown}
        onKeyUp={keyUp}
        onClick={click}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span className="padfoot__ring" aria-hidden="true" />
      </button>
    </footer>
  );
}
