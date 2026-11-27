# Übergabe V129 → V130 E-Sources

Stand: 27.11.2026 · Chat V129 · Nächster Chat: **V130 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V130 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-231** (Absätze „Entschieden V128“ = K10 Butler B1–B9 und **„Gebaut V129“** = K10a Regel-Baukasten), **F-218** (Verweis V129) und **F-227** (Handbuch). Entscheidungs-Doc **K10** https://claude.ai/artifact/Q3XCPgmGiUY6kgnANv4c29 (PDF `docs/Arbeitspakete/F-231_V128_K10_Butler.pdf`, Text mit `pdftotext -layout` – Ziel in `$HOME`, nicht `/tmp`). **Nächstes Paket: K10b Knöpfe (B7):** Karten-Knöpfe = Name + Folge von Aktionen aus demselben Wortschatz (`ruleKit.ts` `ACTS`, Ausführung über `ruleRun.ts` – dort `act`/`runOn` wiederverwenden, Spur „Knopf · Name“, ganze Folge + ausgelöste Ketten = ein Rückgängig mit Meldung am Ort); im Kartenfenster neuer Abschnitt „Knöpfe“, Taste **B** auf einer Karte öffnet eine Leiste wie V/K/M, Ziffer 1–9 löst aus; Board-Knöpfe im Sheet-Kopf neben Filter, wirken auf alle sichtbaren Karten (Filter beachtet) oder eine Spalte, Nachfrage am Ort ab 10 Karten; Datenmodell in `Workspace.ruleSet` (z. B. `buttons`, Dateiformat bleibt 13, weil `ruleSet` neu in 13 – beim Lesen prüfen wie `parseRules`); Verwaltung im selben Bauteil `RuleKit` (Abschnitt „Knöpfe“, Editor = Satz-Editor ohne Auslöser/Bedingungen, gleicher Aufbau NF-08). Danach K10c Zeitplan/Fälligkeit/wiederkehrend (neue Karte je Termin aus Vorlage, beim Start einmal nachholen, feste Kennung Regel + Datum; Auslöser „regelmäßig“ und `runCheck` gibt es schon), K10d Beobachten (Gist, Glocke „Neuigkeiten“) – je Teil ein Chat; danach K14 Eingang, F-230 F7. Enricos Testphase ab 07.12., Termin Fr 04.12. Leitlinien: **Rangfolge 1. IPMA ICB4, 2. Funktionen von MS Project/iTaskX/Trello, 3. unsere Sicht und Verbesserungen**, Design und Anordnung an unsere UX/UI angepasst, **Funktion vor Design**, NF-08, **F-231: unser Kanban ist mindestens so leistungsfähig wie Trello**. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V129_…` gelten weiter. **Handbuch** `docs/Handbuch/E-Sources_Handbuch.md` bei jeder Änderung mitführen. **Prüfdateien (F9: MS Project, iTaskX, Trello) bringt Enrico erst in seiner Testphase ab 07.12. – bis dahin nicht danach suchen.** **Dashboards** zählen Anforderungen wie Dashboard V127 über die Vermerke der F-/NF-Einträge im Lastenheft (F-231 bleibt ◐, K10a als „Gebaut V129“ vermerkt). Jedes Paket mit Hilfe, Begriff, Handbuch, Test und Trello-Import/Export (F-230).

