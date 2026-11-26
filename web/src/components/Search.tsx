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
import { ScopeNote } from './DeskProject';
import { scopeProject } from '../workspace/deskProject';
import { SiteIcon, useDisplay } from './SiteIcon';
import { Fragment, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react';
import { type PanelHit, type SearchHit, SEARCH_MAX, bookmarkOf, searchAll, searchPanels } from '../workspace/bookmarks';
import { hostOf, isBlocked, tabLabel } from '../workspace/workspace';
import { type How, HOW_IN, HOW_NAME } from '../workspace/launcher';
import type { Decision, Workspace } from '../workspace/types';
import { searchDecisions } from '../workspace/decisions';
import { type HelpEntry, type QuestionHit, QUESTION_TEXT, asksQuestion, searchHelp, searchQuestions } from '../workspace/help';
import { Icon } from './Icon';
import { WEB_TEXT } from '../workspace/terms';
import { helpIcon } from '../workspace/icons';
import { searchCases } from '../workspace/cases';
import { CASE_TEXT } from '../workspace/terms';
import { Dot } from './Cases';
import { type NoteHit, VIEW_BASE, searchNotes, stateOf, tabShowing } from '../workspace/notes';
import * as No from '../workspace/notes';
import { padShowing } from '../workspace/pads';
import { DECISION_TEXT, NOTE_TEXT, PAD_TEXT, SEARCH_TEXT } from '../workspace/terms';
import { type SearchChip, type SearchKind, SEARCH_CHIPS, byChip, chipCounts, chipStep, rankHits } from '../workspace/searchRank';

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
  /** F-206: Notiz bzw. Ansicht in einem Tab zeigen. */
  onOpenNote?: (hit: NoteHit) => void;
  /** V108 (F-222 E6): Entscheidung im Cockpit „Entscheidungen“ öffnen. */
  onOpenDecision?: (id: string) => void;
}

/** Name eines offenen Tabs: Titel des Lesezeichens, sonst die Domain; ohne Doppelte. */
function tabNames(ws: Workspace, h: PanelHit): string[] {
  return [...new Set(h.tabs.map((t) => bookmarkOf(ws, t.url, h.panel.id)?.title || tabLabel(t)))];
}

type CaseHit = ReturnType<typeof searchCases>[number];
type Item = { kind: 'case'; hit: CaseHit } | { kind: 'web'; hit: string } | { kind: 'panel'; hit: PanelHit } | { kind: 'bookmark'; hit: SearchHit } | { kind: 'help'; hit: HelpEntry } | { kind: 'question'; hit: QuestionHit } | { kind: 'note'; hit: NoteHit } | { kind: 'decision'; hit: Decision };

