import { useEffect, useRef, useState } from 'react';
import { windowUrl } from './windows';
import { PROBE } from './probe';

/**
 * F-27: Welche Fenster der Anwendung sind gerade offen? Jedes Fenster meldet sich über einen
 * BroadcastChannel an („hallo“), antwortet auf Anmeldungen („da“) und meldet sich beim Schließen
 * ab („tschüss“). Über denselben Kanal bittet ein Fenster ein anderes, ein Panel nach vorn zu holen
 * („zeigen“). Ohne BroadcastChannel (sehr alte Browser) kennt jedes Fenster nur sich selbst.
 * Eingebettete E-Sources (F-18) melden sich nicht an.
 */
// F-160: „collect“ = alle anderen Fenster geben ihren Desk an das Fenster `win` ab.
type Msg = { t: 'hello' | 'here' | 'bye' | 'collect'; win: string } | { t: 'show'; win: string; panel: string };
// Testbelegung (?test=voll): eigener Kanal, damit sich Test- und echte Fenster nicht sehen.
const CHANNEL = PROBE ? 'esource.windows.test' : 'esource.windows';
/**
 * F-160: Lebenszeichen. Ein Fenster, das ohne Abmeldung verschwindet (Absturz, hart beendet),
 * gilt nach PRUNE_MS ohne Lebenszeichen als geschlossen. Großzügig, weil Browser Zeitgeber in
 * Hintergrund-Tabs bis auf einmal pro Minute drosseln.
 */
const PING_MS = 10_000;
const PRUNE_MS = 75_000;
const EMBEDDED = typeof window !== 'undefined' && window.self !== window.top;

export function useOpenWindows(win: string, onShow: (panel: string) => void, onCollect: () => void = () => {}) {
  const [open, setOpen] = useState<Set<string>>(() => new Set([win]));
  const chRef = useRef<BroadcastChannel | null>(null);
  const showRef = useRef(onShow);
  showRef.current = onShow;
  const collectRef = useRef(onCollect);
  collectRef.current = onCollect;
  useEffect(() => {
    if (EMBEDDED || typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel(CHANNEL);
    chRef.current = ch;
    const seen = new Map<string, number>();
    const set = (id: string, on: boolean) =>
      setOpen((s) => {
        if (s.has(id) === on) return s;
        const n = new Set(s);
        if (on) n.add(id);
        else n.delete(id);
        return n;
      });
    ch.onmessage = (e: MessageEvent<Msg>) => {
      const m = e.data;
      if (!m || typeof m.win !== 'string') return;
      if (m.t === 'show') {
        if (m.win === win && typeof m.panel === 'string') showRef.current(m.panel);
        return;
      }
      if (m.win === win) return;
      if (m.t === 'collect') return collectRef.current();
      if (m.t === 'bye') {
        seen.delete(m.win);
        return set(m.win, false);
      }
      seen.set(m.win, Date.now());
      set(m.win, true);
      if (m.t === 'hello') ch.postMessage({ t: 'here', win } satisfies Msg);
    };
    const hello = () => ch.postMessage({ t: 'hello', win } satisfies Msg);
    const bye = () => ch.postMessage({ t: 'bye', win } satisfies Msg);
    hello();
    const ping = window.setInterval(() => {
      ch.postMessage({ t: 'here', win } satisfies Msg);
      const now = Date.now();
      for (const [id, at] of seen) if (now - at > PRUNE_MS) {
        seen.delete(id);
        set(id, false);
      }
    }, PING_MS);
    // Nach Neuladen oder Zurück-Navigation (bfcache) neu anmelden.
    const onShow = (e: PageTransitionEvent) => e.persisted && hello();
    window.addEventListener('pagehide', bye);
    window.addEventListener('pageshow', onShow);
    return () => {
      bye();
      window.clearInterval(ping);
      window.removeEventListener('pagehide', bye);
      window.removeEventListener('pageshow', onShow);
      ch.close();
      chRef.current = null;
    };
  }, [win]);
  /** Anderes Fenster bitten, ein Panel nach vorn zu holen. */
  const show = (target: string, panel: string) => chRef.current?.postMessage({ t: 'show', win: target, panel } satisfies Msg);
  /** F-160: alle anderen Fenster bitten, ihren Desk hierher abzugeben. */
  const collect = () => chRef.current?.postMessage({ t: 'collect', win } satisfies Msg);
  return { open, show, collect };
}

/**
 * Zusatzfenster öffnen oder, falls schon offen, nach vorn holen (gleicher Fenstername). Muss
 * direkt aus einem Klick heraus aufgerufen werden, sonst blockt der Browser das Fenster.
 * Gibt false zurück, wenn der Browser es blockiert hat.
 */
export function openAppWindow(win: string): boolean {
  const w = Math.round(window.screen.availWidth * 0.8);
  const h = Math.round(window.screen.availHeight * 0.8);
  // Erst nur nach dem Fenster mit diesem Namen fragen: Ein offenes wird so nicht neu geladen.
  const ref = window.open('', windowTarget(win), `popup=yes,width=${w},height=${h}`);
  if (!ref) return false;
  try {
    if (ref.location.href === 'about:blank') ref.location.replace(windowUrl(window.location.href, win));
  } catch {
    // fremde Seite im Fenster: neu laden
    ref.location.href = windowUrl(window.location.href, win);
  }
  ref.focus();
  return true;
}

/** Name des Browserfensters, über den sich ein Fenster der Anwendung wiederfinden lässt. */
export function windowTarget(win: string): string {
  const pre = PROBE ? 'esource-test' : 'esource';
  return win ? `${pre}-${win}` : `${pre}-main`;
}
