/**
 * V125 (F-231 K8): Eigene Felder je Board und Abstimmen – wie Trello „Custom Fields“ und „Voting“.
 *
 * - `CardFields`: Abschnitt im Kartenfenster – je Feld ein Eingabefeld passend zur Art (Text, Zahl, Datum, Auswahl,
 *   Häkchen), darüber „Abstimmen“, wenn das Board es erlaubt. Jede Änderung meldet sich am Ort mit „Rückgängig“.
 * - `FieldChips`, `VoteSign`: was vorn auf der Karte steht (Felder mit „auf der Karte“, Zahl der Stimmen).
 * - `FieldPanel`: „Felder (n)“ unten im Board – anlegen, umbenennen, ordnen, „auf der Karte“, löschen; Wahlen einer
 *   Auswahl mit Farbe. Logik in workspace/cardFields.ts.
 */
import { type Dispatch, type ReactNode, useEffect, useRef, useState } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { CardFieldDef, CardFieldType, CardFieldValue, Note, NoteView, Workspace } from '../workspace/types';
import * as No from '../workspace/notes';
import * as CFd from '../workspace/cardFields';
import * as Ps from '../workspace/persons';
import { COVER_COLORS } from '../workspace/covers';
import { tagColorName, tagHex, tagInk } from '../workspace/tags';
import { FIELD_TEXT as F, NOTE_TEXT, PAUSE_TEXT, VOTE_TEXT as VT } from '../workspace/terms';
import { Icon } from './Icon';

type Msg = { text: string; undo?: () => void } | null;

function MsgLine({ msg, onDone }: { msg: Msg; onDone: () => void }) {
  if (!msg) return null;
  return (
    <p className="sheet__msg" role="status">
      {msg.text}
      {msg.undo && (
        <button type="button" className="note__undo" onClick={() => (msg.undo?.(), onDone())}>
          {PAUSE_TEXT.undo}
        </button>
      )}
    </p>
  );
}

/** Wahl einer Auswahl als kleiner Streifen (Farbe immer mit Namen, Entscheidung V61) */
export function OptChip({ name, color, label }: { name: string; color?: string; label?: string }) {
  const style = color ? { background: tagHex(color), color: tagInk(color) } : undefined;
  return (
    <span className={`ktag kfld__chip${color ? '' : ' ktag--plain'}`} style={style} title={label ? `${label}: ${name}` : name}>
      {label && <span className="kfld__label">{label}:</span>}
      <span className="ktag__name">{name}</span>
    </span>
  );
}

/** Vorn auf der Karte: Felder mit „auf der Karte“ (nur mit Wert) */
export function FieldChips({ v, n }: { v: NoteView | undefined; n: Note }) {
  const list = CFd.cardFront(v, n);
  if (!list.length) return null;
  return (
    <span className="kcard__fields">
      {list.map((x) =>
        x.def.type === 'check' ? (
          <span key={x.def.id} className="sign" title={`${x.def.name}: ${F.yes}`}>
            <Icon name="check" size={10} /> {x.def.name}
          </span>
        ) : (
          <OptChip key={x.def.id} name={x.text} color={x.color} label={x.def.name} />
        ),
      )}
    </span>
  );
}

/** Zahl der Stimmen auf der Karte (nur wenn Abstimmen an ist und es Stimmen gibt) */
export function VoteSign({ ws, v, n }: { ws: Workspace; v: NoteView | undefined; n: Note }) {
  const c = CFd.votesOf(n).length;
  if (!v?.votes || !c) return null;
  const mine = CFd.hasVoted(n, Ps.meId(ws));
  const t = `${VT.count(c)}${mine ? `, ${VT.mine}` : ''}`;
  return (
    <span className={`sign kvote__sign${mine ? ' is-mine' : ''}`} title={t}>
      <Icon name="vote" size={11} /> {c}
      <span className="sr-only">, {t}</span>
    </span>
  );
}

