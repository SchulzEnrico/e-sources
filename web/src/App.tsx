import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import './App.css';
import { PanelFrame } from './components/PanelFrame';
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
import { STACK_ID, type PanelMeta, type Slot } from './workspace/types';
import { loadSyncMeta, saveSyncMeta, storeImported } from './workspace/storage';
import { FILE_NAME, deviceLabel, needsConfirm, readTransferFile, toTransferFile } from './workspace/transfer';
import { useWorkspace } from './workspace/useWorkspace';
import { FOCUS_WARN, STACK_MAX, addPanel as addTo, describe, setupFor, slotOf, splitSelection, stackFull, viewOf } from './workspace/workspace';

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
  const [area, setArea] = useState({ width: window.innerWidth, height: window.innerHeight - 60 });
  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const measure = () => setArea({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => () => cleanup.current?.(), []);

  const detected = detectScreen(area.width, area.height);
  const cls = clsOverride === 'auto' ? detected.cls : clsOverride;
  const orientation = oriOverride === 'auto' ? detected.orientation : oriOverride;
  const setup = setupFor(ws, cls, orientation);
  const view = useMemo(() => viewOf(ws, setup), [ws, setup.cls, setup.orientation, setup.lines]);
  const shownView = useMemo(() => (draft ? describe(ws, view.key, view.spec, draft) : view), [draft, ws, view]);
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

  /** Neues Panel mit Ampel-Regel (F-26): Hinweis bei 5, Grenze bei 9 Panels je Platz. */
  const addPanel = () => {
    if (stackFull(ws, setup)) {
      return setNotice(
        `Auf diesem Platz liegen schon ${STACK_MAX} Panels – mehr gehen nicht. Schließe ein Panel oder lege es an einem anderen Platz an.`,
      );
    }
    const before = viewOf(ws, setup).stack.length;
    const after = viewOf(addTo(ws, setup), setup).stack.length;
    dispatch({ type: 'add', setup });
    if (after === FOCUS_WARN && after > before) {
      setNotice(
        `Jetzt liegen ${FOCUS_WARN} Panels auf diesem Platz. Ab hier nehmen Fokus und Übersicht ab – lieber Panels schließen oder auf andere Plätze verteilen.`,
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

  /** Panel, das auf einem Platz sichtbar ist (beim Stapel das vorderste). */
  const shown = (slotId: string): PanelMeta | null =>
    slotId === STACK_ID ? shownView.front : (ws.panels.find((p) => p.id === slotId) ?? null);

  const frame = (meta: PanelMeta, onArea?: { slotId: string; rect: T.FRect }) => {
    const inStack = slotOf(shownView, meta.id) === STACK_ID;
    return (
      <PanelFrame
        panel={meta}
        share={onArea && { w: onArea.rect.w, h: onArea.rect.h }}
        stack={
          inStack && shownView.front
            ? {
                members: shownView.stack,
                frontId: shownView.front.id,
                onSelect: (id) => {
                  dispatch({ type: 'stackFront', setup, id });
                  setActive(id);
                },
                onStep: (step) => dispatch({ type: 'stackStep', setup, step }),
                onRemove: (id) => dispatch({ type: 'remove', id }),
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
        onSetHome={() => {
          dispatch({ type: 'setHome', id: meta.id });
          notify('Aktuelle Seite ist jetzt die Startseite dieses Panels.');
        }}
        notify={notify}
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
        <button type="button" onClick={addPanel}>
          + Panel anlegen
        </button>
      </div>
    );
  } else if (mode.kind === 'max') {
    const meta = ws.panels.find((p) => p.id === mode.id);
    content = meta ? <div className="maximized">{frame(meta)}</div> : null;
  } else if (mode.kind === 'split') {
    const chosen = splitSelection(view, active && slotOf(view, active), mode.count)
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
        <strong className="brand">E-Source</strong>
        <button type="button" onClick={addPanel} title="Neues Panel anlegen">
          + Panel
        </button>
        <span className="sep" />
        <button type="button" disabled={!onArea} onClick={() => dispatch({ type: 'distribute', setup })} title="Alle Panels gleich groß, die Anordnung bleibt">
          Gleich verteilen
        </button>
        <button
          type="button"
          className={mode.kind === 'split' && mode.count === 2 ? 'on' : ''}
          onClick={() => setMode(mode.kind === 'split' && mode.count === 2 ? { kind: 'area' } : { kind: 'split', count: 2 })}
          title="Splitscreen mit 2 Panels (aktives Panel und das nächste)"
        >
          Split 2
        </button>
        <button
          type="button"
          className={mode.kind === 'split' && mode.count === 4 ? 'on' : ''}
          onClick={() => setMode(mode.kind === 'split' && mode.count === 4 ? { kind: 'area' } : { kind: 'split', count: 4 })}
          title="Splitscreen mit 4 Panels"
        >
          Split 4
        </button>
        {!onArea && (
          <button type="button" onClick={() => setMode({ kind: 'area' })} title="Zurück zur Arbeitsfläche (Esc)">
            Zur Arbeitsfläche
          </button>
        )}
        <span className="sep" />
        <button
          type="button"
          onClick={() => {
            dispatch({ type: 'savePreferred', setup });
            notify('Wunsch-Anordnung für diese Bildschirm-Einstellung gespeichert.');
          }}
          title="Aktuelle Anordnung als Wunsch-Anordnung merken"
        >
          Als Wunsch-Anordnung merken
        </button>
        <button
          type="button"
          onClick={() => {
            dispatch({ type: 'resetLayout', setup });
            setMode({ kind: 'area' });
            notify(hasPreferred ? 'Wunsch-Anordnung wiederhergestellt.' : 'Standard-Anordnung wiederhergestellt.');
          }}
          title={hasPreferred ? 'Auf die Wunsch-Anordnung zurücksetzen' : 'Auf die Standard-Anordnung zurücksetzen'}
        >
          Layout zurücksetzen
        </button>
        {hasPreferred && (
          <button
            type="button"
            onClick={() => {
              dispatch({ type: 'clearPreferred', setup });
              notify('Wunsch-Anordnung gelöscht; Zurücksetzen nutzt wieder die Standard-Anordnung.');
            }}
            title="Wunsch-Anordnung dieser Bildschirm-Einstellung löschen"
          >
            Wunsch löschen
          </button>
        )}
        <span className="sep" />
        <label className="screen" title="Bildschirmklasse: bestimmt, wie viele Panels sichtbar sind">
          Bildschirm:{' '}
          <select value={clsOverride} onChange={(e) => setClsOverride(e.target.value as ScreenClassId | 'auto')}>
            <option value="auto">Automatisch ({screenClass(detected.cls).label})</option>
            {SCREEN_CLASSES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} – {c.capacity} sichtbar
              </option>
            ))}
          </select>
        </label>
        <select
          value={oriOverride}
          onChange={(e) => setOriOverride(e.target.value as Orientation | 'auto')}
          title="Ausrichtung des Bildschirms"
          aria-label="Ausrichtung"
        >
          <option value="auto">Ausrichtung automatisch ({detected.orientation === 'landscape' ? 'quer' : 'hoch'})</option>
          <option value="landscape">Querformat</option>
          <option value="portrait">Hochformat</option>
        </select>
        {canTwoLines && (
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
        )}
        <span className="muted">
          {view.slots.length} von {view.spec.capacity} Plätzen{view.stack.length > 0 ? ` · ${view.stack.length} Panels im Stapel` : ''}
        </span>
        <span className="grow" />
        {swapFrom && <span className="hint">Ziel-Panel anklicken · Esc bricht ab</span>}
        <span className="sep" />
        <button type="button" onClick={exportWorkspace} title="Arbeitsfläche als Datei speichern, um sie auf einem anderen Gerät zu laden">
          Exportieren
        </button>
        <button type="button" onClick={() => importRef.current?.click()} title="Arbeitsfläche aus einer exportierten Datei laden">
          Importieren
        </button>
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => void importWorkspace(e.currentTarget)}
        />
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
