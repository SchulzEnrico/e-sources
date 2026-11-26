# Übergabe V118 → V119 E-Sources

Stand: 26.11.2026 · Chat V118 · Nächster Chat: **V119 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V119 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-230** (Absätze „Entschieden V118“ und „Gebaut V118“), **F-206 Schritt 10** („Gebaut V118 – Earned Value als Grafik“), **F-227** (Handbuch). Entscheidungs-Doc **F-230** https://claude.ai/artifact/G7tBqH9dJ3MR2WCAjSLLcj ist **entschieden** (Option C, F1–F10 wie Vorschlag; PDF `docs/Arbeitspakete/F-230_V118_Import-Export.pdf`). **Termin Fr 04.12.2026**, Enricos Testphase ab 07.12. Leitlinien: **Rangfolge 1. IPMA ICB4, 2. Funktionen von MS Project/iTaskX/Trello, 3. unsere Sicht und Verbesserungen**, Design und Anordnung an unsere UX/UI angepasst, **Funktion vor Design**, NF-08. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V118_…` gelten weiter. **Handbuch** `docs/Handbuch/E-Sources_Handbuch.md` bei jeder Änderung mitführen. Offen von Enrico: **Prüfdateien** (MS Project-XML, iTaskX-XML, Trello-JSON – F9) – wenn sie im Projektordner liegen, zuerst Rundlauf damit prüfen; Rückmeldungen zu Formularen Stufe 2, Bericht, Basisplan, Netzplan, Projekt-Desk aufnehmen, wenn er sie bringt; sonst „Nächste Schritte“ ab 1 **bauen**.

**Tests** (VM ist nach jedem Chat leer – neu anlegen; **neu: mspdi**):
```
mkdir -p $HOME/vt2/node_modules/vitest && cp $HOME/mnt/Projects/e-sources/docs/uebergaben/vitest-ersatz.js $HOME/vt2/node_modules/vitest/index.js
cat > $HOME/vt2/run.sh <<'EOS'
cd $HOME/mnt/Projects/e-sources/web
rm -rf $HOME/vt2/out
npx tsc --outDir $HOME/vt2/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node src/workspace/*.ts >/dev/null 2>&1
for t in workspace persons stage noteSources gpm wheelOrder calendar resources deskProject mspdi; do echo "== $t"; NODE_PATH=$HOME/vt2/node_modules:$PWD/node_modules node $HOME/vt2/out/$t.test.js 2>&1 | tail -3; done
EOS
bash $HOME/vt2/run.sh
```
**Browser:** Enrico startet `npm run dev` in `web/`; der eingebaute Browser erreicht **http://localhost:2910/**. In V118 war der Browser-Bereich unzuverlässig (Seite wurde nicht gezeichnet, Räder drehten erst Sekunden später, einmal Verbindung weg) – bei Problemen nicht lange probieren, Punkte in die Prüfliste. Der eingebaute Browser hat eigenen Speicher (eigenes localStorage), Enricos Chrome ist davon unberührt.

## Was in V118 passiert ist

`npx tsc --noEmit -p .` sauber. Tests: workspace 526, persons 18, stage 4, noteSources 1, gpm 44, wheelOrder 5, calendar 5, resources 2, deskProject 6, **mspdi 6** (neu) – alle grün.

