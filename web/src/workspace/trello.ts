/**
 * F-230 (V119, Option C, Bauplan 5, F3): Austausch mit Trello über die JSON-Datei eines Boards
 * (Trello › Board-Menü › „Drucken, Exportieren und Teilen“ › „Als JSON exportieren“). Ein Projekt (Projekt-Desk, PD10) ↔ ein Board.
 *
 * Import (F4): neues Projekt mit Kanban-Sheet des Boards – Listen → Spalten (Zustand aus dem Namen), Karten → Vorgänge
 * (Name, Beschreibung, Fälligkeit → „fällig am“, Start → „nicht beginnen vor“, erledigt, archiviert), Checklisten → Checkliste
 * im Text (je Liste „### ☑ Name“, darunter „- [ ] Punkt“), Labels → Tags, Mitglieder → Personen (F5 wie MSPDI), Kommentare,
 * Anhänge und alles Übrige bleibt als Fremddaten (`foreign.trello`) an Karte, Person und Projekt.
 * Export: dasselbe zurück als Trello-JSON; Ids, Reihenfolge (pos) und unbekannte Felder aus dem Import gehen unverändert zurück.
 * Was Trello nicht kennt (Vorgänger, Dauer, Aufwand, Gliederung, Basisplan …), steht im eigenen Abschnitt `eSources` – ein
 * Import dieser Datei stellt es wieder her; Felder, die eine andere Anwendung inzwischen geändert hat, gehen dabei vor.
 * Trello selbst liest keine JSON-Datei ein; das Hochladen über die Trello-Schnittstelle kommt später (F3).
 * Reine Funktionen; Tests in trello.test.ts.
 */
import type { ForeignBag, Note, NoteColumn, NoteLink, NoteState, Person, Project, Workspace } from './types';
import { ganttOf } from './gantt';
import { itemMeta, itemText } from './checklists';
import { ARCHIVED_COL_MAX, COLUMN_MAX, trimTrail, createNote, createView, notesOf, titleOf, TITLE_MAX, viewsOf } from './notes';
import { addPerson, personById } from './persons';
import { addProject, projectById, projectsOf } from './projects';
import { colStateOf } from './sheets';
import { calendarFor, withCalendar } from './calendar';
import { FOREIGN_TEXT_MAX } from './foreign';
import { colorOf, isTagColor, setTagColor } from './tags';
import { coverFromTrello, coverSig, coverToTrello } from './covers';
import { fieldsFromTrello, fieldsToTrello, itemsToTrello, valuesFromTrello } from './cardFields';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const arr = (v: unknown): Obj[] => (Array.isArray(v) ? v.filter(isObj) : []);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);
const fold = (s: string) => s.trim().toLocaleLowerCase('de');
const dayOf = (s: unknown): string | undefined => (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : undefined);
const p2 = (n: number) => String(n).padStart(2, '0');
/** V121 (F-231 K5): Zeitpunkt aus Trello (UTC) als Tag und Uhrzeit hier. */
function localAt(s: unknown): { day: string; time: string } | undefined {
  if (typeof s !== 'string') return undefined;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return undefined;
  return { day: `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`, time: `${p2(d.getHours())}:${p2(d.getMinutes())}` };
}
const sizeOf = (v: unknown): number => {
  try {
    return JSON.stringify(v).length;
  } catch {
    return Infinity;
  }
};
const omit = (o: Obj, keys: readonly string[]): Obj => {
  const out: Obj = {};
  for (const [k, v] of Object.entries(o)) if (!keys.includes(k)) out[k] = v;
  return out;
};

/** Trello-Farben → deutscher Tag-Name für Labels ohne Namen */
export const LABEL_COLOR_DE: Record<string, string> = {
  green: 'grün',
  yellow: 'gelb',
  orange: 'orange',
  red: 'rot',
  purple: 'lila',
  blue: 'blau',
  sky: 'himmelblau',
  lime: 'hellgrün',
  pink: 'pink',
  black: 'schwarz',
};
const tagOfLabel = (l: Obj): string => str(l.name).trim() || (str(l.color) ? (LABEL_COLOR_DE[str(l.color).replace(/_(light|dark)$/, '')] ?? str(l.color)) : '');
/** Label „Meilenstein“ (Zuordnung im Doc: Meilenstein als Label) */
export const MILESTONE_LABEL = 'Meilenstein';

// ---------- Checklisten im Text ----------

export interface Checklist {
  name: string;
  items: { name: string; done: boolean }[];
}
const CL_HEAD = /^#{1,6}\s+☑\s*(.*)$/;
const TASK = /^\s*[-*+]\s+\[( |x|X)\]\s?(.*)$/;
/** Vorgabe-Name einer Checkliste ohne Überschrift */
export const CHECKLIST_DEFAULT = 'Checkliste';

/** Text einer Karte: Beschreibung, dann je Checkliste „### ☑ Name“ mit „- [ ] Punkt“. */
export function joinText(desc: string, lists: Checklist[]): string {
  const parts = lists.map((c) => [`### ☑ ${c.name}`, ...c.items.map((i) => `- [${i.done ? 'x' : ' '}] ${i.name}`)].join('\n'));
  return [desc.trimEnd(), ...parts].filter((s) => s.length > 0).join('\n\n');
}

/**
 * Umkehrung zu joinText: Abschnitte „☑ Name“ mit ihren Aufgaben-Zeilen werden Checklisten; Aufgaben-Zeilen ohne
 * Überschrift sammelt „Checkliste“. `title`: führende Überschrift mit dem Titel (Karten aus dem Kanban) fällt weg.
 */
