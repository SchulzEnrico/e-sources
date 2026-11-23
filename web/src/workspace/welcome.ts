/**
 * F-205: Begrüßung wählbar – Standard (Tageszeit), Regionalgruß, bekannter Spruch, Zufall aus eigener
 * Auswahl oder eigener Text mit {Name}. Liste freigegeben im Claude Doc „Begrüßungen zur Auswahl“
 * (Enrico, 23.11.2026): 18 Regionalgrüße, 10 internationale, 20 Sprüche (Original / mit Name / deutsch).
 * Grüße mit Tageszeit fallen außerhalb ihrer Zeit auf den Standard zurück. Nur Spruchtext – kein Logo,
 * keine Stimme der Vorlage (Marken).
 */

/** Stunden [von, bis) – z. B. [11, 14] = 11:00 bis 13:59. */
export type Hours = [number, number];

export interface Greet {
  id: string;
  /** Gruß wie in der Liste, z. B. „Moin“ */
  label: string;
  /** Anzeige mit Platzhalter {Name} */
  text: string;
  /** Region bzw. Sprache */
  where: string;
  hours?: Hours;
}

export interface Quote {
  id: string;
  /** Original */
  orig: string;
  /** Original mit Name */
  name: string;
  /** deutsche Fassung */
  de: string;
  /** Herkunft */
  from: string;
  /** „Passt zu“ – nur Hinweis */
  fits: string;
  hours?: Hours;
}

const DAY: Hours = [6, 18];
const MORNING: Hours = [5, 11];

export const REGIONAL: Greet[] = [
  { id: 'moin', label: 'Moin', text: 'Moin, {Name}!', where: 'Hamburg, Bremen, Schleswig-Holstein, nördl. Niedersachsen' },
  { id: 'moinmoin', label: 'Moin moin', text: 'Moin moin, {Name}!', where: 'Norddeutschland (gilt als gesprächig)' },
  { id: 'moinsen', label: 'Moinsen', text: 'Moinsen, {Name}!', where: 'Norddeutschland, locker' },
  { id: 'servus', label: 'Servus', text: 'Servus, {Name}!', where: 'Bayern, Österreich, Süddeutschland' },
  { id: 'gruessgott', label: 'Grüß Gott', text: 'Grüß Gott, {Name}!', where: 'Bayern, Baden-Württemberg, Österreich' },
  { id: 'griassdi', label: 'Griaß di', text: 'Griaß di, {Name}!', where: 'Bayern, Österreich' },
  { id: 'habedere', label: 'Habedere', text: 'Habedere, {Name}!', where: 'Bayern, Österreich' },
  { id: 'grueezi', label: 'Grüezi', text: 'Grüezi, {Name}!', where: 'Schweiz' },
  { id: 'hoi', label: 'Hoi', text: 'Hoi {Name}!', where: 'Schweiz, locker' },
  { id: 'salue', label: 'Salü', text: 'Salü {Name}!', where: 'Schweiz, Saarland, Elsass' },
  { id: 'gude', label: 'Gude', text: 'Gude, {Name}!', where: 'Hessen' },
  { id: 'tach', label: 'Tach', text: 'Tach, {Name}!', where: 'überall, umgangssprachlich (v. a. Westen und Norden)', hours: DAY },
  { id: 'gunntach', label: 'Gunn Tach', text: 'Gunn Tach, {Name}!', where: 'Rheinland, Ruhrgebiet', hours: DAY },
  { id: 'glueckauf', label: 'Glück auf', text: 'Glück auf, {Name}!', where: 'Ruhrgebiet, Erzgebirge (Bergmannsgruß)' },
  { id: 'jutentach', label: 'Juten Tach', text: 'Juten Tach, {Name}!', where: 'Berlin', hours: DAY },
  { id: 'na', label: 'Na?', text: 'Na, {Name}?', where: 'Berlin, Norddeutschland' },
  { id: 'mahlzeit', label: 'Mahlzeit', text: 'Mahlzeit, {Name}!', where: 'Büro, Kantine, Baustelle', hours: [11, 14] },
  { id: 'gruessdich', label: 'Grüß dich', text: 'Grüß dich, {Name}!', where: 'Mitteldeutschland, allgemein' },
];

