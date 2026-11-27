# Übergabe V128 → V129 E-Sources

Stand: 27.11.2026 · Chat V128 · Nächster Chat: **V129 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V129 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-231** (Absätze „Entschieden V120“, „Gebaut V120“–„Gebaut V128“, **„Entschieden V128“ = K10 Butler, B1–B9**), **F-218** (RG1–RG8, Gebaut V91/V92, Verweis V128) und **F-227** (Handbuch). Entscheidungs-Doc **K10** https://claude.ai/artifact/Q3XCPgmGiUY6kgnANv4c29 ist **entschieden** (alle Vorschläge; PDF `docs/Arbeitspakete/F-231_V128_K10_Butler.pdf`, Text mit `pdftotext -layout` – Ziel in `$HOME`, nicht `/tmp`). Entscheidungs-Doc F-231 (V120) https://claude.ai/artifact/KRcgsUzDgbzphj6rP9tKUV gilt weiter. **Nächstes Paket: K10a Regel-Baukasten** (B1–B4, B9): Datenmodell Regel (Auslöser, bis 5 Bedingungen, bis 10 Aktionen, Board oder „alle Kanbans“) in `Workspace.ruleSet` (Dateiformat +1, abgeglichen), Ausführung im Reducer neben `Sh.applyWhenRules` (Ketten bis 3 Stufen, jede Regel einmal je Änderung, ganze Kette = ein Rückgängig mit Meldung am Ort, Spur „Regel R3 · Name“), Umzug W1–W4 zu mitgelieferten Bausteinregeln (Ein/Aus bleibt), Satz-Editor „Wenn … und … dann …“ im Cockpit „Regeln“ (Gruppe Notizen) und am Board ⋮ › „Automatisierung“ (dieselbe Liste gefiltert), Spiegel-Boards: Spalten-Regeln ja, Zustand nur Heimat (A3). Danach K10b Knöpfe (Kartenfenster + Taste **B**, Board-Knöpfe im Sheet-Kopf), K10c Zeitplan/Fälligkeit/wiederkehrend (neue Karte je Termin, beim Start einmal nachholen, feste Kennung Regel + Datum), K10d Beobachten (Gist, Glocke „Neuigkeiten“) – je Teil ein Chat; danach K14 Eingang, F-230 F7. Enricos Testphase ab 07.12. Leitlinien: **Rangfolge 1. IPMA ICB4, 2. Funktionen von MS Project/iTaskX/Trello, 3. unsere Sicht und Verbesserungen**, Design und Anordnung an unsere UX/UI angepasst, **Funktion vor Design**, NF-08, **F-231: unser Kanban ist mindestens so leistungsfähig wie Trello**. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V128_…` gelten weiter. **Handbuch** `docs/Handbuch/E-Sources_Handbuch.md` bei jeder Änderung mitführen. **Prüfdateien (F9: MS Project, iTaskX, Trello) bringt Enrico erst in seiner Testphase ab 07.12. – bis dahin nicht danach suchen.** **Dashboards** zählen Anforderungen wie Dashboard V127: Vermerke der F-/NF-Einträge im Lastenheft (V127: 71 von 148 fertig, 23 teilweise). Jedes Paket mit Hilfe, Begriff, Handbuch, Test und Trello-Import/Export (F-230).

**Tests** (VM ist nach jedem Chat leer – neu anlegen; **neu: stars**):
```
mkdir -p $HOME/vt2/node_modules/vitest && cp $HOME/mnt/Projects/e-sources/docs/uebergaben/vitest-ersatz.js $HOME/vt2/node_modules/vitest/index.js
cat > $HOME/vt2/run.sh <<'EOS'
cd $HOME/mnt/Projects/e-sources/web
rm -rf $HOME/vt2/out
npx tsc --outDir $HOME/vt2/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node src/workspace/*.ts >/dev/null 2>&1
for t in ${TESTS:-workspace persons stage noteSources gpm wheelOrder calendar resources deskProject mspdi trello projectKanban kanbanMore checklists tags kanbanViews comments kanbanTimeline covers cardFields columnLook mirrors stars}; do echo "== $t"; NODE_PATH=$HOME/vt2/node_modules:$PWD/node_modules node $HOME/vt2/out/$t.test.js 2>&1 | tail -3; done
EOS
bash $HOME/vt2/run.sh
```




