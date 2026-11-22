/**
 * F-95/F-172: Touren – zeigen Schritt für Schritt auf die Bedienelemente.
 * Mehrere Touren (Start, Cockpit, später Design F-171), jede mit eigenem „gesehen“-Merker.
 * Texte kommen aus help.ts/terms.ts (F-156), damit nichts doppelt geschrieben wird.
 * Schritte, deren Ziel gerade fehlt (z. B. kein Stack offen), werden übersprungen.
 */
import { BROWSER_EXPORT, helpById } from './help';

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
  /** Schritt nur zeigen, wenn es dieses Element gibt (ohne Rahmen darum), z. B. nur im Import-Dialog. */
  when?: string;
  /** Schritt nur zeigen, wenn es dieses Element nicht gibt, z. B. „Datei wählen“ nur ohne offenen Dialog. */
  unless?: string;
  /** Aufzählung unter dem Text, z. B. die Wege je Browser. */
  list?: string[];
  /** Beschriftung eines Knopfs, der die Tour beendet und den nächsten Schritt selbst ausführt. */
  action?: string;
}

export type TourId = 'start' | 'cockpit' | 'design' | 'import';

const t = (id: string) => helpById(id)?.text ?? '';

/** Cockpit-Elemente liegen im Dialog #overview, Design-Elemente im Dialog #design. */
const C = '#overview';
const D = '#design';
/** Import-Dialog (F-36) */
const I = 'dialog.import';

export const TOURS: Record<TourId, TourStep[]> = {
  start: [
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
    { id: 'focus', title: 'Fokusanzeige', target: '.toolbar .focus-meter', text: `${t('focus')} Ein Klick öffnet das Cockpit (Strg/⌘+.) – dort gibt es eine eigene kurze Tour.` },
    { id: 'design', title: 'Design', target: '.toolbar .tb-design', text: `${t('design')} Der Knopf öffnet „Design anpassen“ – mit eigener kurzer Tour.` },
    { id: 'help', title: 'Hilfe', target: '.toolbar .tb-help', text: 'Alle Funktionen und Tastenkürzel findest du hier oder mit der Taste ?. Dort kannst du auch diese Tour wieder starten.' },
  ],
  cockpit: [
    {
      id: 'cockpit',
      title: 'Das Cockpit',
      text: `${t('cockpit')} Diese kurze Tour zeigt dir, was du hier siehst und tun kannst – mit → weiter, mit Esc beenden.`,
    },
    {
      id: 'focus',
      title: 'Fokusanzeige',
      target: `${C} .overview__head .overview__focus`,
      text: `${t('focus')} Grün heißt: gut überschaubar, Gelb: es wird voll, Rot: zu viel auf einmal.`,
    },
    {
      id: 'radar',
      title: 'Radar',
      target: `${C} .radar__maps`,
      text: 'Jeder Desk erscheint als kleiner Bildschirm mit seinen Slots an ihrer Stelle. Die Leiste in jedem Slot zeigt in Ampelfarben, wie viele Portale darauf liegen. Pfeiltasten wandern zwischen den Slots.',
    },
    {
      id: 'portals',
      title: 'Portale des Slots',
      target: `${C} .radar__detail`,
      text: 'Rechts stehen die Portale des gewählten Slots. Enter oder Klick zeigt das Portal – auch auf einem anderen Desk. F2 benennt um, Entf schließt.',
    },
    {
      id: 'move',
      title: 'Verschieben und Holen',
      target: `${C} .overview__list .overview__row`,
      text: 'V verschiebt ein Portal auf einen anderen Slot oder Desk, Umschalt+V den ganzen Slot. H holt ein Portal von einem anderen Desk hierher. Mit der Maus ziehst du eine Zeile auf einen Slot im Radar.',
    },
    {
      id: 'arrange',
      title: 'Slots anordnen',
      target: `${C} .radar__map`,
      text: 'Eine Slot-Kachel auf eine andere ziehen: in die Mitte = dort ablegen, an den Rand = an dieser Stelle einsetzen. Die Kante zwischen zwei Slots ändert die Größe. Per Tastatur: Alt+Pfeil versetzt, Alt+Umschalt+Pfeil ändert die Größe.',
    },
    {
      id: 'filter',
      title: 'Filtern',
      target: `${C} .radar__filter`,
      text: 'Findet Portale, Slots, Desks und Sources auf allen Desks. Pfeil runter springt in die Treffer.',
    },
    {
      id: 'again',
      title: 'Tour wieder starten',
      target: `${C} .overview__tour`,
      text: 'Über diesen Knopf, die Hilfe (?) oder die Suche („Tour Cockpit“) startest du diese Tour jederzeit wieder. Esc schließt das Cockpit.',
    },
  ],
  // F-181: vor dem Wählen der Datei (ohne Dialog) und im Import-Dialog; Schritte passen sich an
  import: [
    {
      id: 'intro',
      title: 'Lesezeichen übernehmen',
      text: 'Deine Lesezeichen aus dem Browser kommen in drei Schritten in die Library: im Browser als Datei speichern, die Datei hier wählen, festlegen, wie die Ordner zu Kategorien werden. Mit → weiter, mit Esc beenden.',
    },
    {
      id: 'export',
      title: 'Im Browser als Datei speichern',
      text: 'Jeder Browser kann seine Lesezeichen als HTML-Datei speichern. So findest du es:',
      list: BROWSER_EXPORT.map((b) => `${b.browser}: ${b.how}`),
      action: 'Datei wählen …',
    },
    {
      id: 'choose',
      title: 'Datei wählen',
      unless: I,
      text: 'Wähle die gespeicherte Datei – meist liegt sie im Ordner „Downloads“ und heißt z. B. „bookmarks.html“ oder „favorites.html“. E-Sources liest sie nur, hochgeladen wird nichts.',
      action: 'Datei wählen …',
    },
    { id: 'summary', title: 'Was die Datei bringt', target: `${I} .import__sum`, text: 'Hier steht, wie viele Lesezeichen neu sind. Was schon in der Library ist, wird übersprungen – du kannst also ohne Sorge noch einmal importieren.' },
    {
      id: 'how',
      title: 'Wie fein sortiert?',
      target: `${I} .import__how`,
      text: '„Ordner wie im Browser“ macht aus jedem Unterordner eine Kategorie. „Nur oberste Ordnerebene“ gibt weniger, größere Kategorien. „Alles in eine Kategorie“ sammelt alles unter dem heutigen Datum. Pfeiltasten wählen.',
    },
    { id: 'go', title: 'Übernehmen', target: `${I} .import__go`, text: 'Übernimmt die neuen Sources in die Library. Portalen wird dabei nichts zugeordnet – deine Desks bleiben, wie sie sind.' },
    {
      id: 'sort',
      title: 'Danach: Sortierhilfe',
      when: I,
      text: `${t('sortHelp')} Wieder starten: Knopf „Tour“ im Import-Dialog, Hilfe (?) oder Suche („Tour Import“).`,
    },
  ],
  // F-171 Stufe 1: wächst mit F-161 bis F-164 (Farben je Desk, Slot, Portal, Farbregeln)
  design: [
    {
      id: 'design',
      title: 'Design anpassen',
      text: `${t('design')} Diese kurze Tour zeigt dir die Einstellungen – mit → weiter, mit Esc beenden.`,
    },
    {
      id: 'theme',
      title: 'Darstellung',
      target: `${D} .design__theme`,
      text: 'Hell, Dunkel oder „Wie System“ – dann folgt E-Sources der Einstellung deines Geräts. Dazu gibt es zwei Stile im Look älterer Windows-Versionen.',
    },
    {
      id: 'accent',
      title: 'Akzentfarbe',
      target: `${D} .design__accent .look__swatches`,
      text: 'Die Akzentfarbe färbt Knöpfe, Rahmen und Markierungen. Ein Klick auf einen Farbpunkt übernimmt sie sofort für alle Desks.',
    },
    {
      id: 'custom',
      title: 'Eigene Farbe',
      target: `${D} .design__accent .look__custom`,
      text: 'Hier wählst du jede beliebige Farbe. Ist sie zu blass oder zu grell für die Darstellung, erscheint darunter ein Hinweis zum Kontrast.',
    },
    {
      id: 'later',
      title: 'Bald mehr',
      text: 'Hier kommen nach und nach eigene Farben je Desk, Slot und Portal dazu und Farbregeln, z. B. „alle Editoren mit blauem Rahmen“. Die Tour wächst mit. Wieder starten: Knopf „Tour“ oben im Dialog, Hilfe (?) oder Suche („Tour Design“).',
    },
  ],
};

