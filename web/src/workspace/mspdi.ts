/**
 * F-230 (V118, Option C, Bauplan 2–3): Austausch mit MS Project, iTaskX und anderen Planern über MSPDI-XML
 * (Microsoft Project XML). Ein Projekt (Projekt-Desk, PD10) ↔ eine Datei.
 *
 * Export: Projekt, Kalender mit freien Tagen, Vorgänge mit Gliederung (WBS), Termine aus dem Gantt, Dauer, Aufwand,
 * Kosten, Fortschritt, manuelle Planung, „Anfang nicht früher als“, Stichtag, Notizen, Vorgänger mit Art und Abstand,
 * Basisplan 0, Personen (Kapazität, Stundensatz), Zuordnungen.
 * Import: dasselbe zurück in ein neues Projekt (F4); alles, was E-Sources nicht kennt, bleibt als Fremddaten am
 * Projekt, Vorgang bzw. an der Person und geht beim nächsten Export an seinem Platz zurück („ohne Verlust“).
 * Ein unveränderter Kalender wird im Original zurückgeschrieben (`calSig`).
 * Reine Funktionen; Tests in mspdi.test.ts.
 */
import type { ForeignBag, ForeignEl, Note, NoteLink, NoteRel, Person, Project, WorkCalendar, Workspace } from './types';
import { ganttOf, type GanttRow } from './gantt';
import { planCost, planHours } from './gpm';
import { progressOf } from './gpmCalc';
import { createNote, notesOf } from './notes';
import { addPerson, personById } from './persons';
import { initialsOf } from './profile';
import { addProject, projectById, projectsOf } from './projects';
import { calendarFor, FREE_MAX, offBetween, withCalendar } from './calendar';
import { child, kids, local, parseXml, val, type XNode } from './xmlLite';

export const MSPDI_NS = 'http://schemas.microsoft.com/project';
const DAY_START = '08:00:00';
const DAY_END = '17:00:00';
/** Art der Anordnungsbeziehung: E-Sources (DIN 69900) → MSPDI (0 EE/FF, 1 EA/FS, 2 AE/SF, 3 AA/SS). */
export const REL_TO_MSPDI = { EE: 0, EA: 1, AE: 2, AA: 3 } as const;
const MSPDI_TO_REL: NoteRel[] = ['EE', 'EA', 'AE', 'AA'];

// ---------------------------------------------------------------- Reihenfolge laut Schema (MS Project 2010+)

const PROJECT_ORDER = 'SaveVersion UID GUID Name Title Subject Category Company Manager Author CreationDate Revision LastSaved ScheduleFromStart StartDate FinishDate FYStartDate CriticalSlackLimit CurrencyDigits CurrencySymbol CurrencyCode CurrencySymbolPosition CalendarUID DefaultStartTime DefaultFinishTime MinutesPerDay MinutesPerWeek DaysPerMonth DefaultTaskType DefaultFixedCostAccrual DefaultStandardRate DefaultOvertimeRate DurationFormat WorkFormat EditableActualCosts HonorConstraints EarnedValueMethod InsertedProjectsLikeSummary MultipleCriticalPaths NewTasksEffortDriven NewTasksEstimated SplitsInProgressTasks SpreadActualCost SpreadPercentComplete TaskUpdatesResource FiscalYearStart WeekStartDay MoveCompletedEndsBack MoveRemainingStartsBack MoveRemainingStartsForward MoveCompletedEndsForward BaselineForEarnedValue AutoAddNewResourcesAndTasks StatusDate CurrentDate MicrosoftProjectServerURL Autolink NewTaskStartDate NewTasksAreManual DefaultTaskEVMethod ProjectExternallyEdited ExtendedCreationDate ActualsInSync RemoveFileProperties AdminProject UpdateManuallyScheduledTasksWhenEditingLinks KeepTaskOnNearestWorkingTimeWhenMadeAutoScheduled OutlineCodes WBSMasks ExtendedAttributes Calendars Tasks Resources Assignments'.split(' ');
const TASK_ORDER = 'UID GUID ID Name Active Manual Type IsNull CreateDate Contact WBS WBSLevel OutlineNumber OutlineLevel Priority Start Finish Duration ManualStart ManualFinish ManualDuration DurationFormat Work Stop Resume ResumeValid EffortDriven Recurring OverAllocated Estimated Milestone Summary DisplayAsSummary Critical IsSubproject IsSubprojectReadOnly SubprojectName ExternalTask ExternalTaskProject EarlyStart EarlyFinish LateStart LateFinish StartVariance FinishVariance WorkVariance FreeSlack TotalSlack StartSlack FinishSlack FixedCost FixedCostAccrual PercentComplete PercentWorkComplete Cost OvertimeCost OvertimeWork ActualStart ActualFinish ActualDuration ActualCost ActualOvertimeCost ActualWork ActualOvertimeWork RegularWork RemainingDuration RemainingCost RemainingWork RemainingOvertimeCost RemainingOvertimeWork ACWP CV ConstraintType CalendarUID ConstraintDate Deadline LevelAssignments LevelingCanSplit LevelingDelay LevelingDelayFormat PreLeveledStart PreLeveledFinish Hyperlink HyperlinkAddress HyperlinkSubAddress IgnoreResourceCalendar Notes HideBar Rollup BCWS BCWP PhysicalPercentComplete EarnedValueMethod PredecessorLink ActualWorkProtected ActualOvertimeWorkProtected ExtendedAttribute Baseline OutlineCode IsPublished StatusManager CommitmentStart CommitmentFinish CommitmentType TimephasedData'.split(' ');
const RESOURCE_ORDER = 'UID GUID ID Name Type IsNull Initials Phonetics NTAccount MaterialLabel Code Group WorkGroup EmailAddress Hyperlink HyperlinkAddress HyperlinkSubAddress MaxUnits PeakUnits OverAllocated AvailableFrom AvailableTo Start Finish CanLevel AccrueAt Work RegularWork OvertimeWork ActualWork RemainingWork ActualOvertimeWork RemainingOvertimeWork PercentWorkComplete StandardRate StandardRateFormat Cost OvertimeRate OvertimeRateFormat OvertimeCost CostPerUse ActualCost ActualOvertimeCost RemainingCost RemainingOvertimeCost WorkVariance CostVariance SV CV ACWP CalendarUID Notes BCWS BCWP IsGeneric IsInactive IsEnterprise BookingType ActualWorkProtected ActualOvertimeWorkProtected ActiveDirectoryGUID CreationDate ExtendedAttribute Baseline OutlineCode IsCostResource AssnOwner AssnOwnerGuid IsBudget AvailabilityPeriods Rates TimephasedData'.split(' ');
const ASSIGN_ORDER = 'UID GUID TaskUID ResourceUID PercentWorkComplete ActualCost ActualFinish ActualOvertimeCost ActualOvertimeWork ActualStart ActualWork ACWP Confirmed Cost CostRateTable RateScale CostVariance CV Delay Finish FinishVariance Hyperlink HyperlinkAddress HyperlinkSubAddress WorkVariance HasFixedRateUnits FixedMaterial LevelingDelay LevelingDelayFormat LinkedFields Milestone Notes Overallocated OvertimeCost OvertimeWork PeakUnits RegularWork RemainingCost RemainingOvertimeCost RemainingOvertimeWork RemainingWork ResponsePending Start Stop Resume StartVariance Summary SV Units UpdateNeeded VAC Work WorkContour BCWS BCWP BookingType ActualWorkProtected ActualOvertimeWorkProtected CreationDate AssnOwner AssnOwnerGuid BudgetCost BudgetWork ExtendedAttribute Baseline TimephasedData'.split(' ');

