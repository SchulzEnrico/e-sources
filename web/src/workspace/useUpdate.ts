/**
 * F-168: Prüft im Hintergrund, ob eine neuere Version veröffentlicht ist (Regeln in update.ts).
 * Gibt die neue Build-Kennung zurück, solange der Hinweis gezeigt werden soll; „Später“ blendet
 * ihn für genau diese Version aus (eine noch neuere zeigt ihn wieder).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { type CheckReason, dueCheck, isNewBuild, parseBuild, versionUrl } from './update';

export function useUpdateCheck(current: string, enabled: boolean): { found: string | null; later: () => void } {
  const [found, setFound] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const last = useRef(Date.now());

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const check = async (reason: CheckReason) => {
      const now = Date.now();
      if (document.visibilityState !== 'visible' || !dueCheck(last.current, now, reason)) return;
      last.current = now;
      try {
        const res = await fetch(versionUrl(import.meta.env.BASE_URL, now), { cache: 'no-store' });
        if (!res.ok) return;
        const b = parseBuild(await res.json());
        if (alive && isNewBuild(current, b)) setFound(b);
      } catch {
        // offline oder Datei fehlt: beim nächsten Mal wieder
      }
    };
    const onReturn = () => void check('return');
    const timer = window.setInterval(() => void check('timer'), 5 * 60 * 1000);
    document.addEventListener('visibilitychange', onReturn);
    window.addEventListener('pageshow', onReturn);
    window.addEventListener('online', onReturn);
    return () => {
      alive = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onReturn);
      window.removeEventListener('pageshow', onReturn);
      window.removeEventListener('online', onReturn);
    };
  }, [current, enabled]);

  const later = useCallback(() => setDismissed(found), [found]);
  return { found: found && found !== dismissed ? found : null, later };
}
