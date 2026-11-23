/**
 * F-147: Farbpipette als Dialog. Nimmt über die EyeDropper-Schnittstelle (Chrome, Edge) eine Farbe
 * vom ganzen Bildschirm auf – auch aus eingebetteten Seiten –, kopiert sie als HEX und merkt sie.
 * Ohne EyeDropper: Farbwahl des Systems (<input type="color">) und Eingabe von Hand.
 * Während der Aufnahme ist der Dialog samt Abdunkelung unsichtbar, damit die Farbe echt ist.
 * Tastatur (NF-03): alles sind Knöpfe; jede Aufnahme und jedes Kopieren wird angesagt.
 */
import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { PICKER_TEXT as P } from '../workspace/terms';
import { colorName, loadColors, normalizeHex, pushColor, rgbText, saveColors } from '../workspace/picker';

interface EyeDropperLike {
  open: () => Promise<{ sRGBHex: string }>;
}
const dropper = (): (new () => EyeDropperLike) | undefined => (window as unknown as { EyeDropper?: new () => EyeDropperLike }).EyeDropper;

export function ColorPicker({ onClose }: { onClose: () => void }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const sys = useRef<HTMLInputElement>(null);
  const [colors, setColors] = useState<string[]>(loadColors);
  const [picking, setPicking] = useState(false);
  const [said, setSaid] = useState('');
  const [typed, setTyped] = useState('');
  const [bad, setBad] = useState(false);
  const can = !!dropper();
  // Fokus beim Öffnen merken (StrictMode: nicht im Effekt, siehe V39)
  const [back] = useState(() => document.activeElement as HTMLElement | null);

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (!d.open) d.showModal();
    d.querySelector<HTMLButtonElement>('.picker__pick')?.focus();
    return () => (back?.isConnected ? back : document.querySelector<HTMLElement>('button[aria-label="Einstellungen"]'))?.focus?.();
  }, [back]);

  const copy = async (v: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(v);
      return true;
    } catch {
      // zweiter Weg: verstecktes Textfeld im Dialog markieren und kopieren (ältere Browser, kein Fokus)
      const box = dlg.current;
      if (!box) return false;
      const ta = document.createElement('textarea');
      ta.value = v;
      ta.setAttribute('readonly', '');
      ta.className = 'sr-only';
      box.appendChild(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
      ta.remove();
      return ok;
    }
  };
  const add = (hex: string, copied: boolean) => {
    const next = pushColor(colors, hex);
    setColors(next);
    saveColors(next);
    setSaid(P.picked(normalizeHex(hex) ?? hex, colorName(hex), copied));
  };
  const pick = async () => {
    const Ctor = dropper();
    if (!Ctor) return;
    setPicking(true);
    // ein Bild warten, damit der Dialog wirklich weg ist
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    try {
      const { sRGBHex } = await new Ctor().open();
      const hex = normalizeHex(sRGBHex);
      if (hex) add(hex, await copy(hex));
    } catch {
      setSaid(P.cancelled);
    } finally {
      setPicking(false);
      dlg.current?.querySelector<HTMLButtonElement>('.picker__pick')?.focus();
    }
  };
  const copyValue = async (v: string) => setSaid((await copy(v)) ? P.copied(v) : P.copyFailed(v));
  const remove = (hex: string) => {
    const next = colors.filter((c) => c !== hex);
    setColors(next);
    saveColors(next);
  };
  const addTyped = () => {
    const hex = normalizeHex(typed);
    if (!hex) return setBad(true);
    setBad(false);
    setTyped('');
    add(hex, false);
  };

  return (
    <dialog
      ref={dlg}
      className={picking ? 'help picker is-picking' : 'help picker'}
      aria-labelledby="picker-title"
      aria-describedby="picker-intro"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        if (!picking) onClose();
      }}
      onClick={(e) => e.target === dlg.current && onClose()}
    >
      <header className="help__head">
        <h2 id="picker-title">
          <Icon name="pipette" className="icon icon--inline" /> {P.title}
        </h2>
        <button type="button" className="help__x" onClick={onClose} title="Schließen (Esc)" aria-label={`${P.title} schließen`}>
          <Icon name="close" size={14} />
        </button>
      </header>
      <p className="help__intro" id="picker-intro">
        {can ? P.intro : P.noPipette}
      </p>
      <div className="help__body picker__body">
        <div className="picker__tools">
          {can && (
            <button type="button" className="picker__pick" onClick={() => void pick()} title={P.pickTitle}>
              <Icon name="pipette" className="icon icon--inline" /> {P.pick}
            </button>
          )}
          <button type="button" className={can ? undefined : 'picker__pick'} onClick={() => sys.current?.click()} title={P.systemTitle}>
            {P.system}
          </button>
          <input
            ref={sys}
            type="color"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            defaultValue={colors[0] ?? '#3a7bd5'}
            onChange={(e) => add(e.currentTarget.value, false)}
          />
          <form
            className="picker__hex"
            onSubmit={(e) => {
              e.preventDefault();
              addTyped();
            }}
          >
            <label className="picker__hexlabel">
              <span aria-hidden="true">HEX</span>
              <span className="sr-only">{P.hex}</span>
              <input
                type="text"
                value={typed}
                placeholder="#3a7bd5"
                aria-invalid={bad || undefined}
                aria-describedby={bad ? 'picker-bad' : undefined}
                onChange={(e) => {
                  setTyped(e.target.value);
                  setBad(false);
                }}
                spellCheck={false}
                autoComplete="off"
                size={9}
              />
            </label>
            <button type="submit">{P.hexAdd}</button>
          </form>
        </div>
        {bad && (
          <p id="picker-bad" className="picker__bad">
            {P.hexBad}
          </p>
        )}
        <h3 className="picker__head">{P.recent}</h3>
        {colors.length === 0 ? (
          <p className="muted">{P.none}</p>
        ) : (
          <ul className="picker__list">
            {colors.map((c) => (
              <li key={c}>
                <span className="picker__swatch" style={{ background: c }} aria-hidden="true" />
                <span className="picker__val">
                  <code>{c.toUpperCase()}</code> <code className="muted">{rgbText(c)}</code>
                  <span className="sr-only"> ({colorName(c)})</span>
                </span>
                <button type="button" onClick={() => void copyValue(c.toUpperCase())} aria-label={`${P.copyHex}: ${c.toUpperCase()}`}>
                  HEX
                </button>
                <button type="button" onClick={() => void copyValue(rgbText(c))} aria-label={`${P.copyRgb}: ${rgbText(c)}`}>
                  RGB
                </button>
                <button type="button" className="picker__x" onClick={() => remove(c)} aria-label={`${P.remove}: ${c.toUpperCase()}`} title={P.remove}>
                  <Icon name="close" size={12} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {colors.length > 1 && (
          <button
            type="button"
            className="picker__clear"
            onClick={() => {
              setColors([]);
              saveColors([]);
              setSaid(P.cleared);
            }}
          >
            {P.clear}
          </button>
        )}
      </div>
      <span className="sr-only" role="status">
        {said}
      </span>
    </dialog>
  );
}
