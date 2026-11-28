/**
 * V143 (F-238 Handschrift, S2 „überall“): ein Fenster für alle Wege – Halbkreis „Handschrift“ im Pad, Menü
 * „Notizen & Aufgaben“, Alt/⌥+W, Knopf im Gedankenparkplatz, „Bearbeiten“ an der Notiz und „Unterschreiben“ im
 * Steckbrief. Alle schicken das Ereignis `esource:ink` (inkStore.openInk); App zeigt dieses Fenster.
 *
 * Speichern wie Sprachnotizen (S8): Striche auf dem Gerät (inkStore), Verweis an der Notiz. Ohne Ziel entsteht
 * eine neue Notiz „Handschrift“ im Eingang (K14). Die Meldung steht danach am selben Ort, mit „Rückgängig“.
 */
import { useEffect, useRef, useState } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { NoteAttachment, Workspace } from '../workspace/types';
import * as No from '../workspace/notes';
import * as In from '../workspace/inbox';
import * as K from '../workspace/ink';
import { type InkOpenDetail, getInk, inkChanged, putInk } from '../workspace/inkStore';
import { deviceLabel } from '../workspace/transfer';
import { remindLabel } from '../workspace/remind';
import { INK_TEXT as T, NOTE_TEXT, PAUSE_TEXT, VOICE_TEXT } from '../workspace/terms';
import { newId } from '../workspace/workspace';
import { InkPad } from './InkPad';
import { noticeLater } from '../workspace/flash';

/** Lokale Erkennung (Chromium Handwriting Recognition API) – Feature-Abfrage, sonst null. */
export async function recognize(strokes: K.InkStroke[]): Promise<string | null> {
  const nav = navigator as unknown as K.HwRecognizerNav;
  const Stroke = (window as unknown as { HandwritingStroke?: new () => { addPoint: (p: { x: number; y: number; t: number }) => void } }).HandwritingStroke;
  if (!K.canRecognize(nav) || !Stroke) return null;
  try {
    const rec = await nav.createHandwritingRecognizer!({ languages: ['de'] });
    const d = rec.startDrawing({ recognitionType: 'text' });
    let t = 0;
    for (const s of strokes) {
      if (s.tool === 'eraser') continue;
      const hs = new Stroke();
      for (const [x, y] of s.pts) hs.addPoint({ x, y, t: (t += 8) });
      d.addStroke(hs);
    }
    const best = (await d.getPrediction())[0]?.text?.trim();
    rec.finish();
    return best || null;
  } catch {
    return null;
  }
}

