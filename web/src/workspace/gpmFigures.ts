/**
 * F-234 Option A (V135, Doc „F-234 V134 – Fehlende Darstellungen“, D1–D8 wie Vorschlag): Grafiken der Kapitel-Blätter im
 * Aussehen des ColorGentlemen-Reports – weinrote Kästen mit Verlauf, graue Arbeitspakete, Verbindungen als rote Linien,
 * Legende im Kasten. Alles wird aus den vorhandenen Daten gezeichnet (nichts doppelt): Zielhierarchie (Abb. 4) aus den
 * Zielen mit Oberziel, Projektorganisation (Abb. 7) aus den Rollen, Phasenplan (Abb. 9) aus Phasen und Meilensteinen,
 * PSP (Abb. 10) aus dem Projektstrukturplan, vernetzter Balkenplan (Abb. 13) aus dem Gantt, Auslastungsdiagramm mit
 * Einsatzmittelganglinie (Abb. 14) aus den Einsätzen. Reine Funktionen (SVG-Text); dieselben Bausteine zeigen das Blatt
 * (ProjectForms) und der Bericht (gpmReport). Tests in gpm.test.ts („F-234“).
 */
import type { Project, Workspace } from './types';
import { ganttOf, phaseBars, type Gantt } from './gantt';
import { pspTree, type PspNode } from './psp';
import { resourceUse, type ResRow } from './resources';
import { personById } from './persons';
import { projectById } from './projects';

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const dmy = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}` : d);
const dm = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d.slice(8, 10)}.${d.slice(5, 7)}.` : d);
const dayNo = (d: string) => Math.round(Date.parse(`${d}T12:00:00Z`) / 864e5);
const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

/** Farben wie im ColorGentlemen-Report. */
export const LOOK = {
  wine: '#7b1113',
  wineHi: '#b0282c',
  orange: '#d77a1e',
  orangeHi: '#f0a24c',
  yellow: '#fbf0a6',
  gray: '#d3d3d3',
  grayHi: '#f7f7f7',
  grayLine: '#8a8a8a',
  ink: '#1b1b1b',
  muted: '#666',
  grid: '#d9d9d9',
  red: '#d0021b',
};
export type BoxTone = 'wine' | 'orange' | 'yellow' | 'gray' | 'pale' | 'root';

const DEFS = `<defs>
<linearGradient id="fgWine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${LOOK.wineHi}"/><stop offset="1" stop-color="${LOOK.wine}"/></linearGradient>
<linearGradient id="fgOrange" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${LOOK.orangeHi}"/><stop offset="1" stop-color="${LOOK.orange}"/></linearGradient>
<linearGradient id="fgYellow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbe0"/><stop offset="1" stop-color="${LOOK.yellow}"/></linearGradient>
<linearGradient id="fgGray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${LOOK.grayHi}"/><stop offset="1" stop-color="${LOOK.gray}"/></linearGradient>
<linearGradient id="fgPale" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#ececec"/></linearGradient>
<filter id="fgShadow" x="-10%" y="-10%" width="130%" height="140%"><feDropShadow dx="1.2" dy="1.6" stdDeviation="1.2" flood-color="#000" flood-opacity="0.28"/></filter>
</defs>`;
const FILL: Record<BoxTone, string> = { wine: 'url(#fgWine)', orange: 'url(#fgOrange)', yellow: 'url(#fgYellow)', gray: 'url(#fgGray)', pale: 'url(#fgPale)', root: 'url(#fgGray)' };
const TEXT: Record<BoxTone, string> = { wine: '#fff', orange: '#fff', yellow: LOOK.ink, gray: LOOK.wine, pale: LOOK.muted, root: LOOK.wine };
const STROKE: Record<BoxTone, string> = { wine: '#4a0a0b', orange: '#9b5310', yellow: '#b8a845', gray: LOOK.grayLine, pale: '#bdbdbd', root: LOOK.grayLine };

/** Zeilenumbruch nach Zeichen (Kästen haben feste Breite); höchstens `max` Zeilen, Rest mit „…“. */
export function wrap(text: string, chars: number, max = 4): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const w0 of para.split(/\s+/).filter(Boolean)) {
      let w = w0;
      while (w.length > chars) {
        if (line) (out.push(line), (line = ''));
        out.push(`${w.slice(0, chars - 1)}-`);
        w = w.slice(chars - 1);
      }
      if (!line) line = w;
      else if (line.length + 1 + w.length <= chars) line += ` ${w}`;
      else (out.push(line), (line = w));
    }
    if (line) out.push(line);
  }
  if (out.length > max) {
    const cut = out.slice(0, max);
    cut[max - 1] = `${cut[max - 1].slice(0, Math.max(0, chars - 1))}…`;
    return cut;
  }
  return out.length ? out : [''];
}

