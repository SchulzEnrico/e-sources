# Übergabe V20 → V21 E-Sources

Stand: 22.11.2026, ca. 14:15 Uhr · Chat V20 abgeschlossen · Nächster Chat: **V21 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V21 E-Sources**. Lies diese Übergabedatei und das Lastenheft (Link unten). Kurze Sichtprüfung im Browser (`localhost:2910`, auch `?test=voll`, auch ≈ 375 px): Einstellungen → „Design anpassen …“ (Gruppen Modern/Retro, ein paar Retro-Designs durchklicken), Tour im Cockpit und im Design-Dialog, Schalter „Touren automatisch zeigen“. Dann **„PO gesamt“** (siehe unten). Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft (verbindlich):** https://claude.ai/artifact/5Lcrj6JwXyEvUMcJjZQRY8 – neu F-173 bis F-178
- **Benennung – Ergebnis:** https://claude.ai/artifact/5Di2hzfovkm1NcmV3bocdp
- **Geschichte der Anwendung:** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – Ausblick-Liste noch nicht nachgezogen (F-151 bis F-176)
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`
- Frühere Übergaben: `docs/uebergaben/V01` bis `V19_Uebergabe_E-Sources.md`

## Was in V20 passiert ist

- **F-172 Tour „Cockpit“:** `tour.ts` führt mehrere Touren (`TOURS.start`, `.cockpit`, `.design`, `TOUR_KEY` je Tour; Starttour behält `esource.tour.v1`). 8 Schritte im Cockpit; Knopf „Tour“ im Cockpit-Kopf (`.overview__tour`); Autostart beim ersten Öffnen; `Overview` bekommt `onTour` und `keepOpen` (sonst klappt das Cockpit beim Fokuswechsel ins Hinweisfenster zu); Cockpit zu → Tour endet. `Tour.tsx` scrollt sein Ziel ins Bild.
- **F-173 Touren-Schalter:** Kästchen „Nicht mehr automatisch anzeigen“ nur bei Autostart; Menüeintrag „Touren automatisch zeigen“ als `menuitemcheckbox` (`Item` hat jetzt `checked`); `toursAuto`/`setToursAuto`/`tourAutoStart` in tour.ts (Schlüssel `esource.tours.auto`).
- **F-174 Dialog „Design anpassen“:** `components/Design.tsx` (native `<dialog>`, `id="design"`), Darstellung + Akzentfarbe aus dem Einstellungsmenü dorthin; `TERMS.design`; Hilfe/Suche-Einträge `design`, `tourDesign`, `toursAuto`. **Wichtig:** Touren in einem modalen Dialog müssen *im* Dialog gerendert werden (children), sonst liegen sie darunter.
- **F-171 Tour „Design“ Stufe 1:** 5 Schritte im Design-Dialog; wächst mit F-161–F-164.
- **F-175 + F-176 Retro-Designs:** jetzt 12 Retro-Designs (Windows 2000, XP, 7 Aero, Mac System 7, Mac OS 9, Aqua, Snow Leopard, NeXTSTEP, BeOS, Amiga, Atari GEM, Ubuntu Ambiance), im Dialog gruppiert „Modern“/„Retro“ (`THEMES[].group`). Je Design eine eigene Akzentfarbe (`ACCENTS[].theme`), Test prüft Kontrast. CSS der acht F-176-Designs aus einer Vorlage erzeugt (Generator lag nur in der VM; Block „F-176 Weitere Retro-Designs“ am Ende von App.css). Aqua-Kopfleiste rund.
- **F-177 Knopf „Design“** (Paletten-Zeichen) rechts neben der Fokusanzeige, beide in `.tb-end`; Starttour hat einen Schritt dazu. Unter 640 px weichen Design-Knopf und „Gleich verteilen“ (`.tb-distribute`), die Fokusanzeige zeigt nur die Zahl – sonst verdeckte das Zahnrad seit dem Hilfe-Knopf (V19) die Fokusanzeige. Geprüft 360–1500 px ohne Überlappung.
- **F-178 Design „Terminal“:** Schriftfarbe = Akzentfarbe (`--text: var(--accent)`; „Terminal-Grün“, „Terminal-Bernstein“), Monospace, Leuchten per text-shadow, Rasterlinien im Hintergrund, aktives Portal mit invertierter Titelzeile, blinkender Cursor hinter dem Desk-Namen nur ohne „Bewegung reduzieren“.
- **Nebenbei behoben:** Suchfeld wird nach Ausführen einer Funktion geleert · Hilfe unter 560 px wirklich einspaltig (spätere Regel hatte es überschrieben) · Dialoge in Retro-Designs mit Fensterfarbe statt Schreibtischfarbe · Desk-Name (Silberverlauf) in hellen Designs lesbar.
- Tests 132/132 (Ersatz-vitest), Typprüfung grün.

## Commit

In V20 von Claude committet (Wunsch Enrico): F-176, F-177, F-178, Übergabe V20. Push aus der VM nicht möglich (Proxy 403) – Enrico pusht mit GitHub Desktop.

## Nächste Schritte

1. Sichtprüfung (siehe Startanweisung).
2. **„PO gesamt“** (Wunsch Enrico; Verständnis noch von Enrico zu bestätigen): Product-Owner-Durchgang über das ganze Lastenheft – Erledigtes abhaken, Doppeltes zusammenführen (z. B. zwei Ergänzungen in F-170), offene Einträge nach Wert und Abhängigkeit ordnen, Lastenheft-Titel/ältere Einträge (aus F-154), Ausblick in der Geschichte nachziehen (F-151 bis F-176). Ergebnis: Reihenfolge zum Freigeben.
3. Danach je nach Freigabe: F-159 Main Desk ohne Knopf-Look, F-160 Stufe 2, Farben F-161 → F-164 (in den Dialog „Design anpassen“), F-171 Stufe 2.

## Kleine Punkte

- Kopfleiste 320–350 px: Zahnrad verdeckt die Fokusanzeige noch knapp (offen seit V18).
- Idee offen: Retro-Design bringt seine Akzentfarbe beim Wählen gleich mit (sonst erscheint der Kontrasthinweis). Enrico noch nicht gefragt.
- Bei schmalen Portalen (z. B. `?test=voll`) fehlt der Portalname in der Titelleiste – BeOS-Reiter dann nicht sichtbar (nur Optik).
- Im eingebauten Browser sind Cockpit- und Design-Tour durch Tests als gesehen gemerkt.
- Lastenheft F-156 nennt im Beispiel noch „Größen-Modus · Strg/⌘+Umschalt+G“ (richtig: Adjust · Alt/⌥+A).
- Hilfe-Dialog: Platz für ausgeblendetes „Ausführen“ bleibt frei.
- Fokus je Desk nutzt dieselben Grenzen wie der Gesamtfokus (Rückfrage an Enrico offen).
- README nennt noch alte Begriffe. Punkte aus V16–V19 „Kleine Punkte“ gelten weiter.

## Technische Rahmenbedingungen

Wie V19. Ersatz-vitest unter `~/vt/node_modules/vitest/index.js` musste in V20 neu angelegt werden (VM wechselt) – Vorlage: describe/it sammeln, Tests bei `beforeExit` laufen lassen, expect mit toBe, toEqual, toHaveLength, toContain, toMatchObject, toBeTruthy, toBeGreaterThan, toBeLessThan und `.not`. Dann `node_modules/.bin/tsc --outDir ~/vt/out --module commonjs --target es2022 --moduleResolution node --esModuleInterop --skipLibCheck src/workspace/*.ts`, `cp -r ~/vt/node_modules ~/vt/out/`, react nach `~/vt/out/node_modules/` verlinken, `node workspace.test.js`. Git nur bei Enrico (GitHub Desktop).

## Arbeitsregeln

Wie V15–V19: Funktion vor Design · Barrierefreiheit immer (NF-03) · Begriffe erklären (Texte nur in terms.ts/help.ts) · offene Punkte im Blick, Restplatz mit kleinen Punkten füllen · Lastenheft zuerst (ab F-179) · Sammelmodus `>START` … `<ENDE` · Terminal: nur nächster Schritt · Übergabe spätestens bei 60–70 %, nie mitten in einer Aufgabe · Datei `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/`.
