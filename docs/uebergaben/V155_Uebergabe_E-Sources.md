# Übergabe V155 → V156 E-Sources

Stand: 28.11.2026 · Chat V155 · Nächster Chat: **V156 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V156 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-236 „Gebaut V155“** und **„Gebaut V154“**, **F-232 „Gebaut V154“** und **F-227** (Handbuch). Docs K14 https://claude.ai/artifact/4u9FXZYv8BKUVC2VqzQ5Wy, F-236 https://claude.ai/artifact/HfV14fYQiE26JdKwsMQnGP, F-232 https://claude.ai/artifact/FJY3u5QVqoNtku1MhNDhKn sind entschieden – nur auf neue Kommentare prüfen (`query`; Stand V155: keine). **F-236 ist damit gebaut (Schritte 1–3, G2, G3), F-232 P11–P14 bis auf Seitenzahlen im Druck-Inhaltsverzeichnis.** **Vorschlag erstes Paket V156 (Funktion vor Design):** kleine offene Punkte – feste Töne sky/steel/slate und Graustufen der Grafiken an die Regeln hängen (z. B. Regel „Extern“ für das Organigramm, G3 nennt „Stabsstelle, extern“), **F-109 „Wo war ich?“**, Seitenzahlen im Druck-Inhaltsverzeichnis (Chrome kennt `target-counter` nicht – Lösung über Bericht in festen Seiten oder Nummern je Kapitel prüfen). Danach, weil F-236/F-232 jetzt stehen: **Browser-Prüfrunde V150–V155** vorschlagen (Enrico fragen, ob vor dem 04.12. oder erst in seiner Testphase). **In jedem Chat vor der Übergabe:** `python3 tools/live_project.py V<n> <JJJJ-MM-TT>`. Enricos Testphase ab 07.12., Termin Fr 04.12. **Prüfdateien (F9) erst ab 07.12.** Leitlinien: **Rangfolge 1. IPMA ICB4, 2. MS Project/iTaskX/Trello, 3. unsere Sicht**, **Dokumente wie im Report**, **Funktion vor Design**, **Texte in Grafiken nie über Feldränder**, **Meldungen am Ort**, NF-08, F-231. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, Browser-Hinweise `V150_…`/`V152_…`, kleine Punkte aus `V74_`–`V155_…` gelten weiter. **Handbuch** bei jeder Änderung mitführen. **Dashboards** zählen wie V127. Am Ende nach dem Begrüßungstext den **Projektstand** als Textbaustein.

**Tests** (VM ist nach jedem Chat leer – neu anlegen): Befehl aus `V135_Uebergabe_E-Sources.md`, Testliste `… schedule watch inbox tableFiles ink qr fieldMedia`; Aufruf `timeout 175 bash $HOME/vt2/run.sh 2>&1 | grep -E "grün|FAIL|==" | paste - -` mit `timeout_ms: 180000`. Tests V155: **799** grün (`workspace` 529, `gpm` 83, `fieldMedia` 7). `npx tsc --noEmit -p .` sauber.

**Löschen:** keine Freigabe in V155 (nichts gelöscht).

## Was in V155 passiert ist

