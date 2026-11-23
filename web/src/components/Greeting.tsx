/**
 * F-179: Begrüßung beim Start – „Guten Abend, Enrico“ mit „Zuletzt offen“ zum Weitermachen.
 * Nimmt den Fokus nicht weg (kein Dialog), wird von App höflich angesagt (NF-03). Verschwindet nach
 * einer Weile von selbst, aber nicht, solange Maus oder Fokus darauf liegen; × schließt sofort.
 * F-195: Ein Ring um das Kennzeichen nimmt dabei ab; sein Ablauf (CSS-Animation) ist der Zeitgeber
 * und hält mit an. So läuft die Zeit auch, wenn App oft neu zeichnet (vorher startete der Zeitgeber
 * bei jedem Neuzeichnen neu und lief nie ab).
 */
import { Icon } from './Icon';
import { type CSSProperties, useEffect, useId, useRef, useState } from 'react';
import type { Profile } from '../workspace/profile';
import type { RecentItem, RecentLists } from '../workspace/recent';
import type { Bookmark } from '../workspace/types';
import { hostOf } from '../workspace/workspace';
import { GREET_TEXT as G, WELCOME_TEXT } from '../workspace/terms';
import { Avatar } from './Profile';
import { SiteIcon, useDisplay } from './SiteIcon';