interface Box {
  lines: string[];
  /** erste Zeile fett (Code), übrige normal */
  bold?: boolean;
  tone: BoxTone;
  title?: string;
}
const LH = 11;
const boxH = (b: Box) => 10 + b.lines.length * LH;
function drawBox(x: number, y: number, w: number, b: Box, fs = 9): string {
  const h = boxH(b);
  const t = TEXT[b.tone];
  const tx = b.lines
    .map((l, i) => `<text x="${x + w / 2}" y="${y + 13 + i * LH}" text-anchor="middle" font-size="${fs}" font-weight="${i === 0 || b.bold ? 'bold' : 'normal'}" fill="${t}">${esc(l)}</text>`)
    .join('');
  return `<g>${b.title ? `<title>${esc(b.title)}</title>` : ''}<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${FILL[b.tone]}" stroke="${STROKE[b.tone]}" stroke-width="0.8" filter="url(#fgShadow)"/>${tx}</g>`;
}
const svgWrap = (w: number, h: number, label: string, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="${esc(label)}" font-family="'Open Sans', system-ui, sans-serif">${DEFS}${body}</svg>`;
function legend(x: number, y: number, items: [BoxTone, string][]): string {
  const w = 104;
  const parts = [`<rect x="${x}" y="${y}" width="${w + 12}" height="${22 + items.length * 18}" rx="3" fill="#fff" stroke="${LOOK.grayLine}" stroke-width="0.6"/>`, `<rect x="${x + 6}" y="${y + 4}" width="56" height="14" rx="2" fill="${LOOK.ink}"/><text x="${x + 34}" y="${y + 14.5}" text-anchor="middle" font-size="8.5" font-weight="bold" fill="#fff">Legende</text>`];
  items.forEach(([tone, name], i) => parts.push(drawBox(x + 6, y + 22 + i * 18, w, { lines: [name], tone, bold: true }, 8).replace(/height="21"/, 'height="15"').replace(/y="(\d+(?:\.\d+)?)" text-anchor/, (_m, v) => `y="${Number(v) - 2.5}" text-anchor`)));
  return parts.join('');
}

// ---------------------------------------------------------------- Spalten-Baum (Zielhierarchie, PSP)

export interface TreeColumn {
  head: Box;
  items: { box: Box; depth: number }[];
}
/** Wurzel oben, darunter eine Reihe von Spaltenköpfen; Kinder stehen untereinander an einer Linie links (wie Abb. 4/10). */
export function columnTreeSvg(root: Box, columns: TreeColumn[], o: { label: string; legend?: [BoxTone, string][]; colW?: number; chars?: number }): string {
  const colW = o.colW ?? 124;
  const gap = 14;
  const n = Math.max(1, columns.length);
  const width = Math.max(420, n * (colW + gap) + gap);
  const parts: string[] = [];
  const rootW = Math.min(width - 40, 300);
  const rootX = (width - rootW) / 2;
  const rootBox = { ...root, lines: root.lines };
  const rh = boxH(rootBox) + 8;
  parts.push(drawBox(rootX, 8, rootW, rootBox, 11).replace(/height="(\d+)"/, `height="${rh}"`));
  const busY = 8 + rh + 14;
  const headY = busY + 12;
  parts.push(`<line x1="${width / 2}" y1="${8 + rh}" x2="${width / 2}" y2="${busY}" stroke="${LOOK.wine}" stroke-width="1.6"/>`);
  const cx = (i: number) => gap + i * (colW + gap);
  if (columns.length > 1) parts.push(`<line x1="${cx(0) + colW / 2}" y1="${busY}" x2="${cx(columns.length - 1) + colW / 2}" y2="${busY}" stroke="${LOOK.wine}" stroke-width="1.6"/>`);
  let bottom = headY;
  columns.forEach((c, i) => {
    const x = cx(i);
    parts.push(`<line x1="${x + colW / 2}" y1="${busY}" x2="${x + colW / 2}" y2="${headY}" stroke="${LOOK.wine}" stroke-width="1.6"/>`);
    parts.push(drawBox(x, headY, colW, c.head));
    let y = headY + boxH(c.head) + 12;
    const lineX = x + 4;
    let lastMid = -1;
    for (const it of c.items) {
      const ind = 10 + it.depth * 8;
      const w = colW - ind;
      const h = boxH(it.box);
      parts.push(`<line x1="${lineX}" y1="${y + h / 2}" x2="${x + ind}" y2="${y + h / 2}" stroke="${LOOK.wine}" stroke-width="1.4"/>`);
      parts.push(drawBox(x + ind, y, w, it.box));
      lastMid = y + h / 2;
      y += h + 9;
    }
    if (lastMid > 0) parts.unshift(`<line x1="${lineX}" y1="${headY + boxH(c.head) / 2}" x2="${lineX}" y2="${lastMid}" stroke="${LOOK.wine}" stroke-width="1.4"/>`);
    bottom = Math.max(bottom, y);
  });
  let height = bottom + 6;
  if (o.legend?.length) {
    const lh = 22 + o.legend.length * 18;
    parts.push(legend(width - 130, height, o.legend));
    height += lh + 8;
  }
  return svgWrap(width, height, o.label, parts.join(''));
}

// ---------------------------------------------------------------- Zielhierarchie (Abb. 4)

const toneOfLevel = (lv?: string, kind?: string): BoxTone => (kind === 'non' ? 'pale' : lv === 'should' ? 'orange' : lv === 'can' ? 'yellow' : 'wine');
const goalLines = (code: string | undefined, text: string, chars: number) => [...(code ? [code] : []), ...wrap(text.split('\n')[0], chars, 3)];

/** Zielhierarchie: oberste Leistungsziele je eine Spalte (mit Unterzielen), dazu Spalten „Soziale Ziele“ und „Nichtziele“. */
export function goalTreeSvg(p: Project): string {
  const goals = p.goals ?? [];
  if (!goals.length) return '';
  const ids = new Set(goals.map((g) => g.id));
  const kids = (id: string) => goals.filter((g) => g.parent === id);
  const top = goals.filter((g) => !g.parent || !ids.has(g.parent));
  const chars = 20;
  const columns: TreeColumn[] = [];
  const walk = (id: string, depth: number, into: TreeColumn['items']) => {
    for (const k of kids(id)) {
      into.push({ depth, box: { lines: goalLines(k.code, k.text, chars - depth), tone: toneOfLevel(k.level, k.kind), title: [k.code, k.text, k.measure].filter(Boolean).join(' – ') } });
      walk(k.id, depth + 1, into);
    }
  };
  const loose: TreeColumn['items'] = [];
  for (const g of top.filter((x) => (x.kind ?? 'perf') === 'perf')) {
    if (!kids(g.id).length) {
      loose.push({ depth: 0, box: { lines: goalLines(g.code, g.text, chars), tone: toneOfLevel(g.level, g.kind), title: g.text } });
      continue;
    }
    const items: TreeColumn['items'] = [];
    walk(g.id, 0, items);
    columns.push({ head: { lines: goalLines(g.code, g.text, chars), tone: 'pale', title: g.text }, items });
  }
  if (loose.length) columns.push({ head: { lines: ['L', 'Leistungsziele'], tone: 'pale' }, items: loose });
  for (const [kind, code, name] of [['social', 'S', 'Soziale Ziele'], ['non', 'N', 'Nichtziele']] as const) {
    const list = top.filter((x) => x.kind === kind);
    if (!list.length) continue;
    const items: TreeColumn['items'] = [];
    for (const g of list) {
      items.push({ depth: 0, box: { lines: goalLines(g.code, g.text, chars), tone: kind === 'non' ? 'pale' : toneOfLevel(g.level, g.kind), title: g.text } });
      walk(g.id, 1, items);
    }
    columns.push({ head: { lines: [code, name], tone: 'pale' }, items });
  }
  const sub = p.brief?.goal ?? '';
  return columnTreeSvg({ lines: [p.name, ...(sub ? wrap(sub.split('\n')[0], 52, 1) : [])], tone: 'root' }, columns, {
    label: `Zielhierarchie ${p.name}: ${goals.length} Ziele in ${columns.length} Gruppen`,
    legend: [['wine', 'MUSS'], ['orange', 'SOLL'], ['yellow', 'KANN']],
  });
}

// ---------------------------------------------------------------- PSP (Abb. 10)

/** Codierter PSP: Projekt oben, Teilaufgaben der ersten Ebene als Spalten, darunter Teilaufgaben und Arbeitspakete. */
export function pspSheetSvg(ws: Workspace, pid: string): string {
  const p = projectById(ws, pid);
  const tree = pspTree(ws, pid);
  if (!p || !tree.length) return '';
  const chars = 19;
  const lines = (n: PspNode, c = chars) => [...wrap(n.title, c, 3), n.code];
  // Meilensteine gehören in den Phasen- und Balkenplan, nicht in den PSP (wie Abb. 10 im Report)
  const columns: TreeColumn[] = tree.filter((t) => !t.milestone).map((top) => {
    const items: TreeColumn['items'] = [];
    const walk = (n: PspNode, depth: number) => {
      for (const k of n.children.filter((c) => !c.milestone)) {
        items.push({ depth, box: { lines: lines(k, chars - depth), tone: k.summary ? 'wine' : 'gray', title: `${k.code} ${k.title}` } });
        walk(k, depth + 1);
      }
    };
    walk(top, 0);
    return { head: { lines: lines(top), tone: top.summary ? 'wine' : 'gray', bold: true, title: `${top.code} ${top.title}` }, items };
  });
  const no = p.charter?.no ?? '';
  const sub = p.brief?.goal ?? '';
  return columnTreeSvg({ lines: [p.name, ...(sub ? wrap(sub, 52, 1) : []), ...(no ? [no] : [])], tone: 'root' }, columns, {
    label: `Projektstrukturplan ${p.name}: ${columns.length} Teilaufgaben der ersten Ebene`,
    legend: [['root', 'Wurzelelement'], ['wine', 'Teilaufgabe'], ['gray', 'Arbeitspaket']],
  });
}

// ---------------------------------------------------------------- Projektorganisation (Abb. 7)

/** Organigramm aus den Rollen: Auftraggeber/Lenkung oben, Projektleitung darunter, übrige Rollen in Reihen darunter. */
export function orgChartSvg(ws: Workspace, p: Project): string {
  const roles = p.roles ?? [];
  if (!roles.length) return '';
  const who = (id?: string) => (id ? personById(ws, id)?.name ?? '' : '');
  const isTop = (n: string) => /auftrag|lenk|steuer|geschäftsf|sponsor/i.test(n);
  const isLead = (n: string, id: string) => id === 'lead' || /projektleit/i.test(n);
  const lead = roles.find((r) => isLead(r.name, r.id));
  const tops = roles.filter((r) => r !== lead && isTop(r.name));
  const rest = roles.filter((r) => r !== lead && !tops.includes(r));
  const bw = 150;
  const box = (name: string, person: string, tone: BoxTone): Box => ({ lines: [...(person ? wrap(person, 24, 1) : []), ...wrap(name, 26, 2)], tone, title: [name, person].filter(Boolean).join(': ') });
  const perRow = 4;
  const width = Math.max(560, Math.min(rest.length, perRow) * (bw + 20) + 40);
  const parts: string[] = [];
  let y = 10;
  const center = width / 2;
  const line = (x1: number, y1: number, x2: number, y2: number, dash = false) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${LOOK.wine}" stroke-width="1.6"${dash ? ' stroke-dasharray="5 4"' : ''}/>`;
  // Auftraggeber/Lenkung nebeneinander
  let prevBottom = -1;
  if (tops.length) {
    const tw = tops.length * (bw + 20) - 20;
    let h = 0;
    tops.forEach((r, i) => {
      const b = box(r.name, who(r.person), 'gray');
      parts.push(drawBox(center - tw / 2 + i * (bw + 20), y, bw, b));
      h = Math.max(h, boxH(b));
    });
    prevBottom = y + h;
    y += h + 26;
  }
  if (lead) {
    const b = box(lead.name, who(lead.person), 'wine');
    if (prevBottom > 0) parts.push(line(center, prevBottom, center, y));
    parts.push(drawBox(center - bw / 2, y, bw, b));
    prevBottom = y + boxH(b);
    y += boxH(b) + 26;
  }
  for (let i = 0; i < rest.length; i += perRow) {
    const row = rest.slice(i, i + perRow);
    const tw = row.length * (bw + 20) - 20;
    const x0 = center - tw / 2;
    const busY = y - 12;
    if (prevBottom > 0) {
      parts.push(line(center, prevBottom, center, busY));
      if (row.length > 1) parts.push(line(x0 + bw / 2, busY, x0 + tw - bw / 2, busY));
    }
    let h = 0;
    row.forEach((r, k) => {
      const b = box(r.name, who(r.person), 'gray');
      parts.push(line(x0 + k * (bw + 20) + bw / 2, busY, x0 + k * (bw + 20) + bw / 2, y));
      parts.push(drawBox(x0 + k * (bw + 20), y, bw, b));
      h = Math.max(h, boxH(b));
    });
    prevBottom = -1;
    // weitere Reihen hängen an derselben Linie der Projektleitung
    if (i + perRow < rest.length) parts.push(line(center, busY, center, y + h + 14));
    prevBottom = i + perRow < rest.length ? y + h + 2 : -1;
    y += h + 26;
  }
  parts.push(`<text x="10" y="${y + 2}" font-size="9" fill="${LOOK.muted}">Linie = Weisung im Projekt · Weinrot = Projektleitung</text>`);
  return svgWrap(width, y + 10, `Projektorganisation ${p.name}: ${roles.length} Rollen`, parts.join(''));
}