/** Eingabe eines Felds im Kartenfenster */
function FieldInput({ def, value, title, onSet }: { def: CardFieldDef; value: CardFieldValue | undefined; title: string; onSet: (raw: unknown) => void }) {
  const label = `${def.name} – ${title}`;
  const shown = def.type === 'number' && typeof value === 'number' ? CFd.valueText(def, value) : typeof value === 'string' ? value : '';
  const [txt, setTxt] = useState(shown);
  useEffect(() => setTxt(shown), [shown]);
  const commit = () => txt.trim() !== shown && onSet(txt);
  if (def.type === 'check')
    return (
      <label className="kfld__check">
        <input type="checkbox" checked={value === true} aria-label={label} onChange={(e) => onSet(e.target.checked)} /> {F.yes}
      </label>
    );
  if (def.type === 'list')
    return (
      <select value={typeof value === 'string' ? value : ''} aria-label={label} onChange={(e) => onSet(e.target.value)}>
        <option value="">{F.empty}</option>
        {(def.options ?? []).map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
            {o.color ? ` · ${tagColorName(o.color)}` : ''}
          </option>
        ))}
      </select>
    );
  if (def.type === 'date') return <input type="date" value={typeof value === 'string' ? value : ''} aria-label={label} onChange={(e) => onSet(e.target.value)} />;
  return (
    <input
      type="text"
      inputMode={def.type === 'number' ? 'decimal' : undefined}
      value={txt}
      aria-label={label}
      placeholder={F.empty}
      onChange={(e) => setTxt(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.preventDefault(), commit());
        else if (e.key === 'Escape' && txt !== shown) (e.preventDefault(), e.stopPropagation(), setTxt(shown));
      }}
    />
  );
}

/** Kartenfenster: Abstimmen und eigene Felder */
export function CardFields(props: { ws: Workspace; dispatch: Dispatch<Action>; noteId: string; sheetId: string; say: (t: string) => void }) {
  const { ws, dispatch, noteId, sheetId, say } = props;
  const n = No.noteById(ws, noteId);
  const v = No.viewById(ws, sheetId);
  const [msg, setMsg] = useState<Msg>(null);
  const [vmsg, setVmsg] = useState<Msg>(null);
  if (!n || !v) return null;
  const defs = CFd.fieldsOf(v);
  if (!defs.length && !v.votes) return null;
  const by = ws.profile?.name || undefined;
  const t = No.titleOf(No.shownNote(n)) || NOTE_TEXT.untitled;
  const me = Ps.meId(ws);
  const voted = CFd.hasVoted(n, me);
  const voters = CFd.votesOf(n).map((id) => Ps.personById(ws, id)?.name ?? id);
  const set = (def: CardFieldDef, raw: unknown) => {
    const old = n.fields?.[def.id];
    const next = CFd.setFieldValue(ws, noteId, def, raw, { by });
    if (next === ws) {
      if (def.type === 'number' && typeof raw === 'string' && raw.trim()) (setMsg({ text: F.badNumber(def.name) }), say(F.badNumber(def.name)));
      return;
    }
    dispatch({ type: 'fieldValue', view: sheetId, field: def.id, id: noteId, value: raw, by });
    const nv = No.noteById(next, noteId)?.fields?.[def.id];
    const text = nv === undefined ? F.cleared(def.name) : F.set(def.name, CFd.valueText(def, nv, F.yes));
    setMsg({ text, undo: () => dispatch({ type: 'fieldValue', view: sheetId, field: def.id, id: noteId, value: old, by }) });
    say(text);
  };
  const vote = () => {
    dispatch({ type: 'vote', id: noteId, person: me });
    const text = voted ? VT.unvoted(t) : VT.voted(t);
    setVmsg({ text, undo: () => dispatch({ type: 'vote', id: noteId, person: me }) });
    say(text);
  };
  return (
    <div className="cardwin__tags cardwin__fields" role="group" aria-label={F.of(t)}>
      {v.votes && (
        <div className="kvote">
          <p className="cardwin__checkhead">
            <Icon name="vote" size={12} /> <strong>{VT.head}</strong> <span className="lc__muted">{VT.count(voters.length)}</span>
          </p>
          <div className="ktag__row">
            <button type="button" className={`help__run kvote__btn${voted ? ' is-on' : ''}`} aria-pressed={voted} title={voted ? VT.unvoteHint(t) : VT.voteHint(t)} onClick={vote}>
              <Icon name="vote" size={12} className="icon icon--inline" /> {voted ? VT.unvote : VT.vote}
            </button>
            <span className="lc__muted kvote__who">{voters.length ? VT.who(voters.join(', ')) : VT.nobody}</span>
          </div>
          <MsgLine msg={vmsg} onDone={() => setVmsg(null)} />
        </div>
      )}
      {defs.length > 0 && (
        <>
          <p className="cardwin__checkhead">
            <Icon name="fields" size={12} /> <strong>{F.head}</strong>
          </p>
          <div className="kfld__grid">
            {defs.map((d) => (
              <label key={d.id} className="kfld__row" title={F.typeHint[d.type]}>
                <span className="kfld__name">
                  {d.name} <span className="lc__muted">({F.types[d.type]})</span>
                </span>
                <FieldInput def={d} value={n.fields?.[d.id]} title={t} onSet={(raw) => set(d, raw)} />
              </label>
            ))}
          </div>
          <MsgLine msg={msg} onDone={() => setMsg(null)} />
        </>
      )}
    </div>
  );
}

