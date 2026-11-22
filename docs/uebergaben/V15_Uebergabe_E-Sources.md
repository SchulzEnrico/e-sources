# Übergabe V15 → V16 E-Sources

Stand: 22.11.2026, ca. 09:45 · Chat V15 abgeschlossen · Nächster Chat: **V16 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V16 E-Sources**. Lies diese Übergabedatei und das Lastenheft (Link unten). Wir beginnen mit **F-153: Anordnen im Fokus-Radar** (Areas auf der Lagekarte andocken und in der Größe ändern, mit Tastatur-Ersatz, NF-03). Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft (verbindlich):** https://claude.ai/artifact/5Lcrj6JwXyEvUMcJjZQRY8 (Claude Doc, mit den Docs-Werkzeugen lesen)
- **Geschichte der Anwendung (Claude Doc):** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – Tabelle „Was E-Sources heute kann“ am 22.11. (V15) um Fokus-Radar und Ziehen aus der Stapel-Leiste ergänzt; **Ausblick-Liste noch nicht nachgezogen** (F-151 bis F-153). Offen: Wofür steht der Name „E-Sources“?
- **Repository (öffentlich):** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`
- **Portfolio-Repo:** lokal `~/Projects/SchulzEnrico.github.io`
- **Online-Demo:** https://schulzenrico.github.io/e-sources/ (baut automatisch bei jedem Push auf `main`)
- **Frühere Übergaben:** `docs/uebergaben/V01` bis `V14_Uebergabe_E-Sources.md`

## Was in V15 passiert ist

- **F-28 Rest – Ziehen aus der Stapel-Leiste:** Eintrag auf eine andere Area ziehen = dort obendrauf (`startStackDrag`/`slotAt` in `App.tsx`, `onDragStart` in `StackBar`). Ziel zeigt „Obendrauf legen“ bzw. grau gestrichelt „Stapel voll (9)“ (`.drop--no`). Eigene Area / Klick bleiben unberührt.
- **Fehler behoben (Area-Namen):** Einzelnes Ziel-Panel mit altem Namen einer anderen Area → neuer Stapel bekommt eigenen Namen (`tryPlace` in `workspace.ts`).
- **× der Stapel-Leiste** ist jetzt ein eigener Knopf neben dem Tab (`.stack__row`), `aria-hidden`, `tabIndex -1`; Tastatur: Entf.
- **Master-Panel heißt jetzt „Fokus-Radar“** (Entscheidung Enrico). Im Code bleibt die Komponente `Overview`.
- **Zielauswahl** (V/Umschalt+V) hat „⧉ In neues Fenster“.
- **Rechnung voll beladen:** 49 Zoll = 10 Areas × 9 × 9 = 810 Tabs, 90 Panels, 450 Punkte; zwei Fenster 1.620 Tabs, 180 Panels, 900 Punkte. Testbelegung `?test=voll` (siehe unten).
- **F-152 Fokus-Radar als Lagekarte** (in Erprobung, Enrico: „fühlt sich gut an“): links je Fenster Miniatur seines Bildschirms (`radarOf`, `radarMatches` in `focus.ts`; Seitenverhältnis aus `specOf`, Lage aus `winSetup`), Kacheln mit Name, vorderem Panel, Ampel-Leiste; rechts die Panels der gewählten Area; Filterfeld über alle Fenster. Tastatur: Pfeile räumlich (auch zwischen Fenstern), Enter in die Liste, ← zurück. Bei voller Belegung 479 px statt 4.300 px.
- **F-151 Ziehen im Fokus-Radar:** Zeile auf Kachel = obendrauf, Kachel auf Kachel = ganze Area, beim Ziehen über jeder Karte Feld „＋ Eigene neue Area“; Geist am Zeiger nennt Ziel bzw. „Stapel voll“/„kein Platz“.
- **Fehler behoben (99er-Stapel):** „Hierher holen“/„Alle … holen“ über `fetchPanels` (`move.ts`, Aktion `fetch`): erst freie Areas, dann kleinste Stapel bis 9, Rest bleibt; Ansage „x von y geholt …“.
- Lastenheft: F-28 (Fokus-Radar, Umsetzung), **F-151, F-152, F-153** neu. Tests **111/111**, Typprüfung grün.

## Noch zu committen (falls nicht schon geschehen)

- Summary: „Übergabe V15“ – nur diese Datei (alles andere ist gepusht).

## Nächste Schritte

1. **F-153 Anordnen im Fokus-Radar:** Kachel an den Rand einer anderen = andocken (Logik `drop`/F-11 steht), Kante zwischen Kacheln ziehen = Größe (`T.resizeEdges`), auch für andere Fenster (deren Einstellung aus `winSetup`). Tastatur z. B. Alt+Pfeil / Alt+Umschalt+Pfeil. Rückfrage: Tauschen auch?
2. F-27 weiter: Panels per Ziehen zwischen Fenstern (über das Radar geht es schon); neues Fenster automatisch auf dem zweiten Monitor (Window Management API `getScreenDetails`); Umbenennen auch im Fokus-Radar (Fenster-Kopf).
3. **F-06 Ressourcen schonen** – der Volltest zeigt: jedes sichtbare Panel hält alle 9 Tabs geladen (bis 90 iframes je Fenster).
4. F-29: Grenzen/Gewichte in den Einstellungen änderbar.
5. **F-104 Kanban-Board** als Panel-Typ, danach in die Demo.
6. Lesezeichen-Bedienung mit Enrico überarbeiten.
7. Design: F-67, F-68 (Equalizer auch in der Stapel-Leiste), F-114, F-115; F-69 Rest.
8. Später: F-63, F-40, F-43-Rest, F-33; Szenarien bedienbar machen (F-116) → dann auch in der Suche.

## Stand des Lastenhefts (Schätzung 22.11.)

127 Punkte (120 F, 7 NF). Nach Zahl rund 50 % (ca. 55 fertig, 15 teilweise, 55 offen), nach Aufwand 30–35 %. Offen vor allem Server/Konten/Sync/Desktop (Stufen 4–6, 8), Ablage, Werkzeugkasten. Bei Gelegenheit sauber Eintrag für Eintrag auszählen.

## Kleine Punkte (zum Auffüllen)

- F-152: Karte höchstens 170 px hoch – auf breiten Bildschirmen Lücke zwischen Karte und Liste; ggf. größer werden lassen (Enrico fragen).
- F-152: Für Bildschirmleser ist es eine Gruppe aus Knöpfen; ggf. ARIA-Baum (Fenster → Area → Panel).
- F-151: Ansage nach dem Ziehen kommt aus der App („… jetzt auf …“); bei ganzer Area nennt sie das vordere Panel statt „Area“.
- `normalize` legt überzählige Panels ohne Grenze auf die Area ganz rechts (z. B. Wechsel auf kleineren Bildschirm, Verschieben in ein Fenster mit unbekannter Einstellung) – Stapel über 9 möglich. Regel klären (F-08 vs. F-26).
- F-28: Nach „Aus dem Stapel lösen“ rückt im alten Stapel das letzte Panel nach vorn (Regel aus `takeOut`) – evtl. lieber das vorher sichtbare.
- F-150: Hineinziehen geht nur ins **leere** Panel; in ein Panel mit Seite ggf. später über die Tab-Leiste.
- F-27: Zwei Fenster mit derselben `?win=`-Id zeigen dieselben Panels – unkritisch, ggf. Hinweis.
- F-27: Bittet ein Fenster per „Enter“ ein geschlossenes Fenster, ein Panel zu zeigen, geht die Bitte verloren – ggf. `#show=<id>` in der Adresse.
- Menüs: andere Menüs (Lesezeichen-Sammlung, Stapel-Leiste) auf dasselbe Verhalten prüfen; Menü-Breite im Zahnrad-Menü (ca. 480 px) ansehen.
- Fokus-Radar im hellen Modus und auf schmalen Bildschirmen ansehen (Lagekarte neu).
- Media-Query `max-width: 760px` blendet noch `.tb-wide`/`.muted` aus – Reste aufräumen.
- Tooltip verschwindet beim Wechsel der Maus direkt in ein iframe? – Enrico beobachtet es.
- Schalter „eigener Mauszeiger aus“ in den Einstellungen (F-143) – braucht ein Feld in `look`.
- Barrierefreiheit Rest (NF-03): Ziehen/Andocken und Größe ändern per Tastatur (kommt mit F-153), Fokus-Reihenfolge prüfen.
- `README.md` von E-Sources ist veraltet (Ordner `server-extra/`, Speicherschlüssel v4, „F-01 bis F-95“).
- Heller Modus: Feinschliff (Menüs, Sammlung, Hinweise, Lineal, Suche, Tooltip, Fokus-Radar).
- Grüne Tab-Linie läuft bei ausgeklappter Stapel-Leiste über deren breiteren Teil hinaus.
- Lineal auf iPhone/iPad prüfen; Ziehen (HTML5 Drag & Drop) auf iPhone/iPad prüfen.
- Titel des Video-Lesezeichens in der Demo – Enrico fragen.

