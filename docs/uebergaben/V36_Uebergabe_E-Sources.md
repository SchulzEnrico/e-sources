# Übergabe V36 → V37 E-Sources

Stand: 22.11.2026, Abend · Chat V36 abgeschlossen · Nächster Chat: **V37 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V37 E-Sources**. Lies diese Übergabedatei und das Lastenheft unter `docs/Lastenheft/Lastenheft_E-Sources.md`. F-171 ist fertig, F-170 Stufe 1 (Slotmaschine) ist fertig. Als Nächstes **F-170 Stufe 2** (Einladung zur Runde, redundante Slots). Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft:** `docs/Lastenheft/Lastenheft_E-Sources.md` (161 Einträge: **100 fertig, 13 teilweise, 1 ersetzt, 47 offen**). Offen aus V27: Claude Doc https://claude.ai/artifact/5LcrJ6JwXyEvUMcJjZQRY8 nicht nachgezogen – klären, ob es noch gilt.
- **Benennung – Ergebnis:** https://claude.ai/artifact/5Di2hzfovkm1NcmV3bocdp
- **Geschichte der Anwendung:** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – Ausblick noch nicht nachgezogen (F-151 bis F-186)
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`

## Was in V36 passiert ist

- V35 war schon committet (992aae0). F-171 Stufe 2 hat Enrico mitten im Chat committet und gepusht.
- **F-171 ✓ Tour „Design“ Stufe 2 + neue Tour „Farben“:**
  1. `tour.ts`: Design-Tour 7 Schritte (neu: `tints` am Abschnitt `.design__tints`, `more` mittig mit `action: 'Farben zeigen'`, `again` am Knopf „Tour“). Neue TourId `colors` (Selektor `dialog.colors`): intro, portal, slot, category (`#colors-cat`), catColors (`.colors__row:has(#colors-cf)`) bzw. catNone (`unless`), icon (`.colors__icons`), order, rules (`action: 'Regeln zeigen'`). Merker `esource.tour.colors.v1`.
  2. App.tsx: `startColorsTour` (schließt Design, öffnet Farben fürs aktive Portal, startet Tour), `showRulesFromTour` (Cockpit mit Regeln). Autostart beim ersten Öffnen von „Farben“, nicht aus der Kategorie-Frage (`colorsCat`). Tour läuft als children im Colors-Dialog (top layer). Colors.tsx: Knopf „Tour“, `onTour`, `children`.
  3. help.ts: Eintrag `tourColors` (Run, Symbol, Frage); `tourDesign`/`colors` ergänzt.
- **F-170 ◐ Stufe 1 Slotmaschine:**
  1. `workspace/jackpot.ts`: `duplicatesOf(ws, here)`, `cleanupOf(ws, groups, skip)`, `afterCleanup`, `cleanupFocus`. `bookmarks.ts`: neu `sameUrlKey()` (sameUrl nutzt es).
  2. `components/SlotMachine.tsx`: Dialog mit Hebel, drei Walzen (Intervall 70 ms, Stopps 700/1050/1400 ms, reduzierte Bewegung → sofort), Ergebnis als `role=status`, Liste je Source mit Haken (je 3 Fundorte, „+ n weitere zeigen“), Ersparnis, Knopf „n Duplikate schließen“. CSS-Block „F-170“ am Ende von App.css.
  3. App.tsx: `jackpot`-State, `cleanupDuplicates` (dispatch closeTab / remove mit Setup des Desks → landet in „Zuletzt geschlossen“), Alt/⌥+J im `cycleKeyRef`, Run `jackpot`. Overview.tsx: `onJackpot`, kleiner Hebel-Knopf `.overview__jackpot` im Kopf (nur Symbol, nicht in der Regelansicht). Texte `JACKPOT_TEXT` und `TERMS.jackpot`; Symbol `jackpot`; Hilfe-Eintrag `jackpot` mit 2 Fragen.