1. **Earned Value als Grafik** (Formular Kapitel 11 über der Tabelle und im Bericht): `gpmCalc.evCurve`, SVG `gpmReport.evSvg`; `StatusReport.ev` friert den EV beim Anlegen eines Berichts ein (ältere Berichte: geschätzt, hohler Punkt). Im Browser angesehen.
2. **F-230 entschieden** (Enrico: „Bei den Fragen im Doc folgen wir vorerst deinen Vorschlägen“) – Doc nachgezogen, PDF erneuert.
3. **F-230 gebaut, Bauplan 1–4 (MSPDI):** Datenmodell Fremddaten + Kalender je Projekt (**Dateiformat 12**), Export mit Schema-Reihenfolge und Mitführen, Import mit XML-Leser, Oberfläche (Steckbrief und ⋮ am Desk), Hilfe, Begriff, Tour, Handbuch 7.3. Einzelheiten im Lastenheft „Gebaut V118“.
4. **Kalender je Projekt (F6):** Rad „Kalender“ gemeinsam | eigener im Steckbrief; alle Projekt-Rechnungen (Gantt, EV, Kostenganglinie, MTA, Status) laufen über `withCalendar(calendarFor(ws, pid), …)`.
5. **Kleine Punkte:** Rad-Menü-Meldung im offenen Menü (`menu__note`), Menü-Seiten springen nicht mehr (Mindestbreite + `ResizeObserver`), Hinweise „Desk Mode/Notizen/Projekte: …“ und „Beispielprojekt …“ am Ort (`notify(…, at)`, `toast--at`) – **von Enrico bestätigt** (Meldung erscheint unter dem Rad).
6. Handbuch V118, Lastenheft, `APP_VERSION = 'V118'`.

## Nächste Schritte

1. **Prüfung F-230 mit Enricos Dateien (F9):** je Datei `importMspdi` → `exportMspdi` → erneut importieren; Gantt-Termine, Vorgänger, Ressourcen, Kalender vergleichen; was abweicht, nachbessern. Ein Test je Datei (Dateien nicht ins Repo, nur die Erwartungen).
2. **Trello (Bauplan 5, darf in die Testphase):** Import aus Trello-JSON (Listen → Spalten/Zustand, Karten → Vorgänge, Checklisten, Labels → Tags, Mitglieder → Personen, Fälligkeit/Start, Kommentare, Anhänge) und Export als JSON-Datei; Unbekanntes in `foreign.trello`.
3. Kleine Punkte bis 04.12.: F-191 Bestätigen-Knöpfe in Dialogen prüfen; Hinweis R6 im Cockpit-Rad prüfen; Tour „Feedback“ (F-221).
4. Danach (F7): CSV/Excel und iCal.
5. **Prüfliste für Enrico** (alles aus V77–V117 plus):
   - Seite neu laden, dann `npm test` in `web/`.
   - Projekt-Modus › Formulare › Kapitel 11 „Earned Value“: Grafik über der Tabelle (PV-Linie, EV/AC-Punkte, Stichtag, BAC/Budget); Kapitel 12 neuen Statusbericht anlegen → in Kapitel 11 neuer Punkt; „Bericht“ enthält die Grafik.
   - ⋮ am Rad „Ansicht“ › „Rad belegen …“ → Eintrag ab/an: Meldung steht unten im Menü; Menü springt nicht seitlich.
   - ⚙ › Beispielprojekt anlegen/entfernen → Meldung unter dem ⚙.
   - Steckbrief › Arbeitskalender › Rad „Kalender“ auf „eigener“ → Überschrift „(nur dieses Projekt)“; Feiertage Bayern wählen → Gantt dieses Projekts zeigt 06.01. frei, andere Projekte nicht; „Rückgängig“; zurück auf „gemeinsam“.
   - Steckbrief › **„Exportieren …“** → `ColorGentlemen.xml` im Download-Ordner → in **MS Project** und **iTaskX** öffnen: Vorgänge, Gliederung, Termine (Ende 30.06.2027 mit Hamburg), Vorgänger, Ressourcen, Basisplan.
   - Datei aus MS Project/iTaskX als XML speichern → Steckbrief › **„Importieren …“** → neues Projekt + eigener Desk; bei gleichen Personen Rückfrage am Ort; Meldung mit Zahlen und „Rückgängig“; im Steckbrief „n Angaben … mitgeführt“.
   - Dasselbe Projekt wieder exportieren und in MS Project öffnen → eigene Felder, weitere Basispläne usw. sind noch da.
   - .mpp wählen → Hinweis „in MS Project als XML speichern“.
   - ⋮ neben dem Desk-Namen › „Importieren …“ bzw. (gebunden) „Exportieren …“.
   - Tour „Projekte“ im Steckbrief → Schritt „Import und Export“.

