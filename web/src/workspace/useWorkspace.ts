import { useEffect, useReducer } from 'react';
import type { Lines, Orientation, ScreenClassId, ScreenSetup } from './screen';
import { loadWorkspace, saveWorkspace } from './storage';
import type { Min, Node, Zone } from './tree';
import type { Bookmark, Workspace } from './types';
import * as B from './bookmarks';
import * as W from './workspace';

type S = { setup: ScreenSetup };

export type Action =
  | ({ type: 'add'; area?: string } & S)
  | { type: 'remove'; id: string }
  | { type: 'rename'; id: string; name: string }
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
  | { type: 'addCategory'; id: string; name: string }
  | { type: 'renameCategory'; id: string; name: string }
  | { type: 'deleteCategory'; id: string }
  | { type: 'moveCategory'; id: string; to: number }
  /** F-15, F-125: Lineal. */
  | { type: 'rulerAll' }
  | { type: 'rulerPanel'; id: string }
  | { type: 'rulerStyle'; labels?: boolean; color?: number }
  /** F-121: ganze Arbeitsfläche durch eine importierte ersetzen. */
  | { type: 'replace'; ws: Workspace };

export function reducer(ws: Workspace, a: Action): Workspace {
  switch (a.type) {
    case 'add':
      return W.addPanel(ws, a.setup, a.area);
    case 'remove':
      return W.removePanel(ws, a.id);
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
    case 'closeTab':
      return W.closeTab(ws, a.id, a.tab);
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
    case 'rulerAll':
      return W.toggleRulerAll(ws);
    case 'rulerPanel':
      return W.toggleRulerPanel(ws, a.id);
    case 'rulerStyle':
      return W.setRulerStyle(ws, { labels: a.labels, color: a.color });
    case 'replace':
      return a.ws;
  }
}

/** Arbeitsfläche mit automatischem Speichern im Browser. */
export function useWorkspace() {
  const [ws, dispatch] = useReducer(reducer, undefined, loadWorkspace);
  useEffect(() => saveWorkspace(ws), [ws]);
  return [ws, dispatch] as const;
}
