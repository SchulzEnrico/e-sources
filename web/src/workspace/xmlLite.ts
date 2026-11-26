/**
 * V118 (F-230): kleiner XML-Leser für Austauschdateien (MSPDI). Elemente mit Kindern und Text, Attribute nur gelesen,
 * Kommentare, CDATA und Verarbeitungsanweisungen übersprungen. Jedes Element kennt seinen Ausschnitt im Text (`raw`),
 * damit Unbekanntes unverändert mitgeführt werden kann. Kein DOM nötig (läuft auch in Tests).
 */
export interface XNode {
  name: string;
  attrs: Record<string, string>;
  children: XNode[];
  /** Text direkt im Element (bei Blättern der Wert), Entities aufgelöst */
  text: string;
  /** das Element im Originaltext */
  raw: string;
}

const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
export const unescapeXml = (s: string): string =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => (e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : (ENT[e] ?? m)));

/** Liest den Text als XML; wirft bei kaputtem Aufbau einen Fehler mit Stelle. */
export function parseXml(src: string): XNode {
  let i = 0;
  const n = src.length;
  const stack: { node: XNode; start: number }[] = [];
  let root: XNode | null = null;
  const fail = (why: string): never => {
    throw new Error(`XML: ${why} (Zeichen ${i})`);
  };
  while (i < n) {
    const lt = src.indexOf('<', i);
    if (lt < 0) {
      if (stack.length) stack[stack.length - 1].node.text += unescapeXml(src.slice(i));
      break;
    }
    if (lt > i && stack.length) stack[stack.length - 1].node.text += unescapeXml(src.slice(i, lt));
    i = lt;
    if (src.startsWith('<!--', i)) {
      const e = src.indexOf('-->', i);
      if (e < 0) fail('Kommentar ohne Ende');
      i = e + 3;
      continue;
    }
    if (src.startsWith('<![CDATA[', i)) {
      const e = src.indexOf(']]>', i);
      if (e < 0) fail('CDATA ohne Ende');
      if (stack.length) stack[stack.length - 1].node.text += src.slice(i + 9, e);
      i = e + 3;
      continue;
    }
    if (src.startsWith('<?', i) || src.startsWith('<!', i)) {
      const e = src.indexOf('>', i);
      if (e < 0) fail('Anweisung ohne Ende');
      i = e + 1;
      continue;
    }
    const gt = src.indexOf('>', i);
    if (gt < 0) fail('Tag ohne Ende');
    if (src[i + 1] === '/') {
      const name = src.slice(i + 2, gt).trim();
      const top = stack.pop();
      if (!top || top.node.name !== name) fail(`unerwartetes </${name}>`);
      top!.node.raw = src.slice(top!.start, gt + 1);
      i = gt + 1;
      if (!stack.length) root = top!.node;
      continue;
    }
    const selfClose = src[gt - 1] === '/';
    const inner = src.slice(i + 1, selfClose ? gt - 1 : gt).trim();
    const sp = inner.search(/\s/);
    const name = sp < 0 ? inner : inner.slice(0, sp);
    if (!/^[A-Za-z_][\w.:-]*$/.test(name)) fail(`Name „${name}“`);
    const attrs: Record<string, string> = {};
    if (sp >= 0) for (const m of inner.slice(sp).matchAll(/([\w.:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) attrs[m[1]] = unescapeXml(m[3] ?? m[4] ?? '');
    const node: XNode = { name, attrs, children: [], text: '', raw: '' };
    if (stack.length) stack[stack.length - 1].node.children.push(node);
    if (selfClose) {
      node.raw = src.slice(i, gt + 1);
      if (!stack.length) root = node;
    } else stack.push({ node, start: i });
    i = gt + 1;
  }
  if (stack.length) fail(`<${stack[stack.length - 1].node.name}> nicht geschlossen`);
  if (!root) fail('kein Element');
  return root!;
}

/** Name ohne Namensraum-Präfix. */
export const local = (name: string): string => name.slice(name.indexOf(':') + 1);
/** Erstes Kind mit dem Namen. */
export const child = (x: XNode | undefined, name: string): XNode | undefined => x?.children.find((c) => local(c.name) === name);
/** Alle Kinder mit dem Namen. */
export const kids = (x: XNode | undefined, name: string): XNode[] => (x?.children ?? []).filter((c) => local(c.name) === name);
/** Text eines Kinds, getrimmt; '' wenn es fehlt. */
export const val = (x: XNode | undefined, name: string): string => child(x, name)?.text.trim() ?? '';
