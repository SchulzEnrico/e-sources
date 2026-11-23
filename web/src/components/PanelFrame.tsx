import { DevBar } from './DevBar';
import { devFrame, devSizeOf } from '../workspace/dev';
import { flash } from '../workspace/flash';
import { TOUR_EVENT } from '../workspace/tour';
import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type DragEvent, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { ZOOM_DEFAULT, ZOOM_STEPS, nearestStep, setFrameWidth, shownZoom, zoomStep, zoomStyle } from '../workspace/zoom';
import { LauncherIcon } from './Launcher';
import { openOutside } from '../workspace/launcher';
import { createPortal } from 'react-dom';
import type { Bookmark, Named, PanelMeta, Workspace } from '../workspace/types';
import type { Action } from '../workspace/useWorkspace';
import type { MoveTarget } from '../workspace/move';
import { bookmarkOf, collectionSize, searchAll } from '../workspace/bookmarks';
import { BookmarkEditor, CollectionDrawer, CollectionIcon, draftFor } from './Bookmarks';
import { FOCUS_WARN, NEW_AREA, TAB_MAX, rulerShown, activeTab, canGoBack, canGoForward, hostOf, isSelfUrl, loadColor, tabLabel } from '../workspace/workspace';
import { StackBar, type StackProps, useSwipe } from './StackBar';
import { Ruler } from './Ruler';
import * as FH from '../workspace/frameHistory';
import { CATEGORY_TEXT, DEV_TEXT, PAUSE_TEXT, TERMS, TINT_TEXT, WEB_TEXT, ZOOM_TEXT, DIALOG_TEXT } from '../workspace/terms';
import { looksLikeAddress } from '../workspace/websearch';
import type { ShownTint } from '../workspace/tint';
import { rgbOf } from '../workspace/look';
import { Icon } from './Icon';
import type { IconName } from '../workspace/icons';

/** Voreingestellte Größen (F-12) als Anteil von Breite und Höhe der Arbeitsfläche. */
export const SIZE_PRESETS: { label: string; w: number; h: number }[] = [
  { label: '¼ Breite', w: 1 / 4, h: 1 },
  { label: '⅓ Breite', w: 1 / 3, h: 1 },
  { label: '½ Breite', w: 1 / 2, h: 1 },
  { label: '⅔ Breite', w: 2 / 3, h: 1 },
  { label: 'Volle Breite', w: 1, h: 1 },
  { label: '½ Breite, ½ Höhe', w: 1 / 2, h: 1 / 2 },
  { label: '⅓ Breite, ½ Höhe', w: 1 / 3, h: 1 / 2 },
];

interface Props {
  panel: PanelMeta;
  /** Größe als Anteil der Arbeitsfläche (zur Anzeige). */
  share?: { w: number; h: number };
  /** Gesetzt, wenn das Panel im Stapel liegt (F-08). */
  stack?: StackProps;
  /** F-167: Fokus-Auswirkung von „neues Portal“ und „neuer Tab“. */
  fx?: { panel: Fx; tab: Fx };
  /** F-162: Rahmen- und Akzentfarbe (Portal → Slot → Desk). */
  tint?: ShownTint;
  /** F-162: Dialog „Farben“ öffnen. */
  onColors?: () => void;
  /** F-163: Kategorie des Portals – Name und ihre Rahmenfarbe (falls gesetzt), in der Kopfzeile. */
  category?: { name: string; color?: string; icon?: IconName };
  /** F-163: „Farben“ mit Fokus auf der Kategorie öffnen (Klick auf die Kategorie in der Kopfzeile). */
  onCategory?: () => void;
  active: boolean;
  maximized: boolean;
  swapSource: boolean;
  swapTarget: boolean;
  /** Wird gerade gezogen (zum Tauschen oder Andocken). */
  dragging?: boolean;
  onActivate: () => void;
  /** Ziehen am Namen beginnt (nur auf der Arbeitsfläche). */
  onDragStart?: (e: PointerEvent) => void;
  onRename: (name: string) => void;
  /** Adresse öffnen (F-14). */
  onNavigate: (url: string) => void;
  /** Im eigenen Verlauf des Panels zurück (−1) oder vor (+1). */
  onHistory: (step: number) => void;
  onHome: () => void;
  onSetHome: () => void;
  /** Tabs (F-21, F-22). */
  onAddTab: () => void;
  onCloseTab: (tab: string) => void;
  onSelectTab: (tab: string) => void;
  onMoveTab: (tab: string, to: number) => void;
  /** F-09: neues Panel auf dieser Area obendrauf legen. */
  onAddHere: () => void;
  /** F-114: Hinweis an diesem Portal (statt Dialog über der Fläche); solange er steht, leuchtet der Rahmen rot. */
  hint?: string;
  /** F-114: Hinweis an diesem Portal zeigen. */
  onHint: (text: string) => void;
  /** F-114: Hinweis bestätigt. */
  onHintDone: () => void;
  /** F-43: Lässt sich die Seite voraussichtlich nicht einbetten? */
  isBlocked: (url: string) => boolean;
  /** F-43: Domain als einbettbar (true) oder gesperrt (false) merken. */
  onEmbed: (url: string, ok: boolean) => void;
  /** F-43 Rest: gesperrte Source in den Launcher verschieben (speichern, Tab schließen). */
  onToLauncher: (tab: string, url: string) => void;
  /** F-36: Lesezeichen aus dem Browser importieren. */
  onImportBookmarks?: () => void;
  onClose: () => void;
  onStartSwap: () => void;
  onSetSize: (w: number, h: number) => void;
  onReset: () => void;
  onToggleMaximize: () => void;
  /** F-155: Größen-Modus für dieses Panel starten (Alt/⌥+A). */
  onSizeKeys?: () => void;
  /** Kurze Meldung für den Nutzer (z. B. „Adresse kopiert“). */
  notify: (text: string) => void;
  /** F-14, F-20, F-30 bis F-32: Lesezeichen und Kategorien der ganzen Arbeitsfläche. */
  ws: Workspace;
  dispatch: (a: Action) => void;
  /** F-21: Lesezeichen in diesem Panel öffnen. */
  onOpenBookmark: (url: string) => void;
  /** F-27: andere Fenster, in die sich das Panel verschieben lässt (Hauptfenster: id ''). */
  windows: Named[];
  /** F-27: Panel (whole = ganze Area) in ein Fenster verschieben; null = neues Fenster. */
  onToWindow: (win: string | null, whole: boolean) => void;
  /** F-28: Ziele für dieses Panel (whole = ganze Area) in allen Fenstern. */
  moveTargets: (whole: boolean) => MoveTarget[];
  /** F-28: Panel (whole = ganze Area) auf ein Ziel legen. */
  onMove: (target: MoveTarget, whole: boolean) => void;
  /** F-06: Ist dieser Tab geladen? Fehlt = alle Tabs geladen. */
  awake?: (tab: string) => boolean;
  /** F-06: „Nicht pausieren“ umschalten. */
  onKeep?: () => void;
  /** F-06 Stufe 2: Portal ist sichtbar, aber pausiert (Platzhalter statt Seite). */
  asleep?: boolean;
  /** F-06 Stufe 2: Benutzung melden; wake = auch von Hand Pausiertes wecken (Klick). */
  onUse?: (wake: boolean) => void;
  /** F-06 Stufe 2: dieses Portal jetzt pausieren. */
  onPauseNow?: () => void;
  /** F-06 Stufe 2: „Nicht pausieren“ für den sichtbaren Tab umschalten. */
  /** F-201: ohne Angabe der vordere Tab */
  onKeepTab?: (tab?: string) => void;
  /** F-202: Pausiert eine Source mit dieser Adresse nie (Library)? */
  keptBySource?: (url: string | undefined) => boolean;
  /** F-202: gespeicherte Source zu dieser Adresse (für das Pause-Menü am Tab) */
  sourceOf?: (url: string | undefined) => { id: string; keep: boolean } | undefined;
  onKeepSource?: (id: string, keep: boolean) => void;
  /** F-202: Einstellungen an der Stelle „Pausieren“ öffnen */
  onPauseSettings?: () => void;
  /** F-194: Zoom dieses Portals setzen (Prozent). */
  onZoom?: (zoom: number) => void;
  /** F-194 Stufe 2: „Breite halten“ ein- oder ausschalten. */
  onFit?: (on: boolean) => void;
  /** F-189: Text ohne Adresse – im Web suchen (neuer Browser-Tab). */
  onSearch?: (query: string) => void;
  /** F-189: Ein Link wird gerade von außen über E-Sources gezogen – Ablagefläche zeigen. */
  linkDrag?: boolean;
  /** F-189: Link als neuen Tab in diesem Portal öffnen. */
  onOpenNewTab?: (url: string) => void;
  /** F-189: Name der Suchmaschine für den Vorschlag „im Web suchen“. */
  engineName?: string;
}

/** Seitenleiste im Panel: Sammlung oder Lesezeichen bearbeiten. */
type Drawer = null | { kind: 'collection' } | { kind: 'edit'; bookmark: Bookmark; isNew: boolean; back: boolean };

const pct = (v: number) => `${Math.round(v * 100)} %`;

/** F-135: Warum Zurück/Vor gesperrt sind – der Verlauf fremder Seiten im Panel ist nicht lesbar. */
const NAV_HINT = 'Noch kein Schritt zum Blättern in diesem Tab.';
const NAV_OTHER = 'Zurück und Vor gehen zuerst in dem Portal, in dem du zuletzt die Source gewechselt hast – dort zuerst blättern.';