export function splitText(text: string, title?: string): { desc: string; lists: Checklist[] } {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  if (title !== undefined) {
    const first = lines.findIndex((l) => l.trim().length > 0);
    if (first >= 0) {
      const m = /^#{1,6}\s+(.*)$/.exec(lines[first]);
      if (m && !CL_HEAD.test(lines[first]) && m[1].replace(/\\(.)/g, '$1').trim() === title.trim()) lines.splice(0, first + 1);
    }
  }
  const lists: Checklist[] = [];
  const keep: string[] = [];
  let cur: Checklist | null = null;
  let loose: Checklist | null = null;
  for (const l of lines) {
    const h = CL_HEAD.exec(l);
    if (h) {
      cur = { name: h[1].trim() || CHECKLIST_DEFAULT, items: [] };
      lists.push(cur);
      continue;
    }
    const t = TASK.exec(l);
    if (t) {
      const item = { name: t[2].trim(), done: t[1] !== ' ' };
      if (cur) cur.items.push(item);
      else {
        if (!loose) {
          loose = { name: CHECKLIST_DEFAULT, items: [] };
          lists.push(loose);
        }
        loose.items.push(item);
      }
      continue;
    }
    if (cur && l.trim() === '') continue;
    cur = null;
    keep.push(l);
  }
  return { desc: keep.join('\n').replace(/\n{3,}/g, '\n\n').trim(), lists };
}

// ---------- Import ----------

export interface TrelloImport {
  ok: true;
  ws: Workspace;
  project: string;
  /** Kanban-Sheet des Boards */
  view: string;
  cards: number;
  lists: number;
  checklists: number;
  persons: number;
  merged: string[];
  /** mitgeführte Angaben (Kommentare, Anhänge, unbekannte Felder) */
  kept: number;
  /** Hinweise, z. B. `listsOver:3` (mehr Listen als Spalten), `actionsDropped:120` */
  notes: string[];
}
export type TrelloResult = TrelloImport | { ok: false; error: 'json' | 'notTrello' | 'empty' | 'full'; detail?: string };

/** Ist der Text ein Trello-Board (JSON mit Listen und Karten)? */
export function isTrello(text: string): boolean {
  const s = text.trimStart();
  if (!s.startsWith('{')) return false;
  try {
    const b = JSON.parse(s);
    return isObj(b) && Array.isArray(b.lists) && Array.isArray(b.cards);
  } catch {
    return false;
  }
}

const memberName = (m: Obj): string => str(m.fullName).trim() || str(m.username).trim();
const parseBoard = (text: string): Obj | null => {
  try {
    const b = JSON.parse(text);
    return isObj(b) ? b : null;
  } catch {
    return null;
  }
};

/** Mitglieder des Boards, die es dem Namen nach schon gibt (F5). */
export function trelloNameClashes(ws: Workspace, text: string): string[] {
  const b = parseBoard(text);
  if (!b) return [];
  const have = new Set((ws.persons ?? []).map((p) => fold(p.name)));
  return [...new Set(arr(b.members).map(memberName).filter((n) => n && have.has(fold(n))))];
}

/** Felder einer Karte, die E-Sources selbst liest bzw. beim Export neu schreibt */
const OWN_CARD = ['name', 'desc', 'closed', 'idBoard', 'idLabels', 'labels', 'idMembers', 'due', 'start', 'dueComplete', 'idChecklists', 'checklists', 'cover', 'eSources'] as const;
/** Felder des Boards, die E-Sources selbst liest bzw. beim Export neu schreibt (lists, labels, members bleiben roh) */
const OWN_BOARD = ['name', 'cards', 'checklists', 'actions', 'eSources'] as const;

/** Abschnitt `eSources` in einer exportierten Karte: die Notiz und was wir an Trello-Feldern geschrieben haben */
interface CardOwn {
  v: 1;
  id: string;
  note: Partial<Note>;
  sent: { name: string; desc: string; due: string | null; start: string | null; list: string; closed: boolean; done: boolean; labels: string[]; members: string[]; cover?: string };
}

/**
 * Trello-JSON als neues Projekt mit Kanban-Sheet (F4). `merge`: Mitglieder, die mit vorhandenen Personen
 * zusammengeführt werden (F5); `name`: Dateiname für die Herkunft.
 */
