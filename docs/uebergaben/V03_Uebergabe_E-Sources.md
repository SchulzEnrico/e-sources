# Übergabe V03 → V04 E-Sources

Stand: 21.11.2026 · Chat V03 abgeschlossen (Ausbaustufe 1 noch nicht fertig) · Nächster Chat: **V04 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V04 E-Sources**. Lies diese Übergabedatei und das Lastenheft (Link unten). Wir setzen **Ausbaustufe 1** fort, beginnend mit „Nächste Schritte“. Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft (verbindlich):** https://claude.ai/artifact/5Lcrj6JwXyEvUMcJjZQRY8 (ein Claude Doc, mit den Docs-Werkzeugen lesen) – in V03 geändert: überall „Fenster“ → „Panel“ (außer F-07, dort sind Programmfenster gemeint), F-08 (Stapel-Leiste rechts, Tabs oben), **F-09 neu**, F-11 (Andocken am Rand der Fläche), F-14 (Kopfleiste wie im Browser), F-20 (Panel-Optionen im Ausklappmenü), **NF-06 und NF-07 neu**, offene Frage „Name“ abgehakt
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`
- **Frühere Übergaben:** `docs/uebergaben/V01_Uebergabe_E-Sources.md`, `V02_Uebergabe_E-Sources.md`

## Was in V03 entstanden ist

- **Dateinamen der Übergaben:** Versionsnummer immer am Anfang: `Vxx_Uebergabe_E-Sources.md`.
- **Kachel-Modell statt react-grid-layout** (Paket entfernt, `npm install` lief):
  - `web/src/workspace/tree.ts` – Teilungsbaum (`row` = nebeneinander, `col` = übereinander, Anteile je Kind). Lückenlos per Konstruktion. Funktionen: `rects`, `standard`, `equalize`, `removeLeaf` (Nachbar davor übernimmt den Platz), `insertAt`, `dock`, `dockArea` (Rand der ganzen Fläche, Ziel `AREA`), `drop` (Mitte = tauschen, Rand = andocken), `addToLargest`, `resizeEdge` (nächster passender Vorfahr; ist ein Nachbar an der Mindestgröße, schiebt die Kante weiter), `resizeEdges` (Ecke), `setLeafSize`, `isNode`.
  - `web/src/workspace/workspace.ts` – Aktionen mit Stapel (F-08, ein Stapel ganz rechts, Blatt-Id `__stack__`), `normalize`, `viewOf`/`describe`, `normalizeUrl`/`setPanelUrl`, `splitSelection`.
  - `screen.ts` ohne Zellraster (Kapazität, Reihen, Seitenverhältnis je Klasse). Speicher `esource.workspace.v4`, Feld `panels` (statt `windows`).
  - `components/PanelFrame.tsx` (ersetzt WindowFrame), `StackBar.tsx` (senkrecht, rechts am Panel), `App.tsx` (absolute Kacheln, Griffe, Ziehen mit Ablage-Vorschau, Rand der Fläche andocken).
  - Griffe: nur einer je gemeinsamer Kante (rechte/untere Kante + rechte untere Ecke eines Panels), auf Touch größer.
  - Vorläufige Adresszeile mit iframe (sandbox ohne `allow-top-navigation`); beim Ziehen `pointer-events: none` für iframes.
  - Tests: `web/src/workspace/workspace.test.ts`, 36 Tests. Bei Enrico: `npm test` 35/35 grün, `npm run build` ohne Fehler (vor den letzten drei Änderungen; danach in Claudes Umgebung 36/36 und Typprüfung ok).
- Alte Dateien (`layout.ts`, `layout.test.ts`, `WindowFrame.tsx`) liegen in `~/Projects/_to_delete/v03_alt/`.
- README auf Panels und Kachel-Modell umgestellt.

## Entscheidungen aus V03

- „Gleich verteilen“ = alle Anteile gleich, Anordnung bleibt. „Layout zurücksetzen“ = Standard-Anordnung bzw. Wunsch-Anordnung.
- Neues Panel bekommt die Hälfte des größten Panels (geteilt an dessen längerer Seite).
- Ganz an den Rand der Arbeitsfläche ziehen = über die ganze Breite/Höhe andocken (nötig für eine breite untere Reihe).

## Nächste Schritte (Enricos Rückmeldung vom 21.11., noch offen)

1. **Kopfleiste wie im Browser (F-14):** Adresszeile in den Kopf; Reihenfolge: Vor · Zurück · Neu laden · Home · Adresszeile · Größen-Voreinstellungen · Name · Schließen. Die eigene Zeile für die Adresse fällt weg. Vor/Zurück/Neu laden wirken vorerst nur, soweit ein iframe es zulässt (eigener Verlauf je Panel nötig; cross-origin ist `history` des iframes nicht erreichbar).
2. **Ausklappmenü (F-20):** Umbenennen, ⇄ Tauschen, ↺ Zurücksetzen, Maximieren und später Verhalten/Kategorien/Szenarien wandern in ein Menü (Lesezeichen-Menü des Panels).
3. **Kompakt (NF-06):** Alle Bedienelemente so klein wie möglich, bei Hover/Antippen lesbar ausklappen. **Die Stapel-Leiste rechts ist viel zu breit** (120 px): schmal (z. B. Zähler + ▲▼) und bei Hover/Antippen ausklappen, als Überlagerung, ohne den Inhalt zu verschieben.
4. **Rückmeldung beim Ziehen (NF-07):** Beim Ziehen eines Griffs (besonders am Kreuzungspunkt, der vier Panels betrifft) sind bisher nur das aktive Panel bzw. das linke obere hervorgehoben. Alle Panels, deren Größe sich ändert, sollen während des Ziehens einen Effekt haben. Umsetzung: vor dem Ziehen und bei jeder Bewegung `rects` von Entwurf und Ausgangsbaum vergleichen, geänderte Blätter markieren.
5. **Stapel an jedem Platz (F-09):** An jedem Panel per Knopf ein neues Panel obendrauf legen. Vorschlag Datenmodell: Blatt = Platz mit eigener Id, `panels: string[]` und `front`; der bisherige Sonderfall `__stack__` entfällt. Panels ohne Platz in einer Einstellung (z. B. andere Bildschirmklasse) kommen auf den Platz ganz rechts. Alle Aktionen und Tests anpassen, Speicher auf `v5`.

Danach: Enrico testet, `npm test`, `npm run build`, Server per `server-extra/setup-server.sh` erzeugen und `./mvnw test`, committen, Übergabe V04 → V05.

## Offen

- `npm install` meldet 3 Schwachstellen (1 moderate, 2 critical) – `npm audit` ansehen, **nicht** `npm audit fix --force`.
- npm-Warnung „install-scripts“ für esbuild und fsevents: Build und Tests laufen trotzdem.
- Server-Standort und Kosten, Apple-Entwicklerkonto (bis Stufe 8).

## Technische Rahmenbedingungen

- Claudes Shell auf dem Mac (`device_bash`) ist eine Linux-VM **ohne Internet** und darf ohne Freigabe **nicht löschen**; `.git` ist dort nicht beschreibbar. **npm, Maven und git laufen in Enricos Terminal.**
- Projektordner `~/Projects` ist verbunden (in V03 erneut über „Add folder“ hinzugefügt). Löschen geht nicht: Alte Dateien nach `~/Projects/_to_delete/` verschieben.
- In der VM laufen Typprüfung und Tests ohne Vite: `node node_modules/typescript/bin/tsc --noEmit -p .` und ein Ersatz-Runner (Test nach CommonJS übersetzen, kleines `vitest`-Ersatzmodul unter `~/vt/node_modules/vitest`).
- Dateien, die Claude in der Cloud schreibt und per `device_commit_files` überträgt, sind manchmal einige Sekunden veraltet: nach dem Übertragen per `grep` prüfen, ggf. erneut übertragen.
- Enricos Mac: Node 24, Java 21, Chrome; Arbeitsfläche „Großer Laptop“ wird erkannt. Oberfläche unter http://localhost:2910.
- **Committen:** GitHub Desktop (Summary → „Commit to main“ → „Push origin“) oder Terminal in einem neuen Tab (Cmd+T), nie im Tab mit `npm run dev`.

## Arbeitsregeln

- **Funktion vor Design.**
- **Lastenheft ist die Grundlage:** Neue Wünsche kommen dort mit Nummer hinein, bevor sie gebaut werden.
- **Übergaberegel:** nach jeder abgeschlossenen Ausbaustufe, spätestens bei geschätzt 60–70 % Chat-Füllstand, nie mitten in einer Aufgabe; Claude kündigt sie vorher an.
- **Übergabedatei:** `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/` – Versionsnummer immer am Anfang des Dateinamens.
