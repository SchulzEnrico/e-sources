# Übergabe V40 → V41 E-Sources

Stand: 23.11.2026 · Chat V40 abgeschlossen · Nächster Chat: **V41 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V41 E-Sources**. Lies diese Übergabedatei und das Lastenheft unter `docs/Lastenheft/Lastenheft_E-Sources.md`. F-187 Stufe 2 (Anordnung im Layout-Modus, Gerät wählbar) ist fertig. Als Nächstes **F-06** (Portale pausieren). F-188 (Cockpit auf Smartphones) wartet auf Enricos Entscheidung. Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft:** `docs/Lastenheft/Lastenheft_E-Sources.md` (163 Einträge: **104 fertig, 12 teilweise, 1 ersetzt, 46 offen**; F-187 Stufe 2 zählt unter F-187). Offen aus V27: Claude Doc https://claude.ai/artifact/5LcrJ6JwXyEvUMcJjZQRY8 nicht nachgezogen – klären, ob es noch gilt.
- **Benennung – Ergebnis:** https://claude.ai/artifact/5Di2hzfovkm1NcmV3bocdp
- **Geschichte der Anwendung:** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – Ausblick noch nicht nachgezogen (F-151 bis F-187)
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`

## Was in V40 passiert ist

- V39 war committet (b7f3670). **Noch nicht committet:** alles aus V40 (Vorschlag: „Anordnung im Layout-Modus bestimmen, Gerät wählbar (F-187 Stufe 2); F-188 im Lastenheft; Übergabe V40“).
- **F-187 Stufe 2 ✓** – im Layout-Modus des Cockpits (`components/DeskLayouts.tsx`, `LayoutCockpit`):
  - **Gerät wählbar** im Band: Auswahl Gerät (Klassen aus F-03, aktuelles mit „· Dieses Gerät“), Ausrichtung, Reihen (nur ab 4 Slots). State `dev` (null = dieses Gerät), daraus `setup`; die echte Einstellung heißt im Bauteil `real` (Standard-Dialog bekommt `real`). Anderes Gerät: „Vorschau für … – nicht dieses Gerät“, gepunkteter Rahmen (`.lc__map.is-foreign`), Knopf „Zurück zu diesem Gerät“. Reihen-Vorgabe beim Wechsel aus `setupFor` (gespeicherte Wahl).
  - **Griffe wie im Radar:** Kanten ziehen (lokale Vorschau `live`, gespeichert erst beim Loslassen), Kachel an den Rand einer anderen = dort einsetzen, an den Kartenrand = Rand der ganzen Fläche, Mitte = tauschen; Alt+Pfeil / Alt+Umschalt+Pfeil. Hinweiszeile `.lc__keys` unter dem Bild. Hochformat: `.lc__map.is-tall` (bis 400 px hoch).
  - Abschnitt **„Anordnung“**: „Slot rechts“, „Slot unten“ (ab Empfehlung Rückfrage `askMore` als alertdialog, danach gleich verteilt; höchstens doppelte Empfehlung, `DL.slotsMax`), „Gleich verteilen“ (sagt an, wenn schon gleich).
  - **Gemeinsame Hilfe** `workspace/arrange.ts` (aus Overview herausgelöst): `nearestSide`, `neighbourLeaf`, `arrangeStep`, `sameTree`, Konstanten `ARRANGE_STEP`, `DOCK_BAND`, `MAP_BAND_PX`, `ARROWS`. Overview nutzt sie jetzt auch (eigener Nachbar über alle Desks bleibt). Texte in `ARRANGE_TEXT` (terms.ts) und `DESK_LAYOUT_TEXT` (Stufe-2-Block).
  - Modell: `layoutView` liefert zusätzlich `tree`; neu `DL.arrangeLayout(ws, win, id, setup, op)` mit `ArrangeOp` (`tree` | `add` | `even`) über `inLayout`; Reducer-Aktion `layoutArrange`.
  - Hilfe-Eintrag `layouts` ergänzt (Text, 3 Fragen, Suchwörter).
- **F-188 neu** (Wunsch Enrico): erst „Cockpit auf Smartphones auf keinen Fall“, dann nach Bildschirmfoto „sieht noch passabel aus“ → im Lastenheft als **offene Entscheidung**: sperren (mit Vollbild-Weg zu den Einstellungen, z. B. um Layouts vom Smartphone aus anzupassen) oder zulassen und straffen. Reihenfolge 17b, Zeitpunkt offen.
- Tests: 4 neue → **226 grün**; `tsc --noEmit` sauber. Geprüft im eingebauten Browser (`?test=voll`, 1600×1000): Band und Auswahl, Großer Laptop hoch, Kante ziehen (50 → 70 %), Alt+Umschalt+Pfeil, Alt+Pfeil (Fokus bleibt), Slot rechts mit Rückfrage (Fokus auf „Trotzdem anlegen“), Schraffur, Einsetzen am Kartenrand, Gleich verteilen, Zurück zu diesem Gerät, Esc-Folge. Viewport zurückgestellt, Gerätemerker nicht berührt.

## Entscheidungen Enrico (V40)

1. Cockpit auf Smartphones: zunächst „auf keinen Fall“, dann „sieht eigentlich passabel aus“ – Entscheidung offen (F-188).
2. Layouts sollen bestimmten Szenarien (Schule, Abteilung, Vorgang, Kunde …) zuordenbar und darüber auswählbar sein – in F-53 ergänzt, umsetzen mit F-116.

## Nächste Schritte

1. **F-06** (Portale pausieren) – passt zu F-51: nicht aktive Layouts laden ohnehin nichts. Aus V28: Portale bauen sich beim Desk-Wechsel neu auf (mit F-06 klären).
2. **F-188** mit Enrico entscheiden, dann umsetzen.
3. Danach nach Lastenheft: **F-116 Space/Case mit F-53** – Vorlagen („Jedes eigene Layout als Vorlage speichern“ baut auf `cloneContent` auf) und **Layouts Szenarien zuordnen** (Schule, Abteilung, Vorgang, Kunde …; Wunsch Enrico V40, in F-53 ergänzt; Vision und F-116 nennen die Szenarien).

## Kleine Punkte

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

**Tests in Claudes VM:** vitest geht nicht. Ersatzmodul neu anlegen (in V40 wieder neu angelegt; Vorlage siehe V38–V40: describe/it/expect, `.not`, Ausführung in `beforeExit`) in `$HOME/vt2/node_modules/vitest/index.js` (exportiert auch `vi`, `beforeEach`, `afterEach` als Platzhalter) (describe/it/expect mit toBe, toEqual, toMatchObject, toBeDefined, toBeUndefined, toBeNull, toBeGreaterThan, toContain, toHaveLength, `.not`; Ausführung in `process.on('beforeExit')`), dann in `web/`: `npx tsc --outDir $HOME/vt2/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node src/workspace/*.ts` und `NODE_PATH=$HOME/vt2/node_modules:$PWD/node_modules node $HOME/vt2/out/workspace.test.js`. Meldungen zu `.at`/`import.meta` sind harmlos. Hilfe-Texte dürfen nicht mit „Wort = …“ beginnen (Test F-156); jeder Hilfe-Eintrag braucht ein Symbol in `HELP_ICON`.

## Arbeitsregeln

Wie V15–V39: Funktion vor Design · Barrierefreiheit immer (NF-03) · Begriffe erklären (Texte nur in terms.ts/help.ts) · offene Punkte im Blick, Restplatz mit kleinen Punkten füllen · Lastenheft zuerst · Sammelmodus `>START` … `<ENDE` · Terminal: nur nächster Schritt · „PO“ = Push Origin · Übergabe spätestens bei 60–70 %, nie mitten in einer Aufgabe · Datei `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/` · Usability: so einfach und wirksam wie möglich für den Anwender.
