import { useEffect, useId, useRef, useState, type CSSProperties, type DragEvent, type PointerEvent, type ReactNode } from 'react';
import type { Bookmark, PanelMeta, Workspace } from '../workspace/types';
import type { Action } from '../workspace/useWorkspace';
import { bookmarkOf, collectionSize } from '../workspace/bookmarks';
import { BookmarkEditor, CollectionDrawer, CollectionIcon, draftFor } from './Bookmarks';
import { FOCUS_WARN, TAB_MAX, rulerShown, activeTab, canGoBack, canGoForward, hostOf, isSelfUrl, loadColor, tabLabel } from '../workspace/workspace';
import { StackBar, type StackProps, useSwipe } from './StackBar';
import { Ruler, RulerIcon } from './Ruler';

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
  /** F-43: Lässt sich die Seite voraussichtlich nicht einbetten? */
  isBlocked: (url: string) => boolean;
  /** F-43: Domain als einbettbar (true) oder gesperrt (false) merken. */
  onEmbed: (url: string, ok: boolean) => void;
  onClose: () => void;
  onStartSwap: () => void;
  onSetSize: (w: number, h: number) => void;
  onReset: () => void;
  onToggleMaximize: () => void;
  /** Kurze Meldung für den Nutzer (z. B. „Adresse kopiert“). */
  notify: (text: string) => void;
  /** F-14, F-20, F-30 bis F-32: Lesezeichen und Kategorien der ganzen Arbeitsfläche. */
  ws: Workspace;
  dispatch: (a: Action) => void;
  /** F-21: Lesezeichen in diesem Panel öffnen. */
  onOpenBookmark: (url: string) => void;
}

/** Seitenleiste im Panel: Sammlung oder Lesezeichen bearbeiten. */
type Drawer = null | { kind: 'collection' } | { kind: 'edit'; bookmark: Bookmark; isNew: boolean; back: boolean };

const pct = (v: number) => `${Math.round(v * 100)} %`;

