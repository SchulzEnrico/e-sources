import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { Bookmark, Workspace } from '../workspace/types';
import { NO_CATEGORY, categoryByName, collectionSize, groups, originOf, originText } from '../workspace/bookmarks';
import { hostOf, newId } from '../workspace/workspace';
import { TERMS } from '../workspace/terms';

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
          ×
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
    props.dispatch({ type: 'saveBookmark', bookmark: { ...b, title, url, category: cat, tags: tags.split(','), note, panels, origin } });
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
  const catCount = ws.categories.length;
  const moveCat = (id: string, to: number) => {
    const target = Math.max(0, Math.min(catCount - 1, to));
    const name = ws.categories.find((c) => c.id === id)?.name ?? '';
    props.dispatch({ type: 'moveCategory', id, to: target });
    setAnnounce(`Kategorie ${name} jetzt an Position ${target + 1} von ${catCount}.`);
  };
  const list = groups(ws, scope === 'panel' ? panelId : null, query);
  const total = list.reduce((n, g) => n + g.items.length, 0);

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
            setNewCat('');
            setScope('all');
          }}
        >
          <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Neue Kategorie" aria-label="Neue Kategorie" />
          <button type="submit" disabled={!newCat.trim()}>
            ＋
          </button>
        </form>
      }
    >
      <div className="bm-tools">
        <div className="bm-seg" role="radiogroup" aria-label="Anzeigen">
          <button type="button" aria-pressed={scope === 'panel'} onClick={() => setScope('panel')}>
            Dieses Panel ({own})
          </button>
          <button type="button" aria-pressed={scope === 'all'} onClick={() => setScope('all')}>
            Alle ({ws.bookmarks.length})
          </button>
        </div>
        <input className="bm-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Suchen: Titel, Adresse, Kategorie, #Tag" aria-label="Library durchsuchen" />
        {props.onSaveCurrent && (
          <button type="button" className="bm-save-current" onClick={props.onSaveCurrent}>
            {props.saved ? '★ Diese Source bearbeiten' : '☆ Diese Source speichern'}
          </button>
        )}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
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
                      ×
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
                    <button type="button" className="bm-open" onClick={() => props.onOpen(b.url)} title={`${b.url}${b.note ? `\n${b.note}` : ''}`}>
                      <span className="bm-title">{b.title}</span>
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
                      {mine ? '★' : '☆'}
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
