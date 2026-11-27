# Übergabe V125 → V126 E-Sources

Stand: 27.11.2026 · Chat V125 · Nächster Chat: **V126 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V126 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-231** (Absätze „Entschieden V120“, „Gebaut V120“–„Gebaut V125“) und **F-227** (Handbuch). Entscheidungs-Doc **F-231** https://claude.ai/artifact/KRcgsUzDgbzphj6rP9tKUV ist **entschieden** (PDF `docs/Arbeitspakete/F-231_V120_Kanban-wie-Trello.pdf`, Text mit `pdftotext -layout` – Ziel in `$HOME`, nicht `/tmp`). **Vor dem Termin Fr 04.12.2026 fertig (K1–K5, K7, K13), danach dazu K6 Titelbild (V124) und K8 eigene Felder/Abstimmen (V125).** Enricos Testphase ab 07.12. Leitlinien: **Rangfolge 1. IPMA ICB4, 2. Funktionen von MS Project/iTaskX/Trello, 3. unsere Sicht und Verbesserungen**, Design und Anordnung an unsere UX/UI angepasst, **Funktion vor Design**, NF-08, **F-231: unser Kanban ist mindestens so leistungsfähig wie Trello**. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V125_…` gelten weiter. **Handbuch** `docs/Handbuch/E-Sources_Handbuch.md` bei jeder Änderung mitführen. **Prüfdateien (F9: MS Project, iTaskX, Trello) bringt Enrico erst in seiner Testphase ab 07.12. – bis dahin nicht danach suchen.** Nächste Pakete nach Enricos Wahl, Vorschlag: **K11 Spaltenfarbe/Einklappen** → K9 Spiegelkarten → K10 Butler → K12/K14; F-230 F7 (CSV/Excel, iCal). Jedes Paket mit Hilfe, Begriff, Handbuch, Test und Trello-Import/Export (F-230).

**Tests** (VM ist nach jedem Chat leer – neu anlegen; **neu: cardFields**):
```
mkdir -p $HOME/vt2/node_modules/vitest && cp $HOME/mnt/Projects/e-sources/docs/uebergaben/vitest-ersatz.js $HOME/vt2/node_modules/vitest/index.js
cat > $HOME/vt2/run.sh <<'EOS'
cd $HOME/mnt/Projects/e-sources/web
rm -rf $HOME/vt2/out
npx tsc --outDir $HOME/vt2/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node src/workspace/*.ts >/dev/null 2>&1
for t in ${TESTS:-workspace persons stage noteSources gpm wheelOrder calendar resources deskProject mspdi trello projectKanban kanbanMore checklists tags kanbanViews comments kanbanTimeline covers cardFields}; do echo "== $t"; NODE_PATH=$HOME/vt2/node_modules:$PWD/node_modules node $HOME/vt2/out/$t.test.js 2>&1 | tail -3; done
EOS
bash $HOME/vt2/run.sh
```

**Neue Dateien anlegen:** Lange neue Dateien im Container schreiben (Write nach `/mnt/user-data/outputs/…`) und mit `device_commit_files` ins Repo legen; Änderungen an bestehenden Dateien per `device_bash` + Python (`str.replace` mit `assert`). **Achtung (V123, V125 bestätigt):** `device_commit_files` legte mehrmals die **vorige** Fassung ab (auch mit `force`). Neue Dateien daher **direkt im Repo** anlegen (`device_bash` mit `cat > … <<'EOF'`) bzw. nach jedem Commit mit `grep` prüfen.

