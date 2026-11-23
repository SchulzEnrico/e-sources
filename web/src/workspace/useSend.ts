import { useEffect, useRef } from 'react';
import { PROBE } from './probe';
import { type Offer, type SendMsg, type SendTarget, sendChannel } from './send';

/**
 * F-189 Stufe 2: Empfänger für „An E-Sources senden“. Jedes Fenster merkt sich, wann es zuletzt im
 * Vordergrund war, beantwortet Anfragen der sendenden Instanz mit diesem Zeitpunkt und nimmt die
 * Seite an, wenn es gewählt wurde. Eingebettete E-Sources (F-18) antworten nicht.
 */
const EMBEDDED = typeof window !== 'undefined' && window.self !== window.top;

export function useSendReceiver(win: string, info: () => { desk: string; portal: string | null; active: string | null; targets: SendTarget[] }, onTake: (url: string, panel?: string | null) => void) {
  const infoRef = useRef(info);
  infoRef.current = info;
  const takeRef = useRef(onTake);
  takeRef.current = onTake;
  useEffect(() => {
    if (EMBEDDED || typeof BroadcastChannel === 'undefined') return;
    // Nie im Vordergrund gewesen: Ladezeit zählt (das zuletzt geöffnete Fenster gewinnt).
    let at = document.hasFocus() ? Date.now() : Math.round(performance.timeOrigin);
    const focus = () => (at = Date.now());
    const blur = () => (at = Date.now());
    window.addEventListener('focus', focus);
    window.addEventListener('blur', blur);
    const ch = new BroadcastChannel(sendChannel(PROBE));
    // Kennung dieses Fensters (ein Desk kann mehrfach offen sein; genommen wird nur einmal).
    const from = Math.random().toString(36).slice(2);
    ch.onmessage = (e: MessageEvent<SendMsg>) => {
      const m = e.data;
      if (!m || typeof m.id !== 'string') return;
      if (m.t === 'ask') {
        const i = infoRef.current();
        ch.postMessage({ t: 'offer', id: m.id, win, from, at: document.hasFocus() ? Date.now() : at, desk: i.desk, portal: i.portal, active: i.active, targets: i.targets } satisfies SendMsg);
      } else if (m.t === 'take' && m.from === from && typeof m.url === 'string') {
        takeRef.current(m.url, m.panel);
        try {
          window.focus();
        } catch {
          /* Browser lässt es nicht zu */
        }
      }
    };
    return () => {
      window.removeEventListener('focus', focus);
      window.removeEventListener('blur', blur);
      ch.close();
    };
  }, [win]);
}

/**
 * Sendende Instanz: fragt die offenen Fenster (Antworten nach `wait` ms) und liefert eine Funktion,
 * die die Seite an ein gewähltes Fenster/Portal weiterreicht.
 */
export function askWindows(wait: number): Promise<{ offers: Offer[]; send: (to: Offer, url: string, panel?: string | null) => Promise<void>; close: () => void }> {
  return new Promise((resolve) => {
    const none = { offers: [], send: async () => {}, close: () => {} };
    if (typeof BroadcastChannel === 'undefined') return resolve(none);
    const ch = new BroadcastChannel(sendChannel(PROBE));
    const id = Math.random().toString(36).slice(2);
    const offers: Offer[] = [];
    ch.onmessage = (e: MessageEvent<SendMsg>) => {
      const m = e.data;
      if (m && m.t === 'offer' && m.id === id) offers.push(m);
    };
    ch.postMessage({ t: 'ask', id } satisfies SendMsg);
    window.setTimeout(() => {
      resolve({
        offers,
        send: (to, url, panel) =>
          new Promise((done) => {
            ch.postMessage({ t: 'take', id, win: to.win, from: to.from, url, panel } satisfies SendMsg);
            // kurz warten, damit die Nachricht sicher hinausgeht
            window.setTimeout(done, 50);
          }),
        close: () => ch.close(),
      });
    }, wait);
  });
}
