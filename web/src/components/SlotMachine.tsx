/**
 * F-170: Slotmaschine – Dialog mit Hebel und drei Walzen. Nach dem Ziehen laufen die Walzen und
 * bleiben nacheinander stehen; danach steht das Ergebnis da: „Jackpot“ mit allen doppelt geöffneten
 * Sources (je eine bleibt, die anderen sind zum Schließen angehakt) oder „Kein Treffer“.
 * Geschlossen wird nur über den Knopf (= Bestätigung). Barrierefreiheit (NF-03): native <dialog>,
 * Fokus im Dialog, Esc schließt; Walzen sind nur Schmuck (aria-hidden), das Ergebnis wird angesagt;
 * bei „Bewegung reduzieren“ kommt das Ergebnis ohne Walzenlauf. Kein Ton.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { type Cleanup, type DupGroup, cleanupFocus, cleanupOf, duplicatesOf, reelLabel, sourceLabel } from '../workspace/jackpot';
import { pointsText } from '../workspace/focus';
import { JACKPOT_TEXT, TERMS } from '../workspace/terms';
import type { Workspace } from '../workspace/types';
import { windowName } from '../workspace/windows';
import { sameUrlKey } from '../workspace/bookmarks';
import { Icon } from './Icon';
import { SiteIcon, useDisplay } from './SiteIcon';

interface Props {
  ws: Workspace;
  /** Desk dieses Fensters ('' = Main Desk) – dort bleibt bei Gleichstand der Fundort. */
  here: string;
  onCleanup: (c: Cleanup) => void;
  onClose: () => void;
}

