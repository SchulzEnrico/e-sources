# Übergabe V124 → V125 E-Sources

Stand: 27.11.2026 · Chat V124 · Nächster Chat: **V125 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V125 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-231** (Absätze „Entschieden V120“, „Gebaut V120“–„Gebaut V124“) und **F-227** (Handbuch). Entscheidungs-Doc **F-231** https://claude.ai/artifact/KRcgsUzDgbzphj6rP9tKUV ist **entschieden** (PDF `docs/Arbeitspakete/F-231_V120_Kanban-wie-Trello.pdf`, Text mit `pdftotext -layout` – Ziel in `$HOME`, nicht `/tmp`). **Vor dem Termin Fr 04.12.2026 fertig (K1–K5, K7, K13), nach Plan dazu K6 Titelbild (V124).** Enricos Testphase ab 07.12. Leitlinien: **Rangfolge 1. IPMA ICB4, 2. Funktionen von MS Project/iTaskX/Trello, 3. unsere Sicht und Verbesserungen**, Design und Anordnung an unsere UX/UI angepasst, **Funktion vor Design**, NF-08, **F-231: unser Kanban ist mindestens so leistungsfähig wie Trello**. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V124_…` gelten weiter. **Handbuch** `docs/Handbuch/E-Sources_Handbuch.md` bei jeder Änderung mitführen. **Prüfdateien (F9: MS Project, iTaskX, Trello) bringt Enrico erst in seiner Testphase ab 07.12. – bis dahin nicht danach suchen.** Nächste Pakete nach Enricos Wahl, Vorschlag: **K8 eigene Felder/Abstimmen** → K11 Spaltenfarbe/Einklappen → K9 Spiegelkarten → K10 Butler → K12/K14; F-230 F7 (CSV/Excel, iCal). Jedes Paket mit Hilfe, Begriff, Handbuch, Test und Trello-Import/Export (F-230).

**Tests** (VM ist nach jedem Chat leer – neu anlegen; **neu: covers**):
```
mkdir -p $HOME/vt2/node_modules/vitest && cp $HOME/mnt/Projects/e-sources/docs/uebergaben/vitest-ersatz.js $HOME/vt2/node_modules/vitest/index.js
cat > $HOME/vt2/run.sh <<'EOS'
cd $HOME/mnt/Projects/e-sources/web
rm -rf $HOME/vt2/out
npx tsc --outDir $HOME/vt2/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node src/workspace/*.ts >/dev/null 2>&1
for t in ${TESTS:-workspace persons stage noteSources gpm wheelOrder calendar resources deskProject mspdi trello projectKanban kanbanMore checklists tags kanbanViews comments kanbanTimeline covers}; do echo "== $t"; NODE_PATH=$HOME/vt2/node_modules:$PWD/node_modules node $HOME/vt2/out/$t.test.js 2>&1 | tail -3; done
EOS
bash $HOME/vt2/run.sh
```

**Neue Dateien anlegen:** Lange neue Dateien im Container schreiben (Write nach `/mnt/user-data/outputs/…`) und mit `device_commit_files` ins Repo legen; Änderungen an bestehenden Dateien per `device_bash` + Python (`str.replace` mit `assert`). **Achtung (V123):** Eine Datei, die im Container gerade erst geändert wurde, kam beim sofortigen `device_commit_files` noch in der alten Fassung an – nach dem Commit mit `grep` prüfen oder die Änderung direkt im Repo machen.

