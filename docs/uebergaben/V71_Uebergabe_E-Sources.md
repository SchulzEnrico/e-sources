# Übergabe V71 → V72 E-Sources

Stand: 24.11.2026 · Chat V71 abgeschlossen (bei ca. 80 % Füllstand) · Nächster Chat: **V72 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V72 E-Sources**. Lies diese Übergabedatei, dann `V70_Uebergabe_E-Sources.md` (Kleine Punkte – gelten weiter, soweit hier nicht erledigt) und im Lastenheft **F-215** (Stand V71 dort vollständig, Abschnitte „V71 …“). Für Technische Rahmenbedingungen, Arbeitsregeln und „Kleine Punkte“ gilt weiter `V61_Uebergabe_E-Sources.md` (plus `V61_Nachtrag_E-Sources.md`). Lies `web/src/components/PadFooter.tsx`, `web/src/workspace/footArc.ts`, in `Pad.tsx` die Stellen „V71“ und in `NoteEditor.tsx` die Stellen „V71“. Dann „Nächste Schritte“ ab 1.

## Links

- **Entscheidungs-Doc F-215:** https://claude.ai/artifact/A4EFLy6VomNN4v7hZdhoJb – neue Abschnitte „V71: Wischen formatiert die Note“ (W1–W8 mit Antworten), „V71: Wischen, wenn keine Note offen ist“ (W9–W13, Antworten) und „Erinnerung (↓)“ (E1–E6). Die Spalte „Antwort Enrico“ in den Tabellen ist leer – die Antworten stehen jeweils als Absatz darunter. PDF `docs/Arbeitspakete/F-215_Fussleiste_Home-Knopf.pdf` ist veraltet → Claude erzeugt es selbst neu (Markdown → `pandoc` → docx → `soffice` → pdf in der VM von device_bash).
- Weitere Links: siehe V69/V68.

## Was in V71 passiert ist

- **Tests:** zwei zu strenge Tests (Rundung bei 45°, −0 gegen 0) im Halbkreis-Test angepasst → 373 grün; nach dem Umbau **372 grün** (Enrico, 16:17). Danach keine Test-Änderungen mehr.
- **Fehler behoben:** Halbkreis lag unter der schmalen Randleiste (`.nblock__side` z-index 5) → `.padfoot { z-index: 6 }`; dadurch waren die Ränder zum Ziehen unten verdeckt → `.pad__grip { z-index: 7 }`.
- **Noch nicht gebaute Plätze** im Halbkreis: leere Kreise ohne Symbol, nicht wählbar, `aria-hidden` (Wunsch Enrico: „Kreise da lassen, nur Icons weg“). `FOOT_TEXT.soon` entfernt.
- **Wischen am Knopf formatiert (F-215 V71):** `swipeDir` in footArc.ts (stärkere Achse, ab 28 px); offene Note: ← Liste, → Aufgabe, ↑ H2, ↓ fett, gleiche Geste = wieder Text (fett ohne Markierung = ganze Zeile). Ohne offene Note (Liste sichtbar): ↑ Neue Note, → Neue To-do-Liste, ← Neue Liste (je Titel H1, darunter Kästchen bzw. Punkt), ↓ Neue Erinnerung = **folgt** (zeigt nur „Neue Erinnerung – folgt“). Weg vom Pad zum Editor: `CustomEvent('esource:fmt')` am `.nedit` (`FMT_EVENT`, `FmtTool`, `NoteTpl` in NoteEditor.tsx; `FMT_OF`/`TPL_OF` in Pad.tsx). `setKind` mit Stufe; leere Note bekommt erst eine Zeile.
- **Blättern** zwischen Notes/Sheets am Knopf und Pfeil links/rechts am Knopf **entfallen** (Enrico: „egal“); `swipeKind`, `neighbour`, Fläche-folgt-dem-Finger und die Schiene sind raus.
- **Halbkreis neu:** sechs Plätze auf dem Bogen, oben Mitte frei: 180° Zuletzt, 148° Neue Note, 116° Sprachnotiz, 64° Neue Aufgabe, 32° Suche, 0° Bild & Teilen (`ARC_ANGLES`, keine Mitte mehr, `firstItem` = erster wählbarer von links).
- **Pfeile (Bild von Enrico, gestaffelte Winkel):** nur beim Wischen; bauen sich mit dem Weg auf (bis 5 Winkel bei 110 px), nach außen größer, heller und kräftiger; Akzentfarbe vom Knopf; per `createPortal` in `document.body` (`position: fixed`, z-index 60), damit sie nicht an der Pad-Kante enden; Ziel als Schild darüber. Fußleiste bleibt 42 px.
- **iPhone:** Halten/Wischen am Knopf löste Textauswahl aus → `.padfoot` und Inhalt `user-select: none`, `-webkit-touch-callout: none`, `touch-action: none`; Schreibfeld bleibt auswählbar. **Auf dem iPhone nicht geprüft.**
- **Überschriften** H1–H3 in der Note klar verschieden groß (`.nedit h3/h4/h5`), H2 deutlich größer als fett.
- **Enter am Ende der Überschrift** springt in die leere erste Aufgabe bzw. den leeren ersten Punkt darunter (statt Absatz dazwischen) – im Browser geprüft.
- **Notizliste erhaben (Wunsch Enrico: „mehr Emboss, Haptik“):** Einträge und „Neue Note“ im Pad wie Tasten – Licht von oben, helle Oberkante, Schatten unten; gewählter Eintrag und Drücken leicht eingedrückt (Block am Ende von App.css). Von Enrico noch nicht angesehen.
- **Erinnerung entschieden (Enrico „erstmal so“):** E1 Feld „Erinnern am“ (Datum + Uhrzeit, getrennt von „fällig am“), E2 „Ort“ als freier Text, nur angezeigt, E3 Meldung am Pad, Systemmitteilung nur nach Erlaubnis; E4–E6 Vorschlag gilt.

