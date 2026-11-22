# Übergabe V26 → V27 E-Sources

Stand: 22.11.2026, abends · Chat V26 abgeschlossen · Nächster Chat: **V27 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V27 E-Sources**. Lies diese Übergabedatei. Die Reihenfolge im Lastenheft (Abschnitt „Stand und Reihenfolge“) ist freigegeben. Mach mit **F-168** weiter (Hinweis „Neue Version verfügbar“), danach **F-160 Stufe 2**. Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft (verbindlich, Claude Doc):** https://claude.ai/artifact/5Lcrj6JwXyEvUMcJjZQRY8 – Id genau so (Zeichen 6 ist eine „6“). Lesen: `read` mit `ref {object: node, id: 28339b99-31da}`, `container {kind: project, id: 5Lcrj6JwXyEvUMcJjZQRY8}`, `payload {kind: search, text: "F-168"}`. Vermerke per `update` (engine `prose`): „[✓ Vxx] “ per `insert` mit `side: start` auf die **Paragraph**-Id (nicht listItem); Zählung per `replace` mit `find`-Ziel (`as: text`).
- **Benennung – Ergebnis:** https://claude.ai/artifact/5Di2hzfovkm1NcmV3bocdp
- **Geschichte der Anwendung:** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – Ausblick noch nicht nachgezogen (F-151 bis F-182)
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`

## Was in V26 passiert ist

Stand Lastenheft danach: **88 fertig, 14 teilweise, 1 ersetzt, 55 offen** (von 158). Neu: **F-183** Icons für alle benannten Elemente (Suche, Cockpit, Hilfe, Menü, Kopfleiste; Symbol nie allein, Text/Tooltip/aria-label bleibt; offen: Favicons der Sources wegen Datenschutz). Platz in der Reihenfolge von Enrico bestätigt: nach dem Farben-Block, vor F-170. Reihenfolge: ✓F-36 → ✓F-180 → ✓F-181 → ✓F-179 → **F-168** → F-160 Stufe 2 → F-159 → Farben (F-161–F-164, F-171 Stufe 2) → **F-183 Icons** → F-170 Slotmaschine → F-51/F-52 → F-06.

- **F-181 Tour „Import“ ✓** – neue Tour `import` in `tour.ts` (Schlüssel `esource.tour.import.v1`). `TourStep` kann jetzt `when` (nur wenn Element da), `unless` (nur wenn nicht da), `list` (Aufzählung) und `action` (Knopf, der die Tour beendet und den Schritt ausführt). Schritte: intro, export (Wege je Browser), choose (nur ohne Dialog, Knopf „Datei wählen …“), summary/how/go (im Dialog `dialog.import`), sort (nur im Dialog).
  - Exportwege stehen einmal in `help.ts`: `BROWSER_EXPORT` + `browserExportLine()` (auch im Hinweis bei falscher Datei). Hilfe-/Suchpunkt `tourImport`.
  - `Tour.tsx`: neue Props `onAction`, `skip` (Schritt-Ids), `markSeen` (Grundeinstellung an); Fokus geht auf den Aktionsknopf, sonst „Weiter“. Karte mit Aufzählung ist breiter (540 px), Browsernamen fett, Knöpfe brechen um.
  - Ablauf beim ersten Import (nicht im Testmodus): Klick auf „Lesezeichen importieren …“ zeigt erst Teil 1 (ohne „gesehen“, `importPre` je Sitzung), „Datei wählen …“ öffnet die Dateiauswahl; im Dialog startet danach Teil 2 von selbst (ohne intro/export) und merkt „gesehen“. Knopf „Tour“ im Import-Dialog zeigt alles; die Tour liegt als Kind im Dialog (oberste Ebene, wie bei Design). Dialog zu → Tour endet mit. Esc schließt nur die Tour.
  - Geprüft: Tour per Suche (3 Schritte), im Dialog per Knopf (6 Schritte), Fokus zurück auf „Tour“, Esc-Reihenfolge. Dateiauswahl selbst nicht ausgelöst (öffnet ein System-Fenster).
- **F-179 Persönlicher Empfang ✓** – Modul `workspace/profile.ts`: `Profile {name, color, greet}` in `Workspace.profile` (kommt mit in „Desks exportieren“, Voreinstellung fällt weg), `PROFILE_COLORS` (8, alle ≥ 4,5:1 mit Weiß), `initialsOf`, `greetingFor(hour, name)`, `setProfile`, `parseProfile`, `loadLast/saveLast` (zuletzt aktives Portal je Desk, Schlüssel `esource.last.<win|main>`, nur Browser, nicht im Testmodus). Reducer `profile`. Begriff `TERMS.profile`, Hilfe-/Suchpunkt `profile`.
  - `components/Profile.tsx`: `Avatar` (Initialen, ohne Namen Personen-Zeichen) und `ProfileDialog` (Name, Kennfarbe als Radiogruppe, „Beim Start begrüßen …“; gilt sofort). Einstellungen: „Profil …“.
  - `components/Greeting.tsx`: Karte oben rechts, kein Dialog, nimmt keinen Fokus; Ansage per `sayLive`; verschwindet nach 15 s, nicht solange Maus/Fokus darauf; Esc/× schließt. „Weitermachen“ → `showPanel` + Fokus in die Adresszeile; „Profil anlegen …“/„Profil …“.
  - Wird nicht gezeigt beim allerersten Start (dann läuft die Start-Tour), in Zusatz-Desks, bei laufender Tour oder wenn abgeschaltet.
  - Geprüft im Browser (Testmodus; „Zuletzt offen“ dafür kurz von Hand gesetzt und Enricos alten Wert wiederhergestellt).
- Tests: 5 neue → **158, alle grün**. `tsc --noEmit` sauber.
- **Tests in Claudes VM:** Ersatz-vitest in V26 neu angelegt (`~/vt/node_modules/vitest/index.js`: describe/it/expect mit toBe, toEqual, toContain, toHaveLength, toBeNull, toBeUndefined, toMatchObject, `.not`; Zusammenfassung „n grün, m rot“ bei Prozessende). Geht mit neuer VM verloren – dann neu schreiben (ca. 40 Zeilen). Ablauf: in `web/` `node_modules/.bin/tsc --outDir ~/vt/out --module commonjs --target es2022 --moduleResolution node --esModuleInterop --skipLibCheck --jsx react-jsx src/workspace/*.ts`, `cp -r ~/vt/node_modules ~/vt/out/`, `ln -sf ~/mnt/Projects/e-sources/web/node_modules/react ~/vt/out/node_modules/react`, `cd ~/vt/out && node workspace.test.js`.
- **Browser-Tipp:** Nach dem ersten `tabs.create` (druckt die ganze Seite) im selben Tab mit `page.goto(...)` neu laden – das druckt nichts.

## Nächste Schritte

1. Enrico: e-sources committen (Vorschlag: „Tour Import und persönlicher Empfang mit Profil: F-181, F-179; Übergabe V26“) und pushen.
2. **F-168 Hinweis „Neue Version verfügbar“** (Startbildschirm-App auf iPhone/iPad lädt im Hintergrund nicht neu: beim Zurückkehren `visibilitychange` und in Abständen prüfen, ob eine neuere Version veröffentlicht ist – z. B. Build-Kennung, die Vite beim Bauen in eine kleine Datei schreibt; ruhiger Hinweis „Neue Version verfügbar – neu laden“ mit Knopf; angesagt, per Tastatur erreichbar).
3. Danach Reihenfolge wie oben. Fertige Punkte im Lastenheft auf `[✓ Vxx]` setzen und die Zählung nachziehen.

## Kleine Punkte

- Neu: Kennfarbe/Initialen erscheinen bisher nur in Begrüßung und Profil-Dialog – evtl. klein am Zahnrad oder später als Konto-Knopf (Ausbaustufe 4).
- Neu: Begrüßung in Zusatz-Desks bewusst aus; evtl. eigene kurze Variante.
- Neu: Profil-Name wird je Tastendruck gespeichert (in Ordnung, aber viele Speichervorgänge).
- Neu: Teil 1 der Import-Tour startet nur beim Klick in E-Sources; wer die Datei per Ziehen auf die Library bringen will, geht leer aus (Ziehen gibt es noch nicht – evtl. Datei auf die Seite ziehen = Import).
- Sortierhilfe-Liste `KNOWN` ist bewusst klein; Enrico könnte eigene Regeln wollen (passt zu F-163).
- Library-Fenster im Portal könnte bei Sources „Ohne Kategorie“ einen Link zur Sortierhilfe zeigen.
- Import ist nicht rückgängig zu machen (außer per Desks-Export vorher); evtl. „Rückgängig“ im Hinweis nach dem Import.
- Bei sehr vielen neuen Kategorien („Ordner wie im Browser“) evtl. Hinweis, „nur oberste Ebene“ zu nehmen.
- Launcher meldet nichts bei Popup-Sperre (`window.open(…, 'noopener')` lässt das nicht erkennen).
- Library im Portal öffnet gesperrte Sources noch im Portal (dann Ersatzanzeige) – evtl. direkt außerhalb öffnen bzw. „↗“.
- Launcher-Lage gilt je Desk, nicht je Bildschirmgröße.
- Toast wird erst mit Inhalt eingehängt – für Wichtiges `sayLive` nutzen.
- Kürzel kommen nicht an, wenn der Fokus in einem iframe steht – Hinweis in der Hilfe wäre gut.
- Hilfe- und Design-Dialog geben den Fokus nach Esc nicht zurück, wenn der Auslöser weg ist (in Closed/FocusRule/ImportBookmarks/SortHelp/Profile gelöst).
- Zweizeilige Kopfleiste: Tab springt vom Desk erst in die untere Zeile, dann zur Fokusanzeige.
- Terminal-Akzent übernimmt vorige Akzentfarbe; Toast „Akzentfarbe an … angepasst“ bleibt beim schnellen Designwechsel stehen.
- Schmale Portale: Portalname fehlt in der Titelleiste (BeOS-Reiter unsichtbar).
- Hilfe-Dialog: Platz für ausgeblendetes „Ausführen“ bleibt frei.
- Fokus je Desk nutzt dieselben Grenzen wie der Gesamtfokus (Rückfrage an Enrico offen).
- README nennt noch alte Begriffe und „F-01 bis F-95“.

## Technische Rahmenbedingungen

Git nur bei Enrico (GitHub Desktop). Enricos Dev-Server (`npm run dev`, http://localhost:2910) ist im eingebauten Browser erreichbar; Änderungen über device_bash kommen per Hot Reload sofort an. Messen und Testen mit `?test=voll` (nichts wird gespeichert; Touren starten dort nicht von selbst) und `page.setViewportSize`. Ohne `?test=voll` arbeitet man in Enricos echtem Stand. `tsc --noEmit` in `web/`.

## Arbeitsregeln

Wie V15–V25: Funktion vor Design · Barrierefreiheit immer (NF-03) · Begriffe erklären (Texte nur in terms.ts/help.ts) · offene Punkte im Blick, Restplatz mit kleinen Punkten füllen · Lastenheft zuerst (ab F-183) · Sammelmodus `>START` … `<ENDE` · Terminal: nur nächster Schritt · „PO“ = Push Origin · Übergabe spätestens bei 60–70 %, nie mitten in einer Aufgabe · Datei `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/` · Usability: so einfach und wirksam wie möglich für den Anwender.
