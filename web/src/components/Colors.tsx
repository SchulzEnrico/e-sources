/**
 * F-162: Dialog „Farben“ – Rahmen- und Akzentfarbe für ein Portal und seinen Slot. Was fehlt, erbt
 * (Portal → Slot → Desk). Native <dialog> mit showModal: Fokus bleibt im Dialog, Esc schließt,
 * danach geht der Fokus zurück zum Auslöser (NF-03). Farbe ist nie allein: jedes Feld hat einen
 * Namen (aria-label/Tooltip), die gewählte Wahl ist aria-pressed.
 * F-163: Oben die Kategorie des Portals (Kategorien der Library) mit ihren Farben – sie gelten für
 * alle Portale der Kategorie. Vorrang: Portal → Slot → Kategorie → Desk.
 */
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { ACCENTS, contrastWarning, type Shown } from '../workspace/look';
import { CATEGORY_ICON_LABEL, CATEGORY_TEXT, TINT_TEXT } from '../workspace/terms';
import type { TintKind } from '../workspace/tint';
import type { Category, Tint } from '../workspace/types';
import { CATEGORY_ICONS, categoryIcon } from '../workspace/icons';
import { Icon } from './Icon';

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
  /** F-163: Kategorien der Library, Kategorie des Portals ('' = ohne, fehlt = noch keine Wahl) und deren Farben. */
  categories: Category[];
  category?: string;
  categoryTint?: Tint;
  /** F-164: Farbregel dieser Kategorie ist im Cockpit ausgeschaltet. */
  categoryOff?: boolean;
  /** Wie viele Portale zur gewählten Kategorie gehören. */
  categoryPortals: number;
  onCategory: (id: string) => void;
  onNewCategory: (name: string) => void;
  onCategoryTint: (change: Change) => void;
  /** F-183 Stufe 2: Zeichen der Kategorie (null = Vorschlag nach Name). */
  onCategoryIcon: (icon: string | null) => void;
  /** Beim Öffnen auf die Wahl der Kategorie setzen (aus der Frage nach der Kategorie). */
  focusCategory?: boolean;
  /** Portal und Slot auf die Farben des Desks zurücksetzen. */
  onReset: () => void;
  onClose: () => void;
}

/** Farbfelder: die freien Akzentfarben (ohne die festen Farben der Retro-Designs). */
const SWATCHES = ACCENTS.filter((a) => !a.theme);

export function Row(props: { id: string; label: string; value?: string; inherit: string; shown: Shown; kind: TintKind; onChange: (v: string | null) => void }) {
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

const NEW = '\u0000neu';

export function Colors(props: Props) {
  const dlg = useRef<HTMLDialogElement>(null);
  // F-163: „Neue Kategorie …“ zeigt ein Namensfeld
  const [draft, setDraft] = useState<string | null>(null);
  const cat = props.category ? props.categories.find((c) => c.id === props.category) : undefined;
  const ct = cat ? props.categoryTint : undefined;
  const commitNew = () => {
    const n = draft?.trim();
    if (n) props.onNewCategory(n);
    setDraft(null);
    window.setTimeout(() => dlg.current?.querySelector<HTMLElement>('#colors-cat')?.focus(), 0);
  };
  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    const back = document.activeElement as HTMLElement | null;
    if (!d.open) d.showModal();
    d.querySelector<HTMLElement>(props.focusCategory ? '#colors-cat' : '.colors__inherit')?.focus();
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
          <Icon name="close" size={14} />
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
          <Row id="colors-sf" label={TINT_TEXT.frame} kind="frame" value={props.slot?.frame} inherit={ct?.frame && !props.categoryOff ? CATEGORY_TEXT.likeCategory : TINT_TEXT.noFrame} shown={props.shown} onChange={(v) => props.onSlot({ frame: v })} />
          <Row id="colors-sa" label={TINT_TEXT.accent} kind="accent" value={props.slot?.accent} inherit={ct?.accent && !props.categoryOff ? CATEGORY_TEXT.likeCategory : TINT_TEXT.likeDesk} shown={props.shown} onChange={(v) => props.onSlot({ accent: v })} />
        </section>
        <section className="design__group" aria-labelledby="colors-cathead" aria-describedby="colors-cat-note">
          <h3 id="colors-cathead" className="help__group" title={CATEGORY_TEXT.intro}>
            {CATEGORY_TEXT.head}
          </h3>
          <span id="colors-cat-note" hidden>
            {CATEGORY_TEXT.intro}
          </span>
          <div className="colors__row">
            <label htmlFor="colors-cat" className="colors__label">
              {CATEGORY_TEXT.head}
            </label>
            {draft === null ? (
              <select
                id="colors-cat"
                className="colors__select"
                aria-label={CATEGORY_TEXT.label}
                value={cat ? cat.id : ''}
                onChange={(e) => (e.target.value === NEW ? setDraft('') : props.onCategory(e.target.value))}
              >
                <option value="">{CATEGORY_TEXT.none}</option>
                {props.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value={NEW}>{CATEGORY_TEXT.create}</option>
              </select>
            ) : (
              <span className="colors__new">
                <input
                  autoFocus
                  className="colors__input"
                  value={draft}
                  aria-label={CATEGORY_TEXT.newName}
                  placeholder={CATEGORY_TEXT.newName}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitNew();
                    if (e.key === 'Escape') {
                      // Esc bricht nur das Feld ab, nicht den Dialog
                      e.preventDefault();
                      e.stopPropagation();
                      setDraft(null);
                      window.setTimeout(() => dlg.current?.querySelector<HTMLElement>('#colors-cat')?.focus(), 0);
                    }
                  }}
                />
                <button type="button" className="colors__inherit" onClick={commitNew} disabled={!draft?.trim()}>
                  {CATEGORY_TEXT.add}
                </button>
                <button type="button" className="colors__inherit" onClick={() => setDraft(null)}>
                  {CATEGORY_TEXT.cancel}
                </button>
              </span>
            )}
            {cat && <span className="colors__count">{CATEGORY_TEXT.portals(props.categoryPortals)}</span>}
          </div>
          {cat && (
            <>
              {props.categoryOff && <p className="colors__count">{CATEGORY_TEXT.ruleOff}</p>}
              <Row id="colors-cf" label={TINT_TEXT.frame} kind="frame" value={ct?.frame} inherit={TINT_TEXT.noFrame} shown={props.shown} onChange={(v) => props.onCategoryTint({ frame: v })} />
              <Row id="colors-ca" label={TINT_TEXT.accent} kind="accent" value={ct?.accent} inherit={TINT_TEXT.likeDesk} shown={props.shown} onChange={(v) => props.onCategoryTint({ accent: v })} />
              <IconRow cat={cat} onChange={props.onCategoryIcon} />
            </>
          )}
        </section>
      </div>
    </dialog>
  );
}

