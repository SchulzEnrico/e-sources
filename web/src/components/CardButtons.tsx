/**
 * V130 (F-231 K10b, B7): Knöpfe wie Trello Butler.
 * - `ButtonBar`: Leiste am Ort wie „Verschieben nach …“ (V), „Kopieren“ (K), „Spiegeln“ (M) – Taste B auf einer Karte
 *   zeigt die Karten-Knöpfe, Umschalt+B bzw. „Knöpfe“ im Sheet-Kopf die Board-Knöpfe; Ziffer 1–9 drückt. Board-Knöpfe
 *   fragen ab ASK_FROM (10) Karten am Ort nach.
 * - `CardButtons`: Abschnitt „Knöpfe“ im Kartenfenster (wie Trello auf der Karten-Rückseite), Meldung im Abschnitt.
 * Ein Druck samt ausgelöster Regeln ist ein Rückgängig-Schritt (ruleRun.pressButton); die Spur nennt „Knopf · Name“.
 */
import { type Dispatch, type KeyboardEvent, useEffect, useRef, useState } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { Note, Workspace } from '../workspace/types';
import * as No from '../workspace/notes';
import * as RK from '../workspace/ruleKit';
import * as RR from '../workspace/ruleRun';
import { buttonSentence } from '../workspace/ruleText';
import { BTN_TEXT as B, DIALOG_TEXT, KIT_TEXT, NOTE_TEXT } from '../workspace/terms';
import { Icon } from './Icon';
import type { Notice } from './NoteTab';
import { NoticeLine, useNotice } from './SheetViews';

