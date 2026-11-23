/**
 * F-179: Begrüßung beim Start – „Guten Abend, Enrico“ mit „Zuletzt offen“ zum Weitermachen.
 * Nimmt den Fokus nicht weg (kein Dialog), wird von App höflich angesagt (NF-03). Verschwindet nach
 * einer Weile von selbst, aber nicht, solange Maus oder Fokus darauf liegen; × schließt sofort.
 */
import { Icon } from './Icon';
import { useEffect, useId, useRef, useState } from 'react';
import type { Profile } from '../workspace/profile';
import type { RecentDesk } from '../workspace/recent';
import type { Bookmark } from '../workspace/types';
import { hostOf } from '../workspace/workspace';
import { GREET_TEXT as G } from '../workspace/terms';
import { Avatar } from './Profile';
import { SiteIcon, useDisplay } from './SiteIcon';

/** F-193: Inhalt von „Zuletzt benutzt“ – wird erst beim Aufklappen ermittelt. */
export interface GreetRecent {
  desks: RecentDesk[];
  sources: Bookmark[];
  /** true = kein Verlauf, rechts stehen die neuesten Sources der Library. */
  sourcesNew: boolean;
}

interface Props {
  profile: Profile;
  greeting: string;
  /** zuletzt offenes Portal: Name und Source */
  last: { name: string; source: string } | null;
  onContinue: () => void;
  recent: () => GreetRecent;
  onPortal: (win: string, id: string) => void;
  onSource: (b: Bookmark) => void;
  onProfile: () => void;
  onClose: () => void;
}

const STAY_MS = 15000;

export function Greeting({ profile, greeting, last, onContinue, recent, onPortal, onSource, onProfile, onClose }: Props) {
  const box = useRef<HTMLElement>(null);
  const [hold, setHold] = useState(false);
  // F-193: erst klein; „Mehr …“ klappt die Spalten auf (dann bleibt die Begrüßung stehen)
  const [open, setOpen] = useState<GreetRecent | null>(null);
  const listId = useId();
  const display = useDisplay();
  useEffect(() => {
    if (hold || open) return;
    const t = window.setTimeout(onClose, STAY_MS);
    return () => window.clearTimeout(t);
  }, [hold, open, onClose]);

  return (
    <section
      ref={box}
      className={open ? 'greeting is-open' : 'greeting'}
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
          <button type="button" aria-expanded={!!open} aria-controls={listId} title={G.moreTitle} onClick={() => setOpen(open ? null : recent())}>
            {open ? G.less : G.more}
          </button>
          <button type="button" onClick={onProfile}>
            {profile.name ? 'Profil …' : 'Profil anlegen …'}
          </button>
        </div>
        {open && (
          <div id={listId} className="greeting__recent" role="group" aria-label={G.title}>
            <section className="greeting__col" aria-labelledby={`${listId}-d`}>
              <h3 id={`${listId}-d`} className="greeting__head">
                <Icon name="desk" size={14} /> {G.desks}
              </h3>
              <p className="greeting__note">{G.desksNote}</p>
              {open.desks.length === 0 && <p className="greeting__note">{G.noDesks}</p>}
              {open.desks.map((d) => (
                <div key={d.win} className="greeting__desk">
                  <h4 className="greeting__deskname">
                    {d.title}
                    {d.here && <span className="greeting__tag"> · {G.here}</span>}
                  </h4>
                  <ul className="greeting__slots">
                    {d.slots.map((sl) => (
                      <li key={sl.id}>
                        <span className="greeting__slot">
                          <Icon name="slot" size={12} /> {sl.title}
                        </span>
                        <ul className="greeting__portals">
                          {sl.portals.map((p) => (
                            <li key={p.id}>
                              <button type="button" className="greeting__item" onClick={() => onPortal(d.win, p.id)} aria-label={`${p.name} – ${sl.title}, ${d.title}${p.front ? `, ${G.front}` : ''}`}>
                                <Icon name="portal" size={12} /> {p.name}
                              </button>
                            </li>
                          ))}
                          {sl.more > 0 && <li className="greeting__note">{G.moreIn(sl.more)}</li>}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
            <section className="greeting__col" aria-labelledby={`${listId}-s`}>
              <h3 id={`${listId}-s`} className="greeting__head">
                <Icon name="library" size={14} /> {open.sourcesNew ? G.sourcesNew : G.sources}
              </h3>
              <p className="greeting__note">{G.sourcesNote}</p>
              {open.sources.length === 0 && <p className="greeting__note">{G.noSources}</p>}
              <ul className="greeting__portals">
                {open.sources.map((b) => (
                  <li key={b.id}>
                    <button type="button" className="greeting__item" onClick={() => onSource(b)} title={b.url}>
                      <SiteIcon url={b.url} on={display.favicons} /> <span className="greeting__itemtext">{b.title || hostOf(b.url)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>
      <button type="button" className="greeting__x" onClick={onClose} title="Begrüßung schließen (Esc)" aria-label="Begrüßung schließen">
        <Icon name="close" size={14} />
      </button>
    </section>
  );
}
