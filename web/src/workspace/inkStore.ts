/**
 * V143 (F-238 Handschrift, S8 „speichern wie Sprachnotizen“): Die Striche liegen nur auf diesem Gerät – in der
 * Datenbank des Browsers (IndexedDB `esource.ink`), getrennt von der Arbeitsfläche (localStorage, Gist). Die Notiz
 * merkt sich nur den Verweis (NoteAttachment kind 'ink'), wie bei Ton (audioStore.ts) und Bildern (imageStore.ts).
 *
 * Löschen: Tinte geht mit ihrer Notiz in den Papierkorb (Rückgängig behält den Verweis). Endgültig weg ist sie beim
 * nächsten Start, wenn keine Notiz bzw. Unterschrift mehr auf sie zeigt und sie älter als ein Tag ist.
 */
import type { InkStroke } from './ink';
import { parseStrokes } from './ink';

const DB = 'esource.ink';
const STORE = 'ink';
export const INK_SWEEP_AGE_MS = 24 * 60 * 60 * 1000;

export interface InkRecord {
  id: string;
  strokes: InkStroke[];
  w: number;
  h: number;
  /** angelegt bzw. zuletzt geändert (ms seit 1970) */
  at: number;
}

let opening: Promise<IDBDatabase> | null = null;
function db(): Promise<IDBDatabase> {
  if (opening) return opening;
  opening = new Promise<IDBDatabase>((ok, fail) => {
    if (typeof indexedDB === 'undefined') return fail(new Error('IndexedDB fehlt'));
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fail(r.error ?? new Error('IndexedDB'));
  });
  opening.catch(() => (opening = null));
  return opening;
}

function run<T>(mode: IDBTransactionMode, work: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then(
    (d) =>
      new Promise<T>((ok, fail) => {
        const tx = d.transaction(STORE, mode);
        const req = work(tx.objectStore(STORE));
        tx.oncomplete = () => ok(req.result);
        tx.onerror = () => fail(tx.error ?? new Error('IndexedDB'));
        tx.onabort = () => fail(tx.error ?? new Error('IndexedDB'));
      }),
  );
}

export const putInk = (r: InkRecord) => run('readwrite', (s) => s.put(r)).then(() => true, () => false);
export async function getInk(id: string): Promise<InkRecord | undefined> {
  const r = await run<InkRecord | undefined>('readonly', (s) => s.get(id) as IDBRequest<InkRecord | undefined>).catch(() => undefined);
  return r ? { ...r, strokes: parseStrokes(r.strokes) } : undefined;
}
export const delInk = (id: string) => run('readwrite', (s) => s.delete(id)).then(() => true, () => false);

/** Welche Tinten dürfen weg? (rein, für den Test) */
export function inkSweepable(items: { id: string; at: number }[], refs: Set<string>, now: number): string[] {
  return items.filter((c) => !refs.has(c.id) && now - c.at > INK_SWEEP_AGE_MS).map((c) => c.id);
}

/** Tinte ohne Notiz entfernen (beim Start). */
export async function sweepInk(refs: Set<string>, now = Date.now()): Promise<number> {
  const all = await run<InkRecord[]>('readonly', (s) => s.getAll() as IDBRequest<InkRecord[]>).catch(() => [] as InkRecord[]);
  const gone = inkSweepable(all.map((r) => ({ id: r.id, at: r.at })), refs, now);
  for (const id of gone) await delInk(id);
  return gone.length;
}

/** Ändert sich der Bestand, melden sich Vorschauen neu */
export const INK_EVENT = 'esource:inkstore';
export const inkChanged = () => window.dispatchEvent(new Event(INK_EVENT));

/** V143: Schreibfläche öffnen – überall per Ereignis (Halbkreis, Menü, Parkplatz, Alt/⌥+W, Formular).
 *  `note` = an diese Notiz hängen; `ref` = vorhandene Handschrift bearbeiten; ohne beides = neue Notiz im Eingang. */
export const INK_OPEN = 'esource:ink';
export interface InkOpenDetail {
  note?: string;
  ref?: string;
  /** Unterschrift im Steckbrief: Projekt und Feld */
  sign?: { project: string; field: 'inkAg' | 'inkPl'; label: string };
  /** Meldung am Ort des Geschehens (z. B. am Freigabe-Feld) statt oben in der Mitte */
  onDone?: (text: string) => void;
}
export const openInk = (d: InkOpenDetail = {}) => window.dispatchEvent(new CustomEvent<InkOpenDetail>(INK_OPEN, { detail: d }));
