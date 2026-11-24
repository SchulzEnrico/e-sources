/**
 * F-215 (V80, Entscheidung B4): Bild aus dem Text groß ansehen – Ebene über dem Pad (ohne Pad: über der Seite).
 * Esc, Wischen (nach unten bzw. seitlich) oder ✕ schließt, der Fokus geht zurück ins Textfeld an das Bild.
 * Dort: „Als Datei sichern“ (Teilen-Menü auf Touch, sonst Download), „Bild löschen“ (mit Rückgängig am Ort im
 * Text) und die Beschreibung (alt) – Bildschirmleser lesen sie vor (NF-03). Tab bleibt in der Ebene.
 */
import { type KeyboardEvent as RKeyboardEvent, type PointerEvent as RPointerEvent, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getPic, picFileName } from '../workspace/imageStore';
import { NOTE_TEXT } from '../workspace/terms';
import { Icon } from './Icon';

interface Props {
  picRef: string;
  alt: string;
  host: HTMLElement | null;
  onAlt: (alt: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function PicView({ picRef, alt, host, onAlt, onDelete, onClose }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [text, setText] = useState(alt);
  const [say, setSay] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const uid = useId();

  useEffect(() => {
    let live = true;
    let u: string | null = null;
    void getPic(picRef).then((p) => {
      if (!live || !p) return;
      u = URL.createObjectURL(p.blob);
      setUrl(u);
    });
    return () => {
      live = false;
      if (u) URL.revokeObjectURL(u);
    };
  }, [picRef]);

  useEffect(() => {
    closeBtn.current?.focus({ preventScroll: true });
  }, []);

  // Esc vor allen anderen (Rückfrage der Notiz, Pad) – solange die Ebene offen ist
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      closeRef.current();
    };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, []);

  const save = async () => {
    const p = await getPic(picRef);
    if (!p) return;
    const name = picFileName(p.at, p.mime);
    const file = typeof File === 'function' ? new File([p.blob], name, { type: p.mime }) : null;
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    if (file && nav.share && nav.canShare?.({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
      try {
        await nav.share({ files: [file], title: name });
      } catch {
        /* abgebrochen */
      }
      return;
    }
    const u = URL.createObjectURL(p.blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(u), 4000);
    setSay(name);
  };

  // Tab bleibt in der Ebene
  const onKey = (e: RKeyboardEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (e.key !== 'Tab') return;
    const f = Array.from(box.current?.querySelectorAll<HTMLElement>('button, input') ?? []);
    if (!f.length) return;
    const i = f.indexOf(document.activeElement as HTMLElement);
    const n = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : i === f.length - 1 ? 0 : i + 1;
    e.preventDefault();
    f[n].focus();
  };

  // Wischen schließt (nach unten oder seitlich, ab 60 px)
  const down = (e: RPointerEvent) => (start.current = { x: e.clientX, y: e.clientY });
  const up = (e: RPointerEvent) => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (dy > 60 || Math.abs(dx) > 80) onClose();
  };

  const commitAlt = () => {
    const t = text.replace(/\s+/g, ' ').trim();
    if (t !== alt) onAlt(t);
  };

  const node = (
    <div
      ref={box}
      className={`picview${host ? '' : ' is-page'}`}
      role="dialog"
      aria-modal="true"
      aria-label={NOTE_TEXT.imgView}
      onKeyDown={onKey}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="picview__bar">
        <label className="picview__alt">
          <span>{NOTE_TEXT.imgAltLabel}</span>
          <input
            type="text"
            value={text}
            placeholder={NOTE_TEXT.imgAlt}
            aria-describedby={`${uid}-h`}
            onChange={(e) => setText(e.target.value)}
            onBlur={commitAlt}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), commitAlt())}
          />
        </label>
        <span className="sr-only" id={`${uid}-h`}>
          {NOTE_TEXT.imgAltHint}
        </span>
        <button type="button" className="remind__x" aria-label={NOTE_TEXT.imgSave} title={NOTE_TEXT.imgSave} onClick={() => void save()}>
          <Icon name="download" size={15} />
        </button>
        <button
          type="button"
          className="remind__x"
          aria-label={NOTE_TEXT.imgDelete}
          title={NOTE_TEXT.imgDelete}
          onClick={() => {
            commitAlt();
            onDelete();
          }}
        >
          <Icon name="trash" size={15} />
        </button>
        <button
          ref={closeBtn}
          type="button"
          className="remind__x"
          aria-label={NOTE_TEXT.imgClose}
          title={NOTE_TEXT.imgClose}
          onClick={() => {
            commitAlt();
            onClose();
          }}
        >
          <Icon name="close" size={15} />
        </button>
      </div>
      <div className="picview__stage" onPointerDown={down} onPointerUp={up} onPointerCancel={() => (start.current = null)}>
        {url && <img src={url} alt={text || NOTE_TEXT.imgAlt} draggable={false} />}
      </div>
      <span className="sr-only" aria-live="polite">
        {say}
      </span>
    </div>
  );
  return createPortal(node, host ?? document.body);
}
