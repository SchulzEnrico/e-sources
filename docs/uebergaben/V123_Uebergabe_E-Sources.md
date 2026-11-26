# Übergabe V123 → V124 E-Sources

Stand: 26.11.2026 · Chat V123 · Nächster Chat: **V124 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V124 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-231** (Absätze „Entschieden V120“, „Gebaut V120/V121/V122/V123“) und **F-227** (Handbuch). Entscheidungs-Doc **F-231** https://claude.ai/artifact/KRcgsUzDgbzphj6rP9tKUV ist **entschieden** (PDF `docs/Arbeitspakete/F-231_V120_Kanban-wie-Trello.pdf`, Text mit `pdftotext -layout` – Ziel in `$HOME`, nicht `/tmp`). **Der Teil vor dem Termin Fr 04.12.2026 ist gebaut (K1–K5, K7), K13 ist jetzt komplett (Tabelle, Kalender, Zeitleiste, Kennzahlen).** Enricos Testphase ab 07.12. Leitlinien: **Rangfolge 1. IPMA ICB4, 2. Funktionen von MS Project/iTaskX/Trello, 3. unsere Sicht und Verbesserungen**, Design und Anordnung an unsere UX/UI angepasst, **Funktion vor Design**, NF-08, **F-231: unser Kanban ist mindestens so leistungsfähig wie Trello**. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V123_…` gelten weiter. **Handbuch** `docs/Handbuch/E-Sources_Handbuch.md` bei jeder Änderung mitführen. **Prüfdateien (F9: MS Project, iTaskX, Trello) bringt Enrico erst in seiner Testphase ab 07.12. – bis dahin nicht danach suchen.** Nächste Pakete nach Enricos Wahl, Vorschlag: **K6 Titelbild** → K8 eigene Felder/Abstimmen → K11 Spaltenfarbe/Einklappen → K9 Spiegelkarten → K10 Butler → K12/K14; F-230 F7 (CSV/Excel, iCal). Jedes Paket mit Hilfe, Begriff, Handbuch, Test und Trello-Import/Export (F-230).

**Tests** (VM ist nach jedem Chat leer – neu anlegen; **neu: kanbanTimeline**):
```
mkdir -p $HOME/vt2/node_modules/vitest && cp $HOME/mnt/Projects/e-sources/docs/uebergaben/vitest-ersatz.js $HOME/vt2/node_modules/vitest/index.js
cat > $HOME/vt2/run.sh <<'EOS'
cd $HOME/mnt/Projects/e-sources/web
rm -rf $HOME/vt2/out
npx tsc --outDir $HOME/vt2/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node src/workspace/*.ts >/dev/null 2>&1
for t in ${TESTS:-workspace persons stage noteSources gpm wheelOrder calendar resources deskProject mspdi trello projectKanban kanbanMore checklists tags kanbanViews comments kanbanTimeline}; do echo "== $t"; NODE_PATH=$HOME/vt2/node_modules:$PWD/node_modules node $HOME/vt2/out/$t.test.js 2>&1 | tail -3; done
EOS
bash $HOME/vt2/run.sh
```

**Neue Dateien anlegen:** Lange neue Dateien im Container schreiben (Write nach `/mnt/user-data/outputs/…`) und mit `device_commit_files` ins Repo legen; Änderungen an bestehenden Dateien per `device_bash` + Python (`str.replace` mit `assert`). **Achtung (V123):** Eine Datei, die im Container gerade erst geändert wurde, kam beim sofortigen `device_commit_files` noch in der alten Fassung an – nach dem Commit mit `grep` prüfen oder die Änderung direkt im Repo machen.

