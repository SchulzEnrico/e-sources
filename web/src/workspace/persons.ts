/**
 * F-206 Schritt 8 (V94): Personen – Ressourcentabelle mit Ressourcenkalender (IPMA ICB4, Vorbild
 * MS Project/iTaskX), Zuständig an der Notiz, Delegieren, „Nur meine“, Vertretung, Task-Limits und
 * Befugnisse. Entscheidungs-Doc „F-206 V94 – Personen und Projektfokus (Schritt 8)“, P1–P23.
 *
 * „ich“ (P3) hat die feste Id `ME_ID`, damit alle Geräte dieselbe Person meinen; Name und Kennfarbe
 * kommen aus dem Profil. Ohne gespeicherte Person „ich“ gilt eine gedachte (`meOf`).
 */
import type { Note, Person, PersonRight, Workspace } from './types';
import { notesOf, noteById, isFinished, updateNote, type Act } from './notes';
import { personIdFor } from './noteObjects';
import { cleanName, profileOf } from './profile';

export const ME_ID = 'pn-ich';
/** P9: Kapazität ab Werk (Stunden je Woche, Mo–Fr). */
export const CAPACITY_DEFAULT = 40;
export const PERSONS_MAX = 200;
export const ALL_RIGHTS: readonly PersonRight[] = ['release', 'spend', 'decide', 'accept'];

export const personsOf = (ws: Workspace): Person[] => ws.persons ?? [];
export const personById = (ws: Workspace, id: string | undefined): Person | undefined =>
  id === undefined ? undefined : id === ME_ID ? meOf(ws) : personsOf(ws).find((p) => p.id === id);

/** P3: „ich“ – gespeichert oder gedacht; Name und Farbe aus dem Profil (ohne Namen „Ich“). */
export function meOf(ws: Workspace): Person {
  const prof = profileOf(ws);
  const saved = personsOf(ws).find((p) => p.me);
  return { ...(saved ?? { id: ME_ID, kind: 'person' as const, me: true }), name: prof.name || 'Ich', color: prof.color };
}
export const meId = (ws: Workspace): string => personsOf(ws).find((p) => p.me)?.id ?? ME_ID;

/** Personen für Auswahl und Tabelle: „ich“ zuerst, dann nach Name. */
export function personList(ws: Workspace): Person[] {
  const me = meOf(ws);
  return [me, ...personsOf(ws).filter((p) => !p.me).sort((a, b) => a.name.localeCompare(b.name, 'de'))];
}

function withPersons(ws: Workspace, persons: Person[]): Workspace {
  if (persons.length) return { ...ws, persons };
  const { persons: _p, ...rest } = ws; // eslint-disable-line @typescript-eslint/no-unused-vars
  return rest;
}

/** „ich“ speichern, sobald etwas an ihm hängt (Zuständig, Kapazität …). */
export function ensureMe(ws: Workspace): Workspace {
  if (personsOf(ws).some((p) => p.me)) return ws;
  return withPersons(ws, [{ id: ME_ID, name: profileOf(ws).name || 'Ich', kind: 'person', me: true }, ...personsOf(ws)]);
}

