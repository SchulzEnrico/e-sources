# Übergabe V158 → V159 E-Sources

Stand: 28.11.2026 · Chat V158 · Nächster Chat: **V159 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V159 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **„Gebaut V158“** und **„Gebaut V157“** (unter F-236) und **F-227** (Handbuch). Docs K14 https://claude.ai/artifact/4u9FXZYv8BKUVC2VqzQ5Wy, F-236 https://claude.ai/artifact/HfV14fYQiE26JdKwsMQnGP, F-232 https://claude.ai/artifact/FJY3u5QVqoNtku1MhNDhKn, V156 https://claude.ai/artifact/F7iBBE93raKoH4eGpZVQep sind entschieden – nur auf neue Kommentare prüfen (Docs `read` auf das Projekt → Tab-Id, dann `query` mit `container {kind: project, id: <slug>}`, `payload {under: {object: file, id: <Tab-Id>}}`; Stand V158: keine). **Zuerst offene Fragen an Enrico klären** (unten „Offen“): Teamrollen „wieder raus“ (wo?), `npm audit`-Ergebnis, iPad-Test. **Dann:** Enricos Prüfliste V158 unterstützen, Mängel beheben (Funktion vor Design). Enricos Daten nicht verändern: nur ansehen bzw. mit `?test=voll` + Knopf „Beispielprojekt ‚ColorGentlemen‘ anlegen“. **In jedem Chat vor der Übergabe:** `python3 tools/live_project.py V<n> <JJJJ-MM-TT>`. Enricos Testphase ab 07.12., Termin Fr 04.12. **Prüfdateien (F9) erst ab 07.12.** Leitlinien: **Rangfolge 1. IPMA ICB4, 2. MS Project/iTaskX/Trello, 3. unsere Sicht**, **Dokumente wie im Report** (Vorlage `docs/Arbeitspakete/Vorlagen/Report_ColorGentlemen_CG-1.pdf`), **Funktion vor Design**, **Texte in Grafiken nie über Feldränder**, **in Zellen immer alles lesbar (global, neu V158)**, **Meldungen am Ort**, NF-08, F-231. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, Browser-Hinweise `V150_…`/`V152_…`/`V156_…`/`V157_…` und unten, kleine Punkte aus `V74_`–`V158_…` gelten weiter. **Handbuch** bei jeder Änderung mitführen. **Dashboards** zählen wie V127. Am Ende nach dem Begrüßungstext den **Projektstand** als Textbaustein.

**Tests** (VM ist nach jedem Chat leer – neu anlegen): Befehl wie in `V157_Uebergabe_E-Sources.md` (Testliste aus den Dateien, jetzt **34** `*.test.ts`, neu `greetDay`). Aufruf `timeout 175 bash $HOME/vt2/run.sh 2>&1 | grep -E "grün|FAIL" | awk '{s+=$1} END{print s}'` mit `timeout_ms: 180000`. Tests V158: **806** grün. `npx tsc --noEmit -p .` sauber.

**Löschen:** keine Freigabe in V158 (nichts gelöscht). In `Projects/Claude outputs` können weg: `toc-02.png`, `toc-03.png`, `v158-ref-03.png`, `v158-cg-logo.png`.

## Was in V158 passiert ist