**Browser:** Enrico startet `npm run dev` in `web/`; der eingebaute Browser erreicht **http://localhost:2910/** über `browser_repl`. **Kleine Ausgabe beim Öffnen:** `browser.tabs.create("http://localhost:2910/package.json")`, dann `browser.show()` und `tab.page.setViewportSize({ width: 1400, height: 900 })`, dann `tab.page.goto("http://localhost:2910/?test=voll")`. **Die Begrüßung oben rechts fängt Klicks ab** – in V123 blieb sie teils stehen (Fokus/Zeiger darin hält sie an): `section.greeting` › Knopf „Begrüßung schließen“ klicken oder warten. Im Testmodus: Knopf „Projekt“ (Text `^\s*Projekt$`, der letzte) → Name, Enter → „Kanban-Board anlegen“ → `[data-add]` klicken, Titel tippen, Enter, Esc. Termine am schnellsten über Rad „Ansicht“ › Tabelle (`.ktab input[type=date]` mit `fill`). **Rad-Wechsel brauchen ~0,7 s** je Raste (`ArrowDown` am `slider` „Ansicht“, dann warten, dann nächste Raste). Jeder Hot Reload löscht die Testdaten. Ziehen der Zeitleisten-Balken geht mit `tab.drag` in Bildpunkten (vorher `tab.screenshot()`, Bild ist halb so breit wie 1400); HTML5-Ziehen (Kalender, „Ohne Datum“) mit `DragEvent` + `DataTransfer` per `page.evaluate`.

**Browser-Hinweise (V124):** Rad „Größe“ im Kartenfenster: Klick oder Fokus + Pfeil hoch/runter (je ~0,9 s warten). Bild hochladen im Test: Canvas → `File` → `DataTransfer` an `.cardwin__cover input[type=file]`, `change` auslösen. Der Tooltip der Karte verdeckt nach dem Schließen des Kartenfensters die Spalte – vorher `tab.hover` woanders hin.

## Was in V124 passiert ist

`npx tsc --noEmit -p .` sauber. Tests: workspace 526, persons 18, stage 4, noteSources 1, gpm 44, wheelOrder 5, calendar 5, resources 2, deskProject 6, mspdi 6, trello 10, projectKanban 3, kanbanMore 13, checklists 3, tags 9, kanbanViews 5, comments 3, kanbanTimeline 6, **covers 6** – alle grün.

Enrico hat das Paket offen gelassen („Als Nächstes baue: ___“); gebaut wurde der Vorschlag aus V123: **K6 Titelbild**.

1. **Datenmodell** (`types.ts`): `NoteCover { color?; img?; size?: 'full' }`, `Note.cover`, `NoteView.noCovers`; `NotePatch` kennt `cover`. `workspace/covers.ts`: `COVER_COLORS` (= zehn Tag-Grundfarben = Trello-Cover-Farben, ohne Stufen), `cleanCover` (Bild geht vor Farbe, Schlüssel wie `es-img:`), `setCover`/`setCoverSize` (über `updateNote`, Spur „bearbeitet“), `coverChoices` (Bilder im Text bzw. Entwurf), `coverShown` (Board-Schalter), `coverPaint`, `coverRefs`; Trello `coverFromTrello`, `coverToTrello`, `coverSig` (Kurzform zum Vergleich, weil Trello Felder umordnet/ergänzt).
2. **Aktionen** (`useWorkspace.ts`): `noteCover`, `boardCovers`. `imageRefs` zählt Titelbilder mit (sonst räumt `sweepPics` hochgeladene Titelbilder weg). `copyNote` übernimmt `cover`.
3. **Oberfläche** (`components/CardCover.tsx`): Kartenfenster-Abschnitt „Titelbild“ unter „Tags“ – Radiogruppe (native Radios, Pfeiltasten) „Ohne“ · zehn Farben · Bilder der Karte (Vorschaubild), „Bild hochladen …“ (`shrinkImage` + `putPic`, Schlüssel `cv-…`, nur Titelbild, nicht im Text), Rad „Größe“ Klein | Ganzflächig, Meldung mit Rückgängig am Ort, Hinweis wenn das Bild auf diesem Gerät fehlt. Karte: `CoverTop` (klein, im Titel-Knopf über den Tags) und `CoverBack` (ganzflächig, Ebene hinter der Karte; Schrift per CSS `:has(> .kcback.is-dark)`, Bild mit Verlauf unten und Mindesthöhe 120 px). Bild-Adressen je Sitzung zwischengespeichert (`usePicUrl`). Board-Schalter „Titelbilder zeigen“ (Kontrollkästchen) unten neben „Tags (n)“. CSS `.kcover*`, `.kcback*`, `.kcov__*`, `forced-colors` bedacht.
4. **Trello:** `cover` gehört jetzt zu `OWN_CARD`; Import: Farbe + Größe → `Note.cover`, Bild-Cover (Anhang, Hintergrund, Plugin) roh als `foreign.trello._cover`; `sent.cover = coverSig(...)` – unverändert zurückgekommen = eigenes Titelbild gilt (auch ein nur lokales Bild). Export: `coverToTrello(n.cover, _cover)`; Importe vor V124 haben das Cover roh in `cover` – wird wie `_cover` behandelt. `prefs.cardCovers` ↔ `noCovers` (geschrieben nur, wenn Trello den Schalter kannte oder wir ausblenden – Rundlauf-Test bleibt exakt).
5. Klein: Texte `COVER_TEXT`, Begriff `TERMS.cardCover`, Hilfe `cardCover` (Symbol `image`), Handbuch V124 (Kapitel 5 und 7.3, Änderungsverzeichnis), Lastenheft F-231 „Gebaut V124“, `APP_VERSION = 'V124'`.

