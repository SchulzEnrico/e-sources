/**
 * F-215 Schritt 3 (V77): Sprachnotiz – Anbindung an die Web Speech API.
 * Entscheidungen (Claude Doc F-215, V69): nur lokal auf dem Gerät (`processLocally`), ab Werk aus.
 * V79 (Claude Doc Tonaufnahme, T1–T11): Ton wird immer mit aufgenommen und bleibt auf diesem Gerät; ohne lokale
 * Erkennung (Safari, Firefox) gibt es eine Tonnotiz – Ton ohne Text (T6). Vor dem Start fragt `SpeechRecognition.available` nach dem lokalen Sprachpaket (`voiceReady`):
 * fehlt es, lädt `install` es einmal; kann der Browser gar nicht lokal erkennen, kommt ein Hinweis am Ort.
 * Die reine Logik (Text zusammensetzen, Gesten, Ziel) liegt in workspace/voice.ts.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AUDIO_BPS, AUDIO_MAX_MS, VOICE_LANG, type VoiceAvail, audioMime, joinSpeech, rmsOf, speechParts, voiceLevel, voiceReady } from '../workspace/voice';
import { VOICE_TEXT } from '../workspace/terms';

/** Schmale eigene Typen – TypeScript kennt SpeechRecognition (noch) nicht vollständig */
interface SRResultList {
  length: number;
  [i: number]: { isFinal: boolean; 0: { transcript: string } };
}
interface SR {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  processLocally?: boolean;
  onresult: ((e: { results: SRResultList }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
interface SRClass {
  new (): SR;
  available?: (o: { langs: string[]; processLocally: boolean }) => Promise<VoiceAvail>;
  install?: (o: { langs: string[]; processLocally: boolean }) => Promise<boolean>;
}
const srClass = (): SRClass | undefined => {
  const w = window as unknown as { SpeechRecognition?: SRClass; webkitSpeechRecognition?: SRClass };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};
const LOCAL = { langs: [VOICE_LANG], processLocally: true };

/** Kann dieser Browser lokal erkennen? Ohne `available` (z. B. Safari) gibt es keine Zusage für „lokal“ → Rückfall. */
async function checkLocal(): Promise<VoiceAvail> {
  const C = srClass();
  if (!C?.available) return 'none';
  try {
    return await C.available(LOCAL);
  } catch {
    return 'unavailable';
  }
}

export type VoicePhase = 'idle' | 'prep' | 'rec';
export interface VoiceState {
  phase: VoicePhase;
  /** fester Text bisher */
  final: string;
  /** vorläufiger Text (wird noch erkannt) */
  interim: string;
  /** Hinweis am Ort (Sprachpaket, Rückfall, Fehler) */
  note: string | null;
  /** V79 (T6): Tonnotiz – nur Ton, keine Erkennung in diesem Browser */
  audioOnly?: boolean;
}

/** F-215 (V79): aufgenommener Ton einer Sprachnotiz */
export interface AudioTake {
  blob: Blob;
  mime: string;
  /** Länge in Sekunden */
  dur: number;
}

/**
 * V78 (Wunsch Enrico): Pegel des Mikrofons. Eigener Mitschnitt über getUserMedia + AnalyserNode; schreibt `--lvl`
 * (0–1) direkt ins Element (kein Neuzeichnen von React bei 60 Bildern je Sekunde).
 * V79 (Entscheidung T2 „immer mit aufnehmen“): Aus demselben Mitschnitt nimmt MediaRecorder den Ton auf. Er bleibt
 * auf diesem Gerät (IndexedDB, siehe workspace/audioStore.ts); höchstens AUDIO_MAX_MS (T5), dann `limit`.
 */
function useMic() {
  const el = useRef<HTMLElement | null>(null);
  const live = useRef<{ ctx: AudioContext | null; stream: MediaStream; raf: number } | null>(null);
  const rec = useRef<{ mr: MediaRecorder; chunks: Blob[]; t0: number; mime: string } | null>(null);
  const id = useRef(0);
  const limitT = useRef(0);
  const [limit, setLimit] = useState(false);
  const [taping, setTaping] = useState(false);

  /** Mitschnitt beenden; `keep` = Ton liefern (sonst verwerfen) */
  const stopMic = useCallback(async (keep: boolean): Promise<AudioTake | null> => {
    id.current++;
    window.clearTimeout(limitT.current);
    setTaping(false);
    const r = rec.current;
    rec.current = null;
    let take: AudioTake | null = null;
    if (r) {
      if (r.mr.state !== 'inactive') {
        await new Promise<void>((done) => {
          const t = window.setTimeout(done, 1500);
          r.mr.onstop = () => (window.clearTimeout(t), done());
          try {
            r.mr.stop();
          } catch {
            window.clearTimeout(t);
            done();
          }
        });
      }
      if (keep && r.chunks.length) {
        const type = r.mime || r.mr.mimeType || 'audio/webm';
        const blob = new Blob(r.chunks, { type });
        if (blob.size > 0) take = { blob, mime: type, dur: Math.min(AUDIO_MAX_MS, Date.now() - r.t0) / 1000 };
      }
    }
    const l = live.current;
    live.current = null;
    if (l) {
      cancelAnimationFrame(l.raf);
      l.stream.getTracks().forEach((t) => t.stop());
      if (l.ctx) void l.ctx.close().catch(() => undefined);
    }
    el.current?.style.setProperty('--lvl', '0');
    return take;
  }, []);

  /** Mitschnitt starten – Pegel immer, Ton mit `record`. Ergebnis: Mikrofon frei? */
  const startMic = useCallback(
    async (record: boolean): Promise<boolean> => {
      await stopMic(false);
      setLimit(false);
      const my = id.current;
      if (!navigator.mediaDevices?.getUserMedia) return false;
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      } catch {
        return false; // ohne Freigabe kein Pegel und kein Ton – die Erkennung meldet den Fehler selbst
      }
      if (my !== id.current) {
        stream.getTracks().forEach((t) => t.stop());
        return true;
      }
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      let ctx: AudioContext | null = null;
      let tick: (() => void) | null = null;
      if (AC) {
        ctx = new AC();
        const an = ctx.createAnalyser();
        an.fftSize = 1024;
        ctx.createMediaStreamSource(stream).connect(an);
        const buf = new Float32Array(an.fftSize);
        let lvl = 0;
        tick = () => {
          if (!live.current) return;
          an.getFloatTimeDomainData(buf);
          lvl = voiceLevel(rmsOf(buf), lvl);
          el.current?.style.setProperty('--lvl', lvl.toFixed(3));
          live.current.raf = requestAnimationFrame(tick!);
        };
      }
      live.current = { ctx, stream, raf: tick ? requestAnimationFrame(tick) : 0 };
      if (record && typeof MediaRecorder !== 'undefined') {
        const mime = audioMime((t) => MediaRecorder.isTypeSupported(t));
        try {
          const mr = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: AUDIO_BPS });
          const r = { mr, chunks: [] as Blob[], t0: Date.now(), mime: mime || mr.mimeType };
          mr.ondataavailable = (e) => e.data.size && r.chunks.push(e.data);
          mr.start(1000);
          rec.current = r;
          setTaping(true);
          limitT.current = window.setTimeout(() => setLimit(true), AUDIO_MAX_MS);
        } catch {
          rec.current = null; // ohne Aufnahme weiter – Text geht trotzdem
        }
      }
      return true;
    },
    [stopMic],
  );
  useEffect(() => () => void stopMic(false), [stopMic]);
  return { meterRef: el, startMic, stopMic, limit, taping };
}

