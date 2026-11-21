/**
 * Lesezeichen und Kategorien (F-14, F-20, F-30 bis F-33). Alle Lesezeichen liegen in der
 * Gesamtsammlung; die Sammlung eines Panels sind die, die ihm zugeordnet sind (F-32).
 */
import type { Bookmark, Named, Workspace } from './types';
import { TAB_MAX, activeTab, addTab, hostOf, navigatePanel, normalizeUrl, selectTab } from './workspace';

/** Kategorie-Id für Lesezeichen ohne Kategorie. */
export const NO_CATEGORY = '';

/** Tags aus einer Eingabe wie „react, Doku, #css“: getrimmt, ohne #, ohne Doppelte. */
export function parseTags(input: string | string[]): string[] {
  const raw = Array.isArray(input) ? input : input.split(',');
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of raw) {
    const t = r.trim().replace(/^#+/, '').trim();
    const k = t.toLowerCase();
    if (t && !seen.has(k)) {
      seen.add(k);
      out.push(t);
    }
  }
  return out;
}

/** Gleiche Seite? Ohne Schreibweise des Hosts und ohne abschließenden Schrägstrich. */
export function sameUrl(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  const key = (u: string) => {
    try {
      const x = new URL(normalizeUrl(u));
      return `${x.protocol}//${x.host.toLowerCase()}${x.pathname.replace(/\/+$/, '')}${x.search}${x.hash}`;
    } catch {
      return u.trim().replace(/\/+$/, '');
    }
  };
  return key(a) === key(b);
}

// ---------------------------------------------------------------- Kategorien

/** Kategorie mit diesem Namen (Groß-/Kleinschreibung egal). */
export function categoryByName(ws: Workspace, name: string): Named | undefined {
  const n = name.trim().toLowerCase();
  return ws.categories.find((c) => c.name.toLowerCase() === n);
}

/** Neue Kategorie; gibt es den Namen schon, bleibt alles, wie es ist. */
export function addCategory(ws: Workspace, id: string, name: string): Workspace {
  const n = name.trim();
  if (!n || ws.categories.some((c) => c.id === id) || categoryByName(ws, n)) return ws;
  return { ...ws, categories: [...ws.categories, { id, name: n }] };
}

export function renameCategory(ws: Workspace, id: string, name: string): Workspace {
  const n = name.trim();
  const other = categoryByName(ws, n);
  if (!n || (other && other.id !== id)) return ws;
  return { ...ws, categories: ws.categories.map((c) => (c.id === id ? { ...c, name: n } : c)) };
}

/** Kategorie löschen; ihre Lesezeichen bleiben und stehen danach unter „Ohne Kategorie“. */
export function deleteCategory(ws: Workspace, id: string): Workspace {
  if (!ws.categories.some((c) => c.id === id)) return ws;
  return {
    ...ws,
    categories: ws.categories.filter((c) => c.id !== id),
    bookmarks: ws.bookmarks.map((b) => (b.category === id ? { ...b, category: NO_CATEGORY } : b)),
  };
}

/** Kategorie in der Reihenfolge verschieben. */
export function moveCategory(ws: Workspace, id: string, to: number): Workspace {
  const from = ws.categories.findIndex((c) => c.id === id);
  const target = Math.max(0, Math.min(ws.categories.length - 1, to));
  if (from < 0 || from === target) return ws;
  const categories = [...ws.categories];
  const [c] = categories.splice(from, 1);
  categories.splice(target, 0, c);
  return { ...ws, categories };
}

// ---------------------------------------------------------------- Lesezeichen

/**
 * F-31: Lesezeichen anlegen oder ändern (gleiche Id). Ohne Titel gilt die Domain. Wechselt es die
 * Kategorie, steht es dort am Ende.
 */
export function saveBookmark(ws: Workspace, d: Bookmark): Workspace {
  const url = normalizeUrl(d.url);
  if (!url) return ws;
  const panels = [...new Set(d.panels)].filter((id) => ws.panels.some((p) => p.id === id));
  const category = ws.categories.some((c) => c.id === d.category) ? d.category : NO_CATEGORY;
  const b: Bookmark = { id: d.id, title: d.title.trim() || hostOf(url) || url, url, category, tags: parseTags(d.tags), panels };
  const note = d.note?.trim();
  if (note) b.note = note;
  const i = ws.bookmarks.findIndex((x) => x.id === d.id);
  if (i < 0) return { ...ws, bookmarks: [...ws.bookmarks, b] };
  const bookmarks = [...ws.bookmarks];
  if (bookmarks[i].category === category) bookmarks[i] = b;
  else {
    bookmarks.splice(i, 1);
    bookmarks.push(b);
  }
  return { ...ws, bookmarks };
}

export function deleteBookmark(ws: Workspace, id: string): Workspace {
  if (!ws.bookmarks.some((b) => b.id === id)) return ws;
  return { ...ws, bookmarks: ws.bookmarks.filter((b) => b.id !== id) };
}

/**
 * F-31: Lesezeichen per Ziehen sortieren. `to` ist die Position innerhalb der Ziel-Kategorie
 * (ohne das Lesezeichen selbst gezählt); mit `category` wechselt es dabei die Kategorie.
 */
