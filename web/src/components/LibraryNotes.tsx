/**
 * F-206 Schritt 9 Bau 5 (V97, Entscheidungs-Doc V96, L1–L4): Library-Rad „Sources · Notizen“ – in der Library eines
 * Portals und im Cockpit „Library“ an derselben Stelle (NF-08). Im Portal zeigt „Notizen“ die mit seinen Seiten bzw.
 * Sources verknüpften Notizen, im Cockpit alle – mit denselben Werkzeugen: Filter, Liste, Enter öffnet im Pad,
 * „+ Neue Notiz zu dieser Seite“ (nur im Portal mit Seite). Die Wahl merkt sich jedes Portal bzw. das Cockpit je Gerät.
 * Tastatur (NF-03): ↓ vom Filter in die Liste, ↑/↓, Pos1/Ende, Enter öffnet, Esc leert den Filter.
 */
import { type KeyboardEvent, useRef, useState } from 'react';
import type { Note, Workspace } from '../workspace/types';
import * as NS from '../workspace/noteSources';
import { notesOf, stateOf, titleOf } from '../workspace/notes';
import { LIB_TEXT, NOTE_TEXT } from '../workspace/terms';
import { ModeWheel } from './ModeWheel';
import { Icon } from './Icon';
import { noteForPage, openNote } from './SourceChips';

export type LibMode = 'sources' | 'notes';
const KEY = 'esource.libraryMode.v1';

function readModes(): Record<string, LibMode> {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

/** L4: Wahl je Portal (Id) bzw. 'cockpit', je Gerät gemerkt – nicht im Abgleich. */
export function useLibMode(where: string): [LibMode, (m: LibMode) => void] {
  const [mode, setMode] = useState<LibMode>(() => (readModes()[where] === 'notes' ? 'notes' : 'sources'));
  const set = (m: LibMode) => {
    setMode(m);
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...readModes(), [where]: m }));
    } catch {
      /* privater Modus: nur für diese Sitzung */
    }
  };
  return [mode, set];
}

/** L2: Notizen, die mit einer Seite (Tab) oder einer Source dieses Portals verknüpft sind. */
export function notesOfPanel(ws: Workspace, panelId: string): Note[] {
  const p = ws.panels.find((x) => x.id === panelId);
  if (!p) return [];
  const seen = new Set<string>();
  const out: Note[] = [];
  const add = (list: Note[]) => list.forEach((n) => !seen.has(n.id) && (seen.add(n.id), out.push(n)));
  for (const t of p.tabs) if (t.url) add(NS.notesOfSource(ws, { url: t.url }));
  for (const b of ws.bookmarks) if (b.panels?.includes(panelId)) add(NS.notesOfSource(ws, { id: b.id, url: b.url }));
  return out;
}

export function LibraryWheel({ value, onChange, sources, notes }: { value: LibMode; onChange: (m: LibMode) => void; sources: number; notes: number }) {
  return (
    <ModeWheel
      className="lib-wheel"
      label={LIB_TEXT.wheel}
      value={value}
      onChange={(v) => onChange(v as LibMode)}
      options={[
        { id: 'sources', name: `${LIB_TEXT.sources} (${sources})`, icon: 'source', hint: LIB_TEXT.sourcesHint },
        { id: 'notes', name: `${LIB_TEXT.notes} (${notes})`, icon: 'note', hint: LIB_TEXT.notesHint },
      ]}
    />
  );
}

const match = (n: Note, q: string) => !q || `${titleOf(n)} ${n.text ?? ''} ${(n.sources ?? []).map((l) => l.title).join(' ')}`.toLowerCase().includes(q);

/** L3: Liste der Notizen mit Filter – im Portal und im Cockpit gleich. */
export function NoteLibrary({ ws, notes, page, empty }: { ws: Workspace; notes: Note[]; page?: { url: string; title: string }; empty: string }) {
  const [query, setQuery] = useState('');
  const list = useRef<HTMLUListElement>(null);
  const q = query.trim().toLowerCase();
  const shown = notes.filter((n) => match(n, q));
  const items = () => [...(list.current?.querySelectorAll<HTMLButtonElement>('.libnotes__open') ?? [])];
  const onKey = (e: KeyboardEvent<HTMLUListElement>) => {
    const all = items();
    const i = all.indexOf(document.activeElement as HTMLButtonElement);
    const to = (j: number) => (e.preventDefault(), all[Math.max(0, Math.min(all.length - 1, j))]?.focus());
    if (e.key === 'ArrowDown') to(i + 1);
    else if (e.key === 'ArrowUp') (i <= 0 ? (e.preventDefault(), list.current?.parentElement?.querySelector<HTMLInputElement>('.libnotes__filter')?.focus()) : to(i - 1));
    else if (e.key === 'Home') to(0);
    else if (e.key === 'End') to(all.length - 1);
  };
  return (
    <div className="libnotes">
      <div className="libnotes__tools">
        <input
          className="bm-search libnotes__filter"
          type="search"
          value={query}
          placeholder={LIB_TEXT.filter}
          aria-label={LIB_TEXT.filterLabel}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') (e.preventDefault(), items()[0]?.focus());
            if (e.key === 'Escape' && query) (e.preventDefault(), e.stopPropagation(), setQuery(''));
          }}
        />
        {page && (
          <button type="button" className="libnotes__new" onClick={() => noteForPage(page)}>
            <Icon name="plus" size={13} /> {LIB_TEXT.newForPage}
          </button>
        )}
      </div>
      {!shown.length && <p className="bm-hint">{q ? LIB_TEXT.none : empty}</p>}
      {!!shown.length && (
        <ul ref={list} className="libnotes__list" aria-label={LIB_TEXT.listLabel(shown.length)} onKeyDown={onKey}>
          {shown.map((n) => {
            const st = NOTE_TEXT.states[stateOf(ws, n).state] ?? '';
            const links = n.sources?.length ?? 0;
            return (
              <li key={n.id}>
                <button type="button" className="libnotes__open" onClick={() => openNote(n.id)} title={LIB_TEXT.openHint}>
                  <Icon name="note" size={13} />
                  <span className="libnotes__title">{titleOf(n) || LIB_TEXT.untitled}</span>
                  <span className="libnotes__meta">
                    {st}
                    {links > 0 && (
                      <>
                        {' · '}
                        <Icon name="clip" size={11} className="icon icon--inline" /> {links}
                      </>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <span className="sr-only" role="status">
        {q ? LIB_TEXT.found(shown.length) : ''}
      </span>
    </div>
  );
}

/** Alle Notizen für das Cockpit „Library“. */
export const allNotes = (ws: Workspace): Note[] => notesOf(ws).filter((n) => n.state !== 'archived');
