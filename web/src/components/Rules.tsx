/**
 * F-164: Regelübersicht im Cockpit. Listet alle Verhaltensregeln mit einem Satz in Klartext:
 * Farbregeln je Kategorie und Seite → Kategorie (anlegen, ändern, ein/aus, löschen mit Rückfrage
 * und „Rückgängig“) sowie die eingebauten Regeln (nur ein/aus). Alles mit nativen Bedienelementen,
 * vollständig per Tastatur (NF-03); Esc schließt zuerst Rückfrage oder Bearbeiten.
 * F-218 (V92, RG1/RG2/RG5): oben ein Gruppen-Rad Portale · Notizen · Anzeige; je Gruppe die einstellbaren Regeln
 * A1–A9 (Name, Satz, Umschalt-Rad mit den Wahlen) und unter „Notizen“ der Block „Wenn … dann …“ (W1–W4, ein/aus wie
 * die eingebauten). A10 (Pausieren) bleibt im Zahnrad, hier nur ein Verweis.
 */
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { NO_CATEGORY } from '../workspace/bookmarks';
import type { Shown } from '../workspace/look';
import { type RuleRow, type RuleUndo, cleanDomain, deleteRule, ruleList, tintRuleId } from '../workspace/rules';
import { RULES_TEXT, TINT_TEXT } from '../workspace/terms';
import type { TintKind } from '../workspace/tint';
import type { Workspace } from '../workspace/types';
import type { Action } from '../workspace/useWorkspace';
import { Row as TintRow } from './Colors';
import { Icon } from './Icon';
import { categoryIcon } from '../workspace/icons';
import { type RuleGroup, RULE_GROUPS, SWITCHES, SWITCH_GROUP, SWITCH_IDS, SWITCH_NO, type SwitchId, WHEN_NO, WHEN_RULES, switchOf, whenOn } from '../workspace/ruleSet';
import { RULE_SET_TEXT } from '../workspace/terms';
import { ModeWheel } from './ModeWheel';

type Change = Partial<Record<TintKind, string | null>>;

interface Props {
  ws: Workspace;
  shown: Shown;
  dispatch: (a: Action) => void;
  /** Ansage für Bildschirmleser (Statuszeile des Cockpits). */
  say: (text: string) => void;
  /** F-218 (RG6): Gruppe beim Öffnen – aus dem Cockpit „Notizen“ kommt man zu „Notizen“. */
  group?: RuleGroup;
}

const GROUP_ICON = { portals: 'radar', notes: 'notesTasks', display: 'design' } as const;

/** Esc nur hier verbrauchen (sonst schließt das Cockpit). */
const escape = (e: KeyboardEvent, run: () => void) => {
  if (e.key !== 'Escape') return;
  e.preventDefault();
  e.stopPropagation();
  run();
};

