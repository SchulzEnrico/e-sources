/**
 * V126 (F-231 K11): Spaltenfarbe und Spalte einklappen – wie Trello „Listenfarbe“ und „Liste einklappen“.
 *
 * Farbe: eine der zehn Trello-Listenfarben (dieselben Grundtöne wie die Tag-Farbliste, T4 – „weitestgehend gleicher
 * Aufbau“; Töne an unsere UX/UI angepasst). Sie hängt an der Spalte, wird abgeglichen und geht mit Trello hin und
 * zurück (`list.color`). Die Spalte nennt ihre Farbe immer auch mit Namen (V61: nie Farbe allein).
 *
 * Einklappen ist wie bei Trello persönlich: je Sheet und Gerät gemerkt (`SheetPref.folded`), nicht abgeglichen;
 * Trello führt es nicht in der Datei. Eingeklappt zeigt die Spalte Name, Zähler und WIP-Hinweis als schmalen Streifen.
 */
import type { NoteColumn, Workspace } from './types';
import * as No from './notes';
import { tagColorName, tagHex, tagInk } from './tags';

/** Spaltenfarben (Id = Trello-Listenfarbe); feste Liste, damit beim Laden kein Ring-Import greift (V125). Gleich TAG_COLORS. */
export const COL_COLORS = ['green', 'yellow', 'orange', 'red', 'purple', 'blue', 'sky', 'lime', 'pink', 'black'] as const;
export type ColColor = (typeof COL_COLORS)[number];

export const isColColor = (c: unknown): c is ColColor => typeof c === 'string' && (COL_COLORS as readonly string[]).includes(c);
export const colHex = (c: ColColor): string => tagHex(c);
export const colInk = (c: ColColor): string => tagInk(c);
export const colColorName = (c: ColColor): string => tagColorName(c);

/** Farbe einer Spalte setzen (`undefined` = ohne Farbe); gilt auch für archivierte Spalten. Unbekannte Farbe ändert nichts. */
export function setColColor(ws: Workspace, viewId: string, colId: string, color: string | undefined): Workspace {
  const v = No.viewById(ws, viewId);
  if (!v || v.kind !== 'kanban' || (color !== undefined && !isColColor(color))) return ws;
  const put = (c: NoteColumn): NoteColumn => {
    if (c.id !== colId) return c;
    if (color === undefined) {
      const { color: _c, ...rest } = c;
      void _c;
      return rest;
    }
    return { ...c, color };
  };
  const hit = (v.cols ?? []).some((c) => c.id === colId) || (v.archivedCols ?? []).some((c) => c.id === colId);
  if (!hit) return ws;
  return {
    ...ws,
    noteViews: No.viewsOf(ws).map((x) => (x.id !== viewId ? x : { ...x, cols: (x.cols ?? []).map(put), ...(x.archivedCols ? { archivedCols: x.archivedCols.map(put) } : {}) })),
  };
}

/** Farbe beim Laden bzw. aus Trello prüfen. */
export const parseColColor = (c: unknown): ColColor | undefined => (isColColor(c) ? c : undefined);

// ---------- Einklappen (persönlich, je Sheet und Gerät) ----------

/** Nur Spalten, die es gibt; jede einmal, in Spaltenreihenfolge. */
export function cleanFolded(folded: readonly string[] | undefined, cols: readonly NoteColumn[]): string[] {
  const set = new Set(folded ?? []);
  return cols.filter((c) => set.has(c.id)).map((c) => c.id);
}

/** Spalte ein- bzw. ausklappen. */
export function toggleFolded(folded: readonly string[] | undefined, colId: string, cols: readonly NoteColumn[]): string[] {
  const set = new Set(cleanFolded(folded, cols));
  if (set.has(colId)) set.delete(colId);
  else set.add(colId);
  return cols.filter((c) => set.has(c.id)).map((c) => c.id);
}

/** „Alle anderen einklappen“ – nur diese Spalte bleibt offen (Fokus auf eine Spalte). */
export const foldOthers = (cols: readonly NoteColumn[], keep: string): string[] => cols.filter((c) => c.id !== keep).map((c) => c.id);

/** Eine Spalte bleibt offen: alle einklappen geht nicht (das Board wäre leer). */
export const canFold = (folded: readonly string[] | undefined, colId: string, cols: readonly NoteColumn[]): boolean => {
  const f = new Set(cleanFolded(folded, cols));
  return f.has(colId) || cols.filter((c) => !f.has(c.id)).length > 1;
};

// ---------- Trello ----------

/** Trello-Liste → Farbe der Spalte (`null`, fehlt oder unbekannt = ohne). */
export const colorFromTrello = (list: Record<string, unknown>): ColColor | undefined => parseColColor(list.color);

/**
 * Farbe in die Trello-Liste schreiben: nur, wenn Trello das Feld kannte oder die Spalte eine Farbe hat
 * (so bleibt eine Datei ohne Listenfarben unverändert); ohne Farbe = `null`.
 */
export function colorToTrello(raw: Record<string, unknown>, col: NoteColumn | undefined): void {
  if (!col) return;
  if (col.color) raw.color = col.color;
  else if ('color' in raw) raw.color = null;
}
