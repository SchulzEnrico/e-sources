/**
 * F-34, F-141: zentrales Suchfeld in der Werkzeugleiste. Findet Panels und Lesezeichen; ein Treffer
 * öffnet das Lesezeichen in seinem Panel bzw. holt das Panel nach vorn.
 *
 * Barrierefreiheit (NF-03), nach dem ARIA-Muster „Combobox mit Listbox“: Der Fokus bleibt im
 * Eingabefeld, der gewählte Treffer wird über aria-activedescendant angesagt.
 * Tastatur: Strg/⌘+K oder „/“ springt ins Feld · ↓/↑ wählt (am Ende geht es vorne weiter) ·
 * Bild↓/Bild↑ springt 5 weiter · Pos1/Ende erster/letzter Treffer (mit Alt) · Enter öffnet ·
 * Esc leert, ein zweites Esc verlässt das Feld · Tab verlässt das Feld und schließt die Liste.
 */
import { type KeyboardEvent as ReactKeyboardEvent, type ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react';
import { type PanelHit, type SearchHit, SEARCH_MAX, bookmarkOf, searchAll, searchPanels } from '../workspace/bookmarks';
import { hostOf, tabLabel } from '../workspace/workspace';
import type { Workspace } from '../workspace/types';
import { type HelpEntry, searchHelp } from '../workspace/help';

interface Props {
  ws: Workspace;
  /** Name des aktiven Panels (dort öffnen Lesezeichen, die keinem Panel zugeordnet sind). */
  activeName: string | null;
  onOpen: (hit: SearchHit) => void;
  /** F-141: Panel nach vorn holen; mit tabId auch diesen Tab zeigen. */
  onShowPanel: (panelId: string, tabId?: string) => void;
  /** F-156: Funktion ausführen (Enter auf einem Funktions-Treffer). */
  onRun: (entry: HelpEntry) => void;
  /** F-156: Hilfe an dieser Stelle öffnen (Umschalt+Enter, oder Enter bei Begriffen). */
  onHelp: (id: string) => void;
}

/** Name eines offenen Tabs: Titel des Lesezeichens, sonst die Domain; ohne Doppelte. */
function tabNames(ws: Workspace, h: PanelHit): string[] {
  return [...new Set(h.tabs.map((t) => bookmarkOf(ws, t.url, h.panel.id)?.title || tabLabel(t)))];
}

type Item = { kind: 'panel'; hit: PanelHit } | { kind: 'bookmark'; hit: SearchHit } | { kind: 'help'; hit: HelpEntry };

export function Search({ ws, activeName, onOpen, onShowPanel, onRun, onHelp }: Props) {
  const uid = useId().replace(/:/g, '');
  const listId = `${uid}-list`;
  const optId = (i: number) => `${uid}-opt-${i}`;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const hits = useMemo(() => searchAll(ws, query), [ws, query]);
  const panelHits = useMemo(() => searchPanels(ws, query), [ws, query]);
  const helpHits = useMemo(() => searchHelp(query, 4), [query]);
  const items: Item[] = useMemo(
    () => [
      ...panelHits.map((hit) => ({ kind: 'panel' as const, hit })),
      ...hits.map((hit) => ({ kind: 'bookmark' as const, hit })),
      ...helpHits.map((hit) => ({ kind: 'help' as const, hit })),
    ],
    [panelHits, hits, helpHits],
  );
  const show = open && query.trim() !== '';
  const cur = Math.min(sel, Math.max(items.length - 1, 0));

  useEffect(() => setSel(0), [query]);

  // Gewählten Treffer sichtbar halten, wenn die Liste scrollt.
  useEffect(() => {
    if (!show) return;
    list.current?.querySelector<HTMLElement>(`#${CSS.escape(optId(cur))}`)?.scrollIntoView({ block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur, show]);

  // Strg/⌘+K oder „/“ (außerhalb von Eingabefeldern) springt ins Suchfeld.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !typing)) {
        e.preventDefault();
        input.current?.focus();
        input.current?.select();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Klick außerhalb schließt die Liste.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [open]);

  const choose = (it: Item | undefined, help = false) => {
    if (!it) return;
    setOpen(false);
    input.current?.blur();
    if (it.kind === 'panel') onShowPanel(it.hit.panel.id, it.hit.tabs[0]?.id);
    else if (it.kind === 'bookmark') onOpen(it.hit);
    // F-156: Funktion ausführen; Begriffe und Umschalt+Enter öffnen die Hilfe an dieser Stelle
    else {
      // Funktion oder Hilfe: Suchtext leeren, sonst steht „Tour“ o. Ä. danach noch im Feld
      setQuery('');
      if (help || !it.hit.run) onHelp(it.hit.id);
      else onRun(it.hit);
    }
  };

  const move = (to: number) => {
    const n = items.length;
    if (!n) return;
    setOpen(true);
    setSel(((to % n) + n) % n);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    const n = items.length;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        // Liste zu: erst öffnen, Auswahl bleibt auf dem ersten Treffer
        if (!show) setOpen(true);
        else move(cur + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!show) setOpen(true);
        else move(cur - 1);
        break;
      case 'PageDown':
        if (show && n) {
          e.preventDefault();
          setSel(Math.min(cur + 5, n - 1));
        }
        break;
      case 'PageUp':
        if (show && n) {
          e.preventDefault();
          setSel(Math.max(cur - 5, 0));
        }
        break;
      case 'Home':
      case 'End':
        // Pos1/Ende bewegen den Cursor im Text; mit Alt springen sie in der Liste.
        if (show && n && e.altKey) {
          e.preventDefault();
          setSel(e.key === 'Home' ? 0 : n - 1);
        }
        break;
      case 'Enter':
        if (show && items[cur]) {
          e.preventDefault();
          choose(items[cur], e.shiftKey);
        }
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        if (show) setOpen(false);
        else if (query) setQuery('');
        else input.current?.blur();
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  };

  const status = !query.trim()
    ? ''
    : items.length === 0
      ? 'Nichts gefunden.'
      : `${panelHits.length} ${panelHits.length === 1 ? 'Portal' : 'Portale'}, ${hits.length} ${hits.length === 1 ? 'Source' : 'Sources'} in der Library${helpHits.length ? `, ${helpHits.length} ${helpHits.length === 1 ? 'Funktion' : 'Funktionen'}` : ''} gefunden. Pfeiltasten wählen, Enter öffnet${helpHits.length ? ', Umschalt+Enter zeigt die Hilfe' : ''}.`;

  const option = (i: number, label: string, children: ReactNode, title?: string) => (
    <li
      key={optId(i)}
      id={optId(i)}
      role="option"
      aria-selected={i === cur}
      aria-label={label}
      className={i === cur ? 'search__hit is-sel' : 'search__hit'}
      title={title}
      // Maus wählt nur bei echter Bewegung, damit ein ruhender Zeiger die Tastatur-Auswahl nicht überschreibt.
      onMouseMove={() => i !== cur && setSel(i)}
      // Mausklick darf den Fokus nicht aus dem Feld nehmen.
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => choose(items[i], e.shiftKey)}
    >
      {children}
    </li>
  );

  return (
    <div className="search" ref={box}>
      <input
        ref={input}
        className="search__input"
        type="search"
        value={query}
        placeholder="Suchen …"
        title="Portale, Library und Funktionen durchsuchen (Strg/⌘+K oder /)"
        aria-label="Portale, Library und Funktionen durchsuchen"
        aria-describedby={`${uid}-help`}
        role="combobox"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-expanded={show}
        aria-controls={listId}
        aria-activedescendant={show && items[cur] ? optId(cur) : undefined}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      <span id={`${uid}-help`} className="sr-only">
        Sucht in Portalen (Name, Slot, Case), in der Library (Titel, Adresse, Kategorie, Tags) und in den Funktionen. Pfeiltasten wählen, Enter öffnet oder führt aus, Umschalt+Enter zeigt die Hilfe, Escape schließt.
      </span>
      {/* Ansage für Bildschirmleser, wie viele Treffer es gibt */}
      <span className="sr-only" role="status" aria-live="polite">
        {show ? status : ''}
      </span>
      {show && (
        <ul className="search__list" id={listId} role="listbox" aria-label="Suchtreffer" ref={list}>
          {items.length === 0 && (
            <li className="search__empty" role="presentation">
              Nichts gefunden.
            </li>
          )}
          {panelHits.length > 0 && (
            <li className="search__head" role="presentation">
              Portale
            </li>
          )}
          {panelHits.map((h, i) =>
            option(
              i,
              `Portal ${h.panel.name}${h.tabs.length ? `, geöffnet: ${tabNames(ws, h).join(', ')}` : ''}${h.area ? `, Slot ${h.area}` : ''}${h.scenario ? `, Case ${h.scenario}` : ''}`,
              <>
                <span className="search__title">
                  {h.panel.name}
                  {/* Über einen offenen Tab gefunden: diesen nennen (Klick zeigt ihn) */}
                  {h.tabs.length > 0 && (
                    <span className="search__tab">
                      {tabNames(ws, h).slice(0, 2).join(', ')}
                      {tabNames(ws, h).length > 2 ? ` +${tabNames(ws, h).length - 2}` : ''}
                    </span>
                  )}
                </span>
                <span className="search__where">
                  {h.area && <span className="search__panel">{h.area}</span>}
                  {[h.sphere, h.scenario].filter(Boolean).map((x) => (
                    <span key={x} className="search__cat">
                      {x}
                    </span>
                  ))}
                  <span className="search__host">
                    {h.panel.tabs.length} {h.panel.tabs.length === 1 ? 'Tab' : 'Tabs'}
                  </span>
                </span>
              </>,
            ),
          )}
          {hits.length > 0 && (
            <li className="search__head" role="presentation">
              Library
            </li>
          )}
          {hits.map((h, j) => {
            const i = panelHits.length + j;
            const where = h.panel ? h.panel.name : `Library → ${activeName ?? 'aktives Portal'}`;
            const title = h.bookmark.title || hostOf(h.bookmark.url);
            return option(
              i,
              `Source ${title}, öffnet in ${h.panel ? `Portal ${h.panel.name}` : (activeName ?? 'dem aktiven Portal')}${h.category ? `, Kategorie ${h.category}` : ''}`,
              <>
                <span className="search__title">{title}</span>
                <span className="search__where">
                  <span className="search__panel">{where}</span>
                  {h.category && <span className="search__cat">{h.category}</span>}
                  <span className="search__host">{hostOf(h.bookmark.url)}</span>
                </span>
              </>,
              h.bookmark.url,
            );
          })}
          {helpHits.length > 0 && (
            <li className="search__head" role="presentation">
              Funktionen &amp; Hilfe
            </li>
          )}
          {helpHits.map((h, j) => {
            const i = panelHits.length + hits.length + j;
            const does = h.run ? 'Enter führt aus, Umschalt+Enter zeigt die Hilfe' : 'Enter zeigt die Hilfe';
            return option(
              i,
              `${h.group === 'Begriffe' ? 'Begriff' : 'Funktion'} ${h.name}${h.keys ? `, Kürzel ${h.keys}` : ''}: ${h.text} ${does}.`,
              <>
                <span className="search__title">
                  {h.name}
                  {h.keys && <kbd className="search__kbd">{h.keys}</kbd>}
                </span>
                <span className="search__where">
                  <span className="search__help-text">{h.text}</span>
                  <span className="search__cat">{h.run ? '↵ ausführen · ⇧↵ Hilfe' : '↵ Hilfe'}</span>
                </span>
              </>,
              h.text,
            );
          })}
          {hits.length >= SEARCH_MAX && (
            <li className="search__empty" role="presentation">
              Nur die ersten {SEARCH_MAX} Treffer – Suche genauer eingeben.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
