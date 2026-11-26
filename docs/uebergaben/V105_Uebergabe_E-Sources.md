# Übergabe V105 → V106 E-Sources

Stand: 25.11.2026 · Chat V105 · Nächster Chat: **V106 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V106 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-224** (gebaut V105), **F-225** (Bau 1 V105) und **F-222** (Stand V104). Docs: F-225 https://claude.ai/artifact/VdDsnvWqaEfEx6dFrLS17N (PDF `docs/Arbeitspakete/F-225_V105_Feedback-in-Projekten.pdf`), F-224 https://claude.ai/artifact/HZLMLQWXZru5rGPqBHJ52E (PDF liegt), F-222 https://claude.ai/artifact/LJyPmsG7JhmEaCxqAavh1N. **Termin Fr 04.12.2026**, Enricos Testphase ab 07.12. Weiter gelten V98-Doc (K1–K8), V96-Doc, F-220 (R1–R7). Leitlinien: **Trello**, **IPMA ICB4**, **MS Project / iTaskX**, Design und Anordnung an unsere UX/UI angepasst, **Funktion vor Design**, NF-08. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, Vorlagen `docs/Arbeitspakete/Vorlagen/LIESMICH.md`; kleine Punkte aus `V74_`–`V105_…` gelten weiter. Dann „Nächste Schritte“ ab 1.

## Was in V105 passiert ist

`npx tsc --noEmit -p .` sauber. Tests (`$HOME/vt2`, wie V61 neu angelegt): workspace **506** (+4), persons **17** (+1), stage 4, noteSources 1 – alle grün. **Nicht im Browser geprüft** – der Dev-Server auf Enricos Mac lief nicht (localhost:2910 leer). **Enrico bitte `npm test` in `web/` und live testen.**

1. **F-224 entschieden und gebaut** (Enrico: Vorschläge R1–R7 übernehmen; im Doc eingetragen, PDF abgelegt). Neue Befugnis `'feedback'` „Feedback bearbeiten“ (`PersonRight`, `ALL_RIGHTS`, `EXPLICIT_RIGHTS`); „ich“ ohne gesetzte Befugnisse hat alle **außer** dieser (Ausnahme P18, `hasRight`); `canTriage(ws)`. Cockpit „Feedback“: Schalter „Bearbeitung“ nur mit Befugnis, sonst gar nicht; Karte: Bearbeitung nur mit Befugnis. Personen-Cockpit: Häkchen „Feedback bearbeiten“, Hinweis „Gilt nur auf diesem Gerät – Schutz kommt mit Konten“, in der Tabelle Kurzform „Feedback“. Hilfe/Tour-Schritt „Bearbeitung“ angepasst.
2. **F-225 Doc angelegt und entschieden** (Enrico: „so, wie es sinnvoll ist und es in der ICB4 gerne gesehen wäre … wir folgen deinen Vorschlägen“) – P1–P10 wie Vorschlag, Option C.
3. **F-225 Bau 1:** `Feedback.project`/`to`; `Project.roles` (Instanzen, Vorgabe Projektleitung · Lenkungskreis · Auftraggeber) und `Project.feedbackForm` (`off`, `required`) – Format 11, nur optionale Felder. `feedback.ts`: `FeedbackFilter.project` (null = nur E-Sources), `missingOf(f, form)`, `formOf`, `toggleForm`, `newCountOf`, Export mit `project`; `newCount` zählt nur Meldungen an E-Sources. `projects.ts`: `DEFAULT_ROLES`, `rolesOf`, `roleOf`, `editRoles`, `reportableProjects`, `ROLES_MAX = 12`. Oberfläche: Feedback-Fenster mit Rad „An“ (E-Sources · Projekte) und Rad „Instanz“, im Projekt-Modus vorgewählt das gezeigte Projekt (`shownProjectId()` aus `ProjectCockpit`); Projekt-Modus › Rad „Ansicht“ › **„Meldungen“** (`components/ProjectFeedback.tsx`: „Formular einstellen“ nur mit Befugnis – Felder an/aus, Pflicht – plus `FeedbackCockpit` mit `project`); Steckbrief › **„Instanzen“** (`ProjectRoles`: Name, Person/Team, entfernen, hinzufügen, Meldung am Ort); Karte: Kopf „Projekt › Instanz“, Felder nach Formular, Pflicht bei „noch offen“. Texte `PROJECT_FEEDBACK_TEXT`, CSS `.pjf…`, `.pj__role…`.
4. **Portfolio (Repo SchulzEnrico.github.io):** Text zu E-Sources unter „Aktuell“ neu gegliedert (DE + EN) – Teil „E-Sources“ mit neun Punkten und fetten Stichworten (Idee, ein Aufbau für alles, Desk und Portale, Notizen und Aufgaben, Team und Projekte, Feedback am Ort, kleine Helfer, als Nächstes, für alle gemacht), Teil „Außerdem“ mit den übrigen drei Punkten; Nutzwertanalyse jetzt bei „gebaut“. CSS `.step-part .list li strong`, Cache `style.css?v=20261125a`. **Eigener Commit** (Text unten).
5. Lastenheft: F-224 ✓, F-225 ◐ mit Entscheidungen und Stand. `APP_VERSION = 'V105'`.

