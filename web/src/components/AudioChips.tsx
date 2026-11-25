/**
 * F-215 (V79, Claude Doc Tonaufnahme): Tonaufnahmen an der Notiz – je Aufnahme ein Chip (T4) in der Reihe über dem
 * Text, neben „Wann?“/„Wo?“ (T3, „sinnhafter Platz“). Chip: ▶ Länge · Zeitpunkt; daneben „Als Datei sichern“ und
 * „Ton löschen“ (T5) mit „Rückgängig“ am Ort (F-214). Liegt der Ton auf einem anderen Gerät, bleibt der Chip
 * ausgegraut sichtbar: „Ton liegt auf ‚Mac‘“ (T7). Tastatur (NF-03): alles Knöpfe; Ansage über aria-live.
 */
import { useEffect, useRef, useState } from 'react';
import type { NoteAttachment } from '../workspace/types';
import { AUDIO_TEXT as AT } from '../workspace/terms';
import { CLIP_EVENT, getClip } from '../workspace/audioStore';
import { audioFileName, fmtDur } from '../workspace/voice';
import { remindLabel } from '../workspace/remind';
import { Icon } from './Icon';
import { noticeLater } from '../workspace/flash';

export function AudioChips(props: { clips: NoteAttachment[]; onRemove: (ref: string) => void; onUndo: (a: NoteAttachment, index: number) => void }) {
  const { clips, onRemove, onUndo } = props;
  // welche Töne liegen auf diesem Gerät? (undefined = wird noch geprüft)
  const [here, setHere] = useState<Record<string, boolean>>({});
  const [playing, setPlaying] = useState<string | null>(null);
  const [gone, setGone] = useState<{ a: NoteAttachment; index: number } | null>(null);
  const [say, setSay] = useState('');
  const audio = useRef<HTMLAudioElement | null>(null);
  const url = useRef<string | null>(null);
  const goneT = useRef(0);
  const firstBtn = useRef<HTMLButtonElement | null>(null);
  const key = clips.map((c) => c.ref).join(',');

  useEffect(() => {
    let live = true;
    const check = () =>
      void Promise.all(clips.map(async (c) => [c.ref, !!(await getClip(c.ref))] as const)).then((r) => live && setHere(Object.fromEntries(r)));
    check();
    window.addEventListener(CLIP_EVENT, check);
    return () => {
      live = false;
      window.removeEventListener(CLIP_EVENT, check);
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const halt = () => {
    audio.current?.pause();
    audio.current = null;
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = null;
    setPlaying(null);
  };
  useEffect(() => () => (halt(), window.clearTimeout(goneT.current)), []);

  const play = async (a: NoteAttachment) => {
    if (playing === a.ref) {
      halt();
      return setSay(AT.stop);
    }
    halt();
    const c = await getClip(a.ref);
    if (!c) return setSay(AT.missing);
    url.current = URL.createObjectURL(c.blob);
    const el = new Audio(url.current);
    audio.current = el;
    el.onended = () => halt();
    el.onerror = () => (halt(), setSay(AT.failed));
    try {
      await el.play();
      setPlaying(a.ref);
      setSay(AT.playing);
    } catch {
      halt();
      setSay(AT.failed);
    }
  };

  /** Als Datei sichern (D): Teilen-Menü, wo es Dateien kann (iPhone/iPad), sonst Download */
  const save = async (a: NoteAttachment) => {
    const c = await getClip(a.ref);
    if (!c) return setSay(AT.missing);
    const name = audioFileName(a.at ?? new Date(c.at).toISOString(), c.mime);
    const file = typeof File === 'function' ? new File([c.blob], name, { type: c.mime }) : null;
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    if (file && nav.share && nav.canShare?.({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
      try {
        await nav.share({ files: [file], title: name });
        return;
      } catch {
        /* abgebrochen – nichts tun */
        return;
      }
    }
    const u = URL.createObjectURL(c.blob);
    const link = document.createElement('a');
    link.href = u;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(u), 4000);
    setSay(name);
  };

  const remove = (a: NoteAttachment) => {
    if (playing === a.ref) halt();
    const index = clips.findIndex((c) => c.ref === a.ref);
    onRemove(a.ref);
    window.clearTimeout(goneT.current);
    setGone({ a, index });
    setSay(AT.removed);
    goneT.current = noticeLater(() => setGone(null));
    window.setTimeout(() => firstBtn.current?.focus({ preventScroll: true }), 0);
  };

  if (!clips.length && !gone) return null;
  return (
    <div className="audio" role="group" aria-label={AT.group}>
      {clips.map((a, i) => {
        const at = a.at ? remindLabel(a.at) : '';
        const dur = fmtDur(a.dur ?? 0);
        const ok = here[a.ref];
        if (ok === false)
          return (
            <span key={a.ref} className="audio__chip is-away" title={AT.elsewhereHint}>
              <Icon name="micWave" size={14} />
              {dur} · {AT.elsewhere(a.dev ?? AT.missing)}
            </span>
          );
        const on = playing === a.ref;
        return (
          <span key={a.ref} className="audio__slot">
            <button
              ref={i === 0 ? firstBtn : undefined}
              type="button"
              className={`audio__chip${on ? ' is-on' : ''}`}
              aria-pressed={on}
              aria-label={on ? AT.stop : AT.play(dur, at)}
              title={on ? AT.stop : AT.play(dur, at)}
              disabled={ok === undefined}
              onClick={() => void play(a)}
            >
              <Icon name={on ? 'stop' : 'play'} size={12} />
              <span className="audio__dur">{dur}</span>
              {at && <span className="audio__at">· {at}</span>}
            </button>
            <button type="button" className="remind__x" aria-label={AT.save} title={AT.saveHint} onClick={() => void save(a)}>
              <Icon name="download" size={13} />
            </button>
            <button type="button" className="remind__x" aria-label={AT.remove} title={AT.remove} onClick={() => remove(a)}>
              <Icon name="trash" size={13} />
            </button>
          </span>
        );
      })}
      {gone && (
        <span className="audio__gone" role="status">
          {AT.removed}
          <button
            type="button"
            className="audio__undo"
            onClick={() => {
              window.clearTimeout(goneT.current);
              onUndo(gone.a, gone.index);
              setGone(null);
              setSay(AT.undo);
            }}
          >
            {AT.undo}
          </button>
        </span>
      )}
      <span className="sr-only" aria-live="polite">
        {say}
      </span>
    </div>
  );
}
