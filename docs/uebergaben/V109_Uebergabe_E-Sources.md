# Übergabe V109 → V110 E-Sources

Stand: 26.11.2026 · Chat V109 · Nächster Chat: **V110 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V110 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-226** (entschieden V108, G1–G11; Absatz „Gebaut V109“ mit „Offen in Stufe 1“), **F-227** (Handbuch), **F-222** (Stand V108, E1–E6) und **F-206 Schritt 10**. Docs: **F-226** https://claude.ai/artifact/QxM6UPG6NFaAgkJwsb8EVy (PDF `docs/Arbeitspakete/F-226_V108_Projektformulare_GPM.pdf`), F-222 V108 https://claude.ai/artifact/MXgwEhtFcAJSLYc13zbZd8, F-225 https://claude.ai/artifact/VdDsnvWqaEfEx6dFrLS17N, P8 https://claude.ai/artifact/6icqBwu4pHmFXDH8W59uJQ. **Termin Fr 04.12.2026**, Enricos Testphase ab 07.12. Weiter gelten V98-Doc (K1–K8), V96-Doc, F-220 (R1–R7). Leitlinien: **Trello**, **IPMA ICB4 / GPM-Leitfaden Z01D Rev. 09**, **MS Project / iTaskX**, Design und Anordnung an unsere UX/UI angepasst, **Funktion vor Design**, NF-08. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, Vorlagen `docs/Arbeitspakete/Vorlagen/LIESMICH.md`; kleine Punkte aus `V74_`–`V109_…` gelten weiter. **Handbuch** `docs/Handbuch/E-Sources_Handbuch.md` bei jeder Änderung mitführen (Claude pflegt es selbst). Direkt mit „Nächste Schritte“ ab 1 **bauen**.

## Was in V109 passiert ist

`npx tsc --noEmit -p .` sauber. Tests (`$HOME/vt2`, wie V61 neu angelegt; `run.sh` dort läuft jetzt auch `gpm`): workspace **522**, persons 17, stage 4, noteSources 1, **gpm 22 (neu)** – alle grün. **Nicht im Browser geprüft.**

1. **F-226 Stufe 1 – Datenmodell** `workspace/gpm.ts` (+ Typen in `types.ts`, Lesen in `noteObjects.ts`/`risks.ts`/`storage.ts`): `Project.charter`, `goals`, `conflicts`, `stakeholders`, `phases`, `forms`; `Note.phase/use/results/procure`; `NoteRisk.chance/ew/impact/measures`; `Person.rate/org/qual`; `Workspace.formTemplates`. W/A aus EW % und Tragweite/Budget (`riskLevels`), `riskValue`, `riskValueAfter`, `riskSums`; `useTotals`, `planHours`, `planCost` (Hand-Eingabe geht vor), `hoursOf`; Listen bearbeiten mit Rückgängig (`addItem/editItem/removeItem/undoRemoveItem/moveItem`), `editCharter`, `setUse`, `setPhase`, `nextCode`. `cleanGpmRefs` beim Laden (Phase nur im eigenen Projekt, Einsätze nur bekannte Personen).
2. **`isTask` geändert:** nur Notizen **ohne Art** sind Vorgänge. Anforderung, Stakeholder, Beschaffung und Protokoll zählen nicht mehr (fallen aus PSP/Gantt/Vorgangsliste) – entschieden wie im kleinen Punkt V108 „mit F-226 klären“.
3. **Baukasten** `workspace/formKit.ts`: `FIELDS` (Feldkatalog je Quelle mit Art, Pflicht nach GPM, Erklärung), Vorlage `GPM_D` (13 Formulare: 2.1 Steckbrief, 2.2 Ziele, 2.2 Nicht-Ziele, 2.3 Zielkonflikte, 4 Stakeholder, 5 Chancen und Risiken, 6.2 Projektorganisation, 7 Phasen, 7 Meilensteine, 8 Arbeitspakete, 10 Ressourcen, 10 Einsatz je AP, 11 Beschaffung), `columnsOf`, `rowsOf`, `cellValue`, `cellAuto`, `setCell`, `addRow/removeRow/undoRemoveRow/moveRow`, eigene Felder `addField/editField/removeField/undoRemoveField`, `setColumnHidden`, `missingOf`, Vorlagen `setTemplate/saveTemplate/removeTemplate`, Speicher `parseProjectForms/parseFormTemplates`; eine Action `{ type: 'form', op }` (`applyForm`).
4. **Oberfläche** `components/ProjectForms.tsx` + CSS `.pjf…`: Projekt-Modus › Rad „Ansicht“ › **„Formulare“** (nach Steckbrief), Kapitel-Rad, Rad „Vorlage“ (ab zwei), „+ Zeile“, „Felder“ (Spalten zeigen, eigene Felder, Vorlage speichern/löschen), Pflichtfeld-Zähler, „gerechnet“-Marke, Meldungen mit Rückgängig am Ort, Tastatur (Tab, Enter / Strg+Enter, Esc, Alt+↑/↓). Symbol `chevronUp` neu. Texte `FORMS_TEXT` in `terms.ts`.
5. **Beispielprojekt ColorGentlemen in die Formulare umgezogen** (`sampleProject.ts`): Steckbrief-Felder, Ziele L1–S2 + Nicht-Ziele N1/N2 (Objekte statt Text), 2 Zielkonflikte, **11 Stakeholder aus Tab. 4** (Interessen, Strategie, Maßnahmen, Einstellung/Konflikt/Macht; intern mit Person), 5 Phasen (Tab. 9) mit Phase je Vorgang/Meilenstein, Ergebnisse je Meilenstein als Liste, Stundensätze PA 30/LM 33/GL 41/LB 39 (PL 51 € nur am Einsatz, „ich“ unberührt), CG-1.6.4 mit vier Einsätzen (295 Ph, 10.320 €), Risiken mit EW/Tragweite/Maßnahmen (Summe 28.000 € → 2.000 € wie im Report), **Chance CG-R-4** (Kap. 5.3). Brief-Texte gekürzt.
6. **Handbuch:** Kapitel 7 und neu 7.1 „Formulare (GPM Level D)“, Stand V109, Änderungsverzeichnis.
7. `APP_VERSION = 'V109'`.

