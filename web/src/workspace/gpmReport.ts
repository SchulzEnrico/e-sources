/**
 * F-226 Stufe 2 (V113, Doc F-226 „Ausgabe“): Projektbericht nach GPM-Leitfaden Z01D Rev. 09 – alle Formulare der
 * Vorlage in Kapitelreihenfolge als ein druckbares HTML-Dokument (im Browser „Als PDF sichern“), mit Kopf- und
 * Fußzeile wie im Report („Z20-0173 · Projekt · Version · Seite x von y“). Dazu die Grafiken als SVG-Text:
 * Kostenganglinie mit Summenlinie (ICB4 4.5.7), Umfeld- und Stakeholder-Portfolio (ICB4 4.5.12) – dieselben
 * Bausteine zeigt die Oberfläche (ProjectForms). Reine Funktionen; Tests in gpm.test.ts („Stufe 2“).
 */
import { qrSvg } from './qr';
import { projectLinkUrl } from './projectLink';
import type { FormDef, Project, Workspace } from './types';
import * as Fk from './formKit';
import { costCurve, earnedValue, evCurve, mtaOf, portfolioOf, projectStatus, type CostCurve, type EvCurve, type Mta } from './gpmCalc';
import { personById } from './persons';
import { projectById, rolesOf } from './projects';
import { envPortfolioSvg, figureSvg, shPortfolioSvg } from './gpmFigures';
import * as Sh from './sheets';
import { charterView, CHARTER_EXTRAS } from './charterSheet';
import { staffLines, wpView } from './wpSheet';
import { BELBIN } from './gpm';
import * as Fb from './feedback';
import * as Dc from './decisions';

