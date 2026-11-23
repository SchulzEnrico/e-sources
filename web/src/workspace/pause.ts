import { sameUrlKey } from './bookmarks';
import type { PanelMeta, Workspace } from './types';

/**
 * F-06: Ressourcen schonen. Was man nicht sieht (Tabs im Hintergrund, Portale hinten im Stack),
 * lädt erst, wenn man es zum ersten Mal ansieht, und pausiert nach einer Weile wieder (wird
 * entladen). Beim Anklicken lädt es neu. Portale mit „Nicht pausieren“ bleiben immer geladen.
 */

/** Wahl in den Einstellungen, in Minuten; 0 = nie pausieren (alles bleibt geladen). */
export const PAUSE_CHOICES = [5, 10, 30, 60, 0] as const;
export const PAUSE_DEFAULT = 10;
/** Wie oft nachgesehen wird, ob etwas pausieren muss. */
export const PAUSE_TICK = 30_000;

/** Minuten bis zur Pause (Einstellung, sonst Voreinstellung). */
export const pauseMinutes = (ws: Pick<Workspace, 'pause'>): number => ws.pause ?? PAUSE_DEFAULT;

/** Schlüssel eines Tabs; ein Portal hat seine Id als Schlüssel. */
export const tabKey = (panel: string, tab: string) => `${panel}/${tab}`;

/**
 * Merker je Schlüssel: null = gerade sichtbar, Zahl = verdeckt seit (ms). Was noch nie sichtbar
 * war, steht nicht drin – es ist noch nicht geladen.
 */
export type Seen = Record<string, number | null>;

/**
 * Neuer Merker nach dem, was jetzt sichtbar ist. `all` sind alle Schlüssel, die es noch gibt;
 * andere fallen weg. Ohne Änderung kommt `prev` selbst zurück (kein neues Zeichnen).
 */
export function track(prev: Seen, visible: ReadonlySet<string>, all: readonly string[], now: number): Seen {
  const next: Seen = {};
  let changed = false;
  for (const k of all) {
    const was = prev[k];
    if (visible.has(k)) next[k] = null;
    else if (was === null) next[k] = now;
    else if (typeof was === 'number') next[k] = was;
    else continue;
    if (next[k] !== was) changed = true;
  }
  if (Object.keys(prev).length !== Object.keys(next).length) changed = true;
  return changed ? next : prev;
}

/**
 * Ist das geladen? Sichtbares und „Nicht pausieren“ immer; bei 0 Minuten alles; sonst, was schon
 * einmal sichtbar war und noch nicht länger als die eingestellte Zeit verdeckt ist.
 */
export function awake(seen: Seen, key: string, visible: ReadonlySet<string>, now: number, minutes: number, keep = false): boolean {
  if (keep || minutes <= 0 || visible.has(key)) return true;
  const since = seen[key];
  if (since === null) return true;
  if (since === undefined) return false;
  return now - since < minutes * 60_000;
}

/** Alle Schlüssel eines Portals: das Portal selbst und seine Tabs. */
export const keysOf = (p: PanelMeta): string[] => [p.id, ...p.tabs.map((t) => tabKey(p.id, t.id))];

/** Schlüssel, die gerade sichtbar sind: die gezeigten Portale und deren aktiver Tab. */
export const visibleKeys = (shown: readonly PanelMeta[]): Set<string> => new Set(shown.flatMap((p) => [p.id, tabKey(p.id, p.activeTab)]));

/** Einstellung „Verdecktes pausieren nach“; die Voreinstellung wird nicht eigens gespeichert. */
export function setPause(ws: Workspace, minutes: number): Workspace {
  if (!(PAUSE_CHOICES as readonly number[]).includes(minutes)) return ws;
  const { pause: _drop, ...rest } = ws;
  return minutes === PAUSE_DEFAULT ? rest : { ...rest, pause: minutes };
}

/** „Nicht pausieren“ für ein Portal ein- oder ausschalten. */
export function toggleKeep(ws: Workspace, id: string): Workspace {
  return {
    ...ws,
    panels: ws.panels.map((p) => {
      if (p.id !== id) return p;
      const { keep: _drop, ...rest } = p;
      return p.keep ? rest : { ...rest, keep: true };
    }),
  };
}

