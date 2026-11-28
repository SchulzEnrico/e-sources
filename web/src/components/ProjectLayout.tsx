/**
 * V154 (F-236 B, Schritt 2 nach G8; G4): Generator-Blatt „Layout“ – links die Regeln in Gruppen, rechts eine Vorschau
 * (Blatt-Ausschnitt, Musterkästen MUSS/SOLL/KANN, Kurve und eine echte Grafik des Projekts), die sich sofort ändert.
 * Abweichende Regeln sind markiert, jede lässt sich einzeln auf die Vorgabe zurücksetzen; Kontrast wird geprüft und
 * am Ort gewarnt (G7, nie stillschweigend geändert). Übernehmen von einem anderen Projekt (G2) mit Rückgängig.
 */
import { useState } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { Project, Workspace } from '../workspace/types';
import * as L from '../workspace/layoutRules';
import { figureSvg } from '../workspace/gpmFigures';
import { projectsOf } from '../workspace/projects';
import { LAYOUT_TEXT as T } from '../workspace/terms';
import { useFieldMsg } from './PaperDocs';
import { paperZoom } from './ProjectSheet';
import { ModeWheel } from './ModeWheel';
import * as Fk from '../workspace/formKit';

type RuleKey = Exclude<keyof L.LayoutRules, 'name'>;
/** V155 (G3 Rest): Gruppen mit Farben, Schriften, Größen, Schaltern */
const GROUPS: [keyof typeof T.groups, RuleKey[]][] = [
  ['boxes', ['primary', 'accent', 'soft', 'neutral', 'gradient', 'radius', 'shadow']],
  ['lines', ['critical', 'line', 'grid', 'head']],
  ['text', ['ink', 'muted', 'font', 'headFont', 'textSize', 'headSize']],
  ['tables', ['label', 'tableHead', 'tableGrid', 'tableSize']],
  ['curves', ['bar', 'ok']],
  ['print', ['printLogo', 'printNo', 'printPage']],
];
const isColor = (k: RuleKey): k is L.LayoutColor => (L.LAYOUT_COLORS as readonly string[]).includes(k);
const isSize = (k: RuleKey): k is L.LayoutSize => (L.LAYOUT_SIZES as readonly string[]).includes(k);
const isFlag = (k: RuleKey): k is L.LayoutFlag => (L.LAYOUT_FLAGS as readonly string[]).includes(k);

/** Markierung „weicht ab“ und ↺ – gleich für alle Regeln (NF-08) */
function Differs({ on }: { on: boolean }) {
  return on ? <span className="lay__mark" title={T.differs}> ●<span className="sr-only">{T.differs}</span></span> : null;
}
function ResetBtn({ k, on, onReset }: { k: RuleKey; on: boolean; onReset: () => void }) {
  return (
    <button type="button" className="lay__reset" disabled={!on} onClick={onReset} title={T.toRuleHint(T.rules[k])} aria-label={T.toRuleHint(T.rules[k])}>
      ↺ {T.toRule}
    </button>
  );
}

/** Schriftart oder Raster: Umschalt-Rad wie überall */
function WheelRule({ k, value, options, hints, onSet, onReset, msg }: { k: 'font' | 'headFont' | 'tableGrid'; value: string; options: Record<string, string>; hints: Record<string, string>; onSet: (v: string) => void; onReset: () => void; msg: React.ReactNode }) {
  const on = value !== L.REPORT_LAYOUT[k];
  return (
    <div className={`lay__rule${on ? ' is-differs' : ''}`}>
      <span className="lay__name">{T.rules[k]}<Differs on={on} /></span>
      <span className="lay__sel pj__wheel">
        <ModeWheel label={T.rules[k]} value={value} onChange={onSet} options={Object.keys(options).map((id) => ({ id, name: options[id], hint: hints[id] }))} />
      </span>
      <ResetBtn k={k} on={on} onReset={onReset} />
      {msg}
    </div>
  );
}