**Neue Dateien anlegen:** direkt im Repo mit `device_bash` (`cat > … <<'EOF'`), Änderungen an bestehenden Dateien per `device_bash` + Python (`str.replace` mit `assert`). `device_commit_files` legte mehrmals die vorige Fassung ab (V123, V125) – meiden. **`npx tsc --noEmit -p .` braucht bis ~170 s** – mit `timeout 170` und `timeout_ms: 180000` aufrufen, sonst bricht der Aufruf ab.

**Browser:** Enrico startet `npm run dev` in `web/`; der eingebaute Browser erreicht **http://localhost:2910/** über `browser_repl`. **Kleine Ausgabe beim Öffnen:** `browser.tabs.create("http://localhost:2910/package.json")`, dann `browser.show()` und `tab.page.setViewportSize({ width: 1400, height: 900 })`, dann `tab.page.goto("http://localhost:2910/?test=voll")`. **Die Begrüßung oben rechts fängt Klicks ab** – in V123 blieb sie teils stehen (Fokus/Zeiger darin hält sie an): `section.greeting` › Knopf „Begrüßung schließen“ klicken oder warten. Im Testmodus: Knopf „Projekt“ (Text `^\s*Projekt$`, der letzte) → Name tippen (Feld hat den Fokus), Enter → „Kanban-Board anlegen“ → `[data-add]` klicken, Titel tippen, Enter, Esc. Termine am schnellsten über Rad „Ansicht“ › Tabelle (`.ktab input[type=date]` mit `fill`). **Rad-Wechsel brauchen ~0,7 s** je Raste (`ArrowDown` am `slider` „Ansicht“, dann warten, dann nächste Raste). Jeder Hot Reload löscht die Testdaten. Ziehen der Zeitleisten-Balken geht mit `tab.drag` in Bildpunkten (vorher `tab.screenshot()`, Bild ist halb so breit wie 1400); HTML5-Ziehen (Kalender, „Ohne Datum“) mit `DragEvent` + `DataTransfer` per `page.evaluate`.

**Browser-Hinweise (V124):** Rad „Größe“ im Kartenfenster: Klick oder Fokus + Pfeil hoch/runter (je ~0,9 s warten). Bild hochladen im Test: Canvas → `File` → `DataTransfer` an `.cardwin__cover input[type=file]`, `change` auslösen. Der Tooltip der Karte verdeckt nach dem Schließen des Kartenfensters die Spalte – vorher `tab.hover` woanders hin.

**Browser-Hinweise (V125):** Im Felder-Panel Locator auf `section.kfld` eingrenzen (es gibt mehrere Knöpfe „Anlegen“). Kartenfenster-Felder: `.cardwin__fields` › `getByLabel(/^Punkte – /)`. Taste S auf einer Karte (`[data-card]` fokussieren) stimmt ab, sobald „Abstimmen“ unten im Board an ist.

**Browser-Hinweise (V126):** Spaltenmenü über `getByRole('button', { name: /Aktionen/ })` in der Spalte; Farben sind `menuitemcheckbox`. Meldungen am Ort verschwinden nach wenigen Sekunden – „Rückgängig“ im selben Skript klicken. Die gesperrte Einklapp-Taste (`aria-disabled`) lässt sich im Test nicht klicken (für Nutzer meldet sie „Eine Spalte bleibt offen“).

**Browser-Hinweise (V127):** Spiegeln mit Taste `m` auf einer fokussierten Karte (`[data-card]`), dann Knopf mit dem Board-Namen in `.sheet__move`. Zweites Kanban im Testmodus nötig (zweites Projekt oder Kanban-Sheet über „+ Sheet“). Kartenfenster-Abschnitt: `.cardwin__mirrors`.