/** Symbol für die Größen-Voreinstellungen: Rahmen der Fläche mit einem Panel darin und Pfeil zur Ecke. */
const SizeIcon = (
  <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true" className="icon">
    <rect x="1.5" y="1.5" width="13" height="13" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
    <rect x="3" y="3" width="6" height="6" rx="0.8" fill="currentColor" opacity="0.55" />
    <path d="M9.5 9.5 L13 13 M13 10 V13 H10" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * F-09: Knopf „Panel auf diese Area legen“ – ein Plus im Stil des ES-Logos:
 * roter Verlauf, silberne Lichtkante (wie der E-Sources-Knopf im Portfolio).
 */
/** F-167: Farbe und Satz zur Fokus-Auswirkung eines Plus-Knopfs. */
export interface Fx {
  color: string;
  text: string;
}

/** F-09 Plus zum Stapeln; F-167: mit `color` in der Ampelfarbe der Fokus-Auswirkung. */
export function StackAddIcon(props: { color?: string } = {}) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <defs>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={props.color ?? '#a3352a'} />
          <stop offset="1" stopColor={props.color ?? '#5a130c'} stopOpacity={props.color ? 0.7 : 1} />
        </linearGradient>
        <linearGradient id={`${id}e`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f1f1f4" />
          <stop offset="1" stopColor="#8d8d96" />
        </linearGradient>
      </defs>
      <path
        d="M10.6 4.2a1 1 0 0 1 1-1h.8a1 1 0 0 1 1 1v6.4h6.4a1 1 0 0 1 1 1v.8a1 1 0 0 1-1 1h-6.4v6.4a1 1 0 0 1-1 1h-.8a1 1 0 0 1-1-1v-6.4H4.2a1 1 0 0 1-1-1v-.8a1 1 0 0 1 1-1h6.4z"
        fill={`url(#${id}f)`}
        stroke={`url(#${id}e)`}
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const FOCUSABLE = '[role="menuitem"], button, select, input:not([type="hidden"]), [tabindex]:not([tabindex="-1"])';

/**
 * Ausklappmenü (Größen, Panel-Optionen F-20, Kopfleiste). Die Liste hängt per Portal direkt an der
 * Seite und liegt mit fester Lage über allen Areas – sonst verschwindet sie unter Nachbar-Panels.
 * Sie klappt nach unten oder, wenn dort zu wenig Platz ist, nach oben auf und scrollt notfalls.
 * Tastatur (NF-03): Öffnen setzt den Fokus auf den ersten Eintrag, ↑/↓/Pos1/Ende wandern,
 * Tab läuft durch die Liste und schließt sie an ihrem Ende; Esc schließt; beides führt zum Knopf zurück.
 */
/**
 * F-150: Adresse aus einem hineingezogenen Element – Link aus einem anderen Browser-Tab, der
 * Lesezeichenleiste oder der Sammlung (text/uri-list), sonst Text, der wie eine Adresse aussieht.
 */
export function linkFromDrop(dt: Pick<DataTransfer, 'getData'>): string {
  const list = dt
    .getData('text/uri-list')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith('#'));
  if (list) return list;
  const text = dt.getData('text/plain').trim();
  return /^\S+\.\S+$/.test(text) || /^https?:\/\//.test(text) ? text : '';
}

export function Menu(props: { icon: ReactNode; label: string; children: (close: () => void) => ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [place, setPlace] = useState<{ up: boolean; max: number; right: number; y: number; toolbar: boolean } | null>(null);
  const close = (focusButton = false) => {
    setOpen(false);
    if (focusButton) btn.current?.focus();
  };
  useLayoutEffect(() => {
    if (!open) return setPlace(null);
    const fit = () => {
      const b = btn.current?.getBoundingClientRect();
      const ul = list.current;
      if (!b || !ul) return;
      const gap = 8;
      const below = window.innerHeight - b.bottom - gap;
      const above = b.top - gap;
      const up = ul.scrollHeight > below && above > below;
      setPlace({
        up,
        max: Math.max(120, up ? above : below),
        // rechtsbündig zum Knopf; ragte die Liste links hinaus (Knopf ganz links), rückt sie nach rechts
        right: Math.max(gap, Math.min(window.innerWidth - b.right, window.innerWidth - ul.offsetWidth - gap)),
        y: up ? window.innerHeight - b.top + 2 : b.bottom + 2,
        toolbar: !!ref.current?.closest('.toolbar'),
      });
    };
    fit();
    window.addEventListener('resize', fit);
    window.addEventListener('scroll', fit, true);
    return () => {
      window.removeEventListener('resize', fit);
      window.removeEventListener('scroll', fit, true);
    };
  }, [open]);
  // Fokus auf den ersten Eintrag, sobald die Liste liegt.
  useEffect(() => {
    if (open && place) list.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  }, [open, !!place]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => {
      const t = e.target as globalThis.Node;
      if (!ref.current?.contains(t) && !list.current?.contains(t)) setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);
  const onKey = (e: KeyboardEvent<HTMLUListElement>) => {
    const all = [...(list.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].filter((el) => !el.hasAttribute('disabled'));
    const at = all.indexOf(document.activeElement as HTMLElement);
    // Tab wandert durch die Liste; wer sie am Anfang oder Ende verlässt, schließt sie.
    if (e.key === 'Tab') {
      if ((e.shiftKey && at <= 0) || (!e.shiftKey && at === all.length - 1)) {
        e.preventDefault();
        close(true);
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      return close(true);
    }
    // Pfeiltasten nur auf Menüeinträgen – in Auswahllisten und Feldern behalten sie ihre Wirkung.
    const target = e.target as HTMLElement;
    const isItem = (el: Element) => ['menuitem', 'menuitemcheckbox'].includes(el.getAttribute('role') ?? '');
    if (!isItem(target)) return;
    const items = all.filter(isItem);
    const i = items.indexOf(target);
    const go = (k: number) => items[(k + items.length) % items.length]?.focus();
    const keys: Record<string, () => void> = {
      ArrowDown: () => go(i + 1),
      ArrowUp: () => go(i - 1),
      Home: () => go(0),
      End: () => go(items.length - 1),
    };
    const f = keys[e.key];
    if (!f) return;
    e.preventDefault();
    e.stopPropagation();
    f();
  };
  return (
    <div className="menu" ref={ref}>
      <button
        ref={btn}
        className={props.className}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        title={props.label}
        aria-label={props.label}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {props.icon}
      </button>
      {open &&
        createPortal(
          <ul
            ref={list}
            className={`menu__list menu__list--float${place?.up ? ' menu__list--up' : ''}${place?.toolbar ? ' menu__list--toolbar' : ''}`}
            role="menu"
            aria-label={props.label}
            onKeyDown={onKey}
            style={
              place
                ? { right: place.right, maxHeight: place.max, ...(place.up ? { top: 'auto', bottom: place.y } : { top: place.y, bottom: 'auto' }) }
                : { visibility: 'hidden', top: 0, right: 0 }
            }
          >
            {props.children(() => close(true))}
          </ul>,
          document.body,
        )}
    </div>
  );
}

export function Item(props: { onClick: () => void; children: ReactNode; disabled?: boolean; title?: string; checked?: boolean; icon?: IconName; hint?: string }) {
  // checked gesetzt = Schalter (menuitemcheckbox), Häkchen sichtbar und angesagt
  const check = props.checked !== undefined;
  // V49: hint = kurze sichtbare Erklärung unter dem Eintrag, als Beschreibung angesagt (NF-03)
  const hintId = useId();
  return (
    <li>
      <button type="button" className={props.hint ? `has-hint${check ? ' is-check' : ''}${props.icon ? ' is-icon' : ''}` : undefined} role={check ? 'menuitemcheckbox' : 'menuitem'} aria-checked={check ? props.checked : undefined} aria-describedby={props.hint ? hintId : undefined} onClick={props.onClick} disabled={props.disabled} title={props.title}>
        {check && (
          <span className="menu__check" aria-hidden="true">
            {props.checked ? '✓' : ''}
          </span>
        )}
        {props.icon && <Icon name={props.icon} className="icon menu__icon" />}
        {props.children}
        {props.hint && (
          <span className="menu__hint" id={hintId}>
            {props.hint}
          </span>
        )}
      </button>
    </li>
  );
}

/** Überschrift einer Gruppe im Menü (z. B. ein Fenster); Bildschirmleser lesen sie mit. */
export function MenuHead(props: { children: ReactNode }) {
  return (
    <li role="presentation" className="menu__head">
      {props.children}
    </li>
  );
}

/**
 * F-28: Menü mit mehreren Seiten (z. B. „Verschieben nach …“). Beim Seitenwechsel springt der
 * Fokus auf den ersten Eintrag der neuen Seite (NF-03); schließt das Menü, beginnt es wieder vorn.
 */
export function MenuPages(props: { children: (page: string, go: (page: string) => void) => ReactNode }) {
  const [page, setPage] = useState('');
  const mark = useRef<HTMLLIElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    mark.current?.closest('ul')?.querySelector<HTMLElement>(`${FOCUSABLE}:not([disabled])`)?.focus();
  }, [page]);
  return (
    <>
      <li hidden ref={mark} />
      {props.children(page, setPage)}
    </>
  );
}

/** F-28: Ziele einer Verschiebung als Menüeinträge, nach Fenstern gruppiert. */
function MoveList(props: { targets: MoveTarget[]; here: string; windowName: (win: string) => string; onPick: (t: MoveTarget) => void; onNewWindow: () => void }) {
  const wins = [...new Set(props.targets.map((t) => t.win))].sort((a, b) => (a === props.here ? -1 : b === props.here ? 1 : 0));
  const label = (t: MoveTarget) => {
    if (!t.area) return `Ins ${props.windowName(t.win)}`;
    if (t.area === NEW_AREA) return `Eigener neuer Slot${t.disabled ? ' – kein Platz' : ''}`;
    return `In „${t.label}“ ablegen${t.count > 1 ? ` (${t.count})` : ''}${t.disabled ? ' – Stack voll' : ''}`;
  };
  return (
    <>
      {wins.map((w) => {
        // Im eigenen Fenster gibt es dafür „Aus dem Stapel lösen“.
        const items = props.targets.filter((t) => t.win === w && !(w === props.here && t.area === NEW_AREA));
        if (items.length === 0) return null;
        return (
          <li key={w || 'main'} role="none">
            <ul role="group" aria-label={w === props.here ? 'Dieser Desk' : props.windowName(w)} className="menu__group">
              <MenuHead>{w === props.here ? 'Dieser Desk' : props.windowName(w)}</MenuHead>
              {items.map((t) => (
                <Item key={`${t.win}/${t.area}`} icon={!t.area ? 'desk' : t.area === NEW_AREA ? 'slot' : 'stack'} disabled={t.disabled} onClick={() => props.onPick(t)}>
                  {label(t)}
                </Item>
              ))}
            </ul>
          </li>
        );
      })}
      <li className="menu__sep" role="separator" />
      <Item icon="newDesk" onClick={props.onNewWindow}>Neuer Desk</Item>
    </>
  );
}

export function PanelFrame(p: Props) {
  /** Was gerade umbenannt wird: der Panelname oder der Name der Area (F-128). */
  const [editing, setEditing] = useState<null | 'panel' | 'area'>(null);
  // F-194: Zoom-Feld unter der Lupe in der Kopfleiste
  // 'hover' = offen, solange die Maus über Lupe oder Feld ist; 'pin' = per Klick/Tastatur geöffnet, bleibt
  const [zoomOpen, setZoomOpen] = useState<null | 'hover' | 'pin'>(null);
  const zoomBtn = useRef<HTMLButtonElement>(null);
  const zoomTimer = useRef(0);
  // F-194 Stufe 2: Breite des Seitenbereichs messen – mit „Breite halten“ folgt der Zoom ihr
  const body = useRef<HTMLDivElement>(null);
  const [bodyW, setBodyW] = useState(0);
  const [bodyH, setBodyH] = useState(0);
  useLayoutEffect(() => {
    const el = body.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const w = Math.round(r.width);
      setFrameWidth(p.panel.id, w);
      setBodyW(w);
      setBodyH(Math.round(r.height));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [p.panel.id]);
  const zoomExact = shownZoom(p.panel, bodyW);
  const zoomNow = Math.round(zoomExact);
  // F-200 Stufe 2: Entwickler-Modus – Gerät eingepasst, Zoom-Test statt freiem Zoom
  const dv = p.panel.dev ? devFrame(p.panel.devView, bodyW, bodyH) : null;
  const devBox = dv?.device ? { left: Math.round((bodyW - dv.shown.w) / 2), top: Math.round((bodyH - dv.shown.h) / 2), width: dv.shown.w, height: dv.shown.h } : null;
  const frameStyle: CSSProperties | undefined = dv
    ? devBox
      ? { inset: 'auto', left: devBox.left, top: devBox.top, width: dv.page.w, height: dv.page.h, transform: `scale(${dv.scale})`, transformOrigin: '0 0' }
      : zoomStyle(dv.scale * 100)
    : zoomStyle(zoomExact);
  // so breit ist die Seite wirklich (bei 50 % ist Schluss – ein sehr schmaler Slot erreicht die gemerkte Breite nicht)
  const pagePx = p.panel.fit && bodyW > 0 ? Math.round((bodyW * 100) / zoomExact) : p.panel.fit;
  const zoomHover = (on: boolean) => {
    window.clearTimeout(zoomTimer.current);
    zoomTimer.current = window.setTimeout(() => setZoomOpen((o) => (on ? (o ?? 'hover') : o === 'hover' ? null : o)), on ? 120 : 450);
  };
  useEffect(() => () => window.clearTimeout(zoomTimer.current), []);
  // Mausrad über der Lupe zoomt direkt (nicht passiv, damit nichts anderes mitscrollt)
  useWheelZoom(zoomBtn, p.onZoom ? (dir) => p.onZoom?.(zoomStep(zoomNow, dir)) : null);
  const areaName = p.stack?.areaName ?? '';
  const [draft, setDraft] = useState(p.panel.name);
  const tab = activeTab(p.panel);
  const url = tab.url;
  const [address, setAddress] = useState(url ?? '');
  /** Zähler für „Neu laden“ je Tab: ein neuer Schlüssel lädt dessen iframe neu. */
  const [reloads, setReloads] = useState<Record<string, number>>({});
  // F-135: Schritte innerhalb der eingebetteten Seiten (gemeinsamer Browser-Verlauf)
  useSyncExternalStore(FH.subscribe, FH.getVersion);
  const frameKey = (t: { id: string; url?: string }) => `${p.panel.id}/${t.id}#${t.url}#${reloads[t.id] ?? 0}`;
  const liveKeys = p.panel.tabs.filter((t) => t.url).map(frameKey);
  const keysRef = useRef<string[]>([]);
  useEffect(() => {
    const now = new Set(liveKeys);
    FH.forget(keysRef.current.filter((k) => !now.has(k)));
    keysRef.current = liveKeys;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveKeys.join('|')]);
  useEffect(() => () => FH.forget(keysRef.current), []);
  const curKey = frameKey(tab);
  const backOk = FH.canBack(curKey) || canGoBack(p.panel);
  const fwdOk = FH.canForward(curKey) || canGoForward(p.panel);
  const goBack = () => {
    if (FH.canBack(curKey)) FH.back(curKey);
    else if (canGoBack(p.panel)) p.onHistory(-1);
    else p.notify(FH.hasSteps(curKey) ? NAV_OTHER : NAV_HINT);
  };
  const goForward = () => {
    if (FH.canForward(curKey)) FH.forward(curKey);
    else if (canGoForward(p.panel)) p.onHistory(1);
    else p.notify(FH.hasSteps(curKey) ? NAV_OTHER : NAV_HINT);
  };
  // F-135: kurze Drehung als Rückmeldung beim Neuladen
  const [spin, setSpin] = useState(false);
  const reload = () => {
    setReloads((r) => ({ ...r, [tab.id]: (r[tab.id] ?? 0) + 1 }));
    setSpin(true);
    window.setTimeout(() => setSpin(false), 600);
  };
  useEffect(() => setAddress(url ?? ''), [url, tab.id]);
  const [drawer, setDrawer] = useState<Drawer>(null);
  // F-203: Startet eine Tour (z. B. aus der Library), geht die Library zu – sonst verdeckt sie die Schritte
  useEffect(() => {
    const on = () => setDrawer(null);
    window.addEventListener(TOUR_EVENT, on);
    return () => window.removeEventListener(TOUR_EVENT, on);
  }, []);
  const saved = bookmarkOf(p.ws, url, p.panel.id);
  const ownCount = collectionSize(p.ws, p.panel.id);
  /** F-14: aktuelle Seite speichern bzw. ihr Lesezeichen bearbeiten. */
  const editCurrent = (back = false) => {
    if (!url) return;
    setDrawer(
      saved
        ? { kind: 'edit', bookmark: saved, isNew: false, back }
        : { kind: 'edit', bookmark: draftFor(url, tabLabel(tab), p.panel.id), isNew: true, back },
    );
  };
  /** Tab, der gerade gezogen wird (F-22). */
  const dragTab = useRef<string | null>(null);
  /** F-150: Ein Link wird gerade über das leere Panel gezogen. */
  const [linkOver, setLinkOver] = useState(false);
  const linkDrag = (e: DragEvent<HTMLDivElement>) =>
    !url && !dragTab.current && [...e.dataTransfer.types].some((t) => t === 'text/uri-list' || t === 'text/plain');
  const linkDrop = (e: DragEvent<HTMLDivElement>) => {
    if (!linkDrag(e)) return;
    e.preventDefault();
    setLinkOver(false);
    const link = linkFromDrop(e.dataTransfer);
    if (link) p.onNavigate(link);
    else p.notify('Das ist kein Link – bitte eine Adresse hineinziehen.');
  };
  const inputRef = useRef<HTMLInputElement>(null);
  // F-189: Vorschläge unter der Adresszeile
  const [sugOpen, setSugOpen] = useState(false);
  const [sugSel, setSugSel] = useState(0);
  const sugId = useId().replace(/:/g, '');
  const typed = address.trim();
  type Sug = { kind: 'go' | 'bm'; url: string; label: string } | { kind: 'web'; label: string };
  const sugItems: Sug[] =
    sugOpen && typed && typed !== (url ?? '')
      ? [
          ...(looksLikeAddress(typed) ? [{ kind: 'go' as const, url: typed, label: WEB_TEXT.go(typed) }] : []),
          ...searchAll(p.ws, typed, 6).map((h) => ({ kind: 'bm' as const, url: h.bookmark.url, label: h.bookmark.title || hostOf(h.bookmark.url) })),
          ...(p.onSearch ? [{ kind: 'web' as const, label: WEB_TEXT.searchFor(typed, p.engineName ?? 'Google') }] : []),
        ]
      : [];
  const sugShown = sugItems.length > 0;
  const pickSug = (it: Sug) => {
    if (it.kind === 'web') {
      p.onSearch?.(typed);
      setAddress(url ?? '');
    } else if (it.kind === 'bm') p.onOpenBookmark(it.url);
    else p.onNavigate(it.url);
  };
  /** F-189: Link über der Tab-Leiste bzw. über einer Hälfte der Ablagefläche. */
  const [tabsOver, setTabsOver] = useState(false);
  const [padOver, setPadOver] = useState<null | 'here' | 'tab'>(null);
  useEffect(() => {
    if (!p.linkDrag) setPadOver(null);
    if (!p.linkDrag) setTabsOver(false);
  }, [p.linkDrag]);
  const hasLink = (e: DragEvent) => [...e.dataTransfer.types].some((t) => t === 'text/uri-list' || t === 'text/plain');
  const padZone = (zone: 'here' | 'tab', label: string) => (
    <div
      className={`linkpad__zone${padOver === zone ? ' is-over' : ''}`}
      onDragOver={(e) => {
        if (!hasLink(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setPadOver(zone);
      }}
      onDragLeave={() => setPadOver((z) => (z === zone ? null : z))}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setPadOver(null);
        const link = linkFromDrop(e.dataTransfer);
        if (!link) return p.notify('Das ist kein Link – bitte eine Adresse hineinziehen.');
        if (zone === 'here') p.onNavigate(link);
        else p.onOpenNewTab?.(link);
      }}
    >
      {label}
    </div>
  );
  const swipe = useSwipe(p.stack?.onStep);
  // E-Source darf sich selbst laden (F-18), aber nur auf oberster Ebene: Eine eingebettete
  // E-Source lädt sich nicht noch einmal, sonst verschachtelt es sich endlos.
  const embedded = window.self !== window.top;
  const base = new URL(import.meta.env.BASE_URL, window.location.origin).href;
  const isSelf = (u: string | undefined) => !!u && embedded && isSelfUrl(u, base);
  /** Anzahl auf dieser Area für die Ampel (F-26). */
  const load = p.stack ? p.stack.members.length : 1;
  const tabCount = p.panel.tabs.length;
  /** F-06: Tab mit Adresse, der gerade nicht geladen ist. */
  const isPaused = (t: { id: string; url?: string }) => !!t.url && (t.id === tab.id ? !!p.asleep : !!p.awake && !p.awake(t.id));

  /** Neuer Tab mit Ampel-Regel (F-26): Hinweis bei 5, Grenze bei 9. */
  const addTab = () => {
    if (tabCount >= TAB_MAX) return p.onHint(`Mehr als ${TAB_MAX} Tabs gehen nicht. Lege lieber ein neues Portal an.`);
    p.onAddTab();
    if (tabCount + 1 === FOCUS_WARN) p.onHint(`Jetzt sind ${FOCUS_WARN} Tabs offen. Ab hier nehmen Fokus und Übersicht ab.`);
  };
  const dropTab = (e: DragEvent, to: number) => {
    e.preventDefault();
    const id = dragTab.current;
    dragTab.current = null;
    if (id) p.onMoveTab(id, to);
  };

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  // F-114: Hinweis bekommt den Tastaturfokus; nach „Verstanden“ geht er dorthin zurück, wo er vorher war.
  const hintBtn = useRef<HTMLButtonElement>(null);
  const hintBack = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!p.hint) return;
    const prev = document.activeElement;
    if (prev instanceof HTMLElement && prev !== hintBtn.current) hintBack.current = prev;
    hintBtn.current?.focus({ preventScroll: true });
  }, [p.hint]);
  const hintDone = () => {
    const back = hintBack.current;
    hintBack.current = null;
    p.onHintDone();
    if (back && back.isConnected) back.focus({ preventScroll: true });
  };

  const startEdit = (what: 'panel' | 'area' = 'panel') => {
    setDraft(what === 'area' ? areaName : p.panel.name);
    setEditing(what);
  };
  const commit = () => {
    if (editing === 'area') p.stack?.onRenameArea(draft);
    else p.onRename(draft);
    setEditing(null);
  };
  const copyUrl = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      p.notify('Adresse kopiert.');
    } catch {
      p.notify('Kopieren nicht möglich – der Browser hat den Zugriff verweigert.');
    }
  };

  const cls = [
    'win',
    p.active && 'win--active',
    p.swapSource && 'win--swap-source',
    p.swapTarget && 'win--swap-target',
    p.dragging && 'win--dragging',
    p.hint && 'win--alert',
    !p.panel.dev && p.tint?.frame && 'win--framed',
    !p.panel.dev && p.tint?.accent && 'win--tinted',
    p.panel.dev && 'win--dev',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section
      className={cls}
      onMouseDown={p.onActivate}
      onPointerDownCapture={() => p.onUse?.(true)}
      onFocusCapture={() => p.onUse?.(false)}
      // Das Portal selbst scrollt nie (overflow: hidden). Fokus auf ein breites Element (z. B. das
      // Menü in einem schmalen Portal) schob den Inhalt sonst seitlich weg, und er blieb verschoben.
      onScroll={(e) => {
        const el = e.currentTarget;
        if (e.target !== el || (!el.scrollLeft && !el.scrollTop)) return;
        el.scrollLeft = 0;
        el.scrollTop = 0;
      }}
      aria-label={p.panel.name}
      data-panel-id={p.panel.id}
      style={
        {
          '--load': loadColor(load),
          // F-162: eigene Farben gelten nur in diesem Portal
          ...(!p.panel.dev && p.tint?.frame ? { '--frame': p.tint.frame } : {}),
          ...(!p.panel.dev && p.tint?.accent ? { '--accent-rgb': rgbOf(p.tint.accent).join(', ') } : {}),
        } as CSSProperties
      }
    >
        {/* Kopfleiste wie im Browser (F-14): Schließen · Zurück · Vor · Neu laden · Home · Adresse · Größen · Name · Menü · Stapeln (F-140) */}
        <header className="win__bar">
          {/* F-140: Schließen ganz links */}
          <button type="button" className="win__close" onClick={p.onClose} title="Portal schließen" aria-label="Portal schließen">
            <Icon name="close" size={14} />
          </button>
          <div className="win__nav">
            {/* F-135, NF-03: Nicht verfügbare Knöpfe bleiben erreichbar (aria-disabled) und sagen beim Klick, warum. */}
            <button
              type="button"
              className={backOk ? undefined : 'is-off'}
              aria-disabled={!backOk}
              onClick={goBack}
              title={backOk ? 'Zurück' : 'Zurück – noch kein Schritt in diesem Tab'}
              aria-label="Zurück"
            >
              ←
            </button>
            <button
              type="button"
              className={fwdOk ? undefined : 'is-off'}
              aria-disabled={!fwdOk}
              onClick={goForward}
              title={fwdOk ? 'Vor' : 'Vor – noch kein Schritt zurück gemacht'}
              aria-label="Vor"
            >
              →
            </button>
            <button
              type="button"
              className={!url ? 'is-off' : spin ? 'is-spin' : undefined}
              aria-disabled={!url}
              onClick={() => {
                if (!url) return p.notify('Dieser Tab ist leer – es gibt nichts neu zu laden.');
                reload();
              }}
              title="Neu laden"
              aria-label="Neu laden"
            >
              <span className="win__spin" aria-hidden="true">⟳</span>
            </button>
            <button
              type="button"
              className={p.panel.home ? undefined : 'is-off'}
              aria-disabled={!p.panel.home}
              onClick={() => {
                if (!p.panel.home) return p.notify('Noch keine Startseite. Im Menü ⋮ „Als Startseite festlegen“ wählen.');
                // Schon auf der Startseite: frisch laden, damit sie wieder oben beginnt.
                if (url === p.panel.home) reload();
                else p.onHome();
              }}
              title={p.panel.home ? `Startseite: ${p.panel.home}` : 'Noch keine Startseite'}
              aria-label="Startseite"
            >
              ⌂
            </button>
          </div>
          {/* F-20: Sammlung des Panels */}
          <button
            type="button"
            className={drawer?.kind === 'collection' ? 'win__coll win__coll--on' : 'win__coll'}
            onClick={() => setDrawer(drawer?.kind === 'collection' ? null : { kind: 'collection' })}
            title={`Library dieses Portals (${ownCount} ${ownCount === 1 ? 'Source' : 'Sources'}) · ${TERMS.library}`}
            aria-label="Library dieses Portals öffnen"
            aria-expanded={drawer?.kind === 'collection'}
          >
            {CollectionIcon}
          </button>
          <form
            className="win__address"
            onSubmit={(e) => {
              e.preventDefault();
              // F-189: gewählter Vorschlag (Adresse, Source aus der Library, Web-Suche); sonst Adresse
              if (sugItems[sugSel]) pickSug(sugItems[sugSel]);
              else p.onNavigate(address);
              setSugOpen(false);
              (document.activeElement as HTMLElement | null)?.blur();
            }}
          >
            <input
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setSugOpen(true);
                setSugSel(0);
              }}
              onFocus={(e) => e.target.select()}
              onBlur={() => setSugOpen(false)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  if (sugShown) return setSugOpen(false);
                  setAddress(url ?? '');
                  e.currentTarget.blur();
                }
                if (sugShown && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
                  e.preventDefault();
                  const n = sugItems.length;
                  setSugSel((i) => (i + (e.key === 'ArrowDown' ? 1 : -1) + n) % n);
                }
              }}
              placeholder="Adresse oder Suchwort, z. B. wikipedia.org"
              aria-label="Adresse"
              spellCheck={false}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={sugShown}
              aria-controls={sugId}
              aria-activedescendant={sugShown ? `${sugId}-${sugSel}` : undefined}
            />
            {/* F-189: Vorschläge – Adresse, Sources aus der Library, zuletzt die Web-Suche */}
            {sugShown && (
              <ul className="addrsug" id={sugId} role="listbox" aria-label={WEB_TEXT.suggest} onMouseDown={(e) => e.preventDefault()}>
                {sugItems.map((it, i) => (
                  <li
                    key={i}
                    id={`${sugId}-${i}`}
                    role="option"
                    aria-selected={i === sugSel}
                    className={i === sugSel ? 'addrsug__item is-on' : 'addrsug__item'}
                    onMouseEnter={() => setSugSel(i)}
                    onClick={() => {
                      pickSug(it);
                      setSugOpen(false);
                    }}
                  >
                    <Icon name={it.kind === 'bm' ? 'source' : it.kind === 'web' ? 'search' : 'portal'} size={13} />
                    <span className="addrsug__title">{it.label}</span>
                    {it.kind === 'bm' && <span className="addrsug__where">{hostOf(it.url)}</span>}
                    {it.kind === 'web' && <span className="addrsug__where">↗ eigenes Fenster</span>}
                  </li>
                ))}
              </ul>
            )}
            {/* F-14: Lesezeichen speichern – Stern in der Adresszeile wie im Browser */}
            {url && (
              <button
                type="button"
                className={saved ? 'win__star win__star--on' : 'win__star'}
                onClick={() => editCurrent()}
                title={saved ? 'Source bearbeiten' : 'Source in der Library speichern'}
                aria-label={saved ? 'Source bearbeiten' : 'Source in der Library speichern'}
              >
                <Icon name={saved ? 'starOn' : 'star'} size={14} />
              </button>
            )}
          </form>
          {/* F-194: Zoom – Lupe immer sichtbar, zeigt den Wert, wenn er nicht 100 % ist */}
          {p.onZoom && (
            <button
              type="button"
              ref={zoomBtn}
              className={zoomNow !== ZOOM_DEFAULT || p.panel.fit ? 'win__zoombtn win__zoombtn--on' : 'win__zoombtn'}
              onClick={() => setZoomOpen((o) => (o === 'pin' ? null : 'pin'))}
              onPointerEnter={(e) => e.pointerType === 'mouse' && zoomHover(true)}
              onPointerLeave={(e) => e.pointerType === 'mouse' && zoomHover(false)}
              title={p.panel.fit ? ZOOM_TEXT.btnFitTitle(zoomNow, pagePx ?? p.panel.fit) : ZOOM_TEXT.btnTitle(zoomNow)}
              aria-label={ZOOM_TEXT.btnLabel(zoomNow, pagePx)}
              aria-expanded={!!zoomOpen}
              aria-haspopup="true"
            >
              <Icon name="zoom" size={14} />
              {(zoomNow !== ZOOM_DEFAULT || p.panel.fit) && <span className="win__zoomval">{p.panel.fit ? '↔ ' : ''}{zoomNow} %</span>}
            </button>
          )}
          {/* F-15: Lineal – in der Kopfzeile nur im Entwickler-Modus (Leiste); sonst über ⋮ und die Suche (F-200 Stufe 2) */}
          <button
            type="button"
            className="win__max"
            onClick={p.onToggleMaximize}
            title={p.maximized ? 'Verkleinern (Esc)' : 'Maximieren'}
            aria-label={p.maximized ? 'Verkleinern' : 'Maximieren'}
          >
            <Icon name={p.maximized ? 'minimize' : 'maximize'} size={14} />
          </button>
          {!p.maximized && (
            <Menu icon={SizeIcon} label="Größe wählen (Voreinstellungen)">
              {(close) => [
                ...SIZE_PRESETS.map((s) => (
                  <Item
                    key={s.label}
                    onClick={() => {
                      p.onSetSize(s.w, s.h);
                      close();
                    }}
                  >
                    {s.label}
                  </Item>
                )),
                p.onSizeKeys && (
                  <Item
                    key="keys"
                    onClick={() => {
                      close();
                      p.onSizeKeys?.();
                    }}
                  >
                    Per Tastatur und Mausrad … (Alt/⌥+A)
                  </Item>
                ),
              ]}
            </Menu>
          )}
          <div
            className={p.onDragStart ? 'win__title win-drag' : 'win__title'}
            onPointerDown={(e) => {
              if (!editing && e.button === 0) p.onDragStart?.(e);
            }}
            onDoubleClick={() => startEdit('panel')}
            title={
              (areaName ? `Slot „${areaName}“ · Portal „${p.panel.name}“ · ` : `Portal „${p.panel.name}“ · `) +
              (p.onDragStart ? 'Ziehen: Mitte eines Portals = tauschen, Rand = an dieser Position einsetzen · Doppelklick zum Umbenennen' : 'Doppelklick zum Umbenennen')
            }
          >
            {editing ? (
              <input
                ref={inputRef}
                className="win__name-input"
                title={DIALOG_TEXT.renameHint}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commit();
                  if (e.key === 'Escape') setEditing(null);
                }}
                aria-label={editing === 'area' ? 'Name des Slots' : 'Portalname'}
              />
            ) : areaName ? (
              // F-128: im Stapel groß die Area, klein darunter das aktive Panel
              <>
                <span
                  className="win__area"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    startEdit('area');
                  }}
                >
                  {areaName}
                </span>
                <span className="win__name win__name--sub">{p.panel.name}</span>
              </>
            ) : (
              <span className="win__name">{p.panel.name}</span>
            )}
          </div>
          {/* F-163: Kategorie nie nur als Farbe – Name steht dabei; Klick öffnet „Farben“ (NF-03) */}
          {p.category && (
            <button
              type="button"
              className="win__cat"
              title={CATEGORY_TEXT.badge(p.category.name)}
              aria-label={CATEGORY_TEXT.badge(p.category.name)}
              onClick={p.onCategory ?? p.onColors}
            >
              {p.category.color && <span className="win__cat-dot" aria-hidden="true" style={{ background: p.category.color }} />}
              {p.category.icon && <Icon name={p.category.icon} size={14} className="icon win__cat-icon" />}
              <span className="win__cat-name">{p.category.name}</span>
            </button>
          )}
          {/* Panel-Optionen (F-20); Sammlung, Verhalten und Szenarien kommen später dazu. */}
          <Menu icon={<Icon name="more" size={16} />} label="Portal-Optionen">
            {(close) => {
              const run = (f: () => void) => () => {
                f();
                close();
              };
              return (
                <MenuPages>
                  {(page, go) =>
                    page ? (
                      // F-28: zweite Seite „Verschieben nach …“
                      <>
                        <Item icon="back" onClick={() => go('')}>Zurück</Item>
                        <MenuHead>{page === 'area' ? `Ganzen Slot „${areaName || p.panel.name}“ verschieben` : `„${p.panel.name}“ verschieben`}</MenuHead>
                        <MoveList
                          targets={p.moveTargets(page === 'area')}
                          here={p.panel.win ?? ''}
                          windowName={(w) => [{ id: '', name: 'Main Desk' }, ...p.windows].find((x) => x.id === w)?.name ?? w}
                          onPick={(t) => run(() => p.onMove(t, page === 'area'))()}
                          onNewWindow={run(() => p.onToWindow(null, page === 'area'))}
                        />
                      </>
                    ) : (
                <>
                  <Item icon="library" onClick={run(() => setDrawer({ kind: 'collection' }))}>Library ({ownCount})</Item>
                  {url && <Item icon={saved ? 'starOn' : 'star'} onClick={run(() => editCurrent())}>{saved ? 'Source bearbeiten' : 'Source in der Library speichern'}</Item>}
                  <li className="menu__sep" role="separator" />
                  <Item icon="newTab" onClick={run(addTab)}>Neuer Tab</Item>
                  <Item icon="stackOn" onClick={run(p.onAddHere)}>Neues Portal auf „{p.panel.name}“ legen</Item>
                  {/* F-27, F-28: Panel oder ganze Area auf eine andere Area, auch in ein anderes Fenster */}
                  <li className="menu__sep" role="separator" />
                  <Item icon="move" onClick={() => go('panel')}>Portal verschieben …</Item>
                  {p.stack && <Item icon="move" onClick={() => go('area')}>Ganzen Slot verschieben …</Item>}
                  {p.stack &&
                    (() => {
                      const own = p.moveTargets(false).find((t) => t.win === (p.panel.win ?? '') && t.area === NEW_AREA);
                      return (
                        <Item
                          icon="detach"
                          disabled={!own || own.disabled}
                          title={!own || own.disabled ? 'Auf dem Bildschirm ist kein Slot mehr frei.' : undefined}
                          onClick={run(() => own && p.onMove(own, false))}
                        >
                          Aus dem Stack lösen{!own || own.disabled ? ' – kein Platz' : ''}
                        </Item>
                      );
                    })()}
                  <li className="menu__sep" role="separator" />
                  {/* F-200: Entwickler-Modus je Portal */}
                  <Item icon="dev" checked={!!p.panel.dev} hint={DEV_TEXT.menuHint} onClick={run(() => p.dispatch({ type: 'devPanel', id: p.panel.id }))}>
                    {DEV_TEXT.on}
                  </Item>
                  <Item icon="ruler" onClick={run(() => p.dispatch({ type: 'rulerPanel', id: p.panel.id }))}>
                    {rulerShown(p.ws, p.panel) ? 'Lineal in diesem Portal ausblenden' : 'Lineal in diesem Portal zeigen'}
                  </Item>
                  {p.onZoom && (
                    // F-194: Zoom – Menü bleibt offen, damit man mehrmals klicken kann
                    <li className="menu__zoom" role="group" aria-label={ZOOM_TEXT.label}>
                      <Icon name="zoom" className="icon menu__icon" />
                      <span className="menu__zoom-label" aria-hidden="true">{ZOOM_TEXT.label}</span>
                      <button type="button" role="menuitem" aria-label={ZOOM_TEXT.out} title={ZOOM_TEXT.outTitle} disabled={zoomNow <= ZOOM_STEPS[0]} onClick={() => p.onZoom?.(zoomStep(zoomNow, -1))}>
                        −
                      </button>
                      <button type="button" role="menuitem" className="menu__zoom-value" title={ZOOM_TEXT.resetTitle(zoomNow)} aria-label={ZOOM_TEXT.resetTitle(zoomNow)} onClick={() => p.onZoom?.(ZOOM_DEFAULT)}>
                        {ZOOM_TEXT.menuValue(zoomNow)}
                      </button>
                      <button type="button" role="menuitem" aria-label={ZOOM_TEXT.in} title={ZOOM_TEXT.inTitle} disabled={zoomNow >= ZOOM_STEPS[ZOOM_STEPS.length - 1]} onClick={() => p.onZoom?.(zoomStep(zoomNow, 1))}>
                        +
                      </button>
                    </li>
                  )}
                  {p.onKeep && (
                    <Item icon="pause" checked={!!p.panel.keep} title={PAUSE_TEXT.keepTitle} onClick={run(p.onKeep)}>
                      {PAUSE_TEXT.keepMenu}
                    </Item>
                  )}
                  {p.onKeepTab && p.panel.tabs.length > 1 && (
                    <Item icon="pause" checked={!!tab.keep || !!p.panel.keep} disabled={!!p.panel.keep} title={PAUSE_TEXT.keepTabTitle} onClick={run(() => p.onKeepTab?.())}>
                      {PAUSE_TEXT.keepTabMenu}
                    </Item>
                  )}
                  {p.onPauseNow && url && !p.asleep && (
                    <Item icon="pause" disabled={!!p.panel.keep || !!tab.keep} title={p.panel.keep || tab.keep ? PAUSE_TEXT.pauseNowKept : PAUSE_TEXT.pauseNowTitle} onClick={run(p.onPauseNow)}>
                      {PAUSE_TEXT.pauseNow}
                    </Item>
                  )}
                  <Item icon="rename" onClick={run(() => startEdit('panel'))}>Portal umbenennen</Item>
                  {p.onColors && <Item icon="colors" onClick={run(p.onColors)}>{TINT_TEXT.menu}</Item>}
                  {p.stack && <Item icon="rename" onClick={run(() => startEdit('area'))}>Slot umbenennen</Item>}
                  {!p.maximized && <Item icon="swap" onClick={run(p.onStartSwap)}>Mit anderem Portal tauschen</Item>}
                  {!p.maximized && <Item icon="restore" onClick={run(p.onReset)}>Portal zurücksetzen</Item>}
                  <Item icon={p.maximized ? 'minimize' : 'maximize'} onClick={run(p.onToggleMaximize)}>{p.maximized ? 'Verkleinern (Esc)' : 'Maximieren'}</Item>
                  {url && (
                    <>
                      <li className="menu__sep" role="separator" />
                      <Item icon="home" onClick={run(p.onSetHome)}>Als Startseite festlegen</Item>
                      <Item icon="copy" onClick={run(() => void copyUrl())}>Adresse kopieren</Item>
                      <Item icon="external" onClick={run(() => openOutside(url, 'tab'))}>In neuem Tab öffnen</Item>
                      <Item icon="newWindow" onClick={run(() => openOutside(url, 'window'))}>In neuem Browserfenster öffnen</Item>
                      {p.isBlocked(url) ? (
                        <Item icon="show" onClick={run(() => p.onEmbed(url, true))}>{hostOf(url)} doch hier anzeigen</Item>
                      ) : (
                        <Item icon="blocked" onClick={run(() => p.onEmbed(url, false))}>Source lädt nicht – {hostOf(url)} als gesperrt merken</Item>
                      )}
                    </>
                  )}
                </>
                    )
                  }
                </MenuPages>
              );
            }}
          </Menu>
          {/* F-09, F-140: Stapeln ganz rechts */}
          <button
            type="button"
            className="win__stack-add"
            onClick={p.onAddHere}
            title={`Neues Portal auf „${p.panel.name}“ legen (stapeln)${p.fx ? ` – ${p.fx.panel.text}` : ''}`}
            aria-label={`Neues Portal auf „${p.panel.name}“ legen${p.fx ? `, ${p.fx.panel.text}` : ''}`}
          >
            <StackAddIcon color={p.fx?.panel.color} />
          </button>
        </header>
        {p.panel.dev && dv && (
          <DevBar
            view={p.panel.devView}
            page={dv.page}
            ruler={rulerShown(p.ws, p.panel)}
            onView={(change) => {
              p.dispatch({ type: 'devView', id: p.panel.id, ...change });
              // Wunsch Enrico (V53): Gerät gewählt oder gedreht → Slot wächst auf das Seitenverhältnis des Geräts
              if (change.scale !== undefined || p.maximized) return;
              const cur = p.panel.devView ?? {};
              const next = change.device === null ? undefined : devSizeOf({ device: change.device ?? cur.device, turned: change.device !== undefined ? false : (change.turned ?? cur.turned) });
              const sec = body.current?.closest('section');
              const desk = sec?.closest('main');
              if (!next || !sec || !desk || !body.current) return;
              const d = desk.getBoundingClientRect();
              const r = sec.getBoundingClientRect();
              const b = body.current.getBoundingClientRect();
              const dx = r.width - b.width;
              const dy = r.height - b.height;
              const fit = Math.min(1, (d.width - dx) / next.w, (d.height - dy) / next.h);
              if (fit <= 0 || !d.width || !d.height) return;
              p.onSetSize(Math.min(1, (next.w * fit + dx) / d.width), Math.min(1, (next.h * fit + dy) / d.height));
            }}
            onRuler={() => p.dispatch({ type: 'rulerPanel', id: p.panel.id })}
            onEnd={() => {
              p.dispatch({ type: 'devPanel', id: p.panel.id });
              flash({ text: DEV_TEXT.switched(p.panel.name, false) });
            }}
          />
        )}
        {/* F-21, F-22: Tabs unter der Kopfleiste (die Kopfleiste bleibt der Griff zum Verschieben), Ampel an der unteren Kante (F-26) */}
        <div
          className={['tabs', p.stack && 'tabs--stacked', tabsOver && 'tabs--drop'].filter(Boolean).join(' ')}
          role="tablist"
          aria-label="Tabs"
          style={{ '--tabload': loadColor(tabCount) } as CSSProperties}
          title={tabsOver ? WEB_TEXT.tabbar : undefined}
          // F-189: Link von außen auf die Tab-Leiste = neuer Tab
          onDragOver={(e) => {
            if (dragTab.current || !p.onOpenNewTab || !hasLink(e)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            setTabsOver(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as globalThis.Node | null)) setTabsOver(false);
          }}
          onDrop={(e) => {
            if (dragTab.current || !p.onOpenNewTab) return;
            const link = linkFromDrop(e.dataTransfer);
            setTabsOver(false);
            if (!link) return;
            e.preventDefault();
            e.stopPropagation();
            p.onOpenNewTab(link);
          }}
        >
          {p.panel.tabs.map((t, i) => (
            <div
              key={t.id}
              role="tab"
              aria-selected={t.id === tab.id}
              // F-23: nur der sichtbare Tab liegt in der Tab-Reihenfolge; Pfeile wechseln (Muster „Tabs“ der WAI-ARIA)
              tabIndex={t.id === tab.id ? 0 : -1}
              onKeyDown={(e) => {
                const n = p.panel.tabs.length;
                const to = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
                if (to < 0 || e.target !== e.currentTarget) return;
                e.preventDefault();
                const el = e.currentTarget.parentElement;
                p.onSelectTab(p.panel.tabs[to].id);
                window.setTimeout(() => el?.querySelectorAll<HTMLElement>('[role="tab"]')[to]?.focus());
              }}
              className={['tab', t.id === tab.id && 'tab--on', isPaused(t) && 'tab--paused'].filter(Boolean).join(' ')}
              aria-description={isPaused(t) ? PAUSE_TEXT.paused : (t.keep || p.keptBySource?.(t.url)) && !p.panel.keep ? PAUSE_TEXT.tabKept : undefined}
              draggable
              onDragStart={(e) => {
                dragTab.current = t.id;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', t.url ?? '');
              }}
              onDragOver={(e) => dragTab.current && e.preventDefault()}
              onDrop={(e) => dropTab(e, i)}
              onClick={() => p.onSelectTab(t.id)}
              title={`${t.url ?? 'Neuer Tab'}${isPaused(t) ? ` · ${PAUSE_TEXT.paused}` : (t.keep || p.keptBySource?.(t.url)) && !p.panel.keep ? ` · ${PAUSE_TEXT.tabKept}` : ''}`}
            >
              <span className="tab__label">{tabLabel(t)}</span>
              {/* F-201/F-202: Pause-Zeichen vor dem × – Zustand auf einen Blick, Klick öffnet das Pause-Menü */}
              {t.url && !p.isBlocked(t.url) && (() => {
                const src = p.sourceOf?.(t.url);
                const kept = !!p.panel.keep || !!t.keep || !!src?.keep;
                const sleeping = !kept && isPaused(t);
                const state = kept ? PAUSE_TEXT.tabKept : sleeping ? PAUSE_TEXT.paused : PAUSE_TEXT.stateNormal;
                return (
                  <span className="tab__pause" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                    <Menu
                      className={`tab__keep${kept ? ' is-on' : sleeping ? ' is-asleep' : ''}`}
                      icon={<Icon name={kept ? 'keep' : 'pause'} size={13} />}
                      label={PAUSE_TEXT.tabMenu(tabLabel(t), state)}
                    >
                      {(close) => {
                        const run = (f: () => void) => () => {
                          f();
                          close();
                        };
                        return (
                          <>
                            <MenuHead>{PAUSE_TEXT.tabMenu(tabLabel(t), state)}</MenuHead>
                            {p.onKeepTab && (
                              <Item icon="keep" checked={!!t.keep || !!p.panel.keep} disabled={!!p.panel.keep} title={PAUSE_TEXT.keepTabTitle} hint={p.panel.keep ? PAUSE_TEXT.hintTabByPortal : PAUSE_TEXT.hintTab} onClick={run(() => p.onKeepTab?.(t.id))}>
                                {PAUSE_TEXT.keepTabMenu}
                              </Item>
                            )}
                            {p.onKeepSource && (
                              <Item icon="source" checked={!!src?.keep} disabled={!src} title={src ? PAUSE_TEXT.sourceKeepHint : PAUSE_TEXT.sourceNone} hint={src ? PAUSE_TEXT.hintSource : PAUSE_TEXT.hintSourceNone} onClick={run(() => src && p.onKeepSource?.(src.id, !src.keep))}>
                                {src ? PAUSE_TEXT.sourceKeepMenu : PAUSE_TEXT.sourceKeepMenuNone}
                              </Item>
                            )}
                            {p.onKeep && (
                              <Item icon="portal" checked={!!p.panel.keep} title={PAUSE_TEXT.keepTitle} hint={PAUSE_TEXT.hintPortal} onClick={run(p.onKeep)}>
                                {PAUSE_TEXT.keepPanelMenu}
                              </Item>
                            )}
                            {t.id === tab.id && p.onPauseNow && (
                              <Item icon="pause" disabled={kept} title={kept ? PAUSE_TEXT.pauseNowKept : PAUSE_TEXT.pauseNowTitle} hint={kept ? PAUSE_TEXT.hintPauseNowKept : PAUSE_TEXT.hintPauseNow} onClick={run(p.onPauseNow)}>
                                {PAUSE_TEXT.pauseNow}
                              </Item>
                            )}
                            {p.onPauseSettings && (
                              <Item icon="settings" hint={PAUSE_TEXT.hintSettings} onClick={run(p.onPauseSettings)}>
                                {PAUSE_TEXT.settingsMenu}
                              </Item>
                            )}
                          </>
                        );
                      }}
                    </Menu>
                  </span>
                );
              })()}
              <button
                type="button"
                className="tab__close"
                aria-label={`${tabLabel(t)} schließen`}
                title="Tab schließen"
                onClick={(e) => {
                  e.stopPropagation();
                  p.onCloseTab(t.id);
                }}
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="tabs__add"
            onClick={addTab}
            disabled={tabCount >= TAB_MAX}
            title={tabCount >= TAB_MAX ? `Höchstens ${TAB_MAX} Tabs je Portal` : `Neuer Tab${p.fx ? ` – ${p.fx.tab.text}` : ''}`}
            aria-label={`Neuer Tab${p.fx && tabCount < TAB_MAX ? `, ${p.fx.tab.text}` : ''}`}
            style={p.fx && tabCount < TAB_MAX ? { color: p.fx.tab.color } : undefined}
            onDragOver={(e) => dragTab.current && e.preventDefault()}
            onDrop={(e) => dropTab(e, tabCount - 1)}
          >
            +
          </button>
        </div>
        {/* F-67: Kopf- und Tab-Leiste gehen über die ganze Breite, die Stapel-Leiste beginnt darunter. */}
        <div className="win__row">
        <div className="win__main">
        {/* F-124: roter Schatten nach innen, wenn die Seite sich nicht einbetten lässt */}
        <div
          ref={body}
          className={['win__body', url && p.isBlocked(url) && 'win__body--blocked', linkOver && 'win__body--drop'].filter(Boolean).join(' ')}
          {...swipe}
          onDragOver={(e) => {
            if (!linkDrag(e)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            setLinkOver(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as globalThis.Node | null)) setLinkOver(false);
          }}
          onDrop={linkDrop}
        >
          {zoomOpen && p.onZoom && (
            <ZoomPanel
              zoom={zoomNow}
              name={p.panel.name}
              pinned={zoomOpen === 'pin'}
              onZoom={p.onZoom}
              fit={pagePx}
              onFit={p.onFit}
              onHover={zoomHover}
              onClose={(back) => {
                window.clearTimeout(zoomTimer.current);
                setZoomOpen(null);
                if (back) zoomBtn.current?.focus();
              }}
              anchor={zoomBtn}
            />
          )}
          {/* F-06: Tabs im Hintergrund bleiben eine Weile geladen (wie im Browser) und pausieren dann; sichtbar ist nur der aktive. */}
          {p.panel.tabs.map((t) =>
            t.url && !isSelf(t.url) && !p.isBlocked(t.url) && (t.id === tab.id ? !p.asleep : !p.awake || p.awake(t.id)) ? (
              <iframe
                key={`${t.id}#${t.url}#${reloads[t.id] ?? 0}`}
                onLoad={() => FH.loaded(frameKey(t))}
                className="win__frame"
                hidden={t.id !== tab.id}
                style={frameStyle}
                src={t.url}
                title={`${p.panel.name} – ${tabLabel(t)}`}
                // F-133: Nur die Domain von E-Source geht mit (Standard der Browser). Ohne sie
                // verweigern eingebettete Player wie YouTube den Dienst (Fehler 153).
                referrerPolicy="strict-origin-when-cross-origin"
                allow="fullscreen; picture-in-picture; encrypted-media; clipboard-write"
                allowFullScreen
                // Ohne allow-top-navigation: Die Seite darf E-Source nicht wegnavigieren.
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads"
              />
            ) : null,
          )}
          {/* F-189: Link von außen über einer Seite – hier öffnen oder als neuer Tab */}
          {p.linkDrag && url && (
            <div className="linkpad" aria-hidden="true" title={WEB_TEXT.padTitle}>
              {padZone('here', WEB_TEXT.here)}
              {p.onOpenNewTab && padZone('tab', WEB_TEXT.newTab)}
            </div>
          )}
          {isSelf(url) ? (
            <p className="win__placeholder win__placeholder--small">In einer eingebetteten E-Source lädt sich E-Source nicht noch einmal.</p>
          ) : url && p.isBlocked(url) ? (
            // F-43: Ersatzanzeige statt leerer grauer Fläche
            <div className="fallback">
              <p className="fallback__title">{hostOf(url)} lässt sich hier nicht anzeigen</p>
              <p className="fallback__text">Diese Source erlaubt nicht, in andere Seiten eingebettet zu werden. In der Desktop-App wird das später möglich.</p>
              {/* F-123: Tab oder eigenes Fenster */}
              <span className="fallback__choice">
                <button type="button" className="fallback__open" onClick={() => openOutside(url, 'tab')}>
                  ↗ In neuem Tab
                </button>
                <button type="button" className="fallback__open" onClick={() => openOutside(url, 'window')}>
                  ⧉ In neuem Browserfenster
                </button>
              </span>
              {/* F-43 Rest: hier liegt sie nur im Weg – ab in den Launcher (Alt/⌥+Z holt den Tab zurück) */}
              <button type="button" className="fallback__open fallback__launch" onClick={() => p.onToLauncher(tab.id, url)} title={`Source im Launcher ablegen und diesen Tab schließen · ${TERMS.launcher}`}>
                {LauncherIcon} In den Launcher verschieben
              </button>
              <button type="button" className="fallback__try" onClick={() => p.onEmbed(url, true)}>
                Trotzdem hier versuchen
              </button>
            </div>
          ) : url && p.asleep ? (
            // F-06 Stufe 2: sichtbar, aber pausiert – ein Klick lädt die Seite neu
            <button type="button" className="win__paused" onClick={() => p.onUse?.(true)} title={PAUSE_TEXT.wakeTitle}>
              <Icon name="pause" size={28} />
              <span className="win__paused-title">{PAUSE_TEXT.asleep}</span>
              <span className="win__paused-host">{hostOf(url)}</span>
            </button>
          ) : !url ? (
            <>
              <p className="win__placeholder">{p.panel.name}</p>
              {/* F-150: was man hier tun kann; Tastatur: über die Adresszeile */}
              <p className="win__hint">{linkOver ? 'Loslassen zum Öffnen' : 'Link in die Adresszeile eingeben oder hier hineinziehen'}</p>
              {p.share && (
                <p className="win__meta">
                  {pct(p.share.w)} breit × {pct(p.share.h)} hoch{p.stack ? ` · ${p.stack.members.length} Portale im Stack` : ''}
                </p>
              )}
            </>
          ) : null}
          {devBox && <div className="devscreen" style={devBox} aria-hidden="true" />}
          {rulerShown(p.ws, p.panel) && (
            <Ruler
              settings={p.ws.ruler}
              onStyle={(change) => p.dispatch({ type: 'rulerStyle', ...change })}
              onClose={() => p.dispatch({ type: 'rulerPanel', id: p.panel.id })}
            />
          )}
          {drawer?.kind === 'collection' && (
            <CollectionDrawer
              ws={p.ws}
              panelId={p.panel.id}
              panelName={p.panel.name}
              saved={!!saved}
              dispatch={p.dispatch}
              onOpen={(u) => {
                p.onOpenBookmark(u);
                setDrawer(null);
              }}
              onEdit={(b) => setDrawer({ kind: 'edit', bookmark: b, isNew: false, back: true })}
              onSaveCurrent={url ? () => editCurrent(true) : undefined}
              onImport={
                p.onImportBookmarks
                  ? () => {
                      setDrawer(null);
                      p.onImportBookmarks?.();
                    }
                  : undefined
              }
              onClose={() => setDrawer(null)}
            />
          )}
          {drawer?.kind === 'edit' && (
            <BookmarkEditor
              key={drawer.bookmark.id}
              ws={p.ws}
              bookmark={drawer.bookmark}
              isNew={drawer.isNew}
              dispatch={p.dispatch}
              onDone={(text) => {
                if (text) p.notify(text);
                // Aus der Sammlung heraus bearbeitet: zurück dorthin.
                setDrawer(drawer.back ? { kind: 'collection' } : null);
              }}
            />
          )}
          {/* F-114: Hinweis am Portal statt Dialog über der ganzen Fläche */}
          {p.hint && (
            <div className="win__alert" role="alert" onMouseDown={(e) => e.stopPropagation()}>
              <p>{p.hint}</p>
              <button type="button" ref={hintBtn} onClick={hintDone} onKeyDown={(e) => e.key === 'Escape' && (e.stopPropagation(), hintDone())}>
                Verstanden
              </button>
            </div>
          )}
        </div>
        </div>
        {p.stack && <StackBar {...p.stack} />}
        </div>
    </section>
  );
}

/**
 * F-194: Mausrad über einem Element zoomt (hoch = größer). Nicht passiv, damit weder E-Sources (Stack
 * blättern) noch die Seite mitscrollt; Trackpads liefern viele kleine Schritte – darum gesammelt.
 */
function useWheelZoom(ref: { current: HTMLElement | null }, step: ((dir: 1 | -1) => void) | null) {
  const fn = useRef(step);
  fn.current = step;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let sum = 0;
    const wheel = (e: WheelEvent) => {
      if (!fn.current) return;
      e.preventDefault();
      e.stopPropagation();
      sum += e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY;
      if (Math.abs(sum) < 40) return;
      fn.current(sum < 0 ? 1 : -1);
      sum = 0;
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  });
}

