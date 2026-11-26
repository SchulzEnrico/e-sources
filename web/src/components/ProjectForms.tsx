/**
 * F-226 (V109, G1–G4, Doc „F-226 V108 – Projektformulare nach GPM“): Projekt-Modus › Rad „Ansicht“ › „Formulare“.
 * Formular-Baukasten mit mitgelieferter Vorlage „GPM Level D“: Kapitel-Rad in Leitfaden-Reihenfolge, je Formular
 * eine Tabelle (Zeilen) oder Feldliste (Steckbrief). Eingabe = Ausgabe: jede Zelle schreibt direkt in das Objekt
 * dahinter (Projekt, Ziel, Stakeholder, Risiko, Vorgang, Person …). Eigene Felder, Spalten ein/aus, Vorlage
 * speichern über „Felder“. Pflichtfelder nach GPM sind markiert, „n Pflichtfelder offen“ zeigt die Lücken.
 * Tastatur (NF-03): Tab durch die Felder, Enter übernimmt, Esc verwirft, Alt+↑/↓ verschiebt die Zeile.
 * Meldungen am Ort (F-214). Logik in workspace/formKit.ts und gpm.ts.
 */
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { FormDef, FormFieldType, Project, Workspace } from '../workspace/types';
import * as Fk from '../workspace/formKit';
import * as Ps from '../workspace/persons';
import { newId } from '../workspace/workspace';
import { FORMS_TEXT as T, PSP_TEXT } from '../workspace/terms';
import { ModeWheel } from './ModeWheel';
import { Icon } from './Icon';
import { WorkPadButton } from './WorkPadOpen';
import { requestTour, tourAutoStart } from '../workspace/tour';

