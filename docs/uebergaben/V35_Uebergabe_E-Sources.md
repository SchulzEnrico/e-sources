# Übergabe V35 → V36 E-Sources

Stand: 22.11.2026, Abend · Chat V35 abgeschlossen · Nächster Chat: **V36 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V36 E-Sources**. Lies diese Übergabedatei und das Lastenheft unter `docs/Lastenheft/Lastenheft_E-Sources.md`. F-186 ist fertig. Als Nächstes **F-171 Stufe 2** (Tour „Design“ um Farben je Slot/Portal, Farbregeln, Kategorie-Zeichen und Regelübersicht erweitern). Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft:** `docs/Lastenheft/Lastenheft_E-Sources.md` (161 Einträge: **99 fertig, 13 teilweise, 1 ersetzt, 48 offen**). Offen aus V27: Claude Doc https://claude.ai/artifact/5LcrJ6JwXyEvUMcJjZQRY8 nicht nachgezogen – klären, ob es noch gilt.
- **Benennung – Ergebnis:** https://claude.ai/artifact/5Di2hzfovkm1NcmV3bocdp
- **Geschichte der Anwendung:** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – Ausblick noch nicht nachgezogen (F-151 bis F-186)
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`

## Was in V35 passiert ist

- V34 war schon committet und gepusht (f188a5a).
- **F-186 ✓ Fragen als Vorschläge in Hilfe und Suche:**
  1. `help.ts`: Feld `questions?: string[]` am `HelpEntry`, 48 Einträge mit 1–2 Fragen (insgesamt rund 60). `searchQuestions(query, max)` ab `QUESTION_MIN` = 3 Buchstaben; jedes getippte Wort muss zu einem Wort der Frage passen (Anfang gleich oder gleicher Stamm ab 5 Buchstaben); Füllwörter (`Q_STOP`: wie, ich, ein …) allein bringen nichts. Fragen, die mit der Eingabe beginnen, zuerst. `asksQuestion()` erkennt ein Fragewort am Anfang. Fragen zählen in `searchHelp` als Suchwörter mit (ohne Füllwörter). Texte in `QUESTION_TEXT` (head, headHelp, option, hint, count).
  2. Suche (Search.tsx): neue Art `question`; Gruppe „Fragen“ (max. 3) – bei Fragewort am Anfang ganz oben, sonst vor „Funktionen & Hilfe“. Startnummern `qBase`/`pBase`/`helpBase`. Enter öffnet die Hilfe am Eintrag. Ansage zählt die Fragen mit; Beschreibung des Suchfelds ergänzt.
  3. Hilfe (Help.tsx): Filterfeld ist jetzt Combobox; „Passende Fragen“ (max. 4) als Listbox über der Liste, ↓/↑ wählt (aria-activedescendant), Enter oder Klick leert den Filter, springt zum Eintrag, fokussiert und hebt ihn hervor (`jumped`). Ansage „n Fragen (Pfeiltasten wählen), m Einträge“. CSS-Block „F-186“ am Ende von App.css (Symbol `inline-block`).
- Tests: 5 neue → **196 grün**; `tsc --noEmit` sauber. Geprüft im eingebauten Browser (`?test=voll`, 1280×800): „wie versch“ → Frage oben, Ansage; „portal“/„chrome“ → Fragen vor Funktionen; Enter → Hilfe an „Lesezeichen importieren“; in der Hilfe „wie hole“ → 2 Fragen, ↓↓ Enter → „Wiederherstellen“ hervorgehoben und fokussiert.

## Nächste Schritte

1. Enrico: committen (Vorschlag: „Fragen als Vorschläge in Hilfe und Suche: F-186; Übergabe V35“) und pushen.
2. F-171 Stufe 2 (Tour „Design“), danach weiter nach der Reihenfolge im Lastenheft.

## Kleine Punkte

- Neu: Fragen stehen nur an Hilfe-Einträgen; neue Funktionen brauchen beim Anlegen gleich passende Fragen (sonst fehlen sie in den Vorschlägen).
- Neu: In der Suche führt Enter auf eine Frage nie die Funktion direkt aus, sondern zeigt die Antwort (dort „Ausführen“). Bei Bedarf Umschalt+Enter = ausführen ergänzen.
- Neu: Fragen in der Suche kommen über Tippfehler nicht hinweg (kein unscharfes Suchen).
- Neu: Webseiten-Symbole stehen noch nicht im Launcher, im Cockpit (Portal-Liste) und an den Tabs – nur Library und Suche.
- Neu: Kompakt blendet nur Kopfleiste, Cockpit-Knöpfe und den Kategorienamen im Portal aus; Portal-Kopfzeile und Menüs bleiben beschriftet.
- Neu: Im Portal-Kopf stehen noch Unicode-Zeichen (← → ⟳ ⌂ und die Zieh-Griffe ↔ ↕ ⤡, Stack ▲▼) – bei Bedarf auch auf den Satz umstellen.
- Neu: Favicon wird bei jedem Neuladen neu geholt (Browser-Cache); kein eigener Zwischenspeicher.
- Aus V33: Symbole bei Menü/Suche sind `display: inline-block` (global ist `.icon` block) – neue Einsatzorte darauf achten (in V34 zweimal passiert).
- Aus V32: Regeln im Cockpit gelten für alle Desks; Farbregel nur für vorhandene Kategorien; „Seite → Kategorie“ ausgeschaltet bleibt aus nach neuer Antwort; Rückgängig nur für die letzte Löschung.
- Aus V31 (Auswahl): Kategorie bleibt bei anderer Seite; Hinweis per Tastatur knapp (8/12 s); Library-Liste ohne Kategorie-Farben (`.bm-cat`); Kategorie-Farbe desk-übergreifend; Slot-Farbe hängt am Slot-Namen; keine Ansage beim Farbwählen; Kopfleiste/Hintergrund je Desk ohne eigene Farben.
- Aus V29: F-185 eigener Filter fehlt; Browsername beim Import fehlt; „wer“ bei Workspace-Import; Texte in Search.tsx/Launcher.tsx nicht in terms.ts; F-159 hell prüfen.
- Aus V28: Alt/⌥+K wirkt nicht im iframe; Ansage „gesammelt“ nur im Fenster mit Main Desk; 75 s bis hart beendete Fenster als gesammelt gelten; Portale bauen sich beim Desk-Wechsel neu auf (mit F-06).
- Aus V27: Hinweis „Neue Version“ überdeckt im Testmodus „Test: voll“; kein Service Worker; `npm run build` / `web/dist/version.json` noch nicht bestätigt.
- Aus V26: siehe Liste in `V31_Uebergabe_E-Sources.md`.

## Technische Rahmenbedingungen

Git nur bei Enrico (GitHub Desktop). Repo-Ordner per Ordnerzugriff freigeben (`~/Projects/e-sources`). Dev-Server `npm run dev`, http://localhost:2910, im eingebauten Browser erreichbar; Änderungen über device_bash kommen per Hot Reload an. Testen mit `?test=voll` (nichts wird gespeichert; Testbelegung ohne Kategorien – über ⋮ → Farben → „Neue Kategorie …“). Im eingebauten Browser: **nie die ganze Seite als ariaSnapshot ausgeben** – auch `browser.tabs.get()`/`create()` geben die ganze Seite aus (riesig, in V35 rund ein Viertel des Chats). `tabs.create("about:blank")` geht nicht, solange der Browser zu ist. Besser: wenn schon ein Tab offen ist, `browser.tabs.list()` und `browser.tabs.switch(id)` nur einmal; sonst `tabs.create` mit der Adresse **ohne** `?test=voll` (leere Belegung = kleine Ausgabe) und danach `tab.page.goto(...?test=voll)`. Danach nur Teilbereiche (`locator(...).ariaSnapshot({depth:1})`). Einstellungen: `getByRole('button',{name:'Einstellungen', exact:true})`. Nach Änderungen an JSX **immer `npx tsc --noEmit -p .` in `web/`** – ein fehlender Import ergibt sonst eine schwarze Seite.

**Tests in Claudes VM:** vitest geht nicht. Ersatzmodul neu anlegen in `$HOME/vt2/node_modules/vitest/index.js` (exportiert auch `vi`, `beforeEach`, `afterEach` als Platzhalter) (describe/it/expect mit toBe, toEqual, toMatchObject, toBeDefined, toBeUndefined, toBeNull, toBeGreaterThan, toContain, toHaveLength, `.not`; Ausführung in `process.on('beforeExit')`), dann in `web/`: `npx tsc --outDir $HOME/vt2/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node src/workspace/*.ts` und `NODE_PATH=$HOME/vt2/node_modules:$PWD/node_modules node $HOME/vt2/out/workspace.test.js`. Meldungen zu `.at`/`import.meta` sind harmlos. Hilfe-Texte dürfen nicht mit „Wort = …“ beginnen (Test F-156); jeder Hilfe-Eintrag braucht ein Symbol in `HELP_ICON`.

## Arbeitsregeln

Wie V15–V34: Funktion vor Design · Barrierefreiheit immer (NF-03) · Begriffe erklären (Texte nur in terms.ts/help.ts) · offene Punkte im Blick, Restplatz mit kleinen Punkten füllen · Lastenheft zuerst · Sammelmodus `>START` … `<ENDE` · Terminal: nur nächster Schritt · „PO“ = Push Origin · Übergabe spätestens bei 60–70 %, nie mitten in einer Aufgabe · Datei `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/` · Usability: so einfach und wirksam wie möglich für den Anwender.
