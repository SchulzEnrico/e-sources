# Übergabe V09 → V10 E-Sources

Stand: 21.11.2026, ca. 19:15 · Chat V09 abgeschlossen · Nächster Chat: **V10 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V10 E-Sources**. Lies diese Übergabedatei und das Lastenheft (Link unten). Wir beginnen mit **F-132 Urheberrechtsvermerk** (siehe „Nächste Schritte“). Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft (verbindlich):** https://claude.ai/artifact/5Lcrj6JwXyEvUMcJjZQRY8 (Claude Doc, mit den Docs-Werkzeugen lesen)
- **Repository (öffentlich):** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`
- **Online-Demo:** https://schulzenrico.github.io/e-sources/ (baut automatisch bei jedem Push auf `main`)
- **Altes Projekt (nur Vorbild):** GitHub `SchulzEnrico/ESourc-es-` (öffentlich, in der Cloud-Umgebung per `git clone --depth 1` lesbar)
- **Frühere Übergaben:** `docs/uebergaben/V01` bis `V08_Uebergabe_E-Sources.md`

## Was in V09 passiert ist

- **F-128 Area (gepusht, Commit 3a50cc1):**
  - Im Code heißt „Platz“/`Place` jetzt durchgehend **Area** (`Area`, `Arrangement.areas`, `areaIn`, `areaOf`, Aktionen `add`/`stackStep` mit `area`).
  - Name hängt **am Panel**: `PanelMeta.areaName` (Id) → `Workspace.areaNames: Named[]`, dazu `Workspace.nextArea`. So gilt der Name in allen Bildschirm-Einstellungen.
  - Name einer Area = der, zu dem die meisten ihrer Panels gehören (bei Gleichstand der des sichtbaren). Dadurch stabil nach Tauschen.
  - Standardname **„NewArea n“** mit laufender Nummer. `ensureAreaNames(ws, setup)` benennt Stapel ohne Namen (läuft nach `addPanel` und per Effekt in `App` bei jeder Ansicht); vorhandene Namen werden nie überschrieben (wichtig fürs Handy, wo alles ein Stapel ist).
  - `renameArea`, `areaLabel(ws, slot)` (leer bei Einzelpanel), Namen ohne Panels entfallen (`pruneAreaNames` in `removePanel`).
  - Kopfleiste: im Stapel groß der Area-Name, klein darunter das Panel; Doppelklick auf Area-Name bzw. Panelname benennt um; Menü ⋮ „Panel umbenennen“ / „Area umbenennen“.
  - Speicher **`esource.workspace.v7`** (liest v6/v5/v4; `places` → `areas`), Datei-Format F-121 **Version 4**.
- **F-129 (gepusht):** Panelname in der Akzentfarbe (`--name-accent`).
- **F-60, F-61, F-69, F-130, F-131 (Commit bei Enrico offen, zusammen mit dieser Übergabe):**
  - Neues Modul `workspace/look.ts`: `Look { theme, accent }`, `THEMES` (Dunkel, Hell, Wie System, Windows 2000, Windows XP), `ACCENTS` (Portfolio-Rot `#e4522c` = Standard, Silber, 7 Chakren aus dem PDF: `#d3514a #e28a5b #ecb85c #64a970 #66afe1 #7f8fd0 #b064a6`, Windows-2000-Blau `#0a246a`, XP-Blau `#0054e3`), `contrast`, `contrastWarning` (WCAG 4,5 : 1), `resolveTheme`, `setLook`, `parseLook`. `Workspace.look`, Aktion `look`.
  - `App`: setzt `data-theme` und `--accent-rgb` am `<html>`; „wie System“ folgt `prefers-color-scheme`. Menü „⋯“ → Abschnitt „Darstellung“ (Design-Knöpfe, Farbpunkte, eigene Farbe, Kontrastwarnung).
  - `App.css`: feste Farben durch Variablen ersetzt (`--hi/--lo` Licht/Schatten, `--tint/--shade` Flächentönung, `--glass`, `--strong`, `--btn-a/b`, `--well-a/b`, `--warn-text`, `--danger-text`, `--bg-image`); `--silver` heißt jetzt `--accent-rgb`. Blöcke am Dateiende: hell, Windows 2000, Windows XP, Darstellung im Menü.
  - Akzentfarbe färbt **alles Hervorgehobene** (Entscheidung Enrico); in Windows 2000/XP bleiben Titelleisten/Fenster in Originalblau, XP-Hintergrund grün (Bliss-Hügel).
  - Heller Modus: eigene weiche Knopfschatten, dunklere Symbole, Panel-Kanten, Panelname automatisch abgedunkelt.
  - Helles Logo `assets/e-sources-logo-light.svg` (Schrift/Kanten dunkelgrau) für Hell, 2000 und XP.
  - Von Enrico gesichtet: XP und 2000 ok, Hell „für den Moment ok“.
- **Lastenheft:** F-128 ergänzt (NewArea n, Place→Area), neu **F-129, F-130, F-131**; F-61 (Akzent färbt alles Hervorgehobene), F-65 (alte Silber-Regel abgelöst) ergänzt. Weiter ab **F-133**.
- Tests **72** (in der VM 72/72; bei Enrico zuletzt 67/67 vor den Designs), Typprüfung grün.

## Nächste Schritte