- **Slotmaschine wie ein echter Automat (Wunsch Enrico):** rotes Gehäuse mit Goldrand, Leuchtschrift „Jackpot“ mit Lauflichtern (schneller beim Drehen, Blinken bei Gewinn), Walzenfenster mit drei gewölbten Walzen (je 3 Felder, Webseiten-Symbole als „Früchte“, im Ruhezustand 7-7-7), rote Gewinnlinie, Walzen rollen als Band (`slot-roll`) und federn beim Stopp nach (`slot-settle`), Hebel an der Seite klappt beim Ziehen runter (Klick auf den Hebel zieht auch; der echte Knopf darunter bleibt für Tastatur), bei Gewinn Münzregen und goldenes Leuchten. Alle Bewegungen nur bei `prefers-reduced-motion: no-preference`; Gehäuse aria-hidden. CSS-Block „F-170: Gehäuse …“ am Ende von App.css (Klassen `slot__*`).
- **Testseite `?test=slot`** (Wunsch Enrico): `probe.ts` – `PROBE_KIND` ('voll' | 'slot'), `slotWorkspace()`: 2 Desks, 11 Portale mit gezielten Duplikaten (Hamburg 3×, Hafen 3× inkl. zweimal im selben Portal mit „/“ am Ende, Elbphilharmonie, MDN, GitHub, wikipedia.org je 2×; Elbe und hamburg.de einmalig). Nichts wird gespeichert; Hinweis unten links „Test: slot“. Ergebnis: 8 Duplikate von 6 Sources, spart 6 Punkte (gelb → grün).
- Walzen zeigen Favicon + Seitenname (`reelLabel`: letzter Pfadteil, sonst Domain), Liste zeigt Domain mit Pfad (`sourceLabel`). Favicons folgen der Einstellung „Symbole der Webseiten“ (aus = Anfangsbuchstabe).
- Tests: 5 neue → **201 grün**; `tsc --noEmit` sauber. Geprüft im eingebauten Browser (`?test=voll`): ganze Tour-Kette Design → Farben → Regeln; „Tour Farben“ über die Suche; Slotmaschine über Cockpit und Alt+J, Abwählen, Schließen (900 → 834,5 Punkte), zweite Runde.

## Nächste Schritte

1. Enrico: committen (Vorschlag: „Slotmaschine F-170 Stufe 1: Duplikate finden und schließen; Übergabe V36“) und pushen.
2. F-170 Stufe 2: Einladung zur Runde (Hinweis mit „Hebel ziehen“/„Später“ bei Fokus rot oder vielen Duplikaten; nicht aufdringlich; als eingebaute Regel im Cockpit abschaltbar, siehe `rules.ts`), dazu redundante Slots (alle Portale eines Slots zeigen dieselbe Source) mit Angebot zum Zusammenlegen. Schwellen festlegen (Vorschlag: ab 3 Duplikaten).
3. Danach weiter nach der Reihenfolge im Lastenheft (F-51/F-52, F-06).

## Kleine Punkte

- Neu: Tour-Hinweisfenster mit Zusatzknopf (z. B. „Farben zeigen“, Import „Datei wählen …“) bricht „Weiter →“/„Fertig“ in eine zweite Zeile um – Breite oder Reihenfolge der Knöpfe anpassen.
- Neu: Slotmaschine – „Zurückholen“ geht über „Zuletzt geschlossen“ einzeln; ein gemeinsames „Alles zurück“ fehlt. „Zuletzt geschlossen“ zeigt nur 10 Einträge je Desk.
- Neu: Slotmaschine zählt nur gleiche Adressen (wie sameUrl); dieselbe Seite mit anderem Anker oder Parameter gilt als verschieden.
- Neu: Bei vielen Duplikaten sagt die Ersparnis-Zeile (`role=status`) jede Änderung an den Haken an – bei Bedarf drosseln.
- Neu: Im Browser-Test geht `keyboard.press('Control+.')` nicht – Cockpit über Klick auf `.toolbar .focus-meter` öffnen.
- Aus V35: Fragen stehen nur an Hilfe-Einträgen; neue Funktionen brauchen beim Anlegen gleich passende Fragen (sonst fehlen sie in den Vorschlägen).
- Aus V35: In der Suche führt Enter auf eine Frage nie die Funktion direkt aus, sondern zeigt die Antwort (dort „Ausführen“). Bei Bedarf Umschalt+Enter = ausführen ergänzen.
- Aus V35: Fragen in der Suche kommen über Tippfehler nicht hinweg (kein unscharfes Suchen).
- Aus V35: Webseiten-Symbole stehen noch nicht im Launcher, im Cockpit (Portal-Liste) und an den Tabs – nur Library und Suche.
- Aus V35: Kompakt blendet nur Kopfleiste, Cockpit-Knöpfe und den Kategorienamen im Portal aus; Portal-Kopfzeile und Menüs bleiben beschriftet.
- Aus V35: Im Portal-Kopf stehen noch Unicode-Zeichen (← → ⟳ ⌂ und die Zieh-Griffe ↔ ↕ ⤡, Stack ▲▼) – bei Bedarf auch auf den Satz umstellen.
- Aus V35: Favicon wird bei jedem Neuladen neu geholt (Browser-Cache); kein eigener Zwischenspeicher.
- Aus V33: Symbole bei Menü/Suche sind `display: inline-block` (global ist `.icon` block) – neue Einsatzorte darauf achten (in V34 zweimal passiert).
- Aus V32: Regeln im Cockpit gelten für alle Desks; Farbregel nur für vorhandene Kategorien; „Seite → Kategorie“ ausgeschaltet bleibt aus nach neuer Antwort; Rückgängig nur für die letzte Löschung.
- Aus V31 (Auswahl): Kategorie bleibt bei anderer Seite; Hinweis per Tastatur knapp (8/12 s); Library-Liste ohne Kategorie-Farben (`.bm-cat`); Kategorie-Farbe desk-übergreifend; Slot-Farbe hängt am Slot-Namen; keine Ansage beim Farbwählen; Kopfleiste/Hintergrund je Desk ohne eigene Farben.
- Aus V29: F-185 eigener Filter fehlt; Browsername beim Import fehlt; „wer“ bei Workspace-Import; Texte in Search.tsx/Launcher.tsx nicht in terms.ts; F-159 hell prüfen.
- Aus V28: Alt/⌥+K wirkt nicht im iframe; Ansage „gesammelt“ nur im Fenster mit Main Desk; 75 s bis hart beendete Fenster als gesammelt gelten; Portale bauen sich beim Desk-Wechsel neu auf (mit F-06).
- Aus V27: Hinweis „Neue Version“ überdeckt im Testmodus „Test: voll“; kein Service Worker; `npm run build` / `web/dist/version.json` noch nicht bestätigt.
- Aus V26: siehe Liste in `V31_Uebergabe_E-Sources.md`.


