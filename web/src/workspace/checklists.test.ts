import { describe, expect, it } from 'vitest';
import * as CL from './checklists';

const text = 'Beschreibung\n\n### ☑ Unterlagen\n- [ ] Vertrag — @Anna Berg, bis 04.12.2026\n- [x] Plan\n\n### ☑ Messe\n- [ ] Stand — bis 01.02.2027';

describe('V121 F-231 K2 Checklisten', () => {
  it('liest mehrere benannte Listen mit Person und Datum', () => {
    const ls = CL.checklistsOf(text);
    expect(ls.map((l) => l.name)).toEqual(['Unterlagen', 'Messe']);
    expect(ls[0].items[0]).toMatchObject({ text: 'Vertrag', who: 'Anna Berg', due: '2026-12-04', done: false, index: 0 });
    expect(ls[1].items[0]).toMatchObject({ text: 'Stand', due: '2027-02-01', index: 2 });
    expect(CL.listProgress(ls[0])).toEqual({ done: 1, all: 2 });
  });
  it('hakt ab, fügt Punkte hinzu, ändert und löscht', () => {
    const ls = CL.checklistsOf(text);
    let t = CL.toggleItem(text, ls[0].items[0].line);
    expect(CL.checklistsOf(t)[0].items[0].done).toBe(true);
    t = CL.addItem(t, 0, 'Rechnung', 'Bob');
    expect(CL.checklistsOf(t)[0].items.map((i) => i.text)).toEqual(['Vertrag', 'Plan', 'Rechnung']);
    expect(CL.checklistsOf(t)[0].items[2].who).toBe('Bob');
    const line = CL.checklistsOf(t)[0].items[2].line;
    t = CL.setItem(t, line, { who: null, due: '2026-12-24' });
    expect(t).toContain('- [ ] Rechnung — bis 24.12.2026');
    t = CL.removeItem(t, line);
    expect(CL.checklistsOf(t)[0].items).toHaveLength(2);
  });
  it('legt Listen an und übernimmt sie von einer anderen Karte (offen)', () => {
    let t = CL.addItem('Nur Text', 0, 'Erster');
    expect(t).toBe('Nur Text\n\n### ☑ Checkliste\n- [ ] Erster');
    t = CL.copyChecklists('X', text);
    const ls = CL.checklistsOf(t);
    expect(ls.map((l) => l.name)).toEqual(['Unterlagen', 'Messe']);
    expect(ls[0].items.every((i) => !i.done)).toBe(true);
    expect(ls[0].items[0].who).toBe('Anna Berg');
  });
});
