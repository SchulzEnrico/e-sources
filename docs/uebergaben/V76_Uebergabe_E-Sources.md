# Übergabe V76 → V77 E-Sources

Stand: 24.11.2026 · Chat V76 · Nächster Chat: **V77 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V77 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-215** (Abschnitte „V69“ zu Halbkreis/Sprache und „V76“) und im Claude Doc zu F-215 (PDF `docs/Arbeitspakete/F-215_Fussleiste_Home-Knopf.pdf`, Abschnitt „Sprache und Datenschutz“ und „Barrierefreiheit“). Für Technische Rahmenbedingungen, Arbeitsregeln und „Kleine Punkte“ gilt weiter `V61_Uebergabe_E-Sources.md` (plus `V61_Nachtrag_E-Sources.md`); offene kleine Punkte aus `V74_`/`V75_Uebergabe_E-Sources.md` gelten weiter. Lies `web/src/workspace/voice.ts`, in `PadFooter.tsx` die Zeiger-Logik (`down`/`move`/`up`, `itemAt`) und in `Pad.tsx` `footItems` und `swipe` (Muster: auf den Editor warten). Dann „Nächste Schritte“ ab 1.

## Arbeitsweise (Enrico)

- **Erst alle Funktionen** – Mobilansicht der Notizen später (V76).
- **Getestet wird erst, wenn alles steht.** Nicht nach jedem Schritt um Prüfung bitten – Prüfliste sammeln (unten).
- In der Anzeige heißt es **„Notiz“/„Notizen“**, nie „Note“ (V76). Im Code bleiben die Namen (`Note`, `notes`).

## Was in V76 passiert ist

- **Prüfung Enrico (Telefon, Bilder):** Querformat passte nicht, Wischen am Knopf ging nicht, Handling am Telefon schlecht. Behoben:
  - Telefon = schmal **oder** niedrig mit Touch: `PHONE_MQ` in `workspace/deskMode.ts` (App nutzt es; CSS-Vollbild C hat dieselbe Regel). Vorher sprang das Querformat in den Desk Mode.
  - `html, body { overflow-x: clip; overscroll-behavior-x: none }` – Seite nach dem Drehen nicht mehr seitlich verschoben.
  - Knopf fängt die Berührung ganz ab (`touchstart` + `touchmove`, nicht passiv); Tippen läuft über `pointerup`. iPhone ungeprüft.
- **Rechner: Halbkreis kam nicht** – Wischen beginnt erst ab 12 px (`SWIPE_START_PX`), Halten bleibt Halten; **Rechtsklick (zwei Finger tippen) öffnet den Halbkreis** (nur `pointer: fine`). Enrico: „Rechtsklick geht“.
- **Halbkreis nach Rechtsklick „extrem sprunghaft“** – Maus über dem Halbkreis: Größe stufenlos nach Nähe (`hover` → `lens`, `setHot`), Fokus `preventScroll`, kein Tooltip bei offenem Halbkreis.
- **„Notiz“ statt „Note“** in `terms.ts` und `help.ts` (Kommentare unverändert), Umschalter „Desk | Notizen“, unbenannte Notiz = „Neue Notiz“, Knopf „+ Neue Notiz“, Entwurf in der Liste nicht mehr kursiv.
- **Entscheidung Enrico: Notizen in der Mobilansicht vorerst aus** – `notesOff = phone` in `App.tsx`: keine Pads, kein NewPad, kein Umschalter.
- **Sprachnotiz (F-215 Schritt 3) begonnen:** `workspace/voice.ts` (reine Logik, 6 Tests), `voiceOn`/`setVoice` in `display.ts` (Schlüssel `esource.voice` = `local`, ab Werk aus, je Gerät), `useDisplay().voice`.
- **Tests:** 388 grün im Ersatzlauf (VM).

## Nächste Schritte

