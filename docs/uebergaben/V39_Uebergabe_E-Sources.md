# Übergabe V39 → V40 E-Sources

Stand: 23.11.2026 · Chat V39 abgeschlossen · Nächster Chat: **V40 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V40 E-Sources**. Lies diese Übergabedatei und das Lastenheft unter `docs/Lastenheft/Lastenheft_E-Sources.md`. F-187 (Layouts im Cockpit) ist fertig. Als Nächstes **F-187 Stufe 2** (Anordnung im Layout-Modus bestimmen, Gerät wählbar – siehe Lastenheft), danach **F-06** (Portale pausieren). Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft:** `docs/Lastenheft/Lastenheft_E-Sources.md` (162 Einträge: **104 fertig, 12 teilweise, 1 ersetzt, 45 offen**). Offen aus V27: Claude Doc https://claude.ai/artifact/5LcrJ6JwXyEvUMcJjZQRY8 nicht nachgezogen – klären, ob es noch gilt.
- **Benennung – Ergebnis:** https://claude.ai/artifact/5Di2hzfovkm1NcmV3bocdp
- **Geschichte der Anwendung:** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – Ausblick noch nicht nachgezogen (F-151 bis F-187)
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`

## Was in V39 passiert ist

- V38 war committet (334059f). Der erste Teil von F-187 ist von Enrico committet und gepusht. **Noch nicht committet:** Ziehen im Layout-Modus, Hilfe- und Lastenheft-Ergänzung, diese Übergabe (Vorschlag: „Slots im Layout-Modus ziehen (F-187); F-187 Stufe 2 im Lastenheft; Übergabe V39“).
- **F-187 ✓** – Cockpit mit Umschalter **„Portale | Layouts“** (`Overview.tsx`: State `layouts`, `.overview__mode`, Esc führt erst zurück zu Portale; Props `layoutOps`, `startLayouts`). Zahnrad › „Layouts …“, Hilfe und Suche öffnen das Cockpit gleich im Modus (`openLayouts` in App.tsx; `layoutsOpen`/alter Dialog entfallen). Die Bedienung steckt in `layoutOps: LayoutOps` (App.tsx, Abschnitt F-51/F-187).
  - `components/DeskLayouts.tsx` enthält jetzt `LayoutCockpit` und den Dialog `StandardLayout`. Band „Layout-Einstellungen · Dieses Gerät … · empfohlen n Slots“, Karten mit Mini-Anordnung (`.lc__card`, `.lc__mini`), großes Bild (`.lc__map`, gestrichelt). **Klick auf eine Karte zeigt nur an, erst „Wechseln“ baut um** (Entscheidung Enrico: Variante B).
  - Slots über der Empfehlung schraffiert und beschriftet; „empfohlen“ = Slotzahl der Klasse aus F-03 (Entscheidung Enrico). Als „über Empfehlung“ gelten die zuletzt angelegten (Reihenfolge der Blätter im Teilungsbaum).
  - Slot-Werkzeuge auch für nicht aktive Layouts: Platz tauschen (ziehen, oder Knopf und Pfeile/Enter), Slot schließen (Portale in den Nachbar-Slot, Rückgängig; Meldung, wenn kein Stack Platz hat).
  - Modell in `deskLayouts.ts`: `contentOf`, `inLayout` (setzt ein nicht aktives Layout kurz ein, ändert, legt zurück), `setContent`, `layoutView`, `swapSlots`, `closeLayoutSlot`; `workspace.ts`: `closeSlot`. Reducer: `layoutSlotSwap`, `layoutSlotClose`, `layoutContent`. Texte in `DESK_LAYOUT_TEXT` (terms.ts), Hilfe-Eintrag `layouts` mit 4 neuen Fragen.
- Tests: 4 neue → **222 grün**; `tsc --noEmit` sauber. Geprüft im eingebauten Browser (`?test=voll`, Viewport 2600×1200 für den 11. Slot): Modus öffnen per Zahnrad, Gleichmäßig anlegen, anderes Layout nur ansehen, tauschen (Tastatur und Ziehen), schließen + Rückgängig, Meldung „Stack voll“, Schraffur, Standard-Dialog (wählen, Esc, Fokus zurück), Esc-Folge. Gerätemerker danach wieder leer.

## Entscheidungen Enrico (V39, umgesetzt)

1. „Oben links“ = Radar im Cockpit; Layouts als eigener Modus im Cockpit mit Umschalter, eindeutig erkennbar.
2. Zahnrad › „Layouts …“ bleibt und öffnet das Cockpit im Modus „Layouts“.
3. Im Layout-Modus Werkzeuge für Slots (verschieben, schließen), auch per Ziehen.
4. Karte anklicken = nur ansehen, „Wechseln“ baut um (Variante B).
5. Empfehlung = Voreinstellung je Bildschirmklasse (F-03).
6. Im Layout-Modus soll die Anordnung ganz bestimmt werden können (Größe, Einsetzen, Anlegen) – mit wählbarem Gerät (F-187 Stufe 2, offen).

## Nächste Schritte

1. **F-187 Stufe 2** – Wunsch Enrico am Ende von V39: Im Layout-Modus soll die Anordnung selbst bestimmt werden können wie im Radar (F-153): Kanten ziehen (Größe), am Rand einsetzen, Slot anlegen, gleich verteilen, Tastatur wie im Radar. **Gerät wählbar** (Klasse, hoch/quer, 1/2 Zeilen) im Band oben, damit man Anordnungen ohne echtes Gerät festlegt. Ansatz: `layoutView` bekommt die gewählte Einstellung (statt `setup`); Änderungen über `inLayout` mit dieser Einstellung (`at(setup, win)`); Größe/Einsetzen aus Overview (`radarResize`, `T.drop`, `T.resizeEdge`, Reducer `setLayout`/`drop`) wiederverwenden – am besten das Ziehen aus Overview in eine gemeinsame Hilfe auslagern statt kopieren. Hinweis: `layoutView` nutzt `screenClass(setup.cls).capacity` als Empfehlung – folgt dann automatisch der Wahl.
2. **F-06** (Portale pausieren) – passt zu F-51: nicht aktive Layouts laden ohnehin nichts.
3. Danach nach Lastenheft (F-116 Space/Case mit F-53 Vorlagen – „Jedes eigene Layout als Vorlage speichern“ baut auf `cloneContent` auf).

## Kleine Punkte

- Neu: Cockpit auf kleinen Bildschirmen – Kopfzeile wird eng (Info-Texte brechen um), Smartphone ungeeignet. Enrico: später prüfen, evtl. Cockpit erst ab ausreichend großem Bildschirm (steht in F-187).
- Neu: Layout-Modus zeigt nur die Anordnung der aktuellen Bildschirm-Einstellung; andere Einstellungen (z. B. hoch statt quer) eines Layouts sind nicht sichtbar.
- Neu: Slot schließen nimmt den Nachbar in Lesereihenfolge (erst davor, dann danach); keine Wahl des Ziels.
- Neu: Rückgängig für Slot schließen gibt es nur, solange das Cockpit offen ist (wie bei Layouts löschen).
- Neu: Im Entwicklungsmodus laufen Effekte doppelt (StrictMode) – Fokus-Rückgabe von Dialogen daher mit `useState(() => document.activeElement)` merken, nicht im Effekt (in V39 beim Standard-Dialog passiert).
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

**Tests in Claudes VM:** vitest geht nicht. Ersatzmodul neu anlegen (in V39 wieder neu angelegt; Vorlage siehe V38/V39: describe/it/expect, `.not`, Ausführung in `beforeExit`) in `$HOME/vt2/node_modules/vitest/index.js` (exportiert auch `vi`, `beforeEach`, `afterEach` als Platzhalter) (describe/it/expect mit toBe, toEqual, toMatchObject, toBeDefined, toBeUndefined, toBeNull, toBeGreaterThan, toContain, toHaveLength, `.not`; Ausführung in `process.on('beforeExit')`), dann in `web/`: `npx tsc --outDir $HOME/vt2/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node src/workspace/*.ts` und `NODE_PATH=$HOME/vt2/node_modules:$PWD/node_modules node $HOME/vt2/out/workspace.test.js`. Meldungen zu `.at`/`import.meta` sind harmlos. Hilfe-Texte dürfen nicht mit „Wort = …“ beginnen (Test F-156); jeder Hilfe-Eintrag braucht ein Symbol in `HELP_ICON`.

## Arbeitsregeln

Wie V15–V38: Funktion vor Design · Barrierefreiheit immer (NF-03) · Begriffe erklären (Texte nur in terms.ts/help.ts) · offene Punkte im Blick, Restplatz mit kleinen Punkten füllen · Lastenheft zuerst · Sammelmodus `>START` … `<ENDE` · Terminal: nur nächster Schritt · „PO“ = Push Origin · Übergabe spätestens bei 60–70 %, nie mitten in einer Aufgabe · Datei `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/` · Usability: so einfach und wirksam wie möglich für den Anwender.
