/**
 * F-179: Dialog „Profil“ – Name, Kennfarbe und Begrüßung, nur im Browser gespeichert (kein Konto).
 * Änderungen gelten sofort als Vorschau; „Zurücksetzen“ und „Fertig“ unten (F-191). Native <dialog> wie die Hilfe (NF-03):
 * Fokus im Namensfeld, Kennfarben als Radiogruppe (Pfeiltasten), Esc schließt.
 * F-205: Begrüßung wählbar – Wahl mit Vorschau, gespeichert mit „Übernehmen“ (oder „Fertig“, damit nichts verloren geht).
 */
import { Icon } from './Icon';
import { ModeWheel } from './ModeWheel';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { NAME_MAX, PROFILE_COLORS, type Profile, initialsOf } from '../workspace/profile';
import { TERMS, WELCOME_TEXT as W } from '../workspace/terms';
import { CUSTOM_MAX, INTERNATIONAL, POOL_ALL, QUOTES, REGIONAL, WELCOME_DEFAULT, type QuoteForm, type Welcome, type WelcomeMode, hoursText, welcomeText } from '../workspace/welcome';
import { flash } from '../workspace/flash';
import { DialogFoot } from './DialogFoot';
import { sameSnap } from '../workspace/reset';

interface Props {
  profile: Profile;
  onChange: (change: Partial<Profile>) => void;
  /** F-191: nach „Zurücksetzen“ (Ansage, NF-03) */
  onRestored: () => void;
  onClose: () => void;
}

/** Kennzeichen mit Initialen (ohne Namen: Personen-Zeichen). */
export function Avatar({ profile, size = 36 }: { profile: Profile; size?: number }) {
  const ini = initialsOf(profile.name);
  return (
    // F-184: Kennfarbe im Stil des Logos (Verlauf, Metallkante, Glanz) – siehe .kenn in App.css
    <span className="avatar kenn" aria-hidden="true" style={{ '--c': PROFILE_COLORS[profile.color]?.hex, width: size, height: size, fontSize: Math.round(size * 0.42) } as CSSProperties}>
      {ini || (
        <svg viewBox="0 0 24 24" width={size * 0.55} height={size * 0.55} fill="currentColor">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" />
        </svg>
      )}
    </span>
  );
}

