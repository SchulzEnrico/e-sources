import { describe, expect, it } from 'vitest';
import * as S from './noteSources';
import { createNote } from './notes';
import { defaultWorkspace } from './workspace';

// F-206 Schritt 6 (V93): Notiz ↔ Quelle
const eq = (a: unknown, b: unknown, m: string) => expect(a, m).toEqual(b);

describe('noteSources (V93)', () => {
  it('Stelle, Verknüpfen, Gegenrichtung, Rückgängig', () => {
    eq(S.parseTime('1:35'), 95, 'time m:s'); eq(S.parseTime('1:02:03'), 3723, 'time h'); eq(S.parseTime('1m35s'), 95, 'yt'); eq(S.parseTime('95s'), 95, '95s'); eq(S.parseTime('x'), undefined, 'bad');
    eq(S.spotFromUrl('https://www.youtube.com/watch?v=abc&t=95s'), { time: 95 }, 'yt t');
    eq(S.spotFromUrl('https://youtu.be/abc?t=1m5s'), { time: 65 }, 'youtu.be');
    eq(S.spotFromUrl('https://x.de/a.pdf#page=12'), { page: 12 }, 'pdf');
    eq(S.spotFromUrl('https://de.wikipedia.org/wiki/Hamburg#Geschichte'), { section: 'Geschichte' }, 'anker');
    eq(S.spotFromUrl('https://de.wikipedia.org/wiki/Hamburg#Freie_und_Hansestadt'), { section: 'Freie und Hansestadt' }, 'anker _');
    eq(S.spotFromUrl('https://x.de/'), undefined, 'none');
    eq(S.urlWithSpot('https://www.youtube.com/watch?v=abc', { time: 95 }), 'https://www.youtube.com/watch?v=abc&t=95s', 'yt write');
    eq(S.urlWithSpot('https://x.de/a.pdf', { page: 3 }), 'https://x.de/a.pdf#page=3', 'pdf write');
    eq(S.urlWithSpot('https://x.de/v.mp4', { time: 7 }), 'https://x.de/v.mp4#t=7', 'media');
    eq(S.urlWithSpot('https://de.wikipedia.org/wiki/Hamburg', { section: 'Freie und Hansestadt' }), 'https://de.wikipedia.org/wiki/Hamburg#Freie_und_Hansestadt', 'wiki');
    eq(S.urlWithSpot('https://x.de/', { section: 'zwei Worte' }), 'https://x.de/#:~:text=zwei%20Worte', 'textfragment');
    eq(S.urlWithoutSpot('https://www.youtube.com/watch?v=abc&t=95s#x'), 'https://www.youtube.com/watch?v=abc', 'without');
    eq(S.parseSpotInput('S. 12'), { page: 12 }, 'in page'); eq(S.parseSpotInput('1:35'), { time: 95 }, 'in time'); eq(S.parseSpotInput('Kapitel 2'), { section: 'Kapitel 2' }, 'in sec'); eq(S.parseSpotInput(' '), undefined, 'in empty');
    eq(S.spotText({ time: 3723 }), '1:02:03', 'text h'); eq(S.spotText({ page: 4 }), 'S. 4', 'text p');
    // verknüpfen
    let ws = defaultWorkspace();
    let k = 0; const mk = () => 'id' + ++k;
    const c = createNote(ws, { title: 'N' }, { id: 'n1' }); ws = c.ws;
    const before = ws.bookmarks.length;
    let r = S.linkSource(ws, 'n1', { url: 'https://www.youtube.com/watch?v=abc&t=95s', title: 'Video' }, mk, { now: 1 });
    eq(r.created, true, 'created source'); eq(r.ws.bookmarks.length, before + 1, 'one more');
    const src = r.ws.bookmarks.find((b) => b.id === r.link!.id)!;
    eq(src.url, 'https://www.youtube.com/watch?v=abc', 'source without spot'); eq(src.origin?.via, 'note', 'origin');
    eq(r.link!.at, { time: 95 }, 'spot from url');
    ws = r.ws;
    r = S.linkSource(ws, 'n1', { url: 'https://www.youtube.com/watch?v=abc&t=95s', title: 'Video' }, mk);
    eq(r.ws.notes!.find((n) => n.id === 'n1')!.sources!.length, 1, 'no duplicate'); eq(r.created, false, 'reuse');
    r = S.linkSource(ws, 'n1', { url: 'https://www.youtube.com/watch?v=abc', title: 'Video', at: { time: 10 } }, mk); ws = r.ws;
    eq(ws.notes!.find((n) => n.id === 'n1')!.sources!.length, 2, 'other spot = second link'); eq(ws.bookmarks.length, before + 1, 'same source');
    eq(S.notesOfSource(ws, { url: 'https://www.youtube.com/watch?v=abc&t=3' }).map((n) => n.id), ['n1'], 'reverse by url');
    eq(S.notesOfSource(ws, { id: src.id }).length, 1, 'reverse by id');
    ws = S.setLinkSpot(ws, 'n1', 1, { page: 2 });
    eq(ws.notes!.find((n) => n.id === 'n1')!.sources![1].at, { page: 2 }, 'set spot');
    const u = S.unlinkSource(ws, 'n1', 0); eq(u.removed?.at, { time: 95 }, 'removed');
    eq(u.ws.notes!.find((n) => n.id === 'n1')!.sources!.length, 1, 'one left');
    ws = S.restoreLink(u.ws, 'n1', 0, u.removed!);
    eq(ws.notes!.find((n) => n.id === 'n1')!.sources![0].at, { time: 95 }, 'restored in place');
    // gelöscht
    const ws2 = { ...ws, bookmarks: ws.bookmarks.filter((b) => b.id !== src.id) };
    const v = S.linksOf(ws2, ws2.notes!.find((n) => n.id === 'n1')!);
    eq(v[0].gone, true, 'gone'); eq(v[0].open, 'https://www.youtube.com/watch?v=abc&t=95s', 'open with spot');
    const ws3 = S.reviveSource(ws2, v[0].link);
    eq(S.linksOf(ws3, ws3.notes!.find((n) => n.id === 'n1')!)[0].gone, false, 'revived');
    const all = S.unlinkSource(S.unlinkSource(ws, 'n1', 0).ws, 'n1', 0).ws;
    eq('sources' in all.notes!.find((n) => n.id === 'n1')!, false, 'empty removes field');
  });
});
