import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import type { Slot, Workspace } from '../workspace/types';
import { type Focus, type OverviewArea, focusText, overviewOf, pointsText } from '../workspace/focus';
import { windowName } from '../workspace/windows';
import { NEW_AREA, loadColor } from '../workspace/workspace';
import type { MoveTarget } from '../workspace/move';

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
  /** F-146: belegte Areas, Stapel und Bildschirm (vorher in der Kopfleiste). */
  info: string;
  /** F-27: dieses Fenster ('' = Hauptfenster) und die gerade offenen Fenster. */
  win: string;
  open: Set<string>;
  /** Panel zeigen – liegt es in einem anderen Fenster, dort. */
  onShow: (id: string) => void;
  /** F-27: Panel aus einem anderen Fenster hierher holen. */
  onFetch: (id: string) => void;
  /** F-27: alle Panels eines anderen Fensters hierher holen. */
  onFetchAll: (win: string) => void;
  /** F-27: anderes Fenster nach vorn holen bzw. wieder öffnen. */
  onOpenWindow: (win: string) => void;
  onClose: (id: string) => void;
  onRename: (id: string, name: string) => void;
  /** F-28: Ziele für ein Panel bzw. seine ganze Area (whole). */
  moveTargets: (id: string, whole: boolean) => MoveTarget[];
  /** F-28: Panel bzw. ganze Area auf ein Ziel legen. */
  onMove: (id: string, target: MoveTarget, whole: boolean) => void;
  onDismiss: () => void;
}

/** F-28: Text eines Ziels, z. B. „Auf „Recherche“ (3)“ oder „Eigene neue Area – kein Platz“. */
export function targetText(t: MoveTarget, winName: string): string {
  if (!t.area) return `Ins ${winName}`;
  if (t.area === NEW_AREA) return `Eigene neue Area${t.disabled ? ' – kein Platz' : ''}`;
  return `Auf „${t.label}“${t.count > 1 ? ` (${t.count})` : ''}${t.disabled ? ' – Stapel voll' : ''}`;
}

/**
 * F-28: Zielauswahl im Master-Panel – Liste aller Ziele, nach Fenstern gruppiert. Tastatur:
 * ↑/↓/Pos1/Ende wählen, Enter legt ab, Esc bricht ab (Fokus zurück auf die Zeile).
 */
