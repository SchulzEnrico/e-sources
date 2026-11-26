/**
 * F-222 (V103, Entscheidungs-Doc V102 N1–N12): Nutzwertanalyse als Werkzeug – eigenes Objekt
 * `Workspace.decisions` (N1), frei oder am Projekt. In V103 nur Datenmodell (Dateiformat 11, N11),
 * Lesen und die Rechenkerne: Gewichte aus dem Paarvergleich 2 · 1 · 0 (N2), Nutzwert = Σ Gewicht ×
 * Bewertung (Vorlage Enrico), Muss-Kriterien als Vorfilter (N4), Rangliste (N6). Die Oberfläche folgt
 * nach F-221 (Doc-Bauplan 1–5). Reine Funktionen, Tests in workspace.test.ts („F-222 Entscheidungen“).
 */
import type {
  Decision,
  DecisionCriterion,
  DecisionLink,
  DecisionMark,
  DecisionOption,
  DecisionPairs,
  DecisionScore,
  DecisionState,
  Workspace,
} from './types';

export const DECISIONS_MAX = 500;
/** N3: keine Obergrenze im Sinne der Methode – technische Schranke gegen beschädigte Dateien. */
export const ITEMS_MAX = 100;
/** N3: ab hier Hinweis „viele Kriterien – zusammenfassen?“ */
export const MANY = 10;
export const NAME_MAX = 200;
export const TEXT_MAX = 4000;
export const MARKS_MAX = 200;
export const DECISION_STATES: readonly DecisionState[] = ['draft', 'rated', 'decided'];
const LINK_KINDS: readonly DecisionLink['kind'][] = ['note', 'bookmark', 'person', 'feedback'];

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isIso = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v));
const str = (v: unknown, max: number): string | undefined => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);
const round1 = (n: number) => Math.round(n * 10) / 10;

export const decisionsOf = (ws: Workspace): Decision[] => ws.decisions ?? [];

/** Schlüssel des Paarvergleichs: Reihenfolge wie in der Kriterienliste. */
export const pairKey = (a: string, b: string) => `${a}|${b}`;

/**
 * N2: Gewichte aus dem Paarvergleich. Jedes Paar bringt 2 Punkte: 2 · 0 (a wichtiger), 1 · 1 (gleich),
 * 0 · 2 (b wichtiger). Gewicht = Punkte / Summe × 100, auf eine Nachkommastelle, Rest auf das größte.
 * Fehlende Paare zählen als „gleich“. `null` bei weniger als zwei Kriterien.
 */
export function pairWeights(criteria: readonly DecisionCriterion[], pairs: DecisionPairs = {}): Record<string, number> | null {
  if (criteria.length < 2) return null;
  const pts: Record<string, number> = Object.fromEntries(criteria.map((c) => [c.id, 0]));
  for (let i = 0; i < criteria.length; i++)
    for (let j = i + 1; j < criteria.length; j++) {
      const a = criteria[i].id;
      const b = criteria[j].id;
      const v = pairs[pairKey(a, b)] ?? 1;
      pts[a] += v;
      pts[b] += 2 - v;
    }
  const sum = Object.values(pts).reduce((s, x) => s + x, 0);
  return spread(criteria.map((c) => c.id), (id) => pts[id] / sum);
}

/** Verteilt Anteile auf 100 % mit einer Nachkommastelle; der Rundungsrest geht an den größten Anteil. */
function spread(ids: string[], share: (id: string) => number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of ids) out[id] = round1(share(id) * 100);
  const rest = round1(100 - Object.values(out).reduce((s, x) => s + x, 0));
  if (rest && ids.length) {
    const top = ids.reduce((m, id) => (out[id] > out[m] ? id : m), ids[0]);
    out[top] = round1(out[top] + rest);
  }
  return out;
}

/** N2 „auf 100 % verteilen“: vorhandene Gewichte anteilig strecken, ungewichtete gleich verteilt. */
export function normalizeWeights(criteria: readonly DecisionCriterion[]): Record<string, number> {
  const ids = criteria.map((c) => c.id);
  const sum = criteria.reduce((s, c) => s + (c.weight && c.weight > 0 ? c.weight : 0), 0);
  if (!sum) return spread(ids, () => 1 / ids.length);
  return spread(ids, (id) => (criteria.find((c) => c.id === id)!.weight ?? 0) / sum);
}

