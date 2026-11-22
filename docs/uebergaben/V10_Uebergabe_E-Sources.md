# Übergabe V10 → V11 E-Sources

Stand: 21.11.2026, ca. 20:05 · Chat V10 abgeschlossen · Nächster Chat: **V11 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V11 E-Sources**. Lies diese Übergabedatei und das Lastenheft (Link unten). Wir beginnen mit **F-34 zentrales Suchfeld** (siehe „Nächste Schritte“). Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft (verbindlich):** https://claude.ai/artifact/5Lcrj6JwXyEvUMcJjZQRY8 (Claude Doc, mit den Docs-Werkzeugen lesen)
- **Repository (öffentlich):** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`
- **Portfolio-Repo:** lokal jetzt **`~/Projects/SchulzEnrico.github.io`** (in V10 aus `~/Documents/GitHub` verschoben; GitHub Desktop zeigt auf den neuen Ort)
- **Online-Demo:** https://schulzenrico.github.io/e-sources/ (baut automatisch bei jedem Push auf `main`)
- **Stand-Übersicht (PDF):** `docs/E-Sources_Stand_Lastenheft_2026-11-21.pdf` – 102 F-Nummern: 39 erledigt (38 %), 9 in Arbeit, 54 offen; gewichtet 43 %
- **Frühere Übergaben:** `docs/uebergaben/V01` bis `V09_Uebergabe_E-Sources.md`

## Was in V10 passiert ist

- **Ordner zusammengelegt:** Beide Projekte liegen in `~/Projects`; im Chat nur noch **`~/Projects`** teilen (in der VM `~/mnt/Projects/e-sources` und `~/mnt/Projects/SchulzEnrico.github.io`).
- **F-132 Urheberrechtsvermerk (gepusht, beide Repos):** E-Sources: `LICENSE` („© 2026 Enrico Schulz – Alle Rechte vorbehalten …“), Abschnitt „Urheberrecht“ in `README.md`, „© 2026 Enrico Schulz“ unten im Menü „⋯“ (`.menu__copy`). Portfolio: MIT-Lizenz von jQuery Ripples nach `assets/vendor/LICENSE-jquery-ripples.txt`, eigene `LICENSE` mit Ausnahme jQuery/jQuery Ripples, Vermerk in `README.md`.
- **F-133 Demo-Startbelegung (gepusht):** Neues Modul `workspace/demo.ts` (`DEMO`, `demoWorkspace()`); `loadWorkspace` nimmt es, wenn noch nichts gespeichert ist (eigene Stände bleiben unberührt). 5 Panels auf 4 Areas (2 × 2 auf dem Laptop):
  - **Portfolio** (Lineal an, `ruler: true`)
  - Stapel **„Bewerbung“**: „Kontakt“ (`businessCard.html`) + „Zertifikate“ (`documents.html`) – beide noindex, öffentlich ok (Enrico)
  - **Wissen**: Tabs Wikipedia Hamburg, Hamburger Hafen, OpenStreetMap-Karte
  - **Video**: Mercedes-Veranstaltung, die Enrico begleitet hat (`youtube-nocookie.com/embed/q5PG_ThiWf4`)
  - Anordnung wird für **alle** Bildschirm-Einstellungen fertig mitgeliefert (`arrange`), damit der Stapel überall sichtbar ist. Kategorien je Panel, gleiche Namen werden zusammengelegt.
- **YouTube Fehler 153 behoben:** iframe `referrerPolicy="strict-origin-when-cross-origin"` (statt `no-referrer`), dazu `allow="fullscreen; picture-in-picture; encrypted-media; clipboard-write"` und `allowFullScreen` (`PanelFrame.tsx`).
- **F-134 „+ Area“ statt „+ Panel“ (gepusht):** Knopf oben ist ein Menü „Neue Spalte rechts“ / „Neue Zeile unten“ (`addArea`, `canAddArea` in `workspace.ts`, `T.addAtEdge` in `tree.ts`, Aktion `addArea`). Neue Area bekommt so viel Platz wie eine vorhandene Spalte/Zeile. Bildschirm voll → Knopf gesperrt mit Hinweis „weitere Panels über das ⊕ einer Area anlegen“. Leere Fläche: „+ Area anlegen“.
- **Lastenheft:** neu F-133, F-134. Weiter ab **F-135**.
- Tests **77** (in der VM 77/77), Typprüfung grün. Letzter Commit bei Enrico: „F-133 Demo-Startbelegung, F-134 …“ (gepusht).

## Nächste Schritte

0. **Erst kurz prüfen:** Ist die Übergabe V10 samt PDF committet und gepusht? Dann `npm test` (77). Online-Demo im Inkognito-Fenster ansehen (zeigt sie die Startbelegung?).
1. **F-34 zentrales Suchfeld:** Suchfeld in der Werkzeugleiste, durchsucht alle Lesezeichen (Titel, URL, Kategorie, Tags; `matches`/`groups` in `bookmarks.ts` gibt es schon), zeigt je Treffer Panel und Kategorie; Klick öffnet ihn in diesem Panel, ein geschlossenes Panel wird dabei geöffnet.
2. **F-28 Master-Panel + F-29 Gesamtfokus:** erst Form mit Enrico klären (Idee: Kopfleiste klappt zur Übersicht aller Panels mit Ampel aus), dann bauen.
3. **F-104 Kanban-Board** als Panel-Typ (Enrico will es; in V10 bewusst verschoben). Danach in die Demo aufnehmen („zeigt, dass man damit arbeiten kann“).
4. Lesezeichen-Bedienung mit Enrico überarbeiten.
5. Design: F-67, F-68, F-114, F-115; F-69 Rest (Zurück/Vor deutlicher bei Verlauf, Scrollbalken-Innenschatten).
6. Später: F-63, F-27, F-40, F-43-Rest, F-33.

## Kleine Punkte (zum Auffüllen)

- Aussehen des „+ Area“-Menüknopfs in der Werkzeugleiste prüfen (anderer Knopftyp als „Gleich verteilen“).
- Titel des Video-Lesezeichens in der Demo (zurzeit „Mercedes-Benz Veranstaltung“) – Enrico fragen.
- `README.md` von E-Sources ist veraltet (Ordner `server/` heißt `server-extra/`, Speicherschlüssel v4, „F-01 bis F-95“).
- Heller Modus: Feinschliff (Menüs, Sammlung/Seitenleiste, Hinweise, Lineal).
- Rot in der ausgeklappten Stapel-Leiste und beim großen Namen leerer Panels? (Frage offen.)
- Grüne Tab-Linie läuft bei ausgeklappter Stapel-Leiste über deren breiteren Teil hinaus.
- Kategorien per Ziehen sortieren (`moveCategory` gibt es schon).
- Lineal auf iPhone/iPad prüfen.

## Notiert (noch nicht im Lastenheft)

- Tabs und Lesezeichen per Ziehen nutzen HTML5 Drag & Drop – auf iPhone/iPad prüfen.
- Panels zwischen Areas verschieben (einzelnes Panel aus einem Stapel auf eine andere Area) gibt es noch nicht.
- Profil-PDF ist 2,6 MB.

## Offene Rückfragen an Enrico

- F-116 bis F-119: ✓/✕ im Lastenheft.
- Linie des aktiven Tabs oben – so gewollt?

## Offen (unverändert)

- `npm audit`: 3 Schwachstellen ansehen, **nicht** `npm audit fix --force`.
- Server-Standort und Kosten, Apple-Entwicklerkonto (bis Stufe 8).

## Technische Rahmenbedingungen

- Claudes Shell auf dem Mac (`device_bash`) ist eine Linux-VM **ohne Internet**, darf ohne Freigabe **nicht löschen**; `.git` nur lesen (`git --no-optional-locks`). **npm und git laufen in Enricos Terminal / GitHub Desktop.** Der Home-Ordner der VM wechselt je Chat (`~/vt` neu anlegen).
- Verbundener Ordner: **`~/Projects`** (in der VM `~/mnt/Projects`).
- Typprüfung in der VM: `node node_modules/typescript/bin/tsc --noEmit -p .` (in `web/`).
- Tests ohne Vite: Ersatzmodul `~/vt/node_modules/vitest/index.js` (describe/it/expect mit toBe, toEqual, toHaveLength, toContain; **toEqual vergleicht per JSON, also abhängig von der Reihenfolge der Felder**), dann `tsc --outDir ~/vt/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node src/workspace/*.ts`, `cp -r ~/vt/node_modules ~/vt/out/`, `cd ~/vt/out && node workspace.test.js`.
- Code-Änderungen per Python mit exakten Ersetzungen (je `assert count == 1`) – bewährt.
- Entwicklungsserver läuft oft schon in einem anderen Terminal-Fenster („Port 2910 is already in use“ = alles gut, einfach Browser neu laden). Demo-Startbelegung testen: **neues** Inkognito-Fenster.
- Bilder/Icons/PDF: Cloud-Umgebung hat `rsvg-convert`, `pdftotext`, Chrome (headless PDF); Ergebnisse mit `device_commit_files` zurückschreiben. Bauen (`vite`) geht dort nicht.
- Lastenheft-Bearbeitung: neue Einträge mit `insert` nach der Liste des letzten Eintrags (`side: after`; F-134 steht in Liste `m546wxbbe43.47502`); Wörter per `find` ersetzen. Export als Markdown geht mit `export` (Tab `842c44f8-c93a`).
- Portfolio: bei jeder CSS-Änderung die Version `?v=…` in `index.html`, `en/index.html`, `impressum.html`, `en/legal-notice.html` erhöhen (zuletzt `20261121c`).
- Enricos Mac: Node 24, Java 21, Chrome; lokal http://localhost:2910.
- **Committen:** GitHub Desktop (Summary → „Commit to main“ → „Push origin“; Enrico schreibt „PO ist durch“).

## Arbeitsregeln

- **Funktion vor Design** (Ausnahme: ausdrücklicher Wunsch).
- **Offene Punkte immer im Blick:** Claude führt die offenen Punkte aus Lastenheft und Übergabe mit und nutzt Restplatz im Chat für passende **kleine Punkte** – schlägt sie von sich aus vor.
- **Lastenheft ist die Grundlage:** Neue Wünsche mit Nummer eintragen, bevor sie gebaut werden. Weiter ab **F-135**.
- **Sammelmodus** `>START` … `<ENDE`.
- **Terminal-Anleitungen:** immer nur den nächsten Schritt, dann nachfragen.
- **Übergaberegel:** nach jeder Ausbaustufe, spätestens bei 60–70 % Chat-Füllstand, nie mitten in einer Aufgabe; Claude kündigt sie vorher an.
- **Übergabedatei:** `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/`.
