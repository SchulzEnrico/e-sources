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
import { SiteIcon, useDisplay } from './SiteIcon';
import { type KeyboardEvent as ReactKeyboardEvent, type ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react';
import { type PanelHit, type SearchHit, SEARCH_MAX, bookmarkOf, searchAll, searchPanels } from '../workspace/bookmarks';
import { hostOf, isBlocked, tabLabel } from '../workspace/workspace';
import { type How, HOW_IN, HOW_NAME } from '../workspace/launcher';
import type { Workspace } from '../workspace/types';
import { type HelpEntry, type QuestionHit, QUESTION_TEXT, asksQuestion, searchHelp, searchQuestions } from '../workspace/help';
import { Icon } from './Icon';
import { WEB_TEXT } from '../workspace/terms';
import { helpIcon } from '../workspace/icons';
import { searchCases } from '../workspace/cases';
import { CASE_TEXT } from '../workspace/terms';
import { Dot } from './Cases';

interface Props {
  ws: Workspace;
  /** Name des aktiven Panels (dort öffnen Lesezeichen, die keinem Panel zugeordnet sind). */
  activeName: string | null;
  /** swap = Strg/⌘: Source, die außerhalb aufgeht, auf die andere Art öffnen (F-149). */
  onOpen: (hit: SearchHit, swap?: boolean) => void;
  /** F-149: Voreinstellung für Sources, die sich nicht einbetten lassen. */
  launchHow: How;
  /** F-141: Panel nach vorn holen; mit tabId auch diesen Tab zeigen. */
  onShowPanel: (panelId: string, tabId?: string) => void;
  /** F-156: Funktion ausführen (Enter auf einem Funktions-Treffer). */
  onRun: (entry: HelpEntry) => void;
  /** F-156: Hilfe an dieser Stelle öffnen (Umschalt+Enter, oder Enter bei Begriffen). */
  onHelp: (id: string) => void;
  /** F-189: im Web suchen (neuer Browser-Tab); mit Name der Suchmaschine. */
  onWebSearch?: (query: string) => void;
  engineName?: string;
  /** F-116: Case wählen (wie im Layout-Modus des Cockpits). */
  onPickCase?: (caseId: string) => void;
}

/** Name eines offenen Tabs: Titel des Lesezeichens, sonst die Domain; ohne Doppelte. */
function tabNames(ws: Workspace, h: PanelHit): string[] {
  return [...new Set(h.tabs.map((t) => bookmarkOf(ws, t.url, h.panel.id)?.title || tabLabel(t)))];
}

type CaseHit = ReturnType<typeof searchCases>[number];
type Item = { kind: 'case'; hit: CaseHit } | { kind: 'web'; hit: string } | { kind: 'panel'; hit: PanelHit } | { kind: 'bookmark'; hit: SearchHit } | { kind: 'help'; hit: HelpEntry } | { kind: 'question'; hit: QuestionHit };

export function Search(props: Props) {
  const { ws, activeName, onOpen, onShowPanel, onRun, onHelp, launchHow } = props;
  const uid = useId().replace(/:/g, '');
  const listId = `${uid}-list`;
  const optId = (i: number) => `${uid}-opt-${i}`;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const display = useDisplay();
  const list = useRef<HTMLUListElement>(null);

  // F-149: Sources, die außerhalb aufgehen, nur einmal zeigen (das Portal spielt für sie keine Rolle)
  const hits = useMemo(() => {
    const seen = new Set<string>();
    return searchAll(ws, query).filter((h) => {
      if (!isBlocked(ws, h.bookmark.url)) return true;
      if (seen.has(h.bookmark.id)) return false;
      seen.add(h.bookmark.id);
      return true;
    });
  }, [ws, query]);
  const panelHits = useMemo(() => searchPanels(ws, query), [ws, query]);
  const caseHits = useMemo(() => (props.onPickCase ? searchCases(ws, query) : []), [ws, query, props.onPickCase]);
  const helpHits = useMemo(() => searchHelp(query, 4), [query]);
  // F-186: Fragen als Vorschläge; beginnt die Eingabe mit „wie“, „warum“ …, stehen sie ganz oben
  const qHits = useMemo(() => searchQuestions(query, 3), [query]);
  const qFirst = asksQuestion(query);
  const items: Item[] = useMemo(() => {
    const qs = qHits.map((hit) => ({ kind: 'question' as const, hit }));
    return [
      ...(qFirst ? qs : []),
      ...caseHits.map((hit) => ({ kind: 'case' as const, hit })),
      ...panelHits.map((hit) => ({ kind: 'panel' as const, hit })),
      ...hits.map((hit) => ({ kind: 'bookmark' as const, hit })),
      ...(qFirst ? [] : qs),
      ...helpHits.map((hit) => ({ kind: 'help' as const, hit })),
      // F-189: zuletzt immer „Im Web suchen“
      ...(props.onWebSearch && query.trim() ? [{ kind: 'web' as const, hit: query.trim() }] : []),
    ];
  }, [caseHits, panelHits, hits, helpHits, qHits, qFirst, query, props.onWebSearch]); // eslint-disable-line react-hooks/exhaustive-deps
  /** Treffer ohne „Im Web suchen“. */
  const found = items.filter((it) => it.kind !== 'web').length;
  // Startnummern der Gruppen in `items` (für die ids der Optionen)
  const cBase = qFirst ? qHits.length : 0;
  const pBase = cBase + caseHits.length;
  const qBase = qFirst ? 0 : pBase + panelHits.length + hits.length;
  const helpBase = pBase + panelHits.length + hits.length + (qFirst ? 0 : qHits.length);
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

  const choose = (it: Item | undefined, help = false, swap = false) => {
    if (!it) return;
    setOpen(false);
    input.current?.blur();
    if (it.kind === 'web') {
      setQuery('');
      props.onWebSearch?.(it.hit);
    } else if (it.kind === 'case') {
      setQuery('');
      props.onPickCase?.(it.hit.c.id);
    } else if (it.kind === 'panel') onShowPanel(it.hit.panel.id, it.hit.tabs[0]?.id);
    else if (it.kind === 'bookmark') onOpen(it.hit, swap);
    // F-186: Frage → Antwort in der Hilfe zeigen
    else if (it.kind === 'question') {
      setQuery('');
      onHelp(it.hit.entry.id);
    }
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
          choose(items[cur], e.shiftKey, e.ctrlKey || e.metaKey);
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
    : found === 0
      ? `Nichts gefunden.${props.onWebSearch ? ' Enter sucht im Web.' : ''}`
      : `${qHits.length ? `${QUESTION_TEXT.count(qHits.length)}, ` : ''}${panelHits.length} ${panelHits.length === 1 ? 'Portal' : 'Portale'}, ${hits.length} ${hits.length === 1 ? 'Source' : 'Sources'} in der Library${helpHits.length ? `, ${helpHits.length} ${helpHits.length === 1 ? 'Funktion' : 'Funktionen'}` : ''} gefunden. Pfeiltasten wählen, Enter öffnet${helpHits.length ? ', Umschalt+Enter zeigt die Hilfe' : ''}.`;

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
      onClick={(e) => choose(items[i], e.shiftKey, e.ctrlKey || e.metaKey)}
    >
      {children}
    </li>
  );

  const questionBlock = () =>
    qHits.length > 0 && (
      <>
        <li className="search__head" role="presentation">
          {QUESTION_TEXT.head}
        </li>
        {qHits.map((h, j) =>
          option(
            qBase + j,
            QUESTION_TEXT.option(h),
            <>
              <span className="search__title">
                <Icon name={helpIcon(h.entry.id)} className="icon search__icon" />
                {h.q}
              </span>
              <span className="search__where">
                <span className="search__help-text">{h.entry.text}</span>
                <span className="search__cat">{QUESTION_TEXT.hint}</span>
              </span>
            </>,
            h.entry.text,
          ),
        )}
      </>
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
        Sucht nach Cases, in Portalen (Name, Slot, Case), in der Library (Titel, Adresse, Kategorie, Tags, Herkunft) und in den Funktionen; passende Fragen erscheinen als Vorschläge. Pfeiltasten wählen, Enter öffnet oder führt aus, Umschalt+Enter zeigt die Hilfe, Escape schließt. Sources mit „neuer Tab“ oder „neues Fenster“ öffnen außerhalb von E-Sources; Strg/⌘+Enter nimmt die andere Art.
      </span>
      {/* Ansage für Bildschirmleser, wie viele Treffer es gibt */}
      <span className="sr-only" role="status" aria-live="polite">
        {show ? status : ''}
      </span>
      {show && (
        <ul className="search__list" id={listId} role="listbox" aria-label="Suchtreffer" ref={list}>
          {found === 0 && (
            <li className="search__empty" role="presentation">
              Nichts gefunden.
            </li>
          )}
          {qFirst && questionBlock()}
          {caseHits.length > 0 && (
            <li className="search__head" role="presentation">
              Cases
            </li>
          )}
          {caseHits.map((h, k) =>
            option(
              cBase + k,
              CASE_TEXT.searchHitOf(h.c.name, h.space.name),
              <>
                <span className="search__title">
                  <Dot color={h.c.color} /> {h.c.name}
                </span>
                <span className="search__where">
                  <span className="search__cat">
                    {h.space.name} · {CASE_TEXT.searchHit}
                  </span>
                </span>
              </>,
              CASE_TEXT.caseTerm,
            ),
          )}
          {panelHits.length > 0 && (
            <li className="search__head" role="presentation">
              Portale
            </li>
          )}
          {panelHits.map((h, k) =>
            option(
              pBase + k,
              `Portal ${h.panel.name}${h.tabs.length ? `, geöffnet: ${tabNames(ws, h).join(', ')}` : ''}${h.area ? `, Slot ${h.area}` : ''}${h.scenario ? `, Case ${h.scenario}` : ''}`,
              <>
                <span className="search__title">
                  <Icon name="portal" className="icon search__icon" />
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
            const i = pBase + panelHits.length + j;
            const out = isBlocked(ws, h.bookmark.url);
            const where = out ? `↗ ${HOW_NAME[launchHow]}` : h.panel ? h.panel.name : `Library → ${activeName ?? 'aktives Portal'}`;
            const title = h.bookmark.title || hostOf(h.bookmark.url);
            const opens = out ? `${HOW_IN[launchHow]}, Strg/⌘+Enter: ${HOW_IN[launchHow === 'tab' ? 'window' : 'tab']}` : h.panel ? `Portal ${h.panel.name}` : (activeName ?? 'dem aktiven Portal');
            return option(
              i,
              `Source ${title}, öffnet in ${opens}${h.category ? `, Kategorie ${h.category}` : ''}`,
              <>
                <span className="search__title">
                  <Icon name={out ? 'launcher' : 'source'} className="icon search__icon" />
                  <SiteIcon url={h.bookmark.url} size={14} on={display.favicons} />
                  {title}
                </span>
                <span className="search__where">
                  <span className={out ? 'search__panel search__out' : 'search__panel'}>{where}</span>
                  {h.category && <span className="search__cat">{h.category}</span>}
                  <span className="search__host">{hostOf(h.bookmark.url)}</span>
                </span>
              </>,
              out ? `${h.bookmark.url}\nLässt sich nicht einbetten – öffnet außerhalb (Launcher). Strg/⌘+Enter: ${HOW_NAME[launchHow === 'tab' ? 'window' : 'tab']}` : h.bookmark.url,
            );
          })}
          {!qFirst && questionBlock()}
          {helpHits.length > 0 && (
            <li className="search__head" role="presentation">
              Funktionen &amp; Hilfe
            </li>
          )}
          {helpHits.map((h, j) => {
            const i = helpBase + j;
            const does = h.run ? 'Enter führt aus, Umschalt+Enter zeigt die Hilfe' : 'Enter zeigt die Hilfe';
            return option(
              i,
              `${h.group === 'Begriffe' ? 'Begriff' : 'Funktion'} ${h.name}${h.keys ? `, Kürzel ${h.keys}` : ''}: ${h.text} ${does}.`,
              <>
                <span className="search__title">
                  <Icon name={helpIcon(h.id)} className="icon search__icon" />
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
          {items[items.length - 1]?.kind === 'web' && (
            <>
              <li className="search__head" role="presentation">
                {WEB_TEXT.searchItem}
              </li>
              {option(
                items.length - 1,
                `${WEB_TEXT.searchFor(query.trim(), props.engineName ?? 'Google')}. Öffnet ein eigenes Fenster daneben.`,
                <span className="search__title">
                  <Icon name="search" className="icon search__icon" />
                  {WEB_TEXT.searchFor(query.trim(), props.engineName ?? 'Google')}
                  <span className="search__cat"> ↗ eigenes Fenster</span>
                </span>,
              )}
            </>
          )}
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
