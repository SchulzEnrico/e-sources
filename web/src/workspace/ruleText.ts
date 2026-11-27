/**
 * V129 (F-231 K10a): Regel als deutscher Satz (B1) – „Wenn eine Karte in die Spalte „Erledigt“ kommt und sie den Tag
 * „fertig“ nicht hat, dann den Tag „fertig“ setzen und mich zuständig machen.“ Für Liste, Vorschau im Editor und
 * Bildschirmleser. Rein.
 */
import * as No from './notes';
import * as Ps from './persons';
import { type KitButton, type KitRule, type Part, type TrigKind, isSchedule } from './ruleKit';
import { BTN_TEXT, KIT_TEXT as T } from './terms';
import type { Workspace } from './types';

const personName = (ws: Workspace, id?: string) => (!id ? '' : id === 'me' ? T.me : (Ps.personById(ws, id)?.name ?? id));
const boardName = (ws: Workspace, id?: string) => (id ? (No.viewById(ws, id)?.name ?? '?') : '');

export const trigText = (ws: Workspace, p: Part<string>) =>
  isSchedule(p.k as TrigKind) ? T.schedSay(p.k, p.n, p.b) : p.k === 'dueNear' ? T.dueSay(p.a, p.n, p.b) : T.trigSay(p.k, p.a?.trim() || undefined, personName(ws, p.a));
const tplName = (ws: Workspace, id?: string) => (id ? (No.noteById(ws, id) ? No.titleOf(No.noteById(ws, id)!) : '?') : '…');
export const condText = (ws: Workspace, p: Part<string>) => T.condSay(p.k, p.a?.trim() || undefined, p.b, p.n, !!p.not, personName(ws, p.a), boardName(ws, p.a));
export const actText = (ws: Workspace, p: Part<string>) => T.actSay(p.k, p.a?.trim() || undefined, p.b, p.n, personName(ws, p.a), p.k === 'fromTpl' ? tplName(ws, p.a) : boardName(ws, p.a));
/** V131 (K10c): nach „Karte aus Vorlage“ gilt die nächste Aktion der neuen Karte – im Satz „bei der neuen Karte …“. */
const actsText = (ws: Workspace, acts: readonly Part<string>[]) => acts.map((x, i) => `${i && acts[i - 1].k === 'fromTpl' && x.k !== 'fromTpl' ? `${T.newCard} ` : ''}${actText(ws, x)}`);

/** Aufzählung „a, b und c“. */
const list = (xs: string[]) => (xs.length < 2 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} und ${xs[xs.length - 1]}`);

export function sentenceOf(ws: Workspace, r: Pick<KitRule, 'when' | 'ifs' | 'then'>): string {
  const ifs = r.ifs.map((c) => condText(ws, c));
  const then = actsText(ws, r.then);
  // V131 (K10c): Zeitplan als Satzanfang – „Jeden Montag um 09:00 Uhr: …“
  if (isSchedule(r.when.k)) return `${trigText(ws, r.when)}: ${ifs.length ? `${T.forEach(list(ifs))} ` : ''}${then.length ? `${list(then)}.` : '…'}`;
  return `Wenn ${trigText(ws, r.when)}${ifs.length ? ` und ${list(ifs)}` : ''}, dann ${then.length ? `${list(then)}.` : '…'}`;
}

/** „gilt für alle Kanbans“ bzw. „nur „Board A““. */
export const scopeText = (ws: Workspace, r: Pick<KitRule, 'board'>) => (r.board ? T.scope(boardName(ws, r.board)) : T.scopeAll);

/** V130 (K10b): Knopf als Satz – „Auf Klick für diese Karte: in die Spalte „Prüfen“ verschieben und …“. */
export function buttonSentence(ws: Workspace, b: Pick<KitButton, 'kind' | 'col' | 'then'>): string {
  const then = actsText(ws, b.then);
  return BTN_TEXT.sentence(b.kind, b.col?.trim() || undefined, then.length ? `${list(then)}.` : '…');
}

/** „auf allen Kanbans“ bzw. „nur „Board A““ – wie bei den Regeln. */
export const buttonScope = (ws: Workspace, b: Pick<KitButton, 'board'>) => (b.board ? T.scope(boardName(ws, b.board)) : T.scopeAll);
