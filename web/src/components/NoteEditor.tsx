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
import { NOTE_TEXT } from '../workspace/terms';
import { Icon } from './Icon';
import type { IconName } from '../workspace/icons';

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

const TAG: Record<ND.BlockKind, string> = { p: 'p', h: 'h3', li: 'li', ol: 'li', task: 'li', quote: 'blockquote', code: 'pre' };

function blockEl(b: Block): HTMLElement {
  const el = document.createElement(b.k === 'h' ? `h${2 + (b.level ?? 1)}` : TAG[b.k]);
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
  const b: Block = { k, text: inlineOf(el) };
  if (k === 'h') b.level = (Number(el.dataset.level) || 1) as 1 | 2 | 3;
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

const plainLen = (b: Block) => (b.k === 'code' ? b.text.length : ND.plainOf(ND.parseInline(b.text)).length);
const asPara = (b: Block): Block[] => (b.k === 'code' ? b.text.split('\n').map((l) => ({ k: 'p', text: ND.escInline(l) })) : [{ k: 'p', text: b.text }]);

// ---------- Leiste ----------

type Tool = 'task' | 'li' | 'h' | 'bold';
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
  const [cur, setCur] = useState<{ k: ND.BlockKind | null; bold: boolean }>({ k: null, bold: false });
  const [say, setSay] = useState('');
  const [empty, setEmpty] = useState(!text);
  const [tool, setTool] = useState(0);
  const uid = useId();

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
      setCur({ k: (b?.dataset.k as ND.BlockKind) ?? null, bold: document.queryCommandState?.('bold') ?? false });
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
    const sel = document.getSelection();
    const c = caretOf(el);
    if (!c || !sel?.isCollapsed || c.off !== 0) return false;
    const { blocks } = read(el);
    const b = blocks[c.i];
    if (!b) return false;
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
    const sel = document.getSelection();
    const c = caretOf(el);
    if (!c || !sel?.isCollapsed) return false;
    const { blocks } = read(el);
    const b = blocks[c.i];
    const nx = blocks[c.i + 1];
    if (!b || c.off !== plainLen(b)) return false;
    if (!nx) return true;
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
      paste(e.clipboardData?.getData('text/plain') ?? '');
    };
    const onDrop = (e: DragEvent) => e.preventDefault();
    el.addEventListener('beforeinput', before);
    el.addEventListener('paste', onPaste);
    el.addEventListener('drop', onDrop);
    return () => {
      el.removeEventListener('beforeinput', before);
      el.removeEventListener('paste', onPaste);
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
  const setKind = (k: 'task' | 'li' | 'h') => {
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
    const pick = blocks.slice(c.i, to + 1);
    const all = pick.every((b) => b.k === k);
    const out = pick.flatMap((b): Block[] => {
      if (all) return [{ k: 'p', text: b.text }];
      const base = b.k === 'code' ? asPara(b) : [b];
      return base.map((x) => ({ k, text: x.text, ...(k === 'task' ? { done: x.k === 'task' ? x.done : false } : {}), ...(k === 'h' ? { level: 1 as const } : {}) }));
    });
    blocks.splice(c.i, pick.length, ...out);
    setSay(all ? NOTE_TEXT.toText : NOTE_TEXT.became(NOTE_TEXT.kinds[k]));
    apply(blocks, c);
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

  const run = (t: Tool) => {
    if (t === 'bold') {
      restore();
      remember();
      document.execCommand('bold');
      return;
    }
    setKind(t);
  };

  const onKeyDown = (e: RKeyboardEvent<HTMLDivElement>) => {
    if (e.nativeEvent.isComposing) return;
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
    <div className="nedit-wrap">
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
          >
            <Icon name={t.icon} size={15} /> <span>{t.label}</span>
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
      <p className="note__hint" id={`${uid}-hint`}>
        {NOTE_TEXT.editHint}
      </p>
      <span className="sr-only" role="status" aria-live="polite">
        {say}
      </span>
    </div>
  );
}