/** Starttour (F-95) – bleibt für bestehende Stellen erhalten. */
export const TOUR = TOURS.start;

/** Nur Schritte, deren Ziel es gerade gibt (Schritte ohne Ziel immer). */
export function tourSteps(has: (selector: string) => boolean, steps: TourStep[] = TOUR): TourStep[] {
  return steps.filter((s) => (!s.target || has(s.target)) && (!s.when || has(s.when)) && (!s.unless || !has(s.unless)));
}

/** Speicherschlüssel je Tour; die Starttour behält ihren bisherigen Schlüssel. */
export const TOUR_KEY: Record<TourId, string> = { start: 'esource.tour.v1', cockpit: 'esource.tour.cockpit.v1', design: 'esource.tour.design.v1', import: 'esource.tour.import.v1' };

/** Wurde die Tour schon gezeigt (beendet oder übersprungen)? */
export function tourSeen(id: TourId = 'start'): boolean {
  try {
    return localStorage.getItem(TOUR_KEY[id]) === 'done';
  } catch {
    return true; // ohne Speicher nicht bei jedem Start aufdrängen
  }
}

export function setTourSeen(seen = true, id: TourId = 'start'): void {
  try {
    if (seen) localStorage.setItem(TOUR_KEY[id], 'done');
    else localStorage.removeItem(TOUR_KEY[id]);
  } catch {
    // ohne Speicher: nichts zu merken
  }
}

/** F-173: Touren von selbst starten? (Grundeinstellung an; von Hand starten geht immer.) */
const AUTO_KEY = 'esource.tours.auto';

export function toursAuto(): boolean {
  try {
    return localStorage.getItem(AUTO_KEY) !== 'off';
  } catch {
    return false;
  }
}

export function setToursAuto(on: boolean): void {
  try {
    if (on) localStorage.removeItem(AUTO_KEY);
    else localStorage.setItem(AUTO_KEY, 'off');
  } catch {
    // ohne Speicher: nichts zu merken
  }
}

/** F-173: Startet diese Tour jetzt von selbst? */
export const tourAutoStart = (id: TourId): boolean => toursAuto() && !tourSeen(id);
