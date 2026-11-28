/**
 * V154 (F-232 P12): Medien in mehrzeiligen Feldern der Blätter – Knopf „Medien“, Ziehen und Einfügen ins Feld,
 * Vorschau darunter (Bild, PDF als Vorschau, Ton/Video als Abspieler), Entfernen mit „Rückgängig“ am Ort.
 * Logo in der Kopfzeile (`PaperLogo`). Die Dateien liegen im Gerätespeicher wie die Notizbilder (imageStore).
 */
import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent } from 'react';
import { PIC_EVENT, getPic, putPic, shrinkImage } from '../workspace/imageStore';
import * as Fm from '../workspace/fieldMedia';
import type { FieldMedia } from '../workspace/fieldMedia';
import { newId } from '../workspace/workspace';
import { noticeLater } from '../workspace/flash';
import { MEDIA_TEXT as T } from '../workspace/terms';
import type { Action } from '../workspace/useWorkspace';
import type { Project } from '../workspace/types';
import { Icon } from './Icon';

/** Dateien prüfen und im Gerätespeicher ablegen; gibt die neuen Verweise und Gründe für Abgelehntes */
export async function storeMedia(files: File[], room = Fm.MEDIA_PER_FIELD): Promise<{ added: FieldMedia[]; msgs: string[] }> {
  const added: FieldMedia[] = [];
  const msgs: string[] = [];
  for (const f of files) {
    const why = Fm.mediaRefusal(f.type, f.name, f.size);
    if (why) {
      msgs.push(why === 'kind' ? T.refusedKind(f.name) : T.refusedSize(f.name));
      continue;
    }
    if (added.length >= room) {
      msgs.push(T.full(Fm.MEDIA_PER_FIELD));
      break;
    }
    const kind = Fm.mediaKindOf(f.type, f.name);
    const id = newId();
    const name = f.name || T.kind[kind];
    let ok = false;
    if (kind === 'img' && f.type !== 'image/svg+xml' && f.type !== 'image/gif') {
      const sm = await shrinkImage(f);
      if (sm) ok = await putPic({ id, blob: sm.blob, mime: sm.mime, w: sm.w, h: sm.h, at: Date.now() });
    } else ok = await putPic({ id, blob: f, mime: f.type || 'application/octet-stream', w: 0, h: 0, at: Date.now() });
    if (ok) added.push({ ref: kind === 'img' ? 'img' : 'file', id, name });
    else msgs.push(T.failed);
  }
  if (added.length) window.dispatchEvent(new Event(PIC_EVENT));
  return { added, msgs };
}

const filesOf = (dt: DataTransfer | null): File[] => (dt ? [...dt.files] : []);

/** Ziehen und Einfügen von Dateien ins Eingabefeld (Text bleibt normal) */
export function mediaDrop(onFiles: (f: File[]) => void) {
  return {
    onDragOver: (e: DragEvent) => {
      if ([...e.dataTransfer.types].includes('Files')) e.preventDefault();
    },
    onDrop: (e: DragEvent) => {
      const f = filesOf(e.dataTransfer);
      if (!f.length) return;
      e.preventDefault();
      onFiles(f);
    },
    onPaste: (e: ClipboardEvent) => {
      const f = filesOf(e.clipboardData);
      if (!f.length) return;
      e.preventDefault();
      onFiles(f);
    },
  };
}

/** Datei aus dem Gerätespeicher als Objekt-URL (mit Art) */
function useMediaUrl(id: string): { url: string | null | undefined; mime: string } {
  const [st, setSt] = useState<{ url: string | null | undefined; mime: string }>({ url: undefined, mime: '' });
  useEffect(() => {
    let live = true;
    let u: string | null = null;
    const load = () =>
      void getPic(id).then((p) => {
        if (!live) return;
        if (u) URL.revokeObjectURL(u);
        u = p ? URL.createObjectURL(p.blob) : null;
        setSt({ url: u, mime: p?.mime ?? '' });
      });
    load();
    window.addEventListener(PIC_EVENT, load);
    return () => {
      live = false;
      window.removeEventListener(PIC_EVENT, load);
      if (u) URL.revokeObjectURL(u);
    };
  }, [id]);
  return st;
}

