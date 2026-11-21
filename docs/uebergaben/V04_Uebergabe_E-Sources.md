# Übergabe V04 → V05 E-Sources

Stand: 21.11.2026 · Chat V04 abgeschlossen (Ausbaustufe 1 noch nicht fertig) · Nächster Chat: **V05 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V05 E-Sources**. Lies diese Übergabedatei und das Lastenheft (Link unten). Wir setzen **Ausbaustufe 1** fort, beginnend mit „Nächste Schritte“. Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft (verbindlich):** https://claude.ai/artifact/5Lcrj6JwXyEvUMcJjZQRY8 (Claude Doc, mit den Docs-Werkzeugen lesen)
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`
- **Portfolio als Design-Vorlage:** `~/Documents/GitHub/SchulzEnrico.github.io` (in V04 als Ordner verbunden), CSS in `assets/css/style.css`
- **Frühere Übergaben:** `docs/uebergaben/V01` bis `V03_Uebergabe_E-Sources.md`

## Lastenheft – in V04 neu oder geändert

- **Ziel:** Absätze „Kern der Anwendung ist Fokus“ (ab 5 Panels/Tabs nehmen Fokus und Übersicht ab) und „Für Entwickler“ (E-Source lädt sich selbst, mehrere Bildschirmgrößen nebeneinander).
- **F-08:** Panels lassen sich in der Stapel-Leiste schließen.
- **F-18:** E-Source darf sich selbst laden; in einer eingebetteten E-Source gesperrt.
- **F-26 neu – Ampel:** innere Kante der Stapel-Leiste (bei Tabs: untere Kante der Tab-Leiste) färbt nach Anzahl: 1–5 Dunkel- bis Neongrün in 20-%-Schritten, 6 Gelb, 7 Orange, 8–9 Rot; mehr als 9 geht nicht (Hinweis). Bei 5 ein Hinweis-Dialog. Panel-Rahmen neutral, Fokus nur als Schatten/Akzent.
- **F-27 neu:** Panels (auch mehrere ausgewählte) in ein neues Fenster herauslösen und zurückholen.
- **F-65 neu:** Gestaltung nach dem Portfolio „ESpecially“, alles edler.
- **F-28 neu – Master-Panel (Idee, Form offen):** ein Panel mit allen Panels aller Plätze und Fenster auf einen Blick (Name, Seite, Ampel); springen, nach vorn holen, schließen, verschieben, gruppieren. Entstanden, weil eine in sich selbst geladene E-Source alle Panels zeigt (gleicher Speicher). Mit Enrico die genaue Form klären (Liste oder Vorschaubilder wie „Mission Control“? dauerhaft im Raster oder per Tastenkürzel?).
- **F-29 neu – Gesamtfokus-Anzeige:** in der Kopfzeile die Gesamtlast aus allen Plätzen, Panels und Tabs in Ampel-Logik, ändert sich sofort beim Öffnen/Schließen; auch im Master-Panel. Empfohlene Voreinstellung plus eigene Einstellungen. Entdeckt am 21.11.: In der eingebetteten E-Source sank die Ampel sofort, als Enrico Panels aus dem Stapel von Panel 9 schloss.
- **Neuer Abschnitt „Werkzeugkasten und Integrationen“** (nach Stufe 8): F-100 Werkzeugkasten (schwebend), F-101 KI, F-102 Übersetzer (DeepL), F-103 Kalender, F-104 Kanban/Scrum-Board, F-105 lokale und Cloud-Dateien, F-112 Terminal (nur Desktop-App), F-113 Code-Editor (Monaco).
- **Offene Vorschläge von Claude** (Enrico entscheidet per ✓/✕ im Lastenheft): F-106 Gedankenparkplatz, F-107 Aufgabe im Fokus, F-108 verknüpfte Panels, F-109 „Wo war ich?“, F-110 Zwischenablage-Verlauf, F-111 Werkzeuge als Bausteine, offene Frage KI-Kosten (Entscheidung: eigener API-Schlüssel **und** Abo möglich).

## Was in V04 gebaut wurde (noch nicht committet)

- **Kopfleiste wie im Browser (F-14):** ← Zurück · → Vor · ⟳ Neu laden · ⌂ Home · Adresszeile (Enter öffnet, Esc verwirft) · Größen-Menü (eigenes SVG-Icon) · Name (Ziehen, Doppelklick = umbenennen) · ⋮ Menü · ×. Eigene Adresszeile entfällt. Reihenfolge Zurück/Vor wie im Browser (Lastenheft sagt „Vor, Zurück“ – Enrico hat nicht widersprochen).
- **Verlauf je Panel:** `PanelMeta.history`, `pos`, `home` (Home = erste geöffnete Adresse, im Menü „Als Startseite festlegen“). Funktionen `navigatePanel` (= `setPanelUrl`), `historyStep`, `goHome`, `setHome`, `canGoBack/Forward`. Klicks innerhalb fremder Seiten sind im Browser nicht erfassbar.
- **Menü ⋮ (F-20):** Umbenennen, Tauschen, Zurücksetzen, Maximieren, Als Startseite festlegen, Adresse kopieren, In neuem Tab öffnen.
- **Selbst-Laden:** `isSelfUrl`; gesperrt nur, wenn `window.self !== window.top`.
- **Fokus per Klick in iframes:** Fokus-Abfrage (`window` blur + Intervall auf `document.activeElement`, `data-panel-id`) in `App.tsx`.
- **Stapel-Leiste kompakt:** 24 px (Zähler 1/n, Nummern, ▲▼), klappt bei Hover/Fokus auf 150 px über den Inhalt aus; Einträge füllen die ganze Höhe; × je Eintrag schließt das Panel.
- **Ampel (F-26):** `loadColor(n)`, `FOCUS_WARN = 5`, `STACK_MAX = 9`, `stackFull`, `addPanel(..., limit)`. Farbe als CSS-Variable `--load` am Panel, sichtbar an der linken Kante der Stapel-Leiste und am aktiven Stapel-Eintrag. Hinweis-Dialog (`notice`) bei 5 und bei voll. Aktives Panel: blauer Schatten statt Rahmen.
- **Hinweis-Popup (`toast`)** unten mittig für normale Meldungen.
- Tests: 38 (in Claudes Umgebung grün), Typprüfung ok. **Bei Enrico noch nicht gelaufen.**

## ⚠ Parallele Änderungen

Während V04 hat zweimal jemand anderes gleichzeitig in `App.tsx`, `PanelFrame.tsx` und `App.css` geändert (11:40 Fokus-Lösung + ⤢-Icon, ~12:02 Toast-Popup). Das passte zusammen, wurde übernommen. **Immer nur eine Sitzung am Projektordner arbeiten lassen**, sonst überschreiben sich Änderungen. Zu Beginn von V05 klären, woher die Änderungen kamen.

## Beobachtung: E-Source in sich selbst

Die eingebettete E-Source hat denselben Ursprung (localhost:2910) und liest daher denselben `localStorage`: Sie zeigt dieselben Panels, nur in der Smartphone-Anordnung. Das ist kein Datenleck (gleicher Nutzer, gleicher Browser), aber **beide Instanzen schreiben in denselben Speicher und können sich gegenseitig überschreiben**. Für F-18 (Vergleich mehrerer Bildschirmgrößen) und F-28 klären: eingebettete Instanz nur lesend, oder Abgleich zwischen Instanzen (z. B. `storage`-Ereignis bzw. BroadcastChannel – das braucht auch F-27).

## Nächste Schritte

1. **Enrico testet** die Punkte oben (vor allem Hinweis-Dialog bei 5 Panels im Stapel, × in der Stapel-Leiste, Schatten-Fokus). Dann `npm test`, `npm run build`, **committen** (Stand V04).
2. **Rückmeldung beim Ziehen (NF-07):** alle Panels, deren Größe sich beim Ziehen eines Griffs ändert, hervorheben (`rects` von Entwurf und Ausgangsbaum vergleichen). Als Akzent passend zu F-65 (z. B. Schatten), nicht als Rahmen.
3. **Tabs (F-21, F-22) und Stapel an jedem Platz (F-09) in einem Umbau:** Panel = Liste von Tabs (je Tab `url`, `history`, `pos`; `home` je Panel), Tab-Leiste oben mit „+“, Ampel an der unteren Kante (F-26, max. 9 Tabs). Platz = eigene Id mit `panels: string[]` und `front`; Sonderfall `__stack__` entfällt; Panels ohne Platz kommen auf den Platz ganz rechts. Speicher auf `esource.workspace.v5`, Tests anpassen.
4. **Grunddesign aus dem Portfolio (F-65):** Werte aus `style.css` übernehmen: `--bg #0c0c0f`, `--text #e6e6ea`, `--muted #b4b4bc`, `--accent #e4522c` (Hover `#f26a42`, Glow `rgba(228,82,44,.30)`, Deko `#a22b0e`), Glas `rgba(255,255,255,.045/.07)`, Linie `rgba(255,255,255,.10)`, Radius 18 px, Schrift Open Sans (woff in `assets/fonts`, OFL-Lizenz), Neumorphismus-Schatten `--raised`, `--raised-sm`, `--pressed`. Ampelfarben edler abstimmen (z. B. gedämpfte Grüntöne mit leichtem Glow). Enrico wünscht das ausdrücklich, obwohl sonst „Funktion vor Design“ gilt.
5. Später: F-43 gesperrte Seiten mit Prüfung über den Server (Header `X-Frame-Options`/CSP), F-27 Panels herauslösen.

