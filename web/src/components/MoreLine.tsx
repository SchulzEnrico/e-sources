/**
 * V159 (Enrico 14:27 „Diese Texte … verliert man durch ihren Umbruch sehr viel Platz“, Wahl: „Eine Zeile, Rest per
 * ‚mehr‘“): Erklär- und Tastentexte unter den Überschriften stehen in **einer** Zeile; passt der Text nicht, endet
 * sie mit „…“ und einem Knopf „mehr“, der den ganzen Text aufklappt („weniger“ klappt zu). Auf/zu merkt sich das
 * Gerät je Stelle. Der ganze Text bleibt im DOM – Screenreader lesen ihn immer vollständig.
 */
import { type ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { MORE_TEXT } from '../workspace/terms';

const KEY = 'esource.moreOpen.v1';
const load = (): Record<string, true> => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
};
const save = (k: string, open: boolean) => {
  try {
    const all = load();
    if (open) all[k] = true;
    else delete all[k];
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // ohne Speicher: gilt bis zum Neuladen
  }
};

export function MoreLine({ store, className = '', id, role, children }: { store: string; className?: string; id?: string; role?: 'status'; children: ReactNode }) {
  const [open, setOpen] = useState(() => !!load()[store]);
  const [over, setOver] = useState(false);
  const text = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = text.current;
    if (!el) return;
    const check = () => setOver(open || el.scrollWidth > el.clientWidth + 1);
    check();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  });
  const toggle = () => {
    setOpen(!open);
    save(store, !open);
  };
  return (
    <p className={`${className} moreline${open ? ' is-open' : ''}`} id={id} role={role}>
      <span ref={text} className="moreline__text">
        {children}
      </span>
      {over && (
        <button type="button" className="moreline__btn" aria-expanded={open} onClick={toggle} title={open ? MORE_TEXT.lessHint : MORE_TEXT.moreHint}>
          {open ? MORE_TEXT.less : MORE_TEXT.more}
        </button>
      )}
    </p>
  );
}
