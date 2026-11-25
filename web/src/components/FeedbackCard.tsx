/**
 * F-221 Bau 3 (V103, FB3/FB7/FB9/FB11, NF-08): Feedback „Ausarbeiten“ – Kartenfenster wie die Kanban-Karte
 * (S1, Trello): mittig, Hintergrund abgedunkelt, Esc/✕/Klick daneben schließt. Problemstellung nach Enricos
 * Vorlage in Gruppen (Anlass & Kontext · Lösungsansatz · Relevanz · Hypothesen · Bezüge · Bilder · Vermerke),
 * je Art nur die passenden Felder vorn („Alle Felder zeigen“), „Noch offen: …“ springt zum Feld.
 * Felder speichern beim Verlassen (und beim Schließen), „Gespeichert.“ steht am Feld (F-214).
 * Native <dialog> (Fokus bleibt drin, NF-03), vollständig per Tastatur bedienbar.
 */
import { type ClipboardEvent, type Dispatch, useEffect, useRef, useState } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { Feedback, FeedbackFieldDef, FeedbackKind, FeedbackSeverity, FeedbackState, Workspace } from '../workspace/types';
import * as Fb from '../workspace/feedback';
import * as Ps from '../workspace/persons';
import * as Pj from '../workspace/projects';
import { getPic, putPic, shrinkImage } from '../workspace/imageStore';
import { newId } from '../workspace/workspace';
import { FEEDBACK_CARD_TEXT as C, FEEDBACK_TEXT as T, PROJECT_FEEDBACK_TEXT as PF } from '../workspace/terms';

/** F-225 (V106): „keine Auswahl“ im Rad eines eigenen Auswahl-Felds */
const NONE = '__none';
import { ModeWheel } from './ModeWheel';
import { Icon } from './Icon';
import { placeText } from './FeedbackQuick';

type Field = Fb.FeedbackText;

/**
 * V103 (Enrico): Bezüge, Vermerke zur Weiterverarbeitung, „Behoben in“ und „Vermerk hinzufügen“ sind nur für
 * die Bearbeitung (unsere Seite) – Anwender sehen sie nicht. Schalter „Bearbeitung“ im Cockpit, je Gerät.
 */
const TRIAGE_KEY = 'esource.feedback.triage';
export function loadTriage(): boolean {
  try {
    return localStorage.getItem(TRIAGE_KEY) === '1';
  } catch {
    return false;
  }
}
export function saveTriage(on: boolean) {
  try {
    if (on) localStorage.setItem(TRIAGE_KEY, '1');
    else localStorage.removeItem(TRIAGE_KEY);
  } catch {
    /* privat/gesperrt: bleibt aus */
  }
}
type Group = keyof typeof C.groups;

/** Felder je Gruppe in der Reihenfolge der Problemstellung. */
const GROUPS: { g: Group; fields: Field[] }[] = [
  { g: 'context', fields: ['what', 'steps', 'expected', 'actual', 'affected'] },
  { g: 'solution', fields: ['goals', 'nonGoals', 'workaround'] },
  { g: 'relevance', fields: ['impact'] },
  { g: 'guess', fields: ['guess'] },
  { g: 'marks', fields: ['open', 'decision'] },
];

/** FB3: Was je Art vorn steht (der Rest unter „Alle Felder zeigen“). */
export const SHOWN: Record<FeedbackKind, readonly Field[]> = {
  bug: ['what', 'steps', 'expected', 'actual', 'affected', 'workaround', 'impact', 'guess', 'open', 'decision'],
  wish: ['what', 'affected', 'goals', 'nonGoals', 'workaround', 'impact', 'open', 'decision'],
  question: ['what', 'affected', 'guess', 'open', 'decision'],
  praise: ['what'],
};

const SEV_IDS = ['none', 'minor', 'hinders', 'blocks'] as const;
const fieldId = (id: string, k: string) => `fbc-${id}-${k}`;
const when = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString('de-DE')} ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
};
/** Spur: „new → dropped: Grund“ in Klartext */
const stateLine = (t: string) => t.replace(/\b(new|seen|planned|done|dropped)\b/g, (s) => C.states[s] ?? s);

