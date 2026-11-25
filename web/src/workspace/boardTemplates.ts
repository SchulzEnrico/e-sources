/**
 * V88 (F-206 Schritt 7, BL1–BL3): Board-Vorlagen – wie Trello-Vorlagen. Eine Vorlage speichert die
 * Spalten eines Kanban-Boards (Name, Bedeutung, WIP-Limit) und die Regel „Abnahme nötig“, aber
 * keine Karten. Mitgelieferte Vorlagen stehen im Code (BUILTIN_TEMPLATES) und lassen sich weder
 * umbenennen noch löschen; eigene liegen in Workspace.boardTemplates (abgeglichen, in der
 * Datei-Sicherung). Entscheidungen: Claude Doc „F-206 V87 – Kanban im Cockpit und Board-Layouts“.
 * Reine Funktionen.
 */
import type { BoardTemplate, ColState, TemplateColumn, Workspace } from './types';
import * as No from './notes';
import { colStateOf } from './sheets';
import { newId } from './workspace';

/** Höchstens so viele eigene Vorlagen. */
export const TEMPLATE_MAX = 40;
/** Länge eines Vorlagen-Namens. */
export const TEMPLATE_NAME_MAX = 40;
const STATES: readonly ColState[] = ['open', 'doing', 'review', 'done'];

/** Mitgelieferte Vorlagen (BL2) – feste Ids mit Vorsilbe „tpl-“. */
export const BUILTIN_TEMPLATES: readonly BoardTemplate[] = [
  {
    id: 'tpl-simple',
    name: 'Einfach',
    cols: [
      { name: 'Offen', state: 'open' },
      { name: 'In Arbeit', state: 'doing' },
      { name: 'Erledigt', state: 'done' },
    ],
  },
  {
    id: 'tpl-review',
    name: 'Mit Prüfung',
    cols: [
      { name: 'Offen', state: 'open' },
      { name: 'In Arbeit', state: 'doing' },
      { name: 'In Prüfung', state: 'review' },
      { name: 'Erledigt', state: 'done' },
    ],
  },
  {
    id: 'tpl-sales',
    name: 'Vertrieb',
    cols: [
      { name: 'Lead', state: 'open' },
      { name: 'Kontakt', state: 'doing' },
      { name: 'Angebot', state: 'doing' },
      { name: 'Abschluss', state: 'done' },
    ],
  },
  {
    id: 'tpl-jobs',
    name: 'Bewerbungen',
    cols: [
      { name: 'Gefunden', state: 'open' },
      { name: 'Beworben', state: 'doing' },
      { name: 'Gespräch', state: 'doing' },
      { name: 'Abgeschlossen', state: 'done' },
    ],
  },
];

export const isBuiltIn = (id: string): boolean => BUILTIN_TEMPLATES.some((t) => t.id === id);
export const ownTemplates = (ws: Workspace): BoardTemplate[] => ws.boardTemplates ?? [];
/** Alle Vorlagen: mitgelieferte zuerst, dann eigene in ihrer Reihenfolge. */
export const templatesOf = (ws: Workspace): BoardTemplate[] => [...BUILTIN_TEMPLATES, ...ownTemplates(ws)];
export const templateById = (ws: Workspace, id: string): BoardTemplate | undefined => templatesOf(ws).find((t) => t.id === id);

function withOwn(ws: Workspace, list: BoardTemplate[]): Workspace {
  const out: Workspace = { ...ws, boardTemplates: list };
  if (!list.length) delete out.boardTemplates;
  return out;
}

const clip = (name: string) => name.trim().replace(/\s+/g, ' ').slice(0, TEMPLATE_NAME_MAX);

/** Name schon vergeben (ohne Groß/klein; `except` = die Vorlage selbst)? */
export function templateNameTaken(ws: Workspace, name: string, except?: string): boolean {
  const n = clip(name).toLowerCase();
  return !!n && templatesOf(ws).some((t) => t.id !== except && t.name.toLowerCase() === n);
}

/** „Vertrieb“, „Vertrieb 2“ … – freier Name auf Basis von `base`. */
export function freeTemplateName(ws: Workspace, base: string): string {
  const b = clip(base) || 'Vorlage';
  if (!templateNameTaken(ws, b)) return b;
  let i = 2;
  while (templateNameTaken(ws, `${b} ${i}`)) i++;
  return `${b} ${i}`;
}

