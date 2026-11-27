# Übergabe V127 → V128 E-Sources

Stand: 27.11.2026 · Chat V127 · Nächster Chat: **V128 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V128 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-231** (Absätze „Entschieden V120“, „Gebaut V120“–„Gebaut V127“) und **F-227** (Handbuch). Entscheidungs-Doc **F-231** https://claude.ai/artifact/KRcgsUzDgbzphj6rP9tKUV ist **entschieden** (PDF `docs/Arbeitspakete/F-231_V120_Kanban-wie-Trello.pdf`, Text mit `pdftotext -layout` – Ziel in `$HOME`, nicht `/tmp`). **Vor dem Termin Fr 04.12.2026 fertig (K1–K5, K7, K13), danach dazu K6 (V124), K8 (V125), K11 (V126) und K9 Spiegelkarten (V127).** Enricos Testphase ab 07.12. Leitlinien: **Rangfolge 1. IPMA ICB4, 2. Funktionen von MS Project/iTaskX/Trello, 3. unsere Sicht und Verbesserungen**, Design und Anordnung an unsere UX/UI angepasst, **Funktion vor Design**, NF-08, **F-231: unser Kanban ist mindestens so leistungsfähig wie Trello**. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V127_…` gelten weiter. **Handbuch** `docs/Handbuch/E-Sources_Handbuch.md` bei jeder Änderung mitführen. **Prüfdateien (F9: MS Project, iTaskX, Trello) bringt Enrico erst in seiner Testphase ab 07.12. – bis dahin nicht danach suchen.** Nächste Pakete nach Enricos Wahl, Vorschlag: **K10 Butler** (groß: eigene Regeln, Karten-/Board-Knöpfe, wiederkehrende Karten, Beobachten) → K12 Stern / K14 Eingang; F-230 F7 (CSV/Excel, iCal). K10 ist groß – vorher kurz prüfen, ob ein Entscheidungs-Doc nötig ist (Aufbau Regel-Baukasten, F-218 RG3/RG4). Jedes Paket mit Hilfe, Begriff, Handbuch, Test und Trello-Import/Export (F-230).

**Tests** (VM ist nach jedem Chat leer – neu anlegen; **neu: mirrors**):
```
mkdir -p $HOME/vt2/node_modules/vitest && cp $HOME/mnt/Projects/e-sources/docs/uebergaben/vitest-ersatz.js $HOME/vt2/node_modules/vitest/index.js
cat > $HOME/vt2/run.sh <<'EOS'
cd $HOME/mnt/Projects/e-sources/web
rm -rf $HOME/vt2/out
npx tsc --outDir $HOME/vt2/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node src/workspace/*.ts >/dev/null 2>&1
for t in ${TESTS:-workspace persons stage noteSources gpm wheelOrder calendar resources deskProject mspdi trello projectKanban kanbanMore checklists tags kanbanViews comments kanbanTimeline covers cardFields columnLook mirrors}; do echo "== $t"; NODE_PATH=$HOME/vt2/node_modules:$PWD/node_modules node $HOME/vt2/out/$t.test.js 2>&1 | tail -3; done
EOS
bash $HOME/vt2/run.sh
```



**Neue Dateien anlegen:** direkt im Repo mit `device_bash` (`cat > … <<'EOF'`), Änderungen an bestehenden Dateien per `device_bash` + Python (`str.replace` mit `assert`). `device_commit_files` legte mehrmals die vorige Fassung ab (V123, V125) – meiden. **`npx tsc --noEmit -p .` braucht bis ~170 s** – mit `timeout 170` und `timeout_ms: 180000` aufrufen, sonst bricht der Aufruf ab.

**Browser:** Enrico startet `npm run dev` in `web/`; der eingebaute Browser erreicht **http://localhost:2910/** über `browser_repl`. **Kleine Ausgabe beim Öffnen:** `browser.tabs.create("http://localhost:2910/package.json")`, dann `browser.show()` und `tab.page.setViewportSize({ width: 1400, height: 900 })`, dann `tab.page.goto("http://localhost:2910/?test=voll")`. **Die Begrüßung oben rechts fängt Klicks ab** – in V123 blieb sie teils stehen (Fokus/Zeiger darin hält sie an): `section.greeting` › Knopf „Begrüßung schließen“ klicken oder warten. Im Testmodus: Knopf „Projekt“ (Text `^\s*Projekt$`, der letzte) → Name tippen (Feld hat den Fokus), Enter → „Kanban-Board anlegen“ → `[data-add]` klicken, Titel tippen, Enter, Esc. Termine am schnellsten über Rad „Ansicht“ › Tabelle (`.ktab input[type=date]` mit `fill`). **Rad-Wechsel brauchen ~0,7 s** je Raste (`ArrowDown` am `slider` „Ansicht“, dann warten, dann nächste Raste). Jeder Hot Reload löscht die Testdaten. Ziehen der Zeitleisten-Balken geht mit `tab.drag` in Bildpunkten (vorher `tab.screenshot()`, Bild ist halb so breit wie 1400); HTML5-Ziehen (Kalender, „Ohne Datum“) mit `DragEvent` + `DataTransfer` per `page.evaluate`.