function Thumb({ picRef, n, onRemove }: { picRef: string; n: number; onRemove: () => void }) {
  const [url, setUrl] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    let u: string | null = null;
    void getPic(picRef).then((p) => {
      if (!live) return;
      u = p ? URL.createObjectURL(p.blob) : null;
      setUrl(u);
    });
    return () => {
      live = false;
      if (u) URL.revokeObjectURL(u);
    };
  }, [picRef]);
  return (
    <li className="fbc__pic">
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" title={C.picAlt(n)}>
          <img src={url} alt={C.picAlt(n)} />
        </a>
      ) : (
        <span className="fbc__picMissing">{url === null ? C.picMissing : '…'}</span>
      )}
      <button type="button" className="fbc__picX" onClick={onRemove} aria-label={C.picRemove(n)} title={C.picRemove(n)}>
        <Icon name="close" size={11} />
      </button>
    </li>
  );
}

export function FeedbackCard(props: {
  ws: Workspace;
  dispatch: Dispatch<Action>;
  id: string;
  onClose: () => void;
  /** andere Karte öffnen (verknüpfte Meldung) */
  onOpen?: (id: string) => void;
  /** Löschen – der Aufrufer zeigt „gelöscht“ mit Rückgängig am Ort */
  onRemove?: (id: string) => void;
  /** Bearbeitung (unsere Seite): Bezüge, Vermerke, „Behoben in“; fehlt = aus Gerätespeicher */
  triage?: boolean;
}) {
  const { ws, dispatch, id } = props;
  const f = Fb.feedbackById(ws, id);
  const dlg = useRef<HTMLDialogElement>(null);
  const draft = useRef<Partial<Record<Field, string>>>({});
  const [all, setAll] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dropping, setDropping] = useState(false);
  const [dropWhy, setDropWhy] = useState('');
  const [dropMiss, setDropMiss] = useState(false);
  const [refsBad, setRefsBad] = useState('');
  const [picMsg, setPicMsg] = useState('');
  const [markKind, setMarkKind] = useState<'note' | 'decision' | 'ref'>('note');
  const [markText, setMarkText] = useState('');
  const by = ws.profile?.name || undefined;
  // V105 (F-224): ohne Befugnis „Feedback bearbeiten“ nie Bearbeitung
  const triage = (props.triage ?? loadTriage()) && Ps.canTriage(ws);
  const timer = useRef(0);

  useEffect(() => {
    const d = dlg.current;
    if (d && !d.open) d.showModal();
    d?.querySelector<HTMLElement>('.fbc__titleIn')?.focus();
    return () => window.clearTimeout(timer.current);
  }, []);
  // andere Karte (verknüpfte Meldung) im selben Fenster: Entwürfe der alten Karte sichern
  const shownId = useRef(id);
  useEffect(() => {
    if (shownId.current === id) return;
    draft.current = {};
    shownId.current = id;
    dlg.current?.querySelector<HTMLElement>('.fbc__titleIn')?.focus();
  }, [id]);

  if (!f) return null;

  const said = (k: string) => {
    setSavedAt(k);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSavedAt(null), 2200);
  };
  const edit = (patch: Fb.FeedbackPatch, k: string) => {
    dispatch({ type: 'fbEdit', id, patch });
    said(k);
  };
  const commit = (k: Field) => {
    const v = draft.current[k];
    if (v === undefined) return;
    delete draft.current[k];
    if (v.trim() === (f[k] ?? '')) return;
    edit({ [k]: v }, k);
  };
  const finish = () => {
    const patch: Fb.FeedbackPatch = {};
    for (const [k, v] of Object.entries(draft.current)) if (v !== undefined && v.trim() !== (f[k as Field] ?? '')) patch[k as Field] = v;
    draft.current = {};
    if (Object.keys(patch).length) dispatch({ type: 'fbEdit', id, patch });
    props.onClose();
  };

  // F-225 (V105, P4): Projektmeldung – Formular des Projekts (Felder aus, Pflicht)
  const proj = f.project ? Pj.projectById(ws, f.project) : undefined;
  const form = proj ? Fb.formOf(proj.feedbackForm) : undefined;
  const role = proj ? Pj.roleOf(proj, f.to) : undefined;
  const kn = (k: FeedbackKind) => (proj ? Fb.kindName(proj.feedbackForm, k) : T.kinds[k]);
  const missing = Fb.missingOf(f, form);
  const label = (k: Field | 'severity') => Fb.FILE_LABELS.field[k];
  const jump = (k: Field | 'severity') => {
    if (k !== 'severity' && !SHOWN[f.kind].includes(k)) setAll(true);
    window.setTimeout(() => document.getElementById(fieldId(id, k))?.focus(), 0);
  };
  const shown = (k: Field) => !form?.off.includes(k) && (all || SHOWN[f.kind].includes(k) || !!f[k] || !!form?.required.includes(k));

  // F-225 (V106, P4): eigene Felder des Projekts – speichern beim Verlassen bzw. sofort (Datum, Auswahl, Ja/Nein)
  const custom = proj ? Fb.customOf(proj.feedbackForm) : [];
  const missCustom = proj ? Fb.missingCustom(f, proj.feedbackForm) : [];
  const setExtra = (cid: string, v: string | number | boolean | null) => edit({ extra: { [cid]: v } }, `x-${cid}`);
  const customField = (c: FeedbackFieldDef) => {
    const v = f.extra?.[c.id];
    const fid = fieldId(id, `x-${c.id}`);
    const head = (
      <span className="fbq__label">
        {c.name}
        {c.required && <span className="fbc__req" title={PF.requiredHint}> *</span>}
        {savedAt === `x-${c.id}` && <span className="fbc__saved" role="status"> · {C.saved}</span>}
      </span>
    );
    if (c.type === 'bool')
      return (
        <label key={`${id}-${c.id}`} className="fbc__field fbc__bool">
          <input id={fid} type="checkbox" checked={v === true} onChange={(e) => setExtra(c.id, e.target.checked ? true : null)} />
          {head}
        </label>
      );
    if (c.type === 'choice')
      return (
        <div key={`${id}-${c.id}`} className="fbc__field">
          {head}
          <span id={fid} tabIndex={-1}>
            <ModeWheel
              label={c.name}
              options={[{ id: NONE, name: PF.choiceNone }, ...(c.options ?? []).map((o) => ({ id: o, name: o }))]}
              value={typeof v === 'string' && c.options?.includes(v) ? v : NONE}
              onChange={(o) => setExtra(c.id, o === NONE ? null : o)}
            />
          </span>
        </div>
      );
    if (c.type === 'date')
      return (
        <label key={`${id}-${c.id}`} className="fbc__field">
          {head}
          <input id={fid} type="date" defaultValue={typeof v === 'string' ? v : ''} onBlur={(e) => e.target.value !== (v ?? '') && setExtra(c.id, e.target.value || null)} />
        </label>
      );
    if (c.type === 'number')
      return (
        <label key={`${id}-${c.id}`} className="fbc__field">
          {head}
          <input
            id={fid}
            type="number"
            inputMode="decimal"
            defaultValue={typeof v === 'number' ? String(v) : ''}
            onBlur={(e) => {
              const t = e.target.value.trim();
              const n = t === '' ? null : Number(t.replace(',', '.'));
              if (n !== null && !Number.isFinite(n)) return;
              if (n !== (v ?? null)) setExtra(c.id, n);
            }}
          />
        </label>
      );
    return (
      <label key={`${id}-${c.id}`} className="fbc__field">
        {head}
        <textarea
          id={fid}
          rows={2}
          maxLength={2000}
          defaultValue={typeof v === 'string' ? v : ''}
          onBlur={(e) => e.target.value.trim() !== (v ?? '') && setExtra(c.id, e.target.value.trim() || null)}
        />
      </label>
    );
  };

  const textField = (k: Field) => {
    const long = k !== 'expected' && k !== 'actual';
    const ph = k === 'what' ? C.ph.what[f.kind] : (C.ph[k] as string);
    return (
      <label key={`${id}-${k}`} className="fbc__field">
        <span className="fbq__label">
          {label(k)}
          {savedAt === k && <span className="fbc__saved" role="status"> · {C.saved}</span>}
        </span>
        <textarea
          id={fieldId(id, k)}
          defaultValue={f[k] ?? ''}
          rows={long ? 3 : 2}
          maxLength={Fb.TEXT_MAX}
          placeholder={ph}
          onChange={(e) => (draft.current[k] = e.target.value)}
          onBlur={() => commit(k)}
        />
      </label>
    );
  };

  const setState = (s: FeedbackState) => {
    if (s === f.state) return;
    if (s === 'dropped') {
      setDropping(true);
      setDropMiss(false);
      return window.setTimeout(() => document.getElementById(`fbc-${id}-drop`)?.focus(), 0);
    }
    setDropping(false);
    dispatch({ type: 'fbState', id, state: s, by });
    said('state');
  };
  const drop = () => {
    if (!dropWhy.trim()) {
      setDropMiss(true);
      return document.getElementById(`fbc-${id}-drop`)?.focus();
    }
    dispatch({ type: 'fbState', id, state: 'dropped', why: dropWhy, by });
    setDropping(false);
    setDropWhy('');
    said('state');
  };

  const addPics = async (files: Blob[]) => {
    const have = f.pics ?? [];
    const room = Fb.PICS_MAX - have.length;
    if (room <= 0) return setPicMsg(C.picsFull(Fb.PICS_MAX));
    const refs: string[] = [];
    for (const file of files.filter((x) => x.type.startsWith('image/')).slice(0, room)) {
      const sm = await shrinkImage(file);
      if (!sm) continue;
      const pid = newId();
      if (await putPic({ id: pid, blob: sm.blob, mime: sm.mime, w: sm.w, h: sm.h, at: Date.now() })) refs.push(pid);
    }
    if (!refs.length) return setPicMsg(C.picsFailed);
    setPicMsg(files.length > room ? C.picsFull(Fb.PICS_MAX) : '');
    edit({ pics: [...have, ...refs] }, 'pics');
  };
  const onPaste = (e: ClipboardEvent) => {
    const files = [...e.clipboardData.files].filter((x) => x.type.startsWith('image/'));
    if (!files.length) return;
    e.preventDefault();
    void addPics(files);
  };

  const others = Fb.feedbackOf(ws).filter((x) => x.id !== id);
  const related = (f.related ?? []).map((r) => Fb.feedbackById(ws, r)).filter((x): x is Feedback => !!x);
  const suggest = Fb.similarFeedback(ws, f.title, id).filter((x) => !f.related?.includes(x.id));
  const link = (other: string, on: boolean) => {
    const next = on ? [...(f.related ?? []), other] : (f.related ?? []).filter((r) => r !== other);
    edit({ related: next }, 'related');
  };

  const addMark = () => {
    if (!markText.trim()) return document.getElementById(`fbc-${id}-mark`)?.focus();
    dispatch({ type: 'fbMark', id, kind: markKind, text: markText, by });
    setMarkText('');
    said('mark');
  };

  return (
    <dialog
      ref={dlg}
      className="fbc"
      aria-label={C.label(f.title)}
      aria-describedby={`fbc-${id}-intro`}
      onCancel={(e) => {
        e.preventDefault();
        finish();
      }}
      onClick={(e) => e.target === dlg.current && finish()}
      onPaste={onPaste}
      // Esc schließt nur die Karte, nicht auch das Cockpit dahinter
      onKeyDown={(e) => e.key === 'Escape' && e.stopPropagation()}
    >
      <header className="cardwin__head">
        <span className="cardwin__where">
          <Icon name="feedback" size={13} /> {C.head} · {kn(f.kind)}{proj ? ` · ${proj.name}${role ? ` › ${role.name}` : ''}` : ''}{triage ? ` · ${C.states[f.state]}` : ''}
        </span>
        <button type="button" className="cardwin__x" onClick={finish} title={C.close} aria-label={C.close}>
          <Icon name="close" size={14} />
        </button>
      </header>
      <div className="fbc__body">
        <p id={`fbc-${id}-intro`} className="fbq__intro">{C.intro}</p>
        <label className="fbc__field fbq__title">
          <span className="fbq__label">
            {C.titleLabel}
            {savedAt === 'title' && <span className="fbc__saved" role="status"> · {C.saved}</span>}
          </span>
          <input
            key={`${id}-title`}
            className="fbc__titleIn"
            type="text"
            defaultValue={f.title}
            maxLength={Fb.TITLE_MAX}
            onBlur={(e) => {
              const t = e.target.value.trim();
              if (!t) e.target.value = f.title;
              else if (t !== f.title) edit({ title: t }, 'title');
            }}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), e.currentTarget.blur())}
          />
        </label>

        <div className="fbc__wheels">
          <div className="fbc__wheel">
            <span className="fbq__label">{C.kindLabel}</span>
            <ModeWheel
              label={C.kindLabel}
              options={Fb.FEEDBACK_KINDS.map((k) => ({ id: k, name: kn(k), hint: T.kindHints[k] }))}
              value={f.kind}
              onChange={(k) => edit({ kind: k as FeedbackKind }, 'kind')}
            />
            <span className="fbq__hint">{T.kindHints[f.kind]}</span>
          </div>
          {/* V104 (Enrico): Zustand nur auf unserer Seite – mit „Bearbeitung“ */}
          {triage && <div className="fbc__wheel">
            <span className="fbq__label">
              {C.stateLabel}
              {savedAt === 'state' && <span className="fbc__saved" role="status"> · {C.saved}</span>}
            </span>
            <ModeWheel
              label={C.stateLabel}
              options={Fb.FEEDBACK_STATES.map((s) => ({ id: s, name: C.states[s], hint: C.stateHints[s] }))}
              value={dropping ? 'dropped' : f.state}
              onChange={(s) => setState(s as FeedbackState)}
            />
            <span className="fbq__hint">{C.stateHints[dropping ? 'dropped' : f.state]}</span>
          </div>}
          {/* V106 (F-225 P9): Eskalation – an eine andere Instanz des Projekts weitergeben, mit Spur */}
          {triage && proj && Pj.rolesOf(proj).length > 1 && (
            <div className="fbc__wheel">
              <span className="fbq__label">
                {PF.forward}
                {savedAt === 'to' && <span className="fbc__saved" role="status"> · {PF.forwarded(role?.name ?? '')}</span>}
              </span>
              <ModeWheel
                label={PF.forward}
                options={Pj.rolesOf(proj).map((r) => ({ id: r.id, name: r.name }))}
                value={role?.id ?? Pj.rolesOf(proj)[0].id}
                onChange={(to) => {
                  const next = Pj.roleOf(proj, to);
                  if (!next || next.id === role?.id) return;
                  dispatch({ type: 'fbTo', id, to, from: role?.name ?? PF.noRole, toName: next.name, by });
                  said('to');
                }}
              />
              <span className="fbq__hint">{PF.forwardHint}</span>
            </div>
          )}
          {f.kind !== 'praise' && (
            <div className="fbc__wheel">
              <span className="fbq__label">
                {C.sevLabel}
                {savedAt === 'severity' && <span className="fbc__saved" role="status"> · {C.saved}</span>}
              </span>
              <ModeWheel
                id={fieldId(id, 'severity')}
                label={C.sevLabel}
                options={SEV_IDS.map((s) => ({ id: s, name: s === 'none' ? C.sevNone : C.sevs[s], hint: C.sevHints[s === 'none' ? '' : s] }))}
                value={f.severity ?? 'none'}
                onChange={(s) => edit({ severity: s === 'none' ? undefined : (s as FeedbackSeverity) }, 'severity')}
              />
              <span className="fbq__hint">{C.sevHints[f.severity ?? '']}</span>
            </div>
          )}
        </div>
        {f.kind !== 'praise' && <p className="fbc__explain">{C.sevExplain}</p>}

        {triage && dropping && (
          <div className="fbc__drop" role="group" aria-label={C.dropWhy}>
            <label>
              <span className="fbq__label">{C.dropWhy}</span>
              <input
                id={`fbc-${id}-drop`}
                type="text"
                value={dropWhy}
                maxLength={500}
                placeholder={C.dropWhyPh}
                aria-invalid={dropMiss || undefined}
                onChange={(e) => (setDropWhy(e.target.value), setDropMiss(false))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.preventDefault(), drop());
                  if (e.key === 'Escape') (e.preventDefault(), e.stopPropagation(), setDropping(false));
                }}
              />
            </label>
            <button type="button" onClick={() => setDropping(false)}>{C.dropCancel}</button>
            <button type="button" className="fbq__save" onClick={drop}>{C.dropOk}</button>
            {dropMiss && <p className="fbq__miss" role="alert">{C.dropMissing}</p>}
          </div>
        )}

        <div className="fbc__missing" role="status">
          {missing.length + missCustom.length ? (
            <>
              <span>{C.missing('')}</span>
              {missing.map((k, i) => (
                <button key={k} type="button" className="fbc__jump" onClick={() => jump(k)} title={C.missingJump(label(k))}>
                  {label(k)}
                  {i < missing.length - 1 || missCustom.length ? ',' : ''}
                </button>
              ))}
              {missCustom.map((c, i) => (
                <button key={c.id} type="button" className="fbc__jump" onClick={() => document.getElementById(fieldId(id, `x-${c.id}`))?.focus()} title={C.missingJump(c.name)}>
                  {c.name}
                  {i < missCustom.length - 1 ? ',' : ''}
                </button>
              ))}
            </>
          ) : (
            <span>
              <Icon name="check" size={12} /> {C.missingNone}
            </span>
          )}
        </div>

        {GROUPS.filter((gr) => gr.g !== 'marks').map((gr) => {
          const fields = gr.fields.filter(shown);
          if (!fields.length) return null;
          return (
            <fieldset key={gr.g} className="fbc__group">
              <legend>{C.groups[gr.g]}</legend>
              {fields.map(textField)}
            </fieldset>
          );
        })}
        {custom.length > 0 && (
          <fieldset className="fbc__group fbc__custom">
            <legend>{PF.customLegend}</legend>
            {custom.map(customField)}
          </fieldset>
        )}
        <button type="button" className="fbc__all" aria-expanded={all} onClick={() => setAll(!all)}>
          {all ? C.fewFields : C.allFields}
        </button>

        {triage && (
        <fieldset className="fbc__group">
          <legend>{C.groups.refs}</legend>
          <label className="fbc__field">
            <span className="fbq__label">
              {C.refsLabel}
              {savedAt === 'refs' && <span className="fbc__saved" role="status"> · {C.saved}</span>}
            </span>
            <input
              key={`${id}-refs-${(f.refs ?? []).join()}`}
              id={fieldId(id, 'refs')}
              type="text"
              defaultValue={(f.refs ?? []).join(', ')}
              placeholder="F-206, NF-08"
              aria-describedby={`fbc-${id}-refsHint`}
              aria-invalid={refsBad ? true : undefined}
              onBlur={(e) => {
                const { refs, bad } = Fb.parseRefs(e.target.value);
                setRefsBad(bad.join(', '));
                if (refs.join() !== (f.refs ?? []).join()) edit({ refs }, 'refs');
              }}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), e.currentTarget.blur())}
            />
            <span id={`fbc-${id}-refsHint`} className="fbq__hint">{C.refsHint}</span>
          </label>
          {refsBad && <p className="fbq__miss" role="alert">{C.refsBad(refsBad)}</p>}
          <div className="fbc__field">
            <span className="fbq__label">
              {C.relatedLabel}
              {savedAt === 'related' && <span className="fbc__saved" role="status"> · {C.saved}</span>}
            </span>
            {related.length ? (
              <ul className="fbc__rel">
                {related.map((r) => (
                  <li key={r.id}>
                    {props.onOpen ? (
                      <button type="button" className="fbc__relOpen" onClick={() => (finish(), props.onOpen!(r.id))} title={C.relatedOpen(r.title)}>
                        {kn(r.kind)}: „{r.title}“
                      </button>
                    ) : (
                      <span>{kn(r.kind)}: „{r.title}“</span>
                    )}
                    <button type="button" className="fbc__relX" onClick={() => link(r.id, false)} aria-label={C.relatedRemove(r.title)} title={C.relatedRemove(r.title)}>
                      <Icon name="close" size={11} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="fbq__hint">{C.relatedNone}</span>
            )}
            {suggest.length > 0 && (
              <div className="fbq__similar">
                <span>{C.relatedSuggest}</span>
                <ul>
                  {suggest.map((s) => (
                    <li key={s.id}>
                      <button type="button" className="fbc__relAdd" onClick={() => link(s.id, true)}>
                        <Icon name="plus" size={11} /> {C.relatedAdd(s.title)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {others.length > related.length && (
              <select
                aria-label={C.relatedLabel}
                value=""
                onChange={(e) => e.target.value && link(e.target.value, true)}
              >
                <option value="">{C.relatedPick}</option>
                {others
                  .filter((o) => !f.related?.includes(o.id))
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {kn(o.kind)}: {o.title}
                    </option>
                  ))}
              </select>
            )}
          </div>
        </fieldset>
        )}

        <fieldset className="fbc__group">
          <legend>
            {C.groups.pics}
            {savedAt === 'pics' && <span className="fbc__saved" role="status"> · {C.saved}</span>}
          </legend>
          <p className="fbq__hint">{C.picsHint(Fb.PICS_MAX)}</p>
          {(f.pics ?? []).length > 0 && (
            <ul className="fbc__pics">
              {(f.pics ?? []).map((p, i) => (
                <Thumb key={p} picRef={p} n={i + 1} onRemove={() => edit({ pics: (f.pics ?? []).filter((x) => x !== p) }, 'pics')} />
              ))}
            </ul>
          )}
          {(f.pics ?? []).length < Fb.PICS_MAX && (
            <label className="fbc__picAdd">
              <Icon name="plus" size={12} /> {C.picsAdd}
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => {
                  const files = [...(e.target.files ?? [])];
                  e.target.value = '';
                  void addPics(files);
                }}
              />
            </label>
          )}
          {picMsg && <p className="fbq__miss" role="alert">{picMsg}</p>}
        </fieldset>

        {triage && (
        <fieldset className="fbc__group fbc__group--triage">
          <legend>{C.groups.marks}</legend>
          {GROUPS.find((g) => g.g === 'marks')!.fields.filter(shown).map(textField)}
          <label className="fbc__field fbc__fixed">
            <span className="fbq__label">
              {C.fixedLabel}
              {savedAt === 'fixed' && <span className="fbc__saved" role="status"> · {C.saved}</span>}
            </span>
            <input
              key={`${id}-fixed-${f.fixedIn ?? ''}`}
              type="text"
              defaultValue={f.fixedIn ?? ''}
              placeholder={C.fixedPh}
              maxLength={6}
              onBlur={(e) => e.target.value.trim() !== (f.fixedIn ?? '') && edit({ fixedIn: e.target.value }, 'fixed')}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), e.currentTarget.blur())}
            />
          </label>
          <div className="fbc__mark">
            <span className="fbq__label">
              {C.markLabel}
              {savedAt === 'mark' && <span className="fbc__saved" role="status"> · {C.saved}</span>}
            </span>
            <div className="fbc__markRow">
              <ModeWheel
                label={C.markLabel}
                options={(['note', 'decision', 'ref'] as const).map((k) => ({ id: k, name: C.markKinds[k] }))}
                value={markKind}
                onChange={(k) => setMarkKind(k as typeof markKind)}
              />
              <input
                id={`fbc-${id}-mark`}
                type="text"
                value={markText}
                placeholder={C.markPh}
                aria-label={C.markLabel}
                onChange={(e) => setMarkText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMark())}
              />
              <button type="button" onClick={addMark}>
                {C.markAdd}
              </button>
            </div>
          </div>
          <div className="fbc__trail">
            <span className="fbq__label">{C.trail}</span>
            {f.marks?.length ? (
              <ol>
                {[...f.marks].reverse().map((m, i) => (
                  <li key={`${m.at}-${i}`}>
                    <time dateTime={m.at}>{when(m.at)}</time> · <b>{C.trailKinds[m.kind]}</b>: {m.kind === 'state' ? stateLine(m.text) : m.text}
                    {m.by ? ` (${m.by})` : ''}
                  </li>
                ))}
              </ol>
            ) : (
              <span className="fbq__hint">{C.trailEmpty}</span>
            )}
          </div>
        </fieldset>
        )}

        <div className="fbc__meta">
          <span className="fbq__label">{C.placeLabel}</span>
          <span>{placeText(f.place, f.env)}</span>
          <span className="fbq__hint">
            {C.at(when(f.at))}
            {f.ease ? ` · ${C.ease(f.ease)}` : ''}
          </span>
        </div>
      </div>
      <footer className="fbc__foot">
        {props.onRemove && (
          <button type="button" className="fbc__remove" title={C.removeTip} onClick={() => (draft.current = {}, props.onRemove!(id))}>
            <Icon name="trash" size={13} /> {C.remove}
          </button>
        )}
        <button type="button" className="fbq__save" onClick={finish}>
          {C.done}
        </button>
      </footer>
    </dialog>
  );
}