## Nächste Schritte

1. **Enrico:** im Browser prüfen – Enter im Titel einer neuen To-do-Liste/Liste, ↓ in offener Note (fett), Pfeil-Aufbau beim langsamen Wischen; auf dem iPhone: keine Textauswahl mehr am Knopf, Schreibfeld weiter auswählbar.
2. **Erinnerung bauen (↓ ohne offene Note):** Felder `remindAt` (ISO mit Uhrzeit) und `place` an `Note` (types.ts, notes.ts mit Tests, storage parse, Abgleich, Slot-Datei prüfen); Vorlage `tpl-remind` (Titel H1, darunter zwei große, touchfreundliche Felder „Erinnern am“ und „Ort“ – in NoteTab bei den Feldern „nicht beginnen vor/fällig am“ oder als eigene Zeile, mit Enrico abstimmen), danach Text; Prüfung im Pad (Intervall, nur offene Pads), Meldung am Pad mit „Öffnen“; verpasste beim Öffnen („Verpasst: …“); Systemmitteilung erst nach Erlaubnis (Knopf in den Einstellungen bzw. in der Meldung). Begriffe in terms.ts/help.ts.
3. **Schieberegler H1–H3** am Knopf „Überschrift“ der Leiste (W4: Knopf bleibt H1, Regler touchfreundlich, großer Griff).
4. **Offene Frage an Enrico:** „Knopf, um in den Note-Modus zu wechseln“ – gemeint als Sprung von der Liste in die zuletzt offene Note oder als Umschalter Lesen/Schreiben? (↓ ist jetzt Erinnerung.)
5. Danach F-215 Schritt 3 Sprachnotiz (eigener Kreis bei 116°), Schritt 4 Aufgabe + Suche, Schritt 5 Bild & Teilen, dann Dock (K5, N1/N2 im Doc weiter offen: Name „Steuerknopf“?). Dann weiter laut V68 (F-214 Grundsatz-Doc, Umstieg P5 …).

## Kleine Punkte (neu in V71)

- In schmalen Pads (ca. 250 px) wird der Kreis bei 180° vom Pad-Rand angeschnitten; in flachen Pads der Halbkreis oben (V70).
- Die Beschriftung des gewählten Eintrags kann den Nachbarn verdecken (z. B. „Zuletzt genutzt“ über „Neue Note“).
- Tooltip (`title`) des Knopfs erscheint beim Hovern groß über der Fußleiste.
- Totes CSS: `.padfoot__notch`, `.padfoot__rail*`, `.pad__body.is-dragged`, `.padfoot__item[aria-disabled]`, `.padfoot__compass` – kann weg.
- `swipeLabel` liest beim Wischen das DOM (`.nedit` da?) – bewusst einfach.
- Pfeile/Schild beim Wischen haben keine Ansage für Bildschirmleser (Ergebnis sagt der Editor an); Formatieren per Tastatur geht über die Leiste in der Note.
- Hilfe/Begriffe (`help.ts`) für Steuerknopf, Halbkreis, Wischgesten, Vorlagen fehlen weiter.
- Doc-Tabellen: Spalte „Antwort Enrico“ leer, Antworten als Absatz darunter.

## Commit-Text V71

**Summary:** `V71: Wischen am Steuerknopf formatiert bzw. legt Notes an, Pfeile beim Wischen, Fehler Fußleiste/Ränder`

**Description:**
```
- Wischen am Knopf (F-215): in offener Note ← Liste, → Aufgabe,
  ↑ Überschrift H2, ↓ fett, gleiche Geste = wieder Text; ohne offene
  Note ↑ Neue Note, → Neue To-do-Liste, ← Neue Liste (Titel H1)
- Blättern zwischen Notes/Sheets am Knopf entfällt
- Pfeile aus gestaffelten Winkeln in Akzentfarbe, nur beim Wischen,
  bauen sich mit dem Weg auf, über allem (nicht abgeschnitten)
- Halbkreis: sechs Plätze ohne Mitte oben, noch nicht gebaute als
  leere Kreise
- Fehler: Halbkreis unter der Randleiste, Ränder zum Ziehen unten
  verdeckt; iPhone: keine Textauswahl beim Halten/Wischen am Knopf
- Überschriften H1–H3 klar verschieden groß; Enter im Titel springt
  in den leeren ersten Punkt der Liste
- Einträge der Notizliste erhaben wie Tasten (Haptik)
- Lastenheft F-215 (V71, Erinnerung E1–E3 entschieden), Übergabe V71
- Tests 372 grün
```
