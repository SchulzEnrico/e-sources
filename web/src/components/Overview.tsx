import { SourceCockpit } from './SourceCockpit';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import type { Slot, Workspace } from '../workspace/types';
import { type Focus, type RadarWindow, arrangeText, focusText, pointsText, radarMatches, radarOf } from '../workspace/focus';
import { ARROWS, DOCK_BAND, MAP_BAND_PX, arrangeStep, nearestSide, sameTree } from '../workspace/arrange';
import * as T from '../workspace/tree';
import type { ScreenSetup } from '../workspace/screen';
import { windowName } from '../workspace/windows';
import { DEFAULT_MIN, NEW_AREA, loadColor, newId } from '../workspace/workspace';
import type { MoveTarget } from '../workspace/move';
import { NOTES_COCKPIT_TEXT, PERSONS_TEXT, FOCUS_TEXT, NT_TEXT, PAD_TEXT, ARRANGE_TEXT, COCKPIT_TEXT, DESK_LAYOUT_TEXT, JACKPOT_TEXT, RULES_TEXT, SLOT_FILE_TEXT, STAGE_TEXT, TERMS, DIALOG_TEXT } from '../workspace/terms';
import type { Shown } from '../workspace/look';
import { type Action, padOpenResult } from '../workspace/useWorkspace';
import { Rules } from './Rules';
import { RULE_SET_TEXT } from '../workspace/terms';
import { LayoutCockpit, type LayoutOps } from './DeskLayouts';
import { ModeWheel } from './ModeWheel';
import { NotesCockpit } from './NotesCockpit';
import { PersonCockpit } from './PersonCockpit';
import { FocusCockpit } from './FocusCockpit';
import { Icon } from './Icon';
import * as St from '../workspace/stage';
import { noticeLater } from '../workspace/flash';

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
        <Icon name="cockpit" className="focus-meter__icon" />
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
  /** F-158: Slot (Portale in Stack-Reihenfolge, vorderes) als Datei speichern bzw. eine Slot-Datei laden. */
  onExportSlot?: (ids: string[], front: string) => void;
  onImportSlot?: () => void;
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
  /** F-170: Slotmaschine öffnen. */
  onJackpot?: () => void;
  /** F-172: Während einer Tour nicht einklappen, wenn der Fokus ins Hinweisfenster wandert. */
  keepOpen?: boolean;
  /** F-164: Regelübersicht – Änderungen am Workspace, Design für Kontrasthinweise, gleich mit Regeln öffnen. */
  dispatch?: (a: Action) => void;
  shown?: Shown;
  startRules?: boolean;
  /** V95 (F-206 Schritt 8, Bau 5): in „Notizen“ gleich die Seite „Fokus“ zeigen (Klick auf die Fokus-Zeile). */
  startFocus?: boolean;
  /** F-187: Modus „Layouts“ – Bedienung der Layouts und gleich in diesem Modus öffnen. */
  layoutOps?: LayoutOps;
  /** V91 (F-210 Schritt 5): nach Wechsel eines Notizen-Layouts in den Notizen-Modus schalten. */
  onNotesApplied?: () => void;
  startLayouts?: boolean;
  /** F-206 Schritt 5 (V85, N8): Ansicht „Notizen“ – Pad zeigen, Pad auf einen Desk (N10), gleich so öffnen, Deckkraft. */
  onShowPad?: (id: string, sheet?: string) => void;
  onPadToDesk?: (id: string, desk: string) => void;
  startNotes?: boolean;
  /** V90 (Enrico): im Cockpit „Notizen“ neue Pads und Sheets anlegen (wie im Menü Notizen & Aufgaben). */
  onNotesNew?: (kind: 'pad' | 'todo' | 'kanban' | 'eisenhower') => void;
  opacity?: { pads: number; dock: number; setPads: (v: number) => void; setDock: (v: number) => void };
}