## Nächste Schritte

1. **F-225 Rest:** Hilfe-Eintrag „Meldungen“ (+ Symbol in `HELP_ICON`) und Tour-Schritt im Projekt; eigene Felder (Text, Zahl, Datum, Auswahl, Ja/Nein), Arten je Projekt umbenennen, Vorlagen (Standard, IPMA-Problemmeldung, Kurz), „Wird zu …“ Risiko · Änderung, Eskalation „Weiter an …“ (Stufe 2). Prüfen: Badge am Projekt (neue Meldungen) im Rad „Ansicht“?
2. **F-224 R7:** Feedback-Dateien von Anwendern einlesen (Zusammenführen nach Id), nur mit Befugnis.
3. **F-222 Rest:** freie Entscheidungen ohne Projekt (Ort), Bezüge N5 + „Entscheidung vorbereiten …“, Beispiel Wohnung, Tour „Entscheidungen“, Ziehen zum Umsortieren, Punkte-Spalten.
4. Dann Schritt 10: **Meilensteine** → **Basisplan** → **Netzplan** → **F-220** → Ressourcen je Projekt → Bericht → Projekt-Desk.
5. **Prüfliste für Enrico** (alles aus V77–V104 plus):
   - `npm test` in `web/`.
   - Cockpit „Feedback“ ohne Befugnis: kein Schalter „Bearbeitung“, Liste „Meine Meldungen“. Cockpit „Personen“ › ich › Befugnis „Feedback bearbeiten“ anhaken (Hinweis „gilt nur auf diesem Gerät“) → Schalter erscheint; Tabelle zeigt „Feedback“. Haken weg → Schalter weg, Karte ohne Zustand.
   - Projekt-Modus › Steckbrief › „Instanzen“: Person zuordnen, umbenennen, hinzufügen, entfernen (letzte bleibt); Meldung erscheint am Ort.
   - Im Projekt-Modus Alt/⌥+F: Rad „An“ zeigt das Projekt, Rad „Instanz“ mit Hinweis „Geht an …“; speichern → nicht im Cockpit „Feedback“, sondern in Projekt › Ansicht „Meldungen“; Karte zeigt „Projekt › Instanz“.
   - „Meldungen“ mit Befugnis: „Formular einstellen“ – Feld aus → in der Karte weg; Pflicht → bei „noch offen“; „Was ist passiert“ und Schweregrad bleiben.
   - Sicherung exportieren/importieren – Instanzen, Formular und Projektmeldungen bleiben.

## Kleine Punkte (neu in V105)

- `shownProjectId()` ist eine Modul-Variable in `ProjectCockpit.tsx` – zeigt das zuletzt gezeigte Projekt, auch wenn der Projekt-Modus gerade nicht offen ist (App fragt nur im Projekt-Modus).
- Rad „An“ listet alle Projekte außer erledigt/abgebrochen – bei sehr vielen Projekten ggf. später Suche statt Rad.
- `formOf` lässt „Was ist passiert“ nie aus; Schweregrad lässt sich nicht ausschalten, nur zur Pflicht machen.
- Projektmeldungen erscheinen nicht mehr im Cockpit „Feedback“ und nicht in der Datei „Als Datei speichern“ dort (nur Meldungen an E-Sources); in Projekt › „Meldungen“ speichert der Knopf nur die Meldungen des Projekts.
- eslint war in der VM nicht verfügbar (kein Netz) – `shownProjectId`-Export neben einer Komponente könnte eine react-refresh-Warnung geben.

## Commit-Text V105 (e-sources)

**Summary:** `V105: F-224 Befugnis „Feedback bearbeiten“; F-225 Feedback in Projekten Bau 1 – Instanzen, Formular, Ansicht „Meldungen“`

**Description:**
```
- F-224: neue Befugnis „Feedback bearbeiten“ (nicht ab Werk); Schalter
  „Bearbeitung“ und Zustand nur mit Befugnis; Hinweis im Personen-Cockpit
- F-225: Meldungen an ein Projekt und eine Instanz (Rad „An“/„Instanz“ im
  Feedback-Fenster), Instanzen im Steckbrief (ICB4), Formular je Projekt
  (Felder an/aus, Pflicht), Projekt-Modus › Ansicht „Meldungen“
- Dateiformat 11 erweitert (nur optionale Felder); Tests (506 + 17)
- Docs F-224/F-225 als PDF, Lastenheft, Übergabe V105
```

## Commit-Text Portfolio (SchulzEnrico.github.io)

**Summary:** `Aktuelles: E-Sources-Text neu gegliedert (DE/EN)`

**Description:**
```
- E-Sources in neun kurze Punkte mit Stichworten gegliedert
- übrige Punkte unter „Außerdem“ bzw. „Also“
- Nutzwertanalyse und Feedback in Projekten ergänzt
- Stylesheet-Version erhöht
```
