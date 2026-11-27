/**
 * F-206 Schritt 3 (V67): Pad – schwebendes Fenster über dem Desk mit Sheets als Reitern.
 * Logik in workspace/pads.ts; hier nur Darstellung, Ziehen/Größe und Tastatur.
 * Entscheidungen: Claude Doc „Pads mit Notizblock und Lageplan“ (P1–P9).
 */
import { askFeedback } from './FeedbackQuick';
import { FEEDBACK_TEXT } from '../workspace/terms';
import { type CSSProperties, type Dispatch, type KeyboardEvent, type PointerEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { useKeyboard } from './useKeyboard';
import type { Action } from '../workspace/useWorkspace';
import type { NoteViewKind, Pad as PadT, PadPlace, Workspace } from '../workspace/types';
import { DRAG_NOTE } from './SourceChips';
import * as NS from '../workspace/noteSources';
import * as No from '../workspace/notes';
import * as Sh from '../workspace/sheets';
import { PAD_MIN, type PadUndo, padUndoOf, padWith } from '../workspace/pads';
import { PAD_SHEETS_MAX } from '../workspace/noteObjects';
import { noticeLater } from '../workspace/flash';
import { switchOf } from '../workspace/ruleSet';
import { AUDIO_TEXT, BOARD_TPL_TEXT, DOCK_TEXT, DRAFT_TEXT, FOOT_TEXT, KANBAN_MORE_TEXT, TAG_TEXT, KANBAN_TEXT, MATRIX_TEXT, NOTE_TEXT, PAD_TEXT, PAUSE_TEXT, PLAN_TEXT, STAGE_TEXT, STAR_TEXT, TERMS, VOICE_TEXT } from '../workspace/terms';
import { starredViews } from '../workspace/stars';
import { archiveCount } from '../workspace/kanbanMore';
import { newId } from '../workspace/workspace';
import { type Notice, NoteTab, freshNotes } from './NoteTab';
import { type FootItem, PadFooter, type VoiceProps } from './PadFooter';
import type { AudioTake } from './useVoice';
import { clipsChanged, putClip } from '../workspace/audioStore';
import { deviceLabel } from '../workspace/transfer';
import type { VoiceTarget } from '../workspace/voice';
import type { SwipeDir } from '../workspace/footArc';
import { FMT_EVENT, type FmtTool, IMG_EVENT, type ImgDetail, INSERT_EVENT, type InsertDetail, type NoteTpl, UNINSERT_EVENT, type UninsertDetail } from './NoteEditor';
import { getClip } from '../workspace/audioStore';
import { getPic, picFileName } from '../workspace/imageStore';
import { audioFileName } from '../workspace/voice';
import * as ND from '../workspace/noteDoc';

/** V71: Wischrichtung → Werkzeug im Editor */
const FMT_OF: Record<SwipeDir, FmtTool> = { left: 'li', right: 'task', up: 'h2', down: 'bold' };
/** V71: Wischrichtung ohne offene Note → Vorlage der neuen Note (unten: Erinnerung folgt) */
// V72: ↓ = Neue Erinnerung (Titel H1, darunter Text; Zeit und Ort über die Chips „Wann?“/„Wo?“ über der Note)
const TPL_OF: Record<SwipeDir, NoteTpl | undefined> = { up: 'tpl-note', right: 'tpl-todo', left: 'tpl-list', down: 'tpl-remind' };
import { recentIn, type RecentRef } from '../workspace/pads';
import { Item, Menu, MenuPages } from './PanelFrame';
import { ModeWheel } from './ModeWheel';
import { useOverflow } from './Overflow';
import { OVERFLOW_TEXT } from '../workspace/terms';
import { openWorkPad } from './WorkPadOpen';
import { DECISION_TEXT } from '../workspace/terms';
import { SaveTemplateBar, TemplatePick } from './BoardTemplates';
import { Icon } from './Icon';
import { boardTags } from '../workspace/tags';
import { avoidStage, overlaps } from '../workspace/stage';
import type { FRect } from '../workspace/tree';
import { TodoSheet } from './SheetViews';
import { KanbanSheet } from './KanbanSheet';
import { MatrixSheet } from './MatrixSheet';
import { RemindAlarm, useReminders } from './RemindAlarm';
import { remindLabel } from '../workspace/remind';
import { useDisplay } from './SiteIcon';
import { KNOB_OP_MIN, OPACITY_MIN, OPACITY_STEP, setDockOpacity, setKnobOpacity, setKnobX, setPadOpacity, setVoice } from '../workspace/display';
import type { IconName } from '../workspace/icons';

const KIND_ICON: Record<NoteViewKind, IconName> = { block: 'note', todo: 'todo', kanban: 'kanban', eisenhower: 'matrix' };
const KINDS: NoteViewKind[] = ['block', 'todo', 'kanban', 'eisenhower'];
const explain = (t: string) => t.replace(/^[^=]*=\s*/, '');
/** Schritt der Tastatur (Anteil der Desk-Fläche). */
const STEP = 0.02;
/** V68: Taste gedrückt halten = großer Schritt (statt eigener Tastenkombination – Alt+Strg/⌘+Pfeil wechselt im Browser den Tab). */
const STEP_HOLD = 0.06;
type BlockCmd = 'home' | 'new' | 'go' | 'search';
type Cmd = { k: BlockCmd; n: number; id?: string };

export type Edge = 'n' | 's' | 'e' | 'w' | 'se' | 'nw';
export type PadSide = 'left' | 'right' | 'top' | 'bottom';

export interface PadProps {
  ws: Workspace;
  dispatch: Dispatch<Action>;
  pad: PadT;
  desk: string;
  place: PadPlace;
  /** Innenmaß der Fläche und Abstand (wie die Slots). */
  box: { w: number; h: number; gap: number };
  top: boolean;
  /** Stapelhöhe (DOM-Reihenfolge bleibt fest, damit der Fokus beim Nach-oben-Holen nicht verloren geht). */
  z: number;
  /** Geöffnete Note je Notizblock. */
  picked: Record<string, string>;
  onPick: (sheet: string, note: string | null) => void;
  notify: (text: string) => void;
  say: (text: string) => void;
  /** F-206 Schritt 4 (V81): Pad im Dock – füllt die Leiste, ohne Ziehen/Größe und ohne Steuerknopf (K5 zurückgestellt). */
  dock?: { onWidth: (dx: number, repeat: boolean) => void; onFold: () => void };
  /** V87 (Enrico): Vollbild – Pad füllt den Desk bzw. zurück zur Übersicht (alle Pads). */
  full?: { on: boolean; toggle: () => void };
  /** F-210 (V89): Seite „Platz wählen …“ im ⋮ – Lageplan für dieses Pad (fehlt = gesperrt). */
  plan?: (done: () => void, back: () => void) => ReactNode;
  /**
   * F-210 Schritt 4 (V90, F1): im Notizen-Modus liegt das Pad lückenlos im Baum wie ein Slot –
   * Kopf ziehen = andocken/tauschen, Ränder = Grenze zum Nachbarn, Alt + Pfeil = mit Nachbar
   * tauschen, Alt + Umschalt + Pfeil = Grenze verschieben.
   */
  /** V103 (Enrico): im Desk-/Projekt-Modus – Pad nur noch im Notizen-Modus zeigen */
  toNotes?: () => void;
  tile?: {
    /** Ränder, an denen eine Grenze liegt (am Desk-Rand nicht). */
    grips: Edge[];
    onGrip: (e: PointerEvent, edge: Edge) => void;
    onHead: (e: PointerEvent) => void;
    onSwap: (dir: PadSide) => void;
    onEdge: (dir: PadSide) => void;
  };
  /** V90 (F4): nach „Pad schließen“ – zeigt „Rückgängig“ am alten Platz. */
  onClosed?: (undo: PadUndo | null) => void;
  /** F-207 (V97, M4): Lage der Main Stage (Anteile) – das Pad liegt nie darüber. */
  stage?: FRect;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function Pad({ ws, dispatch, pad, desk, place, box, top, z, picked, onPick, notify, say, dock, full, plan, tile, onClosed, stage, toNotes }: PadProps) {
  const [live, setLive] = useState<PadPlace | null>(null);
  const [renaming, setRenaming] = useState(false);
  /** V88 (BL3): „Als Vorlage speichern …“ – Leiste unter dem Kopf */
  const [tplSave, setTplSave] = useState(false);
  const display = useDisplay();
  // V75 (F-215 A2): Bildschirmtastatur offen? Der Knopf schwebt dann nur beim Pad, in dem gerade geschrieben wird
  const kbBottom = useKeyboard();
  const [focusIn, setFocusIn] = useState(false);
  const minW = Math.min(1, PAD_MIN.w / box.w);
  const minH = Math.min(1, PAD_MIN.h / box.h);
  const sheet = No.viewById(ws, pad.active);
  const tabsRef = useRef<HTMLDivElement>(null);
  // F-228 (V111): Überlauf – Kopf und Reiter werden bei Platzmangel knapp, „»“ zeigt die ganze Leiste schwebend
  const headRef = useRef<HTMLElement>(null);
  const headOvf = useOverflow(headRef, { label: OVERFLOW_TEXT.padHead });
  const tabsOvf = useOverflow(tabsRef, { label: OVERFLOW_TEXT.padTabs, keepActive: true, drop: true, forceTight: headOvf.open && pad.sheets.length > 1 });
  const self = useRef<HTMLElement>(null);
  // F-215: Befehle der Fußleiste an den Notizblock (Zähler, damit derselbe Befehl erneut wirkt)
  const [cmd, setCmd] = useState<Cmd | null>(null);
  const send = (k: BlockCmd, id?: string) => setCmd((c) => ({ k, n: (c?.n ?? 0) + 1, id }));
  const isBlock = sheet?.kind === 'block';
  // V86 (S2): Fußleiste auch in den Sheets To-do/Kanban/Eisenhower – Home, Neue Aufgabe, Suche sinngemäß
  const isSheetUi = !!sheet;
  const footItems: FootItem[] = [
    { id: 'recent', label: FOOT_TEXT.recent, icon: 'recent', run: () => setRecentOpen(true) },
    { id: 'new', label: FOOT_TEXT.newNote, icon: 'plus', run: isSheetUi ? () => send('new') : undefined },
    { id: 'voice', label: FOOT_TEXT.voice, icon: 'mic', run: isBlock ? () => voiceStart.current?.() : undefined },
    { id: 'task', label: FOOT_TEXT.newTask, icon: 'task', run: () => (isBlock ? newTask() : isSheetUi ? send('new') : undefined) },
    { id: 'search', label: FOOT_TEXT.search, icon: 'search', run: () => (isSheetUi ? send('search') : say(FOOT_TEXT.searchNoBlock)) },
    { id: 'share', label: FOOT_TEXT.share, icon: 'share', run: () => setShareOpen(true) },
  ];
  const home = () => {
    if (isSheetUi) send('home');
    say(FOOT_TEXT.atHome);
  };
  // F-215 (V71, Wunsch Enrico): Wischen am Knopf formatiert die Zeile der offenen Note – links Liste,
  // rechts Aufgabe, oben Überschrift H2, unten fett; dieselbe Geste noch einmal = wieder Text.
  // Ohne offene Note: neue Note anlegen und deren erste Zeile formatieren. Der Editor hört auf `esource:fmt`.
  const curNote = sheet ? picked[sheet.id] : undefined;
  // V71 (Wunsch Enrico): Ist keine Note offen, legt Wischen eine neue an – nach Verwendung benannt:
  // ↑ Neue Note, → Neue To-do-Liste, ← Neue Liste, ↓ Neue Erinnerung (folgt). Alle beginnen mit Titel H1.
  // Ist eine Note offen (geöffnet oder gerade angelegt), formatiert Wischen sofort die Zeile.
  const editor = () => self.current?.querySelector<HTMLElement>('.nedit');
  const swipeLabel = (dir: SwipeDir) => (isBlock && !editor() ? FOOT_TEXT.make[dir] : FOOT_TEXT.fmt[dir]);
  const swipe = (dir: SwipeDir) => {
    if (!isBlock) return say(FOOT_TEXT.fmtNoBlock);
    const now = editor();
    if (now) return void now.dispatchEvent(new CustomEvent(FMT_EVENT, { detail: FMT_OF[dir] }));
    const tpl = TPL_OF[dir];
    if (!tpl) return say(FOOT_TEXT.make[dir]);
    send('new');
    // warten, bis die neue Note mit ihrem Editor da ist (höchstens ~1 s)
    let tries = 60;
    const wait = () => {
      const el = editor();
      if (el) {
        el.dispatchEvent(new CustomEvent(FMT_EVENT, { detail: tpl }));
        say(FOOT_TEXT.make[dir]);
      } else if (--tries > 0) requestAnimationFrame(wait);
      else say(FOOT_TEXT.fmtNoEdit);
    };
    requestAnimationFrame(wait);
  };
  // F-215 Schritt 4 (V78): Neue Aufgabe – offene Notiz: neue leere Aufgabe an der Schreibmarke (nie zurück zu Text);
  // ohne offene Notiz: neue To-do-Liste (Titel H1, darunter eine Aufgabe) wie Wischen nach rechts
  const newTask = () => {
    if (!isBlock) return say(FOOT_TEXT.taskNoBlock);
    const now = editor();
    if (!now) return swipe('right');
    now.dispatchEvent(new CustomEvent(FMT_EVENT, { detail: 'task-new' satisfies FmtTool }));
    say(FOOT_TEXT.taskAdded);
  };
  // F-215 Schritt 3 (V77): Sprachnotiz übernehmen – als Entwurf in die offene Notiz (an der Schreibmarke) oder neue Notiz
  const voiceStart = useRef<(() => void) | null>(null);
  /** Auf den Editor einer (neuen) Notiz warten – wie beim Wischen, höchstens ~1 s */
  const nextEditor = (was: HTMLElement | null | undefined) =>
    new Promise<HTMLElement | null>((done) => {
      let tries = 60;
      const wait = () => {
        const el = editor();
        if (el && el !== was) return done(el);
        if (--tries > 0) requestAnimationFrame(wait);
        else done(null);
      };
      requestAnimationFrame(wait);
    });
  const insertInto = (el: HTMLElement, text: string) => {
    const d: InsertDetail = { text };
    el.dispatchEvent(new CustomEvent(INSERT_EVENT, { detail: d }));
    return d.after;
  };
  // V79: neueste Arbeitsfläche und offene Notiz für spätere Schritte (Lösen, Ton anhängen nach dem Warten)
  const wsRef = useRef(ws);
  wsRef.current = ws;
  const curRef = useRef(curNote);
  curRef.current = curNote;
  const by = ws.profile?.name || undefined;
  /** Id der Notiz, deren Editor gerade offen ist (nach dem Anlegen erst im nächsten Bild bekannt) */
  const openNoteId = () =>
    new Promise<string | undefined>((done) => requestAnimationFrame(() => done(curRef.current)));
  /** V79 (T1): Ton auf diesem Gerät speichern und an die Notiz hängen (am Ende, T4) */
  const attachAudio = async (noteId: string | undefined, take: AudioTake | null) => {
    if (!noteId || !take) return null;
    const ref = newId();
    const atMs = Date.now() - Math.round(take.dur * 1000);
    if (!(await putClip({ id: ref, blob: take.blob, mime: take.mime, dur: take.dur, at: atMs }))) {
      notify(VOICE_TEXT.saveFail);
      return null;
    }
    const n = No.noteById(wsRef.current, noteId);
    if (!n) return null;
    const a = { kind: 'audio' as const, ref, dur: Math.round(take.dur * 10) / 10, at: new Date(atMs).toISOString(), dev: deviceLabel(navigator.userAgent, navigator.maxTouchPoints > 1), mime: take.mime };
    dispatch({ type: 'noteEdit', id: noteId, patch: { attach: No.addAudio(n, a) }, by });
    clipsChanged();
    return a;
  };
  /** Neue Notiz aus der Sprache: Herkunft „Sprachnotiz“ (T10); nur Ton = Tonnotiz mit Titel (T6) */
  const toNewNote = async (text: string) => {
    const was = editor();
    send('new');
    const el = await nextEditor(was);
    if (!el) return undefined;
    if (text) insertInto(el, text);
    const id = await openNoteId();
    if (id) {
      dispatch({ type: 'noteEdit', id, patch: { origin: { via: 'voice', at: new Date().toISOString(), ...(by ? { by } : {}) } }, by });
      if (!text) dispatch({ type: 'noteDraft', id, patch: { title: `${VOICE_TEXT.toneTitle} ${remindLabel(new Date().toISOString())}` }, by });
    }
    return id;
  };
  const voiceCommit = async (text: string, target: VoiceTarget, audio: AudioTake | null) => {
    if (!isBlock) {
      say(VOICE_TEXT.noBlock);
      return null;
    }
    const el = editor();
    if (target === 'new' || !el) {
      const id = await toNewNote(text);
      if (!id) say(FOOT_TEXT.fmtNoEdit);
      else await attachAudio(id, audio);
      return null;
    }
    const here = curRef.current;
    const after = text ? insertInto(el, text) : '';
    if (after === undefined) return null;
    const clip = await attachAudio(here, audio);
    // „Als neue Notiz lösen“: Einfügen zurücknehmen (nur ohne spätere Änderung), dann als neue Notiz anlegen;
    // V79 (T9): der Ton wandert mit
    return async () => {
      const now = editor();
      if (!now) return false;
      if (text) {
        const d: UninsertDetail = { after };
        now.dispatchEvent(new CustomEvent(UNINSERT_EVENT, { detail: d }));
        if (!d.ok) return false;
      }
      if (clip && here) {
        const old = No.noteById(wsRef.current, here);
        if (old) dispatch({ type: 'noteEdit', id: here, patch: { attach: No.dropAudio(old, clip.ref) }, by });
      }
      const id = await toNewNote(text);
      if (!id) return false;
      if (clip) {
        const n = No.noteById(wsRef.current, id);
        dispatch({ type: 'noteEdit', id, patch: { attach: No.addAudio(n ?? {}, clip) }, by });
        clipsChanged();
      }
      return true;
    };
  };
  const voice: VoiceProps = { on: display.voice, onEnable: () => setVoice(true), noteOpen: () => !!editor(), commit: voiceCommit, startRef: voiceStart };
  // F-215 (V70): Zuletzt genutzt – Pad merkt sich geöffnete Sheets und Notes (gespeichert, je Pad)
  const [recentOpen, setRecentOpen] = useState(false);
  useEffect(() => {
    if (pad.active) dispatch({ type: 'padRecent', id: pad.id, sheet: pad.active });
  }, [pad.active]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (curNote) dispatch({ type: 'padRecent', id: pad.id, note: curNote });
  }, [curNote]); // eslint-disable-line react-hooks/exhaustive-deps
  const recent = recentOpen ? recentIn(ws, pad.id, { sheet: pad.active, note: isBlock ? curNote : undefined }) : [];
  const recentText = (r: RecentRef) => {
    if (r.kind === 'sheet') return FOOT_TEXT.toSheet(No.viewById(ws, r.id)?.name ?? '');
    const n = No.noteById(ws, r.id);
    return FOOT_TEXT.toNote((n && No.titleOf(No.shownNote(n))) || NOTE_TEXT.untitled);
  };
  const toKnob = () => self.current?.querySelector<HTMLElement>('.padfoot__home')?.focus();
  const openRecent = (r: RecentRef) => {
    setRecentOpen(false);
    if (r.kind === 'sheet') show(r.id);
    else if (r.sheet === pad.active) send('go', r.id);
    else {
      show(r.sheet);
      onPick(r.sheet, r.id);
    }
    say(recentText(r));
  };
  const recentKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = [...e.currentTarget.querySelectorAll<HTMLElement>('button')];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setRecentOpen(false);
      toKnob();
    }
  };
  useEffect(() => {
    if (recentOpen) window.setTimeout(() => self.current?.querySelector<HTMLElement>('.padfoot__recent button')?.focus(), 0);
  }, [recentOpen]);

  // ---------------------------------------------------------------- V80 (F-215 S1–S4): Bild & Teilen
  const [shareOpen, setShareOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const hintT = useRef(0);
  /** Hinweis am Ort über dem Knopf (2 s) und für Bildschirmleser */
  const tellHere = (t: string) => {
    say(t);
    window.clearTimeout(hintT.current);
    setHint(t);
    hintT.current = noticeLater(() => setHint(null));
  };
  useEffect(() => () => window.clearTimeout(hintT.current), []);
  const camRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  /** Bilder in die offene Notiz – ohne offene Notiz in eine neue (S4) */
  const addPics = async (files: File[]) => {
    if (!files.length) return;
    if (!isBlock) return tellHere(FOOT_TEXT.picNoBlock);
    let el = editor();
    if (!el) {
      send('new');
      el = await nextEditor(null);
    }
    if (!el) return tellHere(FOOT_TEXT.fmtNoEdit);
    const d: ImgDetail = { files };
    el.dispatchEvent(new CustomEvent(IMG_EVENT, { detail: d }));
    const n = await (d.done ?? Promise.resolve(0));
    if (n) say(NOTE_TEXT.imgAdded(n));
  };
  const onFiles = (e: { currentTarget: HTMLInputElement }) => {
    const files = Array.from(e.currentTarget.files ?? []);
    e.currentTarget.value = '';
    void addPics(files);
  };
  /** Inhalt zum Teilen – schon beim Öffnen der Liste vorbereitet, damit das Teilen-Menü direkt nach dem Antippen kommt
   *  (Safari erlaubt es nur unmittelbar nach einer Bedienung) */
  type Payload = { id: string; title: string; text: string; clip: string; files: File[] };
  const payload = useRef<Payload | null>(null);
  const buildShare = async (): Promise<Payload | null> => {
    const id = curRef.current;
    const raw = id ? No.noteById(wsRef.current, id) : undefined;
    if (!id || !raw) return null;
    const n = No.shownNote(raw);
    const t = No.shareText(n);
    const files: File[] = [];
    const names = new Set<string>();
    const add = (blob: Blob, name: string, type: string) => {
      let nm = name;
      for (let k = 2; names.has(nm); k++) nm = name.replace(/(\.[a-z0-9]+)$/, `-${k}$1`);
      names.add(nm);
      files.push(new File([blob], nm, { type }));
    };
    if (typeof File === 'function') {
      for (const a of No.audioOf(raw)) {
        const c = await getClip(a.ref);
        if (c) add(c.blob, audioFileName(a.at ?? new Date(c.at).toISOString(), c.mime), c.mime);
      }
      for (const r of ND.imgRefs(n.text)) {
        const pic = await getPic(r);
        if (pic) add(pic.blob, picFileName(pic.at, pic.mime), pic.mime);
      }
    }
    return { id, ...t, files };
  };
  useEffect(() => {
    if (!shareOpen) return;
    payload.current = null;
    let live = true;
    void buildShare().then((p) => live && (payload.current = p));
    window.setTimeout(() => self.current?.querySelector<HTMLElement>('.padfoot__share button')?.focus(), 0);
    return () => {
      live = false;
    };
  }, [shareOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  /** Teilen (S1/S2): Teilen-Menü mit Text und Dateien, sonst nur Text (Hinweis), ohne Teilen-Menü Zwischenablage.
   *  Hinweis nur, wenn etwas nicht geht. */
  const shareNote = async () => {
    setShareOpen(false);
    if (!isBlock || !curRef.current) return tellHere(FOOT_TEXT.shareNeedNote);
    const p = payload.current ?? (await buildShare());
    if (!p) return tellHere(FOOT_TEXT.shareNeedNote);
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    const done = (to: string) => dispatch({ type: 'noteForward', id: p.id, to, by });
    if (typeof nav.share === 'function') {
      const withFiles = p.files.length > 0 && !!nav.canShare?.({ files: p.files });
      try {
        await nav.share(withFiles ? { title: p.title, text: p.text, files: p.files } : { title: p.title, text: p.text });
        done(FOOT_TEXT.shareTo);
        if (p.files.length && !withFiles) tellHere(FOOT_TEXT.shareNoFiles);
      } catch (e) {
        if ((e as Error)?.name !== 'AbortError') tellHere(FOOT_TEXT.shareFailed);
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(p.clip);
      done(FOOT_TEXT.shareClip);
      tellHere(p.files.length ? FOOT_TEXT.shareCopiedNoFiles : FOOT_TEXT.shareCopied);
    } catch {
      tellHere(FOOT_TEXT.shareFailed);
    }
  };
  const shareKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = [...e.currentTarget.querySelectorAll<HTMLElement>('button')];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setShareOpen(false);
      toKnob();
    }
  };

  const raise = () => {
    if (!top) dispatch({ type: 'padRaise', id: pad.id });
  };
  const commit = (next: PadPlace) => dispatch({ type: 'padPlace', desk, id: pad.id, place: next });

  // ---------------------------------------------------------------- Ziehen und Größe
  const fit = (r: PadPlace): PadPlace => {
    const w = clamp(r.w, minW, 1);
    const h = clamp(r.h, minH, 1);
    return { x: clamp(r.x, 0, 1 - w), y: clamp(r.y, 0, 1 - h), w, h };
  };
  // gezeigt wird immer mindestens 260 × 200 px und ganz im Desk (z. B. nach kleinerem Fenster)
  // F-207 (M4): ein alter Platz über der Main Stage rückt in der Anzeige daneben (beim Ziehen nicht – dort „hier nicht“)
  // V113 (Enrico: Anfasser „nicht richtig positioniert“): Im Notizen-Modus (gekachelt) gilt die Kachel des Baums genau –
  // reicht der Platz nicht für die Mindestgröße, wird das Pad knapp (Überlauf F-228) statt über den Nachbarn zu rutschen;
  // so liegen Pads und die Anfasser in der Lücke immer an derselben Stelle
  const p = tile && !live ? place : live || !stage ? fit(live ?? place) : avoidStage(fit(place), stage);
  /** M4: Pad läge über der Stage? */
  const onStage = (r: PadPlace) => !!stage && overlaps(r, stage);
  const where = PAD_TEXT.where(p.x + p.w / 2, p.y + p.h / 2);
  const gesture = (e: PointerEvent, edge: Edge | null) => {
    if (e.button !== 0) return;
    e.preventDefault();
    raise();
    const sx = e.clientX;
    const sy = e.clientY;
    const start = p;
    let last = start;
    const move = (ev: globalThis.PointerEvent) => {
      const dx = (ev.clientX - sx) / box.w;
      const dy = (ev.clientY - sy) / box.h;
      let r = { ...start };
      if (!edge) r = { ...r, x: start.x + dx, y: start.y + dy };
      else {
        if (edge === 'e' || edge === 'se') r.w = Math.max(minW, start.w + dx);
        if (edge === 's' || edge === 'se') r.h = Math.max(minH, start.h + dy);
        if (edge === 'w') {
          const w = Math.max(minW, start.w - dx);
          r = { ...r, x: start.x + start.w - w, w };
        }
        if (edge === 'n') {
          const h = Math.max(minH, start.h - dy);
          r = { ...r, y: start.y + start.h - h, h };
        }
      }
      last = fit(r);
      setLive(last);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      document.body.classList.remove('gesture');
      setLive(null);
      // M4: über der Stage losgelassen → das Pad springt zurück
      if (onStage(last)) return say(STAGE_TEXT.padNotHere);
      if (last !== start) commit(last);
    };
    document.body.classList.add('gesture');
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  // ---------------------------------------------------------------- Tastatur (P7)
  const typing = (t: EventTarget) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  const onKey = (e: KeyboardEvent) => {
    // Alt + Pfeil verschieben, Alt + Umschalt + Pfeil Größe
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.startsWith('Arrow') && !typing(e.target)) {
      e.preventDefault();
      e.stopPropagation();
      // V81 (D11): im Dock ändert Alt + Pfeil links/rechts die Breite (das Dock wächst nach links)
      if (dock) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') dock.onWidth(e.key === 'ArrowLeft' ? 1 : -1, e.repeat);
        return;
      }
      // V90 (F1): im Notizen-Modus tauscht Alt + Pfeil mit dem Nachbarn, mit Umschalt wandert die Grenze
      if (tile) {
        const dir: PadSide = e.key === 'ArrowLeft' ? 'left' : e.key === 'ArrowRight' ? 'right' : e.key === 'ArrowUp' ? 'top' : 'bottom';
        if (e.shiftKey) tile.onEdge(dir);
        else if (!e.repeat) tile.onSwap(dir);
        return;
      }
      const step = e.repeat ? STEP_HOLD : STEP;
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
      const next = fit(e.shiftKey ? { ...p, w: p.w + dx, h: p.h + dy } : { ...p, x: p.x + dx, y: p.y + dy });
      // M4: nicht über die Stage – beim Verschieben springt das Pad über sie hinweg auf die andere Seite
      if (onStage(next)) {
        if (e.shiftKey || !stage) return say(STAGE_TEXT.padNotHere);
        const jump = fit({ ...next, x: dx > 0 ? stage.x + stage.w : dx < 0 ? stage.x - next.w : next.x, y: dy > 0 ? stage.y + stage.h : dy < 0 ? stage.y - next.h : next.y });
        if (onStage(jump) || jump.x < -1e-6 || jump.y < -1e-6) return say(STAGE_TEXT.padNotHere);
        commit(jump);
        say(PAD_TEXT.moved(PAD_TEXT.where(jump.x + jump.w / 2, jump.y + jump.h / 2)));
        return;
      }
      commit(next);
      say(e.shiftKey ? PAD_TEXT.sized(Math.round(next.w * box.w), Math.round(next.h * box.h)) : PAD_TEXT.moved(PAD_TEXT.where(next.x + next.w / 2, next.y + next.h / 2)));
      return;
    }
    // V87: Alt + Enter = Vollbild an/aus
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.key === 'Enter' && full) {
      e.preventDefault();
      e.stopPropagation();
      full.toggle();
      return;
    }
    // F-215: Alt + H = Home (fängt auch „ª“ auf dem Mac ab)
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyH') {
      e.preventDefault();
      e.stopPropagation();
      home();
      return;
    }
    // F-215 Schritt 3 (V77): Alt + M = Sprachnotiz, festgestellt (fängt auch „µ“ auf dem Mac ab)
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyM') {
      e.preventDefault();
      e.stopPropagation();
      if (dock) say(DOCK_TEXT.noKnob);
      else if (isBlock) voiceStart.current?.();
      else say(VOICE_TEXT.noBlock);
      return;
    }
    // Strg + 1…9: Sheet wählen
    if ((e.ctrlKey || e.metaKey) && !e.altKey && /^[1-9]$/.test(e.key)) {
      const id = pad.sheets[Number(e.key) - 1];
      if (id) {
        e.preventDefault();
        e.stopPropagation();
        show(id, true);
      }
    }
  };

  const show = (id: string, focus = false) => {
    dispatch({ type: 'padShow', id: pad.id, sheet: id });
    raise();
    if (focus) window.setTimeout(() => tabsRef.current?.querySelector<HTMLElement>(`[data-sheet="${id}"]`)?.focus(), 0);
  };
  const onTabKey = (e: KeyboardEvent, i: number) => {
    const n = pad.sheets.length;
    let j = -1;
    if (e.key === 'ArrowRight') j = (i + 1) % n;
    else if (e.key === 'ArrowLeft') j = (i - 1 + n) % n;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = n - 1;
    if (j < 0 || e.altKey) return;
    e.preventDefault();
    if (e.shiftKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      dispatch({ type: 'padMoveSheet', id: pad.id, sheet: pad.sheets[i], to: j });
      window.setTimeout(() => tabsRef.current?.querySelector<HTMLElement>(`[data-sheet="${pad.sheets[i]}"]`)?.focus(), 0);
      return;
    }
    show(pad.sheets[j], true);
  };

  const addSheet = (kind: NoteViewKind, tpl?: string) => {
    // V87 (E3): genau eine Eisenhower-Matrix – öffnet die vorhandene
    const matrix = kind === 'eisenhower' ? Sh.theMatrix(ws) : undefined;
    if (matrix) {
      dispatch({ type: 'padOpen', desk: pad.desk, ref: { view: matrix.id }, ids: [newId(), newId(), newId()] });
      return notify(MATRIX_TEXT.exists);
    }
    if (pad.sheets.length >= PAD_SHEETS_MAX) return notify(PAD_TEXT.full(PAD_SHEETS_MAX));
    const id = newId();
    dispatch({ type: 'padAddSheet', id: pad.id, kind, sheet: id, ...(tpl ? { tpl } : {}) });
    window.setTimeout(() => tabsRef.current?.querySelector<HTMLElement>(`[data-sheet="${id}"]`)?.focus(), 0);
  };
  // V128 (F-231 K12): Stern setzen/entfernen (Meldung am Ort im Pad) und Sheet mit Stern öffnen
  const toggleStar = () => {
    if (!sheet) return;
    const on = !sheet.star;
    dispatch({ type: 'sheetStar', view: sheet.id, on });
    tellHere(on ? STAR_TEXT.set(sheet.name) : STAR_TEXT.unset(sheet.name));
  };
  const openStar = (id: string) => {
    const v = No.viewById(ws, id);
    if (!v) return;
    const there = padWith(ws, id);
    const full = !there && pad.sheets.length >= PAD_SHEETS_MAX;
    dispatch({ type: 'padStarOpen', id: pad.id, sheet: id, ids: [newId()] });
    tellHere(there ? STAR_TEXT.shown(v.name) : full ? STAR_TEXT.full : STAR_TEXT.opened(v.name));
    if (!there && !full) window.setTimeout(() => tabsRef.current?.querySelector<HTMLElement>(`[data-sheet="${id}"]`)?.focus(), 0);
  };
  // V111 (Enrico: „In Panels sollte man auch noch unter Sheets eine Entscheidung anlegen können“): freie
  // Entscheidung anlegen und im Pad im Vollbild öffnen (E1-C) – Titel ändert man dort oben
  const addDecision = () => {
    const id = newId();
    dispatch({ type: 'dcAdd', id, ids: Array.from({ length: 5 }, newId), title: PAD_TEXT.newDecisionTitle, at: new Date().toISOString(), names: { criterion: [1, 2, 3].map(DECISION_TEXT.criterion), option: [1, 2].map(DECISION_TEXT.option) } });
    window.setTimeout(() => openWorkPad({ tab: 'decisions', decision: id }), 0);
  };
  const [sheetPick, setSheetPick] = useState('');
  const [menuStart, setMenuStart] = useState('');
  // V87 (Enrico): × an jedem Reiter bzw. Entf auf dem Reiter schließt genau dieses Sheet
  const closeSheet = (id = sheet?.id) => {
    if (!id) return;
    const i = pad.sheets.indexOf(id);
    const name = No.viewById(ws, id)?.name ?? '';
    dispatch({ type: 'padCloseSheet', id: pad.id, sheet: id });
    if (pad.sheets.length <= 1) {
      notify(PAD_TEXT.closed);
      say(PAD_TEXT.closed);
      focusAway();
      return;
    }
    say(PAD_TEXT.sheetClosed(name));
    const next = pad.sheets.filter((x) => x !== id)[Math.max(0, i - 1)];
    if (next) window.setTimeout(() => tabsRef.current?.querySelector<HTMLElement>(`[data-sheet="${next}"]`)?.focus(), 0);
  };
  /** Fokus nach dem Schließen auf NewPad (sonst fiele er auf body). */
  const focusAway = () => window.setTimeout(() => document.querySelector<HTMLElement>('.tb-newpad')?.closest('button')?.focus(), 0);
  const closePad = () => {
    const undo = onClosed ? padUndoOf(ws, pad.id) : null;
    dispatch({ type: 'padClose', id: pad.id });
    // V90 (F4): „Rückgängig“ am alten Platz (Meldung am Ort), sonst wie bisher unten
    if (onClosed) onClosed(undo);
    else notify(PAD_TEXT.closed);
    say(PAD_TEXT.closed);
    focusAway();
  };

  const style: CSSProperties = dock ? {} : {
    left: box.gap + p.x * box.w,
    top: box.gap + p.y * box.h,
    width: Math.max(0, p.w * box.w - box.gap),
    height: Math.max(0, p.h * box.h - box.gap),
    zIndex: z,
  };
  const titleId = `pad-${pad.id}-t`;
  const toDock = (on: boolean) => {
    const name = sheet?.name ?? TERMS.pad.split(' =')[0];
    dispatch({ type: 'padDock', id: pad.id, on });
    // Meldung nur für Bildschirmleser – man sieht das Pad an seinen neuen Ort wandern (Meldungen am Ort)
    say(on ? DOCK_TEXT.docked(name) : DOCK_TEXT.undocked(name));
    // Fokus folgt dem Pad an seinen neuen Ort
    window.setTimeout(() => document.querySelector<HTMLElement>(`[data-pad-id="${pad.id}"] .pad__tab.is-on`)?.focus(), 60);
  };

  return (
    <section
      ref={self}
      className={`pad${dock ? ' pad--docked' : ''}${top ? ' is-top' : ''}${live ? ' is-moving' : ''}${live && onStage(live) ? ' is-nohere' : ''}${curNote ? ' has-note' : ''}`}
      data-nohere={live && onStage(live) ? STAGE_TEXT.padHere : undefined}
      style={style}
      role="region"
      aria-label={dock ? DOCK_TEXT.region(sheet?.name ?? TERMS.pad.split(' =')[0]) : PAD_TEXT.region(sheet?.name ?? TERMS.pad.split(' =')[0], where)}
      data-pad-id={pad.id}
      onPointerDownCapture={raise}
      onFocusCapture={() => (raise(), setFocusIn(true))}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusIn(false);
      }}
      onKeyDown={onKey}
    >
      <header
        ref={headRef}
        className={`pad__head${headOvf.cls}`}
        title={dock ? DOCK_TEXT.width : tile ? PAD_TEXT.moveTile : PAD_TEXT.move}
        onPointerDown={(e) => {
          if (dock || (e.target as HTMLElement).closest('button, input, [role="tab"], .menu')) return;
          if (tile) return (raise(), tile.onHead(e));
          gesture(e, null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !renaming && !(e.target as HTMLElement).closest('.menu__list')) {
            e.stopPropagation();
            if (dock) dock.onFold();
            else closePad();
          }
        }}
      >
        <span data-ovf-keep="" className="pad__iconwrap"><Icon name={dock ? 'dock' : 'pad'} size={14} className="icon pad__icon" /></span>
        <div className={`pad__tabs${tabsOvf.cls}`} role="tablist" aria-label={PAD_TEXT.tabs} ref={tabsRef} data-ovf-min="" data-ovf-keep="" style={{ '--ovf-min': '12em' } as CSSProperties}>
          {pad.sheets.map((id, i) => {
            const v = No.viewById(ws, id);
            if (!v) return null;
            const on = id === pad.active;
            if (on && renaming)
              return (
                <input
                  key={id}
                  className="pad__rename"
                  aria-label={PAD_TEXT.renameLabel}
                  defaultValue={v.name}
                  autoFocus
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      dispatch({ type: 'padRenameSheet', sheet: id, name: e.currentTarget.value });
                      setRenaming(false);
                      show(id, true);
                    } else if (e.key === 'Escape') {
                      e.stopPropagation();
                      setRenaming(false);
                      show(id, true);
                    }
                  }}
                  onBlur={(e) => {
                    dispatch({ type: 'padRenameSheet', sheet: id, name: e.currentTarget.value });
                    setRenaming(false);
                  }}
                />
              );
            return (
              <span key={id} className={`pad__tabwrap${on ? ' is-on' : ''}`} role="presentation">
              <button
                type="button"
                role="tab"
                data-sheet={id}
                id={`pad-${pad.id}-tab-${id}`}
                aria-selected={on}
                aria-controls={`pad-${pad.id}-panel`}
                tabIndex={on ? 0 : -1}
                className={`pad__tab${on ? ' is-on' : ''}`}
                title={`${v.name}${i < 9 ? ` (Strg/⌘+${i + 1})` : ''} – Pfeile wechseln, Umschalt + Pfeil verschiebt den Reiter`}
                onClick={() => show(id)}
                onDoubleClick={() => setRenaming(true)}
                onKeyDown={(e) => (e.key === 'Delete' ? (e.preventDefault(), closeSheet(id)) : onTabKey(e, i))}
              >
                <Icon name={KIND_ICON[v.kind]} size={13} />
                <span className="pad__tabname">{v.name}</span>
                {/* V128 (F-231 K12): Stern am Reiter */}
                {v.star && (
                  <span className="pad__tabstar" title={STAR_TEXT.mark}>
                    <Icon name="star" size={10} />
                    <span className="sr-only">, {STAR_TEXT.mark}</span>
                  </span>
                )}
              </button>
              <button type="button" tabIndex={-1} className="pad__tabx" title={PAD_TEXT.closeSheetTab(v.name)} aria-label={PAD_TEXT.closeSheetTab(v.name)} onClick={() => closeSheet(id)}>
                <Icon name="close" size={10} />
              </button>
              </span>
            );
          })}
          {tabsOvf.knob}
        </div>
        {dock ? (
          <OpacityInline value={display.dockOpacity} onChange={setDockOpacity} label={PAD_TEXT.opacityDock} hint={PAD_TEXT.opacityDockHint} />
        ) : (
          <OpacityInline value={display.padOpacity} onChange={setPadOpacity} />
        )}
        <span id={titleId} className="sr-only">
          {sheet?.name}
        </span>
        <Menu
          className="pad__menu"
          icon={<span className="pad__add" title={explain(TERMS.sheet)}>{PAD_TEXT.addSheet}</span>}
          label={`${PAD_TEXT.addSheetLabel} – ${explain(TERMS.sheet)}`}
          control={(toggle) => (
            // V111 (Enrico): Auswahl-Rad – „+ Sheet“ zuerst (Klick öffnet das Menü wie bisher), dann die Arten
            <ModeWheel
              className="pad__sheetwheel"
              label={PAD_TEXT.addSheetWheel}
              value={sheetPick}
              onChange={setSheetPick}
              options={[
                { id: '', name: PAD_TEXT.addSheet, hint: `${explain(TERMS.sheet)} – ${PAD_TEXT.addSheetMenuHint}` },
                // kurze Namen im Kopf, damit das Rad die Reiter nicht verdrängt; V113 (F-228 Rest): in der schwebenden
                // Leiste (Kopf läuft über) ist Platz – dort stehen die vollen Namen
                ...KINDS.map((k) => ({ id: k, name: headOvf.open ? No.VIEW_BASE[k] : PAD_TEXT.addSheetShort[k], icon: KIND_ICON[k], hint: PAD_TEXT.addSheetKindHint(No.VIEW_BASE[k]) })),
                { id: 'decision', name: PAD_TEXT.addDecisionShort, icon: 'sliders' as const, hint: PAD_TEXT.addDecisionHint },
              ]}
              onPress={(id) => {
                if (!id) return (setMenuStart(''), toggle());
                if (id === 'decision') return addDecision();
                if (id === 'kanban') return (setMenuStart('kanban'), toggle());
                addSheet(id as NoteViewKind);
              }}
            />
          )}
        >
          {(close) => (
            // V88 (BL2): Kanban fragt „Leer · Vorlage …“
            <MenuPages start={menuStart}>
              {(page, go) =>
                page === 'kanban' ? (
                  <TemplatePick ws={ws} onBack={() => go('')} onPick={(tpl) => (close(), addSheet('kanban', tpl))} />
                ) : page === 'star' ? (
                  // V128 (F-231 K12): Sheets mit Stern öffnen – wie Trello „Markierte Boards“
                  <>
                    <Item icon="back" onClick={() => go('')}>{BOARD_TPL_TEXT.back}</Item>
                    {starredViews(ws, pad.sheets).map((v) => (
                      <Item key={v.id} icon={KIND_ICON[v.kind]} hint={No.VIEW_BASE[v.kind]} onClick={() => (close(), openStar(v.id))}>
                        {v.name}
                      </Item>
                    ))}
                  </>
                ) : (
                  KINDS.map((k) => (
                    <Item
                      key={k}
                      icon={KIND_ICON[k]}
                      disabled={pad.sheets.length >= PAD_SHEETS_MAX}
                      title={pad.sheets.length >= PAD_SHEETS_MAX ? PAD_TEXT.full(PAD_SHEETS_MAX) : undefined}
                      onClick={() => {
                        if (k === 'kanban') return go('kanban');
                        close();
                        addSheet(k);
                      }}
                    >
                      {k === 'kanban' ? `${No.VIEW_BASE[k]} …` : No.VIEW_BASE[k]}
                    </Item>
                  )).concat(
                    <Item key="decision" icon="sliders" hint={PAD_TEXT.addDecisionHint} onClick={() => (close(), addDecision())}>
                      {PAD_TEXT.addDecision}
                    </Item>,
                    // V128 (F-231 K12): „Mit Stern …“ – ohne Sterne erklärt der Eintrag, wo man einen setzt
                    <Item key="star" icon="star" disabled={!starredViews(ws, pad.sheets).length} title={starredViews(ws, pad.sheets).length ? undefined : STAR_TEXT.none} hint={STAR_TEXT.openHint} onClick={() => go('star')}>
                      {STAR_TEXT.open}
                    </Item>,
                  )
                )
              }
            </MenuPages>
          )}
        </Menu>
        <Menu className="pad__menu" icon={<Icon name="more" size={16} />} label={PAD_TEXT.options}>
          {(close) => (
            <MenuPages>
              {(page, go) => page === 'place' && plan ? plan(close, () => go('')) : (
            <>
              <Item
                icon="rename"
                disabled={!sheet}
                onClick={() => {
                  close();
                  setRenaming(true);
                }}
              >
                {PAD_TEXT.rename}
              </Item>
              {/* V128 (F-231 K12): Stern wie Trello „Board markieren“ */}
              <Item icon="star" checked={!!sheet?.star} disabled={!sheet} hint={STAR_TEXT.menuHint} onClick={() => (close(), toggleStar())}>
                {STAR_TEXT.menu}
              </Item>
              <Item icon="close" hint={PAD_TEXT.closeSheetHint} disabled={!sheet} onClick={() => (close(), closeSheet())}>
                {PAD_TEXT.closeSheet}
              </Item>
              {/* V87 (L2): Board-Regel „Abnahme nötig“ für Kanban und To-do */}
              {(sheet?.kind === 'kanban' || sheet?.kind === 'todo') && (
                <Item icon="check" checked={!!sheet.review} hint={KANBAN_TEXT.reviewSettingHint} onClick={() => (close(), dispatch({ type: 'sheetReview', view: sheet.id, on: !sheet.review }))}>
                  {KANBAN_TEXT.reviewSetting}
                </Item>
              )}
              {/* V121 (F-231 K1/K3): Archiv des Boards */}
              {sheet?.kind === 'kanban' && (
                <Item icon="archive" hint={KANBAN_MORE_TEXT.archiveBtnHint} onClick={() => (close(), window.dispatchEvent(new CustomEvent('esource:kanbanarchive', { detail: sheet.id })))}>
                  {KANBAN_MORE_TEXT.archiveBtn(archiveCount(ws, sheet.id))} …
                </Item>
              )}
              {/* V122 (F-231 K4): Tags des Boards – wie „Archiv …“ */}
              {sheet?.kind === 'kanban' && (
                <Item icon="tag" hint={TAG_TEXT.manageHint} onClick={() => (close(), window.dispatchEvent(new CustomEvent('esource:kanbantags', { detail: sheet.id })))}>
                  {TAG_TEXT.manage(boardTags(ws, sheet.id).filter((t) => t.count).length)} …
                </Item>
              )}
              {/* V88 (BL3): Spalten dieses Boards als Vorlage merken */}
              {sheet?.kind === 'kanban' && (
                <Item icon="layouts" hint={BOARD_TPL_TEXT.saveAsHint} onClick={() => (close(), setTplSave(true))}>
                  {BOARD_TPL_TEXT.saveAs}
                </Item>
              )}
              {/* V81 (D5/D6): ins Dock bzw. heraus an den letzten Platz */}
              <Item icon="dock" hint={dock ? DOCK_TEXT.undockHint : DOCK_TEXT.toDockHint} onClick={() => (close(), toDock(!dock))}>
                {dock ? DOCK_TEXT.undock : DOCK_TEXT.toDock}
              </Item>
              {toNotes && !dock && (
                <Item icon="note" hint={PAD_TEXT.toNotesHint} onClick={() => (close(), toNotes())}>
                  {PAD_TEXT.toNotes}
                </Item>
              )}
              {!dock && (
                <Item icon="slot" disabled={!plan} hint={plan ? (tile ? PLAN_TEXT.notesMoveHint : PLAN_TEXT.padMoveHint) : undefined} title={plan ? undefined : PAD_TEXT.menuPlaceNotes} onClick={() => go('place')}>
                  {PAD_TEXT.menuPlace}
                </Item>
              )}
              <Item icon="close" hint={PAD_TEXT.closePadHint} onClick={() => (close(), closePad())}>
                {PAD_TEXT.closePad}
              </Item>
              {/* V77: Sprachnotiz je Gerät – ab Werk aus, nur lokal */}
              <Item icon="mic" checked={display.voice} hint={VOICE_TEXT.settingHint} onClick={() => setVoice(!display.voice)}>
                {VOICE_TEXT.setting}
              </Item>
              {dock ? (
                <OpacitySlider label={PAD_TEXT.opacityDock} hint={PAD_TEXT.opacityDockHint} value={display.dockOpacity} onChange={setDockOpacity} />
              ) : (
                <OpacitySlider label={PAD_TEXT.opacityPads} hint={PAD_TEXT.opacityHint} value={display.padOpacity} onChange={setPadOpacity} />
              )}
              {/* V75 (F-215 A2): Steuerknopf über der Bildschirmtastatur – je Gerät */}
              <OpacitySlider label={PAD_TEXT.knobOpacity} hint={PAD_TEXT.knobOpacityHint} value={display.knobOpacity} min={KNOB_OP_MIN} onChange={setKnobOpacity} />
              <OpacitySlider label={PAD_TEXT.knobX} hint={PAD_TEXT.knobXHint} value={display.knobX} min={0} step={1} valueText={PAD_TEXT.knobXValue} onChange={setKnobX} />
              {/* F-221 (FB4): Feedback am Ort */}
              <Item icon="feedback" title={FEEDBACK_TEXT.menuHint} onClick={() => (askFeedback(), close())}>{FEEDBACK_TEXT.menuItem}</Item>
            </>
              )}
            </MenuPages>
          )}
        </Menu>
        {headOvf.knob}
        {full && (
          <button
            type="button"
            className="pad__close pad__full"
            aria-pressed={full.on}
            onClick={full.toggle}
            title={full.on ? PAD_TEXT.fullOff : PAD_TEXT.fullOn}
            aria-label={full.on ? PAD_TEXT.fullOff : PAD_TEXT.fullOn}
          >
            <Icon name={full.on ? 'minimize' : 'maximize'} size={14} />
          </button>
        )}
        {dock ? (
          <button type="button" data-ovf-keep="" className="pad__close" onClick={dock.onFold} title={DOCK_TEXT.foldTitle} aria-label={DOCK_TEXT.fold}>
            <Icon name="dockFold" size={14} />
          </button>
        ) : (
          <button type="button" data-ovf-keep="" className="pad__close" onClick={closePad} title={`${PAD_TEXT.closePad} (Esc im Kopf) – ${PAD_TEXT.closePadHint}`} aria-label={PAD_TEXT.closePad}>
            <Icon name="close" size={14} />
          </button>
        )}
      </header>
      {tplSave && sheet?.kind === 'kanban' && (
        <SaveTemplateBar
          ws={ws}
          dispatch={dispatch}
          sheetId={sheet.id}
          say={say}
          onClose={() => {
            setTplSave(false);
            window.setTimeout(() => tabsRef.current?.querySelector<HTMLElement>(`[data-sheet="${sheet.id}"]`)?.focus(), 0);
          }}
        />
      )}
      <div
        className="pad__body"
        role="tabpanel" id={`pad-${pad.id}-panel`} aria-labelledby={sheet ? `pad-${pad.id}-tab-${sheet.id}` : titleId}>
        {!sheet ? (
          <p className="win__placeholder win__placeholder--small">{NOTE_TEXT.missingView}</p>
        ) : sheet.kind === 'block' ? (
          <NoteBlock ws={ws} dispatch={dispatch} padId={pad.id} sheetId={sheet.id} picked={picked[sheet.id]} onPick={(n) => onPick(sheet.id, n)} say={say} cmd={cmd} />
        ) : sheet.kind === 'todo' ? (
          <TodoSheet key={sheet.id} ws={ws} dispatch={dispatch} desk={pad.desk} sheetId={sheet.id} say={say} cmd={cmd} />
        ) : sheet.kind === 'kanban' ? (
          <KanbanSheet key={sheet.id} ws={ws} dispatch={dispatch} desk={pad.desk} sheetId={sheet.id} say={say} cmd={cmd} />
        ) : sheet.kind === 'eisenhower' ? (
          <MatrixSheet key={sheet.id} ws={ws} dispatch={dispatch} desk={pad.desk} sheetId={sheet.id} say={say} cmd={cmd} />
        ) : (
          <div className="pad__soon">
            <p className="win__placeholder">
              <Icon name={KIND_ICON[sheet.kind]} size={22} /> {sheet.name}
            </p>
            <p className="win__hint">{PAD_TEXT.soon(No.VIEW_BASE[sheet.kind], No.countIn(ws, sheet))}</p>
          </div>
        )}
      </div>
      {recentOpen && (
        <div
          className="padfoot__recent"
          role="menu"
          aria-label={FOOT_TEXT.recentList}
          title={FOOT_TEXT.recentHint}
          onKeyDown={recentKey}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setRecentOpen(false);
          }}
        >
          <p className="padfoot__recenthead" aria-hidden="true">
            <Icon name="recent" size={13} /> {FOOT_TEXT.recentList}
          </p>
          {recent.length ? (
            recent.map((r) => (
              <button key={`${r.kind}:${r.id}`} type="button" role="menuitem" className="padfoot__recentitem" onClick={() => openRecent(r)}>
                <Icon name={r.kind === 'sheet' ? KIND_ICON[No.viewById(ws, r.id)?.kind ?? 'block'] : 'note'} size={14} />
                <span>{recentText(r)}</span>
              </button>
            ))
          ) : (
            <button type="button" role="menuitem" className="padfoot__recentitem is-empty" onClick={() => (setRecentOpen(false), toKnob())}>
              {FOOT_TEXT.recentNone}
            </button>
          )}
        </div>
      )}
      {shareOpen && (
        <div
          className="padfoot__recent padfoot__share"
          role="menu"
          aria-label={FOOT_TEXT.shareList}
          title={FOOT_TEXT.shareListHint}
          onKeyDown={shareKey}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setShareOpen(false);
          }}
        >
          <p className="padfoot__recenthead" aria-hidden="true">
            <Icon name="share" size={13} /> {FOOT_TEXT.shareList}
          </p>
          {coarse && (
            <button type="button" role="menuitem" className="padfoot__recentitem" onClick={() => (setShareOpen(false), camRef.current?.click())}>
              <Icon name="image" size={14} />
              <span>{FOOT_TEXT.photo}</span>
            </button>
          )}
          <button type="button" role="menuitem" className="padfoot__recentitem" onClick={() => (setShareOpen(false), fileRef.current?.click())}>
            <Icon name="image" size={14} />
            <span>{FOOT_TEXT.pickPic}</span>
          </button>
          <button type="button" role="menuitem" className="padfoot__recentitem" onClick={() => void shareNote()}>
            <Icon name="share" size={14} />
            <span>{FOOT_TEXT.shareNote}</span>
          </button>
        </div>
      )}
      <input ref={camRef} type="file" accept="image/*" capture="environment" hidden tabIndex={-1} onChange={onFiles} />
      <input ref={fileRef} type="file" accept="image/*" multiple hidden tabIndex={-1} onChange={onFiles} />
      {hint && (
        <p className="padfoot__hint" role="status">
          {hint}
        </p>
      )}
      {!dock && <PadFooter items={footItems} onHome={home} say={say} onSwipe={swipe} swipeLabel={swipeLabel} voice={voice} knob={{ bottom: focusIn ? kbBottom : null, opacity: display.knobOpacity, x: display.knobX, onX: setKnobX }} />}
      {!dock && (tile ? tile.grips : (['n', 's', 'e', 'w', 'se'] as Edge[])).map((edge) => (
        <div
          key={edge}
          className={`pad__grip pad__grip--${edge}${tile ? ' is-border' : ''}`}
          aria-hidden="true"
          title={tile ? PAD_TEXT.border : PAD_TEXT.resize}
          onPointerDown={(e) => (tile ? (e.button === 0 && tile.onGrip(e, edge)) : gesture(e, edge))}
        />
      ))}
    </section>
  );
}