/** Elemente, die mehrfach vorkommen dürfen – mitgeführte bleiben neben den eigenen stehen. */
const MULTI = new Set(['PredecessorLink', 'ExtendedAttribute', 'Baseline', 'OutlineCode', 'TimephasedData']);

/** Was E-Sources je Ebene selbst liest und schreibt (alles andere wird beim Import mitgeführt). */
const OWN_PROJECT = new Set(['Name', 'Title', 'Company', 'StartDate', 'FinishDate', 'Calendars', 'Tasks', 'Resources', 'Assignments']);
const OWN_TASK = new Set(['UID', 'ID', 'Name', 'OutlineNumber', 'OutlineLevel', 'Summary', 'Milestone', 'Start', 'Finish', 'Duration', 'Work', 'ActualWork', 'Cost', 'FixedCost', 'ActualCost', 'PercentComplete', 'Manual', 'ManualStart', 'ManualFinish', 'ManualDuration', 'ConstraintType', 'ConstraintDate', 'Deadline', 'Notes', 'Critical']);
const OWN_RESOURCE = new Set(['UID', 'ID', 'Name', 'MaxUnits', 'StandardRate']);
const OWN_ASSIGN = new Set(['UID', 'TaskUID', 'ResourceUID', 'Units', 'Work', 'Start', 'Finish']);

// ---------------------------------------------------------------- Bausteine

const x = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
/** Ein Element: Name, XML; `weak` = nur, wenn die Datei es nicht schon mitbringt (Vorgaben wie MinutesPerDay). */
type El = { n: string; x: string; weak?: boolean };
const el = (n: string, v: string | number | boolean | undefined, weak = false): El[] =>
  v === undefined || v === '' ? [] : [{ n, x: `<${n}>${typeof v === 'boolean' ? (v ? 1 : 0) : typeof v === 'number' ? v : x(v)}</${n}>`, ...(weak ? { weak } : {}) }];
const raw = (n: string, xml: string, weak = false): El => ({ n, x: xml, ...(weak ? { weak } : {}) });
/** Dauer bzw. Arbeit als ISO-8601-Zeitspanne in Stunden (MSPDI-Schreibweise „PT16H0M0S“). */
export const ptHours = (h: number): string => {
  const total = Math.max(0, Math.round(h * 60));
  return `PT${Math.floor(total / 60)}H${total % 60}M0S`;
};
/** „PT16H30M0S“ → 16,5 Stunden; Tage und Sekunden auch („P1DT2H“). */
export const hoursOf = (pt: string): number => {
  const t = pt.trim();
  const m = /^-?P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(t);
  if (!m) return 0;
  return (Number(m[1] ?? 0) * 24 + Number(m[2] ?? 0) + Number(m[3] ?? 0) / 60 + Number(m[4] ?? 0) / 3600) * (t.startsWith('-') ? -1 : 1);
};
const money = (v: number | undefined) => (v === undefined ? undefined : Math.round(v * 100) / 100);
const dayOf = (s: string): string | undefined => (/^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : undefined);
const fold = (s: string) => s.trim().toLocaleLowerCase('de');

