/**
 * F-215 (V69, Wunsch Enrico): Fußleiste mit Home-Knopf im Pad.
 * Die Leiste gehört zum Gehäuse des Pads (wirkt physisch, wie der Rand unter dem Display beim iPhone 7),
 * der Knopf ist ein flacher, leicht vertiefter Kreis mit feinem Ring in Akzentfarbe – ohne Quadrat.
 * Tippen = Home (zur Liste). Halten (ab 0,4 s) = Halbkreis-Menü über dem Knopf; in Richtung eines Eintrags
 * wischen vergrößert ihn (V70), Loslassen wählt. Tastatur (NF-03): Enter/Leertaste = Home, Pfeil hoch oder Leertaste halten = Halbkreis,
 * im Halbkreis Pfeil links/rechts wählen, Enter ausführen, Esc schließen.
 * V71 (Wunsch Enrico): Drücken und sofort wischen formatiert die Zeile der offenen Note – links Liste, rechts
 * Aufgabe, oben Überschrift H2, unten fett, noch einmal = wieder Text (ohne offene Note: neue Note). Dabei zeigen
 * gestaffelte Pfeile in Akzentfarbe die Richtung, darüber das Ziel. Formatieren per Tastatur geschieht in der Note.
 * (Blättern zwischen Notes/Sheets am Knopf aus V70 entfällt.)
 * Schritt 1: Home, Halbkreis, Neue Note. Zuletzt, Sprache, Aufgabe, Suche, Bild & Teilen folgen –
 * noch nicht gebaute Plätze sind leere Kreise ohne Symbol (V71).
 */
import { type CSSProperties, type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FOOT_TEXT } from '../workspace/terms';
import type { IconName } from '../workspace/icons';
import { Icon } from './Icon';
import { aimItem, nearness, arcPos, firstItem, stepItem, type SwipeDir, swipeDir } from '../workspace/footArc';

/** V71 (Wunsch Enrico, Bild mit gestaffelten Winkeln): Pfeil aus Winkeln in Akzentfarbe. Er baut sich beim
 *  Wischen vom Knopf aus auf – je weiter der Finger, desto mehr Winkel; der vorderste ist der hellste. */
const CHEV_N = 5;
/** Weg (px), bei dem der Pfeil ganz aufgebaut ist */
const CHEV_FULL = 110;
function Chevrons({ dir, dist }: { dir: SwipeDir; dist: number }) {
  const shown = Math.max(1, Math.min(CHEV_N, Math.ceil((dist / CHEV_FULL) * CHEV_N)));
  return (
    <span className={`padfoot__chev padfoot__chev--${dir}`} aria-hidden="true">
      <span className="padfoot__trail">
        {Array.from({ length: CHEV_N }, (_, k) => (
          // V71 (Wunsch Enrico): zum Ende hin breiter werdend
          <i key={k} style={{ opacity: k < shown ? 0.25 + (0.75 * (k + 1)) / shown : 0, width: 7 + 3 * k, height: 7 + 3 * k, borderWidth: 2.5 + 0.5 * k }} />
        ))}
      </span>
    </span>
  );
}