/** Summe der Gewichte (Hinweis, wenn ≠ 100). */
export const weightSum = (d: Decision): number => round1(d.criteria.reduce((s, c) => s + (c.weight ?? 0), 0));

export const scoreOf = (d: Decision, c: string, o: string): DecisionScore | undefined => d.scores?.find((s) => s.c === c && s.o === o);

/** Ergebnis je Lösung (N6). */
export interface DecisionResult {
  option: DecisionOption;
  /** Nutzwert 0–1000 (Gewicht % × Bewertung 0–10) */
  total: number;
  /** Punkte je Kriterium – für gestapelte Balken */
  parts: { c: string; points: number }[];
  /** N4: scheidet aus (Muss-Kriterium nicht erfüllt) */
  out: boolean;
  /** Zellen ohne Bewertung */
  missing: number;
  /** Rang 1… (Gleichstand = gleicher Rang); ausgeschiedene am Ende ohne Rang */
  rank?: number;
}

/** N6: Rangliste – nach Nutzwert, ausgeschiedene zuletzt; Muss-Kriterien zählen nicht in den Nutzwert. */
export function ranking(d: Decision): DecisionResult[] {
  const weighed = d.criteria.filter((c) => !c.must);
  const rows: DecisionResult[] = d.options.map((option) => {
    const parts = weighed.map((c) => ({ c: c.id, points: round1(((c.weight ?? 0) * (scoreOf(d, c.id, option.id)?.v ?? 0))) }));
    const missing = weighed.filter((c) => !scoreOf(d, c.id, option.id)).length;
    const out = !!option.fails?.some((id) => d.criteria.some((c) => c.id === id && c.must));
    return { option, total: round1(parts.reduce((s, p) => s + p.points, 0)), parts, out, missing };
  });
  const sorted = [...rows].sort((a, b) => Number(a.out) - Number(b.out) || b.total - a.total);
  let rank = 0;
  let last: number | null = null;
  sorted.forEach((r, i) => {
    if (r.out) return;
    if (last === null || r.total !== last) rank = i + 1;
    r.rank = rank;
    last = r.total;
  });
  return sorted;
}

/** N7: Sieger (Rang 1 allein); null bei Gleichstand oder ohne Lösungen. */
export function winner(d: Decision): DecisionOption | null {
  const top = ranking(d).filter((r) => r.rank === 1);
  return top.length === 1 ? top[0].option : null;
}

/** N7: Begründung nötig, wenn die gewählte Lösung nicht der Sieger ist. */
export const needsWhy = (d: Decision, chosen: string): boolean => winner(d)?.id !== chosen;

// ---------- Lesen (Dateiformat 11) ----------

