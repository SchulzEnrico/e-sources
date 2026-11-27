/**
 * F-218 (V91): Weitere Regeln im Cockpit „Regeln“ – Entscheidungen RG1–RG8 (Claude Doc „V89 – Weitere
 * Regeln im Cockpit „Regeln““, Enrico: „Hier folgen wir deinen Vorschlägen“).
 *
 * RG1 Schalter A1–A9 für Verhalten, das bisher fest im Code steht (A10 Pausieren bleibt im Zahnrad,
 *     im Bereich nur ein Verweis). Ab Werk gilt das heutige Verhalten.
 * RG2 Zuerst die Wenn-dann-Regeln W1–W4 (mitgeliefert, zum Einschalten wie in Trello), W8–W10 später.
 * RG5 Gruppen-Rad im Bereich: Portale · Notizen · Anzeige.
 * RG7 Was eine Regel getan hat, steht in der Spur der Notiz (`by` = Name der Regel).
 *
 * Gespeichert in `Workspace.ruleSet` (abgeglichen, Dateiformat 8): nur Abweichungen vom Werk.
 * Alles hier ist rein.
 */
import { RULE_SET_TEXT } from './terms';
import type { Note, Workspace } from './types';
import { dayOf, isFinished, notesOf, setState, shiftDay, updateNote } from './notes';
import { type KitButton, type KitRule, kitOf, parseButtons, parseRules, setOn } from './ruleKit';

// ---------------------------------------------------------------- A1–A9 Schalter

/** Einstellbare, bisher feste Regeln (A1–A9) mit ihren Wahlmöglichkeiten; die erste ist das Werk. */
export const SWITCHES = {
  /** A1 Meldung mit „Rückgängig“ bleibt stehen. */
  notice: ['2', '5', '10', 'click'],
  /** A2 WIP-Limit überschritten. */
  wip: ['ask', 'block', 'mark'],
  /** A3 Schloss außerhalb des Kanbans (L1). */
  lock: ['on', 'off'],
  /** A4 Abnahme bestätigen. */
  review: ['ask', 'direct'],
  /** A5 Erledigte in To-do und Kanban einklappen. */
  fold: ['now', '2s', 'day', 'never'],
  /** A6 Neues Pad ohne Plan. */
  newPad: ['half', 'last', 'plan'],
  /** A7 Leeres Sheet beim Schließen. */
  emptySheet: ['drop', 'keep'],
  /** A8 Erinnerung: Ton. */
  remindSound: ['on', 'off'],
  /** A8 Erinnerung: Systemmitteilung (nur nach Erlaubnis des Browsers). */
  remindSystem: ['on', 'off'], // V92: Werk „an“ = heutiges Verhalten (zeigt nur nach Erlaubnis)
  /** A9 Gleiche Source ein zweites Mal öffnen. */
  sameSource: ['newTab', 'jump', 'ask'],
} as const;

export type SwitchId = keyof typeof SWITCHES;
export type SwitchValue<K extends SwitchId> = (typeof SWITCHES)[K][number];
export const SWITCH_IDS = Object.keys(SWITCHES) as SwitchId[];

/** Gruppe im Bereich „Regeln“ (RG5). */
export type RuleGroup = 'portals' | 'notes' | 'display';
export const RULE_GROUPS: readonly RuleGroup[] = ['portals', 'notes', 'display'];

export const SWITCH_GROUP: Record<SwitchId, RuleGroup> = {
  notice: 'display',
  wip: 'notes',
  lock: 'notes',
  review: 'notes',
  fold: 'notes',
  newPad: 'notes',
  emptySheet: 'notes',
  remindSound: 'display',
  remindSystem: 'display',
  sameSource: 'portals',
};

/** Nummer im Doc (A1–A9) – für Spur und Hilfe. */
export const SWITCH_NO: Record<SwitchId, string> = {
  notice: 'A1', wip: 'A2', lock: 'A3', review: 'A4', fold: 'A5', newPad: 'A6', emptySheet: 'A7', remindSound: 'A8', remindSystem: 'A8', sameSource: 'A9',
};

// ---------------------------------------------------------------- W1–W4 Wenn-dann-Regeln

/** Mitgelieferte Wenn-dann-Regeln (RG2: zuerst W1–W4); ab Werk aus, wie Trello-Vorschläge. */
export type WhenRule = 'doneChecks' | 'checksNext' | 'archiveOld' | 'dueUrgent';
export const WHEN_RULES: readonly WhenRule[] = ['doneChecks', 'checksNext', 'archiveOld', 'dueUrgent'];
export const WHEN_NO: Record<WhenRule, string> = { doneChecks: 'W1', checksNext: 'W2', archiveOld: 'W3', dueUrgent: 'W4' };
/** W3: erledigt seit so vielen Tagen → archivieren. */
export const ARCHIVE_DAYS = 30;
/** W4: fällig in höchstens so vielen Tagen (oder überschritten) → dringend. */
export const URGENT_DAYS = 1;

