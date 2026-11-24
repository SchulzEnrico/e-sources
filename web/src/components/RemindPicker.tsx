/**
 * V74 (F-215, Wunsch Enrico): eigene Auswahl für Datum und Uhrzeit im Stil des Pads – statt der Auswahl des
 * Systems („Katastrophe“ im dunklen Pad). Links ein Monatskalender, rechts die Uhrzeit als zwei Drehräder wie bei
 * aktuellen Apple-Geräten (wischen, scrollen, rollen; rastet auf jedem Wert ein, Werte zur Mitte hin gewölbt).
 * Tastatur (NF-03): Kalender – Pfeile = Tag, Bild ↑/↓ = Monat, Pos1/Ende = Wochenanfang/-ende, Enter = Übernehmen;
 * Räder sind „Drehfelder“ (role=spinbutton) – Pfeil ↑/↓ = ±1, Bild ↑/↓ = ±10 (Minuten) bzw. ±6 (Stunden), Enter =
 * Übernehmen. Reihenfolge (Wunsch Enrico): Uhrzeit oben, Kalender darunter.
 * Esc schließt (fängt das Menü „Wann?“ ab). Begriffe stehen sichtbar daneben („Stunde“, „Minute“).
 */
import { type KeyboardEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { REMIND_TEXT as RT } from '../workspace/terms';
import { remindLabel } from '../workspace/remind';
import { Icon } from './Icon';

const ROW_D = 32; // Höhe eines Werts im Rad (px)
const SHOW_D = 5; // sichtbare Werte (ungerade: Mitte = gewählt)
const pad2 = (n: number) => String(n).padStart(2, '0');
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Startwert: gesetzte Erinnerung oder jetzt, auf die nächsten 5 Minuten aufgerundet. */
export function startValue(iso?: string): Date {
  if (iso) {
    const d = new Date(iso);
    if (!isNaN(d.getTime())) return d;
  }
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(Math.ceil((d.getMinutes() + 1) / 5) * 5);
  return d;
}

/** 42 Tage (6 Wochen, Montag zuerst) rund um den Monat von `m`. */
function monthDays(m: Date): Date[] {
  const first = new Date(m.getFullYear(), m.getMonth(), 1);
  const back = (first.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, i) => new Date(m.getFullYear(), m.getMonth(), 1 - back + i));
}