export function ProfileDialog({ profile, onChange, onRestored, onClose }: Props) {
  const dlg = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(profile.name);
  // F-191: Stand beim Öffnen – „Zurücksetzen“ nur, wenn sich seitdem etwas geändert hat
  const [start] = useState(profile);
  // F-205: Begrüßung als Entwurf – erst „Übernehmen“ (oder Fertig/Esc/×) speichert sie
  const saved = profile.welcome ?? WELCOME_DEFAULT;
  const [draft, setDraft] = useState<Welcome>(saved);
  const pending = !sameSnap(draft, saved);
  const changed = !sameSnap(start, profile) || pending;
  const finish = () => {
    if (pending) onChange({ welcome: draft });
    onClose();
  };
  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    const back = document.activeElement as HTMLElement | null;
    if (!d.open) d.showModal();
    d.querySelector<HTMLInputElement>('input')?.focus();
    return () => (back?.isConnected ? back : document.querySelector<HTMLElement>('button[aria-label="Einstellungen"]'))?.focus?.();
  }, []);

  return (
    <dialog
      ref={dlg}
      className="help profile"
      aria-labelledby="profile-title"
      aria-describedby="profile-intro"
      onClose={finish}
      onCancel={(e) => {
        e.preventDefault();
        finish();
      }}
      onClick={(e) => e.target === dlg.current && finish()}
    >
      <header className="help__head">
        <h2 id="profile-title">Profil</h2>
        <button type="button" className="help__x" onClick={finish} title="Schließen (Esc)" aria-label="Profil schließen">
          <Icon name="close" size={14} />
        </button>
      </header>
      <div className="help__body profile__body">
        <p id="profile-intro" className="profile__intro">
          {TERMS.profile.replace(/^[^=]*=\s*/, '').replace(/, nur in diesem Browser gespeichert \(kein Konto, kein Server\)/, '').replace(/^./, (c) => c.toUpperCase())}.
        </p>
        <p className="profile__local">
          <Icon name="catLock" size={14} /> {W.local}
        </p>
        <div className="profile__who">
          <Avatar profile={{ ...profile, name }} size={48} />
          <label className="profile__name">
            <span>Name</span>
            <input
              type="text"
              value={name}
              maxLength={NAME_MAX}
              autoComplete="given-name"
              placeholder="z. B. Enrico"
              onChange={(e) => {
                setName(e.target.value);
                onChange({ name: e.target.value });
              }}
            />
          </label>
        </div>
        <fieldset className="profile__colors">
          <legend>Kennfarbe</legend>
          {PROFILE_COLORS.map((c, i) => (
            <label key={c.hex} className="profile__color" title={c.name}>
              <input type="radio" name="profile-color" checked={profile.color === i} onChange={() => onChange({ color: i })} aria-label={c.name} />
              <span className="kenn" style={{ '--c': c.hex } as CSSProperties} aria-hidden="true" />
            </label>
          ))}
        </fieldset>
        <label className="profile__greet">
          <input type="checkbox" checked={profile.greet} onChange={(e) => onChange({ greet: e.target.checked })} />
          Beim Start begrüßen und zeigen, was zuletzt offen war
        </label>
        <WelcomePick
          draft={draft}
          setDraft={setDraft}
          name={name}
          pending={pending}
          onApply={() => {
            if (pending) onChange({ welcome: draft });
            flash({ text: (pending ? W.applied : W.unchanged)(welcomeText(draft, new Date(), name)) });
          }}
        />
      </div>
      <DialogFoot
        changed={changed}
        onReset={() => {
          onChange({ ...start, welcome: start.welcome ?? WELCOME_DEFAULT });
          setDraft(start.welcome ?? WELCOME_DEFAULT);
          setName(start.name);
          onRestored();
          dlg.current?.querySelector<HTMLButtonElement>('.dialog-foot__done')?.focus();
        }}
        onDone={finish}
      />
    </dialog>
  );
}

const MODES: WelcomeMode[] = ['standard', 'regional', 'quote', 'random', 'custom'];
const FORMS: QuoteForm[] = ['name', 'orig', 'de'];

