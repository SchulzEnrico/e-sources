# Übergabe V93 → V94 E-Sources

Stand: 25.11.2026 · Chat V93 abgeschlossen · Nächster Chat: **V94 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V94 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-206 Schritt 6** („Gebaut V93“), **F-219** und **NF-08**. Leitlinie: **an Trello und unserer UX/UI ausrichten**, **Funktion vor Design**. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ `V61_Nachtrag_…`), Umschalt-Rad `V83_…`, Metall-/Glas-Vorlagen `docs/Arbeitspakete/Vorlagen/LIESMICH.md`; offene kleine Punkte aus `V74_`–`V93_…` gelten weiter. Dann „Nächste Schritte“ ab 1.

## Was in V93 passiert ist

`npx tsc --noEmit -p .` sauber. **Vitest läuft in der Claude-Umgebung nicht** (Linux-VM, `node_modules` vom Mac, npm-Registry gesperrt) – neue Logik wurde mit `tsc` + `node` geprüft (42/42 in `noteSources.test.ts`). **Enrico bitte einmal `npm test` in `web/` laufen lassen** (V92: 463 grün, jetzt + 1 Testdatei). Im eingebauten Browser geprüft (`localhost:2910/?test=voll`, 1600 × 950).

1. **Glasknopf (Enrico):** Pillenform (Seiten rund), Rahmen aus schwarzem Chrom (Verlauf als `border-box`), Glanzpunkt nach innen. CSS-Block „V93 (Enrico zum Glasknopf …)“ in `App.css`.
2. **Regeln-Bereich:** bleibt vorerst so; neue Schalter kommen mit neuen Elementen; die Weiterbildung (ab 07.12.) zeigt Lücken (Lastenheft F-218).
3. **Smartphone gesperrt (Enrico):** `components/MobileGate.tsx` statt App auf Touch-Geräten mit kleinem Bildschirm (`(pointer: coarse)` und Breite oder Höhe ≤ 600 px) – Hinweis „E‑Sources ist für den Computer gebaut“, Knopf „Adresse teilen/kopieren“, **ohne „Trotzdem öffnen“** (Enrico). Am Rechner ansehen mit `?phone=1`. Weiche in `main.tsx`.
4. **F-219 Desk-Design wie Notizen** (Vorher/Nachher an Slot 3/8 gezeigt, freigegeben): feiner Rahmen statt Lichtkante, aktiv = Akzentrahmen + Kopf mit Hauch Akzent (**dunkel wie vorher**, Enrico), gewählter Reiter erhaben, Ampel bleibt; Tausch-/Hinweis-Rahmen bleiben vorn. Überschriften im Cockpit „Layouts“ sichtbar (Desk-Layouts · Notizen-Layouts · Board-Vorlagen; `LT.layoutsHead`).
5. **Knöpfe rund + neumorph (Enrico):** Kopfleiste, Portal-Kopf, Desk-Fläche: Symbol-Knöpfe echte Kreise (`--knob` 30/24 px), Text-Knöpfe Pillen; Neumorph = Material der Fläche, Licht oben links/Schatten unten rechts, gedrückt eingesenkt, Hover Akzentring. Zurück/Vor/Neu laden/Startseite als SVG (`arrowLeft`, `arrowRight`, `reload`, `home`). **Pad-Knöpfe behalten ihren Clay-Look** (Enrico: „jetzt sind auch die Buttons im Note Mode schwarz“) – dort nur rund + mittig.
6. **F-206 Schritt 6 Notiz ↔ Quelle** – Entscheidungs-Doc https://claude.ai/artifact/HGiBYkoT6MJtNYLNYaiAVf (PDF `docs/Arbeitspakete/F-206_V93_Notiz_Quelle.pdf`), Enrico: „Best Case nach deinen Vorschlägen“. Gebaut: Logik `noteSources.ts`, Zeile „Quellen“ (`SourceChips.tsx`), Auswahl „+ Quelle“/Alt+Q, automatische Verknüpfung neuer Notizen im Desk-Modus, Zeichen im Portal-Kopf + „Neue Notiz zu dieser Seite“, „n Notizen“ in Library/Cockpit Library, Büroklammer auf Karten/Zeilen, Ziehen beide Richtungen, Öffnen an der Stelle, Hilfe „Notiz und Quelle“. Details Lastenheft.

## Nächste Schritte

