import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import GridLayout, { WidthProvider, type Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './App.css';
import { WindowFrame } from './components/WindowFrame';
import { MIN_H, MIN_W, splitSelection } from './workspace/layout';
import {
  type Lines,
  type Orientation,
  type ScreenClassId,
  SCREEN_CLASSES,
  allowsTwoLines,
  detectScreen,
  screenClass,
} from './workspace/screen';
import { STACK_ID, type WinItem, type WinMeta } from './workspace/types';
import { useWorkspace } from './workspace/useWorkspace';
import { setupFor, slotOf, viewOf } from './workspace/workspace';

const Grid = WidthProvider(GridLayout);
const MARGIN = 8;

type View = { kind: 'grid' } | { kind: 'max'; id: string } | { kind: 'split'; count: 2 | 4 };

export default function App() {
  const [ws, dispatch] = useWorkspace();
  const [active, setActive] = useState<string | null>(ws.windows[0]?.id ?? null);
  const [mode, setMode] = useState<View>({ kind: 'grid' });
  const [swapFrom, setSwapFrom] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [clsOverride, setClsOverride] = useState<ScreenClassId | 'auto'>('auto');
  const [oriOverride, setOriOverride] = useState<Orientation | 'auto'>('auto');

  // Größe der Arbeitsfläche messen: bestimmt Bildschirmklasse und Ausrichtung (F-03)
  // sowie die Zeilenhöhe, damit das Raster genau den Bildschirm füllt.
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

  const detected = detectScreen(area.width, area.height);
  const cls = clsOverride === 'auto' ? detected.cls : clsOverride;
  const orientation = oriOverride === 'auto' ? detected.orientation : oriOverride;
  const setup = setupFor(ws, cls, orientation);
  const view = useMemo(() => viewOf(ws, setup), [ws, setup.cls, setup.orientation, setup.lines]);
  const spec = view.spec;
  const rowHeight = Math.max(12, (area.height - 2 * MARGIN - (spec.rows - 1) * MARGIN) / spec.rows);

  // Zähler, der nach jedem Ziehen steigt. So übernimmt das Raster unsere Anordnung
  // auch dann, wenn eine Änderung abgelehnt und der alte Stand wiederhergestellt wurde.
  const [rev, setRev] = useState(0);

  const notify = useCallback((text: string) => {
    setFlash(text);
    window.setTimeout(() => setFlash((f) => (f === text ? null : f)), 3000);
  }, []);

  // Esc beendet Tauschen, Maximieren und Splitscreen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (swapFrom) setSwapFrom(null);
      else if (mode.kind !== 'grid') setMode({ kind: 'grid' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [swapFrom, mode]);

  // Geschlossene Fenster aus Ansicht und Fokus entfernen.
  useEffect(() => {
    const exists = (id: string) => ws.windows.some((w) => w.id === id);
    if (mode.kind === 'max' && !exists(mode.id)) setMode({ kind: 'grid' });
    if (active && !exists(active)) setActive(ws.windows[0]?.id ?? null);
    if (swapFrom && !exists(swapFrom)) setSwapFrom(null);
  }, [ws.windows, mode, active, swapFrom]);

  const activate = (id: string) => {
    if (swapFrom && swapFrom !== id) {
      dispatch({ type: 'swap', setup, a: swapFrom, b: id });
      setSwapFrom(null);
    }
    setActive(id);
  };

  /** Fenster, das auf einem Platz sichtbar ist (beim Stapel das vorderste). */
  const shown = (item: WinItem): WinMeta | null =>
    item.id === STACK_ID ? view.front : (ws.windows.find((w) => w.id === item.id) ?? null);

  const frame = (meta: WinMeta, cells?: { w: number; h: number }) => {
    const inStack = slotOf(view, meta.id) === STACK_ID;
    return (
      <WindowFrame
        win={meta}
        cells={cells}
        stack={
          inStack && view.front
            ? {
                members: view.stack,
                frontId: view.front.id,
                onSelect: (id) => {
                  dispatch({ type: 'stackFront', setup, id });
                  setActive(id);
                },
                onStep: (step) => dispatch({ type: 'stackStep', setup, step }),
              }
            : undefined
        }
        active={meta.id === active}
        maximized={mode.kind === 'max' && mode.id === meta.id}
        swapSource={swapFrom === meta.id}
        swapTarget={swapFrom !== null && swapFrom !== meta.id}
        onActivate={() => activate(meta.id)}
        onRename={(name) => dispatch({ type: 'rename', id: meta.id, name })}
        onClose={() => dispatch({ type: 'remove', id: meta.id })}
        onStartSwap={() => {
          if (ws.windows.length < 2) return notify('Zum Tauschen braucht es mindestens zwei Fenster.');
          setSwapFrom(swapFrom === meta.id ? null : meta.id);
        }}
        onSetSize={(wf, hf) => dispatch({ type: 'setSize', setup, id: meta.id, w: wf, h: hf })}
        onReset={() => dispatch({ type: 'resetWindow', setup, id: meta.id })}
        onToggleMaximize={() =>
          setMode(mode.kind === 'max' && mode.id === meta.id ? { kind: 'grid' } : { kind: 'max', id: meta.id })
        }
      />
    );
  };

  // `rev` ist kein Feld von react-grid-layout; es sorgt nur dafür, dass das Raster den Stand neu übernimmt.
  const layout = view.items.map(
    (w) => ({ i: w.id, x: w.x, y: w.y, w: w.w, h: w.h, minW: MIN_W, minH: MIN_H, rev }) as Layout,
  );

  let content: ReactNode;
  if (ws.windows.length === 0) {
    content = (
      <div className="empty">
        <p>Keine Fenster geöffnet.</p>
        <button type="button" onClick={() => dispatch({ type: 'add', setup })}>
          + Fenster anlegen
        </button>
      </div>
    );
  } else if (mode.kind === 'max') {
    const meta = ws.windows.find((w) => w.id === mode.id);
    content = meta ? <div className="maximized">{frame(meta)}</div> : null;
  } else if (mode.kind === 'split') {
    const chosen = splitSelection(view.items, active && slotOf(view, active), mode.count)
      .map(shown)
      .filter((m): m is WinMeta => !!m);
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
      <Grid
        className="grid"
        layout={layout}
        cols={spec.cols}
        rowHeight={rowHeight}
        maxRows={spec.rows}
        margin={[MARGIN, MARGIN]}
        containerPadding={[MARGIN, MARGIN]}
        compactType={null}
        allowOverlap
        isBounded
        draggableHandle=".win-drag"
        draggableCancel=".no-drag"
        resizeHandles={['e', 's', 'se']}
        onDragStop={(_l, _old, item) => {
          dispatch({ type: 'move', setup, id: item.i, rect: { x: item.x, y: item.y, w: item.w, h: item.h } });
          setRev((r) => r + 1);
        }}
        onResizeStop={(_l, _old, item) => {
          dispatch({ type: 'resize', setup, id: item.i, rect: { x: item.x, y: item.y, w: item.w, h: item.h } });
          setRev((r) => r + 1);
        }}
      >
        {view.items.map((item) => {
          const meta = shown(item);
          return <div key={item.id}>{meta && frame(meta, { w: item.w, h: item.h })}</div>;
        })}
      </Grid>
    );
  }

  const inGrid = mode.kind === 'grid';
  const hasPreferred = !!ws.preferred[view.key];
  const canTwoLines = allowsTwoLines(cls);
  const lineWord = orientation === 'landscape' ? ['einzeilig', 'zweizeilig'] : ['einspaltig', 'zweispaltig'];

  return (
    <div className="app">
      <header className="toolbar">
        <strong className="brand">E-Source</strong>
        <button type="button" onClick={() => dispatch({ type: 'add', setup })} title="Neues Fenster anlegen">
          + Fenster
        </button>
        <span className="sep" />
        <button type="button" disabled={!inGrid} onClick={() => dispatch({ type: 'distribute', setup })} title="Alle Plätze gleich groß verteilen">
          Gleich verteilen
        </button>
        <button
          type="button"
          className={mode.kind === 'split' && mode.count === 2 ? 'on' : ''}
          onClick={() => setMode(mode.kind === 'split' && mode.count === 2 ? { kind: 'grid' } : { kind: 'split', count: 2 })}
          title="Splitscreen mit 2 Fenstern (aktives Fenster und das nächste)"
        >
          Split 2
        </button>
        <button
          type="button"
          className={mode.kind === 'split' && mode.count === 4 ? 'on' : ''}
          onClick={() => setMode(mode.kind === 'split' && mode.count === 4 ? { kind: 'grid' } : { kind: 'split', count: 4 })}
          title="Splitscreen mit 4 Fenstern"
        >
          Split 4
        </button>
        {!inGrid && (
          <button type="button" onClick={() => setMode({ kind: 'grid' })} title="Zurück zum Raster (Esc)">
            Zum Raster
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
            setMode({ kind: 'grid' });
            notify(hasPreferred ? 'Wunsch-Anordnung wiederhergestellt.' : 'Standard-Verteilung wiederhergestellt.');
          }}
          title={hasPreferred ? 'Auf die Wunsch-Anordnung zurücksetzen' : 'Auf die Standard-Verteilung zurücksetzen'}
        >
          Layout zurücksetzen
        </button>
        {hasPreferred && (
          <button
            type="button"
            onClick={() => {
              dispatch({ type: 'clearPreferred', setup });
              notify('Wunsch-Anordnung gelöscht; Zurücksetzen nutzt wieder die Standard-Verteilung.');
            }}
            title="Wunsch-Anordnung dieser Bildschirm-Einstellung löschen"
          >
            Wunsch löschen
          </button>
        )}
        <span className="sep" />
        <label className="screen" title="Bildschirmklasse: bestimmt, wie viele Fenster sichtbar sind">
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
          {view.items.length} von {spec.capacity} Plätzen{view.stack.length > 0 ? ` · ${view.stack.length} im Stapel` : ''}
        </span>
        <span className="grow" />
        {swapFrom && <span className="hint">Ziel-Fenster anklicken · Esc bricht ab</span>}
        {flash && !swapFrom && <span className="hint">{flash}</span>}
      </header>
      <main className="area" ref={areaRef}>
        {content}
      </main>
    </div>
  );
}
