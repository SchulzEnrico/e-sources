# Übergabe V25 → V26 E-Sources

Stand: 22.11.2026, nachmittags · Chat V25 abgeschlossen · Nächster Chat: **V26 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V26 E-Sources**. Lies diese Übergabedatei. Die Reihenfolge im Lastenheft (Abschnitt „Stand und Reihenfolge“) ist freigegeben. Mach mit **F-181** weiter (Tour „Import“), danach **F-179**. Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft (verbindlich, Claude Doc):** https://claude.ai/artifact/5Lcrj6JwXyEvUMcJjZQRY8 – Id genau so (Zeichen 6 ist eine „6“). Lesen: `read` mit `ref {object: node, id: 28339b99-31da}`, `container {kind: project, id: 5Lcrj6JwXyEvUMcJjZQRY8}`, `payload {kind: search, text: "F-181"}`. Vermerke per `update` (engine `prose`) mit `find`-Zielen (replace `as: text`); „[✓ Vxx] “ vor einen Eintrag: `insert` mit `side: start` auf die **Paragraph**-Id (nicht die listItem-Id – sonst entsteht ein eigener Absatz).
- **Benennung – Ergebnis:** https://claude.ai/artifact/5Di2hzfovkm1NcmV3bocdp
- **Geschichte der Anwendung:** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – Ausblick noch nicht nachgezogen (F-151 bis F-181)
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`

## Was in V25 passiert ist

Stand Lastenheft danach: **86 fertig, 14 teilweise, 1 ersetzt, 56 offen** (von 157). Neue Einträge: **F-179** Persönlicher Empfang mit lokalem Profil (statt Login – Login erst mit Server/Konten, Ausbaustufe 4), **F-180** Sortierhilfe, **F-181** Tour „Import“, **F-182** Launcher durch Klick daneben schließen (gleich erledigt). Reihenfolge jetzt: ✓F-36 → ✓F-180 → **F-181** → **F-179** → F-168 → F-160 Stufe 2 → F-159 → Farben (F-161–F-164, F-171 Stufe 2) → **F-170 Slotmaschine** (neu fest eingeplant) → F-51/F-52 → F-06.

- **F-36 Lesezeichen importieren/exportieren ✓** – Modul `workspace/browserBookmarks.ts` (ohne DOMParser, testbar): `parseBookmarkFile` liest das Netscape-Format aller Browser (Ordnerpfad, TAGS, Entities; Wurzelordner wie Lesezeichenleiste/Bookmarks bar fallen weg), `planImport(ws, list, how, label)` mit `how` = `full` („Doku › React“, Trenner `PATH_SEP`), `top` (oberste Ebene), `one` („Import TT.MM.JJJJ“); überspringt Vorhandene/Doppelte (`sameUrl`) und Nicht-http(s). `applyImport` legt Kategorien an, Sources ohne Portal-Zuordnung. `bookmarkFileOf` schreibt die Library als HTML (Kategorien als Ordner, Tags, Notiz als `<DD>`).
  - Dialog `components/ImportBookmarks.tsx` (native `<dialog>`, Radiogruppe, Fokus auf gewählter Option). Bei Dateien ohne Ordner heißt die erste Wahl „Ohne Kategorie – danach Sortierhilfe“.
  - App.tsx: verstecktes `<input type=file>` (`bookmarkFileRef`, aria-label „Lesezeichen-Datei wählen“), `chooseBookmarkFile`, `importBookmarks`, `exportBookmarks` (stehen direkt nach `notify`, weil PanelFrame sie schon beim Rendern braucht). Einstellungen: „Lesezeichen importieren …“, „Library exportieren“; Hilfe/Suche `importBookmarks`, `exportBookmarks`; leere Library im Portal zeigt Knopf „Lesezeichen aus dem Browser importieren …“ (`onImport` in CollectionDrawer, `onImportBookmarks` in PanelFrame). Reducer-Aktion `importBookmarks`.
- **F-180 Sortierhilfe ✓** – Modul `workspace/sortHelp.ts`: `sortGroups` (Sources ohne Kategorie nach Domain, Vorschlag zuerst „gelernt“ aus der Library, sonst Liste `KNOWN`), `sortInto` (legt Kategorie per Name an), `sortAll`, `looseCount`. Dialog `components/SortHelp.tsx`: „Alle Vorschläge übernehmen“, je Gruppe Feld mit `<datalist>` der Kategorien, Enter/„Einsortieren“, „Überspringen“; Fokus springt weiter, Ansage per Live-Region. Öffnet nach Import mit ≥ 5 Sources ohne Kategorie von selbst; sonst Einstellungen „Sortierhilfe …“, Suche, Hilfe. Reducer `sortInto`, `sortAll`. Begriffe `TERMS.importBookmarks`, `exportBookmarks`, `sortHelp`.
- **F-182 ✓** – `Launcher.tsx`: aufgeklappt schließt ein `pointerdown` außerhalb (Capture, nicht auf `.tb-launcher`, Dialoge, Toast) bzw. `window.blur` mit Fokus im iframe den Launcher; Fokus bleibt am Klickziel, Ansage per `say`. Im Browser geprüft. Dazu: ohne eigene Lage (`x < 0`) öffnet er mittig unter `.tb-launcher` (`anchor`-State, `placeAtButton` in useLayoutEffect und bei resize, nicht gespeichert); Doppelklick auf den Kopf oder Pos1 auf dem Griff → `x/y = -1` (zurück an den Knopf). Geprüft bei 2560 px. **Fehler aus V24 behoben:** Der Launcher ließ sich mit der Maus nicht ziehen – das äußere Element stoppte `pointerdown` schon in der Capture-Phase (`onPointerDownCapture`), dadurch kam es nie beim Kopf an. Jetzt `onPointerDown` (Bubble). Ziehen am Kopf und am Griff im Browser geprüft.
- Tests: 6 neue → **153, alle grün**. `tsc --noEmit` sauber. Im eingebauten Browser mit `?test=voll` geprüft (Datei per `DataTransfer` ins Eingabefeld gelegt: Dialog, Tastatur, erneuter Import ohne Doppelte, Sortierhilfe einzeln und „alle“, Fokus, Esc). Export nur per Test geprüft (Download im eingebauten Browser nicht ausprobiert).
- **Tests in Claudes VM:** Ersatz-vitest `~/vt/node_modules/vitest/index.js` wurde in V25 neu angelegt (geht mit neuer VM verloren – Aufbau siehe V24-Übergabe), Ablauf unverändert: in `web/` `node_modules/.bin/tsc --outDir ~/vt/out --module commonjs --target es2022 --moduleResolution node --esModuleInterop --skipLibCheck --jsx react-jsx src/workspace/*.ts`, `cp -r ~/vt/node_modules ~/vt/out/`, `ln -sf ~/mnt/Projects/e-sources/web/node_modules/react ~/vt/out/node_modules/react`, `cd ~/vt/out && node workspace.test.js`.
- **Browser-Tipp:** `tabs.create` mit `?test=voll` druckt einen riesigen Snapshot – besser `browser.tabs.create(url)` und danach nur gezielte Locator lesen.

## Nächste Schritte

1. Enrico: e-sources committen (Vorschlag: „Lesezeichen-Import/-Export, Sortierhilfe, Launcher per Klick schließen: F-36, F-180, F-182; Übergabe V25“) und pushen.
2. **F-181 Tour „Import“** (tour.ts kann mehrere Touren; Texte in help.ts; startet beim ersten Import einmal, Knopf „Tour“ im Import-Dialog; Schritte: im Browser exportieren mit Wegen für Chrome/Safari/Firefox/Edge – Texte stehen schon in `chooseBookmarkFile` –, Datei wählen, Feinheit, Sortierhilfe).
3. **F-179 Persönlicher Empfang** (Profil in Einstellungen: Name, Kennfarbe/Initialen; Begrüßung je Tageszeit mit „Zuletzt offen“; abschaltbar, nicht fokusraubend, angesagt; nur Browser-Speicher, im Export; Testmodus speichert nichts).
4. Danach Reihenfolge wie oben. Fertige Punkte im Lastenheft auf `[✓ Vxx]` setzen und die Zählung nachziehen.

## Kleine Punkte

- Neu: Sortierhilfe-Liste `KNOWN` ist bewusst klein; Enrico könnte eigene Regeln wollen (passt zu Farbregeln über Kategorien, F-163).
- Neu: Library-Fenster im Portal könnte bei Sources „Ohne Kategorie“ einen Link zur Sortierhilfe zeigen.
- Neu: Import ist nicht rückgängig zu machen (außer per Desks-Export vorher); evtl. „Rückgängig“ im Hinweis nach dem Import.
- Neu: Bei sehr vielen neuen Kategorien („Ordner wie im Browser“) evtl. Hinweis, „nur oberste Ebene“ zu nehmen.
- Ob der Browser ein Fenster blockt, lässt sich bei `window.open(…, 'noopener')` nicht erkennen – Launcher meldet nichts bei Popup-Sperre.
- Library im Portal öffnet gesperrte Sources noch im Portal (dann Ersatzanzeige) – evtl. direkt außerhalb öffnen bzw. „↗“.
- Launcher-Lage gilt je Desk, nicht je Bildschirmgröße.
- Toast (`.toast`, role="status") wird erst mit Inhalt eingehängt – für Wichtiges `sayLive` nutzen (so auch bei Import/Export).
- Kürzel kommen nicht an, wenn der Fokus in einem iframe steht – Hinweis in der Hilfe wäre gut.
- Hilfe- und Design-Dialog geben den Fokus nach Esc nicht zurück, wenn der Auslöser weg ist (in Closed/FocusRule/ImportBookmarks/SortHelp gelöst).
- Zweizeilige Kopfleiste: Tab springt vom Desk erst in die untere Zeile, dann zur Fokusanzeige.
- Terminal-Akzent übernimmt vorige Akzentfarbe; Toast „Akzentfarbe an … angepasst“ bleibt beim schnellen Designwechsel stehen.
- Schmale Portale: Portalname fehlt in der Titelleiste (BeOS-Reiter unsichtbar).
- Hilfe-Dialog: Platz für ausgeblendetes „Ausführen“ bleibt frei.
- Fokus je Desk nutzt dieselben Grenzen wie der Gesamtfokus (Rückfrage an Enrico offen).
- README nennt noch alte Begriffe und „F-01 bis F-95“.

## Technische Rahmenbedingungen

Git nur bei Enrico (GitHub Desktop). Enricos Dev-Server (`npm run dev`, http://localhost:2910) ist im eingebauten Browser erreichbar; Änderungen über device_bash kommen per Hot Reload sofort an. Messen und Testen mit `?test=voll` (nichts wird gespeichert) und `page.setViewportSize`. Ohne `?test=voll` arbeitet man in Enricos echtem Stand. `tsc --noEmit` in `web/`.

## Arbeitsregeln

Wie V15–V24: Funktion vor Design · Barrierefreiheit immer (NF-03) · Begriffe erklären (Texte nur in terms.ts/help.ts) · offene Punkte im Blick, Restplatz mit kleinen Punkten füllen · Lastenheft zuerst (ab F-183) · Sammelmodus `>START` … `<ENDE` · Terminal: nur nächster Schritt · „PO“ = Push Origin · Übergabe spätestens bei 60–70 %, nie mitten in einer Aufgabe · Datei `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/` · Usability: so einfach und wirksam wie möglich für den Anwender (Wunsch V25).
