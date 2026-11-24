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