Danach: Server per `server-extra/setup-server.sh` erzeugen und `./mvnw test`, committen, Übergabe V05 → V06.

## Offen

- `npm install` meldet 3 Schwachstellen (1 moderate, 2 critical) – `npm audit` ansehen, **nicht** `npm audit fix --force`.
- npm-Warnung „install-scripts“ für esbuild und fsevents: Build und Tests laufen trotzdem.
- Server-Standort und Kosten, Apple-Entwicklerkonto (bis Stufe 8).

## Technische Rahmenbedingungen

- Claudes Shell auf dem Mac (`device_bash`) ist eine Linux-VM **ohne Internet** und darf ohne Freigabe **nicht löschen**; `.git` ist dort nicht beschreibbar (lesen geht mit `git --no-optional-locks`). **npm, Maven und git laufen in Enricos Terminal.**
- Verbundene Ordner: `~/Projects`, `~/Documents/GitHub/SchulzEnrico.github.io`. Alte Dateien nach `~/Projects/_to_delete/` verschieben.
- Typprüfung in der VM: `node node_modules/typescript/bin/tsc --noEmit -p .` (in `web/`). Tests ohne Vite: Ersatzmodul `~/vt/node_modules/vitest/index.js` (describe/it/expect mit toBe, toEqual, toHaveLength, toContain) neu anlegen, `src/workspace/*.ts` mit tsc nach CommonJS in `~/vt/out` übersetzen, `node_modules` dorthin kopieren, `node workspace.test.js`.
- Enricos Mac: Node 24, Java 21, Chrome; Oberfläche unter http://localhost:2910.
- **Committen:** GitHub Desktop (Summary → „Commit to main“ → „Push origin“) oder Terminal in einem neuen Tab (Cmd+T), nie im Tab mit `npm run dev`.

