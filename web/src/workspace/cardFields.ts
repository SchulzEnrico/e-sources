/**
 * V125 (F-231 K8): Eigene Felder je Board und Abstimmen – wie Trello „Custom Fields“ und „Voting“.
 *
 * Felder gehören dem Board (`NoteView.fields`, höchstens FIELD_MAX wie bei Trello): Text, Zahl, Datum, Auswahl
 * (mit Wahlen und Farbe) oder Häkchen; wahlweise vorn auf der Karte (`onCard`). Die Werte liegen an der Notiz
 * (`Note.fields`, Feld-Id → Wert). Felder sind sortier- und filterbar (Spalte sortieren, Tabelle, Kartenfilter).
 * Abstimmen schaltet je Board ein (`NoteView.votes`); jede Person hat eine Stimme je Karte (`Note.votes`),
 * Spalten lassen sich nach Stimmen sortieren. Reine Funktionen.
 */
import type { CardFieldDef, CardFieldOption, CardFieldType, CardFieldValue, Note, NoteView, Workspace } from './types';
import * as No from './notes';
import { COVER_COLORS } from './covers';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);

export const FIELD_TYPES: readonly CardFieldType[] = ['text', 'number', 'date', 'list', 'check'];
/** wie Trello: höchstens 50 eigene Felder je Board, 50 Wahlen je Auswahl-Feld */
export const FIELD_MAX = 50;
export const OPTION_MAX = 50;
export const FIELD_NAME_MAX = 60;
export const FIELD_TEXT_MAX = 2000;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[A-Za-z0-9_-]{1,80}$/;

const newFieldId = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const nameOf = (s: unknown) => (typeof s === 'string' ? s.trim().slice(0, FIELD_NAME_MAX) : '');

// ---------- Prüfen beim Laden ----------

/** Felder eines Boards prüfen: bekannte Arten, eindeutige Ids, Wahlen nur bei Auswahl. */
export function cleanFieldDefs(raw: unknown): CardFieldDef[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const ids = new Set<string>();
  const out: CardFieldDef[] = [];
  for (const r of raw) {
    if (!isObj(r) || typeof r.id !== 'string' || !ID.test(r.id) || ids.has(r.id) || !FIELD_TYPES.includes(r.type as CardFieldType)) continue;
    const name = nameOf(r.name);
    if (!name) continue;
    ids.add(r.id);
    const d: CardFieldDef = { id: r.id, name, type: r.type as CardFieldType };
    if (d.type === 'list') {
      const oIds = new Set<string>();
      d.options = (Array.isArray(r.options) ? r.options : [])
        .filter((o): o is Obj => isObj(o) && typeof o.id === 'string' && ID.test(o.id) && !oIds.has(o.id) && !!nameOf(o.name) && !!oIds.add(o.id))
        .slice(0, OPTION_MAX)
        .map((o) => ({ id: o.id as string, name: nameOf(o.name), ...(COVER_COLORS.includes(o.color as string) ? { color: o.color as string } : {}) }));
    }
    if (r.onCard === true) d.onCard = true;
    out.push(d);
    if (out.length >= FIELD_MAX) break;
  }
  return out.length ? out : undefined;
}

/** Ein Wert passend zur Art – oder undefined (leer). Zahlen auch mit Komma („1,5“). */
export function cleanValue(def: Pick<CardFieldDef, 'type' | 'options'>, v: unknown): CardFieldValue | undefined {
  if (def.type === 'check') return v === true ? true : undefined;
  if (def.type === 'number') {
    const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v.trim().replace(/\s/g, '').replace(',', '.')) : NaN;
    return Number.isFinite(n) ? n : undefined;
  }
  if (typeof v !== 'string') return undefined;
  if (def.type === 'date') return DAY.test(v) ? v : undefined;
  if (def.type === 'list') return def.options?.some((o) => o.id === v) ? v : undefined;
  const t = v.trim().slice(0, FIELD_TEXT_MAX);
  return t || undefined;
}

