import { isNode, type Node } from './tree';
import type { PanelMeta, Workspace } from './types';
import { defaultWorkspace } from './workspace';

/**
 * Stufe 1: Die Arbeitsfläche liegt nur im Browser (localStorage). Später kommt der Server dazu.
 * v4: Anordnung als Teilungsbaum (Kachel-Modell). Ältere Stände werden nicht übernommen.
 */
const KEY = 'esource.workspace.v4';

const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

function isMeta(v: unknown): v is PanelMeta {
  const optStr = (x: unknown) => x === undefined || typeof x === 'string';
  return (
    isObj(v) &&
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    optStr(v.url) &&
    optStr(v.home) &&
    (v.pos === undefined || isNum(v.pos)) &&
    (v.history === undefined || (Array.isArray(v.history) && v.history.every((h) => typeof h === 'string')))
  );
}

function treeMap(v: unknown): Record<string, Node> {
  const out: Record<string, Node> = {};
  if (!isObj(v)) return out;
  for (const [k, t] of Object.entries(v)) if (isNode(t)) out[k] = t;
  return out;
}

export function loadWorkspace(): Workspace {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultWorkspace();
    const data: unknown = JSON.parse(raw);
    if (!isObj(data) || !Array.isArray(data.panels) || !data.panels.every(isMeta)) return defaultWorkspace();
    const stackFront: Record<string, string> = {};
    if (isObj(data.stackFront)) for (const [k, v] of Object.entries(data.stackFront)) if (typeof v === 'string') stackFront[k] = v;
    const lines: Record<string, 1 | 2> = {};
    if (isObj(data.lines)) for (const [k, v] of Object.entries(data.lines)) if (v === 1 || v === 2) lines[k] = v;
    return {
      panels: data.panels,
      layouts: treeMap(data.layouts),
      preferred: treeMap(data.preferred),
      stackFront,
      lines,
      nextNumber: isNum(data.nextNumber) ? (data.nextNumber as number) : data.panels.length + 1,
    };
  } catch {
    return defaultWorkspace();
  }
}

/**
 * Eine in einem Panel eingebettete E-Source (F-18) liest dieselbe Arbeitsfläche, speichert aber
 * nicht: Sonst überschreiben sich äußere und innere E-Source gegenseitig.
 */
const EMBEDDED = typeof window !== 'undefined' && window.self !== window.top;

export function saveWorkspace(ws: Workspace): void {
  if (EMBEDDED) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(ws));
  } catch {
    // Speicher voll oder gesperrt (z. B. privater Modus): Arbeitsfläche läuft weiter, nur ohne Speichern.
  }
}
