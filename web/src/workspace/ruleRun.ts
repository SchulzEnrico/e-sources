/**
 * F-231 K10a (V129): Ausführung des Regel-Baukastens (ruleKit.ts) – B4: Regeln dürfen Regeln auslösen, höchstens
 * CHAIN_MAX = 3 Stufen, jede Regel läuft je Änderung nur einmal (kein Kreislauf); die ganze Kette ist ein
 * Rückgängig-Schritt (`runOf(ws).before`) mit Meldung am Ort. Spur (RG7): `by` = „Regel R3 · Name“.
 *
 * Ablauf: Der Reducer ruft `applyRules(vorher, nachher)` nach jeder Änderung (nicht beim Abgleich – das andere Gerät
 * hat seine Regeln schon angewandt). Aus dem Unterschied entstehen Ereignisse (Karte in Spalte gekommen, erledigt,
 * Tag gesetzt …); jede eingeschaltete Regel, deren Auslöser passt und deren Bedingungen gelten, führt ihre Aktionen
 * aus. Was die Aktionen ändern, ergibt die Ereignisse der nächsten Stufe. Regeln mit Auslöser „regelmäßig“ (W3, W4)
 * laufen über `runCheck` beim Start und stündlich.
 *
 * Spiegel (K9, A3): Spalten-Regeln gelten auch auf Spiegel-Boards, Zustands-Regeln nur auf dem Heimat-Board.
 */
import * as No from './notes';
import * as Sh from './sheets';
import * as Mi from './mirrors';
import * as KM from './kanbanMore';
import * as Ps from './persons';
import * as Cm from './comments';
import * as CFd from './cardFields';
import { fold } from './tags';
import { allChecked, checkAll, checksOf, doneAt, ruleSetOf, withRan } from './ruleSet';
import { type Act, CHAIN_MAX, type Cond, type KitButton, type KitRule, type TrigKind, buttonLabel, isSchedule, isTimed, kitOf, ruleLabel } from './ruleKit';
import * as RT from './ruleTime';
import { INBOX_ID } from './inbox';
import type { CardFieldDef, Note, NoteView, Workspace } from './types';

/** Ein Ereignis aus dem Unterschied zweier Stände. */
export interface RuleEvent {
  k: TrigKind;
  note: string;
  /** Board, auf dem es geschah (Spalten-Ereignisse, Ankommen). */
  view?: string;
  /** Name der Spalte (colIn/colOut). */
  col?: string;
  /** Tag, Person, Kommentartext bzw. Feld-Id. */
  a?: string;
}

/** Bericht eines Laufs: für die Meldung am Ort und „Rückgängig“ (ganze Kette auf einmal). */
export interface RuleRun {
  before: Workspace;
  /** Kennungen und Namen der Regeln, die liefen (in Reihenfolge). */
  names: string[];
  /** Wie viele Karten geändert wurden. */
  cards: number;
  /** Board, auf dem die auslösende Änderung geschah (dort steht die Meldung). */
  view?: string;
  note?: string;
  /** Texte der Aktion „Meldung“. */
  texts: string[];
  /** Tiefste Stufe (1–3); `cut` = die Kette ging tiefer und wurde abgebrochen. */
  depth: number;
  cut?: true;
  /** V130 (K10b): Kennung eines Knopfdrucks – das Bauteil, das gedrückt hat, meldet am Ort. */
  token?: string;
  /** V131 (K10c): angelegte wiederkehrende Karten, davon nachgeholt (Termin vor heute). */
  made?: number;
  late?: number;
}

const RUNS = new WeakMap<Workspace, RuleRun>();
/** Bericht zum Stand `ws` (nur gleich nach dem Lauf; jeder neue Stand hat keinen). */
export const runOf = (ws: Workspace): RuleRun | undefined => RUNS.get(ws);

const kanbans = (ws: Workspace) => No.viewsOf(ws).filter((v) => v.kind === 'kanban');
const colName = (v: NoteView, id: string) => (v.cols ?? []).find((c) => c.ids.includes(id))?.name;

// ---------------------------------------------------------------- Ereignisse

