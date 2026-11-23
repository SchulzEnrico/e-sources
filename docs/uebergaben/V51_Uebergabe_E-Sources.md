# Übergabe V51 → V52 E-Sources

Stand: 23.11.2026 · Chat V51 abgeschlossen · Nächster Chat: **V52 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V52 E-Sources**. Lies diese Übergabedatei und das Lastenheft unter `docs/Lastenheft/Lastenheft_E-Sources.md`. Frag Enrico kurz nach seiner Prüfung von V51 (siehe „Nächste Schritte“ 1). Dann **F-116 mit F-53 Stufe 1** (Space/Case) – Umfang ist freigegeben, siehe unten. Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft:** `docs/Lastenheft/Lastenheft_E-Sources.md` (V51: F-203 ✓, F-204 ✓, F-188 Rest ✓, F-200 Stufe 1 ✓; Vermerke F-202/F-180 im Haupttext nachgetragen). Offen aus V27: Claude Doc https://claude.ai/artifact/5LcrJ6JwXyEvUMcJjZQRY8 – klären, ob es noch gilt.
- **Dashboard (neu):** `docs/E-Sources_Dashboard_V51.pdf` – Stand und nächste Schritte, 2 Seiten. Quelle: `/home/claude/dash/dashboard.html` gibt es im neuen Chat nicht mehr; bei Bedarf neu bauen (HTML → Chrome headless „print-to-pdf“, A4 quer).
- **Benennung – Ergebnis:** https://claude.ai/artifact/5Di2hzfovkm1NcmV3bocdp
- **Geschichte der Anwendung:** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – Ausblick noch nicht nachgezogen (F-151 bis F-204)
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`

## Was in V51 passiert ist

- **Git:** V50 war schon committet. V51 noch nicht committet – Commit-Text unten.
- **Prüfung V50 (Enrico):** Tour „Verhalten von Sources“ gut, aber „keiner wird sie über die Suche suchen“ → F-203. Fehler: In der gestrafften Kopfleiste verdeckte „+ NewDesk“ die Anzeige „Main Desk“.
- **Desk-Name (F-188 Rest):** `.tb-win` ohne Bearbeiten jetzt `inline-block` (Flex verhinderte „…“), `min-width: calc(9ch + 22px)` = „Main Desk“ immer ganz lesbar, längere Namen kürzen bis 12–22ch je Breite. Geprüft bei 375/480/600/700/760/900/1100 px: nichts überlappt, kein Querscrollen.
- **F-203 Tour sichtbar:** In `PickBar` (Library und Cockpit „Sources“) Knopf „Tour“ oben rechts; einmaliges Angebot unten („Tour starten“) beim ersten Anzeigen der Leiste (`offerTourOnce`, Key `esource.tour.offered.sources`, nur wenn Touren von selbst starten dürfen). Neu in `tour.ts`: `TOUR_EVENT`/`requestTour(id)` – App startet die Tour (schließt Cockpit), PanelFrame schließt die Library.
- **F-204 Mehrfachauswahl:** Leiste bei Auswahl: „n gewählt · Nie pausieren · Normal pausieren · Mehr … · Fertig“ (haftend, kompakt). „Mehr …“ (aria-expanded) klappt auf: Kategorie (Auswahl + „Setzen“), Tags („Hinzufügen“/„Entfernen“, Komma-getrennt), Library von Portal („Zuordnen“/„Entfernen“), „Löschen …“ → „n Sources wirklich löschen“. Jede Änderung mit Hinweis und „Rückgängig“. Logik `bulkSources`/`restoreSources` in `bookmarks.ts`, Aktionen `bulkSources`/`restoreSources` in `useWorkspace.ts`, Texte `BULK_TEXT` in `terms.ts`.
- **Fehler behoben:** „Rückgängig“ im Hinweis unten schloss das Cockpit (Fokus wanderte hinaus) – `Overview` ignoriert jetzt Fokus auf `.toast`.
- **F-200 Stufe 1 Entwickler-Modus:** Feld `dev` am Portal (types/storage), Aktion `devPanel`, `toggleDevPanel` (workspace.ts), Menü ⋮ „Entwickler-Modus“ (Häkchen, Erklärzeile), Hilfe-Eintrag `devMode` mit Fragen (schaltet aktives Portal), Symbol `dev` (</>). Bauteil `DevSize.tsx`: unten links im Seitenbereich Größe der Seite in CSS-Pixeln (= Anzeigefläche ÷ Zoom) + Geräteklasse (`workspace/dev.ts`, `DEV_BREAKPOINTS`), bei Zoom „80 % · im Slot w × h px“; Ansage nach 0,9 s Stillstand. Unten rechts bleibt die Lineal-Größe.
- **Dashboard-PDF** V51 erstellt (Wunsch Enrico).
- **F-116 Stufe 1 noch nicht begonnen** – Umfang im Lastenheft festgehalten (Enrico: „mach wie aufgeführt“).
- Tests: **263 grün** (neu: F-204 ×2, F-200); `tsc --noEmit` sauber. Im Browser geprüft: Kopfleiste, Mehrfachauswahl im Cockpit (Tags, Kategorie, Löschen + Rückgängig), Tour-Knopf, Entwickler-Modus.

## Nächste Schritte

1. **Enrico prüfen lassen:** Kopfleiste schmal (Desk-Name), „Tour“-Knopf und Angebot, Mehrfachauswahl („Mehr …“), Entwickler-Modus (⋮ → „Entwickler-Modus“). **Frage:** Soll das Einschalten des Entwickler-Modus den Zoom auf 100 % stellen und „Breite halten“ ausschalten? (Bisher: beides bleibt, beide Größen werden gezeigt.)
2. **F-116 mit F-53 Stufe 1** (freigegeben): Spaces und Cases anlegen/umbenennen/löschen (Name, Farbe; ein Case gehört zu genau einem Space). Layouts einem oder mehreren Cases zuordnen – im Layout-Modus des Cockpits sichtbar und änderbar. Case wählen → zugeordnete Layouts angeboten, bei genau einem gesetzt. Cases bündeln in Stufe 1 **nur Layouts**. Meine Annahme (Enrico hat nicht ausdrücklich gewählt): Case-Wahl **im Cockpit (Layouts)** und über die Suche, nicht in der Kopfleiste – mit Enrico kurz bestätigen. Vorhanden: `PanelMeta.sphere/scenario`, `ws.spheres`/`ws.scenarios` (Suche zeigt sie); Layouts in `deskLayouts.ts` (`DeskLayout {id,name,saved}`) noch ohne Zuordnung. Dialoge mit sichtbarem Abschluss (F-191), Barrierefreiheit, Begriffe in terms.ts erklären, Hilfe-Einträge mit Fragen, Tour-Schritt im Cockpit ergänzen.
3. F-201 Rest: (4) Video in View „2“ zu groß/abgeschnitten (vermutlich `frameWidth`/„Breite halten“), (5) Neuladen mit E-Sources-Kopie.
4. Entwickler-Modus Stufe 2 nach Enricos Zoom-Entscheidung; mit F-18/F-115 (Gerätevorschau) zusammen denken.

## Commit-Text V51

**Summary:** `V51: Mehrfachauswahl kann alles, Touren sichtbar, Entwickler-Modus, Desk-Name nicht verdeckt`

**Description:**
```
F-204: Mehrfachauswahl in Library und Cockpit „Sources“ kann alles,
was an einer Source einstellbar ist – Kategorie, Tags, Library eines
Portals, nie/normal pausieren, löschen; jeweils mit „Rückgängig“
(„Mehr …“ klappt die Einstellungen auf, Leiste bleibt kompakt)

