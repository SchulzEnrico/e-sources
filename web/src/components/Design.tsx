/**
 * F-174: Dialog „Design anpassen“ – Darstellung und Akzentfarbe an einer Stelle statt lose im
 * Einstellungsmenü. Später kommen Farben je Desk, Slot und Portal (F-161, F-162) und Farbregeln
 * (F-163) hinzu. Native <dialog> mit showModal: Fokus bleibt im Dialog, Esc schließt, danach geht
 * der Fokus zurück zum Auslöser (NF-03). Die Tour „Design“ (F-171) läuft in diesem Dialog.
 */
import { Icon } from './Icon';
import { ModeWheel } from './ModeWheel';
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react';
import { DialogFoot } from './DialogFoot';
import { type DesignSnap, designChanged } from '../workspace/reset';
import { ACCENTS, type Look, THEMES } from '../workspace/look';
import { helpById } from '../workspace/help';
import { DESK_LOOK_TEXT, TINT_TEXT } from '../workspace/terms';

interface Props {
  look: Look;
  /** Hinweis bei schwachem Kontrast der Akzentfarbe, sonst leer. */
  warning: string | null;
  onLook: (change: Partial<Look>) => void;
  /** F-161: Name des Desks, für den der Dialog gilt. */
  desk: string;
  /** F-161: Dialog gilt für den Main Desk. */
  main: boolean;
  /** F-161: Zusatz-Desk hat eigene Farben (sonst folgt er dem Main Desk). */
  own: boolean;
  /** F-161: Zusatz-Desk folgt wieder dem Main Desk. */
  onFollowMain: () => void;
  /** F-162: Wie viele Slots und Portale dieses Desks eigene Farben haben. */
  tinted: number;
  /** F-162: alle auf Desk-Farben zurücksetzen. */
  onResetTints: () => void;
  /** F-191: aktueller Stand (Desk-Farben, Slot- und Portalfarben) – der beim Öffnen wird gemerkt. */
  now: DesignSnap;
  /** F-191: „Zurücksetzen“ – Stand beim Öffnen wieder herstellen. */
  onRestore: (snap: DesignSnap) => void;
  onClose: () => void;
  onTour: () => void;
  /** Tour, die im Dialog laufen soll (wird hineingereicht, damit sie über dem Dialog liegt). */
  children?: ReactNode;
}

export function Design({ look, warning, onLook, desk, main, own, onFollowMain, tinted, onResetTints, now, onRestore, onClose, onTour, children }: Props) {
  const dlg = useRef<HTMLDialogElement>(null);
  const first = useRef<HTMLDivElement>(null); // V83: Rad „Darstellung“ (erstes Bedienelement)
  // F-191: Stand beim Öffnen – „Zurücksetzen“ nur, wenn sich seitdem etwas geändert hat
  const [start] = useState(now);
  const changed = designChanged(start, now);

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    const back = document.activeElement as HTMLElement | null;
    if (!d.open) d.showModal();
    first.current?.querySelector<HTMLElement>('.mwheel')?.focus();
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
        <h2 id="design-title">
          Design anpassen <span className="design__desk">· {DESK_LOOK_TEXT.scope(desk)}</span>
        </h2>
        <button type="button" className="design__tour" onClick={onTour} title="Kurze Einführung in diesen Dialog" aria-label="Tour „Design“ starten">
          Tour
        </button>
        <button type="button" className="help__x" onClick={onClose} title="Schließen (Esc)" aria-label="Design anpassen schließen">
          <Icon name="close" size={14} />
        </button>
      </header>
      <p id="design-intro" className="help__intro">
        {helpById('design')?.text}
      </p>
      {/* F-161: für welchen Desk die Wahl gilt und ob er dem Main Desk folgt */}
      <p className="design__scope">
        {main ? DESK_LOOK_TEXT.main : own ? DESK_LOOK_TEXT.own(desk) : DESK_LOOK_TEXT.follows(desk)}
        {!main && own && (
          <button type="button" className="design__follow" title={DESK_LOOK_TEXT.followTitle}
            onClick={() => {
              onFollowMain();
              // der Knopf verschwindet – Fokus auf die erste Wahl, damit er nicht verloren geht (NF-03)
              first.current?.querySelector<HTMLElement>('.mwheel')?.focus();
            }}
          >
            {DESK_LOOK_TEXT.follow}
          </button>
        )}
      </p>
      <div className="help__body">
        <section className="design__group design__theme" aria-labelledby="design-theme">
          <h3 id="design-theme" className="help__group">
            Darstellung
          </h3>
          {/* V83 (F-216, U6): Darstellung als Umschalt-Rad, ringsum; Gruppe (Modern/Retro) klein über dem Namen */}
          <div ref={first} className="design__wheel">
            <ModeWheel
              label="Darstellung"
              value={look.theme}
              wrap
              onChange={(id) => onLook({ theme: id as Look['theme'] })}
              options={THEMES.map((t) => ({ id: t.id, name: t.label, glyph: <small className="mwheel__group">{t.group}</small>, hint: t.group }))}
            />
          </div>
        </section>
        <section className="design__group design__accent" aria-labelledby="design-accent">
          <h3 id="design-accent" className="help__group">
            Akzentfarbe
          </h3>
          {/* V83 (F-216, U6): Akzentfarbe als Umschalt-Rad, ringsum – Farbpunkt + Name; „Eigene Farbe“ daneben */}
          <span className="design__wheel">
            <ModeWheel
              label="Akzentfarbe"
              value={ACCENTS.some((a) => a.hex === look.accent) ? look.accent : '-'}
              between={ACCENTS.some((a) => a.hex === look.accent) ? undefined : { name: 'Eigene Farbe', after: 0 }}
              wrap
              onChange={(hex) => onLook({ accent: hex })}
              options={ACCENTS.map((a) => ({ id: a.hex, name: a.name, glyph: <span className="mwheel__dot" style={{ '--swatch': a.hex } as CSSProperties} /> }))}
            />
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
        {/* F-162: Farben aller Slots und Portale dieses Desks zurücksetzen */}
        <section className="design__group design__tints" aria-labelledby="design-tints">
          <h3 id="design-tints" className="help__group">
            {TINT_TEXT.deskHead}
          </h3>
          <p className="colors__note">
            {tinted ? TINT_TEXT.deskSome(tinted) : TINT_TEXT.deskNone}
            {tinted > 0 && (
              <>
                {' '}
                <button type="button" className="design__follow" onClick={onResetTints}>
                  {TINT_TEXT.resetAll}
                </button>
              </>
            )}
          </p>
        </section>
      </div>
      <DialogFoot
        changed={changed}
        onReset={() => {
          onRestore(start);
          dlg.current?.querySelector<HTMLButtonElement>('.dialog-foot__done')?.focus();
        }}
        onDone={onClose}
      />
      {children}
    </dialog>
  );
}