/** Eigene und mitgeführte Elemente zusammenlegen, in Schema-Reihenfolge. */
export function mergeEls(own: El[], foreign: ForeignEl[] | undefined, order: string[]): string {
  const ownNames = new Set(own.filter((e) => !e.weak).map((e) => e.n));
  const fNames = new Set((foreign ?? []).map((f) => f.n));
  const list: { n: string; x: string; after?: string; i: number }[] = [];
  let k = 0;
  for (const e of own) if (!e.weak || !fNames.has(e.n)) list.push({ n: e.n, x: e.x, i: k++ });
  for (const f of foreign ?? []) if (MULTI.has(f.n) || !ownNames.has(f.n)) list.push({ n: f.n, x: f.x, after: f.after, i: k++ });
  const pos = (e: { n: string; after?: string }): number => {
    const p = order.indexOf(e.n);
    if (p >= 0) return p;
    // unbekannter Name: hinter das Element, hinter dem es in der Datei stand
    const a = e.after ? order.indexOf(e.after) : -1;
    return a >= 0 ? a + 0.5 : order.length;
  };
  return list
    .sort((a, b) => pos(a) - pos(b) || a.i - b.i)
    .map((e) => e.x)
    .join('');
}

// ---------------------------------------------------------------- Export

export interface MspdiOptions {
  /** Stichtag für den Gantt (JJJJ-MM-TT), sonst heute */
  today?: string;
  /** Anwendung und Version – als Kommentar am Anfang */
  generator?: string;
}

interface TaskOut {
  uid: number;
  row: GanttRow;
  note?: Note;
  level: number;
  outline: string;
}

/** Kennung eines Kalenders, wie E-Sources ihn versteht – gleich wie beim Import = unverändert. */
export const calSigOf = (c: WorkCalendar | undefined): string => JSON.stringify({ region: c?.region ?? null, free: (c?.free ?? []).map((f) => f.day) });

/** Projekt `pid` als MSPDI-XML; '' wenn es das Projekt nicht gibt. */
export function exportMspdi(ws: Workspace, pid: string, o: MspdiOptions = {}): string {
  if (!projectById(ws, pid)) return '';
  return withCalendar(calendarFor(ws, pid), () => exportCalc(ws, pid, o));
}

