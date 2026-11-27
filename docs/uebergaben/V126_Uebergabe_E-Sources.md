# Übergabe V126 → V127 E-Sources

Stand: 27.11.2026 · Chat V126 · Nächster Chat: **V127 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V127 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-231** (Absätze „Entschieden V120“, „Gebaut V120“–„Gebaut V126“) und **F-227** (Handbuch). Entscheidungs-Doc **F-231** https://claude.ai/artifact/KRcgsUzDgbzphj6rP9tKUV ist **entschieden** (PDF `docs/Arbeitspakete/F-231_V120_Kanban-wie-Trello.pdf`, Text mit `pdftotext -layout` – Ziel in `$HOME`, nicht `/tmp`). **Vor dem Termin Fr 04.12.2026 fertig (K1–K5, K7, K13), danach dazu K6 Titelbild (V124), K8 eigene Felder/Abstimmen (V125) und K11 Spaltenfarbe/Einklappen (V126).** Enricos Testphase ab 07.12. Leitlinien: **Rangfolge 1. IPMA ICB4, 2. Funktionen von MS Project/iTaskX/Trello, 3. unsere Sicht und Verbesserungen**, Design und Anordnung an unsere UX/UI angepasst, **Funktion vor Design**, NF-08, **F-231: unser Kanban ist mindestens so leistungsfähig wie Trello**. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V126_…` gelten weiter. **Handbuch** `docs/Handbuch/E-Sources_Handbuch.md` bei jeder Änderung mitführen. **Prüfdateien (F9: MS Project, iTaskX, Trello) bringt Enrico erst in seiner Testphase ab 07.12. – bis dahin nicht danach suchen.** Nächste Pakete nach Enricos Wahl, Vorschlag: **K9 Spiegelkarten** → K10 Butler → K12 Stern / K14 Eingang; F-230 F7 (CSV/Excel, iCal). Jedes Paket mit Hilfe, Begriff, Handbuch, Test und Trello-Import/Export (F-230).

**Tests** (VM ist nach jedem Chat leer – neu anlegen; **neu: columnLook**):
```
mkdir -p $HOME/vt2/node_modules/vitest && cp $HOME/mnt/Projects/e-sources/docs/uebergaben/vitest-ersatz.js $HOME/vt2/node_modules/vitest/index.js
cat > $HOME/vt2/run.sh <<'EOS'
cd $HOME/mnt/Projects/e-sources/web
rm -rf $HOME/vt2/out
npx tsc --outDir $HOME/vt2/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node src/workspace/*.ts >/dev/null 2>&1
for t in ${TESTS:-workspace persons stage noteSources gpm wheelOrder calendar resources deskProject mspdi trello projectKanban kanbanMore checklists tags kanbanViews comments kanbanTimeline covers cardFields columnLook}; do echo "== $t"; NODE_PATH=$HOME/vt2/node_modules:$PWD/node_modules node $HOME/vt2/out/$t.test.js 2>&1 | tail -3; done
EOS
bash $HOME/vt2/run.sh
```

**Neue Dateien anlegen:** Lange neue Dateien im Container schreiben (Write nach `/mnt/user-data/outputs/…`) und mit `device_commit_files` ins Repo legen; Änderungen an bestehenden Dateien per `device_bash` + Python (`str.replace` mit `assert`). **Achtung (V123, V125 bestätigt):** `device_commit_files` legte mehrmals die **vorige** Fassung ab (auch mit `force`). Neue Dateien daher **direkt im Repo** anlegen (`device_bash` mit `cat > … <<'EOF'`) bzw. nach jedem Commit mit `grep` prüfen.

