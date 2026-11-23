# Übergabe V60 → V61 E-Sources

Stand: 23.11.2026 · Chat V60 abgeschlossen · Nächster Chat: **V61 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V61 E-Sources**. Lies diese Übergabedatei und das Lastenheft unter `docs/Lastenheft/Lastenheft_E-Sources.md`. Dann „Nächste Schritte“ ab 1. Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft:** `docs/Lastenheft/Lastenheft_E-Sources.md` (V60: F-158 und F-147 fertig, Reihenfolge Punkte 19 und 20).
- **Dashboard:** `docs/E-Sources_Dashboard_V51.pdf` (Stand V51).
- **Benennung – Ergebnis:** https://claude.ai/artifact/5Di2hzfovkm1NcmV3bocdp
- **Geschichte der Anwendung:** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – Ausblick Stand 23.11.2026; nachzuziehen: Abgleich über GitHub Gist (V58/V59), Slot als Datei (F-158), Farbpipette (F-147).
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`
- **Demo:** https://schulzenrico.github.io/e-sources/ (GitHub Pages, nach Push ca. 1–2 min)
- **Portfolio:** lokal `~/Projects/SchulzEnrico.github.io` – Bereich „Aktuelles“ (`#aktuell`, DE `index.html`, EN `en/index.html`) **bei jedem größeren Schritt mitziehen** (Wunsch Enrico, V57).

## Was in V60 passiert ist

- **Schritt 1 aus V59** war schon erledigt (beide Repos committet und gepusht).
- **Wahl Enrico:** „1 und 3“ → F-158, danach F-147 (Lastenheft Reihenfolge 19 und 20).
- **F-158 Slot als Datei** (neues Modul `workspace/slotFile.ts`): `slotToFile` (Portale, Tabs mit Verlauf, Slot-Name/-Farben, benutzte Kategorien; ohne `win`, `areaName`, `sphere`, `scenario`, `devKeep`), `readSlotFile` (Prüfung, höchstens 9 Portale/9 Tabs, erkennt Desk-Datei), `importSlot` (neuer Slot rechts über `addArea`, das leere Portal wird ersetzt; neue Ids; Name bei Gleichstand „Name 2“; Kategorien über den Namen, fehlende angelegt; `nextNumber` bleibt), `slotFileName`. `parsePanel` in storage.ts ist jetzt exportiert.
  - Wege: Portal-Menü ⋮ › „Slot als Datei speichern“ (über „Entwickler-Modus“) · Cockpit unter der Portal-Liste des gewählten Slots „Slot als Datei: Speichern · Slot laden …“ (`.radar__slotfile`) · Zahnrad › „Slot aus Datei laden …“ (unter „Desks aus Datei laden …“) · Hilfe/Suche `saveSlot`, `loadSlot`. Slot-Datei über „Desks aus Datei laden …“ → wird als Slot geladen.
  - Texte `SLOT_FILE_TEXT` (terms.ts). Im Browser geprüft: Export aus Menü und Cockpit (Download abgefangen, 9 Portale × 9 Tabs), Laden über beide Wege, zweites Laden → „H Slot 1 2“, Desk-Datei → Fehlermeldung.
- **F-147 Farbpipette** (neu `workspace/picker.ts`, `components/ColorPicker.tsx`): Zahnrad › „Farbpipette …“ (unter dem Lineal), Hilfe/Suche `colorPicker`, Zeichen `pipette`. „Farbe aufnehmen“ (EyeDropper) → kopiert HEX, Liste der letzten 12 (HEX/RGB kopieren, ×, „Liste leeren“), Eingabe von Hand (Feld „HEX“), ohne EyeDropper „Farbwahl des Systems …“. Kopieren mit zweitem Weg (`execCommand`), Ansage mit Farbname (`colorName`). Im Browser geprüft: Öffnen, Fokus, falsche Eingabe, Hinzufügen, Kopieren, Esc → Fokus aufs Zahnrad.
- **Portfolio „Aktuelles“ DE/EN:** Lineal **und Farbpipette**, Export/Import **auch einzelner Slots als Vorlage** (noch zu committen).
- Tests: **304 grün** (8 neue); `tsc --noEmit` sauber.

