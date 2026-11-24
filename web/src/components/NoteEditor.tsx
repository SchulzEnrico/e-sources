/**
 * F-206 Eingabe (Entscheidung Enrico, V62): „Das Intuitivste – es soll Arbeit abnehmen, keine machen.“
 * Direkt in der formatierten Notiz schreiben (contenteditable), ohne Bearbeiten/Lesen und ohne
 * sichtbare Markdown-Zeichen. Gespeichert wird Markdown (noteDoc.ts).
 *
 * Aufbau im DOM: je Block ein Element mit `data-b` (p, h3–h5, blockquote, pre, li in ul/ol mit
 * `data-g`). Enter, Rückschritt/Entfernen an Blockgrenzen, Einfügen und Rückgängig macht der Editor
 * selbst; Zeichen tippt der Browser. Nach jeder Eingabe wird das DOM gelesen – fremde Strukturen
 * (vom Browser eingefügte div/span) werden dabei bereinigt. Nie innerHTML, nur eigene Elemente.
 */
import { type FormEvent, type KeyboardEvent as RKeyboardEvent, type MouseEvent as RMouseEvent, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import * as ND from '../workspace/noteDoc';
import { getPic, putPic, shrinkImage } from '../workspace/imageStore';
import { newId } from '../workspace/workspace';
import { NOTICE_MS } from '../workspace/flash';
import { PicView } from './PicView';
import { NOTE_TEXT } from '../workspace/terms';
import { Icon } from './Icon';
import { Wheel } from './RemindPicker';
import type { IconName } from '../workspace/icons';
import { joinSpeech } from '../workspace/voice';

type Block = ND.Block;
interface Caret {
  i: number;
  off: number;
}
interface Snap {
  md: string;
  caret: Caret | null;
}

// ---------- DOM bauen ----------

function spanNodes(spans: ND.Span[]): Node[] {
  return spans.map((s) => {
    switch (s.t) {
      case 'text':
        return document.createTextNode(s.text);
      case 'code': {
        const c = document.createElement('code');
        c.textContent = s.text;
        return c;
      }
      case 'link': {
        const a = document.createElement('a');
        a.href = s.href;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = s.text;
        return a;
      }
      default: {
        const el = document.createElement(s.t === 'b' ? 'strong' : 'em');
        el.append(...spanNodes(s.kids));
        return el;
      }
    }
  });
}

const TAG: Record<ND.BlockKind, string> = { p: 'p', h: 'h3', li: 'li', ol: 'li', task: 'li', quote: 'blockquote', code: 'pre', img: 'figure' };

/** V79 (F-215 B1): Bilder im Text – Adressen der Bilder aus dem Gerätespeicher, je Schlüssel einmal erzeugt */
const picUrls = new Map<string, Promise<string | null>>();
const picUrl = (ref: string) => {
  let p = picUrls.get(ref);
  if (!p) {
    p = getPic(ref).then((x) => (x ? URL.createObjectURL(x.blob) : null));
    picUrls.set(ref, p);
  }
  return p;
};

/** Bild-Block: nicht bearbeitbar, Schreibmarke davor und danach (Absätze); fehlt das Bild hier, ein Hinweis */
function imgEl(b: Block): HTMLElement {
  const el = document.createElement('figure');
  el.setAttribute('data-b', '');
  el.dataset.k = 'img';
  el.dataset.ref = b.ref ?? '';
  el.dataset.alt = b.text;
  el.contentEditable = 'false';
  el.className = 'nedit__img';
  el.title = NOTE_TEXT.imgOpenHint;
  const img = document.createElement('img');
  img.alt = b.text || NOTE_TEXT.imgAlt;
  img.draggable = false;
  el.append(img);
  if (b.ref)
    void picUrl(b.ref).then((u) => {
      if (u) img.src = u;
      else {
        el.classList.add('is-away');
        const cap = document.createElement('figcaption');
        cap.textContent = NOTE_TEXT.imgAway;
        el.append(cap);
      }
    });
  return el;
}

function blockEl(b: Block): HTMLElement {
  if (b.k === 'img') return imgEl(b);
  // V74: H1–H6 – Tags h3–h6 (h6 auch für Stufe 5 und 6), Größe und Stufe hängen an data-level
  const el = document.createElement(b.k === 'h' ? `h${Math.min(6, 2 + (b.level ?? 1))}` : TAG[b.k]);
  el.setAttribute('data-b', '');
  el.dataset.k = b.k;
  if (b.level) el.dataset.level = String(b.level);
  if (b.k === 'task') {
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = !!b.done;
    box.tabIndex = -1;
    box.contentEditable = 'false';
    box.setAttribute('aria-label', NOTE_TEXT.taskDone);
    el.append(box);
    el.classList.toggle('is-done', !!b.done);
  }
  if (b.k === 'code') {
    el.append(document.createTextNode(b.text));
    // ohne <br> zeigt der Browser eine letzte leere Zeile nicht an
    if (!b.text || b.text.endsWith('\n')) el.append(document.createElement('br'));
    return el;
  }
  const spans = ND.parseInline(b.text);
  el.append(...spanNodes(spans));
  if (!ND.plainOf(spans)) el.append(document.createElement('br'));
  return el;
}

const GROUP: Partial<Record<ND.BlockKind, string>> = { li: 'ul', task: 'ul', ol: 'ol' };

function render(root: HTMLElement, blocks: Block[]) {
  const out: Node[] = [];
  let group: HTMLElement | null = null;
  for (const b of blocks) {
    const g = GROUP[b.k];
    if (!g) {
      group = null;
      out.push(blockEl(b));
      continue;
    }
    if (!group || group.dataset.g !== b.k) {
      group = document.createElement(g);
      group.dataset.g = b.k;
      if (b.k === 'task') group.className = 'nedit__tasks';
      out.push(group);
    }
    group.append(blockEl(b));
  }
  root.replaceChildren(...out);
}

// ---------- DOM lesen ----------

const clean = (t: string) => t.replace(/ /g, ' ').replace(/​/g, '');

function readSpans(n: Node): ND.Span[] {
  const out: ND.Span[] = [];
  n.childNodes.forEach((c) => {
    if (c.nodeType === Node.TEXT_NODE) return void out.push({ t: 'text', text: clean(c.textContent ?? '') });
    if (!(c instanceof HTMLElement)) return;
    const tag = c.tagName;
    if (tag === 'INPUT' || tag === 'BR') return;
    if (tag === 'STRONG' || tag === 'B') return void out.push({ t: 'b', kids: readSpans(c) });
    if (tag === 'EM' || tag === 'I') return void out.push({ t: 'i', kids: readSpans(c) });
    if (tag === 'CODE') return void out.push({ t: 'code', text: clean(c.textContent ?? '') });
    if (tag === 'A') {
      const h = ND.safeHref(c.getAttribute('href') ?? '');
      const text = clean(c.textContent ?? '');
      return void out.push(h && text ? { t: 'link', text, href: h } : { t: 'text', text });
    }
    // Safari/Chrome legen fett manchmal als <span style="font-weight"> an
    const w = c.style?.fontWeight;
    if (w === 'bold' || Number(w) >= 600) return void out.push({ t: 'b', kids: readSpans(c) });
    out.push(...readSpans(c));
  });
  return out;
}

const inlineOf = (n: Node) => ND.inlineMd(ND.mergeSpans(readSpans(n)));

/** Text eines Codeblocks (<br> = Zeilenumbruch, das letzte <br> nur für die Anzeige). */
function codeText(el: HTMLElement): string {
  let t = '';
  el.childNodes.forEach((c, i) => {
    if (c.nodeName === 'BR') t += i === el.childNodes.length - 1 ? '' : '\n';
    else t += c.textContent ?? '';
  });
  return clean(t);
}

function readBlock(el: HTMLElement): Block {
  const k = (el.dataset.k as ND.BlockKind) || 'p';
  if (k === 'code') return { k, text: codeText(el) };
  if (k === 'img') return { k, text: el.dataset.alt ?? '', ref: el.dataset.ref || undefined };
  const b: Block = { k, text: inlineOf(el) };
  if (k === 'h') b.level = (Number(el.dataset.level) || 1) as ND.HLevel;
  if (k === 'task') b.done = !!el.querySelector<HTMLInputElement>('input[type=checkbox]')?.checked;
  return b;
}

const isBlock = (n: Node): n is HTMLElement => n instanceof HTMLElement && n.hasAttribute('data-b');
const BLOCKISH = /^(DIV|P|H[1-6]|LI|BLOCKQUOTE|PRE|UL|OL)$/;

/** DOM → Blöcke; `dirty`, wenn der Browser fremde Strukturen angelegt hat. */
function read(root: HTMLElement): { blocks: Block[]; dirty: boolean } {
  const blocks: Block[] = [];
  let dirty = false;
  let stray: Node[] = [];
  const flush = () => {
    if (!stray.length) return;
    const frag = document.createDocumentFragment();
    stray.forEach((n) => frag.append(n.cloneNode(true)));
    blocks.push({ k: 'p', text: inlineOf(frag) });
    stray = [];
  };
  const walk = (n: Node) => {
    n.childNodes.forEach((c) => {
      if (isBlock(c)) {
        flush();
        return void blocks.push(readBlock(c));
      }
      if (c instanceof HTMLElement && c.dataset.g && (c.tagName === 'UL' || c.tagName === 'OL')) {
        flush();
        return walk(c);
      }
      dirty = true;
      if (c.nodeName === 'BR') return flush();
      if (c instanceof HTMLElement && BLOCKISH.test(c.tagName)) {
        flush();
        if (c.querySelector('[data-b]')) return walk(c);
        return void blocks.push({ k: 'p', text: inlineOf(c) });
      }
      stray.push(c);
    });
  };
  walk(root);
  flush();
  if (!blocks.length) {
    dirty = true;
    blocks.push({ k: 'p', text: '' });
  }
  return { blocks, dirty };
}

const blockEls = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLElement>('[data-b]'));