**Browser:** Enrico startet `npm run dev` in `web/`; der eingebaute Browser erreicht **http://localhost:2910/** über `browser_repl`. **Kleine Ausgabe beim Öffnen:** `browser.tabs.create("http://localhost:2910/package.json")`, dann `browser.show()` und `tab.page.setViewportSize({ width: 1400, height: 900 })`, dann `tab.page.goto("http://localhost:2910/?test=voll")`. **Die Begrüßung oben rechts fängt Klicks ab** – in V123 blieb sie teils stehen (Fokus/Zeiger darin hält sie an): `section.greeting` › Knopf „Begrüßung schließen“ klicken oder warten. Im Testmodus: Knopf „Projekt“ (Text `^\s*Projekt$`, der letzte) → Name tippen (Feld hat den Fokus), Enter → „Kanban-Board anlegen“ → `[data-add]` klicken, Titel tippen, Enter, Esc. Termine am schnellsten über Rad „Ansicht“ › Tabelle (`.ktab input[type=date]` mit `fill`). **Rad-Wechsel brauchen ~0,7 s** je Raste (`ArrowDown` am `slider` „Ansicht“, dann warten, dann nächste Raste). Jeder Hot Reload löscht die Testdaten. Ziehen der Zeitleisten-Balken geht mit `tab.drag` in Bildpunkten (vorher `tab.screenshot()`, Bild ist halb so breit wie 1400); HTML5-Ziehen (Kalender, „Ohne Datum“) mit `DragEvent` + `DataTransfer` per `page.evaluate`.

**Browser-Hinweise (V124):** Rad „Größe“ im Kartenfenster: Klick oder Fokus + Pfeil hoch/runter (je ~0,9 s warten). Bild hochladen im Test: Canvas → `File` → `DataTransfer` an `.cardwin__cover input[type=file]`, `change` auslösen. Der Tooltip der Karte verdeckt nach dem Schließen des Kartenfensters die Spalte – vorher `tab.hover` woanders hin.

**Browser-Hinweise (V125):** Im Felder-Panel Locator auf `section.kfld` eingrenzen (es gibt mehrere Knöpfe „Anlegen“). Kartenfenster-Felder: `.cardwin__fields` › `getByLabel(/^Punkte – /)`. Taste S auf einer Karte (`[data-card]` fokussieren) stimmt ab, sobald „Abstimmen“ unten im Board an ist.

## Was in V126 passiert ist

`npx tsc --noEmit -p .` sauber. Tests: workspace 526, persons 18, stage 4, noteSources 1, gpm 44, wheelOrder 5, calendar 5, resources 2, deskProject 6, mspdi 6, trello 10, projectKanban 3, kanbanMore 13, checklists 3, tags 9, kanbanViews 5, comments 3, kanbanTimeline 6, covers 6, cardFields 9, **columnLook 5** – alle grün.

Enrico hat das Paket wieder offen gelassen („Als Nächstes baue: ___“); gebaut wurde der Vorschlag: **K11 Spaltenfarbe und Spalte einklappen**.

