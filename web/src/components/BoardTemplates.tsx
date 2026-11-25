/**
 * V88 (F-206 Schritt 7, BL1–BL3): Board-Vorlagen in der Oberfläche.
 * - TemplatePick: Seite „Neues Kanban-Board“ im Menü („Leer · Vorlage …“) – Menü G und „+ Sheet“.
 * - SaveTemplateBar: „Als Vorlage speichern …“ aus dem ⋮ des Pads, Rückfrage am Ort.
 * - BoardTemplateGroup: Gruppe „Board-Vorlagen“ im Cockpit „Layouts“ unter den Desk-Layouts –
 *   dieselben Werkzeuge an denselben Stellen wie bei Desk-Layouts (NF-08).
 */
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { BoardTemplate, Workspace } from '../workspace/types';
import * as BT from '../workspace/boardTemplates';
import * as No from '../workspace/notes';
import { COL_STATE_NAME } from '../workspace/sheets';
import { BOARD_TPL_TEXT as BTT, DIALOG_TEXT, TERMS } from '../workspace/terms';
import { noticeLater } from '../workspace/flash';
import { newId } from '../workspace/workspace';
import { Item, MenuHead } from './PanelFrame';
import { Icon } from './Icon';
import { COL_STATE_ICON } from './KanbanSheet';

const explain = (t: string) => t.split(' = ').slice(1).join(' = ') || t;
/** „Offen · In Arbeit · Erledigt“ */
export const colLine = (t: Pick<BoardTemplate, 'cols'>) => t.cols.map((c) => c.name).join(' · ');

/** Menü-Seite: Leer oder eine Vorlage wählen. `onPick(undefined)` = leer (Start-Spalten). */
export function TemplatePick({ ws, onPick, onBack }: { ws: Workspace; onPick: (tpl: string | undefined) => void; onBack: () => void }) {
  return (
    <>
      <Item icon="back" onClick={onBack}>{BTT.back}</Item>
      <Item icon="kanban" hint={BTT.emptyHint} onClick={() => onPick(undefined)}>{BTT.empty}</Item>
      <li role="none">
        <ul role="group" aria-label={BTT.fromTemplate} className="menu__group">
          <MenuHead>{BTT.fromTemplate}</MenuHead>
          {BT.templatesOf(ws).map((t) => (
            <Item key={t.id} icon="layouts" hint={`${colLine(t)}${t.review ? ` · ${BTT.reviewOn}` : ''}`} onClick={() => onPick(t.id)}>
              {t.name}
            </Item>
          ))}
        </ul>
      </li>
    </>
  );
}

/** „Als Vorlage speichern …“ – Leiste unter dem Pad-Kopf; Meldung bleibt am Ort. */
export function SaveTemplateBar({ ws, dispatch, sheetId, onClose, say }: { ws: Workspace; dispatch: (a: Action) => void; sheetId: string; onClose: (saved: boolean) => void; say: (t: string) => void }) {
  const v = No.viewById(ws, sheetId);
  const [name, setName] = useState(() => BT.freeTemplateName(ws, v?.name ?? ''));
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  useEffect(() => {
    if (!done) return;
    const t = noticeLater(() => onClose(true));
    return () => window.clearTimeout(t);
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!v) return null;
  if (done)
    return (
      <p className="pad__ask bt__saved" role="status" tabIndex={-1} ref={(el) => el?.focus()}>
        <Icon name="check" size={13} className="icon icon--inline" /> {done}
      </p>
    );
  const save = () => {
    const r = BT.templateFromBoard(ws, sheetId, name);
    if (!r.ok) return setError(r.reason === 'taken' ? BTT.nameTaken : r.reason === 'full' ? BTT.full(BT.TEMPLATE_MAX) : BTT.missing);
    const n = name.trim() || BT.freeTemplateName(ws, v.name);
    dispatch({ type: 'tplFromBoard', view: sheetId, name: n, id: newId() });
    const text = BTT.saved(n);
    say(text);
    setDone(text);
  };
  return (
    <form
      className="pad__ask bt__save"
      aria-label={BTT.saveAs}
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        e.stopPropagation();
        onClose(false);
      }}
    >
      <label className="bt__label">
        {BTT.name}
        <input autoFocus value={name} maxLength={BT.TEMPLATE_NAME_MAX} aria-invalid={!!error} aria-describedby="bt-save-hint" onFocus={(e) => e.target.select()} onChange={(e) => (setName(e.target.value), setError(''))} />
      </label>
      <span id="bt-save-hint" className="bt__hint">{BTT.saveHint(v.cols?.length ?? 0)}</span>
      <button type="button" className="help__run" onClick={() => onClose(false)}>{DIALOG_TEXT.cancel}</button>
      <button type="submit" className="help__run lc__primary">
        <Icon name="layouts" size={13} className="icon icon--inline" /> {BTT.save}
      </button>
      {error && <span className="layouts__error" role="alert">{error}</span>}
    </form>
  );
}