/* ---------- F-06 Stufe 2: sichtbare Portale, Ausnahme je Tab ---------- */

/** Wahl „Sichtbares pausieren“, in Minuten; 0 = nie. */
export const SHOWN_CHOICES = [30, 60, 120, 0] as const;
export const SHOWN_DEFAULT = 60;

/** Minuten, nach denen ein sichtbares, unbenutztes Portal pausiert. */
export const shownMinutes = (ws: Pick<Workspace, 'pauseShown'>): number => ws.pauseShown ?? SHOWN_DEFAULT;

/** Einstellung „Sichtbares pausieren“; die Voreinstellung wird nicht eigens gespeichert. */
export function setPauseShown(ws: Workspace, minutes: number): Workspace {
  if (!(SHOWN_CHOICES as readonly number[]).includes(minutes)) return ws;
  const { pauseShown: _drop, ...rest } = ws;
  return minutes === SHOWN_DEFAULT ? rest : { ...rest, pauseShown: minutes };
}

/** „Nicht pausieren“ für einen einzelnen Tab ein- oder ausschalten. */
export function toggleKeepTab(ws: Workspace, id: string, tab: string): Workspace {
  return {
    ...ws,
    panels: ws.panels.map((p) =>
      p.id !== id
        ? p
        : {
            ...p,
            tabs: p.tabs.map((t) => {
              if (t.id !== tab) return t;
              const { keep: _drop, ...rest } = t;
              return t.keep ? rest : { ...rest, keep: true };
            }),
          },
    ),
  };
}

/** Bleibt dieser Tab immer geladen? (Portal oder Tab mit „Nicht pausieren“) */
/** F-202: Adressen der Sources mit „Nie pausieren“ (Vergleich wie sameUrl). */
export function keptSources(ws: Pick<Workspace, 'bookmarks'>): ReadonlySet<string> {
  return new Set(ws.bookmarks.filter((b) => b.keep).map((b) => sameUrlKey(b.url)));
}

/** F-202: Zeigt dieser Tab eine Source mit „Nie pausieren“? */
export const keptBySource = (src: ReadonlySet<string> | undefined, url: string | undefined): boolean => !!src && !!url && src.size > 0 && src.has(sameUrlKey(url));

/** Pausiert dieser Tab nie? Portal, Tab selbst oder (F-202) seine Source. */
export const keepTabOf = (p: Pick<PanelMeta, 'keep' | 'tabs'>, tab: string, src?: ReadonlySet<string>): boolean => {
  if (p.keep) return true;
  const t = p.tabs.find((x) => x.id === tab);
  return !!t?.keep || keptBySource(src, t?.url);
};

/** F-202: Sources „Nie pausieren“ setzen oder aufheben (eine oder viele auf einmal). */
export function setSourcesKeep(ws: Workspace, ids: readonly string[], keep: boolean): Workspace {
  const set = new Set(ids);
  return {
    ...ws,
    bookmarks: ws.bookmarks.map((b) => {
      if (!set.has(b.id) || !!b.keep === keep) return b;
      if (keep) return { ...b, keep: true };
      const { keep: _drop, ...rest } = b;
      return rest;
    }),
  };
}

/**
 * Schläft ein sichtbares Portal? Von Hand pausiert oder länger als die eingestellte Zeit nicht
 * benutzt. Nie, wenn das Portal oder sein sichtbarer Tab „Nicht pausieren“ hat, und nie das
 * gewählte (aktive) Portal – außer von Hand.
 */
export function dozing(o: { used?: number; now: number; minutes: number; keep: boolean; active: boolean; manual: boolean }): boolean {
  if (o.keep) return false;
  if (o.manual) return true;
  if (o.active || o.minutes <= 0 || o.used === undefined) return false;
  return o.now - o.used >= o.minutes * 60_000;
}

/** Letzte Benutzung der sichtbaren Portale: neu sichtbare bekommen „jetzt“, verschwundene fallen weg. */
export function trackUse(prev: Record<string, number>, shown: readonly string[], now: number): Record<string, number> {
  const next: Record<string, number> = {};
  let changed = Object.keys(prev).length !== shown.length;
  for (const id of shown) {
    next[id] = prev[id] ?? now;
    if (prev[id] === undefined) changed = true;
  }
  return changed ? next : prev;
}