// ---------- Schreibmarke ----------

function caretOf(root: HTMLElement): Caret | null {
  const sel = document.getSelection();
  if (!sel?.rangeCount) return null;
  const r = sel.getRangeAt(0);
  if (!root.contains(r.startContainer)) return null;
  const start = r.startContainer instanceof Element ? r.startContainer : r.startContainer.parentElement;
  const el = start?.closest<HTMLElement>('[data-b]');
  const els = blockEls(root);
  if (!el || !root.contains(el)) return { i: Math.max(0, els.length - 1), off: 0 };
  const pre = document.createRange();
  pre.selectNodeContents(el);
  pre.setEnd(r.startContainer, r.startOffset);
  return { i: els.indexOf(el), off: clean(pre.toString()).length };
}

function place(root: HTMLElement, c: Caret) {
  const els = blockEls(root);
  const el = els[Math.min(Math.max(c.i, 0), els.length - 1)];
  if (!el) return;
  const r = document.createRange();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let left = c.off;
  let t: Node | null;
  let done = false;
  while ((t = walker.nextNode())) {
    const len = t.textContent?.length ?? 0;
    if (left <= len) {
      r.setStart(t, left);
      done = true;
      break;
    }
    left -= len;
  }
  if (!done) {
    const last = el.lastChild;
    r.setStart(el, el.childNodes.length - (last?.nodeName === 'BR' ? 1 : 0));
  }
  r.collapse(true);
  const sel = document.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(r);
}

/** V80: Schreibmarke an einer Bildschirmstelle (Ziehen und Loslassen) – auf einem Bild: dieses Bild */
function caretAtPoint(root: HTMLElement, x: number, y: number): Caret | null {
  const hit = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-b]');
  if (hit && hit.dataset.k === 'img' && root.contains(hit)) return { i: blockEls(root).indexOf(hit), off: 0 };
  const d = document as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null };
  const r = document.createRange();
  const pos = d.caretPositionFromPoint?.(x, y);
  if (pos) r.setStart(pos.offsetNode, pos.offset);
  else {
    const cr = document.caretRangeFromPoint?.(x, y);
    if (!cr) return null;
    r.setStart(cr.startContainer, cr.startOffset);
  }
  if (!root.contains(r.startContainer)) return null;
  const sel = document.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(r);
  return caretOf(root);
}

const plainLen = (b: Block) => (b.k === 'img' ? 0 : b.k === 'code' ? b.text.length : ND.plainOf(ND.parseInline(b.text)).length);
const asPara = (b: Block): Block[] => (b.k === 'img' ? [b] : b.k === 'code' ? b.text.split('\n').map((l) => ({ k: 'p', text: ND.escInline(l) })) : [{ k: 'p', text: b.text }]);

// ---------- Leiste ----------

type Tool = 'task' | 'li' | 'h' | 'bold';
/** V71 (F-215): Formatieren von außen, z. B. per Wischen am Knopf der Fußleiste – Ereignis am Editor-Element */
export const FMT_EVENT = 'esource:fmt';
/** V77 (F-215 Schritt 3): Sprachnotiz – Text an der Schreibmarke einfügen (detail.after = Stand danach) bzw. das
 *  Einfügen zurücknehmen, solange seither nichts geändert wurde (detail.ok = geklappt) */
export const INSERT_EVENT = 'esource:insert';
export const UNINSERT_EVENT = 'esource:uninsert';
export interface InsertDetail { text: string; after?: string }
export interface UninsertDetail { after: string; ok?: boolean }
/** V80 (F-215 B1/B2): Bilder einfügen – an der Schreibmarke (sonst am Ende); detail.done = Zahl der eingefügten Bilder */
export const IMG_EVENT = 'esource:img';
export interface ImgDetail { files: Blob[]; done?: Promise<number> }
const isPic = (f: Blob) => /^image\//.test(f.type);
export type FmtTool = 'task' | 'li' | 'bold' | 'h1' | 'h2' | 'h3' | 'task-new' | NoteTpl;
/** V71 (Wunsch Enrico): Vorlagen beim Anlegen per Wischen – alle beginnen mit einem Titel als H1 */
export type NoteTpl = 'tpl-note' | 'tpl-todo' | 'tpl-list' | 'tpl-remind';
// V75 (Wunsch Enrico): das Rad trägt die Beschriftung – „Überschrift H1“ … „Überschrift H6“
const H_LABELS = [1, 2, 3, 4, 5, 6].map((n) => `${NOTE_TEXT.toolHeading} H${n}`);
const TOOLS: { id: Tool; icon: IconName; label: string; keys?: string }[] = [
  { id: 'task', icon: 'task', label: NOTE_TEXT.toolTask, keys: 'Strg/⌘+Enter' },
  { id: 'li', icon: 'list', label: NOTE_TEXT.toolList },
  { id: 'h', icon: 'heading', label: NOTE_TEXT.toolHeading },
  { id: 'bold', icon: 'bold', label: NOTE_TEXT.toolBold, keys: 'Strg/⌘+B' },
];

