import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import type { Slot, Workspace } from '../workspace/types';
import { type Focus, type RadarWindow, arrangeText, focusText, pointsText, radarMatches, radarOf, radarResize } from '../workspace/focus';
import * as T from '../workspace/tree';
import type { ScreenSetup } from '../workspace/screen';
import { windowName } from '../workspace/windows';
import { DEFAULT_MIN, NEW_AREA, loadColor } from '../workspace/workspace';
import type { MoveTarget } from '../workspace/move';
import { TERMS } from '../workspace/terms';

/**
 * F-29: Gesamtfokus als Equalizer-Pegel mit 9 Segmenten (Farben wie F-26/F-68). Ist zugleich der
 * Knopf, der das Fokus-Radar (F-28) ausklappt. Bildschirmleser hören Farbe und Punkte als Text.
 */
export function FocusMeter(props: { focus: Focus; open: boolean; onToggle: () => void; btnRef: RefObject<HTMLButtonElement> }) {
  const { focus, open } = props;
  const text = focusText(focus);
  // Ansage nur, wenn die Farbe wechselt – nicht bei jedem Punkt.
  const [said, setSaid] = useState('');
  const last = useRef(focus.color);
  useEffect(() => {
    if (last.current !== focus.color) setSaid(text);
    last.current = focus.color;
  }, [focus.color, text]);
  return (
    <>
      <button
        ref={props.btnRef}
        type="button"
        className={open ? 'focus-meter on' : 'focus-meter'}
        onClick={props.onToggle}
        aria-expanded={open}
        aria-controls="overview"
        aria-haspopup="dialog"
        aria-label={`${text}. Cockpit ${open ? 'schließen' : 'öffnen'}`}
        title={`${text} · Klick: Cockpit – alle Desks und Portale auf einen Blick (Strg/⌘+.)`}
      >
        <span className="focus-meter__bars" aria-hidden="true">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className={i < focus.level ? 'is-lit' : undefined} style={{ ['--c' as string]: loadColor(i + 1) }} />
          ))}
        </span>
        <span className="focus-meter__num" aria-hidden="true">
          {pointsText(focus.points)}
        </span>
        <span className="focus-meter__caret" aria-hidden="true">
          ▾
        </span>
      </button>
      <span className="sr-only" role="status">
        {said}
      </span>
    </>
  );
}

export interface OverviewProps {
  ws: Workspace;
  slots: Slot[];
  /** F-152: Einstellung dieses Fensters (Seitenverhältnis der Lagekarte). */
  setup: ScreenSetup;
  focus: Focus;
  activeId: string | null;
  /** Abstand von oben (unter der Kopfleiste) in Pixeln. */
  top: number;
  /** Knopf, der die Übersicht öffnet; Fokus geht beim Schließen dorthin zurück. */
  toggleRef: RefObject<HTMLButtonElement>;
  /** F-146: belegte Areas, Stapel und Bildschirm (vorher in der Kopfleiste). */
  info: string;
  /** F-27: dieses Fenster ('' = Hauptfenster) und die gerade offenen Fenster. */
  win: string;
  open: Set<string>;
  /** Panel zeigen – liegt es in einem anderen Fenster, dort. */
  onShow: (id: string) => void;
  /** F-27: Panel aus einem anderen Fenster hierher holen. */
  onFetch: (id: string) => string;
  /** F-27: alle Panels eines anderen Fensters hierher holen. */
  onFetchAll: (win: string) => string;
  /** F-27: anderes Fenster nach vorn holen bzw. wieder öffnen. */
  onOpenWindow: (win: string) => void;
  /** F-160: gesammelten Desk in diesem Browserfenster zeigen. */
  onShowDesk?: (win: string) => void;
  /** F-160: alle Desks hier sammeln bzw. gesammelte auf eigene Fenster verteilen. */
  onCollect?: () => void;
  onDistribute?: () => void;
  onClose: (id: string) => void;
  onRename: (id: string, name: string) => void;
  /** F-28: Ziele für ein Panel bzw. seine ganze Area (whole). */
  moveTargets: (id: string, whole: boolean) => MoveTarget[];
  /** F-28: Panel bzw. ganze Area auf ein Ziel legen. */
  onMove: (id: string, target: MoveTarget, whole: boolean) => void;
  /** F-27/F-28: Panel bzw. ganze Area in ein neues Fenster verschieben. */
  onNewWindow: (id: string, whole: boolean) => void;
  /** F-153: Mindestgröße einer Area in diesem Fenster (Anteile der Fläche). */
  min: T.Min;
  /** F-153: neue Anordnung für ein Fenster übernehmen ('' = Hauptfenster). */
  onLayout: (win: string, tree: T.Node) => void;
  onDismiss: () => void;
  /** F-172: Cockpit-Tour starten (Knopf im Kopf). */
  onTour?: () => void;
  /** F-172: Während einer Tour nicht einklappen, wenn der Fokus ins Hinweisfenster wandert. */
  keepOpen?: boolean;
}

/** F-153: Schrittweite für Alt+Umschalt+Pfeil (Anteil der Fläche). */
const ARRANGE_STEP = 0.05;
/** F-153: Randzone einer Kachel fürs Andocken (Anteil ihrer Breite bzw. Höhe). */
const DOCK_BAND = 0.28;
/** F-153: Randzone der ganzen Karte in Pixeln (andocken an die ganze Fläche). */
const MAP_BAND_PX = 7;
const SIDE_AT: Record<T.Side, string> = { left: 'links an', right: 'rechts an', top: 'oben an', bottom: 'unten an' };
const SIDE_EDGE: Record<T.Side, string> = { left: 'linken', right: 'rechten', top: 'oberen', bottom: 'unteren' };
const SIDE_FAR: Record<T.Side, string> = { left: 'links', right: 'rechts', top: 'oben', bottom: 'unten' };
type Dock = { win: string; leaf: string; target: string; zone: T.Side; label: string };

