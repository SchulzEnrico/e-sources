import { useEffect, useRef } from 'react';
import { type RingKind, ringSort, ringStep } from '../workspace/focusRing';
import { F6_TEXT } from '../workspace/terms';

/**
 * F-206 N13 (V85): F6 reihum – Kopfleiste → Slots (vorderes Portal je Slot, in Lage-Reihenfolge) → Dock → Pads
 * (oberstes zuerst); Umschalt+F6 rückwärts. Jeder Bereich merkt sich den zuletzt fokussierten Knopf und bekommt
 * ihn zurück; sonst das erste bedienbare Element. Bei offenem Dialog (Cockpit, Hilfe …) bleibt F6 dort aus.
 * Ansage über `say` („Bereich 3 von 7: Slot …“).
 */
const SEL: Record<RingKind, string> = {
  bar: 'header.toolbar',
  slot: 'section.win[data-panel-id]',
  dock: 'aside.dock',
  pad: 'section.pad:not(.pad--docked)',
};
/** Erstes Ziel je Bereich, wenn noch nichts gemerkt ist – nie ein Schließen-Knopf (Enter darf nichts zerstören). */
const FIRST: Partial<Record<RingKind, string>> = {
  slot: '[role="tab"][aria-selected="true"]',
  dock: '[role="tab"][aria-selected="true"], .pad__tab.is-on',
  pad: '[role="tab"][aria-selected="true"], .pad__tab.is-on',
};
const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"], [role="slider"]';
const last = new WeakMap<Element, HTMLElement>();
const seen = (el: Element) => (el as HTMLElement).offsetParent !== null || getComputedStyle(el).position === 'fixed';

function areas(): { kind: RingKind; el: HTMLElement }[] {
  const out: { kind: RingKind; el: HTMLElement }[] = [];
  for (const kind of Object.keys(SEL) as RingKind[])
    for (const el of document.querySelectorAll<HTMLElement>(SEL[kind])) {
      if (!seen(el)) continue;
      out.push({ kind, el });
    }
  // Slots in Lese-Reihenfolge (oben links zuerst), Pads oberstes zuerst (höchster z-index)
  const pos = (el: HTMLElement) => el.getBoundingClientRect();
  const slots = out.filter((a) => a.kind === 'slot').sort((a, b) => Math.round(pos(a.el).top - pos(b.el).top) || pos(a.el).left - pos(b.el).left);
  const pads = out.filter((a) => a.kind === 'pad').sort((a, b) => Number(getComputedStyle(b.el).zIndex || 0) - Number(getComputedStyle(a.el).zIndex || 0));
  return ringSort([...out.filter((a) => a.kind === 'bar' || a.kind === 'dock'), ...slots, ...pads]);
}

function nameOf(kind: RingKind, el: HTMLElement): string {
  const label = el.getAttribute('aria-label') ?? '';
  if (kind === 'bar') return F6_TEXT.bar;
  if (kind === 'slot') return F6_TEXT.slot(label);
  return label || F6_TEXT[kind];
}

export function useF6(say: (text: string) => void, off: boolean) {
  const sayRef = useRef(say);
  sayRef.current = say;
  useEffect(() => {
    // zuletzt fokussiertes Element je Bereich merken
    const onFocus = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t?.closest) return;
      for (const kind of Object.keys(SEL) as RingKind[]) {
        const area = t.closest(SEL[kind]);
        if (area) {
          last.set(area, t);
          return;
        }
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'F6' || e.ctrlKey || e.metaKey || e.altKey || off) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"], #overview')) return;
      const list = areas();
      if (!list.length) return;
      e.preventDefault();
      e.stopPropagation();
      const active = document.activeElement;
      const cur = list.findIndex((a) => a.el.contains(active));
      const i = ringStep(list.length, cur, e.shiftKey);
      const { kind, el } = list[i];
      const keep = last.get(el);
      const first = FIRST[kind] ? [...el.querySelectorAll<HTMLElement>(FIRST[kind]!)].find(seen) : undefined;
      const target = keep && keep.isConnected && el.contains(keep) && seen(keep) ? keep : (first ?? [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].find((b) => seen(b) && !/schließen/i.test(b.getAttribute('aria-label') ?? '')));
      (target ?? el).focus({ preventScroll: false });
      sayRef.current(F6_TEXT.said(i + 1, list.length, nameOf(kind, el)));
    };
    document.addEventListener('focusin', onFocus);
    window.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('focusin', onFocus);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [off]);
}
