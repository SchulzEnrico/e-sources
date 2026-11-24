# Übergabe V77 → V78 E-Sources

Stand: 24.11.2026 · Chat V77 · Nächster Chat: **V78 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V78 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-215** (Abschnitte „V69“ zum Halbkreis und „V77“) und im Claude Doc zu F-215 (PDF `docs/Arbeitspakete/F-215_Fussleiste_Home-Knopf.pdf`, Belegung des Halbkreises: „Neue Aufgabe“, „Suche“). Für Technische Rahmenbedingungen, Arbeitsregeln und „Kleine Punkte“ gilt weiter `V61_Uebergabe_E-Sources.md` (plus `V61_Nachtrag_E-Sources.md`); offene kleine Punkte aus `V74_`–`V77_Uebergabe_E-Sources.md` gelten weiter. Lies in `Pad.tsx` `footItems`, `voiceCommit`/`toNewNote`/`nextEditor` (Muster: neue Notiz anlegen und auf den Editor warten) und in `PadFooter.tsx` `run`. Dann „Nächste Schritte“ ab 1.

## Arbeitsweise (Enrico)

- **Erst alle Funktionen** – Mobilansicht der Notizen später (V76).
- **Getestet wird erst, wenn alles steht.** Nicht nach jedem Schritt um Prüfung bitten – Prüfliste sammeln (unten).
- In der Anzeige heißt es **„Notiz“/„Notizen“**, nie „Note“. Im Code bleiben die Namen (`Note`, `notes`).

## Was in V77 passiert ist

- **Sprachnotiz – Oberfläche (F-215 Schritt 3) gebaut:**
  - `components/useVoice.ts` (neu): Web Speech API, eigene schmale Typen, `processLocally = true`, vorher `SpeechRecognition.available` → `voiceReady` (go / install mit Hinweis, danach neu starten / wait / fallback). Chrome beendet die Erkennung bei Pausen – startet neu und behält den Text. `stop()` wartet bis 1,5 s auf die letzten festen Teile.
  - `PadFooter.tsx`: Prop `voice` (`VoiceProps`), Zustände `ask`/`hold`/`locked`, Verweilen 350 ms auf „Sprachnotiz“ beim Halten = Aufnahme beim Halten (↑ feststellen, ← abbrechen, loslassen übernimmt); `pointercancel` (iOS) stellt fest statt zu verlieren. „Sprachnotiz“ antippen/Enter/Alt+M = festgestellt, Tippen am Knopf = Fertig, Esc bricht ab (Listener mit capture vor der Note). Anzeige `.padvoice` über dem Knopf: roter Punkt, Text, Ziel „In diese Notiz | Neue Notiz“, Knöpfe, Hinweise; danach 8 s „Text übernommen“ + „Als neue Notiz lösen“. Fokus wandert nur mit Tastatur bzw. feinem Zeiger in die Anzeige (Touch: Tastatur bleibt).
  - `NoteEditor.tsx`: Ereignisse `esource:insert` (`INSERT_EVENT`, `detail.after` = Stand danach) und `esource:uninsert` (nur wenn seither unverändert, `detail.ok`).
  - `Pad.tsx`: `voiceCommit`, Alt+M, Schalter „Sprachnotiz (nur lokal)“ im ⋮ (Häkchen, je Gerät).
  - Texte `VOICE_TEXT` in `terms.ts`, Hilfe „Sprachnotiz“ (`voiceNote`, Symbol `mic`), Tooltip des Knopfs ergänzt. CSS am Ende von `App.css`.
- **Geprüft im eingebauten Browser:** Frage „Sprache einschalten?“ am Knopf, Rückfall-Hinweis (dort meldet `available` „unavailable“), Einfügen „Einkauf.“ + „milch und brot“ → „Einkauf. Milch und brot“, Lösen nimmt es zurück. Aufnahme selbst nicht prüfbar.
- **Tests:** 388 grün im Ersatzlauf (VM), `tsc` sauber.

## Nächste Schritte

