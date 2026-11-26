/**
 * F-206 Schritt 10 (V116, K7 Stufe 2): Arbeitskalender mit Feiertagen und eigenen freien Tagen – ein Kalender für
 * alle Projekte (wie der Standardkalender in MS Project bzw. iTaskX). Ab Werk Mo–Fr ohne Feiertage (wie bisher).
 * Feiertage nach Bundesland (gesetzliche Feiertage, ohne örtliche wie Augsburger Friedensfest); eigene freie Tage
 * (Betriebsurlaub, Brückentage) zusätzlich. `schedule.ts` fragt über `isOffDay`/`offBefore` den aktiven Kalender;
 * App setzt ihn mit `setCalendar(ws.calendar)` bei jedem Zeichnen (wie `setNoticeMs`).
 */
import type { WorkCalendar, Workspace } from './types';

export const REGIONS = ['DE', 'BW', 'BY', 'BE', 'BB', 'HB', 'HH', 'HE', 'MV', 'NI', 'NW', 'RP', 'SL', 'SN', 'ST', 'SH', 'TH'] as const;
export type Region = (typeof REGIONS)[number];
export const FREE_MAX = 120;
/** so weit rechnet der Kalender Feiertage vor und zurück */
const YEARS = [2000, 2060] as const;

const pad = (n: number) => String(n).padStart(2, '0');
const day = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const plus = (y: number, m: number, d: number, n: number) => {
  const t = new Date(Date.UTC(y, m - 1, d + n, 12));
  return day(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
};
const weekday = (s: string) => new Date(`${s}T12:00:00Z`).getUTCDay();
const isDayText = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

/** Ostersonntag (Gauß / anonymer gregorianischer Algorithmus). */
export function easter(y: number): string {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const dd = ((h + l - 7 * m + 114) % 31) + 1;
  return day(y, month, dd);
}

const IN = (r: Region, list: Region[]) => list.includes(r);

/** Gesetzliche Feiertage eines Jahres (`DE` = nur bundesweite). */
export function holidays(y: number, r: Region): { day: string; name: string }[] {
  const [ey, em, ed] = easter(y).split('-').map(Number);
  const e = (n: number) => plus(ey, em, ed, n);
  const out: { day: string; name: string }[] = [
    { day: day(y, 1, 1), name: 'Neujahr' },
    { day: e(-2), name: 'Karfreitag' },
    { day: e(1), name: 'Ostermontag' },
    { day: day(y, 5, 1), name: 'Tag der Arbeit' },
    { day: e(39), name: 'Christi Himmelfahrt' },
    { day: e(50), name: 'Pfingstmontag' },
    { day: day(y, 10, 3), name: 'Tag der Deutschen Einheit' },
    { day: day(y, 12, 25), name: '1. Weihnachtstag' },
    { day: day(y, 12, 26), name: '2. Weihnachtstag' },
  ];
  if (IN(r, ['BW', 'BY', 'ST'])) out.push({ day: day(y, 1, 6), name: 'Heilige Drei Könige' });
  if ((r === 'BE' && y >= 2019) || (r === 'MV' && y >= 2023)) out.push({ day: day(y, 3, 8), name: 'Internationaler Frauentag' });
  if (IN(r, ['BB'])) out.push({ day: e(0), name: 'Ostersonntag' }, { day: e(49), name: 'Pfingstsonntag' });
  if (IN(r, ['BW', 'BY', 'HE', 'NW', 'RP', 'SL'])) out.push({ day: e(60), name: 'Fronleichnam' });
  if (IN(r, ['SL'])) out.push({ day: day(y, 8, 15), name: 'Mariä Himmelfahrt' });
  if (r === 'TH' && y >= 2019) out.push({ day: day(y, 9, 20), name: 'Weltkindertag' });
  if (IN(r, ['BB', 'MV', 'SN', 'ST', 'TH']) || (IN(r, ['HB', 'HH', 'NI', 'SH']) && y >= 2018) || y === 2017) out.push({ day: day(y, 10, 31), name: 'Reformationstag' });
  if (IN(r, ['BW', 'BY', 'NW', 'RP', 'SL'])) out.push({ day: day(y, 11, 1), name: 'Allerheiligen' });
  if (r === 'SN') {
    // Buß- und Bettag: Mittwoch vor dem 23. November
    const w = weekday(day(y, 11, 23));
    out.push({ day: plus(y, 11, 23, -((w + 4) % 7 || 7)), name: 'Buß- und Bettag' });
  }
  return out.sort((a, b) => a.day.localeCompare(b.day));
}

// ---------------------------------------------------------------- aktiver Kalender

let names = new Map<string, string>();
let offSorted: string[] = []; // freie Werktage (Mo–Fr), aufsteigend
let offSet = new Set<string>();
let activeKey = '';

const keyOf = (c?: WorkCalendar) => `${c?.region ?? ''}|${(c?.free ?? []).map((f) => f.day).join(',')}`;

/** Kalender aktiv setzen (`undefined` = Werk: Mo–Fr ohne Feiertage). Gleicher Kalender = nichts zu tun. */
// V118 (F-230 F6): mehrere Kalender (gemeinsam und je Projekt) – berechnete Tage je Kalender zwischenspeichern
type Built = { names: Map<string, string>; offSorted: string[]; offSet: Set<string> };
const built = new Map<string, Built>();
const build = (c?: WorkCalendar): Built => {
  const nm = new Map<string, string>();
  if (c?.region) for (let y = YEARS[0]; y <= YEARS[1]; y++) for (const h of holidays(y, c.region)) nm.set(h.day, h.name);
  for (const f of c?.free ?? []) if (!nm.has(f.day)) nm.set(f.day, f.name || 'frei');
  const sorted = [...nm.keys()].filter((d) => weekday(d) !== 0 && weekday(d) !== 6).sort();
  return { names: nm, offSorted: sorted, offSet: new Set(sorted) };
};

export function setCalendar(c?: WorkCalendar): void {
  const k = keyOf(c);
  if (k === activeKey) return;
  activeKey = k;
  let b = built.get(k);
  if (!b) {
    if (built.size > 24) built.clear();
    built.set(k, (b = build(c)));
  }
  names = b.names;
  offSorted = b.offSorted;
  offSet = b.offSet;
}

/** V118 (F-230 F6): `fn` mit Kalender `c` rechnen, danach gilt wieder der vorige (z. B. eigener Kalender eines Projekts). */
export function withCalendar<T>(c: WorkCalendar | undefined, fn: () => T): T {
  const before = { activeKey, names, offSorted, offSet };
  setCalendar(c);
  try {
    return fn();
  } finally {
    ({ activeKey, names, offSorted, offSet } = before);
  }
}

/** V118 (F-230 F6): Kalender eines Projekts – eigener, sonst der des übergeordneten Projekts, sonst der gemeinsame. */
export function calendarFor(ws: Workspace, pid: string | undefined): WorkCalendar | undefined {
  const seen = new Set<string>();
  for (let id = pid; id && !seen.has(id); ) {
    seen.add(id);
    const p = ws.projects?.find((x) => x.id === id);
    if (!p) break;
    if (p.calendar) return p.calendar;
    id = p.parent;
  }
  return ws.calendar;
}
/** Hat das Projekt selbst einen eigenen Kalender? */
export const hasOwnCalendar = (ws: Workspace, pid: string): boolean => !!ws.projects?.find((x) => x.id === pid)?.calendar;

/** Werktag (Mo–Fr), der nach dem Kalender frei ist? */
export const isOffDay = (d: string): boolean => offSet.has(d);
/** Name des freien Tages (Feiertag oder eigener), sonst undefined. */
export const offName = (d: string): string | undefined => names.get(d);

/** Anzahl freier Werktage strikt vor `d` (für das Zählen der Arbeitstage ohne Schleife). */
export function offBefore(d: string): number {
  let lo = 0;
  let hi = offSorted.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (offSorted[m] < d) lo = m + 1;
    else hi = m;
  }
  return lo;
}