1. **Entscheidung Farbliste:** Das Doc nannte „Spaltenfarbe aus unseren Akzentfarben“. Gebaut sind die **zehn Trello-Listenfarben** (gleich `TAG_COLORS`, Töne aus unserer Tag-Palette) – Rangfolge Trello vor eigener Sicht, und nur so geht der Trello-Rundlauf ohne Verlust (Trello hat genau zehn Listenfarben). Falls Enrico doch Akzentfarben will: zusätzliche Farben nur bei uns, Export dann `null`.
2. **Datenmodell:** `NoteColumn.color` (Trello-Farb-Id), `TemplateColumn.color`; `SheetPref.folded` (Spalten-Ids, je Sheet und Gerät; Trello: Einklappen ist persönlich und nicht in der Datei); `ColSummary.color`.
3. **Logik** `workspace/columnLook.ts`: `COL_COLORS` (feste Liste, kein Ring-Import), `isColColor`, `colHex/colInk/colColorName`, `setColColor` (auch archivierte Spalten; Unbekanntes ändert nichts), `parseColColor`, `cleanFolded`, `toggleFolded`, `foldOthers`, `canFold` (eine Spalte bleibt offen), Trello `colorFromTrello`/`colorToTrello`. Laden in `notes.parseNoteViews` (Spalten und archivierte Spalten), `boardTemplates` (aus Board, neues Board, Datei), `kanbanMore.copyColumn`, `sheets.boardSummary`. Aktion `colColor`.
4. **Oberfläche** (`KanbanSheet.tsx`): Knopf mit zwei Pfeilen im Spaltenkopf (`data-foldbtn`); ⋮ › „Farbe …“ (Seite mit zehn Farben samt Farbfeld und Häkchen, „Ohne Farbe“), „Spalte einklappen“, „Alle anderen einklappen“, „Alle Spalten ausklappen“ (nur wenn etwas eingeklappt ist). Meldung mit Rückgängig **in der Spalte** (eigene `useNotice` + `colNoteAt`). Spalte mit Farbe: `has-color`, CSS-Variablen `--kcol-color/--kcol-ink`, Rand oben 3 px, Ton 16 %; `aria-label` nennt „Farbe Grün“. Eingeklappt: `section.kcol--folded` 40 px mit Knopf `data-fold` (Ausklappen-Symbol, Zähler, WIP-„!“, Name senkrecht, Bedeutung) und leerem `data-colbody` (Ziel beim Ziehen, Pfeil-Navigation); liegt eine aufgenommene Karte darin, wird die Spalte offen gezeigt. `focusAdd`, Pfeil-Nachbarn und BC2-Sprung aus dem Cockpit fallen auf `[data-fold]` zurück. Mini-Board im Cockpit zeigt den Farbrand.
5. **Trello:** `lists[].color` ↔ Spaltenfarbe (offene und archivierte Listen); Export schreibt `color` nur, wenn Trello das Feld kannte (`null` = ohne) oder die Spalte eine Farbe hat; unbekannte Farben fallen weg. Rundlauf-Test.
6. Klein: Texte `COL_LOOK_TEXT`, Hinweis „Spalte kopieren“ nennt die Farbe, Begriffe `colFold`, `colColor`, Hilfe `kanbanColumns`, Symbole `fold`, `unfold`; Handbuch V126 (Kapitel 5 und 7.3, Änderungsverzeichnis); Lastenheft F-231 „Gebaut V126“; `APP_VERSION = 'V126'`.

**Im Browser geprüft (Testmodus, Projekt-Board „Farben“, 2 Karten):** Farbe Grün über ⋮ › Farbe …, Meldung in der Spalte, Blau → Rückgängig → wieder Grün; „In Arbeit“ eingeklappt (Streifen mit Zähler, Ansage „eingeklappt, 0 Karten“); Pfeil → von der Karte landet auf dem Streifen; Karte mit Leertaste + → in die eingeklappte Spalte – Spalte öffnet sich, nach Enter wieder Streifen mit „1 Karte“; Enter auf dem Streifen klappt aus, Fokus auf den Einklapp-Knopf; „Alle anderen einklappen“ → zwei Streifen, Einklapp-Knopf der letzten offenen Spalte gesperrt. Keine Konsolenfehler. **Nicht im Browser geprüft:** Ziehen mit der Maus auf einen Streifen, Mini-Board im Cockpit, helle Designs, Board-Vorlage mit Farbe (nur Test), Neuladen (nur Test), Trello mit echter Datei (Testphase).

**Browser-Hinweise (V126):** Spaltenmenü über `getByRole('button', { name: /Aktionen/ })` in der Spalte; Farben sind `menuitemcheckbox`. Meldungen am Ort verschwinden nach wenigen Sekunden – „Rückgängig“ im selben Skript klicken. Die gesperrte Einklapp-Taste (`aria-disabled`) lässt sich im Test nicht klicken (für Nutzer meldet sie „Eine Spalte bleibt offen“).

Ältere Browser-Hinweise (V123–V125) stehen in `V125_Uebergabe_E-Sources.md`.

## Nächste Schritte

