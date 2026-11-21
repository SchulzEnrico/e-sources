import { useEffect, useReducer } from 'react';
import type { Lines, Orientation, ScreenClassId, ScreenSetup } from './screen';
import { loadWorkspace, saveWorkspace } from './storage';
import type { Rect, Workspace } from './types';
import * as W from './workspace';

type S = { setup: ScreenSetup };

export type Action =
  | ({ type: 'add' } & S)
  | { type: 'remove'; id: string }
  | { type: 'rename'; id: string; name: string }
  | ({ type: 'swap'; a: string; b: string } & S)
  | ({ type: 'move'; id: string; rect: Rect } & S)
  | ({ type: 'resize'; id: string; rect: Rect } & S)
  | ({ type: 'setSize'; id: string; w: number; h: number } & S)
  | ({ type: 'resetWindow'; id: string } & S)
  | ({ type: 'distribute' } & S)
  | ({ type: 'savePreferred' } & S)
  | ({ type: 'clearPreferred' } & S)
  | ({ type: 'resetLayout' } & S)
  | ({ type: 'stackFront'; id: string } & S)
  | ({ type: 'stackStep'; step: number } & S)
  | { type: 'setLines'; cls: ScreenClassId; orientation: Orientation; lines: Lines };

export function reducer(ws: Workspace, a: Action): Workspace {
  switch (a.type) {
    case 'add':
      return W.addWindow(ws, a.setup);
    case 'remove':
      return W.removeWindow(ws, a.id);
    case 'rename':
      return W.renameWindow(ws, a.id, a.name);
    case 'swap':
      return W.swapWindows(ws, a.setup, a.a, a.b);
    case 'move':
      return W.moveWindow(ws, a.setup, a.id, a.rect);
    case 'resize':
      return W.resizeWindow(ws, a.setup, a.id, a.rect);
    case 'setSize':
      return W.setWindowSize(ws, a.setup, a.id, a.w, a.h);
    case 'resetWindow':
      return W.resetWindow(ws, a.setup, a.id);
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
  }
}

/** Arbeitsfläche mit automatischem Speichern im Browser. */
export function useWorkspace() {
  const [ws, dispatch] = useReducer(reducer, undefined, loadWorkspace);
  useEffect(() => saveWorkspace(ws), [ws]);
  return [ws, dispatch] as const;
}