**Browser:** Enrico startet `npm run dev` in `web/`; der eingebaute Browser erreicht **http://localhost:2910/** über `browser_repl`. **Kleine Ausgabe beim Öffnen:** `browser.tabs.create("http://localhost:2910/package.json")`, dann `browser.show()` und `tab.page.setViewportSize({ width: 1400, height: 900 })`, dann `tab.page.goto("http://localhost:2910/?test=voll")`. **Die Begrüßung oben rechts fängt Klicks ab** – in V123 blieb sie teils stehen (Fokus/Zeiger darin hält sie an): `section.greeting` › Knopf „Begrüßung schließen“ klicken oder warten. Im Testmodus: Knopf „Projekt“ (Text `^\s*Projekt$`, der letzte) → Name, Enter → „Kanban-Board anlegen“ → `[data-add]` klicken, Titel tippen, Enter, Esc. Termine am schnellsten über Rad „Ansicht“ › Tabelle (`.ktab input[type=date]` mit `fill`). **Rad-Wechsel brauchen ~0,7 s** je Raste (`ArrowDown` am `slider` „Ansicht“, dann warten, dann nächste Raste). Jeder Hot Reload löscht die Testdaten. Ziehen der Zeitleisten-Balken geht mit `tab.drag` in Bildpunkten (vorher `tab.screenshot()`, Bild ist halb so breit wie 1400); HTML5-Ziehen (Kalender, „Ohne Datum“) mit `DragEvent` + `DataTransfer` per `page.evaluate`.

## Was in V123 passiert ist

`npx tsc --noEmit -p .` sauber. Tests: workspace 526, persons 18, stage 4, noteSources 1, gpm 44, wheelOrder 5, calendar 5, resources 2, deskProject 6, mspdi 6, trello 10, projectKanban 3, kanbanMore 13, checklists 3, tags 9, kanbanViews 5, comments 3, **kanbanTimeline 6** – alle grün.

1. **K13 Zeitleiste** (`workspace/kanbanTimeline.ts`, `components/KanbanTimeline.tsx`): Rad „Ansicht“ hat jetzt fünf Stellungen (`KView` + `timeline`, `stats`). `barOf` (Start = `notBefore`, Ende = `due`, fehlt eins = 1 Tag, Start nach „fällig“ = `bad`), `groupsOf` (Spalte inkl. leerer, Person mit „Ohne Zuständigen“ hinten, Tag mit Farbe, Karte in jedem Tag, „Ohne Tag“ hinten, ausgeblendete Tags zählen nicht), `rangeOf` (Balken + heute + Rand, Mindestlänge 28/84/183 Tage, ab Montag bzw. Monatsersten), `ticksOf`, `monthsOf`, `moveBy`, `resizeBy` (nie über das andere Ende; nur „fällig“ verlängert → alter Tag wird Start), `placeAt`, `arrowsOf` (Vorgänger `after` zwischen sichtbaren Karten), `criticalOf` (nur Board mit Besitzer Projekt, aus `ganttOf`). `TL_DAY_W` 28/10/3,4 px. Oberfläche: Räder „Maßstab“ und „Gruppen“ (gemerkt in `sheetPrefs.tlScale/tlGroup`), „Heute“, „Vorgänger zeigen“, Zeilen absolut je 28 px, Namensspalte sticky (210 px), Kopf sticky mit Monaten und Strichen, Wochenenden grau (Maßstab Tage), Heute-Linie, SVG-Pfeile (kritisch rot), Balken = Knopf (Farbe des ersten sichtbaren Tags, sonst Akzent; überfällig/bald mit Rahmen; erledigt blass; kritisch rote Unterkante; `bad` gestrichelt), Zeiger-Ziehen mit Vorschau (Mitte = verschieben, 6-px-Enden = Start/„fällig“), Tastatur (Pfeil hoch/runter/Pos1/Ende wechselt, Alt+←/→, Alt+Umschalt+←/→, Alt+↑/↓, Enter), roving tabindex, „Ohne Datum“ mit HTML5-Ziehen auf die Spur und Alt+→ = heute. Änderungen über `noteEdit` mit Rückgängig in der `NoticeLine`. Fokus nach dem Kartenfenster zurück auf `[data-bar]`.
2. **K13 Kennzahlen** (`workspace/kanbanStats.ts`, `components/KanbanStats.tsx`): `boardStats` (Summen, Spalten mit WIP/over, Personen und Tags mit offen, Fälligkeit `over|soon|week|later|none|done` über `dueBucket`, Checklisten, Alter offener Karten ab `created` in der Spur – Durchschnitt, älteste), `barPct`. Oberfläche: Zahlen-Kacheln (`dl`), „Alter offener Karten“ mit Knopf zur ältesten Karte, vier Kacheln mit Balken und Zahl als Text; Klick auf Person/Tag/Fälligkeit setzt den Kartenfilter (ersetzt den bisherigen) und schaltet auf Board, Spalte schaltet auf Board, „später“ ist nicht klickbar (kein Filter dafür). Zählt wie die Tabelle (Suche, „Nur meine“, „Offen | Alle“, Filter).
3. Klein: Symbole `timeline`, `stats`; Texte `TL_TEXT`, `STATS_TEXT`, `KVIEW_TEXT.timeline/stats`; Begriffe `TERMS.kanbanTimeline`, `TERMS.workItemAge`; Hilfe `kanbanTimeline`, `kanbanStats` (Wort „verschieben“ bewusst nicht in `words` – sonst verdrängt es „swap“ aus dem Test F-186), `kanbanViews` nennt alle fünf Ansichten; `export type { Common as KViewProps }` in KanbanViews.tsx; CSS `.ktl*`, `.kst*`; Handbuch V123 (Kapitel 5), Lastenheft F-231 „Gebaut V123“, `APP_VERSION = 'V123'`.
4. **Trello:** Die Zeitleiste nutzt `notBefore`/`due` – beide reisen schon mit (Trello `start` ↔ `notBefore`, `due` ↔ `due`, seit V119/V121). Kennzahlen haben nichts zu übertragen.