## Technische Rahmenbedingungen

Git nur bei Enrico (GitHub Desktop). Repo-Ordner per Ordnerzugriff freigeben (`~/Projects/e-sources`). Dev-Server `npm run dev`, http://localhost:2910, im eingebauten Browser erreichbar; Änderungen über device_bash kommen per Hot Reload an. Testen mit `?test=voll` (Slotmaschine: `?test=slot`) (nichts wird gespeichert; Testbelegung ohne Kategorien – über ⋮ → Farben → „Neue Kategorie …“). Im eingebauten Browser: **nie die ganze Seite als ariaSnapshot ausgeben** – auch `browser.tabs.get()`/`create()` geben die ganze Seite aus (riesig, in V35 rund ein Viertel des Chats). `tabs.create("about:blank")` geht nicht, solange der Browser zu ist. Besser: wenn schon ein Tab offen ist, `browser.tabs.list()` und `browser.tabs.switch(id)` nur einmal; sonst `tabs.create` mit der Adresse **ohne** `?test=voll` (leere Belegung = kleine Ausgabe) und danach `tab.page.goto(...?test=voll)`. Danach nur Teilbereiche (`locator(...).ariaSnapshot({depth:1})`). Einstellungen: `getByRole('button',{name:'Einstellungen', exact:true})`. Nach Änderungen an JSX **immer `npx tsc --noEmit -p .` in `web/`** – ein fehlender Import ergibt sonst eine schwarze Seite.

**Tests in Claudes VM:** vitest geht nicht. Ersatzmodul neu anlegen (V36: auch toBeTruthy/toBeFalsy/toBeLessThan ergänzt) in `$HOME/vt2/node_modules/vitest/index.js` (exportiert auch `vi`, `beforeEach`, `afterEach` als Platzhalter) (describe/it/expect mit toBe, toEqual, toMatchObject, toBeDefined, toBeUndefined, toBeNull, toBeGreaterThan, toContain, toHaveLength, `.not`; Ausführung in `process.on('beforeExit')`), dann in `web/`: `npx tsc --outDir $HOME/vt2/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node src/workspace/*.ts` und `NODE_PATH=$HOME/vt2/node_modules:$PWD/node_modules node $HOME/vt2/out/workspace.test.js`. Meldungen zu `.at`/`import.meta` sind harmlos. Hilfe-Texte dürfen nicht mit „Wort = …“ beginnen (Test F-156); jeder Hilfe-Eintrag braucht ein Symbol in `HELP_ICON`.

## Arbeitsregeln

Wie V15–V35: Funktion vor Design · Barrierefreiheit immer (NF-03) · Begriffe erklären (Texte nur in terms.ts/help.ts) · offene Punkte im Blick, Restplatz mit kleinen Punkten füllen · Lastenheft zuerst · Sammelmodus `>START` … `<ENDE` · Terminal: nur nächster Schritt · „PO“ = Push Origin · Übergabe spätestens bei 60–70 %, nie mitten in einer Aufgabe · Datei `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/` · Usability: so einfach und wirksam wie möglich für den Anwender.
