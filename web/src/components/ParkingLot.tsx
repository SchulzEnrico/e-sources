/**
 * V141 (F-106 Gedankenparkplatz, F-231 K14 I4): Alt/⌥+E öffnet überall ein kleines Feld oben in der Mitte.
 * Enter legt den Gedanken im Eingang ab, Umschalt+Enter macht eine neue Zeile, Esc schließt; danach kehrt
 * der Fokus dorthin zurück, wo er war. Die Meldung erscheint am selben Ort (2 s) mit „Rückgängig“.
 */
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { INBOX_TEXT, INK_TEXT, PAUSE_TEXT, TERMS } from '../workspace/terms';
import { Icon } from './Icon';

const explain = (t: string) => t.replace(/^[^=]*=\s*/, '');

export interface ParkingLotProps {
  /** Feld offen (Alt/⌥+E). */
  open: boolean;
  /** Ablegen – liefert Titel und neue Zahl im Eingang bzw. null (nichts eingegeben). */
  onPark: (text: string) => { id: string; title: string; count: number } | null;
  onUndo: (id: string) => void;
  onClose: () => void;
  say: (t: string) => void;
  /** V143 (F-238): Schreibfläche statt Tastatur */
  onInk?: () => void;
}

export function ParkingLot(p: ParkingLotProps) {
  const [text, setText] = useState('');
  const [msg, setMsg] = useState<{ text: string; id?: string } | null>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const back = useRef<HTMLElement | null>(null);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (!p.open) return;
    back.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setText('');
    window.clearTimeout(timer.current);
    setMsg(null);
    window.setTimeout(() => field.current?.focus(), 0);
  }, [p.open]);
  const restore = () => {
    const el = back.current;
    if (el && document.contains(el)) el.focus({ preventScroll: true });
  };
  const show = (m: { text: string; id?: string }) => {
    setMsg(m);
    p.say(m.text);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 2600);
  };
  const park = () => {
    const r = p.onPark(text);
    if (!r) return p.say(INBOX_TEXT.parkEmpty);
    p.onClose();
    restore();
    show({ text: INBOX_TEXT.parked(r.title, r.count), id: r.id });
  };
  const key = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      p.onClose();
      restore();
    } else if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      e.stopPropagation();
      park();
    }
  };
  if (!p.open && !msg) return null;
  return (
    <section className="park" role={p.open ? 'dialog' : 'status'} aria-label={INBOX_TEXT.park}>
      {p.open ? (
        <>
          <label className="park__cap" htmlFor="park-field" title={explain(TERMS.parkingLot)}>
            <Icon name="inbox" size={13} className="icon icon--inline" /> {INBOX_TEXT.park}
          </label>
          {p.onInk && (
            <button type="button" className="park__ink" title={INK_TEXT.parkInkHint} aria-label={INK_TEXT.parkInk} onClick={p.onInk}>
              <Icon name="pen" size={14} /> <span className="park__inklbl">{INK_TEXT.parkInk}</span>
            </button>
          )}
          <textarea
            id="park-field"
            ref={field}
            className="park__field"
            rows={Math.min(5, Math.max(1, text.split('\n').length))}
            value={text}
            placeholder={INBOX_TEXT.parkPlaceholder}
            aria-label={INBOX_TEXT.parkLabel}
            aria-describedby="park-hint"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={key}
            onBlur={(e) => {
              // Klick daneben schließt (leer) bzw. lässt den Text stehen, bis Enter oder Esc kommt
              if (!text.trim() && !e.currentTarget.closest('.park')?.contains(e.relatedTarget as Node)) p.onClose();
            }}
          />
          <p id="park-hint" className="park__hint">
            {INBOX_TEXT.parkHint}
          </p>
        </>
      ) : (
        msg && (
          <p className="sheet__msg park__msg">
            {msg.text}
            {msg.id && (
              <button
                type="button"
                className="note__undo"
                onClick={() => {
                  p.onUndo(msg.id!);
                  show({ text: INBOX_TEXT.parkUndone });
                }}
              >
                {PAUSE_TEXT.undo}
              </button>
            )}
          </p>
        )
      )}
    </section>
  );
}
