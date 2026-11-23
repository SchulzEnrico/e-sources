import type { RadarWindow } from './focus';
import { sameUrlKey } from './bookmarks';
import type { Bookmark } from './types';

/**
 * F-193: „Zuletzt benutzt“ für die Begrüßung. Gemerkt werden nur Ids bzw. Adressen mit Zeitpunkt
 * (neueste zuerst), lokal im Browser – Portale beim Aktivieren, Adressen beim Öffnen einer Source.
 * Daraus entstehen links Desks → Slots → Portale und rechts Lesezeichen aus der Library.
 */
export interface RecentEntry {
  id: string;
  at: number;
}
export interface Recent {
  panels: RecentEntry[];
  urls: RecentEntry[];
}
export const RECENT_MAX = 40;
const KEY = 'esource.recent';

/** Eintrag nach vorn holen (ohne Doppel), höchstens `max` Einträge. */
export function touch(list: RecentEntry[], id: string, at: number, max = RECENT_MAX): RecentEntry[] {
  if (list[0]?.id === id) return [{ id, at }, ...list.slice(1)];
  return [{ id, at }, ...list.filter((e) => e.id !== id)].slice(0, max);
}

const clean = (v: unknown): RecentEntry[] =>
  Array.isArray(v) ? v.filter((e) => e && typeof e.id === 'string' && typeof e.at === 'number').slice(0, RECENT_MAX) : [];

export function parseRecent(raw: string | null): Recent {
  try {
    const o = raw ? JSON.parse(raw) : null;
    return { panels: clean(o?.panels), urls: clean(o?.urls) };
  } catch {
    return { panels: [], urls: [] };
  }
}

/** Im Testmodus (`save` = false) bleibt alles nur im Speicher dieser Seite. */
let memory: Recent | null = null;
export function loadRecent(save: boolean): Recent {
  if (!save) return (memory ??= { panels: [], urls: [] });
  try {
    return parseRecent(localStorage.getItem(KEY));
  } catch {
    return { panels: [], urls: [] };
  }
}
export function saveRecent(r: Recent, save: boolean): void {
  if (!save) {
    memory = r;
    return;
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(r));
  } catch {
    // ohne Speicher: nichts zu merken
  }
}

export interface RecentPortal {
  id: string;
  name: string;
  front: boolean;
}
export interface RecentSlot {
  id: string;
  title: string;
  portals: RecentPortal[];
  /** Weitere Portale im Slot, die nicht aufgeführt sind. */
  more: number;
}
export interface RecentDesk {
  win: string;
  title: string;
  here: boolean;
  slots: RecentSlot[];
}

/**
 * Links in der Begrüßung: bis `maxDesks` Desks und zusammen bis `maxSlots` Slots, zuletzt benutzte
 * zuerst (ohne Verlauf in der Reihenfolge des Radars, dieser Desk zuerst). Jeder gezeigte Desk
 * bekommt mindestens einen Slot; je Slot bis `maxPortals` Portale.
 */
export function recentDesks(radar: RadarWindow[], panels: RecentEntry[], maxDesks = 3, maxSlots = 5, maxPortals = 4): RecentDesk[] {
  const rankOf = new Map(panels.map((e, i) => [e.id, i]));
  const r = (id: string) => rankOf.get(id) ?? Infinity;
  const desks = radar
    .map((w, wi) => {
      const slots = w.areas
        .filter((a) => a.panels.length > 0)
        .map((a, ai) => ({ a, ai, rank: Math.min(...a.panels.map((p) => r(p.meta.id))) }))
        .sort((x, y) => x.rank - y.rank || x.ai - y.ai);
      return { w, wi, slots, rank: slots.length ? slots[0].rank : Infinity };
    })
    .filter((d) => d.slots.length > 0)
    .sort((x, y) => x.rank - y.rank || x.wi - y.wi)
    .slice(0, maxDesks);
  // erst je Desk den besten Slot, dann die übrigen nach Verlauf auffüllen
  const pick = new Set(desks.map((d) => d.slots[0]));
  const rest = desks.flatMap((d, di) => d.slots.slice(1).map((s) => ({ s, di }))).sort((x, y) => x.s.rank - y.s.rank || x.di - y.di);
  for (const { s } of rest) {
    if (pick.size >= maxSlots) break;
    pick.add(s);
  }
  return desks.map((d) => ({
    win: d.w.win,
    title: d.w.title,
    here: d.w.here,
    slots: d.slots
      .filter((s) => pick.has(s))
      .map(({ a }) => {
        const list = [...a.panels].sort((x, y) => r(x.meta.id) - r(y.meta.id) || Number(y.front) - Number(x.front));
        return {
          id: a.id,
          title: a.title,
          portals: list.slice(0, maxPortals).map((p) => ({ id: p.meta.id, name: p.meta.name, front: p.front })),
          more: Math.max(0, list.length - maxPortals),
        };
      }),
  }));
}

