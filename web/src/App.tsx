import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import './App.css';
import logoUrl from './assets/e-sources-logo.svg';
import logoLightUrl from './assets/e-sources-logo-light.svg';
import { Item, Menu, PanelFrame } from './components/PanelFrame';
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
import { type SearchHit, NO_CATEGORY, addSamples, bookmarkOf, openBookmark } from './workspace/bookmarks';
import { Launcher, LauncherIcon } from './components/Launcher';
import { type How, type LauncherState, HOW_IN, launcherCount, loadLauncher, openOutside, saveLauncher } from './workspace/launcher';
import { Search } from './components/Search';
import { Tooltips } from './components/Tooltip';
import { FocusMeter, Overview } from './components/Overview';
import { arrangeText, deskFocusOf, effectOf, focusOf, placeText, ruleOf } from './workspace/focus';
import { edgeFor, sizeCmdOf, sizeStep } from './workspace/sizing';
import { contrastWarning, pickLook, shownAccent, THEMES, resolveTheme, rgbOf } from './workspace/look';
import { MAIN_NAME, nextWindowName, windowList, windowName, windowUrl, winFromSearch } from './workspace/windows';
import { openAppWindow, useOpenWindows, windowTarget } from './workspace/useWindows';
import { type MoveTarget, fetchPanels, moveTargets, setupOfWindow } from './workspace/move';
import { PROBE } from './workspace/probe';
import { Help } from './components/Help';
import { Tour } from './components/Tour';
import { type TourId, setToursAuto, tourAutoStart, toursAuto } from './workspace/tour';
import { Design } from './components/Design';
import type { HelpEntry } from './workspace/help';
import type { ScreenSetup } from './workspace/screen';
import { loadColor, FOCUS_WARN, NEW_AREA, STACK_MAX, TAB_MAX, newId, panelsIn, addPanel as addTo, areaIn, canAddArea, areaLabel, areaOf, describe, hostOf, isBlocked, normalizeUrl, setupFor, splitSelection, stackFull, tabLabel, tryPlace, viewOf } from './workspace/workspace';
import { TERMS } from './workspace/terms';
import { Closed as ClosedDialog } from './components/Closed';
import { FocusRule as FocusRuleDialog } from './components/FocusRule';
import { ImportBookmarks } from './components/ImportBookmarks';
import { SortHelp } from './components/SortHelp';
import { BOOKMARKS_FILE_NAME, type BrowserBookmark, bookmarkFileOf, looksLikeBookmarkFile, parseBookmarkFile } from './workspace/browserBookmarks';
import { closedOf, restoreClosed, restoredSaid } from './workspace/closed';
import { PORTAL_ALONE, nextTabOf, portalSaid, stepIn, tabAlone, tabSaid } from './workspace/cycle';

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

/** F-146: Symbol „Gleich verteilen“ – Pfeilkreuz (nach allen Seiten gleich). */
const DistributeIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="icon" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 1.5v13M1.5 8h13M6 3.5 8 1.5l2 2M6 12.5l2 2 2-2M3.5 6 1.5 8l2 2M12.5 6l2 2-2 2" />
  </svg>
);

/** Zurück zum Dashboard: Pfeil im Bogen zurück (steht außerhalb des Dashboards an der Stelle von „Gleich verteilen“). */
const BackIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="icon" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5.5 2.5 2 6l3.5 3.5" />
    <path d="M2 6h7.5a4.5 4.5 0 0 1 0 9H6" />
  </svg>
);

/** F-146: Zahnrad für das Einstellungsmenü. */
const GearIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);

/** F-127: Ansichten des Knopfs „Ansicht“, in der Reihenfolge des Weiterschaltens (wie Hineinzoomen). */
type ViewKind = 'area' | 4 | 2 | 1;
const VIEW_NEXT: Record<ViewKind, ViewKind> = { area: 4, 4: 2, 2: 1, 1: 'area' };
const VIEW_NAME: Record<ViewKind, string> = {
  area: 'Dashboard (alle Slots)',
  4: '2 × 2 (4 Portale)',
  2: '2 (2 Portale nebeneinander)',
  1: 'Solo (aktives Portal allein)',
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
  /** F-28: Eintrag aus der Stapel-Leiste – `id` ist dann ein Panel, das Ziel eine Area. */
  stack?: { from: string; ok: boolean; label: string };
}

/** F-153: Benennung wie im Fokus-Radar – Mitte = tauschen, Rand = an dieser Position einsetzen. */
const ZONE_LABEL: Record<T.Zone, string> = {
  center: 'Tauschen',
  left: 'An dieser Position einsetzen',
  right: 'An dieser Position einsetzen',
  top: 'An dieser Position einsetzen',
  bottom: 'An dieser Position einsetzen',
};
const AREA_LABEL: Record<T.Side, string> = {
  left: 'Am Rand einsetzen – links, ganze Höhe',
  right: 'Am Rand einsetzen – rechts, ganze Höhe',
  top: 'Am Rand einsetzen – oben, ganze Breite',
  bottom: 'Am Rand einsetzen – unten, ganze Breite',
};
const SIDE_AT: Record<T.Side, string> = { left: 'links an', right: 'rechts an', top: 'oben an', bottom: 'unten an' };
/** Hinweis am Zeiger, z. B. „links an „Recherche“ einsetzen“. */
const ghostLabel = (target: string, zone: T.Zone, name: string) =>
  target === T.AREA ? AREA_LABEL[zone as T.Side] ?? '' : zone === 'center' ? `mit „${name}“ tauschen` : `${SIDE_AT[zone]} „${name}“ einsetzen`;
/** Hervorhebung wie im Fokus-Radar: einsetzen gestreift in der Akzentfarbe, ablegen blau, tauschen schlicht. */
const zoneClass = (zone: T.Zone) => (zone === 'center' ? 'drop--swap' : 'drop--dock');
const dropLabel = (target: string, zone: T.Zone) => (target === T.AREA && zone !== 'center' ? AREA_LABEL[zone] : ZONE_LABEL[zone]);
const CORNERS: { c: Corner; x: 'left' | 'right'; y: 'top' | 'bottom' }[] = [
  { c: 'tl', x: 'left', y: 'top' },
  { c: 'tr', x: 'right', y: 'top' },
  { c: 'bl', x: 'left', y: 'bottom' },
  { c: 'br', x: 'right', y: 'bottom' },
];

const POPUP_BLOCKED = 'Der Browser hat den Desk blockiert – bitte Pop-ups für E-Sources erlauben und ihn im Cockpit mit „Wieder öffnen“ holen.';

/**
 * F-27: Name des Zusatzfensters in der Kopfleiste. Klick (oder Doppelklick, Enter, F2) öffnet ein
 * Eingabefeld; Enter oder Verlassen speichert, Esc bricht ab. Leerer Name = keine Änderung.
 */
function WindowName(props: { name: string; fx?: { color?: string; text: string }; onRename: (name: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const done = (save: boolean) => {
    if (save && draft !== null && draft.trim() && draft.trim() !== props.name) props.onRename(draft.trim());
    setDraft(null);
    window.setTimeout(() => btn.current?.focus(), 0);
  };
  if (draft !== null)
    return (
      <input
        className="tb-win tb-win--edit"
        value={draft}
        maxLength={40}
        autoFocus
        aria-label="Name dieses Desks"
        onFocus={(e) => e.target.select()}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => done(true)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') {
            e.preventDefault();
            done(true);
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            done(false);
          }
        }}
      />
    );
  return (
    <button
      ref={btn}
      type="button"
      className="tb-win fx-desk"
      style={{ '--fx': props.fx?.color } as CSSProperties}
      title={`Dieser Desk: ${props.name} · ${TERMS.desk}${props.fx ? ` · ${props.fx.text}` : ''} · Klick oder F2 zum Umbenennen`}
      aria-label={`Dieser Desk: ${props.name}. Umbenennen`}
      onClick={() => setDraft(props.name)}
      onKeyDown={(e) => {
        if (e.key === 'F2') {
          e.preventDefault();
          setDraft(props.name);
        }
      }}
    >
      {props.name}
    </button>
  );
}