type Ranked = Item & { sk: SearchKind; title: string; extra: string[] };

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
  const scope = scopeProject(); // V117 (PD5): neue Begrenzung = neu suchen
  const noteHits = useMemo(() => (props.onOpenNote ? searchNotes(ws, query) : []), [ws, query, props.onOpenNote, scope]); // eslint-disable-line react-hooks/exhaustive-deps
  const decisionHits = useMemo(() => (props.onOpenDecision ? searchDecisions(ws, query) : []), [ws, query, props.onOpenDecision]);
  const caseHits = useMemo(() => (props.onPickCase ? searchCases(ws, query) : []), [ws, query, props.onPickCase]);
  const helpHits = useMemo(() => searchHelp(query, 4), [query]);
  // F-186: Fragen als Vorschläge; beginnt die Eingabe mit „wie“, „warum“ …, stehen sie ganz oben
  const qHits = useMemo(() => searchQuestions(query, 3), [query]);
  const qFirst = asksQuestion(query);
  // V84 (F-206 N6): alle Arten in einer Liste, beste Passung oben; Chip filtert nach Art
  const [chip, setChip] = useState<SearchChip>('all');
  const ranked = useMemo(() => {
    const all: Ranked[] = [
      ...caseHits.map((hit) => ({ kind: 'case' as const, hit, sk: 'case' as const, title: hit.c.name, extra: [hit.space.name] })),
      ...panelHits.map((hit) => ({ kind: 'panel' as const, hit, sk: 'portal' as const, title: hit.panel.name, extra: [hit.area ?? '', hit.sphere ?? '', hit.scenario ?? '', ...tabNames(ws, hit)] })),
      ...hits.map((hit) => ({ kind: 'bookmark' as const, hit, sk: 'source' as const, title: hit.bookmark.title || hostOf(hit.bookmark.url), extra: [hit.bookmark.url, hit.category ?? ''] })),
      ...noteHits.map((hit) =>
        hit.kind === 'view'
          ? { kind: 'note' as const, hit, sk: 'view' as const, title: hit.view.name, extra: [] }
          : { kind: 'note' as const, hit, sk: 'note' as const, title: hit.title || NOTE_TEXT.untitled, extra: [hit.snippet ?? ''] },
      ),
      ...decisionHits.map((hit) => ({ kind: 'decision' as const, hit, sk: 'decision' as const, title: hit.title, extra: [hit.question ?? ''] })),
      ...qHits.map((hit) => ({ kind: 'question' as const, hit, sk: 'question' as const, title: hit.q, extra: [hit.entry.name, hit.entry.text] })),
      ...helpHits.map((hit) => ({ kind: 'help' as const, hit, sk: (hit.group === 'Begriffe' ? 'term' : 'function') as SearchKind, title: hit.name, extra: [hit.text] })),
    ];
    return rankHits(all.map((x) => ({ ...x, kind: x.sk, item: x as Item })), query, qFirst).map((x) => ({ item: x.item, sk: x.sk }));
  }, [caseHits, panelHits, hits, noteHits, helpHits, qHits, qFirst, query, ws]);
  const counts = useMemo(() => chipCounts(ranked.map((r) => ({ kind: r.sk }))), [ranked]);
  const shownHits = useMemo(() => byChip(ranked.map((r) => ({ ...r, kind: r.sk })), chip), [ranked, chip]);
  const items: Item[] = useMemo(
    () => [
      ...shownHits.map((r) => r.item),
      // F-189: zuletzt immer „Im Web suchen“
      ...(props.onWebSearch && query.trim() ? [{ kind: 'web' as const, hit: query.trim() }] : []),
    ],
    [shownHits, query, props.onWebSearch],
  );
  const kindAt = (i: number): SearchKind | 'web' => shownHits[i]?.sk ?? 'web';
  /** Treffer ohne „Im Web suchen“ (im gewählten Chip). */
  const found = shownHits.length;
  const show = open && query.trim() !== '';
  const cur = Math.min(sel, Math.max(items.length - 1, 0));

  useEffect(() => setSel(0), [query]);
  // V84: Feld geleert → Filter wieder „Alle“ (nicht beim Öffnen über „Notiz suchen …“ – da ändert sich der Text nicht)
  useEffect(() => {
    if (!query.trim()) setChip('all');
  }, [query]);

  /** V84 (N6): Chip wählen – Auswahl zurück auf den ersten Treffer, Ansage über role=status */
  const pickChip = (c: SearchChip) => {
    setChip(c);
    setSel(0);
    setOpen(true);
  };

  // V84 (N4/N6): „Notiz suchen …“ im Menü „Notizen & Aufgaben“ schickt esource:find – Suche mit Chip „Notizen“
  useEffect(() => {
    const onFind = (e: Event) => {
      const kind = (e as CustomEvent<{ kind?: string }>).detail?.kind;
      setChip(kind === 'notes' ? 'notes' : kind === 'portals' ? 'portals' : kind === 'library' ? 'library' : kind === 'functions' ? 'functions' : 'all');
      setSel(0);
      setOpen(true);
      input.current?.focus();
      input.current?.select();
    };
    window.addEventListener('esource:find', onFind);
    return () => window.removeEventListener('esource:find', onFind);
  }, []);

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
    setChip('all');
    input.current?.blur();
    if (it.kind === 'web') {
      setQuery('');
      props.onWebSearch?.(it.hit);
    } else if (it.kind === 'case') {
      setQuery('');
      props.onPickCase?.(it.hit.c.id);
    } else if (it.kind === 'panel') onShowPanel(it.hit.panel.id, it.hit.tabs[0]?.id);
    else if (it.kind === 'bookmark') onOpen(it.hit, swap);
    else if (it.kind === 'note') {
      setQuery('');
      props.onOpenNote?.(it.hit);
    } else if (it.kind === 'decision') {
      setQuery('');
      props.onOpenDecision?.(it.hit.id);
    }
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
    // V84 (N6): Strg/⌃+←/→ wechselt den Chip (ohne Strg bleiben ←/→ im Text)
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && e.ctrlKey && !e.altKey && !e.metaKey && query.trim()) {
      e.preventDefault();
      pickChip(chipStep(chip, e.key === 'ArrowRight' ? 1 : -1, counts));
      return;
    }
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
        else if (chip !== 'all') setChip('all');
        else input.current?.blur();
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  };

  const status = !query.trim()
    ? ''
    : `${chip === 'all' ? '' : `${SEARCH_TEXT.filter(SEARCH_TEXT.chips[chip])} `}${
        found === 0
          ? `Nichts gefunden.${props.onWebSearch ? ' Enter sucht im Web.' : ''}`
          : `${SEARCH_TEXT.countLine(counts)} Beste Treffer oben. Pfeiltasten wählen, Enter öffnet${helpHits.length ? ', Umschalt+Enter zeigt die Hilfe' : ''}, Strg+Pfeil links/rechts filtert nach Art.`
      }`;

  const option = (i: number, label: string, children: ReactNode, title?: string, k: SearchKind | 'web' = 'web') => (
    <li
      key={optId(i)}
      id={optId(i)}
      role="option"
      aria-selected={i === cur}
      aria-label={label}
      className={`search__hit search__hit--${k}${i === cur ? ' is-sel' : ''}`}
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

  /** V84 (N6): Art-Kennung – Wort am Treffer (Symbol steht vorn im Titel, farbige Kante über die Klasse) */
  const kindTag = (k: SearchKind) => (
    <span className="search__kind" aria-hidden="true">
      {SEARCH_TEXT.kind[k]}
    </span>
  );

  const renderItem = (it: Item, i: number): ReactNode => {
    const k = kindAt(i);
    const opt = (label: string, children: ReactNode, title?: string) => option(i, label, children, title, k);
    switch (it.kind) {
      case 'question': {
        const h = it.hit;
        return opt(
          QUESTION_TEXT.option(h),
          <>
            <span className="search__title">
              <Icon name={helpIcon(h.entry.id)} className="icon search__icon" />
              {h.q}
              {kindTag('question')}
            </span>
            <span className="search__where">
              <span className="search__help-text">{h.entry.text}</span>
              <span className="search__cat">{QUESTION_TEXT.hint}</span>
            </span>
          </>,
          h.entry.text,
        );
      }
      case 'case': {
        const h = it.hit;
        return opt(
          CASE_TEXT.searchHitOf(h.c.name, h.space.name),
          <>
            <span className="search__title">
              <Dot color={h.c.color} /> {h.c.name}
              {kindTag('case')}
            </span>
            <span className="search__where">
              <span className="search__cat">
                {h.space.name} · {CASE_TEXT.searchHit}
              </span>
            </span>
          </>,
          CASE_TEXT.caseTerm,
        );
      }
      case 'panel': {
        const h = it.hit;
        const names = tabNames(ws, h);
        return opt(
          `Portal ${h.panel.name}${h.tabs.length ? `, geöffnet: ${names.join(', ')}` : ''}${h.area ? `, Slot ${h.area}` : ''}${h.scenario ? `, Case ${h.scenario}` : ''}`,
          <>
            <span className="search__title">
              <Icon name="portal" className="icon search__icon" />
              {h.panel.name}
              {/* Über einen offenen Tab gefunden: diesen nennen (Klick zeigt ihn) */}
              {h.tabs.length > 0 && (
                <span className="search__tab">
                  {names.slice(0, 2).join(', ')}
                  {names.length > 2 ? ` +${names.length - 2}` : ''}
                </span>
              )}
              {kindTag('portal')}
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
        );
      }
      case 'bookmark': {
        const h = it.hit;
        const out = isBlocked(ws, h.bookmark.url);
        const where = out ? `↗ ${HOW_NAME[launchHow]}` : h.panel ? h.panel.name : `Library → ${activeName ?? 'aktives Portal'}`;
        const title = h.bookmark.title || hostOf(h.bookmark.url);
        const opens = out ? `${HOW_IN[launchHow]}, Strg/⌘+Enter: ${HOW_IN[launchHow === 'tab' ? 'window' : 'tab']}` : h.panel ? `Portal ${h.panel.name}` : (activeName ?? 'dem aktiven Portal');
        return opt(
          `Source ${title}, öffnet in ${opens}${h.category ? `, Kategorie ${h.category}` : ''}`,
          <>
            <span className="search__title">
              <Icon name={out ? 'launcher' : 'source'} className="icon search__icon" />
              <SiteIcon url={h.bookmark.url} size={14} on={display.favicons} />
              {title}
              {kindTag('source')}
            </span>
            <span className="search__where">
              <span className={out ? 'search__panel search__out' : 'search__panel'}>{where}</span>
              {h.category && <span className="search__cat">{h.category}</span>}
              <span className="search__host">{hostOf(h.bookmark.url)}</span>
            </span>
          </>,
          out ? `${h.bookmark.url}\nLässt sich nicht einbetten – öffnet außerhalb (Launcher). Strg/⌘+Enter: ${HOW_NAME[launchHow === 'tab' ? 'window' : 'tab']}` : h.bookmark.url,
        );
      }
      case 'decision': {
        const d = it.hit;
        const where = DECISION_TEXT.searchWhere(ws.projects?.find((x) => x.id === d.projectId)?.name);
        const state = DECISION_TEXT.states[d.state] ?? '';
        return opt(
          DECISION_TEXT.searchLabel(d.title, state, where),
          <>
            <span className="search__title">
              <Icon name="sliders" className="icon search__icon" />
              {d.title}
              {kindTag('decision')}
            </span>
            <span className="search__where">
              <span className="search__panel">{where}</span>
              <span className="search__cat">{state}</span>
            </span>
          </>,
        );
      }
      case 'note': {
        const h = it.hit;
        const ref = h.kind === 'note' ? { note: h.note.id } : { view: h.view.id };
        const shown = tabShowing(ws, ref);
        // F-206 Schritt 3: Notes öffnen im Pad (alte Notiz-Tabs bis zum Umstieg noch im Portal)
        const inPad = shown ? null : padShowing(ws, ref);
        const where = shown
          ? `${ws.panels.find((p) => p.id === shown.panel)?.name ?? ''} · ${NOTE_TEXT.searchShown}`
          : inPad
            ? `${PAD_TEXT.searchPad(No.viewById(ws, inPad.sheet)?.name ?? '')} · ${NOTE_TEXT.searchShown}`
            : PAD_TEXT.searchToPad;
        if (h.kind === 'view') {
          const kind = VIEW_BASE[h.view.kind];
          return opt(
            NOTE_TEXT.searchView(h.view.name, kind, where),
            <>
              <span className="search__title">
                <Icon name={h.view.kind === 'eisenhower' ? 'matrix' : h.view.kind === 'block' ? 'note' : h.view.kind} className="icon search__icon" />
                {h.view.name}
                {kindTag('view')}
              </span>
              <span className="search__where">
                <span className="search__panel">{where}</span>
                <span className="search__cat">{kind}</span>
              </span>
            </>,
          );
        }
        const state = NOTE_TEXT.states[stateOf(ws, h.note).state] ?? '';
        return opt(
          NOTE_TEXT.searchNote(h.title || NOTE_TEXT.untitled, state, where),
          <>
            <span className="search__title">
              <Icon name="note" className="icon search__icon" />
              {h.title || NOTE_TEXT.untitled}
              {kindTag('note')}
            </span>
            <span className="search__where">
              <span className="search__panel">{where}</span>
              <span className="search__cat">{state}</span>
              {h.snippet && <span className="search__host">{h.snippet}</span>}
            </span>
          </>,
        );
      }
      case 'help': {
        const h = it.hit;
        const does = h.run ? 'Enter führt aus, Umschalt+Enter zeigt die Hilfe' : 'Enter zeigt die Hilfe';
        return opt(
          `${h.group === 'Begriffe' ? 'Begriff' : 'Funktion'} ${h.name}${h.keys ? `, Kürzel ${h.keys}` : ''}: ${h.text} ${does}.`,
          <>
            <span className="search__title">
              <Icon name={helpIcon(h.id)} className="icon search__icon" />
              {h.name}
              {h.keys && <kbd className="search__kbd">{h.keys}</kbd>}
              {kindTag(k as SearchKind)}
            </span>
            <span className="search__where">
              <span className="search__help-text">{h.text}</span>
              <span className="search__cat">{h.run ? '↵ ausführen · ⇧↵ Hilfe' : '↵ Hilfe'}</span>
            </span>
          </>,
          h.text,
        );
      }
      case 'web':
        return opt(
          `${WEB_TEXT.searchFor(it.hit, props.engineName ?? 'Google')}. Öffnet ein eigenes Fenster daneben.`,
          <span className="search__title">
            <Icon name="search" className="icon search__icon" />
            {WEB_TEXT.searchFor(it.hit, props.engineName ?? 'Google')}
            <span className="search__cat"> ↗ eigenes Fenster</span>
          </span>,
        );
    }
  };

  return (
    <div className="search" ref={box}>
      <input
        ref={input}
        className="search__input"
        type="search"
        value={query}
        placeholder={chip === 'all' ? 'Suchen …' : SEARCH_TEXT.placeholder(SEARCH_TEXT.chips[chip])}
        title="Portale, Library, Notizen und Funktionen durchsuchen (Strg/⌘+K oder /)"
        aria-label="Portale, Library, Notizen und Funktionen durchsuchen"
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
        Sucht nach Cases, in Portalen (Name, Slot, Case), in der Library (Titel, Adresse, Kategorie, Tags, Herkunft), in Notizen (Titel, Text, Tags) und in den Funktionen; passende Fragen erscheinen als Vorschläge. Die besten Treffer stehen oben, egal welcher Art; jeder Treffer nennt seine Art. Strg+Pfeil links/rechts filtert nach Art: Alle, Portale, Library, Notizen, Funktionen. Pfeiltasten wählen, Enter öffnet oder führt aus, Umschalt+Enter zeigt die Hilfe, Escape schließt. Sources mit „neuer Tab“ oder „neues Fenster“ öffnen außerhalb von E-Sources; Strg/⌘+Enter nimmt die andere Art.
      </span>
      {/* Ansage für Bildschirmleser, wie viele Treffer es gibt */}
      <span className="sr-only" role="status" aria-live="polite">
        {show ? status : ''}
      </span>
      {show && (
        <ul className="search__list" id={listId} role="listbox" aria-label="Suchtreffer" ref={list}>
          {/* V84 (N6): Chip-Zeile – Filter nach Art mit Trefferzahl; Tastatur Strg/⌃+←/→ im Feld (Ansage über role=status),
              darum hier nur für die Maus (Fokus bleibt im Feld) */}
          <li className="search__chips" role="presentation" aria-hidden="true">
            {SEARCH_CHIPS.map((c) => (
              <button
                key={c}
                type="button"
                tabIndex={-1}
                className={`search__chip search__chip--${c}${c === chip ? ' is-on' : ''}`}
                disabled={c !== 'all' && counts[c] === 0}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickChip(c)}
                title={SEARCH_TEXT.chipTitle}
              >
                {SEARCH_TEXT.chips[c]} <span className="search__chip-n">{counts[c]}</span>
              </button>
            ))}
            {/* V117 (Projekt-Desk, PD5): auf einem gebundenen Desk Notizen nur des gezeigten Projekts */}
            <ScopeNote ws={ws} className="search__scope" />
          </li>
          {found === 0 && (
            <li className="search__empty" role="presentation">
              {chip === 'all' || counts.all === 0 ? 'Nichts gefunden.' : SEARCH_TEXT.noneIn(SEARCH_TEXT.chips[chip], counts.all)}
            </li>
          )}
          {items.map((it, i) => (
            <Fragment key={optId(i)}>
              {/* „Im Web suchen“ immer unten, abgesetzt */}
              {it.kind === 'web' && found > 0 && <li className="search__sep" role="presentation" />}
              {renderItem(it, i)}
            </Fragment>
          ))}
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