/** Freie Werktage im Bereich (einschließlich), für Gantt und Netzplan. */
export function offBetween(a: string, b: string): { day: string; name: string }[] {
  const out: { day: string; name: string }[] = [];
  for (let i = offBefore(a); i < offSorted.length && offSorted[i] <= b; i++) out.push({ day: offSorted[i], name: names.get(offSorted[i])! });
  return out;
}

// ---------------------------------------------------------------- Arbeitsstand

export const calendarOf = (ws: Workspace): WorkCalendar | undefined => ws.calendar;

function clean(c: WorkCalendar): WorkCalendar | undefined {
  const out: WorkCalendar = {};
  if (c.region) out.region = c.region;
  if (c.free?.length) out.free = c.free;
  return Object.keys(out).length ? out : undefined;
}

function withCal(ws: Workspace, c: WorkCalendar | undefined, pid?: string): Workspace {
  if (pid) {
    // eigener Kalender des Projekts: bleibt auch leer bestehen (= ohne Feiertage), bis „eigener Kalender“ aus ist
    return { ...ws, projects: (ws.projects ?? []).map((p) => (p.id === pid ? { ...p, calendar: (c && clean(c)) ?? {} } : p)) };
  }
  const v = c && clean(c);
  if (v) return { ...ws, calendar: v };
  const { calendar: _c, ...rest } = ws; // eslint-disable-line @typescript-eslint/no-unused-vars
  return rest;
}
/** Kalender, den die Bearbeitung ändert: eigener des Projekts `pid` (falls vorhanden), sonst der gemeinsame. */
const editable = (ws: Workspace, pid?: string): { c: WorkCalendar | undefined; pid?: string } => {
  const own = pid ? ws.projects?.find((p) => p.id === pid)?.calendar : undefined;
  return own ? { c: own, pid } : { c: ws.calendar };
};

