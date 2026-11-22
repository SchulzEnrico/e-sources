/**
 * F-23: Tabs und Portale per Tastatur weiterschalten – mit Ansage für Screenreader.
 * Kürzel: Alt/⌥+T bzw. Alt/⌥+P, mit Umschalt rückwärts.
 */
import type { PanelMeta } from './types';
import { tabLabel } from './workspace';

export type Dir = 1 | -1;

/** Nächster (dir 1) bzw. voriger (dir −1) Eintrag, am Ende geht es vorn weiter. */
export function stepIn<T>(list: readonly T[], current: T | null | undefined, dir: Dir): T | null {
  if (!list.length) return null;
  const i = current == null ? -1 : list.indexOf(current);
  if (i < 0) return dir > 0 ? list[0] : list[list.length - 1];
  return list[(i + dir + list.length) % list.length];
}

/** Tab, auf den Alt/⌥+T bzw. Umschalt+Alt/⌥+T wechselt; null = nur ein Tab. */
export function nextTabOf(p: PanelMeta, dir: Dir): string | null {
  if (p.tabs.length < 2) return null;
  return stepIn(p.tabs.map((t) => t.id), p.activeTab, dir);
}

/** Ansage nach dem Tab-Wechsel, z. B. „Tab 2 von 3 in „Recherche“: wikipedia.org“. */
export function tabSaid(p: PanelMeta, tabId: string): string {
  const i = p.tabs.findIndex((t) => t.id === tabId);
  if (i < 0) return '';
  return `Tab ${i + 1} von ${p.tabs.length} in „${p.name}“: ${tabLabel(p.tabs[i])}`;
}

/** Ansage, wenn es nichts zu wechseln gibt. */
export function tabAlone(p: PanelMeta): string {
  return `„${p.name}“ hat nur einen Tab. Das Plus neben den Tabs öffnet einen weiteren.`;
}

/**
 * Ansage nach dem Portal-Wechsel, z. B. „Portal 2 von 4: „Mail“, Tab mail.de, Stack mit 3 Portalen“.
 * `stack` = Zahl der Portale auf dem Slot.
 */
export function portalSaid(p: PanelMeta, index: number, count: number, stack = 1): string {
  const tab = p.tabs.find((t) => t.id === p.activeTab) ?? p.tabs[0];
  const tabs = p.tabs.length > 1 ? `, ${p.tabs.length} Tabs, sichtbar ${tabLabel(tab)}` : `, ${tabLabel(tab)}`;
  return `Portal ${index + 1} von ${count}: „${p.name}“${tabs}${stack > 1 ? `, Stack mit ${stack} Portalen` : ''}`;
}

export const PORTAL_ALONE = 'Auf diesem Desk ist nur ein Portal sichtbar.';