1. **Rückmeldung Enrico** zu Smartphone-Hinweis, Desk-Design, runden/neumorphen Knöpfen und Notiz ↔ Quelle.
2. **N13 weiter:** Personen + Projektfokus (Schritt 8) → Rest Schritt 9 (Board, Main Stage F-207, Library-Umschalter) → Touren (F-217: Cockpit „Notizen“, Notizen-Layouts, Regeln-Gruppen, Notiz ↔ Quelle). Portfolio „Aktuelles“ nachziehen (seit V83).
3. **Wenn alles steht – Prüfliste für Enrico:** alles aus V77–V92 plus:
   - `npm test` in `web/` (neue Datei `noteSources.test.ts`).
   - Handy (oder `?phone=1`): Hinweis, „Adresse teilen“.
   - Desk: Rahmen/aktiver Kopf dunkel, Reiter, Knöpfe rund und mittig, gedrückt/hover, Light Mode.
   - Notiz ↔ Quelle: im Desk-Modus Portal anklicken → Notizen & Aufgaben › Neues Pad › Neue Notiz → Chip der Seite; „+ Quelle“ (Alt+Q) filtern/Enter; F2 Stelle `1:35`/`S. 12`; Entf + Rückgängig; Klick öffnet (YouTube mit `?t=`); Portal-Kopf Zeichen „1“ → Liste, „Neue Notiz zu dieser Seite“; Library „n Notizen“; Kanban-Karte Büroklammer; Reiter auf Zeile „Quellen“ ziehen, Notiz aus der Liste auf ein Portal ziehen; Source löschen → Chip „Quelle gelöscht“ → „Wieder anlegen“.

## Kleine Punkte (neu in V93)

- Stelle ist in fremden Seiten nicht auslesbar (iframe) – nur aus der Adresse oder von Hand. Abschnitt mit Leerzeichen wird Textfragment (`#:~:text=`), bei Wikipedia Anker mit `_`.
- Auswahl „+ Quelle“: bereits verknüpfte Seite erneut wählen tut nichts (Zeile zeigt „· verknüpft“) – ggf. Hinweis „schon verknüpft“ am Ort ergänzen.
- „Notiz auf Portal ziehen“ meldet per `flash` (unten), nicht am Ort – das Zeichen im Portal-Kopf erscheint aber sofort.
- Automatische Verknüpfung prüft den Notizen-Modus über `.padlayer.is-notes` im DOM (einfach, aber robust genug); dort keine Verknüpfung.
- Titel neuer Sources aus Portalen = letzter Pfadteil · Host (z. B. „Hamburg · de.wikipedia.org“).
- Smartphone-Sperre greift auch beim „An E-Sources senden“-Fenster nicht (nur `startApp`).
- Dev-Server hing einmal (Module luden nicht) – Neustart: `cd ~/Projects/e-sources/web && npm run dev`.
- Im eingebauten Browser: Pane muss sichtbar sein (`browser.show()`), sonst pausiert die Seite; `tabs.getActive()` gibt die ganze Seite aus – vermeiden.

## Commit-Text V93

**Summary:** `V93: F-219 Desk-Design wie Notizen, Knöpfe rund/neumorph, Smartphone-Hinweis, F-206 Schritt 6 Notiz ↔ Quelle`

**Description:**
```
- Glasknopf: Pillenform, Rahmen aus schwarzem Chrom
- F-219: Portale im Look der Pads (feiner Rahmen, aktiver Kopf dunkel
  mit Akzent, erhabener Reiter), Überschriften im Cockpit „Layouts“
- Knöpfe in Kopfleiste und Portalen rund und neumorph, Symbole mittig
  (Zurück/Vor/Neu laden/Startseite als SVG); Pads behalten Clay
- Smartphone: Hinweis statt App (MobileGate), Adresse teilen/kopieren
- F-206 Schritt 6 Notiz ↔ Quelle: Zeile „Quellen“ mit Chips, „+ Quelle“
  (Alt+Q), Stelle aus/in Adresse (F2), neue Notiz mit aktiver Seite
  verknüpft, Zeichen im Portal-Kopf, „n Notizen“ in der Library,
  Büroklammer auf Karten, Ziehen in beide Richtungen, Hilfe
- noteSources.ts mit Tests; Herkunft „aus einer Notiz verknüpft“
- Lastenheft F-206 Schritt 6, F-218, F-219; Übergabe V93
```
