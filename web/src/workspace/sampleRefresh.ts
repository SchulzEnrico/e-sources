/**
 * V159 (Enrico: „Teamrollen fehlen in meinem ColorGentlemen – Formulare › 15.1 zeigt ‚Noch keine Teamrollen‘, auch das
 * Logo fehlt“): Ein Beispiel, das mit einer älteren Version angelegt wurde, bekommt Daten, die später ins Beispiel
 * kamen (Belbin-Teamrollen V137, Logo V158 …), nicht von selbst. „Beispiel auffrischen“ ergänzt nur Fehlendes und
 * lässt Enricos Änderungen stehen – mit Rückgängig.
 *
 * Regeln (was „fehlt“ heißt):
 * - Projekt: ein Feld ist leer (nicht da, leerer Text, leere Liste) → aus dem frischen Beispiel; Unterfelder
 *   (z. B. Steckbrief › Logo) ebenso. Eine Liste mit Einträgen bleibt, wie sie ist – Einträge fehlen nur, wenn die
 *   ganze Liste fehlt (gelöschte Einträge kommen nicht wieder). In Einträgen mit Id wird ein Feld nur ergänzt, wenn
 *   es **kein** Eintrag der Liste hat (dann gab es das Feld bei der Anlage noch nicht; fehlt es nur bei einzelnen,
 *   hat Enrico es dort entfernt).
 * - Vorgänge: dieselbe Regel über alle Vorgänge des Beispiels (z. B. Phase, AP-Beschreibung, wichtig/dringend).
 *   Fehlende Vorgänge kommen nur, wenn ihre ganze Art fehlt (z. B. keine Risiken/Änderungen) – einzeln gelöschte nicht.
 * - Personen des Beispiels: fehlende kommen wieder, Felder nach derselben Regel.
 */
import type { Note, Person, Project, Workspace } from './types';
import { notesOf } from './notes';
import { defaultWorkspace } from './workspace';
import { sampleOf, type SampleKey } from './samples';
import * as Sp from './sampleProject';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const empty = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

/** Felder, die nie ergänzt werden (Verwaltung, Verlauf, Enricos Arbeitsstand). */
const SKIP_PROJECT = new Set(['id', 'name', 'created', 'changed', 'state', 'eisenInit']);
const SKIP_NOTE = new Set(['id', 'title', 'text', 'state', 'trail', 'project', 'watch', 'origin', 'votes', 'forwarded', 'delegated', 'template', 'manual', 'created', 'changed', 'updated', 'order', 'done', 'by']);
const SKIP_PERSON = new Set(['id', 'name', 'me', 'kind', 'color', 'account']);

/** Alle Pfade mit Inhalt (Listen von Einträgen als „x[].y“). */
function paths(o: unknown, pre: string, out: Set<string>): Set<string> {
  if (!isObj(o)) return out;
  for (const [k, v] of Object.entries(o)) {
    if (empty(v)) continue;
    const p = pre + k;
    out.add(p);
    if (isObj(v)) paths(v, `${p}.`, out);
    else if (Array.isArray(v)) for (const it of v) paths(it, `${p}[].`, out);
  }
  return out;
}

/**
 * Füllt `own` aus `fresh`. `known`: Pfade, die bei Geschwistern vorkommen (dann nicht ergänzen); `got` sammelt die
 * ergänzten Pfade. Gibt `own` unverändert zurück (gleiches Objekt), wenn nichts fehlt.
 */
function fill(own: Obj, fresh: Obj, known: Set<string> | null, pre: string, skip: Set<string>, got: string[]): Obj {
  let out = own;
  for (const [k, fv] of Object.entries(fresh)) {
    if (!pre && skip.has(k)) continue;
    if (empty(fv)) continue;
    const p = pre + k;
    const ov = own[k];
    if (empty(ov)) {
      if (known?.has(p)) continue;
      out = { ...out, [k]: fv };
      got.push(p);
    } else if (isObj(ov) && isObj(fv)) {
      const r = fill(ov, fv, known, `${p}.`, skip, got);
      if (r !== ov) out = { ...out, [k]: r };
    } else if (Array.isArray(ov) && Array.isArray(fv)) {
      const sib = new Set(known ?? []);
      for (const it of ov) paths(it, `${p}[].`, sib);
      let changed = false;
      const arr = ov.map((it) => {
        if (!isObj(it) || typeof it.id !== 'string') return it;
        const f = fv.find((x) => isObj(x) && x.id === it.id);
        if (!isObj(f)) return it;
        const r = fill(it, f, sib, `${p}[].`, skip, got);
        if (r !== it) changed = true;
        return r;
      });
      if (changed) out = { ...out, [k]: arr };
    }
  }
  return out;
}

export interface SampleRefreshUndo {
  pid: string;
  project: Project;
  notes: Note[];
  addedNotes: string[];
  persons: Person[];
  addedPersons: string[];
}
export interface SampleRefresh {
  ws: Workspace;
  /** ergänzte Teile, lesbar (z. B. „Teamrollen“, „Logo“, „3 Vorgänge“) – leer: nichts gefehlt */
  added: string[];
  undo: SampleRefreshUndo | null;
}

