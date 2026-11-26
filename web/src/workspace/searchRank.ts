/**
 * V84 (F-206 Schritt 5, N6): Suche über alle Arten – gemeinsame Passung, beste Treffer oben, egal welcher Art.
 * Reine Funktionen (mit Test): Passung je Treffer, Sortierung, Zählung je Chip, Wechsel des Chips per Tastatur.
 *
 * Art (`SearchKind`) = was der Treffer ist; Chip (`SearchChip`) = Filter oben in der Liste
 * (Alle · Portale · Library · Notizen · Funktionen). Cases zählen zu „Portale“, Fragen und Begriffe zu „Funktionen“.
 */

export type SearchKind = 'case' | 'portal' | 'source' | 'note' | 'view' | 'decision' | 'function' | 'term' | 'question';
export type SearchChip = 'all' | 'portals' | 'library' | 'notes' | 'functions';

export const SEARCH_CHIPS: SearchChip[] = ['all', 'portals', 'library', 'notes', 'functions'];

/** Chip, unter dem eine Art steht. */
export function chipOf(kind: SearchKind): Exclude<SearchChip, 'all'> {
  switch (kind) {
    case 'case':
    case 'portal':
      return 'portals';
    case 'source':
      return 'library';
    case 'note':
    case 'view':
    case 'decision':
      return 'notes';
    default:
      return 'functions';
  }
}

/** Kleinschreibung, ohne Akzente (ä bleibt a-artig gleichwertig: „Haefen“ ≠ „Häfen“, aber „Café“ = „cafe“). */
export function fold(s: string): string {
  return s
    .toLocaleLowerCase('de')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Passung eines Treffers: 0–100. Titel zählt mehr als Beiwerk (Adresse, Kategorie, Slot, Text).
 * 100 Titel genau · 85 Titel beginnt so · 70 ein Wort im Titel beginnt so · 55 Titel enthält es ·
 * 45 alle Wörter im Titel · 30 Beiwerk beginnt so · 20 Beiwerk enthält es · 15 alle Wörter irgendwo · 5 sonst
 * (gefunden über etwas, das hier nicht steht, z. B. Tags).
 */
export function fitOf(query: string, title: string, extra: string[] = []): number {
  const q = fold(query);
  if (!q) return 0;
  const t = fold(title);
  if (t === q) return 100;
  if (t.startsWith(q)) return 85;
  if (t.split(/[\s\-–/·.,:;()„“"]+/).some((w) => w.startsWith(q))) return 70;
  if (t.includes(q)) return 55;
  const words = q.split(' ').filter(Boolean);
  if (words.length > 1 && words.every((w) => t.includes(w))) return 45;
  const ex = extra.filter(Boolean).map(fold);
  if (ex.some((e) => e.startsWith(q))) return 30;
  if (ex.some((e) => e.includes(q))) return 20;
  const all = [t, ...ex].join(' ');
  if (words.length > 1 && words.every((w) => all.includes(w))) return 15;
  return 5;
}

export type Rankable = { kind: SearchKind; title: string; extra?: string[] };

/** Zuschlag, wenn die Eingabe eine Frage ist („wie …“): Fragen stehen dann vorn (F-186). */
export const QUESTION_BONUS = 60;

/**
 * Sortiert nach Passung (höchste zuerst); bei gleicher Passung bleibt die Reihenfolge der Eingabe
 * (Cases, Portale, Library, Notizen, Fragen, Funktionen). Gibt neue Liste zurück.
 */
export function rankHits<T extends Rankable>(items: T[], query: string, asksQuestion = false): T[] {
  return items
    .map((it, i) => ({ it, i, s: fitOf(query, it.title, it.extra) + (asksQuestion && it.kind === 'question' ? QUESTION_BONUS : 0) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.it);
}

/** Trefferzahl je Chip (Alle = alle). */
export function chipCounts(items: { kind: SearchKind }[]): Record<SearchChip, number> {
  const n: Record<SearchChip, number> = { all: items.length, portals: 0, library: 0, notes: 0, functions: 0 };
  for (const it of items) n[chipOf(it.kind)]++;
  return n;
}

/** Treffer, die der Chip zeigt. */
export function byChip<T extends { kind: SearchKind }>(items: T[], chip: SearchChip): T[] {
  return chip === 'all' ? items : items.filter((it) => chipOf(it.kind) === chip);
}

/**
 * Nächster Chip per Strg/⌃+→ (dir 1) bzw. ←(-1): ringsum, Chips ohne Treffer werden übersprungen
 * („Alle“ bleibt immer erreichbar).
 */
export function chipStep(cur: SearchChip, dir: 1 | -1, counts: Record<SearchChip, number>): SearchChip {
  const n = SEARCH_CHIPS.length;
  let i = SEARCH_CHIPS.indexOf(cur);
  for (let k = 0; k < n; k++) {
    i = (i + dir + n) % n;
    const c = SEARCH_CHIPS[i];
    if (c === 'all' || counts[c] > 0) return c;
  }
  return cur;
}
