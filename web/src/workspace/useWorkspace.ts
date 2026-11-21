import { useEffect, useReducer } from 'react';
import type { Lines, Orientation, ScreenClassId, ScreenSetup } from './screen';
import { loadWorkspace, saveWorkspace } from './storage';
import type { Min, Node, Zone } from './tree';
import type { Workspace } from './types';
import * as W from './workspace';

type S = { setup: ScreenSetup };

export type Action =
  | ({ type: 'add' } & S)
  | { type: 'remove'; id: string }
  | { type: 'rename'; id: string; name: string }
  | { type: 'setUrl'; id: string; url: string }
  | { type: 'history'; id: string; step: number }
  | { type: 'home'; id: string }
  | { type: 'setHome'; id: string }
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
  | ({ type: 'stackStep'; step: number } & S)
  | { type: 'setLines'; cls: ScreenClassId; orientation: Orientation; lines: Lines }
  /** F-121: ganze Arbeitsfläche durch eine importierte ersetzen. */
  | { type: 'replace'; ws: Workspace };

export function reducer(ws: Workspace, a: Action): Workspace {
  switch (a.type) {
    case 'add':
      return W.addPanel(ws, a.setup);
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
      return W.stepStack(ws, a.setup, a.step);
    case 'setLines':
      return W.setLines(ws, a.cls, a.orientation, a.lines);
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
