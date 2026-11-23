/**
 * F-116 mit F-53 Stufe 1: Spaces und Cases. Ein Space ist ein Lebensbereich (z. B. Privat, Firma,
 * Schule), ein Case ein Fall darin (Kunde XY, Veranstaltung, Projekt). Ein Case gehört zu genau einem
 * Space. In Stufe 1 bündeln Cases nur Layouts (F-51): Ein Layout kann mehreren Cases zugeordnet sein;
 * wer einen Case wählt, bekommt dessen Layouts angeboten, bei genau einem wird es gleich gesetzt.
 *
 * Im Code heißen Spaces weiter `spheres`, Cases `scenarios` (Benennung F-154).
 * Die Zuordnung steht getrennt von den Layouts (`layoutCases`, Schlüssel „Desk|Layout“), weil
 * Layout-Einträge beim Wechseln neu aufgebaut werden.
 */
import type { Case, Space, Workspace } from './types';
import { type DeskLayout, layoutsOf, switchLayout } from './deskLayouts';

export type { Space, Case } from './types';

/** Farben zur Wahl (gut lesbar auf Hell und Dunkel). */
export const CASE_COLORS = ['#d3514a', '#e28a5b', '#ecb85c', '#64a970', '#66afe1', '#7f8fd0', '#b064a6', '#c8ccd6'] as const;

/** Höchstzahlen – halten Listen überschaubar. */
export const SPACE_MAX = 12;
export const CASE_MAX = 60;

const HEX = /^#[0-9a-f]{6}$/i;
const clean = (name: string) => name.replace(/\s+/g, ' ').trim().slice(0, 60);

export const layoutKey = (win: string, layout: string) => `${win}|${layout}`;

// ---------------------------------------------------------------- Lesen aus dem Speicher

export function parseSpaces(v: unknown): Space[] {
  if (!Array.isArray(v)) return [];
  const out: Space[] = [];
  for (const s of v) {
    if (!s || typeof s !== 'object') continue;
    const o = s as Record<string, unknown>;
    if (typeof o.id !== 'string' || typeof o.name !== 'string' || !clean(o.name) || out.some((x) => x.id === o.id)) continue;
    out.push({ id: o.id, name: clean(o.name), ...(typeof o.color === 'string' && HEX.test(o.color) ? { color: o.color } : {}) });
  }
  return out.slice(0, SPACE_MAX);
}

/** Cases ohne gültigen Space fallen weg. */
export function parseCases(v: unknown, spaces: Space[]): Case[] {
  if (!Array.isArray(v)) return [];
  const out: Case[] = [];
  for (const c of v) {
    if (!c || typeof c !== 'object') continue;
    const o = c as Record<string, unknown>;
    if (typeof o.id !== 'string' || typeof o.name !== 'string' || !clean(o.name) || out.some((x) => x.id === o.id)) continue;
    if (typeof o.space !== 'string' || !spaces.some((s) => s.id === o.space)) continue;
    out.push({ id: o.id, name: clean(o.name), space: o.space, ...(typeof o.color === 'string' && HEX.test(o.color) ? { color: o.color } : {}) });
  }
  return out.slice(0, CASE_MAX);
}

/** Zuordnung Layout → Cases; nur bekannte Cases, leere Einträge fallen weg. */
export function parseLayoutCases(v: unknown, cases: Case[]): Record<string, string[]> | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const out: Record<string, string[]> = {};
  for (const [k, ids] of Object.entries(v as Record<string, unknown>)) {
    if (!k.includes('|') || !Array.isArray(ids)) continue;
    const ok = [...new Set(ids.filter((id): id is string => typeof id === 'string' && cases.some((c) => c.id === id)))];
    if (ok.length) out[k] = ok;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Gewählter Case je Desk; nur bekannte Cases. */
export function parseActiveCase(v: unknown, cases: Case[]): Record<string, string> | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const out: Record<string, string> = {};
  for (const [win, id] of Object.entries(v as Record<string, unknown>)) if (typeof id === 'string' && cases.some((c) => c.id === id)) out[win] = id;
  return Object.keys(out).length ? out : undefined;
}

// ---------------------------------------------------------------- Spaces

export const spacesOf = (ws: Workspace): Space[] => ws.spheres;
export const casesOf = (ws: Workspace): Case[] => ws.scenarios;
export const casesIn = (ws: Workspace, space: string): Case[] => casesOf(ws).filter((c) => c.space === space);

/** Name ohne Doppel (gleiche Namen bekommen eine Nummer). */
function freeName(taken: string[], name: string): string {
  const base = clean(name);
  const lower = taken.map((t) => t.toLowerCase());
  if (!lower.includes(base.toLowerCase())) return base;
  for (let i = 2; ; i++) if (!lower.includes(`${base} ${i}`.toLowerCase())) return `${base} ${i}`;
}

