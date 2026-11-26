# Übergabe V120 → V121 E-Sources

Stand: 26.11.2026 · Chat V120 · Nächster Chat: **V121 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V121 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-231** (Absätze „Entscheidungs-Doc V120“, „Entschieden V120“, „Gebaut V120“) und **F-227** (Handbuch). Entscheidungs-Doc **F-231** https://claude.ai/artifact/KRcgsUzDgbzphj6rP9tKUV ist **entschieden** (Enrico folgt allen Vorschlägen; PDF `docs/Arbeitspakete/F-231_V120_Kanban-wie-Trello.pdf`). **Termin Fr 04.12.2026**, Enricos Testphase ab 07.12. Leitlinien: **Rangfolge 1. IPMA ICB4, 2. Funktionen von MS Project/iTaskX/Trello, 3. unsere Sicht und Verbesserungen**, Design und Anordnung an unsere UX/UI angepasst, **Funktion vor Design**, NF-08, **F-231: unser Kanban ist mindestens so leistungsfähig wie Trello**. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V120_…` gelten weiter. **Handbuch** `docs/Handbuch/E-Sources_Handbuch.md` bei jeder Änderung mitführen. **Prüfdateien (F9: MS Project, iTaskX, Trello) bringt Enrico erst in seiner Testphase ab 07.12. – bis dahin nicht danach suchen.** Dann **F-231 Bauplan bauen** in der Reihenfolge **K3 → K1 → K5 → K2 → K4 → K13 (Tabelle, Kalender) → K7** (Einzelheiten unten und im Doc); jedes Paket mit Hilfe, Begriff, Handbuch, Test und Trello-Import/Export (F-230) mitziehen.

**Tests** (VM ist nach jedem Chat leer – neu anlegen; **neu: projectKanban**):
```
mkdir -p $HOME/vt2/node_modules/vitest && cp $HOME/mnt/Projects/e-sources/docs/uebergaben/vitest-ersatz.js $HOME/vt2/node_modules/vitest/index.js
cat > $HOME/vt2/run.sh <<'EOS'
cd $HOME/mnt/Projects/e-sources/web
rm -rf $HOME/vt2/out
npx tsc --outDir $HOME/vt2/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node src/workspace/*.ts >/dev/null 2>&1
for t in ${TESTS:-workspace persons stage noteSources gpm wheelOrder calendar resources deskProject mspdi trello projectKanban}; do echo "== $t"; NODE_PATH=$HOME/vt2/node_modules:$PWD/node_modules node $HOME/vt2/out/$t.test.js 2>&1 | tail -3; done
EOS
bash $HOME/vt2/run.sh
```

**Browser:** Enrico startet `npm run dev` in `web/`; der eingebaute Browser erreicht **http://localhost:2910/** über `browser_repl` (in V120 zuverlässig). Das Rad „Ansicht“ im Projekt-Modus hat 11 Rasten und eine eigene Ordnung – schneller: `localStorage.setItem('esource.projectView.v1', 'kanban')` und neu laden.

## Was in V120 passiert ist

`npx tsc --noEmit -p .` sauber. Tests: workspace 526, persons 18, stage 4, noteSources 1, gpm 44, wheelOrder 5, calendar 5, resources 2, deskProject 6, mspdi 6, trello 7, **projectKanban 3** (neu) – alle grün.

