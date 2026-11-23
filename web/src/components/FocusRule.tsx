/**
 * F-29 Rest: Dialog „Fokusanzeige anpassen“ – Grenzen für Grün, Gelb, Orange und das Gewicht
 * weiterer Tabs. Ein Feld gilt beim Verlassen oder mit Enter; unpassende Werte werden geordnet
 * (jede Grenze über der vorigen) und das wird angesagt. Native <dialog> wie die Hilfe (NF-03).
 */
import { Icon } from './Icon';
import { useEffect, useRef, useState } from 'react';
import { FOCUS_MAX, FOCUS_RULE, TAB_WEIGHTS, type FocusRule as Rule, fixRule, focusLevel, colorOfLevel, pointsText, ruleText } from '../workspace/focus';
import { DIALOG_TEXT, TERMS } from '../workspace/terms';
import { DialogFoot } from './DialogFoot';
import { sameSnap } from '../workspace/reset';
import { loadColor } from '../workspace/workspace';

interface Props {
  rule: Rule;
  /** Punkte gerade (Gesamtfokus), für die Vorschau. */
  points: number;
  onChange: (r: Partial<Rule> | null) => void;
  onClose: () => void;
}

type Edge = 'greenMax' | 'yellowMax' | 'orangeMax';
const EDGES: { key: Edge; label: string; level: number }[] = [
  { key: 'greenMax', label: 'Grün bis', level: 4 },
  { key: 'yellowMax', label: 'Gelb bis', level: 6 },
  { key: 'orangeMax', label: 'Orange bis', level: 7 },
];

export function FocusRule({ rule, points, onChange, onClose }: Props) {
  const dlg = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<Record<Edge, string>>({ greenMax: String(rule.greenMax), yellowMax: String(rule.yellowMax), orangeMax: String(rule.orangeMax) });
  const [said, setSaid] = useState('');
  // F-191: Stand beim Öffnen – „Zurücksetzen“ nur, wenn sich seitdem etwas geändert hat
  const [start] = useState(rule);
  const changed = !sameSnap(start, rule);
  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    const back = document.activeElement as HTMLElement | null;
    if (!d.open) d.showModal();
    d.querySelector<HTMLInputElement>('input')?.focus();
    return () => (back?.isConnected ? back : document.querySelector<HTMLElement>('button[aria-label="Einstellungen"]'))?.focus?.();
  }, []);
  // Regel von außen (z. B. Voreinstellung) → Felder nachziehen
  useEffect(() => setDraft({ greenMax: String(rule.greenMax), yellowMax: String(rule.yellowMax), orangeMax: String(rule.orangeMax) }), [rule.greenMax, rule.yellowMax, rule.orangeMax]);

  const level = focusLevel(points, rule);
  const now = `Jetzt: ${pointsText(points)} Punkte – ${colorOfLevel(level)}.`;

  const apply = (key: Edge) => {
    const n = Number(draft[key].replace(',', '.'));
    if (!Number.isFinite(n) || draft[key].trim() === '') {
      setDraft((d) => ({ ...d, [key]: String(rule[key]) }));
      return setSaid('Bitte eine Zahl eingeben – der alte Wert gilt weiter.');
    }
    if (Math.round(n) === rule[key]) return;
    const next = fixRule({ ...rule, [key]: n });
    onChange({ [key]: n });
    const moved = EDGES.filter((e) => (e.key === key ? next[e.key] !== Math.round(n) : next[e.key] !== rule[e.key]));
    setDraft({ greenMax: String(next.greenMax), yellowMax: String(next.yellowMax), orangeMax: String(next.orangeMax) });
    setSaid(`Neu: ${ruleText(next)}.${moved.length ? ` ${moved.map((e) => e.label.replace(' bis', '')).join(' und ')} angepasst, damit jede Grenze über der vorigen liegt.` : ''}`);
  };

  return (
    <dialog
      ref={dlg}
      className="help focusrule"
      aria-labelledby="focusrule-title"
      aria-describedby="focusrule-intro"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === dlg.current && onClose()}
    >
      <header className="help__head">
        <h2 id="focusrule-title">Fokusanzeige anpassen</h2>
        <button type="button" className="help__x" onClick={onClose} title="Schließen (Esc)" aria-label="Fokusanzeige anpassen schließen">
          <Icon name="close" size={14} />
        </button>
      </header>
      <p className="help__intro" id="focusrule-intro">
        {TERMS.focus}. Jedes Portal zählt 1 Punkt, jeder weitere Tab so viel wie unten gewählt. Die Grenzen gelten für alle Desks und für den Fokus je Desk.
      </p>
      <div className="help__body focusrule__body">
        {EDGES.map((e) => (
          <label key={e.key} className="focusrule__row">
            <span className="focusrule__dot" style={{ background: loadColor(e.level) }} aria-hidden="true" />
            <span className="focusrule__label">{e.label}</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={FOCUS_MAX}
              step={1}
              value={draft[e.key]}
              onChange={(ev) => setDraft((d) => ({ ...d, [e.key]: ev.target.value }))}
              onBlur={() => apply(e.key)}
              onKeyDown={(ev) => ev.key === 'Enter' && apply(e.key)}
            />
            <span>Punkte</span>
          </label>
        ))}
        <p className="focusrule__row">
          <span className="focusrule__dot" style={{ background: loadColor(9) }} aria-hidden="true" />
          <span className="focusrule__label">Rot</span>
          <span>darüber</span>
        </p>
        <label className="focusrule__row">
          <span className="focusrule__dot" aria-hidden="true" />
          <span className="focusrule__label">Weiterer Tab zählt</span>
          <select value={rule.tabWeight} onChange={(ev) => onChange({ tabWeight: Number(ev.target.value) })}>
            {TAB_WEIGHTS.map((w) => (
              <option key={w} value={w}>
                {w === 0 ? '0 (Tabs zählen nicht)' : `${pointsText(w)} Punkte`}
              </option>
            ))}
          </select>
        </label>
        <p className="focusrule__now" style={{ borderColor: loadColor(level) }}>
          {now}
        </p>
        <p className="focusrule__default">
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setSaid(`Voreinstellung: ${ruleText(FOCUS_RULE)}.`);
            }}
          >
            Voreinstellung
          </button>
        </p>
      </div>
      <DialogFoot
        changed={changed}
        onReset={() => {
          onChange(sameSnap(start, FOCUS_RULE) ? null : start);
          setSaid(DIALOG_TEXT.resetDone);
          dlg.current?.querySelector<HTMLButtonElement>('.dialog-foot__done')?.focus();
        }}
        onDone={onClose}
      />
      <span className="sr-only" role="status" aria-live="polite">
        {said}
      </span>
    </dialog>
  );
}