const fold = (s: string) => cleanName(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function dist(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

/** P1: ähnliche Namen gegen Doppelte („Ana“ ↔ „Anna“, „Mueller“ ↔ „Müller“ nicht, aber Tippfehler bis 2 Zeichen). */
export function similar(ws: Workspace, name: string): Person[] {
  const q = fold(name);
  if (!q) return [];
  return personList(ws).filter((p) => {
    const n = fold(p.name);
    return n === q || (q.length >= 3 && (n.startsWith(q) || dist(n, q) <= (q.length > 5 ? 2 : 1)));
  });
}

/** Person suchen (Auswahl „Zuständig …“): Treffer am Wortanfang zuerst. */
export function findPersons(ws: Workspace, q: string): Person[] {
  const f = fold(q);
  const all = personList(ws);
  if (!f) return all;
  const hit = (p: Person) => fold(p.name).split(' ').some((w) => w.startsWith(f));
  return [...all.filter(hit), ...all.filter((p) => !hit(p) && fold(p.name).includes(f))];
}

/** Neue Person (P1 „+ ‚Name‘ anlegen“). Gleicher Name = vorhandene Person. */
export function addPerson(ws: Workspace, name: string, kind: Person['kind'] = 'person', extra: Partial<Person> = {}): { ws: Workspace; id: string } | null {
  const clean = cleanName(name);
  if (!clean) return null;
  const same = personList(ws).find((p) => fold(p.name) === fold(clean));
  if (same) return { ws: same.me ? ensureMe(ws) : ws, id: same.id };
  if (personsOf(ws).length >= PERSONS_MAX) return null;
  const ids = new Set(personsOf(ws).map((p) => p.id));
  let id = personIdFor(clean);
  while (ids.has(id) || id === ME_ID) id = `${id}x`;
  return { ws: withPersons(ws, [...personsOf(ws), { ...extra, id, name: clean, kind }]), id };
}

/** Felder einer Person ändern (Name, Art, Kapazität, Limits, Befugnisse, Abwesenheit, Vertretung, Farbe, Mitglieder). */
export function editPerson(ws: Workspace, id: string, patch: Partial<Omit<Person, 'id' | 'me'>>): Workspace {
  let base = ws;
  if (id === ME_ID && !personsOf(ws).some((p) => p.id === id)) base = ensureMe(ws);
  if (!personsOf(base).some((p) => p.id === id)) return ws;
  return withPersons(
    base,
    personsOf(base).map((p) => {
      if (p.id !== id) return p;
      const out: Person = { ...p };
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || (Array.isArray(v) && !v.length)) delete (out as unknown as Record<string, unknown>)[k];
        else (out as unknown as Record<string, unknown>)[k] = k === 'name' ? cleanName(v as string) || p.name : v;
      }
      return out;
    }),
  );
}

export type PersonUndo = { person: Person; index: number; notes: { id: string; assignee?: string; delegated?: Note['delegated'] }[]; refs: Person[] };

/** P19: Person löschen – ihre Aufgaben werden „ohne Zuständig“; Mitgliedschaften und Vertretungen fallen weg. „ich“ nicht. */
export function removePerson(ws: Workspace, id: string): { ws: Workspace; undo: PersonUndo } | null {
  const list = personsOf(ws);
  const index = list.findIndex((p) => p.id === id);
  if (index < 0 || list[index].me) return null;
  const touched = notesOf(ws).filter((n) => n.assignee === id || n.delegated?.person === id);
  const refs = list.filter((p) => p.members?.includes(id) || p.stand?.some((s) => s.by === id));
  const persons = list
    .filter((p) => p.id !== id)
    .map((p) => {
      if (!refs.includes(p)) return p;
      const out: Person = { ...p };
      if (out.members) out.members = out.members.filter((m) => m !== id);
      if (out.stand) out.stand = out.stand.filter((s) => s.by !== id);
      if (!out.members?.length) delete out.members;
      if (!out.stand?.length) delete out.stand;
      return out;
    });
  const notes = notesOf(ws).map((n) => {
    if (!touched.includes(n)) return n;
    const out: Note = { ...n };
    if (out.assignee === id) delete out.assignee;
    if (out.delegated?.person === id) {
      const { person: _p, ...rest } = out.delegated; // eslint-disable-line @typescript-eslint/no-unused-vars
      out.delegated = rest;
    }
    return out;
  });
  return {
    ws: { ...withPersons(ws, persons), notes },
    undo: { person: list[index], index, notes: touched.map((n) => ({ id: n.id, assignee: n.assignee, delegated: n.delegated })), refs },
  };
}

export function undoRemovePerson(ws: Workspace, u: PersonUndo): Workspace {
  const list = personsOf(ws).filter((p) => p.id !== u.person.id).map((p) => u.refs.find((r) => r.id === p.id) ?? p);
  list.splice(Math.min(u.index, list.length), 0, u.person);
  const back = new Map(u.notes.map((x) => [x.id, x]));
  const notes = notesOf(ws).map((n) => {
    const b = back.get(n.id);
    if (!b) return n;
    const out: Note = { ...n };
    if (b.assignee) out.assignee = b.assignee;
    if (b.delegated) out.delegated = b.delegated;
    return out;
  });
  return { ...withPersons(ws, list), notes };
}

/** Anzahl offener Aufgaben einer Person (P19 Rückfrage, P17 Limit, Tabelle). */
export function openCount(ws: Workspace, id: string): number {
  return notesOf(ws).filter((n) => !isFinished(n.state) && assigneeOf(n) === id).length;
}

/** Wer ist zuständig? Zuständig, sonst die Person, an die delegiert wurde. */
export const assigneeOf = (n: Note): string | undefined => n.assignee ?? n.delegated?.person;