export const INTERNATIONAL: Greet[] = [
  { id: 'hi', label: 'Hello / Hi', text: 'Hi {Name}!', where: 'Englisch' },
  { id: 'hej', label: 'Hej', text: 'Hej {Name}!', where: 'Schwedisch, Dänisch' },
  { id: 'hola', label: 'Hola', text: '¡Hola, {Name}!', where: 'Spanisch' },
  { id: 'ciao', label: 'Ciao', text: 'Ciao {Name}!', where: 'Italienisch' },
  { id: 'salut', label: 'Bonjour / Salut', text: 'Salut {Name} !', where: 'Französisch' },
  { id: 'ola', label: 'Olá', text: 'Olá, {Name}!', where: 'Portugiesisch' },
  { id: 'merhaba', label: 'Merhaba', text: 'Merhaba {Name}!', where: 'Türkisch' },
  { id: 'aloha', label: 'Aloha', text: 'Aloha, {Name}!', where: 'Hawaiisch' },
  { id: 'konnichiwa', label: 'Konnichiwa', text: 'Konnichiwa, {Name}!', where: 'Japanisch' },
  { id: 'ahoj', label: 'Ahoj', text: 'Ahoj {Name}!', where: 'Tschechisch, Slowakisch' },
];

export const QUOTES: Quote[] = [
  { id: 'commander', orig: 'Welcome back, Commander.', name: 'Welcome back, Commander {Name}.', de: 'Willkommen zurück, Commander {Name}.', from: 'Command & Conquer (EVA, seit 1995)', fits: 'Cockpit, Strategen' },
  { id: 'freeman', orig: 'Rise and shine, Mr. Freeman.', name: 'Rise and shine, {Name}.', de: 'Aufwachen, {Name}. Die Arbeit ruft.', from: 'Half-Life 2 (G-Man, 2004)', fits: 'morgens', hours: MORNING },
  { id: 'hellothere', orig: 'Hello there!', name: 'Hello there, {Name}!', de: 'Hallo, {Name}!', from: 'Star Wars (Obi-Wan, Meme)', fits: 'immer' },
  { id: 'neo', orig: 'Wake up, Neo …', name: 'Wake up, {Name} …', de: 'Aufwachen, {Name} …', from: 'Matrix (1999)', fits: 'morgens', hours: MORNING },
  { id: 'listen', orig: 'Hey, listen!', name: 'Hey, listen, {Name}!', de: 'Hey, hör mal, {Name}!', from: 'Zelda: Ocarina of Time (Navi)', fits: 'immer' },
  { id: 'vietnam', orig: 'Good morning, Vietnam!', name: 'Good morning, {Name}!', de: 'Guten Morgen, {Name}!', from: 'Filmtitel (1987)', fits: 'bis 11 Uhr', hours: MORNING },
  { id: 'prosper', orig: 'Live long and prosper.', name: 'Live long and prosper, {Name}.', de: 'Lebe lang und in Frieden, {Name}.', from: 'Star Trek (Spock)', fits: 'immer' },
  { id: 'force', orig: 'May the Force be with you.', name: 'May the Force be with you, {Name}.', de: 'Möge die Macht mit dir sein, {Name}.', from: 'Star Wars', fits: 'immer' },
  { id: 'goodnews', orig: 'Good news, everyone!', name: 'Good news, {Name}!', de: 'Gute Nachrichten, {Name}!', from: 'Futurama (Professor Farnsworth)', fits: 'immer' },
  { id: 'friend', orig: 'Hello, friend.', name: 'Hello, {Name}.', de: 'Hallo, Freund.', from: 'Mr. Robot (Elliot)', fits: 'abends' },
  { id: 'world', orig: 'Hello, World!', name: 'Hello, World! Hello, {Name}!', de: 'Hallo, Welt – hallo, {Name}!', from: 'erstes Programm jeder Sprache', fits: 'Entwickler' },
  { id: 'player', orig: 'Player One, ready.', name: 'Player {Name}, ready.', de: 'Spieler {Name}, bereit.', from: 'Arcade-Spiele', fits: 'immer' },
  { id: 'coin', orig: 'Insert coin', name: 'Insert coin, {Name} …', de: 'Münze einwerfen, {Name} …', from: 'Arcade-Automaten', fits: 'passt zur Slotmaschine' },
  { id: 'achievement', orig: 'Achievement unlocked', name: 'Achievement unlocked: {Name} is back!', de: 'Erfolg freigeschaltet: Wieder da, {Name}!', from: 'Spielkonsolen', fits: 'immer' },
  { id: 'johnny', orig: "Here's Johnny!", name: "Here's {Name}!", de: 'Da ist {Name}!', from: 'Shining / Tonight Show', fits: 'abends, augenzwinkernd' },
  { id: 'houston', orig: 'Houston, we have a problem.', name: 'Houston, no problem – {Name} is here.', de: 'Houston, kein Problem – {Name} ist da.', from: 'Apollo 13 – umgedreht', fits: 'immer' },
  { id: 'ahoi', orig: 'Ahoi!', name: 'Ahoy, {Name}!', de: 'Ahoi, {Name}!', from: 'Seefahrt, Hamburg', fits: 'Hamburg' },
  { id: 'ready', orig: 'Bereit, wenn du es bist.', name: 'Ready when you are, {Name}.', de: 'Bereit, wenn du es bist, {Name}.', from: 'Raumfahrt-/Spieleklischee', fits: 'immer' },
  { id: 'mission', orig: 'Your mission begins now.', name: 'Your mission begins now, {Name}.', de: 'Deine Mission beginnt jetzt, {Name}.', from: 'Command & Conquer Remastered', fits: 'Cockpit' },
  { id: 'stay', orig: 'Stay awhile …', name: 'Stay awhile, {Name} …', de: 'Bleib ein Weilchen, {Name}.', from: 'Impossible Mission (1984)', fits: 'abends' },
];