export function addSpace(ws: Workspace, name: string, newId: () => string, color?: string): { ws: Workspace; id: string | null } {
  const spaces = spacesOf(ws);
  if (!clean(name) || spaces.length >= SPACE_MAX) return { ws, id: null };
  const id = newId();
  const space: Space = { id, name: freeName(spaces.map((s) => s.name), name), ...(color && HEX.test(color) ? { color } : {}) };
  return { ws: { ...ws, spheres: [...spaces, space] }, id };
}

export function editSpace(ws: Workspace, id: string, change: { name?: string; color?: string | null }): Workspace {
  const spaces = spacesOf(ws);
  const s = spaces.find((x) => x.id === id);
  if (!s) return ws;
  const name = change.name !== undefined && clean(change.name) ? freeName(spaces.filter((x) => x.id !== id).map((x) => x.name), change.name) : s.name;
  const { color: _c, ...rest } = s; // eslint-disable-line @typescript-eslint/no-unused-vars
  const color = change.color === null ? undefined : change.color && HEX.test(change.color) ? change.color : s.color;
  return { ...ws, spheres: spaces.map((x) => (x.id === id ? { ...rest, name, ...(color ? { color } : {}) } : x)) };
}

/** Löscht den Space samt seinen Cases (und deren Zuordnungen). */
export function deleteSpace(ws: Workspace, id: string): Workspace {
  const gone = casesIn(ws, id).map((c) => c.id);
  let next: Workspace = { ...ws, spheres: spacesOf(ws).filter((s) => s.id !== id) };
  for (const c of gone) next = deleteCase(next, c);
  return { ...next, panels: next.panels.map((p) => (p.sphere === id ? dropKey(p, 'sphere') : p)) };
}

// ---------------------------------------------------------------- Cases

export function addCase(ws: Workspace, space: string, name: string, newId: () => string, color?: string): { ws: Workspace; id: string | null } {
  const cases = casesOf(ws);
  if (!clean(name) || cases.length >= CASE_MAX || !spacesOf(ws).some((s) => s.id === space)) return { ws, id: null };
  const id = newId();
  const c: Case = { id, name: freeName(casesIn(ws, space).map((x) => x.name), name), space, ...(color && HEX.test(color) ? { color } : {}) };
  return { ws: { ...ws, scenarios: [...cases, c] }, id };
}

export function editCase(ws: Workspace, id: string, change: { name?: string; color?: string | null; space?: string }): Workspace {
  const cases = casesOf(ws);
  const c = cases.find((x) => x.id === id);
  if (!c) return ws;
  const space = change.space && spacesOf(ws).some((s) => s.id === change.space) ? change.space : c.space;
  const others = cases.filter((x) => x.id !== id && x.space === space).map((x) => x.name);
  const name = freeName(others, change.name !== undefined && clean(change.name) ? change.name : c.name);
  const { color: _c, ...rest } = c; // eslint-disable-line @typescript-eslint/no-unused-vars
  const color = change.color === null ? undefined : change.color && HEX.test(change.color) ? change.color : c.color;
  return { ...ws, scenarios: cases.map((x) => (x.id === id ? { ...rest, name, space, ...(color ? { color } : {}) } : x)) };
}

export function deleteCase(ws: Workspace, id: string): Workspace {
  const layoutCases: Record<string, string[]> = {};
  for (const [k, ids] of Object.entries(ws.layoutCases ?? {})) {
    const rest = ids.filter((x) => x !== id);
    if (rest.length) layoutCases[k] = rest;
  }
  const activeCase = Object.fromEntries(Object.entries(ws.activeCase ?? {}).filter(([, c]) => c !== id));
  const { layoutCases: _l, activeCase: _a, ...base } = ws; // eslint-disable-line @typescript-eslint/no-unused-vars
  return {
    ...base,
    scenarios: casesOf(ws).filter((c) => c.id !== id),
    panels: ws.panels.map((p) => (p.scenario === id ? dropKey(p, 'scenario') : p)),
    ...(Object.keys(layoutCases).length ? { layoutCases } : {}),
    ...(Object.keys(activeCase).length ? { activeCase } : {}),
  };
}

function dropKey<T extends object, K extends keyof T>(o: T, k: K): Omit<T, K> {
  const { [k]: _drop, ...rest } = o; // eslint-disable-line @typescript-eslint/no-unused-vars
  return rest;
}

// ---------------------------------------------------------------- Layouts zuordnen

export const casesOfLayout = (ws: Workspace, win: string, layout: string): Case[] => {
  const ids = ws.layoutCases?.[layoutKey(win, layout)] ?? [];
  return casesOf(ws).filter((c) => ids.includes(c.id));
};

