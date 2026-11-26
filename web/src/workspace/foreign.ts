/**
 * F-230 Option C (V118): Fremddaten – was eine importierte Datei (MSPDI-XML, Trello-JSON) trägt, E-Sources aber nicht
 * kennt, bleibt unverändert am Projekt, Vorgang bzw. an der Person und geht beim Export zurück. Sichtbar, nicht bearbeitbar.
 * Hier nur Prüfen beim Laden (Dateiformat 12) und Hilfen; Import und Export in mspdi.ts.
 */
import type { ForeignBag, ForeignEl } from './types';

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
/** Grenzen, damit eine fremde Datei den Arbeitsstand nicht sprengt */
export const FOREIGN_EL_MAX = 400;
export const FOREIGN_TEXT_MAX = 200_000;
const NAME = /^[A-Za-z_][\w.-]{0,80}$/;

function parseEls(v: unknown): ForeignEl[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: ForeignEl[] = [];
  let size = 0;
  for (const e of v) {
    if (!isObj(e) || typeof e.n !== 'string' || !NAME.test(e.n) || typeof e.x !== 'string' || !e.x.startsWith(`<${e.n}`)) continue;
    size += e.x.length;
    if (size > FOREIGN_TEXT_MAX || out.length >= FOREIGN_EL_MAX) break;
    out.push({ n: e.n, x: e.x, ...(typeof e.after === 'string' && NAME.test(e.after) ? { after: e.after } : {}) });
  }
  return out.length ? out : undefined;
}

export function parseForeign(v: unknown): ForeignBag | undefined {
  if (!isObj(v)) return undefined;
  const out: ForeignBag = {};
  const mspdi = parseEls(v.mspdi);
  if (mspdi) out.mspdi = mspdi;
  if (isObj(v.assign)) {
    const assign: Record<string, ForeignEl[]> = {};
    for (const [k, els] of Object.entries(v.assign).slice(0, 100)) {
      const p = parseEls(els);
      if (k && p) assign[k] = p;
    }
    if (Object.keys(assign).length) out.assign = assign;
  }
  const summary = parseEls(v.summary);
  if (summary) out.summary = summary;
  if (typeof v.calSig === 'string' && v.calSig.length < 20_000) out.calSig = v.calSig;
  if (isObj(v.trello)) {
    try {
      const t = JSON.stringify(v.trello);
      if (t.length <= FOREIGN_TEXT_MAX) out.trello = JSON.parse(t) as Record<string, unknown>;
    } catch {
      /* nicht übernehmen */
    }
  }
  if (isObj(v.from) && (v.from.kind === 'mspdi' || v.from.kind === 'trello') && typeof v.from.at === 'string') {
    out.from = {
      kind: v.from.kind,
      at: v.from.at,
      ...(typeof v.from.name === 'string' ? { name: v.from.name.slice(0, 200) } : {}),
      ...(typeof v.from.app === 'string' ? { app: v.from.app.slice(0, 80) } : {}),
    };
  }
  return Object.keys(out).length ? out : undefined;
}

/** Anzahl mitgeführter Teile (für Anzeige „n Angaben aus MS Project mitgeführt“). */
export function foreignCount(b: ForeignBag | undefined): number {
  if (!b) return 0;
  return (b.mspdi?.length ?? 0) + (b.summary?.length ?? 0) + Object.values(b.assign ?? {}).reduce((s, x) => s + x.length, 0) + Object.keys(b.trello ?? {}).length;
}
