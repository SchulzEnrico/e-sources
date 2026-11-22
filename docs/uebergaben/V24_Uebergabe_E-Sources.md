# Übergabe V24 → V25 E-Sources

Stand: 22.11.2026, abends · Chat V24 abgeschlossen · Nächster Chat: **V25 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V25 E-Sources**. Lies diese Übergabedatei. Die Reihenfolge im Lastenheft (Abschnitt „Stand und Reihenfolge“) ist freigegeben. Mach mit **F-36** weiter. Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft (verbindlich, Claude Doc):** https://claude.ai/artifact/5Lcrj6JwXyEvUMcJjZQRY8 – Id genau so (Zeichen 6 ist eine „6“). Lesen: `read` mit `ref {object: node, id: 28339b99-31da}`, `container {kind: project, id: 5Lcrj6JwXyEvUMcJjZQRY8}`, `payload {kind: search, text: "F-36"}`. Vermerke per `update` (engine `prose`) mit `find`-Zielen (insert `side: before/after`, replace `as: text`), ohne vorheriges Lesen; mehrere Ops in einem Aufruf.
- **Benennung – Ergebnis:** https://claude.ai/artifact/5Di2hzfovkm1NcmV3bocdp
- **Geschichte der Anwendung:** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – Ausblick noch nicht nachgezogen (F-151 bis F-178)
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`

## Was in V24 passiert ist

Stand Lastenheft danach: **83 fertig, 14 teilweise, 1 ersetzt, 55 offen** (von 153). Reihenfolge: 6 von 13 erledigt (Launcher schließt Ausbaustufe 3).

- **Launcher ✓ (F-40, F-41, F-42, F-149, F-43 Rest)** – neues Modul `workspace/launcher.ts`, Komponente `components/Launcher.tsx`.
  - Inhalt wird abgeleitet, nicht gespeichert: alle Lesezeichen, deren Domain `isBlocked` ist (`launcherGroups`, nach Kategorien der Library, „Ohne Kategorie“ zuletzt; Reihenfolge „wie Library“ oder A–Z; Filter wie Library-Suche).
  - Knopf `.tb-launcher` rechts neben der Suche (mit Anzahl), Alt/⌥+L (in `cycleKeyRef`; im Launcher gedrückt = schließen), Hilfe-Eintrag `launcher` (Begriff + run), Begriff `TERMS.launcher`.
  - Nicht-modaler `role="dialog"`, `position: fixed`, z-index 55. Ziehen am Kopf, Griff ⠿ mit Pfeiltasten (Umschalt = ×5), `clampPos` hält ihn im Fenster. Einklappen zu `.launcher-min` (rund, Anzahl, Enter klappt auf). ↑/↓ rundherum, Pos1/Ende, Esc (erst Formular, dann Filter leeren, dann schließen → Fokus auf `.tb-launcher`).
  - Wahl Tab/Fenster als Radiogruppe; Strg/⌘+Klick bzw. Strg/⌘+Enter in der Suche nimmt die andere Art und wird neue Voreinstellung (`launch` in App.tsx).
  - Zustand (open, min, x, y, how, sort) je Desk im localStorage `esource.launcher.v1[.win]`, nur Abweichungen, im Testmodus nichts; nicht im Export.
  - „+ Source anlegen“: speichert Lesezeichen (ohne Portal-Zuordnung) und merkt die Domain als gesperrt, falls sie es noch nicht ist.
  - Suche: gesperrte Sources erscheinen nur einmal, Kennzeichen „↗ neuer Tab/neues Fenster“ (`.search__out`), `openHit` öffnet sie außerhalb.
  - Ersatzanzeige im Portal: Knopf „In den Launcher verschieben“ (`onToLauncher`) – speichert falls nötig, schließt den Tab (mit Wiederherstellen), öffnet den Launcher, Ansage per `sayLive`.
  - `openOutside` liegt jetzt in `launcher.ts` (PanelFrame importiert es).
- Tests: 5 neue (Launcher) → **147, alle grün**. `tsc --noEmit` sauber. Im eingebauten Browser mit `?test=voll` geprüft (Anlegen, Tastatur, Verschieben, Einklappen, Esc/Alt+L-Fokus, Suche, Ersatzanzeige mit claude.ai).
- **Tests laufen in Claudes VM:** Ersatz-vitest unter `~/vt/node_modules/vitest/index.js` (in V24 neu geschrieben, bei neuer VM wieder anlegen: describe/it/expect mit toBe, toEqual, toHaveLength, toContain, toMatchObject, toBeTruthy/Falsy, toBeUndefined, toBeDefined, toBeNull, toBeGreaterThan …, toBeCloseTo, toThrow, not; Zählung bei `process.on('exit')`), dann in `web/`: `node_modules/.bin/tsc --outDir ~/vt/out --module commonjs --target es2022 --moduleResolution node --esModuleInterop --skipLibCheck --jsx react-jsx src/workspace/*.ts`, `cp -r ~/vt/node_modules ~/vt/out/`, `ln -sf ~/mnt/Projects/e-sources/web/node_modules/react ~/vt/out/node_modules/react`, `cd ~/vt/out && node workspace.test.js`.
- **Browser-Tipp:** Ist der eingebaute Browser nicht sichtbar, laufen Timer verzögert (Fokus per `setTimeout` kommt zu spät) → vor Fokus-Tests `browser.show()`. `keyboard.press('Alt+l')` statt `Alt+KeyL`.

## Nächste Schritte

1. Enrico: e-sources committen (Vorschlag: „Launcher: F-40–F-42, F-149, F-43 Rest; Übergabe V24“) und pushen.
2. Code nach Reihenfolge: **F-36** → F-168 → F-160 Stufe 2 → F-159 → Farben F-161–F-164 (danach F-171 Stufe 2) → F-51/F-52 → F-06.
3. Fertige Punkte im Lastenheft auf `[✓ Vxx]` setzen (Eintrag und Reihenfolge) und die Zählung im Absatz „Von 153 Einträgen …“ nachziehen.
4. Füllarbeit vor Übergaben: Zusammenführen im Lastenheft (u. a. „F-40 bis F-42, F-123 und F-149 zu einem Eintrag Launcher“ – jetzt möglich, Begriff „Ablage“ dort → „Launcher“), Begriffe auf F-154, neuere Einträge einsortieren, Ausblick in der Geschichte.

## Kleine Punkte

- Neu: Ob der Browser ein Fenster blockt, lässt sich bei `window.open(…, 'noopener')` nicht erkennen (gibt immer null) – Launcher meldet daher nichts bei Popup-Sperre.
- Neu: Library im Portal öffnet gesperrte Sources noch im Portal (dann Ersatzanzeige) – evtl. dort auch direkt außerhalb öffnen bzw. mit „↗“ kennzeichnen.
- Neu: Launcher-Lage gilt je Desk, aber nicht je Bildschirmgröße; in der Hilfe evtl. „Launcher verschieben“ als eigene Bedienung.
- Toast (`.toast`, role="status") wird erst mit Inhalt eingehängt – Ansagen dort sind unsicher; für Wichtiges `sayLive` nutzen. Evtl. Toast-Region dauerhaft einhängen.
- Kürzel kommen nicht an, wenn der Fokus in einer eingebetteten Seite (iframe) steht – Hinweis in der Hilfe wäre gut.
- Hilfe-Dialog gibt den Fokus nach Esc nicht zurück, wenn der Auslöser weg ist (in `Closed.tsx`/`FocusRule.tsx` gelöst) – in `Help.tsx` und `Design.tsx` ebenso machen.
- In der zweizeiligen Kopfleiste springt Tab vom Desk erst in die untere Zeile, dann zur Fokusanzeige oben rechts.
- Terminal-Akzent übernimmt vorige Akzentfarbe; Toast „Akzentfarbe an … angepasst“ bleibt beim schnellen Designwechsel stehen.
- Bei schmalen Portalen fehlt der Portalname in der Titelleiste (BeOS-Reiter dann unsichtbar).
- Im eingebauten Browser sind Cockpit- und Design-Tour als gesehen gemerkt.
- Hilfe-Dialog: Platz für ausgeblendetes „Ausführen“ bleibt frei.
- Fokus je Desk nutzt dieselben Grenzen wie der Gesamtfokus (Rückfrage an Enrico offen).
- README nennt noch alte Begriffe und „F-01 bis F-95“.

## Technische Rahmenbedingungen

Git nur bei Enrico (GitHub Desktop). Enricos Dev-Server (`npm run dev`, http://localhost:2910) ist im eingebauten Browser erreichbar; Änderungen über device_bash kommen per Hot Reload sofort an. Messen und Testen mit `?test=voll` (nichts wird gespeichert, auch der Launcher-Zustand nicht) und `page.setViewportSize`. Ohne `?test=voll` arbeitet man in Enricos echtem Stand. Tests siehe oben (in Claudes VM). `tsc --noEmit` in `web/`.

## Arbeitsregeln

Wie V15–V23: Funktion vor Design · Barrierefreiheit immer (NF-03) · Begriffe erklären (Texte nur in terms.ts/help.ts) · offene Punkte im Blick, Restplatz mit kleinen Punkten füllen · Lastenheft zuerst (ab F-179) · Sammelmodus `>START` … `<ENDE` · Terminal: nur nächster Schritt · „PO“ = Push Origin · Übergabe spätestens bei 60–70 %, nie mitten in einer Aufgabe · Datei `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/`.
