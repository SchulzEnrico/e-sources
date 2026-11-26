# Übergabe V108 → V109 E-Sources

Stand: 26.11.2026 · Chat V108 · Nächster Chat: **V109 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V109 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-226** (entschieden V108, G1–G11), **F-227** (Handbuch, neu), **F-222** (Stand V108, E1–E6) und **F-206 Schritt 10**. Docs: **F-226** https://claude.ai/artifact/QxM6UPG6NFaAgkJwsb8EVy (PDF `docs/Arbeitspakete/F-226_V108_Projektformulare_GPM.pdf`), F-222 V108 https://claude.ai/artifact/MXgwEhtFcAJSLYc13zbZd8 (PDF `docs/Arbeitspakete/F-222_V108_Freie-Entscheidungen.pdf`), F-225 https://claude.ai/artifact/VdDsnvWqaEfEx6dFrLS17N, P8 https://claude.ai/artifact/6icqBwu4pHmFXDH8W59uJQ. **Termin Fr 04.12.2026**, Enricos Testphase ab 07.12. Weiter gelten V98-Doc (K1–K8), V96-Doc, F-220 (R1–R7). Leitlinien: **Trello**, **IPMA ICB4 / GPM-Leitfaden Z01D Rev. 09**, **MS Project / iTaskX**, Design und Anordnung an unsere UX/UI angepasst, **Funktion vor Design**, NF-08. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, Vorlagen `docs/Arbeitspakete/Vorlagen/LIESMICH.md`; kleine Punkte aus `V74_`–`V108_…` gelten weiter. Das F-226-Doc ist fertig entschieden (Option B, alle Vorschläge, ICB4-Ergänzungen nach Stufe). Direkt mit „Nächste Schritte“ ab 1 **bauen**.

## Was in V108 passiert ist

`npx tsc --noEmit -p .` sauber. Tests (`$HOME/vt2`, wie V61 neu angelegt): workspace **522** (+4), persons 17, stage 4, noteSources 1 – alle grün. **Nicht im Browser geprüft.**

1. **Live-Test-Hinweise gestrichen** (Enrico: „Das hat sich erledigt“) – aus V105–V107 entfernt, kommen nicht mehr in Startanweisungen.
2. **Beispielprojekt ColorGentlemen aus Enricos Report** (Z20-0173, IPMA ICB4 Level D; Datei `SchulzEnrico.github.io/_Archiv_Repository/src_documents/Enrico_Schulz_Color_Gentlemen.pdf`) in `workspace/sampleProject.ts` vervollständigt: Steckbrief komplett als Text (Ziele L1.1–S2, Nicht-Ziele, Zielkonflikte, Chance, Phasen, AKV, Externe), Instanzen Projektleitung · Auftraggeber (Hr. Meier, `pn-cg-meier`) · Projektbüro · Projektmitarbeiter (kein Lenkungsausschuss), Personen mit Namen, Lackiermeister bis M3 abwesend, Ergebnisse und Soll-Abstand je Meilenstein, Abnahmekriterien als `accept` an M3/M-LA1/M-LA2/M4/M5 (Stand 16.04.), CG-1.6.4 mit AP-Beschreibung + Statusbericht + Ist 198 Ph/6.920 €, **echte Risiken CG-R1–R3** (W/A umgerechnet: R1 W2×A2, R2 W1×A5, R3 W3×A2), Änderungen CG-Ä-1 (genehmigt, Auftraggeber) und CG-Ä-2 (in Prüfung). Termine weiter +6 Jahre.
3. **F-226 neu und entschieden:** Lückenliste L1–L17 + Enricos Vorgabe „Formulare nach GPM, Eingabe = Ausgabe, erweiterbar“. Doc F-226: **Option B Formular-Baukasten mit Vorlage „GPM Level D“**, Fragen 1–11 wie vorgeschlagen (G1–G11 im Lastenheft), ICB4-Ergänzungen (Abschnitt „Was die ICB4 darüber hinaus vorsieht“, Spalte Stufe). **F-227 neu:** Handbuch für E-Sources, bald anlegen und bei jeder Änderung mitführen.
4. **F-222 entschieden (Doc V108, E1–E6) und teilweise gebaut:**
   - E1 Cockpit-Modus **„Entscheidungen“** (Rad im Cockpit, Symbol `sliders`): `Decisions` in `components/ProjectDecisions.tsx` mit und ohne Projekt, Rad „Zeigen“ Alle · Frei · je Projekt, „+ Entscheidung“ frei bzw. im gefilterten Projekt, „Beispiel ansehen“ frei = Wohnung, im Projekt = Malerbetrieb. App: `openDecisionCockpit(id?)`, `overviewDecision`, Props `startDecisions`/`openDecision` in Overview. **Offen: Pad im Vollbild (C-Teil von E1).**
   - E3 „Entscheiden für“ in Projekt-Entscheidungen nur mit Befugnis „Entscheiden“ (`needRight` am Ort).
   - E6 Suche findet Entscheidungen (`searchDecisions` in decisions.ts, Art `decision` unter Chip „Notizen“, öffnet Cockpit mit ihr).
   - E2 Logik `workspace/prepare.ts`: `prepareDecision` (Notiz, Änderungsantrag mit Vorbelegung E5, Meldung), `decisionsFrom`, `becomeDecision`/`undoBecomeDecision` (`Feedback.became.type: 'decision'`, Parser erweitert), `suggestionFor` (E4); Aktionen `dcPrepare`, `fbBecomeDecision`, `fbBecomeDecisionUndo`; Ereignis `DECISION_EVENT`/`openDecision(id)`, `prepareNames()`. **Oberfläche gebaut nur an der Karte einer Projektmeldung** („Wird zu …“ › Entscheidung, „Ist jetzt Entscheidung … Öffnen“, Rückgängig).
