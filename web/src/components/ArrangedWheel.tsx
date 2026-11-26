/**
 * F-220 (V116, entschieden V100, R1–R7): Navigations-Rad, das sich nach der Nutzung ordnet und fest belegbar ist.
 * Hülle um `ModeWheel` mit ⋮ daneben (auch Rechtsklick, Umschalt+F10 bzw. Kontextmenü-Taste am Rad):
 * Anheften · Lösen · Nach vorn/hinten (Alt+Pfeil) · Rad belegen … · Automatisch ordnen · Auf Werk zurück.
 * R1: Die Nutzung (30 Tage) wird beim Öffnen gelesen und bleibt eingefroren, solange das Rad offen ist – eigene
 * Änderungen (Anheften, Belegen) wirken sofort. Meldungen stehen am Rad, mit Rückgängig (F-214). R6: beim ersten
 * Umsortieren einmal „Nach deiner Nutzung geordnet …“; Bildschirmleser hören die neue Reihenfolge.
 * Touren (F-217) greifen über die Id des Eintrags, nie über den Platz.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { WheelPrefs } from '../workspace/types';
import * as Wo from '../workspace/wheelOrder';
import { WHEEL_ORDER_TEXT as T } from '../workspace/terms';
import { noticeLater } from '../workspace/flash';
import { ModeWheel, type WheelOption } from './ModeWheel';
import { Item, Menu, MenuHead, MenuPages } from './PanelFrame';
import { Icon } from './Icon';
import { countUse, hintOnce, readUses, useWheelPrefs } from './wheelPrefs';

type Props = Parameters<typeof ModeWheel>[0] & {
  /** Name des Rads im Arbeitsstand, z. B. „cockpit“, „projectView“, „library“ */
  wheel: string;
};

