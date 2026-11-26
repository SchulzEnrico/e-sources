# Übergabe V112 → V113 E-Sources

Stand: 26.11.2026 · Chat V112 · Nächster Chat: **V113 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V113 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-226** (Absätze „Gebaut V111“ / „Feinschliff V111“, Stufe 2), **F-228** („Gebaut V112“), **F-229** („Nachbesserung V112“), **F-227** (Handbuch) und **F-206 Schritt 10**. Docs: F-226 https://claude.ai/artifact/QxM6UPG6NFaAgkJwsb8EVy, F-228 https://claude.ai/artifact/UUvw5HtX9663ESsT4tS5my, F-222 V108 https://claude.ai/artifact/MXgwEhtFcAJSLYc13zbZd8. **Termin Fr 04.12.2026**, Enricos Testphase ab 07.12. Leitlinien: **Trello**, **IPMA ICB4 / GPM-Leitfaden Z01D Rev. 09**, **MS Project / iTaskX**, Design und Anordnung an unsere UX/UI angepasst, **Funktion vor Design**, NF-08. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag; Tests: `docs/uebergaben/vitest-ersatz.js` nach `$HOME/vt2/node_modules/vitest/index.js`, `$HOME/vt2/run.sh` neu anlegen – siehe unten), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V112_…` gelten weiter. **Handbuch** `docs/Handbuch/E-Sources_Handbuch.md` bei jeder Änderung mitführen. Erst Enricos offene Rückmeldungen zu V112 abholen (Seite neu geladen? Anfasser, Pad-Kopf), dann „Nächste Schritte“ ab 1 **bauen**.

**`run.sh` (in V112 neu angelegt, die VM war leer):**
```
cd $HOME/mnt/Projects/e-sources/web
rm -rf $HOME/vt2/out
npx tsc --outDir $HOME/vt2/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node src/workspace/*.ts >/dev/null 2>&1
for t in workspace persons stage noteSources gpm; do echo "== $t"; NODE_PATH=$HOME/vt2/node_modules:$PWD/node_modules node $HOME/vt2/out/$t.test.js 2>&1 | tail -3; done
```

## Was in V112 passiert ist

`npx tsc --noEmit -p .` sauber. Tests: workspace **526**, persons 17, stage 4, noteSources 1, gpm 28 – alle grün (keine neuen Tests: Änderungen nur in Bauteilen/CSS). **Im eingebauten Browser geprüft** (`localhost:2910/?test=voll`, 900–1200 px): Pad mit zwei Sheets bei 300 und 210 px Breite (aktiver Reiter mit „…“, ▾ 1, ⧉ 4, ✕ – nichts überlappt), Notizen-Modus 2 × 2 (Knöpfe ↔ ↕ ⤡ mittig in den Lücken, nachgemessen; ↕ 5 px unter dem Fußknopf), Ziehen am ↕-Knopf per Pointer-Ereignissen (Grenze wandert), Tour „Notizen & Aufgaben“ bei 1000 px (Schritte 2 und 3 klappen die Kopfleiste auf, danach zu). **Nicht im Browser geprüft:** Cockpit-Kopf und Projekt-Köpfe knapp, Stapel-Leiste schwebend (kein kurzes Portal im Test), View-Klick ohne Verspringen (Enrico bestätigte „ok. geht wieder“).

1. **Rückmeldungen Enrico (live, 09:33–09:50):**
   - „Es läuft immer noch etwas übereinander“ / „Das Überlagern der beiden Schalter für Menü und Tabs ist weiterhin da“ → der Reiter-Knopf ▾ wurde vom zu breiten aktiven Reiter abgeschnitten. `useOverflow`: Sicherung `spill` (tatsächliches Überlaufen per `scrollWidth` macht knapp) + `spillNeed` (gilt bis zur nächsten Inhaltsänderung, verhindert Pendeln); CSS „V112 … Sheets-Reiter knapp“ (Name „…“, Knopf `flex: none`); `--ovf-min` der Pad-Reiter 8.5em → 12em.
   - Anfasser im Notizen-Modus (mehrere Runden): jetzt **eigene Ebene** `.notegrip` in `App.tsx` (nach den Pads in `.padlayer`), Lage aus `noteViewRects`/`noteRects` + `GAP`, Ziehen ruft `startNoteResize(e, id, edge)`; Aussehen wie `.grip::after` der Portale („Im Desk Mode ist das perfekt“); ↕ `margin-top: -6px` (2 px tiefer). Alte `::after` der `.pad__grip.is-border` aus, Schraffur der Ecke aus, `.padlayer.is-notes .pad { overflow: visible }`. `Edge` in `Pad.tsx` kennt jetzt auch `'nw'` und `startNoteResize` versteht es (wird derzeit nicht vergeben – kann bleiben).
   - „Wenn ich im Note Mode auf ein Pad klicke … wechseln die Fenster ihre Position“ → View 2 × 2 / 2 / Solo begann beim obersten Pad; Klick = oberstes = Rotation. Jetzt `viewStart` (beim Umschalten der View gemerkt), `setNotesView` setzt ihn.
2. **F-228 Stufe 2:** Cockpit-Kopf (`Overview.tsx`, `headOvf`, keep: `.overview__name, .overview__mode, .overview__x, .radar__filter`), Formulare (`ProjectForms.tsx`, `topOvf`, keep: `.dc__head, .pjf__chapter, .pjf__open`), Entscheidungen (`ProjectDecisions.tsx` › `Decisions`, keep: `.dc__head, .dc__scope`); CSS „V112 F-228 Stufe 2: Köpfe …“. StackBar: `float`/`unfloat` bei Hover/Fokus, `.is-ovf-long`, `OVERFLOW_TEXT.stackLong`. Pad-Fuß: kein Überlauf nötig (ein Knopf). Touren: `ovfReveal`/`ovfConceal`/`ovfBarsOf` in `Overflow.tsx`, genutzt in `Tour.tsx` (Messen nach 120 ms erneut); neue Texte `OVERFLOW_TEXT.cockpitHead/viewHead/padFoot/stackBar/stackLong`.
3. Handbuch V112 (Kapitel 2 Überlauf, 5 Notizen-Modus, Änderungsverzeichnis), Lastenheft F-228/F-229, `APP_VERSION = 'V112'`.

