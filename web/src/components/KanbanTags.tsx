/**
 * V122 (F-231 K4): Tags mit Farbe und Kartenfilter am Kanban – wie Trello-Labels und „Karten filtern“.
 *
 * - `TagChips`: Farbstreifen oben auf der Karte, immer mit Namen (V61: nie Farbe allein).
 * - `CardTags`: Tags im Kartenfenster setzen und entfernen (bekannte werden vorgeschlagen).
 * - `TagPanel`: Verwaltung je Board – Farbe, umbenennen (gilt überall, T4), ein-/ausblenden, löschen, neuer Tag.
 * - `FilterPanel`: Tag, Fälligkeit, Zustand, Person; Rad „Verknüpfung“ ODER | UND.
 * Panels erscheinen am Ort unter dem Sheet-Kopf wie Archiv und Kopieren; Meldungen mit Rückgängig dort.
 */
import { type Dispatch, type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { Note, NoteView, Workspace } from '../workspace/types';
import * as No from '../workspace/notes';
import * as Tg from '../workspace/tags';
import * as CF from '../workspace/cardFilter';
import { FILTER_TEXT as F, NOTE_TEXT, PAUSE_TEXT, TAG_TEXT as T } from '../workspace/terms';
import { ModeWheel } from './ModeWheel';
import { Icon } from './Icon';

/** Ein Tag als Farbstreifen mit Namen. */
export function TagChip({ tag, color, onRemove }: { tag: string; color?: string; onRemove?: () => void }) {
  const style = color ? { background: Tg.tagHex(color), color: Tg.tagInk(color) } : undefined;
  return (
    <span className={`ktag${color ? '' : ' ktag--plain'}`} style={style} title={color ? `${tag} · ${Tg.tagColorName(color)}` : tag}>
      <span className="ktag__name">{tag}</span>
      {onRemove && (
        <button type="button" className="ktag__x" aria-label={T.remove(tag)} title={T.remove(tag)} onClick={onRemove}>
          <Icon name="close" size={9} />
        </button>
      )}
    </span>
  );
}

/** Farbstreifen oben auf der Karte (ohne die im Board ausgeblendeten). */
export function TagChips({ ws, v, n }: { ws: Workspace; v?: NoteView; n: Note }) {
  const list = Tg.shownTags(ws, v, n);
  if (!list.length) return null;
  return (
    <span className="kcard__tags">
      <span className="sr-only">{T.tags}: </span>
      {list.map((t) => (
        <TagChip key={t.tag} tag={t.tag} color={t.color} />
      ))}
    </span>
  );
}

/** Farbwahl: zehn Farben (wie Trello) und „ohne Farbe“; Pfeile wandern, Enter/Leertaste wählt. */
function ColorRow({ value, onPick, label }: { value?: string; onPick: (c?: string) => void; label: string }) {
  const keys = (e: KeyboardEvent<HTMLDivElement>) => {
    const btns = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('button')];
    const i = btns.indexOf(document.activeElement as HTMLButtonElement);
    const j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : -2;
    if (j === -2 || !btns[j]) return;
    e.preventDefault();
    btns[j].focus();
  };
  return (
    <div className="ktag__colors" role="group" aria-label={label} onKeyDown={keys}>
      {Tg.TAG_COLORS.map((c) => (
        <button
          key={c.id}
          type="button"
          className="ktag__swatch"
          style={{ background: c.hex }}
          aria-pressed={value === c.id || value?.startsWith(`${c.id}_`)}
          aria-label={c.name}
          title={c.name}
          onClick={() => onPick(c.id)}
        >
          {(value === c.id || value?.startsWith(`${c.id}_`)) && <Icon name="check" size={10} />}
        </button>
      ))}
      <button type="button" className="ktag__swatch ktag__swatch--none" aria-pressed={!value} aria-label={T.noColor} title={T.noColor} onClick={() => onPick(undefined)}>
        {!value ? <Icon name="check" size={10} /> : <Icon name="close" size={10} />}
      </button>
    </div>
  );
}