export function eventsOf(prev: Workspace, next: Workspace): RuleEvent[] {
  const out: RuleEvent[] = [];
  if (prev.notes !== next.notes) {
    const old = new Map(No.notesOf(prev).map((n) => [n.id, n]));
    for (const n of No.notesOf(next)) {
      const o = old.get(n.id);
      if (o === n) continue;
      if (!o) {
        out.push({ k: 'created', note: n.id });
        continue;
      }
      if (n.state === 'done' && o.state !== 'done') out.push({ k: 'done', note: n.id });
      if (No.isFinished(o.state) && !No.isFinished(n.state)) out.push({ k: 'reopen', note: n.id });
      const ot = new Set((o.tags ?? []).map(fold));
      const nt = new Set((n.tags ?? []).map(fold));
      for (const t of n.tags ?? []) if (!ot.has(fold(t))) out.push({ k: 'tagAdd', note: n.id, a: t });
      for (const t of o.tags ?? []) if (!nt.has(fold(t))) out.push({ k: 'tagDel', note: n.id, a: t });
      if (n.assignee && n.assignee !== o.assignee) out.push({ k: 'assignSet', note: n.id, a: n.assignee });
      if (!n.assignee && o.assignee) out.push({ k: 'assignDel', note: n.id });
      if (n.due && (n.due !== o.due || n.dueTime !== o.dueTime)) out.push({ k: 'dueSet', note: n.id });
      if (n.text !== o.text) {
        if (allChecked(n.text ?? '') && !allChecked(o.text ?? '')) out.push({ k: 'checksDone', note: n.id });
        if (checksOf(n.text ?? '').done > checksOf(o.text ?? '').done) out.push({ k: 'checkTick', note: n.id });
      }
      if (n.trail !== o.trail) {
        const seen = new Set(Cm.commentsOf(o).map((e) => e.id ?? `${e.at}`));
        for (const e of Cm.commentsOf(n)) if (!seen.has(e.id ?? `${e.at}`)) out.push({ k: 'comment', note: n.id, a: e.text ?? '' });
      }
      if (n.fields !== o.fields) {
        const keys = new Set([...Object.keys(n.fields ?? {}), ...Object.keys(o.fields ?? {})]);
        for (const f of keys) if (n.fields?.[f] !== o.fields?.[f]) out.push({ k: 'field', note: n.id, a: f });
      }
    }
  }
  if (prev.noteViews !== next.noteViews) {
    const old = new Map(No.viewsOf(prev).map((v) => [v.id, v]));
    for (const v of kanbans(next)) {
      const pv = old.get(v.id);
      if (pv === v) continue;
      const before = new Set(pv ? No.idsIn(pv) : []);
      for (const c of v.cols ?? []) {
        const pc = pv?.cols?.find((x) => x.id === c.id);
        for (const id of c.ids) {
          if (pc?.ids.includes(id)) continue;
          const from = pv ? colName(pv, id) : undefined;
          if (from !== undefined) out.push({ k: 'colOut', note: id, view: v.id, col: from });
          out.push({ k: 'colIn', note: id, view: v.id, col: c.name });
          if (!before.has(id) && No.noteById(prev, id)) out.push({ k: 'arrive', note: id, view: v.id });
        }
      }
      // Karte hat das Board verlassen (verschoben, archiviert aus der Spalte)
      if (pv) for (const id of before) if (!No.idsIn(v).includes(id)) { const from = colName(pv, id); if (from !== undefined) out.push({ k: 'colOut', note: id, view: v.id, col: from }); }
    }
    // V153 (K14/K10a): neu im Eingang – nur bei einem Eingang, den es vorher schon gab (nicht beim ersten Anlegen)
    const inb = No.viewById(next, INBOX_ID);
    const pin = old.get(INBOX_ID);
    // V158: entsteht der Eingang mit dem ersten Gedanken, zählt die neue Notiz trotzdem (nur schon vorhandene Notizen nicht)
    if (inb && inb !== pin) for (const id of inb.ids) if (pin ? !pin.ids.includes(id) : !No.noteById(prev, id)) out.push({ k: 'inbox', note: id, view: INBOX_ID });
  }
  return out;
}

// ---------------------------------------------------------------- Passt die Regel?

/** Boards, auf die sich eine Regel für diese Karte bezieht. */
function boardsFor(ws: Workspace, r: KitRule, noteId: string, ev?: RuleEvent): NoteView[] {
  if (ev?.view) {
    const v = No.viewById(ws, ev.view);
    return v && No.idsIn(v).includes(noteId) ? [v] : [];
  }
  const on = No.viewsWith(ws, noteId).filter((v) => v.kind === 'kanban');
  return r.board ? on.filter((v) => v.id === r.board) : on;
}

