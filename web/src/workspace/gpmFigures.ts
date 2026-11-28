/**
 * F-234 Option A (V135, Doc „F-234 V134 – Fehlende Darstellungen“, D1–D8 wie Vorschlag): Grafiken der Kapitel-Blätter im
 * Aussehen des ColorGentlemen-Reports – weinrote Kästen mit Verlauf, graue Arbeitspakete, Verbindungen als rote Linien,
 * Legende im Kasten. Alles wird aus den vorhandenen Daten gezeichnet (nichts doppelt): Zielhierarchie (Abb. 4) aus den
 * Zielen mit Oberziel, Projektorganisation (Abb. 7) aus den Rollen, Phasenplan (Abb. 9) aus Phasen und Meilensteinen,
 * PSP (Abb. 10) aus dem Projektstrukturplan, vernetzter Balkenplan (Abb. 13) aus dem Gantt, Auslastungsdiagramm mit
 * Einsatzmittelganglinie (Abb. 14) aus den Einsätzen. Reine Funktionen (SVG-Text); dieselben Bausteine zeigen das Blatt
 * (ProjectForms) und der Bericht (gpmReport). Tests in gpm.test.ts („F-234“).
 */
import type { NoteView, Project, ProjectRole, Workspace } from './types';
import { ganttOf, phaseBars, predText, type Gantt } from './gantt';
import { pspRows, pspTree, type PspNode } from './psp';
import { resourceUse, type ResRow } from './resources';
import { personById } from './persons';
import { projectById, rolesOf } from './projects';
import { titleOf, viewById } from './notes';
import { matrixEntries, projectMatrix } from './sheets';
import type { PortfolioDot } from './gpmCalc';

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
export type BoxTone = 'wine' | 'orange' | 'yellow' | 'gray' | 'pale' | 'root' | 'head' | 'sky' | 'steel' | 'slate' | 'white';

const DEFS = `<defs>
<linearGradient id="fgWine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${LOOK.wineHi}"/><stop offset="1" stop-color="${LOOK.wine}"/></linearGradient>
<linearGradient id="fgOrange" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${LOOK.orangeHi}"/><stop offset="1" stop-color="${LOOK.orange}"/></linearGradient>
<linearGradient id="fgYellow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbe0"/><stop offset="1" stop-color="${LOOK.yellow}"/></linearGradient>
<linearGradient id="fgGray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${LOOK.grayHi}"/><stop offset="1" stop-color="${LOOK.gray}"/></linearGradient>
<linearGradient id="fgPale" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#ececec"/></linearGradient>
<linearGradient id="fgSkyBox" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef6ff"/><stop offset="1" stop-color="#c7dcf3"/></linearGradient>
<linearGradient id="fgSteel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dfe5ec"/><stop offset="1" stop-color="#aab6c4"/></linearGradient>
<linearGradient id="fgSlate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7d8a99"/><stop offset="1" stop-color="#44505e"/></linearGradient>
<linearGradient id="fgGloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.38"/><stop offset="1" stop-color="#fff" stop-opacity="0.04"/></linearGradient>
<linearGradient id="fgHead" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5b5b5b"/><stop offset="1" stop-color="#2f2f2f"/></linearGradient>
<radialGradient id="fgDark" cx="0.4" cy="0.3" r="0.8"><stop offset="0" stop-color="#9a9a9a"/><stop offset="1" stop-color="#2a2a2a"/></radialGradient>
<linearGradient id="fgSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fb4e3"/><stop offset="1" stop-color="#d8d8d8"/></linearGradient>
<linearGradient id="fgSun" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fbf59a"/><stop offset="1" stop-color="#d8d8d8"/></linearGradient>
<linearGradient id="fgLeaf" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8fe38f"/><stop offset="1" stop-color="#d8d8d8"/></linearGradient>
<linearGradient id="fgRose" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#ec8f8f"/><stop offset="1" stop-color="#d8d8d8"/></linearGradient>
<filter id="fgShadow" x="-10%" y="-10%" width="130%" height="140%"><feDropShadow dx="1.2" dy="1.6" stdDeviation="1.2" flood-color="#000" flood-opacity="0.28"/></filter>
</defs>`;
const FILL: Record<BoxTone, string> = { wine: 'url(#fgWine)', orange: 'url(#fgOrange)', yellow: 'url(#fgYellow)', gray: 'url(#fgGray)', pale: 'url(#fgPale)', root: 'url(#fgGray)', head: 'url(#fgPale)', sky: 'url(#fgSkyBox)', steel: 'url(#fgSteel)', slate: 'url(#fgSlate)', white: 'url(#fgPale)' };
const TEXT: Record<BoxTone, string> = { wine: '#fff', orange: '#fff', yellow: LOOK.ink, gray: LOOK.wine, pale: LOOK.muted, root: LOOK.wine, head: LOOK.wine, sky: LOOK.ink, steel: LOOK.ink, slate: '#fff', white: LOOK.ink };
const STROKE: Record<BoxTone, string> = { wine: '#4a0a0b', orange: '#9b5310', yellow: '#b8a845', gray: LOOK.grayLine, pale: '#bdbdbd', root: LOOK.grayLine, head: LOOK.wine, sky: '#2b2b2b', steel: '#2b2b2b', slate: '#1d242c', white: '#2b2b2b' };
/** V142: Glanz oben auf den farbigen Kästen wie im Report. */
const GLOSS: Partial<Record<BoxTone, boolean>> = { wine: true, orange: true, slate: true };
/** V142 (Report): Schrift in den Kästen fett wie in Abb. 4/7/10 – außer bei blassen Kästen (Nichtziele). */
const BOLD_ALL: Partial<Record<BoxTone, boolean>> = { wine: true, orange: true, yellow: true, gray: true, head: true, sky: true, steel: true, slate: true, white: true };

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
  /** V137 (Bearbeiten im Blatt): „Formular:Zeile“ – Kasten anklickbar, bearbeitbar und von Hand verschiebbar (D3) */
  edit?: string;
  /** V142 (Abb. 7): erste Zeile groß (Name), übrige Zeilen in `accent` (z. B. Projektleitung rot), Reiter über dem Kasten */
  big?: boolean;
  accent?: string;
  tab?: string;
}
/** D3: Versatz der Kästen der gerade gezeichneten Grafik (Project.figLayout[fig]). */
let OFF: Record<string, { dx: number; dy: number }> = {};
const offOf = (b: Box) => (b.edit ? OFF[b.edit] : undefined) ?? { dx: 0, dy: 0 };
const LH = 11;
const boxH = (b: Box) => 10 + b.lines.length * LH + (b.big ? 5 : 0);
function drawBox(x0: number, y0: number, w: number, b: Box, fs = 9): string {
  const h = boxH(b);
  const { dx, dy } = offOf(b);
  const x = x0 + dx;
  const y = y0 + dy;
  const t = TEXT[b.tone];
  const tx = b.lines
    .map((l, i) => `<text x="${x + w / 2}" y="${y + 13 + i * LH + (b.big ? (i ? 5 : 2) : 0)}" text-anchor="middle" font-size="${b.big && !i ? fs + 4 : fs}" font-weight="${i === 0 || b.bold || BOLD_ALL[b.tone] ? 'bold' : 'normal'}" fill="${i && b.accent ? b.accent : t}">${esc(l)}</text>`)
    .join('');
  const tab = b.tab ? `<rect x="${x + 6}" y="${y - 13}" width="${w - 12}" height="14" rx="3" fill="url(#fgPale)" stroke="${LOOK.grayLine}" stroke-width="0.8"/><text x="${x + w / 2}" y="${y - 2.5}" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#9a9a9a">${esc(b.tab)}</text>` : '';
  const ed = b.edit ? ` class="fg-edit" data-edit="${esc(b.edit)}" tabindex="0" role="button" aria-label="${esc(`Bearbeiten: ${b.title ?? b.lines.join(' ')}`)}"` : '';
  return `<g${ed}>${b.title ? `<title>${esc(b.title)}</title>` : ''}<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${FILL[b.tone]}" stroke="${STROKE[b.tone]}" stroke-width="0.8" filter="url(#fgShadow)"/>${tab}${GLOSS[b.tone] ? `<rect x="${x + 1.5}" y="${y + 1}" width="${w - 3}" height="${Math.min(h / 2, 9)}" rx="3" fill="url(#fgGloss)"/>` : ''}${tx}</g>`;
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
/** Wurzel oben, darunter eine Reihe von Spaltenköpfen; Kinder stehen untereinander an einer Linie links (wie Abb. 4/10).
 *  V142 (Report): Wurzel mit großem Projektnamen, Untertitel fett weinrot, Projektnummer; Legende in der freien Fläche
 *  unter der kürzesten Spalte (wie Abb. 4/10), nur wenn dort kein Platz ist unten rechts. */
export function columnTreeSvg(root: Box, columns: TreeColumn[], o: { label: string; legend?: [BoxTone, string][]; colW?: number; chars?: number; code?: string; sub?: string[] }): string {
  const colW = o.colW ?? 124;
  const gap = 14;
  const n = Math.max(1, columns.length);
  const width = Math.max(420, n * (colW + gap) + gap);
  const parts: string[] = [];
  const rootW = Math.min(width - 40, 380);
  const rootX = (width - rootW) / 2;
  const sub = o.sub ?? root.lines.slice(1);
  const rh = 36 + sub.length * 12 + (o.code ? 15 : 0);
  {
    const ro = offOf(root);
    const x = rootX + ro.dx;
    const y = 8 + ro.dy;
    const ed = root.edit ? ` class="fg-edit" data-edit="${esc(root.edit)}" tabindex="0" role="button" aria-label="${esc(`Bearbeiten: ${root.title ?? root.lines[0]}`)}"` : '';
    parts.push(`<g${ed}>${root.title ? `<title>${esc(root.title)}</title>` : ''}<rect x="${x}" y="${y}" width="${rootW}" height="${rh}" rx="6" fill="url(#fgGray)" stroke="#555" stroke-width="1.4" filter="url(#fgShadow)"/>`);
    parts.push(`<text x="${x + rootW / 2}" y="${y + 25}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="19" font-weight="bold" fill="#2b2b2b">${esc(root.lines[0])}</text>`);
    sub.forEach((l, i) => parts.push(`<text x="${x + rootW / 2}" y="${y + 41 + i * 12}" text-anchor="middle" font-size="9.5" font-weight="bold" fill="${LOOK.wine}">${esc(l)}</text>`));
    if (o.code) parts.push(`<text x="${x + rootW / 2}" y="${y + 41 + sub.length * 12 + 3}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="12" font-weight="bold" fill="#2b2b2b">${esc(o.code)}</text>`);
    parts.push('</g>');
  }
  const busY = 8 + rh + 14;
  const headY = busY + 12;
  parts.unshift(`<line x1="${width / 2}" y1="${8 + rh}" x2="${width / 2}" y2="${busY}" stroke="${LOOK.wine}" stroke-width="1.6"/>`);
  const cx = (i: number) => gap + i * (colW + gap);
  if (columns.length > 1) parts.unshift(`<line x1="${cx(0) + colW / 2}" y1="${busY}" x2="${cx(columns.length - 1) + colW / 2}" y2="${busY}" stroke="${LOOK.wine}" stroke-width="1.6"/>`);
  let bottom = headY;
  const bottoms: number[] = [];
  columns.forEach((c, i) => {
    const x = cx(i);
    const ho = offOf(c.head);
    parts.push(`<line x1="${x + colW / 2}" y1="${busY}" x2="${x + colW / 2 + ho.dx}" y2="${headY + ho.dy}" stroke="${LOOK.wine}" stroke-width="1.6"/>`);
    parts.push(drawBox(x, headY, colW, c.head));
    let y = headY + boxH(c.head) + 12;
    const lineX = x + 4;
    let lastMid = -1;
    for (const it of c.items) {
      const ind = 10 + it.depth * 8;
      const w = colW - ind;
      const h = boxH(it.box);
      const io = offOf(it.box);
      parts.push(`<line x1="${lineX}" y1="${y + h / 2}" x2="${x + ind + io.dx}" y2="${y + h / 2 + io.dy}" stroke="${LOOK.wine}" stroke-width="1.4"/>`);
      parts.push(drawBox(x + ind, y, w, it.box));
      lastMid = y + h / 2;
      y += h + 9;
    }
    if (lastMid > 0) parts.unshift(`<line x1="${lineX}" y1="${headY + boxH(c.head) / 2}" x2="${lineX}" y2="${lastMid}" stroke="${LOOK.wine}" stroke-width="1.4"/>`);
    bottoms.push(y);
    bottom = Math.max(bottom, y);
  });
  let height = bottom + 6;
  if (o.legend?.length) {
    const lh = 22 + o.legend.length * 18;
    // freie Fläche: Spalte mit dem kürzesten Inhalt, in die die Legende unterhalb passt (nicht die erste/letzte, wenn es geht)
    const order = bottoms.map((b, i) => ({ b, i })).filter(({ b }) => b + 14 + lh <= bottom).sort((p, q) => p.b - q.b || Math.abs(p.i - (n - 1) / 2) - Math.abs(q.i - (n - 1) / 2));
    const spot = order[0];
    if (spot) parts.push(legend(cx(spot.i) + Math.max(0, (colW - 116) / 2), spot.b + 14, o.legend));
    else {
      parts.push(legend(width - 130, height, o.legend));
      height += lh + 8;
    }
  }
  return svgWrap(width, height, o.label, parts.join(''));
}

// ---------------------------------------------------------------- Zielhierarchie (Abb. 4)

const toneOfLevel = (lv?: string, kind?: string): BoxTone => (kind === 'non' ? 'pale' : lv === 'should' ? 'orange' : lv === 'can' ? 'yellow' : 'wine');
const goalLines = (code: string | undefined, text: string, chars: number) => [...(code ? [code] : []), ...wrap(text.split('\n')[0].replace(/v\. B\./g, 'v.B.'), chars, 3)];

/** Zielhierarchie: oberste Leistungsziele je eine Spalte (mit Unterzielen), dazu Spalten „Soziale Ziele“ und „Nichtziele“. */
export function goalTreeSvg(p: Project): string {
  OFF = p.figLayout?.goalTree ?? {};
  const goals = p.goals ?? [];
  if (!goals.length) return '';
  const ids = new Set(goals.map((g) => g.id));
  const kids = (id: string) => goals.filter((g) => g.parent === id);
  const top = goals.filter((g) => !g.parent || !ids.has(g.parent));
  const chars = 19;
  const columns: TreeColumn[] = [];
  const walk = (id: string, depth: number, into: TreeColumn['items']) => {
    for (const k of kids(id)) {
      into.push({ depth, box: { lines: goalLines(k.code, k.text, chars - depth), tone: toneOfLevel(k.level, k.kind), title: [k.code, k.text, k.measure].filter(Boolean).join(' – '), edit: `${k.kind === 'non' ? 'nongoals' : 'goals'}:${k.id}` } });
      walk(k.id, depth + 1, into);
    }
  };
  const loose: TreeColumn['items'] = [];
  for (const g of top.filter((x) => (x.kind ?? 'perf') === 'perf')) {
    if (!kids(g.id).length) {
      loose.push({ depth: 0, box: { lines: goalLines(g.code, g.text, chars), tone: toneOfLevel(g.level, g.kind), title: g.text, edit: `goals:${g.id}` } });
      continue;
    }
    const items: TreeColumn['items'] = [];
    walk(g.id, 0, items);
    columns.push({ head: { lines: goalLines(g.code, g.text, chars), tone: 'head', title: g.text, edit: `goals:${g.id}` }, items });
  }
  if (loose.length) columns.push({ head: { lines: ['L', 'Leistungsziele'], tone: 'head' }, items: loose });
  for (const [kind, code, name] of [['social', 'S', 'Soziale Ziele'], ['non', 'N', 'Nichtziele']] as const) {
    const list = top.filter((x) => x.kind === kind);
    if (!list.length) continue;
    const items: TreeColumn['items'] = [];
    for (const g of list) {
      items.push({ depth: 0, box: { lines: goalLines(g.code, g.text, chars), tone: kind === 'non' ? 'pale' : toneOfLevel(g.level, g.kind), title: g.text, edit: `${kind === 'non' ? 'nongoals' : 'goals'}:${g.id}` } });
      walk(g.id, 1, items);
    }
    columns.push({ head: { lines: [code, name], tone: kind === 'non' ? 'pale' : 'head' }, items });
  }
  // V142 (Report Abb. 4): Reihenfolge Leistungsziele · Soziale Ziele · Termine · Kosten · Nichtziele
  const rank = (c: TreeColumn) => {
    const code = c.head.lines[0] ?? '';
    return code === 'N' ? 4 : code === 'S' ? 1 : /^T\d*$/.test(code) ? 2 : /^K\d*$/.test(code) ? 3 : 0;
  };
  columns.sort((x, y) => rank(x) - rank(y));
  const sub = p.brief?.goal ?? '';
  return columnTreeSvg({ lines: [p.name], tone: 'root', title: p.name, edit: `charter:${p.id}` }, columns, {
    label: `Zielhierarchie ${p.name}: ${goals.length} Ziele in ${columns.length} Gruppen`,
    legend: [['wine', 'MUSS'], ['orange', 'SOLL'], ['yellow', 'KANN']],
    sub: sub ? wrap(sub.split('\n')[0], 70, 2) : [],
  });
}


// ---------------------------------------------------------------- PSP (Abb. 10)

/** Codierter PSP: Projekt oben, Teilaufgaben der ersten Ebene als Spalten, darunter Teilaufgaben und Arbeitspakete. */
export function pspSheetSvg(ws: Workspace, pid: string): string {
  const p = projectById(ws, pid);
  const tree = pspTree(ws, pid);
  if (!p || !tree.length) return '';
  OFF = p.figLayout?.psp ?? {};
  const chars = 18;
  const lines = (n: PspNode, c = chars) => [...wrap(n.title, c, 3), n.code];
  // Meilensteine gehören in den Phasen- und Balkenplan, nicht in den PSP (wie Abb. 10 im Report)
  const columns: TreeColumn[] = tree.filter((t) => !t.milestone).map((top) => {
    const items: TreeColumn['items'] = [];
    const walk = (n: PspNode, depth: number) => {
      for (const k of n.children.filter((c) => !c.milestone)) {
        items.push({ depth, box: { lines: lines(k, chars - depth), tone: k.summary ? 'wine' : 'gray', title: `${k.code} ${k.title}`, ...(k.kind === 'task' && k.owner === pid ? { edit: `tasks:${k.id}` } : {}) } });
        walk(k, depth + 1);
      }
    };
    walk(top, 0);
    return { head: { lines: lines(top), tone: top.summary ? 'wine' : 'gray', bold: true, title: `${top.code} ${top.title}`, ...(top.kind === 'task' && top.owner === pid ? { edit: `tasks:${top.id}` } : {}) }, items };
  });
  const no = p.charter?.no ?? '';
  const sub = p.brief?.goal ?? '';
  return columnTreeSvg({ lines: [p.name], tone: 'root', title: p.name, edit: `charter:${p.id}` }, columns, {
    sub: sub ? wrap(sub, 70, 2) : [],
    code: no,
    label: `Projektstrukturplan ${p.name}: ${columns.length} Teilaufgaben der ersten Ebene`,
    legend: [['root', 'Wurzelelement'], ['wine', 'Teilaufgabe'], ['gray', 'Arbeitspaket']],
  });
}

// ---------------------------------------------------------------- Projektorganisation (Abb. 7)

/**
 * Organigramm wie Abb. 7: Hierarchie aus „Übergeordnete Rolle“ (V137), Stabsstellen seitlich am Stamm, externe Rollen unter
 * der Abgrenzung der Organisation, je Firma untereinander. Linien nach Art der Verbindung: fachliche und disziplinarische
 * Weisung (durchgezogen), fachliche Weisung (gestrichelt), Vertrag (grau gepunktet); Legende rechts. Ohne eingetragene
 * Hierarchie wie bisher: Auftraggeber bzw. Lenkung oben, Projektleitung darunter, das Team unter der Projektleitung.
 */
/**
 * V139: übergeordnete Rolle je Rolle für das Organigramm – eingetragen (`parent`) geht vor, sonst gewohnte Ordnung:
 * Auftraggeber/Lenkung oben, Projektleitung darunter, übrige darunter. Kreise werden aufgelöst (die Rolle, an der
 * sich der Kreis schließt, steht dann oben), damit keine Rolle aus dem Bild fällt.
 */
export function orgParents(roles: readonly ProjectRole[]): Map<string, string | undefined> {
  const isTop = (n: string) => /auftrag|lenk|steuer|geschäftsf|sponsor/i.test(n);
  const isLead = (r: ProjectRole) => r.id === 'lead' || /projektleit/i.test(r.name);
  const byId = new Map(roles.map((r) => [r.id, r]));
  const lead = roles.find(isLead);
  const tops = roles.filter((r) => r !== lead && isTop(r.name));
  const out = new Map<string, string | undefined>();
  for (const r of roles) {
    const auto = r === lead ? tops[0]?.id : tops.includes(r) ? (r === tops[0] ? undefined : tops[0].id) : lead?.id ?? tops[0]?.id;
    const set = r.parent && r.parent !== r.id && byId.has(r.parent) ? r.parent : undefined;
    out.set(r.id, set ?? (auto === r.id ? undefined : auto));
  }
  // Kreise lösen: zuerst gewohnte (nicht eingetragene) Verbindungen kappen, sonst die eingetragene
  for (const r of roles) {
    const path: string[] = [];
    let cur: string | undefined = r.id;
    while (cur && !path.includes(cur)) {
      path.push(cur);
      cur = out.get(cur);
    }
    if (!cur) continue;
    const loop = path.slice(path.indexOf(cur));
    const cut = loop.find((id) => !byId.get(id)?.parent) ?? loop[0];
    out.set(cut, undefined);
  }
  return out;
}

/** V142 (Abb. 7): Name kurz (ohne „– Funktion“ und Klammern, „n. N.“ bleibt), Rolle kurz (Klammer weg; „Auftraggeber (X)“ → Reiter
 *  „Auftraggeber“, Rolle X). Ohne Person: „Name – Rolle“ aus dem Rollennamen. */
export function orgLabel(roleName: string, person: string): { name: string; role: string; tab?: string } {
  let name = person;
  let role = roleName.trim();
  if (!name) {
    const m = role.split(/\s+[–-]\s+/);
    if (m.length > 1) [name, role] = [m[0], m.slice(1).join(' – ')];
  }
  const nn = /n\.\s?N\./i.test(name) ? 'n. N.' : '';
  name = nn || name.split(/\s+[–-]\s+/)[0].replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  let tab: string | undefined;
  const inner = role.match(/\(([^)]+)\)/)?.[1];
  const outer = role.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  if (/^auftraggeber/i.test(outer) && inner) [tab, role] = ['Auftraggeber', inner];
  else if (outer) role = outer;
  if (!name) [name, role] = [role, ''];
  return { name, role, ...(tab ? { tab } : {}) };
}

