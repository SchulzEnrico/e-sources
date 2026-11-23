# Übergabe V48 → V49 E-Sources

Stand: 23.11.2026 · Chat V48 abgeschlossen · Nächster Chat: **V49 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V49 E-Sources**. Lies diese Übergabedatei und das Lastenheft unter `docs/Lastenheft/Lastenheft_E-Sources.md`. Frag Enrico zuerst nach seiner Prüfung des Pause-Zeichens am Tab (siehe „Nächste Schritte“ 1). Dann **F-202 Stufe 2–4** (Mehrfachauswahl in Library und Cockpit, Tour), danach **F-188**, dann **F-116 mit F-53**. Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft:** `docs/Lastenheft/Lastenheft_E-Sources.md` (V48: F-201, F-202 neu, Prüfung F-06 eingetragen). Offen aus V27: Claude Doc https://claude.ai/artifact/5LcrJ6JwXyEvUMcJjZQRY8 nicht nachgezogen – klären, ob es noch gilt.
- **Benennung – Ergebnis:** https://claude.ai/artifact/5Di2hzfovkm1NcmV3bocdp
- **Geschichte der Anwendung:** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – Ausblick noch nicht nachgezogen (F-151 bis F-202)
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`

## Was in V48 passiert ist

- **V47 und V48 sind noch nicht committet** – PO bei Enrico.
- **Prüfung F-06 Stufe 2 (Enrico):** View-Wechsel ohne Neuladen ✓, „Jetzt pausieren“ + Platzhalter ✓, „Diesen Tab nicht pausieren“ ✓. Aufgeweckte Seiten laden neu (Video von vorn, startet nicht von selbst) – gewollt/Browsergrenze.
- **Fund:** Mit einer E-Sources-Kopie (echte Belegung, `localhost:2910`) in einem Portal lud ein Video im Haupt-Fenster beim View-Wechsel neu; ohne Kopie nicht (Enrico bestätigt). Im Test (Kopie mit `?test=voll`, gleiches Video zweimal) **nicht nachstellbar**; die Kopie speichert die Arbeitsfläche nicht (`EMBEDDED` in storage.ts) und meldet sich nicht an (useWindows/useSend). Ursache offen → F-201 (5).
- **F-201 Punkte 1–3 ✓:**
  - Neues Symbol `keep` in icons.ts: **durchgestrichenes Pause-Zeichen** (Entscheidung Enrico statt Nadel); am Tab ist es eingeschaltet: **Kreis und Querstrich rot** (`--keep-red` #ff4d4d, hell #c8201a), Balken in Textfarbe.
  - **Pause-Zeichen am Tab** (PanelFrame, `.tab__pause` mit `Menu className="tab__keep"`): steht **hinten vor dem ×**, immer sichtbar (nur bei Tabs mit Adresse, nicht bei gesperrten Seiten): schlicht = pausiert nach Zeit, `is-asleep` (Farbe `--warn`) = gerade pausiert, `is-on` = pausiert nie. **Klick öffnet Menü:** „Diesen Tab nie pausieren“, „Source nie pausieren (überall)“ (gesperrt, wenn keine gespeicherte Source), „Ganzes Portal nie pausieren“, „Jetzt pausieren“ (nur vorderer Tab), „Einstellungen zum Pausieren …“ (`openPauseSettings` in App: klickt das Zahnrad und fokussiert `#set-pause`).
  - `onKeepTab(tabId?)` – Ausnahme für jeden Tab, nicht nur den vorderen. Meldungen klarer („pausiert nie – … Das durchgestrichene Pause-Zeichen am Tab zeigt das.“).
  - `isEmbedPlayer()` in workspace.ts: `youtube.com/embed/…` und `youtube-nocookie.com/embed/…` gelten nicht als gesperrt.
  - Menü-Pfeiltasten gehen jetzt auch über `menuitemcheckbox` (vorher übersprungen – betraf auch ⋮).
