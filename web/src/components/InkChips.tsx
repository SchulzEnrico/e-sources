/**
 * V143 (F-238 Handschrift, S4): Handschrift an der Notiz – Vorschau der Tinte über dem Text, darunter der
 * umgewandelte Text. Rad „Tinte“ zeigen · ausblenden (nur Text). Knöpfe: Bearbeiten (öffnet die Schreibfläche),
 * Entfernen mit „Rückgängig“ am Ort. Liegt die Tinte auf einem anderen Gerät: Vorschau ausgegraut
 * „Handschrift liegt auf ‚…‘“ (wie Ton, T7), der Text steht trotzdem da.
 */
import { useEffect, useRef, useState } from 'react';
import type { NoteAttachment } from '../workspace/types';
import { INK_TEXT as T } from '../workspace/terms';
import { INK_EVENT, getInk, openInk } from '../workspace/inkStore';
import { inkAlt, inkCount, inkSvg } from '../workspace/ink';
import { remindLabel } from '../workspace/remind';
import { noticeLater } from '../workspace/flash';
import { Icon } from './Icon';
import { ModeWheel } from './ModeWheel';

type Seen = { url: string; n: number } | false;

export function InkChips(props: { note: string; inks: NoteAttachment[]; onRemove: (ref: string) => void; onUndo: (a: NoteAttachment, index: number) => void }) {
  const { inks, note } = props;
  const [seen, setSeen] = useState<Record<string, Seen>>({});
  const [show, setShow] = useState<'on' | 'off'>('on');
  const [gone, setGone] = useState<{ a: NoteAttachment; index: number } | null>(null);
  const [say, setSay] = useState('');
  const goneT = useRef(0);
  const key = inks.map((a) => `${a.ref}:${a.text ?? ''}`).join(',');

  useEffect(() => {
    let live = true;
    const load = () =>
      void Promise.all(
        inks.map(async (a) => {
          const r = await getInk(a.ref);
          if (!r) return [a.ref, false] as const;
          const svg = inkSvg(r.strokes, r.w, r.h);
          return [a.ref, { url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, n: inkCount(r.strokes) }] as const;
        }),
      ).then((all) => live && setSeen(Object.fromEntries(all)));
    load();
    window.addEventListener(INK_EVENT, load);
    return () => {
      live = false;
      window.removeEventListener(INK_EVENT, load);
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => window.clearTimeout(goneT.current), []);

  const remove = (a: NoteAttachment) => {
    const index = inks.findIndex((x) => x.ref === a.ref);
    props.onRemove(a.ref);
    window.clearTimeout(goneT.current);
    setGone({ a, index });
    setSay(T.removed);
    goneT.current = noticeLater(() => setGone(null));
  };

  if (!inks.length && !gone) return null;
  const anyText = inks.some((a) => a.text);
  return (
    <div className="inkn" role="group" aria-label={T.group}>
      {anyText && (
        <ModeWheel
          label={T.showInk}
          className="inkn__wheel"
          options={[
            { id: 'on', name: T.showOn, icon: 'pen', hint: T.showHint },
            { id: 'off', name: T.showOff, icon: 'hide', hint: T.showHint },
          ]}
          value={show}
          onChange={(v) => setShow(v as 'on' | 'off')}
        />
      )}
      {inks.map((a) => {
        const s = seen[a.ref];
        const at = a.at ? remindLabel(a.at) : '';
        return (
          <figure key={a.ref} className="inkn__item">
            {show === 'on' &&
              (s === false ? (
                <span className="inkn__away" title={T.elsewhereHint}>
                  <Icon name="pen" size={14} /> {T.elsewhere(a.dev ?? T.missing)}
                </span>
              ) : (
                <button type="button" className="inkn__view" title={T.edit} aria-label={`${T.edit}: ${inkAlt(a, s ? s.n : undefined)}`} onClick={() => openInk({ note, ref: a.ref })}>
                  {s ? <img src={s.url} alt="" className="inkn__img" style={{ aspectRatio: `${a.w ?? 640} / ${a.h ?? 400}` }} /> : <span className="inkn__wait">…</span>}
                </button>
              ))}
            <figcaption className="inkn__cap">
              {a.text ? <span className="inkn__text">{a.text}</span> : <span className="inkn__meta">{T.name}{at ? ` · ${at}` : ''}</span>}
              <span className="inkn__acts">
                <button type="button" className="remind__x" aria-label={T.edit} title={T.edit} onClick={() => openInk({ note, ref: a.ref })}>
                  <Icon name="rename" size={13} />
                </button>
                <button type="button" className="remind__x" aria-label={T.remove} title={T.remove} onClick={() => remove(a)}>
                  <Icon name="trash" size={13} />
                </button>
              </span>
            </figcaption>
          </figure>
        );
      })}
      {gone && (
        <span className="audio__gone" role="status">
          {T.removed}
          <button
            type="button"
            className="audio__undo"
            onClick={() => {
              window.clearTimeout(goneT.current);
              props.onUndo(gone.a, gone.index);
              setGone(null);
              setSay(T.restore);
            }}
          >
            {T.restore}
          </button>
        </span>
      )}
      <span className="sr-only" aria-live="polite">
        {say}
      </span>
    </div>
  );
}

/**
 * V143 (F-238 S6, F-232 P8 ergänzt): Unterschrift im Freigabe-Feld – Knopf „Unterschreiben“ öffnet eine kleine
 * Schreibfläche; danach steht die Tinte statt des Namens in Schreibschrift auf dem Blatt (Name bleibt als Text).
 */
export function InkSign(props: { project: string; field: 'inkAg' | 'inkPl'; label: string; inkRef?: string; name?: string; onRemove: () => void; onDone?: (text: string) => void }) {
  const { inkRef } = props;
  const [url, setUrl] = useState<string | null | false>(null);
  useEffect(() => {
    let live = true;
    const load = () => {
      if (!inkRef) return setUrl(null);
      void getInk(inkRef).then((r) => live && setUrl(r ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(inkSvg(r.strokes, r.w, r.h))}` : false));
    };
    load();
    window.addEventListener(INK_EVENT, load);
    return () => {
      live = false;
      window.removeEventListener(INK_EVENT, load);
    };
  }, [inkRef]);
  const open = () => openInk({ sign: { project: props.project, field: props.field, label: props.label }, onDone: props.onDone });
  if (!inkRef)
    return (
      <button type="button" className="paper__signbtn" title={T.signHint} onClick={open}>
        <Icon name="pen" size={13} /> {T.sign}
      </button>
    );
  return (
    <span className="paper__signink">
      {url === false ? (
        <span className="inkn__away" title={T.elsewhereHint}>
          <Icon name="pen" size={13} /> {T.missing}
        </span>
      ) : (
        <button type="button" className="paper__signview" aria-label={`${T.dialogSign(props.label)}${props.name ? ` (${props.name})` : ''}`} title={T.signHint} onClick={open}>
          {url && <img src={url} alt="" className="paper__signimg" />}
        </button>
      )}
      <button type="button" className="remind__x" aria-label={T.signRemove} title={T.signRemove} onClick={props.onRemove}>
        <Icon name="trash" size={12} />
      </button>
    </span>
  );
}
