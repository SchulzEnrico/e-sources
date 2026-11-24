# Übergabe V78 → V79 E-Sources

Stand: 24.11.2026 · Chat V78 · Nächster Chat: **V79 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V79 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-215** (Abschnitt „V78“) und das Claude Doc zur Tonaufnahme (PDF `docs/Arbeitspakete/F-215_V78_Tonaufnahme.pdf`, Doc https://claude.ai/artifact/Pxvr13Qpha9X7wTVFWEUfT – **zuerst Enricos Antworten T1–T11 im Doc lesen**, mit `mcp__Claude_Docs__read`). Für Technische Rahmenbedingungen, Arbeitsregeln und „Kleine Punkte“ gilt weiter `V61_Uebergabe_E-Sources.md` (plus `V61_Nachtrag_E-Sources.md`); offene kleine Punkte aus `V74_`–`V78_Uebergabe_E-Sources.md` gelten weiter. Dann „Nächste Schritte“ ab 1.

## Arbeitsweise (Enrico)

- **Erst alle Funktionen** – Mobilansicht der Notizen später (V76).
- **Getestet wird erst, wenn alles steht.** Nicht nach jedem Schritt um Prüfung bitten – Prüfliste sammeln (unten).
- In der Anzeige heißt es **„Notiz“/„Notizen“**, nie „Note“. Im Code bleiben die Namen (`Note`, `notes`).
- Entscheidungs-Docs legt Claude selbst als PDF in `docs/Arbeitspakete/` ab.

## Was in V78 passiert ist

- **Prüfung Enrico:** Sprachnotiz funktioniert, Text kommt direkt an (Chrome/Edge am Mac).
- **Pegel des Mikrofons (Wunsch Enrico)** – Leiste in der Aufnahme-Anzeige (`.padvoice__meter`, grün–gelb–rot, Segmente per Maske, Hochkontrast: Highlight). `useLevel` in `useVoice.ts`: eigener `getUserMedia`-Mitschnitt + `AnalyserNode` nur zur Anzeige, schreibt `--lvl` per requestAnimationFrame direkt ins Element; startet mit der Aufnahme, endet bei Fertig/Abbrechen/Fehler. Reine Umrechnung `voiceLevel`/`rmsOf` in `voice.ts` (Test). Hilfe „Sprachnotiz“ erwähnt den Pegel.
- **F-215 Schritt 4 gebaut:**
  - „Neue Aufgabe“: offene Notiz → `FMT_EVENT` `task-new` → `newTask()` im `NoteEditor` (leere Zeile wird Aufgabe, sonst neue leere Aufgabe darunter, Schreibmarke hinein; nie zurück zu Text). Ohne offene Notiz → `swipe('right')` (neue To-do-Liste).
  - „Suche“ = Suche im Notizblock (Entscheidung V69): `BlockCmd` `search` → Feld `.nblock__find` über der Liste (`role=search`), filtert mit `No.noteMatches` (Titel, Text, Tags, alle Wörter; Test). Pfeil runter = erster Treffer, Enter öffnet den ersten, Esc/✕ schließt (Esc → Fokus an den Knopf). Ansage der Trefferzahl (`findCount`). Schmale Randleiste: Feld nur ausgeklappt sichtbar.
  - Texte in `FOOT_TEXT` (`taskAdded`, `find…`), Hilfe `padTask`, `padFind` (Symbole in `icons.ts`), Tooltip des Knopfs ergänzt.
- **Neuer Wunsch (Enrico):** Tonaufnahme mitspeichern, Sprachnotiz markieren, Notizchip in anderer Farbe → Claude Doc (Optionen A–D, Fragen T1–T11, Vorschlag C: Ton nur auf diesem Gerät in IndexedDB, später Abgleich über Server F-81, „Als Datei sichern“; Herkunft an der Notiz, Chip mit Farbton + Mikrofon). Noch nicht gebaut.
- **Fehler gemeldet:** „Beim Anlegen von To-do und normaler Liste erscheinen Aufzählungszeichen und Kästchen nicht mehr, in die man nach der Überschrift mit Enter kam.“ Im eingebauten Browser (Chromium, Demo V77) per Wischen → bzw. ← **nicht nachstellbar** (Kästchen da, Enter springt hinein, Text landet in der Aufgabe). Weg der Prüfung: Enrico fragen, wie angelegt (Wischen, Knöpfe „To-do-Liste“ im leeren Tab, …) und in welchem Browser (Safari? iPhone?).
- Kleinkram: Testdatei `zz_tmp_V78.test.ts` liegt in `Projects/_to_delete/` (Löschen war nicht erlaubt). Im eingebauten Browser wurde die Demo (`schulzenrico.github.io/e-sources/?test`) kurz benutzt und deren Speicher dort wieder geleert (kein Gist-Schlüssel dort).
- **Tests:** 390 grün im Ersatzlauf (VM), `tsc` sauber.

## Nächste Schritte

1. **Antworten im Doc Tonaufnahme lesen** (T1–T11) → Lastenheft F-215 „V78 Tonaufnahme“ ergänzen → bauen (Datenmodell Anhang/Ton, IndexedDB, Chip in der Notiz, Herkunft „Sprachnotiz“, Farbe in der Liste; Safari/Firefox „Tonnotiz“, falls ja).
2. **Fehler To-do/Liste** klären und beheben (siehe oben).
3. Danach Schritt 5 (Bild & Teilen), Dock (K5).
4. **Später:** Mobilansicht der Notizen (Claude Doc) – dann `notesOff` entfernen.
5. **Wenn alles steht – Prüfliste für Enrico** (sammeln, nicht vorher fragen):
   - Alles aus der Prüfliste V77 (Halten/Rechtsklick, Überschrift-Rad, Erinnerung, Desk | Notizen, Telefon, Sprachnotiz-Gesten, Safari-Hinweis).
   - **Pegel:** schlägt beim Sprechen aus, fällt in Pausen ruhig ab; nach Fertig/Abbrechen ist das Mikrofon aus (Symbol im Browser-Tab verschwindet).
   - **Neue Aufgabe:** in offener Notiz (in leerer Zeile, in Textzeile, in Aufgabe) und ohne offene Notiz.
   - **Suche:** Halbkreis › Suche, tippen, Pfeil runter, Enter, Esc; schmales Pad (Randleiste).
   - `npm test` auf dem Mac (Zahl nennen).

## Kleine Punkte (neu in V78)

- Pegel braucht eine zweite Mikrofon-Freigabe nur, wenn der Browser sie nicht für die Seite merkt (Chrome merkt sie). Ohne Freigabe bleibt die Leiste leer, die Erkennung meldet den Fehler selbst.
- Die Suche im Notizblock bleibt beim Öffnen eines Treffers stehen (Filter aktiv), damit man durch die Treffer gehen kann; „✕“ zeigt wieder alle.
- „Neue Aufgabe“ in einer Überschrift-Zeile legt die Aufgabe darunter an (die Überschrift bleibt).

## Commit-Text V78

**Summary:** `V78: Pegel des Mikrofons, Neue Aufgabe und Suche im Halbkreis`

**Description:**
```
- Sprachnotiz: Pegel des Mikrofons als Leiste in der Anzeige
  (eigener Mitschnitt nur zur Anzeige, nichts gespeichert)
- Halbkreis „Neue Aufgabe“: neue leere Aufgabe an der Schreibmarke,
  ohne offene Notiz neue To-do-Liste
- Halbkreis „Suche“: Suchfeld über der Liste, nur Notizen dieses
  Notizblocks (Titel, Text, Tags), Enter öffnet, Esc schließt
- Hilfe „Neue Aufgabe am Steuerknopf“, „Suche im Notizblock“
- Claude Doc Tonaufnahme (PDF lokal), Lastenheft F-215, Übergabe V78
- Tests 390 grün
```
