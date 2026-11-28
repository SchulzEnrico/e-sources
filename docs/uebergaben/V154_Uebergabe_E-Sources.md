# Übergabe V154 → V155 E-Sources

Stand: 28.11.2026 · Chat V154 · Nächster Chat: **V155 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V155 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-232 „Gebaut V154“**, **F-236 „Gebaut V154“**, **F-236 „Entschieden V153“** und **F-227** (Handbuch). Docs K14 https://claude.ai/artifact/4u9FXZYv8BKUVC2VqzQ5Wy, F-236 https://claude.ai/artifact/HfV14fYQiE26JdKwsMQnGP, F-232 https://claude.ai/artifact/FJY3u5QVqoNtku1MhNDhKn sind entschieden – nur auf neue Kommentare prüfen (`query`; Stand V154: keine). **Erstes Paket V155 (Funktion vor Design):** **F-236 B Schritt 3** (G5): Abweichung je Element – im Bearbeiten-Fenster der Kästen (Zielhierarchie, PSP, Organigramm, Phasenplan) Feld „Farbe“ mit Hinweis „weicht von der Vorlage ab“ und „auf Regel zurücksetzen“ (Daten z. B. neben `figLayout` je Grafik/Kasten, in `withLook` anwenden), danach **G3 Rest** als Regeln im Generator-Blatt: Schrift und Größen (Überschrift, Text, Tabelle), Kästen (Ecken, Schatten), Tabellen (Kopf, Raster), Kopf-/Fußzeile im Druck (Logo, Projektnummer, Seite); dann Hilfe-Einträge „Medien in Feldern“ und „Layout-Vorlage“ (mit Symbol, Test F-183). **In jedem Chat vor der Übergabe:** `python3 tools/live_project.py V<n> <JJJJ-MM-TT>`. Enricos Testphase ab 07.12., Termin Fr 04.12. **Prüfdateien (F9) erst ab 07.12.** Leitlinien: **Rangfolge 1. IPMA ICB4, 2. MS Project/iTaskX/Trello, 3. unsere Sicht**, **Dokumente wie im Report**, **Funktion vor Design**, **Texte in Grafiken nie über Feldränder**, **Meldungen am Ort**, NF-08, F-231. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, Browser-Hinweise `V150_…`/`V152_…`, kleine Punkte aus `V74_`–`V154_…` gelten weiter. **Handbuch** bei jeder Änderung mitführen. **Dashboards** zählen wie V127. Am Ende nach dem Begrüßungstext den **Projektstand** als Textbaustein.

**Tests** (VM ist nach jedem Chat leer – neu anlegen): Befehl aus `V135_Uebergabe_E-Sources.md`, Testliste `… schedule watch inbox tableFiles ink qr fieldMedia` (**neu: fieldMedia**); Aufruf `timeout 175 bash $HOME/vt2/run.sh 2>&1 | grep -E "grün|FAIL|==" | paste - -` mit `timeout_ms: 180000`. Tests V154: **796** grün (`workspace` 529, `gpm` 83, `fieldMedia` 4). `npx tsc --noEmit -p .` sauber.

**Löschen:** keine Freigabe in V154 (nichts gelöscht).

## Was in V154 passiert ist

1. **Docs** K14, F-236, F-232: keine neuen Kommentare.
2. **F-232 P12 Medien:** `workspace/fieldMedia.ts` (Verweiszeilen `![Name](es-img:…)` / `[Name](es-file:…)` am Ende des Feldwerts, `splitMedia`, `joinMedia`, `textRoom`, `mediaKindOf`, `mediaRefusal`, `wsMediaRefs`, `embedMedia`, `logoId`); `components/FieldMedia.tsx` (`storeMedia`, `mediaDrop`, `useFieldMedia` mit Vorschau Bild/PDF/Ton/Video und ✕ + Rückgängig am Feld, `PaperLogo`). Eingebaut in `Field` (ProjectSheet → Steckbrief, Problemstellung, Entscheidungsvorlage) und neue `LongCell` (ProjectForms, alle long/lines-Felder). `imageRefs` zählt Feld-Medien und Logos (Aufräumen beim Start löscht sie nicht). Logo `charter.logo` in allen vier Kopfzeilen und auf dem Deckblatt des Berichts; Bericht bettet Feldbilder ein (`reportPicRefs` + `embedMedia`).
3. **F-232 P13 Rest:** `ContentsRail` neben jedem Blatt (Formulare inkl. Steckbrief, Problemstellung, Entscheidungsvorlage; nicht im Pad), markiert das gezeigte Dokument, zuklappbar je Gerät; `openToc` in ProjectCockpit, `onToc` durch ProjectForms/ProjectFeedback/FeedbackPaper/ProjectDecisions/Decisions/DecisionTool/DecisionSheet.
4. **F-236 B Schritt 1:** `workspace/layoutRules.ts` (Regeln, Vorgabe „Report ColorGentlemen“ = bisherige Werte, `sanitizeLayout`, `layoutOf`, Kontrast WCAG, `shade`, `textOn`, `svgColorsOf`, `paperVars`), `Project.layout`, `Gp.editLayout`, Aktion `layoutEdit`. `gpmFigures`: `LOOK` mutierbar, `withLook` um `figureSvg` und beide Portfolios, `defs()` zur Zeichenzeit, Verlauf aus = flach ohne Glanz. Kurven `Rp.printColorsOf(p)`, Blätter `paperZoom(size, p)`, Bericht `layoutCss`.
5. **F-236 B Schritt 2:** Ansicht **„Layout“** (letzte im Rad, `components/ProjectLayout.tsx`, Texte `LAYOUT_TEXT`): Regeln in Gruppen, Farbfeld + Hex, ● abweichend, ↺ auf Vorgabe, Kontrastwarnung am Ort, Name, „Übernehmen von“, „Alles auf ‚Report ColorGentlemen‘“ (Rückgängig), Live-Vorschau. In `contentsOf` unter Weitere Ansichten.
6. Handbuch V154 (Kap. 7, 12, Änderungsverzeichnis); Lastenheft F-232/F-236 „Gebaut V154“; `APP_VERSION = 'V154'`; Live-Projekt V154 (206 F-Punkte, 3 ersetzt, 130 fertig, 25 teilweise, 48 offen).

