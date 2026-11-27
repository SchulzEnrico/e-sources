/**
 * V141 (F-230 F7, entschieden V118 „danach CSV/Excel und iCal“): Projekt als Tabelle (CSV für Excel, Numbers,
 * Google Sheets und den CSV-Import von MS Project) und als Kalender (iCal .ics für Apple-, Google- und
 * Outlook-Kalender) – hin und zurück.
 *
 * CSV: Spalten wie MS Project „Tabelle: Eingabe“ (Nr., PSP-Code, Name, Dauer, Anfang, Ende, Vorgänger, Ressourcen …),
 * Semikolon und UTF-8 mit BOM, damit deutsches Excel die Datei direkt richtig öffnet; Datum TT.MM.JJJJ. Die letzte
 * Spalte „E-Sources-Id“ hilft beim Wiedereinlesen. Import erkennt deutsche und englische Spaltennamen (MS Project,
 * Excel), Trenner ; , oder Tab und legt – wie alle Importe (F4) – ein neues Projekt an.
 * iCal: ein Termin (ganztägig) je Vorgang, Meilensteine als Tagestermin; Import: jeder Termin wird ein Vorgang.
 * CSV und iCal tragen weniger als MSPDI – „ohne Verlust“ bleibt MSPDI bzw. Trello-JSON vorbehalten (Hinweis am Ort).
 */
import type { Note, NoteLink, NoteRel, Project, Workspace } from './types';
import { ganttOf, type GanttRow } from './gantt';
import { planCost, planHours } from './gpm';
import { progressOf } from './gpmCalc';
import { createNote, notesOf } from './notes';
import { addPerson, personById } from './persons';
import { addProject, projectById, projectsOf } from './projects';
import { addDays, workdaysBetween } from './schedule';