**Browser-Hinweise (V128):** Pad im Testmodus: Menü „Notizen & Aufgaben“ › „Neues Pad“. Der Pad-Kopf ist schmal – Knopf „Pad-Kopf: n weitere Elemente“ öffnet die ganze Leiste, dann „Pad-Optionen“. Das Menü öffnet unten und liegt teils unter dem Pad (Zeiger-Klick wird abgefangen) – Eintrag mit `focus()` + Enter auslösen. Stern am Reiter: `.pad__tabstar`, Meldung `.padfoot__hint`.

## Was in V128 passiert ist

`npx tsc --noEmit -p .` sauber. Tests: workspace 526, persons 18, stage 4, noteSources 1, gpm 44, wheelOrder 5, calendar 5, resources 2, deskProject 6, mspdi 6, trello 10, projectKanban 3, kanbanMore 13, checklists 3, tags 9, kanbanViews 5, comments 3, kanbanTimeline 6, covers 6, cardFields 9, columnLook 5, mirrors 6, **stars 4** – alle grün.

1. **K10 Butler: Entscheidungs-Doc** „F-231 V128 – K10 Butler“ (Optionen Baukasten, Wortschatz Auslöser/Bedingungen/Aktionen, Knöpfe, wiederkehrende Karten, Beobachten, Abhängigkeiten, Fragen B1–B9). Enrico: „Wir gehen nach deinen Vorschlägen vor.“ → alle B1–B9 wie Vorschlag, im Lastenheft F-231 „Entschieden V128“ und Verweis in F-218; PDF unter `docs/Arbeitspakete/`.
2. **K12 Stern für Sheets** (wie Trello „Board markieren“, alle Sheet-Arten nach NF-08): `NoteView.star` (geladen in `parseNoteViews`, abgeglichen), `workspace/stars.ts` (`isStarred`, `setStar`, `starredViews`, `starFirst`, `openStarred`) + Test; Aktionen `sheetStar`, `padStarOpen`.
3. **Oberfläche:** Pad-Optionen ⋮ › „Mit Stern“ (Schalter, Meldung am Ort unten im Pad); Stern am Reiter (`.pad__tabstar`, angesagt „, mit Stern“) und in der Sheet-Zeile im Cockpit „Notizen“; „+ Sheet“-Menü › „Mit Stern …“ (Seite mit allen Sternen nach Namen außer denen im Pad; öffnet hier, wechselt zu einem offenen Pad, bei vollem Pad neues Pad; ohne Sterne gesperrt mit Erklärung); `Sh.moveTargets` und `mirrorTargets` mit Sternen zuerst, `components/StarMark.tsx` hinter dem Namen in V-, K-, M-Leiste und „Alle Karten verschieben … in ein anderes Sheet“.
4. Klein: Texte `STAR_TEXT`, Begriff und Hilfe `sheetStar` (Symbol `star` in `HELP_ICON`), Handbuch V128 (Kapitel 5, Änderungsverzeichnis), Lastenheft F-231 „Gebaut V128“, `APP_VERSION = 'V128'`.

**Im Browser geprüft (V128):** Stern über Pad-Optionen setzen → Meldung „„Notizblock“ hat jetzt einen Stern.“ unten im Pad, gelber Stern am Reiter, Ansage „, mit Stern“. Nicht im Browser geprüft: Seite „Mit Stern …“, Sterne in den Ziel-Leisten und im Cockpit (Unit-Tests decken die Logik).

## Nächste Schritte

1. **K10a** wie oben (Startanweisung), dann K10b–K10d, K14.
2. **Prüfung F-230 mit Enricos Dateien (F9)** erst in der Testphase ab 07.12.
3. **Prüfliste für Enrico** (alles aus V77–V127 plus):
   - Seite neu laden, dann `npm test` in `web/` (neu: `stars.test.ts`).
   - Pad-Optionen ⋮ › „Mit Stern“ → Stern am Reiter, Meldung unten im Pad; noch einmal → Stern weg.
   - Zwei Pads mit mehreren Sheets, Sterne an zwei Sheets; im anderen Pad „+ Sheet“ › „Mit Stern …“: Sheet öffnet hier; ein Sheet, das schon in einem anderen Pad liegt, holt jenes Pad nach vorn; volles Pad → neues Pad.
   - Taste V, K, M auf einer Karte und Spalten-⋮ › „Alle Karten verschieben …“: Boards mit Stern stehen vorn mit Stern.
   - Cockpit „Notizen“: Sheet-Zeile zeigt den Stern.

