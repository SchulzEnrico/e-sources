# Übergabe V07 → V08 E-Sources

Stand: 21.11.2026, ca. 16:20 · Chat V07 abgeschlossen · Nächster Chat: **V08 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V08 E-Sources**. Lies diese Übergabedatei und das Lastenheft (Link unten). Wir beginnen mit den **Lesezeichen** (siehe „Nächste Schritte“). Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft (verbindlich):** https://claude.ai/artifact/5Lcrj6JwXyEvUMcJjZQRY8 (Claude Doc, mit den Docs-Werkzeugen lesen)
- **Repository (öffentlich):** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`
- **Online-Demo:** https://schulzenrico.github.io/e-sources/ (baut automatisch bei jedem Push auf `main`)
- **Portfolio:** `~/Documents/GitHub/SchulzEnrico.github.io` · https://schulzenrico.github.io
- **Frühere Übergaben:** `docs/uebergaben/V01` bis `V06_Uebergabe_E-Sources.md`

## Was in V07 passiert ist

- **F-66 geprüft:** Kopfleiste passt in eine Zeile, Menü „⋯“ liegt über den Panels, iPhone quer zeigt 1 Panel – alles ok.
- **Kern-Umbau (gepusht):**
  - `types.ts`: `Tab` (`id`, `url`, `history`, `pos`), `PanelMeta` mit `tabs`, `activeTab`, `home` (je Panel), `area`, `scenario` (F-116, nur Felder). `Place` (`id`, `panels[]`, `front`), `Arrangement` (`tree` + `places`), `Slot` (`id`, `rect`, `panels`, `front`). `Workspace` ohne `stackFront`, neu `areas`, `scenarios`, `embed`.
  - `STACK_ID`/`__stack__` entfällt. Blätter des Teilungsbaums = Platz-Ids. Platz-Ids sind **deterministisch** (`place-<erstes Panel-Id>`), sonst würden iframes bei jedem Anzeigen neu laden.
  - `normalize`: neue Panels bekommen einen eigenen Platz, solange die Klasse noch einen zeigt, sonst den Platz ganz rechts. Leere Plätze verschwinden, der Nachbar wächst.
  - **Verhaltensänderung:** Schließt man ein einzelnes Panel, wächst der Nachbar (früher rückte das Stapel-Panel nach). Enrico weiß Bescheid; bei Bedarf zurückbauen.
  - Neue Funktionen in `workspace.ts`: `addPanel(ws, setup, onPlace?)` (F-09), `stackFull(…, onPlace?)`, `placeIn`, `placeOf`, `stepStack(ws, setup, place, step)`, `activeTab`, `panelUrl`, `addTab`, `closeTab` (letzter Tab wird nur geleert), `selectTab`, `moveTab`, `tabLabel`, `TAB_MAX = 9`, `isArrangement`.
  - Reducer: `add` mit `place?`, `addTab`, `closeTab`, `selectTab`, `moveTab`, `stackStep` mit `place`, `embed`.
  - Speicher `esource.workspace.v5`; liest v4 ein und wandelt um (Seite + Verlauf → erster Tab, Anordnung entsteht neu). Datei-Format F-121 **Version 2**; Version-1-Dateien werden beim Import umgewandelt.
- **Oberfläche:** Kopfleiste und darunter Tab-Leiste gehen über die ganze Panelbreite; Stapel-Leiste beginnt **unter der Tab-Leiste** (`.win` jetzt Spalte, darunter `.win__row` mit `.win__main` + Stapel). Tabs per Klick, ×, Ziehen (HTML5 Drag & Drop), „+“; Hinweis bei 5, Grenze 9. Alle Tabs bleiben geladen (versteckte iframes). Panel-Menü ⋮: „＋ Neuer Tab“, „▣ Neues Panel auf diesen Platz legen“; Stapel-Leiste unten „+“; **eigener Knopf in der Kopfleiste** (`StackAddIcon`, ganz links in der Kopfleiste: schlankes Plus im Stil des ES-Logos, roter Verlauf + silberne Kante, Gradient-Ids per `useId`), daneben Knopf Maximieren/Verkleinern (⤢/⤡) direkt in der Kopfleiste (beides auf Enricos Wunsch). Menüpunkt Maximieren mit ⤢/⤡ statt nicht dargestellter Emojis.
  - Ampel-Linien einheitlich `--load-line: 2px`, gedämpft (`color-mix` 55 % mit Hintergrund). Stapel-Leiste: Ampel innen links, aktiver Eintrag Rahmen **rechts**. Tab-Leiste: Ampel unten, aktiver Tab Linie **oben** (Enrico hat das noch nicht ausdrücklich bestätigt).
  - Enrico-Entscheidung: Tabs **unter** der Kopfleiste (Kopfleiste = Griff zum Verschieben). Lastenheft F-08 angepasst.
- **F-122 Symbol (gepusht):** `web/public/`: `favicon.svg`, `favicon-32x32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `app-icon.svg`, `site.webmanifest`; `index.html` mit Links, Titel „E-Sources“, `apple-mobile-web-app-title`. Rotes „E“ aus dem Portfolio-Demo-Knopf auf dunklem Grund; Portfolio behält das ES-Logo. PNGs mit `rsvg-convert` in der Cloud-Umgebung erzeugt. Dank `site.webmanifest` lässt sich die Demo in Chrome als App auf dem Mac installieren (von Enrico getestet, eigenes Fenster mit Titel „E-Sources“). Das ist eine Web-App aus dem Browser, **nicht** die Desktop-App aus Stufe 6: gesperrte Seiten bleiben gesperrt; Daten teilt sie mit der Demo im Browser (gleiche Adresse), nicht mit localhost.
- **Scrollbalken dunkel:** E-Sources `:root` und Portfolio `html` mit `color-scheme: dark` + `scrollbar-color`. Portfolio CSS-Version jetzt `?v=20261121c` (gepusht).
- **F-43 Ersatzanzeige (gebaut, Commit bei Enrico offen):** `KNOWN_BLOCKED` (claude.ai, chatgpt.com, github.com, google.com, youtube.com, linkedin.com …, inkl. Subdomains), `hostOf`, `isBlocked`, `setEmbed`; `Workspace.embed` (Domain → true/false, eigene Wahl geht vor). Panel zeigt Ersatz mit „In neuem Tab öffnen“ und „Trotzdem hier versuchen“; Menü ⋮: „als gesperrt merken“ / „doch hier anzeigen“. github.io ist **nicht** gesperrt.
- **F-123 / F-124 (gebaut, Commit bei Enrico offen):** Ersatzanzeige bietet „↗ In neuem Tab“ und „⧉ In neuem Fenster“ (`openOutside` in `PanelFrame.tsx`, Fenster 80 % des Bildschirms, mittig); beides auch im Menü ⋮. Gesperrte Seite: `.win__body--blocked` mit deutlichem, aber gedämpftem rotem Schatten nach innen; Meldung `.fallback__title` als kleines rotes Etikett im Stil von „Multipotenzial“ (Verlauf #7a200a → #561505, 11,5 px, Großbuchstaben). Von Enrico so abgenommen, Tab und Fenster getestet.
- **Lastenheft:** F-29 (stand dreimal da) zu einem Eintrag zusammengefasst; F-122 unter „Darstellung“; F-08 (Tabs unter der Kopfleiste); F-43 Umsetzungsnotiz; F-123, F-124 neu (unter „Schwebende Ablage“, nach F-43).
- Tests **54/54** grün (bei Enrico zuletzt 53/53 vor F-43), Typprüfung grün.

## Nächste Schritte

0. **Erst kurz prüfen:** Ist der Commit „F-43, F-123, F-124 …“ samt dieser Übergabe gepusht? Dann `npm test` (54).
1. **F-125 Lineal** (Enrico vermisst es): Knopf in der Hauptkopfleiste schaltet das Lineal (F-15) für alle Panels; vorher im alten Projekt nachsehen, wie das Lineal aussah und funktionierte (Enrico fragen, wo der alte Code liegt).
2. **Lesezeichen** (F-14 Knopf „Lesezeichen speichern“, F-20 Menü der Sammlung, F-30 Felder, F-31 anlegen/bearbeiten/löschen/sortieren, F-32 Zuordnung zu Panels). Danach F-21: Lesezeichen öffnet als Tab. Datenmodell: Lesezeichen und Kategorien in `Workspace`, Speicher/Datei-Version mitziehen (v6 / Version 3, alte umwandeln).
3. Design aus der Sammlung: F-67 (Stapel-Leiste schmaler Rahmen; Rest weitgehend erledigt), F-68, F-69, F-114, F-115.
4. Später: F-27, F-40 (Ablage, dann F-43 „in die Ablage verschieben“).

## Notiert (noch nicht im Lastenheft, beim nächsten Sammeln eintragen)

- **Demo-Startbelegung:** Besucher sehen leere Panels; Idee: Beispiel-Layout mit einbettbaren Seiten.
- Tabs per Ziehen umsortieren nutzt HTML5 Drag & Drop – auf iPhone/iPad prüfen, ggf. auf Zeiger-Gesten umbauen.
- Panels zwischen Plätzen verschieben (einzelnes Panel aus einem Stapel auf einen anderen Platz) gibt es noch nicht; Ziehen an der Kopfleiste bewegt den ganzen Platz samt Stapel.
- Profil-PDF ist 2,6 MB (Bilder in voller Auflösung).

## Offene Rückfragen an Enrico

- **F-69 Chakren-Farben:** genaue Farbwerte (PDF „Die 7 Chakren – Übersicht“).
- F-116 bis F-119: ✓/✕ im Lastenheft.
- Linie des aktiven Tabs oben – so gewollt?

## Offen (unverändert)

- `npm audit`: 3 Schwachstellen ansehen, **nicht** `npm audit fix --force`.
- Server-Standort und Kosten, Apple-Entwicklerkonto (bis Stufe 8).

## Technische Rahmenbedingungen

- Claudes Shell auf dem Mac (`device_bash`) ist eine Linux-VM **ohne Internet**, darf ohne Freigabe **nicht löschen**; `.git` nur lesen (`git --no-optional-locks`). **npm und git laufen in Enricos Terminal / GitHub Desktop.** Der Home-Ordner der VM wechselt je Chat (`~/vt` muss neu angelegt werden).
- Verbundene Ordner: `~/Projects`, `~/Documents/GitHub/SchulzEnrico.github.io` (in der VM `~/mnt/Projects`, `~/mnt/SchulzEnrico.github.io`).
- Typprüfung in der VM: `node node_modules/typescript/bin/tsc --noEmit -p .` (in `web/`).
- Tests ohne Vite: Ersatzmodul `~/vt/node_modules/vitest/index.js` (describe/it/expect mit toBe, toEqual, toHaveLength, toContain; in V07 neu geschrieben), dann `tsc --outDir ~/vt/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node src/workspace/*.ts`, `cp -r ~/vt/node_modules ~/vt/out/`, `cd ~/vt/out && node workspace.test.js`.
- Code-Änderungen per Python mit exakten Ersetzungen (je `assert count == 1`) – bewährt.
- Bilder/Icons: Cloud-Umgebung hat `rsvg-convert`, Playwright und `/usr/bin/google-chrome`; Ergebnisse mit `device_commit_files` zurückschreiben. Bauen (`vite`) geht dort nicht (node_modules sind für macOS).
- Lastenheft-Bearbeitung: bei `replace` eines Listeneintrags den `h` des **listItem** als `ifHash` nehmen, nicht den des Absatzes.
- Portfolio: bei jeder CSS-Änderung die Version `?v=…` in `index.html`, `en/index.html`, `impressum.html`, `en/legal-notice.html` erhöhen (zuletzt `20261121c`).
- Enricos Mac: Node 24, Java 21, Chrome; lokal http://localhost:2910.
- **Committen:** GitHub Desktop (Summary → „Commit to main“ → „Push origin“) oder Terminal in neuem Tab.

## Arbeitsregeln

- **Funktion vor Design** (Ausnahme: ausdrücklicher Wunsch).
- **Offene Punkte immer im Blick:** Claude führt die offenen Punkte aus Lastenheft und Übergabe mit und nutzt Restplatz im Chat für passende **kleine Punkte** aus dem Lastenheft – schlägt sie von sich aus vor.
- **Lastenheft ist die Grundlage:** Neue Wünsche mit Nummer eintragen, bevor sie gebaut werden. Weiter ab **F-126**.
- **Sammelmodus** `>START` … `<ENDE`.
- **Terminal-Anleitungen:** immer nur den nächsten Schritt, dann nachfragen.
- **Übergaberegel:** nach jeder Ausbaustufe, spätestens bei 60–70 % Chat-Füllstand, nie mitten in einer Aufgabe; Claude kündigt sie vorher an.
- **Übergabedatei:** `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/`.