- **F-202 Stufe 1 ✓:** `Bookmark.keep` (Speicher liest es), Schalter „Nie pausieren“ im Source-Dialog (Bookmarks.tsx, mit Erklärtext), `saveBookmark` behält `keep`, wenn nicht ausdrücklich true/false. pause.ts: `keptSources`, `keptBySource`, `keepTabOf(p, tab, src?)`, `setSourcesKeep(ws, ids, keep)`; Reducer `keepSources`. App: `keptSrc` (useMemo), an usePause (6. Argument), tabAwake und **Portale hinten im Stack/unsichtbar** (`keepTabOf(m, m.activeTab, keptSrc)` statt nur `m.keep` – gilt damit auch für Tab-Ausnahmen). Test „F-202 Sources nie pausieren“.
- Hilfe `pause`: Zeichen am Tab erklärt, Frage „Was bedeutet das durchgestrichene Pause-Zeichen am Tab?“.
- Tests: **260 grün**; `tsc --noEmit` sauber.

## Commit-Text (für GitHub Desktop)

**Summary:** `V47+V48: Portale pausieren, Pause-Zeichen am Tab, Source nie pausieren`

**Description:**
```
V47 (F-06 Stufe 2):
- Sichtbare Portale pausieren nach eigener Zeit (Einstellung „Sichtbares pausieren“)
- „Jetzt pausieren“ und Ausnahme „Diesen Tab nicht pausieren“
- Kein Neuladen beim View-Wechsel (Dashboard, 2 × 2, 2, Solo)
- Fehler behoben: Inhalt schmaler Portale verrutschte beim Fokus auf ⋮

V48 (F-201, F-202 Stufe 1):
- Pause-Zeichen am Tab vor dem ×: schlicht, pausiert oder rot durchgestrichen (pausiert nie)
- Menü am Zeichen: Tab, Source oder Portal nie pausieren, jetzt pausieren, Einstellungen
- Schalter „Nie pausieren“ im Source-Dialog, gilt für alle Tabs mit dieser Source
- YouTube-Embed-Adressen laden direkt
- Pfeiltasten in Menüs auch über Einträge mit Häkchen
- Lastenheft, Hilfe und Übergabe V48 aktualisiert; 260 Tests grün
```

## Nächste Schritte

1. **Enrico prüfen lassen:** Pause-Zeichen am Tab (Platz vor ×, rot durchgestrichen gut erkennbar? Menü verständlich?), „Einstellungen zum Pausieren …“, Schalter „Nie pausieren“ im Source-Dialog (Stern in der Adresszeile → Source → Haken), danach Tab mit dieser Source zeigt das rote Zeichen. YouTube-Embed lädt ohne „Trotzdem“.
2. **F-202 Stufe 2:** Mehrfachauswahl in der **Library** (Haken je Source, Knöpfe „Ausgewählte nie pausieren“ / „… wieder pausieren“, Anzahl gewählt angesagt, Tastatur) – Reducer `keepSources` ist fertig.
3. **F-202 Stufe 3:** dieselbe Mehrfachauswahl im **Cockpit** (Enrico: beides; z. B. Umschalter „Portale | Layouts | Sources“).
4. **F-202 Stufe 4: Tour „Verhalten von Sources einstellen“** – Enrico: **alle** Möglichkeiten zum Einstellen und Anzeigen von Sources, **auch das Pause-Zeichen am Tab und sein Menü**, Schalter im Source-Dialog, Mehrfachauswahl, Öffnen in Tab/Fenster/Launcher, Library dieses Portals, Kategorie/Farben, Symbole der Webseiten. Mit Hilfe-Eintrag und Fragen (F-186).
5. **F-188** (Cockpit auf Smartphones straffen).
6. **F-116 mit F-53.** F-200 Zeitpunkt mit Enrico klären.
7. F-201 Rest: (4) Video in View „2“ zu groß/abgeschnitten (vermutlich Zoom/„Breite halten“ nach Dashboard-Breite, `frameWidth`), (5) Neuladen mit E-Sources-Kopie.

## Kleine Punkte