**Noch nichts davon im Browser geprüft** (Regel: getestet wird, wenn alles steht).

## Prüfliste für Enrico (zusätzlich zu V77–V153)

- **Medien:** Steckbrief › „Hauptziele“: unter dem Feld „Medien“ → Bild wählen → Vorschau unter dem Feld, Meldung am Feld; Bild ins Feld ziehen; Bildschirmfoto kopieren und im Feld Strg/⌘+V; PDF (Vorschau), MP3/M4A (Abspieler), MP4 (Abspieler); ✕ → „Rückgängig“. Im Feld steht nur der Text. ZIP wird abgelehnt (Meldung am Feld).
- Dasselbe in Formulare (z. B. 8.3 Aktivitäten), Problemstellung (Beschreibung), Entscheidungsvorlage (Fragestellung).
- **Bericht:** Bild im Feld erscheint im Bericht, PDF/Ton/Video als „📎 Name“; Logo auf dem Deckblatt.
- **Logo:** über die Kopfzeile eines Blatts fahren → „Logo“ → Bild; erscheint auf allen Blättern des Projekts; ✕ entfernt. Ziehen auf die Kopfzeile.
- Neu laden: Medien und Logo bleiben (Gerätespeicher); nach 30 s Aufräumen sind sie noch da.
- **Seitenleiste „Inhalt“** links neben jedem Blatt: aktuelles Dokument markiert, Klick/Enter wechselt (auch zu Anlagen/Ansichten), ↑/↓, ◂ zuklappen, nach Neuladen gemerkt; schmales Fenster → über dem Blatt; Druck ohne Leiste.
- **Layout:** Rad „Ansicht“ › Layout: Primärfarbe ändern → Vorschau, Zielhierarchie/Organigramm, Formular-Grafiken und Bericht in der neuen Farbe; „Kästen mit Verlauf“ aus → flach; Kopfzeile-Farbe hellgelb → Kontrastwarnung; ↺ einzeln; „Alles auf …“ + Rückgängig; zweites Projekt › „Übernehmen von“.
- Ohne Layout-Regeln sieht alles genau aus wie bisher.
- Weiter offen aus V153/V152/V151/V150/V149.

## Kleine Punkte

- **Offen:** F-236 Schritt 3 (Abweichung je Element), G3 Rest (Schrift, Ecken/Schatten, Tabellenraster, Kopf-/Fußzeile); Vorlagen ohne Projekt im Arbeitsbereich (heute „Übernehmen von“ einem Projekt); Hilfe-Einträge „Medien in Feldern“, „Layout-Vorlage“ (mit Symbol – Test F-183 prüft Symbole); Seitenzahlen im Druck-Inhaltsverzeichnis; F-109 „Wo war ich?“.
- **Medien:** Abgleich trägt nur den Verweis – auf anderen Geräten „liegt nicht auf diesem Gerät“ (wie Notizbilder, P12 entschieden). Medien in Feldern des Live-Projekts werden durch den Schreibschutz zurückgelegt (die Datei bleibt bis zum Aufräumen im Gerätespeicher).
- **Layout:** Die festen Töne für sky/steel/slate (Gantt-Varianten) und einige Graustufen in den Grafiken folgen den Regeln noch nicht; die Oberfläche (Kanban, Pads) bleibt beim Design-Rad (G6).
- Eisenhower-Grafik 15.2: Alt+Pfeile wechseln dort das Feld, im Sheet stellen Alt+↑/↓ um – bei Bedarf angleichen (NF-08).
- Unverändert: NF-01 (Apple-Texterkennung), Tinte gerätegebunden, Fußzeile in Browsern ohne Seitenrand-Felder, F-211 (Rechte/Server). Sonst unverändert in `V153_…` bis `V131_…`.

## Commit-Text V154 (e-sources)

**Summary:** `V154: Medien in Feldern und Logo, Inhalt neben jedem Blatt, Layout-Vorlage mit Generator`

**Description:**
```
- F-232 P12: Bilder, PDF, Ton und Video in allen mehrzeiligen Feldern der Blätter (Knopf, Ziehen, Einfügen), Vorschau am Feld, Entfernen mit Rückgängig; Dateien im Gerätespeicher, im Projekt nur der Verweis; Bericht bettet Bilder ein
- Logo in der Kopfzeile aller Blätter und auf dem Deckblatt des Berichts
- F-232 P13: zuklappbare Inhalts-Seitenleiste neben jedem Blatt
- F-236 B Schritt 1: Layout-Vorlage je Projekt (layoutRules.ts) – Grafiken, Kurven, Blätter und Bericht lesen ihre Farben daraus; Vorgabe „Report ColorGentlemen“ unverändert
- F-236 B Schritt 2: Ansicht „Layout“ mit Regeln, Kontrastwarnung, Übernehmen, Zurücksetzen und Live-Vorschau
- Tests 796 (+4); Handbuch V154, Lastenheft, APP_VERSION V154, Live-Projekt V154, Übergabe V154

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q51TeKiGpkkZ4gcfwF
```
