/**
 * V50: Hinweis unten (Flash) aus beliebigen Bauteilen auslösen, ohne Props durch alle Ebenen zu reichen.
 * App.tsx hört auf das Ereignis und zeigt den Text mit optionalem Knopf (z. B. „Rückgängig“).
 */
export const FLASH_EVENT = 'esource:flash';

export interface FlashRequest {
  text: string;
  ms?: number;
  action?: { label: string; run: () => void };
}

export function flash(r: FlashRequest): void {
  window.dispatchEvent(new CustomEvent<FlashRequest>(FLASH_EVENT, { detail: r }));
}

/** V79 (Wunsch Enrico): Meldungen am Ort – z. B. „gelöscht · Rückgängig“ – stehen nur 2 Sekunden (Werk). */
export const NOTICE_MS = 2000;

/**
 * F-218 A1 (V92): eingestellte Dauer der Meldungen am Ort; `null` = bis zum nächsten Klick. App setzt den Wert
 * aus `noticeMs(ws)`, sobald sich die Regel ändert – so müssen die Bauteile die Arbeitsfläche nicht kennen.
 */
let noticeSetting: number | null = NOTICE_MS;
export const setNoticeMs = (ms: number | null) => void (noticeSetting = ms);
export const noticeNow = () => noticeSetting;

/**
 * Meldung am Ort nach der eingestellten Dauer schließen (`factor` = länger, z. B. 3 für Meldungen mit mehr Text;
 * `cap` = höchstens so lange). „Bis zum nächsten Klick“: schließt beim nächsten Zeigerdruck irgendwo; gibt 0 zurück
 * (clearTimeout(0) schadet nicht – ein späterer Klick schließt dann eben auch die neuere Meldung, wie gewünscht).
 */
export function noticeLater(close: () => void, factor = 1, cap?: number): number {
  if (noticeSetting === null) {
    window.setTimeout(() => document.addEventListener('pointerdown', () => window.setTimeout(close, 0), { capture: true, once: true }), 0);
    return 0;
  }
  const ms = noticeSetting * factor;
  return window.setTimeout(close, cap === undefined ? ms : Math.min(cap, ms));
}
