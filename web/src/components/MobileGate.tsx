import { useEffect, useRef, useState } from 'react';
import '../App.css';

/**
 * V93 (Wunsch Enrico: „Sperr mal weitestgehend die Mobilansicht für Smartphones und mach da einen schönen Verweis
 * darauf, dass aktuell nur die Desktopversion Sinn macht“): Auf dem Smartphone (PHONE_MQ) erscheint statt der App
 * ein Hinweis. Die Adresse lässt sich teilen bzw. kopieren, um sie am Rechner zu öffnen. Kein „Trotzdem öffnen“
 * (Enrico V93: „ohne Trotzdem öffnen“).
 */

export const MOBILE_TEXT = {
  title: 'E‑Sources ist für den Computer gebaut',
  lead: 'Auf dem Smartphone funktioniert E‑Sources derzeit nicht sinnvoll.',
  why: 'Desks, Slots, Portale und Pads brauchen einen großen Bildschirm, eine Maus und eine Tastatur. Auf dem kleinen Bildschirm lässt sich das nicht vernünftig bedienen.',
  how: 'Öffne E‑Sources bitte am Computer oder Laptop, im Browser deiner Wahl. Am besten ab etwa 1280 Pixel Breite.',
  share: 'Adresse teilen',
  copy: 'Adresse kopieren',
  copied: 'Adresse kopiert – füge sie am Computer in die Adresszeile ein.',
  shared: 'Geteilt.',
  failed: 'Kopieren ging nicht – die Adresse steht oben in der Adresszeile.',
};

type Nav = Navigator & { share?: (d: { title?: string; url?: string }) => Promise<void> };

export default function MobileGate() {
  const head = useRef<HTMLHeadingElement>(null);
  const [note, setNote] = useState('');
  const nav = navigator as Nav;
  const canShare = typeof nav.share === 'function';
  const url = window.location.origin + window.location.pathname;

  useEffect(() => {
    head.current?.focus();
  }, []);

  const pass = async () => {
    if (canShare) {
      try {
        await nav.share!({ title: 'E-Sources', url });
        setNote(MOBILE_TEXT.shared);
        return;
      } catch {
        /* abgebrochen – dann kopieren */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setNote(MOBILE_TEXT.copied);
    } catch {
      setNote(MOBILE_TEXT.failed);
    }
  };

  return (
    <main className="mgate" aria-labelledby="mgate-title">
      <div className="mgate__card">
        <img className="mgate__logo" src="/app-icon.svg" alt="" width={72} height={72} />
        <div className="mgate__screens" aria-hidden="true">
          <span className="mgate__phone">
            <span className="mgate__x" />
          </span>
          <span className="mgate__arrow">→</span>
          <span className="mgate__desk">
            <span />
            <span />
            <span />
          </span>
        </div>
        <h1 id="mgate-title" ref={head} tabIndex={-1}>
          {MOBILE_TEXT.title}
        </h1>
        <p className="mgate__lead">{MOBILE_TEXT.lead}</p>
        <p>{MOBILE_TEXT.why}</p>
        <p>{MOBILE_TEXT.how}</p>
        <button type="button" className="mgate__pass" onClick={pass}>
          {canShare ? MOBILE_TEXT.share : MOBILE_TEXT.copy}
        </button>
        {/* Meldung am Ort, direkt unter dem Knopf */}
        <p className="mgate__note" role="status">
          {note}
        </p>
      </div>
    </main>
  );
}