**Browser-Hinweise (V124):** Rad „Größe“ im Kartenfenster: Klick oder Fokus + Pfeil hoch/runter (je ~0,9 s warten). Bild hochladen im Test: Canvas → `File` → `DataTransfer` an `.cardwin__cover input[type=file]`, `change` auslösen. Der Tooltip der Karte verdeckt nach dem Schließen des Kartenfensters die Spalte – vorher `tab.hover` woanders hin.

**Browser-Hinweise (V125):** Im Felder-Panel Locator auf `section.kfld` eingrenzen (es gibt mehrere Knöpfe „Anlegen“). Kartenfenster-Felder: `.cardwin__fields` › `getByLabel(/^Punkte – /)`. Taste S auf einer Karte (`[data-card]` fokussieren) stimmt ab, sobald „Abstimmen“ unten im Board an ist.

**Browser-Hinweise (V126):** Spaltenmenü über `getByRole('button', { name: /Aktionen/ })` in der Spalte; Farben sind `menuitemcheckbox`. Meldungen am Ort verschwinden nach wenigen Sekunden – „Rückgängig“ im selben Skript klicken. Die gesperrte Einklapp-Taste (`aria-disabled`) lässt sich im Test nicht klicken (für Nutzer meldet sie „Eine Spalte bleibt offen“).

**Browser-Hinweise (V127):** Spiegeln mit Taste `m` auf einer fokussierten Karte (`[data-card]`), dann Knopf mit dem Board-Namen in `.sheet__move`. Zweites Kanban im Testmodus nötig (zweites Projekt oder Kanban-Sheet über „+ Sheet“). Kartenfenster-Abschnitt: `.cardwin__mirrors`.

## Was in V127 passiert ist

`npx tsc --noEmit -p .` sauber. Tests: workspace 526, persons 18, stage 4, noteSources 1, gpm 44, wheelOrder 5, calendar 5, resources 2, deskProject 6, mspdi 6, trello 10, projectKanban 3, kanbanMore 13, checklists 3, tags 9, kanbanViews 5, comments 3, kanbanTimeline 6, covers 6, cardFields 9, columnLook 5, **mirrors 6** – alle grün.

Enrico hat das Paket wieder offen gelassen („Als Nächstes baue: ___“); gebaut wurde der Vorschlag: **K9 Spiegelkarten** (T7: Spiegel mit Heimat-Board, Kennzeichen „Spiegel“, Schloss-Regel A3).

1. **Datenmodell:** `NoteView.mirrors` (Note-Ids, die auf diesem Board Spiegel sind). Heimat = Kanban mit der Notiz **ohne** Kennzeichen; `isMirror` gilt nur, wenn es noch eine Heimat gibt – fällt die Heimat weg (Karte entfernt, Board gelöscht), ist der Spiegel von selbst Heimat. Laden in `notes.parseNoteViews` (nur Ids auf dem Board); `without()` nimmt das Kennzeichen mit der Karte heraus.
2. **Logik** `workspace/mirrors.ts`: `homesOf`, `isMirror`, `mirrorBoardsOf`, `homeOf` (mit Spalte), `mirrorTargets`, `mirrorCard` (Spalte passend zum Zustand; Gründe missing/full/already/noHome), `unmirror`, `makeHome`, `carryMark`, `cleanMirrors`; Trello `trelloLinkOf`, `trelloIdsOf`, `noteOfTrelloLink`. `sheets.moveCard` setzt auf Spiegel-Boards keinen Zustand, `syncBoards` lässt Spiegel liegen, `flowsOf` ohne Spiegel-Boards (→ Schloss), `moveToSheet` behält das Kennzeichen; `kanbanMore.restoreCard` aus dem Archiv eines Spiegel-Boards über die Heimat. Aktionen `cardMirror`, `cardUnmirror`, `cardMakeHome`.
3. **Oberfläche** (`components/CardMirrors.tsx`, `KanbanSheet.tsx`): Taste **M** → Leiste „… spiegeln auf …“ (wie V-Leiste, Rückgängig am Ort); Kennzeichen „Spiegel“ (`.kcard__mirror`, gestrichelter linker Rand) auf Karte, in Tabelle und Kalender; Ansage „, Spiegel von Board …“; Erledigt-Kreis im Spiegel → Meldung „erledigt setzt du im Heimat-Board …“ (A3 aus → Haken der Notiz); C auf einem Spiegel und „Archivieren“ im Kartenfenster entfernen nur den Spiegel (Rückgängig legt ihn an dieselbe Stelle); Kartenfenster-Abschnitt „Spiegel“ (neue Prop `extra` an `CardWindow`): Heimat/Spalte, Liste der Spiegel-Boards, „Zum Heimat-Board“ / „Zu …“ (`padOpen`), „Hier zur Heimat machen“, „Spiegel entfernen“, „Spiegeln …“.
4. **Trello:** Karten mit `cardRole: "mirror"` werden beim Import zuletzt verarbeitet; liegt das Original (shortLink aus `foreign.trello`) schon in E-Sources und nicht auf diesem Board → Spiegel, sonst Karte wie bisher (roh mit `cardRole`, geht unverändert zurück). Export: Spiegel anderer Projekte mit Trello-Adresse → `cardRole: "mirror"`, Name = Adresse; ohne Trello-Original weggelassen. Import-Meldung nennt Spiegel (`mirrors:n`, `mirrorsOpen:n`).
5. Klein: Texte `MIRROR_TEXT`, Tastenhilfe „M spiegelt“, Begriff `cardMirror`, Hilfe `cardMirror` (Symbol `mirror` in `HELP_ICON`), Handbuch V127 (Kapitel 5 und 7.3, Änderungsverzeichnis), Lastenheft F-231 „Gebaut V127“, `APP_VERSION = 'V127'`.
6. **Enricos Frage „Warum sind die Ecken der Pads nicht mehr rund?“:** Regel aus V75 `.padlayer.is-notes .pad { border-radius: 0; }` (für ein einzelnes randloses Pad gedacht) galt noch, obwohl der Notizen-Modus seit V90 mehrere Pads mit Abstand kachelt. Regel entfernt – Pads sind im Notizen-Modus wieder rund.

