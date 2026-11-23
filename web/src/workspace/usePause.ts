import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PanelMeta } from './types';
import { PAUSE_TICK, awake, dozing, keepTabOf, keysOf, track, trackUse, visibleKeys, type Seen } from './pause';

/**
 * F-06: merkt, seit wann Portale und Tabs verdeckt sind, und sagt, was geladen bleibt.
 * `all` = alle Portale dieses Desks, `shown` = die gerade sichtbaren.
 * Stufe 2: sichtbare Portale, die lange nicht benutzt werden (oder von Hand), schlafen –
 * `asleep(id)`; `touch(id)` meldet Benutzung, `touch(id, true)` weckt auch von Hand Pausiertes.
 */
export function usePause(all: readonly PanelMeta[], shown: readonly PanelMeta[], minutes: number, shownMin: number, active: string | null, src?: ReadonlySet<string>) {
  const visible = useMemo(() => visibleKeys(shown), [shown.map((p) => `${p.id}/${p.activeTab}`).join('|')]); // eslint-disable-line react-hooks/exhaustive-deps
  const keys = all.flatMap(keysOf);
  const keyStr = keys.join('|');
  const visStr = [...visible].join('|');
  const shownIds = shown.map((p) => p.id);
  const shownStr = shownIds.join('|');
  const [seen, setSeen] = useState<Seen>({});
  const [used, setUsed] = useState<Record<string, number>>({});
  const [manual, setManual] = useState<ReadonlySet<string>>(() => new Set());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setSeen((prev) => track(prev, visible, keys, Date.now()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyStr, visStr]);
  useEffect(() => {
    setUsed((prev) => trackUse(prev, shownIds, Date.now()));
    setManual((prev) => (prev.size && [...prev].some((id) => !shownIds.includes(id)) ? new Set([...prev].filter((id) => shownIds.includes(id))) : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownStr]);
  const touch = useCallback((id: string, wake = false) => {
    const t = Date.now();
    setUsed((prev) => (prev[id] !== undefined && t - prev[id] < 5_000 ? prev : { ...prev, [id]: t }));
    if (wake) setManual((prev) => (prev.has(id) ? new Set([...prev].filter((x) => x !== id)) : prev));
    setNow(t);
  }, []);
  const pauseNow = useCallback((id: string) => setManual((prev) => new Set([...prev, id])), []);
  useEffect(() => {
    if (minutes <= 0 && shownMin <= 0) return;
    const t = window.setInterval(() => {
      // Fokus in einer eingebetteten Seite (dort tippen, lesen mit Tastatur) zählt als Benutzung.
      const el = document.hasFocus() ? document.activeElement : null;
      const id = el instanceof HTMLIFrameElement ? el.closest<HTMLElement>('[data-panel-id]')?.dataset.panelId : undefined;
      if (id) touch(id);
      setNow(Date.now());
    }, PAUSE_TICK);
    return () => window.clearInterval(t);
  }, [minutes, shownMin, touch]);
  const asleep = (id: string): boolean => {
    const p = shown.find((x) => x.id === id);
    if (!p) return false;
    return dozing({ used: used[id], now, minutes: shownMin, keep: keepTabOf(p, p.activeTab, src), active: id === active, manual: manual.has(id) });
  };
  const isAwake = (key: string, keep?: boolean) => awake(seen, key, visible, now, minutes, keep);
  return { isAwake, asleep, touch, pauseNow };
}
