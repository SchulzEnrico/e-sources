/**
 * F-231 K10a (V129): Regel-Baukasten wie Trello Butler (B1/B2) – Liste der Regeln „Wenn … und … dann …“ mit Ein/Aus,
 * Satz in Klartext, Bearbeiten im Satz-Editor am Ort, Kopieren, Ordnen, Löschen mit „Rückgängig“ (mitgelieferte W1–W4:
 * „Auf Werk zurück“ statt Löschen). Dasselbe Bauteil steht im Cockpit „Regeln“ (Gruppe Notizen, alle Regeln) und am
 * Board ⋮ › „Automatisierung“ (`board` = gefiltert auf dieses Board und „alle Kanbans“) – gleicher Aufbau (NF-08).
 * Alles mit nativen Bedienelementen, vollständig per Tastatur (NF-03); Esc bricht das Bearbeiten ab.
 *
 * V130 (K10b): Abschnitt „Knöpfe“ darunter – gleiche Liste, gleicher Satz-Editor (ohne Auslöser und Bedingungen,
 * dafür Art „Karten-/Board-Knopf“ und „Wirkt auf“), gleiche Meldungen am Ort (NF-08).
 */
import { type Dispatch, type KeyboardEvent, useId, useRef, useState } from 'react';
import * as No from '../workspace/notes';
import * as Ps from '../workspace/persons';
import * as CFd from '../workspace/cardFields';
import { allTags } from '../workspace/tags';
import * as RK from '../workspace/ruleKit';
import { buttonScope, buttonSentence, scopeText, sentenceOf } from '../workspace/ruleText';
import { BTN_TEXT as BT, KIT_TEXT as T } from '../workspace/terms';
import type { Workspace } from '../workspace/types';
import type { Action } from '../workspace/useWorkspace';
import { Icon } from './Icon';
import { NoticeLine, useNotice } from './SheetViews';

interface Props {
  ws: Workspace;
  dispatch: Dispatch<Action>;
  say: (t: string) => void;
  /** Am Board: nur Regeln dieses Boards und „alle Kanbans“; neue Regeln gelten für dieses Board. */
  board?: string;
}

