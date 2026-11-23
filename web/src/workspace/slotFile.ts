/**
 * F-158: Export und Import je Slot. Ein Slot samt Stack, Portalen, Tabs, Namen und Farben wird als
 * Datei gespeichert und auf einem anderen Gerät oder Desk als neuer Slot wieder geladen.
 *
 * Nicht in der Datei: die Library (Sources), Layouts und Bezüge auf Desks, Spaces oder Cases –
 * die gibt es auf dem anderen Gerät meist nicht. Kategorien der Portale reisen mit Namen, Farben
 * und Zeichen mit und werden beim Laden über den Namen zugeordnet (fehlt eine, wird sie angelegt).
 */
import { CATEGORY_ICONS } from './icons';
import { parsePanel } from './storage';
import { parseTint, setSlotTint } from './tint';
import type { ScreenSetup } from './screen';
import type { Category, Note, NoteView, PanelMeta, Tint, Workspace } from './types';
import { importNotes, notesForPanels, parseNoteViews, parseNotes } from './notes';
import { STACK_MAX, TAB_MAX, addArea, canAddArea, newId, renameArea, setArrangement, slotNameId, viewOf } from './workspace';

export const SLOT_FORMAT = 'e-sources-slot';
export const SLOT_VERSION = 1;

/** Kategorie, wie sie in der Datei steht (Id gilt nur innerhalb der Datei). */
export interface SlotCategory {
  id: string;
  name: string;
  tint?: Tint;
  icon?: string;
}

export interface SlotFile {
  format: typeof SLOT_FORMAT;
  version: number;
  savedAt: string;
  device: string;
  /** Name des Slots; fehlt = beim Laden gibt es den nächsten Standardnamen. */
  name?: string;
  /** Slot-Farben. */
  tint?: Tint;
  /** Portale in Reihenfolge des Stacks. */
  panels: PanelMeta[];
  /** Index des vorderen Portals. */
  front: number;
  categories: SlotCategory[];
  /** F-206: Notizen und Ansichten, auf die Tabs zeigen (samt Unter-Notizen); fehlt = keine. */
  notes?: Note[];
  noteViews?: NoteView[];
}

/** Felder, die nur auf diesem Gerät Sinn ergeben (Desk, Slot-Name, Space, Case, Merker des Entwickler-Modus). */
function portable(p: PanelMeta): PanelMeta {
  const { win: _w, areaName: _a, sphere: _s, scenario: _c, devKeep: _k, ...rest } = p;
  return rest;
}

/** Datei-Inhalt für die Portale `ids` (Reihenfolge des Stacks), vorn `front`. */
export function slotToFile(ws: Workspace, ids: string[], front: string, device: string, now = new Date()): SlotFile | null {
  const byId = new Map(ws.panels.map((p) => [p.id, p]));
  const panels = ids.map((id) => byId.get(id)).filter((p): p is PanelMeta => !!p);
  if (panels.length === 0) return null;
  const nameId = slotNameId(ws, ids, front);
  const entry = ws.areaNames.find((a) => a.id === nameId);
  const { notes, views } = notesForPanels(ws, panels);
  const used = new Set(
    [...panels.map((p) => p.category), ...notes.map((n) => n.category), ...views.map((v) => v.category)].filter((c): c is string => !!c),
  );
  const categories: SlotCategory[] = ws.categories
    .filter((c) => used.has(c.id))
    .map((c) => ({ id: c.id, name: c.name, ...(c.tint ? { tint: c.tint } : {}), ...(c.icon ? { icon: c.icon } : {}) }));
  return {
    format: SLOT_FORMAT,
    version: SLOT_VERSION,
    savedAt: now.toISOString(),
    device,
    ...(entry?.name ? { name: entry.name } : {}),
    ...(entry?.tint ? { tint: entry.tint } : {}),
    panels: panels.map(portable),
    front: Math.max(0, panels.findIndex((p) => p.id === front)),
    categories,
    ...(notes.length ? { notes } : {}),
    ...(views.length ? { noteViews: views } : {}),
  };
}