function MediaItem({ m, onRemove }: { m: FieldMedia; onRemove: () => void }) {
  const { url, mime } = useMediaUrl(m.id);
  const kind = m.ref === 'img' ? 'img' : Fm.mediaKindOf(mime, m.name);
  let body;
  if (url === undefined) body = <span className="fmedia__wait">…</span>;
  else if (url === null) body = <span className="fmedia__missing">{T.missing(m.name)}</span>;
  else if (kind === 'img')
    body = (
      <a href={url} target="_blank" rel="noreferrer" title={T.open(m.name)}>
        <img src={url} alt={m.name} />
      </a>
    );
  else if (kind === 'pdf')
    body = (
      <object data={url} type="application/pdf" aria-label={m.name} className="fmedia__pdf">
        <a href={url} target="_blank" rel="noreferrer">{T.pdfFallback}</a>
      </object>
    );
  else if (kind === 'audio') body = <audio controls src={url} aria-label={m.name} preload="metadata" />;
  else if (kind === 'video') body = <video controls src={url} aria-label={m.name} preload="metadata" className="fmedia__video" />;
  else
    body = (
      <a href={url} target="_blank" rel="noreferrer">
        {m.name}
      </a>
    );
  return (
    <li className={`fmedia__item fmedia__item--${kind}`}>
      {body}
      <span className="fmedia__name">
        <span className="fmedia__kind">{T.kind[kind]}</span> {m.name}
        <button type="button" className="fmedia__x" onClick={onRemove} aria-label={T.remove(m.name)} title={T.remove(m.name)}>
          <Icon name="close" size={11} />
        </button>
      </span>
    </li>
  );
}

/**
 * Knopf „Medien“ und Vorschau unter einem mehrzeiligen Feld. `onChange` bekommt die neue Medienliste
 * (das Feld speichert dann Text + Verweise). `add` nimmt gezogene oder eingefügte Dateien. Meldungen stehen am Feld.
 */