// ---------------------------------------------------------------- Deckkraft (V67, Wunsch Enrico)

/** Schieberegler für die Deckkraft – als Eintrag in einem Menü (Pfeiltasten bleiben beim Regler). */
export function OpacitySlider(props: { label: string; hint: string; value: number; onChange: (v: number) => void; min?: number; step?: number; valueText?: (v: number) => string }) {
  const vt = props.valueText ?? PAD_TEXT.opacityValue;
  const id = `op-${props.label.replace(/\W+/g, '')}`;
  return (
    <li role="none" className="menu__range">
      <label htmlFor={id}>{props.label}</label>
      <span className="menu__range-row">
        <input
          id={id}
          type="range"
          min={props.min ?? OPACITY_MIN}
          max={100}
          step={props.step ?? OPACITY_STEP}
          value={props.value}
          aria-valuetext={vt(props.value)}
          aria-describedby={`${id}-d`}
          onChange={(e) => props.onChange(Number(e.target.value))}
        />
        <output htmlFor={id}>{vt(props.value)}</output>
      </span>
      <span id={`${id}-d`} className="menu__range-hint">
        {props.hint}
      </span>
    </li>
  );
}

/** V68 (Wunsch Enrico): Regler direkt im Pad-Kopf – sichtbar ohne Menü; in schmalen Pads nur im ⋮. */
export function OpacityInline(props: { value: number; onChange: (v: number) => void; label?: string; hint?: string }) {
  return (
    <label className="pad__op" title={`${props.label ?? PAD_TEXT.opacityPads}: ${PAD_TEXT.opacityValue(props.value)} – ${props.hint ?? PAD_TEXT.opacityHintShort}`}>
      <Icon name="contrast" size={13} />
      <input
        type="range"
        min={OPACITY_MIN}
        max={100}
        step={OPACITY_STEP}
        value={props.value}
        aria-label={props.label ?? PAD_TEXT.opacityPads}
        aria-valuetext={PAD_TEXT.opacityValue(props.value)}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </label>
  );
}

