import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import './App.css';
import logoUrl from './assets/e-sources-logo.svg';
import logoLightUrl from './assets/e-sources-logo-light.svg';
import { Item, Menu, PanelFrame } from './components/PanelFrame';
import { RulerIcon } from './components/Ruler';
import {
  type Lines,
  type Orientation,
  type ScreenClassId,
  SCREEN_CLASSES,
  allowsTwoLines,
  detectScreen,
  screenClass,
  slotSize,
} from './workspace/screen';
import * as T from './workspace/tree';
import type { PanelMeta, Slot } from './workspace/types';
import { loadSyncMeta, saveSyncMeta, storeImported } from './workspace/storage';
import { FILE_NAME, deviceLabel, needsConfirm, readTransferFile, toTransferFile } from './workspace/transfer';
import { useWorkspace } from './workspace/useWorkspace';
import { openBookmark } from './workspace/bookmarks';
import { ACCENTS, THEMES, contrastWarning, resolveTheme, rgbOf } from './workspace/look';
import { FOCUS_WARN, STACK_MAX, TAB_MAX, addPanel as addTo, areaIn, areaLabel, areaOf, describe, isBlocked, setupFor, splitSelection, stackFull, viewOf } from './workspace/workspace';

/** Abstand zwischen den Panels und zum Rand in Pixeln. */
const GAP = 8;
/** Mindestgröße eines Panels in Pixeln (F-02). */
const MIN_W_PX = 180;
const MIN_H_PX = 120;
/** Ab dieser Mausbewegung wird aus einem Klick auf die Titelleiste ein Ziehen. */
const DRAG_START_PX = 6;
/** Randbereich eines Panels (Anteil), in dem abgelegt wird, um anzudocken. */
const EDGE_BAND = 0.25;
/** So nah am Rand der Arbeitsfläche (Pixel) dockt ein Panel an die ganze Fläche an. */
const AREA_BAND_PX = 22;

/** F-127: Ansichten des Knopfs „Ansicht“, in der Reihenfolge des Weiterschaltens (wie Hineinzoomen). */
type ViewKind = 'area' | 4 | 2 | 1;
const VIEW_NEXT: Record<ViewKind, ViewKind> = { area: 4, 4: 2, 2: 1, 1: 'area' };
const VIEW_NAME: Record<ViewKind, string> = {
  area: 'ganze Arbeitsfläche',
  4: '4 Panels (2 × 2)',
  2: '2 Panels nebeneinander',
  1: 'aktives Panel allein (maximiert)',
};

/**
 * F-127: Symbol des Knopfs „Ansicht“ – zeigt die aktuelle Ansicht: freie Arbeitsfläche
 * (hohes Panel links, zwei rechts), 2 × 2, 2 Spalten oder ein Panel allein.
 */
function ViewIcon({ view }: { view: ViewKind }) {
  const lines = { area: 'M8 1v12M8 7h11', 4: 'M10 1v12M1 7h18', 2: 'M10 1v12', 1: '' }[view];
  return (
    <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true" className="icon">
      <rect x="0.75" y="0.75" width="18.5" height="12.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.3" />
      {lines ? <path d={lines} stroke="currentColor" strokeWidth="1.3" /> : <rect x="3" y="3" width="14" height="8" rx="1" fill="currentColor" opacity="0.45" />}
    </svg>
  );
}

type Mode = { kind: 'area' } | { kind: 'max'; id: string } | { kind: 'split'; count: 2 | 4 };
type Corner = 'tl' | 'tr' | 'bl' | 'br';
interface Drag {
  id: string;
  x: number;
  y: number;
  target: string | null;
  zone: T.Zone | null;
}

const ZONE_LABEL: Record<T.Zone, string> = {
  center: 'Tauschen',
  left: 'Links andocken',
  right: 'Rechts andocken',
  top: 'Oben andocken',
  bottom: 'Unten andocken',
};
const AREA_LABEL: Record<T.Side, string> = {
  left: 'Links über die ganze Höhe',
  right: 'Rechts über die ganze Höhe',
  top: 'Oben über die ganze Breite',
  bottom: 'Unten über die ganze Breite',
};
const dropLabel = (target: string, zone: T.Zone) => (target === T.AREA && zone !== 'center' ? AREA_LABEL[zone] : ZONE_LABEL[zone]);
const CORNERS: { c: Corner; x: 'left' | 'right'; y: 'top' | 'bottom' }[] = [
  { c: 'tl', x: 'left', y: 'top' },
  { c: 'tr', x: 'right', y: 'top' },
  { c: 'bl', x: 'left', y: 'bottom' },
  { c: 'br', x: 'right', y: 'bottom' },
];

