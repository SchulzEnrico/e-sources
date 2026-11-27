/**
 * F-169 Stufe 2: Läuft einmal je Browserfenster in App (überlebt den Desk-Wechsel). Holt beim Start
 * und beim Zurückkehren, sendet nach Änderungen (30 s Ruhe) und beim Verlassen der App. Mehrere
 * Fenster stimmen sich über eine Web-Lock ab, damit nur eines zugleich abgleicht.
 */
import { useEffect, useRef, useSyncExternalStore, type Dispatch } from 'react';
import { GistError, fetchRemote, loadGist, newerWins, planSync, pushRemote, saveGist } from './gist';
import { WORKSPACE_KEY, keepDeviceFields, loadSyncMeta, parseWorkspace, storeImported } from './storage';
import { deviceLabel } from './transfer';
import type { Workspace } from './types';
import type { Action } from './useWorkspace';
import * as Wt from './watch';
import { switchOf } from './ruleSet';
import { WATCH_TEXT } from './terms';

export interface GistState {
  status: 'off' | 'idle' | 'busy' | 'error';
  /** Letzter erfolgreicher Abgleich (ms). */
  at?: number;
  error?: string;
  /** Beim Holen wurden Änderungen dieses Geräts ersetzt – „Rückgängig“ möglich. */
  undo?: boolean;
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
const BACKUP = 'esource.gist.backup';

/** „Rückgängig“ nach dem Holen: Stand dieses Geräts von vorher zurück; er wird danach gesendet. */
export function restoreBackup(dispatch: Dispatch<Action>): boolean {
  try {
    const ws = parseWorkspace(JSON.parse(localStorage.getItem(BACKUP) ?? 'null'));
    if (!ws) return false;
    storeImported(ws);
    const c = loadGist();
    if (c) saveGist({ ...c, syncedAt: 0 }); // als lokale Änderung zählen, damit er gesendet wird
    dispatch({ type: 'replace', ws });
    localStorage.removeItem(BACKUP);
    void syncNow();
    return true;
  } catch {
    return false;
  }
}
const device = () => deviceLabel(navigator.userAgent, navigator.maxTouchPoints > 1);

export function useGistSync(ws: Workspace, dispatch: Dispatch<Action>) {
  const wsRef = useRef(ws);
  wsRef.current = ws;
  const busy = useRef(false);

  useEffect(() => {
    const run = async (force?: Force) => {
      const c = loadGist();
      if (!c) return set({ status: 'off' });
      if (busy.current) return;
      busy.current = true;
      set({ ...state, status: 'busy', error: undefined });
      try {
        const remote = await fetchRemote(c);
        const changedAt = loadSyncMeta().changedAt;
        let plan = force === 'local' ? 'push' : force === 'remote' && remote ? 'pull' : planSync(changedAt, c, remote?.savedAt ?? null);
        const both = plan === 'conflict';
        if (both) plan = newerWins(changedAt, remote!.savedAt);
        if (plan === 'pull') {
          // Änderungen dieses Geräts werden ersetzt: vorher für „Rückgängig“ sichern
          if (both) {
            try {
              localStorage.setItem(BACKUP, localStorage.getItem(WORKSPACE_KEY) ?? '');
            } catch {
              // ohne Platz kein Rückgängig
            }
          }
          const next = keepDeviceFields(remote!.workspace, wsRef.current); // Bildschirm-Einstellung bleibt die dieses Geräts
          collectNews(wsRef.current, next); // V132 (F-231 K10d): Neuigkeiten aus dem Unterschied
          storeImported(next);
          dispatch({ type: 'replace', ws: next });
          saveGist({ ...c, seen: remote!.savedAt, syncedAt: Date.now() });
          return set({ status: 'idle', at: Date.now(), last: 'pulled', undo: both });
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

/** V132 (F-231 K10d, B8): Neuigkeiten aus dem Abgleich ablegen und – nach Schalter A8 – als Mitteilung des Systems zeigen. */
export function collectNews(before: Workspace, after: Workspace): Wt.NewsItem[] {
  try {
    const fresh = Wt.newsOf(before, after);
    if (!fresh.length) return [];
    Wt.saveNews(Wt.mergeNews(Wt.loadNews(), fresh));
    if (switchOf(after, 'newsSystem') === 'on' && typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
      const first = fresh[0];
      const body = fresh.length === 1 ? `${WATCH_TEXT.kind[first.kind](first.by)}: ${first.title}` : `${fresh.length} × – ${fresh.slice(0, 3).map((x) => x.title).join(', ')}`;
      try {
        new Notification(WATCH_TEXT.systemTitle, { body, tag: 'esource-news' });
      } catch {
        /* z. B. iOS ohne App auf dem Startbildschirm */
      }
    }
    return fresh;
  } catch {
    return [];
  }
}
