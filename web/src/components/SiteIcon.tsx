import { standardRef } from '../workspace/device';
/**
 * F-183 Stufe 2: Symbol einer Webseite (Favicon) vor einer Source – direkt von der Seite geholt, ohne
 * Dienst dazwischen (workspace/display.ts). Lädt es nicht oder ist die Anzeige aus, steht der
 * Anfangsbuchstabe der Domain. Immer aria-hidden: Titel und Adresse stehen daneben (NF-03).
 */
import { type CSSProperties, useEffect, useState } from 'react';
import { DISPLAY_EVENT, compactOn, faviconUrl, faviconsOn, siteHue, siteLetter, padOpacity, dockOpacity } from '../workspace/display';

/** Seiten, deren Symbol nicht lud – nicht bei jedem Zeichnen neu versuchen. */
const failed = new Set<string>();

/** Aktueller Stand der Anzeige-Einstellungen; aktualisiert sich bei Änderung (auch aus anderen Desks). */
export function useDisplay() {
  // F-52: Gerät – das Standard-Layout meldet sich über dasselbe Ereignis
  const read = () => ({ compact: compactOn(), favicons: faviconsOn(), standard: standardRef(), padOpacity: padOpacity(), dockOpacity: dockOpacity() });
  const [state, setState] = useState(read);
  useEffect(() => {
    const update = () => setState(read());
    window.addEventListener(DISPLAY_EVENT, update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener(DISPLAY_EVENT, update);
      window.removeEventListener('storage', update);
    };
  }, []);
  return state;
}

export function SiteIcon({ url, size = 16, on }: { url: string; size?: number; on: boolean }) {
  const src = on ? faviconUrl(url) : null;
  const [bad, setBad] = useState(() => !!src && failed.has(src));
  useEffect(() => setBad(!!src && failed.has(src)), [src]);
  if (src && !bad) {
    return (
      <img
        className="site-icon"
        src={src}
        width={size}
        height={size}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => {
          failed.add(src);
          setBad(true);
        }}
      />
    );
  }
  return (
    <span className="site-icon site-icon--letter" aria-hidden="true" style={{ '--site-hue': siteHue(url), width: size, height: size } as CSSProperties}>
      {siteLetter(url)}
    </span>
  );
}
