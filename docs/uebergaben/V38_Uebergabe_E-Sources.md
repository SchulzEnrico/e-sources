# Übergabe V38 → V39 E-Sources

Stand: 23.11.2026 · Chat V38 abgeschlossen · Nächster Chat: **V39 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V39 E-Sources**. Lies diese Übergabedatei und das Lastenheft unter `docs/Lastenheft/Lastenheft_E-Sources.md`. F-51/F-52 (Layouts, Standard je Gerät, mehr Slots per Nachfrage) sind fertig. Als Nächstes **F-187** (Layouts im Cockpit mit Vorschau, Standard-Layout in eigenem Dialog – siehe Lastenheft), danach **F-06** (Portale pausieren). Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft:** `docs/Lastenheft/Lastenheft_E-Sources.md` (162 Einträge: **103 fertig, 12 teilweise, 1 ersetzt, 46 offen**). Offen aus V27: Claude Doc https://claude.ai/artifact/5LcrJ6JwXyEvUMcJjZQRY8 nicht nachgezogen – klären, ob es noch gilt.
- **Benennung – Ergebnis:** https://claude.ai/artifact/5Di2hzfovkm1NcmV3bocdp
- **Geschichte der Anwendung:** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – Ausblick noch nicht nachgezogen (F-151 bis F-186)
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`

## Was in V38 passiert ist

- V37 war committet (0e9a782). **V38 ist noch nicht committet** – Enrico committet und pusht (Vorschlag: „Layouts je Desk F-51, Standard je Gerät und mehr Slots per Nachfrage F-52; Übergabe V38“).
- **F-51 ✓** – `workspace/deskLayouts.ts`: Das aktive Layout steht wie bisher direkt in der Arbeitsfläche; nur nicht aktive liegen als Vorrat in `Workspace.deskLayouts[win]` (`{ active, list: [{ id, name, saved? }] }`, `saved` = `LayoutContent` mit panels ohne `win`, layouts/preferred ohne Desk-Vorsilbe, areaNames). Funktionen: `layoutsOf`, `activeLayout`, `switchLayout`, `addLayout` ('current' | 'even'), `copyLayout`, `renameLayout`, `deleteLayout`/`restoreLayout`, `takeOut`/`putIn`/`cloneContent`/`evenContent`, `rescueEmptyDesks` (im Reducer vor `syncWindows`), `LAYOUT_MAX = 12`. `storage.ts` prüft `deskLayouts` und behält Sammlungen zu Portalen in gespeicherten Layouts; `syncWindows` räumt Layouts weggefallener Desks mit ab. Dialog `components/DeskLayouts.tsx` (Zahnrad › „Layouts …“, Name des aktiven daneben; Hilfe-Eintrag `layouts`, Symbol `layouts`). Menüpunkt „Layout zurücksetzen“ heißt jetzt „Anordnung zurücksetzen“.
- **F-52 ✓** – `workspace/device.ts` (localStorage `esource.device.standard`; `PORTAL_MIN_PX` 240 × 160; `SLOTS_MAX = 36` in screen.ts). Standard wählen im Dialog („Als Standard“, „Gleichmäßig als Standard“, „Auf Standard zurücksetzen“ mit Rückfrage und Rückgängig); `+ NewDesk` startet mit Kopie des Standards (`addDeskWith`, Reducer `addDesk` mit `std`). Mehr Slots als empfohlen (siehe Entscheidung 4): `ScreenSetup.capacity` = 2 × Klasse → `ScreenSpec.max` nur für NewSlot/`canAddArea`/`tryPlace`; Automatik bleibt bei `spec.capacity`; `fitSlots`/`setArrangement` (Reducer `fitSlots`, `setArrangement`). `normalize` verteilt erst ab mehr als 36 Slots neu (vorher schon über der Klassenzahl).
- Texte in `DESK_LAYOUT_TEXT` (terms.ts). Tests: 15 neue → **218 grün**; `tsc --noEmit` sauber. Geprüft im eingebauten Browser (`?test=voll`): anlegen (Gleichmäßig, Kopie), wechseln mit vollständiger Rückkehr, umbenennen, kopieren, löschen + Rückgängig, Esc mit Fokus zurück, Suche findet Fragen; mehr Slots (Laptop: Rückfrage, 5. und 6. Slot ok, „Auf 4 Slots zurück“ + Rückgängig), Standard setzen, zurücksetzen + Rückgängig. Gerätemerker danach wieder gelöscht.

## Entscheidungen Enrico (V38, umgesetzt)

1. Neuer Desk startet mit „Gleichmäßig“ (N leere Portale) – ja.
2. „Alles ins Main Desk“ bei Desk mit weiteren Layouts: **nachfragen** (umgesetzt, `returnAll` mit `dissolve`).
3. Nicht aktive Layouts = gespeichert, nirgends offen – zählen nicht für Fokus usw. (erklärt, keine Einwände bisher).
4. **Statt Schalter „Grenzen aufheben“:** NewSlot fragt ab der Empfehlung nach („Trotzdem anlegen“), höchstens doppelt so viele Slots; Knopf „Auf n Slots zurück“ in der Kopfleiste, solange mehr als empfohlen (umgesetzt und im Browser geprüft, 218 Tests grün). Der Schalter und `limitsOff`/`freeCapacity` sind entfernt.

## Nächste Schritte

1. **F-187** – Wunsch Enrico am Ende von V38: Layouts übersichtlich im Cockpit, je Layout eine kleine Vorschau der Anordnung (wie die Mini-Ansicht oben links), ein Klick wechselt; Standard-Layout (Als Standard, Gleichmäßig, Auf Standard zurücksetzen) aus dem Dialog „Layouts …“ herauslösen in einen eigenen Dialog „Standard-Layout …“. Vorher kurz mit Enrico klären, was „oben links“ genau meint (Desk-Anzeige/Logo-Bereich oder Radar im Cockpit) und ob der Dialog „Layouts …“ im Zahnrad bleibt.
2. **F-06** (Portale pausieren) – passt zu F-51: nicht aktive Layouts laden ohnehin nichts.
3. Danach nach Lastenheft (F-116 Space/Case mit F-53 Vorlagen – „Jedes eigene Layout als Vorlage speichern“ baut auf `cloneContent` auf).

## Kleine Punkte

- Neu: Dialog „Layouts“ – „Wechseln“ steht in eigener Zeile unter dem Namen, Portalzahl rechts; Liste wird bei vielen Layouts lang (Design).
- Neu: Layout wechseln nur über Zahnrad › „Layouts …“ (oder Suche); kein Tastenkürzel, kein Schnellwechsel im Cockpit.
- Neu: NewSlot über der Empfehlung – „Gleich verteilen“ gleicht nur Anteile im Teilungsbaum an (kein echtes Raster); der neue Slot bleibt deutlich größer als die anderen (z. B. 5. Slot = halbe Fläche). Echtes Raster wäre schöner.
- Neu: „Auf n Slots zurück“ zeigt bei schmaler Kopfleiste nur das Symbol (Name im Tooltip/aria-label); verteilt ganz neu (eigene Stacks gehen in die Grundverteilung, Rückgängig im Hinweis).
- Neu: Die neue Rückfrage (`ask`, alertdialog) ist allgemein nutzbar – könnte auch andere Bestätigungen übernehmen.
- Neu: Wird eine Kategorie gelöscht, behalten Portale in nicht aktiven Layouts die alte Id (beim nächsten Laden fällt sie nur bei aktiven Portalen weg).
- Neu: Der Gerätemerker (Standard-Layout) wird auch im Testmodus echt gespeichert – nach Tests zurückstellen.
- Neu: Rückgängig für Löschen/Zurücksetzen von Layouts gibt es nur, solange der Dialog offen ist.
- Aus V37: Knopf im Hinweis unten (z. B. „Später“, „Hebel ziehen“) per Tastatur gewählt → Hinweis verschwindet, Fokus fällt auf `body` (gilt für alle Hinweis-Knöpfe). Fokus sinnvoll zurückgeben.
- Aus V37: Die Einladung kann von einem späteren Hinweis überdeckt werden (es gibt nur einen Hinweis zugleich); dann kommt sie erst nach der Pause wieder.
- Aus V37: `?test=leer` ist **kein** Testmodus – dort steht Enricos echte Belegung. Für kleine Ausgabe beim ersten Öffnen trotzdem gut, aber nichts anfassen; dann `goto(...?test=slot)` bzw. `?test=voll`.
- Lastenheft Zeile „F-170: die zwei Ergänzungen zur Einladung in eine zusammenfassen“ (Zusammenführen) ist noch nicht erledigt – nur Text.
- Aus V37: Tour-Hinweisfenster mit Zusatzknopf (z. B. „Farben zeigen“, Import „Datei wählen …“) bricht „Weiter →“/„Fertig“ in eine zweite Zeile um – Breite oder Reihenfolge der Knöpfe anpassen.
- Aus V37: Slotmaschine – „Zurückholen“ geht über „Zuletzt geschlossen“ einzeln; ein gemeinsames „Alles zurück“ fehlt. „Zuletzt geschlossen“ zeigt nur 10 Einträge je Desk.
- Aus V37: Slotmaschine zählt nur gleiche Adressen (wie sameUrl); dieselbe Seite mit anderem Anker oder Parameter gilt als verschieden.
- Aus V37: Bei vielen Duplikaten sagt die Ersparnis-Zeile (`role=status`) jede Änderung an den Haken an – bei Bedarf drosseln.
- Aus V37: Im Browser-Test geht `keyboard.press('Control+.')` nicht – Cockpit über Klick auf `.toolbar .focus-meter` öffnen.
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

**Tests in Claudes VM:** vitest geht nicht. Ersatzmodul neu anlegen (in V38 wieder neu angelegt, mit toBeTruthy/toBeFalsy/toBeLessThan) in `$HOME/vt2/node_modules/vitest/index.js` (exportiert auch `vi`, `beforeEach`, `afterEach` als Platzhalter) (describe/it/expect mit toBe, toEqual, toMatchObject, toBeDefined, toBeUndefined, toBeNull, toBeGreaterThan, toContain, toHaveLength, `.not`; Ausführung in `process.on('beforeExit')`), dann in `web/`: `npx tsc --outDir $HOME/vt2/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node src/workspace/*.ts` und `NODE_PATH=$HOME/vt2/node_modules:$PWD/node_modules node $HOME/vt2/out/workspace.test.js`. Meldungen zu `.at`/`import.meta` sind harmlos. Hilfe-Texte dürfen nicht mit „Wort = …“ beginnen (Test F-156); jeder Hilfe-Eintrag braucht ein Symbol in `HELP_ICON`.

## Arbeitsregeln

Wie V15–V37: Funktion vor Design · Barrierefreiheit immer (NF-03) · Begriffe erklären (Texte nur in terms.ts/help.ts) · offene Punkte im Blick, Restplatz mit kleinen Punkten füllen · Lastenheft zuerst · Sammelmodus `>START` … `<ENDE` · Terminal: nur nächster Schritt · „PO“ = Push Origin · Übergabe spätestens bei 60–70 %, nie mitten in einer Aufgabe · Datei `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/` · Usability: so einfach und wirksam wie möglich für den Anwender.