const fold = (s: string) => s.trim().toLocaleLowerCase('de');
const dmy = (d: string | undefined) => (d ? d.split('-').reverse().join('.') : '');
/** TT.MM.JJJJ, TT.MM.JJ, JJJJ-MM-TT, MM/TT/JJJJ (englisch), auch mit Wochentag oder Uhrzeit davor/dahinter. */
export function parseDay(s: string): string | undefined {
  const t = s.trim();
  let m = /(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /(\d{1,2})\.(\d{1,2})\.(\d{2,4})/.exec(t);
  if (m) return `${m[3].length === 2 ? `20${m[3]}` : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(t);
  if (m) return `${m[3].length === 2 ? `20${m[3]}` : m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  return undefined;
}
const num = (s: string | undefined): number | undefined => {
  if (!s) return undefined;
  const c = s.replace(/[^\d,.-]/g, '');
  if (!c) return undefined;
  // 1.234,5 (deutsch) bzw. 1,234.5 (englisch)
  const n = Number(/,\d{1,2}$/.test(c) || (c.includes(',') && !c.includes('.')) ? c.replace(/\./g, '').replace(',', '.') : c.replace(/,/g, ''));
  return Number.isFinite(n) ? n : undefined;
};

// ---------- Vorgänger wie MS Project: „3EA+2 Tage; 5AA“ ----------

const REL_EN: Record<string, NoteRel> = { FS: 'EA', SS: 'AA', FF: 'EE', SF: 'AE', EA: 'EA', AA: 'AA', EE: 'EE', AE: 'AE' };
export function predText(row: GanttRow): string {
  return row.preds
    .filter((p) => p.nr > 0)
    .map((p) => `${p.nr}${p.rel === 'EA' && !p.lag ? '' : p.rel}${p.lag ? `${p.lag > 0 ? '+' : ''}${p.lag} Tage` : ''}`)
    .join(';');
}
export function parsePreds(s: string): { nr: number; rel: NoteRel; lag: number }[] {
  const out: { nr: number; rel: NoteRel; lag: number }[] = [];
  for (const part of s.split(/[;,]/)) {
    const m = /^\s*(\d+)\s*([A-Za-z]{2})?\s*(?:([+-])\s*(\d+(?:[.,]\d+)?))?/.exec(part);
    if (!m) continue;
    const rel = REL_EN[(m[2] ?? 'EA').toUpperCase()] ?? 'EA';
    const lag = m[4] ? Math.round(Number(m[4].replace(',', '.'))) * (m[3] === '-' ? -1 : 1) : 0;
    out.push({ nr: Number(m[1]), rel, lag });
  }
  return out;
}

// ---------- CSV schreiben ----------

export const CSV_HEAD = ['Nr.', 'PSP-Code', 'Name', 'Gliederungsebene', 'Dauer', 'Anfang', 'Ende', 'Vorgänger', 'Ressourcennamen', 'Arbeit (h)', 'Kosten (€)', '% abgeschlossen', 'Meilenstein', 'Sammelvorgang', 'Fällig am', 'Notizen', 'E-Sources-Id'];

const cell = (v: string | number, sep: string) => {
  const s = String(v);
  return /["\r\n]/.test(s) || s.includes(sep) ? `"${s.replace(/"/g, '""')}"` : s;
};
const deNum = (n: number | undefined) => (n === undefined || !Number.isFinite(n) ? '' : String(Math.round(n * 100) / 100).replace('.', ','));

function namesOf(ws: Workspace, n: Note | undefined): string {
  if (!n) return '';
  const ids = n.use?.length ? n.use.map((u) => u.person) : n.assignee ? [n.assignee] : [];
  return ids.map((id) => personById(ws, id)?.name).filter(Boolean).join(';');
}

/** Projekt als CSV (Semikolon, UTF-8 mit BOM). */
export function exportCsv(ws: Workspace, pid: string, o: { today?: string; bom?: boolean } = {}): string {
  const p = projectById(ws, pid);
  if (!p) return '';
  const g = ganttOf(ws, pid, o.today);
  const notes = new Map(notesOf(ws).map((n) => [n.id, n]));
  const sep = ';';
  const lines = [CSV_HEAD.map((h) => cell(h, sep)).join(sep)];
  for (const r of g.rows) {
    const n = r.node.kind === 'task' ? notes.get(r.id) : undefined;
    const pc = n ? progressOf(ws, n) : undefined;
    lines.push(
      [
        r.nr,
        r.node.code,
        r.node.title,
        r.node.depth + 1,
        r.planned ? `${r.node.milestone ? 0 : r.days} Tage` : '',
        r.planned ? dmy(r.start) : '',
        r.planned ? dmy(r.end) : '',
        predText(r),
        namesOf(ws, n),
        n && !r.node.summary ? deNum(planHours(ws, n)) : '',
        n && !r.node.summary ? deNum(planCost(ws, n)) : '',
        pc === undefined ? '' : `${Math.round(pc)} %`,
        r.node.milestone ? 'Ja' : 'Nein',
        r.node.summary ? 'Ja' : 'Nein',
        dmy(n?.due),
        n?.text ?? '',
        r.id,
      ]
        .map((v) => cell(v, sep))
        .join(sep),
    );
  }
  return `${o.bom === false ? '' : '\uFEFF'}${lines.join('\r\n')}\r\n`;
}

// ---------- CSV lesen ----------

/** CSV in Zeilen und Zellen (Anführungszeichen, Zeilenumbrüche in Zellen); Trenner wird aus der Kopfzeile erkannt. */
export function parseCsv(text: string): string[][] {
  const t = text.replace(/^\uFEFF/, '');
  const head = t.split(/\r?\n/, 1)[0] ?? '';
  const count = (c: string) => head.split(c).length - 1;
  const sep = [';', '\t', ','].sort((a, b) => count(b) - count(a))[0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"' && t[i + 1] === '"') (cur += '"'), i++;
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === sep) row.push(cur), (cur = '');
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      row.push(cur);
      rows.push(row);
      row = [];
      cur = '';
    } else cur += c;
  }
  if (cur || row.length) row.push(cur), rows.push(row);
  return rows.filter((r) => r.some((x) => x.trim()));
}

/** Spalten: deutsche und englische Namen (MS Project, Excel, Trello-CSV, eigene Ausgabe). */
const COLS: Record<string, string[]> = {
  nr: ['nr.', 'nr', 'id', 'nummer'],
  code: ['psp-code', 'psp', 'wbs', 'psp code'],
  name: ['name', 'vorgangsname', 'task name', 'titel', 'title', 'aufgabe', 'vorgang', 'card name'],
  level: ['gliederungsebene', 'outline level', 'ebene', 'level'],
  duration: ['dauer', 'duration'],
  start: ['anfang', 'start', 'beginn', 'start date', 'startdatum'],
  end: ['ende', 'finish', 'end', 'end date', 'enddatum'],
  preds: ['vorgänger', 'predecessors'],
  res: ['ressourcennamen', 'resource names', 'ressourcen', 'zuständig', 'assigned to', 'members', 'mitglieder'],
  work: ['arbeit (h)', 'arbeit', 'work', 'aufwand'],
  cost: ['kosten (€)', 'kosten', 'cost'],
  pc: ['% abgeschlossen', '% complete', 'fortschritt', 'progress'],
  ms: ['meilenstein', 'milestone'],
  due: ['fällig am', 'stichtag', 'deadline', 'due date', 'due', 'fällig'],
  notes: ['notizen', 'notes', 'beschreibung', 'description', 'card description'],
  id: ['e-sources-id'],
};
const yes = (s: string | undefined) => !!s && /^(ja|yes|true|wahr|1|x)$/i.test(s.trim());

export type TableImport = { ok: true; ws: Workspace; project: string; tasks: number; links: number; persons: number; skipped: number };
export type TableResult = TableImport | { ok: false; error: 'empty' | 'noName' | 'full' | 'ics' };

function newProjectName(ws: Workspace, base: string): string {
  const taken = new Set(projectsOf(ws).map((p) => fold(p.name)));
  if (!taken.has(fold(base))) return base;
  let k = 1;
  let cand = `${base} (Import)`;
  while (taken.has(fold(cand))) cand = `${base} (Import ${++k})`;
  return cand;
}
const baseName = (file: string | undefined, fallback: string) => (file ?? '').replace(/\.(csv|tsv|txt|ics|ical)$/i, '').trim() || fallback;

interface TaskIn {
  title: string;
  text?: string;
  level: number;
  duration?: number;
  start?: string;
  end?: string;
  preds?: string;
  res?: string[];
  work?: number;
  cost?: number;
  pc?: number;
  milestone?: boolean;
  due?: string;
  nr?: number;
}

/** Vorgänge anlegen: Gliederung, Dauer, „nicht vor“ für Vorgänge ohne Vorgänger, Personen (gleiche Namen = dieselbe Person, F5). */
function build(ws0: Workspace, name: string, tasks: TaskIn[], now: number): TableResult {
  if (!tasks.length) return { ok: false, error: 'empty' };
  const before = (ws0.persons ?? []).length;
  const pr = addProject(ws0, name, {}, now);
  if (!pr) return { ok: false, error: 'full' };
  let ws = pr.ws;
  const pid = pr.id;
  const stack: string[] = [];
  const order: Record<string, string[]> = {};
  const idByNr = new Map<number, string>();
  const ids: string[] = [];
  const starts = tasks.map((t) => t.start).filter((d): d is string => !!d).sort();
  const pStart = starts[0];
  tasks.forEach((t, i) => {
    const level = Math.max(1, Math.min(10, t.level || 1));
    stack.length = Math.min(stack.length, level - 1);
    const parent = stack[level - 2];
    const isSum = (tasks[i + 1]?.level ?? 0) > level;
    let use: { person: string; hours?: number }[] = [];
    for (const r of t.res ?? []) {
      const a = addPerson(ws, r.replace(/\[[^\]]*\]$/, '').trim(), 'person');
      if (!a) continue;
      ws = a.ws;
      if (!use.some((u) => u.person === a.id)) use.push({ person: a.id });
    }
    if (isSum) use = [];
    if (use.length && t.work) use = use.map((u) => ({ ...u, hours: Math.round((t.work! / use.length) * 100) / 100 }));
    const dur = t.duration ?? (t.start && t.end ? workdaysBetween(t.start, t.end) : undefined);
    const ms = t.milestone || (dur === 0 && !isSum);
    const hasPreds = !!t.preds && parsePreds(t.preds).length > 0;
    const r = createNote(
      ws,
      {
        title: t.title.slice(0, 200) || 'Vorgang',
        text: t.text ?? '',
        project: pid,
        ...(parent ? { parent } : {}),
        ...(ms ? { milestone: true } : isSum ? {} : { duration: Math.max(1, dur ?? 1) }),
        ...(!isSum && !hasPreds && t.start && t.start !== pStart ? { notBefore: t.start } : {}),
        ...(t.due ? { due: t.due } : {}),
        ...(!isSum && t.work !== undefined && !use.length ? { effort: { plan: t.work } } : {}),
        ...(!isSum && t.cost ? { cost: { plan: t.cost } } : {}),
        ...(use.length ? { use, assignee: use[0].person } : {}),
        ...(!isSum && t.pc !== undefined ? { wp: { progress: Math.max(0, Math.min(100, t.pc)) }, ...(t.pc >= 100 ? { state: 'done' as const } : t.pc > 0 ? { state: 'doing' as const } : {}) } : {}),
      },
      { now, via: 'import' },
    );
    ws = r.ws;
    ids.push(r.id);
    idByNr.set(t.nr ?? i + 1, r.id);
    stack[level - 1] = r.id;
    (order[parent ?? ''] ??= []).push(r.id);
  });
  let links = 0;
  const after = new Map<string, NoteLink[]>();
  tasks.forEach((t, i) => {
    if (!t.preds) return;
    const list: NoteLink[] = [];
    for (const p of parsePreds(t.preds)) {
      const from = idByNr.get(p.nr);
      if (!from || from === ids[i]) continue;
      list.push({ id: from, rel: p.rel, ...(p.lag ? { lag: p.lag } : {}) });
      links++;
    }
    if (list.length) after.set(ids[i], list);
  });
  ws = {
    ...ws,
    notes: (ws.notes ?? []).map((n) => (after.has(n.id) ? { ...n, after: after.get(n.id)! } : n)),
    projects: (ws.projects ?? []).map((p): Project => (p.id === pid ? { ...p, order, ...(pStart ? { start: pStart } : {}) } : p)),
  };
  return { ok: true, ws, project: pid, tasks: ids.length, links, persons: (ws.persons ?? []).length - before, skipped: 0 };
}

/** CSV als neues Projekt (F4). Ohne Spalte „Name“ geht es nicht. */
export function importCsv(ws: Workspace, text: string, o: { name?: string; now?: number } = {}): TableResult {
  const rows = parseCsv(text);
  if (rows.length < 2) return { ok: false, error: 'empty' };
  const head = rows[0].map((h) => fold(h.replace(/^\uFEFF/, '')));
  const at = (k: string) => head.findIndex((h) => COLS[k].includes(h));
  const ix = Object.fromEntries(Object.keys(COLS).map((k) => [k, at(k)])) as Record<string, number>;
  if (ix.name < 0) return { ok: false, error: 'noName' };
  const get = (r: string[], k: string) => (ix[k] >= 0 ? (r[ix[k]] ?? '').trim() : '');
  let skipped = 0;
  const tasks: TaskIn[] = [];
  for (const r of rows.slice(1)) {
    const title = get(r, 'name');
    if (!title) {
      skipped++;
      continue;
    }
    const code = get(r, 'code');
    const lvl = num(get(r, 'level')) ?? (code ? code.split('.').filter(Boolean).length - (/^[A-Za-z]/.test(code) ? 1 : 0) : 1);
    const dur = get(r, 'duration');
    tasks.push({
      title,
      text: get(r, 'notes'),
      level: Math.max(1, Math.round(lvl)),
      ...(dur ? { duration: Math.round((num(dur) ?? 0) * (/woch|wk|week/i.test(dur) ? 5 : /std|hr|hour|\bh\b/i.test(dur) ? 1 / 8 : 1)) } : {}),
      start: parseDay(get(r, 'start')),
      end: parseDay(get(r, 'end')),
      preds: get(r, 'preds'),
      res: get(r, 'res').split(/[;,]/).map((x) => x.trim()).filter(Boolean),
      work: num(get(r, 'work')),
      cost: num(get(r, 'cost')),
      pc: num(get(r, 'pc')),
      milestone: yes(get(r, 'ms')),
      due: parseDay(get(r, 'due')),
      ...(num(get(r, 'nr')) !== undefined ? { nr: num(get(r, 'nr')) } : {}),
    });
  }
  const out = build(ws, newProjectName(ws, o.name ? baseName(o.name, 'CSV-Import') : 'CSV-Import'), tasks, o.now ?? Date.now());
  return out.ok ? { ...out, skipped } : out;
}

// ---------- iCal ----------

const icsEsc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const icsUnesc = (s: string) => s.replace(/\\n/gi, '\n').replace(/\\([;,\\])/g, '$1');
const icsDay = (d: string) => d.replace(/-/g, '');
/** Zeilen höchstens 75 Zeichen (RFC 5545), Fortsetzung mit Leerzeichen. */
function fold75(line: string): string {
  const out: string[] = [];
  let s = line;
  while (s.length > 74) out.push(s.slice(0, 74)), (s = ` ${s.slice(74)}`);
  out.push(s);
  return out.join('\r\n');
}
const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** Projekt als Kalender: ein ganztägiger Termin je Vorgang (Sammelvorgänge nur mit `withSummary`). */
export function exportIcs(ws: Workspace, pid: string, o: { today?: string; now?: number; generator?: string; withSummary?: boolean } = {}): string {
  const p = projectById(ws, pid);
  if (!p) return '';
  const g = ganttOf(ws, pid, o.today);
  const notes = new Map(notesOf(ws).map((n) => [n.id, n]));
  const now = stamp(o.now ?? Date.now());
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//E-Sources//${o.generator ?? 'E-Sources'}//DE`, 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${icsEsc(p.name)}`];
  for (const r of g.rows) {
    if (!r.planned || (r.node.summary && !o.withSummary)) continue;
    const n = notes.get(r.id);
    const desc = [r.node.code, n?.text?.trim(), predText(r) ? `Vorgänger: ${predText(r)}` : ''].filter(Boolean).join('\n');
    L.push(
      'BEGIN:VEVENT',
      `UID:${r.id}@e-sources`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${icsDay(r.start)}`,
      `DTEND;VALUE=DATE:${icsDay(addDays(r.end, 1))}`,
      `SUMMARY:${icsEsc(`${r.node.milestone ? '◆ ' : ''}${r.node.title}`)}`,
      ...(desc ? [`DESCRIPTION:${icsEsc(desc)}`] : []),
      `CATEGORIES:${icsEsc(p.name)}`,
      ...(r.node.done ? ['STATUS:CONFIRMED', 'X-E-SOURCES-DONE:1'] : []),
      ...(r.node.milestone ? ['X-E-SOURCES-MILESTONE:1'] : []),
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  }
  L.push('END:VCALENDAR');
  return `${L.map(fold75).join('\r\n')}\r\n`;
}

/** Erkennt eine iCal-Datei am Inhalt. */
export const isIcs = (text: string) => /^\uFEFF?BEGIN:VCALENDAR/i.test(text.trim());

/** iCal als neues Projekt: jeder Termin (VEVENT, auch VTODO mit Datum) wird ein Vorgang, nach Beginn sortiert. */
export function importIcs(ws: Workspace, text: string, o: { name?: string; now?: number } = {}): TableResult {
  if (!isIcs(text)) return { ok: false, error: 'ics' };
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  const items: { start?: string; end?: string; title: string; text: string; ms: boolean; allDay: boolean }[] = [];
  let cur: Record<string, string> | null = null;
  let calName = '';
  for (const l of lines) {
    const i = l.indexOf(':');
    if (i < 0) continue;
    const key = l.slice(0, i).split(';')[0].toUpperCase();
    const val = l.slice(i + 1);
    if (key === 'BEGIN' && /VEVENT|VTODO/i.test(val)) cur = {};
    else if (key === 'END' && /VEVENT|VTODO/i.test(val) && cur) {
      const start = parseIcsDay(cur.DTSTART);
      const allDay = /^\d{8}$/.test((cur.DTSTART ?? '').trim());
      let end = parseIcsDay(cur.DTEND ?? cur.DUE);
      // ganztägig: DTEND ist der Tag danach
      if (end && allDay && start && end > start) end = addDays(end, -1);
      items.push({ start, end: end ?? start, title: icsUnesc(cur.SUMMARY ?? '').replace(/^◆\s*/, '').trim(), text: icsUnesc(cur.DESCRIPTION ?? ''), ms: cur['X-E-SOURCES-MILESTONE'] === '1' || /^◆/.test(cur.SUMMARY ?? ''), allDay });
      cur = null;
    } else if (cur) cur[key] = val;
    else if (key === 'X-WR-CALNAME') calName = icsUnesc(val).trim();
  }
  const list = items.filter((x) => x.title && x.start).sort((a, b) => (a.start! < b.start! ? -1 : a.start! > b.start! ? 1 : 0));
  if (!list.length) return { ok: false, error: 'empty' };
  const tasks: TaskIn[] = list.map((x) => ({ title: x.title, text: x.text, level: 1, start: x.start, end: x.end, milestone: x.ms, ...(x.ms ? { duration: 0 } : {}) }));
  const out = build(ws, newProjectName(ws, calName || baseName(o.name, 'Kalender-Import')), tasks, o.now ?? Date.now());
  return out.ok ? { ...out, skipped: items.length - list.length } : out;
}
function parseIcsDay(v: string | undefined): string | undefined {
  const m = /(\d{4})(\d{2})(\d{2})/.exec(v ?? '');
  return m ? `${m[1]}-${m[2]}-${m[3]}` : undefined;
}
