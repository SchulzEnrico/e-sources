# Übergabe V156 → V157 E-Sources

Stand: 28.11.2026 · Chat V156 · Nächster Chat: **V157 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V157 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **„Gebaut V156“** (unter F-236), **F-236 „Gebaut V155“**, **F-232 „Gebaut V154“** und **F-227** (Handbuch). Docs K14 https://claude.ai/artifact/4u9FXZYv8BKUVC2VqzQ5Wy, F-236 https://claude.ai/artifact/HfV14fYQiE26JdKwsMQnGP, F-232 https://claude.ai/artifact/FJY3u5QVqoNtku1MhNDhKn und **neu „V156 – Seitenzahlen im Druck-Inhaltsverzeichnis“ https://claude.ai/artifact/F7iBBE93raKoH4eGpZVQep** (Doc-Id `724fc775-618d-4ace-a47e-acca961feacd`, Tab `f5a6eb8d-75bd`, Text `10afa99f-f78a`) sind entschieden – nur auf neue Kommentare prüfen (`query`; Stand V156: keine). **Erstes Paket V157: Browser-Prüfrunde V150–V156** (Enrico hat am 28.11. „jetzt, vor dem 04.12.“ gewählt) – Prüflisten aus `V150_…` bis `V155_…` und unten; Mängel gleich beheben (Funktion vor Design). Enricos Daten nicht verändern: prüfen nur ansehen bzw. mit Testdaten im Modus `?test=voll`, Angelegtes wieder löschen. **In jedem Chat vor der Übergabe:** `python3 tools/live_project.py V<n> <JJJJ-MM-TT>`. Enricos Testphase ab 07.12., Termin Fr 04.12. **Prüfdateien (F9) erst ab 07.12.** Leitlinien: **Rangfolge 1. IPMA ICB4, 2. MS Project/iTaskX/Trello, 3. unsere Sicht**, **Dokumente wie im Report** (Vorlage `docs/Arbeitspakete/Vorlagen/Report_ColorGentlemen_CG-1.pdf`), **Funktion vor Design**, **Texte in Grafiken nie über Feldränder**, **Meldungen am Ort**, NF-08, F-231. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, Browser-Hinweise `V150_…`/`V152_…` und unten, kleine Punkte aus `V74_`–`V156_…` gelten weiter. **Handbuch** bei jeder Änderung mitführen. **Dashboards** zählen wie V127. Am Ende nach dem Begrüßungstext den **Projektstand** als Textbaustein.

**Tests** (VM ist nach jedem Chat leer – neu anlegen): Befehl aus `V135_Uebergabe_E-Sources.md`, Testliste `… schedule watch inbox tableFiles ink qr fieldMedia whereWas` (**neu: whereWas**); Aufruf `timeout 175 bash $HOME/vt2/run.sh 2>&1 | grep -E "grün|FAIL"`, mit `timeout_ms: 180000`. **Nicht** `pkill -f vt2/run.sh` im selben Aufruf (beendet sich selbst). Tests V156: **803** grün (`workspace` 529, `fieldMedia` 10, `whereWas` 2). `npx tsc --noEmit -p .` sauber.

**Löschen:** keine Freigabe in V156 (nichts gelöscht). Prüfbilder `toc-02.png`, `toc-03.png` liegen in `Projects/Claude outputs` (können weg).

## Was in V156 passiert ist

