# Übergabe V119 → V120 E-Sources

Stand: 26.11.2026 · Chat V119 · Nächster Chat: **V120 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V120 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-230** (Absätze „Entschieden V118“, „Gebaut V118“ und **„Gebaut V119“**) und **F-227** (Handbuch). Entscheidungs-Doc **F-230** https://claude.ai/artifact/G7tBqH9dJ3MR2WCAjSLLcj ist entschieden (Option C; PDF `docs/Arbeitspakete/F-230_V118_Import-Export.pdf`). **Termin Fr 04.12.2026**, Enricos Testphase ab 07.12. Leitlinien: **Rangfolge 1. IPMA ICB4, 2. Funktionen von MS Project/iTaskX/Trello, 3. unsere Sicht und Verbesserungen**, Design und Anordnung an unsere UX/UI angepasst, **Funktion vor Design**, NF-08. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V119_…` gelten weiter. **Handbuch** `docs/Handbuch/E-Sources_Handbuch.md` bei jeder Änderung mitführen. **Zuerst:** Liegen Enricos **Prüfdateien** (MS Project-XML, iTaskX-XML, Trello-JSON – F9) im Projektordner (vereinbart: `docs/Arbeitspakete/Pruefdateien/`, gitignore)? In V119 lagen sie nirgends unter `Projects/` – dann Rundlauf je Datei (Import → Export → Import) prüfen und nachbessern. Sonst „Nächste Schritte“ ab 2 **bauen**.

**Tests** (VM ist nach jedem Chat leer – neu anlegen; **neu: trello**):
```
mkdir -p $HOME/vt2/node_modules/vitest && cp $HOME/mnt/Projects/e-sources/docs/uebergaben/vitest-ersatz.js $HOME/vt2/node_modules/vitest/index.js
cat > $HOME/vt2/run.sh <<'EOS'
cd $HOME/mnt/Projects/e-sources/web
rm -rf $HOME/vt2/out
npx tsc --outDir $HOME/vt2/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node src/workspace/*.ts >/dev/null 2>&1
for t in ${TESTS:-workspace persons stage noteSources gpm wheelOrder calendar resources deskProject mspdi trello}; do echo "== $t"; NODE_PATH=$HOME/vt2/node_modules:$PWD/node_modules node $HOME/vt2/out/$t.test.js 2>&1 | tail -3; done
EOS
bash $HOME/vt2/run.sh
```
(`TESTS=trello bash $HOME/vt2/run.sh` führt nur einzelne Tests aus.)

**Browser:** Enrico startet `npm run dev` in `web/`; der eingebaute Browser erreicht **http://localhost:2910/** (in V119 zuverlässig, über `browser_repl`). Eigener Speicher, Enricos Chrome bleibt unberührt. Dateien lassen sich im Browser ohne Dateidialog laden: `DataTransfer` + `new File([...])` auf `.dpj input[type=file]` setzen und `change` auslösen.

## Was in V119 passiert ist

`npx tsc --noEmit -p .` sauber. Tests: workspace 526, persons 18, stage 4, noteSources 1, gpm 44, wheelOrder 5, calendar 5, resources 2, deskProject 6, mspdi 6, **trello 6** (neu) – alle grün.