## Kleine Punkte (neu in V118)

- **Kalender:** `setCalendar` merkt sich berechnete Tage je Kalender (bis 24), `withCalendar` stellt danach exakt zurück. `ganttOf` und die gpmCalc-Rechnungen lesen **den Kalender aus `ws`** (bzw. Projekt), nicht mehr den global gesetzten – Tests müssen `calendar` in den Arbeitsstand legen (zwei alte Tests angepasst).
- **Fremddaten-Regeln (`mergeEls`):** eigene Elemente gehen vor; `weak` = Vorgabe nur, wenn die Datei nichts hat; MULTI-Elemente bleiben nebeneinander; unbekannte Namen landen hinter ihrem Vorgänger aus der Datei. WBS ist „weak“ – das Original aus MS Project geht zurück.
- **Kalender beim Export:** gleich `calSig` → Original-`Calendars` und Original-`CalendarUID`; sonst Standardkalender und alle fremden `CalendarUID` (Tasks, Resources) fallen weg.
- **UIDs** werden beim Export neu gezählt (Gantt-Reihenfolge); GUIDs der Datei bleiben über die Fremddaten erhalten.
- **Import-Aktion** `exchange` übernimmt den fertig gerechneten Stand (Ids entstehen im Bauteil); Rückgängig = alter Stand. `addOwnDesk(pid, justMade)` bekommt den Namen mit, weil das neue Projekt erst im nächsten Stand steht. Nach Datei-Auswahl blockiert der Browser das neue Fenster meist → der Desk erscheint im selben Fenster.
- Lange Dateien nicht per Heredoc über `device_bash` schreiben (Limit ~128 KB je Befehl): mit `Write` nach `/mnt/user-data/outputs/` und `device_commit_files`.
- Symbol `upload` neu in `icons.ts`; Hilfe-Eintrag `projectExchange` braucht ein Symbol (Test F-183).

## Commit-Text V118 (e-sources)

**Summary:** `V118: Import/Export ohne Verlust für MS Project/iTaskX (MSPDI, Fremddaten, Dateiformat 12), Kalender je Projekt, Earned Value als Grafik, Meldungen am Ort`

**Description:**
```
- F-230 entschieden (Option C, F1–F10 wie Vorschlag), Bauplan 1–4 gebaut: Fremddaten an Projekt, Vorgang und Person (unbekannte MSPDI-Elemente roh, gehen beim Export an ihrem Platz zurück), Dateiformat 12
- MSPDI-Export mit Schema-Reihenfolge, Originalkalender solange unverändert; MSPDI-Import als neues Projekt mit eigenem Desk (Gliederung, Dauer, Vorgänger, Ressourcen, Zuordnungen, Basisplan, Kalender, Fortschritt), gleiche Personen mit Rückfrage am Ort, .mpp-Hinweis
- Steckbrief und ⋮ am Desk: „Exportieren …“/„Importieren …“ mit Meldung und Rückgängig; „n Angaben mitgeführt“
- Eigener Arbeitskalender je Projekt (Rad „Kalender“ gemeinsam | eigener); Gantt, Earned Value, Kostenganglinie, MTA und Status rechnen damit
- Earned Value als Grafik über die Zeit (PV, EV, AC, Prognose EAC, BAC, Budget), auch im Bericht; Statusbericht hält EV fest
- Meldungen am Ort: Rad-Menü (im offenen Menü), Desk Mode/Projekte und Beispielprojekt (unter Rad bzw. ⚙); Menü-Seiten springen nicht mehr seitlich
- Hilfe, Begriff, Tour „Projekte“, Handbuch V118 (7.1, 7.3), Lastenheft, Tests mspdi und Kalender, Übergabe V118

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q6s2S98pKUEbL8kJ52
```