/** Gespeicherte Abweichungen vom Werk. */
export interface RuleSet {
  sw?: Partial<Record<SwitchId, string>>;
  /** Eingeschaltete Wenn-dann-Regeln (bis V128; fehlt `rules`, gelten sie für die mitgelieferten Regeln). */
  when?: WhenRule[];
  /** V129 (F-231 K10a, Dateiformat 13): Regel-Baukasten – alle Regeln samt mitgelieferten W1–W4 (ruleKit.ts). */
  rules?: KitRule[];
  /** V130 (F-231 K10b): Karten- und Board-Knöpfe (ruleKit.ts) – gleicher Wortschatz wie die Aktionen der Regeln. */
  buttons?: KitButton[];
}

export const ruleSetOf = (ws: Workspace): RuleSet => ws.ruleSet ?? {};

/** Wert eines Schalters (Werk = erste Wahl). */
export function switchOf<K extends SwitchId>(ws: Workspace, id: K): SwitchValue<K> {
  const v = ruleSetOf(ws).sw?.[id];
  const all = SWITCHES[id] as readonly string[];
  return (v && all.includes(v) ? v : all[0]) as SwitchValue<K>;
}

const withSet = (ws: Workspace, rs: RuleSet): Workspace => {
  const clean: RuleSet = {};
  if (rs.sw && Object.keys(rs.sw).length) clean.sw = rs.sw;
  if (rs.when?.length && !rs.rules) clean.when = rs.when;
  if (rs.rules) clean.rules = rs.rules;
  if (rs.buttons?.length) clean.buttons = rs.buttons;
  const { ruleSet: _o, ...rest } = ws;
  return Object.keys(clean).length ? { ...rest, ruleSet: clean } : rest;
};

/** Schalter setzen; der Werkswert wird nicht gespeichert. */
export function setSwitch<K extends SwitchId>(ws: Workspace, id: K, value: SwitchValue<K>): Workspace {
  const all = SWITCHES[id] as readonly string[];
  if (!all.includes(value)) return ws;
  const rs = ruleSetOf(ws);
  const { [id]: _old, ...sw } = rs.sw ?? {};
  return withSet(ws, { ...rs, sw: value === all[0] ? sw : { ...sw, [id]: value } });
}

/** V129 (K10a): W1–W4 sind mitgelieferte Bausteinregeln – Ein/Aus steht in der Regel (bzw. bis zur ersten Änderung in `when`). */
export const whenOn = (ws: Workspace, id: WhenRule) => !!kitOf(ws).find((r) => r.w === id)?.on;

export function setWhen(ws: Workspace, id: WhenRule, on: boolean): Workspace {
  const rs = ruleSetOf(ws);
  if (rs.rules) return setOn(ws, `w-${id}`, on);
  const list = rs.when ?? [];
  if (on === list.includes(id)) return ws;
  return withSet(ws, { ...rs, when: on ? WHEN_RULES.filter((x) => x === id || list.includes(x)) : list.filter((x) => x !== id) });
}

/** Lesen: nur bekannte Schalter mit gültigem Wert (nicht der Werkswert), nur bekannte Regeln. */
export function parseRuleSet(v: unknown): RuleSet | undefined {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  const r = v as Record<string, unknown>;
  const out: RuleSet = {};
  if (r.sw && typeof r.sw === 'object' && !Array.isArray(r.sw)) {
    const sw: Partial<Record<SwitchId, string>> = {};
    for (const [k, x] of Object.entries(r.sw as Record<string, unknown>)) {
      const all = SWITCHES[k as SwitchId] as readonly string[] | undefined;
      if (all && typeof x === 'string' && all.includes(x) && x !== all[0]) sw[k as SwitchId] = x;
    }
    if (Object.keys(sw).length) out.sw = sw;
  }
  const buttons = parseButtons(r.buttons);
  if (buttons) out.buttons = buttons;
  const rules = parseRules(r.rules);
  if (rules) out.rules = rules;
  else if (Array.isArray(r.when)) {
    const when = WHEN_RULES.filter((w) => (r.when as unknown[]).includes(w));
    if (when.length) out.when = when;
  }
  return Object.keys(out).length ? out : undefined;
}

