# Übergabe V23 → V24 E-Sources

Stand: 22.11.2026, ca. 15:40 Uhr · Chat V23 abgeschlossen · Nächster Chat: **V24 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V24 E-Sources**. Lies diese Übergabedatei. Die Reihenfolge im Lastenheft (Abschnitt „Stand und Reihenfolge“) ist freigegeben. Mach mit dem **Launcher** weiter (F-40 bis F-42, F-149, F-43 Rest als ein Paket). Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft (verbindlich, Claude Doc):** https://claude.ai/artifact/5Lcrj6JwXyEvUMcJjZQRY8 – Id genau so (Zeichen 6 ist eine „6“). Lesen: `read` mit `ref {object: node, id: 28339b99-31da}`, `container {kind: project, id: 5Lcrj6JwXyEvUMcJjZQRY8}`, `payload {kind: search, text: "F-40"}`. Vermerke per `update` mit `find`-Zielen (insert `side: before/after`, replace `as: text`), ohne vorheriges Lesen.
- **Benennung – Ergebnis:** https://claude.ai/artifact/5Di2hzfovkm1NcmV3bocdp
- **Geschichte der Anwendung:** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – Ausblick noch nicht nachgezogen (F-151 bis F-178)
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`

## Was in V23 passiert ist

Stand Lastenheft danach: **78 fertig, 15 teilweise, 1 ersetzt, 59 offen** (von 153). Reihenfolge: 5 von 13 erledigt.

- **F-23 Rest ✓** – Alt/⌥+T nächster Tab im aktiven Portal, Alt/⌥+P nächstes Portal (Slots in Lesereihenfolge; Solo/2er-View schaltet mit), Umschalt = rückwärts, rundherum. Ansage über eine immer vorhandene `sr-only`-Live-Region in `App.tsx` (`cycleSaid`/`sayLive`), Fokus danach auf den sichtbaren Tab (per `setTimeout`, nicht `requestAnimationFrame` – rAF lief im Hintergrund-Fenster verspätet). Tabs nach WAI-ARIA: nur sichtbarer Tab `tabIndex 0`, Pfeile/Pos1/Ende wechseln (`PanelFrame.tsx`). Kürzel wirken nicht hinter `[aria-modal]` oder `dialog:modal`. Logik in `workspace/cycle.ts`.
- **F-24 ✓** – Zuletzt geschlossen (`workspace/closed.ts`, `components/Closed.tsx`): Portal/Tab mit Seite schließen → Hinweis mit Knopf „Wiederherstellen“ (8 s, `.toast__undo`), Alt/⌥+Z holt das Neueste zurück, Liste „Zuletzt geschlossen …“ im Zahnrad-Menü, in Suche und Hilfe. Je Desk 10 Einträge, gespeichert in `Workspace.closed` (optional, fehlt wenn leer). Portal zurück auf alten Slot (sonst wie neues Portal), Tab an alte Stelle (Portal weg → neues Portal mit alter Id und altem Namen). Reducer: `remove` mit `setup` merkt, `closeTab` merkt, `restore`.
- **F-29 Rest ✓** – „Fokusanzeige anpassen …“ (`components/FocusRule.tsx`): Grenzen Grün/Gelb/Orange (1–200), Gewicht weiterer Tab (0/¼/½/1). `Workspace.focus` optional, nur bei Abweichung; `focusOf`/`effectOf`/`deskFocusOf` nehmen `ruleOf(ws)` als Vorgabe. `fixRule` ordnet Grenzen, Dialog sagt Korrekturen an.
- **Test für `addPanel` mit fester Id** ergänzt. Tests jetzt **142, alle grün**.
- **Tests laufen in Claudes VM** (nicht bei Enrico!): Ersatz-vitest unter `~/vt/node_modules/vitest/index.js` neu anlegen (describe/it/expect mit toBe, toEqual, toHaveLength, toContain, toMatchObject, toBeTruthy/Falsy, toBeUndefined, toBeGreaterThan …, not), dann in `web/`: `node_modules/.bin/tsc --outDir ~/vt/out --module commonjs --target es2022 --moduleResolution node --esModuleInterop --skipLibCheck --jsx react-jsx src/workspace/*.ts`, `cp -r ~/vt/node_modules ~/vt/out/`, `ln -sf ~/mnt/Projects/e-sources/web/node_modules/react ~/vt/out/node_modules/react`, `cd ~/vt/out && node workspace.test.js`.
- **Vorsicht:** Im eingebauten Browser ohne `?test=voll` arbeitet man in Enricos echtem Stand (V23 einmal versehentlich, Fokus-Grenzen wieder auf Voreinstellung gesetzt, geprüft).

## Nächste Schritte

1. Enrico: e-sources committen (Vorschlag: „F-23 Rest Tab/Portal-Kürzel, F-24 Zuletzt geschlossen, F-29 Rest Fokus-Grenzen einstellbar, Übergabe V23“) und pushen.
2. ~~Portfolio „Aktuell“ auffrischen~~ – erledigt in V23 (E-Sources-Punkt DE und EN neu, sitemap lastmod 22.11.).
3. Code nach Reihenfolge: **Launcher** (F-40–F-42, F-149, F-43 Rest) → F-36 → F-168 → F-160 Stufe 2 → F-159 → Farben F-161–F-164 (danach F-171 Stufe 2) → F-51/F-52 → F-06.
4. Fertige Punkte im Lastenheft auf `[✓ Vxx]` setzen (Eintrag und Reihenfolge) und die Zählung im Absatz „Von 153 Einträgen …“ nachziehen.
5. Füllarbeit vor Übergaben: Zusammenführen im Lastenheft, Begriffe auf F-154, neuere Einträge einsortieren, Ausblick in der Geschichte.

## Kleine Punkte

- Neu: Toast (`.toast`, role="status") wird erst mit Inhalt eingehängt – Ansagen dort sind unsicher; für Wichtiges die Live-Region `sayLive` nutzen. Evtl. Toast-Region dauerhaft einhängen.
- Neu: Kürzel kommen nicht an, wenn der Fokus in einer eingebetteten Seite (iframe) steht – Hinweis in der Hilfe wäre gut.
- Neu: Hilfe-Dialog gibt den Fokus nach Esc nicht zurück, wenn der Auslöser weg ist (in `Closed.tsx`/`FocusRule.tsx` gelöst: zurück aufs Zahnrad) – in `Help.tsx` und `Design.tsx` ebenso machen.
- In der zweizeiligen Kopfleiste springt Tab vom Desk erst in die untere Zeile, dann zur Fokusanzeige oben rechts.
- Terminal-Akzent übernimmt vorige Akzentfarbe; Toast „Akzentfarbe an … angepasst“ bleibt beim schnellen Designwechsel stehen.
- Bei schmalen Portalen fehlt der Portalname in der Titelleiste (BeOS-Reiter dann unsichtbar).
- Im eingebauten Browser sind Cockpit- und Design-Tour als gesehen gemerkt.
- Hilfe-Dialog: Platz für ausgeblendetes „Ausführen“ bleibt frei.
- Fokus je Desk nutzt dieselben Grenzen wie der Gesamtfokus (Rückfrage an Enrico offen; Dialog sagt das jetzt so).
- README nennt noch alte Begriffe und „F-01 bis F-95“.

## Technische Rahmenbedingungen

Git nur bei Enrico (GitHub Desktop). Enricos Dev-Server (`npm run dev`, http://localhost:2910) ist im eingebauten Browser erreichbar; Änderungen über device_bash kommen per Hot Reload sofort an. Messen und Testen mit `?test=voll` (nichts wird gespeichert) und `page.setViewportSize`. Tests siehe oben (in Claudes VM). `tsc --noEmit` in `web/`.

## Arbeitsregeln

Wie V15–V22: Funktion vor Design · Barrierefreiheit immer (NF-03) · Begriffe erklären (Texte nur in terms.ts/help.ts) · offene Punkte im Blick, Restplatz mit kleinen Punkten füllen · Lastenheft zuerst (ab F-179) · Sammelmodus `>START` … `<ENDE` · Terminal: nur nächster Schritt · „PO“ = Push Origin · Übergabe spätestens bei 60–70 %, nie mitten in einer Aufgabe · Datei `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/`.