/** Kleines Bild der Spalten (nur Bild; die Spalten stehen als Text daneben). */
function MiniCols({ t }: { t: BoardTemplate }) {
  return (
    <span className="bt__mini" aria-hidden="true">
      {t.cols.map((c, i) => (
        <span key={i} className={`bt__minicol is-${c.state}`} title={c.name}>
          <Icon name={COL_STATE_ICON[c.state]} size={9} />
        </span>
      ))}
    </span>
  );
}

function download(name: string, text: string) {
  const href = URL.createObjectURL(new File([text], name, { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
}

/** Gruppe „Board-Vorlagen“ im Cockpit „Layouts“. `onNewBoard` legt ein Board an und zeigt es. */
export function BoardTemplateGroup({ ws, win, dispatch, say, onNewBoard }: { ws: Workspace; win: string; dispatch: (a: Action) => void; say: (t: string) => void; onNewBoard?: (tpl: string) => void }) {
  const list = BT.templatesOf(ws);
  const [sel, setSel] = useState(list[0].id);
  const shown = list.find((t) => t.id === sel) ?? list[0];
  const own = !BT.isBuiltIn(shown.id);
  const full = BT.ownTemplates(ws).length >= BT.TEMPLATE_MAX;
  const boards = No.viewsOf(ws).filter((v) => v.kind === 'kanban');
  // Vorschlag „aus aktuellem Board“: das sichtbare Kanban des obersten Pads auf diesem Desk
  const current = (() => {
    const pads = (ws.pads ?? []).filter((p) => p.desk === win);
    for (const p of [...pads].reverse()) {
      const v = No.viewById(ws, p.active);
      if (v?.kind === 'kanban') return v.id;
    }
    return boards[0]?.id ?? '';
  })();
  const [adding, setAdding] = useState(false);
  const [from, setFrom] = useState(current);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(false);
  /** F2 auf einer Karte: danach zurück auf die Karte statt auf „Umbenennen“. */
  const fromCard = useRef(false);
  const [draft, setDraft] = useState('');
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [undo, setUndo] = useState<{ text: string; u: BT.TemplateUndo } | null>(null);
  const cards = useRef(new Map<string, HTMLButtonElement>());
  const fileIn = useRef<HTMLInputElement>(null);
  const later = (f: () => void) => window.setTimeout(f, 0);
  const focusCard = (id: string) => later(() => cards.current.get(id)?.focus());
  // Meldungen am Ort, kurz
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

  const onCardKey = (e: KeyboardEvent, i: number) => {
    let j = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = Math.min(list.length - 1, i + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = Math.max(0, i - 1);
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = list.length - 1;
    else if (e.key === 'F2') {
      e.preventDefault();
      return own ? ((fromCard.current = true), setEditing(true), setDraft(shown.name), setError('')) : setError(BTT.builtInFixed);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      return own ? setAsking(true) : setError(BTT.builtInFixed);
    }
    if (j < 0) return;
    e.preventDefault();
    setSel(list[j].id);
    setError('');
    focusCard(list[j].id);
  };

  const create = () => {
    if (full) return setError(BTT.full(BT.TEMPLATE_MAX));
    const n = name.trim();
    const r = BT.templateFromBoard(ws, from, n);
    if (!r.ok) return setError(r.reason === 'taken' ? BTT.nameTaken : r.reason === 'full' ? BTT.full(BT.TEMPLATE_MAX) : BTT.missing);
    const id = newId();
    const nm = n || BT.freeTemplateName(ws, No.viewById(ws, from)?.name ?? '');
    dispatch({ type: 'tplFromBoard', view: from, name: nm, id });
    setAdding(false);
    setName('');
    setSel(id);
    tell(BTT.saved(nm));
    focusCard(id);
  };
  const copy = () => {
    if (full) return setError(BTT.full(BT.TEMPLATE_MAX));
    const id = newId();
    const nm = BT.freeTemplateName(ws, shown.name);
    dispatch({ type: 'tplAdd', tpl: { name: nm, cols: shown.cols, ...(shown.review ? { review: true } : {}) }, id });
    setSel(id);
    tell(BTT.copied(nm));
    focusCard(id);
  };
  const remove = () => {
    const r = BT.deleteTemplate(ws, shown.id);
    setAsking(false);
    if (!r) return;
    dispatch({ type: 'tplDelete', id: shown.id });
    const text = BTT.removed(shown.name);
    say(`${text}. ${BTT.undoHint}`);
    setUndo({ text, u: r.undo });
    const rest = list.filter((t) => t.id !== shown.id);
    setSel(rest[Math.max(0, list.findIndex((t) => t.id === shown.id) - 1)].id);
    later(() => document.getElementById('bt-undo')?.focus());
  };
  const saveFile = () => {
    const fname = BT.templateFileName(shown.name);
    download(fname, JSON.stringify(BT.templateToFile(shown), null, 2));
    tell(BTT.fileSaved(shown.name, fname));
  };
  const loadFile = async (f: File) => {
    const r = BT.readTemplateFile(await f.text());
    if (!r.ok) return setError(BTT.fileError[r.error]);
    if (full) return setError(BTT.full(BT.TEMPLATE_MAX));
    const id = newId();
    const nm = BT.freeTemplateName(ws, r.template.name);
    dispatch({ type: 'tplAdd', tpl: { ...r.template, name: nm }, id });
    setSel(id);
    tell(BTT.loaded(nm));
    focusCard(id);
  };

  const nameLine = (
    <span id="bt-name" className="lc__name">
      {shown.name}
      <span className="lc__muted"> · {own ? BTT.ownBadge : BTT.builtInBadge}</span>
      <span aria-hidden="true">:</span>
    </span>
  );

  return (
    <section className="lc__group bt" aria-labelledby="bt-head">
      <header className="lc__head lc__band">
        <Icon name="kanban" size={15} className="icon icon--inline" />
        <h3 id="bt-head" className="lc__head-title" title={explain(TERMS.boardTemplate)}>
          {BTT.head}
        </h3>
        <span className="lc__head-tools">
          <button type="button" className="help__run" disabled={full} title={full ? BTT.full(BT.TEMPLATE_MAX) : BTT.loadHint} onClick={() => fileIn.current?.click()}>
            <Icon name="import" size={13} className="icon icon--inline" /> {BTT.load}
          </button>
          <input
            ref={fileIn}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void loadFile(f);
            }}
          />
        </span>
      </header>
      <p className="help__text bt__intro">{TERMS.boardTemplate.replace(' = ', ': ')}</p>

      <ul className="lc__cards" aria-label={BTT.head}>
        {list.map((t, i) => {
          const on = t.id === shown.id;
          return (
            <li key={t.id}>
              <button
                type="button"
                ref={(el) => {
                  if (el) cards.current.set(t.id, el);
                  else cards.current.delete(t.id);
                }}
                className={`lc__card${on ? ' is-sel' : ''}`}
                aria-pressed={on}
                aria-label={`${t.name}, ${BT.isBuiltIn(t.id) ? BTT.builtInBadge : BTT.ownBadge}, ${BTT.colsSay(t.cols.length)}: ${t.cols.map((c) => `${c.name} (${COL_STATE_NAME[c.state]}${c.wip ? `, ${BTT.wip(c.wip)}` : ''})`).join(', ')}${t.review ? `, ${BTT.reviewOn}` : ''}`}
                title={`${colLine(t)} – ${BTT.cardKeys}`}
                onClick={() => (setSel(t.id), setError(''), setAsking(false), setEditing(false))}
                onKeyDown={(e) => onCardKey(e, i)}
              >
                <MiniCols t={t} />
                <span className="lc__card-name">{t.name}</span>
                <span className="lc__card-meta">
                  {BT.isBuiltIn(t.id) ? <span>{BTT.builtInBadge}</span> : <b>{BTT.ownBadge}</b>}
                  {BTT.colsSay(t.cols.length)}
                  {t.review && <span>{BTT.reviewShort}</span>}
                </span>
              </button>
            </li>
          );
        })}
        <li>
          <button type="button" id="bt-add" className="lc__card lc__card--add" aria-expanded={adding} disabled={full || !boards.length} title={full ? BTT.full(BT.TEMPLATE_MAX) : !boards.length ? BTT.noBoards : BTT.addHint} onClick={() => (setAdding(!adding), setFrom(current), setError(''))}>
            <Icon name="plus" size={14} className="icon icon--inline" /> {BTT.add}
          </button>
        </li>
      </ul>

      {adding && (
        <form
          className="layouts__new lc__new"
          aria-label={BTT.add}
          title={DIALOG_TEXT.createHint}
          onKeyDown={(e) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            e.stopPropagation();
            setAdding(false);
            later(() => document.getElementById('bt-add')?.focus());
          }}
          onSubmit={(e) => (e.preventDefault(), create())}
        >
          <label className="layouts__label">
            {BTT.fromBoard}
            <select value={from} onChange={(e) => (setFrom(e.target.value), setError(''))}>
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                  {b.id === current ? ` (${BTT.currentBoard})` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="layouts__label">
            {BTT.name}
            <input autoFocus value={name} maxLength={BT.TEMPLATE_NAME_MAX} placeholder={BT.freeTemplateName(ws, No.viewById(ws, from)?.name ?? '')} onChange={(e) => (setName(e.target.value), setError(''))} />
          </label>
          <div className="layouts__tools">
            <button type="button" className="help__run" onClick={() => (setAdding(false), later(() => document.getElementById('bt-add')?.focus()))}>
              {DIALOG_TEXT.cancel}
            </button>
            <button type="submit" className="help__run lc__primary">
              <Icon name="plus" size={13} className="icon icon--inline" /> {BTT.create}
            </button>
          </div>
        </form>
      )}

      {/* Aktionen der gewählten Vorlage direkt unter den Karten – wie bei Desk-Layouts */}
      <div className="lc__actions" role="group" aria-labelledby="bt-name">
        {editing ? (
          <form
            className="help__row lc__rename"
            onSubmit={(e) => {
              e.preventDefault();
              if (BT.templateNameTaken(ws, draft, shown.id)) return setError(BTT.nameTaken);
              if (draft.trim()) dispatch({ type: 'tplRename', id: shown.id, name: draft });
              setEditing(false);
              setError('');
              if (fromCard.current) focusCard(shown.id);
              else later(() => document.getElementById('bt-rename')?.focus());
              fromCard.current = false;
            }}
          >
            <label className="layouts__label">
              <span id="bt-name">{BTT.name}</span>
              <input autoFocus value={draft} maxLength={BT.TEMPLATE_NAME_MAX} aria-invalid={!!error} title={DIALOG_TEXT.renameHint} onChange={(e) => (setDraft(e.target.value), setError(''))} onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); setEditing(false); later(() => document.getElementById('bt-rename')?.focus()); } }} />
            </label>
            <button type="button" className="help__run" onClick={() => (setEditing(false), setError(''), later(() => document.getElementById('bt-rename')?.focus()))}>{DIALOG_TEXT.cancel}</button>
            <button type="submit" className="help__run lc__primary">{DIALOG_TEXT.apply}</button>
          </form>
        ) : asking ? (
          <div className="layouts__ask" role="group" aria-labelledby="bt-ask">
            {nameLine}
            <span id="bt-ask">{BTT.askRemove(shown.name)}</span>
            <button type="button" className="help__run" autoFocus onClick={remove}>
              {BTT.remove}
            </button>
            <button type="button" className="help__run" onClick={() => (setAsking(false), later(() => document.getElementById('bt-del')?.focus()))}>
              {DIALOG_TEXT.cancel}
            </button>
          </div>
        ) : (
          <>
            {nameLine}
            {onNewBoard && (
              <button type="button" className="help__run lc__switch lc__primary" title={BTT.applyHint} onClick={() => onNewBoard(shown.id)}>
                <Icon name="kanban" size={13} className="icon icon--inline" /> {BTT.apply}
              </button>
            )}
            <button type="button" id="bt-rename" className="help__run" aria-disabled={!own} title={own ? undefined : BTT.builtInFixed} onClick={() => (own ? (setEditing(true), setDraft(shown.name), setError('')) : setError(BTT.builtInFixed))}>
              <Icon name="rename" size={13} className="icon icon--inline" /> {BTT.rename}
            </button>
            <button type="button" className="help__run" aria-disabled={full} title={full ? BTT.full(BT.TEMPLATE_MAX) : BTT.copyHint} onClick={copy}>
              <Icon name="copy" size={13} className="icon icon--inline" /> {BTT.copy}
            </button>
            <button type="button" id="bt-del" className="help__run" aria-disabled={!own} title={own ? undefined : BTT.builtInFixed} onClick={() => (own ? setAsking(true) : setError(BTT.builtInFixed))}>
              <Icon name="remove" size={13} className="icon icon--inline" /> {BTT.remove}
            </button>
            <button type="button" className="help__run" onClick={saveFile}>
              <Icon name="download" size={13} className="icon icon--inline" /> {BTT.saveFile}
            </button>
          </>
        )}
      </div>
      <p className="bt__cols help__text">
        {BTT.colsHead}: {shown.cols.map((c, i) => (
          <span key={i} className="bt__col">
            <Icon name={COL_STATE_ICON[c.state]} size={11} className="icon icon--inline" /> {c.name} <span className="lc__muted">({COL_STATE_NAME[c.state]}{c.wip ? `, ${BTT.wip(c.wip)}` : ''})</span>
          </span>
        ))}
        {shown.review && <span className="bt__col">· {BTT.reviewOn}</span>}
      </p>
      {undo && (
        <p className="layouts__undo" role="status">
          {undo.text}{' '}
          <button
            type="button"
            id="bt-undo"
            className="help__run"
            onClick={() => {
              dispatch({ type: 'tplRestore', undo: undo.u });
              setSel(undo.u.tpl.id);
              setUndo(null);
              say(BTT.restored(undo.u.tpl.name));
              focusCard(undo.u.tpl.id);
            }}
          >
            {BTT.undo}
          </button>
        </p>
      )}
      {note && <p className="layouts__undo" role="status">{note}</p>}
      {error && (
        <p className="layouts__error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