**Nicht im Browser geprüft** (V127 ohne Browser-Blick; Enrico testet ab 07.12.): alles aus K9 und die runden Ecken. Bitte in der Prüfliste.

## Nächste Schritte

1. Enricos Wahl für die nächsten Pakete (Vorschlag oben: K10 Butler, vorher Doc-Frage).
2. **Prüfung F-230 mit Enricos Dateien (F9)** erst in der Testphase ab 07.12.
3. **Prüfliste für Enrico** (alles aus V77–V126 plus):
   - Seite neu laden, dann `npm test` in `web/` (neu: `mirrors.test.ts`).
   - Notizen-Modus: Pads haben wieder runde Ecken (auch das aktive mit Akzentrahmen).
   - Zwei Kanban-Boards anlegen, Karte in Board A, Taste **M** › Board B → Karte erscheint in B mit „Spiegel“, Rückgängig am Ort.
   - In B die Karte in „Erledigt“ ziehen → Zustand bleibt offen; Erledigt-Kreis in B → Meldung „im Heimat-Board“. In A erledigen → Karte in A wandert, in B bleibt sie liegen und zeigt erledigt.
   - Kartenfenster in B: „Zum Heimat-Board“, „Hier zur Heimat machen“ (danach ist A Spiegel), „Spiegel entfernen“; in A: Liste „Gespiegelt auf …“ mit „Zu …“ und „Spiegel auf … entfernen“.
   - C auf dem Spiegel → nur der Spiegel geht, Rückgängig legt ihn an dieselbe Stelle. Karte in A entfernen (Entf) → B wird Heimat (kein Kennzeichen mehr).
   - Tabelle und Kalender in B zeigen „Spiegel“; Bildschirmleser sagt „Spiegel von Board A“.
   - Testphase: zwei Trello-Boards mit Spiegelkarte nacheinander importieren, Meldung lesen, exportieren, in Trello prüfen.

## Kleine Punkte (neu in V127)

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



## Commit-Text V127 (e-sources)

**Summary:** `V127: Kanban wie Trello – Spiegelkarten (K9); Pads im Notizen-Modus wieder rund`

**Description:**
```
- F-231 K9: Spiegelkarten wie Trello – dieselbe Notiz zusätzlich auf einem anderen Kanban (Taste M bzw. Kartenfenster „Spiegel“ › „Spiegeln …“), Kennzeichen „Spiegel“ auf Karte, in Tabelle und Kalender
- Heimat-Board bestimmt den Zustand: Ziehen im Spiegel ändert ihn nicht, Erledigt-Kreis im Spiegel gesperrt (Schloss A3), Heimat zieht nach, Spiegel bleibt liegen
- Kartenfenster: Heimat mit Spalte, Spiegel-Boards, „Zum Heimat-Board“, „Hier zur Heimat machen“, „Spiegel entfernen“; C auf einem Spiegel entfernt nur den Spiegel; Heimat weg → Spiegel wird Heimat
- Trello: cardRole „mirror“ ↔ Spiegel, wenn das Original in E-Sources liegt; Import-Meldung nennt Spiegel
- Pads im Notizen-Modus wieder mit runden Ecken (alte V75-Regel entfernt)
- workspace/mirrors.ts + Test (mirrors 6), components/CardMirrors.tsx, Hilfe und Begriff cardMirror, Symbol mirror, Handbuch V127, Lastenheft F-231, APP_VERSION V127, Übergabe V127

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q7eLycdMMsQxV5FpoP
```
