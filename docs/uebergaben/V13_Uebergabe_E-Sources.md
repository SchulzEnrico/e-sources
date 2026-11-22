# Übergabe V13 → V14 E-Sources

Stand: 22.11.2026, ca. 03:50 · Chat V13 abgeschlossen · Nächster Chat: **V14 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V14 E-Sources**. Lies diese Übergabedatei und das Lastenheft (Link unten). Wir beginnen mit **F-28 weiter: Panels zwischen Areas verschieben** (auch über Fenster hinweg, F-27). Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft (verbindlich):** https://claude.ai/artifact/5Lcrj6JwXyEvUMcJjZQRY8 (Claude Doc, mit den Docs-Werkzeugen lesen)
- **Geschichte der Anwendung (Claude Doc):** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – nach jeder Ausbaustufe „Was E-Sources heute kann“ und den Ausblick nachziehen (F-27 am 22.11. eingetragen). Offen: Wofür steht der Name „E-Sources“?
- **Repository (öffentlich):** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`
- **Portfolio-Repo:** lokal `~/Projects/SchulzEnrico.github.io`
- **Online-Demo:** https://schulzenrico.github.io/e-sources/ (baut automatisch bei jedem Push auf `main`)
- **Frühere Übergaben:** `docs/uebergaben/V01` bis `V12_Uebergabe_E-Sources.md`

## Was in V13 passiert ist

- **F-27 Panels herauslösen, erste Stufe** (Entscheidungen 22.11. im Lastenheft bei F-27):
  - Alle Fenster teilen eine Arbeitsfläche. `PanelMeta.win` (fehlt = Hauptfenster), `Workspace.windows: Named[]` („Fenster 2“, „Fenster 3“ … – kleinste freie Nummer). Fenster-Id in der Adresse `?win=…` (übersteht F5).
  - Eigene Anordnung je Fenster: `ScreenSetup.win`; `layoutKey` = `win/cls:orientation:lines` (ohne Präfix im Hauptfenster), `parseLayoutKey` liest beides. `viewOf`, `addPanel`, `addArea`, `removePanel`, `resetLayout` filtern mit `panelsIn(panels, win)`.
  - Logik in `workspace/windows.ts`: `winFromSearch`, `windowUrl`, `windowList`, `windowName`, `nextWindowName`, `syncWindows` (leere Fenster fallen weg, Panel in unbekanntem Fenster bekommt Eintrag zurück; läuft im Reducer nach jeder Aktion außer `remote`), `moveToWindow`, `returnAll`, `renameWindow` (noch ohne Oberfläche).
  - **Live-Abgleich** über das `storage`-Ereignis (`useWorkspace.ts`): fremder Stand → Aktion `remote`, wird nicht zurückgeschrieben (Ref-Vergleich). Es gilt die letzte Änderung. Neue Aktionen `toWindow`, `returnAll`, `renameWindow`.
  - **Anwesenheit** per `BroadcastChannel('esource.windows')` in `workspace/useWindows.ts` (`useOpenWindows`: hello/here/bye, dazu `show` = anderes Fenster holt ein Panel nach vorn). `openAppWindow(win)` fragt erst `window.open('', 'esource-<id>')` → offenes Fenster wird nur nach vorn geholt, nicht neu geladen. Hauptfenster heißt `esource-main` (`window.name`).
  - Oberfläche: Panel-Menü ⋮ „Panel in neues Fenster“ / „Panel ins Fenster 2 / ins Hauptfenster“, bei Stapeln „Ganze Area …“. Zusatzfenster: Name in Kopfleiste (`.tb-win`) und Browser-Titel, Knopf „⇤ Alles ins Hauptfenster“ (schließt sich danach selbst). Leeres Zusatzfenster: Hinweis mit „+ Area anlegen“ und „Fenster schließen“. Pop-up blockiert → Hinweis (Text `POPUP_BLOCKED` in `App.tsx`).
  - Master-Panel: „Dieses Fenster“ und „Andere Fenster“; je anderes Fenster eine Karte (gestrichelt) mit „offen“/„geschlossen“ als Wort, „Nach vorn holen“/„Wieder öffnen“, „Alle hierher holen“; Zeile ⇣ bzw. Taste **H** holt ein Panel her; Enter zeigt ein Panel im anderen Fenster. `overviewOf(ws, slots, win, open)` liefert `win`, `other`, `open` je Karte.
  - Gesamtfokus zählte schon alle Panels → zählt automatisch alle Fenster.
  - Von Enrico in Chrome getestet: neues Fenster geht auf.
- **Menüs (`Menu` in `PanelFrame.tsx`) neu:** Liste hängt per `createPortal` an `document.body` (`.menu__list--float`, `position: fixed`, z-index 1000) – vorher verschwand sie unter der Area darüber. Klappt nach oben auf, wenn unten zu wenig Platz ist; `max-height` + Scrollen. Kopfleisten-Menüs bekommen `.menu__list--toolbar`. Tastatur (NF-03): Fokus beim Öffnen auf den ersten Eintrag, ↑/↓/Pos1/Ende nur auf Menüeinträgen (Auswahllisten behalten ihre Pfeiltasten), Tab läuft durch und schließt am Ende, Esc schließt; Fokus zurück auf den Knopf; ↓ auf dem Knopf öffnet.
  - Stolperstein: Basisregel `.menu__list { top: 100% }` → beim Aufklappen nach oben `top: 'auto'` inline setzen.
- Kleiner Punkt erledigt: Schließen per Entf in der Übersicht getestet (Wegwerf-Panel).
- Tests **98** (in der VM 98/98), Typprüfung grün.

## Noch zu committen (falls nicht schon geschehen)

- Summary: „F-27: Panels herauslösen – Zusatzfenster mit Live-Abgleich; Menüs liegen über allen Areas“ – plus diese Übergabedatei.

## Nächste Schritte

1. **F-28 weiter:** Panels zwischen Areas verschieben und gruppieren – auch in andere Fenster (Ziel-Area wählen). Fehlt bisher ganz („Panel zwischen Areas verschieben“).
2. F-27 weiter: Fenster umbenennen (Logik `renameWindow` da, Oberfläche fehlt, z. B. Doppelklick auf `.tb-win`); Panels per Ziehen zwischen Fenstern; neues Fenster automatisch auf dem zweiten Monitor (Window Management API `getScreenDetails`, nur Chrome, mit Erlaubnis).
3. F-29: Grenzen/Gewichte in den Einstellungen änderbar.
4. **F-104 Kanban-Board** als Panel-Typ, danach in die Demo.
5. Lesezeichen-Bedienung mit Enrico überarbeiten.
6. Design: F-67, F-68 (Equalizer auch in der Stapel-Leiste), F-114, F-115; F-69 Rest.
7. Später: F-63, F-40, F-43-Rest, F-33; Szenarien bedienbar machen (F-116) → dann auch in der Suche.

## Kleine Punkte (zum Auffüllen)

- F-27: Zwei Fenster mit derselben `?win=`-Id (Adresse von Hand kopiert) zeigen dieselben Panels – unkritisch, ggf. Hinweis.
- F-27: Bittet ein Fenster per „Enter“ ein geschlossenes Fenster, ein Panel zu zeigen, geht die Bitte verloren (Fenster öffnet nur) – ggf. `#show=<id>` in der Adresse.
- Menüs: andere Menüs (Lesezeichen-Sammlung, Stapel-Leiste) auf dasselbe Verhalten prüfen; Menü-Breite im Zahnrad-Menü (jetzt ca. 480 px) ansehen.
- Übersicht im hellen Modus und auf schmalen Bildschirmen ansehen (jetzt auch die Fenster-Karten).
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
- Tests ohne Vite: Ersatzmodul `~/vt/node_modules/vitest/index.js` (describe/it/expect mit toBe, toEqual, toHaveLength, toContain, not; **toEqual vergleicht per JSON**), dann `tsc --outDir ~/vt/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node --jsx react-jsx src/workspace/*.ts`, `cp -r ~/vt/node_modules ~/vt/out/`, **neu:** `ln -sf ~/mnt/Projects/e-sources/web/node_modules/react ~/vt/out/node_modules/react` (Tests laden jetzt `useWorkspace.ts`), dann `cd ~/vt/out && node workspace.test.js`.
- **Im Browser testen:** Der eingebaute Browser der Claude-App erreicht `http://localhost:2910` – mit `browser_repl` gut für Klick-, Stil- und Ebenen-Prüfungen. Ein zweiter Tab mit `?win=<id>` spielt ein Zusatzfenster (storage-Ereignis und BroadcastChannel laufen zwischen Tabs). **Pop-ups aus automatischen Klicks blockt das Pane** – Fenster öffnen nur in Enricos Chrome testen. Kleine Fenster: `page.setViewportSize({ width, height })`, danach `setViewportSize(null)`. `keyboard.press` kann kein „Control+.“ → `page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '.', ctrlKey: true })))`. `getByRole('button', { name: 'Einstellungen' })` → `exact: true`. Tooltips erscheinen bei `hover()`. Playwright behandelt `aria-disabled` als gesperrt → `click({ force: true })`. Ist das Browser-Pane nicht sichtbar, laufen Animationen nicht weiter. Hinweis „Jetzt liegen 5 Panels auf …“ (Fokus-Warnung) blockt Klicks → „Verstanden“.
- Code-Änderungen per Python mit exakten Ersetzungen (je `assert count == 1`) – bewährt. Neue Dateien per Heredoc direkt in der VM.
- Entwicklungsserver läuft oft schon („Port 2910 is already in use“ = gut, Browser neu laden; bei alten Styles ⌘+Shift+R). Demo-Startbelegung testen: **neues** Inkognito-Fenster.
- Bilder/Icons/PDF: Cloud-Umgebung hat `rsvg-convert`, `pdftotext`, PIL, Chrome (headless PDF); Ergebnisse mit `device_commit_files` zurückschreiben. Bauen (`vite`) geht dort nicht.
- Lastenheft-Bearbeitung: Text per `replace` mit `target {kind: "find"}` und `with {as: "text"}` ersetzen; neue Einträge mit `insert` nach der Liste des letzten Eintrags (`side: after`; F-149 steht in Liste `m546wxbbe43.53894`). Weiter ab **F-150**. Export als Markdown mit `export` (Tab `842c44f8-c93a`, Inhalt `28339b99-31da`).
- Geschichte: Doc `QjpbDizWw2VzQzWNmZgirP`, Inhalt `d3298f73-d817`; Tabelle „Was E-Sources heute kann“ `m7qxd0gvcsa.3657`, Ausblick-Liste `m7qxd0gvcsa.6938`.
- Portfolio: bei jeder CSS-Änderung die Version `?v=…` in `index.html`, `en/index.html`, `impressum.html`, `en/legal-notice.html` erhöhen (zuletzt `20261121c`).
- Enricos Mac: Node 24, Java 21, Chrome; lokal http://localhost:2910; zweiter Monitor vorhanden.
- **Committen:** GitHub Desktop (Summary → „Commit to main“ → „Push origin“; Enrico schreibt „PO ist durch/raus“).

## Arbeitsregeln

- **Funktion vor Design** (Ausnahme: ausdrücklicher Wunsch).
- **Barrierefreiheit immer mitdenken (NF-03):** vollständige Tastaturbedienung, ARIA-Rollen, Ansagen für Bildschirmleser, nicht nur Farbe als Signal, reduzierte Bewegung, erhöhter Kontrast.
- **Offene Punkte immer im Blick:** Claude führt die offenen Punkte aus Lastenheft und Übergabe mit und nutzt Restplatz im Chat für passende **kleine Punkte** – schlägt sie von sich aus vor.
- **Lastenheft ist die Grundlage:** Neue Wünsche mit Nummer eintragen, bevor sie gebaut werden. Weiter ab **F-150**.
- **Sammelmodus** `>START` … `<ENDE`.
- **Terminal-Anleitungen:** immer nur den nächsten Schritt, dann nachfragen.
- **Übergaberegel:** nach jeder Ausbaustufe, spätestens bei 60–70 % Chat-Füllstand, nie mitten in einer Aufgabe; Claude kündigt sie vorher an.
- **Übergabedatei:** `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/`.