5. `APP_VERSION = 'V108'`.

## Nächste Schritte

1. **F-226 Stufe 1 bauen (bis 04.12.):** erst Datenmodell (Ziel, Stakeholder, Phase, Risiko-Erweiterung EW %/Tragweite €/Maßnahmen + Art Chance, Einsatz je Vorgang + Stundensatz, Steckbrief-Felder inkl. ICB4 4.5.1/4.3.1, Beschaffung 4.5.9 über Notiz-Art `procurement`; `isTask` für die neuen Arten) mit Tests, dann Baukasten (Formular = Vorlage aus Spalten/Feldern, Zeilen, eigene Felder wie V106, Vorlage speichern), dann Formulare im Projekt-Modus (Rad „Ansicht“ › „Formulare“ + Kapitel-Rad) und im Pad im Vollbild; Beispielprojekt ColorGentlemen in die Formulare umziehen (Text im Steckbrief entfällt).
1b. **F-227 Handbuch:** Gerüst liegt in `docs/Handbuch/E-Sources_Handbuch.md` (14 Kapitel, geschrieben: Cockpit, Projekte, Entscheidungen; Rest „folgt“; Änderungsverzeichnis). **Regel (Enrico 26.11.: „Das legst du an und pflegst es auch entsprechend. Ich will dafür nur der Anwender sein.“):** Claude schreibt und pflegt das Handbuch selbst, ohne Enrico um Inhalte oder Prüfung zu bitten; jede gebaute oder geänderte Funktion im selben Chat dort nachziehen, „Stand“ setzen, Änderungsverzeichnis ergänzen. Offene Kapitel nach und nach füllen (Quelle: Hilfe-Texte in `terms.ts`, Übergaben).
2. **F-222 Rest:** E2-Oberfläche an Notiz (Menü „Entscheidung vorbereiten …“, Aktion `dcPrepare`) und am Änderungsantrag in `ProjectSteer.tsx` (Knopf + Zeile „vorbereitet: … Öffnen“ über `decisionsFrom` + E4-Vorschlag `suggestionFor` mit `suggestHint`); Pad im Vollbild (E1-C); Bezüge-Chips „+ Bezug“ an Lösungen; Ziehen zum Umsortieren, Punkte-Spalten; Tour „Entscheidungen“; Hilfe-Eintrag Cockpit „Entscheidungen“ (Symbol in `HELP_ICON`).
3. Dann Schritt 10 laut F-226-Stufenplan (Basisplan, Netzplan, F-220, Projekt-Desk).
4. **Prüfliste für Enrico** (alles aus V77–V107 plus):
   - `npm test` in `web/`.
   - ⚙ Beispielprojekt entfernen und neu anlegen: Steckbrief-Texte, Instanzen (Auftraggeber Hr. Meier), Risiken CG-R-1…3 aus dem Report (Matrix: R2 bei W 1 × A 5, R3 bei W 3 × A 2), Änderungen CG-Ä-1 genehmigt / CG-Ä-2 in Prüfung, Abnahme-Checklisten an M3–M5, Ist-Werte an CG-1.6.4, Lackiermeister im Personen-Cockpit bis 25.02.2027 abwesend.
   - Cockpit › Rad › „Entscheidungen“: Zeigen Alle · Frei · ColorGentlemen; „+ Entscheidung“ unter Frei; „Beispiel ansehen“ unter Frei = Wohnung.
   - Projekt-Entscheidung ohne Befugnis „Entscheiden“: Hinweis statt „Entscheiden für“.
   - Suche „Wohnung“ → Treffer „Entscheidung“, Enter öffnet das Cockpit mit ihr.
   - Karte einer Projektmeldung (Bearbeitung an): „Wird zu …“ › Entscheidung → „Ist jetzt Entscheidung … Öffnen“, Rückgängig; danach geht „Wird zu Risiko“ nicht mehr.

