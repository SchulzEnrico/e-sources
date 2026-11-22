import type { PanelMeta, Slot, Workspace } from './types';
import { areaLabel, hostOf, panelUrl } from './workspace';

// ---------------------------------------------------------------- F-29 Gesamtfokus

/**
 * Voreinstellung des Gesamtfokus (F-29, Entscheidung 22.11.2026): Es zählen nur Panels und Tabs.
 * Jedes Panel zählt 1 Punkt, jeder weitere Tab `tabWeight` Punkte. Bis `greenMax` grün,
 * bis `yellowMax` gelb, bis `orangeMax` orange, darüber rot. Später in den Einstellungen änderbar.
 */
export interface FocusRule {
  tabWeight: number;
  greenMax: number;
  yellowMax: number;
  orangeMax: number;
}

export const FOCUS_RULE: FocusRule = { tabWeight: 0.5, greenMax: 10, yellowMax: 14, orangeMax: 18 };

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

// ---------------------------------------------------------------- F-28 Master-Panel (Übersicht)

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
  /** Name der Area (wie in der Kopfleiste nur bei Stapeln); sonst „Area 1“, „Area 2“ … */
  title: string;
  panels: OverviewPanel[];
}

/** Alle Areas mit ihren Panels für die Übersicht, in der Reihenfolge der Anzeige. */
export function overviewOf(ws: Workspace, slots: Slot[]): OverviewArea[] {
  return slots.map((s, i) => ({
    id: s.id,
    title: areaLabel(ws, s) || `Area ${i + 1}`,
    panels: s.panels.map((p) => {
      const url = panelUrl(p);
      return { meta: p, front: p.id === s.front.id, tabs: p.tabs.length, host: url ? hostOf(url) : '' };
    }),
  }));
}