## Nächste Schritte

1. **F-226 Stufe 1 fertig bauen (bis 04.12.):**
   - **Pad im Vollbild** mit Formularen und Entscheidungen (G2 + F-222 E1-C) – `ProjectForms` ist schon ein eigenes Bauteil mit `ws/p/dispatch/say`.
   - **Phasenbalken im Gantt** (G8) aus `p.phases` (Beginn/Ende), Phase in den Vorgangs-Angaben.
   - **Maßnahmen je Risiko in der Oberfläche** (präventiv/korrektiv mit Kosten, Beschluss, EW danach) in `ProjectSteer` › RiskDetails; dort EW %/Tragweite € zeigen, W/A „gerechnet“.
   - **Auslastung aus Einsätzen:** Personen-Cockpit/Fokus über `Gp.hoursOf` statt nur Zuständiger.
   - Hilfe-Eintrag „Formulare“ (Symbol in `HELP_ICON`, Text nicht mit „Wort = …“ beginnen) und Tour „Formulare“.
2. **F-222 Rest:** E2-Oberfläche an Notiz (Menü „Entscheidung vorbereiten …“, `dcPrepare`) und am Änderungsantrag in `ProjectSteer.tsx` (Knopf + „vorbereitet: … Öffnen“ über `decisionsFrom`, E4 `suggestionFor`/`suggestHint`); Bezüge-Chips „+ Bezug“; Ziehen zum Umsortieren, Punkte-Spalten; Tour „Entscheidungen“; Hilfe-Eintrag Cockpit „Entscheidungen“.
3. **F-226 Stufe 2** (Testphase): Abnahmekriterien-Formular, AKV, DKI-Matrix, AP-Formular, Statusbericht, Kosten-Ganglinie, Report-Ausgabe PDF, Portfolios.
4. Dann Schritt 10 laut Stufenplan (Basisplan, Netzplan, F-220, Projekt-Desk).
5. **Prüfliste für Enrico** (alles aus V77–V108 plus):
   - `npm test` in `web/` (jetzt mit `gpm.test.ts`).
   - ⚙ Beispielprojekt **entfernen und neu anlegen** (sonst fehlen die neuen Inhalte).
   - Projekt-Modus › ColorGentlemen › Rad „Ansicht“ › **Formulare**: Kapitel-Rad durchscrollen; 2.1 Steckbrief (CG-1, Kostenarten, Rücklage 20.000 €), 2.2 Ziele mit Einrückung L1 › L1.1…, 4 Stakeholder (11 Zeilen, „Alle Pflichtfelder gefüllt“), 5 Chancen und Risiken (Risikowert 3.000/20.000/5.000 €, W/A „gerechnet“, CG-R-4 Chance), 10 Einsatz je AP (CG-1.6.4 vier Zeilen, Kosten 510/750/3.120/5.940 €), 8 Arbeitspakete (CG-1.6.4 Aufwand 295 Ph „gerechnet“, aber Hand-Eingabe aus dem Report steht davor – siehe kleine Punkte).
   - Zelle ändern → Steckbrief/Risiken zeigen denselben Wert; „+ Zeile“ und Löschen mit Rückgängig; Alt+↑/↓ in den Zielen.
   - „Felder“: Spalte „Befürchtungen“ aus, eigenes Feld „Kontaktweg“ (Auswahl, Pflicht) an, Zähler steigt; „Als Vorlage speichern“ → Rad „Vorlage“ erscheint.
   - Notizen mit Art Anforderung/Stakeholder/Beschaffung/Protokoll stehen nicht mehr im PSP.

