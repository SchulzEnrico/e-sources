import type { PanelMeta, Slot, Workspace } from './types';
import { areaLabel, hostOf, panelUrl, panelsIn, viewOf } from './workspace';
import { windowList } from './windows';
import { type ScreenSetup, specOf } from './screen';
import * as T from './tree';
import type { FRect } from './tree';
import { setupOfWindow } from './move';

// ---------------------------------------------------------------- F-29 Gesamtfokus

/**
 * Voreinstellung des Gesamtfokus (F-29, Entscheidung 22.11.2026; bis 9 grün, 10–13 gelb, 14–16 orange, ab 17 rot): Es zählen nur Panels und Tabs.
 * Jedes Panel zählt 1 Punkt, jeder weitere Tab `tabWeight` Punkte. Bis `greenMax` grün,
 * bis `yellowMax` gelb, bis `orangeMax` orange, darüber rot. F-29 Rest: in den Einstellungen änderbar
 * (Workspace.focus); fehlt sie, gilt FOCUS_RULE.
 */
export interface FocusRule {
  tabWeight: number;
  greenMax: number;
  yellowMax: number;
  orangeMax: number;
}

export const FOCUS_RULE: FocusRule = { tabWeight: 0.5, greenMax: 9, yellowMax: 13, orangeMax: 16 };

/** Wahl für das Gewicht eines weiteren Tabs. */
export const TAB_WEIGHTS = [0, 0.25, 0.5, 1] as const;
/** Höchste Grenze, die sich einstellen lässt (mehr Portale gibt es praktisch nicht). */
export const FOCUS_MAX = 200;

/** Regel, die gerade gilt: eigene Einstellung oder Voreinstellung. */
export const ruleOf = (ws: Workspace): FocusRule => ws.focus ?? FOCUS_RULE;

/**
 * F-29 Rest: Regel prüfen und in Ordnung bringen – ganze Zahlen, grün ab 1, jede Grenze über der
 * vorigen, Tab-Gewicht aus TAB_WEIGHTS (sonst das nächstliegende).
 */
export function fixRule(r: Partial<FocusRule>): FocusRule {
  const int = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : d);
  const greenMax = Math.min(FOCUS_MAX - 2, Math.max(1, int(r.greenMax, FOCUS_RULE.greenMax)));
  const yellowMax = Math.min(FOCUS_MAX - 1, Math.max(greenMax + 1, int(r.yellowMax, FOCUS_RULE.yellowMax)));
  const orangeMax = Math.min(FOCUS_MAX, Math.max(yellowMax + 1, int(r.orangeMax, FOCUS_RULE.orangeMax)));
  const w = typeof r.tabWeight === 'number' ? r.tabWeight : FOCUS_RULE.tabWeight;
  const tabWeight = TAB_WEIGHTS.reduce((a, b) => (Math.abs(b - w) < Math.abs(a - w) ? b : a), FOCUS_RULE.tabWeight as number);
  return { tabWeight, greenMax, yellowMax, orangeMax };
}

/** Eigene Regel setzen; gleich der Voreinstellung = Eintrag entfällt (gilt dann auch bei späteren Änderungen der Voreinstellung). */
export function setFocusRule(ws: Workspace, r: Partial<FocusRule> | null): Workspace {
  const next = r ? fixRule({ ...ruleOf(ws), ...r }) : FOCUS_RULE;
  const same = (Object.keys(FOCUS_RULE) as (keyof FocusRule)[]).every((k) => next[k] === FOCUS_RULE[k]);
  if (same) {
    if (!ws.focus) return ws;
    const { focus: _drop, ...rest } = ws; // eslint-disable-line @typescript-eslint/no-unused-vars
    return rest;
  }
  return { ...ws, focus: next };
}

/** Bereiche als Satz, z. B. „grün bis 9 Punkte, gelb bis 13, orange bis 16, darüber rot; weiterer Tab 0,5“. */
export function ruleText(r: FocusRule): string {
  return `grün bis ${r.greenMax} Punkte, gelb bis ${r.yellowMax}, orange bis ${r.orangeMax}, darüber rot; ein Portal zählt 1, jeder weitere Tab ${pointsText(r.tabWeight)}`;
}

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
export function focusOf(ws: Workspace, rule: FocusRule = ruleOf(ws)): Focus {
  const panels = ws.panels.length;
  const extraTabs = ws.panels.reduce((n, p) => n + Math.max(0, p.tabs.length - 1), 0);
  const points = panels + extraTabs * rule.tabWeight;
  const level = focusLevel(points, rule);
  return { points, panels, extraTabs, level, color: colorOfLevel(level) };
}

/**
 * F-167: Fokus-Auswirkung einer Aktion – wie stünde die Fokusanzeige, wenn `panels` Portale und
 * `tabs` weitere Tabs dazukämen? Damit färben sich die Plus-Knöpfe in der Ampelfarbe danach.
 */
export interface Effect {
  points: number;
  level: number;
  color: FocusColor;
  /** z. B. „danach Fokus gelb (10,5 Punkte)“ für Tooltip und Bildschirmleser. */
  text: string;
}

