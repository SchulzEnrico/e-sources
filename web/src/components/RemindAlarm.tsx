/**
 * F-215 (V72/V73, Variante A): Meldung fälliger Erinnerungen am Pad (F-214: am Ort, nicht am Bildschirmrand).
 * Prüft nur, solange das Pad offen ist (alle 15 s und beim Zurückkehren in den Tab). Was schon vor dem Öffnen
 * fällig war, heißt „Verpasst“. Systemmitteilung nur, wenn der Anwender sie hier erlaubt hat.
 * Tastatur (NF-03): Knöpfe „Öffnen“ und ✕; Esc schließt die Meldung; Ansage über role="alert".
 */
import { useEffect, useRef, useState } from 'react';
import type { Note } from '../workspace/types';
import * as No from '../workspace/notes';
import { NOTE_TEXT, REMIND_TEXT as RT } from '../workspace/terms';
import { type DueRemind, dueReminders, markSeen, remindLabel, seenReminders } from '../workspace/remind';
import { Icon } from './Icon';

const CHECK_MS = 15000;
const canNotify = () => typeof Notification !== 'undefined';

export function RemindAlarm(props: { notes: readonly Note[]; onOpen: (id: string) => void }) {
  const notes = useRef(props.notes);
  notes.current = props.notes;
  const since = useRef(Date.now());
  const [due, setDue] = useState<DueRemind[]>([]);
  const [perm, setPerm] = useState(() => (canNotify() ? Notification.permission : 'denied'));
  const [note, setNote] = useState('');
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => {
      const found = dueReminders(notes.current, Date.now(), seenReminders(), since.current);
      if (!found.length) return;
      markSeen(found);
      setDue((d) => [...d.filter((x) => !found.some((f) => f.id === x.id)), ...found]);
      if (canNotify() && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
        for (const f of found) {
          const n = notes.current.find((x) => x.id === f.id);
          try {
            new Notification(f.missed ? RT.missed : RT.alarm, { body: (n && No.titleOf(n)) || NOTE_TEXT.untitled, tag: `remind-${f.id}` });
          } catch {
            /* z. B. iOS ohne App auf dem Startbildschirm */
          }
        }
      }
    };
    check();
    const t = window.setInterval(check, CHECK_MS);
    const vis = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', vis);
    return () => (window.clearInterval(t), document.removeEventListener('visibilitychange', vis));
  }, []);

  // gelöschte oder erledigte Notes nicht weiter melden
  const shown = due.filter((d) => props.notes.some((n) => n.id === d.id && n.state !== 'done' && n.state !== 'archived'));
  if (!shown.length) return null;
  const first = shown[0];
  const n = props.notes.find((x) => x.id === first.id)!;
  const title = No.titleOf(n) || NOTE_TEXT.untitled;
  const drop = (id: string) => setDue((d) => d.filter((x) => x.id !== id));
  const allow = async () => {
    try {
      const p = await Notification.requestPermission();
      setPerm(p);
      setNote(p === 'granted' ? RT.allowed : RT.denied);
    } catch {
      setNote(RT.denied);
    }
  };

  return (
    <div
      className={`ralarm${first.missed ? ' is-missed' : ''}`}
      ref={box}
      role="alert"
      onKeyDown={(e) => e.key === 'Escape' && (e.stopPropagation(), drop(first.id))}
    >
      <Icon name="recent" size={16} />
      <div className="ralarm__text">
        <strong>{first.missed ? RT.missed : RT.alarm}</strong> · {remindLabel(first.at)}
        <span className="ralarm__title">{title}</span>
        {n.place && <span className="ralarm__place">{n.place}</span>}
        {shown.length > 1 && <span className="ralarm__more">{RT.more(shown.length - 1)}</span>}
        {note && <span className="ralarm__note" role="status">{note}</span>}
      </div>
      <div className="ralarm__acts">
        <button type="button" className="ralarm__open" onClick={() => (drop(first.id), props.onOpen(first.id))}>
          {RT.open}
        </button>
        {canNotify() && perm === 'default' && (
          <button type="button" className="ralarm__allow" title={RT.allowHint} onClick={allow}>
            {RT.allow}
          </button>
        )}
        <button type="button" className="ralarm__x" aria-label={RT.dismiss} title={RT.dismiss} onClick={() => drop(first.id)}>
          <Icon name="close" size={12} />
        </button>
      </div>
    </div>
  );
}