**Browser:** Enrico startet `npm run dev` in `web/`; der eingebaute Browser erreicht **http://localhost:2910/** über `browser_repl`. **Kleine Ausgabe beim Öffnen:** `browser.tabs.create("http://localhost:2910/package.json")`, dann `browser.show()` und `tab.page.setViewportSize({ width: 1400, height: 900 })`, dann `tab.page.goto("http://localhost:2910/?test=voll")`. **Die Begrüßung oben rechts fängt Klicks ab** – in V123 blieb sie teils stehen (Fokus/Zeiger darin hält sie an): `section.greeting` › Knopf „Begrüßung schließen“ klicken oder warten. Im Testmodus: Knopf „Projekt“ (Text `^\s*Projekt$`, der letzte) → Name tippen (Feld hat den Fokus), Enter → „Kanban-Board anlegen“ → `[data-add]` klicken, Titel tippen, Enter, Esc. Termine am schnellsten über Rad „Ansicht“ › Tabelle (`.ktab input[type=date]` mit `fill`). **Rad-Wechsel brauchen ~0,7 s** je Raste (`ArrowDown` am `slider` „Ansicht“, dann warten, dann nächste Raste). Jeder Hot Reload löscht die Testdaten. Ziehen der Zeitleisten-Balken geht mit `tab.drag` in Bildpunkten (vorher `tab.screenshot()`, Bild ist halb so breit wie 1400); HTML5-Ziehen (Kalender, „Ohne Datum“) mit `DragEvent` + `DataTransfer` per `page.evaluate`.

**Browser-Hinweise (V124):** Rad „Größe“ im Kartenfenster: Klick oder Fokus + Pfeil hoch/runter (je ~0,9 s warten). Bild hochladen im Test: Canvas → `File` → `DataTransfer` an `.cardwin__cover input[type=file]`, `change` auslösen. Der Tooltip der Karte verdeckt nach dem Schließen des Kartenfensters die Spalte – vorher `tab.hover` woanders hin.

**Browser-Hinweise (V125):** Im Felder-Panel Locator auf `section.kfld` eingrenzen (es gibt mehrere Knöpfe „Anlegen“). Kartenfenster-Felder: `.cardwin__fields` › `getByLabel(/^Punkte – /)`. Taste S auf einer Karte (`[data-card]` fokussieren) stimmt ab, sobald „Abstimmen“ unten im Board an ist.

## Was in V125 passiert ist

`npx tsc --noEmit -p .` sauber. Tests: workspace 526, persons 18, stage 4, noteSources 1, gpm 44, wheelOrder 5, calendar 5, resources 2, deskProject 6, mspdi 6, trello 10, projectKanban 3, kanbanMore 13, checklists 3, tags 9, kanbanViews 5, comments 3, kanbanTimeline 6, covers 6, **cardFields 9** – alle grün.

Enrico hat das Paket wieder offen gelassen („Als Nächstes baue: ___“); gebaut wurde der Vorschlag: **K8 eigene Felder und Abstimmen**.