export default function App() {
  const [ws, dispatch] = useWorkspace();
  /** F-27: dieses Fenster ('' = Hauptfenster, sonst Id aus der Adresse) und seine Panels. */
  const [win] = useState(() => winFromSearch(window.location.search));
  const mine = useMemo(() => panelsIn(ws.panels, win), [ws.panels, win]);
  const winLabel = windowName(ws, win);
  useEffect(() => {
    document.title = win ? `${winLabel} – E-Sources` : 'E-Sources';
  }, [win, winLabel]);
  useEffect(() => {
    // Fenster über seinen Desk wiederfindbar machen (nicht in einer eingebetteten E-Source, F-18).
    // F-160: Wechselt ein Fenster den Desk, trägt es danach dessen Namen.
    if (window.self === window.top) window.name = windowTarget(win);
  }, [win]);
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
    root.style.setProperty('--accent-rgb', rgbOf(shownAccent(ws.look.accent, shownTheme)).join(', '));
  }, [shownTheme, ws.look.accent]);
  const lookWarning = (() => {
    const w = contrastWarning(ws.look.accent, shownTheme);
    // F-178: im Terminal sagen, dass ersatzweise Terminal-Grün leuchtet
    return w && shownTheme === 'terminal' ? `${w} Deshalb leuchtet die Schrift gerade in Terminal-Grün.` : w;
  })();
  const [active, setActive] = useState<string | null>(mine[0]?.id ?? null);
  const [mode, setMode] = useState<Mode>({ kind: 'area' });
  const [swapFrom, setSwapFrom] = useState<string | null>(null);
  /** F-28: Übersicht aller Panels (ausgeklappte Kopfleiste) und ihr Abstand von oben. */
  const [overview, setOverview] = useState(false);
  const [overviewTop, setOverviewTop] = useState(0);
  const toolbarRef = useRef<HTMLElement>(null);
  const meterRef = useRef<HTMLButtonElement>(null);
  /** F-29: Gesamtfokus, ändert sich sofort mit Panels und Tabs. */
  const focus = useMemo(() => focusOf(ws), [ws]);
  /** F-167: Plus-Knöpfe in der Ampelfarbe danach (+1 Portal bzw. +1 Tab); Desk-Name in der Farbe seines Fokus. */
  const fx = useMemo(() => {
    const of = (e: { level: number; text: string }) => ({ color: loadColor(e.level), text: e.text });
    return { panel: of(effectOf(ws, 1)), tab: of(effectOf(ws, 0, 1)) };
  }, [ws]);
  const deskFx = (id: string) => {
    const f = deskFocusOf(ws, id);
    const n = f.panels === 1 ? '1 Portal' : `${f.panels} Portale`;
    return { color: f.level ? loadColor(f.level) : undefined, text: `Fokus dieses Desks: ${f.color}, ${String(f.points).replace('.', ',')} Punkte (${n})`, word: f.color };
  };
  const toggleOverview = useCallback(() => {
    setOverviewTop((toolbarRef.current?.getBoundingClientRect().bottom ?? 60) + 6);
    setOverview((o) => !o);
  }, []);
  // F-28: Strg/⌘+. klappt die Übersicht auf und zu.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key === '.') {
        e.preventDefault();
        toggleOverview();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleOverview]);
  /** F-156: Hilfe offen (at = Eintrag, zu dem sie springt) oder zu (null). */
  const [helpAt, setHelpAt] = useState<{ at: string | null } | null>(null);
  /** F-95: Tour – beim ersten Start einmal von selbst (nicht in der Testbelegung, nicht in Zusatz-Desks). */
  const [tour, setTourId] = useState<TourId | null>(null);
  /** F-173: Tour von selbst gestartet (zeigt „Nicht mehr automatisch anzeigen“). */
  const [tourAuto, setTourAuto] = useState(false);
  const [autoTours, setAutoTours] = useState(toursAuto);
  const setTour = (id: TourId | null | ((t: TourId | null) => TourId | null), auto = false) => {
    setTourId(id);
    setTourAuto(auto);
  };
  /** F-174: Dialog „Design anpassen“. */
  const [design, setDesign] = useState(false);
  useEffect(() => {
    if (PROBE || win || !tourAutoStart('start')) return;
    const t = window.setTimeout(() => setTour('start', true), 800);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /** F-172: Cockpit-Tour beim ersten Öffnen des Cockpits einmal von selbst (nicht in der Testbelegung). */
  useEffect(() => {
    if (!overview) {
      // Cockpit zu → seine Tour endet mit (ihre Ziele sind weg)
      setTour((t) => (t === 'cockpit' ? null : t));
      return;
    }
    if (PROBE || tour || !tourAutoStart('cockpit')) return;
    const t = window.setTimeout(() => setTour((x) => x ?? 'cockpit', true), 450);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overview]);
  /** F-171: Design-Tour beim ersten Öffnen von „Design anpassen“; Dialog zu → Tour endet mit. */
  useEffect(() => {
    if (!design) {
      setTour((t) => (t === 'design' ? null : t));
      return;
    }
    if (PROBE || tour || !tourAutoStart('design')) return;
    const t = window.setTimeout(() => setTour((x) => x ?? 'design', true), 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design]);
  const startDesignTour = () => {
    setDesign(true);
    window.setTimeout(() => setTour('design'), design ? 0 : 150);
  };
  const switchAutoTours = () => {
    const on = !autoTours;
    setToursAuto(on);
    setAutoTours(on);
    notify(on ? 'Touren starten beim ersten Mal wieder von selbst.' : 'Touren starten nicht mehr von selbst – über Hilfe, Suche oder Einstellungen jederzeit.');
  };
  /** F-172: Cockpit-Tour von Hand – Cockpit erst öffnen, dann (nach dem Aufbau) die Tour. */
  const startCockpitTour = () => {
    if (!overview) toggleOverview();
    window.setTimeout(() => setTour('cockpit'), overview ? 0 : 250);
  };
  // F-156: „?“ (außerhalb von Eingabefeldern) öffnet die Hilfe.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (e.key === '?' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setHelpAt({ at: null });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const [flash, setFlash] = useState<string | null>(null);
  /** F-24: Hinweis, an dem der Knopf „Wiederherstellen“ steht (gleich `flash`). */
  const [undoFor, setUndoFor] = useState<string | null>(null);
  /** F-24: Dialog „Zuletzt geschlossen“. */
  const [closedOpen, setClosedOpen] = useState(false);
  /** F-29 Rest: Dialog „Fokusanzeige anpassen“. */
  const [ruleOpen, setRuleOpen] = useState(false);
  /** F-155: Größen-Modus (Alt/⌥+A) und seine letzte Ansage. */
  const [sizeMode, setSizeMode] = useState(false);
  const [sizeSaid, setSizeSaid] = useState('');
  const sizeKeyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => sizeKeyRef.current(e);
    // Erfassungsphase: im Größen-Modus gehen Pfeile, Esc usw. nicht an andere Kürzel.
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);
  /** F-23: Ansage nach Tab-/Portal-Wechsel per Kürzel (eigene, immer vorhandene Live-Region). */
  const [cycleSaid, setCycleSaid] = useState('');
  /** Text in die immer vorhandene Live-Region (gleicher Text zweimal wird erneut angesagt). */
  const sayLive = (text: string) => setCycleSaid((old) => (old === text ? `${text}\u00a0` : text));
  /** F-40 bis F-42, F-149: Launcher – Lage, offen/eingeklappt und Wahl Tab/Fenster je Desk. */
  const [launcher, setLauncherState] = useState<LauncherState>(() => loadLauncher(win ?? ''));
  const [launcherFocus, setLauncherFocus] = useState(0);
  const setLauncher = (patch: Partial<LauncherState>) =>
    setLauncherState((old) => {
      const next = { ...old, ...patch };
      if (!PROBE) saveLauncher(win ?? '', next);
      return next;
    });
  /** Launcher öffnen (oder aufklappen) und den Fokus hineinlegen. */
  const showLauncher = () => {
    setLauncher({ open: true, min: false });
    setLauncherFocus((n) => n + 1);
  };
  /** Source außerhalb öffnen; die Wahl gilt ab jetzt als Voreinstellung (F-149). */
  const launch = (url: string, title: string, how: How) => {
    openOutside(url, how);
    if (how !== launcher.how) setLauncher({ how });
    sayLive(`${title} öffnet in ${HOW_IN[how]}.`);
  };
  const cycleKeyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => cycleKeyRef.current(e);
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);
  useEffect(() => {
    document.body.classList.toggle('sizing', sizeMode);
  }, [sizeMode]);
  /** Wichtiger Hinweis als Dialog, der bestätigt werden muss (F-26). */
  const [notice, setNotice] = useState<string | null>(null);
  /** F-114: Hinweis an einem Portal (statt Dialog über der Fläche). */
  const [hint, setHint] = useState<{ id: string; text: string } | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  // F-36: Lesezeichen-Datei aus dem Browser
  const bookmarkFileRef = useRef<HTMLInputElement>(null);
  const [bmImport, setBmImport] = useState<{ name: string; list: BrowserBookmark[] } | null>(null);
  // F-180
  const [sortOpen, setSortOpen] = useState(false);
  // Testbelegung: so tun, als wäre es ein 49-Zoll-Monitor.
  const [clsOverride, setClsOverride] = useState<ScreenClassId | 'auto'>(PROBE ? 'superwide' : 'auto');
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
  const setup = setupFor(ws, cls, orientation, win);
  const view = useMemo(() => viewOf(ws, setup), [ws, setup.cls, setup.orientation, setup.lines, setup.win]); // eslint-disable-line react-hooks/exhaustive-deps
  /** F-27: offene Fenster; ein anderes Fenster kann hier ein Panel nach vorn holen lassen. */
  const windows = useOpenWindows(win, (id) => {
    if (!mine.some((x) => x.id === id)) return;
    dispatch({ type: 'stackFront', setup, id });
    setActive(id);
    setMode((m) => (m.kind === 'max' && m.id !== id ? { kind: 'max', id } : m));
  });
  // F-28: Das Fenster merkt sich seine Einstellung, damit andere Fenster seine Areas als Ziel anbieten.
  useEffect(() => dispatch({ type: 'seen', setup }), [view.key]); // eslint-disable-line react-hooks/exhaustive-deps
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

  // Lange Hinweise bleiben länger stehen (etwa Lesetempo).
  const notify = useCallback((text: string, ms = Math.max(3000, text.length * 50), undo = false) => {
    setFlash(text);
    setUndoFor(undo ? text : null);
    window.setTimeout(() => setFlash((f) => (f === text ? null : f)), ms);
  }, []);

  // F-36: Lesezeichen aus Chrome, Safari, Firefox, Edge (HTML-Datei) übernehmen und die Library so ausgeben.
  const exportBookmarks = () => {
    if (!ws.bookmarks.length) return notify('Die Library ist noch leer – es gibt nichts zu exportieren.');
    const blob = new Blob([bookmarkFileOf(ws)], { type: 'text/html' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = BOOKMARKS_FILE_NAME;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
    const text = `${ws.bookmarks.length} Sources als ${BOOKMARKS_FILE_NAME} gespeichert. Im Browser über „Lesezeichen importieren“ einlesen.`;
    notify(text);
    sayLive(text);
  };
  const chooseBookmarkFile = async (input: HTMLInputElement) => {
    const chosen = input.files?.[0];
    input.value = '';
    if (!chosen) return;
    const html = await chosen.text();
    if (!looksLikeBookmarkFile(html)) {
      setNotice(`„${chosen.name}“ ist keine Lesezeichen-Datei. Im Browser „Lesezeichen exportieren“ wählen (Chrome: Lesezeichen-Manager › ⋮ › Lesezeichen exportieren; Safari: Ablage › Exportieren › Lesezeichen; Firefox: Bibliothek › Importieren und Sichern › Lesezeichen nach HTML exportieren) und die HTML-Datei hier wählen.`);
      return;
    }
    const list = parseBookmarkFile(html);
    if (!list.length) return setNotice(`In „${chosen.name}“ stehen keine Lesezeichen.`);
    setBmImport({ name: chosen.name, list });
  };
  const importBookmarks = () => bookmarkFileRef.current?.click();

  /**
   * Neues Panel mit Ampel-Regel (F-26): Hinweis bei 5, Grenze bei 9 Panels je Area.
   * Mit `area` kommt es auf diese Area obendrauf (F-09).
   */
  const addPanel = (area?: string) => {
    // Hinweise nennen das Panel, auf das gestapelt wird – sein Name zeigt, wofür der Nutzer die Area verwendet.
    const frontId = area ? viewOf(ws, setup).arrangement?.areas[area]?.front : undefined;
    const target = frontId ? `„${ws.panels.find((x) => x.id === frontId)?.name ?? ''}“` : 'diesem Stack';
    if (stackFull(ws, setup, area)) {
      const text = `Auf ${target} liegen schon ${STACK_MAX} Portale – mehr gehen nicht. Schließe ein Portal oder lege es woanders an.`;
      // F-114: am vorderen Portal des Stacks; ohne bekanntes Portal bleibt es beim Dialog
      return frontId ? setHint({ id: frontId, text }) : setNotice(text);
    }
    const id = newId();
    const probe = addTo(ws, setup, area, id);
    const added = probe.panels[probe.panels.length - 1];
    const arr = viewOf(probe, setup).arrangement;
    const at = areaIn(arr, added.id);
    const after = at ? arr!.areas[at].panels.length : 1;
    dispatch({ type: 'add', setup, area, id });
    if (after === FOCUS_WARN) {
      // F-114: am neuen Portal, das jetzt vorn auf dem Stack liegt
      setHint({
        id: added.id,
        text: `Jetzt liegen ${FOCUS_WARN} Portale auf ${target}. Ab hier nehmen Fokus und Übersicht ab – lieber Portale schließen oder anders verteilen.`,
      });
    }
  };

  // Esc beendet Tauschen, Ziehen, Maximieren und Splitscreen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (overview) setOverview(false);
      else if (cleanup.current) cleanup.current();
      else if (swapFrom) setSwapFrom(null);
      else if (mode.kind !== 'area') setMode({ kind: 'area' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [swapFrom, mode, overview]);

  // Geschlossene Panels aus Ansicht und Fokus entfernen.
  useEffect(() => {
    // F-27: Auch Panels, die in ein anderes Fenster gewandert sind, verschwinden hier.
    const exists = (id: string) => mine.some((p) => p.id === id);
    if (mode.kind === 'max' && !exists(mode.id)) setMode({ kind: 'area' });
    if (active && !exists(active)) setActive(mine[0]?.id ?? null);
    if (swapFrom && !exists(swapFrom)) setSwapFrom(null);
    if (hint && !exists(hint.id)) setHint(null);
  }, [mine, mode, active, swapFrom, hint]);

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

  // ---------------------------------------------------------------- F-28 Aus der Stapel-Leiste ziehen

  /** Area unter dem Zeiger (ohne Randzonen). */
  const slotAt = (cx: number, cy: number, slots: Slot[]): Slot | null => {
    const box = areaRef.current?.getBoundingClientRect();
    if (!box) return null;
    const x = cx - box.left;
    const y = cy - box.top;
    return (
      slots.find((s) => {
        const r = px(s.rect);
        return x >= r.left && x <= r.left + r.width && y >= r.top && y <= r.top + r.height;
      }) ?? null
    );
  };

  /** Panel aus der Stapel-Leiste auf eine andere Area ziehen: Loslassen legt es dort obendrauf. */
  const startStackDrag = (e: ReactPointerEvent, id: string, from: string) => {
    if (swapFrom || view.slots.length < 2) return;
    const x0 = e.clientX;
    const y0 = e.clientY;
    const slots = shownView.slots;
    let started = false;
    let last: Drag | null = null;
    track(
      (ev) => {
        if (!started && Math.hypot(ev.clientX - x0, ev.clientY - y0) < DRAG_START_PX) return;
        if (!started) document.body.style.cursor = 'grabbing';
        started = true;
        const s = slotAt(ev.clientX, ev.clientY, slots);
        const target = s && s.id !== from ? s : null;
        const ok = !!target && !!tryPlace(ws, setup, [id], target.id);
        const label = target ? areaLabel(ws, target) || target.front.name : '';
        last = { id, x: ev.clientX, y: ev.clientY, target: target?.id ?? null, zone: target ? 'center' : null, stack: { from, ok, label } };
        setDrag(last);
      },
      () => {
        const d = last;
        if (!d?.target || !d.stack) return;
        const name = ws.panels.find((x) => x.id === id)?.name ?? '';
        if (!d.stack.ok) return notify(`Auf „${d.stack.label}“ liegen schon ${STACK_MAX} Portale. Schließe dort eines oder wähle einen anderen Slot.`);
        dispatch({ type: 'move', ids: [id], from: setup, win, area: d.target });
        notify(`„${name}“ liegt jetzt auf „${d.stack.label}“.`);
      },
    );
  };

  // ---------------------------------------------------------------- Zentrale Suche (F-34)

  /** Aktives Panel, sonst das erste sichtbare. */
  const currentPanel = (): string | null =>
    (active && ws.panels.some((x) => x.id === active) ? active : null) ?? shownView.slots[0]?.front.id ?? null;

  // ---------------------------------------------------------------- F-24 Zuletzt geschlossen

  /** Portal schließen; mit Seite wird es gemerkt und der Hinweis bietet „Wiederherstellen“. */
  const closePortal = (id: string) => {
    const p = ws.panels.find((x) => x.id === id);
    if (!p) return;
    const here = (p.win ?? '') === (win ?? '');
    const target = here ? setup : (setupOfWindow(ws, p.win ?? '') ?? setup);
    dispatch({ type: 'remove', id, setup: target });
    if (here && p.tabs.some((t) => t.url)) notify(`Portal „${p.name}“ geschlossen.`, 8000, true);
  };
  /** Tab schließen; mit Seite wird er gemerkt. */
  const closeTabOf = (id: string, tabId: string) => {
    const t = ws.panels.find((x) => x.id === id)?.tabs.find((x) => x.id === tabId);
    dispatch({ type: 'closeTab', id, tab: tabId });
    if (t?.url) notify(`Tab ${tabLabel(t)} geschlossen.`, 8000, true);
  };
  /** Neuesten (oder gewählten) Eintrag zurückholen, ansagen, Fokus auf den Tab. */
  const restore = (entry?: string) => {
    const r = restoreClosed(ws, setup, entry);
    const text = restoredSaid(r);
    notify(text);
    sayLive(text);
    if (r.result !== 'ok' || !r.panel) return;
    dispatch({ type: 'restore', setup, entry: r.entry?.id });
    const id = r.panel;
    setActive(id);
    if (mode.kind === 'max') setMode({ kind: 'max', id });
    window.setTimeout(() => document.querySelector<HTMLElement>(`[data-panel-id="${id}"] [role="tab"][aria-selected="true"]`)?.focus({ preventScroll: true }), 50);
  };

  /** Treffer im zugehörigen Panel öffnen; liegt das Panel im Stapel hinten, kommt es nach vorn. */
  const openHit = (h: SearchHit, swap = false) => {
    // F-149: Sources, die sich nicht einbetten lassen, gehen außerhalb auf
    if (isBlocked(ws, h.bookmark.url)) return launch(h.bookmark.url, h.bookmark.title, swap ? (launcher.how === 'tab' ? 'window' : 'tab') : launcher.how);
    const id = h.panel?.id ?? currentPanel();
    if (!id) return notify('Lege zuerst einen Slot an, dann lässt sich die Source öffnen.');
    const name = ws.panels.find((x) => x.id === id)?.name ?? '';
    if (openBookmark(ws, id, h.bookmark.url).result === 'full')
      return notify(`Im Portal „${name}“ sind schon ${TAB_MAX} Tabs offen. Schließe dort einen Tab.`);
    dispatch({ type: 'stackFront', setup, id });
    dispatch({ type: 'openBookmark', panel: id, url: h.bookmark.url });
    setActive(id);
    if (mode.kind === 'max' && mode.id !== id) setMode({ kind: 'max', id });
  };

  /** F-141: Panel aus der Suche nach vorn holen und aktiv machen. */
  const showPanel = (id: string, tabId?: string) => {
    // F-27: Liegt das Panel in einem anderen Fenster, holt jenes es nach vorn.
    const other = ws.panels.find((x) => x.id === id && (x.win ?? '') !== win);
    if (other) {
      const target = other.win ?? '';
      if (tabId) dispatch({ type: 'selectTab', id, tab: tabId });
      windows.show(target, id);
      if (!openAppWindow(target)) notify(POPUP_BLOCKED);
      return;
    }
    dispatch({ type: 'stackFront', setup, id });
    if (tabId) dispatch({ type: 'selectTab', id, tab: tabId });
    setActive(id);
    if (mode.kind === 'max' && mode.id !== id) setMode({ kind: 'max', id });
  };

  /**
   * F-27: Panel (whole = ganze Area) in ein Fenster verschieben; null = neues Fenster. Das Ziel
   * öffnet sich bzw. kommt nach vorn – direkt aus dem Klick heraus, sonst blockt der Browser.
   */
  /**
   * F-160: anderen Desk zeigen. Ist er schon in einem eigenen Fenster offen, dorthin springen;
   * sonst zeigt dieses Browserfenster ihn (neu geladen mit seiner Id in der Adresse).
   */
  const switchDesk = (target: string) => {
    if (target === win) return;
    if (windows.open.has(target)) {
      if (!openAppWindow(target)) notify(POPUP_BLOCKED);
      return;
    }
    window.location.replace(windowUrl(window.location.href, target));
  };

  const toWindow = (id: string, target: string | null, whole: boolean) => {
    const slot = shownView.slots.find((s) => s.panels.some((m) => m.id === id));
    const ids = whole && slot ? slot.panels.map((m) => m.id) : [id];
    const dest = target ?? newId();
    if (dest === win) return;
    dispatch({ type: 'toWindow', ids, win: dest });
    const name = ws.panels.find((x) => x.id === id)?.name ?? '';
    const what = ids.length > 1 ? `${ids.length} Portale` : `„${name}“`;
    if (!openAppWindow(dest)) return notify(`${what} verschoben. ${POPUP_BLOCKED}`);
    notify(`${what} ${dest ? 'auf dem anderen Desk' : 'auf dem Main Desk'}.`);
  };

  /** F-28: Einstellung, in der ein Panel gerade liegt (eigenes Fenster: diese, sonst die zuletzt gesehene). */
  const setupOfPanel = (id: string): ScreenSetup | null => {
    const w = ws.panels.find((x) => x.id === id)?.win ?? '';
    return w === win ? setup : setupOfWindow(ws, w);
  };
  /** F-28: Panel bzw. ganze Area (whole) eines Panels. */
  const moveIds = (id: string, whole: boolean) => {
    const from = setupOfPanel(id);
    const slots = from === setup ? shownView.slots : from ? viewOf(ws, from).slots : [];
    const slot = slots.find((s) => s.panels.some((m) => m.id === id));
    return whole && slot ? slot.panels.map((m) => m.id) : [id];
  };
  /** F-28: Ziele für ein Panel bzw. seine ganze Area. */
  const targetsFor = (id: string, whole: boolean): MoveTarget[] => {
    const from = setupOfPanel(id);
    return from ? moveTargets(ws, moveIds(id, whole), from) : [];
  };

  /**
   * F-28: Panel (whole = ganze Area) auf eine Area legen – auch in einem anderen Fenster, das sich
   * dann öffnet bzw. nach vorn kommt (direkt aus dem Klick heraus, sonst blockt der Browser).
   */
  const moveTo = (id: string, t: MoveTarget, whole: boolean) => {
    const ids = moveIds(id, whole);
    const from = setupOfPanel(id);
    if (t.disabled || !from) return;
    dispatch({ type: 'move', ids, from, win: t.win, area: t.area });
    const name = ws.panels.find((x) => x.id === id)?.name ?? '';
    const what = ids.length > 1 ? `${ids.length} Portale` : `„${name}“`;
    const where = t.area === NEW_AREA ? 'auf eigenem Slot' : t.area ? `auf „${t.label}“` : '';
    if (t.win === win) return notify(`${what} jetzt ${where}.`);
    const there = `${where ? `${where} ` : ''}im ${windowName(ws, t.win)}`;
    if (!openAppWindow(t.win)) return notify(`${what} jetzt ${there}. ${POPUP_BLOCKED}`);
    notify(`${what} jetzt ${there}.`);
  };

  /**
   * F-27/F-28: Panels aus anderen Fenstern hierher holen – nur so viele, wie Platz haben
   * (freie Areas, dann Stapel bis STACK_MAX). Gibt die Ansage zurück.
   */
  const fetchHere = (ids: string[]): string => {
    const { moved } = fetchPanels(ws, ids, setup);
    if (moved > 0) dispatch({ type: 'fetch', ids, setup });
    const full = `Hier ist kein Platz mehr (${view.spec.capacity} Slots × ${STACK_MAX} Portale).`;
    const text =
      moved === ids.length
        ? `${moved === 1 ? 'Portal' : `${moved} Portale`} auf diesen Desk geholt.`
        : moved === 0
          ? `Nichts geholt. ${full}`
          : `${moved} von ${ids.length} Portale geholt. ${full} Die übrigen bleiben, wo sie sind.`;
    notify(text);
    return text;
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

  // ---------------------------------------------------------------- F-155 Größe per Tastatur

  const slotOfPanel = (id: string | null) => (id ? view.slots.find((s) => s.panels.some((m) => m.id === id)) : undefined);
  const slotName = (s: Slot) => areaLabel(ws, s) || s.front.name;
  const startSizeMode = (id?: string) => {
    const target = id ?? currentPanel();
    const slot = slotOfPanel(target);
    if (!target || !slot) return notify('Lege zuerst einen Slot an.');
    setActive(target);
    setSizeMode(true);
    setSizeSaid(`Adjust für „${slotName(slot)}“ (${placeText(slot.rect)}). Pfeile oder W A S D verschieben die Kante, Umschalt die andere, Mausrad über einem Portal ebenso. Leertaste, Enter oder Esc beendet.`);
  };
  sizeKeyRef.current = (e: KeyboardEvent) => {
    // F-155: Alt+G (Mac ⌥G) bzw. G im Größen-Modus = alle Areas gleich verteilen.
    const evenly = () => {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (mode.kind !== 'area') setMode({ kind: 'area' });
      dispatch({ type: 'distribute', setup });
      const text = `Alle ${view.slots.length} Slots gleich verteilt.`;
      if (sizeMode) setSizeSaid(text);
      else notify(text);
    };
    if (e.altKey && !e.metaKey && e.code === 'KeyG' && !e.repeat) return evenly();
    if (sizeMode && !e.ctrlKey && !e.metaKey && e.code === 'KeyG') return evenly();
    // Alt+A (Mac ⌥A) startet und beendet – linke oder rechte Alt-Taste (AltGr meldet zusätzlich Strg).
    if (e.altKey && !e.metaKey && e.code === 'KeyA' && !e.repeat) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (sizeMode) setSizeMode(false);
      else startSizeMode();
      return;
    }
    if (!sizeMode || e.ctrlKey || e.metaKey) return;
    const done = () => {
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
      done();
      setSizeMode(false);
      return;
    }
    const slot = slotOfPanel(currentPanel());
    if (!slot) return;
    const name = slotName(slot);
    if (e.code === 'KeyM' || e.code === 'KeyF') {
      done();
      const isMax = mode.kind === 'max';
      setMode(isMax ? { kind: 'area' } : { kind: 'max', id: slot.front.id });
      setSizeSaid(isMax ? `„${name}“ wieder auf dem Dashboard.` : `„${name}“ maximiert. M holt das Dashboard zurück.`);
      return;
    }
    if (e.key === 'Tab') {
      done();
      const order = T.readingOrder(view.tree);
      const i = order.indexOf(slot.id);
      const next = view.slots.find((s) => s.id === order[(i + (e.shiftKey ? -1 : 1) + order.length) % order.length]);
      if (!next) return;
      setActive(next.front.id);
      if (mode.kind === 'max') setMode({ kind: 'max', id: next.front.id });
      setSizeSaid(`Jetzt „${slotName(next)}“: ${placeText(next.rect)}.`);
      return;
    }
    const cmd = sizeCmdOf(e);
    if (!cmd || !view.tree) return;
    done();
    if (mode.kind !== 'area') setMode({ kind: 'area' });
    const next = sizeStep(view.tree, slot.id, cmd, min);
    if (JSON.stringify(next) === JSON.stringify(view.tree)) {
      const horiz = cmd.kind === 'edge' && (cmd.dir === 'left' || cmd.dir === 'right');
      setSizeSaid(
        cmd.kind === 'edge' && !edgeFor(view.tree, slot.id, cmd.dir, cmd.other)
          ? cmd.other
            ? `„${name}“ hat ${horiz ? 'links und rechts' : 'oben und unten'} nur eine bewegliche Kante – ohne Umschalt verschieben.`
            : `„${name}“ reicht schon über die ganze ${horiz ? 'Breite' : 'Höhe'} – dort gibt es keine Kante.`
          : `„${name}“ lässt sich so nicht weiter ändern – ein Nachbar ist schon am kleinsten oder die Fläche zu Ende.`,
      );
      return;
    }
    dispatch({ type: 'setLayout', setup, tree: next });
    const r = T.rects(next).get(slot.id);
    if (r) setSizeSaid(arrangeText(name, r));
  };

  /**
   * F-23: Alt/⌥+T = nächster Tab im aktiven Portal, Alt/⌥+P = nächstes Portal (Slots in
   * Lesereihenfolge, im Solo- und 2er-View wird mitgeschaltet); mit Umschalt jeweils rückwärts.
   * Danach liegt der Tastaturfokus auf dem sichtbaren Tab, die Ansage geht an die Live-Region.
   */
  cycleKeyRef.current = (e: KeyboardEvent) => {
    if (!e.altKey || e.ctrlKey || e.metaKey || (e.code !== 'KeyT' && e.code !== 'KeyP' && e.code !== 'KeyZ' && e.code !== 'KeyL')) return;
    // nicht hinter offenen Dialogen (Hilfe, Design, Hinweis, Tour)
    if (document.querySelector('[aria-modal="true"], dialog:modal')) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    // F-24: Alt/⌥+Z holt das zuletzt Geschlossene zurück
    if (e.code === 'KeyZ') return e.repeat ? undefined : restore();
    // F-40: Alt/⌥+L öffnet den Launcher bzw. geht hinein; steht der Fokus schon darin, schließt er
    if (e.code === 'KeyL') {
      if (e.repeat) return;
      if (launcher.open && document.activeElement?.closest('.launcher, .launcher-min')) {
        setLauncher({ open: false });
        sayLive('Launcher geschlossen.');
        return window.setTimeout(() => document.querySelector<HTMLElement>('.tb-launcher')?.focus());
      }
      return showLauncher();
    }
    const dir = e.shiftKey ? -1 : 1;
    const say = (text: string) => {
      // gleicher Text zweimal hintereinander soll erneut angesagt werden
      sayLive(text);
      if (sizeMode) setSizeSaid(text);
    };
    const focusTab = (id: string) =>
      // nach dem Neuzeichnen (setTimeout statt requestAnimationFrame: läuft auch, wenn das Fenster im Hintergrund ist)
      window.setTimeout(() =>
        document.querySelector<HTMLElement>(`[data-panel-id="${id}"] [role="tab"][aria-selected="true"]`)?.focus({ preventScroll: true }),
      );
    const cur = currentPanel();
    if (!cur) return say('Lege zuerst einen Slot an.');
    if (e.code === 'KeyT') {
      const meta = ws.panels.find((x) => x.id === cur);
      if (!meta) return;
      setActive(cur);
      const next = nextTabOf(meta, dir);
      if (!next) return say(tabAlone(meta));
      dispatch({ type: 'selectTab', id: cur, tab: next });
      say(tabSaid(meta, next));
      return focusTab(cur);
    }
    const order = T.readingOrder(shownView.tree);
    const slots = order.map((sid) => shownView.slots.find((s) => s.id === sid)).filter((s): s is Slot => !!s);
    if (slots.length < 2) return say(PORTAL_ALONE);
    const here = slots.find((s) => s.panels.some((x) => x.id === cur)) ?? null;
    const next = stepIn(slots, here, dir);
    if (!next) return;
    const id = next.front.id;
    setActive(id);
    if (mode.kind === 'max') setMode({ kind: 'max', id });
    say(portalSaid(next.front, slots.indexOf(next), slots.length, next.panels.length));
    focusTab(id);
  };

  /**
   * F-155 Mausrad: Im Größen-Modus liegt über jedem Panel eine durchsichtige Fläche (die
   * eingebettete Seite bekäme das Scrollen sonst selbst). Scrollen verschiebt die Kante in
   * Scrollrichtung – hoch/runter die untere bzw. obere, links/rechts (Trackpad, Umschalt+Rad) die
   * rechte bzw. linke. Gesammelt je Bild, damit es flüssig bleibt.
   */
  const wheel = useRef<{ leaf: string; dx: number; dy: number; frame: number }>({ leaf: '', dx: 0, dy: 0, frame: 0 });
  const applyWheelRef = useRef<() => void>(() => {});
  applyWheelRef.current = () => {
    const w = wheel.current;
    w.frame = 0;
    const slot = view.slots.find((s) => s.id === w.leaf);
    const tree = view.tree;
    const { dx, dy } = w;
    w.dx = 0;
    w.dy = 0;
    if (!slot || !tree) return;
    // Ein Raster des Mausrads (≈ 100 px) ≈ 5 % – wie ein Tastenschritt; Trackpads liefern feinere Schritte.
    const SPEED = 0.35;
    let t = tree;
    if (dx) {
      const edge = edgeFor(t, slot.id, dx > 0 ? 'right' : 'left', false);
      if (edge) t = T.resizeEdge(t, slot.id, edge, (dx * SPEED) / iw, min);
    }
    if (dy) {
      const edge = edgeFor(t, slot.id, dy > 0 ? 'bottom' : 'top', false);
      if (edge) t = T.resizeEdge(t, slot.id, edge, (dy * SPEED) / ih, min);
    }
    if (t === tree) return;
    dispatch({ type: 'setLayout', setup, tree: t });
    const r = T.rects(t).get(slot.id);
    if (r) setSizeSaid(arrangeText(slotName(slot), r));
  };
  const onSizeWheel = (e: React.WheelEvent, slot: Slot) => {
    let dx = e.deltaX;
    let dy = e.deltaY;
    // Mausrad mit Umschalt = waagrecht (Windows meldet es weiter als deltaY).
    if (e.shiftKey && !dx) {
      dx = dy;
      dy = 0;
    }
    const lines = e.deltaMode === 1 ? 16 : 1;
    const w = wheel.current;
    if (w.leaf !== slot.id) Object.assign(w, { leaf: slot.id, dx: 0, dy: 0 });
    w.dx += dx * lines;
    w.dy += dy * lines;
    if (active !== slot.front.id) setActive(slot.front.id);
    if (!w.frame) w.frame = requestAnimationFrame(() => applyWheelRef.current());
  };

  /** Panel, das auf einer Area sichtbar ist (beim Stapel das vorderste). */
  const shown = (slotId: string): PanelMeta | null => shownView.slots.find((s) => s.id === slotId)?.front ?? null;

  const frame = (meta: PanelMeta, onArea?: { slotId: string; rect: T.FRect }) => {
    const slotOfMeta = shownView.slots.find((s) => s.panels.some((m) => m.id === meta.id));
    const inStack = !!slotOfMeta && slotOfMeta.panels.length > 1;
    const full = !slotOfMeta || slotOfMeta.panels.length >= STACK_MAX;
    return (
      <PanelFrame
        panel={meta}
        fx={fx}
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
                onRemove: (id) => closePortal(id),
                onAdd: full ? undefined : () => addPanel(slotOfMeta.id),
                addFx: fx.panel,
                onRename: (id, name) => dispatch({ type: 'rename', id, name }),
                onDragStart: onArea ? (e, id) => startStackDrag(e, id, slotOfMeta.id) : undefined,
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
        onCloseTab={(tab) => closeTabOf(meta.id, tab)}
        onSelectTab={(tab) => dispatch({ type: 'selectTab', id: meta.id, tab })}
        onMoveTab={(tab, to) => dispatch({ type: 'moveTab', id: meta.id, tab, to })}
        isBlocked={(u) => isBlocked(ws, u)}
        onEmbed={(url, ok) => {
          dispatch({ type: 'embed', url, ok });
          if (!ok) notify('Gemerkt: Diese Domain öffnet ab jetzt außerhalb. Gespeicherte Sources davon stehen im Launcher (Alt/⌥+L).');
        }}
        onImportBookmarks={importBookmarks}
        onToLauncher={(tabId, url) => {
          // F-43 Rest: als Source speichern (falls noch nicht da), Tab schließen, Launcher zeigen
          const known = bookmarkOf(ws, url);
          if (!known) dispatch({ type: 'saveBookmark', bookmark: { id: newId(), title: '', url, category: NO_CATEGORY, tags: [], panels: [] } });
          closeTabOf(meta.id, tabId);
          setLauncher({ open: true, min: false });
          sayLive(`${known?.title ?? hostOf(url)} liegt jetzt im Launcher. Tab geschlossen, Alt/⌥+Z holt ihn zurück.`);
        }}
        onAddHere={() => (slotOfMeta ? addPanel(slotOfMeta.id) : addPanel())}
        hint={hint?.id === meta.id ? hint.text : undefined}
        onHint={(text) => setHint({ id: meta.id, text })}
        onHintDone={() => setHint(null)}
        onSetHome={() => {
          dispatch({ type: 'setHome', id: meta.id });
          notify('Aktuelle Source ist jetzt die Start-Source dieses Portals.');
        }}
        notify={notify}
        ws={ws}
        dispatch={dispatch}
        windows={windowList(ws).filter((w) => w.id !== win)}
        onToWindow={(target, whole) => toWindow(meta.id, target, whole)}
        moveTargets={(whole) => targetsFor(meta.id, whole)}
        onMove={(t, whole) => moveTo(meta.id, t, whole)}
        onOpenBookmark={(url) => {
          // F-21: als Tab öffnen; bei voller Tab-Leiste (F-26) nur Hinweis
          if (openBookmark(ws, meta.id, url).result === 'full')
            return notify(`Schon ${TAB_MAX} Tabs offen. Schließe einen Tab oder öffne die Source in einem anderen Portal.`);
          dispatch({ type: 'openBookmark', panel: meta.id, url });
        }}
        onClose={() => closePortal(meta.id)}
        onStartSwap={() => {
          if (mine.length < 2) return notify('Zum Tauschen braucht es mindestens zwei Portale.');
          setSwapFrom(swapFrom === meta.id ? null : meta.id);
        }}
        onSetSize={(w, h) => dispatch({ type: 'setSize', setup, id: meta.id, w, h, min })}
        onReset={() => dispatch({ type: 'resetPanel', setup, id: meta.id, min })}
        onSizeKeys={() => startSizeMode(meta.id)}
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

  /** F-127: View weiterschalten – Dashboard → 2 × 2 → 2 → Solo → Dashboard (Knopf und Hilfe). */
  const viewNow: ViewKind = mode.kind === 'max' ? 1 : mode.kind === 'split' ? mode.count : 'area';
  const cycleView = () => {
    const next = VIEW_NEXT[viewNow];
    if (next === 'area') return setMode({ kind: 'area' });
    if (next === 1) {
      const id = (active && ws.panels.some((x) => x.id === active) ? active : null) ?? shownView.slots[0]?.front.id;
      return setMode(id ? { kind: 'max', id } : { kind: 'area' });
    }
    setMode({ kind: 'split', count: next });
  };
  /** F-165: leeren Desk anlegen und in eigenem Browserfenster öffnen. */
  const addNewDesk = () => {
    const dest = newId();
    const name = nextWindowName(ws.windows);
    dispatch({ type: 'addDesk', win: dest });
    if (!openAppWindow(dest)) return notify(`„${name}“ angelegt. ${POPUP_BLOCKED}`);
    notify(`„${name}“ angelegt und in neuem Browserfenster geöffnet.`);
  };
  /** F-156: Funktion aus Suche oder Hilfe ausführen. */
  const runHelp = (e: HelpEntry) => {
    // aus dem Hilfe-Dialog: erst schließen, dann ausführen
    setHelpAt(null);
    switch (e.run) {
      case 'help':
        return setHelpAt({ at: null });
      case 'cockpit':
        return toggleOverview();
      case 'view':
        cycleView();
        return notify(`View: ${VIEW_NAME[VIEW_NEXT[viewNow]]}.`);
      case 'adjust':
        return startSizeMode();
      case 'distribute':
        dispatch({ type: 'distribute', setup });
        return notify(`Alle ${view.slots.length} Slots gleich verteilt.`);
      case 'maximize': {
        const id = currentPanel() ?? shownView.slots[0]?.front.id;
        if (!id) return notify('Kein Portal zum Maximieren offen.');
        return setMode({ kind: 'max', id });
      }
      case 'newSlot':
        if (!canAddArea(ws, setup)) return notify(`Der Bildschirm ist voll (${view.slots.length}/${view.spec.capacity} Slots). Weitere Portale legst du über das Plus in der Kopfleiste eines Portals auf seinen Slot.`, 5000);
        dispatch({ type: 'addArea', setup, side: 'right' });
        return notify('Neuer Slot rechts angelegt.');
      case 'newDesk':
        return addNewDesk();
      case 'tour':
        return setTour('start');
      case 'tourCockpit':
        return startCockpitTour();
      case 'design':
        return setDesign(true);
      case 'tourDesign':
        return startDesignTour();
      case 'toursAuto':
        return switchAutoTours();
      case 'restore':
        return restore();
      case 'closed':
        return setClosedOpen(true);
      case 'focusRule':
        return setRuleOpen(true);
      case 'launcher':
        return showLauncher();
      case 'importBookmarks':
        return importBookmarks();
      case 'exportBookmarks':
        return exportBookmarks();
      case 'sortHelp':
        return setSortOpen(true);
      case 'search':
        return window.setTimeout(() => document.querySelector<HTMLInputElement>('.search__input')?.focus(), 0);
    }
  };

  let content: ReactNode;
  if (mine.length === 0) {
    content = (
      <div className="empty">
        <p>{win ? 'Dieser Desk ist leer – seine Portale sind wieder auf dem Main Desk oder geschlossen.' : 'Keine Portale geöffnet.'}</p>
        <button
          type="button"
          className="fx"
          style={{ '--fx': fx.panel.color } as CSSProperties}
          title={`Neuen Slot anlegen – ${fx.panel.text}`}
          onClick={() => dispatch({ type: 'addArea', setup, side: 'right' })}
        >
          +<span className="tb-label"> NewSlot</span>
        </button>
        {win && (
          <button type="button" onClick={() => window.close()}>
            Desk schließen
          </button>
        )}
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
              {/* F-155: im Größen-Modus fängt diese Fläche Mausrad und Klick ab (statt der eingebetteten Seite) */}
              {sizeMode && (
                <div
                  className={`sizepad${meta?.id === active ? ' is-active' : ''}`}
                  aria-hidden="true"
                  title="Scrollen: Kante verschieben · Klick: dieses Portal wählen"
                  onWheel={(e) => onSizeWheel(e, s)}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    if (meta) setActive(meta.id);
                    setSizeSaid(`Jetzt „${slotName(s)}“: ${placeText(s.rect)}.`);
                  }}
                />
              )}
              {over && (
                <div className={`drop drop--${over} ${drag?.stack ? (drag.stack.ok ? 'drop--in' : 'drop--no') : zoneClass(over)}`}>
                  <span>{drag?.stack ? (drag.stack.ok ? 'Im Portal ablegen' : `Stack voll (${STACK_MAX})`) : ZONE_LABEL[over]}</span>
                </div>
              )}
            </div>
          );
        })}
        {drag?.target === T.AREA && drag.zone && (
          <div className="area-drop">
            <div className={`drop drop--${drag.zone} drop--dock`}>
              <span>{dropLabel(T.AREA, drag.zone)}</span>
            </div>
          </div>
        )}
        {drag && (
          <div className="ghost" style={{ left: drag.x + 12, top: drag.y + 12 }}>
            {drag.stack ? (ws.panels.find((x) => x.id === drag.id)?.name ?? '') : (shown(drag.id)?.name ?? '')}
            {drag.stack
              ? drag.target
                ? ` → ${drag.stack.ok ? `in „${drag.stack.label}“ ablegen` : 'Stack voll'}`
                : ''
              : drag.target && drag.zone
                ? ` → ${ghostLabel(drag.target, drag.zone, shown(drag.target)?.name ?? '')}`
                : ''}
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
    notify(`Alle Desks als ${FILE_NAME} gespeichert. Auf dem anderen Gerät „Importieren“ wählen.`);
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
      !window.confirm(`Der Stand auf diesem Gerät ist neuer als die Datei (${file.device}, ${when}). Trotzdem ersetzen?`)
    )
      return;
    storeImported(file.workspace);
    dispatch({ type: 'replace', ws: file.workspace });
    setActive(file.workspace.panels[0]?.id ?? null);
    setMode({ kind: 'area' });
    notify(`Stand übernommen (${file.device}, ${when}).`);
  };


  return (
    <div className="app">
      <header className="toolbar" ref={toolbarRef}>
        {/* F-154: Logo und Name des Desks teilen sich die linke Spalte; der Main Desk heißt fest so, weitere Desks lassen sich umbenennen */}
        <div className="brand">
          <img className="brand-logo" src={shownTheme === 'dark' ? logoUrl : logoLightUrl} alt="E-Sources" width={366} height={186} />
          {win ? (
            <WindowName name={winLabel} fx={deskFx(win)} onRename={(name) => dispatch({ type: 'renameWindow', win, name })} />
          ) : (
            <span className="tb-win tb-win--main fx-desk" title={`${MAIN_NAME} · ${TERMS.desk} · ${deskFx('').text}`} style={{ '--fx': deskFx('').color } as CSSProperties}>
              {MAIN_NAME}
            </span>
          )}
          {/* F-160: Desk wechseln – zeigt einen anderen Desk in diesem Browserfenster */}
          {ws.windows.length > 0 && (
            <Menu icon={<span className="tb-switch" aria-hidden="true">⇄</span>} label={`Desk wechseln – ${TERMS.switchDesk}`}>
              {(close) =>
                windowList(ws).map((d) => {
                  const here = d.id === win;
                  const elsewhere = !here && windows.open.has(d.id);
                  const n = panelsIn(ws.panels, d.id).length;
                  return (
                    <Item
                      key={d.id || 'main'}
                      disabled={here}
                      onClick={() => {
                        close();
                        switchDesk(d.id);
                      }}
                    >
                      {here ? '● ' : ''}
                      {d.name} · {n === 1 ? '1 Portal' : `${n} Portale`}
                      {` · ${deskFx(d.id).word}`}
                      {here ? ' · hier' : elsewhere ? ' · eigenes Fenster' : ''}
                    </Item>
                  );
                })
              }
            </Menu>
          )}
          {/* F-165: leeren Desk anlegen und in eigenem Browserfenster öffnen */}
          <button
            type="button"
            className="tb-newdesk fx"
            style={{ '--fx': fx.panel.color } as CSSProperties}
            title={`${TERMS.newDesk} – ${fx.panel.text}`}
            aria-label={`+ NewDesk, ${fx.panel.text}`}
            onClick={addNewDesk}
          >
            +<span className="tb-label"> NewDesk</span>
          </button>
        </div>
        {/* F-146: Logo links, Bedienelemente mittig, Gesamtfokus ganz rechts */}
        <div className="tb-center" style={{ '--fx-slot': fx.panel.color } as CSSProperties}>
        {/* F-27: Zusatzfenster zeigen ihren Namen und können alles zurückgeben */}
        {win && (
          <>
            <button
              type="button"
              disabled={mine.length === 0}
              title={`Alle Portale von ${winLabel} zurück auf den ${MAIN_NAME}`}
              onClick={() => {
                dispatch({ type: 'returnAll', win });
                if (!openAppWindow('')) return notify(POPUP_BLOCKED);
                // Selbst geöffnete Zusatzfenster schließen sich danach; sonst bleibt der Hinweis „leer“.
                window.setTimeout(() => window.close(), 150);
              }}
            >
              ⇤<span className="tb-label"> Alles ins {MAIN_NAME}</span>
            </button>
          </>
        )}
        {/* F-127: Knopf „Ansicht“ – jeder Klick schaltet weiter: Arbeitsfläche → 2 × 2 → 2 → 1 → Arbeitsfläche */}
        {(() => {
          const now = viewNow;
          const next = VIEW_NEXT[now];
          const go = cycleView;
          return (
            <button
              type="button"
              className={now === 'area' ? 'tb-view' : 'on tb-view'}
              onClick={go}
              title={`View: ${VIEW_NAME[now]} · Klick: ${VIEW_NAME[next]}${next === 'area' ? ' (Esc)' : ''} · ${TERMS.view}`}
              aria-label={`View: ${VIEW_NAME[now]}. Weiter zu: ${VIEW_NAME[next]}`}
              aria-pressed={now !== 'area'}
            >
              <ViewIcon view={now} />
            </button>
          );
        })()}
        {/* „Zum Dashboard“ nimmt außerhalb des Dashboards den Platz von „Gleich verteilen“ ein (dort ohnehin gesperrt) –
            so verschiebt sich beim Durchschalten nichts und der View-Knopf bleibt unter Finger und Maus */}
        {onArea ? (
          <button type="button" className="tb-view tb-distribute" onClick={() => dispatch({ type: 'distribute', setup })} title="Gleich verteilen (Alt/⌥+G): alle Portale gleich groß, die Anordnung bleibt" aria-label="Gleich verteilen" aria-keyshortcuts="Alt+G">
            {DistributeIcon}
          </button>
        ) : (
          <button type="button" className="tb-view tb-home" onClick={() => setMode({ kind: 'area' })} title={`Zurück zum Dashboard (Esc) · ${TERMS.dashboard}`} aria-label="Zum Dashboard" aria-keyshortcuts="Escape">
            {BackIcon}
          </button>
        )}
        {/* F-34: zentrales Suchfeld über alle Lesezeichen */}
        <Search ws={ws} activeName={ws.panels.find((x) => x.id === currentPanel())?.name ?? null} onOpen={openHit} onShowPanel={showPanel} onRun={runHelp} onHelp={(id) => setHelpAt({ at: id })} launchHow={launcher.how} />
        {/* F-40: Launcher für Sources, die sich nicht einbetten lassen */}
        {(() => {
          const n = launcherCount(ws);
          return (
            <button
              type="button"
              className={launcher.open ? 'on tb-launcher' : 'tb-launcher'}
              onClick={() => (launcher.open && !launcher.min ? setLauncher({ open: false }) : showLauncher())}
              title={`Launcher (Alt/⌥+L): ${n} ${n === 1 ? 'Source' : 'Sources'} · ${TERMS.launcher}`}
              aria-label={`Launcher, ${n} ${n === 1 ? 'Source' : 'Sources'}`}
              aria-pressed={launcher.open}
              aria-keyshortcuts="Alt+L"
            >
              {LauncherIcon}
              {n > 0 && <span className="tb-launcher__n">{n}</span>}
            </button>
          );
        })()}
        {/* F-134: „+ Area“ – neue Spalte rechts oder Zeile unten; Panels kommen über die Areas dazu. */}
        {canAddArea(ws, setup) ? (
          <Menu icon={<span className="tb-add fx" style={{ '--fx': fx.panel.color } as CSSProperties}>+<span className="tb-label"> NewSlot</span></span>} label={`Neuen Slot anlegen – ${TERMS.slot} – ${fx.panel.text}`}>
            {(close) => (
              <>
                <Item
                  onClick={() => {
                    dispatch({ type: 'addArea', setup, side: 'right' });
                    close();
                  }}
                >
                  Neue Spalte rechts
                </Item>
                <Item
                  onClick={() => {
                    dispatch({ type: 'addArea', setup, side: 'bottom' });
                    close();
                  }}
                >
                  Neue Zeile unten
                </Item>
              </>
            )}
          </Menu>
        ) : (
          // NF-03: bleibt erreichbar und sagt beim Klick, warum keine Area mehr dazukommt
          <button
            type="button"
            className="is-off tb-newslot fx"
            style={{ '--fx': fx.panel.color } as CSSProperties}
            aria-disabled="true"
            title={`Bildschirm voll – weitere Portale über das Plus eines Portals anlegen (${fx.panel.text})`}
            onClick={() => notify(`Der Bildschirm ist voll (${view.slots.length}/${view.spec.capacity} Slots). Weitere Portale legst du über das Plus in der Kopfleiste eines Portals auf seinen Slot.`, 5000)}
          >
            +<span className="tb-label"> NewSlot</span>
          </button>
        )}
        {/* F-156: Hilfe – alle Funktionen und Begriffe mit Kürzeln */}
        <button type="button" className="tb-help" onClick={() => setHelpAt({ at: null })} title="Hilfe: alle Funktionen und Begriffe mit Tastenkürzeln (?)" aria-label="Hilfe" aria-haspopup="dialog">
          ?
        </button>
        {/* F-66: Selten Gebrauchtes im Menü, damit die Kopfleiste schlank bleibt */}
        <Menu icon={GearIcon} label="Einstellungen">
          {(close) => (
            <>
              {/* F-125, F-146: Lineal für alle Panels (vorher eigener Knopf in der Kopfleiste) */}
              <Item
                onClick={() => {
                  dispatch({ type: 'rulerAll' });
                  close();
                }}
              >
                {ws.ruler.on ? 'Lineal in allen Portalen ausblenden' : 'Lineal in allen Portalen zeigen'}
              </Item>
              <li className="menu__sep" role="separator" />
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
              {/* F-145: Beispiel-Lesezeichen zum Ausprobieren */}
              <Item
                onClick={() => {
                  const n = addSamples(ws, newId).added;
                  if (n) dispatch({ type: 'addSamples' });
                  notify(n ? `${n} Beispiel-Sources in 5 Kategorien angelegt – zu finden in der Library unter „Alle“.` : 'Die Beispiel-Sources sind schon alle da.');
                  close();
                }}
              >
                Beispiel-Sources anlegen
              </Item>
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
              {/* F-174: Darstellung und Akzentfarbe im eigenen Dialog (vorher lose hier) */}
              <Item
                onClick={() => {
                  close();
                  setDesign(true);
                }}
              >
                Design anpassen …
              </Item>
              <li className="menu__sep" role="separator" />
              <Item
                onClick={() => {
                  exportWorkspace();
                  close();
                }}
              >
                Desks exportieren
              </Item>
              <Item
                onClick={() => {
                  importRef.current?.click();
                  close();
                }}
              >
                Desks importieren
              </Item>
              {/* F-36 */}
              <Item
                onClick={() => {
                  importBookmarks();
                  close();
                }}
              >
                Lesezeichen importieren …
              </Item>
              <Item
                onClick={() => {
                  exportBookmarks();
                  close();
                }}
              >
                Library exportieren
              </Item>
              {/* F-180 */}
              <Item
                onClick={() => {
                  close();
                  setSortOpen(true);
                }}
              >
                Sortierhilfe …
              </Item>
              {/* F-29 Rest */}
              <Item
                onClick={() => {
                  close();
                  setRuleOpen(true);
                }}
              >
                Fokusanzeige anpassen …
              </Item>
              {/* F-24 */}
              <Item
                onClick={() => {
                  close();
                  setClosedOpen(true);
                }}
              >
                Zuletzt geschlossen …
              </Item>
              {/* F-95: Tour jederzeit wieder starten */}
              <Item
                onClick={() => {
                  close();
                  setTour('start');
                }}
              >
                Tour starten
              </Item>
              {/* F-173: Touren beim ersten Mal von selbst starten – ein/aus */}
              <Item checked={autoTours} onClick={switchAutoTours}>
                Touren automatisch zeigen
              </Item>
              {/* F-132 Urheberrechtsvermerk */}
              <li className="menu__sep" role="separator" />
              <li className="menu__copy">© 2026 Enrico Schulz</li>
            </>
          )}
        </Menu>
        <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={(e) => void importWorkspace(e.currentTarget)} />
        <input ref={bookmarkFileRef} type="file" accept="text/html,.html,.htm" hidden aria-label="Lesezeichen-Datei wählen" onChange={(e) => void chooseBookmarkFile(e.currentTarget)} />
        {swapFrom && <span className="hint">Ziel-Portal anklicken · Esc bricht ab</span>}
        </div>
        {/* F-29 Gesamtfokus; Klick klappt das Fokus-Radar (F-28, bisher Master-Panel) aus */}
        {/* F-177: Fokusanzeige und Knopf „Design“ teilen sich die rechte Spalte der Kopfleiste */}
        <div className="tb-end">
          <FocusMeter focus={focus} open={overview} onToggle={toggleOverview} btnRef={meterRef} />
          <button type="button" className="tb-design" onClick={() => setDesign(true)} aria-haspopup="dialog" aria-label="Design anpassen" title="Design anpassen – Darstellung und Akzentfarbe">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.4-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z" />
              <circle cx="7.5" cy="11" r="1.2" />
              <circle cx="10" cy="7" r="1.2" />
              <circle cx="14.5" cy="7" r="1.2" />
            </svg>
          </button>
        </div>
      </header>
      {PROBE && (
        <a className="probe" href={window.location.pathname} title="Testbelegung verlassen (zurück zu deinen eigenen Desks)">
          Test: voll · nichts wird gespeichert
        </a>
      )}
      {tour && tour !== 'design' && <Tour key={tour} tour={tour} auto={tourAuto} onClose={() => setTour(null)} onAutoOff={() => setAutoTours(false)} />}
      {design && (
        <Design look={ws.look} warning={lookWarning} onLook={(change) => {
            // F-178: passende Akzentfarbe mitnehmen, wenn die bisherige im neuen Design schlecht lesbar wäre
            const next = pickLook(ws.look, change, systemDark);
            dispatch({ type: 'look', ...next });
            if (next.accent && !change.accent) notify(`Akzentfarbe an „${THEMES.find((t) => t.id === change.theme)?.label}“ angepasst, damit alles lesbar bleibt.`);
          }} onClose={() => setDesign(false)} onTour={startDesignTour}>
          {tour === 'design' && <Tour key="design" tour="design" auto={tourAuto} onClose={() => setTour(null)} onAutoOff={() => setAutoTours(false)} />}
        </Design>
      )}
      {bmImport && (
        <ImportBookmarks
          ws={ws}
          fileName={bmImport.name}
          list={bmImport.list}
          onClose={() => setBmImport(null)}
          onImport={(plan) => {
            dispatch({ type: 'importBookmarks', plan });
            setBmImport(null);
            const cats = plan.newCategories.length;
            const loose = plan.fresh.filter((b) => !b.category).length;
            // F-180: viele Sources ohne Kategorie → gleich die Sortierhilfe anbieten
            const text = `${plan.fresh.length} Sources in die Library übernommen${cats ? `, ${cats} ${cats === 1 ? 'Kategorie' : 'Kategorien'} neu` : ''}.${loose >= 5 ? ` Die Sortierhilfe bündelt die ${loose} ohne Kategorie.` : ''}`;
            notify(text);
            sayLive(text);
            if (loose >= 5) window.setTimeout(() => setSortOpen(true), 0);
          }}
        />
      )}
      {sortOpen && (
        <SortHelp
          ws={ws}
          onSort={(ids, name) => dispatch({ type: 'sortInto', ids, name })}
          onSortAll={() => dispatch({ type: 'sortAll' })}
          onClose={() => setSortOpen(false)}
        />
      )}
      {ruleOpen && <FocusRuleDialog rule={ruleOf(ws)} points={focus.points} onChange={(rule) => dispatch({ type: 'focusRule', rule })} onClose={() => setRuleOpen(false)} />}
      {closedOpen && (
        <ClosedDialog
          entries={closedOf(ws, win ?? '')}
          onRestore={(id) => {
            setClosedOpen(false);
            restore(id);
          }}
          onClose={() => setClosedOpen(false)}
        />
      )}
      {launcher.open && (
        <Launcher
          ws={ws}
          state={launcher}
          onState={setLauncher}
          onOpen={(b, how) => launch(b.url, b.title, how)}
          onAdd={(url, title, category) => {
            const id = newId();
            dispatch({ type: 'saveBookmark', bookmark: { id, title, url, category, tags: [], panels: [] } });
            const blocked = isBlocked(ws, normalizeUrl(url));
            if (!blocked) dispatch({ type: 'embed', url: normalizeUrl(url), ok: false });
            const host = hostOf(normalizeUrl(url));
            sayLive(`${title.trim() || host} angelegt${blocked ? '' : `; ${host} öffnet ab jetzt außerhalb`}.`);
          }}
          say={sayLive}
          focusReq={launcherFocus}
        />
      )}
      {helpAt && <Help at={helpAt.at} onClose={() => setHelpAt(null)} onRun={runHelp} />}
      {overview && (
        <Overview
          ws={ws}
          slots={view.slots}
          setup={setup}
          focus={focus}
          activeId={currentPanel()}
          top={overviewTop}
          toggleRef={meterRef}
          info={`${view.slots.length}/${view.spec.capacity} Slots belegt${stacked > 0 ? ` · ${stacked} im Stack` : ''} · ${screenClass(cls).label}, ${orientation === 'landscape' ? 'quer' : 'hoch'}`}
          win={win}
          open={windows.open}
          onShow={showPanel}
          onFetch={(id) => fetchHere([id])}
          onFetchAll={(from) => fetchHere(ws.panels.filter((x) => (x.win ?? '') === from).map((x) => x.id))}
          onOpenWindow={(target) => {
            if (!openAppWindow(target)) notify(POPUP_BLOCKED);
          }}
          onClose={(id) => closePortal(id)}
          onRename={(id, name) => dispatch({ type: 'rename', id, name })}
          moveTargets={targetsFor}
          onMove={moveTo}
          onNewWindow={(id, whole) => toWindow(id, null, whole)}
          min={min}
          onLayout={(w, tree) => {
            // F-153: Anordnung auch für ein anderes Fenster (dessen zuletzt gesehene Einstellung).
            const s = w === win ? setup : setupOfWindow(ws, w);
            if (s) dispatch({ type: 'setLayout', setup: s, tree });
          }}
          onDismiss={() => setOverview(false)}
          onTour={startCockpitTour}
          keepOpen={tour === 'cockpit'}
        />
      )}
      {/* F-142: schnelle Tooltips */}
      <Tooltips />
      {/* F-155: Größen-Modus – Hilfe und Ansage */}
      {sizeMode && (
        <div className="sizebar" role="region" aria-label="Adjust">
          <strong title={TERMS.adjust}>Adjust</strong>
          <span className="sizebar__keys">
            W A S D / Pfeile: Kante · Umschalt: andere Kante · Mausrad über Portal: Kante · Q / E (− / +) diagonal · G gleich verteilen · 1–9 = 10–90 % · 0 = 100 % · F maximieren · Tab nächstes · Leertaste/Esc fertig
          </span>
          <span className="sizebar__said" role="status">
            {sizeSaid}
          </span>
          <button type="button" onClick={() => setSizeMode(false)} aria-label="Adjust beenden" title="Fertig (Enter/Esc)">
            ×
          </button>
        </div>
      )}
      {/* F-23: Ansage für Tab-/Portal-Wechsel per Kürzel */}
      <span className="sr-only" role="status" aria-live="polite">
        {cycleSaid}
      </span>
      {flash && !swapFrom && (
        <div className="toast" role="status">
          <span>{flash}</span>
          {undoFor === flash && (
            <button
              type="button"
              className="toast__undo"
              onClick={() => {
                setFlash(null);
                restore();
              }}
              title="Wiederherstellen (Alt/⌥+Z)"
            >
              Wiederherstellen
            </button>
          )}
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
