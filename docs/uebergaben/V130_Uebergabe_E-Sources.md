# Übergabe V130 → V131 E-Sources

Stand: 27.11.2026 · Chat V130 · Nächster Chat: **V131 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V131 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-231** (Absätze „Entschieden V128“ = K10 Butler B1–B9, „Gebaut V129“ = K10a Regel-Baukasten, **„Gebaut V130“** = K10b Knöpfe), **F-218** (Verweise V129/V130) und **F-227** (Handbuch). Entscheidungs-Doc **K10** https://claude.ai/artifact/Q3XCPgmGiUY6kgnANv4c29 (PDF `docs/Arbeitspakete/F-231_V128_K10_Butler.pdf`, Text mit `pdftotext -layout` – Ziel in `$HOME`, nicht `/tmp`). **Nächstes Paket: K10c Zeitplan/Fälligkeit/wiederkehrend (B5, B6):** Kalender-Befehle („jeden Montag …“, „am 1. jedes Monats …“) und Fälligkeits-Befehle („2 Tage vor fällig …“) als neue Auslöser im selben Baukasten (`ruleKit.ts` `TRIGS`, Satz in `ruleText.ts`/`KIT_TEXT`); **wiederkehrende Karten = neue Karte je Termin aus einer Vorlage** (Kartenvorlagen K1 `Note.template`, `KM.cardFromTemplate`; wie MS Project „periodischer Vorgang“, ICB4), „dieselbe Karte“ (fällig +n, wieder öffnen) bleibt als Aktion; **verpasste Termine beim Start einmal nachholen** (je Regel die letzte Wiederholung), Meldung am Ort, **feste Kennung aus Regel + Datum** gegen Doppel auf zwei Geräten (Abgleich). Auslöser „regelmäßig“ und `runCheck` (App: 30 s nach Start, stündlich → `ruleSweep`) gibt es schon; Ausführung wie Knöpfe/Regeln über `act` in `ruleRun.ts`, ganze Kette ein Rückgängig. Danach K10d Beobachten (Gist, Glocke „Neuigkeiten“) – eigener Chat; danach K14 Eingang, F-230 F7. Enricos Testphase ab 07.12., Termin Fr 04.12. Leitlinien: **Rangfolge 1. IPMA ICB4, 2. Funktionen von MS Project/iTaskX/Trello, 3. unsere Sicht und Verbesserungen**, Design und Anordnung an unsere UX/UI angepasst, **Funktion vor Design**, NF-08, **F-231: unser Kanban ist mindestens so leistungsfähig wie Trello**. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V130_…` gelten weiter. **Handbuch** `docs/Handbuch/E-Sources_Handbuch.md` bei jeder Änderung mitführen. **Prüfdateien (F9: MS Project, iTaskX, Trello) bringt Enrico erst in seiner Testphase ab 07.12. – bis dahin nicht danach suchen.** **Dashboards** zählen Anforderungen wie Dashboard V127 über die Vermerke der F-/NF-Einträge im Lastenheft (F-231 bleibt ◐; Vermerk jetzt „… K10a V129, K10b V130“). Jedes Paket mit Hilfe, Begriff, Handbuch, Test und Trello-Import/Export (F-230).