// ---------------------------------------------------------------- Zeitachse (Phasenplan, Balkenplan)

interface Axis {
  x0: number;
  w: number;
  d0: number;
  d1: number;
  x: (d: string) => number;
}
function axisOf(start: string, end: string, x0: number, w: number): Axis {
  const d0 = dayNo(start.slice(0, 8) + '01');
  const e = new Date(`${end}T12:00:00Z`);
  const d1 = Math.round(Date.UTC(e.getUTCFullYear(), e.getUTCMonth() + 1, 1, 12) / 864e5);
  return { x0, w, d0, d1, x: (d: string) => x0 + ((dayNo(d) - d0) / Math.max(1, d1 - d0)) * w };
}
function monthHeads(a: Axis, y: number, h: number, withYear = true): string {
  const parts: string[] = [];
  let lastYear = -1;
  for (let d = a.d0; d < a.d1; ) {
    const dt = new Date(d * 864e5);
    const next = Math.round(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 1, 12) / 864e5);
    const x1 = a.x0 + ((d - a.d0) / (a.d1 - a.d0)) * a.w;
    const x2 = a.x0 + ((next - a.d0) / (a.d1 - a.d0)) * a.w;
    parts.push(`<line x1="${x1}" y1="${y}" x2="${x1}" y2="${y + h}" stroke="${LOOK.grid}" stroke-width="0.7"/>`);
    parts.push(`<text x="${(x1 + x2) / 2}" y="${y - 4}" text-anchor="middle" font-size="8.5" fill="${LOOK.muted}">${MONTHS[dt.getUTCMonth()]}</text>`);
    if (withYear && dt.getUTCFullYear() !== lastYear) {
      lastYear = dt.getUTCFullYear();
      parts.push(`<text x="${x1 + 2}" y="${y - 15}" font-size="10" font-weight="bold" fill="${LOOK.wine}">${lastYear}</text>`);
    }
    d = next;
  }
  parts.push(`<line x1="${a.x0 + a.w}" y1="${y}" x2="${a.x0 + a.w}" y2="${y + h}" stroke="${LOOK.grid}" stroke-width="0.7"/>`);
  return parts.join('');
}
const diamond = (x: number, y: number, r: number, fill: string) => `<path d="M${x} ${y - r}L${x + r} ${y}L${x} ${y + r}L${x - r} ${y}Z" fill="${fill}" stroke="#3a0607" stroke-width="0.6"/>`;