const SIDE_AT = ARRANGE_TEXT.sideAt;
const SIDE_EDGE = ARRANGE_TEXT.sideEdge;
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
          <Icon name="close" size={14} />
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
  /** F-164: Regelübersicht statt Radar. */
  const [rules, setRules] = useState(!!p.startRules && !!p.dispatch);
  /** F-187: Modus „Layouts“ statt Portale. */
  const [layouts, setLayouts] = useState(!!p.startLayouts && !!p.layoutOps && !!p.dispatch);
  /** F-202 Stufe 3: Modus „Sources“ (Mehrfachauswahl aller Sources). */
  const [sources, setSources] = useState(false);
  /** V85 (F-206 Schritt 5, N8): Ansicht „Notizen“ – Pads je Desk, weitestgehend wie „Portale“. */
  const canNotes = !!p.onShowPad && !!p.onPadToDesk && !!p.dispatch;
  const [notes, setNotes] = useState(!!p.startNotes && canNotes);
  /** V95 (F-206 Schritt 8, Bau 4): Ansicht „Personen“ – Ressourcentabelle. */
  const [persons, setPersons] = useState(false);
  /** V95 (Bau 5): Seite „Fokus“ im Cockpit „Notizen“ (Rad Notizen · Fokus · Regeln). */
  const [focusView, setFocusView] = useState(!!p.startFocus && canNotes);
  type Mode = 'portals' | 'notes' | 'persons' | 'layouts' | 'sources';
  const mode: Mode = layouts ? 'layouts' : sources ? 'sources' : persons ? 'persons' : notes ? 'notes' : 'portals';
  const modes: Mode[] = ['portals', ...(canNotes ? (['notes', 'persons'] as Mode[]) : []), ...(p.layoutOps ? (['layouts'] as Mode[]) : []), 'sources'];
  const setMode = (m: Mode) => {
    setLayouts(m === 'layouts');
    setSources(m === 'sources');
    setNotes(m === 'notes');
    setPersons(m === 'persons');
    setFocusView(false);
    setRules(false);
    setQuery('');
    setSaid(m === 'layouts' ? DESK_LAYOUT_TEXT.modeOn : m === 'sources' ? DESK_LAYOUT_TEXT.modeSourcesOn : m === 'notes' ? NOTES_COCKPIT_TEXT.modeOn : m === 'persons' ? PERSONS_TEXT.modeOn : '');
  };
  /** Pfeil runter im Filterfeld → erste Zeile der Notizen-Liste. */
  const notesFirst = useRef<(() => void) | null>(null);
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
  // Beim Öffnen: Fokus auf die Kachel des aktiven Panels (in „Notizen“ setzt das Bauteil selbst den Fokus).
  useEffect(() => {
    if (sel && !notes) tileBtns.current.get(sel)?.focus();
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
  // F-207 (V97, M1): Taste S setzt den Slot auf die Main Stage seines Desks bzw. nimmt ihn herunter – Meldung am Ort
  const [stageNote, setStageNote] = useState<null | { text: string; undo: () => void }>(null);
  const stageT = useRef(0);
  useEffect(() => () => window.clearTimeout(stageT.current), []);
  const toggleStage = (t: (typeof tiles)[number]) => {
    const area = leafOf(t);
    const dispatch = p.dispatch;
    if (!area || !dispatch) return;
    const desk = t.w.win;
    const on = !!t.a.stage;
    const r = St.setStage(p.ws, desk, on ? null : area);
    dispatch({ type: 'stageSet', desk, area: on ? null : area });
    const prev = !on && r.undo ? tiles.find((x) => x.w.win === desk && leafOf(x) === r.undo!.area) : undefined;
    const text = on ? STAGE_TEXT.cleared(t.a.title) : prev ? STAGE_TEXT.replaced(t.a.title, prev.a.title) : STAGE_TEXT.set(t.a.title);
    window.clearTimeout(stageT.current);
    setStageNote({ text, undo: () => dispatch({ type: 'stageRestore', desk, undo: r.undo }) });
    stageT.current = noticeLater(() => setStageNote(null), 2);
    setSaid(text);
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
        const edge = nearestSide(ev.clientX, ev.clientY, mapEl.getBoundingClientRect());
        if (edge[1] < MAP_BAND_PX) dock = { win: fromWin, leaf: fromLeaf, target: T.AREA, zone: edge[0], label: '' };
        else if (tile && tile.dataset.key !== fromTile && tile.dataset.area) {
          const d = [nearestSide(ev.clientX, ev.clientY, tile.getBoundingClientRect(), true)];
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
          setSaid(ARRANGE_TEXT.already(name));
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
    const min = t.w.here ? p.min : DEFAULT_MIN;
    const [dx, dy] = ARROWS[key];
    const nb = resize ? undefined : neighbour(t, dx, dy, true);
    const { next, none } = arrangeStep(tree, leaf, key, resize, min, t.a.title, nb === undefined ? undefined : nb ? leafOf(nb) : null);
    if (sameTree(next, tree)) {
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
      // F-207 (V97): S = Main Stage
      s: () => toggleStage(t),
      S: () => toggleStage(t),
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
      // F-207 (V97): S = Slot dieses Portals auf die Main Stage
      s: () => rows[i] && toggleStage(rows[i].t),
      S: () => rows[i] && toggleStage(rows[i].t),
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
            title={DIALOG_TEXT.renameHint}
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
          <Icon name="swap" size={14} />
        </button>
        {a.other && (
          <button type="button" className="overview__tool" tabIndex={-1} title="Hierher holen (H)" aria-label={`„${x.meta.name}“ auf diesen Desk holen`} onClick={() => fetch(id, x.meta.name)}>
            <Icon name="import" size={14} />
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
          <Icon name="rename" size={14} />
        </button>
        <button type="button" className="overview__tool overview__tool--x" tabIndex={-1} title="Portal schließen (Entf)" aria-label={`„${x.meta.name}“ schließen`} onClick={() => close(id, x.meta.name)}>
          <Icon name="close" size={14} />
        </button>
      </li>
    );
  };

  const map = (w: RadarWindow) => (
    <section key={w.win || 'main'} className={w.here ? 'radar__win' : 'radar__win is-other'} aria-label={`${w.here ? 'Dieser Desk' : w.title}${w.here ? '' : w.open ? ', eigenes Fenster' : ', gesammelt'}`}>
      <div className="radar__win-head">
        <strong>
          <Icon name="desk" className="icon radar__win-icon" />
          {w.here ? `Dieser Desk · ${w.title}` : w.title}
        </strong>
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
            a.stage && 'is-stage',
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
              title={realArea ? `${a.stage ? `${STAGE_TEXT.word} · ` : ''}Ziehen: Mitte = im Portal ablegen, Rand = an dieser Position einsetzen · Alt+Pfeil einsetzen, Alt+Umschalt+Pfeil Größe · ${STAGE_TEXT.cockpitKey}` : undefined}
              style={{ left: `calc(${r.x * 100}% + 2px)`, top: `calc(${r.y * 100}% + 2px)`, width: `calc(${r.w * 100}% - 4px)`, height: `calc(${r.h * 100}% - 4px)` }}
              tabIndex={on ? 0 : -1}
              aria-pressed={on}
              aria-label={`${a.title}, ${n} ${n === 1 ? 'Portal' : 'Portale'}${n > 1 && front ? `, vorn ${front.meta.name}` : ''}${hasActive ? ', enthält das aktive Portal' : ''}${a.stage ? STAGE_TEXT.tileSay : ''}`}
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
              {a.stage && (
                <span className="radar__stage" aria-hidden="true" title={STAGE_TEXT.word}>
                  <Icon name="spotlight" size={13} />
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
  /** V54 (Wunsch Enrico): sagen, welcher Slot rechts steht – der aktive (mit dem Portal im Fokus) oder ein gewählter. */
  const selIsActive = !!selTile && selTile.a.panels.some((x) => x.meta.id === p.activeId);
  const detailKind = q || !selTile ? '' : selIsActive ? COCKPIT_TEXT.activeSlot : COCKPIT_TEXT.pickedSlot;

  return (
    <>
      <div className="overview-backdrop" onClick={dismiss} aria-hidden="true" />
      <div
        id="overview"
        ref={box}
        // F-217 (V98): Klasse je Ansicht – die Cockpit-Tour zeigt nur die Schritte der offenen Ansicht
        className={`overview ${layouts ? 'is-layouts' : sources ? 'is-sources' : persons ? 'is-persons' : notes ? 'is-notes' : 'is-portals'}${rules ? ' is-rules' : notes && focusView ? ' is-focus' : ''}`}
        role="dialog"
        aria-label="Cockpit: alle Portale auf einen Blick"
        aria-describedby="overview-help"
        style={{ top: p.top }}
        onBlur={(e) => {
          // Fokus wandert woanders hin (z. B. Tab ans Ende) → einklappen; nicht beim Knopf selbst (der schaltet um).
          const to = e.relatedTarget as Node | null;
          // V51: Knopf im Hinweis unten (z. B. „Rückgängig“) schließt das Cockpit nicht
          if (!p.keepOpen && to && !box.current?.contains(to) && to !== p.toggleRef.current && !(to as Element).closest?.('.toast')) p.onDismiss();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            // F-187: Esc führt aus den Layout-Einstellungen erst zurück zu den Portalen.
            if (layouts || sources || notes || persons) {
              setMode('portals');
              window.setTimeout(() => document.querySelector<HTMLElement>('.overview__mode')?.focus(), 0);
            } else dismiss();
          }
        }}
      >
        <div className="overview__head">
          <strong className="overview__name" title={TERMS.cockpit}>Cockpit</strong>
          {/* V83 (Enrico): Rad ganz links, direkt nach „Cockpit“ – verspringt nicht und zeigt, welche Ansicht offen ist */}
          {/* F-187/F-202: Umschalter Portale | Layouts | Sources (Pfeiltasten wechseln) */}
          {p.dispatch && (
            /* V83 (F-216, U6): Umschalter als Umschalt-Rad – Portale · Layouts · Library („Notizen“ kommt mit Schritt 5) */
            <ModeWheel
              className="overview__mode"
              label={DESK_LAYOUT_TEXT.modeGroup}
              value={mode}
              onChange={(m) => setMode(m as Mode)}
              options={modes.map((m) => ({
                id: m,
                name: m === 'layouts' ? DESK_LAYOUT_TEXT.modeLayouts : m === 'sources' ? DESK_LAYOUT_TEXT.modeSources : m === 'notes' ? NOTES_COCKPIT_TEXT.mode : m === 'persons' ? PERSONS_TEXT.mode : DESK_LAYOUT_TEXT.modePortals,
                icon: m === 'layouts' ? 'layouts' : m === 'sources' ? 'source' : m === 'notes' ? 'notesTasks' : m === 'persons' ? 'catPeople' : 'radar',
              }))}
            />
          )}
          {/* V90 (Enrico): neue Pads und Sheets direkt im Cockpit „Notizen“ – links gleich nach dem Rad (Enrico) */}
          {notes && !rules && !focusView && p.onNotesNew && (
            <span className="overview__new" role="group" aria-label={NOTES_COCKPIT_TEXT.newGroup}>
              {(
                [
                  ['pad', 'newPad', PAD_TEXT.menuNew, PAD_TEXT.menuNewHint],
                  ['todo', 'todo', NT_TEXT.newTodo, NT_TEXT.newTodoHint],
                  ['kanban', 'kanban', NT_TEXT.newKanban, NOTES_COCKPIT_TEXT.newKanbanHint],
                  ['eisenhower', 'matrix', NT_TEXT.matrix, NT_TEXT.matrixHint(false)],
                ] as const
              ).map(([kind, icon, name, hint]) => (
                <button
                  key={kind}
                  type="button"
                  className="overview__tour"
                  title={hint}
                  onClick={() => {
                    p.onNotesNew!(kind);
                    setSaid(NOTES_COCKPIT_TEXT.created(name));
                  }}
                >
                  <Icon name={icon} />
                  <span className="c-label">{name}</span>
                </button>
              ))}
            </span>
          )}
          <span className="grow" />
          {!rules && !layouts && !sources && !persons && !focusView && <input
            ref={filterRef}
            className="radar__filter"
            type="search"
            value={query}
            placeholder={notes ? NOTES_COCKPIT_TEXT.filter : 'Filtern: Portal, Slot, Desk, Source …'}
            aria-label={notes ? NOTES_COCKPIT_TEXT.filterLabel : 'Portale filtern'}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (notes) notesFirst.current?.();
                else toRow(order[0]);
              } else if (e.key === 'Escape' && query) {
                e.preventDefault();
                e.stopPropagation();
                setQuery('');
              }
            }}
          />}
          {/* F-160: Desks in diesem Fenster sammeln bzw. wieder auf Fenster verteilen */}
          {p.ws.windows.length > 0 && p.onCollect && (
            <button type="button" className="overview__tour" onClick={p.onCollect} title={TERMS.collectDesks}>
              <Icon name="collect" />
              <span className="c-label">Hier sammeln</span>
            </button>
          )}
          {p.ws.windows.length > 0 && p.onDistribute && (
            <button type="button" className="overview__tour" onClick={p.onDistribute} title={TERMS.distributeDesks}>
              <Icon name="spread" />
              <span className="c-label">Verteilen</span>
            </button>
          )}
          {/* F-170: Hebel der Slotmaschine – klein, nur Symbol (Name im Tooltip und aria-label) */}
          {p.onJackpot && !rules && !layouts && !sources && !notes && !persons && (
            <button type="button" className="overview__tour overview__jackpot" onClick={p.onJackpot} title={JACKPOT_TEXT.openTitle} aria-label={JACKPOT_TEXT.openTitle}>
              <Icon name="jackpot" />
            </button>
          )}
          {/* V84 (F-216, U6): Regeln | Radar als Umschalt-Rad – nur in der Ansicht „Portale“ (dort sind Radar und Regeln zwei
              Seiten derselben Ansicht); verspringt nicht, weil es an der Stelle des alten Knopfs sitzt */}
          {/* F-218 (V92, RG6): auch im Cockpit „Notizen“ – öffnet dort die Gruppe „Notizen“ */}
          {p.dispatch && !layouts && !sources && !persons && (
            <ModeWheel
              className="overview__rules"
              label={RULES_TEXT.wheel}
              value={rules ? 'rules' : focusView && notes ? 'focus' : 'radar'}
              onChange={(v) => (setRules(v === 'rules'), setFocusView(v === 'focus'))}
              options={[
                notes
                  ? { id: 'radar', name: NOTES_COCKPIT_TEXT.mode, icon: 'notesTasks', hint: RULE_SET_TEXT.backNotes }
                  : { id: 'radar', name: RULES_TEXT.back, icon: 'radar', hint: RULES_TEXT.backTitle },
                // V95 (P13/P22): Rad Notizen · Fokus · Regeln
                ...(notes ? [{ id: 'focus', name: FOCUS_TEXT.mode, icon: 'focus' as const, hint: FOCUS_TEXT.modeHint }] : []),
                { id: 'rules', name: RULES_TEXT.open, icon: 'rules', hint: RULES_TEXT.openTitle },
              ]}
            />
          )}
          {p.onTour && (
            <button type="button" className="overview__tour overview__restart" onClick={p.onTour} title="Kurze Einführung ins Cockpit" aria-label="Tour durch das Cockpit starten">
              <Icon name="tour" />
              <span className="c-label">Tour</span>
            </button>
          )}
          <button type="button" className="overview__x" onClick={dismiss} title="Cockpit schließen (Esc)" aria-label="Cockpit schließen">
            <Icon name="close" size={14} />
          </button>
        </div>
        {/* F-188: Infotext (Fokusanzeige, Slots) als ruhige Zeile unter der Kopfzeile – dort bricht er nicht in viele kurze Zeilen */}
        <p className="overview__info">
          {focusText(p.focus)} · {p.info}
        </p>
        <p id="overview-help" className="sr-only">
          Radar: Jeder Desk zeigt seine Slots an ihrer Stelle auf dem Bildschirm. Pfeiltasten wandern zwischen den Slots, Enter öffnet die Portal-Liste. In der Liste wählen Pfeil hoch und runter ein Portal, Pfeil links geht zurück zum Radar. Enter zeigt das Portal, auch auf einem anderen Desk. V verschiebt das Portal, Umschalt und V den ganzen Slot. H holt ein Portal von einem anderen Desk hierher. Entf schließt es, F2 benennt es um. S setzt den Slot auf die Main Stage seines Desks oder nimmt ihn wieder herunter. Auf einem Slot setzt Alt mit Pfeil ihn in diese Richtung an eine neue Position, Alt, Umschalt und Pfeil macht ihn breiter, schmaler, höher oder flacher; der Desk folgt sofort. Mit der Maus lässt sich eine Portal-Zeile auf einen Slot im Radar ziehen, auf das Feld „Eigener neuer Slot“ über einem Desk, und eine Slot-Kachel auf eine andere: in die Mitte = im Portal ablegen, an den Rand = an dieser Position einsetzen. Die Kante zwischen zwei Slots ändert beim Ziehen die Größe. Das Filterfeld zeigt Treffer von allen Desks. Escape schließt das Cockpit.
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
        {persons && p.dispatch ? (
          <PersonCockpit ws={p.ws} dispatch={p.dispatch} say={setSaid} />
        ) : notes && canNotes && focusView && !rules ? (
          <FocusCockpit ws={p.ws} dispatch={p.dispatch!} onOpen={p.onDismiss} onPersons={() => setMode('persons')} />
        ) : notes && canNotes && !rules ? (
          <NotesCockpit
            ws={p.ws}
            win={p.win}
            wins={wins}
            query={query}
            dispatch={p.dispatch!}
            say={setSaid}
            onShowPad={(id, sheet) => {
              p.onShowPad!(id, sheet);
              p.onDismiss();
            }}
            onToDesk={p.onPadToDesk!}
            filterRef={filterRef}
            firstRef={notesFirst}
            opacity={p.opacity}
          />
        ) : sources && p.dispatch ? (
          <SourceCockpit ws={p.ws} dispatch={p.dispatch} />
        ) : layouts && p.layoutOps && p.dispatch ? (
          <LayoutCockpit
            ws={p.ws}
            win={p.win}
            desk={windowName(p.ws, p.win)}
            setup={p.setup}
            ops={p.layoutOps}
            dispatch={p.dispatch}
            say={setSaid}
            onNotesApplied={canNotes ? p.onNotesApplied : undefined}
            onNewBoard={
              canNotes
                ? (tpl) => {
                    // V88 (BL): Board aus der Vorlage im obersten Pad dieses Desks anlegen und zeigen
                    const ids = [newId(), newId(), newId()];
                    const r = padOpenResult(p.ws, { desk: p.win, create: 'kanban', ids, tpl });
                    p.dispatch!({ type: 'padCreate', desk: p.win, kind: 'kanban', ids, tpl });
                    if (r.result !== 'missing' && r.pad) {
                      const pad = r.pad;
                      window.setTimeout(() => (p.onShowPad!(pad, r.sheet), p.onDismiss()), 0);
                    }
                  }
                : undefined
            }
          />
        ) : rules && p.dispatch ? (
          <Rules ws={p.ws} shown={p.shown ?? 'dark'} dispatch={p.dispatch} say={setSaid} group={notes ? 'notes' : 'portals'} />
        ) : tiles.length === 0 ? (
          <p className="overview__empty">Noch keine Portale – lege oben mit „+ NewSlot“ eine an.</p>
        ) : (
          <div className="radar">
            <div className="radar__maps">{wins.map(map)}</div>
            {/* F-207 (V97): Meldung am Ort, direkt unter dem Radar */}
            {stageNote && (
              <p className="overview__stagenote">
                <Icon name="spotlight" size={14} />
                <span>{stageNote.text}</span>
                <button
                  type="button"
                  className="audio__undo"
                  onClick={() => {
                    window.clearTimeout(stageT.current);
                    stageNote.undo();
                    setStageNote(null);
                    setSaid(STAGE_TEXT.undo);
                  }}
                >
                  {STAGE_TEXT.undo}
                </button>
              </p>
            )}
            {/* V54 (Wunsch Enrico): Kennzeichnung über dem Rahmen, nicht darin */}
            <div className="radar__side">
              {detailKind && (
                <p className={selIsActive ? 'radar__detail-kind is-active' : 'radar__detail-kind'} title={selIsActive ? COCKPIT_TEXT.activeSlotTitle : COCKPIT_TEXT.pickedSlotTitle} aria-hidden="true">
                  <span className="radar__detail-dot" /> {detailKind}
                  <span className="radar__detail-why"> – {selIsActive ? COCKPIT_TEXT.activeSlotWhy : COCKPIT_TEXT.pickedSlotWhy}</span>
                </p>
              )}
              <section className="radar__detail" aria-label={detailKind ? `${detailKind} (${selIsActive ? COCKPIT_TEXT.activeSlotWhy : COCKPIT_TEXT.pickedSlotWhy}): ${detailHead}` : detailHead}>
                <h3 className="radar__detail-head">{detailHead}</h3>
                {rows.length === 0 ? <p className="overview__empty">Kein Portal passt.</p> : <ul className="overview__list">{rows.map(row)}</ul>}
                {/* F-158: gewählten Slot als Datei speichern, Slot-Datei laden */}
                {!q && selTile && (p.onExportSlot || p.onImportSlot) && (
                  <div className="radar__slotfile" role="group" aria-label={SLOT_FILE_TEXT.group}>
                    <span className="muted" aria-hidden="true">{SLOT_FILE_TEXT.group}:</span>
                    {p.onExportSlot && selTile.a.panels.length > 0 && (
                      <button
                        type="button"
                        title={SLOT_FILE_TEXT.saveTitle}
                        aria-label={`${SLOT_FILE_TEXT.save}: ${selTile.a.title}`}
                        onClick={() => {
                          const ids = selTile.a.panels.map((x) => x.meta.id);
                          const front = (selTile.a.panels.find((x) => x.front) ?? selTile.a.panels[0]).meta.id;
                          p.onExportSlot?.(ids, front);
                        }}
                      >
                        <Icon name="transfer" size={13} className="icon icon--inline" /> {SLOT_FILE_TEXT.saveShort}
                      </button>
                    )}
                    {p.onImportSlot && (
                      <button type="button" title={SLOT_FILE_TEXT.loadTitle} aria-label={SLOT_FILE_TEXT.load} onClick={p.onImportSlot}>
                        <Icon name="import" size={13} className="icon icon--inline" /> {SLOT_FILE_TEXT.loadShort}
                      </button>
                    )}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
        {drag && (
          <div className="ghost radar__ghost" style={{ left: drag.x + 14, top: drag.y + 14 }} aria-hidden="true">
            {drag.whole ? `Slot „${drag.name}“` : drag.name}
            {dropText(drag)}
          </div>
        )}
        <span className="sr-only" role="status">
          {said || (q && !notes ? detailHead : '')}
        </span>
      </div>
    </>
  );
}
