/**
 * F-206 Schritt 10, Projekt-Desk (V117, entschieden V116 – Option B, PD1–PD10):
 * Ein Desk lässt sich an ein Projekt binden (PD1, PD7: mehrere Desks je Projekt, ein Desk höchstens ein Projekt).
 * Der Projekt-Umschalter im Kopf ist Pflicht (PD3) und wechselt das **gezeigte** Projekt, ohne umzubinden.
 * Der Desk öffnet immer das zuletzt gezeigte Projekt (je Gerät), beim ersten Mal und nach „Zurück zu …“ das
 * gebundene (PD9). Neue Notizen in Pads des Desks bekommen das gezeigte Projekt (PD4, je Desk abschaltbar);
 * Suche, Cockpit „Notizen“ und Fokus zeigen ab Werk nur das gezeigte Projekt (PD5, „Alles zeigen“ je Gerät).
 * Projekt entfernt → Desk bleibt und wird gelöst (PD6). Der Projekt-Desk ist die Einheit für Import/Export (PD10, F-230).
 *
 * Gespeichert in `Workspace.deskProjects` (Schlüssel = Desk-Id, '' = Main Desk) – optional im Dateiformat 11,
 * wie `deskLooks`. Zuletzt gezeigt und „Alles zeigen“ liegen nur im Browser (je Gerät).
 */
import type { Note, Workspace } from './types';
// bewusst ohne Import aus projects.ts/notes.ts (notes.ts liest newNoteProject – kein Kreis)
const projectsOf = (ws: Workspace) => ws.projects ?? [];
const projectById = (ws: Workspace, id: string | undefined) => (id ? projectsOf(ws).find((p) => p.id === id) : undefined);

export interface DeskBinding {
  project: string;
  /** PD4: neue Notizen bekommen das gezeigte Projekt – fehlt = an, `false` = aus. */
  assign?: false;
}

/** Bindung des Desks, nur wenn das Projekt noch da ist. */
export function bindingOf(ws: Workspace, win: string): DeskBinding | undefined {
  const b = ws.deskProjects?.[win];
  return b && projectById(ws, b.project) ? b : undefined;
}

/** Id des gebundenen Projekts oder `undefined`. */
export const boundProject = (ws: Workspace, win: string): string | undefined => bindingOf(ws, win)?.project;

/** PD7: alle Desks, die an dieses Projekt gebunden sind. */
export const desksOf = (ws: Workspace, project: string): string[] =>
  Object.entries(ws.deskProjects ?? {})
    .filter(([, b]) => b.project === project)
    .map(([w]) => w);

function withMap(ws: Workspace, map: Record<string, DeskBinding>): Workspace {
  if (Object.keys(map).length) return { ...ws, deskProjects: map };
  const { deskProjects: _d, ...rest } = ws; // eslint-disable-line @typescript-eslint/no-unused-vars
  return rest;
}

/** Desk an ein Projekt binden (ersetzt eine frühere Bindung; „neue Notizen zuordnen“ bleibt, wie es war). */
export function bindDesk(ws: Workspace, win: string, project: string): Workspace {
  if (!projectById(ws, project)) return ws;
  const old = ws.deskProjects?.[win];
  if (old?.project === project) return ws;
  return withMap(ws, { ...ws.deskProjects, [win]: { ...(old?.assign === false ? { assign: false as const } : {}), project } });
}

/** Bindung lösen – der Desk bleibt, wie er ist. */
export function unbindDesk(ws: Workspace, win: string): Workspace {
  if (!ws.deskProjects?.[win]) return ws;
  const { [win]: _gone, ...rest } = ws.deskProjects; // eslint-disable-line @typescript-eslint/no-unused-vars
  return withMap(ws, rest);
}

/** PD4 je Desk ein-/ausschalten. */
export function setAssign(ws: Workspace, win: string, on: boolean): Workspace {
  const b = ws.deskProjects?.[win];
  if (!b || (b.assign !== false) === on) return ws;
  return withMap(ws, { ...ws.deskProjects, [win]: on ? { project: b.project } : { project: b.project, assign: false } });
}

/** PD6: Bindungen an Projekte, die es nicht mehr gibt, und an Desks, die weggefallen sind, fallen weg. */
export function cleanBindings(ws: Workspace): Workspace {
  if (!ws.deskProjects) return ws;
  const desks = new Set(['', ...ws.windows.map((w) => w.id)]);
  const ids = new Set(projectsOf(ws).map((p) => p.id));
  const kept = Object.entries(ws.deskProjects).filter(([w, b]) => desks.has(w) && ids.has(b.project));
  if (kept.length === Object.keys(ws.deskProjects).length) return ws;
  return withMap(ws, Object.fromEntries(kept));
}