export type WelcomeMode = 'standard' | 'regional' | 'quote' | 'random' | 'custom';
/** Sprachwahl je Spruch: Original, Original mit Name, deutsche Fassung */
export type QuoteForm = 'orig' | 'name' | 'de';
export type RandomEvery = 'day' | 'open';

export interface Welcome {
  mode: WelcomeMode;
  /** Regional- oder internationaler Gruß (Id aus REGIONAL/INTERNATIONAL) */
  greet: string;
  /** Spruch (Id aus QUOTES) */
  quote: string;
  form: QuoteForm;
  /** Auswahl für Zufall: „r:moin“, „q:commander“ (r = Gruß, q = Spruch) */
  pool: string[];
  every: RandomEvery;
  /** eigener Text mit {Name} */
  custom: string;
}

export const CUSTOM_MAX = 80;

export const WELCOME_DEFAULT: Welcome = {
  mode: 'standard',
  greet: 'moin',
  quote: 'commander',
  form: 'name',
  pool: ['r:moin', 'r:servus', 'r:gude', 'q:commander', 'q:hellothere', 'q:force'],
  every: 'day',
  custom: '',
};

const GREETS = [...REGIONAL, ...INTERNATIONAL];
export const greetById = (id: string): Greet | undefined => GREETS.find((g) => g.id === id);
export const quoteById = (id: string): Quote | undefined => QUOTES.find((q) => q.id === id);

/** Alle Einträge für die Zufallsauswahl (Schlüssel, Name in der Liste, Gruppe). */
export const POOL_ALL: { key: string; label: string; group: 'regional' | 'international' | 'quote' }[] = [
  ...REGIONAL.map((g) => ({ key: 'r:' + g.id, label: g.label, group: 'regional' as const })),
  ...INTERNATIONAL.map((g) => ({ key: 'r:' + g.id, label: g.label, group: 'international' as const })),
  ...QUOTES.map((q) => ({ key: 'q:' + q.id, label: q.orig, group: 'quote' as const })),
];

const inHours = (h: Hours | undefined, hour: number): boolean => !h || (hour >= h[0] && hour < h[1]);

/** Zeitfenster als Text, z. B. „11–14 Uhr“ (leer = immer). */
export const hoursText = (h?: Hours): string => (h ? `${h[0]}–${h[1]} Uhr` : '');

/**
 * {Name} einsetzen. Ohne Namen fällt der Platzhalter samt Komma davor weg: „Moin, {Name}!“ → „Moin!“.
 */
export function fillName(text: string, name: string): string {
  const n = name.replace(/\s+/g, ' ').trim();
  if (n) return text.split('{Name}').join(n);
  return text.replace(/,?\s*\{Name\}/g, '').replace(/\s+([!?.])/g, '$1').replace(/\s{2,}/g, ' ').trim();
}