/** F-205: Wahl der Begrüßung – Art (Radiogruppe), passende Auswahl, Vorschau und „Übernehmen“. */
function WelcomePick({ draft, setDraft, name, pending, onApply }: { draft: Welcome; setDraft: (w: Welcome) => void; name: string; pending: boolean; onApply: () => void }) {
  const set = (c: Partial<Welcome>) => setDraft({ ...draft, ...c });
  // Zufall „bei jedem Öffnen“: in der Vorschau ein fester Wurf, solange der Dialog offen ist
  const [seed] = useState(Math.random);
  const preview = welcomeText(draft, new Date(), name, seed);
  const togglePool = (key: string, on: boolean) => set({ pool: on ? [...draft.pool, key] : draft.pool.filter((k) => k !== key) });
  const greetOption = (g: (typeof REGIONAL)[number]) => (
    <option key={g.id} value={g.id}>
      {g.label} – {g.where}
      {g.hours ? ` (${W.hours(hoursText(g.hours))})` : ''}
    </option>
  );
  return (
    <fieldset className="welcome">
      <legend>{W.legend}</legend>
      {/* V84 (F-216, U6): Art der Begrüßung als Umschalt-Rad; Erklärung der gewählten Art steht darunter */}
      <div className="welcome__wheel">
        <span className="welcome__label" aria-hidden="true">{W.legend}</span>
        <ModeWheel
          label={W.legend}
          value={draft.mode}
          onChange={(m) => set({ mode: m as WelcomeMode })}
          options={MODES.map((m) => ({ id: m, name: W.modes[m], hint: W.modeHints[m] }))}
        />
      </div>
      <p className="welcome__hint">{W.modeHints[draft.mode]}</p>

      {draft.mode === 'regional' && (
        <label className="welcome__field">
          <span>{W.greet}</span>
          <select value={draft.greet} onChange={(e) => set({ greet: e.target.value })}>
            <optgroup label={W.groupRegional}>{REGIONAL.map(greetOption)}</optgroup>
            <optgroup label={W.groupInternational}>{INTERNATIONAL.map(greetOption)}</optgroup>
          </select>
        </label>
      )}

      {draft.mode === 'quote' && (
        <label className="welcome__field">
          <span>{W.quote}</span>
          <select value={draft.quote} onChange={(e) => set({ quote: e.target.value })}>
            {QUOTES.map((q) => (
              <option key={q.id} value={q.id}>
                {q.orig} – {q.from}
                {q.hours ? ` (${W.hours(hoursText(q.hours))})` : ''}
              </option>
            ))}
          </select>
        </label>
      )}

      {(draft.mode === 'quote' || (draft.mode === 'random' && draft.pool.some((k) => k.startsWith('q:')))) && (
        <div className="welcome__wheel">
          <span className="welcome__label" aria-hidden="true">{W.form}</span>
          <ModeWheel label={W.form} value={draft.form} onChange={(f) => set({ form: f as QuoteForm })} options={FORMS.map((f) => ({ id: f, name: W.forms[f] }))} />
        </div>
      )}

      {draft.mode === 'random' && (
        <>
          <div className="welcome__wheel">
            <span className="welcome__label" aria-hidden="true">{W.every}</span>
            <ModeWheel
              label={W.every}
              value={draft.every}
              onChange={(v) => set({ every: v as typeof draft.every })}
              options={[
                { id: 'day', name: W.everyDay },
                { id: 'open', name: W.everyOpen },
              ]}
            />
          </div>
          <fieldset className="welcome__pool">
            <legend>
              {W.pool} · {W.poolCount(draft.pool.length)}
            </legend>
            {(['regional', 'international', 'quote'] as const).map((grp) => (
              <div key={grp} className="welcome__group" role="group" aria-label={grp === 'regional' ? W.groupRegional : grp === 'international' ? W.groupInternational : W.modes.quote}>
                <span className="welcome__label" aria-hidden="true">
                  {grp === 'regional' ? W.groupRegional : grp === 'international' ? W.groupInternational : W.modes.quote}
                </span>
                {POOL_ALL.filter((p) => p.group === grp).map((p) => (
                  <label key={p.key}>
                    <input type="checkbox" checked={draft.pool.includes(p.key)} onChange={(e) => togglePool(p.key, e.target.checked)} />
                    {p.label}
                  </label>
                ))}
              </div>
            ))}
            {!draft.pool.length && <p className="welcome__hint">{W.poolEmpty}</p>}
          </fieldset>
        </>
      )}

      {draft.mode === 'custom' && (
        <label className="welcome__field">
          <span>{W.custom}</span>
          <input type="text" value={draft.custom} maxLength={CUSTOM_MAX} placeholder="Ahoi, {Name}!" aria-describedby="welcome-custom-hint" onChange={(e) => set({ custom: e.target.value })} />
          <span id="welcome-custom-hint" className="welcome__hint">
            {W.customHint}
          </span>
        </label>
      )}

      <div className="welcome__preview">
        <span className="welcome__label">{W.preview}</span>
        <output aria-live="polite">{preview}</output>
      </div>
      <div className="welcome__apply">
        {pending && <span className="welcome__hint">{W.pending}</span>}
        <button type="button" className={pending ? 'welcome__go is-pending' : 'welcome__go'} onClick={onApply} title={W.applyTitle}>
          {W.apply}
        </button>
      </div>
    </fieldset>
  );
}
