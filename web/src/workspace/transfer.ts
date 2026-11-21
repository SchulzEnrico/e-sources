import { parseWorkspace, type SyncMeta } from './storage';
import type { Workspace } from './types';

/**
 * F-121: Abgleich zwischen Geräten per JSON-Datei, bis der Server (F-81) kommt.
 *
 * Regel: Die geladene Datei ersetzt die Arbeitsfläche des Geräts. Wurde auf diesem Gerät seit dem
 * letzten Export oder Import etwas geändert und ist dieser Stand neuer als die Datei, wird vorher
 * gefragt.
 */
export const FILE_FORMAT = 'e-sources-arbeitsflaeche';
/**
 * Version 4: Areas mit Namen (F-128, V09). Version 3 (Lesezeichen, V08), 2 (Panels mit Tabs, V07)
 * und 1 werden beim Import umgewandelt.
 */
export const FILE_VERSION = 4;
export const FILE_NAME = 'e-sources-arbeitsflaeche.json';

export interface TransferFile {
  format: typeof FILE_FORMAT;
  version: number;
  /** Zeitpunkt des Exports (ISO 8601). */
  savedAt: string;
  /** Grobe Gerätebezeichnung, z. B. „Mac“ oder „iPhone“. */
  device: string;
  workspace: Workspace;
}

export function toTransferFile(ws: Workspace, device: string, now = new Date()): TransferFile {
  return { format: FILE_FORMAT, version: FILE_VERSION, savedAt: now.toISOString(), device, workspace: ws };
}

export type ReadResult = { ok: true; file: TransferFile } | { ok: false; error: string };

/** Liest den Inhalt einer exportierten Datei und prüft ihn. */
export function readTransferFile(text: string): ReadResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Die Datei ist kein gültiges JSON.' };
  }
  if (!data || typeof data !== 'object') return { ok: false, error: 'Die Datei enthält keine Arbeitsfläche.' };
  const d = data as Record<string, unknown>;
  if (d.format !== FILE_FORMAT) return { ok: false, error: 'Das ist keine Arbeitsflächen-Datei von E-Sources.' };
  if (typeof d.version !== 'number' || d.version > FILE_VERSION)
    return { ok: false, error: 'Die Datei stammt aus einer neueren E-Sources-Version. Bitte diese Seite neu laden.' };
  const savedAt = typeof d.savedAt === 'string' && !Number.isNaN(Date.parse(d.savedAt)) ? d.savedAt : null;
  if (!savedAt) return { ok: false, error: 'In der Datei fehlt der Speicherzeitpunkt.' };
  const ws = parseWorkspace(d.workspace);
  if (!ws) return { ok: false, error: 'Die Arbeitsfläche in der Datei ist beschädigt.' };
  const device = typeof d.device === 'string' ? d.device : 'unbekanntes Gerät';
  return { ok: true, file: { format: FILE_FORMAT, version: d.version, savedAt, device, workspace: ws } };
}

/** Regel F-121: Muss vor dem Import gefragt werden? */
export function needsConfirm(meta: SyncMeta, fileSavedAt: string): boolean {
  const fileTime = Date.parse(fileSavedAt);
  return meta.changedAt > meta.syncedAt && meta.changedAt > fileTime;
}

/** Grobe Gerätebezeichnung aus der Browserkennung. */
export function deviceLabel(ua: string, touch: boolean): string {
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && touch)) return 'iPad';
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? 'Android-Handy' : 'Android-Tablet';
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows-PC';
  if (/Linux/.test(ua)) return 'Linux-PC';
  return 'Gerät';
}
