# Übergabe V107 → V108 E-Sources

Stand: 25.11.2026 · Chat V107 · Nächster Chat: **V108 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V108 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-225** (P8 V107), **F-222** (Stand V104) und **F-206 Schritt 10**. Docs: P8 https://claude.ai/artifact/6icqBwu4pHmFXDH8W59uJQ (PDF `docs/Arbeitspakete/F-225_V107_Wird-zu_Risiko_Aenderung.pdf`), F-225 https://claude.ai/artifact/VdDsnvWqaEfEx6dFrLS17N, F-222 https://claude.ai/artifact/LJyPmsG7JhmEaCxqAavh1N. **Termin Fr 04.12.2026**, Enricos Testphase ab 07.12. Weiter gelten V98-Doc (K1–K8), V96-Doc, F-220 (R1–R7). Leitlinien: **Trello**, **IPMA ICB4**, **MS Project / iTaskX**, Design und Anordnung an unsere UX/UI angepasst, **Funktion vor Design**, NF-08. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, Vorlagen `docs/Arbeitspakete/Vorlagen/LIESMICH.md`; kleine Punkte aus `V74_`–`V107_…` gelten weiter. Dann „Nächste Schritte“ ab 1.

## Was in V107 passiert ist

`npx tsc --noEmit -p .` sauber. Tests (`$HOME/vt2`, wie V61 neu angelegt): workspace **518** (+6), persons 17, stage 4, noteSources 1 – alle grün. **Nicht im Browser geprüft.** Die „Schleife“ aus V106 ist laut Enrico erledigt („Das geht ja wieder“).

1. **Entscheidungs-Doc F-225 P8** angelegt und von Enrico entschieden: „Machen wir nach deinen Vorschlägen. Beachte dabei die Leitlinien der ICB4“ → Option A, R1–R10 gelten (Lastenheft F-225).
2. **Gebaut P8 „Wird zu …“ Risiko · Änderung:**
   - Logik `workspace/risks.ts`; `isTask`/`tasksOfProject` in `projects.ts` – Projektliste, Steckbrief › Vorgänge, PSP (und damit Gantt) zählen Notizen mit `type: 'risk' | 'change'` nicht mehr.
   - Datenmodell `Note.risk` (`NoteRisk`: no, cause, event, effect, p, i, strategy, measure, owner, state, from, task), `Note.change` (`NoteChange`: no, why, days, cost, perf, scope, by, decider, state, decided, from, task), `Feedback.became` – nur optionale Felder, Format 11; Parser in `noteObjects.ts` bzw. `feedback.ts`, Zusammenführen (R7 Import) behält `became`.
   - Aktionen `steerAdd`, `riskEdit`, `changeEdit`, `changeDecide`, `steerTask`, `fbBecome`, `fbBecomeUndo`.
   - Oberfläche `components/ProjectSteer.tsx`: Rad „Ansicht“ Steckbrief · PSP · Gantt · **Risiken** · **Änderungen** · Entscheidungen · Meldungen. Tabelle + Angaben, Darstellung Liste · Matrix (5 × 5, Raster mit Pfeilen), „Vorgang anlegen …“, Entscheiden nur mit Befugnis „Entscheiden“.
   - Karte einer Projektmeldung (mit Bearbeitung): „Wird zu …“ › Risiko · Änderungsantrag; danach „Wurde zu …“ mit „Öffnen“ (`openSteer` → App wechselt in den Projekt-Modus, Cockpit zeigt Ansicht und Eintrag) und Rückgängig am Ort.
   - Hilfe „Risiken und Änderungen“ (Symbol), Tour „Projekte“ Schritt `steer`, Texte `STEER_TEXT`, CSS `.pjs__*`.
   - Beispielprojekt ColorGentlemen: 3 Risiken (CG-R-1…3) und 1 Änderungsantrag (CG-Ä-1), im Text als Beispiel gekennzeichnet.
3. `APP_VERSION = 'V107'`.

## Nächste Schritte

