/**
 * F-180: Sortierhilfe. Sources ohne Kategorie werden nach Domain gebündelt; jede Gruppe bekommt
 * einen Vorschlag, damit eine Entscheidung viele Sources auf einmal einsortiert:
 * 1. Stehen andere Sources derselben Domain schon in einer Kategorie, gilt diese (lernt aus der Library).
 * 2. Sonst ein Vorschlag für bekannte Seiten (youtube.com → Video …).
 */
import { addCategory, categoryByName } from './bookmarks';
import type { Bookmark, Workspace } from './types';
import { hostOf } from './workspace';

/** Bekannte Domains → Kategorie. Schlüssel ohne „www.“; Subdomains zählen mit (de.wikipedia.org). */
const KNOWN: Record<string, string[]> = {
  Video: ['youtube.com', 'youtu.be', 'vimeo.com', 'twitch.tv', 'netflix.com', 'disneyplus.com', 'primevideo.com', 'ardmediathek.de', 'zdf.de', 'dailymotion.com'],
  Musik: ['spotify.com', 'soundcloud.com', 'deezer.com', 'bandcamp.com', 'music.apple.com'],
  Entwicklung: ['github.com', 'gitlab.com', 'bitbucket.org', 'stackoverflow.com', 'developer.mozilla.org', 'npmjs.com', 'react.dev', 'vitejs.dev', 'typescriptlang.org', 'docs.python.org', 'w3schools.com', 'codepen.io', 'dev.to', 'vercel.com', 'netlify.com'],
  Jobs: ['stepstone.de', 'indeed.com', 'de.indeed.com', 'arbeitsagentur.de', 'monster.de', 'stellenanzeigen.de', 'kununu.com', 'glassdoor.de'],
  Netzwerk: ['linkedin.com', 'xing.com', 'facebook.com', 'instagram.com', 'x.com', 'twitter.com', 'reddit.com', 'threads.net', 'bsky.app', 'mastodon.social', 'tiktok.com', 'pinterest.com'],
  Nachrichten: ['spiegel.de', 'zeit.de', 'tagesschau.de', 'faz.net', 'sueddeutsche.de', 'welt.de', 'ndr.de', 'abendblatt.de', 'heise.de', 'golem.de', 't3n.de', 'bbc.com', 'nytimes.com', 'theguardian.com'],
  Einkaufen: ['amazon.de', 'amazon.com', 'ebay.de', 'otto.de', 'zalando.de', 'idealo.de', 'kleinanzeigen.de', 'etsy.com', 'mediamarkt.de'],
  Wissen: ['wikipedia.org', 'wikimedia.org', 'duden.de', 'dict.cc', 'leo.org', 'deepl.com', 'britannica.com'],
  Reisen: ['booking.com', 'airbnb.de', 'airbnb.com', 'bahn.de', 'check24.de', 'tripadvisor.de', 'maps.google.com'],
  'Mail & Kalender': ['mail.google.com', 'gmail.com', 'calendar.google.com', 'outlook.live.com', 'outlook.office.com', 'web.de', 'gmx.net', 'proton.me'],
  'KI-Werkzeuge': ['claude.ai', 'chatgpt.com', 'chat.openai.com', 'gemini.google.com', 'perplexity.ai'],
};

/** Domain ohne „www.“, klein. */
export const domainOf = (url: string) => (hostOf(url) || url).toLowerCase().replace(/^www\./, '');

/** Vorschlag aus der eingebauten Liste (auch für Subdomains). */
export function knownCategory(domain: string): string | null {
  for (const [cat, list] of Object.entries(KNOWN)) if (list.some((d) => domain === d || domain.endsWith(`.${d}`))) return cat;
  return null;
}

export interface SortGroup {
  domain: string;
  items: Bookmark[];
  /** Vorgeschlagener Kategorie-Name, null = kein Vorschlag. */
  suggestion: string | null;
  /** true = Vorschlag stammt aus der eigenen Library (andere Sources dieser Domain). */
  learned: boolean;
}

const isLoose = (ws: Workspace, b: Bookmark) => !ws.categories.some((c) => c.id === b.category);

/** Wie viele Sources ohne Kategorie es gibt. */
export const looseCount = (ws: Workspace) => ws.bookmarks.reduce((n, b) => n + (isLoose(ws, b) ? 1 : 0), 0);

/** Gruppen der Sources ohne Kategorie: mit Vorschlag zuerst, dann nach Größe, dann A–Z. */
export function sortGroups(ws: Workspace): SortGroup[] {
  const by = new Map<string, Bookmark[]>();
  for (const b of ws.bookmarks) {
    if (!isLoose(ws, b)) continue;
    const d = domainOf(b.url);
    by.set(d, [...(by.get(d) ?? []), b]);
  }
  const out: SortGroup[] = [];
  for (const [domain, items] of by) {
    // 1. aus der Library lernen: häufigste Kategorie anderer Sources dieser Domain
    const count = new Map<string, number>();
    for (const b of ws.bookmarks) if (!isLoose(ws, b) && domainOf(b.url) === domain) count.set(b.category, (count.get(b.category) ?? 0) + 1);
    const best = [...count].sort((a, b) => b[1] - a[1])[0];
    const learned = best ? ws.categories.find((c) => c.id === best[0])?.name ?? null : null;
    out.push({ domain, items, suggestion: learned ?? knownCategory(domain), learned: !!learned });
  }
  return out.sort((a, b) => Number(!a.suggestion) - Number(!b.suggestion) || b.items.length - a.items.length || a.domain.localeCompare(b.domain));
}

/**
 * Sources in eine Kategorie (per Name) einsortieren; gibt es sie noch nicht, wird sie angelegt.
 * Sie kommen ans Ende der Kategorie, in ihrer bisherigen Reihenfolge.
 */
export function sortInto(ws: Workspace, ids: string[], name: string, makeId: () => string): Workspace {
  const n = name.trim();
  if (!n || !ids.length) return ws;
  let next = categoryByName(ws, n) ? ws : addCategory(ws, makeId(), n);
  const cat = categoryByName(next, n)!.id;
  const set = new Set(ids);
  const moved = next.bookmarks.filter((b) => set.has(b.id)).map((b) => ({ ...b, category: cat }));
  next = { ...next, bookmarks: [...next.bookmarks.filter((b) => !set.has(b.id)), ...moved] };
  return next;
}

/** Alle Vorschläge auf einmal übernehmen; Gruppen ohne Vorschlag bleiben, wie sie sind. */
export function sortAll(ws: Workspace, makeId: () => string): Workspace {
  let next = ws;
  for (const g of sortGroups(ws)) if (g.suggestion) next = sortInto(next, g.items.map((b) => b.id), g.suggestion, makeId);
  return next;
}
