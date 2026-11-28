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
    // V158: ohne Paged.js nur auf dem Deckblatt; mit Paged.js zusätzlich oben rechts auf jeder Seite
    expect(html).not.toContain('class="pagelogo"');
    const paged = reportHtml(ws, pm, { day: '2026-11-28', paged: 'http://x/paged.js', pics: new Map([['logo1', 'data:image/png;base64,BBB']]) });
    expect(paged).toContain('<div class="pagelogo"><img src="data:image/png;base64,BBB" alt=""></div>');
    expect(paged).toContain('@top-right { content: element(pagelogo)');
    // V158: Kopf der Tabellen dunkel → Steckbrief-Unterköpfe bleiben lesbar
    const dark = reportHtml({ ...ws, projects: ws.projects!.map((x) => (x.id === pm ? { ...x, layout: { tableHead: '#1f3a68' } } : x)) }, pm, { day: '2026-11-28' });
    expect(dark).toContain('table.charter .grid thead th { color: inherit; }');
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

describe('V155 F-236 B Schritt 3 (Farbe je Kasten) und G3 Rest', () => {
  it('Kasten mit eigener Farbe: Hinweis-Daten, Zeichnung, zurücksetzen, Lesen beim Laden', async () => {
    const Fk = await import('./formKit');
    const Gf = await import('./gpmFigures');
    const Gp = await import('./gpm');
    const { editProject } = await import('./projects');
    const made = addProject(W.defaultWorkspace(), 'Töne')!;
    const id = made.id;
    let ws = editProject(made.ws, id, { goals: [{ id: 'g1', code: 'L1', text: 'Werkstatt eröffnet', level: 'must', kind: 'perf' }] });
    let svg = Gf.figureSvg(ws, id, 'goalTree');
    expect(svg).toContain('data-base="#7b1113"');
    expect(svg).not.toContain('data-own=');
    ws = Fk.applyForm(ws, { op: 'figTone', pid: id, fig: 'goalTree', key: 'goals:g1', color: '#1F4E79', at: 1 });
    const p = ws.projects!.find((x) => x.id === id)!;
    expect(p.figTone).toEqual({ goalTree: { 'goals:g1': '#1f4e79' } });
    expect(Fk.figToneCount(p)).toBe(1);
    svg = Gf.figureSvg(ws, id, 'goalTree');
    expect(svg).toContain('data-own="#1f4e79"');
    expect(svg).toContain('fgOwn1f4e79');
    // ungültige Farbe ändert nichts, gleiche Farbe auch nicht
    expect(Fk.applyForm(ws, { op: 'figTone', pid: id, fig: 'goalTree', key: 'goals:g1', color: 'blau', at: 2 })).toBe(ws);
    expect(Fk.applyForm(ws, { op: 'figTone', pid: id, fig: 'goalTree', key: 'goals:g1', color: '#1f4e79', at: 2 })).toBe(ws);
    // Lesen beim Laden
    expect(Gp.parseFigTone({ goalTree: { 'goals:g1': '#ABC', x: 'rot' }, 'bad-fig': { a: '#000000' } })).toEqual({ goalTree: { 'goals:g1': '#aabbcc' } });
    // alle zurück, dann wieder her (Rückgängig der Ansicht „Layout“)
    const before = p.figTone;
    ws = Fk.applyForm(ws, { op: 'figToneReset', pid: id, at: 3 });
    expect(ws.projects!.find((x) => x.id === id)!.figTone).toBeUndefined();
    ws = Fk.applyForm(ws, { op: 'figToneAll', pid: id, tones: before, at: 4 });
    expect(ws.projects!.find((x) => x.id === id)!.figTone).toEqual(before);
    ws = Fk.applyForm(ws, { op: 'figTone', pid: id, fig: 'goalTree', key: 'goals:g1', color: null, at: 5 });
    expect(ws.projects!.find((x) => x.id === id)!.figTone).toBeUndefined();
    // Töne bleiben nicht für das nächste Projekt hängen
    expect(Gf.figureSvg(ws, id, 'goalTree')).not.toContain('data-own=');
  });

  it('Schrift, Größen, Ecken, Schatten, Tabellen und Druck als Regeln; Vorgabe ändert nichts', async () => {
    const L = await import('./layoutRules');
    const Gp = await import('./gpm');
    const Gf = await import('./gpmFigures');
    const { editProject } = await import('./projects');
    expect(L.sanitizeLayout({ font: 'sans', textSize: 100, radius: 4, shadow: true, tableGrid: 'full', printPage: true })).toBeUndefined();
    expect(L.sanitizeLayout({ font: 'comic', textSize: 300, radius: -3, tableGrid: 'dots', printNo: 'nein' })).toEqual({ textSize: 140, radius: 0 });
    const made = addProject(W.defaultWorkspace(), 'Satz')!;
    const id = made.id;
    let ws = editProject(made.ws, id, { charter: { no: 'Z20-0173' }, goals: [{ id: 'g1', text: 'Ziel', level: 'must', kind: 'perf' }] });
    const plain = reportHtml(ws, id, { day: '2026-11-28' });
    expect(plain).toContain('Projektbericht Z20-0173');
    expect(plain).toContain('counter(pages)');
    const svg0 = Gf.figureSvg(ws, id, 'goalTree');
    ws = Gp.editLayout(ws, id, { font: 'serif', headSize: 120, tableSize: 90, radius: 0, shadow: false, tableHead: '#1f4e79', tableGrid: 'rows', printNo: false, printPage: false, printLogo: false });
    const p = ws.projects!.find((x) => x.id === id)!;
    const v = L.paperVars(L.layoutOf(p));
    expect(v['--paper-font']).toContain('Georgia');
    expect(v['--paper-hscale']).toBe('1.2');
    expect(v['--paper-tscale']).toBe('0.9');
    expect(v['--paper-thead-ink']).toBe('#ffffff');
    expect(v['--paper-grid']).toBe('rows');
    expect(v['--paper-logo']).toBe('none');
    const html = reportHtml(ws, id, { day: '2026-11-28' });
    expect(html).not.toContain('counter(pages)');
    expect(html).toContain('Projektbericht Satz');
    expect(html).toContain('h1 { font-size: 24pt; }');
    expect(html).toContain('border-left-color: transparent');
    const svg = Gf.figureSvg(ws, id, 'goalTree');
    expect(svg).toContain('flood-opacity="0"');
    expect(svg).toContain('rx="0"');
    // V157: bei Ecken 0 auch Wurzelkasten und Glanz eckig (vorher rx 2 bzw. 3)
    expect(svg).not.toMatch(/rx="[1-9]/);
    expect(svg0).toContain('flood-opacity="0.28"');
    // nach dem Zeichnen gilt wieder die Vorgabe
    expect(Gf.figureSvg(editProject(ws, id, { layout: undefined }), id, 'goalTree')).toBe(svg0);
  });
});

describe('V155 F-236 G2 Vorlagen im Arbeitsbereich', () => {
  it('speichern, gleicher Name ersetzt, anwenden, löschen und wieder her, Lesen beim Laden', async () => {
    const L = await import('./layoutRules');
    const Gp = await import('./gpm');
    const a = addProject(W.defaultWorkspace(), 'A')!;
    const b = addProject(a.ws, 'B')!;
    let ws = b.ws;
    expect(Gp.saveLayoutTemplate(ws, a.id, 't1')).toBeNull();
    ws = Gp.editLayout(ws, a.id, { name: 'FIT GmbH', primary: '#1f4e79', radius: 0 });
    let r = Gp.saveLayoutTemplate(ws, a.id, 't1')!;
    expect(r.name).toBe('FIT GmbH');
    ws = r.ws;
    expect(ws.layoutTemplates).toEqual([{ id: 't1', name: 'FIT GmbH', rules: { primary: '#1f4e79', radius: 0 } }]);
    ws = Gp.editLayout(ws, a.id, { primary: '#203040' });
    r = Gp.saveLayoutTemplate(ws, a.id, 't2')!;
    expect(r.replaced?.id).toBe('t1');
    ws = r.ws;
    expect(ws.layoutTemplates!.length).toBe(1);
    expect(ws.layoutTemplates![0].rules.primary).toBe('#203040');
    ws = Gp.applyLayoutTemplate(ws, b.id, 't1');
    expect(ws.projects!.find((x) => x.id === b.id)!.layout).toEqual({ name: 'FIT GmbH', primary: '#203040', radius: 0 });
    const rm = Gp.removeLayoutTemplate(ws, 't1')!;
    expect(rm.ws.layoutTemplates).toBeUndefined();
    ws = Gp.restoreLayoutTemplate(rm.ws, rm.undo.t, rm.undo.index);
    expect(ws.layoutTemplates!.map((t) => t.id)).toEqual(['t1']);
    expect(L.parseLayoutTemplates([{ id: 'x', name: 'Blau', rules: { primary: '#00f', font: 'comic' } }, { id: 'y', name: 'blau', rules: {} }, { name: 'ohne Id' }])).toEqual([{ id: 'x', name: 'Blau', rules: { primary: '#0000ff' } }]);
  });
});

describe('V156 Regel „Extern“, Graustufen und Netzplan-Balken folgen den Regeln', () => {
  it('ohne Regel wie bisher, mit Regel aus der Farbe gerechnet', async () => {
    const L = await import('./layoutRules');
    const Gp = await import('./gpm');
    const Gf = await import('./gpmFigures');
    const { editProject } = await import('./projects');
    expect(L.sanitizeLayout({ external: '#C7DCF3' })).toBeUndefined();
    expect(L.sanitizeLayout({ external: '#336699' })).toEqual({ external: '#336699' });
    const made = addProject(W.defaultWorkspace(), 'Ext')!;
    const id = made.id;
    let ws = editProject(made.ws, id, { roles: [{ id: 'lead', name: 'Projektleitung' }, { id: 'x1', name: 'Berater', kind: 'external', org: 'Firma A', parent: 'lead', link: 'contract' }, { id: 'x2', name: 'Lieferant', kind: 'external', org: 'Firma B', parent: 'lead', link: 'contract' }] });
    const svg0 = Gf.figureSvg(ws, id, 'org');
    expect(svg0).toContain('stop-color="#c7dcf3"');
    expect(svg0).toContain('fill="#9a9a9a"');
    ws = Gp.editLayout(ws, id, { external: '#336699', muted: '#204060' });
    const svg = Gf.figureSvg(ws, id, 'org');
    expect(svg).not.toContain('stop-color="#c7dcf3"');
    expect(svg).toContain('stop-color="#336699"');
    expect(svg).not.toContain('fill="#9a9a9a"');
    expect(Gf.extTones('#336699').slate).toBe(L.shade('#336699', -0.62));
    expect(Gf.gy('#666666')).toBe('#666666');
    // nach dem Zeichnen gilt wieder die Vorgabe
    expect(Gf.figureSvg(editProject(ws, id, { layout: undefined }), id, 'org')).toBe(svg0);
  });
});

describe('V156 F-232 P13 Inhaltsverzeichnis wie im Report', () => {
  it('Hauptkapitel mit ICB4-Element, Unterkapitel mit Nummer, Anlagen am Ende; Seitenzahl nur mit Paged.js', async () => {
    const Rp = await import('./gpmReport');
    const Fk = await import('./formKit');
    const e = Rp.tocEntries(Fk.GPM_D_ID, Fk.GPM_D.forms, [{ id: 'an-fb', name: 'Anlage A Problemstellungen (2)' }]);
    expect(e[0]).toEqual({ no: '2.', name: 'Anforderung und Ziele [4.5.2]', href: '#f-charter', main: true });
    expect(e[1]).toMatchObject({ no: '2.1.', name: 'Projektsteckbrief', main: false });
    expect(e.find((x) => x.name === 'Stakeholderanalyse')).toMatchObject({ no: '', main: false });
    const an = e.findIndex((x) => x.name === 'Anlagen');
    expect(e[an + 1]).toMatchObject({ href: '#an-fb', main: false });
    expect(e.filter((x) => x.main).length).toBe(15);
    // eigene Vorlage mit fremden Nummern: keine erfundenen Kapitelnamen
    const own = Rp.tocEntries('mine', [{ ...Fk.GPM_D.forms[0], id: 'x1', chapter: '7' }], []);
    expect(own).toEqual([{ no: '7.', name: 'Projektsteckbrief', href: '#f-x1', main: true }]);
    const made = addProject(W.defaultWorkspace(), 'Toc')!;
    const plain = Rp.reportHtml(made.ws, made.id, { day: '2026-11-28' });
    expect(plain).toContain('<nav class="toc"');
    expect(plain).not.toContain('PagedConfig');
    const paged = Rp.reportHtml(made.ws, made.id, { day: '2026-11-28', paged: 'http://localhost:2910/paged.js' });
    expect(paged).toContain('<body class="paged">');
    expect(paged).toContain('src="http://localhost:2910/paged.js"');
    expect(paged).not.toContain('<div class="bar">');
  });
});