1. **F-222 Rest:** freie Entscheidungen ohne Projekt (Ort), Bezüge N5 + „Entscheidung vorbereiten …“ (auch an Änderungsanträgen, siehe P8-Doc „Was später davon abhängt“), Beispiel Wohnung, Tour „Entscheidungen“, Ziehen zum Umsortieren, Punkte-Spalten.
2. Dann Schritt 10: **Meilensteine** → **Basisplan** (Vermerk „neu wegen Änderung Ä-n“ möglich) → **Netzplan** → **F-220** → Ressourcen je Projekt → Bericht (Top-Risiken, offene Änderungen aus `steerCounts`/`risksOf`) → Projekt-Desk.
3. **Prüfliste für Enrico** (alles aus V77–V106 plus):
   - `npm test` in `web/`.
   - Projekt-Modus › Rad „Ansicht“: Risiken und Änderungen vorhanden; Projektliste/PSP/Gantt zeigen Risiken und Änderungen nicht als Vorgänge.
   - Beispielprojekt anlegen (⚙): Risiken CG-R-1…3, Matrix zeigt CG-R-1 bei W 3 × A 5 (rot), Liste nach Wert; Änderung CG-Ä-1.
   - „+ Risiko“ anlegen, W/A/Strategie/Zustand am Rad, Felder speichern beim Verlassen („Gespeichert.“), Eigner wählen, Rückgängig nach dem Anlegen.
   - Änderung: ohne Befugnis „Entscheiden“ → Hinweis am Ort; mit Befugnis „genehmigt“ + Begründung → Zeile „genehmigt am … durch Lenkungskreis“; „Vorgang anlegen …“ → neuer Vorgang im PSP/Gantt, Rückgängig.
   - Karte einer Projektmeldung (Bearbeitung an): „Wird zu …“ › Risiko → „Ist jetzt Risiko …“ mit Rückgängig; „Öffnen“ springt in die Ansicht Risiken mit dem Eintrag; Spur zeigt „Wurde zu Risiko …“.
   - Matrix nur mit Tastatur: Tab in die Matrix, Pfeile, Enter wählt.
   - Sicherung exportieren/importieren – Risiken, Änderungen, „wurde zu“ bleiben.

## Kleine Punkte (neu in V107)

- Nummern R-n/Ä-n: vom PSP-Präfix zählt nur das Kürzel vorn (Buchstaben), „CG-1.“ → „CG-R-1“; ohne Präfix „R-1“.
- Gelöschte Risiken behalten ihre Nummer, solange sie im Papierkorb liegen (`nextNo` zählt alle Notizen des Projekts dieser Art).
- Rückgängig nach „+ Risiko“ nutzt `noteDelete` (Papierkorb), nach „Wird zu …“ entfernt `undoBecome` die neue Notiz ganz.
- Risiken/Änderungen zählen weiter im Projektfokus, wenn ihnen jemand als „Zuständig“ zugeordnet wird (heute nur über das Pad möglich) – bei Bedarf in `focusLoad` mit `isTask` ausnehmen.
- Gefunden, nicht geändert: Tour-Auto-Start „Projekte“ in App setzt bei laufender Tour `tourAuto` trotzdem auf true (`setTour((x) => (auto && x ? x : 'projects'), auto)`) – zeigt dann evtl. „Nicht mehr automatisch anzeigen“ an der laufenden Tour.
- eslint in der VM weiter nicht verfügbar.

## Commit-Text V107 (e-sources)

**Summary:** `V107: F-225 P8 – Risiken und Änderungsanträge nach ICB4, „Wird zu …“ an Projektmeldungen`

**Description:**
```
- Neue Ansichten im Projekt-Modus: Risiken (Liste, Risikomatrix 5×5) und Änderungen
- Risiko: Ursache, Ereignis, Auswirkung, W × A = Risikowert, Strategie, Maßnahme, Eigner, Zustand
- Änderungsantrag: Termin, Kosten, Leistung, Umfang, Entscheidung mit Befugnis „Entscheiden“
- „Vorgang anlegen …“ für Maßnahme bzw. genehmigte Änderung
- Karte einer Projektmeldung: „Wird zu …“ Risiko · Änderungsantrag, „Öffnen“, Rückgängig
- Risiken und Änderungen zählen nicht als Vorgänge (Projektliste, PSP, Gantt)
- Beispielprojekt mit Risiken und Änderungsantrag, Hilfe, Tour-Schritt
- Dateiformat 11 erweitert (nur optionale Felder); Tests (518 + 17)
- Lastenheft, Übergabe V107

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q3c9A2M9SonnTdJJ6x
```
