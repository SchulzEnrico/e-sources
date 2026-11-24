# Übergabe V74 → V75 E-Sources

Stand: 24.11.2026 · Chat V74 · Nächster Chat: **V75 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V75 E-Sources**. Lies diese Übergabedatei, dann `V72_Uebergabe_E-Sources.md` (Schritte 3–5) und im Lastenheft **F-215** (Abschnitte „V73“ und „V74“). Für Technische Rahmenbedingungen, Arbeitsregeln und „Kleine Punkte“ gilt weiter `V61_Uebergabe_E-Sources.md` (plus `V61_Nachtrag_E-Sources.md`). Lies `web/src/components/RemindPicker.tsx` (Drehrad `Wheel`), in `NoteEditor.tsx` die Stellen „V74“ und in `App.css` die Stellen „V74“. Dann „Nächste Schritte“ ab 1.

## Was in V74 passiert ist

- **Geprüft von Enrico:** Pad-Kopf (kleiner, Hover) ✓, Hover in der Note ✓, Meldung am Pad ✓ (erschien, aber ohne Ton und an falscher Stelle).
- **Gebaut (Wünsche Enrico):**
  - **Ton** bei fälliger Erinnerung: `components/chime.ts` (Web Audio, zwei Glockentöne, bei „Verpasst“ tiefer; freigegeben bei der ersten Taste/Berührung – Browserregel).
  - **Ort der Meldungen:** `RemindAlarm.tsx` geteilt in `useReminders` (Zustand, Prüfung, Ton) und Anzeige. Mit offener Note über der Leiste Speichern/Verwerfen/Schließen (`draft.above` → `.note__above` in `NoteTab`), ohne Note unten in der Notizfläche (`.nblock__float`, Grid-Zelle der Hauptspalte; schmal über ganze Breite) – auch „gelöscht · Rückgängig“. Nie mehr in der Seitenleiste.
  - **iPhone:** Wischen am Steuerknopf verschob die Seite → `touchmove`-Listener (nicht passiv) am Knopf in `PadFooter.tsx`. **Telefon-Test offen.**
  - **Datum/Uhrzeit:** eigene Auswahl `RemindPicker.tsx` statt `datetime-local`: Uhrzeit oben (zwei Drehräder, scroll-snap, Wölbung, Glasband), Kalender darunter (Pfeile/Bild/Pos1/Ende, Heute), Abbrechen/Übernehmen, Klick außerhalb übernimmt. Klappt **in der Note** auf (schwebend wurde sie abgeschnitten). „Wann?“ öffnet sie direkt – Schnellwahlen entfallen (`quickPicks` in `remind.ts` bleibt, unbenutzt).
  - **Steuerknopf:** Mulde neumorph versenkt, Fläche im Ring eben mit sehr weichem Lichtschein, Ring 1 px (Enrico ok).
  - **Unter dem Textfeld** nur noch der Zustand: Hinweis `sr-only`, angelegt/geändert/von als Tooltip am Zustand.
  - **Startgröße Pad** 520 × 720 px (`PAD_START` in `pads.ts`, `padHome` in `App.tsx`) – Enrico ok.
  - **Scrollbalken** unter der Leiste behoben (Ränder der Leiste auf Innenabstand 4 px).
  - **Überschrift H1–H6:** `HLevel` in `noteDoc.ts`, Tags h3–h6 + `data-level` (Größe in CSS nach `data-level`). Drehrad **im Knopf „Überschrift“** (`Wheel` mit `row`/`height`/`passive`/`labels`): wischen/scrollen bzw. Pfeil hoch/runter am Knopf stellt die Überschrift an der Schreibmarke um; Tippen = Stufe setzen bzw. wieder Text. **Von Enrico noch nicht angesehen.**
- **Tests:** 378 grün im Ersatzlauf (VM). Auf dem Mac `npm test` bestätigen lassen.

## Nächste Schritte

1. **Enrico:** Überschrift-Rad im Knopf ansehen (H1–H6, Größen), Erinnerung ganz durchspielen (Wann? → Räder → Übernehmen → Speichern → warten: Meldung über der Leiste + Ton), Uhrzeit-Räder mit Trackpad. Testzahl nennen.
2. **Telefon:** Wischen am Knopf (Seite darf nicht mehr wandern), dann A2 + C (V72 Schritt 3).
3. **Umschalter Desk | Notes** (V72 Schritt 4).
4. **Sprachnotiz** (V72 Schritt 5; Schieberegler H1–H3 ist durch das Rad erledigt).

## Kleine Punkte (neu in V74)

- Erinnerung meldet sich nur bei **gespeicherter** Note (Entwurf zählt nicht) – Enrico fragen, ob auch Entwürfe klingeln sollen.
- Ton-Schalter („Ton aus“) fehlt noch; Lautstärke fest.
- „Später (10 Min.)“ (Schlummern) in der Meldung weiterhin offen (siehe V73).
- Drehrad im Überschrift-Knopf: Tastatur nur über den Knopf (Pfeil hoch/runter), Rad selbst `aria-hidden`; Bildschirmleser hört die Stufe im Namen des Knopfs.
- Testbrowser: Pad nach Neuladen klein → `p.evaluate(() => { const el = document.querySelector('.pad'); el.style.width='520px'; el.style.height='720px'; })`, Ansicht mit `setViewportSize({width:1400,height:950})`. Knopf „Überschrift“ per `.nedit__tools button` Index 2 (Name kollidiert mit dem Steuerknopf).
- Aus V73 weiter offen: ↓ „fett“ auf Überschriften, „Wann?“ bei neuer Erinnerung per ↓ gleich öffnen, Vergangenheit = sofort „Verpasst“ ok?, RemindChips-Platz, `recentPlaces`.

## Commit-Text V74

**Summary:** `V74: Ton und Ort der Erinnerung, eigene Datums-/Uhrzeitauswahl, Überschrift H1–H6 per Rad, Pad-Startgröße, Steuerknopf`

**Description:**
```
- Erinnerung: Glockenton; Meldung über Speichern/Verwerfen/Schließen bzw.
  unten in der Notizfläche (nie in der Seitenleiste), auch „gelöscht“
- „Wann?“ öffnet eigene Auswahl im Pad-Stil: Uhrzeit-Räder oben,
  Kalender darunter, in der Note statt schwebend; Schnellwahlen entfallen
- Überschrift H1–H6 per Drehrad im Knopf „Überschrift“
- iPhone: Wischen am Steuerknopf verschiebt die Seite nicht mehr
- Steuerknopf versenkt, Fläche eben mit weichem Lichtschein, Ring 1 px
- Unter dem Textfeld nur noch der Zustand
- Neues Pad startet mit 520 × 720 px; Scrollbalken unter der Leiste weg
- Lastenheft F-215, Übergabe V74
- Tests 378 grün
```