## Kleine Punkte (neu in V109)

- CG-1.6.4 hat aus V108 noch `effort.plan` 295 und `cost.plan` 10.320 von Hand – die gehen vor den Einsätzen; Werte stimmen überein, „gerechnet“ erscheint dort darum nicht. Bei Gelegenheit Hand-Werte im Beispiel weglassen, wenn Einsätze da sind.
- `planHours/planCost` werden noch nicht von Gantt, PSP-Summen und Bericht genutzt (die lesen weiter `effort.plan`/`cost.plan`) – mit „Auslastung aus Einsätzen“ umstellen.
- Spalte „Code“ bei Zielen ist frei editierbar; doppelte Codes werden nicht geprüft.
- `FormDef` wird mit der Action übergeben (Vorlage kann sich nicht während der Action ändern) – bei Abgleich unkritisch, weil die Action lokal bleibt.
- Ressourcen-Formular zeigt nur Personen, die schon am Projekt mitarbeiten; anlegen weiter im Personen-Cockpit.
- Die lange Python-Zeile im device_bash brach mit „Sandboxed command is too long“ ab (~130 KB Grenze inkl. Mounts) – große Dateien im Container schreiben und per `device_commit_files` legen; Hilfsskript lag dafür in `Claude outputs/cg_patch.py` (kann weg).
- Sicherung des alten `sampleProject.ts` nur in der VM (`$HOME/sampleProject.bak`), nicht im Repo.

## Commit-Text V109 (e-sources)

**Summary:** `V109: F-226 Formulare nach GPM (Datenmodell, Baukasten, Ansicht „Formulare“), Beispielprojekt in den Formularen`

**Description:**
```
- Datenmodell F-226 (gpm.ts): Steckbrief-Felder, Ziele und Zielkonflikte, Stakeholder, Phasen, Risiken/Chancen quantitativ mit Maßnahmen, mehrere Ressourcen je Vorgang mit Stundensatz, Beschaffung
- isTask: nur Notizen ohne Art sind Vorgänge
- Formular-Baukasten (formKit.ts) mit Vorlage „GPM Level D“ (13 Formulare), eigene Felder, Spalten aus, eigene Vorlagen
- Projekt-Modus › Ansicht „Formulare“ mit Kapitel-Rad, Pflichtfeldern, gerechneten Werten, Rückgängig am Ort, Tastatur
- Beispielprojekt ColorGentlemen in den Formularen: Ziele, 11 Stakeholder, Phasen, Einsätze CG-1.6.4, Risiken mit EW/Tragweite, Chance
- Handbuch Kapitel 7.1 Formulare, Lastenheft F-226 „Gebaut V109“, Tests gpm.test.ts (22), Übergabe V109

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q4Bh1SH9da5Qfhq88n
```
