/**
 * F-226 (V109, G1–G4, Doc „F-226 V108 – Projektformulare nach GPM“): Projekt-Modus › Rad „Ansicht“ › „Formulare“.
 * Formular-Baukasten mit mitgelieferter Vorlage „GPM Level D“: Kapitel-Rad in Leitfaden-Reihenfolge, je Formular
 * eine Tabelle (Zeilen) oder Feldliste (Steckbrief). Eingabe = Ausgabe: jede Zelle schreibt direkt in das Objekt
 * dahinter (Projekt, Ziel, Stakeholder, Risiko, Vorgang, Person …). Eigene Felder, Spalten ein/aus, Vorlage
 * speichern über „Felder“. Pflichtfelder nach GPM sind markiert, „n Pflichtfelder offen“ zeigt die Lücken.
 * Tastatur (NF-03): Tab durch die Felder, Enter übernimmt, Esc verwirft, Alt+↑/↓ verschiebt die Zeile.
 * Meldungen am Ort (F-214). Logik in workspace/formKit.ts und gpm.ts.
 */
import { qrSvg } from '../workspace/qr';
import { appBase, projectLinkUrl } from '../workspace/projectLink';
import { Fragment, type KeyboardEvent, useEffect, useRef, useState } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { FormDef, FormFieldType, Project, Workspace } from '../workspace/types';
import * as Fk from '../workspace/formKit';
import * as Ps from '../workspace/persons';
import { newId } from '../workspace/workspace';
import { FORMS_TEXT as T, INK_TEXT as T_INK, PSP_TEXT } from '../workspace/terms';
import { InkSign } from './InkChips';
import { INK_EVENT, getInk } from '../workspace/inkStore';
import { inkSvg } from '../workspace/ink';
import { ModeWheel } from './ModeWheel';
import { Icon } from './Icon';
import { useOverflow } from './Overflow';
import { OVERFLOW_TEXT } from '../workspace/terms';
import { WorkPadButton } from './WorkPadOpen';
import { requestTour, tourAutoStart } from '../workspace/tour';
import * as Rp from '../workspace/gpmReport';
import { staffLines, wpView } from '../workspace/wpSheet';
import { LIVE_PROJECT, liveLocked } from '../workspace/liveProject';
import { PROJECTS_TEXT as T_PJ } from '../workspace/terms';
import { costCurve, earnedValue, evCurve, mtaOf, portfolioOf } from '../workspace/gpmCalc';
import { APP_VERSION } from '../workspace/feedback';
import { PaperSizeWheel, ProjectSheet, paperZoom, usePaperSize } from './ProjectSheet';
import { eisenGeo, eisenMarks, eisenQuadAt, envPortfolioSvg, figureSvg, loadDefault, loadPersons, shPortfolioSvg, type EisenQuad } from '../workspace/gpmFigures';
import * as Sh from '../workspace/sheets';
import { defaultViewName, deleteView } from '../workspace/notes';
import { rolesOf } from '../workspace/projects';

/** F-234 D2: Grafik-Blatt → bedienbare Ansicht im Projekt-Modus */
const FIGURE_VIEW: Record<string, 'psp' | 'gantt' | 'res' | undefined> = { psp: 'psp', gantt: 'gantt', phasePlan: 'gantt', load: 'res' };

