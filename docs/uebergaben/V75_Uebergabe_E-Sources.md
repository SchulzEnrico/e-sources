# Übergabe V75 → V76 E-Sources

Stand: 24.11.2026 · Chat V75 · Nächster Chat: **V76 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V76 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-215** (Abschnitte „V69“ zu Halbkreis/Sprache, „V74“ und „V75“) und das Claude Doc zu F-215 (Link im Lastenheft, PDF in `docs/Arbeitspakete/`) zum Thema Sprachnotiz. Für Technische Rahmenbedingungen, Arbeitsregeln und „Kleine Punkte“ gilt weiter `V61_Uebergabe_E-Sources.md` (plus `V61_Nachtrag_E-Sources.md`); offene kleine Punkte aus `V74_Uebergabe_E-Sources.md` gelten weiter. Lies `web/src/components/PadFooter.tsx` (Stellen „V75“) und in `Pad.tsx` die `footItems`. Dann „Nächste Schritte“ ab 1.

## Arbeitsweise (Enrico, V75)

- **Getestet wird erst, wenn alles steht.** Nicht nach jedem Schritt um Prüfung bitten – weiterbauen, die Prüfliste sammeln (unten).
- Design des Überschrift-Rads: „erstmal top“.

## Was in V75 passiert ist

- **Überschrift-Rad (Wünsche Enrico):** Knopf „Überschrift“ ohne Symbol, der Knopf **ist** das Rad, Beschriftung auf dem Rad „Überschrift H1“ … „H6“ (`H_LABELS` in `NoteEditor.tsx`). Rad = Einstellung (Stufe bleibt), Tippen = an/aus an der Schreibmarke; in einer Überschrift stellt Drehen sie mit um. `Wheel` hat dafür `noPick` (Antippen eines Werts wählt nicht). Band schwarz mit Schatten, Hintergrund Clay wie `.pad .nblock__item`, Knopf sonst wie die anderen. Fehler behoben: mehrfach Pfeil am Knopf zählte nur einmal (Stufe jetzt aus `levelHere()`).
- **Telefon A2:** `components/useKeyboard.ts` (visualViewport, nur `pointer: coarse`, setzt auch `--vv-top`/`--vv-h`). `PadFooter` bekommt `knob` – bei offener Tastatur rendert er sich als Portal `.padknob` über der Tastatur (Farben vom Pad über verstecktes `anchor` kopiert), Deckkraft `--knob-op`, Ring `.padknob__ring` immer sichtbar. Verschieben: Doppeltippen + halten + ziehen (`slide`), Home dort 320 ms verzögert. Einstellungen `knobOpacity`/`knobX` in `display.ts` (je Gerät, Tests), Regler im ⋮ des Pads (`OpacitySlider` jetzt mit `min`/`step`/`valueText`). Nur das Pad mit Fokus zeigt den Knopf (`focusIn` in `Pad.tsx`).
- **C:** unter 600 px füllt `.pad.has-note` den sichtbaren Bereich, `.padlayer:has(...)` über der Kopfzeile (im Testbrowser bei 420 × 800 geprüft).
- **T5:** `freshNotes` in `NoteTab.tsx` – Tastatur sofort nur bei neu angelegter Note (Touch); am Rechner wie bisher.
- **Umschalter Desk | Notes:** `workspace/deskMode.ts` (je Desk und Gerät, `esource.deskMode.v1`, ≤ 600 px startet „Notes“; Tests), Gruppe `.tb-mode` hinter dem View-Knopf. Note Mode: oberstes Pad mit Platz `FULL`, Portale `visibility: hidden`; fehlt ein Pad, wird es angelegt. Im Testbrowser geprüft.
- Hilfe: „Desk oder Notes“, „Steuerknopf über der Tastatur“, „In einer Notiz schreiben“ um das Rad ergänzt (`HELP_ICON` `deskMode`, `padKnob`).
- **Tests:** 382 grün im Ersatzlauf (VM).

