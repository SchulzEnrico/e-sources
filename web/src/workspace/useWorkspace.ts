import { setFit, setZoom } from './zoom';
import { type ColorsSnap, type DesignSnap, restoreColors, restoreDesign } from './reset';
import { setPause, setPauseShown, setSourcesKeep, toggleKeep, toggleKeepTab } from './pause';
import { setEngine } from './websearch';
import { openInNewSlot } from './send';
import { useEffect, useReducer, useRef } from 'react';
import type { Lines, Orientation, ScreenClassId, ScreenSetup } from './screen';
import { WORKSPACE_KEY, loadWorkspace, parseWorkspace, saveWorkspace } from './storage';
import { PROBE } from './probe';
import { type Profile, setProfile } from './profile';
import * as Win from './windows';
import * as Mv from './move';
import type { Min, Node, Zone } from './tree';
import type { Arrangement, Bookmark, Workspace } from './types';
import * as B from './bookmarks';
import * as W from './workspace';
import * as C from './closed';
import * as DL from './deskLayouts';
import { mergeSlotTabs } from './jackpot';
import * as F from './focus';
import type { FocusRule } from './focus';
import { followMainLook, type Look, setDeskLook } from './look';
import { clearDeskTints, restoreTints, setPanelTint, setSlotTint, type TintKind, type TintSnapshot } from './tint';
import { type ImportPlan, applyImport } from './browserBookmarks';
import { sortAll, sortInto } from './sortHelp';
import { setCategoryIcon, setCategoryTint, setPanelCategory, setPanelNewCategory } from './category';
import * as Cs from './cases';
import * as NS from './noteSources';
import * as No from './notes';
import * as Pd from './pads';
import * as NT from './noteTree';
import * as NL from './notesLayouts';
import * as RS from './ruleSet';
import type { BoardTemplate, ColState, FocusView, NoteState, NoteView, NoteViewKind, PadPlace, Person, Project, SourceLink, SourceSpot } from './types';
import * as BT from './boardTemplates';
import * as Sh from './sheets';
import * as Ps from './persons';
import * as Pj from './projects';
import * as Psp from './psp';
import * as Sc from './schedule';
import * as Gt from './gantt';
import * as Fb from './feedback';
import * as Dc from './decisions';
import * as Sp from './sampleProject';
import * as FL from './focusLoad';
import * as St from './stage';
import { type RuleUndo, deleteRule, restoreRule, setRuleOn, setSiteCategory } from './rules';

type S = { setup: ScreenSetup };