/** Werte an einer Notiz prüfen (beim Laden: nur die Form – welche Felder es gibt, weiß erst das Board). */
export function cleanFieldValues(raw: unknown): Record<string, CardFieldValue> | undefined {
  if (!isObj(raw)) return undefined;
  const out: Record<string, CardFieldValue> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!ID.test(k)) continue;
    if (v === true || (typeof v === 'number' && Number.isFinite(v))) out[k] = v;
    else if (typeof v === 'string' && v.trim()) out[k] = v.slice(0, FIELD_TEXT_MAX);
  }
  return Object.keys(out).length ? out : undefined;
}

/** Stimmen prüfen: Ids ohne Doppelte. */
export function cleanVotes(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = [...new Set(raw.filter((x): x is string => typeof x === 'string' && !!x))];
  return out.length ? out : undefined;
}

// ---------- Felder des Boards ----------

export const fieldsOf = (v: Pick<NoteView, 'fields'> | undefined): CardFieldDef[] => v?.fields ?? [];
export const fieldById = (v: Pick<NoteView, 'fields'> | undefined, id: string): CardFieldDef | undefined => fieldsOf(v).find((f) => f.id === id);

function withFields(ws: Workspace, viewId: string, fn: (list: CardFieldDef[]) => CardFieldDef[]): Workspace {
  return {
    ...ws,
    noteViews: No.viewsOf(ws).map((v) => {
      if (v.id !== viewId) return v;
      const next = fn(fieldsOf(v));
      const { fields: _f, ...rest } = v;
      void _f;
      return next.length ? { ...rest, fields: next } : rest;
    }),
  };
}

/** Feld anlegen (Ende der Liste); null bei leerem Namen, unbekannter Art oder voller Liste. */
export function addField(ws: Workspace, viewId: string, name: string, type: CardFieldType, o: { id?: string; onCard?: boolean } = {}): { ws: Workspace; id: string } | null {
  const v = No.viewById(ws, viewId);
  const nm = nameOf(name);
  if (!v || !nm || !FIELD_TYPES.includes(type) || fieldsOf(v).length >= FIELD_MAX) return null;
  const id = o.id ?? newFieldId('cf');
  const def: CardFieldDef = { id, name: nm, type, ...(type === 'list' ? { options: [] } : {}), ...(o.onCard ? { onCard: true as const } : {}) };
  return { ws: withFields(ws, viewId, (l) => [...l, def]), id };
}

/** Name ändern bzw. „auf der Karte zeigen“ umschalten (die Art bleibt – wie bei Trello). */
export function updateField(ws: Workspace, viewId: string, fieldId: string, patch: { name?: string; onCard?: boolean }): Workspace {
  return withFields(ws, viewId, (l) =>
    l.map((f) => {
      if (f.id !== fieldId) return f;
      const out: CardFieldDef = { ...f };
      if (patch.name !== undefined && nameOf(patch.name)) out.name = nameOf(patch.name);
      if (patch.onCard === true) out.onCard = true;
      if (patch.onCard === false) delete out.onCard;
      return out;
    }),
  );
}

/** Feld um eine Stelle verschieben (−1 = nach oben). */
export function moveField(ws: Workspace, viewId: string, fieldId: string, dir: -1 | 1): Workspace {
  return withFields(ws, viewId, (l) => {
    const i = l.findIndex((f) => f.id === fieldId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= l.length) return l;
    const out = [...l];
    [out[i], out[j]] = [out[j], out[i]];
    return out;
  });
}

/** Werte eines Felds an allen Notizen entfernen bzw. umschreiben (ohne Spur – das ist eine Board-Änderung). */
function mapValues(ws: Workspace, fieldId: string, fn: (v: CardFieldValue) => CardFieldValue | undefined): { ws: Workspace; notes: number } {
  let count = 0;
  const notes = No.notesOf(ws).map((n) => {
    if (!n.fields || !(fieldId in n.fields)) return n;
    const next = fn(n.fields[fieldId]);
    if (next === n.fields[fieldId]) return n;
    count++;
    const f = { ...n.fields };
    if (next === undefined) delete f[fieldId];
    else f[fieldId] = next;
    const { fields: _f, ...rest } = n;
    void _f;
    return Object.keys(f).length ? { ...rest, fields: f } : rest;
  });
  return { ws: count ? { ...ws, notes } : ws, notes: count };
}