function parseLinks(v: unknown): DecisionLink[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const seen = new Set<string>();
  const out: DecisionLink[] = [];
  for (const l of v) {
    if (!isObj(l) || !LINK_KINDS.includes(l.kind as DecisionLink['kind']) || typeof l.id !== 'string' || !l.id) continue;
    const k = `${l.kind}:${l.id}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ kind: l.kind as DecisionLink['kind'], id: l.id });
  }
  return out.length ? out : undefined;
}

function parseItems<T extends { id: string; name: string }>(v: unknown, extra: (r: Record<string, unknown>, base: { id: string; name: string }) => T): T[] {
  if (!Array.isArray(v)) return [];
  const out: T[] = [];
  for (const r of v) {
    if (out.length >= ITEMS_MAX) break;
    if (!isObj(r) || typeof r.id !== 'string' || !r.id || out.some((x) => x.id === r.id)) continue;
    const name = str(r.name, NAME_MAX);
    if (!name) continue;
    out.push(extra(r, { id: r.id, name }));
  }
  return out;
}

/** Liest `Workspace.decisions` – Unbrauchbares fällt weg, Bezüge innerhalb der Entscheidung nur auf Vorhandenes. */
export function parseDecisions(v: unknown, projectIds?: ReadonlySet<string>): Decision[] {
  if (!Array.isArray(v)) return [];
  const out: Decision[] = [];
  for (const r of v) {
    if (out.length >= DECISIONS_MAX) break;
    if (!isObj(r) || typeof r.id !== 'string' || !r.id || out.some((d) => d.id === r.id)) continue;
    const title = str(r.title, NAME_MAX);
    if (!title || !isIso(r.at)) continue;
    const criteria = parseItems<DecisionCriterion>(r.criteria, (c, base) => {
      const x: DecisionCriterion = { ...base };
      if (typeof c.weight === 'number' && Number.isFinite(c.weight) && c.weight >= 0 && c.weight <= 100) x.weight = round1(c.weight);
      if (c.must === true) x.must = true;
      const hint = str(c.hint, TEXT_MAX);
      if (hint) x.hint = hint;
      return x;
    });
    const cIds = new Set(criteria.map((c) => c.id));
    const options = parseItems<DecisionOption>(r.options, (o, base) => {
      const x: DecisionOption = { ...base };
      const note = str(o.note, TEXT_MAX);
      if (note) x.note = note;
      const links = parseLinks(o.links);
      if (links) x.links = links;
      if (Array.isArray(o.fails)) {
        const fails = [...new Set(o.fails.filter((id): id is string => typeof id === 'string' && cIds.has(id)))];
        if (fails.length) x.fails = fails;
      }
      return x;
    });
    const oIds = new Set(options.map((o) => o.id));
    const d: Decision = {
      id: r.id,
      title,
      state: DECISION_STATES.includes(r.state as DecisionState) ? (r.state as DecisionState) : 'draft',
      at: r.at,
      criteria,
      options,
    };
    if (isIso(r.changed)) d.changed = r.changed;
    const q = str(r.question, TEXT_MAX);
    if (q) d.question = q;
    if (typeof r.projectId === 'string' && r.projectId && (!projectIds || projectIds.has(r.projectId))) d.projectId = r.projectId;
    if (Array.isArray(r.scores)) {
      const seen = new Set<string>();
      const scores: DecisionScore[] = [];
      for (const s of r.scores) {
        if (!isObj(s) || typeof s.c !== 'string' || typeof s.o !== 'string' || !cIds.has(s.c) || !oIds.has(s.o)) continue;
        if (typeof s.v !== 'number' || !Number.isFinite(s.v) || s.v < 0 || s.v > 10) continue;
        const by = str(s.by, 120);
        const k = `${s.c}|${s.o}|${by ?? ''}`;
        if (seen.has(k)) continue;
        seen.add(k);
        const why = str(s.why, TEXT_MAX);
        scores.push({ c: s.c, o: s.o, v: Math.round(s.v), ...(why ? { why } : {}), ...(by ? { by } : {}) });
      }
      if (scores.length) d.scores = scores;
    }
    if (isObj(r.pairs)) {
      const order = criteria.map((c) => c.id);
      const pairs: DecisionPairs = {};
      for (const [k, val] of Object.entries(r.pairs)) {
        const [a, b, more] = k.split('|');
        if (more !== undefined || !cIds.has(a) || !cIds.has(b) || order.indexOf(a) >= order.indexOf(b)) continue;
        if (val === 0 || val === 1 || val === 2) pairs[k] = val;
      }
      if (Object.keys(pairs).length) d.pairs = pairs;
    }
    const links = parseLinks(r.links);
    if (links) d.links = links;
    if (typeof r.chosen === 'string' && oIds.has(r.chosen)) d.chosen = r.chosen;
    const why = str(r.why, TEXT_MAX);
    if (why) d.why = why;
    if (r.locked === true) d.locked = true;
    if (Array.isArray(r.marks)) {
      const marks: DecisionMark[] = r.marks
        .filter((m): m is Record<string, unknown> => isObj(m) && isIso(m.at) && !!str(m.text, TEXT_MAX))
        .map((m) => ({ at: m.at as string, text: str(m.text, TEXT_MAX)!, ...(str(m.by, 120) ? { by: str(m.by, 120) } : {}) }))
        .slice(-MARKS_MAX);
      if (marks.length) d.marks = marks;
    }
    out.push(d);
  }
  return out;
}

// ---------- Bearbeiten (V104, Bauplan Doc F-222 Schritt 2) ----------

/** N3: Start mit 3 Kriterien und 2 Lösungen. */
export const START_CRITERIA = 3;
export const START_OPTIONS = 2;
export const SCORE_MAX = 10;

/** Ein Schritt am Werkzeug; alle Änderungen laufen über `editDecision` (Reducer-Aktion `dc`). */
export type DecisionOp =
  | { op: 'title'; title: string }
  | { op: 'question'; text: string }
  | { op: 'critAdd'; id: string; name: string }
  | { op: 'critName'; c: string; name: string }
  | { op: 'critWeight'; c: string; weight: number | null }
  | { op: 'critMust'; c: string; must: boolean }
  | { op: 'critHint'; c: string; hint: string }
  | { op: 'critMove'; c: string; to: number }
  | { op: 'critRemove'; c: string }
  | { op: 'optAdd'; id: string; name: string }
  | { op: 'optName'; o: string; name: string }
  | { op: 'optMove'; o: string; to: number }
  | { op: 'optRemove'; o: string }
  | { op: 'fails'; o: string; c: string; fails: boolean }
  | { op: 'score'; c: string; o: string; v: number | null; by?: string }
  | { op: 'why'; c: string; o: string; why: string }
  | { op: 'pair'; a: string; b: string; v: 0 | 1 | 2 }
  | { op: 'pairApply' }
  | { op: 'normalize' }
  | { op: 'decide'; o: string; why?: string; by?: string }
  | { op: 'reopen'; by?: string };

const clampScore = (v: number) => Math.max(0, Math.min(SCORE_MAX, Math.round(v)));
const move = <T,>(list: T[], i: number, to: number): T[] => {
  if (i < 0 || to < 0 || to >= list.length || i === to) return list;
  const out = [...list];
  const [x] = out.splice(i, 1);
  out.splice(to, 0, x);
  return out;
};
const mark = (d: Decision, text: string, now: Date, by?: string): DecisionMark[] =>
  [...(d.marks ?? []), { at: now.toISOString(), text, ...(by ? { by } : {}) }].slice(-MARKS_MAX);

/** N7: Entwurf · Bewertet (alle Zellen bewertet, Gewichte = 100 %) · Entschieden. */
export function stateOf(d: Decision): DecisionState {
  if (d.chosen) return 'decided';
  const weighed = d.criteria.filter((c) => !c.must);
  const full = weighed.length > 0 && d.options.length >= 2 && weighed.every((c) => d.options.every((o) => scoreOf(d, c.id, o.id)));
  return full && Math.abs(weightSum({ ...d, criteria: weighed }) - 100) < 0.05 ? 'rated' : 'draft';
}

/** Was fehlt noch bis „Bewertet“ (für „Noch offen: …“ am Werkzeug). */
export function openPoints(d: Decision): { weights: boolean; cells: number; few: boolean } {
  const weighed = d.criteria.filter((c) => !c.must);
  const cells = weighed.reduce((s, c) => s + d.options.filter((o) => !scoreOf(d, c.id, o.id)).length, 0);
  return { weights: Math.abs(weightSum({ ...d, criteria: weighed }) - 100) >= 0.05, cells, few: weighed.length < 2 || d.options.length < 2 };
}

/** Paarvergleich weicht von den eingetragenen Gewichten ab (N2: Hinweis bei Abweichung). */
export function pairsDiffer(d: Decision): boolean {
  if (!d.pairs) return false;
  const w = pairWeights(d.criteria.filter((c) => !c.must), d.pairs);
  return !!w && d.criteria.some((c) => !c.must && Math.abs((c.weight ?? 0) - (w[c.id] ?? 0)) >= 0.05);
}

function apply(d: Decision, o: DecisionOp, now: Date): Decision {
  const crit = (c: string, f: (x: DecisionCriterion) => DecisionCriterion): Decision => ({ ...d, criteria: d.criteria.map((x) => (x.id === c ? f(x) : x)) });
  const opt = (id: string, f: (x: DecisionOption) => DecisionOption): Decision => ({ ...d, options: d.options.map((x) => (x.id === id ? f(x) : x)) });
  switch (o.op) {
    case 'title': {
      const t = str(o.title, NAME_MAX);
      return t ? { ...d, title: t } : d;
    }
    case 'question': {
      const t = str(o.text, TEXT_MAX);
      const { question: _q, ...rest } = d; // eslint-disable-line @typescript-eslint/no-unused-vars
      return t ? { ...d, question: t } : rest;
    }
    case 'critAdd': {
      const name = str(o.name, NAME_MAX);
      if (!name || d.criteria.length >= ITEMS_MAX || d.criteria.some((c) => c.id === o.id)) return d;
      return { ...d, criteria: [...d.criteria, { id: o.id, name }] };
    }
    case 'critName': {
      const name = str(o.name, NAME_MAX);
      return name ? crit(o.c, (x) => ({ ...x, name })) : d;
    }
    case 'critWeight':
      return crit(o.c, (x) => {
        const { weight: _w, ...rest } = x; // eslint-disable-line @typescript-eslint/no-unused-vars
        return o.weight === null || !Number.isFinite(o.weight) ? rest : { ...x, weight: round1(Math.max(0, Math.min(100, o.weight))) };
      });
    case 'critMust': {
      const next = crit(o.c, (x) => {
        const { must: _m, weight: _w, ...rest } = x; // eslint-disable-line @typescript-eslint/no-unused-vars
        return o.must ? { ...rest, must: true } : rest;
      });
      // Muss-Kriterien tragen kein Gewicht; Bewertungen dazu fallen weg, „scheidet aus“ bleibt
      return o.must ? { ...next, scores: (d.scores ?? []).filter((s) => s.c !== o.c) } : { ...next, options: next.options.map((x) => dropFail(x, o.c)) };
    }
    case 'critHint': {
      const h = str(o.hint, TEXT_MAX);
      return crit(o.c, (x) => {
        const { hint: _h, ...rest } = x; // eslint-disable-line @typescript-eslint/no-unused-vars
        return h ? { ...rest, hint: h } : rest;
      });
    }
    case 'critMove':
      return { ...d, criteria: move(d.criteria, d.criteria.findIndex((c) => c.id === o.c), o.to) };
    case 'critRemove': {
      if (!d.criteria.some((c) => c.id === o.c)) return d;
      const pairs = d.pairs ? Object.fromEntries(Object.entries(d.pairs).filter(([k]) => !k.split('|').includes(o.c))) : undefined;
      const { pairs: _p, ...rest } = d; // eslint-disable-line @typescript-eslint/no-unused-vars
      return {
        ...rest,
        ...(pairs && Object.keys(pairs).length ? { pairs } : {}),
        criteria: d.criteria.filter((c) => c.id !== o.c),
        scores: (d.scores ?? []).filter((s) => s.c !== o.c),
        options: d.options.map((x) => dropFail(x, o.c)),
      };
    }
    case 'optAdd': {
      const name = str(o.name, NAME_MAX);
      if (!name || d.options.length >= ITEMS_MAX || d.options.some((x) => x.id === o.id)) return d;
      return { ...d, options: [...d.options, { id: o.id, name }] };
    }
    case 'optName': {
      const name = str(o.name, NAME_MAX);
      return name ? opt(o.o, (x) => ({ ...x, name })) : d;
    }
    case 'optMove':
      return { ...d, options: move(d.options, d.options.findIndex((x) => x.id === o.o), o.to) };
    case 'optRemove': {
      if (!d.options.some((x) => x.id === o.o)) return d;
      const { chosen: _c, ...rest } = d; // eslint-disable-line @typescript-eslint/no-unused-vars
      return { ...(d.chosen === o.o ? rest : d), options: d.options.filter((x) => x.id !== o.o), scores: (d.scores ?? []).filter((s) => s.o !== o.o) };
    }
    case 'fails':
      if (!d.criteria.some((c) => c.id === o.c && c.must)) return d;
      return opt(o.o, (x) => (o.fails ? { ...x, fails: [...new Set([...(x.fails ?? []), o.c])] } : dropFail(x, o.c)));
    case 'score': {
      if (!d.criteria.some((c) => c.id === o.c && !c.must) || !d.options.some((x) => x.id === o.o)) return d;
      const old = scoreOf(d, o.c, o.o);
      const others = (d.scores ?? []).filter((s) => !(s.c === o.c && s.o === o.o));
      if (o.v === null || !Number.isFinite(o.v)) return { ...d, scores: others };
      const s: DecisionScore = { c: o.c, o: o.o, v: clampScore(o.v), ...(old?.why ? { why: old.why } : {}), ...(o.by ? { by: o.by } : {}) };
      return { ...d, scores: [...others, s] };
    }
    case 'why': {
      const old = scoreOf(d, o.c, o.o);
      if (!old) return d;
      const why = str(o.why, TEXT_MAX);
      const { why: _w, ...rest } = old; // eslint-disable-line @typescript-eslint/no-unused-vars
      return { ...d, scores: (d.scores ?? []).map((s) => (s === old ? (why ? { ...rest, why } : rest) : s)) };
    }
    case 'pair': {
      const ia = d.criteria.findIndex((c) => c.id === o.a);
      const ib = d.criteria.findIndex((c) => c.id === o.b);
      if (ia < 0 || ib < 0 || ia === ib) return d;
      // Schlüssel immer in Listenreihenfolge
      const [a, b, v] = ia < ib ? [o.a, o.b, o.v] : [o.b, o.a, (2 - o.v) as 0 | 1 | 2];
      return { ...d, pairs: { ...(d.pairs ?? {}), [pairKey(a, b)]: v } };
    }
    case 'pairApply': {
      const weighed = d.criteria.filter((c) => !c.must);
      const w = pairWeights(weighed, d.pairs ?? {});
      if (!w) return d;
      return { ...d, pairs: d.pairs ?? {}, criteria: d.criteria.map((c) => (c.must ? c : { ...c, weight: w[c.id] })), marks: mark(d, 'Gewichte aus dem Paarvergleich übernommen', now) };
    }
    case 'normalize': {
      const weighed = d.criteria.filter((c) => !c.must);
      if (!weighed.length) return d;
      const w = normalizeWeights(weighed);
      return { ...d, criteria: d.criteria.map((c) => (c.must ? c : { ...c, weight: w[c.id] })) };
    }
    case 'decide': {
      const chosen = d.options.find((x) => x.id === o.o);
      if (!chosen) return d;
      const why = str(o.why, TEXT_MAX);
      if (needsWhy(d, o.o) && !why) return d;
      const { why: _w, ...rest } = d; // eslint-disable-line @typescript-eslint/no-unused-vars
      return { ...rest, ...(why ? { why } : {}), chosen: o.o, locked: true, marks: mark(d, `Entschieden: ${chosen.name}${why ? ` – ${why}` : ''}`, now, o.by) };
    }
    case 'reopen': {
      const { chosen: _c, locked: _l, why: _w, ...rest } = d; // eslint-disable-line @typescript-eslint/no-unused-vars
      return { ...rest, marks: mark(d, 'Wieder geöffnet', now, o.by) };
    }
  }
}

function dropFail(x: DecisionOption, c: string): DecisionOption {
  if (!x.fails?.includes(c)) return x;
  const fails = x.fails.filter((id) => id !== c);
  const { fails: _f, ...rest } = x; // eslint-disable-line @typescript-eslint/no-unused-vars
  return fails.length ? { ...x, fails } : rest;
}

/** Wendet einen Schritt an. Gesperrt (entschieden) geht nur „reopen“. Zustand und `changed` folgen von selbst. */
export function editDecision(ws: Workspace, id: string, o: DecisionOp, now = new Date()): Workspace {
  const list = decisionsOf(ws);
  const d = list.find((x) => x.id === id);
  if (!d || (d.locked && o.op !== 'reopen')) return ws;
  const next = apply(d, o, now);
  if (next === d) return ws;
  const done = { ...next, state: stateOf(next), changed: now.toISOString() };
  return { ...ws, decisions: list.map((x) => (x.id === id ? done : x)) };
}

/** Neue Entscheidung mit 3 Kriterien und 2 Lösungen (N3); `ids` liefert neue Ids (Reducer: fest übergeben). */
export function addDecision(
  ws: Workspace,
  v: { title: string; projectId?: string; question?: string },
  opts: { id: string; ids: string[]; now?: Date; names: { criterion: (n: number) => string; option: (n: number) => string } },
): { ws: Workspace; id: string } | null {
  const title = str(v.title, NAME_MAX);
  const list = decisionsOf(ws);
  if (!title || list.length >= DECISIONS_MAX || list.some((d) => d.id === opts.id) || opts.ids.length < START_CRITERIA + START_OPTIONS) return null;
  const now = (opts.now ?? new Date()).toISOString();
  const question = str(v.question, TEXT_MAX);
  const projectId = v.projectId && (ws.projects ?? []).some((p) => p.id === v.projectId) ? v.projectId : undefined;
  const d: Decision = {
    id: opts.id,
    title,
    state: 'draft',
    at: now,
    ...(question ? { question } : {}),
    ...(projectId ? { projectId } : {}),
    criteria: opts.ids.slice(0, START_CRITERIA).map((id, i) => ({ id, name: opts.names.criterion(i + 1) })),
    options: opts.ids.slice(START_CRITERIA, START_CRITERIA + START_OPTIONS).map((id, i) => ({ id, name: opts.names.option(i + 1) })),
  };
  return { ws: { ...ws, decisions: [...list, d] }, id: opts.id };
}

export type DecisionUndo = { item: Decision; index: number };
export function removeDecision(ws: Workspace, id: string): { ws: Workspace; undo: DecisionUndo } | null {
  const list = decisionsOf(ws);
  const index = list.findIndex((d) => d.id === id);
  if (index < 0) return null;
  return { ws: { ...ws, decisions: list.filter((d) => d.id !== id) }, undo: { item: list[index], index } };
}
export function undoRemoveDecision(ws: Workspace, u: DecisionUndo): Workspace {
  const list = decisionsOf(ws).filter((d) => d.id !== u.item.id);
  list.splice(Math.min(u.index, list.length), 0, u.item);
  return { ...ws, decisions: list };
}

/**
 * V108 (F-222 E6): Suche – Entscheidungen, in deren Titel, Frage, Kriterien oder Lösungen jedes Wort der Suche
 * vorkommt (ohne Groß-/Kleinschreibung und Akzente). Leere Suche = keine Treffer.
 */
export function searchDecisions(ws: Workspace, query: string): Decision[] {
  const f = (t: string) => t.toLocaleLowerCase('de').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const words = f(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return decisionsOf(ws).filter((d) => {
    const hay = f([d.title, d.question ?? '', ...d.criteria.map((c) => c.name), ...d.options.map((o) => o.name)].join(' '));
    return words.every((w) => hay.includes(w));
  });
}

/** Entscheidungen eines Projekts (oder freie, ohne Projekt), neueste zuerst. */
export const decisionsFor = (ws: Workspace, projectId: string | null): Decision[] =>
  decisionsOf(ws)
    .filter((d) => (projectId ? d.projectId === projectId : !d.projectId))
    .sort((a, b) => (b.changed ?? b.at).localeCompare(a.changed ?? a.at));

// ---------- Beispiele (N12 „Beispiel ansehen“) ----------

type Example = { title: string; question: string; criteria: [string, number | 'must', string?][]; options: [string, (number | null)[], string[]?][] };
export const EXAMPLES: Record<'flat' | 'painter', Example> = {
  flat: {
    title: 'Beispiel: Welche Wohnung nehmen wir?',
    question: 'Drei Wohnungen sind in der engeren Wahl. Welche passt am besten zu uns?',
    criteria: [
      ['Warmmiete höchstens 1.400 €', 'must', 'Laut Exposé'],
      ['Weg zur Arbeit', 35, 'Minuten mit Bus und Bahn, Hin- und Rückweg'],
      ['Platz', 30, 'Zimmerzahl und Grundriss für Homeoffice'],
      ['Lage und Umfeld', 20, 'Einkaufen, Grün, Lärm'],
      ['Balkon', 15, 'Größe und Sonne'],
    ],
    options: [
      ['Eimsbüttel, 3 Zimmer', [8, 6, 9, 4]],
      ['Barmbek, 3,5 Zimmer', [6, 9, 6, 8]],
      ['Altona, 4 Zimmer', [5, 10, 7, 9], ['Warmmiete höchstens 1.400 €']],
    ],
  },
  painter: {
    title: 'Beispiel: Welcher Malerbetrieb streicht das Büro?',
    question: 'Drei Angebote für Treppenhaus und Büros. Wen beauftragen wir?',
    criteria: [
      ['Termin bis Ende März', 'must', 'Schriftlich im Angebot'],
      ['Preis', 40, 'Gesamtpreis brutto, 10 = günstigstes Angebot'],
      ['Qualität', 30, 'Referenzen und Besichtigung'],
      ['Arbeiten im laufenden Betrieb', 20, 'Abends oder am Wochenende möglich?'],
      ['Gewährleistung', 10, 'Jahre über das Gesetz hinaus'],
    ],
    options: [
      ['Farbwerk Nord', [6, 9, 8, 5]],
      ['Malermeister Petersen', [9, 6, 5, 4]],
      ['Hansa Maler', [10, 5, 9, 6], ['Termin bis Ende März']],
    ],
  },
};

/** Legt ein Beispiel als eigene Entscheidung an (vollständig bewertet, damit das Ergebnis gleich zu sehen ist). */
export function addExample(ws: Workspace, which: 'flat' | 'painter', opts: { id: string; newId: () => string; projectId?: string; now?: Date }): { ws: Workspace; id: string } | null {
  const e = EXAMPLES[which];
  const list = decisionsOf(ws);
  if (list.length >= DECISIONS_MAX) return null;
  const now = (opts.now ?? new Date()).toISOString();
  const criteria: DecisionCriterion[] = e.criteria.map(([name, w, hint]) => ({ id: opts.newId(), name, ...(w === 'must' ? { must: true as const } : { weight: w }), ...(hint ? { hint } : {}) }));
  const weighed = criteria.filter((c) => !c.must);
  const options: DecisionOption[] = e.options.map(([name, , fails]) => {
    const f = (fails ?? []).map((n) => criteria.find((c) => c.name === n)!.id);
    return { id: opts.newId(), name, ...(f.length ? { fails: f } : {}) };
  });
  const scores: DecisionScore[] = [];
  e.options.forEach(([, vs], i) => vs.forEach((v, j) => v !== null && weighed[j] && scores.push({ c: weighed[j].id, o: options[i].id, v })));
  const projectId = opts.projectId && (ws.projects ?? []).some((p) => p.id === opts.projectId) ? opts.projectId : undefined;
  const d: Decision = { id: opts.id, title: e.title, question: e.question, state: 'draft', at: now, ...(projectId ? { projectId } : {}), criteria, options, scores };
  return { ws: { ...ws, decisions: [...list, { ...d, state: stateOf(d) }] }, id: opts.id };
}

// ---------- Ausgabe (N8: Markdown + CSV) ----------

const de = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 1 });
const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');

/** Markdown zum Lesen und Weitergeben (Projektbericht später als PDF). */
export function decisionMarkdown(d: Decision): string {
  const weighed = d.criteria.filter((c) => !c.must);
  const musts = d.criteria.filter((c) => c.must);
  const res = ranking(d);
  const out: string[] = [`# ${d.title}`, ''];
  if (d.question) out.push(d.question, '');
  out.push(`Zustand: ${({ draft: 'Entwurf', rated: 'Bewertet', decided: 'Entschieden' } as const)[d.state]}`, '');
  if (musts.length) out.push('## Muss-Kriterien', '', ...musts.map((c) => `- ${c.name}${c.hint ? ` – ${c.hint}` : ''}`), '');
  out.push('## Kriterien und Gewichte', '', '| Kriterium | Gewicht | Prüfung |', '|---|---:|---|', ...weighed.map((c) => `| ${cell(c.name)} | ${de(c.weight ?? 0)} % | ${cell(c.hint ?? '')} |`), '');
  out.push('## Bewertung (0 = gar nicht · 5 = teilweise · 10 = voll)', '', `| Lösung | ${weighed.map((c) => cell(c.name)).join(' | ')} | Nutzwert |`, `|---|${weighed.map(() => '---:').join('|')}|---:|`);
  for (const r of res)
    out.push(`| ${cell(r.option.name)}${r.out ? ' (scheidet aus)' : ''} | ${weighed.map((c) => (scoreOf(d, c.id, r.option.id)?.v ?? '–')).join(' | ')} | ${r.out ? '–' : de(r.total)} |`);
  out.push('', '## Ergebnis', '', ...res.map((r) => `${r.out ? '–' : `${r.rank}.`} ${r.option.name}: ${r.out ? `scheidet aus (${(r.option.fails ?? []).map((id) => d.criteria.find((c) => c.id === id)?.name).filter(Boolean).join(', ')})` : `${de(r.total)} Punkte`}`));
  const whys = (d.scores ?? []).filter((s) => s.why);
  if (whys.length) {
    out.push('', '## Begründungen', '');
    for (const s of whys) out.push(`- ${d.options.find((o) => o.id === s.o)?.name} · ${d.criteria.find((c) => c.id === s.c)?.name}: ${s.why}`);
  }
  if (d.chosen) out.push('', `**Entschieden: ${d.options.find((o) => o.id === d.chosen)?.name}**${d.why ? ` – ${d.why}` : ''}`);
  return out.join('\n') + '\n';
}

/** CSV (Semikolon, deutsche Zahlen) für Tabellenprogramme. */
export function decisionCsv(d: Decision): string {
  const weighed = d.criteria.filter((c) => !c.must);
  const q = (s: string) => (/[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const rows = [
    ['Lösung', ...weighed.map((c) => `${c.name} (${de(c.weight ?? 0)} %)`), 'Nutzwert', 'Rang'],
    ...ranking(d).map((r) => [r.option.name, ...weighed.map((c) => String(scoreOf(d, c.id, r.option.id)?.v ?? '')), r.out ? 'scheidet aus' : de(r.total), r.rank ? String(r.rank) : '']),
  ];
  return rows.map((r) => r.map(q).join(';')).join('\n') + '\n';
}

export const decisionFileName = (d: Decision, ext: 'md' | 'csv') =>
  `Entscheidung_${d.title.replace(/^Beispiel: /, 'Beispiel_').replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '').slice(0, 60) || 'ohne_Titel'}.${ext}`;
