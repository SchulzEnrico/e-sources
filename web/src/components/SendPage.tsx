import { useEffect, useRef, useState } from 'react';
import { SEND_TEXT } from '../workspace/terms';
import { type Offer, SEND_AUTO_S, SEND_WAIT_MS, defaultTarget, parseTarget, pickOffer, targetValue } from '../workspace/send';

import { askWindows } from '../workspace/useSend';

type Ask = Awaited<ReturnType<typeof askWindows>>;

/**
 * F-189 Stufe 2: kurzlebige Instanz, die das Lesezeichen „An E-Sources senden“ geöffnet hat.
 * Zeigt das Ziel (voreingestellt: aktives Portal des zuletzt benutzten Desks) und sendet nach
 * SEND_AUTO_S Sekunden von selbst; jede Bedienung hält das an, dann wählt man und sendet per Knopf.
 * Ist kein E-Sources offen, ruft sie `onAlone` (dann startet hier E-Sources selbst mit der Seite).
 */
export default function SendPage(props: { url: string; onAlone: () => void }) {
  const [ask, setAsk] = useState<Ask | null>(null);
  const [value, setValue] = useState('');
  const [left, setLeft] = useState<number | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const started = useRef(false);
  const sendRef = useRef<HTMLButtonElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const host = (() => {
    try {
      return new URL(props.url).host;
    } catch {
      return props.url;
    }
  })();

  useEffect(() => {
    document.title = `${SEND_TEXT.sending} – E-Sources`;
    if (started.current) return;
    started.current = true;
    void askWindows(SEND_WAIT_MS).then((a) => {
      const best = pickOffer(a.offers);
      if (!best) {
        a.close();
        return props.onAlone();
      }
      setAsk(a);
      setValue(defaultTarget(best));
      setLeft(SEND_AUTO_S);
      document.title = `${SEND_TEXT.title} – E-Sources`;
      try {
        if (window.outerHeight < 420) window.resizeTo(Math.max(window.outerWidth, 520), 460);
      } catch {
        /* Browser lässt es nicht zu */
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (ask) sendRef.current?.focus();
  }, [ask]);

  const send = async () => {
    if (!ask || done) return;
    setLeft(null);
    const t = parseTarget(value);
    const o = pickOffer(ask.offers.filter((x) => x.win === t.win));
    if (o) await ask.send(o, props.url, t.panel);
    ask.close();
    const portal = t.panel ? (o?.targets?.find((x) => x.id === t.panel)?.name ?? o?.portal ?? null) : SEND_TEXT.newSlotOption;
    const text = SEND_TEXT.sent(o?.desk ?? '', portal);
    setDone(text);
    document.title = `${text} – E-Sources`;
    window.setTimeout(() => window.close(), 1800);
  };

  // Countdown; jede Bedienung (Taste, Klick, Wahl) hält ihn an.
  useEffect(() => {
    if (left === null || done) return;
    if (left <= 0) {
      void send();
      return;
    }
    const t = window.setTimeout(() => setLeft((x) => (x === null ? null : x - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [left, done]); // eslint-disable-line react-hooks/exhaustive-deps
  const stop = () => setLeft(null);

  useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);

  if (done)
    return (
      <main className="parked sendpage" aria-labelledby="send-title">
        <h1 id="send-title" ref={doneRef} tabIndex={-1} role="status">
          {done}
        </h1>
        <p>{SEND_TEXT.closing}</p>
        <div className="parked__actions">
          <button type="button" onClick={() => window.close()}>
            {SEND_TEXT.close}
          </button>
        </div>
      </main>
    );
  if (!ask)
    return (
      <main className="parked sendpage" aria-labelledby="send-title">
        <h1 id="send-title" role="status">
          {SEND_TEXT.sending}
        </h1>
      </main>
    );
  // Je Desk nur ein Fenster (das zuletzt benutzte), falls ein Desk mehrfach offen ist.
  const byWin = new Map<string, Offer>();
  for (const o of ask.offers) if (!byWin.has(o.win) || o.at > byWin.get(o.win)!.at) byWin.set(o.win, o);
  const offers = [...byWin.values()].sort((a, b) => (a.win === '' ? -1 : b.win === '' ? 1 : a.desk.localeCompare(b.desk)));
  return (
    <main className="parked sendpage" aria-labelledby="send-title" onKeyDown={stop} onPointerDown={stop}>
      <h1 id="send-title">{SEND_TEXT.title}</h1>
      <p className="sendpage__host">{SEND_TEXT.page(host)}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        {offers.length > 1 && (
          <label className="sendpage__field sendpage__target">
            {SEND_TEXT.desk}
            <select
              value={parseTarget(value).win}
              onChange={(e) => {
                stop();
                const o = offers.find((x) => x.win === e.target.value);
                if (o) setValue(defaultTarget(o));
              }}
            >
              {offers.map((o) => (
                <option key={o.win} value={o.win}>
                  {o.desk}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="sendpage__field sendpage__target">
          <span className="sendpage__q">{SEND_TEXT.target}</span>
          {offers.length === 1 && <span className="sendpage__desk">{`${SEND_TEXT.desk}: ${offers[0].desk}`}</span>}
          <select
            value={value}
            aria-describedby="send-target-hint"
            onChange={(e) => {
              stop();
              setValue(e.target.value);
            }}
          >
            {offers
              .filter((o) => o.win === parseTarget(value).win)
              .map((o) => (
                <Groups key={o.win} offer={o} />
              ))}
          </select>
        </label>
        <p id="send-target-hint" className="sendpage__hint">
          {SEND_TEXT.targetHint}
        </p>
        <p className="sendpage__auto" aria-live="polite">
          {left !== null ? <span aria-hidden="true">{SEND_TEXT.auto(left)}</span> : SEND_TEXT.autoStopped}
        </p>
        {left !== null && (
          <div className="sendpage__bar" aria-hidden="true">
            <span style={{ width: `${(left / SEND_AUTO_S) * 100}%` }} />
          </div>
        )}
        <div className="parked__actions">
          <button type="submit" ref={sendRef}>
            {SEND_TEXT.send}
          </button>
          <button
            type="button"
            onClick={() => {
              ask.close();
              window.close();
            }}
          >
            {SEND_TEXT.cancel}
          </button>
        </div>
      </form>
    </main>
  );
}

/** Ziele eines Desks: je Slot eine Gruppe mit seinen Portalen, dazu „Neuer Slot“. */
function Groups(props: { offer: Offer }) {
  const o = props.offer;
  const slots = new Map<string, NonNullable<Offer['targets']>>();
  for (const t of o.targets ?? []) slots.set(t.slot, [...(slots.get(t.slot) ?? []), t]);
  return (
    <>
      {[...slots].map(([slot, list]) => (
        <optgroup key={slot} label={slot}>
          {list.map((t) => (
            <option key={t.id} value={targetValue(o.win, t.id)}>
              {t.name}
              {t.id === o.active ? ` ${SEND_TEXT.active}` : ''}
            </option>
          ))}
        </optgroup>
      ))}
      <option value={targetValue(o.win, null)}>{SEND_TEXT.newSlotOption}</option>
    </>
  );
}
