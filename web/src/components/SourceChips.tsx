/**
 * F-206 Schritt 6 (V93): Zeile „Quellen“ in der Notiz (Q1) – je Quelle ein Chip (Symbol der Seite, Titel, Stelle),
 * dahinter „+ Quelle“ (Q2 b). Wie Trello-Anhänge: oben an der Karte, sofort sichtbar.
 * Tastatur (Q11): Chips sind eine Liste – Pfeile wandern, Enter öffnet, F2 Stelle, Entf löst (Q9, Rückgängig am Ort);
 * Alt/⌥+Q in der Notiz öffnet die Auswahl. Verbindungen gehören nicht zum Entwurf – sie wirken sofort (wie Ton).
 */
import { type Dispatch, type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { Note, SourceLink, Workspace } from '../workspace/types';
import * as NS from '../workspace/noteSources';
import { noticeLater } from '../workspace/flash';
import { newId } from '../workspace/workspace';
import { Icon } from './Icon';
import { SiteIcon, useDisplay } from './SiteIcon';

const T = NS.SOURCE_LINK_TEXT;

/** Q5: Quelle öffnen – App entscheidet (offen → dorthin, sonst neuer Tab im aktiven Portal). */
export const OPEN_SOURCE_EVENT = 'esource:openSource';
export interface OpenSourceDetail {
  url: string;
  title: string;
}
export const openSource = (d: OpenSourceDetail) => window.dispatchEvent(new CustomEvent<OpenSourceDetail>(OPEN_SOURCE_EVENT, { detail: d }));
/** Q2 c (V93): Ziehen in beide Richtungen – Seite (Portal-Reiter, Library) auf eine Notiz, Notiz auf ein Portal. */
export const DRAG_URL = 'application/x-esource-url';
export const DRAG_NOTE = 'application/x-esource-note';
export const setDragUrl = (dt: DataTransfer, url: string, title: string) => dt.setData(DRAG_URL, JSON.stringify({ url, title }));
/** Q4/Q6: Notiz im Pad öffnen bzw. neue Notiz zu einer Seite anlegen und öffnen (App). */
export const OPEN_NOTE_EVENT = 'esource:openNote';
export const NOTE_FOR_PAGE_EVENT = 'esource:noteForPage';
export const openNote = (id: string) => window.dispatchEvent(new CustomEvent<string>(OPEN_NOTE_EVENT, { detail: id }));
export const noteForPage = (d: OpenSourceDetail) => window.dispatchEvent(new CustomEvent<OpenSourceDetail>(NOTE_FOR_PAGE_EVENT, { detail: d }));

interface Props {
  ws: Workspace;
  note: Note;
  dispatch: Dispatch<Action>;
  by?: string;
}

export function SourceChips({ ws, note, dispatch, by }: Props) {
  const display = useDisplay();
  const links = NS.linksOf(ws, note);
  const [gone, setGone] = useState<{ link: SourceLink; index: number } | null>(null);
  const [say, setSay] = useState('');
  const [edit, setEdit] = useState<number | null>(null);
  const [pick, setPick] = useState(false);
  const [over, setOver] = useState(false);
  const goneT = useRef(0);
  const root = useRef<HTMLDivElement>(null);
  const addBtn = useRef<HTMLButtonElement>(null);
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => () => window.clearTimeout(goneT.current), []);

  // Alt/⌥+Q in der offenen Notiz (Fokus irgendwo darin)
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.code !== 'KeyQ') return;
      const box = root.current?.closest('.note');
      if (!box || !box.contains(document.activeElement)) return;
      e.preventDefault();
      setPick(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const unlink = (index: number) => {
    const link = note.sources?.[index];
    if (!link) return;
    dispatch({ type: 'noteUnlink', id: note.id, index, by });
    window.clearTimeout(goneT.current);
    setGone({ link, index });
    setSay(T.removed(link.title));
    goneT.current = noticeLater(() => setGone(null), 3);
    window.setTimeout(() => (chipRefs.current[Math.min(index, links.length - 2)] ?? addBtn.current)?.focus({ preventScroll: true }), 0);
  };
  const undo = () => {
    if (!gone) return;
    window.clearTimeout(goneT.current);
    dispatch({ type: 'noteRelink', id: note.id, index: gone.index, link: gone.link, by });
    setGone(null);
    setSay('Rückgängig');
  };
  const onChipKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const move = (to: number) => {
      e.preventDefault();
      (to >= links.length ? addBtn.current : chipRefs.current[Math.max(0, to)])?.focus();
    };
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') move(i + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') move(i - 1);
    else if (e.key === 'Home') move(0);
    else if (e.key === 'End') move(links.length - 1);
    else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      unlink(i);
    } else if (e.key === 'F2') {
      e.preventDefault();
      setEdit(i);
    }
  };
  const saveSpot = (i: number, v: string) => {
    setEdit(null);
    dispatch({ type: 'noteSpot', id: note.id, index: i, at: NS.parseSpotInput(v), by });
    window.setTimeout(() => chipRefs.current[i]?.focus({ preventScroll: true }), 0);
  };

  return (
    <div
      ref={root}
      className={`srcs${links.length ? '' : ' is-empty'}${over ? ' is-over' : ''}`}
      role="group"
      aria-label={T.listLabel}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(DRAG_URL)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setOver(true);
      }}
      onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOver(false)}
      onDrop={(e) => {
        setOver(false);
        const raw = e.dataTransfer.getData(DRAG_URL);
        if (!raw) return;
        e.preventDefault();
        try {
          const d = JSON.parse(raw) as OpenSourceDetail;
          if (!d.url) return;
          dispatch({ type: 'noteLink', id: note.id, url: d.url, title: d.title || NS.pageTitle(d.url), sid: newId(), by });
          setSay(T.autoLinked(d.title || NS.pageTitle(d.url)));
        } catch {
          /* kein gültiger Inhalt */
        }
      }}
    >
      {over && <span className="srcs__drop">{T.drop}</span>}
      {links.length > 0 && (
        <span className="srcs__head" aria-hidden="true">
          <Icon name="source" size={13} /> {T.row}
        </span>
      )}
      <ul className="srcs__list" aria-label={T.listLabel}>
        {links.map((v, i) => (
          <li key={`${v.link.id}-${i}`} className={`srcs__item${v.gone ? ' is-gone' : ''}`}>
            {edit === i ? (
              <span className="srcs__edit">
                <SiteIcon url={v.link.url} size={14} on={display.favicons} />
                <span className="srcs__title">{v.title}</span>
                <input
                  className="srcs__spotin"
                  aria-label={`${T.spot}: ${T.spotHint}`}
                  placeholder={T.spotHint}
                  defaultValue={v.spot}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.preventDefault(), saveSpot(i, e.currentTarget.value));
                    else if (e.key === 'Escape') (e.preventDefault(), e.stopPropagation(), setEdit(null), window.setTimeout(() => chipRefs.current[i]?.focus(), 0));
                  }}
                  onBlur={(e) => edit === i && saveSpot(i, e.currentTarget.value)}
                />
              </span>
            ) : (
              <button
                ref={(el) => void (chipRefs.current[i] = el)}
                type="button"
                className="srcs__chip"
                title={v.gone ? `${T.gone}: ${v.link.url}` : `${v.title}${v.spot ? ` · ${v.spot}` : ''}\n${v.open}\nF2: ${T.spot} · Entf: lösen`}
                aria-label={v.gone ? `${T.gone}: ${v.title}` : T.chip(v.title, v.spot)}
                onClick={() => openSource({ url: v.open, title: v.title })}
                onKeyDown={(e) => onChipKey(e, i)}
              >
                <SiteIcon url={v.link.url} size={14} on={display.favicons && !v.gone} />
                <span className="srcs__title">{v.gone ? `${T.gone} · ${v.title}` : v.title}</span>
                {v.spot && <span className="srcs__spot">{v.spot}</span>}
              </button>
            )}
            {v.gone && (
              <button type="button" className="srcs__mini" onClick={() => dispatch({ type: 'sourceRevive', link: v.link })}>
                {T.revive}
              </button>
            )}
            {edit !== i && (
              <>
                <button type="button" className="srcs__mini srcs__icon" aria-label={`${T.spot} – ${v.title}`} title={`${T.spot} (F2): ${T.spotHint}`} onClick={() => setEdit(i)}>
                  <Icon name="rename" size={12} />
                </button>
                <button type="button" className="srcs__mini srcs__icon" aria-label={`Verbindung lösen – ${v.title}`} title="Verbindung lösen (Entf) – die Source bleibt in der Library" onClick={() => unlink(i)}>
                  <Icon name="close" size={12} />
                </button>
              </>
            )}
          </li>
        ))}
        <li className="srcs__item srcs__item--add">
          <button ref={addBtn} type="button" className="srcs__add" title={T.addTitle} aria-expanded={pick} aria-haspopup="listbox" onClick={() => setPick((p) => !p)}>
            {T.add}
          </button>
          {pick && (
            <SourcePicker
              ws={ws}
              note={note}
              onClose={() => (setPick(false), window.setTimeout(() => addBtn.current?.focus({ preventScroll: true }), 0))}
              onPick={(p) => {
                dispatch({ type: 'noteLink', id: note.id, url: p.url, title: p.title, sid: newId(), by });
                setSay(T.autoLinked(p.title));
                setPick(false);
                window.setTimeout(() => addBtn.current?.focus({ preventScroll: true }), 0);
              }}
            />
          )}
        </li>
      </ul>
      {/* Meldung am Ort, direkt an der Zeile */}
      {gone && (
        <span className="srcs__gone" role="status">
          {T.removed(gone.link.title)}
          <button type="button" className="audio__undo" onClick={undo}>
            Rückgängig
          </button>
        </span>
      )}
      <span className="sr-only" aria-live="polite">
        {say}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------- Auswahl „Quelle wählen“