const titleOf = (n: Note) => No.titleOf(No.shownNote(n)) || NOTE_TEXT.untitled;
const token = () => `kp-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Leiste „Knopf für …“: Karten-Knöpfe einer Karte (`noteId`) oder Board-Knöpfe (`cardsFor`). */
export function ButtonBar(props: {
  ws: Workspace;
  dispatch: Dispatch<Action>;
  sheetId: string;
  kind: RK.ButtonKind;
  /** Karten-Knopf: diese Karte. */
  noteId?: string;
  /** Board-Knopf: die Karten, auf die er wirkt (sichtbar, Filter beachtet; Spalte nach Name). */
  cardsFor?: (b: RK.KitButton) => string[];
  say: (t: string) => void;
  notice: (m: Notice) => void;
  onManage: () => void;
  onClose: () => void;
}) {
  const { ws, dispatch, sheetId, kind, say } = props;
  const v = No.viewById(ws, sheetId);
  const n = props.noteId ? No.noteById(ws, props.noteId) : undefined;
  const list = RK.buttonsFor(RK.buttonsOf(ws), sheetId, kind);
  const [ask, setAsk] = useState<{ b: RK.KitButton; ids: string[] } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.querySelector<HTMLElement>('button')?.focus();
    if (!list.length) say(B.barNone);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (ask) box.current?.querySelector<HTMLElement>('.kbtn__yes')?.focus();
  }, [ask]);
  if (!v || (kind === 'card' && !n)) return null;
  const cap = kind === 'card' && n ? B.barCard(titleOf(n)) : B.barBoard(v.name);
  const run = (b: RK.KitButton, ids: string[]) => {
    const now = Date.now();
    // erst rein prüfen, ob der Knopf etwas ändert – sonst am Ort sagen, dass nichts zu tun war
    if (RR.pressButton(ws, b, ids, sheetId, now) === ws) {
      const text = B.nothing(b.name);
      say(text);
      props.notice({ text });
    } else dispatch({ type: 'btnPress', button: b, ids, view: sheetId, now });
    props.onClose();
  };
  const press = (b: RK.KitButton) => {
    const ids = kind === 'card' ? [props.noteId!] : (props.cardsFor?.(b) ?? []);
    if (!ids.length) {
      const text = B.noCards(b.name);
      say(text);
      props.notice({ text });
      return props.onClose();
    }
    if (kind === 'board' && ids.length >= RK.ASK_FROM) {
      setAsk({ b, ids });
      return say(B.ask(b.name, ids.length));
    }
    run(b, ids);
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (ask) return void (setAsk(null), window.setTimeout(() => box.current?.querySelector<HTMLElement>('button')?.focus(), 0));
      return props.onClose();
    }
    if (!ask && /^[1-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const b = list[Number(e.key) - 1];
      if (!b) return;
      e.preventDefault();
      e.stopPropagation();
      return press(b);
    }
    const btns = [...(box.current?.querySelectorAll<HTMLElement>('button') ?? [])];
    const i = btns.indexOf(document.activeElement as HTMLElement);
    let j = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = Math.min(btns.length - 1, i + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = Math.max(0, i - 1);
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = btns.length - 1;
    if (j < 0) return;
    e.preventDefault();
    e.stopPropagation();
    btns[j]?.focus();
  };
  return (
    <div className="sheet__move kbtn__bar" role="group" aria-label={cap} title={B.barHint} ref={box} onKeyDown={key}>
      <span className="sheet__move-cap">
        <Icon name="button" size={12} className="icon icon--inline" /> {cap}
      </span>
      {ask ? (
        <p className="sheet__msg kcol__ask" role="alertdialog" aria-label={B.ask(ask.b.name, ask.ids.length)}>
          {B.ask(ask.b.name, ask.ids.length)}
          <button type="button" className="note__undo kbtn__yes" onClick={() => run(ask.b, ask.ids)}>
            {B.yes}
          </button>
          <button type="button" className="note__undo" onClick={() => setAsk(null)}>
            {B.no}
          </button>
        </p>
      ) : (
        <>
          {list.length ? (
            list.map((b, i) => (
              <button key={b.id} type="button" className="help__run" title={buttonSentence(ws, b)} aria-keyshortcuts={i < 9 ? String(i + 1) : undefined} onClick={() => press(b)}>
                {i < 9 && <span className="kbtn__digit" aria-hidden="true">{i + 1}</span>} {b.name}
              </button>
            ))
          ) : (
            <span className="lc__muted">{B.barNone}</span>
          )}
          <button type="button" className="help__run" title={B.manageHint} onClick={props.onManage}>
            <Icon name="rules" size={12} className="icon icon--inline" /> {B.manage}
          </button>
          <button type="button" className="help__run" onClick={props.onClose}>
            {DIALOG_TEXT.cancel}
          </button>
          <span className="kbtn__keys">{B.barHint}</span>
        </>
      )}
    </div>
  );
}

/** Abschnitt „Knöpfe“ im Kartenfenster: Karten-Knöpfe dieses Boards, Meldung mit „Rückgängig“ im Abschnitt. */
export function CardButtons(props: { ws: Workspace; dispatch: Dispatch<Action>; noteId: string; sheetId: string; say: (t: string) => void; onManage: () => void }) {
  const { ws, dispatch, noteId, sheetId, say } = props;
  const { notice, shown } = useNotice();
  const mine = useRef('');
  // Lauf dieses Abschnitts hier melden (vor dem Board – Kind-Effekte laufen zuerst)
  useEffect(() => {
    const r = RR.runOf(ws);
    if (!r || !r.token || r.token !== mine.current || RR.isClaimed(r)) return;
    RR.claimRun(r);
    const text = [KIT_TEXT.ran(r.names, r.cards, !!r.cut), ...r.texts].join(' ');
    notice({ text, undo: () => dispatch({ type: 'exchange', ws: r.before }) });
    say(text);
  }, [ws]); // eslint-disable-line react-hooks/exhaustive-deps
  const n = No.noteById(ws, noteId);
  const v = No.viewById(ws, sheetId);
  if (!n || !v || v.kind !== 'kanban') return null;
  const list = RK.buttonsFor(RK.buttonsOf(ws), sheetId, 'card');
  const press = (b: RK.KitButton) => {
    const now = Date.now();
    if (RR.pressButton(ws, b, [noteId], sheetId, now) === ws) {
      const text = B.nothing(b.name);
      say(text);
      return notice({ text });
    }
    mine.current = token();
    dispatch({ type: 'btnPress', button: b, ids: [noteId], view: sheetId, now, token: mine.current });
  };
  return (
    <div className="cardwin__tags cardwin__buttons" role="group" aria-label={`${B.head}: ${titleOf(n)}`}>
      <p className="cardwin__checkhead" title={B.term}>
        <Icon name="button" size={12} /> <strong>{B.head}</strong>
      </p>
      <div className="kmir__acts">
        {list.map((b, i) => (
          <button key={b.id} type="button" className="note__undo" title={`${buttonSentence(ws, b)} – ${B.cardHint}`} onClick={() => press(b)}>
            {i < 9 && <span className="kbtn__digit" aria-hidden="true">{i + 1}</span>} {b.name}
          </button>
        ))}
        {!list.length && <span className="lc__muted">{B.barNone}</span>}
        <button type="button" className="note__undo" title={B.manageHint} onClick={props.onManage}>
          <Icon name="rules" size={11} className="icon icon--inline" /> {B.manage}
        </button>
      </div>
      <NoticeLine shown={shown} />
    </div>
  );
}
