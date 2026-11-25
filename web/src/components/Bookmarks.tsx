import { Icon } from './Icon';
import { ModeWheel } from './ModeWheel';
import { SiteIcon, useDisplay } from './SiteIcon';
import { categoryIcon } from '../workspace/icons';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { type Action, reducer } from '../workspace/useWorkspace';
import type { Bookmark, Workspace } from '../workspace/types';
import { type BulkChange, NO_CATEGORY, bulkSources, categoryByName, collectionSize, groups, originOf, originText } from '../workspace/bookmarks';
import { hostOf, newId } from '../workspace/workspace';
import { BULK_TEXT, DIALOG_TEXT, PAUSE_TEXT, TERMS } from '../workspace/terms';
import { offerTourOnce, requestTour } from '../workspace/tour';
import { flash } from '../workspace/flash';

/** Zuletzt gewählte Kategorie, damit mehrere Lesezeichen hintereinander schnell in dieselbe gehen. */
let lastCategory = NO_CATEGORY;

/** Symbol für die Sammlung (F-20): Lesezeichen-Band mit Zeilen. */
export const CollectionIcon = (
  <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true" className="icon">
    <path d="M3 1.8h6.2v12.4L6.1 11.6 3 14.2z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M11 4h3M11 7h3M11 10h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

/** Seitenleiste im Panel: liegt über der Seite, lässt sich mit Esc oder × schließen. */
function Drawer(props: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && !e.defaultPrevented && props.onClose();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [props]);
  return (
    // Zeiger-Ereignisse bleiben in der Leiste, damit Wischen am Panel (Stapel) nicht auslöst.
    <aside className="drawer" onPointerDown={(e) => e.stopPropagation()} onPointerMove={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
      <header className="drawer__head">
        <h3>{props.title}</h3>
        <button type="button" className="drawer__x" onClick={props.onClose} title="Schließen (Esc)" aria-label="Schließen">
          <Icon name="close" size={14} />
        </button>
      </header>
      <div className="drawer__body">{props.children}</div>
      {props.footer && <footer className="drawer__foot">{props.footer}</footer>}
    </aside>
  );
}

/** Neues Lesezeichen mit Vorgaben für die gerade gezeigte Seite. */
export function draftFor(url: string, title: string, panelId: string): Bookmark {
  return { id: newId(), title, url, category: lastCategory, tags: [], panels: [panelId] };
}

const NEW = '__neu__';

/** F-14, F-30, F-31: Lesezeichen anlegen oder bearbeiten. */
export function BookmarkEditor(props: {
  ws: Workspace;
  bookmark: Bookmark;
  isNew: boolean;
  dispatch: (a: Action) => void;
  onDone: (text?: string) => void;
}) {
  const { ws, bookmark: b } = props;
  const [title, setTitle] = useState(b.title);
  const [url, setUrl] = useState(b.url);
  const [category, setCategory] = useState(ws.categories.some((c) => c.id === b.category) ? b.category : ws.categories.length ? NO_CATEGORY : NEW);
  const [newCat, setNewCat] = useState('');
  const [tags, setTags] = useState(b.tags.join(', '));
  const [note, setNote] = useState(b.note ?? '');
  const [panels, setPanels] = useState<string[]>(b.panels);
  const [keep, setKeep] = useState(!!b.keep);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => titleRef.current?.select(), []);

  const save = () => {
    if (!url.trim()) return;
    let cat = category === NEW ? NO_CATEGORY : category;
    if (category === NEW && newCat.trim()) {
      const found = categoryByName(ws, newCat);
      cat = found?.id ?? newId();
      if (!found) props.dispatch({ type: 'addCategory', id: cat, name: newCat });
    }
    lastCategory = cat;
    // F-185: neue Sources von Hand (☆ oder Library); beim Ändern bleibt die Herkunft
    const origin = b.origin ?? (props.isNew ? originOf(ws, 'hand') : undefined);
    props.dispatch({ type: 'saveBookmark', bookmark: { ...b, title, url, category: cat, tags: tags.split(','), note, panels, origin, keep } });
    props.onDone(props.isNew ? 'Source in der Library gespeichert.' : 'Source geändert.');
  };

  return (
    <Drawer
      title={props.isNew ? 'Source in der Library speichern' : 'Source bearbeiten'}
      onClose={() => props.onDone()}
      footer={
        <>
          {!props.isNew &&
            (confirmDelete ? (
              <button
                type="button"
                className="drawer__danger"
                onClick={() => {
                  props.dispatch({ type: 'deleteBookmark', id: b.id });
                  props.onDone('Source aus der Library gelöscht.');
                }}
              >
                Wirklich löschen
              </button>
            ) : (
              <button type="button" className="drawer__quiet" onClick={() => setConfirmDelete(true)}>
                Löschen
              </button>
            ))}
          <span className="drawer__grow" />
          <button type="button" onClick={() => props.onDone()}>
            Abbrechen
          </button>
          <button type="submit" form={`bm-${b.id}`} className="drawer__primary" disabled={!url.trim()}>
            Speichern
          </button>
        </>
      }
    >
      <form
        id={`bm-${b.id}`}
        className="bm-form"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <label>
          Titel
          <input ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={hostOf(url) || 'Titel'} />
        </label>
        <label>
          Adresse
          <input value={url} onChange={(e) => setUrl(e.target.value)} spellCheck={false} required />
        </label>
        {/* F-185: ruhige Zeile direkt unter der Adresse (sonst unter langer Portal-Liste versteckt), wer die Source wann und woher angelegt hat */}
        {!props.isNew && (
          <p className="bm-origin" title={TERMS.origin}>
            {originText(b.origin)}
          </p>
        )}
        <label>
          Kategorie
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value={NO_CATEGORY}>Ohne Kategorie</option>
            {ws.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value={NEW}>＋ Neue Kategorie …</option>
          </select>
        </label>
        {category === NEW && (
          <label>
            Name der neuen Kategorie
            <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="z. B. Doku, Jobs, Projekt XY" autoFocus />
          </label>
        )}
        <label>
          Tags <small>(mit Komma getrennt)</small>
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="z. B. react, lernen" />
        </label>
        <label>
          Notiz <small>(optional)</small>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </label>
        {/* F-202: Tabs mit dieser Source pausieren nie */}
        <label className="bm-check" title={PAUSE_TEXT.sourceKeepHint}>
          <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} aria-describedby="bm-keep-hint" />
          <Icon name="keep" size={14} /> {PAUSE_TEXT.sourceKeep}
        </label>
        <p className="bm-hint" id="bm-keep-hint">{PAUSE_TEXT.sourceKeepHint}</p>
        {/* F-14, F-32: in der Sammlung eines oder mehrerer Panels ablegen */}
        <fieldset>
          <legend>In der Library von</legend>
          {ws.panels.map((p) => (
            <label key={p.id} className="bm-check">
              <input
                type="checkbox"
                checked={panels.includes(p.id)}
                onChange={(e) => setPanels((list) => (e.target.checked ? [...list, p.id] : list.filter((x) => x !== p.id)))}
              />
              {p.name}
            </label>
          ))}
          {panels.length === 0 && <p className="bm-hint">Ohne Portal steht sie nur in der ganzen Library.</p>}
        </fieldset>
      </form>
    </Drawer>
  );
}

