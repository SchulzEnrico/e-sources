/**
 * V124 (F-231 K6): Titelbild einer Karte wie Trello „Cover“.
 *
 * Eine Karte hat höchstens ein Titelbild: eine Farbe (die zehn Trello-Farben aus der Tag-Farbliste, ohne Stufen –
 * Trello-Cover kennen keine Stufen) oder ein Bild. Das Bild ist eines aus dem Text der Karte (`![…](es-img:…)`) oder
 * eigens hochgeladen; es liegt wie alle Bilder nur auf dem Gerät (imageStore, F-215 B1–B3), abgeglichen wird nur der
 * Schlüssel. Fehlt das Bild auf einem Gerät, zeigt die Karte die Farbe bzw. nichts.
 * Größe wie Trello: klein (Streifen bzw. Bild über dem Titel) oder ganzflächig (die ganze Karte, Titel darauf).
 * Je Board lässt sich das Zeigen abschalten (`NoteView.noCovers`, Trello `prefs.cardCovers`).
 */
import type { Note, NoteCover, NoteView, Workspace } from './types';
import * as No from './notes';
import * as ND from './noteDoc';
import { TAG_COLORS, tagHex, tagInk } from './tags';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);

/** Farben für Titelbilder = Grundfarben der Tags (= Trello-Cover-Farben) */
export const COVER_COLORS = TAG_COLORS.map((c) => c.id);
export const isCoverColor = (c: unknown): c is string => typeof c === 'string' && COVER_COLORS.includes(c);
const IMG_KEY = /^[A-Za-z0-9_-]{1,80}$/;

/** Gültiges Titelbild oder undefined (Farbe und Bild schließen sich aus – das Bild geht vor). */
export function cleanCover(c: unknown): NoteCover | undefined {
  if (!isObj(c)) return undefined;
  const full = c.size === 'full' ? ({ size: 'full' } as const) : {};
  if (typeof c.img === 'string' && IMG_KEY.test(c.img)) return { img: c.img, ...full };
  if (isCoverColor(c.color)) return { color: c.color, ...full };
  return undefined;
}

/** Titelbild setzen bzw. entfernen (undefined); Spur-Eintrag „bearbeitet“ wie jede Änderung. */
export function setCover(ws: Workspace, id: string, cover: NoteCover | undefined, act: { by?: string; now?: number } = {}): Workspace {
  const n = No.noteById(ws, id);
  if (!n) return ws;
  const next = cleanCover(cover);
  if (JSON.stringify(next ?? null) === JSON.stringify(n.cover ?? null)) return ws;
  return No.updateNote(ws, id, { cover: next }, act);
}

/** Nur die Größe ändern (klein ↔ ganzflächig). */
export const setCoverSize = (ws: Workspace, id: string, full: boolean, act: { by?: string } = {}): Workspace => {
  const n = No.noteById(ws, id);
  if (!n?.cover) return ws;
  return setCover(ws, id, { ...n.cover, size: full ? 'full' : undefined }, act);
};

/** Bilder im Text der Karte (wie gezeigt, also mit Entwurf) als Auswahl für das Titelbild – Schlüssel und Beschreibung. */
export function coverChoices(n: Pick<Note, 'text'> & Partial<Pick<Note, 'draft'>>): { ref: string; alt: string }[] {
  const text = typeof n.draft?.fields.text === 'string' ? n.draft.fields.text : n.text;
  const out: { ref: string; alt: string }[] = [];
  for (const line of text.split('\n')) {
    const b = ND.parseLine(line);
    if (b.k === 'img' && b.ref && !out.some((x) => x.ref === b.ref)) out.push({ ref: b.ref, alt: b.text });
  }
  return out;
}

/** Was die Karte im Board zeigt (Board-Schalter beachtet). */
export const coverShown = (v: Pick<NoteView, 'noCovers'> | undefined, n: Pick<Note, 'cover'>): NoteCover | undefined => (v?.noCovers ? undefined : n.cover);

/** Darstellung einer Farbe als Titelbild: Hintergrund und lesbare Schrift. */
export const coverPaint = (color: string) => ({ bg: tagHex(color), ink: tagInk(color) });

/** Schlüssel aller Titelbilder (für das Aufräumen ungenutzter Bilder). */
export function coverRefs(ws: Workspace): string[] {
  return (ws.notes ?? []).map((n) => n.cover?.img).filter((x): x is string => !!x);
}

// ---------- Trello (F-230) ----------

/**
 * Trello-Cover → Titelbild. Farbe und Größe kommen herüber; ein Bild-Cover (Anhang, Hintergrund, Unsplash) liegt
 * bei Trello im Netz – das holen wir nicht (kein Netz, Anmeldung nötig); es reist roh mit (`keep`) und geht beim
 * Export unverändert zurück, solange auf unserer Seite kein anderes Titelbild gesetzt wurde.
 */
export function coverFromTrello(raw: unknown): { cover?: NoteCover; keep: boolean } {
  if (!isObj(raw)) return { keep: false };
  const pic = !!(raw.idAttachment || raw.idUploadedBackground || raw.idPlugin || raw.scaled || raw.url);
  const full = raw.size === 'full' ? ({ size: 'full' } as const) : {};
  if (!pic && isCoverColor(raw.color)) return { cover: { color: raw.color, ...full }, keep: false };
  return { keep: pic };
}

/** Kurzform eines Trello-Covers zum Vergleich (Trello ordnet Felder um und ergänzt eigene). */
export function coverSig(raw: unknown): string {
  if (!isObj(raw)) return '';
  const v = (k: string) => (typeof raw[k] === 'string' && raw[k] ? String(raw[k]) : '');
  return [v('color'), v('idAttachment'), v('idUploadedBackground'), v('idPlugin'), raw.size === 'full' ? 'full' : 'normal'].join('|');
}

/**
 * Titelbild → Trello-Cover. `kept` = roh mitgeführtes Bild-Cover aus dem Import (zurück, wenn wir keins gesetzt haben).
 * Eigene Bilder liegen nur auf dem Gerät und gehen nicht mit – Trello bekommt dann ein leeres Cover.
 */
export function coverToTrello(c: NoteCover | undefined, kept?: Obj): Obj {
  if (!c && kept) return kept;
  const base: Obj = { idAttachment: null, color: null, idUploadedBackground: null, size: 'normal', brightness: 'dark', idPlugin: null };
  if (!c) return base;
  if (c.color) return { ...base, color: c.color, size: c.size === 'full' ? 'full' : 'normal', brightness: tagInk(c.color) === '#ffffff' ? 'dark' : 'light' };
  return { ...base, size: c.size === 'full' ? 'full' : 'normal' };
}