export function orgChartSvg(ws: Workspace, p: Project): string {
  const roles = p.roles ?? [];
  if (!roles.length) return '';
  OFF = p.figLayout?.org ?? {};
  const who = (id?: string) => (id ? personById(ws, id)?.name ?? '' : '');
  const isLead = (r: ProjectRole) => r.id === 'lead' || /projektleit/i.test(r.name);
  const byId = new Map(roles.map((r) => [r.id, r]));
  // V139 (Enrico 13:48): je Rolle – eingetragene „Übergeordnete Rolle“ geht vor, alle anderen behalten die gewohnte
  // Ordnung (Auftraggeber bzw. Lenkung oben, Projektleitung darunter, Team darunter). Vorher fiel die gewohnte Ordnung
  // für alle weg, sobald eine einzige Rolle einen Eintrag hatte – die Kästen sprangen auseinander.
  const parentOf = orgParents(roles);
  const ext = (r: ProjectRole) => r.kind === 'external';
  const internal = roles.filter((r) => !ext(r));
  const kidsOf = (id: string) => internal.filter((r) => parentOf.get(r.id) === id && r.kind !== 'staff');
  const staffOf = (id: string) => internal.filter((r) => parentOf.get(r.id) === id && r.kind === 'staff');
  const roots = internal.filter((r) => { const up = parentOf.get(r.id); return !up || ext(byId.get(up)!) || (r.kind === 'staff' && !internal.some((x) => x.id === up)); });
  const BW = 150;
  const GX = 22;
  // V142 (Report Abb. 7): intern weinrot mit Name groß und kurzer Rolle, Projektleitung rot, Auftraggeber als Reiter;
  // extern je Firma eine eigene Farbe (weiß, hellblau, stahlblau, schiefer)
  const EXT_TONES: BoxTone[] = ['white', 'sky', 'steel', 'slate'];
  const extOrgs = [...new Set(roles.filter(ext).map((r) => r.org || r.id))];
  const toneOf = (r: ProjectRole): BoxTone => (ext(r) ? EXT_TONES[extOrgs.indexOf(r.org || r.id) % EXT_TONES.length] : 'wine');
  const boxOf = (r: ProjectRole): Box => {
    const n = orgLabel(r.name, who(r.person));
    return { lines: [...wrap(n.name, 20, 1), ...wrap(n.role, 26, 2), ...(ext(r) && r.org ? wrap(r.org, 26, 1) : [])], tone: toneOf(r), big: true, ...(isLead(r) ? { accent: '#ff7a7a' } : {}), ...(n.tab ? { tab: n.tab } : {}), title: [r.name, who(r.person), r.org].filter(Boolean).join(': '), edit: `roles:${r.id}` };
  };
  const widthOf = (r: ProjectRole, seen = new Set<string>()): number => {
    if (seen.has(r.id)) return BW;
    seen.add(r.id);
    const k = kidsOf(r.id);
    const kw = k.reduce((a, c) => a + widthOf(c, seen), 0) + GX * Math.max(0, k.length - 1);
    return Math.max(BW, kw, staffOf(r.id).length ? 2 * (BW + 18) : 0);
  };
  // 1. Lage berechnen (ohne Versatz)
  const at = new Map<string, { x: number; y: number; h: number }>();
  const place = (r: ProjectRole, x0: number, y: number, seen: Set<string>): number => {
    if (seen.has(r.id)) return y;
    seen.add(r.id);
    const w = widthOf(r);
    const cx = x0 + w / 2;
    const b = boxOf(r);
    at.set(r.id, { x: cx - BW / 2, y, h: boxH(b) });
    let yy = y + boxH(b) + 14;
    for (const s of staffOf(r.id)) {
      const sb = boxOf(s);
      at.set(s.id, { x: cx + 18, y: yy, h: boxH(sb) });
      yy += boxH(sb) + 10;
    }
    let bottom = yy;
    const k = kidsOf(r.id);
    if (k.length) {
      const cy = yy + 22;
      const kw = k.reduce((a, c) => a + widthOf(c), 0) + GX * (k.length - 1);
      let x = cx - kw / 2;
      for (const c of k) {
        bottom = Math.max(bottom, place(c, x, cy, seen));
        x += widthOf(c) + GX;
      }
    }
    return bottom;
  };
  const left = 24;
  let x = left;
  let bottom = 10;
  const seen = new Set<string>();
  for (const r of roots) {
    bottom = Math.max(bottom, place(r, x, 26, seen));
    x += widthOf(r) + GX * 2;
  }
  let width = Math.max(x, 560);
  // Externe: unter der Abgrenzung, je Firma eine Spalte
  const exts = roles.filter(ext);
  const groups: ProjectRole[][] = [];
  for (const r of exts) {
    const g = groups.find((list) => (r.org && list[0].org === r.org) || list.some((y) => y.id === parentOf.get(r.id)));
    if (g) g.push(r);
    else groups.push([r]);
  }
  const sepY = bottom + 26;
  if (groups.length) {
    let gx = left + 130;
    for (const g of groups) {
      let gy = sepY + 44;
      for (const r of g) {
        const b = boxOf(r);
        at.set(r.id, { x: gx, y: gy, h: boxH(b) });
        gy += boxH(b) + 12;
      }
      bottom = Math.max(bottom, gy);
      gx += BW + GX;
    }
    width = Math.max(width, gx);
  }
  // 2. Versatz von Hand (D3) anwenden, dann Linien zwischen den verschobenen Kästen
  const rect = (id: string) => {
    const a = at.get(id)!;
    const o = OFF[`roles:${id}`] ?? { dx: 0, dy: 0 };
    return { x: a.x + o.dx, y: a.y + o.dy, w: BW, h: a.h };
  };
  const STYLE = { full: `stroke="${LOOK.wine}" stroke-width="1.8"`, tech: `stroke="${LOOK.wine}" stroke-width="1.8" stroke-dasharray="7 4"`, contract: `stroke="#8a8a8a" stroke-width="3" stroke-dasharray="3 3"` } as const;
  const linkOf = (r: ProjectRole) => r.link ?? (ext(r) ? 'contract' : r.kind === 'staff' ? 'tech' : 'full');
  const lines: string[] = [];
  const path = (d: string, l: keyof typeof STYLE) => lines.push(`<path d="${d}" fill="none" ${STYLE[l]}/>`);
  for (const r of roles) {
    const up = parentOf.get(r.id);
    if (!up || !at.has(up) || !at.has(r.id)) continue;
    const a = rect(up);
    const b = rect(r.id);
    const pcx = a.x + a.w / 2;
    if (r.kind === 'staff' && !ext(r)) {
      const sy = b.y + b.h / 2;
      path(`M${pcx} ${a.y + a.h}V${sy}H${b.x}`, linkOf(r));
      continue;
    }
    if (ext(r) && ext(byId.get(up)!)) {
      // in der Firma: Klammer links
      path(`M${a.x + 8} ${a.y + a.h}V${b.y + b.h / 2}H${b.x}`, linkOf(r) === 'contract' ? 'full' : linkOf(r));
      continue;
    }
    const ccx = b.x + b.w / 2;
    // externe Verträge links aus dem Kasten heraus, damit sie nicht durch Kästen darunter laufen; Bus knapp über den Kindern (unter Stabsstellen)
    if (ext(r)) path(`M${a.x} ${a.y + a.h / 2}H${a.x - 10}V${sepY + 22}H${ccx}V${b.y}`, linkOf(r));
    else path(`M${pcx} ${a.y + a.h}V${b.y - 12}H${ccx}V${b.y}`, linkOf(r));
  }
  const parts: string[] = [...lines];
  if (groups.length) {
    parts.push(`<line x1="${left}" y1="${sepY}" x2="${width}" y2="${sepY}" stroke="${LOOK.ink}" stroke-width="5" stroke-dasharray="5 9"/>`);
    parts.push(`<text x="${left + 54}" y="${sepY + 60}" text-anchor="middle" font-size="10" font-weight="bold" fill="#9a9a9a">zu koordinierende</text><text x="${left + 54}" y="${sepY + 73}" text-anchor="middle" font-size="10" font-weight="bold" fill="#9a9a9a">externe</text><text x="${left + 54}" y="${sepY + 86}" text-anchor="middle" font-size="10" font-weight="bold" fill="#9a9a9a">Dienstleister</text>`);
  }
  for (const r of roles) {
    const a = at.get(r.id);
    if (a) parts.push(drawBox(a.x, a.y, BW, boxOf(r)));
  }
  // Legende wie im Report
  const lx = width + 16;
  const items: [string, string][] = [['Abgrenzung Organisation', `stroke="${LOOK.ink}" stroke-width="5" stroke-dasharray="5 9"`], ['Vertrag', STYLE.contract], ['fachliche Weisung', STYLE.tech], ['fach. &amp; disz. Weisung', STYLE.full]];
  parts.push(`<rect x="${lx}" y="10" width="190" height="${30 + items.length * 18 + 2 * 18}" fill="#fff" stroke="${LOOK.grayLine}" stroke-width="0.8"/><text x="${lx + 8}" y="26" font-size="10" font-weight="bold" fill="${LOOK.ink}">Legende</text>`);
  items.forEach(([t, st], i) => parts.push(`<text x="${lx + 8}" y="${46 + i * 18}" font-size="9" fill="${LOOK.ink}">${t}</text><line x1="${lx + 128}" y1="${42 + i * 18}" x2="${lx + 182}" y2="${42 + i * 18}" ${st}/>`));
  ([['wine', 'intern'], ['white', 'extern (je Firma)'], ['sky', '']] as [BoxTone, string][]).filter(([, t]) => t).forEach(([tone, t], i) => {
    const y = 46 + (items.length + i) * 18;
    parts.push(`<text x="${lx + 8}" y="${y}" font-size="9" fill="${LOOK.ink}">${t}</text><rect x="${lx + 128}" y="${y - 9}" width="54" height="12" rx="2" fill="${FILL[tone]}" stroke="${STROKE[tone]}"/>`);
  });
  const H = Math.max(bottom + 10, 30 + (items.length + 3) * 18 + 20);
  return svgWrap(lx + 200, H, `Projektorganisation ${p.name}: ${roles.length} Rollen${exts.length ? `, davon ${exts.length} extern` : ''}`, parts.join(''));
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
/** V138 (Enrico 12:59 „Gleiches gilt auch für alle anderen Darstellungen“): Teil einer Grafik am Ort bearbeitbar – „Formular:Zeile[:Feld]“. */
const edg = (key: string, label: string) => ` class="fg-edit" data-edit="${esc(key)}" tabindex="0" role="button" aria-label="${esc(`Bearbeiten: ${label}`)}"`;
/** unsichtbare Trefferfläche (für Klick und Fokus-Rahmen) */
const hit = (x: number, y: number, w: number, h: number) => `<rect class="fg-hit" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(1, w).toFixed(1)}" height="${Math.max(1, h).toFixed(1)}" fill="#fff" fill-opacity="0"/>`;
const diamond = (x: number, y: number, r: number, fill: string) => `<path d="M${x} ${y - r}L${x + r} ${y}L${x} ${y + r}L${x - r} ${y}Z" fill="${fill}" stroke="#3a0607" stroke-width="0.6"/>`;

/** Phasenplan (Abb. 9): Phasen als Treppe über den Monaten, Meilensteine als Raute mit Kürzel und Datum, unten Projektmonate.
 *  V142 (Report): oben Jahresbänder als Pfeil, Meilensteine an ihrer Phase (am Ende der Phase bzw. über der laufenden Phase)
 *  mit gestrichelter Linie nach unten und Datum rot unter dem Pfeil „Projektmonat“. */
export function phasePlanSvg(ws: Workspace, pid: string, g: Gantt = ganttOf(ws, pid)): string {
  const p = projectById(ws, pid);
  const bars = phaseBars(ws, pid, g);
  if (!p || !bars.length) return '';
  const ms = g.rows.filter((r) => r.planned && r.node.milestone);
  const start = [...bars.map((b) => b.start), ...ms.map((m) => m.start)].sort()[0];
  const end = [...bars.map((b) => b.end), ...ms.map((m) => m.end)].sort().reverse()[0];
  const width = 760;
  const a = axisOf(start, end, 16, width - 40);
  const day = a.w / Math.max(1, a.d1 - a.d0);
  const top = 40;
  const rowH = 40;
  const barH = 24;
  const body = bars.length * rowH + 22;
  const axisY = top + body + 8;
  const parts: string[] = [];
  // Jahresbänder (Pfeil) oben
  {
    const y = 8;
    const h = 16;
    const years: { y: number; x1: number; x2: number }[] = [];
    for (let d = a.d0; d < a.d1; ) {
      const dt = new Date(d * 864e5);
      const next = Math.min(a.d1, Math.round(Date.UTC(dt.getUTCFullYear() + 1, 0, 1, 12) / 864e5));
      years.push({ y: dt.getUTCFullYear(), x1: a.x0 + (d - a.d0) * day, x2: a.x0 + (next - a.d0) * day });
      d = next;
    }
    years.forEach((yr, i) => {
      const last = i === years.length - 1;
      const tip = last ? 10 : 0;
      parts.push(`<path d="M${yr.x1 + 1} ${y}H${yr.x2 - 1 - tip}${last ? `L${yr.x2 + 6} ${y + h / 2}L${yr.x2 - 1 - tip} ${y + h}` : `V${y + h}`}H${yr.x1 + 1}Z" fill="url(#fgGray)" stroke="${LOOK.orangeHi}" stroke-width="1"/>`);
      if (yr.x2 - yr.x1 > 34) parts.push(`<text x="${(yr.x1 + yr.x2) / 2}" y="${y + 12}" text-anchor="middle" font-size="11" font-weight="bold" fill="#9a9a9a">${yr.y}</text>`);
      if (i) parts.push(`<line x1="${yr.x1}" y1="${y + h}" x2="${yr.x1}" y2="${axisY + 16}" stroke="#a9a9a9" stroke-width="2"/>`);
    });
    parts.push(`<line x1="${a.x0}" y1="${y + h}" x2="${a.x0}" y2="${axisY + 16}" stroke="${LOOK.orangeHi}" stroke-width="1.2"/>`);
  }
  // Phasen
  const rowY = (i: number) => top + 8 + i * rowH;
  const spans = bars.map((b, i) => {
    const x1 = a.x(b.start);
    const x2 = Math.max(x1 + 6, a.x(b.end) + day);
    return { b, i, x1, x2, y: rowY(i) };
  });
  // Meilensteine: Lage an ihrer Phase
  const near = (d1: string, d2: string) => Math.abs(dayNo(d1) - dayNo(d2)) <= 3;
  const msAt = ms.map((m, k) => {
    const x = a.x(m.start);
    const ending = [...spans].reverse().find((sp) => near(sp.b.end, m.start));
    const running = [...spans].reverse().find((sp) => sp.b.start <= m.start && m.start <= sp.b.end);
    const y = ending ? ending.y + barH + 2 : running ? running.y - 7 : spans[spans.length - 1].y + barH + 12;
    const code = (m.node.title.match(/^M\s?\d+/i)?.[0] ?? m.node.code.match(/M[-\w]*$/)?.[0] ?? `M${k + 1}`).replace(/\s/, '');
    return { m, x, y, code };
  });
  // gestrichelte Linien von den Meilensteinen nach unten
  for (const t of msAt) parts.push(`<line x1="${t.x}" y1="${t.y + 6}" x2="${t.x}" y2="${axisY + 16}" stroke="#a9a9a9" stroke-width="1.3" stroke-dasharray="4 4"/>`);
  for (const { b, x1, x2, y } of spans) {
    parts.push(`<g${edg(`phases:${b.id}`, `Phase ${b.name}`)}><title>${esc(`${b.name}: ${dmy(b.start)} – ${dmy(b.end)}`)}</title><rect x="${x1}" y="${y}" width="${x2 - x1}" height="${barH}" rx="3" fill="url(#fgWine)" stroke="#4a0a0b" stroke-width="0.6" filter="url(#fgShadow)"/><rect x="${x1 + 1.5}" y="${y + 1}" width="${Math.max(0, x2 - x1 - 3)}" height="${barH / 2 - 2}" rx="2" fill="url(#fgGloss)"/>`);
    const fits = x2 - x1 > b.name.length * 5.8 + 10;
    const lines = fits ? [b.name] : wrap(b.name, Math.max(6, Math.floor((x2 - x1 - 8) / 5.6)), 2);
    const inside = fits || (x2 - x1 > 44 && lines.every((l) => l.length * 5.6 + 8 < x2 - x1));
    if (inside) lines.forEach((l, j) => parts.push(`<text x="${x1 + 5}" y="${y + barH - 6 - (lines.length - 1 - j) * 10}" font-size="9" font-weight="bold" fill="#fff">${esc(l)}</text>`));
    else parts.push(`<text x="${x2 + 4}" y="${y + barH / 2 + 3.5}" font-size="9" font-weight="bold" fill="${LOOK.wine}">${esc(b.name)}</text>`);
    parts.push('</g>');
  }
  for (const t of msAt) {
    const own = t.m.node.kind === 'task' && t.m.node.owner === pid;
    parts.push(`<g${own ? edg(`milestones:${t.m.id}`, `Meilenstein ${t.m.node.title}`) : ''}><title>${esc(`${t.m.node.code} ${t.m.node.title}: ${dmy(t.m.start)}`)}</title>${own ? hit(t.x - 12, t.y - 12, 24, 24) : ''}${diamond(t.x, t.y, 6.5, t.m.critical ? LOOK.red : LOOK.orange)}<text x="${t.x + 9}" y="${t.y - 3}" font-size="7.5" font-weight="bold" fill="${LOOK.ink}">${esc(t.code)}</text></g>`);
  }
  // Pfeil „Projektmonat“ mit Monatsnummern, darunter die Daten rot
  const months = Math.max(1, Math.round((a.d1 - a.d0) / 30.4));
  parts.push(`<path d="M${a.x0} ${axisY}H${a.x0 + a.w}L${a.x0 + a.w + 10} ${axisY + 8}L${a.x0 + a.w} ${axisY + 16}H${a.x0}Z" fill="url(#fgGray)" stroke="#bdbdbd" stroke-width="0.6"/>`);
  for (let k = 0; k < months; k++) {
    const x = a.x0 + (k / months) * a.w;
    if (k) parts.push(`<line x1="${x}" y1="${axisY}" x2="${x}" y2="${axisY + 16}" stroke="#fff" stroke-width="1"/>`);
    parts.push(`<text x="${a.x0 + ((k + 0.5) / months) * a.w}" y="${axisY + 12}" text-anchor="middle" font-size="9" font-weight="bold" fill="${LOOK.muted}">${k + 1}</text>`);
  }
  parts.push(`<text x="${a.x0 + 3}" y="${axisY + 26}" font-size="7.5" fill="${LOOK.muted}">Projektmonat</text>`);
  const dates = [...new Set([start, ...msAt.map((t) => t.m.start), end])].sort();
  let lastX = -99;
  for (const d of dates) {
    const x = Math.min(a.x0 + a.w, a.x(d) + (d === end ? day : 0));
    const yy = axisY + 36 + (x - lastX < 26 ? 9 : 0);
    if (x - lastX >= 26) lastX = x;
    parts.push(`<line x1="${x}" y1="${axisY + 18}" x2="${x}" y2="${yy - 8}" stroke="${LOOK.red}" stroke-width="1" stroke-dasharray="1.5 2"/><text x="${x}" y="${yy}" text-anchor="middle" font-size="7.5" font-weight="bold" fill="${LOOK.red}">${dm(d)}</text>`);
  }
  const H = axisY + 58;
  parts.push(`<text x="${a.x0}" y="${H - 4}" font-size="8" fill="${LOOK.muted}">Raute = Meilenstein (rot = auf dem kritischen Pfad)</text>`);
  return svgWrap(width, H, `Phasenplan ${p.name}: ${bars.length} Phasen, ${ms.length} Meilensteine, ${dmy(start)} bis ${dmy(end)}`, parts.join(''));
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
  // V142 (Report Abb. 13): Spalten wie MS Project – Anfang, Ende, Vorgänger
  const colStart = 50;
  const colEnd = 50;
  const colPred = 62;
  const left = colNr + colCode + colName + colDur + colStart + colEnd + colPred;
  const width = 1240;
  const preds = new Map<string, string[]>();
  for (const ar of g.arrows) {
    const f = g.byId.get(ar.from);
    if (f) preds.set(ar.to, [...(preds.get(ar.to) ?? []), predText({ nr: f.nr, rel: ar.rel, lag: ar.lag })]);
  }
  const cStart = colNr + colCode + colName + colDur;
  const top = 34;
  const a = axisOf(g.start, g.end, left + 8, width - left - 16);
  const h = rows.length * rowH;
  const parts: string[] = [];
  parts.push(`<rect x="0" y="${top}" width="${left}" height="${h}" fill="#fff" stroke="${LOOK.grid}"/>`);
  const heads: [number, string][] = [[2, 'Nr.'], [colNr + 2, 'Code'], [colNr + colCode + 2, 'Vorgang'], [colNr + colCode + colName + 2, 'Dauer'], [cStart + 2, 'Anfang'], [cStart + colStart + 2, 'Ende'], [cStart + colStart + colEnd + 2, 'Vorgänger']];
  parts.push(`<rect x="0" y="${top - 14}" width="${left}" height="14" fill="#e6e6e6" stroke="${LOOK.grid}"/>`);
  for (const x of [colNr, colNr + colCode, colNr + colCode + colName, cStart, cStart + colStart, cStart + colStart + colEnd]) parts.push(`<line x1="${x}" y1="${top - 14}" x2="${x}" y2="${top + rows.length * rowH}" stroke="${LOOK.grid}" stroke-width="0.6"/>`);
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
    const own = r.node.kind === 'task' && r.node.owner === pid;
    parts.push(own ? `<g${edg(`${r.node.milestone ? 'milestones' : 'tasks'}:${r.id}`, `${r.node.code} ${r.node.title}`)}>${hit(0, y, width, rowH)}` : '<g>');
    parts.push(`<text x="2" y="${y + 11}" font-size="8" fill="${LOOK.muted}">${r.nr}</text>`);
    parts.push(`<text x="${colNr + 2}" y="${y + 11}" font-size="8" fill="${LOOK.ink}"${bold}>${esc(r.node.code)}</text>`);
    parts.push(`<text x="${colNr + colCode + 2 + ind}" y="${y + 11}" font-size="8" fill="${nameFill}"${bold}><title>${esc(r.node.title)}</title>${esc(wrap(r.node.title, Math.floor((colName - ind) / 4.6), 1)[0])}</text>`);
    parts.push(`<text x="${colNr + colCode + colName + 2}" y="${y + 11}" font-size="8" fill="${LOOK.ink}">${r.node.milestone ? '0 T' : `${r.days} T`}</text>`);
    parts.push(`<text x="${cStart + 2}" y="${y + 11}" font-size="7.5" fill="${LOOK.ink}"${bold}>${dmy(r.start).slice(0, 6)}${r.start.slice(2, 4)}</text><text x="${cStart + colStart + 2}" y="${y + 11}" font-size="7.5" fill="${LOOK.ink}"${bold}>${dmy(r.end).slice(0, 6)}${r.end.slice(2, 4)}</text>`);
    const pt = (preds.get(r.id) ?? []).join('; ');
    if (pt) parts.push(`<text x="${cStart + colStart + colEnd + 2}" y="${y + 11}" font-size="7.5" fill="${LOOK.ink}"><title>${esc(pt)}</title>${esc(pt.length > 13 ? `${pt.slice(0, 12)}…` : pt)}</text>`);
    const x1 = a.x(r.start);
    const x2 = a.x(r.end) + a.w / (a.d1 - a.d0);
    if (r.node.milestone) parts.push(`<g><title>${esc(`${r.node.title}: ${dmy(r.start)}`)}</title>${diamond(x1, y + rowH / 2, 5, r.critical ? LOOK.red : LOOK.ink)}<text x="${x1 + 8}" y="${y + 11}" font-size="7.5" fill="${LOOK.ink}">${dm(r.start)}</text></g>`);
    else if (r.node.summary) parts.push(`<path d="M${x1} ${y + 4}H${x2}V${y + 11}L${x2 - 3} ${y + 8}H${x1 + 3}L${x1} ${y + 11}Z" fill="${LOOK.ink}"><title>${esc(`${r.node.title}: ${dmy(r.start)} – ${dmy(r.end)}`)}</title></path>`);
    else parts.push(`<rect x="${x1}" y="${y + 3}" width="${Math.max(2, x2 - x1)}" height="${rowH - 6}" rx="1.5" fill="${r.critical ? LOOK.red : '#9fb3c8'}" stroke="${r.critical ? '#7a0010' : '#5d738a'}" stroke-width="0.5"><title>${esc(`${r.node.title}: ${dmy(r.start)} – ${dmy(r.end)}${r.critical ? ' · kritisch' : ` · Puffer ${r.float} T`}`)}</title></rect>`);
    parts.push('</g>');
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

const MONTH_FULL = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
/** V142: Wochen (Montag) zu Monaten – eine Woche zählt zu dem Monat, in dem ihr Mittwoch liegt. */
export function weeksToMonths(weeks: readonly string[]): { months: string[]; of: number[] } {
  const months: string[] = [];
  const of = weeks.map((w) => {
    const d = new Date(`${w}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 2);
    const m = d.toISOString().slice(0, 7);
    if (months[months.length - 1] !== m) months.push(m);
    return months.length - 1;
  });
  return { months, of };
}

/** Auslastungsdiagramm einer Ressource (Abb. 14): Menge Ph je Monat als gestapelte Säulen je Arbeitspaket (Kürzel in der
 *  Säule), Vorrat rot gestrichelt, Bedarf als dicke schwarze Stufenlinie, graue Fläche mit weißem Raster, unten
 *  Monatsnamen und Pfeil „Projektmonat“ (V142 wie im Report; vorher je Woche). */
export function loadSvg(ws: Workspace, pid: string, person: string): string {
  const use = resourceUse(ws, pid);
  const row: ResRow | undefined = use.rows.find((r) => r.person.id === person);
  if (!row || !use.weeks.length || row.total <= 0) return '';
  const tasks = row.tasks.filter((t) => t.total > 0);
  const { months, of } = weeksToMonths(use.weeks);
  const n = months.length;
  const sumBy = (vals: readonly number[]) => {
    const out = months.map(() => 0);
    vals.forEach((v, i) => (out[of[i]] += v));
    return out.map((v) => Math.round(v * 10) / 10);
  };
  const hours = sumBy(row.hours);
  const cap = sumBy(row.capacity);
  const per = tasks.map((t) => sumBy(t.hours));
  const width = 760;
  const pad = { l: 46, r: 46, t: 40, b: 62 };
  const ih = 300;
  const iw = width - pad.l - pad.r;
  const bw = iw / n;
  const max = Math.max(1, ...hours, ...cap) * 1.1;
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const parts: string[] = [];
  parts.push(`<rect x="${pad.l}" y="${pad.t - 30}" width="${iw}" height="${ih + 30}" fill="#c4c4c4"/>`);
  parts.push(`<rect x="${pad.l}" y="${pad.t - 30}" width="${iw}" height="26" fill="url(#fgPale)"/>`);
  parts.push(`<text x="${pad.l + iw / 2}" y="${pad.t - 11}" text-anchor="middle" font-size="16" font-weight="bold" fill="#9a9a9a">Einsatzmittelganglinie ${esc(row.person.name.split(/\s+[–-]\s+/)[0])}</text>`);
  const step = [5, 10, 20, 25, 50, 100, 200, 250, 500].find((s) => max / s <= 12) ?? 1000;
  for (let v = 0; v <= max; v += step) {
    parts.push(`<line x1="${pad.l}" y1="${y(v)}" x2="${pad.l + iw}" y2="${y(v)}" stroke="#fff" stroke-width="${v ? 1.4 : 0}"/><text x="${pad.l - 5}" y="${y(v) + 3}" text-anchor="end" font-size="7.5" font-weight="bold" fill="${LOOK.ink}">${v}</text><text x="${pad.l + iw + 5}" y="${y(v) + 3}" font-size="7.5" font-weight="bold" fill="${LOOK.ink}">${v}</text>`);
  }
  parts.push(`<text x="4" y="${pad.t - 22}" font-size="7.5" font-weight="bold" fill="${LOOK.ink}">Menge Ph</text><text x="${width - 4}" y="${pad.t - 22}" text-anchor="end" font-size="7.5" font-weight="bold" fill="${LOOK.ink}">Menge Ph</text>`);
  const unlabeled = new Set<number>();
  const labeled = new Set<number>();
  for (let i = 0; i < n; i++) {
    let acc = 0;
    const x = pad.l + i * bw;
    per.forEach((vals, k) => {
      const v = vals[i];
      if (v <= 0) return;
      const t = tasks[k];
      const y1 = y(acc + v);
      const h = y(acc) - y1;
      parts.push(`<rect x="${x + 1}" y="${y1}" width="${Math.max(1, bw - 2)}" height="${h}" fill="${LOAD_TONES[k % LOAD_TONES.length]}"><title>${esc(`${t.code} ${t.title}: ${v.toLocaleString('de-DE')} Ph im ${MONTH_FULL[Number(months[i].slice(5, 7)) - 1]} ${months[i].slice(0, 4)}`)}</title></rect>`);
      const label = t.code || t.title;
      if (h >= 11 && bw >= label.length * 5 + 6) parts.push(`<text x="${x + 6}" y="${y1 + Math.min(h / 2 + 3.5, 13)}" font-size="${h >= 16 ? 9 : 7.5}" font-weight="bold" fill="#fff" pointer-events="none">${esc(label)}</text>`), labeled.add(k);
      else unlabeled.add(k);
      acc += v;
    });
  }
  // Vorrat rot gestrichelt, Bedarf dicke schwarze Stufenlinie
  const stepPath = (vals: number[]) => vals.map((c, i) => `${i ? `V${y(c)}H` : `M${pad.l} ${y(c)}H`}${pad.l + (i + 1) * bw}`).join('');
  parts.push(`<path d="${stepPath(cap)}" fill="none" stroke="${LOOK.red}" stroke-width="2.4" stroke-dasharray="7 5"/>`);
  parts.push(`<path d="${stepPath(hours)}V${y(0)}" fill="none" stroke="#000" stroke-width="3.2"/>`);
  months.forEach((m, i) => parts.push(`<text x="${pad.l + (i + 0.5) * bw}" y="${pad.t + ih + 13}" text-anchor="middle" font-size="8" font-weight="bold" fill="${LOOK.ink}">${MONTH_FULL[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}</text>`));
  const ay = pad.t + ih + 22;
  parts.push(`<path d="M${pad.l} ${ay}H${pad.l + iw}L${pad.l + iw + 10} ${ay + 8}L${pad.l + iw} ${ay + 16}H${pad.l}Z" fill="url(#fgGray)"/><text x="${pad.l + 6}" y="${ay + 12}" font-size="9" font-weight="bold" fill="${LOOK.muted}">Projektmonat</text>`);
  // Legende: Linien und nur die Kürzel, die nicht in ihre Säule passten
  let lx = pad.l;
  let ly = ay + 32;
  const items: [string, string, boolean][] = [[LOOK.red, 'Vorrat (Kapazität)', true], ['#000', 'Bedarf (Summe)', true], ...[...unlabeled].filter((k) => !labeled.has(k)).map((k): [string, string, boolean] => [LOAD_TONES[k % LOAD_TONES.length], tasks[k].code || tasks[k].title, false])];
  for (const [c, t, line] of items) {
    const w = 18 + t.length * 5.2;
    if (lx + w > width - 10) (lx = pad.l), (ly += 13);
    parts.push(`${line ? `<line x1="${lx}" y1="${ly - 3}" x2="${lx + 12}" y2="${ly - 3}" stroke="${c}" stroke-width="2.4"${c === LOOK.red ? ' stroke-dasharray="4 2"' : ''}/>` : `<rect x="${lx}" y="${ly - 7}" width="9" height="8" fill="${c}"/>`}<text x="${lx + 15}" y="${ly}" font-size="8" fill="${LOOK.ink}">${esc(t)}</text>`);
    lx += w + 10;
  }
  const over = hours.filter((h, i) => h > cap[i] + 0.01).length;
  return svgWrap(width, ly + 10, `Auslastungsdiagramm ${row.person.name}: ${row.total.toLocaleString('de-DE')} Ph in ${n} Monaten${over ? `, ${over} Monate über dem Vorrat` : ''}`, parts.join(''));
}

// ---------------------------------------------------------------- F-234 (V137): AP-Statusbericht wie Abb. 15

/** ISO-Kalenderwoche eines Tags. */
export function isoWeek(d: string): number {
  const t = new Date(`${d}T12:00:00Z`);
  const day = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - day + 3);
  const first = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((t.getTime() - first.getTime()) / 864e5 - 3 + ((first.getUTCDay() + 6) % 7)) / 7);
}
const nf = (v: number | undefined, unit: string) => (v === undefined ? '' : `${v.toLocaleString('de-DE', { maximumFractionDigits: 2 })}${unit}`);
const RED_TXT = '#b0282c';
const LIGHT_ON: Record<string, string> = { red: '#e0201b', yellow: '#f5c400', green: '#22c21f' };

/** Abb. 15: AP-Statusbericht als Blatt – Kopf, Tabelle mit Bezeichnungen grau und Werten rot, Ampel, Kreis „erledigt/offen“. */
export function wpReportSvg(ws: Workspace, p: Project, rowId: string | undefined): string {
  const list = p.wpReports ?? [];
  const r = list.find((x) => x.id === rowId) ?? list[0];
  if (!r) return '';
  const rows = pspRows(pspTree(ws, p.id)).filter((n) => n.owner === p.id || n.kind !== 'task');
  const at = rows.findIndex((n) => n.id === r.wp);
  const node = at >= 0 ? rows[at] : undefined;
  let parent: PspNode | undefined;
  for (let i = at - 1; i >= 0 && node; i--) if (rows[i].depth < node.depth) { parent = rows[i]; break; }
  const note = (ws.notes ?? []).find((n) => n.id === r.wp);
  const title = note ? titleOf(note) : '(entfallen)';
  const lead = personById(ws, rolesOf(p).find((x) => x.id === 'lead')?.person)?.name ?? '';
  const owner = personById(ws, note?.assignee)?.name ?? '';
  const phase = p.phases?.find((x) => x.id === note?.phase)?.name ?? '';
  const W = 640;
  const X = [0, 112, 300, 452, W];
  const parts: string[] = [];
  const cellBg = (x: number, y: number, w: number, h: number, gray: boolean) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${gray ? '#ececec' : '#fff'}" stroke="#9a9a9a" stroke-width="0.7"/>`;
  const txt = (x: number, y: number, lines: string[], o: { fill?: string; bold?: boolean; size?: number } = {}) =>
    lines.map((l, i) => `<text x="${x}" y="${y + i * ((o.size ?? 10) + 3)}" font-size="${o.size ?? 10}"${o.bold ? ' font-weight="bold"' : ''} fill="${o.fill ?? LOOK.ink}">${esc(l)}</text>`).join('');
  // Kopf
  const kw = r.from && r.to ? (isoWeek(r.from) === isoWeek(r.to) ? `${isoWeek(r.to)}. KW` : `${isoWeek(r.from)}./${isoWeek(r.to)}. KW`) : '';
  parts.push(`<rect x="0" y="0" width="${W}" height="84" fill="url(#fgHead)" stroke="#2a2a2a"/>`);
  parts.push(`<text x="${W / 2}" y="${kw ? 36 : 50}" text-anchor="middle" font-size="24" font-weight="bold" fill="#fff">AP Statusbericht zum ${esc(dmy(r.date))}</text>`);
  if (kw) parts.push(`<text x="${W / 2}" y="68" text-anchor="middle" font-size="22" font-weight="bold" fill="#fff">(Berichtszeitraum ${esc(kw)})</text>`);
  let y = 84;
  const pair = (a: string, av: string, b: string, bv: string) => {
    const l1 = wrap(av, 32, 3);
    const l2 = wrap(bv, 30, 3);
    const h = 10 + Math.max(l1.length, l2.length, 1) * 13;
    parts.push(cellBg(X[0], y, X[1] - X[0], h, true), cellBg(X[1], y, X[2] - X[1], h, false), cellBg(X[2], y, X[3] - X[2], h, true), cellBg(X[3], y, X[4] - X[3], h, false));
    parts.push(txt(X[0] + 5, y + 16, [a], { bold: true }), txt(X[1] + 5, y + 16, l1, { fill: RED_TXT, bold: true }), txt(X[2] + 5, y + 16, [b], { bold: true }), txt(X[3] + 5, y + 16, l2, { fill: RED_TXT, bold: true }));
    y += h;
  };
  pair('AP Bezeichnung', title, 'AP.Nr. (PSP CODE)', node?.code ?? '');
  // V142 (Report Abb. 15): Projektname mit Untertitel (Ziel aus dem Steckbrief)
  pair('Projektname', [p.name, (p.brief?.goal ?? '').split('\n')[0]].filter(Boolean).join(' - '), 'Projekt.Nr.', p.charter?.no ?? '');
  pair('Teilaufgabe', parent ? [parent.title, parent.code].filter(Boolean).join(' / ') : '', 'Phase', phase);
  pair('Projektleiter', lead, 'Verantwortlicher', owner);
  // Status: Ampel und Fortschrittskreis
  const sh = 150;
  parts.push(cellBg(X[0], y, X[2] - X[0], sh, false), cellBg(X[2], y, X[4] - X[2], sh, false));
  parts.push(txt(X[0] + 5, y + 16, ['Status'], { bold: true }), txt(X[2] + 5, y + 16, ['Ist-Fortschrittsgrad'], { bold: true }));
  const cx = (X[0] + X[2]) / 2;
  const hy = y + 14;
  parts.push(`<path d="M${cx - 62} ${hy + 10}h24v10h-24zM${cx + 38} ${hy + 10}h24v10h-24zM${cx - 62} ${hy + 50}h24v10h-24zM${cx + 38} ${hy + 50}h24v10h-24zM${cx - 62} ${hy + 90}h24v10h-24zM${cx + 38} ${hy + 90}h24v10h-24z" fill="#222"/>`);
  parts.push(`<rect x="${cx - 40}" y="${hy}" width="80" height="124" rx="10" fill="#1d1d1d"/>`);
  (['red', 'yellow', 'green'] as const).forEach((c, i) => parts.push(`<circle cx="${cx}" cy="${hy + 22 + i * 40}" r="15" fill="${r.light === c ? LIGHT_ON[c] : '#c9c9c9'}" stroke="#555" stroke-width="1.5"/>`));
  const prog = Math.max(0, Math.min(100, r.progress ?? 0));
  const pcx = (X[2] + X[4]) / 2 + 10;
  const pcy = y + 82;
  const pr = 56;
  const a = (2 * Math.PI * prog) / 100;
  const ex = pcx + pr * Math.sin(a);
  const ey = pcy - pr * Math.cos(a);
  if (prog >= 100) parts.push(`<circle cx="${pcx}" cy="${pcy}" r="${pr}" fill="#56c94f"/>`);
  else if (prog <= 0) parts.push(`<circle cx="${pcx}" cy="${pcy}" r="${pr}" fill="#b5b5b5"/>`);
  else {
    parts.push(`<circle cx="${pcx}" cy="${pcy}" r="${pr}" fill="#b5b5b5"/>`);
    parts.push(`<path d="M${pcx} ${pcy}L${pcx} ${pcy - pr}A${pr} ${pr} 0 ${prog > 50 ? 1 : 0} 1 ${ex.toFixed(1)} ${ey.toFixed(1)}Z" fill="#56c94f" stroke="#fff" stroke-width="1"/>`);
  }
  const mid = (from: number, share: number) => { const m = from + (2 * Math.PI * share) / 200; return [pcx + pr * 0.55 * Math.sin(m), pcy - pr * 0.55 * Math.cos(m)]; };
  const [dx1, dy1] = mid(0, prog);
  const [dx2, dy2] = mid(a, 100 - prog);
  if (prog > 0) parts.push(`<text x="${dx1.toFixed(1)}" y="${dy1.toFixed(1)}" text-anchor="middle" font-size="9.5" fill="#fff">erledigt</text><text x="${dx1.toFixed(1)}" y="${(dy1 + 12).toFixed(1)}" text-anchor="middle" font-size="9.5" fill="#fff">${esc(nf(prog, ' %'))}</text>`);
  if (prog < 100) parts.push(`<text x="${dx2.toFixed(1)}" y="${dy2.toFixed(1)}" text-anchor="middle" font-size="9.5" fill="#fff">offen</text><text x="${dx2.toFixed(1)}" y="${(dy2 + 12).toFixed(1)}" text-anchor="middle" font-size="9.5" fill="#fff">${esc(nf(Math.round((100 - prog) * 10) / 10, ' %'))}</text>`);
  y += sh;
  // Termine, Aufwand, Kosten
  const lv = (x: number, yy: number, label: string, v: string) => `<text x="${x}" y="${yy}" font-size="10" font-weight="bold"><tspan fill="${RED_TXT}">${esc(label)}</tspan> <tspan fill="${LOOK.ink}">${esc(v)}</tspan></text>`;
  const block = (label: string, c2: [string, string][], c3: [string, string][], c4: [string, string][]) => {
    const n = Math.max(c2.length, c3.length, c4.length);
    const h = 8 + n * 22;
    parts.push(cellBg(X[0], y, X[1] - X[0], h, true));
    parts.push(txt(X[0] + 5, y + h / 2 + 4, [label], { fill: RED_TXT, bold: true }));
    [[X[1], X[2], c2], [X[2], X[3], c3], [X[3], X[4], c4]].forEach(([x0, x1, items]) => {
      const it = items as [string, string][];
      if (it.length === n) it.forEach((v, i) => parts.push(cellBg(x0 as number, y + (i * h) / n, (x1 as number) - (x0 as number), h / n, true), lv((x0 as number) + 5, y + (i * h) / n + h / n / 2 + 4, v[0], v[1])));
      else {
        parts.push(cellBg(x0 as number, y, (x1 as number) - (x0 as number), h, true));
        it.forEach((v, i) => parts.push(lv((x0 as number) + 5, y + h / 2 + 4 + (i - (it.length - 1) / 2) * 14, v[0], v[1])));
      }
    });
    y += h;
  };
  const d = (v?: string) => (v ? dmy(v) : '');
  block('Termine', [['Plan-Start:', d(r.planStart)], ['Plan-Ende:', d(r.planEnd)]], [['Soll-Start:', d(r.sollStart)], ['Soll-Ende:', d(r.sollEnd)]], [['Ist-Start:', d(r.actStart)], ['Ist-Ende:', d(r.actEnd)]]);
  const rest = (s?: number, i?: number) => (s === undefined ? undefined : Math.round((s - (i ?? 0)) * 100) / 100);
  block('Aufwand', [['Plan:', nf(r.planHours, ' Ph')], ['Soll:', nf(r.sollHours, ' Ph')]], [['Ist:', nf(r.actHours, ' Ph')]], [['Rest:', nf(rest(r.sollHours, r.actHours), ' Ph')]]);
  block('Kosten', [['Plan:', nf(r.planCost, ' €')], ['Soll:', nf(r.sollCost, ' €')]], [['Ist:', nf(r.actCost, ' €')]], [['Rest:', nf(rest(r.sollCost, r.actCost), ' €')]]);
  const long = (label: string, text: string | undefined, minH: number) => {
    const lines = wrap(text || '', 112, 12);
    const h = Math.max(minH, 30 + lines.length * 13);
    parts.push(cellBg(0, y, W, h, false), txt(5, y + 16, [label], { bold: true }), txt(5, y + 31, lines));
    y += h;
  };
  long('Aktuelle Aktivitäten:', r.done, 70);
  long('Notwendige Steuerungsmaßnahmen:', r.measures, 56);
  parts.push(cellBg(0, y, W, 34, true));
  parts.push(txt(5, y + 21, [`${r.place ? `${r.place}, ` : ''} ${dmy(r.date)}`.trim()], { bold: true }));
  parts.push(`<line x1="${W - 190}" y1="${y + 24}" x2="${W - 10}" y2="${y + 24}" stroke="#9a9a9a" stroke-dasharray="2 2"/><text x="${W - 10}" y="${y + 11}" text-anchor="end" font-size="7.5" font-weight="bold" fill="${LOOK.ink}">Unterschrift PL</text>`);
  y += 34;
  parts.push(`<rect x="1" y="1" width="${W - 2}" height="${y - 1}" fill="none" stroke="#111" stroke-width="2.4"/>`);
  return svgWrap(W, y + 1, `AP-Statusbericht ${node?.code ?? ''} ${title} zum ${dmy(r.date)}: Ampel ${r.light === 'red' ? 'rot' : r.light === 'yellow' ? 'gelb' : 'grün'}, ${nf(prog, ' %')} erledigt`, parts.join(''));
}

// ---------------------------------------------------------------- F-234 (V137): Teamrollen nach Belbin wie Abb. 16

const BELBIN_ORDER = [
  ['pf', 'Perfektionist', 'act'],
  ['um', 'Umsetzer', 'act'],
  ['ma', 'Macher', 'act'],
  ['er', 'Erfinder', 'know'],
  ['sp', 'Spezialist', 'know'],
  ['be', 'Beobachter', 'know'],
  ['ws', 'Weichensteller', 'talk'],
  ['ta', 'Teamarbeiter', 'talk'],
  ['ko', 'Koordinator', 'talk'],
] as const;
const BELBIN_FILL = { act: 'url(#fgPale)', know: 'url(#fgDark)', talk: 'url(#fgWine)' } as const;
const BELBIN_TXT = { act: LOOK.ink, know: '#fff', talk: '#fff' } as const;

/** Abb. 16: Kreise auf einer Linie, Größe nach Punkten, Farbe nach Rollengruppe, Namen schräg darunter. */
export function belbinSvg(ws: Workspace, p: Project, rowId: string | undefined): string {
  const list = p.teamRoles ?? [];
  const t = list.find((x) => x.id === rowId) ?? list[0];
  if (!t) return '';
  const vals = BELBIN_ORDER.map(([k]) => t[k] ?? 0);
  if (!vals.some((v) => v > 0)) return '';
  const max = Math.max(...vals, 1);
  let fac = 1;
  const rOf = (v: number) => (v > 0 ? 9 + 46 * Math.sqrt(v / max) : 6) * fac;
  const W = 780;
  const base = 196;
  const parts: string[] = [];
  const who = personById(ws, t.person)?.name ?? '';
  parts.push(`<text x="40" y="58" font-size="40" font-weight="bold" fill="#9b9b9b">Teamrollen</text><text x="236" y="76" font-size="14" font-weight="bold" fill="#a7a7a7">nach Belbin${who ? ` · ${esc(who)}` : ''}</text>`);
  // Legende oben rechts
  ([['act', 'handlungsorientierte Rollen'], ['know', 'wissensorientierte Rollen'], ['talk', 'kommunikationsorientierte Rollen']] as const).forEach(([g, name], i) =>
    parts.push(`<circle cx="${W - 196}" cy="${22 + i * 15}" r="5" fill="${BELBIN_FILL[g]}" stroke="#333" stroke-width="1"/><text x="${W - 186}" y="${25.5 + i * 15}" font-size="8.5" fill="${LOOK.muted}">${name}</text>`),
  );
  // Kreise nebeneinander (Lücke je Gruppe)
  const gap = 6;
  const fixed = gap * (vals.length - 1) + 24;
  const sumW = () => vals.reduce((a, v) => a + 2 * rOf(v), 0);
  // V138: viele große Werte passen sonst nicht aufs Blatt (letzte Kreise wurden abgeschnitten) – dann alle Kreise verkleinern
  if (sumW() + fixed > W - 60) fac = (W - 60 - fixed) / sumW();
  const total = sumW() + fixed;
  let x = Math.max(30, (W - total) / 2);
  parts.push(`<line x1="20" y1="${base}" x2="${W - 20}" y2="${base}" stroke="#555" stroke-width="2"/>`);
  BELBIN_ORDER.forEach(([, name, g], i) => {
    const v = vals[i];
    const rr = rOf(v);
    if (i === 3 || i === 6) x += 12;
    const cx = x + rr;
    const cy = base - rr;
    const big = v >= max * 0.7;
    parts.push(`<g${edg(`teamRoles:${t.id}:${BELBIN_ORDER[i][0]}`, `${name}: ${v} Punkte`)}>${hit(cx - Math.max(rr, 12), cy - rr, 2 * Math.max(rr, 12), 2 * rr + 30)}<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${rr.toFixed(1)}" fill="${BELBIN_FILL[g]}" stroke="#2b2b2b" stroke-width="2" filter="url(#fgShadow)"/>`);
    parts.push(`<text x="${cx.toFixed(1)}" y="${(cy + (rr > 14 ? 5 : 4)).toFixed(1)}" text-anchor="middle" font-size="${rr > 30 ? 15 : rr > 14 ? 12 : 9}" font-weight="bold" fill="${BELBIN_TXT[g]}">${v}</text>`);
    parts.push(`<line x1="${cx.toFixed(1)}" y1="${base + 3}" x2="${cx.toFixed(1)}" y2="${base + 26}" stroke="#555" stroke-dasharray="1.5 2.5"/>`);
    parts.push(`<text transform="translate(${(cx + 4).toFixed(1)} ${base + 34}) rotate(-24)" text-anchor="end" font-size="${big ? 14 : v >= max * 0.4 ? 12 : 8.5}" font-weight="bold" fill="${LOOK.ink}">${name}</text></g>`);
    x += 2 * rr + gap;
  });
  const top = BELBIN_ORDER.map(([, n], i) => [n, vals[i]] as const).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, v]) => `${n} ${v}`).join(', ');
  return svgWrap(W, base + 92, `Teamrollen nach Belbin${who ? ` für ${who}` : ''}: am stärksten ${top}`, parts.join(''));
}

// ---------------------------------------------------------------- F-234 (V137): Eisenhower-Matrix wie Abb. 17

/** V139: Lage der vier Felder in der Eisenhower-Grafik (viewBox-Einheiten) – für Ziehen in ein anderes Feld. */
export const EISEN = { x0: 70, y0: 60, gw: 300, gh: 190 } as const;
export type EisenQuad = 'do' | 'plan' | 'delegate' | 'drop';
/** V139: Lage der Matrix – Höhe der oberen (wichtig) und unteren Reihe; mit „alle zeigen“ wachsen sie mit. */
export interface EisenGeo { x0: number; y0: number; gw: number; ghTop: number; ghBot: number }
const EISEN_GEO: EisenGeo = { x0: EISEN.x0, y0: EISEN.y0, gw: EISEN.gw, ghTop: EISEN.gh, ghBot: EISEN.gh };
/** Feld unter einem Punkt der Grafik (viewBox-Einheiten); außerhalb der Matrix null. */
export function eisenQuadAt(x: number, y: number, g: EisenGeo = EISEN_GEO): EisenQuad | null {
  const { x0, y0, gw, ghTop, ghBot } = g;
  if (x < x0 || x > x0 + 2 * gw || y < y0 || y > y0 + ghTop + ghBot) return null;
  const urgent = x >= x0 + gw;
  const important = y < y0 + ghTop;
  return important ? (urgent ? 'do' : 'plan') : urgent ? 'delegate' : 'drop';
}
type EisenItem = { id: string; text: string; done?: boolean };
/** V140 (F-237): Matrix der Grafik – ausdrücklich angegeben (Bericht je Matrix) oder die in 15.2 gewählte. */
export function eisenView(ws: Workspace, pid: string, view?: string): NoteView | undefined {
  const v = view ? viewById(ws, view) : undefined;
  return v?.kind === 'eisenhower' ? v : projectMatrix(ws, pid);
}
/** Einträge je Feld aus der Matrix (gleiche Regel wie die Tabelle); `done` zeigt auch Erledigte (H7). */
function eisenItems(ws: Workspace, pid: string, view?: string, done = false): Record<EisenQuad, EisenItem[]> {
  const q: Record<EisenQuad, EisenItem[]> = { plan: [], do: [], drop: [], delegate: [] };
  const v = eisenView(ws, pid, view);
  if (!v) return q;
  const codes = new Map(pspRows(pspTree(ws, pid)).filter((n) => n.kind === 'task').map((r) => [r.id, r.code]));
  const KEY = { 1: 'do', 2: 'plan', 3: 'delegate', 4: 'drop' } as const;
  for (const { note: n, quad } of matrixEntries(ws, v, done ? 'all' : 'open')) {
    const code = codes.get(n.id);
    const fin = n.state === 'done' || n.state === 'archived' || n.state === 'review';
    // V139 (Enrico 13:52): weder wichtig noch dringend = „liegen lassen“ – wie in der Tabelle darunter
    q[KEY[quad]].push({ id: n.id, text: `${code ? `${code} ` : ''}${titleOf(n)}`, ...(fin ? { done: true } : {}) });
  }
  return q;
}
const itemsHeight = (list: EisenItem[]) => list.reduce((h, it) => h + wrap(`- ${it.text}`, 44, 2).length * 13 + 9, 0);
/** V139 (Enrico 13:55): Lage der Matrix; `all` = Felder so hoch, dass jeder Eintrag zu sehen ist. */
export function eisenGeo(ws: Workspace, pid: string, all = false, view?: string, done = false): EisenGeo {
  if (!all && !done) return EISEN_GEO;
  const q = eisenItems(ws, pid, view, done);
  return { ...EISEN_GEO, ghTop: Math.max(EISEN.gh, 40 + 30 + Math.max(itemsHeight(q.plan), itemsHeight(q.do))), ghBot: Math.max(EISEN.gh, 30 + 34 + Math.max(itemsHeight(q.drop), itemsHeight(q.delegate))) };
}
/** Marken eines Felds: wichtig = oben, dringend = rechts. */
export const eisenMarks = (q: EisenQuad) => ({ important: q === 'do' || q === 'plan', urgent: q === 'do' || q === 'delegate' });

/** Abb. 17: vier Felder nach wichtig/dringend aus den offenen Vorgängen (Felder „wichtig“ und „dringend“ wie im Notizen-Modus). */
export function eisenhowerSvg(ws: Workspace, pid: string, day: string, all = false, view?: string, done = false): string {
  const p = projectById(ws, pid);
  const v = eisenView(ws, pid, view);
  if (!p || !v) return '';
  if (done) all = true;
  const q = eisenItems(ws, pid, v.id, done);
  const W = 760;
  const { x0, y0, gw, ghTop, ghBot } = eisenGeo(ws, pid, all, v.id, done);
  const H = 520 + (ghTop - EISEN.gh) + (ghBot - EISEN.gh);
  const gh = ghTop;
  const gh2 = ghTop + ghBot;
  const parts: string[] = [];
  parts.push(`<rect x="${x0 + 40}" y="6" width="${2 * gw - 80}" height="40" rx="6" fill="url(#fgHead)" filter="url(#fgShadow)"/>`);
  // V140 (F-237 H2): Datum der Matrix, Projekt wie Abb. 17, dazu die Person, wenn sie nicht „ich“ ist
  parts.push(`<text x="${x0 + gw}" y="33" text-anchor="middle" font-size="19" font-weight="bold" fill="#fff">${esc(`${dmy(v.date ?? day)} ${p.charter?.no ? `${p.name} - ${p.charter.no}` : p.name}${v.person ? ` · ${v.person}` : ''}`.slice(0, 60))}</text>`);
  parts.push(`<rect x="${x0}" y="${y0}" width="${2 * gw}" height="${gh2}" rx="8" fill="url(#fgGray)" stroke="${LOOK.grayLine}" filter="url(#fgShadow)"/>`);
  parts.push(`<line x1="${x0 + gw}" y1="${y0 + 8}" x2="${x0 + gw}" y2="${y0 + gh2 - 8}" stroke="#fff" stroke-width="3"/><line x1="${x0 + gw}" y1="${y0 + 8}" x2="${x0 + gw}" y2="${y0 + gh2 - 8}" stroke="#555" stroke-width="1"/>`);
  parts.push(`<line x1="${x0 + 8}" y1="${y0 + gh}" x2="${x0 + 2 * gw - 8}" y2="${y0 + gh}" stroke="#fff" stroke-width="3"/><line x1="${x0 + 8}" y1="${y0 + gh}" x2="${x0 + 2 * gw - 8}" y2="${y0 + gh}" stroke="#555" stroke-width="1"/>`);
  const corner = (x: number, y: number, t: string, anchor: 'start' | 'end') => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="11" fill="${LOOK.muted}">${t}</text>`;
  // V140 (F-237 H3): jedes Feld ist ein Knopf – Doppelklick bzw. Enter legt dort einen Eintrag an
  const QN = { plan: 'planen', do: 'erledigen', drop: 'liegen lassen', delegate: 'delegieren' } as const;
  const quad = (k: EisenQuad, x: number, y: number, w: number, h: number) => `<rect class="fg-quad" data-quad="${k}" tabindex="0" role="button" aria-label="${esc(`Feld ${QN[k]} – Enter legt hier einen Eintrag an`)}" x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff" fill-opacity="0"/>`;
  parts.push(quad('plan', x0, y0, gw, gh), quad('do', x0 + gw, y0, gw, gh), quad('drop', x0, y0 + gh, gw, ghBot), quad('delegate', x0 + gw, y0 + gh, gw, ghBot));
  parts.push(corner(x0 + 10, y0 + 16, 'planen', 'start'), corner(x0 + 2 * gw - 10, y0 + 16, 'erledigen', 'end'), corner(x0 + 10, y0 + gh2 - 8, 'liegen lassen', 'start'), corner(x0 + 2 * gw - 10, y0 + gh2 - 8, 'delegieren', 'end'));
  const items = (list: EisenItem[], x: number, y: number, tone: string, bold: boolean, rowH: number) => {
    const out: string[] = [];
    let yy = y;
    const maxY = all ? Infinity : y + rowH - 44;
    for (let i = 0; i < list.length; i++) {
      const lines = wrap(`- ${list[i].text}`, 44, 2);
      if (yy + lines.length * 14 > maxY) {
        out.push(`<text x="${x}" y="${yy}" font-size="10" fill="${LOOK.muted}">… und ${list.length - i} weitere</text>`);
        break;
      }
      out.push(`<g${edg(`eisenhower:${list[i].id}`, list[i].text)}>${hit(x - 6, yy - 11, gw - 16, lines.length * 13 + 4)}`);
      const fin = list[i].done;
      lines.forEach((l, j) => out.push(`<text x="${x}" y="${yy + j * 13}" font-size="11"${bold && !fin ? ' font-weight="bold"' : ''} fill="${fin ? LOOK.muted : tone}"${fin ? ' text-decoration="line-through"' : ''}>${esc(l)}</text>`));
      out.push('</g>');
      yy += lines.length * 13 + 9;
    }
    return out.join('');
  };
  parts.push(items(q.plan, x0 + 14, y0 + 40, LOOK.wine, true, ghTop), items(q.do, x0 + gw + 14, y0 + 40, LOOK.wine, true, ghTop), items(q.drop, x0 + 14, y0 + gh + 30, LOOK.ink, false, ghBot), items(q.delegate, x0 + gw + 14, y0 + gh + 30, LOOK.ink, true, ghBot));
  // Achsen
  parts.push(`<text transform="translate(${x0 - 30} ${y0 + gh2 / 2}) rotate(-90)" text-anchor="middle" font-size="22" font-weight="bold" fill="${LOOK.wine}">Wichtigkeit</text>`);
  parts.push(`<text transform="translate(${x0 - 8} ${y0 + gh / 2}) rotate(-90)" text-anchor="middle" font-size="10" fill="${LOOK.muted}">sehr</text><text transform="translate(${x0 - 8} ${y0 + gh + ghBot / 2}) rotate(-90)" text-anchor="middle" font-size="10" fill="${LOOK.muted}">nicht</text>`);
  parts.push(`<text x="${x0 + gw / 2}" y="${y0 + gh2 + 16}" text-anchor="middle" font-size="11" fill="${LOOK.muted}">nicht</text><text x="${x0 + gw * 1.5}" y="${y0 + gh2 + 16}" text-anchor="middle" font-size="11" fill="${LOOK.muted}">sehr</text>`);
  parts.push(`<text x="${x0 + gw}" y="${y0 + gh2 + 44}" text-anchor="middle" font-size="22" font-weight="bold" fill="#9b9b9b">Dringlichkeit</text>`);
  parts.push(`<text transform="translate(${x0 + 2 * gw + 30} ${y0 + gh2 / 2}) rotate(90)" text-anchor="middle" font-size="30" font-weight="bold" fill="#9b9b9b">Eisenhower-Matrix</text>`);
  return svgWrap(W, H, `${v.name}: ${q.do.length} erledigen, ${q.plan.length} planen, ${q.delegate.length} delegieren, ${q.drop.length} liegen lassen`, parts.join(''));
}

// ---------------------------------------------------------------- F-234 (V137): Nachrichtenquadrat nach Schulz von Thun wie Abb. 18

/** Abb. 18: außen Empfänger, darin Sender je Ebene, roter Rahmen mit den vier Seiten, Mitte Nachricht und Reaktion. */
export function squareSvg(p: Project, rowId: string | undefined): string {
  const list = p.messages ?? [];
  const m = list.find((x) => x.id === rowId) ?? list[0];
  if (!m) return '';
  const S = 800;
  const o = 14;
  const e = 124;
  const s = 214;
  const f = 232;
  const c = 290;
  const parts: string[] = [];
  const band = (a: number, b: number, fill: string, stroke = '#777') =>
    [`M${a} ${a}L${S - a} ${a}L${S - b} ${b}L${b} ${b}Z`, `M${S - a} ${a}L${S - a} ${S - a}L${S - b} ${S - b}L${S - b} ${b}Z`, `M${S - a} ${S - a}L${a} ${S - a}L${b} ${S - b}L${S - b} ${S - b}Z`, `M${a} ${S - a}L${a} ${a}L${b} ${b}L${b} ${S - b}Z`].map((d, i) => `<path d="${d}" fill="${Array.isArray(fill) ? fill[i] : fill}" stroke="${stroke}" stroke-width="0.8"/>`).join('');
  parts.push(`<rect x="0" y="0" width="${S}" height="${S}" fill="#a9a9a9"/>`);
  parts.push(band(o, e, 'url(#fgGray)'), band(e, s, '#bdbdbd'));
  parts.push(`<rect x="${s}" y="${s}" width="${S - 2 * s}" height="${S - 2 * s}" fill="${LOOK.wine}"/>`);
  const inner = [`M${f} ${f}L${S - f} ${f}L${S - c} ${c}L${c} ${c}Z`, `M${S - f} ${f}L${S - f} ${S - f}L${S - c} ${S - c}L${S - c} ${c}Z`, `M${S - f} ${S - f}L${f} ${S - f}L${c} ${S - c}L${S - c} ${S - c}Z`, `M${f} ${S - f}L${f} ${f}L${c} ${c}L${c} ${S - c}Z`];
  const tones = ['url(#fgSky)', 'url(#fgRose)', 'url(#fgSun)', 'url(#fgLeaf)'];
  inner.forEach((d, i) => parts.push(`<path d="${d}" fill="${tones[i]}" stroke="#777" stroke-width="0.6"/>`));
  parts.push(`<rect x="${c}" y="${c}" width="${S - 2 * c}" height="${S - 2 * c}" fill="#9d9d9d" stroke="#666"/>`);
  parts.push(`<rect x="${c}" y="${S / 2 - 4}" width="${S - 2 * c}" height="8" fill="${LOOK.wine}"/>`);
  // V140 (Enrico 14:26 „Die Texte dürfen nicht über die Ränder hinauslaufen“): `max` = Breite des Felds an dieser Stelle –
  // die Zeilen brechen danach um, und eine Zeile, die geschätzt breiter wäre, wird auf die Breite gestaucht (textLength)
  const lines = (x: number, y: number, ls: string[], o2: { size?: number; bold?: boolean; fill?: string; rot?: number; max?: number; vert?: string } = {}) => {
    const size = o2.size ?? 10;
    const tr = o2.rot ? ` transform="rotate(${o2.rot} ${x} ${y})"` : '';
    const y0 = y - ((ls.length - 1) * (size + 2)) / 2;
    const fit = (l: string) => (o2.max && l.length * size * (o2.bold ? 0.6 : 0.55) > o2.max ? ` textLength="${o2.max}" lengthAdjust="spacingAndGlyphs"` : '');
    // V140 (Enrico 14:27): senkrechter Eintrag stellt sich beim Hover/Fokus seines Felds waagerecht auf (CSS .fg-vert), mit hellem Grund
    const bw = Math.min(o2.max ?? 1e9, Math.max(...ls.map((l) => l.length)) * size * 0.6) + 16;
    const bh = ls.length * (size + 2) + 10;
    const bg = o2.vert ? `<rect class="fg-vbg" x="${(x - bw / 2).toFixed(1)}" y="${(y0 - size - 4).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh}" rx="6" fill="#fff" fill-opacity="0"/>` : '';
    return `<g${tr}${o2.vert ? ` class="fg-vert" data-k="${o2.vert}"` : ''}>${bg}${ls.map((l, i) => `<text x="${x}" y="${(y0 + i * (size + 2)).toFixed(1)}" text-anchor="middle" font-size="${size}"${o2.bold ? ' font-weight="bold"' : ''}${fit(l)} fill="${o2.fill ?? LOOK.ink}">${esc(l)}</text>`).join('')}</g>`;
  };
  /** Zeichen je Zeile für eine Breite (fett geschätzt 0,6 em je Zeichen). */
  const per = (w: number, size: number) => Math.max(8, Math.floor(w / (size * 0.6)));
  const head = (x: number, y: number, t: string, rot = 0) => lines(x, y, [t], { size: 13, bold: true, fill: LOOK.wine, rot });
  // Empfänger außen (oben Sachebene, rechts Appell, unten Beziehung, links Selbstkundgabe), Sender innen
  const outerMid = (o + e) / 2;
  const sendMid = (e + s) / 2;
  const cap = (t: string | undefined, chars: number, max: number) => wrap(t || '–', chars, max);
  // V138: jedes Feld per Klick auf seine Fläche im Quadrat am Ort bearbeiten
  const FIELD: Record<string, [string, number, number, number, number]> = {
    rFact: ['Sachebene – Empfänger', e, o, S - 2 * e, e - o],
    sFact: ['Sachebene – Sender', s, e, S - 2 * s, s - e],
    sRel: ['Beziehungsebene – Sender', s, S - s, S - 2 * s, s - e],
    rRel: ['Beziehungsebene – Empfänger', e, S - e, S - 2 * e, e - o],
    rSelf: ['Selbstkundgabe – Empfänger', o, e, e - o, S - 2 * e],
    sSelf: ['Selbstkundgabe – Sender', e, s, s - e, S - 2 * s],
    sAppeal: ['Appellseite – Sender', S - s, s, s - e, S - 2 * s],
    rAppeal: ['Appellseite – Empfänger', S - e, e, e - o, S - 2 * e],
    message: ['Nachricht', c, c, S - 2 * c, S / 2 - c],
    reaction: ['Reaktion', c, S / 2, S - 2 * c, S / 2 - c],
  };
  for (const [k, [label, x, y, w, h]] of Object.entries(FIELD)) parts.push(`<g${edg(`messages:${m.id}:${k}`, label)}>${hit(x, y, w, h)}</g>`);
  const fieldsAt = parts.length;
  // Breite der Trapeze an der schmalsten Textzeile (innen), mit Rand
  const wOut = S - 2 * (outerMid + 14 + 24) - 24;
  const wSend = S - 2 * (sendMid + 14 + 16) - 24;
  const tx = (t: string | undefined, w: number, max: number, size = 12) => cap(t, per(w, size), max);
  parts.push(head(S / 2, o + 20, 'Empfänger'), lines(S / 2, outerMid + 14, tx(m.rFact, wOut, 4), { bold: true, size: 12, max: wOut }));
  parts.push(head(S / 2, e + 18, 'Sender'), lines(S / 2, sendMid + 14, tx(m.sFact, wSend, 3), { bold: true, size: 12, max: wSend }));
  parts.push(head(S / 2, S - e - 64, 'Sender'), lines(S / 2, S - sendMid + 10, tx(m.sRel, wSend, 3), { bold: true, size: 12, max: wSend }));
  parts.push(head(S / 2, S - o - 74, 'Empfänger'), lines(S / 2, S - outerMid + 12, tx(m.rRel, wOut, 4), { bold: true, size: 12, max: wOut }));
  // senkrechte Einträge kommen zuletzt (über die Klickflächen, ohne Zeiger), damit sie beim Aufstellen über allem liegen
  const verts = [
    lines(outerMid + 14, S / 2, tx(m.rSelf, wOut, 4), { bold: true, size: 12, rot: -90, max: wOut, vert: 'rSelf' }),
    lines(sendMid + 12, S / 2, tx(m.sSelf, wSend, 3), { bold: true, size: 12, rot: -90, max: wSend, vert: 'sSelf' }),
    lines(S - sendMid - 2, S / 2, tx(m.sAppeal, wSend, 3), { bold: true, size: 12, rot: -90, max: wSend, vert: 'sAppeal' }),
    lines(S - outerMid - 2, S / 2, tx(m.rAppeal, wOut, 4), { bold: true, size: 12, rot: -90, max: wOut, vert: 'rAppeal' }),
  ];
  // V140 (Enrico 14:28 „Das ganze Feld“): beim Hover/Fokus erscheint das ganze Feld waagerecht als Karte – Überschrift und Text
  const card = (k: string, who: string, t: string | undefined, cx: number) => {
    // genau mittig über der senkrechten Schrift, Sender und Empfänger gleich breit (Enrico 14:31) – außen ragt die Karte
    // dafür über den Rand der Grafik hinaus (CSS overflow: visible)
    const W = 300;
    const ls = cap(t, per(W - 24, 12), 10);
    const h = 36 + ls.length * 14 + 12;
    const y = S / 2 - h / 2;
    return `<g class="fg-card" data-k="${k}" opacity="0"><rect x="${cx - W / 2}" y="${y}" width="${W}" height="${h}" rx="8" fill="#fff" fill-opacity="0.97" stroke="${LOOK.wine}" stroke-width="1.2" filter="url(#fgShadow)"/>${lines(cx, y + 22, [who], { size: 13, bold: true, fill: LOOK.wine })}${lines(cx, y + 36 + ((ls.length - 1) * 14) / 2 + 6, ls, { size: 12, bold: true, max: W - 24 })}</g>`;
  };
  verts.push(card('rSelf', 'Empfänger · Selbstkundgabe', m.rSelf, outerMid + 14), card('sSelf', 'Sender · Selbstkundgabe', m.sSelf, sendMid + 12), card('sAppeal', 'Sender · Appellseite', m.sAppeal, S - sendMid - 2), card('rAppeal', 'Empfänger · Appellseite', m.rAppeal, S - outerMid - 2));
  parts.push(head(o + 20, S / 2, 'Empfänger', -90), head(e + 18, S / 2, 'Sender', -90), head(S - e - 18, S / 2, 'Sender', -90), head(S - o - 20, S / 2, 'Empfänger', -90));
  // roter Rahmen mit den Fragen der vier Seiten
  parts.push(lines(S / 2, s + 13, ['Worüber ich informiere'], { size: 9.5, bold: true, fill: '#fff' }));
  parts.push(lines(S / 2, S - s - 5, ['Wie wir zueinander stehen'], { size: 9.5, bold: true, fill: '#fff' }));
  parts.push(lines(s + 12, S / 2, ['Was ich von mir zeige, ODER verberge'], { size: 9.5, bold: true, fill: '#fff', rot: -90 }));
  parts.push(lines(S - s - 6, S / 2, ['Wozu ich dich veranlassen will'], { size: 9.5, bold: true, fill: '#fff', rot: -90 }));
  parts.push(lines(S / 2, f + 34, ['Sachebene'], { size: 22, bold: true, fill: '#fff' }));
  parts.push(lines(S / 2, S - f - 20, ['Beziehungsebene'], { size: 22, bold: true, fill: '#7d7d7d' }));
  parts.push(lines(f + 30, S / 2, ['Selbstkundgabe'], { size: 22, bold: true, fill: '#7d7d7d', rot: -90 }));
  parts.push(lines(S - f - 22, S / 2, ['Appellseite'], { size: 22, bold: true, fill: '#fff', rot: -90 }));
  // Mitte
  const wMid = S - 2 * c - 20;
  parts.push(lines(S / 2, c + 34, ['Nachricht'], { size: 22, bold: true, fill: LOOK.wine }), lines(S / 2, c + 76, tx(m.message, wMid, 3, 14), { size: 14, bold: true, max: wMid }));
  parts.push(lines(S / 2, S / 2 + 34, ['Reaktion'], { size: 22, bold: true, fill: LOOK.wine }), lines(S / 2, S / 2 + 76, tx(m.reaction, wMid, 3, 14), { size: 14, bold: true, max: wMid }));
  parts.push(`<text transform="translate(${S + 62} ${S}) rotate(-90)" font-size="64" font-weight="bold" fill="#b3b3b3">Nachrichtenquadrat</text><text transform="translate(${S + 84} ${S}) rotate(-90)" font-size="18" font-weight="bold" fill="#9a9a9a">nach Schulz von Thun</text>`);
  const hits = parts.splice(fieldsAt - Object.keys(FIELD).length, Object.keys(FIELD).length);
  parts.push(...hits, ...verts);
  return svgWrap(S + 92, S, `Nachrichtenquadrat: ${m.topic}${m.message ? ` – Nachricht „${m.message}“` : ''}`, parts.join(''));
}

/** Kennung der Grafik eines Formulars (FormDef.figure). */
export type FigureKind = 'goalTree' | 'org' | 'phasePlan' | 'psp' | 'gantt' | 'load' | 'wpReport' | 'belbin' | 'eisenhower' | 'square';
/** Grafik eines Formulars mit Layout `figure` (leer, wenn noch nichts zu zeichnen ist). */
export function figureSvg(ws: Workspace, pid: string, kind: FigureKind | undefined, o: { person?: string; row?: string; day?: string; all?: boolean; done?: boolean } = {}): string {
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
    case 'wpReport':
      return wpReportSvg(ws, p, o.row);
    case 'belbin':
      return belbinSvg(ws, p, o.row);
    case 'eisenhower':
      // V140 (F-237): `row` = Matrix (Bericht je Matrix), sonst die in 15.2 gewählte
      return eisenhowerSvg(ws, pid, o.day ?? new Date().toISOString().slice(0, 10), o.all, o.row, o.done);
    case 'square':
      return squareSvg(p, o.row);
  }
  return '';
}

// ---------------------------------------------------------------- V141 (Enrico 14:58): Portfolios im Aussehen der Eisenhower-Matrix

/** Rahmen wie Abb. 17: dunkle Kopfleiste mit Datum und Projekt, graues Feld mit Schatten, Kreuz aus weißer und dunkler Linie,
 *  Achsentitel groß (senkrecht weinrot, waagerecht grau), Name der Grafik senkrecht rechts. */
function quadFrame(p: Project, day: string, o: { x0: number; y0: number; gw: number; gh: number; cross: { x: number; y: number }; left: string; leftHi: string; leftLo: string; bottom: string; bottomLo: string; bottomHi: string; name: string }): string[] {
  const { x0, y0, gw, gh, cross } = o;
  const parts: string[] = [];
  parts.push(`<rect x="${x0 + 40}" y="6" width="${2 * gw - 80}" height="40" rx="6" fill="url(#fgHead)" filter="url(#fgShadow)"/>`);
  parts.push(`<text x="${x0 + gw}" y="33" text-anchor="middle" font-size="19" font-weight="bold" fill="#fff">${esc(`${dmy(day)} ${p.charter?.no ? `${p.name} - ${p.charter.no}` : p.name}`.slice(0, 60))}</text>`);
  parts.push(`<rect x="${x0}" y="${y0}" width="${2 * gw}" height="${2 * gh}" rx="8" fill="url(#fgGray)" stroke="${LOOK.grayLine}" filter="url(#fgShadow)"/>`);
  parts.push(`<line x1="${cross.x}" y1="${y0 + 8}" x2="${cross.x}" y2="${y0 + 2 * gh - 8}" stroke="#fff" stroke-width="3"/><line x1="${cross.x}" y1="${y0 + 8}" x2="${cross.x}" y2="${y0 + 2 * gh - 8}" stroke="#555" stroke-width="1"/>`);
  parts.push(`<line x1="${x0 + 8}" y1="${cross.y}" x2="${x0 + 2 * gw - 8}" y2="${cross.y}" stroke="#fff" stroke-width="3"/><line x1="${x0 + 8}" y1="${cross.y}" x2="${x0 + 2 * gw - 8}" y2="${cross.y}" stroke="#555" stroke-width="1"/>`);
  parts.push(`<text transform="translate(${x0 - 30} ${y0 + gh}) rotate(-90)" text-anchor="middle" font-size="22" font-weight="bold" fill="${LOOK.wine}">${esc(o.left)}</text>`);
  parts.push(`<text transform="translate(${x0 - 8} ${y0 + gh / 2}) rotate(-90)" text-anchor="middle" font-size="10" fill="${LOOK.muted}">${esc(o.leftHi)}</text><text transform="translate(${x0 - 8} ${y0 + gh * 1.5}) rotate(-90)" text-anchor="middle" font-size="10" fill="${LOOK.muted}">${esc(o.leftLo)}</text>`);
  parts.push(`<text x="${x0 + gw / 2}" y="${y0 + 2 * gh + 16}" text-anchor="middle" font-size="11" fill="${LOOK.muted}">${esc(o.bottomLo)}</text><text x="${x0 + gw * 1.5}" y="${y0 + 2 * gh + 16}" text-anchor="middle" font-size="11" fill="${LOOK.muted}">${esc(o.bottomHi)}</text>`);
  parts.push(`<text x="${x0 + gw}" y="${y0 + 2 * gh + 44}" text-anchor="middle" font-size="22" font-weight="bold" fill="#9b9b9b">${esc(o.bottom)}</text>`);
  parts.push(`<text transform="translate(${x0 + 2 * gw + 30} ${y0 + gh}) rotate(90)" text-anchor="middle" font-size="30" font-weight="bold" fill="#9b9b9b">${esc(o.name)}</text>`);
  return parts;
}
const corner = (x: number, y: number, t: string, anchor: 'start' | 'end') => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="11" fill="${LOOK.muted}">${esc(t)}</text>`;
const today = () => new Date().toISOString().slice(0, 10);
/** V141: Liste je Feld wie Abb. 17 – `maxY` begrenzt (Gekürzt) mit „… und n weitere“; `dot` zeichnet vorn einen Kreis. */
function fieldList(parts: string[], items: { lines: string[]; sub?: string; tone: string; title: string; dot?: { r: number; c: string } }[], x: number, y: number, maxY: number) {
  let yy = y;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const h = (it.lines.length + (it.sub ? 1 : 0)) * 13;
    if (yy + h > maxY) {
      parts.push(`<text x="${x}" y="${yy}" font-size="10" fill="${LOOK.muted}">… und ${items.length - i} weitere</text>`);
      return;
    }
    const tx = it.dot ? x + 20 : x;
    parts.push(`<g><title>${esc(it.title)}</title>`);
    if (it.dot) parts.push(`<circle cx="${x + 7}" cy="${yy - 4}" r="${it.dot.r}" fill="${it.dot.c}" fill-opacity="0.35" stroke="${it.dot.c}" stroke-width="1.2"/>`);
    it.lines.forEach((l, j) => parts.push(`<text x="${tx}" y="${yy + j * 13}" font-size="11" font-weight="bold" fill="${it.tone}">${esc(l)}</text>`));
    if (it.sub) parts.push(`<text x="${tx}" y="${yy + it.lines.length * 13}" font-size="10" fill="${LOOK.muted}">${esc(it.sub)}</text>`);
    parts.push('</g>');
    yy += h + 9;
  }
}
const listHeight = (items: { lines: string[]; sub?: string }[]) => items.reduce((h, it) => h + (it.lines.length + (it.sub ? 1 : 0)) * 13 + 9, 0);

/** Umfeld-Portfolio im Aussehen der Eisenhower-Matrix: intern/extern (Zeilen) × sachlich/sozial (Spalten), Einträge als
 *  linksbündige Liste je Feld. `all` = Felder wachsen mit (Rad „Einträge“ Gekürzt · Alle wie in der Matrix). */
export function envPortfolioSvg(p: Project, dots: PortfolioDot[], day = today(), all = false): string {
  const x0 = 70;
  const y0 = 60;
  const gw = 300;
  const item = (d: PortfolioDot, tone: string) => ({ lines: wrap(`- ${d.code ? `${d.code} ` : ''}${d.name}`, 44, 2), tone, title: d.name });
  const field = (sd: 'in' | 'ex', a: 'fact' | 'social') => dots.filter((d) => d.side === sd && d.area === a).map((d) => item(d, sd === 'in' ? LOOK.wine : LOOK.ink));
  const F = { inF: field('in', 'fact'), inS: field('in', 'social'), exF: field('ex', 'fact'), exS: field('ex', 'social') };
  const gh = all ? Math.max(170, 56 + Math.max(...Object.values(F).map(listHeight))) : 170;
  const parts = quadFrame(p, day, { x0, y0, gw, gh, cross: { x: x0 + gw, y: y0 + gh }, left: 'Herkunft', leftHi: 'intern', leftLo: 'extern', bottom: 'Beziehung', bottomLo: 'sachlich', bottomHi: 'sozial', name: 'Umfeld-Portfolio' });
  parts.push(corner(x0 + 10, y0 + 16, 'intern · sachlich', 'start'), corner(x0 + 2 * gw - 10, y0 + 16, 'intern · sozial', 'end'), corner(x0 + 10, y0 + 2 * gh - 8, 'extern · sachlich', 'start'), corner(x0 + 2 * gw - 10, y0 + 2 * gh - 8, 'extern · sozial', 'end'));
  fieldList(parts, F.inF, x0 + 14, y0 + 38, y0 + gh - 10);
  fieldList(parts, F.inS, x0 + gw + 14, y0 + 38, y0 + gh - 10);
  fieldList(parts, F.exF, x0 + 14, y0 + gh + 26, y0 + 2 * gh - 24);
  fieldList(parts, F.exS, x0 + gw + 14, y0 + gh + 26, y0 + 2 * gh - 24);
  const open = dots.filter((d) => !d.side || !d.area).length;
  return svgWrap(760, y0 + 2 * gh + 60, `Umfeld-Portfolio: ${dots.length - open} Stakeholder eingeordnet${open ? `, ${open} ohne Angabe` : ''}`, parts.join(''));
}

/** Stakeholder-Portfolio im Aussehen der Eisenhower-Matrix: Einstellung −2…+2 (waagerecht) × Macht 1–3 (senkrecht).
 *  V141 (Enrico 15:02 „Ordne die Einträge linksbündig an“): je Feld eine linksbündige Liste wie in Abb. 17 – Kreis
 *  (Größe = Konfliktpotenzial, weinrot intern, grau extern), Code und Name, darunter Einstellung · Macht · Konflikt
 *  (Enrico 15:02 „warum sind da 2 Kreise größer?“ – die Zahl steht jetzt dabei). `all` wie beim Umfeld-Portfolio. */
export function shPortfolioSvg(p: Project, dots: PortfolioDot[], day = today(), all = false): string {
  const x0 = 70;
  const y0 = 60;
  const gw = 300;
  const sign = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
  const placed = dots.filter((d) => d.attitude !== undefined && d.power !== undefined);
  const item = (d: PortfolioDot) => {
    const c = d.side === 'ex' ? '#555' : LOOK.wine;
    return {
      lines: wrap(`${d.code ? `${d.code} ` : ''}${d.name}`, 40, 2),
      sub: `Einstellung ${sign(d.attitude!)} · Macht ${d.power}${d.conflict ? ` · Konflikt ${d.conflict}` : ''}`,
      tone: d.side === 'ex' ? LOOK.ink : LOOK.wine,
      title: `${d.code ? `${d.code} ` : ''}${d.name}, ${d.side === 'ex' ? 'extern' : 'intern'}`,
      dot: { r: 3 + (d.conflict ?? 1) * 1.3, c },
    };
  };
  // Feld: links = dagegen (< 0), rechts = neutral/dafür; oben = Macht ≥ 2
  const field = (right: boolean, top: boolean) =>
    placed.filter((d) => (d.attitude! >= 0) === right && (d.power! >= 2) === top).sort((a, b) => b.power! - a.power! || b.attitude! - a.attitude! || (a.code || a.name).localeCompare(b.code || b.name, 'de')).map(item);
  const F = { lt: field(false, true), rt: field(true, true), lb: field(false, false), rb: field(true, false) };
  const gh = all ? Math.max(170, 56 + Math.max(...Object.values(F).map(listHeight))) : 170;
  const parts = quadFrame(p, day, { x0, y0, gw, gh, cross: { x: x0 + gw, y: y0 + gh }, left: 'Macht/Einfluss', leftHi: 'hoch (2–3)', leftLo: 'gering (1)', bottom: 'Einstellung', bottomLo: 'dagegen (−2 … −1)', bottomHi: 'dafür (0 … +2)', name: 'Stakeholder-Portfolio' });
  parts.push(corner(x0 + 10, y0 + 16, 'Opponenten – eng steuern', 'start'), corner(x0 + 2 * gw - 10, y0 + 16, 'Promotoren – einbinden', 'end'), corner(x0 + 10, y0 + 2 * gh - 8, 'Gegner ohne Macht – beobachten', 'start'), corner(x0 + 2 * gw - 10, y0 + 2 * gh - 8, 'Unterstützer – informieren', 'end'));
  fieldList(parts, F.lt, x0 + 14, y0 + 40, y0 + gh - 10);
  fieldList(parts, F.rt, x0 + gw + 14, y0 + 40, y0 + gh - 10);
  fieldList(parts, F.lb, x0 + 14, y0 + gh + 30, y0 + 2 * gh - 24);
  fieldList(parts, F.rb, x0 + gw + 14, y0 + gh + 30, y0 + 2 * gh - 24);
  const ly = y0 + 2 * gh + 66;
  parts.push(`<circle cx="${x0 + 6}" cy="${ly - 4}" r="5" fill="${LOOK.wine}" fill-opacity="0.35" stroke="${LOOK.wine}"/><text x="${x0 + 16}" y="${ly}" font-size="10" fill="${LOOK.ink}">intern</text>`);
  parts.push(`<circle cx="${x0 + 66}" cy="${ly - 4}" r="5" fill="#555" fill-opacity="0.35" stroke="#555"/><text x="${x0 + 76}" y="${ly}" font-size="10" fill="${LOOK.ink}">extern</text>`);
  parts.push(`<text x="${x0 + 126}" y="${ly}" font-size="10" fill="${LOOK.muted}">Kreisgröße = Konfliktpotenzial (1 gering – 3 hoch)</text>`);
  const open = dots.length - placed.length;
  return svgWrap(760, ly + 10, `Stakeholder-Portfolio: ${placed.length} Stakeholder eingeordnet${open ? `, ${open} ohne Einstellung oder Macht` : ''}`, parts.join(''));
}
