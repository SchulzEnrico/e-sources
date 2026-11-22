/**
 * F-40 bis F-42, F-149: Launcher – schwebendes Fenster über dem Raster mit allen Sources, die sich
 * nicht in einem Portal anzeigen lassen. Frei verschiebbar (Maus am Kopf, Tastatur am Griff mit
 * den Pfeiltasten), zu einem Symbol einklappbar. Ein Klick öffnet eine Source außerhalb von
 * E-Sources – in einem neuen Browser-Tab oder Fenster, je nach Wahl; Strg/⌘ nimmt einmalig das
 * andere (und merkt es als neue Voreinstellung).
 *
 * Barrierefreiheit (NF-03): nicht-modaler Dialog mit Überschrift und Beschreibung; ↑/↓ gehen durch
 * die Sources, Pos1/Ende springen; Esc schließt (zuerst das Formular) und gibt den Fokus an den
 * Knopf in der Kopfleiste zurück. Ansagen laufen über die Live-Region der App.
 */
import { type CSSProperties, type RefObject, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { type How, type LauncherState, type Sort, HOW_IN, HOW_NAME, clampPos, launcherCount, launcherGroups } from '../workspace/launcher';
import { NO_CATEGORY } from '../workspace/bookmarks';
import { TERMS } from '../workspace/terms';
import type { Bookmark, Workspace } from '../workspace/types';
import { hostOf } from '../workspace/workspace';
import { Icon } from './Icon';

interface Props {
  ws: Workspace;
  state: LauncherState;
  onState: (patch: Partial<LauncherState>) => void;
  /** Source außerhalb öffnen. */
  onOpen: (b: Bookmark, how: How) => void;
  /** F-42: neue Source anlegen (landet über die Sperre der Domain im Launcher). */
  onAdd: (url: string, title: string, category: string) => void;
  /** Ansage über die Live-Region. */
  say: (text: string) => void;
  /** Zählt hoch, wenn der Launcher den Fokus bekommen soll (Alt/⌥+L). */
  focusReq: number;
}

/** Symbol: Pfeil aus dem Kasten (öffnet außerhalb). */
export const LauncherIcon = <Icon name="launcher" size={15} />;

const other = (h: How): How => (h === 'tab' ? 'window' : 'tab');
const STEP = 20;

export function Launcher({ ws, state, onState, onOpen, onAdd, say, focusReq }: Props) {
  const uid = useId().replace(/:/g, '');
  const box = useRef<HTMLElement>(null);
  const filterRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(NO_CATEGORY);
  const drag = useRef<{ dx: number; dy: number; id: number } | null>(null);

  const list = useMemo(() => launcherGroups(ws, query, state.sort), [ws, query, state.sort]);
  const count = launcherCount(ws);
  const shown = list.reduce((n, g) => n + g.items.length, 0);

  // Fokus auf Wunsch (Alt/⌥+L): ins Filterfeld bzw. auf das Symbol
  useEffect(() => {
    if (!focusReq) return;
    window.setTimeout(() => (state.min ? box.current : filterRef.current)?.focus());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusReq]);

  // Im sichtbaren Bereich halten – nach dem Zeichnen und wenn das Fenster kleiner wird
  const keepInside = () => {
    const el = box.current;
    if (!el || state.x < 0) return;
    const r = el.getBoundingClientRect();
    const p = clampPos(state.x, state.y, r.width, r.height, window.innerWidth, window.innerHeight);
    if (p.x !== state.x || p.y !== state.y) onState(p);
  };
  /**
   * Ohne eigene Lage (nie verschoben) öffnet der Launcher direkt unter seinem Knopf in der
   * Kopfleiste – auf breiten Monitoren sonst weite Mauswege bis in die Ecke. Wird nicht
   * gespeichert, damit er dem Knopf folgt, wenn sich die Fenstergröße ändert.
   */
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const placeAtButton = () => {
    if (state.x >= 0) return;
    const btn = document.querySelector<HTMLElement>('.tb-launcher')?.getBoundingClientRect();
    const el = box.current?.getBoundingClientRect();
    if (!btn || !el) return;
    const p = clampPos(btn.left + btn.width / 2 - el.width / 2, btn.bottom + 8, el.width, el.height, window.innerWidth, window.innerHeight);
    if (!anchor || Math.abs(anchor.x - p.x) > 0.5 || Math.abs(anchor.y - p.y) > 0.5) setAnchor(p);
  };
  useLayoutEffect(() => {
    keepInside();
    placeAtButton();
  });
  useEffect(() => {
    const onResize = () => {
      keepInside();
      placeAtButton();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  });

  // Klick außerhalb (auch in eine eingebettete Seite) schließt den aufgeklappten Launcher; der Fokus bleibt, wo geklickt wurde.
  useEffect(() => {
    if (state.min) return;
    const outside = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (!t || box.current?.contains(t) || t.closest('.tb-launcher, dialog, .toast')) return;
      onState({ open: false });
      say('Launcher geschlossen.');
    };
    // Klicks in ein iframe erreichen das Dokument nicht – dort verliert nur das Fenster den Fokus.
    const blur = () =>
      window.setTimeout(() => {
        if (document.activeElement?.tagName === 'IFRAME') {
          onState({ open: false });
          say('Launcher geschlossen.');
        }
      }, 0);
    document.addEventListener('pointerdown', outside, true);
    window.addEventListener('blur', blur);
    return () => {
      document.removeEventListener('pointerdown', outside, true);
      window.removeEventListener('blur', blur);
    };
  }, [state.min, onState, say]);

  const pos: CSSProperties =
    state.x >= 0 ? { left: state.x, top: state.y, right: 'auto' } : anchor ? { left: anchor.x, top: anchor.y, right: 'auto' } : { visibility: 'hidden' };

  /** Aktuelle Lage in Pixeln (auch wenn noch die Vorgabe oben rechts gilt). */
  const here = () => {
    const r = box.current?.getBoundingClientRect();
    return r ? { x: r.left, y: r.top, w: r.width, h: r.height } : { x: 0, y: 0, w: 0, h: 0 };
  };

  const startDrag = (e: ReactPointerEvent) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button:not(.launcher__grip), input, select')) return;
    const r = here();
    drag.current = { dx: e.clientX - r.x, dy: e.clientY - r.y, id: e.pointerId };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  const moveDrag = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const r = here();
    onState(clampPos(e.clientX - d.dx, e.clientY - d.dy, r.w, r.h, window.innerWidth, window.innerHeight));
  };
  const endDrag = () => (drag.current = null);

  /** Griff: Pfeiltasten verschieben (mit Umschalt in großen Schritten). */
  /** Zurück an den Knopf in der Kopfleiste (Doppelklick auf den Kopf, Pos1 auf dem Griff). */
  const toButton = () => {
    onState({ x: -1, y: -1 });
    say('Launcher wieder am Knopf in der Kopfleiste.');
  };
  const gripKeys = (e: ReactKeyboardEvent) => {
    if (e.key === 'Home') {
      e.preventDefault();
      return toButton();
    }
    const step = e.shiftKey ? STEP * 5 : STEP;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    e.stopPropagation();
    const r = here();
    const p = clampPos(r.x + d[0], r.y + d[1], r.w, r.h, window.innerWidth, window.innerHeight);
    onState(p);
    say(`Launcher verschoben: ${p.x} Pixel von links, ${p.y} von oben.`);
  };

  const collapse = () => {
    onState({ min: true });
    say(`Launcher eingeklappt. ${count} ${count === 1 ? 'Source' : 'Sources'}. Enter klappt ihn wieder auf.`);
    window.setTimeout(() => box.current?.focus());
  };
  const expand = () => {
    onState({ min: false });
    window.setTimeout(() => filterRef.current?.focus());
  };
  const close = () => {
    onState({ open: false });
    say('Launcher geschlossen.');
    window.setTimeout(() => document.querySelector<HTMLElement>('.tb-launcher')?.focus());
  };

  const open = (b: Bookmark, swap: boolean) => {
    const how = swap ? other(state.how) : state.how;
    onOpen(b, how);
  };

  /** ↑/↓ und Pos1/Ende zwischen den Sources; Esc schließt. */
  const onKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (adding) {
        setAdding(false);
        return;
      }
      if (query && e.target === filterRef.current) return setQuery('');
      return close();
    }
    const items = [...(box.current?.querySelectorAll<HTMLElement>('.launcher__item') ?? [])];
    const at = items.indexOf(document.activeElement as HTMLElement);
    const inFilter = e.target === filterRef.current;
    if (!items.length || (at < 0 && !inFilter)) return;
    let to = -1;
    if (e.key === 'ArrowDown') to = at < 0 ? 0 : (at + 1) % items.length;
    else if (e.key === 'ArrowUp') to = at < 0 ? items.length - 1 : (at - 1 + items.length) % items.length;
    else if (e.key === 'Home' && at >= 0) to = 0;
    else if (e.key === 'End' && at >= 0) to = items.length - 1;
    if (to < 0) return;
    e.preventDefault();
    items[to].focus();
  };

  const submit = () => {
    if (!url.trim()) {
      say('Bitte eine Adresse eingeben.');
      urlRef.current?.focus();
      return;
    }
    onAdd(url, title, category);
    setUrl('');
    setTitle('');
    setAdding(false);
    window.setTimeout(() => filterRef.current?.focus());
  };

  if (state.min)
    return (
      <button
        ref={box as RefObject<HTMLButtonElement>}
        type="button"
        className="launcher-min"
        style={pos}
        onClick={() => !drag.current && expand()}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            close();
          } else gripKeys(e);
        }}
        aria-expanded={false}
        aria-label={`Launcher aufklappen, ${count} ${count === 1 ? 'Source' : 'Sources'}. Pfeiltasten verschieben.`}
        title={`Launcher aufklappen (${count}) · ${TERMS.launcher}`}
      >
        {LauncherIcon}
        <span className="launcher-min__n">{count}</span>
      </button>
    );

  return (
    <section
      ref={box}
      className="launcher"
      style={pos}
      role="dialog"
      aria-labelledby={`${uid}-t`}
      aria-describedby={`${uid}-d`}
      onKeyDown={onKeyDown}
      // Zeiger bleibt im Launcher, damit darunter nichts zieht oder wischt. Erst beim Aufsteigen stoppen –
      // in der Capture-Phase käme das Drücken nie beim Kopf an und der Launcher ließe sich nicht ziehen.
      onPointerDown={(e) => e.stopPropagation()}
    >
      <header className="launcher__head" onDoubleClick={(e) => !(e.target as HTMLElement).closest('button:not(.launcher__grip), input, select') && toButton()} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
        <button type="button" className="launcher__grip" onKeyDown={gripKeys} aria-label="Launcher verschieben: Pfeiltasten, mit Umschalt in großen Schritten; Pos1 = zurück an den Knopf" title="Ziehen oder Pfeiltasten: Launcher verschieben · Doppelklick auf den Kopf oder Pos1: zurück an den Knopf">
          ⠿
        </button>
        <h2 id={`${uid}-t`} className="launcher__title">
          Launcher <span className="launcher__count">{count}</span>
        </h2>
        <button type="button" className="launcher__btn" onClick={collapse} aria-label="Launcher zu einem Symbol einklappen" title="Einklappen">
          –
        </button>
        <button type="button" className="launcher__btn" onClick={close} aria-label="Launcher schließen" title="Schließen (Esc · Alt/⌥+L)">
          ×
        </button>
      </header>
      <p id={`${uid}-d`} className="launcher__intro">
        Sources, die sich nicht in einem Portal anzeigen lassen. Ein Klick öffnet sie außerhalb von E-Sources; mit Strg/⌘ auf die andere Art.
      </p>
      <div className="launcher__bar">
        <input
          ref={filterRef}
          className="launcher__filter"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtern …"
          aria-label="Launcher filtern: Titel, Adresse, Kategorie, Tags. Pfeil nach unten geht zu den Sources."
          spellCheck={false}
          autoComplete="off"
        />
        <div className="launcher__opts">
          <fieldset className="launcher__how">
            <legend className="sr-only">Öffnen in</legend>
            {(['tab', 'window'] as How[]).map((h) => (
              <label key={h} className={state.how === h ? 'is-on' : undefined}>
                <input type="radio" name={`${uid}-how`} checked={state.how === h} onChange={() => onState({ how: h })} />
                {h === 'tab' ? '↗ Tab' : '⧉ Fenster'}
              </label>
            ))}
          </fieldset>
          <select className="launcher__sort" value={state.sort} onChange={(e) => onState({ sort: e.target.value as Sort })} aria-label="Reihenfolge in den Kategorien">
            <option value="library">wie Library</option>
            <option value="az">A–Z</option>
          </select>
        </div>
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {query ? (shown ? `${shown} ${shown === 1 ? 'Source' : 'Sources'} gefunden.` : 'Nichts gefunden.') : ''}
      </span>
      <div className="launcher__body">
        {count === 0 ? (
          <p className="launcher__empty">
            Noch leer. Hierher kommen von selbst alle Sources der Library, deren Seite sich nicht einbetten lässt (z. B. github.com oder claude.ai). Du kannst auch unten eine anlegen.
          </p>
        ) : shown === 0 ? (
          <p className="launcher__empty">Nichts gefunden.</p>
        ) : (
          list.map((g) => {
            const name = g.category?.name ?? 'Ohne Kategorie';
            const hid = `${uid}-g-${g.category?.id ?? 'none'}`;
            return (
              <section key={hid} className="launcher__group" aria-labelledby={hid}>
                <h3 id={hid} className="launcher__cat">
                  {name}
                </h3>
                <ul className="launcher__list">
                  {g.items.map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        className="launcher__item"
                        onClick={(e) => open(b, e.ctrlKey || e.metaKey)}
                        aria-label={`${b.title}, ${hostOf(b.url)}, öffnet in ${HOW_IN[state.how]}`}
                        title={`${b.url}\nKlick: ${HOW_NAME[state.how]} · Strg/⌘+Klick: ${HOW_NAME[other(state.how)]}`}
                      >
                        <span className="launcher__name">{b.title}</span>
                        <span className="launcher__host">{hostOf(b.url)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        )}
      </div>
      <footer className="launcher__foot">
        {adding ? (
          <form
            className="launcher__form"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <input ref={urlRef} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Adresse, z. B. github.com" aria-label="Adresse der Source" spellCheck={false} autoFocus />
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titel (sonst die Domain)" aria-label="Titel" />
            <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Kategorie">
              <option value={NO_CATEGORY}>Ohne Kategorie</option>
              {ws.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <span className="launcher__formbtns">
              <button type="button" className="launcher__quiet" onClick={() => setAdding(false)}>
                Abbrechen
              </button>
              <button type="submit" className="launcher__primary">
                Anlegen
              </button>
            </span>
            <p className="launcher__note">Die Source landet in der Library; ihre Domain öffnet ab dann immer außerhalb.</p>
          </form>
        ) : (
          <button type="button" className="launcher__add" onClick={() => setAdding(true)}>
            + Source anlegen
          </button>
        )}
      </footer>
    </section>
  );
}
