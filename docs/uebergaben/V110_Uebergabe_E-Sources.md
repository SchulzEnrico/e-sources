# Übergabe V110 → V111 E-Sources

Stand: 26.11.2026 · Chat V110 · Nächster Chat: **V111 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V111 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-226** (entschieden V108, G1–G11; Absätze „Gebaut V109“ und „Gebaut V110“), **F-222** (Stand V108 E1–E6, „Gebaut V110“ mit „Noch offen“), **F-227** (Handbuch) und **F-206 Schritt 10**. Docs: **F-226** https://claude.ai/artifact/QxM6UPG6NFaAgkJwsb8EVy (PDF `docs/Arbeitspakete/F-226_V108_Projektformulare_GPM.pdf`), F-222 V108 https://claude.ai/artifact/MXgwEhtFcAJSLYc13zbZd8, F-225 https://claude.ai/artifact/VdDsnvWqaEfEx6dFrLS17N, P8 https://claude.ai/artifact/6icqBwu4pHmFXDH8W59uJQ. **Termin Fr 04.12.2026**, Enricos Testphase ab 07.12. Weiter gelten V98-Doc (K1–K8), V96-Doc, F-220 (R1–R7). Leitlinien: **Trello**, **IPMA ICB4 / GPM-Leitfaden Z01D Rev. 09**, **MS Project / iTaskX**, Design und Anordnung an unsere UX/UI angepasst, **Funktion vor Design**, NF-08. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, Vorlagen `docs/Arbeitspakete/Vorlagen/LIESMICH.md`; kleine Punkte aus `V74_`–`V110_…` gelten weiter. **Handbuch** `docs/Handbuch/E-Sources_Handbuch.md` bei jeder Änderung mitführen (Claude pflegt es selbst). Direkt mit „Nächste Schritte“ ab 1 **bauen**.

## Was in V110 passiert ist

`npx tsc --noEmit -p .` sauber. Tests (`$HOME/vt2/run.sh`, wie V61 neu angelegt – Skript läuft workspace, persons, stage, noteSources, gpm): workspace **522**, persons 17, stage 4, noteSources 1, **gpm 26** (+4) – alle grün. **Im eingebauten Browser geprüft** (`localhost:2910/?test=voll`, Beispielprojekt): Ansicht „Formulare“ mit Knopf „Im Pad“ und „Tour“ (Tour startet von selbst), Pad im Vollbild (Formulare, Reiter Entscheidungen, Fenster-Modus, Schließen), Gantt mit Phasenbalken in drei Spuren, Risiko-Angaben mit „gerechnet“ und Maßnahmen-Liste, Änderungsantrag › „Entscheidung vorbereiten …“ › „Öffnen“ im Pad – keine Seitenfehler.

1. **Pad im Vollbild** (F-226 G2, F-222 E1-C): `components/WorkPad.tsx`, `components/WorkPadOpen.tsx` (`openWorkPad`, `WorkPadButton`, Ereignis `esource:workpad`), Zustand `workPad` in `App.tsx`, CSS `.workpad…` (im Projekt- und Notizen-Modus sichtbar geschaltet). `ProjectForms`/`Decisions` mit `inPad` (eigene Ids), `Decisions` mit `scope`.
2. **Phasenbalken im Gantt** (G8): `Gt.phaseBars` in `gantt.ts`; `ProjectGantt` mit Spuren (`--gt-lanes`), Textliste, Phase im Zeilen-Label, Legende; `PhasePick` (Rad „Phase“) in `TaskInfo` (`ProjectPsp.tsx`).
3. **Risiken quantitativ + Maßnahmen** in `ProjectSteer.tsx` › `RiskDetails`/`Measures`; `Rk.editRisk` schreibt W/A aus EW/Tragweite mit (Budget des Projekts).
4. **Auslastung aus Einsätzen** (G7): `Gp.involves`, `Gp.hoursFor`; `focusLoad.loadOf`, `Ps.openCount`, `psp.ts` und `projects.rowOf` (`planHours`), FocusCockpit-Liste zeigt Stunden je Person. Beispiel CG-1.6.4 ohne Hand-Plan (Test in `workspace.test.ts` angepasst).
5. **Hilfe/Tour „Formulare“**: Hilfe `projectForms`, `tourForms` (+ `HELP_ICON`), `TOURS.forms`, Knopf „Tour“ in den Formularen, Auto-Start einmal, `case 'tourForms'` in App (öffnet bei Bedarf das Pad).
6. **F-222 E2/E4**: `PrepareLine` in `ProjectDecisions.tsx`, an `NoteTab` (jede Notiz) und `ChangeDetails`; „Nutzwert empfiehlt“ über `Pr.suggestionFor`; Hilfe „Entscheidungen“ ergänzt.
7. Handbuch Stand V110 (7, 7.1, 8, Änderungsverzeichnis), Lastenheft F-226/F-222 „Gebaut V110“, `APP_VERSION = 'V110'`.

## Nächste Schritte

