/**
 * F-169 Stufe 2: Abgleich zwischen Geräten über ein geheimes GitHub Gist (bis der eigene Server F-81 kommt).
 *
 * Der Schlüssel (persönliches Zugangs-Token mit nur dem Recht „gist“) liegt nur auf diesem Gerät –
 * nie in der Export-Datei, nie im Testmodus. Das Gist enthält dieselbe Datei wie „Desks als Datei
 * speichern“ (inklusive Profil und Begrüßung; Entscheidung Enrico V58). Geheim heißt nicht verschlüsselt.
 *
 * Regel wie F-121: Hat nur eine Seite seit dem letzten Abgleich geändert, gewinnt sie. Haben beide
 * geändert, fragt E-Sources, welcher Stand bleibt.
 */
import { FILE_NAME, readTransferFile, toTransferFile, type TransferFile } from './transfer';
import { PROBE } from './probe';
import type { Workspace } from './types';

export const GIST_DESC = 'E-Sources Abgleich';
/** Vorausgefüllte GitHub-Seite für einen neuen Schlüssel mit nur dem Recht „gist“. */
export const TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=gist&description=E-Sources%20Abgleich';
export const SIGNUP_URL = 'https://github.com/signup';
const API = 'https://api.github.com';
const KEY = 'esource.gist.v1';

export interface GistConfig {
  token: string;
  /** GitHub-Name des Kontos (nur zur Anzeige). */
  login: string;
  /** Id des Gists; leer, solange noch nichts gesendet wurde. */
  gistId: string;
  /** Speicherzeitpunkt (savedAt) des Stands, der zuletzt geholt oder gesendet wurde. */
  seen: string;
  /** Lokaler Zeitpunkt (ms) des letzten Abgleichs – Änderungen danach gelten als neu. */
  syncedAt: number;
}

const OFF = (typeof window !== 'undefined' && window.self !== window.top) || PROBE;

export function loadGist(): GistConfig | null {
  if (OFF) return null;
  try {
    const c = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<GistConfig> | null;
    if (!c || typeof c.token !== 'string' || !c.token) return null;
    return { token: c.token, login: String(c.login ?? ''), gistId: String(c.gistId ?? ''), seen: String(c.seen ?? ''), syncedAt: Number(c.syncedAt) || 0 };
  } catch {
    return null;
  }
}

export function saveGist(c: GistConfig): void {
  if (OFF) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    // ohne Speicher kein Abgleich
  }
}

export function clearGist(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nichts zu tun
  }
}

export const gistAvailable = !OFF;

export type SyncPlan = 'none' | 'push' | 'pull' | 'conflict';

/** Was ist zu tun? `remoteSavedAt` = null: im Gist liegt noch kein Stand. */
export function planSync(localChangedAt: number, c: Pick<GistConfig, 'seen' | 'syncedAt'>, remoteSavedAt: string | null): SyncPlan {
  if (remoteSavedAt === null) return 'push';
  const local = localChangedAt > c.syncedAt;
  const remote = remoteSavedAt !== c.seen;
  if (local && remote) return 'conflict';
  if (remote) return 'pull';
  if (local) return 'push';
  return 'none';
}

/** Fehler mit verständlichem Text für Anwender. */
export class GistError extends Error {}

/** Bereinigt einen eingefügten Schlüssel (Leerzeichen, Zeilenumbrüche, „token “ davor). */
export const cleanToken = (s: string): string => s.replace(/^\s*(token|bearer)\s+/i, '').replace(/\s+/g, '');

async function gh(token: string, path: string, init: RequestInit = {}): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(API + path, {
      ...init,
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
    });
  } catch {
    throw new GistError('Keine Verbindung zu GitHub. Bist du online?');
  }
  if (res.status === 401) throw new GistError('GitHub kennt diesen Schlüssel nicht (falsch kopiert, abgelaufen oder gelöscht).');
  if (res.status === 403 || res.status === 429) throw new GistError('GitHub lässt das gerade nicht zu (Recht „gist“ fehlt oder zu viele Anfragen). Später noch einmal versuchen.');
  return res;
}

/** Prüft den Schlüssel und sucht ein schon vorhandenes Abgleich-Gist (z. B. vom anderen Gerät). */
export async function connectGist(token: string): Promise<GistConfig> {
  const user = await gh(token, '/user');
  if (!user.ok) throw new GistError(`GitHub antwortet mit Fehler ${user.status}.`);
  const scopes = user.headers.get('x-oauth-scopes');
  if (scopes !== null && !scopes.split(',').map((s) => s.trim()).includes('gist'))
    throw new GistError('Dem Schlüssel fehlt das Recht „gist“. Bitte einen neuen Schlüssel über den Link anlegen – dort ist „gist“ schon angehakt.');
  const login = String(((await user.json()) as { login?: string }).login ?? '');
  const list = await gh(token, '/gists?per_page=100');
  if (!list.ok) throw new GistError(`GitHub antwortet mit Fehler ${list.status}.`);
  const gists = (await list.json()) as { id: string; description: string | null; files: Record<string, unknown> }[];
  const found = gists.find((g) => g.description === GIST_DESC && g.files && FILE_NAME in g.files);
  return { token, login, gistId: found?.id ?? '', seen: '', syncedAt: 0 };
}

/** Holt den Stand aus dem Gist; null, wenn es (noch) keinen gibt. */
export async function fetchRemote(c: GistConfig): Promise<TransferFile | null> {
  if (!c.gistId) return null;
  const res = await gh(c.token, `/gists/${c.gistId}`);
  if (res.status === 404) return null; // Gist gelöscht: beim nächsten Senden neu anlegen
  if (!res.ok) throw new GistError(`GitHub antwortet mit Fehler ${res.status}.`);
  const g = (await res.json()) as { files: Record<string, { content?: string; truncated?: boolean; raw_url?: string } | null> };
  const f = g.files?.[FILE_NAME];
  if (!f) return null;
  let text = f.content ?? '';
  if (f.truncated && f.raw_url) {
    try {
      text = await (await fetch(f.raw_url, { cache: 'no-store' })).text();
    } catch {
      throw new GistError('Keine Verbindung zu GitHub. Bist du online?');
    }
  }
  const r = readTransferFile(text);
  if (r.ok) return r.file;
  throw new GistError(`Der Stand auf GitHub ist nicht lesbar: ${r.error}`);
}

/** Sendet den Stand; legt das geheime Gist beim ersten Mal an. Liefert Gist-Id und savedAt. */
export async function pushRemote(c: GistConfig, ws: Workspace, device: string): Promise<{ gistId: string; savedAt: string }> {
  const file = toTransferFile(ws, device);
  const body = JSON.stringify({ description: GIST_DESC, files: { [FILE_NAME]: { content: JSON.stringify(file) } } });
  let res = c.gistId ? await gh(c.token, `/gists/${c.gistId}`, { method: 'PATCH', body }) : null;
  if (!res || res.status === 404) {
    res = await gh(c.token, '/gists', { method: 'POST', body: JSON.stringify({ ...JSON.parse(body), public: false }) });
  }
  if (!res.ok) throw new GistError(`GitHub antwortet mit Fehler ${res.status}.`);
  const id = String(((await res.json()) as { id?: string }).id ?? c.gistId);
  return { gistId: id, savedAt: file.savedAt };
}
