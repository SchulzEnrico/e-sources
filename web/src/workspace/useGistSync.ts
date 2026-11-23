/**
 * F-169 Stufe 2: Läuft einmal je Browserfenster in App (überlebt den Desk-Wechsel). Holt beim Start
 * und beim Zurückkehren, sendet nach Änderungen (30 s Ruhe) und beim Verlassen der App. Mehrere
 * Fenster stimmen sich über eine Web-Lock ab, damit nur eines zugleich abgleicht.
 */
import { useEffect, useRef, useSyncExternalStore, type Dispatch } from 'react';
import { GistError, fetchRemote, loadGist, planSync, pushRemote, saveGist } from './gist';
import { loadSyncMeta, storeImported } from './storage';
import { deviceLabel, type TransferFile } from './transfer';
import type { Workspace } from './types';
import type { Action } from './useWorkspace';

export interface GistState {
  status: 'off' | 'idle' | 'busy' | 'error' | 'conflict';
  /** Letzter erfolgreicher Abgleich (ms). */
  at?: number;
  error?: string;
  /** Bei Konflikt: der Stand auf GitHub. */
  remote?: TransferFile;
  /** Kurze Meldung zum letzten Schritt (geholt/gesendet), für Ansage und Anzeige. */
  last?: 'pulled' | 'pushed' | 'same';
}

let state: GistState = { status: loadGist() ? 'idle' : 'off' };
const subs = new Set<() => void>();
const set = (s: GistState) => {
  state = s;
  subs.forEach((f) => f());
};
export const useGistState = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => state,
  );

/** Aktueller Zustand außerhalb von React (z. B. direkt nach „Verbinden“). */
export const gistState = () => state;

type Force = 'local' | 'remote' | undefined;
let runner: ((force?: Force) => Promise<void>) | null = null;
/** Jetzt abgleichen (z. B. nach „Verbinden“ oder Klick auf „Jetzt abgleichen“). */
export const syncNow = (force?: Force) => (runner ? runner(force) : Promise.resolve());
/** Nach „Trennen“: Anzeige zurücksetzen. */
export const gistOff = () => set({ status: 'off' });

const QUIET = 30_000;
const device = () => deviceLabel(navigator.userAgent, navigator.maxTouchPoints > 1);

export function useGistSync(ws: Workspace, dispatch: Dispatch<Action>) {
  const wsRef = useRef(ws);
  wsRef.current = ws;
  const busy = useRef(false);

  useEffect(() => {
    const run = async (force?: Force) => {
      const c = loadGist();
      if (!c) return set({ status: 'off' });
      if (busy.current || (state.status === 'conflict' && !force)) return;
      busy.current = true;
      set({ ...state, status: 'busy', error: undefined });
      try {
        const remote = await fetchRemote(c);
        const plan = force === 'local' ? 'push' : force === 'remote' && remote ? 'pull' : planSync(loadSyncMeta().changedAt, c, remote?.savedAt ?? null);
        if (plan === 'conflict') return set({ status: 'conflict', at: state.at, remote: remote! });
        if (plan === 'pull') {
          storeImported(remote!.workspace);
          dispatch({ type: 'replace', ws: remote!.workspace });
          saveGist({ ...c, seen: remote!.savedAt, syncedAt: Date.now() });
          return set({ status: 'idle', at: Date.now(), last: 'pulled' });
        }
        if (plan === 'push') {
          const t0 = Date.now(); // Änderungen während des Sendens zählen danach als neu
          const r = await pushRemote(c, wsRef.current, device());
          saveGist({ ...(loadGist() ?? c), gistId: r.gistId, seen: r.savedAt, syncedAt: t0 });
          return set({ status: 'idle', at: Date.now(), last: 'pushed' });
        }
        set({ status: 'idle', at: Date.now(), last: 'same' });
      } catch (e) {
        set({ status: 'error', at: state.at, error: e instanceof GistError ? e.message : 'Abgleich fehlgeschlagen.' });
      } finally {
        busy.current = false;
      }
    };
    // nur ein Fenster zugleich (Web Locks; ohne sie läuft es trotzdem)
    const locked = (force?: Force) =>
      navigator.locks?.request ? navigator.locks.request('esource-gist', { ifAvailable: true }, (l) => (l ? run(force) : undefined)).then(() => undefined) : run(force);
    runner = locked;
    let last = 0;
    const back = () => {
      if (document.visibilityState !== 'visible' || Date.now() - last < 15_000) return;
      last = Date.now();
      void locked();
    };
    const leave = () => {
      const c = loadGist();
      if (document.visibilityState === 'hidden' && c && loadSyncMeta().changedAt > c.syncedAt) void locked();
    };
    const first = setTimeout(() => {
      last = Date.now();
      void locked();
    }, 1500);
    document.addEventListener('visibilitychange', back);
    document.addEventListener('visibilitychange', leave);
    window.addEventListener('focus', back);
    return () => {
      clearTimeout(first);
      document.removeEventListener('visibilitychange', back);
      document.removeEventListener('visibilitychange', leave);
      window.removeEventListener('focus', back);
      if (runner === locked) runner = null;
    };
  }, [dispatch]);

  // nach Änderungen: 30 s Ruhe, dann senden (run prüft selbst, ob es etwas zu senden gibt)
  useEffect(() => {
    if (state.status === 'off') return;
    const t = setTimeout(() => void syncNow(), QUIET);
    return () => clearTimeout(t);
  }, [ws]);
}
