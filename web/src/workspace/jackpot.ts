/**
 * F-170: Slotmaschine – findet doppelt geöffnete Sources (gleiche Adresse in mehreren Tabs oder
 * Portalen, über alle Desks) und plant das Aufräumen. Nichts wird hier geschlossen: die Oberfläche
 * zeigt den Plan und schließt erst nach Bestätigung.
 */
import type { PanelMeta, Slot, Tab, Workspace } from './types';
import { sameUrlKey } from './bookmarks';
import { type Focus, type FocusColor, focusOf } from './focus';
import { TAB_MAX, areaLabel, closeTab, newId, panelUrl, removePanel } from './workspace';

/** Ein Fundort einer Source: Tab in einem Portal. */
export interface DupHit {
  panel: string;
  tab: string;
  /** Name des Portals */
  portal: string;
  /** Desk (Id aus Workspace.windows, '' = Main Desk) */
  win: string;
  /** Nummer des Tabs im Portal (ab 1) und Zahl der Tabs */
  tabNo: number;
  tabs: number;
  /** Dieser Tab ist im Portal vorn. */
  shown: boolean;
}

/** Eine Source, die mehrfach offen ist: einer bleibt, die anderen sind überzählig. */
export interface DupGroup {
  key: string;
  url: string;
  keep: DupHit;
  extra: DupHit[];
}

/**
 * Alle Sources, die mehr als einmal offen sind. Es bleibt der Fundort, der am ehesten gebraucht
 * wird: vorn im Portal vor Tab im Hintergrund, auf diesem Desk vor anderen Desks, sonst der erste.
 * Reihenfolge: meiste Fundorte zuerst.
 */
export function duplicatesOf(ws: Workspace, here = ''): DupGroup[] {
  const byKey = new Map<string, { url: string; hits: DupHit[] }>();
  for (const p of ws.panels) {
    p.tabs.forEach((t, i) => {
      if (!t.url) return;
      const key = sameUrlKey(t.url);
      const hit: DupHit = { panel: p.id, tab: t.id, portal: p.name, win: p.win ?? '', tabNo: i + 1, tabs: p.tabs.length, shown: p.activeTab === t.id };
      const g = byKey.get(key);
      if (g) g.hits.push(hit);
      else byKey.set(key, { url: t.url, hits: [hit] });
    });
  }
  const score = (h: DupHit) => (h.shown ? 2 : 0) + (h.win === here ? 1 : 0);
  const out: DupGroup[] = [];
  for (const [key, g] of byKey) {
    if (g.hits.length < 2) continue;
    const keep = g.hits.reduce((best, h) => (score(h) > score(best) ? h : best), g.hits[0]);
    out.push({ key, url: g.url, keep, extra: g.hits.filter((h) => h !== keep) });
  }
  return out.sort((a, b) => b.extra.length - a.extra.length);
}

/** Was „Schließen“ tut: ganze Portale (alle Tabs überzählig) und einzelne Tabs. */
export interface Cleanup {
  portals: string[];
  tabs: { panel: string; tab: string }[];
  /** Zahl der überzähligen Fundorte, die verschwinden */
  count: number;
}

/** Plan für die gewählten Gruppen (`skip` = Schlüssel der abgewählten). */
export function cleanupOf(ws: Workspace, groups: DupGroup[], skip: ReadonlySet<string> = new Set()): Cleanup {
  const extra = new Map<string, Set<string>>();
  let count = 0;
  for (const g of groups) {
    if (skip.has(g.key)) continue;
    for (const h of g.extra) {
      (extra.get(h.panel) ?? extra.set(h.panel, new Set()).get(h.panel)!).add(h.tab);
      count++;
    }
  }
  const portals: string[] = [];
  const tabs: Cleanup['tabs'] = [];
  for (const [panel, ids] of extra) {
    const p = ws.panels.find((x) => x.id === panel);
    if (!p) continue;
    // Sind alle Tabs eines Portals überzählig, geht das ganze Portal – sonst bliebe ein leerer Tab stehen.
    if (p.tabs.every((t) => ids.has(t.id))) portals.push(panel);
    else for (const tab of ids) tabs.push({ panel, tab });
  }
  return { portals, tabs, count };
}

/** Arbeitsfläche nach dem Aufräumen (für die Vorschau der Fokusanzeige und für Tests). */
export function afterCleanup(ws: Workspace, c: Cleanup): Workspace {
  let next = ws;
  for (const t of c.tabs) next = closeTab(next, t.panel, t.tab);
  for (const id of c.portals) next = removePanel(next, id);
  return next;
}

/** Fokus vorher und nachher. */
export function cleanupFocus(ws: Workspace, c: Cleanup): { before: Focus; after: Focus; saved: number } {
  const before = focusOf(ws);
  const after = focusOf(afterCleanup(ws, c));
  return { before, after, saved: before.points - after.points };
}

/** Kurzname einer Source für die Liste: Domain mit Pfad, z. B. „de.wikipedia.org/wiki/Hamburg“. */
export function sourceLabel(url: string): string {
  try {
    const x = new URL(url);
    const path = decodeURIComponent(x.pathname).replace(/\/+$/, '');
    const text = x.hostname.replace(/^www\./, '') + path;
    return text.length > 48 ? `${text.slice(0, 47)}…` : text;
  } catch {
    return url;
  }
}

