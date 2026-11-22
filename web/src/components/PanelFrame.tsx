import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type DragEvent, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { LauncherIcon } from './Launcher';
import { openOutside } from '../workspace/launcher';
import { createPortal } from 'react-dom';
import type { Bookmark, Named, PanelMeta, Workspace } from '../workspace/types';
import type { Action } from '../workspace/useWorkspace';
import type { MoveTarget } from '../workspace/move';
import { bookmarkOf, collectionSize } from '../workspace/bookmarks';
import { BookmarkEditor, CollectionDrawer, CollectionIcon, draftFor } from './Bookmarks';
import { FOCUS_WARN, NEW_AREA, TAB_MAX, rulerShown, activeTab, canGoBack, canGoForward, hostOf, isSelfUrl, loadColor, tabLabel } from '../workspace/workspace';
import { StackBar, type StackProps, useSwipe } from './StackBar';
import { Ruler, RulerIcon } from './Ruler';
import * as FH from '../workspace/frameHistory';
import { TERMS } from '../workspace/terms';

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

export function Menu(props: { icon: ReactNode; label: string; children: (close: () => void) => ReactNode }) {
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
    if (target.getAttribute('role') !== 'menuitem') return;
    const items = all.filter((el) => el.getAttribute('role') === 'menuitem');
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

export function Item(props: { onClick: () => void; children: ReactNode; disabled?: boolean; title?: string; checked?: boolean }) {
  // checked gesetzt = Schalter (menuitemcheckbox), Häkchen sichtbar und angesagt
  const check = props.checked !== undefined;
  return (
    <li>
      <button type="button" role={check ? 'menuitemcheckbox' : 'menuitem'} aria-checked={check ? props.checked : undefined} onClick={props.onClick} disabled={props.disabled} title={props.title}>
        {check && (
          <span className="menu__check" aria-hidden="true">
            {props.checked ? '✓' : ''}
          </span>
        )}
        {props.children}
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
    if (!t.area) return `⧉ Ins ${props.windowName(t.win)}`;
    if (t.area === NEW_AREA) return `▢ Eigener neuer Slot${t.disabled ? ' – kein Platz' : ''}`;
    return `▣ In „${t.label}“ ablegen${t.count > 1 ? ` (${t.count})` : ''}${t.disabled ? ' – Stack voll' : ''}`;
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
                <Item key={`${t.win}/${t.area}`} disabled={t.disabled} onClick={() => props.onPick(t)}>
                  {label(t)}
                </Item>
              ))}
            </ul>
          </li>
        );
      })}
      <li className="menu__sep" role="separator" />
      <Item onClick={props.onNewWindow}>⧉ Neuer Desk</Item>
    </>
  );
}

