import { describe, expect, it } from 'vitest';
import * as W from './workspace';
import * as Sp from './sampleProject';
import * as T from './trello';
import { notesOf, titleOf, viewsOf } from './notes';
import { projectById } from './projects';
import { parseForeign } from './foreign';

/** kleines Board wie aus Trello › „Als JSON exportieren“ (gekürzt, mit unbekannten Feldern) */
const board = () => ({
  id: 'b0000000000000000000000a',
  name: 'Messe 2027',
  desc: 'Stand auf der Hannover Messe',
  closed: false,
  url: 'https://trello.com/b/abc/messe-2027',
  prefs: { background: 'blue', permissionLevel: 'private' },
  labelNames: { green: 'Einkauf', red: '' },
  labels: [
    { id: 'l1', idBoard: 'b0000000000000000000000a', name: 'Einkauf', color: 'green' },
    { id: 'l2', idBoard: 'b0000000000000000000000a', name: '', color: 'red' },
  ],
  lists: [
    { id: 'L2', name: 'In Arbeit', closed: false, pos: 32768, softLimit: null },
    { id: 'L1', name: 'To Do', closed: false, pos: 16384 },
    { id: 'L3', name: 'Erledigt', closed: false, pos: 49152 },
    { id: 'L9', name: 'Altes', closed: true, pos: 65536 },
  ],
  members: [{ id: 'm1', fullName: 'Anna Berg', username: 'annaberg', initials: 'AB', avatarUrl: null }],
  cards: [
    {
      id: 'c1',
      name: 'Stand buchen',
      desc: 'Fläche **48 m²**',
      closed: false,
      idList: 'L1',
      pos: 1000,
      due: '2027-02-10T11:00:00.000Z',
      start: '2027-02-01T08:00:00.000Z',
      dueComplete: false,
      idLabels: ['l1', 'l2'],
      idMembers: ['m1'],
      idChecklists: ['k1'],
      shortLink: 'aaaa',
      badges: { votes: 2 },
      customFieldItems: [{ id: 'cf1', value: { text: 'X' } }],
      attachments: [{ id: 'a1', name: 'Plan.pdf', url: 'https://example.org/plan.pdf', isUpload: false }],
    },
    { id: 'c2', name: 'Prospekte', desc: '', closed: false, idList: 'L1', pos: 2000, due: null, idLabels: [], idMembers: [], idChecklists: [] },
    { id: 'c3', name: 'Logo fertig', desc: '', closed: false, idList: 'L3', pos: 500, due: null, idLabels: [], idMembers: [], idChecklists: [] },
    { id: 'c4', name: 'Verworfen', desc: 'alt', closed: true, idList: 'L2', pos: 10, idLabels: [], idMembers: [], idChecklists: [] },
    { id: 'c5', name: 'Altkarte', desc: '', closed: false, idList: 'L9', pos: 1, idLabels: [], idMembers: [], idChecklists: [] },
  ],
  checklists: [
    {
      id: 'k1',
      name: 'Unterlagen',
      idCard: 'c1',
      pos: 16384,
      checkItems: [
        { id: 'i2', name: 'Vertrag', state: 'incomplete', pos: 2 },
        { id: 'i1', name: 'Angebot', state: 'complete', pos: 1, due: '2027-01-20T10:00:00.000Z' },
      ],
    },
  ],
  actions: [
    { id: 'x1', type: 'commentCard', date: '2027-01-05T09:00:00.000Z', idMemberCreator: 'm1', data: { text: 'Bitte bis Freitag', card: { id: 'c1', name: 'Stand buchen' } } },
    { id: 'x2', type: 'updateCard', date: '2027-01-06T09:00:00.000Z', data: { card: { id: 'c2' } } },
  ],
});

