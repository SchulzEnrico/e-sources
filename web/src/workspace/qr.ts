/** V146 (F-232 P10, Report S. 19/24): QR-Code ohne fremde Bibliothek – Byte-Modus, Fehlerkorrektur M (15 %),
 *  Version 1–40 nach ISO/IEC 18004 (Aufbau nach Project Nayuki, MIT). Ergebnis als Raster bzw. SVG-Pfad. */

// Fehlerkorrektur M: Prüf-Codewörter je Block und Anzahl Blöcke je Version (Index = Version)
const ECC_M = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28];
const BLOCKS_M = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49];
const FORMAT_M = 0;

const rawModules = (ver: number): number => {
  let r = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const n = Math.floor(ver / 7) + 2;
    r -= (25 * n - 10) * n - 55;
    if (ver >= 7) r -= 36;
  }
  return r;
};
const dataCodewords = (ver: number): number => Math.floor(rawModules(ver) / 8) - ECC_M[ver] * BLOCKS_M[ver];

const gfMul = (x: number, y: number): number => {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
};
function rsDivisor(degree: number): number[] {
  const r = new Array<number>(degree).fill(0);
  r[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < r.length; j++) {
      r[j] = gfMul(r[j], root);
      if (j + 1 < r.length) r[j] ^= r[j + 1];
    }
    root = gfMul(root, 0x02);
  }
  return r;
}
function rsRemainder(data: readonly number[], div: readonly number[]): number[] {
  const r = div.map(() => 0);
  for (const b of data) {
    const f = b ^ (r.shift() as number);
    r.push(0);
    div.forEach((c, i) => (r[i] ^= gfMul(c, f)));
  }
  return r;
}

const utf8 = (s: string): number[] => Array.from(new TextEncoder().encode(s));

/** Kleinste Version, in die `bytes` Bytes passen (Byte-Modus, M); 0 = zu lang. */
export function qrVersionFor(bytes: number): number {
  for (let v = 1; v <= 40; v++) if (4 + (v < 10 ? 8 : 16) + bytes * 8 <= dataCodewords(v) * 8) return v;
  return 0;
}

/** Raster des QR-Codes (true = dunkel, [y][x]) ohne Ruhezone; leer, wenn der Text zu lang ist. */
export function qrMatrix(text: string, mask?: number): boolean[][] {
  const bytes = utf8(text);
  const ver = qrVersionFor(bytes.length);
  if (!ver) return [];
  // Bits: Modus 0100, Länge, Daten, Abschluss, Füllbytes
  const bits: number[] = [];
  const put = (v: number, n: number) => {
    for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1);
  };
  put(4, 4);
  put(bytes.length, ver < 10 ? 8 : 16);
  bytes.forEach((b) => put(b, 8));
  const cap = dataCodewords(ver) * 8;
  put(0, Math.min(4, cap - bits.length));
  put(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < cap; pad ^= 0xec ^ 0x11) put(pad, 8);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  // Blöcke mit Reed-Solomon, verschränkt
  const nBlocks = BLOCKS_M[ver];
  const eccLen = ECC_M[ver];
  const raw = Math.floor(rawModules(ver) / 8);
  const nShort = nBlocks - (raw % nBlocks);
  const shortLen = Math.floor(raw / nBlocks);
  const div = rsDivisor(eccLen);
  const blocks: number[][] = [];
  for (let i = 0, k = 0; i < nBlocks; i++) {
    const dat = data.slice(k, k + shortLen - eccLen + (i < nShort ? 0 : 1));
    k += dat.length;
    const ecc = rsRemainder(dat, div);
    if (i < nShort) dat.push(0);
    blocks.push(dat.concat(ecc));
  }
  const words: number[] = [];
  for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => (i !== shortLen - eccLen || j >= nShort) && words.push(b[i]));

  const size = ver * 4 + 17;
  const mod: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const fn: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const set = (x: number, y: number, dark: boolean) => {
    mod[y][x] = dark;
    fn[y][x] = true;
  };
  for (let i = 0; i < size; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  const finder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4);
      }
  };
  finder(3, 3);
  finder(size - 4, 3);
  finder(3, size - 4);
  const align: number[] = [];
  if (ver > 1) {
    const n = Math.floor(ver / 7) + 2;
    const step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
    align.push(6);
    for (let pos = size - 7; align.length < n; pos -= step) align.splice(1, 0, pos);
  }
  align.forEach((ay, i) =>
    align.forEach((ax, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === align.length - 1) || (i === align.length - 1 && j === 0)) return;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }),
  );
  const formatBits = (m: number) => {
    const d = (FORMAT_M << 3) | m;
    let r = d;
    for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    const b = ((d << 10) | r) ^ 0x5412;
    const bit = (i: number) => ((b >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) set(8, i, bit(i));
    set(8, 7, bit(6));
    set(8, 8, bit(7));
    set(7, 8, bit(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
    set(8, size - 8, true);
  };
  formatBits(0);
  if (ver >= 7) {
    let r = ver;
    for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
    const b = (ver << 12) | r;
    for (let i = 0; i < 18; i++) {
      const dark = ((b >>> i) & 1) === 1;
      const a = size - 11 + (i % 3);
      const c = Math.floor(i / 3);
      set(a, c, dark);
      set(c, a, dark);
    }
  }
  // Datenbits im Zickzack von unten rechts
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let v = 0; v < size; v++)
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const up = ((right + 1) & 2) === 0;
        const y = up ? size - 1 - v : v;
        if (!fn[y][x] && i < words.length * 8) {
          mod[y][x] = ((words[i >>> 3] >>> (7 - (i & 7))) & 1) === 1;
          i++;
        }
      }
  }
  const flip = (m: number, x: number, y: number): boolean => {
    switch (m) {
      case 0: return (x + y) % 2 === 0;
      case 1: return y % 2 === 0;
      case 2: return x % 3 === 0;
      case 3: return (x + y) % 3 === 0;
      case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
      case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
      case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
      default: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
    }
  };
  const applyMask = (m: number) => {
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && flip(m, x, y)) mod[y][x] = !mod[y][x];
  };
  const pick = (m: number) => {
    applyMask(m);
    formatBits(m);
  };
  if (mask !== undefined && mask >= 0 && mask < 8) pick(mask);
  else {
    let best = 0;
    let low = Infinity;
    for (let m = 0; m < 8; m++) {
      pick(m);
      const pen = penalty(mod);
      if (pen < low) (low = pen), (best = m);
      applyMask(m); // zurück
    }
    pick(best);
  }
  return mod;
}