/** Spalten eines Boards als Vorlagen-Spalten (ohne Karten). */
export function colsOfBoard(ws: Workspace, viewId: string): TemplateColumn[] | null {
  const v = No.viewById(ws, viewId);
  if (!v || v.kind !== 'kanban' || !v.cols?.length) return null;
  return v.cols.map((c) => ({ name: c.name, state: colStateOf(c), ...(c.wip ? { wip: c.wip } : {}) }));
}

export type TemplateResult = { ok: true; ws: Workspace; id: string } | { ok: false; reason: 'missing' | 'full' | 'taken' };

/** BL3: Vorlage aus einem bestehenden Board speichern („Als Vorlage speichern …“). */
export function templateFromBoard(ws: Workspace, viewId: string, name: string, opts: { id?: string } = {}): TemplateResult {
  const cols = colsOfBoard(ws, viewId);
  const v = No.viewById(ws, viewId);
  if (!cols || !v) return { ok: false, reason: 'missing' };
  if (ownTemplates(ws).length >= TEMPLATE_MAX) return { ok: false, reason: 'full' };
  const n = clip(name) || freeTemplateName(ws, v.name);
  if (templateNameTaken(ws, n)) return { ok: false, reason: 'taken' };
  const t: BoardTemplate = { id: opts.id ?? newId(), name: n, cols, ...(v.review ? { review: true } : {}) };
  return { ok: true, ws: withOwn(ws, [...ownTemplates(ws), t]), id: t.id };
}

/** Eigene Vorlage hinzufügen (z. B. aus einer Datei); Name wird bei Bedarf frei gemacht. */
export function addTemplate(ws: Workspace, t: Omit<BoardTemplate, 'id'>, opts: { id?: string } = {}): TemplateResult {
  if (ownTemplates(ws).length >= TEMPLATE_MAX) return { ok: false, reason: 'full' };
  const cols = cleanCols(t.cols);
  if (!cols.length) return { ok: false, reason: 'missing' };
  const id = opts.id ?? newId();
  const out: BoardTemplate = { id, name: freeTemplateName(ws, t.name), cols, ...(t.review ? { review: true } : {}) };
  return { ok: true, ws: withOwn(ws, [...ownTemplates(ws), out]), id };
}

/** Umbenennen (nur eigene; leerer oder vergebener Name ändert nichts). */
export function renameTemplate(ws: Workspace, id: string, name: string): Workspace {
  const n = clip(name);
  if (!n || isBuiltIn(id) || templateNameTaken(ws, n, id)) return ws;
  let hit = false;
  const list = ownTemplates(ws).map((t) => (t.id === id ? ((hit = true), { ...t, name: n }) : t));
  return hit ? withOwn(ws, list) : ws;
}

export interface TemplateUndo {
  tpl: BoardTemplate;
  index: number;
}

/** Löschen (nur eigene) – mit Angaben für „Rückgängig“. */
export function deleteTemplate(ws: Workspace, id: string): { ws: Workspace; undo: TemplateUndo } | null {
  const list = ownTemplates(ws);
  const index = list.findIndex((t) => t.id === id);
  if (index < 0) return null;
  return { ws: withOwn(ws, list.filter((t) => t.id !== id)), undo: { tpl: list[index], index } };
}

/** „Rückgängig“ nach dem Löschen: an den alten Platz (gibt es die Id schon, ändert sich nichts). */
export function restoreTemplate(ws: Workspace, u: TemplateUndo): Workspace {
  const list = ownTemplates(ws);
  if (list.some((t) => t.id === u.tpl.id)) return ws;
  const out = [...list];
  out.splice(Math.min(u.index, out.length), 0, u.tpl);
  return withOwn(ws, out);
}

/**
 * Neues Kanban-Board aus einer Vorlage (BL2: „Leer · Vorlage …“). Ohne Vorlage = Start-Spalten.
 * Name: vorgegeben, sonst „Vertrieb“, „Vertrieb 2“ … bzw. der Standardname bei „Einfach“.
 */
export function createBoard(ws: Workspace, tplId: string | undefined, opts: { id?: string; name?: string; makeId?: () => string } = {}): { ws: Workspace; id: string } {
  const make = opts.makeId ?? newId;
  const t = tplId ? templateById(ws, tplId) : undefined;
  const base = opts.name?.trim() || (t && t.id !== 'tpl-simple' ? freeViewName(ws, t.name) : No.defaultViewName(ws, 'kanban'));
  const made = No.createView(ws, 'kanban', base, { id: opts.id ?? make(), makeId: make });
  if (!t) return made;
  return { ws: applyCols(made.ws, made.id, t, make), id: made.id };
}

