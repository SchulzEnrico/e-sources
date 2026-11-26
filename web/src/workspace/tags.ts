/**
 * V122 (F-231 K4, Entscheidung T4): Tags mit Farbe wie Trello-Labels.
 *
 * Eine gemeinsame Liste für alles (`Workspace.tagColors`: Name → Farbe); je Board lassen sich Tags nur ein- und
 * ausblenden (`NoteView.hiddenTags`) – „weitestgehend gleicher Aufbau“. Die Farben entsprechen 1:1 den
 * Trello-Labelfarben (auch deren Stufen „_light“/„_dark“), damit Import und Export ohne Verlust gehen; die Töne
 * selbst sind an unsere UX/UI angepasst. Auf der Karte stehen Tags immer mit Namen (V61: nie Farbe allein).
 */
import type { Note, NoteView, Workspace } from './types';
import * as No from './notes';

/** Tag-Farben (Id = Trello-Farbe). Reihenfolge = Reihenfolge im Farbwähler. */
export const TAG_COLORS: readonly { id: string; name: string; hex: string }[] = [
  { id: 'green', name: 'Grün', hex: '#4fa06a' },
  { id: 'yellow', name: 'Gelb', hex: '#d9b443' },
  { id: 'orange', name: 'Orange', hex: '#e2884f' },
  { id: 'red', name: 'Rot', hex: '#d3514a' },
  { id: 'purple', name: 'Lila', hex: '#9a63b8' },
  { id: 'blue', name: 'Blau', hex: '#4f7fd0' },
  { id: 'sky', name: 'Himmelblau', hex: '#53aee0' },
  { id: 'lime', name: 'Hellgrün', hex: '#93be4c' },
  { id: 'pink', name: 'Pink', hex: '#d86aa8' },
  { id: 'black', name: 'Schwarz', hex: '#5b5f6b' },
];
export const TAG_SHADES = ['', '_light', '_dark'] as const;
const SHADE_NAME: Record<string, string> = { '': '', _light: ' hell', _dark: ' dunkel' };

/** Gültige Farb-Id (Grundfarbe plus Stufe)? */
export const isTagColor = (c: unknown): c is string => typeof c === 'string' && TAG_COLORS.some((t) => c === t.id || c === `${t.id}_light` || c === `${t.id}_dark`);

const baseOf = (c: string) => c.replace(/_(light|dark)$/, '');
const shadeOf = (c: string) => (c.endsWith('_light') ? '_light' : c.endsWith('_dark') ? '_dark' : '');