function exportCalc(ws: Workspace, pid: string, o: MspdiOptions): string {
  const p = projectById(ws, pid)!;
  const g = ganttOf(ws, pid, o.today);
  const notes = new Map(notesOf(ws).map((n) => [n.id, n]));
  const pf = p.foreign;
  const fVal = (name: string) => {
    const f = pf?.mspdi?.find((e) => e.n === name);
    return f ? /^<[^>]+>([\s\S]*)<\/[^>]+>$/.exec(f.x)?.[1]?.trim() : undefined;
  };
  // Stunden je Arbeitstag wie in der Datei (Vorgabe 8)
  const mpd = Number(fVal('MinutesPerDay')) || 480;
  const hpd = mpd / 60;
  // Kalender: seit dem Import unverändert → Original zurück; sonst Standardkalender mit unseren freien Tagen
  const origCal = pf?.calSig !== undefined && pf.calSig === calSigOf(calendarFor(ws, pid)) ? pf.mspdi?.find((e) => e.n === 'Calendars') : undefined;
  const calUid = Number(fVal('CalendarUID')) || 1;
  /** ohne Originalkalender verweisen fremde CalendarUIDs ins Leere – dann weglassen */
  const fx = (els: ForeignEl[] | undefined) => (origCal ? els : els?.filter((e) => e.n !== 'CalendarUID'));
  const pfx = origCal ? pf?.mspdi : pf?.mspdi?.filter((e) => e.n !== 'Calendars');

  const tasks: TaskOut[] = [];
  const counters: number[] = [];
  g.rows.forEach((row, i) => {
    const level = row.node.depth + 1;
    counters.length = level;
    counters[level - 1] = (counters[level - 1] ?? 0) + 1;
    for (let k = 0; k < level - 1; k++) counters[k] = counters[k] ?? 1;
    tasks.push({ uid: i + 1, row, note: row.node.kind === 'task' ? notes.get(row.id) : undefined, level, outline: counters.join('.') });
  });
  const uidOf = new Map(tasks.map((t) => [t.row.id, t.uid]));

  const resIds: string[] = [];
  const addRes = (id: string | undefined) => id && personById(ws, id) && !resIds.includes(id) && resIds.push(id);
  for (const t of tasks) {
    if (!t.note) continue;
    if (t.note.use?.length) t.note.use.forEach((u) => addRes(u.person));
    else addRes(t.note.assignee);
  }
  const resUid = new Map(resIds.map((id, i) => [id, i + 1]));

  const start = p.start ?? g.start;
  const finish = g.end || p.end || start;
  const anchor = g.anchor || start || '';

  // Tasks – UID 0 ist die Projektsammelzeile
  const taskXml: string[] = [];
  const sum: El[] = [
    ...el('UID', 0),
    ...el('ID', 0),
    ...el('Name', p.name),
    ...el('Type', 1, true),
    ...el('IsNull', false, true),
    ...el('OutlineNumber', '0'),
    ...el('OutlineLevel', 0),
    ...el('Summary', true),
    ...(start ? el('Start', `${start}T${DAY_START}`) : []),
    ...(finish ? el('Finish', `${finish}T${DAY_END}`) : []),
    ...(p.brief?.goal ? el('Notes', p.brief.goal) : []),
  ];
  if (p.baseline && (p.baseline.start || p.baseline.end)) {
    sum.push(raw('Baseline', `<Baseline><Number>0</Number>${p.baseline.start ? `<Start>${p.baseline.start}T${DAY_START}</Start>` : ''}${p.baseline.end ? `<Finish>${p.baseline.end}T${DAY_END}</Finish>` : ''}${p.baseline.budget !== undefined ? `<Cost>${money(p.baseline.budget)}</Cost>` : ''}</Baseline>`));
  }
  taskXml.push(`<Task>${mergeEls(sum, fx(pf?.summary), TASK_ORDER)}</Task>`);
  for (const t of tasks) taskXml.push(`<Task>${mergeEls(taskEls(ws, p, t, uidOf, anchor, hpd), fx(t.note?.foreign?.mspdi), TASK_ORDER)}</Task>`);

  // Resources
  const resXml = resIds.map((id) => {
    const r = personById(ws, id)!;
    const units = r.capacity ? Math.round((r.capacity / (hpd * 5)) * 100) / 100 : 1;
    const own: El[] = [
      ...el('UID', resUid.get(id)!),
      ...el('ID', resUid.get(id)!),
      ...el('Name', r.name),
      ...el('Type', 1, true),
      ...el('IsNull', false, true),
      ...el('Initials', initialsOf(r.name), true),
      ...el('MaxUnits', units),
      ...(r.rate ? [...el('StandardRate', r.rate), ...el('StandardRateFormat', 2, true)] : []),
      ...el('CalendarUID', calUid, true),
    ];
    return `<Resource>${mergeEls(own, fx(r.foreign?.mspdi), RESOURCE_ORDER)}</Resource>`;
  });

  // Assignments
  const asgXml: string[] = [];
  let aUid = 1;
  for (const t of tasks) {
    const n = t.note;
    if (!n || t.row.node.summary) continue;
    const days = Math.max(1, t.row.days);
    const list: { person: string; hours?: number }[] = n.use?.length ? n.use : n.assignee ? [{ person: n.assignee, hours: planHours(ws, n) }] : [];
    for (const u of list) {
      const r = resUid.get(u.person);
      if (!r) continue;
      const h = u.hours ?? 0;
      const units = h > 0 && !n.milestone ? Math.round((h / (days * hpd)) * 100) / 100 : 1;
      const own: El[] = [
        ...el('UID', aUid++),
        ...el('TaskUID', t.uid),
        ...el('ResourceUID', r),
        ...el('Units', units),
        ...(h ? el('Work', ptHours(h)) : []),
        ...el('Start', `${t.row.start}T${DAY_START}`),
        ...el('Finish', `${t.row.end}T${DAY_END}`),
      ];
      asgXml.push(`<Assignment>${mergeEls(own, n.foreign?.assign?.[u.person], ASSIGN_ORDER)}</Assignment>`);
    }
  }

  const projEls: El[] = [
    ...el('SaveVersion', 14, true),
    ...el('Name', `${p.name}.xml`, true),
    ...el('Title', p.name),
    ...(p.charter?.client ? el('Company', p.charter.client) : []),
    ...el('ScheduleFromStart', true, true),
    ...(start ? el('StartDate', `${start}T${DAY_START}`) : []),
    ...(finish ? el('FinishDate', `${finish}T${DAY_END}`) : []),
    ...el('CurrencyDigits', 2, true),
    ...el('CurrencySymbol', '€', true),
    ...el('CurrencyCode', 'EUR', true),
    ...el('CalendarUID', calUid, true),
    ...el('DefaultStartTime', DAY_START, true),
    ...el('DefaultFinishTime', DAY_END, true),
    ...el('MinutesPerDay', mpd, true),
    ...el('MinutesPerWeek', mpd * 5, true),
    ...el('DaysPerMonth', 20, true),
    ...el('DurationFormat', 7, true),
    ...el('WorkFormat', 2, true),
    ...el('NewTasksAreManual', false, true),
    raw('Calendars', origCal ? origCal.x : calendarXml(calUid, start, finish)),
    raw('Tasks', `<Tasks>${taskXml.join('')}</Tasks>`),
    raw('Resources', `<Resources>${resXml.join('')}</Resources>`),
    raw('Assignments', `<Assignments>${asgXml.join('')}</Assignments>`),
  ];
  const head = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>', ...(o.generator ? [`<!-- ${x(o.generator)} -->`] : [])];
  return `${head.join('\n')}\n<Project xmlns="${MSPDI_NS}">${mergeEls(projEls, pfx, PROJECT_ORDER)}</Project>\n`;
}