- Neu (V48): Wünsche Enrico zur Größe in View „2“/Solo: Größe dort nicht verstellbar (bisher Absicht: nur im Dashboard). Enrico hat das angemerkt – bei Gelegenheit fragen, ob gewünscht.
- Neu (V48): Pause-Zeichen am Tab macht den Namen des Tabs für Bildschirmleser länger („… Pausieren: „x“ – Zustand … schließen“), wie schon das ×. Bei Bedarf Tab mit eigenem aria-label versehen.
- Neu (V48): Tabs im Hintergrund, die noch nie angesehen wurden, zeigen „pausiert“ (sind ja nicht geladen) – richtig, kann aber überraschen.
- Neu (V48): „Source nie pausieren“ im Tab-Menü findet die Source über `bookmarkOf` (gleiche Adresse, bevorzugt in der Library dieses Portals). Ohne gespeicherte Source ist der Eintrag gesperrt mit Hinweis (Stern in der Adresszeile). Evtl. später gleich speichern anbieten.
- Neu (V48): `openPauseSettings` öffnet das Zahnrad per `click()` und fokussiert nach 80 ms `#set-pause` – bei Umbau des Einstellungsmenüs mitziehen.

- Neu (V47): **Kopfzeile schmaler Portale läuft über** – ⋮ (Portal-Optionen) und weitere Knöpfe liegen außerhalb der sichtbaren Fläche (z. B. 195 px breites Portal: ⋮ bei +400 px). Mit der Maus nicht erreichbar, mit Tastatur fokussierbar, aber unsichtbar. Kopfzeile bei wenig Breite einklappen (z. B. Knöpfe ins Menü, ⋮ immer sichtbar). Barrierefreiheit!
- Neu (V47): Wache, aber unsichtbare Portale (andere View) zählen wie Verdecktes (Zeit „Verdecktes pausieren“). Im Solo-Modus bleiben die anderen also bis zu 10 min geladen – gewollt (schneller Rückweg).
- Neu (V47): „Jetzt pausieren“ wird nicht gespeichert; nach Neuladen der Seite ist das Portal wieder wach. Benutzung in eingebetteten Seiten zählt nur über Fokus (Klick ins iframe) – reines Lesen/Scrollen mit Maus ohne Klick zählt nicht; Video ohne Klick pausiert nach 1 h (dann „Nicht pausieren“).
- Neu (V47): Im Browser-Test klickt `locator.click()` auf ⋮ in schmalen Portalen ins Leere (andere Kachel liegt darüber) – `evaluate(b => b.click())` nehmen. Häkchen-Einträge im Menü sind `menuitemcheckbox`, nicht `menuitem`. `browser.show()` setzt den Viewport auf die Größe des Bereichs (schmal) – danach `setViewportSize({width:1280,height:800})`.

- Neu (V46): Tour „Öffnen in einrichten“ – Wege für Edge, Firefox, Safari nicht im echten Browser geprüft (nur Chrome mit Enrico). Safari zeigt in der Favoritenleiste kein Symbol.
- Neu (V46): Wer die Export-Datei wieder in E-Sources importiert, bekommt „Öffnen in“ als nicht übernehmbar gezählt (javascript:-Adresse, `importableUrl`) – harmlos, evtl. still überspringen.
- Neu (V46): „Breite halten“ – in sehr schmalen Slots (unter 640 px) erreicht die Seite 1280 px nicht (bei 50 % ist Schluss); angezeigt wird die tatsächliche Breite. Das Portal-Menü (⋮ › Zoom) hat keinen eigenen Schalter „Breite halten“ (nur das Zoom-Feld).
- Neu (V46): `frameWidth` ist ein Zwischenspeicher außerhalb von React (Map je Portal-Id); wird ein Portal nie gezeigt (Stack hinten), ist die Breite 0 und Alt-Kürzel ändern dort den festen Zoom.