/** Feld löschen – mit seinen Werten an den Karten (wie Trello). */
export function removeField(ws: Workspace, viewId: string, fieldId: string): { ws: Workspace; notes: number } {
  if (!fieldById(No.viewById(ws, viewId), fieldId)) return { ws, notes: 0 };
  const r = mapValues(withFields(ws, viewId, (l) => l.filter((f) => f.id !== fieldId)), fieldId, () => undefined);
  return r;
}

/** Wahl eines Auswahl-Felds anlegen. */
export function addOption(ws: Workspace, viewId: string, fieldId: string, name: string, color?: string, o: { id?: string } = {}): { ws: Workspace; id: string } | null {
  const f = fieldById(No.viewById(ws, viewId), fieldId);
  const nm = nameOf(name);
  if (!f || f.type !== 'list' || !nm || (f.options?.length ?? 0) >= OPTION_MAX) return null;
  const id = o.id ?? newFieldId('co');
  const opt: CardFieldOption = { id, name: nm, ...(color && COVER_COLORS.includes(color) ? { color } : {}) };
  return { ws: withFields(ws, viewId, (l) => l.map((x) => (x.id === fieldId ? { ...x, options: [...(x.options ?? []), opt] } : x))), id };
}

/** Wahl umbenennen bzw. färben (`color: null` = ohne Farbe). */
export function updateOption(ws: Workspace, viewId: string, fieldId: string, optId: string, patch: { name?: string; color?: string | null }): Workspace {
  return withFields(ws, viewId, (l) =>
    l.map((x) =>
      x.id !== fieldId
        ? x
        : {
            ...x,
            options: (x.options ?? []).map((o) => {
              if (o.id !== optId) return o;
              const out: CardFieldOption = { ...o };
              if (patch.name !== undefined && nameOf(patch.name)) out.name = nameOf(patch.name);
              if (patch.color === null) delete out.color;
              else if (patch.color && COVER_COLORS.includes(patch.color)) out.color = patch.color;
              return out;
            }),
          },
    ),
  );
}

/** Wahl verschieben (−1 = nach oben). */
export function moveOption(ws: Workspace, viewId: string, fieldId: string, optId: string, dir: -1 | 1): Workspace {
  return withFields(ws, viewId, (l) =>
    l.map((x) => {
      if (x.id !== fieldId || !x.options) return x;
      const i = x.options.findIndex((o) => o.id === optId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= x.options.length) return x;
      const o = [...x.options];
      [o[i], o[j]] = [o[j], o[i]];
      return { ...x, options: o };
    }),
  );
}

/** Wahl löschen; Karten mit dieser Wahl werden leer. */
export function removeOption(ws: Workspace, viewId: string, fieldId: string, optId: string): { ws: Workspace; notes: number } {
  const next = withFields(ws, viewId, (l) => l.map((x) => (x.id === fieldId ? { ...x, options: (x.options ?? []).filter((o) => o.id !== optId) } : x)));
  return mapValues(next, fieldId, (v) => (v === optId ? undefined : v));
}

// ---------- Werte an der Karte ----------

/** Wert setzen bzw. leeren (undefined); passt er nicht zur Art, bleibt alles, wie es ist. Spur „bearbeitet“. */
export function setFieldValue(ws: Workspace, noteId: string, def: CardFieldDef, value: unknown, act: { by?: string; now?: number } = {}): Workspace {
  const n = No.noteById(ws, noteId);
  if (!n) return ws;
  const v = value === undefined || value === '' || value === false ? undefined : cleanValue(def, value);
  if (v === undefined && value !== undefined && value !== '' && value !== false) return ws;
  const cur = n.fields?.[def.id];
  if (cur === v) return ws;
  const f = { ...(n.fields ?? {}) };
  if (v === undefined) delete f[def.id];
  else f[def.id] = v;
  return No.updateNote(ws, noteId, { fields: Object.keys(f).length ? f : undefined }, act);
}