const imp = (ws = W.defaultWorkspace(), b: unknown = board()) => {
  const r = T.importTrello(ws, JSON.stringify(b), { now: 1_800_000_000_000, name: 'messe.json' });
  if (!r.ok) throw new Error(r.error);
  return r;
};
const cardNotes = (ws: ReturnType<typeof W.defaultWorkspace>, pid: string) => notesOf(ws).filter((n) => n.project === pid);

describe('F-230 Trello (V119)', () => {
  it('Checklisten im Text hin und zurück', () => {
    const lists = [{ name: 'A', items: [{ name: 'eins', done: true }, { name: 'zwei', done: false }] }];
    const t = T.joinText('Text', lists);
    expect(t).toBe('Text\n\n### ☑ A\n- [x] eins\n- [ ] zwei');
    expect(T.splitText(t)).toEqual({ desc: 'Text', lists });
    expect(T.splitText('# Titel\nmehr\n- [ ] lose', 'Titel')).toEqual({ desc: 'mehr', lists: [{ name: 'Checkliste', items: [{ name: 'lose', done: false }] }] });
    expect(T.isTrello(JSON.stringify(board()))).toBe(true);
    expect(T.isTrello('<Project/>')).toBe(false);
  });

  it('Import: Projekt, Kanban-Spalten, Karten mit Zustand, Terminen, Tags, Personen, Checkliste; Unbekanntes mitgeführt', () => {
    const r = imp();
    const p = projectById(r.ws, r.project)!;
    expect(p.name).toBe('Messe 2027');
    expect(p.brief?.goal).toBe('Stand auf der Hannover Messe');
    expect(p.foreign?.from?.kind).toBe('trello');
    const v = viewsOf(r.ws).find((x) => x.id === r.view)!;
    expect(v.kind).toBe('kanban');
    expect(v.owner).toEqual({ kind: 'project', id: r.project });
    expect(v.cols!.map((c) => c.name)).toEqual(['To Do', 'In Arbeit', 'Erledigt']);
    expect(v.cols!.map((c) => c.state)).toEqual(['open', 'doing', 'done']);
    const ns = cardNotes(r.ws, r.project);
    expect(ns.map((n) => n.title)).toEqual(['Stand buchen', 'Prospekte', 'Verworfen', 'Logo fertig', 'Altkarte']);
    const c1 = ns[0];
    expect(c1.due).toBe('2027-02-10');
    expect(c1.notBefore).toBe('2027-02-01');
    expect(c1.tags).toEqual(['Einkauf', 'rot']);
    expect(c1.text).toBe('Fläche **48 m²**\n\n### ☑ Unterlagen\n- [x] Angebot — bis 20.01.2027\n- [ ] Vertrag');
    expect(r.ws.persons!.some((x) => x.id === c1.assignee && x.name === 'Anna Berg')).toBe(true);
    expect((c1.foreign?.trello as Record<string, unknown>).customFieldItems).toBeTruthy();
    expect(((c1.foreign?.trello as Record<string, unknown>).comments as unknown[]).length).toBe(1);
    expect(ns.find((n) => n.title === 'Verworfen')!.state).toBe('archived');
    expect(ns.find((n) => n.title === 'Logo fertig')!.state).toBe('done');
    expect(v.cols![0].ids).toEqual([ns[0].id, ns[1].id]);
    expect(v.cols![2].ids).toEqual([ns[3].id]);
    expect(r.cards).toBe(5);
    expect(r.checklists).toBe(1);
    expect(r.kept).toBeGreaterThan(0);
    // Fremddaten überstehen das Laden (Dateiformat 12)
    expect(parseForeign(JSON.parse(JSON.stringify(c1.foreign)))?.trello).toEqual(c1.foreign?.trello);
  });

  it('Rundlauf Board → E-Sources → JSON: Ids, pos, Felder und unbekannte Angaben unverändert', () => {
    const r = imp();
    const out = JSON.parse(T.exportTrello(r.ws, r.project, { now: 1_800_000_000_000 }));
    const b = board();
    expect(out.id).toBe(b.id);
    expect(out.prefs).toEqual(b.prefs);
    expect(out.url).toBe(b.url);
    expect(out.lists.map((l: { id: string; pos: number; closed: boolean }) => [l.id, l.pos, l.closed])).toEqual([
      ['L1', 16384, false],
      ['L2', 32768, false],
      ['L3', 49152, false],
      ['L9', 65536, true],
    ]);
    const c1 = out.cards.find((c: { id: string }) => c.id === 'c1');
    const o1 = b.cards[0];
    for (const k of ['name', 'desc', 'idList', 'pos', 'due', 'start', 'dueComplete', 'idLabels', 'idMembers', 'idChecklists', 'shortLink', 'badges', 'customFieldItems', 'attachments'] as const) expect(c1[k]).toEqual(o1[k]);
    expect(out.cards.find((c: { id: string }) => c.id === 'c4').closed).toBe(true);
    expect(out.cards.find((c: { id: string }) => c.id === 'c5').idList).toBe('L9');
    const k1 = out.checklists.find((c: { id: string }) => c.id === 'k1');
    expect(k1.checkItems.map((i: { id: string; state: string; pos: number }) => [i.id, i.state, i.pos])).toEqual([
      ['i1', 'complete', 1],
      ['i2', 'incomplete', 2],
    ]);
    expect(k1.checkItems[0].due).toBe('2027-01-20T10:00:00.000Z');
    expect(out.labels).toEqual(b.labels.map((l, i) => ({ ...l, uses: i < 2 ? 1 : 0 })));
    expect(out.members[0]).toEqual(b.members[0]);
    expect(out.actions.map((a: { id: string }) => a.id).sort()).toEqual(['x1', 'x2']);
  });

  it('Rundlauf JSON → E-Sources → JSON → E-Sources ergibt dieselben Karten', () => {
    const r1 = imp();
    const json = T.exportTrello(r1.ws, r1.project, { now: 1_800_000_000_000 });
    const r2 = T.importTrello(W.defaultWorkspace(), json, { now: 1_800_000_000_000 });
    if (!r2.ok) throw new Error(r2.error);
    const pick = (ws: typeof r1.ws, pid: string) => cardNotes(ws, pid).map((n) => ({ title: n.title, text: n.text, state: n.state, due: n.due, nb: n.notBefore, tags: n.tags }));
    expect(pick(r2.ws, r2.project)).toEqual(pick(r1.ws, r1.project));
    const v1 = viewsOf(r1.ws).find((x) => x.id === r1.view)!;
    const v2 = viewsOf(r2.ws).find((x) => x.id === r2.view)!;
    expect(v2.cols!.map((c) => [c.name, c.ids.length])).toEqual(v1.cols!.map((c) => [c.name, c.ids.length]));
  });

  it('Beispielprojekt nach Trello und zurück: Gliederung, Vorgänger, Dauer bleiben über den eigenen Abschnitt', () => {
    const pid = Sp.SAMPLE_PROJECT;
    const ws = Sp.addSampleProject(W.defaultWorkspace(), 5);
    const json = T.exportTrello(ws, pid, { today: '2027-01-15', now: 1_800_000_000_000 });
    const out = JSON.parse(json);
    const { cards, groups } = T.cardsOf(ws, pid);
    expect(out.cards.length).toBe(cards.length);
    expect(out.eSources.notes.length).toBe(groups.length);
    expect(out.lists.map((l: { name: string }) => l.name)).toEqual(['Offen', 'In Arbeit', 'In Prüfung', 'Erledigt']);
    // Gruppen werden Labels ihrer Karten
    const withParent = cards.find((n) => n.parent)!;
    const c = out.cards.find((x: { eSources: { id: string } }) => x.eSources.id === withParent.id);
    const lab = out.labels.filter((l: { id: string }) => c.idLabels.includes(l.id)).map((l: { name: string }) => l.name);
    expect(lab).toContain(titleOf(groups.find((g) => g.id === withParent.parent)!));
    expect(c.due).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    // zurück
    const r = T.importTrello(W.defaultWorkspace(), json, { now: 1_800_000_000_000 });
    if (!r.ok) throw new Error(r.error);
    const sig = (w: typeof ws, p: string) => {
      const ns = notesOf(w).filter((n) => n.project === p);
      const t = new Map(ns.map((n) => [n.id, titleOf(n)]));
      return ns
        .map((n) => ({ title: titleOf(n), parent: n.parent ? t.get(n.parent) : undefined, after: (n.after ?? []).map((l) => `${t.get(l.id)}:${l.rel}:${l.lag ?? 0}`), duration: n.duration, ms: !!n.milestone, effort: n.effort, due: n.due, tags: n.tags }))
        .sort((a, b) => a.title.localeCompare(b.title));
    };
    expect(sig(r.ws, r.project)).toEqual(sig(ws, pid));
  });

  it('gleiche Personen: Rückfrage (F5), zusammenführen oder „(Import)“', () => {
    let ws = W.defaultWorkspace();
    ws = imp(ws).ws;
    const json = JSON.stringify({ ...board(), name: 'Messe 2027' });
    expect(T.trelloNameClashes(ws, json)).toEqual(['Anna Berg']);
    const a = T.importTrello(ws, json, { merge: ['Anna Berg'] });
    const b = T.importTrello(ws, json, { merge: [] });
    if (!a.ok || !b.ok) throw new Error('import');
    expect(a.merged).toEqual(['Anna Berg']);
    expect(projectById(a.ws, a.project)!.name).toBe('Messe 2027 (Import)');
    expect(b.ws.persons!.some((p) => p.name === 'Anna Berg (Import)')).toBe(true);
    expect(T.importTrello(ws, '{"name":"x"}').ok).toBe(false);
    expect(T.importTrello(ws, 'kein json').ok).toBe(false);
  });

  it('Kommentare und Anhänge zum Lesen (V119)', () => {
    const r = imp();
    const ns = cardNotes(r.ws, r.project);
    const x = T.trelloExtras(r.ws, ns[0])!;
    expect(x.comments).toEqual([{ at: '2027-01-05T09:00:00.000Z', by: 'Anna Berg', text: 'Bitte bis Freitag' }]);
    expect(x.attachments).toEqual([{ name: 'Plan.pdf', url: 'https://example.org/plan.pdf', upload: false }]);
    expect(T.trelloExtras(r.ws, ns[1])).toBeNull();
  });
});