## Nächste Schritte

1. **Commits** (Enrico, GitHub Desktop): Repo `e-sources` und Repo `SchulzEnrico.github.io` (Texte unten), dann PO.
2. **Geprüft (Enrico, V60):** Farbpipette geht. Repo e-sources ist gepusht; Portfolio-Commit „Aktuelles: Farbpipette und Slot-Export“ war noch offen (Text unten).
3. **Nächstes Paket** mit Enrico wählen. Offen aus der Liste: F-157 bebilderte Erklärungen, Entwicklerwerkzeuge (F-16 Screenshot je Portal, F-18 Rest, F-115), Fokus-Timer (F-90, F-91), weitere Portaltypen (F-17, F-105, F-148). Vorher fragen, was im Alltag am meisten fehlt.
4. Kleine offene Punkte mit Barrierefreiheit (bei Restplatz): Import-Rückfrage von `window.confirm` auf `ask` umstellen (V57); Kopfzeile schmaler Portale läuft über (V47/V54); Fokus nach Hinweis-Knopf fällt auf `body` (V37); neu: Meldung „Slot … geladen“ wird von der Kategorie-Frage verdeckt (siehe unten).
5. Später (Wunsch Enrico): Stand auf allen Geräten **zurücksetzen**, „sobald wir so weit sind“.
6. **Spaces und Cases sowie Slot als Datei (F-158)** prüft Enrico ganz am Ende (nicht vorher fragen).

## Commit-Texte V60

**Repo e-sources – Summary:** `V60: Slot als Datei (F-158), Farbpipette (F-147)`

**Description:**
```
F-158 Export und Import je Slot:
- Portal-Menü „Slot als Datei speichern“, im Cockpit „Speichern“ und
  „Slot laden …“, Zahnrad „Slot aus Datei laden …“, Hilfe/Suche
- Datei mit Portalen, Tabs, Slot-Name, Farben und Kategorien
  (ohne Library, Layouts, Desk/Space/Case)
- Laden als neuer Slot rechts; Name bei Gleichstand mit Nummer,
  Kategorien über den Namen, fehlende werden angelegt
- Slot-Datei über „Desks aus Datei laden …“ wird als Slot geladen

F-147 Farbpipette:
- Zahnrad „Farbpipette …“, Hilfe/Suche; Farbe vom Bildschirm aufnehmen
  (EyeDropper), auch aus Seiten in Portalen, kopiert als HEX
- Liste der letzten 12 Farben (HEX/RGB kopieren), Eingabe von Hand,
  Farbwahl des Systems, wo die Pipette fehlt (Safari, Firefox)
- Ansage mit Farbname, ganz per Tastatur bedienbar

- Lastenheft F-158 und F-147 ✓ V60, Übergabe V60 → V61
- Tests: 304 grün
```

**Repo SchulzEnrico.github.io – Summary:** `Aktuelles: Farbpipette und Slot-Export (E-Sources)`

**Description:**
```
Bereich „Aktuell“ (DE/EN): E-Sources hat jetzt eine Farbpipette und
speichert einzelne Slots als Vorlage.
```

## Kleine Punkte