1. **F-231 Funktionsvergleich** als Claude Doc an der Seite (Trello-Stand gegen Trello-Guide/Atlassian-Blog 11/2026 geprüft): Tabellen A Board/Spalten/Karten, B Karteninhalt, C Filter/Ansichten/Automatisierung/Zusammenarbeit; Bauplan K1–K14; Fragen T1–T9. **Enrico: „Ich möchte im Doc vorerst deinen Vorschlägen folgen“** → alle Antwort-Spalten „wie Vorschlag“, PDF neu, Lastenheft F-231 „entschieden V120“.
2. **Nächste Schritte 3 – Import-Meldung auf dem neuen Desk:** `ImportMsg` in `ProjectExchange.tsx`; `onImported` bekommt `{ text, undo }`; `addOwnDesk` (App) gibt die Meldung bei Wechsel im selben Fenster per `carryMsg(dest, …)` (in `DeskProject.tsx`) an den neuen Desk; `DeskProjectMenu` zeigt sie beim Einhängen am ⋮; „Rückgängig“ stellt den Stand vor dem Import her **und** wechselt zurück auf den Desk, auf dem importiert wurde (`EXCHANGE_TEXT.importUndone`). Öffnet ein neues Browserfenster, bleibt die Meldung wie bisher am alten ⋮. **Im Browser noch nicht geprüft** (braucht blockiertes Popup) → Prüfliste.
3. **Nächste Schritte 5 – Kanban im Projekt-Modus:** `workspace/projectKanban.ts` (`projectBoards`, `boardCandidates`, `makeProjectBoard` – Vorgänge ohne Unter-Vorgänge, nicht archiviert, nicht schon auf anderem Kanban, Spalte nach Zustand über `moveToSheet`), `components/ProjectKanban.tsx` (Ansicht `kanban` nach Netzplan im Rad „Ansicht“; ohne Board „Kanban-Board anlegen (n Vorgänge als Karten)“ mit Rückgängig am Ort; mehrere Boards → Rad „Welches Kanban-Board“; darin das normale `KanbanSheet`). `Sh.addTask`: Karten auf einem Kanban mit Besitzer Projekt bekommen `project`. CSS `.pkb__board` (62vh). **Im Browser geprüft:** ColorGentlemen → Board angelegt (40 Karten, Spalten Offen/In Arbeit/Erledigt), Rückgängig entfernt es wieder.
4. Hilfe „Kanban im Projekt-Modus“ (`projectKanban`), Texte `PROJECT_KANBAN_TEXT`, `PSP_TEXT.views.kanban`, Handbuch V120 (7 und 7.3), Lastenheft F-231, `APP_VERSION = 'V120'`.

**Im eingebauten Browser:** Projektansicht steht auf „Kanban“ (localStorage), sonst nichts Neues angelegt.

## Nächste Schritte (F-231 Bauplan, entschieden V120)