// ---------------------------------------------------------------- Notizblock: Liste + geöffnete Note

function NoteBlock(props: {
  ws: Workspace;
  dispatch: Dispatch<Action>;
  padId: string;
  sheetId: string;
  picked?: string;
  onPick: (note: string | null) => void;
  say: (text: string) => void;
  cmd?: Cmd | null;
}) {
  const { ws, dispatch, padId, sheetId, onPick } = props;
  const v = No.viewById(ws, sheetId)!;
  const notes = No.idsIn(v)
    .map((id) => No.noteById(ws, id))
    .filter((n): n is NonNullable<typeof n> => !!n);
  const open = props.picked && notes.some((n) => n.id === props.picked) ? props.picked : undefined;
  // V78 (F-215 Schritt 4): Suche im Notizblock – Feld über der Liste, filtert nach Titel, Text, Tags
  const [find, setFind] = useState<string | null>(null);
  const findRef = useRef<HTMLInputElement>(null);
  const shownNotes = find ? notes.filter((n) => No.noteMatches(No.shownNote(n), find)) : notes;
  const closeFind = (toKnob = false) => {
    setFind(null);
    window.setTimeout(() => {
      const knob = sideRef.current?.closest('.pad')?.querySelector<HTMLElement>('.padfoot__home');
      (toKnob ? knob : listRef.current?.querySelector<HTMLElement>('button') ?? knob)?.focus({ preventScroll: true });
    }, 0);
  };
  const findKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      return closeFind(true);
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      return listRef.current?.querySelector<HTMLElement>('button')?.focus();
    }
    if (e.key === 'Enter' && shownNotes[0]) {
      e.preventDefault();
      pick(shownNotes[0].id);
    }
  };
  const listRef = useRef<HTMLUListElement>(null);
  const reminders = useReminders(notes, { sound: switchOf(ws, 'remindSound') === 'on', system: switchOf(ws, 'remindSystem') === 'on' });
  // V68: Meldungen im Notizblock selbst (in der Note bzw. oben in der Liste), nicht unten am Rand
  const [msg, setMsg] = useState<Notice | null>(null);
  const timer = useRef(0);
  const notice = (m: Notice) => {
    window.clearTimeout(timer.current);
    setMsg(m);
    // V79 (Wunsch Enrico): alle Meldungen im Notizblock höchstens 2 Sekunden
    timer.current = noticeLater(() => setMsg(null), 1, m.ms);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const runUndo = msg?.undo ? () => (setMsg(null), msg.undo!()) : undefined;
  const shown = msg ? { ...msg, ...(runUndo ? { undo: runUndo } : {}) } : null;
  // Note verschwunden (gelöscht, verschoben) → Auswahl lösen
  useEffect(() => {
    if (props.picked && !open) onPick(null);
  }, [props.picked, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = () => {
    leave();
    const id = newId();
    freshNotes.add(id); // V75 (T5): neue Note – Tastatur darf sofort aufgehen
    dispatch({ type: 'padNote', id: padId, sheet: sheetId, note: id, by: ws.profile?.name || undefined });
    // F-206 Schritt 6 (V93, Q2 a): im Desk-Modus mit der Seite im aktiven Portal verknüpft – abwählbar über × am Chip
    const page = document.querySelector('.padlayer.is-notes') ? null : NS.activePage(ws);
    if (page) {
      dispatch({ type: 'noteLink', id, url: page.url, title: page.title, sid: newId(), by: ws.profile?.name || undefined });
      props.say(NS.SOURCE_LINK_TEXT.autoLinked(page.title));
    }
    onPick(id);
  };
  // F-213 (S8): beim Wechsel bleibt ein Entwurf still erhalten; nur eine leere neue Note fällt weg
  const leave = () => {
    const cur = open ? No.noteById(ws, open) : undefined;
    if (cur && No.isEmptyDraft(ws, cur)) dispatch({ type: 'noteDiscard', id: cur.id });
  };
  const pick = (id: string) => {
    if (id !== open) leave();
    onPick(id);
  };
  const back = () => {
    const was = open;
    leave();
    onPick(null);
    window.setTimeout(() => listRef.current?.querySelector<HTMLElement>(`[data-note="${was}"]`)?.focus() ?? listRef.current?.querySelector<HTMLElement>('button')?.focus(), 0);
  };
  // F-215: Home = zur Liste (Fokus auf den Listenanfang), Neue Note aus dem Halbkreis
  const sideRef = useRef<HTMLDivElement>(null);
  const done = useRef(props.cmd?.n ?? 0);
  useEffect(() => {
    if (!props.cmd || props.cmd.n === done.current) return;
    done.current = props.cmd.n;
    if (props.cmd.k === 'new') return add();
    if (props.cmd.k === 'go') return props.cmd.id ? pick(props.cmd.id) : undefined;
    if (props.cmd.k === 'search') {
      setFind((f) => f ?? '');
      return void window.setTimeout(() => findRef.current?.focus({ preventScroll: true }), 0);
    }
    if (open) leave();
    onPick(null);
    window.setTimeout(() => (listRef.current?.querySelector<HTMLElement>('button') ?? sideRef.current?.querySelector<HTMLElement>('button'))?.focus(), 0);
  }, [props.cmd?.n]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`nblock${open ? ' has-open' : ''}${find !== null ? ' is-finding' : ''}`}>
      <div className="nblock__side" ref={sideRef}>
        <button type="button" className="nblock__new" onClick={add} title={explain(TERMS.note)}>
          <Icon name="plus" size={14} /> <span className="nblock__newtext">{PAD_TEXT.newNote}</span>
        </button>
        {find !== null && (
          <div className="nblock__find" role="search">
            <Icon name="search" size={13} />
            <input
              ref={findRef}
              type="search"
              value={find}
              placeholder={FOOT_TEXT.findPh}
              aria-label={FOOT_TEXT.find}
              aria-describedby={`${sheetId}-findhint`}
              title={FOOT_TEXT.findHint}
              onChange={(e) => setFind(e.target.value)}
              onKeyDown={findKey}
            />
            <button type="button" className="nblock__findx" aria-label={FOOT_TEXT.findClose} title={FOOT_TEXT.findClose} onClick={() => closeFind()}>
              <Icon name="close" size={11} />
            </button>
            <span id={`${sheetId}-findhint`} className="sr-only">{FOOT_TEXT.findHint}</span>
            <span className="sr-only" role="status">{find ? FOOT_TEXT.findCount(shownNotes.length, notes.length) : ''}</span>
          </div>
        )}
        {find && !shownNotes.length && notes.length > 0 && <p className="nblock__empty">{FOOT_TEXT.findNone}</p>}
        {shownNotes.length ? (
          <ul className="nblock__list" aria-label={PAD_TEXT.list} ref={listRef}>
            {shownNotes.map((raw) => {
              const n = No.shownNote(raw);
              const t = No.titleOf(n) || NOTE_TEXT.untitled;
              const draft = No.hasDraft(raw);
              // V79 (T10/T11): Sprachnotiz bzw. Notiz mit Ton – eigener Farbton und Symbol, nie Farbe allein
              const tone = No.hasAudio(raw);
              const spoken = tone || No.isVoiceNote(raw);
              const mark = tone ? AUDIO_TEXT.listTone : spoken ? AUDIO_TEXT.listVoice : '';
              const pic = No.hasImage(n);
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    data-note={n.id}
                    draggable
                    onDragStart={(e) => {
                      // V93 (Q2 c): Notiz auf ein Portal ziehen = mit dessen Seite verknüpfen
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData(DRAG_NOTE, n.id);
                    }}
                    className={`nblock__item${n.id === open ? ' is-on' : ''}${No.isFinished(n.state) ? ' is-done' : ''}${draft ? ' is-draft' : ''}${spoken ? ' is-voice' : ''}${tone ? ' has-tone' : ''}`}
                    aria-current={n.id === open ? 'true' : undefined}
                    title={mark ? `${t} – ${tone && No.isVoiceNote(raw) ? `${AUDIO_TEXT.listVoice} ${mark}` : mark}` : t}
                    onClick={() => pick(n.id)}
                  >
                    {/* V69: Kürzel für die schmale Randleiste (Liste verschwindet nie ganz) */}
                    <span className="nblock__mono" aria-hidden="true">{t.trim().charAt(0).toUpperCase() || '·'}</span>
                    <span className="nblock__title">
                      {spoken && (
                        <span className="nblock__voice" aria-hidden="true">
                          <Icon name={tone ? 'micWave' : 'mic'} size={13} />
                        </span>
                      )}
                      {/* V80 (B5): Bild im Text – kleines Symbol vor dem Titel, keine eigene Farbe */}
                      {pic && (
                        <span className="nblock__pic" aria-hidden="true">
                          <Icon name="image" size={13} />
                        </span>
                      )}
                      {t}
                      {mark && <span className="sr-only">, {tone && No.isVoiceNote(raw) ? `${AUDIO_TEXT.listVoice} ${mark}` : mark}</span>}
                      {pic && <span className="sr-only">, {NOTE_TEXT.imgListMark}</span>}
                    </span>
                    <span className="nblock__state">
                      {draft && <span className="nblock__draft">{DRAFT_TEXT.listDraft}</span>}
                      {NOTE_TEXT.states[No.stateOf(ws, n).state]}
                      {/* V73: Erinnerung in der Liste sichtbar */}
                      {raw.remind && <span className="nblock__when"> · {remindLabel(raw.remind.at)}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : find ? null : (
          <p className="nblock__empty">{PAD_TEXT.empty}</p>
        )}
      </div>
      <div className="nblock__main">
        {open ? (
          <>
            <button type="button" className="nblock__back" onClick={back}>
              <Icon name="back" size={14} /> {PAD_TEXT.toList}
            </button>
            {/* V74: Erinnerung über der Leiste Speichern/Verwerfen/Schließen (am Ort, F-214) */}
            <NoteTab ws={ws} noteId={open} dispatch={dispatch} sheet={sheetId} draft={{ onClose: back, say: props.say, notice, shown, above: <RemindAlarm r={reminders} onOpen={pick} /> }} />
          </>
        ) : (
          <p className="nblock__pick">{PAD_TEXT.pick}</p>
        )}
      </div>
      {/* V74 (Wunsch Enrico): ohne offene Note erscheinen Meldungen unten in der Notizfläche – dort, wo eben
          noch Speichern/Verwerfen/Schließen standen –, nicht in der Seitenleiste */}
      {!open && (shown || reminders.shown.length > 0) && (
        <div className="nblock__float">
          <RemindAlarm r={reminders} onOpen={pick} />
          {shown && (
            <p className="nblock__msg" role="status">
              {shown.text}
              {shown.undo && (
                <button type="button" className="note__undo" onClick={shown.undo}>
                  {PAUSE_TEXT.undo}
                </button>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
