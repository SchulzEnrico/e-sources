/**
 * F-220 (V116, entschieden V100, R1–R7): Umschalt-Räder ordnen sich nach Nutzung, Einträge lassen sich fest anheften
 * und ausblenden („Rad belegen …“). Reine Logik ohne Oberfläche – Bedienung siehe `components/ArrangedWheel.tsx`.
 *
 * R1 Nutzung der letzten 30 Tage, neu geordnet nur beim Öffnen (das Bauteil friert die Reihenfolge ein).
 * R2 Angeheftete stehen vorn in eigener Reihenfolge, ausgeblendete fehlen, „Automatisch ordnen“ ab Werk an.
 * R5 Zählung je Gerät (`esource.wheelUse.v1`), Anheften und Belegung in `Workspace.wheels` (Dateiformat 11, Abgleich).
 */
import type { WheelPrefs, Workspace } from './types';

/** R1: so viele Tage zählen */
export const USE_DAYS = 30;
/** höchstens so viele Einträge je Modus merken (älteste fallen heraus) */
const USE_MAX = 200;
const DAY_MS = 86_400_000;

/** Nutzung je Rad und Eintrag: Tage (seit 1970) der einzelnen Wahlen, jüngste zuletzt. */
export type WheelUses = Record<string, Record<string, number[]>>;

export const dayOf = (now: number) => Math.floor(now / DAY_MS);

/** Eine Wahl zählen (nur echte Wahl durch den Anwender). Alte Tage fallen dabei heraus. */
export function recordUse(uses: WheelUses, wheel: string, id: string, now: number): WheelUses {
  const today = dayOf(now);
  const w = { ...(uses[wheel] ?? {}) };
  const keep = (l: number[] = []) => l.filter((d) => today - d < USE_DAYS);
  for (const k of Object.keys(w)) {
    const l = keep(w[k]);
    if (l.length) w[k] = l;
    else delete w[k];
  }
  w[id] = [...keep(w[id]), today].slice(-USE_MAX);
  return { ...uses, [wheel]: w };
}

/** Zahl der Wahlen eines Eintrags in den letzten 30 Tagen. */
export function useCount(uses: WheelUses, wheel: string, id: string, now: number): number {
  const today = dayOf(now);
  return (uses[wheel]?.[id] ?? []).filter((d) => today - d < USE_DAYS && d <= today).length;
}

/** Gelesene Nutzung säubern (fremde Werte verwerfen). */
export function parseUses(v: unknown): WheelUses {
  const out: WheelUses = {};
  if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
  for (const [k, w] of Object.entries(v as Record<string, unknown>)) {
    if (!w || typeof w !== 'object' || Array.isArray(w)) continue;
    const e: Record<string, number[]> = {};
    for (const [id, l] of Object.entries(w as Record<string, unknown>)) {
      if (!Array.isArray(l)) continue;
      const days = l.filter((d): d is number => Number.isInteger(d) && d > 0).slice(-USE_MAX);
      if (days.length) e[id] = days;
    }
    if (Object.keys(e).length) out[k] = e;
  }
  return out;
}

export const prefsOf = (ws: Workspace, wheel: string): WheelPrefs | undefined => ws.wheels?.[wheel];
export const autoOn = (p?: WheelPrefs) => p?.auto !== false;

/**
 * Reihenfolge, die das Rad zeigt: erst die angehefteten (eigene Reihenfolge), dann die übrigen – nach Nutzung
 * (häufigste zuerst, bei Gleichstand Werk-Reihenfolge) oder, wenn „Automatisch ordnen“ aus ist, in Werk-Reihenfolge.
 * Ausgeblendete fehlen; `keep` (der gewählte Eintrag) bleibt immer sichtbar, ebenso mindestens ein Eintrag.
 */
export function arrange(ids: string[], prefs: WheelPrefs | undefined, count: (id: string) => number, keep?: string): string[] {
  const hidden = new Set((prefs?.hidden ?? []).filter((x) => x !== keep));
  const shown = ids.filter((x) => !hidden.has(x));
  const list = shown.length ? shown : ids.slice(0, 1);
  const pinned = (prefs?.pinned ?? []).filter((x) => list.includes(x));
  const rest = list.filter((x) => !pinned.includes(x));
  if (autoOn(prefs)) {
    const n = new Map(rest.map((x) => [x, count(x)]));
    rest.sort((a, b) => n.get(b)! - n.get(a)! || ids.indexOf(a) - ids.indexOf(b));
  }
  return [...pinned, ...rest];
}

