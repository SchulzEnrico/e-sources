/**
 * F-95: Einführung (Tour) beim ersten Start – zeigt Schritt für Schritt auf die Bedienelemente.
 * Texte kommen aus help.ts/terms.ts (F-156), damit nichts doppelt geschrieben wird.
 * Schritte, deren Ziel gerade fehlt (z. B. kein Stack offen), werden übersprungen.
 */
import { helpById } from './help';

export interface TourStep {
  id: string;
  title: string;
  text: string;
  /** CSS-Selektor des Elements, auf das der Schritt zeigt; ohne = mittig. */
  target?: string;
  /** Ziel für die Dauer des Schritts aufklappen (Klasse is-open), z. B. den Stack mit Namen. */
  expand?: boolean;
  /** Teil des Ziels, um den der Rahmen liegt (nach dem Aufklappen), sonst das Ziel selbst. */
  ring?: string;
}

const t = (id: string) => helpById(id)?.text ?? '';

export const TOUR: TourStep[] = [
  {
    id: 'welcome',
    title: 'Willkommen bei E-Sources',
    text: 'Dein Source Desk fürs Web: mehrere Webseiten nebeneinander, ohne den Überblick zu verlieren. Die Tour dauert eine Minute – mit → weiter, mit Esc beenden.',
  },
  { id: 'desk', title: 'Desk', target: '.toolbar .tb-win', text: `${t('desk')} Klick auf den Namen benennt ihn um.` },
  { id: 'portal', title: 'Portal', target: 'main section[data-panel-id]', text: t('portal') + ' Am Namen ziehen tauscht oder versetzt es.' },
  { id: 'address', title: 'Adresse', target: 'main section[data-panel-id] input[aria-label="Adresse"]', text: 'Hier gibst du eine Adresse ein oder ziehst einen Link hinein – das Portal zeigt dann diese Source.' },
  { id: 'stackAdd', title: 'Portal stapeln', target: 'main section[data-panel-id] .win__stack-add', text: t('newPortal') + ' Die Farbe des Plus zeigt, wie die Fokusanzeige danach stünde.' },
  { id: 'stack', title: 'Stack', target: 'main .stack', expand: true, ring: '.stack__inner', text: t('stack') + ' Mit ▲/▼ oder dem Mausrad blätterst du; ein Klick auf einen Namen holt dieses Portal nach vorn.' },
  { id: 'newSlot', title: '+ NewSlot', target: '.tb-center .tb-add, .tb-center .tb-newslot', text: t('newSlot') },
  { id: 'view', title: 'View', target: '.tb-center .tb-view', text: t('view') },
  { id: 'search', title: 'Suchen', target: '.tb-center .search', text: t('search') },
  { id: 'focus', title: 'Fokusanzeige', target: '.toolbar .focus-meter', text: `${t('focus')} Ein Klick öffnet das Cockpit (Strg/⌘+.).` },
  { id: 'help', title: 'Hilfe', target: '.toolbar .tb-help', text: 'Alle Funktionen und Tastenkürzel findest du hier oder mit der Taste ?. Dort kannst du auch diese Tour wieder starten.' },
];

/** Nur Schritte, deren Ziel es gerade gibt (Schritte ohne Ziel immer). */
export function tourSteps(has: (selector: string) => boolean, steps: TourStep[] = TOUR): TourStep[] {
  return steps.filter((s) => !s.target || has(s.target));
}

const KEY = 'esource.tour.v1';

/** Wurde die Tour schon gezeigt (beendet oder übersprungen)? */
export function tourSeen(): boolean {
  try {
    return localStorage.getItem(KEY) === 'done';
  } catch {
    return true; // ohne Speicher nicht bei jedem Start aufdrängen
  }
}

export function setTourSeen(seen = true): void {
  try {
    if (seen) localStorage.setItem(KEY, 'done');
    else localStorage.removeItem(KEY);
  } catch {
    // ohne Speicher: nichts zu merken
  }
}
