# Übergabe V153 → V154 E-Sources

Stand: 28.11.2026 · Chat V153 · Nächster Chat: **V154 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V154 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-232 „Gebaut V153“**, **F-232 „Entschieden V153 P11–P14“**, **F-236 „Entschieden V153“**, **F-231 K14** und **F-227** (Handbuch). **Alle drei Docs sind entschieden** (Enrico 28.11.2026: „alles wie Vorschlag“): K14 https://claude.ai/artifact/4u9FXZYv8BKUVC2VqzQ5Wy (Rev. 16), F-236 https://claude.ai/artifact/HfV14fYQiE26JdKwsMQnGP (Rev. 15), F-232 https://claude.ai/artifact/FJY3u5QVqoNtku1MhNDhKn (Rev. 21) – nur noch auf neue Kommentare prüfen (`query`). **Erstes Paket V154 (Funktion vor Design):** **F-232 P12 Medien** (Bilder PNG/JPG/SVG, PDF als Vorschau, Ton/Video als Abspieler; einfügen per Knopf, Ziehen oder Einfügen in jedes mehrzeilige Feld der Blätter und als Logo in die Kopfzeile; im Gerätespeicher wie Notizbilder, abgeglichen wird der Verweis; Bericht bettet Bilder ein wie Anlage A seit V152), danach **P13 Rest** (schmale, zuklappbare Inhalts-Seitenleiste neben jedem Blatt), danach **F-236 B** in der Reihenfolge G8: Regeln + Grafiken lesen Farben aus der Layout-Vorlage (`gpmFigures` LOOK, PRINT_COLORS), dann Generator-Blatt „Layout“ mit Vorschau, dann Abweichung je Element. **In jedem Chat vor der Übergabe:** `python3 tools/live_project.py V<n> <JJJJ-MM-TT>`. Enricos Testphase ab 07.12., Termin Fr 04.12. **Prüfdateien (F9) erst ab 07.12.** Leitlinien: **Rangfolge 1. IPMA ICB4, 2. MS Project/iTaskX/Trello, 3. unsere Sicht**, **Dokumente wie im Report**, **Funktion vor Design**, **Texte in Grafiken nie über Feldränder**, **Meldungen am Ort**, NF-08, F-231. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, Browser-Hinweise `V150_…`/`V152_…`, kleine Punkte aus `V74_`–`V153_…` gelten weiter. **Handbuch** bei jeder Änderung mitführen. **Dashboards** zählen wie V127. Am Ende nach dem Begrüßungstext den **Projektstand** als Textbaustein.

**Tests** (VM ist nach jedem Chat leer – neu anlegen): Befehl aus `V135_Uebergabe_E-Sources.md`, Testliste `… schedule watch inbox tableFiles ink qr`; Aufruf `timeout 175 bash $HOME/vt2/run.sh 2>&1 | grep -E "grün|FAIL|==" | paste - -` mit `timeout_ms: 180000`. Tests V153: **792** grün (`workspace` 529, `gpm` 83, `inbox` 6). `npx tsc --noEmit -p .` sauber.

**Löschen:** Enrico hat in V153 das Löschen in `Projects` für die Sitzung freigegeben (nur v146–v149, tmp142 gelöscht). In neuen Chats gilt die Freigabe nicht mehr.

## Was in V153 passiert ist