/** Weicht die gezeigte Reihenfolge allein durch die Nutzung von der Werk-Reihenfolge ab? (R6: Hinweis einmal) */
export function reordered(ids: string[], shown: string[], prefs?: WheelPrefs): boolean {
  if (!autoOn(prefs)) return false;
  const pinned = new Set(prefs?.pinned ?? []);
  const a = shown.filter((x) => !pinned.has(x));
  const b = ids.filter((x) => a.includes(x));
  return a.some((x, i) => x !== b[i]);
}

/** Leere Einstellung = Werk (fällt aus dem Arbeitsstand heraus). */
function clean(p: WheelPrefs): WheelPrefs | undefined {
  const out: WheelPrefs = {};
  if (p.pinned?.length) out.pinned = p.pinned;
  if (p.hidden?.length) out.hidden = p.hidden;
  if (p.order?.length) out.order = p.order;
  if (p.auto === false) out.auto = false;
  return Object.keys(out).length ? out : undefined;
}

/** Einstellung eines Rads setzen (`undefined` = Auf Werk zurück). */
export function setWheel(ws: Workspace, wheel: string, prefs: WheelPrefs | undefined): Workspace {
  const p = prefs && clean(prefs);
  const all = { ...(ws.wheels ?? {}) };
  if (p) all[wheel] = p;
  else delete all[wheel];
  if (Object.keys(all).length) return { ...ws, wheels: all };
  const { wheels: _w, ...rest } = ws; // eslint-disable-line @typescript-eslint/no-unused-vars
  return rest;
}

/** Anheften: hinten an die angehefteten (bzw. an die Stelle, die er gerade hat, wenn alle davor schon angeheftet sind). */
export function pin(prefs: WheelPrefs | undefined, id: string): WheelPrefs {
  const pinned = (prefs?.pinned ?? []).filter((x) => x !== id);
  return { ...(prefs ?? {}), pinned: [...pinned, id], hidden: (prefs?.hidden ?? []).filter((x) => x !== id) };
}

export function unpin(prefs: WheelPrefs | undefined, id: string): WheelPrefs {
  return { ...(prefs ?? {}), pinned: (prefs?.pinned ?? []).filter((x) => x !== id) };
}

export const isPinned = (prefs: WheelPrefs | undefined, id: string) => !!prefs?.pinned?.includes(id);

/**
 * Nach vorn (`dir` −1) bzw. nach hinten (+1) in der gezeigten Reihenfolge `shown`. Damit der Eintrag dort bleibt,
 * wird alles bis zu seinem neuen Platz angeheftet (bzw. bis zum letzten bisher angehefteten). `null` = geht nicht
 * (schon ganz vorn bzw. hinten).
 */
export function move(prefs: WheelPrefs | undefined, shown: string[], id: string, dir: -1 | 1): WheelPrefs | null {
  const i = shown.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= shown.length) return null;
  const order = [...shown];
  [order[i], order[j]] = [order[j], order[i]];
  const was = prefs?.pinned ?? [];
  const lastPinned = Math.max(-1, ...order.map((x, k) => (was.includes(x) ? k : -1)));
  const upto = Math.max(j, lastPinned);
  return { ...(prefs ?? {}), pinned: order.slice(0, upto + 1) };
}

/** „Rad belegen …“: Eintrag ein- bzw. ausblenden; der letzte sichtbare bleibt (`null` = geht nicht). */
export function toggleHidden(prefs: WheelPrefs | undefined, ids: string[], id: string): WheelPrefs | null {
  const hidden = new Set(prefs?.hidden ?? []);
  if (hidden.has(id)) hidden.delete(id);
  else {
    if (ids.filter((x) => !hidden.has(x)).length <= 1) return null;
    hidden.add(id);
  }
  return { ...(prefs ?? {}), hidden: ids.filter((x) => hidden.has(x)), pinned: (prefs?.pinned ?? []).filter((x) => !hidden.has(x)) };
}

export function setAuto(prefs: WheelPrefs | undefined, on: boolean): WheelPrefs {
  const { auto: _a, ...rest } = prefs ?? {}; // eslint-disable-line @typescript-eslint/no-unused-vars
  return on ? rest : { ...rest, auto: false };
}