export function effectOf(ws: Workspace, panels: number, tabs = 0, rule: FocusRule = ruleOf(ws)): Effect {
  const points = focusOf(ws, rule).points + panels + tabs * rule.tabWeight;
  const level = focusLevel(points, rule);
  const color = colorOfLevel(level);
  return { points, level, color, text: `danach Fokus ${color} (${pointsText(points)} Punkte)` };
}

/** F-167: Fokus eines einzelnen Desks – gleiche Regel, nur seine Portale und Tabs. */
export function deskFocusOf(ws: Workspace, win: string, rule: FocusRule = ruleOf(ws)): Focus {
  return focusOf({ ...ws, panels: panelsIn(ws.panels, win) }, rule);
}

/** Punktzahl lesbar, mit Komma statt Punkt (z. B. „7,5“). */
export const pointsText = (n: number) => String(n).replace('.', ',');

/** Satz für Bildschirmleser und Tooltip. */
export function focusText(f: Focus): string {
  if (f.panels === 0) return 'Fokusanzeige: nichts offen';
  const tabs = f.extraTabs ? `, ${f.extraTabs} weitere ${f.extraTabs === 1 ? 'Tab' : 'Tabs'}` : '';
  return `Fokusanzeige: ${f.color}, ${pointsText(f.points)} Punkte (${f.panels} ${f.panels === 1 ? 'Portal' : 'Portale'}${tabs})`;
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
    title: areaLabel(ws, s) || `Slot ${i + 1}`,
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
  /** F-153: Teilungsbaum seiner Anordnung (Blätter = echte Area-Ids); null = unbekannt. */
  tree: T.Node | null;
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
    const v = s ? viewOf(ws, s) : null;
    const list = here ? slots : v ? v.slots : null;
    const isOpen = here || open.has(w.id);
    const areas: RadarArea[] = list
      ? list.map((sl, i) => ({
          id: here ? sl.id : `${w.id}:${sl.id}`,
          win: w.id,
          other: !here,
          open: isOpen,
          title: areaLabel(ws, sl) || (sl.panels.length === 1 ? sl.front.name : `Slot ${i + 1}`),
          panels: sl.panels.map((p) => rowOf(p, p.id === sl.front.id)),
          rect: sl.rect,
        }))
      : [{ id: `win:${w.id}`, win: w.id, other: true, open: isOpen, title: 'Alle Portale', panels: panels.map((p) => rowOf(p, true)), rect: null }];
    out.push({ win: w.id, title: w.name, here, open: isOpen, aspect: s ? specOf(s).aspect : 1.6, tree: v?.tree ?? null, areas });
  }
  return out.sort((a, b) => Number(b.here) - Number(a.here));
}

/** F-152: Treffer für das Filterfeld – Panelname, Area, Fenster oder Domain enthalten den Text. */
export function radarMatches(w: RadarWindow, a: RadarArea, x: OverviewPanel, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [x.meta.name, a.title, w.title, x.host].some((t) => t.toLowerCase().includes(q));
}

// ---------------------------------------------------------------- F-153 Anordnen im Fokus-Radar

/**
 * F-153 (Tastatur): Area breiter/schmaler bzw. höher/flacher machen. Erst die rechte bzw. untere
 * Kante, liegt die am Rand der Fläche, die linke bzw. obere. Ohne Wirkung derselbe Baum.
 */
export function radarResize(tree: T.Node, leaf: string, axis: 'w' | 'h', grow: boolean, step: number, min: T.Min): T.Node {
  const far: T.Side = axis === 'w' ? 'right' : 'bottom';
  const near: T.Side = axis === 'w' ? 'left' : 'top';
  const d = grow ? step : -step;
  if (T.canResize(tree, leaf, far)) {
    const t = T.resizeEdge(tree, leaf, far, d, min);
    if (t !== tree) return t;
  }
  return T.canResize(tree, leaf, near) ? T.resizeEdge(tree, leaf, near, -d, min) : tree;
}

/** F-153: Lage einer Area in Worten, z. B. „rechts oben“, „Mitte“, „links, ganze Höhe“. */
export function placeText(r: FRect): string {
  const third = (from: number, size: number, words: [string, string, string]) => {
    if (size > 0.9) return '';
    const c = from + size / 2;
    return c < 1 / 3 ? words[0] : c > 2 / 3 ? words[2] : words[1];
  };
  const h = third(r.x, r.w, ['links', 'Mitte', 'rechts']);
  const v = third(r.y, r.h, ['oben', 'Mitte', 'unten']);
  if (!h && !v) return 'ganze Fläche';
  if (!h) return `${v}, ganze Breite`;
  if (!v) return `${h}, ganze Höhe`;
  if (h === 'Mitte' && v === 'Mitte') return 'Mitte';
  return h === 'Mitte' ? `Mitte ${v}` : v === 'Mitte' ? `${h} Mitte` : `${h} ${v}`;
}

/** F-153: Ansage nach dem Anordnen, z. B. „„Recherche“ liegt jetzt rechts oben, 33 % breit, 50 % hoch.“ */
export function arrangeText(name: string, r: FRect): string {
  const size = [r.w <= 0.9 && `${Math.round(r.w * 100)} % breit`, r.h <= 0.9 && `${Math.round(r.h * 100)} % hoch`].filter(Boolean).join(', ');
  return `„${name}“ liegt jetzt ${placeText(r)}${size ? `, ${size}` : ''}.`;
}
