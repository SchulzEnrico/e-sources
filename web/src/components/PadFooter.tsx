/**
 * F-215 (V69, Wunsch Enrico): Fußleiste mit Home-Knopf im Pad.
 * Die Leiste gehört zum Gehäuse des Pads (wirkt physisch, wie der Rand unter dem Display beim iPhone 7),
 * der Knopf ist ein flacher, leicht vertiefter Kreis mit feinem Ring in Akzentfarbe – ohne Quadrat.
 * Tippen = Home (zur Liste). Halten (ab 0,4 s) = Halbkreis-Menü über dem Knopf; Finger zum Eintrag ziehen
 * und loslassen wählt. Tastatur (NF-03): Enter/Leertaste = Home, Pfeil hoch oder Leertaste halten = Halbkreis,
 * im Halbkreis Pfeil links/rechts wählen, Enter ausführen, Esc schließen.
 * Schritt 1: Home, Halbkreis, Neue Note. Zuletzt, Sprache, Aufgabe, Suche, Bild & Teilen folgen.
 */
import { type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from 'react';
import { FOOT_TEXT } from '../workspace/terms';
import type { IconName } from '../workspace/icons';
import { Icon } from './Icon';
import { ARC_ANGLES, arcPos, firstItem, stepItem } from '../workspace/footArc';

export interface FootItem {
  id: string;
  label: string;
  icon: IconName;
  /** fehlt = folgt (sichtbar, aber gesperrt) */
  run?: () => void;
}

const HOLD_MS = 400;
const MOVE_PX = 8;

export function PadFooter(props: { items: FootItem[]; onHome: () => void; say: (text: string) => void }) {
  const { items, onHome, say } = props;
  const [open, setOpen] = useState(false);
  const [hot, setHot] = useState(-1);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const timer = useRef(0);
  const start = useRef<{ x: number; y: number; moved: boolean; wasOpen: boolean } | null>(null);
  const spaceHeld = useRef(false);
  const skipClick = useRef(false);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (open && hot >= 0) menu.current?.querySelector<HTMLElement>(`[data-i="${hot}"]`)?.focus();
  }, [open, hot]);

  const first = () => firstItem(items);
  const openMenu = (focus: boolean) => {
    setOpen(true);
    setHot(focus ? first() : -1);
    say(FOOT_TEXT.opened);
  };
  const closeMenu = (back = true) => {
    setOpen(false);
    setHot(-1);
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
    start.current = { x: e.clientX, y: e.clientY, moved: false, wasOpen: open };
    window.clearTimeout(timer.current);
    if (!open) timer.current = window.setTimeout(() => openMenu(false), HOLD_MS);
  };
  const itemAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-i]');
    return el && menu.current?.contains(el) ? Number(el.dataset.i) : -1;
  };
  const move = (e: PointerEvent<HTMLButtonElement>) => {
    const s = start.current;
    if (!s) return;
    if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > MOVE_PX) s.moved = true;
    if (open) setHot(itemAt(e.clientX, e.clientY));
  };
  const up = (e: PointerEvent<HTMLButtonElement>) => {
    const s = start.current;
    start.current = null;
    window.clearTimeout(timer.current);
    if (!s) return;
    if (open) {
      const i = itemAt(e.clientX, e.clientY);
      if (i >= 0 && items[i].run) run(i);
      else if (s.moved || s.wasOpen) closeMenu();
      // nach dem Halten ohne Bewegung losgelassen: Halbkreis bleibt offen zum Antippen
      return;
    }
    if (!s.moved) onHome();
    // Wischen links/rechts (F12) folgt in Schritt 2
  };
  const cancel = () => {
    start.current = null;
    window.clearTimeout(timer.current);
  };

  // ---------------------------------------------------------------- Tastatur
  const keyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowUp') {
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
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      e.stopPropagation();
      // links = höherer Winkel = kleinerer Index
      setHot((h) => stepItem(items, h < 0 ? first() : h, e.key === 'ArrowLeft' ? -1 : 1));
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

  return (
    <footer className={`padfoot${open ? ' is-open' : ''}`}>
      {open && (
        <div className="padfoot__arc" role="menu" aria-label={FOOT_TEXT.menu} ref={menu} onKeyDown={menuKey} onKeyUp={menuKeyUp}>
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
                style={{ transform: `translate(${p.x}px, ${p.y}px)` }}
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
