import type { PanelMeta, Slot, Workspace } from './types';
import { areaLabel, hostOf, panelUrl, panelsIn, viewOf } from './workspace';
import { windowList } from './windows';
import { type ScreenSetup, specOf } from './screen';
import type { FRect } from './tree';
import { setupOfWindow } from './move';

// ---------------------------------------------------------------- F-29 Gesamtfokus

/**
 * Voreinstellung des Gesamtfokus (F-29, Entscheidung 22.11.2026; bis 9 grün, 10–13 gelb, 14–16 orange, ab 17 rot): Es zählen nur Panels und Tabs.
 * Jedes Panel zählt 1 Punkt, jeder weitere Tab `tabWeight` Punkte. Bis `greenMax` grün,
 * bis `yellowMax` gelb, bis `orangeMax` orange, darüber rot. Später in den Einstellungen änderbar.
 */
export interface FocusRule {
  tabWeight: number;
  greenMax: number;
  yellowMax: number;
  orangeMax: number;
}

export const FOCUS_RULE: FocusRule = { tabWeight: 0.5, greenMax: 9, yellowMax: 13, orangeMax: 16 };

export type FocusColor = 'aus' | 'grün' | 'gelb' | 'orange' | 'rot';

export interface Focus {
  points: number;
  panels: number;
  /** Tabs über den ersten je Panel hinaus. */
  extraTabs: number;
  /** Pegel 0 (nichts offen) bis 9, in der Farblogik der Ampel (F-26): 1–5 grün, 6 gelb, 7 orange, 8–9 rot. */
  level: number;
  color: FocusColor;
}

/** Pegel aus Punkten: grün in 5 gleichen Stufen bis `greenMax`, rot hat zwei Stufen. */
export function focusLevel(points: number, rule: FocusRule = FOCUS_RULE): number {
  if (points <= 0) return 0;
  if (points <= rule.greenMax) return Math.max(1, Math.ceil((points / rule.greenMax) * 5));
  if (points <= rule.yellowMax) return 6;
  if (points <= rule.orangeMax) return 7;
  return points <= rule.orangeMax + (rule.orangeMax - rule.yellowMax) ? 8 : 9;
}

export function colorOfLevel(level: number): FocusColor {
  if (level <= 0) return 'aus';
  if (level <= 5) return 'grün';
  if (level === 6) return 'gelb';
  return level === 7 ? 'orange' : 'rot';
}

/** Gesamtfokus der ganzen Arbeitsfläche (F-29). */
export function focusOf(ws: Workspace, rule: FocusRule = FOCUS_RULE): Focus {
  const panels = ws.panels.length;
  const extraTabs = ws.panels.reduce((n, p) => n + Math.max(0, p.tabs.length - 1), 0);
  const points = panels + extraTabs * rule.tabWeight;
  const level = focusLevel(points, rule);
  return { points, panels, extraTabs, level, color: colorOfLevel(level) };
}

/** Punktzahl lesbar, mit Komma statt Punkt (z. B. „7,5“). */
export const pointsText = (n: number) => String(n).replace('.', ',');

/** Satz für Bildschirmleser und Tooltip. */
export function focusText(f: Focus): string {
  if (f.panels === 0) return 'Gesamtfokus: nichts offen';
  const tabs = f.extraTabs ? `, ${f.extraTabs} weitere ${f.extraTabs === 1 ? 'Tab' : 'Tabs'}` : '';
  return `Gesamtfokus: ${f.color}, ${pointsText(f.points)} Punkte (${f.panels} ${f.panels === 1 ? 'Panel' : 'Panels'}${tabs})`;
}

// ---------------------------------------------------------------- F-28 Fokus-Radar (bisher Master-Panel)

export interface OverviewPanel {
  meta: PanelMeta;
  /** Sichtbar auf seiner Area (vorderstes im Stapel). */
  front: boolean;
  tabs: number;
  /** Domain der angezeigten Seite, leer bei leerem Tab. */
  host: string;
}

