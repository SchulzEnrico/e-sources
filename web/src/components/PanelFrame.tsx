import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { PanelMeta } from '../workspace/types';
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
  /** Ziehen an der Titelleiste beginnt (nur auf der Arbeitsfläche). */
  onDragStart?: (e: PointerEvent) => void;
  onRename: (name: string) => void;
  /** Seite öffnen (vorläufige Adresszeile zum Testen eingebetteter Seiten). */
  onOpenUrl: (url: string) => void;
  onClose: () => void;
  onStartSwap: () => void;
  onSetSize: (w: number, h: number) => void;
  onReset: () => void;
  onToggleMaximize: () => void;
}

const pct = (v: number) => `${Math.round(v * 100)} %`;

export function PanelFrame(p: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(p.panel.name);
  const [sizeMenu, setSizeMenu] = useState(false);
  const [address, setAddress] = useState(p.panel.url ?? '');
  useEffect(() => setAddress(p.panel.url ?? ''), [p.panel.url]);
  const inputRef = useRef<HTMLInputElement>(null);
  const swipe = useSwipe(p.stack?.onStep);

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
    <section className={cls} onMouseDown={p.onActivate} aria-label={p.panel.name}>
      <div className="win__main">
      <header className="win__bar">
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
        <div className="win__actions">
          <button type="button" onClick={startEdit} title="Umbenennen" aria-label="Umbenennen">
            ✎
          </button>
          {!p.maximized && (
            <>
              <button type="button" onClick={p.onStartSwap} title="Mit anderem Panel tauschen" aria-label="Tauschen">
                ⇄
              </button>
              <div className="menu">
                <button
                  type="button"
                  onClick={() => setSizeMenu((v) => !v)}
                  title="Voreingestellte Größe"
                  aria-label="Größe wählen"
                  aria-expanded={sizeMenu}
                >
                  ▦
                </button>
                {sizeMenu && (
                  <ul className="menu__list" role="menu" onMouseLeave={() => setSizeMenu(false)}>
                    {SIZE_PRESETS.map((s) => (
                      <li key={s.label}>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            p.onSetSize(s.w, s.h);
                            setSizeMenu(false);
                          }}
                        >
                          {s.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button type="button" onClick={p.onReset} title="Panel zurücksetzen" aria-label="Panel zurücksetzen">
                ↺
              </button>
            </>
          )}
          <button
            type="button"
            onClick={p.onToggleMaximize}
            title={p.maximized ? 'Zurück zur Arbeitsfläche (Esc)' : 'Maximieren'}
            aria-label={p.maximized ? 'Verkleinern' : 'Maximieren'}
          >
            {p.maximized ? '🗗' : '🗖'}
          </button>
          <button type="button" className="win__close" onClick={p.onClose} title="Panel schließen" aria-label="Panel schließen">
            ×
          </button>
        </div>
      </header>
      {/* Vorläufige Adresszeile (Test eingebetteter Seiten); Tabs kommen in Stufe 2 hier oben dazu. */}
      <form
        className="win__address"
        onSubmit={(e) => {
          e.preventDefault();
          p.onOpenUrl(address);
        }}
      >
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Adresse eingeben, z. B. wikipedia.org"
          aria-label="Adresse"
          spellCheck={false}
        />
        <button type="submit" title="Seite im Panel öffnen">
          Öffnen
        </button>
        {p.panel.url && (
          <a className="win__ext" href={p.panel.url} target="_blank" rel="noreferrer" title="In neuem Browser-Tab öffnen">
            ↗
          </a>
        )}
      </form>
      <div className="win__body" {...swipe}>
        {p.panel.url ? (
          <iframe
            key={p.panel.url}
            className="win__frame"
            src={p.panel.url}
            title={p.panel.name}
            referrerPolicy="no-referrer"
            // Ohne allow-top-navigation: Die Seite darf E-Source nicht wegnavigieren.
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads"
          />
        ) : (
          <>
            {/* Stufe 2 bringt hier Tabs und die Erkennung gesperrter Seiten. */}
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
