# Übergabe V104 → V105 E-Sources

Stand: 25.11.2026 · Chat V104 · Nächster Chat: **V105 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V105 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-222** (Stand V104: Werkzeug Stufe 1), **F-224** (Rechte „Bearbeitung“, Doc offen) und **F-225** (Feedback in Projekten, neu). Docs: F-224 https://claude.ai/artifact/HZLMLQWXZru5rGPqBHJ52E (**noch als PDF nach `docs/Arbeitspakete/F-224_V104_Rechte-Bearbeitung.pdf` legen**), F-222 https://claude.ai/artifact/LJyPmsG7JhmEaCxqAavh1N, F-221 https://claude.ai/artifact/1M5KSM6VeL87nW12zuBPQj. **Termin Fr 04.12.2026**, Enricos Testphase ab 07.12. Weiter gelten V98-Doc (K1–K8), V96-Doc, F-220 (R1–R7). Leitlinien: **Trello**, **IPMA ICB4**, **MS Project / iTaskX**, Design und Anordnung an unsere UX/UI angepasst, **Funktion vor Design**, NF-08. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, Vorlagen `docs/Arbeitspakete/Vorlagen/LIESMICH.md`; kleine Punkte aus `V74_`–`V104_…` gelten weiter. Dann „Nächste Schritte“ ab 1.

## Was in V104 passiert ist

`npx tsc --noEmit -p .` sauber. Tests (`$HOME/vt2/run.sh`, wie V61 neu angelegt): workspace **502** (+10), persons 16, stage 4, noteSources 1 – alle grün. **Enrico bitte `npm test` in `web/`.** Im eingebauten Browser geprüft (`localhost:2910/?test=voll`): Tour „Feedback“ über die Suche (5 Schritte ohne Meldungen), Feedback anlegen → Karte ohne Zustand, Cockpit „Feedback“ Liste ↔ Board mit „Bearbeitung“; Projekt-Modus › Entscheidungen: Beispiel, alle vier Schritte, Entscheiden mit Pflicht-Begründung, Wieder öffnen – keine Fehler in der Konsole.

1. **F-221/F-224 – kein Zustand für Anwender (Wunsch Enrico):** Cockpit „Feedback“ ohne „Bearbeitung“ = Liste **„Meine Meldungen“** (`Fb.feedbackList`, neueste oben, Datum, „n offen“, Pfeile hoch/runter, Enter, Entf mit Rückgängig über der Liste); Board nur mit „Bearbeitung“. Karte: Rad „Zustand“ und Verworfen-Grund nur mit „Bearbeitung“, Kopf ohne Zustand. „nur Neue“ nur mit „Bearbeitung“. Texte (Hilfe `feedbackCockpit`/`feedbackElaborate`, Begriffe, Start-Tour, `allTip`, `modeOn`) ohne Board/Zustand für Anwender. **Schalter „Bearbeitung“ sieht noch jeder** → F-224.
2. **Tour „Feedback“ (F-217):** `TOURS.feedback` (intro, filter, list, board*, card, file, triage*, again; *nur mit Bearbeitung), `TourId 'feedback'`, Merker `esource.tour.feedback.v1`, Hilfe-Eintrag `tourFeedback` (Suche „Tour Feedback“), Knopf „Tour“ im Cockpit startet im Modus Feedback diese Tour (`onFeedbackTour`), startet einmal von selbst beim ersten Cockpit „Feedback“ (Cockpit-Tour dann nicht), endet mit dem Cockpit. Cockpit trägt jetzt Klasse `is-feedback`.
3. **F-222 Werkzeug Stufe 1:** `components/ProjectDecisions.tsx`, Rad „Ansicht“ im Projekt-Modus › „Entscheidungen“; Logik in `decisions.ts` (`DecisionOp`, `editDecision`, `stateOf`, `openPoints`, `pairsDiffer`, `addDecision`, `addExample`, `EXAMPLES` Wohnung/Malerbetrieb, `decisionMarkdown`, `decisionCsv`, `decisionFileName`, `decisionsFor`), Reducer `dcAdd`/`dcExample`/`dc`/`dcRemove`/`dcRestore`, Texte `DECISION_TEXT`, Hilfe `decisions`, CSS `.dc…`. Einzelheiten im Lastenheft F-222 „Stand V104“.
4. **Portfolio „Aktuelles“** (Repo SchulzEnrico.github.io, DE + EN): Notizen/Sheets, Personen und Auslastung, Main Stage, Feedback, Projektbereich mit Steckbrief, PSP, Gantt; „Als Nächstes“ Nutzwertanalyse, Meilensteine, Basis- und Netzplan …; rund 190 Anforderungen. **Eigener Commit im Portfolio-Repo** (Text unten).
5. Lastenheft: F-221/F-222 Stand V104, **F-224** und **F-225** neu (Liste Nr. 39/40 und Detail). `APP_VERSION = 'V104'`.