export const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const dmy = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}` : d);
const eur = (v: number) => `${v.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €`;

/** Wert einer Zelle als lesbarer Text (Auswahl als Name, Person als Name, Datum TT.MM.JJJJ, Geld mit €). */
export function displayValue(ws: Workspace, p: Project, col: Fk.FormCol, v: Fk.CellValue): string {
  if (v === undefined || v === '' || v === null) return '';
  if (col.kind === 'bool') return v === true ? 'ja' : 'nein';
  if (col.kind === 'date' && typeof v === 'string') return dmy(v);
  if (col.kind === 'money' && typeof v === 'number') return `${Fk.fmtNumber(v, 'money')} €`;
  if (col.kind === 'pct' && typeof v === 'number') return `${String(v).replace('.', ',')} %`;
  if (typeof v === 'number') return Fk.fmtNumber(v, col.kind, col.digits);
  if (col.kind === 'choice') return col.options?.find((o) => o.v === v)?.label ?? String(v);
  if (col.kind === 'person') return personById(ws, String(v))?.name ?? String(v);
  if (col.kind === 'goal') {
    const g = p.goals?.find((x) => x.id === v);
    return g ? `${g.code ? `${g.code} ` : ''}${g.text.split('\n')[0]}` : String(v);
  }
  if (col.kind === 'phase') return p.phases?.find((x) => x.id === v)?.name ?? String(v);
  if (col.kind === 'role') return p.roles?.find((x) => x.id === v)?.name ?? String(v);
  return String(v);
}

// ---------------------------------------------------------------- Grafiken (SVG-Text)

export interface SvgColors {
  ink: string;
  muted: string;
  line: string;
  bar: string;
  sum: string;
  budget: string;
  dot: string;
}
export const PRINT_COLORS: SvgColors = { ink: '#1b1b1b', muted: '#666', line: '#ccc', bar: '#9bb7d4', sum: '#b3261e', budget: '#2e7d32', dot: '#b3261e' };

/** Kostenganglinie (Balken je Monat) mit Summenlinie und Budget als Linie; `w` × `h` in px. */
export function curveSvg(c: CostCurve, col: SvgColors, w = 640, h = 260, title = 'Kostenganglinie'): string {
  const ms = c.months;
  if (!ms.length) return '';
  const pad = { l: 64, r: 64, t: 16, b: 40 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const maxBar = Math.max(1, ...ms.map((m) => m.cost));
  const maxSum = Math.max(1, c.budget ?? 0, ms[ms.length - 1].costSum);
  const bw = iw / ms.length;
  const y1 = (v: number) => pad.t + ih - (v / maxBar) * ih;
  const y2 = (v: number) => pad.t + ih - (v / maxSum) * ih;
  const parts: string[] = [];
  parts.push(`<line x1="${pad.l}" y1="${pad.t + ih}" x2="${pad.l + iw}" y2="${pad.t + ih}" stroke="${col.line}"/>`);
  for (const f of [0.5, 1]) {
    parts.push(`<line x1="${pad.l}" y1="${y1(maxBar * f)}" x2="${pad.l + iw}" y2="${y1(maxBar * f)}" stroke="${col.line}" stroke-dasharray="2 4"/>`);
    parts.push(`<text x="${pad.l - 6}" y="${y1(maxBar * f) + 4}" text-anchor="end" font-size="10" fill="${col.muted}">${esc(eur(maxBar * f))}</text>`);
    parts.push(`<text x="${pad.l + iw + 6}" y="${y2(maxSum * f) + 4}" font-size="10" fill="${col.sum}">${esc(eur(maxSum * f))}</text>`);
  }
  ms.forEach((m, i) => {
    const x = pad.l + i * bw;
    parts.push(`<rect x="${(x + bw * 0.15).toFixed(1)}" y="${y1(m.cost).toFixed(1)}" width="${(bw * 0.7).toFixed(1)}" height="${(pad.t + ih - y1(m.cost)).toFixed(1)}" fill="${col.bar}"><title>${esc(`${m.month.slice(5, 7)}/${m.month.slice(0, 4)}: ${eur(m.cost)}`)}</title></rect>`);
    if (ms.length <= 18 || i % Math.ceil(ms.length / 12) === 0) parts.push(`<text x="${(x + bw / 2).toFixed(1)}" y="${pad.t + ih + 14}" text-anchor="middle" font-size="10" fill="${col.muted}">${m.month.slice(5, 7)}/${m.month.slice(2, 4)}</text>`);
  });
  const pts = ms.map((m, i) => `${(pad.l + i * bw + bw / 2).toFixed(1)},${y2(m.costSum).toFixed(1)}`).join(' ');
  parts.push(`<polyline points="${pts}" fill="none" stroke="${col.sum}" stroke-width="2"/>`);
  ms.forEach((m, i) => parts.push(`<circle cx="${(pad.l + i * bw + bw / 2).toFixed(1)}" cy="${y2(m.costSum).toFixed(1)}" r="2.5" fill="${col.sum}"><title>${esc(`Summe ${m.month.slice(5, 7)}/${m.month.slice(0, 4)}: ${eur(m.costSum)}`)}</title></circle>`));
  if (c.budget) parts.push(`<line x1="${pad.l}" y1="${y2(c.budget)}" x2="${pad.l + iw}" y2="${y2(c.budget)}" stroke="${col.budget}" stroke-dasharray="6 3"/><text x="${pad.l + 4}" y="${y2(c.budget) - 4}" font-size="10" fill="${col.budget}">Budget ${esc(eur(c.budget))}</text>`);
  // Legende
  parts.push(`<rect x="${pad.l}" y="${h - 14}" width="10" height="10" fill="${col.bar}"/><text x="${pad.l + 14}" y="${h - 5}" font-size="10" fill="${col.ink}">Plan-Kosten je Monat (linke Achse)</text>`);
  parts.push(`<line x1="${pad.l + 220}" y1="${h - 9}" x2="${pad.l + 240}" y2="${h - 9}" stroke="${col.sum}" stroke-width="2"/><text x="${pad.l + 244}" y="${h - 5}" font-size="10" fill="${col.ink}">Summenlinie (rechte Achse)</text>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="${esc(`${title}: ${ms.length} Monate, gesamt ${eur(c.total)}`)}">${parts.join('')}</svg>`;
}

/** V115: Meilenstein-Trendanalyse – waagerecht die Berichtszeitpunkte, senkrecht der prognostizierte Termin je Meilenstein;
 * die Winkelhalbierende (Prognose = Berichtstag) zeigt, wann ein Meilenstein erreicht ist. Steigt eine Linie, rutscht der Termin.
 * V134 (Enrico 11:30 „Darstellung eine Katastrophe“): klassisches MTA-Dreieck – beide Achsen dieselbe Zeitachse (Monate),
 * Berichte nach Datum statt gleichmäßig verteilt, Diagonale über die ganze Fläche, Raster je Monat, Meilensteine als
 * Linien bis zum letzten Bericht, Beschriftung rechts voll ausgeschrieben, ohne Überlappung, mit Führungslinie. */
export function mtaSvg(m: Mta, names: Map<string, string>, col: SvgColors, w = 720, h = 440): string {
  const rows = m.rows.filter((r) => r.series.some(Boolean));
  if (!rows.length || !m.points.length) return '';
  const days = [...m.points.map((x) => x.day), ...rows.flatMap((r) => r.series.filter((x): x is string => !!x))].sort();
  // Monatsanfang vor dem frühesten bis Monatsende nach dem spätesten Termin
  const lo = Date.parse(`${days[0].slice(0, 7)}-01`);
  const last = new Date(Date.parse(days[days.length - 1]));
  const hi = Date.UTC(last.getUTCFullYear(), last.getUTCMonth() + 1, 1);
  const pad = { l: 62, r: 230, t: 12, b: 52 };
  const side = Math.min(w - pad.l - pad.r, h - pad.t - pad.b);
  const iw = side;
  const ih = side;
  const t = (d: string) => (Date.parse(d) - lo) / (hi - lo);
  const x = (d: string) => pad.l + t(d) * iw;
  const y = (d: string) => pad.t + ih - t(d) * ih;
  const f = (n: number) => n.toFixed(1);
  const dm = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(2, 4)}`;
  const MON = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  const parts: string[] = [];
  // Raster je Monat (beide Achsen), Beschriftung bei höchstens 12 Monaten jeden, sonst jeden zweiten
  const months: string[] = [];
  for (let d = new Date(lo); d.getTime() <= hi; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) months.push(d.toISOString().slice(0, 10));
  const every = months.length > 13 ? 2 : 1;
  months.forEach((d, i) => {
    parts.push(`<line x1="${f(x(d))}" y1="${pad.t}" x2="${f(x(d))}" y2="${pad.t + ih}" stroke="${col.line}" stroke-opacity="0.6"/>`);
    parts.push(`<line x1="${pad.l}" y1="${f(y(d))}" x2="${pad.l + iw}" y2="${f(y(d))}" stroke="${col.line}" stroke-opacity="0.6"/>`);
    if (i % every || i === months.length - 1) return;
    const mid = new Date(Date.parse(d) + 15 * 864e5).toISOString().slice(0, 10);
    const lab = `${MON[Number(d.slice(5, 7)) - 1]} ${d.slice(2, 4)}`;
    parts.push(`<text x="${f(x(mid))}" y="${pad.t + ih + 13}" text-anchor="middle" font-size="9" fill="${col.muted}">${lab}</text>`);
    parts.push(`<text x="${pad.l - 5}" y="${f(y(mid) + 3)}" text-anchor="end" font-size="9" fill="${col.muted}">${lab}</text>`);
  });
  parts.push(`<rect x="${pad.l}" y="${pad.t}" width="${iw}" height="${ih}" fill="none" stroke="${col.ink}" stroke-opacity="0.5"/>`);
  // Winkelhalbierende: Prognose = Berichtstag; darüber noch offen, auf der Linie erreicht
  parts.push(`<line x1="${pad.l}" y1="${pad.t + ih}" x2="${pad.l + iw}" y2="${pad.t}" stroke="${col.ink}" stroke-opacity="0.55" stroke-dasharray="5 3"/>`);
  parts.push(`<polygon points="${pad.l},${pad.t + ih} ${pad.l + iw},${pad.t} ${pad.l + iw},${pad.t + ih}" fill="${col.line}" fill-opacity="0.25"/>`);
  // Berichtszeitpunkte als senkrechte Marken unten
  m.points.forEach((pt) => {
    parts.push(`<line x1="${f(x(pt.day))}" y1="${pad.t}" x2="${f(x(pt.day))}" y2="${pad.t + ih}" stroke="${col.muted}" stroke-dasharray="2 3"/>`);
    parts.push(`<text x="${f(x(pt.day))}" y="${pad.t + ih + 26}" text-anchor="middle" font-size="9.5" font-weight="bold" fill="${col.ink}">${esc(pt.label)}</text>`);
  });
  parts.push(`<text x="${pad.l + iw / 2}" y="${pad.t + ih + 40}" text-anchor="middle" font-size="10.5" fill="${col.ink}">Berichtszeitpunkt</text>`);
  parts.push(`<text x="12" y="${pad.t + ih / 2}" text-anchor="middle" font-size="10.5" fill="${col.ink}" transform="rotate(-90 12 ${pad.t + ih / 2})">Prognostizierter Termin</text>`);
  const palette = [col.sum, col.budget, '#3f6fa8', '#c88a2e', '#7a5cc4', '#3a9bb0', '#b0567a', '#6b8e23', '#8a6d3b', '#d0606a'];
  // Beschriftung rechts: nach Termin sortiert, Mindestabstand 13 px, in die Fläche geklemmt
  const labs = rows.map((r, k) => {
    const c = palette[k % palette.length];
    const idx = r.series.map((d, i) => (d ? i : -1)).filter((i) => i >= 0);
    const lastI = idx[idx.length - 1];
    return { r, c, lastI, lastD: r.series[lastI]!, ly: y(r.series[lastI]!) };
  }).sort((a, b) => b.ly - a.ly);
  const gap = 13;
  for (let i = 1; i < labs.length; i++) labs[i].ly = Math.min(labs[i].ly, labs[i - 1].ly - gap);
  const over = pad.t + 4 - labs[labs.length - 1].ly;
  if (over > 0) for (const l of labs) l.ly += over;
  for (let i = labs.length - 2; i >= 0; i--) labs[i].ly = Math.max(labs[i].ly, labs[i + 1].ly + gap);
  for (const { r, c, lastI, lastD, ly } of labs) {
    const nm = names.get(r.id) ?? r.id;
    const pts = r.series.map((d, i) => (d ? `${f(x(m.points[i].day))},${f(y(d))}` : '')).filter(Boolean);
    if (pts.length > 1) parts.push(`<polyline points="${pts.join(' ')}" fill="none" stroke="${c}" stroke-width="2"/>`);
    r.series.forEach((d, i) => d && parts.push(`<circle cx="${f(x(m.points[i].day))}" cy="${f(y(d))}" r="3.5" fill="${r.done ? '#fff' : c}" stroke="${c}" stroke-width="1.5"><title>${esc(`${nm}: ${dm(d)} (${m.points[i].label})`)}</title></circle>`));
    const lx = x(m.points[lastI].day);
    const tx = pad.l + iw + 10;
    parts.push(`<polyline points="${f(lx + 4)},${f(y(lastD))} ${f(pad.l + iw + 2)},${f(y(lastD))} ${f(tx - 2)},${f(ly)}" fill="none" stroke="${c}" stroke-opacity="0.45"/>`);
    const full = nm.length > 38 ? `${nm.slice(0, 37)}…` : nm;
    parts.push(`<text x="${f(tx)}" y="${f(ly + 3.5)}" font-size="9.5" fill="${c}">${esc(full)}<title>${esc(`${nm}: ${dm(lastD)}`)}</title></text>`);
  }
  parts.push(`<text x="${pad.l + iw + 10}" y="${h - 6}" font-size="9" fill="${col.muted}">Gestrichelt: Termin = Berichtstag (erreicht) · ○ erledigt</text>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="${esc(`Meilenstein-Trendanalyse: ${rows.length} Meilensteine, ${m.points.length} Zeitpunkte`)}">${parts.join('')}</svg>`;
}

/** V118: Earned Value über die Zeit (ICB4 4.5.7) – Planwert PV als Linie über die Laufzeit, Fertigstellungswert EV
 * und Ist-Kosten AC aus den Statusberichten bis zum Stichtag, gestrichelt die Prognose bis EAC am Ende; BAC und Budget
 * als Bezugslinien. Eine Achse (€), Linien unterscheiden sich auch in Strich und Punktform (nicht nur in der Farbe). */
export function evSvg(c: EvCurve, col: SvgColors, w = 640, h = 300): string {
  if (c.bac <= 0 || (!c.pv.length && c.points.length < 2)) return '';
  const all = [...c.pv.map((x) => x.day), ...c.points.map((x) => x.day)].sort();
  const lo = Date.parse(all[0]);
  const hi = Math.max(lo + 864e5, Date.parse(all[all.length - 1]));
  const raw = Math.max(1, c.bac, c.eac, c.budget ?? 0, ...c.points.map((x) => Math.max(x.ev, x.ac))) * 1.06;
  // runde Teilung: 1, 2, 2,5 oder 5 × 10^k, höchstens 5 Linien
  const mag = 10 ** Math.floor(Math.log10(raw / 4));
  const tick = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((t) => raw / t <= 5) ?? 10 * mag;
  const top = Math.ceil(raw / tick) * tick;
  const pad = { l: 70, r: 96, t: 16, b: 52 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const x = (d: string) => pad.l + ((Date.parse(d) - lo) / (hi - lo)) * iw;
  const y = (v: number) => pad.t + ih - (v / top) * ih;
  const f = (n: number) => n.toFixed(1);
  const dm = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(2, 4)}`;
  const c3 = { pv: col.bar, ev: col.budget, ac: col.sum };
  const parts: string[] = [];
  parts.push(`<line x1="${pad.l}" y1="${pad.t + ih}" x2="${pad.l + iw}" y2="${pad.t + ih}" stroke="${col.line}"/>`);
  for (let v = tick; v <= top + 0.5; v += tick) {
    parts.push(`<line x1="${pad.l}" y1="${f(y(v))}" x2="${pad.l + iw}" y2="${f(y(v))}" stroke="${col.line}" stroke-dasharray="2 4"/>`);
    parts.push(`<text x="${pad.l - 6}" y="${f(y(v) + 4)}" text-anchor="end" font-size="10" fill="${col.muted}">${esc(eur(v))}</text>`);
  }
  // Monatsmarken unten (höchstens 12 Beschriftungen)
  const isMonthEnd = (d: string) => new Date(Date.parse(d) + 864e5).getUTCDate() === 1;
  const months = c.pv.map((p) => p.day).filter(isMonthEnd);
  const step = Math.max(1, Math.ceil(months.length / 12));
  months.forEach((d, i) => {
    if (i % step) return;
    parts.push(`<text x="${f(x(d))}" y="${pad.t + ih + 14}" text-anchor="middle" font-size="10" fill="${col.muted}">${d.slice(5, 7)}/${d.slice(2, 4)}</text>`);
  });
  const ref = (v: number, label: string, color: string, dash: string, right = false) => {
    parts.push(`<line x1="${pad.l}" y1="${f(y(v))}" x2="${pad.l + iw}" y2="${f(y(v))}" stroke="${color}" stroke-dasharray="${dash}"/><text x="${right ? pad.l + iw / 2 : pad.l + 4}" y="${f(y(v) - 4)}" font-size="10" fill="${col.ink}">${esc(`${label} ${eur(v)}`)}</text>`);
  };
  if (c.bac > 0) ref(c.bac, 'BAC (Plan-Kosten)', col.muted, '6 3');
  // Budget nah an BAC: Beschriftung in die Mitte, damit sie sich nicht überdecken
  if (c.budget && Math.abs(c.budget - c.bac) > 0.5) ref(c.budget, 'Budget', col.budget, '1 3', Math.abs(y(c.budget) - y(c.bac)) < 14);
  // Stichtag
  const today = c.points[c.points.length - 1];
  parts.push(`<line x1="${f(x(today.day))}" y1="${pad.t}" x2="${f(x(today.day))}" y2="${pad.t + ih}" stroke="${col.muted}" stroke-dasharray="3 3"/><text x="${f(x(today.day))}" y="${pad.t + ih + 26}" text-anchor="middle" font-size="10" fill="${col.ink}">${esc(`Stichtag ${dm(today.day)}`)}</text>`);
  // PV
  if (c.pv.length > 1) {
    parts.push(`<polyline points="${c.pv.map((p) => `${f(x(p.day))},${f(y(p.v))}`).join(' ')}" fill="none" stroke="${c3.pv}" stroke-width="3"/>`);
    c.pv.forEach((p) => parts.push(`<circle cx="${f(x(p.day))}" cy="${f(y(p.v))}" r="6" fill="transparent"><title>${esc(`PV ${dm(p.day)}: ${eur(p.v)}`)}</title></circle>`));
    const last = c.pv[c.pv.length - 1];
    parts.push(`<text x="${f(x(last.day) + 8)}" y="${f(y(last.v) + 4)}" font-size="10" fill="${col.ink}">PV</text>`);
  }
  // EV und AC mit Prognose
  const line = (key: 'ev' | 'ac', color: string, shape: 'circle' | 'square', label: string) => {
    const pts = c.points;
    if (pts.length > 1) parts.push(`<polyline points="${pts.map((p) => `${f(x(p.day))},${f(y(p[key]))}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2"/>`);
    for (const p of pts) {
      const tip = `<title>${esc(`${label} ${dm(p.day)}: ${eur(p[key])}${p.from === 'report' ? ' (Statusbericht)' : ' (Stichtag)'}${key === 'ev' && p.est ? ', geschätzt aus Fortschritt Leistung' : ''}`)}</title>`;
      const hollow = key === 'ev' && p.est;
      const fill = hollow ? 'none' : color;
      parts.push(shape === 'circle'
        ? `<circle cx="${f(x(p.day))}" cy="${f(y(p[key]))}" r="4" fill="${fill}" stroke="${color}" stroke-width="2">${tip}</circle>`
        : `<rect x="${f(x(p.day) - 4)}" y="${f(y(p[key]) - 4)}" width="8" height="8" fill="${fill}" stroke="${color}" stroke-width="2">${tip}</rect>`);
    }
    parts.push(`<text x="${f(x(today.day) + 8)}" y="${f(y(today[key]) + (key === 'ac' && Math.abs(y(today.ac) - y(today.ev)) < 12 ? (today.ac >= today.ev ? -6 : 14) : 4))}" font-size="10" fill="${col.ink}">${key.toUpperCase()}</text>`);
  };
  line('ev', c3.ev, 'circle', 'EV');
  line('ac', c3.ac, 'square', 'AC');
  if (c.end && today.day < c.end && (!c.start || today.day >= c.start) && today.ac > 0 && c.eac > 0) {
    parts.push(`<line x1="${f(x(today.day))}" y1="${f(y(today.ac))}" x2="${f(x(c.end))}" y2="${f(y(c.eac))}" stroke="${c3.ac}" stroke-width="2" stroke-dasharray="5 4"/><rect x="${f(x(c.end) - 4)}" y="${f(y(c.eac) - 4)}" width="8" height="8" fill="none" stroke="${c3.ac}" stroke-width="2"><title>${esc(`EAC (Prognose bei Abschluss) ${dm(c.end)}: ${eur(c.eac)}`)}</title></rect><text x="${f(x(c.end) + 8)}" y="${f(y(c.eac) + (Math.abs(y(c.eac) - y(c.bac)) < 14 ? (c.eac >= c.bac ? -8 : 18) : 4))}" font-size="10" fill="${col.ink}">${esc(`EAC ${eur(c.eac)}`)}</text>`);
  }
  // Legende
  const ly = h - 8;
  parts.push(`<line x1="${pad.l}" y1="${ly - 4}" x2="${pad.l + 18}" y2="${ly - 4}" stroke="${c3.pv}" stroke-width="3"/><text x="${pad.l + 22}" y="${ly}" font-size="10" fill="${col.ink}">PV Planwert</text>`);
  parts.push(`<circle cx="${pad.l + 106}" cy="${ly - 4}" r="4" fill="${c3.ev}"/><text x="${pad.l + 114}" y="${ly}" font-size="10" fill="${col.ink}">EV Fertigstellungswert</text>`);
  parts.push(`<rect x="${pad.l + 236}" y="${ly - 8}" width="8" height="8" fill="${c3.ac}"/><text x="${pad.l + 248}" y="${ly}" font-size="10" fill="${col.ink}">AC Ist-Kosten · gestrichelt: Prognose EAC</text>`);
  const t = c.points[c.points.length - 1];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="${esc(`Earned Value am ${dm(t.day)}: EV ${eur(t.ev)}, AC ${eur(t.ac)}, BAC ${eur(c.bac)}, EAC ${eur(c.eac)}`)}">${parts.join('')}</svg>`;
}

/** Grafik eines Formulars mit Layout `chart` bzw. `portfolio` (sonst ''). */
/** Code + Titel der Meilensteine für die MTA-Beschriftung. */
export function mtaNames(ws: Workspace, pid: string): Map<string, string> {
  const f = Fk.GPM_D.forms.find((x) => x.source === 'mta')!;
  return new Map(Fk.rowsOf(ws, pid, f).map((r) => [r.id, [Fk.cellValue(ws, pid, f, r.id, 'code'), Fk.cellValue(ws, pid, f, r.id, 'title')].filter(Boolean).join(' ')]));
}
export function formSvg(ws: Workspace, pid: string, form: FormDef, col: SvgColors): string {
  const p = projectById(ws, pid);
  if (form.source === 'mta') return mtaSvg(mtaOf(ws, pid, Fk.evDay()), mtaNames(ws, pid), col);
  if (form.source === 'ev') return evSvg(evCurve(ws, pid, Fk.evDay()), col);
  if (form.layout === 'chart') return curveSvg(costCurve(ws, pid), col);
  // V141 (Enrico 14:58): Portfolios im Aussehen der Eisenhower-Matrix
  if (form.layout === 'portfolio' && p) return form.filter === 'sh' ? shPortfolioSvg(p, portfolioOf(p), undefined, true) : envPortfolioSvg(p, portfolioOf(p), undefined, true);
  return '';
}

// ---------------------------------------------------------------- Bericht

/** Projektbericht als HTML-Dokument; `version` z. B. App-Version oder Berichtsstand, `day` Stichtag. */
/** V144 (F-238 S6): Unterschriften eines Projekts – Steckbrief (2.1), Arbeitspaketbeschreibung (8.3), AP-Statusbericht (12.1). */
export interface ReportSign {
  label: string;
  name?: string;
  date?: string;
  ref?: string;
}
/** V145: Name der Projektleitung aus der Rolle „lead“ (Organigramm) – für die Freigabe-Zeilen ohne eigenes Namensfeld. */
export const leadName = (ws: Workspace, p: Project): string | undefined => personById(ws, rolesOf(p).find((x) => x.id === 'lead')?.person)?.name || undefined;
const ownerName = (ws: Workspace, noteId?: string): string | undefined => {
  const n = noteId ? (ws.notes ?? []).find((x) => x.id === noteId) : undefined;
  return (n?.assignee && personById(ws, n.assignee)?.name) || undefined;
};
export function reportSigns(ws: Workspace, p: Project, f: FormDef, rowId?: string): ReportSign[] {
  if (f.source === 'charter') {
    const c = p.charter ?? {};
    return [
      { label: 'Unterschrift Auftraggeber', name: c.signAg, date: c.releaseAg, ref: c.inkAg },
      { label: 'Unterschrift Projektleitung', name: c.signPl, date: c.releasePl, ref: c.inkPl },
    ];
  }
  if (f.source === 'wp' && rowId) {
    const n = (ws.notes ?? []).find((x) => x.id === rowId);
    const w = n?.wp ?? {};
    return [
      { label: 'Unterschrift AP-Verantwortlich', name: ownerName(ws, rowId), date: w.releaseOwner, ref: w.inkOwner },
      { label: 'Unterschrift Projektleitung', name: leadName(ws, p), date: w.releasePl, ref: w.inkPl },
    ];
  }
  if (f.source === 'reports' && rowId) {
    const r = (p.reports ?? []).find((x) => x.id === rowId);
    return r ? [{ label: 'Unterschrift Projektleitung', name: leadName(ws, p), date: r.date, ref: r.inkPl }] : [];
  }
  if (f.source === 'wpReports' && rowId) {
    const r = (p.wpReports ?? []).find((x) => x.id === rowId);
    if (!r) return [];
    return [
      { label: 'Unterschrift AP-Verantwortlich', name: ownerName(ws, r.wp), date: r.date, ref: r.inkOwner },
      { label: 'Unterschrift Projektleitung', name: leadName(ws, p), date: r.date, ref: r.inkPl },
    ];
  }
  // V148: Projektabschluss – Abnahme durch den Auftraggeber und Projektleitung (wie die Freigabe im Steckbrief)
  if (f.source === 'close') {
    const c = p.close ?? {};
    return [
      { label: 'Abnahme Auftraggeber', name: c.acceptedBy, date: c.acceptedOn },
      { label: 'Unterschrift Projektleitung', name: leadName(ws, p), date: c.date },
    ];
  }
  return [];
}
/** Alle Tinten-Schlüssel, die der Bericht eines Projekts braucht (zum Vorladen aus dem Gerätespeicher). */
export function reportInkRefs(ws: Workspace, pid: string): string[] {
  const p = projectById(ws, pid);
  if (!p) return [];
  const out = new Set<string>();
  const add = (l: ReportSign[]) => l.forEach((g) => g.ref && out.add(g.ref));
  for (const f of Fk.templateOf(ws, p).forms) {
    if (f.source === 'charter') add(reportSigns(ws, p, f));
    else if (f.source === 'wp' || f.source === 'wpReports' || f.source === 'reports') for (const r of Fk.rowsOf(ws, pid, f)) add(reportSigns(ws, p, f, r.id));
  }
  return [...out];
}
/** Freigabe-Zeile: Tinte (SVG) bzw. Name in Schreibschrift über der Linie, darunter Rolle und Datum. */
export function signRowHtml(signs: ReportSign[], inks?: ReadonlyMap<string, string>): string {
  if (!signs.length) return '';
  const one = (g: ReportSign) => {
    const svg = g.ref ? inks?.get(g.ref) : undefined;
    const top = svg
      ? `<img class="sign__ink" alt="${esc(`${g.label}${g.name ? ` (${g.name})` : ''}`)}" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}">`
      : g.name
        ? `<span class="sign__name">${esc(g.name)}</span>`
        : '<span class="sign__blank"></span>';
    return `<div class="sign">${top}${svg && g.name ? `<span class="sign__who">${esc(g.name)}</span>` : ''}<div class="sign__line">${esc([g.date ? dmy(g.date) : 'Datum', g.label].join(', '))}</div></div>`;
  };
  return `<tr class="release"><th scope="row">Freigabe</th><td><div class="signs">${signs.map(one).join('')}</div></td></tr>`;
}

/** V152: Bild-Schlüssel der Meldungen am Projekt (Anlage A) – zum Vorladen aus dem Gerätespeicher. */
export function reportPicRefs(ws: Workspace, pid: string): string[] {
  return Fb.feedbackOf(ws)
    .filter((f) => f.project === pid)
    .flatMap((f) => f.pics ?? []);
}

export function reportHtml(ws: Workspace, pid: string, o: { version?: string; day: string; inks?: ReadonlyMap<string, string>; base?: string; pics?: ReadonlyMap<string, string> }): string {
  const p = projectById(ws, pid);
  if (!p) return '';
  const tpl = Fk.templateOf(ws, p);
  const no = p.charter?.no ?? '';
  const head = [no, p.name].filter(Boolean).join(' · ');
  const st = projectStatus(ws, pid, o.day);
  const out: string[] = [];
  out.push(`<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>${esc(`Projektbericht ${head}`)}</title><style>
@page { size: A4; margin: 22mm 16mm 20mm;
  @top-left { content: "${cssText(head)}"; font: 9pt sans-serif; color: #555; }
  @top-right { content: "${cssText(tpl.name)}"; font: 9pt sans-serif; color: #555; }
  @bottom-left { content: "${cssText([`Projektbericht ${no || p.name}`, `Stand ${dmy(o.day)}`].join(' · '))}"; font: 9pt sans-serif; color: #888; }
  @bottom-center { content: "${cssText(`Version ${docVersion(p) ?? o.version ?? '1'}`)}"; font: 9pt sans-serif; color: #888; }
  @bottom-right { content: "Seite " counter(page) " von " counter(pages); font: 9pt sans-serif; color: #888; } }
body { font: 10.5pt/1.4 system-ui, -apple-system, "Segoe UI", sans-serif; color: #1b1b1b; margin: 0; }
h1 { font-size: 20pt; margin: 0 0 4pt; } h2 { font-size: 13pt; margin: 18pt 0 6pt; border-bottom: 1px solid #999; padding-bottom: 2pt; break-after: avoid; }
h3 { font-size: 11pt; margin: 10pt 0 4pt; break-after: avoid; }
.meta { color: #555; margin: 0 0 12pt; } .icb { color: #666; font-weight: normal; font-size: 9pt; }
.calc { display: block; color: #666; font-style: italic; font-weight: normal; font-size: 8.5pt; } .over { color: #d00000; }
table { border-collapse: collapse; width: 100%; margin: 4pt 0 8pt; font-size: 9pt; table-layout: fixed; } th, td { border: 1px solid #bbb; padding: 3pt 4pt; vertical-align: top; text-align: left; white-space: pre-wrap; overflow-wrap: anywhere; hyphens: auto; }
@page wide { size: A4 landscape; margin: 18mm 14mm 16mm; }
section.wide { page: wide; } #an-fb, #an-dc { break-before: page; } .annex__item { break-before: page; break-inside: avoid; } h2 + .annex__item { break-before: auto; } tr.annex__sec th { background: #d9d9d9; } .annex__pics { display: flex; flex-wrap: wrap; gap: 6px; } .annex__pics figure { margin: 0; break-inside: avoid; } .annex__pics img { display: block; max-width: 100%; max-height: 8cm; border: 1px solid #bbb; } .annex__pics figcaption { font-size: 8pt; color: #555; } section.wide table { font-size: 8pt; }
th { background: #eee; } thead { display: table-header-group; } tr { break-inside: avoid; }
table.kv th { width: 34%; } .empty { color: #777; font-style: italic; } .cover { break-after: page; } section { break-inside: auto; }
.sum td { font-weight: bold; }
.signs { display: grid; grid-template-columns: 1fr 1fr; gap: 0 12pt; } .sign { display: flex; flex-direction: column; justify-content: flex-end; min-height: 40pt; }
.sign__ink { height: 34pt; width: auto; align-self: flex-start; } .sign__name { font: 16pt "Segoe Script", "Brush Script MT", "Snell Roundhand", cursive; color: #1b2f8a; }
table.wpsheet { border: 2px solid #111; break-inside: avoid; } table.kv.wpsheet th { width: auto; background: #d9d9d9; } table.wpsheet col.wpsheet__l { width: 17%; } table.wpsheet th.wpsheet__head { background: #8a8a8a; color: #fff; font-size: 18pt; vertical-align: middle; padding-left: 12pt; } table.wpsheet td.sheethead__qr { padding: 3pt; background: #fff; } table.wpsheet td.sheethead__qr svg { display: block; width: 74pt; height: 74pt; }
table.charter > tbody > tr > th { width: 26%; } table.charter td.sub { padding: 0; } table.charter .grid { margin: 0; border: 0; } table.charter .grid th { background: #f6f6f6; font-weight: normal; } table.charter .grid.rows th { width: 34%; } td.is-strong { font-weight: bold; }
.sign__who { font-size: 8.5pt; } .sign__line { border-top: 1px solid #999; font-size: 8pt; color: #555; padding-top: 1pt; } tr.release td { white-space: normal; } figure { margin: 6pt 0; break-inside: avoid; }
@media screen { body { max-width: 900px; margin: 24px auto; padding: 0 16px; } .bar { position: sticky; top: 0; background: #fff; padding: 8px 0; border-bottom: 1px solid #ddd; } }
@media print { .bar { display: none; } }
</style></head><body>`);
  out.push(`<div class="bar"><button type="button" onclick="window.print()">Drucken bzw. als PDF sichern</button></div>`);
  out.push(`<div class="cover"><h1>Projektbericht ${esc(p.name)}</h1><p class="meta">${esc([no ? `Projektnummer ${no}` : '', p.charter?.client ? `Auftraggeber ${p.charter.client}` : '', `Stand ${dmy(o.day)}`].filter(Boolean).join(' · '))}</p>`);
  out.push(`<table class="kv"><tbody>`);
  const kv = (k: string, v: string) => v && out.push(`<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`);
  kv('Projektzeitraum', [p.start ? dmy(p.start) : '', p.end ? dmy(p.end) : ''].filter(Boolean).join(' – '));
  kv('Budget', p.budget !== undefined ? eur(p.budget) : '');
  kv('Plan-Aufwand / Ist', `${st.planHours.toLocaleString('de-DE')} Ph / ${st.actHours.toLocaleString('de-DE')} Ph`);
  kv('Plan-Kosten / Ist', `${eur(st.planCost)} / ${eur(st.actCost)}`);
  kv('Fortschritt Leistung', `${st.progWork} %`);
  kv('Arbeitspakete', `${st.done} erledigt · ${st.doing} laufend · ${st.open} offen`);
  kv('Vorlage', tpl.name);
  out.push(`</tbody></table><h2>Inhalt</h2><ol>`);
  for (const f of tpl.forms) out.push(`<li><a href="#f-${esc(f.id)}">${esc(`${f.chapter} ${f.name}`)}</a></li>`);
  const annex = annexSheets(ws, p, o.pics);
  for (const a of annex.toc) out.push(`<li><a href="#${a.id}">${esc(a.name)}</a></li>`);
  out.push(`</ol></div>`);
  for (const f of tpl.forms) out.push(formSection(ws, p, f, o.inks, o.base));
  // F-234 D7 (V137): Kapitel als Anlage einreihen (z. B. Zentraltabelle der Kosten)
  for (const a of p.annexes ?? []) {
    const f = a.form ? tpl.forms.find((x) => x.id === a.form) : undefined;
    if (!f) continue;
    out.push(formSection(ws, p, f, o.inks, o.base).replace(/<h2>[\s\S]*?<\/h2>/, `<h2>${esc(`${a.code ? `${a.code}: ` : ''}${a.title}`)} <span class="icb">${esc(`${f.chapter} ${f.name}`)}</span></h2>`).replace(/id="f-[^"]*"/, `id="a-${esc(a.id)}"`));
  }
  // V149 (F-232 P9): Problemstellungen und Entscheidungsvorlagen als Anlage – je Blatt eine Seite wie am Bildschirm
  out.push(annex.html);
  out.push(`</body></html>`);
  return out.join('\n');
}
/** V146 (F-232 P10): Version in der Fußzeile wie im Report („Version 1“) – aus 6.4 Dokumentation der Eintrag „Projektbericht“
 *  bzw. „Report“ (Titel oder Art), sonst die Version von E-Sources. */
export function docVersion(p: Project): string | undefined {
  const d = (p.docs ?? []).find((x) => /projektbericht|report/i.test(`${x.title} ${x.kind ?? ''}`) && x.version?.trim());
  return d?.version?.trim().replace(/^v(ersion)?\s*/i, '') || undefined;
}
const cssText = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ');

/** Datumsfelder, die in der Freigabe-Zeile unter der Unterschrift stehen (nicht doppelt als eigene Zeile). */
const SIGN_DATES = new Set(['charter:releaseAg', 'charter:releasePl', 'wp:releasePl', 'wp:releaseOwner', 'close:acceptedBy', 'close:acceptedOn']);
/** V148: Blätter, die alle Felder des Eintrags schon zeigen (Abb. 15) – darunter keine zweite Feldliste, nur eigene Felder. */
const SHEET_HAS_ALL = new Set(['wpReport', 'statusReport']);
/** V149: Blätter, die einen Teil der Felder zeigen (Belbin: Person und Punkte; Nachrichtenquadrat: Anlass als Überschrift,
 *  Nachricht, Reaktion und die acht Seiten) – darunter stehen nur die übrigen Felder. */
const SHEET_SHOWS: Record<string, ReadonlySet<string>> = {
  belbin: new Set(['person', ...BELBIN]),
  square: new Set(['topic', 'message', 'reaction', 'sFact', 'rFact', 'sSelf', 'rSelf', 'sRel', 'rRel', 'sAppeal', 'rAppeal']),
};

/** V147 (F-232): Kapitel 2.1 im Bericht in der Anordnung von Abbildung 3 – dieselben Werte wie das Blatt
 *  (`charterView`); eigene Felder der Vorlage vor der Freigabe, Ergänzungen nach ICB4 als Abschnitt darunter. */
export function charterHtml(ws: Workspace, p: Project, f: FormDef, cols: Fk.FormCol[], inks?: ReadonlyMap<string, string>): string {
  const c = p.charter ?? {};
  const v = charterView(ws, p);
  const shown = new Set(cols.map((x) => x.key));
  const txt = (x?: string | number) => (x === undefined || x === null ? '' : esc(String(x)));
  const num = (x?: number, unit = '€') => (x === undefined ? '' : `${x.toLocaleString('de-DE', { maximumFractionDigits: 2 })} ${unit}`);
  const row = (k: string, val: string, strong = false) => `<tr><th scope="row">${esc(k)}</th><td${strong ? ' class="is-strong"' : ''}>${val}</td></tr>`;
  const sub = (k: string, inner: string) => `<tr class="block"><th scope="row">${esc(k)}</th><td class="sub">${inner}</td></tr>`;
  const pairs = (list: [string, string][]) => `<table class="grid rows"><tbody>${list.map(([a, b]) => `<tr><th scope="row">${esc(a)}</th><td class="is-strong">${b}</td></tr>`).join('')}</tbody></table>`;
  const out: string[] = ['<table class="kv charter"><tbody>'];
  out.push(row('Projekttitel', txt(p.name), true));
  out.push(row('Projektnummer', txt(c.no), true));
  out.push(row('AG extern/Kunde', v.clientIn ? 'n/v' : txt(v.client) || 'n/v'));
  out.push(row('AG intern', v.clientIn ? txt(v.client) || 'n/v' : 'n/v'));
  out.push(row('Projektleiter/in', txt(v.lead)));
  out.push(row('Projektart', txt(c.kind)));
  out.push(row('Oberziel', txt(p.brief?.goal)));
  out.push(row('Hauptziele/ Kurzbeschreibung Projektinhalt', txt(c.main), true));
  out.push(row('Angestrebter Nutzen', txt(c.benefit)));
  const miles = v.fixed.length ? v.fixed.map((m) => esc([m.title, m.due ? dmy(m.due) : ''].filter(Boolean).join(' '))).join('<br>') : '';
  out.push(sub('Termine', `<table class="grid"><thead><tr><th scope="col">Starttermin</th><th scope="col">Endtermin</th><th scope="col">Fixierte Meilensteine</th><th scope="col">Gesamtdauer</th></tr></thead><tbody><tr><td class="is-strong">${v.start ? dmy(v.start) : ''}${v.datesFrom.start === 'gantt' ? '<span class="calc">aus dem Gantt</span>' : ''}</td><td class="is-strong">${v.end ? dmy(v.end) : ''}${v.datesFrom.end === 'gantt' ? '<span class="calc">aus dem Gantt</span>' : ''}</td><td class="is-strong">${miles}</td><td class="is-strong">${v.months !== undefined ? `${v.months} ${v.months === 1 ? 'Monat' : 'Monate'}<span class="calc">${v.datesFrom.start === 'gantt' || v.datesFrom.end === 'gantt' ? 'gerechnet aus dem Gantt' : 'gerechnet aus Start und Ende'}</span>` : ''}</td></tr></tbody></table>`));
  const plan: [string, string][] = v.planHours > 0 || v.planCost > 0 ? [['Plan aus den Arbeitspaketen', `${num(v.planHours, 'Ph')} · ${num(v.planCost)}<span class="calc">gerechnet</span>`]] : [];
  out.push(sub('Kapazitätsaufwand', pairs([['Eigenaufwand (ph)', num(c.ownEffort, 'Ph')], ['Fremdaufwand (€)', num(c.extEffort)], ...plan])));
  out.push(row('Budget insgesamt', num(p.budget), true));
  const costs: [string, string][] = [['PM-Kosten', num(c.costPm)], ['Personalkosten allg.', num(c.costStaff)], ['Sachkosten allg.', num(c.costMaterial)]];
  if (v.costSum) costs.push(['Summe (gerechnet)', `${v.over ? '<span class="over">' : ''}${num(v.costSum)}${v.rest !== undefined ? ` · mit Rücklage ${num(Math.abs(v.rest))} ${v.over ? 'über' : 'unter'} Budget` : ''}${v.over ? '</span>' : ''}<span class="calc">gerechnet aus PM-, Personal- und Sachkosten</span>`]);
  out.push(sub('Kosten €', pairs(costs)));
  out.push(sub('Risikorücklage €', pairs([[v.reservePct !== undefined ? `${v.reservePct.toLocaleString('de-DE')} % vom Budget` : '% vom Budget', num(c.reserve)]])));
  out.push(sub('Projektbeteiligte', pairs([['Fachteam', txt(c.team)], ['Lenkungsausschuss', txt(c.steering)], ['Externe Dienstleister', txt(c.vendors)], ['Weitere wichtige SH', txt(c.others)]])));
  out.push(row('Berichterstattung', txt(c.reporting)));
  out.push(row('Mögliche Störungen/Risiken', `${esc(v.risks.join('; '))}${v.riskCount ? `<span class="calc">${esc(`Risikowert gesamt ${v.riskSum} (W × A aus ${v.riskCount} offenen Risiken${v.riskHigh ? `, davon ${v.riskHigh} hoch` : ''})`)}</span>` : ''}`));
  out.push(row('Besonderheiten', txt(c.special)));
  // eigene Felder der Vorlage bzw. des Projekts – vor der Freigabe wie eine weitere Zeile des Blatts
  for (const x of cols) if (x.custom) out.push(row(x.label, esc(displayValue(ws, p, x, Fk.cellValue(ws, p.id, f, p.id, x.key)))));
  out.push(signRowHtml(reportSigns(ws, p, f), inks));
  out.push('</tbody></table><p class="meta">Abbildung: Formular: Projektsteckbrief</p>');
  // Ergänzungen nach ICB4 (nicht auf dem Blatt des Reports) – nur ausgefüllte Felder
  const extras = CHARTER_EXTRAS.filter((k) => shown.has(k)).map((k) => cols.find((x) => x.key === k)!).map((x) => [x.label, displayValue(ws, p, x, Fk.cellValue(ws, p.id, f, p.id, x.key))] as const).filter(([, val]) => val);
  if (extras.length) out.push(`<h3>Ergänzungen nach ICB4 <span class="icb">4.3.1 · 4.5.1</span></h3><table class="kv"><tbody>${extras.map(([k, val]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(val)}</td></tr>`).join('')}</tbody></table>`);
  return out.join('');
}

/** V148 (F-232, Abgleich 8.3 mit dem Report): Arbeitspaketbeschreibung wie Abbildung 11 – vier Spalten (Bezeichnung grau,
 *  Wert), Paare nebeneinander, Chancen/Risiken neben Start/Ende/Dauer, Personal neben Sachmittel, Anlagen neben
 *  Fortschrittsmessung, unten die Freigabe „Datum, Unterschrift PL“ links und „Unterschrift AP-V“ rechts. Dieselben
 *  Werte wie das Blatt (`wpView`); „Ziel und Inhalt“ und eigene Felder als Ergänzung darunter. */
export function wpSheetHtml(ws: Workspace, p: Project, f: FormDef, cols: Fk.FormCol[], rowId: string, inks?: ReadonlyMap<string, string>, base?: string, title = ''): string {
  const v = wpView(ws, p, rowId);
  const val = (k: string) => { const c = cols.find((x) => x.key === k); return c ? displayValue(ws, p, c, Fk.cellValue(ws, p.id, f, rowId, k)) : ''; };
  const t = (s: string) => esc(s);
  const lines = (l: string[]) => l.map(esc).join('<br>');
  const th = (k: string, rows = 1) => `<th scope="row"${rows > 1 ? ` rowspan="${rows}"` : ''}>${esc(k)}</th>`;
  const td = (x: string, span = 1, rows = 1) => `<td${span > 1 ? ` colspan="${span}"` : ''}${rows > 1 ? ` rowspan="${rows}"` : ''}>${x}</td>`;
  const out: string[] = [];
  const link = base ? projectLinkUrl(base, { project: p.id, form: f.id, row: rowId }) : '';
  out.push('<table class="kv wpsheet"><colgroup><col class="wpsheet__l"><col><col class="wpsheet__l"><col></colgroup><tbody><tr>');
  out.push(link ? `<td class="sheethead__qr"><a href="${esc(link)}">${qrSvg(link, 74, `QR-Code: ${title} in E-Sources öffnen`)}</a></td><th scope="col" colspan="3" class="wpsheet__head">${esc(f.name)}</th>` : `<th scope="col" colspan="4" class="wpsheet__head">${esc(f.name)}</th>`);
  out.push('</tr>');
  out.push(`<tr>${th('AP Bezeichnung')}${td(t(val('title')))}${th('AP.Nr. (PSP CODE)')}${td(t(val('code')))}</tr>`);
  out.push(`<tr>${th('Projektname')}${td(t(v.project))}${th('Projekt.Nr.')}${td(t(v.projectNo))}</tr>`);
  out.push(`<tr>${th('Teilaufgabe')}${td(t(v.part))}${th('Phase')}${td(t(v.phase))}</tr>`);
  out.push(`<tr>${th('Projektleiter')}${td(t(v.lead))}${th('Verantwortlicher')}${td(t(v.owner))}</tr>`);
  out.push(`<tr>${th('Start')}${td(t(v.start ? dmy(v.start) : ''))}${th('Chancen/Risiken', 3)}${td(t(val('risks')), 1, 3)}</tr>`);
  out.push(`<tr>${th('Ende')}${td(t(v.end ? dmy(v.end) : ''))}</tr>`);
  out.push(`<tr>${th('Dauer')}${td(t(v.duration))}</tr>`);
  const pre = [...v.preds, ...(val('inputs') ? [val('inputs')] : [])];
  out.push(`<tr>${th('Vorgänger/Voraussetzungen')}${td(lines(pre), 3)}</tr>`);
  out.push(`<tr>${th('Nachfolger')}${td(lines(v.succs), 3)}</tr>`);
  out.push(`<tr>${th('Aktivitäten')}${td(t(val('activities')), 3)}</tr>`);
  out.push(`<tr>${th('Ergebnisse')}${td(t(val('results')), 3)}</tr>`);
  const staff = [...staffLines(v), '', ...(val('hours') ? [`Arbeitsaufwand: ${val('hours')} Ph`] : []), ...(val('cost') ? [`Personalkosten: ${val('cost')}`] : [])];
  out.push(`<tr>${th('Personal')}${td(lines(staff.join('\n').trim().split('\n')))}${th('Sachmittel')}${td(t(val('material')))}</tr>`);
  const meth = [val('method'), val('progress') ? `Fertigstellungsgrad ${val('progress')}` : ''].filter(Boolean).join(' · ');
  out.push(`<tr>${th('Anlagen')}${td(t(val('annex') || 'keine'))}${th('Fortschrittsmessung')}${td(t(meth))}</tr>`);
  // Freigabe wie im Report: PL links, AP-Verantwortliche/r rechts
  const signs = reportSigns(ws, p, f, rowId).map((g) => ({ ...g, label: g.label.replace('Projektleitung', 'PL').replace('AP-Verantwortlich', 'AP-V') })).reverse();
  out.push(signRowHtml(signs, inks).replace('<td>', '<td colspan="3">'));
  out.push('</tbody></table>');
  const extra = cols.filter((c) => c.key === 'goal' || c.custom).map((c) => [c.label, val(c.key)] as const).filter(([, x]) => x);
  if (extra.length) out.push(`<table class="kv"><tbody>${extra.map(([k, x]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(x)}</td></tr>`).join('')}</tbody></table>`);
  return out.join('');
}

function formSection(ws: Workspace, p: Project, f: FormDef, inks?: ReadonlyMap<string, string>, base?: string): string {
  const cols = Fk.columnsOf(p, f);
  const rows = Fk.rowsOf(ws, p.id, f);
  const wide = Fk.isWideForm(f, cols.length);
  const out: string[] = [`<section id="f-${esc(f.id)}"${wide ? ' class="wide"' : ''}><h2>${esc(`${f.chapter} ${f.name}`)}${f.icb ? ` <span class="icb">ICB4 ${esc(f.icb)}</span>` : ''}</h2>`];
  const val = (rowId: string, c: Fk.FormCol) => displayValue(ws, p, c, Fk.cellValue(ws, p.id, f, rowId, c.key));
  if (f.layout === 'figure') {
    // F-234: Grafik-Blatt (Zielhierarchie, Organigramm, Phasenplan, PSP, Balkenplan, Auslastung)
    const svg = figureSvg(ws, p.id, f.figure);
    out.push(svg ? `<figure>${svg}<figcaption class="meta">Abbildung: ${esc(f.name)}</figcaption></figure>` : `<p class="empty">Noch nichts zu zeichnen.</p>`);
  } else if (f.layout === 'fields' && f.source === 'charter') {
    // V147 (F-232): Projektsteckbrief wie Abbildung 3 im Report – Blöcke Termine, Kapazität, Kosten, Projektbeteiligte, Freigabe
    out.push(charterHtml(ws, p, f, cols, inks));
  } else if (f.layout === 'fields') {
    const r = rows[0]?.id ?? p.id;
    const sign = signRowHtml(reportSigns(ws, p, f), inks);
    out.push(`<table class="kv"><tbody>${cols.filter((c) => !SIGN_DATES.has(`${f.source}:${c.key}`)).map((c) => `<tr><th scope="row">${esc(c.label)}</th><td>${esc(val(r, c))}</td></tr>`).join('')}${f.source === 'close' ? sign.replace('>Freigabe<', '>Abnahme<') : sign}</tbody></table>`);
  } else if (f.layout === 'record') {
    // Arbeitspakete: nur die beschriebenen (wie im Report – sonst stünde jedes Arbeitspaket leer da)
    const shown = f.source === 'wp' ? rows.filter((r) => { const n = (ws.notes ?? []).find((x) => x.id === r.id); return !!(n?.wp && Object.keys(n.wp).length) || !!n?.results?.length; }) : rows;
    if (!shown.length) out.push(`<p class="empty">${f.source === 'wp' && rows.length ? `Noch keine Arbeitspaketbeschreibung ausgefüllt (${rows.length} Arbeitspakete, siehe Kapitel 8).` : 'Keine Einträge.'}</p>`);
    else if (shown.length < rows.length) out.push(`<p class="meta">${shown.length} von ${rows.length} Arbeitspaketen beschrieben.</p>`);
    for (const r of shown) {
      const title =
        f.source === 'wpReports' ? `${val(r.id, cols.find((c) => c.key === 'task')!)} – ${val(r.id, cols.find((c) => c.key === 'date')!)}`
        : f.source === 'teamRoles' ? val(r.id, cols.find((c) => c.key === 'person') ?? cols[0])
        : f.source === 'messages' ? val(r.id, cols.find((c) => c.key === 'topic') ?? cols[0])
        : [val(r.id, cols.find((c) => c.key === 'code') ?? cols[0]), val(r.id, cols.find((c) => c.key === 'title') ?? cols[0])].filter(Boolean).join(' ');
      out.push(`<h3>${esc(title)}</h3>`);
      // V148 (F-232, Report Abb. 11): Arbeitspaketbeschreibung als Blatt mit QR-Code statt Feldliste
      if (f.source === 'wp') { out.push(wpSheetHtml(ws, p, f, cols, r.id, inks, base, title)); continue; }
      // F-234 (V137): Blatt wie im Report (AP-Statusbericht, Teamrollen, Nachrichtenquadrat) vor den Feldern
      if (f.figure) {
        const svg = figureSvg(ws, p.id, f.figure, { row: r.id, inks, base });
        if (svg) out.push(`<figure>${svg}<figcaption class="meta">Abbildung: ${esc(`${f.name} – ${title}`)}</figcaption></figure>`);
      }
      // V148: Statusberichte (Abb. 15) zeigen schon alle Felder und die Unterschrift – darunter nur eigene Felder
      if (f.figure && SHEET_HAS_ALL.has(f.figure)) {
        const own = cols.filter((c) => c.custom).map((c) => [c.label, val(r.id, c)] as const).filter(([, x]) => x);
        if (own.length) out.push(`<table class="kv"><tbody>${own.map(([k, x]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(x)}</td></tr>`).join('')}</tbody></table>`);
        continue;
      }
      const onSheet = f.figure ? SHEET_SHOWS[f.figure] : undefined;
      out.push(`<table class="kv"><tbody>${cols.filter((c) => c.key !== 'code' && c.key !== 'title' && !SIGN_DATES.has(`${f.source}:${c.key}`) && !(onSheet?.has(c.key) && !c.custom)).map((c) => `<tr><th scope="row">${esc(c.label)}</th><td>${esc(val(r.id, c))}</td></tr>`).join('')}${signRowHtml(reportSigns(ws, p, f, r.id), inks)}</tbody></table>`);
    }
  } else if (f.source === 'eisenhower') {
    // V140 (F-237 H6): je abgebildeter Matrix eine Seite wie Abb. 17 – Grafik und Tabelle der offenen Einträge
    const mats = Sh.projectMatrices(ws, p.id);
    if (!mats.length) out.push(`<p class="empty">Keine Eisenhower-Matrix.</p>`);
    for (const v of mats) {
      const head = [v.name, v.person, v.date ? v.date.split('-').reverse().join('.') : ''].filter(Boolean).join(' · ');
      if (mats.length > 1) out.push(`<h3>${esc(head)}</h3>`);
      const svg = figureSvg(ws, p.id, 'eisenhower', { row: v.id });
      if (svg) out.push(`<figure>${svg}<figcaption class="meta">Abbildung: ${esc(`${f.name} – ${v.name}`)}</figcaption></figure>`);
      const list = Sh.matrixEntries(ws, v);
      if (!list.length) out.push(`<p class="empty">Keine offenen Einträge.</p>`);
      else {
        const one = { ...p, eisenSel: v.id };
        const w2 = { ...ws, projects: (ws.projects ?? []).map((x) => (x.id === p.id ? one : x)) };
        out.push(`<table><thead><tr>${cols.map((c) => `<th scope="col">${esc(c.label)}</th>`).join('')}</tr></thead><tbody>`);
        for (const { note } of list) out.push(`<tr>${cols.map((c) => `<td>${esc(displayValue(w2, one, c, Fk.cellValue(w2, p.id, f, note.id, c.key)))}</td>`).join('')}</tr>`);
        out.push(`</tbody></table>`);
      }
    }
  } else {
    if (f.figure) {
      const svg = figureSvg(ws, p.id, f.figure);
      if (svg) out.push(`<figure>${svg}<figcaption class="meta">Abbildung: ${esc(f.name)}</figcaption></figure>`);
    }
    if (f.layout === 'chart' || f.layout === 'portfolio' || f.source === 'ev') {
      const svg = formSvg(ws, p.id, f, PRINT_COLORS);
      if (svg) out.push(`<figure>${svg}</figure>`);
    }
    if (!rows.length) out.push(`<p class="empty">Keine Einträge.</p>`);
    else {
      out.push(`<table><thead><tr>${cols.map((c) => `<th scope="col">${esc(c.label)}</th>`).join('')}</tr></thead><tbody>`);
      for (const r of rows) out.push(`<tr>${cols.map((c) => `<td>${esc(val(r.id, c))}</td>`).join('')}</tr>`);
      if (f.source === 'ev') {
        const t = earnedValue(ws, p.id, Fk.evDay()).total;
        const sum: Record<string, string> = { title: `Projekt (Stichtag ${Fk.evDay().split('-').reverse().join('.')})`, bac: eur(t.bac), pv: eur(t.pv), ev: eur(t.ev), ac: eur(t.ac), sv: eur(t.sv), cv: eur(t.cv), spi: t.spi !== undefined ? Fk.fmtNumber(t.spi, 'number', 2) : '–', cpi: t.cpi !== undefined ? Fk.fmtNumber(t.cpi, 'number', 2) : '–', eac: eur(t.eac) };
        out.push(`<tr class="sum">${cols.map((x) => `<td>${esc(sum[x.key] ?? '')}</td>`).join('')}</tr>`);
      }
      if (f.source === 'costs') {
        const c = costCurve(ws, p.id);
        const sum: Record<string, string> = { month: 'Summe', cost: eur(c.total), hours: `${c.hours.toLocaleString('de-DE')}` };
        out.push(`<tr class="sum">${cols.map((x) => `<td>${esc(sum[x.key] ?? '')}</td>`).join('')}</tr>`);
      }
      out.push(`</tbody></table>`);
    }
  }
  out.push(`</section>`);
  return out.join('');
}

const DC_STATE: Record<string, string> = { draft: 'Entwurf', rated: 'bewertet', decided: 'entschieden' };
const dmyIso = (iso?: string) => (iso ? iso.slice(0, 10).split('-').reverse().join('.') : '');

/** V149 (F-232 P9): Anlagen des Berichts – Blätter „Problemstellung“ (Meldungen am Projekt) und
 *  „Entscheidungsvorlage“ (Nutzwertanalysen am Projekt) in der Anordnung der Blätter am Bildschirm. */
export function annexSheets(ws: Workspace, p: Project, pics?: ReadonlyMap<string, string>): { toc: { id: string; name: string }[]; html: string } {
  const fbs = Fb.feedbackOf(ws).filter((f) => f.project === p.id).sort((a, b) => a.at.localeCompare(b.at));
  const dcs = Dc.decisionsOf(ws).filter((d) => d.projectId === p.id).sort((a, b) => a.at.localeCompare(b.at));
  const toc: { id: string; name: string }[] = [];
  const out: string[] = [];
  const row = (k: string, v: string) => `<tr><th scope="row">${esc(k)}</th><td>${v}</td></tr>`;
  const sec = (h: string) => `<tr class="annex__sec"><th scope="rowgroup" colspan="2">${esc(h)}</th></tr>`;
  if (fbs.length) {
    toc.push({ id: 'an-fb', name: `Anlage A Problemstellungen (${fbs.length})` });
    out.push(`<section id="an-fb"><h2>Anlage A: Problemstellungen <span class="icb">Meldungen im Projekt</span></h2>`);
    fbs.forEach((f, i) => {
      const raw = p.feedbackForm;
      const rows: string[] = [
        row('Titel', `<b>${esc(f.title)}</b>`),
        row('Art', esc(Fb.kindName(raw, f.kind))),
        row('Gemeldet am', esc(dmyIso(f.at))),
        row('An', esc(rolesOf(p).find((r) => r.id === f.to)?.name ?? '–')),
        row('Zustand', esc(`${Fb.FILE_LABELS.state[f.state]}${f.fixedIn ? ` · ${f.fixedIn}` : ''}`)),
      ];
      const place = Fb.placeLine(f);
      if (place) rows.push(row('Ort', esc(place)));
      for (const s of Fb.problemSheet(f, raw)) {
        rows.push(sec(s.head));
        for (const r of s.rows) {
          const v =
            r.kind === 'text' ? f[r.key] ?? ''
            : r.kind === 'severity' ? (f.severity ? Fb.FILE_LABELS.severity[f.severity] : '')
            : (() => { const x = f.extra?.[r.def.id]; return x === true ? Fb.FILE_LABELS.yes : x === false ? Fb.FILE_LABELS.no : x === undefined || x === null ? '' : String(x); })();
          rows.push(row(r.label, esc(String(v))));
        }
      }
      // V152 (kleiner Punkt V149): Bilder eingebettet (vorab als Daten-URL geladen); was fehlt, steht als Anzahl da
      if (f.pics?.length) {
        const shown = f.pics.map((r, k) => ({ url: pics?.get(r), k })).filter((x): x is { url: string; k: number } => !!x.url && x.url.startsWith('data:image/'));
        const rest = f.pics.length - shown.length;
        const figs = shown.map((x) => `<figure><img src="${esc(x.url)}" alt="${esc(`Bild ${x.k + 1} zu „${f.title}“`)}"><figcaption>${esc(`Bild ${x.k + 1}`)}</figcaption></figure>`).join('');
        const note = rest ? `<p>${esc(`${rest} ${rest === 1 ? 'Bild' : 'Bilder'} nur im Gerät gespeichert`)}</p>` : '';
        rows.push(sec('Bilder'), row('Bilder', `${figs ? `<div class="annex__pics">${figs}</div>` : ''}${note}`));
      }
      if (f.marks?.length) {
        rows.push(sec('Spur'));
        rows.push(row('Spur', `<ol>${f.marks.map((m) => `<li>${esc(`${dmyIso(m.at)} · ${m.text}${m.by ? ` (${m.by})` : ''}`)}</li>`).join('')}</ol>`));
      }
      out.push(`<div class="annex__item"><h3>${esc(`A${i + 1} ${f.title}`)}</h3><table class="kv"><tbody>${rows.join('')}</tbody></table></div>`);
    });
    out.push(`</section>`);
  }
  if (dcs.length) {
    toc.push({ id: 'an-dc', name: `Anlage B Entscheidungsvorlagen (${dcs.length})` });
    out.push(`<section id="an-dc"><h2>Anlage B: Entscheidungsvorlagen <span class="icb">Nutzwertanalyse</span></h2>`);
    dcs.forEach((d, i) => {
      const res = Dc.ranking(d);
      const weighed = d.criteria.filter((c) => !c.must);
      const musts = d.criteria.filter((c) => c.must);
      const win = Dc.winner(d);
      const chosen = d.options.find((o) => o.id === d.chosen);
      const de1 = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 1 });
      const head: string[] = [
        row('Entscheidung', `<b>${esc(d.title)}</b>`),
        row('Frage', esc(d.question ?? '')),
        row('Angelegt am', esc(dmyIso(d.at))),
        row('Stand', esc(DC_STATE[d.state] ?? d.state)),
      ];
      out.push(`<div class="annex__item"><h3>${esc(`B${i + 1} ${d.title}`)}</h3><table class="kv"><tbody>${head.join('')}</tbody></table>`);
      if (d.options.length && d.criteria.length) {
        const opts = res.map((r) => r.option);
        const th = opts.map((o) => `<th scope="col">${esc(o.name)}</th>`).join('');
        const body: string[] = [];
        for (const c of musts) body.push(`<tr><th scope="row">${esc(`${c.name} (Muss)`)}</th><td>–</td>${opts.map((o) => `<td>${o.fails?.includes(c.id) ? 'nicht erfüllt' : 'erfüllt'}</td>`).join('')}</tr>`);
        for (const c of weighed) body.push(`<tr><th scope="row">${esc(c.name)}</th><td>${c.weight === undefined ? '' : `${de1(c.weight)} %`}</td>${opts.map((o) => { const v = Dc.scoreOf(d, c.id, o.id)?.v; return `<td>${v === undefined ? '' : de1(v)}</td>`; }).join('')}</tr>`);
        body.push(`<tr class="sum"><th scope="row">Nutzwert</th><td>${de1(weighed.reduce((s, c) => s + (c.weight ?? 0), 0))} %</td>${res.map((r) => `<td>${r.out ? 'scheidet aus' : de1(r.total)}</td>`).join('')}</tr>`);
        body.push(`<tr><th scope="row">Rang</th><td></td>${res.map((r) => `<td>${r.rank ?? '–'}</td>`).join('')}</tr>`);
        out.push(`<table><thead><tr><th scope="col">Kriterium</th><th scope="col">Gewicht</th>${th}</tr></thead><tbody>${body.join('')}</tbody></table>`);
      }
      const tail: string[] = [row('Empfehlung', esc(win ? win.name : d.options.length ? 'Gleichstand bzw. noch nicht bewertet' : ''))];
      if (chosen) tail.push(row('Gewählte Lösung', `<b>${esc(chosen.name)}</b>`));
      if (d.why) tail.push(row('Begründung', esc(d.why)));
      if (d.marks?.length) tail.push(row('Spur', `<ol>${d.marks.map((m) => `<li>${esc(`${dmyIso(m.at)} · ${m.text}${m.by ? ` (${m.by})` : ''}`)}</li>`).join('')}</ol>`));
      out.push(`<table class="kv"><tbody>${tail.join('')}</tbody></table></div>`);
    });
    out.push(`</section>`);
  }
  return { toc, html: out.join('') };
}
