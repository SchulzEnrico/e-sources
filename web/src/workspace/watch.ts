/**
 * V132 (F-231 K10d, B8): Beobachten und Neuigkeiten – wie Trello „Watch“ und die Glocke.
 *
 * Beobachten lässt sich eine Karte, eine Spalte oder ein ganzes Board, je Person: gespeichert wird der Name aus dem
 * Profil (so steht er auch in der Spur, `NoteEvent.by`) – ohne Namen „ich“. Felder `Note.watch`, `NoteColumn.watch`,
 * `NoteView.watch` (abgeglichen, Dateiformat bleibt 13).
 *
 * Ohne eigenen Server kommen fremde Änderungen nur über den Gist-Abgleich (heute „ganzer Stand, neuerer gewinnt“).
 * `newsOf(alt, neu)` vergleicht beide Stände: neue Spur-Einträge, die jemand anderes geschrieben hat, an einer
 * beobachteten Karte (direkt, über ihre Spalte oder ihr Board) werden zu Neuigkeiten; ebenso neue Karten in einer
 * beobachteten Spalte bzw. auf einem beobachteten Board. Erwähnungen (@Name im Kommentar) melden immer, auch ohne
 * Beobachten. Einträge von Regeln und Knöpfen („Regel R3 · …“, „Knopf · …“) zählen nicht – sie folgen aus einer
 * Änderung, die schon gemeldet wird.
 *
 * Die Neuigkeiten selbst sind persönlich und bleiben auf dem Gerät (localStorage, `NEWS_KEY`), höchstens `NEWS_MAX`.
 */
import type { Note, NoteColumn, NoteEvent, NoteView, Workspace } from './types';
import * as No from './notes';
import { splitMentions } from './comments';

export type WatchTarget = { kind: 'card'; note: string } | { kind: 'col'; view: string; col: string } | { kind: 'board'; view: string };

/** Wer beobachtet: Name aus dem Profil, sonst „ich“. */
export const watchKey = (ws: Workspace): string => ws.profile?.name?.trim() || 'ich';

const has = (list: string[] | undefined, key: string) => !!list?.includes(key);
const toggled = (list: string[] | undefined, key: string, on: boolean): string[] | undefined => {
  const rest = (list ?? []).filter((x) => x !== key);
  const next = on ? [...rest, key] : rest;
  return next.length ? next : undefined;
};

/** Gesäuberte Liste von Beobachtern (Laden). */
export function cleanWatch(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = [...new Set(v.filter((x): x is string => typeof x === 'string' && !!x.trim()).map((x) => x.trim().slice(0, 40)))].slice(0, 50);
  return out.length ? out : undefined;
}

const colIn = (v: NoteView | undefined, col: string): NoteColumn | undefined => v?.cols?.find((c) => c.id === col);

export function isWatching(ws: Workspace, t: WatchTarget, key = watchKey(ws)): boolean {
  if (t.kind === 'card') return has(No.noteById(ws, t.note)?.watch, key);
  const v = No.viewById(ws, t.view);
  if (t.kind === 'board') return has(v?.watch, key);
  return has(colIn(v, t.col)?.watch, key);
}

/** Beobachten an- bzw. ausschalten. Unbekanntes Ziel → unverändert. */
export function setWatch(ws: Workspace, t: WatchTarget, on: boolean, key = watchKey(ws)): Workspace {
  if (t.kind === 'card') {
    if (!No.noteById(ws, t.note)) return ws;
    return {
      ...ws,
      notes: No.notesOf(ws).map((n) => {
        if (n.id !== t.note) return n;
        const watch = toggled(n.watch, key, on);
        const { watch: _w, ...rest } = n;
        return watch ? { ...rest, watch } : (rest as Note);
      }),
    };
  }
  const v = No.viewById(ws, t.view);
  if (!v || (t.kind === 'col' && !colIn(v, t.col))) return ws;
  const views = No.viewsOf(ws).map((x) => {
    if (x.id !== t.view) return x;
    if (t.kind === 'board') {
      const watch = toggled(x.watch, key, on);
      const { watch: _w, ...rest } = x;
      return watch ? { ...rest, watch } : (rest as NoteView);
    }
    return {
      ...x,
      cols: x.cols!.map((c) => {
        if (c.id !== t.col) return c;
        const watch = toggled(c.watch, key, on);
        const { watch: _w, ...rest } = c;
        return watch ? { ...rest, watch } : (rest as NoteColumn);
      }),
    };
  });
  return { ...ws, noteViews: views };
}

