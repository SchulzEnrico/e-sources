/**
 * F-169 Stufe 2: Dialog „Abgleich zwischen Geräten“ – Einrichten Schritt für Schritt (GitHub-Konto,
 * Schlüssel mit Recht „gist“, Verbinden), danach Zustand, „Jetzt abgleichen“ und „Trennen“.
 * Native <dialog> wie Profil und Hilfe (NF-03): Fokus aufs erste Feld, Esc schließt, Zustand als role=status.
 */
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { SYNC_TEXT as S } from '../workspace/terms';
import { GistError, SIGNUP_URL, TOKEN_URL, cleanToken, clearGist, connectGist, gistAvailable, loadGist, saveGist } from '../workspace/gist';
import { gistOff, gistState, syncNow, useGistState } from '../workspace/useGistSync';

const fmt = (ms: number) => new Date(ms).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });

export function SyncDialog({ onClose, onSend, say, onTour, children }: { onClose: () => void; onSend: () => void; say: (text: string) => void; onTour?: () => void; children?: ReactNode }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const st = useGistState();
  const [cfg, setCfg] = useState(loadGist);
  const [token, setToken] = useState('');
  const [msg, setMsg] = useState('');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    const back = document.activeElement as HTMLElement | null;
    if (!d.open) d.showModal();
    d.querySelector<HTMLElement>('input, .sync__main')?.focus();
    return () => (back?.isConnected && back !== document.body ? back : document.querySelector<HTMLElement>('button[aria-label="Einstellungen"]'))?.focus?.();
  }, []);

  const connect = async () => {
    const t = cleanToken(token);
    if (!t) return setMsg(S.empty);
    setChecking(true);
    setMsg(S.connecting);
    try {
      const c = await connectGist(t);
      saveGist(c);
      setCfg(c);
      setToken('');
      setMsg('');
      await syncNow();
      if (gistState().last === 'pushed') say(S.pushedFirst); // „übernommen“ sagt App selbst an
    } catch (e) {
      setMsg(e instanceof GistError ? e.message : 'Verbinden fehlgeschlagen.');
    } finally {
      setChecking(false);
    }
  };
  const disconnect = () => {
    clearGist();
    gistOff();
    setCfg(null);
    say(S.disconnected);
  };

  // nach dem ersten Senden kennt erst der Speicher die Gist-Id (für „Gist auf GitHub ansehen“)
  useEffect(() => {
    if (st.at) setCfg(loadGist());
  }, [st.at]);

  const state =
    st.status === 'busy' ? S.busy : st.status === 'error' ? st.error ?? '' : st.at ? S.at(fmt(st.at)) : S.never;

  return (
    <dialog
      ref={dlg}
      className="help sync"
      aria-labelledby="sync-title"
      aria-describedby="sync-intro"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === dlg.current && onClose()}
    >
      <header className="help__head">
        <h2 id="sync-title">{S.title}</h2>
        {onTour && (
          <button type="button" className="design__tour" onClick={onTour} title={S.tourTitle} aria-label={S.tourLabel}>
            {S.tourBtn}
          </button>
        )}
        <button type="button" className="help__x" onClick={onClose} title="Schließen (Esc)" aria-label="Abgleich schließen">
          <Icon name="close" size={14} />
        </button>
      </header>
      <div className="help__body sync__body">
        <p id="sync-intro">{S.intro}</p>
        <p className="sync__note">{S.what}</p>
        {!gistAvailable ? (
          <p role="status">{S.unavailable}</p>
        ) : cfg ? (
          <>
            <p className="sync__ok">
              <Icon name="check" size={14} /> {S.connected(cfg.login)}
            </p>
            <p role="status" aria-live="polite" className={st.status === 'error' ? 'sync__state sync__err' : 'sync__state'}>
              {state}
            </p>
            <p className="sync__note">{S.how}</p>
            <div className="sync__btns">
              <button type="button" className="sync__main" disabled={st.status === 'busy'} onClick={() => void syncNow()}>
                <Icon name="sync" size={14} /> {S.syncNow}
              </button>
              {cfg.gistId && (
                <a href={`https://gist.github.com/${cfg.gistId}`} target="_blank" rel="noopener noreferrer">
                  {S.view}
                </a>
              )}
              <button type="button" onClick={disconnect} title={S.disconnectTitle}>
                {S.disconnect}
              </button>
            </div>
          </>
        ) : (
          <>
            <ol className="sync__steps">
              <li>
                {S.step1}{' '}
                <a href={SIGNUP_URL} target="_blank" rel="noopener noreferrer">
                  {S.step1Link}
                </a>
              </li>
              <li>
                {S.step2}{' '}
                <a href={TOKEN_URL} target="_blank" rel="noopener noreferrer">
                  {S.step2Link}
                </a>
                <p className="sync__note">{S.expiry}</p>
              </li>
              <li>
                {S.step3}
                <form
                  className="sync__form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void connect();
                  }}
                >
                  <label>
                    <span>{S.field}</span>
                    <input type="password" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" spellCheck={false} placeholder="ghp_…" aria-describedby="sync-msg" />
                  </label>
                  <button type="submit" disabled={checking}>
                    {S.connect}
                  </button>
                </form>
                <p id="sync-msg" role="status" aria-live="polite" className="sync__err">
                  {msg}
                </p>
              </li>
            </ol>
            <p className="sync__note sync__privacy">
              <Icon name="catLock" size={14} /> {S.privacy}
            </p>
            <p className="sync__note sync__manual">
              {S.noGithub}{' '}
              <button type="button" onClick={onSend}>
                {S.sendInstead}
              </button>
            </p>
          </>
        )}
      </div>
      {children}
    </dialog>
  );
}
