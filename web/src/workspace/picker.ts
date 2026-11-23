/**
 * F-147: Farbpipette. Farben werden als HEX gemerkt (klein, #rrggbb); zuletzt aufgenommene stehen
 * in einer kurzen Liste (nur in diesem Browser, nicht im Abgleich – Werkzeug, kein Stand).
 */
export const PICKER_KEY = 'esource.colors.v1';
export const PICKER_MAX = 12;

/** „#ABC“, „abcdef“, „#AbCdEf“ → „#abcdef“; ungültig → null. */
export function normalizeHex(v: string): string | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  return `#${h.toLowerCase()}`;
}

export function hexToRgb(hex: string): [number, number, number] | null {
  const h = normalizeHex(hex);
  if (!h) return null;
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

/** „rgb(255, 0, 0)“ */
export function rgbText(hex: string): string {
  const c = hexToRgb(hex);
  return c ? `rgb(${c.join(', ')})` : '';
}

/** Neue Farbe vorn, ohne Doppelte, höchstens PICKER_MAX. */
export function pushColor(list: string[], hex: string, max = PICKER_MAX): string[] {
  const h = normalizeHex(hex);
  if (!h) return list;
  return [h, ...list.filter((x) => x !== h)].slice(0, max);
}

export function parseColors(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    const h = typeof x === 'string' ? normalizeHex(x) : null;
    if (h && !out.includes(h)) out.push(h);
  }
  return out.slice(0, PICKER_MAX);
}

export function loadColors(): string[] {
  try {
    return parseColors(JSON.parse(localStorage.getItem(PICKER_KEY) ?? '[]'));
  } catch {
    return [];
  }
}

export function saveColors(list: string[]): void {
  try {
    localStorage.setItem(PICKER_KEY, JSON.stringify(list));
  } catch {
    /* Speicher voll oder gesperrt – Liste gilt nur bis zum Schließen */
  }
}

/** Grobe Farbbeschreibung für die Ansage (Bildschirmleser), z. B. „dunkles Blau“. */
export function colorName(hex: string): string {
  const c = hexToRgb(hex);
  if (!c) return '';
  const [r, g, b] = c.map((x) => x / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d < 0.08) return l < 0.12 ? 'Schwarz' : l > 0.92 ? 'Weiß' : l < 0.4 ? 'dunkles Grau' : l > 0.7 ? 'helles Grau' : 'Grau';
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  const names: [number, string][] = [
    [15, 'Rot'],
    [45, 'Orange'],
    [70, 'Gelb'],
    [160, 'Grün'],
    [200, 'Türkis'],
    [255, 'Blau'],
    [290, 'Violett'],
    [335, 'Pink'],
    [360, 'Rot'],
  ];
  const name = names.find(([edge]) => h < edge)?.[1] ?? 'Rot';
  return l < 0.3 ? `dunkles ${name}` : l > 0.75 ? `helles ${name}` : name;
}