const FORM_KEY = 'esource.formChapter.v1';
const loadForm = (): string => {
  try {
    return localStorage.getItem(FORM_KEY) ?? 'charter';
  } catch {
    return 'charter';
  }
};
/** „12.500,50 €“ → 12500.5; leer = ''; Unsinn = undefined */
const parseNum = (v: string): number | '' | undefined => {
  if (!v.trim()) return '';
  const x = Number(v.replace(/\./g, '').replace(',', '.').replace(/[€%\s]/g, '').replace('−', '-'));
  return Number.isFinite(x) ? x : undefined;
};
const fmtNum = (v: Fk.CellValue, kind: Fk.FieldKind): string => {
  if (typeof v !== 'number') return v === undefined ? '' : String(v);
  return kind === 'money' ? v.toLocaleString('de-DE', { maximumFractionDigits: 2 }) : String(v).replace('.', ',');
};
const dmy = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}` : d);

export function ProjectForms({ ws, p, dispatch, say, inPad }: { ws: Workspace; p: Project; dispatch: (a: Action) => void; say: (t: string) => void; inPad?: boolean }) {
  const tpl = Fk.templateOf(ws, p);
  const [fid, setFidState] = useState(loadForm);
  const form = tpl.forms.find((f) => f.id === fid) ?? tpl.forms[0];
  const [msg, setMsg] = useState<{ text: string; undo?: () => void } | null>(null);
  const [panel, setPanel] = useState(false);
  const [useTask, setUseTask] = useState('');
  const [usePerson, setUsePerson] = useState('');
  const body = useRef<HTMLDivElement>(null);
  const by = ws.profile?.name || undefined;
  const base = inPad ? 'pjf-pad' : 'pjf';
  const tell = (text: string, undo?: () => void) => (setMsg({ text, ...(undo ? { undo } : {}) }), say(text));
  const run = (op: Fk.FormOp) => dispatch({ type: 'form', op });

  useEffect(() => setMsg(null), [form.id, p.id]);
  // V110: Tour „Formulare“ startet einmal von selbst, wenn man die Formulare zum ersten Mal öffnet
  useEffect(() => {
    if (!tourAutoStart('forms')) return;
    const t = window.setTimeout(() => requestTour('forms', true), 700);
    return () => window.clearTimeout(t);
  }, []);

  const setFid = (id: string) => {
    setFidState(id);
    try {
      localStorage.setItem(FORM_KEY, id);
    } catch {
      /* ohne Speicher: bis zum Neuladen */
    }
    const f = tpl.forms.find((x) => x.id === id);
    if (f) say(`${T.chapter} ${f.chapter} ${f.name}`);
  };

  const cols = Fk.columnsOf(p, form);
  const rows = Fk.rowsOf(ws, p.id, form);
  const missing = Fk.missingOf(ws, p.id, form);
  const miss = new Set(missing.flatMap((m) => m.keys.map((k) => `${m.row}|${k}`)));
  const openCount = missing.reduce((s, m) => s + m.keys.length, 0);
  const labelCol = cols.find((c) => !c.readonly && (c.kind === 'text' || c.kind === 'long')) ?? cols[0];
  const rowLabel = (rowId: string, i: number) => {
    const v = labelCol ? Fk.cellValue(ws, p.id, form, rowId, labelCol.key) : undefined;
    return typeof v === 'string' && v.trim() ? v.trim().split('\n')[0].slice(0, 60) : String(i + 1);
  };
  const focusRow = (id: string) =>
    window.setTimeout(() => body.current?.querySelector<HTMLElement>(`[data-row="${CSS.escape(id)}"] input:not([type=checkbox]), [data-row="${CSS.escape(id)}"] textarea, [data-row="${CSS.escape(id)}"] select`)?.focus(), 0);

  const add = (init?: { task?: string; person?: string }) => {
    const at = Date.now();
    const id = newId();
    const r = Fk.addRow(ws, p.id, form, { id, now: at, by, init });
    if (!r) {
      tell(form.source === 'conflicts' ? T.conflictsNone : T.usesNone);
      return;
    }
    run({ op: 'add', pid: p.id, form, id, at, by, init });
    tell(T.added, () => run({ op: 'remove', pid: p.id, form, row: r.id, at: Date.now() }));
    focusRow(r.id);
  };
  const remove = (rowId: string, i: number) => {
    const at = Date.now();
    const r = Fk.removeRow(ws, p.id, form, rowId, at);
    if (!r) return;
    run({ op: 'remove', pid: p.id, form, row: rowId, at });
    tell(T.removed(rowLabel(rowId, i)), () => run({ op: 'undoRow', undo: r.undo, at: Date.now() }));
  };
  const move = (rowId: string, by1: number) => {
    run({ op: 'move', pid: p.id, form, row: rowId, by: by1, at: Date.now() });
    say(T.moved);
    focusRow(rowId);
  };
  const rowKey = (e: KeyboardEvent, rowId: string) => {
    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') || !Fk.canMoveRow(form)) return;
    e.preventDefault();
    move(rowId, e.key === 'ArrowUp' ? -1 : 1);
  };
  const setValue = (rowId: string, key: string, value: Fk.CellValue) => run({ op: 'cell', pid: p.id, form, row: rowId, key, value, at: Date.now(), by });

  const templates = Fk.templatesOf(ws);
  const tasks = Fk.rowsOf(ws, p.id, Fk.GPM_D.forms.find((f) => f.id === 'tasks')!);
  const persons = Ps.personList(ws);

  return (
    <section className="dc pjs pjf" aria-labelledby={`${base}-head`}>
      <header className="dc__top">
        <h4 id={`${base}-head`} className="dc__head">{T.head(p.name)}</h4>
        <span className="layouts__label pj__wheel pjf__chapter">
          <span aria-hidden="true">{T.chapter}</span>
          <ModeWheel
            label={T.chapter}
            value={form.id}
            onChange={setFid}
            wrap
            options={tpl.forms.map((f) => ({ id: f.id, name: `${f.chapter} ${f.name}`, hint: [f.icb ? `ICB4 ${f.icb}` : '', f.stage ? `Stufe ${f.stage}` : ''].filter(Boolean).join(' · ') }))}
          />
        </span>
        {templates.length > 1 && (
          <span className="layouts__label pj__wheel">
            <span aria-hidden="true">{T.template}</span>
            <ModeWheel
              label={T.template}
              value={tpl.id}
              onChange={(id) => (run({ op: 'template', pid: p.id, template: id, at: Date.now() }), tell(T.templateSet(templates.find((t) => t.id === id)?.name ?? '')))}
              options={templates.map((t) => ({ id: t.id, name: t.name, hint: T.templateHint }))}
            />
          </span>
        )}
        {Fk.canAddRow(form) && form.source !== 'uses' && (
          <button type="button" className="help__run pjf__addrow" title={T.addRowHint} onClick={() => add()}>
            <Icon name="plus" size={13} className="icon icon--inline" /> {T.addRow}
          </button>
        )}
        <button type="button" className="help__run pjf__fieldsbtn" aria-expanded={panel} aria-controls={`${base}-fields`} title={T.fieldsHint} onClick={() => setPanel(!panel)}>
          {T.fields}
        </button>
        <span className={`pjf__open${openCount ? ' is-open' : ''}`} title={T.openHint}>
          {openCount ? T.open(openCount) : T.allSet}
        </span>
        {!inPad && <WorkPadButton tab="forms" project={p.id} />}
        <button type="button" className="help__run pjf__tour" title={T.tourHint} aria-label={T.tourHint} onClick={() => requestTour('forms')}>
          <Icon name="tour" size={13} className="icon icon--inline" /> {T.tour}
        </button>
      </header>
      <p className="help__text dc__why">
        {form.chapter} {form.name}
        {form.icb ? ` · ICB4 ${form.icb}` : ''} – {PSP_TEXT.viewHint.forms}. <span className="pjf__keys">{T.keysHint}</span>
      </p>
      {msg && (
        <p className="sheet__msg dc__msg" role="status">
          {msg.text}
          {msg.undo && <button type="button" className="note__undo" onClick={() => (msg.undo!(), setMsg(null), say(T.undone))}>{T.undo}</button>}
        </p>
      )}
      {panel && <FieldsPanel id={`${base}-fields`} ws={ws} p={p} form={form} run={run} tell={tell} onClose={() => setPanel(false)} />}
      {form.source === 'uses' && (
        <form className="dc__new" aria-label={T.addRowHint} onSubmit={(e) => (e.preventDefault(), useTask && usePerson && add({ task: useTask, person: usePerson }))}>
          <label>
            <span className="fbq__label">{T.usesTask}</span>
            <select value={useTask} onChange={(e) => setUseTask(e.target.value)}>
              <option value="">{T.none}</option>
              {tasks.map((t, i) => (
                <option key={t.id} value={t.id}>{String(Fk.cellValue(ws, p.id, Fk.GPM_D.forms.find((f) => f.id === 'tasks')!, t.id, 'code') ?? '')} {String(Fk.cellValue(ws, p.id, Fk.GPM_D.forms.find((f) => f.id === 'tasks')!, t.id, 'title') ?? i + 1)}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="fbq__label">{T.usesPerson}</span>
            <select value={usePerson} onChange={(e) => setUsePerson(e.target.value)}>
              <option value="">{T.none}</option>
              {persons.map((x) => (
                <option key={x.id} value={x.id}>{x.name}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="fbq__save" disabled={!useTask || !usePerson}>{T.usesAdd}</button>
        </form>
      )}
      <div ref={body} className="pjf__body">
        {form.layout === 'fields' ? (
          <div className="pjf__fields" data-row={rows[0]?.id}>
            {cols.map((c) => (
              <label key={c.key} className={`pjf__field${c.kind === 'long' || c.kind === 'lines' ? ' is-wide' : ''}`}>
                <span className="fbq__label">
                  {c.label}
                  {c.required && <span className="pjf__req" title={T.required} aria-label={T.required}>*</span>}
                </span>
                <Cell ws={ws} p={p} form={form} rowId={rows[0]?.id ?? p.id} col={c} miss={miss.has(`${rows[0]?.id}|${c.key}`)} label={c.label} onSet={setValue} />
                {c.help && <span className="pjf__help">{c.help}</span>}
              </label>
            ))}
          </div>
        ) : !rows.length ? (
          <p className="lc__muted">{form.source === 'persons' ? T.personsNone : form.source === 'conflicts' && (p.goals?.length ?? 0) < 2 ? T.conflictsNone : T.empty}</p>
        ) : (
          <div className="pjs__left">
            <table className="pc__table pjf__table" aria-labelledby={`${base}-head`}>
              <thead>
                <tr>
                  {cols.map((c) => (
                    <th key={c.key} scope="col" title={c.help}>
                      {c.label}
                      {c.required && <span className="pjf__req" aria-label={T.required}>*</span>}
                    </th>
                  ))}
                  <th scope="col"><span className="sr-only">{T.rowMenu('')}</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const lbl = rowLabel(r.id, i);
                  return (
                    <tr key={r.id} data-row={r.id} onKeyDown={(e) => rowKey(e, r.id)}>
                      {cols.map((c, j) => (
                        <td key={c.key} className={`pjf__cell is-${c.kind}${miss.has(`${r.id}|${c.key}`) ? ' is-miss' : ''}`} style={j === cols.indexOf(labelCol!) && r.depth ? { paddingLeft: `${8 + r.depth * 14}px` } : undefined}>
                          <Cell ws={ws} p={p} form={form} rowId={r.id} col={c} miss={miss.has(`${r.id}|${c.key}`)} label={`${c.label} – ${lbl}`} onSet={setValue} />
                        </td>
                      ))}
                      <td className="pjf__acts">
                        {Fk.canMoveRow(form) && (
                          <>
                            <button type="button" className="remind__x" aria-label={`${T.up}: ${lbl}`} title={T.up} disabled={i === 0} onClick={() => move(r.id, -1)}>
                              <Icon name="chevronUp" size={12} />
                            </button>
                            <button type="button" className="remind__x" aria-label={`${T.down}: ${lbl}`} title={T.down} disabled={i === rows.length - 1} onClick={() => move(r.id, 1)}>
                              <Icon name="chevronDown" size={12} />
                            </button>
                          </>
                        )}
                        {form.source !== 'persons' && (
                          <button type="button" className="remind__x" aria-label={`${T.remove}: ${lbl}`} title={T.remove} onClick={() => remove(r.id, i)}>
                            <Icon name="trash" size={12} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

/** Eine Zelle: Eingabe je nach Art; übernimmt bei Enter bzw. beim Verlassen, Esc verwirft. */
function Cell({ ws, p, form, rowId, col, miss, label, onSet }: { ws: Workspace; p: Project; form: FormDef; rowId: string; col: Fk.FormCol; miss: boolean; label: string; onSet: (row: string, key: string, v: Fk.CellValue) => void }) {
  const v = Fk.cellValue(ws, p.id, form, rowId, col.key);
  const auto = Fk.cellAuto(ws, p.id, form, rowId, col.key);
  const shown = col.kind === 'date' ? (typeof v === 'string' ? v : '') : fmtNum(v, col.kind);
  const [draft, setDraft] = useState<string | null>(null);
  const val = draft ?? shown;
  const commit = () => {
    if (draft === null) return;
    setDraft(null);
    if (draft === shown) return;
    if (col.kind === 'number' || col.kind === 'money' || col.kind === 'pct') {
      const n = parseNum(draft);
      if (n === undefined) return;
      onSet(rowId, col.key, n);
    } else onSet(rowId, col.key, draft);
  };
  const keys = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Escape' && draft !== null) {
      e.preventDefault();
      e.stopPropagation();
      setDraft(null);
    } else if (e.key === 'Enter' && (e.currentTarget.tagName === 'INPUT' || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      commit();
    }
  };
  const common = { 'aria-label': label, 'aria-invalid': miss || undefined, 'aria-required': col.required || undefined } as const;
  if (col.readonly) {
    const text = v === undefined || v === '' ? T.none : col.kind === 'money' ? `${fmtNum(v, 'money')} €` : String(v);
    return <span className="pjf__ro" aria-label={`${label}: ${text}`}>{text}</span>;
  }
  if (col.kind === 'bool')
    return <input type="checkbox" {...common} checked={v === true} onChange={(e) => onSet(rowId, col.key, e.target.checked)} />;
  if (col.kind === 'choice' || col.kind === 'person' || col.kind === 'goal' || col.kind === 'phase') {
    const options =
      col.kind === 'choice'
        ? (col.options ?? [])
        : col.kind === 'person'
          ? Ps.personList(ws).map((x) => ({ v: x.id, label: x.name }))
          : col.kind === 'goal'
            ? (p.goals ?? []).filter((g) => g.id !== rowId).map((g) => ({ v: g.id, label: `${g.code ? `${g.code} ` : ''}${g.text.split('\n')[0].slice(0, 50)}` }))
            : (p.phases ?? []).map((x) => ({ v: x.id, label: x.name }));
    const cur = typeof v === 'string' ? v : '';
    return (
      <select {...common} value={cur} onChange={(e) => onSet(rowId, col.key, e.target.value)}>
        <option value="">{T.none}</option>
        {cur && !options.some((o) => o.v === cur) && <option value={cur}>{cur}</option>}
        {options.map((o) => (
          <option key={o.v} value={o.v}>{o.label}</option>
        ))}
      </select>
    );
  }
  if (col.kind === 'long' || col.kind === 'lines')
    return <textarea {...common} rows={form.layout === 'fields' ? 3 : 2} value={val} maxLength={2000} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={keys} />;
  return (
    <span className="pjf__in">
      <input
        {...common}
        type={col.kind === 'date' ? 'date' : 'text'}
        inputMode={col.kind === 'number' || col.kind === 'money' || col.kind === 'pct' ? 'decimal' : undefined}
        value={val}
        maxLength={col.kind === 'text' ? 300 : 30}
        title={col.kind === 'date' && typeof v === 'string' ? dmy(v) : undefined}
        onChange={(e) => (col.kind === 'date' ? onSet(rowId, col.key, e.target.value) : setDraft(e.target.value))}
        onBlur={commit}
        onKeyDown={keys}
      />
      {auto && <span className="pjf__auto" title={T.autoHint[col.key] ?? T.auto}>{T.auto}</span>}
    </span>
  );
}

const FIELD_TYPES: FormFieldType[] = ['text', 'number', 'date', 'choice', 'bool', 'person'];

/** „Felder“: Spalten zeigen/ausblenden, eigene Felder anlegen/löschen, Vorlage speichern bzw. löschen. */
function FieldsPanel({ id, ws, p, form, run, tell, onClose }: { id: string; ws: Workspace; p: Project; form: FormDef; run: (o: Fk.FormOp) => void; tell: (t: string, undo?: () => void) => void; onClose: () => void }) {
  const all = Fk.columnsOf(p, form, true);
  const hidden = new Set(p.forms?.hidden?.[form.id] ?? []);
  const own = p.forms?.extra?.[form.id] ?? [];
  const [name, setName] = useState('');
  const [type, setType] = useState<FormFieldType>('text');
  const [options, setOptions] = useState('');
  const [req, setReq] = useState(false);
  const [tname, setTname] = useState('');
  const taken = !!name.trim() && all.some((c) => c.label.toLowerCase() === name.trim().toLowerCase());
  const ttaken = !!tname.trim() && Fk.templatesOf(ws).some((t) => t.name.toLowerCase() === tname.trim().toLowerCase());
  const addField = () => {
    const n = name.trim();
    if (!n || taken) return;
    run({ op: 'addField', pid: p.id, form: form.id, def: { id: newId(), name: n, type, ...(type === 'choice' ? { options: options.split(',') } : {}), ...(req ? { required: true } : {}) }, at: Date.now() });
    tell(T.fieldAdded(n));
    setName('');
    setOptions('');
    setReq(false);
  };
  const removeField = (fid: string, n: string) => {
    const r = Fk.removeField(ws, p.id, form.id, fid);
    if (!r) return;
    run({ op: 'removeField', pid: p.id, form: form.id, field: fid, at: Date.now() });
    tell(T.fieldRemoved(n), () => run({ op: 'undoField', undo: r.undo, at: Date.now() }));
  };
  const saveTpl = () => {
    const n = tname.trim();
    if (!n || ttaken) return;
    run({ op: 'saveTemplate', pid: p.id, name: n, id: newId(), at: Date.now() });
    tell(T.templateSaved(n));
    setTname('');
  };
  const removeTpl = (tid: string, n: string) => {
    const r = Fk.removeTemplate(ws, tid);
    if (!r) return;
    run({ op: 'removeTemplate', id: tid });
    tell(T.templateRemoved(n), () => run({ op: 'undoTemplate', ...r.undo, at: Date.now() }));
  };
  return (
    <div id={id} className="pjf__panel" role="group" aria-label={T.fieldsHead} onKeyDown={(e) => e.key === 'Escape' && (e.stopPropagation(), onClose())}>
      <fieldset>
        <legend>{T.colsShow}</legend>
        {all.map((c) => {
          const locked = !!c.required && !c.custom;
          return (
            <label key={c.key} className="pjf__check" title={locked ? T.colLocked : c.help}>
              <input type="checkbox" checked={!hidden.has(c.key)} disabled={locked} onChange={(e) => run({ op: 'hide', pid: p.id, form, key: c.key, hidden: !e.target.checked, at: Date.now() })} /> {c.label}
            </label>
          );
        })}
      </fieldset>
      <fieldset>
        <legend>{T.ownFields}</legend>
        {!own.length && <p className="lc__muted">{T.ownNone}</p>}
        <ul className="pjf__own">
          {own.map((f) => (
            <li key={f.id}>
              {f.name} <span className="lc__muted">({T.fieldTypes[f.type]}{f.required ? `, ${T.fieldRequired}` : ''})</span>
              <button type="button" className="remind__x" aria-label={T.fieldRemove(f.name)} title={T.fieldRemove(f.name)} onClick={() => removeField(f.id, f.name)}>
                <Icon name="trash" size={12} />
              </button>
            </li>
          ))}
        </ul>
        <form className="dc__new" onSubmit={(e) => (e.preventDefault(), addField())}>
          <label>
            <span className="fbq__label">{T.fieldName}</span>
            <input type="text" value={name} maxLength={60} aria-invalid={taken || undefined} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            <span className="fbq__label">{T.fieldType}</span>
            <select value={type} onChange={(e) => setType(e.target.value as FormFieldType)}>
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>{T.fieldTypes[t]}</option>
              ))}
            </select>
          </label>
          {type === 'choice' && (
            <label>
              <span className="fbq__label">{T.fieldOptions}</span>
              <input type="text" value={options} maxLength={400} onChange={(e) => setOptions(e.target.value)} />
            </label>
          )}
          <label className="pjf__check">
            <input type="checkbox" checked={req} onChange={(e) => setReq(e.target.checked)} /> {T.fieldRequired}
          </label>
          <button type="submit" className="fbq__save" disabled={!name.trim() || taken || (type === 'choice' && !options.split(',').some((o) => o.trim()))}>{T.fieldAdd}</button>
          {taken && <span className="pjf__warn" role="status">{T.fieldTaken}</span>}
        </form>
      </fieldset>
      <fieldset>
        <legend>{T.saveTemplate}</legend>
        <p className="help__text">{T.saveTemplateHint}</p>
        <form className="dc__new" onSubmit={(e) => (e.preventDefault(), saveTpl())}>
          <label>
            <span className="fbq__label">{T.templateName}</span>
            <input type="text" value={tname} maxLength={60} aria-invalid={ttaken || undefined} onChange={(e) => setTname(e.target.value)} />
          </label>
          <button type="submit" className="fbq__save" disabled={!tname.trim() || ttaken}>{T.saveTemplate}</button>
          {ttaken && <span className="pjf__warn" role="status">{T.templateTaken}</span>}
        </form>
        <ul className="pjf__own">
          {(ws.formTemplates ?? []).map((t) => (
            <li key={t.id}>
              {t.name}
              <button type="button" className="remind__x" aria-label={T.templateRemove(t.name)} title={T.templateRemove(t.name)} onClick={() => removeTpl(t.id, t.name)}>
                <Icon name="trash" size={12} />
              </button>
            </li>
          ))}
        </ul>
      </fieldset>
      <button type="button" className="help__run" onClick={onClose}>{T.close}</button>
    </div>
  );
}