## Nächste Schritte

1. **F-224** nach Enricos Antworten (R1–R7) bauen; vorher PDF des Docs ablegen (siehe Startanweisung).
2. **F-225** Feedback in Projekten: Entscheidungs-Doc an der Seite anlegen (Instanzen aus der Projektorganisation, Felder-Baukasten je Projekt, Verhältnis zu Risiken/Change Requests, Befugnis aus F-224).
3. **F-222 Rest:** freie Entscheidungen (ohne Projekt – Ort klären, z. B. Notizen-Cockpit oder Projekt-Modus „ohne Projekt“), Bezüge N5 + „Entscheidung vorbereiten …“ aus der Notiz, Beispiel Wohnung, Tour „Entscheidungen“, Ziehen zum Umsortieren, Punkte-Spalten.
4. Dann Schritt 10: **Meilensteine** → **Basisplan** → **Netzplan** → **F-220** → Ressourcen je Projekt → Bericht → Projekt-Desk.
5. **Wenn alles steht – Prüfliste für Enrico:** alles aus V77–V103 plus:
   - `npm test` in `web/`.
   - Feedback anlegen (Alt/⌥+F, Strg/⌘+Enter) → Karte ohne „Zustand“. Cockpit-Rad › „Feedback“: Liste „Meine Meldungen“, Pfeile, Enter, Entf + Rückgängig über der Liste. „Bearbeitung“ an → Board, Karte mit Zustand, „nur Neue“; aus → wieder Liste.
   - Tour „Feedback“: Suche „Tour Feedback“, Knopf „Tour“ im Cockpit „Feedback“; einmal von selbst beim ersten Öffnen.
   - Projekt-Modus › Rad „Ansicht“ › „Entscheidungen“: „Beispiel ansehen“; Schritt-Rad durch alle vier Schritte; Gewicht ändern → Summe und „Auf 100 % verteilen“; Muss anhaken; Paarvergleich wählen → „Gewichte übernehmen“; Bewertung 0–10 eintippen, Begründung zum Feld; Rangliste rechnet mit; Ergebnis: andere Lösung ohne Begründung → rote Meldung; mit Begründung → gesperrt; „Wieder öffnen“; Als Markdown/CSV.
   - Sicherungsdatei exportieren/importieren – Entscheidungen bleiben (Format 11).

## Kleine Punkte (neu in V104)

- Rad „Schritt“ reagiert verzögert auf schnelle Pfeil-Folgen (gleiches Verhalten wie andere Räder) – kein Fehler.
- Bewertungsfelder sind `type="number"` (0–10, ganze Zahlen); größere Zahlen werden auf 10 gekürzt.
- Gestapelte Balken: Farbe je Kriterium per `--dc-h`, Name und Punkte im Tooltip, Werte immer als Text daneben.
- Beispiel-Entscheidungen sind echte Einträge (löschen mit 🗑 und Rückgängig).
- Badge am Knopf „Feedback“ zählt weiter neue Meldungen – für Anwender als „neu gemeldet“ lesbar; ggf. mit F-224 prüfen.

## Commit-Text V104 (e-sources)

**Summary:** `V104: Feedback ohne Zustand für Anwender, Tour „Feedback“; F-222 Nutzwertanalyse Werkzeug Stufe 1; F-224/F-225 neu`

**Description:**
```
- Feedback: Anwender sehen „Meine Meldungen“ als Liste, keinen Zustand;
  Board, Zustand und „nur Neue“ nur mit „Bearbeitung“
- Tour „Feedback“ (Suche, Knopf im Cockpit, einmal von selbst)
- F-222: Projekt-Modus › Ansicht „Entscheidungen“ – Kriterien,
  Paarvergleich, Bewertung, Ergebnis mit Rangliste live, Entscheiden mit
  Begründung und Sperre, Beispiel, Markdown/CSV; Logik und Tests
- Lastenheft: F-221/F-222 Stand V104, F-224 Rechte „Bearbeitung“,
  F-225 Feedback in Projekten; Übergabe V104; Tests (502)
```

## Commit-Text Portfolio (SchulzEnrico.github.io)

**Summary:** `Aktuelles: Aufgaben, Personen, Projektbereich und Feedback (E-Sources)`

**Description:**
```
- E-Sources: To-do, Kanban, Eisenhower, Personen mit Auslastung, Main Stage,
  Feedback-Funktion; Projektbereich mit Steckbrief, PSP und Gantt
- Als Nächstes: Nutzwertanalyse, Meilensteine, Basis- und Netzplan
- Deutsch und Englisch
```
