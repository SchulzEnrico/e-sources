/**
 * F-206 Schritt 10 (V98): Projekte – Logik für Projekt-Modus, Projektliste und Steckbrief.
 * Vorbild: MS Project / iTaskX (Projektübersicht, Projektinfo) und IPMA ICB4 (Projektsteckbrief: Ziel,
 * Vorgehen, Organisation). Datenmodell `Project` besteht seit v8 (types.ts); Vorgang = Notiz mit `project`.
 * Reine Funktionen, Tests in workspace.test.ts („F-206 Schritt 10 Projekte“).
 */
import type { Note, Project, ProjectRole, Workspace } from './types';
import { dayOf, isFinished, notesOf } from './notes';
import { cleanName } from './profile';
import { planHours } from './gpm';

export const PROJECTS_MAX = 200;
export type ProjectState = NonNullable<Project['state']>;
/** Reihenfolge der Zustände wie im Lebenszyklus (ICB4: Initialisierung → Abschluss). */
export const PROJECT_STATES: ProjectState[] = ['idea', 'planned', 'running', 'paused', 'done', 'stopped'];

export const projectsOf = (ws: Workspace): Project[] => ws.projects ?? [];
export const projectById = (ws: Workspace, id: string | undefined): Project | undefined => (id ? projectsOf(ws).find((p) => p.id === id) : undefined);
export const notesOfProject = (ws: Workspace, id: string): Note[] => notesOf(ws).filter((n) => n.project === id);
/** F-225 P8 (V107, R1): Vorgang = Notiz, die kein Risiko und kein Änderungsantrag ist (Steuerungsobjekte nach ICB4). */
/** F-226 (V109): nur Notizen ohne Art sind Vorgänge – Risiko, Änderung, Anforderung, Stakeholder, Beschaffung und Protokoll sind Register-Einträge. */
export const isTask = (n: Pick<Note, 'type'>): boolean => !n.type;
/** R1: Vorgänge eines Projekts (ohne Risiken und Änderungsanträge) – für Liste, Steckbrief, PSP, Gantt. */
export const tasksOfProject = (ws: Workspace, id: string): Note[] => notesOfProject(ws, id).filter(isTask);

function withProjects(ws: Workspace, projects: Project[]): Workspace {
  if (projects.length) return { ...ws, projects };
  const { projects: _p, ...rest } = ws; // eslint-disable-line @typescript-eslint/no-unused-vars
  return rest;
}

const fold = (s: string) => s.trim().toLocaleLowerCase('de');

/** Id aus dem Namen (stabil), bei Gleichstand mit Zusatz. */
export function projectIdFor(name: string, taken: ReadonlySet<string>): string {
  let h = 0;
  for (const ch of fold(name)) h = (Math.imul(h, 31) + ch.codePointAt(0)!) >>> 0;
  let id = `pj-${h.toString(36)}`;
  while (taken.has(id)) id = `${id}x`;
  return id;
}

/** Ähnliche Namen (Hinweis „ähnlich: …“ beim Anlegen, wie bei Personen). */
export function similarProjects(ws: Workspace, name: string): Project[] {
  const q = fold(name);
  if (q.length < 2) return [];
  return projectsOf(ws).filter((p) => {
    const n = fold(p.name);
    return n !== q && (n.includes(q) || q.includes(n));
  });
}

/** Neues Projekt (Zustand „Idee“). Gleicher Name = dasselbe Projekt (gibt dessen Id zurück). */
export function addProject(ws: Workspace, name: string, extra: Partial<Omit<Project, 'id' | 'created' | 'changed'>> = {}, now = Date.now()): { ws: Workspace; id: string } | null {
  const clean = cleanName(name);
  if (!clean) return null;
  const same = projectsOf(ws).find((p) => fold(p.name) === fold(clean));
  if (same) return { ws, id: same.id };
  if (projectsOf(ws).length >= PROJECTS_MAX) return null;
  const id = projectIdFor(clean, new Set(projectsOf(ws).map((p) => p.id)));
  const p: Project = { state: 'idea', ...extra, id, name: clean, created: now, changed: now };
  if (p.parent && !projectById(ws, p.parent)) delete p.parent;
  return { ws: withProjects(ws, [...projectsOf(ws), p]), id };
}

