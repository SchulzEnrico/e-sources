/**
 * F-215 (V79, Entscheidung T1 „C wie B“): Tonaufnahmen der Sprachnotiz liegen nur auf diesem Gerät – in der
 * Datenbank des Browsers (IndexedDB), getrennt von der Arbeitsfläche (localStorage, Gist). Die Notiz merkt sich
 * nur den Verweis (NoteAttachment kind 'audio'). Abgleich zwischen Geräten folgt mit dem eigenen Server (F-81).
 *
 * Löschen (T8): Ein Ton geht mit seiner Notiz in den Papierkorb (das Rückgängig der Notiz behält den Verweis).
 * Endgültig weg ist er beim nächsten Start, wenn keine Notiz mehr auf ihn zeigt und er älter als ein Tag ist.
 */

const DB = 'esource.audio';
const STORE = 'clips';
/** Erst nach dieser Zeit darf ein Ton ohne Notiz weg – schützt frisch aufgenommene, noch nicht gespeicherte */
export const SWEEP_AGE_MS = 24 * 60 * 60 * 1000;

export interface Clip {
  id: string;
  blob: Blob;
  mime: string;
  /** Länge in Sekunden */
  dur: number;
  /** aufgenommen (ms seit 1970) */
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

export const putClip = (c: Clip) => run('readwrite', (s) => s.put(c)).then(() => true, () => false);
export const getClip = (id: string) => run<Clip | undefined>('readonly', (s) => s.get(id) as IDBRequest<Clip | undefined>).catch(() => undefined);
export const delClip = (id: string) => run('readwrite', (s) => s.delete(id)).then(() => true, () => false);
/** Schlüssel und Zeitpunkt aller Töne auf diesem Gerät */
async function listClips(): Promise<{ id: string; at: number }[]> {
  const all = await run<Clip[]>('readonly', (s) => s.getAll() as IDBRequest<Clip[]>).catch(() => [] as Clip[]);
  return all.map((c) => ({ id: c.id, at: c.at }));
}

/** Welche Töne dürfen weg? (rein, für den Test) */
export function sweepable(clips: { id: string; at: number }[], refs: Set<string>, now: number): string[] {
  return clips.filter((c) => !refs.has(c.id) && now - c.at > SWEEP_AGE_MS).map((c) => c.id);
}

/** Töne ohne Notiz entfernen (beim Start). Gibt die Zahl der entfernten zurück. */
export async function sweepClips(refs: Set<string>, now = Date.now()): Promise<number> {
  const gone = sweepable(await listClips(), refs, now);
  for (const id of gone) await delClip(id);
  return gone.length;
}

/** Ändert sich der Bestand (neuer oder gelöschter Ton), melden sich die Chips neu */
export const CLIP_EVENT = 'esource:clips';
export const clipsChanged = () => window.dispatchEvent(new Event(CLIP_EVENT));
