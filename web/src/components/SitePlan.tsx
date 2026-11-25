/**
 * F-210 (V89): Lageplan als Menü-Seite – derselbe Baustein für „Platz wählen …“ (neues Pad,
 * Pad an anderen Platz), NewSlot und den Notizen-Modus (NF-08). Der Plan zeigt die Kacheln wie das
 * Radar im Cockpit; die gewählte Lage erscheint zusätzlich als Rahmen auf dem echten Desk (L1).
 *
 * Bedienung: Zeiger über den Plan = Zone wählen, Klick = übernehmen. Tastatur (P7): Pfeile = Kachel,
 * Umschalt + Pfeil = Seite (zweimal am Rand: Desk-Rand), Leertaste = ganz, Enter = übernehmen,
 * Esc = zurück zur Menü-Seite. Bildschirmleser: Auswahlliste mit einer Option je Zone.
 */
import { type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent, useEffect, useId, useRef, useState } from 'react';
import * as P from '../workspace/sitePlan';
import type { FRect } from '../workspace/tree';
import { PLAN_TEXT, TERMS } from '../workspace/terms';
import { Item } from './PanelFrame';

/** Vorschau-Rahmen auf dem Desk. */
export interface PlanPreview {
  rect: FRect;
  label: string;
}

export interface SitePlanProps {
  title: string;
  kind: P.PlanKind;
  tiles: P.PlanTile[];
  start: P.PlanPick;
  /** Seitenverhältnis des Desks (Breite / Höhe). */
  ar: number;
  /** Grund, warum diese Wahl nicht geht – sonst `null`. */
  blocked?: (pick: P.PlanPick) => string | null;
  /** Anteil eines neuen Slots am Desk-Rand (Vorschau, NewSlot). */
  edgeFrac?: (side: P.PlanSide) => number;
  /** Gewählte Lage als Vorschau auf dem Desk (`null` = keine). */
  onPreview: (p: PlanPreview | null) => void;
  onPick: (pick: P.PlanPick) => void;
  onBack: () => void;
}

const pct = (v: number) => `${(v * 100).toFixed(3)}%`;
const inner = (v: number) => P.PLAN_RIM + (1 - 2 * P.PLAN_RIM) * v;
const optId = (base: string, p: P.PlanPick) => `${base}-${p.tile ?? 'desk'}-${p.zone}`;

export function SitePlan(props: SitePlanProps) {
  const { tiles, kind } = props;
  const [pick, setPick] = useState<P.PlanPick>(props.start);
  const map = useRef<HTMLDivElement>(null);
  const base = useId().replace(/:/g, '');
  const why = props.blocked?.(pick) ?? null;
  const label = P.pickName(tiles, pick, kind);
  const rectOf = (p: P.PlanPick) => P.pickRect(tiles, p, !p.tile && p.zone !== 'full' && props.edgeFrac ? props.edgeFrac(p.zone) : 0.5);
  const rect = rectOf(pick);

  // Vorschau auf dem Desk folgt der Wahl; beim Verlassen der Seite verschwindet sie.
  useEffect(() => {
    props.onPreview(why ? null : { rect, label });
  }, [pick.tile, pick.zone, why]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => props.onPreview(null), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => map.current?.focus({ preventScroll: true }), []);

  const take = (p: P.PlanPick) => {
    if (props.blocked?.(p)) return;
    props.onPreview(null);
    props.onPick(p);
  };
  const at = (e: PointerEvent<HTMLDivElement> | MouseEvent<HTMLDivElement>): P.PlanPick | null => {
    const r = map.current?.getBoundingClientRect();
    if (!r || r.width <= 0 || r.height <= 0) return null;
    return P.pickAt(tiles, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const p = at(e);
    if (p && !P.samePick(p, pick)) setPick(p);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      return props.onBack();
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      return take(pick);
    }
    const next = P.keyPick(tiles, pick, e.key, e.shiftKey);
    if (!next) return;
    e.preventDefault();
    e.stopPropagation();
    setPick(next);
  };

  // Alle Optionen für Bildschirmleser: je Kachel fünf Zonen, dazu die vier Desk-Ränder.
  const options: P.PlanPick[] = [
    ...tiles.flatMap((t) => (['full', ...P.PLAN_SIDES] as P.PlanZone[]).map((zone) => ({ tile: t.id, zone }))),
    ...P.PLAN_SIDES.map((zone) => ({ tile: null, zone })),
  ];
  if (kind === 'pad') options.push({ tile: null, zone: 'full' });

  return (
    <>
      <Item icon="back" onClick={props.onBack}>{PLAN_TEXT.back}</Item>
      <li role="none" className="plan">
        <span className="plan__title" id={`${base}-t`}>{props.title}</span>
        <div
          ref={map}
          className="plan__map"
          style={{ '--ar': props.ar } as CSSProperties}
          tabIndex={0}
          role="listbox"
          title={TERMS.sitePlan}
          aria-labelledby={`${base}-t`}
          aria-describedby={`${base}-k`}
          aria-activedescendant={optId(base, pick)}
          onKeyDown={onKey}
          onPointerMove={onMove}
          onPointerDown={(e) => {
            const p = at(e);
            if (p) setPick(p);
          }}
          onClick={(e) => {
            const p = at(e);
            if (p) take(p);
          }}
        >
          <span className={`plan__rim${!pick.tile ? ` is-${pick.zone}` : ''}`} aria-hidden="true" />
          {tiles.map((t) => (
            <span
              key={t.id}
              className={`plan__tile${pick.tile === t.id ? ' is-sel' : ''}`}
              aria-hidden="true"
              style={{ left: pct(inner(t.rect.x)), top: pct(inner(t.rect.y)), width: pct(t.rect.w * (1 - 2 * P.PLAN_RIM)), height: pct(t.rect.h * (1 - 2 * P.PLAN_RIM)) }}
            >
              <span className="plan__name">{t.name}</span>
            </span>
          ))}
          <span
            className={`plan__hit${why ? ' is-blocked' : ''}`}
            aria-hidden="true"
            style={{ left: pct(inner(rect.x)), top: pct(inner(rect.y)), width: pct(rect.w * (1 - 2 * P.PLAN_RIM)), height: pct(rect.h * (1 - 2 * P.PLAN_RIM)) }}
          />
          <span className="plan__opts">
            {options.map((o) => (
              <span key={optId(base, o)} id={optId(base, o)} role="option" aria-selected={P.samePick(o, pick)} aria-disabled={props.blocked?.(o) ? true : undefined}>
                {P.pickName(tiles, o, kind)}
              </span>
            ))}
          </span>
        </div>
        <span className={`plan__label${why ? ' is-blocked' : ''}`} aria-live="polite">
          {label}
          {why && <span className="plan__why"> – {why}</span>}
        </span>
        <span className="plan__keys" id={`${base}-k`}>{PLAN_TEXT.keys}</span>
      </li>
      <Item icon="check" disabled={!!why} title={why ?? undefined} onClick={() => take(pick)}>
        {PLAN_TEXT.take}: {label}
      </Item>
    </>
  );
}