export interface FootItem {
  id: string;
  label: string;
  icon: IconName;
  /** fehlt = noch nicht gebaut – V71 (Wunsch Enrico): leerer Kreis ohne Symbol, nicht wählbar */
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
  /** V71: Wischen am Knopf ausgeführt (formatiert die Note) */
  onSwipe: (dir: SwipeDir) => void;
  /** Was das Wischen in diese Richtung bewirkt („Liste“, „Aufgabe“, …) */
  swipeLabel: (dir: SwipeDir) => string;
}) {
  const { items, onHome, say, onSwipe, swipeLabel } = props;
  /** V71: Weg beim Wischen (px), null = kein Wischen */
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
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
    if (el && menu.current?.contains(el)) return items[Number(el.dataset.i)]?.run ? Number(el.dataset.i) : -1;
    const r = btn.current?.getBoundingClientRect();
    const i = r ? aimItem(x - (r.left + r.width / 2), y - (r.top + r.height / 2), undefined, hotRef.current) : -1;
    // V71: Plätze ohne Eintrag (noch nicht gebaut) wählen nichts
    return items[i]?.run ? i : -1;
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
    // V71: Bewegung vor dem Halten (in jede Richtung) → Wischen (Halbkreis öffnet dann nicht)
    if (!s.swipe && Math.hypot(dx, dy) > MOVE_PX) {
      s.swipe = true;
      window.clearTimeout(timer.current);
    }
    if (s.swipe) {
      // im Takt des Bildschirms, nicht bei jedem Zeiger-Ereignis
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => setDrag({ x: dx, y: dy }));
    }
  };
  const up = (e: PointerEvent<HTMLButtonElement>) => {
    const s = start.current;
    start.current = null;
    window.clearTimeout(timer.current);
    if (!s) return;
    if (s.swipe) {
      endDrag();
      const d = swipeDir(e.clientX - s.x, e.clientY - s.y);
      if (d) onSwipe(d);
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
  };
  const cancel = () => {
    if (start.current?.swipe) endDrag();
    start.current = null;
    window.clearTimeout(timer.current);
  };

  // ---------------------------------------------------------------- Tastatur
  const keyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    // V71: Formatieren per Tastatur geschieht in der Note (Leiste, Strg/⌘+B, Strg/⌘+Enter), nicht am Knopf
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
    menu.current?.classList.remove('is-aiming'); // Tastatur: Größe wieder nach Auswahl
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

  const dir = drag === null ? null : swipeDir(drag.x, drag.y);
  /** Lage und Farben des Pfeils: Knopfmitte im Fenster, Akzent so wie am Knopf (Pad-Färbung) */
  const swipeAt = (): CSSProperties => {
    const el = btn.current;
    if (!el) return {};
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      left: r.left + r.width / 2,
      top: r.top + r.height / 2,
      '--accent-rgb': cs.getPropertyValue('--accent-rgb'),
      '--on-accent': cs.getPropertyValue('--on-accent'),
    } as CSSProperties;
  };
  return (
    <footer className={`padfoot${open ? ' is-open' : ''}${drag !== null ? ' is-swiping' : ''}`}>
      {/* V71: Erst beim Wischen erscheint der Pfeil in Wischrichtung und baut sich mit dem Weg auf; darüber das Ziel.
          Im Dokument über allem (Portal), damit er an der Kante des Pads nicht abgeschnitten wird; Akzentfarbe vom Pad. */}
      {drag !== null &&
        createPortal(
          <div className="padfoot__swipe" aria-hidden="true" style={swipeAt()}>
            {dir && <Chevrons dir={dir} dist={Math.hypot(drag.x, drag.y)} />}
            <span className="padfoot__swipegoal">{dir ? swipeLabel(dir) : FOOT_TEXT.swipeHint}</span>
          </div>,
          document.body,
        )}
      {(open || closing) && (
        <div className={`padfoot__arc${closing && !open ? ' is-closing' : ''}`} role="menu" aria-label={FOOT_TEXT.menu} ref={menu} onKeyDown={menuKey} onKeyUp={menuKeyUp}>
          {items.map((it, i) => {
            const p = arcPos(i);
            const label = it.label;
            // V71 (Wunsch Enrico): Noch nicht gebaute Plätze bleiben als leere Kreise stehen – ohne Symbol und
            // Beschriftung, nicht wählbar, für Bildschirmleser unsichtbar; mit der Maus wachsen sie trotzdem mit
            if (!it.run)
              return (
                <span
                  key={it.id}
                  data-i={i}
                  className="padfoot__item is-empty"
                  style={{ transform: `translate(${p.x}px, ${p.y}px)`, '--i': i } as CSSProperties}
                  aria-hidden="true"
                />
              );
            return (
              <button
                key={it.id}
                type="button"
                role="menuitem"
                data-i={i}
                tabIndex={i === hot ? 0 : -1}
                className={`padfoot__item${i === hot ? ' is-hot' : ''}`}
                style={{ transform: `translate(${p.x}px, ${p.y}px)`, '--i': i } as CSSProperties}
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