function taskEls(ws: Workspace, p: Project, t: TaskOut, uidOf: Map<string, number>, anchor: string, hpd: number): El[] {
  const { row, note: n } = t;
  const isMs = !!row.node.milestone;
  const out: El[] = [...el('UID', t.uid), ...el('ID', t.uid), ...el('Name', row.node.title), ...el('Type', 0, true), ...el('IsNull', false, true)];
  out.push(...el('WBS', row.node.code, true), ...el('OutlineNumber', t.outline), ...el('OutlineLevel', t.level));
  out.push(...el('Summary', row.node.summary || row.node.kind === 'project'), ...el('Milestone', isMs));
  if (row.planned) {
    // Meilenstein nach einem Vorgänger liegt am Ende von dessen letztem Tag (17 Uhr), sonst am Morgen
    const msAt = isMs && row.preds.length ? `${row.end}T${DAY_END}` : `${row.start}T${DAY_START}`;
    out.push(...el('Start', isMs ? msAt : `${row.start}T${DAY_START}`), ...el('Finish', isMs ? msAt : `${row.end}T${DAY_END}`));
    out.push(...el('Duration', ptHours(isMs ? 0 : row.days * hpd)), ...el('DurationFormat', 7, true));
  }
  if (n) {
    const h = planHours(ws, n);
    if (h !== undefined) out.push(...el('Work', ptHours(h)));
    if (n.effort?.actual !== undefined) out.push(...el('ActualWork', ptHours(n.effort.actual)));
    const c = planCost(ws, n);
    if (c !== undefined) out.push(...el('Cost', money(c)));
    if (n.cost?.plan !== undefined && !n.use?.length) out.push(...el('FixedCost', money(n.cost.plan)));
    if (n.cost?.actual !== undefined) out.push(...el('ActualCost', money(n.cost.actual)));
    if (!row.node.summary) out.push(...el('PercentComplete', progressOf(ws, n)));
    if (row.manual) out.push(...el('Manual', true), ...el('ManualStart', `${row.start}T${DAY_START}`), ...el('ManualFinish', `${row.end}T${DAY_END}`), ...el('ManualDuration', ptHours(row.days * hpd)));
    // „nicht vor“ = Anfang nicht früher als (MS Project: ConstraintType 4)
    else if (n.notBefore && n.notBefore > anchor) out.push(...el('ConstraintType', 4), ...el('ConstraintDate', `${n.notBefore}T${DAY_START}`));
    // V121 (F-231 K5): Uhrzeit an „fällig“ reist als Uhrzeit der Deadline
    if (n.due) out.push(...el('Deadline', `${n.due}T${n.dueTime ? `${n.dueTime}:00` : DAY_END}`));
    const text = n.text?.trim();
    if (text) out.push(...el('Notes', text));
    const link = n.sources?.find((s) => s.url);
    if (link) out.push(...el('Hyperlink', link.title), ...el('HyperlinkAddress', link.url));
  }
  out.push(...el('Critical', row.critical));
  for (const pr of row.preds) {
    const from = uidOf.get(pr.id);
    if (!from) continue;
    out.push(raw('PredecessorLink', `<PredecessorLink><PredecessorUID>${from}</PredecessorUID><Type>${REL_TO_MSPDI[pr.rel]}</Type><CrossProject>0</CrossProject><LinkLag>${Math.round(pr.lag * hpd * 600)}</LinkLag><LagFormat>7</LagFormat></PredecessorLink>`));
  }
  const b = row.node.kind === 'task' ? p.baseline?.tasks[row.id] : undefined;
  if (b && (b.start || b.end)) {
    out.push(
      raw(
        'Baseline',
        `<Baseline><Number>0</Number>${b.start ? `<Start>${b.start}T${DAY_START}</Start>` : ''}${b.end ? `<Finish>${b.end}T${DAY_END}</Finish>` : ''}${b.duration !== undefined ? `<Duration>${ptHours(b.duration * hpd)}</Duration><DurationFormat>7</DurationFormat>` : ''}${b.effort !== undefined ? `<Work>${ptHours(b.effort)}</Work>` : ''}${b.cost !== undefined ? `<Cost>${money(b.cost)}</Cost>` : ''}</Baseline>`,
      ),
    );
  }
  return out;
}

/** Standardkalender Mo–Fr 8–12, 13–17 Uhr; freie Werktage (Feiertage, eigene) als Ausnahmen im Projektzeitraum ± 1 Jahr. */
function calendarXml(uid: number, start: string | undefined, finish: string | undefined): string {
  const work = '<WorkingTimes><WorkingTime><FromTime>08:00:00</FromTime><ToTime>12:00:00</ToTime></WorkingTime><WorkingTime><FromTime>13:00:00</FromTime><ToTime>17:00:00</ToTime></WorkingTime></WorkingTimes>';
  const days: string[] = [];
  for (let d = 1; d <= 7; d++) {
    const working = d >= 2 && d <= 6; // 1 = Sonntag
    days.push(`<WeekDay><DayType>${d}</DayType><DayWorking>${working ? 1 : 0}</DayWorking>${working ? work : ''}</WeekDay>`);
  }
  if (start && finish) {
    const lo = `${Number(start.slice(0, 4)) - 1}${start.slice(4)}`;
    const hi = `${Number(finish.slice(0, 4)) + 1}${finish.slice(4)}`;
    for (const f of offBetween(lo, hi)) days.push(`<WeekDay><DayType>0</DayType><DayWorking>0</DayWorking><TimePeriod><FromDate>${f.day}T00:00:00</FromDate><ToDate>${f.day}T23:59:00</ToDate></TimePeriod></WeekDay>`);
  }
  return `<Calendars><Calendar><UID>${uid}</UID><Name>Standard</Name><IsBaseCalendar>1</IsBaseCalendar><BaseCalendarUID>-1</BaseCalendarUID><WeekDays>${days.join('')}</WeekDays></Calendar></Calendars>`;
}

// ---------------------------------------------------------------- Import

export interface MspdiImport {
  ok: true;
  ws: Workspace;
  project: string;
  /** Zahlen für die Meldung am Ort */
  tasks: number;
  persons: number;
  merged: string[];
  links: number;
  /** mitgeführte Elemente (Projekt, Vorgänge, Personen, Zuordnungen) */
  kept: number;
  /** Hinweise, z. B. `calTooMany:140` (mehr freie Tage, als E-Sources fasst – der Originalkalender bleibt trotzdem erhalten) */
  notes: string[];
}
export type MspdiResult = MspdiImport | { ok: false; error: 'xml' | 'notMspdi' | 'empty' | 'full'; detail?: string };

