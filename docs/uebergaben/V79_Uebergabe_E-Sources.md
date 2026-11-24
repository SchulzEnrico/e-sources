# Übergabe V79 → V80 E-Sources

Stand: 24.11.2026 · Chat V79 · Nächster Chat: **V80 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V80 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-215** (Abschnitte „V79“) und das Claude Doc „Bild & Teilen, Dock (K5)“ (PDF `docs/Arbeitspakete/F-215_V79_Bild_Teilen_Dock.pdf`, Doc https://claude.ai/artifact/HERB3foJP8j69Sv39t5q6V – Antworten stehen dort und im Lastenheft). Für Technische Rahmenbedingungen, Arbeitsregeln und „Kleine Punkte“ gilt weiter `V61_Uebergabe_E-Sources.md` (plus `V61_Nachtrag_E-Sources.md`); offene kleine Punkte aus `V74_`–`V79_Uebergabe_E-Sources.md` gelten weiter. Dann „Nächste Schritte“ ab 1.

## Arbeitsweise (Enrico)

- **Erst alle Funktionen** – Mobilansicht der Notizen später (V76).
- **Getestet wird erst, wenn alles steht.** Prüfliste sammeln (unten), nicht nach jedem Schritt fragen.
- Anzeige „Notiz“/„Notizen“, nie „Note“ (Code bleibt `Note`).
- Entscheidungs-Docs legt Claude selbst als PDF in `docs/Arbeitspakete/` ab.
- **Meldungen am Ort nur 2 Sekunden** (V79, `NOTICE_MS` in `flash.ts`).

## Was in V79 passiert ist

- **Tonaufnahme (Doc Pxvr13Qpha9X7wTVFWEUfT, T1–T11 beantwortet) – gebaut, Enrico: „Sprachnotiz funktioniert alles“.**
  - `NoteAttachment` kind `audio` (`ref`, `dur`, `at`, `dev`, `mime`), `Note.origin.via = 'voice'` bei neuen Sprachnotizen; `audioOf`, `hasAudio`, `isVoiceNote`, `addAudio`, `dropAudio`, `audioRefs` in `notes.ts`; `NotePatch` kann `origin`.
  - Ton in IndexedDB `esource.audio` (`workspace/audioStore.ts`): `putClip`/`getClip`/`delClip`, `sweepClips` (30 s nach Start in `App.tsx`: ohne Notiz und älter als 1 Tag weg), `CLIP_EVENT`.
  - Aufnahme: `useMic` in `useVoice.ts` (Pegel + MediaRecorder auf demselben Mitschnitt, `audioMime`, 32 kbit/s, 15 min `AUDIO_MAX_MS` → `limit`), `stop()` liefert `{ text, audio }`; Safari/Firefox ohne lokale Erkennung = **Tonnotiz** (`audioOnly`).
  - `PadFooter`: „● Ton wird gespeichert“, Meldungen Text/Ton, nach 15 min Ende mit Meldung. `Pad.tsx` `voiceCommit(text, target, audio)`: speichert Ton, hängt ihn an (`attachAudio`), neue Notiz mit Herkunft Sprache, „Als neue Notiz lösen“ nimmt den Ton mit.
  - `AudioChips.tsx` über dem Text (in `NoteTab`): ▶ Länge · Zeitpunkt, „Als Datei sichern“ (Teilen-Menü auf Touch, sonst Download), „Ton löschen“ + Rückgängig; fehlt der Ton: „Ton liegt auf ‚Mac‘“.
  - Liste: gesprochene Notiz dunkelgrau (Enrico: „Rot gefällt nicht“, dann „etwas heller“), Mikrofon gedämpft rot (`micWave` mit Ton), Kürzel der Randleiste rot; offen = Akzentfarbe wie jede Notiz (Enrico: „bleibt erstmal so“). Ton-Chip dunkel, ▶ gedämpft rot. Symbole `micWave`, `play`, `stop`, `download`.
- **Fehler To-do/Liste beim Wischen behoben (Enrico: „geht wieder“):** `FMT_EVENT`/`INSERT_EVENT` werden im `useLayoutEffect` angemeldet (vorher useEffect – Vorlage kam je nach Browser zu früh).
- **Meldungen 2 Sekunden** (Wunsch Enrico): `NOTICE_MS = 2000` in `flash.ts`, Notizblock `Math.min`, Sprachnotiz `DONE_MS`, Ton gelöscht. Offen gefragt: Meldung stehen lassen, solange Maus/Fokus darauf (Barrierefreiheit) – keine Antwort.
- **Bild & Teilen, Dock (K5) – entschieden** (Doc HERB3foJP8j69Sv39t5q6V, Lastenheft F-215): B1 **Bild im Text** (Block im Editor), B2 Kamera/Datei/Einfügen/Ziehen, B3 1600 px nur auf dem Gerät, B4 antippen = groß, sichern, löschen + Rückgängig, B5 Bild-Symbol in der Liste; S1 Teilen-Menü mit Text, Ton, Bildern; S2 Zwischenablage, **Hinweis nur, wenn Teilen nicht geht**; S3 ein Platz mit kleiner Liste; S4 ohne Notiz: Bild → neue Notiz, Teilen → Hinweis; K5 Vorschlag C.
- **Bild – Grundlage gebaut:**
  - `noteDoc.ts`: Block `img` (`ref`, `text` = Beschreibung), Markdown-Zeile `![Beschreibung](es-img:<Schlüssel>)`, `imgLine`, `imgRefs`, `IMG_SCHEME`; getippter Text, der so aussieht, wird mit `\` geschützt.
  - `notes.ts`: Titel/Suche übergehen Bild-Zeilen (`IMG_ONLY`), `imageRefs(ws)` (auch Entwürfe!), `hasImage`.
  - `workspace/imageStore.ts`: IndexedDB `esource.images`, `putPic`/`getPic`/`delPic`, `sweepPics` (in `App.tsx` mit `sweepClips`), `fitSize`, `shrinkImage` (createImageBitmap + Canvas, JPEG 0,82; kleine PNG bleiben), `PIC_EVENT`.
  - `NoteEditor.tsx`: `imgEl` zeichnet `<figure contenteditable=false data-k=img data-ref data-alt>` mit `<img>` (Adresse aus `picUrl`-Cache), fehlt das Bild: „Bild liegt auf einem anderen Gerät“; `readBlock` liest es zurück; CSS `.nedit__img`.
- **Tests:** 398 grün im Ersatzlauf (VM), `tsc` sauber.

## Nächste Schritte

1. **Bild im Editor fertig (B1–B4):**
   - Ereignis `esource:img` am Editor (`IMG_EVENT`, Anmeldung im `useLayoutEffect`): Bild-Block nach dem Block der Schreibmarke (leerer Absatz wird ersetzt), danach immer ein Absatz, Schreibmarke dorthin; Rückgängig (`remember`).
   - Einfügen (onPaste mit Bilddatei) und Ziehen (onDrop) im Editor → `shrinkImage` → `putPic` → einfügen.
   - Schreibmarke/Löschen am Bild: Rücktaste am Anfang des Absatzes nach einem Bild = Bild auswählen (Rahmen), noch einmal = löschen mit Meldung „Bild gelöscht · Rückgängig“ (2 s); Entf entsprechend; Pfeiltasten über das Bild hinweg; Tastatur-Fokus auf das Bild (Enter = groß).
   - Groß ansehen (B4): Ebene über dem Pad (Esc/Wischen/✕ schließt, Fokus zurück), dort „Als Datei sichern“ und „Bild löschen“; Beschreibung (alt) änderbar.
   - Liste: Bild-Symbol vor dem Titel (`hasImage(No.shownNote(raw))`), keine Farbe; Symbol `image` in `icons.ts` fehlt noch.
   - `asPara`/`setKind`/`run` im Editor dürfen Bild-Blöcke nicht in Text verwandeln (prüfen: Formatieren, Wischen, Enter am Bild).
2. **Halbkreis „Bild & Teilen“ (S3/S4):** kleine Liste über dem Knopf wie „Zuletzt genutzt“: Foto aufnehmen (`<input type=file accept=image/* capture=environment>`), Bild wählen, Notiz teilen. Ohne offene Notiz: Bild → neue Notiz; Teilen → Hinweis.
3. **Teilen (S1/S2):** `navigator.share` mit Titel, Text (ohne Bild-Zeilen, `plainText`/Markdown) und Dateien (Ton, Bilder) wenn `canShare({files})`; sonst nur Text + Hinweis „Ton und Bilder gehen in diesem Browser nicht mit“; ohne `share`: Zwischenablage + Hinweis „Text kopiert“. Spur `markForwarded`. Hinweis **nur**, wenn etwas nicht geht.
4. **Dock (K5)** nach Vorschlag C.
5. **Später:** Mobilansicht der Notizen (Claude Doc) – dann `notesOff` entfernen.
6. **Wenn alles steht – Prüfliste für Enrico:**
   - Alles aus Prüfliste V77/V78 (Halten/Rechtsklick, Überschrift-Rad, Erinnerung, Desk | Notizen, Telefon, Sprachnotiz-Gesten, Safari-Hinweis, Pegel, Neue Aufgabe, Suche).
   - **Ton:** Chip erscheint, abspielen/anhalten, Als Datei sichern (Mac: Download, iPhone: Teilen-Menü), Ton löschen + Rückgängig, mehrere Aufnahmen, „Als neue Notiz lösen“ mit Ton, Tonnotiz in Safari, 15-Minuten-Grenze (oder kurz testweise), anderes Gerät: „Ton liegt auf …“.
   - **Liste:** gesprochene Notiz dunkelgrau mit rotem Mikrofon, mit Ton Mikrofon mit Welle.
   - **Meldungen** verschwinden nach 2 s.
   - **Bild & Teilen**, Dock (wenn gebaut).
   - `npm test` auf dem Mac (Zahl nennen).

## Kleine Punkte (neu in V79)

- Ton gehört nicht zum Entwurf: er hängt sofort an der Notiz (auch nach „Verwerfen“); bei einer ganz neuen Notiz verschwindet er mit ihr (und wird später aus dem Speicher geräumt).
- Bilder dagegen stehen im Text und damit im Entwurf – `imageRefs` zählt Entwürfe mit, damit `sweepPics` nichts Ungespeichertes löscht.
- Teilen-Menü mit Dateien: Safari Mac/iPhone ja (V58 geprüft), Chrome/Edge Windows und Android ja, Chrome/Edge Mac nur neuere Versionen (auf Enricos Mac prüfen), Firefox am Rechner nein – immer per `canShare` fragen.
- Testdatei `zz_tmp_V78.test.ts` liegt weiter in `Projects/_to_delete/`.

## Commit-Text V79

**Summary:** `V79: Tonaufnahme zur Sprachnotiz, Fehler To-do/Liste, Meldungen 2 s, Grundlage Bild im Text`

**Description:**
```
- Sprachnotiz nimmt den Ton immer mit auf (nur auf diesem Gerät,
  IndexedDB), höchstens 15 Minuten, sichtbar „● Ton wird gespeichert“
- Ton-Chips über dem Text: abspielen, als Datei sichern, löschen mit
  Rückgängig; auf anderen Geräten „Ton liegt auf …“
- Safari/Firefox: Tonnotiz (nur Ton); „Als neue Notiz lösen“ nimmt
  den Ton mit; Herkunft „Sprachnotiz“ an neuen Notizen
- Liste: Sprachnotizen dunkelgrau mit gedämpft rotem Mikrofon
- Fehler behoben: Kästchen/Aufzählungspunkt fehlten beim Anlegen per
  Wischen (Editor meldet sich im Layout-Effekt an)
- Meldungen am Ort nur noch 2 Sekunden
- Grundlage Bild im Text: Block img im Markdown, Bildspeicher mit
  Verkleinern auf 1600 px, Anzeige im Editor
- Claude Docs Tonaufnahme und Bild & Teilen (PDF lokal), Lastenheft
  F-215, Übergabe V79
- Tests 398 grün
```
