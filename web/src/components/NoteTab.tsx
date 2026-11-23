/**
 * F-206 Schritt 2: Notiz im Tab. Der Tab zeigt nur auf die Notiz (Tab.note); Inhalt und Zustand
 * liegen in Workspace.notes. Bearbeiten/Lesen mit Markdown light (ohne innerHTML).
 * Ansichten (To-do, Kanban, Eisenhower) zeigen hier vorerst nur einen Platzhalter.
 */
import { type Dispatch, type ReactNode, useId, useState } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { NoteState, NoteViewKind, Workspace } from '../workspace/types';
import * as No from '../workspace/notes';
import { NOTE_TEXT, TERMS } from '../workspace/terms';
import { Icon } from './Icon';
import type { IconName } from '../workspace/icons';

const KIND_ICON: Record<NoteViewKind | 'note', IconName> = { note: 'note', block: 'note', todo: 'todo', kanban: 'kanban', eisenhower: 'matrix' };
const KIND_NAME: Record<NoteViewKind, string> = { block: 'Notizblock', todo: 'To-do-Liste', kanban: 'Kanban-Board', eisenhower: 'Eisenhower-Matrix' };
/** Wählbare Zustände (archiviert nur von Hand, „in Prüfung“ kommt über die Board-Regel). */
const STATES: NoteState[] = ['open', 'waiting', 'doing', 'review', 'done', 'archived'];

const when = (ms: number) =>
  new Date(ms).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const dayDe = (d: string) => d.split('-').reverse().join('.');

/** Erklärung eines Begriffs ohne „Wort = “ vorn. */
const explain = (t: string) => t.replace(/^[^=]*=\s*/, '');

// ---------- Markdown light ----------

/** Nur sichere Adressen werden zu Links. */
const safeHref = (u: string) => (/^(https?:|mailto:)/i.test(u) ? u : undefined);