- Neu (V60): Nach „Slot laden“ fragt E-Sources für geladene Portale ohne Kategorie gleich nach der Kategorie – dieser Hinweis verdrängt die Meldung „Slot … mit n Portalen geladen“ sofort (Ansage für Bildschirmleser kommt trotzdem). Evtl. Meldung in die Kategorie-Frage einbauen oder die Frage kurz verzögern.
- Neu (V60): „Slot als Datei speichern“ lädt nur herunter (kein Teilen-Menü wie bei den Desks). Auf dem iPhone landet die Datei in „Dateien“. Bei Bedarf „Slot senden …“ wie `sendWorkspace` ergänzen.
- Neu (V60): Slot laden prüft nur `canAddArea` (bis zur doppelten Empfehlung, `spec.max`) – im Testmodus „voll“ kam der Slot als 11. dazu. Hinweis `SLOT_FILE_TEXT.full` nur per Test geprüft.
- Neu (V60): Slot-Export aus dem Cockpit für einen Slot auf einem anderen Desk geht (nimmt dessen Portale); „Slot laden …“ legt immer auf **diesem** Desk an.
- Neu (V60): Bezüge von Sources auf Portale (`Bookmark.panels`) reisen nicht mit – „Library dieses Portals“ ist beim geladenen Slot leer, bis man Sources zuordnet.
- Neu (V60): Die Pipette selbst (`EyeDropper.open`) braucht einen echten Klick des Anwenders – im Testbrowser nicht auslösbar, nur Dialog und Liste geprüft. Im eingebauten Browser ist `EyeDropper` vorhanden.
- Neu (V60): Beim Test wurde `#FF8000` in Enricos Zwischenablage kopiert (harmlos). Testfarben aus `esource.colors.v1` auf localhost wieder gelöscht.
- Neu (V60): Im Browser-Test Downloads abfangen: `HTMLAnchorElement.prototype.click` per `evaluate` ersetzen (`fetch(a.href)` → Inhalt merken) – nach jedem `goto` neu setzen. Datei laden: `DataTransfer` mit `File` ans versteckte `input[type=file]` hängen und `change` auslösen (letztes `input[accept*=json]` = Slot, erstes = Desks).


- Neu (V59): Tour „Abgleich einrichten“ ist auf `localhost:2910` als gesehen gemerkt (beim Test); zurücksetzen mit `localStorage.removeItem('esource.tour.sync.v1')`. In der Demo startet sie beim ersten Öffnen des Dialogs von selbst.
- Neu (V59): Im Testmodus (`?test=voll`) zeigt der Abgleich-Dialog keine Schritte (kein Abgleich) – die Tour zeigt dort nur die Schritte ohne Ziel. Zum Prüfen `localhost:2910` ohne `?test` nehmen und **nicht verbinden**.
- Neu (V59): Tour misst jetzt auch beim Scrollen nach (`scroll` mit capture, je Frame) – gilt für alle Touren; Rahmen in scrollenden Dialogen sitzt dadurch richtig.
- Neu (V59): Mit dem Fix ist das Schlüsselfeld dunkel (Mulde wie `.drawer input`); helle Designs (`:root[data-theme=…] input`) überschreiben es wie bisher – in hellen Designs nicht eigens geprüft.
- Neu (V59): Zustand „verbunden“ der Tour (Schritte „Zustand“ und „Knöpfe“) nur per Test geprüft (`tourSteps`), nicht im Browser – bei Gelegenheit in der Demo auf einem verbundenen Gerät Knopf „Tour“ drücken.
- Neu (V58): Bei einem Gleichstand der Zeiten gewinnt dieses Gerät (`newerWins`). Uhren der Geräte gehen leicht verschieden – bei sehr knappen Änderungen auf zwei Geräten kann der „falsche“ gewinnen; „Rückgängig“ und Gist-Verlauf fangen das auf.
- Neu (V58): „Rückgängig“ gibt es nur auf dem Gerät, dessen Stand ersetzt wurde, und nur 12 s im Hinweis; die Sicherung bleibt in `esource.gist.backup` liegen (wird erst beim Rückgängig gelöscht). Evtl. später im Dialog „Vorherigen Stand zurückholen“ anbieten.
- Neu (V58): Jede Änderung löst nach 30 s einen GET aus (auch ohne eigene Änderung „same“) – GitHub erlaubt 5000/h, unkritisch.
- Neu (V58): Statustext im Dialog sagt „Zuletzt abgeglichen“ auch nach reinem Prüfen ohne Änderung (gewollt).
- Neu (V58): Gesperrter/gelöschter Schlüssel → Fehler „GitHub kennt diesen Schlüssel nicht“ als „!“ am Zeichen; neu verbinden über „Trennen“ und erneut einrichten.
- Neu (V58): Import per Datei (`importWorkspace`) übernimmt `winSetup` der Datei (anders als der Abgleich) – bei Bedarf auch dort `keepDeviceFields` nutzen.
- Neu (V58): Hinweis `undoGone` erscheint, wenn die Sicherung fehlt.