1. **K3 Spalten:** `COLUMN_MAX` 8 → 20 (Trello-Import ohne Rest, `listsOver` dann selten); im Spalten-⋮ „Spalte archivieren“ (Archiv-Bereich im Sheet-Menü stellt wieder her; `NoteColumn.archived`?), „Spalte kopieren“ (Karten als Kopien), „Alle Karten verschieben …“ auch in ein anderes Sheet. Trello: archivierte Listen (`closed`) dann als archivierte Spalten statt nur Fremddaten.
2. **K1 Karten:** „Kopieren …“ (Taste K, Haken: Checkliste, Tags, Personen, Termine, Quellen), Archiv mit Suche und Wiederherstellen im Sheet-Menü, „oben anlegen“ im Spalten-⋮, Kartenvorlagen („Als Kartenvorlage“, „+ Karte aus Vorlage“).
3. **K5 Termine:** Uhrzeit wahlweise an „fällig“ (MSPDI Deadline und Trello `due` tragen sie), Zeichen „fällig“ gelb (bald) / rot (überfällig) / grün (erledigt) mit Text, Vorschlag Erinnerung „1 Tag vor fällig“.
4. **K2 Checklisten:** Kartenfenster zeigt jede „### ☑ Name“-Liste einzeln mit Balken, „Punkt hinzufügen“, „Erledigte ausblenden“; Punkt-Zeile mit `@Person` und Datum (Format festlegen, Trello `checkItems.due/idMember` beim Import/Export); „Checklisten übernehmen von …“. T3: bleibt im Text.
5. **K4 Tags + Filter:** gemeinsame Tag-Farbliste (T4), Verwaltung je Board (ein-/ausblenden, umbenennen, Farbe, löschen), Farbstreifen auf der Karte; Filter-Rad um Tag, Fälligkeit (überfällig, diese Woche, ohne), Zustand, Person – kombiniert UND/ODER. Trello-Labelfarben dann ohne Verlust.
6. **K13 Ansichten:** Rad „Ansicht“ am Kanban (T6): Board | Tabelle | Kalender (Monat/Woche, Ziehen ändert „fällig“) – vor 04.12.; Zeitleiste (Gantt) und Kennzahlen danach.
7. **K7 Kommentare** (wenn Zeit): Kommentar = Spur-Eintrag mit Text (T5), @Person, bearbeiten/löschen mit Rückgängig; Trello-Kommentare gehen darin auf und zurück.
8. Danach K6, K8–K12, K14; F-230 F7 (CSV/Excel, iCal).
9. **Prüfung F-230 mit Enricos Dateien (F9)** erst in der Testphase ab 07.12.
10. **Prüfliste für Enrico** (alles aus V77–V119 plus):
    - Seite neu laden, dann `npm test` in `web/`.
    - Projekt-Modus › Rad „Ansicht“ › **Kanban**: „Kanban-Board anlegen“ → Karten in Spalten nach Zustand, Meldung mit Rückgängig am Ort; Karte ziehen, mit Tastatur verschieben, Karte öffnen; „+ Karte hinzufügen“ → die neue Karte erscheint im Gantt/PSP des Projekts.
    - Projekt mit zwei Kanban-Boards (zweites über Library/Pad dem Projekt geben, z. B. Trello-Import) → Rad „Welches Kanban-Board“.
    - Import bei blockiertem Popup (Browser blockiert neues Fenster): neuer Desk öffnet im selben Fenster, am ⋮ steht die Import-Meldung mit „Rückgängig“ → Klick: Projekt und Desk weg, zurück auf dem alten Desk mit „Import zurückgenommen …“.

## Kleine Punkte (neu in V120)

- **`device_commit_files` nach dem Schreiben** kann noch die alte Fassung übertragen (wie V119) – Größe auf dem Gerät prüfen, sonst nach einigen Sekunden erneut übertragen.
- **Docs-Export als PDF:** `mcp__Claude_Docs__export` liefert zu viel Text für den Chat; das Ergebnis liegt dann als JSON-Datei vor – mit Python `base64` aus dem längsten Feld lesen und als PDF schreiben.
- `makeProjectBoard` legt Notizen mit Zustand „wartet“ in die Offen-Spalte; „wartet“ bleibt (von selbst gerechnet).
- Neue Rad-Einträge (hier „Kanban“) landen in einer schon geordneten Rad-Belegung (F-220) hinten.

## Commit-Text V120 (e-sources)

**Summary:** `V120: Kanban im Projekt-Modus, Import-Meldung mit Rückgängig auf dem neuen Desk, F-231 Funktionsvergleich Trello entschieden`

**Description:**
```
- F-231: Funktionsvergleich Trello ↔ E-Sources-Kanban als Entscheidungs-Doc (Bauplan K1–K14, Fragen T1–T9), entschieden: Enrico folgt allen Vorschlägen; Lastenheft nachgezogen
- Kanban im Projekt-Modus: Rad „Ansicht“ › Kanban zeigt das Kanban-Board des Projekts; „Kanban-Board anlegen“ sortiert die Vorgänge nach Zustand ein (mit Rückgängig am Ort); mehrere Boards über ein Rad; neue Karten gehören zum Projekt
- Import: Meldung mit „Rückgängig“ geht mit auf den neuen Desk (am ⋮), Rückgängig nimmt Projekt und Desk zurück und wechselt zurück
- workspace/projectKanban.ts + Test (3), components/ProjectKanban.tsx, Hilfe, Handbuch V120 (7, 7.3), APP_VERSION V120, Übergabe V120

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q6WqWRH72tB9Rz65gD
```