const resourcesOf = (root: XNode): XNode[] => kids(child(root, 'Resources'), 'Resource').filter((r) => val(r, 'Name') && val(r, 'IsNull') !== '1' && val(r, 'UID') !== '0');

/** Personen der Datei, die es dem Namen nach schon gibt (F5: „… gibt es schon – zusammenführen?“). */
export function mspdiNameClashes(ws: Workspace, xml: string): string[] {
  let root: XNode;
  try {
    root = parseXml(xml);
  } catch {
    return [];
  }
  const have = new Set((ws.persons ?? []).map((p) => fold(p.name)));
  return resourcesOf(root)
    .map((r) => val(r, 'Name'))
    .filter((n) => n && have.has(fold(n)));
}

/** Kinder, die E-Sources nicht selbst liest, roh mit Namen und Vorgänger-Namen. */
const foreignOf = (node: XNode, own: Set<string>, skip?: (c: XNode) => boolean): ForeignEl[] => {
  const out: ForeignEl[] = [];
  let prev: string | undefined;
  for (const c of node.children) {
    const n = local(c.name);
    if (!own.has(n) && !(skip && skip(c))) out.push({ n, x: c.raw, ...(prev ? { after: prev } : {}) });
    prev = n;
  }
  return out;
};

/**
 * MSPDI-Datei als neues Projekt mit allem, was dazugehört (F4). `merge`: Namen von Personen, die mit vorhandenen
 * zusammengeführt werden (F5); die anderen kommen als „Name (Import)“ dazu. `name`: Dateiname für die Herkunft.
 */
