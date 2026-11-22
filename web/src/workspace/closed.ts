/**
 * F-24: Zuletzt geschlossene Portale und Tabs wiederherstellen. Je Desk die letzten
 * CLOSED_MAX Einträge, neueste zuerst; bleibt beim Neuladen erhalten (Workspace.closed).
 */
import type { ScreenSetup } from './screen';
import type { Closed, PanelMeta, Workspace } from './types';
import { TAB_MAX, addPanel, newId, removePanel, tabLabel, viewOf, areaOf } from './workspace';

export const CLOSED_MAX = 10;

/** Einträge eines Desks ('' = Main Desk), neueste zuerst. */
export function closedOf(ws: Workspace, win = ''): Closed[] {
  return (ws.closed ?? []).filter((c) => c.win === win);
}

/** Neuer Eintrag vorn; je Desk bleiben höchstens CLOSED_MAX. */
function remember(ws: Workspace, entry: Closed): Workspace {
  const all = [entry, ...(ws.closed ?? [])];
  let mine = 0;
  const closed = all.filter((c) => c.win !== entry.win || ++mine <= CLOSED_MAX);
  return { ...ws, closed };
}

const hasPage = (p: PanelMeta) => p.tabs.some((t) => !!t.url);

/** Portal schließen und merken (leere Portale ohne Seite nicht). */
export function closePanel(ws: Workspace, id: string, setup: ScreenSetup): Workspace {
  const p = ws.panels.find((x) => x.id === id);
  if (!p) return ws;
  const out = removePanel(ws, id);
  if (!hasPage(p)) return out;
  const area = areaOf(viewOf(ws, setup), id) ?? undefined;
  return remember(out, { id: newId(), kind: 'portal', win: p.win ?? '', at: Date.now(), panel: p, area });
}

/** Tab schließen und merken (leere Tabs nicht). Schließt das Portal den Tab gar nicht (unbekannt), bleibt alles. */
export function closeTabRemember(ws: Workspace, id: string, tabId: string, close: (ws: Workspace) => Workspace): Workspace {
  const p = ws.panels.find((x) => x.id === id);
  const index = p?.tabs.findIndex((t) => t.id === tabId) ?? -1;
  const out = close(ws);
  if (!p || index < 0 || out === ws || !p.tabs[index].url) return out;
  return remember(out, { id: newId(), kind: 'tab', win: p.win ?? '', at: Date.now(), tab: p.tabs[index], index, panelId: id, panelName: p.name });
}

export type RestoreResult = { ws: Workspace; result: 'ok' | 'none' | 'full'; entry?: Closed; panel?: string };

/**
 * Eintrag wiederherstellen (ohne `entryId` den neuesten dieses Desks). Ein Portal kommt mit Tabs und
 * Verlauf auf seinen alten Slot, sonst wie ein neues Portal (Slot ganz rechts); ein Tab an seine alte
 * Stelle im Portal – gibt es das Portal nicht mehr, kommt er in ein neues Portal mit dem alten Namen.
 */
export function restoreClosed(ws: Workspace, setup: ScreenSetup, entryId?: string): RestoreResult {
  const win = setup.win ?? '';
  const entry = entryId ? (ws.closed ?? []).find((c) => c.id === entryId) : closedOf(ws, win)[0];
  if (!entry) return { ws, result: 'none' };
  const rest: Workspace = { ...ws, closed: (ws.closed ?? []).filter((c) => c.id !== entry.id) };

  // als neues Portal einsetzen und mit den gemerkten Daten füllen
  const place = (meta: PanelMeta, area?: string): RestoreResult => {
    const id = ws.panels.some((x) => x.id === meta.id) ? newId() : meta.id;
    let next = area ? addPanel(rest, setup, area, id) : rest;
    if (next === rest) next = addPanel(rest, setup, undefined, id);
    if (next === rest) return { ws, result: 'full', entry };
    const made = next.panels.find((x) => x.id === id)!;
    const panels = next.panels.map((x) => (x.id === id ? { ...meta, id, win: made.win, areaName: made.areaName } : x));
    for (const p of panels) if (p.id === id && !p.win) delete p.win;
    for (const p of panels) if (p.id === id && !p.areaName) delete p.areaName;
    return { ws: { ...next, panels, nextNumber: rest.nextNumber }, result: 'ok', entry, panel: id };
  };

  if (entry.kind === 'portal') return place(entry.panel, entry.area);
  const owner = rest.panels.find((x) => x.id === entry.panelId);
  if (owner) {
    if (owner.tabs.length >= TAB_MAX) return { ws, result: 'full', entry };
    const tab = owner.tabs.some((t) => t.id === entry.tab.id) ? { ...entry.tab, id: newId() } : entry.tab;
    // ein einzelner leerer Tab wird ersetzt
    const onlyEmpty = owner.tabs.length === 1 && !owner.tabs[0].url;
    const tabs = onlyEmpty ? [tab] : [...owner.tabs.slice(0, entry.index), tab, ...owner.tabs.slice(entry.index)];
    const panels = rest.panels.map((x) => (x.id === owner.id ? { ...x, tabs, activeTab: tab.id } : x));
    return { ws: { ...rest, panels }, result: 'ok', entry, panel: owner.id };
  }
  // alte Portal-Id: App und Reducer kommen so auf dieselbe Id
  return place({ id: entry.panelId, name: entry.panelName, tabs: [entry.tab], activeTab: entry.tab.id });
}

/** Kurzer Name eines Eintrags für Liste und Ansage. */
export function closedLabel(c: Closed): string {
  if (c.kind === 'tab') return `Tab ${tabLabel(c.tab)} aus „${c.panelName}“`;
  const n = c.panel.tabs.length;
  return `Portal „${c.panel.name}“${n > 1 ? ` mit ${n} Tabs` : ''}`;
}

/** Ansage nach dem Wiederherstellen bzw. wenn es nicht geht. */
export function restoredSaid(r: RestoreResult): string {
  if (r.result === 'none') return 'Nichts zum Wiederherstellen – auf diesem Desk wurde noch nichts geschlossen.';
  const label = r.entry ? closedLabel(r.entry) : '';
  if (r.result === 'full')
    return r.entry?.kind === 'tab' ? `${label} lässt sich nicht zurückholen: Das Portal hat schon ${TAB_MAX} Tabs.` : `${label} lässt sich nicht zurückholen: Kein Platz auf diesem Desk. Schließe vorher ein Portal.`;
  return `${label} wiederhergestellt.`;
}

/** Wie lange her, grob: „gerade eben“, „vor 5 Min.“, „vor 2 Std.“, sonst Datum. */
export function agoText(at: number, now = Date.now()): string {
  const min = Math.round((now - at) / 60000);
  if (min < 1) return 'gerade eben';
  if (min < 60) return `vor ${min} Min.`;
  if (min < 60 * 24) return `vor ${Math.round(min / 60)} Std.`;
  return new Date(at).toLocaleDateString('de-DE');
}