export function useVoice() {
  const { meterRef, startMic, stopMic, limit, taping } = useMic();
  const [st, setSt] = useState<VoiceState>({ phase: 'idle', final: '', interim: '', note: null });
  const rec = useRef<SR | null>(null);
  /** Text aus früheren Sitzungen derselben Aufnahme – Chrome beendet die Erkennung bei Pausen von selbst */
  const base = useRef('');
  const parts = useRef({ final: '', interim: '' });
  const want = useRef(false);
  const endWait = useRef<(() => void) | null>(null);
  const run = useRef(0);

  const full = () => joinSpeech(joinSpeech(base.current, parts.current.final), parts.current.interim);
  const show = () => setSt((s) => ({ ...s, final: joinSpeech(base.current, parts.current.final), interim: parts.current.interim }));

  const drop = () => {
    const r = rec.current;
    rec.current = null;
    if (r) {
      r.onresult = r.onerror = r.onend = null;
      try {
        r.abort();
      } catch {
        /* schon beendet */
      }
    }
  };
  useEffect(() => () => {
    want.current = false;
    drop();
  }, []);

  const fail = (note: string) => {
    want.current = false;
    void stopMic(false);
    drop();
    setSt({ phase: 'idle', final: '', interim: '', note });
  };

  const begin = (id: number) => {
    const C = srClass();
    if (!C || id !== run.current) return;
    const r = new C();
    r.lang = VOICE_LANG;
    r.continuous = true;
    r.interimResults = true;
    r.processLocally = true;
    r.onresult = (e) => {
      parts.current = speechParts(e.results);
      show();
    };
    r.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      if (e.error === 'not-allowed') return fail(VOICE_TEXT.denied);
      if (e.error === 'language-not-supported' || e.error === 'service-not-allowed') return fail(VOICE_TEXT.fallback);
      fail(VOICE_TEXT.failed);
    };
    r.onend = () => {
      // Sitzung zu Ende (Pause, Stopp): bisherigen Text festhalten; läuft die Aufnahme noch, neu starten
      base.current = joinSpeech(joinSpeech(base.current, parts.current.final), parts.current.interim);
      parts.current = { final: '', interim: '' };
      rec.current = null;
      if (endWait.current) return endWait.current();
      if (want.current && id === run.current) begin(id);
    };
    rec.current = r;
    try {
      r.start();
    } catch {
      fail(VOICE_TEXT.failed);
    }
  };

  /** Aufnahme starten – prüft vorher, ob lokal erkannt werden kann. Ergebnis: läuft sie? */
  const start = useCallback(async (): Promise<boolean> => {
    const id = ++run.current;
    base.current = '';
    parts.current = { final: '', interim: '' };
    want.current = true;
    setSt({ phase: 'prep', final: '', interim: '', note: null });
    const how = voiceReady(await checkLocal());
    if (id !== run.current || !want.current) return false;
    if (how === 'fallback') {
      // V79 (T6): ohne lokale Erkennung – Tonnotiz (nur Ton), sofern der Browser aufnehmen kann
      if (typeof MediaRecorder === 'undefined') {
        fail(VOICE_TEXT.fallback);
        return false;
      }
      setSt({ phase: 'rec', final: '', interim: '', note: null, audioOnly: true });
      const ok = await startMic(true);
      if (id !== run.current) return false;
      if (!ok) {
        fail(VOICE_TEXT.denied);
        return false;
      }
      return true;
    }
    if (how === 'wait') {
      fail(VOICE_TEXT.wait);
      return false;
    }
    if (how === 'install') {
      setSt((s) => ({ ...s, note: VOICE_TEXT.install }));
      let ok = false;
      try {
        ok = (await srClass()?.install?.(LOCAL)) ?? false;
      } catch {
        ok = false;
      }
      if (id !== run.current) return false;
      // nach dem Laden nicht von selbst aufnehmen – der Moment ist vorbei; Anwender startet neu
      fail(ok ? VOICE_TEXT.installed : VOICE_TEXT.fallback);
      return false;
    }
    setSt({ phase: 'rec', final: '', interim: '', note: null });
    begin(id);
    void startMic(true);
    return true;
  }, []);

  /** Aufnahme beenden und den erkannten Text samt Ton liefern (wartet kurz auf die letzten festen Teile). */
  const stop = useCallback(async (): Promise<{ text: string; audio: AudioTake | null }> => {
    want.current = false;
    const taken = stopMic(true);
    run.current++;
    const r = rec.current;
    if (r) {
      await new Promise<void>((done) => {
        const t = window.setTimeout(done, 1500);
        endWait.current = () => {
          window.clearTimeout(t);
          done();
        };
        try {
          r.stop();
        } catch {
          done();
        }
      });
      endWait.current = null;
    }
    const text = rec.current ? full() : joinSpeech(joinSpeech(base.current, parts.current.final), parts.current.interim);
    drop();
    base.current = '';
    parts.current = { final: '', interim: '' };
    setSt({ phase: 'idle', final: '', interim: '', note: null });
    return { text, audio: await taken };
  }, []);

  /** Aufnahme verwerfen */
  const cancel = useCallback(() => {
    want.current = false;
    void stopMic(false);
    run.current++;
    drop();
    base.current = '';
    parts.current = { final: '', interim: '' };
    setSt({ phase: 'idle', final: '', interim: '', note: null });
  }, []);

  const clearNote = useCallback(() => setSt((s) => (s.note ? { ...s, note: null } : s)), []);

  return { ...st, start, stop, cancel, clearNote, meterRef, limit, taping };
}