/** F-20, F-31, F-32, F-33: Menü der Sammlung, nach Kategorien gegliedert und durchsuchbar. */
export function CollectionDrawer(props: {
  ws: Workspace;
  panelId: string;
  panelName: string;
  /** Ist die gezeigte Seite schon gespeichert? Dann heißt der Knopf „bearbeiten“. */
  saved?: boolean;
  dispatch: (a: Action) => void;
  onOpen: (url: string) => void;
  onEdit: (b: Bookmark) => void;
  onSaveCurrent?: () => void;
  /** F-36: Lesezeichen aus dem Browser übernehmen. */
  onImport?: () => void;
  onClose: () => void;
}) {
  const { ws, panelId } = props;
  const own = collectionSize(ws, panelId);
  const [scope, setScope] = useState<'panel' | 'all'>(own > 0 ? 'panel' : 'all');
  const [query, setQuery] = useState('');
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [editCat, setEditCat] = useState<string | null>(null);
  const [catDraft, setCatDraft] = useState('');
  const [deleteCat, setDeleteCat] = useState<string | null>(null);
  const [newCat, setNewCat] = useState('');
  // F-144: Kategorie, die gerade gezogen wird, und Ansage für Bildschirmleser
  const [dragCat, setDragCat] = useState<string | null>(null);
  /** Wohin die gezogene Kategorie fällt: vor oder hinter diese Kategorie. */
  const [catDrop, setCatDrop] = useState<{ id: string; after: boolean } | null>(null);
  const [announce, setAnnounce] = useState('');
  // F-202 Stufe 2: Mehrfachauswahl (Haken je Source), z. B. „Ausgewählte nie pausieren“
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const catCount = ws.categories.length;
  const moveCat = (id: string, to: number) => {
    const target = Math.max(0, Math.min(catCount - 1, to));
    const name = ws.categories.find((c) => c.id === id)?.name ?? '';
    props.dispatch({ type: 'moveCategory', id, to: target });
    setAnnounce(`Kategorie ${name} jetzt an Position ${target + 1} von ${catCount}.`);
  };
  const list = groups(ws, scope === 'panel' ? panelId : null, query);
  const display = useDisplay();
  const [catSaid, setCatSaid] = useState('');
  const total = list.reduce((n, g) => n + g.items.length, 0);
  const shownIds = list.flatMap((g) => g.items.map((b) => b.id));
  const togglePick = (id: string) => setPicked((old) => togglePicked(old, id));

  const endDrag = () => {
    setDrag(null);
    setDragCat(null);
    setCatDrop(null);
    setOver(null);
  };
  const renameCat = () => {
    if (editCat) props.dispatch({ type: 'renameCategory', id: editCat, name: catDraft });
    setEditCat(null);
  };

  return (
    <Drawer
      title={`Library · ${props.panelName}`}
      onClose={props.onClose}
      footer={
        <form
          className="bm-newcat"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newCat.trim()) return;
            props.dispatch({ type: 'addCategory', id: newId(), name: newCat });
            setCatSaid(DIALOG_TEXT.created(`Kategorie „${newCat.trim()}“`));
            setNewCat('');
            setScope('all');
          }}
        >
          <input
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            onKeyDown={(e) => {
              // F-191 (a): Esc leert erst das Feld, danach schließt die Library wie gewohnt
              if (e.key === 'Escape' && newCat) {
                e.preventDefault();
                e.stopPropagation();
                setNewCat('');
              }
            }}
            placeholder="Neue Kategorie"
            aria-label="Neue Kategorie"
            title={DIALOG_TEXT.createHint}
          />
          {/* F-191 (a): sichtbarer Abschluss „Anlegen“ / „Abbrechen“ (Enter / Esc) */}
          <button type="button" className="bm-newcat__cancel" disabled={!newCat} onClick={() => setNewCat('')}>
            {DIALOG_TEXT.cancel}
          </button>
          <button type="submit" className="drawer__primary" disabled={!newCat.trim()}>
            {DIALOG_TEXT.create}
          </button>
          <span className="sr-only" role="status">
            {catSaid}
          </span>
        </form>
      }
    >
      <div className="bm-tools">
        {/* V84 (F-216, U6): Dieses Portal | Alle als Umschalt-Rad („Panel“ heißt seit F-183 „Portal“) */}
        <ModeWheel
          className="bm-scope"
          label="Anzeigen"
          value={scope}
          onChange={(v) => setScope(v as typeof scope)}
          options={[
            { id: 'panel', name: `Dieses Portal (${own})`, icon: 'portal' },
            { id: 'all', name: `Alle (${ws.bookmarks.length})`, icon: 'source' },
          ]}
        />
        <input className="bm-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Suchen: Titel, Adresse, Kategorie, #Tag" aria-label="Library durchsuchen" />
        {props.onSaveCurrent && (
          <button type="button" className="bm-save-current" onClick={props.onSaveCurrent}>
            <Icon name={props.saved ? 'starOn' : 'star'} className="icon icon--inline" /> {props.saved ? 'Diese Source bearbeiten' : 'Diese Source speichern'}
          </button>
        )}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
      {total > 0 && <PickBar ws={ws} shownIds={shownIds} picked={picked} setPicked={setPicked} dispatch={props.dispatch} />}
      {total === 0 && list.length === 0 && (
        <p className="bm-hint">
          {query ? 'Nichts gefunden.' : scope === 'panel' ? 'Diesem Portal ist noch keine Source zugeordnet. Unter „Alle“ steht die ganze Library.' : 'Die Library ist noch leer. Mit dem Stern in der Adresszeile speicherst du die aktuelle Source.'}
        </p>
      )}
      {/* F-36: eine leere Library lässt sich mit den eigenen Lesezeichen füllen */}
      {!query && ws.bookmarks.length === 0 && props.onImport && (
        <button type="button" className="bm-import" onClick={props.onImport} title={TERMS.importBookmarks}>
          Lesezeichen aus dem Browser importieren …
        </button>
      )}
      {list.map((g) => {
        const catId = g.category?.id ?? NO_CATEGORY;
        const key = `cat:${catId}`;
        return (
          <section
            key={key}
            className={[
              'bm-group',
              dragCat === catId && 'bm-group--dragging',
              catDrop?.id === catId && (catDrop.after ? 'bm-group--after' : 'bm-group--before'),
            ]
              .filter(Boolean)
              .join(' ')}
            // F-144: Die ganze Kategorie ist Ziel; obere Hälfte = davor, untere = dahinter
            onDragOver={(e) => {
              if (!dragCat || !g.category || dragCat === catId) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              const r = e.currentTarget.getBoundingClientRect();
              const after = e.clientY > r.top + r.height / 2;
              if (catDrop?.id !== catId || catDrop.after !== after) setCatDrop({ id: catId, after });
            }}
            onDrop={(e) => {
              if (!dragCat || !catDrop) return;
              e.preventDefault();
              const rest = ws.categories.filter((c) => c.id !== dragCat);
              const at = rest.findIndex((c) => c.id === catDrop.id);
              if (at >= 0) moveCat(dragCat, at + (catDrop.after ? 1 : 0));
              endDrag();
            }}
          >
            <div
              className={over === key ? 'bm-cat bm-over' : 'bm-cat'}
              // F-144: Kategorien (nicht „Ohne Kategorie“) lassen sich am Kopf ziehen
              draggable={!!g.category && editCat !== catId}
              onDragStart={(e) => {
                if (!g.category || e.target !== e.currentTarget) return;
                setDragCat(catId);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', g.category.name);
              }}
              onDragEnd={endDrag}
              onDragOver={(e) => {
                if (!drag) return;
                e.preventDefault();
                setOver(key);
              }}
              onDragLeave={() => setOver((o) => (o === key ? null : o))}
              onDrop={(e) => {
                if (!drag) return;
                e.preventDefault();
                props.dispatch({ type: 'moveBookmark', id: drag, to: 0, category: catId });
                endDrag();
              }}
            >
              {g.category && (
                <button
                  type="button"
                  className="bm-icon bm-cat__grip"
                  title="Ziehen oder ↑/↓: Kategorie verschieben"
                  aria-label={`Kategorie ${g.category.name} verschieben, Position ${ws.categories.findIndex((c) => c.id === catId) + 1} von ${catCount}. Pfeiltaste hoch oder runter`}
                  onKeyDown={(e) => {
                    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
                    e.preventDefault();
                    const at = ws.categories.findIndex((c) => c.id === catId);
                    moveCat(catId, at + (e.key === 'ArrowUp' ? -1 : 1));
                  }}
                >
                  ⋮⋮
                </button>
              )}
              {editCat === catId && g.category ? (
                <input
                  className="bm-cat__input"
                  title={DIALOG_TEXT.renameHint}
                  value={catDraft}
                  autoFocus
                  onChange={(e) => setCatDraft(e.target.value)}
                  onBlur={renameCat}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') renameCat();
                    if (e.key === 'Escape') {
                      e.preventDefault(); // schließt nur das Umbenennen, nicht die Leiste
                      setEditCat(null);
                    }
                  }}
                  aria-label="Kategorie umbenennen"
                />
              ) : (
                <span className="bm-cat__name" onDoubleClick={() => g.category && (setEditCat(catId), setCatDraft(g.category.name))}>
                  {g.category && <Icon name={categoryIcon(g.category)} size={14} className="icon bm-cat__icon" />}
                  {g.category?.name ?? 'Ohne Kategorie'}
                </span>
              )}
              <span className="bm-cat__count">{g.items.length}</span>
              {g.category && (
                <>
                  <button type="button" className="bm-icon" title="Kategorie umbenennen" aria-label="Kategorie umbenennen" onClick={() => (setEditCat(catId), setCatDraft(g.category!.name))}>
                    ✎
                  </button>
                  {deleteCat === catId ? (
                    <button
                      type="button"
                      className="bm-icon bm-icon--danger"
                      title="Sources bleiben erhalten (Ohne Kategorie)"
                      onClick={() => {
                        props.dispatch({ type: 'deleteCategory', id: catId });
                        setDeleteCat(null);
                      }}
                      onBlur={() => setDeleteCat(null)}
                    >
                      Löschen?
                    </button>
                  ) : (
                    <button type="button" className="bm-icon" title="Kategorie löschen" aria-label="Kategorie löschen" onClick={() => setDeleteCat(catId)}>
                      <Icon name="close" size={14} />
                    </button>
                  )}
                </>
              )}
            </div>
            <ul className="bm-list">
              {g.items.map((b) => {
                const mine = b.panels.includes(panelId);
                return (
                  <li
                    key={b.id}
                    className={['bm-item', drag === b.id && 'bm-dragging', over === b.id && 'bm-over'].filter(Boolean).join(' ')}
                    draggable
                    onDragStart={(e) => {
                      setDrag(b.id);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/uri-list', b.url);
                    }}
                    onDragEnd={endDrag}
                    onDragOver={(e) => {
                      if (!drag || drag === b.id) return;
                      e.preventDefault();
                      setOver(b.id);
                    }}
                    onDragLeave={() => setOver((o) => (o === b.id ? null : o))}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (drag) props.dispatch({ type: 'dropBookmark', id: drag, target: b.id });
                      endDrag();
                    }}
                  >
                    <span className="bm-grip" aria-hidden="true">
                      ⋮⋮
                    </span>
                    <input type="checkbox" className="bm-pick" checked={picked.has(b.id)} onChange={() => togglePick(b.id)} aria-label={PAUSE_TEXT.selectItem(b.title)} />
                    <KeepToggle ws={ws} id={b.id} title={b.title} keep={!!b.keep} dispatch={props.dispatch} />
                    <button type="button" className="bm-open" onClick={() => props.onOpen(b.url)} title={`${b.url}${b.note ? `\n${b.note}` : ''}`}>
                      <span className="bm-title">
                        <SiteIcon url={b.url} on={display.favicons} />
                        {b.title}
                      </span>
                      <span className="bm-host">
                        {hostOf(b.url)}
                        {b.tags.length > 0 && ` · ${b.tags.map((t) => `#${t}`).join(' ')}`}
                      </span>
                    </button>
                    <button
                      type="button"
                      className={mine ? 'bm-icon bm-pin bm-pin--on' : 'bm-icon bm-pin'}
                      onClick={() => props.dispatch({ type: 'toggleBookmarkPanel', id: b.id, panel: panelId })}
                      title={mine ? 'Aus der Library dieses Portals nehmen' : 'In die Library dieses Portals aufnehmen'}
                      aria-label={mine ? 'Aus diesem Portal nehmen' : 'In dieses Portal aufnehmen'}
                      aria-pressed={mine}
                    >
                      <Icon name={mine ? 'starOn' : 'star'} size={14} />
                    </button>
                    <button type="button" className="bm-icon" onClick={() => props.onEdit(b)} title="Bearbeiten" aria-label="Bearbeiten">
                      ✎
                    </button>
                  </li>
                );
              })}
              {g.items.length === 0 && <li className="bm-empty">Leer – Sources hierher ziehen</li>}
            </ul>
          </section>
        );
      })}
    </Drawer>
  );
}

