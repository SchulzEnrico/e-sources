/**
 * F-210 Schritt 5 (V91, Z1–Z4): Gruppe „Notizen-Layouts“ im Cockpit „Layouts“ – zwischen den
 * Desk-Layouts und den Board-Vorlagen, mit denselben Werkzeugen an denselben Stellen (NF-08):
 * Karten mit Mini-Abbild (Pfeile wählen, Enter wechselt, F2 benennt um, Entf löscht), darunter die
 * Aktionen der gewählten Karte, „Neues Notizen-Layout“, Meldungen und Rückgängig am Ort (F-214).
 * Mitgelieferte Layouts („Fokus“, „Tagesplanung“) stehen als eigene Karten dahinter; „Anlegen und
 * wechseln“ macht daraus ein eigenes Layout mit leeren Sheets.
 */
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { NoteViewKind, Workspace } from '../workspace/types';
import * as NL from '../workspace/notesLayouts';
import { DIALOG_TEXT, NOTES_LAYOUT_TEXT as NLT, TERMS } from '../workspace/terms';
import { noticeLater } from '../workspace/flash';
import { newId } from '../workspace/workspace';
import { rects as treeRects } from '../workspace/tree';
import { Icon } from './Icon';
import type { IconName } from '../workspace/icons';

const explain = (t: string) => t.split(' = ').slice(1).join(' = ') || t;
const KIND_ICON: Record<NoteViewKind, IconName> = { block: 'note', todo: 'todo', kanban: 'kanban', eisenhower: 'matrix' };
const KIND_NAME: Record<NoteViewKind, string> = { block: 'Notizblock', todo: 'To-do-Liste', kanban: 'Kanban-Board', eisenhower: 'Eisenhower-Matrix' };
const B = (id: NL.BuiltinNotes) => `b:${id}`;
const builtinOf = (sel: string): NL.BuiltinNotes | null => (sel.startsWith('b:') ? (sel.slice(2) as NL.BuiltinNotes) : null);

/** Kacheln eines mitgelieferten Layouts für das Mini-Abbild (ohne Arbeitsfläche). */
function builtinTiles(which: NL.BuiltinNotes): NL.NotesTile[] {
  const spec = NL.BUILTIN_SPEC[which];
  const ids = spec.kinds.map((_, i) => `t${i}`);
  const r = treeRects(spec.tree(ids));
  return ids.map((id, i) => ({ id, rect: r.get(id)!, name: KIND_NAME[spec.kinds[i]], kind: spec.kinds[i], sheets: 1 }));
}

/** Kleines Bild der Pads (nur Bild; Namen und Arten stehen im Text daneben). */
function MiniPads({ tiles }: { tiles: NL.NotesTile[] }) {
  return (
    <span className="nl__mini" aria-hidden="true">
      {tiles.map((t) => (
        <span
          key={t.id}
          className={`nl__minipad is-${t.kind}`}
          style={{ left: `${t.rect.x * 100}%`, top: `${t.rect.y * 100}%`, width: `${t.rect.w * 100}%`, height: `${t.rect.h * 100}%` }}
          title={t.name}
        >
          <Icon name={KIND_ICON[t.kind]} size={10} />
        </span>
      ))}
      {!tiles.length && <span className="nl__minipad is-empty" style={{ left: 0, top: 0, width: '100%', height: '100%' }} />}
    </span>
  );
}

const padsLine = (tiles: NL.NotesTile[]) => tiles.map((t) => `${t.name} (${KIND_NAME[t.kind]}${t.sheets > 1 ? `, ${NLT.sheets(t.sheets)}` : ''})`).join(', ');

export interface NotesLayoutGroupProps {
  ws: Workspace;
  /** Desk ('' = Main Desk). */
  win: string;
  /** Z2: Schlüssel der Bildschirm-Einstellung (wie `linesKey`) und ihr Name. */
  screenKey: string;
  screenName: string;
  dispatch: (a: Action) => void;
  say: (t: string) => void;
  /** Nach Wechseln/Anlegen: Desk in den Notizen-Modus schalten (falls nicht schon). */
  onApplied: () => void;
}