/** Ordnet ein Layout einem Case zu oder nimmt die Zuordnung weg. */
export function setLayoutCase(ws: Workspace, win: string, layout: string, caseId: string, on: boolean): Workspace {
  if (!casesOf(ws).some((c) => c.id === caseId)) return ws;
  const key = layoutKey(win, layout);
  const cur = ws.layoutCases?.[key] ?? [];
  const next = on ? (cur.includes(caseId) ? cur : [...cur, caseId]) : cur.filter((x) => x !== caseId);
  const all = { ...ws.layoutCases, [key]: next };
  if (!next.length) delete all[key];
  const { layoutCases: _l, ...base } = ws; // eslint-disable-line @typescript-eslint/no-unused-vars
  return Object.keys(all).length ? { ...base, layoutCases: all } : base;
}

/** Layouts dieses Desks, die zum Case gehören (in der Reihenfolge der Layout-Liste). */
export function layoutsForCase(ws: Workspace, win: string, caseId: string): DeskLayout[] {
  return layoutsOf(ws, win).list.filter((l) => ws.layoutCases?.[layoutKey(win, l.id)]?.includes(caseId));
}

/**
 * Case wählen (oder mit null abwählen). Gehört genau ein Layout dazu, wird es gesetzt; sonst kommen
 * die passenden Layouts als Angebot zurück (`offer`, leer = keins zugeordnet).
 */
export function pickCase(ws: Workspace, win: string, caseId: string | null): { ws: Workspace; offer: DeskLayout[]; switched: DeskLayout | null } {
  const activeCase = { ...ws.activeCase };
  if (!caseId || !casesOf(ws).some((c) => c.id === caseId)) {
    delete activeCase[win];
    const { activeCase: _a, ...base } = ws; // eslint-disable-line @typescript-eslint/no-unused-vars
    return { ws: Object.keys(activeCase).length ? { ...base, activeCase } : base, offer: [], switched: null };
  }
  activeCase[win] = caseId;
  let next: Workspace = { ...ws, activeCase };
  const offer = layoutsForCase(next, win, caseId);
  if (offer.length === 1) {
    const l = offer[0];
    next = switchLayout(next, win, l.id);
    return { ws: next, offer, switched: l };
  }
  return { ws: next, offer, switched: null };
}

// ---------------------------------------------------------------- Rückgängig, Farben (V54)

/** Stand von Spaces und Cases für „Rückgängig“ nach dem Löschen. */
export type CasesSnap = Pick<Workspace, 'spheres' | 'scenarios' | 'layoutCases' | 'activeCase'>;

export const snapCases = (ws: Workspace): CasesSnap => ({ spheres: ws.spheres, scenarios: ws.scenarios, layoutCases: ws.layoutCases, activeCase: ws.activeCase });

/** Setzt den gemerkten Stand wieder ein; Zuordnungen zu inzwischen gelöschten Layouts schaden nicht. */
export function restoreCases(ws: Workspace, snap: CasesSnap): Workspace {
  const { layoutCases: _l, activeCase: _a, ...base } = ws; // eslint-disable-line @typescript-eslint/no-unused-vars
  return { ...base, spheres: snap.spheres, scenarios: snap.scenarios, ...(snap.layoutCases ? { layoutCases: snap.layoutCases } : {}), ...(snap.activeCase ? { activeCase: snap.activeCase } : {}) };
}

/** Erste noch nicht benutzte Farbe (sonst reihum). */
export function nextColor(used: (string | undefined)[]): string {
  return CASE_COLORS.find((c) => !used.includes(c)) ?? CASE_COLORS[used.length % CASE_COLORS.length];
}

/** Zuordnungen eines gelöschten Layouts entfernen. */
export function dropLayoutCases(ws: Workspace, win: string, layout: string): Workspace {
  const key = layoutKey(win, layout);
  if (!ws.layoutCases?.[key]) return ws;
  const all = { ...ws.layoutCases };
  delete all[key];
  const { layoutCases: _l, ...base } = ws; // eslint-disable-line @typescript-eslint/no-unused-vars
  return Object.keys(all).length ? { ...base, layoutCases: all } : base;
}

/** Suche (V54): Cases, deren Name oder Space alle Wörter enthält; Treffer im Case-Namen vorn. */
export function searchCases(ws: Workspace, query: string, max = 4): { c: Case; space: Space }[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const all = casesOf(ws).flatMap((c) => {
    const space = spacesOf(ws).find((s) => s.id === c.space);
    return space ? [{ c, space }] : [];
  });
  const found = all.filter((h) => words.every((w) => `${h.c.name} ${h.space.name}`.toLowerCase().includes(w)));
  const inName = (h: { c: Case }) => words.every((w) => h.c.name.toLowerCase().includes(w));
  return [...found.filter(inName), ...found.filter((h) => !inName(h))].slice(0, max);
}

export const activeCaseOf = (ws: Workspace, win: string): Case | undefined => {
  const id = ws.activeCase?.[win];
  return id ? casesOf(ws).find((c) => c.id === id) : undefined;
};
