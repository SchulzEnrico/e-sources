# Übergabe V34 → V35 E-Sources

Stand: 22.11.2026, Abend · Chat V34 abgeschlossen · Nächster Chat: **V35 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V35 E-Sources**. Lies diese Übergabedatei und das Lastenheft unter `docs/Lastenheft/Lastenheft_E-Sources.md`. F-183 ist fertig (Stufe 1 + 2). Als Nächstes **F-186** Fragen als Vorschläge in Hilfe und Suche (Platz von Enrico bestätigt), danach **F-171 Stufe 2** (Tour „Design“). Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft:** `docs/Lastenheft/Lastenheft_E-Sources.md` (161 Einträge: **98 fertig, 13 teilweise, 1 ersetzt, 49 offen**). Offen aus V27: Claude Doc https://claude.ai/artifact/5LcrJ6JwXyEvUMcJjZQRY8 nicht nachgezogen – klären, ob es noch gilt.
- **Benennung – Ergebnis:** https://claude.ai/artifact/5Di2hzfovkm1NcmV3bocdp
- **Geschichte der Anwendung:** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – Ausblick noch nicht nachgezogen (F-151 bis F-186)
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`

## Was in V34 passiert ist

- V33 war schon committet (8563a11); `V33_Uebergabe_E-Sources.md` war noch nicht im Repo.
- Entscheidungen Enrico: Favicons **direkt von der Seite** (abschaltbar, sonst Anfangsbuchstabe); **F-186 vor F-171 Stufe 2**.
- **F-183 Stufe 2 ✓:**
  1. Zeichen je Kategorie: `Category.icon`, `CATEGORY_ICONS` (20), `categoryIcon()` (Vorschlag nach Name) in icons.ts; Aktion `iconCategory`, `setCategoryIcon` (category.ts); storage prüft das Zeichen. Wahl im Dialog „Farben“ (`IconRow`, radiogroup, Pfeiltasten, Ansage über sayLive). Anzeige: Kopfzeile Portal (`win__cat-icon`), Library-Kategorie (`bm-cat__icon`), Regeln (`rules__icon`). Texte: `CATEGORY_TEXT.icon*`, `CATEGORY_ICON_LABEL` (terms.ts).
  2. Glyphen: neue Symbole close, minimize, more, star, starOn (`fill`), newTab, newSlot, stackOn, move, detach, home, copy, external, newWindow, blocked, show. Portal-Menü komplett mit `Item icon=`; alle × in 16 Dateien → `<Icon name="close">`; NewSlot/NewDesk mit `tb-plus`-Symbol.
  3. „Kompakt: nur Symbole“: `workspace/display.ts` (localStorage, Ereignis `esource-display`), `useDisplay()` in components/SiteIcon.tsx, Klasse `app--compact` blendet `.tb-label` und `.c-label` (Cockpit) aus. Menü (Häkchen), Hilfe-Ids `compact`, `favicons`, HelpRun gleichnamig.
  4. Favicons: `components/SiteIcon.tsx` (img no-referrer, lazy; Fehlschlag gemerkt) in Library und Suche; Ersatz Buchstabe (`siteLetter`, `siteHue`, auch Umlaut-Domains).
- **Fehler in V34 (behoben):** schwarze Seite, weil in StackBar.tsx der Import von Icon fehlte; Header-Knöpfe zweizeilig, weil `.icon` global block ist → CSS-Block „F-183 Stufe 2“ am Ende von App.css.
- Tests: 3 neue → **191 grün**; `tsc --noEmit` sauber. Geprüft im eingebauten Browser (`?test=voll`, 1280×800): Kopfleiste einzeilig, Kompakt an/aus, Portal-Menü, Farben-Dialog mit Zeichenwahl, Kategorie-Knopf.

## Nächste Schritte

1. Enrico: committen (Vorschlag: „Symbolsatz F-183 Stufe 2: Kategorie-Zeichen, Glyphen, Kompakt, Favicons; Übergaben V33/V34“) und pushen.
2. F-186, dann F-171 Stufe 2.

## Kleine Punkte

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

Git nur bei Enrico (GitHub Desktop). Repo-Ordner per Ordnerzugriff freigeben (`~/Projects/e-sources`). Dev-Server `npm run dev`, http://localhost:2910, im eingebauten Browser erreichbar; Änderungen über device_bash kommen per Hot Reload an. Testen mit `?test=voll` (nichts wird gespeichert; Testbelegung ohne Kategorien – über ⋮ → Farben → „Neue Kategorie …“). Im eingebauten Browser: **nie die ganze Seite als ariaSnapshot ausgeben** – auch `browser.tabs.get()`/`create()` geben die ganze Seite aus (riesig); den Tab einmal holen und danach nur `tab.page`, `zoom` und Teilbereiche (`locator(...).ariaSnapshot({depth:1})`). Einstellungen: `getByRole('button',{name:'Einstellungen', exact:true})`. Nach Änderungen an JSX **immer `npx tsc --noEmit -p .` in `web/`** – ein fehlender Import ergibt sonst eine schwarze Seite.

**Tests in Claudes VM:** vitest geht nicht. Ersatzmodul neu anlegen in `$HOME/vt2/node_modules/vitest/index.js` (describe/it/expect mit toBe, toEqual, toMatchObject, toBeDefined, toBeUndefined, toBeNull, toBeGreaterThan, toContain, toHaveLength, `.not`; Ausführung in `process.on('beforeExit')`), dann in `web/`: `npx tsc --outDir $HOME/vt2/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node src/workspace/*.ts` und `NODE_PATH=$HOME/vt2/node_modules:$PWD/node_modules node $HOME/vt2/out/workspace.test.js`. Meldungen zu `.at`/`import.meta` sind harmlos. Hilfe-Texte dürfen nicht mit „Wort = …“ beginnen (Test F-156); jeder Hilfe-Eintrag braucht ein Symbol in `HELP_ICON`.

## Arbeitsregeln

Wie V15–V33: Funktion vor Design · Barrierefreiheit immer (NF-03) · Begriffe erklären (Texte nur in terms.ts/help.ts) · offene Punkte im Blick, Restplatz mit kleinen Punkten füllen · Lastenheft zuerst · Sammelmodus `>START` … `<ENDE` · Terminal: nur nächster Schritt · „PO“ = Push Origin · Übergabe spätestens bei 60–70 %, nie mitten in einer Aufgabe · Datei `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/` · Usability: so einfach und wirksam wie möglich für den Anwender.
