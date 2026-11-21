import type { Placed, WinMeta, Workspace } from './types';
import { defaultWorkspace } from './workspace';

/** Stufe 1: Die Arbeitsfläche liegt nur im Browser (localStorage). Später kommt der Server dazu. */
const KEY = 'esource.workspace.v3';

const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

function isMeta(v: unknown): v is WinMeta {
  return isObj(v) && typeof v.id === 'string' && typeof v.name === 'string';
}

function isPlaced(v: unknown): v is Placed {
  return isObj(v) && typeof v.id === 'string' && ['x', 'y', 'w', 'h'].every((k) => isNum(v[k]));
}

function layoutMap(v: unknown): Record<string, Placed[]> {
  const out: Record<string, Placed[]> = {};
  if (!isObj(v)) return out;
  for (const [k, l] of Object.entries(v)) if (Array.isArray(l) && l.every(isPlaced)) out[k] = l;
  return out;
}

export function loadWorkspace(): Workspace {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultWorkspace();
    const data: unknown = JSON.parse(raw);
    if (!isObj(data) || !Array.isArray(data.windows) || !data.windows.every(isMeta)) return defaultWorkspace();
    const stackFront: Record<string, string> = {};
    if (isObj(data.stackFront)) for (const [k, v] of Object.entries(data.stackFront)) if (typeof v === 'string') stackFront[k] = v;
    const lines: Record<string, 1 | 2> = {};
    if (isObj(data.lines)) for (const [k, v] of Object.entries(data.lines)) if (v === 1 || v === 2) lines[k] = v;
    return {
      windows: data.windows,
      layouts: layoutMap(data.layouts),
      preferred: layoutMap(data.preferred),
      stackFront,
      lines,
      nextNumber: isNum(data.nextNumber) ? (data.nextNumber as number) : data.windows.length + 1,
    };
  } catch {
    return defaultWorkspace();
  }
}

export function saveWorkspace(ws: Workspace): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(ws));
  } catch {
    // Speicher voll oder gesperrt (z. B. privater Modus): Arbeitsfläche läuft weiter, nur ohne Speichern.
  }
}