1. Enricos Wahl für die nächsten Pakete (Vorschlag oben: K9).
2. **Prüfung F-230 mit Enricos Dateien (F9)** erst in der Testphase ab 07.12.
3. **Prüfliste für Enrico** (alles aus V77–V125 plus):
   - Seite neu laden, dann `npm test` in `web/` (neu: `columnLook.test.ts`).
   - ⋮ einer Spalte › Farbe … › z. B. Grün → Rand und Ton; Rückgängig in der Spalte; „Ohne Farbe“. Helles Design ansehen.
   - Spalte kopieren → Kopie hat die Farbe; Board als Vorlage speichern, neues Board daraus → Farben da.
   - Notizen-Cockpit: Mini-Board zeigt den Farbrand.
   - Knopf mit den zwei Pfeilen im Spaltenkopf → Streifen; Klick/Enter klappt aus; Karte mit der Maus auf einen Streifen ziehen; ⋮ › „Alle anderen einklappen“, „Alle Spalten ausklappen“; Seite neu laden → eingeklappt bleibt (nur dieses Gerät).
   - Testphase: Trello-Board mit Listenfarben importieren, Farben ändern, exportieren, in Trello prüfen.

## Kleine Punkte (neu in V126)

- Farbliste = Trello-Farben, nicht die Akzentfarben aus dem Doc (siehe oben, bei Bedarf ergänzen).
- Tabelle, Kalender und Zeitleiste zeigen die Spaltenfarbe noch nicht (Trello-Tabelle zeigt die Liste mit Farbe) – Farbfeld vor dem Spaltennamen in der Zeile wäre klein.
- Kein Tastenkürzel zum Einklappen (Trello hat auch keins); Weg: Pfeiltasten bis zum Kopf-Knopf bzw. ⋮.
- Eingeklappter Streifen hat kein eigenes ⋮ (wie Trello) – erst ausklappen.
- Gesperrter Einklapp-Knopf (letzte offene Spalte) meldet beim Klick „Eine Spalte bleibt offen“; Bildschirmleser hören `aria-disabled`.
- Kein Tour-Schritt (wie K1–K8).

### Aus V125 weiter offen

- Felder-Panel ist im schmalen Projekt-Modus eng (Zeilen umbrechen); im Pad breit genug.
- Felder lassen sich in der Tabelle nur ansehen, nicht ändern (Trello-Tabelle erlaubt Bearbeiten) – bei Bedarf Eingaben wie im Kartenfenster in die Zellen.
- Datum-Feld ohne Uhrzeit (Trello-Datum hat eine; sie bleibt beim Rundlauf, solange der Tag gleich ist; neue Daten gehen mit 12:00 UTC).
- Stimmen nur für „mich“ (wie Trello); Stimmen anderer kommen über Abgleich oder Trello-Import.
- Stimmen führen keinen Spur-Eintrag (wie Trello); Werte der Felder schon („bearbeitet“).
- Felder gelten je Board; wird eine Karte in ein anderes Board kopiert oder verschoben, bleiben ihre Werte an der Notiz, das andere Board zeigt sie nicht (keine Zuordnung über Feldnamen).
- Kennzahlen zählen noch nicht nach Feldern/Stimmen (Trello-Dashboard kann nach Custom Fields gruppieren) – bei Bedarf Kachel „je Wahl“.
- Kein Tour-Schritt (wie K1–K7).

### Aus V124 weiter offen

- Titelbild klein sitzt im Titel-Knopf neben dem Erledigt-Kreis, nicht randlos oben über der ganzen Karte wie bei Trello (Design).
- Ganzflächig zeigt die Karte weiter Tags und Zeichen (Trello blendet sie aus) – bewusst, damit nichts verloren geht; auf hellen Farben sind Zeichen dunkel, auf Bildern hell.
- Hochgeladene Titelbilder liegen nur auf dem Gerät und werden nicht abgeglichen (wie alle Bilder, F-215 B1); ein anderes Gerät zeigt nichts. Trello bekommt für eigene Bilder ein leeres Cover.
- Bild-Cover aus Trello werden nicht geladen (Netz, Anmeldung) – die Karte zeigt dann kein Titelbild, das Kartenfenster sagt dazu noch nichts („Bild-Cover aus Trello, nur dort sichtbar“ wäre ein kleiner Hinweis).
- Titelbild erscheint nicht in Tabelle, Kalender, Zeitleiste und beim gezogenen Karten-Geist.
- Wahl in der Radiogruppe mit Pfeiltasten setzt bei jedem Schritt das Titelbild (native Radios) – jede Stufe meldet sich am Ort; bei Bedarf erst mit Leertaste übernehmen.
- Kein Tour-Schritt für das Titelbild (frühere K-Pakete hatten auch keinen) – bei Bedarf in der Kanban-Tour ergänzen.

