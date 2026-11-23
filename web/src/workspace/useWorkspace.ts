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
import * as No from './notes';
import type { NoteState, NoteViewKind } from './types';
import { type RuleUndo, deleteRule, restoreRule, setRuleOn, setSiteCategory } from './rules';

type S = { setup: ScreenSetup };

export type Action =
  | ({ type: 'add'; area?: string; id?: string } & S)
  /** F-134: neue Area als Spalte rechts oder Zeile unten. */
  | ({ type: 'addArea'; side: 'right' | 'bottom' } & S)
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
  | { type: 'noteState'; id: string; state: NoteState; reason?: string; by?: string }
  | { type: 'noteDelete'; id: string; keepChildren?: boolean }
  | { type: 'noteRestore'; undo: No.NoteUndo; by?: string };

export function reducer(ws: Workspace, a: Action): Workspace {
  const next = step(ws, a);
  // F-27: Fensterliste passend zu den Panels halten (leere Fenster fallen weg).
  // F-51: leerer Zusatz-Desk mit gespeicherten Layouts wechselt, statt wegzufallen.
  return a.type === 'remote' || next === ws ? next : Win.syncWindows(DL.rescueEmptyDesks(next));
}

function step(ws: Workspace, a: Action): Workspace {
  switch (a.type) {
    case 'add':
      return W.addPanel(ws, a.setup, a.area, a.id);
    case 'addArea':
      return W.addArea(ws, a.setup, a.side);
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
    case 'setUrl':
      return W.navigatePanel(ws, a.id, a.url);
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
      const n = t?.note ? No.noteById(ws, t.note) : undefined;
      if (n && No.isEmptyNote(ws, n) && No.viewsWith(ws, n.id).length === 0) {
        const cleared = No.deleteNote(ws, n.id)!.ws;
        return W.closeTab(cleared, a.id, a.tab);
      }
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
    case 'noteEdit':
      return No.updateNote(ws, a.id, a.patch, { by: a.by });
    case 'noteState':
      return No.setState(ws, a.id, a.state, { by: a.by }, a.reason);
    case 'noteDelete':
      return No.deleteNote(ws, a.id, { keepChildren: a.keepChildren })?.ws ?? ws;
    case 'noteRestore':
      return No.restoreNotes(ws, a.undo, { by: a.by });
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