/** Farbe als HEX (Stufe hell/dunkel aufgehellt bzw. abgedunkelt). */
export function tagHex(c: string): string {
  const base = TAG_COLORS.find((t) => t.id === baseOf(c))?.hex ?? '#7a7f8c';
  const sh = shadeOf(c);
  if (!sh) return base;
  const n = parseInt(base.slice(1), 16);
  const mix = (v: number) => Math.round(sh === '_light' ? v + (255 - v) * 0.45 : v * 0.62);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** Name der Farbe für Bildschirmleser und Tooltip, z. B. „Grün dunkel“. */
export const tagColorName = (c: string): string => `${TAG_COLORS.find((t) => t.id === baseOf(c))?.name ?? c}${SHADE_NAME[shadeOf(c)]}`;

/** Gut lesbare Schrift auf der Farbe (schwarz oder weiß). */
export function tagInk(c: string): string {
  const n = parseInt(tagHex(c).slice(1), 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? '#16181d' : '#ffffff';
}

export const fold = (t: string) => t.trim().toLocaleLowerCase('de');

/** Farbe eines Tags (ohne Rücksicht auf Groß/Klein); fehlt = ohne Farbe. */
export function colorOf(ws: Workspace, tag: string): string | undefined {
  const map = ws.tagColors;
  if (!map) return undefined;
  if (map[tag]) return map[tag];
  const f = fold(tag);
  const k = Object.keys(map).find((x) => fold(x) === f);
  return k ? map[k] : undefined;
}

/** Alle bekannten Tags (aus Notizen und der Farbliste), alphabetisch, ohne Doppelte (Groß/Klein egal). */
export function allTags(ws: Workspace): string[] {
  const seen = new Map<string, string>();
  for (const n of ws.notes ?? []) for (const t of n.tags ?? []) if (!seen.has(fold(t))) seen.set(fold(t), t);
  for (const t of Object.keys(ws.tagColors ?? {})) if (!seen.has(fold(t))) seen.set(fold(t), t);
  return [...seen.values()].sort((a, b) => a.localeCompare(b, 'de'));
}

const notesIn = (ws: Workspace, v: NoteView): Note[] => No.idsIn(v).map((id) => No.noteById(ws, id)).filter((n): n is Note => !!n);

/** Tags eines Boards mit Zahl der Karten (ohne archivierte), dazu alle anderen bekannten Tags mit 0. */
export function boardTags(ws: Workspace, viewId: string): { tag: string; count: number; hidden: boolean; color?: string }[] {
  const v = No.viewById(ws, viewId);
  if (!v) return [];
  const count = new Map<string, number>();
  for (const n of notesIn(ws, v)) if (n.state !== 'archived') for (const t of n.tags ?? []) count.set(fold(t), (count.get(fold(t)) ?? 0) + 1);
  const hidden = new Set(v.hiddenTags ?? []);
  return allTags(ws).map((tag) => ({ tag, count: count.get(fold(tag)) ?? 0, hidden: hidden.has(fold(tag)), ...(colorOf(ws, tag) ? { color: colorOf(ws, tag) } : {}) }));
}

/** Tags, die eine Karte in diesem Board zeigt (ausgeblendete fehlen), mit Farbe. */
export function shownTags(ws: Workspace, v: NoteView | undefined, n: Note): { tag: string; color?: string }[] {
  const hidden = new Set(v?.hiddenTags ?? []);
  return (n.tags ?? []).filter((t) => !hidden.has(fold(t))).map((tag) => ({ tag, ...(colorOf(ws, tag) ? { color: colorOf(ws, tag) } : {}) }));
}

const withColors = (ws: Workspace, map: Record<string, string>): Workspace => {
  if (Object.keys(map).length) return { ...ws, tagColors: map };
  const { tagColors: _t, ...rest } = ws; // eslint-disable-line @typescript-eslint/no-unused-vars
  return rest;
};

/** Farbe setzen (`undefined` = ohne Farbe). Legt einen neuen Tag an, wenn es ihn noch nicht gibt. */
export function setTagColor(ws: Workspace, tag: string, color: string | undefined): Workspace {
  const name = tag.trim();
  if (!name || (color !== undefined && !isTagColor(color))) return ws;
  const map = Object.fromEntries(Object.entries(ws.tagColors ?? {}).filter(([k]) => fold(k) !== fold(name)));
  // ohne Farbe: Eintrag fällt weg (ein unbenutzter Tag ohne Farbe ist damit wieder weg – wie bei Trello ein leeres Label)
  if (color) map[name] = color;
  return withColors(ws, map);
}

/** Neuen Tag anlegen (noch ohne Karte); Farbe wie angegeben oder die nächste freie. */
export function createTag(ws: Workspace, tag: string, color?: string): { ws: Workspace; tag: string } {
  const name = tag.trim();
  const have = allTags(ws).find((t) => fold(t) === fold(name));
  if (!name || have) return { ws, tag: have ?? name };
  const used = new Set(Object.values(ws.tagColors ?? {}).map(baseOf));
  const c = color && isTagColor(color) ? color : (TAG_COLORS.find((t) => !used.has(t.id)) ?? TAG_COLORS[0]).id;
  return { ws: setTagColor(ws, name, c), tag: name };
}

/** Tags einer Notiz setzen (ohne Doppelte, Schreibweise eines schon bekannten Tags wird übernommen). */
export function normalizeTags(ws: Workspace, tags: readonly string[]): string[] {
  const known = allTags(ws);
  const out: string[] = [];
  for (const raw of tags) {
    const t = raw.trim();
    if (!t || out.some((x) => fold(x) === fold(t))) continue;
    out.push(known.find((k) => fold(k) === fold(t)) ?? t);
  }
  return out;
}

/**
 * Umbenennen – gemeinsam für alles (T4): in allen Notizen, in der Farbliste und in den Ausblendungen aller Boards.
 * Gibt es den neuen Namen schon, werden beide zusammengelegt (Farbe des Ziels bleibt, sonst die alte).
 */
export function renameTag(ws: Workspace, from: string, to: string): { ws: Workspace; notes: number } {
  const a = fold(from);
  const name = to.trim();
  if (!name || !a) return { ws, notes: 0 };
  const target = allTags(ws).find((t) => fold(t) === fold(name) && fold(t) !== a) ?? name;
  let count = 0;
  const notes = (ws.notes ?? []).map((n) => {
    if (!(n.tags ?? []).some((t) => fold(t) === a)) return n;
    count++;
    const next: string[] = [];
    for (const t of n.tags!) {
      const x = fold(t) === a ? target : t;
      if (!next.some((y) => fold(y) === fold(x))) next.push(x);
    }
    return { ...n, tags: next, changed: Date.now() };
  });
  const old = colorOf(ws, from);
  const tgt = fold(target) !== a ? colorOf(ws, target) : undefined;
  const map = Object.fromEntries(Object.entries(ws.tagColors ?? {}).filter(([k]) => fold(k) !== a && fold(k) !== fold(target)));
  const c = tgt ?? old;
  if (c) map[target] = c;
  const noteViews = (ws.noteViews ?? []).map((v) => {
    if (!v.hiddenTags?.includes(a)) return v;
    const h = [...new Set(v.hiddenTags.map((t) => (t === a ? fold(target) : t)))];
    return { ...v, hiddenTags: h };
  });
  return { ws: withColors({ ...ws, notes, noteViews }, map), notes: count };
}

/** Löschen im Board (wie Trello-Label löschen): Tag von allen Karten dieses Boards entfernen; unbenutzt → auch aus der Farbliste. */
export function removeTagIn(ws: Workspace, viewId: string, tag: string): { ws: Workspace; notes: number } {
  const v = No.viewById(ws, viewId);
  if (!v) return { ws, notes: 0 };
  const a = fold(tag);
  const inBoard = new Set(No.idsIn(v));
  let count = 0;
  const notes = (ws.notes ?? []).map((n) => {
    if (!inBoard.has(n.id) || !(n.tags ?? []).some((t) => fold(t) === a)) return n;
    count++;
    const rest = n.tags!.filter((t) => fold(t) !== a);
    const { tags: _t, ...plain } = n; // eslint-disable-line @typescript-eslint/no-unused-vars
    return rest.length ? { ...n, tags: rest, changed: Date.now() } : { ...plain, changed: Date.now() };
  });
  let out: Workspace = { ...ws, notes };
  const still = notes.some((n) => (n.tags ?? []).some((t) => fold(t) === a));
  if (!still) out = withColors(out, Object.fromEntries(Object.entries(ws.tagColors ?? {}).filter(([k]) => fold(k) !== a)));
  out = setHidden(out, viewId, tag, false);
  return { ws: out, notes: count };
}

/** Im Board ein- oder ausblenden (T4). */
export function setHidden(ws: Workspace, viewId: string, tag: string, hide: boolean): Workspace {
  const a = fold(tag);
  return {
    ...ws,
    noteViews: (ws.noteViews ?? []).map((v) => {
      if (v.id !== viewId) return v;
      const h = new Set(v.hiddenTags ?? []);
      if (hide) h.add(a);
      else h.delete(a);
      const { hiddenTags: _h, ...rest } = v; // eslint-disable-line @typescript-eslint/no-unused-vars
      return h.size ? { ...rest, hiddenTags: [...h].sort() } : rest;
    }),
  };
}

/** Beim Laden: nur gültige Farben, Namen getrimmt. */
export function parseTagColors(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const out: Record<string, string> = {};
  for (const [k, c] of Object.entries(raw as Record<string, unknown>)) {
    const name = k.trim();
    if (name && isTagColor(c) && !Object.keys(out).some((x) => fold(x) === fold(name))) out[name] = c;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Beim Laden einer Ansicht: ausgeblendete Tags (klein, ohne Doppelte). */
export function parseHiddenTags(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const h = [...new Set(raw.filter((t): t is string => typeof t === 'string' && !!t.trim()).map(fold))].sort();
  return h.length ? h : undefined;
}
