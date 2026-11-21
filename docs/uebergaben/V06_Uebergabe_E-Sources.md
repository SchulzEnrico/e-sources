# Übergabe V06 → V07 E-Sources

Stand: 21.11.2026, ca. 15:40 · Chat V06 abgeschlossen · Nächster Chat: **V07 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V07 E-Sources**. Lies diese Übergabedatei und das Lastenheft (Link unten). Wir beginnen mit dem **Kern-Umbau** (siehe „Nächste Schritte“). Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft (verbindlich):** https://claude.ai/artifact/5Lcrj6JwXyEvUMcJjZQRY8 (Claude Doc, mit den Docs-Werkzeugen lesen)
- **Repository (jetzt öffentlich):** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`
- **Online-Demo:** https://schulzenrico.github.io/e-sources/ (baut automatisch bei jedem Push auf `main`)
- **Portfolio:** `~/Documents/GitHub/SchulzEnrico.github.io` · https://schulzenrico.github.io
- **Frühere Übergaben:** `docs/uebergaben/V01` bis `V05_Uebergabe_E-Sources.md`

## Was in V06 passiert ist

- **F-120 Online-Demo (gebaut, online):** Workflow `.github/workflows/pages.yml` (npm ci → npm test → npm run build → GitHub Pages). `vite.config.ts`: `base` beim Bauen `/e-sources/`, beim Entwickeln `/`. Repository auf öffentlich gestellt, Pages-Quelle „GitHub Actions“. Erster Lauf rot (Pages war noch aus), Lauf #2 grün. Auf Mac und iPhone getestet: läuft, Panels anlegen geht.
- **`isSelfUrl(url, base)`** prüft jetzt Domain **und Pfad** (Portfolio und E-Sources teilen sich `schulzenrico.github.io`). `PanelFrame` übergibt `import.meta.env.BASE_URL`. Tests ergänzt.
- **F-121 Abgleich per JSON-Datei (gebaut):** Knöpfe „Exportieren“/„Importieren“ in der Kopfleiste. Neu `src/workspace/transfer.ts` (Dateiformat `e-sources-arbeitsflaeche`, Version 1, `savedAt`, `device`, `workspace`; `readTransferFile`, `needsConfirm`, `deviceLabel`). `storage.ts`: `parseWorkspace`, `SyncMeta` unter `esource.sync.v1` (`changedAt`, `syncedAt`), `storeImported`; der allererste Stand eines leeren Geräts zählt nicht als Änderung. Reducer-Aktion `replace`. **Regel:** Datei ersetzt die Arbeitsfläche; Rückfrage nur, wenn dieses Gerät seit dem letzten Abgleich geändert wurde und neuer ist als die Datei. Automatischer Abgleich erst mit Server (F-81).
- **Logo (F-66, Teil):** `web/src/assets/e-sources-logo.svg` – ES-Zeichen aus dem Portfolio + „ources“ im Stil von „pecially“ (o, u, r, s nachgebaut, c und e übernommen), in der Kopfleiste 34 px hoch (`.brand-logo`). Rest von F-66 (schlanke Kopfleiste) offen.
- **F-66 Kopfleiste schlank (gebaut, bei Enrico noch nicht angesehen):** eine Zeile mit Logo, „+ Panel“, Gleich verteilen, Split 2/4, Platz-Anzeige `x/y` und Menü „⋯“ (Wunsch-Anordnung merken/zurücksetzen/löschen, Bildschirm, Ausrichtung, ein-/zweizeilig, Exportieren/Importieren). `Menu`/`Item` aus `PanelFrame.tsx` exportiert und wiederverwendet. Handy: ohne Trenner, Platz-Anzeige und „Gleich verteilen“, Logo 28 px. **Prüfen:** Menü öffnet über den Panels (Toolbar `z-index: 50`), passt alles in eine Zeile.
- **iPhone „quer“ behoben:** Klasse/Ausrichtung kommen jetzt aus der Fenstergröße (`window.innerWidth/innerHeight`), nicht aus der Fläche unter der Kopfleiste.
- Tests **45/45** bei Enrico grün, Build grün. Commit `9497a20`.
- **Lastenheft:** F-120 und F-121 unter „Synchronisation“ eingetragen.
- **Portfolio (alles gepusht):** „Aktuell“ mit E-Sources-Eintrag und Knopf zur Demo (DE/EN); Kopfleiste mit rotem „E“-Symbol (links großer Balken, rechts drei Abschnitte, Stil des ES-Logos) als Link zur Demo; Name „Enrico Schulz“ sitzt auf allen Geräten oben rechts auf der Rahmenlinie, endet am Beginn der Rundung, Farben am gezeichneten Rahmen gemessen; Kopfleiste 24 px statt 12 px vom oberen Rand; E-Sources-Kachel links neben dem QR-Code im A4-Menü und in der neu erzeugten `Enrico_Schulz_Profil.pdf` (mit Link); „E“ neben dem Home-Knopf im Handy-Menü. CSS-Version `?v=20261121b`.

## Nächste Schritte

0. **Erst kurz prüfen:** neue Kopfleiste (F-66) und iPhone-Ausrichtung am Mac und iPhone ansehen, ggf. nachschärfen; dann committen.
1. **Kern-Umbau in einem Zug** (unverändert aus V05):
   - Panel = Liste von Tabs (je Tab `url`, `history`, `pos`; `home` je Panel), Tab-Leiste oben mit „+“, max. 9 Tabs, Ampel an der unteren Kante (F-21, F-22, F-26).
   - Platz = eigene Id mit `panels: string[]` und `front`; Sonderfall `__stack__` entfällt; Stapel an jedem Platz (F-09); Panels ohne Platz auf den Platz ganz rechts.
   - Datenmodell schon jetzt mit Feldern für **Bereich** und **Szenario** (F-116), gebaut wird das später.
   - Speicher auf `esource.workspace.v5`, Tests anpassen. **Achtung:** F-121 – `parseWorkspace` und `FILE_VERSION` mitziehen (Version 2; Version-1-Dateien entweder umwandeln oder klar ablehnen).
2. **Lesezeichen** (F-14, F-20, F-30, F-31, F-32).
3. Design aus der Sammlung: F-66 (nur noch prüfen/nachschärfen), F-67, F-68, F-69, F-114, F-115.
4. Später: F-43, F-27.

## Notiert in V06 (noch nicht im Lastenheft, beim nächsten Sammeln eintragen)

- **Demo-Startbelegung:** Besucher sehen leere Panels; Idee: Beispiel-Layout mit einbettbaren Seiten für die Demo (Nummer vergeben, falls gewünscht).
- Profil-PDF ist jetzt 2,6 MB (vorher 0,4 MB), weil Bilder in voller Auflösung drin sind; Erzeugung per Headless-Chrome (Menü öffnen, Links absolut machen, Maskenkanten für den Druck als echter Rahmen).

## Offene Rückfragen an Enrico

- **F-69 Chakren-Farben:** genaue Farbwerte (PDF „Die 7 Chakren – Übersicht“).
- F-116 bis F-119: ✓/✕ im Lastenheft.

## Offen (unverändert)

- `npm audit`: 3 Schwachstellen ansehen, **nicht** `npm audit fix --force`.
- Server-Standort und Kosten, Apple-Entwicklerkonto (bis Stufe 8).

## Technische Rahmenbedingungen

- Claudes Shell auf dem Mac (`device_bash`) ist eine Linux-VM **ohne Internet**, darf ohne Freigabe **nicht löschen**; `.git` nur lesen (`git --no-optional-locks`). **npm und git laufen in Enricos Terminal / GitHub Desktop.**
- Verbundene Ordner: `~/Projects`, `~/Documents/GitHub/SchulzEnrico.github.io`. Alte Dateien nach `~/Projects/_to_delete/`.
- Typprüfung in der VM: `node node_modules/typescript/bin/tsc --noEmit -p .` (in `web/`).
- Tests ohne Vite: Ersatzmodul `~/vt/node_modules/vitest/index.js`, `src/workspace/*.ts` mit tsc nach CommonJS in `~/vt/out` (`--module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node`), `~/vt/node_modules` nach `~/vt/out/` kopieren, `node workspace.test.js`.
- Code-Änderungen per Python mit exakten Ersetzungen (je `assert count == 1`) – bewährt.
- Sichtprüfung: Dateien mit `device_stage_files` in die Cloud-Umgebung holen und dort mit Playwright + `/usr/bin/google-chrome` Bildschirmfotos machen (Handy 390 px, Tablet 1000 px, Desktop 1440 px).
- Portfolio: bei jeder CSS-Änderung die Version `?v=…` in `index.html`, `en/index.html`, `impressum.html`, `en/legal-notice.html` erhöhen.
- Enricos Mac: Node 24, Java 21, Chrome; lokal http://localhost:2910.
- **Committen:** GitHub Desktop (Summary → „Commit to main“ → „Push origin“) oder Terminal in neuem Tab.

## Arbeitsregeln

- **Funktion vor Design** (Ausnahme: ausdrücklicher Wunsch).
- **Offene Punkte immer im Blick (neu 21.11.):** Claude führt die offenen Punkte aus Lastenheft und Übergabe mit und nutzt Restplatz im Chat (z. B. kurz vor einer Übergabe, wenn für eine große Aufgabe kein Platz mehr ist) für passende **kleine Punkte** aus dem Lastenheft – schlägt sie von sich aus vor.
- **Lastenheft ist die Grundlage:** Neue Wünsche mit Nummer eintragen, bevor sie gebaut werden. Weiter ab **F-122**.
- **Sammelmodus** `>START` … `<ENDE`.
- **Terminal-Anleitungen:** immer nur den nächsten Schritt, dann nachfragen.
- **Übergaberegel:** nach jeder Ausbaustufe, spätestens bei 60–70 % Chat-Füllstand, nie mitten in einer Aufgabe; Claude kündigt sie vorher an.
- **Übergabedatei:** `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/`.
