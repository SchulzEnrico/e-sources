/**
 * Lesezeichen und Kategorien (F-14, F-20, F-30 bis F-33). Alle Lesezeichen liegen in der
 * Gesamtsammlung; die Sammlung eines Panels sind die, die ihm zugeordnet sind (F-32).
 */
import { profileOf } from './profile';
import { ORIGIN_TEXT } from './terms';
import type { Bookmark, BookmarkOrigin, Category, Named, OriginVia, PanelMeta, Tab, Workspace } from './types';
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
export function categoryByName(ws: Workspace, name: string): Category | undefined {
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
    // F-163: Portale dieser Kategorie sind danach ohne; gemerkte Wahl je Domain fällt weg
    panels: ws.panels.map((p) => (p.category === id ? { ...p, category: NO_CATEGORY } : p)),
    ...(ws.siteCategory ? { siteCategory: Object.fromEntries(Object.entries(ws.siteCategory).filter(([, v]) => v !== id)) } : {}),
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
  // F-185: Herkunft bleibt beim Ändern erhalten
  const origin = d.origin ?? (i >= 0 ? ws.bookmarks[i].origin : undefined);
  if (origin) b.origin = origin;
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
  category: Category | null;
  items: Bookmark[];
}

/** Trifft die Suche (F-34: Titel, URL, Kategorie, Tags; mehrere Wörter = alle müssen passen)? */
export function matches(ws: Workspace, b: Bookmark, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const cat = ws.categories.find((c) => c.id === b.category)?.name ?? '';
  const hay = [b.title, b.url, cat, ...b.tags, b.note ?? '', b.origin ? originText(b.origin) : ''].join(' ').toLowerCase();
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

// ---------------------------------------------------------------- Zentrale Suche (F-34)

/** Ein Treffer der zentralen Suche: ein Lesezeichen in der Sammlung eines Panels. */
export interface SearchHit {
  bookmark: Bookmark;
  /** Panel, in dessen Sammlung es steht; null = nur in der Gesamtsammlung (öffnet im aktiven Panel). */
  panel: PanelMeta | null;
  /** Name der Kategorie; leer = ohne Kategorie. */
  category: string;
}

/** Höchstzahl der angezeigten Treffer. */
export const SEARCH_MAX = 50;

/**
 * F-34: durchsucht alle Lesezeichen (Titel, URL, Kategorie, Tags, Notiz). Steht ein Lesezeichen in
 * mehreren Panels, gibt es je Panel einen Treffer. Treffer im Titel stehen vorn, sonst gilt die
 * Reihenfolge der Gesamtsammlung.
 */
export function searchAll(ws: Workspace, query: string, max = SEARCH_MAX): SearchHit[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean).map((w) => w.replace(/^#/, '')).filter(Boolean);
  if (!words.length) return [];
  const found = ws.bookmarks.filter((b) => matches(ws, b, query));
  const inTitle = (b: Bookmark) => words.every((w) => b.title.toLowerCase().includes(w));
  const sorted = [...found.filter(inTitle), ...found.filter((b) => !inTitle(b))];
  const out: SearchHit[] = [];
  for (const b of sorted) {
    const category = ws.categories.find((c) => c.id === b.category)?.name ?? '';
    const panels = ws.panels.filter((p) => b.panels.includes(p.id));
    if (!panels.length) out.push({ bookmark: b, panel: null, category });
    for (const panel of panels) out.push({ bookmark: b, panel, category });
    if (out.length >= max) break;
  }
  return out.slice(0, max);
}

/** Ein Panel als Treffer der zentralen Suche (F-141). */
export interface PanelHit {
  panel: PanelMeta;
  /** Name der Area (F-128), Sphere und Szenario (F-116); leer = keiner. */
  area: string;
  sphere: string;
  scenario: string;
  /** Offene Tabs, deren Adresse zur Suche passt (der sichtbare zuerst); leer = nur über Namen gefunden. */
  tabs: Tab[];
}

/**
 * F-141: Panels finden – über Name, Area, Sphere, Szenario und die Adressen der offenen Tabs.
 * Treffer im Panelnamen stehen vorn.
 */
export function searchPanels(ws: Workspace, query: string, max = SEARCH_MAX): PanelHit[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean).map((w) => w.replace(/^#/, '')).filter(Boolean);
  if (!words.length) return [];
  const name = (list: Named[], id: string | undefined) => (id ? (list.find((n) => n.id === id)?.name ?? '') : '');
  const all: PanelHit[] = ws.panels.map((panel) => {
    const open = panel.tabs.filter((t) => t.url && words.some((w) => t.url!.toLowerCase().includes(w)));
    open.sort((a, b) => (b.id === panel.activeTab ? 1 : 0) - (a.id === panel.activeTab ? 1 : 0));
    return {
      panel,
      area: name(ws.areaNames, panel.areaName),
      sphere: name(ws.spheres, panel.sphere),
      scenario: name(ws.scenarios, panel.scenario),
      tabs: open,
    };
  });
  const hay = (h: PanelHit) => [h.panel.name, h.area, h.sphere, h.scenario, ...h.panel.tabs.map((t) => t.url ?? '')].join(' ').toLowerCase();
  const found = all.filter((h) => words.every((w) => hay(h).includes(w)));
  const inName = (h: PanelHit) => words.every((w) => h.panel.name.toLowerCase().includes(w));
  return [...found.filter(inName), ...found.filter((h) => !inName(h))].slice(0, max);
}

// ---------------------------------------------------------------- Beispiel-Lesezeichen (F-145)

/** Beispiele in mehreren Kategorien, zum Ausprobieren von Sammlung, Suche und Sortieren. */
export const SAMPLES: { category: string; links: { title: string; url: string; tags?: string[] }[] }[] = [
  {
    category: 'Entwicklung',
    links: [
      { title: 'MDN Web Docs', url: 'https://developer.mozilla.org/de/', tags: ['web', 'doku'] },
      { title: 'React', url: 'https://react.dev/', tags: ['web', 'doku'] },
      { title: 'TypeScript-Handbuch', url: 'https://www.typescriptlang.org/docs/', tags: ['doku'] },
      { title: 'Vite', url: 'https://vite.dev/', tags: ['werkzeug'] },
      { title: 'Can I use', url: 'https://caniuse.com/', tags: ['web'] },
    ],
  },
  {
    category: 'Hamburg',
    links: [
      { title: 'hamburg.de', url: 'https://www.hamburg.de/' },
      { title: 'HVV Fahrplan', url: 'https://www.hvv.de/', tags: ['unterwegs'] },
      { title: 'Elbphilharmonie Konzerte', url: 'https://www.elbphilharmonie.de/', tags: ['kultur'] },
      { title: 'Hamburger Kunsthalle', url: 'https://www.hamburger-kunsthalle.de/', tags: ['kultur'] },
    ],
  },
  {
    category: 'Jobs',
    links: [
      { title: 'Jobbörse der Arbeitsagentur', url: 'https://www.arbeitsagentur.de/jobsuche/', tags: ['bewerbung'] },
      { title: 'StepStone', url: 'https://www.stepstone.de/', tags: ['bewerbung'] },
      { title: 'BERUFENET', url: 'https://web.arbeitsagentur.de/berufenet/', tags: ['bewerbung'] },
    ],
  },
  {
    category: 'Werkzeuge',
    links: [
      { title: 'Excalidraw', url: 'https://excalidraw.com/', tags: ['zeichnen'] },
      { title: 'regex101', url: 'https://regex101.com/', tags: ['werkzeug'] },
      { title: 'DeepL Übersetzer', url: 'https://www.deepl.com/translator', tags: ['sprache'] },
    ],
  },
  {
    category: 'Lernen',
    links: [
      { title: 'Khan Academy', url: 'https://de.khanacademy.org/' },
      { title: 'Scrum Guide', url: 'https://scrumguides.org/', tags: ['scrum'] },
    ],
  },
];

/**
 * F-145: Beispiel-Lesezeichen hinzufügen. Kategorien gleichen Namens werden genutzt, Adressen, die
 * es schon gibt, übersprungen. Die Beispiele hängen an keinem Panel (stehen unter „Alle“).
 */
export function addSamples(ws: Workspace, makeId: () => string, now = new Date()): { ws: Workspace; added: number } {
  let next = ws;
  let added = 0;
  for (const group of SAMPLES) {
    let cat = categoryByName(next, group.category);
    if (!cat) {
      next = addCategory(next, makeId(), group.category);
      cat = categoryByName(next, group.category);
    }
    if (!cat) continue;
    for (const l of group.links) {
      if (next.bookmarks.some((b) => sameUrl(b.url, l.url))) continue;
      next = { ...next, bookmarks: [...next.bookmarks, { id: makeId(), title: l.title, url: l.url, category: cat.id, tags: l.tags ?? [], panels: [], origin: originOf(ws, 'sample', {}, now) }] };
      added++;
    }
  }
  return { ws: next, added };
}

/**
 * F-185: Herkunft einer neuen Source. „Wer“ ist der Profilname (F-179), ohne Namen fehlt er.
 */
export function originOf(ws: Workspace, via: OriginVia, extra: { from?: string; folder?: string } = {}, now = new Date()): BookmarkOrigin {
  const o: BookmarkOrigin = { via, at: now.toISOString() };
  const by = profileOf(ws).name;
  if (by) o.by = by;
  if (extra.from) o.from = extra.from;
  if (extra.folder) o.folder = extra.folder;
  return o;
}

/** Datum und Uhrzeit wie „22.11.2026, 16:55“. */
export function originWhen(o: BookmarkOrigin): string {
  const d = new Date(o.at);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * F-185: ruhige Zeile für den Bearbeiten-Dialog, z. B. „Angelegt von Enrico am 22.11.2026, 16:55 ·
 * aus Lesezeichen-Import „bookmarks.html“, Ordner Arbeit“. Auch Grundlage der Suche.
 */
export function originText(o: BookmarkOrigin | undefined): string {
  if (!o) return ORIGIN_TEXT.unknown;
  const when = originWhen(o);
  const head = `Angelegt${o.by ? ` von ${o.by}` : ''}${when ? ` am ${when}` : ''}`;
  let how: string = ORIGIN_TEXT[o.via] ?? '';
  if (o.via === 'import' && o.from) how += ` „${o.from}“`;
  if (o.via === 'workspace' && o.from) how += ` (${o.from})`;
  if (o.folder) how += `, Ordner ${o.folder}`;
  return how ? `${head} · ${how}` : head;
}
