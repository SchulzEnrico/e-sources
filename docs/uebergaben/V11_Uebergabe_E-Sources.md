# Übergabe V11 → V12 E-Sources

Stand: 22.11.2026, ca. 02:15 · Chat V11 abgeschlossen · Nächster Chat: **V12 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V12 E-Sources**. Lies diese Übergabedatei und das Lastenheft (Link unten). Wir beginnen mit **F-28 Master-Panel + F-29 Gesamtfokus** (erst Form klären, siehe „Nächste Schritte“). Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft (verbindlich):** https://claude.ai/artifact/5Lcrj6JwXyEvUMcJjZQRY8 (Claude Doc, mit den Docs-Werkzeugen lesen)
- **Repository (öffentlich):** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`
- **Portfolio-Repo:** lokal `~/Projects/SchulzEnrico.github.io`
- **Online-Demo:** https://schulzenrico.github.io/e-sources/ (baut automatisch bei jedem Push auf `main`)
- **Frühere Übergaben:** `docs/uebergaben/V01` bis `V10_Uebergabe_E-Sources.md`

## Was in V11 passiert ist

Commits: „F-34, F-135–F-141: Suche, Zurück/Vor in Seiten …; Übergabe V10“ und „F-141, F-136, F-142, F-143: …“.

- **F-34 zentrales Suchfeld** (`components/Search.tsx`, `searchAll` in `bookmarks.ts`): in der Werkzeugleiste rechts. Durchsucht Lesezeichen (Titel, URL, Kategorie, Tags, Notiz); je Treffer Panel + Kategorie, ein Treffer je Panel-Zuordnung. Klick/Enter öffnet im Panel (holt es im Stapel nach vorn, wechselt in der Einzelansicht). Lesezeichen ohne Panel öffnen im aktiven Panel („Gesamtsammlung → Panelname“). Höchstens 50 Treffer, Titeltreffer zuerst.
- **F-141 Suche nach Panels** (`searchPanels`): Name, Area, Sphere, Szenario und Adressen offener Tabs. Eigene Gruppe „Panels“ über „Lesezeichen“. Über einen Tab gefunden → Tab steht daneben (Titel des Lesezeichens, sonst Domain), Klick wechselt auf diesen Tab. Szenarien/Vorgänge kommen dazu, sobald es sie gibt (F-116, F-118).
- **Barrierefreiheit der Suche (NF-03):** ARIA-Combobox mit Listbox, Fokus bleibt im Feld (`aria-activedescendant`). Tasten: Strg/⌘+K oder „/“ ins Feld, ↓/↑ mit Umlauf, Bild↓/↑ je 5, Alt+Pos1/Ende, Enter, Esc (schließt, dann leert, dann verlässt), Tab schließt. Trefferzahl per `role="status"`, Hilfetext per `aria-describedby`, ausführliche `aria-label` je Treffer. Maus wählt nur bei echter Bewegung (`onMouseMove`). `.sr-only`-Klasse in `App.css`.
- **F-135 Zurück/Vor in eingebetteten Seiten** (`workspace/frameHistory.ts`): zählt jedes Neuladen eines iframes (`onLoad`, erstes Laden zählt nicht) in einem globalen Stapel und nutzt `window.history.back()/forward()` (gemeinsamer Browser-Verlauf). Zurück nur für das iframe, das zuletzt gewechselt hat, sonst Hinweis. Danach fällt es auf den eigenen Tab-Verlauf zurück. Grenzen: Seiten ohne Neuladen (SPA), Browser-Zurück-Knopf. Pfeile größer und kräftiger.
- **Gesperrte Knöpfe** (Zurück, Vor, Neu laden, Home, „+ Area“): jetzt `aria-disabled` + Klasse `is-off` statt `disabled` → erreichbar, Klick zeigt den Grund als Hinweis. Neu laden dreht sich kurz (`is-spin`, bei reduzierter Bewegung aus). Home lädt die Startseite frisch, wenn man schon dort ist. Hinweise bleiben je nach Länge stehen (`notify`: 50 ms je Zeichen, mind. 3 s).
- **F-136 Hover:** global (`button:hover`), Panel-Kopfleiste, Tabs, „+ Tab“, Menüs (roter Strich links), Stapel-Leiste, Griffe – deutlich kräftiger (roter Grund/Rand/Schein).
- **F-137** Suchfeld mit 1-px-Rahmen `rgba(var(--hi), 0.3)`.
- **F-138** Stapel-Leiste „Neues Panel“ nutzt `StackAddIcon` (exportiert aus `PanelFrame.tsx`).
- **F-139** Griffe an Kanten/Ecken deutlicher (roter Rand, größer beim Hover).
- **F-140** Panel-Kopfleiste: × ganz links (22 px, rot beim Hover), Stapeln-Plus ganz rechts. × in der Stapel-Leiste größer; dort Entf = schließen, F2 = umbenennen (das × selbst ist `aria-hidden`, weil es in einem Button liegt).
- **F-142 schnelle Tooltips** (`components/Tooltip.tsx`, in `App.tsx` als `<Tooltips />`): übernimmt jeden `title` nach 0,3 s (bei Tastaturfokus sofort, dann `aria-describedby`), entfernt den `title` während der Anzeige und setzt ihn danach zurück. Portal an `body` (sonst lag die Kopfleiste darüber), am Rand nach innen geschoben.
- **F-143 eigener Mauszeiger:** `--cur-arrow` / `--cur-hand` in `:root` (`App.css`), SVG als Data-URI, Dreieck in Akzentrot mit weißem Rand, 22 px, Spitze auf 11 Uhr, Klickpunkt 3/1. Alle `cursor: pointer/default` laufen darüber. Bei `prefers-contrast: more` / `forced-colors` Systemzeiger.
- **F-143** bewusst: In eingebetteten Seiten bleibt deren Systemzeiger (Enrico: so merkt man, dass man in einer Webseite ist).
- **F-144 Kategorien sortieren** (`Bookmarks.tsx`, Sammlung): Kategorie-Kopf ist ziehbar (eigener Zustand `dragCat`, getrennt vom Lesezeichen-Ziehen `drag`); Griff ⋮⋮ ist ein Knopf, ↑/↓ verschiebt (`moveCat` → Aktion `moveCategory`), Ansage per `role="status"`. Tastatur im Browser getestet; **Ziehen mit der Maus von Enrico noch zu testen.**
- **F-145 Beispiel-Lesezeichen** (`SAMPLES`, `addSamples(ws, makeId)` in `bookmarks.ts`, Aktion `addSamples`): Menü ⋯ „Beispiel-Lesezeichen anlegen“, 17 Stück in 5 Kategorien, ohne Panel, keine Doppelten. Auch in `demoWorkspace()`. LinkedIn ersetzt (nicht einbettbar) durch BERUFENET.
- **Lastenheft:** F-34 ergänzt, neu **F-135 bis F-145**. Weiter ab **F-146**.
- Tests **86** (in der VM 86/86), Typprüfung grün.
- **Noch nicht committet:** F-144, F-145, diese Übergabe (siehe Commit-Text im Chat).

## Nächste Schritte

1. **F-28 Master-Panel + F-29 Gesamtfokus:** erst Form mit Enrico klären (Idee: Kopfleiste klappt zur Übersicht aller Panels mit Ampel aus), dann bauen.
2. **F-104 Kanban-Board** als Panel-Typ, danach in die Demo aufnehmen.
3. Lesezeichen-Bedienung mit Enrico überarbeiten.
4. Design: F-67, F-68, F-114, F-115; F-69 Rest (Scrollbalken-Innenschatten).
5. Später: F-63, F-27, F-40, F-43-Rest, F-33; Szenarien bedienbar machen (F-116) → dann auch in der Suche.

## Kleine Punkte (zum Auffüllen)

- Tooltip verschwindet beim Wechsel der Maus direkt in ein iframe? (`pointerout`-Logik, im Testbrowser nicht prüfbar) – Enrico beobachtet es.
- Schalter „eigener Mauszeiger aus“ in den Einstellungen (F-143) – braucht ein Feld in `look`.
- Stapel-Leiste: Das × liegt in einem `<button>` (ungültiges HTML); sauber trennen.
- Barrierefreiheit Rest (NF-03): Tastaturbedienung von Ziehen/Andocken der Panels, Größe ändern per Tastatur, Fokus-Reihenfolge prüfen.
- `README.md` von E-Sources ist veraltet (Ordner `server-extra/`, Speicherschlüssel v4, „F-01 bis F-95“).
- Heller Modus: Feinschliff (Menüs, Sammlung, Hinweise, Lineal, Suche, Tooltip).
- Grüne Tab-Linie läuft bei ausgeklappter Stapel-Leiste über deren breiteren Teil hinaus.
- Lineal auf iPhone/iPad prüfen; Tabs/Lesezeichen per Ziehen (HTML5 Drag & Drop) auf iPhone/iPad prüfen.
- Titel des Video-Lesezeichens in der Demo – Enrico fragen.

## Notiert (noch nicht im Lastenheft)

- Panels zwischen Areas verschieben (einzelnes Panel aus einem Stapel auf eine andere Area) gibt es noch nicht.
- Profil-PDF ist 2,6 MB.
- Stand-Übersicht (PDF) zuletzt am 21.11. – bei Gelegenheit neu erzeugen.

## Offene Rückfragen an Enrico

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
- **Im Browser testen:** Der eingebaute Browser der Claude-App erreicht `http://localhost:2910` (Enricos Entwicklungsserver) – mit `browser_repl` gut für Klick-, Stil- und Ebenen-Prüfungen (`elementsFromPoint`, `getComputedStyle`). Playwright behandelt `aria-disabled` als gesperrt → `click({ force: true })`. Simulierte Mausbewegungen lösen dort teils keine Zeigerereignisse aus.
- Code-Änderungen per Python mit exakten Ersetzungen (je `assert count == 1`) – bewährt. Längere Inhalte aus der Cloud-Umgebung per base64 in die VM.
- Entwicklungsserver läuft oft schon („Port 2910 is already in use“ = gut, Browser neu laden; bei alten Styles ⌘+Shift+R). Demo-Startbelegung testen: **neues** Inkognito-Fenster.
- Bilder/Icons/PDF: Cloud-Umgebung hat `rsvg-convert`, `pdftotext`, PIL, Chrome (headless PDF); Ergebnisse mit `device_commit_files` zurückschreiben. Bauen (`vite`) geht dort nicht.
- Lastenheft-Bearbeitung: neue Einträge mit `insert` nach der Liste des letzten Eintrags (`side: after`; F-145 steht in Liste `m546wxbbe43.50947`); Wörter per `find` ersetzen. Export als Markdown mit `export` (Tab `842c44f8-c93a`, Inhalt `28339b99-31da`).
- Portfolio: bei jeder CSS-Änderung die Version `?v=…` in `index.html`, `en/index.html`, `impressum.html`, `en/legal-notice.html` erhöhen (zuletzt `20261121c`).
- Enricos Mac: Node 24, Java 21, Chrome; lokal http://localhost:2910.
- **Committen:** GitHub Desktop (Summary → „Commit to main“ → „Push origin“; Enrico schreibt „PO ist durch/raus“).

## Arbeitsregeln

- **Funktion vor Design** (Ausnahme: ausdrücklicher Wunsch).
- **Barrierefreiheit immer mitdenken (NF-03):** vollständige Tastaturbedienung, ARIA-Rollen, Ansagen für Bildschirmleser, nicht nur Farbe als Signal, reduzierte Bewegung, erhöhter Kontrast.
- **Offene Punkte immer im Blick:** Claude führt die offenen Punkte aus Lastenheft und Übergabe mit und nutzt Restplatz im Chat für passende **kleine Punkte** – schlägt sie von sich aus vor.
- **Lastenheft ist die Grundlage:** Neue Wünsche mit Nummer eintragen, bevor sie gebaut werden. Weiter ab **F-146**.
- **Sammelmodus** `>START` … `<ENDE`.
- **Terminal-Anleitungen:** immer nur den nächsten Schritt, dann nachfragen.
- **Übergaberegel:** nach jeder Ausbaustufe, spätestens bei 60–70 % Chat-Füllstand, nie mitten in einer Aufgabe; Claude kündigt sie vorher an.
- **Übergabedatei:** `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/`.
