/**
 * F-206 Schritt 6 (V93, Claude Doc „F-206 V93 – Notiz ↔ Quelle“, Enrico: „Best Case nach deinen Vorschlägen“):
 * Notiz ↔ Quelle. Verbindungen stehen nur an der Notiz (`Note.sources`, n:m); die Gegenrichtung wird
 * berechnet. Die Stelle (Zeitmarke, PDF-Seite, Abschnitt) lässt sich in fremden Seiten nicht auslesen –
 * sie kommt aus der Adresse oder von Hand und wird beim Öffnen wieder in die Adresse geschrieben.
 * Reine Funktionen.
 */
import { normalizeUrl } from './workspace';
import { originOf, saveBookmark, sameUrlKey } from './bookmarks';
import { addEvent, noteById, notesOf } from './notes';
import type { Act } from './notes';
import type { Bookmark, Note, SourceLink, SourceSpot, Workspace } from './types';

// ---------------------------------------------------------------- Stelle

const YT = /(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be)$/i;

/** „1:35“, „1:02:03“, „95“, „1m35s“, „2h3m“ → Sekunden; sonst undefined. */
export function parseTime(v: string): number | undefined {
  const s = v.trim().toLowerCase();
  if (/^\d+(\.\d+)?$/.test(s)) return Math.floor(Number(s));
  let m = /^(\d+):(\d{1,2})(?::(\d{1,2}))?$/.exec(s);
  if (m) return m[3] !== undefined ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : Number(m[1]) * 60 + Number(m[2]);
  m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(s);
  if (m && (m[1] || m[2] || m[3])) return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
  return undefined;
}

