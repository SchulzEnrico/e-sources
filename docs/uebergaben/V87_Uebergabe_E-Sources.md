# Übergabe V87 → V88 E-Sources

Stand: 25.11.2026 · Chat V87 abgeschlossen · Nächster Chat: **V88 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V88 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-206 „Schritt 7“** (mit „Gebaut V86“, „Gebaut V87“ und „Kanban im Cockpit und Board-Layouts“) und **NF-08**. Entscheidungen BC1–BC3, BL1–BL4, R1 stehen im Claude Doc „F-206 V87 – Kanban im Cockpit und Board-Layouts“ (https://claude.ai/artifact/5gnNfZepGKDM7h65HDMgHW, PDF `docs/Arbeitspakete/F-206_V87_Kanban_Cockpit_BoardLayouts.pdf`) – BC ist gebaut, **BL (Board-Vorlagen) kommt jetzt**. Leitlinie: **an Trello und unserer UX/UI ausrichten**. Schritt-7-Entscheidungen in `V86_Uebergabe_E-Sources.md`, Umschalt-Rad in `V83_…`, Arbeitsregeln und Technik weiter `V61_Uebergabe_E-Sources.md` (+ `V61_Nachtrag_…`); offene kleine Punkte aus `V74_`–`V86_…` gelten weiter. Dann „Nächste Schritte“ ab 1.

## Was in V87 passiert ist

Tests **431 grün** (V86: 424). `npx tsc --noEmit -p .` sauber. Im eingebauten Browser geprüft (`localhost:2910/?test=voll`): Kanban anlegen über Menü, Karten anlegen, per Tastatur aufnehmen/verschieben (Zustand → „in Arbeit“), per Maus ziehen, Erledigt mit Strg+Enter (Meldung + Rückgängig), Kartenfenster öffnen/Esc mit Fokus zurück; Matrix anlegen, Aufgabe im Streifen anlegen, per Tastatur in ein Feld legen, in den Mülleimer und „Rückgängig“; × am Sheet-Reiter; Notizen-Modus mit zwei Pads nebeneinander. Keine Fehler in der Konsole.

1. **Kanban-Oberfläche** – neue Datei `components/KanbanSheet.tsx` (statt in `SheetViews.tsx`, die bleibt Rahmen + To-do; geteilte Teile `SheetHead`, `CardWindow`, `Signs`, `useNotice`, `lockText` von dort). Alles aus K1–K5/L2, Details im Lastenheft „Gebaut V87“. Logik neu in `sheets.ts`: `sortCol`, `moveAllCards`, `cardPlace` (+ Tests); Aktionen `colSort`, `colMoveAll`, `sheetReview` (Board-Regel „Abnahme nötig“ im ⋮ des Pads). Texte `KANBAN_TEXT`.
2. **Eisenhower-Oberfläche** – neue Datei `components/MatrixSheet.tsx`, Texte `MATRIX_TEXT`. **Enrico: Felder wie im Original** (seine Abb. 17 war falsch positioniert): oben links erledigen, oben rechts planen, unten links delegieren, unten rechts ablegen mit Mülleimer unten rechts; Achsen oben „sehr wichtig“, links „sehr dringend“. `QUAD_CELL`/`quadAt` umgestellt (Test angepasst). E3: zweite Matrix öffnet die vorhandene (`padOpenResult`, „+ Sheet“).
3. **Menü G** (Neue To-do-Liste · Neues Kanban-Board · Eisenhower-Matrix im Menü „Notizen & Aufgaben“), Fußleiste in allen Sheets, Wischen → „Neue Checkliste“, Hilfe: `todoUse`, `kanbanUse`, `matrixUse`, `cardWindow` (+ `HELP_ICON`), „Notizen & Aufgaben“ und „Desk oder Notizen“ ergänzt.
4. **Wünsche Enrico zwischendurch:** × an jedem Sheet-Reiter im Pad (Entf auf dem Reiter ebenso, Fokus auf den Nachbar-Reiter); **Notizen-Modus verteilt alle Pads im Raster** (`noteTiles` in `pads.ts`, Test) statt nur das oberste als Vollbild – freie Anordnung erst mit Lageplan F-210; **Vollbild-Knopf je Pad** im Kopf (Maximieren/Verkleinern, Alt/⌥+Enter; Zustand `fullPad` in App, nur bis zum Neuladen, gilt im Notizen-Modus und für schwebende Pads); Kanban im Cockpit und Board-Layouts → Entscheidungs-Doc (siehe oben, noch unbeantwortet, PDF noch nicht abgelegt).
5. **Entscheidungs-Doc „Kanban im Cockpit und Board-Layouts“** mit Enrico beantwortet (Kommentare + Spalte), PDF über pandoc → docx → LibreOffice in `docs/Arbeitspakete/` abgelegt (Weg für künftige Docs: Docs-Export als Markdown, dann `pandoc doc.md -o doc.docx` und `soffice --headless --convert-to pdf doc.docx` in device_bash – der HTML-Weg macht schmale Tabellen). **BC gebaut:** Mini-Board und To-do-Fortschritt unter dem gewählten Sheet im Cockpit „Notizen“, Übersicht „Eisenhower-Matrizen“; Klick auf eine Mini-Spalte zeigt das Board mit Fokus in dieser Spalte. Logik `boardSummary`, `todoSummary`, `matrixSummary`, `matricesOf` (Test).
6. CSS: Block „F-206 Schritt 7 (V87)“ und „× an jedem Sheet-Reiter“ am Ende von `App.css`.

## Nächste Schritte

1. **BL – Board-Vorlagen** (BL1–BL3): Datenmodell `BoardTemplate` (Name, Spalten mit Name/Bedeutung/WIP, Regel Abnahme) als `Workspace.boardTemplates` – Speicher (`storage.ts` parse), Gist-Abgleich, Datei-Sicherung; mitgeliefert Einfach · Mit Prüfung · Vertrieb (Lead/Kontakt/Angebot/Abschluss) · Bewerbungen (nicht löschbar bzw. als Grundbestand); „Neues Kanban-Board“ (Menü G und „+ Sheet“) fragt „Leer · Vorlage …“; „Als Vorlage speichern …“ im ⋮ des Pads; im Cockpit „Layouts“ eigene Gruppe „Board-Vorlagen“ unter den Desk-Layouts mit denselben Werkzeugen an denselben Stellen (Anlegen aus aktuellem Board, Umbenennen F2, Anwenden, Löschen mit Rückgängig, Als Datei speichern). Tests, Hilfe.
2. Kleine Punkte aus Schritt 7: V (Verschieben nach …) in Sheets (wie Cockpit, Ziel-Sheet wählen), Schloss auch im Notizblock/Editor (L1 „überall“), Rad-Wahl („Ordnung“, „Zeigen“) je Sheet und Gerät merken.
3. Danach (N13): Lageplan F-210 (inkl. freie Anordnung im Notizen-Modus) → Notiz ↔ Quelle (Schritt 6) → Personen + Projektfokus (8) → Board (9) → Touren prüfen (F-217). Portfolio „Aktuelles“ nachziehen (seit V83; jetzt mit Kanban/Matrix ein sichtbarer Schritt).
4. **Wenn alles steht – Prüfliste für Enrico:** alles aus V77–V86 (siehe `V81_`, `V83_`–`V86_Uebergabe_E-Sources.md`) plus:
   - Kanban: Menü „Notizen & Aufgaben › Neues Kanban-Board“; Karte hinzufügen (Feld bleibt offen, Esc schließt); Karte ziehen (Maus, Touch lange drücken), Platzhalter am Ziel, Rand-Scrollen; Tastatur Leertaste/Pfeile/Leertaste/Esc mit Ansage; Erledigt-Kreis bei Hover und Strg/⌘+Enter (wandert nach „Erledigt“, „Rückgängig“); Spalten-⋮ mit allen Einträgen (Verschieben, alle Karten verschieben, sortieren, WIP-Limit, Bedeutung, umbenennen, löschen + Rückgängig); WIP-Rückfrage und „! über Limit“; „+ Spalte“ (bis 8); Rad „Offen · Alle“ und „n erledigt“ je Spalte; Unter-Notizen auf der Karte; ⋮ des Pads › „Abnahme nötig“ → Karte in Erledigt zeigt „Abnahme bestätigen“ mit Rückfrage.
   - Eisenhower: Lage der Felder wie im Original; Streifen „Noch nicht eingeordnet“ mit „Neue Aufgabe …“; Ziehen in Felder und Mülleimer; Tastatur (aus „ablegen“ Pfeil rechts/runter = Mülleimer); Termin …, Delegieren an …, Archivieren; zweite Matrix → öffnet die vorhandene.
   - Schloss im To-do (Notiz auch auf einem Kanban) → „Zum Kanban“.
   - Cockpit „Notizen“: Kanban-Sheet in der Liste wählen → Mini-Board darunter, Klick/Enter auf eine Spalte zeigt das Board mit Fokus dort; To-do-Sheet → Fortschrittsbalken; Abschnitt „Eisenhower-Matrizen“ mit Zahlen, Klick zeigt die Matrix.
   - × am Sheet-Reiter, Entf auf dem Reiter; Notizen-Modus mit 1, 2, 3 und mehr Pads; Vollbild-Knopf im Pad-Kopf und Alt/⌥+Enter hin und zurück (auch im Desk-Modus).

## Kleine Punkte (neu in V87)

- Spalte löschen: Karten wandern nach links, ihr **Zustand bleibt** (wird nicht an die neue Spalte angepasst) – damit „Rückgängig“ sauber zurückholt. Bei Bedarf beim Löschen nachziehen.
- Kanban „Offen“ klappt nur echte Erledigte (erledigt/archiviert) je Spalte ein; „in Prüfung“ bleibt sichtbar (braucht noch die Abnahme).
- Erledigt-Kreis auf Karten ist nicht per Tab erreichbar (tabIndex −1), Tastatur = Strg/⌘+Enter; auf Touch (`hover: none`) immer sichtbar.
- Matrix: Entf nimmt nur hineingelegte Karten aus dem Sheet; Karten, die wegen wichtig/dringend erscheinen, melden einen Hinweis (dorthin über „ablegen“ + Mülleimer bzw. Archivieren).
- Matrix: Karten lassen sich nicht zurück nach „Noch nicht eingeordnet“ legen (wichtig/dringend wären dann gesetzt). Innerhalb eines Feldes keine eigene Reihenfolge.
- „Termin …“ setzt `due` sofort bei Datumswahl (Feld `type=date`); Delegieren schreibt `delegated.to` als Freitext (Personen kommen mit Schritt 8).
- Ziehen: `tab.drag` im Testbrowser braucht Bildpunkte (Faktor Screenshot-Breite ÷ Viewport-Breite, z. B. 1372/1400), nicht CSS-Pixel. Unsichtbarer Browser (Bereich verdeckt) pausiert das Zeichnen – vor Tests `browser.show()`.
- Vollbild je Pad wird nicht gespeichert (nach Neuladen Übersicht); Alt/⌥+Enter wirkt im ganzen Pad, auch im Editor.
- Notizen-Modus: Pads im Raster lassen sich (wie vorher das Vollbild) nicht frei ziehen; Reihenfolge nach Pad-Id, oben = zuletzt benutztes Pad (`top`).
- Kanban-Board und Matrix belegen in schmalen Pads (< 460 px) wenig Platz – waagerechtes Scrollen bzw. engere Matrix; Mobilansicht der Notizen bleibt aus (V76).
- Cockpit: Das Abbild erscheint nur unter dem Sheet, das gerade den Fokus in der Liste hat (anfangs die erste Zeile). Fokus in die Spalte kommt 450 ms nach dem Zeigen (nach dem Fokus auf den Reiter).
- Tests in Claudes VM weiter nur mit `vitest-ersatz.js` (siehe V61); Skript wie in V86.

## Commit-Text V87

**Summary:** `V87: F-206 Schritt 7 – Kanban wie Trello, Eisenhower wie im Original, Menü und Hilfe; Pads verteilt und Vollbild, Kanban im Cockpit`

**Description:**
```
- KanbanSheet.tsx: Spalten wie Trello-Listen, Kopf mit Bedeutung,
  Zähler und WIP-Hinweis, Spalten-Menü (verschieben, alle Karten
  verschieben, sortieren, WIP-Limit, Bedeutung, umbenennen, löschen
  mit Rückgängig), Karten im Clay-Stil mit Erledigt-Kreis und
  Unter-Notizen, Ziehen mit Maus/Touch, Tastatur mit Ansage,
  Abnahme bestätigen, Board-Regel „Abnahme nötig“
- MatrixSheet.tsx: Eisenhower wie im Original (erledigen, planen,
  delegieren, ablegen mit Mülleimer), Streifen „Noch nicht
  eingeordnet“, Termin/Delegieren/Archivieren, genau eine Matrix
- sheets.ts: sortCol, moveAllCards, cardPlace; Feldlage neu (Tests)
- Menü „Notizen & Aufgaben“: neue To-do-Liste, Kanban, Matrix;
  Hilfe zu To-do, Kanban, Matrix und Kartenfenster
- × an jedem Sheet-Reiter im Pad
- Notizen-Modus: alle Pads verteilt im Raster (noteTiles),
  Vollbild-Knopf je Pad (Alt/⌥+Enter) und zurück zur Übersicht
- Cockpit „Notizen“: Mini-Board, To-do-Fortschritt, Übersicht der
  Matrizen (Entscheidungen BC1–BC3)
- Entscheidungs-Doc Kanban im Cockpit und Board-Layouts (PDF)
- Lastenheft F-206, Übergabe V87, Tests 431 grün
```