/** F-202 Stufe 2/3: eine Source in der Auswahl an- oder abwählen. */
export function togglePicked(old: Set<string>, id: string): Set<string> {
  const next = new Set(old);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/**
 * V50: Sources auf „nie pausieren“ stellen oder zurück – mit Bestätigung unten und „Rückgängig“.
 * Nur Sources, die sich wirklich ändern, werden beim Zurücknehmen wieder umgestellt.
 */
export function keepSourcesWithUndo(ws: Workspace, dispatch: (a: Action) => void, ids: readonly string[], keep: boolean): number {
  const changed = ws.bookmarks.filter((b) => ids.includes(b.id) && !!b.keep !== keep).map((b) => b.id);
  if (changed.length === 0) {
    flash({ text: PAUSE_TEXT.selectedAlready(keep), ms: 4000 });
    return 0;
  }
  dispatch({ type: 'keepSources', ids: changed, keep });
  const one = changed.length === 1 ? ws.bookmarks.find((b) => b.id === changed[0]) : undefined;
  flash({
    text: one ? PAUSE_TEXT.sourceKept(one.title, keep) : PAUSE_TEXT.selectedKept(changed.length, keep),
    ms: 8000,
    action: {
      label: PAUSE_TEXT.undo,
      run: () => {
        dispatch({ type: 'keepSources', ids: changed, keep: !keep });
        flash({ text: PAUSE_TEXT.undone, ms: 3000 });
      },
    },
  });
  return changed.length;
}

/**
 * V50: Schalter je Source (Library und Cockpit) – Pause-Zeichen grau = pausiert normal,
 * rot durchgestrichen = pausiert nie. Ein Klick schaltet um (aria-pressed, NF-03).
 */
export function KeepToggle(p: { ws: Workspace; id: string; title: string; keep: boolean; dispatch: (a: Action) => void }) {
  return (
    <button
      type="button"
      className={p.keep ? 'bm-icon bm-keep-toggle is-on' : 'bm-icon bm-keep-toggle'}
      aria-pressed={p.keep}
      aria-label={PAUSE_TEXT.toggleLabel(p.title)}
      title={p.keep ? PAUSE_TEXT.toggleOn : PAUSE_TEXT.toggleOff}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        keepSourcesWithUndo(p.ws, p.dispatch, [p.id], !p.keep);
      }}
    >
      <Icon name={p.keep ? 'keep' : 'pause'} size={14} className={p.keep ? 'icon bm-keep-icon' : 'icon'} />
    </button>
  );
}

