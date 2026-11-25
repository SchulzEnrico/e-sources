# Übergabe V106 → V107 E-Sources

Stand: 25.11.2026 · Chat V106 · Nächster Chat: **V107 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V107 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-225** (Bau 2 V106), **F-224** (R7 V106) und **F-222** (Stand V104). Docs: F-225 https://claude.ai/artifact/VdDsnvWqaEfEx6dFrLS17N (PDF `docs/Arbeitspakete/F-225_V105_Feedback-in-Projekten.pdf`), F-224 https://claude.ai/artifact/HZLMLQWXZru5rGPqBHJ52E, F-222 https://claude.ai/artifact/LJyPmsG7JhmEaCxqAavh1N. **Termin Fr 04.12.2026**, Enricos Testphase ab 07.12. (Enrico testet live mit.) Weiter gelten V98-Doc (K1–K8), V96-Doc, F-220 (R1–R7). Leitlinien: **Trello**, **IPMA ICB4**, **MS Project / iTaskX**, Design und Anordnung an unsere UX/UI angepasst, **Funktion vor Design**, NF-08. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, Vorlagen `docs/Arbeitspakete/Vorlagen/LIESMICH.md`; kleine Punkte aus `V74_`–`V106_…` gelten weiter. **Zuerst Enrico nach seinen Live-Tests fragen** (in V106 kam der Text nicht mit) und nach der „Schleife“ (siehe unten). Dann „Nächste Schritte“ ab 1.

## Was in V106 passiert ist

`npx tsc --noEmit -p .` sauber. Tests (`$HOME/vt2`, wie V61 neu angelegt): workspace **512** (+6), persons 17, stage 4, noteSources 1 – alle grün. **Nicht im Browser geprüft.** Enricos Dev-Server war zwischendurch aus („irgendwo war wohl ne Schleife“) – läuft wieder; Ursache unbekannt (Seite hing oder Server stand? Was zuletzt geklickt?) → in V107 klären.

1. **F-225 Bau 2 (Rest bis auf P8):**
   - Hilfe **„Meldungen im Projekt“** (`projectFeedback`, Symbol `feedback`).
   - **Tour „Projekte“** (`TourId 'projects'`, Merker `esource.tour.projects.v1`) – gab es bisher nicht: Intro, Projektliste, Rad „Ansicht“, Steckbrief, Instanzen (nur im Steckbrief), Etwas melden (`.tb-fb`), Meldungen, + Projekt, Tour wieder starten. Knopf **„Tour“** im Kopf der Projektliste (`.pj__tour`), startet einmal von selbst beim ersten Öffnen des Projekt-Modus (`requestTour('projects', true)`, neu `tourRequestedAuto()` in `tour.ts`), Hilfe/Suche „Tour Projekte“ (`run: 'tourProjects'` → `openProjectsTour` in App: wechselt erst in den Projekt-Modus).
   - **Zahl neuer Meldungen am Rad „Ansicht“**: Eintrag „Meldungen (2)“, Hinweis „2 neue Meldungen“.
   - **P4 eigene Felder:** `FeedbackFormRaw.custom` (`FeedbackFieldDef` in `types.ts`: Text · Zahl · Datum · Auswahl · Ja/Nein, `required`, bis 12; Auswahl 2–12 Möglichkeiten), Werte `Feedback.extra` (Schlüssel = Feld-Id). Logik `addCustom` (Fehler name/full/options/twice), `editCustom` (Typ bleibt), `moveCustom`, `removeCustom`/`restoreCustom`, `missingCustom`, `extraText`, `FeedbackPatch.extra` (null = entfernen). Oberfläche „Formular einstellen“ › **„Eigene Felder“** (`FormCustom` in `ProjectFeedback.tsx`) und Karte › Gruppe **„Angaben für das Projekt“** (`customField` in `FeedbackCard.tsx`; Auswahl als Rad mit „—“, Ja/Nein als Häkchen, Datum/Zahl/Text speichern beim Verlassen; Pflicht mit * und in „Noch offen“). Markdown-Datei: Abschnitt „Angaben für das Projekt“.
   - **Arten umbenennen** (`kinds`, `kindName`, `renameKind`, `FormKinds`): im Feedback-Fenster (wenn „An“ = Projekt), Karte, Cockpit (mit `project`) und Datei.
   - **P6 Vorlagen** (`FormTemplate`, `applyTemplate`, `templateOf`): Standard · IPMA-Problemmeldung · Kurz; Rad + „Übernehmen“, „Jetzt: …/angepasst“, Rückgängig am Ort; eigene Felder und Arten bleiben, Felder der Vorlage kommen dazu (gleichnamige nicht doppelt).
   - **P9 Eskalation:** Karte › Rad **„Geht an“** (nur mit Befugnis, nur bei ≥ 2 Instanzen), `forwardFeedback`, Vermerk-Art `'to'` („Weiter an: Projektleitung → Lenkungskreis“), Aktion `fbTo`.
   - `parseFeedbackForm` jetzt in `feedback.ts`; `noteObjects.ts` nutzt sie. `toggleForm` behält eigene Felder und Arten.