/** Phasenplan (Abb. 9): Phasen als Treppe über den Monaten, Meilensteine als Raute mit Kürzel und Datum, unten Projektmonate. */
export function phasePlanSvg(ws: Workspace, pid: string, g: Gantt = ganttOf(ws, pid)): string {
  const p = projectById(ws, pid);
  const bars = phaseBars(ws, pid, g);
  if (!p || !bars.length) return '';
  const ms = g.rows.filter((r) => r.planned && r.node.milestone);
  const start = [...bars.map((b) => b.start), ...ms.map((m) => m.start)].sort()[0];
  const end = [...bars.map((b) => b.end), ...ms.map((m) => m.end)].sort().reverse()[0];
  const width = 760;
  const a = axisOf(start, end, 16, width - 32);
  const top = 46;
  const rowH = 34;
  const body = bars.length * rowH + 30;
  const parts: string[] = [monthHeads(a, top, body)];
  bars.forEach((b, i) => {
    const y = top + 10 + i * rowH;
    const x1 = a.x(b.start);
    const x2 = Math.max(x1 + 6, a.x(b.end) + (a.w / (a.d1 - a.d0)));
    parts.push(`<g><title>${esc(`${b.name}: ${dmy(b.start)} – ${dmy(b.end)}`)}</title><rect x="${x1}" y="${y}" width="${x2 - x1}" height="${rowH - 12}" rx="3" fill="url(#fgWine)" stroke="#4a0a0b" stroke-width="0.6" filter="url(#fgShadow)"/>`);
    const label = esc(b.name);
    const fits = (x2 - x1) > b.name.length * 6 + 8;
    parts.push(`<text x="${fits ? x1 + 6 : x2 + 4}" y="${y + (rowH - 12) / 2 + 3.5}" font-size="9.5" font-weight="bold" fill="${fits ? '#fff' : LOOK.wine}">${label}</text></g>`);
  });
  // Meilensteine auf der unteren Linie und an ihrer Phase
  const mY = top + body - 14;
  parts.push(`<line x1="${a.x0}" y1="${mY}" x2="${a.x0 + a.w}" y2="${mY}" stroke="${LOOK.wine}" stroke-width="1.2"/>`);
  ms.forEach((m, i) => {
    const x = a.x(m.start);
    const code = (m.node.title.match(/^M\s?\d+/i)?.[0] ?? `M${i + 1}`).replace(/\s/, '');
    parts.push(`<g><title>${esc(`${m.node.code} ${m.node.title}: ${dmy(m.start)}`)}</title>${diamond(x, mY, 6, m.critical ? LOOK.red : LOOK.orange)}<text x="${x}" y="${mY - 9}" text-anchor="middle" font-size="8.5" font-weight="bold" fill="${LOOK.ink}">${esc(code)}</text><text x="${x}" y="${mY + 16}" text-anchor="middle" font-size="7.5" fill="${LOOK.muted}">${dm(m.start)}</text></g>`);
  });
  // Projektmonate
  const pmY = top + body + 26;
  const months = Math.round((a.d1 - a.d0) / 30.4);
  parts.push(`<rect x="${a.x0}" y="${pmY - 10}" width="${a.w}" height="14" fill="#efefef"/>`);
  for (let k = 0; k < months; k++) parts.push(`<text x="${a.x0 + ((k + 0.5) / months) * a.w}" y="${pmY}" text-anchor="middle" font-size="8.5" fill="${LOOK.ink}">${k + 1}</text>`);
  parts.push(`<text x="${a.x0}" y="${pmY + 14}" font-size="8.5" fill="${LOOK.muted}">Projektmonat · Raute = Meilenstein (rot = auf dem kritischen Pfad)</text>`);
  return svgWrap(width, pmY + 22, `Phasenplan ${p.name}: ${bars.length} Phasen, ${ms.length} Meilensteine, ${dmy(start)} bis ${dmy(end)}`, parts.join(''));
}