/** Größe in % bzw. Ecken in px */
function SizeRule({ k, value, onSet, onReset, msg }: { k: L.LayoutSize; value: number; onSet: (v: number) => void; onReset: () => void; msg: React.ReactNode }) {
  const [lo, hi] = L.SIZE_RANGE[k];
  const u = T.sizeUnit[k];
  const on = value !== L.REPORT_LAYOUT[k];
  const [draft, setDraft] = useState<string | null>(null);
  const id = `lay-${k}`;
  const commit = (s: string) => {
    setDraft(null);
    const n = Math.round(Number(s.replace(',', '.')));
    if (!Number.isFinite(n)) return;
    const v = Math.max(lo, Math.min(hi, n));
    if (v !== value) onSet(v);
  };
  return (
    <div className={`lay__rule${on ? ' is-differs' : ''}`}>
      <label htmlFor={id} className="lay__name">{T.rules[k]}<Differs on={on} /></label>
      <span>
        <input id={id} className="lay__num" type="number" min={lo} max={hi} step={k === 'radius' ? 1 : 5} value={draft ?? String(value)} title={T.sizeHint(lo, hi, u)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => draft !== null && commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit(e.currentTarget.value);
            else if (e.key === 'Escape' && draft !== null) (e.stopPropagation(), setDraft(null));
          }} /> {u}
      </span>
      <ResetBtn k={k} on={on} onReset={onReset} />
      {msg}
    </div>
  );
}

/** Ein/aus (Verlauf, Schatten, Druck) */
function FlagRule({ k, value, onSet, msg, hint }: { k: L.LayoutFlag; value: boolean; onSet: (v: boolean) => void; msg: React.ReactNode; hint?: string }) {
  const on = value !== L.REPORT_LAYOUT[k];
  return (
    <div className={`lay__rule lay__rule--flag${on ? ' is-differs' : ''}`}>
      <label className="lay__check" title={hint}>
        <input type="checkbox" checked={value} onChange={(e) => onSet(e.target.checked)} />
        {T.rules[k] ?? T.gradient}
        <Differs on={on} />
      </label>
      {msg}
    </div>
  );
}

function ColorRule({ k, value, differs, warn, onSet, onReset, msg }: { k: L.LayoutColor; value: string; differs: boolean; warn?: L.ContrastWarning; onSet: (v: string) => void; onReset: () => void; msg: React.ReactNode }) {
  const name = T.rules[k];
  const [draft, setDraft] = useState<string | null>(null);
  const [bad, setBad] = useState(false);
  const id = `lay-${k}`;
  const commit = (v: string) => {
    const c = L.normHex(v);
    if (!c) return setBad(true);
    setBad(false);
    setDraft(null);
    if (c !== value) onSet(c);
  };
  return (
    <div className={`lay__rule${differs ? ' is-differs' : ''}`}>
      <label htmlFor={id} className="lay__name">
        {name}
        {differs && <span className="lay__mark" title={T.differs}> ●<span className="sr-only">{T.differs}</span></span>}
      </label>
      <input type="color" aria-label={`${name} – Farbe wählen`} value={value} onChange={(e) => onSet(e.target.value)} />
      <input
        id={id}
        className={`lay__hex${bad ? ' is-bad' : ''}`}
        value={draft ?? value}
        aria-invalid={bad || undefined}
        aria-describedby={bad ? `${id}-bad` : warn ? `${id}-warn` : undefined}
        maxLength={7}
        spellCheck={false}
        onChange={(e) => (setDraft(e.target.value), setBad(false))}
        onBlur={(e) => draft !== null && commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit(e.currentTarget.value);
          else if (e.key === 'Escape' && draft !== null) (e.stopPropagation(), setDraft(null), setBad(false));
        }}
      />
      <button type="button" className="lay__reset" disabled={!differs} onClick={onReset} title={T.toRuleHint(name)} aria-label={T.toRuleHint(name)}>
        ↺ {T.toRule}
      </button>
      {bad && <span id={`${id}-bad`} className="lay__warn" role="status">{T.bad}</span>}
      {warn && !bad && (
        <span id={`${id}-warn`} className="lay__warn" role="status">
          ⚠ {T.warn(warn.ratio.toLocaleString('de-DE'), warn.need.toLocaleString('de-DE'), T.warnOn(warn.on === 'paper' ? 'paper' : T.rules[warn.on]))}
        </span>
      )}
      {msg}
    </div>
  );
}