export function moveBookmark(ws: Workspace, id: string, to: number, category?: string): Workspace {
  const b = ws.bookmarks.find((x) => x.id === id);
  if (!b) return ws;
  const cat = category === undefined ? b.category : ws.categories.some((c) => c.id === category) ? category : NO_CATEGORY;
  const moved = cat === b.category ? b : { ...b, category: cat };
  const rest = ws.bookmarks.filter((x) => x.id !== id);
  const peers = rest.filter((x) => x.category === cat);
  const k = Math.max(0, Math.min(to, peers.length));
  const at = k < peers.length ? rest.indexOf(peers[k]) : peers.length ? rest.indexOf(peers[peers.length - 1]) + 1 : rest.length;
  rest.splice(at, 0, moved);
  return { ...ws, bookmarks: rest };
}

/**
 * F-31: Lesezeichen auf ein anderes ziehen. Nach unten gezogen landet es hinter dem Ziel, nach oben
 * davor; liegt das Ziel in einer anderen Kategorie, wechselt es dorthin (vor das Ziel).
 */
export function dropBookmark(ws: Workspace, id: string, targetId: string): Workspace {
  const b = ws.bookmarks.find((x) => x.id === id);
  const t = ws.bookmarks.find((x) => x.id === targetId);
  if (!b || !t || id === targetId) return ws;
  const peers = ws.bookmarks.filter((x) => x.category === t.category && x.id !== id);
  let to = peers.indexOf(t);
  if (b.category === t.category && ws.bookmarks.indexOf(b) < ws.bookmarks.indexOf(t)) to += 1;
  return moveBookmark(ws, id, to, t.category);
}

/** F-32: Lesezeichen der Sammlung eines Panels zuordnen oder dort herausnehmen. */
export function toggleBookmarkPanel(ws: Workspace, id: string, panelId: string): Workspace {
  if (!ws.panels.some((p) => p.id === panelId)) return ws;
  return {
    ...ws,
    bookmarks: ws.bookmarks.map((b) =>
      b.id !== id ? b : { ...b, panels: b.panels.includes(panelId) ? b.panels.filter((x) => x !== panelId) : [...b.panels, panelId] },
    ),
  };
}

/** Erstes Lesezeichen für diese Adresse, bevorzugt eines aus der Sammlung des Panels. */
export function bookmarkOf(ws: Workspace, url: string | undefined, panelId?: string): Bookmark | undefined {
  if (!url) return undefined;
  const hits = ws.bookmarks.filter((b) => sameUrl(b.url, url));
  return hits.find((b) => panelId && b.panels.includes(panelId)) ?? hits[0];
}

// ---------------------------------------------------------------- Menü der Sammlung (F-20)

export interface Group {
  /** null = ohne Kategorie. */
  category: Named | null;
  items: Bookmark[];
}

/** Trifft die Suche (F-34: Titel, URL, Kategorie, Tags; mehrere Wörter = alle müssen passen)? */
export function matches(ws: Workspace, b: Bookmark, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const cat = ws.categories.find((c) => c.id === b.category)?.name ?? '';
  const hay = [b.title, b.url, cat, ...b.tags, b.note ?? ''].join(' ').toLowerCase();
  return words.every((w) => hay.includes(w.replace(/^#/, '')));
}

/**
 * Lesezeichen nach Kategorien gegliedert, in deren Reihenfolge; „Ohne Kategorie“ zuletzt.
 * `panelId` = nur die Sammlung dieses Panels, sonst die Gesamtsammlung (F-33).
 * Leere Kategorien erscheinen nur in der Gesamtsammlung ohne Suche (als Ziel zum Hineinziehen).
 */
export function groups(ws: Workspace, panelId: string | null, query = ''): Group[] {
  const list = ws.bookmarks.filter((b) => (!panelId || b.panels.includes(panelId)) && matches(ws, b, query));
  const showEmpty = !panelId && !query.trim();
  const out: Group[] = [];
  for (const c of ws.categories) {
    const items = list.filter((b) => b.category === c.id);
    if (items.length || showEmpty) out.push({ category: c, items });
  }
  const loose = list.filter((b) => !ws.categories.some((c) => c.id === b.category));
  if (loose.length) out.push({ category: null, items: loose });
  return out;
}

/** Wie viele Lesezeichen in der Sammlung des Panels stehen. */
export function collectionSize(ws: Workspace, panelId: string): number {
  return ws.bookmarks.reduce((n, b) => n + (b.panels.includes(panelId) ? 1 : 0), 0);
}

export type OpenResult = 'tab' | 'here' | 'switched' | 'full';

/**
 * F-21: Lesezeichen im Panel öffnen. Ist es schon in einem Tab offen, wird dorthin gewechselt;
 * ist der sichtbare Tab leer, öffnet es dort; sonst in einem neuen Tab. Sind schon TAB_MAX Tabs
 * offen, bleibt alles, wie es ist ('full').
 */
export function openBookmark(ws: Workspace, panelId: string, url: string): { ws: Workspace; result: OpenResult } {
  const p = ws.panels.find((x) => x.id === panelId);
  if (!p) return { ws, result: 'full' };
  const hit = p.tabs.find((t) => sameUrl(t.url, url));
  if (hit) return { ws: selectTab(ws, panelId, hit.id), result: 'switched' };
  if (!activeTab(p).url) return { ws: navigatePanel(ws, panelId, url), result: 'here' };
  if (p.tabs.length >= TAB_MAX) return { ws, result: 'full' };
  return { ws: addTab(ws, panelId, url), result: 'tab' };
}
