# Übergabe V122 → V123 E-Sources

Stand: 26.11.2026 · Chat V122 · Nächster Chat: **V123 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V123 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-231** (Absätze „Entschieden V120“, „Gebaut V120/V121/V122“) und **F-227** (Handbuch). Entscheidungs-Doc **F-231** https://claude.ai/artifact/KRcgsUzDgbzphj6rP9tKUV ist **entschieden** (PDF `docs/Arbeitspakete/F-231_V120_Kanban-wie-Trello.pdf`, Text mit `pdftotext -layout` – Ziel in `$HOME`, nicht `/tmp`). **Der Teil vor dem Termin Fr 04.12.2026 ist gebaut (K1–K5, K13 Tabelle + Kalender, K7).** Enricos Testphase ab 07.12. Leitlinien: **Rangfolge 1. IPMA ICB4, 2. Funktionen von MS Project/iTaskX/Trello, 3. unsere Sicht und Verbesserungen**, Design und Anordnung an unsere UX/UI angepasst, **Funktion vor Design**, NF-08, **F-231: unser Kanban ist mindestens so leistungsfähig wie Trello**. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V122_…` gelten weiter. **Handbuch** `docs/Handbuch/E-Sources_Handbuch.md` bei jeder Änderung mitführen. **Prüfdateien (F9: MS Project, iTaskX, Trello) bringt Enrico erst in seiner Testphase ab 07.12. – bis dahin nicht danach suchen.** Nächste Pakete nach Enricos Wahl, Vorschlag: **K13 Rest (Zeitleiste = Gantt als Ansicht, Kennzahlen)** → K6 Titelbild → K8 eigene Felder/Abstimmen → K11 Spaltenfarbe/Einklappen → K9 Spiegelkarten → K10 Butler → K12/K14; F-230 F7 (CSV/Excel, iCal). Jedes Paket mit Hilfe, Begriff, Handbuch, Test und Trello-Import/Export (F-230).

**Tests** (VM ist nach jedem Chat leer – neu anlegen; **neu: tags, kanbanViews, comments**):
```
mkdir -p $HOME/vt2/node_modules/vitest && cp $HOME/mnt/Projects/e-sources/docs/uebergaben/vitest-ersatz.js $HOME/vt2/node_modules/vitest/index.js
cat > $HOME/vt2/run.sh <<'EOS'
cd $HOME/mnt/Projects/e-sources/web
rm -rf $HOME/vt2/out
npx tsc --outDir $HOME/vt2/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node src/workspace/*.ts >/dev/null 2>&1
for t in ${TESTS:-workspace persons stage noteSources gpm wheelOrder calendar resources deskProject mspdi trello projectKanban kanbanMore checklists tags kanbanViews comments}; do echo "== $t"; NODE_PATH=$HOME/vt2/node_modules:$PWD/node_modules node $HOME/vt2/out/$t.test.js 2>&1 | tail -3; done
EOS
bash $HOME/vt2/run.sh
```

**Neue Dateien anlegen:** Lange neue Dateien im Container schreiben (Write nach `/mnt/user-data/outputs/…`) und mit `device_commit_files` ins Repo legen; Änderungen an bestehenden Dateien per `device_bash` + Python (`str.replace` mit `assert`).

**Browser:** Enrico startet `npm run dev` in `web/`; der eingebaute Browser erreicht **http://localhost:2910/** über `browser_repl`. **Kleine Ausgabe beim Öffnen:** `browser.tabs.create("http://localhost:2910/package.json")`, dann `browser.show()` und `tab.page.setViewportSize({ width: 1400, height: 900 })` (sonst ist das Fenster zu schmal), dann `tab.page.goto("http://localhost:2910/?test=voll")`. Die Begrüßung oben rechts fängt anfangs Klicks ab – kurz warten, sie geht von selbst. Im Testmodus: Knopf „Projekt“ (Text `^\s*Projekt$`, der letzte) → Name, Enter → „Kanban-Board anlegen“ → `[data-add]` klicken, Titel tippen, Enter. Jeder Hot Reload löscht die Testdaten. **Rad-Wechsel brauchen ~0,5 s**, bevor die neue Stellung gilt. Ziehen im Kalender lässt sich mit `DragEvent` + `DataTransfer` per `page.evaluate` nachstellen (`locator.dragTo` will vorher ein Bild). Strg+A im Textfeld wirkt auf dem Mac nicht (Meta).