1. **Docs** K14, F-236, F-232: keine neuen Kommentare.
2. **F-236 B Schritt 3 (G5) – Farbe je Kasten:** `Project.figTone` (`parseFigTone`), `Fk.setFigTone`/`resetFigTone`/`figToneCount`, Form-Aktionen `figTone`, `figToneReset`, `figToneAll`. `gpmFigures`: `TONE` je Grafik (goalTree, psp, org, phasePlan), `ownLook`, `toneColor`; bearbeitbare Kästen tragen `data-base` (Regel-Farbe) und `data-own`. `ProjectForms`: `openFig` gibt `base` mit, `FigEditor` zeigt `ToneRow` (Farbfeld mit 400 ms Pause, #rrggbb, Hinweis, ↺, Rückgängig). Ansicht „Layout“: „Abweichungen je Kasten“ + „Alle Kästen auf die Regeln“.
3. **G3 Rest:** neue Regeln `font`, `headFont`, `textSize`, `headSize`, `tableSize`, `radius`, `shadow`, `tableHead`, `tableGrid`, `printLogo`, `printNo`, `printPage` (`layoutRules.ts`, `sanitizeLayout` mit Bereichen). Blätter: CSS-Variablen in `paperVars` und `App.css` (Raster/Logo über `[style*="--paper-grid…"]`). Bericht: `layoutCss` nur abweichende Regeln, `printFooter` für @page. Grafiken: `BOX_R`, `SHADOW_ON`, `TEXT_FONT`, `HEAD_FONT` in `applyLook`. Generator mit Umschalt-Rad (Schriftart, Raster), Zahlenfeldern, Kästchen, Gruppe „Kopf- und Fußzeile im Druck“, Vorschau mit Tabellenkopf.
4. **G2 Vorlagen im Arbeitsbereich:** `Workspace.layoutTemplates`, `parseLayoutTemplates` (storage), `Gp.saveLayoutTemplate`/`applyLayoutTemplate`/`removeLayoutTemplate`/`restoreLayoutTemplate`, Aktion `layoutTemplate`; Knopf „Als Vorlage speichern“, „Übernehmen von“ mit Gruppen, Liste „Gespeicherte Vorlagen“.
5. **Hilfe** „Medien in Feldern und Logo“ (`fieldMedia`, Symbol `image`) und „Layout-Vorlage (Farben und Gestaltung)“ (`layoutTemplate`, Symbol `colors`).
6. Handbuch V155 (Kap. 7, 12, Änderungsverzeichnis); Lastenheft F-236 „Gebaut V155“, Status F-236; `APP_VERSION = 'V155'`; Live-Projekt V155 (206 F-Punkte, 3 ersetzt, 130 fertig, 25 teilweise, 48 offen).

**Noch nichts davon im Browser geprüft** (Regel: getestet wird, wenn alles steht).

## Prüfliste für Enrico (zusätzlich zu V77–V154)

- **Farbe je Kasten:** Formulare › 2.2 Ziele (Zielhierarchie): Kasten anklicken → Zeile „Farbe“ → Farbe wählen → Kasten in der Farbe, Schrift lesbar, „● weicht von der Vorlage ab“, „Rückgängig“ daneben; „↺ auf Regel zurücksetzen“. Dasselbe im PSP, Organigramm (6.2), Phasenplan (7) und am Wurzelkasten (Projektname). Mit Tastatur: Tab auf den Kasten, Enter, Tab bis „Farbe“.
- Eigene Farbe auch im Bericht und in der Vorschau der Ansicht „Layout“; dort „Abweichungen je Kasten: n“ → „Alle Kästen auf die Regeln“ → „Rückgängig“.
- **Neue Regeln:** Layout › Ecken 0 → eckige Kästen; Schatten aus; Schriftart Text „Georgia“ → Blätter und Grafiken; Größe Text 120 % → Blätter und Bericht größer, Grafiken unverändert; Kopf der Tabellen dunkelblau → Titelzeile der Formulare und Spaltenköpfe, Schrift weiß; Raster „nur waagerecht“/„ohne Linien“; Druck: Projektnummer aus, Seite aus, Logo aus → Bericht drucken.
- **Vorlagen:** Name „FIT GmbH“ → „Als Vorlage speichern“ → zweites Projekt › „Übernehmen von“ › Gespeicherte Vorlagen › FIT GmbH; noch einmal speichern = „ersetzt“ + Rückgängig; ✕ in „Gespeicherte Vorlagen“ + Rückgängig; nach Neuladen noch da.
- **Hilfe:** „?“ › Suche „Logo“ bzw. „Kastenfarbe“ findet die neuen Einträge mit Symbol.
- Ohne Regeln sieht alles genau aus wie bisher (auch der Bericht – vorher änderte schon eine einzige Regel alle Farben im Bericht).
- Weiter offen aus V154/V153/V152/V151/V150/V149.

## Kleine Punkte

- **Offen:** feste Töne sky/steel/slate (Gantt-Varianten, externe Firmen im Organigramm) und einige Graustufen folgen den Regeln nicht; Seitenzahlen im Druck-Inhaltsverzeichnis; F-109 „Wo war ich?“; Eisenhower 15.2 Alt+Pfeile vs. Sheet Alt+↑/↓ (NF-08).
- **Farbe je Kasten:** Verlaufs-Ids `fgOwn<hex>` sind seitenweit (wie `fgWine`) – gleiche Farbe = gleicher Verlauf, darum unkritisch. Gilt nur für Kästen mit `data-edit` (bearbeitbare Kästen); Legenden folgen den Regeln.
- **Größen:** wirken nicht in den Grafiken (bewusst, „Texte nie über Feldränder“) – steht im Generator und im Handbuch.
- **Raster/Logo im Blatt:** über Attribut-Selektor auf dem Inline-Style (`[style*="--paper-grid: rows"]`, beide Schreibweisen). Falls ein Browser den Style anders schreibt, greift es nicht – bei der Prüfung ansehen.
- Unverändert: NF-01 (Apple-Texterkennung), Tinte gerätegebunden, Fußzeile in Browsern ohne Seitenrand-Felder, F-211 (Rechte/Server). Sonst unverändert in `V154_…` bis `V131_…`.

## Commit-Text V155 (e-sources)

**Summary:** `V155: Farbe je Kasten, weitere Layout-Regeln (Schrift, Ecken, Tabellen, Druck), Layout-Vorlagen im Arbeitsbereich`

**Description:**
```
- F-236 B Schritt 3 (G5): eigene Farbe je Kasten in Zielhierarchie, PSP, Organigramm und Phasenplan – im Bearbeiten-Fenster mit „weicht von der Vorlage ab“, „auf Regel zurücksetzen“ und Rückgängig; Übersicht und Zurücksetzen in der Ansicht „Layout“
- F-236 G3: Regeln für Schriftart und Größen, Ecken und Schatten, Kopf und Raster der Tabellen, Logo/Projektnummer/Seite im Druck – Blätter, Grafiken und Bericht
- F-236 G2: Layout-Vorlagen im Arbeitsbereich speichern, in andere Projekte übernehmen, löschen mit Rückgängig
- Bericht setzt nur noch abweichende Regeln
- Hilfe „Medien in Feldern und Logo“ und „Layout-Vorlage“
- Tests 799 (+3); Handbuch V155, Lastenheft, APP_VERSION V155, Live-Projekt V155, Übergabe V155

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q58eF6zVJbmgABQ2wt
```
