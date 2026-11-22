/**
 * F-174: Dialog „Design anpassen“ – Darstellung und Akzentfarbe an einer Stelle statt lose im
 * Einstellungsmenü. Später kommen Farben je Desk, Slot und Portal (F-161, F-162) und Farbregeln
 * (F-163) hinzu. Native <dialog> mit showModal: Fokus bleibt im Dialog, Esc schließt, danach geht
 * der Fokus zurück zum Auslöser (NF-03). Die Tour „Design“ (F-171) läuft in diesem Dialog.
 */
import { type CSSProperties, type ReactNode, useEffect, useRef } from 'react';
import { ACCENTS, type Look, THEMES } from '../workspace/look';
import { helpById } from '../workspace/help';

interface Props {
  look: Look;
  /** Hinweis bei schwachem Kontrast der Akzentfarbe, sonst leer. */
  warning: string | null;
  onLook: (change: Partial<Look>) => void;
  onClose: () => void;
  onTour: () => void;
  /** Tour, die im Dialog laufen soll (wird hineingereicht, damit sie über dem Dialog liegt). */
  children?: ReactNode;
}

export function Design({ look, warning, onLook, onClose, onTour, children }: Props) {
  const dlg = useRef<HTMLDialogElement>(null);
  const first = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    const back = document.activeElement as HTMLElement | null;
    if (!d.open) d.showModal();
    first.current?.focus();
    return () => back?.focus?.();
  }, []);

  return (
    <dialog
      ref={dlg}
      id="design"
      className="help design"
      aria-labelledby="design-title"
      aria-describedby="design-intro"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === dlg.current && onClose()}
    >
      <header className="help__head">
        <h2 id="design-title">Design anpassen</h2>
        <button type="button" className="design__tour" onClick={onTour} title="Kurze Einführung in diesen Dialog" aria-label="Tour „Design“ starten">
          Tour
        </button>
        <button type="button" className="help__x" onClick={onClose} title="Schließen (Esc)" aria-label="Design anpassen schließen">
          ×
        </button>
      </header>
      <p id="design-intro" className="help__intro">
        {helpById('design')?.text} Änderungen gelten sofort.
      </p>
      <div className="help__body">
        <section className="design__group design__theme" aria-labelledby="design-theme">
          <h3 id="design-theme" className="help__group">
            Darstellung
          </h3>
          {/* F-176: Modern und Retro getrennt, damit die lange Liste übersichtlich bleibt */}
          {(['Modern', 'Retro'] as const).map((g) => (
            <div key={g} className="design__sub">
              <h4 id={`design-theme-${g}`} className="design__subhead">
                {g}
              </h4>
              <span className="seg seg--wrap" role="group" aria-labelledby={`design-theme design-theme-${g}`}>
                {THEMES.filter((t) => t.group === g).map((t) => (
                  <button key={t.id} ref={t.id === THEMES[0].id ? first : undefined} type="button" className={look.theme === t.id ? 'on' : ''} aria-pressed={look.theme === t.id} onClick={() => onLook({ theme: t.id })}>
                    {t.label}
                  </button>
                ))}
              </span>
            </div>
          ))}
        </section>
        <section className="design__group design__accent" aria-labelledby="design-accent">
          <h3 id="design-accent" className="help__group">
            Akzentfarbe
          </h3>
          <span className="look__swatches" role="group" aria-labelledby="design-accent">
            {ACCENTS.map((a) => (
              <button
                key={a.hex}
                type="button"
                className={look.accent === a.hex ? 'look__swatch on' : 'look__swatch'}
                style={{ '--swatch': a.hex } as CSSProperties}
                title={a.name}
                aria-label={a.name}
                aria-pressed={look.accent === a.hex}
                onClick={() => onLook({ accent: a.hex })}
              />
            ))}
          </span>
          <label className="look__custom">
            Eigene Farbe
            <input type="color" value={look.accent} onChange={(e) => onLook({ accent: e.target.value })} />
          </label>
          {warning && (
            <p className="look__warn" role="status">
              {warning}
            </p>
          )}
        </section>
      </div>
      {children}
    </dialog>
  );
}
