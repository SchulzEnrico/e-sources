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
import { type CSSProperties, type KeyboardEvent, type MutableRefObject, type PointerEvent, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FOOT_TEXT, VOICE_TEXT } from '../workspace/terms';
import { VOICE_DWELL_MS, type VoiceTarget, defaultTarget, voiceGesture, voiceProgress } from '../workspace/voice';
import { type AudioTake, useVoice } from './useVoice';
import type { IconName } from '../workspace/icons';
import { Icon } from './Icon';
import { aimItem, nearness, arcPos, firstItem, stepItem, type SwipeDir, swipeDir } from '../workspace/footArc';

/** V71 (Wunsch Enrico, Bild mit gestaffelten Winkeln): Pfeil aus Winkeln in Akzentfarbe. Er baut sich beim
 *  Wischen vom Knopf aus auf – je weiter der Finger, desto mehr Winkel; der vorderste ist der hellste. */
const CHEV_N = 5;
/** Weg (px), bei dem der Pfeil ganz aufgebaut ist (V72: kurze Wege fürs Smartphone, 48 statt 110 px) */
const CHEV_FULL = 48;
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

/** V77 (F-215 Schritt 3): Sprachnotiz am Knopf – Ziel, Einschalten, Übernehmen. Gibt eine Funktion zum
 *  „Als neue Notiz lösen“ zurück, wenn das möglich ist. */
export interface VoiceProps {
  on: boolean;
  onEnable: () => void;
  noteOpen: () => boolean;
  /** V79: dazu der aufgenommene Ton (immer mit aufgenommen, T2); `null` = keiner */
  commit: (text: string, target: VoiceTarget, audio: AudioTake | null) => Promise<(() => Promise<boolean>) | null>;
  /** Start von außen (Alt+M) – festgestellt */
  startRef: MutableRefObject<(() => void) | null>;
}
type VMode = 'ask' | 'hold' | 'locked' | null;
/** Wie lange (ms) „Text übernommen“ mit „Als neue Notiz lösen“ stehen bleibt */
const DONE_MS = 2000; // V79 (Wunsch Enrico): Meldungen am Ort nur 2 Sekunden (vorher 8)

const HOLD_MS = 400;
const CLOSE_MS = 160;
const REDUCED = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const MOVE_PX = 6;
/** V76 (Enrico: „Am Rechner gibt es das Halbkreismenü nicht“): Beim Halten wandert der Zeiger am Trackpad leicht –
 *  erst ab diesem Weg wird aus dem Drücken ein Wischen (vorher öffnet Halten weiter den Halbkreis). */
const SWIPE_START_PX = 12;