/**
 * F-202 Stufe 2/3, V50 umgebaut: Haken stehen immer an den Sources. Oben „Alle angezeigten wählen“;
 * sobald etwas gewählt ist, erscheint die Leiste „n gewählt: Nie pausieren · Normal pausieren · Fertig“.
 * Nach dem Ausführen ist die Auswahl leer, unten kommt die Bestätigung mit „Rückgängig“.
 */
export function PickBar(props: { ws: Workspace; shownIds: string[]; picked: Set<string>; setPicked: (s: Set<string>) => void; dispatch: (a: Action) => void }) {
  const { ws, shownIds, picked } = props;
  const allBox = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const [cat, setCat] = useState(NO_CATEGORY);
  /** V54 (Wunsch Enrico): neue Kategorie direkt in der Mehrfachauswahl anlegen */
  const [newCat, setNewCat] = useState('');
  const [tags, setTags] = useState('');
  const [panel, setPanel] = useState(ws.panels[0]?.id ?? '');
  const [sure, setSure] = useState(false);
  const [more, setMore] = useState(false);
  const moreId = useId();
  // Nur, was noch existiert, zählt als gewählt (gelöschte Sources fallen heraus)
  const pickedIds = ws.bookmarks.filter((b) => picked.has(b.id)).map((b) => b.id);
  const shownPicked = shownIds.filter((id) => picked.has(id)).length;
  useEffect(() => {
    if (allBox.current) allBox.current.indeterminate = shownPicked > 0 && shownPicked < shownIds.length;
  });
  useEffect(() => {
    if (pickedIds.length === 0) setSure(false);
  }, [pickedIds.length]);
  // F-203: Tour beim ersten Mal anbieten, nicht nur über die Suche
  useEffect(() => {
    if (!offerTourOnce('sources')) return;
    const t = window.setTimeout(() => flash({ text: BULK_TEXT.tourOffer, ms: 12000, action: { label: BULK_TEXT.tourStart, run: () => requestTour('sources') } }), 600);
    return () => window.clearTimeout(t);
  }, []);
  const pickAll = (on: boolean) => {
    const next = new Set(picked);
    for (const id of shownIds) if (on) next.add(id);
    else next.delete(id);
    props.setPicked(next);
  };
  // Leiste verschwindet danach – Fokus zurück auf „Alle angezeigten wählen“, nicht ins Leere (NF-03)
  const finish = () => {
    props.setPicked(new Set());
    allBox.current?.focus();
  };
  const keep = (on: boolean) => {
    if (pickedIds.length === 0) return;
    keepSourcesWithUndo(ws, props.dispatch, pickedIds, on);
    finish();
  };
  // F-204: gemeinsam einstellen, Bestätigung unten mit „Rückgängig“; Auswahl bleibt (außer beim Löschen)
  const bulk = (change: BulkChange, what: string, base: Workspace = ws) => {
    const r = bulkSources(base, pickedIds, change);
    if (r.changed.length === 0) return flash({ text: BULK_TEXT.nothing, ms: 4000 });
    const before = ws.bookmarks.filter((b) => r.changed.includes(b.id));
    const order = ws.bookmarks.map((b) => b.id);
    props.dispatch({ type: 'bulkSources', ids: r.changed, change });
    flash({
      text: BULK_TEXT.done(what, r.changed.length),
      ms: 8000,
      action: {
        label: PAUSE_TEXT.undo,
        run: () => {
          props.dispatch({ type: 'restoreSources', before, order });
          flash({ text: PAUSE_TEXT.undone, ms: 3000 });
        },
      },
    });
    if (change.kind === 'delete') finish();
  };
  const catName = (id: string) => ws.categories.find((c) => c.id === id)?.name ?? BULK_TEXT.noCategory;
  const panelName = (id: string) => ws.panels.find((p) => p.id === id)?.name ?? '';
  const tagList = () => tags.split(',').map((t) => t.trim()).filter(Boolean);
  const tagWords = () => tagList().map((t) => `#${t.replace(/^#+/, '')}`).join(', ');
  return (
    <div className={pickedIds.length ? 'bm-pickbar is-active' : 'bm-pickbar'} role="group" aria-label={PAUSE_TEXT.selectAll}>
      <div className="bm-pickbar__head">
        <label className="bm-check bm-pickbar__all">
          <input ref={allBox} type="checkbox" checked={shownIds.length > 0 && shownPicked === shownIds.length} disabled={shownIds.length === 0} onChange={(e) => pickAll(e.target.checked)} />
          {PAUSE_TEXT.selectAll}
        </label>
        <button type="button" className="bm-pickbar__tour" title={BULK_TEXT.tourTitle} aria-label={BULK_TEXT.tourTitle} onClick={() => requestTour('sources')}>
          <Icon name="tour" className="icon icon--inline" /> {BULK_TEXT.tour}
        </button>
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {pickedIds.length > 0 ? PAUSE_TEXT.selected(pickedIds.length) : ''}
      </span>
      {pickedIds.length > 0 && (
        <div className="bm-pickbar__actions">
          <div className="bm-pickbar__row">
            <span className="bm-pickbar__count" aria-hidden="true">
              {PAUSE_TEXT.selected(pickedIds.length)}
            </span>
            <button type="button" onClick={() => keep(true)} aria-describedby={hintId}>
              <Icon name="keep" className="icon icon--inline bm-keep-icon" /> {PAUSE_TEXT.keepSelected}
            </button>
            <button type="button" onClick={() => keep(false)}>
              <Icon name="pause" className="icon icon--inline" /> {PAUSE_TEXT.unkeepSelected}
            </button>
            <button type="button" aria-expanded={more} aria-controls={moreId} onClick={() => setMore(!more)}>
              {more ? BULK_TEXT.less : BULK_TEXT.more}
            </button>
            <span className="drawer__grow" />
            <button type="button" className="drawer__primary" title={PAUSE_TEXT.doneSelectionTitle} onClick={finish}>
              {PAUSE_TEXT.doneSelection}
            </button>
          </div>
          {more && (
          <div className="bm-pickbar__more" id={moreId}>
          <div className="bm-pickbar__row">
            <label className="bm-pickbar__label">
              {BULK_TEXT.category}
              <select value={cat} onChange={(e) => setCat(e.target.value)}>
                <option value={NO_CATEGORY}>{BULK_TEXT.noCategory}</option>
                {ws.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value={NEW}>{BULK_TEXT.newCategory}</option>
              </select>
            </label>
            {cat === NEW && (
              <label className="bm-pickbar__label">
                <span className="sr-only">{BULK_TEXT.newCategoryName}</span>
                <input
                  type="text"
                  autoFocus
                  value={newCat}
                  aria-label={BULK_TEXT.newCategoryName}
                  placeholder={BULK_TEXT.newCategoryPlaceholder}
                  onChange={(e) => setNewCat(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    e.preventDefault();
                    (e.currentTarget.closest('.bm-pickbar__row')?.querySelector('.bm-pickbar__setcat') as HTMLButtonElement | null)?.click();
                  }}
                />
              </label>
            )}
            <button
              type="button"
              className="bm-pickbar__setcat"
              disabled={cat === NEW && !newCat.trim()}
              title={cat === NEW ? BULK_TEXT.newCategoryTitle : undefined}
              onClick={() => {
                if (cat !== NEW) return bulk({ kind: 'category', category: cat }, BULK_TEXT.what.category(catName(cat)));
                const name = newCat.trim();
                if (!name) return;
                // Gibt es den Namen schon, wird diese Kategorie genommen; sonst angelegt und gleich gesetzt
                const found = categoryByName(ws, name);
                const id = found?.id ?? newId();
                const base = found ? ws : reducer(ws, { type: 'addCategory', id, name });
                if (!found) props.dispatch({ type: 'addCategory', id, name });
                bulk({ kind: 'category', category: id }, BULK_TEXT.what.category(found?.name ?? name), base);
                setCat(id);
                setNewCat('');
              }}
            >
              {cat === NEW ? BULK_TEXT.createCategory : BULK_TEXT.setCategory}
            </button>
          </div>
          <div className="bm-pickbar__row">
            <label className="bm-pickbar__label">
              {BULK_TEXT.tags}
              <input type="text" value={tags} placeholder={BULK_TEXT.tagsPlaceholder} onChange={(e) => setTags(e.target.value)} />
            </label>
            <button type="button" disabled={tagList().length === 0} onClick={() => bulk({ kind: 'addTags', tags: tagList() }, BULK_TEXT.what.addTags(tagWords()))}>
              {BULK_TEXT.addTags}
            </button>
            <button type="button" disabled={tagList().length === 0} onClick={() => bulk({ kind: 'removeTags', tags: tagList() }, BULK_TEXT.what.removeTags(tagWords()))}>
              {BULK_TEXT.removeTags}
            </button>
          </div>
          {ws.panels.length > 0 && (
            <div className="bm-pickbar__row">
              <label className="bm-pickbar__label">
                {BULK_TEXT.panel}
                <select value={panel} onChange={(e) => setPanel(e.target.value)}>
                  {ws.panels.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" disabled={!panel} onClick={() => bulk({ kind: 'addPanel', panel }, BULK_TEXT.what.addPanel(panelName(panel)))}>
                {BULK_TEXT.addPanel}
              </button>
              <button type="button" disabled={!panel} onClick={() => bulk({ kind: 'removePanel', panel }, BULK_TEXT.what.removePanel(panelName(panel)))}>
                {BULK_TEXT.removePanel}
              </button>
            </div>
          )}
          <div className="bm-pickbar__row bm-pickbar__end">
            {sure ? (
              <button type="button" className="drawer__danger" autoFocus onClick={() => bulk({ kind: 'delete' }, BULK_TEXT.what.delete)} onBlur={() => setSure(false)}>
                {BULK_TEXT.removeSure(pickedIds.length)}
              </button>
            ) : (
              <button type="button" className="drawer__quiet" onClick={() => setSure(true)}>
                {BULK_TEXT.remove}
              </button>
            )}
          </div>
          </div>
          )}
          <p className="bm-hint" id={hintId}>
            {more ? `${PAUSE_TEXT.selectHint} ${BULK_TEXT.hint}` : PAUSE_TEXT.selectHint}
          </p>
        </div>
      )}
    </div>
  );
}

/** F-202: rot durchgestrichenes Pause-Zeichen hinter dem Namen einer Source, die nie pausiert. */
export function KeepBadge() {
  return (
    <span className="bm-keep" title={PAUSE_TEXT.sourceKeepHint}>
      <Icon name="keep" size={12} className="icon bm-keep-icon" />
      <span className="sr-only">({PAUSE_TEXT.keptBadge})</span>
    </span>
  );
}
