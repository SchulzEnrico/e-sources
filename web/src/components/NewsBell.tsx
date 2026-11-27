/**
 * V132 (F-231 K10d, B8): Glocke „Neuigkeiten“ im Cockpit-Kopf – wie Trellos Glocke. Zeigt, was der Abgleich an
 * Änderungen anderer an beobachteten Karten, Spalten und Boards gebracht hat, und @-Erwähnungen. Liste am Ort unter
 * der Glocke (Pfeile, Enter öffnet die Karte, Entf entfernt, Esc schließt); Neuigkeiten liegen nur auf diesem Gerät.
 */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { Workspace } from '../workspace/types';
import * as Wt from '../workspace/watch';
import { WATCH_TEXT as W } from '../workspace/terms';
import { Icon } from './Icon';
import { openNote } from './SourceChips';

const when = (at: number) => {
  if (!at) return '';
  const d = new Date(at);
  const same = d.toDateString() === new Date().toDateString();
  return same ? d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
};

export function NewsBell({ ws, say, onOpen }: { ws: Workspace; say: (t: string) => void; onOpen?: () => void }) {
  const [list, setList] = useState<Wt.NewsItem[]>(Wt.loadNews);
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const on = () => setList(Wt.loadNews());
    window.addEventListener(Wt.NEWS_EVENT, on);
    window.addEventListener('storage', on);
    return () => (window.removeEventListener(Wt.NEWS_EVENT, on), window.removeEventListener('storage', on));
  }, []);
  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => box.current?.querySelector<HTMLElement>('[data-news]')?.focus() ?? box.current?.querySelector<HTMLElement>('button')?.focus(), 0);
    const away = (e: MouseEvent) => !(e.target as Element)?.closest?.('.news') && setOpen(false);
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [open]);
  const unread = Wt.unreadOf(list);
  const save = (next: Wt.NewsItem[]) => (setList(next), Wt.saveNews(next));
  const watched = Wt.watchList(ws);
  const close = () => (setOpen(false), btn.current?.focus());
  const go = (x: Wt.NewsItem) => {
    save(Wt.markRead(list, x.id));
    setOpen(false);
    openNote(x.note);
    onOpen?.();
  };
  const onKey = (e: KeyboardEvent<HTMLElement>, x?: Wt.NewsItem) => {
    if (e.key === 'Escape') return void (e.preventDefault(), e.stopPropagation(), close());
    const all = [...(box.current?.querySelectorAll<HTMLElement>('[data-news]') ?? [])];
    const k = all.indexOf(e.currentTarget as HTMLElement);
    const to = e.key === 'ArrowDown' ? all[k + 1] : e.key === 'ArrowUp' ? all[k - 1] : e.key === 'Home' ? all[0] : e.key === 'End' ? all[all.length - 1] : undefined;
    if (to) return void (e.preventDefault(), to.focus());
    if (x && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault();
      save(Wt.dropNews(list, x.id));
      (all[k + 1] ?? all[k - 1])?.focus();
    }
  };
  return (
    <span className="news">
      <button
        ref={btn}
        type="button"
        className={`overview__tour news__bell${unread ? ' has-news' : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={W.bellLabel(unread)}
        title={W.bellHint}
        onClick={() => setOpen(!open)}
      >
        <Icon name="bell" />
        <span className="c-label">{W.bell}</span>
        {unread > 0 && <span className="news__count" aria-hidden="true">{unread}</span>}
      </button>
      {open && (
        <div ref={box} className="news__panel" role="dialog" aria-label={W.bell} onKeyDown={(e) => e.key === 'Escape' && (e.stopPropagation(), close())}>
          <div className="news__head">
            <strong>{W.bell}</strong>
            <button type="button" className="help__run" disabled={!unread} onClick={() => (save(Wt.markRead(list)), say(W.allReadSaid))}>
              {W.allRead}
            </button>
          </div>
          {list.length ? (
            <ul className="news__list">
              {list.map((x) => (
                <li key={x.id} className={x.read ? 'is-read' : undefined}>
                  <button type="button" data-news className="news__item" title={W.open(x.title)} onClick={() => go(x)} onKeyDown={(e) => onKey(e, x)}>
                    <span className="news__what">
                      {x.kind === 'mention' && <b>@ </b>}
                      {W.kind[x.kind](x.by)}
                      {x.via && x.kind !== 'mention' && <span className="lc__muted"> · {W.via[x.via]}{x.where ? ` „${x.where}“` : ''}</span>}
                    </span>
                    <span className="news__title">{x.title}</span>
                    {x.text && <span className="news__text">{x.text}</span>}
                    <span className="news__at lc__muted">{when(x.at)}</span>
                  </button>
                  <button type="button" className="news__x" aria-label={W.remove(x.title)} onClick={() => save(Wt.dropNews(list, x.id))}>
                    <Icon name="close" size={11} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="lc__muted news__empty">{W.empty}</p>
          )}
          <p className="lc__muted news__foot">
            {W.watchList(watched.cards.length, watched.cols.length, watched.boards.length)} {W.noSync}
          </p>
        </div>
      )}
    </span>
  );
}
