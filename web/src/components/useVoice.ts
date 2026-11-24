/**
 * F-215 Schritt 3 (V77): Sprachnotiz – Anbindung an die Web Speech API.
 * Entscheidungen (Claude Doc F-215, V69): nur lokal auf dem Gerät (`processLocally`), ab Werk aus, kein Ton als
 * Anhang. Vor dem Start fragt `SpeechRecognition.available` nach dem lokalen Sprachpaket (`voiceReady`):
 * fehlt es, lädt `install` es einmal; kann der Browser gar nicht lokal erkennen, kommt ein Hinweis am Ort.
 * Die reine Logik (Text zusammensetzen, Gesten, Ziel) liegt in workspace/voice.ts.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { VOICE_LANG, type VoiceAvail, joinSpeech, rmsOf, speechParts, voiceLevel, voiceReady } from '../workspace/voice';
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
}

/**
 * V78 (Wunsch Enrico): Pegel des Mikrofons. Eigener Mitschnitt über getUserMedia + AnalyserNode – nur zur
 * Anzeige, der Ton wird nirgends gespeichert oder gesendet. Schreibt `--lvl` (0–1) direkt ins Element
 * (kein Neuzeichnen von React bei 60 Bildern je Sekunde).
 */
function useLevel() {
  const el = useRef<HTMLElement | null>(null);
  const live = useRef<{ ctx: AudioContext; stream: MediaStream; raf: number } | null>(null);
  const id = useRef(0);
  const stopLevel = useCallback(() => {
    id.current++;
    const l = live.current;
    live.current = null;
    if (l) {
      cancelAnimationFrame(l.raf);
      l.stream.getTracks().forEach((t) => t.stop());
      void l.ctx.close().catch(() => undefined);
    }
    el.current?.style.setProperty('--lvl', '0');
  }, []);
  const startLevel = useCallback(async () => {
    stopLevel();
    const my = id.current;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC || !navigator.mediaDevices?.getUserMedia) return;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      return; // ohne Freigabe kein Pegel – die Erkennung meldet den Fehler selbst
    }
    if (my !== id.current) return void stream.getTracks().forEach((t) => t.stop());
    const ctx = new AC();
    const an = ctx.createAnalyser();
    an.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(an);
    const buf = new Float32Array(an.fftSize);
    let lvl = 0;
    const tick = () => {
      if (!live.current) return;
      an.getFloatTimeDomainData(buf);
      lvl = voiceLevel(rmsOf(buf), lvl);
      el.current?.style.setProperty('--lvl', lvl.toFixed(3));
      live.current.raf = requestAnimationFrame(tick);
    };
    live.current = { ctx, stream, raf: requestAnimationFrame(tick) };
  }, [stopLevel]);
  useEffect(() => stopLevel, [stopLevel]);
  return { meterRef: el, startLevel, stopLevel };
}

export function useVoice() {
  const { meterRef, startLevel, stopLevel } = useLevel();
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
    stopLevel();
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
      fail(VOICE_TEXT.fallback);
      return false;
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
    void startLevel();
    return true;
  }, []);

  /** Aufnahme beenden und den erkannten Text liefern (wartet kurz auf die letzten festen Teile). */
  const stop = useCallback(async (): Promise<string> => {
    want.current = false;
    stopLevel();
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
    return text;
  }, []);

  /** Aufnahme verwerfen */
  const cancel = useCallback(() => {
    want.current = false;
    stopLevel();
    run.current++;
    drop();
    base.current = '';
    parts.current = { final: '', interim: '' };
    setSt({ phase: 'idle', final: '', interim: '', note: null });
  }, []);

  const clearNote = useCallback(() => setSt((s) => (s.note ? { ...s, note: null } : s)), []);

  return { ...st, start, stop, cancel, clearNote, meterRef };
}