## Arbeitsregeln

- **Funktion vor Design** (Ausnahme: ausdrücklicher Wunsch, siehe Schritt 4).
- **Lastenheft ist die Grundlage:** Neue Wünsche kommen dort mit Nummer hinein, bevor sie gebaut werden.
- **Übergaberegel:** nach jeder abgeschlossenen Ausbaustufe, spätestens bei geschätzt 60–70 % Chat-Füllstand, nie mitten in einer Aufgabe; Claude kündigt sie vorher an.
- **Übergabedatei:** `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/` – Versionsnummer immer am Anfang des Dateinamens.

## Nachtrag 21.11.2026, 12:30 – E-Source in sich selbst

- Die eingebettete E-Source nutzt denselben Browser-Speicher und zeigt daher dieselbe Arbeitsfläche (alle Panels, in ihrer eigenen Bildschirmklasse, z. B. Smartphone mit allen Panels im Stapel). Kein Zugriff auf Inhalte fremder Seiten: Sie lädt nur eigene Kopien derselben Adressen.
- Problem war: Beide hätten gespeichert und sich gegenseitig überschrieben. **Behoben:** `saveWorkspace` speichert nicht, wenn E-Source eingebettet ist (nur lesen).
- **Offen für V05:** Soll die eingebettete E-Source (a) die echte Arbeitsfläche nur lesend zeigen (jetziger Stand), (b) eine eigene Test-Arbeitsfläche bekommen oder (c) live mitlaufen (Abgleich per `storage`-Event/BroadcastChannel – das ist zugleich die Grundlage für F-07/F-27, mehrere Fenster)? Ins Lastenheft bei F-18 eintragen.
- Beobachtung: In der eingebetteten Smartphone-Ansicht liegen 12 Panels im Stapel (rot). Das ist gewollt: Die 9er-Grenze gilt beim Anlegen in der aktuellen Ansicht, nicht beim Wechsel der Bildschirmklasse.