/** F-193 (V44): ein Eintrag in den Feldern Desks, Slots oder Portale; `portal` = was ein Klick nach vorn holt. */
export interface RecentItem {
  win: string;
  id: string;
  name: string;
  /** Desk (bei Slots und Portalen) bzw. „n Slots · m Portale“ (bei Desks) */
  where: string;
  portal: string;
  here: boolean;
  front: boolean;
}
export interface RecentLists {
  desks: RecentItem[];
  slots: RecentItem[];
  portals: RecentItem[];
}

/**
 * Vier Felder der Begrüßung (Entscheidung Enrico V44): Desks, Slots und Portale je für sich, zuletzt
 * benutzte zuerst; ohne Verlauf in der Reihenfolge des Radars (vorn liegende Portale zuerst).
 * `where(slots, portals)` liefert den Untertitel eines Desks.
 */
export function recentLists(
  radar: RadarWindow[],
  panels: RecentEntry[],
  where: (slots: number, portals: number) => string,
  max = { desks: 3, slots: 5, portals: 5 },
): RecentLists {
  const rankOf = new Map(panels.map((e, i) => [e.id, i]));
  const r = (id: string) => rankOf.get(id) ?? Infinity;
  const all = radar.flatMap((w) =>
    w.areas.flatMap((a) => a.panels.map((p) => ({ w, a, p, rank: r(p.meta.id) }))),
  );
  all.forEach((x, i) => Object.assign(x, { order: i }));
  const order = (x: (typeof all)[number]) => (x as unknown as { order: number }).order;
  const sorted = [...all].sort((x, y) => x.rank - y.rank || Number(y.p.front) - Number(x.p.front) || order(x) - order(y));
  const first = <K>(key: (x: (typeof all)[number]) => K, n: number) => {
    const seen = new Set<K>();
    const out: (typeof all)[number][] = [];
    for (const x of sorted) {
      if (out.length >= n) break;
      if (seen.has(key(x))) continue;
      seen.add(key(x));
      out.push(x);
    }
    return out;
  };
  return {
    desks: first((x) => x.w.win, max.desks).map(({ w, p }) => ({
      win: w.win,
      id: w.win,
      name: w.title,
      where: where(w.areas.filter((a) => a.panels.length > 0).length, w.areas.reduce((n, a) => n + a.panels.length, 0)),
      portal: p.meta.id,
      here: w.here,
      front: false,
    })),
    slots: first((x) => `${x.w.win}|${x.a.id}`, max.slots).map(({ w, a, p }) => ({
      win: w.win,
      id: a.id,
      name: a.title,
      where: w.title,
      portal: p.meta.id,
      here: w.here,
      front: false,
    })),
    portals: first((x) => x.p.meta.id, max.portals).map(({ w, a, p }) => ({
      win: w.win,
      id: p.meta.id,
      name: p.meta.name,
      where: a.title === p.meta.name ? w.title : `${a.title} · ${w.title}`,
      portal: p.meta.id,
      here: w.here,
      front: p.front,
    })),
  };
}

/** Rechts in der Begrüßung: zuletzt geöffnete Sources aus der Library (gleiche Adresse), bis `max`. */
export function recentSources(bookmarks: Bookmark[], urls: RecentEntry[], max = 5): Bookmark[] {
  const byKey = new Map<string, Bookmark>();
  for (const b of bookmarks) if (!byKey.has(sameUrlKey(b.url))) byKey.set(sameUrlKey(b.url), b);
  const out: Bookmark[] = [];
  for (const e of urls) {
    const b = byKey.get(sameUrlKey(e.id));
    if (b && !out.includes(b)) out.push(b);
    if (out.length >= max) break;
  }
  return out;
}

/** Ohne Verlauf: zuletzt in die Library gekommene Sources (ohne Herkunft: die zuletzt angelegten). */
export function newestSources(bookmarks: Bookmark[], max = 5): Bookmark[] {
  return bookmarks
    .map((b, i) => ({ b, i, at: b.origin?.at ?? '' }))
    .sort((x, y) => (x.at < y.at ? 1 : x.at > y.at ? -1 : y.i - x.i))
    .slice(0, max)
    .map((x) => x.b);
}
