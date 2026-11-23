/**
 * F-164: Regelübersicht. Sammelt alle Verhaltensregeln der Anwendung an einer Stelle, je Regel ein
 * Satz in Klartext:
 * - Farbregeln je Kategorie (F-163) – anlegen, ändern, ein/aus, löschen,
 * - Seite → Kategorie (gemerkte Wahl je Domain, F-163) – anlegen, ändern, ein/aus, löschen,
 * - eingebaute Regeln (Kategorie erfragen, Farbe anbieten, Ansage beim Sammeln F-160) – nur ein/aus.
 * Ausgeschaltete Regeln stehen in Workspace.rulesOff (wandert mit Export/Import der Desks).
 */
import { NO_CATEGORY } from './bookmarks';
import { ACCENTS } from './look';
import { RULES_TEXT } from './terms';
import type { Tint, Workspace } from './types';

export type BuiltinRule = 'ask' | 'offer' | 'invite' | 'collect';
export const BUILTIN_RULES: BuiltinRule[] = ['ask', 'offer', 'invite', 'collect'];

export type RuleKind = 'tint' | 'site' | 'builtin';

export interface RuleRow {
  /** tint:<Kategorie-Id>, site:<Domain> oder der Name der eingebauten Regel. */
  id: string;
  kind: RuleKind;
  /** Kurzer Name (Kategorie, Domain, Regelname). */
  name: string;
  /** Was die Regel bewirkt, in einem Satz. */
  text: string;
  on: boolean;
  /** Kategorie-Id (tint, site; '' = ohne). */
  category?: string;
  tint?: Tint;
  /** Wie viele Portale die Regel gerade betrifft (tint). */
  portals?: number;
}

export const tintRuleId = (cat: string) => `tint:${cat}`;
export const siteRuleId = (domain: string) => `site:${domain}`;

/** Eingebaute Regeln, die ab Werk aus sind (Enrico, 22.11.2026: „Farbe anbieten“). Eingeschaltet stehen sie in rulesOn. */
export const DEFAULT_OFF: BuiltinRule[] = ['offer'];
const defaultOff = (id: string) => (DEFAULT_OFF as string[]).includes(id);

/** Ist die Regel eingeschaltet? (Grundeinstellung: ja, außer DEFAULT_OFF) */
export const ruleOn = (ws: Workspace, id: string) => (defaultOff(id) ? !!ws.rulesOn?.includes(id) : !ws.rulesOff?.includes(id));

/** Regel ein- oder ausschalten. */
export function setRuleOn(ws: Workspace, id: string, on: boolean): Workspace {
  if (defaultOff(id)) {
    const list = ws.rulesOn ?? [];
    if (on === list.includes(id)) return ws;
    const next = on ? [...list, id] : list.filter((x) => x !== id);
    const { rulesOn: _old, ...rest } = ws;
    return next.length ? { ...rest, rulesOn: next } : rest;
  }
  const off = ws.rulesOff ?? [];
  if (on === !off.includes(id)) return ws;
  const next = on ? off.filter((x) => x !== id) : [...off, id];
  const { rulesOff: _old, ...rest } = ws;
  return next.length ? { ...rest, rulesOff: next } : rest;
}

/** Name einer Farbe für den Klartext: Name aus der Farbliste, sonst „eigene Farbe“. */
export const colorName = (hex: string) => ACCENTS.find((a) => !a.theme && a.hex === hex)?.name ?? RULES_TEXT.ownColor(hex);

const catName = (ws: Workspace, id: string) => ws.categories.find((c) => c.id === id)?.name;

