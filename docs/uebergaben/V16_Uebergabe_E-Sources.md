# Übergabe V16 → V17 E-Sources

Stand: 22.11.2026, ca. 12:00 · Chat V16 abgeschlossen · Nächster Chat: **V17 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V17 E-Sources**. Lies diese Übergabedatei und das Lastenheft (Link unten). Wir beginnen mit **F-154: Umbenennung der Oberfläche** nach der Tabelle unten (nur Oberfläche, Ansagen, Tooltips, Hilfe-Texte, Standardnamen, Tests und Lastenheft – Code-Namen bleiben). Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft (verbindlich):** https://claude.ai/artifact/5Lcrj6JwXyEvUMcJjZQRY8 (Claude Doc, mit den Docs-Werkzeugen lesen)
- **Benennung – Ergebnis und Entscheidungstabelle:** https://claude.ai/artifact/5Di2hzfovkm1NcmV3bocdp (Abschnitt „Ergebnis“ oben ist verbindlich)
- Benennung – erste Kommentar-Runde: https://claude.ai/artifact/DWXhpMkV3ay4mDteEHzwjd (nur Verlauf)
- **Geschichte der Anwendung:** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – Ausblick-Liste noch nicht nachgezogen (F-151 bis F-156)
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`
- **Online-Demo:** https://schulzenrico.github.io/e-sources/
- Frühere Übergaben: `docs/uebergaben/V01` bis `V15_Uebergabe_E-Sources.md`

## Was in V16 passiert ist

- **F-153 Anordnen im Fokus-Radar** (fertig): Kachel an den Rand einer anderen bzw. der Karte ziehen = einsetzen (`T.drop`, auch für andere Fenster über `winSetup`); Griffe an den Kanten = Größe, Arbeitsfläche folgt live (`onLayout` in `Overview`, App dispatcht `setLayout` mit der Einstellung des Fensters). Tastatur: Alt+Pfeil einsetzen, Alt+Umschalt+Pfeil Größe (5 %); Ansage über `arrangeText`/`placeText` (`focus.ts`), Helfer `radarResize`. `RadarWindow.tree` neu.
- **Einheitliche Ablage-Begriffe überall** (Radar, Arbeitsfläche, Stapel-Leiste, Menüs): „Im Panel ablegen“ (blau, `--drop-in-rgb`, `.drop--in`), „An dieser Position einsetzen“ (Akzent gestreift, `.drop--dock`, `.radar__tile.is-dock`), „Am Rand einsetzen“, „Tauschen“ (Mitte auf der Arbeitsfläche, `.drop--swap`), „Stapel voll (9)“; Menüs „In ‚X‘ ablegen“.
- **F-155 Größe per Tastatur** (fertig, Modul `workspace/sizing.ts`): **Alt/⌥+A** startet/beendet den Modus (linke/rechte Alt, AltGr). Pfeile **oder W A S D** = Kante in Pfeilrichtung (rechte/untere, am Rand linke/obere; `edgeFor`), Umschalt = andere Kante; **Q/E** bzw. −/+ diagonal; 1–9 = 10–90 % Breite und Höhe, 0 = 100 %; **F**/M maximieren; **G** gleich verteilen (auch **Alt+G** überall); Tab nächstes; Leertaste/Enter/Esc fertig. **Mausrad**: im Modus liegt über jedem Panel `.sizepad` (fängt Scrollen statt iframe), Scrollen in vier Richtungen verschiebt die Kante (1 Raster ≈ 5 %, `SPEED = 0.35`), Klick wählt. Leiste `.sizebar` unten mit Hilfe + Ansage, aktives Panel gestrichelt (`body.sizing`).
- **F-154 Benennung entschieden** (siehe unten), **F-156 Hilfe in der Suche** angelegt.
- Tests **118/118**, Typprüfung grün. Im eingebauten Browser geprüft (`?test=voll` und Demo).

## Noch zu committen

- Letzter Commit von Enrico: „F-153/F-155: Anordnen im Fokus-Radar, einheitliche Ablage-Begriffe, Größen-Modus per Tastatur“.
- **Offen:** Alt+A / W A S D / Mausrad / G – Dateien `App.css`, `App.tsx`, `PanelFrame.tsx`, `sizing.ts`, `workspace.test.ts` und diese Übergabe. Summary-Vorschlag: „F-155: Adjust mit Alt+A, W A S D, Mausrad, G/Alt+G; Übergabe V16“.

## F-154 – Umbau-Tabelle (verbindlich, Umsetzung V17)

| Bisher (Oberfläche) | Neu | Hinweise |
| --- | --- | --- |
| Fenster, Hauptfenster, Fenster 2 | **Desk**, **Main Desk**, **Desk 2** | „Source Desk“ ausgeschrieben nur in Hilfe/Einführung; „⧉ In neues Fenster“ → „⧉ Neuer Desk“; `MAIN_NAME`/`windowName` in `windows.ts` |
| Arbeitsfläche | entfällt als Begriff | Texte umformulieren („auf dem Desk“) |
| Ansicht: ganze Arbeitsfläche / 2 × 2 / 2 / 1 | **Dashboard / 2 × 2 / 2 / Solo**, Knopf „View“ | `VIEW_NAME` in `App.tsx` |
| Area, „+ NewArea“, „Areas belegt“ | **Slot**, „+ NewSlot“, „Slots belegt“ | `AREA_DEFAULT` |
| Stapel, „Stapel voll (9)“ | **Stack**, „Stack voll (9)“ | Standardname Stack offen (Vorschlag „NewStack 1“) |
| Panel, „Panel 1“, „Im Panel ablegen“ | **Portal**, „Portal 1“, „Im Portal ablegen“ | häufigster Begriff, auch Ansagen/aria-label |
| Tab | Tab | bleibt |
| Seite/Lesezeichen-Ziel | **Source** | in Texten wie „zeigt eine Source“ |
| Fokus-Radar | **Cockpit** (Lagekarte darin: **Radar**) | `Overview.tsx`, Hilfetext |
| Gesamtfokus | **Fokusanzeige** | `focusText` in `focus.ts` (Tests prüfen Text!) |
| Lesezeichen | **Library** | Sammlung je Portal: Name offen (Ideen: Shelf/Regal, „Library dieses Portals“) |
| Ablage (geplant F-40/41) | **Launcher** | nur Lastenheft |
| Werkzeugkasten (F-100) | **Toolbox** | nur Lastenheft |
| Sphere | **Space** | Typen bleiben (`spheres`) |
| Szenario | **Case** – gehört zu genau einem Space | Modelländerung F-116 nötig (später) |
| Größen-Modus | **Adjust** (Alt+A) | `.sizebar` „Größe“ → „Adjust“, Menüeintrag |

„Fokus“ bleibt für Fokusanzeige und einen späteren Fokus-Modus reserviert. Code-Namen (win, Area, Panel, Overview …) bleiben. Vorgehen in V17: erst `grep` nach sichtbaren Texten (Strings in Anführungszeichen, `aria-label`, `title`, Ansagen, Tests), dann Datei für Datei mit Python-Ersetzungen; Tests mit Texten anpassen; danach Lastenheft-Begriffe (nur Oberflächen-Begriffe, nicht die F-Nummern).

## Nächste Schritte

1. **F-154 Umbau** (oben).
2. **F-156 Hilfe in der Suche** + Hilfe-Knopf (?) – eine Liste aller Funktionen mit Kürzeln für Suche, Hilfe, Tooltips, Tour; danach **F-95 Tour**.
3. Offene Rückfrage: Mitte auf dem Dashboard = „Im Portal ablegen“, Tauschen mit Umschalt? (dann wie im Radar)
4. F-27 weiter (Ziehen zwischen Desks, zweiter Monitor via `getScreenDetails`), F-06 Ressourcen schonen, F-29 Einstellungen, F-104 Kanban.

## Kleine Punkte

- Beim Ziehen im Radar erscheint „＋ Eigene neue Area“ über der Karte und schiebt sie nach unten (F-151) – ggf. als Überlagerung statt im Fluss.
- Blaue Akzentfarbe: „ablegen“ (blau) und „einsetzen“ (Akzent) ähnlich – Text/Streifen unterscheiden; ggf. Farbe für ablegen aus Akzent ableiten.
- Größen-Modus: Panels in Seiten nicht klickbar, solange er läuft (gewollt); Fokus in iframe → keine Tasten (Grenze).
- Alle Punkte aus V15 „Kleine Punkte“ gelten weiter (README veraltet, heller Modus, `normalize` >9, iPad-Ziehen …).

## Technische Rahmenbedingungen

Wie V15 (Abschnitt „Technische Rahmenbedingungen“), dazu:
- Tests: Ersatz-vitest unter `~/vt/node_modules/vitest/index.js` (in jedem Chat neu anlegen, VM-Home wechselt).
- Browser-Test Tastatur: `pg.keyboard.press('Alt+a')`; „+“ geht nicht per `press` → `window.dispatchEvent(new KeyboardEvent('keydown', {key:'+', code:'BracketRight'}))`. Mausrad: `tab.scroll(x, y, 'down', n)` (Koordinaten in Screenshot-Pixeln).
- Lastenheft: weiter ab **F-157**; F-154/155 stehen in Liste `m546wxbbe43.60797`, F-156 in `m546wxbbe43.20727`.

## Arbeitsregeln

Wie V15: Funktion vor Design · Barrierefreiheit immer (NF-03) · offene Punkte im Blick, Restplatz mit kleinen Punkten füllen · Lastenheft zuerst (ab F-157) · Sammelmodus `>START` … `<ENDE` · Terminal: nur nächster Schritt · Übergabe spätestens bei 60–70 %, nie mitten in einer Aufgabe · Datei `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/`.