**Tests** (VM ist nach jedem Chat leer – neu anlegen; **neu: buttons**):
```
mkdir -p $HOME/vt2/node_modules/vitest && cp $HOME/mnt/Projects/e-sources/docs/uebergaben/vitest-ersatz.js $HOME/vt2/node_modules/vitest/index.js
cat > $HOME/vt2/run.sh <<'EOS'
cd $HOME/mnt/Projects/e-sources/web
rm -rf $HOME/vt2/out
npx tsc --outDir $HOME/vt2/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node src/workspace/*.ts >/dev/null 2>&1
for t in ${TESTS:-workspace persons stage noteSources gpm wheelOrder calendar resources deskProject mspdi trello projectKanban kanbanMore checklists tags kanbanViews comments kanbanTimeline covers cardFields columnLook mirrors stars ruleKit buttons}; do echo "== $t"; NODE_PATH=$HOME/vt2/node_modules:$PWD/node_modules node $HOME/vt2/out/$t.test.js 2>&1 | tail -3; done
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

**Browser-Hinweise (V130):** Die Begrüßung blieb im Test stehen (auch nach 15 s) – per `page.evaluate` den Knopf in `section.greeting` mit „schließen“ im `aria-label` klicken. Knopf anlegen: „Automatisierung (n)“ unten im Board bzw. Kopf-Knopf „Knöpfe“ › „Knöpfe verwalten …“ → `.rkit__panel` › „Karten-Knopf“/„Board-Knopf“; im Editor `getByLabel('Art')`, `getByLabel('Wirkt auf')`, Aktionen wie bei den Regeln. Taste `b` auf `[data-card]` öffnet `.kbtn__bar`, Ziffer drückt; Kartenfenster-Abschnitt `.cardwin__buttons` mit eigener Meldung.

## Was in V130 passiert ist

`npx tsc --noEmit -p .` sauber. Tests: workspace 526, persons 18, stage 4, noteSources 1, gpm 44, wheelOrder 5, calendar 5, resources 2, deskProject 6, mspdi 6, trello 10, projectKanban 3, kanbanMore 13, checklists 3, tags 9, kanbanViews 5, comments 3, kanbanTimeline 6, covers 6, cardFields 9, columnLook 5, mirrors 6, stars 4, ruleKit 9, **buttons 4** – alle grün.

1. **K10b Datenmodell** in `workspace/ruleKit.ts`: `KitButton {id, name, kind: 'card'|'board', board?, col?, then[≤10]}` in `Workspace.ruleSet.buttons` (Dateiformat bleibt 13, `parseButtons`/`cleanButton` in `parseRuleSet`; `withSet` in `ruleSet.ts` behält `buttons`). Ops `saveButton`, `copyButton`, `removeButton`/`restoreButton`, `moveButton` (nur unter gleicher Art – Reihenfolge = Ziffern), `buttonsFor`, `missingButton`, `newButton`, `buttonLabel` („Knopf · Name“), `BUTTONS_MAX = 60`, `ASK_FROM = 10`.
2. **Ausführung** `pressButton(ws, b, ids, view, now, token?)` in `workspace/ruleRun.ts`: Schein-Regel mit `board = view`, dieselbe `act` (neuer Parameter `label` für die Spur), dann `chain` mit den eingeschalteten Regeln ab Stufe 1; Bericht `RuleRun` mit `view`, `note`, `token`. Ändert der Knopf nichts → derselbe Stand (Bauteile melden „nichts zu ändern“). Nebenbei: `toCol` tut nichts, wenn die Karte schon in der Spalte liegt (bzw. oben bei „oben“). `KIT_TEXT.ran` nennt „Knopf · X (+ Regel R1 · …)“ und „keine Karte“.
3. **Reducer** `useWorkspace.ts`: `btnSave`, `btnCopy`, `btnRemove`, `btnRestore`, `btnMove`, `btnPress` – alle in `NO_RULES` (die Kette läuft im Knopf).
4. **Oberfläche** `components/CardButtons.tsx`: `ButtonBar` (Leiste wie V/K/M, Taste **B** = Karten-Knöpfe, **Umschalt+B** bzw. Kopf-Knopf **„Knöpfe (n)“ neben Filter** = Board-Knöpfe, Ziffer 1–9, Pfeile, Esc; Board-Knöpfe auf sichtbare Karten = Suche + „Nur meine“ + Filter, nicht archiviert, keine Vorlagen, ggf. nur Spalte gleichen Namens; **Nachfrage am Ort ab 10 Karten**; „Knöpfe verwalten …“) und `CardButtons` (Abschnitt im Kartenfenster über neues `extra2` von `CardWindow`; meldet seinen Lauf selbst über `token` + `claimRun`, das Board meldet die übrigen). Verwaltung in `RuleKit.tsx` › neuer Teil `ButtonKit` unter den Regeln, `RuleEditor` mit Prop `button` (ohne Auslöser/Bedingungen, mit „Art“ und „Wirkt auf“, Vorschau „So liest sich der Knopf“, Satz `buttonSentence` in `ruleText.ts`). Fokus nach „Knöpfe verwalten …“ auf „+ Karten-Knopf“ (`focusManage` mit Wiederholung). CSS `.kbtn*`, Symbol `button`.
5. Klein: Texte `BTN_TEXT`, Tastenhilfe `cardKeys` (B, Umschalt+B), Hilfe und Begriff `kitButtons`, Handbuch V130 (Kapitel 5, Änderungsverzeichnis), Lastenheft F-231 „Gebaut V130“ + Vermerk, F-218 Verweis, `APP_VERSION = 'V130'`.

**Im Browser geprüft (V130):** Projekt + Kanban (Alpha, Beta) im Testmodus; Kopf-Knopf „Knöpfe“ → Leiste „Board-Knopf für …“ → „Knöpfe verwalten …“ setzt den Fokus auf „+ Karten-Knopf“; Karten-Knopf „An Abnahme“ (Spalte „In Arbeit“, Tag „geprüft“) mit richtigem Satz; Taste B auf Alpha → Leiste „1 An Abnahme“, Ziffer 1 → Karte in „In Arbeit“ mit Tag, Meldung am Board „Knopf · An Abnahme: 1 Karte geändert. · Rückgängig“, Fokus bleibt auf der Karte, Rückgängig stellt beides zurück; Board-Knopf „Alle dringend“ → „2 Karten geändert“; Kartenfenster-Abschnitt „Knöpfe“ drückt und meldet im Abschnitt (nicht doppelt am Board); keine Fehler in der Konsole. **Nicht im Browser geprüft:** Nachfrage ab 10 Karten, Board-Knopf mit Spalte, Kette über einen Knopf (Unit-Test deckt es), Cockpit „Regeln“ › Notizen › Knöpfe, Umschalt+B, ↑/↓ und Ziffern-Reihenfolge.

## Nächste Schritte

1. **K10c** wie oben (Startanweisung), dann K10d, K14.
2. **Prüfung F-230 mit Enricos Dateien (F9)** erst in der Testphase ab 07.12.
3. **Prüfliste für Enrico** (alles aus V77–V129 plus):
   - Seite neu laden, dann `npm test` in `web/` (neu: `buttons.test.ts`).
   - Am Board „Automatisierung (n)“ › Abschnitt „Knöpfe“ › „+ Karten-Knopf“: „An Abnahme“ = Spalte „Prüfen“, Zuständigen setzen, „fällig“ heute + 3 → Satz unten stimmt; Speichern.
   - Karte fokussieren, **B**, dann **1** → Meldung am Board, „Rückgängig“ nimmt alles zurück; Spur der Karte nennt „Knopf · An Abnahme“.
   - Kartenfenster öffnen → Abschnitt „Knöpfe“ → Knopf drücken → Meldung im Abschnitt.
   - „+ Board-Knopf“ „Erledigtes archivieren“, Wirkt auf „Erledigt“, Aktion archivieren → Kopf-Knopf „Knöpfe (1)“ bzw. Umschalt+B → archiviert nur die sichtbaren Karten dieser Spalte; mit 10 und mehr Karten fragt die Leiste „Ausführen?“.
   - Mit einer Regel (z. B. „Wenn Karte in Spalte „Prüfen“ kommt, dann Kommentar …“): Knopf drücken → Meldung „Knopf · … (+ Regel R1 · …)“, ein Rückgängig für alles.
   - Knopf zweimal drücken, wenn schon alles stimmt → „nichts zu ändern“.
   - Cockpit „Regeln“ › Notizen: Abschnitt „Knöpfe“ zeigt alle Knöpfe; ↑/↓ ändert die Ziffern in der Leiste.
   - Tastatur: Leiste mit Pfeilen, Ziffern, Esc (Fokus zurück auf die Karte bzw. den Kopf-Knopf).

## Kleine Punkte (neu in V130)

- Board-Knöpfe kennen keine Bedingungen (Trello: „für jede Karte in Liste … mit Label …“) – heute über Filter oben erreichbar; bei Bedarf Bedingungen wie bei den Regeln im Knopf-Editor zulassen.
- Taste B/Umschalt+B nur auf einer Karte im Board; in Tabelle, Kalender und Zeitleiste geht der Kopf-Knopf „Knöpfe“ (Board-Knöpfe) und das Kartenfenster (Karten-Knöpfe).
- Knöpfe ab Nr. 10 haben keine Ziffer (nur Klick/Pfeile) – wie im Doc (1–9).
- Kopf-Knopf „Knöpfe“ sieht aus wie „Filter“ (`sheet__filterbtn`); im schmalen Projekt-Modus wird der Kopf voller.
- „Nichts zu ändern“ und „keine sichtbare Karte“ ohne Rückgängig (es gibt nichts zurückzunehmen).
- Ein Knopf, der nur „Meldung zeigen“ enthält, erzeugt einen neuen Stand (flache Kopie, damit der Bericht hängt) – harmlos, aber ein Speichervorgang.
- Knopf für ein gelöschtes Board bleibt stehen (Name „?“) – wie bei den Regeln.
- Board-Vorlagen nehmen Knöpfe noch nicht mit (wie Regeln, siehe V129).
- Kein Tour-Schritt (wie K1–K12, K10a).
- Trello: Butler-Knöpfe stehen nicht im Board-JSON – Import/Export unverändert (Prüfung mit F9 ab 07.12.).

### Aus V129 weiter offen

- Meldung eines Regel-Laufs steht nur so lange wie A1 (Werk 2 s) – für längere Sätze evtl. länger (`noticeLater` Faktor) oder Regel-Meldungen bis Klick.
- Board-Vorlagen nehmen Regeln (und seit V130 Knöpfe) noch nicht mit (Doc „Was später davon abhängt“) – beim Speichern einer Vorlage Regeln dieses Boards mitnehmen, beim Anlegen kopieren.
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

## Commit-Text V130 (e-sources)

**Summary:** `V130: Kanban wie Trello – Karten- und Board-Knöpfe (K10b)`

**Description:**
```
- F-231 K10b: Knöpfe wie Trello Butler – Name + Folge von Aktionen aus dem Regel-Wortschatz, erst auf Klick
- Karten-Knöpfe im Kartenfenster (Abschnitt „Knöpfe“) und Taste B mit Ziffern 1–9; Board-Knöpfe im Sheet-Kopf neben Filter (Umschalt+B), auf sichtbare Karten oder eine Spalte, Nachfrage ab 10 Karten
- Datenmodell ruleSet.buttons (Dateiformat 13), Ausführung pressButton in ruleRun.ts: Spur „Knopf · Name“, ausgelöste Regeln als Kette, alles ein Rückgängig mit Meldung am Ort
- Verwaltung im Regel-Baukasten (Abschnitt „Knöpfe“, Satz-Editor im Knopf-Modus); toCol verschiebt nicht mehr, wenn die Karte schon dort liegt
- Hilfe und Begriff kitButtons, Symbol button, Handbuch V130, Lastenheft F-231 „Gebaut V130“, Tests buttons (4), APP_VERSION V130, Übergabe V130

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q3RsmgiNvLwjHTCzhU
```