export interface OverviewArea {
  id: string;
  /** F-27: Fenster der Karte ('' = Hauptfenster). */
  win: string;
  /** F-27: Karte eines anderen Fensters (dessen Anordnung ist hier unbekannt: alle Panels in einer Karte). */
  other: boolean;
  /** F-27: Fenster ist gerade offen (nur bei anderen Fenstern aussagekräftig). */
  open: boolean;
  /** Name der Area (wie in der Kopfleiste nur bei Stapeln); sonst „Area 1“, „Area 2“ … */
  title: string;
  panels: OverviewPanel[];
}

const rowOf = (p: PanelMeta, front: boolean): OverviewPanel => {
  const url = panelUrl(p);
  return { meta: p, front, tabs: p.tabs.length, host: url ? hostOf(url) : '' };
};

/**
 * Alle Areas mit ihren Panels für die Übersicht, in der Reihenfolge der Anzeige. F-27: Danach je
 * anderes Fenster eine Karte mit seinen Panels (Hauptfenster zuerst); `open` = offene Fenster.
 */
export function overviewOf(ws: Workspace, slots: Slot[], win = '', open: Set<string> = new Set()): OverviewArea[] {
  const here = slots.map((s, i) => ({
    id: s.id,
    win,
    other: false,
    open: true,
    title: areaLabel(ws, s) || `Area ${i + 1}`,
    panels: s.panels.map((p) => rowOf(p, p.id === s.front.id)),
  }));
  const others = windowList(ws)
    .filter((w) => w.id !== win)
    .map((w) => ({
      id: `win:${w.id}`,
      win: w.id,
      other: true,
      open: open.has(w.id),
      title: w.name,
      panels: panelsIn(ws.panels, w.id).map((p) => rowOf(p, true)),
    }))
    .filter((a) => a.panels.length > 0);
  return [...here, ...others];
}

// ---------------------------------------------------------------- F-152 Fokus-Radar als Lagekarte

export interface RadarArea extends OverviewArea {
  /** Lage auf dem Bildschirm des Fensters (Anteile 0–1); null = Anordnung unbekannt. */
  rect: FRect | null;
}

export interface RadarWindow {
  win: string;
  title: string;
  /** Das Fenster, in dem das Radar gerade offen ist. */
  here: boolean;
  open: boolean;
  /** Breite : Höhe seines Bildschirms. */
  aspect: number;
  areas: RadarArea[];
}

/**
 * F-152: Alle Fenster als Lagekarte – je Fenster seine Areas an ihrer Stelle auf dem Bildschirm
 * (aus der zuletzt gesehenen Einstellung, F-28). Ohne bekannte Einstellung eine Kachel mit allen
 * Panels. Dieses Fenster zuerst, Fenster ohne Panels fallen weg.
 */
export function radarOf(ws: Workspace, slots: Slot[], setup: ScreenSetup, open: Set<string> = new Set()): RadarWindow[] {
  const win = setup.win ?? '';
  const out: RadarWindow[] = [];
  for (const w of windowList(ws)) {
    const here = w.id === win;
    const panels = panelsIn(ws.panels, w.id);
    if (!here && panels.length === 0) continue;
    const s = here ? setup : setupOfWindow(ws, w.id);
    const list = here ? slots : s ? viewOf(ws, s).slots : null;
    const isOpen = here || open.has(w.id);
    const areas: RadarArea[] = list
      ? list.map((sl, i) => ({
          id: here ? sl.id : `${w.id}:${sl.id}`,
          win: w.id,
          other: !here,
          open: isOpen,
          title: areaLabel(ws, sl) || (sl.panels.length === 1 ? sl.front.name : `Area ${i + 1}`),
          panels: sl.panels.map((p) => rowOf(p, p.id === sl.front.id)),
          rect: sl.rect,
        }))
      : [{ id: `win:${w.id}`, win: w.id, other: true, open: isOpen, title: 'Alle Panels', panels: panels.map((p) => rowOf(p, true)), rect: null }];
    out.push({ win: w.id, title: w.name, here, open: isOpen, aspect: s ? specOf(s).aspect : 1.6, areas });
  }
  return out.sort((a, b) => Number(b.here) - Number(a.here));
}

/** F-152: Treffer für das Filterfeld – Panelname, Area, Fenster oder Domain enthalten den Text. */
export function radarMatches(w: RadarWindow, a: RadarArea, x: OverviewPanel, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [x.meta.name, a.title, w.title, x.host].some((t) => t.toLowerCase().includes(q));
}