1. **Prüfdateien (F9):** im ganzen Ordner `Projects/` (auch gitignore-Ordner) keine MS-Project-, iTaskX- oder Trello-Datei gefunden → Enrico gebeten, sie nach `docs/Arbeitspakete/Pruefdateien/` zu legen. Rundlauf mit echten Dateien steht noch aus.
2. **F-230 Bauplan 5 Trello gebaut** (`workspace/trello.ts`, Einzelheiten im Lastenheft „Gebaut V119“): Import Board-JSON → neues Projekt + Kanban-Sheet (Listen → Spalten, Karten → Vorgänge, Checklisten → Checkliste im Text „### ☑ Name“, Labels → Tags, Mitglieder → Personen mit F5-Rückfrage), alles Übrige in `foreign.trello`; Export zurück mit denselben Ids/pos/Feldern, eigener Abschnitt `eSources` (Notiz + `sent`) für das, was Trello nicht kennt.
3. **Oberfläche:** „Exportieren …“ (Steckbrief und ⋮ am Desk) fragt am Ort „Exportieren für …“ – MS Project/iTaskX (XML) | Trello (JSON), vorgewählt nach Herkunft, Esc bricht ab. „Importieren …“ nimmt .xml und .json. Nach Trello-Import öffnet der eigene Desk das Kanban-Sheet gleich in einem Pad (`deskOwn` mit `sheet`). **Im Browser geprüft:** Formatwahl, Trello-Export mit Meldung am Ort, Trello-Import zweier Probe-Boards (Projekt, Desk, Pad mit Spalten).
4. **Fehler behoben:** Rückfragen am Desk-⋮ (`.pjx__ask` in `.brand`) waren unlesbar – Knöpfe mit Deckkraft 0 und Text mit durchsichtiger Füllung aus dem Logo. Betraf auch V118 „Personen zusammenführen“ am Desk.
5. Hilfe „Import und Export (MS Project, iTaskX, Trello)“, Begriff, Tour „Projekte“ (Schritt Import und Export), Handbuch V119 (7.3), Lastenheft, `APP_VERSION = 'V119'`.
6. Kleine Punkte F-191 / R6 / Tour „Feedback“: geprüft, dass es reine Browser-Prüfungen sind (Tour „Feedback“ ist seit V104 gebaut) → in die Prüfliste.

**Im eingebauten Browser angelegt (nur dort, nicht in Enricos Chrome):** Projekte „Probe-Board V119“ und „Probe-Board B“ mit eigenen Desks – dürfen gelöscht werden.

## Nächste Schritte

1. **Prüfung F-230 mit Enricos Dateien (F9)** sobald sie da sind: je Datei Rundlauf, abweichendes nachbessern, je Datei ein Test (nur Erwartungen ins Repo).
2. **Trello sichtbar machen:** Kommentare und Anhänge aus Trello in der Notiz anzeigen (heute nur mitgeführt – `foreign.trello.comments`, `attachments`), z. B. Abschnitt „Aus Trello“ in der Notiz, nur lesen.
3. **Meldung nach Import:** Der Wechsel auf den neuen Desk ersetzt die Import-Meldung mit „Rückgängig“ (schon in V118) – Meldung samt Rückgängig auf dem neuen Desk zeigen, Rückgängig entfernt auch den Desk.
4. Kanban im Projekt-Modus (Rad „Ansicht“ … · Kanban: Kanban-Sheet des Projekts) – Trello-Funktion im Projekt-Desk.
5. Danach (F7): CSV/Excel und iCal.
6. **Prüfliste für Enrico** (alles aus V77–V118 plus):
   - Seite neu laden, dann `npm test` in `web/`.
   - ⋮ neben dem Desk-Namen (gebundener Desk) › „Exportieren …“ → am ⋮ erscheint „Exportieren für …“ mit zwei Knöpfen, gut lesbar; Esc → „Export abgebrochen.“
   - „Trello (JSON)“ → `ColorGentlemen.trello.json` im Download-Ordner; Meldung am Ort.
   - In Trello ein Board › Menü „Drucken, Exportieren und Teilen“ › „Als JSON exportieren“ → in E-Sources „Importieren …“ → neues Projekt, eigener Desk, Kanban-Pad mit den Listen; Karten mit Fälligkeit, Checkliste (☑), Tags, Personen. Gibt es Mitglieder schon → Rückfrage am Ort (lesbar).
   - Dasselbe Projekt wieder als Trello-JSON exportieren und die Datei erneut importieren → gleiche Karten, Spalten, Checklisten.
   - MS-Project-/iTaskX-Prüfpunkte aus V118 (Export öffnen, XML importieren, wieder exportieren).
   - F-191: Dialoge mit Einstellungen haben einen sichtbaren Abschluss (Übernehmen/Fertig) – besonders neue Stellen seit V100 (Steckbrief, Kalender, Formulare, Import).
   - R6: im Cockpit ein Rad durch Nutzung umsortieren lassen → Hinweis erscheint einmal.
   - Tour „Feedback“ (Suche „Tour Feedback“ bzw. Knopf im Cockpit „Feedback“) einmal durchgehen.

## Kleine Punkte (neu in V119)

- **`device_commit_files` direkt nach `Write`** kann noch die alte Fassung übertragen (Datei „braucht ein paar Sekunden“). Nach dem Übertragen mit `grep` auf dem Gerät prüfen; sonst erneut übertragen.
- **Checklisten-Format:** `joinText(desc, lists)` / `splitText(text, title?)` in `trello.ts`. Aufgaben-Zeilen ohne „☑“-Überschrift werden beim Export Checkliste „Checkliste“. Führende Überschrift mit dem Titel (Kanban-Karten speichern den Titel als „# Titel“ im Text, `title` leer) fällt aus der Beschreibung.
- **Karten vs. Gruppen:** `cardsOf` – Vorgänge ohne Unter-Vorgänge im Projekt sind Karten, die übrigen gehen in `eSources.notes` und als Label an ihre Karten.
- **`sent`-Abgleich:** Beim Import gilt für Name, Text, Termine, Liste/Zustand, Labels, Mitglieder die eigene Notiz nur, wenn der Wert in der Datei gleich dem gesendeten ist – sonst gewinnt die Datei.
- **Ids:** neue Trello-Ids aus `idMaker(now)` (24 Hex, Zeit + Zähler); Spalten importierter Listen heißen `tl-<Listen-Id>`.
- Kanban-Sheets haben höchstens 8 Spalten (`COLUMN_MAX`); Karten aus weiteren Listen behalten `idList` in den Fremddaten.
- `.pjx__ask` setzt `-webkit-text-fill-color: currentColor` und `.help__run { opacity: 1 }` – nötig in `.brand` (Logo-Bereich mit Verlaufsschrift).

## Commit-Text V119 (e-sources)

**Summary:** `V119: Import/Export für Trello (Board-JSON ohne Verlust, Kanban-Sheet, Checklisten, Labels, Mitglieder), Formatwahl beim Export, Rückfragen am Desk lesbar`

**Description:**
```
- F-230 Bauplan 5 (Trello, F3): Import einer Board-JSON als neues Projekt mit Kanban-Sheet – Listen → Spalten, Karten → Vorgänge (Text, fällig, nicht vor, erledigt, Archiv), Checklisten → Checkliste im Text, Labels → Tags, Mitglieder → Personen mit Rückfrage am Ort; Kommentare, Anhänge und alles Übrige mitgeführt
- Export als Trello-JSON mit denselben Ids, pos und Feldern; eigener Abschnitt eSources (Gliederung, Vorgänger, Dauer, Aufwand, Basisplan) kommt beim Import zurück, Änderungen anderer Anwendungen gehen vor
- „Exportieren …“ fragt am Ort nach dem Format (MS Project/iTaskX oder Trello), „Importieren …“ erkennt XML/JSON; nach Trello-Import öffnet der eigene Desk das Kanban-Sheet im Pad
- Behoben: Rückfragen am Desk-⋮ waren unlesbar (Knöpfe und Text im Logo-Bereich durchsichtig)
- Hilfe, Begriff, Tour „Projekte“, Handbuch V119 (7.3), Lastenheft, Tests trello, Übergabe V119

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q6wM9CkRy5egcnTy2D
```