/** Kürzester Name für eine Walze: letzter Teil des Pfads (Unterstriche als Leerzeichen), sonst die Domain. */
export function reelLabel(url: string): string {
  try {
    const x = new URL(url);
    const last = decodeURIComponent(x.pathname).replace(/\/+$/, '').split('/').pop() ?? '';
    // sehr kurze Teile (z. B. Sprachkürzel „de“) sagen nichts – dann die Domain
    return last.length > 3 ? last.replace(/_/g, ' ') : x.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// ---------------------------------------------------------------- F-170 Stufe 2: redundante Slots

/** Ein Slot, dessen Portale alle dieselbe Source zeigen (vorn im Portal). */
export interface RedundantSlot {
  /** Id der Area */
  area: string;
  /** Name des Slots */
  name: string;
  url: string;
  /** Portal, das bleibt (das vorn im Slot) */
  keep: string;
  /** Portale, die im bleibenden aufgehen */
  others: string[];
  /** Tabs der anderen Portale, die als neue Tabs ins bleibende wandern */
  moved: number;
  /** Tabs, die keinen Platz mehr haben (mehr als TAB_MAX) und mit geschlossen werden */
  dropped: number;
}

/** Tabs nach dem Zusammenlegen: die des bleibenden Portals, dann jede weitere Seite einmal (bis TAB_MAX). */
function mergedTabs(keep: PanelMeta, others: PanelMeta[]): { tabs: Tab[]; moved: number; dropped: number } {
  const seen = new Set(keep.tabs.filter((t) => t.url).map((t) => sameUrlKey(t.url!)));
  const tabs = [...keep.tabs];
  let moved = 0;
  let dropped = 0;
  for (const o of others)
    for (const t of o.tabs) {
      if (!t.url) continue;
      const k = sameUrlKey(t.url);
      if (seen.has(k)) continue;
      seen.add(k);
      if (tabs.length >= TAB_MAX) {
        dropped++;
        continue;
      }
      // neue Id: das alte Portal kommt in „Zuletzt geschlossen“ und behält dort seine Tabs
      tabs.push({ ...t, id: newId() });
      moved++;
    }
  return { tabs, moved, dropped };
}

/** Slots (eines Desks), in denen mindestens zwei Portale liegen und alle vorn dieselbe Source zeigen. */
export function redundantSlotsOf(ws: Workspace, slots: Slot[]): RedundantSlot[] {
  const out: RedundantSlot[] = [];
  for (const s of slots) {
    if (s.panels.length < 2) continue;
    const urls = s.panels.map((p) => panelUrl(p));
    if (urls.some((u) => !u)) continue;
    const key = sameUrlKey(urls[0]!);
    if (!urls.every((u) => sameUrlKey(u!) === key)) continue;
    const others = s.panels.filter((p) => p.id !== s.front.id);
    const { moved, dropped } = mergedTabs(s.front, others);
    out.push({ area: s.id, name: areaLabel(ws, s), url: urls[0]!, keep: s.front.id, others: others.map((p) => p.id), moved, dropped });
  }
  return out;
}

/** Zusammenlegen, Teil 1: weitere Seiten der anderen Portale als Tabs ins bleibende Portal (die anderen schließt die Oberfläche). */
export function mergeSlotTabs(ws: Workspace, keep: string, others: string[]): Workspace {
  const k = ws.panels.find((p) => p.id === keep);
  const os = others.map((id) => ws.panels.find((p) => p.id === id)).filter((p): p is PanelMeta => !!p);
  if (!k || !os.length) return ws;
  const { tabs, moved } = mergedTabs(k, os);
  if (!moved) return ws;
  return { ...ws, panels: ws.panels.map((p) => (p.id === keep ? { ...p, tabs } : p)) };
}

/** Zusammenlegen ganz (für Tests und Vorschau): Tabs übernehmen, andere Portale schließen. */
export function mergeSlot(ws: Workspace, r: RedundantSlot): Workspace {
  let next = mergeSlotTabs(ws, r.keep, r.others);
  for (const id of r.others) next = removePanel(next, id);
  return next;
}

// ---------------------------------------------------------------- F-170 Stufe 2: Einladung zur Runde

/** Ab so vielen Duplikaten lädt E-Sources zur Runde ein (Entscheidung V37). */
export const INVITE_DUPS = 3;
/** Höchstens eine Einladung je Stunde; „Später“ pausiert 4 Stunden. */
export const INVITE_PAUSE = 60 * 60 * 1000;
export const INVITE_LATER = 4 * 60 * 60 * 1000;
/** Merker (für alle Desk-Fenster gemeinsam): bis wann keine Einladung kommt. */
export const INVITE_KEY = 'esource.jackpot.invite.v1';

export type InviteWhy = 'red' | 'dups' | 'slots';

/** Grund für eine Einladung – oder null. Reihenfolge: Fokus rot, viele Duplikate, redundanter Slot. */
export function inviteWhy(ws: Workspace, slots: Slot[], color: FocusColor): InviteWhy | null {
  if (color === 'rot') return 'red';
  if (dupCount(ws) >= INVITE_DUPS) return 'dups';
  if (redundantSlotsOf(ws, slots).length) return 'slots';
  return null;
}

/** Zahl der überzähligen Fundorte über alle Desks. */
export const dupCount = (ws: Workspace) => duplicatesOf(ws).reduce((n, g) => n + g.extra.length, 0);
