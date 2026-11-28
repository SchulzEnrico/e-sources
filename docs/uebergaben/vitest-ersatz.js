const tests = []; const stack = [];
exports.describe = (n, f) => { stack.push(n); f(); stack.pop(); };
exports.it = exports.test = (n, f) => tests.push([[...stack, n].join(' › '), f]);
exports.beforeEach = () => {}; exports.afterEach = () => {}; exports.vi = { fn: (f) => f || (() => {}) };
const norm = (v) => Array.isArray(v) ? v.map(norm) : v && typeof v === 'object' && !(v instanceof Date) && !(v instanceof Set) && !(v instanceof Map) ? Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => [k, norm(x)])) : v;
const eq = (a, b) => { try { require('assert').deepStrictEqual(norm(a), norm(b)); return true; } catch { return false; } };
const match = (a, b) => { if (typeof b !== 'object' || b === null) return eq(a, b); if (typeof a !== 'object' || a === null) return false; return Object.keys(b).every((k) => match(a[k], b[k])); };
const show = (v) => { try { return JSON.stringify(v); } catch { return String(v); } };
function make(v, neg) {
  const ck = (ok, m) => { if (ok === neg) throw new Error((neg ? 'not ' : '') + m + ': ' + show(v)); };
  return {
    toBe: (e) => ck(Object.is(v, e), 'toBe ' + show(e)),
    toEqual: (e) => ck(eq(v, e), 'toEqual ' + show(e)),
    toStrictEqual: (e) => ck(eq(v, e), 'toStrictEqual ' + show(e)),
    toMatchObject: (e) => ck(match(v, e), 'toMatchObject ' + show(e)),
    toBeDefined: () => ck(v !== undefined, 'toBeDefined'),
    toBeUndefined: () => ck(v === undefined, 'toBeUndefined'),
    toBeNull: () => ck(v === null, 'toBeNull'),
    toBeTruthy: () => ck(!!v, 'toBeTruthy'),
    toBeFalsy: () => ck(!v, 'toBeFalsy'),
    toBeGreaterThan: (e) => ck(v > e, '> ' + e),
    toBeGreaterThanOrEqual: (e) => ck(v >= e, '>= ' + e),
    toBeLessThan: (e) => ck(v < e, '< ' + e),
    toBeLessThanOrEqual: (e) => ck(v <= e, '<= ' + e),
    toContain: (e) => ck(v.includes(e), 'toContain ' + show(e)),
    toHaveLength: (e) => ck(v.length === e, 'length ' + e),
    toMatch: (e) => ck(typeof e === 'string' ? v.includes(e) : e.test(v), 'toMatch ' + e),
    toThrow: () => { let t = false; try { v(); } catch { t = true; } ck(t, 'toThrow'); },
  };
}
exports.expect = (v) => { const o = make(v, false); o.not = make(v, true); return o; };
let ran = false;
// V147: Tests mit async/await werden abgewartet (vorher zählten sie immer grün)
process.on('beforeExit', async () => { if (ran) return; ran = true; let ok = 0, bad = 0;
  for (const [n, f] of tests) { try { await f(); ok++; } catch (e) { bad++; console.log('FAIL', n, '\n  ', e.message); } }
  console.log(`${ok} grün, ${bad} rot`); if (bad) process.exitCode = 1; });
