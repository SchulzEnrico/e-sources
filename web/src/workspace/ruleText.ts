/**
 * V129 (F-231 K10a): Regel als deutscher Satz (B1) – „Wenn eine Karte in die Spalte „Erledigt“ kommt und sie den Tag
 * „fertig“ nicht hat, dann den Tag „fertig“ setzen und mich zuständig machen.“ Für Liste, Vorschau im Editor und
 * Bildschirmleser. Rein.
 */
import * as No from './notes';
import * as Ps from './persons';
import { type KitRule, type Part } from './ruleKit';
import { KIT_TEXT as T } from './terms';
import type { Workspace } from './types';

const personName = (ws: Workspace, id?: string) => (!id ? '' : id === 'me' ? T.me : (Ps.personById(ws, id)?.name ?? id));
const boardName = (ws: Workspace, id?: string) => (id ? (No.viewById(ws, id)?.name ?? '?') : '');

export const trigText = (ws: Workspace, p: Part<string>) => T.trigSay(p.k, p.a?.trim() || undefined, personName(ws, p.a));
export const condText = (ws: Workspace, p: Part<string>) => T.condSay(p.k, p.a?.trim() || undefined, p.b, p.n, !!p.not, personName(ws, p.a), boardName(ws, p.a));
export const actText = (ws: Workspace, p: Part<string>) => T.actSay(p.k, p.a?.trim() || undefined, p.b, p.n, personName(ws, p.a), boardName(ws, p.a));

/** Aufzählung „a, b und c“. */
const list = (xs: string[]) => (xs.length < 2 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} und ${xs[xs.length - 1]}`);

export function sentenceOf(ws: Workspace, r: Pick<KitRule, 'when' | 'ifs' | 'then'>): string {
  const ifs = r.ifs.map((c) => condText(ws, c));
  const then = r.then.map((x) => actText(ws, x));
  return `Wenn ${trigText(ws, r.when)}${ifs.length ? ` und ${list(ifs)}` : ''}, dann ${then.length ? `${list(then)}.` : '…'}`;
}

/** „gilt für alle Kanbans“ bzw. „nur „Board A““. */
export const scopeText = (ws: Workspace, r: Pick<KitRule, 'board'>) => (r.board ? T.scope(boardName(ws, r.board)) : T.scopeAll);
