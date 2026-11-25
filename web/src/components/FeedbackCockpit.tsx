/**
 * F-221 Bau 4 (V103, FB8/FB10, NF-08): Cockpit „Feedback“ – Board wie Kanban (Trello): Spalten Neu · Gesichtet ·
 * Geplant · Erledigt · Verworfen, innen blockiert zuerst. Filter Art und Schweregrad (Umschalt-Räder) und Suche,
 * Karte öffnet das Kartenfenster (Bau 3). Verschieben per Ziehen oder Alt/⌥+Pfeil links/rechts; Verworfen fragt
 * am Ort nach dem Grund. Löschen mit Rückgängig am Ort. „Als Datei speichern“: Markdown + JSON, wahlweise nur Neue.
 * Tastatur: Pfeile wandern zwischen Karten und Spalten, Enter öffnet, Entf löscht.
 */
import { type Dispatch, type DragEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { tourAutoStart } from '../workspace/tour';
import type { Action } from '../workspace/useWorkspace';
import type { Feedback, FeedbackState, Workspace } from '../workspace/types';
import * as Fb from '../workspace/feedback';
import { canTriage } from '../workspace/persons';
import { FEEDBACK_CARD_TEXT as C, FEEDBACK_COCKPIT_TEXT as K, FEEDBACK_TEXT as T } from '../workspace/terms';
import { ModeWheel } from './ModeWheel';
import { Icon } from './Icon';
import { FeedbackCard, loadTriage, saveTriage } from './FeedbackCard';

const ALL = 'all';

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function FeedbackCockpit(props: { ws: Workspace; dispatch: Dispatch<Action>; say: (t: string) => void; startId?: string; onTourAuto?: () => void; /** F-225 (V105, P7): nur Meldungen dieses Projekts */ project?: string }) {
  const { ws, dispatch, say } = props;
  const [kind, setKind] = useState<string>(ALL);
  const [sev, setSev] = useState<string>(ALL);
  const [q, setQ] = useState('');
  const [card, setCard] = useState<string | null>(props.startId ?? null);
  const [onlyNew, setOnlyNew] = useState(false);
  const [triageOn, setTriageRaw] = useState(loadTriage);
  // V105 (F-224 R1–R3): „Bearbeitung“ nur mit der Befugnis „Feedback bearbeiten“ – ohne sie gibt es den Schalter nicht
  const may = canTriage(ws);
  const triage = may && triageOn;
  const setTriage = (on: boolean) => (setTriageRaw(on), saveTriage(on), say(on ? K.triageOn : K.triageOff));
  const [drop, setDrop] = useState<{ id: string; why: string; miss: boolean } | null>(null);
  const [msg, setMsg] = useState<{ state: FeedbackState; text: string; undo?: () => void } | null>(null);
  const [over, setOver] = useState<FeedbackState | null>(null);
  const board = useRef<HTMLElement>(null);
  const by = ws.profile?.name || undefined;
  // V104 (F-217): beim ersten Öffnen einmal die Tour „Feedback“
  useEffect(() => {
    if (!props.onTourAuto || props.project || !tourAutoStart('feedback')) return;
    const t = window.setTimeout(() => props.onTourAuto?.(), 450);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flt: Fb.FeedbackFilter = {
    ...(kind !== ALL ? { kinds: [kind as Feedback['kind']] } : {}),
    ...(sev !== ALL ? { severities: [sev as NonNullable<Feedback['severity']>] } : {}),
    ...(q.trim() ? { q } : {}),
    project: props.project ?? null,
  };
  const cols = Fb.feedbackBoard(ws, flt);
  const total = Fb.feedbackOf(ws).filter((f) => (f.project ?? null) === (props.project ?? null)).length;
  const shown = cols.reduce((s, c) => s + c.items.length, 0);
  // V104 (Enrico): Anwender sehen keinen Zustand – ohne „Bearbeitung“ eine Liste „Meine Meldungen“, neueste oben
  const list = triage ? [] : Fb.feedbackList(ws, flt);
  const fileOnlyNew = triage && onlyNew;

  const focusCard = (id: string) => window.setTimeout(() => board.current?.querySelector<HTMLElement>(`[data-fb="${id}"]`)?.focus(), 0);
  const tell = (state: FeedbackState, text: string, undo?: () => void) => {
    setMsg({ state, text, ...(undo ? { undo } : {}) });
    say(text);
  };

  const move = (f: Feedback, to: FeedbackState) => {
    if (to === f.state) return;
    if (to === 'dropped') {
      setDrop({ id: f.id, why: '', miss: false });
      return window.setTimeout(() => document.getElementById('fbb-drop')?.focus(), 0);
    }
    const from = f.state;
    dispatch({ type: 'fbState', id: f.id, state: to, by });
    tell(to, K.moved(f.title, C.states[to]), () => dispatch({ type: 'fbState', id: f.id, state: from, by }));
    focusCard(f.id);
  };
  const confirmDrop = () => {
    if (!drop) return;
    const f = Fb.feedbackById(ws, drop.id);
    if (!f) return setDrop(null);
    if (!drop.why.trim()) return setDrop({ ...drop, miss: true });
    const from = f.state;
    dispatch({ type: 'fbState', id: f.id, state: 'dropped', why: drop.why, by });
    setDrop(null);
    tell('dropped', K.moved(f.title, C.states.dropped), () => dispatch({ type: 'fbState', id: f.id, state: from, by }));
    focusCard(f.id);
  };
  const remove = (id: string) => {
    const f = Fb.feedbackById(ws, id);
    const r = Fb.removeFeedback(ws, id);
    if (!f || !r) return;
    dispatch({ type: 'fbRemove', id });
    setCard(null);
    tell(f.state, K.removed(f.title), () => dispatch({ type: 'fbRestore', undo: r.undo }));
  };
  const saveFile = () => {
    const now = new Date();
    const pj = props.project ?? null;
    const n = fileOnlyNew ? (pj ? Fb.newCountOf(ws, pj) : Fb.newCount(ws)) : total;
    if (!n) return say(K.fileEmpty);
    download(Fb.feedbackFileName(now, 'md'), Fb.feedbackFileMarkdown(ws, { onlyNew: fileOnlyNew, project: pj }), 'text/markdown');
    download(Fb.feedbackFileName(now, 'json'), Fb.feedbackFileJson(ws, { onlyNew: fileOnlyNew, project: pj }), 'application/json');
    say(K.fileSaved(n));
  };

  const cardKey = (e: KeyboardEvent<HTMLElement>, f: Feedback, ci: number, ri: number) => {
    const col = (i: number) => cols[i]?.items;
    if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      const to = Fb.FEEDBACK_STATES[ci + (e.key === 'ArrowLeft' ? -1 : 1)];
      if (to) move(f, to);
      return;
    }
    const go = (c: number, r: number) => {
      const list = col(c);
      if (!list?.length) return false;
      focusCard(list[Math.max(0, Math.min(list.length - 1, r))].id);
      return true;
    };
    if (e.key === 'ArrowDown') return void (e.preventDefault(), go(ci, ri + 1));
    if (e.key === 'ArrowUp') return void (e.preventDefault(), go(ci, ri - 1));
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const d = e.key === 'ArrowRight' ? 1 : -1;
      for (let c = ci + d; c >= 0 && c < cols.length; c += d) if (go(c, ri)) return;
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') return void (e.preventDefault(), setCard(f.id));
    if (e.key === 'Delete' || e.key === 'Backspace') return void (e.preventDefault(), remove(f.id));
  };

  const listKey = (e: KeyboardEvent<HTMLElement>, f: Feedback, ri: number) => {
    const go = (r: number) => list[r] && focusCard(list[r].id);
    if (e.key === 'ArrowDown') return void (e.preventDefault(), go(ri + 1));
    if (e.key === 'ArrowUp') return void (e.preventDefault(), go(ri - 1));
    if (e.key === 'Enter' || e.key === ' ') return void (e.preventDefault(), setCard(f.id));
    if (e.key === 'Delete' || e.key === 'Backspace') return void (e.preventDefault(), remove(f.id));
  };

  const onDrop = (e: DragEvent, to: FeedbackState) => {
    e.preventDefault();
    setOver(null);
    const f = Fb.feedbackById(ws, e.dataTransfer.getData('text/x-feedback'));
    if (f) move(f, to);
  };

  return (
    <section className="fbb" aria-label={K.region}>
      {!props.project && <p className="fbb__intro">{triage ? K.intro : K.introUser}</p>}
      <div className="fbb__bar">
        <div className="fbc__wheel">
          <span className="fbq__label">{K.kindFilter}</span>
          <ModeWheel
            label={K.kindFilter}
            options={[{ id: ALL, name: K.all }, ...Fb.FEEDBACK_KINDS.map((k) => ({ id: k, name: T.kinds[k], hint: T.kindHints[k] }))]}
            value={kind}
            onChange={setKind}
          />
        </div>
        <div className="fbc__wheel">
          <span className="fbq__label">{C.sevLabel}</span>
          <ModeWheel
            label={K.sevFilter}
            options={[{ id: ALL, name: K.all }, ...(['blocks', 'hinders', 'minor'] as const).map((s) => ({ id: s, name: C.sevs[s], hint: C.sevHints[s] }))]}
            value={sev}
            onChange={setSev}
          />
        </div>
        <label className="fbb__search">
          <span className="fbq__label">{K.search}</span>
          <input type="search" value={q} placeholder={K.searchPh} onChange={(e) => setQ(e.target.value)} />
        </label>
        {may && <label className="fbb__only fbb__triage" title={K.triageHint}>
          <input type="checkbox" checked={triage} onChange={(e) => setTriage(e.target.checked)} /> {K.triage}
        </label>}
        <div className="fbb__file" role="group" aria-label={K.fileGroup}>
          {triage && <label className="fbb__only">
            <input type="checkbox" checked={onlyNew} onChange={(e) => setOnlyNew(e.target.checked)} /> {K.onlyNew}
          </label>}
          <button type="button" onClick={saveFile} title={K.fileHint}>
            <Icon name="download" size={13} /> {K.file}
          </button>
        </div>
      </div>
      <p className="fbb__count" role="status">
        {total ? K.count(shown, total) : K.empty}
      </p>
      {!triage && (
        <section className="fbb__mine" ref={board} aria-label={K.mine}>
          <h3 className="fbb__head">
            {K.mine} <span className="fbb__n">{list.length}</span>
          </h3>
          {msg && (
            <p className="sheet__msg fbb__msg" role="status">
              {msg.text}
              {msg.undo && (
                <button type="button" className="note__undo" onClick={() => (msg.undo!(), setMsg(null))}>
                  {T.undo}
                </button>
              )}
            </p>
          )}
          <ul className="fbb__cards">
            {list.map((f, ri) => {
              const miss = Fb.missingOf(f).length;
              return (
                <li key={f.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    data-fb={f.id}
                    className={`fbb__card is-${f.kind}${f.severity ? ` sev-${f.severity}` : ''}`}
                    aria-label={K.cardLabel(T.kinds[f.kind], f.title, f.severity ? C.sevs[f.severity] : '', miss)}
                    aria-describedby="fbb-keys"
                    onClick={() => setCard(f.id)}
                    onKeyDown={(e) => listKey(e, f, ri)}
                  >
                    <span className="fbb__kind">{T.kinds[f.kind]}</span>
                    {f.severity && <span className={`fbb__sev sev-${f.severity}`}>{C.sevs[f.severity]}</span>}
                    <span className="fbb__title">{f.title}</span>
                    <span className="fbb__signs">
                      <time dateTime={f.at}>{K.when(f.at)}</time>
                      {f.pics?.length ? (
                        <span title={K.pics(f.pics.length)}>
                          <Icon name="image" size={11} /> {f.pics.length}
                        </span>
                      ) : null}
                      {miss ? <span className="fbb__open">{K.open(miss)}</span> : null}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {triage && <div className="fbb__board" ref={board as React.RefObject<HTMLDivElement>}>
        {cols.map((c, ci) => (
          <section
            key={c.state}
            className={`fbb__col${over === c.state ? ' is-over' : ''}`}
            aria-label={`${C.states[c.state]}: ${K.cards(c.items.length)}`}
            onDragOver={(e) => (e.preventDefault(), setOver(c.state))}
            onDragLeave={() => setOver((o) => (o === c.state ? null : o))}
            onDrop={(e) => onDrop(e, c.state)}
          >
            <h3 className="fbb__head" title={C.stateHints[c.state]}>
              {C.states[c.state]} <span className="fbb__n">{c.items.length}</span>
            </h3>
            {msg?.state === c.state && (
              <p className="sheet__msg fbb__msg" role="status">
                {msg.text}
                {msg.undo && (
                  <button type="button" className="note__undo" onClick={() => (msg.undo!(), setMsg(null))}>
                    {T.undo}
                  </button>
                )}
              </p>
            )}
            <ul className="fbb__cards">
              {c.items.map((f, ri) => {
                const miss = Fb.missingOf(f).length;
                return (
                  <li key={f.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      data-fb={f.id}
                      draggable
                      className={`fbb__card is-${f.kind}${f.severity ? ` sev-${f.severity}` : ''}`}
                      aria-label={K.cardLabel(T.kinds[f.kind], f.title, f.severity ? C.sevs[f.severity] : '', miss)}
                      aria-describedby="fbb-keys"
                      onClick={() => setCard(f.id)}
                      onKeyDown={(e) => cardKey(e, f, ci, ri)}
                      onDragStart={(e) => (e.dataTransfer.setData('text/x-feedback', f.id), (e.dataTransfer.effectAllowed = 'move'))}
                    >
                      <span className="fbb__kind">{T.kinds[f.kind]}</span>
                      {f.severity && <span className={`fbb__sev sev-${f.severity}`}>{C.sevs[f.severity]}</span>}
                      <span className="fbb__title">{f.title}</span>
                      <span className="fbb__signs">
                        {f.refs?.length ? <span>{f.refs.join(', ')}</span> : null}
                        {f.pics?.length ? (
                          <span title={K.pics(f.pics.length)}>
                            <Icon name="image" size={11} /> {f.pics.length}
                          </span>
                        ) : null}
                        {f.fixedIn ? <span>{f.fixedIn}</span> : null}
                        {miss ? <span className="fbb__open">{K.open(miss)}</span> : null}
                      </span>
                    </div>
                    {drop?.id === f.id && (
                      <div className="fbc__drop fbb__drop" role="group" aria-label={C.dropWhy}>
                        <label>
                          <span className="fbq__label">{C.dropWhy}</span>
                          <input
                            id="fbb-drop"
                            type="text"
                            value={drop.why}
                            placeholder={C.dropWhyPh}
                            aria-invalid={drop.miss || undefined}
                            onChange={(e) => setDrop({ ...drop, why: e.target.value, miss: false })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') (e.preventDefault(), confirmDrop());
                              if (e.key === 'Escape') (e.preventDefault(), e.stopPropagation(), setDrop(null), focusCard(f.id));
                            }}
                          />
                        </label>
                        <button type="button" onClick={() => (setDrop(null), focusCard(f.id))}>{C.dropCancel}</button>
                        <button type="button" className="fbq__save" onClick={confirmDrop}>{C.dropOk}</button>
                        {drop.miss && <p className="fbq__miss" role="alert">{C.dropMissing}</p>}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      
      </div>}
      <p id="fbb-keys" className="fbb__keys">{triage ? K.keys : K.keysUser}</p>
      {card && (
        <FeedbackCard
          ws={ws}
          dispatch={dispatch}
          id={card}
          onOpen={setCard}
          onRemove={remove}
          triage={triage}
          onClose={() => {
            const id = card;
            setCard(null);
            focusCard(id);
          }}
        />
      )}
    </section>
  );
}
