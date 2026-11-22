/**
 * F-179: Dialog „Profil“ – Name, Kennfarbe und Begrüßung, nur im Browser gespeichert (kein Konto).
 * Änderungen gelten sofort (wie „Design anpassen“). Native <dialog> wie die Hilfe (NF-03):
 * Fokus im Namensfeld, Kennfarben als Radiogruppe (Pfeiltasten), Esc schließt.
 */
import { Icon } from './Icon';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { NAME_MAX, PROFILE_COLORS, type Profile, initialsOf } from '../workspace/profile';
import { TERMS } from '../workspace/terms';

interface Props {
  profile: Profile;
  onChange: (change: Partial<Profile>) => void;
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

export function ProfileDialog({ profile, onChange, onClose }: Props) {
  const dlg = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(profile.name);
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
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === dlg.current && onClose()}
    >
      <header className="help__head">
        <h2 id="profile-title">Profil</h2>
        <button type="button" className="help__x" onClick={onClose} title="Schließen (Esc)" aria-label="Profil schließen">
          <Icon name="close" size={14} />
        </button>
      </header>
      <div className="help__body profile__body">
        <p id="profile-intro" className="profile__intro">
          {TERMS.profile.replace(/^[^=]*=\s*/, '').replace(/^./, (c) => c.toUpperCase())}. Änderungen gelten sofort.
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
        <div className="focusrule__foot">
          <button type="button" onClick={onClose}>
            Fertig
          </button>
        </div>
      </div>
    </dialog>
  );
}
