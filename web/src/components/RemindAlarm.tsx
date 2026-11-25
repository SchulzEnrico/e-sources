/**
 * F-215 (V72/V73, Variante A): Meldung fälliger Erinnerungen am Pad (F-214: am Ort, nicht am Bildschirmrand).
 * Prüft nur, solange das Pad offen ist (alle 15 s und beim Zurückkehren in den Tab). Was schon vor dem Öffnen
 * fällig war, heißt „Verpasst“. Systemmitteilung nur, wenn der Anwender sie hier erlaubt hat.
 * Tastatur (NF-03): Knöpfe „Öffnen“ und ✕; Esc schließt die Meldung; Ansage über role="alert".
 * V74: Ton bei neuer Meldung; Logik (useReminders) und Anzeige getrennt – die Anzeige sitzt über der
 * Leiste Speichern/Verwerfen/Schließen bzw. unten in der Notizfläche (Wunsch Enrico, F-214), der Zustand
 * bleibt beim Wechsel zwischen beiden Orten erhalten.
 */
import { useEffect, useRef, useState } from 'react';
import type { Note } from '../workspace/types';
import * as No from '../workspace/notes';
import { NOTE_TEXT, REMIND_TEXT as RT } from '../workspace/terms';
import { type DueRemind, dueReminders, markSeen, remindLabel, seenReminders } from '../workspace/remind';
import { Icon } from './Icon';
import { armChime, playChime } from './chime';

const CHECK_MS = 15000;
const canNotify = () => typeof Notification !== 'undefined';

export interface Reminders {
  notes: readonly Note[];
  shown: DueRemind[];
  drop: (id: string) => void;
}

/** Prüft fällige Erinnerungen, solange das Pad offen ist; spielt beim Auftauchen einen Ton. */
export function useReminders(list: readonly Note[], how: { sound: boolean; system: boolean } = { sound: true, system: false }): Reminders {
  const notes = useRef(list);
  notes.current = list;
  // F-218 A8 (V92): Ton und Systemmitteilung nach den Regeln
  const howRef = useRef(how);
  howRef.current = how;
  const since = useRef(Date.now());
  const [due, setDue] = useState<DueRemind[]>([]);

  useEffect(() => {
    armChime();
    const check = () => {
      const found = dueReminders(notes.current, Date.now(), seenReminders(), since.current);
      if (!found.length) return;
      markSeen(found);
      setDue((d) => [...d.filter((x) => !found.some((f) => f.id === x.id)), ...found]);
      if (howRef.current.sound) playChime(found.every((f) => f.missed));
      if (howRef.current.system && canNotify() && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
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
  const shown = due.filter((d) => list.some((n) => n.id === d.id && n.state !== 'done' && n.state !== 'archived'));
  const drop = (id: string) => setDue((d) => d.filter((x) => x.id !== id));
  return { notes: list, shown, drop };
}

export function RemindAlarm(props: { r: Reminders; onOpen: (id: string) => void }) {
  const { shown, drop } = props.r;
  const [perm, setPerm] = useState(() => (canNotify() ? Notification.permission : 'denied'));
  const [note, setNote] = useState('');
  const box = useRef<HTMLDivElement>(null);
  if (!shown.length) return null;
  const first = shown[0];
  const n = props.r.notes.find((x) => x.id === first.id)!;
  const title = No.titleOf(n) || NOTE_TEXT.untitled;
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
