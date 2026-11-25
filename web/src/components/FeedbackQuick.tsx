/**
 * F-221 Bau 2 (V102, FB3–FB6, FB12): Feedback „Schnell erfassen“ – Fenster am Ort des Geschehens (F-214),
 * direkt am Knopf bzw. Menü, das es geöffnet hat. Nur Art + Titel, Ort und Umgebung kommen automatisch mit
 * (nichts aus Notizen oder Seiten). Nach dem Speichern bleibt das Fenster kurz als Meldung am Ort stehen:
 * „gespeichert“ mit Rückgängig und – abschaltbar – „War das Melden einfach?“ 1–5.
 * Native <dialog> (Fokus bleibt drin, Esc schließt, NF-03); vollständig per Tastatur bedienbar.
 */
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import type { FeedbackEnv, FeedbackKind, FeedbackPlace, Workspace } from '../workspace/types';
import { FEEDBACK_KINDS, similarFeedback } from '../workspace/feedback';
import { FEEDBACK_TEXT as T } from '../workspace/terms';
import { ModeWheel } from './ModeWheel';
import { Icon } from './Icon';

export type Anchor = { top: number; left: number; bottom: number; right: number };

/** F-221 (FB4): aus einem ⋮-Menü (Portal, Pad) heraus öffnen – App hört darauf. */
export const FEEDBACK_EVENT = 'esource:feedback';
export function askFeedback(kind?: FeedbackKind) {
  // Anker = Knopf des gerade offenen Menüs (Safari fokussiert geklickte Knöpfe nicht)
  const from = document.querySelector('.menu > button[aria-expanded="true"]') ?? document.activeElement;
  window.dispatchEvent(new CustomEvent(FEEDBACK_EVENT, { detail: { from, kind } }));
}

const W = 380; // Breite des Fensters (px)
const GAP = 8;
const SAVED_MS = 8000; // so lange bleibt die Meldung am Ort, wenn nichts mehr bedient wird

/** Platz am Anker: darunter, sonst darüber; waagerecht so, dass es im Fenster bleibt (rein). */
export function placeAt(a: Anchor, h: number, vw: number, vh: number): { top: number; left: number } {
  const left = Math.max(GAP, Math.min(vw - W - GAP, a.right - W));
  const below = a.bottom + GAP;
  const top = below + h <= vh - GAP ? below : Math.max(GAP, a.top - GAP - h);
  return { top: Math.round(top), left: Math.round(left) };
}

export function placeText(place: FeedbackPlace | undefined, env: FeedbackEnv | undefined): string {
  const p = [
    place?.mode,
    place?.view,
    place?.menu,
    place?.desk !== undefined ? place.desk || T.mainDesk : undefined,
  ].filter(Boolean);
  const e = [env?.version, env?.device, env?.browser, env?.screen].filter(Boolean);
  return [p.join(' › '), e.join(' · ')].filter(Boolean).join(' — ') || T.placeNone;
}

