import type { Workspace } from './types';

/**
 * F-189: Web-Suche. Suchmaschinen lassen sich nicht in ein Portal einbetten (gesperrt wie F-43);
 * darum öffnet die Suche in einem neuen Browser-Tab, und Treffer kommen per Ziehen (Stufe 1)
 * bzw. „An E-Sources senden“ (Stufe 2) zurück.
 */
export const ENGINES = [
  { id: 'google', name: 'Google', url: 'https://www.google.com/search?q=' },
  { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
  { id: 'ecosia', name: 'Ecosia', url: 'https://www.ecosia.org/search?q=' },
  { id: 'bing', name: 'Bing', url: 'https://www.bing.com/search?q=' },
] as const;
export type EngineId = (typeof ENGINES)[number]['id'];
export const ENGINE_DEFAULT: EngineId = 'google';

export const isEngine = (v: unknown): v is EngineId => ENGINES.some((e) => e.id === v);
export const engineOf = (ws: Pick<Workspace, 'engine'>) => ENGINES.find((e) => e.id === ws.engine) ?? ENGINES[0];

/** Adresse der Suche nach `query` in der gewählten Suchmaschine. */
export const searchUrl = (ws: Pick<Workspace, 'engine'>, query: string): string => engineOf(ws).url + encodeURIComponent(query.trim());

/**
 * Ist die Eingabe eine Adresse (statt Suchwörter)? Adresse = ohne Leerzeichen und mit Schema,
 * Punkt zwischen Zeichen (beispiel.de), localhost oder IP.
 */
export function looksLikeAddress(input: string): boolean {
  const t = input.trim();
  if (!t || /\s/.test(t)) return false;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(t)) return true;
  if (/^(localhost|\d{1,3}(\.\d{1,3}){3})(:\d+)?(\/|$)/i.test(t)) return true;
  return /^[^./]+(\.[^./]+)*\.[a-z]{2,}(:\d+)?(\/.*)?$/i.test(t);
}

/** Suchmaschine wählen; die Voreinstellung wird nicht eigens gespeichert. */
export function setEngine(ws: Workspace, id: string): Workspace {
  if (!isEngine(id)) return ws;
  const { engine: _drop, ...rest } = ws;
  return id === ENGINE_DEFAULT ? rest : { ...rest, engine: id };
}

/**
 * Suche in eigenem Browserfenster rechts neben E-Sources öffnen (Wunsch Enrico V41: so lassen
 * sich Treffer intuitiv herüberziehen). Auf Touch-Geräten später anders lösen (F-189 Stufe 2).
 */
export function openBeside(url: string): void {
  const s = window.screen;
  const w = Math.round(s.availWidth / 2);
  const left = Math.round(((s as Screen & { availLeft?: number }).availLeft ?? 0) + s.availWidth - w);
  const top = (s as Screen & { availTop?: number }).availTop ?? 0;
  window.open(url, '_blank', `popup,noopener,noreferrer,width=${w},height=${s.availHeight},left=${left},top=${top}`);
}