F-203: Tour „Verhalten von Sources“ sichtbar – Knopf „Tour“ in der Leiste,
einmaliges Angebot beim ersten Öffnen; Touren per Ereignis startbar

F-200 Stufe 1: Entwickler-Modus je Portal (Menü ⋮ und Hilfe) zeigt die
echte Seitengröße in CSS-Pixeln mit Geräteklasse, live beim Ziehen

F-188: Desk-Name in schmaler Kopfleiste nicht mehr von „+ NewDesk“ verdeckt
Fix: „Rückgängig“ im Hinweis schließt das Cockpit nicht mehr

Tests: 263 grün. Lastenheft: F-203/F-204 neu und erledigt, F-116 Stufe 1
festgelegt; Dashboard V51 (PDF); Übergabe V51
```

## Kleine Punkte

- Neu (V51): Bei „Mehr …“ in sehr schmalen Portalen (Library) ist die Leiste hoch; der aufgeklappte Teil scrollt selbst (max. 40vh). Bei Bedarf in schmalen Portalen auf das Cockpit verweisen.
- Neu (V51): Löschen per Mehrfachauswahl hat keine `ask`-Rückfrage, sondern zweistufigen Knopf („Löschen …“ → „n wirklich löschen“, verschwindet beim Verlassen) plus „Rückgängig“ – wie im Source-Dialog.
- Neu (V51): „Rückgängig“ (restoreSources) setzt die alten Fassungen an ihrer alten Stelle ein; zwischenzeitliche Änderungen an genau diesen Sources gehen dabei verloren (8 s Fenster).
- Neu (V51): Entwickler-Modus misst den Seitenbereich des Portals (`.devsize` → parentElement). Im Testmodus deckt das Schild „Test: …“ unten links die Anzeige im linken unteren Portal ab (nur Test).
- Neu (V51): Das Tour-Angebot kommt einmal pro Browser; zurücksetzen mit `localStorage.removeItem('esource.tour.offered.sources')`.
- Neu (V51): Im Browser-Test löscht jeder Hot Reload die Test-Sources – nach Code-Änderungen ⚙ → „Beispiel-Sources anlegen“ neu klicken. Cockpit-Umschalter „Sources“ ist ein `button`, kein `radio`/`tab`. Hinweis unten hat die Klasse `.toast`.

- Neu (V50): `workspace/flash.ts` – `flash({ text, ms, action })` zeigt den Hinweis unten aus jedem Bauteil (App hört auf `esource:flash`). Für weitere Bestätigungen mit „Rückgängig“ nutzen statt Props durchzureichen.
- Neu (V50): Ursache von „lässt sich nicht wieder abschalten“ (Prüfung Enrico) nicht sicher geklärt – im Test ging es; Vermutung: Tab hatte eigene Ausnahme („Diesen Tab nie pausieren“/Portal). Nach dem Umbau sagt Enrico „scheint jetzt zu gehen“. Evtl. im Menü am Pause-Zeichen sichtbar machen, **warum** ein Tab nie pausiert (Tab, Source oder Portal).
- Neu (V50): In schmalen Portalen ist die Library-Zeile eng (Haken, Pause-Zeichen, Titel, Stern, ✎).
- Neu (V50): Tour „Verhalten von Sources“ startet nicht von selbst (nur Hilfe/Suche); fehlt ein Portal mit Source, werden Schritte übersprungen.
- Neu (V50): Cockpit 761–1280 px: „Hier sammeln“, „Verteilen“, „Regeln“, „Tour“ nur als Symbol – auf Touch-Geräten ohne Tooltip. Bei Bedarf Breite anpassen.
- Neu (V50): Im Ordner `~/Projects/Claude outputs/` liegt eine veraltete Kopie des Lastenhefts (89 KB) – gültig ist `docs/Lastenheft/`. Kann nach `_to_delete`.

- Neu (V49): Auswahl in Library bzw. Cockpit geht beim Schließen verloren (Zustand nur im Bauteil) – gewollt, einfach.
- Aus V49: Mehrfachauswahl kann bisher nur „nie pausieren“. Weitere gemeinsame Aktionen (Kategorie setzen, löschen) wären mit `PickBar` leicht – Enrico fragen (in V50 noch nicht gefragt).
- Neu (V49): Im Testmodus löscht jeder Hot Reload nach Code-Änderungen die gespeicherten Test-Sources (nichts wird gespeichert) – nach Änderungen neu speichern.

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

Wie V15–V50: Funktion vor Design · Barrierefreiheit immer (NF-03) · Begriffe erklären (Texte nur in terms.ts/help.ts) · offene Punkte im Blick, Restplatz mit kleinen Punkten füllen · Lastenheft zuerst · Sammelmodus `>START` … `<ENDE` · Terminal: nur nächster Schritt · „PO“ = Push Origin · Übergabe spätestens bei 60–70 %, nie mitten in einer Aufgabe · Datei `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/` · Usability: so einfach und wirksam wie möglich für den Anwender · **Am Ende jedes Chats fertigen Commit-Text liefern (Summary + Description für GitHub Desktop).**