export function importTrello(ws: Workspace, text: string, o: { merge?: string[]; name?: string; now?: number } = {}): TrelloResult {
  let b: Obj;
  try {
    const v = JSON.parse(text);
    if (!isObj(v)) return { ok: false, error: 'notTrello' };
    b = v;
  } catch (e) {
    return { ok: false, error: 'json', detail: (e as Error).message };
  }
  if (!Array.isArray(b.lists) || !Array.isArray(b.cards)) return { ok: false, error: 'notTrello' };
  const now = o.now ?? Date.now();
  const at = new Date(now).toISOString();
  const notes: string[] = [];
  let kept = 0;
  const own = isObj(b.eSources) ? (b.eSources as Obj) : undefined;

  const lists = arr(b.lists).sort((a, c) => num(a.pos) - num(c.pos));
  const cardsAll = arr(b.cards);
  if (!cardsAll.length && !lists.length) return { ok: false, error: 'empty' };
  const listIdx = new Map(lists.map((l, i) => [str(l.id), i]));
  const cards = cardsAll.slice().sort((a, c) => (listIdx.get(str(a.idList)) ?? 999) - (listIdx.get(str(c.idList)) ?? 999) || num(a.pos) - num(c.pos));

  // Projekt; Gleichnamiges bekommt „(Import)“ (F4)
  let name = str(b.name).trim() || 'Trello-Board';
  const taken = new Set(projectsOf(ws).map((p) => fold(p.name)));
  if (taken.has(fold(name))) {
    let k = 1;
    let cand = `${name} (Import)`;
    while (taken.has(fold(cand))) cand = `${name} (Import ${++k})`;
    name = cand;
  }
  const ownP = own && isObj(own.project) ? (own.project as Partial<Project>) : undefined;
  const made = addProject(ws, name, { state: ownP?.state ?? 'planned', ...(ownP?.start ? { start: ownP.start } : {}), ...(ownP?.end ? { end: ownP.end } : {}) }, now);
  if (!made) return { ok: false, error: 'full' };
  ws = made.ws;
  const pid = made.id;

  // Kanban-Sheet: offene Listen → Spalten (höchstens COLUMN_MAX)
  const openLists = lists.filter((l) => !l.closed);
  if (openLists.length > COLUMN_MAX) notes.push(`listsOver:${openLists.length - COLUMN_MAX}`);
  const v = createView(ws, 'kanban', name);
  ws = v.ws;
  const cols: NoteColumn[] = openLists.slice(0, COLUMN_MAX).map((l) => {
    const nm = str(l.name).trim() || 'Liste';
    return { id: `tl-${str(l.id) || Math.random().toString(36).slice(2)}`, name: nm, ids: [], state: colStateOf({ name: nm }) };
  });
  // V121 (F-231 K3): archivierte Listen → archivierte Spalten (mit ihren Karten)
  const archCols: NoteColumn[] = lists
    .filter((l) => l.closed)
    .slice(0, ARCHIVED_COL_MAX)
    .map((l, i) => {
      const nm = str(l.name).trim() || 'Liste';
      return { id: `tl-${str(l.id) || Math.random().toString(36).slice(2)}`, name: nm, ids: [], state: colStateOf({ name: nm }), archivedAt: now, archivedFrom: COLUMN_MAX + i };
    });
  const colOfList = new Map([
    ...openLists.slice(0, COLUMN_MAX).map((l, i) => [str(l.id), cols[i]] as const),
    ...lists.filter((l) => l.closed).slice(0, ARCHIVED_COL_MAX).map((l, i) => [str(l.id), archCols[i]] as const),
  ]);
  const stateOfList = new Map(lists.map((l) => [str(l.id), colStateOf({ name: str(l.name) })]));

  // V125 (F-231 K8): eigene Felder des Boards (Trello `customFields`) und Abstimmen (`prefs.voting`)
  const fieldDefs = fieldsFromTrello(b.customFields);
  const voting = isObj(b.prefs) && typeof (b.prefs as Obj).voting === 'string' && (b.prefs as Obj).voting !== 'disabled';

  // Labels → Tags
  const tagById = new Map(arr(b.labels).map((l) => [str(l.id), tagOfLabel(l)]));

  // Mitglieder → Personen (F5)
  const mergeSet = new Set((o.merge ?? []).map(fold));
  const personOf = new Map<string, string>();
  const mergedNames: string[] = [];
  let personsAdded = 0;
  for (const m of arr(b.members)) {
    const mName = memberName(m);
    if (!mName || personOf.has(str(m.id))) continue;
    const exists = (ws.persons ?? []).find((p) => fold(p.name) === fold(mName));
    if (exists && mergeSet.has(fold(mName))) {
      personOf.set(str(m.id), exists.id);
      mergedNames.push(exists.name);
      continue;
    }
    let nm = mName;
    if (exists) {
      let k = 1;
      nm = `${mName} (Import)`;
      while ((ws.persons ?? []).some((p) => fold(p.name) === fold(nm))) nm = `${mName} (Import ${++k})`;
    }
    const extra: Partial<Person> = { foreign: { trello: { ...m } } };
    const a = addPerson(ws, nm, 'person', extra);
    if (!a) continue;
    ws = a.ws;
    personOf.set(str(m.id), a.id);
    personsAdded++;
  }

  // Checklisten und Kommentare je Karte
  const clByCard = new Map<string, Obj[]>();
  for (const c of arr(b.checklists).sort((x, y) => num(x.pos) - num(y.pos))) {
    const k = str(c.idCard);
    clByCard.set(k, [...(clByCard.get(k) ?? []), c]);
  }
  const actions = arr(b.actions);
  const comments = new Map<string, Obj[]>();
  const otherActions: Obj[] = [];
  for (const a of actions) {
    const cid = isObj(a.data) && isObj((a.data as Obj).card) ? str(((a.data as Obj).card as Obj).id) : '';
    if (a.type === 'commentCard' && cid) comments.set(cid, [...(comments.get(cid) ?? []), a]);
    else otherActions.push(a);
  }

  // eigene Notizen (Gruppen, Risiken …) aus einem E-Sources-Export zuerst, damit Karten auf sie zeigen können
  const idMap = new Map<string, string>();
  const ownNotes = own ? arr(own.notes) : [];
  const created: { id: string; src: Partial<Note> }[] = [];
  for (const src of ownNotes as Partial<Note>[]) {
    const r = createNote(ws, { ...cleanOwn(src), project: pid }, { now });
    ws = r.ws;
    if (src.id) idMap.set(src.id, r.id);
    created.push({ id: r.id, src });
  }

  let checklistCount = 0;
  let cardCount = 0;
  for (const c of cards) {
    const cid = str(c.id);
    const co = isObj(c.eSources) ? (c.eSources as unknown as CardOwn) : undefined;
    const base = co && isObj(co.note) ? cleanOwn(co.note) : {};
    const sent = co?.sent;
    const fullName = str(c.name).trim() || 'Karte';
    const desc = str(c.desc);
    const cls = clByCard.get(cid) ?? arr(c.checklists);
    const lists: Checklist[] = cls.map((cl) => ({
      name: str(cl.name).trim() || CHECKLIST_DEFAULT,
      items: arr(cl.checkItems)
        .sort((x, y) => num(x.pos) - num(y.pos))
        .map((i) => {
          // V121 (F-231 K2): Fälligkeit und Zuständiger eines Punkts → „— @Name, bis TT.MM.JJJJ“
          const pid = i.idMember ? personOf.get(str(i.idMember)) : undefined;
          const who = pid ? personById(ws, pid)?.name : undefined;
          return { name: itemText(str(i.name).trim(), who, localAt(i.due)?.day), done: i.state === 'complete' };
        }),
    }));
    checklistCount += lists.length;
    const labelIds = Array.isArray(c.idLabels) ? (c.idLabels as unknown[]).map(str) : arr(c.labels).map((l) => str(l.id));
    const tagsIn = [...new Set(labelIds.map((id) => tagById.get(id) ?? '').filter(Boolean))];
    const memberIds = Array.isArray(c.idMembers) ? (c.idMembers as unknown[]).map(str).filter((id) => personOf.has(id)) : [];
    const closed = c.closed === true;
    const listState = stateOfList.get(str(c.idList)) ?? 'open';
    const done = c.dueComplete === true;
    const inState: NoteState = closed ? 'archived' : done || listState === 'done' ? 'done' : listState;

    // Feld für Feld: hat die andere Seite nichts geändert (gleich wie gesendet), gilt die eigene Notiz
    const same = (k: keyof CardOwn['sent'], val: unknown) => !!sent && JSON.stringify(sent[k]) === JSON.stringify(val);
    const title = same('name', fullName) && base.title !== undefined ? base.title : fullName.length > TITLE_MAX ? fullName.slice(0, TITLE_MAX) : fullName;
    let text: string;
    if (same('desc', desc) && base.text !== undefined) {
      // eigener Text, wenn er dieselben Checklisten ergibt
      const own2 = splitText(base.text, titleOf({ title: base.title ?? '', text: base.text }));
      text = JSON.stringify(own2.lists) === JSON.stringify(lists) ? base.text : joinText(own2.desc, lists);
    } else text = joinText(desc, lists);
    const dueSame = same('due', c.due ?? null) && 'due' in base;
    const dueAt = localAt(c.due);
    const due = dueSame ? base.due : (dueAt?.day ?? dayOf(c.due));
    const dueTime = dueSame ? base.dueTime : dueAt?.time;
    const notBefore = same('start', c.start ?? null) && 'notBefore' in base ? base.notBefore : dayOf(c.start);
    const state = same('list', str(c.idList)) && same('closed', closed) && same('done', done) && base.state ? base.state : inState;
    // gleich wie gesendet: eigene Tags (Gruppen- und Meilenstein-Labels waren nur für Trello)
    const tags = same('labels', labelIds) ? (base.tags ?? []) : tagsIn.filter((t) => t !== MILESTONE_LABEL || !base.milestone);
    const milestone = base.milestone ?? (tagsIn.includes(MILESTONE_LABEL) ? true : undefined);
    const members = memberIds.map((id) => personOf.get(id)!);
    // V124 (F-231 K6): Cover → Titelbild (Farbe/Größe); Bild-Cover reist roh mit (`_cover`)
    const rawCover = isObj(c.cover) ? (c.cover as Obj) : null;
    const cvIn = coverFromTrello(rawCover);
    const cover = sent && 'cover' in sent && same('cover', coverSig(rawCover)) ? base.cover : cvIn.cover;
    // V125 (F-231 K8): Werte der eigenen Felder und Stimmen kommen immer aus Trello (Ids des Boards)
    const fieldVals = valuesFromTrello(c.customFieldItems, fieldDefs);
    const voters = [...new Set((Array.isArray(c.idMembersVoted) ? (c.idMembersVoted as unknown[]).map(str) : []).map((m) => personOf.get(m)).filter((x): x is string => !!x))];
    const useOwn = same('members', Array.isArray(c.idMembers) ? (c.idMembers as unknown[]).map(str) : []) && (base.use || base.assignee);

    const rest = omit(c, OWN_CARD);
    if (c.due) rest._due = c.due;
    if (c.start) rest._start = c.start;
    if (cvIn.keep && rawCover) rest._cover = rawCover;
    if (fullName.length > TITLE_MAX) rest._name = fullName;
    if (cls.length) rest.cl = cls;
    const cm = comments.get(cid);
    // V122 (K7): roh unter `cmx` (ab V122 je Kommentar ein Spur-Eintrag mit `ref`); `comments` = ältere Importe ohne Spur
    if (cm?.length) rest.cmx = cm;
    kept += (cm?.length ?? 0) + arr(c.attachments).length;
    const bag: ForeignBag | undefined = Object.keys(rest).length && sizeOf(rest) <= FOREIGN_TEXT_MAX ? { trello: rest } : undefined;
    if (!bag && Object.keys(rest).length) notes.push(`cardTooBig:${fullName.slice(0, 40)}`);

    const r = createNote(
      ws,
      {
        ...base,
        title,
        text,
        project: pid,
        state,
        ...(due ? { due } : {}),
        ...(due && dueTime ? { dueTime } : {}),
        ...(notBefore ? { notBefore } : {}),
        tags: tags.length ? tags : undefined,
        ...(milestone ? { milestone: true } : {}),
        ...(cover ? { cover } : {}),
        fields: fieldVals,
        votes: voters.length ? voters : undefined,
        ...(useOwn ? {} : members.length ? { assignee: members[0], use: members.map((p) => ({ person: p })) } : {}),
        ...(bag ? { foreign: bag } : {}),
      },
      { now },
    );
    const fresh = (r.ws.notes ?? []).find((n) => n.id === r.id)!;
    if (!due) delete fresh.due;
    if (!due || !dueTime) delete fresh.dueTime;
    if (!notBefore) delete fresh.notBefore;
    if (!fresh.tags) delete fresh.tags;
    if (!cover) delete fresh.cover;
    if (!fieldVals) delete fresh.fields;
    if (!voters.length) delete fresh.votes;
    // V122 (F-231 K7): Trello-Kommentare werden Kommentare der Notiz (Id der Aktion in `ref`, roh weiter in foreign)
    if (cm?.length) {
      const evs = cm
        .map((a) => {
          const text = isObj(a.data) ? str((a.data as Obj).text).trim() : '';
          const t = Date.parse(str(a.date));
          const by = (isObj(a.memberCreator) ? memberName(a.memberCreator as Obj) : '') || memberName(arr(b.members).find((m) => str(m.id) === str(a.idMemberCreator)) ?? {});
          return text ? ({ at: Number.isNaN(t) ? now : t, what: 'comment', id: `tc-${str(a.id) || Math.random().toString(36).slice(2)}`, text: text.slice(0, 5000), ...(by ? { by } : {}), ...(str(a.id) ? { ref: str(a.id) } : {}) } as Note['trail'][number]) : null;
        })
        .filter((e): e is Note['trail'][number] => !!e);
      fresh.trail = trimTrail([...fresh.trail, ...evs].sort((x, y) => x.at - y.at));
    }
    ws = r.ws;
    if (co?.id) idMap.set(co.id, r.id);
    created.push({ id: r.id, src: base });
    cardCount++;
    const col = colOfList.get(str(c.idList));
    // V121 (K1): archivierte Karten bleiben in ihrer Spalte (das Board blendet sie aus, das Archiv zeigt sie)
    if (col) col.ids.push(r.id);
  }

  // Bezüge aus dem eigenen Abschnitt (Eltern, Vorgänger, Personen) auf die neuen Ids umstellen
  const mapLinks = (l: NoteLink[] | undefined) => l?.map((x) => ({ ...x, id: idMap.get(x.id) ?? '' })).filter((x) => x.id);
  const fix = new Map(created.map((c) => [c.id, c.src]));
  ws = {
    ...ws,
    notes: notesOf(ws).map((n) => {
      const src = fix.get(n.id);
      if (!src) return n;
      const parent = src.parent ? idMap.get(src.parent) : undefined;
      const after = mapLinks(src.after);
      const out: Note = { ...n };
      if (parent) out.parent = parent;
      else delete out.parent;
      if (after?.length) out.after = after;
      else delete out.after;
      // Personen aus dem eigenen Abschnitt, die es hier nicht gibt, fallen weg
      if (out.assignee && !personById(ws, out.assignee)) delete out.assignee;
      if (out.use) {
        out.use = out.use.filter((u) => personById(ws, u.person));
        if (!out.use.length) delete out.use;
      }
      return out;
    }),
    noteViews: viewsOf(ws).map((x) => (x.id === v.id ? { ...x, cols, ...(archCols.length ? { archivedCols: archCols } : {}), ids: [], owner: { kind: 'project', id: pid }, ...(isObj(b.prefs) && (b.prefs as Obj).cardCovers === false ? { noCovers: true as const } : {}), ...(fieldDefs.length ? { fields: fieldDefs } : {}), ...(voting ? { votes: true as const } : {}) } : x)),
  };

  // Projekt: Beschreibung → Ziel; Board-Felder roh mitführen (Listen, Labels, Mitglieder mit Ids und pos)
  const brest = omit(b, OWN_BOARD);
  if (otherActions.length) {
    if (sizeOf(brest) + sizeOf(otherActions) <= FOREIGN_TEXT_MAX) brest.actions = otherActions;
    else notes.push(`actionsDropped:${otherActions.length}`);
  }
  let pBag: ForeignBag = { from: { kind: 'trello', at, app: 'Trello', ...(o.name ? { name: o.name.slice(0, 200) } : {}) } };
  if (sizeOf(brest) <= FOREIGN_TEXT_MAX) pBag = { ...pBag, trello: brest };
  else notes.push('boardTooBig');
  kept += Object.keys(brest).length;
  const ownFields = ownP ? pickProject(ownP, idMap) : {};
  const desc = str(b.desc).trim();
  ws = {
    ...ws,
    projects: (ws.projects ?? []).map((p) =>
      p.id === pid
        ? {
            ...p,
            ...ownFields,
            ...(!ownFields.brief && desc ? { brief: { goal: desc } } : {}),
            order: ownFields.order ?? { '': created.filter((c) => !fix.get(c.id)?.parent).map((c) => c.id) },
            foreign: pBag,
          }
        : p,
    ),
  };
  // V122 (F-231 K4): Labelfarben → gemeinsame Tag-Farben (eine schon gesetzte eigene Farbe bleibt)
  for (const l of arr(b.labels)) {
    const tag = tagOfLabel(l);
    const c = str(l.color);
    if (tag && isTagColor(c) && !colorOf(ws, tag)) ws = setTagColor(ws, tag, c);
  }
  return { ok: true, ws, project: pid, view: v.id, cards: cardCount, lists: lists.length, checklists: checklistCount, persons: personsAdded, merged: mergedNames, kept, notes };
}