const dmy = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`;
const numText = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 6 });

/** Wert als Text (Karte, Tabelle, Ansagen); '' = leer. */
export function valueText(def: CardFieldDef, v: CardFieldValue | undefined, yes = 'ja'): string {
  if (v === undefined) return '';
  if (def.type === 'check') return v === true ? yes : '';
  if (def.type === 'number') return typeof v === 'number' ? numText(v) : '';
  if (def.type === 'date') return typeof v === 'string' && DAY.test(v) ? dmy(v) : '';
  if (def.type === 'list') return def.options?.find((o) => o.id === v)?.name ?? '';
  return typeof v === 'string' ? v : '';
}

/** Felder, die vorn auf der Karte stehen (nur mit Wert, in der Reihenfolge des Boards). */
export function cardFront(v: Pick<NoteView, 'fields'> | undefined, n: Pick<Note, 'fields'>): { def: CardFieldDef; text: string; color?: string }[] {
  const out: { def: CardFieldDef; text: string; color?: string }[] = [];
  for (const def of fieldsOf(v)) {
    if (!def.onCard) continue;
    const val = n.fields?.[def.id];
    const text = valueText(def, val);
    if (!text) continue;
    const color = def.type === 'list' ? def.options?.find((o) => o.id === val)?.color : undefined;
    out.push({ def, text, ...(color ? { color } : {}) });
  }
  return out;
}

/** Schlüssel zum Sortieren: Zahl, Datum, Text, Platz der Wahl, Häkchen (angehakt zuerst); null = leer (hinten). */
export function sortKey(def: CardFieldDef, v: CardFieldValue | undefined): string | number | null {
  if (v === undefined) return null;
  if (def.type === 'number') return typeof v === 'number' ? v : null;
  if (def.type === 'list') {
    const i = def.options?.findIndex((o) => o.id === v) ?? -1;
    return i < 0 ? null : i;
  }
  if (def.type === 'check') return v === true ? 0 : null;
  return typeof v === 'string' ? v.toLocaleLowerCase('de') : null;
}

/** Notizen nach einem Feld ordnen (Leeres hinten, Gleiches behält die Reihenfolge). */
export function sortByField<T extends Pick<Note, 'fields'>>(list: readonly T[], def: CardFieldDef, desc = false): T[] {
  const ix = list.map((n, i) => ({ n, i, k: sortKey(def, n.fields?.[def.id]) }));
  ix.sort((a, b) => {
    if (a.k === null && b.k === null) return a.i - b.i;
    if (a.k === null) return 1;
    if (b.k === null) return -1;
    const c = typeof a.k === 'number' && typeof b.k === 'number' ? a.k - b.k : String(a.k).localeCompare(String(b.k), 'de');
    return (desc ? -c : c) || a.i - b.i;
  });
  return ix.map((x) => x.n);
}

// ---------- Filter ----------

/**
 * Merkmal im Kartenfilter: `Feld-Id=Wert`. Wert `*` = ausgefüllt, leer = leer, sonst die Id der Wahl
 * (Auswahl) bzw. `1` (Häkchen angehakt).
 */
export const fieldToken = (fieldId: string, val: string) => `${fieldId}=${val}`;
export function fieldHit(n: Pick<Note, 'fields'>, token: string): boolean {
  const k = token.indexOf('=');
  if (k < 1) return false;
  const id = token.slice(0, k);
  const want = token.slice(k + 1);
  const v = n.fields?.[id];
  if (want === '') return v === undefined;
  if (want === '*') return v !== undefined;
  if (want === '1') return v === true;
  return v === want;
}
/** Merkmale, die ein Feld im Filter anbietet. */
export function filterChoices(def: CardFieldDef): { val: string; label?: string; color?: string; kind: 'opt' | 'set' | 'empty' | 'on' }[] {
  if (def.type === 'list') return [...(def.options ?? []).map((o) => ({ val: o.id, label: o.name, ...(o.color ? { color: o.color } : {}), kind: 'opt' as const })), { val: '', kind: 'empty' }];
  if (def.type === 'check') return [{ val: '1', kind: 'on' }, { val: '', kind: 'empty' }];
  return [{ val: '*', kind: 'set' }, { val: '', kind: 'empty' }];
}

// ---------- Abstimmen ----------

export const votesOf = (n: Pick<Note, 'votes'>): string[] => n.votes ?? [];
export const hasVoted = (n: Pick<Note, 'votes'>, personId: string): boolean => votesOf(n).includes(personId);

/** Stimme abgeben bzw. zurückziehen (ohne Spur-Eintrag – Trello führt Stimmen auch nicht im Verlauf). */
export function toggleVote(ws: Workspace, noteId: string, personId: string, now = Date.now()): Workspace {
  const n = No.noteById(ws, noteId);
  if (!n || !personId) return ws;
  const list = hasVoted(n, personId) ? votesOf(n).filter((x) => x !== personId) : [...votesOf(n), personId];
  return {
    ...ws,
    notes: No.notesOf(ws).map((x) => {
      if (x.id !== noteId) return x;
      const { votes: _v, ...rest } = x;
      void _v;
      return { ...rest, ...(list.length ? { votes: list } : {}), changed: now };
    }),
  };
}

/** Abstimmen im Board an- bzw. ausschalten (die Stimmen an den Karten bleiben). */
export function setBoardVotes(ws: Workspace, viewId: string, on: boolean): Workspace {
  return {
    ...ws,
    noteViews: No.viewsOf(ws).map((v) => {
      if (v.id !== viewId) return v;
      const { votes: _v, ...rest } = v;
      void _v;
      return on ? { ...rest, votes: true as const } : rest;
    }),
  };
}

/** Notizen nach Stimmen ordnen (meiste zuerst; Gleiches behält die Reihenfolge). */
export function sortByVotes<T extends Pick<Note, 'votes'>>(list: readonly T[]): T[] {
  return list
    .map((n, i) => ({ n, i }))
    .sort((a, b) => votesOf(b.n).length - votesOf(a.n).length || a.i - b.i)
    .map((x) => x.n);
}

// ---------- Trello (F-230) ----------

const TRELLO_TYPE: Record<string, CardFieldType> = { text: 'text', number: 'number', date: 'date', list: 'list', checkbox: 'check' };
const toTrelloType = (t: CardFieldType) => (t === 'check' ? 'checkbox' : t);
const localDay = (iso: string): string | undefined => {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return DAY.test(iso.slice(0, 10)) ? iso.slice(0, 10) : undefined;
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const str = (v: unknown) => (typeof v === 'string' ? v : '');
const sortPos = (a: Obj, b: Obj) => (typeof a.pos === 'number' ? a.pos : 0) - (typeof b.pos === 'number' ? b.pos : 0);

/** Trello `customFields` des Boards → eigene Felder (Ids `tf-…`, Wahlen `to-…`, damit der Export sie wiederfindet). */
export function fieldsFromTrello(raw: unknown): CardFieldDef[] {
  if (!Array.isArray(raw)) return [];
  const out = (raw.filter(isObj) as Obj[])
    .slice()
    .sort(sortPos)
    .filter((f) => TRELLO_TYPE[str(f.type)] && str(f.id))
    .map((f) => {
      const type = TRELLO_TYPE[str(f.type)];
      const def: Obj = { id: `tf-${str(f.id)}`, name: nameOf(f.name) || 'Feld', type };
      if (type === 'list')
        def.options = (Array.isArray(f.options) ? (f.options.filter(isObj) as Obj[]) : [])
          .slice()
          .sort(sortPos)
          .map((o) => ({ id: `to-${str(o.id)}`, name: nameOf(isObj(o.value) ? o.value.text : '') || '–', ...(COVER_COLORS.includes(str(o.color)) ? { color: str(o.color) } : {}) }));
      if (isObj(f.display) && f.display.cardFront === true) def.onCard = true;
      return def;
    });
  return cleanFieldDefs(out) ?? [];
}

/** Wert eines rohen Trello-Eintrags für ein Feld; `optOf` = Trello-Id der Wahl → eigene Id. */
function itemValue(def: CardFieldDef, it: Obj, optOf: (trelloId: string) => string): CardFieldValue | undefined {
  const val = isObj(it.value) ? it.value : {};
  if (def.type === 'list') return it.idValue ? cleanValue(def, optOf(str(it.idValue))) : undefined;
  if (def.type === 'check') return val.checked === 'true' || val.checked === true ? true : undefined;
  if (def.type === 'number') return cleanValue(def, typeof val.number === 'number' ? val.number : str(val.number));
  if (def.type === 'date') return cleanValue(def, localDay(str(val.date)));
  return cleanValue(def, str(val.text));
}

/** Trello `customFieldItems` einer Karte → Werte (nur Felder, die das Board kennt). */
export function valuesFromTrello(items: unknown, defs: readonly CardFieldDef[]): Record<string, CardFieldValue> | undefined {
  if (!Array.isArray(items)) return undefined;
  const out: Record<string, CardFieldValue> = {};
  for (const it of items.filter(isObj) as Obj[]) {
    const def = defs.find((d) => d.id === `tf-${str(it.idCustomField)}`);
    if (!def) continue;
    const v = itemValue(def, it, (t) => `to-${t}`);
    if (v !== undefined) out[def.id] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Trello-Id eines eigenen Felds bzw. einer Wahl (aus dem Import) oder eine neue. */
const tid = (id: string, pre: string, make: () => string) => (id.startsWith(pre) ? id.slice(pre.length) : make());

/**
 * Eigene Felder → Trello `customFields`. Rohe Felder aus dem Import behalten ihre übrigen Angaben (pos, fieldGroup …).
 * `ids` merkt sich die Zuordnung eigene Id → Trello-Id für die Karten.
 */
export function fieldsToTrello(defs: readonly CardFieldDef[], raw: unknown, boardId: string, make: () => string): { list: Obj[]; ids: Map<string, string> } {
  const rawList = Array.isArray(raw) ? (raw.filter(isObj) as Obj[]) : [];
  const ids = new Map<string, string>();
  let last = 0;
  const list = defs.map((d) => {
    const id = tid(d.id, 'tf-', make);
    ids.set(d.id, id);
    const r = rawList.find((x) => str(x.id) === id) ?? {};
    const pos = typeof r.pos === 'number' && r.pos > last ? r.pos : last + 16384;
    last = pos;
    const out: Obj = { ...r, id, idModel: boardId, modelType: 'board', name: d.name, type: toTrelloType(d.type), pos, display: { ...(isObj(r.display) ? r.display : {}), cardFront: !!d.onCard } };
    if (d.type === 'list') {
      const ro = Array.isArray(r.options) ? (r.options.filter(isObj) as Obj[]) : [];
      let lp = 0;
      out.options = (d.options ?? []).map((o) => {
        const oid = tid(o.id, 'to-', make);
        ids.set(o.id, oid);
        const x = ro.find((y) => str(y.id) === oid) ?? {};
        const p = typeof x.pos === 'number' && x.pos > lp ? x.pos : lp + 16384;
        lp = p;
        return { ...x, id: oid, idCustomField: id, value: { ...(isObj(x.value) ? x.value : {}), text: o.name }, color: o.color ?? 'none', pos: p };
      });
    } else delete out.options;
    return out;
  });
  return { list, ids };
}

/**
 * Werte einer Karte → Trello `customFieldItems`. Rohe Einträge bleiben, wenn der Wert gleich ist (Ids, Uhrzeit am
 * Datum); Einträge zu Feldern, die das Board nicht kennt, gehen unverändert zurück.
 */
export function itemsToTrello(n: Pick<Note, 'fields'>, defs: readonly CardFieldDef[], raw: unknown, cardId: string, ids: Map<string, string>, make: () => string): Obj[] {
  const rawList = Array.isArray(raw) ? (raw.filter(isObj) as Obj[]) : [];
  const known = new Set(defs.map((d) => ids.get(d.id)));
  const out: Obj[] = rawList.filter((x) => !known.has(str(x.idCustomField)));
  const back = new Map([...ids].map(([ours, theirs]) => [theirs, ours]));
  for (const d of defs) {
    const v = n.fields?.[d.id];
    if (v === undefined) continue;
    const fid = ids.get(d.id)!;
    const r = rawList.find((x) => str(x.idCustomField) === fid);
    if (r && itemValue(d, r, (t) => back.get(t) ?? '') === v) {
      out.push(r);
      continue;
    }
    const base: Obj = { id: str(r?.id) || make(), idCustomField: fid, idModel: cardId, modelType: 'card' };
    if (d.type === 'list') out.push({ ...base, idValue: ids.get(String(v)) ?? null });
    else if (d.type === 'check') out.push({ ...base, value: { checked: 'true' } });
    else if (d.type === 'number') out.push({ ...base, value: { number: String(v) } });
    else if (d.type === 'date') out.push({ ...base, value: { date: `${v}T12:00:00.000Z` } });
    else out.push({ ...base, value: { text: String(v) } });
  }
  return out;
}