1. **Sprachnotiz – Oberfläche** (Plan aus V76, Entscheidungen V69 stehen, kein neues Doc nötig):
   - `components/useVoice.ts`: `SpeechRecognition`/`webkitSpeechRecognition` (eigene schmale Typen), `lang = VOICE_LANG`, `continuous`, `interimResults`, **`processLocally = true`**; vorher `SpeechRecognition.available({ langs: ['de-DE'], processLocally: true })` → `voiceReady`: `install` = `SpeechRecognition.install(...)` mit Hinweis „Sprachpaket wird geladen“, `fallback` = Hinweis am Ort „Sprache ist in diesem Browser nicht lokal verfügbar. Tipp: Diktat des Systems (macOS: zweimal Fn)“. Zustände idle/ask/rec/locked; Text über `speechParts`.
   - **Einschalten:** erstes Mal fragt am Knopf „Sprache einschalten? Läuft nur lokal auf diesem Gerät, kein Ton verlässt es.“ [Einschalten] [Nicht jetzt] → `setVoice(true)`; Schalter auch im ⋮ des Pads (Häkchen, je Gerät).
   - **Gesten in `PadFooter`:** Halten → Halbkreis → Finger ruht `VOICE_DWELL_MS` auf „Sprachnotiz“ = Aufnahme beim Halten (loslassen = übernehmen, `voiceGesture`: ↑ feststellen, ← abbrechen; Anzeige mit `voiceProgress`). Antippen von „Sprachnotiz“ bzw. Enter/Alt+M = Aufnahme festgestellt mit Knöpfen „Fertig“ / „Abbrechen“ (für alle, die nicht wischen können). Esc bricht ab.
   - **Anzeige am Ort** (über dem Knopf, `role=status`/aria-live): roter Punkt + „Aufnahme läuft“ (Puls nur ohne reduced-motion), vorläufiger Text, Ziel-Umschalter „In diese Notiz | Neue Notiz“ (`defaultTarget`).
   - **Übernehmen** (als Entwurf): neues Ereignis im Editor `esource:insert` (in `NoteEditor`: `restore()`, `remember()`, `document.execCommand('insertText', …)` → `onInput` speichert). Neue Notiz: `send('new')` und auf den Editor warten (wie `swipe`). Danach Meldung am Ort „Text übernommen“ mit **„Als neue Notiz lösen“** (8 s; nur wenn seither nichts geändert wurde: Editor-Rückgängig, dann neue Notiz mit dem Text).
   - Alt+M im `Pad`-Tastenhandler (wie Alt+H, `e.code === 'KeyM'`), Hilfe „Sprachnotiz“ mit Symbol `mic` in `HELP_ICON`, Texte in `FOOT_TEXT`/`VOICE_TEXT`, `footItems` „voice“ bekommt `run`.
2. Danach F-215 Schritt 4 (Neue Aufgabe, Suche im Halbkreis), Schritt 5 (Bild & Teilen), Dock (K5).
3. **Später:** Mobilansicht der Notizen (Claude Doc: Felder einklappen, Formatleiste vs. Steuerknopf, Speichern/Verwerfen im Gehäuse, Halbkreis über dem Inhalt) – dann `notesOff` wieder entfernen.
4. **Wenn alles steht – Prüfliste für Enrico** (sammeln, nicht vorher fragen):
   - Rechner: Halten am Knopf (Trackpad richtig gedrückt halten) und Rechtsklick → Halbkreis; mit der Maus über die Einträge – ruhig, kein Tooltip darüber.
   - Überschrift-Rad (Trackpad scrollen, Tippen an/aus, H1–H6-Größen).
   - Erinnerung ganz: Wann? → Räder → Übernehmen → Speichern → Meldung über der Leiste + Ton.
   - Umschalter „Desk | Notizen“ am Rechner; Texte „Notiz“ überall.
   - Telefon: Desk ohne Pads/NewPad/Umschalter; Querformat; Seite nach dem Drehen nicht verschoben.
   - Sprachnotiz (wenn gebaut): Chrome/Edge am Mac, Safari.
   - `npm test` auf dem Mac (Zahl nennen).

## Kleine Punkte (neu in V76)

- `notesOff` blendet nur Pads, NewPad und Umschalter aus. Suche/Hilfe („Notiz anlegen“, Notiz öffnen) können auf dem Telefon weiter Pads anlegen bzw. öffnen wollen – unsichtbar. Bei Bedarf dort auch sperren mit Hinweis.
- Wischen am iPhone: Ursache nicht sicher (Vermutung: iOS bricht mit `pointercancel` ab). Mit `notesOff` derzeit nicht prüfbar – beim Wiedereinschalten der Mobilansicht zuerst testen.
- Querformat-Telefon und Vollbild C greifen erst wieder mit der Mobilansicht.
- Tooltip-Wegfall bei offenem Halbkreis im Testbrowser noch nicht bestätigt gesehen (Hot Reload).
- Halbkreis-Einträge: beim Hovern zeigen evtl. zwei Beschriftungen (Hover + Auswahl) – beobachten.
- Rechtsklick auf Touch-Geräten (langes Drücken) öffnet nichts extra – dort öffnet schon das Halten.

## Commit-Text V76

**Summary:** `V76: Halbkreis per Rechtsklick und ruhiger, Fehler Telefon, „Notiz“ statt „Note“, Notizen auf dem Telefon vorerst aus, Sprachnotiz-Logik`

**Description:**
```
- Rechner: Rechtsklick (zwei Finger tippen) öffnet den Halbkreis;
  Halten bleibt Halten, Wischen erst ab 12 px
- Halbkreis mit der Maus: Größe stufenlos nach Nähe, kein Springen,
  kein Tooltip darüber
- Telefon: Knopf fängt Berührung ganz ab (Wischen), Querformat zählt
  als Telefon, Seite verschiebt sich nach dem Drehen nicht mehr
- Anzeige: „Notiz“/„Notizen“ statt „Note“, „Neue Notiz“, Umschalter
  „Desk | Notizen“, Entwurf nicht mehr kursiv
- Notizen in der Mobilansicht vorerst ausgeblendet (Wunsch Enrico)
- Sprachnotiz: Logik (Gesten, Text, Verfügbarkeit, Ziel) mit Tests,
  Schalter je Gerät (ab Werk aus, nur lokal)
- Lastenheft F-215, Übergabe V76
- Tests 388 grün
```