export default function App() {
  const [ws, dispatch] = useWorkspace();
  // F-60, F-61, F-130: Darstellung und Akzentfarbe auf die ganze Seite anwenden; „wie System“ folgt dem Gerät.
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const on = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  const shownTheme = resolveTheme(ws.look.theme, systemDark);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = shownTheme;
    root.style.setProperty('--accent-rgb', rgbOf(ws.look.accent).join(', '));
  }, [shownTheme, ws.look.accent]);
  const lookWarning = contrastWarning(ws.look.accent, shownTheme);
  const [active, setActive] = useState<string | null>(ws.panels[0]?.id ?? null);
  const [mode, setMode] = useState<Mode>({ kind: 'area' });
  const [swapFrom, setSwapFrom] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  /** Wichtiger Hinweis als Dialog, der bestätigt werden muss (F-26). */
  const [notice, setNotice] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [clsOverride, setClsOverride] = useState<ScreenClassId | 'auto'>('auto');
  const [oriOverride, setOriOverride] = useState<Orientation | 'auto'>('auto');
  /** Anordnung während eine Kante gezogen wird (wird beim Loslassen übernommen). */
  const [draft, setDraft] = useState<T.Node | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const cleanup = useRef<(() => void) | null>(null);

  // Größe der Arbeitsfläche messen: bestimmt Bildschirmklasse und Ausrichtung (F-03).
  const areaRef = useRef<HTMLDivElement>(null);
  // Klasse und Ausrichtung richten sich nach dem ganzen Fenster (Gerät), nicht nach der Fläche unter
  // der Kopfleiste – sonst gilt ein iPhone im Hochformat als „quer“, wenn die Kopfleiste viel Höhe braucht.
  const [area, setArea] = useState({
    width: window.innerWidth,
    height: window.innerHeight - 60,
    vw: window.innerWidth,
    vh: window.innerHeight,
  });
  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const measure = () =>
      setArea({ width: el.clientWidth, height: el.clientHeight, vw: window.innerWidth, vh: window.innerHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);
  useEffect(() => () => cleanup.current?.(), []);

  const detected = detectScreen(area.vw, area.vh);
  const cls = clsOverride === 'auto' ? detected.cls : clsOverride;
  const orientation = oriOverride === 'auto' ? detected.orientation : oriOverride;
  const setup = setupFor(ws, cls, orientation);
  const view = useMemo(() => viewOf(ws, setup), [ws, setup.cls, setup.orientation, setup.lines]);
  // F-128: Stapel ohne Namen (alte Stände, kleinerer Bildschirm) bekommen „NewArea n“.
  useEffect(() => dispatch({ type: 'ensureAreas', setup }), [view]); // eslint-disable-line react-hooks/exhaustive-deps
  const shownView = useMemo(
    () => (draft && view.arrangement ? describe(ws, view.key, view.spec, { ...view.arrangement, tree: draft }) : view),
    [draft, ws, view],
  );
  const tree = shownView.tree;
  /** NF-07: Panels, deren Größe sich beim Ziehen gerade ändert. */
  const resizing = useMemo(() => (draft ? T.resizedLeaves(view.tree, draft) : new Set<string>()), [draft, view.tree]);

  // Innenmaß der Fläche ohne Außenabstand; Mindestgröße als Anteil davon.
  const iw = Math.max(1, area.width - GAP);
  const ih = Math.max(1, area.height - GAP);
  const slot = slotSize(view.spec);
  const min: T.Min = { w: Math.min(MIN_W_PX / iw, slot.w * 0.9), h: Math.min(MIN_H_PX / ih, slot.h * 0.9) };
  const px = (r: T.FRect) => ({ left: GAP + r.x * iw, top: GAP + r.y * ih, width: Math.max(0, r.w * iw - GAP), height: Math.max(0, r.h * ih - GAP) });

  const notify = useCallback((text: string, ms = 3000) => {
    setFlash(text);
    window.setTimeout(() => setFlash((f) => (f === text ? null : f)), ms);
  }, []);

  /**
   * Neues Panel mit Ampel-Regel (F-26): Hinweis bei 5, Grenze bei 9 Panels je Area.
   * Mit `area` kommt es auf diese Area obendrauf (F-09).
   */
  const addPanel = (area?: string) => {
    // Hinweise nennen das Panel, auf das gestapelt wird – sein Name zeigt, wofür der Nutzer die Area verwendet.
    const frontId = area ? viewOf(ws, setup).arrangement?.areas[area]?.front : undefined;
    const target = frontId ? `„${ws.panels.find((x) => x.id === frontId)?.name ?? ''}“` : 'diesem Stapel';
    if (stackFull(ws, setup, area)) {
      return setNotice(
        `Auf ${target} liegen schon ${STACK_MAX} Panels – mehr gehen nicht. Schließe ein Panel oder lege es woanders an.`,
      );
    }
    const probe = addTo(ws, setup, area);
    const added = probe.panels[probe.panels.length - 1];
    const arr = viewOf(probe, setup).arrangement;
    const at = areaIn(arr, added.id);
    const after = at ? arr!.areas[at].panels.length : 1;
    dispatch({ type: 'add', setup, area });
    if (after === FOCUS_WARN) {
      setNotice(
        `Jetzt liegen ${FOCUS_WARN} Panels auf ${target}. Ab hier nehmen Fokus und Übersicht ab – lieber Panels schließen oder anders verteilen.`,
      );
    }
  };

  // Esc beendet Tauschen, Ziehen, Maximieren und Splitscreen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (cleanup.current) cleanup.current();
      else if (swapFrom) setSwapFrom(null);
      else if (mode.kind !== 'area') setMode({ kind: 'area' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [swapFrom, mode]);

  // Geschlossene Panels aus Ansicht und Fokus entfernen.
  useEffect(() => {
    const exists = (id: string) => ws.panels.some((p) => p.id === id);
    if (mode.kind === 'max' && !exists(mode.id)) setMode({ kind: 'area' });
    if (active && !exists(active)) setActive(ws.panels[0]?.id ?? null);
    if (swapFrom && !exists(swapFrom)) setSwapFrom(null);
  }, [ws.panels, mode, active, swapFrom]);

  // Klick in eine eingebettete Seite: Das iframe schluckt das Mausereignis, deshalb
  // erkennen wir den Wechsel am Fokus (Fenster verliert ihn an ein iframe) und fragen
  // danach regelmäßig nach, solange der Fokus in iframes liegt (Wechsel zwischen Panels).
  const activateRef = useRef<(id: string) => void>(() => {});
  useEffect(() => {
    let timer = 0;
    let last: Element | null = null;
    const check = () => {
      const el = document.activeElement;
      if (el === last) return;
      last = el;
      if (el?.tagName !== 'IFRAME') return;
      const id = el.closest<HTMLElement>('[data-panel-id]')?.dataset.panelId;
      if (id) activateRef.current(id);
    };
    const onBlur = () => {
      window.setTimeout(check, 0);
      window.clearInterval(timer);
      timer = window.setInterval(check, 200);
    };
    const onFocus = () => {
      window.clearInterval(timer);
      last = null;
    };
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  /** Startet eine Zeiger-Geste; Bewegen und Loslassen laufen über das ganze Fenster. */
  const track = (onMove: (e: PointerEvent) => void, onUp: (e: PointerEvent) => void, cursor?: string) => {
    cleanup.current?.();
    const up = (e: PointerEvent) => {
      done();
      onUp(e);
    };
    const done = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', up);
      document.body.style.cursor = '';
      document.body.classList.remove('gesture');
      cleanup.current = null;
      setDraft(null);
      setDrag(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', up);
    if (cursor) document.body.style.cursor = cursor;
    document.body.classList.add('gesture');
    cleanup.current = done;
  };

  // ---------------------------------------------------------------- F-02 Kanten ziehen

  const startResize = (e: ReactPointerEvent, id: string, x: 'left' | 'right' | undefined, y: 'top' | 'bottom' | undefined, cursor: string) => {
    const base = view.tree;
    if (!base || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const x0 = e.clientX;
    const y0 = e.clientY;
    const at = (ev: PointerEvent) => T.resizeEdges(base, id, { x, dx: (ev.clientX - x0) / iw, y, dy: (ev.clientY - y0) / ih }, min);
    track(
      (ev) => setDraft(at(ev)),
      (ev) => dispatch({ type: 'setLayout', setup, tree: at(ev) }),
      cursor,
    );
  };

  // ---------------------------------------------------------------- F-11 Ziehen: tauschen oder andocken

  const hitTest = (cx: number, cy: number, slots: Slot[]): { target: string; zone: T.Zone } | null => {
    const box = areaRef.current?.getBoundingClientRect();
    if (!box) return null;
    const x = cx - box.left;
    const y = cy - box.top;
    // Ganz am Rand der Fläche: an die ganze Arbeitsfläche andocken.
    const edge: [T.Side, number][] = [
      ['left', x],
      ['right', box.width - x],
      ['top', y],
      ['bottom', box.height - y],
    ];
    edge.sort((a, b) => a[1] - b[1]);
    if (edge[0][1] >= -AREA_BAND_PX && edge[0][1] < AREA_BAND_PX) return { target: T.AREA, zone: edge[0][0] };
    for (const s of slots) {
      const r = px(s.rect);
      if (x < r.left || x > r.left + r.width || y < r.top || y > r.top + r.height) continue;
      const u = (x - r.left) / r.width;
      const v = (y - r.top) / r.height;
      const d: [T.Side, number][] = [
        ['left', u],
        ['right', 1 - u],
        ['top', v],
        ['bottom', 1 - v],
      ];
      d.sort((a, b) => a[1] - b[1]);
      return { target: s.id, zone: d[0][1] < EDGE_BAND ? d[0][0] : 'center' };
    }
    return null;
  };

  const startDrag = (e: ReactPointerEvent, id: string) => {
    if (swapFrom || view.slots.length < 2) return;
    const x0 = e.clientX;
    const y0 = e.clientY;
    const slots = view.slots;
    let started = false;
    let last: Drag | null = null;
    track(
      (ev) => {
        if (!started && Math.hypot(ev.clientX - x0, ev.clientY - y0) < DRAG_START_PX) return;
        if (!started) document.body.style.cursor = 'grabbing';
        started = true;
        const hit = hitTest(ev.clientX, ev.clientY, slots);
        last = { id, x: ev.clientX, y: ev.clientY, target: hit && hit.target !== id ? hit.target : null, zone: hit && hit.target !== id ? hit.zone : null };
        setDrag(last);
      },
      () => {
        if (last?.target && last.zone) dispatch({ type: 'drop', setup, id, target: last.target, zone: last.zone });
      },
    );
  };

  // ---------------------------------------------------------------- Panels

  const activate = (id: string) => {
    if (swapFrom && swapFrom !== id) {
      dispatch({ type: 'swap', setup, a: swapFrom, b: id });
      setSwapFrom(null);
    }
    setActive(id);
  };
  activateRef.current = activate;

  /** Panel, das auf einer Area sichtbar ist (beim Stapel das vorderste). */
  const shown = (slotId: string): PanelMeta | null => shownView.slots.find((s) => s.id === slotId)?.front ?? null;

  const frame = (meta: PanelMeta, onArea?: { slotId: string; rect: T.FRect }) => {
    const slotOfMeta = shownView.slots.find((s) => s.panels.some((m) => m.id === meta.id));
    const inStack = !!slotOfMeta && slotOfMeta.panels.length > 1;
    const full = !slotOfMeta || slotOfMeta.panels.length >= STACK_MAX;
    return (
      <PanelFrame
        panel={meta}
        share={onArea && { w: onArea.rect.w, h: onArea.rect.h }}
        stack={
          inStack && slotOfMeta
            ? {
                members: slotOfMeta.panels,
                frontId: slotOfMeta.front.id,
                onSelect: (id) => {
                  dispatch({ type: 'stackFront', setup, id });
                  setActive(id);
                },
                onStep: (step) => dispatch({ type: 'stackStep', setup, area: slotOfMeta.id, step }),
                areaName: areaLabel(ws, slotOfMeta),
                onRenameArea: (name) => dispatch({ type: 'renameArea', setup, area: slotOfMeta.id, name }),
                onRemove: (id) => dispatch({ type: 'remove', id }),
                onAdd: full ? undefined : () => addPanel(slotOfMeta.id),
                onRename: (id, name) => dispatch({ type: 'rename', id, name }),
              }
            : undefined
        }
        active={meta.id === active}
        maximized={mode.kind === 'max' && mode.id === meta.id}
        swapSource={swapFrom === meta.id}
        swapTarget={swapFrom !== null && swapFrom !== meta.id}
        dragging={!!onArea && drag?.id === onArea.slotId}
        onActivate={() => activate(meta.id)}
        onDragStart={onArea ? (e) => startDrag(e, onArea.slotId) : undefined}
        onRename={(name) => dispatch({ type: 'rename', id: meta.id, name })}
        onNavigate={(url) => dispatch({ type: 'setUrl', id: meta.id, url })}
        onHistory={(step) => dispatch({ type: 'history', id: meta.id, step })}
        onHome={() => dispatch({ type: 'home', id: meta.id })}
        onAddTab={() => dispatch({ type: 'addTab', id: meta.id })}
        onCloseTab={(tab) => dispatch({ type: 'closeTab', id: meta.id, tab })}
        onSelectTab={(tab) => dispatch({ type: 'selectTab', id: meta.id, tab })}
        onMoveTab={(tab, to) => dispatch({ type: 'moveTab', id: meta.id, tab, to })}
        isBlocked={(u) => isBlocked(ws, u)}
        onEmbed={(url, ok) => {
          dispatch({ type: 'embed', url, ok });
          if (!ok) notify('Gemerkt: Diese Seite öffnet ab jetzt mit „In neuem Tab öffnen“.');
        }}
        onAddHere={() => (slotOfMeta ? addPanel(slotOfMeta.id) : addPanel())}
        onSetHome={() => {
          dispatch({ type: 'setHome', id: meta.id });
          notify('Aktuelle Seite ist jetzt die Startseite dieses Panels.');
        }}
        notify={notify}
        ws={ws}
        dispatch={dispatch}
        onOpenBookmark={(url) => {
          // F-21: als Tab öffnen; bei voller Tab-Leiste (F-26) nur Hinweis
          if (openBookmark(ws, meta.id, url).result === 'full')
            return notify(`Schon ${TAB_MAX} Tabs offen. Schließe einen Tab oder öffne das Lesezeichen in einem anderen Panel.`);
          dispatch({ type: 'openBookmark', panel: meta.id, url });
        }}
        onClose={() => dispatch({ type: 'remove', id: meta.id })}
        onStartSwap={() => {
          if (ws.panels.length < 2) return notify('Zum Tauschen braucht es mindestens zwei Panels.');
          setSwapFrom(swapFrom === meta.id ? null : meta.id);
        }}
        onSetSize={(w, h) => dispatch({ type: 'setSize', setup, id: meta.id, w, h, min })}
        onReset={() => dispatch({ type: 'resetPanel', setup, id: meta.id, min })}
        onToggleMaximize={() =>
          setMode(mode.kind === 'max' && mode.id === meta.id ? { kind: 'area' } : { kind: 'max', id: meta.id })
        }
      />
    );
  };

  /**
   * Griffe an den Kanten und Ecken, die sich ziehen lassen (nicht am Rand der Fläche).
   * Jede gemeinsame Kante bekommt nur einen Griff: Er gehört dem Panel links bzw. oberhalb
   * (dessen rechte/untere Kante ist die linke/obere Kante des Nachbarn).
   */
  const grips = (id: string) => {
    if (!tree || drag) return null;
    const can = {
      left: false,
      right: T.canResize(tree, id, 'right'),
      top: false,
      bottom: T.canResize(tree, id, 'bottom'),
    };
    const out: ReactNode[] = [];
    (['left', 'right'] as const).forEach((side) => {
      if (can[side])
        out.push(
          <div key={side} className={`grip grip--${side}`} title="Ziehen: Breite ändern" onPointerDown={(e) => startResize(e, id, side, undefined, 'ew-resize')} />,
        );
    });
    (['top', 'bottom'] as const).forEach((side) => {
      if (can[side])
        out.push(
          <div key={side} className={`grip grip--${side}`} title="Ziehen: Höhe ändern" onPointerDown={(e) => startResize(e, id, undefined, side, 'ns-resize')} />,
        );
    });
    for (const k of CORNERS) {
      if (!can[k.x] || !can[k.y]) continue;
      const cursor = k.c === 'tl' || k.c === 'br' ? 'nwse-resize' : 'nesw-resize';
      out.push(
        <div key={k.c} className={`grip grip--${k.c}`} title="Ziehen: Breite und Höhe ändern" onPointerDown={(e) => startResize(e, id, k.x, k.y, cursor)} />,
      );
    }
    return out;
  };

  let content: ReactNode;
  if (ws.panels.length === 0) {
    content = (
      <div className="empty">
        <p>Keine Panels geöffnet.</p>
        <button type="button" onClick={() => addPanel()}>
          + Panel anlegen
        </button>
      </div>
    );
  } else if (mode.kind === 'max') {
    const meta = ws.panels.find((p) => p.id === mode.id);
    content = meta ? <div className="maximized">{frame(meta)}</div> : null;
  } else if (mode.kind === 'split') {
    const chosen = splitSelection(view, active && areaOf(view, active), mode.count)
      .map(shown)
      .filter((m): m is PanelMeta => !!m);
    content = (
      <div className={`split split--${chosen.length >= 4 ? 4 : chosen.length}`}>
        {chosen.map((m) => (
          <div key={m.id} className="split__cell">
            {frame(m)}
          </div>
        ))}
      </div>
    );
  } else {
    content = (
      <>
        {shownView.slots.map((s) => {
          const meta = shown(s.id);
          const over = drag?.target === s.id ? drag.zone : null;
          return (
            <div key={s.id} className={`tile${resizing.has(s.id) ? ' tile--resizing' : ''}`} style={px(s.rect)}>
              {meta && frame(meta, { slotId: s.id, rect: s.rect })}
              {grips(s.id)}
              {over && (
                <div className={`drop drop--${over}`}>
                  <span>{ZONE_LABEL[over]}</span>
                </div>
              )}
            </div>
          );
        })}
        {drag?.target === T.AREA && drag.zone && (
          <div className="area-drop">
            <div className={`drop drop--${drag.zone}`}>
              <span>{dropLabel(T.AREA, drag.zone)}</span>
            </div>
          </div>
        )}
        {drag && (
          <div className="ghost" style={{ left: drag.x + 12, top: drag.y + 12 }}>
            {shown(drag.id)?.name ?? ''}
            {drag.target && drag.zone ? ` → ${dropLabel(drag.target, drag.zone)}` : ''}
          </div>
        )}
      </>
    );
  }

  const onArea = mode.kind === 'area';
  const hasPreferred = !!ws.preferred[view.key];
  /** Panels hinter dem jeweils sichtbaren, auf allen Areas zusammen. */
  const stacked = view.slots.reduce((n, s) => n + s.panels.length - 1, 0);
  const canTwoLines = allowsTwoLines(cls);
  const lineWord = orientation === 'landscape' ? ['einzeilig', 'zweizeilig'] : ['einspaltig', 'zweispaltig'];

  // F-121: Arbeitsfläche als JSON-Datei zwischen Geräten weitergeben.
  const device = () => deviceLabel(navigator.userAgent, navigator.maxTouchPoints > 1);
  const exportWorkspace = () => {
    const file = toTransferFile(ws, device());
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = FILE_NAME;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
    saveSyncMeta({ ...loadSyncMeta(), syncedAt: Date.now() });
    notify(`Arbeitsfläche als ${FILE_NAME} gespeichert. Auf dem anderen Gerät „Importieren“ wählen.`);
  };
  const importWorkspace = async (input: HTMLInputElement) => {
    const chosen = input.files?.[0];
    input.value = ''; // dieselbe Datei darf später noch einmal gewählt werden
    if (!chosen) return;
    const result = readTransferFile(await chosen.text());
    if (!result.ok) {
      setNotice(result.error);
      return;
    }
    const { file } = result;
    const when = new Date(file.savedAt).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
    if (
      needsConfirm(loadSyncMeta(), file.savedAt) &&
      !window.confirm(`Die Arbeitsfläche auf diesem Gerät ist neuer als die Datei (${file.device}, ${when}). Trotzdem ersetzen?`)
    )
      return;
    storeImported(file.workspace);
    dispatch({ type: 'replace', ws: file.workspace });
    setActive(file.workspace.panels[0]?.id ?? null);
    setMode({ kind: 'area' });
    notify(`Arbeitsfläche übernommen (${file.device}, ${when}).`);
  };

  return (
    <div className="app">
      <header className="toolbar">
        <img className="brand-logo" src={shownTheme === 'dark' ? logoUrl : logoLightUrl} alt="E-Sources" width={366} height={186} />
        <button type="button" onClick={() => addPanel()} title="Neues Panel anlegen">
          + Panel
        </button>
        <span className="sep" />
        <button type="button" className="tb-wide" disabled={!onArea} onClick={() => dispatch({ type: 'distribute', setup })} title="Alle Panels gleich groß, die Anordnung bleibt">
          Gleich verteilen
        </button>
        {/* F-127: Knopf „Ansicht“ – jeder Klick schaltet weiter: Arbeitsfläche → 2 × 2 → 2 → 1 → Arbeitsfläche */}
        {(() => {
          const now: ViewKind = mode.kind === 'max' ? 1 : mode.kind === 'split' ? mode.count : 'area';
          const next = VIEW_NEXT[now];
          const go = () => {
            if (next === 'area') return setMode({ kind: 'area' });
            if (next === 1) {
              const id = (active && ws.panels.some((x) => x.id === active) ? active : null) ?? shownView.slots[0]?.front.id;
              return setMode(id ? { kind: 'max', id } : { kind: 'area' });
            }
            setMode({ kind: 'split', count: next });
          };
          return (
            <button
              type="button"
              className={now === 'area' ? 'tb-view' : 'on tb-view'}
              onClick={go}
              title={`Ansicht: ${VIEW_NAME[now]} · Klick: ${VIEW_NAME[next]}${next === 'area' ? ' (Esc)' : ''}`}
              aria-label={`Ansicht: ${VIEW_NAME[now]}. Weiter zu: ${VIEW_NAME[next]}`}
              aria-pressed={now !== 'area'}
            >
              <ViewIcon view={now} />
              Ansicht
            </button>
          );
        })()}
        {/* F-125: Lineal für alle Panels */}
        <button
          type="button"
          className={ws.ruler.on ? 'on tb-view' : 'tb-view'}
          onClick={() => dispatch({ type: 'rulerAll' })}
          title={ws.ruler.on ? 'Lineal in allen Panels ausblenden' : 'Lineal in allen Panels zeigen (einzelne Panels zusätzlich im Menü ⋮)'}
          aria-label="Lineal für alle Panels"
          aria-pressed={ws.ruler.on}
        >
          {RulerIcon}
          Lineal
        </button>
        {!onArea && (
          <button type="button" onClick={() => setMode({ kind: 'area' })} title="Zurück zur Arbeitsfläche (Esc)">
            Zur Arbeitsfläche
          </button>
        )}
        <span className="grow" />
        {swapFrom && <span className="hint">Ziel-Panel anklicken · Esc bricht ab</span>}
        <span className="muted" title={`${screenClass(cls).label} · ${orientation === 'landscape' ? 'quer' : 'hoch'}`}>
          {view.slots.length}/{view.spec.capacity}
          {stacked > 0 ? ` · ${stacked} im Stapel` : ''}
        </span>
        {/* F-66: Selten Gebrauchtes im Menü, damit die Kopfleiste schlank bleibt */}
        <Menu icon={<span aria-hidden="true">⋯</span>} label="Weitere Einstellungen">
          {(close) => (
            <>
              <Item
                onClick={() => {
                  dispatch({ type: 'savePreferred', setup });
                  notify('Wunsch-Anordnung für diese Bildschirm-Einstellung gespeichert.');
                  close();
                }}
              >
                Als Wunsch-Anordnung merken
              </Item>
              <Item
                onClick={() => {
                  dispatch({ type: 'resetLayout', setup });
                  setMode({ kind: 'area' });
                  notify(hasPreferred ? 'Wunsch-Anordnung wiederhergestellt.' : 'Standard-Anordnung wiederhergestellt.');
                  close();
                }}
              >
                {hasPreferred ? 'Auf Wunsch-Anordnung zurücksetzen' : 'Layout zurücksetzen'}
              </Item>
              {hasPreferred && (
                <Item
                  onClick={() => {
                    dispatch({ type: 'clearPreferred', setup });
                    notify('Wunsch-Anordnung gelöscht; Zurücksetzen nutzt wieder die Standard-Anordnung.');
                    close();
                  }}
                >
                  Wunsch-Anordnung löschen
                </Item>
              )}
              <li className="menu__sep" role="separator" />
              <li className="menu__field">
                <label>
                  Bildschirm
                  <select value={clsOverride} onChange={(e) => setClsOverride(e.target.value as ScreenClassId | 'auto')}>
                    <option value="auto">Automatisch ({screenClass(detected.cls).label})</option>
                    {SCREEN_CLASSES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label} – {c.capacity} sichtbar
                      </option>
                    ))}
                  </select>
                </label>
              </li>
              <li className="menu__field">
                <label>
                  Ausrichtung
                  <select value={oriOverride} onChange={(e) => setOriOverride(e.target.value as Orientation | 'auto')}>
                    <option value="auto">Automatisch ({detected.orientation === 'landscape' ? 'quer' : 'hoch'})</option>
                    <option value="landscape">Querformat</option>
                    <option value="portrait">Hochformat</option>
                  </select>
                </label>
              </li>
              {canTwoLines && (
                <li className="menu__field">
                  <span className="seg" role="group" aria-label="Reihen">
                    {([1, 2] as Lines[]).map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={setup.lines === n ? 'on' : ''}
                        onClick={() => dispatch({ type: 'setLines', cls, orientation, lines: n })}
                      >
                        {lineWord[n - 1]}
                      </button>
                    ))}
                  </span>
                </li>
              )}
              <li className="menu__sep" role="separator" />
              {/* F-60, F-61, F-69, F-130: Darstellung */}
              <li className="menu__field">
                <label>Darstellung</label>
                <span className="seg seg--wrap" role="group" aria-label="Darstellung">
                  {THEMES.map((t) => (
                    <button key={t.id} type="button" className={ws.look.theme === t.id ? 'on' : ''} onClick={() => dispatch({ type: 'look', theme: t.id })}>
                      {t.label}
                    </button>
                  ))}
                </span>
              </li>
              <li className="menu__field">
                <label>Akzentfarbe</label>
                <span className="look__swatches" role="group" aria-label="Akzentfarbe">
                  {ACCENTS.map((a) => (
                    <button
                      key={a.hex}
                      type="button"
                      className={ws.look.accent === a.hex ? 'look__swatch on' : 'look__swatch'}
                      style={{ '--swatch': a.hex } as CSSProperties}
                      title={a.name}
                      aria-label={a.name}
                      aria-pressed={ws.look.accent === a.hex}
                      onClick={() => dispatch({ type: 'look', accent: a.hex })}
                    />
                  ))}
                </span>
                <label className="look__custom">
                  Eigene Farbe
                  <input type="color" value={ws.look.accent} onChange={(e) => dispatch({ type: 'look', accent: e.target.value })} />
                </label>
                {lookWarning && <p className="look__warn">{lookWarning}</p>}
              </li>
              <li className="menu__sep" role="separator" />
              <Item
                onClick={() => {
                  exportWorkspace();
                  close();
                }}
              >
                Arbeitsfläche exportieren
              </Item>
              <Item
                onClick={() => {
                  importRef.current?.click();
                  close();
                }}
              >
                Arbeitsfläche importieren
              </Item>
            </>
          )}
        </Menu>
        <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={(e) => void importWorkspace(e.currentTarget)} />
      </header>
      {flash && !swapFrom && (
        <div className="toast" role="status">
          <span>{flash}</span>
          <button type="button" onClick={() => setFlash(null)} aria-label="Hinweis schließen" title="Schließen">
            ×
          </button>
        </div>
      )}
      <main className="area" ref={areaRef}>
        {content}
      </main>
      {notice && (
        <div className="notice" role="alertdialog" aria-modal="true" onClick={() => setNotice(null)}>
          <div className="notice__box" onClick={(e) => e.stopPropagation()}>
            <p>{notice}</p>
            <button type="button" autoFocus onClick={() => setNotice(null)}>
              Verstanden
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