## Was in V122 passiert ist

`npx tsc --noEmit -p .` sauber. Tests: workspace 526, persons 18, stage 4, noteSources 1, gpm 44, wheelOrder 5, calendar 5, resources 2, deskProject 6, mspdi 6, trello **10**, projectKanban 3, kanbanMore 13, checklists 3, **tags 9**, **kanbanViews 5**, **comments 3** – alle grün.

1. **K4 Tags mit Farbe** (`workspace/tags.ts`, `components/KanbanTags.tsx`): `Workspace.tagColors` (Name → Farbe; T4 gemeinsam), `NoteView.hiddenTags` (je Board ausgeblendet, klein geschrieben). `TAG_COLORS` = zehn Trello-Farben (green … black) mit unseren Tönen, Stufen `_light`/`_dark` werden getragen (`tagHex`, `tagInk`, `tagColorName`). `allTags`, `boardTags`, `shownTags`, `setTagColor`, `createTag` (nächste freie Grundfarbe), `normalizeTags` (bekannte Schreibweise), `renameTag` (überall, legt zusammen), `removeTagIn` (nur dieses Board; unbenutzt → Farbe weg), `setHidden`, Parser. Aktionen `tagColor`, `tagCreate`, `tagRename`, `tagRemoveIn`, `tagHide`, `noteTags`. UI: `TagChips` oben auf der Karte (mit Namen), `CardTags` im Kartenfenster (Eingabe mit `datalist`, ✕ mit Rückgängig), `TagPanel` („Tags (n)“ unter „Archiv (n)“ und im Pad-⋮, Ereignis `esource:kanbantags`): Farbwahl `ColorRow` (Pfeile), Umbenennen (Stift, Text wird markiert), „Im Board zeigen“, Löschen, „Neuer Tag“.
2. **K4 Filter** (`workspace/cardFilter.ts`): `CardFilter { tags (''=ohne), due (over|soon|week|none|done), states, persons (''=ohne), mode any|all }`, `passes`, `toggle`, `filterCount`, `parseCardFilter`. Gemerkt in `sheetPrefs` (`filter`). Knopf „Filter (n)“ im Sheet-Kopf (`FilterButton`), `FilterPanel` am Ort mit Rad „Verknüpfung“ ODER | UND, „Filter zurücksetzen“, Zähler „n Karten sichtbar“. Wirkt mit Suche und „Nur meine“ in allen drei Ansichten (`passes` in `KanbanSheet`).
3. **K13 Ansichten** (`workspace/kanbanViews.ts`, `components/KanbanViews.tsx`): Rad „Ansicht“ Board | Tabelle | Kalender im Sheet-Kopf (`sheetPrefs.kview`). `tableRows`, `sortRows` (title, col, tags, who, due, state; Leeres hinten), `KanbanTable` (sortieren per Überschrift, 3. Klick = Board-Reihenfolge; Spalte per `select` über `commit` mit WIP-Gate; „fällig“ per Datumsfeld). Kalender: `monthDays`, `weekDays`, `weekStart`, `isoWeek`, `shiftDay`, `shiftMonth`, `byDay`; `KanbanCalendar` mit Rad „Zeitraum“ Monat | Woche, Zurück/Heute/Weiter, Chips ziehbar (HTML5-DnD), Alt+Pfeile ±1 Tag/±7 Tage, „Ohne Datum“ als Ablage, „+ n weitere“ im Monat ab 3. Änderungen mit Rückgängig in der `NoticeLine`. WIP-Nachfrage erscheint in Tabelle/Kalender über der Ansicht. Board wird mit `hidden` ausgeblendet (`.kanban__board[hidden]`). Kartenfenster-Fokus geht zurück auf `[data-row]`/`[data-chip]`.
4. **K7 Kommentare** (`workspace/comments.ts`, `components/CardComments.tsx`): `NoteEventKind` + `'comment'`, `NoteEvent.id/text/edited/ref`. `trimTrail` in notes.ts: übrige Ereignisse ≤ TRAIL_MAX (200), Kommentare ≤ `COMMENTS_MAX` (500) – Kommentare fallen nicht mehr wegen Ereignissen raus; Parser liest Kommentare. `addComment`, `editComment`, `deleteComment`, `putComment` (Rückgängig an alter Stelle), `splitMentions`/`mentionsIn` (@Name, längster zuerst, Wortgrenze), `activityOf`. Aktionen `commentAdd/Edit/Delete/Put`. Kartenfenster unten „Kommentare und Aktivität“ mit Rad „Zeigen“ Kommentare | Alles, Eingabe (Strg/⌘+Enter, „@ Person …“), Bearbeiten (Esc), Löschen; Autor ohne Profil = „Ich“.
5. **Trello:** Labelfarben → `tagColors` (vorhandene eigene Farbe bleibt), Export setzt eigene Farbe ans Label bzw. neues Label mit Farbe. Kommentare: `commentCard` → Kommentar mit `ref` = Aktions-Id, roh unter `foreign.trello.cmx`; Export baut sie aus der Spur (roh + neuer Text, neue mit `idMemberCreator` über Personenname), gelöschte fehlen. Ältere Importe (`comments` roh, ohne Spur) gehen unverändert zurück und stehen weiter in „Aus Trello“ (`trelloExtras` zeigt nur Kommentare ohne Spur-Eintrag).
6. Klein: `Sh.cardsIn/overWip(c, adding, ws)` zählt archivierte Karten nicht mehr (WIP-Limit wie Zähler; auch `boardSummary`). Hilfe `kanbanTags`, `kanbanViews`, `cardComments`; `kanbanUse` „bis 20“. Symbole `tag`, `filter`, `table`, `calendarView`, `comment`. Texte `TAG_TEXT`, `FILTER_TEXT`, `KVIEW_TEXT`, `COMMENT_TEXT`. Handbuch V122 (5, 7.3), Lastenheft F-231 „Gebaut V122“, `APP_VERSION = 'V122'`.

