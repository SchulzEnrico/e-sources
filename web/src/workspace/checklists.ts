/**
 * V121 (F-231 K2): mehrere benannte Checklisten je Karte – wie Trello, aber im Text der Notiz (T3: ein Ort).
 * Aufbau im Text: „### ☑ Name“, darunter „- [ ] Punkt“. Ein Punkt kann eine Person und ein Datum tragen:
 * „- [ ] Vertrag prüfen — @Anna Berg, bis 04.12.2026“ (beides wahlweise). Aufgaben-Zeilen ohne Kopf bilden die
 * Liste „Checkliste“. Reine Funktionen auf dem Text; das Kartenfenster (SheetViews) zeigt die Listen.
 */
export const CHECK_HEAD = /^#{1,6}\s+☑\s*(.*)$/;
const TASK = /^(\s*[-*+]\s+)\[( |x|X)\]\s?(.*)$/;
const META = /\s+—\s+(?:@([^,]+?))?(?:,?\s*bis\s+(\d{2})\.(\d{2})\.(\d{4}))?\s*$/;
export const CHECKLIST_NAME = 'Checkliste';

export interface CheckItem {
  /** Text ohne Person und Datum. */
  text: string;
  done: boolean;
  who?: string;
  /** JJJJ-MM-TT */
  due?: string;
  /** Zeile im Text (0-basiert). */
  line: number;
  /** Nummer über alle Aufgaben-Zeilen (für „In Aufgabe umwandeln“). */
  index: number;
}
export interface CheckList {
  name: string;
  /** Zeile des Kopfs; -1 = ohne Kopf (lose Punkte). */
  head: number;
  items: CheckItem[];
}

/** Text eines Punkts in Text, Person und Datum zerlegen. */
export function itemMeta(raw: string): { text: string; who?: string; due?: string } {
  const m = META.exec(raw);
  if (!m || (!m[1] && !m[2])) return { text: raw.trim() };
  return { text: raw.slice(0, m.index).trim(), ...(m[1] ? { who: m[1].trim() } : {}), ...(m[2] ? { due: `${m[4]}-${m[3]}-${m[2]}` } : {}) };
}

/** Punkt-Text mit Person und Datum. */
export function itemText(text: string, who?: string, due?: string): string {
  const meta = [who ? `@${who}` : '', due ? `bis ${due.slice(8, 10)}.${due.slice(5, 7)}.${due.slice(0, 4)}` : ''].filter(Boolean).join(', ');
  return meta ? `${text.trim()} — ${meta}` : text.trim();
}

/** Checklisten im Text, in Reihenfolge. */
export function checklistsOf(text: string): CheckList[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const out: CheckList[] = [];
  let cur: CheckList | null = null;
  let loose: CheckList | null = null;
  let index = 0;
  lines.forEach((l, i) => {
    const h = CHECK_HEAD.exec(l);
    if (h) {
      cur = { name: h[1].trim() || CHECKLIST_NAME, head: i, items: [] };
      out.push(cur);
      return;
    }
    const t = TASK.exec(l);
    if (t) {
      const item: CheckItem = { ...itemMeta(t[3]), done: t[2] !== ' ', line: i, index: index++ };
      if (cur) cur.items.push(item);
      else {
        if (!loose) {
          loose = { name: CHECKLIST_NAME, head: -1, items: [] };
          out.push(loose);
        }
        loose.items.push(item);
      }
      return;
    }
    if (cur && l.trim() === '') return;
    cur = null;
  });
  return out;
}

const lineArr = (text: string) => text.replace(/\r\n?/g, '\n').split('\n');

/** Punkt abhaken bzw. wieder öffnen. */
export function toggleItem(text: string, line: number): string {
  const lines = lineArr(text);
  const t = TASK.exec(lines[line] ?? '');
  if (!t) return text;
  lines[line] = `${t[1]}[${t[2] === ' ' ? 'x' : ' '}] ${t[3]}`;
  return lines.join('\n');
}

/** Punkt ändern (Text, Person, Datum). */
export function setItem(text: string, line: number, patch: { text?: string; who?: string | null; due?: string | null }): string {
  const lines = lineArr(text);
  const t = TASK.exec(lines[line] ?? '');
  if (!t) return text;
  const m = itemMeta(t[3]);
  const who = patch.who === null ? undefined : (patch.who ?? m.who);
  const due = patch.due === null ? undefined : (patch.due ?? m.due);
  lines[line] = `${t[1]}[${t[2]}] ${itemText(patch.text ?? m.text, who, due)}`;
  return lines.join('\n');
}

/** Punkt löschen. */
export function removeItem(text: string, line: number): string {
  const lines = lineArr(text);
  if (!TASK.test(lines[line] ?? '')) return text;
  lines.splice(line, 1);
  return lines.join('\n');
}

/** Punkt am Ende der Liste `list` (Nummer in checklistsOf) anfügen; ohne Listen entsteht „Checkliste“. */
export function addItem(text: string, list: number, item: string, who?: string, due?: string): string {
  const t = item.trim();
  if (!t) return text;
  const row = `- [ ] ${itemText(t, who, due)}`;
  const lists = checklistsOf(text);
  const l = lists[list];
  const lines = lineArr(text);
  if (!l) return addChecklist(text, CHECKLIST_NAME, [row]);
  const after = l.items.length ? l.items[l.items.length - 1].line : l.head;
  lines.splice(after + 1, 0, row);
  return lines.join('\n');
}

/** Neue Checkliste ans Ende des Texts (mit Leerzeile davor). */
export function addChecklist(text: string, name: string, rows: string[] = []): string {
  const head = `### ☑ ${name.trim() || CHECKLIST_NAME}`;
  const base = text.replace(/\s+$/, '');
  return [base, [head, ...rows].join('\n')].filter((x) => x.length > 0).join('\n\n');
}

/** „Checklisten übernehmen von …“: alle Listen der anderen Karte anhängen, Punkte offen. */
export function copyChecklists(text: string, from: string): string {
  let out = text;
  for (const l of checklistsOf(from)) out = addChecklist(out, l.name, l.items.map((i) => `- [ ] ${itemText(i.text, i.who, i.due)}`));
  return out;
}

/** Fortschritt einer Liste. */
export const listProgress = (l: CheckList) => ({ done: l.items.filter((i) => i.done).length, all: l.items.length });