export type Action =
  | ({ type: 'add'; area?: string; id?: string } & S)
  /** F-134: neue Area als Spalte rechts oder Zeile unten. */
  | ({ type: 'addArea'; side: 'left' | 'right' | 'top' | 'bottom'; near?: string } & S)
  /** F-24: mit `setup` wird das Portal unter „Zuletzt geschlossen“ gemerkt. */
  | { type: 'remove'; id: string; setup?: ScreenSetup }
  /** F-170 Stufe 2: Slot zusammenlegen – weitere Seiten als Tabs ins bleibende Portal, die anderen schließen (→ Zuletzt geschlossen). */
  | { type: 'mergeSlot'; keep: string; others: string[]; setup: ScreenSetup }
  | { type: 'restore'; setup: ScreenSetup; entry?: string }
  /** F-29 Rest: Grenzen der Fokusanzeige; null = Voreinstellung. */
  | { type: 'focusRule'; rule: Partial<FocusRule> | null }
  | { type: 'profile'; change: Partial<Profile> }
  | { type: 'rename'; id: string; name: string }
  /** F-36: Lesezeichen aus einer Browser-Datei in die Library übernehmen. */
  | { type: 'importBookmarks'; plan: ImportPlan; from?: string }
  /** F-180: Sortierhilfe – Sources in eine Kategorie (per Name, wird bei Bedarf angelegt) bzw. alle Vorschläge. */
  | { type: 'sortInto'; ids: string[]; name: string }
  | { type: 'sortAll' }
  | { type: 'setUrl'; id: string; url: string }
  | { type: 'history'; id: string; step: number }
  | { type: 'home'; id: string }
  | { type: 'setHome'; id: string }
  /** F-43: Domain als einbettbar oder gesperrt merken. */
  | { type: 'embed'; url: string; ok: boolean }
  | { type: 'addTab'; id: string; url?: string }
  | { type: 'closeTab'; id: string; tab: string }
  | { type: 'selectTab'; id: string; tab: string }
  | { type: 'moveTab'; id: string; tab: string; to: number }
  | ({ type: 'swap'; a: string; b: string } & S)
  | ({ type: 'drop'; id: string; target: string; zone: Zone } & S)
  | ({ type: 'setLayout'; tree: Node } & S)
  | ({ type: 'setSize'; id: string; w: number; h: number; min: Min } & S)
  | ({ type: 'resetPanel'; id: string; min: Min } & S)
  | ({ type: 'distribute' } & S)
  | ({ type: 'savePreferred' } & S)
  | ({ type: 'clearPreferred' } & S)
  | ({ type: 'resetLayout' } & S)
  | ({ type: 'stackFront'; id: string } & S)
  | ({ type: 'stackStep'; area: string; step: number } & S)
  /** F-128: Area umbenennen; Stapel ohne Namen benennen. */
  | ({ type: 'renameArea'; area: string; name: string } & S)
  | ({ type: 'ensureAreas' } & S)
  | { type: 'setLines'; cls: ScreenClassId; orientation: Orientation; lines: Lines }
  /** F-30 bis F-32: Lesezeichen und Kategorien. */
  | { type: 'saveBookmark'; bookmark: Bookmark }
  | { type: 'deleteBookmark'; id: string }
  | { type: 'moveBookmark'; id: string; to: number; category?: string }
  | { type: 'dropBookmark'; id: string; target: string }
  | { type: 'toggleBookmarkPanel'; id: string; panel: string }
  | { type: 'openBookmark'; panel: string; url: string }
  | { type: 'openNote'; panel: string; ref: No.NoteRef }
  | { type: 'tabLeave'; id: string; tab: string }
  | { type: 'newNote'; panel: string; kind: 'note' | NoteViewKind; by?: string }
  /** F-189 Stufe 2: gesendete Seite in einem neuen Slot öffnen. */
  | ({ type: 'sendNewSlot'; url: string } & S)
  | { type: 'addCategory'; id: string; name: string }
  | { type: 'renameCategory'; id: string; name: string }
  | { type: 'deleteCategory'; id: string }
  | { type: 'moveCategory'; id: string; to: number }
  | { type: 'addSamples' }
  /** F-15, F-125: Lineal. */
  | { type: 'rulerAll' }
  | { type: 'rulerPanel'; id: string }
  /** F-200: Entwickler-Modus je Portal */
  | { type: 'devPanel'; id: string }
  | { type: 'devView'; id: string; device?: string | null; turned?: boolean; scale?: number }
  /** F-06: Portale pausieren. */
  | { type: 'pause'; minutes: number }
  | { type: 'keepPanel'; id: string }
  | { type: 'pauseShown'; minutes: number }
  | { type: 'keepTab'; id: string; tab: string }
  /** F-202: Sources nie pausieren (eine oder viele) */
  | { type: 'keepSources'; ids: string[]; keep: boolean }
  /** F-204: Mehrfachauswahl – gemeinsam einstellen und Rückgängig */
  | { type: 'bulkSources'; ids: string[]; change: B.BulkChange }
  | { type: 'restoreSources'; before: Bookmark[]; order: string[] }
  | { type: 'zoomPanel'; id: string; zoom: number }
  | { type: 'fitPanel'; id: string; fit?: number; zoom?: number }
  /** F-189: Suchmaschine. */
  | { type: 'engine'; id: string }
  | { type: 'rulerStyle'; labels?: boolean; color?: number }
  /** F-60, F-61: Darstellung. */
  | ({ type: 'look'; win?: string } & Partial<Look>)
  | { type: 'followMainLook'; win: string }
  | { type: 'panelCategory'; id: string; category: string; url?: string }
  | { type: 'panelNewCategory'; id: string; name: string; catId: string; url?: string }
  | { type: 'tintCategory'; id: string; change: Partial<Record<TintKind, string | null>> }
  // F-183 Stufe 2: Zeichen je Kategorie
  | { type: 'iconCategory'; id: string; icon: string | null }
  | { type: 'restoreColors'; snap: ColorsSnap }
  | { type: 'restoreDesign'; snap: DesignSnap }
  // F-164: Regeln ein/aus, Seite → Kategorie, löschen und wiederherstellen
  | { type: 'ruleOn'; id: string; on: boolean }
  | { type: 'siteCategory'; domain: string; category: string }
  | { type: 'ruleDelete'; id: string }
  | { type: 'ruleRestore'; undo: RuleUndo }
  // F-218 (V92): Schalter A1–A9 und Wenn-dann-Regeln W1–W4
  | { type: 'ruleSwitch'; id: RS.SwitchId; value: string }
  | { type: 'ruleWhen'; id: RS.WhenRule; on: boolean }
  | { type: 'ruleSweep'; now?: number }
  | { type: 'tintPanel'; id: string; change: Partial<Record<TintKind, string | null>> }
  | { type: 'tintSlot'; setup: ScreenSetup; area: string; change: Partial<Record<TintKind, string | null>> }
  | { type: 'clearTints'; win: string }
  | { type: 'restoreTints'; snap: TintSnapshot }
  /** F-121: ganze Arbeitsfläche durch eine importierte ersetzen. */
  | { type: 'replace'; ws: Workspace }
  /** F-27: Stand aus einem anderen Fenster übernehmen (wird hier nicht erneut gespeichert). */
  | { type: 'remote'; ws: Workspace }
  /** F-27: Panels in ein Fenster verschieben ('' = Hauptfenster; unbekannte Id = neues Fenster). */
  | { type: 'toWindow'; ids: string[]; win: string }
  /** F-165: leeren Desk mit einem neuen Panel anlegen. */
  | { type: 'addDesk'; win: string; std?: ReturnType<typeof DL.standardContent> }
  /** F-27/F-28: Panels in dieses Fenster holen, höchstens so viele, wie Platz haben. */
  | { type: 'fetch'; ids: string[]; setup: ScreenSetup }
  | { type: 'returnAll'; win: string; dissolve?: boolean }
  | ({ type: 'fitSlots' } & S)
  | ({ type: 'setArrangement'; arr: Arrangement } & S)
  | { type: 'renameWindow'; win: string; name: string }
  /** F-28: Panels auf eine Area legen (auch in einem anderen Fenster); area = Id, 'new' oder ''. */
  | { type: 'move'; ids: string[]; from: ScreenSetup; win: string; area: string }
  /** F-28: Fenster merkt sich seine Bildschirm-Einstellung. */
  | { type: 'seen'; setup: ScreenSetup }
  // F-51: Layouts je Desk
  | { type: 'layoutSwitch'; win: string; id: string }
  | { type: 'layoutAdd'; win: string; setup: ScreenSetup; from: 'current' | 'even'; name?: string }
  | { type: 'layoutCopy'; win: string; id: string }
  | { type: 'layoutRename'; win: string; id: string; name: string }
  | { type: 'layoutDelete'; win: string; id: string }
  | { type: 'layoutRestore'; deleted: DL.DeletedLayout }
  | { type: 'layoutReset'; win: string; std: ReturnType<typeof DL.standardContent> }
  | { type: 'layoutUnreset'; win: string; old: DL.LayoutContent }
  // F-187: Slots eines (auch nicht aktiven) Layouts
  | { type: 'layoutSlotSwap'; win: string; id: string; setup: ScreenSetup; a: string; b: string }
  | { type: 'layoutSlotClose'; win: string; id: string; setup: ScreenSetup; area: string }
  | { type: 'layoutContent'; win: string; id: string; content: DL.LayoutContent }
  | { type: 'layoutArrange'; win: string; id: string; setup: ScreenSetup; op: DL.ArrangeOp }
  // F-116: Spaces und Cases (Id kommt vom Aufrufer, damit er gleich darauf zeigen kann)
  | { type: 'spaceAdd'; id: string; name: string; color?: string }
  | { type: 'spaceEdit'; id: string; name?: string; color?: string | null }
  | { type: 'spaceDelete'; id: string }
  | { type: 'caseAdd'; id: string; space: string; name: string; color?: string }
  | { type: 'caseEdit'; id: string; name?: string; color?: string | null; space?: string }
  | { type: 'caseDelete'; id: string }
  | { type: 'casesRestore'; snap: Cs.CasesSnap }
  | { type: 'layoutCase'; win: string; layout: string; caseId: string; on: boolean }
  | { type: 'casePick'; win: string; caseId: string | null }
  /** F-206: im Tab eine neue Notiz bzw. Ansicht anlegen (Tab zeigt nur darauf). */
  | { type: 'tabNote'; id: string; tab: string; kind: 'note' | NoteViewKind; by?: string; noteId?: string }
  | { type: 'noteEdit'; id: string; patch: No.NotePatch; by?: string }
  /** F-206 Schritt 8 (V94): Personen und Zuständig */
  | { type: 'personAdd'; name: string; kind?: Person['kind']; extra?: Partial<Person>; assignTo?: string; by?: string }
  | { type: 'personEdit'; id: string; patch: Partial<Omit<Person, 'id' | 'me'>> }
  | { type: 'focusView'; view: FocusView; on: boolean }
  // F-207 (V96): Main Stage je Desk
  | { type: 'stageSet'; desk: string; area: string | null }
  | { type: 'stageEdit'; desk: string; patch: Partial<Pick<St.Stage, 'fixed' | 'minW' | 'minH'>> }
  | { type: 'stageRestore'; desk: string; undo: St.Stage | undefined }
  | { type: 'personRemove'; id: string }
  /* F-206 Schritt 10 (V98): Projekte */
  | { type: 'projectAdd'; name: string; extra?: Partial<Omit<Project, 'id' | 'created' | 'changed'>> }
  | { type: 'projectEdit'; id: string; patch: Partial<Omit<Project, 'id' | 'created' | 'changed'>> }
  | { type: 'projectRemove'; id: string }
  | { type: 'projectRestore'; undo: Pj.ProjectUndo }
  | { type: 'noteProject'; id: string; project?: string }
  /* F-206 Schritt 10 (V100): PSP und Planung je Vorgang */
  | { type: 'pspAdd'; project: string; title: string; note: string; after?: string; under?: string; by?: string }
  | { type: 'pspMove'; project: string; id: string; by: number }
  | { type: 'pspShift'; project: string; id: string; out: boolean }
  | { type: 'taskPlan'; id: string; plan: Sc.TaskPlan }
  | { type: 'taskPreds'; project: string; id: string; links: Gt.PredInput['links'] }
  | { type: 'sampleProject'; on: boolean }
  /* F-221 (V102): Feedback */
  | { type: 'fbAdd'; id: string; v: Fb.NewFeedback; at: string }
  | { type: 'fbEdit'; id: string; patch: Fb.FeedbackPatch }
  | { type: 'fbState'; id: string; state: Fb.FeedbackStateName; why?: string; by?: string }
  | { type: 'fbMark'; id: string; kind: 'note' | 'decision' | 'ref'; text: string; by?: string }
  | { type: 'fbTo'; id: string; to: string; from: string; toName: string; by?: string }
  | { type: 'fbList'; list: import('./types').Feedback[] }
  | { type: 'fbRemove'; id: string }
  | { type: 'fbRestore'; undo: Fb.FeedbackUndo }
  // F-222 (V104): Nutzwertanalyse
  | { type: 'dcAdd'; id: string; ids: string[]; title: string; projectId?: string; at: string; names: { criterion: string[]; option: string[] } }
  | { type: 'dcExample'; id: string; ids: string[]; which: 'flat' | 'painter'; projectId?: string; at: string }
  | { type: 'dc'; id: string; o: Dc.DecisionOp; at: string }
  | { type: 'dcRemove'; id: string }
  | { type: 'dcRestore'; undo: Dc.DecisionUndo }
  | { type: 'fbAskEase'; on: boolean }
  | { type: 'personRestore'; undo: Ps.PersonUndo }
  | { type: 'noteAssign'; id: string; person?: string; by?: string }
  | { type: 'noteDelegate'; id: string; person: string; by?: string }
  // F-206 Schritt 6 (V93): Notiz ↔ Quelle – `sid` = Id für eine neu anzulegende Source (Reducer bleibt rein)
  | { type: 'noteLink'; id: string; url: string; title: string; at?: SourceSpot; sid: string; by?: string }
  | { type: 'noteUnlink'; id: string; index: number; by?: string }
  | { type: 'noteRelink'; id: string; index: number; link: SourceLink; by?: string }
  | { type: 'noteSpot'; id: string; index: number; at?: SourceSpot; by?: string }
  | { type: 'sourceRevive'; link: SourceLink }
  | { type: 'noteForPage'; note: string; url: string; title: string; sid: string; by?: string }
  | { type: 'noteForward'; id: string; to: string; by?: string }
  | { type: 'noteState'; id: string; state: NoteState; reason?: string; by?: string }
  | { type: 'noteDelete'; id: string; keepChildren?: boolean }
  | { type: 'noteRestore'; undo: No.NoteUndo; by?: string }
  // F-206 Schritt 3: Pads (Ids kommen vom Aufrufer, damit er weiß, was entsteht)
  | { type: 'padNew'; desk: string; id: string; sheet: string; place?: PadPlace }
  | { type: 'padPlace'; desk: string; id: string; place: PadPlace }
  /** F-210 Schritt 4 (V90): Baum der Pads im Notizen-Modus setzen. */
  | { type: 'noteTree'; desk: string; tree: Node | null; key: string }
  /** F-210 Schritt 5 (V91, Z1–Z4): Notizen-Layouts je Desk. */
  | { type: 'notesSwitch'; desk: string; id: string }
  | { type: 'notesAdd'; desk: string; from: NL.NotesFrom; key: string; name?: string; id: string }
  | { type: 'notesCopy'; desk: string; id: string }
  | { type: 'notesRename'; desk: string; id: string; name: string }
  | { type: 'notesDelete'; desk: string; id: string }
  | { type: 'notesRestore'; deleted: NL.DeletedNotesLayout }
  | { type: 'padRaise'; id: string }
  /** F-206 Schritt 4 (V81): Dock – Pad hinein/heraus, alle, Breite/Lasche, ein/aus (geräteeigen außer `docked`). */
  | { type: 'padDock'; id: string; on: boolean }
  | { type: 'padNotes'; ids: string[]; on: boolean }
  | { type: 'padDockAll'; desk: string; on: boolean }
  | { type: 'dockSet'; desk: string; w?: number; folded?: boolean }
  | { type: 'dockOff'; desk: string; off: boolean }
  | { type: 'padShow'; id: string; sheet: string }
  | { type: 'padRecent'; id: string; note?: string; sheet?: string }
  | { type: 'padAddSheet'; id: string; kind: NoteViewKind; sheet: string; tpl?: string }
  | { type: 'padMoveSheet'; id: string; sheet: string; to: number }
  | { type: 'padCloseSheet'; id: string; sheet: string }
  | { type: 'padClose'; id: string }
  /** F-206 Schritt 5 (V85): Cockpit „Notizen“ – Pad auf einen anderen Desk (N10), Schließen rückgängig. */
  | { type: 'padToDesk'; id: string; desk: string; place?: PadPlace }
  | { type: 'padRestore'; undo: Pd.PadUndo }
  | { type: 'padRestoreSheet'; undo: Pd.SheetUndo }
  | { type: 'padRenameSheet'; sheet: string; name: string }
  | { type: 'padNote'; id: string; sheet: string; note: string; by?: string }
  // F-206 Schritt 7 (V86): To-do, Kanban, Eisenhower
  | { type: 'sheetDone'; note: string; here?: string; by?: string }
  | { type: 'sheetAdd'; view: string; title: string; note: string; col?: string; index?: number; by?: string }
  | { type: 'sheetShift'; view: string; note: string; by: number }
  | { type: 'sheetRemove'; view: string; note: string; by?: string }
  | { type: 'sheetRestore'; view: NoteView }
  | { type: 'cardMove'; view: string; note: string; col: string; index?: number; from?: string; by?: string }
  | { type: 'sheetMoveTo'; note: string; from: string; to: string; by?: string }
  | { type: 'colAdd'; view: string; name: string; col: string }
  | { type: 'colRename'; view: string; col: string; name: string }
  | { type: 'colMove'; view: string; col: string; index: number }
  | { type: 'colRemove'; view: string; col: string }
  | { type: 'colState'; view: string; col: string; state: ColState }
  | { type: 'colWip'; view: string; col: string; wip?: number }
  | { type: 'sheetReview'; view: string; on: boolean }
  | { type: 'colSort'; view: string; col: string; by: Sh.ColSort }
  | { type: 'colMoveAll'; view: string; col: string; to: string; by?: string }
  | { type: 'quadSet'; view: string; note: string; q: Sh.Quad; by?: string }
  | { type: 'checkToTask'; note: string; index: number; view?: string; id: string; by?: string }
  | { type: 'reviewOk'; note: string; by?: string }
  | { type: 'taskRename'; note: string; title: string; by?: string }
  // F-213 (V68): Entwurf bis „Speichern“
  | { type: 'noteDraft'; id: string; patch: No.DraftPatch; by?: string }
  | { type: 'noteSave'; id: string; by?: string }
  | { type: 'noteDiscard'; id: string }
  | { type: 'noteUndoDiscard'; undo: No.DraftUndo; by?: string }
  | { type: 'padOpen'; desk: string; ref: No.NoteRef; ids: string[] }
  | { type: 'padCreate'; desk: string; kind: 'note' | NoteViewKind; ids: string[]; by?: string; tpl?: string }
  // V88 (BL): Board-Vorlagen
  | { type: 'tplFromBoard'; view: string; name: string; id: string }
  | { type: 'tplAdd'; tpl: Omit<BoardTemplate, 'id'>; id: string }
  | { type: 'tplRename'; id: string; name: string }
  | { type: 'tplDelete'; id: string }
  | { type: 'tplRestore'; undo: BT.TemplateUndo };