/** Notiz aus dem eigenen Abschnitt ohne Ids, Spur und Bezüge (die stellt der Import neu her) */
function cleanOwn(n: Partial<Note>): Partial<Note> {
  if (!isObj(n)) return {};
  const { id: _i, trail: _t, created: _c, changed: _ch, project: _p, foreign: _f, draft: _d, unsaved: _u, ...rest } = n as Note;
  void _i, _t, _c, _ch, _p, _f, _d, _u;
  return rest;
}

/** Projektfelder aus dem eigenen Abschnitt, Bezüge auf Notizen umgestellt */
function pickProject(p: Partial<Project>, idMap: Map<string, string>): Partial<Project> {
  const out: Partial<Project> = {};
  const copy = ['brief', 'charter', 'calendar', 'accent', 'taskLimit', 'roles', 'phases', 'budget', 'priority'] as const;
  for (const k of copy) if ((p as Obj)[k] !== undefined) (out as Obj)[k] = (p as Obj)[k];
  if (isObj(p.order)) {
    const order: Record<string, string[]> = {};
    for (const [k, ids] of Object.entries(p.order as Record<string, string[]>)) {
      const key = k === '' ? '' : idMap.get(k);
      if (key === undefined || !Array.isArray(ids)) continue;
      order[key] = ids.map((i) => idMap.get(i) ?? '').filter(Boolean);
    }
    out.order = order;
  }
  if (isObj(p.baseline) && isObj((p.baseline as Obj).tasks)) {
    const tasks: Record<string, unknown> = {};
    for (const [k, t] of Object.entries((p.baseline as Obj).tasks as Obj)) if (idMap.has(k)) tasks[idMap.get(k)!] = t;
    out.baseline = { ...(p.baseline as NonNullable<Project['baseline']>), tasks: tasks as NonNullable<Project['baseline']>['tasks'] };
  }
  return out;
}