function MovePicker(props: { title: string; targets: MoveTarget[]; here: string; winName: (w: string) => string; onPick: (t: MoveTarget) => void; onCancel: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const usable = props.targets.filter((t) => !t.disabled);
  useEffect(() => {
    const first = box.current?.querySelector<HTMLButtonElement>('button.overview__target:not(:disabled)');
    (first ?? box.current?.querySelector<HTMLButtonElement>('button'))?.focus();
  }, []);
  const wins = [...new Set(props.targets.map((t) => t.win))].sort((a, b) => (a === props.here ? -1 : b === props.here ? 1 : 0));
  const onKey = (e: KeyboardEvent) => {
    const all = [...(box.current?.querySelectorAll<HTMLButtonElement>('button.overview__target:not(:disabled)') ?? [])];
    const i = all.indexOf(document.activeElement as HTMLButtonElement);
    const go = (k: number) => all[(k + all.length) % all.length]?.focus();
    const keys: Record<string, () => void> = {
      ArrowDown: () => go(i + 1),
      ArrowUp: () => go(i - 1),
      Home: () => go(0),
      End: () => go(all.length - 1),
      Escape: props.onCancel,
    };
    const f = keys[e.key];
    if (!f) return;
    e.preventDefault();
    e.stopPropagation();
    f();
  };
  return (
    <div ref={box} className="overview__pick" role="group" aria-label={props.title} onKeyDown={onKey}>
      <div className="overview__pick-head">
        <strong>{props.title}</strong>
        <button type="button" className="overview__x" onClick={props.onCancel} title="Abbrechen (Esc)" aria-label="Verschieben abbrechen">
          ×
        </button>
      </div>
      {usable.length === 0 && <p className="overview__empty">Gerade gibt es kein freies Ziel.</p>}
      {wins.map((w) => {
        const items = props.targets.filter((t) => t.win === w);
        if (items.length === 0) return null;
        const name = w === props.here ? 'Gleiches Fenster' : props.winName(w);
        return (
          <ul key={w || 'main'} className="overview__pick-list" aria-label={name}>
            <li className="overview__pick-win" aria-hidden="true">
              {name}
            </li>
            {items.map((t) => (
              <li key={`${t.win}/${t.area}`}>
                <button type="button" className="overview__target" disabled={t.disabled} onClick={() => props.onPick(t)}>
                  {targetText(t, props.winName(t.win))}
                </button>
              </li>
            ))}
          </ul>
        );
      })}
    </div>
  );
}

/**
 * F-28 Master-Panel, erste Stufe: alle Areas als Karten mit ihren Panels (Name, Domain, Tabs, Ampel).
 * Tastatur (NF-03): ↑/↓ Panels, ←/→ Areas, Pos1/Ende, Enter springt, Entf schließt, F2 benennt um, Esc.
 */
export function Overview(p: OverviewProps) {
  const areas = useMemo(() => overviewOf(p.ws, p.slots, p.win, p.open), [p.ws, p.slots, p.win, p.open]);
  const here = areas.filter((a) => !a.other);
  const others = areas.filter((a) => a.other);
  const order = areas.flatMap((a) => a.panels.map((x) => x.meta.id));
  const [cur, setCur] = useState<string | null>(() => (p.activeId && order.includes(p.activeId) ? p.activeId : (order[0] ?? null)));
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [said, setSaid] = useState('');
  /** F-28: Panel (oder ganze Area), für das gerade ein Ziel gewählt wird. */
  const [moving, setMoving] = useState<{ id: string; whole: boolean } | null>(null);
  const btns = useRef(new Map<string, HTMLButtonElement>());
  const box = useRef<HTMLDivElement>(null);
  const focusId = cur && order.includes(cur) ? cur : (order[0] ?? null);

  // Fokus beim Öffnen und nach Bewegungen auf das gewählte Panel.
  useEffect(() => {
    if (!editing && !moving && focusId) btns.current.get(focusId)?.focus();
  }, [focusId, editing, moving]);

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

  const fetch = (id: string, name: string) => {
    p.onFetch(id);
    setSaid(`Panel „${name}“ in dieses Fenster geholt.`);
  };

  const onRowKey = (e: KeyboardEvent, id: string, name: string, other: boolean) => {
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
      // F-27: H holt ein Panel aus einem anderen Fenster hierher.
      h: () => other && fetch(id, name),
      H: () => other && fetch(id, name),
      // F-28: V verschiebt das Panel, Umschalt+V die ganze Area.
      v: () => setMoving({ id, whole: false }),
      V: () => setMoving({ id, whole: true }),
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

  const card = (a: OverviewArea) => (
            <section
              key={a.id}
              className={a.other ? 'overview__area is-other' : 'overview__area'}
              aria-label={`${a.title}${a.other ? (a.open ? ', offen' : ', geschlossen') : ''}, ${a.panels.length} ${a.panels.length === 1 ? 'Panel' : 'Panels'}`}
            >
              <h3 className="overview__title">
                {a.title}
                <span className="muted"> · {a.panels.length}</span>
                {/* F-27: Zustand nicht nur als Farbe, sondern als Wort */}
                {a.other && <span className={a.open ? 'overview__state is-open' : 'overview__state'}>{a.open ? 'offen' : 'geschlossen'}</span>}
              </h3>
              {a.other && (
                <div className="overview__win-tools">
                  <button type="button" onClick={() => p.onOpenWindow(a.win)}>
                    {a.open ? 'Nach vorn holen' : 'Wieder öffnen'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      p.onFetchAll(a.win);
                      setSaid(`Alle Panels aus ${a.title} in dieses Fenster geholt.`);
                    }}
                  >
                    {p.win ? 'Alle hierher holen' : 'Alle ins Hauptfenster holen'}
                  </button>
                </div>
              )}
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
                        aria-label={`${x.meta.name}, ${x.host || 'leerer Tab'}, ${tabs}${x.front ? '' : ', im Stapel hinten'}${isActive ? ', aktiv' : ''}${a.other ? `, in ${a.title}` : ''}`}
                        onFocus={() => setCur(id)}
                        onKeyDown={(e) => onRowKey(e, id, x.meta.name, a.other)}
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
                        title="Verschieben (V, ganze Area: Umschalt+V)"
                        aria-label={`„${x.meta.name}“ verschieben`}
                        onClick={(e) => setMoving({ id, whole: e.shiftKey })}
                      >
                        ↦
                      </button>
                      {a.other && (
                        <button
                          type="button"
                          className="overview__tool"
                          tabIndex={-1}
                          title="Hierher holen (H)"
                          aria-label={`„${x.meta.name}“ in dieses Fenster holen`}
                          onClick={() => fetch(id, x.meta.name)}
                        >
                          ⇣
                        </button>
                      )}
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
  );

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
          <span className="overview__focus">{p.info}</span>
          <span className="grow" />
          <button type="button" className="overview__x" onClick={dismiss} title="Übersicht schließen (Esc)" aria-label="Übersicht schließen">
            ×
          </button>
        </div>
        <p id="overview-help" className="sr-only">
          Pfeil hoch und runter wählt ein Panel, Pfeil links und rechts wechselt die Area. Enter zeigt das Panel, auch in einem anderen Fenster. V verschiebt das Panel auf eine andere Area, Umschalt und V die ganze Area. H holt ein Panel aus einem anderen Fenster hierher. Entf schließt es, F2 benennt es um, Escape schließt die Übersicht.
        </p>
        {moving &&
          (() => {
            const m = p.ws.panels.find((x) => x.id === moving.id);
            if (!m) return null;
            const title = moving.whole ? `Ganze Area von „${m.name}“ verschieben nach …` : `„${m.name}“ verschieben nach …`;
            return (
              <MovePicker
                title={title}
                targets={p.moveTargets(moving.id, moving.whole).filter((t) => !(t.area === NEW_AREA && t.disabled && t.win === (m.win ?? '')))}
                here={m.win ?? ''}
                winName={(w) => windowName(p.ws, w)}
                onCancel={() => setMoving(null)}
                onPick={(t) => {
                  p.onMove(moving.id, t, moving.whole);
                  setSaid(`${moving.whole ? 'Area' : `„${m.name}“`} verschoben: ${targetText(t, windowName(p.ws, t.win))}${t.area && t.win !== (m.win ?? '') ? `, ${windowName(p.ws, t.win)}` : ''}.`);
                  setCur(moving.id);
                  setMoving(null);
                }}
              />
            );
          })()}
        {order.length === 0 && <p className="overview__empty">Noch keine Panels – lege oben mit „+ Area“ eine an.</p>}
        {others.length > 0 && <h2 className="overview__win">Dieses Fenster · {windowName(p.ws, p.win)}</h2>}
        <div className="overview__grid">{here.map(card)}</div>
        {others.length > 0 && (
          <>
            <h2 className="overview__win">Andere Fenster</h2>
            <div className="overview__grid">{others.map(card)}</div>
          </>
        )}
        <span className="sr-only" role="status">
          {said}
        </span>
      </div>
    </>
  );
}