/** Würde `parent` als übergeordnetes Projekt von `id` einen Kreis ergeben? */
export function parentLoops(ws: Workspace, id: string, parent: string): boolean {
  let cur: string | undefined = parent;
  const seen = new Set<string>();
  while (cur && !seen.has(cur)) {
    if (cur === id) return true;
    seen.add(cur);
    cur = projectById(ws, cur)?.parent;
  }
  return false;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Felder ändern (Steckbrief, Termine, Budget, Priorität, Zustand, Scope, Übergeordnetes Projekt).
 * Leere Werte entfernen das Feld. Ungültiges (Datum, Kreis) wird nicht übernommen.
 */
export function editProject(ws: Workspace, id: string, patch: Partial<Omit<Project, 'id' | 'created' | 'changed'>>, now = Date.now()): Workspace {
  const list = projectsOf(ws);
  const i = list.findIndex((p) => p.id === id);
  if (i < 0) return ws;
  const p: Project = { ...list[i] };
  const set = <K extends keyof Project>(k: K, v: Project[K] | undefined) => {
    if (v === undefined || v === '' || (typeof v === 'number' && !Number.isFinite(v))) delete p[k];
    else p[k] = v;
  };
  for (const k of Object.keys(patch) as (keyof typeof patch)[]) {
    const v = patch[k];
    if (k === 'name') {
      const n = cleanName(String(v ?? ''));
      if (n) p.name = n;
    } else if (k === 'start' || k === 'end') set(k, typeof v === 'string' && DATE.test(v) ? v : undefined);
    else if (k === 'priority') set(k, typeof v === 'number' ? Math.min(5, Math.max(1, Math.round(v))) : undefined);
    else if (k === 'budget' || k === 'points') set(k, typeof v === 'number' && v >= 0 ? v : undefined);
    else if (k === 'taskLimit') set(k, typeof v === 'number' && v >= 1 ? Math.min(99, Math.floor(v)) : undefined);
    else if (k === 'parent') {
      if (typeof v === 'string' && v && (v === id || !projectById(ws, v) || parentLoops(ws, id, v))) continue;
      set(k, (v as string) || undefined);
    } else if (k === 'brief') {
      const b = { ...p.brief, ...(v as Project['brief']) };
      for (const bk of Object.keys(b) as (keyof NonNullable<Project['brief']>)[]) if (!b[bk]?.trim()) delete b[bk];
      set('brief', Object.keys(b).length ? b : undefined);
    } else set(k, v as never);
  }
  p.changed = now;
  const projects = [...list];
  projects[i] = p;
  return withProjects(ws, projects);
}

export interface ProjectUndo {
  project: Project;
  index: number;
  /** Vorgänge, die das Projekt verloren haben. */
  notes: string[];
  /** Unterprojekte, die ihr übergeordnetes Projekt verloren haben. */
  children: string[];
}

/** Projekt löschen: Vorgänge bleiben als Notizen (ohne Projekt), Unterprojekte rücken eine Ebene hoch. */
export function removeProject(ws: Workspace, id: string): { ws: Workspace; undo: ProjectUndo } | null {
  const list = projectsOf(ws);
  const index = list.findIndex((p) => p.id === id);
  if (index < 0) return null;
  const project = list[index];
  const children = list.filter((p) => p.parent === id).map((p) => p.id);
  const projects = list
    .filter((p) => p.id !== id)
    .map((p) => {
      if (p.parent !== id) return p;
      const out = { ...p };
      if (project.parent) out.parent = project.parent;
      else delete out.parent;
      return out;
    });
  const touched = notesOf(ws).filter((n) => n.project === id).map((n) => n.id);
  const notes = notesOf(ws).map((n) => {
    if (n.project !== id) return n;
    const { project: _p, ...rest } = n; // eslint-disable-line @typescript-eslint/no-unused-vars
    return rest;
  });
  return { ws: { ...withProjects(ws, projects), notes }, undo: { project, index, notes: touched, children } };
}

export function undoRemoveProject(ws: Workspace, u: ProjectUndo): Workspace {
  const list = projectsOf(ws)
    .filter((p) => p.id !== u.project.id)
    .map((p) => (u.children.includes(p.id) ? { ...p, parent: u.project.id } : p));
  list.splice(Math.min(u.index, list.length), 0, u.project);
  const back = new Set(u.notes);
  const notes = notesOf(ws).map((n) => (back.has(n.id) ? { ...n, project: u.project.id } : n));
  return { ...withProjects(ws, list), notes };
}

/** Notiz einem Projekt zuordnen (leer = lösen). */
export function setNoteProject(ws: Workspace, noteId: string, project: string | undefined): Workspace {
  if (project && !projectById(ws, project)) return ws;
  const notes = notesOf(ws).map((n) => {
    if (n.id !== noteId) return n;
    if (project) return { ...n, project };
    const { project: _p, ...rest } = n; // eslint-disable-line @typescript-eslint/no-unused-vars
    return rest;
  });
  return { ...ws, notes };
}

/** Zeile der Projektliste (Spalten wie die Projektübersicht in MS Project / iTaskX). */
export interface ProjectRow {
  project: Project;
  /** Gliederungsebene (0 = oberstes Projekt). */
  depth: number;
  /** Vorgänge gesamt / erledigt. */
  tasks: number;
  done: number;
  /** Fortschritt 0–100 nach Plan-Aufwand, ohne Aufwand nach Anzahl. */
  progress: number;
  /** Plan-Aufwand in Stunden. */
  effort: number;
  milestones: number;
  /** Überfällige offene Vorgänge (fällig vor heute). */
  late: number;
  /** Start/Ende: aus dem Steckbrief, sonst aus den Vorgängen (frühestes „nicht vor“ bzw. spätestes „fällig“). */
  start?: string;
  end?: string;
  /** true = Termin aus den Vorgängen gerechnet, nicht im Steckbrief eingetragen. */
  derived: { start: boolean; end: boolean };
}

export function rowOf(ws: Workspace, project: Project, depth = 0, today = dayOf()): ProjectRow {
  const ns = tasksOfProject(ws, project.id);
  const fin = ns.filter((n) => isFinished(n.state));
  const effort = ns.reduce((s, n) => s + (planHours(ws, n) ?? 0), 0);
  const doneEffort = fin.reduce((s, n) => s + (planHours(ws, n) ?? 0), 0);
  const progress = !ns.length ? 0 : effort > 0 ? Math.round((doneEffort / effort) * 100) : Math.round((fin.length / ns.length) * 100);
  const starts = ns.map((n) => n.notBefore).filter((d): d is string => !!d).sort();
  const ends = ns.map((n) => n.due).filter((d): d is string => !!d).sort();
  return {
    project,
    depth,
    tasks: ns.length,
    done: fin.length,
    progress,
    effort,
    milestones: ns.filter((n) => n.milestone).length,
    late: ns.filter((n) => !isFinished(n.state) && n.due && n.due < today).length,
    start: project.start ?? starts[0] ?? ends[0],
    end: project.end ?? ends[ends.length - 1],
    derived: { start: !project.start && !!(starts[0] ?? ends[0]), end: !project.end && !!ends.length },
  };
}

/** Projektliste als Baum (Unterprojekte eingerückt unter ihrem Projekt), Reihenfolge wie angelegt. */
export function projectRows(ws: Workspace, today?: string): ProjectRow[] {
  const list = projectsOf(ws);
  const ids = new Set(list.map((p) => p.id));
  const out: ProjectRow[] = [];
  const seen = new Set<string>();
  const walk = (parent: string | undefined, depth: number) => {
    for (const p of list) {
      const top = !p.parent || !ids.has(p.parent);
      if ((parent === undefined ? !top : p.parent !== parent) || seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(rowOf(ws, p, depth, today));
      walk(p.id, depth + 1);
    }
  };
  walk(undefined, 0);
  // Reste (z. B. Kreis aus alten Daten) flach anhängen
  for (const p of list) if (!seen.has(p.id)) out.push(rowOf(ws, p, 0, today));
  return out;
}

/** Fehlt etwas im Steckbrief? (ICB4: Ziel, Vorgehen, Organisation, Termine) – für den Hinweis „unvollständig“. */
export function briefGaps(p: Project): ('goal' | 'approach' | 'org' | 'start' | 'end')[] {
  const g: ('goal' | 'approach' | 'org' | 'start' | 'end')[] = [];
  if (!p.brief?.goal) g.push('goal');
  if (!p.brief?.approach) g.push('approach');
  if (!p.brief?.org) g.push('org');
  if (!p.start) g.push('start');
  if (!p.end) g.push('end');
  return g;
}

/** Ende vor Start? */
export const datesClash = (p: Pick<Project, 'start' | 'end'>): boolean => !!p.start && !!p.end && p.end < p.start;

// ---------- F-225 (V105): Instanzen und Formular für Projektmeldungen ----------

/** P3: Vorgabe-Instanzen nach IPMA ICB4 (Governance): Projektleitung, Lenkungskreis, Auftraggeber. */
export const DEFAULT_ROLES: readonly ProjectRole[] = [
  { id: 'lead', name: 'Projektleitung' },
  { id: 'steering', name: 'Lenkungskreis' },
  { id: 'client', name: 'Auftraggeber' },
];
export const ROLES_MAX = 12;
export const rolesOf = (p: Project | undefined): ProjectRole[] => (p?.roles ?? DEFAULT_ROLES).map((r) => ({ ...r }));
export const roleOf = (p: Project | undefined, id: string | undefined): ProjectRole | undefined => (id ? rolesOf(p).find((r) => r.id === id) : undefined);

/** P3: Instanzen ändern – Name (leer = bleibt), Person zuordnen, hinzufügen, entfernen. */
export function editRoles(ws: Workspace, id: string, op: { kind: 'name'; role: string; name: string } | { kind: 'person'; role: string; person?: string } | { kind: 'add'; name: string; rid: string } | { kind: 'remove'; role: string } | { kind: 'akv'; role: string; key: 'tasks' | 'powers' | 'duty'; text?: string }): Workspace {
  const p = projectById(ws, id);
  if (!p) return ws;
  let roles = rolesOf(p);
  if (op.kind === 'add') {
    const name = op.name.replace(/\s+/g, ' ').trim().slice(0, 60);
    if (!name || roles.length >= ROLES_MAX || roles.some((r) => r.id === op.rid)) return ws;
    roles = [...roles, { id: op.rid, name }];
  } else if (op.kind === 'remove') {
    if (roles.length <= 1) return ws;
    roles = roles.filter((r) => r.id !== op.role);
  } else if (op.kind === 'name') {
    const name = op.name.replace(/\s+/g, ' ').trim().slice(0, 60);
    if (!name) return ws;
    roles = roles.map((r) => (r.id === op.role ? { ...r, name } : r));
  } else if (op.kind === 'akv') {
    // F-226 Stufe 2 (V113, L10): Aufgaben, Kompetenzen, Verantwortung an der Instanz
    const t = (op.text ?? '').replace(/\r\n?/g, '\n').trim().slice(0, 2000);
    roles = roles.map((r) => {
      if (r.id !== op.role) return r;
      const next = { ...r };
      if (t) next[op.key] = t;
      else delete next[op.key];
      return next;
    });
  } else {
    roles = roles.map((r) => {
      if (r.id !== op.role) return r;
      const { person: _old, ...rest } = r; // eslint-disable-line @typescript-eslint/no-unused-vars
      return op.person ? { ...rest, person: op.person } : rest;
    });
  }
  return editProject(ws, id, { roles });
}

/** P2: Projekte, an die man melden kann (laufend, geplant, Idee, pausiert – nicht erledigt/abgebrochen). */
export const reportableProjects = (ws: Workspace): Project[] => projectsOf(ws).filter((p) => p.state !== 'done' && p.state !== 'stopped');