// ---------- Export ----------

export interface TrelloOptions {
  /** Stichtag für den Gantt (JJJJ-MM-TT) */
  today?: string;
  /** Zeitpunkt für neue Ids (Tests) */
  now?: number;
  /** Anwendung und Version */
  generator?: string;
}

/** 24 Hex-Zeichen wie Trello-Ids; aus Zeit und Zähler, damit Tests gleich bleiben */
function idMaker(now: number) {
  let k = 0;
  const t = Math.floor(now / 1000).toString(16).padStart(8, '0').slice(-8);
  return () => `${t}e5${(++k).toString(16).padStart(14, '0')}`;
}

/** pos aus der Datei, solange die Reihenfolge stimmt, sonst neu (Trello rechnet in Schritten von 16384) */
function positions(orig: (number | undefined)[]): number[] {
  const out: number[] = [];
  let last = 0;
  for (const p of orig) {
    const next = p !== undefined && p > last ? p : last + 16384;
    out.push(next);
    last = next;
  }
  return out;
}

const DEFAULT_LISTS: { name: string; state: NoteState }[] = [
  { name: 'Offen', state: 'open' },
  { name: 'In Arbeit', state: 'doing' },
  { name: 'In Prüfung', state: 'review' },
  { name: 'Erledigt', state: 'done' },
];

