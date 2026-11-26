/**
 * V111 (F-222 E2/N5): Bezüge-Chips an einer Lösung – „+ Bezug“ verbindet Notiz, Source, Person oder Feedback.
 * Aufbau wie die Quellen-Chips der Notiz (V93, NF-08): Chips als Liste, dahinter „+ Bezug“; die Auswahl öffnet am Ort
 * mit Rad „Art“ und Suchfeld. Tastatur: Pfeile wandern, Enter öffnet (Notiz, Source), Entf löst – mit Rückgängig am Ort.
 * Esc schließt die Auswahl, der Fokus geht zurück auf „+ Bezug“.
 */
import { type KeyboardEvent, useId, useRef, useState } from 'react';
import type { DecisionLink, DecisionOption, Workspace } from '../workspace/types';
import * as Dc from '../workspace/decisions';
import { DECISION_TEXT as T } from '../workspace/terms';
import { Icon } from './Icon';
import type { IconName } from '../workspace/icons';
import { ModeWheel } from './ModeWheel';
import { openNote, openSource } from './SourceChips';

type Kind = DecisionLink['kind'];
const KINDS: Kind[] = ['note', 'bookmark', 'person', 'feedback'];
const ICON: Record<Kind, IconName> = { note: 'note', bookmark: 'source', person: 'catPeople', feedback: 'feedback' };

export function DecisionLinks({ ws, o, lock, link }: { ws: Workspace; o: DecisionOption; lock: boolean; link: (l: DecisionLink, on: boolean) => void }) {
  const links = o.links ?? [];
  const [pick, setPick] = useState(false);
  const [kind, setKind] = useState<Kind>('note');
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState<{ text: string; undo?: DecisionLink } | null>(null);
  const addBtn = useRef<HTMLButtonElement>(null);
  const chips = useRef<(HTMLButtonElement | null)[]>([]);
  const listId = useId();
  const hits = pick ? Dc.linkTargets(ws, kind, q, links) : [];

  const close = () => (setPick(false), setQ(''), window.setTimeout(() => addBtn.current?.focus(), 0));
  const add = (t: Dc.LinkTarget) => {
    link({ kind: t.kind, id: t.id }, true);
    setMsg({ text: T.linkAdded(t.name, o.name) });
    close();
  };
  const open = (l: DecisionLink) => {
    if (l.kind === 'note') return openNote(l.id);
    if (l.kind === 'bookmark') {
      const b = ws.bookmarks.find((x) => x.id === l.id);
      if (b) openSource({ url: b.url, title: b.title });
    }
  };
  const remove = (l: DecisionLink, i: number) => {
    link(l, false);
    setMsg({ text: T.linkRemoved(Dc.linkName(ws, l) ?? T.linkGone), undo: l });
    window.setTimeout(() => (chips.current[Math.min(i, links.length - 2)] ?? addBtn.current)?.focus(), 0);
  };
  const chipKey = (e: KeyboardEvent<HTMLButtonElement>, l: DecisionLink, i: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') (e.preventDefault(), (chips.current[i + 1] ?? addBtn.current)?.focus());
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') (e.preventDefault(), chips.current[i - 1]?.focus());
    else if ((e.key === 'Delete' || e.key === 'Backspace') && !lock) (e.preventDefault(), remove(l, i));
  };

  return (
    <div className="dcl" role="group" aria-label={T.linksLabel(o.name)}>
      {links.length > 0 && (
        <ul className="dcl__chips" aria-label={`${T.linksLabel(o.name)} – ${T.linkKeys}`}>
          {links.map((l, i) => {
            const name = Dc.linkName(ws, l);
            return (
              <li key={`${l.kind}:${l.id}`}>
                <button
                  ref={(el) => {
                    chips.current[i] = el;
                  }}
                  type="button"
                  className={`dcl__chip${name ? '' : ' is-gone'}`}
                  title={`${T.linkKinds[l.kind]}: ${name ?? T.linkGone} · ${T.linkKeys}`}
                  aria-label={`${T.linkKinds[l.kind]}: ${T.linkOpen(name ?? T.linkGone)}`}
                  onClick={() => open(l)}
                  onKeyDown={(e) => chipKey(e, l, i)}
                >
                  <Icon name={ICON[l.kind]} size={11} className="icon icon--inline" />
                  <span className="dcl__name">{name ?? T.linkGone}</span>
                </button>
                {!lock && (
                  <button type="button" tabIndex={-1} className="dcl__x" title={T.linkRemove(name ?? T.linkGone)} aria-label={T.linkRemove(name ?? T.linkGone)} onClick={() => remove(l, i)}>
                    ✕
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {!lock && (
        <button ref={addBtn} type="button" className="dcl__add" aria-expanded={pick} title={T.linkAddHint} onClick={() => (pick ? close() : setPick(true))}>
          {T.linkAdd}
        </button>
      )}
      {pick && (
        <div
          className="dcl__pick"
          role="dialog"
          aria-label={T.linkPickLabel(o.name)}
          onKeyDown={(e) => e.key === 'Escape' && (e.preventDefault(), e.stopPropagation(), close())}
        >
          <span className="dcl__row">
            <span className="fbq__label">{T.linkKind}</span>
            <ModeWheel label={T.linkKind} value={kind} onChange={(k) => setKind(k as Kind)} options={KINDS.map((k) => ({ id: k, name: T.linkKinds[k], hint: T.linkKindHints[k] }))} />
          </span>
          <input
            autoFocus
            type="search"
            aria-label={`${T.linkFind}: ${T.linkKinds[kind]}`}
            aria-controls={listId}
            placeholder={T.linkFindPh}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && hits[0]) (e.preventDefault(), add(hits[0]));
              if (e.key === 'ArrowDown') (e.preventDefault(), (e.currentTarget.parentElement?.querySelector<HTMLButtonElement>('.dcl__hit')?.focus()));
            }}
          />
          {hits.length ? (
            <ul id={listId} className="dcl__hits">
              {hits.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className="dcl__hit"
                    onClick={() => add(t)}
                    onKeyDown={(e) => {
                      const li = e.currentTarget.parentElement;
                      if (e.key === 'ArrowDown') (e.preventDefault(), li?.nextElementSibling?.querySelector<HTMLButtonElement>('button')?.focus());
                      if (e.key === 'ArrowUp') (e.preventDefault(), (li?.previousElementSibling?.querySelector<HTMLButtonElement>('button') ?? li?.closest('.dcl__pick')?.querySelector<HTMLInputElement>('input'))?.focus());
                    }}
                  >
                    <Icon name={ICON[t.kind]} size={11} className="icon icon--inline" /> {t.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="lc__muted">{T.linkNone}</p>
          )}
        </div>
      )}
      {msg && (
        <span className="sheet__msg dc__msg" role="status">
          {msg.text}
          {msg.undo && (
            <button type="button" className="note__undo" onClick={() => (link(msg.undo!, true), setMsg(null))}>
              {T.undo}
            </button>
          )}
        </span>
      )}
    </div>
  );
}