/** Vernetzter Balkenplan mit kritischem Pfad (Abb. 13): links Nr., Code, Vorgang, Dauer; rechts Balken je Monat, Pfeile der Abhängigkeiten. */
export function ganttSheetSvg(ws: Workspace, pid: string, g: Gantt = ganttOf(ws, pid)): string {
  const p = projectById(ws, pid);
  const rows = g.rows.filter((r) => r.planned);
  if (!p || !rows.length || !g.start) return '';
  const rowH = 15;
  const colNr = 22;
  const colCode = 52;
  const colName = 190;
  const colDur = 34;
  const left = colNr + colCode + colName + colDur;
  const width = 1080;
  const top = 34;
  const a = axisOf(g.start, g.end, left + 8, width - left - 16);
  const h = rows.length * rowH;
  const parts: string[] = [];
  parts.push(`<rect x="0" y="${top}" width="${left}" height="${h}" fill="#fff" stroke="${LOOK.grid}"/>`);
  const heads: [number, string][] = [[2, 'Nr.'], [colNr + 2, 'Code'], [colNr + colCode + 2, 'Vorgang'], [colNr + colCode + colName + 2, 'Dauer']];
  for (const [x, t] of heads) parts.push(`<text x="${x}" y="${top - 4}" font-size="8.5" font-weight="bold" fill="${LOOK.ink}">${t}</text>`);
  parts.push(monthHeads(a, top, h));
  const yOf = new Map<string, number>();
  rows.forEach((r, i) => {
    const y = top + i * rowH;
    yOf.set(r.id, y + rowH / 2);
    if (i % 2) parts.push(`<rect x="0" y="${y}" width="${width}" height="${rowH}" fill="#000" fill-opacity="0.025"/>`);
    const bold = r.node.summary ? ' font-weight="bold"' : '';
    const ind = Math.min(4, r.node.depth) * 6;
    const nameFill = r.critical && !r.node.summary ? LOOK.wine : LOOK.ink;
    parts.push(`<text x="2" y="${y + 11}" font-size="8" fill="${LOOK.muted}">${r.nr}</text>`);
    parts.push(`<text x="${colNr + 2}" y="${y + 11}" font-size="8" fill="${LOOK.ink}"${bold}>${esc(r.node.code)}</text>`);
    parts.push(`<text x="${colNr + colCode + 2 + ind}" y="${y + 11}" font-size="8" fill="${nameFill}"${bold}><title>${esc(r.node.title)}</title>${esc(wrap(r.node.title, Math.floor((colName - ind) / 4.6), 1)[0])}</text>`);
    parts.push(`<text x="${colNr + colCode + colName + 2}" y="${y + 11}" font-size="8" fill="${LOOK.ink}">${r.node.milestone ? '0 T' : `${r.days} T`}</text>`);
    const x1 = a.x(r.start);
    const x2 = a.x(r.end) + a.w / (a.d1 - a.d0);
    if (r.node.milestone) parts.push(`<g><title>${esc(`${r.node.title}: ${dmy(r.start)}`)}</title>${diamond(x1, y + rowH / 2, 5, r.critical ? LOOK.red : LOOK.ink)}<text x="${x1 + 8}" y="${y + 11}" font-size="7.5" fill="${LOOK.ink}">${dm(r.start)}</text></g>`);
    else if (r.node.summary) parts.push(`<path d="M${x1} ${y + 4}H${x2}V${y + 11}L${x2 - 3} ${y + 8}H${x1 + 3}L${x1} ${y + 11}Z" fill="${LOOK.ink}"><title>${esc(`${r.node.title}: ${dmy(r.start)} – ${dmy(r.end)}`)}</title></path>`);
    else parts.push(`<rect x="${x1}" y="${y + 3}" width="${Math.max(2, x2 - x1)}" height="${rowH - 6}" rx="1.5" fill="${r.critical ? LOOK.red : '#9fb3c8'}" stroke="${r.critical ? '#7a0010' : '#5d738a'}" stroke-width="0.5"><title>${esc(`${r.node.title}: ${dmy(r.start)} – ${dmy(r.end)}${r.critical ? ' · kritisch' : ` · Puffer ${r.float} T`}`)}</title></rect>`);
  });
  // Pfeile: Ende/Anfang je nach Beziehung, rechtwinklig
  const day = a.w / (a.d1 - a.d0);
  for (const ar of g.arrows) {
    const f = g.byId.get(ar.from);
    const t = g.byId.get(ar.to);
    const y1 = yOf.get(ar.from);
    const y2 = yOf.get(ar.to);
    if (!f || !t || y1 === undefined || y2 === undefined) continue;
    const xf = ar.rel[0] === 'A' ? a.x(f.start) : a.x(f.end) + (f.node.milestone ? 0 : day);
    const xt = ar.rel[1] === 'A' ? a.x(t.start) : a.x(t.end) + day;
    const c = ar.critical ? LOOK.red : '#6d6d6d';
    const down = y2 > y1 ? 1 : -1;
    const midX = xf + 4;
    parts.push(`<path d="M${xf} ${y1}H${midX}V${y2 - down * 0}H${xt - 2}" fill="none" stroke="${c}" stroke-width="0.6" stroke-opacity="0.8"/><path d="M${xt - 4} ${y2 - 2.5}L${xt} ${y2}L${xt - 4} ${y2 + 2.5}Z" fill="${c}"/>`);
  }
  const ly = top + h + 16;
  parts.push(`<rect x="${left + 8}" y="${ly - 8}" width="14" height="8" fill="${LOOK.red}"/><text x="${left + 26}" y="${ly}" font-size="8.5" fill="${LOOK.ink}">kritischer Vorgang</text>`);
  parts.push(`<rect x="${left + 120}" y="${ly - 8}" width="14" height="8" fill="#9fb3c8"/><text x="${left + 138}" y="${ly}" font-size="8.5" fill="${LOOK.ink}">Vorgang mit Puffer</text>`);
  parts.push(`${diamond(left + 236, ly - 4, 4.5, LOOK.ink)}<text x="${left + 246}" y="${ly}" font-size="8.5" fill="${LOOK.ink}">Meilenstein</text>`);
  parts.push(`<text x="${left + 320}" y="${ly}" font-size="8.5" fill="${LOOK.muted}">T = Arbeitstage · ${g.critical.length} kritische Vorgänge</text>`);
  return svgWrap(width, ly + 10, `Vernetzter Balkenplan ${p.name}: ${rows.length} Vorgänge, ${g.critical.length} kritisch, ${dmy(g.start)} bis ${dmy(g.end)}`, parts.join(''));
}