- Neu (V57): „An anderes Gerät senden …“ nur im eingebauten Browser geprüft (kein `navigator.canShare` → Weg „speichern und erklären“; nicht geklickt, weil das einen Download auslöst). Teilen-Menü bitte auf Mac (Safari) und iPhone prüfen. Chrome auf dem Mac kann Dateien meist nicht teilen → speichert.
- Neu (V57): Import fragt weiter mit `window.confirm` (alter Weg); bei Gelegenheit auf die eigene Rückfrage `ask` umstellen (Barrierefreiheit, gleiche Optik).
- Neu (V57): Touch-Geräte sehen die Tooltips der drei Einträge nicht – Erklärung steht in Hilfe/Suche; evtl. sichtbare Kurzzeile unter den Einträgen (wie im Pause-Menü, `hint`).

- Neu (V56): Bei schmalem Cockpit (unter ca. 1100 px) bricht „Cases:“ in eine zweite Zeile um; der Trennstrich steht dann am Zeilenende (unter 760 px ausgeblendet).
- Neu (V56): Das Case-Angebot im Kopf zeigt auch das schon aktive Layout als „Zu … wechseln“ (harmlos, wechselt nicht wirklich). Bei Bedarf ausblenden oder als „aktiv“ kennzeichnen. Das Angebot macht den Kopf zweizeilig.
- Neu (V56): Gerätewahl setzt den gewählten Slot zurück („Gewählter Slot: noch keiner“) – war schon so, fällt jetzt mehr auf.
- Neu (V56): Im Browser-Test führt Esc im Cockpit aus dem Layout-Modus erst zu „Portale“; nach Hot Reload steht das Cockpit wieder auf „Portale“ – Modus-Knopf: `#overview .overview__mode button` (nth 1 = Layouts).
- Neu (V56): Klassen `.lc__band` (jetzt Kopf der Gruppe Layouts), `.lc__facts` (jetzt Text statt Liste), `.lc__name` (jetzt im Fließtext) haben neue Bedeutung.

- Neu (V55): Ruler-Werkzeuge (Farbe, 123, ×) liegen oben rechts im Lineal-Bereich – beim Gerät also über der Seite im Umriss; in kleinen Geräte-Umrissen eng.
- Neu (V55): Die Kopfzeile ist durch `flex-wrap` jetzt überall umbruchfähig; über 520 px bleibt sie normalerweise einzeilig (Adresse hat `flex: 1`, Basis 0). Falls in mittleren Breiten unerwartet Umbrüche auftauchen: hier ansetzen.
- Neu (V55): Container Queries (`container: winbar` / `devbar`) – erster Einsatz im Projekt.
- Neu (V55): Hinweis „Neu (V50): veraltete Lastenheft-Kopie in Claude outputs“ und „Aufräumen DevSize“ (V54) sind erledigt.


