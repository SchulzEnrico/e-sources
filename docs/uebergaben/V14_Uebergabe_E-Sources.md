# Übergabe V14 → V15 E-Sources

Stand: 22.11.2026, ca. 04:20 · Chat V14 abgeschlossen · Nächster Chat: **V15 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V15 E-Sources**. Lies diese Übergabedatei und das Lastenheft (Link unten). Wir beginnen mit **F-28 Rest: Panels aus der Stapel-Leiste auf eine andere Area ziehen** (mit Tastatur-Ersatz, NF-03). Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft (verbindlich):** https://claude.ai/artifact/5Lcrj6JwXyEvUMcJjZQRY8 (Claude Doc, mit den Docs-Werkzeugen lesen)
- **Geschichte der Anwendung (Claude Doc):** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – nach jeder Ausbaustufe „Was E-Sources heute kann“ und den Ausblick nachziehen (am 22.11. um F-28 und F-150 ergänzt). Offen: Wofür steht der Name „E-Sources“?
- **Repository (öffentlich):** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`
- **Portfolio-Repo:** lokal `~/Projects/SchulzEnrico.github.io`
- **Online-Demo:** https://schulzenrico.github.io/e-sources/ (baut automatisch bei jedem Push auf `main`)
- **Frühere Übergaben:** `docs/uebergaben/V01` bis `V13_Uebergabe_E-Sources.md`

## Was in V14 passiert ist

- **F-28 Verschieben und Gruppieren** (Entscheidungen 22.11. im Lastenheft bei F-28):
  - Logik in `workspace.ts`: `tryPlace(ws, setup, ids, target, fresh?)` / `placePanels` – Panels auf eine Area legen (obendrauf, erstes vorn, max. `STACK_MAX` 9) oder auf eigene neue Area (`NEW_AREA = 'new'`, nur mit freiem Platz, nicht wenn sie schon allein liegen). Area-Namen: verschobene Panels verlieren ihren `areaName`; ganze Gruppe auf ein Einzelpanel → Name der Gruppe bleibt. `fresh` = Panels sind gerade erst ins Fenster gekommen (vorläufige Lage aus `normalize` zählt nicht).
  - Neues Modul `workspace/move.ts`: `noteSetup`/`setupOfWindow` (neues Feld `Workspace.winSetup: Record<win, layoutKey>`, '' = Hauptfenster; jedes Fenster merkt sich seine Einstellung per Aktion `seen` beim Wechsel von `view.key`), `movePanels(ws, ids, from, win, area)` (anderes Fenster: erst `moveToWindow`, dann `tryPlace` mit `fresh`), `moveTargets(ws, ids, from)` → `MoveTarget {win, area, label, count, disabled}`; `area: ''` = Fenster ohne bekannte Einstellung (nur als Ganzes).
  - `storage.ts` prüft `winSetup` (nur bekannte Fenster, Schlüssel muss zum Fenster passen); `syncWindows` räumt `winSetup` mit auf.
  - Reducer: Aktionen `move` und `seen`.
  - Panel-Menü ⋮: „↦ Panel verschieben …“, bei Stapeln „↦ Ganze Area verschieben …“ (zweite Menüseite über `MenuPages`, Ziele nach Fenstern gruppiert in `MoveList`, „In neues Fenster“ am Ende) und „⇱ Aus dem Stapel lösen“. `Item` kann jetzt `disabled`/`title`; neu `MenuHead`. Die alten Einträge „Panel ins Fenster 2“ stecken jetzt in der Zielliste.
  - Master-Panel: **V** = Panel verschieben, **Umschalt+V** = ganze Area, Knopf ↦ in der Zeile; Zielauswahl `MovePicker` (↑/↓/Pos1/Ende, Enter, Esc), Ansage per `role=status`. App: `setupOfPanel`, `moveIds`, `targetsFor`, `moveTo` (öffnet Zielfenster bzw. holt es nach vorn).
  - Im Pane getestet, auch über Fenster hinweg (zweiter Tab `?win=w2`).
- **F-150 Leerer Einstieg** (neu im Lastenheft, ändert F-133): Demo-Panels starten mit leerem Tab, ohne `home`; Namen, Stapel „Bewerbung“, Lesezeichen bleiben. Leeres Panel zeigt „Link in die Adresszeile eingeben oder hier hineinziehen“ (`.win__hint`). Links (text/uri-list, sonst Text, der wie eine Adresse aussieht – `linkFromDrop` in `PanelFrame.tsx`) lassen sich ins leere Panel ziehen; Fläche dabei gestrichelt (`.win__body--drop`). Schon gepusht.
- **F-27 Fenster umbenennen:** Fenstername in der Kopfleiste ist jetzt ein Knopf (`WindowName` in `App.tsx`): Klick/Doppelklick/Enter/F2 → Eingabefeld, Enter/Verlassen speichert, Esc bricht ab, Fokus zurück auf den Knopf.
- **Kleinigkeiten (Enricos Hinweise):** Anfasser zum Größe-Ändern (`.grip`) liegt jetzt über der ausgeklappten Stapel-Leiste (z-index 8/9 statt 5/6; `.stack__inner` hat 6). Das „+“ der Stapel-Leiste (`.stack__add`) erscheint erst ausgeklappt (Hover oder Tastaturfokus).
- Tests **107** (in der VM 107/107), Typprüfung grün.

## Noch zu committen (falls nicht schon geschehen)

- Summary: „F-27: Fenster umbenennen; Anfasser über der Stapel-Leiste, + erst ausgeklappt; Übergabe V14“ – plus diese Übergabedatei.

## Nächste Schritte

1. **F-28 Rest:** Eintrag der Stapel-Leiste auf eine andere Area ziehen = dort obendrauf legen (Logik `placePanels` steht). Tastatur-Ersatz gibt es schon (Menü, Master-Panel V).
2. F-27 weiter: Panels per Ziehen zwischen Fenstern; neues Fenster automatisch auf dem zweiten Monitor (Window Management API `getScreenDetails`, nur Chrome, mit Erlaubnis); Umbenennen auch im Master-Panel (Karte des anderen Fensters).
3. F-29: Grenzen/Gewichte in den Einstellungen änderbar.
4. **F-104 Kanban-Board** als Panel-Typ, danach in die Demo.
5. Lesezeichen-Bedienung mit Enrico überarbeiten.
6. Design: F-67, F-68 (Equalizer auch in der Stapel-Leiste), F-114, F-115; F-69 Rest.
7. Später: F-63, F-40, F-43-Rest, F-33; Szenarien bedienbar machen (F-116) → dann auch in der Suche.

## Kleine Punkte (zum Auffüllen)

- F-28: Nach „Aus dem Stapel lösen“ rückt im alten Stapel das letzte Panel nach vorn (Regel aus `takeOut`) – evtl. lieber das vorher sichtbare.
- F-28: Zielauswahl im Master-Panel hat (anders als das Panel-Menü) noch kein „In neues Fenster“.
- F-150: Hineinziehen geht nur ins **leere** Panel; in ein Panel mit Seite (iframe schluckt die Ereignisse) ggf. später über die Tab-Leiste („als neuer Tab“).
- F-27: Zwei Fenster mit derselben `?win=`-Id zeigen dieselben Panels – unkritisch, ggf. Hinweis.
- F-27: Bittet ein Fenster per „Enter“ ein geschlossenes Fenster, ein Panel zu zeigen, geht die Bitte verloren – ggf. `#show=<id>` in der Adresse.
- Menüs: andere Menüs (Lesezeichen-Sammlung, Stapel-Leiste) auf dasselbe Verhalten prüfen; Menü-Breite im Zahnrad-Menü (ca. 480 px) ansehen.
- Übersicht im hellen Modus und auf schmalen Bildschirmen ansehen (jetzt auch Fenster-Karten und Zielauswahl).
- Media-Query `max-width: 760px` blendet noch `.tb-wide`/`.muted` aus – Reste aufräumen.
- Tooltip verschwindet beim Wechsel der Maus direkt in ein iframe? – Enrico beobachtet es.
- Schalter „eigener Mauszeiger aus“ in den Einstellungen (F-143) – braucht ein Feld in `look`.
- Stapel-Leiste: Das × liegt in einem `<button>` (ungültiges HTML); sauber trennen.
- Barrierefreiheit Rest (NF-03): Ziehen/Andocken und Größe ändern per Tastatur, Fokus-Reihenfolge prüfen.
- `README.md` von E-Sources ist veraltet (Ordner `server-extra/`, Speicherschlüssel v4, „F-01 bis F-95“).
- Heller Modus: Feinschliff (Menüs, Sammlung, Hinweise, Lineal, Suche, Tooltip, Übersicht).
- Grüne Tab-Linie läuft bei ausgeklappter Stapel-Leiste über deren breiteren Teil hinaus.
- Lineal auf iPhone/iPad prüfen; Ziehen (HTML5 Drag & Drop) auf iPhone/iPad prüfen.
- Titel des Video-Lesezeichens in der Demo – Enrico fragen.