## Nächste Schritte

1. **Sprachnotiz (F-215 Schritt 3)** – Entscheidungen stehen (V69, Doc): Halten = Halbkreis, Eintrag „Sprachnotiz“ oben Mitte; Spracherkennung nur lokal (`processLocally` der Web Speech API, ab Werk aus, nur nach Einschalten; kein Ton als Anhang), ↑ = feststellen, ← = abbrechen, loslassen = als Entwurf übernehmen; Ziel im Halbkreis wählbar, „Als neue Note lösen“ danach; Alt+M; Rückfall ohne Spracherkennung (Hinweis am Ort); Meldungen am Ort (F-214). Vor dem Bauen prüfen, ob die Fragen im Doc dafür reichen – sonst kurz Claude Doc an der Seite.
2. Danach F-215 Schritt 4 (Neue Aufgabe, Suche im Halbkreis), Schritt 5 (Bild & Teilen), Dock (K5).
3. **Wenn alles steht – Prüfliste für Enrico** (sammeln, nicht vorher fragen):
   - Überschrift-Rad (Trackpad scrollen, Tippen an/aus, H1–H6-Größen).
   - Erinnerung ganz: Wann? → Räder → Übernehmen → Speichern → Meldung über der Leiste + Ton.
   - Telefon: Wischen am Knopf (Seite wandert nicht), Knopf über der Tastatur (Deckkraft, Ring, Doppeltippen+Ziehen, Regler im ⋮), Vollbild unter 600 px, Tastatur nur bei neuer Note, Desk | Notes (startet „Notes“).
   - Am Rechner: Umschalter Desk | Notes.
   - `npm test` auf dem Mac (Zahl nennen).

## Kleine Punkte (neu in V75)

- Note Mode: ✕ im Pad-Kopf schließt das Pad – danach legt E-Sources sofort ein neues an (gewollt? ggf. ✕ im Note Mode ausblenden oder „zurück zu Desk“).
- Note Mode zeigt nur das oberste Pad; Wechsel zwischen mehreren Pads im Note Mode fehlt noch (z. B. über „Zuletzt genutzt“ oder Reiter).
- Note Mode auf großen Bildschirmen soll später das Board (F-206) sein – bisher Pad füllt den Desk.
- Knopf über der Tastatur: Halbkreis öffnet sich nach oben über dem schwebenden Knopf – ungeprüft, ob er dort ganz sichtbar ist (Telefon-Test).
- `knob`-Portal liest die Farben beim Rendern; ändert sich die Pad-Färbung, während die Tastatur offen ist, folgt der Knopf erst beim nächsten Rendern.
- Weiter offen aus V74: Entwürfe klingeln? Ton-Schalter, Schlummern, ↓ „fett“ auf Überschriften, `recentPlaces`.

## Commit-Text V75

**Summary:** `V75: Überschrift-Rad als Knopf, Steuerknopf über der Tastatur, Vollbild auf dem Telefon, Umschalter Desk | Notes`

**Description:**
```
- Knopf „Überschrift“ ist jetzt das Rad: „Überschrift H1–H6“, Stufe bleibt
  eingestellt, Tippen schaltet an/aus; Rahmen schwarz, Clay-Hintergrund
- Telefon: bei offener Tastatur schwebt nur der Steuerknopf darüber,
  durchsichtig (10–100 %, ab Werk 25 %), Ring immer sichtbar,
  verschiebbar (Doppeltippen + Ziehen, Regler im ⋮), je Gerät
- Unter 600 px füllt das Pad mit offener Note den Bildschirm
- Tastatur öffnet sich sofort nur bei einer neuen Note
- Umschalter Desk | Notes in der Kopfzeile, je Desk und Gerät;
  Note Mode: Pad füllt den Desk, Telefon startet so
- Hilfe ergänzt, Lastenheft F-215, Übergabe V75
- Tests 382 grün
```
