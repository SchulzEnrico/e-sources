import { useEffect, useMemo, useState } from 'react';
import type { PanelMeta } from './types';
import { PAUSE_TICK, awake, keysOf, track, visibleKeys, type Seen } from './pause';

/**
 * F-06: merkt, seit wann Portale und Tabs verdeckt sind, und sagt, was geladen bleibt.
 * `all` = alle Portale dieses Desks, `shown` = die gerade sichtbaren.
 */
export function usePause(all: readonly PanelMeta[], shown: readonly PanelMeta[], minutes: number) {
  const visible = useMemo(() => visibleKeys(shown), [shown.map((p) => `${p.id}/${p.activeTab}`).join('|')]); // eslint-disable-line react-hooks/exhaustive-deps
  const keys = all.flatMap(keysOf);
  const keyStr = keys.join('|');
  const visStr = [...visible].join('|');
  const [seen, setSeen] = useState<Seen>({});
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setSeen((prev) => track(prev, visible, keys, Date.now()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyStr, visStr]);
  useEffect(() => {
    if (minutes <= 0) return;
    const t = window.setInterval(() => setNow(Date.now()), PAUSE_TICK);
    return () => window.clearInterval(t);
  }, [minutes]);
  return (key: string, keep?: boolean) => awake(seen, key, visible, now, minutes, keep);
}