/**
 * F-206 Schritt 3: Note/Sheet in einem Pad öffnen bzw. neu anlegen und öffnen (P3). Aufrufer und
 * Reducer rechnen mit denselben Ids, damit die Oberfläche weiß, welches Pad und Sheet entsteht.
 */
export function padOpenResult(ws: Workspace, a: { desk: string; ref?: No.NoteRef; create?: 'note' | NoteViewKind; ids: string[]; by?: string; tpl?: string }): Pd.OpenInPadResult & { id?: string } {
  const make = idSeq(a.ids);
  // V87 (E3): genau eine Eisenhower-Matrix – eine zweite anlegen öffnet die vorhandene
  const matrix = a.create === 'eisenhower' ? Sh.theMatrix(ws) : undefined;
  if (matrix) return Pd.openSheetInPad(ws, a.desk, matrix.id, { makeId: make });
  if (a.create) {
    // V88 (BL2): Kanban aus einer Vorlage – Spalten-Ids kommen danach zufällig (Aufrufer braucht nur die Sheet-Id)
    const made =
      a.create === 'note'
        ? No.createNote(ws, { unsaved: true }, { by: a.by, id: make() })
        : a.create === 'kanban' && a.tpl
          ? BT.createBoard(ws, a.tpl, { id: make() })
          : No.createView(ws, a.create, No.defaultViewName(ws, a.create), { id: make() });
    const r = a.create === 'note' ? Pd.openNoteInPad(made.ws, a.desk, made.id, { makeId: make }) : Pd.openSheetInPad(made.ws, a.desk, made.id, { makeId: make });
    return { ...r, id: made.id };
  }
  return a.ref?.note ? Pd.openNoteInPad(ws, a.desk, a.ref.note, { makeId: make }) : Pd.openSheetInPad(ws, a.desk, a.ref?.view ?? '', { makeId: make });
}

