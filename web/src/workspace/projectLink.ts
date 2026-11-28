/** V146 (F-232 P10, Vorstufe F-211): Verweis auf ein Projekt-Dokument für den QR-Code der Blätter – wie im Report
 *  (S. 19 Arbeitspaketbeschreibung, S. 24 AP-Statusbericht: QR-Code zur Arbeitskarte). Die Adresse enthält nur Kennungen,
 *  nie Inhalte. Ohne Server (F-81) wirkt sie nur dort, wo das Projekt liegt (eigenes Gerät, Abgleich F-169). */

export const LINK_PARAMS = { project: 'projekt', form: 'blatt', row: 'zeile' } as const;

export type ProjectLink = { project: string; form?: string; row?: string };

const ID = /^[\w.:-]{1,80}$/;

/** Adresse aus der Basis (Seite ohne Suche/Anker) und den Kennungen. */
export function projectLinkUrl(base: string, l: ProjectLink): string {
  const u = new URL(base);
  u.search = '';
  u.hash = '';
  u.searchParams.set(LINK_PARAMS.project, l.project);
  if (l.form) u.searchParams.set(LINK_PARAMS.form, l.form);
  if (l.row) u.searchParams.set(LINK_PARAMS.row, l.row);
  return u.toString();
}

/** Liest den Verweis aus `location.search`; ungültige Kennungen fallen weg. */
export function parseProjectLink(search: string): ProjectLink | null {
  const q = new URLSearchParams(search);
  const project = q.get(LINK_PARAMS.project) ?? '';
  if (!ID.test(project)) return null;
  const form = q.get(LINK_PARAMS.form) ?? '';
  const row = q.get(LINK_PARAMS.row) ?? '';
  return { project, ...(ID.test(form) ? { form } : {}), ...(ID.test(row) ? { row } : {}) };
}

/** Dieselbe Adresse ohne die Verweis-Angaben (nach dem Öffnen aus der Adresszeile nehmen). */
export function withoutProjectLink(href: string): string {
  const u = new URL(href);
  for (const k of Object.values(LINK_PARAMS)) u.searchParams.delete(k);
  return u.toString();
}

/** Basis der App für Verweise: Seite ohne Suche und Anker (im Bericht-Fenster eine blob:-Adresse – dann leer). */
export function appBase(): string {
  if (typeof window === 'undefined' || !/^https?:$/.test(window.location.protocol)) return '';
  return `${window.location.origin}${window.location.pathname}`;
}

// Wartender Verweis: App wechselt in den Projekt-Modus, das Cockpit holt ihn sich (wie R7 „Öffnen“ an Risiken)
let pending: ProjectLink | null = null;
export function holdProjectLink(l: ProjectLink): void {
  pending = l;
}
export function takeProjectLink(): ProjectLink | null {
  const l = pending;
  pending = null;
  return l;
}