/** Alle Regeln in fester Reihenfolge: Farbregeln (Reihenfolge der Kategorien), Seiten (alphabetisch), eingebaute. */
export function ruleList(ws: Workspace): RuleRow[] {
  const rows: RuleRow[] = [];
  for (const c of ws.categories) {
    if (!c.tint) continue;
    const id = tintRuleId(c.id);
    const portals = ws.panels.filter((p) => p.category === c.id).length;
    rows.push({ id, kind: 'tint', name: c.name, text: RULES_TEXT.tintText(c.name, c.tint.frame && colorName(c.tint.frame), c.tint.accent && colorName(c.tint.accent), portals), on: ruleOn(ws, id), category: c.id, tint: c.tint, portals });
  }
  const sites = Object.entries(ws.siteCategory ?? {}).sort((a, b) => a[0].localeCompare(b[0]));
  for (const [domain, cat] of sites) {
    const id = siteRuleId(domain);
    const name = cat === NO_CATEGORY ? null : (catName(ws, cat) ?? null);
    rows.push({ id, kind: 'site', name: domain, text: RULES_TEXT.siteText(domain, name), on: ruleOn(ws, id), category: cat });
  }
  for (const b of BUILTIN_RULES) rows.push({ id: b, kind: 'builtin', name: RULES_TEXT.builtin[b].name, text: RULES_TEXT.builtin[b].text, on: ruleOn(ws, b) });
  return rows;
}

/** Seite → Kategorie anlegen oder ändern ('' = ohne). Domain klein, ohne „www.“ und ohne Pfad. */
export function cleanDomain(input: string): string {
  let s = input.trim().toLowerCase();
  s = s.replace(/^[a-z]+:\/\//, '').replace(/[/?#].*$/, '').replace(/:\d+$/, '').replace(/^www\./, '');
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(s) || s === 'localhost' ? s : '';
}

export function setSiteCategory(ws: Workspace, domain: string, cat: string): Workspace {
  const d = cleanDomain(domain);
  if (!d || (cat !== NO_CATEGORY && !ws.categories.some((c) => c.id === cat))) return ws;
  if (ws.siteCategory?.[d] === cat) return ws;
  return { ...ws, siteCategory: { ...ws.siteCategory, [d]: cat } };
}

/** F-164: gemerkter Stand einer gelöschten Regel – für „Rückgängig“. */
export interface RuleUndo {
  id: string;
  tint?: Tint;
  site?: string;
  off: boolean;
}

/** Regel löschen (eingebaute lassen sich nicht löschen); gibt den alten Stand mit. */
export function deleteRule(ws: Workspace, id: string): { ws: Workspace; undo: RuleUndo | null } {
  const off = !ruleOn(ws, id);
  if (id.startsWith('tint:')) {
    const cid = id.slice(5);
    const c = ws.categories.find((x) => x.id === cid);
    if (!c?.tint) return { ws, undo: null };
    const categories = ws.categories.map((x) => {
      if (x.id !== cid) return x;
      const { tint: _t, ...rest } = x;
      return rest;
    });
    return { ws: setRuleOn({ ...ws, categories }, id, true), undo: { id, tint: c.tint, off } };
  }
  if (id.startsWith('site:')) {
    const d = id.slice(5);
    const v = ws.siteCategory?.[d];
    if (v === undefined) return { ws, undo: null };
    const { [d]: _gone, ...siteCategory } = ws.siteCategory ?? {};
    const { siteCategory: _s, ...rest } = ws;
    const next: Workspace = Object.keys(siteCategory).length ? { ...rest, siteCategory } : rest;
    return { ws: setRuleOn(next, id, true), undo: { id, site: v, off } };
  }
  return { ws, undo: null };
}

/** „Rückgängig“: gelöschte Regel wieder anlegen (nur, wenn ihre Kategorie noch da ist). */
export function restoreRule(ws: Workspace, u: RuleUndo): Workspace {
  let next = ws;
  if (u.id.startsWith('tint:') && u.tint) {
    const cid = u.id.slice(5);
    if (!ws.categories.some((c) => c.id === cid)) return ws;
    next = { ...ws, categories: ws.categories.map((c) => (c.id === cid ? { ...c, tint: u.tint } : c)) };
  } else if (u.id.startsWith('site:') && u.site !== undefined) {
    next = setSiteCategory(ws, u.id.slice(5), u.site);
    if (next === ws && ws.siteCategory?.[u.id.slice(5)] !== u.site) return ws;
  } else return ws;
  return setRuleOn(next, u.id, !u.off);
}