2. **F-224 R7 Import:** Cockpit „Feedback“ › **„Datei einlesen …“** (nur mit Befugnis, versteckte Dateiauswahl `.json`), `mergeFeedbackFile` + `setFeedbackList`, Aktion `fbList`, Meldung am Ort mit Rückgängig. Regeln: neue Meldungen dazu; bekannte nur, wenn die Datei neuer ist – dann ihre Angaben, unsere Bearbeitung bleibt (Zustand, Instanz, Bezüge, ähnliche, Entscheidung, „Behoben in“, Projekt), Vermerke vereint.
3. **Portfolio:** „nach dem Vorbild von Trello“ / „modelled on Trello“ entfernt (DE/EN) – von Enrico schon committet und gepusht.
4. Lastenheft F-224/F-225 nachgetragen. `APP_VERSION = 'V106'`.

## Nächste Schritte

1. **Enricos Live-Test-Ergebnisse** abarbeiten (Fehler zuerst), „Schleife“ klären.
2. **F-225 P8 „Wird zu …“ Risiko · Änderung:** vorher Claude Doc an der Seite (Regel 23.11.): Notizen mit `type: 'risk' | 'change'` würden heute als Vorgänge in PSP/Gantt/Projektliste zählen → Optionen: (A) eigene Ansichten „Risiken“ und „Änderungen“ im Rad „Ansicht“ (Risikoliste nach ICB4 mit Eintritt/Auswirkung, Änderungsantrag mit Entscheidung im Lenkungskreis), Typen aus PSP/Gantt ausnehmen; (B) nur Vermerk an der Meldung; Fragen mit Vorschlag und Spalte „Antwort Enrico“, PDF nach `docs/Arbeitspakete/`.
3. **F-222 Rest:** freie Entscheidungen ohne Projekt (Ort), Bezüge N5 + „Entscheidung vorbereiten …“, Beispiel Wohnung, Tour „Entscheidungen“, Ziehen zum Umsortieren, Punkte-Spalten.
4. Dann Schritt 10: **Meilensteine** → **Basisplan** → **Netzplan** → **F-220** → Ressourcen je Projekt → Bericht → Projekt-Desk.
5. **Prüfliste für Enrico** (alles aus V77–V105 plus):
   - `npm test` in `web/`.
   - Projekt-Modus zum ersten Mal: Tour „Projekte“ startet von selbst; Knopf „Tour“ oben; Hilfe/Suche „Tour Projekte“ wechselt in den Projekt-Modus und startet sie. Im Steckbrief erscheint der Schritt „Instanzen“, in anderen Ansichten nicht.
   - Rad „Ansicht“: „Meldungen (n)“ bei neuen Projektmeldungen.
   - „Meldungen“ › „Formular einstellen“ (mit Befugnis): Vorlage „IPMA-Problemmeldung“ übernehmen → Pflichtfelder + drei eigene Felder; Rückgängig. Eigenes Feld anlegen (jede Art einmal), umbenennen, Pflicht, ↑↓, ✕ + Rückgängig. Arten umbenennen (z. B. Fehler → Problem) → Feedback-Fenster im Projekt, Karte, Liste zeigen den neuen Namen; leeren = wie ab Werk.
   - Karte einer Projektmeldung: „Angaben für das Projekt“ ausfüllen (Datum, Zahl, Auswahl, Ja/Nein), „Gespeichert.“ am Feld, Pflicht in „Noch offen“; mit Befugnis „Geht an“ ändern → Spur „Weiter an: …“, Kopf zeigt die neue Instanz.
   - Cockpit „Feedback“ mit Befugnis: „Datei einlesen …“ mit einer eben gespeicherten JSON → „0 neu · 0 aktualisiert · n schon aktuell“; Datei eines anderen Browsers → neu/aktualisiert, Rückgängig. Falsche Datei → Fehler am Ort.
   - Sicherung exportieren/importieren – eigene Felder, Werte, Arten bleiben.

## Kleine Punkte (neu in V106)

- Tour-Auto-Start: `requestTour(id, auto)` merkt `auto` in einer Modul-Variable (`tourRequestedAuto`); App startet bei `auto` nicht, wenn schon eine Tour läuft.
- Rad „Geht an“ zeigt bei Meldungen ohne `to` die erste Instanz als gewählt; Wechsel auf die erste ist dann kein Weitergeben (kein Eintrag) – bei Bedarf „—“ ergänzen.
- Entfernte eigene Felder: Werte bleiben in `extra` liegen (kommen mit Rückgängig wieder), werden aber nirgends gezeigt.
- Vorlage „Standard“ setzt Felder an/aus und Pflicht zurück, löscht aber keine eigenen Felder.
- Import ersetzt die ganze Feedback-Liste in einer Aktion (`fbList`) – Rückgängig setzt die Liste von vor dem Einlesen zurück (auch Änderungen dazwischen).
- eslint in der VM weiter nicht verfügbar.

## Commit-Text V106 (e-sources)

**Summary:** `V106: F-225 Bau 2 – Tour „Projekte“, eigene Felder, Vorlagen, Arten, „Geht an“; F-224 R7 Feedback-Dateien einlesen`

**Description:**
```
- Tour „Projekte“ (neu) mit Knopf in der Projektliste, Hilfe „Meldungen im Projekt“
- Rad „Ansicht“ zeigt neue Projektmeldungen („Meldungen (n)“)
- Projektformular: eigene Felder (Text, Zahl, Datum, Auswahl, Ja/Nein, Pflicht),
  Vorlagen (Standard, IPMA-Problemmeldung, Kurz), Arten umbenennen
- Karte: „Angaben für das Projekt“, Eskalation „Geht an“ mit Spur
- Cockpit „Feedback“: „Datei einlesen …“ (Zusammenführen nach Id, Rückgängig)
- Dateiformat 11 erweitert (nur optionale Felder); Tests (512 + 17)
- Lastenheft, Übergabe V106
```