/** Tags im Kartenfenster. */
export function CardTags(props: { ws: Workspace; dispatch: Dispatch<Action>; noteId: string; sheetId: string; say: (t: string) => void }) {
  const { ws, dispatch, noteId, say } = props;
  const n = No.noteById(ws, noteId);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState<{ text: string; undo?: () => void } | null>(null);
  const list = useId();
  if (!n) return null;
  const by = ws.profile?.name || undefined;
  const tags = n.tags ?? [];
  const t = No.titleOf(No.shownNote(n)) || NOTE_TEXT.untitled;
  const set = (next: string[]) => dispatch({ type: 'noteTags', id: noteId, tags: next, by });
  const known = Tg.allTags(ws).filter((x) => !tags.some((y) => Tg.fold(y) === Tg.fold(x)));
  const add = () => {
    const name = q.trim();
    if (!name) return;
    const before = tags;
    if (!Tg.allTags(ws).some((x) => Tg.fold(x) === Tg.fold(name))) dispatch({ type: 'tagCreate', tag: name });
    set([...tags, name]);
    setQ('');
    const text = T.added(name);
    setMsg({ text, undo: () => set(before) });
    say(text);
  };
  return (
    <div className="cardwin__tags" role="group" aria-label={T.tagsOf(t)}>
      <p className="cardwin__checkhead">
        <Icon name="tag" size={12} /> <strong>{T.tags}</strong>
      </p>
      <div className="ktag__row">
        {tags.map((x) => (
          <TagChip
            key={x}
            tag={x}
            color={Tg.colorOf(ws, x)}
            onRemove={() => {
              const before = tags;
              set(tags.filter((y) => y !== x));
              const text = T.removed(x);
              setMsg({ text, undo: () => set(before) });
              say(text);
            }}
          />
        ))}
        <input
          className="ktag__add"
          value={q}
          list={list}
          placeholder={T.addPh}
          aria-label={T.add}
          title={T.addHint}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.preventDefault(), add());
          }}
        />
        <datalist id={list}>
          {known.map((x) => (
            <option key={x} value={x} />
          ))}
        </datalist>
      </div>
      {msg && (
        <p className="sheet__msg" role="status">
          {msg.text}
          {msg.undo && (
            <button type="button" className="note__undo" onClick={() => (msg.undo?.(), setMsg(null))}>
              {PAUSE_TEXT.undo}
            </button>
          )}
        </p>
      )}
    </div>
  );
}

