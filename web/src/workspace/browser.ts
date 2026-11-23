/**
 * F-197: Welcher Browser, welches System? Für die Anleitung „Öffnen in einrichten“ – jeder Browser
 * importiert Lesezeichen auf eigenem Weg. Rein (nur die Kennung als Eingabe), damit testbar.
 */
export type BrowserName = 'Chrome' | 'Edge' | 'Firefox' | 'Safari';

/** Browser aus der Kennung (userAgent); unbekannt (z. B. Opera, Brave mit eigener Kennung) = null. */
export function browserOf(ua: string): BrowserName | null {
  if (/Edg(A|iOS)?\//.test(ua)) return 'Edge';
  if (/OPR\/|Opera|YaBrowser|Vivaldi/.test(ua)) return null;
  if (/Firefox\/|FxiOS\//.test(ua)) return 'Firefox';
  if (/Chrome\/|CriOS\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return null;
}

/** Taste für Kürzel: ⌘ auf dem Mac (und iPhone/iPad), sonst Strg. */
export const modKey = (ua: string): string => (/Mac|iPhone|iPad/.test(ua) ? '⌘' : 'Strg');

/** Kennung dieses Browsers (leer außerhalb des Browsers, z. B. in Tests). */
export const currentUa = (): string => (typeof navigator === 'undefined' ? '' : navigator.userAgent);