- Neu (V45): Zoom – Alt/⌥+Plus/Minus nur mit simulierten Tastendrücken geprüft (Testbrowser kann Alt+Minus nicht senden); Enrico bitten, auf dem Mac zu prüfen. Touch-Bedienung des Reglers nur mit simulierten Zeiger-Ereignissen geprüft.
- Neu (V45): Zoom gilt je Portal (alle Tabs), nicht je Tab; das Lineal (F-15) rechnet den Zoom nicht ein.
- Neu (V45): Zoom-Feld bleibt bei „fest geöffnet“ (Klick) auch beim Verlassen offen; schließt mit Klick daneben, Klick in die Seite oder Esc.
- Neu (V45): Wird das Zoom-Feld gezogen, sagt jede Stufe einzeln an (kann gesprächig sein).
- Neu (V45): Begrüßung – der Ring läuft im verborgenen Browser-Bereich (eingebauter Browser nicht sichtbar) sofort ab; im sichtbaren Fenster normal.
- Neu (V45): Design – „Zurücksetzen“ nimmt nur diesen Desk zurück; der Hinweis unten nach „Alle auf Desk-Farben zurücksetzen“ hat weiter „Rückgängig“.
- Neu (V45): Profil – der Name wird beim Speichern bereinigt (`cleanName`), Leerzeichen am Ende zählen nicht als Änderung.

- Neu (V44): Begrüßung – Tab-Reihenfolge nach dem Aufklappen: „Weniger“ → „Profil …“ → × → Felder (Ecke steht im DOM vor den Feldern).
- Neu (V44): „Zurücksetzen“ in „Farben“ lässt neu angelegte Kategorien bestehen (nur Zuordnung des Portals geht zurück); die Kopf-Taste „Alles wie Desk“ gibt es weiter daneben – evtl. später zusammenführen oder umbenennen, falls verwirrend.
- Neu (V44): Bei Lesezeichen-Feld der Begrüßung und `forced-colors` nur per CSS geprüft (Test-Library leer).
- Neu (V44): Zeichen-Suche findet nur über die deutschen Namen in `CATEGORY_ICON_LABEL` (keine Stichwörter); bei Bedarf Stichwörter je Zeichen ergänzen.

- Neu (V43): Im eingebauten Browser melden sich **unsichtbare Fenster aus früheren Sitzungen als Main Desk** (Test-Kanal `esource.windows.test`, 6 Stück) – darum löst F-190 dort statt Wechsel `window.close()` aus, und von Skripten geöffnete Test-Tabs schließen sich. Prüfen mit einem eigenen BroadcastChannel (`hello` senden, `here` sammeln).
- Neu (V43): „Zuletzt benutzt“ kennt den Verlauf erst ab V43; „Zuletzt geschlossen“ (F-24) ist nicht aufgenommen. Lesezeichen-Klick aus der Begrüßung nur über den Weg der Suche geprüft (Test-Library leer).
- Neu (V43): Mehrere Fenster schreiben `esource.recent` gemeinsam (lesen–ändern–schreiben je Ereignis, kein Sperren) – bei gleichzeitigen Klicks kann ein Eintrag fehlen; harmlos.
- Neu (V43): Nach Wechsel über die Begrüßung kommt das Portal nach vorn, die Begrüßung erscheint dort nicht erneut (gewollt).


- Aus V42: Symbol in der Lesezeichenleiste – **erledigt in V46** (Import der Datei klappt in Chrome; Anleitung F-197; Erweiterung später F-198).

- Neu (V42): Im eingebauten Browser antworten auf den Test-Kanal unsichtbare Fenster aus früheren Sitzungen (in `tabs.list()` nicht zu sehen) – darum mehrere Angebote; durch `from` und Zusammenfassen je Desk harmlos.
- Neu (V42): Bookmarklet-Popups schließen sich mit `window.close()`; öffnet der Browser kein Popup, lädt das Bookmarklet E-Sources im selben Tab (dann schließt nichts).
- Neu (V42): „Neuer Slot“ über „Senden“ legt den Slot immer rechts an und fragt nicht wie NewSlot über der Empfehlung (F-52) – nur `canAddArea`.
- Neu (V42): Der Countdown sagt die Sekunden nicht an (nur sichtbar); Screenreader hören erst „Angehalten …“. Ggf. einmalige Ansage zu Beginn ergänzen.

