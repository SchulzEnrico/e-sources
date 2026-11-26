# Übergabe V121 → V122 E-Sources

Stand: 26.11.2026 · Chat V121 · Nächster Chat: **V122 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V122 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-231** (Absätze „Entschieden V120“, „Gebaut V120“, „Gebaut V121“) und **F-227** (Handbuch). Entscheidungs-Doc **F-231** https://claude.ai/artifact/KRcgsUzDgbzphj6rP9tKUV ist **entschieden** (Enrico folgt allen Vorschlägen; PDF `docs/Arbeitspakete/F-231_V120_Kanban-wie-Trello.pdf`, Text daraus mit `pdftotext -layout`). **Termin Fr 04.12.2026**, Enricos Testphase ab 07.12. Leitlinien: **Rangfolge 1. IPMA ICB4, 2. Funktionen von MS Project/iTaskX/Trello, 3. unsere Sicht und Verbesserungen**, Design und Anordnung an unsere UX/UI angepasst, **Funktion vor Design**, NF-08, **F-231: unser Kanban ist mindestens so leistungsfähig wie Trello**. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V121_…` gelten weiter. **Handbuch** `docs/Handbuch/E-Sources_Handbuch.md` bei jeder Änderung mitführen. **Prüfdateien (F9: MS Project, iTaskX, Trello) bringt Enrico erst in seiner Testphase ab 07.12. – bis dahin nicht danach suchen.** Dann **F-231 Bauplan weiterbauen: K4 → K13 (Tabelle, Kalender) → K7** (K3, K1, K5, K2 sind in V121 gebaut); jedes Paket mit Hilfe, Begriff, Handbuch, Test und Trello-Import/Export (F-230) mitziehen.

**Tests** (VM ist nach jedem Chat leer – neu anlegen; **neu: kanbanMore, checklists**):
```
mkdir -p $HOME/vt2/node_modules/vitest && cp $HOME/mnt/Projects/e-sources/docs/uebergaben/vitest-ersatz.js $HOME/vt2/node_modules/vitest/index.js
cat > $HOME/vt2/run.sh <<'EOS'
cd $HOME/mnt/Projects/e-sources/web
rm -rf $HOME/vt2/out
npx tsc --outDir $HOME/vt2/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node src/workspace/*.ts >/dev/null 2>&1
for t in ${TESTS:-workspace persons stage noteSources gpm wheelOrder calendar resources deskProject mspdi trello projectKanban kanbanMore checklists}; do echo "== $t"; NODE_PATH=$HOME/vt2/node_modules:$PWD/node_modules node $HOME/vt2/out/$t.test.js 2>&1 | tail -3; done
EOS
bash $HOME/vt2/run.sh
```

**Browser:** Enrico startet `npm run dev` in `web/`; der eingebaute Browser erreicht **http://localhost:2910/** über `browser_repl`. **Kleine Ausgabe beim Öffnen:** `browser.tabs.create("http://localhost:2910/package.json")` (statt der App – sonst kommt die ganze Seite als Snapshot), dann `tab.page.goto("http://localhost:2910/?test=voll")`. Im Testmodus ist Projekt-Modus › Ansicht „Kanban“ schon gewählt: „+ Projekt“ → Name, Enter → „Kanban-Board anlegen“ → `[data-add]` klicken, Titel tippen, Enter. Jeder Hot Reload löscht die Testdaten.

## Was in V121 passiert ist

`npx tsc --noEmit -p .` sauber. Tests: workspace 526, persons 18, stage 4, noteSources 1, gpm 44, wheelOrder 5, calendar 5, resources 2, deskProject 6, mspdi 6, trello 8, projectKanban 3, **kanbanMore 13**, **checklists 3** – alle grün.

