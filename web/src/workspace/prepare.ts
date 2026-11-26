/**
 * V108 (F-222 E2/E4, Doc „F-222 V108 – Freie Entscheidungen und „Entscheidung vorbereiten …““): eine
 * Nutzwertanalyse aus einer Notiz, einem Änderungsantrag oder einer Projektmeldung vorbereiten. Übernommen werden
 * Titel, Frage, Projekt und ein Bezug zurück (`Decision.links`); beim Änderungsantrag zusätzlich die Kriterien
 * Termin · Kosten · Leistung · Umfang und die Lösungen „Änderung umsetzen“ · „Nicht umsetzen“ (E5).
 * Eigenes Modul, damit decisions.ts frei von notes/feedback bleibt. Reine Funktionen, Tests „F-222 V108“.
 */
import type { Decision, DecisionLink, Feedback, Workspace } from './types';
import { addDecision, decisionsOf, ranking, removeDecision, winner } from './decisions';
import { noteById, titleOf } from './notes';
import { feedbackById, restoreFeedbackItem, setBecame } from './feedback';
import { steerCode } from './risks';

export type PrepareFrom = { kind: 'note' | 'feedback'; id: string };
export interface PrepareTexts {
  criterion: (n: number) => string;
  option: (n: number) => string;
  /** E5: Kriterien beim Änderungsantrag (4) */
  changeCriteria: readonly string[];
  /** E5: Lösungen beim Änderungsantrag (2) */
  changeOptions: readonly string[];
}

/** Erster Absatz nach der Überschrift (ohne Markdown-Zeichen) – die Frage einer vorbereiteten Entscheidung. */
export function firstParagraph(text: string, title: string): string {
  const paras = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/^\s*#{1,6}\s+/gm, '').replace(/[*_`~]/g, '').trim())
    .filter(Boolean);
  const rest = paras[0] && paras[0].split('\n')[0].trim() === title.trim() ? [paras[0].split('\n').slice(1).join('\n').trim(), ...paras.slice(1)] : paras;
  return rest.find(Boolean) ?? '';
}

/** Entscheidungen mit Bezug auf diese Notiz oder Meldung (für „Entscheidung vorbereitet: …“ auf der anderen Seite). */
export const decisionsFrom = (ws: Workspace, from: PrepareFrom): Decision[] => decisionsOf(ws).filter((d) => d.links?.some((l) => l.kind === from.kind && l.id === from.id));

/**
 * E2: Entscheidung vorbereiten. `ids` liefert genug neue Ids (mind. 6). Notiz ohne Projekt → freie Entscheidung.
 * `null`, wenn die Quelle fehlt.
 */
export function prepareDecision(ws: Workspace, from: PrepareFrom, t: PrepareTexts, opts: { id: string; ids: string[]; now?: Date }): { ws: Workspace; id: string } | null {
  let title = '';
  let question = '';
  let projectId: string | undefined;
  let change = false;
  if (from.kind === 'note') {
    const n = noteById(ws, from.id);
    if (!n) return null;
    const name = titleOf(n);
    change = n.type === 'change' && !!n.change;
    title = change ? `${steerCode(ws, n)}: ${name}` : name;
    question = change ? (n.change?.why ?? '') : firstParagraph(n.text, name);
    projectId = n.project;
  } else {
    const f = feedbackById(ws, from.id);
    if (!f) return null;
    title = f.title;
    question = f.what ?? '';
    projectId = f.project;
  }
  const r = addDecision(ws, { title: title || t.criterion(1), ...(projectId ? { projectId } : {}), ...(question ? { question } : {}) }, { id: opts.id, ids: opts.ids, now: opts.now, names: { criterion: t.criterion, option: t.option } });
  if (!r) return null;
  const link: DecisionLink = { kind: from.kind, id: from.id };
  const list = decisionsOf(r.ws).map((d) => {
    if (d.id !== r.id) return d;
    const out: Decision = { ...d, links: [link] };
    if (change && opts.ids.length >= t.changeCriteria.length + t.changeOptions.length) {
      out.criteria = t.changeCriteria.map((name, i) => ({ id: opts.ids[i], name }));
      out.options = t.changeOptions.map((name, i) => ({ id: opts.ids[t.changeCriteria.length + i], name }));
    }
    return out;
  });
  return { ws: { ...r.ws, decisions: list }, id: r.id };
}

export type DecisionBecomeUndo = { feedback: Feedback; decision: string };

/** E2: Projektmeldung „Wird zu …“ › Entscheidung – mit Vermerk an der Meldung; `null`, wenn sie schon zu etwas wurde. */
export function becomeDecision(
  ws: Workspace,
  fbId: string,
  t: PrepareTexts,
  act: { id: string; ids: string[]; label: string; now?: number; by?: string },
): { ws: Workspace; id: string; undo: DecisionBecomeUndo } | null {
  const f = feedbackById(ws, fbId);
  if (!f || !f.project) return null;
  if (f.became && (f.became.type === 'decision' ? decisionsOf(ws).some((d) => d.id === f.became!.note) : noteById(ws, f.became.note))) return null;
  const now = act.now ? new Date(act.now) : undefined;
  const r = prepareDecision(ws, { kind: 'feedback', id: fbId }, t, { id: act.id, ids: act.ids, now });
  if (!r) return null;
  const title = decisionsOf(r.ws).find((d) => d.id === r.id)!.title;
  const ws2 = setBecame(r.ws, fbId, { note: r.id, type: 'decision' }, `${act.label} „${title}“`, { now, by: act.by });
  return { ws: ws2, id: r.id, undo: { feedback: f, decision: r.id } };
}

/** Rückgängig – Entscheidung ganz entfernen (sie war neu), Meldung wie vorher. */
export function undoBecomeDecision(ws: Workspace, u: DecisionBecomeUndo): Workspace {
  const r = removeDecision(ws, u.decision);
  return restoreFeedbackItem(r ? r.ws : ws, u.feedback);
}

/**
 * E4: Vorschlag der Nutzwertanalyse für einen Änderungsantrag – nur, wenn eine vorbereitete Entscheidung
 * bewertet ist: gewählte Lösung (falls entschieden), sonst die mit dem höchsten Nutzwert. Entschieden wird am Antrag.
 */
export function suggestionFor(ws: Workspace, noteId: string): { decision: Decision; option: string; decided: boolean } | null {
  const d = decisionsFrom(ws, { kind: 'note', id: noteId }).find((x) => x.state !== 'draft');
  if (!d) return null;
  if (d.chosen) {
    const o = d.options.find((x) => x.id === d.chosen);
    return o ? { decision: d, option: o.name, decided: true } : null;
  }
  const w = winner(d);
  return w && ranking(d).length ? { decision: d, option: w.name, decided: false } : null;
}