1. **Docs** K14, F-236, F-232, V156: keine neuen Kommentare.
2. **Rest der Prüfrunde im eingebauten Browser** – alles aus der Liste „Noch nicht im Browser geprüft“ (V157) gesehen. Mängel behoben: Alt+↑/↓ im Sheet löste zusätzlich das Pad aus (`Pad.tsx` übergeht `defaultPrevented`; Alt+←/→ bleibt beim Pad; `SheetViews`/`MatrixSheet` angepasst); Eingang-Regel aus dem Board-Menü wirkte nicht, auch nicht beim allerersten Gedanken (`ruleRun.ts`, 2 Tests); Tour-Schritt Eingang ohne offenen Reiter (`inboxClosed`); Fokus nach Cockpit › Eingang auf den Reiter (`App.showPad`); Logo ✕ mit Rückgängig und Fokus am Ort (`PaperLogo`); Bericht: Logo oben rechts auf jeder Seite (Paged.js, `.pagelogo` + `element(pagelogo)`), Steckbrief-Unterköpfe bei dunklem „Kopf der Tabellen“ lesbar; „Wo war ich?“ ohne Umbruch mitten im Wort.
3. **Wünsche Enrico (13:46–13:57):**
   - **Begrüßung** höchstens einmal am Tag (Start oder Pause), 2,5 s, „Nicht mehr zeigen“ mit Rückgängig (`workspace/greetDay.ts`: Tag in `localStorage` `esource.greetDay`, nicht in Testbelegung; `greetOnStart` merkt die Entscheidung je Seitenaufruf, weil die Oberfläche beim Start einmal neu aufgebaut wird; `greetClosed` verhindert erneutes Zeigen). Hover/Fokus hält weiter an (Lesezeit, WCAG 2.2.1).
   - **Start immer im Notizen-Modus**, Rad Notizen · Projekte · Desk (`deskMode.startModes`, `DESK_MODE_ORDER`, `modeOf` Vorgabe `notes`, Hilfe und Tour-Text angepasst).
   - **In den Zellen immer alles lesen (global):** Formular-Tabellen – Text als mitwachsendes Feld (`GrowText` in `ProjectForms.tsx`), Auswahl zeigt den ganzen Text (`.pjf__sel` – unsichtbares `select` über sichtbarem Text, Fokusrahmen am Text), Zahlen-/Code-Spalten nach längstem Wert (`fitWeight`), „auto“ unter dem Feld, Köpfe brechen nach „/“. Gemessen: alle 41 Kapitel des Beispiels bei 1400 px ohne abgeschnittene Zelle (Skript `clip` unten). **Noch nicht** durchgemessen: andere Tabellen (Projektliste, Gantt-Tabelle, Ressourcen, Sheets) und schmalere Fenster.
   - **Logo mit Hut:** Beispiel ColorGentlemen bringt das Logo „CG“ mit Hut aus dem Report mit (`workspace/samplePics.ts`, Daten-URL, aus dem PDF ausgeschnitten und beschnitten; `imageStore.getPic` greift darauf zurück, wenn der Gerätespeicher es nicht hat). Logo steht rechts in der Kopfzeile wie im Report. **Enricos vorhandenes Beispiel** bekommt das Logo erst, wenn er es neu anlegt (⚙ › Beispiel entfernen und wieder anlegen) – seine Daten wurden nicht angefasst.
   - **Kopfleiste** (14:03, „dauerhaft eingeklappt“ auf dem Mac): Überlauf war alles-oder-nichts; jetzt `useOverflow(…, { fill: true })` – vorn bleibt, was passt (`data-ovf-out`, CSS `.ovf-fill`). Gemessen 700–1920 px ohne Überlappung. Andere Leisten (Pad-Kopf, Portale) unverändert alles-oder-nichts – bei Bedarf dort ebenso `fill`.
4. Handbuch V158 (Kap. 1, 2, 5, 7.1, Änderungsverzeichnis); Lastenheft „Gebaut V158“; `APP_VERSION = 'V158'`; Live-Projekt V158 (206 F-Punkte, 3 ersetzt, 131 fertig, 25 teilweise, 47 offen).

## Offen (Fragen an Enrico)

- **Teamrollen „wieder raus“** (Enrico 14:00: „Die waren doch gestern schon da drin und funktionierten gut“): im Code nichts entfernt (Belbin seit V137/V138/V149 unverändert), im Beispiel steht 15.1 vollständig. Gefragt, **wo** sie fehlen (Formulare 15.1, Bericht, Organigramm, Personen, eigenes Projekt?). Vermutung: im eigenen Projekt ist im Rad „Teammitglied wählen“ jemand ohne Punkte gewählt.
- **`npm audit`:** In Enricos Startnachricht stand noch „[hier einfügen]“ – Ergebnis kam nicht mit. Einordnung wie in V157 vorbereitet (Paged.js bringt `@babel/polyfill`, `core-js` 2 u. a. mit).
- **iPad/Smartphone testen:** Erster Schritt gegeben: in `web/` `npm run dev -- --host`, Enrico meldet die Adresse unter „Network:“. Nächster Schritt: diese Adresse auf dem iPad öffnen (gleiches WLAN), ggf. macOS-Firewall-Abfrage „Zulassen“; auf dem iPad eigene Daten → mit `?test=voll` testen. Achtung: `server.host` ggf. dauerhaft in `vite.config.ts` – erst nach Rückmeldung.

## Prüfliste für Enrico (zusätzlich zu V77–V157)

- **Start:** E-Sources neu laden → startet im Modus **Notizen**; Rad „Arbeitsweise“ zeigt Notizen · Projekte · Desk.
- **Begrüßung:** erscheint heute nur noch einmal; morgen beim ersten Start wieder; verschwindet nach 2,5 s; „Nicht mehr zeigen“ → Meldung mit „Rückgängig“; Profil › „Begrüßen (höchstens einmal am Tag) …“ schaltet wieder ein.
- **Formulare › 4 Stakeholderanalyse** (und andere breite Tabellen): Code „SH-IN 01“, Personen, Strategie „partizipativ“ ganz lesbar; Zahlen in 5 Chancen und Risiken (W, A, Tragweite) nicht abgeschnitten; Klick auf eine Auswahl öffnet die Liste, Tab zeigt den Fokusrahmen.
- **Logo:** Beispiel neu anlegen → Logo „CG“ mit Hut rechts in der Kopfzeile; ✕ → „Rückgängig“ daneben; Bericht → Logo auf jeder Seite oben rechts.
- **Kopfleiste** bei deiner Fensterbreite: nur was nicht passt, steckt in „»“; vorn bleiben Elemente sichtbar.
- **Eisenhower-Sheet:** Alt/⌥+↑/↓ stellt um, ohne dass Pads getauscht werden.
- **Regel** „Notiz kommt in den Eingang“ über Board ⋮ › Automatisierung anlegen (z. B. Tag „eingang“) → Alt/⌥+E → Gedanke hat den Tag.
- **`npm audit`** und **Teamrollen-Stelle** in den nächsten Chat.
- Weiter offen aus V157/V156/V155/V154/V153/V152/V151/V150/V149.

