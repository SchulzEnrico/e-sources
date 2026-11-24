/**
 * F-215 (V72, Variante A, Wunsch Enrico: „so intuitiv wie möglich“): zwei Chips über der Note.
 * „Wann?“ öffnet (seit V74, Wunsch Enrico) gleich die eigene Auswahl im Pad-Stil – Uhrzeit-Räder und Kalender,
 * siehe RemindPicker; die Schnellwahlen aus V72 sind entfallen, „Wo?“ wird zum Textfeld mit zuletzt benutzten Orten. Gesetzt zeigt der Chip das Ergebnis mit ✕.
 * Tastatur (NF-03): alles sind Knöpfe bzw. Felder; Esc schließt, Ansage am Ort (aria-live).
 */
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import type { NoteRemind } from '../workspace/types';
import { REMIND_TEXT as RT } from '../workspace/terms';
import { remindLabel } from '../workspace/remind';
import { RemindPicker } from './RemindPicker';
import { Icon } from './Icon';

export function RemindChips(props: {
  remind?: NoteRemind;
  place?: string;
  places: string[];
  onRemind: (r: NoteRemind | undefined) => void;
  onPlace: (p: string | undefined) => void;
}) {
  const { remind, place, places, onRemind, onPlace } = props;
  const [menu, setMenu] = useState(false);
  const [picking, setPicking] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [say, setSay] = useState('');
  const whenBtn = useRef<HTMLButtonElement>(null);
  const whereBtn = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLDivElement>(null);
  // V74: zuletzt in der Auswahl eingestellter Zeitpunkt (Klick außerhalb übernimmt ihn)
  const pending = useRef<Date | null>(null);
  const uid = useId();

  // Fokus setzt die Auswahl selbst (Stundenrad)
  // V73: Klick außerhalb schließt das Menü „Wann?“ (ohne Fokus zu verschieben)
  useEffect(() => {
    if (!menu) return;
    const out = (e: PointerEvent) => {
      const slot = box.current?.parentElement;
      if (!slot || slot.contains(e.target as Node)) return;
      // ein gewähltes Datum nicht verlieren: übernehmen wie beim Verlassen des Feldes, Fokus bleibt beim Klick
      const d = pending.current;
      if (d && d.toISOString() !== remind?.at) {
        const iso = d.toISOString();
        onRemind({ at: iso });
        setSay(RT.set(remindLabel(iso)));
      }
      pending.current = null;
      setMenu(false);
      setPicking(false);
    };
    document.addEventListener('pointerdown', out, true);
    return () => document.removeEventListener('pointerdown', out, true);
  }, [menu, remind, onRemind]);

  const setWhen = (iso: string | undefined) => {
    pending.current = null;
    setMenu(false);
    setPicking(false);
    onRemind(iso ? { at: iso } : undefined);
    setSay(iso ? RT.set(remindLabel(iso)) : RT.cleared);
    whenBtn.current?.focus();
  };
  const commitPlace = (v: string) => {
    setPlacing(false);
    const t = v.trim();
    if (t === (place ?? '')) return;
    onPlace(t || undefined);
    setSay(t ? RT.setPlace(t) : RT.clearedPlace);
  };
  const menuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    pending.current = null;
    setMenu(false);
    setPicking(false);
    whenBtn.current?.focus();
  };
  const past = remind && Date.parse(remind.at) < Date.now();

  return (
    <div className="remind" role="group" aria-label={RT.group}>
      <span className="remind__slot">
        <button
          ref={whenBtn}
          type="button"
          className={`remind__chip${remind ? ' is-set' : ''}${past ? ' is-past' : ''}`}
          aria-haspopup="true"
          aria-expanded={menu}
          title={RT.whenHint}
          onClick={() => (setMenu((m) => !m), setPicking((m) => !m))}
        >
          <Icon name="recent" size={14} />
          {remind ? `${remindLabel(remind.at)}${past ? ` · ${RT.past}` : ''}` : RT.when}
        </button>
        {remind && (
          <button type="button" className="remind__x" aria-label={RT.clearWhen} title={RT.clearWhen} onClick={() => setWhen(undefined)}>
            <Icon name="close" size={12} />
          </button>
        )}
        {menu && (
          <div className={`remind__menu${picking ? ' is-picking' : ''}`} ref={box} onKeyDown={menuKey}>
            {/* V74 (Wunsch Enrico): keine Schnellwahlen mehr – „Wann?“ öffnet gleich Uhrzeit und Kalender */}
            {picking && (
              <RemindPicker
                at={remind?.at}
                onDraft={(d) => (pending.current = d)}
                onDone={(d) => setWhen(d.toISOString())}
                onCancel={() => {
                  pending.current = null;
                  setPicking(false);
                  setMenu(false);
                  whenBtn.current?.focus();
                }}
              />
            )}
          </div>
        )}
      </span>
      <span className="remind__slot">
        {placing ? (
          <label className="remind__chip remind__chip--input">
            <Icon name="origin" size={14} />
            <span className="sr-only">{RT.placeLabel}</span>
            <input
              autoFocus
              type="text"
              list={`${uid}-places`}
              defaultValue={place ?? ''}
              placeholder={RT.where}
              onBlur={(e) => commitPlace(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.preventDefault(), commitPlace(e.currentTarget.value), whereBtn.current?.focus());
                if (e.key === 'Escape') (e.preventDefault(), e.stopPropagation(), setPlacing(false));
              }}
            />
            <datalist id={`${uid}-places`}>
              {places.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </label>
        ) : (
          <button ref={whereBtn} type="button" className={`remind__chip${place ? ' is-set' : ''}`} title={RT.whereHint} onClick={() => setPlacing(true)}>
            <Icon name="origin" size={14} />
            {place || RT.where}
          </button>
        )}
        {place && !placing && (
          <button type="button" className="remind__x" aria-label={RT.clearWhere} title={RT.clearWhere} onClick={() => commitPlace('')}>
            <Icon name="close" size={12} />
          </button>
        )}
      </span>
      <span className="sr-only" aria-live="polite">
        {say}
      </span>
    </div>
  );
}
