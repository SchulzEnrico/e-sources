/**
 * V143 (F-238 Handschrift mit Apple Pencil, Entscheidungs-Doc V142, Option B, S2 „überall“, S8 „speichern wie
 * Sprachnotizen“). Reine Funktionen: Striche runden und prüfen, Anhang anlegen/entfernen, Vorschau als SVG-Pfad,
 * neue Handschrift-Notiz im Eingang (K14).
 *
 * Vorbild ist die Sprachnotiz (F-215 V79): Die Striche liegen nur auf dem Gerät (inkStore.ts, IndexedDB
 * `esource.ink`), die Notiz trägt einen Verweis `NoteAttachment { kind: 'ink', ref, at, dev, w, h, text? }`.
 */
import type { Note, NoteAttachment, Workspace } from './types';
import * as No from './notes';
import * as In from './inbox';

export type InkTool = 'pen' | 'marker' | 'eraser';
/** Ein Punkt: x, y (Punkte auf der Schreibfläche) und Druck 0…1 */
export type InkPoint = [number, number, number];
export interface InkStroke {
  tool: InkTool;
  color: string;
  /** Grundbreite in Punkten (Druck verändert sie beim Zeichnen) */
  width: number;
  pts: InkPoint[];
}

/** Drei Farben (S5: wenige, ruhige Farben) – Schwarz, Blau, Rot wie Kugelschreiber; Marker gelb */
export const INK_COLORS = ['#1b1b1b', '#1f4fbf', '#b3261e'] as const;
export const MARKER_COLOR = '#f2d64b';
export const INK_WIDTH: Record<InkTool, number> = { pen: 2.4, marker: 14, eraser: 18 };
/** Schreibfläche ab Werk (Notiz) und für die Unterschrift */
export const INK_SIZE = { w: 640, h: 400 };
export const SIGN_SIZE = { w: 360, h: 120 };

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Punkte auf eine Nachkommastelle, Druck auf zwei; fast gleiche Nachbarn fallen weg (kleiner speichern). */
export function roundStroke(s: InkStroke): InkStroke {
  const pts: InkPoint[] = [];
  for (const [x, y, p] of s.pts) {
    const q: InkPoint = [r1(x), r1(y), r2(Math.min(1, Math.max(0, p)))];
    const last = pts[pts.length - 1];
    if (last && Math.abs(last[0] - q[0]) < 0.5 && Math.abs(last[1] - q[1]) < 0.5) continue;
    pts.push(q);
  }
  return { tool: s.tool, color: s.color, width: r1(s.width), pts };
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Gespeicherte Striche prüfen (fremde oder kaputte Daten fallen weg). */
export function parseStrokes(v: unknown): InkStroke[] {
  if (!Array.isArray(v)) return [];
  const out: InkStroke[] = [];
  for (const s of v) {
    if (!s || typeof s !== 'object') continue;
    const o = s as Record<string, unknown>;
    const tool = o.tool === 'marker' || o.tool === 'eraser' ? o.tool : o.tool === 'pen' ? 'pen' : null;
    if (!tool || !Array.isArray(o.pts)) continue;
    const pts = o.pts.filter((p): p is InkPoint => Array.isArray(p) && p.length >= 2 && isNum(p[0]) && isNum(p[1])).map((p) => [p[0], p[1], isNum(p[2]) ? p[2] : 0.5] as InkPoint);
    if (!pts.length) continue;
    out.push({ tool, color: typeof o.color === 'string' ? o.color : INK_COLORS[0], width: isNum(o.width) && o.width > 0 ? o.width : INK_WIDTH[tool], pts });
  }
  return out;
}

/** Wie viele sichtbare Striche (Radierer zählt nicht)? */
export const inkCount = (strokes: readonly InkStroke[]) => strokes.filter((s) => s.tool !== 'eraser').length;

/** Pfad für SVG (Vorschau, Bericht): einfache Linie durch die Punkte, Punkt-Striche als kurzer Strich. */
export function strokePath(s: Pick<InkStroke, 'pts'>): string {
  const p = s.pts;
  if (!p.length) return '';
  if (p.length === 1) return `M${p[0][0]} ${p[0][1]}l0.1 0`;
  let d = `M${p[0][0]} ${p[0][1]}`;
  for (let i = 1; i < p.length; i++) {
    // weiche Kurve: Mittelpunkte als Ziel, echte Punkte als Stütze
    const [x, y] = p[i];
    if (i < p.length - 1) {
      const mx = r1((x + p[i + 1][0]) / 2);
      const my = r1((y + p[i + 1][1]) / 2);
      d += `Q${x} ${y} ${mx} ${my}`;
    } else d += `L${x} ${y}`;
  }
  return d;
}

/** Mittlere Strichbreite aus dem Druck (Stift: 0,6…1,6-fach) */
export function strokeWidth(s: InkStroke): number {
  if (s.tool !== 'pen') return s.width;
  const avg = s.pts.reduce((a, p) => a + p[2], 0) / Math.max(1, s.pts.length);
  return r1(s.width * (0.6 + avg));
}

/** Ganze Handschrift als SVG (Radierer als weiße Maske). Für Vorschau, Bericht und „Als Bild sichern“. */
export function inkSvg(strokes: readonly InkStroke[], w: number, h: number, label = ''): string {
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const hasEraser = strokes.some((s) => s.tool === 'eraser');
  const paths = strokes
    .filter((s) => s.tool !== 'eraser')
    .map((s) => `<path d="${strokePath(s)}" fill="none" stroke="${esc(s.color)}" stroke-width="${strokeWidth(s)}" stroke-linecap="round" stroke-linejoin="round"${s.tool === 'marker' ? ' opacity="0.45"' : ''}/>`)
    .join('');
  // Radierer wirkt auf alles davor: Maske mit allen Radierer-Strichen in Schwarz
  const mask = hasEraser
    ? `<defs><mask id="ink-er" maskUnits="userSpaceOnUse"><rect width="${w}" height="${h}" fill="#fff"/>${strokes
        .filter((s) => s.tool === 'eraser')
        .map((s) => `<path d="${strokePath(s)}" fill="none" stroke="#000" stroke-width="${s.width}" stroke-linecap="round" stroke-linejoin="round"/>`)
        .join('')}</mask></defs>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img"${label ? ` aria-label="${esc(label)}"` : ''}>${mask}<g${hasEraser ? ' mask="url(#ink-er)"' : ''}>${paths}</g></svg>`;
}

// ---------- Anhang an der Notiz ----------

export const inkOf = (n: Pick<Note, 'attach'>): NoteAttachment[] => (n.attach ?? []).filter((a) => a.kind === 'ink');
export const hasInk = (n: Pick<Note, 'attach'>) => (n.attach ?? []).some((a) => a.kind === 'ink');
/** S8: Herkunft „Handschrift“ (wie „Sprachnotiz“) */
export const isInkNote = (n: Pick<Note, 'origin'>) => n.origin?.via === 'ink';

/** Handschrift anhängen bzw. ersetzen (gleicher Verweis bleibt an seinem Platz). */
export function addInk(n: Pick<Note, 'attach'>, a: NoteAttachment): NoteAttachment[] {
  const list = n.attach ?? [];
  const at = list.findIndex((x) => x.kind === 'ink' && x.ref === a.ref);
  const item = { ...a, kind: 'ink' as const };
  if (at < 0) return [...list, item];
  return list.map((x, i) => (i === at ? item : x));
}
/** Handschrift entfernen; leer = undefined (Feld fällt weg). */
export function dropInk(n: Pick<Note, 'attach'>, ref: string): NoteAttachment[] | undefined {
  const out = (n.attach ?? []).filter((x) => !(x.kind === 'ink' && x.ref === ref));
  return out.length ? out : undefined;
}
/** Umgewandelten Text setzen (leer = weg). */
export function setInkText(n: Pick<Note, 'attach'>, ref: string, text: string): NoteAttachment[] | undefined {
  const t = text.trim();
  return (n.attach ?? []).map((x) => {
    if (x.kind !== 'ink' || x.ref !== ref) return x;
    const { text: _old, ...rest } = x;
    void _old;
    return t ? { ...rest, text: t } : rest;
  });
}
/** Alle Tinten-Schlüssel der Library (auch Unterschriften an Projekten) – der Rest auf dem Gerät darf weg. */
export function inkRefs(ws: Workspace): Set<string> {
  const out = new Set<string>();
  for (const n of No.notesOf(ws)) for (const a of inkOf(n)) out.add(a.ref);
  for (const p of ws.projects ?? []) for (const r of [p.charter?.inkAg, p.charter?.inkPl]) if (r) out.add(r);
  return out;
}

/** Textalternative (NF-03): umgewandelter Text bzw. „Handschrift, n Striche“ */
export function inkAlt(a: Pick<NoteAttachment, 'text'>, strokes?: number): string {
  if (a.text) return `Handschrift: ${a.text}`;
  return strokes === undefined ? 'Handschrift' : strokes === 1 ? 'Handschrift, 1 Strich' : `Handschrift, ${strokes} Striche`;
}

/** S8: neue Handschrift-Notiz – Herkunft „Handschrift“, Titel mit Zeitpunkt, landet im Eingang (K14). */
export function captureInk(ws: Workspace, a: NoteAttachment, act: No.Act & { id?: string; title?: string } = {}): { ws: Workspace; id: string } {
  const title = (act.title ?? (a.text ? a.text.split('\n')[0] : 'Handschrift')).slice(0, 200);
  const made = No.createNote(In.ensureInbox(ws), { title, text: '' }, { ...act, via: 'ink' });
  const n = No.noteById(made.ws, made.id);
  const withInk = n ? No.updateNote(made.ws, made.id, { attach: addInk(n, a) }, act) : made.ws;
  return { ws: In.toInbox(withInk, made.id, act), id: made.id };
}

/** Lokale Handschrifterkennung (Chromium „Handwriting Recognition API“) – nur, wo vorhanden. */
export interface HwRecognizerNav {
  createHandwritingRecognizer?: (c: { languages: string[] }) => Promise<{
    startDrawing: (h?: { recognitionType?: string; inputType?: string }) => {
      addStroke: (s: { addPoint: (p: { x: number; y: number; t: number }) => void }) => void;
      getPrediction: () => Promise<{ text: string }[]>;
      clear: () => void;
    };
    finish: () => void;
  }>;
}
export const canRecognize = (nav: unknown) => typeof (nav as HwRecognizerNav | undefined)?.createHandwritingRecognizer === 'function';
