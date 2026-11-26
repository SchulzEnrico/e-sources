/**
 * F-228 (V111, Enrico: „Es sollte einfach immer wie die gewohnte Kopfleiste aussehen, kein anderer Aufbau. Und die
 * echte Kopfleiste muss dann natürlich optisch clean sein, Schließen vielleicht noch sichtbar“ · „Verschieben des
 * Elements sollte auch immer sichtbar bleiben, wie das X“ · „auch für Tabs und Stacks“ · „auf kleinen Geräten …
 * wandern die Elemente in eine vertikale Position: links oben, rechts unten, in gleicher Reihenfolge“).
 *
 * Ein Bauteil für alle Leisten (NF-08): `useOverflow(ref)` hängt sich an eine vorhandene Leiste. Passt sie nicht mehr
 * in ihre Breite, wird sie „knapp“: sichtbar bleiben nur Kinder mit `data-ovf-keep` (Verschieben, Schließen, aktiver
 * Reiter) und der Knopf „»“. Hover auf „»“ (250 ms), Klick, Enter, Pfeil runter oder Antippen öffnen die Leiste
 * **schwebend in voller Breite** – dieselben Elemente (kein Nachbau, kein Neu-Anlegen, offene Menüs und Räder bleiben),
 * gleiche Reihenfolge, gleiches Aussehen. Reicht der Bildschirm nicht, steht sie senkrecht. Esc schließt, Fokus zurück
 * auf „»“; Wegfahren schließt nach 400 ms, außer Fokus oder ein offenes Menü liegt darin.
 *
 * Messen: Die Leiste wird kurz mit allen Kindern in voller Breite gemessen (Klasse `ovf-measure`, vor dem Zeichnen).
 * Kinder mit `data-ovf-min` zählen dabei nur mit ihrer Mindestbreite (z. B. die Reiter, die selbst überlaufen).
 */
import { type ReactNode, type RefObject, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { OVERFLOW_TEXT as T } from '../workspace/terms';
import { Icon } from './Icon';

const OPEN_MS = 250;
const CLOSE_MS = 400;
const EDGE = 8;

export interface OverflowState {
  /** Klassen für die Leiste */
  cls: string;
  /** Knopf „»“ – an die Stelle setzen, ab der Elemente verschwinden (meist vor Schließen) */
  knob: ReactNode;
  tight: boolean;
  open: boolean;
}

/** Deckende Farbe dessen, was sonst hinter der Leiste liegt: eigene Hintergrundfarbe über die der Vorfahren gemischt. */
function underOf(el: HTMLElement): string {
  const parse = (c: string): [number, number, number, number] | null => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return [v[0], v[1], v[2], v.length > 3 ? v[3] : 1];
  };
  const layers: [number, number, number, number][] = [];
  for (let a: HTMLElement | null = el; a; a = a.parentElement) {
    const c = parse(getComputedStyle(a).backgroundColor);
    if (c && c[3] > 0) layers.push(c);
    if (c && c[3] >= 0.99) break;
  }
  let out: [number, number, number] = [19, 19, 23];
  for (const [r, g, b, al] of layers.reverse()) out = [r * al + out[0] * (1 - al), g * al + out[1] * (1 - al), b * al + out[2] * (1 - al)];
  return `rgb(${out.map((x) => Math.round(x)).join(', ')})`;
}

