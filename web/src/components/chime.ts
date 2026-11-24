/**
 * V74 (F-215): kurzer Glockenton für fällige Erinnerungen – ohne Audiodatei, über Web Audio erzeugt.
 * Browser spielen Ton erst nach einer Bedienung der Seite ab (Safari/iOS streng): Der Kontext wird darum
 * bei der ersten Taste bzw. Berührung angelegt und „aufgeweckt“. Fehler bleiben still (Ton ist Zugabe).
 */
type Ctx = AudioContext;
let ctx: Ctx | null = null;

function make(): Ctx | null {
  if (ctx) return ctx;
  const C = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
    ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!C) return null;
  try {
    ctx = new C();
  } catch {
    ctx = null;
  }
  return ctx;
}

function unlock() {
  const c = make();
  if (c && c.state === 'suspended') void c.resume().catch(() => undefined);
  // iOS: ein stummer Mini-Ton innerhalb der Bedienung gibt den Kontext frei
  if (c) {
    try {
      const b = c.createBuffer(1, 1, 22050);
      const s = c.createBufferSource();
      s.buffer = b;
      s.connect(c.destination);
      s.start(0);
    } catch {
      /* egal */
    }
  }
}

let armed = false;
/** Einmal aufrufen (z. B. beim Öffnen eines Pads): gibt den Ton bei der nächsten Bedienung frei. */
export function armChime() {
  if (armed || typeof window === 'undefined') return;
  armed = true;
  const once = () => {
    unlock();
    window.removeEventListener('pointerdown', once, true);
    window.removeEventListener('keydown', once, true);
  };
  window.addEventListener('pointerdown', once, true);
  window.addEventListener('keydown', once, true);
}

/** Zwei weiche Glockentöne (aufsteigend), zusammen gut eine Sekunde; „missed“ = ein Ton tiefer, ruhiger. */
export function playChime(missed = false) {
  const c = make();
  if (!c) return;
  if (c.state === 'suspended') void c.resume().catch(() => undefined);
  const now = c.currentTime + 0.02;
  const notes = missed ? [659.25, 880] : [880, 1318.5];
  notes.forEach((f, i) => {
    const t = now + i * 0.22;
    const o = c.createOscillator();
    const o2 = c.createOscillator(); // Oberton für Glockenklang
    const g = c.createGain();
    o.type = 'sine';
    o2.type = 'sine';
    o.frequency.value = f;
    o2.frequency.value = f * 2.01;
    const g2 = c.createGain();
    g2.gain.value = 0.18;
    o.connect(g);
    o2.connect(g2).connect(g);
    g.connect(c.destination);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.28, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.start(t);
    o2.start(t);
    o.stop(t + 0.95);
    o2.stop(t + 0.95);
  });
}