## Notiert (noch nicht im Lastenheft)

- Profil-PDF ist 2,6 MB.
- Stand-Übersicht (PDF) zuletzt am 21.11. – bei Gelegenheit neu erzeugen.

## Offene Rückfragen an Enrico

- F-153: Soll es im Fokus-Radar auch Tauschen geben (z. B. mit gedrückter Taste)?
- F-152: Darf die Lagekarte auf breiten Bildschirmen größer werden?
- „+ NewArea“ mit Plus so lassen oder nur „NewArea“?
- F-116 bis F-119: ✓/✕ im Lastenheft.
- Linie des aktiven Tabs oben – so gewollt?
- Rot in der ausgeklappten Stapel-Leiste und beim großen Namen leerer Panels?
- F-147 Farbpipette: ist eine Pipette für Seitenfarben gemeint?

## Offen (unverändert)

- `npm audit`: 3 Schwachstellen ansehen, **nicht** `npm audit fix --force`.
- Server-Standort und Kosten, Apple-Entwicklerkonto (bis Stufe 8).

## Technische Rahmenbedingungen

- Claudes Shell auf dem Mac (`device_bash`) ist eine Linux-VM **ohne Internet**, darf ohne Freigabe **nicht löschen**; `.git` nur lesen (`git --no-optional-locks`). **npm und git laufen in Enricos Terminal / GitHub Desktop.** Der Home-Ordner der VM wechselt je Chat (`~/vt` neu anlegen).
- Verbundener Ordner: **`~/Projects`** (in der VM `~/mnt/Projects`).
- Typprüfung in der VM: `node node_modules/typescript/bin/tsc --noEmit -p .` (in `web/`).
- Tests ohne Vite: Ersatzmodul `~/vt/node_modules/vitest/index.js` selbst schreiben (describe/it/expect mit toBe, toEqual, toHaveLength, toContain, not; **toEqual vergleicht per JSON**; am Ende „x passed, y failed“ ausgeben), dann `tsc --outDir ~/vt/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node --jsx react-jsx src/workspace/*.ts`, `cp -r ~/vt/node_modules ~/vt/out/`, `ln -sf ~/mnt/Projects/e-sources/web/node_modules/react ~/vt/out/node_modules/react`, dann `cd ~/vt/out && node workspace.test.js`.
- **Testbelegung:** `http://localhost:2910/?test=voll` (Modul `workspace/probe.ts`): Haupt- und Fenster 2 je 49 Zoll, 10 Areas × 9 Panels × 9 Tabs (nur Tab 1 mit Wikipedia de/en), speichert nichts, eigener BroadcastChannel und Fenstername (`esource-test-…`), Hinweis oben „Test: voll“. Zum Prüfen von Fokus-Radar, Grenzen und Leistung.
- **Ziehen testen (Pointer):** `pointerdown` per `elementFromPoint(..).dispatchEvent(new PointerEvent(..., {bubbles:true, button:0}))`, dann `pointermove`/`pointerup` auf `window` (erst ein Schritt weg vom Start, dann aufs Ziel). Tastatur-Fokus nach Aktionen kommt ein Bild später (rAF) – kurz warten, bevor man `document.activeElement` prüft.
- **Im Browser testen:** Der eingebaute Browser der Claude-App erreicht `http://localhost:2910` – mit `browser_repl` gut für Klick-, Stil- und Ebenen-Prüfungen (`document.elementFromPoint` zeigt, was oben liegt). Ein zweiter Tab mit `?win=<id>` spielt ein Zusatzfenster. **Pop-ups aus automatischen Klicks blockt das Pane** – Fenster öffnen nur in Enricos Chrome testen. Demo-Start im Pane: `localStorage.clear()` + neu laden (nur Test-Profil des Panes). Link-Ablage testen: `DragEvent` mit `new DataTransfer()` per `evaluate` auslösen. Kleine Fenster: `page.setViewportSize({ width, height })`, danach `setViewportSize(null)`. „Control+.“ → `page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '.', ctrlKey: true })))`. `getByRole('button', { name: 'Einstellungen' })` → `exact: true`. Playwright behandelt `aria-disabled` als gesperrt → `click({ force: true })`. Hinweis „Jetzt liegen 5 Panels auf …“ blockt Klicks → „Verstanden“.
- Code-Änderungen per Python mit exakten Ersetzungen (je `assert count == 1`) – bewährt; Anker eindeutig wählen (z. B. `const [said, setSaid]` gibt es in `Overview.tsx` zweimal). Neue Dateien per Heredoc direkt in der VM.
- Entwicklungsserver läuft oft schon („Port 2910 is already in use“ = gut, Browser neu laden; bei alten Styles ⌘+Shift+R). Demo-Startbelegung in Chrome testen: **neues** Inkognito-Fenster.
- Bilder/Icons/PDF: Cloud-Umgebung hat `rsvg-convert`, `pdftotext`, PIL, Chrome (headless PDF); Ergebnisse mit `device_commit_files` zurückschreiben. Bauen (`vite`) geht dort nicht.
- Lastenheft-Bearbeitung: Text per `insert`/`replace` mit `target {kind: "find"}` und `as: "text"`; neue Einträge mit `insert` nach der Liste des letzten Eintrags (`side: after`; F-153 steht in Liste `m546wxbbe43.59396`). Weiter ab **F-154**. Export als Markdown mit `export` (Tab `842c44f8-c93a`, Inhalt `28339b99-31da`).
- Geschichte: Doc `QjpbDizWw2VzQzWNmZgirP`, Inhalt `d3298f73-d817`; Tabelle „Was E-Sources heute kann“ `m7qxd0gvcsa.3657`, Ausblick-Liste `m7qxd0gvcsa.6938`.
- Portfolio: bei jeder CSS-Änderung die Version `?v=…` in `index.html`, `en/index.html`, `impressum.html`, `en/legal-notice.html` erhöhen (zuletzt `20261121c`).
- Enricos Mac: Node 24, Java 21, Chrome; lokal http://localhost:2910; zweiter Monitor vorhanden.
- **Committen:** GitHub Desktop (Summary → „Commit to main“ → „Push origin“; Enrico schreibt „PO ist durch/raus/fertig“).

## Arbeitsregeln

- **Funktion vor Design** (Ausnahme: ausdrücklicher Wunsch).
- **Barrierefreiheit immer mitdenken (NF-03):** vollständige Tastaturbedienung, ARIA-Rollen, Ansagen für Bildschirmleser, nicht nur Farbe als Signal, reduzierte Bewegung, erhöhter Kontrast.
- **Offene Punkte immer im Blick:** Claude führt die offenen Punkte aus Lastenheft und Übergabe mit und nutzt Restplatz im Chat für passende **kleine Punkte** – schlägt sie von sich aus vor.
- **Lastenheft ist die Grundlage:** Neue Wünsche mit Nummer eintragen, bevor sie gebaut werden. Weiter ab **F-154**.
- **Sammelmodus** `>START` … `<ENDE`.
- **Terminal-Anleitungen:** immer nur den nächsten Schritt, dann nachfragen.
- **Übergaberegel:** nach jeder Ausbaustufe, spätestens bei 60–70 % Chat-Füllstand, nie mitten in einer Aufgabe; Claude kündigt sie vorher an.
- **Übergabedatei:** `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/`.