type Phase = 'ready' | 'spin' | 'done';
const STOPS = [700, 1050, 1400];
const SHORT = 3;
const still = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export function SlotMachine({ ws, here, onCleanup, onClose }: Props) {
  const dlg = useRef<HTMLDialogElement>(null);
  const lever = useRef<HTMLButtonElement>(null);
  const [phase, setPhase] = useState<Phase>('ready');
  // Ergebnis wird beim Ziehen festgehalten, damit es sich während der Anzeige nicht verschiebt
  const [groups, setGroups] = useState<DupGroup[]>([]);
  const [skip, setSkip] = useState<Set<string>>(new Set());
  const [reels, setReels] = useState<string[]>(['', '', '']);
  const [arm, setArm] = useState(false);
  const [stopped, setStopped] = useState(3);
  const [said, setSaid] = useState('');
  const [pulled, setPulled] = useState(false);
  // lange Listen gekürzt: je Source die ersten SHORT Fundorte, der Rest auf Wunsch
  const [open, setOpen] = useState<Set<string>>(new Set());
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    const back = document.activeElement as HTMLElement | null;
    if (!d.open) d.showModal();
    lever.current?.focus();
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      (back?.isConnected ? back : document.querySelector<HTMLElement>('.toolbar .focus-meter'))?.focus?.();
    };
  }, []);

  // Alles, was gerade offen ist, als Zeichen für die Walzen (jede Seite einmal)
  const pool = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of ws.panels) for (const t of p.tabs) if (t.url && !seen.has(sameUrlKey(t.url))) seen.set(sameUrlKey(t.url), t.url);
    return seen.size ? [...seen.values()] : [''];
  }, [ws.panels]);
  const pick = (n: number) => pool[((n % pool.length) + pool.length) % pool.length];

  const pull = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    const found = duplicatesOf(ws, here);
    setGroups(found);
    setSkip(new Set());
    setOpen(new Set());
    setPulled(true);
    setArm(true);
    timers.current = [window.setTimeout(() => setArm(false), 450)];
    // Jackpot: dreimal dieselbe Source auf der Gewinnlinie; sonst drei verschiedene
    const r = Math.floor(Math.random() * pool.length);
    const final = found[0] ? [found[0].url, found[0].url, found[0].url] : [pick(r), pick(r + 1), pick(r + 2)];
    const result = found.length ? JACKPOT_TEXT.jackpot(found.reduce((n, g) => n + g.extra.length, 0), found.length) : JACKPOT_TEXT.none;
    setReels(final);
    const finish = () => {
      setStopped(3);
      setPhase('done');
      setSaid(result);
    };
    if (still()) return finish();
    setPhase('spin');
    setStopped(0);
    setSaid(JACKPOT_TEXT.spinning);
    timers.current.push(
      ...STOPS.map((ms, i) => window.setTimeout(() => setStopped(i + 1), ms)),
      window.setTimeout(finish, STOPS[STOPS.length - 1] + 80),
    );
  };
  const win = phase === 'done' && groups.length > 0;
  const { favicons } = useDisplay();
  const cell = (url: string, k: string | number, cls = 'slot__cell') => (
    <span key={k} className={cls}>
      {url ? <SiteIcon url={url} size={30} on={favicons} /> : <span className="slot__seven">7</span>}
      <span className="slot__host">{url ? reelLabel(url) : '–'}</span>
    </span>
  );

  const plan = useMemo(() => cleanupOf(ws, groups, skip), [ws, groups, skip]);
  const effect = useMemo(() => cleanupFocus(ws, plan), [ws, plan]);
  const desk = (win: string) => windowName(ws, win);
  const multiDesk = ws.windows.length > 0;
  const where = (g: DupGroup['keep']) => JACKPOT_TEXT.where(g.portal, g.tabNo, g.tabs, multiDesk ? desk(g.win) : desk(''));

  const confirm = () => {
    if (!plan.count) return;
    onCleanup(plan);
    const after = effect.after;
    const text = JACKPOT_TEXT.done(plan.count, after.color, pointsText(after.points));
    setSaid(text);
    setGroups([]);
    setPhase('ready');
    window.setTimeout(() => lever.current?.focus(), 0);
  };

  return (
    <dialog
      ref={dlg}
      className="help jackpot"
      aria-labelledby="jackpot-title"
      aria-describedby="jackpot-intro"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === dlg.current && onClose()}
    >
      <header className="help__head">
        <h2 id="jackpot-title">
          <Icon name="jackpot" size={16} className="icon jackpot__icon" /> {JACKPOT_TEXT.title}
        </h2>
        <button type="button" className="help__x" onClick={onClose} title="Schließen (Esc)" aria-label={`${JACKPOT_TEXT.title} schließen`}>
          <Icon name="close" size={14} />
        </button>
      </header>
      <p id="jackpot-intro" className="help__intro">
        {TERMS.jackpot.replace(/^[^=]*=\s*/, '').replace(/^./, (c) => c.toUpperCase())}.
      </p>
      <div className="help__body">
        <div className={`slot${win ? ' is-win' : ''}${phase === 'spin' ? ' is-spin' : ''}`}>
          <div className="slot__marquee" aria-hidden="true">
            <span className="slot__bulbs">{Array.from({ length: 14 }, (_, i) => <i key={i} />)}</span>
            <span className="slot__sign">Jackpot</span>
            <span className="slot__bulbs">{Array.from({ length: 14 }, (_, i) => <i key={i} />)}</span>
          </div>
          <div className="slot__body">
            <div className="slot__window" aria-hidden="true">
              {reels.map((url, i) => {
                const spinning = phase === 'spin' && i >= stopped;
                const at = Math.max(0, pool.indexOf(url));
                return (
                  <span key={i} className="slot__reel">
                    {spinning ? (
                      <span className="slot__strip" style={{ animationDuration: `${260 + i * 40}ms` }}>
                        {[...pool, ...pool, ...pool].slice(0, Math.max(6, pool.length * 2)).map((u, k) => cell(u, k))}
                        {[...pool, ...pool, ...pool].slice(0, Math.max(6, pool.length * 2)).map((u, k) => cell(u, `b${k}`))}
                      </span>
                    ) : (
                      <span className={pulled ? 'slot__still is-settle' : 'slot__still'}>
                        {cell(pick(at - 1 - i), 'a', 'slot__cell is-dim')}
                        {cell(url, 'm', win ? 'slot__cell is-hit' : 'slot__cell')}
                        {cell(pick(at + 1 + i), 'z', 'slot__cell is-dim')}
                      </span>
                    )}
                  </span>
                );
              })}
              <span className="slot__payline" />
            </div>
            <span className={arm ? 'slot__arm is-pulled' : 'slot__arm'} aria-hidden="true" onClick={() => phase !== 'spin' && pull()}>
              <span className="slot__stick" />
              <span className="slot__knob" />
              <span className="slot__hub" />
            </span>
          </div>
          <div className="slot__tray">
            <button ref={lever} type="button" className="jackpot__lever" onClick={pull} disabled={phase === 'spin'} aria-describedby="jackpot-said">
              <Icon name="jackpot" size={16} />
              {pulled ? JACKPOT_TEXT.again : JACKPOT_TEXT.lever}
            </button>
          </div>
          {win && (
            <span className="slot__coins" aria-hidden="true">
              {Array.from({ length: 18 }, (_, i) => <i key={i} style={{ left: `${(i * 53) % 100}%`, animationDelay: `${(i % 6) * 120}ms` }} />)}
            </span>
          )}
        </div>
        <p id="jackpot-said" className="jackpot__said" role="status">
          {said}
        </p>
        {phase === 'done' && groups.length > 0 && (
          <>
            <ul className="jackpot__list">
              {groups.map((g) => {
                const on = !skip.has(g.key);
                const id = `jp-${g.key.replace(/[^a-z0-9]/gi, '').slice(-24)}-${groups.indexOf(g)}`;
                return (
                  <li key={g.key} className="jackpot__group">
                    <label className="jackpot__check">
                      <input
                        type="checkbox"
                        checked={on}
                        aria-describedby={id}
                        onChange={() =>
                          setSkip((s) => {
                            const n = new Set(s);
                            if (on) n.add(g.key);
                            else n.delete(g.key);
                            return n;
                          })
                        }
                      />
                      <strong>{sourceLabel(g.url)}</strong> <span className="jackpot__times">{JACKPOT_TEXT.times(g.extra.length + 1)}</span>
                    </label>
                    <ul id={id} className="jackpot__where">
                      <li>
                        <span className="jackpot__tag is-keep">{JACKPOT_TEXT.keep}</span> {where(g.keep)}
                      </li>
                      {(open.has(g.key) ? g.extra : g.extra.slice(0, SHORT)).map((h) => (
                        <li key={h.panel + h.tab} className={on ? '' : 'is-off'}>
                          <span className="jackpot__tag">{JACKPOT_TEXT.close}</span> {where(h)}
                          {on && plan.portals.includes(h.panel) && <span className="jackpot__whole"> · {JACKPOT_TEXT.wholePortal}</span>}
                        </li>
                      ))}
                      {g.extra.length > SHORT && !open.has(g.key) && (
                        <li>
                          <button type="button" className="jackpot__more" onClick={() => setOpen((o) => new Set(o).add(g.key))}>
                            {JACKPOT_TEXT.more(g.extra.length - SHORT)}
                          </button>
                        </li>
                      )}
                    </ul>
                  </li>
                );
              })}
            </ul>
            <p className="jackpot__saves" role="status">
              {plan.count ? JACKPOT_TEXT.saves(pointsText(effect.saved), effect.before.color, effect.after.color) : JACKPOT_TEXT.nothingChosen}
            </p>
            <div className="jackpot__actions">
              <button type="button" className="jackpot__go" onClick={confirm} disabled={!plan.count}>
                {JACKPOT_TEXT.closeAll(plan.count)}
              </button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
