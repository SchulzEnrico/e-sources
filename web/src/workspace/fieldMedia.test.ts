import { describe, expect, it } from 'vitest';
import * as W from './workspace';
import * as Fm from './fieldMedia';
import { addProject } from './projects';
import { editCharter, sanitizeCharter } from './gpm';
import { imageRefs } from './notes';
import { reportHtml, reportPicRefs } from './gpmReport';

describe('V154 F-232 P12 Medien in Feldern', () => {
  it('trennt Text und Verweise und setzt sie wieder zusammen', () => {
    const v = 'Ziel A\nZiel B\n![Plan \\[neu\\]](es-img:abc)\n[Vertrag.pdf](es-file:d-1)';
    const s = Fm.splitMedia(v);
    expect(s.text).toBe('Ziel A\nZiel B');
    expect(s.media).toEqual([
      { ref: 'img', id: 'abc', name: 'Plan [neu]' },
      { ref: 'file', id: 'd-1', name: 'Vertrag.pdf' },
    ]);
    expect(Fm.splitMedia(Fm.joinMedia(s.text, s.media))).toEqual(s);
    expect(Fm.joinMedia('', [s.media[1]])).toBe('[Vertrag.pdf](es-file:d-1)');
    expect(Fm.joinMedia('x', [s.media[0], s.media[0]]).split('\n')).toHaveLength(2);
    // falsche Mischung (! mit es-file) bleibt Text
    expect(Fm.splitMedia('![x](es-file:a)').media).toEqual([]);
    expect(Fm.textRoom(s.media, 2000)).toBeLessThan(2000);
  });
  it('erkennt Arten und lehnt Fremdes ab', () => {
    expect(Fm.mediaKindOf('image/svg+xml')).toBe('img');
    expect(Fm.mediaKindOf('', 'a.PDF')).toBe('pdf');
    expect(Fm.mediaKindOf('audio/mpeg')).toBe('audio');
    expect(Fm.mediaKindOf('video/mp4')).toBe('video');
    expect(Fm.mediaRefusal('application/zip', 'a.zip', 10)).toBe('kind');
    expect(Fm.mediaRefusal('video/mp4', 'a.mp4', Fm.MEDIA_MAX_BYTES + 1)).toBe('size');
    expect(Fm.mediaRefusal('image/png', 'a.png', Fm.MEDIA_MAX_BYTES + 1)).toBe('');
  });
  it('Logo und Feld-Medien zählen als Verweise (Aufräumen) und im Bericht', () => {
    const made = addProject(W.defaultWorkspace(), 'Medien')!;
    const pm = made.id;
    let ws = editCharter(made.ws, pm, { logo: 'es-img:logo1', main: 'Kurz\n![Skizze](es-img:pic1)\n[Ton.m4a](es-file:snd1)' });
    expect(sanitizeCharter({ logo: 'http://x' })).toBeUndefined();
    const refs = imageRefs(ws);
    expect(['logo1', 'pic1', 'snd1'].every((r) => refs.has(r))).toBe(true);
    expect(reportPicRefs(ws, pm).sort()).toEqual(['logo1', 'pic1']);
    const html = reportHtml(ws, pm, { day: '2026-11-28', pics: new Map([['pic1', 'data:image/png;base64,AAA'], ['logo1', 'data:image/png;base64,BBB']]) });
    expect(html).toContain('<img src="data:image/png;base64,AAA" alt="Skizze">');
    expect(html).toContain('class="logo"');
    expect(html).toContain('📎 Ton.m4a');
    expect(html).not.toContain('es-img:');
    expect(html).not.toContain('es-file:');
  });
});

describe('V154 F-236 B Layout-Vorlage (Schritt 1)', () => {
  it('Vorgabe ändert nichts; Regeln wirken auf Grafiken, Druckfarben und Bericht; Kontrast warnt', async () => {
    const L = await import('./layoutRules');
    const Gp = await import('./gpm');
    const Gf = await import('./gpmFigures');
    const Rp = await import('./gpmReport');
    const made = addProject(W.defaultWorkspace(), 'Farben')!;
    const id = made.id;
    let ws = made.ws;
    expect(L.sanitizeLayout({ primary: '#7B1113', accent: 'rot', gradient: true })).toBeUndefined();
    expect(Rp.printColorsOf(ws.projects![0])).toBe(Rp.PRINT_COLORS);
    expect(L.contrastWarnings(L.REPORT_LAYOUT)).toEqual([]);
    ws = Gp.editLayout(ws, id, { primary: '#1f4e79', gradient: false, head: '#0a0' });
    const p = ws.projects!.find((x) => x.id === id)!;
    expect(p.layout).toEqual({ primary: '#1f4e79', gradient: false, head: '#00aa00' });
    expect(L.contrastWarnings(L.layoutOf(p)).map((w) => w.rule)).toContain('head');
    expect(Rp.printColorsOf(p).ink).toBe('#1b1b1b');
    // Grafik mit Zielen: Kasten in der neuen Primärfarbe, danach gilt wieder die Vorgabe
    ws = Gp.editLayout(ws, id, { primary: '#1f4e79' });
    expect(Gf.LOOK.wine).toBe('#7b1113');
    const svg = Gf.withLook(ws.projects!.find((x) => x.id === id), () => `${Gf.LOOK.wine}`);
    expect(svg).toBe('#1f4e79');
    expect(Gf.LOOK.wine).toBe('#7b1113');
    expect(Rp.reportHtml(ws, id, { day: '2026-11-28' })).toContain('color: #00aa00');
    ws = Gp.editLayout(ws, id, 'reset');
    expect(ws.projects!.find((x) => x.id === id)!.layout).toBeUndefined();
    expect(L.contrast('#ffffff', '#000000')).toBe(21);
    expect(L.textOn('#1f4e79')).toBe('#ffffff');
  });
});
