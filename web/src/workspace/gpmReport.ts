/**
 * F-226 Stufe 2 (V113, Doc F-226 „Ausgabe“): Projektbericht nach GPM-Leitfaden Z01D Rev. 09 – alle Formulare der
 * Vorlage in Kapitelreihenfolge als ein druckbares HTML-Dokument (im Browser „Als PDF sichern“), mit Kopf- und
 * Fußzeile wie im Report („Z20-0173 · Projekt · Version · Seite x von y“). Dazu die Grafiken als SVG-Text:
 * Kostenganglinie mit Summenlinie (ICB4 4.5.7), Umfeld- und Stakeholder-Portfolio (ICB4 4.5.12) – dieselben
 * Bausteine zeigt die Oberfläche (ProjectForms). Reine Funktionen; Tests in gpm.test.ts („Stufe 2“).
 */
import type { FormDef, Project, Workspace } from './types';
import * as Fk from './formKit';
import { costCurve, earnedValue, evCurve, mtaOf, portfolioOf, projectStatus, type CostCurve, type EvCurve, type Mta, type PortfolioDot } from './gpmCalc';
import { personById } from './persons';
import { projectById } from './projects';

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

const lab = (d: PortfolioDot) => esc(d.code || d.name.slice(0, 14));

/** Umfeld-Portfolio: sachlich/sozial (Spalten) × intern/extern (Zeilen), Codes in den Feldern. */
export function envSvg(dots: PortfolioDot[], col: SvgColors, w = 560, h = 340): string {
  const pad = { l: 70, t: 30, r: 10, b: 10 };
  const cw = (w - pad.l - pad.r) / 2;
  const ch = (h - pad.t - pad.b) / 2;
  const parts: string[] = [];
  const cols: ['fact', 'social'] = ['fact', 'social'];
  const rows: ['in', 'ex'] = ['in', 'ex'];
  cols.forEach((a, ci) => parts.push(`<text x="${pad.l + ci * cw + cw / 2}" y="18" text-anchor="middle" font-size="12" font-weight="bold" fill="${col.ink}">${a === 'fact' ? 'sachlich' : 'sozial'}</text>`));
  rows.forEach((sd, ri) => {
    parts.push(`<text x="${pad.l - 8}" y="${pad.t + ri * ch + ch / 2}" text-anchor="end" font-size="12" font-weight="bold" fill="${col.ink}">${sd === 'in' ? 'intern' : 'extern'}</text>`);
    cols.forEach((a, ci) => {
      const x = pad.l + ci * cw;
      const y = pad.t + ri * ch;
      parts.push(`<rect x="${x}" y="${y}" width="${cw}" height="${ch}" fill="none" stroke="${col.line}"/>`);
      const hit = dots.filter((d) => d.side === sd && d.area === a);
      hit.forEach((d, k) => {
        const per = Math.max(1, Math.floor((cw - 16) / 86));
        const tx = x + 10 + (k % per) * 86;
        const ty = y + 20 + Math.floor(k / per) * 18;
        if (ty < y + ch - 4) parts.push(`<text x="${tx}" y="${ty}" font-size="11" fill="${col.ink}"><title>${esc(d.name)}</title>${lab(d)}</text>`);
      });
    });
  });
  const open = dots.filter((d) => !d.side || !d.area).length;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="${esc(`Umfeld-Portfolio: ${dots.length - open} Stakeholder eingeordnet${open ? `, ${open} ohne Angabe` : ''}`)}">${parts.join('')}</svg>`;
}

/** Stakeholder-Portfolio: Einstellung −2…+2 (waagerecht) × Macht/Einfluss 1–3 (senkrecht), Kreisgröße = Konfliktpotenzial.
 * V134 (Enrico 11:27 „optisch schöner“): Quadranten getönt und benannt (Opponenten/Promotoren …), intern und extern in
 * zwei Farben, Beschriftung mit hellem Rand (lesbar über Linien), Legende unten; volle Blattbreite. */
export function shSvg(dots: PortfolioDot[], col: SvgColors, w = 680, h = 400): string {
  const pad = { l: 54, t: 14, r: 92, b: 66 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const x = (a: number) => pad.l + ((a + 2) / 4) * iw;
  const y = (p: number) => pad.t + ih - ((p - 1) / 2) * ih;
  const ext = '#3f6fa8';
  const parts: string[] = [];
  const quad: [number, number, string, string][] = [
    [pad.l, pad.t, '179,38,30', 'Opponenten – kritisch, eng steuern'],
    [x(0), pad.t, '46,125,50', 'Promotoren – einbinden'],
    [pad.l, y(2), '191,128,0', 'Gegner ohne Macht – beobachten'],
    [x(0), y(2), '63,111,168', 'Unterstützer – informieren'],
  ];
  for (const [qx, qy, rgb, name] of quad) {
    parts.push(`<rect x="${qx}" y="${qy}" width="${iw / 2}" height="${ih / 2}" fill="rgb(${rgb})" fill-opacity="0.07"/>`);
    const right = qx > pad.l;
    parts.push(`<text x="${right ? qx + iw / 2 - 6 : qx + 6}" y="${qy + ih / 2 - 6}" text-anchor="${right ? 'end' : 'start'}" font-size="10" font-style="italic" fill="rgb(${rgb})">${name}</text>`);
  }
  parts.push(`<rect x="${pad.l}" y="${pad.t}" width="${iw}" height="${ih}" fill="none" stroke="${col.line}"/>`);
  parts.push(`<line x1="${x(0)}" y1="${pad.t}" x2="${x(0)}" y2="${pad.t + ih}" stroke="${col.line}"/>`);
  parts.push(`<line x1="${pad.l}" y1="${y(2)}" x2="${pad.l + iw}" y2="${y(2)}" stroke="${col.line}"/>`);
  for (const a of [-2, -1, 0, 1, 2]) parts.push(`<text x="${x(a)}" y="${pad.t + ih + 14}" text-anchor="middle" font-size="10" fill="${col.muted}">${a > 0 ? `+${a}` : a === 0 ? '0' : `−${-a}`}</text>`);
  for (const p of [1, 2, 3]) parts.push(`<text x="${pad.l - 6}" y="${y(p) + 4}" text-anchor="end" font-size="10" fill="${col.muted}">${p}</text>`);
  parts.push(`<text x="${pad.l + iw / 2}" y="${pad.t + ih + 32}" text-anchor="middle" font-size="11" fill="${col.ink}">Einstellung zum Projekt (−2 dagegen · +2 dafür)</text>`);
  parts.push(`<text x="14" y="${pad.t + ih / 2}" text-anchor="middle" font-size="11" fill="${col.ink}" transform="rotate(-90 14 ${pad.t + ih / 2})">Macht/Einfluss</text>`);
  // Legende
  const ly = h - 10;
  parts.push(`<circle cx="${pad.l + 6}" cy="${ly - 4}" r="5" fill="${col.dot}" fill-opacity="0.35" stroke="${col.dot}"/><text x="${pad.l + 16}" y="${ly}" font-size="10" fill="${col.ink}">intern</text>`);
  parts.push(`<circle cx="${pad.l + 66}" cy="${ly - 4}" r="5" fill="${ext}" fill-opacity="0.35" stroke="${ext}"/><text x="${pad.l + 76}" y="${ly}" font-size="10" fill="${col.ink}">extern</text>`);
  parts.push(`<text x="${pad.l + 126}" y="${ly}" font-size="10" fill="${col.muted}">Kreisgröße = Konfliktpotenzial (1 gering – 3 hoch)</text>`);
  // V113: mehrere an derselben Stelle – senkrecht gestapelt um den Punkt, Beschriftung rechts daneben (nichts überdeckt sich)
  const at = new Map<string, PortfolioDot[]>();
  for (const d of dots) {
    if (d.attitude === undefined || d.power === undefined) continue;
    const k = `${d.attitude}|${d.power}`;
    at.set(k, [...(at.get(k) ?? []), d]);
  }
  const placed: { d: PortfolioDot; cx: number; cy: number }[] = [];
  for (const group of at.values()) {
    const step = Math.min(16, (ih / 2 - 12) / Math.max(1, group.length - 1));
    const span = (group.length - 1) * step;
    let top = y(group[0].power!) - span / 2;
    top = Math.min(Math.max(top, pad.t + 9), pad.t + ih - 9 - span);
    group.forEach((d, n) => placed.push({ d, cx: x(d.attitude!), cy: top + n * step }));
  }
  for (const { d, cx, cy } of placed) {
    const r = 3.5 + (d.conflict ?? 1) * 1.5;
    const c = d.side === 'ex' ? ext : col.dot;
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}" fill-opacity="0.35" stroke="${c}" stroke-width="1.2"><title>${esc(`${d.code ? `${d.code} ` : ''}${d.name}: Einstellung ${d.attitude}, Macht ${d.power}${d.conflict ? `, Konfliktpotenzial ${d.conflict}` : ''}`)}</title></circle>`);
    parts.push(`<text x="${cx + r + 3}" y="${cy + 3.5}" font-size="10" fill="${col.ink}" stroke="#fff" stroke-width="3" stroke-opacity="0.85" paint-order="stroke">${lab(d)}</text>`);
  }
  const open = dots.filter((d) => d.attitude === undefined || d.power === undefined).length;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="${esc(`Stakeholder-Portfolio: ${dots.length - open} Stakeholder eingeordnet${open ? `, ${open} ohne Einstellung oder Macht` : ''}`)}">${parts.join('')}</svg>`;
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
  if (form.layout === 'portfolio') return form.filter === 'sh' ? shSvg(portfolioOf(p), col) : envSvg(portfolioOf(p), col);
  return '';
}

// ---------------------------------------------------------------- Bericht

/** Projektbericht als HTML-Dokument; `version` z. B. App-Version oder Berichtsstand, `day` Stichtag. */
export function reportHtml(ws: Workspace, pid: string, o: { version?: string; day: string }): string {
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
  @bottom-left { content: "${cssText([no, o.version ? `Version ${o.version}` : '', `Stand ${dmy(o.day)}`].filter(Boolean).join(' · '))}"; font: 9pt sans-serif; color: #555; }
  @bottom-right { content: "Seite " counter(page) " von " counter(pages); font: 9pt sans-serif; color: #555; } }
body { font: 10.5pt/1.4 system-ui, -apple-system, "Segoe UI", sans-serif; color: #1b1b1b; margin: 0; }
h1 { font-size: 20pt; margin: 0 0 4pt; } h2 { font-size: 13pt; margin: 18pt 0 6pt; border-bottom: 1px solid #999; padding-bottom: 2pt; break-after: avoid; }
h3 { font-size: 11pt; margin: 10pt 0 4pt; break-after: avoid; }
.meta { color: #555; margin: 0 0 12pt; } .icb { color: #666; font-weight: normal; font-size: 9pt; }
table { border-collapse: collapse; width: 100%; margin: 4pt 0 8pt; font-size: 9pt; table-layout: fixed; } th, td { border: 1px solid #bbb; padding: 3pt 4pt; vertical-align: top; text-align: left; white-space: pre-wrap; overflow-wrap: anywhere; hyphens: auto; }
@page wide { size: A4 landscape; margin: 18mm 14mm 16mm; }
section.wide { page: wide; } section.wide table { font-size: 8pt; }
th { background: #eee; } thead { display: table-header-group; } tr { break-inside: avoid; }
table.kv th { width: 34%; } .empty { color: #777; font-style: italic; } .cover { break-after: page; } section { break-inside: auto; }
.sum td { font-weight: bold; } figure { margin: 6pt 0; break-inside: avoid; }
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
  out.push(`</ol></div>`);
  for (const f of tpl.forms) out.push(formSection(ws, p, f));
  out.push(`</body></html>`);
  return out.join('\n');
}
const cssText = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ');

function formSection(ws: Workspace, p: Project, f: FormDef): string {
  const cols = Fk.columnsOf(p, f);
  const rows = Fk.rowsOf(ws, p.id, f);
  const wide = Fk.isWideForm(f, cols.length);
  const out: string[] = [`<section id="f-${esc(f.id)}"${wide ? ' class="wide"' : ''}><h2>${esc(`${f.chapter} ${f.name}`)}${f.icb ? ` <span class="icb">ICB4 ${esc(f.icb)}</span>` : ''}</h2>`];
  const val = (rowId: string, c: Fk.FormCol) => displayValue(ws, p, c, Fk.cellValue(ws, p.id, f, rowId, c.key));
  if (f.layout === 'fields') {
    const r = rows[0]?.id ?? p.id;
    out.push(`<table class="kv"><tbody>${cols.map((c) => `<tr><th scope="row">${esc(c.label)}</th><td>${esc(val(r, c))}</td></tr>`).join('')}</tbody></table>`);
  } else if (f.layout === 'record') {
    // Arbeitspakete: nur die beschriebenen (wie im Report – sonst stünde jedes Arbeitspaket leer da)
    const shown = f.source === 'wp' ? rows.filter((r) => { const n = (ws.notes ?? []).find((x) => x.id === r.id); return !!(n?.wp && Object.keys(n.wp).length) || !!n?.results?.length; }) : rows;
    if (!shown.length) out.push(`<p class="empty">${f.source === 'wp' && rows.length ? `Noch keine Arbeitspaketbeschreibung ausgefüllt (${rows.length} Arbeitspakete, siehe Kapitel 8).` : 'Keine Einträge.'}</p>`);
    else if (shown.length < rows.length) out.push(`<p class="meta">${shown.length} von ${rows.length} Arbeitspaketen beschrieben.</p>`);
    for (const r of shown) {
      const title = [val(r.id, cols.find((c) => c.key === 'code') ?? cols[0]), val(r.id, cols.find((c) => c.key === 'title') ?? cols[0])].filter(Boolean).join(' ');
      out.push(`<h3>${esc(title)}</h3><table class="kv"><tbody>${cols.filter((c) => c.key !== 'code' && c.key !== 'title').map((c) => `<tr><th scope="row">${esc(c.label)}</th><td>${esc(val(r.id, c))}</td></tr>`).join('')}</tbody></table>`);
    }
  } else {
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