/** Projekt `pid` als Trello-Board (JSON); '' wenn es das Projekt nicht gibt. */
export function exportTrello(ws: Workspace, pid: string, o: TrelloOptions = {}): string {
  if (!projectById(ws, pid)) return '';
  return withCalendar(calendarFor(ws, pid), () => exportCalc(ws, pid, o));
}

/** Ist die Notiz eine Karte? Gruppen (mit Unter-Vorgängen im Projekt) sind keine – sie werden Labels ihrer Karten. */
export function cardsOf(ws: Workspace, pid: string): { cards: Note[]; groups: Note[] } {
  const all = notesOf(ws).filter((n) => n.project === pid && !n.unsaved);
  const parents = new Set(all.map((n) => n.parent).filter(Boolean) as string[]);
  return { cards: all.filter((n) => !parents.has(n.id)), groups: all.filter((n) => parents.has(n.id)) };
}

function exportCalc(ws: Workspace, pid: string, o: TrelloOptions): string {
  const p = projectById(ws, pid)!;
  const make = idMaker(o.now ?? Date.now());
  const F = (p.foreign?.trello ?? {}) as Obj;
  const boardId = str(F.id) || make();
  const { cards, groups } = cardsOf(ws, pid);
  const byId = new Map(notesOf(ws).map((n) => [n.id, n]));
  let rows: Map<string, { start: string; end: string }> = new Map();
  try {
    rows = new Map(ganttOf(ws, pid, o.today).rows.map((r) => [r.id, { start: r.start, end: r.end }]));
  } catch {
    /* ohne Gantt */
  }

  // Listen: Spalten des Kanban-Sheets des Projekts, sonst je Zustand eine Liste
  const view = viewsOf(ws).find((v) => v.kind === 'kanban' && v.owner?.kind === 'project' && v.owner.id === pid);
  const fLists = arr(F.lists);
  const fListById = new Map(fLists.map((l) => [str(l.id), l]));
  type L = { raw: Obj; col?: NoteColumn; state: NoteState };
  const ls: L[] = view?.cols?.length
    ? view.cols.map((c) => {
        const tid = c.id.startsWith('tl-') ? c.id.slice(3) : '';
        const raw = fListById.get(tid) ?? fLists.find((l) => fold(str(l.name)) === fold(c.name)) ?? {};
        return { raw: { ...raw, id: str(raw.id) || make(), name: c.name, closed: false }, col: c, state: colStateOf(c) };
      }).concat(
        // V121 (K3): archivierte Spalten gehen als archivierte Listen zurück
        (view.archivedCols ?? []).map((c) => {
          const tid = c.id.startsWith('tl-') ? c.id.slice(3) : '';
          const raw = fListById.get(tid) ?? {};
          return { raw: { ...raw, id: str(raw.id) || make(), name: c.name, closed: true }, col: c, state: colStateOf(c) };
        }),
      )
    : DEFAULT_LISTS.map((d) => {
        const raw = fLists.find((l) => fold(str(l.name)) === fold(d.name)) ?? {};
        return { raw: { ...raw, id: str(raw.id) || make(), name: d.name, closed: false }, state: d.state };
      });
  const used = new Set(ls.map((l) => str(l.raw.id)));
  // Listen aus der Datei, die nicht als Spalte stehen (archiviert oder über COLUMN_MAX), bleiben dahinter
  for (const l of fLists.slice().sort((a, b) => num(a.pos) - num(b.pos))) if (!used.has(str(l.id))) ls.push({ raw: { ...l }, state: colStateOf({ name: str(l.name) }) });
  const lPos = positions(ls.map((l) => (typeof l.raw.pos === 'number' ? l.raw.pos : undefined)));
  ls.forEach((l, i) => {
    l.raw.idBoard = boardId;
    l.raw.pos = lPos[i];
  });
  const listFor = (n: Note): string => {
    const inCol = ls.find((l) => l.col?.ids.includes(n.id));
    if (inCol) return str(inCol.raw.id);
    const fl = str((n.foreign?.trello as Obj | undefined)?.idList);
    if (fl && ls.some((l) => str(l.raw.id) === fl && (n.state === 'archived' || colStateOf({ name: str(l.raw.name) }) === stateKey(n.state)))) return fl;
    const want = stateKey(n.state);
    return str((ls.find((l) => !l.raw.closed && l.state === want) ?? ls.find((l) => !l.raw.closed) ?? ls[0]).raw.id);
  };

  // Labels: aus der Datei, neue Tags dazu; Gruppen (Eltern) und Meilensteine als Label
  const labels = arr(F.labels).map((l) => ({ ...l }));
  const labelFor = (tag: string): string => {
    const hit = labels.find((l) => fold(tagOfLabel(l)) === fold(tag));
    // V122 (F-231 K4): eigene Tag-Farbe geht zurück an das Label (ein Label ohne Namen behält seinen leeren Namen)
    const own = colorOf(ws, tag);
    if (hit) {
      if (own && own !== str(hit.color)) hit.color = own;
      return str(hit.id);
    }
    const nl: Obj = { id: make(), idBoard: boardId, name: tag, color: own ?? null };
    labels.push(nl);
    return str(nl.id);
  };

  // Mitglieder: Personen der Karten
  const fMembers = arr(F.members);
  const members: Obj[] = fMembers.map((m) => ({ ...m }));
  const memberFor = (personId: string): string | undefined => {
    const pn = personById(ws, personId);
    if (!pn) return undefined;
    const t = pn.foreign?.trello as Obj | undefined;
    const tid = t ? str(t.id) : '';
    const hit = members.find((m) => (tid && str(m.id) === tid) || fold(memberName(m)) === fold(pn.name));
    if (hit) return str(hit.id);
    const m: Obj = { ...(t ?? {}), id: tid || make(), fullName: pn.name, username: fold(pn.name).replace(/[^a-z0-9]+/g, '') || 'person', initials: pn.name.split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 3).toUpperCase() };
    members.push(m);
    return str(m.id);
  };

  // Karten in Spalten-Reihenfolge, die übrigen danach
  const order: Note[] = [];
  for (const l of ls) for (const id of l.col?.ids ?? []) {
    const n = byId.get(id);
    if (n && n.project === pid && cards.includes(n) && !order.includes(n)) order.push(n);
  }
  for (const n of cards) if (!order.includes(n)) order.push(n);

  // V125 (F-231 K8): eigene Felder des Boards → `customFields` (nur, wenn Trello sie kannte oder wir welche haben)
  const fieldDefs = view?.fields ?? [];
  const cfOut = fieldDefs.length || Array.isArray(F.customFields) ? fieldsToTrello(fieldDefs, F.customFields, boardId, make) : undefined;

  const outCards: Obj[] = [];
  const outCl: Obj[] = [];
  const comments: Obj[] = [];
  const posByList = new Map<string, (number | undefined)[]>();
  for (const n of order) {
    const base = { ...((n.foreign?.trello as Obj | undefined) ?? {}) };
    const id = str(base.id) || make();
    const cls = arr(base.cl);
    const cm = arr(base.comments);
    const cmx = arr(base.cmx);
    delete base.cmx;
    const _due = str(base._due);
    const _start = str(base._start);
    const _name = str(base._name);
    // Importe vor V124 haben das Cover noch roh in `cover`
    const _cover = isObj(base._cover) ? (base._cover as Obj) : isObj(base.cover) ? (base.cover as Obj) : undefined;
    delete base._cover;
    delete base.cover;
    delete base.cl;
    delete base.comments;
    delete base._due;
    delete base._start;
    delete base._name;
    const title = titleOf(n);
    const name = _name && _name.slice(0, TITLE_MAX) === title ? _name : title;
    const split = splitText(n.text, n.title.trim() ? undefined : title);
    // Checklisten: Ids und pos aus der Datei, wenn Name gleich
    const idChecklists: string[] = [];
    split.lists.forEach((c, ci) => {
      const orig = cls.find((x) => fold(str(x.name)) === fold(c.name) && !idChecklists.includes(str(x.id)));
      const clId = str(orig?.id) || make();
      const oItems = arr(orig?.checkItems).sort((x, y) => num(x.pos) - num(y.pos));
      const usedI = new Set<string>();
      const items = c.items.map((it) => {
        const meta = itemMeta(it.name);
        const oi = oItems.find((x) => !usedI.has(str(x.id)) && str(x.name).trim() === meta.text);
        if (oi) usedI.add(str(oi.id));
        // V121 (K2): Person und Datum des Punkts
        const pn = meta.who ? (ws.persons ?? []).find((x) => fold(x.name) === fold(meta.who!)) : undefined;
        const idMember = pn ? (memberFor(pn.id) ?? null) : null;
        const due = meta.due ? (oi?.due && localAt(oi.due)?.day === meta.due ? oi.due : `${meta.due}T16:00:00.000Z`) : null;
        return { ...(oi ?? {}), id: str(oi?.id) || make(), name: meta.text, state: it.done ? 'complete' : 'incomplete', idChecklist: clId, due, idMember, ...(oi ? {} : { pos: undefined }) } as Obj;
      });
      const ip = positions(items.map((x) => (typeof x.pos === 'number' ? x.pos : undefined)));
      items.forEach((x, i) => (x.pos = ip[i]));
      outCl.push({ ...(orig ?? {}), id: clId, name: c.name, idBoard: boardId, idCard: id, pos: typeof orig?.pos === 'number' ? orig.pos : 16384 * (ci + 1), checkItems: items });
      idChecklists.push(clId);
    });
    // V122 (F-231 K7): Kommentare aus der Spur; roh mitgeführte Felder bleiben (gleiche Aktion über `ref`), gelöschte fallen weg.
    // Notizen aus älteren Importen (Kommentare nur roh, ohne Spur-Eintrag) geben ihre rohen Kommentare unverändert zurück.
    const evs = n.trail.filter((e) => e.what === 'comment');
    for (const c of cm) comments.push(c);
    for (const e of evs) {
      const raw = e.ref ? cmx.find((x) => str(x.id) === e.ref) : undefined;
      const rd = isObj(raw?.data) ? (raw!.data as Obj) : {};
      const person = e.by ? (ws.persons ?? []).find((x) => fold(x.name) === fold(e.by!)) : undefined;
      const mid = person ? memberFor(person.id) : undefined;
      comments.push({
        ...(raw ?? { idMemberCreator: mid ?? null, ...(e.by ? { memberCreator: { fullName: e.by } } : {}) }),
        id: e.ref || make(),
        type: 'commentCard',
        date: raw && Date.parse(str(raw.date)) === e.at ? raw.date : new Date(e.at).toISOString(),
        data: { ...rd, text: e.text, card: { ...(isObj(rd.card) ? (rd.card as Obj) : {}), id, name: titleOf(n) }, board: { ...(isObj(rd.board) ? (rd.board as Obj) : {}), id: boardId } },
      });
    }
    const idList = listFor(n);
    const r = rows.get(n.id);
    const dueDay = n.due ?? (base.id ? undefined : r?.end);
    const startDay = n.notBefore ?? (base.id ? undefined : r?.start);
    const keepDue = _due && (n.dueTime ? localAt(_due)?.day === dueDay && localAt(_due)?.time === n.dueTime : dayOf(_due) === dueDay);
    const due = dueDay ? (keepDue ? _due : n.dueTime && n.due ? new Date(`${dueDay}T${n.dueTime}:00`).toISOString() : `${dueDay}T16:00:00.000Z`) : null;
    const start = startDay ? (_start && dayOf(_start) === startDay ? _start : `${startDay}T08:00:00.000Z`) : null;
    const tagList = [...(n.tags ?? [])];
    if (n.milestone && !tagList.includes(MILESTONE_LABEL)) tagList.push(MILESTONE_LABEL);
    if (!base.id && n.parent) {
      const g = byId.get(n.parent);
      if (g) tagList.push(titleOf(g));
    }
    const idLabels = [...new Set(tagList.map(labelFor))];
    const people = n.use?.length ? n.use.map((u) => u.person) : n.assignee ? [n.assignee] : [];
    const idMembers = [...new Set(people.map(memberFor).filter(Boolean) as string[])];
    const closed = n.state === 'archived';
    const done = n.state === 'done';
    const list = posByList.get(idList) ?? [];
    list.push(typeof base.pos === 'number' ? base.pos : undefined);
    posByList.set(idList, list);
    const cover = coverToTrello(n.cover, _cover);
    // V125 (K8): Werte und Stimmen (Schlüssel nur, wenn Trello sie kannte oder die Karte welche hat)
    const cfItems = cfOut && (n.fields || Array.isArray(base.customFieldItems)) ? itemsToTrello(n, fieldDefs, base.customFieldItems, id, cfOut.ids, make) : undefined;
    const idVoted = n.votes?.length || Array.isArray(base.idMembersVoted) ? [...new Set((n.votes ?? []).map(memberFor).filter(Boolean) as string[])] : undefined;
    const sent: CardOwn['sent'] = { name, desc: split.desc, due, start, list: idList, closed, done, labels: idLabels, members: idMembers, cover: coverSig(cover) };
    outCards.push({
      ...base,
      id,
      name,
      desc: split.desc,
      closed,
      idBoard: boardId,
      idList,
      due,
      start,
      dueComplete: done,
      idLabels,
      idMembers,
      idChecklists,
      cover,
      ...(cfItems ? { customFieldItems: cfItems } : {}),
      ...(idVoted ? { idMembersVoted: idVoted } : {}),
      eSources: { v: 1, id: n.id, note: ownNote(n), sent } satisfies CardOwn,
    });
  }
  // pos je Liste
  const seen = new Map<string, number>();
  const posOut = new Map([...posByList].map(([k, v]) => [k, positions(v)]));
  for (const c of outCards) {
    const k = str(c.idList);
    const i = seen.get(k) ?? 0;
    c.pos = posOut.get(k)![i];
    seen.set(k, i + 1);
  }
  // Labels: Zahl der Karten
  for (const l of labels) l.uses = outCards.filter((c) => (c.idLabels as string[]).includes(str(l.id))).length;

  const fActions = arr(F.actions);
  const board: Obj = {
    ...omit(F, ['lists', 'labels', 'members', 'actions']),
    id: boardId,
    name: p.name,
    desc: p.brief?.goal ?? str(F.desc),
    closed: false,
    idBoard: undefined,
    labels,
    // V124 (F-231 K6): Board-Schalter „Titelbilder zeigen“
    // (nur wenn Trello den Schalter schon kannte oder wir ausblenden – sonst bleiben die Einstellungen unverändert)
    // V125 (F-231 K8): Abstimmen (`voting` nur, wenn Trello es kannte oder wir es eingeschaltet haben)
    ...(() => {
      const fp = isObj(F.prefs) ? (F.prefs as Obj) : undefined;
      const covers = view?.noCovers || (fp && 'cardCovers' in fp);
      const votes = view?.votes || (fp && 'voting' in fp);
      if (!covers && !votes) return {};
      const was = fp && typeof fp.voting === 'string' && fp.voting !== 'disabled' ? fp.voting : 'members';
      return { prefs: { ...(fp ?? {}), ...(covers ? { cardCovers: !view?.noCovers } : {}), ...(votes ? { voting: view?.votes ? was : 'disabled' } : {}) } };
    })(),
    ...(cfOut ? { customFields: cfOut.list } : {}),
    lists: ls.map((l) => l.raw),
    cards: outCards,
    checklists: outCl,
    members,
    actions: [...comments, ...fActions],
    eSources: {
      v: 1,
      app: o.generator ?? 'E-Sources',
      project: ownProject(p),
      notes: groups.map((g) => ({ ...ownNote(g), id: g.id })),
    },
  };
  delete board.idBoard;
  return JSON.stringify(board, null, 2);
}

