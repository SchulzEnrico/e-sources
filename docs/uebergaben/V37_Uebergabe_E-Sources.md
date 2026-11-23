# Übergabe V37 → V38 E-Sources

Stand: 23.11.2026, früh · Chat V37 abgeschlossen · Nächster Chat: **V38 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V38 E-Sources**. Lies diese Übergabedatei und das Lastenheft unter `docs/Lastenheft/Lastenheft_E-Sources.md`. F-170 (Slotmaschine) ist ganz fertig. Als Nächstes **F-51/F-52** (benannte Layouts, Standard je Gerät) – Präzisierung im Lastenheft beachten, Code in Stufen. Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft:** `docs/Lastenheft/Lastenheft_E-Sources.md` (161 Einträge: **101 fertig, 12 teilweise, 1 ersetzt, 47 offen**). Offen aus V27: Claude Doc https://claude.ai/artifact/5LcrJ6JwXyEvUMcJjZQRY8 nicht nachgezogen – klären, ob es noch gilt.
- **Benennung – Ergebnis:** https://claude.ai/artifact/5Di2hzfovkm1NcmV3bocdp
- **Geschichte der Anwendung:** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – Ausblick noch nicht nachgezogen (F-151 bis F-186)
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`

## Was in V37 passiert ist

- V36 war committet (e1980f9). V37 hat Enrico committet und gepusht („Slotmaschine F-170 Stufe 2: Einladung zur Runde und redundante Slots zusammenlegen“). Die Datei `docs/E-Sources_Dashboard_V36.pdf` liegt bewusst **nicht** im Repo (bleibt als ungetrackte Datei liegen).
- **F-170 ✓ Stufe 2:**
  1. `workspace/jackpot.ts`: `redundantSlotsOf(ws, slots)` (Stack mit ≥ 2 Portalen, alle vorn dieselbe Source; nur Slots dieses Desks aus `view.slots`), `mergeSlotTabs`, `mergeSlot`; Einladung: `inviteWhy(ws, slots, color)` → 'red' | 'dups' | 'slots' | null, `dupCount`, Konstanten `INVITE_DUPS = 3`, `INVITE_PAUSE` 1 h, `INVITE_LATER` 4 h, Merker `esource.jackpot.invite.v1` (localStorage, gemeinsam für alle Desk-Fenster; im Testmodus nur im Speicher).
  2. Zusammenlegen: vorderes Portal bleibt, weitere Seiten der anderen wandern als neue Tabs (neue Ids) hinein bis TAB_MAX, Rest schließt mit und wird genannt; andere Portale über `C.closePanel` → „Zuletzt geschlossen“. Reducer-Aktion `mergeSlot` in useWorkspace.ts.
  3. SlotMachine.tsx: Props `slots`, `onMerge`; Abschnitt „Slots zum Zusammenlegen“ (`.jackpot__slots`, Knopf „Zusammenlegen“ mit aria-describedby); nach dem Zusammenlegen Ansage und Fokus zurück auf den Hebel.
  4. App.tsx: Einladung als Effekt – nur wenn der Grund neu wahr wird, nicht bei offener Slotmaschine, nur im Fenster mit Fokus (`document.hasFocus`), frühestens 15 s nach dem Start; Hinweis unten (`notify`, 12 s, role=status) mit „Hebel ziehen“ und „Später“.
  5. Eingebaute Regel **`invite`** „Zur Runde einladen“ (rules.ts, ab Werk an, Text in `RULES_TEXT.builtin.invite`) – Abschalten im Cockpit statt in den Einstellungen.
  6. Texte in `JACKPOT_TEXT` (slots…, merge…, invite, later, laterSaid); Hilfe-Eintrag `jackpot` ergänzt (2 neue Fragen, Wörter „Einladung“, „zusammenlegen“).
- Tests: 2 neue → **203 grün**; `tsc --noEmit` sauber. Geprüft im eingebauten Browser (`?test=slot`): Slot „Recherche“ erkannt und zusammengelegt (13 → 12 Punkte), Einladung „7 Duplikate offen …“ erscheint, „Später“ sagt die Pause an, Regel im Cockpit sichtbar und an.

## Nächste Schritte

1. **F-51/F-52:** Im Chat V37 mit Enrico **vollständig präzisiert** – siehe Lastenheft, Abschnitt „Layouts“ (F-51, F-52). Kurz: Layout = ganze Belegung **eines Desks**; Anordnung je Bildschirmklasse wie heute; Wechsel speichert automatisch; Vorlage ab Werk nur „Gleichmäßig“; Gerät = dieser Browser (lokaler Merker); Standard-Layout gilt für neue Desks und „Auf Standard zurücksetzen“, Start bleibt beim letzten Stand; Schalter „Grenzen aufheben“ je Gerät (mehr Slots als F-03, kleinere Portale), feste Untergrenze 240 × 160 px. In V38: Datenmodell entwerfen (z. B. `Workspace.deskLayouts` je Desk mit aktivem Layout; Gerätemerker in localStorage), dann in Stufen bauen – Stufe 1 Layouts je Desk (F-51), Stufe 2 Standard je Gerät und Grenzen aufheben (F-52).
2. Danach F-06 (Portale pausieren), dann nach Lastenheft.

## Kleine Punkte

- Neu: Knopf im Hinweis unten (z. B. „Später“, „Hebel ziehen“) per Tastatur gewählt → Hinweis verschwindet, Fokus fällt auf `body` (gilt für alle Hinweis-Knöpfe). Fokus sinnvoll zurückgeben.
- Neu: Die Einladung kann von einem späteren Hinweis überdeckt werden (es gibt nur einen Hinweis zugleich); dann kommt sie erst nach der Pause wieder.
- Neu: `?test=leer` ist **kein** Testmodus – dort steht Enricos echte Belegung. Für kleine Ausgabe beim ersten Öffnen trotzdem gut, aber nichts anfassen; dann `goto(...?test=slot)` bzw. `?test=voll`.
- Lastenheft Zeile „F-170: die zwei Ergänzungen zur Einladung in eine zusammenfassen“ (Zusammenführen) ist noch nicht erledigt – nur Text.
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

**Tests in Claudes VM:** vitest geht nicht. Ersatzmodul neu anlegen (V37 neu angelegt, mit toBeTruthy/toBeFalsy/toBeLessThan) in `$HOME/vt2/node_modules/vitest/index.js` (exportiert auch `vi`, `beforeEach`, `afterEach` als Platzhalter) (describe/it/expect mit toBe, toEqual, toMatchObject, toBeDefined, toBeUndefined, toBeNull, toBeGreaterThan, toContain, toHaveLength, `.not`; Ausführung in `process.on('beforeExit')`), dann in `web/`: `npx tsc --outDir $HOME/vt2/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node src/workspace/*.ts` und `NODE_PATH=$HOME/vt2/node_modules:$PWD/node_modules node $HOME/vt2/out/workspace.test.js`. Meldungen zu `.at`/`import.meta` sind harmlos. Hilfe-Texte dürfen nicht mit „Wort = …“ beginnen (Test F-156); jeder Hilfe-Eintrag braucht ein Symbol in `HELP_ICON`.

## Arbeitsregeln

Wie V15–V36: Funktion vor Design · Barrierefreiheit immer (NF-03) · Begriffe erklären (Texte nur in terms.ts/help.ts) · offene Punkte im Blick, Restplatz mit kleinen Punkten füllen · Lastenheft zuerst · Sammelmodus `>START` … `<ENDE` · Terminal: nur nächster Schritt · „PO“ = Push Origin · Übergabe spätestens bei 60–70 %, nie mitten in einer Aufgabe · Datei `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/` · Usability: so einfach und wirksam wie möglich für den Anwender.
