/**
 * F-215 Schritt 3 (V76): Sprachnotiz – reine Logik ohne Browser.
 * Entscheidungen (Claude Doc F-215, V69): Halten = Halbkreis, „Sprachnotiz“ oben in der Mitte;
 * Spracherkennung nur lokal (`processLocally` der Web Speech API), ab Werk aus, kein Ton als Anhang;
 * ↑ = feststellen, ← = abbrechen, loslassen = als Entwurf übernehmen; Ziel wählbar, „Als neue Note lösen“ danach.
 */

/** Weg (px) nach oben, ab dem die Aufnahme festgestellt wird */
export const VOICE_LOCK_PX = 40;
/** Weg (px) nach links, ab dem die Aufnahme abgebrochen wird */
export const VOICE_CANCEL_PX = 48;
/** Wie lange (ms) der Finger auf „Sprachnotiz“ ruhen muss, bis die Aufnahme beim Halten beginnt */
export const VOICE_DWELL_MS = 350;
/** Sprache der Erkennung (später wählbar) */
export const VOICE_LANG = 'de-DE';

export type VoiceGesture = 'lock' | 'cancel' | null;

/** Geste während der gehaltenen Aufnahme – Weg seit Beginn der Aufnahme. Oben zählt vor links. */
export function voiceGesture(dx: number, dy: number): VoiceGesture {
  if (-dy >= VOICE_LOCK_PX && -dy >= Math.abs(dx)) return 'lock';
  if (-dx >= VOICE_CANCEL_PX && -dx > Math.abs(dy)) return 'cancel';
  return null;
}

/** Anteil (0–1) des Wegs bis zur Geste – für die Anzeige „↑ Feststellen“ / „← Abbrechen“ */
export function voiceProgress(dx: number, dy: number): { lock: number; cancel: number } {
  const c = (v: number) => Math.max(0, Math.min(1, v));
  return { lock: c(-dy / VOICE_LOCK_PX), cancel: c(-dx / VOICE_CANCEL_PX) };
}

/** Erkannte Teile zusammensetzen: einfache Leerzeichen, Satzanfang groß */
export function joinSpeech(prev: string, add: string): string {
  const a = add.replace(/\s+/g, ' ').trim();
  if (!a) return prev;
  const p = prev.replace(/\s+$/, '');
  const start = !p || /[.!?:]$/.test(p);
  const part = start ? a.charAt(0).toLocaleUpperCase('de-DE') + a.slice(1) : a;
  return p ? `${p} ${part}` : part;
}

/** Ergebnis-Liste der Erkennung (SpeechRecognitionResultList) → fester und vorläufiger Text */
export function speechParts(results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>): { final: string; interim: string } {
  let final = '';
  let interim = '';
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.isFinal) final = joinSpeech(final, r[0].transcript);
    else interim = joinSpeech(interim, r[0].transcript);
  }
  return { final, interim };
}

/** Wie gut kann dieser Browser lokal erkennen? (Antwort von SpeechRecognition.available) */
export type VoiceAvail = 'none' | 'unavailable' | 'downloadable' | 'downloading' | 'available';
export function voiceReady(a: VoiceAvail): 'go' | 'install' | 'wait' | 'fallback' {
  if (a === 'available') return 'go';
  if (a === 'downloadable') return 'install';
  if (a === 'downloading') return 'wait';
  return 'fallback';
}

/** Ziel der Sprachnotiz: in die offene Note (an der Schreibmarke) oder neue Note */
export type VoiceTarget = 'here' | 'new';
export const defaultTarget = (noteOpen: boolean): VoiceTarget => (noteOpen ? 'here' : 'new');

/**
 * V78 (Wunsch Enrico): Pegel des Mikrofons als Leiste in der Anzeige.
 * RMS eines Ausschnitts (0–1) → Anzeige 0–1: −60 dB = leer, −12 dB = voll; steigt sofort, fällt gedämpft
 * (wie ein Aussteuerungsmesser), damit die Leiste ruhig wirkt.
 */
export const LEVEL_FLOOR_DB = -60;
export const LEVEL_TOP_DB = -12;
export function voiceLevel(rms: number, prev = 0, fall = 0.08): number {
  const db = rms > 0 ? 20 * Math.log10(rms) : -Infinity;
  const now = Math.min(1, Math.max(0, (db - LEVEL_FLOOR_DB) / (LEVEL_TOP_DB - LEVEL_FLOOR_DB)));
  return now >= prev ? now : Math.max(now, prev - fall);
}
/** RMS eines Ausschnitts (Werte −1…1) */
export function rmsOf(buf: ArrayLike<number>): number {
  if (!buf.length) return 0;
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / buf.length);
}

/**
 * F-215 (V79, Entscheidungen Enrico T1–T11): Tonaufnahme zur Sprachnotiz – immer mit aufgenommen (T2), höchstens
 * 15 Minuten (T5), liegt nur auf diesem Gerät (T1, IndexedDB). In Safari/Firefox ohne lokale Erkennung: Tonnotiz (T6).
 */
export const AUDIO_MAX_MS = 15 * 60 * 1000;
/** Bitrate der Aufnahme (Sprache) – etwa 250 KB je Minute */
export const AUDIO_BPS = 32000;

/** Bevorzugtes Format, das der Browser aufnehmen kann (Chrome/Firefox: WebM/Opus, Safari: MP4/AAC); '' = Standard */
export function audioMime(can: (t: string) => boolean): string {
  for (const t of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/ogg;codecs=opus']) {
    try {
      if (can(t)) return t;
    } catch {
      /* nächstes Format */
    }
  }
  return '';
}

/** Länge als m:ss bzw. h:mm:ss */
export function fmtDur(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
}

/** Dateiname für „Als Datei sichern“: Sprachnotiz 2026-11-24 19-50.webm */
export function audioFileName(atIso: string, mime: string): string {
  const d = new Date(atIso);
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = Number.isNaN(d.getTime()) ? 'Aufnahme' : `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}-${p(d.getMinutes())}`;
  const ext = /mp4|aac|m4a/.test(mime) ? 'm4a' : /ogg/.test(mime) ? 'ogg' : 'webm';
  return `Sprachnotiz ${stamp}.${ext}`;
}