1. **Datenmodell** (`types.ts`): `CardFieldType` (`text|number|date|list|check`), `CardFieldOption {id,name,color?}`, `CardFieldDef {id,name,type,options?,onCard?}`, `CardFieldValue`; `NoteView.fields`, `NoteView.votes`; `Note.fields` (Feld-Id → Wert), `Note.votes` (Personen-Ids). `NotePatch` kennt `fields`, `votes`.
2. **Logik** `workspace/cardFields.ts`: Prüfen (`cleanFieldDefs`, `cleanValue` – Zahl auch mit Komma, `cleanFieldValues`, `cleanVotes`), Felder (`addField`, `updateField`, `moveField`, `removeField` samt Werten), Wahlen (`addOption`, `updateOption`, `moveOption`, `removeOption` leert Karten), Werte (`setFieldValue` über `updateNote`, Spur „bearbeitet“; falsche Werte ändern nichts), Anzeige (`valueText`, `cardFront`), Sortieren (`sortKey`, `sortByField`, `sortByVotes`), Filter (`fieldToken` = `Feld-Id=Wert`, `*` ausgefüllt, leer, `1` angehakt; `fieldHit`, `filterChoices`), Abstimmen (`toggleVote` ohne Spur, `setBoardVotes`), Trello (`fieldsFromTrello`, `valuesFromTrello`, `fieldsToTrello`, `itemsToTrello`).
3. **Eingebaut:** `cardFilter.ts` (`fields?`, optional, damit gemerkte Stände gleich bleiben), `sheets.ts` (`ColSort` + `'votes'` und `` `f:${id}` ``), `kanbanViews.ts` (`TableSort` ebenso), `kanbanMore.ts` (Kopie behält `fields`, nicht `votes`), Aktionen `fieldAdd/fieldEdit/fieldMove/fieldRemove/optionAdd/optionEdit/optionMove/optionRemove/fieldValue/vote/boardVotes`.
4. **Oberfläche** `components/CardFields.tsx`: Kartenfenster-Abschnitt unter „Titelbild“ – „Stimmen“ (Knopf Abstimmen/Stimme zurückziehen mit `aria-pressed`, wer gestimmt hat) und „Eigene Felder“ (Raster: Name (Art) + Eingabe je Art; Text/Zahl übernehmen bei Enter/Verlassen, Esc setzt zurück), Meldungen mit Rückgängig am Ort. Karte: `FieldChips` (Felder mit „auf der Karte“: Auswahl als Streifen „Name: Wahl“, Häkchen als ✓ Name), `VoteSign` (Zahl, hervorgehoben mit eigener Stimme). Board unten: „Felder (n)“ → `FieldPanel` (anlegen mit Art-Auswahl, umbenennen, „auf der Karte“, ↑↓, löschen; Wahlen mit Farbauswahl, ↑↓, löschen; Rückgängig über `exchange`), Kästchen „Abstimmen“. Taste **S** auf der Karte. Spaltenmenü › Sortieren: „Stimmen (meiste zuerst)“ und je Feld. Tabelle: Spalten „Stimmen“ und je Feld, sortierbar. Filter: je Feld eine Gruppe. Symbole `fields`, `vote`.
5. **Trello:** `customFields` ↔ Felder (Ids `tf-<Trello-Id>`, Wahlen `to-<Id>`; rohe Angaben wie `fieldGroup`, `pos` bleiben; `display.cardFront` ↔ „auf der Karte“; Farbe `none` = ohne), `customFieldItems` ↔ Werte (immer aus Trello gelesen; beim Export bleibt ein roher Eintrag, solange der Wert gleich ist – so behält ein Datum seine Uhrzeit; Einträge zu unbekannten Feldern gehen unverändert zurück), `idMembersVoted` ↔ Stimmen (über die Mitglieder-Zuordnung), `prefs.voting` ↔ „Abstimmen“ (geschrieben nur, wenn Trello `voting` kannte oder wir es einschalten; aus = `disabled`). Rundlauf-Test exakt.
6. **Fehler aus V124 behoben:** `Note.cover` und `NoteView.noCovers` wurden beim Laden (`parseNoteExtras`, `parseNoteViews`) nicht gelesen – Titelbilder und „Titelbilder zeigen“ waren nach dem Neuladen weg. Jetzt mit Test (Laden über `storage.parseWorkspace`).
7. **Ring-Import:** `covers.ts` hatte `COVER_COLORS = TAG_COLORS.map(...)` beim Laden; über notes → cardFields → covers → tags brach das im Test-Build. `COVER_COLORS` ist jetzt eine feste Liste (Test prüft: gleich `TAG_COLORS`).
8. Klein: Texte `FIELD_TEXT`, `VOTE_TEXT`, Filter-Hinweis nennt eigene Felder, Tasten-Hinweis nennt S; Begriffe `cardField`, `cardVote`; Hilfe `cardFields`; Handbuch V125 (Kapitel 5 und 7.3, Änderungsverzeichnis); Lastenheft F-231 „Gebaut V125“; `APP_VERSION = 'V125'`.