/** F-28: Text eines Ziels, z. B. „Auf „Recherche“ (3)“ oder „Eigene neue Area – kein Platz“. */
export function targetText(t: MoveTarget, winName: string): string {
  if (!t.area) return `Ins ${winName}`;
  if (t.area === NEW_AREA) return `Eigener neuer Slot${t.disabled ? ' – kein Platz' : ''}`;
  return `In „${t.label}“ ablegen${t.count > 1 ? ` (${t.count})` : ''}${t.disabled ? ' – Stack voll' : ''}`;
}

/**
 * F-28: Zielauswahl im Fokus-Radar – Liste aller Ziele, nach Fenstern gruppiert. Tastatur:
 * ↑/↓/Pos1/Ende wählen, Enter legt ab, Esc bricht ab (Fokus zurück auf die Zeile).
 */
function MovePicker(props: { title: string; targets: MoveTarget[]; here: string; winName: (w: string) => string; onPick: (t: MoveTarget) => void; onNewWindow: () => void; onCancel: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const usable = props.targets.filter((t) => !t.disabled);
  useEffect(() => {
    const first = box.current?.querySelector<HTMLButtonElement>('button.overview__target:not(:disabled)');
    (first ?? box.current?.querySelector<HTMLButtonElement>('button'))?.focus();
  }, []);
  const wins = [...new Set(props.targets.map((t) => t.win))].sort((a, b) => (a === props.here ? -1 : b === props.here ? 1 : 0));
  const onKey = (e: KeyboardEvent) => {
    const all = [...(box.current?.querySelectorAll<HTMLButtonElement>('button.overview__target:not(:disabled)') ?? [])];
    const i = all.indexOf(document.activeElement as HTMLButtonElement);
    const go = (k: number) => all[(k + all.length) % all.length]?.focus();
    const keys: Record<string, () => void> = {
      ArrowDown: () => go(i + 1),
      ArrowUp: () => go(i - 1),
      Home: () => go(0),
      End: () => go(all.length - 1),
      Escape: props.onCancel,
    };
    const f = keys[e.key];
    if (!f) return;
    e.preventDefault();
    e.stopPropagation();
    f();
  };
  return (
    <div ref={box} className="overview__pick" role="group" aria-label={props.title} onKeyDown={onKey}>
      <div className="overview__pick-head">
        <strong>{props.title}</strong>
        <button type="button" className="overview__x" onClick={props.onCancel} title="Abbrechen (Esc)" aria-label="Verschieben abbrechen">
          ×
        </button>
      </div>
      {usable.length === 0 && <p className="overview__empty">Gerade ist kein Slot frei – nur ein neuer Desk.</p>}
      {wins.map((w) => {
        const items = props.targets.filter((t) => t.win === w);
        if (items.length === 0) return null;
        const name = w === props.here ? 'Gleicher Desk' : props.winName(w);
        return (
          <ul key={w || 'main'} className="overview__pick-list" aria-label={name}>
            <li className="overview__pick-win" aria-hidden="true">
              {name}
            </li>
            {items.map((t) => (
              <li key={`${t.win}/${t.area}`}>
                <button type="button" className="overview__target" disabled={t.disabled} onClick={() => props.onPick(t)}>
                  {targetText(t, props.winName(t.win))}
                </button>
              </li>
            ))}
          </ul>
        );
      })}
      <ul className="overview__pick-list" aria-label="Neuer Desk">
        <li>
          <button type="button" className="overview__target" onClick={props.onNewWindow}>
            ⧉ Neuer Desk
          </button>
        </li>
      </ul>
    </div>
  );
}

/**
 * F-28 Fokus-Radar, F-152 als Lagekarte: links je Fenster eine Miniatur seines Bildschirms mit den
 * Areas an ihrer Stelle (Name, vorderes Panel, Ampel-Leiste je Panel), rechts die Panels der
 * gewählten Area. Das Filterfeld zeigt Treffer aus allen Fenstern.
 * Tastatur (NF-03): Pfeile wandern auf der Karte räumlich, Enter geht in die Liste; dort ↑/↓,
 * ← zurück zur Karte, Enter springt, V/Umschalt+V verschiebt, H holt her, Entf schließt, F2 benennt um.
 */
export function Overview(p: OverviewProps) {
  const wins = useMemo(() => radarOf(p.ws, p.slots, p.setup, p.open), [p.ws, p.slots, p.setup, p.open]);
  const tiles = wins.flatMap((w, wi) => w.areas.map((a) => ({ w, wi, a })));
  const tileOfPanel = (id: string | null) => (id ? tiles.find((t) => t.a.panels.some((x) => x.meta.id === id)) : undefined);
  const [sel, setSel] = useState<string | null>(() => (tileOfPanel(p.activeId) ?? tiles[0])?.a.id ?? null);
  const [query, setQuery] = useState('');
  const [cur, setCur] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [said, setSaid] = useState('');
  /** F-28: Panel (oder ganze Area), für das gerade ein Ziel gewählt wird. */
  const [moving, setMoving] = useState<{ id: string; whole: boolean } | null>(null);
  const rowBtns = useRef(new Map<string, HTMLButtonElement>());
  const tileBtns = useRef(new Map<string, HTMLButtonElement>());
  const box = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLInputElement>(null);
  /** F-151: Panel-Zeile (oder ganze Area per Kachel) wird gerade gezogen. */
  const [drag, setDrag] = useState<{ name: string; whole: boolean; x: number; y: number; over: string | null; target: MoveTarget | null; dock: Dock | null } | null>(null);
  /** F-153: Kante wird gerade gezogen (Griffe ausblenden, außer dem gezogenen). */
  const [sizing, setSizing] = useState<string | null>(null);
  /** Nach einem Ziehen den folgenden Klick nicht als Klick werten. */
  const dragged = useRef(false);

  const selTile = tiles.find((t) => t.a.id === sel) ?? tiles[0];
  const q = query.trim();
  /** Zeilen rechts: Treffer aus allen Fenstern oder die Panels der gewählten Area. */
  const rows = q
    ? tiles.flatMap((t) => t.a.panels.filter((x) => radarMatches(t.w, t.a, x, q)).map((x) => ({ x, t })))
    : (selTile?.a.panels ?? []).map((x) => ({ x, t: selTile! }));
  const order = rows.map((r) => r.x.meta.id);
  const focusId = cur && order.includes(cur) ? cur : (order[0] ?? null);
  /** F-153: echte Area-Id einer Kachel im Baum ihres Fensters; null = Anordnung unbekannt. */
  const leafOf = (t: { w: RadarWindow; a: RadarWindow['areas'][number] }) => (t.a.rect === null ? null : t.w.here ? t.a.id : t.a.id.slice(t.w.win.length + 1));
  const hits = (t: (typeof tiles)[number]) => t.a.panels.some((x) => radarMatches(t.w, t.a, x, q));

  const later = (f: () => void) => requestAnimationFrame(f);
  // Beim Öffnen: Fokus auf die Kachel des aktiven Panels.
  useEffect(() => {
    if (sel) tileBtns.current.get(sel)?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = () => {
    p.onDismiss();
    p.toggleRef.current?.focus();
  };
  const toRow = (id: string | null | undefined) => {
    if (!id) return;
    setCur(id);
    later(() => rowBtns.current.get(id)?.focus());
  };
  const toTile = (id: string | undefined) => {
    if (!id) return;
    setSel(id);
    setCur(null);
    later(() => tileBtns.current.get(id)?.focus());
  };

  const commit = () => {
    if (editing && draft.trim()) p.onRename(editing, draft.trim());
    const id = editing;
    setEditing(null);
    toRow(id);
  };
  const fetch = (id: string, name: string) => {
    const text = p.onFetch(id);
    setSaid(text.startsWith('Portal ') ? `Portal „${name}“ auf diesen Desk geholt.` : text);
  };
  const close = (id: string, name: string) => {
    const i = order.indexOf(id);
    const next = order[i + 1] ?? order[i - 1] ?? null;
    p.onClose(id);
    setSaid(`Portal „${name}“ geschlossen.`);
    if (next) toRow(next);
    else toTile(sel ?? undefined);
  };

  /**
   * F-151: Ziehen mit der Maus – Panel-Zeile auf eine Kachel = dort obendrauf legen, auf freie
   * Fläche einer Karte = eigene neue Area. Eine Kachel selbst zieht die ganze Area.
   * Tastatur-Ersatz: V bzw. Umschalt+V (NF-03).
   */
  const startDrag = (e: ReactPointerEvent, id: string, whole: boolean, name: string, fromTile: string, fromLeaf: string | null = null, fromWin = '') => {
    if (e.button !== 0 || editing) return;
    const x0 = e.clientX;
    const y0 = e.clientY;
    const targets = p.moveTargets(id, whole);
    let started = false;
    let last: NonNullable<typeof drag> | null = null;
    const blocked = (win: string, area: string): MoveTarget => ({ win, area, label: '', count: 0, disabled: true });
    const move = (ev: PointerEvent) => {
      if (!started && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return;
      if (!started) document.body.classList.add('gesture');
      started = true;
      dragged.current = true;
      const el = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
      const tile = el?.closest<HTMLElement>('.radar__tile');
      const newEl = el?.closest<HTMLElement>('.radar__new');
      let over: string | null = null;
      let target: MoveTarget | null = null;
      // F-153: ganze Area am Rand einer anderen Kachel bzw. der Karte desselben Fensters = andocken.
      let dock: Dock | null = null;
      const mapEl = el?.closest<HTMLElement>('.radar__map');
      if (whole && fromLeaf && mapEl && (mapEl.dataset.win ?? '') === fromWin) {
        const b = mapEl.getBoundingClientRect();
        const edges: [T.Side, number][] = [
          ['left', ev.clientX - b.left],
          ['right', b.right - ev.clientX],
          ['top', ev.clientY - b.top],
          ['bottom', b.bottom - ev.clientY],
        ];
        edges.sort((m, n) => m[1] - n[1]);
        if (edges[0][1] < MAP_BAND_PX) dock = { win: fromWin, leaf: fromLeaf, target: T.AREA, zone: edges[0][0], label: '' };
        else if (tile && tile.dataset.key !== fromTile && tile.dataset.area) {
          const tb = tile.getBoundingClientRect();
          const u = (ev.clientX - tb.left) / tb.width;
          const v = (ev.clientY - tb.top) / tb.height;
          const d: [T.Side, number][] = [
            ['left', u],
            ['right', 1 - u],
            ['top', v],
            ['bottom', 1 - v],
          ];
          d.sort((m, n) => m[1] - n[1]);
          if (d[0][1] < DOCK_BAND) dock = { win: fromWin, leaf: fromLeaf, target: tile.dataset.area, zone: d[0][0], label: tile.dataset.title ?? '' };
        }
      }
      if (dock) {
        over = dock.target === T.AREA ? `map:${fromWin}` : (tile?.dataset.key ?? null);
      } else if (tile && tile.dataset.key !== fromTile) {
        const w = tile.dataset.win ?? '';
        const a = tile.dataset.area ?? '';
        over = tile.dataset.key ?? null;
        target = targets.find((t) => t.win === w && t.area === a) ?? blocked(w, a);
      } else if (newEl) {
        const w = newEl.dataset.win ?? '';
        over = `new:${w}`;
        target = targets.find((t) => t.win === w && t.area === NEW_AREA) ?? blocked(w, NEW_AREA);
      }
      last = { name, whole, x: ev.clientX, y: ev.clientY, over, target, dock };
      setDrag(last);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.classList.remove('gesture');
      setDrag(null);
      setTimeout(() => (dragged.current = false), 0);
      const d = last;
      if (d?.dock) {
        const k = d.dock;
        const tree = wins.find((w) => w.win === k.win)?.tree;
        const next = tree ? T.drop(tree, k.leaf, k.target, k.zone) : null;
        if (!tree || !next || JSON.stringify(next) === JSON.stringify(tree)) {
          setSaid(`„${name}“ liegt schon so.`);
          return;
        }
        p.onLayout(k.win, next);
        const r = T.rects(next).get(k.leaf);
        if (r) setSaid(arrangeText(name, r));
        return;
      }
      if (!d?.target) return;
      const winName = windowName(p.ws, d.target.win);
      if (d.target.disabled) {
        setSaid(d.target.area === NEW_AREA ? `Kein freier Slot in ${winName}.` : 'Dieser Stack ist voll (9 Portale).');
        return;
      }
      // Die Ansage kommt von der Anwendung („… jetzt auf …“), hier nicht doppelt.
      p.onMove(id, d.target, whole);
      setSaid('');
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  const dropText = (d: NonNullable<typeof drag>) => {
    if (d.dock) return d.dock.target === T.AREA ? ` → am ${SIDE_EDGE[d.dock.zone]} Rand einsetzen` : ` → ${SIDE_AT[d.dock.zone]} „${d.dock.label}“ einsetzen`;
    if (!d.target) return '';
    if (d.target.disabled) return d.target.area === NEW_AREA ? ' → kein Platz für einen neuen Slot' : ' → Stack voll';
    if (d.target.area === NEW_AREA) return ' → eigener neuer Slot';
    if (!d.target.area) return ` → ins ${windowName(p.ws, d.target.win)}`;
    return ` → in „${d.target.label}“ ablegen`;
  };

  /** Nächste Kachel in einer Richtung – über alle Fenster, die untereinander stehen. */
  const neighbour = (from: (typeof tiles)[number], dx: number, dy: number, sameWin = false) => {
    const c = (t: (typeof tiles)[number]) => {
      const r = t.a.rect ?? { x: 0, y: 0, w: 1, h: 1 };
      return { x: r.x + r.w / 2, y: t.wi * 1.2 + r.y + r.h / 2 };
    };
    const o = c(from);
    let best: (typeof tiles)[number] | undefined;
    let score = Infinity;
    for (const t of tiles) {
      if (t === from || (sameWin && t.wi !== from.wi)) continue;
      const v = c(t);
      const along = (v.x - o.x) * dx + (v.y - o.y) * dy;
      if (along <= 0.001) continue;
      const across = Math.abs((v.x - o.x) * dy) + Math.abs((v.y - o.y) * dx);
      const s = along + 2 * across;
      if (s < score) {
        score = s;
        best = t;
      }
    }
    return best;
  };

  /**
   * F-153 Tastatur: Alt+Pfeil dockt die Area hinter der Nachbar-Area in dieser Richtung an (ohne
   * Nachbarn: an den ganzen Rand), Alt+Umschalt+Pfeil macht sie breiter/schmaler bzw. höher/flacher.
   */
  const arrangeKey = (t: (typeof tiles)[number], key: string, resize: boolean) => {
    const leaf = leafOf(t);
    const tree = t.w.tree;
    if (!leaf || !tree) {
      setSaid(`Die Anordnung von ${t.w.title} ist noch unbekannt – der Desk war noch nicht offen.`);
      return;
    }
    const dirs: Record<string, [number, number, T.Side]> = { ArrowRight: [1, 0, 'right'], ArrowLeft: [-1, 0, 'left'], ArrowDown: [0, 1, 'bottom'], ArrowUp: [0, -1, 'top'] };
    const [dx, dy, side] = dirs[key];
    const min = t.w.here ? p.min : DEFAULT_MIN;
    let next: T.Node;
    let none: string;
    if (resize) {
      const axis = dx ? 'w' : 'h';
      const grow = dx > 0 || dy > 0;
      next = radarResize(tree, leaf, axis, grow, ARRANGE_STEP, min);
      none = `„${t.a.title}“ lässt sich nicht ${axis === 'w' ? (grow ? 'breiter' : 'schmaler') : grow ? 'höher' : 'flacher'} machen.`;
    } else {
      const nb = neighbour(t, dx, dy, true);
      const nbLeaf = nb ? leafOf(nb) : null;
      const r = t.a.rect ?? T.FULL;
      const spans = dx ? r.h > 0.999 && (dx > 0 ? r.x + r.w > 0.999 : r.x < 0.001) : r.w > 0.999 && (dy > 0 ? r.y + r.h > 0.999 : r.y < 0.001);
      next = nbLeaf ? T.dock(tree, leaf, nbLeaf, side) : spans ? tree : T.dockArea(tree, leaf, side);
      none = `„${t.a.title}“ liegt schon ganz ${SIDE_FAR[side]}.`;
    }
    if (JSON.stringify(next) === JSON.stringify(tree)) {
      setSaid(none);
      return;
    }
    p.onLayout(t.w.win, next);
    const r = T.rects(next).get(leaf);
    if (r) setSaid(arrangeText(t.a.title, r));
    later(() => tileBtns.current.get(t.a.id)?.focus());
  };

  /** F-153 Maus: Kante zwischen zwei Kacheln ziehen = Größe ändern; die Arbeitsfläche folgt sofort. */
  const startResize = (e: ReactPointerEvent, w: RadarWindow, leaf: string, title: string, side: 'right' | 'bottom', key: string) => {
    const base = w.tree;
    const mapEl = (e.currentTarget as HTMLElement).parentElement;
    if (!base || !mapEl || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const b = mapEl.getBoundingClientRect();
    const x0 = e.clientX;
    const y0 = e.clientY;
    const min = w.here ? p.min : DEFAULT_MIN;
    let last = base;
    let frame = 0;
    const at = (ev: PointerEvent) => T.resizeEdges(base, leaf, side === 'right' ? { x: 'right', dx: (ev.clientX - x0) / b.width } : { y: 'bottom', dy: (ev.clientY - y0) / b.height }, min);
    const move = (ev: PointerEvent) => {
      last = at(ev);
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0;
          p.onLayout(w.win, last);
        });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (frame) cancelAnimationFrame(frame);
      document.body.classList.remove('gesture');
      document.body.style.cursor = '';
      setSizing(null);
      if (last === base) return;
      p.onLayout(w.win, last);
      const r = T.rects(last).get(leaf);
      if (r) setSaid(arrangeText(title, r));
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    document.body.classList.add('gesture');
    document.body.style.cursor = side === 'right' ? 'col-resize' : 'row-resize';
    setSizing(key);
  };

  const onTileKey = (e: KeyboardEvent, t: (typeof tiles)[number]) => {
    // F-153: Alt+Pfeil andocken, Alt+Umschalt+Pfeil Größe (vor den normalen Pfeilen).
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.startsWith('Arrow')) {
      e.preventDefault();
      e.stopPropagation();
      arrangeKey(t, e.key, e.shiftKey);
      return;
    }
    const front = t.a.panels.find((x) => x.front) ?? t.a.panels[0];
    const keys: Record<string, () => void> = {
      ArrowRight: () => toTile(neighbour(t, 1, 0)?.a.id),
      ArrowLeft: () => toTile(neighbour(t, -1, 0)?.a.id),
      ArrowDown: () => toTile(neighbour(t, 0, 1)?.a.id),
      ArrowUp: () => toTile(neighbour(t, 0, -1)?.a.id),
      Home: () => toTile(tiles[0]?.a.id),
      End: () => toTile(tiles[tiles.length - 1]?.a.id),
      Enter: () => {
        setQuery('');
        setSel(t.a.id);
        toRow(front?.meta.id);
      },
      ' ': () => {
        setQuery('');
        setSel(t.a.id);
        toRow(front?.meta.id);
      },
      // F-28: Umschalt+V verschiebt die ganze Area.
      V: () => front && setMoving({ id: front.meta.id, whole: true }),
      Escape: dismiss,
    };
    const f = keys[e.key];
    if (!f) return;
    e.preventDefault();
    e.stopPropagation();
    f();
  };

  const onRowKey = (e: KeyboardEvent, id: string, name: string, other: boolean) => {
    const i = order.indexOf(id);
    const n = order.length;
    const keys: Record<string, () => void> = {
      ArrowDown: () => toRow(order[(i + 1) % n]),
      ArrowUp: () => (q && i === 0 ? filterRef.current?.focus() : toRow(order[(i - 1 + n) % n])),
      ArrowLeft: () => toTile(rows[i]?.t.a.id ?? sel ?? undefined),
      Home: () => toRow(order[0]),
      End: () => toRow(order[n - 1]),
      F2: () => {
        setDraft(name);
        setEditing(id);
      },
      // F-27: H holt ein Panel aus einem anderen Fenster hierher.
      h: () => other && fetch(id, name),
      H: () => other && fetch(id, name),
      // F-28: V verschiebt das Panel, Umschalt+V die ganze Area.
      v: () => setMoving({ id, whole: false }),
      V: () => setMoving({ id, whole: true }),
      Delete: () => close(id, name),
      Backspace: () => close(id, name),
      Escape: dismiss,
    };
    const f = keys[e.key];
    if (!f) return;
    e.preventDefault();
    e.stopPropagation();
    f();
  };

  const row = ({ x, t }: (typeof rows)[number]) => {
    const id = x.meta.id;
    const a = t.a;
    const isActive = id === p.activeId;
    const tabs = `${x.tabs} ${x.tabs === 1 ? 'Tab' : 'Tabs'}`;
    const where = q ? `${a.title}${a.other ? ` · ${t.w.title}` : ''}` : x.host || '–';
    if (editing === id)
      return (
        <li key={id} className="overview__row is-edit">
          <input
            className="overview__input"
            value={draft}
            autoFocus
            aria-label="Neuer Portalname"
            onFocus={(e) => e.target.select()}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              e.stopPropagation();
              // preventDefault: sonst löst dasselbe Enter auf der wieder fokussierten Zeile „Panel zeigen“ aus
              if (e.key === 'Enter') {
                e.preventDefault();
                commit();
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                setEditing(null);
                toRow(id);
              }
            }}
          />
        </li>
      );
    const stacked = a.panels.length > 1;
    return (
      <li key={id} className={`overview__row${isActive ? ' is-active' : ''}${x.front ? ' is-front' : ''}`}>
        <button
          ref={(el) => {
            if (el) rowBtns.current.set(id, el);
            else rowBtns.current.delete(id);
          }}
          type="button"
          className="overview__go"
          tabIndex={id === focusId ? 0 : -1}
          aria-current={isActive ? 'true' : undefined}
          aria-label={`${x.meta.name}, ${x.host || 'leerer Tab'}, ${tabs}${stacked && x.front ? ', vorn' : ''}${isActive ? ', aktiv' : ''}${q || a.other ? `, ${a.title}${a.other ? `, ${t.w.title}` : ''}` : ''}`}
          title={x.host || undefined}
          onFocus={() => setCur(id)}
          onKeyDown={(e) => onRowKey(e, id, x.meta.name, a.other)}
          onPointerDown={(e) => startDrag(e, id, false, x.meta.name, a.id)}
          onClick={() => {
            if (dragged.current) return;
            p.onShow(id);
            dismiss();
          }}
        >
          <span className="overview__dot" style={{ background: loadColor(x.tabs) }} aria-hidden="true" />
          <span className="overview__name">{x.meta.name}</span>
          <span className="overview__host">{where}</span>
          <span className="overview__tabs">{x.tabs}</span>
          <span className="overview__back">{stacked && x.front ? 'vorn' : ''}</span>
        </button>
        <button type="button" className="overview__tool" tabIndex={-1} title="Verschieben (V, ganzer Slot: Umschalt+V)" aria-label={`„${x.meta.name}“ verschieben`} onClick={(e) => setMoving({ id, whole: e.shiftKey })}>
          ↦
        </button>
        {a.other && (
          <button type="button" className="overview__tool" tabIndex={-1} title="Hierher holen (H)" aria-label={`„${x.meta.name}“ auf diesen Desk holen`} onClick={() => fetch(id, x.meta.name)}>
            ⇣
          </button>
        )}
        <button
          type="button"
          className="overview__tool"
          tabIndex={-1}
          title="Umbenennen (F2)"
          aria-label={`„${x.meta.name}“ umbenennen`}
          onClick={() => {
            setDraft(x.meta.name);
            setEditing(id);
          }}
        >
          ✎
        </button>
        <button type="button" className="overview__tool overview__tool--x" tabIndex={-1} title="Portal schließen (Entf)" aria-label={`„${x.meta.name}“ schließen`} onClick={() => close(id, x.meta.name)}>
          ×
        </button>
      </li>
    );
  };

  const map = (w: RadarWindow) => (
    <section key={w.win || 'main'} className={w.here ? 'radar__win' : 'radar__win is-other'} aria-label={`${w.here ? 'Dieser Desk' : w.title}${w.here ? '' : w.open ? ', eigenes Fenster' : ', gesammelt'}`}>
      <div className="radar__win-head">
        <strong>{w.here ? `Dieser Desk · ${w.title}` : w.title}</strong>
        <span className="muted">{((n) => `${n} ${n === 1 ? 'Portal' : 'Portale'}`)(w.areas.reduce((n, a) => n + a.panels.length, 0))}</span>
        {/* F-27: Zustand nicht nur als Farbe, sondern als Wort */}
        {!w.here && (
          <span className={w.open ? 'overview__state is-open' : 'overview__state'} title={w.open ? undefined : TERMS.collected}>
            {w.open ? 'eigenes Fenster' : 'gesammelt'}
          </span>
        )}
        {!w.here && (
          <>
            {/* F-160: gesammelter Desk – hier zeigen oder wieder in eigenem Fenster öffnen */}
            {!w.open && p.onShowDesk && (
              <button type="button" onClick={() => p.onShowDesk?.(w.win)}>
                Hier zeigen
              </button>
            )}
            <button type="button" onClick={() => p.onOpenWindow(w.win)}>
              {w.open ? 'Nach vorn holen' : 'Eigenes Fenster'}
            </button>
            <button
              type="button"
              onClick={() => {
                setSaid(p.onFetchAll(w.win));
              }}
            >
              {p.win ? 'Alle hierher holen' : 'Alle auf den Main Desk holen'}
            </button>
          </>
        )}
      </div>
      {drag && (
        <div className={drag.over === `new:${w.win}` ? `radar__new is-drop${drag.target?.disabled ? ' is-no' : ''}` : 'radar__new'} data-win={w.win} aria-hidden="true">
          ＋ Eigener neuer Slot{w.here ? '' : ` in ${w.title}`}
        </div>
      )}
      <div
        className={drag?.dock && drag.dock.target === T.AREA && drag.dock.win === w.win ? `radar__map is-dock is-dock-${drag.dock.zone}` : 'radar__map'}
        data-droplabel="Am Rand einsetzen"
        data-win={w.win}
        style={{ ['--ar' as string]: w.aspect }}
      >
        {w.areas.map((a) => {
          const t = tiles.find((x) => x.a === a)!;
          const r = a.rect ?? { x: 0, y: 0, w: 1, h: 1 };
          const front = a.panels.find((x) => x.front) ?? a.panels[0];
          const n = a.panels.length;
          const on = a.id === selTile?.a.id;
          const hasActive = a.panels.some((x) => x.meta.id === p.activeId);
          const realArea = leafOf(t) ?? '';
          const dockHere = !!drag?.dock && drag.dock.target === realArea && drag.dock.win === w.win;
          const over = drag?.over === a.id && !dockHere;
          const cls = [
            'radar__tile',
            on && 'is-sel',
            hasActive && 'is-active',
            q && !hits(t) && 'is-miss',
            q && hits(t) && 'is-hit',
            over && 'is-drop',
            over && drag?.target?.disabled && 'is-no',
            dockHere && `is-dock is-dock-${drag!.dock!.zone}`,
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={a.id}
              ref={(el) => {
                if (el) tileBtns.current.set(a.id, el);
                else tileBtns.current.delete(a.id);
              }}
              type="button"
              className={cls}
              data-key={a.id}
              data-win={w.win}
              data-area={realArea}
              data-title={a.title}
              title={realArea ? 'Ziehen: Mitte = im Portal ablegen, Rand = an dieser Position einsetzen · Alt+Pfeil einsetzen, Alt+Umschalt+Pfeil Größe' : undefined}
              style={{ left: `calc(${r.x * 100}% + 2px)`, top: `calc(${r.y * 100}% + 2px)`, width: `calc(${r.w * 100}% - 4px)`, height: `calc(${r.h * 100}% - 4px)` }}
              tabIndex={on ? 0 : -1}
              aria-pressed={on}
              aria-label={`${a.title}, ${n} ${n === 1 ? 'Portal' : 'Portale'}${n > 1 && front ? `, vorn ${front.meta.name}` : ''}${hasActive ? ', enthält das aktive Portal' : ''}`}
              onFocus={() => setSel(a.id)}
              onPointerDown={(e) => front && n > 0 && startDrag(e, front.meta.id, true, a.title, a.id, realArea || null, w.win)}
              onClick={() => {
                if (dragged.current) return;
                setSel(a.id);
                setQuery('');
              }}
              onDoubleClick={() => front && toRow(front.meta.id)}
              onKeyDown={(e) => onTileKey(e, t)}
            >
              {/* F-153: Was beim Loslassen passiert – in Worten, nicht nur als Farbe */}
              {(over || dockHere) && (
                <span className="radar__droplabel" aria-hidden="true">
                  {dockHere ? 'An dieser Position einsetzen' : drag?.target?.disabled ? 'Stack voll' : 'Im Portal ablegen'}
                </span>
              )}
              <span className="radar__title">{a.title}</span>
              {n > 1 && front && <span className="radar__front">{front.meta.name}</span>}
              <span className="radar__eq" aria-hidden="true">
                {Array.from({ length: 9 }, (_, i) => (
                  <span key={i} className={i < n ? 'is-lit' : undefined} style={{ ['--c' as string]: loadColor(i + 1) }} />
                ))}
              </span>
            </button>
          );
        })}
        {/* F-153: Griffe an den Kanten zwischen Kacheln (Tastatur: Alt+Umschalt+Pfeil auf der Kachel) */}
        {w.tree &&
          !drag &&
          w.areas.flatMap((a) => {
            const leaf = leafOf({ w, a });
            const r = a.rect;
            if (!leaf || !r) return [];
            return (['right', 'bottom'] as const)
              .filter((side) => T.canResize(w.tree, leaf, side))
              .map((side) => {
                const key = `${a.id}/${side}`;
                if (sizing && sizing !== key) return null;
                const style =
                  side === 'right'
                    ? { left: `calc(${(r.x + r.w) * 100}% - 4px)`, top: `${r.y * 100}%`, height: `${r.h * 100}%` }
                    : { top: `calc(${(r.y + r.h) * 100}% - 4px)`, left: `${r.x * 100}%`, width: `${r.w * 100}%` };
                return (
                  <div
                    key={key}
                    className={`radar__edge radar__edge--${side === 'right' ? 'v' : 'h'}${sizing === key ? ' is-on' : ''}`}
                    style={style}
                    aria-hidden="true"
                    title="Ziehen: Größe ändern"
                    onPointerDown={(e) => startResize(e, w, leaf, a.title, side, key)}
                  />
                );
              });
          })}
      </div>
    </section>
  );

  const detailHead = q
    ? `${rows.length} ${rows.length === 1 ? 'Treffer' : 'Treffer'} für „${q}“`
    : selTile
      ? `${selTile.w.here ? '' : `${selTile.w.title} · `}${selTile.a.title} · ${selTile.a.panels.length} ${selTile.a.panels.length === 1 ? 'Portal' : 'Portale'}`
      : '';

  return (
    <>
      <div className="overview-backdrop" onClick={dismiss} aria-hidden="true" />
      <div
        id="overview"
        ref={box}
        className="overview"
        role="dialog"
        aria-label="Cockpit: alle Portale auf einen Blick"
        aria-describedby="overview-help"
        style={{ top: p.top }}
        onBlur={(e) => {
          // Fokus wandert woanders hin (z. B. Tab ans Ende) → einklappen; nicht beim Knopf selbst (der schaltet um).
          const to = e.relatedTarget as Node | null;
          if (!p.keepOpen && to && !box.current?.contains(to) && to !== p.toggleRef.current) p.onDismiss();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            dismiss();
          }
        }}
      >
        <div className="overview__head">
          <strong title={TERMS.cockpit}>Cockpit</strong>
          <span className="overview__focus">{focusText(p.focus)}</span>
          <span className="overview__focus">{p.info}</span>
          <span className="grow" />
          <input
            ref={filterRef}
            className="radar__filter"
            type="search"
            value={query}
            placeholder="Filtern: Portal, Slot, Desk, Source …"
            aria-label="Portale filtern"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                toRow(order[0]);
              } else if (e.key === 'Escape' && query) {
                e.preventDefault();
                e.stopPropagation();
                setQuery('');
              }
            }}
          />
          {/* F-160: Desks in diesem Fenster sammeln bzw. wieder auf Fenster verteilen */}
          {p.ws.windows.length > 0 && p.onCollect && (
            <button type="button" className="overview__tour" onClick={p.onCollect} title={TERMS.collectDesks}>
              Hier sammeln
            </button>
          )}
          {p.ws.windows.length > 0 && p.onDistribute && (
            <button type="button" className="overview__tour" onClick={p.onDistribute} title={TERMS.distributeDesks}>
              Verteilen
            </button>
          )}
          {p.onTour && (
            <button type="button" className="overview__tour" onClick={p.onTour} title="Kurze Einführung ins Cockpit" aria-label="Tour durch das Cockpit starten">
              Tour
            </button>
          )}
          <button type="button" className="overview__x" onClick={dismiss} title="Cockpit schließen (Esc)" aria-label="Cockpit schließen">
            ×
          </button>
        </div>
        <p id="overview-help" className="sr-only">
          Radar: Jeder Desk zeigt seine Slots an ihrer Stelle auf dem Bildschirm. Pfeiltasten wandern zwischen den Slots, Enter öffnet die Portal-Liste. In der Liste wählen Pfeil hoch und runter ein Portal, Pfeil links geht zurück zum Radar. Enter zeigt das Portal, auch auf einem anderen Desk. V verschiebt das Portal, Umschalt und V den ganzen Slot. H holt ein Portal von einem anderen Desk hierher. Entf schließt es, F2 benennt es um. Auf einem Slot setzt Alt mit Pfeil ihn in diese Richtung an eine neue Position, Alt, Umschalt und Pfeil macht ihn breiter, schmaler, höher oder flacher; der Desk folgt sofort. Mit der Maus lässt sich eine Portal-Zeile auf einen Slot im Radar ziehen, auf das Feld „Eigener neuer Slot“ über einem Desk, und eine Slot-Kachel auf eine andere: in die Mitte = im Portal ablegen, an den Rand = an dieser Position einsetzen. Die Kante zwischen zwei Slots ändert beim Ziehen die Größe. Das Filterfeld zeigt Treffer von allen Desks. Escape schließt das Cockpit.
        </p>
        {moving &&
          (() => {
            const m = p.ws.panels.find((x) => x.id === moving.id);
            if (!m) return null;
            const title = moving.whole ? `Ganzen Slot von „${m.name}“ verschieben nach …` : `„${m.name}“ verschieben nach …`;
            return (
              <MovePicker
                title={title}
                targets={p.moveTargets(moving.id, moving.whole).filter((t) => !(t.area === NEW_AREA && t.disabled && t.win === (m.win ?? '')))}
                here={m.win ?? ''}
                winName={(w) => windowName(p.ws, w)}
                onCancel={() => {
                  setMoving(null);
                  toRow(moving.id);
                }}
                onNewWindow={() => {
                  p.onNewWindow(moving.id, moving.whole);
                  setSaid(`${moving.whole ? 'Slot' : `„${m.name}“`} auf einen neuen Desk verschoben.`);
                  setMoving(null);
                }}
                onPick={(t) => {
                  p.onMove(moving.id, t, moving.whole);
                  setSaid(`${moving.whole ? 'Slot' : `„${m.name}“`} verschoben: ${targetText(t, windowName(p.ws, t.win))}${t.area && t.win !== (m.win ?? '') ? `, ${windowName(p.ws, t.win)}` : ''}.`);
                  setMoving(null);
                  toRow(moving.id);
                }}
              />
            );
          })()}
        {tiles.length === 0 ? (
          <p className="overview__empty">Noch keine Portale – lege oben mit „+ NewSlot“ eine an.</p>
        ) : (
          <div className="radar">
            <div className="radar__maps">{wins.map(map)}</div>
            <section className="radar__detail" aria-label={detailHead}>
              <h3 className="radar__detail-head">{detailHead}</h3>
              {rows.length === 0 ? <p className="overview__empty">Kein Portal passt.</p> : <ul className="overview__list">{rows.map(row)}</ul>}
            </section>
          </div>
        )}
        {drag && (
          <div className="ghost radar__ghost" style={{ left: drag.x + 14, top: drag.y + 14 }} aria-hidden="true">
            {drag.whole ? `Slot „${drag.name}“` : drag.name}
            {dropText(drag)}
          </div>
        )}
        <span className="sr-only" role="status">
          {said || (q ? detailHead : '')}
        </span>
      </div>
    </>
  );
}
