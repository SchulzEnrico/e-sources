import { describe, expect, it } from 'vitest';
import * as Q from './qr';
import * as L from './projectLink';
import * as W from './workspace';

const URL1 = 'https://schulzenrico.github.io/e-sources/?projekt=cg&blatt=wp&zeile=cg-31';
const fingerprint = (m: boolean[][]) => {
  let h = 0;
  m.flat().forEach((b, i) => {
    if (b) h = (h * 31 + i) % 1000000007;
  });
  return h;
};

describe('V146 F-232 P10 QR-Code und Verweis', () => {
  it('wählt die kleinste Version (Byte-Modus, Fehlerkorrektur M)', () => {
    expect(Q.qrVersionFor(14)).toBe(1);
    expect(Q.qrVersionFor(15)).toBe(2);
    expect(Q.qrVersionFor(26)).toBe(2);
    expect(Q.qrVersionFor(27)).toBe(3);
    expect(Q.qrVersionFor(2331)).toBe(40);
    expect(Q.qrVersionFor(2332)).toBe(0);
    expect(Q.qrMatrix('x'.repeat(3000))).toEqual([]);
  });
  it('zeichnet Suchmuster, Taktlinien und dunkles Modul an die richtigen Stellen', () => {
    const m = Q.qrMatrix('E-Sources');
    expect(m.length).toBe(21);
    const n = m.length;
    for (const [cx, cy] of [[3, 3], [n - 4, 3], [3, n - 4]]) {
      expect(m[cy][cx]).toBe(true);
      expect(m[cy][cx - 2]).toBe(false);
      expect(m[cy][cx - 3]).toBe(true);
    }
    for (let i = 8; i < n - 8; i++) expect(m[6][i]).toBe(i % 2 === 0);
    expect(m[n - 8][8]).toBe(true);
  });
  it('liefert für eine feste Adresse dasselbe Raster (mit OpenCV gelesen, V146)', () => {
    const m = Q.qrMatrix(URL1);
    expect(m.length).toBe(37);
    expect(fingerprint(m)).toBe(510354337);
  });
  it('schreibt Formatbits passend zur gewählten Maske', () => {
    for (let mask = 0; mask < 8; mask++) {
      const m = Q.qrMatrix('ColorGentlemen', mask);
      let bits = 0;
      for (let i = 0; i <= 5; i++) bits |= (m[i][8] ? 1 : 0) << i;
      bits |= (m[7][8] ? 1 : 0) << 6;
      bits |= (m[8][8] ? 1 : 0) << 7;
      bits |= (m[8][7] ? 1 : 0) << 8;
      for (let i = 9; i < 15; i++) bits |= (m[8][14 - i] ? 1 : 0) << i;
      const data = (bits ^ 0x5412) >>> 10;
      expect(data >>> 3).toBe(0); // Fehlerkorrektur M
      expect(data & 7).toBe(mask);
    }
  });
  it('SVG mit Ruhezone, Beschriftung und eingebettetes Stück', () => {
    const svg = Q.qrSvg(URL1, 74, 'QR-Code: "Arbeitspaket" <CG>');
    expect(svg).toContain('viewBox="0 0 41 41"');
    expect(svg).toContain('aria-label="QR-Code: &quot;Arbeitspaket&quot; &lt;CG&gt;"');
    expect(Q.qrInner(URL1, 561, 5, 74)).toContain('<svg x="561" y="5" width="74" height="74"');
  });
  it('Verweis: Adresse bauen, lesen, wieder entfernen; ungültige Kennungen fallen weg', () => {
    const u = L.projectLinkUrl('https://schulzenrico.github.io/e-sources/?win=x#a', { project: 'cg', form: 'wp', row: 'cg-31' });
    expect(u).toBe('https://schulzenrico.github.io/e-sources/?projekt=cg&blatt=wp&zeile=cg-31');
    expect(L.parseProjectLink(new URL(u).search)).toEqual({ project: 'cg', form: 'wp', row: 'cg-31' });
    expect(L.parseProjectLink('?projekt=<x>')).toBe(null);
    expect(L.parseProjectLink('?projekt=cg&zeile=a b')).toEqual({ project: 'cg' });
    expect(L.parseProjectLink('?win=2')).toBe(null);
    expect(L.withoutProjectLink(`${u}&win=2`)).toBe('https://schulzenrico.github.io/e-sources/?win=2');
    L.holdProjectLink({ project: 'cg' });
    expect(L.takeProjectLink()).toEqual({ project: 'cg' });
    expect(L.takeProjectLink()).toBe(null);
  });
  it('Bericht: QR-Code an Arbeitspaketbeschreibung und AP-Statusbericht, Fußzeile wie im Report', async () => {
    const S = await import('./sampleProject');
    const R = await import('./gpmReport');
    const F = await import('./gpmFigures');
    const Fk = await import('./formKit');
    const ws = Fk.ensureMatrices(S.addSampleProject(W.defaultWorkspace(), 5));
    const pid = S.SAMPLE_PROJECT;
    const base = 'https://schulzenrico.github.io/e-sources/';
    const html = R.reportHtml(ws, pid, { version: 'V146', day: '2027-05-17', base });
    expect(html).toContain('@bottom-center');
    expect(html).toContain('"Seite " counter(page) " von " counter(pages)');
    expect(html).toContain('table class="sheethead"');
    expect(html).toContain(`href="${base}?projekt=${pid}&amp;blatt=wp&amp;zeile=`);
    const ap = F.figureSvg(ws, pid, 'wpReport', { base });
    expect(ap).toContain('<svg x="561" y="5" width="74" height="74"');
    expect(F.figureSvg(ws, pid, 'wpReport').includes('<svg x="561"')).toBe(false);
    // ohne Basis (z. B. Test, Bericht im eigenen Fenster) kein QR-Code
    expect(R.reportHtml(ws, pid, { version: 'V146', day: '2027-05-17' }).includes('table class="sheethead"')).toBe(false);
    // Version aus 6.4 Dokumentation („Projektbericht“), sonst E-Sources
    const p = ws.projects!.find((x) => x.id === pid)!;
    expect(R.docVersion({ ...p, docs: [{ id: 'd1', title: 'Projektbericht', version: 'V 2' }] })).toBe('2');
    expect(R.docVersion({ ...p, docs: [{ id: 'd1', title: 'Protokoll', version: '3' }] })).toBe(undefined);
    expect(R.reportHtml({ ...ws, projects: ws.projects!.map((x) => (x.id === pid ? { ...x, docs: [{ id: 'd1', title: 'Report', kind: 'Bericht', version: '1' }] } : x)) }, pid, { version: 'V146', day: '2027-05-17' })).toContain('"Version 1"');
  });
});