/** A1: Dauer einer Meldung mit „Rückgängig“ in ms; `null` = bis zum nächsten Klick. */
export function noticeMs(ws: Workspace): number | null {
  const v = switchOf(ws, 'notice');
  return v === 'click' ? null : Number(v) * 1000;
}

// ---------------------------------------------------------------- Checklisten (W1, W2)

const BOX = /^(\s*[-*] \[)( |x|X)(\] )/gm;

/** Kästchen im Text: Zahl gesamt und erledigt. */
export function checksOf(text: string): { total: number; done: number } {
  let total = 0;
  let done = 0;
  for (const m of text.matchAll(BOX)) {
    total++;
    if (m[2] !== ' ') done++;
  }
  return { total, done };
}

/** W1: alle Kästchen abhaken. */
export const checkAll = (text: string): string => text.replace(BOX, (_m, a: string, _b: string, c: string) => `${a}x${c}`);

/** W2: gibt es Kästchen und sind alle abgehakt? */
export function allChecked(text: string): boolean {
  const c = checksOf(text);
  return c.total > 0 && c.done === c.total;
}

/** Name der Regel für die Spur (RG7). */
export const ruleBy = (id: WhenRule) => `${RULE_SET_TEXT.by} ${WHEN_NO[id]} · ${RULE_SET_TEXT.when[id].name}`;

/** W1: Notiz kam in eine Erledigt-Spalte → Kästchen abhaken (nur wenn die Regel an ist und es etwas zu tun gibt). */
export function onDone(ws: Workspace, noteId: string, now = Date.now()): Workspace {
  if (!whenOn(ws, 'doneChecks')) return ws;
  const n = notesOf(ws).find((x) => x.id === noteId);
  if (!n || !n.text || checksOf(n.text).done === checksOf(n.text).total) return ws;
  return updateNote(ws, noteId, { text: checkAll(n.text) }, { by: ruleBy('doneChecks'), now });
}

/** W2: Soll die Karte weiterrücken? (Bewegen macht das Kanban, weil es die Spalten kennt.) */
export const shouldAdvance = (ws: Workspace, n: Pick<Note, 'text' | 'state'>) =>
  whenOn(ws, 'checksNext') && !isFinished(n.state) && allChecked(n.text ?? '');

/** Zeitpunkt, zu dem die Notiz (zuletzt) erledigt wurde – aus der Spur. */
export function doneAt(n: Note): number | null {
  if (n.state !== 'done') return null;
  for (let i = n.trail.length - 1; i >= 0; i--) if (n.trail[i].what === 'state') return n.trail[i].at;
  return n.changed;
}

/**
 * W3 und W4 über alle Notizen (beim Start und danach regelmäßig): erledigt seit ARCHIVE_DAYS Tagen →
 * archivieren; fällig in höchstens URGENT_DAYS Tagen oder überschritten → dringend.
 * Gibt die geänderte Arbeitsfläche und die Zahl der Änderungen je Regel zurück.
 */
export function sweep(ws: Workspace, now = Date.now()): { ws: Workspace; archived: number; urgent: number } {
  let next = ws;
  let archived = 0;
  let urgent = 0;
  const today = dayOf(now);
  const limit = shiftDay(today, URGENT_DAYS);
  for (const n of notesOf(ws)) {
    if (whenOn(ws, 'archiveOld')) {
      const at = doneAt(n);
      if (at !== null && now - at >= ARCHIVE_DAYS * 864e5) {
        next = setState(next, n.id, 'archived', { by: ruleBy('archiveOld'), now });
        archived++;
        continue;
      }
    }
    if (whenOn(ws, 'dueUrgent') && n.due && !n.urgent && !isFinished(n.state) && n.due <= limit) {
      next = updateNote(next, n.id, { urgent: true }, { by: ruleBy('dueUrgent'), now });
      urgent++;
    }
  }
  return { ws: next, archived, urgent };
}

/**
 * A5 (V92): Klappt eine erledigte (bzw. archivierte) Notiz in To-do und Kanban schon unter „n erledigt“?
 * sofort (Werk) · nach 2 Sekunden · nach einem Tag · nie. Ohne bekannten Zeitpunkt gilt „lange her“.
 */
export function foldsDone(ws: Workspace, n: Note, now = Date.now()): boolean {
  const v = switchOf(ws, 'fold');
  if (v === 'now') return true;
  if (v === 'never') return false;
  const at = doneAt(n) ?? (n.state === 'archived' ? 0 : null);
  if (at === null) return true;
  return now - at >= (v === '2s' ? 2000 : 864e5);
}