/** Feiertage nach Bundesland (`undefined` = keine); mit `pid` im eigenen Kalender des Projekts, falls es einen hat. */
export const setRegion = (ws: Workspace, region: Region | undefined, pid?: string): Workspace => {
  const e = editable(ws, pid);
  return withCal(ws, { ...e.c, region }, e.pid);
};

/** Eigenen freien Tag hinzufügen (gleicher Tag = Name ersetzen); `null` = ungültig oder voll. */
export function addFree(ws: Workspace, d: string, name = '', pid?: string): Workspace | null {
  if (!isDayText(d)) return null;
  const e = editable(ws, pid);
  const free = (e.c?.free ?? []).filter((f) => f.day !== d);
  if (free.length >= FREE_MAX) return null;
  const n = name.trim().slice(0, 40);
  return withCal(ws, { ...e.c, free: [...free, { day: d, ...(n ? { name: n } : {}) }].sort((a, b) => a.day.localeCompare(b.day)) }, e.pid);
}

export const removeFree = (ws: Workspace, d: string, pid?: string): Workspace => {
  const e = editable(ws, pid);
  return withCal(ws, { ...e.c, free: (e.c?.free ?? []).filter((f) => f.day !== d) }, e.pid);
};

/** Kalender ganz setzen (Rückgängig); mit `pid` den eigenen des Projekts (`undefined` = kein eigener mehr). */
export const restoreCalendar = (ws: Workspace, c: WorkCalendar | undefined, pid?: string): Workspace => {
  if (!pid) return withCal(ws, c);
  return { ...ws, projects: (ws.projects ?? []).map((p) => (p.id === pid ? (c ? { ...p, calendar: c } : withoutCalendar(p)) : p)) };
};

/** V118 (F-230 F6): eigenen Kalender für ein Projekt ein (Kopie des geltenden) bzw. aus (gilt wieder der gemeinsame). */
export function setOwnCalendar(ws: Workspace, pid: string, on: boolean): Workspace {
  const p = ws.projects?.find((x) => x.id === pid);
  if (!p || on === !!p.calendar) return ws;
  if (on) return withCal(ws, { ...calendarFor(ws, pid) }, pid);
  return { ...ws, projects: (ws.projects ?? []).map((x) => (x.id === pid ? withoutCalendar(x) : x)) };
}
const withoutCalendar = <P extends { calendar?: WorkCalendar }>(p: P): P => {
  const { calendar: _c, ...rest } = p; // eslint-disable-line @typescript-eslint/no-unused-vars
  return rest as P;
};

export function parseCalendar(v: unknown): WorkCalendar | undefined {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  const r = v as Record<string, unknown>;
  const out: WorkCalendar = {};
  if (REGIONS.includes(r.region as Region)) out.region = r.region as Region;
  if (Array.isArray(r.free)) {
    const seen = new Set<string>();
    const free = r.free
      .filter((f): f is Record<string, unknown> => !!f && typeof f === 'object' && isDayText((f as Record<string, unknown>).day))
      .filter((f) => !seen.has(f.day as string) && (seen.add(f.day as string), true))
      .slice(0, FREE_MAX)
      .map((f) => ({ day: f.day as string, ...(typeof f.name === 'string' && f.name.trim() ? { name: f.name.trim().slice(0, 40) } : {}) }))
      .sort((a, b) => a.day.localeCompare(b.day));
    if (free.length) out.free = free;
  }
  return clean(out);
}