- Neu (V54): Kopfzeile schmaler Portale läuft weiter über (V47) – der neue Entwickler-Knopf braucht dort zusätzlich Platz. Einklappen bei wenig Breite bleibt offen (Barrierefreiheit).
- Neu (V54): Case wählen, dessen einziges Layout schon aktiv ist, meldet trotzdem „… ist jetzt aktiv“ (harmlos).
- Neu (V54): Zuordnungen in `layoutCases` bleiben nach dem Löschen eines Layouts stehen (für „Rückgängig“); `dropLayoutCases` in cases.ts ist vorbereitet, aber unbenutzt. `layoutsForCase` filtert Gelöschtes ohnehin weg.
- Neu (V54): Dialog „Spaces und Cases“ gibt es zweimal eingehängt: im Layout-Modus (DeskLayouts) und in App (Hilfe/Suche, `casesOpen`).
- Neu (V54): Im Testbrowser hat `getByLabel('Neuer Space')` zwei Treffer (Abschnitt und Feld) – `getByRole('textbox', …)` nehmen.
- Neu (V54): Tour „Entwickler-Modus“ zurücksetzen: `localStorage.removeItem('esource.tour.offered.dev')` und `'esource.tour.dev.v1'`.

- Neu (V53): Im Browser-Test löscht jeder Hot Reload die Test-Belegung – danach Entwickler-Modus neu einschalten (⋮ per `evaluate(b => b.click())`, dann `menuitemcheckbox` „Entwickler-Modus“). `keyboard.press('Alt+Equal')` geht im Testbrowser nicht.
- Neu (V53): ResizeObserver feuert im verborgenen Testbrowser verzögert – Maße nach Größenänderung erst nach ~800 ms prüfen.
- Neu (V53): Zoom-Test ohne Gerät („Slot frei“) nutzt `zoomStyle(scale)` – die Seite sieht Slot ÷ Faktor. Freier Zoom (`zoom`/`fit`) bleibt im Speicher, nur ruhend (`devKeep`).
- Neu (V53): Gerätewahl setzt die Lage zurück (Laptop/Desktop/Full HD sind von Haus aus quer); Knopf zeigt die aktuelle Lage.
- Neu (V53): Cases bekommen Farben aus `CASE_COLORS` (Chakren-Töne + Silber); Namen werden je Space eindeutig (Nummer dahinter).


- Neu (V52): Profil-Dialog – offene Begrüßungswahl wird auch mit „Fertig“, Esc, × oder Klick daneben gespeichert (damit nichts verloren geht); „Übernehmen“ speichert sofort und meldet es unten. „Zurücksetzen“ nimmt auch die Begrüßung zurück.
- Neu (V52): Zufall „bei jedem Öffnen“ würfelt einmal je Start (`greetSeed` in App); „jeden Tag“ nimmt das lokale Datum. Passt kein angekreuzter Gruß zur Uhrzeit, kommt der Standard.
- Neu (V52): „Mit Name“ ohne Profilnamen zeigt das Original; deutsche Fassung ohne Namen streicht „, {Name}“ (z. B. „Spieler, bereit.“ – etwas holprig, bei Bedarf eigene Fassung ohne Namen ergänzen).
- Neu (V52): Zeitfenster gewählt: „tagsüber“ 6–18 Uhr, Mahlzeit 11–14, „morgens“/„bis 11 Uhr“ 5–11 Uhr; „abends“ im Doc nur als Hinweis „Passt zu“, nicht erzwungen.
- Neu (V52): Begrüßungskarte `width: fit-content` (420–680 px), Folgezeilen tragen nicht zur Breite bei – Gruß bleibt einzeilig, solange er in 680 px passt. Bei 1024 px Viewport geprüft (Commander, Achievement, Moin: je eine Zeile).
- Neu (V52): Entwickler-Modus merkt Zoom und „Breite halten“ in `devKeep`; zoomt man währenddessen, bleibt beim Ausschalten der neue Zoom (der alte kommt nur zurück, wenn keiner gesetzt ist).
- Neu (V52): Die Begrüßung im Testmodus (`?test=voll`) zeigt immer den Standard, weil das Profil dort nicht gespeichert wird – zum Prüfen Titel per `evaluate` setzen.

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
