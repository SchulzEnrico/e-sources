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
