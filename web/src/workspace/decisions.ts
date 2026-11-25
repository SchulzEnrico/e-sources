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