## Kleine Punkte (neu in V108)

- Notiz-Arten `stakeholder`, `requirement`, `procurement`, `minutes` zählen heute als Vorgänge (`isTask` nimmt nur Risiko/Änderung aus) – mit F-226 klären.
- `risksOf` sortiert nach Wert: Reihenfolge im Beispiel jetzt CG-R-3, CG-R-2, CG-R-1 (Test vergleicht sortiert).
- Ein bewertetes Änderungs-Doc kann über `suggestionFor` „Nutzwert empfiehlt …“ liefern; im UI noch nicht angezeigt.
- Kurzname `Pr` ist in workspace.test.ts schon vergeben (Personen-Hilfen) – prepare heißt dort `Prep`.
- Claude-Docs-Export als PDF: Ergebnis landet zu groß in einer Datei unter `/tmp/claude-tool-results/…`; base64 mit Python herausziehen und per `device_commit_files` nach `docs/Arbeitspakete/` legen.
- eslint in der VM weiter nicht verfügbar.

## Commit-Text V108 (e-sources)

**Summary:** `V108: Report-Projekt ColorGentlemen, F-226 GPM-Formulare entschieden, F-222 Cockpit „Entscheidungen“, Handbuch angelegt`

**Description:**
```
- Beispielprojekt ColorGentlemen mit allem aus dem IPMA-Report: Steckbrief, Ziele, Instanzen, Personen, Meilenstein-Ergebnisse, Abnahmekriterien, AP-Beschreibung und Statusbericht CG-1.6.4, echte Risiken R1–R3, Änderungen Ä-1/Ä-2
- Lastenheft F-226: Lücken L1–L17 und Vorgabe Projektformulare nach GPM (Doc mit Fragen)
- F-222 entschieden (E1–E6): Cockpit-Modus „Entscheidungen“ (Alle · Frei · je Projekt), Befugnis „Entscheiden“ im Projekt, Suche findet Entscheidungen
- „Entscheidung vorbereiten“: Logik für Notiz, Änderungsantrag, Projektmeldung (prepare.ts); Karte einer Meldung: „Wird zu …“ › Entscheidung mit Öffnen und Rückgängig
- Live-Test-Hinweise aus den Übergaben gestrichen
- F-226 entschieden (Formular-Baukasten GPM Level D, ICB4-Ergänzungen), F-227 Benutzerhandbuch angelegt (docs/Handbuch)
- Tests (522 + 17 + 4 + 1), Lastenheft, Übergabe V108

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q7TBGctByPTTX69sWe
```