/**
 * F-183 Stufe 2: Zeichen der Kategorie wählen. Auswahl als Optionsgruppe (radiogroup): Tab springt
 * hinein, Pfeiltasten wählen, jedes Zeichen hat seinen Namen als aria-label und Tooltip (NF-03).
 */
function IconRow({ cat, onChange }: { cat: Category; onChange: (icon: string | null) => void }) {
  const auto = categoryIcon({ name: cat.name });
  const options: (string | null)[] = [null, ...CATEGORY_ICONS];
  const current = cat.icon ?? null;
  const at = Math.max(0, options.indexOf(current));
  const group = useRef<HTMLSpanElement>(null);
  const label = (o: string | null) => (o ? CATEGORY_ICON_LABEL[o] ?? o : CATEGORY_TEXT.iconAuto(CATEGORY_ICON_LABEL[auto] ?? auto));
  const pick = (i: number) => {
    onChange(options[i]);
    window.setTimeout(() => group.current?.querySelectorAll<HTMLElement>('[role="radio"]')[i]?.focus(), 0);
  };
  return (
    <div className="colors__row">
      <span id="colors-ci" className="colors__label">
        {CATEGORY_TEXT.icon}
      </span>
      <span
        ref={group}
        className="colors__icons"
        role="radiogroup"
        aria-labelledby="colors-ci"
        aria-describedby="colors-ci-note"
        onKeyDown={(e) => {
          const n = options.length;
          const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
          const to = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : step ? (at + step + n) % n : -1;
          if (to < 0) return;
          e.preventDefault();
          pick(to);
        }}
      >
        {options.map((o, i) => (
          <button
            key={o ?? 'auto'}
            type="button"
            role="radio"
            aria-checked={i === at}
            tabIndex={i === at ? 0 : -1}
            className={i === at ? (o ? 'colors__icon on' : 'colors__inherit colors__icon-auto on') : o ? 'colors__icon' : 'colors__inherit colors__icon-auto'}
            title={label(o)}
            aria-label={label(o)}
            onClick={() => pick(i)}
          >
            {o ? <Icon name={o as (typeof CATEGORY_ICONS)[number]} /> : <><Icon name={auto} /> {CATEGORY_TEXT.iconAuto('').replace(' ()', '')}</>}
          </button>
        ))}
      </span>
      <span id="colors-ci-note" hidden>
        {CATEGORY_TEXT.iconIntro}
      </span>
    </div>
  );
}
