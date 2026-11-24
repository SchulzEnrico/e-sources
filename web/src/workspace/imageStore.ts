/**
 * F-215 (V79, Entscheidungen B1–B3): Bilder im Text der Notiz liegen nur auf diesem Gerät – in einer eigenen
 * Datenbank des Browsers (IndexedDB `esource.images`), wie die Töne (audioStore.ts). Im Markdown steht nur
 * `![Beschreibung](es-img:<Schlüssel>)` (noteDoc.ts). Beim Anhängen wird auf 1600 px lange Kante verkleinert (B3).
 * Bilder ohne Notiz (auch nicht im Entwurf) fallen beim Start weg, wenn älter als ein Tag (wie beim Ton).
 */
import { SWEEP_AGE_MS, sweepable } from './audioStore';

const DB = 'esource.images';
const STORE = 'pics';
/** B3: lange Kante höchstens so viele Pixel */
export const IMG_MAX_PX = 1600;
/** JPEG-Güte beim Verkleinern */
export const IMG_QUALITY = 0.82;

export interface Pic {
  id: string;
  blob: Blob;
  mime: string;
  w: number;
  h: number;
  /** angelegt (ms seit 1970) */
  at: number;
}

/** Zielgröße: lange Kante höchstens `max`, Seitenverhältnis bleibt, nie vergrößern (rein, für den Test) */
export function fitSize(w: number, h: number, max = IMG_MAX_PX): { w: number; h: number } {
  if (!(w > 0) || !(h > 0)) return { w: 0, h: 0 };
  const f = Math.min(1, max / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * f)), h: Math.max(1, Math.round(h * f)) };
}

/** V80 (B4): Dateiname zum Sichern: Bild-2026-11-24-2104.jpg */
export function picFileName(at: number, mime: string): string {
  const d = new Date(at);
  const p = (n: number) => String(n).padStart(2, '0');
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  return `Bild-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.${ext}`;
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

export const putPic = (p: Pic) => run('readwrite', (s) => s.put(p)).then(() => true, () => false);
export const getPic = (id: string) => run<Pic | undefined>('readonly', (s) => s.get(id) as IDBRequest<Pic | undefined>).catch(() => undefined);
export const delPic = (id: string) => run('readwrite', (s) => s.delete(id)).then(() => true, () => false);

/** Bilder ohne Notiz entfernen (beim Start) */
export async function sweepPics(refs: Set<string>, now = Date.now()): Promise<number> {
  const all = await run<Pic[]>('readonly', (s) => s.getAll() as IDBRequest<Pic[]>).catch(() => [] as Pic[]);
  const gone = sweepable(all.map((p) => ({ id: p.id, at: p.at })), refs, now);
  for (const id of gone) await delPic(id);
  return gone.length;
}
export { SWEEP_AGE_MS };

/**
 * Bild aus Datei, Kamera, Zwischenablage oder Ziehen verkleinern (B3). Im Browser: createImageBitmap + Canvas.
 * PNG ohne Verkleinerungsbedarf und unter 400 KB bleibt wie es ist (Bildschirmfotos mit Schrift bleiben scharf).
 */
export async function shrinkImage(file: Blob): Promise<{ blob: Blob; mime: string; w: number; h: number } | null> {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  } catch {
    return null;
  }
  const { w, h } = fitSize(bmp.width, bmp.height);
  if (!w) return null;
  if (w === bmp.width && file.type === 'image/png' && file.size < 400 * 1024) {
    bmp.close();
    return { blob: file, mime: 'image/png', w, h };
  }
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  if (!g) return null;
  g.fillStyle = '#fff'; // JPEG kennt keine Transparenz
  g.fillRect(0, 0, w, h);
  g.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/jpeg', IMG_QUALITY));
  return blob ? { blob, mime: 'image/jpeg', w, h } : null;
}

/** Ändert sich der Bestand, melden sich die Bilder im Editor neu */
export const PIC_EVENT = 'esource:pics';
