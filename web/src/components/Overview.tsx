import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import type { Slot, Workspace } from '../workspace/types';
import { type Focus, focusText, overviewOf, pointsText } from '../workspace/focus';
import { loadColor } from '../workspace/workspace';

/**
 * F-29: Gesamtfokus als Equalizer-Pegel mit 9 Segmenten (Farben wie F-26/F-68). Ist zugleich der
 * Knopf, der das Master-Panel (F-28) ausklappt. Bildschirmleser hören Farbe und Punkte als Text.
 */
export function FocusMeter(props: { focus: Focus; open: boolean; onToggle: () => void; btnRef: RefObject<HTMLButtonElement> }) {
  const { focus, open } = props;
  const text = focusText(focus);
  // Ansage nur, wenn die Farbe wechselt – nicht bei jedem Punkt.
  const [said, setSaid] = useState('');
  const last = useRef(focus.color);
  useEffect(() => {
    if (last.current !== focus.color) setSaid(text);
    last.current = focus.color;
  }, [focus.color, text]);
  return (
    <>
      <button
        ref={props.btnRef}
        type="button"
        className={open ? 'focus-meter on' : 'focus-meter'}
        onClick={props.onToggle}
        aria-expanded={open}
        aria-controls="overview"
        aria-haspopup="dialog"
        aria-label={`${text}. Übersicht aller Panels ${open ? 'schließen' : 'öffnen'}`}
        title={`${text} · Klick: Übersicht aller Panels (Strg/⌘+.)`}
      >
        <span className="focus-meter__bars" aria-hidden="true">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className={i < focus.level ? 'is-lit' : undefined} style={{ ['--c' as string]: loadColor(i + 1) }} />
          ))}
        </span>
        <span className="focus-meter__num" aria-hidden="true">
          {pointsText(focus.points)}
        </span>
        <span className="focus-meter__caret" aria-hidden="true">
          ▾
        </span>
      </button>
      <span className="sr-only" role="status">
        {said}
      </span>
    </>
  );
}

export interface OverviewProps {
  ws: Workspace;
  slots: Slot[];
  focus: Focus;
  activeId: string | null;
  /** Abstand von oben (unter der Kopfleiste) in Pixeln. */
  top: number;
  /** Knopf, der die Übersicht öffnet; Fokus geht beim Schließen dorthin zurück. */
  toggleRef: RefObject<HTMLButtonElement>;
  onShow: (id: string) => void;
  onClose: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDismiss: () => void;
}

/**
 * F-28 Master-Panel, erste Stufe: alle Areas als Karten mit ihren Panels (Name, Domain, Tabs, Ampel).
 * Tastatur (NF-03): ↑/↓ Panels, ←/→ Areas, Pos1/Ende, Enter springt, Entf schließt, F2 benennt um, Esc.
 */
