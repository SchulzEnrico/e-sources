import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { ZOOM_DEFAULT, fitFor, fitStart, frameWidth, nearestStep, shownZoom, zoomOf, zoomStep } from './workspace/zoom';
import './App.css';
import { usePause } from './workspace/usePause';
import { PAUSE_CHOICES, SHOWN_CHOICES, keepTabOf, keptBySource, keptSources, pauseMinutes, shownMinutes, tabKey } from './workspace/pause';
import logoUrl from './assets/e-sources-logo.svg';
import logoLightUrl from './assets/e-sources-logo-light.svg';
import { Item, Menu, MenuHead, PanelFrame } from './components/PanelFrame';
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
import type { Bookmark, PanelMeta, Slot } from './workspace/types';
import { loadSyncMeta, saveSyncMeta, storeImported } from './workspace/storage';
import { FILE_NAME, deviceLabel, needsConfirm, readTransferFile, toTransferFile } from './workspace/transfer';
import { type Action, useWorkspace } from './workspace/useWorkspace';
import type { Workspace } from './workspace/types';
import { type SearchHit, NO_CATEGORY, addSamples, bookmarkOf, openBookmark, originOf } from './workspace/bookmarks';
import { Launcher, LauncherIcon } from './components/Launcher';
import { type How, type LauncherState, HOW_IN, launcherCount, loadLauncher, openOutside, saveLauncher } from './workspace/launcher';
import { Search } from './components/Search';
import { Tooltips } from './components/Tooltip';
import { FocusMeter, Overview } from './components/Overview';
import { arrangeText, deskFocusOf, effectOf, focusOf, placeText, radarOf, ruleOf } from './workspace/focus';
import { snapColors, snapDesign } from './workspace/reset';
import { loadRecent, newestSources, recentLists, recentSources, saveRecent, touch } from './workspace/recent';
import { edgeFor, sizeCmdOf, sizeStep } from './workspace/sizing';
import { contrastWarning, hasOwnLook, lookOf, pickLook, shownAccent, THEMES, resolveTheme, rgbOf } from './workspace/look';
import { MAIN_NAME, collectedDesks, deskGone, deskRing, deskSaid, nextWindowName, stepDesk, windowList, windowName, windowUrl, winFromSearch } from './workspace/windows';
import { openAppWindow, useOpenWindows, windowTarget } from './workspace/useWindows';
import { type MoveTarget, fetchPanels, moveTargets, setupOfWindow } from './workspace/move';
import { PROBE, PROBE_KIND } from './workspace/probe';
import { Help } from './components/Help';
import { Tour } from './components/Tour';
import { SlotMachine } from './components/SlotMachine';
import { type Cleanup, type InviteWhy, type RedundantSlot, INVITE_KEY, INVITE_LATER, INVITE_PAUSE, dupCount, inviteWhy } from './workspace/jackpot';
import { TOUR_EVENT, type TourId, setToursAuto, tourAutoStart, toursAuto } from './workspace/tour';
import { Design } from './components/Design';
import { type HelpEntry, browserExportLine } from './workspace/help';
import type { ScreenSetup } from './workspace/screen';
import { activeTab, loadColor, FOCUS_WARN, NEW_AREA, STACK_MAX, TAB_MAX, newId, panelsIn, addPanel as addTo, areaIn, canAddArea, areaLabel, areaOf, slotNameId, describe, hostOf, isBlocked, panelUrl, normalizeUrl, setupFor, splitSelection, stackFull, tabLabel, tryPlace, viewOf, addArea as addAreaTo, distribute as distributeIn } from './workspace/workspace';
import { CASE_TEXT, CATEGORY_ICON_LABEL, CATEGORY_TEXT, DESK_GONE_TEXT, DESK_LAYOUT_TEXT, DESK_LOOK_TEXT, DEV_TEXT, DIALOG_TEXT, DISPLAY_TEXT, GREET_TEXT, JACKPOT_TEXT, PAUSE_TEXT, SEND_TEXT, TERMS, SYNC_TEXT, TINT_TEXT, TRANSFER_TEXT, WEB_TEXT, ZOOM_TEXT } from './workspace/terms';
import { ENGINES, engineOf, openBeside, searchUrl } from './workspace/websearch';
import { BOOKMARK_FILE, BOOKMARK_NAME, bookmarkFile, bookmarklet, sendBase } from './workspace/send';
import { browserOf, currentUa, modKey } from './workspace/browser';
import { useSendReceiver } from './workspace/useSend';
import { setCompact, setFavicons } from './workspace/display';
import { useDisplay } from './components/SiteIcon';
import { categoryIcon } from './workspace/icons';
import { clearDeskTints, deskTintCount, shownTint, slotTint } from './workspace/tint';
import { categoryOf, categoryPortals, categoryTint, suggestCategory } from './workspace/category';
import { ruleOn, tintRuleId } from './workspace/rules';
import { domainOf } from './workspace/sortHelp';

import { Colors } from './components/Colors';
import { Closed as ClosedDialog } from './components/Closed';
import type { LayoutOps } from './components/DeskLayouts';
import { type DeletedLayout, type LayoutContent, activeLayout, deleteLayout, findLayout, layoutsOf, resetToStandard, standardContent } from './workspace/deskLayouts';
import { pickCase } from './workspace/cases';
import { CasesDialog } from './components/Cases';
import { PORTAL_MIN_PX, setStandardRef } from './workspace/device';
import { FocusRule as FocusRuleDialog } from './components/FocusRule';
import { ImportBookmarks } from './components/ImportBookmarks';
import { SortHelp } from './components/SortHelp';
import { Greeting } from './components/Greeting';
import { UpdateNotice } from './components/UpdateNotice';
import { useUpdateCheck } from './workspace/useUpdate';
import { ProfileDialog } from './components/Profile';
import { loadLast, profileOf, saveLast } from './workspace/profile';
import { welcomeText } from './workspace/welcome';
import { BOOKMARKS_FILE_NAME, type BrowserBookmark, bookmarkFileOf, looksLikeBookmarkFile, parseBookmarkFile } from './workspace/browserBookmarks';
import { closedOf, restoreClosed, restoredSaid } from './workspace/closed';
import { PORTAL_ALONE, nextTabOf, portalSaid, stepIn, tabAlone, tabSaid } from './workspace/cycle';
import { Icon } from './components/Icon';
import { SyncDialog } from './components/Sync';
import { restoreBackup, useGistState, useGistSync } from './workspace/useGistSync';
import { FLASH_EVENT, type FlashRequest } from './workspace/flash';

/** Knopf im Hinweis unten (F-162, F-163). */
interface FlashAction {
  label: string;
  run: () => void;
}

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

/** F-146, F-183: Symbole der Kopfleiste kommen aus dem Symbolsatz (workspace/icons.ts). */
const DistributeIcon = <Icon name="distribute" />;
const BackIcon = <Icon name="back" />;
const GearIcon = <Icon name="settings" size={18} />;

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

/** F-160: Ansagen rund um gesammelte Desks. */
const DESK_KEYS = 'Wechseln mit ⇄ oder Alt/⌥+K.';
const DESK_NONE_HERE = 'Kein weiterer Desk hier gesammelt. Desks mit eigenem Fenster erreichst du über ⇄.';
const DESK_ALONE = 'Es gibt nur diesen Desk. + NewDesk legt einen weiteren an.';
const POPUP_BLOCKED = 'Der Browser hat den Desk blockiert – bitte Pop-ups für E-Sources erlauben. Bis dahin ist er gesammelt: ⇄ oder Alt/⌥+K zeigt ihn hier, im Cockpit holt „Eigenes Fenster“ ihn erneut.';

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
        title={DIALOG_TEXT.renameHint}
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

/** F-160: Was die Hülle einem Desk mitgibt; beim Wechsel wird der Desk frisch aufgebaut (key = Desk-Id). */
interface DeskProps {
  ws: Workspace;
  dispatch: (a: Action) => void;
  /** Desk, den dieses Browserfenster zeigt ('' = Main Desk). */
  win: string;
  /** true, wenn dieses Fenster schon einen anderen Desk gezeigt hat (dann keine Begrüßung). */
  switched: boolean;
  /** Ansage nach dem Wechsel. */
  said: string;
  /** Anderen Desk in diesem Browserfenster zeigen, ohne die Seite neu zu laden. */
  onSwitch: (win: string, said?: string, focus?: string) => void;
  /** F-193: Portal, das nach dem Wechsel nach vorn kommt. */
  focus?: string;
  /** Desk wurde in einem anderen Fenster gesammelt: dieses Fenster gibt ihn ab. */
  onPark: () => void;
  /** F-189 Stufe 2: per „An E-Sources senden“ mitgebrachte Seite (E-Sources war nicht offen). */
  sent?: string;
}

