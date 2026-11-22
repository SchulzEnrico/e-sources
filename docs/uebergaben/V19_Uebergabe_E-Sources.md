# Übergabe V19 → V20 E-Sources

Stand: 22.11.2026, 13:45 Uhr · Chat V19 abgeschlossen · Nächster Chat: **V20 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V20 E-Sources**. Lies diese Übergabedatei und das Lastenheft (Link unten). Prüfe kurz im Browser (`localhost:2910`, Demo und `?test=voll`, auch schmal ≈ 375–700 px): Hilfe (?), Suche nach „Größe“/„Tour“, Tour über Einstellungen → „Tour starten“. Dann weiter mit **F-172 Tour „Cockpit“** (tour.ts auf mehrere Touren umbauen), danach **F-159** und **F-160 Stufe 2**. Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft (verbindlich):** https://claude.ai/artifact/5Lcrj6JwXyEvUMcJjZQRY8 – neu F-168 bis F-172
- **Benennung – Ergebnis:** https://claude.ai/artifact/5Di2hzfovkm1NcmV3bocdp
- **Geschichte der Anwendung:** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – Ausblick-Liste noch nicht nachgezogen (F-151 bis F-172)
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`
- Frühere Übergaben: `docs/uebergaben/V01` bis `V18_Uebergabe_E-Sources.md`

## Was in V19 passiert ist

- **Sichtprüfung V18:** Kopfleiste, ⇄, „+ NewDesk“, Ampelfarben ok. Behoben: Test-Schild (`?test=voll`) war viertes Rasterelement der Kopfleiste und machte sie zweizeilig → jetzt außerhalb des `header`, unten links (`.probe` fixed).
- **„+ NewSlot“ ampelfarbig auch gesperrt** (Bildschirm voll): Plus in Farbe „+1 Portal“, Rahmen gestrichelt, Schrift blass (`.tb-newslot.is-off`); Rahmen 30 % Farbe über `--fx-slot` an `.tb-center`. Leerzustand-Knopf ebenfalls ampelfarbig.
- **F-156 Hilfe in der Suche – umgesetzt:** `workspace/help.ts` (HELP: Begriffe aus TERMS + Funktionen mit Kürzel, Suchwörtern, `run`; `searchHelp` mit Umlaut-Faltung, Rang Name › Suchwort › Text). Suche (`Search.tsx`) zeigt Gruppe „Funktionen & Hilfe“: Enter führt aus, Umschalt+Enter öffnet Hilfe an der Stelle, Begriffe immer Hilfe. Hilfe-Knopf (?) und Taste `?`; `components/Help.tsx` = native `<dialog>` mit Filter, Gruppen, „Ausführen“. `runHelp` in App.tsx (cockpit, view, adjust, distribute, maximize, newSlot, newDesk, search, tour). `cycleView`/`addNewDesk` herausgezogen.
- **F-95 Tour – umgesetzt:** `workspace/tour.ts` (TOUR, `tourSteps` überspringt fehlende Ziele, `tourSeen`/`setTourSeen`, Schlüssel `esource.tour.v1`), `components/Tour.tsx` (Rahmen am Element, Hinweisfenster unter/über/seitlich, → ← Esc, Fokus auf „Weiter“, je Schritt eigener Dialog). Startet einmal beim ersten Start (nicht PROBE, nicht Zusatz-Desk); wieder über Einstellungen → „Tour starten“, Hilfe, Suche. Nach Test Enrico: größere Schrift (16/20 px), neutrale statt roter Akzente (`--tint`), Stack klappt im Schritt auf (`expand`, `.stack.is-open` in CSS), Hinweis daneben.
- **Hilfe-Dialog nach Test Enrico neu gestaltet:** neutral statt Rot, Gruppen mit Trennlinie, Einträge zweispaltig (Name + Kürzel links, Erklärung rechts, unter 560 px einspaltig), „Ausführen“ nur bei Zeiger/Tastaturfokus sichtbar (per Tab erreichbar, auf Touch immer sichtbar), größere Schrift.
- **help.ts:** `def()` ergänzt fehlenden Punkt am Ende der TERMS-Texte.
- **Lastenheft neu:** F-168 Hinweis „Neue Version verfügbar“ (Startbildschirm-App lädt nicht neu) · F-169 Desks zwischen Geräten abgleichen (Startbildschirm-App hat eigenen Speicher) · F-170 Easteregg Slotmaschine (Duplikate finden; Ergänzung: Einladung bei schwachem Fokus, vielen Duplikaten, redundanten Slots – im Eintrag stehen zwei Ergänzungen hintereinander, ggf. zusammenführen) · F-171 Tour „Design anpassen“ (nach F-161–F-164) · F-172 Tour „Cockpit“. F-95 und F-156 als umgesetzt vermerkt.
- Tests 127/127 (Ersatz-vitest), Typprüfung grün. Alles committet und gepusht (letzter Commit: F-95 Tour).

## Noch zu committen

- Dateien: `web/src/App.css`, `web/src/workspace/help.ts`, diese Übergabe.
- Summary: „Hilfe-Dialog ruhiger und übersichtlicher (neutral statt Rot, Name links/Erklärung rechts); Übergabe V19“

## Nächste Schritte

1. Sichtprüfung (siehe Startanweisung).
2. **F-172 Tour „Cockpit“**: tour.ts auf mehrere Touren umbauen (`TOURS.start`, `TOURS.cockpit`, später `TOURS.design`; je Tour eigener Merker), Tour.tsx bekommt die Schritte als Prop; Start beim ersten Öffnen des Cockpits, Knopf im Cockpit, Einträge in help.ts.
3. **F-159** Main Desk ohne Knopf-Look, **F-160 Stufe 2** (sammeln/verteilen, Tastenkürzel); TERMS.desk anpassen (→ Hilfe und Tour ziehen automatisch mit).
4. Farben: F-161 → F-162 → F-163 → F-164, danach F-171 Tour Design.
5. Danach: „Doppelte Tabs finden“ als nüchterne Funktion (Grundlage F-170), F-168, F-157, F-158; offen aus F-154: Lastenheft-Titel und ältere Einträge; F-27, F-06, F-29 Einstellungen, F-104 Kanban.

## Kleine Punkte

- Lastenheft F-156 nennt im Beispiel noch „Größen-Modus · Strg/⌘+Umschalt+G“ (richtig: Adjust · Alt/⌥+A).
- Suche: Nach Ausführen einer Funktion bleibt der Suchtext stehen – ggf. leeren.
- Hilfe-Dialog: Platz für das ausgeblendete „Ausführen“ bleibt frei (leichte Lücke unter Einträgen mit Kürzel).
- Fokus je Desk nutzt dieselben Grenzen wie der Gesamtfokus (Rückfrage an Enrico offen).
- README nennt noch alte Begriffe. Punkte aus V16–V18 „Kleine Punkte“ gelten weiter.
- Vorfall: Während der Arbeit an F-156 wurde App.tsx von außen geändert (vermutlich beim Umbenennen des Chats eine wiederholte Aktion). Vor größeren Änderungen `git status`/Zeitstempel prüfen; Chat nur umbenennen, wenn Claude gerade nicht arbeitet.

## Technische Rahmenbedingungen

Dev-Server bei Enrico auf `localhost:2910`, im eingebauten Browser erreichbar (`setViewportSize` für Breiten-Tests). Tests in der VM: Ersatz-vitest unter `~/vt/node_modules/vitest/index.js` (describe/it/expect: toBe, toEqual, toHaveLength, toContain, toMatchObject, toBeTruthy, toBeGreaterThan, toBeLessThan, not) – fehlt er, neu anlegen; dann `node_modules/.bin/tsc --outDir ~/vt/out --module commonjs --target es2022 --moduleResolution node --esModuleInterop --skipLibCheck src/workspace/*.ts`, `cp -r ~/vt/node_modules ~/vt/out/`, react nach `~/vt/out/node_modules/` verlinken, `node workspace.test.js`. Echtes vitest läuft in der VM nicht (rollup-Binärdatei für macOS). Git nur bei Enrico (GitHub Desktop).

## Arbeitsregeln

Wie V15–V18: Funktion vor Design · Barrierefreiheit immer (NF-03) · Begriffe für Anwender erklären (Texte nur in terms.ts/help.ts) · offene Punkte im Blick, Restplatz mit kleinen Punkten füllen · Lastenheft zuerst (ab F-173) · Sammelmodus `>START` … `<ENDE` · Terminal: nur nächster Schritt · Übergabe spätestens bei 60–70 %, nie mitten in einer Aufgabe · Datei `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/`.
