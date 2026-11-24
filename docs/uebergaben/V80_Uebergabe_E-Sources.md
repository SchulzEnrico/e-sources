# Übergabe V80 → V81 E-Sources

Stand: 24.11.2026 · Chat V80 · Nächster Chat: **V81 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V81 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-215** (Abschnitte „V79“ und „Gebaut V80“) und das Claude Doc „Bild & Teilen, Dock (K5)“ (PDF `docs/Arbeitspakete/F-215_V79_Bild_Teilen_Dock.pdf`, Doc https://claude.ai/artifact/HERB3foJP8j69Sv39t5q6V – Vorschlag C für das Dock). Für Technische Rahmenbedingungen, Arbeitsregeln und „Kleine Punkte“ gilt weiter `V61_Uebergabe_E-Sources.md` (plus `V61_Nachtrag_E-Sources.md`); offene kleine Punkte aus `V74_`–`V80_Uebergabe_E-Sources.md` gelten weiter. Dann „Nächste Schritte“ ab 1.

## Arbeitsweise (Enrico)

- **Erst alle Funktionen** – Mobilansicht der Notizen später (V76).
- **Getestet wird erst, wenn alles steht.** Prüfliste sammeln (unten), nicht nach jedem Schritt fragen.
- Anzeige „Notiz“/„Notizen“, nie „Note“ (Code bleibt `Note`).
- Entscheidungs-Docs legt Claude selbst als PDF in `docs/Arbeitspakete/` ab.
- Meldungen am Ort nur 2 Sekunden (`NOTICE_MS`).

## Hinweis zum Verlauf

- Der Commit `d0f6f14` (24.11., 21:01) trägt versehentlich den Text „V77: Sprachnotiz …“, enthält aber die Arbeit aus **V79** (Tonaufnahme, Grundlage Bild). Schon gepusht – bleibt so.

## Was in V80 passiert ist

- **Bild im Text fertig (B1–B5), gebaut, Prüfung offen:**
  - `NoteEditor.tsx`: `IMG_EVENT` (`esource:img`, `ImgDetail { files, done }`, Anmeldung im `useLayoutEffect`), `insertPics`/`addFiles` (verkleinern mit `shrinkImage`, `putPic`, Schlüssel `newId`), Einfügen (`paste` mit Bilddatei), Ziehen (`dragover`/`drop`, `caretAtPoint`, Klasse `is-drop`). Auswahl am Bild über `pickRef` (Klasse `is-picked`) – in `joinBack`/`joinForward` (damit auch Handy-Tastaturen über `beforeinput` gehen) und `onKeyDown` (Pfeile, Enter/Leertaste, Esc). `dropPic` mit Meldung `.nedit__notice` am Ort (Rückgängig = `undo(true)`, nur wenn seither unverändert). Schutz: `asPara`, `setKind`, `newTask`, Enter, Vorlagen, Fett von außen lassen Bilder in Ruhe. Klick aufs Bild = groß.
  - `components/PicView.tsx` (neu): Ebene über dem Pad (Portal in `.pad`, sonst `body` mit `is-page`), Esc per Capture-Listener vor Notiz/Pad, Tab bleibt drin, Wischen ≥ 60 px schließt, Beschreibung (alt) über `setAlt` (Entwurf), Sichern, Löschen.
  - `imageStore.ts`: `picFileName` (Test). Symbol `image` in `icons.ts`. Liste: `nblock__pic` vor dem Titel, Bildschirmleser „mit Bild“.
- **Halbkreis „Bild & Teilen“ (S1–S4), gebaut, Prüfung offen:** `Pad.tsx` – Liste `.padfoot__share` (Stil wie „Zuletzt genutzt“): „Foto aufnehmen“ (nur `pointer: coarse`, `capture=environment`), „Bild wählen …“ (mehrere), „Notiz teilen …“. `addPics` (ohne offene Notiz neue Notiz, `nextEditor`), `buildShare` beim Öffnen der Liste vorbereitet (Ton über `getClip`/`audioFileName`, Bilder über `getPic`/`picFileName`, doppelte Namen mit `-2`), `shareNote` mit `canShare({files})`, Rückfall nur Text bzw. Zwischenablage (`shareText.clip`), Hinweis `.padfoot__hint` am Ort (2 s) nur wenn etwas nicht geht. Neue Aktion `noteForward` im Reducer → `markForwarded` („Teilen-Menü“ bzw. „Zwischenablage“).
  - `notes.ts`: `shareText` (Test). Texte in `FOOT_TEXT`/`NOTE_TEXT`, Hilfe „Bild in der Notiz“ (`notePic`), „Notiz teilen“ (`noteShare`).
- **Tests:** 401 grün im Ersatzlauf (VM), `tsc` sauber. Im Browser nicht angesehen (Regel: getestet wird am Ende).

## Nächste Schritte

1. **Dock (K5) nach Vorschlag C** (Doc HERB3foJP8j69Sv39t5q6V): gleicher Halbkreis am Knopf im Dock; Neues (Sprache, Bild, Aufgabe) in die zuletzt genutzte Notiz, Meldung am Ort „In: ‹Titel› · Andere Notiz …“; „Andere Notiz …“ öffnet die Liste „Zuletzt genutzt“ mit „Neue Notiz“ oben. Vorher im Code nachsehen, wie das Dock heute aufgebaut ist (Lastenheft „Dock“).
2. **Kurz im eingebauten Browser ansehen** (nur Seite lädt, Bild einfügen per Datei-Auswahl geht nicht automatisch – reicht: Halbkreis „Bild & Teilen“ öffnet die Liste, „Notiz teilen“ ohne Notiz zeigt den Hinweis).
3. **Später:** Mobilansicht der Notizen (Claude Doc) – dann `notesOff` entfernen.
4. **Wenn alles steht – Prüfliste für Enrico:**
   - Alles aus Prüfliste V77–V79 (Halten/Rechtsklick, Überschrift-Rad, Erinnerung, Desk | Notizen, Telefon, Sprachnotiz-Gesten, Safari-Hinweis, Pegel, Neue Aufgabe, Suche, Ton-Chips, Liste dunkelgrau, Meldungen 2 s).
   - **Bild:** Bildschirmfoto mit ⌘+V einfügen; Bild aus dem Finder ins Textfeld ziehen; Halbkreis › Bild & Teilen › „Bild wählen …“ (mehrere); iPhone: „Foto aufnehmen“; ohne offene Notiz → neue Notiz mit Bild. Bild antippen = groß, Esc/✕/Wischen schließt, Beschreibung ändern, „Als Datei sichern“ (Mac Download, iPhone Teilen-Menü), „Bild löschen“ + Rückgängig. Tastatur: Rücktaste nach dem Bild wählt aus, noch einmal löscht; Entf davor; Pfeil links/rechts; Enter = groß. Formatieren/Wischen in einer Notiz mit Bild – Bild bleibt. Liste zeigt das Bild-Zeichen. Anderes Gerät: „Bild liegt auf einem anderen Gerät“.
   - **Teilen:** Notiz mit Text, Ton und Bild teilen – Safari/iPhone mit Dateien; Chrome am Mac (geht Teilen mit Dateien?); Firefox: Text kopiert + Hinweis; ohne offene Notiz Hinweis „Erst eine Notiz öffnen“.
   - `npm test` auf dem Mac (Zahl nennen).

## Kleine Punkte (neu in V80)

- Ein gelöschtes Bild bleibt im Gerätespeicher, bis `sweepPics` es beim Start wegräumt (ohne Verweis und älter als 1 Tag) – so geht „Rückgängig“ und auch Rückgängig im Editor später.
- Rücktaste in einem **leeren** Absatz nach einem Bild wählt zuerst das Bild aus (statt den leeren Absatz zu löschen). Bei Wunsch ändern.
- Pfeil hoch/runter lässt der Browser laufen; landet die Schreibmarke am Bild, wird es ausgewählt. Chrome springt oft ganz darüber hinweg – auch in Ordnung.
- „Foto aufnehmen“ erscheint nur auf Touch-Geräten; am Rechner wäre es dasselbe wie „Bild wählen …“.
- Teilen: Der Inhalt wird beim Öffnen der Liste vorbereitet. Wird „Notiz teilen“ sehr schnell angetippt, wird er danach gebaut – Safari könnte das Teilen-Menü dann verweigern (Hinweis „Teilen ging nicht“). Beim Test darauf achten.
- Beschreibung (alt) wird als Entwurf gespeichert (wie Tippen).
- Das Ziehen von Bildern auf das Pad **ohne** offene Notiz (S4 „Ziehen ins Pad“) ist noch nicht gebaut – nur ins Textfeld. Bei Bedarf auf die Notizliste ausweiten.

## Commit-Text V80

**Summary:** `V80: Bild im Text fertig, Halbkreis Bild & Teilen, Notiz teilen`

**Description:**
```
- Bild in der Notiz: Einfügen mit Strg/⌘+V, Ziehen ins Textfeld,
  „Bild wählen …“ und „Foto aufnehmen“ am Steuerknopf; Bild kommt
  unter die Zeile der Schreibmarke, danach ein Absatz
- Tastatur am Bild: Rücktaste/Entf/Pfeile wählen aus, noch einmal
  löscht mit „Bild gelöscht · Rückgängig“, Enter zeigt groß
- Bild groß über dem Pad: Esc/Wischen/✕ schließt, Beschreibung
  ändern, Als Datei sichern, Bild löschen
- Formatieren, Wischen und Neue Aufgabe lassen Bilder in Ruhe
- Liste: Bild-Zeichen vor dem Titel
- Halbkreis „Bild & Teilen“: kleine Liste über dem Knopf; ohne
  offene Notiz wird ein Bild zur neuen Notiz
- Notiz teilen: Teilen-Menü mit Text, Ton und Bildern; Hinweis nur,
  wenn Dateien oder Teilen im Browser nicht gehen (dann Zwischenablage)
- Hilfe „Bild in der Notiz“ und „Notiz teilen“
- Lastenheft F-215, Übergabe V80
- Tests 401 grün
```