function DeskApp(props: DeskProps) {
  const { ws, dispatch, win } = props;
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
  // F-161: jedes Fenster zeigt die Farben seines Desks; ein Desk ohne eigene folgt dem Main Desk
  const look = lookOf(ws, win);
  const shownTheme = resolveTheme(look.theme, systemDark);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = shownTheme;
    root.style.setProperty('--accent-rgb', rgbOf(shownAccent(look.accent, shownTheme)).join(', '));
  }, [shownTheme, look.accent]);
  const lookWarning = (() => {
    const w = contrastWarning(look.accent, shownTheme);
    // F-178: im Terminal sagen, dass ersatzweise Terminal-Grün leuchtet
    return w && shownTheme === 'terminal' ? `${w} Deshalb leuchtet die Schrift gerade in Terminal-Grün.` : w;
  })();
  const [active, setActive] = useState<string | null>(mine[0]?.id ?? null);
  const [mode, setMode] = useState<Mode>({ kind: 'area' });
  const [swapFrom, setSwapFrom] = useState<string | null>(null);
  /** F-28: Übersicht aller Panels (ausgeklappte Kopfleiste) und ihr Abstand von oben. */
  const [overview, setOverview] = useState(false);
  /** F-164: Cockpit gleich mit der Regelübersicht öffnen (aus Hilfe und Suche). */
  const [overviewRules, setOverviewRules] = useState(false);
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
  }, [design]);
  /** F-36: gewählte Lesezeichen-Datei → Dialog „Lesezeichen importieren“ */
  const [bmImport, setBmImport] = useState<{ name: string; list: BrowserBookmark[] } | null>(null);
  /** F-181: Import-Tour beim ersten Import-Dialog (ohne die Schritte, die vorher schon liefen); Dialog zu → Tour endet mit. */
  const importOpen = !!bmImport;
  useEffect(() => {
    if (!importOpen) {
      setTour((t) => (t === 'import' ? null : t));
      return;
    }
    // Tour von vorher (ohne Dialog) ist mit „Datei wählen“ schon beendet
    setTour((t) => (t === 'import' ? null : t));
    if (PROBE || !tourAutoStart('import')) return;
    const t = window.setTimeout(() => setTour((x) => x ?? 'import', true), 300);
    return () => window.clearTimeout(t);
  }, [importOpen]);
  const startDesignTour = () => {
    setDesign(true);
    window.setTimeout(() => setTour('design'), design ? 0 : 150);
  };
  // F-183 Stufe 2: Kompakt und Webseiten-Symbole (gelten für diesen Browser)
  const display = useDisplay();
  const switchCompact = () => {
    setCompact(!display.compact);
    notify(display.compact ? DISPLAY_TEXT.compactOff : DISPLAY_TEXT.compactOn);
  };
  const switchFavicons = () => {
    setFavicons(!display.favicons);
    notify(display.favicons ? DISPLAY_TEXT.faviconsOff : DISPLAY_TEXT.faviconsOn);
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
  /** F-162: Knopf im Hinweis (z. B. „Farbe wählen …“ nach dem Anlegen), gilt nur für diesen Hinweis. */
  const [flashAction, setFlashAction] = useState<{ text: string; actions: FlashAction[] } | null>(null);
  /** F-162: Dialog „Farben“ für dieses Portal (Id). */
  const [colorsFor, setColorsFor] = useState<string | null>(null);
  // F-163: Dialog „Farben“ aus der Frage nach der Kategorie – Fokus auf die Wahl der Kategorie
  const [colorsCat, setColorsCat] = useState(false);
  /** F-162: Stand vor „Alle auf Desk-Farben zurücksetzen“, solange der Design-Dialog offen ist. */
  /** F-24: Dialog „Zuletzt geschlossen“. */
  const [closedOpen, setClosedOpen] = useState(false);
  /** F-51: Dialog „Layouts“ dieses Desks. */
  /** F-187: Cockpit im Modus „Layouts“ öffnen (Zahnrad › „Layouts …“, Hilfe, Suche). */
  const [overviewLayouts, setOverviewLayouts] = useState(false);
  const [layoutUndo, setLayoutUndo] = useState<DeletedLayout | null>(null);
  const [resetUndo, setResetUndo] = useState<{ old: LayoutContent; name: string } | null>(null);
  /** F-29 Rest: Dialog „Fokusanzeige anpassen“. */
  const [ruleOpen, setRuleOpen] = useState(false);
  /** F-179: Dialog „Profil“ und Begrüßung beim Start (nicht beim allerersten Start – da läuft die Tour –, nicht in Zusatz-Desks). */
  const [profileOpen, setProfileOpen] = useState(false);
  /** F-116: Dialog „Spaces und Cases“ (aus Hilfe und Suche; im Cockpit öffnet ihn der Layout-Modus selbst) */
  const [casesOpen, setCasesOpen] = useState(false);
  /** F-169 Stufe 2: Dialog „Abgleich zwischen Geräten“ */
  const [syncOpen, setSyncOpen] = useState(false);
  /** V59: Tour „Abgleich einrichten“ (F-169 f) läuft im Dialog; beim ersten Öffnen von selbst, Dialog zu → Tour endet mit. */
  useEffect(() => {
    if (!syncOpen) {
      setTour((t) => (t === 'sync' ? null : t));
      return;
    }
    if (PROBE || !tourAutoStart('sync')) return;
    const t = window.setTimeout(() => setTour((x) => x ?? 'sync', true), 300);
    return () => window.clearTimeout(t);
  }, [syncOpen]);
  const gist = useGistState();
  const gistSeen = useRef(gist.at);
  useEffect(() => {
    if (gist.at === gistSeen.current) return;
    gistSeen.current = gist.at;
    if (gist.last !== 'pulled') return;
    // NF-03: Ansage über den Hinweis unten; wurden Änderungen hier ersetzt, mit „Rückgängig“
    if (gist.undo)
      notify(SYNC_TEXT.pulledOver, 12000, false, { label: SYNC_TEXT.undo, run: () => notify(restoreBackup(dispatch) ? SYNC_TEXT.undone : SYNC_TEXT.undoGone) });
    else notify(SYNC_TEXT.pulled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gist.at, gist.last]);
  const [greetOn, setGreetOn] = useState(() => !win && !props.switched && !tourAutoStart('start') && profileOf(ws).greet);
  /** Zuletzt offenes Portal – beim Start gelesen, bevor das aktuelle es überschreibt. */
  const [lastAtStart] = useState(() => loadLast(win ?? ''));
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
  // F-168: neue Version im Hintergrund erkennen (nicht in eingebetteten E-Sources). Zum Ausprobieren:
  // ?test=voll&version=alt tut so, als liefe eine ältere Version.
  const update = useUpdateCheck(PROBE && new URLSearchParams(window.location.search).get('version') === 'alt' ? 'alt' : __BUILD_ID__, window.self === window.top);
  useEffect(() => {
    if (update.found) sayLive('Neue Version von E-Sources verfügbar. „Neu laden“ steht im Hinweis unten links.');
  }, [update.found]);
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
  /** F-52: Rückfrage mit zwei Knöpfen; danach kehrt der Fokus zum Auslöser zurück (NF-03). */
  const [ask, setAsk] = useState<{ text: string; yes: string; run: () => void } | null>(null);
  const askBack = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (ask) askBack.current = (document.activeElement as HTMLElement | null) ?? null;
  }, [ask]);
  const closeAsk = (run?: () => void) => {
    setAsk(null);
    run?.();
    window.setTimeout(() => {
      const back = askBack.current;
      (back?.isConnected && back !== document.body ? back : (document.querySelector<HTMLElement>('button[aria-label^="Neuen Slot anlegen"], .tb-newslot') ?? document.querySelector<HTMLElement>('button[aria-label="Einstellungen"]')))?.focus();
    });
  };
  /** F-52: auf die empfohlene Zahl Slots zurück, mit Rückgängig. */
  const fitBack = () => {
    const before = view.arrangement;
    dispatch({ type: 'fitSlots', setup });
    setMode({ kind: 'area' });
    notify(DESK_LAYOUT_TEXT.fitDone(rec), 10000, false, before ? { label: DESK_LAYOUT_TEXT.undo, run: () => { dispatch({ type: 'setArrangement', setup, arr: before }); notify(DESK_LAYOUT_TEXT.fitUndone); } } : undefined);
  };
  /** F-114: Hinweis an einem Portal (statt Dialog über der Fläche). */
  const [hint, setHint] = useState<{ id: string; text: string } | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  // F-36: Lesezeichen-Datei aus dem Browser
  const bookmarkFileRef = useRef<HTMLInputElement>(null);
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
  // F-52: mit Nachfrage bis doppelt so viele Slots wie empfohlen
  const rec = screenClass(cls).capacity;
  const setup = useMemo(() => ({ ...setupFor(ws, cls, orientation, win), capacity: rec * 2 }), [ws.lines, cls, orientation, win, rec]); // eslint-disable-line react-hooks/exhaustive-deps
  const view = useMemo(() => viewOf(ws, setup), [ws, setup]); // eslint-disable-line react-hooks/exhaustive-deps
  /** F-27: offene Fenster; ein anderes Fenster kann hier ein Panel nach vorn holen lassen. */
  const windows = useOpenWindows(win, (id) => {
    if (!mine.some((x) => x.id === id)) return;
    dispatch({ type: 'stackFront', setup, id });
    setActive(id);
    setMode((m) => (m.kind === 'max' && m.id !== id ? { kind: 'max', id } : m));
  }, () => {
    // F-160: Ein anderes Fenster sammelt alle Desks. Selbst geöffnete Fenster schließen sich;
    // sonst gibt dieses Fenster den Desk ab und zeigt nur noch einen Hinweis.
    window.close();
    window.setTimeout(props.onPark, 150);
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
  // F-52: ohne Grenzen gilt nur die feste Untergrenze je Portal
  const min: T.Min = view.slots.length > rec
    ? { w: Math.min(PORTAL_MIN_PX.w / iw, 0.5), h: Math.min(PORTAL_MIN_PX.h / ih, 0.5) }
    : { w: Math.min(MIN_W_PX / iw, slot.w * 0.9), h: Math.min(MIN_H_PX / ih, slot.h * 0.9) };
  const px = (r: T.FRect) => ({ left: GAP + r.x * iw, top: GAP + r.y * ih, width: Math.max(0, r.w * iw - GAP), height: Math.max(0, r.h * ih - GAP) });

  // Lange Hinweise bleiben länger stehen (etwa Lesetempo).
  // F-196: Zeitgeber des Hinweises – hält an, solange Maus oder Fokus darauf liegen, und läuft danach neu
  const flashTimer = useRef({ id: 0, text: '', ms: 0 });
  const flashRun = useCallback((text: string, ms: number) => {
    window.clearTimeout(flashTimer.current.id);
    flashTimer.current = { id: window.setTimeout(() => setFlash((f) => (f === text ? null : f)), ms), text, ms };
  }, []);
  const notify = useCallback((text: string, ms = Math.max(3000, text.length * 50), undo = false, action?: FlashAction | FlashAction[]) => {
    setFlash(text);
    setUndoFor(undo ? text : null);
    const actions = action ? (Array.isArray(action) ? action : [action]) : [];
    setFlashAction(actions.length ? { text, actions } : null);
    flashRun(text, ms);
  }, [flashRun]);
  // V50: Hinweise aus Bauteilen ohne eigenen Draht nach oben (Library, Cockpit) – workspace/flash.ts
  useEffect(() => {
    const on = (e: Event) => {
      const r = (e as CustomEvent<FlashRequest>).detail;
      if (r?.text) notify(r.text, r.ms, false, r.action);
    };
    window.addEventListener(FLASH_EVENT, on);
    return () => window.removeEventListener(FLASH_EVENT, on);
  }, [notify]);
  // F-203: Touren aus Bauteilen starten (z. B. Knopf „Tour“ in Library und Cockpit „Sources“)
  useEffect(() => {
    const on = (e: Event) => {
      const id = (e as CustomEvent<TourId>).detail;
      // V54: Tour „Entwickler-Modus“ (Angebot aus der Leiste beim ersten Einschalten)
      if (id === 'dev') {
        window.setTimeout(() => setTour('dev'), 0);
        return;
      }
      if (id !== 'sources') return;
      setOverview(false);
      window.setTimeout(() => setTour('sources'), 0);
    };
    window.addEventListener(TOUR_EVENT, on);
    return () => window.removeEventListener(TOUR_EVENT, on);
  }, []);

  // F-162: Nach dem Anlegen bietet der Hinweis die Farbwahl an; das neueste Portal steht hinten in der Liste.
  const wsNow = useRef(ws);
  wsNow.current = ws;
  const offerColors = (text: string, id?: string) =>
    !ruleOn(wsNow.current, 'offer') ? notify(text) : notify(text, 8000, false, { label: TINT_TEXT.offer, run: () => setColorsFor(id ?? wsNow.current.panels[wsNow.current.panels.length - 1]?.id ?? null) });
  /**
   * F-163: Bekommt ein Portal dieses Desks eine Adresse und hat noch keine Kategorie, fragt der Hinweis
   * nach ihr (Vorschlag aus Source, gemerkter Domain, Library oder bekannter Seite). Je Portal und Domain
   * einmal; Portale, die beim Start schon eine Adresse haben, fragen erst bei einer neuen Domain.
   */
  const askedCat = useRef<Map<string, string> | null>(null);
  useEffect(() => {
    const here = ws.panels.filter((p) => (p.win ?? '') === (win ?? ''));
    if (!askedCat.current) {
      askedCat.current = new Map(here.map((p) => [p.id, domainOf(activeTab(p).url ?? '')]));
      return;
    }
    for (const p of here) {
      const url = activeTab(p).url;
      // F-164: Regel „Nach der Kategorie fragen“ ausgeschaltet → nicht fragen (gemerkt wird trotzdem, damit kein Schwall nach dem Einschalten kommt)
      if (p.category !== undefined || !url) continue;
      if (!ruleOn(ws, 'ask')) {
        askedCat.current.set(p.id, domainOf(url));
        continue;
      }
      const site = domainOf(url);
      if (askedCat.current.get(p.id) === site) continue;
      askedCat.current.set(p.id, site);
      const sug = suggestCategory(ws, url);
      const set = (id: string, name: string | null) => {
        dispatch({ type: 'panelCategory', id: p.id, category: id, url });
        notify(CATEGORY_TEXT.done(p.name, name));
      };
      const other = { label: sug ? CATEGORY_TEXT.other : CATEGORY_TEXT.choose, run: () => (setColorsCat(true), setColorsFor(p.id)) };
      const none = { label: CATEGORY_TEXT.keepNone, run: () => set('', null) };
      if (!sug) notify(CATEGORY_TEXT.ask(p.name, site, null), HINT_SHORT, false, [other, none]);
      else if (sug.id === '') notify(CATEGORY_TEXT.askNone(p.name, site), HINT_SHORT, false, [none, other]);
      else {
        const take = {
          label: CATEGORY_TEXT.take(sug.name),
          run: () => {
            if (sug.id) return set(sug.id, sug.name);
            dispatch({ type: 'panelNewCategory', id: p.id, name: sug.name, catId: newId(), url });
            notify(CATEGORY_TEXT.done(p.name, sug.name));
          },
        };
        notify(CATEGORY_TEXT.ask(p.name, site, sug.name), HINT_SHORT, false, [take, other, none]);
      }
      break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws.panels]);
  const newSlot = (side: 'right' | 'bottom') => {
    // F-52: ab der Empfehlung erst nachfragen; dann gleich verteilen – und nur, wenn jedes Portal
    // danach mindestens 240 × 160 Pixel groß bleibt.
    if (view.slots.length + 1 > rec) {
      const n = view.slots.length;
      if (n >= rec * 2) return notify(DESK_LAYOUT_TEXT.fullSlots(rec * 2), 6000);
      const even = distributeIn(addAreaTo(ws, setup, side), setup);
      const fits = [...T.rects(viewOf(even, setup).tree).values()].every((r) => r.w * iw - GAP >= PORTAL_MIN_PX.w && r.h * ih - GAP >= PORTAL_MIN_PX.h);
      if (!fits) return notify(DESK_LAYOUT_TEXT.noRoom(side === 'right' ? 'rechts' : 'unten'), 8000);
      return setAsk({
        text: DESK_LAYOUT_TEXT.askMore(n, rec, rec * 2),
        yes: DESK_LAYOUT_TEXT.more,
        run: () => {
          dispatch({ type: 'addArea', setup, side });
          dispatch({ type: 'distribute', setup });
          notify(DESK_LAYOUT_TEXT.small(n + 1, rec), 8000);
        },
      });
    }
    dispatch({ type: 'addArea', setup, side });
    offerColors(side === 'right' ? 'Neuer Slot rechts angelegt.' : 'Neuer Slot unten angelegt.');
  };

  // F-36: Lesezeichen aus Chrome, Safari, Firefox, Edge (HTML-Datei) übernehmen und die Library so ausgeben.
  const exportBookmarks = async () => {
    if (!ws.bookmarks.length) return notify('Die Library ist noch leer – es gibt nichts zu exportieren.');
    // F-197: „Öffnen in“ mit Symbol gleich mit in die Datei – wer die Library im Browser importiert, hat es dabei
    const icon = await sendIconPng();
    const blob = new Blob([bookmarkFileOf(ws, new Date(), { href: sendCode, title: BOOKMARK_NAME, icon })], { type: 'text/html' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = BOOKMARKS_FILE_NAME;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
    const text = SEND_TEXT.exported(ws.bookmarks.length, BOOKMARKS_FILE_NAME);
    notify(text);
    sayLive(text);
  };
  const chooseBookmarkFile = async (input: HTMLInputElement) => {
    const chosen = input.files?.[0];
    input.value = '';
    if (!chosen) return;
    const html = await chosen.text();
    if (!looksLikeBookmarkFile(html)) {
      setNotice(`„${chosen.name}“ ist keine Lesezeichen-Datei. Im Browser die Lesezeichen als HTML-Datei speichern (${browserExportLine()}) und diese Datei hier wählen. Die Tour „Import“ (Suche oder Hilfe) zeigt es Schritt für Schritt.`);
      return;
    }
    const list = parseBookmarkFile(html);
    if (!list.length) return setNotice(`In „${chosen.name}“ stehen keine Lesezeichen.`);
    setBmImport({ name: chosen.name, list });
  };
  /**
   * F-181: Beim ersten Import zeigt die Tour „Import“ vorher, wie man die Datei im Browser speichert
   * (Teil 1, ohne „gesehen“ – der Rest folgt im Dialog). Nur einmal je Sitzung, nicht in der Testbelegung.
   */
  const [importPre, setImportPre] = useState(false);
  const importBookmarks = () => {
    if (!PROBE && !importPre && tourAutoStart('import')) {
      setImportPre(true);
      return setTour('import', true);
    }
    bookmarkFileRef.current?.click();
  };
  const startImportTour = () => {
    if (!bmImport) setImportPre(true);
    setTour('import');
  };

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
    offerColors(TINT_TEXT.added(`Portal „${added.name}“`), added.id);
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

  // ---------------------------------------------------------------- F-171 Stufe 2 Tour „Farben“

  /** Tour „Farben“ beim ersten Öffnen des Dialogs (nicht aus der Frage nach der Kategorie – da soll man gleich wählen); Dialog zu → Tour endet mit. */
  const colorsOpen = !!colorsFor;
  useEffect(() => {
    if (!colorsOpen) {
      setTour((t) => (t === 'colors' ? null : t));
      return;
    }
    if (PROBE || tour || colorsCat || !tourAutoStart('colors')) return;
    const t = window.setTimeout(() => setTour((x) => x ?? 'colors', true), 300);
    return () => window.clearTimeout(t);
  }, [colorsOpen]);
  /** Tour „Farben“ von Hand: Dialog für das aktive Portal öffnen (auch aus der Design-Tour heraus). */
  const startColorsTour = () => {
    const id = colorsFor ?? currentPanel();
    if (!id) return notify('Für die Tour „Farben“ braucht es ein offenes Portal – lege zuerst eines an.');
    setDesign(false);
    setColorsCat(false);
    setColorsFor(id);
    window.setTimeout(() => setTour('colors'), colorsFor ? 0 : 200);
  };
  /** Letzter Schritt der Tour „Farben“: Dialog zu, Cockpit mit der Regelübersicht auf. */
  const showRulesFromTour = () => {
    setColorsFor(null);
    setColorsCat(false);
    window.setTimeout(() => {
      setOverviewRules(true);
      setOverviewTop((toolbarRef.current?.getBoundingClientRect().bottom ?? 60) + 6);
      setOverview(true);
    }, 60);
  };

  // ---------------------------------------------------------------- F-51/F-187 Layouts (Cockpit-Modus)
  const openLayouts = () => {
    setOverviewRules(false);
    setOverviewLayouts(true);
    setOverviewTop((toolbarRef.current?.getBoundingClientRect().bottom ?? 60) + 6);
    setOverview(true);
  };
  const here = win ?? '';
  /** F-116: Case aus der Suche wählen – ein Layout = wechseln, mehrere = Layout-Modus des Cockpits zeigt das Angebot. */
  const pickCaseHere = (caseId: string) => {
    const res = pickCase(ws, here, caseId);
    const c = ws.scenarios.find((x) => x.id === caseId);
    dispatch({ type: 'casePick', win: here, caseId });
    if (!c) return;
    if (res.switched) {
      setMode({ kind: 'area' });
      return notify(CASE_TEXT.switched(c.name, res.switched.name));
    }
    if (res.offer.length > 1) {
      notify(CASE_TEXT.offer(c.name, res.offer.length));
      return openLayouts();
    }
    notify(CASE_TEXT.noLayouts(c.name));
  };
  const layoutOps: LayoutOps = {
    evenCount: screenClass(setup.cls).capacity,
    onPickCase: (caseId) => {
      const res = pickCase(ws, here, caseId);
      dispatch({ type: 'casePick', win: here, caseId });
      if (res.switched) setMode({ kind: 'area' });
      return res;
    },
    onSwitch: (id) => {
      dispatch({ type: 'layoutSwitch', win: here, id });
      setMode({ kind: 'area' });
      notify(DESK_LAYOUT_TEXT.switched(layoutsOf(ws, here).list.find((l) => l.id === id)?.name ?? ''));
    },
    onAdd: (from, name) => {
      const before = new Set(layoutsOf(ws, here).list.map((l) => l.id));
      dispatch({ type: 'layoutAdd', win: here, setup, from, name });
      setMode({ kind: 'area' });
      window.setTimeout(() => {
        const made = layoutsOf(wsNow.current, here).list.find((l) => !before.has(l.id));
        if (made) notify(DESK_LAYOUT_TEXT.added(made.name));
      });
    },
    onRename: (id, name) => {
      dispatch({ type: 'layoutRename', win: here, id, name });
      notify(DESK_LAYOUT_TEXT.renamed(name.trim()));
    },
    onCopy: (id) => {
      const before = new Set(layoutsOf(ws, here).list.map((l) => l.id));
      dispatch({ type: 'layoutCopy', win: here, id });
      window.setTimeout(() => {
        const made = layoutsOf(wsNow.current, here).list.find((l) => !before.has(l.id));
        if (made) notify(DESK_LAYOUT_TEXT.copied(made.name));
      });
    },
    onDelete: (id) => {
      const { deleted } = deleteLayout(wsNow.current, here, id);
      if (!deleted) return notify(DESK_LAYOUT_TEXT.last);
      dispatch({ type: 'layoutDelete', win: here, id });
      setLayoutUndo(deleted);
    },
    undoName: layoutUndo?.layout.name ?? null,
    onUndo: () => {
      if (!layoutUndo) return;
      dispatch({ type: 'layoutRestore', deleted: layoutUndo });
      notify(DESK_LAYOUT_TEXT.undone(layoutUndo.layout.name));
      setLayoutUndo(null);
    },
    standard: display.standard && findLayout(ws, display.standard.win, display.standard.id) ? display.standard : null,
    onStandard: (id) => {
      setStandardRef(id ? { win: here, id } : null);
      notify(id ? DESK_LAYOUT_TEXT.standardSet(layoutsOf(ws, here).list.find((l) => l.id === id)?.name ?? '') : DESK_LAYOUT_TEXT.standardEvenSet);
    },
    // F-191: „Zurücksetzen“ im Dialog „Standard-Layout“ – Verweis beim Öffnen wieder setzen (ohne Hinweis)
    onStandardRef: (ref) => setStandardRef(ref),
    onReset: () => {
      const std = standardContent(ws, display.standard, setup);
      const name = activeLayout(ws, here).name;
      const { undo } = resetToStandard(ws, here, std);
      dispatch({ type: 'layoutReset', win: here, std });
      setMode({ kind: 'area' });
      setResetUndo({ old: undo, name });
      notify(DESK_LAYOUT_TEXT.resetDone(name, std.name));
    },
    resetUndoName: resetUndo?.name ?? null,
    onResetUndo: () => {
      if (!resetUndo) return;
      dispatch({ type: 'layoutUnreset', win: here, old: resetUndo.old });
      notify(DESK_LAYOUT_TEXT.resetUndone(resetUndo.name));
      setResetUndo(null);
    },
  };

  // ---------------------------------------------------------------- F-24 Zuletzt geschlossen

  /** Portal schließen; mit Seite wird es gemerkt und der Hinweis bietet „Wiederherstellen“. */
  const closePortal = (id: string) => {
    const p = ws.panels.find((x) => x.id === id);
    if (!p) return;
    const here = (p.win ?? '') === (win ?? '');
    const target = here ? setup : (setupOfWindow(ws, p.win ?? '') ?? setup);
    dispatch({ type: 'remove', id, setup: target });
    if (here && p.tabs.some((t) => t.url)) notify(`Portal „${p.name}“ geschlossen.`, HINT_SHORT, true);
  };
  /** Tab schließen; mit Seite wird er gemerkt. */
  const closeTabOf = (id: string, tabId: string) => {
    const t = ws.panels.find((x) => x.id === id)?.tabs.find((x) => x.id === tabId);
    dispatch({ type: 'closeTab', id, tab: tabId });
    if (t?.url) notify(`Tab ${tabLabel(t)} geschlossen.`, HINT_SHORT, true);
  };
  /** F-170: Slotmaschine offen? */
  const [jackpot, setJackpot] = useState(false);

  // ---------------------------------------------------------------- F-189 Web-Suche und Links von außen
  /** Ein Link wird von außen über E-Sources gezogen (Ablageflächen an den Portalen). */
  const [linkDrag, setLinkDrag] = useState(false);
  /** Nach einer Web-Suche: E-Sources ist im Hintergrund – eingebettete Seiten lassen Gezogenes durch. */
  const [away, setAway] = useState(false);
  const searched = useRef(false);
  useEffect(() => {
    let inner = false;
    const start = () => (inner = true);
    const end = () => (inner = false);
    const enter = (e: DragEvent) => {
      if (inner || !e.dataTransfer) return;
      if ([...e.dataTransfer.types].some((t) => t === 'text/uri-list' || t === 'text/plain')) setLinkDrag(true);
    };
    const leave = (e: DragEvent) => {
      if (e.relatedTarget === null && (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight)) setLinkDrag(false);
    };
    const drop = () => window.setTimeout(() => setLinkDrag(false));
    const blur = () => window.setTimeout(() => setAway(searched.current && !document.hasFocus()), 50);
    const focus = () => setAway(false);
    window.addEventListener('dragstart', start, true);
    window.addEventListener('dragend', end, true);
    window.addEventListener('dragenter', enter, true);
    window.addEventListener('dragleave', leave, true);
    window.addEventListener('drop', drop, true);
    window.addEventListener('blur', blur);
    window.addEventListener('focus', focus);
    return () => {
      window.removeEventListener('dragstart', start, true);
      window.removeEventListener('dragend', end, true);
      window.removeEventListener('dragenter', enter, true);
      window.removeEventListener('dragleave', leave, true);
      window.removeEventListener('drop', drop, true);
      window.removeEventListener('blur', blur);
      window.removeEventListener('focus', focus);
    };
  }, []);
  useEffect(() => {
    document.body.classList.toggle('is-linkdrop', linkDrag || away);
  }, [linkDrag, away]);
  // ---------------------------------------------------------------- F-189 Stufe 2 „An E-Sources senden“

  /** Gesendete Seite ins aktive Portal (wie ein Treffer der Suche). */
  const takeSent = (url: string, panel?: string | null) => {
    const host = hostOf(url);
    if (isBlocked(ws, url)) {
      const text = SEND_TEXT.blocked(host);
      notify(text);
      return sayLive(text);
    }
    const id = panel === null ? null : panel && mine.some((x) => x.id === panel) ? panel : currentPanel();
    if (!id) {
      // Kein Portal offen oder „Neuer Slot“ gewählt: neuen Slot mit der Seite anlegen.
      if (!canAddArea(ws, setup)) return notify(SEND_TEXT.noRoom);
      dispatch({ type: 'sendNewSlot', setup, url });
      const text = SEND_TEXT.newSlot(host);
      notify(text);
      return sayLive(text);
    }
    const name = ws.panels.find((x) => x.id === id)?.name ?? '';
    const r = openBookmark(ws, id, url).result;
    if (r === 'full') return notify(SEND_TEXT.full(name, TAB_MAX));
    dispatch({ type: 'stackFront', setup, id });
    dispatch({ type: 'openBookmark', panel: id, url });
    rememberUrl(url);
    setActive(id);
    if (mode.kind === 'max' && mode.id !== id) setMode({ kind: 'max', id });
    const text = r === 'here' ? SEND_TEXT.here(host, name) : r === 'tab' ? SEND_TEXT.tab(host, name) : SEND_TEXT.switched(host, name);
    notify(text);
    sayLive(text);
  };
  useSendReceiver(
    win,
    () => {
      const cur = currentPanel();
      const targets = view.slots.flatMap((sl, i) => sl.panels.map((p) => ({ id: p.id, name: p.name, slot: areaLabel(ws, sl) || (sl.panels.length < 2 ? p.name : `Slot ${i + 1}`) })));
      return { desk: winLabel, portal: ws.panels.find((x) => x.id === cur)?.name ?? null, active: cur, targets };
    },
    takeSent,
  );
  // E-Sources war nicht offen: Die mitgebrachte Seite einmal beim Start öffnen.
  const sentDone = useRef(false);
  useEffect(() => {
    if (!props.sent || sentDone.current) return;
    sentDone.current = true;
    const url = props.sent;
    window.setTimeout(() => {
      sayLive(SEND_TEXT.alone);
      takeRef.current(url);
    }, 300);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const takeRef = useRef(takeSent);
  takeRef.current = takeSent;
  /** Code des Lesezeichens für diese Anwendung (im Testmodus mit test=…). */
  const sendCode = bookmarklet(sendBase(window.location.href, PROBE_KIND));
  /** Symbol wie das Favicon, mit grünem Pfeil (public/send-icon.svg), als PNG 32 × 32 (data:-Adresse); leer, wenn es nicht geht. */
  const sendIconPng = async (): Promise<string> => {
    try {
      const img = new Image();
      img.src = '/send-icon.svg';
      await img.decode();
      const c = document.createElement('canvas');
      c.width = c.height = 32;
      c.getContext('2d')!.drawImage(img, 0, 0, 32, 32);
      return c.toDataURL('image/png');
    } catch {
      return '';
    }
  };
  /** Lesezeichen mit eigenem Symbol (Logo mit Pfeil) als Datei zum Importieren. */
  const downloadSendBookmark = async (inTour = false) => {
    const icon = await sendIconPng();
    const blob = new Blob([bookmarkFile(sendCode, icon)], { type: 'text/html' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = BOOKMARK_FILE;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
    // F-197: in der Tour nur kurz (die nächsten Schritte stehen dort)
    const done = inTour ? SEND_TEXT.fileSaved : SEND_TEXT.fileDone;
    notify(done, inTour ? 6000 : 15000);
    sayLive(done);
  };
  const copySendCode = () => {
    const ok = () => {
      notify(SEND_TEXT.copied, 12000);
      sayLive(SEND_TEXT.copied);
    };
    const fail = () => notify(SEND_TEXT.copyFailed);
    if (!navigator.clipboard) return fail();
    navigator.clipboard.writeText(sendCode).then(ok, fail);
  };
  /** F-197: Aktionen der Tour „Öffnen in einrichten“ (Tour bleibt offen) bzw. Wechsel aus der Tour „Import“. */
  const sendTourAction = (id: string) => {
    if (id === 'file') return void downloadSendBookmark(true);
    if (id === 'manager') {
      const address = browserOf(currentUa()) === 'Edge' ? 'edge://favorites' : 'chrome://bookmarks';
      const fail = () => {
        notify(SEND_TEXT.addressFailed(address), 12000);
        sayLive(SEND_TEXT.addressFailed(address));
      };
      if (!navigator.clipboard) return fail();
      navigator.clipboard.writeText(address).then(() => {
        const text = SEND_TEXT.addressCopied(address, modKey(currentUa()));
        notify(text, 12000);
        sayLive(text);
      }, fail);
    }
  };
  const startSendTour = () => window.setTimeout(() => setTour('send'), 0);

  const webSearch = (query: string) => {
    const engine = engineOf(ws);
    searched.current = true;
    openBeside(searchUrl(ws, query));
    const text = WEB_TEXT.opened(engine.name);
    notify(text, 12000);
    sayLive(text);
  };
  /** F-170: Duplikate schließen (nach Bestätigung im Dialog); alles wird gemerkt (Zuletzt geschlossen). */
  const cleanupDuplicates = (c: Cleanup) => {
    for (const t of c.tabs) dispatch({ type: 'closeTab', id: t.panel, tab: t.tab });
    for (const id of c.portals) {
      const p = ws.panels.find((x) => x.id === id);
      if (!p) continue;
      const here = (p.win ?? '') === (win ?? '');
      dispatch({ type: 'remove', id, setup: here ? setup : (setupOfWindow(ws, p.win ?? '') ?? setup) });
    }
  };
  /** F-170 Stufe 2: Slot zusammenlegen (nur Slots dieses Desks). */
  const mergeSlot = (r: RedundantSlot) => dispatch({ type: 'mergeSlot', keep: r.keep, others: r.others, setup });

  /**
   * F-170 Stufe 2: Einladung zur Runde. Wird der Grund neu wahr (Fokus rot, ab 3 Duplikaten, redundanter
   * Slot), zeigt der Hinweis unten „Hebel ziehen“ und „Später“ – höchstens einmal je Stunde (gemeinsam für
   * alle Desk-Fenster), „Später“ pausiert 4 Stunden; nur im Fenster, das gerade den Fokus hat; erst
   * 15 s nach dem Start. Der Hinweis ist role=status und nimmt den Tastaturfokus nicht weg (NF-03).
   */
  const inviteWas = useRef<InviteWhy | null>(null);
  const memPause = useRef(0);
  const [inviteReady, setInviteReady] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setInviteReady(true), 15000);
    return () => window.clearTimeout(t);
  }, []);
  const pauseUntil = (): number => {
    if (PROBE) return memPause.current;
    try {
      return Number(localStorage.getItem(INVITE_KEY)) || 0;
    } catch {
      return memPause.current;
    }
  };
  const pauseFor = (ms: number) => {
    memPause.current = Date.now() + ms;
    if (PROBE) return;
    try {
      localStorage.setItem(INVITE_KEY, String(memPause.current));
    } catch {
      /* ohne Speicher gilt die Pause nur in diesem Fenster */
    }
  };
  useEffect(() => {
    if (!inviteReady) return;
    const why = ruleOn(ws, 'invite') ? inviteWhy(ws, view.slots, focus.color) : null;
    const before = inviteWas.current;
    inviteWas.current = why;
    if (!why || before !== null || jackpot) return;
    if (typeof document.hasFocus === 'function' && !document.hasFocus()) return;
    if (Date.now() < pauseUntil()) return;
    pauseFor(INVITE_PAUSE);
    const text = why === 'dups' ? JACKPOT_TEXT.invite.dups(dupCount(ws)) : JACKPOT_TEXT.invite[why];
    notify(text, 12000, false, [
      { label: JACKPOT_TEXT.lever, run: () => setJackpot(true) },
      {
        label: JACKPOT_TEXT.later,
        run: () => {
          pauseFor(INVITE_LATER);
          notify(JACKPOT_TEXT.laterSaid);
        },
      },
    ]);
  }, [ws, view.slots, focus.color, inviteReady]); // eslint-disable-line react-hooks/exhaustive-deps

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
    rememberUrl(h.bookmark.url);
    setActive(id);
    if (mode.kind === 'max' && mode.id !== id) setMode({ kind: 'max', id });
  };

  // F-179: aktives Portal je Desk merken (nur im Browser, nicht im Testmodus)
  useEffect(() => {
    if (!PROBE && active) saveLast(win ?? '', active);
    // F-193: Verlauf für „Zuletzt benutzt“
    if (active) {
      const r = loadRecent(!PROBE);
      saveRecent({ ...r, panels: touch(r.panels, active, Date.now()) }, !PROBE);
    }
  }, [active, win]);
  /** F-193: geöffnete Adresse für „Zuletzt benutzt“ merken. */
  const rememberUrl = (url: string) => {
    const r = loadRecent(!PROBE);
    saveRecent({ ...r, urls: touch(r.urls, url, Date.now()) }, !PROBE);
  };
  /** F-193: nach einem Wechsel mit Ziel-Portal dieses nach vorn holen. */
  useEffect(() => {
    if (props.focus && mine.some((x) => x.id === props.focus)) focusPortal(props.focus);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const lastPanel = lastAtStart ? mine.find((x) => x.id === lastAtStart) : undefined;
  const greetLast = lastPanel ? { name: lastPanel.name, source: hostOf(panelUrl(lastPanel) ?? '') } : null;
  // F-205: gewählte Begrüßung; Zufall „bei jedem Öffnen“ würfelt einmal je Start
  const [greetSeed] = useState(Math.random);
  const greetText = welcomeText(profileOf(ws).welcome, new Date(), profileOf(ws).name, greetSeed);
  // Begrüßung höflich ansagen (einmal beim Start)
  useEffect(() => {
    if (greetOn) sayLive(`${greetText}${/[.!?…]$/.test(greetText) ? '' : '.'}${greetLast ? ` Zuletzt offen: ${greetLast.name}. Weitermachen steht in der Begrüßung oben rechts.` : ''}`);
  }, []);
  const closeGreeting = useCallback(() => setGreetOn(false), []);
  const continueLast = () => {
    setGreetOn(false);
    if (lastPanel) focusPortal(lastPanel.id);
  };
  /** Portal dieses Desks nach vorn holen, ansagen und den Fokus in seine Adresszeile setzen. */
  const focusPortal = (id: string) => {
    showPanel(id);
    sayLive(`${ws.panels.find((x) => x.id === id)?.name ?? 'Portal'} ist aktiv.`);
    // Fokus ins Portal (Adresszeile), damit die Tastatur dort weitermacht
    window.setTimeout(() => document.querySelector<HTMLElement>(`main section[data-panel-id="${id}"] input[aria-label="Adresse"]`)?.focus(), 60);
  };
  /** F-193: Portal aus „Zuletzt benutzt“ – hier, im offenen Fenster seines Desks oder Desk hierher holen. */
  const openRecentPortal = (target: string, id: string) => {
    setGreetOn(false);
    if (target === win) return focusPortal(id);
    if (windows.open.has(target)) return showPanel(id);
    props.onSwitch(target, switchSaid(target), id);
  };
  /** F-193: Lesezeichen aus „Zuletzt benutzt“ wie einen Treffer der Suche öffnen. */
  const openRecentSource = (b: Bookmark) => {
    setGreetOn(false);
    openHit({ bookmark: b, panel: null, category: '' });
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
    props.onSwitch(target, switchSaid(target));
  };
  /**
   * F-190: Diesen Desk verlassen, ohne neue Fenster: Zeigt ein anderes Fenster den Main Desk,
   * schließt sich dieses (geht nur bei selbst geöffneten); bleibt es offen oder gibt es keinen
   * Main Desk, zeigt dieses Fenster den Main Desk.
   */
  const leaveDesk = (said: string) => {
    if (!openRef.current.has('')) return props.onSwitch('', said);
    window.close();
    window.setTimeout(() => props.onSwitch('', said), 300);
  };
  // F-190: Gibt es den Desk dieses Fensters nicht mehr, wird es zum Main Desk (bzw. schließt sich,
  // wenn der Main Desk schon in einem anderen Fenster offen ist). Kurz warten, bis sich die offenen
  // Fenster gemeldet haben.
  const gone = deskGone(ws, win);
  useEffect(() => {
    if (!gone) return;
    const t = window.setTimeout(() => leaveDesk(DESK_GONE_TEXT.here), 1500);
    return () => window.clearTimeout(t);
  }, [gone]); // eslint-disable-line react-hooks/exhaustive-deps
  /** F-160: Ansage für den Desk, der gleich hier erscheint (Stelle im Ring nach dem Wechsel). */
  const switchSaid = (target: string) => {
    const ring = deskRing(ws, target, new Set([...windows.open].filter((w) => w !== win)));
    const at = ring.findIndex((d) => d.id === target);
    return deskSaid(windowName(ws, target), at, ring.length, panelsIn(ws.panels, target).length);
  };
  /** F-160: Alt/⌥+K – nächster bzw. voriger gesammelter Desk in diesem Fenster. */
  const stepDeskHere = (dir: 1 | -1) => {
    const next = stepDesk(deskRing(ws, win, windows.open), win, dir);
    if (!next) return sayLive(ws.windows.length ? DESK_NONE_HERE : DESK_ALONE);
    props.onSwitch(next.id, switchSaid(next.id));
  };
  /** F-160: alle Desks in dieses Fenster holen – die anderen Fenster geben ihren Desk ab. */
  const collectHere = () => {
    const others = [...windows.open].filter((w) => w !== win).length;
    if (others === 0) return notify(`Alle Desks sind schon hier gesammelt. ${DESK_KEYS}`);
    quietUntil.current = Date.now() + 4000;
    windows.collect();
    notify(`${others === 1 ? '1 Desk' : `${others} Desks`} hier gesammelt. ${DESK_KEYS}`);
  };
  /** F-160: jeden gesammelten Desk wieder in einem eigenen Browserfenster öffnen (direkt aus dem Klick). */
  const distributeDesks = () => {
    const list = collectedDesks(ws, win, windows.open);
    if (list.length === 0) return notify(ws.windows.length ? 'Alle Desks haben schon ein eigenes Fenster.' : DESK_ALONE);
    const blocked = list.filter((d) => !openAppWindow(d.id));
    if (blocked.length === 0) return notify(`${list.length === 1 ? '1 Desk' : `${list.length} Desks`} auf eigene Fenster verteilt.`);
    const opened = list.length - blocked.length;
    notify(`${opened > 0 ? `${opened} von ${list.length} Desks geöffnet. ` : ''}Der Browser hat ${blocked.map((d) => `„${d.name}“`).join(', ')} blockiert – bitte Pop-ups für E-Sources erlauben und noch einmal verteilen.`, 8000);
  };
  /**
   * F-160: Automatisch sammeln – schließt ein Desk-Fenster, wartet sein Desk im Main Desk. Das
   * Fenster, das den Main Desk zeigt, sagt es an (nicht bei Neuladen: kurz warten, ob es wiederkommt;
   * nicht direkt nach „Desks hier sammeln“; nicht, wenn der Desk dabei aufgelöst wurde).
   */
  const quietUntil = useRef(0);
  const wsRef = useRef(ws);
  wsRef.current = ws;
  const openRef = useRef(windows.open);
  const prevOpen = useRef(windows.open);
  openRef.current = windows.open;
  useEffect(() => {
    const gone = [...prevOpen.current].filter((w) => w !== win && !windows.open.has(w));
    prevOpen.current = windows.open;
    if (win !== '' || gone.length === 0) return;
    const t = window.setTimeout(() => {
      if (Date.now() < quietUntil.current || !ruleOn(wsRef.current, 'collect')) return;
      const names = gone.filter((w) => !openRef.current.has(w) && wsRef.current.windows.some((d) => d.id === w)).map((w) => `„${windowName(wsRef.current, w)}“`);
      if (names.length === 0) return;
      notify(`${names.join(', ')} ${names.length === 1 ? 'ist' : 'sind'} jetzt im ${MAIN_NAME} gesammelt. ${DESK_KEYS}`);
    }, 2000);
    return () => window.clearTimeout(t);
  }, [windows.open]); // eslint-disable-line react-hooks/exhaustive-deps
  /** F-160: nach einem Wechsel ansagen und die Tastatur auf den Desk setzen (Tab des ersten Portals, sonst ⇄). */
  useEffect(() => {
    if (!props.said) return;
    const t = window.setTimeout(() => {
      sayLive(props.said);
      const tab = document.querySelector<HTMLElement>('main .tile:not(.is-back) [role="tab"][aria-selected="true"]');
      (tab ?? document.querySelector<HTMLElement>('.tb-desk-switch button'))?.focus({ preventScroll: true });
    }, 250);
    return () => window.clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  /** F-194: Zoom eines Portals setzen, mit Ansage (NF-03). */
  const zoomPanel = (id: string, z: number) => {
    const meta = ws.panels.find((x) => x.id === id);
    if (!meta) return;
    // F-200 Stufe 2: im Entwickler-Modus kein freier Zoom (Zoom-Test in der Leiste)
    if (meta.dev) return sayLive(DEV_TEXT.noZoom(meta.name));
    const w = frameWidth(id);
    const cur = Math.round(shownZoom(meta, w));
    // F-194 Stufe 2: mit „Breite halten“ ändert Zoomen die gemerkte Seitenbreite, der Modus bleibt an
    if (meta.fit && w > 0) dispatch({ type: 'fitPanel', id, fit: fitFor(w, z) });
    else dispatch({ type: 'zoomPanel', id, zoom: z });
    sayLive(z === cur ? ZOOM_TEXT.edge(meta.name, z) : ZOOM_TEXT.said(meta.name, z));
  };
  /** F-194 Stufe 2: „Breite halten“ ein (Seite behält die Breite, die sie gerade hat) oder aus (Zoom bleibt, wie er gerade ist). */
  const fitPanel = (id: string, on: boolean) => {
    const meta = ws.panels.find((x) => x.id === id);
    const w = frameWidth(id);
    if (!meta || w <= 0) return;
    if (on) {
      const px = fitStart(w, zoomOf(meta));
      dispatch({ type: 'fitPanel', id, fit: px });
      sayLive(ZOOM_TEXT.fitOn(meta.name, px));
    } else {
      const z = shownZoom(meta, w);
      dispatch({ type: 'fitPanel', id, zoom: z });
      sayLive(ZOOM_TEXT.fitOff(meta.name, nearestStep(z)));
    }
  };
  const ZOOM_KEYS: Record<string, 1 | -1 | 0> = { Equal: 1, NumpadAdd: 1, BracketRight: 1, Minus: -1, NumpadSubtract: -1, Slash: -1, Digit0: 0, Numpad0: 0 };

  cycleKeyRef.current = (e: KeyboardEvent) => {
    // F-194: Alt/⌥+Plus/Minus zoomt das aktive Portal, Alt/⌥+0 setzt zurück (Plus/Minus auch auf deutscher Tastatur: + und -)
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.code in ZOOM_KEYS && !document.querySelector('[aria-modal="true"], dialog:modal')) {
      const cur = currentPanel();
      const meta = cur ? ws.panels.find((x) => x.id === cur) : undefined;
      if (!meta) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const dir = ZOOM_KEYS[e.code];
      return zoomPanel(meta.id, dir === 0 ? ZOOM_DEFAULT : zoomStep(Math.round(shownZoom(meta, frameWidth(meta.id))), dir));
    }
    if (!e.altKey || e.ctrlKey || e.metaKey || (e.code !== 'KeyT' && e.code !== 'KeyP' && e.code !== 'KeyZ' && e.code !== 'KeyL' && e.code !== 'KeyK' && e.code !== 'KeyJ')) return;
    // nicht hinter offenen Dialogen (Hilfe, Design, Hinweis, Tour)
    if (document.querySelector('[aria-modal="true"], dialog:modal')) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    // F-24: Alt/⌥+Z holt das zuletzt Geschlossene zurück
    if (e.code === 'KeyZ') return e.repeat ? undefined : restore();
    // F-170: Alt/⌥+J öffnet die Slotmaschine
    if (e.code === 'KeyJ') return e.repeat ? undefined : setJackpot(true);
    // F-160: Alt/⌥+K nächster, mit Umschalt voriger gesammelter Desk
    if (e.code === 'KeyK') return e.repeat ? undefined : stepDeskHere(e.shiftKey ? -1 : 1);
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

  // F-06: Verdecktes (Tabs im Hintergrund, Portale hinten im Stack) lädt erst beim Ansehen und pausiert nach einer Weile.
  const pauseShown: PanelMeta[] =
    mine.length === 0
      ? []
      : mode.kind === 'max'
        ? ws.panels.filter((x) => x.id === mode.id)
        : mode.kind === 'split'
          ? splitSelection(view, active && areaOf(view, active), mode.count).map(shown).filter((m): m is PanelMeta => !!m)
          : shownView.slots.map((s) => s.front);
  // F-202: Sources mit „Nie pausieren“
  /** F-202: Einstellungen öffnen und auf „Verdecktes pausieren“ springen */
  const openPauseSettings = () => {
    const gear = document.querySelector<HTMLButtonElement>('button[aria-label="Einstellungen"]');
    if (!gear) return;
    if (gear.getAttribute('aria-expanded') !== 'true') gear.click();
    window.setTimeout(() => document.getElementById('set-pause')?.focus(), 80);
  };
  const keptSrc = useMemo(() => keptSources(ws), [ws.bookmarks]);
  const { isAwake, asleep, touch: usedNow, pauseNow } = usePause(shownView.slots.flatMap((s) => s.panels), pauseShown, pauseMinutes(ws), shownMinutes(ws), active, keptSrc);
  /** F-06 Stufe 2: Tab geladen? „Nicht pausieren“ (Portal oder Tab) immer; im pausierten Portal sonst nichts. */
  const tabAwake = (meta: PanelMeta, tab: string) => keepTabOf(meta, tab, keptSrc) || (!asleep(meta.id) && isAwake(tabKey(meta.id, tab)));

  const frame = (meta: PanelMeta, onArea?: { slotId: string; rect: T.FRect }) => {
    const slotOfMeta = shownView.slots.find((s) => s.panels.some((m) => m.id === meta.id));
    const inStack = !!slotOfMeta && slotOfMeta.panels.length > 1;
    const full = !slotOfMeta || slotOfMeta.panels.length >= STACK_MAX;
    return (
      <PanelFrame
        panel={meta}
        fx={fx}
        tint={shownTint(meta, slotOfMeta ? slotTint(ws, slotOfMeta) : undefined, categoryTint(ws, meta))}
        onColors={() => setColorsFor(meta.id)}
        onCategory={() => (setColorsCat(true), setColorsFor(meta.id))}
        category={(() => {
          const c = categoryOf(ws, meta);
          return c ? { name: c.name, color: c.tint?.frame ?? c.tint?.accent, icon: categoryIcon(c) } : undefined;
        })()}
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
                paused: (m) => m.id !== slotOfMeta.front.id && !isAwake(m.id, keepTabOf(m, m.activeTab, keptSrc)),
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
        onSelectTab={(tab) => {
          usedNow(meta.id, true);
          dispatch({ type: 'selectTab', id: meta.id, tab });
        }}
        awake={(tab) => tabAwake(meta, tab)}
        asleep={asleep(meta.id)}
        keptBySource={(u) => keptBySource(keptSrc, u)}
        sourceOf={(u) => {
          const b = bookmarkOf(ws, u, meta.id);
          return b ? { id: b.id, keep: !!b.keep } : undefined;
        }}
        onKeepSource={(id, keep) => {
          dispatch({ type: 'keepSources', ids: [id], keep });
          const b = ws.bookmarks.find((x) => x.id === id);
          const text = PAUSE_TEXT.sourceKept(b?.title || hostOf(b?.url ?? ''), keep);
          notify(text);
          sayLive(text);
        }}
        onPauseSettings={openPauseSettings}
        onUse={(wake) => {
          if (wake && asleep(meta.id)) sayLive(PAUSE_TEXT.woke(meta.name));
          usedNow(meta.id, wake);
        }}
        onPauseNow={() => {
          pauseNow(meta.id);
          const text = PAUSE_TEXT.pausedNow(meta.name);
          notify(text);
          sayLive(text);
        }}
        onKeepTab={(id) => {
          const t = meta.tabs.find((x) => x.id === (id ?? meta.activeTab));
          if (!t) return;
          dispatch({ type: 'keepTab', id: meta.id, tab: t.id });
          const label = t.url ? hostOf(t.url) : 'Neuer Tab';
          const text = t.keep ? PAUSE_TEXT.keepTabOff(label) : PAUSE_TEXT.keepTabOn(label);
          notify(text);
          sayLive(text);
        }}
        onSearch={webSearch}
        engineName={engineOf(ws).name}
        linkDrag={linkDrag}
        onOpenNewTab={(url) => {
          if (meta.tabs.length >= TAB_MAX) return notify(`Höchstens ${TAB_MAX} Tabs je Portal – lege den Link lieber in ein anderes Portal.`);
          dispatch({ type: 'addTab', id: meta.id, url });
          setActive(meta.id);
          sayLive(WEB_TEXT.openedNewTab(hostOf(url)));
        }}
        onZoom={meta.dev ? undefined : (z) => zoomPanel(meta.id, z)}
        onFit={(on) => fitPanel(meta.id, on)}
        onKeep={() => {
          dispatch({ type: 'keepPanel', id: meta.id });
          const text = meta.keep ? PAUSE_TEXT.keepOff(meta.name) : PAUSE_TEXT.keepOn(meta.name);
          notify(text);
          sayLive(text);
        }}
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
          if (!known) dispatch({ type: 'saveBookmark', bookmark: { id: newId(), title: '', url, category: NO_CATEGORY, tags: [], panels: [], origin: originOf(ws, 'launcher') } });
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
          rememberUrl(url);
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
    // F-52: neuer Desk startet mit dem Standard-Layout dieses Geräts
    dispatch({ type: 'addDesk', win: dest, std: standardContent(ws, display.standard, setup) });
    // F-160: Blockiert der Browser das Fenster, erscheint der neue Desk hier (der alte bleibt gesammelt).
    if (!openAppWindow(dest)) return props.onSwitch(dest, `„${name}“ angelegt und hier gezeigt – der Browser hat das neue Fenster blockiert. ${DESK_KEYS}`);
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
        setOverviewRules(false);
        return toggleOverview();
      case 'rules':
        setOverviewRules(true);
        setOverviewTop((toolbarRef.current?.getBoundingClientRect().bottom ?? 60) + 6);
        return setOverview(true);
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
        if (!canAddArea(ws, setup)) return notify(`Der Bildschirm ist voll (${view.slots.length}/${view.spec.max ?? view.spec.capacity} Slots). Weitere Portale legst du über das Plus in der Kopfleiste eines Portals auf seinen Slot.`, 5000);
        return newSlot('right');
      case 'newDesk':
        return addNewDesk();
      case 'nextDesk':
        return stepDeskHere(1);
      case 'collectDesks':
        return collectHere();
      case 'distributeDesks':
        return distributeDesks();
      case 'tour':
        return setTour('start');
      case 'tourCockpit':
        return startCockpitTour();
      case 'design':
        return setDesign(true);
      case 'tourDesign':
        return startDesignTour();
      case 'jackpot':
        setOverview(false);
        return setJackpot(true);
      case 'tourColors':
        return startColorsTour();
      case 'tourImport':
        return startImportTour();
      case 'tourSend':
        return startSendTour();
      case 'tourSources':
        setOverview(false);
        return window.setTimeout(() => setTour('sources'), 0);
      case 'toursAuto':
        return switchAutoTours();
      case 'compact':
        return switchCompact();
      case 'favicons':
        return switchFavicons();
      case 'restore':
        return restore();
      case 'closed':
        return setClosedOpen(true);
      case 'layouts':
        return openLayouts();
      case 'cases':
        setOverview(false);
        return setCasesOpen(true);
      case 'limits':
        return view.slots.length > rec ? fitBack() : newSlot('right');
      case 'focusRule':
        return setRuleOpen(true);
      case 'launcher':
        return showLauncher();
      case 'importBookmarks':
        return importBookmarks();
      case 'exportBookmarks':
        return exportBookmarks();
      case 'sendDesks':
        return void sendWorkspace();
      case 'loadDesks':
        return importRef.current?.click();
      case 'syncDesks':
        return setSyncOpen(true);
      case 'tourSync':
        setOverview(false);
        setSyncOpen(true);
        return window.setTimeout(() => setTour('sync'), syncOpen ? 0 : 150);
      case 'sortHelp':
        return setSortOpen(true);
      case 'profile':
        return setProfileOpen(true);
      case 'reload':
        return window.location.reload();
      case 'tourDev': {
        // V54: Tour am aktiven Portal; ist dort der Entwickler-Modus aus, wird er eingeschaltet
        setOverview(false);
        const id = currentPanel();
        const pm = id ? ws.panels.find((x) => x.id === id) : undefined;
        if (!pm) return notify('Erst ein Portal anklicken, dann die Tour „Entwickler-Modus“ starten.');
        if (!pm.dev) dispatch({ type: 'devPanel', id: pm.id });
        return window.setTimeout(() => setTour('dev'), pm.dev ? 0 : 250);
      }
      case 'devMode': {
        const id = currentPanel();
        const pm = id ? ws.panels.find((x) => x.id === id) : undefined;
        if (!pm) return notify('Erst ein Portal anklicken, dann den Entwickler-Modus einschalten.');
        dispatch({ type: 'devPanel', id: pm.id });
        return notify(DEV_TEXT.switched(pm.name, !pm.dev));
      }
      case 'search':
        return window.setTimeout(() => document.querySelector<HTMLInputElement>('.search__input')?.focus(), 0);
    }
  };

  let content: ReactNode;
  if (mine.length === 0) {
    content = (
      <div className="empty">
        <p>{win ? DESK_GONE_TEXT.empty : 'Keine Portale geöffnet.'}</p>
        {win && (
          <button type="button" title={DESK_GONE_TEXT.toMainTitle} onClick={() => props.onSwitch('', DESK_GONE_TEXT.here)}>
            {DESK_GONE_TEXT.toMain}
          </button>
        )}
        <button
          type="button"
          className="fx"
          style={{ '--fx': fx.panel.color } as CSSProperties}
          title={`Neuen Slot anlegen – ${fx.panel.text}`}
          onClick={() => newSlot('right')}
        >
          <Icon name="newSlot" size={15} className="icon tb-plus" /><span className="tb-label"> NewSlot</span>
        </button>
        {win && (
          <button type="button" onClick={() => window.close()}>
            Desk schließen
          </button>
        )}
      </div>
    );
  } else {
    // F-06 Stufe 2: Alle Portale liegen in fester Reihenfolge unter einem Eltern-Element; die View
    // (Dashboard, Maximieren, 2 × 2) ändert nur Lage und Sichtbarkeit. So bleiben Seiten beim
    // Wechsel geladen – ein iframe, das im DOM verschoben wird, lädt sonst neu.
    const chosen =
      mode.kind === 'split'
        ? splitSelection(view, active && areaOf(view, active), mode.count)
            .map(shown)
            .filter((m): m is PanelMeta => !!m)
        : [];
    const cols = chosen.length >= 4 ? 2 : Math.max(1, chosen.length);
    const rows = chosen.length >= 4 ? 2 : 1;
    const cellStyle = (i: number): CSSProperties => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const w = `((100% - ${16 + (cols - 1) * 8}px) / ${cols})`;
      const h = `((100% - ${16 + (rows - 1) * 8}px) / ${rows})`;
      return { left: `calc(8px + ${c} * (${w} + 8px))`, top: `calc(8px + ${r} * (${h} + 8px))`, width: `calc(${w})`, height: `calc(${h})` };
    };
    const MAX_STYLE: CSSProperties = { left: 8, top: 8, width: 'calc(100% - 16px)', height: 'calc(100% - 16px)' };
    const slotOfId = new Map(shownView.slots.flatMap((sl) => sl.panels.map((m) => [m.id, sl] as const)));
    const list = ws.panels.filter((m) => slotOfId.has(m.id) || (mode.kind === 'max' && m.id === mode.id));
    content = (
      <>
        {list.map((m) => {
          const s = slotOfId.get(m.id);
          const meta = s ? shown(s.id) : null;
          const front = !!s && meta?.id === m.id;
          const at = chosen.findIndex((x) => x.id === m.id);
          const visible = mode.kind === 'max' ? m.id === mode.id : mode.kind === 'split' ? at >= 0 : front;
          if (!visible && !isAwake(m.id, keepTabOf(m, m.activeTab, keptSrc))) return null;
          const style = mode.kind === 'max' ? MAX_STYLE : mode.kind === 'split' ? (at >= 0 ? cellStyle(at) : undefined) : s ? px(s.rect) : undefined;
          const onSlot = mode.kind === 'area' && front && s;
          const over = onSlot && drag?.target === s.id ? drag.zone : null;
          return (
            <div
              key={m.id}
              className={['tile', !visible && 'is-back', onSlot && resizing.has(s.id) && 'tile--resizing'].filter(Boolean).join(' ')}
              style={style}
              aria-hidden={visible ? undefined : true}
            >
              {frame(m, mode.kind === 'area' && s ? { slotId: s.id, rect: s.rect } : undefined)}
              {onSlot && (
                <>
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
                </>
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
  const transferFile = () => new File([JSON.stringify(toTransferFile(ws, device()), null, 2)], FILE_NAME, { type: 'application/json' });
  const download = (file: File) => {
    const href = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = href;
    link.download = FILE_NAME;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
    saveSyncMeta({ ...loadSyncMeta(), syncedAt: Date.now() });
  };
  const exportWorkspace = () => {
    download(transferFile());
    notify(TRANSFER_TEXT.saved(FILE_NAME));
  };
  // F-169 Stufe 1: Teilen-Menü des Systems (AirDrop, Nachrichten, Mail); ohne Teilen-Funktion als Datei speichern
  const sendWorkspace = async () => {
    const file = transferFile();
    if (!navigator.canShare?.({ files: [file] })) {
      download(file);
      return notify(TRANSFER_TEXT.noShare(FILE_NAME));
    }
    try {
      await navigator.share({ files: [file], title: TRANSFER_TEXT.shareTitle });
      saveSyncMeta({ ...loadSyncMeta(), syncedAt: Date.now() });
      notify(TRANSFER_TEXT.sent);
    } catch (e) {
      if ((e as Error).name === 'AbortError') return; // im Teilen-Menü abgebrochen
      download(file);
      notify(TRANSFER_TEXT.noShare(FILE_NAME));
    }
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
    <div className={display.compact ? 'app app--compact' : 'app'}>
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
          {/* F-160: Desk wechseln – zeigt einen anderen Desk in diesem Browserfenster; dazu Sammeln und Verteilen */}
          {ws.windows.length > 0 && (
            <span className="tb-desk-switch">
              <Menu icon={<span className="tb-switch" aria-hidden="true"><Icon name="switchDesk" /></span>} label={`Desk wechseln (Alt/⌥+K) – ${TERMS.switchDesk}`}>
                {(close) => (
                  <>
                    {windowList(ws).map((d) => {
                      const here = d.id === win;
                      const elsewhere = !here && windows.open.has(d.id);
                      const n = panelsIn(ws.panels, d.id).length;
                      return (
                        <Item
                          key={d.id || 'main'}
                          disabled={here}
                          title={elsewhere ? 'Springt zu seinem Fenster' : here ? undefined : TERMS.collected}
                          onClick={() => {
                            close();
                            switchDesk(d.id);
                          }}
                        >
                          {here ? '● ' : ''}
                          {/* F-161: Akzentfarbe des Desks; der Name bleibt das Merkmal (NF-03) */}
                          <span className="desk-swatch" aria-hidden="true" style={{ '--swatch': lookOf(ws, d.id).accent } as CSSProperties} />
                          {d.name} · {n === 1 ? '1 Portal' : `${n} Portale`}
                          {hasOwnLook(ws, d.id) ? DESK_LOOK_TEXT.ownShort : ''}
                          {` · ${deskFx(d.id).word}`}
                          {here ? ' · hier' : elsewhere ? ' · eigenes Fenster' : ' · gesammelt'}
                        </Item>
                      );
                    })}
                    <MenuHead>Fenster</MenuHead>
                    <Item
                      title={TERMS.collectDesks}
                      onClick={() => {
                        close();
                        collectHere();
                      }}
                    >
                      Desks hier sammeln
                    </Item>
                    <Item
                      title={TERMS.distributeDesks}
                      onClick={() => {
                        close();
                        distributeDesks();
                      }}
                    >
                      Auf Fenster verteilen
                    </Item>
                  </>
                )}
              </Menu>
            </span>
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
            <Icon name="newDesk" size={15} className="icon tb-plus" /><span className="tb-label"> NewDesk</span>
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
                const go = (dissolve: boolean) => {
                  dispatch({ type: 'returnAll', win, dissolve });
                  // F-190: keine neuen Fenster – schließen oder hier zum Main Desk werden
                  leaveDesk(DESK_GONE_TEXT.returned);
                };
                // F-51: gespeicherte Layouts gingen verloren – erst nachfragen
                const others = layoutsOf(ws, win).list.length - 1;
                if (others > 0) return setAsk({ text: DESK_LAYOUT_TEXT.askDissolve(winLabel, others), yes: DESK_LAYOUT_TEXT.dissolve, run: () => go(true) });
                go(false);
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
        <Search ws={ws} activeName={ws.panels.find((x) => x.id === currentPanel())?.name ?? null} onOpen={openHit} onShowPanel={showPanel} onRun={runHelp} onHelp={(id) => setHelpAt({ at: id })} launchHow={launcher.how} onWebSearch={webSearch} engineName={engineOf(ws).name} onPickCase={pickCaseHere} />
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
          <Menu icon={<span className="tb-add fx" style={{ '--fx': fx.panel.color } as CSSProperties}><Icon name="newSlot" size={15} className="icon tb-plus" /><span className="tb-label"> NewSlot</span></span>} label={`Neuen Slot anlegen – ${TERMS.slot} – ${fx.panel.text}`}>
            {(close) => (
              <>
                <Item
                  onClick={() => {
                    newSlot('right');
                    close();
                  }}
                >
                  Neue Spalte rechts
                </Item>
                <Item
                  onClick={() => {
                    newSlot('bottom');
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
            onClick={() => notify(`Der Bildschirm ist voll (${view.slots.length}/${view.spec.max ?? view.spec.capacity} Slots). Weitere Portale legst du über das Plus in der Kopfleiste eines Portals auf seinen Slot.`, 5000)}
          >
            <Icon name="newSlot" size={15} className="icon tb-plus" /><span className="tb-label"> NewSlot</span>
          </button>
        )}
        {/* F-52: über der Empfehlung – ein Klick zurück auf die empfohlene Zahl */}
        {view.slots.length > rec && (
          <button type="button" className="tb-fit" onClick={fitBack} title={DESK_LAYOUT_TEXT.fitTitle(rec)} aria-label={`${DESK_LAYOUT_TEXT.fit(rec)} – ${view.slots.length} von ${rec} empfohlenen Slots`}>
            <Icon name="restore" size={15} className="icon tb-plus" />
            <span className="tb-label"> {DESK_LAYOUT_TEXT.fit(rec)}</span>
          </button>
        )}
        {/* F-169 Stufe 2: ruhiges Zeichen für den Abgleich (nur wenn eingerichtet) */}
        {gist.status !== 'off' && (
          <button
            type="button"
            className={`tb-sync is-${gist.status}`}
            onClick={() => setSyncOpen(true)}
            title={`${SYNC_TEXT.badge[gist.status]}${gist.status === 'error' && gist.error ? ` – ${gist.error}` : ''} (Klick: Einzelheiten)`}
            aria-label={`${SYNC_TEXT.badge[gist.status]} – Einzelheiten`}
            aria-haspopup="dialog"
          >
            <Icon name="sync" size={15} />
            {gist.status === 'error' && <span className="tb-sync__dot" aria-hidden="true">!</span>}
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
              <Item icon="ruler"
                onClick={() => {
                  dispatch({ type: 'rulerAll' });
                  close();
                }}
              >
                {ws.ruler.on ? 'Lineal in allen Portalen ausblenden' : 'Lineal in allen Portalen zeigen'}
              </Item>
              <li className="menu__sep" role="separator" />
              {/* F-51: Layouts dieses Desks */}
              <Item icon="layouts"
                onClick={() => {
                  close();
                  openLayouts();
                }}
              >
                {DESK_LAYOUT_TEXT.menu}
                <span className="menu__hint"> {activeLayout(ws, win ?? '').name}</span>
              </Item>
              <Item icon="dashboard"
                onClick={() => {
                  dispatch({ type: 'savePreferred', setup });
                  notify('Wunsch-Anordnung für diese Bildschirm-Einstellung gespeichert.');
                  close();
                }}
              >
                Als Wunsch-Anordnung merken
              </Item>
              <Item icon="restore"
                onClick={() => {
                  dispatch({ type: 'resetLayout', setup });
                  setMode({ kind: 'area' });
                  notify(hasPreferred ? 'Wunsch-Anordnung wiederhergestellt.' : 'Standard-Anordnung wiederhergestellt.');
                  close();
                }}
              >
                {hasPreferred ? 'Auf Wunsch-Anordnung zurücksetzen' : 'Anordnung zurücksetzen'}
              </Item>
              {hasPreferred && (
                <Item icon="remove"
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
              <Item icon="source"
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
              {/* F-189: Suchmaschine für „Im Web suchen“ */}
              <li className="menu__field">
                <label title={WEB_TEXT.engineHint}>
                  {WEB_TEXT.engine}
                  <select
                    value={engineOf(ws).id}
                    aria-description={WEB_TEXT.engineHint}
                    onChange={(e) => {
                      dispatch({ type: 'engine', id: e.target.value });
                      sayLive(WEB_TEXT.engineChanged(ENGINES.find((x) => x.id === e.target.value)?.name ?? ''));
                    }}
                  >
                    {ENGINES.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </select>
                </label>
              </li>
              {/* F-189 Stufe 2: Lesezeichen „An E-Sources senden“ */}
              <li className="menu__field menu__send">
                <span id="send-label">{SEND_TEXT.setting}</span>
                <span className="menu__send-row">
                  <a
                    className="sendlink"
                    ref={(el) => el?.setAttribute('href', sendCode)}
                    draggable
                    aria-label={SEND_TEXT.bookmarkLabel}
                    aria-describedby="send-hint"
                    title={SEND_TEXT.dragHint}
                    onClick={(e) => {
                      e.preventDefault();
                      notify(SEND_TEXT.notHere, 10000);
                      sayLive(SEND_TEXT.notHere);
                    }}
                  >
                    <span className="sendlink__logo" aria-hidden="true">
                      <img src="/send-icon.svg" alt="" width={20} height={20} draggable={false} />
                    </span>
                    {BOOKMARK_NAME}
                  </a>
                  <button type="button" title={SEND_TEXT.fileHint} aria-description={SEND_TEXT.fileHint} onClick={() => void downloadSendBookmark()}>
                    {SEND_TEXT.file}
                  </button>
                  <button type="button" title={SEND_TEXT.copyHint} aria-description={SEND_TEXT.copyHint} onClick={copySendCode}>
                    {SEND_TEXT.copy}
                  </button>
                  {/* F-197: geführte Anleitung je Browser */}
                  <button type="button" title={SEND_TEXT.guideHint} aria-description={SEND_TEXT.guideHint} onClick={() => {
                      close();
                      // Fokus nach der Tour zurück aufs Zahnrad (NF-03)
                      document.querySelector<HTMLElement>('button[aria-label="Einstellungen"]')?.focus();
                      startSendTour();
                    }}>
                    {SEND_TEXT.guide}
                  </button>
                </span>
                <span id="send-hint" className="menu__hint">
                  {SEND_TEXT.dragHint}
                </span>
              </li>
              {/* F-06: Verdecktes pausieren */}
              <li className="menu__field">
                <label title={PAUSE_TEXT.settingHint}>
                  {PAUSE_TEXT.setting}
                  <select
                    id="set-pause"
                    value={pauseMinutes(ws)}
                    aria-description={PAUSE_TEXT.settingHint}
                    onChange={(e) => {
                      const min = Number(e.target.value);
                      dispatch({ type: 'pause', minutes: min });
                      sayLive(PAUSE_TEXT.changed(min));
                    }}
                  >
                    {PAUSE_CHOICES.map((m) => (
                      <option key={m} value={m}>
                        {PAUSE_TEXT.choice(m)}
                      </option>
                    ))}
                  </select>
                </label>
              </li>
              {/* F-06 Stufe 2: Sichtbares pausieren */}
              <li className="menu__field">
                <label title={PAUSE_TEXT.shownHint}>
                  {PAUSE_TEXT.shownSetting}
                  <select
                    value={shownMinutes(ws)}
                    aria-description={PAUSE_TEXT.shownHint}
                    onChange={(e) => {
                      const min = Number(e.target.value);
                      dispatch({ type: 'pauseShown', minutes: min });
                      sayLive(PAUSE_TEXT.shownChanged(min));
                    }}
                  >
                    {SHOWN_CHOICES.map((m) => (
                      <option key={m} value={m}>
                        {PAUSE_TEXT.shownChoice(m)}
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
              <Item icon="design"
                onClick={() => {
                  close();
                  setDesign(true);
                }}
              >
                Design anpassen …
              </Item>
              <li className="menu__sep" role="separator" />
              {/* F-169 Stufe 1: Desks auf ein anderes Gerät bringen */}
              <Item icon="send" title={TRANSFER_TEXT.sendTitle}
                onClick={() => {
                  close();
                  void sendWorkspace();
                }}
              >
                {TRANSFER_TEXT.send}
              </Item>
              <Item icon="transfer" title={TRANSFER_TEXT.saveTitle}
                onClick={() => {
                  exportWorkspace();
                  close();
                }}
              >
                {TRANSFER_TEXT.save}
              </Item>
              <Item icon="import" title={TRANSFER_TEXT.loadTitle}
                onClick={() => {
                  importRef.current?.click();
                  close();
                }}
              >
                {TRANSFER_TEXT.load}
              </Item>
              {/* F-169 Stufe 2: automatischer Abgleich über ein geheimes GitHub Gist */}
              <Item icon="sync" title={SYNC_TEXT.menuTitle}
                onClick={() => {
                  close();
                  setSyncOpen(true);
                }}
              >
                {SYNC_TEXT.menu}
              </Item>
              {/* F-36 */}
              <Item icon="import"
                onClick={() => {
                  importBookmarks();
                  close();
                }}
              >
                Lesezeichen importieren …
              </Item>
              <Item icon="export"
                onClick={() => {
                  exportBookmarks();
                  close();
                }}
              >
                Library exportieren
              </Item>
              {/* F-180 */}
              <Item icon="sort"
                onClick={() => {
                  close();
                  setSortOpen(true);
                }}
              >
                Sortierhilfe …
              </Item>
              {/* F-179 */}
              <Item icon="profile"
                onClick={() => {
                  close();
                  setProfileOpen(true);
                }}
              >
                Profil …
              </Item>
              {/* F-29 Rest */}
              <Item icon="sliders"
                onClick={() => {
                  close();
                  setRuleOpen(true);
                }}
              >
                Fokusanzeige anpassen …
              </Item>
              {/* F-24 */}
              <Item icon="closed"
                onClick={() => {
                  close();
                  setClosedOpen(true);
                }}
              >
                Zuletzt geschlossen …
              </Item>
              {/* F-95: Tour jederzeit wieder starten */}
              <Item icon="tour"
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
              {/* F-183 Stufe 2: Anzeige der Symbole */}
              <Item checked={display.compact} onClick={switchCompact}>
                {DISPLAY_TEXT.compact}
              </Item>
              <Item checked={display.favicons} onClick={switchFavicons}>
                {DISPLAY_TEXT.favicons}
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
            <Icon name="design" size={18} />
          </button>
        </div>
      </header>
      {PROBE && (
        <a className="probe" href={window.location.pathname} title="Testbelegung verlassen (zurück zu deinen eigenen Desks)">
          Test: {PROBE_KIND} · nichts wird gespeichert
        </a>
      )}
      {tour && tour !== 'design' && tour !== 'colors' && tour !== 'sync' && !(tour === 'import' && bmImport) && (
        <Tour
          key={tour}
          tour={tour}
          auto={tourAuto}
          onClose={() => setTour(null)}
          onAutoOff={() => setAutoTours(false)}
          // F-181: Teil 1 der Import-Tour – „Datei wählen …“ öffnet die Dateiauswahl; gesehen erst nach dem Dialog-Teil
          onAction={tour === 'import' ? (id) => (id === 'sendToo' ? startSendTour() : bookmarkFileRef.current?.click()) : tour === 'send' ? sendTourAction : undefined}
          markSeen={tour !== 'import'}
        />
      )}
      {design && (
        <Design look={look} warning={lookWarning} desk={winLabel} main={!win} own={hasOwnLook(ws, win)} onLook={(change) => {
            // F-178: passende Akzentfarbe mitnehmen, wenn die bisherige im neuen Design schlecht lesbar wäre
            const next = pickLook(look, change, systemDark);
            const first = !!win && !hasOwnLook(ws, win);
            dispatch({ type: 'look', win, ...next });
            // F-161: Der erste Klick auf einem Zusatz-Desk gibt ihm eigene Farben – das ansagen
            const msgs = [first ? DESK_LOOK_TEXT.nowOwn(winLabel) : '', next.accent && !change.accent ? `Akzentfarbe an „${THEMES.find((t) => t.id === change.theme)?.label}“ angepasst, damit alles lesbar bleibt.` : ''].filter(Boolean);
            if (msgs.length) notify(msgs.join(' '));
          }} tinted={deskTintCount(ws, win)} onResetTints={() => {
            const { before } = clearDeskTints(ws, win);
            const n = Object.keys(before.panels).length + Object.keys(before.slots).length;
            dispatch({ type: 'clearTints', win });
            notify(TINT_TEXT.resetAllDone(n), 8000, false, { label: TINT_TEXT.undo, run: () => dispatch({ type: 'restoreTints', snap: before }) });
            // F-191: der Knopf verschwindet – Fokus auf „Zurücksetzen“ unten, das alles zurückholt (NF-03)
            window.setTimeout(() => document.querySelector<HTMLElement>('#design .dialog-foot__reset')?.focus(), 0);
          }} now={snapDesign(ws, win ?? '')} onRestore={(st) => {
            dispatch({ type: 'restoreDesign', snap: st });
            setFlash(null);
            sayLive(DIALOG_TEXT.resetDone);
          }} onFollowMain={() => {
            dispatch({ type: 'followMainLook', win });
            notify(DESK_LOOK_TEXT.nowFollows(winLabel));
          }} onClose={() => {
            setDesign(false);
          }} onTour={startDesignTour}>
          {tour === 'design' && <Tour key="design" tour="design" auto={tourAuto} onClose={() => setTour(null)} onAutoOff={() => setAutoTours(false)} onAction={() => window.setTimeout(startColorsTour, 0)} />}
        </Design>
      )}
      {colorsFor &&
        (() => {
          // F-162: Portal und sein Slot; fällt das Portal weg, schließt der Dialog von selbst
          const meta = ws.panels.find((x) => x.id === colorsFor);
          const slot = shownView.slots.find((s) => s.panels.some((m) => m.id === colorsFor));
          if (!meta || !slot) return null;
          const nameId = slotNameId(ws, slot.panels.map((m) => m.id), slot.front.id);
          const slotName = ws.areaNames.find((n) => n.id === nameId)?.name ?? TINT_TEXT.unnamed;
          return (
            <Colors
              portalName={meta.name}
              slotName={slotName}
              portal={meta.tint}
              slot={slotTint(ws, slot)}
              shown={shownTheme}
              categories={ws.categories}
              category={meta.category}
              categoryTint={categoryOf(ws, meta)?.tint}
              categoryOff={!!meta.category && !ruleOn(ws, tintRuleId(meta.category))}
              categoryPortals={meta.category ? categoryPortals(ws, meta.category) : 0}
              focusCategory={colorsCat}
              onCategory={(id) => dispatch({ type: 'panelCategory', id: meta.id, category: id, url: activeTab(meta).url })}
              onNewCategory={(name) => dispatch({ type: 'panelNewCategory', id: meta.id, name, catId: newId(), url: activeTab(meta).url })}
              onCategoryTint={(change) => meta.category && dispatch({ type: 'tintCategory', id: meta.category, change })}
              onCategoryIcon={(icon) => {
                const c = categoryOf(ws, meta);
                if (!c) return;
                dispatch({ type: 'iconCategory', id: c.id, icon });
                const shown = icon ?? categoryIcon({ name: c.name });
                sayLive(CATEGORY_TEXT.iconDone(c.name, CATEGORY_ICON_LABEL[shown] ?? shown));
              }}
              onPortal={(change) => dispatch({ type: 'tintPanel', id: meta.id, change })}
              onSlot={(change) => dispatch({ type: 'tintSlot', setup, area: slot.id, change })}
              now={snapColors(ws, meta.id, slotTint(ws, slot))}
              onRestore={(st) => {
                dispatch({ type: 'restoreColors', snap: st });
                dispatch({ type: 'tintSlot', setup, area: slot.id, change: { frame: st.slotTint?.frame ?? null, accent: st.slotTint?.accent ?? null } });
                sayLive(DIALOG_TEXT.resetDone);
              }}
              onReset={() => {
                dispatch({ type: 'tintPanel', id: meta.id, change: { frame: null, accent: null } });
                dispatch({ type: 'tintSlot', setup, area: slot.id, change: { frame: null, accent: null } });
                notify(TINT_TEXT.resetOneDone(meta.name));
              }}
              onClose={() => {
                setColorsFor(null);
                setColorsCat(false);
                // NF-03: Das Menü ist schon zu – Fokus zurück auf ⋮ dieses Portals
                window.setTimeout(() => document.querySelector<HTMLElement>(`[data-panel-id="${meta.id}"] [aria-label="Portal-Optionen"]`)?.focus(), 0);
              }}
              onTour={startColorsTour}
            >
              {tour === 'colors' && <Tour key="colors" tour="colors" auto={tourAuto} onClose={() => setTour(null)} onAutoOff={() => setAutoTours(false)} onAction={showRulesFromTour} />}
            </Colors>
          );
        })()}
      {jackpot && <SlotMachine ws={ws} here={win ?? ''} slots={view.slots} onCleanup={cleanupDuplicates} onMerge={mergeSlot} onClose={() => setJackpot(false)} />}
      {bmImport && (
        <ImportBookmarks
          ws={ws}
          fileName={bmImport.name}
          list={bmImport.list}
          onClose={() => setBmImport(null)}
          onTour={() => setTour('import')}
          onImport={(plan) => {
            dispatch({ type: 'importBookmarks', plan, from: bmImport.name });
            setBmImport(null);
            const cats = plan.newCategories.length;
            const loose = plan.fresh.filter((b) => !b.category).length;
            // F-180: viele Sources ohne Kategorie → gleich die Sortierhilfe anbieten
            const text = `${plan.fresh.length} Sources in die Library übernommen${cats ? `, ${cats} ${cats === 1 ? 'Kategorie' : 'Kategorien'} neu` : ''}.${loose >= 5 ? ` Die Sortierhilfe bündelt die ${loose} ohne Kategorie.` : ''}`;
            notify(text);
            sayLive(text);
            if (loose >= 5) window.setTimeout(() => setSortOpen(true), 0);
          }}
        >
          {tour === 'import' && (
            <Tour key="import-dialog" tour="import" auto={tourAuto} skip={importPre && tourAuto ? ['intro', 'export'] : undefined} onClose={() => setTour(null)} onAutoOff={() => setAutoTours(false)} onAction={(id) => id === 'sendToo' && startSendTour()} />
          )}
        </ImportBookmarks>
      )}
      {greetOn && !tour && (
        <Greeting
          profile={profileOf(ws)}
          greeting={greetText}
          last={greetLast}
          onContinue={continueLast}
          recent={() => {
            const r = loadRecent(!PROBE);
            const sources = recentSources(ws.bookmarks, r.urls, 5);
            return {
              lists: recentLists(radarOf(ws, shownView.slots, setup, windows.open), r.panels, GREET_TEXT.deskWhere),
              sources: sources.length ? sources : newestSources(ws.bookmarks, 5),
              sourcesNew: sources.length === 0,
            };
          }}
          onPortal={openRecentPortal}
          onSource={openRecentSource}
          onProfile={() => {
            setGreetOn(false);
            setProfileOpen(true);
          }}
          onClose={closeGreeting}
        />
      )}
      {update.found && <UpdateNotice onReload={() => window.location.reload()} onLater={update.later} />}
      {casesOpen && <CasesDialog ws={ws} dispatch={dispatch} say={sayLive} onClose={() => setCasesOpen(false)} />}
      {syncOpen && (
        <SyncDialog
          onClose={() => setSyncOpen(false)}
          onSend={() => {
            setSyncOpen(false);
            void sendWorkspace();
          }}
          say={(text) => notify(text)}
          onTour={() => setTour('sync')}
        >
          {tour === 'sync' && <Tour key="sync" tour="sync" auto={tourAuto} onClose={() => setTour(null)} onAutoOff={() => setAutoTours(false)} />}
        </SyncDialog>
      )}
      {profileOpen && <ProfileDialog profile={profileOf(ws)} onChange={(change) => dispatch({ type: 'profile', change })} onRestored={() => sayLive(DIALOG_TEXT.resetDone)} onClose={() => setProfileOpen(false)} />}
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
            dispatch({ type: 'saveBookmark', bookmark: { id, title, url, category, tags: [], panels: [], origin: originOf(ws, 'launcher') } });
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
          onShowDesk={(target) => {
            setOverview(false);
            switchDesk(target);
          }}
          onCollect={collectHere}
          onDistribute={distributeDesks}
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
          onDismiss={() => {
            setOverview(false);
            setOverviewRules(false);
            setOverviewLayouts(false);
            setLayoutUndo(null);
            setResetUndo(null);
          }}
          onTour={startCockpitTour}
          onJackpot={() => {
            setOverview(false);
            setOverviewRules(false);
            setJackpot(true);
          }}
          keepOpen={tour === 'cockpit'}
          dispatch={dispatch}
          shown={shownTheme}
          startRules={overviewRules}
          layoutOps={layoutOps}
          startLayouts={overviewLayouts}
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
            <Icon name="close" size={14} />
          </button>
        </div>
      )}
      {/* F-23: Ansage für Tab-/Portal-Wechsel per Kürzel */}
      <span className="sr-only" role="status" aria-live="polite">
        {cycleSaid}
      </span>
      {flash && !swapFrom && (
        <div
          className="toast"
          role="status"
          // F-196: Maus oder Fokus darauf hält den Hinweis an; Verlassen startet die Zeit neu
          onPointerEnter={() => window.clearTimeout(flashTimer.current.id)}
          onPointerLeave={(e) => !e.currentTarget.contains(document.activeElement) && flashTimer.current.text === flash && flashRun(flash, flashTimer.current.ms)}
          onFocus={() => window.clearTimeout(flashTimer.current.id)}
          onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && !e.currentTarget.matches(':hover') && flashTimer.current.text === flash && flashRun(flash, flashTimer.current.ms)}
        >
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
          {flashAction?.text === flash &&
            flashAction.actions.map((a) => (
              <button
                key={a.label}
                type="button"
                className="toast__undo"
                onClick={() => {
                  setFlash(null);
                  a.run();
                }}
              >
                {a.label}
              </button>
            ))}
          <button type="button" onClick={() => setFlash(null)} aria-label="Hinweis schließen" title="Schließen">
            <Icon name="close" size={14} />
          </button>
        </div>
      )}
      <main className="area" ref={areaRef}>
        {content}
      </main>
      {ask && (
        <div className="notice" role="alertdialog" aria-modal="true" aria-labelledby="ask-text" onClick={() => closeAsk()} onKeyDown={(e) => e.key === 'Escape' && closeAsk()}>
          <div className="notice__box" onClick={(e) => e.stopPropagation()}>
            <p id="ask-text">{ask.text}</p>
            <div className="notice__btns">
              <button type="button" autoFocus onClick={() => closeAsk(ask.run)}>
                {ask.yes}
              </button>
              <button type="button" onClick={() => closeAsk()}>
                {DESK_LAYOUT_TEXT.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
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

/**
 * F-160 Stufe 2: Hülle um den Desk. Sie hält die Arbeitsfläche und den Desk, den dieses
 * Browserfenster zeigt. Ein Wechsel baut den Desk ohne Neuladen frisch auf (Adresse per
 * replaceState); gibt das Fenster seinen Desk beim Sammeln ab, zeigt es nur noch einen Hinweis.
 */
/** F-196: kurze Hinweise (Kategorie-Frage, Portal/Tab geschlossen) – Wunsch Enrico: erst 3, dann 2 Sekunden. */
const HINT_SHORT = 2000;

export default function App(props: { sent?: string }) {
  const [ws, dispatch] = useWorkspace();
  useGistSync(ws, dispatch);
  const [desk, setDesk] = useState<{ win: string; switched: boolean; said: string; focus?: string }>(() => ({ win: winFromSearch(window.location.search), switched: false, said: '' }));
  const [parked, setParked] = useState(false);
  const onSwitch = useCallback((target: string, said = '', focus?: string) => {
    window.history.replaceState(window.history.state, '', windowUrl(window.location.href, target));
    setDesk({ win: target, switched: true, said, focus });
  }, []);
  const onPark = useCallback(() => setParked(true), []);
  if (parked) return <Parked name={windowName(ws, desk.win)} onBack={() => setParked(false)} />;
  return <DeskApp key={desk.win} ws={ws} dispatch={dispatch} win={desk.win} switched={desk.switched} said={desk.said} focus={desk.focus} onSwitch={onSwitch} onPark={onPark} sent={desk.switched ? undefined : props.sent} />;
}

/** F-160: Dieses Fenster hat seinen Desk an ein anderes Fenster abgegeben (Fenster ließ sich nicht selbst schließen). */
function Parked(props: { name: string; onBack: () => void }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    document.title = `${props.name} gesammelt – E-Sources`;
    ref.current?.focus();
  }, [props.name]);
  return (
    <main className="parked" aria-labelledby="parked-title">
      <h1 id="parked-title" ref={ref} tabIndex={-1}>
        „{props.name}“ ist jetzt gesammelt
      </h1>
      <p>{TERMS.parked}</p>
      <div className="parked__actions">
        <button type="button" onClick={() => window.close()} title="Schließt dieses Browserfenster (geht nicht in jedem Browser – dann einfach selbst schließen)">
          Fenster schließen
        </button>
        <button type="button" onClick={props.onBack}>
          Hier wieder zeigen
        </button>
      </div>
    </main>
  );
}