export function importMspdi(ws: Workspace, xml: string, o: { merge?: string[]; name?: string; now?: number } = {}): MspdiResult {
  let root: XNode;
  try {
    root = parseXml(xml);
  } catch (e) {
    return { ok: false, error: 'xml', detail: (e as Error).message };
  }
  if (local(root.name) !== 'Project' || !child(root, 'Tasks')) return { ok: false, error: 'notMspdi' };
  const now = o.now ?? Date.now();
  const at = new Date(now).toISOString();
  const mpd = Number(val(root, 'MinutesPerDay')) || 480;
  const hpd = mpd / 60;
  const notes: string[] = [];
  let kept = 0;
  const count = (els: ForeignEl[]): ForeignEl[] => ((kept += els.length), els);

  const tasksX = kids(child(root, 'Tasks'), 'Task').filter((t) => val(t, 'IsNull') !== '1');
  const sumX = tasksX.find((t) => val(t, 'UID') === '0' || val(t, 'OutlineLevel') === '0');
  const work = tasksX.filter((t) => t !== sumX).sort((a, b) => Number(val(a, 'ID')) - Number(val(b, 'ID')));
  if (!work.length) return { ok: false, error: 'empty' };
  const workUids = new Set(work.map((t) => val(t, 'UID')));

  // Projekt: Name; Gleichnamiges bekommt „(Import)“ (F4)
  let name = val(root, 'Title') || (sumX ? val(sumX, 'Name') : '') || val(root, 'Name').replace(/\.(xml|mpp)$/i, '') || 'Import';
  const taken = new Set(projectsOf(ws).map((p) => fold(p.name)));
  if (taken.has(fold(name))) {
    let k = 1;
    let cand = `${name} (Import)`;
    while (taken.has(fold(cand))) cand = `${name} (Import ${++k})`;
    name = cand;
  }
  const start = dayOf(val(root, 'StartDate'));
  const end = dayOf(val(root, 'FinishDate'));
  const made = addProject(ws, name, { state: 'planned', ...(start ? { start } : {}), ...(end ? { end } : {}) }, now);
  if (!made) return { ok: false, error: 'full' };
  ws = made.ws;
  const pid = made.id;

  // Kalender des Projekts (Basiskalender laut CalendarUID): freie Werktage als eigener Kalender (F6)
  const calX = kids(child(root, 'Calendars'), 'Calendar');
  const baseCal = calX.find((c) => val(c, 'UID') === val(root, 'CalendarUID')) ?? calX.find((c) => val(c, 'IsBaseCalendar') === '1');
  const free = baseCal ? freeDaysOf(baseCal) : [];
  if (free.length > FREE_MAX) notes.push(`calTooMany:${free.length}`);
  const calendar: WorkCalendar = free.length ? { free: free.slice(0, FREE_MAX).map((d) => ({ day: d.day, ...(d.name ? { name: d.name } : {}) })) } : {};

  const company = val(root, 'Company');
  const pForeign: ForeignBag = {
    from: { kind: 'mspdi', at, ...(o.name ? { name: o.name.slice(0, 200) } : {}), ...(val(root, 'SaveVersion') ? { app: `MSPDI ${val(root, 'SaveVersion')}` } : {}) },
    calSig: calSigOf(calendar),
  };
  // Kalender roh mitführen (Original zurück, solange unverändert); der Rest des Projekts, den E-Sources nicht liest
  const projForeign = count(foreignOf(root, new Set([...OWN_PROJECT].filter((n) => n !== 'Calendars'))));
  if (projForeign.length) pForeign.mspdi = projForeign;
  if (sumX) {
    const sf = count(foreignOf(sumX, OWN_TASK, (c) => local(c.name) === 'Baseline' && val(c, 'Number') === '0'));
    if (sf.length) pForeign.summary = sf;
  }
  const sumBase = sumX ? kids(sumX, 'Baseline').find((b) => val(b, 'Number') === '0') : undefined;

  // Personen (Ressourcen): zusammenführen nach Wunsch (F5), sonst „(Import)“
  const mergeSet = new Set((o.merge ?? []).map(fold));
  const resByUid = new Map<string, string>();
  const mergedNames: string[] = [];
  let personsAdded = 0;
  for (const r of resourcesOf(root)) {
    const rName = val(r, 'Name');
    const exists = (ws.persons ?? []).find((p) => fold(p.name) === fold(rName));
    if (exists && mergeSet.has(fold(rName))) {
      resByUid.set(val(r, 'UID'), exists.id);
      mergedNames.push(exists.name);
      continue;
    }
    const units = Number(val(r, 'MaxUnits'));
    const rate = Number(val(r, 'StandardRate'));
    const extra: Partial<Person> = { ...(units > 0 ? { capacity: Math.round(units * hpd * 5 * 10) / 10 } : {}), ...(rate > 0 ? { rate } : {}) };
    const fr = count(foreignOf(r, OWN_RESOURCE));
    if (fr.length) extra.foreign = { mspdi: fr };
    let nm = rName;
    if (exists) {
      let k = 1;
      nm = `${rName} (Import)`;
      while ((ws.persons ?? []).some((p) => fold(p.name) === fold(nm))) nm = `${rName} (Import ${++k})`;
    }
    const a = addPerson(ws, nm, 'person', extra);
    if (!a) continue;
    ws = a.ws;
    resByUid.set(val(r, 'UID'), a.id);
    personsAdded++;
  }

  // Vorgänge in Dateireihenfolge; Gliederung über OutlineLevel
  const asgAll = kids(child(root, 'Assignments'), 'Assignment');
  const idByUid = new Map<string, string>();
  const stack: string[] = [];
  const order: Record<string, string[]> = {};
  const baseline: NonNullable<Project['baseline']> = { at, tasks: {} };
  if (sumBase) {
    const bs = dayOf(val(sumBase, 'Start'));
    const be = dayOf(val(sumBase, 'Finish'));
    if (bs) baseline.start = bs;
    if (be) baseline.end = be;
    if (val(sumBase, 'Cost')) baseline.budget = Number(val(sumBase, 'Cost'));
  }
  for (const t of work) {
    const level = Math.max(1, Number(val(t, 'OutlineLevel')) || 1);
    stack.length = level - 1;
    const parent = stack[level - 2];
    const summary = val(t, 'Summary') === '1';
    const isMs = val(t, 'Milestone') === '1';
    const manual = val(t, 'Manual') === '1';
    const dur = Math.max(0, Math.round(hoursOf(val(t, 'Duration')) / hpd));
    const s = dayOf(val(t, manual && val(t, 'ManualStart') ? 'ManualStart' : 'Start'));
    const ct = Number(val(t, 'ConstraintType'));
    const cd = dayOf(val(t, 'ConstraintDate'));
    const workH = val(t, 'Work') ? hoursOf(val(t, 'Work')) : undefined;
    const actH = val(t, 'ActualWork') ? hoursOf(val(t, 'ActualWork')) : undefined;
    const fixed = Number(val(t, 'FixedCost'));
    const act = val(t, 'ActualCost') ? Number(val(t, 'ActualCost')) : undefined;
    const pc = val(t, 'PercentComplete') ? Number(val(t, 'PercentComplete')) : undefined;
    const due = dayOf(val(t, 'Deadline'));
    const dlTime = /T(\d{2}:\d{2})/.exec(val(t, 'Deadline'))?.[1];
    const dueTime = due && dlTime && `${dlTime}:00` !== DAY_END ? dlTime : undefined;
    const asg = asgAll.filter((a) => val(a, 'TaskUID') === val(t, 'UID') && resByUid.has(val(a, 'ResourceUID')));
    const use = summary ? [] : asg.map((a) => ({ person: resByUid.get(val(a, 'ResourceUID'))!, ...(val(a, 'Work') ? { hours: Math.round(hoursOf(val(a, 'Work')) * 100) / 100 } : {}) }));
    const assign: Record<string, ForeignEl[]> = {};
    for (const a of asg) {
      const fa = count(foreignOf(a, OWN_ASSIGN));
      if (fa.length) assign[resByUid.get(val(a, 'ResourceUID'))!] = fa;
    }
    // Vorgängerverweise im Projekt liest E-Sources selbst – nur fremde (andere Projekte) mitführen
    const fm = count(foreignOf(t, OWN_TASK, (c) => (local(c.name) === 'Baseline' && val(c, 'Number') === '0') || (local(c.name) === 'PredecessorLink' && val(c, 'CrossProject') !== '1' && workUids.has(val(c, 'PredecessorUID')))));
    const fb: ForeignBag | undefined = fm.length || Object.keys(assign).length ? { ...(fm.length ? { mspdi: fm } : {}), ...(Object.keys(assign).length ? { assign } : {}) } : undefined;
    const effort = !summary && (workH !== undefined || actH !== undefined) ? { ...(workH !== undefined && !use.length ? { plan: Math.round(workH * 100) / 100 } : {}), ...(actH !== undefined ? { actual: Math.round(actH * 100) / 100 } : {}) } : undefined;
    const cost = !summary && (fixed > 0 || act !== undefined) ? { ...(fixed > 0 ? { plan: fixed } : {}), ...(act !== undefined ? { actual: act } : {}) } : undefined;
    const r = createNote(
      ws,
      {
        title: val(t, 'Name') || 'Vorgang',
        text: child(t, 'Notes')?.text.trim() ?? '',
        project: pid,
        ...(parent ? { parent } : {}),
        ...(isMs ? { milestone: true } : summary ? {} : { duration: dur }),
        ...(manual ? { manual: true, ...(s ? { notBefore: s } : {}) } : (ct === 4 || ct === 2) && cd ? { notBefore: cd } : {}),
        ...(due ? { due } : {}),
        ...(dueTime ? { dueTime } : {}),
        ...(effort && Object.keys(effort).length ? { effort } : {}),
        ...(cost && Object.keys(cost).length ? { cost } : {}),
        ...(use.length ? { use, assignee: use[0].person } : {}),
        ...(pc !== undefined && !summary ? { wp: { progress: Math.max(0, Math.min(100, pc)) }, ...(pc >= 100 ? { state: 'done' as const } : pc > 0 ? { state: 'doing' as const } : {}) } : {}),
        ...(fb ? { foreign: fb } : {}),
      },
      { now },
    );
    ws = r.ws;
    idByUid.set(val(t, 'UID'), r.id);
    stack[level - 1] = r.id;
    (order[parent ?? ''] ??= []).push(r.id);
    const b0 = kids(t, 'Baseline').find((b) => val(b, 'Number') === '0');
    if (b0) {
      const bs = dayOf(val(b0, 'Start'));
      const be = dayOf(val(b0, 'Finish'));
      baseline.tasks[r.id] = {
        ...(bs ? { start: bs } : {}),
        ...(be ? { end: be } : {}),
        ...(val(b0, 'Duration') ? { duration: Math.round(hoursOf(val(b0, 'Duration')) / hpd) } : {}),
        ...(val(b0, 'Work') ? { effort: Math.round(hoursOf(val(b0, 'Work')) * 100) / 100 } : {}),
        ...(val(b0, 'Cost') ? { cost: Number(val(b0, 'Cost')) } : {}),
      };
    }
  }
  // Vorgänger erst jetzt (sie können auf spätere Vorgänge zeigen)
  let links = 0;
  const after = new Map<string, NoteLink[]>();
  for (const t of work) {
    const id = idByUid.get(val(t, 'UID'));
    if (!id) continue;
    for (const l of kids(t, 'PredecessorLink')) {
      const from = idByUid.get(val(l, 'PredecessorUID'));
      if (!from || from === id || val(l, 'CrossProject') === '1') continue;
      const type = Number(val(l, 'Type') || 1);
      const lagDays = Math.round(Number(val(l, 'LinkLag') || 0) / 10 / mpd);
      const list = after.get(id) ?? [];
      list.push({ id: from, rel: MSPDI_TO_REL[type] ?? 'EA', ...(lagDays ? { lag: lagDays } : {}) });
      after.set(id, list);
      links++;
    }
  }
  const goal = sumX ? child(sumX, 'Notes')?.text.trim() : '';
  ws = {
    ...ws,
    notes: (ws.notes ?? []).map((n) => (after.has(n.id) ? { ...n, after: after.get(n.id)! } : n)),
    projects: (ws.projects ?? []).map((p) =>
      p.id === pid
        ? {
            ...p,
            calendar,
            order,
            ...(company ? { charter: { ...p.charter, client: company } } : {}),
            ...(Object.keys(baseline.tasks).length || baseline.start ? { baseline } : {}),
            ...(goal ? { brief: { goal } } : {}),
            foreign: pForeign,
          }
        : p,
    ),
  };
  return { ok: true, ws, project: pid, tasks: work.length, persons: personsAdded, merged: mergedNames, links, kept, notes };
}