/** Ids der Reihe nach ausgeben (danach zufällig) – Aufrufer und Reducer kommen so auf dieselben Ids. */
export const idSeq = (ids: readonly string[]) => {
  let i = 0;
  return () => ids[i++] ?? W.newId();
};

/** F-206 Schritt 8 (V94, P6): Aktionen, die eine Notiz neu anlegen – sie bekommt „ich“ als zuständig. */
const NEW_NOTE = new Set<Action['type']>(['padOpen', 'newNote', 'tabNote', 'noteForPage', 'sheetAdd', 'padNote', 'checkToTask', 'pspAdd']);

export function reducer(ws: Workspace, a: Action): Workspace {
  const raw = step(ws, a);
  const next0 = NEW_NOTE.has(a.type) && raw !== ws ? Ps.defaultAssignee(ws, raw) : raw;
  // F-218 (V92): Wenn-dann-Regeln W1/W2 (nicht bei Abgleich – das andere Gerät hat sie schon angewandt)
  const next = a.type === 'remote' || next0 === ws ? next0 : Sh.applyWhenRules(ws, next0);
  // F-27: Fensterliste passend zu den Panels halten (leere Fenster fallen weg).
  // F-51: leerer Zusatz-Desk mit gespeicherten Layouts wechselt, statt wegzufallen.
  return a.type === 'remote' || next === ws ? next : Win.syncWindows(DL.rescueEmptyDesks(next));
}

