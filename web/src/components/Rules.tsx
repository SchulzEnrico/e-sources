/**
 * F-164: Regelübersicht im Cockpit. Listet alle Verhaltensregeln mit einem Satz in Klartext:
 * Farbregeln je Kategorie und Seite → Kategorie (anlegen, ändern, ein/aus, löschen mit Rückfrage
 * und „Rückgängig“) sowie die eingebauten Regeln (nur ein/aus). Alles mit nativen Bedienelementen,
 * vollständig per Tastatur (NF-03); Esc schließt zuerst Rückfrage oder Bearbeiten.
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

type Change = Partial<Record<TintKind, string | null>>;

interface Props {
  ws: Workspace;
  shown: Shown;
  dispatch: (a: Action) => void;
  /** Ansage für Bildschirmleser (Statuszeile des Cockpits). */
  say: (text: string) => void;
}

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
  const box = useRef<HTMLDivElement>(null);
  const focusLater = (sel: string) => window.setTimeout(() => box.current?.querySelector<HTMLElement>(sel)?.focus(), 0);
  useEffect(() => void focusLater('.rules input, .rules button'), []); // eslint-disable-line react-hooks/exhaustive-deps

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
      <p className="rules__intro">{RULES_TEXT.intro}</p>
      {undo && (
        <p className="rules__undo">
          {RULES_TEXT.deleted(undo.name)}{' '}
          <button type="button" className="overview__tour" onClick={restore}>
            {RULES_TEXT.undo}
          </button>
        </p>
      )}
      {group('tint', RULES_TEXT.tintHead, RULES_TEXT.tintNone)}
      {group('site', RULES_TEXT.siteHead, RULES_TEXT.siteNone)}
      {group('builtin', RULES_TEXT.builtinHead, null)}
    </div>
  );
}
