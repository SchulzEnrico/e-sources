import type { Workspace } from './types';
import type { ScreenSetup } from './screen';
import { addArea } from './workspace';
import { openBookmark } from './bookmarks';
/**
 * F-189 Stufe 2: „An E-Sources senden“. Ein Lesezeichen (Bookmarklet) in der Lesezeichenleiste des
 * Browsers öffnet E-Sources mit `?open=<Adresse der gerade offenen Seite>`. Diese kurzlebige Instanz
 * fragt über einen eigenen BroadcastChannel, welche E-Sources-Fenster offen sind; das Fenster, das
 * zuletzt im Vordergrund war, nimmt die Seite in sein aktives Portal (wie ein Treffer der Suche:
 * schon offen = hinwechseln, leerer Tab = dort, sonst neuer Tab). Antwortet keines, öffnet die
 * Instanz selbst als Main Desk mit der Seite.
 */

export const SEND_PARAM = 'open';
/** So lange wartet die sendende Instanz auf Antworten der offenen Fenster. */
export const SEND_WAIT_MS = 500;
export const sendChannel = (probe: boolean) => (probe ? 'esource.send.test' : 'esource.send');

/** Ein Portal, das ein Fenster als Ziel anbietet (Wahl im kleinen Fenster). */
export interface SendTarget {
  id: string;
  name: string;
  /** Name des Slots (für die Gruppe in der Auswahl). */
  slot: string;
}

export type SendMsg =
  | { t: 'ask'; id: string }
  | { t: 'offer'; id: string; win: string; from: string; at: number; desk: string; portal: string | null; active?: string | null; targets?: SendTarget[] }
  /** panel: fehlt = aktives Portal; null = neuer Slot; sonst dieses Portal. */
  | { t: 'take'; id: string; win: string; from: string; url: string; panel?: string | null };

export type Offer = Extract<SendMsg, { t: 'offer' }>;

/** Gesendete Adresse aus der Adresse dieser Instanz; nur http(s), sonst null. */
export function sentUrl(search: string): string | null {
  const raw = new URLSearchParams(search).get(SEND_PARAM);
  if (!raw) return null;
  try {
    const u = new URL(raw.trim());
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}

/** Adresse ohne `?open=…` (damit Neuladen die Seite nicht noch einmal sendet). */
export function withoutSent(href: string): string {
  const u = new URL(href);
  u.searchParams.delete(SEND_PARAM);
  return u.href;
}

/** Wartezeit im kleinen Fenster, bevor es von selbst an das voreingestellte Ziel sendet. */
export const SEND_AUTO_S = 10;

/** Wert eines Ziels in der Auswahl: `<win>|<panel>` bzw. `<win>|` für einen neuen Slot. */
export const targetValue = (win: string, panel: string | null) => `${win}|${panel ?? ''}`;
export function parseTarget(v: string): { win: string; panel: string | null } {
  const i = v.lastIndexOf('|');
  const panel = v.slice(i + 1);
  return { win: v.slice(0, i), panel: panel || null };
}
/** Voreingestelltes Ziel: aktives Portal des zuletzt benutzten Fensters, sonst dort ein neuer Slot. */
export function defaultTarget(o: Offer): string {
  return targetValue(o.win, o.active ?? null);
}

/** Hat der Desk dieses Fensters Portale? */
export const hasPortals = (o: Offer) => (o.targets ? o.targets.length > 0 : o.portal !== null);

/**
 * Welches Fenster bekommt die Seite? Desks mit Portalen vor leeren; darunter das zuletzt im
 * Vordergrund; bei Gleichstand der Main Desk.
 */
export function pickOffer(offers: readonly Offer[]): Offer | null {
  let best: Offer | null = null;
  const rank = (o: Offer): [number, number, number] => [hasPortals(o) ? 1 : 0, o.at, o.win === '' ? 1 : 0];
  for (const o of offers) {
    if (!best) {
      best = o;
      continue;
    }
    const a = rank(o);
    const b = rank(best);
    if (a[0] > b[0] || (a[0] === b[0] && (a[1] > b[1] || (a[1] === b[1] && a[2] > b[2])))) best = o;
  }
  return best;
}

/**
 * Adresse, an die das Lesezeichen sendet: diese Anwendung ohne Fenster- und andere Parameter;
 * im Testmodus mit `test=…`, damit die Testfenster antworten.
 */
export function sendBase(href: string, test: string | null): string {
  const u = new URL(href);
  const base = new URL(u.origin + u.pathname);
  if (test) base.searchParams.set('test', test);
  return base.href;
}

/**
 * Code des Lesezeichens. Öffnet ein kleines Fenster (Name „esource-send“), das sich nach dem
 * Weiterreichen selbst schließt. Seiten, die keine Fenster zulassen, bekommen E-Sources im selben Tab.
 */
/** Name des Lesezeichens in der Lesezeichenleiste (eigene Favicons gibt es für solche Lesezeichen nicht). */
export const BOOKMARK_NAME = 'Öffnen in';

export function bookmarklet(base: string): string {
  const sep = base.includes('?') ? '&' : '?';
  const target = JSON.stringify(base + sep + SEND_PARAM + '=');
  return `javascript:(function(){var u=${target}+encodeURIComponent(location.href);var w=window.open(u,'esource-send','popup=yes,width=520,height=460');if(!w)location.href=u;})();`;
}

/** Kein Portal da (oder „Neuer Slot“ gewählt): neuen Slot anlegen und die Seite dort öffnen. */
export function openInNewSlot(ws: Workspace, setup: ScreenSetup, url: string): Workspace {
  const next = addArea(ws, setup, 'right');
  const known = new Set(ws.panels.map((p) => p.id));
  const fresh = next.panels.find((p) => !known.has(p.id));
  return fresh ? openBookmark(next, fresh.id, url).ws : next;
}

/**
 * Lesezeichen-Datei (Netscape-Format) mit dem Lesezeichen und eigenem Symbol. Ein Bookmarklet,
 * das man nur zieht, zeigt im Browser kein eigenes Symbol; beim Import einer solchen Datei
 * übernimmt der Browser das Symbol aus `ICON`.
 */
export function bookmarkFile(code: string, icon: string, name = BOOKMARK_NAME): string {
  const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE>',
    '<H1>Bookmarks</H1>',
    '<DL><p>',
    `    <DT><A HREF="${esc(code)}" ICON="${esc(icon)}">${esc(name)}</A>`,
    '</DL><p>',
    '',
  ].join('\n');
}
export const BOOKMARK_FILE = 'E-Sources-senden.html';