1. **K3 Spalten** (`workspace/kanbanMore.ts`): `COLUMN_MAX` 8 → **20**; `NoteView.archivedCols` (Spalten mit `archivedAt`, `archivedFrom`, höchstens `ARCHIVED_COL_MAX` 50) – `archiveColumn`/`restoreColumn` (an alte Stelle), `copyColumn` (rechts daneben, Karten als Kopien, Bedeutung/WIP mit), `moveColumnCards` (alle Karten in ein anderes Sheet). `idsIn` zählt archivierte Spalten mit (Karte bleibt „im Board“: Schloss, Library); `without`, `placeNote`, `parseNoteViews`, `restoreView`, `importNotes` kennen sie. Spalten-⋮: „Spalte kopieren“, „Spalte archivieren“, „Alle Karten verschieben …“ jetzt auch mit Zielen in anderen Sheets. **Trello:** archivierte Listen ↔ archivierte Spalten (mit ihren Karten).
2. **K1 Karten:** `copyNote`/`copyCard` (Auswahl `CopyKeep`: Checkliste, Tags, Personen, Termine, Quellen/Anhänge; Spur neu, ohne Vorgänger/Eltern/Entwurf/Fremddaten), Leiste **„Kopieren …“** (`components/KanbanMore.tsx` › `CopyBar`, Taste **K**, Titel, Haken, „Als Kartenvorlage“, „Hier kopieren“ = direkt darunter, „Nach …“ = anderes Sheet). **Archivieren** Taste **C** (`archiveCard` = Zustand „archiviert“); archivierte Karten bleiben in ihrer Spalte und sind **im Board ausgeblendet** (Zähler ohne sie). **Archiv** (`ArchivePanel`): Knopf „Archiv (n)“ unter „+ Spalte“ und im ⋮ des Pads (Ereignis `esource:kanbanarchive`), Suche, „Wiederherstellen“ (Karte in ihre Spalte, Zustand nach Bedeutung; Spalte an alte Stelle), „Endgültig löschen“ (Karte, mit Rückgängig). „Karte oben hinzufügen“ im Spalten-⋮ (Eingabe oben, weitere Karten darunter). **Kartenvorlagen** `Note.template` („Als Kartenvorlage“ im Kartenfenster, Zeichen „Vorlage“, Spalten-⋮ „Karte aus Vorlage …“ – zuerst dieses Board, dann andere Sheets). Kartenfenster hat oben `acts` (Kopieren …, Archivieren, Als Kartenvorlage).
3. **K5 Termine:** `Note.dueTime` (HH:MM, auch Entwurf/`DRAFT_FIELDS`, `NotePatch`, Parser), Feld „Uhrzeit“ neben „fällig“ in der Notiz, `dueKind` (bald = 24 h, überfällig, erledigt) → Zeichen `sign--due-soon/over/done` mit Text; „Erinnern 1 Tag vorher“ (`remindBeforeDue`) neben dem Datum, wenn keine Erinnerung gesetzt ist. Trello `due` (lokale Zeit) und MSPDI `Deadline` (Uhrzeit ≠ 17:00) tragen die Uhrzeit hin und zurück.
4. **K2 Checklisten** (`workspace/checklists.ts`, `components/CardChecklists.tsx`): Kartenfenster zeigt jede „### ☑ Name“-Liste einzeln mit „d/a“ und Balken, Kästchen zum Abhaken, Person/Termin als Zeichen, „In Aufgabe umwandeln“, ✕ löschen (Rückgängig am Ort), „Punkt hinzufügen“, „+ Checkliste“, „Checklisten übernehmen von …“ (andere Karten des Sheets, Punkte offen), „Erledigte ausblenden“. **Punkt-Format:** `- [ ] Text — @Person, bis TT.MM.JJJJ` (beides wahlweise). Trello `checkItems.due`/`idMember` hin und zurück (Person über Namen ↔ Mitglied). Mit Entwurf zeigt das Fenster nur einen Hinweis.
5. Neues Symbol `archive`; Hilfe `kanbanArchive`, `dueTime`, `cardWindow` erweitert; Texte `KANBAN_MORE_TEXT`, `DUE_TEXT`, `CHECK_TEXT`; Kartentasten-Text um „K kopiert, C archiviert“; Handbuch V121 (5, 7.3); Lastenheft F-231 „Gebaut V121“; `APP_VERSION = 'V121'`.

**Im Browser geprüft (Testmodus):** Karte kopieren (K, Enter) → Kopie darunter; C archiviert mit Meldung + Rückgängig, „Archiv (1)“; Archiv zeigt Karte, Wiederherstellen; Spalte archivieren und aus dem Archiv wiederherstellen (alte Stelle); Spalte kopieren („Offen (Kopie)“, 4 Karten); Kartenvorlage im Kartenfenster, „Karte aus Vorlage …“; Checkliste anlegen, Punkt mit Person und Datum, abhaken, Balken. **Nicht im Browser geprüft:** Uhrzeit-Feld und Färbung (nur Tests), „In ein anderes Sheet“ beim Spalten-Verschieben, Pad-⋮ „Archiv …“, „Checklisten übernehmen von …“.

## Nächste Schritte (F-231 Bauplan, entschieden V120)