**Im Browser geprüft (Testmodus):** Tags im Kartenfenster anlegen (Farben grün/gelb automatisch), Farbstreifen auf der Karte; Filter nach Tag (1 von 2 Karten, „Filter (1)“); Tag-Verwaltung: Farbe Lila, Umbenennen; Tabelle: „fällig“ setzen, Spalte wechseln, nach „fällig“ sortieren; Kalender: Alt+→ verschiebt um einen Tag, Ziehen aus „Ohne Datum“ auf einen Tag, Weiter/Monat/Woche; Kommentar anlegen mit @Ich („erwähnt: Ich“), bearbeiten („bearbeitet“), Rad „Alles“ zeigt „abgelegt in Messe“, „angelegt“. Keine Konsolenfehler. **Nicht im Browser geprüft:** Tag löschen/ausblenden, UND-Verknüpfung, Pad-⋮ „Tags …“, Woche-Ansicht mit Karten, Kommentar löschen + Rückgängig, Trello-Rundlauf (nur Tests).

## Nächste Schritte

1. Enricos Wahl für die Pakete nach dem 04.12. (Vorschlag oben).
2. **Prüfung F-230 mit Enricos Dateien (F9)** erst in der Testphase ab 07.12.
3. **Prüfliste für Enrico** (alles aus V77–V121 plus):
   - Seite neu laden, dann `npm test` in `web/` (neu: `tags.test.ts`, `kanbanViews.test.ts`, `comments.test.ts`).
   - Kartenfenster › Tags: Namen tippen, Enter (Vorschläge), ✕ mit Rückgängig; Karte zeigt farbige Streifen mit Namen.
   - „Tags (n)“ (auch Pad-⋮): Farbe wählen (Pfeiltasten), umbenennen, „Im Board zeigen“ abwählen (Streifen weg, anderes Board zeigt ihn), löschen mit Rückgängig, „Neuer Tag“.
   - „Filter“: Tag + Person mit ODER, dann UND; „ohne Tag“, „überfällig“, „in den nächsten 7 Tagen“; „Filter zurücksetzen“; Seite neu laden → Filter ist noch da.
   - Rad „Ansicht“ › Tabelle: sortieren (3 Klicks), Spalte in der Zeile ändern (WIP-Nachfrage erscheint über der Tabelle), „fällig“ setzen; Titel öffnet das Kartenfenster, Esc → Fokus zurück auf die Zeile.
   - Rad „Ansicht“ › Kalender: Monat/Woche, Zurück/Heute/Weiter, Karte auf anderen Tag ziehen, Alt+Pfeile, aus „Ohne Datum“ ziehen und zurück, Rückgängig.
   - Kartenfenster › Kommentare: schreiben (Strg/⌘+Enter), „@ Person …“, bearbeiten (Esc), löschen + Rückgängig, Rad „Alles“.
   - Trello: Board mit farbigen Labels und Kommentaren importieren, Kommentar ändern, exportieren und in Trello wieder einlesen (in der Testphase).