**Tests** (VM ist nach jedem Chat leer – neu anlegen; **neu: ruleKit**):
```
mkdir -p $HOME/vt2/node_modules/vitest && cp $HOME/mnt/Projects/e-sources/docs/uebergaben/vitest-ersatz.js $HOME/vt2/node_modules/vitest/index.js
cat > $HOME/vt2/run.sh <<'EOS'
cd $HOME/mnt/Projects/e-sources/web
rm -rf $HOME/vt2/out
npx tsc --outDir $HOME/vt2/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node src/workspace/*.ts >/dev/null 2>&1
for t in ${TESTS:-workspace persons stage noteSources gpm wheelOrder calendar resources deskProject mspdi trello projectKanban kanbanMore checklists tags kanbanViews comments kanbanTimeline covers cardFields columnLook mirrors stars ruleKit}; do echo "== $t"; NODE_PATH=$HOME/vt2/node_modules:$PWD/node_modules node $HOME/vt2/out/$t.test.js 2>&1 | tail -3; done
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

**Browser-Hinweise (V129):** Im Projekt-Modus (Testmodus) ist das Board schmal – Karte erledigen geht am sichersten mit Fokus auf `[data-card]` + **Strg+Enter** (der Erledigt-Kreis ist im Locator nicht per Name zu finden). Knopf „Automatisierung (n)“ unten im Board öffnet `section.rkit__panel`; im Editor `.rkit__edit` die Knöpfe „Bedingung“/„Aktion“ mit `exact: true` suchen (es gibt „Aktion nach oben (1)“ usw.); Auswahlen heißen „Auslöser“, „Bedingung 1“, „Aktion 1“ …, Lücken „Aktion 1: Tag setzen“ usw. Meldungen am Ort verschwinden nach 2 s (A1) – „Rückgängig“ im selben Skript klicken.

## Was in V129 passiert ist

`npx tsc --noEmit -p .` sauber. Tests: workspace 526, persons 18, stage 4, noteSources 1, gpm 44, wheelOrder 5, calendar 5, resources 2, deskProject 6, mspdi 6, trello 10, projectKanban 3, kanbanMore 13, checklists 3, tags 9, kanbanViews 5, comments 3, kanbanTimeline 6, covers 6, cardFields 9, columnLook 5, mirrors 6, stars 4, **ruleKit 9** – alle grün.

1. **K10a Datenmodell** `workspace/ruleKit.ts`: Regel `{id, no, name, on, board?, when, ifs[≤5], then[≤10], w?}`, Bausteine `{k, a?, b?, n?, not?}`; Wortschatz `TRIGS` (16), `CONDS` (13), `ACTS` (27) mit Lücken-Art (`ArgKind`); Spalten, Tags und Felder über den **Namen** (wie Butler). In `Workspace.ruleSet.rules`, **`FILE_VERSION = 13`**. Umzug: ohne `rules` gelten `builtIn(w)` W1–W4 mit Ein/Aus aus `when` (`RS.whenOn`/`setWhen` laufen darüber, alte Tests unverändert grün); erstes Speichern legt die Liste an. Ops `saveRule`, `setOn`, `copyRule`, `removeRule`/`restoreRule` (mitgelieferte nicht löschbar), `resetBuiltIn`, `moveRule`, `missingOf`, `blank`, `newRule`, `rulesFor`, `parseRules`/`cleanRule`.
2. **Ausführung** `workspace/ruleRun.ts`: `eventsOf(prev, next)`, `applyRules` (Reducer statt `Sh.applyWhenRules`; `NO_RULES` = remote, replace, exchange, layoutUndo, sheetRestore, noteUndoDiscard, tplRestore, ruleSweep, kit*, ruleWhen, ruleSwitch), Ketten bis `CHAIN_MAX = 3`, jede Regel einmal je Änderung, Bericht `runOf(ws)` (WeakMap: `before`, `names`, `cards`, `view`, `note`, `texts`, `cut`), `carryRun` (Reducer räumt danach Fenster auf), `claimRun`/`isClaimed` (Board meldet am Ort, sonst App per Flash), `runCheck` für Auslöser „regelmäßig“ (App: 30 s nach Start, stündlich → Aktion `ruleSweep`). Spiegel A3: Zustands-Auslöser mit Board nur auf dem Heimat-Board. Kartenvorlagen ausgenommen. Platzhalter `{heute}`, `{titel}`.
3. **Satz** `workspace/ruleText.ts` (`sentenceOf`, `scopeText`), Texte `KIT_TEXT` in `terms.ts` (Auswahl-Namen und Satzteile).
4. **Oberfläche** `components/RuleKit.tsx` (Liste + Satz-Editor am Ort, native Auswahlen/Felder, Datalists für Spalten/Tags, Vorschau-Satz `aria-live`, Fehler mit Stelle, Esc bricht ab, Meldungen mit Rückgängig an der Zeile): Cockpit „Regeln“ › Notizen ersetzt den Block W1–W4; am Board Pad ⋮ › „Automatisierung …“ (Ereignis `esource:kanbanrules`) und Knopf „Automatisierung (n)“ unten im Board → Panel `rkit__panel`, gefiltert. KanbanSheet meldet Läufe am Ort mit „Rückgängig“ (ganze Kette). CSS `.rkit*`.
5. Klein: Hilfe und Begriff `ruleKit` (Symbol `rules`), Handbuch V129 (Kapitel 5, Änderungsverzeichnis), Lastenheft F-231 „Gebaut V129“, F-218 Verweis, `APP_VERSION = 'V129'`.

**Im Browser geprüft (V129):** Projekt + Kanban im Testmodus, „Automatisierung (0)“ öffnet das Panel mit W1–W4 und Sätzen, „Neue Regel“ → Name, Spalte „Erledigt“, drei Aktionen (Tag, ich zuständig, Kommentar mit {heute}) → Vorschau-Satz stimmt, gespeichert mit Meldung „angelegt und eingeschaltet · Rückgängig“; Karte mit Strg+Enter erledigt → Meldung am Board „Regel R1 · Fertig markieren: 1 Karte geändert. · Rückgängig“; keine Fehler in der Konsole. Nicht im Browser geprüft: Rückgängig der Kette (Unit-Test deckt es), Cockpit „Regeln“ › Notizen, Ketten, Spiegel, Flash-Meldung außerhalb eines Boards.

## Nächste Schritte

1. **K10b** wie oben (Startanweisung), dann K10c, K10d, K14.
2. **Prüfung F-230 mit Enricos Dateien (F9)** erst in der Testphase ab 07.12.
3. **Prüfliste für Enrico** (alles aus V77–V128 plus):
   - Seite neu laden, dann `npm test` in `web/` (neu: `ruleKit.test.ts`).
   - Cockpit „Regeln“ › Notizen: W1–W4 stehen als Sätze mit „mitgeliefert“; früher eingeschaltete sind weiter an.
   - Am Board „Automatisierung (n)“ bzw. Pad ⋮ › „Automatisierung …“: „Neue Regel“ – Wenn Karte kommt in Spalte „Erledigt“, dann Tag „fertig“ setzen und mich zuständig machen; Karte nach „Erledigt“ ziehen → Meldung am Board, „Rückgängig“ nimmt Tag und Zuständigen zurück, die Karte bleibt in „Erledigt“.
   - Kette: Regel 2 „Wenn Tag „fertig“ gesetzt wird, dann Kommentar …“ – läuft mit; Spur der Karte nennt beide Regeln.
   - W3 bearbeiten (14 statt 30 Tage) → „mitgeliefert · geändert“, „Auf Werk zurück“.
   - Regel kopieren (Kopie aus), löschen + Rückgängig, im Cockpit ↑/↓.
   - Tastatur: alles mit Tab erreichbar, Esc bricht den Editor ab, Fokus kehrt zurück.

## Kleine Punkte (neu in V129)

- Meldung eines Regel-Laufs steht nur so lange wie A1 (Werk 2 s) – für längere Sätze evtl. länger (`noticeLater` Faktor) oder Regel-Meldungen bis Klick.
- Board-Vorlagen nehmen Regeln noch nicht mit (Doc „Was später davon abhängt“) – beim Speichern einer Vorlage Regeln dieses Boards mitnehmen, beim Anlegen kopieren.
- Aktion „Checkliste aus Vorlage einfügen“ (Doc-Wortschatz) fehlt noch; ebenso Bedingung „Spiegel/Heimat“.
- Regel für ein gelöschtes Board bleibt stehen (Name „?“ im Satz) – beim Löschen eines Boards fragen oder auf „alle Kanbans“ setzen.
- Bei „alle Kanbans“ lösen Zustands-, Tag-, Termin- und Kommentar-Auslöser auch für Notizen außerhalb von Kanbans aus (z. B. To-do) – wie W1 bisher; ggf. Bedingung „liegt auf einem Kanban“.
- Reihenfolge ↑/↓ nur im Cockpit (gefilterte Liste am Board ohne Pfeile).
- `Sh.applyWhenRules` und `RS.sweep` bleiben nur für alte Tests – bei Gelegenheit entfernen.
- Kein Tour-Schritt (wie K1–K12).
- Trello: Butler-Regeln stehen nicht im Board-JSON – Import/Export unverändert (Prüfung mit F9 ab 07.12.).

### Aus V128 weiter offen

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



## Commit-Text V129 (e-sources)

**Summary:** `V129: Kanban wie Trello – Regel-Baukasten „Wenn … und … dann …“ (K10a)`

**Description:**
```
- F-231 K10a: Regel-Baukasten wie Trello Butler – Auslöser, bis 5 Bedingungen, bis 10 Aktionen, je Board oder alle Kanbans
- Datenmodell workspace/ruleKit.ts in ruleSet.rules (Dateiformat 13), W1–W4 als mitgelieferte Bausteinregeln (Umzug ohne Verlust)
- Ausführung workspace/ruleRun.ts: Ketten bis 3 Stufen, jede Regel einmal je Änderung, ganze Kette = ein Rückgängig mit Meldung am Ort, Spur „Regel R3 · Name“, regelmäßige Regeln beim Start und stündlich
- Satz-Editor components/RuleKit.tsx im Cockpit „Regeln“ (Notizen) und am Board (⋮ › „Automatisierung …“, Knopf unten im Board)
- Hilfe und Begriff ruleKit, Handbuch V129, Lastenheft F-231 „Gebaut V129“, Tests ruleKit (9), APP_VERSION V129, Übergabe V129

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q6KshesBzJnVuUYqJD
```