1. **Entscheidungen:** Enrico „alles wie Vorschlag“ für K14, F-236, F-232 P11–P14 und die kleinen Punkte. Docs: Spalte „Antwort Enrico“ = „Wie Vorschlag“, Zeile „Entschieden am 28.11.2026 (V153)“, „Vorschlag:“ → „Entschieden (28.11.2026):“; PDFs in `docs/Arbeitspakete/` erneuert; Lastenheft F-236, F-232, K14 nachgezogen.
2. **K14 Rest:** Regel-Auslöser **„Notiz kommt in den Eingang“** (`TrigKind 'inbox'`, `ruleRun.eventsOf`: neue Id im Eingang, nur wenn der Eingang vorher schon da war), Texte `trig`/`trigSay`; Tour „Notizen & Aufgaben“ mit Schritten **Eingang** (`.pad .pad__tab[data-sheet="inbox"]`) und **Gedankenparkplatz**. Test in `inbox.test.ts`.
3. **Eisenhower – eigene Reihenfolge im Feld:** `Sh.shiftInQuad` (Tausch mit dem Nachbarn im selben Feld; eingesammelte Notizen der persönlichen Matrix kommen dabei ins Sheet), `sheetShift` leitet bei Eisenhower dorthin; `MatrixSheet` Alt/⌥+↑/↓ mit Ansage, Fokus bleibt (`focusCard`), Rand: „Steht schon oben/unten im Feld“. Hinweis `cardKeys` ergänzt. Test.
4. **F-232 P14 (gerechnete Werte):** `charterView` mit `start/end/datesFrom` (Gantt, wenn im Steckbrief leer), Gesamtdauer daraus, `planHours/planCost` (Blätter ohne Sammelvorgänge/Meilensteine), `riskSum/riskHigh/riskCount`. Blatt: blasse Zeilen „gerechnet aus …“ (`.paper__calc` als eigene Zeile, Farbe #666 statt #777 wegen Kontrast). Bericht `charterHtml`: `.calc`-Zeilen, Summe über Budget rot. Test in `gpm.test.ts`.
5. **F-232 P13 (Inhalt):** `workspace/contents.ts` `contentsOf`, `components/ProjectContents.tsx`, Ansicht **„Inhalt“** (`toc`) ganz vorn in `VIEWS`; Formular öffnet über `setJump({ form })` + `setView('forms')`. CSS `.toc…`. Test.
6. **Kleine Punkte:** F-234 ●/◐ angeglichen (●); Spur in Anlage A ohne Bearbeitung bleibt (Vorschlag V149); alte Ordner `Claude outputs/v146…v149, tmp142` gelöscht (Freigabe in der Sitzung).
7. Handbuch (Stand V153, Kap. 5, 7, 12, Änderungsverzeichnis); `APP_VERSION = 'V153'`; Live-Projekt V153 (206 F-Punkte, 3 ersetzt, 130 fertig, 25 teilweise, 48 offen).

## Prüfliste für Enrico (zusätzlich zu V77–V152)

- Projekt › Rad „Ansicht“ › **Inhalt** (ganz vorn): Liste der Formulare mit Kapitel, Einträgen, leeren Pflichtfeldern (rot); ↑/↓, Pos1/Ende; Enter auf „2.2 Projektziele“ öffnet Formulare im Kapitel 2.2; Enter auf „Entscheidungsvorlagen“ öffnet die Ansicht Entscheidungen.
- **Steckbrief:** unter Gesamtdauer „gerechnet aus Start und Ende“; Start/Ende leeren → Termin „· aus dem Gantt“ erscheint blass; unter Kapazitätsaufwand „Plan aus den Arbeitspaketen …“; unter Risiken „Risikowert gesamt …“. **Bericht** zeigt dieselben Zeilen.
- **Regeln:** neue Regel mit Auslöser „Notiz kommt in den Eingang“ → Tag setzen; Alt/⌥+E, Gedanke eingeben, Enter → Notiz im Eingang trägt den Tag.
- **Eisenhower-Sheet:** Eintrag wählen, Alt/⌥+↑/↓ → rückt im Feld, Fokus bleibt; oben/unten Ansage. Projekt › Formulare › 15.2 zeigt dieselbe Reihenfolge.
- Tour „Notizen & Aufgaben“: Schritte „Eingang“ (wenn ein Pad mit Eingang offen ist) und „Gedankenparkplatz“.
- Weiter offen aus V152/V151/V150/V149.

## Kleine Punkte

- **Offen (ohne Entscheidung):** P13 Seitenleiste neben jedem Blatt; Seitenzahlen im Druck-Inhaltsverzeichnis (Chrome ohne `target-counter` – ggf. per Skript nach dem Druck nicht möglich, Hinweis lassen); F-109 „Wo war ich?“ (offene Gedanken aus dem Parkplatz zeigen).
- Eisenhower-Grafik 15.2: Alt+Pfeile wechseln dort das Feld (seit V139), im Sheet stellen Alt+↑/↓ um – bei Bedarf mit Enrico angleichen (NF-08).
- Unverändert: NF-01 (Apple-Texterkennung), Tinte gerätegebunden, Fußzeile in Browsern ohne Seitenrand-Felder, F-211 (Rechte/Server). Sonst unverändert in `V152_…` bis `V131_…`.

## Commit-Text V153 (e-sources)

**Summary:** `V153: Entscheidungen K14/F-236/F-232, Inhalt-Ansicht, gerechnete Werte im Steckbrief, Eingang-Regel`

**Description:**
```
- Docs K14, F-236, F-232 (P11–P14) als entschieden eingetragen („alles wie Vorschlag“), PDFs erneuert, Lastenheft nachgezogen
- K14: Regel-Auslöser „Notiz kommt in den Eingang“, Tour „Notizen & Aufgaben“ mit Eingang und Gedankenparkplatz
- Eisenhower-Sheet: eigene Reihenfolge im Feld mit Alt/⌥+↑/↓ (shiftInQuad)
- F-232 P14: Steckbrief rechnet Termine aus dem Gantt, Plan aus den Arbeitspaketen, Risikowert; blass mit „gerechnet aus …“, auch im Bericht
- F-232 P13: Ansicht „Inhalt“ ganz vorn im Rad – alle Dokumente in Report-Reihenfolge, Enter öffnet das Kapitel
- F-234 Zeichen angeglichen; Tests 792 (+4); Handbuch V153, APP_VERSION V153, Live-Projekt V153, Übergabe V153

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q3PgJYtzLDBEyZsr5X
```
