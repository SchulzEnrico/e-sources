/**
 * F-163: Farbregeln über Kategorien. Es gelten die Kategorien der Library (F-30): Jede kann eine
 * Rahmen- und optional eine Akzentfarbe haben; sie gilt für alle Portale dieser Kategorie.
 * Vorrang der Farben: Portal → Slot → Kategorie → Desk (Entscheidung Enrico, 22.11.2026).
 * Bekommt ein Portal seine erste Adresse, fragt E-Sources nach der Kategorie (Vorschlag vorausgewählt);
 * die Wahl wird je Domain gemerkt und ist beim nächsten Mal der Vorschlag.
 */
import { NO_CATEGORY, addCategory, categoryByName, sameUrl } from './bookmarks';
import { domainOf, knownCategory } from './sortHelp';
import { type TintKind, mergeTint, sameTint } from './tint';
import type { Category, PanelMeta, Tint, Workspace } from './types';

/** Woher ein Vorschlag kommt – für den Hinweistext. */
export type SuggestFrom = 'source' | 'site' | 'library' | 'known';

export interface CategorySuggestion {
  /** Id einer vorhandenen Kategorie; '' = „ohne“ (gemerkt); fehlt = Kategorie gibt es noch nicht (wird angelegt). */
  id?: string;
  /** Name der Kategorie; leer bei „ohne“. */
  name: string;
  from: SuggestFrom;
}

const exists = (ws: Workspace, id: string) => ws.categories.some((c) => c.id === id);

/**
 * Vorschlag für eine Adresse:
 * 1. eine Source mit genau dieser Adresse (ihre Kategorie),
 * 2. die gemerkte Wahl für die Domain,
 * 3. die häufigste Kategorie der Sources dieser Domain (lernt aus der Library),
 * 4. bekannte Seiten (youtube.com → Video …, wie die Sortierhilfe).
 */
export function suggestCategory(ws: Workspace, url: string | undefined): CategorySuggestion | null {
  if (!url) return null;
  const name = (id: string) => ws.categories.find((c) => c.id === id)?.name ?? '';
  const src = ws.bookmarks.find((b) => sameUrl(b.url, url) && exists(ws, b.category));
  if (src) return { id: src.category, name: name(src.category), from: 'source' };
  const domain = domainOf(url);
  // F-164: ausgeschaltete Zuordnung Seite → Kategorie zählt nicht
  const site = ws.rulesOff?.includes(`site:${domain}`) ? undefined : ws.siteCategory?.[domain];
  if (site !== undefined && (site === NO_CATEGORY || exists(ws, site))) return { id: site, name: name(site), from: 'site' };
  const count = new Map<string, number>();
  for (const b of ws.bookmarks) if (exists(ws, b.category) && domainOf(b.url) === domain) count.set(b.category, (count.get(b.category) ?? 0) + 1);
  const best = [...count].sort((a, b) => b[1] - a[1])[0];
  if (best) return { id: best[0], name: name(best[0]), from: 'library' };
  const known = knownCategory(domain);
  if (known) {
    const c = categoryByName(ws, known);
    return c ? { id: c.id, name: c.name, from: 'known' } : { name: known, from: 'known' };
  }
  return null;
}

/** Kategorie eines Portals; fehlt, wenn keine gewählt oder sie gelöscht ist. */
export function categoryOf(ws: Workspace, panel: PanelMeta): Category | undefined {
  return panel.category ? ws.categories.find((c) => c.id === panel.category) : undefined;
}

/**
 * Kategorie eines Portals setzen ('' = ohne). Mit `url` wird die Wahl für deren Domain gemerkt
 * (Vorschlag beim nächsten Portal dieser Seite).
 */
export function setPanelCategory(ws: Workspace, panelId: string, id: string, url?: string): Workspace {
  if (id !== NO_CATEGORY && !exists(ws, id)) return ws;
  if (!ws.panels.some((p) => p.id === panelId)) return ws;
  const panels = ws.panels.map((p) => (p.id === panelId ? { ...p, category: id } : p));
  const domain = url ? domainOf(url) : '';
  const siteCategory = domain ? { ...ws.siteCategory, [domain]: id } : ws.siteCategory;
  return { ...ws, panels, ...(siteCategory ? { siteCategory } : {}) };
}

/** Neue Kategorie anlegen (oder vorhandene gleichen Namens nehmen) und dem Portal geben. */
export function setPanelNewCategory(ws: Workspace, panelId: string, name: string, makeId: () => string, url?: string): Workspace {
  const n = name.trim();
  if (!n) return ws;
  const next = categoryByName(ws, n) ? ws : addCategory(ws, makeId(), n);
  const cat = categoryByName(next, n);
  return cat ? setPanelCategory(next, panelId, cat.id, url) : ws;
}

/** Farben einer Kategorie ändern (null = Farbe löschen). */
export function setCategoryTint(ws: Workspace, id: string, change: Partial<Record<TintKind, string | null>>): Workspace {
  const c = ws.categories.find((x) => x.id === id);
  if (!c) return ws;
  const tint = mergeTint(c.tint, change);
  if (sameTint(tint, c.tint)) return ws;
  const categories = ws.categories.map((x): Category => {
    if (x.id !== id) return x;
    const { tint: _old, ...rest } = x;
    return tint ? { ...rest, tint } : rest;
  });
  return { ...ws, categories };
}

/** Wie viele Portale zu einer Kategorie gehören (für „gilt für n Portale“). */
export const categoryPortals = (ws: Workspace, id: string) => ws.panels.filter((p) => p.category === id).length;

/** Farbe der Kategorie eines Portals (ohne Vererbung). */
export const categoryTint = (ws: Workspace, panel: PanelMeta): Tint | undefined => {
  const c = categoryOf(ws, panel);
  // F-164: ausgeschaltete Farbregel gilt nicht
  return c && !ws.rulesOff?.includes(`tint:${c.id}`) ? c.tint : undefined;
};