### Aus V123 weiter offen

- Monatsname im Zeitleisten-Kopf wird links von der Namensspalte abgeschnitten, wenn der Monat vor dem sichtbaren Bereich beginnt („ember 2026“) – Monatsnamen sticky machen (Design).
- Im Projekt-Board ohne Vorgänger zeigt `ganttOf` alle Karten als „kritisch“ (jede Karte ohne Puffer) – im Test sahen alle drei rot unterstrichen aus. Prüfen, ob `criticalOf` nur Ketten mit Vorgängern zeigen soll oder das so stimmt (ICB4: Vorgang ohne Puffer ist kritisch).
- Zeitleiste im schmalen Projekt-Modus eng (Namensspalte 210 px fest) – bei Bedarf Breite ziehbar machen.
- Zeitleisten-Ziehen ist Zeiger-Ziehen (geht auf Touch), „Ohne Datum“ → Zeitachse ist HTML5 (Touch nicht; dort Alt+→ bzw. Kartenfenster).
- Kennzahlen-Klick **ersetzt** den Filter (statt zu ergänzen) – so ist klar, was man sieht; ggf. Umschalt+Klick = ergänzen.
- Zeitleiste/Kalender ändern bei einem offenen Entwurf mit Terminen die Notiz, angezeigt wird der Entwurf (wie V122).
- Alter offener Karten zählt ab dem Anlegen, nicht ab „in Arbeit“ (Kanban Guide: ab Beginn der Arbeit) – genauer ab dem ersten Wechsel in eine Spalte mit Zustand „in Arbeit“ (Spur `state`), wenn gewünscht.
- Aus V122 weiter offen: Rad „Zeitraum“ im Kalender nicht gemerkt; Spalte wechseln in der Tabelle sagt „verschoben“ trotz offener WIP-Nachfrage; Erwähnungen benachrichtigen niemanden; Filter-/Tag-Panel im schmalen Projekt-Modus eng; wiederhergestellte Karte am Ende der Spalte; doppelte Meldung nach Spalte-Wiederherstellen; Kopieren-Leiste Legende; Uhrzeit-Feld als System-Feld.


## Commit-Text V126 (e-sources)

**Summary:** `V126: Kanban wie Trello – Spaltenfarbe und Spalte einklappen (K11)`

**Description:**
```
- F-231 K11: Spaltenfarbe aus den zehn Trello-Listenfarben (⋮ › Farbe …, Rand und Ton, Meldung mit Rückgängig in der Spalte); Kopie, Archiv, Board-Vorlage und Mini-Board im Cockpit behalten bzw. zeigen die Farbe
- Spalte einklappen zum Streifen mit Name, Zähler, WIP-Hinweis und Bedeutung; Knopf im Spaltenkopf, Klick/Enter klappt aus, Pfeiltasten erreichen den Streifen; „Alle anderen einklappen“, „Alle Spalten ausklappen“; persönlich je Board und Gerät wie bei Trello; eine Spalte bleibt offen; aufgenommene Karte öffnet die Spalte
- Trello: lists[].color ↔ Spaltenfarbe (auch archivierte Listen, null = ohne)
- workspace/columnLook.ts + Test (columnLook 5), Hilfe kanbanColumns, Begriffe, Symbole fold/unfold, Handbuch V126, Lastenheft F-231, APP_VERSION V126, Übergabe V126

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q55ykT94MW7UX3X6mo
```