/** Dateiname aus dem Slot-Namen, z. B. „e-sources-slot-recherche.json“. */
export function slotFileName(name: string | undefined): string {
  const slug = (name ?? '')
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `e-sources-slot${slug ? `-${slug}` : ''}.json`;
}

export type SlotRead = { ok: true; file: SlotFile } | { ok: false; error: string; desks?: boolean };

/** True, wenn der Text wie eine Slot-Datei aussieht (für „Desks aus Datei laden …“). */
export function isSlotFile(text: string): boolean {
  try {
    const d = JSON.parse(text);
    return !!d && typeof d === 'object' && d.format === SLOT_FORMAT;
  } catch {
    return false;
  }
}

/** Liest und prüft eine Slot-Datei. `desks` = es ist eine Datei mit allen Desks. */
export function readSlotFile(text: string): SlotRead {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Die Datei ist kein gültiges JSON.' };
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, error: 'Die Datei enthält keinen Slot.' };
  const d = data as Record<string, unknown>;
  if (d.format === 'e-sources-arbeitsflaeche')
    return { ok: false, desks: true, error: 'Das ist eine Datei mit allen Desks, kein einzelner Slot. Laden über Einstellungen (Zahnrad) › „Desks aus Datei laden …“.' };
  if (d.format !== SLOT_FORMAT) return { ok: false, error: 'Das ist keine Slot-Datei von E-Sources.' };
  if (typeof d.version !== 'number' || d.version > SLOT_VERSION)
    return { ok: false, error: 'Die Datei stammt aus einer neueren E-Sources-Version. Bitte E-Sources neu laden.' };
  const raw = Array.isArray(d.panels) ? d.panels.map(parsePanel).filter((p): p is PanelMeta => !!p) : [];
  if (raw.length === 0) return { ok: false, error: 'In der Datei ist kein Portal.' };
  const panels = raw.slice(0, STACK_MAX).map((p) => {
    const tabs = p.tabs.slice(0, TAB_MAX);
    return portable({ ...p, tabs, activeTab: tabs.some((t) => t.id === p.activeTab) ? p.activeTab : tabs[0].id });
  });
  const categories: SlotCategory[] = Array.isArray(d.categories)
    ? d.categories.flatMap((c): SlotCategory[] => {
        if (!c || typeof c !== 'object') return [];
        const x = c as Record<string, unknown>;
        if (typeof x.id !== 'string' || typeof x.name !== 'string' || !x.name.trim()) return [];
        const tint = parseTint(x.tint);
        const icon = typeof x.icon === 'string' && (CATEGORY_ICONS as readonly string[]).includes(x.icon) ? x.icon : undefined;
        return [{ id: x.id, name: x.name.trim(), ...(tint ? { tint } : {}), ...(icon ? { icon } : {}) }];
      })
    : [];
  const front = typeof d.front === 'number' && d.front >= 0 && d.front < panels.length ? Math.floor(d.front) : 0;
  const tint = parseTint(d.tint);
  const fileCats = new Set(categories.map((c) => c.id));
  const notes = parseNotes(d.notes, fileCats);
  const noteViews = parseNoteViews(d.noteViews, new Set(notes.map((n) => n.id)), fileCats);
  return {
    ok: true,
    file: {
      format: SLOT_FORMAT,
      version: d.version,
      savedAt: typeof d.savedAt === 'string' ? d.savedAt : '',
      device: typeof d.device === 'string' ? d.device : 'unbekanntes Gerät',
      ...(typeof d.name === 'string' && d.name.trim() ? { name: d.name.trim() } : {}),
      ...(tint ? { tint } : {}),
      panels,
      front,
      categories,
      ...(notes.length ? { notes } : {}),
      ...(noteViews.length ? { noteViews } : {}),
    },
  };
}

export type SlotImport = { ok: true; ws: Workspace; front: string; name: string } | { ok: false; reason: 'full' };

/**
 * Legt die Portale der Datei als neuen Slot rechts an (wie „+ NewSlot“). Neue Ids für Portale und
 * Tabs, damit dieselbe Datei mehrmals geladen werden kann. Gibt es den Slot-Namen schon, bekommt
 * der neue eine Nummer dahinter.
 */