/** V133 (F-232 P9): Formulare stehen auf einem hellen Blatt wie im Report – Grafiken daher in den Druckfarben */
const UI_COLORS: Rp.SvgColors = Rp.PRINT_COLORS;
/** V134: Gewicht einer Spalte für die feste Tabellenaufteilung auf dem Blatt (lange Texte breit, Zahlen und Kästchen schmal). */
const COL_WEIGHT: Record<string, number> = { long: 3, lines: 3, akv: 3, goal: 2, note: 2, name: 2.2, text: 1.6, person: 1.5, roles: 1.5, use: 1.5, phase: 1.4, choice: 1.3, date: 1.45, money: 1.2, number: 0.9, pct: 0.9, accept: 2, gpm: 1, bool: 0.7 };
const colWeight = (c: { key: string; kind: string }) => (c.key === 'code' ? 1 : COL_WEIGHT[c.kind] ?? 1.3);
const todayDay = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const FORM_KEY = 'esource.formChapter.v1';
const loadForm = (): string => {
  try {
    return localStorage.getItem(FORM_KEY) ?? 'charter';
  } catch {
    return 'charter';
  }
};
/** „12.500,50 €“ → 12500.5; leer = ''; Unsinn = undefined */
const parseNum = (v: string): number | '' | undefined => {
  if (!v.trim()) return '';
  const x = Number(v.replace(/\./g, '').replace(',', '.').replace(/[€%\s]/g, '').replace('−', '-'));
  return Number.isFinite(x) ? x : undefined;
};
const fmtNum = (v: Fk.CellValue, kind: Fk.FieldKind, digits?: number): string => (typeof v !== 'number' ? (v === undefined ? '' : String(v)) : Fk.fmtNumber(v, kind, digits));
const dmy = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}` : d);

export function ProjectForms({ ws, p, dispatch, say, inPad, openView, jump }: { ws: Workspace; p: Project; dispatch: (a: Action) => void; say: (t: string) => void; inPad?: boolean; openView?: (v: 'psp' | 'gantt' | 'res') => void; jump?: { form?: string; row?: string; at: number } }) {
  const tpl = Fk.templateOf(ws, p);
  const [fid, setFidState] = useState(loadForm);
  const form = tpl.forms.find((f) => f.id === fid) ?? tpl.forms[0];
  const [msg, setMsg] = useState<{ text: string; undo?: () => void } | null>(null);
  const [panel, setPanel] = useState(false);
  const [useTask, setUseTask] = useState('');
  const [usePerson, setUsePerson] = useState('');
  // V113: Einzelansicht (Arbeitspaket, Statusbericht) – gewählte Zeile; Ziel für neue Abnahmekriterien
  const [rec, setRec] = useState('');
  const [acceptTask, setAcceptTask] = useState('');
  // F-234 D4: Auslastungsdiagramm je Ressource (Rad), Vorgabe Projektleitung
  const [loadWho, setLoadWho] = useState('');
  const body = useRef<HTMLDivElement>(null);
  const by = ws.profile?.name || undefined;
  const base = inPad ? 'pjf-pad' : 'pjf';
  const tell = (text: string, undo?: () => void) => (setMsg({ text, ...(undo ? { undo } : {}) }), say(text));
  const run = (op: Fk.FormOp) => dispatch({ type: 'form', op });

  useEffect(() => setMsg(null), [form.id, p.id]);
  // V110: Tour „Formulare“ startet einmal von selbst, wenn man die Formulare zum ersten Mal öffnet
  useEffect(() => {
    if (!tourAutoStart('forms')) return;
    const t = window.setTimeout(() => requestTour('forms', true), 700);
    return () => window.clearTimeout(t);
  }, []);

  const setFid = (id: string) => {
    setFidState(id);
    try {
      localStorage.setItem(FORM_KEY, id);
    } catch {
      /* ohne Speicher: bis zum Neuladen */
    }
    const f = tpl.forms.find((x) => x.id === id);
    if (f) say(`${T.chapter} ${f.chapter} ${f.name}`);
  };

  const cols = Fk.columnsOf(p, form);
  const rows = Fk.rowsOf(ws, p.id, form);
  const missing = Fk.missingOf(ws, p.id, form);
  const miss = new Set(missing.flatMap((m) => m.keys.map((k) => `${m.row}|${k}`)));
  const openCount = missing.reduce((s, m) => s + m.keys.length, 0);
  // V111: doppelte Codes am Ort zeigen (Zelle + Zähler oben)
  const dups = Fk.dupCodesOf(ws, p.id, form);
  const dupRows = new Set([...dups.values()].flat());
  const labelCol = cols.find((c) => !c.readonly && (c.kind === 'text' || c.kind === 'long')) ?? cols[0];
  const rowLabel = (rowId: string, i: number) => {
    const v = labelCol ? Fk.cellValue(ws, p.id, form, rowId, labelCol.key) : undefined;
    return typeof v === 'string' && v.trim() ? v.trim().split('\n')[0].slice(0, 60) : String(i + 1);
  };
  const focusRow = (id: string) =>
    window.setTimeout(() => body.current?.querySelector<HTMLElement>(`[data-row="${CSS.escape(id)}"] input:not([type=checkbox]), [data-row="${CSS.escape(id)}"] textarea, [data-row="${CSS.escape(id)}"] select`)?.focus(), 0);

  const add = (init?: { task?: string; person?: string }) => {
    const at = Date.now();
    const id = newId();
    const r = Fk.addRow(ws, p.id, form, { id, now: at, by, init });
    if (!r) {
      tell(form.source === 'conflicts' ? T.conflictsNone : form.source === 'accept' ? T.acceptNone : T.usesNone);
      return;
    }
    run({ op: 'add', pid: p.id, form, id, at, by, init });
    tell(T.added, () => run({ op: 'remove', pid: p.id, form, row: r.id, at: Date.now() }));
    if (form.layout === 'record') setRec(r.id);
    focusRow(r.id);
  };
  const remove = (rowId: string, i: number) => {
    const at = Date.now();
    const r = Fk.removeRow(ws, p.id, form, rowId, at);
    if (!r) return;
    run({ op: 'remove', pid: p.id, form, row: rowId, at });
    tell(T.removed(rowLabel(rowId, i)), () => run({ op: 'undoRow', undo: r.undo, at: Date.now() }));
  };
  const move = (rowId: string, by1: number) => {
    run({ op: 'move', pid: p.id, form, row: rowId, by: by1, at: Date.now() });
    say(T.moved);
    focusRow(rowId);
  };
  const rowKey = (e: KeyboardEvent, rowId: string) => {
    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') || !Fk.canMoveRow(form)) return;
    e.preventDefault();
    move(rowId, e.key === 'ArrowUp' ? -1 : 1);
  };
  const setValue = (rowId: string, key: string, value: Fk.CellValue) => run({ op: 'cell', pid: p.id, form, row: rowId, key, value, at: Date.now(), by });

  // V112 F-228 Stufe 2: Kopf mit Überlauf – Überschrift und Kapitel-Rad bleiben, „noch offen“ ebenfalls (Rückmeldung)
  const topRef = useRef<HTMLElement>(null);
  const topOvf = useOverflow(topRef, { label: OVERFLOW_TEXT.viewHead, keep: '.dc__head, .pjf__chapter, .pjf__open' });
  const templates = Fk.templatesOf(ws);
  const tasks = Fk.rowsOf(ws, p.id, Fk.GPM_D.forms.find((f) => f.id === 'tasks')!);
  const persons = Ps.personList(ws);
  const taskForm = Fk.GPM_D.forms.find((f) => f.id === 'tasks')!;
  const msForm = Fk.GPM_D.forms.find((f) => f.id === 'milestones')!;
  const targets = [...Fk.rowsOf(ws, p.id, msForm), ...tasks];
  const recRow = rows.find((r) => r.id === rec) ?? rows[0];
  // V146 (F-232 P10): Verweis aus dem QR-Code – Kapitel und Eintrag (z. B. 8.3 mit dem Arbeitspaket) zeigen
  useEffect(() => {
    if (!jump) return;
    if (jump.form && tpl.forms.some((f) => f.id === jump.form)) setFid(jump.form);
    if (jump.row) setRec(jump.row);
  }, [jump?.at]); // eslint-disable-line react-hooks/exhaustive-deps
  const recAt = recRow ? rows.indexOf(recRow) : -1;
  // V144 (F-238 S6): Unterschriften als Tinte im Bericht – Striche vorab aus dem Gerätespeicher laden (Bericht bleibt synchron, kein Pop-up-Blocker)
  const inkKey = Rp.reportInkRefs(ws, p.id).join('|');
  const [inks, setInks] = useState<Map<string, string>>(() => new Map());
  useEffect(() => {
    let live = true;
    const load = () =>
      void Promise.all(inkKey.split('|').filter(Boolean).map(async (ref) => [ref, await getInk(ref)] as const)).then((all) => {
        if (!live) return;
        const m = new Map<string, string>();
        for (const [ref, r] of all) if (r) m.set(ref, inkSvg(r.strokes, r.w, r.h));
        setInks(m);
      });
    load();
    window.addEventListener(INK_EVENT, load);
    return () => {
      live = false;
      window.removeEventListener(INK_EVENT, load);
    };
  }, [inkKey]);
  const openReport = () => {
    const html = Rp.reportHtml(ws, p.id, { version: APP_VERSION, day: todayDay(), inks, base: appBase() });
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    const w = window.open(url, '_blank');
    if (w) tell(T.reportOpened);
    else {
      // Fenster gesperrt (z. B. Pop-up-Blocker): Bericht unsichtbar laden und gleich den Druckdialog öffnen
      document.querySelector('iframe.pjf__print')?.remove();
      const fr = document.createElement('iframe');
      fr.className = 'pjf__print';
      fr.title = T.report;
      fr.setAttribute('aria-hidden', 'true');
      fr.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none';
      fr.srcdoc = html;
      fr.onload = () => {
        fr.contentWindow?.focus();
        fr.contentWindow?.print();
      };
      document.body.append(fr);
      tell(T.reportSaved);
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 120000);
  };
  const curve = form.layout === 'chart' && form.source === 'costs' ? costCurve(ws, p.id) : null;
  const mta = form.source === 'mta' ? mtaOf(ws, p.id, Fk.evDay()) : null;
  const evc = form.source === 'ev' ? evCurve(ws, p.id, Fk.evDay()) : null;
  const dots = form.layout === 'portfolio' ? portfolioOf(p) : [];
  const dotsOpen = form.layout === 'portfolio' ? dots.filter((d) => (form.filter === 'sh' ? d.attitude === undefined || d.power === undefined : !d.side || !d.area)).length : 0;
  const eur = (v: number) => `${v.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €`;
  // V133 (F-232 P9): Blatt wie im Report – breite Tabellen (mehr als 7 Spalten) im Querformat wie die Seiten „wide“ im Bericht
  const [size, setSize] = usePaperSize(say);
  const wide = Fk.isWideForm(form, cols.length);
  const isCharter = form.source === 'charter' && form.layout === 'fields';
  // V137 (Enrico 12:59 „Alle Ansichten … müssen auch in ihrer Ansicht bearbeitbar sein“): Kästen der Grafik am Ort bearbeiten und verschieben (D3)
  const [figEdit, setFigEdit] = useState<{ key: string; x: number; y: number } | null>(null);
  const figRef = useRef<HTMLElement>(null);
  const drag = useRef<{ key: string; el: SVGGElement; sx: number; sy: number; k: number; moved: boolean; dx0: number; dy0: number } | null>(null);
  const skipClick = useRef(false);
  useEffect(() => setFigEdit(null), [form.id, p.id]);
  const figKind = form.figure;
  const movable = figKind === 'goalTree' || figKind === 'psp' || figKind === 'org';
  // V139 (Enrico 13:52): Eisenhower – Einträge in ein anderes Feld ziehen (setzt wichtig/dringend), Alt+Pfeil ebenso
  const quadDrag = figKind === 'eisenhower';
  // V139 (Enrico 13:55): Rad „Einträge“ Gekürzt · Alle – bei „Alle“ wachsen die Felder mit (je Gerät gemerkt);
  // V140 (F-237 H7): dritte Stellung „Erledigte“ zeigt auch erledigte Einträge (durchgestrichen)
  const [eisenMode, setEisenModeState] = useState<'short' | 'all' | 'done'>(() => {
    try {
      const v = localStorage.getItem('esource.eisenAll.v1');
      return v === 'all' || v === 'done' ? v : 'short';
    } catch {
      return 'short';
    }
  });
  const eisenAll = eisenMode !== 'short';
  const setEisenMode = (m: 'short' | 'all' | 'done') => {
    setEisenModeState(m);
    try {
      localStorage.setItem('esource.eisenAll.v1', m);
    } catch {
      /* nur bis zum Neuladen */
    }
    say(m === 'all' ? T.figAllOn : m === 'done' ? T.figAllDoneOn : T.figAllOff);
  };
  // V140 (F-237): mehrere Matrizen in 15.2 – gewählte Matrix, Auswahl „abbilden“ bzw. „Arbeitspakete übernehmen“
  const mats = quadDrag ? Sh.projectMatrices(ws, p.id) : [];
  const mat = quadDrag ? Sh.projectMatrix(ws, p.id) : undefined;
  const matOwn = !!mat && Sh.matrixProject(mat) === p.id;
  const [eisenPick, setEisenPick] = useState<null | 'map' | 'take'>(null);
  const [pickSel, setPickSel] = useState<string[]>([]);
  const pickRef = useRef<HTMLDivElement>(null);
  useEffect(() => setEisenPick(null), [form.id, p.id]);
  const eisen = (act: Fk.EisenAct) => run({ op: 'eisen', pid: p.id, act, at: Date.now() });
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const newMatrix = () => {
    const id = newId();
    const name = defaultViewName(ws, 'eisenhower');
    eisen({ kind: 'new', id, name, date: today() });
    tell(T.eisenNew(name), () => eisen({ kind: 'delete', view: id }));
    window.setTimeout(() => figRef.current?.querySelector<HTMLInputElement>('.pjf__eisenmeta input')?.focus(), 30);
  };
  const openPick = (k: 'map' | 'take') => {
    setPickSel(k === 'map' ? (p.eisenMaps ?? []).filter((x) => Sh.matricesOf(ws).some((v) => v.id === x)) : []);
    setEisenPick(k);
    window.setTimeout(() => pickRef.current?.querySelector<HTMLElement>('input, button')?.focus(), 0);
  };
  const closePick = () => {
    const k = eisenPick;
    setEisenPick(null);
    window.setTimeout(() => figRef.current?.querySelector<HTMLElement>(`[data-pick="${k}"]`)?.focus(), 0);
  };
  const applyPick = () => {
    if (eisenPick === 'map') {
      const had = new Set(p.eisenMaps ?? []);
      const want = new Set(pickSel);
      const on = pickSel.filter((x) => !had.has(x));
      const off = [...had].filter((x) => !want.has(x));
      for (const v of off) eisen({ kind: 'map', view: v, on: false });
      for (const v of on) eisen({ kind: 'map', view: v, on: true });
      tell(T.eisenMapped(on.length, off.length), on.length || off.length ? () => { for (const v of on) eisen({ kind: 'map', view: v, on: false }); for (const v of off) eisen({ kind: 'map', view: v, on: true }); } : undefined);
    } else if (eisenPick === 'take' && mat) {
      const ids = pickSel;
      const was = mat.ids;
      if (ids.length) eisen({ kind: 'take', view: mat.id, ids });
      tell(T.eisenTaken(ids.length), ids.length ? () => run({ op: 'undoRow', undo: { kind: 'eisen', view: mat.id, ids: was, note: ids[0] }, at: Date.now() }) : undefined);
    }
    closePick();
  };
  const dropMatrix = () => {
    if (!mat) return;
    if (matOwn) {
      const r = deleteView(ws, mat.id);
      if (!r) return;
      const maps = p.eisenMaps;
      eisen({ kind: 'delete', view: mat.id });
      tell(T.eisenDeleted(mat.name), () => eisen({ kind: 'restore', undo: r.undo, maps, sel: mat.id }));
    } else {
      const id = mat.id;
      eisen({ kind: 'map', view: id, on: false });
      tell(T.eisenUnmapped(mat.name), () => eisen({ kind: 'map', view: id, on: true }));
    }
  };
  const addEntry = (q: EisenQuad) => {
    if (!mat) return;
    const id = newId();
    const at = Date.now();
    const init = { quad: q };
    const r = Fk.addRow(ws, p.id, form, { id, now: at, by, init });
    if (!r) return;
    run({ op: 'add', pid: p.id, form, id, at, by, init });
    tell(T.eisenAdded(T.figQuadName[q]), () => run({ op: 'remove', pid: p.id, form, row: id, at: Date.now() }));
    setFigEdit({ key: `eisenhower:${id}`, x: 0, y: 48 });
  };
  const removeEntry = (key: string) => {
    const id = key.split(':')[1];
    const n = (ws.notes ?? []).find((x) => x.id === id);
    const r = Fk.removeRow(ws, p.id, form, id, Date.now());
    if (!r || !n) return;
    run({ op: 'remove', pid: p.id, form, row: id, at: Date.now() });
    tell(T.eisenRemoved(n.title || id), () => run({ op: 'undoRow', undo: r.undo, at: Date.now() }));
    window.setTimeout(() => figRef.current?.querySelector<HTMLElement>('[data-edit^="eisenhower:"], [data-quad]')?.focus(), 30);
  };
  const setQuad = (key: string, q: EisenQuad) => {
    const id = key.split(':')[1];
    const n = (ws.notes ?? []).find((x) => x.id === id);
    if (!n) return;
    const mk = eisenMarks(q);
    if (!!n.important === mk.important && !!n.urgent === mk.urgent) return;
    const at = Date.now();
    const was = { important: !!n.important, urgent: !!n.urgent };
    run({ op: 'cell', pid: p.id, form, row: id, key: 'important', value: mk.important, at, by });
    run({ op: 'cell', pid: p.id, form, row: id, key: 'urgent', value: mk.urgent, at, by });
    tell(T.figQuad(T.figQuadName[q]), () => {
      run({ op: 'cell', pid: p.id, form, row: id, key: 'important', value: was.important, at: Date.now(), by });
      run({ op: 'cell', pid: p.id, form, row: id, key: 'urgent', value: was.urgent, at: Date.now(), by });
    });
  };
  const quadOf = (key: string): EisenQuad => {
    const n = (ws.notes ?? []).find((x) => x.id === key.split(':')[1]);
    return n?.important ? (n.urgent ? 'do' : 'plan') : n?.urgent ? 'delegate' : 'drop';
  };
  const addEisenTask = () => {
    const tf = tpl.forms.find((f) => f.id === 'tasks') ?? Fk.GPM_D.forms.find((f) => f.id === 'tasks');
    if (!tf) return;
    const id = newId();
    const at = Date.now();
    const r = Fk.addRow(ws, p.id, tf, { id, now: at, by });
    if (!r) return;
    run({ op: 'add', pid: p.id, form: tf, id, at, by });
    // V140 (F-237): das neue Arbeitspaket liegt gleich in der gewählten Matrix
    if (mat) eisen({ kind: 'take', view: mat.id, ids: [r.id] });
    tell(T.added, () => run({ op: 'remove', pid: p.id, form: tf, row: r.id, at: Date.now() }));
    // Kasten-Fenster mit Titel usw. gleich öffnen; der neue Eintrag steht unter „liegen lassen“
    setFigEdit({ key: `tasks:${r.id}`, x: 0, y: 48 });
  };
  const offNow = (key: string) => (figKind ? p.figLayout?.[figKind]?.[key] : undefined) ?? { dx: 0, dy: 0 };
  const openFig = (el: Element) => {
    const key = el.getAttribute('data-edit');
    const host = figRef.current;
    if (!key || !host) return;
    const b = el.getBoundingClientRect();
    const h = host.getBoundingClientRect();
    setFigEdit({ key, x: Math.max(0, Math.min(b.left - h.left, h.width - 340)), y: b.bottom - h.top + 6 });
  };
  const focusBox = (key: string) => window.setTimeout(() => figRef.current?.querySelector<SVGGElement>(`[data-edit="${CSS.escape(key)}"]`)?.focus(), 0);
  const moveBox = (key: string, dx: number, dy: number) => {
    if (!figKind) return;
    run({ op: 'figMove', pid: p.id, fig: figKind, key, dx, dy, at: Date.now() });
    say(T.figMoved);
  };
  const figHandlers = {
    onClick: (e: React.MouseEvent) => {
      if (skipClick.current) return void (skipClick.current = false);
      const el = (e.target as Element).closest('[data-edit]');
      if (el) openFig(el);
    },
    onDoubleClick: (e: React.MouseEvent) => {
      // V140 (F-237 H3): Doppelklick in ein leeres Stück eines Felds legt dort einen Eintrag an
      const q = (e.target as Element).closest('[data-quad]')?.getAttribute('data-quad') as EisenQuad | null;
      if (quadDrag && q && !(e.target as Element).closest('[data-edit]')) addEntry(q);
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      const qEl = (e.target as Element).closest('[data-quad]');
      if (quadDrag && qEl && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        return addEntry(qEl.getAttribute('data-quad') as EisenQuad);
      }
      const el = (e.target as Element).closest('[data-edit]');
      if (!el) return;
      const key = el.getAttribute('data-edit')!;
      if (quadDrag && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        return removeEntry(key);
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openFig(el);
      } else if (quadDrag && e.altKey && e.key.startsWith('Arrow')) {
        e.preventDefault();
        const mk = eisenMarks(quadOf(key));
        if (e.key === 'ArrowUp') mk.important = true;
        if (e.key === 'ArrowDown') mk.important = false;
        if (e.key === 'ArrowRight') mk.urgent = true;
        if (e.key === 'ArrowLeft') mk.urgent = false;
        setQuad(key, mk.important ? (mk.urgent ? 'do' : 'plan') : mk.urgent ? 'delegate' : 'drop');
        focusBox(key);
      } else if (movable && e.altKey && e.key.startsWith('Arrow')) {
        e.preventDefault();
        const o = offNow(key);
        const st = e.shiftKey ? 40 : 10;
        moveBox(key, o.dx + (e.key === 'ArrowLeft' ? -st : e.key === 'ArrowRight' ? st : 0), o.dy + (e.key === 'ArrowUp' ? -st : e.key === 'ArrowDown' ? st : 0));
        focusBox(key);
      }
    },
    onPointerDown: (e: React.PointerEvent) => {
      if (!(movable || quadDrag) || e.button !== 0) return;
      const el = (e.target as Element).closest('[data-edit]') as SVGGElement | null;
      const svg = el?.ownerSVGElement;
      if (!el || !svg) return;
      const k = svg.viewBox.baseVal.width / svg.getBoundingClientRect().width || 1;
      const key = el.getAttribute('data-edit')!;
      const o = offNow(key);
      drag.current = { key, el, sx: e.clientX, sy: e.clientY, k, moved: false, dx0: o.dx, dy0: o.dy };
    },
    onPointerMove: (e: React.PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const mx = e.clientX - d.sx;
      const my = e.clientY - d.sy;
      if (!d.moved && Math.hypot(mx, my) < 4) return;
      if (!d.moved) (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      d.moved = true;
      d.el.setAttribute('transform', `translate(${mx * d.k} ${my * d.k})`);
      d.el.classList.add('is-drag');
    },
    onPointerUp: (e: React.PointerEvent) => {
      const d = drag.current;
      drag.current = null;
      if (!d?.moved) return;
      skipClick.current = true;
      window.setTimeout(() => (skipClick.current = false), 60);
      d.el.removeAttribute('transform');
      d.el.classList.remove('is-drag');
      if (quadDrag) {
        const svg = d.el.ownerSVGElement;
        const b = svg?.getBoundingClientRect();
        const q = b ? eisenQuadAt((e.clientX - b.left) * d.k, (e.clientY - b.top) * d.k, eisenGeo(ws, p.id, eisenAll, mat?.id, eisenMode === 'done')) : null;
        if (q) setQuad(d.key, q);
        else say(T.figQuadOut);
        return;
      }
      moveBox(d.key, d.dx0 + (e.clientX - d.sx) * d.k, d.dy0 + (e.clientY - d.sy) * d.k);
    },
  };
  const figureBlock = () => {
    const people = form.figure === 'load' ? loadPersons(ws, p.id) : [];
    const who = people.some((x) => x.id === loadWho) ? loadWho : loadDefault(ws, p.id);
    const svg = figureSvg(ws, p.id, form.figure, { person: who, row: quadDrag ? mat?.id : recRow?.id, all: eisenAll, done: eisenMode === 'done', inks, base: appBase() });
    const target = form.figure ? FIGURE_VIEW[form.figure] : undefined;
    const editable = !!svg && (svg.includes('data-edit=') || quadDrag);
    return (
      <figure className={`pjf__figure pjf__fig is-${form.figure}`} ref={figRef}>
        {quadDrag && eisenBlock()}
        {(people.length > 1 || (target && openView) || quadDrag || (movable && p.figLayout?.[form.figure!])) && (
          <div className="pjf__figbar">
            {people.length > 1 && (
              <span className="layouts__label pj__wheel pjf__figwho">
                <span aria-hidden="true">{T.figWho}</span>
                <ModeWheel label={T.figWho} value={who} onChange={(id) => (setLoadWho(id), say(people.find((x) => x.id === id)?.name ?? ''))} options={people.map((x) => ({ id: x.id, name: x.name, hint: `${x.total.toLocaleString('de-DE')} h` }))} />
              </span>
            )}
            {quadDrag && (
              <span className="layouts__label pj__wheel pjf__figwho">
                <span aria-hidden="true">{T.figAll}</span>
                <ModeWheel label={T.figAll} value={eisenMode} onChange={(v) => setEisenMode(v as 'short' | 'all' | 'done')} options={[{ id: 'short', name: T.figAllShort, hint: T.figAllShortHint }, { id: 'all', name: T.figAllAll, hint: T.figAllAllHint }, { id: 'done', name: T.figAllDone, hint: T.figAllDoneHint }]} />
              </span>
            )}
            <span className="pjf__figacts2">
              {quadDrag && mat && (
                <button type="button" className="help__run" title={T.figAddTaskHint} onClick={addEisenTask}>
                  <Icon name="plus" size={12} className="icon icon--inline" /> {T.figAddTask}
                </button>
              )}
              {movable && p.figLayout?.[form.figure!] && (
                <button type="button" className="help__run" onClick={() => (run({ op: 'figReset', pid: p.id, fig: form.figure!, at: Date.now() }), tell(T.figResetDone))}>
                  {T.figReset}
                </button>
              )}
              {target && openView && (
                <button type="button" className="help__run" title={T.figOpen(T.figView[target])} onClick={() => openView(target)}>
                  {T.figView2(T.figView[target])}
                </button>
              )}
            </span>
          </div>
        )}
        {quadDrag && !mat ? (
          <p className="lc__muted">{T.eisenNone}</p>
        ) : svg ? (
          target && openView && !editable ? (
            <button type="button" className="pjf__figbtn" title={T.figOpen(T.figView[target])} aria-label={T.figOpen(T.figView[target])} onClick={() => openView(target)}>
              <span className="pjf__svg" dangerouslySetInnerHTML={{ __html: svg }} />
            </button>
          ) : (
            <div className={`pjf__svg${editable ? ' is-editable' : ''}`} dangerouslySetInnerHTML={{ __html: svg }} {...(editable ? figHandlers : {})} />
          )
        ) : (
          <p className="lc__muted">{T.figNone[form.figure ?? 'goalTree']}</p>
        )}
        {figEdit && editable && (
          <FigEditor key={figEdit.key} edit={figEdit} fig={form.figure} ws={ws} p={p} tpl={tpl} run={run} tell={tell} say={say} by={by}
            onOpen={(key) => window.setTimeout(() => { const el = figRef.current?.querySelector(`[data-edit="${CSS.escape(key)}"]`); if (el) openFig(el); }, 30)}
            onClose={(back) => (setFigEdit(null), back && focusBox(figEdit.key))} />
        )}
        {svg && <figcaption className="help__text">{T.figCaption[form.figure ?? 'goalTree']}{editable ? ` ${movable ? T.figEditHint : quadDrag ? T.figEisenHint : T.figEditHint2}` : target && openView ? ` ${T.figOpenHint(T.figView[target])}` : ''}</figcaption>}
      </figure>
    );
  };
  /** V140 (F-237): Matrizen in 15.2 – Rad „Matrix“, anlegen, aus Notizen abbilden, Arbeitspakete übernehmen, Name/Person/Datum */
  const eisenBlock = () => {
    const names = [...new Set(rolesOf(p).map((r) => (r.person ? Ps.personById(ws, r.person)?.name : undefined) ?? r.name).filter(Boolean))];
    const pickList =
      eisenPick === 'map'
        ? Sh.matricesOf(ws).filter((v) => { const pj = Sh.matrixProject(v); return pj !== p.id && !Sh.subProjectIds(ws, p.id).has(pj ?? ''); }).map((v) => {
            const pj = Sh.matrixProject(v);
            const where = Sh.theMatrix(ws)?.id === v.id ? T.eisenPersonal : pj ? T.eisenOfProject((ws.projects ?? []).find((x) => x.id === pj)?.name ?? '') : T.eisenNotes;
            return { id: v.id, name: v.name, hint: `${where}${v.person ? ` · ${v.person}` : ''}` };
          })
        : eisenPick === 'take' && mat
          ? Fk.openWorkPackages(ws, p.id, true).filter((w) => !mat.ids.includes(w.id)).map((w) => ({ id: w.id, name: `${w.code ? `${w.code} ` : ''}${w.title}`, hint: w.project !== p.id ? T.eisenOfSub((ws.projects ?? []).find((x) => x.id === w.project)?.name ?? '') : '' }))
          : [];
    const commit = (k: 'name' | 'person' | 'date', v: string) => {
      if (!mat || (mat[k] ?? '') === v.trim()) return;
      if (k === 'name' && !v.trim()) return;
      eisen({ kind: 'edit', view: mat.id, [k]: v });
      tell(T.figSaved);
    };
    const field = (k: 'name' | 'person' | 'date', label: string, type: string, hint: string) => (
      <label className="pjf__eisenfield">
        <span>{label}</span>
        <input
          key={`${mat?.id}-${k}-${mat?.[k] ?? ''}`}
          type={type}
          defaultValue={mat?.[k] ?? ''}
          title={hint}
          {...(k === 'person' ? { list: `${base}-eisenwho`, placeholder: T.eisenMe } : {})}
          onBlur={(e) => commit(k, e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), commit(k, (e.target as HTMLInputElement).value))}
        />
      </label>
    );
    return (
      <div className="pjf__eisen">
        <div className="pjf__figbar" role="group" aria-label={T.eisenGroup}>
          {mats.length > 0 && mat && (
            <span className="layouts__label pj__wheel pjf__figwho">
              <span aria-hidden="true">{T.eisenWhich}</span>
              <ModeWheel label={T.eisenWhich} value={mat.id} onChange={(id) => (eisen({ kind: 'select', view: id }), say(mats.find((v) => v.id === id)?.name ?? ''))} options={mats.map((v) => { const pj = Sh.matrixProject(v); return { id: v.id, name: v.name, hint: pj === p.id ? T.eisenOwnHint : pj && Sh.subProjectIds(ws, p.id).has(pj) ? T.eisenOfSub((ws.projects ?? []).find((x) => x.id === pj)?.name ?? '') : T.eisenMapHint }; })} />
            </span>
          )}
          <span className="pjf__figacts2">
            <button type="button" className="help__run" title={T.eisenNewHint} onClick={newMatrix}>
              <Icon name="plus" size={12} className="icon icon--inline" /> {T.eisenNewBtn}
            </button>
            <button type="button" className="help__run" data-pick="map" aria-expanded={eisenPick === 'map'} title={T.eisenMapBtnHint} onClick={() => (eisenPick === 'map' ? closePick() : openPick('map'))}>
              {T.eisenMapBtn}
            </button>
            {mat && (
              <button type="button" className="help__run" data-pick="take" aria-expanded={eisenPick === 'take'} title={T.eisenTakeHint} onClick={() => (eisenPick === 'take' ? closePick() : openPick('take'))}>
                {T.eisenTakeBtn}
              </button>
            )}
            {mat && (matOwn || (p.eisenMaps ?? []).includes(mat.id)) && (
              <button type="button" className="help__run" title={matOwn ? T.eisenDeleteHint : T.eisenUnmapHint} onClick={dropMatrix}>
                {matOwn ? <><Icon name="trash" size={12} className="icon icon--inline" /> {T.eisenDeleteBtn}</> : T.eisenUnmapBtn}
              </button>
            )}
          </span>
        </div>
        {eisenPick && (
          <div className="pjf__eisenpick sunken" role="dialog" aria-label={eisenPick === 'map' ? T.eisenMapBtn : T.eisenTakeBtn} ref={pickRef} onKeyDown={(e) => e.key === 'Escape' && (e.stopPropagation(), closePick())}>
            <p className="help__text">{eisenPick === 'map' ? T.eisenMapIntro : T.eisenTakeIntro}</p>
            {pickList.length ? (
              <ul className="pjf__eisenlist">
                {pickList.map((x) => (
                  <li key={x.id}>
                    <label className="pjf__check">
                      <input type="checkbox" checked={pickSel.includes(x.id)} onChange={(e) => setPickSel(e.target.checked ? [...pickSel, x.id] : pickSel.filter((y) => y !== x.id))} /> {x.name}
                      {x.hint && <span className="lc__muted"> – {x.hint}</span>}
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="lc__muted">{eisenPick === 'map' ? T.eisenMapNone : T.eisenTakeNone}</p>
            )}
            <span className="pjf__figacts2">
              {eisenPick === 'take' && pickList.length > 1 && (
                <button type="button" className="help__run" onClick={() => setPickSel(pickSel.length === pickList.length ? [] : pickList.map((x) => x.id))}>
                  {pickSel.length === pickList.length ? T.eisenNoneBtn : T.eisenAllBtn}
                </button>
              )}
              {pickList.length > 0 && (
                <button type="button" className="help__run" onClick={applyPick}>
                  {T.eisenApply}
                </button>
              )}
              <button type="button" className="help__run" onClick={closePick}>
                {T.eisenCancel}
              </button>
            </span>
          </div>
        )}
        {mat && (
          <div className="pjf__eisenmeta">
            {field('name', T.eisenName, 'text', T.eisenNameHint)}
            {field('person', T.eisenPerson, 'text', T.eisenPersonHint)}
            {field('date', T.eisenDate, 'date', T.eisenDateHint)}
            <datalist id={`${base}-eisenwho`}>
              {names.map((n) => <option key={n} value={n} />)}
            </datalist>
          </div>
        )}
      </div>
    );
  };
  /** V144 (F-238 S6, F-232 P8): Freigabe wie im Steckbrief – je Unterschrift Tinte (oder Knopf „Unterschreiben“), Linie
   *  mit der Rolle und – in 8.3 – das Datum darunter. Meldung mit Rückgängig an der Formular-Meldung. */
  const releaseRow = (rowId: string, list: Fk.FormCol[], span: number) => {
    const byKey = new Map(list.map((c) => [c.key, c]));
    // V145: Namen wie im Bericht (reportSigns) – AP-Verantwortlich aus dem Arbeitspaket, Projektleitung aus der Rolle „lead“
    const known = Rp.reportSigns(ws, p, form, rowId);
    const owner = form.source === 'wp' ? Ps.personById(ws, String(Fk.cellValue(ws, p.id, form, rowId, 'assignee') ?? ''))?.name : known.find((g) => g.label.endsWith('AP-Verantwortlich'))?.name;
    const lead = known.find((g) => g.label.endsWith('Projektleitung'))?.name ?? Rp.leadName(ws, p);
    const all = [
      { ink: 'inkOwner', date: 'releaseOwner', label: T.signOwner, name: owner },
      { ink: 'inkPl', date: 'releasePl', label: T.signPl, name: lead },
    ] as const;
    // Statusbericht (12): nur die Projektleitung unterschreibt (wie Abb. 15)
    const signs = form.source === 'reports' ? all.filter((g) => g.ink === 'inkPl') : all;
    return (
      <tr className="paper__release">
        <th scope="row">{T.release}</th>
        <td colSpan={span} className="paper__sub">
          <div className="paper__signs">
            {signs.map((g) => {
              const ref = Fk.cellValue(ws, p.id, form, rowId, g.ink);
              const inkRef = typeof ref === 'string' && ref ? ref : undefined;
              const dc = byKey.get(g.date);
              const put = (v: string | null) => run({ op: 'ink', pid: p.id, form, row: rowId, key: g.ink, ref: v, at: Date.now() });
              return (
                <div key={g.ink} className={`paper__sign${inkRef ? ' has-ink' : ''}`}>
                  <InkSign
                    label={g.label}
                    inkRef={inkRef}
                    name={g.name}
                    save={put}
                    onRemove={() => (put(null), tell(T_INK.signRemoved, () => put(inkRef ?? null)))}
                    onDone={(t) => tell(t, inkRef ? undefined : () => put(null))}
                  />
                  {g.name && <span className="paper__signname">{g.name}</span>}
                  <span className="paper__signline">{g.label}</span>
                  {dc && <Cell ws={ws} p={p} form={form} rowId={rowId} col={dc} miss={miss.has(`${rowId}|${dc.key}`)} label={T.signDate(g.label)} onSet={setValue} />}
                </div>
              );
            })}
          </div>
        </td>
      </tr>
    );
  };
  /** Feldliste wie im Report: zweispaltige Tabelle Bezeichnung | Wert */
  /** V142 (Report Abb. 11): Arbeitspaketbeschreibung als Blatt mit vier Spalten – kurze Angaben paarweise, lange über die ganze
   *  Breite, Kopf dunkel mit dem Namen des Formulars, Projektname und -nummer aus dem Steckbrief. */
  const sheetKv = (rowId: string, list: Fk.FormCol[], layout: readonly (readonly string[])[]) => {
    const byKey = new Map(list.map((c) => [c.key, c]));
    const used = new Set(layout.flat());
    const rest = list.filter((c) => !used.has(c.key)).map((c) => [c.key]);
    const cell = (c: Fk.FormCol, span = false) => {
      const m = miss.has(`${rowId}|${c.key}`);
      return (
        <>
          <th scope="row" className={m ? 'is-miss' : undefined}>
            {c.label}
            {c.required && <span className="pjf__req" title={T.required} aria-label={T.required}>*</span>}
          </th>
          <td colSpan={span ? 3 : undefined} className={`pjf__cell is-${c.kind}${m ? ' is-miss' : ''}`}>
            <Cell ws={ws} p={p} form={form} rowId={rowId} col={c} miss={m} label={c.label} onSet={setValue} />
            {c.help && <span className="pjf__help">{c.help}</span>}
          </td>
        </>
      );
    };
    const wv = form.source === 'wp' ? wpView(ws, p, rowId) : undefined;
    const calc = (k: string, span = false) => {
      const [label, value, help] = (
        {
          '=project': [T.sheetProject, wv?.project ?? ''],
          '=projectNo': [T.sheetProjectNo, wv?.projectNo ?? ''],
          '=part': [T.wpPart, wv?.part ?? ''],
          '=lead': [T.wpLead, wv?.lead ?? ''],
          '=duration': [T.wpDuration, wv?.duration ?? '', T.wpFromGantt],
          '=preds': [T.wpPreds, (wv?.preds ?? []).join('\n'), T.wpFromNet],
          '=succs': [T.wpSuccs, (wv?.succs ?? []).join('\n'), T.wpFromNet],
          '=staff': [T.wpStaff, wv ? staffLines(wv).join('\n') : '', T.wpFromUse],
        } as Record<string, [string, string, string?]>
      )[k] ?? [k, ''];
      return (
        <>
          <th scope="row">{label}</th>
          <td colSpan={span ? 3 : undefined} className="pjf__static">
            <span className="pjf__lines">{value || '–'}</span>
            {help && <span className="pjf__help">{help}</span>}
          </td>
        </>
      );
    };
    return (
      <table className="paper__table pjf__kv pjf__sheet">
        <colgroup>
          <col className="pjf__sheetL" />
          <col />
          <col className="pjf__sheetL" />
          <col />
        </colgroup>
        <thead>
          <tr>
            {/* V146 (F-232 P10, Report S. 19): QR-Code oben links – führt zu diesem Arbeitspaket in E-Sources */}
            {form.source === 'wp' && appBase() ? (
              <>
                <td className="pjf__sheetqr" dangerouslySetInnerHTML={{ __html: qrSvg(projectLinkUrl(appBase(), { project: p.id, form: form.id, row: rowId }), 74, T.qrLabel) }} />
                <th colSpan={3} scope="col" className="pjf__sheethead">{form.name}</th>
              </>
            ) : (
              <th colSpan={4} scope="col" className="pjf__sheethead">{form.name}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {[...layout, ...rest].map((keys) => {
            // V148: gerechnete Angaben (Projektname, Teilaufgabe, Projektleiter, Dauer, Vorgänger/Nachfolger, Personal) als Text
            const parts = keys.map((k) => (k.startsWith('=') ? k : byKey.get(k))).filter((c): c is Fk.FormCol | string => !!c);
            if (!parts.length) return null;
            if (form.source === 'wp' && keys.join('|') === 'releasePl|releaseOwner') return <Fragment key="release">{releaseRow(rowId, list, 3)}</Fragment>;
            const one = (c: Fk.FormCol | string, span: boolean) => (typeof c === 'string' ? <Fragment key={c}>{calc(c, span)}</Fragment> : <Fragment key={c.key}>{cell(c, span)}</Fragment>);
            return <tr key={keys.join('|')}>{parts.length === 1 ? one(parts[0], true) : parts.map((c) => one(c, false))}</tr>;
          })}
        </tbody>
      </table>
    );
  };
  const kv = (rowId: string, list: Fk.FormCol[]) => (
    <table className="paper__table pjf__kv">
      <colgroup>
        <col className="paper__colL" />
        <col />
      </colgroup>
      <tbody>
        {list.map((c) => (
          <tr key={c.key} className={miss.has(`${rowId}|${c.key}`) ? 'is-miss' : undefined}>
            <th scope="row">
              {c.label}
              {c.required && <span className="pjf__req" title={T.required} aria-label={T.required}>*</span>}
            </th>
            <td className={`pjf__cell is-${c.kind}${miss.has(`${rowId}|${c.key}`) ? ' is-miss' : ''}`}>
              <Cell ws={ws} p={p} form={form} rowId={rowId} col={c} miss={miss.has(`${rowId}|${c.key}`)} label={c.label} onSet={setValue} />
              {c.help && <span className="pjf__help">{c.help}</span>}
            </td>
          </tr>
        ))}
        {(form.source === 'wpReports' || form.source === 'reports') && releaseRow(rowId, list, 1)}
      </tbody>
    </table>
  );

  return (
    <section className="dc pjs pjf" aria-labelledby={`${base}-head`}>
      <header className={`dc__top${topOvf.cls}`} ref={topRef}>
        {/* V137 (Enrico 13:00 „Der Kapitel Scroll Button verspringt immer … muss nach ganz links“): Kapitel-Rad vorn, damit es beim Drehen nicht wandert */}
        <span className="layouts__label pj__wheel pjf__chapter">
          <span aria-hidden="true">{T.chapter}</span>
          <ModeWheel
            label={T.chapter}
            value={form.id}
            onChange={setFid}
            wrap
            options={tpl.forms.map((f) => ({ id: f.id, name: `${f.chapter} ${f.name}`, hint: [f.icb ? `ICB4 ${f.icb}` : '', f.stage ? `Stufe ${f.stage}` : ''].filter(Boolean).join(' · ') }))}
          />
        </span>
        <h4 id={`${base}-head`} className="dc__head">{T.head(p.name)}</h4>
        {templates.length > 1 && (
          <span className="layouts__label pj__wheel">
            <span aria-hidden="true">{T.template}</span>
            <ModeWheel
              label={T.template}
              value={tpl.id}
              onChange={(id) => (run({ op: 'template', pid: p.id, template: id, at: Date.now() }), tell(T.templateSet(templates.find((t) => t.id === id)?.name ?? '')))}
              options={templates.map((t) => ({ id: t.id, name: t.name, hint: T.templateHint }))}
            />
          </span>
        )}
        {Fk.canAddRow(form) && form.source !== 'uses' && form.source !== 'accept' && form.source !== 'wpReports' && (
          <button type="button" className="help__run pjf__addrow" title={T.addRowHint} onClick={() => add()}>
            <Icon name="plus" size={13} className="icon icon--inline" /> {T.addRow}
          </button>
        )}
        {form.layout !== 'figure' && <button type="button" className="help__run pjf__fieldsbtn" aria-expanded={panel} aria-controls={`${base}-fields`} title={T.fieldsHint} onClick={() => setPanel(!panel)}>
          {T.fields}
        </button>}
        <span className={`pjf__open${openCount ? ' is-open' : ''}`} title={T.openHint}>
          {openCount ? T.open(openCount) : T.allSet}
        </span>
        {dups.size > 0 && (
          <span className="pjf__open pjf__dup is-open" role="status" title={T.dupHint([...dups.keys()].join(', '))}>
            {T.dup(dups.size)}
          </span>
        )}
        <button type="button" className="help__run pjf__report" title={T.reportHint} onClick={openReport}>
          <Icon name="export" size={13} className="icon icon--inline" /> {T.report}
        </button>
        {!inPad && <WorkPadButton tab="forms" project={p.id} />}
        {topOvf.knob}
        <button type="button" className="help__run pjf__tour" title={T.tourHint} aria-label={T.tourHint} onClick={() => requestTour('forms')}>
          <Icon name="tour" size={13} className="icon icon--inline" /> {T.tour}
        </button>
      </header>
      <p className="help__text dc__why">
        {form.chapter} {form.name}
        {form.icb ? ` · ICB4 ${form.icb}` : ''} – {PSP_TEXT.viewHint.forms}. <span className="pjf__keys">{T.keysHint}</span>
      </p>
      {msg && (
        <p className="sheet__msg dc__msg" role="status">
          {msg.text}
          {msg.undo && <button type="button" className="note__undo" onClick={() => (msg.undo!(), setMsg(null), say(T.undone))}>{T.undo}</button>}
        </p>
      )}
      {panel && <FieldsPanel id={`${base}-fields`} ws={ws} p={p} form={form} run={run} tell={tell} onClose={() => setPanel(false)} />}
      {form.source === 'uses' && (
        <form className="dc__new" aria-label={T.addRowHint} onSubmit={(e) => (e.preventDefault(), useTask && usePerson && add({ task: useTask, person: usePerson }))}>
          <label>
            <span className="fbq__label">{T.usesTask}</span>
            <select value={useTask} onChange={(e) => setUseTask(e.target.value)}>
              <option value="">{T.none}</option>
              {tasks.map((t, i) => (
                <option key={t.id} value={t.id}>{String(Fk.cellValue(ws, p.id, Fk.GPM_D.forms.find((f) => f.id === 'tasks')!, t.id, 'code') ?? '')} {String(Fk.cellValue(ws, p.id, Fk.GPM_D.forms.find((f) => f.id === 'tasks')!, t.id, 'title') ?? i + 1)}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="fbq__label">{T.usesPerson}</span>
            <select value={usePerson} onChange={(e) => setUsePerson(e.target.value)}>
              <option value="">{T.none}</option>
              {persons.map((x) => (
                <option key={x.id} value={x.id}>{x.name}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="fbq__save" disabled={!useTask || !usePerson}>{T.usesAdd}</button>
        </form>
      )}
      {form.source === 'wpReports' && (
        <form className="dc__new" aria-label={T.wpReportAdd} onSubmit={(e) => (e.preventDefault(), add(acceptTask ? { task: acceptTask } : undefined))}>
          <label>
            <span className="fbq__label">{T.wpReportAt}</span>
            <select value={acceptTask} onChange={(e) => setAcceptTask(e.target.value)}>
              <option value="">{T.none}</option>
              {tasks.map((t, i) => (
                <option key={t.id} value={t.id}>{String(Fk.cellValue(ws, p.id, taskForm, t.id, 'code') ?? '')} {String(Fk.cellValue(ws, p.id, taskForm, t.id, 'title') ?? i + 1)}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="fbq__save" disabled={!tasks.length}>{T.wpReportAdd}</button>
        </form>
      )}
      {form.source === 'accept' && (
        <form className="dc__new" aria-label={T.addRowHint} onSubmit={(e) => (e.preventDefault(), add(acceptTask ? { task: acceptTask } : undefined))}>
          <label>
            <span className="fbq__label">{T.acceptAt}</span>
            <select value={acceptTask} onChange={(e) => setAcceptTask(e.target.value)}>
              <option value="">{T.none}</option>
              {targets.map((t, i) => (
                <option key={t.id} value={t.id}>{String(Fk.cellValue(ws, p.id, taskForm, t.id, 'code') ?? '')} {String(Fk.cellValue(ws, p.id, taskForm, t.id, 'title') ?? i + 1)}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="fbq__save" disabled={!targets.length}>{T.acceptAdd}</button>
        </form>
      )}
      {isCharter ? (
        <>
          <p className="help__text pjf__sheetnote">{T.sheetCharter}</p>
          <ProjectSheet ws={ws} p={p} dispatch={dispatch} say={say} />
        </>
      ) : (
      <div className="paper__wrap">
        <div className="paper__bar">
          <PaperSizeWheel size={size} setSize={setSize} />
          <span className="lc__muted">{wide ? T.sheetWide : T.sheetHint}</span>
        </div>
        <article className={`paper paper--form${wide ? ' is-wide' : ''}`} style={paperZoom(size)} aria-label={T.sheetTitle(`${form.chapter} ${form.name}`, p.name)}>
          <header className="paper__head">
            <span className="paper__chapter">{form.name}{form.icb ? ` [${form.icb}]` : ''}</span>
            <span className="paper__project">{p.name}</span>
          </header>
          <h2 className="paper__h">{form.chapter} {form.name}</h2>
      {form.layout === 'chart' && curve && (
        <figure className="pjf__figure">
          {curve.months.length ? (
            <>
              <div className="pjf__svg" dangerouslySetInnerHTML={{ __html: Rp.curveSvg(curve, UI_COLORS, 720, 260) }} />
              <figcaption className="help__text">
                {T.chartSum(eur(curve.total), curve.hours.toLocaleString('de-DE'), curve.unplanned)}
                {curve.actual > 0 && ` · ${T.chartActual(eur(curve.actual))}`}
              </figcaption>
            </>
          ) : (
            <p className="lc__muted">{T.chartNone}</p>
          )}
        </figure>
      )}
      {evc && (
        <figure className="pjf__figure">
          {evc.bac > 0 && evc.pv.length > 1 ? (
            <>
              <div className="pjf__svg" dangerouslySetInnerHTML={{ __html: Rp.evSvg(evc, { ...UI_COLORS, bar: 'var(--muted)' }, 720, 300) }} />
              <figcaption className="help__text">{T.evSum(evc.points.length - 1, evc.points.filter((x) => x.est).length)}</figcaption>
            </>
          ) : (
            <p className="lc__muted">{T.evNone}</p>
          )}
        </figure>
      )}
      {mta && (
        <figure className="pjf__figure">
          {mta.rows.some((r) => r.series.some(Boolean)) ? (
            <>
              <div className="pjf__svg" dangerouslySetInnerHTML={{ __html: Rp.mtaSvg(mta, Rp.mtaNames(ws, p.id), UI_COLORS) }} />
              <figcaption className="help__text">{T.mtaSum(mta.points.length, !!p.baseline)}</figcaption>
            </>
          ) : (
            <p className="lc__muted">{T.mtaNone}</p>
          )}
        </figure>
      )}
      {form.layout === 'portfolio' && (
        <figure className="pjf__figure">
          {/* V141 (Enrico 15:03): Rad „Einträge“ Gekürzt · Alle wie in der Eisenhower-Matrix (gemeinsam gemerkt) */}
          <span className="layouts__label pj__wheel pjf__figwho">
            <span aria-hidden="true">{T.figAll}</span>
            <ModeWheel label={T.figAll} value={eisenAll ? 'all' : 'short'} onChange={(v) => setEisenMode(v as 'short' | 'all')} options={[{ id: 'short', name: T.figAllShort, hint: T.figAllShortHint }, { id: 'all', name: T.figAllAll, hint: T.figAllAllHint }]} />
          </span>
          <div className="pjf__svg is-portfolio" dangerouslySetInnerHTML={{ __html: form.filter === 'sh' ? shPortfolioSvg(p, dots, undefined, eisenAll) : envPortfolioSvg(p, dots, undefined, eisenAll) }} />
          <figcaption className="help__text">
            {T.portfolioHint[form.filter ?? 'env']}
            {dotsOpen > 0 && <> {T.portfolioOpen(dotsOpen)}</>}
          </figcaption>
        </figure>
      )}
      {form.figure && form.layout !== 'record' && figureBlock()}
      <div ref={body} className="pjf__body">
        {form.layout === 'figure' ? null : form.layout === 'record' ? (
          !recRow ? (
            <p className="lc__muted">{T.recordNone[form.source] ?? T.empty}</p>
          ) : (
            <>
              <div className="pjf__recbar">
                <button type="button" className="remind__x" aria-label={T.recordPrev} title={T.recordPrev} disabled={recAt <= 0} onClick={() => setRec(rows[recAt - 1].id)}>
                  <Icon name="chevronUp" size={12} />
                </button>
                <label>
                  <span className="sr-only">{T.recordPick(T.recordWhat[form.source] ?? '')}</span>
                  <select value={recRow.id} onChange={(e) => setRec(e.target.value)} aria-label={T.recordPick(T.recordWhat[form.source] ?? '')}>
                    {rows.map((r, i) => (
                      <option key={r.id} value={r.id}>
                        {form.source === 'reports'
                          ? `${Rp.displayValue(ws, p, { key: 'date', label: '', kind: 'date' }, Fk.cellValue(ws, p.id, form, r.id, 'date'))}`
                          : form.source === 'wpReports'
                          ? `${String(Fk.cellValue(ws, p.id, form, r.id, 'task') ?? '')} – ${Rp.displayValue(ws, p, { key: 'date', label: '', kind: 'date' }, Fk.cellValue(ws, p.id, form, r.id, 'date'))}`
                          : form.source === 'teamRoles'
                          ? `${Ps.personById(ws, String(Fk.cellValue(ws, p.id, form, r.id, 'person') ?? ''))?.name ?? `${i + 1}`}`
                          : `${'  '.repeat(r.depth ?? 0)}${String(Fk.cellValue(ws, p.id, form, r.id, 'code') ?? '')} ${rowLabel(r.id, i)}`}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" className="remind__x" aria-label={T.recordNext} title={T.recordNext} disabled={recAt >= rows.length - 1} onClick={() => setRec(rows[recAt + 1].id)}>
                  <Icon name="chevronDown" size={12} />
                </button>
                <span className="lc__muted">{T.recordOf(recAt + 1, rows.length)}</span>
                <button type="button" className="remind__x" aria-label={`${T.remove}: ${rowLabel(recRow.id, recAt)}`} title={T.remove} onClick={() => remove(recRow.id, recAt)}>
                  <Icon name="trash" size={12} />
                </button>
              </div>
              {form.source === 'reports' && <p className="help__text">{T.reportFrozen}</p>}
              {form.figure && figureBlock()}
              <div className="pjf__fields is-kv" data-row={recRow.id} key={recRow.id}>
                {form.source === 'wp' ? sheetKv(recRow.id, cols, WP_SHEET) : kv(recRow.id, cols)}
              </div>
            </>
          )
        ) : form.layout === 'fields' ? (
          <div className="pjf__fields is-kv" data-row={rows[0]?.id}>
            {kv(rows[0]?.id ?? p.id, cols)}
          </div>
        ) : !rows.length ? (
          form.layout === 'chart' ? null : <p className="lc__muted">{form.source === 'persons' ? T.personsNone : form.source === 'conflicts' && (p.goals?.length ?? 0) < 2 ? T.conflictsNone : T.empty}</p>
        ) : (
          <div className="pjs__left">
            {form.layout === 'chart' && <p className="fbq__label pjf__tabhead">{form.source === 'mta' ? T.mtaTable : T.chartTable}</p>}
            <table className="pc__table pjf__table is-fixed" aria-labelledby={`${base}-head`}>
              {/* V134 (Enrico 11:25 „muss in der Breite zur Seite passen … bei allen anderen auch“): feste Aufteilung nach Spaltenart, Summe = Blattbreite */}
              <colgroup>
                {cols.map((c) => (
                  <col key={c.key} style={{ width: `${(100 * colWeight(c)) / cols.reduce((a, x) => a + colWeight(x), 0)}%` }} />
                ))}
                <col className="pjf__actcol" />
              </colgroup>
              <thead>
                <tr>
                  {cols.map((c) => (
                    <th key={c.key} scope="col" title={c.help}>
                      {c.label}
                      {c.required && <span className="pjf__req" aria-label={T.required}>*</span>}
                    </th>
                  ))}
                  <th scope="col"><span className="sr-only">{T.rowMenu('')}</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const lbl = rowLabel(r.id, i);
                  return (
                    <tr key={r.id} data-row={r.id} onKeyDown={(e) => rowKey(e, r.id)}>
                      {cols.map((c, j) => (
                        <td key={c.key} className={`pjf__cell is-${c.kind}${miss.has(`${r.id}|${c.key}`) ? ' is-miss' : ''}${c.key === 'code' && dupRows.has(r.id) ? ' is-dup' : ''}`} title={c.key === 'code' && dupRows.has(r.id) ? T.dupCell(String(Fk.cellValue(ws, p.id, form, r.id, 'code') ?? '')) : undefined} style={j === cols.indexOf(labelCol!) && r.depth ? { paddingLeft: `${8 + r.depth * 14}px` } : undefined}>
                          <Cell ws={ws} p={p} form={form} rowId={r.id} col={c} miss={miss.has(`${r.id}|${c.key}`)} label={`${c.label} – ${lbl}`} onSet={setValue} />
                        </td>
                      ))}
                      <td className="pjf__acts">
                        {Fk.canMoveRow(form) && (
                          <>
                            <button type="button" className="remind__x" aria-label={`${T.up}: ${lbl}`} title={T.up} disabled={i === 0} onClick={() => move(r.id, -1)}>
                              <Icon name="chevronUp" size={12} />
                            </button>
                            <button type="button" className="remind__x" aria-label={`${T.down}: ${lbl}`} title={T.down} disabled={i === rows.length - 1} onClick={() => move(r.id, 1)}>
                              <Icon name="chevronDown" size={12} />
                            </button>
                          </>
                        )}
                        {Fk.canRemoveRow(form) && (
                          <button type="button" className="remind__x" aria-label={`${T.remove}: ${lbl}`} title={T.remove} onClick={() => remove(r.id, i)}>
                            <Icon name="trash" size={12} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {form.source === 'ev' && rows.length > 0 && (() => {
                // V115: Summenzeile wie im Bericht – Kennzahlen für das ganze Projekt zum Stichtag
                const day = Fk.evDay();
                const t = earnedValue(ws, p.id, day).total;
                const money = (v: number) => `${Fk.fmtNumber(Math.round(v), 'money')} €`;
                const sum: Record<string, string> = { code: '', title: `Projekt (Stichtag ${dmy(day)})`, bac: money(t.bac), pv: money(t.pv), ev: money(t.ev), ac: money(t.ac), sv: money(t.sv), cv: money(t.cv), spi: t.spi !== undefined ? Fk.fmtNumber(t.spi, 'number', 2) : T.none, cpi: t.cpi !== undefined ? Fk.fmtNumber(t.cpi, 'number', 2) : T.none, eac: money(t.eac) };
                return (
                  <tfoot>
                    <tr className="pjf__sum">
                      {cols.map((c) => (
                        <td key={c.key} className={`pjf__cell is-${c.kind}`}>
                          <span className="pjf__ro">{sum[c.key] ?? ''}</span>
                        </td>
                      ))}
                      <td />
                    </tr>
                  </tfoot>
                );
              })()}
            </table>
          </div>
        )}
      </div>
          <p className="paper__caption">{T.sheetCaption(form.name)}</p>
        </article>
      </div>
      )}
    </section>
  );
}

/** V137: Felder je Kasten im Blatt (Kurzfassung des Formulars dahinter). */
const FIG_FIELDS: Record<string, string[]> = {
  charter: ['name', 'no', 'goal'],
  goals: ['code', 'text', 'measure', 'level', 'owner'],
  nongoals: ['code', 'text', 'consequence'],
  tasks: ['title', 'assignee', 'phase', 'hours', 'cost'],
  // V138: im Balkenplan zusätzlich die Termine
  ganttTasks: ['title', 'duration', 'notBefore', 'due', 'assignee', 'phase'],
  roles: ['name', 'person', 'parent', 'kind', 'link', 'org'],
  // V138: Phasenplan, Balkenplan, Eisenhower (Nachrichtenquadrat und Belbin öffnen genau das angeklickte Feld)
  phases: ['name', 'start', 'end', 'focus', 'share'],
  milestones: ['code', 'title', 'due', 'phase'],
  eisenhower: ['code', 'title', 'important', 'urgent', 'quadrant'],
};
/** V138: Formulare, deren Zeilen im Blatt nicht gelöscht werden (Eisenhower = Sicht auf die Arbeitspakete; Einzelfelder) */
const FIG_NO_REMOVE = new Set(['messages', 'teamRoles']);

/**
 * V137 (Enrico 12:59): Bearbeiten in der Grafik – Felder des Kastens am Ort (unter dem Kasten), dazu „Unterpunkt anlegen“
 * und Löschen mit Rückgängig. Esc schließt und gibt den Fokus an den Kasten zurück (NF-03), Meldungen im Fenster (F-214).
 */
function FigEditor({ edit, fig, ws, p, tpl, run, tell, say, by, onOpen, onClose }: { edit: { key: string; x: number; y: number }; fig?: string; ws: Workspace; p: Project; tpl: ReturnType<typeof Fk.templateOf>; run: (o: Fk.FormOp) => void; tell: (t: string, undo?: () => void) => void; say: (t: string) => void; by?: string; onOpen: (key: string) => void; onClose: (back: boolean) => void }) {
  // „Formular:Zeile“ oder (V138) „Formular:Zeile:Feld“ – dann nur dieses eine Feld (Nachrichtenquadrat, Belbin)
  const [fid, row, field] = edit.key.split(':');
  const form = tpl.forms.find((f) => f.id === fid) ?? Fk.GPM_D.forms.find((f) => f.id === fid);
  const box = useRef<HTMLDivElement>(null);
  const [note, setNote] = useState('');
  useEffect(() => {
    window.setTimeout(() => {
      const el = box.current?.querySelector<HTMLElement>('input:not([type=checkbox]), textarea, select');
      el?.focus();
      // V140: Vorgabetext eines neuen Eintrags („Neuer Eintrag“ …) markieren – Tippen ersetzt ihn
      if (el instanceof HTMLInputElement && /^Neue[rs]? /.test(el.value)) el.select();
    }, 0);
  }, []);
  if (!form) return null;
  const keys = field ? [field] : ((fig === 'gantt' && fid === 'tasks' ? FIG_FIELDS.ganttTasks : FIG_FIELDS[fid]) ?? []);
  // V138: auch Felder, die das Formular nicht als Spalte zeigt (z. B. Dauer im Balkenplan)
  const all = Fk.columnsOf(p, { ...form, columns: [...form.columns, ...keys.filter((k) => !form.columns.some((c) => c.key === k)).map((key) => ({ key }))] }, true);
  const cols = all.filter((c) => keys.includes(c.key)).sort((a, b) => keys.indexOf(a.key) - keys.indexOf(b.key));
  const rows = Fk.rowsOf(ws, p.id, form);
  if (fid !== 'charter' && !rows.some((r) => r.id === row)) return null;
  const set = (r: string, key: string, value: Fk.CellValue) => (run({ op: 'cell', pid: p.id, form, row: r, key, value, at: Date.now(), by }), setNote(T.figSaved));
  const name = field ? (cols[0]?.label ?? field) : String(Fk.cellValue(ws, p.id, form, row, cols[0]?.key === 'code' ? (cols[1]?.key ?? '') : (cols[0]?.key ?? '')) ?? '');
  const child = (rkind?: 'staff' | 'external') => {
    const id = newId();
    const init = { parent: row, ...(rkind ? { rkind } : {}) };
    const r = Fk.addRow(ws, p.id, form, { id, now: Date.now(), by, init });
    if (!r) return;
    run({ op: 'add', pid: p.id, form, id, at: Date.now(), by, init });
    tell(T.added, () => run({ op: 'remove', pid: p.id, form, row: r.id, at: Date.now() }));
    onOpen(`${fid}:${r.id}`);
  };
  const remove = () => {
    const r = Fk.removeRow(ws, p.id, form, row, Date.now());
    if (!r) return;
    run({ op: 'remove', pid: p.id, form, row, at: Date.now() });
    tell(T.removed(name || row), () => run({ op: 'undoRow', undo: r.undo, at: Date.now() }));
    onClose(false);
  };
  return (
    <div
      ref={box}
      className="pjf__figedit sunken"
      role="dialog"
      aria-label={T.figEditTitle(name || form.name)}
      style={{ left: edit.x, top: edit.y }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') (e.preventDefault(), e.stopPropagation(), onClose(true));
      }}
    >
      <p className="fbq__label">{T.figEditTitle(`${form.chapter} ${form.name}`)}</p>
      {/* V148 (offen seit V138): im schreibgeschützten Live-Projekt der Hinweis am Ort, nicht erst nach dem Abweisen */}
      {p.id === LIVE_PROJECT && liveLocked() && (
        <p className="pj__readonly" role="note">
          <Icon name="lock" size={13} className="icon icon--inline" /> <strong>{T_PJ.liveLocked}</strong> {T_PJ.liveEditHint}
        </p>
      )}
      <table className="paper__table pjf__kv">
        <tbody>
          {cols.map((c) => (
            <tr key={c.key}>
              <th scope="row">{c.label}</th>
              <td className={`pjf__cell is-${c.kind}`}>
                <Cell ws={ws} p={p} form={form} rowId={fid === 'charter' ? p.id : row} col={c} miss={false} label={field ? `${c.label} – ${form.name}` : `${c.label} – ${name}`} onSet={set} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {note && <p className="sheet__msg" role="status">{note}</p>}
      <div className="pjf__figacts">
        {T.figChild[fid] && <button type="button" className="help__run" onClick={() => child()}><Icon name="plus" size={12} className="icon icon--inline" /> {T.figChild[fid]}</button>}
        {fid === 'roles' && (
          <>
            <button type="button" className="help__run" onClick={() => child('staff')}><Icon name="plus" size={12} className="icon icon--inline" /> {T.figStaff}</button>
            <button type="button" className="help__run" onClick={() => child('external')}><Icon name="plus" size={12} className="icon icon--inline" /> {T.figExternal}</button>
          </>
        )}
        {/* V138 (Enrico 13:17 „Knöpfe überall gut aufteilen“): Anlegen links, Löschen und Schließen rechts abgesetzt */}
        <span className="pjf__figacts-end" />
        {fid !== 'charter' && !field && !FIG_NO_REMOVE.has(fid) && <button type="button" className="help__run" onClick={remove}><Icon name="trash" size={12} className="icon icon--inline" /> {T.remove}</button>}
        <button type="button" className="help__run" onClick={() => (onClose(true), say(T.figClose))}>{T.figClose}</button>
      </div>
    </div>
  );
}

/** V142/V148 (Report Abb. 11): Anordnung der Arbeitspaketbeschreibung – Paare nebeneinander, einzelne über die ganze
 *  Breite, Reihenfolge wie auf dem Blatt des Reports. Schlüssel mit „=“ sind gerechnete Angaben (`wpView`). */
const WP_SHEET: readonly (readonly string[])[] = [
  ['title', 'code'],
  ['=project', '=projectNo'],
  ['=part', 'phase'],
  ['=lead', 'assignee'],
  ['start', 'end'],
  ['=duration'],
  ['risks'],
  ['=preds'],
  ['inputs'],
  ['=succs'],
  ['activities'],
  ['results'],
  ['=staff', 'material'],
  ['hours', 'cost'],
  ['annex', 'method'],
  ['progress'],
  ['goal'],
  ['releasePl', 'releaseOwner'],
];

/** Eine Zelle: Eingabe je nach Art; übernimmt bei Enter bzw. beim Verlassen, Esc verwirft. */
function Cell({ ws, p, form, rowId, col, miss, label, onSet }: { ws: Workspace; p: Project; form: FormDef; rowId: string; col: Fk.FormCol; miss: boolean; label: string; onSet: (row: string, key: string, v: Fk.CellValue) => void }) {
  const v = Fk.cellValue(ws, p.id, form, rowId, col.key);
  const auto = Fk.cellAuto(ws, p.id, form, rowId, col.key);
  const shown = col.kind === 'date' ? (typeof v === 'string' ? v : '') : fmtNum(v, col.kind);
  const [draft, setDraft] = useState<string | null>(null);
  const val = draft ?? shown;
  const commit = () => {
    if (draft === null) return;
    setDraft(null);
    if (draft === shown) return;
    if (col.kind === 'number' || col.kind === 'money' || col.kind === 'pct') {
      const n = parseNum(draft);
      if (n === undefined) return;
      onSet(rowId, col.key, n);
    } else onSet(rowId, col.key, draft);
  };
  const keys = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Escape' && draft !== null) {
      e.preventDefault();
      e.stopPropagation();
      setDraft(null);
    } else if (e.key === 'Enter' && (e.currentTarget.tagName === 'INPUT' || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      commit();
    }
  };
  const common = { 'aria-label': label, 'aria-invalid': miss || undefined, 'aria-required': col.required || undefined } as const;
  if (col.readonly) {
    const text = v === undefined || v === '' ? T.none : col.kind === 'money' ? `${fmtNum(v, 'money')} €` : col.kind === 'date' && typeof v === 'string' ? dmy(v) : typeof v === 'number' ? `${fmtNum(v, col.kind, col.digits)}${col.kind === 'pct' ? ' %' : ''}` : col.options?.find((o) => o.v === v)?.label ?? String(v);
    return <span className="pjf__ro" aria-label={`${label}: ${text}`}>{text}</span>;
  }
  if (col.kind === 'bool')
    return <input type="checkbox" {...common} checked={v === true} onChange={(e) => onSet(rowId, col.key, e.target.checked)} />;
  if (col.kind === 'choice' || col.kind === 'person' || col.kind === 'goal' || col.kind === 'phase' || col.kind === 'role') {
    const options =
      col.kind === 'choice'
        ? (col.options ?? [])
        : col.kind === 'person'
          ? Ps.personList(ws).map((x) => ({ v: x.id, label: x.name }))
          : col.kind === 'goal'
            ? (p.goals ?? []).filter((g) => g.id !== rowId).map((g) => ({ v: g.id, label: `${g.code ? `${g.code} ` : ''}${g.text.split('\n')[0].slice(0, 50)}` }))
            : col.kind === 'role'
              ? (p.roles ?? []).filter((r) => r.id !== rowId).map((r) => ({ v: r.id, label: r.name }))
              : (p.phases ?? []).map((x) => ({ v: x.id, label: x.name }));
    const cur = typeof v === 'string' ? v : '';
    return (
      <select {...common} value={cur} onChange={(e) => onSet(rowId, col.key, e.target.value)}>
        <option value="">{T.none}</option>
        {cur && !options.some((o) => o.v === cur) && <option value={cur}>{cur}</option>}
        {options.map((o) => (
          <option key={o.v} value={o.v}>{o.label}</option>
        ))}
      </select>
    );
  }
  if (col.kind === 'long' || col.kind === 'lines')
    return <textarea {...common} rows={form.layout === 'fields' ? 3 : 2} value={val} maxLength={2000} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={keys} />;
  return (
    <span className="pjf__in">
      <input
        {...common}
        type={col.kind === 'date' ? 'date' : 'text'}
        inputMode={col.kind === 'number' || col.kind === 'money' || col.kind === 'pct' ? 'decimal' : undefined}
        value={val}
        maxLength={col.kind === 'text' ? 300 : 30}
        title={col.kind === 'date' && typeof v === 'string' ? dmy(v) : undefined}
        onChange={(e) => (col.kind === 'date' ? onSet(rowId, col.key, e.target.value) : setDraft(e.target.value))}
        onBlur={commit}
        onKeyDown={keys}
      />
      {auto && <span className="pjf__auto" title={T.autoHint[col.key] ?? T.auto}>{T.auto}</span>}
    </span>
  );
}

const FIELD_TYPES: FormFieldType[] = ['text', 'number', 'date', 'choice', 'bool', 'person'];

/** „Felder“: Spalten zeigen/ausblenden, eigene Felder anlegen/löschen, Vorlage speichern bzw. löschen. */
function FieldsPanel({ id, ws, p, form, run, tell, onClose }: { id: string; ws: Workspace; p: Project; form: FormDef; run: (o: Fk.FormOp) => void; tell: (t: string, undo?: () => void) => void; onClose: () => void }) {
  const all = Fk.columnsOf(p, form, true);
  const hidden = new Set(p.forms?.hidden?.[form.id] ?? []);
  const own = p.forms?.extra?.[form.id] ?? [];
  const [name, setName] = useState('');
  const [type, setType] = useState<FormFieldType>('text');
  const [options, setOptions] = useState('');
  const [req, setReq] = useState(false);
  const [tname, setTname] = useState('');
  const taken = !!name.trim() && all.some((c) => c.label.toLowerCase() === name.trim().toLowerCase());
  const ttaken = !!tname.trim() && Fk.templatesOf(ws).some((t) => t.name.toLowerCase() === tname.trim().toLowerCase());
  const addField = () => {
    const n = name.trim();
    if (!n || taken) return;
    run({ op: 'addField', pid: p.id, form: form.id, def: { id: newId(), name: n, type, ...(type === 'choice' ? { options: options.split(',') } : {}), ...(req ? { required: true } : {}) }, at: Date.now() });
    tell(T.fieldAdded(n));
    setName('');
    setOptions('');
    setReq(false);
  };
  const removeField = (fid: string, n: string) => {
    const r = Fk.removeField(ws, p.id, form.id, fid);
    if (!r) return;
    run({ op: 'removeField', pid: p.id, form: form.id, field: fid, at: Date.now() });
    tell(T.fieldRemoved(n), () => run({ op: 'undoField', undo: r.undo, at: Date.now() }));
  };
  const saveTpl = () => {
    const n = tname.trim();
    if (!n || ttaken) return;
    run({ op: 'saveTemplate', pid: p.id, name: n, id: newId(), at: Date.now() });
    tell(T.templateSaved(n));
    setTname('');
  };
  const removeTpl = (tid: string, n: string) => {
    const r = Fk.removeTemplate(ws, tid);
    if (!r) return;
    run({ op: 'removeTemplate', id: tid });
    tell(T.templateRemoved(n), () => run({ op: 'undoTemplate', ...r.undo, at: Date.now() }));
  };
  return (
    <div id={id} className="pjf__panel" role="group" aria-label={T.fieldsHead} onKeyDown={(e) => e.key === 'Escape' && (e.stopPropagation(), onClose())}>
      <fieldset>
        <legend>{T.colsShow}</legend>
        {all.map((c) => {
          const locked = !!c.required && !c.custom;
          return (
            <label key={c.key} className="pjf__check" title={locked ? T.colLocked : c.help}>
              <input type="checkbox" checked={!hidden.has(c.key)} disabled={locked} onChange={(e) => run({ op: 'hide', pid: p.id, form, key: c.key, hidden: !e.target.checked, at: Date.now() })} /> {c.label}
            </label>
          );
        })}
      </fieldset>
      <fieldset>
        <legend>{T.ownFields}</legend>
        {!own.length && <p className="lc__muted">{T.ownNone}</p>}
        <ul className="pjf__own">
          {own.map((f) => (
            <li key={f.id}>
              {f.name} <span className="lc__muted">({T.fieldTypes[f.type]}{f.required ? `, ${T.fieldRequired}` : ''})</span>
              <button type="button" className="remind__x" aria-label={T.fieldRemove(f.name)} title={T.fieldRemove(f.name)} onClick={() => removeField(f.id, f.name)}>
                <Icon name="trash" size={12} />
              </button>
            </li>
          ))}
        </ul>
        <form className="dc__new" onSubmit={(e) => (e.preventDefault(), addField())}>
          <label>
            <span className="fbq__label">{T.fieldName}</span>
            <input type="text" value={name} maxLength={60} aria-invalid={taken || undefined} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            <span className="fbq__label">{T.fieldType}</span>
            <select value={type} onChange={(e) => setType(e.target.value as FormFieldType)}>
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>{T.fieldTypes[t]}</option>
              ))}
            </select>
          </label>
          {type === 'choice' && (
            <label>
              <span className="fbq__label">{T.fieldOptions}</span>
              <input type="text" value={options} maxLength={400} onChange={(e) => setOptions(e.target.value)} />
            </label>
          )}
          <label className="pjf__check">
            <input type="checkbox" checked={req} onChange={(e) => setReq(e.target.checked)} /> {T.fieldRequired}
          </label>
          <button type="submit" className="fbq__save" disabled={!name.trim() || taken || (type === 'choice' && !options.split(',').some((o) => o.trim()))}>{T.fieldAdd}</button>
          {taken && <span className="pjf__warn" role="status">{T.fieldTaken}</span>}
        </form>
      </fieldset>
      <fieldset>
        <legend>{T.saveTemplate}</legend>
        <p className="help__text">{T.saveTemplateHint}</p>
        <form className="dc__new" onSubmit={(e) => (e.preventDefault(), saveTpl())}>
          <label>
            <span className="fbq__label">{T.templateName}</span>
            <input type="text" value={tname} maxLength={60} aria-invalid={ttaken || undefined} onChange={(e) => setTname(e.target.value)} />
          </label>
          <button type="submit" className="fbq__save" disabled={!tname.trim() || ttaken}>{T.saveTemplate}</button>
          {ttaken && <span className="pjf__warn" role="status">{T.templateTaken}</span>}
        </form>
        <ul className="pjf__own">
          {(ws.formTemplates ?? []).map((t) => (
            <li key={t.id}>
              {t.name}
              <button type="button" className="remind__x" aria-label={T.templateRemove(t.name)} title={T.templateRemove(t.name)} onClick={() => removeTpl(t.id, t.name)}>
                <Icon name="trash" size={12} />
              </button>
            </li>
          ))}
        </ul>
      </fieldset>
      <button type="button" className="help__run" onClick={onClose}>{T.close}</button>
    </div>
  );
}