/** Freie Werktage eines MSPDI-Kalenders: Ausnahmen alt (WeekDay DayType 0) und neu (Exceptions), nur Mo–Fr. */
function freeDaysOf(cal: XNode): { day: string; name?: string }[] {
  const out = new Map<string, string | undefined>();
  const range = (from: string, to: string, nm?: string) => {
    const a = dayOf(from);
    const b = dayOf(to);
    if (!a || !b) return;
    const t = new Date(`${a}T12:00:00Z`);
    for (let i = 0; i < 3660; i++) {
      const d = t.toISOString().slice(0, 10);
      if (d > b) break;
      const wd = t.getUTCDay();
      if (wd !== 0 && wd !== 6) out.set(d, nm);
      t.setUTCDate(t.getUTCDate() + 1);
    }
  };
  for (const w of kids(child(cal, 'WeekDays'), 'WeekDay')) {
    if (val(w, 'DayType') !== '0' || val(w, 'DayWorking') === '1') continue;
    const tp = child(w, 'TimePeriod');
    range(val(tp, 'FromDate'), val(tp, 'ToDate'));
  }
  for (const e of kids(child(cal, 'Exceptions'), 'Exception')) {
    if (val(e, 'DayWorking') === '1') continue;
    const tp = child(e, 'TimePeriod');
    range(val(tp, 'FromDate'), val(tp, 'ToDate'), val(e, 'Name') || undefined);
  }
  return [...out.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([day, name]) => ({ day, ...(name ? { name: name.slice(0, 40) } : {}) }));
}