/** Gespeicherte Bindungen prüfen: nur bekannte Desks und Projekte. */
export function parseDeskProjects(v: unknown, winIds: ReadonlySet<string>, projectIds: ReadonlySet<string>): Record<string, DeskBinding> | undefined {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  const out: Record<string, DeskBinding> = {};
  for (const [w, b] of Object.entries(v as Record<string, unknown>)) {
    if (!(w === '' || winIds.has(w)) || !b || typeof b !== 'object') continue;
    const r = b as { project?: unknown; assign?: unknown };
    if (typeof r.project !== 'string' || !projectIds.has(r.project)) continue;
    out[w] = r.assign === false ? { project: r.project, assign: false } : { project: r.project };
  }
  return Object.keys(out).length ? out : undefined;
}

// ---------------------------------------------------------------- PD9: zuletzt gezeigt (je Gerät)

export type ShownMap = Record<string, string>;

/**
 * PD9: Welches Projekt zeigt der Desk? Gebunden: das zuletzt gezeigte (falls es das noch gibt), sonst das gebundene.
 * Ungebunden: das zuletzt gezeigte oder keins (die Projektliste wählt dann selbst).
 */
export function shownOn(ws: Workspace, win: string, last: ShownMap): string | undefined {
  const l = last[win];
  if (l && projectById(ws, l)) return l;
  return boundProject(ws, win);
}

const SHOWN_KEY = 'esource.deskShown.v1';
const ALL_KEY = 'esource.deskAll.v1';

function readMap(key: string): Record<string, unknown> {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}
function writeMap(key: string, m: Record<string, unknown>) {
  try {
    localStorage.setItem(key, JSON.stringify(m));
  } catch {
    // ohne Speicher: gilt bis zum Neuladen
  }
}

export function loadShown(): ShownMap {
  const m = readMap(SHOWN_KEY);
  return Object.fromEntries(Object.entries(m).filter(([, v]) => typeof v === 'string')) as ShownMap;
}
/** Gezeigtes Projekt merken (`undefined` = vergessen → nächstes Öffnen zeigt das gebundene). */
export function saveShown(win: string, project: string | undefined) {
  const m = loadShown();
  if (project) m[win] = project;
  else delete m[win];
  writeMap(SHOWN_KEY, m);
}

/** PD5: „Alles zeigen“ je Desk und Gerät (ab Werk aus = nur das gezeigte Projekt). */
export function loadShowAll(win: string): boolean {
  return readMap(ALL_KEY)[win] === true;
}
export function saveShowAll(win: string, all: boolean) {
  const m = readMap(ALL_KEY);
  if (all) m[win] = true;
  else delete m[win];
  writeMap(ALL_KEY, m);
}

// ---------------------------------------------------------------- PD4/PD5: Zustand des gezeigten Desks

/**
 * Wie `setCalendar`: die App setzt bei jedem Zeichnen, was für diesen Desk gilt. Die Bausteine (Neue Notiz,
 * Suche, Cockpit „Notizen“, Fokus) lesen es, ohne dass jeder Aufruf das Projekt durchreichen muss.
 */
let scope: { win: string; project?: string; assign: boolean; all: boolean } = { win: '', assign: false, all: true };

export function setDeskScope(s: { win?: string; project?: string; assign?: boolean; all?: boolean }) {
  scope = { win: s.win ?? '', project: s.project, assign: !!s.project && s.assign !== false, all: !s.project || !!s.all };
}

/** PD5: Zustand für die Anzeige „Nur <Projekt> · Alles zeigen“ – `project` fehlt = Desk nicht gebunden. */
export const deskScope = (): { project?: string; all: boolean } => ({ project: scope.project, all: scope.all });

/** Ereignis, auf das die App hört, wenn „Alles zeigen“ irgendwo umgeschaltet wurde. */
export const SCOPE_EVENT = 'esource:deskscope';

/** PD5: „Alles zeigen“ umschalten (je Desk und Gerät) – die App zeichnet daraufhin neu. */
export function toggleShowAll(): boolean {
  const all = !scope.all;
  saveShowAll(scope.win, all);
  try {
    window.dispatchEvent(new CustomEvent(SCOPE_EVENT, { detail: { win: scope.win, all } }));
  } catch {
    // ohne Fenster (Tests): nur gespeichert
  }
  return all;
}

/** PD4: Projekt für neue Notizen – nur auf einem gebundenen Desk mit „Neue Notizen zuordnen“. */
export const newNoteProject = (): string | undefined => (scope.assign ? scope.project : undefined);

/** PD5: Projekt, auf das Suche, Cockpit „Notizen“ und Fokus begrenzen – `undefined` = alles. */
export const scopeProject = (): string | undefined => (scope.all ? undefined : scope.project);

/** PD5: Gehört die Notiz in die Begrenzung? (ohne Begrenzung: ja) */
export function inScope(n: Pick<Note, 'project'>, project = scopeProject()): boolean {
  return !project || n.project === project;
}