/** Spalten und Regel der Vorlage auf ein (leeres) Board legen. */
function applyCols(ws: Workspace, viewId: string, t: BoardTemplate, make: () => string): Workspace {
  return {
    ...ws,
    noteViews: No.viewsOf(ws).map((v) => {
      if (v.id !== viewId) return v;
      const out = { ...v, cols: t.cols.map((c) => ({ id: make(), name: c.name, ids: [] as string[], state: c.state, ...(c.wip ? { wip: c.wip } : {}) })) };
      if (t.review) out.review = true;
      else delete out.review;
      return out;
    }),
  };
}

/** Freier Sheet-Name („Vertrieb“, „Vertrieb 2“ …). */
function freeViewName(ws: Workspace, base: string): string {
  const taken = new Set(No.viewsOf(ws).map((v) => v.name.toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  let i = 2;
  while (taken.has(`${base} ${i}`.toLowerCase())) i++;
  return `${base} ${i}`;
}

// ---------------------------------------------------------------- Prüfen und Datei

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

function cleanCols(v: unknown): TemplateColumn[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter(isObj)
    .slice(0, No.COLUMN_MAX)
    .map((c) => {
      const name = typeof c.name === 'string' && c.name.trim() ? c.name.trim().slice(0, 60) : 'Spalte';
      const state = STATES.includes(c.state as ColState) ? (c.state as ColState) : colStateOf({ name });
      const wip = typeof c.wip === 'number' && Number.isFinite(c.wip) && c.wip >= 1 ? Math.floor(c.wip) : undefined;
      return { name, state, ...(wip ? { wip } : {}) };
    });
}

/** Eigene Vorlagen beim Laden prüfen: doppelte Ids und Namen von mitgelieferten fallen weg. */
export function parseBoardTemplates(v: unknown): BoardTemplate[] {
  if (!Array.isArray(v)) return [];
  const ids = new Set<string>(BUILTIN_TEMPLATES.map((t) => t.id));
  const names = new Set<string>(BUILTIN_TEMPLATES.map((t) => t.name.toLowerCase()));
  const out: BoardTemplate[] = [];
  for (const raw of v) {
    if (!isObj(raw) || typeof raw.id !== 'string' || !raw.id || ids.has(raw.id)) continue;
    const name = typeof raw.name === 'string' ? clip(raw.name) : '';
    const cols = cleanCols(raw.cols);
    if (!name || names.has(name.toLowerCase()) || !cols.length) continue;
    ids.add(raw.id);
    names.add(name.toLowerCase());
    out.push({ id: raw.id, name, cols, ...(raw.review === true ? { review: true } : {}) });
    if (out.length >= TEMPLATE_MAX) break;
  }
  return out;
}

export const TEMPLATE_FORMAT = 'e-sources-board-vorlage';
export const TEMPLATE_VERSION = 1;

export interface TemplateFile {
  format: typeof TEMPLATE_FORMAT;
  version: number;
  savedAt: string;
  template: Omit<BoardTemplate, 'id'>;
}

export function templateToFile(t: BoardTemplate, now = new Date()): TemplateFile {
  const { id: _id, ...rest } = t;
  return { format: TEMPLATE_FORMAT, version: TEMPLATE_VERSION, savedAt: now.toISOString(), template: rest };
}

/** Dateiname, z. B. „e-sources-vorlage-vertrieb.json“. */
export function templateFileName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `e-sources-vorlage${slug ? `-${slug}` : ''}.json`;
}

export type TemplateRead = { ok: true; template: Omit<BoardTemplate, 'id'> } | { ok: false; error: 'json' | 'format' | 'newer' | 'empty' };

/** Liest und prüft eine Vorlagen-Datei. */
export function readTemplateFile(text: string): TemplateRead {
  let d: unknown;
  try {
    d = JSON.parse(text);
  } catch {
    return { ok: false, error: 'json' };
  }
  if (!isObj(d) || d.format !== TEMPLATE_FORMAT || !isObj(d.template)) return { ok: false, error: 'format' };
  if (typeof d.version !== 'number' || d.version > TEMPLATE_VERSION) return { ok: false, error: 'newer' };
  const t = d.template;
  const cols = cleanCols(t.cols);
  if (!cols.length) return { ok: false, error: 'empty' };
  const name = typeof t.name === 'string' && clip(t.name) ? clip(t.name) : 'Vorlage';
  return { ok: true, template: { name, cols, ...(t.review === true ? { review: true } : {}) } };
}