/** Musterkästen und Kurve in den Farben der Regeln (nur Vorschau, aria-hidden – alles steht links in den Regeln) */
function sampleSvg(l: L.LayoutRules): string {
  const box = (x: number, fill: string, text: string, label: string) => {
    const g = l.gradient ? `<rect x="${x + 1.5}" y="11" width="85" height="9" rx="3" fill="#fff" fill-opacity="0.3"/>` : '';
    const sh = l.shadow ? `<rect x="${x + 1.5}" y="12" width="88" height="34" rx="${l.radius}" fill="#000" fill-opacity="0.18"/>` : '';
    return `${sh}<rect x="${x}" y="10" width="88" height="34" rx="${l.radius}" fill="${fill}" stroke="${L.shade(fill, -0.4)}" stroke-width="0.8"/>${g}<text x="${x + 44}" y="31" text-anchor="middle" font-size="11" font-weight="bold" fill="${text}">${label}</text>`;
  };
  const S = T.sample;
  const bars = [30, 52, 44, 70, 38, 58].map((h, i) => `<rect x="${20 + i * 34}" y="${150 - h}" width="22" height="${h}" fill="${l.bar}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 170" width="100%" aria-hidden="true" font-family="${L.FONT_CSS[l.font]}">
${box(4, l.primary, L.textOn(l.primary, l.ink), S.must)}${box(102, l.accent, L.textOn(l.accent, l.ink), S.should)}${box(200, l.soft, L.textOn(l.soft, l.ink), S.can)}${box(298, l.neutral, l.primary, S.neutral)}
<line x1="48" y1="44" x2="48" y2="62" stroke="${l.primary}" stroke-width="1.6"/><line x1="48" y1="62" x2="342" y2="62" stroke="${l.primary}" stroke-width="1.6"/>
${[...Array(7)].map((_, i) => `<line x1="14" y1="${80 + i * 12}" x2="226" y2="${80 + i * 12}" stroke="${l.grid}" stroke-width="0.6"/>`).join('')}
${bars}<polyline points="31,128 65,112 99,104 133,86 167,82 201,72" fill="none" stroke="${l.critical}" stroke-width="2"/><line x1="14" y1="90" x2="226" y2="90" stroke="${l.ok}" stroke-width="1.6" stroke-dasharray="5 3"/>
<text x="240" y="92" font-size="10" fill="${l.ok}">${S.budget}</text><text x="240" y="108" font-size="10" fill="${l.critical}">${S.critical}</text><text x="240" y="124" font-size="10" fill="${l.muted}">${S.bars}</text>
<path d="M340 140 l7 -7 l7 7 l-7 7 z" fill="${l.accent}" stroke="${L.shade(l.accent, -0.4)}"/><text x="358" y="144" font-size="9" fill="${l.ink}">M1</text>
</svg>`;
}

export function ProjectLayout({ ws, p, dispatch, say }: { ws: Workspace; p: Project; dispatch: (a: Action) => void; say: (t: string) => void }) {
  const l = L.layoutOf(p);
  const warns = L.contrastWarnings(l);
  const { tell, m } = useFieldMsg(say);
  const set = (k: string, v: unknown, said: string) => {
    dispatch({ type: 'layoutEdit', id: p.id, patch: { [k]: v } });
    tell(k, said);
  };
  const others = projectsOf(ws).filter((x) => x.id !== p.id && x.layout);
  const restoreAll = (before: Project['layout']) => () => dispatch({ type: 'layoutEdit', id: p.id, patch: before ? { ...Object.fromEntries(Object.keys({ ...L.REPORT_LAYOUT }).map((k) => [k, null])), ...before } : 'reset' });
  const fig = figureSvg(ws, p.id, 'goalTree') || figureSvg(ws, p.id, 'org');
  const own = Fk.figToneCount(p);
  const saved = ws.layoutTemplates ?? [];
  const previewProject = { ...p, layout: p.layout };
  return (
    <div className="lay">
      <p className="lc__muted">{T.lead}</p>
      <div className="lay__bar">
        <label className="lay__field">
          <span className="fbq__label">{T.name}</span>
          <input
            key={l.name}
            defaultValue={l.name}
            maxLength={60}
            title={T.nameHint}
            onBlur={(e) => e.target.value.trim() !== l.name && set('name', e.target.value.trim() || null, T.saved(T.name))}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          />
          {m('name')}
        </label>
        {(others.length > 0 || saved.length > 0) && (
          <label className="lay__field">
            <span className="fbq__label">{T.from}</span>
            <select
              value=""
              title={T.fromHint}
              onChange={(e) => {
                const [kind, sid] = [e.target.value.slice(0, 2), e.target.value.slice(2)];
                const before = p.layout;
                if (kind === 't:') {
                  const t = saved.find((x) => x.id === sid);
                  if (!t) return;
                  dispatch({ type: 'layoutTemplate', op: 'apply', pid: p.id, id: t.id });
                  return tell('from', T.fromDone(t.name), restoreAll(before));
                }
                const src = others.find((x) => x.id === sid);
                if (!src) return;
                dispatch({ type: 'layoutEdit', id: p.id, patch: 'reset' });
                dispatch({ type: 'layoutEdit', id: p.id, patch: { ...src.layout } });
                tell('from', T.fromDone(src.name), restoreAll(before));
              }}
            >
              <option value="">{T.fromNone}</option>
              {saved.length > 0 && (
                <optgroup label={T.savedGroup}>
                  {saved.map((t) => (
                    <option key={t.id} value={`t:${t.id}`}>{t.name}</option>
                  ))}
                </optgroup>
              )}
              {others.length > 0 && (
                <optgroup label={T.projectsGroup}>
                  {others.map((x) => (
                    <option key={x.id} value={`p:${x.id}`}>
                      {x.name} – {L.layoutOf(x).name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            {m('from')}
          </label>
        )}
        <span className="lay__field">
          <button
            type="button"
            disabled={!p.layout}
            title={p.layout ? T.saveHint(l.name) : T.saveNone}
            onClick={() => {
              const id = `lt-${Date.now().toString(36)}`;
              const replaced = saved.find((t) => t.name.toLowerCase() === l.name.toLowerCase());
              dispatch({ type: 'layoutTemplate', op: 'save', pid: p.id, id });
              tell(
                'save',
                replaced ? T.saveReplaced(l.name) : T.saveDone(l.name),
                replaced
                  ? () => dispatch({ type: 'layoutTemplate', op: 'restore', t: replaced, index: saved.indexOf(replaced) })
                  : () => dispatch({ type: 'layoutTemplate', op: 'remove', id }),
              );
            }}
          >
            {T.save}
          </button>
          {m('save')}
        </span>
        <span className="lay__field">
          <button
            type="button"
            disabled={!p.layout}
            onClick={() => {
              const before = p.layout;
              dispatch({ type: 'layoutEdit', id: p.id, patch: 'reset' });
              tell('reset', T.resetDone, restoreAll(before));
            }}
          >
            {T.reset}
          </button>
          {m('reset')}
        </span>
      </div>
      <div className="lay__cols">
        <div className="lay__rules">
          {GROUPS.map(([g, keys]) => (
            <fieldset key={g} className="lay__group">
              <legend>{T.groups[g]}</legend>
              {g === 'print' && <p className="lc__muted">{T.printHint}</p>}
              {keys.map((k) => {
                const reset = () => set(k, null, T.back(T.rules[k] ?? T.gradient));
                if (isColor(k))
                  return (
                    <ColorRule key={`${k}-${l[k]}`} k={k} value={l[k]} differs={l[k] !== L.REPORT_LAYOUT[k]} warn={warns.find((w) => w.rule === k)} onSet={(v) => set(k, v, T.saved(T.rules[k]))} onReset={reset} msg={m(k)} />
                  );
                if (isSize(k)) return <SizeRule key={`${k}-${l[k]}`} k={k} value={l[k]} onSet={(v) => set(k, v === L.REPORT_LAYOUT[k] ? null : v, T.saved(T.rules[k]))} onReset={reset} msg={m(k)} />;
                if (isFlag(k))
                  return <FlagRule key={k} k={k} value={l[k]} hint={k === 'gradient' ? T.gradientHint : undefined} onSet={(v) => set(k, v === L.REPORT_LAYOUT[k] ? null : v, T.saved(k === 'gradient' ? T.gradient : T.rules[k]))} msg={m(k)} />;
                const grid = k === 'tableGrid';
                return (
                  <WheelRule key={k} k={k} value={l[k]} options={grid ? T.grids : T.fonts} hints={grid ? T.gridsHint : T.fontsHint}
                    onSet={(v) => set(k, v === L.REPORT_LAYOUT[k] ? null : v, T.saved(`${T.rules[k]}: ${(grid ? T.grids : T.fonts)[v]}`))} onReset={reset} msg={m(k)} />
                );
              })}
              {g === 'text' && <p className="lc__muted">{T.sizeNote}</p>}
            </fieldset>
          ))}
          {saved.length > 0 && (
            <fieldset className="lay__group">
              <legend>{T.savedGroup}</legend>
              <ul className="lay__saved">
                {saved.map((t, i) => (
                  <li key={t.id}>
                    <span>{t.name}</span>
                    <button
                      type="button"
                      className="fmedia__x"
                      aria-label={T.savedRemove(t.name)}
                      title={T.savedRemove(t.name)}
                      onClick={() => {
                        dispatch({ type: 'layoutTemplate', op: 'remove', id: t.id });
                        tell('saved', T.savedRemoved(t.name), () => dispatch({ type: 'layoutTemplate', op: 'restore', t, index: i }));
                      }}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
              {m('saved')}
            </fieldset>
          )}
          <fieldset className="lay__group">
            <legend>{T.ownHead}</legend>
            <p className="lc__muted">{own ? T.own(own) : T.ownNone}</p>
            {own > 0 && (
              <span className="lay__field">
                <button
                  type="button"
                  onClick={() => {
                    const before = p.figTone;
                    dispatch({ type: 'form', op: { op: 'figToneReset', pid: p.id, at: Date.now() } });
                    tell('own', T.ownResetDone, () => dispatch({ type: 'form', op: { op: 'figToneAll', pid: p.id, tones: before, at: Date.now() } }));
                  }}
                >
                  {T.ownReset}
                </button>
                {m('own')}
              </span>
            )}
          </fieldset>
        </div>
        <section className="lay__preview" aria-label={T.preview}>
          <h4>{T.preview}</h4>
          <p className="lc__muted">{T.previewHint}</p>
          <article className="paper paper--form lay__paper" style={paperZoom('75', previewProject)} aria-hidden="true">
            <header className="paper__head">
              <span className="paper__chapter">{T.sample.chapter}</span>
              <span className="paper__project">{p.name}</span>
            </header>
            <h2 className="paper__h">{T.sample.heading}</h2>
            <table className="paper__table">
              <colgroup>
                <col className="paper__colL" />
                <col />
              </colgroup>
              <tbody>
                <tr>
                  <th scope="row">{T.sample.label}</th>
                  <td className="is-strong">{p.charter?.no || T.sample.value}</td>
                </tr>
                <tr>
                  <th scope="row">{T.rules.muted}</th>
                  <td><span className="paper__calc">gerechnet aus Start und Ende</span></td>
                </tr>
              </tbody>
            </table>
            <table className="pjf__table">
              <thead>
                <tr>
                  <th scope="col">{T.sample.colCode}</th>
                  <th scope="col">{T.sample.colGoal}</th>
                  <th scope="col">{T.sample.colLevel}</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>L1</td><td>{T.sample.goal1}</td><td>MUSS</td></tr>
                <tr><td>L2</td><td>{T.sample.goal2}</td><td>SOLL</td></tr>
              </tbody>
            </table>
            <div className="lay__svg" dangerouslySetInnerHTML={{ __html: sampleSvg(l) }} />
          </article>
          <h4>{T.figure}</h4>
          {fig ? <div className="lay__svg lay__fig" aria-hidden="true" dangerouslySetInnerHTML={{ __html: fig }} /> : <p className="lc__muted">{T.noFigure}</p>}
        </section>
      </div>
    </div>
  );
}
