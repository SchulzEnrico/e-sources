/**
 * V145: „Als Datei sichern“ an einer Stelle – Teilen-Menü, wo es Dateien kann (Telefon/Tablet), sonst Download.
 * Vorher dreifach kopiert (Ton V79, Bild V81); jetzt auch für die Handschrift (F-238).
 * Rückgabe: 'shared' (Teilen-Menü gezeigt bzw. abgebrochen) oder 'saved' (Download angestoßen).
 */
export async function shareOrDownload(blob: Blob, name: string, mime = blob.type): Promise<'shared' | 'saved'> {
  const file = typeof File === 'function' ? new File([blob], name, { type: mime }) : null;
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (file && nav.share && nav.canShare?.({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
    try {
      await nav.share({ files: [file], title: name });
    } catch {
      /* abgebrochen – nichts tun */
    }
    return 'shared';
  }
  const u = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = u;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(u), 4000);
  return 'saved';
}

/** V145: SVG als PNG (weißer Grund, doppelte Auflösung) – Fotos-App und Nachrichten nehmen PNG, kein SVG. null, wenn
 *  der Browser es nicht zeichnen kann; dann sichert der Aufrufer das SVG selbst. */
export function svgToPng(svg: string, w: number, h: number, scale = 2, bg = '#ffffff'): Promise<Blob | null> {
  return new Promise((done) => {
    try {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = Math.round(w * scale);
        c.height = Math.round(h * scale);
        const ctx = c.getContext('2d');
        if (!ctx) return done(null);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        c.toBlob((b) => done(b), 'image/png');
      };
      img.onerror = () => done(null);
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    } catch {
      done(null);
    }
  });
}