export function PadFooter(props: {
  items: FootItem[];
  onHome: () => void;
  say: (text: string) => void;
  /** V71: Wischen am Knopf ausgeführt (formatiert die Note) */
  onSwipe: (dir: SwipeDir) => void;
  /** Was das Wischen in diese Richtung bewirkt („Liste“, „Aufgabe“, …) */
  swipeLabel: (dir: SwipeDir) => string;
  /** V75 (F-215 A2): Bildschirmtastatur offen – nur der Knopf schwebt direkt über der Tastatur (ohne Leiste) */
  knob?: { bottom: number | null; opacity: number; x: number; onX: (v: number) => void };
  voice?: VoiceProps;
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
  const start = useRef<{ x: number; y: number; moved: boolean; wasOpen: boolean; swipe: boolean; slide: boolean } | null>(null);
  const spaceHeld = useRef(false);
  const skipClick = useRef(false);
  // V75 (A2): schwebender Knopf über der Tastatur; Doppeltippen + halten, dann waagerecht ziehen = verschieben
  const kbd = props.knob?.bottom != null;
  const anchor = useRef<HTMLSpanElement>(null);
  const lastTap = useRef(0);
  const homeT = useRef(0);
  const [slideX, setSlideX] = useState<number | null>(null);
  useEffect(() => () => window.clearTimeout(homeT.current), []);

  // ---------------------------------------------------------------- Sprachnotiz (V77)
  const v = useVoice();
  const [vmode, setVmodeS] = useState<VMode>(null);
  const vmodeRef = useRef<VMode>(null);
  const setVmode = (m: VMode) => {
    vmodeRef.current = m;
    setVmodeS(m);
  };
  const [target, setTarget] = useState<VoiceTarget>('here');
  const targetRef = useRef<VoiceTarget>('here');
  targetRef.current = target;
  const [prog, setProg] = useState({ lock: 0, cancel: 0 });
  const [done, setDone] = useState<{ text: string; split?: () => Promise<boolean> } | null>(null);
  const doneT = useRef(0);
  const dwell = useRef(0);
  const holdAt = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastPt = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const viaKey = useRef(false);
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => () => (window.clearTimeout(doneT.current), window.clearTimeout(dwell.current)), []);
  const showDone = (text: string, split?: () => Promise<boolean>, ms = DONE_MS) => {
    window.clearTimeout(doneT.current);
    setDone({ text, split });
    doneT.current = window.setTimeout(() => setDone(null), ms);
  };
  /** Fokus in die Anzeige (nur mit Tastatur bzw. feinem Zeiger – auf Touch bliebe sonst die Tastatur weg) */
  const focusBar = (sel: string) => {
    if (!viaKey.current && !matchMedia('(pointer: fine)').matches) return;
    window.setTimeout(() => bar.current?.querySelector<HTMLElement>(sel)?.focus({ preventScroll: true }), 0);
  };
  const startVoice = (mode: 'hold' | 'locked', key: boolean, force = false) => {
    const vp = props.voice;
    if (!vp) return;
    viaKey.current = key;
    window.clearTimeout(doneT.current);
    setDone(null);
    v.clearNote();
    if (!vp.on && !force) {
      setVmode('ask');
      say(VOICE_TEXT.ask);
      focusBar('[data-v="enable"]');
      return;
    }
    setTarget(defaultTarget(vp.noteOpen()));
    setProg({ lock: 0, cancel: 0 });
    setVmode(mode);
    say(mode === 'locked' ? VOICE_TEXT.locked : VOICE_TEXT.rec);
    if (mode === 'locked') focusBar('[data-v="done"]');
    void v.start().then((ok) => {
      if (!ok && vmodeRef.current !== 'ask') setVmode(null);
    });
  };
  const finishVoice = async (atLimit = false) => {
    const vp = props.voice;
    setVmode(null);
    const got = await v.stop();
    const text = got.text.trim();
    const audio = got.audio;
    if (!vp) return;
    if (!text && !audio) {
      say(VOICE_TEXT.nothing);
      return showDone(VOICE_TEXT.nothing, undefined, DONE_MS);
    }
    const t = targetRef.current;
    const split = await vp.commit(text, t, audio);
    // V79: Meldung nennt, was übernommen wurde (Text, Ton oder beides)
    const here = t === 'here' && !!split;
    const msg = !text ? (here ? VOICE_TEXT.toneHere : VOICE_TEXT.toneNew) : here ? (audio ? VOICE_TEXT.takenTone : VOICE_TEXT.taken) : audio ? VOICE_TEXT.takenNewTone : VOICE_TEXT.takenNew;
    const full = atLimit ? `${VOICE_TEXT.limit} ${msg}` : msg;
    say(full);
    showDone(full, here ? split ?? undefined : undefined, DONE_MS);
    if (here) focusBar('[data-v="split"]');
  };
  // V79 (T5): nach 15 Minuten hält die Aufnahme von selbst an und übernimmt (Meldung am Ort)
  useEffect(() => {
    if (v.limit && vmodeRef.current && vmodeRef.current !== 'ask') void finishVoice(true);
  }, [v.limit]); // eslint-disable-line react-hooks/exhaustive-deps
  const cancelVoice = () => {
    v.cancel();
    setVmode(null);
    say(VOICE_TEXT.canceled);
    showDone(VOICE_TEXT.canceled, undefined, DONE_MS);
  };
  const runSplit = async () => {
    const f = done?.split;
    window.clearTimeout(doneT.current);
    setDone(null);
    if (!f) return;
    const ok = await f();
    say(ok ? VOICE_TEXT.splitDone : VOICE_TEXT.splitGone);
    showDone(ok ? VOICE_TEXT.splitDone : VOICE_TEXT.splitGone, undefined, DONE_MS);
  };
  if (props.voice) props.voice.startRef.current = () => (vmodeRef.current ? undefined : startVoice('locked', true));
  // Esc bricht ab (vor der Note, die Esc sonst zum Schließen nimmt)
  useEffect(() => {
    if (!vmode && !v.note) return;
    const on = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      if (vmodeRef.current === 'ask') {
        setVmode(null);
        say(FOOT_TEXT.closed);
      } else if (vmodeRef.current) cancelVoice();
      else v.clearNote();
      btn.current?.focus({ preventScroll: true });
    };
    document.addEventListener('keydown', on, true);
    return () => document.removeEventListener('keydown', on, true);
  }, [vmode, v.note]); // eslint-disable-line react-hooks/exhaustive-deps
  // Hinweis (Sprachpaket, Rückfall) geht nach einer Weile von selbst
  useEffect(() => {
    if (!v.note) return;
    say(v.note);
    const t = window.setTimeout(v.clearNote, 10000);
    return () => window.clearTimeout(t);
  }, [v.note]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      window.clearTimeout(closeT.current);
      cancelAnimationFrame(frame.current);
    },
    [],
  );
  useEffect(() => {
    // V76 (Enrico: „extrem sprunghaft“): Fokus ohne Scrollen – sonst rückte das Pad beim Wählen nach
    if (open && hot >= 0) menu.current?.querySelector<HTMLElement>(`[data-i="${hot}"]`)?.focus({ preventScroll: true });
  }, [open, hot]);

  const first = () => firstItem(items);
  const menuByKey = useRef(false);
  const openMenu = (focus: boolean) => {
    menuByKey.current = focus;
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
    // V77: „Sprachnotiz“ antippen bzw. Enter = Aufnahme festgestellt (für alle, die nicht wischen können)
    if (it.id === 'voice' && props.voice) return startVoice('locked', menuByKey.current);
    it.run();
  };

  // V74 (Enrico, iPhone): Wischen am Knopf verschob die ganze Seite – iOS beachtet touch-action nicht immer,
  // vor allem bei offener Tastatur. V76 (Enrico: „Wischgesten funktionieren nicht“): iOS bricht die Zeiger-Ereignisse
  // ab (pointercancel), sobald es selbst eine Geste beginnt (Scrollen, Lupe, Kontextmenü). Darum fängt der Knopf
  // die Berührung jetzt ganz ab – auch touchstart. Tippen läuft über pointerup (up), nicht über click.
  useEffect(() => {
    const b = btn.current;
    if (!b) return;
    const stop = (ev: TouchEvent) => ev.cancelable && ev.preventDefault();
    b.addEventListener('touchstart', stop, { passive: false });
    b.addEventListener('touchmove', stop, { passive: false });
    return () => {
      b.removeEventListener('touchstart', stop);
      b.removeEventListener('touchmove', stop);
    };
  }, [kbd]);

  // ---------------------------------------------------------------- Zeiger
  const down = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    lastPt.current = { x: e.clientX, y: e.clientY };
    if (vmodeRef.current === 'locked' || vmodeRef.current === 'ask') {
      // V77: während der festgestellten Aufnahme = Fertig (Tippen am Knopf)
      e.preventDefault();
      start.current = { x: e.clientX, y: e.clientY, moved: false, wasOpen: false, swipe: false, slide: false };
      return;
    }
    // V72 (F-215 B, Entscheidungs-Doc V72): Knopf nimmt dem Schreibfeld nie den Fokus – Schreibmarke und Tastatur
    // bleiben, Wischen formatiert die Zeile. Mit der Tastatur (Tab) bleibt der Knopf erreichbar.
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY, moved: false, wasOpen: open, swipe: false, slide: false };
    window.clearTimeout(timer.current);
    // V75 (A2): zweites Antippen kurz nach dem ersten = Knopf verschieben (Home vom ersten Tippen entfällt)
    if (kbd && Date.now() - lastTap.current < 320) {
      window.clearTimeout(homeT.current);
      lastTap.current = 0;
      start.current.slide = true;
      setSlideX(props.knob!.x);
      return;
    }
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
    lastPt.current = { x: e.clientX, y: e.clientY };
    // V77: Aufnahme beim Halten – ↑ feststellen, ← abbrechen (Weg seit Beginn der Aufnahme)
    if (vmodeRef.current === 'hold') {
      const hx = e.clientX - holdAt.current.x;
      const hy = e.clientY - holdAt.current.y;
      const g = voiceGesture(hx, hy);
      if (g === 'lock') {
        setVmode('locked');
        say(VOICE_TEXT.locked);
      } else if (g === 'cancel') cancelVoice();
      else setProg(voiceProgress(hx, hy));
      return;
    }
    if (vmodeRef.current) return;
    if (s.slide) {
      const v = Math.round(((e.clientX - 24) / Math.max(1, window.innerWidth - 48)) * 100);
      setSlideX(Math.max(0, Math.min(100, v)));
      return;
    }
    if (open) {
      const x = e.clientX;
      const y = e.clientY;
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        lens(x, y);
        const i = itemAt(x, y);
        setHot(i);
        // V77: Finger ruht auf „Sprachnotiz“ → Aufnahme beim Halten
        if (items[i]?.id === 'voice' && props.voice) {
          if (!dwell.current)
            dwell.current = window.setTimeout(() => {
              dwell.current = 0;
              if (!start.current || items[hotRef.current]?.id !== 'voice') return;
              holdAt.current = { ...lastPt.current };
              closeMenu(false);
              startVoice('hold', false);
            }, VOICE_DWELL_MS);
        } else {
          window.clearTimeout(dwell.current);
          dwell.current = 0;
        }
      });
      return;
    }
    // V71: Bewegung vor dem Halten (in jede Richtung) → Wischen (Halbkreis öffnet dann nicht)
    if (!s.swipe && Math.hypot(dx, dy) > SWIPE_START_PX) {
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
    window.clearTimeout(dwell.current);
    dwell.current = 0;
    if (vmodeRef.current === 'hold') return void finishVoice();
    if (vmodeRef.current === 'locked') {
      if (s && !s.moved) void finishVoice();
      return;
    }
    if (vmodeRef.current === 'ask') return;
    if (!s) return;
    if (s.slide) {
      const v = slideX ?? props.knob!.x;
      setSlideX(null);
      props.knob!.onX(v);
      say(FOOT_TEXT.knobMoved(v));
      return;
    }
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
    if (!s.moved) {
      // V75 (A2): über der Tastatur Home erst nach kurzer Pause – ein zweites Tippen startet das Verschieben
      if (kbd) {
        lastTap.current = Date.now();
        window.clearTimeout(homeT.current);
        homeT.current = window.setTimeout(onHome, 320);
      } else onHome();
    }
  };
  const endDrag = () => {
    cancelAnimationFrame(frame.current);
    setDrag(null);
  };
  const cancel = () => {
    window.clearTimeout(dwell.current);
    dwell.current = 0;
    // iOS bricht die Berührung ab: eine gehaltene Aufnahme bleibt dann festgestellt stehen (nichts geht verloren)
    if (vmodeRef.current === 'hold') setVmode('locked');
    if (start.current?.swipe) endDrag();
    if (start.current?.slide) setSlideX(null);
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
    if (vmodeRef.current === 'locked') return void (e.detail === 0 && finishVoice());
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
  // V76 (Enrico: Halbkreis nach Rechtsklick „extrem sprunghaft“): Mit der Maus über dem offenen Halbkreis (ohne
  // gedrückte Taste) folgt die Größe jetzt stufenlos der Nähe wie beim Halten – statt hart vergrößerter Einträge
  // beim Hovern; die Auswahl wandert mit, ohne Sprünge
  const hover = (e: PointerEvent<HTMLDivElement>) => {
    if (start.current || e.pointerType !== 'mouse') return;
    const x = e.clientX;
    const y = e.clientY;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      lens(x, y);
      const i = itemAt(x, y);
      if (i >= 0) setHot(i);
    });
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
  const footer = (
    <footer className={`padfoot${open ? ' is-open' : ''}${drag !== null ? ' is-swiping' : ''}${slideX !== null ? ' is-sliding' : ''}${vmode === 'hold' || vmode === 'locked' ? ' is-rec' : ''}`}>
      {/* V77: Sprachnotiz – Anzeige am Ort, direkt über dem Knopf (F-214) */}
      {(vmode || done || v.note) && (
        <div className="padvoice" ref={bar} role="group" aria-label={FOOT_TEXT.voice}>
          {vmode === 'ask' ? (
            <>
              <p className="padvoice__text">{VOICE_TEXT.ask}</p>
              <div className="padvoice__btns">
                <button
                  type="button"
                  data-v="enable"
                  className="padvoice__btn is-main"
                  onClick={() => {
                    props.voice?.onEnable();
                    say(VOICE_TEXT.enabled);
                    startVoice('locked', viaKey.current, true);
                  }}
                >
                  {VOICE_TEXT.enable}
                </button>
                <button type="button" className="padvoice__btn" onClick={() => (setVmode(null), btn.current?.focus({ preventScroll: true }))}>
                  {VOICE_TEXT.notNow}
                </button>
              </div>
            </>
          ) : vmode ? (
            <>
              <p className="padvoice__state" role="status">
                <span className="padvoice__dot" aria-hidden="true" />
                {v.audioOnly ? VOICE_TEXT.toneRec : vmode === 'locked' ? VOICE_TEXT.locked : VOICE_TEXT.rec}
                {/* V79 (T2): Ton wird immer mit aufgenommen – sichtbar, solange er läuft */}
                {v.taping && <span className="padvoice__tape">{VOICE_TEXT.taping}</span>}
              </p>
              {/* V78 (Wunsch Enrico): Pegel des Mikrofons – schlägt mit der Lautstärke aus */}
              <div className="padvoice__meter" aria-hidden="true" title={VOICE_TEXT.meter} ref={(n) => void (v.meterRef.current = n)}>
                <span className="padvoice__meterfill" />
              </div>
              <p className="padvoice__live" aria-hidden="true">
                {v.final || v.interim ? (
                  <>
                    {v.final} <i>{v.interim}</i>
                  </>
                ) : (
                  <i>{v.phase === 'prep' ? '…' : v.audioOnly ? VOICE_TEXT.toneOnly : VOICE_TEXT.listening}</i>
                )}
              </p>
              {props.voice?.noteOpen() && (
                <div className="padvoice__target" role="group" aria-label={VOICE_TEXT.target}>
                  {(['here', 'new'] as VoiceTarget[]).map((t) => (
                    <button key={t} type="button" className={`padvoice__seg${target === t ? ' is-on' : ''}`} aria-pressed={target === t} onClick={() => setTarget(t)}>
                      {VOICE_TEXT[t]}
                    </button>
                  ))}
                </div>
              )}
              {vmode === 'hold' ? (
                <p className="padvoice__hints" aria-hidden="true">
                  <span style={{ '--p': prog.cancel } as CSSProperties}>{VOICE_TEXT.cancelHint}</span>
                  <span>{VOICE_TEXT.releaseHint}</span>
                  <span style={{ '--p': prog.lock } as CSSProperties}>{VOICE_TEXT.lockHint}</span>
                </p>
              ) : (
                <div className="padvoice__btns">
                  <button type="button" data-v="done" className="padvoice__btn is-main" onClick={() => void finishVoice()}>
                    {VOICE_TEXT.done}
                  </button>
                  <button type="button" className="padvoice__btn" onClick={cancelVoice}>
                    {VOICE_TEXT.cancel}
                  </button>
                </div>
              )}
            </>
          ) : v.note ? (
            <>
              <p className="padvoice__text" role="status">{v.note}</p>
              <button type="button" className="padvoice__x" aria-label={VOICE_TEXT.close} title={VOICE_TEXT.close} onClick={v.clearNote}>
                <Icon name="close" size={12} />
              </button>
            </>
          ) : done ? (
            <>
              <p className="padvoice__text" role="status">{done.text}</p>
              {done.split && (
                <button type="button" data-v="split" className="padvoice__btn" title={VOICE_TEXT.splitHint} onClick={() => void runSplit()}>
                  {VOICE_TEXT.split}
                </button>
              )}
            </>
          ) : null}
        </div>
      )}
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
        <div className={`padfoot__arc${closing && !open ? ' is-closing' : ''}`} role="menu" aria-label={FOOT_TEXT.menu} ref={menu} onKeyDown={menuKey} onKeyUp={menuKeyUp} onPointerMove={hover}>
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
        // V76: bei offenem Halbkreis kein Tooltip – er legte sich nach dem Rechtsklick groß über die Einträge
        title={open ? undefined : `${FOOT_TEXT.home} – ${FOOT_TEXT.homeHint}`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={cancel}
        onKeyDown={keyDown}
        onKeyUp={keyUp}
        onClick={click}
        onContextMenu={(e) => {
          e.preventDefault();
          // V76 (Enrico: „Halbkreis geht nicht auf dem Rechner“): Am Trackpad mit „Tippen zum Klicken“ gibt es kein
          // Halten – Rechtsklick bzw. zwei Finger tippen öffnet den Halbkreis. Auf Touch löst langes Drücken
          // contextmenu aus; dort öffnet ihn schon das Halten, darum nur bei Maus/Trackpad.
          if (matchMedia('(pointer: fine)').matches && !open) {
            window.clearTimeout(timer.current);
            start.current = null;
            openMenu(true);
          }
        }}
        onMouseDown={(e) => e.preventDefault()}
      >
        <span className="padfoot__ring" aria-hidden="true" />
      </button>
    </footer>
  );
  if (!kbd) return footer;
  // V75 (A2): Knopf schwebt über allem direkt über der Tastatur – im Dokument (Portal), Farben vom Pad übernommen;
  // die Leiste selbst entfällt. Deckkraft einstellbar, der helle Ring bleibt immer sichtbar.
  const k = props.knob!;
  const x = slideX ?? k.x;
  const cs = anchor.current ? getComputedStyle(anchor.current) : null;
  const vars = cs ? Object.fromEntries(['--accent-rgb', '--on-accent', '--hi', '--lo', '--text', '--strong'].map((v) => [v, cs.getPropertyValue(v)])) : {};
  return (
    <>
      <span ref={anchor} hidden />
      {createPortal(
        <div className="padknob" style={{ ...vars, top: (k.bottom ?? 0) - 46, left: `calc(24px + (100vw - 48px) * ${x / 100})`, '--knob-op': k.opacity / 100 } as CSSProperties}>
          {footer}
          <span className="padknob__ring" aria-hidden="true" />
        </div>,
        document.body,
      )}
    </>
  );
}
