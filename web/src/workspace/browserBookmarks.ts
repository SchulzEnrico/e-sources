/**
 * F-36: Lesezeichen aus dem Browser übernehmen und wieder ausgeben. Chrome, Edge, Safari und
 * Firefox exportieren alle dasselbe Format („Netscape Bookmark File“, eine HTML-Datei):
 * Ordner sind <H3>-Überschriften mit einer <DL>-Liste darunter, Lesezeichen sind <A HREF>.
 * Ordner werden zu Kategorien der Library (verschachtelte als „Oben › Unten“), die
 * Wurzelordner der Browser (Lesezeichenleiste, Weitere Lesezeichen …) fallen dabei weg.
 * Bewusst ohne DOMParser, damit es auch in den Tests läuft.
 */
import { NO_CATEGORY, addCategory, categoryByName, originOf, parseTags, sameUrl, saveBookmark } from './bookmarks';
import type { Bookmark, Workspace } from './types';

export const BOOKMARKS_FILE_NAME = 'e-sources-lesezeichen.html';

export interface BrowserBookmark {
  title: string;
  url: string;
  /** Ordnerpfad ohne die Wurzelordner des Browsers; leer = ohne Ordner. */
  path: string[];
  tags: string[];
}

/** Wurzelordner der Browser – sie sind keine eigenen Themen und werden nicht zur Kategorie. */
const ROOTS = new Set(
  [
    'bookmarks bar', 'bookmarks toolbar', 'bookmarks menu', 'other bookmarks', 'mobile bookmarks', 'favorites', 'favourites', 'favorites bar',
    'lesezeichenleiste', 'lesezeichen-symbolleiste', 'lesezeichen-menü', 'lesezeichenmenü', 'weitere lesezeichen', 'andere lesezeichen',
    'mobile lesezeichen', 'favoriten', 'favoritenleiste', 'lesezeichen', 'bookmarks',
  ],
);

/** Trenner zwischen Ober- und Unterordner im Namen der Kategorie. */
export const PATH_SEP = ' › ';

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const attr = (tag: string, name: string): string | undefined => {
  const m = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
  return m ? decodeEntities(m[2] ?? m[3] ?? m[4] ?? '') : undefined;
};

const text = (html: string) => decodeEntities(html.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();

/** Nur Adressen, die ein Portal öffnen kann (keine javascript:-, place:- oder chrome://-Links). */
export function importableUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

/** Sieht der Text wie eine Lesezeichen-Datei aus? */
export function looksLikeBookmarkFile(html: string): boolean {
  return /NETSCAPE-Bookmark-file/i.test(html) || (/<DL/i.test(html) && /<A\s[^>]*HREF/i.test(html));
}

/** Liest eine Lesezeichen-Datei. Gibt alle Lesezeichen mit Ordnerpfad zurück, in Dateireihenfolge. */
export function parseBookmarkFile(html: string): BrowserBookmark[] {
  const out: BrowserBookmark[] = [];
  const stack: (string | null)[] = []; // null = Wurzelordner (zählt nicht zum Pfad)
  let pending: string | null | undefined; // Ordner, dessen <DL> noch kommt
  const re = /<h3\b[^>]*>([\s\S]*?)<\/h3>|<dl\b[^>]*>|<\/dl\s*>|<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const tok = m[0];
    if (/^<h3/i.test(tok)) {
      const name = text(m[1]);
      const isRoot = /PERSONAL_TOOLBAR_FOLDER|UNFILED_BOOKMARKS_FOLDER/i.test(tok) || ROOTS.has(name.toLowerCase());
      pending = isRoot || !name ? null : name;
    } else if (/^<dl/i.test(tok)) {
      // Eine <DL> ohne Überschrift davor (z. B. die der Datei selbst) zählt nicht zum Pfad.
      stack.push(pending === undefined ? null : pending);
      pending = undefined;
    } else if (/^<\/dl/i.test(tok)) {
      stack.pop();
    } else {
      const url = (attr(`<a ${m[2]}>`, 'href') ?? '').trim();
      if (!url) continue;
      const tags = parseTags(attr(`<a ${m[2]}>`, 'tags') ?? '');
      out.push({ title: text(m[3]), url, path: stack.filter((x): x is string => !!x), tags });
    }
  }
  return out;
}

/**
 * Wie fein die Ordner zu Kategorien werden: wie im Browser (verschachtelt), nur die oberste
 * Ordnerebene, oder alles in eine einzige Kategorie (z. B. „Import 22.11.2026“).
 */
export type ImportHow = 'full' | 'top' | 'one';

/** Name der Kategorie für einen Ordnerpfad; leer = ohne Kategorie. */
export function categoryFor(path: string[], how: ImportHow, label: string): string {
  if (how === 'one') return label;
  if (how === 'top') return path[0] ?? '';
  return path.join(PATH_SEP);
}

/** Standardname für „alles in eine Kategorie“. */
export const importLabel = (now = new Date()) => `Import ${now.toLocaleDateString('de-DE')}`;