## Kleine Punkte (neu in V122)

- Kalender-Ziehen ist HTML5-Drag-and-drop – auf Touch geht es nicht (dort Kartenfenster › „fällig“); bei Bedarf Zeiger-Ziehen wie im Board nachbauen.
- Hat eine Notiz einen Entwurf mit „fällig“, ändern Tabelle/Kalender `due` an der Notiz, angezeigt wird aber der Entwurf – selten, ggf. über `noteDraft` ändern.
- Erwähnungen (@Person) benachrichtigen noch niemanden (es gibt kein Konto) – nur Hervorhebung und „erwähnt: …“; später mit Erinnerung/Fokus verbinden.
- Filter-Panel und Tag-Panel sind im schmalen Projekt-Modus eng (Kopf bricht um, scrollt) – Design später.
- Rad „Zeitraum“ startet bei jedem Öffnen mit Monat und heute (nicht gemerkt).
- Rückgängig der Tag-Verwaltung (umbenennen, löschen, neu) setzt den ganzen Stand zurück (`exchange`) – wie bei Kopieren/Archivieren.
- Kalender zeigt Karten nach „fällig“, nicht nach „nicht beginnen vor“ (Trello zeigt Start und Fälligkeit) – bei K13 Zeitleiste mitdenken.
- Spalte wechseln in der Tabelle sagt „verschoben“ an, auch wenn die WIP-Nachfrage noch offen ist.
- Aus V121 weiter offen: wiederhergestellte Karte landet am Ende der Spalte; doppelte Meldung nach Spalte-Wiederherstellen; Kopieren-Leiste Legende; Uhrzeit-Feld als System-Feld.

## Commit-Text V122 (e-sources)

**Summary:** `V122: Kanban wie Trello – Tags mit Farbe und Filter, Ansichten Tabelle und Kalender, Kommentare mit @Person`

**Description:**
```
- F-231 K4: gemeinsame Tag-Farbliste (zehn Trello-Farben), je Board ausblendbar; Tags im Kartenfenster, Farbstreifen mit Namen auf der Karte; „Tags (n)“: Farbe, umbenennen überall, im Board zeigen, löschen, neuer Tag
- F-231 K4: Kartenfilter nach Tag, Fälligkeit, Zustand, Person mit ODER/UND, je Board gemerkt; WIP-Limit zählt archivierte Karten nicht mehr
- F-231 K13: Rad „Ansicht“ Board | Tabelle | Kalender – Tabelle sortierbar, Spalte und „fällig“ in der Zeile; Kalender Monat/Woche, Ziehen oder Alt+Pfeile ändert „fällig“, „Ohne Datum“
- F-231 K7: Kommentare als Spur-Einträge (eigene Grenze 500), @Person, bearbeiten/löschen mit Rückgängig, Rad „Alles“ zeigt Spur und Kommentare
- Trello: Labelfarben und Kommentare (auch geändert, neu, gelöscht) hin und zurück
- workspace/tags.ts, cardFilter.ts, kanbanViews.ts, comments.ts + Tests (tags 9, kanbanViews 5, comments 3, trello 10), components/KanbanTags.tsx, KanbanViews.tsx, CardComments.tsx, Hilfe, Handbuch V122, Lastenheft F-231, APP_VERSION V122, Übergabe V122

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q4TKcBzzJqJfk2Gxag
```