export function ArrangedWheel(props: Props) {
  const { wheel, options, value, onChange, ...rest } = props;
  const [prefs, setPrefs] = useWheelPrefs(wheel);
  // R1: Nutzung beim Öffnen lesen – solange das Rad offen ist, ordnet sie nichts um
  const [counts] = useState(() => {
    const u = readUses();
    const now = Date.now();
    return (id: string) => Wo.useCount(u, wheel, id, now);
  });
  const ids = options.map((o) => o.id);
  const key = ids.join('|');
  const shownIds = useMemo(() => Wo.arrange(ids, prefs, counts, value), [key, prefs, value]); // eslint-disable-line react-hooks/exhaustive-deps
  const byId = new Map(options.map((o) => [o.id, o]));
  const shown: WheelOption[] = shownIds.map((id) => {
    const o = byId.get(id)!;
    return Wo.isPinned(prefs, id) ? { ...o, hint: o.hint ? `${o.hint} · ${T.pinMark}` : T.pinMark } : o;
  });
  const nameOf = (id: string) => byId.get(id)?.name ?? id;
  const cur = byId.has(value) ? value : shownIds[0];

  const [msg, setMsg] = useState<{ text: string; undo?: { p: WheelPrefs | undefined } } | null>(null);
  const [live, setLive] = useState('');
  const timer = useRef(0);
  const say = (text: string, undo?: { p: WheelPrefs | undefined }) => {
    window.clearTimeout(timer.current);
    setMsg({ text, undo });
    timer.current = noticeLater(() => setMsg(null), undo ? 3 : 2);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  // R6: erster Hinweis, wenn die Nutzung die Reihenfolge geändert hat
  useEffect(() => {
    if (Wo.reordered(ids, shownIds, prefs) && hintOnce(wheel)) {
      say(T.firstSort);
      setLive(T.order(shownIds.map(nameOf)));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const change = (next: WheelPrefs | undefined, text: string) => {
    const before = prefs;
    setPrefs(next);
    say(text, { p: before });
    const after = Wo.arrange(ids, next, counts, value);
    if (after.join('|') !== shownIds.join('|')) setLive(T.order(after.map(nameOf)));
  };
  const undo = () => {
    if (!msg?.undo) return;
    setPrefs(msg.undo.p);
    say(T.undone);
    setLive(T.order(Wo.arrange(ids, msg.undo.p, counts, value).map(nameOf)));
  };
  const step = (dir: -1 | 1) => {
    const next = Wo.move(prefs, shownIds, cur, dir);
    if (!next) return say(T.edge(nameOf(cur), dir < 0));
    change(next, T.moved(nameOf(cur), next.pinned!.indexOf(cur) + 1));
  };
  const pick = (id: string) => {
    countUse(wheel, id);
    onChange(id);
  };
  const pinned = Wo.isPinned(prefs, cur);
  const hidden = new Set(prefs?.hidden ?? []);

  return (
    <Menu
      wrapClass="awheel"
      icon={null}
      label={T.menu(props.label)}
      control={(toggle, open) => (
        <>
          <ModeWheel {...rest} options={shown} value={value} onChange={pick} onMenu={toggle} onAltStep={step} />
          <button type="button" className="awheel__more" title={`${T.menu(props.label)} (${T.menuHint})`} aria-label={T.menu(props.label)} aria-haspopup="menu" aria-expanded={open} onClick={toggle}>
            <Icon name="more" size={13} />
          </button>
          {msg && !open && (
            <span className="awheel__msg" role="status">
              {msg.text}
              {msg.undo && (
                <button type="button" className="help__run" onClick={undo}>
                  {T.undo}
                </button>
              )}
            </span>
          )}
          <span className="sr-only" aria-live="polite">
            {live}
          </span>
        </>
      )}
    >
      {(close) => (
        <MenuPages>
          {(page, go) => (
            <>
            {pageOf(page, go, close)}
            {/* V118: solange das Menü offen ist, steht die Meldung im Menü – am Rad läge sie unter der Liste */}
            {msg && (
              <li className="menu__note" role="status">
                {msg.text}
                {msg.undo && (
                  <button type="button" className="help__run" onClick={undo}>
                    {T.undo}
                  </button>
                )}
              </li>
            )}
            </>
          )}
        </MenuPages>
      )}
    </Menu>
  );
  function pageOf(page: string, go: (p: string) => void, close: () => void) {
    return (
            page === 'assign' ? (
              <>
                <MenuHead>{T.assignHead}</MenuHead>
                {ids.map((id) => {
                  const on = !hidden.has(id);
                  const last = on && ids.filter((x) => !hidden.has(x)).length <= 1;
                  return (
                    <Item
                      key={id}
                      checked={on}
                      disabled={last}
                      title={last ? T.assignLast : undefined}
                      icon={byId.get(id)?.icon}
                      onClick={() => {
                        const next = Wo.toggleHidden(prefs, ids, id);
                        if (next) change(next, on ? T.hidden(nameOf(id)) : T.shown(nameOf(id)));
                      }}
                    >
                      {nameOf(id)}
                    </Item>
                  );
                })}
                <li className="menu__sep" role="separator" />
                <Item onClick={() => go('')}>{T.backToMenu}</Item>
              </>
            ) : (
              <>
                <MenuHead>{nameOf(cur)}</MenuHead>
                <Item icon="pin" hint={pinned ? T.unpinHint : T.pinHint} onClick={() => (close(), change(pinned ? Wo.unpin(prefs, cur) : Wo.pin(prefs, cur), pinned ? T.unpinned(nameOf(cur)) : T.pinned(nameOf(cur))))}>
                  {pinned ? T.unpin(nameOf(cur)) : T.pin(nameOf(cur))}
                </Item>
                <Item icon="chevronUp" hint={T.moveHint} disabled={shownIds.indexOf(cur) <= 0} onClick={() => (close(), step(-1))}>
                  {T.front}
                </Item>
                <Item icon="chevronDown" disabled={shownIds.indexOf(cur) >= shownIds.length - 1} onClick={() => (close(), step(1))}>
                  {T.back}
                </Item>
                <li className="menu__sep" role="separator" />
                <Item icon="sliders" hint={T.assignHint} onClick={() => go('assign')}>
                  {T.assign}
                </Item>
                <Item checked={Wo.autoOn(prefs)} hint={T.autoHint} onClick={() => change(Wo.setAuto(prefs, !Wo.autoOn(prefs)), Wo.autoOn(prefs) ? T.autoOff : T.autoOn)}>
                  {T.auto}
                </Item>
                <Item icon="reload" hint={T.factoryHint} disabled={!prefs} onClick={() => (close(), change(undefined, T.factoryDone))}>
                  {T.factory}
                </Item>
              </>
            )
    );
  }
}