export interface ImportPlan {
  /** Neu zu übernehmen (ohne Doppelte und ohne schon vorhandene), mit Kategorie-Namen. */
  fresh: (BrowserBookmark & { category: string })[];
  /** Schon in der Library oder doppelt in der Datei. */
  known: number;
  /** Adressen, die kein Portal öffnen kann. */
  unusable: number;
  /** Namen der Kategorien, die neu angelegt würden. */
  newCategories: string[];
}

/** Was ein Import bewirken würde – für die Rückfrage vor dem Übernehmen. */
export function planImport(ws: Workspace, list: BrowserBookmark[], how: ImportHow = 'full', label = importLabel()): ImportPlan {
  const fresh: ImportPlan['fresh'] = [];
  let known = 0;
  let unusable = 0;
  const cats: string[] = [];
  for (const b of list) {
    if (!importableUrl(b.url)) {
      unusable++;
      continue;
    }
    if (ws.bookmarks.some((x) => sameUrl(x.url, b.url)) || fresh.some((x) => sameUrl(x.url, b.url))) {
      known++;
      continue;
    }
    const name = categoryFor(b.path, how, label);
    fresh.push({ ...b, category: name });
    if (name && !categoryByName(ws, name) && !cats.some((c) => c.toLowerCase() === name.toLowerCase())) cats.push(name);
  }
  return { fresh, known, unusable, newCategories: cats };
}

/**
 * Übernimmt die Lesezeichen des Plans in die Library (ohne Portal-Zuordnung). F-185: Jede Source
 * merkt sich Datei (`from`) und Ordner im Browser – auch wenn alles in eine Kategorie geht.
 */
export function applyImport(ws: Workspace, plan: ImportPlan, makeId: () => string, from?: string, now = new Date()): Workspace {
  let next = ws;
  for (const name of plan.newCategories) next = addCategory(next, makeId(), name);
  for (const b of plan.fresh) {
    const category = b.category ? (categoryByName(next, b.category)?.id ?? NO_CATEGORY) : NO_CATEGORY;
    const origin = originOf(ws, 'import', { from, folder: b.path.join(PATH_SEP) }, now);
    const d: Bookmark = { id: makeId(), title: b.title, url: b.url, category, tags: b.tags, panels: [], origin };
    next = saveBookmark(next, d);
  }
  return next;
}

/**
 * Library als Lesezeichen-Datei, die jeder Browser importieren kann. Kategorien werden Ordner
 * („Oben › Unten“ wieder verschachtelt), Tags stehen in TAGS (Firefox liest sie), die Notiz als <DD>.
 */
export interface ExtraBookmark {
  href: string;
  title: string;
  /** Symbol als data:-Adresse (PNG); leer = ohne */
  icon?: string;
}

/** F-197: `first` steht ganz oben (z. B. „Öffnen in“ mit Symbol), damit es beim Import gleich dabei ist. */
export function bookmarkFileOf(ws: Workspace, now = new Date(), first?: ExtraBookmark): string {
  const stamp = Math.floor(now.getTime() / 1000);
  type Node = { name: string; kids: Node[]; items: Bookmark[] };
  const root: Node = { name: '', kids: [], items: [] };
  const folder = (path: string[]) => {
    let n = root;
    for (const p of path) {
      let k = n.kids.find((x) => x.name === p);
      if (!k) n.kids.push((k = { name: p, kids: [], items: [] }));
      n = k;
    }
    return n;
  };
  for (const c of ws.categories) folder(c.name.split(PATH_SEP));
  for (const b of ws.bookmarks) {
    const c = ws.categories.find((x) => x.id === b.category);
    (c ? folder(c.name.split(PATH_SEP)) : root).items.push(b);
  }
  const lines: string[] = [];
  const write = (n: Node, ind: string) => {
    for (const b of n.items) {
      const tags = b.tags.length ? ` TAGS="${escapeHtml(b.tags.join(','))}"` : '';
      lines.push(`${ind}<DT><A HREF="${escapeHtml(b.url)}" ADD_DATE="${stamp}"${tags}>${escapeHtml(b.title)}</A>`);
      if (b.note) lines.push(`${ind}<DD>${escapeHtml(b.note)}`);
    }
    for (const k of n.kids) {
      lines.push(`${ind}<DT><H3 ADD_DATE="${stamp}">${escapeHtml(k.name)}</H3>`, `${ind}<DL><p>`);
      write(k, `${ind}    `);
      lines.push(`${ind}</DL><p>`);
    }
  };
  if (first) {
    const icon = first.icon ? ` ICON="${escapeHtml(first.icon)}"` : '';
    lines.push(`    <DT><A HREF="${escapeHtml(first.href)}" ADD_DATE="${stamp}"${icon}>${escapeHtml(first.title)}</A>`);
  }
  write(root, '    ');
  return [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<!-- E-Sources: Library als Lesezeichen-Datei -->',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE>',
    '<H1>E-Sources Library</H1>',
    '<DL><p>',
    ...lines,
    '</DL><p>',
    '',
  ].join('\n');
}