export function PanelFrame(p: Props) {
  /** Was gerade umbenannt wird: der Panelname oder der Name der Area (F-128). */
  const [editing, setEditing] = useState<null | 'panel' | 'area'>(null);
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
  const swipe = useSwipe(p.stack?.onStep);
  // E-Source darf sich selbst laden (F-18), aber nur auf oberster Ebene: Eine eingebettete
  // E-Source lädt sich nicht noch einmal, sonst verschachtelt es sich endlos.
  const embedded = window.self !== window.top;
  const base = new URL(import.meta.env.BASE_URL, window.location.origin).href;
  const isSelf = (u: string | undefined) => !!u && embedded && isSelfUrl(u, base);
  /** Anzahl auf dieser Area für die Ampel (F-26). */
  const load = p.stack ? p.stack.members.length : 1;
  const tabCount = p.panel.tabs.length;

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
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section
      className={cls}
      onMouseDown={p.onActivate}
      aria-label={p.panel.name}
      data-panel-id={p.panel.id}
      style={{ '--load': loadColor(load) } as CSSProperties}
    >
        {/* Kopfleiste wie im Browser (F-14): Schließen · Zurück · Vor · Neu laden · Home · Adresse · Größen · Name · Menü · Stapeln (F-140) */}
        <header className="win__bar">
          {/* F-140: Schließen ganz links */}
          <button type="button" className="win__close" onClick={p.onClose} title="Portal schließen" aria-label="Portal schließen">
            ×
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
              p.onNavigate(address);
              (document.activeElement as HTMLElement | null)?.blur();
            }}
          >
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setAddress(url ?? '');
                  e.currentTarget.blur();
                }
              }}
              placeholder="Adresse eingeben, z. B. wikipedia.org"
              aria-label="Adresse"
              spellCheck={false}
            />
            {/* F-14: Lesezeichen speichern – Stern in der Adresszeile wie im Browser */}
            {url && (
              <button
                type="button"
                className={saved ? 'win__star win__star--on' : 'win__star'}
                onClick={() => editCurrent()}
                title={saved ? 'Source bearbeiten' : 'Source in der Library speichern'}
                aria-label={saved ? 'Source bearbeiten' : 'Source in der Library speichern'}
              >
                {saved ? '★' : '☆'}
              </button>
            )}
          </form>
          {/* F-15: Lineal nur für dieses Panel */}
          <button
            type="button"
            className={rulerShown(p.ws, p.panel) ? 'win__ruler win__ruler--on' : 'win__ruler'}
            onClick={() => p.dispatch({ type: 'rulerPanel', id: p.panel.id })}
            title={rulerShown(p.ws, p.panel) ? 'Lineal in diesem Portal ausblenden' : 'Lineal in diesem Portal zeigen'}
            aria-label="Lineal in diesem Portal"
            aria-pressed={rulerShown(p.ws, p.panel)}
          >
            {RulerIcon}
          </button>
          <button
            type="button"
            className="win__max"
            onClick={p.onToggleMaximize}
            title={p.maximized ? 'Verkleinern (Esc)' : 'Maximieren'}
            aria-label={p.maximized ? 'Verkleinern' : 'Maximieren'}
          >
            {p.maximized ? '⤡' : '⤢'}
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
          {/* Panel-Optionen (F-20); Sammlung, Verhalten und Szenarien kommen später dazu. */}
          <Menu icon="⋮" label="Portal-Optionen">
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
                        <Item onClick={() => go('')}>← Zurück</Item>
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
                  <Item onClick={run(() => setDrawer({ kind: 'collection' }))}>☰ Library ({ownCount})</Item>
                  {url && <Item onClick={run(() => editCurrent())}>{saved ? '★ Source bearbeiten' : '☆ Source in der Library speichern'}</Item>}
                  <li className="menu__sep" role="separator" />
                  <Item onClick={run(addTab)}>＋ Neuer Tab</Item>
                  <Item onClick={run(p.onAddHere)}>▣ Neues Portal auf „{p.panel.name}“ legen</Item>
                  {/* F-27, F-28: Panel oder ganze Area auf eine andere Area, auch in ein anderes Fenster */}
                  <li className="menu__sep" role="separator" />
                  <Item onClick={() => go('panel')}>↦ Portal verschieben …</Item>
                  {p.stack && <Item onClick={() => go('area')}>↦ Ganzen Slot verschieben …</Item>}
                  {p.stack &&
                    (() => {
                      const own = p.moveTargets(false).find((t) => t.win === (p.panel.win ?? '') && t.area === NEW_AREA);
                      return (
                        <Item
                          disabled={!own || own.disabled}
                          title={!own || own.disabled ? 'Auf dem Bildschirm ist kein Slot mehr frei.' : undefined}
                          onClick={run(() => own && p.onMove(own, false))}
                        >
                          ⇱ Aus dem Stack lösen{!own || own.disabled ? ' – kein Platz' : ''}
                        </Item>
                      );
                    })()}
                  <li className="menu__sep" role="separator" />
                  <Item onClick={run(() => p.dispatch({ type: 'rulerPanel', id: p.panel.id }))}>
                    {rulerShown(p.ws, p.panel) ? '▭ Lineal in diesem Portal ausblenden' : '▭ Lineal in diesem Portal zeigen'}
                  </Item>
                  <Item onClick={run(() => startEdit('panel'))}>✎ Portal umbenennen</Item>
                  {p.stack && <Item onClick={run(() => startEdit('area'))}>✎ Slot umbenennen</Item>}
                  {!p.maximized && <Item onClick={run(p.onStartSwap)}>⇄ Mit anderem Portal tauschen</Item>}
                  {!p.maximized && <Item onClick={run(p.onReset)}>↺ Portal zurücksetzen</Item>}
                  <Item onClick={run(p.onToggleMaximize)}>{p.maximized ? '⤡ Verkleinern (Esc)' : '⤢ Maximieren'}</Item>
                  {url && (
                    <>
                      <li className="menu__sep" role="separator" />
                      <Item onClick={run(p.onSetHome)}>⌂ Als Startseite festlegen</Item>
                      <Item onClick={run(() => void copyUrl())}>⧉ Adresse kopieren</Item>
                      <Item onClick={run(() => openOutside(url, 'tab'))}>↗ In neuem Tab öffnen</Item>
                      <Item onClick={run(() => openOutside(url, 'window'))}>⧉ In neuem Browserfenster öffnen</Item>
                      {p.isBlocked(url) ? (
                        <Item onClick={run(() => p.onEmbed(url, true))}>▣ {hostOf(url)} doch hier anzeigen</Item>
                      ) : (
                        <Item onClick={run(() => p.onEmbed(url, false))}>⊘ Source lädt nicht – {hostOf(url)} als gesperrt merken</Item>
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
        {/* F-21, F-22: Tabs unter der Kopfleiste (die Kopfleiste bleibt der Griff zum Verschieben), Ampel an der unteren Kante (F-26) */}
        <div className={p.stack ? 'tabs tabs--stacked' : 'tabs'} role="tablist" aria-label="Tabs" style={{ '--tabload': loadColor(tabCount) } as CSSProperties}>
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
              className={t.id === tab.id ? 'tab tab--on' : 'tab'}
              draggable
              onDragStart={(e) => {
                dragTab.current = t.id;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', t.url ?? '');
              }}
              onDragOver={(e) => dragTab.current && e.preventDefault()}
              onDrop={(e) => dropTab(e, i)}
              onClick={() => p.onSelectTab(t.id)}
              title={t.url ?? 'Neuer Tab'}
            >
              <span className="tab__label">{tabLabel(t)}</span>
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
                ×
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
          {/* Alle Tabs bleiben geladen (wie im Browser), sichtbar ist nur der aktive. */}
          {p.panel.tabs.map((t) =>
            t.url && !isSelf(t.url) && !p.isBlocked(t.url) ? (
              <iframe
                key={`${t.id}#${t.url}#${reloads[t.id] ?? 0}`}
                onLoad={() => FH.loaded(frameKey(t))}
                className="win__frame"
                hidden={t.id !== tab.id}
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