/** Farbwahl einer Wahl (ohne Stufen wie Trello) */
function ColorSelect({ value, label, onChange }: { value?: string; label: string; onChange: (c: string | null) => void }) {
  return (
    <select className="kfld__color" value={value ?? ''} aria-label={label} title={label} onChange={(e) => onChange(e.target.value || null)} style={value ? { background: tagHex(value), color: tagInk(value) } : undefined}>
      <option value="">{F.noColor}</option>
      {COVER_COLORS.map((c) => (
        <option key={c} value={c}>
          {tagColorName(c)}
        </option>
      ))}
    </select>
  );
}

/** Eingabe, die beim Verlassen bzw. Enter übernimmt (Esc setzt zurück) */
function NameInput({ value, label, onCommit, className }: { value: string; label: string; onCommit: (v: string) => void; className?: string }) {
  const [txt, setTxt] = useState(value);
  useEffect(() => setTxt(value), [value]);
  const commit = () => txt.trim() && txt.trim() !== value && onCommit(txt.trim());
  return (
    <input
      className={className ?? 'ktag__rename'}
      value={txt}
      aria-label={label}
      title={label}
      onChange={(e) => setTxt(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.preventDefault(), commit());
        else if (e.key === 'Escape' && txt !== value) (e.preventDefault(), e.stopPropagation(), setTxt(value));
      }}
    />
  );
}