/** Gruß je Tageszeit (Standard): Morgen 5–9, Tag 9–17, Abend 17–23 Uhr, nachts „Hallo“. */
export function standardGreeting(hour: number, name = ''): string {
  const g = hour >= 5 && hour < 9 ? 'Guten Morgen' : hour >= 9 && hour < 17 ? 'Guten Tag' : hour >= 17 && hour < 23 ? 'Guten Abend' : 'Hallo';
  const n = name.replace(/\s+/g, ' ').trim();
  return n ? `${g}, ${n}` : g;
}

/** Text eines Spruchs in der gewählten Form; „mit Name“ ohne Namen zeigt das Original. */
export function quoteText(q: Quote, form: QuoteForm, name: string): string {
  if (form === 'orig') return q.orig;
  if (form === 'name') return name.trim() ? fillName(q.name, name) : q.orig;
  return fillName(q.de, name);
}

/** Text zu einem Schlüssel aus der Zufallsauswahl – oder null, wenn er jetzt nicht passt. */
function poolText(key: string, w: Welcome, hour: number, name: string): string | null {
  const [kind, id] = [key.slice(0, 2), key.slice(2)];
  if (kind === 'r:') {
    const g = greetById(id);
    return g && inHours(g.hours, hour) ? fillName(g.text, name) : null;
  }
  const q = quoteById(id);
  return q && inHours(q.hours, hour) ? quoteText(q, w.form, name) : null;
}

/** Tageszahl für „jeden Tag ein anderer“ (lokales Datum). */
export const dayNumber = (d: Date): number => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);

/**
 * Begrüßungstext für Zeitpunkt und Profil. `seed` (0 ≤ seed < 1) wählt bei Zufall „bei jedem Öffnen“;
 * bei „jeden Tag“ entscheidet das Datum. Passt nichts (Zeitfenster), kommt der Standard.
 */
export function welcomeText(w: Welcome | undefined, now: Date, name = '', seed = 0): string {
  const hour = now.getHours();
  const std = standardGreeting(hour, name);
  if (!w) return std;
  switch (w.mode) {
    case 'regional': {
      const g = greetById(w.greet);
      return g && inHours(g.hours, hour) ? fillName(g.text, name) : std;
    }
    case 'quote': {
      const q = quoteById(w.quote);
      return q && inHours(q.hours, hour) ? quoteText(q, w.form, name) : std;
    }
    case 'custom': {
      const t = fillName(w.custom.trim(), name);
      return t || std;
    }
    case 'random': {
      const fits = w.pool.map((k) => poolText(k, w, hour, name)).filter((t): t is string => !!t);
      if (!fits.length) return std;
      const i = w.every === 'day' ? dayNumber(now) % fits.length : Math.floor(seed * fits.length) % fits.length;
      return fits[i];
    }
    default:
      return std;
  }
}

const MODES: WelcomeMode[] = ['standard', 'regional', 'quote', 'random', 'custom'];
const FORMS: QuoteForm[] = ['orig', 'name', 'de'];

/** Aus gespeicherten Daten; Unbekanntes fällt auf die Voreinstellung. */
export function parseWelcome(data: unknown): Welcome | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const d = data as Record<string, unknown>;
  const D = WELCOME_DEFAULT;
  const keys = new Set(POOL_ALL.map((p) => p.key));
  return {
    mode: MODES.includes(d.mode as WelcomeMode) ? (d.mode as WelcomeMode) : D.mode,
    greet: typeof d.greet === 'string' && greetById(d.greet) ? d.greet : D.greet,
    quote: typeof d.quote === 'string' && quoteById(d.quote) ? d.quote : D.quote,
    form: FORMS.includes(d.form as QuoteForm) ? (d.form as QuoteForm) : D.form,
    pool: Array.isArray(d.pool) ? [...new Set(d.pool.filter((k): k is string => typeof k === 'string' && keys.has(k)))] : D.pool,
    every: d.every === 'open' ? 'open' : 'day',
    custom: typeof d.custom === 'string' ? d.custom.replace(/\s+/g, ' ').slice(0, CUSTOM_MAX) : '',
  };
}

/** Entspricht die Wahl der Voreinstellung (dann muss nichts gespeichert werden)? */
export const isDefaultWelcome = (w: Welcome): boolean => JSON.stringify(w) === JSON.stringify(WELCOME_DEFAULT);
