/**
 * F-162: Dialog „Farben“ – Rahmen- und Akzentfarbe für ein Portal und seinen Slot. Was fehlt, erbt
 * (Portal → Slot → Desk). Native <dialog> mit showModal: Fokus bleibt im Dialog, Esc schließt,
 * danach geht der Fokus zurück zum Auslöser (NF-03). Farbe ist nie allein: jedes Feld hat einen
 * Namen (aria-label/Tooltip), die gewählte Wahl ist aria-pressed.
 */
import { type CSSProperties, useEffect, useRef } from 'react';
import { ACCENTS, contrastWarning, type Shown } from '../workspace/look';
import { TINT_TEXT } from '../workspace/terms';
import type { TintKind } from '../workspace/tint';
import type { Tint } from '../workspace/types';

type Change = Partial<Record<TintKind, string | null>>;

interface Props {
  portalName: string;
  slotName: string;
  portal?: Tint;
  slot?: Tint;
  /** Gezeigtes Design – für den Kontrasthinweis der Akzentfarbe. */
  shown: Shown;
  onPortal: (change: Change) => void;
  onSlot: (change: Change) => void;
  /** Portal und Slot auf die Farben des Desks zurücksetzen. */
  onReset: () => void;
  onClose: () => void;
}

/** Farbfelder: die freien Akzentfarben (ohne die festen Farben der Retro-Designs). */
const SWATCHES = ACCENTS.filter((a) => !a.theme);

function Row(props: { id: string; label: string; value?: string; inherit: string; shown: Shown; kind: TintKind; onChange: (v: string | null) => void }) {
  const { id, value } = props;
  const warn = props.kind === 'accent' && value ? contrastWarning(value, props.shown) : null;
  return (
    <div className="colors__row">
      <span id={id} className="colors__label">
        {props.label}
      </span>
      <span className="look__swatches" role="group" aria-labelledby={id}>
        <button type="button" className={value ? 'colors__inherit' : 'colors__inherit on'} aria-pressed={!value} onClick={() => props.onChange(null)}>
          {props.inherit}
        </button>
        {SWATCHES.map((a) => (
          <button
            key={a.hex}
            type="button"
            className={value === a.hex ? 'look__swatch on' : 'look__swatch'}
            style={{ '--swatch': a.hex } as CSSProperties}
            title={a.name}
            aria-label={`${props.label}: ${a.name}`}
            aria-pressed={value === a.hex}
            onClick={() => props.onChange(a.hex)}
          />
        ))}
        {/* eigene Farbe als kleines Feld am Zeilenende; Name per Tooltip und aria-label */}
        <input
          type="color"
          className={value && !SWATCHES.some((a) => a.hex === value) ? 'colors__own on' : 'colors__own'}
          value={value ?? '#888888'}
          title={TINT_TEXT.own}
          aria-label={`${props.label}: ${TINT_TEXT.own}`}
          onChange={(e) => props.onChange(e.target.value)}
        />
      </span>
      {warn && (
        <p className="look__warn" role="status">
          {warn}
        </p>
      )}
    </div>
  );
}

export function Colors(props: Props) {
  const dlg = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    const back = document.activeElement as HTMLElement | null;
    if (!d.open) d.showModal();
    d.querySelector<HTMLButtonElement>('.colors__inherit')?.focus();
    return () => back?.focus?.();
  }, []);

  return (
    <dialog
      ref={dlg}
      className="help design colors"
      aria-labelledby="colors-title"
      aria-describedby="colors-intro"
      onClose={props.onClose}
      onCancel={(e) => {
        e.preventDefault();
        props.onClose();
      }}
      onClick={(e) => e.target === dlg.current && props.onClose()}
    >
      <header className="help__head">
        <h2 id="colors-title">{TINT_TEXT.title}</h2>
        {/* F-162: beides auf einmal zurück auf die Farben des Desks */}
        {(props.portal || props.slot) && (
          <button
            type="button"
            className="design__tour"
            title={TINT_TEXT.resetOneTitle}
            onClick={() => {
              props.onReset();
              // der Knopf verschwindet – Fokus auf die erste Wahl (NF-03)
              dlg.current?.querySelector<HTMLButtonElement>('.colors__inherit')?.focus();
            }}
          >
            {TINT_TEXT.resetOne}
          </button>
        )}
        <button type="button" className="help__x" onClick={props.onClose} title="Schließen (Esc)" aria-label={`${TINT_TEXT.title} schließen`}>
          ×
        </button>
      </header>
      <p id="colors-intro" className="help__intro">
        {TINT_TEXT.short}
      </p>
      <div className="help__body">
        <section className="design__group" aria-labelledby="colors-portal">
          <h3 id="colors-portal" className="help__group">
            {TINT_TEXT.portal(props.portalName)}
          </h3>
          <Row id="colors-pf" label={TINT_TEXT.frame} kind="frame" value={props.portal?.frame} inherit={TINT_TEXT.likeSlot} shown={props.shown} onChange={(v) => props.onPortal({ frame: v })} />
          <Row id="colors-pa" label={TINT_TEXT.accent} kind="accent" value={props.portal?.accent} inherit={TINT_TEXT.likeSlot} shown={props.shown} onChange={(v) => props.onPortal({ accent: v })} />
        </section>
        <section className="design__group" aria-labelledby="colors-slot" aria-describedby="colors-slot-note">
          <h3 id="colors-slot" className="help__group" title={TINT_TEXT.slotNote}>
            {TINT_TEXT.slot(props.slotName)}
          </h3>
          <span id="colors-slot-note" hidden>
            {TINT_TEXT.slotNote}
          </span>
          <Row id="colors-sf" label={TINT_TEXT.frame} kind="frame" value={props.slot?.frame} inherit={TINT_TEXT.noFrame} shown={props.shown} onChange={(v) => props.onSlot({ frame: v })} />
          <Row id="colors-sa" label={TINT_TEXT.accent} kind="accent" value={props.slot?.accent} inherit={TINT_TEXT.likeDesk} shown={props.shown} onChange={(v) => props.onSlot({ accent: v })} />
        </section>
      </div>
    </dialog>
  );
}