## Browser-Hinweise (V158)

- **Hintergrund-Tab zeichnet nicht:** Nach `browser.tabs.create(…)` für den Bericht unbedingt zurück mit `browser.tabs.switch(tab.id)` **und** `page.bringToFront()` – sonst laufen Räder/`requestAnimationFrame` nicht (sah aus wie „Rad klemmt“). Bericht-Tab ebenso nach vorn holen, sonst rechnet Paged.js minutenlang.
- **Bericht mit Testdaten** (nicht Enricos Speicher): im Tab `http://localhost:2910/package.json` per `evaluate`: `probe.ts` → `probeWorkspace()`, `sampleProject.ts` → `addSampleProject(…)`, Projekt anpassen (z. B. `charter.logo`, `layout`), `gpmReport.ts` → `reportHtml(ws, pid, { day, pics, paged: location.origin + '/node_modules/pagedjs/dist/paged.polyfill.js' })`, dann `document.write` per `setTimeout`, warten auf `dataset.paged === 'fertig'`.
- Projekt wechseln: Rad `[aria-label="Projekt wählen"]` in der Projektliste (bei gewähltem Projekt ist die Liste eine Zeile mit Rädern).
- Pause simulieren: `Date.now` im Fenster um +31 min verschieben, dann `keydown` an `document` schicken; danach `Date.now = () => Math.round(performance.timeOrigin + performance.now())`.
- **Zellen prüfen** (`clip`): alle sichtbaren `.pjf__table td.pjf__cell :is(input[type=text], textarea, .pjf__selText, .pjf__ro)` mit `scrollWidth > clientWidth+1` oder `scrollHeight > clientHeight+2`; Kapitel-Rad `getByRole('slider', {name: 'Kapitel'})` Schritt für Schritt (~0,9 s je Raste).
- Änderungen an `deskMode.ts` lösen ein volles Neuladen aus – die Testdaten sind danach weg (neu anlegen).

## Kleine Punkte

- **Offen:** Teamrollen (s. o.), `npm audit`, iPad. Inhaltsverzeichnis im Bericht 2 Seiten bei 53 Einträgen. Eisenhower 15.2 Alt+Pfeile (Feld wechseln) vs. Sheet Alt+↑/↓ (umstellen) (NF-08). „Zellen lesbar“ für die übrigen Tabellen (Projektliste, Gantt-Tabelle, Ressourcen, Sheets) und schmale Fenster nachmessen.
- Meldung „Starttermin: gespeichert.“ erscheint auch in der Testbelegung (dort wird nichts gespeichert) – Wortlaut ggf. „übernommen“.
- „nach unten verschoben“ (Ansage im Sheet) beginnt klein.
- Beim Einfügen eines Bilds zwei Meldungen am Feld; `localStorage` für Ansichts-Vorlieben auch im Testmodus (harmlos). Sonst unverändert in `V157_…` bis `V131_…`.

## Commit-Text V158 (e-sources)

**Summary:** `V158: Start im Notizen-Modus, Begrüßung einmal am Tag, Zellen immer lesbar, Logo „CG“ mit Hut, Rest der Prüfrunde`

**Description:**
```
- Start immer im Notizen-Modus; Rad „Arbeitsweise“ jetzt Notizen · Projekte · Desk
- Begrüßung höchstens einmal am Tag (Start oder Pause), 2,5 Sekunden, Knopf „Nicht mehr zeigen“ mit Rückgängig
- Formulare: in den Zellen immer alles lesbar – Text wächst mit, Auswahl zeigt den ganzen Text, Zahlen-/Code-Spalten nach Inhalt, Köpfe brechen nach „/“
- Logo rechts in der Kopfzeile wie im Report, ✕ mit Rückgängig; Beispiel ColorGentlemen bringt das Logo „CG“ mit Hut mit; im Bericht auf jeder Seite oben rechts
- Kopfleiste: nur was nicht passt, wandert in „»“ (vorher alles auf einmal)
- Prüfrunde: Alt+↑/↓ im Sheet tauscht keine Pads mehr; Eingang-Regel aus dem Board-Menü wirkt (auch beim ersten Gedanken); Tour-Schritt Eingang ohne offenen Reiter; Fokus nach Cockpit › Eingang; „Wo war ich?“ ohne Wortbruch; Steckbrief-Köpfe im Bericht lesbar
- Tests 806 (greetDay, Eingang-Regel, Logo im Bericht); Handbuch V158, Lastenheft „Gebaut V158“, APP_VERSION V158, Live-Projekt V158, Übergabe V158

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q7VmnaiajmEDRY5YCJ
```
