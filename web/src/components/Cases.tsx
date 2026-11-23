/**
 * F-116 mit F-53 Stufe 1 (V54): Oberfläche für Spaces und Cases.
 * - CasesDialog: Spaces und Cases anlegen, umbenennen, einfärben, verschieben, löschen (Rückfrage + Rückgängig).
 * - LayoutCases: im Layout-Modus des Cockpits ein Layout Cases zuordnen (Haken, nach Space gruppiert).
 * - CasePicker: Case wählen – ein Layout = gleich gewechselt, mehrere = Angebot.
 * Alles mit nativen Bedienelementen, vollständig per Tastatur (NF-03); Begriffe stehen sichtbar dabei.
 */
import { type FormEvent, type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import * as Cs from '../workspace/cases';
import type { DeskLayout } from '../workspace/deskLayouts';
import { newId } from '../workspace/workspace';
import { CASE_TEXT as CT, DIALOG_TEXT } from '../workspace/terms';
import type { Workspace } from '../workspace/types';
import type { Action } from '../workspace/useWorkspace';
import { DialogFoot } from './DialogFoot';
import { Icon } from './Icon';

const colorName = (c?: string) => {
  const i = c ? Cs.CASE_COLORS.indexOf(c as (typeof Cs.CASE_COLORS)[number]) : -1;
  return i >= 0 ? CT.colorNames[i] : CT.noColor;
};

/** Farbpunkt – nur Bild, die Farbe steht als Text daneben bzw. im Namen des Felds. */
export const Dot = ({ color }: { color?: string }) => <span className="cases__dot" style={color ? { background: color } : undefined} aria-hidden="true" />;

/** Esc nur hier verbrauchen (sonst schließt der Dialog bzw. das Cockpit). */
const escape = (e: KeyboardEvent, run: () => void) => {
  if (e.key !== 'Escape') return;
  e.preventDefault();
  e.stopPropagation();
  run();
};

function ColorSelect({ value, label, onPick }: { value?: string; label: string; onPick: (c: string | null) => void }) {
  return (
    <label className="cases__color" title={label}>
      <Dot color={value} />
      <span className="sr-only">{label}</span>
      <select value={value ?? ''} aria-label={label} onChange={(e) => onPick(e.target.value || null)}>
        <option value="">{CT.noColor}</option>
        {Cs.CASE_COLORS.map((c, i) => (
          <option key={c} value={c}>
            {CT.colorNames[i]}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Name mit „Umbenennen“ – Bearbeiten als kleines Formular mit sichtbarem Abschluss (F-191). */
function NameRow(p: { id: string; name: string; color?: string; heading?: boolean; onRename: (name: string) => void; children?: ReactNode }) {
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState(p.name);
  const btn = useRef<HTMLButtonElement>(null);
  const close = () => {
    setEdit(false);
    window.setTimeout(() => btn.current?.focus(), 0);
  };
  if (edit) {
    return (
      <form
        className="cases__edit"
        onKeyDown={(e) => escape(e, close)}
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim() && draft.trim() !== p.name) p.onRename(draft);
          close();
        }}
      >
        <input autoFocus value={draft} maxLength={60} aria-label={CT.renameOf(p.name)} title={DIALOG_TEXT.renameHint} onChange={(e) => setDraft(e.target.value)} />
        <button type="submit" className="help__run">
          {DIALOG_TEXT.apply}
        </button>
        <button type="button" className="help__run" onClick={close}>
          {DIALOG_TEXT.cancel}
        </button>
      </form>
    );
  }
  const Tag = p.heading ? 'h3' : 'span';
  return (
    <div className="cases__row" data-id={p.id}>
      <Tag className="cases__name">
        <Dot color={p.color} /> {p.name}
      </Tag>
      <span className="cases__tools">
        <button
          type="button"
          ref={btn}
          className="help__run"
          aria-label={CT.renameOf(p.name)}
          title={CT.renameOf(p.name)}
          onClick={() => {
            setDraft(p.name);
            setEdit(true);
          }}
        >
          <Icon name="rename" size={13} className="icon icon--inline" />
        </button>
        {p.children}
      </span>
    </div>
  );
}

/** Kleines Formular „Neuer Space“/„Neuer Case“ mit Anlegen-Knopf. */
function AddForm(p: { label: string; hint: string; disabled?: string; onAdd: (name: string) => void }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (p.disabled) return setError(p.disabled);
    if (!name.trim()) return setError(CT.needName);
    p.onAdd(name);
    setName('');
    setError('');
  };
  return (
    <form className="cases__add" onSubmit={submit} title={DIALOG_TEXT.createHint}>
      <label>
        <span className="sr-only">{p.label}</span>
        <input value={name} maxLength={60} placeholder={`${p.label} – ${p.hint}`} aria-label={p.label} aria-invalid={!!error} onChange={(e) => { setName(e.target.value); setError(''); }} />
      </label>
      <button type="submit" className="help__run">
        <Icon name="plus" size={13} className="icon icon--inline" /> {DIALOG_TEXT.create}
      </button>
      {error && (
        <span className="layouts__error" role="alert">
          {error}
        </span>
      )}
    </form>
  );
}

/** Löschen mit Rückfrage an Ort und Stelle (Fokus auf „Löschen“, Esc bricht ab). */
function RemoveButton({ name, ask, onRemove }: { name: string; ask: string; onRemove: () => void }) {
  const [asking, setAsking] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const cancel = () => {
    setAsking(false);
    window.setTimeout(() => btn.current?.focus(), 0);
  };
  if (asking) {
    return (
      <span className="layouts__ask cases__ask" role="group" aria-label={ask} onKeyDown={(e) => escape(e, cancel)}>
        <span>{ask}</span>
        <button type="button" className="help__run" autoFocus onClick={onRemove}>
          {CT.remove}
        </button>
        <button type="button" className="help__run" onClick={cancel}>
          {DIALOG_TEXT.cancel}
        </button>
      </span>
    );
  }
  return (
    <button type="button" ref={btn} className="help__run" aria-label={CT.removeOf(name)} title={CT.removeOf(name)} onClick={() => setAsking(true)}>
      <Icon name="remove" size={13} className="icon icon--inline" />
    </button>
  );
}

export function CasesDialog({ ws, dispatch, say, onClose }: { ws: Workspace; dispatch: (a: Action) => void; say: (text: string) => void; onClose: () => void }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const [start] = useState(() => Cs.snapCases(ws));
  const [undo, setUndo] = useState<{ snap: Cs.CasesSnap; name: string } | null>(null);
  const [back] = useState(() => document.activeElement as HTMLElement | null);
  const spaces = Cs.spacesOf(ws);
  const cases = Cs.casesOf(ws);
  const changed = JSON.stringify(start) !== JSON.stringify(Cs.snapCases(ws));
  const focusLater = (sel: string) => window.setTimeout(() => dlg.current?.querySelector<HTMLElement>(sel)?.focus(), 0);

  useEffect(() => {
    const el = dlg.current;
    if (!el) return;
    if (!el.open) el.showModal();
    el.querySelector<HTMLElement>('.cases__body input, .cases__body button')?.focus();
    return () => {
      window.setTimeout(() => back?.isConnected && back.focus(), 0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addSpace = (name: string) => {
    const id = newId();
    dispatch({ type: 'spaceAdd', id, name, color: Cs.nextColor(spaces.map((s) => s.color)) });
    say(CT.added('Space', name.trim()));
    focusLater(`[data-space="${CSS.escape(id)}"] .cases__add input`);
  };
  const addCase = (space: string, name: string) => {
    const sp = spaces.find((s) => s.id === space);
    dispatch({ type: 'caseAdd', id: newId(), space, name, color: sp?.color ?? Cs.nextColor(cases.map((c) => c.color)) });
    say(CT.added('Case', name.trim()));
  };
  const removed = (name: string, run: Action) => {
    setUndo({ snap: Cs.snapCases(ws), name });
    dispatch(run);
    say(CT.removed(name));
    focusLater('.cases__undo button');
  };

  return (
    <dialog
      ref={dlg}
      className="help layouts cases"
      aria-labelledby="cases-title"
      aria-describedby="cases-intro"
      onClose={onClose}
      onKeyDown={(e) => e.key === 'Escape' && e.stopPropagation()}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === dlg.current && onClose()}
    >
      <header className="help__head">
        <h2 id="cases-title">
          <Icon name="layouts" size={16} className="icon icon--inline" /> {CT.title}
        </h2>
        <button type="button" className="help__x" onClick={onClose} title="Schließen (Esc)" aria-label={`${CT.title} schließen`}>
          <Icon name="close" size={14} />
        </button>
      </header>
      <div className="help__intro" id="cases-intro">
        <p>{CT.intro}</p>
        <p className="help__text">
          <b>{CT.spaceTerm}</b> <b>{CT.caseTerm}</b>
        </p>
      </div>
      <div className="help__body cases__body">
        {undo && (
          <p className="layouts__undo cases__undo" role="status">
            {CT.removed(undo.name)}{' '}
            <button
              type="button"
              className="help__run"
              onClick={() => {
                dispatch({ type: 'casesRestore', snap: undo.snap });
                say(CT.undone(undo.name));
                setUndo(null);
              }}
            >
              {CT.undo}
            </button>
          </p>
        )}
        {spaces.length === 0 && <p className="help__text">{CT.empty}</p>}
        {spaces.map((s) => {
          const mine = Cs.casesIn(ws, s.id);
          return (
            <section key={s.id} className="cases__space" data-space={s.id} aria-label={`Space ${s.name}`}>
              <NameRow id={s.id} name={s.name} color={s.color} heading onRename={(name) => { dispatch({ type: 'spaceEdit', id: s.id, name }); say(CT.renamed(name.trim())); }}>
                <ColorSelect value={s.color} label={CT.colorOf(s.name)} onPick={(c) => { dispatch({ type: 'spaceEdit', id: s.id, color: c }); say(CT.recolored(s.name, colorName(c ?? undefined))); }} />
                <RemoveButton name={s.name} ask={CT.askSpace(s.name, mine.length)} onRemove={() => removed(s.name, { type: 'spaceDelete', id: s.id })} />
              </NameRow>
              {mine.length === 0 ? (
                <p className="help__text cases__none">{CT.noCases}</p>
              ) : (
                <ul className="cases__list" aria-label={`Cases in ${s.name}`}>
                  {mine.map((c) => (
                    <li key={c.id}>
                      <NameRow id={c.id} name={c.name} color={c.color} onRename={(name) => { dispatch({ type: 'caseEdit', id: c.id, name }); say(CT.renamed(name.trim())); }}>
                        <ColorSelect value={c.color} label={CT.colorOf(c.name)} onPick={(col) => { dispatch({ type: 'caseEdit', id: c.id, color: col }); say(CT.recolored(c.name, colorName(col ?? undefined))); }} />
                        {spaces.length > 1 && (
                          <label className="cases__move" title={CT.moveOf(c.name)}>
                            <span className="sr-only">{CT.moveOf(c.name)}</span>
                            <select
                              value={c.space}
                              aria-label={CT.moveOf(c.name)}
                              onChange={(e) => {
                                const to = spaces.find((x) => x.id === e.target.value);
                                if (!to) return;
                                dispatch({ type: 'caseEdit', id: c.id, space: to.id });
                                say(CT.moved(c.name, to.name));
                              }}
                            >
                              {spaces.map((x) => (
                                <option key={x.id} value={x.id}>
                                  {x.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                        <RemoveButton name={c.name} ask={CT.askCase(c.name)} onRemove={() => removed(c.name, { type: 'caseDelete', id: c.id })} />
                      </NameRow>
                    </li>
                  ))}
                </ul>
              )}
              <AddForm label={CT.newCaseIn(s.name)} hint={CT.newCaseHint} disabled={cases.length >= Cs.CASE_MAX ? CT.fullCases(Cs.CASE_MAX) : undefined} onAdd={(name) => addCase(s.id, name)} />
            </section>
          );
        })}
        <section className="cases__space cases__space--new" aria-label={CT.newSpace}>
          <AddForm label={CT.newSpace} hint={CT.newSpaceHint} disabled={spaces.length >= Cs.SPACE_MAX ? CT.fullSpaces(Cs.SPACE_MAX) : undefined} onAdd={addSpace} />
        </section>
      </div>
      <DialogFoot
        changed={changed}
        onReset={() => {
          dispatch({ type: 'casesRestore', snap: start });
          setUndo(null);
          say(DIALOG_TEXT.resetDone);
        }}
        onDone={onClose}
      />
    </dialog>
  );
}

/** Layout-Modus: Cases dieses Layouts als Chips, Zuordnen per Haken (nach Space gruppiert). */
export function LayoutCases({ ws, win, layout, dispatch, say, onManage }: { ws: Workspace; win: string; layout: DeskLayout; dispatch: (a: Action) => void; say: (text: string) => void; onManage: () => void }) {
  const [open, setOpen] = useState(false);
  const mine = Cs.casesOfLayout(ws, win, layout.id);
  const spaces = Cs.spacesOf(ws);
  return (
    <div className="lc__cases">
      <h4 className="lc__sub" title={CT.caseTerm}>
        {CT.layoutHead}
      </h4>
      {mine.length ? (
        <ul className="cases__chips" aria-label={CT.layoutHead}>
          {mine.map((c) => (
            <li key={c.id} className="cases__chip">
              <Dot color={c.color} /> {c.name}
            </li>
          ))}
        </ul>
      ) : (
        <p className="help__text">{CT.layoutNone}</p>
      )}
      <div className="layouts__tools">
        {spaces.length > 0 && Cs.casesOf(ws).length > 0 && (
          <button type="button" className="help__run" aria-expanded={open} title={CT.assignTitle} onClick={() => setOpen(!open)}>
            <Icon name="layouts" size={13} className="icon icon--inline" /> {CT.assign}
          </button>
        )}
        <button type="button" className="help__run" title={CT.manageTitle} onClick={onManage}>
          <Icon name="rename" size={13} className="icon icon--inline" /> {CT.manage}
        </button>
      </div>
      {open && (
        <div className="cases__assign" role="group" aria-label={CT.assignLegend(layout.name)} onKeyDown={(e) => escape(e, () => setOpen(false))}>
          {spaces.map((s) => {
            const list = Cs.casesIn(ws, s.id);
            if (!list.length) return null;
            return (
              <fieldset key={s.id}>
                <legend>
                  <Dot color={s.color} /> {s.name}
                </legend>
                {list.map((c) => {
                  const on = mine.some((m) => m.id === c.id);
                  return (
                    <label key={c.id}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => {
                          dispatch({ type: 'layoutCase', win, layout: layout.id, caseId: c.id, on: !on });
                          say(CT.assigned(c.name, layout.name, !on));
                        }}
                      />{' '}
                      <Dot color={c.color} /> {c.name}
                    </label>
                  );
                })}
              </fieldset>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Case wählen; App wechselt bei genau einem Layout und gibt das Ergebnis zurück. */
export function CasePicker({ ws, win, onPick, onSwitch, say }: { ws: Workspace; win: string; onPick: (caseId: string | null) => ReturnType<typeof Cs.pickCase>; onSwitch: (layout: string) => void; say: (text: string) => void }) {
  const active = Cs.activeCaseOf(ws, win);
  const spaces = Cs.spacesOf(ws);
  const [offer, setOffer] = useState<DeskLayout[]>([]);
  if (!Cs.casesOf(ws).length) return null;
  return (
    <div className="lc__case" role="group" aria-label={CT.pick}>
      <label title={CT.pickTitle}>
        <Dot color={active?.color} /> {CT.pick}
        <select
          value={active?.id ?? ''}
          onChange={(e) => {
            const id = e.target.value || null;
            const c = Cs.casesOf(ws).find((x) => x.id === id);
            const res = onPick(id);
            setOffer(res.offer.length > 1 ? res.offer : []);
            if (!c) return say(CT.pickedOff);
            if (res.switched) return say(CT.switched(c.name, res.switched.name));
            say(res.offer.length > 1 ? CT.offer(c.name, res.offer.length) : CT.noLayouts(c.name));
          }}
        >
          <option value="">{CT.pickNone}</option>
          {spaces.map((s) => {
            const list = Cs.casesIn(ws, s.id);
            return list.length ? (
              <optgroup key={s.id} label={s.name}>
                {list.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            ) : null;
          })}
        </select>
      </label>
      {active && offer.length > 1 && (
        <span className="lc__offer" role="group" aria-label={CT.offer(active.name, offer.length)}>
          <span>{CT.offer(active.name, offer.length)}</span>
          {offer.map((l) => (
            <button
              key={l.id}
              type="button"
              className="help__run"
              onClick={() => {
                onSwitch(l.id);
                setOffer([]);
              }}
            >
              {CT.switchTo(l.name)}
            </button>
          ))}
        </span>
      )}
    </div>
  );
}
