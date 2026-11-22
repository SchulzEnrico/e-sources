# Übergabe V22 → V23 E-Sources

Stand: 22.11.2026, ca. 15:30 Uhr · Chat V22 abgeschlossen · Nächster Chat: **V23 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V23 E-Sources**. Lies diese Übergabedatei. Die Reihenfolge im Lastenheft (Abschnitt „Stand und Reihenfolge“) ist freigegeben. Mach mit **F-23 Rest** weiter (Tastenkürzel für nächsten/vorigen Tab und nächstes/voriges Portal, mit Ansage). Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft (verbindlich, Claude Doc):** https://claude.ai/artifact/5Lcrj6JwXyEvUMcJjZQRY8 – lesen/ändern nur mit den Docs-Werkzeugen (read/update), höchstens 64 Ops je update. Vermerke kleiner Änderungen gehen per `find`-Ziel ohne vorheriges Lesen.
- **Benennung – Ergebnis:** https://claude.ai/artifact/5Di2hzfovkm1NcmV3bocdp
- **Geschichte der Anwendung:** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – Ausblick noch nicht nachgezogen (F-151 bis F-178)
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`

## Was in V22 passiert ist

- **Freigabe:** Enrico hat Reihenfolge und Zusammenführen freigegeben und den Stand-Abschnitt behalten. Lastenheft-Arbeit (Zusammenführen, Begriffe F-154, Ausblick Geschichte) läuft als Füllarbeit vor Übergaben, nicht vor dem Code. Überschrift heißt jetzt „Durchgang 22.11.2026, V21“, Reihenfolge „freigegeben“.
- **F-166 Rest ✓** (nur `App.css`): Unter 520 px ist die Kopfleiste zweizeilig – oben Desk und Fokusanzeige, darunter die Bedienung über die volle Breite; das Suchfeld ist dort wieder ein Feld (nicht nur Lupe), die Trefferliste nutzt die ganze Zeile (ragte vorher 99 px links aus dem Bild). Mit zwei Desks fällt zwischen 521 und 710 px das Logo weg. Auch mit **einem** Desk gab es vorher Überlappung (unter 370 px). Geprüft mit `?test=voll`, ein und zwei Desks, 300–1400 px.
- **F-114 Rest ✓** (`App.tsx`, `PanelFrame.tsx`, `App.css`, `workspace.ts`, `useWorkspace.ts`): Hinweise bei 5/9 Portalen im Stack und 5/9 Tabs stehen als Karte unten im Portal (`.win__alert`, role="alert"), Rahmen rot (`.win--alert`), „Verstanden“ oder Esc schließt, Fokus geht auf die Karte und danach zurück (`preventScroll`). Dialog `notice` bleibt nur für Import-Fehler und den Fall ohne bekanntes Portal.
- **Bug behoben:** Der Hinweis bei 5 Portalen kam nie – `addPanel` erzeugt eine Zufalls-ID, Probe und echtes Portal hatten verschiedene IDs. Jetzt `addPanel(ws, setup, area, id?)` und Aktion `{ type: 'add', id }`; App vergibt die ID vorher mit `newId()`.
- **„Zum Dashboard“ verschiebt nichts mehr** (Wunsch Enrico): Außerhalb des Dashboards steht an der Stelle von „Gleich verteilen“ (dort ohnehin gesperrt) ein gleich großer Knopf mit Zurück-Pfeil (`.tb-home`, aria-label „Zum Dashboard“, Tooltip mit Esc und Begriff Dashboard). Der View-Knopf bleibt beim Durchschalten an derselben Stelle – geprüft bei 1440, 1100, 760 und 375 px. Unter 640 px (wo „Gleich verteilen“ fehlt) kommt der Knopf neu dazu; dort gibt das Suchfeld nach, der View-Knopf bleibt ebenfalls stehen.
- **Tests nicht gelaufen:** vitest läuft in Claudes Linux-Umgebung nicht (Rollup-Binärdatei für macOS). `tsc --noEmit` ist sauber. Enrico sollte die Tests mit dem Ersatz-vitest unter `~/vt` laufen lassen.

## Nächste Schritte

1. Enrico: Tests laufen lassen, committen (Vorschlag: „F-166 Kopfleiste schmal zweizeilig, F-114 Hinweise am Portal“), pushen.
2. Code nach freigegebener Reihenfolge: **F-23 Rest** → F-24 → F-29 Rest → Launcher (F-40–F-42, F-149, F-43) → F-36 → F-168 → F-160 Stufe 2 → F-159 → Farben F-161–F-164 → F-51/F-52 → F-06.
3. Wird ein Punkt fertig: Vermerk im Lastenheft auf `[✓ Vxx]` setzen (Eintrag und Reihenfolge-Liste).
4. Füllarbeit vor Übergaben: Zusammenführen im Lastenheft umsetzen, Begriffe auf F-154 umstellen, neuere Einträge einsortieren, Ausblick in der Geschichte.

## Kleine Punkte

- Neu: In der zweizeiligen Kopfleiste springt Tab vom Desk erst in die untere Zeile, dann zur Fokusanzeige oben rechts (Reihenfolge im DOM).
- Neu: Unit-Test für `addPanel` mit vorgegebener ID fehlt noch.
- Terminal-Akzent übernimmt vorige Akzentfarbe; Toast „Akzentfarbe an … angepasst“ bleibt beim schnellen Designwechsel stehen.
- Bei schmalen Portalen fehlt der Portalname in der Titelleiste (BeOS-Reiter dann unsichtbar).
- Im eingebauten Browser sind Cockpit- und Design-Tour als gesehen gemerkt.
- Hilfe-Dialog: Platz für ausgeblendetes „Ausführen“ bleibt frei.
- Fokus je Desk nutzt dieselben Grenzen wie der Gesamtfokus (Rückfrage an Enrico offen).
- README nennt noch alte Begriffe und „F-01 bis F-95“.

## Technische Rahmenbedingungen

Wie V20/V21 (Ersatz-vitest unter `~/vt`). Git nur bei Enrico (GitHub Desktop). Enricos Dev-Server (`npm run dev`, http://localhost:2910) ist im eingebauten Browser erreichbar; Änderungen über device_bash kommen per Hot Reload sofort an. Messen mit `?test=voll` und `page.setViewportSize`. Lastenheft-Text: Docs read → JSON in Datei → mit Python in Text umwandeln.

## Arbeitsregeln

Wie V15–V21: Funktion vor Design · Barrierefreiheit immer (NF-03) · Begriffe erklären (Texte nur in terms.ts/help.ts) · offene Punkte im Blick, Restplatz mit kleinen Punkten füllen · Lastenheft zuerst (ab F-179) · Sammelmodus `>START` … `<ENDE` · Terminal: nur nächster Schritt · „PO“ = Push Origin · Übergabe spätestens bei 60–70 %, nie mitten in einer Aufgabe · Datei `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/`.
