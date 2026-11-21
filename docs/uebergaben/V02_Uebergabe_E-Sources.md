# Übergabe V02 → V03 E-Sources

Stand: 21.11.2026 · Chat V02 abgeschlossen (Ausbaustufe 1 noch nicht fertig) · Nächster Chat: **V03 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V03 E-Sources**. Lies diese Übergabedatei und das Lastenheft (Link unten). Wir setzen **Ausbaustufe 1** fort: Umbau des Rasters auf das Kachel-Modell (siehe „Nächster Schritt“). Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft (verbindlich):** https://claude.ai/artifact/5Lcrj6JwXyEvUMcJjZQRY8 — in V02 geändert: F-01, F-02, F-03, F-08 (neu), F-11, F-53, Ausbaustufe 1, offene Frage „Name für Fenster“
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`
- **Übergabe V01:** `docs/uebergaben/V01_Uebergabe_E-Sources.md`

## Was in V02 entstanden ist

- `web/`: React 18 + TypeScript + Vite 6 + react-grid-layout 1.5, Vitest. Läuft unter **http://localhost:2910** (`strictPort`).
  - `src/workspace/screen.ts` – Bildschirmklassen, Erkennung, Ausrichtung, ein-/zweizeilig, Raster je Einstellung
  - `src/workspace/layout.ts` – reine Raster-Logik (Ausweichen, Wachsen, Platzieren, Verteilen)
  - `src/workspace/workspace.ts` – Aktionen auf der Arbeitsfläche inkl. Stapel (F-08)
  - `src/workspace/storage.ts` – localStorage, Schlüssel `esource.workspace.v3`
  - `src/components/WindowFrame.tsx`, `StackBar.tsx`, `src/App.tsx`
  - `src/workspace/layout.test.ts` – 25 Tests (in Claudes Umgebung mit Ersatz-Runner geprüft)
- `server-extra/`: `setup-server.sh` erzeugt `server/` über Spring Initializr (Java 21, Maven-Wrapper, Paket `de.esource.server`) und kopiert `HealthController` (`GET /api/health`) samt Test hinein. **Noch nicht ausgeführt.**
- README, `.gitignore`.
- **Committet und gepusht** am 21.11.2026 als `0797229` „Stufe 1 (Zwischenstand): Raster, Bildschirmklassen, Stapel, Übergabe V02“. (Diese Übergabedatei wurde danach noch einmal ergänzt – mit dem nächsten Commit mitnehmen.)

## Entscheidungen aus V02

- **Bildschirmklassen (F-03):** sichtbare Fenster Smartphone 1, Tablet/kleiner Laptop 2, großer Laptop 4, Monitor 6, Ultrawide 8, Super-Ultrawide 10, Apple Vision 16. Ab 4 wahlweise ein- oder zweizeilig (gleiche Anzahl, nur anders angeordnet), hochkant in Spalten. Erkennung nach längerer Seite in CSS-Pixeln (Grenzen 700 / 1600 / 2200 / 3200 / 4600; kürzere Seite < 600 = Smartphone), zusätzlich manuell wählbar. Eigenes Layout und eigene Wunsch-Anordnung je Klasse, Ausrichtung und Reihenzahl.
- **Stapel (F-08):** Mehr Fenster als sichtbare Plätze → der Platz ganz rechts wird zum Stapel; Wechsel per Klick auf die Stapel-Leiste, Mausrad, Pfeile ‹ › oder Wischen. Neues Fenster wird im Stapel gleich angezeigt. Schließt man ein Fenster im Raster, rückt das sichtbare Stapel-Fenster nach.
- **Zurücksetzen** löscht keine Fenster (verteilt ohne Wunsch-Anordnung alle neu).
- **Kachel-Modell (Enricos Test am 21.11.):** Das freie Raster erzeugt Lücken (z. B. unter einem verkleinerten Fenster), und die obere Kante lässt sich nicht greifen. Beschlossen:
  - Fläche **immer lückenlos** gefüllt (F-01).
  - **Keine Trennbalken**, sondern Pfeil-Griffe an **allen vier Kanten und den Ecken** jedes Fensters, wie die vorhandenen. Ziehen verschiebt die gemeinsame Kante: ein Nachbar wächst, der andere schrumpft (F-02).
  - **Alle Anordnungen möglich** (F-11): ungerade Zahl mit einem Fenster über beide Reihen, breite untere Reihe, hohes Fenster in der Mitte mit je zwei übereinander links und rechts usw.
  - Verschieben: auf die **Mitte** eines anderen Fensters = **tauschen**, an dessen **Rand** = **andocken** (links/rechts/oben/unten).

## Nächster Schritt: Umbau auf Kachel-Modell

**Name:** „Fenster“ heißt ab jetzt **„Panel“** (entschieden 21.11.2026). Beim Umbau in Oberfläche, Code-Kommentaren und Lastenheft-Texten umstellen (z. B. „+ Panel“, „Panel schließen“, „4 Panels im Stapel“).

Vorschlag für die Umsetzung (react-grid-layout entfällt dann):

1. **Datenmodell als Teilungsbaum** je Bildschirm-Einstellung: Knoten = Teilung (`row` | `col`) mit Kindern und Anteilen, Blatt = Fenster-ID oder Stapel. Lückenlos per Konstruktion.
2. **Griffe:** Kante eines Blatts ziehen → nächster Vorfahr in passender Richtung, an dem das Blatt nicht am Rand liegt; Anteile der beiden angrenzenden Geschwister verschieben (Mindestgröße beachten).
3. **Ziehen & Andocken:** Drop-Zonen auf jedem Fenster (Mitte = tauschen, Ränder = andocken). Andocken = Blatt entfernen, Ziel-Blatt in passender Richtung teilen.
4. **Anlegen:** größtes Blatt teilen, solange Plätze frei; sonst Stapel (F-08 bleibt).
5. **Schließen:** Blatt entfernen, Geschwister übernimmt den Platz; mit Stapel rückt das Stapel-Fenster nach.
6. **Gleich verteilen / Standard:** Baum nach ein-/zweizeilig neu aufbauen.
7. Logik-Tests aus `layout.test.ts` auf das neue Modell übertragen; Speicherschlüssel auf `v4` anheben.

Danach: Enrico testet, `npm test`, `npm run build`, Server per `setup-server.sh` erzeugen und `./mvnw test`, **committen**, Übergabe V03 → V04.

## Offen

- Server-Standort und Kosten, Apple-Entwicklerkonto (bis Stufe 8).

## Technische Rahmenbedingungen (in V02 gelernt)

- Claudes Shell auf dem Mac (`device_bash`) ist eine Linux-VM **ohne Internet** und darf **nicht löschen**; `.git` ist dort nicht beschreibbar. Daher: **npm, Maven und git laufen in Enricos Terminal.** Dateien überträgt Claude als Archiv nach `~/Projects/_to_delete/` und entpackt sie per Kopie ins Repo (Enrico löscht `_to_delete` gelegentlich).
- Projektordner verbunden ist `~/Projects` (darin `e-sources`).
- Enricos Mac: Node 24, Java 21, Chrome; Arbeitsfläche „Großer Laptop“ wird erkannt.
- `npm install`, `npm test` und `npm run dev` liefen bei Enrico; die Oberfläche läuft unter http://localhost:2910. `npm test`- und `npm run build`-Ausgaben hat Claude noch nicht gesehen – in V03 nachfragen.
- **Committen:** Enrico nutzt **GitHub Desktop** (Repository e-sources ist dort eingebunden, Branch `main`): Summary eintragen → „Commit to main“ → „Push origin“. Alternativ Terminal – aber nie im Fenster, in dem `npm run dev` läuft (dort landen Eingaben bei Vite), sondern in einem neuen Tab (Cmd+T).

## Arbeitsregeln

- **Funktion vor Design.**
- **Lastenheft ist die Grundlage:** Neue Wünsche kommen dort mit Nummer hinein, bevor sie gebaut werden.
- **Übergaberegel:** nach jeder abgeschlossenen Ausbaustufe, spätestens bei geschätzt 60–70 % Chat-Füllstand, nie mitten in einer Aufgabe; Claude kündigt sie vorher an.
- **Übergabedatei:** `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/` – Versionsnummer immer am Anfang des Dateinamens.