/** Warum beobachte ich diese Karte? Erste Fundstelle: Karte, dann Spalte, dann Board (nur Kanbans). */
export function watchedVia(ws: Workspace, noteId: string, key = watchKey(ws)): { via: 'card' | 'col' | 'board'; view?: NoteView; col?: NoteColumn } | null {
  const n = No.noteById(ws, noteId);
  if (!n) return null;
  if (has(n.watch, key)) return { via: 'card' };
  const boards = No.viewsOf(ws).filter((v) => v.kind === 'kanban');
  for (const v of boards) {
    const c = v.cols?.find((x) => x.ids.includes(noteId));
    if (c && has(c.watch, key)) return { via: 'col', view: v, col: c };
  }
  for (const v of boards) if (has(v.watch, key) && v.cols?.some((c) => c.ids.includes(noteId))) return { via: 'board', view: v, col: v.cols.find((c) => c.ids.includes(noteId)) };
  return null;
}

/** Was ich beobachte (für die Liste unter der Glocke). */
export function watchList(ws: Workspace, key = watchKey(ws)): { cards: Note[]; cols: { view: NoteView; col: NoteColumn }[]; boards: NoteView[] } {
  const views = No.viewsOf(ws).filter((v) => v.kind === 'kanban');
  return {
    cards: No.notesOf(ws).filter((n) => has(n.watch, key)),
    cols: views.flatMap((view) => (view.cols ?? []).filter((c) => has(c.watch, key)).map((col) => ({ view, col }))),
    boards: views.filter((v) => has(v.watch, key)),
  };
}

// ---------------------------------------------------------------- Neuigkeiten

export type NewsKind = 'mention' | 'comment' | 'change' | 'added';

export interface NewsItem {
  /** Feste Kennung (Karte · Zeit · Art · Wer), damit ein zweiter Abgleich nichts doppelt meldet. */
  id: string;
  at: number;
  kind: NewsKind;
  note: string;
  title: string;
  by: string;
  /** Kurz: Kommentartext, Zusatz der Spur oder Spaltenname. */
  text?: string;
  /** Spur-Art bei `change`. */
  what?: NoteEvent['what'];
  via?: 'card' | 'col' | 'board';
  /** Board bzw. Spalte, über die beobachtet wird. */
  where?: string;
  read?: true;
}

export const NEWS_MAX = 200;
export const NEWS_KEY = 'esource.news.v1';

/** Eintrag einer Regel oder eines Knopfs (zählt nicht als Änderung durch jemanden). */
export const isAutomation = (by: string | undefined) => !!by && (/^Regel\s/.test(by) || /^Knopf\s·/.test(by));

