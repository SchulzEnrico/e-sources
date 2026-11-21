import { useEffect, useRef, useState } from 'react';
import type { WinMeta } from '../workspace/types';
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
  win: WinMeta;
  /** Größe des Platzes im Raster (zur Anzeige). */
  cells?: { w: number; h: number };
  /** Gesetzt, wenn das Fenster im Stapel liegt (F-08). */
  stack?: StackProps;
  active: boolean;
  maximized: boolean;
  swapSource: boolean;
  swapTarget: boolean;
  onActivate: () => void;
  onRename: (name: string) => void;
  onClose: () => void;
  onStartSwap: () => void;
  onSetSize: (w: number, h: number) => void;
  onReset: () => void;
  onToggleMaximize: () => void;
}

export function WindowFrame(p: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(p.win.name);
  const [sizeMenu, setSizeMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const swipe = useSwipe(p.stack?.onStep);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const startEdit = () => {
    setDraft(p.win.name);
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
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={cls} onMouseDown={p.onActivate} aria-label={p.win.name}>
      {p.stack && <StackBar {...p.stack} />}
      <header className="win__bar">
        <div className="win__title win-drag" onDoubleClick={startEdit} title="Ziehen zum Verschieben · Doppelklick zum Umbenennen">
          {editing ? (
            <input
              ref={inputRef}
              className="win__name-input no-drag"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit();
                if (e.key === 'Escape') setEditing(false);
              }}
              aria-label="Fenstername"
            />
          ) : (
            <span className="win__name">{p.win.name}</span>
          )}
        </div>
        <div className="win__actions no-drag">
          <button type="button" onClick={startEdit} title="Umbenennen" aria-label="Umbenennen">
            ✎
          </button>
          {!p.maximized && (
            <>
              <button type="button" onClick={p.onStartSwap} title="Mit anderem Fenster tauschen" aria-label="Tauschen">
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
              <button type="button" onClick={p.onReset} title="Fenster zurücksetzen" aria-label="Fenster zurücksetzen">
                ↺
              </button>
            </>
          )}
          <button
            type="button"
            onClick={p.onToggleMaximize}
            title={p.maximized ? 'Zurück zum Raster (Esc)' : 'Maximieren'}
            aria-label={p.maximized ? 'Verkleinern' : 'Maximieren'}
          >
            {p.maximized ? '🗗' : '🗖'}
          </button>
          <button type="button" className="win__close" onClick={p.onClose} title="Schließen" aria-label="Schließen">
            ×
          </button>
        </div>
      </header>
      <div className="win__body" {...swipe}>
        {/* Stufe 2 bringt hier Adresszeile, Tabs und die eingebettete Webseite. */}
        <p className="win__placeholder">{p.win.name}</p>
        {p.cells && (
          <p className="win__meta">
            {p.cells.w} × {p.cells.h} Zellen{p.stack ? ` · im Stapel (${p.stack.members.length})` : ''}
          </p>
        )}
      </div>
    </section>
  );
}