1. **Docs** K14, F-236, F-232: keine neuen Kommentare.
2. **Feste Töne an die Regeln:** neue Regel `external` „Extern (Firmen im Organigramm)“ (Vorgabe #c7dcf3, Gruppe Kästen); `gpmFigures.extTones` rechnet hell/mittel/dunkel (bisher hellblau/stahlblau/schiefer) samt Verlauf, flachen Tönen, Kanten, Schrift. Graustufen der Grafiken folgen „Nebentext“ (`gy`), Netzplan-Balken mit Puffer folgen „Balken“ (`NET_BAR`). Ohne Regel byte-gleich wie vorher (Test).
3. **F-109 „Wo war ich?“ ✓:** `workspace/whereWas.ts`; Begrüßung (`Greeting.tsx`) mit „In Arbeit:“/„Zuletzt bearbeitet:“ und „Offene Gedanken:“ (Klick öffnet im Pad bzw. Eingang); App erkennt Pause (Tab ≥ 30 min verborgen oder ≥ 30 min ohne Eingabe) → Titel „Wo war ich?“, „Willkommen zurück – n Minuten Pause“, 9 s statt 5 s; Ansage; Hilfe-Eintrag `whereWas` (ohne das Wort „Begrüßung“, sonst verliert `profile` die Suche). Im Browser gesehen: „In Arbeit: F-04 …“ erscheint beim Start.
4. **F-232 P13 Seitenzahlen im Druck-Inhaltsverzeichnis:** Entscheidungs-Doc (Optionen A–D), Enrico 12:40: „Passe es an die Vorlage aus meinem Report an und dann folgen wir deinen Vorschlägen“ → D (Paged.js), Doc ergänzt um „Aussehen wie im Report“, PDF `docs/Arbeitspakete/F-232_V156_Seitenzahlen_Inhaltsverzeichnis.pdf`. Gebaut: `nav.toc` auf eigener Seite, `GPM_CHAPTERS`/`tocEntries` (Hauptkapitel mit ICB4-Element in Kopfzeilen-Farbe, Unterkapitel eingerückt, Punktlinie, Seitenzahl), `reportHtml(…, { paged })` lädt `pagedjs` 0.4.3 (Enrico installiert) nur im Bericht-Fenster; `before`: Grafiken → `img.fig`; `after`: Seitenzahlen aus `.pagedjs_page[data-page-number]`, Bildschirm-Stil, Knopf „Drucken“. Pop-up-Ersatz (iframe) ohne Paged.js. **Im Browser geprüft** (Bericht ColorGentlemen per `document.write` in einen Tab, siehe unten): 55 Seiten, alle Seitenzahlen, keine leeren Seiten.
5. Handbuch V156 (Kap. 1, 7, 7.1, Änderungsverzeichnis); Lastenheft F-109 ✓, „Gebaut V156“; `APP_VERSION = 'V156'`; Live-Projekt V156 (206 F-Punkte, 3 ersetzt, 131 fertig, 25 teilweise, 47 offen).

## Prüfliste für Enrico (zusätzlich zu V77–V155)

- **Bericht:** Formulare › „Bericht“ → neues Fenster zeigt graue Fläche mit weißen Seiten (kurz warten), Seite 2 „Inhalt“ wie im Report mit Seitenzahlen; Klick auf einen Eintrag springt hin; „Drucken bzw. als PDF sichern“ oben → PDF: Seitenzahlen stimmen mit den Seiten überein, Fußzeile „Seite x von y“. In Safari und Firefox ansehen.
- **Wo war ich?:** eine Karte auf „in Arbeit“ setzen, einen Gedanken mit Alt/⌥+E parken, Seite neu laden → Begrüßung zeigt beides; Klick öffnet. Tab 30 min im Hintergrund → „Wo war ich?“.
- **Extern:** Layout › „Extern (Firmen im Organigramm)“ ändern → Organigramm mit mehreren externen Firmen in drei Stufen der Farbe; „Nebentext“ ändern → graue Überschriften (z. B. Phasenplan-Jahre, Teamrollen) folgen.
- Weiter offen aus V155/V154/V153/V152/V151/V150/V149.

## Browser-Hinweise (V156)

- Der eingebaute Browser zeigt Fenster aus `blob:` (Bericht) nicht – Klick auf „Bericht“ löst bei Enrico ein Druck-/Download-Fenster aus. **Nicht auf „Bericht“ klicken.** Stattdessen: Tab mit `http://localhost:2910/package.json` öffnen, dann `page.evaluate`: `import('/src/workspace/storage.ts?t='+Date.now())` → `loadWorkspace()`, `import('/src/workspace/gpmReport.ts?t='+Date.now())` → `reportHtml(ws, id, { day, paged: location.origin + '/node_modules/pagedjs/dist/paged.polyfill.js' })`, per `setTimeout` `document.write`, dann `waitForFunction(() => document.documentElement.dataset.paged === 'fertig')`. **Nicht** in den App-Tab schreiben (hängt sich auf).
- `browser.show()` vorher, sonst zeichnet der Browser nicht und Aufrufe laufen in die 45 s.

## Kleine Punkte

- **Offen:** npm meldete bei der Installation 3 Sicherheitslücken (1 moderat, 2 kritisch) und veraltete Abhängigkeiten von Paged.js (`@babel/polyfill`, `core-js@2`). Geladen wird nur die fertige Datei `dist/paged.polyfill.js` im Bericht-Fenster; ob die Lücken von Paged.js oder älter sind, mit `npm audit` (Enrico) klären. Inhaltsverzeichnis 2 Seiten bei 53 Einträgen. Eisenhower 15.2 Alt+Pfeile vs. Sheet Alt+↑/↓ (NF-08).
- **Gantt-Varianten:** sky/steel/slate kamen nur im Organigramm vor; Gantt nutzt `bar`/`critical` – erledigt.
- Unverändert: NF-01 (Apple-Texterkennung), Tinte gerätegebunden, Fußzeile in Browsern ohne Seitenrand-Felder, F-211 (Rechte/Server). Sonst unverändert in `V155_…` bis `V131_…`.

## Commit-Text V156 (e-sources)

**Summary:** `V156: Inhaltsverzeichnis wie im Report mit Seitenzahlen (Paged.js), „Wo war ich?“, Regel „Extern“`

**Description:**
```
- F-232 P13: Inhaltsverzeichnis des Berichts auf eigener Seite wie im Report – Kapitel mit ICB4-Element, Unterkapitel, Punktlinie, Seitenzahlen über Paged.js (nur im Bericht-Fenster); Grafiken als Bild, damit sie nicht geteilt werden
- Entscheidungs-Doc „V156 – Seitenzahlen im Druck-Inhaltsverzeichnis“ (entschieden: D, Aussehen nach dem Report)
- F-109 „Wo war ich?“: Begrüßung zeigt laufende Karte und offene Gedanken, kommt nach 30 min Pause wieder
- Layout-Vorlage: Regel „Extern“ für die Firmenfarben im Organigramm; graue Töne folgen „Nebentext“, Netzplan-Balken „Balken“
- Abhängigkeit pagedjs 0.4.3
- Tests 803 (+7); Handbuch V156, Lastenheft, Hilfe, APP_VERSION V156, Live-Projekt V156, Übergabe V156

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q6S8Ugw9DnDpY4WM18
```
