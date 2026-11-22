import type { Named, PanelMeta, Workspace } from './types';

/**
 * F-27 Panels herauslösen: Alle Fenster der Anwendung teilen eine Arbeitsfläche. Jedes Panel merkt
 * sich sein Fenster (`PanelMeta.win`, fehlt = Hauptfenster), jedes Fenster hat seine eigene
 * Anordnung (Schlüssel mit Fenster-Id, siehe layoutKey). Die Fenster-Id steht in der Adresse
 * (`?win=…`) und übersteht so ein Neuladen.
 */
export const WIN_PARAM = 'win';
export const MAIN_NAME = 'Main Desk';

/** Fenster-Id aus der Adresse; '' = Hauptfenster. */
export function winFromSearch(search: string): string {
  const v = new URLSearchParams(search).get(WIN_PARAM) ?? '';
  return /^[\w-]{1,40}$/.test(v) ? v : '';
}

/** Adresse eines Fensters: dieselbe Seite, nur mit (oder ohne) Fenster-Id. */
export function windowUrl(href: string, win: string): string {
  const u = new URL(href);
  u.hash = '';
  if (win) u.searchParams.set(WIN_PARAM, win);
  else u.searchParams.delete(WIN_PARAM);
  return u.toString();
}

/** Hauptfenster und alle Zusatzfenster, in Reihenfolge. */
export function windowList(ws: Workspace): Named[] {
  return [{ id: '', name: MAIN_NAME }, ...ws.windows];
}

export function windowName(ws: Workspace, win: string): string {
  if (!win) return MAIN_NAME;
  return ws.windows.find((w) => w.id === win)?.name ?? 'Leerer Desk';
}

/** Kleinste freie Nummer ab 2: „Fenster 2“, „Fenster 3“ … */
export function nextWindowName(windows: Named[]): string {
  const used = new Set(windows.map((w) => w.name));
  let n = 2;
  while (used.has(`Desk ${n}`)) n++;
  return `Desk ${n}`;
}

/**
 * Hält die Fensterliste passend zu den Panels: Ein Fenster ohne Panels fällt weg, ein Panel in
 * einem unbekannten Fenster (z. B. neu angelegt in einem gerade geleerten Fenster) bekommt dessen
 * Eintrag zurück. Gibt dasselbe Objekt zurück, wenn nichts zu tun ist.
 */
export function syncWindows(ws: Workspace): Workspace {
  const used = new Set(ws.panels.map((p) => p.win).filter((w): w is string => !!w));
  let windows = ws.windows.filter((w) => used.has(w.id));
  for (const id of used) if (!windows.some((w) => w.id === id)) windows = [...windows, { id, name: nextWindowName(windows) }];
  const same = windows.length === ws.windows.length && windows.every((w, i) => w === ws.windows[i]);
  if (same) return ws;
  const ids = new Set(['', ...windows.map((w) => w.id)]);
  const winSetup = Object.fromEntries(Object.entries(ws.winSetup ?? {}).filter(([k]) => ids.has(k)));
  return { ...ws, windows, winSetup };
}

/**
 * Panels in ein Fenster verschieben ('' = Hauptfenster). Ein noch unbekanntes Fenster wird mit
 * der nächsten freien Nummer angelegt. In seinem neuen Fenster bekommt ein Panel eine freie Area
 * oder kommt in den Stapel ganz rechts (wie ein neues Panel); in der alten Anordnung rückt es heraus.
 */
export function moveToWindow(ws: Workspace, ids: string[], win: string): Workspace {
  const set = new Set(ids);
  if (!ws.panels.some((p) => set.has(p.id) && (p.win ?? '') !== win)) return ws;
  let windows = ws.windows;
  if (win && !windows.some((w) => w.id === win)) windows = [...windows, { id: win, name: nextWindowName(windows) }];
  const panels = ws.panels.map((p): PanelMeta => {
    if (!set.has(p.id) || (p.win ?? '') === win) return p;
    const { win: _old, ...rest } = p;
    return win ? { ...rest, win } : rest;
  });
  return syncWindows({ ...ws, panels, windows });
}

/**
 * F-165: Leeren Desk anlegen – ein neues Panel im neuen Fenster `win`; der Eintrag in der
 * Fensterliste („Desk N“) entsteht über syncWindows. Die Anordnung legt das Fenster selbst an.
 */
export function addDesk(ws: Workspace, win: string, panel: PanelMeta): Workspace {
  if (!win || ws.windows.some((w) => w.id === win)) return ws;
  return syncWindows({ ...ws, panels: [...ws.panels, { ...panel, win }], nextNumber: ws.nextNumber + 1 });
}

/** Alle Panels eines Zusatzfensters zurück ins Hauptfenster. */
export function returnAll(ws: Workspace, win: string): Workspace {
  if (!win) return ws;
  return moveToWindow(
    ws,
    ws.panels.filter((p) => p.win === win).map((p) => p.id),
    '',
  );
}

export function renameWindow(ws: Workspace, win: string, name: string): Workspace {
  const trimmed = name.trim();
  if (!win || !trimmed) return ws;
  return { ...ws, windows: ws.windows.map((w) => (w.id === win ? { ...w, name: trimmed } : w)) };
}

/**
 * F-160 Stufe 2: Ein Desk ohne eigenes offenes Browserfenster gilt als gesammelt – er ist in jedem
 * Fenster über den Umschalter und Alt/⌥+K erreichbar. `here` ist der Desk, den dieses Fenster zeigt;
 * `open` die Desks mit offenem Fenster. Reihenfolge wie im Umschalter (Main Desk zuerst).
 */
export function collectedDesks(ws: Workspace, here: string, open: ReadonlySet<string>): Named[] {
  return windowList(ws).filter((d) => d.id !== here && !open.has(d.id));
}

/** F-160: Ring für Alt/⌥+K – dieser Desk und alle gesammelten, in Umschalter-Reihenfolge. */
export function deskRing(ws: Workspace, here: string, open: ReadonlySet<string>): Named[] {
  return windowList(ws).filter((d) => d.id === here || !open.has(d.id));
}

/** F-160: nächster (dir 1) bzw. voriger (dir -1) Desk im Ring; null, wenn es keinen anderen gibt. */
export function stepDesk(ring: Named[], here: string, dir: 1 | -1): Named | null {
  if (ring.length < 2) return null;
  const at = Math.max(0, ring.findIndex((d) => d.id === here));
  return ring[(at + dir + ring.length) % ring.length];
}

/** F-160: Ansage nach dem Wechsel, z. B. „Desk 2 · 2 von 3 hier · 4 Portale“. */
export function deskSaid(name: string, index: number, total: number, portals: number): string {
  const n = portals === 1 ? '1 Portal' : `${portals} Portale`;
  return total > 1 ? `${name} · ${index + 1} von ${total} hier · ${n}` : `${name} · ${n}`;
}