/** P16: Für wen vertritt `who` heute (Vertretung mit Zeitraum, ohne Zeitraum = immer)? */
export function standingFor(ws: Workspace, who: string, day: string): string[] {
  return personsOf(ws)
    .filter((p) => p.id !== who && p.stand?.some((s) => s.by === who && (!s.from || s.from <= day) && (!s.to || s.to >= day)))
    .map((p) => p.id);
}

/** P7/P15/P16: Gehört die Aufgabe mir (zuständig oder in Vertretung)? `via` nennt die vertretene Person. */
export function mineOf(ws: Workspace, n: Note, day: string): { mine: boolean; via?: string } {
  const me = meId(ws);
  const a = assigneeOf(n);
  if (!a) return { mine: false };
  if (a === me) return { mine: true };
  return standingFor(ws, me, day).includes(a) ? { mine: true, via: a } : { mine: false };
}

/** P5: Zuständig setzen (undefined = ohne). Eine Person, an die nicht delegiert ist, löst „delegiert“. */
export function assign(ws: Workspace, noteId: string, personId: string | undefined, act: Act = {}): Workspace {
  const n = noteById(ws, noteId);
  if (!n) return ws;
  let out = personId === meId(ws) ? ensureMe(ws) : ws;
  const patch: Parameters<typeof updateNote>[2] = { assignee: personId };
  if (n.delegated && n.delegated.person !== personId) patch.delegated = undefined;
  out = updateNote(out, noteId, patch, act);
  return out;
}

/** P4: Delegieren an … = Zuständig auf die andere Person + Merker „delegiert von mir“ (Spur). */
export function delegate(ws: Workspace, noteId: string, personId: string, act: Act = {}): Workspace {
  const p = personById(ws, personId);
  if (!p) return ws;
  if (p.me) return assign(ws, noteId, personId, act);
  return updateNote(ws, noteId, { assignee: personId, delegated: { to: p.name, person: personId } }, act);
}

/** P17: Task-Limit – `over` = mit dieser Aufgabe darüber. */
export function limitOf(ws: Workspace, id: string): { count: number; limit?: number; over: boolean } {
  const count = openCount(ws, id);
  const limit = personById(ws, id)?.limit?.total;
  return { count, limit, over: limit !== undefined && count + 1 > limit };
}

/** P18: Befugnis – „ich“ ohne gesetzte Befugnisse hat alle. */
export function hasRight(p: Person | undefined, right: PersonRight): boolean {
  if (!p) return false;
  if (!p.rights) return !!p.me;
  return p.rights.includes(right);
}

/** P9/P21: Kapazität eines Tages (Stunden) – Sa/So und Abwesenheit 0. Teams: Summe der Mitglieder. */
export function capacityOn(ws: Workspace, p: Person, day: string, seen: Set<string> = new Set()): number {
  if (p.kind === 'team' && p.members?.length) {
    if (seen.has(p.id)) return 0;
    seen.add(p.id);
    return p.members.reduce((s, m) => {
      const x = personById(ws, m);
      return s + (x ? capacityOn(ws, x, day, seen) : 0);
    }, 0);
  }
  const wd = new Date(`${day}T12:00:00Z`).getUTCDay();
  if (wd === 0 || wd === 6) return 0;
  if (p.away?.some((a) => a.from <= day && a.to >= day)) return 0;
  return (p.capacity ?? CAPACITY_DEFAULT) / 5;
}

/** P9/P21: abwesend an diesem Tag? */
export const awayOn = (p: Person, day: string): boolean => !!p.away?.some((a) => a.from <= day && a.to >= day);

/**
 * P6: Neue Notizen (in `next`, nicht in `prev`) ohne Zuständig bekommen „ich“ – abwählbar am Ort.
 * Eine Unter-Notiz oder umgewandelter Checklisten-Punkt übernimmt die Zuständigkeit der Eltern-Notiz.
 */
export function defaultAssignee(prev: Workspace, next: Workspace): Workspace {
  const before = new Set(notesOf(prev).map((n) => n.id));
  const fresh = notesOf(next).filter((n) => !before.has(n.id) && !n.assignee && !n.delegated);
  if (!fresh.length) return next;
  const me = meId(next);
  const ids = new Set(fresh.map((n) => n.id));
  const out = { ...next, notes: notesOf(next).map((n) => (ids.has(n.id) ? { ...n, assignee: (n.parent && noteById(next, n.parent)?.assignee) || me } : n)) };
  return ensureMe(out);
}