const STATE_TRIGS = new Set<TrigKind>(['done', 'reopen']);

function triggers(ws: Workspace, r: KitRule, ev: RuleEvent): boolean {
  if (r.when.k !== ev.k) return false;
  const a = r.when.a?.trim() ?? '';
  // V158: „Notiz kommt in den Eingang“ gilt unabhängig vom Board (Regel aus Board ⋮ › Automatisierung hat ein Board gesetzt)
  if (r.board && ev.k !== 'inbox') {
    if (ev.view) {
      if (ev.view !== r.board) return false;
    } else {
      const v = No.viewById(ws, r.board);
      if (!v || !No.idsIn(v).includes(ev.note)) return false;
      // A3: Zustand kommt vom Heimat-Board – auf einem Spiegel lösen Zustands-Regeln nicht aus
      if (STATE_TRIGS.has(ev.k) && Mi.isMirror(ws, v, ev.note)) return false;
    }
  }
  switch (ev.k) {
    case 'colIn':
    case 'colOut':
    case 'tagAdd':
    case 'tagDel':
      return !a || fold(a) === fold(ev.col ?? ev.a ?? '');
    case 'assignSet':
      return !a || (a === 'me' ? ev.a === Ps.meId(ws) : ev.a === a);
    case 'comment':
      return !a || fold(ev.a ?? '').includes(fold(a));
    case 'field':
      return fieldDefs(ws, r, ev.note).some((d) => d.id === ev.a && fold(d.name) === fold(a));
    default:
      return true;
  }
}

/** Felder der Boards der Karte (für „alle Kanbans“ alle Boards, auf denen sie liegt). */
function fieldDefs(ws: Workspace, r: KitRule, noteId: string, ev?: RuleEvent): CardFieldDef[] {
  return boardsFor(ws, r, noteId, ev).flatMap((v) => CFd.fieldsOf(v));
}
const defNamed = (ws: Workspace, r: KitRule, noteId: string, name: string, ev?: RuleEvent) => fieldDefs(ws, r, noteId, ev).find((d) => fold(d.name) === fold(name));

function holds(ws: Workspace, r: KitRule, c: Cond, n: Note, ev: RuleEvent | undefined, now: number): boolean {
  const today = No.dayOf(now);
  const yes = ((): boolean => {
    switch (c.k) {
      case 'inCol':
        return boardsFor(ws, r, n.id, ev).some((v) => fold(colName(v, n.id) ?? '') === fold(c.a ?? ''));
      case 'onBoard':
        return No.viewsWith(ws, n.id).some((v) => v.id === c.a);
      case 'state':
        return c.a === 'done' ? n.state === 'done' : !No.isFinished(n.state);
      case 'hasTag':
        return (n.tags ?? []).some((t) => fold(t) === fold(c.a ?? ''));
      case 'assignee': {
        const who = Ps.assigneeOf(n);
        if (!c.a) return !!who;
        if (c.a === 'none') return !who;
        return who === (c.a === 'me' ? Ps.meId(ws) : c.a);
      }
      case 'dueIn':
        return !!n.due && n.due <= No.shiftDay(today, c.n ?? 0);
      case 'overdue':
        return !!n.due && n.due < today && !No.isFinished(n.state);
      case 'noDue':
        return !n.due;
      case 'checks': {
        const k = checksOf(n.text ?? '');
        return c.a === 'done' ? k.total > 0 && k.done === k.total : k.done < k.total;
      }
      case 'field': {
        const d = defNamed(ws, r, n.id, c.a ?? '', ev);
        if (!d) return false;
        const t = CFd.valueText(d, n.fields?.[d.id]);
        return c.b?.trim() ? fold(t) === fold(c.b) : !!t;
      }
      case 'titleHas':
        return fold(No.titleOf(n)).includes(fold(c.a ?? ''));
      case 'doneSince': {
        const at = doneAt(n);
        return at !== null && now - at >= (c.n ?? 0) * 864e5;
      }
      case 'urgent':
        return !!n.urgent;
    }
  })();
  return c.not ? !yes : yes;
}

// ---------------------------------------------------------------- Aktionen