export function FeedbackQuick(props: {
  ws: Workspace;
  anchor: Anchor | null;
  place?: FeedbackPlace;
  env?: FeedbackEnv;
  askEase: boolean;
  /** Art beim Öffnen (z. B. aus „Fehler melden …“) */
  kind?: FeedbackKind;
  onSave: (v: { kind: FeedbackKind; title: string }) => string | null;
  onUndo: (id: string) => void;
  onEase: (id: string, n: number) => void;
  onNeverAsk: () => void;
  /** Stufe 2 öffnen (Bau 3); fehlt = Knopf ausgeblendet */
  onElaborate?: (id: string) => void;
  onClose: () => void;
}) {
  const dlg = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<FeedbackKind>(props.kind ?? 'bug');
  const [title, setTitle] = useState('');
  const [miss, setMiss] = useState(false);
  const [saved, setSaved] = useState<{ id: string; title: string } | null>(null);
  const [eased, setEased] = useState(false);
  const [undone, setUndone] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const similar = title.trim().length >= 4 ? similarFeedback(props.ws, title) : [];

  useEffect(() => {
    const d = dlg.current;
    if (d && !d.open) d.showModal();
    titleRef.current?.focus();
  }, []);

  // am Ort: neben den Anker setzen, nach jeder Größenänderung des Fensters neu
  useLayoutEffect(() => {
    const d = dlg.current;
    if (!d) return;
    const h = d.getBoundingClientRect().height || 280;
    const a = props.anchor ?? { top: 56, bottom: 56, left: innerWidth - GAP, right: innerWidth - GAP };
    setPos(placeAt(a, h, innerWidth, innerHeight));
  }, [props.anchor, saved, similar.length, undone]);

  // Meldung am Ort schließt sich von selbst, solange nichts mehr bedient wird
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(props.onClose, SAVED_MS);
    return () => clearTimeout(t);
  }, [saved, eased, undone]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = (then: 'close' | 'elaborate') => {
    const t = title.trim();
    if (!t) {
      setMiss(true);
      titleRef.current?.focus();
      return;
    }
    const id = props.onSave({ kind, title: t });
    if (!id) return;
    if (then === 'elaborate' && props.onElaborate) return props.onElaborate(id);
    setSaved({ id, title: t });
    // Fokus auf die Meldung, damit Rückgängig und 1–5 per Tastatur erreichbar sind
    setTimeout(() => dlg.current?.querySelector<HTMLElement>('.fbq__saved button')?.focus(), 0);
  };

  const onKey = (e: KeyboardEvent) => {
    if (saved) return;
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      save('elaborate');
    } else if (e.key === 'Enter' && e.target === titleRef.current) {
      e.preventDefault();
      save('close');
    }
  };

  const style = (pos ? { top: pos.top, left: pos.left, width: W } : { visibility: 'hidden', width: W }) as CSSProperties;

  return (
    <dialog
      ref={dlg}
      className="fbq"
      style={style}
      aria-labelledby="fbq-head"
      aria-describedby={saved ? undefined : 'fbq-intro'}
      onClose={props.onClose}
      onKeyDown={onKey}
      onClick={(e) => {
        if (e.target === dlg.current) props.onClose(); // Klick daneben (Hintergrund)
      }}
    >
      <header className="fbq__head">
        <Icon name="feedback" size={16} />
        <h2 id="fbq-head">{T.head}</h2>
        <button type="button" className="help__x" onClick={props.onClose} title="Schließen (Esc)" aria-label={T.close}>
          ×
        </button>
      </header>
      {!saved ? (
        <div className="fbq__body">
          <p id="fbq-intro" className="fbq__intro">{T.intro}</p>
          <div className="fbq__kind">
            <span className="fbq__label" id="fbq-kind">{T.kindLabel}</span>
            <ModeWheel
              label={T.kindLabel}
              options={FEEDBACK_KINDS.map((k) => ({ id: k, name: T.kinds[k], hint: T.kindHints[k] }))}
              value={kind}
              onChange={(id) => setKind(id as FeedbackKind)}
            />
            <span className="fbq__hint">{T.kindHints[kind]}</span>
          </div>
          <label className="fbq__title">
            <span className="fbq__label">{T.titleLabel}</span>
            <input
              ref={titleRef}
              type="text"
              value={title}
              maxLength={200}
              placeholder={T.titlePh[kind]}
              aria-invalid={miss && !title.trim() ? true : undefined}
              aria-describedby={miss && !title.trim() ? 'fbq-miss' : undefined}
              onChange={(e) => {
                setTitle(e.target.value);
                if (e.target.value.trim()) setMiss(false);
              }}
            />
          </label>
          {miss && !title.trim() && (
            <p id="fbq-miss" className="fbq__miss" role="alert">
              {T.titleMissing}
            </p>
          )}
          {similar.length > 0 && (
            <div className="fbq__similar" role="status">
              <span>{T.similar}</span>
              <ul>
                {similar.map((f) => (
                  <li key={f.id}>
                    {T.kinds[f.kind]}: „{f.title}“
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="fbq__place">
            <span className="fbq__label">{T.placeLabel}</span>
            <span className="fbq__where">{placeText(props.place, props.env)}</span>
            <span className="fbq__privacy">{T.placePrivacy}</span>
          </div>
          <div className="fbq__foot">
            <button type="button" className="fbq__cancel" onClick={props.onClose}>
              {T.cancel}
            </button>
            {props.onElaborate && (
              <button type="button" onClick={() => save('elaborate')} title={T.elaborateTip}>
                {T.elaborate}
              </button>
            )}
            <button type="button" className="fbq__save" onClick={() => save('close')} title={T.saveTip}>
              {T.save}
            </button>
          </div>
        </div>
      ) : (
        <div className="fbq__body fbq__saved" role="status" aria-live="polite">
          {undone ? (
            <p>{T.undone}</p>
          ) : (
            <>
              <p>
                <Icon name="check" size={14} /> {T.saved(saved.title)}{' '}
                <button
                  type="button"
                  className="fbq__undo"
                  onClick={() => {
                    props.onUndo(saved.id);
                    setUndone(true);
                  }}
                >
                  {T.undo}
                </button>
              </p>
              {props.askEase && !eased && (
                <fieldset className="fbq__ease">
                  <legend>{T.easeQ}</legend>
                  <div className="fbq__easeRow">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        aria-label={`${n} von 5`}
                        onClick={() => {
                          props.onEase(saved.id, n);
                          setEased(true);
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <span className="fbq__hint">{T.easeScale}</span>
                  <button
                    type="button"
                    className="fbq__never"
                    onClick={() => {
                      props.onNeverAsk();
                      setEased(true);
                    }}
                  >
                    {T.easeNever}
                  </button>
                </fieldset>
              )}
              {eased && <p>{T.easeThanks}</p>}
            </>
          )}
        </div>
      )}
    </dialog>
  );
}

/** FB5/FB6: Ort aus der Oberfläche – Namen der umgebenden Fenster/Bereiche (aria-label), keine Inhalte. */
export function domPlace(from: Element | null): { view?: string; menu?: string } {
  const labels: string[] = [];
  let menu: string | undefined;
  for (let el: Element | null = from; el && el !== document.body; el = el.parentElement) {
    const role = el.getAttribute('role');
    if (!menu && (role === 'menu' || el.classList.contains('menu'))) menu = el.getAttribute('aria-label') ?? undefined;
    const isArea = el.tagName === 'DIALOG' || el.tagName === 'SECTION' || el.tagName === 'ASIDE' || role === 'dialog' || role === 'region' || role === 'tabpanel';
    const name = isArea ? el.getAttribute('aria-label') ?? labelOf(el) : null;
    if (name && !labels.includes(name)) labels.unshift(name.slice(0, 60));
  }
  if (!menu) {
    const open = document.querySelector('[role="menu"]:not([hidden])');
    if (open) menu = open.getAttribute('aria-label') ?? undefined;
  }
  return { ...(labels.length ? { view: labels.slice(-2).join(' › ') } : {}), ...(menu ? { menu } : {}) };
}

function labelOf(el: Element): string | null {
  const by = el.getAttribute('aria-labelledby');
  if (!by) return null;
  const t = by
    .split(/\s+/)
    .map((id) => document.getElementById(id)?.textContent?.trim())
    .filter(Boolean)
    .join(' ');
  return t || null;
}

/** Ansicht im Hauptbereich: erster sichtbarer Bereich, benannt über aria-label bzw. seine erste Überschrift. */
export function mainView(main: Element | null): string | undefined {
  if (!main) return undefined;
  for (const el of main.querySelectorAll('[role="region"], section, aside')) {
    const r = el.getBoundingClientRect();
    if (r.width < 40 || r.height < 40 || getComputedStyle(el).visibility === 'hidden') continue;
    const name = el.getAttribute('aria-label') ?? el.querySelector('h1, h2, h3')?.textContent?.trim();
    if (name) return name.slice(0, 60);
  }
  return undefined;
}