const sig = (e: NoteEvent) => `${e.at}|${e.what}|${e.by ?? ''}|${e.id ?? ''}|${e.edited ?? ''}`;
const short = (s: string | undefined, max = 120) => {
  const t = (s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

/** Werde ich im Text erwähnt? (@Name meiner Person bzw. meines Profils) */
export function mentionsMe(ws: Workspace, text: string, key = watchKey(ws)): boolean {
  const me = key.toLocaleLowerCase('de');
  return splitMentions(ws, text).some((x) => x.person && (x.person.id === 'pn-ich' || x.person.name.toLocaleLowerCase('de') === me));
}

/**
 * Neuigkeiten aus dem Unterschied zweier Stände (vorher = dieses Gerät, nachher = vom Abgleich).
 * `key` = wer ich bin (Beobachter und eigene Einträge).
 */
export function newsOf(before: Workspace, after: Workspace, key = watchKey(after)): NewsItem[] {
  const out: NewsItem[] = [];
  const old = new Map(No.notesOf(before).map((n) => [n.id, n]));
  const mine = (by: string | undefined) => !by || by === key || (key === 'ich' && !by);
  const colOfAfter = new Map<string, { view: NoteView; col: NoteColumn }>();
  for (const v of No.viewsOf(after)) for (const c of v.cols ?? []) for (const id of c.ids) if (!colOfAfter.has(id)) colOfAfter.set(id, { view: v, col: c });
  for (const n of No.notesOf(after)) {
    const prev = old.get(n.id);
    const seen = new Set((prev?.trail ?? []).map(sig));
    const fresh = n.trail.filter((e) => !seen.has(sig(e)) && !mine(e.by) && !isAutomation(e.by));
    const w = watchedVia(after, n.id, key);
    const title = No.titleOf(n);
    const where = w?.via === 'col' ? w.col?.name : w?.via === 'board' ? w.view?.name : undefined;
    const base = { note: n.id, title, ...(w ? { via: w.via } : {}), ...(where ? { where } : {}) };
    for (const e of fresh) {
      const id = `${n.id}·${sig(e)}`;
      if (e.what === 'comment' && e.text && mentionsMe(after, e.text, key)) {
        out.push({ ...base, id, at: e.at, kind: 'mention', by: e.by!, text: short(e.text) });
        continue;
      }
      if (!w) continue;
      if (e.what === 'comment') out.push({ ...base, id, at: e.at, kind: 'comment', by: e.by!, text: short(e.text) });
      else out.push({ ...base, id, at: e.at, kind: 'change', what: e.what, by: e.by!, ...(e.detail ? { text: short(e.detail, 60) } : {}) });
    }
    // neue Karte in beobachteter Spalte bzw. auf beobachtetem Board (auch verschoben, ohne eigenen Spur-Eintrag)
    const now = colOfAfter.get(n.id);
    if (!now || (!new Set(now.col.watch ?? []).has(key) && !new Set(now.view.watch ?? []).has(key))) continue;
    const beforeView = No.viewById(before, now.view.id);
    const wasCol = beforeView?.cols?.find((c) => c.ids.includes(n.id));
    const colWatched = has(now.col.watch, key);
    const arrived = colWatched ? wasCol?.id !== now.col.id : !wasCol;
    if (!arrived) continue;
    const by = [...fresh].reverse().find((e) => e.by)?.by;
    const ownNew = n.trail.some((e) => !(prev?.trail ?? []).some((p) => sig(p) === sig(e)) && e.by === key);
    if (ownNew || (!by && !fresh.length && prev && wasCol)) {
      // von mir selbst (anderes Gerät) bzw. nur umgestellt ohne Hinweis auf jemand anderen → nur melden, wenn jemand genannt ist
      if (!by) continue;
    }
    out.push({ ...base, id: `${n.id}·in·${now.col.id}·${n.trail.length}`, at: fresh[fresh.length - 1]?.at ?? n.trail[n.trail.length - 1]?.at ?? 0, kind: 'added', by: by ?? '', text: now.col.name, via: colWatched ? 'col' : 'board', where: colWatched ? now.col.name : now.view.name });
  }
  return out.sort((a, b) => b.at - a.at);
}

/** Neue Neuigkeiten in die Liste übernehmen (ohne Doppelte, neueste zuerst, gekappt). */
export function mergeNews(list: NewsItem[], fresh: NewsItem[], max = NEWS_MAX): NewsItem[] {
  const ids = new Set(list.map((x) => x.id));
  return [...fresh.filter((x) => !ids.has(x.id)), ...list].sort((a, b) => b.at - a.at).slice(0, max);
}

export const unreadOf = (list: NewsItem[]) => list.filter((x) => !x.read).length;
export const markRead = (list: NewsItem[], id?: string): NewsItem[] => list.map((x) => (!id || x.id === id ? { ...x, read: true as const } : x));
export const dropNews = (list: NewsItem[], id: string): NewsItem[] => list.filter((x) => x.id !== id);

export function parseNews(v: unknown): NewsItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is NewsItem => !!x && typeof x === 'object' && typeof (x as NewsItem).id === 'string' && typeof (x as NewsItem).note === 'string' && typeof (x as NewsItem).at === 'number')
    .slice(0, NEWS_MAX);
}

export function loadNews(): NewsItem[] {
  try {
    return parseNews(JSON.parse(localStorage.getItem(NEWS_KEY) ?? '[]'));
  } catch {
    return [];
  }
}

export const NEWS_EVENT = 'esource:news';

export function saveNews(list: NewsItem[]): void {
  try {
    localStorage.setItem(NEWS_KEY, JSON.stringify(list));
  } catch {
    // ohne Platz bleiben sie nur bis zum Neuladen
  }
  try {
    window.dispatchEvent(new CustomEvent(NEWS_EVENT));
  } catch {
    // ohne Fenster (Tests)
  }
}
