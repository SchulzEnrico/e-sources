# Übergabe V05 → V06 E-Sources

Stand: 21.11.2026, ca. 14:15 · Chat V05 abgeschlossen · Nächster Chat: **V06 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V06 E-Sources**. Lies diese Übergabedatei und das Lastenheft (Link unten). Wir beginnen mit dem **Kern-Umbau** (siehe „Nächste Schritte“). Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft (verbindlich):** https://claude.ai/artifact/5Lcrj6JwXyEvUMcJjZQRY8 (Claude Doc, mit den Docs-Werkzeugen lesen)
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`
- **Portfolio als Design-Vorlage:** `~/Documents/GitHub/SchulzEnrico.github.io`, CSS in `assets/css/style.css` (Kopfleiste = `.topbar .bar.liquid`, Hover-Schein Silber `--gold: 200, 204, 214`, Logo-SVG dort suchen für F-66)
- **Frühere Übergaben:** `docs/uebergaben/V01` bis `V04_Uebergabe_E-Sources.md`

## Was in V05 passiert ist

- V04 war schon committet (12:39). Die parallele Sitzung aus V04 war eine andere Claude-Sitzung; sie ist geschlossen. **Immer nur eine Sitzung am Projektordner.**
- **F-18 entschieden:** eingebettete E-Source zeigt die echte Arbeitsfläche nur lesend; Live-Abgleich kommt mit F-27/F-28 (BroadcastChannel).
- **NF-07 gebaut:** `resizedLeaves(before, after)` in `tree.ts` (+3 Tests), Klasse `tile--resizing` in `App.tsx`, silberner Schein in `App.css`. Enrico: Es leuchten praktisch alle, ungleichmäßig – ist ok.
- **Gestaltung nach Portfolio (F-65) gebaut, nur `App.css` + Schriften:** Open Sans in `web/src/assets/fonts` (mit OFL.txt), Hintergrund und Farben aus dem Portfolio, Kopfleiste als Glasleiste, Knöpfe Neumorphismus (gewählt = eingedrückt), Panels mit Lichtkante (`.win::before`, Maske), aktives Panel = volle Lichtkante + silberner Schein (+25 % auf Wunsch), Menüs/Dialog/Toast/Stapel-Leiste im selben Stil, Menü-Schrift heller. Keine rote Schrift. Ampelfarben (`loadColor`) noch unverändert.
- Typprüfung grün, Tests 41/41 in Claudes Umgebung. **Bei Enrico noch nicht gelaufen, noch nicht committet.**
- **Lastenheft ergänzt:** Vision „All Relationship Management“ + Reihenfolge-Entscheidung (im Ziel-Abschnitt), F-66 bis F-69 (Design), F-114 (Hinweis am Panel, Panel am Panel hinzufügen), F-115 (Gerätemenü mit Lineal), F-116 bis F-119 (Claudes Vorschläge zur Vision, ✓/✕ offen), F-65 angepasst.
- Neue Arbeitsweise: **Sammelmodus** `>START` … `<ENDE` – dazwischen nur „Notiert“, danach zusammenfassen, Rückfragen, ins Lastenheft.

## Nächste Schritte

1. **Enrico:** `npm test`, `npm run build`, dann **committen** (Stand V05). Ein Schritt nach dem anderen.
2. **Kern-Umbau in einem Zug** (vorgezogen, Entscheidung 21.11.):
   - Panel = Liste von Tabs (je Tab `url`, `history`, `pos`; `home` je Panel), Tab-Leiste oben mit „+“, max. 9 Tabs, Ampel an der unteren Kante (F-21, F-22, F-26).
   - Platz = eigene Id mit `panels: string[]` und `front`; Sonderfall `__stack__` entfällt; Stapel an jedem Platz (F-09); Panels ohne Platz auf den Platz ganz rechts.
   - Datenmodell schon jetzt mit Feldern für **Bereich** und **Szenario** (Vision, F-116), gebaut wird das später.
   - Speicher auf `esource.workspace.v5`, Tests anpassen.
3. **Lesezeichen:** speichern, löschen, Panels zuordnen (F-14 Knopf, F-20 Menü je Panel, F-30, F-31, F-32), Kategorien frei.
4. Danach Design aus der Sammlung: F-66 (schlanke Kopfleiste, Logo „ES“+„ources“), F-67 (Rahmen Panel-Kopf und Stapel-Leiste), F-68 (Equalizer-Verlauf), F-69 (Chakren-Farben, heller Modus, Scrollbalken, Zurück/Vor deutlicher), F-114, F-115.
5. Später: F-43 gesperrte Seiten über den Server prüfen, F-27 Panels herauslösen.

## Offene Rückfragen an Enrico

- Geklärt am 21.11.: **F-67** – die Einträge (Knöpfe) der Stapel-Leiste haben ihren Rahmen auf der rechten Seite. **F-68** – Equalizer wie beschrieben (jeder Eintrag in der Farbe seiner Nummer, weich verlaufend). **Reihenfolge** – Kern-Umbau in V06, Design-Punkte danach.
- **F-69 Chakren-Farben:** genaue Farbwerte festlegen (Vorlage: PDF „Die 7 Chakren – Übersicht“: Rot, Orange, Goldgelb, Grün, Hellblau, Indigo, Violett).
- F-116 bis F-119: ✓/✕ im Lastenheft.

## Offen (unverändert)

- `npm audit`: 3 Schwachstellen ansehen, **nicht** `npm audit fix --force`.
- npm-Warnung „install-scripts“ (esbuild, fsevents) – harmlos.
- Server-Standort und Kosten, Apple-Entwicklerkonto (bis Stufe 8).

## Technische Rahmenbedingungen

- Claudes Shell auf dem Mac (`device_bash`) ist eine Linux-VM **ohne Internet**, darf ohne Freigabe **nicht löschen**; `.git` dort nur lesen (`git --no-optional-locks`). **npm, Maven und git laufen in Enricos Terminal.**
- Verbundene Ordner: `~/Projects`, `~/Documents/GitHub/SchulzEnrico.github.io`. Alte Dateien nach `~/Projects/_to_delete/`.
- Typprüfung in der VM: `node node_modules/typescript/bin/tsc --noEmit -p .` (in `web/`).
- Tests ohne Vite: Ersatzmodul `~/vt/node_modules/vitest/index.js` (describe/it/expect mit toBe, toEqual, toHaveLength, toContain) anlegen, `src/workspace/*.ts` mit tsc nach CommonJS in `~/vt/out` übersetzen (`--module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node`), `~/vt/node_modules/vitest` nach `~/vt/out/node_modules/` kopieren, `node workspace.test.js`.
- CSS-Änderungen in V05 per Python mit exakten Ersetzungen (je `assert count == 1`) – bewährt.
- Enricos Mac: Node 24, Java 21, Chrome; Oberfläche unter http://localhost:2910.
- **Committen:** GitHub Desktop (Summary → „Commit to main“ → „Push origin“) oder Terminal in neuem Tab (Cmd+T), nie im Tab mit `npm run dev`.

## Arbeitsregeln

- **Funktion vor Design** (Ausnahme: ausdrücklicher Wunsch).
- **Lastenheft ist die Grundlage:** Neue Wünsche kommen dort mit Nummer hinein, bevor sie gebaut werden. Freie Nummern: F-66 bis F-69 sind jetzt belegt, F-70 bis F-73 waren schon belegt; weiter ab **F-120**.
- **Sammelmodus** `>START` … `<ENDE` (siehe oben).
- **Terminal-Anleitungen:** immer nur den nächsten Schritt nennen, dann nachfragen.
- **Übergaberegel:** nach jeder abgeschlossenen Ausbaustufe, spätestens bei geschätzt 60–70 % Chat-Füllstand, nie mitten in einer Aufgabe; Claude kündigt sie vorher an.
- **Übergabedatei:** `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/`, Versionsnummer am Anfang.