**Im Browser geprüft (Testmodus, Projekt-Board):** Rad „Ansicht“ › Zeitleiste und Kennzahlen; Maßstab Tage; Alt+Umschalt+→ zweimal verlängert „Stand planen“ auf 30.11.–02.12.; Balken mit der Maus um zwei Tage gezogen (04.12. → 06.12., „Rückgängig“ erscheint); Gruppen › Person; „Ohne Termin“ aus „Ohne Datum“ auf die Spur gezogen (fällig heute); Kennzahlen zeigen Summen, Spalten, Person, Tag, Fälligkeit; Klick auf „bald fällig“ → Board mit „Filter (1)“ und nur dieser Karte. Keine Konsolenfehler. **Nicht im Browser geprüft:** Vorgänger-Pfeile (nur Test), Ziehen an den Enden mit der Maus, Gruppen › Tag mit Farben, Maßstab Monate, Kennzahlen mit WIP-Limit über der Grenze und mit Checklisten.

## Nächste Schritte

1. Enricos Wahl für die nächsten Pakete (Vorschlag oben).
2. **Prüfung F-230 mit Enricos Dateien (F9)** erst in der Testphase ab 07.12.
3. **Prüfliste für Enrico** (alles aus V77–V122 plus):
   - Seite neu laden, dann `npm test` in `web/` (neu: `kanbanTimeline.test.ts`).
   - Kanban › Rad „Ansicht“ › **Zeitleiste**: Maßstab Tage/Wochen/Monate, Gruppen Spalte/Person/Tag, „Heute“.
   - Balken ziehen (verschieben), linkes und rechtes Ende ziehen; Rückgängig. Mit der Tastatur: Pfeil hoch/runter, Alt+←/→, Alt+Umschalt+←/→, Alt+↑/↓, Enter öffnet, Esc → Fokus zurück auf den Balken.
   - Karte aus „Ohne Datum“ auf die Zeitachse ziehen; Alt+→ an einer Karte in „Ohne Datum“.
   - Zwei Karten im Netzplan verbinden (Vorgänger) → Pfeil in der Zeitleiste; Projekt-Board: kritische Karten rot.
   - Rad „Ansicht“ › **Kennzahlen**: Zahlen oben, älteste Karte öffnen, WIP-Limit an einer Spalte setzen und überschreiten (rot), Klick auf Person/Tag/„überfällig“ filtert das Board; „Offen | Alle“ ändert die Zahlen.
   - Seite neu laden → Ansicht, Maßstab und Gruppen sind noch gewählt.

