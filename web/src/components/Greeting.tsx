/**
 * F-179: Begrüßung beim Start – „Guten Abend, Enrico“ mit „Zuletzt offen“ zum Weitermachen.
 * Nimmt den Fokus nicht weg (kein Dialog), wird von App höflich angesagt (NF-03). Verschwindet nach
 * einer Weile von selbst, aber nicht, solange Maus oder Fokus darauf liegen; × schließt sofort.
 */
import { Icon } from './Icon';
import { useEffect, useRef, useState } from 'react';
import type { Profile } from '../workspace/profile';
import { Avatar } from './Profile';

interface Props {
  profile: Profile;
  greeting: string;
  /** zuletzt offenes Portal: Name und Source */
  last: { name: string; source: string } | null;
  onContinue: () => void;
  onProfile: () => void;
  onClose: () => void;
}

const STAY_MS = 15000;

export function Greeting({ profile, greeting, last, onContinue, onProfile, onClose }: Props) {
  const box = useRef<HTMLElement>(null);
  const [hold, setHold] = useState(false);
  useEffect(() => {
    if (hold) return;
    const t = window.setTimeout(onClose, STAY_MS);
    return () => window.clearTimeout(t);
  }, [hold, onClose]);

  return (
    <section
      ref={box}
      className="greeting"
      aria-labelledby="greeting-title"
      onPointerEnter={() => setHold(true)}
      onPointerLeave={() => setHold(box.current?.contains(document.activeElement) ?? false)}
      onFocus={() => setHold(true)}
      onBlur={(e) => !box.current?.contains(e.relatedTarget as Node) && setHold(false)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <Avatar profile={profile} />
      <div className="greeting__main">
        <h2 id="greeting-title" className="greeting__title">
          {greeting}
        </h2>
        {last ? (
          <p className="greeting__last">
            Zuletzt offen: <strong>{last.name}</strong>
            {last.source && <span className="greeting__src"> – {last.source}</span>}
          </p>
        ) : (
          <p className="greeting__last">Schön, dass du da bist.</p>
        )}
        <div className="greeting__actions">
          {last && (
            <button type="button" className="greeting__go" onClick={onContinue}>
              Weitermachen
            </button>
          )}
          <button type="button" onClick={onProfile}>
            {profile.name ? 'Profil …' : 'Profil anlegen …'}
          </button>
        </div>
      </div>
      <button type="button" className="greeting__x" onClick={onClose} title="Begrüßung schließen (Esc)" aria-label="Begrüßung schließen">
        <Icon name="close" size={14} />
      </button>
    </section>
  );
}