**Im Browser geprüft (Testmodus, Projekt-Board „Cover“):** Farbe wählen per Klick und Pfeil rechts (Meldung „Titelbild: Farbe …“ mit Rückgängig), Rad „Größe“ per Klick und per Pfeil hoch/runter, ganzflächige Farbkarte (Hellgrün, dunkle Schrift), Bild hochladen → kleines Bild über dem Titel → ganzflächig mit Titel unten auf Verlauf, „Titelbilder zeigen“ aus (keine Titelbilder) und wieder an. Keine Konsolenfehler. **Nicht im Browser geprüft:** Bild aus dem Text der Karte als Titelbild (nur Test), Hinweis „Bild liegt auf einem anderen Gerät“, dunkle Farbe ganzflächig (weiße Schrift), helle Designs, Trello-Import/-Export mit echter Datei (Testphase).

## Nächste Schritte

1. Enricos Wahl für die nächsten Pakete (Vorschlag oben: K8).
2. **Prüfung F-230 mit Enricos Dateien (F9)** erst in der Testphase ab 07.12.
3. **Prüfliste für Enrico** (alles aus V77–V123 plus):
   - Seite neu laden, dann `npm test` in `web/` (neu: `covers.test.ts`).
   - Karte öffnen › „Titelbild“: Farbe wählen (Klick und Pfeiltasten), „Ohne“, Rückgängig.
   - Bild in den Text der Karte einfügen → erscheint unter „Bild aus der Karte“ → als Titelbild wählen; „Bild hochladen …“.
   - Rad „Größe“: Klein ↔ Ganzflächig, Lesbarkeit des Titels auf hellen und dunklen Farben und auf dem Bild.
   - Unten im Board „Titelbilder zeigen“ aus und an.
   - Karte kopieren (K) → Kopie hat das Titelbild.
   - Testphase: Trello-Board mit Farb- und Bild-Covers importieren, exportieren, in Trello prüfen.

## Kleine Punkte (neu in V124)

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


## Commit-Text V124 (e-sources)

**Summary:** `V124: Kanban wie Trello – Titelbild je Karte (Farbe oder Bild, klein oder ganzflächig), K6`

**Description:**
```
- F-231 K6: Titelbild wie Trello „Cover“ – Farbe (zehn Trello-Farben) oder Bild (aus dem Text der Karte oder hochgeladen), Größe klein | ganzflächig
- Kartenfenster „Titelbild“: Auswahl mit Pfeiltasten, Rad „Größe“, Rückgängig am Ort, Hinweis wenn das Bild auf diesem Gerät fehlt
- Karte: Streifen/Bild über dem Titel bzw. ganze Karte mit lesbarer Schrift; Board-Schalter „Titelbilder zeigen“; Kopie behält das Titelbild; Titelbilder zählen beim Aufräumen der Bilder mit
- Trello: cover.color/size und prefs.cardCovers hin und zurück, Bild-Cover reist roh mit
- workspace/covers.ts + Test (covers 6), components/CardCover.tsx, Hilfe, Begriff, Handbuch V124, Lastenheft F-231, APP_VERSION V124, Übergabe V124

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q3aqn3hKPCcBqPNNdh
```