export function InkDialog(props: { ws: Workspace; req: InkOpenDetail | null; dispatch: (a: Action) => void; onClose: () => void; say: (t: string) => void }) {
  const { ws, req, dispatch, say } = props;
  const dlg = useRef<HTMLDialogElement>(null);
  const back = useRef<HTMLElement | null>(null);
  const [strokes, setStrokes] = useState<K.InkStroke[]>([]);
  const [text, setText] = useState('');
  const [size, setSize] = useState(K.INK_SIZE);
  const [msg, setMsg] = useState<{ text: string; undo?: () => void; split?: () => void } | null>(null);
  const timer = useRef(0);
  const wsRef = useRef(ws);
  wsRef.current = ws;
  const by = ws.profile?.name || undefined;
  const sign = req?.sign;
  const existing: NoteAttachment | undefined = req?.note && req.ref ? K.inkOf(No.noteById(ws, req.note) ?? {}).find((a) => a.ref === req.ref) : undefined;
  const signRef = sign?.ref;

  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (!req) return;
    back.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    window.clearTimeout(timer.current);
    setMsg(null);
    setText(existing?.text ?? '');
    const base = sign ? K.SIGN_SIZE : { w: existing?.w ?? K.INK_SIZE.w, h: existing?.h ?? K.INK_SIZE.h };
    setSize(base);
    setStrokes([]);
    const ref = req.ref ?? signRef;
    if (ref) void getInk(ref).then((r) => r && (setStrokes(r.strokes), setSize({ w: r.w, h: r.h })));
    const d = dlg.current;
    if (d && !d.open) d.showModal();
  }, [req]); // eslint-disable-line react-hooks/exhaustive-deps

  const restoreFocus = () => {
    const el = back.current;
    if (el && document.contains(el)) el.focus({ preventScroll: true });
  };
  const close = () => {
    dlg.current?.close();
    props.onClose();
    restoreFocus();
  };
  const show = (m: { text: string; undo?: () => void; split?: () => void }) => {
    setMsg(m);
    say(m.text);
    window.clearTimeout(timer.current);
    timer.current = noticeLater(() => setMsg(null));
  };

  const save = async () => {
    if (!req) return;
    const t = text.trim();
    if (!K.inkCount(strokes) && !t) {
      if (existing && req.note) {
        const n = No.noteById(wsRef.current, req.note);
        if (n) dispatch({ type: 'noteEdit', id: n.id, patch: { attach: K.dropInk(n, existing.ref) }, by });
        close();
        return show({ text: T.removed });
      }
      return say(T.empty);
    }
    const ref = req.ref ?? signRef ?? newId();
    const ok = await putInk({ id: ref, strokes, w: size.w, h: size.h, at: Date.now() });
    if (!ok) return say(T.saveFail);
    inkChanged();
    const a: NoteAttachment = {
      kind: 'ink',
      ref,
      at: existing?.at ?? new Date().toISOString(),
      dev: deviceLabel(navigator.userAgent, navigator.maxTouchPoints > 1),
      w: size.w,
      h: size.h,
      ...(t ? { text: t } : {}),
    };
    close();
    if (sign) {
      const was = signRef;
      sign.save(ref);
      if (req.onDone) return req.onDone(T.signed);
      return show({ text: T.signed, undo: was ? undefined : () => sign.save(null) });
    }
    if (req.note) {
      const n = No.noteById(wsRef.current, req.note);
      if (!n) return;
      const before = n.attach;
      const after = K.addInk(n, a);
      dispatch({ type: 'noteEdit', id: n.id, patch: { attach: after }, by });
      // V144 (F-238, wie Sprachnotiz V77): frisch angehängte Tinte „Als neue Notiz lösen“ – nur, wenn die Notiz seither gleich blieb
      const split = existing
        ? undefined
        : () => {
            const cur = No.noteById(wsRef.current, n.id);
            if (!cur || JSON.stringify(cur.attach ?? []) !== JSON.stringify(after ?? [])) return show({ text: VOICE_TEXT.splitGone });
            dispatch({ type: 'noteEdit', id: n.id, patch: { attach: before }, by });
            const id = newId();
            const title = t ? t.split('\n')[0].slice(0, 80) : `${T.name} ${remindLabel(a.at!)}`;
            const r = K.captureInk({ ...wsRef.current, notes: (wsRef.current.notes ?? []).map((x) => (x.id === n.id ? { ...x, attach: before } : x)) }, a, { id, by, title });
            dispatch({ type: 'inkCapture', note: id, att: a, title, by });
            show({ text: `${VOICE_TEXT.splitDone} – ${T.saved(title, In.inboxCount(r.ws))}` });
          };
      return show({ text: existing ? T.updated : T.attached, undo: () => dispatch({ type: 'noteEdit', id: n.id, patch: { attach: before }, by }), split });
    }
    const id = newId();
    const title = t ? t.split('\n')[0].slice(0, 80) : `${T.name} ${remindLabel(a.at!)}`;
    const r = K.captureInk(wsRef.current, a, { id, by, title });
    dispatch({ type: 'inkCapture', note: id, att: a, title, by });
    const n = No.noteById(r.ws, id);
    show({ text: T.saved((n && No.titleOf(n)) || NOTE_TEXT.untitled, In.inboxCount(r.ws)), undo: () => dispatch({ type: 'inboxDrop', note: id }) });
  };

  const title = sign ? T.dialogSign(sign.label) : existing ? T.edit : T.dialog;
  return (
    <>
      <dialog
        ref={dlg}
        className={`inkdlg${sign ? ' inkdlg--sign' : ''}`}
        aria-label={title}
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
      >
        {req && (
          <>
            <header className="inkdlg__head">
              <h2 className="inkdlg__title">{title}</h2>
              <span className="inkdlg__hint">{T.areaHint}</span>
            </header>
            <InkPad
              strokes={strokes}
              w={size.w}
              h={size.h}
              compact={!!sign}
              text={text}
              onText={setText}
              onChange={setStrokes}
              onConvert={async (s) => {
                if (!K.canRecognize(navigator)) {
                  say(T.noConvert);
                  document.getElementById('ink-text')?.focus();
                  return null;
                }
                const r = await recognize(s);
                if (!r) say(T.convertFail);
                return r;
              }}
              say={say}
            />
            <footer className="inkdlg__foot">
              <button type="button" className="inkdlg__cancel" onClick={close}>
                {T.cancel}
              </button>
              <button type="button" className="inkdlg__save" onClick={() => void save()}>
                {T.done}
              </button>
            </footer>
          </>
        )}
      </dialog>
      {msg && !req && (
        <section className="park" role="status" aria-label={T.name}>
          <p className="sheet__msg park__msg">
            {msg.text}
            {msg.undo && (
              <button
                type="button"
                className="note__undo"
                onClick={() => {
                  msg.undo!();
                  window.clearTimeout(timer.current);
                  setMsg({ text: T.undone });
                  say(T.undone);
                  timer.current = noticeLater(() => setMsg(null));
                }}
              >
                {PAUSE_TEXT.undo}
              </button>
            )}
            {msg.split && (
              <button type="button" className="note__undo" title={T.splitHint} onClick={() => msg.split!()}>
                {VOICE_TEXT.split}
              </button>
            )}
          </p>
        </section>
      )}
    </>
  );
}