interface Choice {
  key: string;
  url: string;
  title: string;
  where: string;
}

function SourcePicker({ ws, note, onClose, onPick }: { ws: Workspace; note: Note; onClose: () => void; onPick: (c: Choice) => void }) {
  const display = useDisplay();
  const [q, setQ] = useState('');
  const [at, setAt] = useState(0);
  const lid = useId();
  const box = useRef<HTMLDivElement>(null);
  const linked = new Set((note.sources ?? []).map((l) => NS.urlWithoutSpot(l.url)));
  const { open, lib } = useMemo(() => {
    const seen = new Set<string>();
    const open: Choice[] = [];
    for (const p of ws.panels)
      for (const t of p.tabs) {
        if (!t.url) continue;
        const k = NS.urlWithoutSpot(t.url);
        if (seen.has(k)) continue;
        seen.add(k);
        const b = NS.sourceForUrl(ws, t.url);
        open.push({ key: `o${p.id}${t.id}`, url: t.url, title: b?.title || hostTitle(t.url), where: p.name });
      }
    const lib: Choice[] = ws.bookmarks.filter((b) => !seen.has(NS.urlWithoutSpot(b.url))).map((b) => ({ key: `b${b.id}`, url: b.url, title: b.title, where: '' }));
    return { open, lib };
  }, [ws.panels, ws.bookmarks]); // eslint-disable-line react-hooks/exhaustive-deps
  const f = q.trim().toLowerCase();
  const hit = (c: Choice) => !f || c.title.toLowerCase().includes(f) || c.url.toLowerCase().includes(f) || c.where.toLowerCase().includes(f);
  const o = open.filter(hit).slice(0, 20);
  const l = lib.filter(hit).slice(0, 40);
  const all = [...o, ...l];
  const cur = all[Math.min(at, all.length - 1)];
  useEffect(() => setAt(0), [q]);
  useEffect(() => {
    const out = (e: PointerEvent) => !box.current?.contains(e.target as Node) && onClose();
    window.addEventListener('pointerdown', out, true);
    return () => window.removeEventListener('pointerdown', out, true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    document.getElementById(`${lid}-${at}`)?.scrollIntoView({ block: 'nearest' });
  }, [at, lid]);
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') (e.preventDefault(), setAt((i) => Math.min(i + 1, all.length - 1)));
    else if (e.key === 'ArrowUp') (e.preventDefault(), setAt((i) => Math.max(i - 1, 0)));
    else if (e.key === 'Home' && e.altKey) (e.preventDefault(), setAt(0));
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (cur) onPick(cur);
      else if (/^https?:\/\/|\./.test(q.trim())) onPick({ key: 'q', url: q.trim(), title: hostTitle(q.trim()), where: '' });
    } else if (e.key === 'Escape') (e.preventDefault(), e.stopPropagation(), onClose());
  };
  const row = (c: Choice, i: number) => {
    const on = linked.has(NS.urlWithoutSpot(c.url));
    return (
      <li
        key={c.key}
        id={`${lid}-${i}`}
        role="option"
        aria-selected={i === at}
        className={`srcpick__opt${i === at ? ' is-on' : ''}`}
        onPointerEnter={() => setAt(i)}
        onClick={() => onPick(c)}
      >
        <SiteIcon url={c.url} size={14} on={display.favicons} />
        <span className="srcpick__title">{c.title}</span>
        {c.where && <span className="srcpick__where">{c.where}</span>}
        {on && <span className="srcpick__where">· verknüpft</span>}
      </li>
    );
  };
  return (
    <div ref={box} className="srcpick" role="dialog" aria-label={T.pick}>
      <input
        className="srcpick__in"
        role="combobox"
        aria-expanded="true"
        aria-controls={`${lid}-list`}
        aria-activedescendant={cur ? `${lid}-${Math.min(at, all.length - 1)}` : undefined}
        aria-label={`${T.pick}. ${T.pickHint}`}
        placeholder="Quelle suchen oder Adresse eingeben …"
        value={q}
        autoFocus
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onKey}
      />
      <ul id={`${lid}-list`} className="srcpick__list" role="listbox" aria-label={T.pick}>
        {o.length > 0 && (
          <li role="presentation" className="srcpick__group">
            {T.openPages}
          </li>
        )}
        {o.map((c, i) => row(c, i))}
        {l.length > 0 && (
          <li role="presentation" className="srcpick__group">
            {T.library}
          </li>
        )}
        {l.map((c, i) => row(c, o.length + i))}
        {!all.length && (
          <li role="presentation" className="srcpick__none">
            {T.none}
          </li>
        )}
      </ul>
      <p className="srcpick__hint">{T.pickHint}</p>
    </div>
  );
}