describe('V121 F-231 K3/K1: archivierte Listen und Karten', () => {
  it('archivierte Liste wird archivierte Spalte, archivierte Karte bleibt in ihrer Spalte – und beides geht so zurück', () => {
    const r = T.importTrello(W.defaultWorkspace(), JSON.stringify(board()), { now: 1_800_000_000_000 });
    if (!r.ok) throw new Error('Import');
    const v = viewsOf(r.ws).find((x) => x.kind === 'kanban')!;
    expect(v.archivedCols!.map((c) => c.name)).toEqual(['Altes']);
    const alt = notesOf(r.ws).find((n) => titleOf(n) === 'Altkarte')!;
    expect(v.archivedCols![0].ids).toEqual([alt.id]);
    const verworfen = notesOf(r.ws).find((n) => titleOf(n) === 'Verworfen')!;
    expect(v.cols!.find((c) => c.name === 'In Arbeit')!.ids).toContain(verworfen.id);
    const out = JSON.parse(T.exportTrello(r.ws, r.project, { now: 1_800_000_000_000 }));
    const l9 = out.lists.find((l: { id: string }) => l.id === 'L9');
    expect(l9.closed).toBe(true);
    expect(out.cards.find((c: { id: string }) => c.id === 'c5').idList).toBe('L9');
    expect(out.cards.find((c: { id: string }) => c.id === 'c4').closed).toBe(true);
  });
});