/** F-123: Seite außerhalb von E-Source öffnen – als Browser-Tab oder als eigenes Fenster. */
function openOutside(url: string, how: 'tab' | 'window') {
  if (how === 'tab') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  const w = Math.min(1280, Math.round(window.screen.availWidth * 0.8));
  const h = Math.min(900, Math.round(window.screen.availHeight * 0.85));
  const left = Math.round((window.screen.availWidth - w) / 2);
  const top = Math.round((window.screen.availHeight - h) / 2);
  window.open(url, '_blank', `popup,noopener,noreferrer,width=${w},height=${h},left=${left},top=${top}`);
}

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
function StackAddIcon() {
  const id = useId().replace(/:/g, '');
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <defs>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a3352a" />
          <stop offset="1" stopColor="#5a130c" />
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

/** Ausklappmenü in der Kopfleiste (Größen, Panel-Optionen F-20). */
export function Menu(props: { icon: ReactNode; label: string; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => {
      if (!ref.current?.contains(e.target as globalThis.Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  return (
    <div className="menu" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} title={props.label} aria-label={props.label} aria-expanded={open}>
        {props.icon}
      </button>
      {open && (
        <ul className="menu__list" role="menu">
          {props.children(() => setOpen(false))}
        </ul>
      )}
    </div>
  );
}

export function Item(props: { onClick: () => void; children: ReactNode }) {
  return (
    <li>
      <button type="button" role="menuitem" onClick={props.onClick}>
        {props.children}
      </button>
    </li>
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
    if (tabCount >= TAB_MAX) return p.notify(`Mehr als ${TAB_MAX} Tabs gehen nicht. Lege lieber ein neues Panel an.`);
    p.onAddTab();
    if (tabCount + 1 === FOCUS_WARN) p.notify(`Jetzt sind ${FOCUS_WARN} Tabs offen. Ab hier nehmen Fokus und Übersicht ab.`);
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
        {/* Kopfleiste wie im Browser (F-14): Zurück · Vor · Neu laden · Home · Adresse · Größen · Name · Menü · Schließen */}
        <header className="win__bar">
          {/* F-09: Stapeln ganz links in der Kopfleiste */}
          <button type="button" className="win__stack-add" onClick={p.onAddHere} title={`Neues Panel auf „${p.panel.name}“ legen (stapeln)`} aria-label={`Neues Panel auf „${p.panel.name}“ legen`}>
            <StackAddIcon />
          </button>
          <div className="win__nav">
            <button type="button" disabled={!canGoBack(p.panel)} onClick={() => p.onHistory(-1)} title="Zurück" aria-label="Zurück">
              ←
            </button>
            <button type="button" disabled={!canGoForward(p.panel)} onClick={() => p.onHistory(1)} title="Vor" aria-label="Vor">
              →
            </button>
            <button type="button" disabled={!url} onClick={() => setReloads((r) => ({ ...r, [tab.id]: (r[tab.id] ?? 0) + 1 }))} title="Neu laden" aria-label="Neu laden">
              ⟳
            </button>
            <button type="button" disabled={!p.panel.home} onClick={p.onHome} title={p.panel.home ? `Startseite: ${p.panel.home}` : 'Noch keine Startseite'} aria-label="Startseite">
              ⌂
            </button>
          </div>
          {/* F-20: Sammlung des Panels */}
          <button
            type="button"
            className={drawer?.kind === 'collection' ? 'win__coll win__coll--on' : 'win__coll'}
            onClick={() => setDrawer(drawer?.kind === 'collection' ? null : { kind: 'collection' })}
            title={`Sammlung (${ownCount} Lesezeichen in diesem Panel)`}
            aria-label="Sammlung öffnen"
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
                title={saved ? 'Lesezeichen bearbeiten' : 'Lesezeichen speichern'}
                aria-label={saved ? 'Lesezeichen bearbeiten' : 'Lesezeichen speichern'}
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
            title={rulerShown(p.ws, p.panel) ? 'Lineal in diesem Panel ausblenden' : 'Lineal in diesem Panel zeigen'}
            aria-label="Lineal in diesem Panel"
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
              {(close) =>
                SIZE_PRESETS.map((s) => (
                  <Item
                    key={s.label}
                    onClick={() => {
                      p.onSetSize(s.w, s.h);
                      close();
                    }}
                  >
                    {s.label}
                  </Item>
                ))
              }
            </Menu>
          )}
          <div
            className={p.onDragStart ? 'win__title win-drag' : 'win__title'}
            onPointerDown={(e) => {
              if (!editing && e.button === 0) p.onDragStart?.(e);
            }}
            onDoubleClick={() => startEdit('panel')}
            title={
              (areaName ? `Area „${areaName}“ · Panel „${p.panel.name}“ · ` : '') +
              (p.onDragStart ? 'Ziehen: auf die Mitte eines Panels = tauschen, an dessen Rand = andocken · Doppelklick zum Umbenennen' : 'Doppelklick zum Umbenennen')
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
                aria-label={editing === 'area' ? 'Name der Area' : 'Panelname'}
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
          <Menu icon="⋮" label="Panel-Optionen">
            {(close) => {
              const run = (f: () => void) => () => {
                f();
                close();
              };
              return (
                <>
                  <Item onClick={run(() => setDrawer({ kind: 'collection' }))}>☰ Sammlung ({ownCount})</Item>
                  {url && <Item onClick={run(() => editCurrent())}>{saved ? '★ Lesezeichen bearbeiten' : '☆ Lesezeichen speichern'}</Item>}
                  <li className="menu__sep" role="separator" />
                  <Item onClick={run(addTab)}>＋ Neuer Tab</Item>
                  <Item onClick={run(p.onAddHere)}>▣ Neues Panel auf „{p.panel.name}“ legen</Item>
                  <li className="menu__sep" role="separator" />
                  <Item onClick={run(() => p.dispatch({ type: 'rulerPanel', id: p.panel.id }))}>
                    {rulerShown(p.ws, p.panel) ? '▭ Lineal in diesem Panel ausblenden' : '▭ Lineal in diesem Panel zeigen'}
                  </Item>
                  <Item onClick={run(() => startEdit('panel'))}>✎ Panel umbenennen</Item>
                  {p.stack && <Item onClick={run(() => startEdit('area'))}>✎ Area umbenennen</Item>}
                  {!p.maximized && <Item onClick={run(p.onStartSwap)}>⇄ Mit anderem Panel tauschen</Item>}
                  {!p.maximized && <Item onClick={run(p.onReset)}>↺ Panel zurücksetzen</Item>}
                  <Item onClick={run(p.onToggleMaximize)}>{p.maximized ? '⤡ Verkleinern (Esc)' : '⤢ Maximieren'}</Item>
                  {url && (
                    <>
                      <li className="menu__sep" role="separator" />
                      <Item onClick={run(p.onSetHome)}>⌂ Als Startseite festlegen</Item>
                      <Item onClick={run(() => void copyUrl())}>⧉ Adresse kopieren</Item>
                      <Item onClick={run(() => openOutside(url, 'tab'))}>↗ In neuem Tab öffnen</Item>
                      <Item onClick={run(() => openOutside(url, 'window'))}>⧉ In neuem Fenster öffnen</Item>
                      {p.isBlocked(url) ? (
                        <Item onClick={run(() => p.onEmbed(url, true))}>▣ {hostOf(url)} doch hier anzeigen</Item>
                      ) : (
                        <Item onClick={run(() => p.onEmbed(url, false))}>⊘ Seite lädt nicht – {hostOf(url)} als gesperrt merken</Item>
                      )}
                    </>
                  )}
                </>
              );
            }}
          </Menu>
          <button type="button" className="win__close" onClick={p.onClose} title="Panel schließen" aria-label="Panel schließen">
            ×
          </button>
        </header>
        {/* F-21, F-22: Tabs unter der Kopfleiste (die Kopfleiste bleibt der Griff zum Verschieben), Ampel an der unteren Kante (F-26) */}
        <div className={p.stack ? 'tabs tabs--stacked' : 'tabs'} role="tablist" aria-label="Tabs" style={{ '--tabload': loadColor(tabCount) } as CSSProperties}>
          {p.panel.tabs.map((t, i) => (
            <div
              key={t.id}
              role="tab"
              aria-selected={t.id === tab.id}
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
            title={tabCount >= TAB_MAX ? `Höchstens ${TAB_MAX} Tabs je Panel` : 'Neuer Tab'}
            aria-label="Neuer Tab"
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
        <div className={url && p.isBlocked(url) ? 'win__body win__body--blocked' : 'win__body'} {...swipe}>
          {/* Alle Tabs bleiben geladen (wie im Browser), sichtbar ist nur der aktive. */}
          {p.panel.tabs.map((t) =>
            t.url && !isSelf(t.url) && !p.isBlocked(t.url) ? (
              <iframe
                key={`${t.id}#${t.url}#${reloads[t.id] ?? 0}`}
                className="win__frame"
                hidden={t.id !== tab.id}
                src={t.url}
                title={`${p.panel.name} – ${tabLabel(t)}`}
                referrerPolicy="no-referrer"
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
              <p className="fallback__text">Die Seite erlaubt nicht, in andere Seiten eingebettet zu werden. In der Desktop-App wird das später möglich.</p>
              {/* F-123: Tab oder eigenes Fenster */}
              <span className="fallback__choice">
                <button type="button" className="fallback__open" onClick={() => openOutside(url, 'tab')}>
                  ↗ In neuem Tab
                </button>
                <button type="button" className="fallback__open" onClick={() => openOutside(url, 'window')}>
                  ⧉ In neuem Fenster
                </button>
              </span>
              <button type="button" className="fallback__try" onClick={() => p.onEmbed(url, true)}>
                Trotzdem hier versuchen
              </button>
            </div>
          ) : !url ? (
            <>
              <p className="win__placeholder">{p.panel.name}</p>
              {p.share && (
                <p className="win__meta">
                  {pct(p.share.w)} breit × {pct(p.share.h)} hoch{p.stack ? ` · ${p.stack.members.length} Panels im Stapel` : ''}
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
        </div>
        </div>
        {p.stack && <StackBar {...p.stack} />}
        </div>
    </section>
  );
}