/** Lesbare Namen für Projekt-Felder (Formulare/Steckbrief). */
const LABEL: Record<string, string> = {
  'charter.logo': 'Logo', teamRoles: 'Teamrollen (Belbin)', messages: 'Nachrichtenquadrat', moderations: 'Moderationen', actions: 'Maßnahmenplan',
  annexes: 'Anlagen', wpReports: 'AP-Statusbericht', lessons: 'Lessons Learned', phases: 'Phasen', roles: 'Organigramm', comms: 'Kommunikation',
  stakeholders: 'Stakeholder', goals: 'Ziele', conflicts: 'Zielkonflikte', charter: 'Steckbrief', brief: 'Steckbrief-Texte', psp: 'PSP-Einstellungen',
  start: 'Starttermin', end: 'Endtermin', budget: 'Budget', priority: 'Priorität',
};
const labelOf = (p: string): string => LABEL[p] ?? LABEL[p.split(/[.[]/)[0]] ?? 'weitere Steckbrief-Angaben';
const groupOf = (n: Note) => n.type ?? 'task';

/** Beispiel `key` auffrischen: nur Fehlendes ergänzen (Regeln oben). Ohne Beispiel: unverändert, `undo` null. */
export function refreshSample(ws: Workspace, key?: SampleKey, now = Date.now()): SampleRefresh {
  const d = sampleOf(key);
  const own = (ws.projects ?? []).find((p) => p.id === d.id);
  if (!own) return { ws, added: [], undo: null };
  const notePre = Sp.NOTE_PREFIX;
  const personPre = Sp.PERSON_PREFIX;
  const fresh = d.add(defaultWorkspace(), now);
  const fp = (fresh.projects ?? []).find((p) => p.id === d.id);
  if (!fp) return { ws, added: [], undo: null };
  const added: string[] = [];
  const add = (s: string) => !added.includes(s) && added.push(s);

  // Projekt
  const pGot: string[] = [];
  const project = fill(own as unknown as Obj, fp as unknown as Obj, null, '', SKIP_PROJECT, pGot) as unknown as Project;
  for (const p of pGot) add(labelOf(p));

  // Vorgänge
  const mine = (n: Note) => n.id.startsWith(notePre) && n.project === d.id;
  const ownNotes = notesOf(ws).filter(mine);
  const freshNotes = notesOf(fresh).filter(mine);
  const known = new Set<string>();
  for (const n of ownNotes) paths(n, '', known);
  const groups = new Set(ownNotes.map(groupOf));
  const changedNotes: Note[] = [];
  const replaced = new Map<string, Note>();
  for (const fnote of freshNotes) {
    const o = ownNotes.find((n) => n.id === fnote.id);
    if (!o) continue;
    const got: string[] = [];
    const r = fill(o as unknown as Obj, fnote as unknown as Obj, known, '', SKIP_NOTE, got) as unknown as Note;
    if (r !== o) (changedNotes.push(o), replaced.set(o.id, r));
  }
  const ids = new Set(notesOf(ws).map((n) => n.id));
  const newNotes = freshNotes.filter((n) => !ids.has(n.id) && !groups.has(groupOf(n)));
  if (replaced.size) add(`Angaben an ${replaced.size} ${replaced.size === 1 ? 'Vorgang' : 'Vorgängen'}`);
  if (newNotes.length) add(`${newNotes.length} ${newNotes.length === 1 ? 'Vorgang' : 'Vorgänge'} (${[...new Set(newNotes.map(groupOf))].map((g) => (g === 'risk' ? 'Risiken/Chancen' : g === 'change' ? 'Änderungen' : 'Arbeitspakete')).join(', ')})`);

  // Personen des Beispiels
  const ownPersons = (ws.persons ?? []).filter((p) => p.id.startsWith(personPre));
  const freshPersons = (fresh.persons ?? []).filter((p) => p.id.startsWith(personPre));
  const pKnown = new Set<string>();
  for (const p of ownPersons) paths(p, '', pKnown);
  const changedPersons: Person[] = [];
  const pReplaced = new Map<string, Person>();
  for (const fpers of freshPersons) {
    const o = ownPersons.find((p) => p.id === fpers.id);
    if (!o) continue;
    const r = fill(o as unknown as Obj, fpers as unknown as Obj, pKnown, '', SKIP_PERSON, []) as unknown as Person;
    if (r !== o) (changedPersons.push(o), pReplaced.set(o.id, r));
  }
  const pIds = new Set((ws.persons ?? []).map((p) => p.id));
  const newPersons = freshPersons.filter((p) => !pIds.has(p.id));
  if (pReplaced.size || newPersons.length) add('Angaben zu Personen');

  if (!added.length) return { ws, added: [], undo: null };
  const next: Workspace = {
    ...ws,
    projects: (ws.projects ?? []).map((p) => (p.id === d.id ? (project === own ? p : { ...project, changed: now }) : p)),
    notes: [...notesOf(ws).map((n) => replaced.get(n.id) ?? n), ...newNotes],
    persons: [...(ws.persons ?? []).map((p) => pReplaced.get(p.id) ?? p), ...newPersons],
  };
  return {
    ws: next,
    added,
    undo: { pid: d.id, project: own, notes: changedNotes, addedNotes: newNotes.map((n) => n.id), persons: changedPersons, addedPersons: newPersons.map((p) => p.id) },
  };
}

/** Rückgängig: Projekt, geänderte Vorgänge und Personen wie vorher, ergänzte wieder weg. */
export function undoRefreshSample(ws: Workspace, u: SampleRefreshUndo): Workspace {
  const oldNotes = new Map(u.notes.map((n) => [n.id, n]));
  const oldPersons = new Map(u.persons.map((p) => [p.id, p]));
  const dropN = new Set(u.addedNotes);
  const dropP = new Set(u.addedPersons);
  return {
    ...ws,
    projects: (ws.projects ?? []).map((p) => (p.id === u.pid ? u.project : p)),
    notes: notesOf(ws).filter((n) => !dropN.has(n.id)).map((n) => oldNotes.get(n.id) ?? n),
    persons: (ws.persons ?? []).filter((p) => !dropP.has(p.id)).map((p) => oldPersons.get(p.id) ?? p),
  };
}
