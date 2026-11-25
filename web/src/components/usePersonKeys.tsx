/**
 * F-206 Schritt 8 (V94, P7/P15/P16): Personen in To-do, Kanban und Matrix – überall gleich (Leitsatz
 * „weitestgehend gleicher Aufbau“). Z = Zuständig … (Auswahl an der Karte), Umschalt+Z = mich ein-/austragen,
 * Q = Rad „Alle · Nur meine“ umschalten (wie Trello „Meine Karten“). Zuweisen wirkt sofort (kein Entwurf).
 */
import { type Dispatch, type KeyboardEvent, useState } from 'react';
import type { Action } from '../workspace/useWorkspace';
import type { Note, Workspace } from '../workspace/types';
import * as Ps from '../workspace/persons';
import { PERSON_TEXT as T } from '../workspace/terms';
import { PersonPicker } from './PersonChips';

export type Who = 'all' | 'mine';
const today = () => new Date().toISOString().slice(0, 10);

export function usePersonKeys(ws: Workspace, dispatch: Dispatch<Action>, by: string | undefined, say: (t: string) => void) {
  const [who, setWho] = useState<Who>('all');
  const [pickFor, setPickFor] = useState<string | null>(null);
  const day = today();
  const me = Ps.meId(ws);
  /** Karte bzw. Zeile sichtbar? */
  const pass = (n: Note) => who === 'all' || Ps.mineOf(ws, n, day).mine;
  /** P15: Akzentkante an eigenen Karten; P16: Vertretung */
  const mark = (n: Note): string => {
    const m = Ps.mineOf(ws, n, day);
    return m.mine ? (m.via ? ' is-mine is-stand' : ' is-mine') : '';
  };
  const toggleWho = () => {
    const next: Who = who === 'all' ? 'mine' : 'all';
    setWho(next);
    say(next === 'mine' ? T.onlyMine : T.allPeople);
  };
  const assign = (n: Note, id: string | undefined) => {
    dispatch({ type: 'noteAssign', id: n.id, person: id, by });
    say(id ? T.assigned(Ps.personById(ws, id)?.name ?? '') : T.unassigned);
  };
  /** true = Taste verarbeitet */
  const onKey = (e: KeyboardEvent, n: Note): boolean => {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    if (e.code === 'KeyZ' && e.shiftKey) {
      e.preventDefault();
      assign(n, Ps.assigneeOf(n) === me ? undefined : me);
      return true;
    }
    if (e.code === 'KeyZ') return (e.preventDefault(), setPickFor(n.id), true);
    if (e.code === 'KeyQ' && !e.shiftKey) return (e.preventDefault(), toggleWho(), true);
    return false;
  };
  /** Auswahl an der Karte (Aufrufer legt sie in ein Element mit position: relative). */
  const picker = (n: Note, back: () => void) =>
    pickFor === n.id ? (
      <PersonPicker
        ws={ws}
        current={Ps.assigneeOf(n)}
        onPick={(id) => (setPickFor(null), assign(n, id), back())}
        onCreate={(name) => {
          setPickFor(null);
          dispatch({ type: 'personAdd', name, assignTo: n.id, by });
          say(T.created(name));
          back();
        }}
        onClose={() => (setPickFor(null), back())}
      />
    ) : null;
  return { who, setWho, toggleWho, pass, mark, onKey, picker, openPick: setPickFor };
}