const stateKey = (s: NoteState): NoteState => (s === 'waiting' ? 'open' : s === 'archived' ? 'done' : s);

/** Notiz für den eigenen Abschnitt: ohne Spur, Fremddaten, Entwurf */
function ownNote(n: Note): Partial<Note> {
  const { trail: _t, foreign: _f, draft: _d, unsaved: _u, project: _p, created: _c, changed: _ch, ...rest } = n;
  void _t, _f, _d, _u, _p, _c, _ch;
  return rest;
}
function ownProject(p: Project): Partial<Project> {
  const { foreign: _f, id: _i, created: _c, changed: _ch, ...rest } = p;
  void _f, _i, _c, _ch;
  return rest;
}

// ---------- Anzeigen (nur lesen) ----------

export interface TrelloExtras {
  comments: { at: string; by: string; text: string }[];
  attachments: { name: string; url: string; upload: boolean }[];
}

/**
 * V119: Kommentare und Anhänge einer aus Trello importierten Karte zum Lesen in der Notiz (mitgeführt in
 * `foreign.trello`). Autoren aus dem Kommentar selbst, sonst aus den Mitgliedern des Boards bzw. den Personen.
 * `null` = nichts aus Trello.
 */
export function trelloExtras(ws: Workspace, n: Pick<Note, 'foreign' | 'project'> & Partial<Pick<Note, 'trail'>>): TrelloExtras | null {
  const t = n.foreign?.trello as Obj | undefined;
  if (!t) return null;
  const members = [...arr((projectById(ws, n.project)?.foreign?.trello as Obj | undefined)?.members), ...(ws.persons ?? []).map((p) => (p.foreign?.trello as Obj | undefined) ?? {})];
  const nameOf = (id: string) => {
    const m = members.find((x) => str(x.id) === id);
    return m ? memberName(m) : '';
  };
  // V122 (K7): Kommentare mit Spur-Eintrag stehen unter „Kommentare“ – hier nur ältere, nur roh mitgeführte
  const inTrail = new Set((n.trail ?? []).filter((e) => e.what === 'comment' && e.ref).map((e) => e.ref));
  const comments = arr(t.comments)
    .filter((a) => !inTrail.has(str(a.id)))
    .map((a) => ({
      at: str(a.date),
      by: (isObj(a.memberCreator) ? memberName(a.memberCreator as Obj) : '') || nameOf(str(a.idMemberCreator)),
      text: isObj(a.data) ? str((a.data as Obj).text) : '',
    }))
    .filter((c) => c.text)
    .sort((a, b) => a.at.localeCompare(b.at));
  const attachments = arr(t.attachments)
    .map((a) => ({ name: str(a.name).trim() || str(a.url), url: str(a.url), upload: a.isUpload === true }))
    .filter((a) => /^https?:\/\//i.test(a.url));
  return comments.length || attachments.length ? { comments, attachments } : null;
}