// ---------------------------------------------------------------- Drehrad
/** Drehrad; V74 auch für die Stufe der Überschrift (labels statt Zahlen). */
export function Wheel(props: { label: string; value: number; count: number; big: number; onChange: (v: number) => void; onEnter: () => void; labels?: string[]; wrap?: boolean; row?: number; show?: number; height?: number; passive?: boolean }) {
  const { value, count, onChange } = props;
  // V74: kompakte Größe (z. B. im Knopf „Überschrift“); passive = kein eigenes Tastaturziel (Knopf bedient es)
  const ROW = props.row ?? ROW_D;
  const SHOW = props.show ?? SHOW_D;
  const H = props.height ?? ROW * SHOW; // sichtbare Höhe; Nachbarn dürfen angeschnitten sein
  const PAD = (H - ROW) / 2;
  const own_ = props.row || props.height;
  const box = useRef<HTMLDivElement>(null);
  const settle = useRef(0);
  const own = useRef(false); // Wert kam aus dem Scrollen – nicht zurückscrollen

  // Wölbung: je weiter ein Wert von der Mitte, desto mehr gekippt und blasser (direkt am Element)
  const curve = () => {
    const el = box.current;
    if (!el) return;
    const mid = el.scrollTop + H / 2;
    el.querySelectorAll<HTMLElement>('.rpick__val').forEach((it, i) => {
      const d = (PAD + i * ROW + ROW / 2 - mid) / ROW;
      const a = Math.max(-80, Math.min(80, d * 22));
      it.style.transform = `rotateX(${-a}deg) scale(${1 - Math.min(Math.abs(d), 3) * 0.06})`;
      it.style.opacity = String(Math.max(0.15, 1 - Math.abs(d) * 0.32));
    });
  };
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    if (own.current) return void (own.current = false);
    el.scrollTop = value * ROW;
    curve();
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const onScroll = () => {
    curve();
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const el = box.current;
      if (!el) return;
      const v = Math.max(0, Math.min(count - 1, Math.round(el.scrollTop / ROW)));
      if (v !== value) {
        own.current = true;
        onChange(v);
      }
    }, 90);
  };
  useEffect(() => () => window.clearTimeout(settle.current), []);

  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, number> = { ArrowUp: -1, ArrowDown: 1, PageUp: -props.big, PageDown: props.big };
    if (e.key in step) {
      e.preventDefault();
      const v = value + step[e.key];
      onChange(props.wrap === false ? Math.max(0, Math.min(count - 1, v)) : ((v % count) + count) % count);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      onChange(e.key === 'Home' ? 0 : count - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      props.onEnter();
    }
  };

  return (
    <div className="rpick__wheelbox">
      {props.label && <span className="rpick__cap" aria-hidden="true">{props.label}</span>}
      <div className="rpick__wheelwrap" style={own_ ? { height: H } : undefined}>
        <div
          ref={box}
          className="rpick__wheel"
          tabIndex={props.passive ? -1 : 0}
          aria-hidden={props.passive || undefined}
          role="spinbutton"
          aria-label={props.label}
          aria-valuemin={0}
          aria-valuemax={count - 1}
          aria-valuenow={value}
          aria-valuetext={props.labels?.[value] ?? pad2(value)}
          onScroll={onScroll}
          onKeyDown={key}
        >
          <div className="rpick__spacer" style={own_ ? { height: PAD } : undefined} />
          {Array.from({ length: count }, (_, i) => (
            <div
              key={i}
              className={`rpick__val${i === value ? ' is-on' : ''}`}
              style={own_ ? { height: ROW } : undefined}
              aria-hidden="true"
              onClick={() => onChange(i)}
            >
              {props.labels?.[i] ?? pad2(i)}
            </div>
          ))}
          <div className="rpick__spacer" style={own_ ? { height: PAD } : undefined} />
        </div>
        <span className="rpick__band" aria-hidden="true" style={own_ ? { top: PAD, height: ROW } : undefined} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Auswahl
export function RemindPicker(props: {
  at?: string;
  /** jede Änderung (für „Klick außerhalb übernimmt“) */
  onDraft: (d: Date) => void;
  onDone: (d: Date) => void;
  onCancel: () => void;
}) {
  const [val, setVal] = useState(() => startValue(props.at));
  const [month, setMonth] = useState(() => new Date(val.getFullYear(), val.getMonth(), 1));
  const grid = useRef<HTMLDivElement>(null);
  const moveFocus = useRef(false);
  const today = new Date();

  const set = (d: Date) => {
    setVal(d);
    props.onDraft(d);
    if (d.getMonth() !== month.getMonth() || d.getFullYear() !== month.getFullYear()) setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  };
  const withDay = (day: Date) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), val.getHours(), val.getMinutes());
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // V74 (Enrico: „Uhrzeit oben, Datum unten“): Fokus beginnt beim Stundenrad
    root.current?.querySelector<HTMLElement>('.rpick__wheel')?.focus({ preventScroll: true });
    // ganze Auswahl sichtbar machen (die Note scrollt mit)
    root.current?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, []);
  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    grid.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
  }, [val, month]);

  const shiftMonth = (n: number) => {
    const m = new Date(month.getFullYear(), month.getMonth() + n, 1);
    setMonth(m);
  };
  const dayKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const d = new Date(val);
    const steps: Record<string, () => void> = {
      ArrowLeft: () => d.setDate(d.getDate() - 1),
      ArrowRight: () => d.setDate(d.getDate() + 1),
      ArrowUp: () => d.setDate(d.getDate() - 7),
      ArrowDown: () => d.setDate(d.getDate() + 7),
      PageUp: () => d.setMonth(d.getMonth() - 1),
      PageDown: () => d.setMonth(d.getMonth() + 1),
      Home: () => d.setDate(d.getDate() - ((d.getDay() + 6) % 7)),
      End: () => d.setDate(d.getDate() + (6 - ((d.getDay() + 6) % 7))),
    };
    if (e.key in steps) {
      e.preventDefault();
      steps[e.key]();
      moveFocus.current = true;
      set(d);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      props.onDone(val);
    }
  };

  const days = monthDays(month);
  const monthName = month.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  const showsVal = val.getMonth() === month.getMonth() && val.getFullYear() === month.getFullYear();

  return (
    <div className="rpick" role="group" aria-label={RT.pickLabel} ref={root}>
      <div className="rpick__head">
        <span className="rpick__title">{RT.pickLabel}</span>
        <output className="rpick__sum" aria-live="polite">{remindLabel(val.toISOString())}</output>
      </div>
      <div className="rpick__body">
        <div className="rpick__time">
          <Wheel label={RT.hour} value={val.getHours()} count={24} big={6} onEnter={() => props.onDone(val)} onChange={(h) => set(new Date(val.getFullYear(), val.getMonth(), val.getDate(), h, val.getMinutes()))} />
          <span className="rpick__colon" aria-hidden="true">:</span>
          <Wheel label={RT.minute} value={val.getMinutes()} count={60} big={10} onEnter={() => props.onDone(val)} onChange={(m) => set(new Date(val.getFullYear(), val.getMonth(), val.getDate(), val.getHours(), m))} />
        </div>
        <div className="rpick__cal">
          <div className="rpick__month">
            <button type="button" className="rpick__nav" aria-label={RT.prevMonth} title={RT.prevMonth} onClick={() => shiftMonth(-1)}>
              <Icon name="back" size={12} />
            </button>
            <span className="rpick__mname">{monthName}</span>
            <button type="button" className="rpick__nav rpick__nav--next" aria-label={RT.nextMonth} title={RT.nextMonth} onClick={() => shiftMonth(1)}>
              <Icon name="back" size={12} />
            </button>
          </div>
          <div className="rpick__grid" role="grid" aria-label={monthName} ref={grid} onKeyDown={dayKey}>
            <div role="row" className="rpick__row">
              {RT.weekdays.map((w) => (
                <span key={w} role="columnheader" className="rpick__wd">
                  {w}
                </span>
              ))}
            </div>
            {Array.from({ length: 6 }, (_, r) => (
              <div role="row" className="rpick__row" key={r}>
                {days.slice(r * 7, r * 7 + 7).map((d) => {
                  const on = sameDay(d, val);
                  const focusable = showsVal ? on : d.getDate() === 1 && d.getMonth() === month.getMonth();
                  const outside = d.getMonth() !== month.getMonth();
                  const past = d < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                  return (
                    <button
                      key={d.toDateString()}
                      type="button"
                      role="gridcell"
                      tabIndex={focusable ? 0 : -1}
                      aria-selected={on}
                      aria-current={sameDay(d, today) ? 'date' : undefined}
                      aria-label={d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
                      className={`rpick__day${on ? ' is-on' : ''}${outside ? ' is-out' : ''}${past ? ' is-past' : ''}${sameDay(d, today) ? ' is-today' : ''}`}
                      onClick={() => set(withDay(d))}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <button type="button" className="rpick__today" onClick={() => (moveFocus.current = true, set(withDay(today)))}>
            {RT.today}
          </button>
        </div>
      </div>
      <div className="rpick__acts">
        <button type="button" className="rpick__cancel" onClick={props.onCancel}>
          {RT.cancel}
        </button>
        <button type="button" className="rpick__ok" onClick={() => props.onDone(val)}>
          <Icon name="check" size={14} /> {RT.apply}
        </button>
      </div>
    </div>
  );
}