0. **Erst kurz prüfen:** Ist der Commit „F-60 … Designs Windows 2000 und XP, helles Logo“ samt dieser Übergabe gepusht? Dann `npm test` (72).
1. **F-132 Urheberrechtsvermerk** (steht schon im Lastenheft, Liste `m546wxbbe43.46617`):
   - **E-Sources:** `LICENSE` im Repo-Hauptordner: „© 2026 Enrico Schulz – Alle Rechte vorbehalten. Ansehen erlaubt; Nutzen, Kopieren, Verändern und Weitergeben nur mit schriftlicher Erlaubnis.“ Gleicher Vermerk in `README.md`, kleiner Hinweis „© Enrico Schulz“ in der App (Menü „⋯“). **Keine** Open-Source-Lizenz (MIT o. Ä.).
   - **Portfolio** (`~/Documents/GitHub/SchulzEnrico.github.io`): Die `LICENSE` dort ist die MIT-Lizenz von **jQuery Ripples** (Pim Schreurs / sirxemic, kam 2024 mit dem ersten Commit „BIG BANG“). Verschieben nach `assets/vendor/LICENSE-jquery-ripples.txt` (`mv` geht, Löschen nicht nötig) und im Hauptordner eigene `LICENSE` wie oben, mit Ausnahme der Fremdbibliotheken in `assets/vendor/` (jQuery, jQuery Ripples, je eigene Lizenz). Hinweis an Enrico: Ich bin kein Anwalt.
2. **Demo-Startbelegung** (fürs Lastenheft, Nummer vergeben): Besucher der Online-Demo sehen statt leerer Panels ein Beispiel-Layout mit einbettbaren Seiten (wichtig für Bewerbungen).
3. Lesezeichen-Bedienung mit Enrico überarbeiten.
4. Design aus der Sammlung: F-67, F-68, F-114, F-115; F-69 Rest (Zurück/Vor deutlicher bei Verlauf, Scrollbalken-Innenschatten).
5. Später: F-63 (Farbe je Panel/Gruppe), F-27, F-40, F-43, F-33/F-34.

## Kleine Punkte (zum Auffüllen)

- Heller Modus: Feinschliff, falls Enrico noch etwas auffällt (Menüs, Sammlung/Seitenleiste, Hinweise, Lineal im hellen Modus nicht geprüft).
- Rot in der ausgeklappten Stapel-Leiste und beim großen Namen leerer Panels? (Frage an Enrico offen.)
- Grüne Tab-Linie: bei **ausgeklappter** Stapel-Leiste läuft sie über deren breiteren Teil hinaus.
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
- Verbundene Ordner: `~/Projects`, `~/Documents/GitHub/SchulzEnrico.github.io` (in der VM `~/mnt/Projects`, `~/mnt/SchulzEnrico.github.io`).
- Typprüfung in der VM: `node node_modules/typescript/bin/tsc --noEmit -p .` (in `web/`).
- Tests ohne Vite: Ersatzmodul `~/vt/node_modules/vitest/index.js` (describe/it/expect mit toBe, toEqual, toHaveLength, toContain; **toEqual vergleicht per JSON, also abhängig von der Reihenfolge der Felder** – echtes Vitest nicht; Felder in `defaultWorkspace` und `parseWorkspace` in gleicher Reihenfolge halten), dann `tsc --outDir ~/vt/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node src/workspace/*.ts`, `cp -r ~/vt/node_modules ~/vt/out/`, `cd ~/vt/out && node workspace.test.js`.
- Code-Änderungen per Python mit exakten Ersetzungen (je `assert count == 1`) – bewährt.
- Bilder/Icons/PDF: Cloud-Umgebung hat `rsvg-convert`, `pdftotext`, `qpdf`, Playwright und Chrome; Ergebnisse mit `device_commit_files` zurückschreiben. Bauen (`vite`) geht dort nicht.
- Lastenheft-Bearbeitung: neue Einträge mit `insert` nach der Liste des letzten Eintrags (`side: after`; F-132 steht in Liste `m546wxbbe43.46617`); Wörter per `find` ersetzen.
- Portfolio: bei jeder CSS-Änderung die Version `?v=…` in `index.html`, `en/index.html`, `impressum.html`, `en/legal-notice.html` erhöhen (zuletzt `20261121c`).
- Enricos Mac: Node 24, Java 21, Chrome; lokal http://localhost:2910.
- **Committen:** GitHub Desktop (Summary → „Commit to main“ → „Push origin“; Enrico schreibt „PO ist durch“).

## Arbeitsregeln

- **Funktion vor Design** (Ausnahme: ausdrücklicher Wunsch).
- **Offene Punkte immer im Blick:** Claude führt die offenen Punkte aus Lastenheft und Übergabe mit und nutzt Restplatz im Chat für passende **kleine Punkte** – schlägt sie von sich aus vor.
- **Lastenheft ist die Grundlage:** Neue Wünsche mit Nummer eintragen, bevor sie gebaut werden. Weiter ab **F-133**.
- **Sammelmodus** `>START` … `<ENDE`.
- **Terminal-Anleitungen:** immer nur den nächsten Schritt, dann nachfragen.
- **Übergaberegel:** nach jeder Ausbaustufe, spätestens bei 60–70 % Chat-Füllstand, nie mitten in einer Aufgabe; Claude kündigt sie vorher an.
- **Übergabedatei:** `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/`.