export function importSlot(ws: Workspace, setup: ScreenSetup, file: SlotFile, makeId: () => string = newId): SlotImport {
  if (!canAddArea(ws, setup)) return { ok: false, reason: 'full' };
  // Kategorien über den Namen zuordnen, fehlende anlegen
  let categories = ws.categories;
  const catMap = new Map<string, string>();
  for (const c of file.categories) {
    const hit = categories.find((x) => x.name.toLowerCase() === c.name.toLowerCase());
    if (hit) catMap.set(c.id, hit.id);
    else {
      const made: Category = { id: makeId(), name: c.name, ...(c.tint ? { tint: c.tint } : {}), ...(c.icon ? { icon: c.icon } : {}) };
      categories = [...categories, made];
      catMap.set(c.id, made.id);
    }
  }
  // F-206: Notizen und Ansichten mit neuen Ids; Tabs zeigen danach auf die neuen
  const moved = importNotes({ ...ws, categories }, file.notes ?? [], file.noteViews ?? [], catMap, makeId);
  const panels: PanelMeta[] = file.panels.map((p) => {
    const tabIds = new Map(p.tabs.map((t) => [t.id, makeId()]));
    const out: PanelMeta = {
      ...p,
      id: makeId(),
      tabs: p.tabs.map((t) => {
        const out = { ...t, id: tabIds.get(t.id)! };
        if (t.note) {
          const n = moved.noteIds.get(t.note);
          if (n) out.note = n;
          else delete out.note;
        }
        if (t.view) {
          const v = moved.viewIds.get(t.view);
          if (v) out.view = v;
          else delete out.view;
        }
        return out;
      }),
      activeTab: tabIds.get(p.activeTab) ?? tabIds.get(p.tabs[0].id)!,
      ...(setup.win ? { win: setup.win } : {}),
    };
    if (p.category) {
      const mapped = catMap.get(p.category);
      if (mapped) out.category = mapped;
      else delete out.category; // Kategorie fehlt in der Datei → wird beim nächsten Laden einer Seite erfragt
    }
    return out;
  });
  // Neuer Slot mit leerem Portal, das dann durch die Portale der Datei ersetzt wird
  const added = addArea(moved.ws, setup, 'right');
  const known = new Set(ws.panels.map((p) => p.id));
  const blank = added.panels.find((p) => !known.has(p.id));
  const arr = viewOf(added, setup).arrangement;
  const areaId = blank && arr ? Object.keys(arr.areas).find((k) => arr.areas[k].panels.includes(blank.id)) : undefined;
  if (!blank || !arr || !areaId) return { ok: false, reason: 'full' };
  const front = panels[file.front]?.id ?? panels[0].id;
  let next: Workspace = {
    ...added,
    panels: [...added.panels.filter((p) => p.id !== blank.id), ...panels],
    nextNumber: ws.nextNumber, // das leere Portal zählt nicht
  };
  next = setArrangement(next, setup, { ...arr, areas: { ...arr.areas, [areaId]: { id: areaId, panels: panels.map((p) => p.id), front } } });
  // Name: aus der Datei, bei Gleichstand mit Nummer; ohne Namen in der Datei der nächste Standardname
  const taken = new Set(next.areaNames.map((a) => a.name.toLowerCase()));
  let name = file.name;
  if (name && taken.has(name.toLowerCase())) {
    let n = 2;
    while (taken.has(`${name} ${n}`.toLowerCase())) n++;
    name = `${name} ${n}`;
  }
  if (name) next = renameArea(next, setup, areaId, name);
  if (file.tint) next = setSlotTint(next, setup, areaId, { frame: file.tint.frame ?? null, accent: file.tint.accent ?? null });
  const nameId = slotNameId(next, panels.map((p) => p.id), front);
  const label = next.areaNames.find((a) => a.id === nameId)?.name ?? name ?? '';
  return { ok: true, ws: next, front, name: label };
}