/**
 * F-194: Zoom-Feld unter der Lupe. Öffnet beim Darüberfahren mit der Maus von selbst und schließt
 * beim Verlassen; per Klick, Tippen (Touch) oder Tastatur geöffnet bleibt es, bis man daneben klickt
 * oder Esc drückt (Fokus zurück auf die Lupe, NF-03). Senkrechter Regler (oben = größer): ziehen,
 * tippen, Mausrad oder Pfeiltasten; „+“ oben, „−“ unten, „100 %“ setzt zurück.
 */
function ZoomPanel({ zoom, name, pinned, onZoom, fit, onFit, onHover, onClose, anchor }: { zoom: number; name: string; pinned: boolean; onZoom: (z: number) => void; fit?: number; onFit?: (on: boolean) => void; onHover: (on: boolean) => void; onClose: (back: boolean) => void; anchor: { current: HTMLElement | null } }) {
  const box = useRef<HTMLDivElement>(null);
  const fitId = useId();
  const track = useRef<HTMLDivElement>(null);
  const slider = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ right: number; top: number }>({ right: 8, top: 6 });
  const n = ZOOM_STEPS.length;
  // mit „Breite halten“ ist der Zoom krumm (z. B. 73 %) – der Regler steht dann auf der nächsten Stufe
  const idx = Math.max(0, ZOOM_STEPS.indexOf(nearestStep(zoom) as (typeof ZOOM_STEPS)[number]));
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  useWheelZoom(box, (dir) => onZoom(zoomStep(zoomRef.current, dir)));
  // unter die Lupe setzen (Feld liegt im Seitenbereich des Portals)
  useLayoutEffect(() => {
    const b = box.current, a = anchor.current, parent = box.current?.offsetParent as HTMLElement | null;
    if (!b || !a || !parent) return;
    const ar = a.getBoundingClientRect(), pr = parent.getBoundingClientRect();
    const want = pr.right - (ar.left + ar.width / 2) - b.offsetWidth / 2;
    // direkt unter die Lupe – auch über die Tab-Leiste hinweg
    setPos({ right: Math.max(8, Math.min(want, pr.width - b.offsetWidth - 8)), top: ar.bottom - pr.top + 4 });
  }, [anchor]);
  useEffect(() => {
    if (pinned) slider.current?.focus();
    const away = (e: globalThis.PointerEvent) => {
      const t = e.target as globalThis.Node;
      if (!box.current?.contains(t) && !anchor.current?.contains(t)) onClose(false);
    };
    const blur = () => window.setTimeout(() => document.activeElement?.tagName === 'IFRAME' && onClose(false), 0);
    document.addEventListener('pointerdown', away, true);
    window.addEventListener('blur', blur);
    return () => {
      document.removeEventListener('pointerdown', away, true);
      window.removeEventListener('blur', blur);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinned]);
  const fromY = (y: number) => {
    const r = track.current?.getBoundingClientRect();
    if (!r) return;
    const f = 1 - Math.min(1, Math.max(0, (y - r.top) / r.height));
    const i = Math.round(f * (n - 1));
    if (ZOOM_STEPS[i] !== zoomRef.current) onZoom(ZOOM_STEPS[i]);
  };
  const pct = (idx / (n - 1)) * 100;
  return (
    <div
      ref={box}
      className="zoompanel"
      style={{ right: pos.right, top: pos.top, maxHeight: `calc(100% - ${pos.top + 8}px)` }}
      role="group"
      aria-label={ZOOM_TEXT.panelLabel(name)}
      onPointerEnter={(e) => e.pointerType === 'mouse' && onHover(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && onHover(false)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose(true);
        } else if (e.key === '+' || e.key === '-') {
          e.preventDefault();
          onZoom(zoomStep(zoom, e.key === '+' ? 1 : -1));
        }
      }}
    >
      <div className="zoompanel__mid">
        <div
          ref={slider}
          className="zoompanel__slider"
          role="slider"
          tabIndex={0}
          aria-label={ZOOM_TEXT.label}
          aria-orientation="vertical"
          aria-valuemin={ZOOM_STEPS[0]}
          aria-valuemax={ZOOM_STEPS[n - 1]}
          aria-valuenow={zoom}
          aria-valuetext={`${zoom} %`}
          onKeyDown={(e) => {
            const go = (i: number) => {
              e.preventDefault();
              e.stopPropagation();
              onZoom(ZOOM_STEPS[Math.max(0, Math.min(n - 1, i))]);
            };
            if (e.key === 'ArrowUp' || e.key === 'ArrowRight') go(idx + 1);
            else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') go(idx - 1);
            else if (e.key === 'PageUp') go(idx + 2);
            else if (e.key === 'PageDown') go(idx - 2);
            else if (e.key === 'Home') go(0);
            else if (e.key === 'End') go(n - 1);
          }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            fromY(e.clientY);
          }}
          onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && fromY(e.clientY)}
        >
          <div ref={track} className="zoompanel__track">
            <div className="zoompanel__fill" style={{ height: `${pct}%` }} />
            <div className="zoompanel__mark" style={{ bottom: `${(ZOOM_STEPS.indexOf(ZOOM_DEFAULT) / (n - 1)) * 100}%` }} />
            <div className="zoompanel__thumb" style={{ bottom: `${pct}%` }} />
          </div>
        </div>
        <div className="zoompanel__scale" aria-hidden="true">
          <span>{ZOOM_STEPS[n - 1]}</span>
          <span className="zoompanel__value">{zoom} %</span>
          <span>{ZOOM_STEPS[0]}</span>
        </div>
      </div>
      <div className="zoompanel__steps">
        <button type="button" className="zoompanel__step" onClick={() => onZoom(zoomStep(zoom, -1))} disabled={zoom <= ZOOM_STEPS[0]} aria-label={ZOOM_TEXT.out} title={ZOOM_TEXT.outTitle}>
        −
        </button>
        <button type="button" className="zoompanel__step" onClick={() => onZoom(zoomStep(zoom, 1))} disabled={zoom >= ZOOM_STEPS[n - 1]} aria-label={ZOOM_TEXT.in} title={ZOOM_TEXT.inTitle}>
        +
        </button>
      </div>
      <button type="button" className="zoompanel__reset" onClick={() => onZoom(ZOOM_DEFAULT)} disabled={zoom === ZOOM_DEFAULT} title={ZOOM_TEXT.resetTitle(zoom)}>
        100 %
      </button>
      {onFit && (
        <label className="zoompanel__fit" title={ZOOM_TEXT.fitTitle}>
          <input type="checkbox" checked={!!fit} onChange={(e) => onFit(e.target.checked)} aria-describedby={fitId} />
          {ZOOM_TEXT.fit}
        </label>
      )}
      {onFit && (
        <p id={fitId} className="zoompanel__hint">
          {fit ? ZOOM_TEXT.fitShows(fit) : ZOOM_TEXT.fitTitle.split(':')[0]}
        </p>
      )}
      <p className="zoompanel__hint">{ZOOM_TEXT.hint}</p>
    </div>
  );
}
