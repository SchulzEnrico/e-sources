# Übergabe V43 → V44 E-Sources

Stand: 23.11.2026 · Chat V43 abgeschlossen · Nächster Chat: **V44 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V44 E-Sources**. Lies diese Übergabedatei und das Lastenheft unter `docs/Lastenheft/Lastenheft_E-Sources.md`. Zuerst die **Begrüßung „Zuletzt benutzt“ (F-193) übersichtlicher gestalten** (Neumorph, versenkte Felder – siehe unten). Dann **F-191** (Entscheidung a/b bei Enrico erfragen) zusammen mit **F-192**. Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft:** `docs/Lastenheft/Lastenheft_E-Sources.md` (168 Einträge: **106 fertig, 14 teilweise, 1 ersetzt, 47 offen**). Offen aus V27: Claude Doc https://claude.ai/artifact/5LcrJ6JwXyEvUMcJjZQRY8 nicht nachgezogen – klären, ob es noch gilt.
- **Benennung – Ergebnis:** https://claude.ai/artifact/5Di2hzfovkm1NcmV3bocdp
- **Geschichte der Anwendung:** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – Ausblick noch nicht nachgezogen (F-151 bis F-193)
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`

## Was in V43 passiert ist

- V42 war schon committet und gepusht. V43 committet und pusht Enrico am Ende des Chats (PO).
- **F-190 ✓** Main Desk ging „verloren“: Die Daten waren nie weg, nur zeigte kein Fenster den Main Desk. Weg dorthin: NewDesk, der Browser blockt das neue Fenster, der Desk erscheint im selben Tab (`?win=…`); dort „Alles ins Main Desk“ wollte ein neues Main-Desk-Fenster öffnen (geblockt bzw. Tab ließ sich nicht schließen). **Jetzt:** `deskGone(ws, win)` in windows.ts; gibt es den Desk eines Fensters nicht mehr, wird es nach 1,5 s zum Main Desk (`leaveDesk`: zeigt ein anderes Fenster den Main Desk, erst `window.close()`, nach 300 ms trotzdem wechseln). „Alles ins Main Desk“ ebenso sofort. Hinweis „Dieser Desk ist leer“ mit Knopf „Zum Main Desk“ (wechselt hier). **Keine neuen Fenster mehr** – bei Enrico meldete sich ein anderes Chrome-Fenster als Main Desk, war aber über `window.open('', name)` nicht zu finden (nur in derselben Fenstergruppe). Texte `DESK_GONE_TEXT`. Von Enrico noch nicht bestätigt: alter Tab `?win=082d7732-…` neu laden → nach 1,5 s Main Desk.
- **F-193 ✓** Begrüßung: Knopf „Mehr …“ (aria-expanded) klappt „Zuletzt benutzt“ auf (Begrüßung wird breiter, bleibt stehen). Links „Desks und Slots“ (3 Desks, 5 Slots, je Slot 3 Portale + „+ n weitere“; Klick: hier nach vorn / im offenen Fenster zeigen / Desk hierher holen und Portal nach vorn – `onSwitch(win, said, focus)`, DeskProps `focus`). Rechts „Lesezeichen“ (5 zuletzt geöffnete Sources der Library; ohne Verlauf „Neu in der Library“). Verlauf `workspace/recent.ts` (`touch`, `recentDesks`, `recentSources`, `newestSources`, localStorage `esource.recent`, Testmodus nur im Speicher), aufgezeichnet bei aktivem Portal und in `openHit`, Portal-Library und `takeSent` (`rememberUrl`). Texte `GREET_TEXT`, CSS `.greeting.is-open`, `.greeting__recent` …
- Gruß nach Uhrzeit (Wunsch Enrico): Morgen 5–9, Tag 9–17, Abend 17–23, nachts „Hallo“ (`greetingFor`).
- Neu im Lastenheft: **F-191** (Knopf „Übernehmen/Anlegen“ in Einstellungen und beim Anlegen, überall), **F-192** (mehr Zeichen für Kategorien), **F-193** (siehe oben).
- Tests: **246 grün** (5 neue); `tsc --noEmit` sauber.

## Entscheidungen Enrico (V43)

1. Was zuletzt übrig bleibt, ist immer der Main Desk – ohne neue Fenster.
2. Begrüßung darf größer werden, aber erst, wenn man dort etwas wählen will; links 3 Desks/5 Slots mit Portalen, rechts 5 Lesezeichen, gut beschriftet und optisch getrennt.
3. Gruß: kein „Guten Morgen“ nach 9 Uhr, „Guten Abend“ erst ab 17 Uhr.

## Nächste Schritte

1. **F-193 nacharbeiten (Wunsch Enrico, Bildschirmfoto V43):** Die aufgeklappte Ansicht muss **übersichtlicher und besser aufgeteilt** sein – am besten in **versenkten Feldern im Neumorph-Stil** (eingelassene Flächen mit innerem Schatten statt vieler gleich aussehender Knöpfe). Beobachtet: Slots mit nur einem Portal wiederholen den Namen (Slot „testportal“ → Portal „testportal“) – dann nur eine Zeile; die vielen gleich großen Knöpfe wirken unruhig; die rechte Spalte ist halb leer (Seiten ohne Titel zeigen nur die Domain). Je Desk ein versenktes Feld, darin Slots als Gruppen; Lesezeichen als eigenes versenktes Feld. Kontrast und Fokusrahmen bleiben gut sichtbar (NF-03; Neumorph hat oft zu wenig Kontrast – prüfen, auch hell und `forced-colors`).
2. **F-191** mit Enrico entscheiden: (a) gilt erst mit „Übernehmen“, „Abbrechen“ verwirft, oder (b) Vorschau sofort, dazu „Fertig“ und „Zurücksetzen“. Vorschlag Claude: (b) bei Farben, (a) beim Anlegen. Erst alle betroffenen Stellen sammeln, dann ein gemeinsames Muster. **F-192** gleich mit (Dialog „Farben“).
3. F-190 von Enrico bestätigen lassen (alter Tab `?win=082d7732-…`).
4. Symbol in der Lesezeichenleiste (aus V42): Enrico fragen, ob er die Datei aus „Mit Symbol als Datei“ importiert und das Lesezeichen einmal angeklickt hat; sonst Vorschlag Browser-Erweiterung.
5. **F-188** mit Enrico entscheiden; F-06 Stufe 2 bei Bedarf; danach **F-116 mit F-53**.

## Kleine Punkte

- Neu (V43): Im eingebauten Browser melden sich **unsichtbare Fenster aus früheren Sitzungen als Main Desk** (Test-Kanal `esource.windows.test`, 6 Stück) – darum löst F-190 dort statt Wechsel `window.close()` aus, und von Skripten geöffnete Test-Tabs schließen sich. Prüfen mit einem eigenen BroadcastChannel (`hello` senden, `here` sammeln).
- Neu (V43): „Zuletzt benutzt“ kennt den Verlauf erst ab V43; „Zuletzt geschlossen“ (F-24) ist nicht aufgenommen. Lesezeichen-Klick aus der Begrüßung nur über den Weg der Suche geprüft (Test-Library leer).
- Neu (V43): Mehrere Fenster schreiben `esource.recent` gemeinsam (lesen–ändern–schreiben je Ereignis, kein Sperren) – bei gleichzeitigen Klicks kann ein Eintrag fehlen; harmlos.
- Neu (V43): Nach Wechsel über die Begrüßung kommt das Portal nach vorn, die Begrüßung erscheint dort nicht erneut (gewollt).


- Neu (V42): **Symbol in der Lesezeichenleiste gefällt Enrico nicht** (Globus beim Ziehen; Import mit ICON als Umweg; eigene Schrift oder HTML-Popup ändern daran nichts, weil der Browser Favicons nur zu Webadressen merkt). Offen halten – vielleicht später Browser-Erweiterung oder eine andere Idee.

- Neu (V42): Im eingebauten Browser antworten auf den Test-Kanal unsichtbare Fenster aus früheren Sitzungen (in `tabs.list()` nicht zu sehen) – darum mehrere Angebote; durch `from` und Zusammenfassen je Desk harmlos.
- Neu (V42): Bookmarklet-Popups schließen sich mit `window.close()`; öffnet der Browser kein Popup, lädt das Bookmarklet E-Sources im selben Tab (dann schließt nichts).
- Neu (V42): „Neuer Slot“ über „Senden“ legt den Slot immer rechts an und fragt nicht wie NewSlot über der Empfehlung (F-52) – nur `canAddArea`.
- Neu (V42): Der Countdown sagt die Sekunden nicht an (nur sichtbar); Screenreader hören erst „Angehalten …“. Ggf. einmalige Ansage zu Beginn ergänzen.

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
