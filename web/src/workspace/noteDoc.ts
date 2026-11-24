/**
 * F-206 Eingabe (Entscheidung Enrico, V62): Anwender schreiben direkt in der formatierten Notiz,
 * gespeichert wird weiter Markdown. Dieses Modul ist die reine Umwandlung dazwischen:
 * je Markdown-Zeile ein Block (Codeblock = mehrere Zeilen), Inline-Teile als Bausteine.
 * Keine DOM-Zugriffe – der Editor (NoteEditor.tsx) baut daraus seine Elemente selbst, nie per innerHTML.
 */

export type BlockKind = 'p' | 'h' | 'li' | 'ol' | 'task' | 'quote' | 'code' | 'img';

export interface Block {
  k: BlockKind;
  /** Inline-Markdown (bei `code` reiner Text, mehrzeilig). */
  text: string;
  /** Aufgabe erledigt. */
  done?: boolean;
  /** Überschrift 1–6 (V74, Wunsch Enrico; vorher 1–3). */
  level?: HLevel;
  /** V79 (F-215 B1): Bild im Text – Schlüssel im Gerätespeicher (imageStore); `text` = Beschreibung (alt). */
  ref?: string;
}
export type HLevel = 1 | 2 | 3 | 4 | 5 | 6;

const LIST = /^\s*[-*+]\s+/;
const NUM = /^\s*\d+[.)]\s+/;
const TASK = /^\s*[-*+]\s+\[([ xX])\]\s?/;

/**
 * V79 (F-215, Entscheidung B1 „Bild im Text“): ein Bild steht als eigene Zeile im Markdown,
 * `![Beschreibung](es-img:<Schlüssel>)`. Das Bild selbst liegt nur auf dem Gerät (imageStore), wie der Ton.
 */
export const IMG_SCHEME = 'es-img:';
const IMG = /^!\[((?:[^\]\\]|\\.)*)\]\(es-img:([A-Za-z0-9_-]+)\)\s*$/;
/** Markdown einer Bild-Zeile */
export const imgLine = (ref: string, alt = '') => `![${alt.replace(/[\\\]]/g, (c) => `\\${c}`).replace(/\n/g, ' ')}](${IMG_SCHEME}${ref})`;
/** Alle Bild-Schlüssel eines Markdown-Texts (Reihenfolge wie im Text) */
export function imgRefs(md: string): string[] {
  const out: string[] = [];
  for (const l of md.split('\n')) {
    const m = IMG.exec(l);
    if (m) out.push(m[2]);
  }
  return out;
}