## Nächste Schritte

1. **Enrico fragen**, ob nach Neuladen (⌘+R) alles sitzt: Anfasser in der Lücke, Pad-Kopf ohne Überlappung, View-Klick. Seine Bilder um 09:49 zeigten noch den alten Stand (Hot Reload war nach einer Hook-Änderung hängen geblieben – Fehler „Should have a queue“ im Testbrowser, nach Neuladen weg).
2. **F-226 Stufe 2** (Testphase): Abnahmekriterien-Formular, AKV, DKI-Matrix, AP-Formular, Statusbericht, Kosten-Ganglinie, Report-Ausgabe PDF, Portfolios. Vorher F-226-Doc lesen.
3. F-228 Rest: Kurznamen im Rad „+ Sheet“ wieder lang, wenn der Pad-Kopf überläuft; senkrechte Lage auf echtem schmalem Fenster prüfen.
4. Dann Schritt 10 laut Stufenplan (Basisplan, Netzplan, F-220, Projekt-Desk).
5. **Prüfliste für Enrico** (alles aus V77–V111 plus):
   - Seite neu laden, dann `npm test` in `web/`.
   - Notizen-Modus 2 × 2 und Dashboard: runde Knöpfe ↔ ↕ ⤡ mittig in den Lücken, ↕ unter dem Fußknopf ohne Berührung, nichts verdeckt sie; Ziehen an den Knöpfen und an den Kanten.
   - View 2 × 2 / 2 / Solo: auf ein anderes Pad klicken → wird aktiv, nichts wechselt die Position.
   - Pad mit mehreren Sheets schmal ziehen: aktiver Reiter mit „…“, Knopf ▾ ganz sichtbar, ⧉ daneben, ✕.
   - Cockpit schmal (Fenster < ca. 1100 px): Kopf einzeilig mit „Cockpit“, Rad, Filter, ⧉ Zahl, ✕; Zeiger auf ⧉ → ganze Leiste schwebt.
   - Projekte › Formulare und Entscheidungen im schmalen Pad: Kopf knapp, Rad bleibt, ⧉ zeigt den Rest.
   - Kurzes Portal mit vielen Portalen im Stack: Zeiger auf die Stapel-Leiste → schwebt in voller Länge, alle Namen lesbar; Wegfahren klappt zurück.
   - Tour „Notizen & Aufgaben“ bei schmaler Kopfleiste: Schritte zum Knopf und zum Rad klappen die Leiste auf, danach wieder zu.

## Kleine Punkte (neu in V112)

- Testbrowser: Rad „Arbeitsweise“ steckt bei schmaler Kopfleiste im Überlauf; zuverlässig umschalten über Menü „Notizen & Aufgaben“ › Rad „Arbeitsweise“ fokussieren › Pfeil runter (Klick auf `.tb-mode` per Code wirkte nicht immer). Nach jeder Änderung an `Overflow.tsx`/`Overview.tsx` lädt die Seite neu – Testbelegung (Pads) neu anlegen.
- `.notegrip` sind `aria-hidden` wie die alten Streifen; Tastatur bleibt Alt/⌥ + Umschalt + Pfeil (Grenze wandern).
- `spillNeed` wird nur bei Inhaltsänderungen (MutationObserver childList/characterData) zurückgesetzt; wird eine Leiste breiter, ohne dass sich ihr Inhalt ändert, geht sie trotzdem wieder auf, sobald `avail` > `spillNeed`.
- Stapel-Leiste schwebend: Bedarf geschätzt mit 23 px je Eintrag; bei sehr vielen Portalen bleibt die Liste darin scrollbar (Bildschirmhöhe).
- Overview: Der Kopf bricht nicht mehr in eine zweite Zeile um, wenn er knapp ist – die alte Regel für 761–1280 px (nur Symbole) gilt weiter, darunter greift der Überlauf.
- Tour-Ziele im Überlauf zählen für `tourSteps` als sichtbar; liegt ein Ziel in einer Leiste mit `off`, bliebe es unsichtbar (kommt derzeit nicht vor).

## Commit-Text V112 (e-sources)

**Summary:** `V112: Überlauf für Cockpit, Formulare, Entscheidungen und Stapel-Leiste, Touren öffnen den Überlauf, Anfasser im Notizen-Modus in der Lücke, View verspringt nicht mehr`

**Description:**
```
- F-228 Stufe 2: Überlauf für Cockpit-Kopf und Köpfe von Formularen und Entscheidungen, Stapel-Leiste schwebt in voller Länge, Touren klappen Leisten mit ihrem Ziel auf und wieder zu
- Überlauf sicherer: tatsächliches Überlaufen macht knapp (ohne Pendeln), aktiver Sheet-Reiter kürzt mit „…“, Knopf ▾ nie abgeschnitten
- F-229: Anfasser im Notizen-Modus als runde Knöpfe mittig in der Lücke über allen Pads (wie im Desk-Modus), nichts verdeckt sie, sie verdecken nichts
- View 2 × 2/2/Solo im Notizen-Modus: Klick auf ein Pad aktiviert nur, die Belegung bleibt
- Handbuch V112, Lastenheft F-228/F-229, Übergabe V112

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q5GfSgjRVasiRgwosj
```