**Im Browser geprüft (Testmodus, Projekt-Board „Felder“, 3 Karten):** Felder anlegen (Auswahl mit drei Wahlen, Farbe Rot; Zahl; Häkchen), „auf der Karte“; im Kartenfenster Auswahl, Zahl „abc“ → Hinweis am Ort, „2,5“ übernommen, Häkchen; Abstimmen per Knopf und per Taste S (zweimal S zieht zurück); Karte zeigt „Priorität: Hoch“ und Stimmen; Filter „Hoch“ → 1 Karte, zurücksetzen; Tabelle mit Spalten Stimmen, Priorität, Punkte, Angebot raus, nach Punkte sortiert. Keine Konsolenfehler. **Nicht im Browser geprüft:** Datum-Feld, Spalte sortieren nach Stimmen/Feld (nur Test), Feld/Wahl löschen mit Rückgängig, Laden nach Neuladen (nur Test – im Testmodus wird nichts gespeichert), helle Designs, Trello mit echter Datei (Testphase).

## Nächste Schritte

1. Enricos Wahl für die nächsten Pakete (Vorschlag oben: K11).
2. **Prüfung F-230 mit Enricos Dateien (F9)** erst in der Testphase ab 07.12.
3. **Prüfliste für Enrico** (alles aus V77–V124 plus):
   - Seite neu laden, dann `npm test` in `web/` (neu: `cardFields.test.ts`).
   - Titelbild setzen, **Seite neu laden** → Titelbild und „Titelbilder zeigen“ bleiben (Fehler aus V124 behoben).
   - Unten im Board „Felder (0)“ → Feld je Art anlegen; Auswahl mit Wahlen und Farben; „auf der Karte“; ↑↓; Feld löschen → Rückgängig.
   - Kartenfenster › „Eigene Felder“: Werte setzen, Zahl mit Komma, falsche Zahl, Datum, Häkchen; Rückgängig.
   - Spaltenmenü › Sortieren › Feld „…“; Tabelle: Klick auf Feldspalte.
   - Filter › Feldgruppen (Wahl, ausgefüllt, leer, angehakt), ODER/UND.
   - Unten „Abstimmen“ an → Kartenfenster „Abstimmen“, Taste S auf der Karte, Spalte nach Stimmen sortieren; „Abstimmen“ aus → Stimmen verschwinden aus der Ansicht, bleiben gespeichert.
   - Testphase: Trello-Board mit Custom Fields (alle fünf Arten) und Votes importieren, ändern, exportieren, in Trello prüfen.

## Kleine Punkte (neu in V125)

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

## Commit-Text V125 (e-sources)

**Summary:** `V125: Kanban wie Trello – eigene Felder je Board und Abstimmen (K8); Titelbild bleibt nach Neuladen`

**Description:**
```
- F-231 K8: eigene Felder je Board wie Trello „Custom Fields“ – Text, Zahl, Datum, Auswahl (Wahlen mit Farbe), Häkchen; „Felder (n)“ unten im Board: anlegen, umbenennen, ordnen, „auf der Karte“, löschen mit Rückgängig
- Kartenfenster „Eigene Felder“ mit Eingabe je Art, Meldung mit Rückgängig am Ort; Werte vorn auf der Karte
- Sortieren nach Feld (Spaltenmenü, Tabelle), Kartenfilter je Feld (Wahl, ausgefüllt, leer, angehakt), Tabelle mit Feldspalten; Kopie behält die Werte
- Abstimmen wie Trello „Voting“: Board-Schalter, eine Stimme je Person, Kartenfenster „Stimmen“, Taste S, Zahl auf der Karte, Sortieren nach Stimmen
- Trello: customFields, customFieldItems, idMembersVoted und prefs.voting hin und zurück (rohe Einträge und Uhrzeit bleiben)
- Behoben: Titelbild und „Titelbilder zeigen“ wurden beim Laden nicht gelesen (V124); COVER_COLORS als feste Liste (Ring-Import)
- workspace/cardFields.ts + Test (cardFields 9), components/CardFields.tsx, Hilfe, Begriffe, Handbuch V125, Lastenheft F-231, APP_VERSION V125, Übergabe V125

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q54ibpaPHfPYohHrM6
```
