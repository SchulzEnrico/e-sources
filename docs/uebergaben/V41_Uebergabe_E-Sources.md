# Übergabe V41 → V42 E-Sources

Stand: 23.11.2026 · Chat V41 abgeschlossen · Nächster Chat: **V42 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V42 E-Sources**. Lies diese Übergabedatei und das Lastenheft unter `docs/Lastenheft/Lastenheft_E-Sources.md`. F-06 Stufe 1 (Verdecktes pausieren) und F-189 Stufe 1 (Web-Suche, Links hineinziehen) sind fertig. Als Nächstes **F-189 Stufe 2** („An E-Sources senden“). F-188 wartet auf Enricos Entscheidung. Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft:** `docs/Lastenheft/Lastenheft_E-Sources.md` (165 Einträge: **104 fertig, 14 teilweise, 1 ersetzt, 46 offen**). Offen aus V27: Claude Doc https://claude.ai/artifact/5LcrJ6JwXyEvUMcJjZQRY8 nicht nachgezogen – klären, ob es noch gilt.
- **Benennung – Ergebnis:** https://claude.ai/artifact/5Di2hzfovkm1NcmV3bocdp
- **Geschichte der Anwendung:** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – Ausblick noch nicht nachgezogen (F-151 bis F-189)
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`

## Was in V41 passiert ist

- V40 war committet (9ddd151). **Noch nicht committet:** alles aus V41 (Vorschlag: „Verdecktes pausieren (F-06 Stufe 1); Web-Suche und Links hineinziehen (F-189 Stufe 1); Übergabe V41“).
- **F-06 Stufe 1 ◐** – `workspace/pause.ts` (rein: `track`, `awake`, `keysOf`, `visibleKeys`, `setPause`, `toggleKeep`, `PAUSE_CHOICES` 5/10/30/60/0, Voreinstellung 10) und `workspace/usePause.ts` (Hook, Takt 30 s). Schlüssel: Portal-Id bzw. `panel/tab`. Merker: null = sichtbar, Zahl = verdeckt seit, fehlt = nie gesehen (lädt nicht). App: `pauseShown` je Mode, `isAwake(key, keep)`; im Dashboard rendert jede Kachel alle Stack-Mitglieder in `.tile__layer` (hinten `.is-back`, `display:none`), solange wach. PanelFrame: Prop `awake(tabId)` (iframe nur für aktiven oder wachen Tab), `onKeep` → Menü ⋮ „Nicht pausieren“ (menuitemcheckbox, Symbol `pause`). StackBar: `paused(m)`. Pausiert: `.tab--paused`, `.stack__item--paused` (blass/kursiv) mit `aria-description` und Tooltip. Workspace `pause?`, PanelMeta `keep?`; Reducer `pause`, `keepPanel`. Einstellung im Zahnrad „Verdecktes pausieren“. Hilfe `pause`. Test-Belegung: beim Start 10 statt 90 iframes.
- **F-189 neu, Stufe 1 ◐** (Wunsch Enrico): Google lässt sich nicht einbetten; Googles Such-Element nur noch ≤ 50 Domains für neue Suchmaschinen, JSON-API zu für Neukunden und endet 1.1.2027. Darum: `workspace/websearch.ts` (`ENGINES` Google/DuckDuckGo/Ecosia/Bing, `looksLikeAddress`, `searchUrl`, `setEngine`); Workspace `engine?`, Reducer `engine`; Zahnrad „Suchmaschine“. Adresszeile: Vorschlagsliste (`.addrsug`, combobox; „Öffnen: …“ bei Adresse, `searchAll` aus der Library, zuletzt Web) – nach Rückmeldung Enrico nicht mehr sofort googeln. Web-Suche öffnet über `openBeside` (websearch.ts) ein eigenes Fenster rechts daneben (halbe Breite). Touch-Geräte: offen. Suche oben: letzte Option „Im Web suchen“ (Item-Art `web`; bei „Nichts gefunden“ Enter = Web). App: `linkDrag` (dragenter von außen, nicht bei eigenem dragstart) → PanelFrame `.linkpad` mit „Hier öffnen | Als neuer Tab“ auf Portalen mit Seite; Tab-Leiste nimmt Links als neuen Tab (`onOpenNewTab`, Grenze TAB_MAX). `body.is-linkdrop` (beim Ziehen und nach einer Suche, solange das Fenster im Hintergrund ist) setzt `pointer-events:none` auf iframes. Hinweis nach jeder Suche (`WEB_TEXT.opened`), Hilfe `webSearch` mit 4 Fragen.
- Tests: 6 neue → **232 grün**; `tsc --noEmit` sauber. Geprüft im eingebauten Browser (`?test=voll`): Stack-Wechsel lässt vorheriges Portal verborgen geladen, Hintergrund-Tab bleibt nach Ansehen geladen, „Nicht pausieren“ mit Ansage, Einstellung inkl. „Nie“ (90 iframes) und zurück, Suche oben zeigt „Im Web suchen“, Adresszeile mit Suchwörtern (Popup im eingebauten Browser geblockt – nur Ansage geprüft), Ziehen simuliert: Ablageflächen an allen 10 Portalen, „Hier öffnen“ lädt, „Als neuer Tab“ bei 9 Tabs mit Hinweis. Enrico hat getestet: Suche oben, Hinweis, Hilfe ok; Ziehen braucht ein eigenes Fenster (darum `openBeside`). Echtes Ziehen aus dem neuen Fenster noch einmal von Enrico prüfen lassen.

## Entscheidungen Enrico (V41)

1. Web-Suche: Stufe 1 (Suchen + Ziehen) und Stufe 2 („An E-Sources senden“) beide umsetzen; Anwendung muss erklärt werden (Hinweis, Hilfe, später Tour).
2. Suchmaschine: nicht ausdrücklich entschieden – umgesetzt als wählbar, Voreinstellung Google.

## Nächste Schritte

1. **F-189 Stufe 2** „An E-Sources senden“: Bookmarklet (in Einstellungen/Hilfe zum Ziehen in die Lesezeichenleiste) öffnet `BASE?open=<url>`; diese Instanz reicht die Adresse über den vorhandenen Fenster-Kanal (F-27, `windows.ts`) an das Fenster mit dem aktiven Portal weiter und schließt sich; ohne offenes E-Sources öffnet sie selbst. Fragen: ins aktive Portal als neuer Tab oder Auswahl? Danach evtl. Tour „Im Web suchen“.
2. **F-190 (Fehler, hoch):** Main Desk ging verloren, übrig blieb nur ein leerer Zusatz-Desk (Bildschirmfoto Enrico 23.11.2026, Fenster `localhost:2910/?win=082d7732-…`, „Leerer Desk“, Knopf „Alles ins Main Desk“ grau). Nach Desks anlegen, zusammenführen, sammeln/auflösen. Soll: Das Letzte, was übrig bleibt, ist immer der Main Desk. Erst nachstellen, dann beheben (Details im Lastenheft).
3. Enrico: echtes Ziehen aus dem Suchfenster und **aus der Lesezeichenleiste des Browsers** (Wunsch V41) testen lassen; sollte schon gehen (Ziehen kommt über die Kopfleiste herein → `linkDrag`). Falls nicht: Datentypen der Leiste prüfen (Chrome liefert `text/uri-list`).
4. **F-188** mit Enrico entscheiden.
5. F-06 Stufe 2 bei Bedarf; danach **F-116 mit F-53** (Vorlagen, Layouts Szenarien zuordnen).

## Kleine Punkte

- Neu (V41): Sichtbare Portale pausieren nie (F-06 Stufe 2). Ausnahme „Nicht pausieren“ gilt nur je Portal, nicht je Tab.
- Neu (V41): Beim Wechsel der View (Dashboard ↔ Maximieren ↔ 2 × 2) und des Desks bauen sich Portale weiter neu auf (andere Baumstruktur in App.tsx, `content`).
- Neu (V41): „Nie“ → zurück auf eine Zeit entlädt sofort alles Verdeckte, das noch nie angesehen wurde (gewollt, aber evtl. überraschend).
- Neu (V41): Hinweis nach Web-Suche kommt bei jeder Suche (12 s) – bei Bedarf nur die ersten Male.
- Neu (V41): `window.open` mit `noopener` meldet keinen Popup-Blocker – blockt der Browser, merkt E-Sources es nicht. Im eingebauten Browser blockt er Popups aus Skripten immer (Test nur per Ansage).
- Neu (V41): Zieht man einen Link direkt über einem eingebetteten iframe in das Fenster (ohne vorher über Kopfleiste/Rand zu kommen), sieht E-Sources das nur, wenn vorher gesucht wurde und das Fenster im Hintergrund war (`is-linkdrop`). Mit echtem Ziehen aus einem zweiten Fenster noch nicht von Hand geprüft – Enrico bitten.
- Neu (V41): Stack-Mitglieder werden jetzt alle in `.tile__layer` gerendert (hinten `display:none`); Selektoren auf „erstes Element im main“ müssen `.tile__layer:not(.is-back)` beachten (in V41 bei Fokus nach Tab-Schließen angepasst).
- Neu (V40): Schraffur „über Empfehlung“ folgt der Reihenfolge im Teilungsbaum – wird ein Slot verschoben (z. B. an den unteren Rand), ist danach er schraffiert statt des zuletzt angelegten. Besser: echte Anlege-Reihenfolge merken.
- Neu (V40): „Slot rechts/unten“ im Layout-Modus legt ein leeres Portal an; auf anderen Bildschirm-Einstellungen desselben Layouts erscheint es nach der üblichen Regel (eigener Slot oder Stack ganz rechts).
- Neu (V40): Für ein gewähltes anderes Gerät fehlt die Pixel-Prüfung aus F-52 (240 × 160) – Grenze ist dort nur die doppelte Empfehlung. „Gleich verteilen“ gleicht weiter nur Anteile im Teilungsbaum an (kein echtes Raster).
- Neu (V40): Die Gerätewahl im Layout-Modus gilt nur, solange das Cockpit offen ist (danach wieder „dieses Gerät“).
- Neu (V40): Sehr schmale Geräte im Hochformat (z. B. Super-Ultrawide hoch) ergeben ein schmales Bild (Höhe höchstens 400 px).
- Neu (V40): Im Browser-Test `tab.drag` mit Bildpunkten des Screenshots: Faktor = Screenshot-Breite (ohne `scale`) ÷ Viewport-Breite (bei 1600 px Viewport 1389/1600). Falsche Umrechnung trifft den Hintergrund und schließt das Cockpit.
- Cockpit auf kleinen Bildschirmen – Kopfzeile wird eng; Smartphone: siehe F-188 (Entscheidung Enrico offen).
- Aus V39: Slot schließen nimmt den Nachbar in Lesereihenfolge (erst davor, dann danach); keine Wahl des Ziels.
- Aus V39: Rückgängig für Slot schließen gibt es nur, solange das Cockpit offen ist (wie bei Layouts löschen).
- Aus V39: Im Entwicklungsmodus laufen Effekte doppelt (StrictMode) – Fokus-Rückgabe von Dialogen daher mit `useState(() => document.activeElement)` merken, nicht im Effekt (in V39 beim Standard-Dialog passiert).
- Aus V38: Layout wechseln hat kein Tastenkürzel.
- Aus V38: NewSlot über der Empfehlung – „Gleich verteilen“ gleicht nur Anteile im Teilungsbaum an (kein echtes Raster); der neue Slot bleibt deutlich größer als die anderen (z. B. 5. Slot = halbe Fläche). Echtes Raster wäre schöner.
- Aus V38: „Auf n Slots zurück“ zeigt bei schmaler Kopfleiste nur das Symbol (Name im Tooltip/aria-label); verteilt ganz neu (eigene Stacks gehen in die Grundverteilung, Rückgängig im Hinweis).
- Aus V38: Die neue Rückfrage (`ask`, alertdialog) ist allgemein nutzbar – könnte auch andere Bestätigungen übernehmen.
- Aus V38: Wird eine Kategorie gelöscht, behalten Portale in nicht aktiven Layouts die alte Id (beim nächsten Laden fällt sie nur bei aktiven Portalen weg).
- Aus V38: Der Gerätemerker (Standard-Layout) wird auch im Testmodus echt gespeichert – nach Tests zurückstellen.
- Aus V38: Rückgängig für Löschen/Zurücksetzen von Layouts gibt es nur, solange Cockpit bzw. Dialog offen sind.
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

Git nur bei Enrico (GitHub Desktop). Repo-Ordner per Ordnerzugriff freigeben (`~/Projects/e-sources`). Dev-Server `npm run dev`, http://localhost:2910, im eingebauten Browser erreichbar; Änderungen über device_bash kommen per Hot Reload an. Testen mit `?test=voll` (Slotmaschine: `?test=slot`) (nichts wird gespeichert; Testbelegung ohne Kategorien – über ⋮ → Farben → „Neue Kategorie …“). Im eingebauten Browser: **nie die ganze Seite als ariaSnapshot ausgeben** – auch `browser.tabs.get()`/`create()` geben die ganze Seite aus (riesig, in V35 rund ein Viertel des Chats). `tabs.create("about:blank")` geht nicht, solange der Browser zu ist. Besser: wenn schon ein Tab offen ist, `browser.tabs.list()` und `browser.tabs.switch(id)` nur einmal; sonst `tabs.create` mit der Adresse **ohne** `?test=voll` (leere Belegung = kleine Ausgabe) und danach `tab.page.goto(...?test=voll)`. Danach nur Teilbereiche (`locator(...).ariaSnapshot({depth:1})`). Einstellungen: `getByRole('button',{name:'Einstellungen', exact:true})`. Der Testbildschirm ist nur 1024×768 – für mehr Slots `page.setViewportSize({width:2600,height:1200})`, danach `setViewportSize(null)`. Keine `textContent` von `document.activeElement` ausgeben (ist es `body`, kommt die ganze Seite). Nach Änderungen an JSX **immer `npx tsc --noEmit -p .` in `web/`** – ein fehlender Import ergibt sonst eine schwarze Seite.

**Tests in Claudes VM:** vitest geht nicht. Ersatzmodul neu anlegen (in V41 wieder neu angelegt; **wichtig:** `toEqual` muss Felder mit `undefined` übergehen wie vitest – sonst 7 falsche Fehler bei Speicher-Tests; Vorlage liegt als `docs/uebergaben/vitest-ersatz.js` – einfach dorthin kopieren) in `$HOME/vt2/node_modules/vitest/index.js` (exportiert auch `vi`, `beforeEach`, `afterEach` als Platzhalter) (describe/it/expect mit toBe, toEqual, toMatchObject, toBeDefined, toBeUndefined, toBeNull, toBeGreaterThan, toContain, toHaveLength, `.not`; Ausführung in `process.on('beforeExit')`), dann in `web/`: `npx tsc --outDir $HOME/vt2/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node src/workspace/*.ts` und `NODE_PATH=$HOME/vt2/node_modules:$PWD/node_modules node $HOME/vt2/out/workspace.test.js`. Meldungen zu `.at`/`import.meta` sind harmlos. Hilfe-Texte dürfen nicht mit „Wort = …“ beginnen (Test F-156); jeder Hilfe-Eintrag braucht ein Symbol in `HELP_ICON`.

## Arbeitsregeln

Wie V15–V40: Funktion vor Design · Barrierefreiheit immer (NF-03) · Begriffe erklären (Texte nur in terms.ts/help.ts) · offene Punkte im Blick, Restplatz mit kleinen Punkten füllen · Lastenheft zuerst · Sammelmodus `>START` … `<ENDE` · Terminal: nur nächster Schritt · „PO“ = Push Origin · Übergabe spätestens bei 60–70 %, nie mitten in einer Aufgabe · Datei `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/` · Usability: so einfach und wirksam wie möglich für den Anwender.