function step(ws: Workspace, a: Action): Workspace {
  switch (a.type) {
    case 'add':
      return W.addPanel(ws, a.setup, a.area, a.id);
    case 'addArea':
      return W.addArea(ws, a.setup, a.side, a.near);
    case 'mergeSlot': {
      let next = mergeSlotTabs(ws, a.keep, a.others);
      for (const id of a.others) next = C.closePanel(next, id, a.setup);
      return next;
    }
    case 'remove':
      return a.setup ? C.closePanel(ws, a.id, a.setup) : W.removePanel(ws, a.id);
    case 'profile':
      return setProfile(ws, a.change);
    case 'focusRule':
      return F.setFocusRule(ws, a.rule);
    case 'restore':
      return C.restoreClosed(ws, a.setup, a.entry).ws;
    case 'rename':
      return W.renamePanel(ws, a.id, a.name);
    case 'setUrl': {
      // F-206: Adresse im Tab einer leeren Notiz → Notiz still verwerfen
      const p = ws.panels.find((x) => x.id === a.id);
      const t = p?.tabs.find((x) => x.id === p.activeTab);
      const next = W.navigatePanel(ws, a.id, a.url);
      return t?.note && !t.url && next !== ws ? No.dropIfEmpty(next, t.note) : next;
    }
    case 'newNote': {
      const made = a.kind === 'note' ? No.createNote(ws, {}, { by: a.by }) : No.createView(ws, a.kind, '');
      const r = No.openNoteIn(made.ws, a.panel, a.kind === 'note' ? { note: made.id } : { view: made.id });
      return r.result === 'opened' ? r.ws : ws;
    }
    case 'tabLeave':
      return No.leaveTab(ws, a.id, a.tab);
    case 'openNote': {
      const r = No.openNoteIn(ws, a.panel, a.ref);
      return r.result === 'opened' ? r.ws : ws;
    }
    case 'history':
      return W.historyStep(ws, a.id, a.step);
    case 'home':
      return W.goHome(ws, a.id);
    case 'setHome':
      return W.setHome(ws, a.id);
    case 'embed':
      return W.setEmbed(ws, a.url, a.ok);
    case 'addTab':
      return W.addTab(ws, a.id, a.url);
    case 'closeTab': {
      // F-206: leere Notiz still verwerfen; alles andere bleibt in der Library
      const t = ws.panels.find((p) => p.id === a.id)?.tabs.find((x) => x.id === a.tab);
      const cleared = t && !t.url ? No.dropIfEmpty(ws, t.note, t.id) : ws;
      if (cleared !== ws) return W.closeTab(cleared, a.id, a.tab);
      return C.closeTabRemember(ws, a.id, a.tab, (w) => W.closeTab(w, a.id, a.tab));
    }
    case 'tabNote': {
      const tab = ws.panels.find((p) => p.id === a.id)?.tabs.find((x) => x.id === a.tab);
      if (!tab || tab.url || tab.note || tab.view) return ws;
      const made =
        a.kind === 'note'
          ? No.createNote(ws, {}, { by: a.by, ...(a.noteId ? { id: a.noteId } : {}) })
          : No.createView(ws, a.kind, '', a.noteId ? { id: a.noteId } : {});
      const key = a.kind === 'note' ? 'note' : 'view';
      return {
        ...made.ws,
        panels: made.ws.panels.map((p) => (p.id === a.id ? { ...p, tabs: p.tabs.map((x) => (x.id === a.tab ? { ...x, [key]: made.id } : x)) } : p)),
      };
    }
    case 'noteEdit': {
      const out = No.updateNote(ws, a.id, a.patch, { by: a.by });
      return a.patch.assignee === Ps.ME_ID ? Ps.ensureMe(out) : out;
    }
    case 'personAdd': {
      const r = Ps.addPerson(ws, a.name, a.kind, a.extra);
      if (!r) return ws;
      return a.assignTo ? Ps.assign(r.ws, a.assignTo, r.id, { by: a.by }) : r.ws;
    }
    case 'personEdit':
      return Ps.editPerson(ws, a.id, a.patch);
    case 'focusView':
      return FL.setFocusView(ws, a.view, a.on) ?? ws;
    case 'stageSet':
      return St.setStage(ws, a.desk, a.area).ws;
    case 'stageEdit':
      return St.editStage(ws, a.desk, a.patch);
    case 'stageRestore':
      return St.restoreStage(ws, a.desk, a.undo);
    case 'projectAdd':
      return Pj.addProject(ws, a.name, a.extra)?.ws ?? ws;
    case 'projectEdit':
      return Pj.editProject(ws, a.id, a.patch);
    case 'projectRemove':
      return Pj.removeProject(ws, a.id)?.ws ?? ws;
    case 'projectRestore':
      return Pj.undoRemoveProject(ws, a.undo);
    case 'noteProject':
      return Pj.setNoteProject(ws, a.id, a.project);
    case 'pspAdd':
      return Psp.addPspTask(ws, a.project, a.title, { id: a.note, after: a.after, under: a.under, by: a.by })?.ws ?? ws;
    case 'pspMove':
      return Psp.movePsp(ws, a.project, a.id, a.by);
    case 'pspShift': {
      const r = a.out ? Psp.outdentPsp(ws, a.project, a.id) : Psp.indentPsp(ws, a.project, a.id);
      return r.ok ? r.ws : ws;
    }
    case 'taskPlan':
      return Sc.setTaskPlan(ws, a.id, a.plan);
    case 'taskPreds': {
      const r = Gt.setPreds(ws, a.project, a.id, a.links);
      return r.ok ? r.ws : ws;
    }
    case 'fbAdd':
      return Fb.addFeedback(ws, a.v, { id: a.id, now: new Date(a.at) })?.ws ?? ws;
    case 'fbEdit':
      return Fb.editFeedback(ws, a.id, a.patch);
    case 'dcAdd':
      return Dc.addDecision(ws, { title: a.title, projectId: a.projectId }, { id: a.id, ids: a.ids, now: new Date(a.at), names: { criterion: (n) => a.names.criterion[n - 1] ?? `${n}`, option: (n) => a.names.option[n - 1] ?? `${n}` } })?.ws ?? ws;
    case 'dcExample': {
      const ids = [...a.ids];
      return Dc.addExample(ws, a.which, { id: a.id, newId: () => ids.shift() ?? `${a.id}-${ids.length}`, projectId: a.projectId, now: new Date(a.at) })?.ws ?? ws;
    }
    case 'dc':
      return Dc.editDecision(ws, a.id, a.o, new Date(a.at));
    case 'dcRemove':
      return Dc.removeDecision(ws, a.id)?.ws ?? ws;
    case 'dcRestore':
      return Dc.undoRemoveDecision(ws, a.undo);
    case 'fbState':
      return Fb.setFeedbackState(ws, a.id, a.state, { why: a.why, by: a.by });
    case 'fbMark':
      return Fb.addMark(ws, a.id, a.kind, a.text, { by: a.by });
    case 'fbList':
      return Fb.setFeedbackList(ws, a.list);
    case 'fbTo':
      return Fb.forwardFeedback(ws, a.id, a.to, { from: a.from, to: a.toName }, { by: a.by });
    case 'fbRemove':
      return Fb.removeFeedback(ws, a.id)?.ws ?? ws;
    case 'fbRestore':
      return Fb.undoRemoveFeedback(ws, a.undo);
    case 'fbAskEase':
      return Fb.setAskEase(ws, a.on);
    case 'sampleProject':
      return a.on ? Sp.addSampleProject(ws) : Sp.removeSampleProject(ws);
    case 'personRemove':
      return Ps.removePerson(ws, a.id)?.ws ?? ws;
    case 'personRestore':
      return Ps.undoRemovePerson(ws, a.undo);
    case 'noteAssign':
      return Ps.assign(ws, a.id, a.person, { by: a.by });
    case 'noteDelegate':
      return Ps.delegate(ws, a.id, a.person, { by: a.by });
    case 'noteLink':
      return NS.linkSource(ws, a.id, { url: a.url, title: a.title, ...(a.at ? { at: a.at } : {}) }, () => a.sid, { by: a.by }).ws;
    case 'noteUnlink':
      return NS.unlinkSource(ws, a.id, a.index, { by: a.by }).ws;
    case 'noteRelink':
      return NS.restoreLink(ws, a.id, a.index, a.link, { by: a.by });
    case 'noteSpot':
      return NS.setLinkSpot(ws, a.id, a.index, a.at, { by: a.by });
    case 'sourceRevive':
      return NS.reviveSource(ws, a.link);
    case 'noteForPage': {
      // V93 (Q4): „+ Neue Notiz zu dieser Seite“ – Notiz mit Verbindung; öffnet die App danach im Pad
      const made = No.createNote(ws, {}, { by: a.by, id: a.note });
      return NS.linkSource(made.ws, a.note, { url: a.url, title: a.title }, () => a.sid, { by: a.by }).ws;
    }
    case 'noteForward':
      return No.markForwarded(ws, a.id, a.to, { by: a.by });
    case 'noteState':
      // V86 (K2): Kanbans ziehen nach
      return Sh.syncBoards(No.setState(ws, a.id, a.state, { by: a.by }, a.reason), a.id);
    case 'sheetDone':
      return Sh.toggleDone(ws, a.note, a.here, { by: a.by });
    case 'sheetAdd':
      return Sh.addTask(ws, a.view, a.title, { by: a.by, id: a.note, col: a.col, index: a.index })?.ws ?? ws;
    case 'sheetShift':
      return Sh.shiftIn(ws, a.view, a.note, a.by);
    case 'sheetRemove':
      return No.removeFromView(ws, a.note, a.view, { by: a.by });
    case 'sheetRestore':
      return { ...ws, noteViews: No.viewsOf(ws).map((v) => (v.id === a.view.id ? a.view : v)) };
    case 'sheetMoveTo': {
      const r = Sh.moveToSheet(ws, a.note, a.from, a.to, { by: a.by });
      return r.ok ? r.ws : ws;
    }
    case 'cardMove': {
      const r = Sh.moveCard(ws, a.view, a.note, a.col, a.index, { by: a.by, from: a.from });
      return r.ok ? r.ws : ws;
    }
    case 'colAdd': {
      const r = No.addColumn(ws, a.view, a.name, { makeId: () => a.col });
      return r.ok ? r.ws : ws;
    }
    case 'colRename':
      return No.renameColumn(ws, a.view, a.col, a.name);
    case 'colMove':
      return No.moveColumn(ws, a.view, a.col, a.index);
    case 'colRemove': {
      const r = No.removeColumn(ws, a.view, a.col);
      return r.ok ? r.ws : ws;
    }
    case 'colState':
      return Sh.setColState(ws, a.view, a.col, a.state);
    case 'colWip':
      return Sh.setWip(ws, a.view, a.col, a.wip);
    case 'sheetReview':
      return No.updateView(ws, a.view, { review: a.on });
    case 'colSort':
      return Sh.sortCol(ws, a.view, a.col, a.by);
    case 'colMoveAll':
      return Sh.moveAllCards(ws, a.view, a.col, a.to, { by: a.by });
    case 'quadSet':
      return Sh.setQuad(ws, a.view, a.note, a.q, { by: a.by });
    case 'checkToTask':
      return Sh.checklistToTask(ws, a.note, a.index, a.view, { by: a.by, id: a.id })?.ws ?? ws;
    case 'taskRename':
      return Sh.renameTask(ws, a.note, a.title, { by: a.by });
    case 'reviewOk':
      return Sh.syncBoards(No.confirmReview(ws, a.note, { by: a.by }), a.note);
    case 'noteDraft': {
      const out = No.setDraft(ws, a.id, a.patch, { by: a.by });
      return a.patch.assignee === Ps.ME_ID ? Ps.ensureMe(out) : out;
    }
    case 'noteSave':
      return No.saveDraft(ws, a.id, { by: a.by });
    case 'noteDiscard': {
      // V93: Sources, die nur für diese neue Notiz angelegt wurden (auf aktiver Seite verknüpft), fallen mit weg
      const n = No.noteById(ws, a.id);
      const out = No.discardDraft(ws, a.id)?.ws ?? ws;
      return n?.unsaved && n.sources?.length ? NS.pruneNoteSources(out, n.sources.map((l) => l.id)) : out;
    }
    case 'noteUndoDiscard':
      return No.undoDiscard(ws, a.undo, { by: a.by });
    case 'noteDelete':
      return No.deleteNote(ws, a.id, { keepChildren: a.keepChildren })?.ws ?? ws;
    case 'noteRestore':
      return No.restoreNotes(ws, a.undo, { by: a.by });
    case 'padNew': {
      const v = No.createView(ws, 'block', No.defaultViewName(ws, 'block'), { id: a.sheet });
      return Pd.createPad(v.ws, a.desk, [a.sheet], { id: a.id, place: a.place }).ws;
    }
    case 'padPlace':
      return Pd.setPlace(ws, a.desk, a.id, a.place);
    case 'noteTree':
      return NT.setNoteTree(ws, a.desk, a.tree, a.key);
    case 'notesSwitch':
      return NL.switchNotesLayout(ws, a.desk, a.id);
    case 'notesAdd':
      return NL.addNotesLayout(ws, a.desk, a.from, { key: a.key, name: a.name, id: a.id });
    case 'notesCopy':
      return NL.copyNotesLayout(ws, a.desk, a.id);
    case 'notesRename':
      return NL.renameNotesLayout(ws, a.desk, a.id, a.name);
    case 'notesDelete':
      return NL.deleteNotesLayout(ws, a.desk, a.id).ws;
    case 'notesRestore':
      return NL.restoreNotesLayout(ws, a.deleted);
    case 'padRaise':
      return Pd.raisePad(ws, a.id);
    case 'padDock':
      return Pd.dockPad(ws, a.id, a.on);
    case 'padDockAll':
      return Pd.dockAll(ws, a.desk, a.on);
    case 'padNotes':
      return Pd.setNotesOnly(ws, a.ids, a.on);
    case 'dockSet':
      return Pd.setDock(ws, a.desk, { w: a.w, folded: a.folded });
    case 'dockOff':
      return Pd.setDockOff(ws, a.desk, a.off);
    case 'padShow':
      return Pd.showSheet(ws, a.id, a.sheet);
    case 'padRecent':
      return Pd.touchRecent(ws, a.id, { note: a.note, sheet: a.sheet });
    case 'padAddSheet': {
      const v = a.kind === 'kanban' && a.tpl ? BT.createBoard(ws, a.tpl, { id: a.sheet }) : No.createView(ws, a.kind, No.defaultViewName(ws, a.kind), { id: a.sheet });
      const r = Pd.addSheet(v.ws, a.id, a.sheet);
      return r.ok ? Pd.raisePad(r.ws, a.id) : ws;
    }
    case 'padMoveSheet':
      return Pd.moveSheet(ws, a.id, a.sheet, a.to);
    case 'padCloseSheet':
      return Pd.closeSheet(ws, a.id, a.sheet);
    case 'padClose':
      return Pd.closePad(ws, a.id);
    case 'padToDesk':
      return Pd.movePadToDesk(ws, a.id, a.desk, a.place);
    case 'padRestore':
      return Pd.restorePad(ws, a.undo);
    case 'padRestoreSheet':
      return Pd.restoreSheet(ws, a.undo);
    case 'padRenameSheet':
      return a.name.trim() ? No.updateView(ws, a.sheet, { name: a.name.trim() }) : ws;
    case 'padNote': {
      // F-213: neue Note im Pad ist Entwurf, bis sie gespeichert wird
      const made = No.createNote(ws, { unsaved: true }, { by: a.by, id: a.note });
      const r = No.placeNote(made.ws, a.note, { view: a.sheet });
      return r.ok ? Pd.raisePad(r.ws, a.id) : ws;
    }
    case 'padOpen':
      return padOpenResult(ws, { desk: a.desk, ref: a.ref, ids: a.ids }).ws;
    case 'padCreate':
      return padOpenResult(ws, { desk: a.desk, create: a.kind, ids: a.ids, by: a.by, tpl: a.tpl }).ws;
    case 'tplFromBoard': {
      const r = BT.templateFromBoard(ws, a.view, a.name, { id: a.id });
      return r.ok ? r.ws : ws;
    }
    case 'tplAdd': {
      const r = BT.addTemplate(ws, a.tpl, { id: a.id });
      return r.ok ? r.ws : ws;
    }
    case 'tplRename':
      return BT.renameTemplate(ws, a.id, a.name);
    case 'tplDelete':
      return BT.deleteTemplate(ws, a.id)?.ws ?? ws;
    case 'tplRestore':
      return BT.restoreTemplate(ws, a.undo);
    case 'selectTab':
      return W.selectTab(ws, a.id, a.tab);
    case 'moveTab':
      return W.moveTab(ws, a.id, a.tab, a.to);
    case 'swap':
      return W.swapPanels(ws, a.setup, a.a, a.b);
    case 'drop':
      return W.dropSlot(ws, a.setup, a.id, a.target, a.zone);
    case 'setLayout':
      return W.setLayout(ws, a.setup, a.tree);
    case 'setSize':
      return W.setPanelSize(ws, a.setup, a.id, a.w, a.h, a.min);
    case 'resetPanel':
      return W.resetPanel(ws, a.setup, a.id, a.min);
    case 'distribute':
      return W.distribute(ws, a.setup);
    case 'savePreferred':
      return W.savePreferred(ws, a.setup);
    case 'clearPreferred':
      return W.clearPreferred(ws, a.setup);
    case 'resetLayout':
      return W.resetLayout(ws, a.setup);
    case 'stackFront':
      return W.setStackFront(ws, a.setup, a.id);
    case 'stackStep':
      return W.stepStack(ws, a.setup, a.area, a.step);
    case 'renameArea':
      return W.renameArea(ws, a.setup, a.area, a.name);
    case 'ensureAreas':
      return W.ensureAreaNames(ws, a.setup);
    case 'setLines':
      return W.setLines(ws, a.cls, a.orientation, a.lines);
    case 'saveBookmark':
      return B.saveBookmark(ws, a.bookmark);
    case 'deleteBookmark':
      return B.deleteBookmark(ws, a.id);
    case 'moveBookmark':
      return B.moveBookmark(ws, a.id, a.to, a.category);
    case 'dropBookmark':
      return B.dropBookmark(ws, a.id, a.target);
    case 'toggleBookmarkPanel':
      return B.toggleBookmarkPanel(ws, a.id, a.panel);
    case 'sendNewSlot':
      return openInNewSlot(ws, a.setup, a.url);
    case 'openBookmark':
      return B.openBookmark(ws, a.panel, a.url).ws;
    case 'addCategory':
      return B.addCategory(ws, a.id, a.name);
    case 'renameCategory':
      return B.renameCategory(ws, a.id, a.name);
    case 'deleteCategory':
      return B.deleteCategory(ws, a.id);
    case 'moveCategory':
      return B.moveCategory(ws, a.id, a.to);
    case 'importBookmarks':
      return applyImport(ws, a.plan, W.newId, a.from);
    case 'sortInto':
      return sortInto(ws, a.ids, a.name, W.newId);
    case 'sortAll':
      return sortAll(ws, W.newId);
    case 'addSamples':
      return B.addSamples(ws, W.newId).ws;
    case 'rulerAll':
      return W.toggleRulerAll(ws);
    case 'rulerPanel':
      return W.toggleRulerPanel(ws, a.id);
    case 'devPanel':
      return W.toggleDevPanel(ws, a.id);
    case 'devView':
      return W.setDevView(ws, a.id, { device: a.device, turned: a.turned, scale: a.scale });
    case 'pause':
      return setPause(ws, a.minutes);
    case 'keepPanel':
      return toggleKeep(ws, a.id);
    case 'pauseShown':
      return setPauseShown(ws, a.minutes);
    case 'keepTab':
      return toggleKeepTab(ws, a.id, a.tab);
    case 'keepSources':
      return setSourcesKeep(ws, a.ids, a.keep);
    case 'bulkSources':
      return B.bulkSources(ws, a.ids, a.change).ws;
    case 'restoreSources':
      return B.restoreSources(ws, a.before, a.order);
    case 'zoomPanel':
      return setZoom(ws, a.id, a.zoom);
    case 'fitPanel':
      return setFit(ws, a.id, a.fit, a.zoom);
    case 'engine':
      return setEngine(ws, a.id);
    case 'rulerStyle':
      return W.setRulerStyle(ws, { labels: a.labels, color: a.color });
    case 'look':
      return setDeskLook(ws, a.win ?? '', { theme: a.theme, accent: a.accent });
    case 'followMainLook':
      return followMainLook(ws, a.win);
    case 'panelCategory':
      return setPanelCategory(ws, a.id, a.category, a.url);
    case 'panelNewCategory':
      return setPanelNewCategory(ws, a.id, a.name, () => a.catId, a.url);
    case 'tintCategory':
      return setCategoryTint(ws, a.id, a.change);
    case 'iconCategory':
      return setCategoryIcon(ws, a.id, a.icon);
    case 'restoreColors':
      return restoreColors(ws, a.snap);
    case 'restoreDesign':
      return restoreDesign(ws, a.snap);
    case 'ruleOn':
      return setRuleOn(ws, a.id, a.on);
    case 'siteCategory':
      return setSiteCategory(ws, a.domain, a.category);
    case 'ruleDelete':
      return deleteRule(ws, a.id).ws;
    case 'ruleSwitch':
      return RS.setSwitch(ws, a.id, a.value as RS.SwitchValue<typeof a.id>);
    case 'ruleWhen':
      return RS.setWhen(ws, a.id, a.on);
    case 'ruleSweep':
      return RS.sweep(ws, a.now).ws;
    case 'layoutSwitch':
      return DL.switchLayout(ws, a.win, a.id);
    case 'spaceAdd':
      return Cs.addSpace(ws, a.name, () => a.id, a.color).ws;
    case 'spaceEdit':
      return Cs.editSpace(ws, a.id, a);
    case 'spaceDelete':
      return Cs.deleteSpace(ws, a.id);
    case 'caseAdd':
      return Cs.addCase(ws, a.space, a.name, () => a.id, a.color).ws;
    case 'caseEdit':
      return Cs.editCase(ws, a.id, a);
    case 'caseDelete':
      return Cs.deleteCase(ws, a.id);
    case 'casesRestore':
      return Cs.restoreCases(ws, a.snap);
    case 'layoutCase':
      return Cs.setLayoutCase(ws, a.win, a.layout, a.caseId, a.on);
    case 'casePick':
      return Cs.pickCase(ws, a.win, a.caseId).ws;
    case 'layoutAdd':
      return DL.addLayout(ws, a.win, a.setup, a.from, a.name);
    case 'layoutCopy':
      return DL.copyLayout(ws, a.win, a.id);
    case 'layoutRename':
      return DL.renameLayout(ws, a.win, a.id, a.name);
    case 'layoutDelete':
      return DL.deleteLayout(ws, a.win, a.id).ws;
    case 'layoutRestore':
      return DL.restoreLayout(ws, a.deleted);
    case 'layoutReset':
      return DL.resetToStandard(ws, a.win, a.std).ws;
    case 'layoutSlotSwap':
      return DL.swapSlots(ws, a.win, a.id, a.setup, a.a, a.b);
    case 'layoutSlotClose':
      return DL.closeLayoutSlot(ws, a.win, a.id, a.setup, a.area) ?? ws;
    case 'layoutContent':
      return DL.setContent(ws, a.win, a.id, a.content);
    case 'layoutArrange':
      return DL.arrangeLayout(ws, a.win, a.id, a.setup, a.op);
    case 'layoutUnreset':
      return DL.undoReset(ws, a.win, a.old);
    case 'ruleRestore':
      return restoreRule(ws, a.undo);
    case 'tintPanel':
      return setPanelTint(ws, a.id, a.change);
    case 'tintSlot':
      return setSlotTint(ws, a.setup, a.area, a.change);
    case 'clearTints':
      return clearDeskTints(ws, a.win).ws;
    case 'restoreTints':
      return restoreTints(ws, a.snap);
    case 'replace':
    case 'remote':
      return a.ws;
    case 'toWindow':
      return Win.moveToWindow(ws, a.ids, a.win);
    case 'addDesk':
      // F-52: neuer Desk mit dem Standard-Layout dieses Geräts
      return a.std ? DL.addDeskWith(ws, a.win, a.std) : Win.addDesk(ws, a.win, W.newPanel(`Portal ${ws.nextNumber}`));
    case 'fetch':
      return Mv.fetchPanels(ws, a.ids, a.setup).ws;
    case 'returnAll': {
      // F-51: „Auflösen“ bestätigt – gespeicherte Layouts fallen mit weg, statt den Desk zu halten
      if (!a.dissolve || !ws.deskLayouts?.[a.win]) return Win.returnAll(ws, a.win);
      const { [a.win]: _gone, ...rest } = ws.deskLayouts;
      return Win.returnAll({ ...ws, deskLayouts: Object.keys(rest).length ? rest : undefined }, a.win);
    }
    case 'fitSlots':
      return W.fitSlots(ws, a.setup);
    case 'setArrangement':
      return W.setArrangement(ws, a.setup, a.arr);
    case 'renameWindow':
      return Win.renameWindow(ws, a.win, a.name);
    case 'move':
      return Mv.movePanels(ws, a.ids, a.from, a.win, a.area);
    case 'seen':
      return Mv.noteSetup(ws, a.setup);
  }
}

/**
 * Arbeitsfläche mit automatischem Speichern im Browser. F-27: Ändert ein anderes Fenster (oder
 * Tab) der Anwendung den gespeicherten Stand, meldet der Browser das per storage-Ereignis; der
 * neue Stand wird übernommen, ohne ihn zurückzuschreiben. Es gilt die letzte Änderung.
 */
export function useWorkspace() {
  const [ws, dispatch] = useReducer(reducer, undefined, loadWorkspace);
  const remote = useRef<Workspace | null>(null);
  useEffect(() => {
    if (ws === remote.current) return;
    saveWorkspace(ws);
  }, [ws]);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (PROBE || e.key !== WORKSPACE_KEY || !e.newValue) return;
      try {
        const next = parseWorkspace(JSON.parse(e.newValue));
        if (!next) return;
        remote.current = next;
        dispatch({ type: 'remote', ws: next });
      } catch {
        // unlesbarer Stand: eigenen behalten
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  return [ws, dispatch] as const;
}