- Aus V41: View-Wechsel baut nicht mehr neu auf (V47); Desk-Wechsel im selben Fenster schon.
- Neu (V41): „Nie“ → zurück auf eine Zeit entlädt sofort alles Verdeckte, das noch nie angesehen wurde (gewollt, aber evtl. überraschend).
- Neu (V41): Hinweis nach Web-Suche kommt bei jeder Suche (12 s) – bei Bedarf nur die ersten Male.
- Neu (V41): `window.open` mit `noopener` meldet keinen Popup-Blocker – blockt der Browser, merkt E-Sources es nicht. Im eingebauten Browser blockt er Popups aus Skripten immer (Test nur per Ansage).
- Neu (V41): Zieht man einen Link direkt über einem eingebetteten iframe in das Fenster (ohne vorher über Kopfleiste/Rand zu kommen), sieht E-Sources das nur, wenn vorher gesucht wurde und das Fenster im Hintergrund war (`is-linkdrop`). Mit echtem Ziehen aus einem zweiten Fenster noch nicht von Hand geprüft – Enrico bitten.
- Aus V41/V47: Jedes Portal hat jetzt ein eigenes `.tile` (verborgen: `.tile.is-back`, `display:none`); Selektoren auf das Sichtbare: `main .tile:not(.is-back)`. `.tile__layer`, `.maximized`, `.split` gibt es nicht mehr (alte CSS-Regeln für `.maximized`/`.split` sind tot, können weg).
- Neu (V40): Schraffur „über Empfehlung“ folgt der Reihenfolge im Teilungsbaum – wird ein Slot verschoben (z. B. an den unteren Rand), ist danach er schraffiert statt des zuletzt angelegten. Besser: echte Anlege-Reihenfolge merken.
- Neu (V40): „Slot rechts/unten“ im Layout-Modus legt ein leeres Portal an; auf anderen Bildschirm-Einstellungen desselben Layouts erscheint es nach der üblichen Regel (eigener Slot oder Stack ganz rechts).
- Neu (V40): Für ein gewähltes anderes Gerät fehlt die Pixel-Prüfung aus F-52 (240 × 160) – Grenze ist dort nur die doppelte Empfehlung. „Gleich verteilen“ gleicht weiter nur Anteile im Teilungsbaum an (kein echtes Raster).
- Neu (V40): Die Gerätewahl im Layout-Modus gilt nur, solange das Cockpit offen ist (danach wieder „dieses Gerät“).
- Neu (V40): Sehr schmale Geräte im Hochformat (z. B. Super-Ultrawide hoch) ergeben ein schmales Bild (Höhe höchstens 400 px).
- Neu (V40): Im Browser-Test `tab.drag` mit Bildpunkten des Screenshots: Faktor = Screenshot-Breite (ohne `scale`) ÷ Viewport-Breite (bei 1600 px Viewport 1389/1600). Falsche Umrechnung trifft den Hintergrund und schließt das Cockpit.
- Cockpit auf kleinen Bildschirmen – Kopfzeile wird eng; Smartphone: siehe F-188 (entschieden: zulassen und straffen).
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

Wie V15–V47: Funktion vor Design · Barrierefreiheit immer (NF-03) · Begriffe erklären (Texte nur in terms.ts/help.ts) · offene Punkte im Blick, Restplatz mit kleinen Punkten füllen · Lastenheft zuerst · Sammelmodus `>START` … `<ENDE` · Terminal: nur nächster Schritt · „PO“ = Push Origin · Übergabe spätestens bei 60–70 %, nie mitten in einer Aufgabe · Datei `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/` · Usability: so einfach und wirksam wie möglich für den Anwender. · **Commit-Text:** Jede Übergabe enthält einen Abschnitt „Commit-Text“ (Summary + Description für GitHub Desktop), und Claude nennt ihn am Ende des Chats von sich aus – Enrico vergisst sonst die Beschreibung (seit V48).