/** F-193: Inhalt von „Zuletzt benutzt“ – wird erst beim Aufklappen ermittelt. */
export interface GreetRecent {
  lists: RecentLists;
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

const STAY_MS = 5000;

/** Pfad einer Adresse ohne Domain, z. B. „/docs/start“ – leer, wenn nur „/“. */
function pathOf(url: string): string {
  try {
    const u = new URL(url);
    const p = decodeURIComponent(u.pathname + u.search).replace(/\/$/, '');
    return p;
  } catch {
    return '';
  }
}

export function Greeting({ profile, greeting, last, onContinue, recent, onPortal, onSource, onProfile, onClose }: Props) {
  const box = useRef<HTMLElement>(null);
  const [hold, setHold] = useState(false);
  // F-193: erst klein; „Mehr …“ klappt die Spalten auf (dann bleibt die Begrüßung stehen)
  const [open, setOpen] = useState<GreetRecent | null>(null);
  const listId = useId();
  const display = useDisplay();
  // F-195: Klick irgendwo außerhalb (auch in eine Seite im Portal) schließt die Begrüßung
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && closeRef.current();
    // Klicks in eingebettete Seiten kommen nicht an – das Fenster verliert dann den Fokus an das iframe
    const blur = () => window.setTimeout(() => document.activeElement?.tagName === 'IFRAME' && closeRef.current(), 0);
    document.addEventListener('pointerdown', away, true);
    window.addEventListener('blur', blur);
    return () => {
      document.removeEventListener('pointerdown', away, true);
      window.removeEventListener('blur', blur);
    };
  }, []);

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
      <span className={['greeting__avatar', hold && 'is-held', open && 'is-open'].filter(Boolean).join(' ')} title={open ? undefined : hold ? G.ringHeld : G.ringTitle(STAY_MS / 1000)}>
        <Avatar profile={profile} />
        {!open && (
          <svg className="greeting__ring" viewBox="0 0 48 48" aria-hidden="true" style={{ '--stay': `${STAY_MS}ms` } as CSSProperties}>
            <circle className="greeting__ring-track" cx="24" cy="24" r="22" />
            <circle className="greeting__ring-left" cx="24" cy="24" r="22" pathLength={100} onAnimationEnd={onClose} />
          </svg>
        )}
        {!open && <span className="sr-only">{G.ringSr(STAY_MS / 1000)}</span>}
      </span>
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
        {/* F-205: ohne Profil zum Anlegen einladen (Demo), mit Hinweis „nur lokal“ */}
        {!profile.name && <p className="greeting__invite">{WELCOME_TEXT.invite}</p>}
        <div className="greeting__actions">
          {last && (
            <button type="button" className="greeting__go" onClick={onContinue}>
              Weitermachen
            </button>
          )}
          <button type="button" aria-expanded={!!open} aria-controls={listId} title={G.moreTitle} onClick={() => setOpen(open ? null : recent())}>
            {open ? G.less : G.more}
          </button>
        </div>
      </div>
      <div className="greeting__corner">
        <button type="button" className="greeting__profile" onClick={onProfile}>
          {profile.name ? 'Profil …' : 'Profil anlegen …'}
        </button>
        <button type="button" className="greeting__x" onClick={onClose} title="Begrüßung schließen (Esc)" aria-label="Begrüßung schließen">
          <Icon name="close" size={14} />
        </button>
      </div>
      {open && (
        <div id={listId} className="greeting__recent" role="group" aria-label={G.title}>
          <Field id={`${listId}-d`} icon="desk" title={G.desks} note={G.desksNote} empty={G.noDesks} items={open.lists.desks} onPick={onPortal} />
          <Field id={`${listId}-s`} icon="slot" title={G.slots} note={G.slotsNote} empty={G.noDesks} items={open.lists.slots} onPick={onPortal} />
          <Field id={`${listId}-p`} icon="portal" title={G.portals} note={G.portalsNote} empty={G.noDesks} items={open.lists.portals} onPick={onPortal} front />
          <section className="greeting__well" aria-labelledby={`${listId}-b`}>
            <h3 id={`${listId}-b`} className="greeting__head">
              <Icon name="library" size={14} /> {open.sourcesNew ? G.sourcesNew : G.sources}
            </h3>
            <p className="greeting__note">{G.sourcesNote}</p>
            {open.sources.length === 0 ? (
              <p className="greeting__note">{G.noSources}</p>
            ) : (
              <ul className="greeting__list">
                {open.sources.map((b) => {
                  // Zweite Zeile: Domain (bei Titel) bzw. Pfad (ohne Titel) – hilft unterscheiden
                  const host = hostOf(b.url);
                  const sub = b.title ? host : pathOf(b.url);
                  return (
                    <li key={b.id}>
                      <button type="button" className="greeting__item" onClick={() => onSource(b)} title={b.url}>
                        <SiteIcon url={b.url} on={display.favicons} />
                        <span className="greeting__lines">
                          <span className="greeting__itemtext">{b.title || host}</span>
                          {sub && <span className="greeting__sub">{sub}</span>}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}
    </section>
  );
}

/** Ein versenktes Feld (Desks, Slots oder Portale): Überschrift, kurzer Hinweis, Einträge zweizeilig. */
function Field({ id, icon, title, note, empty, items, onPick, front }: { id: string; icon: 'desk' | 'slot' | 'portal'; title: string; note: string; empty: string; items: RecentItem[]; onPick: (win: string, id: string) => void; front?: boolean }) {
  return (
    <section className="greeting__well" aria-labelledby={id}>
      <h3 id={id} className="greeting__head">
        <Icon name={icon} size={14} /> {title}
      </h3>
      <p className="greeting__note">{note}</p>
      {items.length === 0 ? (
        <p className="greeting__note">{empty}</p>
      ) : (
        <ul className="greeting__list">
          {items.map((it) => (
            <li key={`${it.win}|${it.id}`}>
              <button
                type="button"
                className="greeting__item"
                onClick={() => onPick(it.win, it.portal)}
                aria-label={`${it.name} – ${it.where}${it.here && icon === 'desk' ? `, ${G.here}` : ''}${front && it.front ? `, ${G.front}` : ''}`}
              >
                {front && it.front ? <span className="greeting__front" aria-hidden="true" title={G.frontTitle} /> : <Icon name={icon} size={12} />}
                <span className="greeting__lines">
                  <span className="greeting__row">
                    <span className="greeting__itemtext">{it.name}</span>
                    {icon === 'desk' && it.here && <span className="greeting__tag">{G.here}</span>}
                  </span>
                  <span className="greeting__sub">{it.where}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