const dmy = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`;
/** Platzhalter in Texten: {heute}, {titel}. */
export const fillText = (text: string, n: Note | undefined, now: number, day = No.dayOf(now)) =>
  text.replace(/\{heute\}/gi, dmy(day)).replace(/\{titel\}/gi, n ? No.titleOf(n) : '');

/** Wert aus dem Text der Regel passend zum Feldtyp. */
function valueFor(d: CardFieldDef, raw: string): unknown {
  const t = raw.trim();
  if (d.type === 'list') return d.options?.find((o) => fold(o.name) === fold(t))?.id;
  if (d.type === 'check') return /^(ja|x|1|true|an)$/i.test(t) ? true : undefined;
  if (d.type === 'number') return Number(t.replace(',', '.'));
  if (d.type === 'date') {
    const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(t);
    return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : t;
  }
  return t;
}

const uncheck = (text: string) => text.replace(/^(\s*[-*] \[)(x|X)(\] )/gm, '$1 $3');

function act(ws: Workspace, r: KitRule, x: Act, noteId: string, ev: RuleEvent | undefined, now: number, texts: string[], label = ruleLabel(r), day?: string): Workspace {
  const by = { by: label, now };
  const n = No.noteById(ws, noteId);
  if (!n) return ws;
  // V131 (K10c): bei Zeitplan-Regeln rechnen Termine und {heute} ab dem Tag der Wiederholung (auch beim Nachholen)
  const today = day ?? No.dayOf(now);
  const fill = (t: string, m: Note | undefined, at: number) => fillText(t, m, at, today);
  const boards = () => boardsFor(ws, r, noteId, ev);
  switch (x.k) {
    case 'toCol': {
      let out = ws;
      for (const v of boards()) {
        const col = (v.cols ?? []).find((c) => fold(c.name) === fold(x.a ?? ''));
        if (!col) continue;
        // V130: liegt schon dort (oben, wenn „oben“ gewünscht) – nichts tun
        if (col.ids.includes(noteId) && (x.b !== 'top' || col.ids[0] === noteId)) continue;
        const res = Sh.moveCard(out, v.id, noteId, col.id, x.b === 'top' ? 0 : undefined, by);
        if (res.ok) out = res.ws;
      }
      return out;
    }
    case 'nextCol': {
      let out = ws;
      for (const v of boards()) {
        const cols = v.cols ?? [];
        const i = cols.findIndex((c) => c.ids.includes(noteId));
        if (i < 0 || i >= cols.length - 1) continue;
        const res = Sh.moveCard(out, v.id, noteId, cols[i + 1].id, undefined, by);
        if (res.ok) out = res.ws;
      }
      return out;
    }
    case 'sortCol': {
      let out = ws;
      for (const v of boards()) {
        const col = (v.cols ?? []).find((c) => c.ids.includes(noteId));
        if (col) out = Sh.sortCol(out, v.id, col.id, (x.a ?? 'due') as Sh.ColSort);
      }
      return out;
    }
    case 'toBoard': {
      const from = boards()[0] ?? No.viewsWith(ws, noteId)[0];
      if (!from || !x.a || from.id === x.a || !No.viewById(ws, x.a)) return ws;
      const res = Sh.moveToSheet(ws, noteId, from.id, x.a, by);
      return res.ok ? res.ws : ws;
    }
    case 'copyBoard': {
      const from = boards()[0] ?? No.viewsWith(ws, noteId)[0];
      if (!from || !x.a || !No.viewById(ws, x.a)) return ws;
      return KM.copyCard(ws, noteId, from.id, { to: x.a, ...by })?.ws ?? ws;
    }
    case 'mirrorBoard': {
      if (!x.a) return ws;
      const res = Mi.mirrorCard(ws, noteId, x.a, { ...by, colState: Sh.colStateOf });
      return res.ok ? res.ws : ws;
    }
    case 'setDone':
      return n.state === 'done' || n.state === 'review' ? ws : Sh.syncBoards(No.setState(ws, noteId, 'done', by), noteId);
    case 'reopen':
      return !No.isFinished(n.state) && n.state !== 'review' ? ws : Sh.syncBoards(No.setState(ws, noteId, 'open', by), noteId);
    case 'archive':
      return n.state === 'archived' ? ws : KM.archiveCard(ws, noteId, by);
    case 'tagAdd': {
      const t = x.a?.trim();
      if (!t || (n.tags ?? []).some((y) => fold(y) === fold(t))) return ws;
      return No.updateNote(ws, noteId, { tags: [...(n.tags ?? []), t] }, by);
    }
    case 'tagDel': {
      const t = fold(x.a ?? '');
      const rest = (n.tags ?? []).filter((y) => fold(y) !== t);
      return rest.length === (n.tags ?? []).length ? ws : No.updateNote(ws, noteId, { tags: rest.length ? rest : undefined }, by);
    }
    case 'assign': {
      const who = x.a === 'me' ? Ps.meId(ws) : x.a;
      return !who || n.assignee === who || !Ps.personById(ws, who) ? ws : Ps.assign(ws, noteId, who, by);
    }
    case 'unassign':
      return n.assignee ? Ps.assign(ws, noteId, undefined, by) : ws;
    case 'dueSet': {
      const d = No.shiftDay(today, x.n ?? 0);
      return n.due === d ? ws : No.updateNote(ws, noteId, { due: d }, by);
    }
    case 'dueShift':
      return n.due && x.n ? No.updateNote(ws, noteId, { due: No.shiftDay(n.due, x.n) }, by) : ws;
    case 'dueDel':
      return n.due ? No.updateNote(ws, noteId, { due: undefined, dueTime: undefined }, by) : ws;
    case 'notBefore': {
      const d = No.shiftDay(today, x.n ?? 0);
      return n.notBefore === d ? ws : No.updateNote(ws, noteId, { notBefore: d }, by);
    }
    case 'checkAll': {
      const k = checksOf(n.text ?? '');
      return k.done === k.total ? ws : No.updateNote(ws, noteId, { text: checkAll(n.text) }, by);
    }
    case 'uncheckAll':
      return checksOf(n.text ?? '').done ? No.updateNote(ws, noteId, { text: uncheck(n.text) }, by) : ws;
    case 'comment': {
      const t = fill(x.a ?? '', n, now);
      return Cm.addComment(ws, noteId, t, { by: by.by, now })?.ws ?? ws;
    }
    case 'fieldSet':
    case 'fieldClear': {
      const d = defNamed(ws, r, noteId, x.a ?? '', ev);
      if (!d) return ws;
      return CFd.setFieldValue(ws, noteId, d, x.k === 'fieldClear' ? undefined : valueFor(d, fill(x.b ?? '', n, now)), by);
    }
    case 'titlePre':
    case 'titleSuf': {
      const t = fill(x.a ?? '', n, now);
      const cur = No.titleOf(n);
      if (!t.trim() || (x.k === 'titlePre' ? cur.startsWith(t) : cur.endsWith(t))) return ws;
      return Sh.renameTask(ws, noteId, x.k === 'titlePre' ? `${t}${cur}` : `${cur}${t}`, by);
    }
    case 'urgentSet':
      return n.urgent ? ws : No.updateNote(ws, noteId, { urgent: true }, by);
    case 'urgentDel':
      return n.urgent ? No.updateNote(ws, noteId, { urgent: undefined }, by) : ws;
    case 'notice': {
      const t = fill(x.a ?? '', n, now).trim();
      if (t) texts.push(t);
      return ws;
    }
    case 'fromTpl':
      return ws; // läuft in runActs (wechselt die Karte für die folgenden Aktionen)
  }
}

/** V131 (K10c): Zusatz für eine Folge von Aktionen – Tag der Wiederholung, feste Kennung, Zähler angelegter Karten. */
interface ActOpts {
  day?: string;
  /** Feste Kennung für „Karte aus Vorlage“ (B6: Regel + Termin). */
  idBase?: string;
  made?: { n: number; view?: string };
}

/**
 * „Karte aus Vorlage“ (B5): Kopie der Kartenvorlage auf dem Board der Karte (bzw. dem Board der Regel, sonst dem
 * Board der Vorlage) in der Spalte `b` (leer = erste). Gibt es die feste Kennung schon (zweites Gerät, Abgleich),
 * wird nichts angelegt.
 */
function fromTpl(ws: Workspace, r: KitRule, x: Act, cur: string | undefined, ev: RuleEvent | undefined, now: number, label: string, id?: string): { ws: Workspace; id: string; view: string } | null {
  const tpl = x.a ? No.noteById(ws, x.a) : undefined;
  if (!tpl?.template || tpl.state === 'archived') return null;
  if (id && No.noteById(ws, id)) return null;
  const home = kanbans(ws).find((v) => No.idsIn(v).includes(tpl.id));
  const viewId = ev?.view ?? (cur ? boardsFor(ws, r, cur, ev)[0]?.id : undefined) ?? r.board ?? home?.id ?? kanbans(ws)[0]?.id;
  const v = viewId ? No.viewById(ws, viewId) : undefined;
  if (!v || v.kind !== 'kanban' || !v.cols?.length) return null;
  const col = (x.b?.trim() && v.cols.find((c) => fold(c.name) === fold(x.b!))) || v.cols[0];
  const res = KM.cardFromTemplate(ws, tpl.id, v.id, col.id, { by: label, now, ...(id ? { id } : {}) });
  return res ? { ...res, view: v.id } : null;
}

/** Aktionen der Reihe nach; nach „Karte aus Vorlage“ gelten die folgenden für die neue Karte (wie Trello Butler). */
function runActs(ws: Workspace, r: KitRule, acts: readonly Act[], subject: string | undefined, ev: RuleEvent | undefined, now: number, texts: string[], label: string, o: ActOpts = {}): Workspace {
  let out = ws;
  let cur = subject;
  let curEv = ev;
  let k = 0;
  for (const x of acts) {
    if (x.k === 'fromTpl') {
      const id = o.idBase ? `${o.idBase}${k ? `~${k + 1}` : ''}` : undefined;
      k++;
      const res = fromTpl(out, r, x, cur, curEv, now, label, id);
      if (!res) {
        cur = undefined; // nichts angelegt (Vorlage fehlt oder schon da) – die folgenden Aktionen haben keine Karte
        continue;
      }
      out = res.ws;
      cur = res.id;
      curEv = { k: 'created', note: res.id, view: res.view };
      if (o.made) (o.made.n++, (o.made.view ??= res.view));
      continue;
    }
    if (cur) out = act(out, r, x, cur, curEv, now, texts, label, o.day);
  }
  return out;
}

/** Regel auf eine Karte anwenden, wenn ihre Bedingungen gelten. */
function runOn(ws: Workspace, r: KitRule, noteId: string, ev: RuleEvent | undefined, now: number, texts: string[], o: ActOpts = {}): Workspace {
  const n = No.noteById(ws, noteId);
  if (!n || n.template) return ws; // Kartenvorlagen (K1) bleiben unberührt
  if (!r.ifs.every((c) => holds(ws, r, c, n, ev, now))) return ws;
  return runActs(ws, r, r.then, noteId, ev, now, texts, ruleLabel(r), o);
}

const changedCards = (a: Workspace, b: Workspace) => {
  if (a.notes === b.notes && a.noteViews === b.noteViews) return 0;
  const old = new Map(No.notesOf(a).map((n) => [n.id, n]));
  const ids = new Set(No.notesOf(b).filter((n) => old.get(n.id) !== n).map((n) => n.id));
  for (const e of eventsOf(a, b)) ids.add(e.note);
  return ids.size;
};

// ---------------------------------------------------------------- Ketten

/**
 * Nach einer Änderung (`prev` → `next`): Regeln mit passendem Auslöser laufen, ihre Änderungen lösen höchstens
 * CHAIN_MAX Stufen weiter Regeln aus; jede Regel läuft dabei nur in einer Stufe. Rein bis auf den Bericht (`runOf`).
 */
export function applyRules(prev: Workspace, next: Workspace, now = Date.now()): Workspace {
  if (prev.notes === next.notes && prev.noteViews === next.noteViews) return next;
  const rules = kitOf(next).filter((r) => r.on && r.then.length && r.when.k !== 'check' && !isTimed(r.when.k));
  if (!rules.length) return next;
  return chain(next, eventsOf(prev, next), rules, now, next);
}

function chain(start: Workspace, first: RuleEvent[], rules: KitRule[], now: number, before: Workspace, names: string[] = [], texts: string[] = [], depth0 = 0): Workspace {
  const fired = new Set<string>();
  let out = start;
  let evs = first;
  let depth = depth0;
  let cut = false;
  const lead = first.find((e) => e.view) ?? first[0];
  for (let stage = 0; evs.length; stage++) {
    if (depth >= CHAIN_MAX) {
      cut = rules.some((r) => !fired.has(r.id) && evs.some((e) => triggers(out, r, e)));
      break;
    }
    const base = out;
    for (const r of rules) {
      if (fired.has(r.id)) continue;
      const hits = evs.filter((e) => triggers(base, r, e));
      if (!hits.length) continue;
      const was = out;
      const said = texts.length;
      for (const e of hits) out = runOn(out, r, e.note, e, now, texts);
      if (out !== was || texts.length > said) {
        fired.add(r.id);
        names.push(ruleLabel(r));
      }
    }
    if (out === base) break;
    depth++;
    evs = eventsOf(base, out);
  }
  if (!names.length) return out;
  RUNS.set(out, { before, names, cards: changedCards(before, out), view: lead?.view, note: lead?.note, texts, depth, ...(cut ? { cut: true as const } : {}) });
  return out;
}

/** Karten im Geltungsbereich einer Regel (Board bzw. alle Kanbans), ohne Vorlagen und Archiviertes. */
function cardsIn(ws: Workspace, r: KitRule): string[] {
  const views = r.board ? kanbans(ws).filter((v) => v.id === r.board) : kanbans(ws);
  const ids = [...new Set(views.flatMap((v) => No.idsIn(v)))];
  return ids.filter((id) => {
    const n = No.noteById(ws, id);
    return !!n && !n.template && n.state !== 'archived';
  });
}

/**
 * V131 (K10c, B5/B6): Regeln nach der Uhr. Zeitplan: ist seit dem letzten Lauf (`ruleSet.ran`) eine Wiederholung
 * fällig geworden, läuft die Regel einmal – auch wenn mehrere verpasst wurden (nur die letzte). Aktionen vor einer
 * „Karte aus Vorlage“ gelten für jede Karte im Geltungsbereich, auf die die Bedingungen passen; ab „Karte aus
 * Vorlage“ für die neue Karte (feste Kennung Regel~Termin). Fälligkeit: je Karte einmal je Termin „fällig“.
 */
function runTimed(ws: Workspace, now: number, names: string[], texts: string[], made: { n: number; late: number; view?: string }): Workspace {
  const rules = kitOf(ws).filter((r) => r.on && r.then.length && isTimed(r.when.k));
  if (!rules.length) return ws;
  const old = ruleSetOf(ws).ran ?? {};
  const ran = { ...old };
  const today = No.dayOf(now);
  let out = ws;
  for (const r of rules) {
    const was = out;
    const said = texts.length;
    if (isSchedule(r.when.k)) {
      const occ = RT.lastOccurrence(r.when, now);
      if (!occ) continue;
      const last = ran[r.id];
      if (last === undefined) {
        ran[r.id] = occ.stamp; // nie scharf gestellt (z. B. ältere Datei) – erst ab jetzt
        continue;
      }
      if (occ.stamp <= last) continue;
      ran[r.id] = occ.stamp;
      const k = r.then.findIndex((x) => x.k === 'fromTpl');
      const pre = k < 0 ? r.then : r.then.slice(0, k);
      if (pre.length) {
        for (const id of cardsIn(out, r)) {
          const n = No.noteById(out, id);
          if (n && r.ifs.every((c) => holds(out, r, c, n, undefined, now))) out = runActs(out, r, pre, id, undefined, now, texts, ruleLabel(r), { day: occ.day });
        }
      }
      if (k >= 0) {
        const before = made.n;
        out = runActs(out, r, r.then.slice(k), undefined, undefined, now, texts, ruleLabel(r), { day: occ.day, idBase: RT.recurId(r.id, occ.stamp), made });
        if (made.n > before && occ.day < today) made.late += made.n - before;
      }
    } else {
      const since = ran[r.id];
      if (since === undefined) {
        ran[r.id] = RT.stampAt(now);
        continue;
      }
      const from = RT.momentOfStamp(since);
      for (const id of cardsIn(out, r)) {
        const n = No.noteById(out, id);
        const at = n ? RT.dueMoment(r.when, n) : null;
        if (!n || at === null || at > now || at <= from) continue;
        const key = RT.ranKey(r.id, id);
        const ds = RT.dueStamp(n);
        if (ran[key] === ds) continue;
        ran[key] = ds;
        out = runOn(out, r, id, undefined, now, texts);
      }
    }
    if (out !== was || texts.length > said) names.push(ruleLabel(r));
  }
  return JSON.stringify(ran) === JSON.stringify(old) ? out : withRan(out, RT.pruneRan(out, ran));
}

/**
 * Regeln mit Auslöser „regelmäßig“ (beim Start und stündlich, z. B. W3, W4) über alle Karten im Geltungsbereich,
 * dazu (V131, K10c) Zeitplan- und Fälligkeits-Regeln; was sie ändern, darf weitere Regeln auslösen (Stufe 2 und 3).
 * Gibt den neuen Stand und den Bericht zurück. Ohne Bericht, aber mit neuem Stand: nur der Stand der Uhr-Regeln
 * (`ruleSet.ran`) hat sich geändert – speichern, nichts melden.
 */
export function runCheck(ws: Workspace, now = Date.now(), opts: { checks?: boolean; timed?: boolean } = {}): { ws: Workspace; run?: RuleRun } {
  const all = kitOf(ws).filter((r) => r.on && r.then.length);
  const checks = opts.checks === false ? [] : all.filter((r) => r.when.k === 'check');
  const names: string[] = [];
  const texts: string[] = [];
  const made = { n: 0, late: 0 } as { n: number; late: number; view?: string };
  let out = ws;
  for (const r of checks) {
    const was = out;
    const said = texts.length;
    const board = r.board ? No.viewById(out, r.board) : undefined;
    const scope = r.board ? (board ? No.idsIn(board) : []) : No.notesOf(out).map((n) => n.id);
    for (const id of scope) out = runOn(out, r, id, undefined, now, texts);
    if (out !== was || texts.length > said) names.push(ruleLabel(r));
  }
  if (opts.timed !== false) out = runTimed(out, now, names, texts, made);
  if (out === ws && !texts.length) return { ws };
  if (!names.length) return { ws: out };
  const rest = all.filter((r) => r.when.k !== 'check' && !isTimed(r.when.k));
  const end = rest.length ? chain(out, eventsOf(ws, out), rest, now, ws, names, texts, 1) : out;
  const base = RUNS.get(end) ?? { before: ws, names, cards: changedCards(ws, end), texts, depth: 1 };
  RUNS.set(end, { ...base, ...(made.n ? { made: made.n, late: made.late, view: made.view } : {}) });
  return { ws: end, run: RUNS.get(end) };
}

/** Meldung am Ort: ein Board, das den Lauf zeigt, nimmt ihn sich – sonst meldet App ihn unten (Flash). */
const CLAIMED = new WeakSet<RuleRun>();
export const claimRun = (r: RuleRun) => void CLAIMED.add(r);
export const isClaimed = (r: RuleRun) => CLAIMED.has(r);
/** Bericht an einen Folgestand weitergeben (der Reducer räumt nach den Regeln noch Fenster auf). */
export function carryRun(from: Workspace, to: Workspace): Workspace {
  const r = RUNS.get(from);
  if (r && to !== from) RUNS.set(to, r);
  return to;
}

// ---------------------------------------------------------------- K10b Knöpfe (V130)

/**
 * Knopf drücken (B7): die Aktionen des Knopfs laufen der Reihe nach auf jeder Karte in `ids` (auf dem Board `view`),
 * Spur „Knopf · Name“. Was sie ändern, darf Regeln auslösen (Stufe 2 und 3, wie bei „regelmäßig“). Der ganze Druck
 * samt Kette ist ein Rückgängig-Schritt (`runOf(ws).before`). Ändert der Knopf nichts, kommt `ws` unverändert zurück.
 */
export function pressButton(ws: Workspace, b: Pick<KitButton, 'id' | 'name' | 'then'>, ids: readonly string[], view: string, now = Date.now(), token?: string): Workspace {
  const pseudo: KitRule = { id: `btn-${b.id}`, no: 0, name: b.name, on: true, board: view, when: { k: 'check' }, ifs: [], then: b.then };
  const label = buttonLabel(b);
  const texts: string[] = [];
  let out = ws;
  for (const id of ids) {
    const n = No.noteById(out, id);
    if (!n || n.template) continue; // Kartenvorlagen (K1) bleiben unberührt
    const ev: RuleEvent = { k: 'check', note: id, view };
    out = runActs(out, pseudo, b.then, id, ev, now, texts, label);
  }
  if (out === ws && !texts.length) return ws;
  const names = [label];
  const rest = kitOf(out).filter((r) => r.on && r.then.length && r.when.k !== 'check' && !isTimed(r.when.k));
  const end = rest.length && out !== ws ? chain(out, eventsOf(ws, out), rest, now, ws, names, texts, 1) : out;
  const run: RuleRun = { ...(RUNS.get(end) ?? { before: ws, names, cards: changedCards(ws, end), texts, depth: 1 }), view, note: ids[0], ...(token ? { token } : {}) };
  if (end === ws) {
    // nur eine Meldung, keine Änderung: Stand bleibt, Bericht hängt an einer flachen Kopie
    const same = { ...ws };
    RUNS.set(same, { ...run, cards: 0 });
    return same;
  }
  RUNS.set(end, run);
  return end;
}