## Notiert (noch nicht im Lastenheft)

- Profil-PDF ist 2,6 MB.
- Stand-Übersicht (PDF) zuletzt am 21.11. – bei Gelegenheit neu erzeugen.

## Offene Rückfragen an Enrico

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
- **Im Browser testen:** Der eingebaute Browser der Claude-App erreicht `http://localhost:2910` – mit `browser_repl` gut für Klick-, Stil- und Ebenen-Prüfungen (`document.elementFromPoint` zeigt, was oben liegt). Ein zweiter Tab mit `?win=<id>` spielt ein Zusatzfenster. **Pop-ups aus automatischen Klicks blockt das Pane** – Fenster öffnen nur in Enricos Chrome testen. Demo-Start im Pane: `localStorage.clear()` + neu laden (nur Test-Profil des Panes). Link-Ablage testen: `DragEvent` mit `new DataTransfer()` per `evaluate` auslösen. Kleine Fenster: `page.setViewportSize({ width, height })`, danach `setViewportSize(null)`. „Control+.“ → `page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '.', ctrlKey: true })))`. `getByRole('button', { name: 'Einstellungen' })` → `exact: true`. Playwright behandelt `aria-disabled` als gesperrt → `click({ force: true })`. Hinweis „Jetzt liegen 5 Panels auf …“ blockt Klicks → „Verstanden“.
- Code-Änderungen per Python mit exakten Ersetzungen (je `assert count == 1`) – bewährt; Anker eindeutig wählen (z. B. `const [said, setSaid]` gibt es in `Overview.tsx` zweimal). Neue Dateien per Heredoc direkt in der VM.
- Entwicklungsserver läuft oft schon („Port 2910 is already in use“ = gut, Browser neu laden; bei alten Styles ⌘+Shift+R). Demo-Startbelegung in Chrome testen: **neues** Inkognito-Fenster.
- Bilder/Icons/PDF: Cloud-Umgebung hat `rsvg-convert`, `pdftotext`, PIL, Chrome (headless PDF); Ergebnisse mit `device_commit_files` zurückschreiben. Bauen (`vite`) geht dort nicht.
- Lastenheft-Bearbeitung: Text per `insert`/`replace` mit `target {kind: "find"}` und `as: "text"`; neue Einträge mit `insert` nach der Liste des letzten Eintrags (`side: after`; F-150 steht in Liste `m546wxbbe43.56254`). Weiter ab **F-151**. Export als Markdown mit `export` (Tab `842c44f8-c93a`, Inhalt `28339b99-31da`).
- Geschichte: Doc `QjpbDizWw2VzQzWNmZgirP`, Inhalt `d3298f73-d817`; Tabelle „Was E-Sources heute kann“ `m7qxd0gvcsa.3657`, Ausblick-Liste `m7qxd0gvcsa.6938`.
- Portfolio: bei jeder CSS-Änderung die Version `?v=…` in `index.html`, `en/index.html`, `impressum.html`, `en/legal-notice.html` erhöhen (zuletzt `20261121c`).
- Enricos Mac: Node 24, Java 21, Chrome; lokal http://localhost:2910; zweiter Monitor vorhanden.
- **Committen:** GitHub Desktop (Summary → „Commit to main“ → „Push origin“; Enrico schreibt „PO ist durch/raus/fertig“).

## Arbeitsregeln

- **Funktion vor Design** (Ausnahme: ausdrücklicher Wunsch).
- **Barrierefreiheit immer mitdenken (NF-03):** vollständige Tastaturbedienung, ARIA-Rollen, Ansagen für Bildschirmleser, nicht nur Farbe als Signal, reduzierte Bewegung, erhöhter Kontrast.
- **Offene Punkte immer im Blick:** Claude führt die offenen Punkte aus Lastenheft und Übergabe mit und nutzt Restplatz im Chat für passende **kleine Punkte** – schlägt sie von sich aus vor.
- **Lastenheft ist die Grundlage:** Neue Wünsche mit Nummer eintragen, bevor sie gebaut werden. Weiter ab **F-151**.
- **Sammelmodus** `>START` … `<ENDE`.
- **Terminal-Anleitungen:** immer nur den nächsten Schritt, dann nachfragen.
- **Übergaberegel:** nach jeder Ausbaustufe, spätestens bei 60–70 % Chat-Füllstand, nie mitten in einer Aufgabe; Claude kündigt sie vorher an.
- **Übergabedatei:** `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/`.