export function Rules(p: Props) {
  const rows = ruleList(p.ws);
  const [edit, setEdit] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ u: RuleUndo; name: string } | null>(null);
  const [newTint, setNewTint] = useState<string | null>(null); // null = zu, '' = Auswahl offen, sonst Kategorie-Id
  const [newSite, setNewSite] = useState<{ domain: string; cat: string; bad?: boolean } | null>(null);
  const [grp, setGrp] = useState<RuleGroup>(p.group ?? 'portals');
  const box = useRef<HTMLDivElement>(null);
  const focusLater = (sel: string) => window.setTimeout(() => box.current?.querySelector<HTMLElement>(sel)?.focus(), 0);
  useEffect(() => void focusLater('.rules__groups'), []); // eslint-disable-line react-hooks/exhaustive-deps

  /** A1–A9: eine Zeile je Schalter – Name, Nummer, Rad mit den Wahlen, darunter der Satz. */
  const switchRow = (id: SwitchId) => {
    const t = RULE_SET_TEXT.sw[id];
    const value = switchOf(p.ws, id) as string;
    const tid = `rule-sw-${id}`;
    return (
      <li key={id} className="rules__row rules__row--sw" data-rule={`sw:${id}`}>
        <div className="rules__line">
          <strong id={`${tid}-n`}>{t.name}</strong>
          <span className="rules__no-tag" title={RULE_SET_TEXT.noTitle(SWITCH_NO[id])}>{SWITCH_NO[id]}</span>
          <span className="grow" />
          <ModeWheel
            className="rules__wheel"
            label={t.name}
            value={value}
            onChange={(v) => {
              p.dispatch({ type: 'ruleSwitch', id, value: v });
              p.say(RULE_SET_TEXT.said(t.name, t.choices[v] ?? v));
            }}
            options={(SWITCHES[id] as readonly string[]).map((c) => ({ id: c, name: RULE_SET_TEXT.short[`${id}.${c}`] ?? t.choices[c], hint: t.choices[c] }))}
          />
        </div>
        <p id={tid} className="rules__text rules__text--sw">
          {t.text}
          {value !== (SWITCHES[id] as readonly string[])[0] && <span className="rules__off"> · {RULE_SET_TEXT.notFactory}</span>}
        </p>
      </li>
    );
  };
  const switchGroup = (g: RuleGroup) => {
    const ids = SWITCH_IDS.filter((id) => SWITCH_GROUP[id] === g);
    return (
      <section className="rules__group" aria-labelledby={`rules-h-sw-${g}`}>
        <h3 id={`rules-h-sw-${g}`} className="radar__detail-head">
          {RULE_SET_TEXT.switchHead}
        </h3>
        <p className="rules__note">{RULE_SET_TEXT.switchNote}</p>
        <ul className="rules__list">{ids.map(switchRow)}</ul>
        {g === 'display' && <p className="rules__note rules__ref">{RULE_SET_TEXT.pauseRef}</p>}
      </section>
    );
  };
  /** W1–W4: ein/aus wie die eingebauten Regeln. */
  const whenGroup = () => (
    <section className="rules__group" aria-labelledby="rules-h-when">
      <h3 id="rules-h-when" className="radar__detail-head">
        {RULE_SET_TEXT.whenHead}
      </h3>
      <p className="rules__note">{RULE_SET_TEXT.whenIntro}</p>
      <ul className="rules__list">
        {WHEN_RULES.map((id) => {
          const t = RULE_SET_TEXT.when[id];
          const on = whenOn(p.ws, id);
          const tid = `rule-w-${id}`;
          return (
            <li key={id} className={on ? 'rules__row' : 'rules__row is-off'} data-rule={`when:${id}`}>
              <div className="rules__line">
                <label className="rules__on">
                  <input
                    type="checkbox"
                    checked={on}
                    aria-describedby={tid}
                    onChange={() => {
                      p.dispatch({ type: 'ruleWhen', id, on: !on });
                      p.say(RULES_TEXT.said(t.name, !on));
                    }}
                  />
                  <strong>{t.name}</strong>
                  {!on && <span className="rules__off"> · {RULES_TEXT.off}</span>}
                </label>
                <span className="rules__no-tag" title={RULE_SET_TEXT.noTitle(WHEN_NO[id])}>{WHEN_NO[id]}</span>
              </div>
              <p id={tid} className="rules__text">
                {t.text}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );

  const free = p.ws.categories.filter((c) => !c.tint);
  const catOptions = (
    <>
      <option value={NO_CATEGORY}>{RULES_TEXT.none}</option>
      {p.ws.categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </>
  );

  const toggle = (r: RuleRow) => {
    p.dispatch({ type: 'ruleOn', id: r.id, on: !r.on });
    p.say(RULES_TEXT.said(r.name, !r.on));
  };
  const remove = (r: RuleRow) => {
    const { undo: u } = deleteRule(p.ws, r.id);
    setConfirm(null);
    setEdit(null);
    if (!u) return;
    p.dispatch({ type: 'ruleDelete', id: r.id });
    setUndo({ u, name: r.name });
    p.say(RULES_TEXT.deleted(r.name));
    focusLater('.rules__undo button');
  };
  const restore = () => {
    if (!undo) return;
    p.dispatch({ type: 'ruleRestore', undo: undo.u });
    p.say(RULES_TEXT.restored(undo.name));
    setUndo(null);
    focusLater(`[data-rule="${CSS.escape(undo.u.id)}"] input`);
  };
  const tintRows = (catId: string, prefix: string, onChange: (c: Change) => void) => {
    const t = p.ws.categories.find((c) => c.id === catId)?.tint;
    return (
      <>
        <TintRow id={`${prefix}-f`} label={TINT_TEXT.frame} kind="frame" value={t?.frame} inherit={TINT_TEXT.noFrame} shown={p.shown} onChange={(v) => onChange({ frame: v })} />
        <TintRow id={`${prefix}-a`} label={TINT_TEXT.accent} kind="accent" value={t?.accent} inherit={TINT_TEXT.likeDesk} shown={p.shown} onChange={(v) => onChange({ accent: v })} />
      </>
    );
  };

  const row = (r: RuleRow, i: number) => {
    const tid = `rule-t-${r.kind}-${i}`;
    const editing = edit === r.id;
    return (
      <li key={r.id} className={r.on ? 'rules__row' : 'rules__row is-off'} data-rule={r.id}>
        <div className="rules__line">
          <label className="rules__on">
            <input type="checkbox" checked={r.on} onChange={() => toggle(r)} aria-describedby={tid} />
            <strong>{r.name}</strong>
            {!r.on && <span className="rules__off"> · {RULES_TEXT.off}</span>}
          </label>
          {r.kind === 'tint' &&
            (() => {
              // F-183 Stufe 2: Zeichen der Kategorie vor den Farbpunkten
              const c = p.ws.categories.find((x) => x.id === r.category);
              return c ? <Icon name={categoryIcon(c)} size={14} className="icon rules__icon" /> : null;
            })()}
          {r.kind === 'tint' && r.tint && (
            <span className="rules__dots" aria-hidden="true">
              {r.tint.frame && <span className="rules__dot rules__dot--frame" style={{ borderColor: r.tint.frame }} />}
              {r.tint.accent && <span className="rules__dot" style={{ background: r.tint.accent }} />}
            </span>
          )}
          <span className="grow" />
          {r.kind !== 'builtin' && (
            <>
              <button type="button" className="overview__tour" aria-expanded={editing} title={RULES_TEXT.editTitle(r.name)} aria-label={RULES_TEXT.editTitle(r.name)} onClick={() => (setEdit(editing ? null : r.id), setConfirm(null))}>
                {editing ? RULES_TEXT.done : RULES_TEXT.edit}
              </button>
              <button type="button" className="overview__tour" title={RULES_TEXT.delTitle(r.name)} aria-label={RULES_TEXT.delTitle(r.name)} onClick={() => (setConfirm(r.id), setEdit(null), focusLater(`[data-rule="${CSS.escape(r.id)}"] .rules__no`))}>
                {RULES_TEXT.del}
              </button>
            </>
          )}
        </div>
        <p id={tid} className="rules__text">
          {r.text}
        </p>
        {confirm === r.id && (
          <div className="rules__confirm" role="group" aria-label={RULES_TEXT.ask(r.name)} onKeyDown={(e) => escape(e, () => (setConfirm(null), focusLater(`[data-rule="${CSS.escape(r.id)}"] input`)))}>
            <span>{RULES_TEXT.ask(r.name)}</span>
            <button type="button" className="overview__tour" onClick={() => remove(r)}>
              {RULES_TEXT.yes}
            </button>
            <button type="button" className="overview__tour rules__no" onClick={() => (setConfirm(null), focusLater(`[data-rule="${CSS.escape(r.id)}"] input`))}>
              {RULES_TEXT.no}
            </button>
          </div>
        )}
        {editing && (
          <div className="rules__edit" onKeyDown={(e) => escape(e, () => (setEdit(null), focusLater(`[data-rule="${CSS.escape(r.id)}"] input`)))}>
            {r.kind === 'tint' && r.category && tintRows(r.category, `rule-e${i}`, (change) => (p.dispatch({ type: 'tintCategory', id: r.category as string, change }), p.say(RULES_TEXT.changed(r.name))))}
            {r.kind === 'site' && (
              <label className="rules__field">
                {RULES_TEXT.category}{' '}
                <select
                  className="colors__select"
                  value={r.category ?? NO_CATEGORY}
                  onChange={(e) => (p.dispatch({ type: 'siteCategory', domain: r.name, category: e.target.value }), p.say(RULES_TEXT.changed(r.name)))}
                >
                  {catOptions}
                </select>
              </label>
            )}
          </div>
        )}
      </li>
    );
  };

  const addSite = () => {
    if (!newSite) return;
    const d = cleanDomain(newSite.domain);
    if (!d) return setNewSite({ ...newSite, bad: true });
    p.dispatch({ type: 'siteCategory', domain: d, category: newSite.cat });
    p.say(RULES_TEXT.added(d));
    setNewSite(null);
    focusLater(`[data-rule="${CSS.escape(`site:${d}`)}"] input`);
  };

  const group = (kind: RuleRow['kind'], head: string, empty: string | null) => {
    const list = rows.filter((r) => r.kind === kind);
    return (
      <section className="rules__group" aria-labelledby={`rules-h-${kind}`}>
        <h3 id={`rules-h-${kind}`} className="radar__detail-head">
          {head}
        </h3>
        {kind === 'builtin' && <p className="rules__note">{RULES_TEXT.builtinNote}</p>}
        {list.length === 0 && empty && <p className="overview__empty">{empty}</p>}
        {list.length > 0 && <ul className="rules__list">{list.map(row)}</ul>}
        {kind === 'tint' &&
          (newTint === null ? (
            <button type="button" className="overview__tour rules__add" onClick={() => (setNewTint(''), focusLater('#rules-new-cat'))}>
              {RULES_TEXT.newTint}
            </button>
          ) : (
            <div className="rules__edit" onKeyDown={(e) => escape(e, () => (setNewTint(null), focusLater('.rules__add')))}>
              {p.ws.categories.length === 0 ? (
                <p className="overview__empty">{RULES_TEXT.newTintNoCats}</p>
              ) : free.length === 0 && !newTint ? (
                <p className="overview__empty">{RULES_TEXT.newTintAll}</p>
              ) : (
                <label className="rules__field">
                  {RULES_TEXT.newTintLabel}{' '}
                  <select id="rules-new-cat" className="colors__select" value={newTint} onChange={(e) => setNewTint(e.target.value)}>
                    <option value="">{RULES_TEXT.newTintPick}</option>
                    {p.ws.categories
                      .filter((c) => !c.tint || c.id === newTint)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              {newTint &&
                tintRows(newTint, 'rule-new', (change) => {
                  const name = p.ws.categories.find((c) => c.id === newTint)?.name ?? '';
                  const had = !!p.ws.categories.find((c) => c.id === newTint)?.tint;
                  p.dispatch({ type: 'tintCategory', id: newTint, change });
                  if (!had) {
                    p.say(RULES_TEXT.added(name));
                    setNewTint(null);
                    setEdit(tintRuleId(newTint));
                    focusLater(`[data-rule="${CSS.escape(tintRuleId(newTint))}"] input`);
                  }
                })}
              <button type="button" className="overview__tour" onClick={() => (setNewTint(null), focusLater('.rules__add'))}>
                {RULES_TEXT.cancel}
              </button>
            </div>
          ))}
        {kind === 'site' &&
          (newSite === null ? (
            <button type="button" className="overview__tour rules__add rules__add--site" onClick={() => (setNewSite({ domain: '', cat: p.ws.categories[0]?.id ?? NO_CATEGORY }), focusLater('#rules-new-domain'))}>
              {RULES_TEXT.newSite}
            </button>
          ) : (
            <div className="rules__edit" onKeyDown={(e) => escape(e, () => (setNewSite(null), focusLater('.rules__add--site')))}>
              <label className="rules__field">
                {RULES_TEXT.domain}{' '}
                <input
                  id="rules-new-domain"
                  className="radar__filter"
                  value={newSite.domain}
                  placeholder={RULES_TEXT.domainHint}
                  aria-invalid={newSite.bad || undefined}
                  aria-describedby={newSite.bad ? 'rules-bad' : undefined}
                  onChange={(e) => setNewSite({ ...newSite, domain: e.target.value, bad: false })}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSite())}
                />
              </label>
              <label className="rules__field">
                {RULES_TEXT.category}{' '}
                <select className="colors__select" value={newSite.cat} onChange={(e) => setNewSite({ ...newSite, cat: e.target.value })}>
                  {catOptions}
                </select>
              </label>
              <button type="button" className="overview__tour" onClick={addSite}>
                {RULES_TEXT.add}
              </button>
              <button type="button" className="overview__tour" onClick={() => (setNewSite(null), focusLater('.rules__add--site'))}>
                {RULES_TEXT.cancel}
              </button>
              {newSite.bad && (
                <p id="rules-bad" className="look__warn" role="alert">
                  {RULES_TEXT.badDomain}
                </p>
              )}
            </div>
          ))}
      </section>
    );
  };

  return (
    <div ref={box} className="rules" aria-labelledby="rules-head">
      <h2 id="rules-head" className="sr-only">
        {RULES_TEXT.head}
      </h2>
      <div className="rules__top">
        <ModeWheel
          className="rules__groups"
          label={RULE_SET_TEXT.groupLabel}
          value={grp}
          onChange={(g) => {
            setGrp(g as RuleGroup);
            p.say(RULE_SET_TEXT.groupSaid(RULE_SET_TEXT.groups[g as RuleGroup]));
          }}
          options={RULE_GROUPS.map((g) => ({ id: g, name: RULE_SET_TEXT.groups[g], icon: GROUP_ICON[g], hint: RULE_SET_TEXT.groupHint[g] }))}
        />
        <p className="rules__intro">{RULES_TEXT.intro}</p>
      </div>
      {undo && (
        <p className="rules__undo">
          {RULES_TEXT.deleted(undo.name)}{' '}
          <button type="button" className="overview__tour" onClick={restore}>
            {RULES_TEXT.undo}
          </button>
        </p>
      )}
      {grp === 'portals' && (
        <>
          {group('tint', RULES_TEXT.tintHead, RULES_TEXT.tintNone)}
          {group('site', RULES_TEXT.siteHead, RULES_TEXT.siteNone)}
          {group('builtin', RULES_TEXT.builtinHead, null)}
        </>
      )}
      {switchGroup(grp)}
      {grp === 'notes' && whenGroup()}
    </div>
  );
}
