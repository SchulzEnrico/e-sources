# Übergabe V12 → V13 E-Sources

Stand: 22.11.2026, ca. 02:50 · Chat V12 abgeschlossen · Nächster Chat: **V13 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V13 E-Sources**. Lies diese Übergabedatei und das Lastenheft (Link unten). Wir beginnen mit **F-27 Panels herauslösen (zweites Fenster) mit Live-Abgleich**. Enrico hat einen zweiten Monitor zum Testen. Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft (verbindlich):** https://claude.ai/artifact/5Lcrj6JwXyEvUMcJjZQRY8 (Claude Doc, mit den Docs-Werkzeugen lesen)
- **Geschichte der Anwendung (Claude Doc, wird laufend ergänzt):** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – für wen, was es kann, wie es funktioniert, Ausblick. Nach jeder Ausbaustufe den Abschnitt „Was E-Sources heute kann“ nachziehen. Offen: Wofür steht der Name „E-Sources“?
- **Repository (öffentlich):** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`
- **Portfolio-Repo:** lokal `~/Projects/SchulzEnrico.github.io`
- **Online-Demo:** https://schulzenrico.github.io/e-sources/ (baut automatisch bei jedem Push auf `main`)
- **Frühere Übergaben:** `docs/uebergaben/V01` bis `V11_Uebergabe_E-Sources.md`

## Was in V12 passiert ist

- **F-28 Master-Panel, erste Stufe** (`components/Overview.tsx`, Logik `workspace/focus.ts` → `overviewOf`): Die Kopfleiste klappt zur Übersicht über der Arbeitsfläche aus (Klick auf den Pegel oder Strg/⌘+.; Esc, ×, Klick daneben oder erneuter Klick schließt). Je Area eine Karte (Name wie in der Kopfleiste nur bei Stapeln, sonst „Area 1“ …), darin jedes Panel mit Name, Domain, Tab-Zahl, Ampelpunkt (`loadColor(tabs)`) und „hinten“, wenn es im Stapel nicht vorn liegt. Areas und Fenster haben keine eigene Ampel (Enrico). Klick/Enter holt das Panel nach vorn (`showPanel`) und schließt die Übersicht; ✎/F2 umbenennen; ×/Entf schließen. Kopf zeigt Gesamtfokus-Satz und Belegung („2/2 Areas belegt · 3 im Stapel · Bildschirmklasse“).
  - Tastatur (NF-03): Rollen-Fokus (`tabIndex` 0/−1), ↑/↓ mit Umlauf, ←/→ erste Zeile der vorigen/nächsten Area, Pos1/Ende, Esc. `role="dialog"` mit `aria-describedby`-Hilfetext, `aria-label` je Zeile, Ansage per `role="status"` beim Schließen. Fokus geht beim Schließen zurück auf den Pegel. Verlässt der Fokus die Übersicht, klappt sie ein.
  - Stolperstein: Enter im Umbenennen-Feld braucht `preventDefault()`, sonst löst dasselbe Enter auf der wieder fokussierten Zeile „Panel zeigen“ aus.
  - Hineinschieben ohne Opacity-Animation (im nicht sichtbaren Browser-Pane blieb sie sonst bei 0 hängen).
- **F-29 Gesamtfokus** (`focusOf`, `focusLevel`, `focusText` in `workspace/focus.ts`, Anzeige `FocusMeter` in `Overview.tsx`): Panel = 1 Punkt, jeder weitere Tab = ½ Punkt (`FOCUS_RULE`). Pegel 1–5 grün bis 9 Punkte, 6 gelb bis 13, 7 orange bis 16, 8 rot bis 19, 9 darüber (Grenzen am 22.11. von Enrico festgelegt: 9 grün, 13 gelb, ab 17 rot). Equalizer mit 9 ansteigenden Balken (Farbe `loadColor(i)`), Punktzahl daneben, ▾. Bildschirmleser: Satz „Gesamtfokus: grün, 6 Punkte (5 Panels, 2 weitere Tabs)“; Farbwechsel wird angesagt. Grenzen noch **nicht** in den Einstellungen änderbar.
- **F-146 Kopfleiste neu** (Grid 1fr/auto/1fr): Logo links, mittig Ansicht (nur Symbol) – Gleich verteilen (nur Symbol, Pfeilkreuz `DistributeIcon`) – Suche – „+ NewArea“ – Zahnrad (`GearIcon`, Menü „Einstellungen“), Pegel ganz rechts. Lineal für alle Panels jetzt erster Eintrag im Zahnrad-Menü. Belegungsanzeige ins Master-Panel verschoben.
- **Tooltip** am rechten Rand wurde schmal und hoch → `width: max-content` in `.tooltip`.
- **Lastenheft:** F-28 und F-29 mit Entscheidungen vom 22.11. ergänzt, neu **F-146** und **F-147 Farbpipette** (Wunsch aus der Geschichte; Rückfrage an Enrico, ob eine Pipette für Seitenfarben gemeint ist). F-146 steht in Liste `m546wxbbe43.52454`, F-147 in `m546wxbbe43.52923`, F-148 (Word/Excel im Datei-Panel per Bibliothek ohne Server, nur lesen) in `m546wxbbe43.53358`, F-149 Menü „Nur im neuen Tab“ (nicht einbettbare Seiten sammeln, per Suche finden, im neuen Browser-Tab öffnen) in `m546wxbbe43.53894`. Weiter ab **F-150**.
- Tests **89** (in der VM 89/89), Typprüfung grün. Alles gepusht bis auf den Tooltip-Fix (siehe unten).

## Noch zu committen

- Tooltip-Fix (`App.css`) und diese Übergabedatei. Summary-Vorschlag: „Tooltip am Rand nicht mehr schmal; Übergabe V12“.

## Nächste Schritte

1. **F-27 Panels herauslösen:** ein oder mehrere Panels in ein neues Browserfenster (zweiter Monitor), Live-Abgleich per `BroadcastChannel` (ohne Server). Erst klären: Was speichert jedes Fenster (eigene Anordnung je Fenster? gemeinsame `panels`?), wer schreibt in `localStorage`, wie kommen Panels zurück (F-07). Danach zeigen Master-Panel und Gesamtfokus auch die anderen Fenster (Fenster bekommen keine eigene Ampel).
2. F-28 weiter: Panels verschieben und gruppieren (dafür fehlt noch „Panel zwischen Areas verschieben“).
3. F-29: Grenzen/Gewichte in den Einstellungen änderbar (Feld in `look` oder eigenes).
4. **F-104 Kanban-Board** als Panel-Typ, danach in die Demo.
5. Lesezeichen-Bedienung mit Enrico überarbeiten.
6. Design: F-67, F-68 (Equalizer auch in der Stapel-Leiste), F-114, F-115; F-69 Rest.
7. Später: F-63, F-40, F-43-Rest, F-33; Szenarien bedienbar machen (F-116) → dann auch in der Suche.

## Kleine Punkte (zum Auffüllen)

- Übersicht: Schließen per Entf/× im Browser nicht getestet (um Enricos Demo-Panels zu schonen) – kurz mit einem Wegwerf-Panel prüfen.
- Übersicht im hellen Modus und auf schmalen Bildschirmen ansehen.
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

- Panels zwischen Areas verschieben gibt es noch nicht.
- Profil-PDF ist 2,6 MB.
- Stand-Übersicht (PDF) zuletzt am 21.11. – bei Gelegenheit neu erzeugen.

## Offene Rückfragen an Enrico

- „+ NewArea“ mit Plus so lassen oder nur „NewArea“?
- F-116 bis F-119: ✓/✕ im Lastenheft.
- Linie des aktiven Tabs oben – so gewollt?
- Rot in der ausgeklappten Stapel-Leiste und beim großen Namen leerer Panels?

## Offen (unverändert)

- `npm audit`: 3 Schwachstellen ansehen, **nicht** `npm audit fix --force`.
- Server-Standort und Kosten, Apple-Entwicklerkonto (bis Stufe 8).

## Technische Rahmenbedingungen

- Claudes Shell auf dem Mac (`device_bash`) ist eine Linux-VM **ohne Internet**, darf ohne Freigabe **nicht löschen**; `.git` nur lesen (`git --no-optional-locks`). **npm und git laufen in Enricos Terminal / GitHub Desktop.** Der Home-Ordner der VM wechselt je Chat (`~/vt` neu anlegen).
- Verbundener Ordner: **`~/Projects`** (in der VM `~/mnt/Projects`).
- Typprüfung in der VM: `node node_modules/typescript/bin/tsc --noEmit -p .` (in `web/`).
- Tests ohne Vite: Ersatzmodul `~/vt/node_modules/vitest/index.js` (describe/it/expect mit toBe, toEqual, toHaveLength, toContain, not; **toEqual vergleicht per JSON**), dann `tsc --outDir ~/vt/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node src/workspace/*.ts`, `cp -r ~/vt/node_modules ~/vt/out/`, `cd ~/vt/out && node workspace.test.js`.
- **Im Browser testen:** Der eingebaute Browser der Claude-App erreicht `http://localhost:2910` – mit `browser_repl` gut für Klick-, Stil- und Ebenen-Prüfungen. `keyboard.press` kann kein „Control+.“ → Tastenkürzel per `page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '.', ctrlKey: true })))`. `getByRole('button', { name: 'Einstellungen' })` trifft mehrere → `exact: true`. Tooltips erscheinen bei `hover()`, nicht bei programmatischem `focus()`. Playwright behandelt `aria-disabled` als gesperrt → `click({ force: true })`. Ist das Browser-Pane nicht sichtbar, laufen Animationen nicht weiter.
- Code-Änderungen per Python mit exakten Ersetzungen (je `assert count == 1`) – bewährt. Neue Dateien per Heredoc (`cat > datei <<'EOF'`) direkt in der VM.
- Entwicklungsserver läuft oft schon („Port 2910 is already in use“ = gut, Browser neu laden; bei alten Styles ⌘+Shift+R). Demo-Startbelegung testen: **neues** Inkognito-Fenster.
- Bilder/Icons/PDF: Cloud-Umgebung hat `rsvg-convert`, `pdftotext`, PIL, Chrome (headless PDF); Ergebnisse mit `device_commit_files` zurückschreiben. Bauen (`vite`) geht dort nicht.
- Lastenheft-Bearbeitung: Text per `replace` mit `target {kind: "find"}` und `with {as: "text"}` ersetzen; neue Einträge mit `insert` nach der Liste des letzten Eintrags (`side: after`; F-149 steht in Liste `m546wxbbe43.53894`). Export als Markdown mit `export` (Tab `842c44f8-c93a`, Inhalt `28339b99-31da`).
- Portfolio: bei jeder CSS-Änderung die Version `?v=…` in `index.html`, `en/index.html`, `impressum.html`, `en/legal-notice.html` erhöhen (zuletzt `20261121c`).
- Enricos Mac: Node 24, Java 21, Chrome; lokal http://localhost:2910.
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