export function Overview(p: OverviewProps) {
  const areas = useMemo(() => overviewOf(p.ws, p.slots), [p.ws, p.slots]);
  const order = areas.flatMap((a) => a.panels.map((x) => x.meta.id));
  const [cur, setCur] = useState<string | null>(() => (p.activeId && order.includes(p.activeId) ? p.activeId : (order[0] ?? null)));
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [said, setSaid] = useState('');
  const btns = useRef(new Map<string, HTMLButtonElement>());
  const box = useRef<HTMLDivElement>(null);
  const focusId = cur && order.includes(cur) ? cur : (order[0] ?? null);

  // Fokus beim Öffnen und nach Bewegungen auf das gewählte Panel.
  useEffect(() => {
    if (!editing && focusId) btns.current.get(focusId)?.focus();
  }, [focusId, editing]);

  const dismiss = () => {
    p.onDismiss();
    p.toggleRef.current?.focus();
  };
  const go = (id: string | undefined) => id && setCur(id);
  const areaIndex = (id: string) => areas.findIndex((a) => a.panels.some((x) => x.meta.id === id));

  const commit = () => {
    if (editing && draft.trim()) p.onRename(editing, draft.trim());
    setEditing(null);
  };

  const onRowKey = (e: KeyboardEvent, id: string, name: string) => {
    const i = order.indexOf(id);
    const n = order.length;
    const ai = areaIndex(id);
    const firstOf = (k: number) => areas[(k + areas.length) % areas.length].panels[0]?.meta.id;
    const keys: Record<string, () => void> = {
      ArrowDown: () => go(order[(i + 1) % n]),
      ArrowUp: () => go(order[(i - 1 + n) % n]),
      ArrowRight: () => go(firstOf(ai + 1)),
      ArrowLeft: () => go(firstOf(ai - 1)),
      Home: () => go(order[0]),
      End: () => go(order[n - 1]),
      F2: () => {
        setDraft(name);
        setEditing(id);
      },
      Delete: () => close(id, name),
      Backspace: () => close(id, name),
      Escape: dismiss,
    };
    const f = keys[e.key];
    if (!f) return;
    e.preventDefault();
    e.stopPropagation();
    f();
  };

  const close = (id: string, name: string) => {
    const i = order.indexOf(id);
    setCur(order[i + 1] ?? order[i - 1] ?? null);
    p.onClose(id);
    setSaid(`Panel „${name}“ geschlossen.`);
  };

  return (
    <>
      <div className="overview-backdrop" onClick={dismiss} aria-hidden="true" />
      <div
        id="overview"
        ref={box}
        className="overview"
        role="dialog"
        aria-label="Übersicht aller Panels"
        aria-describedby="overview-help"
        style={{ top: p.top }}
        onBlur={(e) => {
          // Fokus wandert woanders hin (z. B. Tab ans Ende) → einklappen; nicht beim Knopf selbst (der schaltet um).
          const to = e.relatedTarget as Node | null;
          if (to && !box.current?.contains(to) && to !== p.toggleRef.current) p.onDismiss();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            dismiss();
          }
        }}
      >
        <div className="overview__head">
          <strong>Übersicht</strong>
          <span className="overview__focus">{focusText(p.focus)}</span>
          <span className="grow" />
          <button type="button" className="overview__x" onClick={dismiss} title="Übersicht schließen (Esc)" aria-label="Übersicht schließen">
            ×
          </button>
        </div>
        <p id="overview-help" className="sr-only">
          Pfeil hoch und runter wählt ein Panel, Pfeil links und rechts wechselt die Area. Enter zeigt das Panel, Entf schließt es, F2 benennt es um, Escape schließt die Übersicht.
        </p>
        {order.length === 0 && <p className="overview__empty">Noch keine Panels – lege oben mit „+ Area“ eine an.</p>}
        <div className="overview__grid">
          {areas.map((a) => (
            <section key={a.id} className="overview__area" aria-label={`${a.title}, ${a.panels.length} ${a.panels.length === 1 ? 'Panel' : 'Panels'}`}>
              <h3 className="overview__title">
                {a.title}
                <span className="muted"> · {a.panels.length}</span>
              </h3>
              <ul className="overview__list">
                {a.panels.map((x) => {
                  const id = x.meta.id;
                  const isActive = id === p.activeId;
                  const tabs = `${x.tabs} ${x.tabs === 1 ? 'Tab' : 'Tabs'}`;
                  if (editing === id)
                    return (
                      <li key={id} className="overview__row is-edit">
                        <input
                          className="overview__input"
                          value={draft}
                          autoFocus
                          aria-label="Neuer Panelname"
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={commit}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            // preventDefault: sonst löst dasselbe Enter auf der wieder fokussierten Zeile „Panel zeigen“ aus
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              commit();
                            }
                            if (e.key === 'Escape') {
                              e.preventDefault();
                              setEditing(null);
                            }
                          }}
                        />
                      </li>
                    );
                  return (
                    <li key={id} className={`overview__row${isActive ? ' is-active' : ''}${x.front ? ' is-front' : ''}`}>
                      <button
                        ref={(el) => {
                          if (el) btns.current.set(id, el);
                          else btns.current.delete(id);
                        }}
                        type="button"
                        className="overview__go"
                        tabIndex={id === focusId ? 0 : -1}
                        aria-current={isActive ? 'true' : undefined}
                        aria-label={`${x.meta.name}, ${x.host || 'leerer Tab'}, ${tabs}${x.front ? '' : ', im Stapel hinten'}${isActive ? ', aktiv' : ''}`}
                        onFocus={() => setCur(id)}
                        onKeyDown={(e) => onRowKey(e, id, x.meta.name)}
                        onClick={() => {
                          p.onShow(id);
                          dismiss();
                        }}
                      >
                        <span className="overview__dot" style={{ background: loadColor(x.tabs) }} aria-hidden="true" />
                        <span className="overview__name">{x.meta.name}</span>
                        <span className="overview__host">{x.host || '–'}</span>
                        <span className="overview__tabs">{tabs}</span>
                        {!x.front && <span className="overview__back">hinten</span>}
                      </button>
                      <button
                        type="button"
                        className="overview__tool"
                        tabIndex={-1}
                        title="Umbenennen (F2)"
                        aria-label={`„${x.meta.name}“ umbenennen`}
                        onClick={() => {
                          setDraft(x.meta.name);
                          setEditing(id);
                        }}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="overview__tool overview__tool--x"
                        tabIndex={-1}
                        title="Panel schließen (Entf)"
                        aria-label={`„${x.meta.name}“ schließen`}
                        onClick={() => close(id, x.meta.name)}
                      >
                        ×
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
        <span className="sr-only" role="status">
          {said}
        </span>
      </div>
    </>
  );
}
