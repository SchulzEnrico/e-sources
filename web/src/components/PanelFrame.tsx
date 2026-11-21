import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import type { PanelMeta } from '../workspace/types';
import { canGoBack, canGoForward, isSelfUrl, loadColor } from '../workspace/workspace';
import { StackBar, type StackProps, useSwipe } from './StackBar';

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
  onClose: () => void;
  onStartSwap: () => void;
  onSetSize: (w: number, h: number) => void;
  onReset: () => void;
  onToggleMaximize: () => void;
  /** Kurze Meldung für den Nutzer (z. B. „Adresse kopiert“). */
  notify: (text: string) => void;
}

const pct = (v: number) => `${Math.round(v * 100)} %`;

/** Symbol für die Größen-Voreinstellungen: Rahmen der Fläche mit einem Panel darin und Pfeil zur Ecke. */
const SizeIcon = (
  <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true" className="icon">
    <rect x="1.5" y="1.5" width="13" height="13" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
    <rect x="3" y="3" width="6" height="6" rx="0.8" fill="currentColor" opacity="0.55" />
    <path d="M9.5 9.5 L13 13 M13 10 V13 H10" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Ausklappmenü in der Kopfleiste (Größen, Panel-Optionen F-20). */
function Menu(props: { icon: ReactNode; label: string; children: (close: () => void) => ReactNode }) {
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

function Item(props: { onClick: () => void; children: ReactNode }) {
  return (
    <li>
      <button type="button" role="menuitem" onClick={props.onClick}>
        {props.children}
      </button>
    </li>
  );
}

export function PanelFrame(p: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(p.panel.name);
  const [address, setAddress] = useState(p.panel.url ?? '');
  /** Zähler für „Neu laden“: ein neuer Schlüssel lädt das iframe neu. */
  const [reloads, setReloads] = useState(0);
  useEffect(() => setAddress(p.panel.url ?? ''), [p.panel.url]);
  const inputRef = useRef<HTMLInputElement>(null);
  const swipe = useSwipe(p.stack?.onStep);
  const url = p.panel.url;
  // E-Source darf sich selbst laden (F-18), aber nur auf oberster Ebene: Eine eingebettete
  // E-Source lädt sich nicht noch einmal, sonst verschachtelt es sich endlos.
  const embedded = window.self !== window.top;
  const self = !!url && embedded && isSelfUrl(url, window.location.origin);
  /** Anzahl auf diesem Platz für die Ampel (F-26); Tabs folgen. */
  const load = p.stack ? p.stack.members.length : 1;

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const startEdit = () => {
    setDraft(p.panel.name);
    setEditing(true);
  };
  const commit = () => {
    p.onRename(draft);
    setEditing(false);
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
      <div className="win__main">
        {/* Kopfleiste wie im Browser (F-14): Zurück · Vor · Neu laden · Home · Adresse · Größen · Name · Menü · Schließen */}
        <header className="win__bar">
          <div className="win__nav">
            <button type="button" disabled={!canGoBack(p.panel)} onClick={() => p.onHistory(-1)} title="Zurück" aria-label="Zurück">
              ←
            </button>
            <button type="button" disabled={!canGoForward(p.panel)} onClick={() => p.onHistory(1)} title="Vor" aria-label="Vor">
              →
            </button>
            <button type="button" disabled={!url} onClick={() => setReloads((n) => n + 1)} title="Neu laden" aria-label="Neu laden">
              ⟳
            </button>
            <button type="button" disabled={!p.panel.home} onClick={p.onHome} title={p.panel.home ? `Startseite: ${p.panel.home}` : 'Noch keine Startseite'} aria-label="Startseite">
              ⌂
            </button>
          </div>
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
          </form>
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
            onDoubleClick={startEdit}
            title={p.onDragStart ? 'Ziehen: auf die Mitte eines Panels = tauschen, an dessen Rand = andocken · Doppelklick zum Umbenennen' : 'Doppelklick zum Umbenennen'}
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
                  if (e.key === 'Escape') setEditing(false);
                }}
                aria-label="Panelname"
              />
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
                  <Item onClick={run(startEdit)}>✎ Umbenennen</Item>
                  {!p.maximized && <Item onClick={run(p.onStartSwap)}>⇄ Mit anderem Panel tauschen</Item>}
                  {!p.maximized && <Item onClick={run(p.onReset)}>↺ Panel zurücksetzen</Item>}
                  <Item onClick={run(p.onToggleMaximize)}>{p.maximized ? '🗗 Verkleinern (Esc)' : '🗖 Maximieren'}</Item>
                  {url && (
                    <>
                      <li className="menu__sep" role="separator" />
                      <Item onClick={run(p.onSetHome)}>⌂ Als Startseite festlegen</Item>
                      <Item onClick={run(() => void copyUrl())}>⧉ Adresse kopieren</Item>
                      <Item onClick={run(() => window.open(url, '_blank', 'noopener,noreferrer'))}>↗ In neuem Tab öffnen</Item>
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
        <div className="win__body" {...swipe}>
          {url && !self ? (
            <iframe
              key={`${url}#${reloads}`}
              className="win__frame"
              src={url}
              title={p.panel.name}
              referrerPolicy="no-referrer"
              // Ohne allow-top-navigation: Die Seite darf E-Source nicht wegnavigieren.
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads"
            />
          ) : self ? (
            <p className="win__placeholder win__placeholder--small">In einer eingebetteten E-Source lädt sich E-Source nicht noch einmal.</p>
          ) : (
            <>
              <p className="win__placeholder">{p.panel.name}</p>
              {p.share && (
                <p className="win__meta">
                  {pct(p.share.w)} breit × {pct(p.share.h)} hoch{p.stack ? ` · ${p.stack.members.length} Panels im Stapel` : ''}
                </p>
              )}
            </>
          )}
        </div>
      </div>
      {p.stack && <StackBar {...p.stack} />}
    </section>
  );
}
