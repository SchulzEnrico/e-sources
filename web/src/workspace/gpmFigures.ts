/**
 * F-234 Option A (V135, Doc „F-234 V134 – Fehlende Darstellungen“, D1–D8 wie Vorschlag): Grafiken der Kapitel-Blätter im
 * Aussehen des ColorGentlemen-Reports – weinrote Kästen mit Verlauf, graue Arbeitspakete, Verbindungen als rote Linien,
 * Legende im Kasten. Alles wird aus den vorhandenen Daten gezeichnet (nichts doppelt): Zielhierarchie (Abb. 4) aus den
 * Zielen mit Oberziel, Projektorganisation (Abb. 7) aus den Rollen, Phasenplan (Abb. 9) aus Phasen und Meilensteinen,
 * PSP (Abb. 10) aus dem Projektstrukturplan, vernetzter Balkenplan (Abb. 13) aus dem Gantt, Auslastungsdiagramm mit
 * Einsatzmittelganglinie (Abb. 14) aus den Einsätzen. Reine Funktionen (SVG-Text); dieselben Bausteine zeigen das Blatt
 * (ProjectForms) und der Bericht (gpmReport). Tests in gpm.test.ts („F-234“).
 */
import type { Project, ProjectRole, Workspace } from './types';
import { ganttOf, phaseBars, type Gantt } from './gantt';
import { pspRows, pspTree, type PspNode } from './psp';
import { resourceUse, type ResRow } from './resources';
import { personById } from './persons';
import { projectById, rolesOf } from './projects';
import { titleOf } from './notes';

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
<linearGradient id="fgHead" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5b5b5b"/><stop offset="1" stop-color="#2f2f2f"/></linearGradient>
<radialGradient id="fgDark" cx="0.4" cy="0.3" r="0.8"><stop offset="0" stop-color="#9a9a9a"/><stop offset="1" stop-color="#2a2a2a"/></radialGradient>
<linearGradient id="fgSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fb4e3"/><stop offset="1" stop-color="#d8d8d8"/></linearGradient>
<linearGradient id="fgSun" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fbf59a"/><stop offset="1" stop-color="#d8d8d8"/></linearGradient>
<linearGradient id="fgLeaf" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8fe38f"/><stop offset="1" stop-color="#d8d8d8"/></linearGradient>
<linearGradient id="fgRose" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#ec8f8f"/><stop offset="1" stop-color="#d8d8d8"/></linearGradient>
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
  /** V137 (Bearbeiten im Blatt): „Formular:Zeile“ – Kasten anklickbar, bearbeitbar und von Hand verschiebbar (D3) */
  edit?: string;
}
/** D3: Versatz der Kästen der gerade gezeichneten Grafik (Project.figLayout[fig]). */
let OFF: Record<string, { dx: number; dy: number }> = {};
const offOf = (b: Box) => (b.edit ? OFF[b.edit] : undefined) ?? { dx: 0, dy: 0 };
const LH = 11;
const boxH = (b: Box) => 10 + b.lines.length * LH;
function drawBox(x0: number, y0: number, w: number, b: Box, fs = 9): string {
  const h = boxH(b);
  const { dx, dy } = offOf(b);
  const x = x0 + dx;
  const y = y0 + dy;
  const t = TEXT[b.tone];
  const tx = b.lines
    .map((l, i) => `<text x="${x + w / 2}" y="${y + 13 + i * LH}" text-anchor="middle" font-size="${fs}" font-weight="${i === 0 || b.bold ? 'bold' : 'normal'}" fill="${t}">${esc(l)}</text>`)
    .join('');
  const ed = b.edit ? ` class="fg-edit" data-edit="${esc(b.edit)}" tabindex="0" role="button" aria-label="${esc(`Bearbeiten: ${b.title ?? b.lines.join(' ')}`)}"` : '';
  return `<g${ed}>${b.title ? `<title>${esc(b.title)}</title>` : ''}<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${FILL[b.tone]}" stroke="${STROKE[b.tone]}" stroke-width="0.8" filter="url(#fgShadow)"/>${tx}</g>`;
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
  OFF = p.figLayout?.goalTree ?? {};
  const goals = p.goals ?? [];
  if (!goals.length) return '';
  const ids = new Set(goals.map((g) => g.id));
  const kids = (id: string) => goals.filter((g) => g.parent === id);
  const top = goals.filter((g) => !g.parent || !ids.has(g.parent));
  const chars = 20;
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
    columns.push({ head: { lines: goalLines(g.code, g.text, chars), tone: 'pale', title: g.text, edit: `goals:${g.id}` }, items });
  }
  if (loose.length) columns.push({ head: { lines: ['L', 'Leistungsziele'], tone: 'pale' }, items: loose });
  for (const [kind, code, name] of [['social', 'S', 'Soziale Ziele'], ['non', 'N', 'Nichtziele']] as const) {
    const list = top.filter((x) => x.kind === kind);
    if (!list.length) continue;
    const items: TreeColumn['items'] = [];
    for (const g of list) {
      items.push({ depth: 0, box: { lines: goalLines(g.code, g.text, chars), tone: kind === 'non' ? 'pale' : toneOfLevel(g.level, g.kind), title: g.text, edit: `${kind === 'non' ? 'nongoals' : 'goals'}:${g.id}` } });
      walk(g.id, 1, items);
    }
    columns.push({ head: { lines: [code, name], tone: 'pale' }, items });
  }
  const sub = p.brief?.goal ?? '';
  return columnTreeSvg({ lines: [p.name, ...(sub ? wrap(sub.split('\n')[0], 52, 1) : [])], tone: 'root', title: p.name, edit: `charter:${p.id}` }, columns, {
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
  OFF = p.figLayout?.psp ?? {};
  const chars = 19;
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
  return columnTreeSvg({ lines: [p.name, ...(sub ? wrap(sub, 52, 1) : []), ...(no ? [no] : [])], tone: 'root', title: p.name, edit: `charter:${p.id}` }, columns, {
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
export function orgChartSvg(ws: Workspace, p: Project): string {
  const roles = p.roles ?? [];
  if (!roles.length) return '';
  OFF = p.figLayout?.org ?? {};
  const who = (id?: string) => (id ? personById(ws, id)?.name ?? '' : '');
  const isTop = (n: string) => /auftrag|lenk|steuer|geschäftsf|sponsor/i.test(n);
  const isLead = (r: ProjectRole) => r.id === 'lead' || /projektleit/i.test(r.name);
  const byId = new Map(roles.map((r) => [r.id, r]));
  const parentOf = new Map<string, string | undefined>();
  if (roles.some((r) => r.parent)) for (const r of roles) parentOf.set(r.id, r.parent && byId.has(r.parent) ? r.parent : undefined);
  else {
    const lead = roles.find(isLead);
    const tops = roles.filter((r) => r !== lead && isTop(r.name));
    for (const r of roles) parentOf.set(r.id, r === lead ? tops[0]?.id : tops.includes(r) ? (r === tops[0] ? undefined : tops[0].id) : lead?.id ?? tops[0]?.id);
  }
  const ext = (r: ProjectRole) => r.kind === 'external';
  const internal = roles.filter((r) => !ext(r));
  const kidsOf = (id: string) => internal.filter((r) => parentOf.get(r.id) === id && r.kind !== 'staff');
  const staffOf = (id: string) => internal.filter((r) => parentOf.get(r.id) === id && r.kind === 'staff');
  const roots = internal.filter((r) => { const up = parentOf.get(r.id); return !up || ext(byId.get(up)!) || (r.kind === 'staff' && !internal.some((x) => x.id === up)); });
  const BW = 150;
  const GX = 22;
  const toneOf = (r: ProjectRole): BoxTone => (ext(r) ? 'pale' : isLead(r) ? 'wine' : r.kind === 'staff' ? 'orange' : 'gray');
  const boxOf = (r: ProjectRole): Box => ({ lines: [...(who(r.person) ? wrap(who(r.person), 26, 2) : []), ...wrap(r.name, 26, 2), ...(ext(r) && r.org ? wrap(r.org, 26, 1) : [])], tone: toneOf(r), title: [r.name, who(r.person), r.org].filter(Boolean).join(': '), edit: `roles:${r.id}` });
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
    bottom = Math.max(bottom, place(r, x, 10, seen));
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
  parts.push(`<rect x="${lx}" y="10" width="190" height="${30 + items.length * 18 + 3 * 18}" fill="#fff" stroke="${LOOK.grayLine}" stroke-width="0.8"/><text x="${lx + 8}" y="26" font-size="10" font-weight="bold" fill="${LOOK.ink}">Legende</text>`);
  items.forEach(([t, st], i) => parts.push(`<text x="${lx + 8}" y="${46 + i * 18}" font-size="9" fill="${LOOK.ink}">${t}</text><line x1="${lx + 128}" y1="${42 + i * 18}" x2="${lx + 182}" y2="${42 + i * 18}" ${st}/>`));
  ([['wine', 'Projektleitung'], ['orange', 'Stabsstelle'], ['pale', 'extern']] as [BoxTone, string][]).forEach(([tone, t], i) => {
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
  pair('Projektname', p.name, 'Projekt.Nr.', p.charter?.no ?? '');
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
  const rOf = (v: number) => (v > 0 ? 9 + 46 * Math.sqrt(v / max) : 6);
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
  const widths = vals.map((v) => 2 * rOf(v));
  const gap = 6;
  const total = widths.reduce((a, b) => a + b, 0) + gap * (vals.length - 1) + 24;
  let x = Math.max(30, (W - total) / 2);
  parts.push(`<line x1="20" y1="${base}" x2="${W - 20}" y2="${base}" stroke="#555" stroke-width="2"/>`);
  BELBIN_ORDER.forEach(([, name, g], i) => {
    const v = vals[i];
    const rr = rOf(v);
    if (i === 3 || i === 6) x += 12;
    const cx = x + rr;
    const cy = base - rr;
    const big = v >= max * 0.7;
    parts.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${rr.toFixed(1)}" fill="${BELBIN_FILL[g]}" stroke="#2b2b2b" stroke-width="2" filter="url(#fgShadow)"/>`);
    parts.push(`<text x="${cx.toFixed(1)}" y="${(cy + (rr > 14 ? 5 : 4)).toFixed(1)}" text-anchor="middle" font-size="${rr > 30 ? 15 : rr > 14 ? 12 : 9}" font-weight="bold" fill="${BELBIN_TXT[g]}">${v}</text>`);
    parts.push(`<line x1="${cx.toFixed(1)}" y1="${base + 3}" x2="${cx.toFixed(1)}" y2="${base + 26}" stroke="#555" stroke-dasharray="1.5 2.5"/>`);
    parts.push(`<text transform="translate(${(cx + 4).toFixed(1)} ${base + 34}) rotate(-24)" text-anchor="end" font-size="${big ? 14 : v >= max * 0.4 ? 12 : 8.5}" font-weight="bold" fill="${LOOK.ink}">${name}</text>`);
    x += 2 * rr + gap;
  });
  const top = BELBIN_ORDER.map(([, n], i) => [n, vals[i]] as const).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, v]) => `${n} ${v}`).join(', ');
  return svgWrap(W, base + 92, `Teamrollen nach Belbin${who ? ` für ${who}` : ''}: am stärksten ${top}`, parts.join(''));
}

// ---------------------------------------------------------------- F-234 (V137): Eisenhower-Matrix wie Abb. 17

/** Abb. 17: vier Felder nach wichtig/dringend aus den offenen Vorgängen (Felder „wichtig“ und „dringend“ wie im Notizen-Modus). */
export function eisenhowerSvg(ws: Workspace, pid: string, day: string): string {
  const p = projectById(ws, pid);
  if (!p) return '';
  const rows = pspRows(pspTree(ws, pid)).filter((n) => n.kind === 'task' && n.owner === pid && !n.milestone && !n.summary);
  const byId = new Map((ws.notes ?? []).map((n) => [n.id, n]));
  const q: Record<'plan' | 'do' | 'drop' | 'delegate', string[]> = { plan: [], do: [], drop: [], delegate: [] };
  for (const r of rows) {
    const n = byId.get(r.id);
    if (!n || n.state === 'done' || n.state === 'archived' || (!n.important && !n.urgent)) continue;
    const k = n.important ? (n.urgent ? 'do' : 'plan') : 'delegate';
    q[k].push(`${r.code ? `${r.code} ` : ''}${r.title}`);
  }
  // „liegen lassen“ nur, was ausdrücklich weder wichtig noch dringend ist, wäre unbestimmt – dort stehen offene Vorgänge ohne beide Marken nicht
  const W = 760;
  const H = 520;
  const x0 = 70;
  const y0 = 60;
  const gw = 300;
  const gh = 190;
  const parts: string[] = [];
  parts.push(`<rect x="${x0 + 40}" y="6" width="${2 * gw - 80}" height="40" rx="6" fill="url(#fgHead)" filter="url(#fgShadow)"/>`);
  parts.push(`<text x="${x0 + gw}" y="33" text-anchor="middle" font-size="19" font-weight="bold" fill="#fff">${esc(`${dmy(day)} ${p.charter?.no ? `${p.name} - ${p.charter.no}` : p.name}`.slice(0, 54))}</text>`);
  parts.push(`<rect x="${x0}" y="${y0}" width="${2 * gw}" height="${2 * gh}" rx="8" fill="url(#fgGray)" stroke="${LOOK.grayLine}" filter="url(#fgShadow)"/>`);
  parts.push(`<line x1="${x0 + gw}" y1="${y0 + 8}" x2="${x0 + gw}" y2="${y0 + 2 * gh - 8}" stroke="#fff" stroke-width="3"/><line x1="${x0 + gw}" y1="${y0 + 8}" x2="${x0 + gw}" y2="${y0 + 2 * gh - 8}" stroke="#555" stroke-width="1"/>`);
  parts.push(`<line x1="${x0 + 8}" y1="${y0 + gh}" x2="${x0 + 2 * gw - 8}" y2="${y0 + gh}" stroke="#fff" stroke-width="3"/><line x1="${x0 + 8}" y1="${y0 + gh}" x2="${x0 + 2 * gw - 8}" y2="${y0 + gh}" stroke="#555" stroke-width="1"/>`);
  const corner = (x: number, y: number, t: string, anchor: 'start' | 'end') => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="11" fill="${LOOK.muted}">${t}</text>`;
  parts.push(corner(x0 + 10, y0 + 16, 'planen', 'start'), corner(x0 + 2 * gw - 10, y0 + 16, 'erledigen', 'end'), corner(x0 + 10, y0 + 2 * gh - 8, 'liegen lassen', 'start'), corner(x0 + 2 * gw - 10, y0 + 2 * gh - 8, 'delegieren', 'end'));
  const items = (list: string[], x: number, y: number, tone: string, bold: boolean) => {
    const out: string[] = [];
    let yy = y;
    const maxY = y + gh - 44;
    for (let i = 0; i < list.length; i++) {
      const lines = wrap(`- ${list[i]}`, 44, 2);
      if (yy + lines.length * 14 > maxY) {
        out.push(`<text x="${x}" y="${yy}" font-size="10" fill="${LOOK.muted}">… und ${list.length - i} weitere</text>`);
        break;
      }
      lines.forEach((l, j) => out.push(`<text x="${x}" y="${yy + j * 13}" font-size="11"${bold ? ' font-weight="bold"' : ''} fill="${tone}">${esc(l)}</text>`));
      yy += lines.length * 13 + 9;
    }
    return out.join('');
  };
  parts.push(items(q.plan, x0 + 14, y0 + 40, LOOK.wine, true), items(q.do, x0 + gw + 14, y0 + 40, LOOK.wine, true), items(q.drop, x0 + 14, y0 + gh + 30, LOOK.ink, false), items(q.delegate, x0 + gw + 14, y0 + gh + 30, LOOK.ink, true));
  // Achsen
  parts.push(`<text transform="translate(${x0 - 30} ${y0 + gh}) rotate(-90)" text-anchor="middle" font-size="22" font-weight="bold" fill="${LOOK.wine}">Wichtigkeit</text>`);
  parts.push(`<text transform="translate(${x0 - 8} ${y0 + gh / 2}) rotate(-90)" text-anchor="middle" font-size="10" fill="${LOOK.muted}">sehr</text><text transform="translate(${x0 - 8} ${y0 + gh * 1.5}) rotate(-90)" text-anchor="middle" font-size="10" fill="${LOOK.muted}">nicht</text>`);
  parts.push(`<text x="${x0 + gw / 2}" y="${y0 + 2 * gh + 16}" text-anchor="middle" font-size="11" fill="${LOOK.muted}">nicht</text><text x="${x0 + gw * 1.5}" y="${y0 + 2 * gh + 16}" text-anchor="middle" font-size="11" fill="${LOOK.muted}">sehr</text>`);
  parts.push(`<text x="${x0 + gw}" y="${y0 + 2 * gh + 44}" text-anchor="middle" font-size="22" font-weight="bold" fill="#9b9b9b">Dringlichkeit</text>`);
  parts.push(`<text transform="translate(${x0 + 2 * gw + 30} ${y0 + gh}) rotate(90)" text-anchor="middle" font-size="30" font-weight="bold" fill="#9b9b9b">Eisenhower-Matrix</text>`);
  const n = q.do.length + q.plan.length + q.delegate.length;
  return n ? svgWrap(W, H, `Eisenhower-Matrix: ${q.do.length} erledigen, ${q.plan.length} planen, ${q.delegate.length} delegieren`, parts.join('')) : '';
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
  const lines = (x: number, y: number, ls: string[], o2: { size?: number; bold?: boolean; fill?: string; rot?: number } = {}) => {
    const size = o2.size ?? 10;
    const tr = o2.rot ? ` transform="rotate(${o2.rot} ${x} ${y})"` : '';
    const y0 = y - ((ls.length - 1) * (size + 2)) / 2;
    return `<g${tr}>${ls.map((l, i) => `<text x="${x}" y="${(y0 + i * (size + 2)).toFixed(1)}" text-anchor="middle" font-size="${size}"${o2.bold ? ' font-weight="bold"' : ''} fill="${o2.fill ?? LOOK.ink}">${esc(l)}</text>`).join('')}</g>`;
  };
  const head = (x: number, y: number, t: string, rot = 0) => lines(x, y, [t], { size: 13, bold: true, fill: LOOK.wine, rot });
  // Empfänger außen (oben Sachebene, rechts Appell, unten Beziehung, links Selbstkundgabe), Sender innen
  const outerMid = (o + e) / 2;
  const sendMid = (e + s) / 2;
  const cap = (t: string | undefined, chars: number, max: number) => wrap(t || '–', chars, max);
  parts.push(head(S / 2, o + 20, 'Empfänger'), lines(S / 2, outerMid + 14, cap(m.rFact, 78, 4), { bold: true, size: 12 }));
  parts.push(head(S / 2, e + 18, 'Sender'), lines(S / 2, sendMid + 14, cap(m.sFact, 54, 3), { bold: true, size: 12 }));
  parts.push(head(S / 2, S - e - 64, 'Sender'), lines(S / 2, S - sendMid + 10, cap(m.sRel, 54, 3), { bold: true, size: 12 }));
  parts.push(head(S / 2, S - o - 74, 'Empfänger'), lines(S / 2, S - outerMid + 12, cap(m.rRel, 78, 4), { bold: true, size: 12 }));
  parts.push(head(o + 20, S / 2, 'Empfänger', -90), lines(outerMid + 14, S / 2, cap(m.rSelf, 78, 4), { bold: true, size: 12, rot: -90 }));
  parts.push(head(e + 18, S / 2, 'Sender', -90), lines(sendMid + 12, S / 2, cap(m.sSelf, 54, 3), { bold: true, size: 12, rot: -90 }));
  parts.push(head(S - e - 18, S / 2, 'Sender', -90), lines(S - sendMid - 2, S / 2, cap(m.sAppeal, 54, 3), { bold: true, size: 12, rot: -90 }));
  parts.push(head(S - o - 20, S / 2, 'Empfänger', -90), lines(S - outerMid - 2, S / 2, cap(m.rAppeal, 78, 4), { bold: true, size: 12, rot: -90 }));
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
  parts.push(lines(S / 2, c + 34, ['Nachricht'], { size: 22, bold: true, fill: LOOK.wine }), lines(S / 2, c + 76, cap(m.message, 34, 4), { size: 14, bold: true }));
  parts.push(lines(S / 2, S / 2 + 34, ['Reaktion'], { size: 22, bold: true, fill: LOOK.wine }), lines(S / 2, S / 2 + 76, cap(m.reaction, 34, 4), { size: 14, bold: true }));
  parts.push(`<text transform="translate(${S + 62} ${S}) rotate(-90)" font-size="64" font-weight="bold" fill="#b3b3b3">Nachrichtenquadrat</text><text transform="translate(${S + 84} ${S}) rotate(-90)" font-size="18" font-weight="bold" fill="#9a9a9a">nach Schulz von Thun</text>`);
  return svgWrap(S + 92, S, `Nachrichtenquadrat: ${m.topic}${m.message ? ` – Nachricht „${m.message}“` : ''}`, parts.join(''));
}

/** Kennung der Grafik eines Formulars (FormDef.figure). */
export type FigureKind = 'goalTree' | 'org' | 'phasePlan' | 'psp' | 'gantt' | 'load' | 'wpReport' | 'belbin' | 'eisenhower' | 'square';
/** Grafik eines Formulars mit Layout `figure` (leer, wenn noch nichts zu zeichnen ist). */
export function figureSvg(ws: Workspace, pid: string, kind: FigureKind | undefined, o: { person?: string; row?: string; day?: string } = {}): string {
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
      return eisenhowerSvg(ws, pid, o.day ?? new Date().toISOString().slice(0, 10));
    case 'square':
      return squareSvg(p, o.row);
  }
  return '';
}