export function NotesLayoutGroup({ ws, win, screenKey, screenName, dispatch, say, onApplied }: NotesLayoutGroupProps) {
  const d = NL.notesLayoutsOf(ws, win);
  const ids = [...d.list.map((l) => l.id), ...NL.BUILTIN_NOTES.map(B)];
  const [sel, setSel] = useState(d.active);
  const selId = ids.includes(sel) ? sel : d.active;
  const builtin = builtinOf(selId);
  const own = builtin ? null : (d.list.find((l) => l.id === selId) ?? null);
  const full = d.list.length >= NL.NOTES_LAYOUT_MAX;
  const [adding, setAdding] = useState(false);
  const [from, setFrom] = useState<NL.NotesFrom>('current');
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(false);
  const fromCard = useRef(false);
  const [draft, setDraft] = useState('');
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [undo, setUndo] = useState<{ text: string; u: NL.DeletedNotesLayout } | null>(null);
  const cards = useRef(new Map<string, HTMLButtonElement>());
  const later = (f: () => void) => window.setTimeout(f, 0);
  const focusCard = (id: string) => later(() => cards.current.get(id)?.focus());
  useEffect(() => {
    if (!note) return;
    const t = noticeLater(() => setNote(''));
    return () => window.clearTimeout(t);
  }, [note]);
  useEffect(() => {
    if (!undo) return;
    const t = noticeLater(() => setUndo(null), 3);
    return () => window.clearTimeout(t);
  }, [undo]);
  const tell = (t: string) => (setNote(t), say(t));
  const tilesOf = (id: string) => {
    const b = builtinOf(id);
    return b ? builtinTiles(b) : NL.notesLayoutView(ws, win, id, screenKey);
  };
  const shownName = builtin ? NLT.builtin[builtin] : (own?.name ?? '');
  const shownTiles = tilesOf(selId);

  const switchTo = (id: string) => {
    if (id === d.active) return (onApplied(), tell(NLT.switched(d.list.find((l) => l.id === id)?.name ?? '')));
    dispatch({ type: 'notesSwitch', desk: win, id });
    onApplied();
    tell(NLT.switched(d.list.find((l) => l.id === id)?.name ?? ''));
  };
  const create = (what: NL.NotesFrom, nm?: string) => {
    if (full) return setError(NLT.full(NL.NOTES_LAYOUT_MAX));
    const n = nm?.trim() ?? '';
    if (n && NL.notesNameTaken(ws, win, n)) return setError(NLT.nameTaken);
    const id = newId();
    const label = n || (what === 'current' ? NL.freeNotesName(d, NL.activeNotesLayout(ws, win).name) : what === 'empty' ? NL.freeNotesName(d) : NL.freeNotesName(d, NLT.builtin[what]));
    dispatch({ type: 'notesAdd', desk: win, from: what, key: screenKey, name: label, id });
    onApplied();
    setAdding(false);
    setName('');
    setSel(id);
    tell(NLT.added(label));
    focusCard(id);
  };
  const copy = () => {
    if (!own) return setError(NLT.builtInFixed);
    if (full) return setError(NLT.full(NL.NOTES_LAYOUT_MAX));
    const before = new Set(d.list.map((l) => l.id));
    dispatch({ type: 'notesCopy', desk: win, id: own.id });
    tell(NLT.copied(NL.freeNotesName(d, own.name)));
    // die Kopie steht direkt hinter dem Original
    later(() => {
      const next = [...cards.current.keys()].find((k) => !before.has(k) && !k.startsWith('b:'));
      if (next) (setSel(next), focusCard(next));
    });
  };
  const remove = () => {
    setAsking(false);
    if (!own) return;
    const r = NL.deleteNotesLayout(ws, win, own.id);
    if (!r.deleted) return setError(NLT.last);
    dispatch({ type: 'notesDelete', desk: win, id: own.id });
    const text = NLT.removed(own.name);
    say(`${text}. ${NLT.undoHint}`);
    setUndo({ text, u: r.deleted });
    setSel(NL.notesLayoutsOf(r.ws, win).active);
    later(() => document.getElementById('nl-undo')?.focus());
  };
  const startRename = () => (own ? (setEditing(true), setDraft(own.name), setError('')) : setError(NLT.builtInFixed));

  const onCardKey = (e: KeyboardEvent, i: number) => {
    let j = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = Math.min(ids.length - 1, i + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = Math.max(0, i - 1);
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = ids.length - 1;
    else if (e.key === 'Enter') {
      e.preventDefault();
      const b = builtinOf(ids[i]);
      return b ? create(b) : switchTo(ids[i]);
    } else if (e.key === 'F2') {
      e.preventDefault();
      fromCard.current = true;
      return startRename();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      return own ? setAsking(true) : setError(NLT.builtInFixed);
    }
    if (j < 0) return;
    e.preventDefault();
    setSel(ids[j]);
    setError('');
    focusCard(ids[j]);
  };

  const nameLine = (
    <span id="nl-name" className="lc__name">
      {shownName}
      <span className="lc__muted"> · {builtin ? NLT.builtInBadge : selId === d.active ? NLT.active : NLT.pads(shownTiles.length)}</span>
      <span aria-hidden="true">:</span>
    </span>
  );

  return (
    <section className="lc__group nl" aria-labelledby="nl-head">
      <header className="lc__head lc__band">
        <Icon name="layouts" size={15} className="icon icon--inline" />
        <h3 id="nl-head" className="lc__head-title" title={explain(TERMS.notesLayout)}>
          {NLT.head}
        </h3>
        <span className="lc__head-tools lc__muted">{NLT.screen(screenName)}</span>
      </header>
      <p className="help__text bt__intro">{TERMS.notesLayout.replace(' = ', ': ')}</p>

      <ul className="lc__cards" aria-label={NLT.head}>
        {ids.map((id, i) => {
          const on = id === selId;
          const b = builtinOf(id);
          const l = b ? null : d.list.find((x) => x.id === id)!;
          const tiles = tilesOf(id);
          const label = b ? NLT.builtin[b] : l!.name;
          const badge = b ? NLT.builtInBadge : id === d.active ? NLT.active : '';
          return (
            <li key={id}>
              <button
                type="button"
                ref={(el) => {
                  if (el) cards.current.set(id, el);
                  else cards.current.delete(id);
                }}
                className={`lc__card${on ? ' is-sel' : ''}${id === d.active ? ' is-active' : ''}`}
                aria-pressed={on}
                aria-label={`${label}${badge ? `, ${badge}` : ''}, ${NLT.pads(tiles.length)}${tiles.length ? `: ${padsLine(tiles)}` : ''}`}
                title={`${b ? NLT.builtinHint[b] : padsLine(tiles) || NLT.fromEmpty} – ${NLT.cardKeys}`}
                onClick={() => (setSel(id), setError(''), setAsking(false), setEditing(false))}
                onDoubleClick={() => (b ? create(b) : switchTo(id))}
                onKeyDown={(e) => onCardKey(e, i)}
              >
                <MiniPads tiles={tiles} />
                <span className="lc__card-name">{label}</span>
                <span className="lc__card-meta">
                  {b ? <span>{NLT.builtInBadge}</span> : id === d.active ? <b>{NLT.active}</b> : null}
                  {NLT.pads(tiles.length)}
                </span>
              </button>
            </li>
          );
        })}
        <li>
          <button type="button" id="nl-add" className="lc__card lc__card--add" aria-expanded={adding} disabled={full} title={full ? NLT.full(NL.NOTES_LAYOUT_MAX) : undefined} onClick={() => (setAdding(!adding), setFrom('current'), setError(''))}>
            <Icon name="plus" size={14} className="icon icon--inline" /> {NLT.add}
          </button>
        </li>
      </ul>

      {adding && (
        <form
          className="layouts__new lc__new"
          aria-label={NLT.add}
          title={DIALOG_TEXT.createHint}
          onKeyDown={(e) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            e.stopPropagation();
            setAdding(false);
            later(() => document.getElementById('nl-add')?.focus());
          }}
          onSubmit={(e) => (e.preventDefault(), create(from, name))}
        >
          <label className="layouts__label">
            {NLT.addFrom}
            <select value={from} onChange={(e) => (setFrom(e.target.value as NL.NotesFrom), setError(''))}>
              <option value="current">{NLT.fromCurrent}</option>
              <option value="empty">{NLT.fromEmpty}</option>
              {NL.BUILTIN_NOTES.map((b) => (
                <option key={b} value={b}>
                  {NLT.builtin[b]} ({NLT.builtInBadge})
                </option>
              ))}
            </select>
          </label>
          <label className="layouts__label">
            {NLT.name}
            <input
              autoFocus
              value={name}
              maxLength={60}
              placeholder={from === 'current' ? NL.freeNotesName(d, NL.activeNotesLayout(ws, win).name) : from === 'empty' ? NL.freeNotesName(d) : NL.freeNotesName(d, NLT.builtin[from])}
              onChange={(e) => (setName(e.target.value), setError(''))}
            />
          </label>
          <div className="layouts__tools">
            <button type="button" className="help__run" onClick={() => (setAdding(false), later(() => document.getElementById('nl-add')?.focus()))}>
              {DIALOG_TEXT.cancel}
            </button>
            <button type="submit" className="help__run lc__primary">
              <Icon name="plus" size={13} className="icon icon--inline" /> {NLT.create}
            </button>
          </div>
        </form>
      )}

      {/* Aktionen der gewählten Karte direkt darunter – wie bei Desk-Layouts und Board-Vorlagen */}
      <div className="lc__actions" role="group" aria-labelledby="nl-name">
        {editing && own ? (
          <form
            className="help__row lc__rename"
            onSubmit={(e) => {
              e.preventDefault();
              if (NL.notesNameTaken(ws, win, draft, own.id)) return setError(NLT.nameTaken);
              if (draft.trim() && draft.trim() !== own.name) {
                dispatch({ type: 'notesRename', desk: win, id: own.id, name: draft });
                tell(NLT.renamed(draft.trim()));
              }
              setEditing(false);
              setError('');
              if (fromCard.current) focusCard(own.id);
              else later(() => document.getElementById('nl-rename')?.focus());
              fromCard.current = false;
            }}
          >
            <label className="layouts__label">
              <span id="nl-name">{NLT.name}</span>
              <input
                autoFocus
                value={draft}
                maxLength={60}
                aria-invalid={!!error}
                title={DIALOG_TEXT.renameHint}
                onChange={(e) => (setDraft(e.target.value), setError(''))}
                onKeyDown={(e) => {
                  if (e.key !== 'Escape') return;
                  e.stopPropagation();
                  e.preventDefault();
                  setEditing(false);
                  later(() => document.getElementById('nl-rename')?.focus());
                }}
              />
            </label>
            <button type="button" className="help__run" onClick={() => (setEditing(false), setError(''), later(() => document.getElementById('nl-rename')?.focus()))}>
              {DIALOG_TEXT.cancel}
            </button>
            <button type="submit" className="help__run lc__primary">
              {DIALOG_TEXT.apply}
            </button>
          </form>
        ) : asking && own ? (
          <div className="layouts__ask" role="group" aria-labelledby="nl-ask">
            {nameLine}
            <span id="nl-ask">{NLT.askRemove(own.name)}</span>
            <button type="button" className="help__run" autoFocus onClick={remove}>
              {NLT.remove}
            </button>
            <button type="button" className="help__run" onClick={() => (setAsking(false), later(() => document.getElementById('nl-del')?.focus()))}>
              {DIALOG_TEXT.cancel}
            </button>
          </div>
        ) : (
          <>
            {nameLine}
            {builtin ? (
              <button type="button" className="help__run lc__switch lc__primary" aria-disabled={full} title={full ? NLT.full(NL.NOTES_LAYOUT_MAX) : NLT.useBuiltinHint} onClick={() => create(builtin)}>
                <Icon name="layouts" size={13} className="icon icon--inline" /> {NLT.useBuiltin}
              </button>
            ) : (
              <button type="button" className="help__run lc__switch lc__primary" title={NLT.switchHint} onClick={() => switchTo(selId)}>
                <Icon name="layouts" size={13} className="icon icon--inline" /> {NLT.switchTo}
              </button>
            )}
            <button type="button" id="nl-rename" className="help__run" aria-disabled={!own} title={own ? undefined : NLT.builtInFixed} onClick={startRename}>
              <Icon name="rename" size={13} className="icon icon--inline" /> {NLT.rename}
            </button>
            <button type="button" className="help__run" aria-disabled={!own || full} title={!own ? NLT.builtInFixed : full ? NLT.full(NL.NOTES_LAYOUT_MAX) : NLT.copyHint} onClick={copy}>
              <Icon name="copy" size={13} className="icon icon--inline" /> {NLT.copy}
            </button>
            <button type="button" id="nl-del" className="help__run" aria-disabled={!own || d.list.length < 2} title={!own ? NLT.builtInFixed : d.list.length < 2 ? NLT.last : undefined} onClick={() => (!own ? setError(NLT.builtInFixed) : d.list.length < 2 ? setError(NLT.last) : setAsking(true))}>
              <Icon name="remove" size={13} className="icon icon--inline" /> {NLT.remove}
            </button>
          </>
        )}
      </div>
      <p className="bt__cols help__text">
        {shownTiles.length ? (
          shownTiles.map((t) => (
            <span key={t.id} className="bt__col">
              <Icon name={KIND_ICON[t.kind]} size={11} className="icon icon--inline" /> {t.name}{' '}
              <span className="lc__muted">
                ({KIND_NAME[t.kind]}
                {t.sheets > 1 ? `, ${NLT.sheets(t.sheets)}` : ''})
              </span>
            </span>
          ))
        ) : (
          <span className="lc__muted">{NLT.fromEmpty}</span>
        )}
      </p>
      {undo && (
        <p className="layouts__undo" role="status">
          {undo.text}{' '}
          <button
            type="button"
            id="nl-undo"
            className="help__run"
            onClick={() => {
              dispatch({ type: 'notesRestore', deleted: undo.u });
              setSel(undo.u.layout.id);
              setUndo(null);
              say(NLT.undone(undo.u.layout.name));
              focusCard(undo.u.layout.id);
            }}
          >
            {NLT.undo}
          </button>
        </p>
      )}
      {note && (
        <p className="layouts__undo" role="status">
          {note}
        </p>
      )}
      {error && (
        <p className="layouts__error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
