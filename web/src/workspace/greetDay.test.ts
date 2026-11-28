import { describe, expect, it } from 'vitest';
import { greetDue, localDay } from './greetDay';

describe('V158 Begrüßung höchstens einmal am Tag', () => {
  it('fällig ohne Eintrag oder an einem neuen Tag, nicht am selben Tag', () => {
    expect(greetDue(null, '2026-11-28')).toBe(true);
    expect(greetDue('2026-11-27', '2026-11-28')).toBe(true);
    expect(greetDue('2026-11-28', '2026-11-28')).toBe(false);
    expect(greetDue('2026-12-31', '2027-01-01')).toBe(true);
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