// ---------------------------------------------------------------- Auslastungsdiagramm (Abb. 14)

const LOAD_TONES = ['#c0392b', '#2e8b3a', '#e67e22', '#8e44ad', '#2471a3', '#d4ac0d', '#17a589', '#7b1113', '#cb4f9b', '#5d6d7e', '#a04000', '#1f618d'];

/** Ressourcen mit Stunden im Projekt (für die Auswahl am Blatt). */
export function loadPersons(ws: Workspace, pid: string): { id: string; name: string; total: number }[] {
  return resourceUse(ws, pid).rows.filter((r) => r.total > 0).map((r) => ({ id: r.person.id, name: r.person.name, total: r.total }));
}
/** Vorgabe für die Auswahl: Person der Rolle „Projektleitung“, sonst die mit den meisten Stunden. */
export function loadDefault(ws: Workspace, pid: string): string {
  const p = projectById(ws, pid);
  const list = loadPersons(ws, pid);
  const lead = p?.roles?.find((r) => r.id === 'lead' || /projektleit/i.test(r.name))?.person;
  if (lead && list.some((x) => x.id === lead)) return lead;
  return [...list].sort((a, b) => b.total - a.total)[0]?.id ?? '';
}

/** Auslastungsdiagramm einer Ressource: Stunden je Woche als gestapelte Balken je Arbeitspaket, Vorrat (Kapazität) als rote Linie. */
export function loadSvg(ws: Workspace, pid: string, person: string): string {
  const use = resourceUse(ws, pid);
  const row: ResRow | undefined = use.rows.find((r) => r.person.id === person);
  if (!row || !use.weeks.length || row.total <= 0) return '';
  const tasks = row.tasks.filter((t) => t.total > 0);
  const width = 760;
  const pad = { l: 44, r: 16, t: 34, b: 64 };
  const ih = 260;
  const iw = width - pad.l - pad.r;
  const n = use.weeks.length;
  const bw = iw / n;
  const max = Math.max(1, ...row.hours, ...row.capacity) * 1.12;
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const parts: string[] = [];
  parts.push(`<text x="${pad.l + iw / 2}" y="16" text-anchor="middle" font-size="13" font-weight="bold" fill="${LOOK.ink}">Einsatzmittelganglinie ${esc(row.person.name)}</text>`);
  const step = max > 60 ? 10 : max > 24 ? 5 : 2;
  for (let v = 0; v <= max; v += step) {
    parts.push(`<line x1="${pad.l}" y1="${y(v)}" x2="${pad.l + iw}" y2="${y(v)}" stroke="${LOOK.grid}" stroke-width="0.6"/><text x="${pad.l - 4}" y="${y(v) + 3}" text-anchor="end" font-size="8" fill="${LOOK.muted}">${v}</text>`);
  }
  parts.push(`<text x="10" y="${pad.t + ih / 2}" text-anchor="middle" font-size="9" fill="${LOOK.ink}" transform="rotate(-90 10 ${pad.t + ih / 2})">Stunden je Woche</text>`);
  for (let i = 0; i < n; i++) {
    let acc = 0;
    tasks.forEach((t, k) => {
      const v = t.hours[i] ?? 0;
      if (v <= 0) return;
      parts.push(`<rect x="${pad.l + i * bw + 0.5}" y="${y(acc + v)}" width="${Math.max(1, bw - 1)}" height="${y(acc) - y(acc + v)}" fill="${LOAD_TONES[k % LOAD_TONES.length]}" fill-opacity="0.85"><title>${esc(`${t.code} ${t.title}: ${v.toLocaleString('de-DE')} h in KW ab ${dmy(use.weeks[i])}`)}</title></rect>`);
      acc += v;
    });
    if (acc > (row.capacity[i] ?? 0) + 0.01) parts.push(`<rect x="${pad.l + i * bw}" y="${y(acc)}" width="${bw}" height="${y(row.capacity[i] ?? 0) - y(acc)}" fill="none" stroke="${LOOK.ink}" stroke-width="1.2"/>`);
  }
  // Vorrat als rote Stufenlinie, Summe als schwarze Linie
  const cap = row.capacity.map((c, i) => `${i ? 'H' : `M${pad.l} ${y(c)}H`}${pad.l + (i + 1) * bw}${i < n - 1 ? `V${y(row.capacity[i + 1])}` : ''}`).join('');
  parts.push(`<path d="${cap}" fill="none" stroke="${LOOK.red}" stroke-width="1.6" stroke-dasharray="6 4"/>`);
  const sum = row.hours.map((c, i) => `${i ? 'H' : `M${pad.l} ${y(c)}H`}${pad.l + (i + 1) * bw}${i < n - 1 ? `V${y(row.hours[i + 1])}` : ''}`).join('');
  parts.push(`<path d="${sum}" fill="none" stroke="${LOOK.ink}" stroke-width="1.4"/>`);
  // Monate unten
  let last = '';
  use.weeks.forEach((w, i) => {
    const m = w.slice(0, 7);
    if (m === last) return;
    last = m;
    parts.push(`<line x1="${pad.l + i * bw}" y1="${pad.t + ih}" x2="${pad.l + i * bw}" y2="${pad.t + ih + 6}" stroke="${LOOK.muted}"/><text x="${pad.l + i * bw + 2}" y="${pad.t + ih + 15}" font-size="8" fill="${LOOK.muted}">${MONTHS[Number(w.slice(5, 7)) - 1]} ${w.slice(2, 4)}</text>`);
  });
  parts.push(`<line x1="${pad.l}" y1="${pad.t + ih}" x2="${pad.l + iw}" y2="${pad.t + ih}" stroke="${LOOK.ink}"/>`);
  // Legende
  let lx = pad.l;
  let ly = pad.t + ih + 32;
  const items: [string, string][] = [...tasks.map((t, k): [string, string] => [LOAD_TONES[k % LOAD_TONES.length], t.code || t.title]), [LOOK.red, 'Vorrat (Kapazität)'], [LOOK.ink, 'Bedarf (Summe)']];
  for (const [c, t] of items) {
    const w = 18 + t.length * 5.2;
    if (lx + w > width - 10) (lx = pad.l), (ly += 13);
    parts.push(`<rect x="${lx}" y="${ly - 7}" width="9" height="8" fill="${c}"/><text x="${lx + 12}" y="${ly}" font-size="8" fill="${LOOK.ink}">${esc(t)}</text>`);
    lx += w + 8;
  }
  const over = row.over;
  return svgWrap(width, ly + 10, `Auslastungsdiagramm ${row.person.name}: ${row.total.toLocaleString('de-DE')} h in ${n} Wochen${over ? `, ${over} Wochen über dem Vorrat` : ''}`, parts.join(''));
}

/** Kennung der Grafik eines Formulars (FormDef.figure). */
export type FigureKind = 'goalTree' | 'org' | 'phasePlan' | 'psp' | 'gantt' | 'load';
/** Grafik eines Formulars mit Layout `figure` (leer, wenn noch nichts zu zeichnen ist). */
export function figureSvg(ws: Workspace, pid: string, kind: FigureKind | undefined, o: { person?: string } = {}): string {
  const p = projectById(ws, pid);
  if (!p || !kind) return '';
  switch (kind) {
    case 'goalTree':
      return goalTreeSvg(p);
    case 'org':
      return orgChartSvg(ws, p);
    case 'phasePlan':
      return phasePlanSvg(ws, pid);
    case 'psp':
      return pspSheetSvg(ws, pid);
    case 'gantt':
      return ganttSheetSvg(ws, pid);
    case 'load':
      return loadSvg(ws, pid, o.person || loadDefault(ws, pid));
  }
  return '';
}
