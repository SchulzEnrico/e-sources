/**
 * F-207 Main Stage (V96, Entscheidungs-Doc „F-206 V96 – Main Stage, Library-Umschalter …“, Antworten: alle Vorschläge).
 * S1/M2: genau eine Main Stage je Desk ('' = Main Desk); eine neue löst die alte ab (Rückgängig am Ort).
 * M3/M6: fest im Layout (nicht verschieben, tauschen, schließen), Mindestgröße in px; „auf allen Desks“ ist Stufe 2.
 * M4: Pads liegen nie über der Stage – ein Platz, der sie überdeckt, rückt an den nächsten freien Rand daneben.
 * M9: nur im Desk-Modus (im Notizen-Modus gibt es keine Stage).
 */
import type { DeskNotes, PadPlace, Workspace } from './types';
import type { FRect } from './tree';

export type Stage = NonNullable<DeskNotes['stage']>;

const EPS = 1e-6;

export const stageOf = (ws: Workspace, desk: string): Stage | undefined => ws.deskNotes?.[desk]?.stage;
export const isStage = (ws: Workspace, desk: string, area: string): boolean => stageOf(ws, desk)?.area === area;

function withStage(ws: Workspace, desk: string, stage: Stage | undefined): Workspace {
  const dn: DeskNotes = { ...ws.deskNotes?.[desk] };
  if (stage) dn.stage = stage;
  else delete dn.stage;
  const all = { ...ws.deskNotes };
  if (Object.keys(dn).length) all[desk] = dn;
  else delete all[desk];
  const out: Workspace = { ...ws, deskNotes: all };
  if (!Object.keys(all).length) delete out.deskNotes;
  return out;
}

/** M1/M2: Slot auf die Main Stage (bzw. `null` = Stage lösen). Gibt den alten Stand für „Rückgängig“ zurück. */
export function setStage(ws: Workspace, desk: string, area: string | null): { ws: Workspace; undo: Stage | undefined } {
  const prev = stageOf(ws, desk);
  if (!area) return { ws: withStage(ws, desk, undefined), undo: prev };
  if (prev?.area === area) return { ws, undo: prev };
  // neue Stage: „fest“ bleibt als Wahl des Anwenders, die Mindestgröße gehörte zum alten Slot
  return { ws: withStage(ws, desk, { area, ...(prev?.fixed ? { fixed: true } : {}) }), undo: prev };
}

/** Rückgängig: alten Stand zurück (auch „keine Stage“). */
export const restoreStage = (ws: Workspace, desk: string, undo: Stage | undefined): Workspace => withStage(ws, desk, undo);

/** M3: Verhalten ändern (fest, Mindestgröße). `allDesks` bleibt bis Stufe 2 aus. */
export function editStage(ws: Workspace, desk: string, patch: Partial<Pick<Stage, 'fixed' | 'minW' | 'minH'>>): Workspace {
  const cur = stageOf(ws, desk);
  if (!cur) return ws;
  const next: Stage = { ...cur };
  if ('fixed' in patch) {
    if (patch.fixed) next.fixed = true;
    else delete next.fixed;
  }
  for (const k of ['minW', 'minH'] as const) {
    if (!(k in patch)) continue;
    const v = patch[k];
    if (v && v > 0) next[k] = Math.round(v);
    else delete next[k];
  }
  return withStage(ws, desk, next);
}

/** Stage auf einen gelöschten Slot? Dann lösen (beim Laden bzw. nach Schließen). */
export function dropStaleStage(ws: Workspace, desk: string, areas: ReadonlySet<string>): Workspace {
  const st = stageOf(ws, desk);
  return st && !areas.has(st.area) ? withStage(ws, desk, undefined) : ws;
}

/** M6: Was sperrt „fest im Layout“? */
export type StageLock = 'move' | 'swap' | 'close';
export const stageLocks = (ws: Workspace, desk: string, area: string): boolean => !!stageOf(ws, desk)?.fixed && isStage(ws, desk, area);

/** M6: Größe nicht unter die Mindestgröße (px). */
export function clampToMin(st: Stage | undefined, w: number, h: number): { w: number; h: number } {
  return { w: Math.max(w, st?.minW ?? 0), h: Math.max(h, st?.minH ?? 0) };
}

export const overlaps = (a: FRect, b: FRect): boolean =>
  a.x < b.x + b.w - EPS && b.x < a.x + a.w - EPS && a.y < b.y + b.h - EPS && b.y < a.y + a.h - EPS;

/**
 * M4: Pad-Platz, der die Stage überdeckt, rückt an den nächsten freien Rand daneben (links, rechts, oben, unten –
 * kürzester Weg). Passt das Pad nirgends ganz daneben, nimmt es den größten freien Streifen neben der Stage.
 * Alles in Anteilen der Desk-Fläche (0–1).
 */
export function avoidStage(p: PadPlace, st: FRect): PadPlace {
  if (!overlaps(p, st)) return p;
  const clampX = (x: number, w: number) => Math.min(Math.max(0, x), 1 - w);
  const clampY = (y: number, h: number) => Math.min(Math.max(0, y), 1 - h);
  const cands: PadPlace[] = [];
  if (st.x >= p.w - EPS) cands.push({ ...p, x: st.x - p.w, y: clampY(p.y, p.h) });
  if (1 - (st.x + st.w) >= p.w - EPS) cands.push({ ...p, x: st.x + st.w, y: clampY(p.y, p.h) });
  if (st.y >= p.h - EPS) cands.push({ ...p, y: st.y - p.h, x: clampX(p.x, p.w) });
  if (1 - (st.y + st.h) >= p.h - EPS) cands.push({ ...p, y: st.y + st.h, x: clampX(p.x, p.w) });
  const ok = cands.filter((c) => !overlaps(c, st));
  if (ok.length) {
    const d = (c: PadPlace) => Math.hypot(c.x - p.x, c.y - p.y);
    return round(ok.sort((a, b) => d(a) - d(b))[0]);
  }
  // größter freier Streifen
  const bands: PadPlace[] = [
    { x: 0, y: 0, w: st.x, h: 1 },
    { x: st.x + st.w, y: 0, w: 1 - st.x - st.w, h: 1 },
    { x: 0, y: 0, w: 1, h: st.y },
    { x: 0, y: st.y + st.h, w: 1, h: 1 - st.y - st.h },
  ].filter((b) => b.w > EPS && b.h > EPS);
  if (!bands.length) return p; // Stage füllt den Desk – Pads bleiben, wie sie sind (z. B. Smartphone: nur Dock, M8)
  const best = bands.sort((a, b) => b.w * b.h - a.w * a.h)[0];
  const w = Math.min(p.w, best.w);
  const h = Math.min(p.h, best.h);
  const within = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
  return round({ x: within(p.x, best.x, best.x + best.w - w), y: within(p.y, best.y, best.y + best.h - h), w, h });
}

const r4 = (x: number) => Math.round(x * 10000) / 10000;
const round = (p: PadPlace): PadPlace => ({ x: r4(p.x), y: r4(p.y), w: r4(p.w), h: r4(p.h) });