const newId = () => `rk-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const stop = (e: KeyboardEvent, run: () => void) => {
  if (e.key !== 'Escape') return;
  e.preventDefault();
  e.stopPropagation();
  run();
};

export function RuleKit(p: Props) {
  const { ws, dispatch, say, board } = p;
  const all = RK.kitOf(ws);
  const rules = RK.rulesFor(all, board);
  const own = all.filter((r) => !r.w).length;
  const [edit, setEdit] = useState<RK.KitRule | null>(null);
  const [isNew, setIsNew] = useState(false);
  const { notice, shown } = useNotice();
  const [msgAt, setMsgAt] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const focusLater = (sel: string) => window.setTimeout(() => box.current?.querySelector<HTMLElement>(sel)?.focus(), 0);
  const tell = (at: string, text: string, undo?: () => void) => (setMsgAt(at), notice({ text, ...(undo ? { undo } : {}) }), say(text));
  const back = (before: Workspace) => () => dispatch({ type: 'exchange', ws: before });

  const startNew = () => {
    if (own >= RK.RULES_MAX) return tell('', T.full(RK.RULES_MAX));
    setEdit(RK.newRule(all, newId(), board));
    setIsNew(true);
    focusLater('.rkit__edit input');
  };
  const startEdit = (r: RK.KitRule) => {
    setEdit(structuredClone(r));
    setIsNew(false);
    focusLater('.rkit__edit input');
  };
  const done = (id?: string) => {
    setEdit(null);
    if (id) focusLater(`[data-kit="${id}"] .rkit__editbtn`);
    else focusLater('.rkit__add');
  };
  const save = (r: RK.KitRule) => {
    const before = ws;
    dispatch({ type: 'kitSave', rule: { ...r, name: r.name.trim() } });
    tell(r.id, isNew ? T.created(r.name.trim()) : T.saved(r.name.trim()), back(before));
    done(r.id);
  };

  const row = (r: RK.KitRule, i: number) => {
    const tag = RK.ruleTag(r);
    const tid = `kit-${r.id}`;
    const changed = RK.changedBuiltIn(r);
    if (edit?.id === r.id) return <li key={r.id}>{editor()}</li>;
    return (
      <li key={r.id} className={r.on ? 'rules__row' : 'rules__row is-off'} data-kit={r.id}>
        <div className="rules__line">
          <label className="rules__on">
            <input
              type="checkbox"
              checked={r.on}
              disabled={!r.then.length}
              aria-describedby={tid}
              onChange={() => {
                const before = ws;
                dispatch({ type: 'kitOn', id: r.id, on: !r.on });
                tell(r.id, T.switched(r.name, !r.on), back(before));
              }}
            />
            <strong>{r.name}</strong>
            {!r.on && <span className="rules__off"> · aus</span>}
          </label>
          <span className="rules__no-tag" title={r.w ? T.builtInHint : undefined}>{tag}</span>
          {r.w && <span className="rkit__badge" title={T.builtInHint}>{T.builtIn}{changed ? ` · ${T.changed}` : ''}</span>}
          <span className="rkit__scope" title={T.scopeHint}>{scopeText(ws, r)}</span>
          <span className="grow" />
          <button type="button" className="note__undo rkit__editbtn" onClick={() => startEdit(r)} aria-label={`${T.edit}: ${r.name}`}>
            <Icon name="rename" size={11} className="icon icon--inline" /> {T.edit}
          </button>
          <button
            type="button"
            className="note__undo"
            aria-label={`${T.copy}: ${r.name}`}
            disabled={own >= RK.RULES_MAX}
            onClick={() => {
              const before = ws;
              const id = newId();
              dispatch({ type: 'kitCopy', id: r.id, newId: id });
              tell(id, T.copied(r.name), back(before));
              focusLater(`[data-kit="${id}"] .rkit__editbtn`);
            }}
          >
            <Icon name="copy" size={11} className="icon icon--inline" /> {T.copy}
          </button>
          {!board && (
            <>
              <button type="button" className="note__undo" disabled={i === 0} aria-label={T.up(r.name)} title={T.up(r.name)} onClick={() => (dispatch({ type: 'kitMove', id: r.id, dir: -1 }), say(T.moved(r.name)), focusLater(`[data-kit="${r.id}"] .rkit__editbtn`))}>
                <Icon name="chevronUp" size={11} />
              </button>
              <button type="button" className="note__undo" disabled={i === rules.length - 1} aria-label={T.down(r.name)} title={T.down(r.name)} onClick={() => (dispatch({ type: 'kitMove', id: r.id, dir: 1 }), say(T.moved(r.name)), focusLater(`[data-kit="${r.id}"] .rkit__editbtn`))}>
                <Icon name="chevronDown" size={11} />
              </button>
            </>
          )}
          {r.w ? (
            changed && (
              <button
                type="button"
                className="note__undo"
                onClick={() => {
                  const before = ws;
                  dispatch({ type: 'kitReset', id: r.id });
                  tell(r.id, T.resetDone(r.name), back(before));
                }}
              >
                {T.reset}
              </button>
            )
          ) : (
            <button
              type="button"
              className="note__undo"
              aria-label={`${T.remove}: ${r.name}`}
              onClick={() => {
                const res = RK.removeRule(ws, r.id);
                if (!res) return;
                dispatch({ type: 'kitRemove', id: r.id });
                tell('', T.removed(r.name), () => dispatch({ type: 'kitRestore', undo: res.undo }));
                focusLater('.rkit__add');
              }}
            >
              <Icon name="trash" size={11} className="icon icon--inline" /> {T.remove}
            </button>
          )}
        </div>
        <p id={tid} className="rules__text">
          {sentenceOf(ws, r)}
        </p>
        {msgAt === r.id && <NoticeLine shown={shown} />}
      </li>
    );
  };

  const editor = () => (edit ? <RuleEditor ws={ws} rule={edit} isNew={isNew} onChange={setEdit} onSave={save} onCancel={() => done(isNew ? undefined : edit.id)} /> : null);

  return (
    <div className="rkit" ref={box}>
      <p className="rules__note">{board ? T.introBoard(No.viewById(ws, board)?.name ?? '') : T.intro}</p>
      <dl className="rkit__terms">
        <div><dt>{T.when}</dt><dd>{T.termWhen}</dd></div>
        <div><dt>{T.if}</dt><dd>{T.termIf}</dd></div>
        <div><dt>{T.then}</dt><dd>{T.termThen}</dd></div>
      </dl>
      <div className="rkit__bar">
        <button type="button" className="help__run rkit__add" onClick={startNew} disabled={!!edit} title={own >= RK.RULES_MAX ? T.full(RK.RULES_MAX) : T.addHint}>
          <Icon name="plus" size={11} className="icon icon--inline" /> {T.add}
        </button>
        <span className="rkit__count">{T.count(rules.filter((r) => r.on).length, rules.length)}</span>
      </div>
      {msgAt === '' && <NoticeLine shown={shown} />}
      {isNew && edit && editor()}
      {!rules.length && !edit && <p className="rules__note">{T.none}</p>}
      <ul className="rules__list">{rules.map(row)}</ul>
      <p className="rules__note rkit__chain">{T.termChain}</p>
      <ButtonKit ws={ws} dispatch={dispatch} say={say} board={board} />
    </div>
  );
}

// ---------------------------------------------------------------- K10b Knöpfe

/** Entwurf im Satz-Editor: eine Regel ohne Auslöser, dazu Art und Spalte des Knopfs. */
type Draft = RK.KitRule & { kind?: RK.ButtonKind; col?: string };
const draftOf = (b: RK.KitButton): Draft => ({ id: b.id, no: 0, name: b.name, on: true, ...(b.board ? { board: b.board } : {}), when: { k: 'check' }, ifs: [], then: structuredClone(b.then), kind: b.kind, ...(b.col ? { col: b.col } : {}) });
const buttonOf = (d: Draft): RK.KitButton => ({ id: d.id, name: d.name.trim(), kind: d.kind ?? 'card', ...(d.board ? { board: d.board } : {}), ...(d.kind === 'board' && d.col?.trim() ? { col: d.col.trim() } : {}), then: d.then });

function ButtonKit(p: Props) {
  const { ws, dispatch, say, board } = p;
  const all = RK.buttonsOf(ws);
  const list = RK.buttonsFor(all, board);
  const [edit, setEdit] = useState<Draft | null>(null);
  const [isNew, setIsNew] = useState(false);
  const { notice, shown } = useNotice();
  const [msgAt, setMsgAt] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const focusLater = (sel: string) => window.setTimeout(() => box.current?.querySelector<HTMLElement>(sel)?.focus(), 0);
  const tell = (at: string, text: string, undo?: () => void) => (setMsgAt(at), notice({ text, ...(undo ? { undo } : {}) }), say(text));
  const back = (before: Workspace) => () => dispatch({ type: 'exchange', ws: before });
  const startNew = (kind: RK.ButtonKind) => {
    if (all.length >= RK.BUTTONS_MAX) return tell('', BT.full(RK.BUTTONS_MAX));
    setEdit(draftOf(RK.newButton(newId().replace(/^rk-/, 'kb-'), kind, board)));
    setIsNew(true);
    focusLater('.rkit__edit input');
  };
  const done = (id?: string) => {
    setEdit(null);
    focusLater(id ? `[data-btn="${id}"] .rkit__editbtn` : '.kbtn__add');
  };
  const save = (d: Draft) => {
    const before = ws;
    const b = buttonOf(d);
    dispatch({ type: 'btnSave', button: b });
    tell(b.id, isNew ? BT.created(b.name) : BT.saved(b.name), back(before));
    done(b.id);
  };
  const cardN = list.filter((b) => b.kind === 'card').length;
  const row = (b: RK.KitButton) => {
    if (edit?.id === b.id) return <li key={b.id}>{editor()}</li>;
    const same = list.filter((x) => x.kind === b.kind);
    const i = same.indexOf(b);
    const tid = `kbtn-${b.id}`;
    return (
      <li key={b.id} className="rules__row" data-btn={b.id}>
        <div className="rules__line">
          <Icon name="button" size={12} />
          <strong>{b.name}</strong>
          {i < 9 && b.kind === 'card' && <span className="rules__no-tag" title={BT.barHint}>{i + 1}</span>}
          <span className="rkit__badge" title={BT.kindHint}>{b.kind === 'card' ? BT.kindCard : BT.kindBoard}</span>
          <span className="rkit__scope" title={T.scopeHint}>{buttonScope(ws, b)}</span>
          <span className="grow" />
          <button type="button" className="note__undo rkit__editbtn" onClick={() => (setEdit(draftOf(b)), setIsNew(false), focusLater('.rkit__edit input'))} aria-label={`${T.edit}: ${b.name}`}>
            <Icon name="rename" size={11} className="icon icon--inline" /> {T.edit}
          </button>
          <button
            type="button"
            className="note__undo"
            aria-label={`${T.copy}: ${b.name}`}
            disabled={all.length >= RK.BUTTONS_MAX}
            onClick={() => {
              const before = ws;
              const id = newId().replace(/^rk-/, 'kb-');
              dispatch({ type: 'btnCopy', id: b.id, newId: id });
              tell(id, BT.copied(b.name), back(before));
              focusLater(`[data-btn="${id}"] .rkit__editbtn`);
            }}
          >
            <Icon name="copy" size={11} className="icon icon--inline" /> {T.copy}
          </button>
          <button type="button" className="note__undo" disabled={i === 0} aria-label={T.up(b.name)} title={T.up(b.name)} onClick={() => (dispatch({ type: 'btnMove', id: b.id, dir: -1 }), say(BT.moved(b.name)), focusLater(`[data-btn="${b.id}"] .rkit__editbtn`))}>
            <Icon name="chevronUp" size={11} />
          </button>
          <button type="button" className="note__undo" disabled={i === same.length - 1} aria-label={T.down(b.name)} title={T.down(b.name)} onClick={() => (dispatch({ type: 'btnMove', id: b.id, dir: 1 }), say(BT.moved(b.name)), focusLater(`[data-btn="${b.id}"] .rkit__editbtn`))}>
            <Icon name="chevronDown" size={11} />
          </button>
          <button
            type="button"
            className="note__undo"
            aria-label={`${T.remove}: ${b.name}`}
            onClick={() => {
              const res = RK.removeButton(ws, b.id);
              if (!res) return;
              dispatch({ type: 'btnRemove', id: b.id });
              tell('', BT.removed(b.name), () => dispatch({ type: 'btnRestore', undo: res.undo }));
              focusLater('.kbtn__add');
            }}
          >
            <Icon name="trash" size={11} className="icon icon--inline" /> {T.remove}
          </button>
        </div>
        <p id={tid} className="rules__text">{buttonSentence(ws, b)}</p>
        {msgAt === b.id && <NoticeLine shown={shown} />}
      </li>
    );
  };
  const editor = () => (edit ? <RuleEditor ws={ws} rule={edit} isNew={isNew} button onChange={setEdit} onSave={save} onCancel={() => done(isNew ? undefined : edit.id)} /> : null);
  return (
    <section className="kbtn" ref={box} aria-label={BT.head}>
      <h4 className="kbtn__head">
        <Icon name="button" size={12} className="icon icon--inline" /> {BT.head}
      </h4>
      <p className="rules__note">{BT.intro}</p>
      <dl className="rkit__terms">
        <div><dt>{BT.head}</dt><dd>{BT.term}</dd></div>
      </dl>
      <div className="rkit__bar">
        <button type="button" className="help__run kbtn__add" onClick={() => startNew('card')} disabled={!!edit} title={all.length >= RK.BUTTONS_MAX ? BT.full(RK.BUTTONS_MAX) : BT.addHint}>
          <Icon name="plus" size={11} className="icon icon--inline" /> {BT.kindCard}
        </button>
        <button type="button" className="help__run" onClick={() => startNew('board')} disabled={!!edit} title={all.length >= RK.BUTTONS_MAX ? BT.full(RK.BUTTONS_MAX) : BT.addHint}>
          <Icon name="plus" size={11} className="icon icon--inline" /> {BT.kindBoard}
        </button>
        <span className="rkit__count">{BT.count(cardN, list.length - cardN)}</span>
      </div>
      {msgAt === '' && <NoticeLine shown={shown} />}
      {isNew && edit && editor()}
      {!list.length && !edit && <p className="rules__note">{BT.none}</p>}
      <ul className="rules__list">{list.map(row)}</ul>
    </section>
  );
}

// ---------------------------------------------------------------- Satz-Editor

type AnyPart = RK.Part<string>;

function RuleEditor<D extends Draft>(p: { ws: Workspace; rule: D; isNew: boolean; button?: true; onChange: (r: D) => void; onSave: (r: D) => void; onCancel: () => void }) {
  const { ws, rule: r, onChange } = p;
  const uid = useId();
  const [err, setErr] = useState('');
  const kanbans = No.viewsOf(ws).filter((v) => v.kind === 'kanban');
  const scopeViews = r.board ? kanbans.filter((v) => v.id === r.board) : kanbans;
  const cols = [...new Set(scopeViews.flatMap((v) => (v.cols ?? []).map((c) => c.name)))];
  const fields = [...new Set(scopeViews.flatMap((v) => CFd.fieldsOf(v).map((f) => f.name)))];
  const tags = allTags(ws);
  const persons = Ps.personList(ws).filter((x) => !x.me);
  const set = (patch: Partial<Draft>) => (setErr(''), onChange({ ...r, ...patch }));

  const trySave = () => {
    const m = p.button ? RK.missingButton(r) : RK.missingOf(r);
    if (!m) return p.onSave(r);
    const text = m.where === 'name' ? T.missing.name : m.where === 'when' ? T.missing.when : m.where === 'if' ? T.missing.if((m.i ?? 0) + 1) : m.what === 'none' ? T.missing.thenNone : T.missing.then((m.i ?? 0) + 1);
    setErr(text);
  };

  /** Eingabe einer Lücke; `opt` = darf leer sein (beliebige). */
  const arg = (kind: RK.ArgKind, value: string | undefined, put: (v: string) => void, label: string, opt: boolean, cond = false) => {
    const common = { 'aria-label': label, title: label };
    switch (kind) {
      case 'col':
        return <input {...common} className="rkit__in" list={`${uid}-cols`} value={value ?? ''} placeholder={opt ? T.anyCol : T.colPh} onChange={(e) => put(e.target.value)} />;
      case 'tag':
        return <input {...common} className="rkit__in" list={`${uid}-tags`} value={value ?? ''} placeholder={opt ? T.anyTag : T.tagPh} onChange={(e) => put(e.target.value)} />;
      case 'text':
        return <input {...common} className="rkit__in rkit__in--wide" value={value ?? ''} placeholder={opt ? T.anyText : `${T.textPh} · ${T.placeholders}`} onChange={(e) => put(e.target.value)} />;
      case 'value':
        return <input {...common} className="rkit__in" value={value ?? ''} placeholder={cond ? T.valuePh : T.valueSetPh} onChange={(e) => put(e.target.value)} />;
      case 'board':
        return (
          <select {...common} value={value ?? ''} onChange={(e) => put(e.target.value)}>
            <option value="">{T.pickBoard}</option>
            {kanbans.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        );
      case 'person':
        return (
          <select {...common} value={value ?? ''} onChange={(e) => put(e.target.value)}>
            {opt && <option value="">{T.anyPerson}</option>}
            <option value="me">{T.me}</option>
            {cond && <option value="none">{T.nobody}</option>}
            {persons.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        );
      case 'field':
        return fields.length ? (
          <select {...common} value={value ?? ''} onChange={(e) => put(e.target.value)}>
            <option value="">{T.pickField}</option>
            {fields.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        ) : (
          <input {...common} className="rkit__in" value={value ?? ''} placeholder={T.noFields} onChange={(e) => put(e.target.value)} />
        );
      case 'state':
        return (
          <select {...common} value={value ?? 'open'} onChange={(e) => put(e.target.value)}>
            {RK.STATE_CHOICES.map((x) => <option key={x} value={x}>{T.state[x]}</option>)}
          </select>
        );
      case 'sort':
        return (
          <select {...common} value={value ?? 'due'} onChange={(e) => put(e.target.value)}>
            {RK.SORT_CHOICES.map((x) => <option key={x} value={x}>{T.sort[x]}</option>)}
          </select>
        );
      case 'pos':
        return (
          <select {...common} value={value ?? 'bottom'} onChange={(e) => put(e.target.value)}>
            {RK.POS_CHOICES.map((x) => <option key={x} value={x}>{T.pos[x]}</option>)}
          </select>
        );
      default:
        return null;
    }
  };

  /** Baustein mit Art-Auswahl und Lücken. */
  const part = <K extends string>(x: RK.Part<K>, kinds: readonly K[], specs: Record<K, { a?: RK.ArgKind; b?: RK.ArgKind; n?: 'days'; opt?: true; not?: true }>, labels: Record<string, string>, put: (v: RK.Part<K>) => void, what: string, cond = false) => {
    const s = specs[x.k];
    return (
      <>
        <select aria-label={what} title={what} value={x.k} onChange={(e) => put(RK.blank(e.target.value as K, specs[e.target.value as K]))}>
          {kinds.map((k) => <option key={k} value={k}>{labels[k] ?? k}</option>)}
        </select>
        {s.a && arg(s.a, x.a, (v) => put({ ...x, a: v }), `${what}: ${labels[x.k]}`, !!s.opt, cond)}
        {s.b && arg(s.b, x.b, (v) => put({ ...x, b: v }), `${what}: ${labels[x.k]} – ${s.b === 'pos' ? 'oben oder unten' : 'Wert'}`, false, cond)}
        {s.n && (
          <label className="rkit__days">
            <input type="number" className="rkit__num" value={x.n ?? 0} min={-365} max={3650} aria-label={`${what}: ${T.daysLabel}`} onChange={(e) => put({ ...x, n: Number(e.target.value) || 0 })} /> {T.daysLabel}
          </label>
        )}
        {s.not && (
          <label className="rkit__not" title={T.notHint}>
            <input type="checkbox" checked={!!x.not} onChange={() => put(x.not ? (({ not: _n, ...o }) => o as RK.Part<K>)(x) : { ...x, not: true })} /> {T.not}
          </label>
        )}
      </>
    );
  };

  const putIf = (i: number, c: AnyPart) => set({ ifs: r.ifs.map((x, j) => (j === i ? (c as RK.Cond) : x)) });
  const putThen = (i: number, a: AnyPart) => set({ then: r.then.map((x, j) => (j === i ? (a as RK.Act) : x)) });
  const swap = (i: number, j: number) => {
    const t = [...r.then];
    [t[i], t[j]] = [t[j], t[i]];
    set({ then: t });
  };

  return (
    <div className="rkit__edit" role="group" aria-label={T.editHead(r.name)} onKeyDown={(e) => stop(e, p.onCancel)}>
      <datalist id={`${uid}-cols`}>{cols.map((c) => <option key={c} value={c} />)}</datalist>
      <datalist id={`${uid}-tags`}>{tags.map((c) => <option key={c} value={c} />)}</datalist>
      <div className="rkit__head">
        <strong>{p.button ? BT.editHead(p.isNew ? '' : r.name) : T.editHead(p.isNew ? '' : r.name)}</strong>
        {!p.button && <span className="rules__no-tag">{RK.ruleTag(r)}</span>}
      </div>
      <div className="rkit__line">
        <label className="rkit__lab">
          {T.name}
          <input className="rkit__in rkit__in--wide" value={r.name} maxLength={80} placeholder={p.button ? BT.namePh : T.namePh} onChange={(e) => set({ name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), trySave())} />
        </label>
        <label className="rkit__lab" title={T.scopeHint}>
          {T.scopeLabel}
          <select value={r.board ?? ''} onChange={(e) => set({ board: e.target.value || undefined })}>
            <option value="">{T.scopeAll}</option>
            {kanbans.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </label>
      </div>
      {p.button ? (
        <div className="rkit__line">
          <label className="rkit__lab" title={BT.kindHint}>
            {BT.kindLabel}
            <select value={r.kind ?? 'card'} onChange={(e) => set({ kind: e.target.value as RK.ButtonKind })}>
              <option value="card">{BT.kindCard}</option>
              <option value="board">{BT.kindBoard}</option>
            </select>
          </label>
          {r.kind === 'board' && (
            <label className="rkit__lab" title={BT.colHint}>
              {BT.colLabel}
              <input className="rkit__in" list={`${uid}-cols`} value={r.col ?? ''} placeholder={BT.colAll} onChange={(e) => set({ col: e.target.value })} />
            </label>
          )}
        </div>
      ) : (
        <div className="rkit__line rkit__step">
          <span className="rkit__word" title={T.termWhen}>{T.when}</span>
          {part(r.when, RK.TRIG_KINDS, RK.TRIGS, T.trig, (x) => set({ when: x }), 'Auslöser')}
        </div>
      )}
      {!p.button && r.ifs.map((c, i) => (
        <div key={`if${i}`} className="rkit__line rkit__step">
          <span className="rkit__word" title={T.termIf}>{T.if}</span>
          {part(c, RK.COND_KINDS, RK.CONDS, T.cond, (x) => putIf(i, x), `Bedingung ${i + 1}`, true)}
          <button type="button" className="note__undo" aria-label={T.removePart(`Bedingung ${i + 1}`)} title={T.removePart(`Bedingung ${i + 1}`)} onClick={() => set({ ifs: r.ifs.filter((_, j) => j !== i) })}>
            <Icon name="close" size={11} />
          </button>
        </div>
      ))}
      {!p.button && <div className="rkit__line">
        <button type="button" className="note__undo" disabled={r.ifs.length >= RK.IF_MAX} title={r.ifs.length >= RK.IF_MAX ? T.ifFull(RK.IF_MAX) : T.termIf} onClick={() => set({ ifs: [...r.ifs, RK.blank('hasTag', RK.CONDS.hasTag) as RK.Cond] })}>
          <Icon name="plus" size={11} className="icon icon--inline" /> {T.addIf}
        </button>
      </div>}
      {r.then.map((a, i) => (
        <div key={`then${i}`} className="rkit__line rkit__step">
          <span className="rkit__word" title={T.termThen}>{i === 0 ? (p.button ? `${i + 1}.` : T.then) : p.button ? `${i + 1}.` : '·'}</span>
          {part(a, RK.ACT_KINDS, RK.ACTS, T.act, (x) => putThen(i, x), `Aktion ${i + 1}`)}
          <button type="button" className="note__undo" disabled={i === 0} aria-label={`${T.partUp} (${i + 1})`} title={T.partUp} onClick={() => swap(i, i - 1)}>
            <Icon name="chevronUp" size={11} />
          </button>
          <button type="button" className="note__undo" disabled={i === r.then.length - 1} aria-label={`${T.partDown} (${i + 1})`} title={T.partDown} onClick={() => swap(i, i + 1)}>
            <Icon name="chevronDown" size={11} />
          </button>
          <button type="button" className="note__undo" aria-label={T.removePart(`Aktion ${i + 1}`)} title={T.removePart(`Aktion ${i + 1}`)} onClick={() => set({ then: r.then.filter((_, j) => j !== i) })}>
            <Icon name="close" size={11} />
          </button>
        </div>
      ))}
      <div className="rkit__line">
        <button type="button" className="note__undo" disabled={r.then.length >= RK.THEN_MAX} title={r.then.length >= RK.THEN_MAX ? T.thenFull(RK.THEN_MAX) : T.termThen} onClick={() => set({ then: [...r.then, RK.blank('tagAdd', RK.ACTS.tagAdd) as RK.Act] })}>
          <Icon name="plus" size={11} className="icon icon--inline" /> {T.addThen}
        </button>
      </div>
      <p className="rkit__preview" aria-live="polite">
        <span className="rkit__cap">{p.button ? BT.preview : T.preview}:</span> {p.button ? buttonSentence(ws, { kind: r.kind ?? 'card', col: r.col, then: r.then }) : sentenceOf(ws, r)}
      </p>
      {err && <p className="sheet__msg" role="alert">{err}</p>}
      <div className="rkit__line">
        <button type="button" className="help__run" onClick={trySave}>
          {T.save}
        </button>
        <button type="button" className="help__run" onClick={p.onCancel}>
          {T.cancel}
        </button>
        <span className="rkit__keys">{T.editKeys}</span>
      </div>
    </div>
  );
}
