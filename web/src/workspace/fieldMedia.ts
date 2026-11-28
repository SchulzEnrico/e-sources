/**
 * V154 (F-232 P12, entschieden V153): Medien in den mehrzeiligen Feldern der Blätter (Steckbrief, Formulare,
 * Problemstellung, Entscheidungsvorlage) und als Logo in der Kopfzeile. Die Datei selbst liegt nur auf dem Gerät
 * (IndexedDB `esource.images`, wie die Notizbilder); im Feld steht – und abgeglichen wird – nur der Verweis als
 * eigene Zeile am Ende des Texts:
 *   Bild:          `![Name](es-img:<Schlüssel>)`   (wie im Text der Notiz, noteDoc.ts)
 *   PDF/Ton/Video: `[Name](es-file:<Schlüssel>)`
 * Im Eingabefeld erscheinen diese Zeilen nicht; sie stehen als Vorschau darunter (Bild, PDF-Vorschau, Abspieler).
 */
import type { Workspace } from './types';

export type MediaKind = 'img' | 'pdf' | 'audio' | 'video' | 'file';
export interface FieldMedia {
  /** 'img' = Bild (es-img), sonst Datei (es-file) */
  ref: 'img' | 'file';
  id: string;
  name: string;
}

/** Höchstens so viele Medien je Feld */
export const MEDIA_PER_FIELD = 12;
/** Größte Datei für PDF, Ton, Video (Bilder werden ohnehin verkleinert) */
export const MEDIA_MAX_BYTES = 50 * 1024 * 1024;
/** Dateiauswahl: welche Arten angeboten werden */
export const MEDIA_ACCEPT = 'image/png,image/jpeg,image/svg+xml,image/webp,image/gif,application/pdf,audio/*,video/*';
export const LOGO_ACCEPT = 'image/png,image/jpeg,image/svg+xml,image/webp';

const LINE = /^(!?)\[((?:[^\]\\]|\\.)*)\]\((es-img|es-file):([A-Za-z0-9_-]+)\)\s*$/;
const ANY = /es-(?:img|file):([A-Za-z0-9_-]+)/g;

const unesc = (s: string) => s.replace(/\\(.)/g, '$1');
/** Name für die Verweiszeile: eine Zeile, Klammern geschützt, höchstens 80 Zeichen */
export const mediaName = (s: string): string =>
  s
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, 80)
    .replace(/[[\]\\]/g, '\\$&');

/** Welche Art ist die Datei? (nach Mime-Typ, sonst nach Endung) */
export function mediaKindOf(mime: string, name = ''): MediaKind {
  const m = mime.toLowerCase();
  const ext = name.toLowerCase().split('.').pop() ?? '';
  if (m.startsWith('image/') || ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].includes(ext)) return 'img';
  if (m === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (m.startsWith('audio/') || ['mp3', 'm4a', 'wav', 'ogg', 'aac', 'flac'].includes(ext)) return 'audio';
  if (m.startsWith('video/') || ['mp4', 'mov', 'webm', 'm4v'].includes(ext)) return 'video';
  return 'file';
}
/** Darf die Datei in ein Feld? (Bilder, PDF, Ton, Video; Größe) – Grund als Text, sonst leer */
export function mediaRefusal(mime: string, name: string, bytes: number): '' | 'kind' | 'size' {
  const k = mediaKindOf(mime, name);
  if (k === 'file') return 'kind';
  if (k !== 'img' && bytes > MEDIA_MAX_BYTES) return 'size';
  return '';
}

/** Text des Felds und seine Medien trennen (Medien = Verweiszeilen, egal wo sie stehen) */
export function splitMedia(v: string | undefined | null): { text: string; media: FieldMedia[] } {
  if (!v) return { text: '', media: [] };
  const media: FieldMedia[] = [];
  const keep: string[] = [];
  for (const line of v.split('\n')) {
    const m = LINE.exec(line.trim());
    if (m && (m[1] === '!') === (m[3] === 'es-img')) media.push({ ref: m[3] === 'es-img' ? 'img' : 'file', id: m[4], name: unesc(m[2]) });
    else keep.push(line);
  }
  return { text: keep.join('\n').replace(/\s+$/, ''), media };
}
export const mediaLine = (m: FieldMedia): string => (m.ref === 'img' ? `![${mediaName(m.name)}](es-img:${m.id})` : `[${mediaName(m.name)}](es-file:${m.id})`);
/** Text und Medien wieder zusammensetzen – Medien als eigene Zeilen am Ende; doppelte fallen weg */
export function joinMedia(text: string, media: readonly FieldMedia[]): string {
  const seen = new Set<string>();
  const lines = media.filter((m) => !seen.has(m.id) && (seen.add(m.id), true)).slice(0, MEDIA_PER_FIELD).map(mediaLine);
  const t = text.replace(/\s+$/, '');
  return [t, ...lines].filter((x, i) => i > 0 || x).join('\n');
}
/** Nur der lesbare Text (für Listen, Lücken, Vorschau) */
export const textOnly = (v: string | undefined | null): string => splitMedia(v).text;
/** Platz für den Text, wenn die Verweise mitzählen (Feldgrenze z. B. 2000 Zeichen) */
export const textRoom = (media: readonly FieldMedia[], max: number): number => Math.max(0, max - media.reduce((s, m) => s + mediaLine(m).length + 1, 0));

/** Alle Verweise (Bild und Datei) in einem Text */
export function mediaRefsIn(s: string): string[] {
  const out: string[] = [];
  for (const m of s.matchAll(ANY)) out.push(m[1]);
  return out;
}
/** Verweise in Projekten, Meldungen und Entscheidungen (für das Aufräumen des Gerätespeichers) */
export function wsMediaRefs(ws: Workspace): Set<string> {
  const parts: unknown[] = [ws.projects, ws.feedback, ws.decisions];
  const out = new Set<string>();
  for (const x of parts) if (x) for (const r of mediaRefsIn(JSON.stringify(x))) out.add(r);
  return out;
}
/** Logo der Kopfzeile: Wert `es-img:<Schlüssel>` → Schlüssel */
export const logoId = (v: string | undefined): string | undefined => (v && /^es-img:[A-Za-z0-9_-]+$/.test(v) ? v.slice(7) : undefined);

const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/**
 * Bericht: Verweiszeilen im (bereits maskierten) HTML durch Bilder ersetzen (Daten-URL aus `pics`); PDF, Ton, Video
 * stehen als Anlage-Zeile „📎 Name“ (die Datei liegt nur auf dem Gerät). Fehlt ein Bild, steht „[Bild: Name]“.
 */
export function embedMedia(html: string, pics?: ReadonlyMap<string, string>): string {
  return html
    .replace(/!\[((?:[^\]\\\n]|\\.)*)\]\(es-img:([A-Za-z0-9_-]+)\)/g, (_, n: string, id: string) => {
      const name = unesc(n);
      const url = pics?.get(id);
      return url && /^data:image\//.test(url)
        ? `<figure class="media"><img src="${escHtml(url)}" alt="${name}"><figcaption>${name}</figcaption></figure>`
        : `<span class="media media--missing">[Bild: ${name}]</span>`;
    })
    .replace(/\[((?:[^\]\\\n]|\\.)*)\]\(es-file:([A-Za-z0-9_-]+)\)/g, (_, n: string) => `<span class="media media--file">📎 ${unesc(n)}</span>`);
}
