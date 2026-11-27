/**
 * V124 (F-231 K6): Titelbild der Karte wie Trello „Cover“.
 *
 * Im Kartenfenster: eine Auswahl (Radiogruppe – Pfeiltasten wechseln, NF-03) aus „Ohne“, den zehn Farben und den
 * Bildern der Karte, dazu „Bild hochladen …“ und das Rad „Größe“ (Klein | Ganzflächig). Jede Änderung meldet sich
 * am Ort mit „Rückgängig“. Auf der Karte: `CoverTop` (klein, über dem Titel) bzw. `CoverBack` (ganzflächig).
 * Bilder liegen nur auf dem Gerät (imageStore); fehlt eines, zeigt die Karte nichts und das Fenster sagt es.
 */
import { type Dispatch, useEffect, useId, useRef, useState } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { NoteCover, Workspace } from '../workspace/types';
import * as No from '../workspace/notes';
import * as Cv from '../workspace/covers';
import { tagColorName } from '../workspace/tags';
import { getPic, putPic, shrinkImage } from '../workspace/imageStore';
import { COVER_TEXT as C, NOTE_TEXT, PAUSE_TEXT } from '../workspace/terms';
import { ModeWheel } from './ModeWheel';
import { Icon } from './Icon';

/** Adressen der Bilder einmal je Sitzung (viele Karten, selbes Bild) – `null` = liegt nicht auf diesem Gerät */
const urls = new Map<string, Promise<string | null>>();
function picUrl(ref: string): Promise<string | null> {
  let p = urls.get(ref);
  if (!p) {
    p = getPic(ref).then((x) => (x ? URL.createObjectURL(x.blob) : null));
    urls.set(ref, p);
    void p.then((u) => !u && urls.delete(ref));
  }
  return p;
}
/** Adresse eines Bildes: `undefined` = lädt noch, `null` = fehlt auf diesem Gerät */
export function usePicUrl(ref: string | undefined): string | null | undefined {
  const [u, setU] = useState<{ ref?: string; url: string | null } | null>(null);
  useEffect(() => {
    if (!ref) return;
    let live = true;
    void picUrl(ref).then((url) => live && setU({ ref, url }));
    return () => {
      live = false;
    };
  }, [ref]);
  if (!ref) return null;
  return u && u.ref === ref ? u.url : undefined;
}

/** Titelbild auf der Karte, klein: Farbstreifen bzw. Bild über dem Titel (dekorativ) */
export function CoverTop({ c }: { c: NoteCover | undefined }) {
  const url = usePicUrl(c && c.size !== 'full' ? c.img : undefined);
  if (!c || c.size === 'full') return null;
  if (c.color) return <span className="kcover kcover--color" style={{ background: Cv.coverPaint(c.color).bg }} aria-hidden="true" />;
  return url ? (
    <span className="kcover kcover--img" aria-hidden="true">
      <img src={url} alt="" draggable={false} />
    </span>
  ) : null;
}

/** Titelbild auf der Karte, ganzflächig: Ebene hinter dem Inhalt (die Karte färbt ihre Schrift per CSS `:has`) */
export function CoverBack({ c }: { c: NoteCover | undefined }) {
  const url = usePicUrl(c?.size === 'full' ? c.img : undefined);
  if (c?.size !== 'full') return null;
  if (c.color) {
    const p = Cv.coverPaint(c.color);
    return <span className={`kcback${p.ink === '#ffffff' ? ' is-dark' : ''}`} style={{ background: p.bg }} aria-hidden="true" />;
  }
  return url ? <span className="kcback kcback--img is-dark" style={{ backgroundImage: `url("${url}")` }} aria-hidden="true" /> : null;
}

function Thumb({ picRef }: { picRef: string }) {
  const url = usePicUrl(picRef);
  return url ? <img src={url} alt="" draggable={false} /> : <Icon name="image" size={14} />;
}