## Kleine Punkte (neu in V128)

- Pad-Optionen ⋮ öffnet aus dem Überlauf des schmalen Pad-Kopfs nach unten und liegt teils **unter dem Pad** (Klick mit der Maus wird abgefangen; Tastatur geht) – vermutlich schon vor V128 so; Ebene (z-index) des Menüs im Überlauf prüfen.
- Stern-Meldung ohne „Rückgängig“ (Schalter, noch einmal wählen nimmt ihn zurück).
- Reihenfolge der Sterne nach Namen (Trello lässt markierte Boards ziehen) – bei Bedarf eigene Reihenfolge.
- Trello-Stern ist je Mitglied und steht nicht in der Board-Datei; Import/Export lassen den Stern unberührt.
- Suche zeigt Sheets mit Stern noch nicht vorn bzw. ohne Stern-Zeichen – kleiner Nachtrag möglich.
- Kein Tastenkürzel für den Stern (Trello hat keins); Weg über Pad-Optionen.

### Aus V127 weiter offen

- Trello erlaubt „erledigt“ auch am Spiegel; bei uns setzt das die Heimat (Entscheidung T7, Schloss A3). Mit A3 aus geht es wie bei Trello.
- Spiegel-Spalte ist reine Anordnung – ein erledigter Spiegel kann in „Zu tun“ liegen (zeigt aber den Haken). Falls gewünscht: Regel „Spiegel folgt der Heimat-Spalte“ (z. B. als Schalter im Cockpit „Regeln“).
- Beim Trello-Import landen aufgelöste Spiegel am Ende ihrer Spalte; beim Export am Ende ihrer Liste (pos). Die Id einer Trello-Spiegelkarte wird nicht gemerkt – jeder Export gibt ihr eine neue.
- Spiegel einer Notiz desselben Projekts (Heimat auf einem anderen Board) exportiert Trello als normale Karte (sie gehört zum Projekt).
- Mehrere „Heimaten“ aus alten Daten (Notiz vor V127 auf zwei Kanbans) bleiben gleichberechtigt wie bisher – kein Kennzeichen.
- Kein Tastenkürzel bei Trello für Spiegeln; unser M ist neu. Kein Tour-Schritt (wie K1–K11).
- Kennzahlen zählen Spiegel wie eigene Karten des Boards (Trello-Dashboard tut das auch).

### Aus V126 weiter offen

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


## Commit-Text V128 (e-sources)

**Summary:** `V128: K10 Butler entschieden (B1–B9); Kanban wie Trello – Stern für Sheets (K12)`

**Description:**
```
- F-231 K10 Butler: Entscheidungs-Doc (Satz-Baukasten, Wortschatz, Knöpfe, wiederkehrende Karten, Beobachten), entschieden wie Vorschlag B1–B9, Lastenheft F-231 „Entschieden V128“, Verweis F-218
- F-231 K12: Stern für Sheets wie Trello „Board markieren“ – Pad-Optionen › „Mit Stern“, Stern am Reiter und im Cockpit „Notizen“
- „+ Sheet“ › „Mit Stern …“ öffnet Sheets mit Stern (hier, im offenen Pad oder in einem neuen Pad)
- Verschieben-, Kopieren- und Spiegeln-Leisten zeigen Sheets mit Stern zuerst
- workspace/stars.ts + Test (stars 4), components/StarMark.tsx, Hilfe und Begriff sheetStar, Handbuch V128, APP_VERSION V128, Übergabe V128

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q5vHrhsPWLeoK8TFJK
```