interface Props {
  text: string;
  onChange: (md: string) => void;
  label: string;
  autoFocus?: boolean;
}

export function NoteEditor({ text, onChange, label, autoFocus }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const last = useRef<string | null>(null);
  const lastCaret = useRef<Caret | null>(null);
  const saved = useRef<Range | null>(null);
  const hist = useRef<{ past: Snap[]; future: Snap[]; at: number }>({ past: [], future: [], at: 0 });
  const change = useRef(onChange);
  change.current = onChange;
  // lv = Stufe der Überschrift an der Schreibmarke (0 = keine)
  const [cur, setCur] = useState<{ k: ND.BlockKind | null; bold: boolean; lv: number }>({ k: null, bold: false, lv: 0 });
  const [say, setSay] = useState('');
  const [empty, setEmpty] = useState(!text);
  const [tool, setTool] = useState(0);
  // V74 (Wunsch Enrico): Stufe der Überschrift per Drehrad im Knopf (H1–H6), Aussehen wie die Uhrzeit-Räder
  const [hLevel, setHLevel] = useState<ND.HLevel>(1);
  const uid = useId();
  // V80 (F-215 B1–B4): ausgewähltes Bild (Rahmen), Meldung am Ort, Bild groß
  const pickRef = useRef<HTMLElement | null>(null);
  const [notice, setNotice] = useState<{ text: string; top: number; after?: string } | null>(null);
  const noticeT = useRef(0);
  const [view, setView] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const picFns = useRef<{ pick: (f: HTMLElement | null) => void; drop: (f: HTMLElement) => void; add: (files: Blob[], at: Caret | null) => Promise<number> }>({ pick: () => {}, drop: () => {}, add: async () => 0 });

  /** Stand merken, bevor sich etwas ändert (Tippen: nur nach einer Pause). */
  const remember = useCallback((typing = false) => {
    const h = hist.current;
    const now = Date.now();
    if (typing && now - h.at < 900) {
      h.at = now;
      return;
    }
    h.at = typing ? now : 0;
    h.past.push({ md: last.current ?? '', caret: lastCaret.current });
    if (h.past.length > 100) h.past.shift();
    h.future = [];
  }, []);

  const emit = useCallback((blocks: Block[]) => {
    const md = ND.serializeDoc(blocks);
    setEmpty(md === '');
    if (md === last.current) return;
    last.current = md;
    change.current(md);
  }, []);

  /** Blöcke neu zeichnen, Schreibmarke setzen, speichern. */
  const apply = useCallback(
    (blocks: Block[], c: Caret | null) => {
      const el = root.current!;
      render(el, blocks);
      if (c) place(el, c);
      lastCaret.current = c;
      emit(blocks);
    },
    [emit],
  );

  // Von außen (Abgleich, Rückgängig der App, anderer Tab) geänderter Text → neu zeichnen
  useLayoutEffect(() => {
    const el = root.current;
    if (!el || text === last.current) return;
    const focused = document.activeElement === el;
    const c = focused ? caretOf(el) : null;
    render(el, ND.parseDoc(text));
    last.current = text;
    setEmpty(text === '');
    if (c) place(el, c);
  }, [text]);

  useEffect(() => {
    if (autoFocus && root.current) {
      root.current.focus();
      place(root.current, { i: 0, off: 0 });
    }
  }, [autoFocus]);

  // Zustand der Leiste und gemerkte Auswahl (für Knöpfe per Tastatur/Touch)
  useEffect(() => {
    const onSel = () => {
      const el = root.current;
      const sel = document.getSelection();
      if (!el || !sel?.rangeCount || !el.contains(sel.anchorNode)) return;
      saved.current = sel.getRangeAt(0).cloneRange();
      const c = caretOf(el);
      lastCaret.current = c;
      const b = c ? blockEls(el)[c.i] : undefined;
      // V80: Schreibmarke landet am Bild (Pfeil hoch/runter) – Bild auswählen
      const n = sel.anchorNode instanceof Element ? sel.anchorNode : sel.anchorNode?.parentElement;
      const fig = n?.closest<HTMLElement>('figure[data-k="img"]');
      if (fig && el.contains(fig)) picFns.current.pick(fig);
      setCur({ k: (b?.dataset.k as ND.BlockKind) ?? null, bold: document.queryCommandState?.('bold') ?? false, lv: b?.dataset.k === 'h' ? Number(b.dataset.level) || 1 : 0 });
    };
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
  }, []);

  const undo = useCallback(
    (back: boolean) => {
      const h = hist.current;
      const from = back ? h.past : h.future;
      const to = back ? h.future : h.past;
      const s = from.pop();
      if (!s) return;
      to.push({ md: last.current ?? '', caret: caretOf(root.current!) });
      h.at = 0;
      apply(ND.parseDoc(s.md), s.caret);
    },
    [apply],
  );

  // ----- Enter -----
  const enter = useCallback(() => {
    const el = root.current!;
    const c = caretOf(el);
    if (!c) return;
    const sel = document.getSelection()!;
    remember();
    if (!sel.isCollapsed) {
      sel.getRangeAt(0).deleteContents();
      return enter();
    }
    const { blocks } = read(el);
    const b = blocks[c.i];
    const bel = blockEls(el)[c.i];
    if (!b || !bel) return;
    if (b.k === 'img') {
      // V80: Enter am Bild – neuer Absatz darunter
      blocks.splice(c.i + 1, 0, { k: 'p', text: '' });
      return apply(blocks, { i: c.i + 1, off: 0 });
    }
    const listy = b.k === 'li' || b.k === 'ol' || b.k === 'task' || b.k === 'quote';
    if (b.k === 'code') {
      // Enter am Ende nach leerer Zeile verlässt den Codeblock
      if (c.off === b.text.length && b.text.endsWith('\n')) {
        blocks.splice(c.i, 1, { k: 'code', text: b.text.slice(0, -1) }, { k: 'p', text: '' });
        return apply(blocks, { i: c.i + 1, off: 0 });
      }
      blocks[c.i] = { k: 'code', text: `${b.text.slice(0, c.off)}\n${b.text.slice(c.off)}` };
      return apply(blocks, { i: c.i, off: c.off + 1 });
    }
    // V71 (Wunsch Enrico): Enter am Ende einer Überschrift, unter der eine noch leere Aufgabe bzw. ein leerer
    // Listenpunkt steht (Vorlage To-do-Liste/Liste), springt dorthin statt einen Absatz dazwischenzuschieben
    const below = blocks[c.i + 1];
    if (b.k === 'h' && c.off === plainLen(b) && below && (below.k === 'li' || below.k === 'task' || below.k === 'ol') && plainLen(below) === 0) {
      return apply(blocks, { i: c.i + 1, off: 0 });
    }
    if (listy && plainLen(b) === 0) {
      // Enter in leerer Aufgabe/Liste beendet sie
      blocks[c.i] = { k: 'p', text: '' };
      setSay(NOTE_TEXT.listEnd);
      return apply(blocks, { i: c.i, off: 0 });
    }
    const next: Block = listy ? { k: b.k, text: '' } : { k: 'p', text: '' };
    if (b.k === 'task') next.done = false;
    if (c.off === 0 && plainLen(b) > 0) {
      blocks.splice(c.i, 0, { ...next });
      return apply(blocks, { i: c.i + 1, off: 0 });
    }
    // rechts von der Schreibmarke abschneiden (Formatierung bleibt erhalten)
    const r = document.createRange();
    r.setStart(sel.getRangeAt(0).startContainer, sel.getRangeAt(0).startOffset);
    r.setEnd(bel, bel.childNodes.length);
    const right = r.extractContents();
    right.querySelectorAll('input').forEach((x) => x.remove());
    blocks[c.i] = { ...b, text: inlineOf(bel) };
    next.text = inlineOf(right);
    blocks.splice(c.i + 1, 0, next);
    apply(blocks, { i: c.i + 1, off: 0 });
  }, [apply, remember]);

  // ----- Rückschritt am Zeilenanfang / Entfernen am Zeilenende -----
  const joinBack = useCallback((): boolean => {
    const el = root.current!;
    // V80: ausgewähltes Bild – Rücktaste löscht es
    if (pickRef.current) {
      picFns.current.drop(pickRef.current);
      return true;
    }
    const sel = document.getSelection();
    const c = caretOf(el);
    if (!c || !sel?.isCollapsed || c.off !== 0) return false;
    const { blocks } = read(el);
    const b = blocks[c.i];
    if (!b) return false;
    // V80: Rücktaste am Anfang eines Absatzes nach einem Bild – erst das Bild auswählen
    if (b.k === 'p' && blocks[c.i - 1]?.k === 'img') {
      picFns.current.pick(blockEls(el)[c.i - 1]);
      return true;
    }
    if (b.k === 'img') return true;
    remember();
    if (b.k !== 'p') {
      // aus Aufgabe, Liste, Überschrift … wird wieder Text
      blocks.splice(c.i, 1, ...asPara(b));
      setSay(NOTE_TEXT.toText);
      apply(blocks, { i: c.i, off: 0 });
      return true;
    }
    if (c.i === 0) return true;
    const prev = blocks[c.i - 1];
    const off = plainLen(prev);
    blocks.splice(c.i - 1, 2, prev.k === 'code' ? { k: 'code', text: prev.text + ND.plainOf(ND.parseInline(b.text)) } : { ...prev, text: prev.text + b.text });
    apply(blocks, { i: c.i - 1, off });
    return true;
  }, [apply, remember]);

  const joinForward = useCallback((): boolean => {
    const el = root.current!;
    if (pickRef.current) {
      picFns.current.drop(pickRef.current);
      return true;
    }
    const sel = document.getSelection();
    const c = caretOf(el);
    if (!c || !sel?.isCollapsed) return false;
    const { blocks } = read(el);
    const b = blocks[c.i];
    const nx = blocks[c.i + 1];
    if (!b || c.off !== plainLen(b)) return false;
    if (!nx) return true;
    // V80: Entf am Ende vor einem Bild – erst das Bild auswählen
    if (nx.k === 'img' || b.k === 'img') {
      if (nx.k === 'img') picFns.current.pick(blockEls(el)[c.i + 1]);
      return true;
    }
    remember();
    const tail = nx.k === 'code' ? ND.escInline(nx.text.replace(/\n/g, ' ')) : nx.text;
    blocks.splice(c.i, 2, b.k === 'code' ? { k: 'code', text: b.text + ND.plainOf(ND.parseInline(tail)) } : { ...b, text: b.text + tail });
    apply(blocks, c);
    return true;
  }, [apply, remember]);

  // ----- Einfügen: nur reiner Text -----
  const paste = useCallback(
    (txt: string) => {
      const el = root.current!;
      const sel = document.getSelection();
      if (!sel?.rangeCount) return;
      remember();
      sel.getRangeAt(0).deleteContents();
      const lines = txt.replace(/\r\n?/g, '\n').split('\n');
      if (lines.length === 1) {
        document.execCommand('insertText', false, lines[0]);
        return;
      }
      const c = caretOf(el)!;
      const { blocks } = read(el);
      const b = blocks[c.i];
      const bel = blockEls(el)[c.i];
      const r = document.createRange();
      r.setStart(sel.getRangeAt(0).startContainer, sel.getRangeAt(0).startOffset);
      r.setEnd(bel, bel.childNodes.length);
      const right = inlineOf(r.extractContents());
      const add: Block[] = lines.map((l, i) => (i === 0 ? { ...b, text: inlineOf(bel) + ND.escInline(l) } : { k: 'p', text: ND.escInline(l) }));
      const end = add[add.length - 1];
      const off = plainLen(end);
      end.text += right;
      blocks.splice(c.i, 1, ...add);
      apply(blocks, { i: c.i + add.length - 1, off });
    },
    [apply, remember],
  );

  // Native beforeinput (React kennt es nur als Ersatz): Enter, Löschen an Grenzen, Rückgängig – auch auf Handy-Tastaturen
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const before = (e: InputEvent) => {
      if (e.isComposing) return;
      switch (e.inputType) {
        case 'insertParagraph':
        case 'insertLineBreak':
          e.preventDefault();
          return enter();
        case 'deleteContentBackward':
          if (joinBack()) e.preventDefault();
          return;
        case 'deleteContentForward':
          if (joinForward()) e.preventDefault();
          return;
        case 'historyUndo':
          e.preventDefault();
          return undo(true);
        case 'historyRedo':
          e.preventDefault();
          return undo(false);
        case 'insertFromDrop':
        case 'formatUnderline':
        case 'formatStrikeThrough':
        case 'formatFontColor':
        case 'formatBackColor':
          return e.preventDefault();
        case 'insertText':
        case 'insertReplacementText':
        case 'deleteWordBackward':
        case 'deleteByCut':
          return remember(true);
      }
    };
    const onPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      // V80 (B2): Bild aus der Zwischenablage (Strg/⌘+V) – Bildschirmfoto, kopiertes Bild
      const files = Array.from(e.clipboardData?.files ?? []).filter(isPic);
      if (files.length) return void picFns.current.add(files, caretOf(el));
      paste(e.clipboardData?.getData('text/plain') ?? '');
    };
    const hasFiles = (e: DragEvent) => !!e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files');
    const onOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'copy';
      el.classList.add('is-drop');
    };
    const onLeave = () => el.classList.remove('is-drop');
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      el.classList.remove('is-drop');
      // V80 (B2): Bild ins Pad ziehen – eingefügt dort, wo es losgelassen wurde
      const files = Array.from(e.dataTransfer?.files ?? []).filter(isPic);
      if (!files.length) return;
      void picFns.current.add(files, caretAtPoint(el, e.clientX, e.clientY));
    };
    el.addEventListener('beforeinput', before);
    el.addEventListener('paste', onPaste);
    el.addEventListener('dragover', onOver);
    el.addEventListener('dragleave', onLeave);
    el.addEventListener('drop', onDrop);
    return () => {
      el.removeEventListener('beforeinput', before);
      el.removeEventListener('paste', onPaste);
      el.removeEventListener('dragover', onOver);
      el.removeEventListener('dragleave', onLeave);
      el.removeEventListener('drop', onDrop);
    };
  }, [enter, joinBack, joinForward, undo, paste, remember]);

  /** Nach jeder Eingabe: Tipp-Kürzel, Bereinigen, Speichern. */
  const onInput = (e: FormEvent<HTMLDivElement>) => {
    const ne = e.nativeEvent as InputEvent;
    if (ne.isComposing) return;
    const el = root.current!;
    const c = caretOf(el);
    const { blocks, dirty } = read(el);
    if (c && ne.data === ' ' && blocks[c.i]?.k === 'p') {
      const bel = blockEls(el)[c.i];
      const plain = clean(bel.textContent ?? '');
      const sc = ND.shortcut(plain);
      const cut = sc ? plain.length - sc.text.length : 0;
      if (sc && c.off === cut) {
        const r = document.createRange();
        r.selectNodeContents(bel);
        const walker = document.createTreeWalker(bel, NodeFilter.SHOW_TEXT);
        let left = cut;
        let t: Node | null;
        while ((t = walker.nextNode()) && left > (t.textContent?.length ?? 0)) left -= t.textContent!.length;
        if (t) r.setEnd(t, left);
        r.deleteContents();
        blocks[c.i] = { ...sc, text: inlineOf(bel) };
        setSay(NOTE_TEXT.became(NOTE_TEXT.kinds[sc.k]));
        return apply(blocks, { i: c.i, off: 0 });
      }
    }
    if (dirty) return apply(blocks, c);
    lastCaret.current = c;
    emit(blocks);
  };

  /** Block(e) der Auswahl umstellen; sind alle schon so, werden sie wieder Text. */
  const setKind = (k: 'task' | 'li' | 'h', level: ND.HLevel = 1) => {
    const el = root.current!;
    restore();
    const sel = document.getSelection();
    const c = caretOf(el) ?? { i: 0, off: 0 };
    let to = c.i;
    if (sel?.rangeCount && !sel.isCollapsed) {
      const r = sel.getRangeAt(0);
      const endEl = (r.endContainer instanceof Element ? r.endContainer : r.endContainer.parentElement)?.closest<HTMLElement>('[data-b]');
      const j = endEl ? blockEls(el).indexOf(endEl) : -1;
      if (j >= c.i) to = j;
    }
    remember();
    const { blocks } = read(el);
    // V71: leere Note (z. B. gerade per Wischen angelegt) – erste Zeile anlegen, damit das Format greift
    if (!blocks.length) blocks.push({ k: 'p', text: '' });
    const pick = blocks.slice(c.i, to + 1);
    // V71: Überschrift zählt nur als „schon so“, wenn auch die Stufe stimmt (sonst Stufe wechseln)
    // V80: Bilder bleiben Bilder (zählen weder für „schon so“ noch werden sie umgestellt)
    const txt = pick.filter((b) => b.k !== 'img');
    if (!txt.length) return;
    const all = txt.every((b) => b.k === k && (k !== 'h' || (b.level ?? 1) === level));
    const out = pick.flatMap((b): Block[] => {
      if (b.k === 'img') return [b];
      if (all) return [{ k: 'p', text: b.text }];
      const base = b.k === 'code' ? asPara(b) : [b];
      return base.map((x) => ({ k, text: x.text, ...(k === 'task' ? { done: x.k === 'task' ? x.done : false } : {}), ...(k === 'h' ? { level } : {}) }));
    });
    blocks.splice(c.i, pick.length, ...out);
    setSay(all ? NOTE_TEXT.toText : NOTE_TEXT.became(NOTE_TEXT.kinds[k]));
    apply(blocks, c);
  };

  /** V78 (F-215 Schritt 4, „Neue Aufgabe“ im Halbkreis): legt immer eine neue, leere Aufgabe an – nie zurück zu Text.
   *  Leere Zeile an der Schreibmarke wird zur Aufgabe, sonst kommt eine leere Aufgabe direkt darunter. */
  const newTask = () => {
    const el = root.current!;
    restore();
    const c = caretOf(el) ?? { i: Math.max(0, blockEls(el).length - 1), off: 0 };
    remember();
    const { blocks } = read(el);
    if (!blocks.length) blocks.push({ k: 'p', text: '' });
    const b = blocks[c.i];
    if (b && plainLen(b) === 0 && b.k !== 'h' && b.k !== 'img') {
      blocks[c.i] = { k: 'task', done: false, text: '' };
      setSay(NOTE_TEXT.became(NOTE_TEXT.kinds.task));
      return apply(blocks, { i: c.i, off: 0 });
    }
    blocks.splice(c.i + 1, 0, { k: 'task', done: false, text: '' });
    setSay(NOTE_TEXT.became(NOTE_TEXT.kinds.task));
    apply(blocks, { i: c.i + 1, off: 0 });
  };

  /** Aufgabe an der Schreibmarke ab-/anhaken. */
  const toggleTask = (i: number) => {
    const el = root.current!;
    const box = blockEls(el)[i]?.querySelector<HTMLInputElement>('input[type=checkbox]');
    if (!box) return;
    remember();
    box.checked = !box.checked;
    box.parentElement!.classList.toggle('is-done', box.checked);
    setSay(box.checked ? NOTE_TEXT.taskChecked : NOTE_TEXT.taskUnchecked);
    emit(read(el).blocks);
  };

  const restore = () => {
    const el = root.current!;
    if (document.activeElement !== el) el.focus({ preventScroll: true });
    const sel = document.getSelection();
    if (saved.current && el.contains(saved.current.startContainer)) {
      sel?.removeAllRanges();
      sel?.addRange(saved.current);
    }
  };

  /** Stufe der Zeile an der Schreibmarke: 0 = keine Überschrift, sonst 1–3 */
  const levelHere = () => {
    const el = root.current;
    if (!el) return 0;
    // Schreibmarke im Text oder – wenn der Fokus am Rad liegt – die zuletzt gemerkte Stelle
    const r = saved.current && el.contains(saved.current.startContainer) ? saved.current : null;
    const n = r ? r.startContainer : document.getSelection()?.anchorNode;
    const b = n && el.contains(n) ? (n instanceof Element ? n : n.parentElement)?.closest<HTMLElement>('[data-b]') : null;
    return b && /^H[3-6]$/.test(b.tagName) ? Number(b.dataset.level) || 1 : 0;
  };
  /** V75 (Wunsch Enrico): Das Rad ist die Einstellung – gewählte Stufe bleibt, Tippen auf den Knopf schaltet die
   *  Überschrift an bzw. aus. Steht die Schreibmarke schon in einer Überschrift, stellt Drehen sie gleich mit um. */
  const turnLevel = (v: number) => {
    const lv = (v + 1) as ND.HLevel;
    setHLevel(lv);
    const now = levelHere();
    if (now && now !== lv) {
      setKind('h', lv);
      remember(); // neue Stelle merken – die Zeile wurde neu aufgebaut, das nächste Drehen braucht sie
    }
  };
  /** Rad zeigt die Stufe der Überschrift an der Schreibmarke, sonst die eingestellte. */
  const shownLevel = (cur.lv || hLevel) as ND.HLevel;

  const run = (t: Tool) => {
    // V75: an/aus – in einer Überschrift wird die Zeile wieder Text, sonst Überschrift in der eingestellten Stufe
    if (t === 'h') return setKind('h', (levelHere() || hLevel) as ND.HLevel);
    if (t === 'bold') {
      restore();
      remember();
      document.execCommand('bold');
      return;
    }
    setKind(t);
  };

  // V71: Formatieren von außen (Wischen am Knopf); gleiche Geste noch einmal = wieder Text (wie die Leiste)
  const fmtRef = useRef<(t: FmtTool) => void>(() => {});
  fmtRef.current = (t) => {
    if (t.startsWith('tpl-')) {
      // nur in einer noch leeren Note: Titel H1, darunter je nach Vorlage eine Aufgabe bzw. ein Listenpunkt
      const el = root.current!;
      if (read(el).blocks.some((x) => x.text.trim() || x.k === 'img')) return;
      remember();
      const blocks: Block[] = [{ k: 'h', level: 1, text: '' }];
      if (t === 'tpl-todo') blocks.push({ k: 'task', done: false, text: '' });
      if (t === 'tpl-list') blocks.push({ k: 'li', text: '' });
      // V72: Erinnerung – Titel, darunter Text; Zeit und Ort über die Chips „Wann?“/„Wo?“ über der Note
      if (t === 'tpl-remind') blocks.push({ k: 'p', text: '' });
      el.focus({ preventScroll: true });
      apply(blocks, { i: 0, off: 0 });
      return;
    }
    if (t === 'bold') {
      // ohne Markierung die ganze Zeile fett (bzw. wieder normal) – sonst wirkte es nur auf künftiges Tippen
      const el = root.current!;
      restore();
      const sel = document.getSelection();
      if (sel && (!sel.rangeCount || sel.isCollapsed)) {
        const b = blockEls(el)[caretOf(el)?.i ?? 0];
        if (b?.textContent && b.dataset.k !== 'img') {
          const r = document.createRange();
          r.selectNodeContents(b);
          sel.removeAllRanges();
          sel.addRange(r);
        }
      }
      remember();
      document.execCommand('bold');
      document.getSelection()?.collapseToEnd();
      return;
    }
    if (t === 'task' || t === 'li') return run(t);
    if (t === 'task-new') return newTask();
    setKind('h', Number(t.slice(1)) as ND.HLevel);
  };
  // V79 (Fehler V78 „Kästchen/Aufzählungspunkt fehlen beim Anlegen per Wischen“): Anmeldung im Layout-Effekt –
  // ein normaler useEffect lief je nach Browser erst nach dem requestAnimationFrame, mit dem das Pad die Vorlage
  // schickt; die Vorlage ging dann verloren
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const on = (e: Event) => fmtRef.current((e as CustomEvent<FmtTool>).detail);
    el.addEventListener(FMT_EVENT, on);
    return () => el.removeEventListener(FMT_EVENT, on);
  }, []);

  // V77: Sprachnotiz übernehmen – an der Schreibmarke (sonst am Ende), Leerzeichen und Satzanfang wie beim Sprechen
  const insRef = useRef<(d: InsertDetail) => void>(() => {});
  insRef.current = (d) => {
    const el = root.current!;
    const had = saved.current && el.contains(saved.current.startContainer);
    restore();
    const sel = document.getSelection();
    if (!sel) return;
    if (!had || !sel.rangeCount || !el.contains(sel.anchorNode)) {
      const bs = blockEls(el);
      const b = bs[bs.length - 1];
      const r = document.createRange();
      if (b) {
        r.selectNodeContents(b);
        r.collapse(false);
      } else r.setStart(el, el.childNodes.length);
      sel.removeAllRanges();
      sel.addRange(r);
    }
    const c = caretOf(el);
    const bel = c ? blockEls(el)[c.i] : null;
    let prev = '';
    if (bel && sel.rangeCount) {
      const r = document.createRange();
      r.selectNodeContents(bel);
      r.setEnd(sel.getRangeAt(0).startContainer, sel.getRangeAt(0).startOffset);
      prev = clean(r.toString());
    }
    const joined = joinSpeech(prev, d.text);
    let piece = joined.slice(prev.replace(/\s+$/, '').length);
    if (/\s$/.test(prev)) piece = piece.replace(/^\s+/, '');
    if (!piece) return;
    remember();
    document.execCommand('insertText', false, piece);
    d.after = last.current ?? '';
  };
  // V77: „Als neue Notiz lösen“ – nur, wenn seither nichts geändert wurde
  const unRef = useRef<(d: UninsertDetail) => void>(() => {});
  unRef.current = (d) => {
    if ((last.current ?? '') !== d.after) return;
    undo(true);
    d.ok = true;
  };
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const ins = (e: Event) => insRef.current((e as CustomEvent<InsertDetail>).detail);
    const un = (e: Event) => unRef.current((e as CustomEvent<UninsertDetail>).detail);
    el.addEventListener(INSERT_EVENT, ins);
    el.addEventListener(UNINSERT_EVENT, un);
    return () => {
      el.removeEventListener(INSERT_EVENT, ins);
      el.removeEventListener(UNINSERT_EVENT, un);
    };
  }, []);

  // ---------- V80 (F-215 B1–B4): Bilder im Text ----------

  /** Meldung am Ort (2 s, F-214/V79) – oben an der Stelle `top` im Textfeld */
  const tell = (text: string, top: number, after?: string) => {
    window.clearTimeout(noticeT.current);
    setNotice({ text, top, after });
    noticeT.current = window.setTimeout(() => setNotice(null), NOTICE_MS);
  };
  useEffect(() => () => window.clearTimeout(noticeT.current), []);
  const topOf = (n: Element | null | undefined) => {
    const w = wrap.current;
    if (!w || !n) return 0;
    return Math.max(0, n.getBoundingClientRect().top - w.getBoundingClientRect().top);
  };

  /** Bild auswählen (Rahmen) bzw. Auswahl aufheben; die Schreibmarke bleibt im Textfeld (Tastatur geht weiter) */
  const pickPic = (f: HTMLElement | null) => {
    if (pickRef.current === f) return;
    pickRef.current?.classList.remove('is-picked');
    pickRef.current = f;
    if (!f) return;
    f.classList.add('is-picked');
    f.scrollIntoView({ block: 'nearest' });
    setSay(`${f.dataset.alt || NOTE_TEXT.imgAlt}: ${NOTE_TEXT.imgPicked}`);
  };

  /** Bild löschen – „Bild gelöscht · Rückgängig“ am Ort. Das Bild selbst bleibt im Speicher (Rückgängig, Abgleich),
   *  ohne Verweis räumt `sweepPics` es später weg. */
  const dropPic = (f: HTMLElement) => {
    const el = root.current!;
    const i = blockEls(el).indexOf(f);
    if (i < 0) return;
    const top = topOf(f);
    pickRef.current = null;
    remember();
    const { blocks } = read(el);
    blocks.splice(i, 1);
    if (!blocks.length) blocks.push({ k: 'p', text: '' });
    const j = Math.min(i, blocks.length - 1);
    // Schreibmarke an den Anfang des Blocks danach bzw. ans Ende des letzten
    el.focus({ preventScroll: true });
    apply(blocks, i < blocks.length ? { i: j, off: 0 } : { i: j, off: plainLen(blocks[j]) });
    setSay(NOTE_TEXT.imgRemoved);
    tell(NOTE_TEXT.imgRemoved, top, last.current ?? '');
  };

  /** Bilder einfügen: Bild-Block nach dem Block der Schreibmarke (leerer Absatz wird ersetzt, am Zeilenanfang davor),
   *  danach immer ein Absatz mit der Schreibmarke – Rückgängig wie jede Änderung */
  const insertPics = (refs: string[], at: Caret | null) => {
    const el = root.current!;
    remember();
    const { blocks } = read(el);
    if (!blocks.length) blocks.push({ k: 'p', text: '' });
    const end = { i: blocks.length - 1, off: plainLen(blocks[blocks.length - 1]) };
    const c = at && at.i >= 0 && at.i < blocks.length ? at : end;
    const b = blocks[c.i];
    const imgs: Block[] = refs.map((ref) => ({ k: 'img', text: '', ref }));
    let caret: Caret;
    if (b.k === 'p' && plainLen(b) === 0) {
      blocks.splice(c.i, 1, ...imgs);
      caret = { i: c.i + imgs.length, off: 0 };
    } else if (b.k !== 'img' && c.off === 0 && plainLen(b) > 0) {
      blocks.splice(c.i, 0, ...imgs);
      return finishInsert(blocks, { i: c.i + imgs.length, off: 0 }, refs.length);
    } else {
      blocks.splice(c.i + 1, 0, ...imgs);
      caret = { i: c.i + 1 + imgs.length, off: 0 };
    }
    const nx = blocks[caret.i];
    if (!nx || nx.k !== 'p' || plainLen(nx) > 0) blocks.splice(caret.i, 0, { k: 'p', text: '' });
    finishInsert(blocks, caret, refs.length);
  };
  const finishInsert = (blocks: Block[], caret: Caret, n: number) => {
    const el = root.current!;
    el.focus({ preventScroll: true });
    apply(blocks, caret);
    setSay(NOTE_TEXT.imgAdded(n));
    blockEls(el)[caret.i]?.scrollIntoView({ block: 'nearest' });
  };

  /** Dateien (Kamera, Auswahl, Zwischenablage, Ziehen) verkleinern (B3), speichern und einfügen */
  const addFiles = async (files: Blob[], at: Caret | null): Promise<number> => {
    const refs: string[] = [];
    for (const f of files.filter(isPic)) {
      const sm = await shrinkImage(f);
      if (!sm) continue;
      const id = newId();
      if (await putPic({ id, blob: sm.blob, mime: sm.mime, w: sm.w, h: sm.h, at: Date.now() })) refs.push(id);
    }
    const el = root.current;
    if (!el) return refs.length;
    if (!refs.length) {
      if (files.length) {
        setSay(NOTE_TEXT.imgFailed);
        tell(NOTE_TEXT.imgFailed, at ? topOf(blockEls(el)[at.i]) : 0);
      }
      return 0;
    }
    insertPics(refs, at);
    return refs.length;
  };
  picFns.current = { pick: pickPic, drop: dropPic, add: addFiles };

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const on = (e: Event) => {
      const d = (e as CustomEvent<ImgDetail>).detail;
      const had = document.activeElement === el || (saved.current && el.contains(saved.current.startContainer));
      d.done = picFns.current.add(d.files, had ? lastCaret.current : null);
    };
    el.addEventListener(IMG_EVENT, on);
    return () => el.removeEventListener(IMG_EVENT, on);
  }, []);

  /** Beschreibung (alt) eines Bildes ändern – aus der großen Ansicht */
  const setAlt = (ref: string, alt: string) => {
    const el = root.current;
    const f = el?.querySelector<HTMLElement>(`figure[data-ref="${CSS.escape(ref)}"]`);
    if (!el || !f) return;
    remember(true);
    f.dataset.alt = alt;
    const img = f.querySelector('img');
    if (img) img.alt = alt || NOTE_TEXT.imgAlt;
    emit(read(el).blocks);
  };
  const figOf = (ref: string | null) => (ref ? root.current?.querySelector<HTMLElement>(`figure[data-ref="${CSS.escape(ref)}"]`) ?? null : null);
  const openView = (f: HTMLElement) => {
    if (f.classList.contains('is-away') || !f.dataset.ref) return;
    pickPic(f);
    setView(f.dataset.ref);
  };
  const closeView = () => {
    const f = figOf(view);
    setView(null);
    // Fokus zurück: ins Textfeld, das Bild bleibt ausgewählt
    root.current?.focus({ preventScroll: true });
    if (f) {
      pickRef.current = null;
      pickPic(f);
    }
  };

  /** Pfeiltasten über ein ausgewähltes Bild hinweg: davor ans Ende, danach an den Anfang */
  const leavePic = (f: HTMLElement, back: boolean) => {
    const el = root.current!;
    const els = blockEls(el);
    const i = els.indexOf(f);
    const j = back ? i - 1 : i + 1;
    const t = els[j];
    if (!t) return false;
    pickPic(null);
    if (t.dataset.k === 'img') {
      pickPic(t);
      return true;
    }
    const b = readBlock(t);
    place(el, { i: j, off: back ? plainLen(b) : 0 });
    return true;
  };

  const onKeyDown = (e: RKeyboardEvent<HTMLDivElement>) => {
    if (e.nativeEvent.isComposing) return;
    const pk = pickRef.current;
    if (pk) {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        return dropPic(pk);
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        return openView(pk);
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        pickPic(null);
        return setSay('');
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (!leavePic(pk, e.key === 'ArrowLeft' || e.key === 'ArrowUp')) {
          // kein Text dahinter: Absatz anlegen (vor dem ersten bzw. nach dem letzten Bild)
          const el = root.current!;
          const i = blockEls(el).indexOf(pk);
          const back = e.key === 'ArrowLeft' || e.key === 'ArrowUp';
          pickPic(null);
          remember();
          const { blocks } = read(el);
          blocks.splice(back ? i : i + 1, 0, { k: 'p', text: '' });
          apply(blocks, { i: back ? i : i + 1, off: 0 });
        }
        return;
      }
      if (e.key === 'Tab' || e.key === 'Shift' || e.key === 'Meta' || e.key === 'Control' || e.key === 'Alt') return;
      pickPic(null);
    } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey) {
      // V80: Pfeil links am Zeilenanfang nach einem Bild bzw. rechts am Zeilenende davor – Bild auswählen
      const el = root.current!;
      const sel = document.getSelection();
      const c = caretOf(el);
      if (c && sel?.isCollapsed) {
        const els = blockEls(el);
        const b = els[c.i];
        const left = e.key === 'ArrowLeft';
        const nb = els[left ? c.i - 1 : c.i + 1];
        if (b && nb?.dataset.k === 'img' && (left ? c.off === 0 : c.off === plainLen(readBlock(b)))) {
          e.preventDefault();
          return pickPic(nb);
        }
      }
    }
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key === 'Enter') {
      e.preventDefault();
      const c = caretOf(root.current!);
      if (!c) return;
      if (blockEls(root.current!)[c.i]?.dataset.k === 'task') toggleTask(c.i);
      else setKind('task');
      return;
    }
    if (mod && !e.altKey && (e.key === 'z' || e.key === 'Z' || e.key === 'y')) {
      e.preventDefault();
      return undo(e.key === 'z' && !e.shiftKey);
    }
    if (mod && (e.key === 'u' || e.key === 'U')) e.preventDefault();
  };

  const onClick = (e: RMouseEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement;
    // V80 (B4): Bild antippen = groß
    const fig = t.closest<HTMLElement>('figure[data-k="img"]');
    if (fig && root.current?.contains(fig)) {
      e.preventDefault();
      return openView(fig);
    }
    pickPic(null);
    if (t instanceof HTMLInputElement && t.type === 'checkbox') {
      // der Browser hat schon umgeschaltet – nur übernehmen
      remember();
      t.parentElement!.classList.toggle('is-done', t.checked);
      setSay(t.checked ? NOTE_TEXT.taskChecked : NOTE_TEXT.taskUnchecked);
      return emit(read(root.current!).blocks);
    }
    const a = t.closest('a');
    if (a && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      const h = ND.safeHref(a.getAttribute('href') ?? '');
      if (h) window.open(h, '_blank', 'noopener,noreferrer');
    }
  };

  // Leiste: Pfeiltasten wandern (ein Tab-Stopp), Knöpfe nehmen dem Text den Fokus nicht
  const onToolKey = (e: RKeyboardEvent<HTMLDivElement>) => {
    const n = TOOLS.length;
    const go = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!go && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const i = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : (tool + go + n) % n;
    setTool(i);
    (e.currentTarget.querySelectorAll('button')[i] as HTMLButtonElement | undefined)?.focus();
  };

  const pressed = (t: Tool) => (t === 'bold' ? cur.bold : cur.k === t || (t === 'li' && cur.k === 'ol'));

  return (
    <div className="nedit-wrap" ref={wrap}>
      <div className="nedit__tools" role="toolbar" aria-label={NOTE_TEXT.toolbar} onKeyDown={onToolKey}>
        {TOOLS.map((t, i) => (
          <button
            key={t.id}
            type="button"
            tabIndex={i === tool ? 0 : -1}
            aria-pressed={pressed(t.id)}
            title={t.keys ? `${t.label} (${t.keys})` : t.label}
            aria-keyshortcuts={t.id === 'bold' ? 'Control+B Meta+B' : t.id === 'task' ? 'Control+Enter Meta+Enter' : undefined}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => run(t.id)}
            onKeyDown={
              t.id === 'h'
                ? (e) => {
                    // V74: Pfeil hoch/runter am Knopf dreht das Rad (links/rechts wandern weiter durch die Leiste)
                    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
                    e.preventDefault();
                    // Stufe direkt aus der Zeile lesen (der Zustand der Leiste hinkt nach dem Umbau der Zeile kurz hinterher)
                    turnLevel(Math.max(0, Math.min(5, (levelHere() || hLevel) - 1 + (e.key === 'ArrowDown' ? 1 : -1))));
                    e.currentTarget.focus();
                  }
                : undefined
            }
            aria-label={t.id === 'h' ? `${H_LABELS[shownLevel - 1]} – ${NOTE_TEXT.hHint}` : undefined}
            className={t.id === 'h' ? 'nedit__hbtn' : undefined}
          >
            {/* V75 (Wunsch Enrico): der Knopf „Überschrift“ IST das Rad – ohne Symbol, „Überschrift H1–H6“ auf dem Rad;
                wischen/scrollen stellt die Stufe ein, Tippen schaltet an/aus */}
            {t.id === 'h' ? (
              <span className="nedit__hwheel" onPointerDown={(e) => e.preventDefault()}>
                <Wheel label={NOTE_TEXT.hLevel} value={shownLevel - 1} count={6} big={1} wrap={false} labels={H_LABELS} row={20} height={28} passive noPick onChange={turnLevel} onEnter={() => run('h')} />
              </span>
            ) : (
              <>
                <Icon name={t.icon} size={15} /> <span>{t.label}</span>
              </>
            )}
          </button>
        ))}
      </div>
      <div
        ref={root}
        className={`nedit${empty ? ' is-empty' : ''}`}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={label}
        aria-describedby={`${uid}-hint`}
        data-ph={NOTE_TEXT.placeholder}
        spellCheck
        onInput={onInput}
        onKeyDown={onKeyDown}
        onClick={onClick}
      />
      {notice && (
        <div className="nedit__notice" role="status" style={{ top: notice.top }}>
          {notice.text}
          {notice.after !== undefined && (
            <button
              type="button"
              className="audio__undo"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                window.clearTimeout(noticeT.current);
                setNotice(null);
                if ((last.current ?? '') === notice.after) {
                  undo(true);
                  setSay(NOTE_TEXT.imgBack);
                }
              }}
            >
              {NOTE_TEXT.imgUndo}
            </button>
          )}
        </div>
      )}
      {view && root.current && (
        <PicView
          picRef={view}
          alt={figOf(view)?.dataset.alt ?? ''}
          host={root.current.closest<HTMLElement>('.pad')}
          onAlt={(a) => setAlt(view, a)}
          onClose={closeView}
          onDelete={() => {
            const f = figOf(view);
            setView(null);
            root.current?.focus({ preventScroll: true });
            if (f) dropPic(f);
          }}
        />
      )}
      {/* V74 (Wunsch Enrico): Hinweis nicht mehr sichtbar unter dem Textfeld – bleibt für Bildschirmleser */}
      <p className="sr-only" id={`${uid}-hint`}>
        {NOTE_TEXT.editHint}
      </p>
      <span className="sr-only" role="status" aria-live="polite">
        {say}
      </span>
    </div>
  );
}