1. **K4 Tags + Filter:** gemeinsame Tag-Farbliste (T4, z. B. `Workspace.tagColors`), Verwaltung je Board (ein-/ausblenden, umbenennen, Farbe, löschen), Farbstreifen auf der Karte; Filter-Rad um Tag, Fälligkeit (überfällig, diese Woche, ohne – `dueKind` aus `kanbanMore.ts` nutzen), Zustand, Person – kombiniert UND/ODER. Trello-Labelfarben dann ohne Verlust (heute: Label ohne Namen heißt nach Farbe).
2. **K13 Ansichten:** Rad „Ansicht“ am Kanban (T6): Board | Tabelle | Kalender (Monat/Woche, Ziehen ändert „fällig“) – vor 04.12.; Zeitleiste und Kennzahlen danach.
3. **K7 Kommentare** (wenn Zeit): Kommentar = Spur-Eintrag mit Text (T5), @Person, bearbeiten/löschen mit Rückgängig; Trello-Kommentare gehen darin auf und zurück.
4. Danach K6, K8–K12, K14; F-230 F7 (CSV/Excel, iCal).
5. **Prüfung F-230 mit Enricos Dateien (F9)** erst in der Testphase ab 07.12.
6. **Prüfliste für Enrico** (alles aus V77–V120 plus):
   - Seite neu laden, dann `npm test` in `web/` (neu: `kanbanMore.test.ts`, `checklists.test.ts`).
   - Kanban: Karte fokussieren, **K** → Leiste „Kopieren …“: Haken abwählen, „Hier kopieren“ bzw. „Nach …“; **C** → Karte weg, Meldung mit Rückgängig; „Archiv (n)“ → Suche, Wiederherstellen, Endgültig löschen.
   - Spalten-⋮: Karte oben hinzufügen · Karte aus Vorlage … · Spalte kopieren · Spalte archivieren (und aus dem Archiv zurück) · Alle Karten verschieben … in ein anderes Sheet.
   - Kartenfenster: oben Kopieren … / Archivieren / Als Kartenvorlage; Checklisten: „+ Checkliste“, Punkt „Vertrag — @Anna, bis 04.12.2026“, abhaken, ✕ mit Rückgängig, „Checklisten übernehmen von …“, „Erledigte ausblenden“.
   - Notiz: „fällig“ setzen → Feld „Uhrzeit“, Zeichen gelb/rot/grün mit Text; „Erinnern 1 Tag vorher“.
   - Pad-⋮ eines Kanban-Sheets: „Archiv … “ öffnet das Archiv im Board.
   - Aus V120: Projekt-Kanban anlegen, zwei Boards, Import bei blockiertem Popup.

## Kleine Punkte (neu in V121)

- Wiederhergestellte Karte landet **am Ende** ihrer Spalte (nicht an der alten Stelle) – bei Bedarf `archivedFrom` auch für Karten merken.
- Nach „Wiederherstellen“ einer Spalte steht die ältere Meldung „Spalte … archiviert – Rückgängig“ noch kurz da; ihr Rückgängig setzt den Stand **vor** dem Archivieren (also wie Wiederherstellen) – harmlos, aber doppelt.
- WIP-Limit (`Sh.overWip`) zählt archivierte Karten noch mit (Anzeige-Zähler nicht) – bei K4/K13 angleichen.
- Fortschritt des Projekts zählt archivierte Karten als erledigt (war schon so).
- „Mitnehmen“ der Kopieren-Leiste: Bildschirmleser hört die Legende einmal (sichtbarer Text ist `aria-hidden`).
- Uhrzeit-Feld ist das System-Feld `<input type="time">` (wie das Datum daneben) – falls Enrico es im dunklen Pad stört: eigene Räder aus `RemindPicker` (`Wheel`) nehmen.
- Kartenfenster im Projekt-Modus ist schmal: Kopf-Aktionen brechen um; Checklisten-Zeilen brechen jetzt um (`li:has(.ccl__item)`).
- `device_commit_files` wurde in V121 nicht gebraucht (alles per device_bash im Repo).

## Commit-Text V121 (e-sources)

**Summary:** `V121: Kanban wie Trello – Spalten archivieren/kopieren, Karten kopieren/archivieren, Archiv, Kartenvorlagen, mehrere Checklisten, Uhrzeit an „fällig“`

**Description:**
```
- F-231 K3: bis 20 Spalten; Spalte archivieren und aus dem Archiv wiederherstellen, Spalte kopieren (Karten als Kopien), alle Karten auch in ein anderes Sheet; Trello: archivierte Listen ↔ archivierte Spalten
- F-231 K1: Karte kopieren (Taste K, Auswahl was mitkommt, hier oder in ein anderes Sheet), archivieren (Taste C), Archiv des Boards mit Suche/Wiederherstellen/endgültig löschen, Karte oben anlegen, Kartenvorlagen („Karte aus Vorlage …“)
- F-231 K5: Uhrzeit an „fällig“ (auch Entwurf, Trello due, MS Project Deadline), Zeichen gelb bald / rot überfällig / grün erledigt mit Text, Vorschlag „Erinnern 1 Tag vorher“
- F-231 K2: mehrere benannte Checklisten im Kartenfenster mit Balken, Punkt mit @Person und Termin, Punkt hinzufügen/löschen, Erledigte ausblenden, Checklisten übernehmen von …; Trello checkItems due/idMember hin und zurück
- workspace/kanbanMore.ts + Test (13), workspace/checklists.ts + Test (3), components/KanbanMore.tsx, components/CardChecklists.tsx, Symbol archive, Hilfe, Handbuch V121, Lastenheft F-231, APP_VERSION V121, Übergabe V121

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q7ezRQRuwpi34CBkwD
```