/** Strafpunkte für die Wahl der Maske (Regeln 1–4 der Norm – lange Reihen, 2×2-Flächen, Suchmuster-Folgen, Hell/Dunkel-Verhältnis). */
function penalty(m: boolean[][]): number {
  const n = m.length;
  let p = 0;
  let dark = 0;
  for (let a = 0; a < n; a++) {
    let rr = 1;
    let rc = 1;
    for (let b = 0; b < n; b++) {
      if (m[a][b]) dark++;
      if (b > 0) {
        if (m[a][b] === m[a][b - 1]) rr++;
        else rr = 1;
        if (m[b][a] === m[b - 1][a]) rc++;
        else rc = 1;
        if (rr === 5) p += 3;
        else if (rr > 5) p++;
        if (rc === 5) p += 3;
        else if (rc > 5) p++;
      }
      if (a > 0 && b > 0 && m[a][b] === m[a - 1][b] && m[a][b] === m[a][b - 1] && m[a][b] === m[a - 1][b - 1]) p += 3;
    }
  }
  // Regel 3: Folgen, die wie ein Suchmuster aussehen (1:1:3:1:1 mit vier hellen Modulen davor oder danach)
  const A = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
  const B = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
  const like = (get: (i: number) => boolean, at: number, pat: number[]) => pat.every((v, i) => get(at + i) === (v === 1));
  for (let a = 0; a < n; a++)
    for (let b = 0; b + 11 <= n; b++) {
      const row = (i: number) => m[a][i];
      const col = (i: number) => m[i][a];
      if (like(row, b, A) || like(row, b, B)) p += 40;
      if (like(col, b, A) || like(col, b, B)) p += 40;
    }
  const k = Math.ceil(Math.abs(dark * 20 - n * n * 10) / (n * n)) - 1;
  return p + Math.max(0, k) * 10;
}

/** SVG-Pfad der dunklen Module (1 Einheit je Modul, Ruhezone `quiet` Module) und Kantenlänge in Modulen. */
export function qrPath(text: string, quiet = 2): { d: string; n: number } {
  const m = qrMatrix(text);
  if (!m.length) return { d: '', n: 0 };
  const parts: string[] = [];
  m.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (!row[x]) continue;
      let w = 1;
      while (x + w < row.length && row[x + w]) w++;
      parts.push(`M${x + quiet} ${y + quiet}h${w}v1h-${w}z`);
      x += w - 1;
    }
  });
  return { d: parts.join(''), n: m.length + 2 * quiet };
}

/** Eigenständiges SVG (weißer Grund) für Bericht und Blatt; `label` für Bildschirmleser. */
export function qrSvg(text: string, px: number, label: string): string {
  const { d, n } = qrPath(text);
  if (!n) return '';
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="${px}" height="${px}" role="img" aria-label="${esc(label)}" shape-rendering="crispEdges"><title>${esc(label)}</title><rect width="${n}" height="${n}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}

/** QR-Code als eingebettetes Stück in einer größeren Zeichnung (Kopf der Statusbericht-Blätter). */
export function qrInner(text: string, x: number, y: number, size: number): string {
  const { d, n } = qrPath(text);
  if (!n) return '';
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}