/** Fett, kursiv, Code, Links – als React-Elemente, nie als HTML. */
function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*|_[^_\s][^_]*_)|(\[[^\]]+\]\([^)\s]+\))|(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}-${i++}`;
    const s = m[0];
    if (m[1]) out.push(<code key={k}>{s.slice(1, -1)}</code>);
    else if (m[2]) out.push(<strong key={k}>{inline(s.slice(2, -2), k)}</strong>);
    else if (m[3]) out.push(<em key={k}>{inline(s.slice(1, -1), k)}</em>);
    else if (m[4]) {
      const [, label, href] = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(s)!;
      const h = safeHref(href);
      out.push(h ? <a key={k} href={h} target="_blank" rel="noopener noreferrer">{label}</a> : s);
    } else if (m[5]) out.push(<a key={k} href={s} target="_blank" rel="noopener noreferrer">{s}</a>);
    last = m.index + s.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Blöcke: Überschriften, Listen, Aufgaben (abhakbar), Zitate, Code, Absätze. */
function Markdown({ text, onToggle }: { text: string; onToggle?: (line: number) => void }) {
  const lines = text.split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const key = `b${i}`;
    if (/^```/.test(line)) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) body.push(lines[i++]);
      i++;
      blocks.push(<pre key={key}><code>{body.join('\n')}</code></pre>);
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      const Tag = (['h3', 'h4', 'h5'] as const)[h[1].length - 1];
      blocks.push(<Tag key={key}>{inline(h[2], key)}</Tag>);
      i++;
      continue;
    }
    if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items: ReactNode[] = [];
      while (i < lines.length && /^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) {
        const at = i;
        const body = lines[i].replace(/^\s*([-*+]|\d+[.)])\s+/, '');
        const task = /^\[([ xX])\]\s+(.*)$/.exec(body);
        items.push(
          task ? (
            <li key={`l${at}`} className="md__task">
              <label>
                <input type="checkbox" checked={task[1] !== ' '} disabled={!onToggle} onChange={() => onToggle?.(at)} />
                <span>{inline(task[2], `l${at}`)}</span>
              </label>
            </li>
          ) : (
            <li key={`l${at}`}>{inline(body, `l${at}`)}</li>
          ),
        );
        i++;
      }
      blocks.push(ordered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>);
      continue;
    }
    if (/^>\s?/.test(line)) {
      const body: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) body.push(lines[i++].replace(/^>\s?/, ''));
      blocks.push(<blockquote key={key}>{inline(body.join(' '), key)}</blockquote>);
      continue;
    }
    if (!line.trim()) {
      i++;
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|```|>|\s*([-*+]|\d+[.)])\s)/.test(lines[i])) para.push(lines[i++]);
    blocks.push(<p key={key}>{inline(para.join(' '), key)}</p>);
  }
  return <div className="md">{blocks}</div>;
}

/** Aufgabe in Zeile `line` ab- bzw. anhaken. */
export function toggleTask(text: string, line: number): string {
  const lines = text.split('\n');
  const l = lines[line];
  if (l === undefined) return text;
  lines[line] = l.replace(/^(\s*(?:[-*+]|\d+[.)])\s+)\[([ xX])\]/, (_m, pre, x) => `${pre}[${x === ' ' ? 'x' : ' '}]`);
  return lines.join('\n');
}

// ---------- Notiz ----------

interface NoteProps {
  ws: Workspace;
  noteId: string;
  dispatch: Dispatch<Action>;
}

export function NoteTab({ ws, noteId, dispatch }: NoteProps) {
  const n = No.noteById(ws, noteId);
  const by = ws.profile?.name || undefined;
  const [mode, setMode] = useState<'edit' | 'read'>(() => (n && (n.title.trim() || n.text.trim()) ? 'read' : 'edit'));
  const uid = useId();
  if (!n) return <p className="win__placeholder win__placeholder--small">{NOTE_TEXT.missing}</p>;
  const info = No.stateOf(ws, n);
  const title = No.titleOf(n);
  const edit = (patch: No.NotePatch) => dispatch({ type: 'noteEdit', id: n.id, patch, by });
  const auto =
    info.cause === 'after' ? NOTE_TEXT.autoAfter(info.blockers?.length ?? 0) : info.cause === 'notBefore' || info.cause === 'date' ? NOTE_TEXT.autoFrom(dayDe(info.from!)) : '';
  return (
    <div className="note" role="region" aria-label={`Notiz: ${title || NOTE_TEXT.untitled}`}>
      <div className="note__bar">
        <span className="note__mode" role="group" aria-label="Ansicht der Notiz">
          <button type="button" aria-pressed={mode === 'edit'} onClick={() => setMode('edit')}>
            {NOTE_TEXT.edit}
          </button>
          <button type="button" aria-pressed={mode === 'read'} onClick={() => setMode('read')}>
            {NOTE_TEXT.read}
          </button>
        </span>
        <label className="note__opt" title={explain(TERMS.noteState)}>
          {NOTE_TEXT.state}
          <select value={n.state} onChange={(e) => dispatch({ type: 'noteState', id: n.id, state: e.target.value as NoteState, by })}>
            {STATES.map((s) => (
              <option key={s} value={s}>
                {NOTE_TEXT.states[s]}
              </option>
            ))}
          </select>
        </label>
        {n.state === 'waiting' && (
          <label className="note__opt">
            {NOTE_TEXT.reason}
            <input
              type="text"
              defaultValue={n.waitReason ?? ''}
              onBlur={(e) => e.target.value.trim() !== (n.waitReason ?? '') && dispatch({ type: 'noteState', id: n.id, state: 'waiting', reason: e.target.value, by })}
            />
          </label>
        )}
        <label className="note__opt">
          <input type="checkbox" checked={!!n.important} onChange={(e) => edit({ important: e.target.checked || undefined })} />
          {NOTE_TEXT.important}
        </label>
        <label className="note__opt">
          <input type="checkbox" checked={!!n.urgent} onChange={(e) => edit({ urgent: e.target.checked || undefined })} />
          {NOTE_TEXT.urgent}
        </label>
        <label className="note__opt">
          {NOTE_TEXT.notBefore}
          <input type="date" value={n.notBefore ?? ''} onChange={(e) => edit({ notBefore: e.target.value || undefined })} />
        </label>
        <label className="note__opt">
          {NOTE_TEXT.due}
          <input type="date" value={n.due ?? ''} onChange={(e) => edit({ due: e.target.value || undefined })} />
        </label>
      </div>
      {auto && (
        <p className="note__auto" role="status">
          <Icon name="pause" size={14} /> {auto}
        </p>
      )}
      {mode === 'edit' ? (
        <div className="note__edit">
          <label className="note__field">
            {NOTE_TEXT.title}
            <input type="text" value={n.title} placeholder={No.titleOf({ title: '', text: n.text }) || NOTE_TEXT.titleHint} onChange={(e) => edit({ title: e.target.value })} />
          </label>
          <label className="note__field note__field--grow">
            {NOTE_TEXT.text}
            <textarea
              value={n.text}
              autoFocus={!n.text && !n.title}
              aria-describedby={`${uid}-md`}
              onChange={(e) => edit({ text: e.target.value })}
              onKeyDown={(e) => {
                // Strg/⌘+Enter = Lesen
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  setMode('read');
                }
              }}
            />
          </label>
          <p className="note__hint" id={`${uid}-md`}>
            {NOTE_TEXT.textHint} · Strg/⌘+Enter = {NOTE_TEXT.read}
          </p>
        </div>
      ) : (
        <div className="note__read">
          {/* eigener Titel oben; ohne ihn steht die erste Zeile schon im Text */}
          {(n.title.trim() || !n.text.trim()) && <h2 className="note__title">{title || NOTE_TEXT.untitled}</h2>}
          {n.text.trim() ? <Markdown text={n.text} onToggle={(line) => edit({ text: toggleTask(n.text, line) })} /> : <p className="note__hint">{NOTE_TEXT.empty}</p>}
        </div>
      )}
      <p className="note__meta">
        {NOTE_TEXT.created(when(n.created))} · {NOTE_TEXT.changed(when(n.changed))}
        {n.origin?.by ? ` · ${n.origin.by}` : ''}
      </p>
    </div>
  );
}

// ---------- Ansicht (Platzhalter bis zu den nächsten Schritten) ----------

export function ViewTab({ ws, viewId }: { ws: Workspace; viewId: string }) {
  const v = No.viewById(ws, viewId);
  if (!v) return <p className="win__placeholder win__placeholder--small">{NOTE_TEXT.missingView}</p>;
  return (
    <div className="note note--view">
      <p className="win__placeholder">
        <Icon name={KIND_ICON[v.kind]} size={22} /> {v.name}
      </p>
      <p className="win__hint">{NOTE_TEXT.viewSoon(KIND_NAME[v.kind], No.countIn(ws, v))}</p>
    </div>
  );
}

// ---------- Leerer Tab: Notiz oder Ansicht anlegen ----------

const CHOICES: { kind: NoteViewKind | 'note'; label: string; term: string }[] = [
  { kind: 'note', label: 'Notiz', term: TERMS.note },
  { kind: 'todo', label: 'To-do-Liste', term: TERMS.todo },
  { kind: 'kanban', label: 'Kanban-Board', term: TERMS.kanban },
  { kind: 'eisenhower', label: 'Eisenhower', term: TERMS.eisenhower },
];

export function NewInTab({ onPick }: { onPick: (kind: NoteViewKind | 'note') => void }) {
  const uid = useId();
  return (
    <div className="newin" role="group" aria-labelledby={`${uid}-h`} aria-describedby={`${uid}-d`}>
      <p className="newin__head" id={`${uid}-h`}>
        {NOTE_TEXT.create}
      </p>
      <span className="newin__row">
        {CHOICES.map((c) => (
          <button key={c.kind} type="button" className="newin__btn" title={explain(c.term)} onClick={() => onPick(c.kind)}>
            <Icon name={KIND_ICON[c.kind]} size={16} />
            {c.label}
          </button>
        ))}
      </span>
      <p className="newin__hint" id={`${uid}-d`}>
        {NOTE_TEXT.createHint}
      </p>
    </div>
  );
}