export function useFieldMedia({ label, media, onChange, say }: { label: string; media: FieldMedia[]; onChange: (m: FieldMedia[]) => void; say?: (t: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  // V157: ✕ und Rückgängig verschwinden nach dem Klick – Fokus bleibt am Feld (Rückgängig bzw. „Medien“)
  const undoBtn = useRef<HTMLButtonElement>(null);
  const addBtn = useRef<HTMLButtonElement>(null);
  const [msg, setMsg] = useState<{ text: string; undo?: FieldMedia[] } | null>(null);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const tell = (text: string, undo?: FieldMedia[]) => {
    window.clearTimeout(timer.current);
    setMsg({ text, undo });
    say?.(text);
    timer.current = noticeLater(() => setMsg(null), undo ? 2 : 1);
  };
  const add = async (files: File[]) => {
    if (!files.length) return;
    const { added, msgs } = await storeMedia(files, Fm.MEDIA_PER_FIELD - media.length);
    if (added.length) onChange([...media, ...added]);
    tell([added.length ? T.added(added.length) : '', ...msgs].filter(Boolean).join(' '));
  };
  const tools = (
    <div className="fmedia">
      {media.length > 0 && (
        <ul className="fmedia__list" aria-label={T.list(label)}>
          {media.map((m) => (
            <MediaItem
              key={m.id}
              m={m}
              onRemove={() => {
                const before = media;
                onChange(media.filter((x) => x.id !== m.id));
                tell(T.removed(m.name), before);
                window.setTimeout(() => (undoBtn.current ?? addBtn.current)?.focus(), 0);
              }}
            />
          ))}
        </ul>
      )}
      <span className="fmedia__bar">
        <button ref={addBtn} type="button" className="fmedia__add" onClick={() => input.current?.click()} title={T.addHint(label)} aria-label={`${T.add}: ${label}`}>
          <Icon name="clip" size={12} /> {T.add}
        </button>
        <input
          ref={input}
          type="file"
          multiple
          hidden
          accept={Fm.MEDIA_ACCEPT}
          onChange={(e) => {
            const f = [...(e.target.files ?? [])];
            e.target.value = '';
            void add(f);
          }}
        />
        {msg && (
          <span className="paper__msg" role="status">
            {msg.text}
            {msg.undo && (
              <>
                {' '}
                <button ref={undoBtn} type="button" className="fmedia__undo" onClick={() => (onChange(msg.undo!), setMsg(null), window.setTimeout(() => addBtn.current?.focus(), 0))}>
                  {T.undo}
                </button>
              </>
            )}
          </span>
        )}
      </span>
    </div>
  );
  return { add: (f: File[]) => void add(f), tools };
}

/** Logo in der Kopfzeile eines Blatts: zeigt das Bild; Knopf zum Einfügen/Ändern/Entfernen (bei Hover und Fokus sichtbar). */
export function PaperLogo({ p, dispatch, say }: { p: Project | undefined; dispatch?: (a: Action) => void; say?: (t: string) => void }) {
  const id = Fm.logoId(p?.charter?.logo);
  const { url } = useMediaUrl(id ?? '');
  const input = useRef<HTMLInputElement>(null);
  // V158: ✕ mit Rückgängig wie bei den Medien im Feld; Fokus bleibt an der Kopfzeile (Rückgängig bzw. „Logo“)
  const undoBtn = useRef<HTMLButtonElement>(null);
  const addBtn = useRef<HTMLButtonElement>(null);
  const [msg, setMsg] = useState<{ text: string; undo?: string } | null>(null);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  if (!p) return null;
  const tell = (t: string, undo?: string) => {
    window.clearTimeout(timer.current);
    setMsg({ text: t, undo });
    say?.(t);
    timer.current = noticeLater(() => setMsg(null), undo ? 2 : 1);
  };
  const set = async (files: File[]) => {
    const f = files.find((x) => Fm.mediaKindOf(x.type, x.name) === 'img');
    if (!f) return tell(T.logoOnlyImg);
    const { added, msgs } = await storeMedia([f], 1);
    if (!added.length) return tell(msgs.join(' ') || T.failed);
    dispatch?.({ type: 'charterEdit', id: p.id, patch: { logo: `es-img:${added[0].id}` } });
    tell(T.logoSaved);
  };
  const shown = id && url;
  return (
    <span className={`paper__logo${shown ? ' has-logo' : ''}`} {...(dispatch ? mediaDrop((f) => void set(f)) : {})}>
      {shown && <img src={url} alt={T.logoAlt(p.name)} />}
      {dispatch && (
        <span className="paper__logoTools">
          <button ref={addBtn} type="button" onClick={() => input.current?.click()} title={T.logoHint} aria-label={shown ? T.logoChange : T.logoAdd}>
            <Icon name="image" size={12} /> {shown ? '' : T.logo}
          </button>
          {id && (
            <button
              type="button"
              onClick={() => {
                const before = p.charter?.logo ?? undefined;
                dispatch({ type: 'charterEdit', id: p.id, patch: { logo: null } });
                tell(T.logoGone, before);
                window.setTimeout(() => (undoBtn.current ?? addBtn.current)?.focus(), 0);
              }}
              title={T.logoRemove}
              aria-label={T.logoRemove}
            >
              <Icon name="close" size={11} />
            </button>
          )}
          <input
            ref={input}
            type="file"
            hidden
            accept={Fm.LOGO_ACCEPT}
            onChange={(e) => {
              const f = [...(e.target.files ?? [])];
              e.target.value = '';
              void set(f);
            }}
          />
        </span>
      )}
      {msg && (
        <span className="paper__msg" role="status">
          {msg.text}
          {msg.undo && dispatch && (
            <>
              {' '}
              <button
                ref={undoBtn}
                type="button"
                className="fmedia__undo"
                onClick={() => {
                  dispatch({ type: 'charterEdit', id: p.id, patch: { logo: msg.undo! } });
                  setMsg(null);
                  say?.(T.logoSaved);
                  window.setTimeout(() => addBtn.current?.focus(), 0);
                }}
              >
                {T.undo}
              </button>
            </>
          )}
        </span>
      )}
    </span>
  );
}