## Kleine Punkte (neu in V123)

- Monatsname im Zeitleisten-Kopf wird links von der Namensspalte abgeschnitten, wenn der Monat vor dem sichtbaren Bereich beginnt („ember 2026“) – Monatsnamen sticky machen (Design).
- Im Projekt-Board ohne Vorgänger zeigt `ganttOf` alle Karten als „kritisch“ (jede Karte ohne Puffer) – im Test sahen alle drei rot unterstrichen aus. Prüfen, ob `criticalOf` nur Ketten mit Vorgängern zeigen soll oder das so stimmt (ICB4: Vorgang ohne Puffer ist kritisch).
- Zeitleiste im schmalen Projekt-Modus eng (Namensspalte 210 px fest) – bei Bedarf Breite ziehbar machen.
- Zeitleisten-Ziehen ist Zeiger-Ziehen (geht auf Touch), „Ohne Datum“ → Zeitachse ist HTML5 (Touch nicht; dort Alt+→ bzw. Kartenfenster).
- Kennzahlen-Klick **ersetzt** den Filter (statt zu ergänzen) – so ist klar, was man sieht; ggf. Umschalt+Klick = ergänzen.
- Zeitleiste/Kalender ändern bei einem offenen Entwurf mit Terminen die Notiz, angezeigt wird der Entwurf (wie V122).
- Alter offener Karten zählt ab dem Anlegen, nicht ab „in Arbeit“ (Kanban Guide: ab Beginn der Arbeit) – genauer ab dem ersten Wechsel in eine Spalte mit Zustand „in Arbeit“ (Spur `state`), wenn gewünscht.
- Aus V122 weiter offen: Rad „Zeitraum“ im Kalender nicht gemerkt; Spalte wechseln in der Tabelle sagt „verschoben“ trotz offener WIP-Nachfrage; Erwähnungen benachrichtigen niemanden; Filter-/Tag-Panel im schmalen Projekt-Modus eng; wiederhergestellte Karte am Ende der Spalte; doppelte Meldung nach Spalte-Wiederherstellen; Kopieren-Leiste Legende; Uhrzeit-Feld als System-Feld.

## Commit-Text V123 (e-sources)

**Summary:** `V123: Kanban wie Trello – Zeitleiste (Gantt als Ansicht) und Kennzahlen, K13 komplett`

**Description:**
```
- F-231 K13: Rad „Ansicht“ am Kanban jetzt Board | Tabelle | Kalender | Zeitleiste | Kennzahlen
- Zeitleiste: Balken von „nicht beginnen vor“ bis „fällig“, Maßstab Tage/Wochen/Monate, Gruppen Spalte/Person/Tag (gemerkt); Ziehen verschiebt, Enden ziehen ändern Start bzw. „fällig“, Alt+Pfeile; „Ohne Datum“ auf die Zeitachse ziehen; Vorgänger-Pfeile, kritischer Pfad im Projekt-Board, Heute-Linie, Rückgängig am Ort
- Kennzahlen: Karten/offen/erledigt/überfällig, Checklisten, Alter offener Karten (Work Item Age); Kacheln je Spalte (WIP-Limit), Person, Tag, Fälligkeit; Klick setzt den Filter und zeigt das Board
- workspace/kanbanTimeline.ts, kanbanStats.ts + Test (kanbanTimeline 6), components/KanbanTimeline.tsx, KanbanStats.tsx, Hilfe, Begriffe, Symbole, Handbuch V123, Lastenheft F-231, APP_VERSION V123, Übergabe V123

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q7DwHD2tPj16AdUGNc
```