1. **F-222 Rest (bis 04.12.):** Bezüge-Chips „+ Bezug“ an Lösungen (Notiz, Source, Person, Feedback), Ziehen zum Umsortieren (Kriterien/Lösungen), Punkte-Spalten auf Wunsch, Tour „Entscheidungen“, E3 Befugnis im Pad prüfen.
2. **F-226 Feinschliff Stufe 1:** Anzeige von Aufwand mit Einsätzen auch in `SheetViews`/`PersonChips` (lesen noch `effort.plan`), `removePerson` nimmt Einsätze nicht mit (erst beim Laden bereinigt – mit Rückgängig nachziehen), doppelte Ziel-Codes prüfen.
3. **F-226 Stufe 2** (Testphase): Abnahmekriterien-Formular, AKV, DKI-Matrix, AP-Formular, Statusbericht, Kosten-Ganglinie, Report-Ausgabe PDF, Portfolios.
4. Dann Schritt 10 laut Stufenplan (Basisplan, Netzplan, F-220, Projekt-Desk).
5. **Prüfliste für Enrico** (alles aus V77–V109 plus):
   - `npm test` in `web/`.
   - ⚙ Beispielprojekt **entfernen und neu anlegen**.
   - Formulare › „Im Pad“: Pad im Vollbild, Reiter Formulare/Entscheidungen (auch Pfeile), Rad „Projekt“ bei mehreren Projekten, Alt/⌥+Enter Vollbild ↔ Fenster, Esc im Kopf schließt, Fokus zurück. Dasselbe aus dem Cockpit › Entscheidungen.
   - Gantt: Phasenbalken (drei Spuren), Textzeile „Phasen: …“, Vorgang wählen › Rad „Phase“ ändern → Balken passt sich an (Phase ohne Beginn/Ende im Phasenplan → gestrichelt, aus den Vorgängen).
   - Risiken › CG-R-1: EW/Tragweite ändern → W/A „gerechnet“, Matrix folgt; „+ Maßnahme“, beschlossen an/aus → Wert danach; Löschen mit Rückgängig; „Chance statt Risiko“.
   - Personen-Cockpit/Fokus: Lackiermeister/in mit 180 h aus CG-1.6.4 in den Wochen von CG-1.6.4.
   - Änderungen › CG-Ä-2 › „Entscheidung vorbereiten …“ → Rückgängig; nochmal → „Öffnen“ (Pad); Entscheidung bewerten → am Antrag „Nutzwert empfiehlt: …“.
   - Notiz öffnen › „Entscheidung vorbereiten …“ unten in der Notiz.
   - Hilfe/Suche „Tour Formulare“, „Stakeholderanalyse“.

## Kleine Punkte (neu in V110)

- `.pjf` ist doppelt belegt: `ProjectFeedback` nutzt ebenfalls Klassen `pjf…` (Projekt-Feedback). Tour-Ziele daher immer mit eigenen Klassen (`.pjf__chapter`, `.pjf__addrow`, `.pjf__fieldsbtn`, `.pjf__open`, `.workpad__open`); App prüft `.pjf__chapter`.
- Änderungsantrag „Beantragt von“ zeigt im Beispiel die Personen-Id (`pn-cg-gl`) als Text – `by` ist dort eine Person, das Feld ein Textfeld. Personen-Auswahl daraus machen.
- `PrepareLine` steht an **jeder** Notiz (auch ohne Projekt → freie Entscheidung); wenn zu viel, nur in ⋮ verschieben.
- Im Test wurde `esource.workpad.full.v1` und `esource.tour.forms.v1` auf localhost:2910 wieder gelöscht; die Tour „Projekte“ ist dort als gesehen gemerkt.
- Gantt-Kopf: Zeilen Monate/Wochen sind mit Phasen fest 20 px hoch; bei sehr vielen überlappenden Phasen wächst der Kopf je Spur um 18 px.
- ModeWheel im Testbrowser: Pfeiltasten wechselten das Rad „Ansicht“ nicht zuverlässig, Klicks schon (weiterschalten).

## Commit-Text V110 (e-sources)

**Summary:** `V110: Pad im Vollbild für Formulare und Entscheidungen, Phasenbalken im Gantt, Risiko-Maßnahmen, Auslastung aus Einsätzen, Tour Formulare, Entscheidung vorbereiten`

**Description:**
```
- Pad im Vollbild (F-226 G2, F-222 E1-C): Formulare und Entscheidungen mit „Im Pad“, Reiter, Rad Projekt, Vollbild/Fenster (Alt+Enter), Esc schließt
- Gantt: Phasenbalken aus dem Phasenplan bzw. den Vorgängen (Spuren bei Überlappung), Rad „Phase“ in den Vorgangs-Angaben
- Risiken: EW %/Tragweite € mit W/A „gerechnet“ (auch in Liste/Matrix), Chance, Maßnahmen präventiv/korrektiv mit Kosten, Beschluss, Wert danach
- Auslastung aus Einsätzen: Fokus/Personen zählen je Ressource ihre Stunden; PSP und Projektliste mit Plan aus Einsätzen; CG-1.6.4 gerechnet
- Hilfe und Tour „Formulare“
- F-222: „Entscheidung vorbereiten …“ an Notiz und Änderungsantrag, „Nutzwert empfiehlt“ am Antrag
- Handbuch V110, Lastenheft F-226/F-222, Tests gpm (26), Übergabe V110

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q6FdwuajMdam7Ndh3g
```