/** Sekunden → „1:35“ bzw. „1:02:03“. */
export function timeText(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Stelle aus einer Adresse: YouTube `t=`, Medien `#t=`, PDF `#page=`, sonst Anker `#…`. */
export function spotFromUrl(url: string): SourceSpot | undefined {
  let u: URL;
  try {
    u = new URL(normalizeUrl(url));
  } catch {
    return undefined;
  }
  const at: SourceSpot = {};
  const hash = u.hash.replace(/^#/, '');
  const hp = new URLSearchParams(hash.includes('=') ? hash.replace(/&amp;/g, '&') : '');
  const t = u.searchParams.get('t') ?? u.searchParams.get('start') ?? hp.get('t');
  if (t) {
    const sec = parseTime(t);
    if (sec !== undefined && sec > 0) at.time = sec;
  }
  const page = hp.get('page');
  if (page && /^\d+$/.test(page) && Number(page) >= 1) at.page = Number(page);
  if (hash && !hash.includes('=') && !hash.startsWith(':~:')) {
    try {
      at.section = decodeURIComponent(hash).replace(/_/g, ' ');
    } catch {
      at.section = hash;
    }
  }
  return Object.keys(at).length ? at : undefined;
}

/** Adresse ohne die Stelle (Schlüssel der Seite selbst). */
export function urlWithoutSpot(url: string): string {
  try {
    const u = new URL(normalizeUrl(url));
    u.searchParams.delete('t');
    if (!YT.test(u.hostname)) u.searchParams.delete('start');
    u.hash = '';
    return u.toString();
  } catch {
    return url;
  }
}

/** Stelle in die Adresse schreiben, damit die Seite dort öffnet. */
export function urlWithSpot(url: string, at: SourceSpot | undefined): string {
  if (!at) return url;
  let u: URL;
  try {
    u = new URL(normalizeUrl(url));
  } catch {
    return url;
  }
  if (at.time !== undefined) {
    if (YT.test(u.hostname)) {
      u.searchParams.set('t', `${Math.floor(at.time)}s`);
      return u.toString();
    }
    u.hash = `t=${Math.floor(at.time)}`;
    return u.toString();
  }
  if (at.page !== undefined) {
    u.hash = `page=${at.page}`;
    return u.toString();
  }
  if (at.section) {
    const s = at.section.trim();
    // Anker (ein Wort) direkt, sonst Textfragment – springt in modernen Browsern zum Text
    u.hash = /^[\w.-]+$/.test(s.replace(/ /g, '_')) && !s.includes(' ') ? encodeURIComponent(s) : `:~:text=${encodeURIComponent(s)}`;
    if (s.includes(' ') && /wikipedia\.org$/i.test(u.hostname)) u.hash = encodeURIComponent(s.replace(/ /g, '_'));
    return u.toString();
  }
  return u.toString();
}

/** Eingabe im Feld „Stelle“: „1:35“ → Zeit, „S. 12“/„Seite 12“/„p. 12“ → Seite, sonst Abschnitt; leer → undefined. */
export function parseSpotInput(v: string): SourceSpot | undefined {
  const s = v.trim();
  if (!s) return undefined;
  const page = /^(?:s\.?|seite|p\.?|page)\s*(\d+)$/i.exec(s);
  if (page && Number(page[1]) >= 1) return { page: Number(page[1]) };
  if (/^\d+:\d{1,2}(:\d{1,2})?$/.test(s) || /^(\d+h)?(\d+m)?(\d+s)?$/i.test(s)) {
    const t = parseTime(s);
    if (t !== undefined) return { time: t };
  }
  return { section: s };
}

/** Stelle als kurzer Text: „1:35“, „S. 12“, „Geschichte“; leer ohne Stelle. */
export function spotText(at: SourceSpot | undefined): string {
  if (!at) return '';
  if (at.time !== undefined) return timeText(at.time);
  if (at.page !== undefined) return `S. ${at.page}`;
  return at.section ?? '';
}

// ---------------------------------------------------------------- Verknüpfen

const sameSpot = (a: SourceSpot | undefined, b: SourceSpot | undefined) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Source zur Adresse (ohne Stelle verglichen). */
export function sourceForUrl(ws: Workspace, url: string): Bookmark | undefined {
  const key = sameUrlKey(urlWithoutSpot(url));
  return ws.bookmarks.find((b) => sameUrlKey(urlWithoutSpot(b.url)) === key);
}

/**
 * Q7: Source zur Adresse holen oder anlegen (Herkunft „aus Notiz verknüpft“). Angelegt wird ohne Stelle –
 * die Stelle gehört zur Verbindung, nicht zur Source.
 */
export function ensureSource(ws: Workspace, url: string, title: string, makeId: () => string, now = new Date()): { ws: Workspace; source: Bookmark; created: boolean } {
  const hit = sourceForUrl(ws, url);
  if (hit) return { ws, source: hit, created: false };
  const id = makeId();
  const clean = urlWithoutSpot(url);
  const next = saveBookmark(ws, { id, title, url: clean, category: '', tags: [], panels: [], origin: originOf(ws, 'note', {}, now) });
  const source = next.bookmarks.find((b) => b.id === id);
  if (!source) return { ws, source: { id, title, url: clean, category: '', tags: [], panels: [] }, created: false };
  return { ws: next, source, created: true };
}

function withSources(ws: Workspace, noteId: string, act: Act, detail: string, fn: (l: SourceLink[]) => SourceLink[]): Workspace {
  const at = act.now ?? Date.now();
  let hit = false;
  const notes = notesOf(ws).map((n) => {
    if (n.id !== noteId) return n;
    hit = true;
    const sources = fn(n.sources ?? []);
    const out: Note = { ...n, changed: at, trail: addEvent(n.trail, 'attached', act, detail) };
    if (sources.length) out.sources = sources;
    else delete out.sources;
    return out;
  });
  return hit ? { ...ws, notes } : ws;
}

/**
 * Notiz mit einer Seite verknüpfen. Die Stelle kommt aus der Adresse (Q3), wenn keine angegeben ist.
 * Fehlt die Source, wird sie angelegt (Q7). Doppelte Verbindung (gleiche Source, gleiche Stelle) bleibt eine.
 */
export function linkSource(
  ws: Workspace,
  noteId: string,
  page: { url: string; title: string; at?: SourceSpot },
  makeId: () => string,
  act: Act = {},
): { ws: Workspace; link?: SourceLink; created: boolean } {
  if (!noteById(ws, noteId) || !normalizeUrl(page.url)) return { ws, created: false };
  const got = ensureSource(ws, page.url, page.title, makeId, act.now ? new Date(act.now) : new Date());
  const at = page.at ?? spotFromUrl(page.url);
  const link: SourceLink = { id: got.source.id, title: got.source.title, url: got.source.url, ...(at ? { at } : {}) };
  const n = noteById(got.ws, noteId)!;
  if ((n.sources ?? []).some((l) => l.id === link.id && sameSpot(l.at, link.at))) return { ws: got.ws, link, created: got.created };
  const next = withSources(got.ws, noteId, act, `Quelle: ${link.title}`, (l) => [...l, link]);
  return { ws: next, link, created: got.created };
}

/** Q9: Verbindung lösen (Index in `Note.sources`); die Source bleibt. */
export function unlinkSource(ws: Workspace, noteId: string, index: number, act: Act = {}): { ws: Workspace; removed?: SourceLink } {
  const n = noteById(ws, noteId);
  const removed = n?.sources?.[index];
  if (!removed) return { ws };
  return { ws: withSources(ws, noteId, act, `Quelle entfernt: ${removed.title}`, (l) => l.filter((_, i) => i !== index)), removed };
}

/** Rückgängig: Verbindung an ihren alten Platz zurück. */
export function restoreLink(ws: Workspace, noteId: string, index: number, link: SourceLink, act: Act = {}): Workspace {
  return withSources(ws, noteId, act, `Quelle: ${link.title}`, (l) => {
    if (l.some((x) => x.id === link.id && sameSpot(x.at, link.at))) return l;
    const out = [...l];
    out.splice(Math.min(index, out.length), 0, link);
    return out;
  });
}

/** Stelle einer Verbindung ändern (F2 am Chip); leer = ohne Stelle. */
export function setLinkSpot(ws: Workspace, noteId: string, index: number, at: SourceSpot | undefined, act: Act = {}): Workspace {
  const n = noteById(ws, noteId);
  const l = n?.sources?.[index];
  if (!l || sameSpot(l.at, at)) return ws;
  return withSources(ws, noteId, act, `Stelle: ${spotText(at) || '–'}`, (all) =>
    all.map((x, i) => {
      if (i !== index) return x;
      const out: SourceLink = { id: x.id, title: x.title, url: x.url };
      if (at) out.at = at;
      return out;
    }),
  );
}

// ---------------------------------------------------------------- Aktive Seite (Q2 a)

/** Aktives Portal (setzt die App) – für „neue Notiz auf aktiver Seite verknüpft“. */
let activePanelId: string | null = null;
export const setActivePanel = (id: string | null) => void (activePanelId = id);

/** Seite im aktiven Tab des aktiven Portals (Adresse + Titel aus der Library bzw. der Host). */
export function activePage(ws: Workspace): { url: string; title: string } | null {
  const p = ws.panels.find((x) => x.id === activePanelId);
  const t = p?.tabs.find((x) => x.id === p.activeTab);
  if (!t?.url || !/^https?:/i.test(t.url)) return null;
  const b = sourceForUrl(ws, t.url);
  return { url: t.url, title: b?.title || pageTitle(t.url) };
}

/**
 * Titel einer Seite ohne Library-Eintrag: fremde Seiten verraten ihren Titel nicht (iframe) – darum der letzte Teil
 * des Pfads und der Host, z. B. „Hamburg · de.wikipedia.org“; ohne Pfad nur der Host.
 */
export function pageTitle(url: string): string {
  try {
    const u = new URL(normalizeUrl(url));
    const host = u.hostname.replace(/^www\./, '');
    const last = u.pathname.split('/').filter(Boolean).pop();
    if (!last || /^(index|watch)(\.\w+)?$/i.test(last)) return host;
    const name = decodeURIComponent(last).replace(/\.(html?|php|aspx?)$/i, '').replace(/[_-]+/g, ' ').trim();
    return name ? `${name} · ${host}` : host;
  } catch {
    return url;
  }
}

/** Beim Verwerfen einer neuen, leeren Notiz: Sources, die nur für sie angelegt wurden, wieder entfernen. */
export function pruneNoteSources(ws: Workspace, ids: readonly string[]): Workspace {
  const used = new Set(notesOf(ws).flatMap((n) => (n.sources ?? []).map((l) => l.id)));
  const drop = new Set(ids.filter((id) => !used.has(id) && ws.bookmarks.find((b) => b.id === id)?.origin?.via === 'note'));
  return drop.size ? { ...ws, bookmarks: ws.bookmarks.filter((b) => !drop.has(b.id)) } : ws;
}

// ---------------------------------------------------------------- Anzeigen und Gegenrichtung

export interface LinkView {
  link: SourceLink;
  index: number;
  /** Source fehlt in der Library (Q8). */
  gone: boolean;
  /** aktueller Titel (aus der Source, sonst die Kopie) */
  title: string;
  /** Adresse zum Öffnen, mit Stelle */
  open: string;
  spot: string;
}

/** Quellen einer Notiz für die Anzeige; Titel und Adresse kommen aus der Source, solange es sie gibt. */
export function linksOf(ws: Workspace, note: Note): LinkView[] {
  return (note.sources ?? []).map((link, index) => {
    const b = ws.bookmarks.find((x) => x.id === link.id);
    const url = b?.url ?? link.url;
    return { link, index, gone: !b, title: b?.title || link.title || url, open: urlWithSpot(url, link.at), spot: spotText(link.at) };
  });
}

/** Q4/Q6: Notizen zu einer Seite bzw. Source (über die Id oder – für alte Kopien – die Adresse). */
export function notesOfSource(ws: Workspace, ref: { id?: string; url?: string }): Note[] {
  const key = ref.url ? sameUrlKey(urlWithoutSpot(ref.url)) : '';
  const id = ref.id ?? (ref.url ? sourceForUrl(ws, ref.url)?.id : undefined);
  return notesOf(ws).filter((n) => (n.sources ?? []).some((l) => (id && l.id === id) || (key && sameUrlKey(urlWithoutSpot(l.url)) === key)));
}

/** Q8: gelöschte Source aus der Kopie wieder anlegen (gleiche Id, damit alle Verbindungen wieder greifen). */
export function reviveSource(ws: Workspace, link: SourceLink, now = new Date()): Workspace {
  if (ws.bookmarks.some((b) => b.id === link.id)) return ws;
  return saveBookmark(ws, { id: link.id, title: link.title, url: link.url, category: '', tags: [], panels: [], origin: originOf(ws, 'note', {}, now) });
}

export const SOURCE_LINK_TEXT = {
  row: 'Quellen',
  add: '+ Quelle',
  addTitle: 'Mit Quelle verknüpfen … (Alt/⌥+Q) – Quelle = eine Seite aus der Library oder einem Portal; die Verbindung steht an der Notiz',
  gone: 'Quelle gelöscht',
  revive: 'Wieder anlegen',
  removed: (t: string) => `Quelle „${t}“ entfernt`,
  spot: 'Stelle',
  spotHint: 'z. B. 1:35 (Zeit), S. 12 (Seite) oder ein Abschnitt',
  spotNone: 'ohne Stelle',
  chip: (t: string, spot: string) => `Quelle: ${t}${spot ? `, Stelle ${spot}` : ''}. Enter öffnet, F2 Stelle, Entf löst die Verbindung`,
  listLabel: 'Quellen dieser Notiz',
  notes: (n: number) => (n === 1 ? '1 Notiz' : `${n} Notizen`),
  notesTitle: (n: number) => `${n === 1 ? '1 Notiz' : `${n} Notizen`} zu dieser Seite – Klick zeigt die Liste`,
  newForPage: '+ Neue Notiz zu dieser Seite',
  linkThis: 'Mit dieser Seite verknüpfen',
  autoLinked: (t: string) => `Mit „${t}“ verknüpft`,
  clip: (n: number) => `${n} ${n === 1 ? 'Quelle' : 'Quellen'}`,
  pick: 'Quelle wählen',
  drop: 'Loslassen = als Quelle verknüpfen',
  dropNote: 'Loslassen = Notiz mit dieser Seite verknüpfen',
  pickHint: 'Offene Seiten oben, darunter die Library. Tippen filtert, Pfeile wählen, Enter verknüpft, Esc schließt.',
  openPages: 'Offen in Portalen',
  library: 'Library',
  none: 'Nichts gefunden.',
};