/** „Felder (n)“: eigene Felder des Boards verwalten */
export function FieldPanel(props: { ws: Workspace; dispatch: Dispatch<Action>; sheetId: string; say: (t: string) => void; onClose: () => void }) {
  const { ws, dispatch, sheetId, say } = props;
  const v = No.viewById(ws, sheetId);
  const box = useRef<HTMLElement>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [fresh, setFresh] = useState('');
  const [type, setType] = useState<CardFieldType>('text');
  const [optFresh, setOptFresh] = useState<Record<string, string>>({});
  useEffect(() => {
    box.current?.querySelector<HTMLElement>('input')?.focus();
  }, []);
  if (!v) return null;
  const defs = CFd.fieldsOf(v);
  const full = defs.length >= CFd.FIELD_MAX;
  const tell = (text: string, undo?: () => void) => (setMsg({ text, undo }), say(text));
  const back = (ws0: Workspace) => () => dispatch({ type: 'exchange', ws: ws0 });
  const focusRow = (id: string) => window.setTimeout(() => box.current?.querySelector<HTMLElement>(`[data-field="${id}"] input`)?.focus(), 0);
  const create = () => {
    const nm = fresh.trim();
    if (!nm || full) return;
    const id = `cf-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const before = ws;
    dispatch({ type: 'fieldAdd', view: sheetId, name: nm, fieldType: type, id });
    tell(F.created(nm, F.types[type]), back(before));
    setFresh('');
    if (type === 'list') window.setTimeout(() => box.current?.querySelector<HTMLElement>(`[data-optadd="${id}"]`)?.focus(), 0);
  };
  const addOpt = (d: CardFieldDef) => {
    const nm = (optFresh[d.id] ?? '').trim();
    if (!nm) return;
    if ((d.options?.length ?? 0) >= CFd.OPTION_MAX) return tell(F.optFull(CFd.OPTION_MAX));
    const before = ws;
    dispatch({ type: 'optionAdd', view: sheetId, field: d.id, name: nm });
    tell(F.optAdded(nm), back(before));
    setOptFresh({ ...optFresh, [d.id]: '' });
  };
  const arrows = (name: string, i: number, len: number, onMove: (dir: -1 | 1) => void): ReactNode => (
    <>
      <button type="button" className="note__undo" disabled={i === 0} aria-label={F.up(name)} title={F.up(name)} onClick={() => onMove(-1)}>
        <Icon name="chevronUp" size={11} />
      </button>
      <button type="button" className="note__undo" disabled={i === len - 1} aria-label={F.down(name)} title={F.down(name)} onClick={() => onMove(1)}>
        <Icon name="chevronDown" size={11} />
      </button>
    </>
  );
  return (
    <section className="sheet__move karch ktags kfld" aria-label={F.panelHead(v.name)} ref={box} onKeyDown={(e) => e.key === 'Escape' && !e.defaultPrevented && (e.preventDefault(), e.stopPropagation(), props.onClose())}>
      <header className="karch__head">
        <span className="sheet__move-cap">
          <Icon name="fields" size={12} className="icon icon--inline" /> {F.panelHead(v.name)}
        </span>
        <input value={fresh} placeholder={F.createPh} aria-label={F.create} disabled={full} title={full ? F.full(CFd.FIELD_MAX) : F.create} onChange={(e) => setFresh(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), create())} />
        <select value={type} aria-label={F.typeLabel} title={F.typeHint[type]} onChange={(e) => setType(e.target.value as CardFieldType)}>
          {CFd.FIELD_TYPES.map((x) => (
            <option key={x} value={x}>
              {F.types[x]}
            </option>
          ))}
        </select>
        <button type="button" className="help__run" disabled={!fresh.trim() || full} onClick={create}>
          <Icon name="plus" size={11} className="icon icon--inline" /> {F.add}
        </button>
        <button type="button" className="help__run" onClick={props.onClose}>
          {F.close}
        </button>
      </header>
      <MsgLine msg={msg} onDone={() => setMsg(null)} />
      {!defs.length ? (
        <p className="lc__muted">{F.nonePanel}</p>
      ) : (
        <ul className="karch__list kfld__list">
          {defs.map((d, i) => (
            <li key={d.id} data-field={d.id}>
              <div className="kfld__def">
                <NameInput value={d.name} label={F.nameOf(d.name)} onCommit={(to) => (dispatch({ type: 'fieldEdit', view: sheetId, field: d.id, name: to }), tell(F.renamed(d.name, to)))} />
                <span className="lc__muted" title={F.typeFixed}>
                  {F.types[d.type]}
                </span>
                <label className="ktag__shown" title={F.onCardHint}>
                  <input type="checkbox" checked={!!d.onCard} onChange={(e) => (dispatch({ type: 'fieldEdit', view: sheetId, field: d.id, onCard: e.target.checked }), tell(e.target.checked ? F.onCardOn(d.name) : F.onCardOff(d.name)))} /> {F.onCard}
                </label>
                {arrows(d.name, i, defs.length, (dir) => (dispatch({ type: 'fieldMove', view: sheetId, field: d.id, dir }), tell(F.moved(d.name)), focusRow(d.id)))}
                <button
                  type="button"
                  className="note__undo"
                  aria-label={F.remove(d.name)}
                  title={F.remove(d.name)}
                  onClick={() => {
                    const before = ws;
                    const r = CFd.removeField(ws, sheetId, d.id);
                    dispatch({ type: 'fieldRemove', view: sheetId, field: d.id });
                    tell(F.removed(d.name, r.notes), back(before));
                  }}
                >
                  <Icon name="trash" size={11} />
                </button>
              </div>
              {d.type === 'list' && (
                <div className="kfld__opts">
                  {!(d.options ?? []).length && <p className="lc__muted">{F.optNone}</p>}
                  {(d.options ?? []).map((o, oi, all) => (
                    <div key={o.id} className="kfld__opt" data-opt={o.id}>
                      <OptChip name={o.name} color={o.color} />
                      <NameInput value={o.name} label={F.optNameOf(o.name)} onCommit={(to) => (dispatch({ type: 'optionEdit', view: sheetId, field: d.id, option: o.id, name: to }), tell(F.optRenamed(o.name, to)))} />
                      <ColorSelect value={o.color} label={F.optColor(o.name)} onChange={(c) => (dispatch({ type: 'optionEdit', view: sheetId, field: d.id, option: o.id, color: c }), tell(F.optColored(o.name, c ? tagColorName(c) : F.noColor)))} />
                      {arrows(o.name, oi, all.length, (dir) => (dispatch({ type: 'optionMove', view: sheetId, field: d.id, option: o.id, dir }), tell(F.moved(o.name))))}
                      <button
                        type="button"
                        className="note__undo"
                        aria-label={F.optRemove(o.name)}
                        title={F.optRemove(o.name)}
                        onClick={() => {
                          const before = ws;
                          const r = CFd.removeOption(ws, sheetId, d.id, o.id);
                          dispatch({ type: 'optionRemove', view: sheetId, field: d.id, option: o.id });
                          tell(F.optRemoved(o.name, r.notes), back(before));
                        }}
                      >
                        <Icon name="trash" size={11} />
                      </button>
                    </div>
                  ))}
                  <input
                    data-optadd={d.id}
                    className="ktag__add"
                    value={optFresh[d.id] ?? ''}
                    placeholder={F.optPh}
                    aria-label={F.optAdd(d.name)}
                    onChange={(e) => setOptFresh({ ...optFresh, [d.id]: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOpt(d))}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