1. **F-215 Schritt 4 – Neue Aufgabe und Suche im Halbkreis:**
   - „Neue Aufgabe“: neue Notiz mit Vorlage `tpl-todo` (wie Wischen → ohne offene Notiz) bzw. bei offener Notiz eine Aufgabe an der Schreibmarke (`FMT_EVENT` `task`)? Wenn unklar: Enrico kurz fragen (kein Doc nötig, Entscheidung V69 „Neue Aufgabe“ steht).
   - „Suche“: Suche der Kopfzeile öffnen, auf Notizen dieses Pads gefiltert? Vorschlag: Suchfeld fokussieren (`combobox` „Portale, Library, Notizen …“) – Ergebnis „Notiz öffnen“ öffnet im Pad.
2. Danach Schritt 5 (Bild & Teilen), Dock (K5).
3. **Später:** Mobilansicht der Notizen (Claude Doc) – dann `notesOff` entfernen.
4. **Wenn alles steht – Prüfliste für Enrico** (sammeln, nicht vorher fragen):
   - Rechner: Halten am Knopf (Trackpad richtig gedrückt halten) und Rechtsklick → Halbkreis; mit der Maus über die Einträge – ruhig, kein Tooltip darüber.
   - Überschrift-Rad (Trackpad scrollen, Tippen an/aus, H1–H6-Größen).
   - Erinnerung ganz: Wann? → Räder → Übernehmen → Speichern → Meldung über der Leiste + Ton.
   - Umschalter „Desk | Notizen“ am Rechner; Texte „Notiz“ überall.
   - Telefon: Desk ohne Pads/NewPad/Umschalter; Querformat; Seite nach dem Drehen nicht verschoben.
   - **Sprachnotiz in Chrome bzw. Edge am Mac:** erstes Mal Frage → Einschalten → Sprachpaket wird geladen (einmal) → noch einmal starten → Mikrofon-Freigabe → sprechen. Halten + auf „Sprachnotiz“ verweilen, sprechen, loslassen; ↑ feststellen, dann „Fertig“; ← abbrechen; Alt+M; Ziel „Neue Notiz“; „Als neue Notiz lösen“. Safari: Hinweis „nicht lokal verfügbar“ erwartet.
   - `npm test` auf dem Mac (Zahl nennen).

## Kleine Punkte (neu in V77)

- Safari hat kein `SpeechRecognition.available` → gilt als „nicht lokal“ (Entscheidung „nur lokal“). Safari erkennt manche Sprachen auf dem Gerät, sagt es aber nicht zu – bei Wunsch Enrico fragen, ob Safari trotzdem erlaubt sein soll (dann Hinweis „über Apple“).
- `install()` braucht in Chrome evtl. eine Bedienung des Anwenders – wir rufen es direkt nach dem Klick auf, sollte reichen. Nach dem Laden startet die Aufnahme nicht von selbst (Hinweis „jetzt noch einmal starten“).
- Beim Halten: die Frage „Sprache einschalten?“ erscheint, die Aufnahme startet erst nach „Einschalten“ (dann festgestellt).
- Ziel-Umschalter ist während der gehaltenen Aufnahme nicht bedienbar (Finger am Knopf) – erst nach ↑ feststellen.
- Sprache der Erkennung fest `de-DE` (später wählbar). Ein Schalter „über Dienst“ (nicht lokal) ist bewusst nicht gebaut.
- Im eingebauten Browser wurde `esource.voice` beim Test gesetzt und wieder gelöscht (localhost).

## Commit-Text V77

**Summary:** `V77: Sprachnotiz – Aufnahme am Steuerknopf, nur lokal, Übernehmen als Entwurf`

**Description:**
```
- Sprachnotiz am Steuerknopf: Halten und auf „Sprachnotiz“ verweilen
  nimmt auf (↑ feststellen, ← abbrechen, loslassen übernimmt);
  antippen bzw. Alt+M startet festgestellt mit Fertig/Abbrechen
- Spracherkennung nur lokal (processLocally), ab Werk aus; erstes Mal
  Frage am Knopf, Sprachpaket wird einmal geladen; ohne lokale
  Erkennung Hinweis auf das Diktat des Systems
- Anzeige über dem Knopf: Aufnahme läuft, erkannter Text, Ziel
  „In diese Notiz | Neue Notiz“; danach „Als neue Notiz lösen“
- Editor: Text an der Schreibmarke einfügen bzw. zurücknehmen
- Schalter „Sprachnotiz (nur lokal)“ im ⋮ des Pads, Hilfe „Sprachnotiz“
- Lastenheft F-215, Übergabe V77
- Tests 388 grün
```