export function CardCover(props: { ws: Workspace; dispatch: Dispatch<Action>; noteId: string; say: (t: string) => void }) {
  const { ws, dispatch, noteId, say } = props;
  const n = No.noteById(ws, noteId);
  const [msg, setMsg] = useState<{ text: string; undo?: () => void } | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const name = useId();
  const cur = n?.cover;
  const curUrl = usePicUrl(cur?.img);
  if (!n) return null;
  const by = ws.profile?.name || undefined;
  const t = No.titleOf(No.shownNote(n)) || NOTE_TEXT.untitled;
  const choices = Cv.coverChoices(n);
  // ein hochgeladenes Bild, das nicht im Text steht, bleibt als Wahl sichtbar
  if (cur?.img && !choices.some((x) => x.ref === cur.img)) choices.push({ ref: cur.img, alt: '' });
  const put = (next: NoteCover | undefined, text: string) => {
    const before = cur;
    dispatch({ type: 'noteCover', id: noteId, cover: next, by });
    setMsg({ text, undo: () => dispatch({ type: 'noteCover', id: noteId, cover: before, by }) });
    say(text);
  };
  const size = cur?.size === 'full' ? { size: 'full' as const } : {};
  const pickColor = (c: string) => put({ color: c, ...size }, C.set(C.colorName(tagColorName(c))));
  const pickImg = (ref: string, label: string) => put({ img: ref, ...size }, C.set(label));
  const upload = async (f: File | undefined) => {
    if (!f) return;
    const s = await shrinkImage(f);
    if (!s) return (setMsg({ text: C.uploadFail }), say(C.uploadFail));
    const id = `cv-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const ok = await putPic({ id, blob: s.blob, mime: s.mime, w: s.w, h: s.h, at: Date.now() });
    if (!ok) return (setMsg({ text: C.uploadFail }), say(C.uploadFail));
    pickImg(id, C.picName);
  };
  const value = cur?.img ? `i:${cur.img}` : cur?.color ? `c:${cur.color}` : 'none';
  return (
    <div className="cardwin__tags cardwin__cover" role="group" aria-label={C.of(t)}>
      <p className="cardwin__checkhead">
        <Icon name="image" size={12} /> <strong>{C.head}</strong>
      </p>
      <div className="kcov__pick" role="radiogroup" aria-label={C.pick}>
        <label className={`kcov__opt kcov__none${value === 'none' ? ' is-on' : ''}`} title={C.noneHint}>
          <input type="radio" name={name} checked={value === 'none'} onChange={() => put(undefined, C.removed)} />
          {C.none}
        </label>
        <span className="kcov__cap" aria-hidden="true">
          {C.colors}
        </span>
        {Cv.COVER_COLORS.map((c) => (
          <label key={c} className={`kcov__opt kcov__sw${value === `c:${c}` ? ' is-on' : ''}`} style={{ background: Cv.coverPaint(c).bg }} title={tagColorName(c)}>
            <input type="radio" name={name} checked={value === `c:${c}`} aria-label={C.colorName(tagColorName(c))} onChange={() => pickColor(c)} />
            {value === `c:${c}` && <Icon name="check" size={11} />}
          </label>
        ))}
        <span className="kcov__cap" aria-hidden="true">
          {C.pics}
        </span>
        {choices.map((p, i) => (
          <label key={p.ref} className={`kcov__opt kcov__img${value === `i:${p.ref}` ? ' is-on' : ''}`} title={C.pic(p.alt, i + 1)}>
            <input type="radio" name={name} checked={value === `i:${p.ref}`} aria-label={C.pic(p.alt, i + 1)} onChange={() => pickImg(p.ref, C.pic(p.alt, i + 1))} />
            <Thumb picRef={p.ref} />
          </label>
        ))}
        <button type="button" className="note__undo kcov__up" title={C.uploadHint} onClick={() => file.current?.click()}>
          <Icon name="plus" size={11} /> {C.upload}
        </button>
        <input ref={file} type="file" accept="image/*" hidden onChange={(e) => (void upload(e.target.files?.[0]), (e.target.value = ''))} />
      </div>
      {!choices.length && <p className="lc__muted kcov__hint">{C.picsNone}</p>}
      {cur?.img && curUrl === null && <p className="lc__muted kcov__hint">{C.missing}</p>}
      {cur && (
        <ModeWheel
          id={`${noteId}-cvsize`}
          className="sheet__wheel kcov__size"
          label={C.sizeLabel}
          options={[
            { id: 'small', name: C.small, icon: 'image', hint: C.smallHint },
            { id: 'full', name: C.full, icon: 'slot', hint: C.fullHint },
          ]}
          value={cur.size === 'full' ? 'full' : 'small'}
          onChange={(s) => {
            const full = s === 'full';
            if (full === (cur.size === 'full')) return;
            put({ ...cur, size: full ? 'full' : undefined }, C.sized(full));
          }}
        />
      )}
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
