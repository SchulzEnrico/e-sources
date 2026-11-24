/**
 * V75 (F-215, Telefon A2): Ist die Bildschirmtastatur offen? Über `visualViewport` – der sichtbare Teil der Seite
 * wird kleiner als das Fenster. Nur bei Fingerbedienung (pointer: coarse), damit ein kleines Fenster am Rechner
 * nicht als „Tastatur offen“ gilt. Liefert die Unterkante des sichtbaren Bereichs (px, für position: fixed) oder null.
 */
import { useEffect, useState } from 'react';

const MIN_KB = 120; // ab dieser Höhe gilt der fehlende Teil als Tastatur

export function keyboardBottom(innerH: number, vvH: number, vvTop: number, coarse: boolean): number | null {
  if (!coarse) return null;
  return innerH - vvH - vvTop > MIN_KB ? vvTop + vvH : null;
}

export function useKeyboard(): number | null {
  const [bottom, setBottom] = useState<number | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const coarse = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    const f = () => {
      setBottom(keyboardBottom(window.innerHeight, vv.height, vv.offsetTop, coarse()));
      // V75 (F-215 C): sichtbarer Bereich für den Vollbild-Schreibmodus (Pad endet über der Tastatur)
      const st = document.documentElement.style;
      st.setProperty('--vv-top', `${vv.offsetTop}px`);
      st.setProperty('--vv-h', `${vv.height}px`);
    };
    f();
    vv.addEventListener('resize', f);
    vv.addEventListener('scroll', f);
    return () => {
      vv.removeEventListener('resize', f);
      vv.removeEventListener('scroll', f);
    };
  }, []);
  return bottom;
}