/** Eine Markdown-Zeile → Block (ohne Codeblock). */
export function parseLine(line: string): Block {
  let m: RegExpExecArray | null;
  if ((m = IMG.exec(line))) return { k: 'img', text: m[1].replace(/\\(.)/g, '$1'), ref: m[2] };
  if ((m = TASK.exec(line))) return { k: 'task', text: line.slice(m[0].length), done: m[1] !== ' ' };
  if ((m = /^(#{1,6})\s+/.exec(line))) return { k: 'h', text: line.slice(m[0].length), level: Math.min(6, m[1].length) as HLevel };
  if ((m = LIST.exec(line))) return { k: 'li', text: line.slice(m[0].length) };
  if ((m = NUM.exec(line))) return { k: 'ol', text: line.slice(m[0].length) };
  if ((m = /^>\s?/.exec(line))) return { k: 'quote', text: line.slice(m[0].length) };
  // „\“ vorn schützt Text, der sonst wie ein Zeichen oben aussähe
  return { k: 'p', text: /^\\[-*+#>\d!]/.test(line) ? line.slice(1) : line };
}

/** Markdown → Blöcke. Leere Zeilen werden leere Absätze (nichts geht verloren). */
export function parseDoc(md: string): Block[] {
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  const out: Block[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^```/.test(lines[i])) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) body.push(lines[i++]);
      out.push({ k: 'code', text: body.join('\n') });
      continue;
    }
    out.push(parseLine(lines[i]));
  }
  return out.length ? out : [{ k: 'p', text: '' }];
}

/** Absatz-Text, der als Zeichen gelesen würde, bekommt ein „\“ davor. */
const guard = (t: string) => (/^(\s*([-*+]\s|\d+[.)]\s|#{1,6}\s|>)|```)/.test(t) || IMG.test(t) ? `\\${t}` : t);

/** Blöcke → Markdown. Nummerierte Listen werden je Lauf neu gezählt. */
export function serializeDoc(blocks: Block[]): string {
  let n = 0;
  const lines = blocks.map((b) => {
    n = b.k === 'ol' ? n + 1 : 0;
    switch (b.k) {
      case 'h':
        return `${'#'.repeat(b.level ?? 1)} ${b.text}`;
      case 'li':
        return `- ${b.text}`;
      case 'ol':
        return `${n}. ${b.text}`;
      case 'task':
        return `- [${b.done ? 'x' : ' '}] ${b.text}`;
      case 'quote':
        return `> ${b.text}`;
      case 'code':
        return `\`\`\`\n${b.text}\n\`\`\``;
      case 'img':
        return b.ref ? imgLine(b.ref, b.text) : '';
      default:
        return guard(b.text);
    }
  });
  // nur leere Absätze am Ende nicht mitschreiben
  while (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  return lines.length === 1 && lines[0] === '' ? '' : lines.join('\n');
}

/**
 * Tipp-Kürzel am Anfang eines Absatzes: „- “, „* “, „1. “, „[] “, „[ ] “, „- [ ] “, „# “, „> “.
 * Gibt den neuen Block zurück (Text ohne Kürzel) oder null.
 */
export function shortcut(text: string): Block | null {
  let m: RegExpExecArray | null;
  if ((m = /^(?:[-*+]\s)?\[(\s?|x)\]\s/.exec(text))) return { k: 'task', text: text.slice(m[0].length), done: m[1] === 'x' };
  if ((m = /^(#{1,6})\s/.exec(text))) return { k: 'h', text: text.slice(m[0].length), level: m[1].length as HLevel };
  if ((m = /^[-*+]\s/.exec(text))) return { k: 'li', text: text.slice(m[0].length) };
  if ((m = /^1[.)]\s/.exec(text))) return { k: 'ol', text: text.slice(m[0].length) };
  if ((m = /^>\s/.exec(text))) return { k: 'quote', text: text.slice(m[0].length) };
  return null;
}

// ---------- Inline ----------

export type Span =
  | { t: 'text'; text: string }
  | { t: 'b' | 'i'; kids: Span[] }
  | { t: 'code'; text: string }
  | { t: 'link'; text: string; href: string };

/** Nur sichere Adressen werden zu Links. */
export const safeHref = (u: string): string | undefined => (/^(https?:|mailto:)/i.test(u) ? u : undefined);

const unesc = (s: string) => s.replace(/\\([\\*_`[\]])/g, '$1');

/** Inline-Markdown → Bausteine (fett, kursiv, Code, Links, „\“-Schutz). */
export function parseInline(text: string): Span[] {
  const out: Span[] = [];
  const re = /(\\[\\*_`[\]])|(`[^`]+`)|(\*\*(?:\\.|[^\\])+?\*\*)|(\*(?:\\.|[^*\s\\])(?:\\.|[^*\\])*\*)|(\[[^\]]+\]\([^)\s]+\))|(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g;
  let last = 0;
  let buf = '';
  let m: RegExpExecArray | null;
  const flush = () => {
    if (buf) out.push({ t: 'text', text: buf });
    buf = '';
  };
  while ((m = re.exec(text))) {
    buf += text.slice(last, m.index);
    const s = m[0];
    last = m.index + s.length;
    if (m[1]) {
      buf += s[1];
      continue;
    }
    flush();
    if (m[2]) out.push({ t: 'code', text: s.slice(1, -1) });
    else if (m[3]) out.push({ t: 'b', kids: parseInline(s.slice(2, -2)) });
    else if (m[4]) out.push({ t: 'i', kids: parseInline(s.slice(1, -1)) });
    else if (m[5]) {
      const [, label, href] = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(s)!;
      const h = safeHref(href);
      out.push(h ? { t: 'link', text: unesc(label), href: h } : { t: 'text', text: s });
    } else out.push({ t: 'link', text: s, href: s });
  }
  buf += text.slice(last);
  flush();
  return out;
}

/** Sichtbarer Text der Bausteine (für Titel und Schreibmarke). */
export function plainOf(spans: Span[]): string {
  return spans.map((s) => ('kids' in s ? plainOf(s.kids) : s.text)).join('');
}

/** Getippter Text → Inline-Markdown (Zeichen geschützt, damit nichts ungewollt fett wird). */
export const escInline = (t: string): string => t.replace(/[\\*`[\]]/g, (c) => `\\${c}`);

/** Bausteine → Inline-Markdown (Gegenstück zu parseInline). */
export function inlineMd(spans: Span[]): string {
  return spans
    .map((s) => {
      switch (s.t) {
        case 'text':
          return escInline(s.text);
        case 'code':
          return s.text ? `\`${s.text.replace(/`/g, '')}\`` : '';
        case 'link':
          return s.text === s.href ? s.href : `[${escInline(s.text)}](${s.href})`;
        default: {
          const inner = inlineMd(s.kids);
          if (!inner.trim()) return inner;
          const mark = s.t === 'b' ? '**' : '*';
          // Leerzeichen außen lassen, sonst gilt das Zeichen nicht
          const lead = inner.match(/^\s*/)![0];
          const tail = inner.match(/\s*$/)![0];
          return `${lead}${mark}${inner.trim()}${mark}${tail}`;
        }
      }
    })
    .join('');
}

/** Aufeinanderfolgende gleiche Bausteine zusammenlegen (nach dem Lesen aus dem Editor). */
export function mergeSpans(spans: Span[]): Span[] {
  const out: Span[] = [];
  for (const s of spans) {
    const prev = out[out.length - 1];
    if (prev && prev.t === 'text' && s.t === 'text') out[out.length - 1] = { t: 'text', text: prev.text + s.text };
    else if (prev && (prev.t === 'b' || prev.t === 'i') && prev.t === s.t) out[out.length - 1] = { t: prev.t, kids: mergeSpans([...prev.kids, ...(s as { kids: Span[] }).kids]) };
    else if ('text' in s && (s.t === 'text' || s.t === 'code') && !s.text) continue;
    else out.push(s);
  }
  return out;
}

/** Alle Aufgaben-Zeilen: erledigt/gesamt (für Karten und Fortschritt). */
export function taskCount(md: string): { done: number; all: number } {
  const t = parseDoc(md).filter((b) => b.k === 'task');
  return { done: t.filter((b) => b.done).length, all: t.length };
}
