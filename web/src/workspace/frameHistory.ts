/**
 * F-135: Blättern nach Klicks innerhalb einer eingebetteten Seite.
 *
 * Der Verlauf einer fremden Seite im iframe ist nicht lesbar. Der Browser führt aber einen
 * gemeinsamen Verlauf für E-Sources und alle iframes: history.back() geht den letzten Schritt
 * zurück – egal in welchem iframe er war. Darum zählt dieses Modul jedes Neuladen eines iframes
 * (= Klick auf einen Link darin) in der Reihenfolge, in der es passiert ist. Zurück ist nur für
 * das iframe frei, das zuletzt geblättert hat; sonst würde ein anderes Panel zurückspringen.
 *
 * Grenzen: Seiten, die ohne Neuladen navigieren (manche Apps), und der Zurück-Knopf des Browsers
 * selbst bleiben unsichtbar; dann kann die Zählung abweichen.
 */

type Expect = 'back' | 'forward';

const seen = new Set<string>();
const expecting = new Map<string, Expect>();
/** Reihenfolge der Schritte im gemeinsamen Verlauf (je Schritt der Schlüssel des iframes). */
let backStack: string[] = [];
let forwardStack: string[] = [];
let version = 0;
const listeners = new Set<() => void>();

function changed() {
  version++;
  listeners.forEach((l) => l());
}

export function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getVersion(): number {
  return version;
}

/** Das iframe mit diesem Schlüssel hat (neu) geladen. */
export function loaded(key: string): void {
  if (!seen.has(key)) {
    seen.add(key); // erstes Laden = die geöffnete Adresse selbst, kein Schritt
    return;
  }
  const exp = expecting.get(key);
  expecting.delete(key);
  if (exp === 'back') {
    if (backStack[backStack.length - 1] === key) backStack = backStack.slice(0, -1);
    forwardStack = [...forwardStack, key];
  } else if (exp === 'forward') {
    if (forwardStack[forwardStack.length - 1] === key) forwardStack = forwardStack.slice(0, -1);
    backStack = [...backStack, key];
  } else {
    // Neuer Schritt: Der Browser verwirft dabei alles, was „vor“ lag.
    backStack = [...backStack, key];
    forwardStack = [];
  }
  changed();
}

export function canBack(key: string): boolean {
  return backStack[backStack.length - 1] === key;
}

export function canForward(key: string): boolean {
  return forwardStack[forwardStack.length - 1] === key;
}

/** Hat dieses iframe Schritte, ist aber nicht als letztes geblättert worden? */
export function hasSteps(key: string): boolean {
  return backStack.includes(key) || forwardStack.includes(key);
}

export function back(key: string): void {
  if (!canBack(key)) return;
  expecting.set(key, 'back');
  window.history.back();
}

export function forward(key: string): void {
  if (!canForward(key)) return;
  expecting.set(key, 'forward');
  window.history.forward();
}

/** iframes, die es nicht mehr gibt (Tab geschlossen, neue Adresse, neu geladen), vergessen. */
export function forget(keys: string[]): void {
  if (!keys.length) return;
  const gone = new Set(keys);
  keys.forEach((k) => {
    seen.delete(k);
    expecting.delete(k);
  });
  backStack = backStack.filter((k) => !gone.has(k));
  forwardStack = forwardStack.filter((k) => !gone.has(k));
  changed();
}

/** Nur für Tests. */
export function reset(): void {
  seen.clear();
  expecting.clear();
  backStack = [];
  forwardStack = [];
  version = 0;
}