/** Verwaltung der Tags eines Boards. */
export function TagPanel(props: { ws: Workspace; dispatch: Dispatch<Action>; sheetId: string; say: (t: string) => void; onClose: () => void }) {
  const { ws, dispatch, sheetId, say } = props;
  const v = No.viewById(ws, sheetId);
  const box = useRef<HTMLElement>(null);
  const [msg, setMsg] = useState<{ text: string; undo?: () => void } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [coloring, setColoring] = useState<string | null>(null);
  const [fresh, setFresh] = useState('');
  useEffect(() => {
    box.current?.querySelector<HTMLElement>('.ktags__list button, input')?.focus();
  }, []);
  if (!v) return null;
  const rows = Tg.boardTags(ws, sheetId);
  const tell = (text: string, undo?: () => void) => (setMsg({ text, undo }), say(text));
  const back = (ws0: Workspace) => () => dispatch({ type: 'exchange', ws: ws0 });
  return (
    <section className="sheet__move karch ktags" aria-label={T.head(v.name)} ref={box} onKeyDown={(e) => e.key === 'Escape' && !renaming && (e.preventDefault(), e.stopPropagation(), props.onClose())}>
      <header className="karch__head">
        <span className="sheet__move-cap">
          <Icon name="tag" size={12} className="icon icon--inline" /> {T.head(v.name)}
        </span>
        <input
          value={fresh}
          placeholder={T.createPh}
          aria-label={T.create}
          onChange={(e) => setFresh(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && fresh.trim()) {
              e.preventDefault();
              const before = ws;
              dispatch({ type: 'tagCreate', tag: fresh.trim() });
              tell(T.created(fresh.trim()), back(before));
              setFresh('');
            }
          }}
        />
        <button type="button" className="help__run" onClick={props.onClose}>
          {T.close}
        </button>
      </header>
      {msg && (
        <p className="sheet__msg" role="status">
          {msg.text}
          {msg.undo && (
            <button type="button" className="note__undo" onClick={() => (msg.undo?.(), setMsg(null))}>
              {PAUSE_TEXT.undo}
            </button>
          )}
        </p>
      )}
      {!rows.length ? (
        <p className="lc__muted">{T.none}</p>
      ) : (
        <ul className="karch__list ktags__list">
          {rows.map((r) => (
            <li key={r.tag}>
              <button type="button" className="ktag__colorbtn" aria-expanded={coloring === r.tag} aria-label={`${T.color(r.tag)}: ${r.color ? Tg.tagColorName(r.color) : T.noColor}`} title={T.color(r.tag)} onClick={() => setColoring(coloring === r.tag ? null : r.tag)}>
                <TagChip tag={r.tag} color={r.color} />
              </button>
              {renaming === r.tag ? (
                <input
                  className="ktag__rename"
                  autoFocus
                  defaultValue={r.tag}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label={T.rename(r.tag)}
                  title={T.renameHint}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const to = e.currentTarget.value.trim();
                      setRenaming(null);
                      if (!to || to === r.tag) return;
                      const before = ws;
                      const res = Tg.renameTag(ws, r.tag, to);
                      dispatch({ type: 'tagRename', from: r.tag, to });
                      tell(T.renamed(r.tag, to, res.notes), back(before));
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      e.stopPropagation();
                      setRenaming(null);
                    }
                  }}
                  onBlur={() => setRenaming(null)}
                />
              ) : (
                <span className="lc__muted">{T.cards(r.count)}</span>
              )}
              <label className="ktag__shown" title={T.shownHint}>
                <input type="checkbox" checked={!r.hidden} onChange={(e) => dispatch({ type: 'tagHide', view: sheetId, tag: r.tag, hide: !e.target.checked })} /> {T.shown}
              </label>
              <button type="button" className="note__undo" aria-label={T.rename(r.tag)} title={T.renameHint} onClick={() => setRenaming(r.tag)}>
                <Icon name="rename" size={11} />
              </button>
              <button
                type="button"
                className="note__undo"
                aria-label={T.del(r.tag)}
                title={T.delHint}
                onClick={() => {
                  const before = ws;
                  const res = Tg.removeTagIn(ws, sheetId, r.tag);
                  dispatch({ type: 'tagRemoveIn', view: sheetId, tag: r.tag });
                  tell(T.deleted(r.tag, res.notes), back(before));
                }}
              >
                <Icon name="trash" size={11} />
              </button>
              {coloring === r.tag && (
                <ColorRow
                  value={r.color}
                  label={T.color(r.tag)}
                  onPick={(c) => {
                    dispatch({ type: 'tagColor', tag: r.tag, color: c });
                    say(T.colorSet(r.tag, c ? Tg.tagColorName(c) : T.noColor));
                    setColoring(null);
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Filter-Knopf für den Sheet-Kopf. */
export function FilterButton(props: { f: CF.CardFilter; open: boolean; onToggle: () => void; btnRef?: React.RefObject<HTMLButtonElement> }) {
  const n = CF.filterCount(props.f);
  return (
    <button type="button" ref={props.btnRef} className={`help__run sheet__filterbtn${n ? ' is-on' : ''}`} aria-expanded={props.open} title={F.btnHint} onClick={props.onToggle}>
      <Icon name="filter" size={12} className="icon icon--inline" /> {n ? F.btnN(n) : F.btn}
    </button>
  );
}

/** Kartenfilter: Tag, Fälligkeit, Zustand, Person – ODER | UND. */
export function FilterPanel(props: { ws: Workspace; sheetId: string; f: CF.CardFilter; onChange: (f: CF.CardFilter) => void; shown: number; say: (t: string) => void; onClose: () => void }) {
  const { ws, f, onChange } = props;
  const box = useRef<HTMLElement>(null);
  useEffect(() => {
    box.current?.querySelector<HTMLElement>('input')?.focus();
  }, []);
  const n = CF.filterCount(f);
  const tags = Tg.boardTags(ws, props.sheetId);
  const persons = ws.persons ?? [];
  const box1 = (key: 'tags' | 'due' | 'states' | 'persons', val: string, label: string, chip?: { tag: string; color?: string }) => (
    <label key={`${key}-${val}`} className="kfil__opt">
      <input type="checkbox" checked={(f[key] as string[]).includes(val)} onChange={() => onChange(CF.toggle(f, key, val as never))} />
      {chip ? <TagChip tag={chip.tag} color={chip.color} /> : label}
    </label>
  );
  return (
    <section className="sheet__move karch kfil" aria-label={F.head} ref={box} onKeyDown={(e) => e.key === 'Escape' && (e.preventDefault(), e.stopPropagation(), props.onClose())}>
      <header className="karch__head">
        <span className="sheet__move-cap">
          <Icon name="filter" size={12} className="icon icon--inline" /> {F.head}
        </span>
        <ModeWheel
          id={`${props.sheetId}-fmode`}
          className="sheet__wheel"
          label={F.mode}
          options={[
            { id: 'any', name: F.modeAny, icon: 'plus', hint: F.modeAnyHint },
            { id: 'all', name: F.modeAll, icon: 'check', hint: F.modeAllHint },
          ]}
          value={f.mode}
          onChange={(m) => onChange({ ...f, mode: m as CF.FilterMode })}
        />
        <button
          type="button"
          className="help__run"
          disabled={!n}
          onClick={() => {
            onChange({ ...CF.FILTER_EMPTY, mode: f.mode });
            props.say(F.cleared);
          }}
        >
          {F.clear}
        </button>
        <button type="button" className="help__run" onClick={props.onClose}>
          {F.close}
        </button>
      </header>
      {n > 0 && (
        <p className="sheet__msg" role="status">
          {F.active(n, props.shown)}
        </p>
      )}
      <div className="kfil__groups">
        <fieldset className="kfil__group">
          <legend>{F.tags}</legend>
          {tags.map((t) => box1('tags', Tg.fold(t.tag), t.tag, { tag: t.tag, color: t.color }))}
          {box1('tags', '', F.noTag)}
        </fieldset>
        <fieldset className="kfil__group">
          <legend>{F.due}</legend>
          {CF.DUE_FILTERS.map((d) => box1('due', d, F.dueName[d]))}
        </fieldset>
        <fieldset className="kfil__group">
          <legend>{F.states}</legend>
          {CF.STATE_FILTERS.map((s) => box1('states', s, NOTE_TEXT.states[s]))}
        </fieldset>
        <fieldset className="kfil__group">
          <legend>{F.persons}</legend>
          {persons.map((p) => box1('persons', p.id, p.name))}
          {box1('persons', '', F.noPerson)}
        </fieldset>
      </div>
    </section>
  );
}