export function useOverflow(ref: RefObject<HTMLElement | null>, opts: { label: string; keepActive?: boolean; keep?: string; off?: boolean; /** Reiter: offen als Liste nach unten (Enrico: „Am besten nach unten“) */ drop?: boolean; /** knapp erzwingen (z. B. Reiter in einer schwebenden Kopfleiste) */ forceTight?: boolean }): OverflowState {
  const [tight, setTight] = useState(false);
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(0);
  const [vertical, setVertical] = useState(false);
  const knobRef = useRef<HTMLButtonElement>(null);
  const timer = useRef(0);
  /** nach Esc bzw. Klick-Schließen: Hover öffnet erst wieder, wenn der Zeiger „»“ einmal verlassen hat */
  const noHover = useRef(false);
  const ph = useRef<HTMLDivElement | null>(null);
  const need = useRef(0);
  /** Lage und Maße in der Leiste, bevor sie schwebt */
  const before = useRef<{ r: DOMRect; flex: string; margin: string; knob?: number; under?: string } | null>(null);

  // aktive Reiter (Tabs) bleiben sichtbar
  const markActive = (el: HTMLElement) => {
    if (opts.keep) for (const c of Array.from(el.children) as HTMLElement[]) if (c.matches(opts.keep)) c.setAttribute('data-ovf-keep', '');
    if (!opts.keepActive) return;
    for (const c of Array.from(el.children) as HTMLElement[]) {
      // nur Reiter umschalten – feste Elemente (z. B. „+ Tab“) behalten ihr data-ovf-keep
      if (c.classList.contains('ovf__knob') || !(c.matches('[role="tab"]') || c.querySelector('[role="tab"]'))) continue;
      const on = c.matches('.is-on, [aria-selected="true"]') || !!c.querySelector('.is-on, [aria-selected="true"]');
      if (on) c.setAttribute('data-ovf-keep', '');
      else c.removeAttribute('data-ovf-keep');
    }
  };

  const measure = () => {
    const el = ref.current;
    if (!el || opts.off) return;
    markActive(el);
    const had = el.className;
    el.classList.remove('is-ovf-tight', 'is-ovf-open', 'is-ovf-vertical');
    el.classList.add('ovf-measure');
    need.current = Math.ceil(el.getBoundingClientRect().width);
    el.className = had;
    const box = ph.current ?? el;
    const avail = Math.floor(box.getBoundingClientRect().width);
    const t = !!opts.forceTight || need.current > avail + 1;
    setTight(t);
    if (!t) setOpen(false);
    const kids = (Array.from(el.children) as HTMLElement[]).filter((c) => !c.hasAttribute('data-ovf-keep') && !c.classList.contains('ovf__knob') && !c.classList.contains('sr-only') && !c.classList.contains('ovf-ph') && !c.hidden && c.getAttribute('aria-hidden') !== 'true' && c.tagName !== 'INPUT');
    setHidden(t ? kids.length : 0);
  };

  // Messen bei Größe und Inhalt; vor dem Zeichnen, damit nichts springt
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || opts.off) return;
    let raf = 0;
    const later = () => (cancelAnimationFrame(raf), (raf = requestAnimationFrame(measure)));
    measure();
    const ro = new ResizeObserver(later);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    const mo = new MutationObserver(later);
    mo.observe(el, { childList: true, subtree: true, characterData: true });
    window.addEventListener('resize', later);
    return () => (ro.disconnect(), mo.disconnect(), window.removeEventListener('resize', later), cancelAnimationFrame(raf));
  }, [opts.off, opts.forceTight]); // eslint-disable-line react-hooks/exhaustive-deps

  // Schwebend: Platzhalter hält die Lücke, die Leiste liegt fest über allem
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!open || !tight) {
      if (vertical) setVertical(false);
      el.style.removeProperty('--ovf-x');
      el.style.removeProperty('--ovf-y');
      el.style.removeProperty('--ovf-under');
      ph.current?.remove();
      ph.current = null;
      return;
    }
    const b = before.current;
    if (!b) return;
    const r = b.r;
    const p = document.createElement('div');
    p.className = 'ovf-ph';
    p.setAttribute('aria-hidden', 'true');
    p.style.cssText = `width:${r.width}px;height:${r.height}px;flex:${b.flex};margin:${b.margin};`;
    el.before(p);
    ph.current = p;
    // Vorfahren mit container-type/contain werden sonst zum Bezugsrahmen und schneiden die schwebende Leiste ab –
    // solange sie schwebt, heben wir das auf (Container-Abfragen gelten dann kurz nicht; die Leiste zeigt ohnehin alles)
    const lifted: HTMLElement[] = [];
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const c = getComputedStyle(a);
      const ctx = c.zIndex !== 'auto' && c.position !== 'static';
      if (c.containerType !== 'normal' || (c.contain && c.contain !== 'none') || ctx) (a.classList.add('ovf-lift'), ctx && a.classList.add('ovf-top'), lifted.push(a));
    }
    // V111 (Enrico: „Es läuft auch aus dem Bildschirmrand“): die echte Breite der offenen Leiste zählt (Reiter zeigen
    // dort ihre volle Breite); zu breit für den Bildschirm → senkrecht, sonst so weit nach links, dass sie ganz passt
    el.style.setProperty('--ovf-x', `${r.left}px`);
    el.style.setProperty('--ovf-y', `${r.top}px`);
    if (b.under) el.style.setProperty('--ovf-under', b.under);
    if (opts.drop) {
      // Reiter klappen senkrecht unter sich auf – nichts in der Leiste verschiebt sich
      const h = el.getBoundingClientRect();
      const dx = Math.max(EDGE, Math.min(r.left, window.innerWidth - h.width - EDGE));
      el.style.setProperty('--ovf-x', `${dx}px`);
      el.style.setProperty('--ovf-y', `${r.bottom + 2}px`);
    } else {
    const w = el.getBoundingClientRect().width;
    if (!vertical && Math.max(el.scrollWidth, need.current) > window.innerWidth - 2 * EDGE) setVertical(true);
    // V111 (Enrico: „Die neue Leiste verspringt so immer, wenn die Tabs von links kommen“): „»“ bleibt unter dem Zeiger –
    // was vorher versteckt war, baut sich nach links auf; nur der Bildschirmrand schiebt sie zurück
    const kNow = knobRef.current?.getBoundingClientRect().left;
    const shift = !vertical && b.knob !== undefined && kNow !== undefined ? b.knob - kNow : 0;
    const x = Math.max(EDGE, Math.min(r.left + shift, window.innerWidth - w - EDGE));
    el.style.setProperty('--ovf-x', `${x}px`);
    }
    // V111 (Enrico: „ein Hovereffekt, der Menü und Pad umkreist … alle nichtaktiven Pads abgedunkelt“): Pad bzw.
    // Portal der Leiste leuchtet mit, alle anderen treten zurück – nur solange der Zeiger auf der Leiste liegt (CSS :hover)
    const owner = el.closest<HTMLElement>('.pad, .win');
    owner?.classList.add('ovf-owner');
    return () => {
      p.remove();
      if (ph.current === p) ph.current = null;
      for (const a of lifted) a.classList.remove('ovf-lift', 'ovf-top');
      owner?.classList.remove('ovf-owner');
    };
  }, [open, tight, vertical]); // eslint-disable-line react-hooks/exhaustive-deps

  // Schließen: Wegfahren, Klick daneben, Esc
  useEffect(() => {
    const el = ref.current;
    if (!open || !el) return;
    const busy = () => el.matches(':focus-within') || !!el.querySelector('[aria-expanded="true"]');
    const leave = () => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => !busy() && setOpen(false), CLOSE_MS);
    };
    const enter = () => window.clearTimeout(timer.current);
    const away = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (t && (el.contains(t) || knobRef.current?.contains(t) || t.closest('.menu__list'))) return;
      setOpen(false);
    };
    // Esc schließt – auch wenn der Fokus gerade nicht in der Leiste liegt (nur Hover); offene Menüs und Felder zuerst
    const key = (e: KeyboardEvent) => {
      const t = e.target as Element | null;
      if (e.key !== 'Escape' || t?.closest('.menu__list') || (t && el.contains(t) && t.closest('input, textarea'))) return;
      e.stopPropagation();
      noHover.current = true;
      setOpen(false);
      if (el.matches(':focus-within')) knobRef.current?.focus();
    };
    const blur = () => window.setTimeout(() => !busy() && !el.matches(':hover') && setOpen(false), 0);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('pointerenter', enter);
    window.addEventListener('keydown', key, true);
    el.addEventListener('focusout', blur);
    document.addEventListener('pointerdown', away, true);
    return () => {
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('pointerenter', enter);
      window.removeEventListener('keydown', key, true);
      el.removeEventListener('focusout', blur);
      document.removeEventListener('pointerdown', away, true);
      window.clearTimeout(timer.current);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const openNow = (focus: boolean) => {
    window.clearTimeout(timer.current);
    const el = ref.current;
    if (el && !open) {
      const cs = getComputedStyle(el);
      before.current = { r: el.getBoundingClientRect(), flex: cs.flex, margin: cs.margin, knob: knobRef.current?.getBoundingClientRect().left, under: underOf(el) };
    }
    setOpen(true);
    if (focus)
      window.setTimeout(() => {
        const el = ref.current;
        const first = el && (Array.from(el.querySelectorAll<HTMLElement>('button, [tabindex="0"], input, [role="tab"]')).find((x) => !x.closest('.ovf__knob') && !x.hasAttribute('disabled') && x.offsetParent !== null) ?? null);
        first?.focus();
      }, 30);
  };

  const knob = (
    <button
      ref={knobRef}
      type="button"
      className="ovf__knob"
      aria-haspopup="true"
      aria-expanded={open}
      aria-label={T.label(opts.label, hidden)}
      title={T.title(opts.label, hidden)}
      onPointerEnter={(e) => {
        if (e.pointerType !== 'mouse' || noHover.current) return;
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => openNow(false), OPEN_MS);
      }}
      onPointerLeave={() => {
        noHover.current = false;
        if (!open) window.clearTimeout(timer.current);
      }}
      onClick={(e) => (e.stopPropagation(), window.clearTimeout(timer.current), open ? ((noHover.current = true), setOpen(false)) : openNow(e.detail === 0))}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown') (e.preventDefault(), openNow(true));
      }}
    >
      {/* V111 (Enrico: „Hier müssen aussagekräftige Icons hin“): Reiter = Tab-Symbol + ▾, Leiste = Ausklappen */}
      <Icon name={opts.drop ? 'tab' : 'spread'} size={13} />
      {hidden > 0 && <span className="ovf__n">{hidden}</span>}
      {opts.drop && <Icon name="chevronDown" size={10} />}
    </button>
  );
  return { cls: `${tight ? ' is-ovf-tight' : ''}${tight && open ? ' is-ovf-open' : ''}${tight && open && (vertical || opts.drop) ? ' is-ovf-vertical' : ''}${opts.drop ? ' is-ovf-drop' : ''}`, knob, tight, open: tight && open };
}