const hostTitle = (url: string) => NS.pageTitle(url);

// ---------------------------------------------------------------- Q6: „n Notizen“ an einer Source (Library)

/**
 * V93 (Q6): Zeichen „Notiz + Zahl“ an einer Source in der Library – nur ab 1 Notiz. Klick zeigt am Ort dieselbe
 * Liste wie im Portal-Kopf (NF-08): Notizen öffnen im Pad, „+ Neue Notiz zu dieser Seite“.
 */
export function SourceNotes({ ws, id, url, title }: { ws: Workspace; id: string; url: string; title: string }) {
  const notes = NS.notesOfSource(ws, { id, url });
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const out = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener('pointerdown', out, true);
    window.setTimeout(() => box.current?.querySelector<HTMLElement>('.srcnotes__list button')?.focus(), 0);
    return () => window.removeEventListener('pointerdown', out, true);
  }, [open]);
  if (!notes.length) return null;
  const close = () => (setOpen(false), btn.current?.focus());
  const onKey = (e: KeyboardEvent<HTMLUListElement>) => {
    const items = [...(box.current?.querySelectorAll<HTMLElement>('.srcnotes__list button') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') (e.preventDefault(), items[Math.min(i + 1, items.length - 1)]?.focus());
    else if (e.key === 'ArrowUp') (e.preventDefault(), items[Math.max(i - 1, 0)]?.focus());
    else if (e.key === 'Escape') (e.preventDefault(), e.stopPropagation(), close());
  };
  return (
    <span ref={box} className="srcnotes">
      <button ref={btn} type="button" className="srcnotes__btn" aria-expanded={open} aria-label={T.notesTitle(notes.length)} title={T.notesTitle(notes.length)} onClick={() => setOpen((o) => !o)}>
        <Icon name="note" size={12} />
        <span>{notes.length}</span>
      </button>
      {open && (
        <ul className="srcnotes__list" aria-label={T.notes(notes.length)} onKeyDown={onKey}>
          {notes.slice(0, 12).map((n) => (
            <li key={n.id}>
              <button type="button" onClick={() => (setOpen(false), openNote(n.id))}>
                <Icon name="note" size={12} /> {n.title.trim() || n.text.split('\n')[0].replace(/^#+\s*/, '').trim() || 'Ohne Titel'}
              </button>
            </li>
          ))}
          <li>
            <button type="button" className="srcnotes__new" onClick={() => (setOpen(false), noteForPage({ url, title }))}>
              {T.newForPage}
            </button>
          </li>
        </ul>
      )}
    </span>
  );
}
